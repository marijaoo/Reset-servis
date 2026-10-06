'use strict';
/*
 * Reset servis — server bez spoljnih zavisnosti (Node.js 22.13+).
 * Služi statični sajt, prima zakazivanja i prijave za savete, prikazuje status
 * popravke po broju naloga i nudi administratorski panel na /admin.
 *
 * Promenljive okruženja:
 *   PORT              port (podrazumevano 3000)
 *   ADMIN_PASSWORD    lozinka za /admin (obavezna; bez nje je panel isključen)
 *   SESSION_SECRET    tajni ključ za prijavu u panel (preporučeno, bar 32 znaka)
 *   DATA_DIR          folder za bazu (podrazumevano ./data)
 *   TRUST_PROXY       "1" ako je server iza proksija (Render, Railway, Nginx)
 *   NOTIFY_WEBHOOK_URL  opciono: adresa na koju se šalje obaveštenje o novom zakazivanju
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '..');
const ADMIN_DIR = path.join(__dirname, 'admin');
const PORT = +(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const WEBHOOK = process.env.NOTIFY_WEBHOOK_URL || '';
const SESSION_HOURS = 12;
const STAGES = 8; // 0 primljen … 6 spreman, 7 preuzet; -1 = zakazan termin (uređaj još nije predat)

/* ---------------- Baza ---------------- */
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'reset.db'));
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'web',
    stage INTEGER NOT NULL DEFAULT -1,
    name TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '',
    device TEXT NOT NULL DEFAULT '', model TEXT NOT NULL DEFAULT '', problems TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '', slot_day TEXT NOT NULL DEFAULT '', slot_time TEXT NOT NULL DEFAULT '',
    diag TEXT NOT NULL DEFAULT '', price TEXT NOT NULL DEFAULT '', eta TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
    times TEXT NOT NULL DEFAULT '[]'
  );
  CREATE INDEX IF NOT EXISTS tickets_stage ON tickets(stage);
  CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  );
`);
const now = () => new Date().toISOString();
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newCode() {
  for (;;) {
    let s = '';
    for (let i = 0; i < 5; i++) s += ALPHABET[crypto.randomInt(ALPHABET.length)];
    const code = `RN-${new Date().getFullYear()}-${s}`;
    if (!db.prepare('SELECT 1 FROM tickets WHERE code = ?').get(code)) return code;
  }
}
const parseJSON = (s, d) => { try { return JSON.parse(s); } catch { return d; } };
function rowToTicket(r) {
  if (!r) return null;
  return { ...r, problems: parseJSON(r.problems, []), times: parseJSON(r.times, []) };
}
function stampTimes(times, oldStage, newStage) {
  const t = Array.from({ length: STAGES }, (_, i) => times[i] || null);
  if (newStage < 0) return t.map(() => null);
  for (let i = 0; i < STAGES; i++) {
    if (i <= newStage && !t[i]) t[i] = now();
    if (i > newStage) t[i] = null;
  }
  return t;
}

/* ---------------- Pomoćne funkcije ---------------- */
const TEXT = /\.(html|css|js|json|svg|txt|xml)$/;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8' };
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');
function baseHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', CSP);
}
function send(req, res, status, body, type, extra = {}) {
  baseHeaders(res);
  let buf = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const headers = { 'Content-Type': type, ...extra };
  if (buf.length > 1024 && /\bgzip\b/.test(req.headers['accept-encoding'] || '') && /text|json|xml|svg|javascript/.test(type)) {
    buf = zlib.gzipSync(buf); headers['Content-Encoding'] = 'gzip'; headers['Vary'] = 'Accept-Encoding';
  }
  headers['Content-Length'] = buf.length;
  res.writeHead(status, headers);
  res.end(req.method === 'HEAD' ? undefined : buf);
}
const json = (req, res, status, obj, extra) => send(req, res, status, JSON.stringify(obj), 'application/json; charset=utf-8', { 'Cache-Control': 'no-store', ...extra });
function clientIp(req) {
  if (TRUST_PROXY && req.headers['x-forwarded-for']) return String(req.headers['x-forwarded-for']).split(',')[0].trim();
  return req.socket.remoteAddress || '?';
}
const isHttps = (req) => (TRUST_PROXY && req.headers['x-forwarded-proto'] === 'https') || !!req.socket.encrypted;

// Ograničenje broja zahteva po IP adresi
const buckets = new Map();
function limited(req, name, max, windowMs) {
  const key = name + ':' + clientIp(req), t = Date.now();
  const b = buckets.get(key);
  if (!b || t > b.reset) { buckets.set(key, { n: 1, reset: t + windowMs }); return false; }
  b.n++;
  return b.n > max;
}
setInterval(() => { const t = Date.now(); for (const [k, b] of buckets) if (t > b.reset) buckets.delete(k); }, 60_000).unref();

function readBody(req, limit = 20_000) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(Object.assign(new Error('too large'), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(Object.assign(new Error('bad json'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}
const str = (v, max) => (typeof v === 'string' ? v : v == null ? '' : String(v)).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

/* ---------------- Prijava u panel ---------------- */
function sign(v) { return crypto.createHmac('sha256', SESSION_SECRET).update(v).digest('base64url'); }
function makeSession() { const exp = Date.now() + SESSION_HOURS * 3600e3; const v = `admin.${exp}`; return `${v}.${sign(v)}`; }
function getCookie(req, name) {
  const m = (req.headers.cookie || '').split(/;\s*/).find((c) => c.startsWith(name + '='));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : '';
}
function isAdmin(req) {
  const c = getCookie(req, 'rs_admin'); const parts = c.split('.');
  if (parts.length !== 3) return false;
  const v = parts[0] + '.' + parts[1];
  const a = Buffer.from(sign(v)), b = Buffer.from(parts[2]);
  return a.length === b.length && crypto.timingSafeEqual(a, b) && +parts[1] > Date.now();
}
function passwordOk(p) {
  if (!ADMIN_PASSWORD) return false;
  const a = crypto.createHash('sha256').update(String(p)).digest(), b = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}
const cookieAttrs = (req) => `Path=/; HttpOnly; SameSite=Strict${isHttps(req) ? '; Secure' : ''}`;

/* ---------------- Obaveštenje o novom zakazivanju ---------------- */
function notify(t) {
  if (!WEBHOOK) return;
  const text = `Novo zakazivanje ${t.code}: ${t.name}, ${t.phone}. ${t.device}${t.model ? ' (' + t.model + ')' : ''}. ${t.problems.join(', ')}. Termin: ${t.slot_day || '—'} ${t.slot_time || ''}`;
  fetch(WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, content: text }) })
    .catch((e) => console.error('webhook:', e.message));
}

/* ---------------- API ---------------- */
const PUBLIC_FIELDS = (t) => ({
  device: [t.device, t.model].filter(Boolean).join(', '), issue: t.problems.length ? t.problems.join(', ') : t.description.slice(0, 120),
  diag: t.diag, price: t.price, eta: t.eta, stage: t.stage, times: t.times,
  slot: t.stage < 0 && t.slot_day ? `${t.slot_day.split('-').reverse().join('.')}. ${t.slot_time}` : ''
});
const EDITABLE = { name: 100, phone: 30, email: 150, device: 60, model: 120, description: 2000, slot_day: 10, slot_time: 5, diag: 300, price: 60, eta: 80, notes: 4000 };

async function handleApi(req, res, url) {
  const p = url.pathname.replace(/^\/api\//, '');
  const m = req.method;

  if (p === 'health') return json(req, res, 200, { ok: true });

  if (p === 'bookings' && m === 'POST') {
    if (limited(req, 'book', 5, 10 * 60e3)) return json(req, res, 429, { error: 'Previše zahteva. Pokušajte ponovo za nekoliko minuta.' });
    const b = await readBody(req);
    if (b.website) return json(req, res, 200, { code: 'RN-0000-OK' }); // zamka za botove
    const t = {
      name: str(b.name, 100), phone: str(b.phone, 30), email: str(b.email, 150), device: str(b.device, 60), model: str(b.model, 120),
      problems: (Array.isArray(b.problems) ? b.problems : []).slice(0, 10).map((x) => str(x, 40)).filter(Boolean),
      description: str(b.description, 2000), slot_day: /^\d{4}-\d\d-\d\d$/.test(b.day) ? b.day : '', slot_time: /^\d\d:\d\d$/.test(b.time) ? b.time : ''
    };
    if (t.name.length < 2) return json(req, res, 400, { error: 'Upišite ime i prezime.' });
    if (t.phone.replace(/\D/g, '').length < 6) return json(req, res, 400, { error: 'Upišite ispravan broj telefona.' });
    if (t.email && !EMAIL.test(t.email)) return json(req, res, 400, { error: 'E-pošta nije ispravna.' });
    if (b.consent !== true) return json(req, res, 400, { error: 'Potrebna je vaša saglasnost.' });
    t.code = newCode();
    const ts = now();
    db.prepare(`INSERT INTO tickets (code, created_at, updated_at, source, stage, name, phone, email, device, model, problems, description, slot_day, slot_time, times)
                VALUES (?, ?, ?, 'web', -1, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]')`)
      .run(t.code, ts, ts, t.name, t.phone, t.email, t.device, t.model, JSON.stringify(t.problems), t.description, t.slot_day, t.slot_time);
    notify(t);
    return json(req, res, 201, { code: t.code });
  }

  const om = p.match(/^orders\/([A-Za-z0-9-]{6,24})$/);
  if (om && m === 'GET') {
    if (limited(req, 'order', 30, 60e3)) return json(req, res, 429, { error: 'Previše pokušaja.' });
    const t = rowToTicket(db.prepare('SELECT * FROM tickets WHERE code = ?').get(om[1].toUpperCase()));
    if (!t) return json(req, res, 404, { error: 'Nije pronađen.' });
    return json(req, res, 200, { order: PUBLIC_FIELDS(t) });
  }

  if (p === 'newsletter' && m === 'POST') {
    if (limited(req, 'nl', 5, 10 * 60e3)) return json(req, res, 429, { error: 'Previše zahteva. Pokušajte kasnije.' });
    const b = await readBody(req, 2000);
    const email = str(b.email, 150).toLowerCase();
    if (!EMAIL.test(email)) return json(req, res, 400, { error: 'Upišite ispravnu adresu e-pošte.' });
    db.prepare('INSERT OR IGNORE INTO subscribers (email, created_at) VALUES (?, ?)').run(email, now());
    return json(req, res, 201, { ok: true });
  }

  /* ----- administracija ----- */
  if (p.startsWith('admin/')) {
    const ap = p.slice(6);
    if (ap === 'login' && m === 'POST') {
      if (!ADMIN_PASSWORD) return json(req, res, 503, { error: 'Panel nije podešen: postavite ADMIN_PASSWORD na serveru.' });
      if (limited(req, 'login', 10, 15 * 60e3)) return json(req, res, 429, { error: 'Previše pokušaja. Sačekajte 15 minuta.' });
      const b = await readBody(req, 2000);
      if (!passwordOk(b.password || '')) return json(req, res, 401, { error: 'Pogrešna lozinka.' });
      return json(req, res, 200, { ok: true }, { 'Set-Cookie': `rs_admin=${makeSession()}; Max-Age=${SESSION_HOURS * 3600}; ${cookieAttrs(req)}` });
    }
    if (ap === 'logout' && m === 'POST') return json(req, res, 200, { ok: true }, { 'Set-Cookie': `rs_admin=; Max-Age=0; ${cookieAttrs(req)}` });
    if (ap === 'me') return json(req, res, 200, { admin: isAdmin(req), configured: !!ADMIN_PASSWORD });

    if (!isAdmin(req)) return json(req, res, 401, { error: 'Prijavite se.' });
    // Zaštita od zahteva sa drugih sajtova: zaglavlje koje samo naš panel šalje
    if (m !== 'GET' && req.headers['x-rs-admin'] !== '1') return json(req, res, 403, { error: 'Nedozvoljen zahtev.' });

    if (ap === 'tickets' && m === 'GET') {
      const q = str(url.searchParams.get('q'), 100), stage = url.searchParams.get('stage');
      let sql = 'SELECT * FROM tickets WHERE 1=1'; const args = [];
      if (stage === 'active') sql += ' AND stage BETWEEN -1 AND 6';
      else if (stage !== null && stage !== '' && /^-?\d$/.test(stage)) { sql += ' AND stage = ?'; args.push(+stage); }
      if (q) { sql += ' AND (code LIKE ? OR name LIKE ? OR phone LIKE ? OR device LIKE ? OR model LIKE ?)'; const like = `%${q}%`; args.push(like, like, like, like, like); }
      sql += ' ORDER BY updated_at DESC LIMIT 500';
      return json(req, res, 200, { tickets: db.prepare(sql).all(...args).map(rowToTicket) });
    }
    if (ap === 'tickets' && m === 'POST') {
      const b = await readBody(req);
      const code = newCode(), ts = now();
      const vals = Object.fromEntries(Object.keys(EDITABLE).map((k) => [k, str(b[k], EDITABLE[k])]));
      const stage = Number.isInteger(b.stage) && b.stage >= -1 && b.stage < STAGES ? b.stage : 0;
      const problems = (Array.isArray(b.problems) ? b.problems : []).slice(0, 10).map((x) => str(x, 40)).filter(Boolean);
      db.prepare(`INSERT INTO tickets (code, created_at, updated_at, source, stage, name, phone, email, device, model, problems, description, slot_day, slot_time, diag, price, eta, notes, times)
                  VALUES (?, ?, ?, 'admin', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(code, ts, ts, stage, vals.name, vals.phone, vals.email, vals.device, vals.model, JSON.stringify(problems), vals.description, vals.slot_day, vals.slot_time, vals.diag, vals.price, vals.eta, vals.notes, JSON.stringify(stampTimes([], -1, stage)));
      return json(req, res, 201, { ticket: rowToTicket(db.prepare('SELECT * FROM tickets WHERE code = ?').get(code)) });
    }
    const tm = ap.match(/^tickets\/([A-Z0-9-]{6,24})$/);
    if (tm) {
      const cur = rowToTicket(db.prepare('SELECT * FROM tickets WHERE code = ?').get(tm[1]));
      if (!cur) return json(req, res, 404, { error: 'Nalog nije pronađen.' });
      if (m === 'GET') return json(req, res, 200, { ticket: cur });
      if (m === 'DELETE') { db.prepare('DELETE FROM tickets WHERE code = ?').run(cur.code); return json(req, res, 200, { ok: true }); }
      if (m === 'PATCH') {
        const b = await readBody(req);
        const sets = [], args = [];
        for (const k of Object.keys(EDITABLE)) if (k in b) { sets.push(`${k} = ?`); args.push(str(b[k], EDITABLE[k])); }
        if ('problems' in b) { sets.push('problems = ?'); args.push(JSON.stringify((Array.isArray(b.problems) ? b.problems : []).slice(0, 10).map((x) => str(x, 40)).filter(Boolean))); }
        if ('stage' in b) {
          if (!Number.isInteger(b.stage) || b.stage < -1 || b.stage >= STAGES) return json(req, res, 400, { error: 'Neispravna faza.' });
          if (b.stage !== cur.stage) { sets.push('stage = ?', 'times = ?'); args.push(b.stage, JSON.stringify(stampTimes(cur.times, cur.stage, b.stage))); }
        }
        if (sets.length) { sets.push('updated_at = ?'); args.push(now(), cur.code); db.prepare(`UPDATE tickets SET ${sets.join(', ')} WHERE code = ?`).run(...args); }
        return json(req, res, 200, { ticket: rowToTicket(db.prepare('SELECT * FROM tickets WHERE code = ?').get(cur.code)) });
      }
    }
    if (ap === 'subscribers' && m === 'GET') return json(req, res, 200, { subscribers: db.prepare('SELECT * FROM subscribers ORDER BY created_at DESC').all() });
    const sm = ap.match(/^subscribers\/(\d+)$/);
    if (sm && m === 'DELETE') { db.prepare('DELETE FROM subscribers WHERE id = ?').run(+sm[1]); return json(req, res, 200, { ok: true }); }
    if (ap === 'export.csv' && m === 'GET') {
      const rows = db.prepare('SELECT * FROM tickets ORDER BY created_at').all();
      const cols = ['code', 'created_at', 'stage', 'name', 'phone', 'email', 'device', 'model', 'problems', 'description', 'slot_day', 'slot_time', 'diag', 'price', 'eta', 'notes'];
      const cell = (v) => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
      const csv = '\ufeff' + [cols.join(';')].concat(rows.map((r) => cols.map((c) => cell(r[c])).join(';'))).join('\r\n');
      return send(req, res, 200, csv, 'text/csv; charset=utf-8', { 'Content-Disposition': 'attachment; filename="nalozi.csv"', 'Cache-Control': 'no-store' });
    }
  }
  return json(req, res, 404, { error: 'Nepoznata adresa.' });
}

/* ---------------- Statični fajlovi ---------------- */
function serveFile(req, res, file, status = 200) {
  fs.readFile(file, (err, data) => {
    if (err) return notFound(req, res);
    const ext = path.extname(file).toLowerCase();
    const cache = ext === '.html' ? 'no-cache' : 'public, max-age=3600';
    send(req, res, status, data, TYPES[ext] || 'application/octet-stream', { 'Cache-Control': cache });
  });
}
function notFound(req, res) {
  const f = path.join(ROOT, '404.html');
  if (fs.existsSync(f)) return serveFile(req, res, f, 404);
  send(req, res, 404, 'Nije pronađeno', 'text/plain; charset=utf-8');
}
function resolveStatic(pathname) {
  let rel;
  try { rel = decodeURIComponent(pathname); } catch { return null; }
  if (rel.includes('\0')) return null;
  if (rel === '/admin' || rel === '/admin/') return path.join(ADMIN_DIR, 'index.html');
  if (rel.startsWith('/admin/')) { const f = path.resolve(ADMIN_DIR, '.' + rel.slice(6)); return f.startsWith(ADMIN_DIR + path.sep) ? f : null; }
  if (rel === '/') rel = '/index.html';
  const f = path.resolve(ROOT, '.' + rel);
  if (!f.startsWith(ROOT + path.sep)) return null;
  const relp = path.relative(ROOT, f);
  // Javno su dostupni samo stranice u korenu, assets/ i robots/sitemap
  if (/^[\w-]+\.html$/.test(relp) || /^assets[\\/][\w.-]+$/.test(relp) || relp === 'robots.txt' || relp === 'sitemap.xml') return f;
  if (/^[\w-]+$/.test(relp) && fs.existsSync(f + '.html')) return f + '.html';
  return null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(req, res, 405, 'Metod nije dozvoljen', 'text/plain; charset=utf-8', { Allow: 'GET, HEAD' });
    if (url.pathname === '/favicon.ico') return serveFile(req, res, path.join(ROOT, 'assets', 'favicon.svg'));
    const f = resolveStatic(url.pathname);
    if (!f || !fs.existsSync(f) || !fs.statSync(f).isFile()) return notFound(req, res);
    serveFile(req, res, f);
  } catch (e) {
    if (e.status) return json(req, res, e.status, { error: e.status === 413 ? 'Poruka je preduga.' : 'Neispravan zahtev.' });
    console.error(e);
    if (!res.headersSent) json(req, res, 500, { error: 'Greška na serveru.' });
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Reset servis radi na http://localhost:${PORT}  (baza: ${path.join(DATA_DIR, 'reset.db')})`);
    if (!ADMIN_PASSWORD) console.warn('UPOZORENJE: ADMIN_PASSWORD nije postavljen, panel /admin je isključen.');
    if (!process.env.SESSION_SECRET) console.warn('Napomena: SESSION_SECRET nije postavljen; prijava u panel važi do restarta servera.');
  });
  const stop = () => server.close(() => { db.close(); process.exit(0); });
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
}
module.exports = { server, db };
