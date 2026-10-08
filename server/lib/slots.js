'use strict';
/* Slobodni termini za zakazivanje, po beogradskom vremenu, uz kapacitet po terminu i neradne dane. */
const TZ = 'Europe/Belgrade';
const DAYS = ['Ned', 'Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub'];
const pad = (n) => String(n).padStart(2, '0');
const toMin = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); };
const fromMin = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

// Trenutni datum i minut u Beogradu
function belgradeNow(date = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(date).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: (+p.hour % 24) * 60 + +p.minute };
}
function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const dow = (iso) => new Date(iso + 'T12:00:00Z').getUTCDay();
function hoursFor(content, iso) {
  const H = content.hours || {}, d = dow(iso);
  const pair = d === 0 ? H.sunday : d === 6 ? H.saturday : H.weekdays;
  return pair && pair[0] && pair[1] ? [toMin(pair[0]), toMin(pair[1])] : null;
}

function availability(db, content, date = new Date()) {
  const b = content.booking || {};
  const step = Math.max(15, Math.min(240, +b.slotMinutes || 60));
  const per = Math.max(1, Math.min(50, +b.perSlot || 1));
  const horizon = Math.max(1, Math.min(60, +b.horizonDays || 14));
  const notice = Math.max(0, +b.minNoticeHours || 0) * 60;
  const blocked = new Set((b.blockedDates || []).map((x) => String(x).trim()));
  const nowB = belgradeNow(date);
  const last = addDays(nowB.date, horizon);
  const taken = {};
  for (const r of db.prepare("SELECT slot_day, slot_time, COUNT(*) AS n FROM tickets WHERE slot_day BETWEEN ? AND ? AND stage < 7 GROUP BY slot_day, slot_time").all(nowB.date, last)) taken[`${r.slot_day} ${r.slot_time}`] = r.n;
  const days = [];
  for (let i = 0; i <= horizon; i++) {
    const iso = addDays(nowB.date, i);
    if (blocked.has(iso)) continue;
    const h = hoursFor(content, iso);
    if (!h) continue;
    const times = [];
    for (let m = h[0]; m + step <= h[1]; m += step) {
      if (i === 0 && m < nowB.minutes + notice) continue;
      if (i > 0 && i * 1440 + m - nowB.minutes < notice) continue;
      const t = fromMin(m), free = per - (taken[`${iso} ${t}`] || 0);
      if (free > 0) times.push({ t, free });
    }
    if (times.length) days.push({ date: iso, label: `${DAYS[dow(iso)]} ${+iso.slice(8)}.${+iso.slice(5, 7)}.`, times });
  }
  return days;
}
function isFree(db, content, day, time) {
  const d = availability(db, content).find((x) => x.date === day);
  return !!(d && d.times.some((x) => x.t === time));
}
module.exports = { availability, isFree, belgradeNow };
