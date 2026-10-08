'use strict';
const crypto = require('node:crypto');
const { now, audit } = require('./db');

const SESSION_HOURS = 12;
const ROLES = { owner: 'Vlasnik', reception: 'Recepcija', technician: 'Serviser' };
// Šta koja uloga sme
const PERMS = {
  'tickets.read': ['owner', 'reception', 'technician'],
  'tickets.create': ['owner', 'reception'],
  'tickets.editCustomer': ['owner', 'reception'],
  'tickets.editService': ['owner', 'reception', 'technician'],
  'tickets.delete': ['owner'],
  'subscribers.read': ['owner', 'reception'],
  'subscribers.delete': ['owner'],
  'export': ['owner'],
  'content': ['owner'],
  'users': ['owner'],
  'audit': ['owner'],
  'backups': ['owner'],
  'mail': ['owner']
};
const can = (user, perm) => !!user && (PERMS[perm] || []).includes(user.role);

function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(pw), salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$${salt.toString('base64')}$${hash.toString('base64')}`;
}
function verifyPassword(pw, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 4 || parts[0] !== 'scrypt') return false;
  const salt = Buffer.from(parts[2], 'base64'), expected = Buffer.from(parts[3], 'base64');
  const got = crypto.scryptSync(String(pw), salt, expected.length, { N: +parts[1], r: 8, p: 1 });
  return crypto.timingSafeEqual(got, expected);
}
const DUMMY_HASH = hashPassword(crypto.randomBytes(8).toString('hex'));
const tokenHash = (t) => crypto.createHash('sha256').update(t).digest('hex');

function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length < 10) return 'Lozinka mora imati bar 10 znakova.';
  if (pw.length > 200) return 'Lozinka je predugačka.';
  return '';
}

function bootstrapOwner(db, password) {
  const n = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (n > 0 || !password) return false;
  db.prepare('INSERT INTO users (username, name, role, pass_hash, created_at) VALUES (?, ?, ?, ?, ?)')
    .run('admin', 'Administrator', 'owner', hashPassword(password), now());
  return true;
}

function login(db, username, password, ip) {
  const u = db.prepare('SELECT * FROM users WHERE username = ?').get(String(username || '').trim());
  const ok = verifyPassword(password, u ? u.pass_hash : DUMMY_HASH) && u && u.active;
  if (!ok) { audit(db, null, 'login.failed', 'user', String(username || '').slice(0, 60), { ip }); return null; }
  const token = crypto.randomBytes(32).toString('base64url');
  const exp = new Date(Date.now() + SESSION_HOURS * 3600e3).toISOString();
  db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at, ip) VALUES (?, ?, ?, ?, ?)').run(tokenHash(token), u.id, now(), exp, ip || '');
  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(now(), u.id);
  audit(db, u, 'login', 'user', u.id, { ip });
  return { token, user: publicUser(u) };
}
function sessionUser(db, token) {
  if (!token || token.length > 100) return null;
  const r = db.prepare(`SELECT u.*, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`).get(tokenHash(token));
  if (!r || !r.active || r.expires_at < now()) return null;
  return publicUser(r);
}
function logout(db, token) { if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash(token)); }
function dropSessions(db, userId) { db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId); }
function cleanup(db) { db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now()); }
const publicUser = (u) => ({ id: u.id, username: u.username, name: u.name, role: u.role, active: !!u.active, created_at: u.created_at, last_login: u.last_login });

module.exports = { ROLES, PERMS, can, hashPassword, verifyPassword, passwordProblem, bootstrapOwner, login, sessionUser, logout, dropSessions, cleanup, publicUser, SESSION_HOURS };
