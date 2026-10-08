'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const STAGES = 8; // 0 primljen … 6 spreman, 7 preuzet; -1 = zakazan termin (uređaj još nije predat)
const now = () => new Date().toISOString();
const parseJSON = (s, d) => { try { return JSON.parse(s); } catch { return d; } };

function open(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, 'reset.db'));
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
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
    CREATE INDEX IF NOT EXISTS tickets_slot ON tickets(slot_day, slot_time);
    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL CHECK (role IN ('owner', 'reception', 'technician')),
      pass_hash TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      last_login TEXT
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      ip TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      at TEXT NOT NULL,
      user_id INTEGER,
      user_name TEXT NOT NULL DEFAULT '',
      action TEXT NOT NULL,
      entity TEXT NOT NULL DEFAULT '',
      entity_id TEXT NOT NULL DEFAULT '',
      details TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS audit_entity ON audit(entity, entity_id);
    CREATE TABLE IF NOT EXISTS content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      user_name TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT '',
      ticket_code TEXT NOT NULL DEFAULT '',
      to_addr TEXT NOT NULL,
      subject TEXT NOT NULL,
      body_text TEXT NOT NULL,
      body_html TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      next_attempt_at TEXT NOT NULL,
      last_error TEXT NOT NULL DEFAULT '',
      sent_at TEXT
    );
    CREATE INDEX IF NOT EXISTS outbox_status ON outbox(status, next_attempt_at);
  `);
  return db;
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newCode(db) {
  for (;;) {
    let s = '';
    for (let i = 0; i < 5; i++) s += ALPHABET[crypto.randomInt(ALPHABET.length)];
    const code = `RN-${new Date().getFullYear()}-${s}`;
    if (!db.prepare('SELECT 1 FROM tickets WHERE code = ?').get(code)) return code;
  }
}
function rowToTicket(r) {
  if (!r) return null;
  return { ...r, problems: parseJSON(r.problems, []), times: parseJSON(r.times, []) };
}
function stampTimes(times, newStage) {
  const t = Array.from({ length: STAGES }, (_, i) => times[i] || null);
  if (newStage < 0) return t.map(() => null);
  for (let i = 0; i < STAGES; i++) {
    if (i <= newStage && !t[i]) t[i] = now();
    if (i > newStage) t[i] = null;
  }
  return t;
}
function audit(db, user, action, entity, entityId, details) {
  db.prepare('INSERT INTO audit (at, user_id, user_name, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(now(), user ? user.id : null, user ? (user.name || user.username) : 'sajt', action, entity || '', String(entityId || ''), details ? JSON.stringify(details) : '');
}

module.exports = { open, newCode, rowToTicket, stampTimes, audit, now, parseJSON, STAGES };
