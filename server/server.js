'use strict';
/*
 * Server sajta servisa (Node.js 22.13+, bez spoljnih zavisnosti).
 * Služi sajt generisan iz sadržaja u bazi, prima zakazivanja, prikazuje status popravke
 * i nudi panel /admin sa korisnicima i ulogama. Promenljive okruženja su opisane u README.md.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');

const D = require('./lib/db');
const A = require('./lib/auth');
const M = require('./lib/mail');
const SL = require('./lib/slots');
const BK = require('./lib/backup');
const { renderSite, normalize } = require('./render/render');

const ROOT = path.resolve(__dirname, '..');
const ADMIN_DIR = path.join(__dirname, 'admin');
const PORT = +(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const SITE_DIR = path.join(DATA_DIR, 'site');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const WEBHOOK = process.env.NOTIFY_WEBHOOK_URL || '';
const VERSION = require(path.join(ROOT, 'package.json')).version;

/* ---------------- Baza i sadržaj ---------------- */
const db = D.open(DATA_DIR);
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (A.bootstrapOwner(db, process.env.ADMIN_PASSWORD)) console.log('Napravljen je prvi korisnik "admin" sa lozinkom iz ADMIN_PASSWORD.');

function seedContent() {
  if (db.prepare('SELECT COUNT(*) AS n FROM content').get().n) return;
  const seed = fs.readFileSync(path.join(ROOT, 'config', 'content.json'), 'utf8');
  db.prepare('INSERT INTO content (data, created_at, user_name) VALUES (?, ?, ?)').run(seed, D.now(), 'početni sadržaj');
}
seedContent();
let CONTENT, CONTENT_ID;
function loadContent() {
  const r = db.prepare('SELECT id, data FROM content ORDER BY id DESC LIMIT 1').get();
  CONTENT_ID = r.id; CONTENT = normalize(JSON.parse(r.data));
}
function rebuild() {
  loadContent();
  renderSite(CONTENT, SITE_DIR);
}
rebuild();
const biz = () => ({ name: CONTENT.business.name, address: [CONTENT.contact.street, [CONTENT.contact.postal, CONTENT.contact.city].filter(Boolean).join(' ')].filter(Boolean).join(', '), phone: CONTENT.contact.phone, email: CONTENT.contact.email });
const siteUrl = () => process.env.PUBLIC_URL ? process.env.PUBLIC_URL.replace(/\/+$/, '') : CONTENT.siteUrl;

/* ---------------- HTTP pomoćne funkcije ---------------- */
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8' };
function csp() {
  const pl = CONTENT.analytics && CONTENT.analytics.plausibleDomain && !CONTENT.demo ? ' https://plausible.io' : '';
  return ["default-src 'self'", `script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net${pl}`, "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com", "img-src 'self' data:", `connect-src 'self'${pl}`, "frame-ancestors 'self'", "base-uri 'self'", "form-action 'self'", "object-src 'none'"].join('; ');
}
function baseHeaders(res, req) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', csp());
  if (isHttps(req)) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
}
function send(req, res, status, body, type, extra = {}) {
  baseHeaders(res, req);
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
const clientIp = (req) => (TRUST_PROXY && req.headers['x-forwarded-for'] ? String(req.headers['x-forwarded-for']).split(',')[0].trim() : req.socket.remoteAddress || '?');
const isHttps = (req) => (TRUST_PROXY && req.headers['x-forwarded-proto'] === 'https') || !!req.socket.encrypted;
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

const buckets = new Map();
function limited(req, name, max, windowMs, key2 = '') {
  const key = name + ':' + clientIp(req) + ':' + key2, t = Date.now();
  const b = buckets.get(key);
  if (!b || t > b.reset) { buckets.set(key, { n: 1, reset: t + windowMs }); return false; }
  b.n++;
  return b.n > max;
}
setInterval(() => { const t = Date.now(); for (const [k, b] of buckets) if (t > b.reset) buckets.delete(k); A.cleanup(db); }, 60_000).unref();

function readRaw(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new HttpError(413, 'Sadržaj je prevelik.')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
async function readBody(req, limit = 20_000) {
  const raw = await readRaw(req, limit);
  if (!raw.length) return {};
  try { return JSON.parse(raw.toString('utf8')); } catch { throw new HttpError(400, 'Neispravan zahtev.'); }
}
const str = (v, max) => (typeof v === 'string' ? v : v == null ? '' : String(v)).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const getCookie = (req, name) => { const m = (req.headers.cookie || '').split(/;\s*/).find((c) => c.startsWith(name + '=')); return m ? decodeURIComponent(m.slice(name.length + 1)) : ''; };
const cookieAttrs = (req) => `Path=/; HttpOnly; SameSite=Strict${isHttps(req) ? '; Secure' : ''}`;

function notifyWebhook(text) {
  if (!WEBHOOK) return;
  fetch(WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, content: text }) }).catch((e) => console.error('webhook:', e.message));
}

/* ---------------- Javni API ---------------- */
const PUBLIC_FIELDS = (t) => ({
  device: [t.device, t.model].filter(Boolean).join(', '), issue: t.problems.length ? t.problems.join(', ') : t.description.slice(0, 120),
  diag: t.diag, price: t.price, eta: t.eta, stage: t.stage, times: t.times,
  slot: t.stage < 0 && t.slot_day ? `${t.slot_day.split('-').reverse().join('.')}. ${t.slot_time}` : ''
});
const getTicket = (code) => D.rowToTicket(db.prepare('SELECT * FROM tickets WHERE code = ?').get(code));

async function publicApi(req, res, p, url) {
  const m = req.method;
  if (p === 'health') { db.prepare('SELECT 1').get(); return json(req, res, 200, { ok: true, version: VERSION }); }
  if (p === 'slots' && m === 'GET') return json(req, res, 200, { days: SL.availability(db, CONTENT) });

  if (p === 'bookings' && m === 'POST') {
    if (limited(req, 'book', 8, 10 * 60e3)) throw new HttpError(429, 'Previše zahteva. Pokušajte ponovo za nekoliko minuta.');
    const b = await readBody(req);
    if (b.website) return json(req, res, 200, { code: 'RN-0000-OK' }); // zamka za botove
    const t = {
      name: str(b.name, 100), phone: str(b.phone, 30), email: str(b.email, 150), device: str(b.device, 60), model: str(b.model, 120),
      problems: (Array.isArray(b.problems) ? b.problems : []).slice(0, 10).map((x) => str(x, 40)).filter(Boolean),
      description: str(b.description, 2000), slot_day: /^\d{4}-\d\d-\d\d$/.test(b.day) ? b.day : '', slot_time: /^\d\d:\d\d$/.test(b.time) ? b.time : ''
    };
    if (t.name.length < 2) throw new HttpError(400, 'Upišite ime i prezime.');
    if (t.phone.replace(/\D/g, '').length < 6) throw new HttpError(400, 'Upišite ispravan broj telefona.');
    if (t.email && !EMAIL.test(t.email)) throw new HttpError(400, 'E-pošta nije ispravna.');
    if (b.consent !== true) throw new HttpError(400, 'Potrebna je vaša saglasnost.');
    if (t.slot_day && !SL.isFree(db, CONTENT, t.slot_day, t.slot_time)) throw new HttpError(409, 'Izabrani termin je u međuvremenu popunjen. Izaberite drugi.');
    t.code = D.newCode(db);
    const ts = D.now();
    db.prepare(`INSERT INTO tickets (code, created_at, updated_at, source, stage, name, phone, email, device, model, problems, description, slot_day, slot_time, times)
                VALUES (?, ?, ?, 'web', -1, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]')`)
      .run(t.code, ts, ts, t.name, t.phone, t.email, t.device, t.model, JSON.stringify(t.problems), t.description, t.slot_day, t.slot_time);
    D.audit(db, null, 'ticket.create', 'ticket', t.code, { source: 'web' });
    const N = CONTENT.notifications || {};
    for (const to of (N.staffEmails || []).filter((x) => EMAIL.test(x))) M.enqueue(db, 'booking.staff', to, t, biz(), siteUrl());
    if (t.email && N.customerOnBooking !== false) M.enqueue(db, 'booking.customer', t.email, t, biz(), siteUrl());
    notifyWebhook(`Novo zakazivanje ${t.code}: ${t.name}, ${t.phone}. ${t.device}${t.model ? ' (' + t.model + ')' : ''}. ${t.problems.join(', ')}. Termin: ${t.slot_day || '—'} ${t.slot_time}`);
    return json(req, res, 201, { code: t.code });
  }

  const om = p.match(/^orders\/([A-Za-z0-9-]{6,24})$/);
  if (om && m === 'GET') {
    if (limited(req, 'order', 30, 60e3)) throw new HttpError(429, 'Previše pokušaja.');
    const t = getTicket(om[1].toUpperCase());
    if (!t) throw new HttpError(404, 'Nije pronađen.');
    return json(req, res, 200, { order: PUBLIC_FIELDS(t) });
  }

  if (p === 'newsletter' && m === 'POST') {
    if (limited(req, 'nl', 5, 10 * 60e3)) throw new HttpError(429, 'Previše zahteva. Pokušajte kasnije.');
    const b = await readBody(req, 2000);
    const email = str(b.email, 150).toLowerCase();
    if (!EMAIL.test(email)) throw new HttpError(400, 'Upišite ispravnu adresu e-pošte.');
    db.prepare('INSERT OR IGNORE INTO subscribers (email, created_at) VALUES (?, ?)').run(email, D.now());
    return json(req, res, 201, { ok: true });
  }
  throw new HttpError(404, 'Nepoznata adresa.');
}

/* ---------------- Administracija ---------------- */
const CUSTOMER_FIELDS = { name: 100, phone: 30, email: 150, device: 60, model: 120, description: 2000, slot_day: 10, slot_time: 5 };
const SERVICE_FIELDS = { diag: 300, price: 60, eta: 80, notes: 4000 };
const need = (user, perm) => { if (!A.can(user, perm)) throw new HttpError(403, 'Nemate dozvolu za ovu radnju.'); };

function stageMail(before, after) {
  if (!after.email || before.stage === after.stage) return;
  const N = CONTENT.notifications || {};
  if (after.stage === 2 && N.customerOnEstimate !== false) M.enqueue(db, 'stage.estimate', after.email, after, biz(), siteUrl());
  if (after.stage === 6 && N.customerOnReady !== false) M.enqueue(db, 'stage.ready', after.email, after, biz(), siteUrl());
}

async function adminApi(req, res, ap, url) {
  const m = req.method;
  if (ap === 'login' && m === 'POST') {
    const b = await readBody(req, 2000);
    if (limited(req, 'login', 10, 15 * 60e3) || limited(req, 'login-user', 8, 15 * 60e3, String(b.username || '').toLowerCase())) throw new HttpError(429, 'Previše pokušaja. Sačekajte 15 minuta.');
    if (!db.prepare('SELECT COUNT(*) AS n FROM users').get().n) throw new HttpError(503, 'Panel nije podešen: postavite ADMIN_PASSWORD na serveru i ponovo ga pokrenite.');
    const r = A.login(db, b.username, b.password, clientIp(req));
    if (!r) throw new HttpError(401, 'Pogrešno korisničko ime ili lozinka.');
    return json(req, res, 200, { user: r.user }, { 'Set-Cookie': `rs_session=${r.token}; Max-Age=${A.SESSION_HOURS * 3600}; ${cookieAttrs(req)}` });
  }
  const token = getCookie(req, 'rs_session');
  if (ap === 'logout' && m === 'POST') { A.logout(db, token); return json(req, res, 200, { ok: true }, { 'Set-Cookie': `rs_session=; Max-Age=0; ${cookieAttrs(req)}` }); }
  const user = A.sessionUser(db, token);
  if (ap === 'me') return json(req, res, 200, { user, configured: !!db.prepare('SELECT COUNT(*) AS n FROM users').get().n, roles: A.ROLES, perms: user ? Object.keys(A.PERMS).filter((p) => A.can(user, p)) : [], mail: M.enabled(), version: VERSION });
  if (!user) throw new HttpError(401, 'Prijavite se.');
  // Zaštita od zahteva sa drugih sajtova: zaglavlje koje šalje samo naš panel
  if (m !== 'GET' && req.headers['x-rs-admin'] !== '1') throw new HttpError(403, 'Nedozvoljen zahtev.');

  /* ----- nalozi ----- */
  if (ap === 'tickets' && m === 'GET') {
    need(user, 'tickets.read');
    const q = str(url.searchParams.get('q'), 100), stage = url.searchParams.get('stage');
    let sql = 'SELECT * FROM tickets WHERE 1=1'; const args = [];
    if (stage === 'active') sql += ' AND stage BETWEEN -1 AND 6';
    else if (stage && /^-?\d$/.test(stage)) { sql += ' AND stage = ?'; args.push(+stage); }
    if (q) { sql += ' AND (code LIKE ? OR name LIKE ? OR phone LIKE ? OR device LIKE ? OR model LIKE ?)'; const like = `%${q}%`; args.push(like, like, like, like, like); }
    sql += stage === '-1' ? ' ORDER BY slot_day, slot_time LIMIT 500' : ' ORDER BY updated_at DESC LIMIT 500';
    return json(req, res, 200, { tickets: db.prepare(sql).all(...args).map(D.rowToTicket) });
  }
  if (ap === 'tickets' && m === 'POST') {
    need(user, 'tickets.create');
    const b = await readBody(req);
    const code = D.newCode(db), ts = D.now();
    const v = Object.fromEntries(Object.entries({ ...CUSTOMER_FIELDS, ...SERVICE_FIELDS }).map(([k, n]) => [k, str(b[k], n)]));
    const stage = Number.isInteger(b.stage) && b.stage >= -1 && b.stage < D.STAGES ? b.stage : 0;
    const problems = (Array.isArray(b.problems) ? b.problems : []).slice(0, 10).map((x) => str(x, 40)).filter(Boolean);
    db.prepare(`INSERT INTO tickets (code, created_at, updated_at, source, stage, name, phone, email, device, model, problems, description, slot_day, slot_time, diag, price, eta, notes, times)
                VALUES (?, ?, ?, 'admin', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(code, ts, ts, stage, v.name, v.phone, v.email, v.device, v.model, JSON.stringify(problems), v.description, v.slot_day, v.slot_time, v.diag, v.price, v.eta, v.notes, JSON.stringify(D.stampTimes([], stage)));
    D.audit(db, user, 'ticket.create', 'ticket', code, { stage });
    return json(req, res, 201, { ticket: getTicket(code) });
  }
  const tm = ap.match(/^tickets\/([A-Z0-9-]{6,24})(\/history)?$/);
  if (tm) {
    const cur = getTicket(tm[1]);
    if (!cur) throw new HttpError(404, 'Nalog nije pronađen.');
    if (tm[2]) { need(user, 'tickets.read'); return json(req, res, 200, { history: db.prepare("SELECT at, user_name, action, details FROM audit WHERE entity = 'ticket' AND entity_id = ? ORDER BY id DESC LIMIT 200").all(cur.code) }); }
    if (m === 'GET') { need(user, 'tickets.read'); return json(req, res, 200, { ticket: cur }); }
    if (m === 'DELETE') { need(user, 'tickets.delete'); db.prepare('DELETE FROM tickets WHERE code = ?').run(cur.code); D.audit(db, user, 'ticket.delete', 'ticket', cur.code, { name: cur.name }); return json(req, res, 200, { ok: true }); }
    if (m === 'PATCH') {
      need(user, 'tickets.editService');
      const b = await readBody(req);
      const sets = [], args = [], changed = {};
      const allowed = A.can(user, 'tickets.editCustomer') ? { ...CUSTOMER_FIELDS, ...SERVICE_FIELDS } : SERVICE_FIELDS;
      for (const [k, n] of Object.entries(allowed)) if (k in b) { const v = str(b[k], n); if (v !== cur[k]) { sets.push(`${k} = ?`); args.push(v); changed[k] = k === 'notes' ? '(izmenjeno)' : v; } }
      if ('problems' in b && A.can(user, 'tickets.editCustomer')) {
        const pr = (Array.isArray(b.problems) ? b.problems : []).slice(0, 10).map((x) => str(x, 40)).filter(Boolean);
        if (JSON.stringify(pr) !== JSON.stringify(cur.problems)) { sets.push('problems = ?'); args.push(JSON.stringify(pr)); changed.problems = pr.join(', '); }
      }
      if ('stage' in b && b.stage !== cur.stage) {
        if (!Number.isInteger(b.stage) || b.stage < -1 || b.stage >= D.STAGES) throw new HttpError(400, 'Neispravna faza.');
        sets.push('stage = ?', 'times = ?'); args.push(b.stage, JSON.stringify(D.stampTimes(cur.times, b.stage))); changed.stage = b.stage;
      }
      if (sets.length) {
        sets.push('updated_at = ?'); args.push(D.now(), cur.code);
        db.prepare(`UPDATE tickets SET ${sets.join(', ')} WHERE code = ?`).run(...args);
        D.audit(db, user, 'stage' in changed ? 'ticket.stage' : 'ticket.update', 'ticket', cur.code, changed);
      }
      const after = getTicket(cur.code);
      stageMail(cur, after);
      return json(req, res, 200, { ticket: after });
    }
  }
  if (ap === 'slots' && m === 'GET') { need(user, 'tickets.read'); return json(req, res, 200, { days: SL.availability(db, CONTENT) }); }

  /* ----- pretplatnici, izvoz ----- */
  if (ap === 'subscribers' && m === 'GET') { need(user, 'subscribers.read'); return json(req, res, 200, { subscribers: db.prepare('SELECT * FROM subscribers ORDER BY created_at DESC').all() }); }
  const sm = ap.match(/^subscribers\/(\d+)$/);
  if (sm && m === 'DELETE') { need(user, 'subscribers.delete'); db.prepare('DELETE FROM subscribers WHERE id = ?').run(+sm[1]); D.audit(db, user, 'subscriber.delete', 'subscriber', sm[1]); return json(req, res, 200, { ok: true }); }
  if (ap === 'export.csv' && m === 'GET') {
    need(user, 'export');
    const rows = db.prepare('SELECT * FROM tickets ORDER BY created_at').all();
    const cols = ['code', 'created_at', 'stage', 'name', 'phone', 'email', 'device', 'model', 'problems', 'description', 'slot_day', 'slot_time', 'diag', 'price', 'eta', 'notes'];
    const cell = (v) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    const csv = '\ufeff' + [cols.join(';')].concat(rows.map((r) => cols.map((c) => cell(r[c])).join(';'))).join('\r\n');
    D.audit(db, user, 'export', 'tickets', '', { rows: rows.length });
    return send(req, res, 200, csv, 'text/csv; charset=utf-8', { 'Content-Disposition': 'attachment; filename="nalozi.csv"', 'Cache-Control': 'no-store' });
  }

  /* ----- sadržaj sajta ----- */
  if (ap === 'content' && m === 'GET') { need(user, 'content'); const r = db.prepare('SELECT id, data FROM content ORDER BY id DESC LIMIT 1').get(); return json(req, res, 200, { version: r.id, content: JSON.parse(r.data) }); }
  if (ap === 'content' && m === 'PUT') {
    need(user, 'content');
    const b = await readBody(req, 600_000);
    if (!b.content || typeof b.content !== 'object') throw new HttpError(400, 'Nedostaje sadržaj.');
    if (b.version !== CONTENT_ID) throw new HttpError(409, 'Sadržaj je u međuvremenu izmenio neko drugi. Osvežite stranicu i ponovite izmenu.');
    const clean = normalize(b.content);
    try { renderSite(clean, null); } catch (e) { throw new HttpError(400, 'Sadržaj nije ispravan: ' + e.message); }
    db.prepare('INSERT INTO content (data, created_at, user_name) VALUES (?, ?, ?)').run(JSON.stringify(clean), D.now(), user.name || user.username);
    rebuild();
    D.audit(db, user, 'content.update', 'content', CONTENT_ID);
    return json(req, res, 200, { version: CONTENT_ID });
  }
  if (ap === 'content/versions' && m === 'GET') { need(user, 'content'); return json(req, res, 200, { versions: db.prepare('SELECT id, created_at, user_name FROM content ORDER BY id DESC LIMIT 50').all() }); }
  const cr = ap.match(/^content\/restore\/(\d+)$/);
  if (cr && m === 'POST') {
    need(user, 'content');
    const old = db.prepare('SELECT data FROM content WHERE id = ?').get(+cr[1]);
    if (!old) throw new HttpError(404, 'Verzija nije pronađena.');
    db.prepare('INSERT INTO content (data, created_at, user_name) VALUES (?, ?, ?)').run(old.data, D.now(), `${user.name || user.username} (vraćena verzija ${cr[1]})`);
    rebuild();
    D.audit(db, user, 'content.restore', 'content', CONTENT_ID, { from: +cr[1] });
    return json(req, res, 200, { version: CONTENT_ID });
  }
  if (ap === 'uploads' && m === 'POST') {
    need(user, 'content');
    const raw = await readRaw(req, 3 * 1024 * 1024);
    const sig = raw.subarray(0, 12);
    const ext = sig[0] === 0x89 && sig.toString('latin1', 1, 4) === 'PNG' ? 'png'
      : sig[0] === 0xff && sig[1] === 0xd8 && sig[2] === 0xff ? 'jpg'
      : sig.toString('latin1', 0, 4) === 'RIFF' && sig.toString('latin1', 8, 12) === 'WEBP' ? 'webp' : '';
    if (!ext) throw new HttpError(400, 'Dozvoljene su samo slike PNG, JPG ili WebP, do 3 MB.');
    const name = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, name), raw);
    D.audit(db, user, 'upload', 'file', name, { size: raw.length });
    return json(req, res, 201, { url: `/uploads/${name}` });
  }

  /* ----- korisnici ----- */
  if (ap === 'users' && m === 'GET') { need(user, 'users'); return json(req, res, 200, { users: db.prepare('SELECT * FROM users ORDER BY id').all().map(A.publicUser) }); }
  if (ap === 'users' && m === 'POST') {
    need(user, 'users');
    const b = await readBody(req, 2000);
    const username = str(b.username, 40).toLowerCase(), name = str(b.name, 80), role = b.role;
    if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw new HttpError(400, 'Korisničko ime: 3–40 znakova, mala slova, brojevi, tačka, crtica.');
    if (!A.ROLES[role]) throw new HttpError(400, 'Izaberite ulogu.');
    const pp = A.passwordProblem(b.password); if (pp) throw new HttpError(400, pp);
    if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) throw new HttpError(409, 'To korisničko ime već postoji.');
    const r = db.prepare('INSERT INTO users (username, name, role, pass_hash, created_at) VALUES (?, ?, ?, ?, ?)').run(username, name, role, A.hashPassword(b.password), D.now());
    D.audit(db, user, 'user.create', 'user', r.lastInsertRowid, { username, role });
    return json(req, res, 201, { ok: true });
  }
  const um = ap.match(/^users\/(\d+)$/);
  if (um && m === 'PATCH') {
    need(user, 'users');
    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(+um[1]);
    if (!target) throw new HttpError(404, 'Korisnik nije pronađen.');
    const b = await readBody(req, 2000);
    const owners = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'owner' AND active = 1").get().n;
    const losingOwner = target.role === 'owner' && target.active && ((b.role && b.role !== 'owner') || b.active === false);
    if (losingOwner && owners <= 1) throw new HttpError(400, 'Mora postojati bar jedan aktivan vlasnik.');
    const changes = {};
    if (b.name !== undefined) { db.prepare('UPDATE users SET name = ? WHERE id = ?').run(str(b.name, 80), target.id); changes.name = true; }
    if (b.role && A.ROLES[b.role]) { db.prepare('UPDATE users SET role = ? WHERE id = ?').run(b.role, target.id); changes.role = b.role; }
    if (typeof b.active === 'boolean') { db.prepare('UPDATE users SET active = ? WHERE id = ?').run(b.active ? 1 : 0, target.id); changes.active = b.active; if (!b.active) A.dropSessions(db, target.id); }
    if (b.password) { const pp = A.passwordProblem(b.password); if (pp) throw new HttpError(400, pp); db.prepare('UPDATE users SET pass_hash = ? WHERE id = ?').run(A.hashPassword(b.password), target.id); A.dropSessions(db, target.id); changes.password = 'promenjena'; }
    D.audit(db, user, 'user.update', 'user', target.id, changes);
    return json(req, res, 200, { ok: true });
  }
  if (ap === 'me/password' && m === 'POST') {
    const b = await readBody(req, 2000);
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    if (!A.verifyPassword(b.current || '', row.pass_hash)) throw new HttpError(400, 'Trenutna lozinka nije tačna.');
    const pp = A.passwordProblem(b.password); if (pp) throw new HttpError(400, pp);
    db.prepare('UPDATE users SET pass_hash = ? WHERE id = ?').run(A.hashPassword(b.password), user.id);
    A.dropSessions(db, user.id);
    D.audit(db, user, 'user.password', 'user', user.id);
    return json(req, res, 200, { ok: true }, { 'Set-Cookie': `rs_session=; Max-Age=0; ${cookieAttrs(req)}` });
  }

  /* ----- dnevnik, e-pošta, rezervne kopije ----- */
  if (ap === 'audit' && m === 'GET') {
    need(user, 'audit');
    const before = +url.searchParams.get('before') || 1e15;
    return json(req, res, 200, { items: db.prepare('SELECT * FROM audit WHERE id < ? ORDER BY id DESC LIMIT 200').all(before) });
  }
  if (ap === 'mail' && m === 'GET') { need(user, 'mail'); return json(req, res, 200, { enabled: M.enabled(), from: M.config().from, items: db.prepare('SELECT id, created_at, kind, ticket_code, to_addr, subject, status, attempts, last_error, sent_at FROM outbox ORDER BY id DESC LIMIT 100').all() }); }
  if (ap === 'mail/test' && m === 'POST') {
    need(user, 'mail');
    const b = await readBody(req, 2000);
    if (!M.enabled()) throw new HttpError(400, 'Slanje e-pošte nije podešeno na serveru (SMTP_HOST, MAIL_FROM).');
    if (!EMAIL.test(b.to || '')) throw new HttpError(400, 'Upišite ispravnu adresu.');
    M.enqueue(db, 'test', b.to, null, biz(), siteUrl());
    return json(req, res, 200, { ok: true });
  }
  const mr = ap.match(/^mail\/(\d+)\/retry$/);
  if (mr && m === 'POST') { need(user, 'mail'); db.prepare("UPDATE outbox SET status = 'pending', next_attempt_at = ?, attempts = 0 WHERE id = ?").run(D.now(), +mr[1]); M.processQueue(db).catch(() => {}); return json(req, res, 200, { ok: true }); }
  if (ap === 'backups' && m === 'GET') { need(user, 'backups'); return json(req, res, 200, { backups: BK.list(DATA_DIR) }); }
  if (ap === 'backups' && m === 'POST') { need(user, 'backups'); const n = BK.create(db, DATA_DIR); D.audit(db, user, 'backup.create', 'backup', n); return json(req, res, 201, { name: n }); }
  const bm = ap.match(/^backups\/([\w.-]+)$/);
  if (bm && m === 'GET') {
    need(user, 'backups');
    const f = BK.filePath(DATA_DIR, bm[1]);
    if (!f) throw new HttpError(404, 'Kopija nije pronađena.');
    D.audit(db, user, 'backup.download', 'backup', bm[1]);
    return send(req, res, 200, fs.readFileSync(f), 'application/octet-stream', { 'Content-Disposition': `attachment; filename="${bm[1]}"`, 'Cache-Control': 'no-store' });
  }
  throw new HttpError(404, 'Nepoznata adresa.');
}

/* ---------------- Statični fajlovi ---------------- */
function serveFile(req, res, file, status = 200, cache) {
  fs.readFile(file, (err, data) => {
    if (err) return notFound(req, res);
    const ext = path.extname(file).toLowerCase();
    send(req, res, status, data, TYPES[ext] || 'application/octet-stream', { 'Cache-Control': cache || (ext === '.html' ? 'no-cache' : 'public, max-age=3600') });
  });
}
function notFound(req, res) {
  const f = path.join(SITE_DIR, '404.html');
  if (fs.existsSync(f)) return serveFile(req, res, f, 404);
  send(req, res, 404, 'Nije pronađeno', 'text/plain; charset=utf-8');
}
function resolveStatic(pathname) {
  let rel;
  try { rel = decodeURIComponent(pathname); } catch { return null; }
  if (rel.includes('\0') || rel.includes('..')) return null;
  if (rel === '/admin' || rel === '/admin/') return path.join(ADMIN_DIR, 'index.html');
  if (/^\/admin\/[\w.-]+$/.test(rel)) return path.join(ADMIN_DIR, rel.slice(7));
  if (/^\/uploads\/[\w.-]+\.(png|jpg|webp)$/.test(rel)) return path.join(UPLOAD_DIR, rel.slice(9));
  if (rel === '/') rel = '/index.html';
  if (/^\/[\w-]+\.(html|txt|xml)$/.test(rel) || /^\/assets\/[\w.-]+$/.test(rel)) return path.join(SITE_DIR, rel);
  if (/^\/[\w-]+$/.test(rel)) return path.join(SITE_DIR, rel + '.html');
  return null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/admin/')) return await adminApi(req, res, url.pathname.slice(11), url);
    if (url.pathname.startsWith('/api/')) return await publicApi(req, res, url.pathname.slice(5), url);
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(req, res, 405, 'Metod nije dozvoljen', 'text/plain; charset=utf-8', { Allow: 'GET, HEAD' });
    if (url.pathname === '/favicon.ico') return serveFile(req, res, path.join(SITE_DIR, 'assets', 'favicon.svg'));
    const f = resolveStatic(url.pathname);
    if (!f || !fs.existsSync(f) || !fs.statSync(f).isFile()) return notFound(req, res);
    serveFile(req, res, f, 200, f.startsWith(ADMIN_DIR) ? 'no-cache' : undefined);
  } catch (e) {
    if (e instanceof HttpError) return json(req, res, e.status, { error: e.message });
    console.error(new Date().toISOString(), e);
    if (!res.headersSent) json(req, res, 500, { error: 'Greška na serveru.' });
  }
});
server.requestTimeout = 30_000;
server.headersTimeout = 15_000;

function start() {
  setInterval(() => M.processQueue(db).catch(() => {}), 15_000).unref();
  BK.schedule(db, DATA_DIR);
  server.listen(PORT, () => {
    console.log(`Sajt radi na http://localhost:${PORT}  (podaci: ${DATA_DIR})`);
    if (!db.prepare('SELECT COUNT(*) AS n FROM users').get().n) console.warn('UPOZORENJE: nema korisnika panela. Postavite ADMIN_PASSWORD i ponovo pokrenite server.');
    if (!M.enabled()) console.warn('Napomena: slanje e-pošte nije podešeno (SMTP_HOST, MAIL_FROM).');
  });
  const stop = () => server.close(() => { db.close(); process.exit(0); });
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
}
if (require.main === module) start();
module.exports = { server, db, rebuild };
