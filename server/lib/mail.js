'use strict';
/*
 * Slanje e-pošte preko SMTP-a (bez spoljnih biblioteka) i red poruka (outbox) sa ponovnim pokušajima.
 * Podešavanje: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE (ssl | starttls | none), MAIL_FROM.
 */
const net = require('node:net');
const tls = require('node:tls');
const os = require('node:os');
const crypto = require('node:crypto');
const { now } = require('./db');

function config() {
  const port = +(process.env.SMTP_PORT || 587);
  return {
    host: process.env.SMTP_HOST || '',
    port,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    secure: process.env.SMTP_SECURE || (port === 465 ? 'ssl' : 'starttls'),
    from: process.env.MAIL_FROM || process.env.SMTP_USER || ''
  };
}
const enabled = () => { const c = config(); return !!(c.host && c.from); };

/* ---------- MIME ---------- */
const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
const wrap76 = (s) => s.replace(/.{1,76}/g, '$&\r\n').trimEnd();
const encHeader = (s) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`);
function encAddress(a) {
  const m = String(a).match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? `${encHeader(m[1].replace(/"/g, ''))} <${m[2]}>` : String(a).trim();
}
const bareAddress = (a) => { const m = String(a).match(/<([^>]+)>/); return (m ? m[1] : String(a)).trim(); };
function buildMessage({ from, to, subject, text, html, replyTo }) {
  const boundary = 'b' + crypto.randomBytes(12).toString('hex');
  const domain = bareAddress(from).split('@')[1] || 'localhost';
  const headers = [
    `From: ${encAddress(from)}`, `To: ${encAddress(to)}`, `Subject: ${encHeader(subject)}`,
    `Date: ${new Date().toUTCString().replace('GMT', '+0000')}`, `Message-ID: <${crypto.randomBytes(16).toString('hex')}@${domain}>`,
    'MIME-Version: 1.0'
  ];
  if (replyTo) headers.push(`Reply-To: ${encAddress(replyTo)}`);
  if (!html) return headers.concat(['Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', wrap76(b64(text))]).join('\r\n');
  return headers.concat([
    `Content-Type: multipart/alternative; boundary="${boundary}"`, '',
    `--${boundary}`, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', wrap76(b64(text)),
    `--${boundary}`, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', wrap76(b64(html)),
    `--${boundary}--`, ''
  ]).join('\r\n');
}

/* ---------- SMTP klijent ---------- */
function smtpSend(cfg, envelope, message, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    let sock, buf = '', waiter = null, done = false;
    const fail = (e) => { if (done) return; done = true; try { sock && sock.destroy(); } catch {} reject(e instanceof Error ? e : new Error(String(e))); };
    const timer = setTimeout(() => fail(new Error('SMTP: isteklo vreme')), timeoutMs);
    const onData = (d) => {
      buf += d.toString('utf8');
      const lines = buf.split('\r\n');
      for (let i = 0; i < lines.length - 1; i++) {
        if (/^\d{3} /.test(lines[i])) {
          const resp = lines.slice(0, i + 1).join('\n');
          buf = lines.slice(i + 1).join('\r\n');
          const w = waiter; waiter = null;
          if (w) w(resp);
          return onData(Buffer.alloc(0));
        }
      }
    };
    const read = () => new Promise((r) => { waiter = r; });
    const cmd = async (line, expect) => {
      if (line !== null) sock.write(line + '\r\n');
      const resp = await read();
      const code = +resp.slice(0, 3);
      if (!expect.includes(code)) throw new Error(`SMTP ${line ? line.split(' ')[0] : 'pozdrav'}: ${resp.replace(/\s+/g, ' ').slice(0, 200)}`);
      return resp;
    };
    const attach = (s) => { sock = s; s.on('data', onData); s.on('error', fail); s.on('close', () => { if (!done) fail(new Error('SMTP: veza prekinuta')); }); };
    const opts = { host: cfg.host, port: cfg.port, servername: cfg.host };
    attach(cfg.secure === 'ssl' ? tls.connect(opts) : net.connect(opts));
    (async () => {
      await cmd(null, [220]);
      const helo = os.hostname().replace(/[^a-zA-Z0-9.-]/g, '') || 'localhost';
      let ehlo = await cmd(`EHLO ${helo}`, [250]);
      if (cfg.secure === 'starttls') {
        if (!/STARTTLS/i.test(ehlo)) throw new Error('SMTP server ne podržava STARTTLS');
        await cmd('STARTTLS', [220]);
        sock.removeAllListeners('data'); sock.removeAllListeners('close'); sock.removeAllListeners('error');
        await new Promise((res, rej) => { const t = tls.connect({ socket: sock, servername: cfg.host }, res); t.on('error', rej); attach(t); });
        ehlo = await cmd(`EHLO ${helo}`, [250]);
      }
      if (cfg.user) await cmd(`AUTH PLAIN ${Buffer.from(`\0${cfg.user}\0${cfg.pass}`).toString('base64')}`, [235]);
      await cmd(`MAIL FROM:<${envelope.from}>`, [250]);
      await cmd(`RCPT TO:<${envelope.to}>`, [250, 251]);
      await cmd('DATA', [354]);
      const body = message.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..');
      await cmd(body + '\r\n.', [250]);
      try { sock.write('QUIT\r\n'); } catch {}
      done = true; clearTimeout(timer); sock.end(); resolve();
    })().catch((e) => { clearTimeout(timer); fail(e); });
  });
}

/* ---------- Šabloni poruka ---------- */
const escH = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function layout(biz, title, paragraphs, button) {
  const text = [title, '', ...paragraphs.map((p) => (Array.isArray(p) ? p.join('\n') : p)), button ? `\n${button.label}: ${button.url}` : '', '', '—', biz.name, [biz.phone, biz.email].filter(Boolean).join(' · ')].join('\n');
  const ps = paragraphs.map((p) => Array.isArray(p)
    ? `<table role="presentation" style="width:100%;border-collapse:collapse;margin:8px 0 16px">${p.map((row) => { const [k, ...v] = row.split(': '); return `<tr><td style="padding:6px 0;color:#56636f;border-bottom:1px solid #e3e8ed;width:40%">${escH(k)}</td><td style="padding:6px 0;border-bottom:1px solid #e3e8ed"><b>${escH(v.join(': '))}</b></td></tr>`; }).join('')}</table>`
    : `<p style="margin:0 0 14px;line-height:1.6">${escH(p)}</p>`).join('');
  const btn = button ? `<p style="margin:22px 0"><a href="${escH(button.url)}" style="background:#0b6e8a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;display:inline-block;font-weight:600">${escH(button.label)}</a></p>` : '';
  const html = `<!doctype html><html lang="sr"><body style="margin:0;background:#edf2f6;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#0f1d2a"><div style="max-width:560px;margin:0 auto;padding:28px 18px"><div style="background:#fff;border-radius:16px;padding:28px;border:1px solid #d8e1e9"><p style="margin:0 0 18px;font-weight:700;font-size:17px">${escH(biz.name)}</p><h1 style="font-size:22px;margin:0 0 16px">${escH(title)}</h1>${ps}${btn}</div><p style="font-size:12px;color:#56636f;margin:14px 6px">${escH([biz.address, biz.phone, biz.email].filter(Boolean).join(' · '))}</p></div></body></html>`;
  return { text, html };
}
function templates(kind, t, biz, siteUrl) {
  const statusUrl = `${siteUrl}/status.html#${t.code}`;
  const slot = t.slot_day ? `${t.slot_day.split('-').reverse().join('.')}. u ${t.slot_time}` : 'bez termina';
  const device = [t.device, t.model].filter(Boolean).join(', ');
  if (kind === 'booking.customer') return { subject: `Zahtev primljen: ${t.code}`, ...layout(biz, 'Hvala, primili smo vaš zahtev', [
    `Poštovani/a ${t.name.split(' ')[0]}, javićemo vam se da potvrdimo termin.`,
    [`Broj naloga: ${t.code}`, `Uređaj: ${device || '—'}`, `Termin: ${slot}`],
    'Sačuvajte broj naloga. Sa njim na sajtu pratite svaku fazu popravke.'
  ], { label: 'Pratite status', url: statusUrl }) };
  if (kind === 'booking.staff') return { subject: `Novo zakazivanje ${t.code}: ${t.name}`, ...layout(biz, 'Novo zakazivanje sa sajta', [
    [`Broj naloga: ${t.code}`, `Klijent: ${t.name}`, `Telefon: ${t.phone}`, `E-pošta: ${t.email || '—'}`, `Uređaj: ${device || '—'}`, `Problem: ${(t.problems || []).join(', ') || '—'}`, `Termin: ${slot}`],
    t.description ? `Opis: ${t.description}` : 'Klijent nije ostavio opis.'
  ], { label: 'Otvori panel', url: `${siteUrl}/admin` }) };
  if (kind === 'stage.estimate') return { subject: `Procena popravke: ${t.code}`, ...layout(biz, 'Dijagnostika je završena', [
    'Pregledali smo vaš uređaj. Pre nego što počnemo popravku, potrebno je vaše odobrenje.',
    [`Broj naloga: ${t.code}`, `Uređaj: ${device || '—'}`, `Dijagnoza: ${t.diag || '—'}`, `Cena: ${t.price || 'javićemo telefonom'}`, ...(t.eta ? [`Rok: ${t.eta}`] : [])],
    `Odgovorite na ovu poruku ili nas pozovite${biz.phone ? ' na ' + biz.phone : ''} da odobrite popravku.`
  ], { label: 'Pogledajte status', url: statusUrl }) };
  if (kind === 'stage.ready') return { subject: `Vaš uređaj je spreman: ${t.code}`, ...layout(biz, 'Uređaj je spreman za preuzimanje', [
    'Popravka je završena i uređaj je prošao testiranje.',
    [`Broj naloga: ${t.code}`, `Uređaj: ${device || '—'}`, ...(t.price ? [`Za plaćanje: ${t.price}`] : [])],
    `Možete ga preuzeti u radno vreme${biz.address ? ' na adresi ' + biz.address : ''}. Ponesite potvrdu o prijemu ili ličnu kartu.`
  ], { label: 'Pogledajte status', url: statusUrl }) };
  if (kind === 'test') return { subject: 'Probna poruka', ...layout(biz, 'Slanje e-pošte radi', ['Ako čitate ovu poruku, podešavanje slanja e-pošte je ispravno.']) };
  return null;
}

/* ---------- Red poruka ---------- */
function enqueue(db, kind, to, ticket, biz, siteUrl) {
  if (!to || !enabled()) return false;
  const tpl = templates(kind, ticket || {}, biz, siteUrl);
  if (!tpl) return false;
  db.prepare('INSERT INTO outbox (created_at, kind, ticket_code, to_addr, subject, body_text, body_html, next_attempt_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(now(), kind, ticket ? ticket.code || '' : '', to, tpl.subject, tpl.text, tpl.html, now());
  setImmediate(() => processQueue(db).catch(() => {}));
  return true;
}
let running = false;
async function processQueue(db) {
  if (running || !enabled()) return;
  running = true;
  try {
    const cfg = config();
    const rows = db.prepare("SELECT * FROM outbox WHERE status = 'pending' AND next_attempt_at <= ? ORDER BY id LIMIT 20").all(now());
    for (const m of rows) {
      try {
        const msg = buildMessage({ from: cfg.from, to: m.to_addr, subject: m.subject, text: m.body_text, html: m.body_html, replyTo: process.env.MAIL_REPLY_TO || '' });
        await smtpSend(cfg, { from: bareAddress(cfg.from), to: bareAddress(m.to_addr) }, msg);
        db.prepare("UPDATE outbox SET status = 'sent', sent_at = ?, attempts = attempts + 1, last_error = '' WHERE id = ?").run(now(), m.id);
      } catch (e) {
        const attempts = m.attempts + 1;
        const next = new Date(Date.now() + Math.min(60, 2 ** attempts) * 60e3).toISOString();
        db.prepare('UPDATE outbox SET attempts = ?, last_error = ?, status = ?, next_attempt_at = ? WHERE id = ?')
          .run(attempts, String(e.message).slice(0, 300), attempts >= 6 ? 'failed' : 'pending', next, m.id);
        console.error(new Date().toISOString(), 'mail:', e.message);
      }
    }
  } finally { running = false; }
}

module.exports = { config, enabled, enqueue, processQueue, smtpSend, buildMessage, templates };
