'use strict';
/* Automatske rezervne kopije baze: jednom dnevno, čuva se poslednjih N (podrazumevano 14). */
const fs = require('node:fs');
const path = require('node:path');

function dir(dataDir) { const d = path.join(dataDir, 'backups'); fs.mkdirSync(d, { recursive: true }); return d; }
function list(dataDir) {
  const d = dir(dataDir);
  return fs.readdirSync(d).filter((f) => /^reset-[\d-]+T[\d-]+\.db$/.test(f)).sort().reverse()
    .map((f) => ({ name: f, size: fs.statSync(path.join(d, f)).size, created_at: fs.statSync(path.join(d, f)).mtime.toISOString() }));
}
function create(db, dataDir, keep = +(process.env.BACKUP_KEEP || 14)) {
  const name = `reset-${new Date().toISOString().replace(/:/g, '-').replace(/\.\d+Z$/, '')}.db`;
  const file = path.join(dir(dataDir), name);
  db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  for (const old of list(dataDir).slice(Math.max(1, keep))) fs.rmSync(path.join(dir(dataDir), old.name), { force: true });
  return name;
}
function filePath(dataDir, name) {
  if (!/^reset-[\d-]+T[\d-]+\.db$/.test(name)) return null;
  const f = path.join(dir(dataDir), name);
  return fs.existsSync(f) ? f : null;
}
function schedule(db, dataDir) {
  const run = () => {
    const latest = list(dataDir)[0];
    if (!latest || Date.now() - Date.parse(latest.created_at) > 23 * 3600e3) {
      try { console.log(new Date().toISOString(), 'rezervna kopija:', create(db, dataDir)); } catch (e) { console.error('rezervna kopija nije uspela:', e.message); }
    }
  };
  setTimeout(run, 10e3).unref();
  setInterval(run, 3600e3).unref();
}
module.exports = { list, create, filePath, schedule };
