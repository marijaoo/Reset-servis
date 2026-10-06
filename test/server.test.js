'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'rs-test-'));
process.env.ADMIN_PASSWORD = 'tajna-lozinka';
const { server, db } = require('../server/server.js');
let base;
test.before(() => new Promise((r) => server.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); })));
test.after(() => new Promise((r) => server.close(() => { db.close(); r(); })));

const post = (p, body, headers = {}) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
const booking = { device: 'Laptop', model: 'Lenovo IdeaPad 5', problems: ['Greje se / buka'], description: 'Gasi se', day: '2030-01-15', time: '10:00', name: 'Petar Petrović', phone: '060 123 4567', email: 'petar@example.com', consent: true };

test('stranice se služe, a privatni fajlovi ne', async () => {
  for (const p of ['/', '/usluge.html', '/status', '/assets/style.css', '/robots.txt', '/admin']) {
    const r = await fetch(base + p); assert.equal(r.status, 200, p);
  }
  for (const p of ['/server/server.js', '/config/site.json', '/tools/build.py', '/data/reset.db', '/../etc/passwd', '/package.json']) {
    const r = await fetch(base + p); assert.equal(r.status, 404, p);
  }
  const r = await fetch(base + '/'); assert.match(r.headers.get('content-security-policy'), /default-src 'self'/);
});

let code;
test('zakazivanje: provera podataka i dobijanje broja naloga', async () => {
  let r = await post('/api/bookings', { ...booking, name: '' }); assert.equal(r.status, 400);
  r = await post('/api/bookings', { ...booking, consent: false }); assert.equal(r.status, 400);
  r = await post('/api/bookings', { ...booking, email: 'nije-email' }); assert.equal(r.status, 400);
  r = await post('/api/bookings', booking); assert.equal(r.status, 201);
  code = (await r.json()).code;
  assert.match(code, /^RN-\d{4}-[A-Z0-9]{5}$/);
});

test('javni status ne otkriva ime ni telefon', async () => {
  const r = await fetch(base + '/api/orders/' + code); assert.equal(r.status, 200);
  const { order } = await r.json();
  assert.equal(order.stage, -1);
  assert.equal(order.device, 'Laptop, Lenovo IdeaPad 5');
  assert.equal(order.slot, '15.01.2030. 10:00');
  const txt = JSON.stringify(order); assert.ok(!txt.includes('Petar') && !txt.includes('123'));
  assert.equal((await fetch(base + '/api/orders/RN-2030-XXXXX')).status, 404);
});

test('panel: bez prijave nema pristupa, pogrešna lozinka se odbija', async () => {
  assert.equal((await fetch(base + '/api/admin/tickets')).status, 401);
  assert.equal((await post('/api/admin/login', { password: 'pogresna' })).status, 401);
});

test('panel: prijava, izmena faze i vreme faza', async () => {
  const lr = await post('/api/admin/login', { password: 'tajna-lozinka' }); assert.equal(lr.status, 200);
  const cookie = lr.headers.get('set-cookie').split(';')[0];
  const H = { Cookie: cookie, 'X-RS-Admin': '1', 'Content-Type': 'application/json' };
  let r = await fetch(base + '/api/admin/tickets?stage=active', { headers: { Cookie: cookie } });
  const list = (await r.json()).tickets; assert.ok(list.some((t) => t.code === code && t.name === 'Petar Petrović'));
  // bez zaštitnog zaglavlja izmena se odbija
  r = await fetch(base + '/api/admin/tickets/' + code, { method: 'PATCH', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: '{"stage":0}' });
  assert.equal(r.status, 403);
  r = await fetch(base + '/api/admin/tickets/' + code, { method: 'PATCH', headers: H, body: JSON.stringify({ stage: 4, diag: 'Osušena pasta', price: '3.500 RSD', eta: 'Sutra' }) });
  assert.equal(r.status, 200);
  const t = (await r.json()).ticket; assert.equal(t.stage, 4); assert.ok(t.times[0] && t.times[4] && !t.times[5]);
  const pub = (await (await fetch(base + '/api/orders/' + code)).json()).order;
  assert.equal(pub.diag, 'Osušena pasta'); assert.equal(pub.stage, 4);
  // novi nalog sa šaltera
  r = await fetch(base + '/api/admin/tickets', { method: 'POST', headers: H, body: JSON.stringify({ name: 'Ana', phone: '061', device: 'MacBook' }) });
  assert.equal(r.status, 201); const nt = (await r.json()).ticket; assert.equal(nt.stage, 0); assert.ok(nt.times[0]);
  // izvoz i brisanje
  r = await fetch(base + '/api/admin/export.csv', { headers: { Cookie: cookie } }); assert.equal(r.status, 200); assert.match(await r.text(), /Petar/);
  r = await fetch(base + '/api/admin/tickets/' + nt.code, { method: 'DELETE', headers: H }); assert.equal(r.status, 200);
  // lažni kolačić ne prolazi
  r = await fetch(base + '/api/admin/tickets', { headers: { Cookie: 'rs_admin=admin.9999999999999.lazno' } }); assert.equal(r.status, 401);
});

test('prijava za savete i ograničenje broja zahteva', async () => {
  assert.equal((await post('/api/newsletter', { email: 'loše' })).status, 400);
  assert.equal((await post('/api/newsletter', { email: 'ana@example.com' })).status, 201);
  assert.equal((await post('/api/newsletter', { email: 'ana@example.com' })).status, 201);
  let last;
  for (let i = 0; i < 6; i++) last = await post('/api/newsletter', { email: `x${i}@example.com` });
  assert.equal(last.status, 429);
});
