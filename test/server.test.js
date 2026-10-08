'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const net = require('node:net');
const path = require('node:path');

/* Lažni SMTP server: prima poruke i čuva ih za proveru */
const mails = [];
const smtp = net.createServer((s) => {
  let data = false, buf = '';
  s.write('220 test ESMTP\r\n');
  s.on('data', (d) => {
    buf += d.toString();
    if (data) {
      const i = buf.indexOf('\r\n.\r\n');
      if (i === -1) return;
      mails.push(buf.slice(0, i)); buf = buf.slice(i + 5); data = false; s.write('250 OK\r\n');
    }
    let j;
    while (!data && (j = buf.indexOf('\r\n')) !== -1) {
      const line = buf.slice(0, j); buf = buf.slice(j + 2);
      if (/^EHLO/i.test(line)) s.write('250-test\r\n250 AUTH PLAIN\r\n');
      else if (/^AUTH/i.test(line)) s.write('235 OK\r\n');
      else if (/^DATA/i.test(line)) { data = true; s.write('354 go\r\n'); }
      else if (/^QUIT/i.test(line)) { s.write('221 bye\r\n'); s.end(); }
      else s.write('250 OK\r\n');
    }
  });
});

let base, server, db, cookie;
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'rs-test-'));
test.before(async () => {
  await new Promise((r) => smtp.listen(0, '127.0.0.1', r));
  Object.assign(process.env, { DATA_DIR: DATA, ADMIN_PASSWORD: 'pocetna-lozinka-123', SMTP_HOST: '127.0.0.1', SMTP_PORT: String(smtp.address().port), SMTP_SECURE: 'none', SMTP_USER: 'u', SMTP_PASS: 'p', MAIL_FROM: 'Servis <servis@example.com>' });
  ({ server, db } = require('../server/server.js'));
  await new Promise((r) => server.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }));
});
test.after(() => new Promise((r) => server.close(() => { smtp.close(); db.close(); r(); })));

const req = (p, opts = {}) => fetch(base + p, opts);
const post = (p, body, headers = {}, method = 'POST') => fetch(base + p, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
const H = () => ({ Cookie: cookie, 'X-RS-Admin': '1' });
const waitFor = async (fn, ms = 4000) => { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await new Promise((r) => setTimeout(r, 50)); } return false; };
async function login(username, password) {
  const r = await post('/api/admin/login', { username, password });
  return r.ok ? r.headers.get('set-cookie').split(';')[0] : null;
}

test('stranice, bezbednosna zaglavlja i zaštita privatnih fajlova', async () => {
  for (const p of ['/', '/usluge.html', '/ciscenje-i-pasta.html', '/status', '/assets/style.css', '/assets/site-data.js', '/robots.txt', '/sitemap.xml', '/admin']) {
    assert.equal((await req(p)).status, 200, p);
  }
  for (const p of ['/server/server.js', '/config/content.json', '/data/reset.db', '/../etc/passwd', '/package.json', '/admin/../server.js', '/uploads/x.svg']) {
    assert.equal((await req(p)).status, 404, p);
  }
  const r = await req('/');
  assert.match(r.headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal(r.headers.get('x-frame-options'), 'SAMEORIGIN');
});

let code, slot;
test('zakazivanje: slobodni termini, provera podataka i popunjenost termina', async () => {
  const days = (await (await req('/api/slots')).json()).days;
  assert.ok(days.length > 0, 'ima slobodnih dana');
  slot = { day: days[0].date, time: days[0].times[0].t };
  const b = { device: 'Laptop', model: 'Lenovo IdeaPad 5', problems: ['Greje se / buka'], description: 'Gasi se', ...slot, name: 'Petar Petrović', phone: '060 123 4567', email: 'petar@example.com', consent: true };
  assert.equal((await post('/api/bookings', { ...b, name: '' })).status, 400);
  assert.equal((await post('/api/bookings', { ...b, consent: false })).status, 400);
  assert.equal((await post('/api/bookings', { ...b, email: 'nije-email' })).status, 400);
  let r = await post('/api/bookings', b); assert.equal(r.status, 201);
  code = (await r.json()).code; assert.match(code, /^RN-\d{4}-[A-Z0-9]{5}$/);
  r = await post('/api/bookings', { ...b, email: '' }); assert.equal(r.status, 201); // drugo mesto u istom terminu (kapacitet 2)
  r = await post('/api/bookings', b); assert.equal(r.status, 409);                   // termin je pun
  const after = (await (await req('/api/slots')).json()).days.find((d) => d.date === slot.day);
  assert.ok(!after || !after.times.some((t) => t.t === slot.time), 'pun termin se više ne nudi');
});

test('e-pošta: klijent i servis dobijaju poruku o zakazivanju', async () => {
  assert.ok(await waitFor(() => mails.some((m) => m.includes('To: petar@example.com'))), 'poruka klijentu');
  const m = mails.find((x) => x.includes('To: petar@example.com'));
  const body = Buffer.from(m.split('Content-Transfer-Encoding: base64')[1].split('--')[0].replace(/\s+/g, ''), 'base64').toString('utf8');
  assert.ok(body.includes(code), 'broj naloga je u poruci');
});

test('javni status ne otkriva ime ni telefon', async () => {
  const { order } = await (await req('/api/orders/' + code)).json();
  assert.equal(order.stage, -1);
  assert.equal(order.device, 'Laptop, Lenovo IdeaPad 5');
  const txt = JSON.stringify(order); assert.ok(!txt.includes('Petar') && !txt.includes('123'));
  assert.equal((await req('/api/orders/RN-2030-XXXXX')).status, 404);
});

test('prijava: pogrešna lozinka, lažna sesija i zaštitno zaglavlje', async () => {
  assert.equal((await req('/api/admin/tickets')).status, 401);
  assert.equal(await login('admin', 'pogresna'), null);
  cookie = await login('admin', 'pocetna-lozinka-123'); assert.ok(cookie);
  assert.equal((await req('/api/admin/tickets', { headers: { Cookie: 'rs_session=lazno' } })).status, 401);
  const r = await fetch(base + '/api/admin/tickets/' + code, { method: 'PATCH', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: '{"stage":0}' });
  assert.equal(r.status, 403);
});

test('nalozi: promena faze, vreme faza, e-poruka o proceni i istorija', async () => {
  const before = mails.length;
  let r = await post('/api/admin/tickets/' + code, { stage: 2, diag: 'Osušena pasta', price: '3.500 RSD' }, H(), 'PATCH');
  assert.equal(r.status, 200);
  const t = (await r.json()).ticket; assert.equal(t.stage, 2); assert.ok(t.times[0] && t.times[2] && !t.times[3]);
  assert.ok(await waitFor(() => mails.length > before && mails.slice(before).some((m) => /Procena/.test(Buffer.from((m.match(/Subject: =\?UTF-8\?B\?([^?]+)/) || [])[1] || '', 'base64').toString() + m))), 'poruka o proceni');
  const pub = (await (await req('/api/orders/' + code)).json()).order; assert.equal(pub.diag, 'Osušena pasta');
  const hist = (await (await req(`/api/admin/tickets/${code}/history`, { headers: H() })).json()).history;
  assert.ok(hist.some((h) => h.action === 'ticket.stage' && h.user_name === 'Administrator'));
  r = await req('/api/admin/export.csv', { headers: H() }); assert.match(await r.text(), /Petar/);
});

test('korisnici i uloge: serviser ne sme da menja klijenta, briše ni sadržaj', async () => {
  let r = await post('/api/admin/users', { username: 'marko', name: 'Marko', role: 'technician', password: 'kratka' }, H()); assert.equal(r.status, 400);
  r = await post('/api/admin/users', { username: 'marko', name: 'Marko', role: 'technician', password: 'dugacka-lozinka' }, H()); assert.equal(r.status, 201);
  const tc = await login('marko', 'dugacka-lozinka'); assert.ok(tc);
  const TH = { Cookie: tc, 'X-RS-Admin': '1' };
  r = await post('/api/admin/tickets/' + code, { name: 'Neko Drugi', stage: 4, diag: 'Zamenjena pasta' }, TH, 'PATCH'); assert.equal(r.status, 200);
  const t = (await r.json()).ticket; assert.equal(t.name, 'Petar Petrović'); assert.equal(t.stage, 4); assert.equal(t.diag, 'Zamenjena pasta');
  assert.equal((await req('/api/admin/tickets/' + code, { method: 'DELETE', headers: TH })).status, 403);
  assert.equal((await req('/api/admin/content', { headers: TH })).status, 403);
  assert.equal((await req('/api/admin/users', { headers: TH })).status, 403);
  // deaktivacija odmah gasi sesiju
  const users = (await (await req('/api/admin/users', { headers: H() })).json()).users;
  const m = users.find((u) => u.username === 'marko');
  assert.equal((await post('/api/admin/users/' + m.id, { active: false }, H(), 'PATCH')).status, 200);
  assert.equal((await req('/api/admin/tickets', { headers: TH })).status, 401);
  // poslednji vlasnik ne može da se ukloni
  const owner = users.find((u) => u.role === 'owner');
  assert.equal((await post('/api/admin/users/' + owner.id, { role: 'reception' }, H(), 'PATCH')).status, 400);
});

test('sadržaj: izmena se odmah vidi na sajtu, HTML se ne izvršava, verzije se čuvaju', async () => {
  let r = await req('/api/admin/content', { headers: H() });
  const { version, content } = await r.json();
  content.business.name = 'Test <script>alert(1)</script> Servis';
  content.contact.phone = '+381 11 999 8888';
  content.services[0].prices.push({ name: 'Nova stavka', min: 1000, max: 2000 });
  r = await post('/api/admin/content', { version, content }, H(), 'PUT'); assert.equal(r.status, 200);
  const html = await (await req('/')).text();
  assert.ok(html.includes('+381 11 999 8888'));
  assert.ok(!html.includes('<script>alert(1)</script>') && html.includes('&lt;script&gt;'));
  r = await post('/api/admin/content', { version, content }, H(), 'PUT'); assert.equal(r.status, 409, 'zastarela verzija se odbija');
  const versions = (await (await req('/api/admin/content/versions', { headers: H() })).json()).versions;
  assert.ok(versions.length >= 2);
  r = await post('/api/admin/content/restore/' + versions[1].id, {}, H()); assert.equal(r.status, 200);
  assert.ok(!(await (await req('/')).text()).includes('+381 11 999 8888'), 'vraćena ranija verzija');
});

test('otpremanje: samo prave slike', async () => {
  let r = await fetch(base + '/api/admin/uploads', { method: 'POST', headers: H(), body: '<svg onload=alert(1)>' }); assert.equal(r.status, 400);
  const png = Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D4944415478DA63F8CFC0F01F0005000201E2216BC60000000049454E44AE426082', 'hex');
  r = await fetch(base + '/api/admin/uploads', { method: 'POST', headers: H(), body: png }); assert.equal(r.status, 201);
  const { url } = await r.json(); assert.match(url, /^\/uploads\/[\w-]+\.png$/);
  assert.equal((await req(url)).status, 200);
});

test('rezervna kopija, dnevnik i prijava za savete', async () => {
  let r = await post('/api/admin/backups', {}, H()); assert.equal(r.status, 201);
  const { name } = await r.json();
  r = await req('/api/admin/backups/' + name, { headers: H() }); assert.equal(r.status, 200);
  assert.equal((await r.arrayBuffer()).byteLength > 1000, true);
  const items = (await (await req('/api/admin/audit', { headers: H() })).json()).items;
  for (const a of ['login', 'login.failed', 'content.update', 'user.create', 'backup.create']) assert.ok(items.some((i) => i.action === a), a);
  assert.equal((await post('/api/newsletter', { email: 'loše' })).status, 400);
  assert.equal((await post('/api/newsletter', { email: 'ana@example.com' })).status, 201);
  let last; for (let i = 0; i < 6; i++) last = await post('/api/newsletter', { email: `x${i}@example.com` });
  assert.equal(last.status, 429);
});
