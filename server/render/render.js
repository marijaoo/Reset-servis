'use strict';
/*
 * Generator stranica: od sadržaja (config/content.json ili baza) pravi sve .html stranice,
 * assets/site-data.js, robots.txt i sitemap.xml u zadatom folderu.
 * Sav tekst koji unese korisnik prolazi kroz esc(); jedini HTML koji nije escapovan su
 * ugrađeni crteži iz illus.json i fiksni delovi šablona.
 */
const fs = require('node:fs');
const path = require('node:path');
const ILL = require('./illus.json');

const ROOT = path.resolve(__dirname, '..', '..');
const ASSETS_SRC = path.join(ROOT, 'assets');

const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rsd = (n) => String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const tel = (n) => String(n || '').replace(/[^\d+]/g, '');
const hrs = (p) => (p && p[0] && p[1] ? `${p[0]}–${p[1]}` : 'zatvoreno');
const hshort = (p) => (p && p[0] && p[1] ? `${p[0].slice(0, 2).replace(/^0/, '')}–${p[1].slice(0, 2).replace(/^0/, '')} h` : 'zatvoreno');
const HEX = /^#[0-9a-fA-F]{6}$/;
const slugOk = (s) => /^[a-z0-9-]{2,60}$/.test(s || '');

const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const ARROW_UP_RIGHT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg>';
const CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
const SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
const SUN = '<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const MOON = '<svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
const MENU = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 8h16M4 16h16"/></svg>';
const CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const NAV = [['usluge.html', 'Usluge'], ['postupak.html', 'Postupak'], ['status.html', 'Status popravke'], ['pitanja.html', 'Pitanja'], ['kontakt.html', 'Kontakt']];
const STAGES = ['Primljen u servis', 'Dijagnostika', 'Procena poslata', 'Vi ste odobrili', 'U popravci', 'Testiranje', 'Spreman za preuzimanje', 'Preuzet'];
const ICON_KEYS = Object.keys(ILL.icons);
const PROBLEMS = ['Ne pali se', 'Greje se / buka', 'Ekran', 'Tastatura', 'Prosuta tečnost', 'Spor sistem', 'Punjenje', 'Drugo'];

const DEMO_ORDERS = {
  'RN-2026-0417': { device: 'Lenovo IdeaPad 5, 15,6"', issue: 'Gasi se pri opterećenju', diag: 'Pregrevanje, osušena termalna pasta', price: '3.500 RSD', eta: 'Danas do 17:00', stage: 4, times: ['Pon 09:42', 'Pon 13:10', 'Pon 13:25', 'Pon 14:02', 'Uto 10:15', '', '', ''] },
  'RN-2026-0388': { device: 'MacBook Air 13"', issue: 'Baterija traje 40 minuta', diag: 'Istrošena baterija, 1.100 ciklusa', price: '9.800 RSD', eta: 'Spreman, čeka vas', stage: 6, times: ['Čet 11:05', 'Čet 15:30', 'Čet 15:41', 'Pet 09:12', 'Pet 10:00', 'Pet 12:30', 'Pet 15:45', ''] },
  'RN-2026-0452': { device: 'ASUS TUF Gaming F15', issue: 'Ne pali se', diag: 'Neispravan konektor za punjenje', price: '7.900 RSD', eta: '2 dana od odobrenja', stage: 2, times: ['Uto 16:20', 'Sre 11:40', 'Sre 12:05', '', '', '', '', ''] }
};

/* Dopunjava sadržaj podrazumevanim vrednostima i čisti neispravne unose. */
function normalize(c) {
  const d = JSON.parse(JSON.stringify(c || {}));
  d.business = { name: 'Servis', legalName: '', pib: '', maticniBroj: '', warranty: '6 meseci', ...(d.business || {}) };
  d.contact = { street: '', postal: '', city: 'Beograd', phone: '', mobile: '', email: '', mapUrl: '', directions: '', ...(d.contact || {}) };
  d.hours = { weekdays: null, saturday: null, sunday: null, ...(d.hours || {}) };
  d.brand = { accent: '#0b6e8a', accentDark: '#4cb8d6', logo: '', mark: '', ...(d.brand || {}) };
  if (!HEX.test(d.brand.accent)) d.brand.accent = '#0b6e8a';
  if (!HEX.test(d.brand.accentDark)) d.brand.accentDark = '#4cb8d6';
  if (!d.brand.mark) d.brand.mark = (d.business.name.trim()[0] || 'S').toUpperCase() + '/';
  d.analytics = { plausibleDomain: '', ...(d.analytics || {}) };
  d.home = { heroTitle1: 'Vaš laptop.', heroAccent: 'Kao nov.', heroTitle2: 'Već sutra.', heroLead: 'Besplatna dijagnostika, tačna cena pre popravke i 6 meseci garancije. Većinu kvarova rešavamo za 24 do 72 sata, uz test pod opterećenjem pre nego što vam vratimo uređaj.', ...(d.home || {}) };
  d.services = (d.services || []).filter((s) => slugOk(s.slug) && s.title).map((s) => ({
    icon: 'laptop', short: '', long: '', time: '', symptoms: [], included: [], prices: [], related: [], tips: [], image: '', ...s,
    prices: (s.prices || []).filter((p) => p && p.name).map((p) => ({ name: p.name, min: Math.max(0, +p.min || 0), max: Math.max(+p.min || 0, +p.max || 0) }))
  }));
  const slugs = new Set(d.services.map((s) => s.slug));
  d.services.forEach((s) => { s.related = (s.related || []).filter((r) => r !== s.slug && slugs.has(r)); if (!ICON_KEYS.includes(s.icon)) s.icon = 'laptop'; });
  const safeImg = (u) => (/^\/uploads\/[\w.-]+\.(png|jpg|webp)$/.test(u || '') || /^https:\/\/[^\s"'<>]+$/.test(u || '') ? u : '');
  d.services.forEach((s) => { s.image = safeImg(s.image); });
  d.brand.logo = safeImg(d.brand.logo);
  d.brand.mark = String(d.brand.mark).slice(0, 3);
  d.steps = (d.steps || []).slice(0, 7);
  d.faq = (d.faq || []).map((g) => ({ group: g.group || '', items: (g.items || []).filter((x) => x && x.q) }));
  d.calc = d.calc || { devices: [], issues: [] };
  d.calc.devices = (d.calc.devices || []).filter((x) => x && x.key && x.label);
  d.calc.issues = (d.calc.issues || []).filter((x) => x && x.key && x.label);
  d.reviews = d.reviews || [];
  d.stats = d.stats || [];
  d.brands = d.brands || [];
  d.booking = { slotMinutes: 60, perSlot: 2, horizonDays: 14, minNoticeHours: 2, blockedDates: [], ...(d.booking || {}) };
  d.siteUrl = String(d.siteUrl || 'https://www.example.com').replace(/\/+$/, '');
  return d;
}

function renderSite(content, outDir, opts = {}) {
  const S = normalize(content);
  const DEMO = !!S.demo;
  const BIZ = S.business, C = S.contact, H = S.hours;
  const ADDRESS = [C.street, [C.postal, C.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const SERVICES = S.services;
  const BY_SLUG = Object.fromEntries(SERVICES.map((s) => [s.slug, s]));
  const href = (s) => `${s.slug}.html`;
  const low = (s) => (s.prices.length ? Math.min(...s.prices.map((p) => p.min)) : 0);
  const high = (s) => (s.prices.length ? Math.max(...s.prices.map((p) => p.max)) : 0);
  const priceFrom = (s) => (s.prices.length ? `od ${rsd(low(s))} RSD` : 'po dogovoru');
  const P = (label = 'probno') => (DEMO ? `<span class="probno">${label}</span>` : '');
  const W = esc(BIZ.warranty || '');
  const svcIllus = (s) => (s.image ? `<img src="${esc(s.image)}" alt="${esc(s.title)}" loading="lazy" style="width:100%;height:auto;border-radius:14px;display:block">` : ILL.service[s.icon] || ILL.service.laptop);
  const files = {};
  const STEPS = S.steps;

  const fontsAndStyle = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@300..700&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap">
<link rel="stylesheet" href="assets/style.css">`;
  const brandCss = `<style>:root{--accent:${S.brand.accent}}@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--accent:${S.brand.accentDark}}}:root[data-theme="dark"],.island{--accent:${S.brand.accentDark}}.loader{display:none}.show-loader .loader{display:grid;animation:loader-failsafe 0s linear 3s forwards}@keyframes loader-failsafe{to{visibility:hidden}}</style>`;
  const analytics = !DEMO && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(S.analytics.plausibleDomain || '') ? `<script defer data-domain="${esc(S.analytics.plausibleDomain)}" src="https://plausible.io/js/script.js"></script>` : '';

  function jsonld() {
    const oh = [];
    if (H.weekdays) oh.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: H.weekdays[0], closes: H.weekdays[1] });
    if (H.saturday) oh.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: 'Saturday', opens: H.saturday[0], closes: H.saturday[1] });
    if (H.sunday) oh.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: 'Sunday', opens: H.sunday[0], closes: H.sunday[1] });
    const d = { '@context': 'https://schema.org', '@type': 'ComputerStore', name: BIZ.name, url: S.siteUrl, telephone: C.phone, email: C.email,
      address: { '@type': 'PostalAddress', streetAddress: C.street, postalCode: C.postal, addressLocality: C.city, addressCountry: 'RS' }, openingHoursSpecification: oh };
    return JSON.stringify(d).replace(/</g, '\\u003c');
  }
  function head(title, desc, fname) {
    const url = S.siteUrl + '/' + (fname === 'index.html' ? '' : fname);
    const robots = DEMO || fname === '404.html' ? '<meta name="robots" content="noindex">' : '';
    return `<!doctype html>
<html lang="sr-Latn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website"><meta property="og:locale" content="sr_RS"><meta property="og:site_name" content="${esc(BIZ.name)}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(url)}"><meta property="og:image" content="${esc(S.siteUrl)}/assets/og.png">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
${robots}
<script type="application/ld+json">${jsonld()}</script>
<meta name="theme-color" content="${S.brand.accent}">
<script>(function(){var r=document.documentElement;try{var t=localStorage.getItem('rs-theme');if(t)r.setAttribute('data-theme',t);}catch(e){}try{if(!sessionStorage.getItem('rs-loaded')&&!matchMedia('(prefers-reduced-motion: reduce)').matches){r.classList.add('show-loader');sessionStorage.setItem('rs-loaded','1');}}catch(e){}})();</script>
${fontsAndStyle}
${brandCss}
${analytics}
</head>
<body>`;
  }
  const logoInner = S.brand.logo ? `<img src="${esc(S.brand.logo)}" alt="" style="height:32px;width:auto;border-radius:6px">` : `<span class="logo-mark">${esc(S.brand.mark)}</span>`;
  function mega() {
    const links = SERVICES.map((s) => `<a href="${href(s)}"><span class="mi">${ILL.icons[s.icon]}</span><strong>${esc(s.title)}</strong><span>${priceFrom(s)}${s.time ? ' · ' + esc(s.time) : ''}</span></a>`).join('');
    return `<div class="mega" role="menu">${links}<a class="mega-all" href="usluge.html"><span>Sve usluge i cenovnik</span>${ARROW}</a></div>`;
  }
  const DEMO_BAR = DEMO ? `<div class="demo-bar" role="note">
  <div class="wrap"><span class="tag">Demo</span> Ovo je probni sajt. Naziv, adresa, telefon, cene, ocene i recenzije su izmišljeni podaci za pregled.</div>
</div>` : '';
  function header(current) {
    const cur = (h) => (h === current ? ' aria-current="page"' : '');
    let items = `<div class="nav-item"><a href="usluge.html"${cur('usluge.html')}>Usluge ${CHEV}</a>${mega()}</div>`;
    items += NAV.slice(1).map(([h, l]) => `<a href="${h}"${cur(h)}>${l}</a>`).join('');
    const mm = [['index.html', 'Početna'], ...NAV].map(([h, l], i) => `<a href="${h}"${cur(h)} style="transition-delay:${120 + i * 60}ms"><small>0${i + 1}</small>${l}</a>`).join('');
    return `
<div class="loader" aria-hidden="true"><div class="loader-inner">${logoInner}<div class="loader-count" data-loader-count>0</div><div class="loader-line"><i data-loader-line></i></div></div></div>
<div class="progress-bar" aria-hidden="true"></div>
${DEMO_BAR}
<header class="site-header">
  <div class="wrap nav-row">
    <a class="logo" href="index.html" aria-label="${esc(BIZ.name)}, početna">${logoInner}${esc(BIZ.name)}</a>
    <nav class="nav" aria-label="Glavni meni">${items}</nav>
    <div class="nav-tools">
      <a class="status-link" href="kontakt.html"><span class="dot" data-open-dot></span><span data-open-text>Pon–Pet ${hshort(H.weekdays)}</span></a>
      <button class="search-btn" type="button" data-palette-open aria-label="Pretraži sajt">${SEARCH}<span class="label">Pretraga</span><kbd>Ctrl K</kbd></button>
      <button class="icon-btn theme-btn" type="button" data-theme-toggle aria-label="Promeni svetlu ili tamnu temu">${SUN}${MOON}</button>
      <a class="btn btn-primary btn-sm magnetic" href="kontakt.html">Prijavi kvar</a>
      <button class="icon-btn menu-btn" type="button" data-menu-open aria-label="Otvori meni" aria-expanded="false" aria-controls="mobilni-meni">${MENU}</button>
    </div>
  </div>
</header>
<div class="mobile-menu" id="mobilni-meni" aria-hidden="true">
  <div class="mm-top"><a class="logo" href="index.html">${logoInner}${esc(BIZ.name)}</a><button class="icon-btn" type="button" data-menu-close aria-label="Zatvori meni">${CLOSE}</button></div>
  <nav class="mm-links" aria-label="Mobilni meni">${mm}</nav>
  <div class="mm-foot"><a class="btn btn-primary" href="kontakt.html">Prijavi kvar ${ARROW}</a><span>${esc(C.phone)} ${P()}</span></div>
</div>
`;
  }
  function footer() {
    const svc = SERVICES.slice(0, 6).map((s) => `<li><a href="${href(s)}">${esc(s.title)}</a></li>`).join('');
    return `
<footer class="site-footer island">
  <div class="wrap">
    <div class="footer-top">
      <div class="newsletter">
        <h3>Saveti za duži život vašeg laptopa</h3>
        <p>Jednom mesečno: kako da čuvate bateriju, kada da očistite ventilator i šta da radite kad prospete kafu.</p>
        <form class="nl-row" data-demo-form novalidate><input id="nl-email" type="email" placeholder="vasa@adresa.rs" aria-label="Vaša e-pošta" autocomplete="email"><button class="btn btn-ghost" type="submit">Prijavi se</button></form>
        <p class="form-msg" tabindex="-1" hidden data-nl-msg></p>
      </div>
      <div class="footer-grid">
        <div><h3>Usluge</h3><ul>${svc}<li><a href="usluge.html">Sve usluge →</a></li></ul></div>
        <div><h3>Servis</h3><ul><li><a href="postupak.html">Postupak</a></li><li><a href="status.html">Status popravke</a></li><li><a href="pitanja.html">Česta pitanja</a></li><li><a href="kontakt.html">Zakazivanje</a></li><li><a href="privatnost.html">Privatnost</a></li></ul></div>
        <div><h3>Kontakt ${P()}</h3><ul><li>${esc(C.street)}</li><li>${esc(C.postal)} ${esc(C.city)}</li><li>${esc(C.phone)}</li><li>${esc(C.email)}</li></ul></div>
        <div><h3>Radno vreme ${P()}</h3><ul><li>Pon–Pet: ${hshort(H.weekdays)}</li><li>Subota: ${hshort(H.saturday)}</li><li>Nedelja: ${hshort(H.sunday)}</li></ul></div>
      </div>
    </div>
    <div class="wordmark" aria-hidden="true">${esc(BIZ.name)}</div>
    <div class="footer-bottom"><span>© <span id="godina">${new Date().getFullYear()}</span> ${esc(BIZ.legalName || BIZ.name)}${BIZ.pib ? ' · PIB ' + esc(BIZ.pib) : ''}${DEMO ? '. Demo sajt, svi podaci su probni.' : ''}</span><span><a href="privatnost.html">Politika privatnosti</a> · ${esc(C.city)}, Srbija</span></div>
  </div>
</footer>
<div class="action-bar"><a class="btn btn-ghost" href="kontakt.html">Kontakt</a><a class="btn btn-primary" href="kontakt.html#zakazivanje">Prijavi kvar</a></div>
<button class="to-top" type="button" aria-label="Vrati se na vrh stranice">
  <svg class="ring" viewBox="0 0 58 58" aria-hidden="true"><circle cx="29" cy="29" r="27"/></svg>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
</button>
<div class="cookie" hidden role="dialog" aria-label="Kolačići"><strong>Kolačići</strong><span>Sajt ne koristi kolačiće za praćenje. U vašem pregledaču pamti samo izbor teme i da ste videli ovu poruku. <a href="privatnost.html">Više</a></span><div class="btn-row"><button class="btn btn-primary btn-sm" type="button" data-cookie-ok>U redu</button></div></div>
<div class="palette" hidden role="dialog" aria-modal="true" aria-label="Pretraga sajta">
  <div class="palette-box">
    <div class="palette-search">${SEARCH}<input id="palette-input" type="text" placeholder="Pretražite usluge, pitanja, stranice..." autocomplete="off" aria-controls="palette-list"><span class="kbd">Esc</span></div>
    <ul class="palette-list" id="palette-list" role="listbox"></ul>
    <div class="palette-foot"><span>↑ ↓ izbor</span><span>Enter otvara</span><span>Esc zatvara</span></div>
  </div>
</div>
<div class="cursor" aria-hidden="true"></div>
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js"></script>
<script src="assets/site-data.js"></script>
<script src="assets/script.js"></script>
</body>
</html>
`;
  }
  const page = (fname, title, desc, body, nav) => { files[fname] = head(title, desc, fname) + header(nav || fname) + '<main>\n' + body + '\n</main>\n' + footer(); };
  const pagehead = (crumb, h1, lead, extra = '') => `<section class="wrap page-head">
  <p class="crumbs"><a href="index.html">Početna</a> / ${crumb}</p>
  <h1 class="split">${h1}</h1>
  <p class="lead">${lead}</p>${extra}
</section>`;
  const cta = (h = 'Opišite kvar. Javljamo vam procenu istog dana.', p = 'Pošaljite kratak opis problema i model uređaja, ili zakažite termin za dva minuta.', btn = 'Zakaži servis') => `<section class="section-tight">
  <div class="wrap"><div class="cta island"><p class="eyebrow">Spremni kad i vi</p><h2 class="split">${h}</h2><p class="lead">${p}</p><div class="btn-row"><a class="btn btn-primary magnetic" href="kontakt.html#zakazivanje">${btn} ${ARROW}</a><a class="btn btn-ghost" href="status.html">Proveri status popravke</a></div></div></div>
</section>`;
  const svcCard = (s) => `      <a class="card spot" href="${href(s)}"><div class="icon">${ILL.icons[s.icon]}</div><h3>${esc(s.title)}</h3><p>${esc(s.short)}</p><div class="meta"><span>${priceFrom(s)}</span><span>${esc(s.time)}</span></div><span class="more">Detaljnije →</span></a>`;
  const tile = (s, cls, big) => `      <a class="tile spot ${cls}" href="${href(s)}"><span class="arrow">${ARROW_UP_RIGHT}</span>${big ? '' : `<div class="tile-icon">${ILL.icons[s.icon]}</div>`}<h3>${esc(s.title)}</h3><p>${esc(big ? s.long : s.short)}</p>${big ? `<div class="tile-illus">${svcIllus(s)}</div>` : ''}<div class="tile-meta"><span>${s.prices.length ? `od <b>${rsd(low(s))} RSD</b>` : 'po dogovoru'}</span><span>${esc(s.time)}</span></div></a>`;

  const calcDev = S.calc.devices, calcIss = S.calc.issues;
  function calculator() {
    if (!calcDev.length || !calcIss.length) return '';
    const i0 = calcIss[0], d0 = calcDev[0];
    const svc0 = BY_SLUG[i0.service];
    const dev = calcDev.map((d, i) => `<label><input type="radio" name="calc-dev" value="${esc(d.key)}"${i === 0 ? ' checked' : ''}><span>${esc(d.label)}</span></label>`).join('');
    const opts = calcIss.map((x) => `<option value="${esc(x.key)}">${esc(x.label)}</option>`).join('');
    const r = (n) => Math.round((n * (+d0.factor || 1)) / 100) * 100;
    return `<div class="calc" id="kalkulator">
  <div class="calc-inner">
    <form class="calc-form" data-calc novalidate>
      <fieldset class="calc-group"><legend>1 · Uređaj</legend><div class="seg">${dev}</div></fieldset>
      <div class="calc-group"><label for="calc-issue">2 · Problem</label><select id="calc-issue" name="calc-issue">${opts}</select></div>
      <fieldset class="calc-group"><legend>3 · Brzina</legend><div class="seg"><label><input type="radio" name="calc-speed" value="std" checked><span>Standardno</span></label><label><input type="radio" name="calc-speed" value="fast"><span>Hitno, isti dan (+30%)</span></label></div></fieldset>
    </form>
    <div class="calc-out island" aria-live="polite">
      <div style="display:grid;gap:10px"><span class="eyebrow">Okvirna cena ${P()}</span>
      <div class="calc-price"><span data-calc-price>${rsd(r(i0.min))}–${rsd(r(i0.max))}</span><small>RSD</small></div></div>
      <div class="calc-lines"><div><span>Rok</span><b data-calc-time>${esc(i0.time)}</b></div><div><span>Dijagnostika</span><b>0 RSD uz popravku</b></div>${W ? `<div><span>Garancija</span><b>${W}</b></div>` : ''}</div>
      <div class="btn-row"><a class="btn btn-primary" href="kontakt.html#zakazivanje">Zakaži ${ARROW}</a><a class="btn btn-ghost" data-calc-link href="${svc0 ? href(svc0) : 'usluge.html'}">O usluzi</a></div>
    </div>
  </div>
</div>`;
  }
  const phaseStrip = () => `<div class="phases-scroll"><ol class="phases" aria-label="Faze servisiranja">${STEPS.map((st, i) => `<li><a class="phase" href="#korak-${i + 1}"><span class="phase-icon">${ILL.phaseIcons[i] || ''}</span><strong>${esc(st.short)}</strong><span>${esc(st.time)}</span></a></li>`).join('')}</ol></div>`;
  const compare = (cid) => `<div class="compare" data-compare>
  <div class="layer before">${ILL.fanDirty}</div>
  <div class="layer after">${ILL.fanClean}</div>
  <span class="cmp-label l">Pre · 96 °C</span><span class="cmp-label r">Posle · 71 °C</span>
  <input id="${cid}" type="range" min="0" max="100" value="50" aria-label="Pomerite da uporedite ventilator pre i posle čišćenja">
  <div class="handle"></div>
</div>`;
  function reviews() {
    const revs = S.reviews.filter((r) => r && r.text);
    if (!revs.length) return '';
    const tag = P('probna recenzija');
    const cards = revs.map((r) => `<figure class="review"><blockquote>„${esc(r.text)}“</blockquote><footer><span class="av">${esc(r.initials || '')}</span><div>${esc(r.name)}<span>${esc(r.place || '')}${tag ? ' · ' + tag : ''}</span></div></footer></figure>`).join('');
    const lead = DEMO ? 'Primeri recenzija za demo. Na pravom sajtu ovde bi bile stvarne ocene sa Google profila.' : 'Utisci naših klijenata.';
    return `<section class="section" style="padding-top:0"><div class="wrap"><div class="reviews">
  <div class="section-head head-split"><div style="display:grid;gap:18px"><p class="eyebrow">Utisci klijenata ${P()}</p><h2 class="split">Šta kažu ljudi kojima smo <span class="serif gold">vratili</span> laptop.</h2></div>
  <div style="display:grid;gap:16px;justify-items:start"><p class="lead">${lead}</p><div class="review-nav"><button class="icon-btn" type="button" data-rev="-1" aria-label="Prethodna recenzija"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg></button><button class="icon-btn" type="button" data-rev="1" aria-label="Sledeća recenzija">${ARROW}</button></div></div></div>
  <div class="review-track" data-reviews tabindex="0" aria-label="Recenzije">${cards}</div>
</div></div></section>`;
  }
  function trustRow() {
    const r = S.rating;
    if (!r || !r.value) return '';
    const av = S.reviews.slice(0, 3).map((x) => `<span>${esc(x.initials || '')}</span>`).join('');
    return `<div class="trust-row">${av ? `<span class="avatars" aria-hidden="true">${av}</span>` : ''}<span><span class="stars" aria-hidden="true">★★★★★</span> ${esc(r.value)} od 5${r.count ? ' · ' + esc(r.count) : ''} ${P()}</span></div>`;
  }
  function stats() {
    const st = S.stats.filter((x) => x && x.label);
    if (!st.length) return '';
    return `<section class="section-tight"><div class="wrap"><div class="stats">${st.map((x) => `<div class="stat"><strong><span data-count="${Math.round(+x.value || 0)}">${rsd(x.value)}</span><small>${esc(x.suffix || '')}</small></strong><span>${esc(x.label)} ${P()}</span></div>`).join('')}</div></div></section>`;
  }
  let qn = 0;
  const faqDetails = (items, start) => items.map((it, j) => `<details id="q-${start + j + 1}"><summary>${esc(it.q)}</summary><div class="answer"><p>${esc(it.a)}</p></div></details>`).join('');
  const allQ = S.faq.flatMap((g) => g.items);

  /* ================= POČETNA ================= */
  const story = STEPS.map((st, i) => `<li class="story-step${i === 0 ? ' active' : ''}" data-story="${i}"><span class="num">0${i + 1} — ${esc(st.time)}</span><h3>${esc(st.title)}</h3><p>${esc(st.text)}</p><ul>${(st.tags || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></li>`).join('');
  const frames = STEPS.map((st, i) => `<div class="frame${i === 0 ? ' active' : ''}" data-frame="${i}">${ILL.phase[i] || ''}</div>`).join('');
  const marq = S.brands.map((b) => `<span>${esc(b)}</span>`).join('');
  const big = SERVICES.find((s) => s.compare) || SERVICES[0];
  const rest = SERVICES.filter((s) => s !== big);
  const smallTiles = rest.slice(0, 4);
  const remaining = rest.length - smallTiles.length;
  const tileCls = ['t-b', 't-c', 't-d', 't-e'];
  const bento = SERVICES.length ? `<section class="section">
  <div class="wrap">
    <div class="section-head head-split">
      <div style="display:grid;gap:18px"><p class="eyebrow">Usluge</p><h2 class="split">Sve što vašem računaru treba, <span class="serif gold">na jednom mestu.</span></h2></div>
      <p class="lead">Kliknite na uslugu za detaljan opis, grafikon raspona cena i rokove.</p>
    </div>
    <div class="bento">
${tile(big, 't-a', true)}
${smallTiles.map((s, i) => tile(s, tileCls[i], false)).join('\n')}
      <a class="tile spot t-f t-all" href="usluge.html"><span class="arrow">${ARROW_UP_RIGHT}</span><p class="eyebrow">${remaining > 0 ? `Još ${remaining} ${remaining === 1 ? 'usluga' : remaining < 5 ? 'usluge' : 'usluga'}` : 'Cenovnik'}</p><h3>${remaining > 0 ? esc(rest.slice(4).map((s) => s.title).join(', ')) + '.' : 'Pogledajte sve usluge i cene.'}</h3><span class="link-arrow">Sve usluge ${ARROW}</span></a>
    </div>
  </div>
</section>` : '';
  const home = `
<section class="hero">
  <div class="aurora" aria-hidden="true"><span></span><span></span><span></span></div>
  <div class="grid-lines" aria-hidden="true"></div>
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <span class="pill"><span class="dot" data-open-dot></span><b data-open-text>Servis laptopova i računara</b><span>· ${esc(C.city)}</span></span>
      <h1 class="split">${esc(S.home.heroTitle1)} <span class="serif gold">${esc(S.home.heroAccent)}</span> ${esc(S.home.heroTitle2)}</h1>
      <p class="lead">${esc(S.home.heroLead)}</p>
      <div class="btn-row">
        <a class="btn btn-primary magnetic" href="kontakt.html#zakazivanje">Zakaži servis ${ARROW}</a>
        ${calculator() ? '<a class="btn btn-ghost magnetic" href="#kalkulator">Izračunaj cenu</a>' : '<a class="btn btn-ghost magnetic" href="usluge.html">Usluge i cene</a>'}
      </div>
      ${trustRow()}
    </div>
    <div class="console island" data-tilt>
      ${W ? `<span class="float-chip c2"><span class="dot"></span>Garancija ${W}</span>` : ''}
      <div class="console-inner">
        <div class="console-top"><div class="lights" aria-hidden="true"><i></i><i></i><i></i></div><span>Primer dijagnostike uživo</span><span class="probno" style="display:inline-block">ilustracija</span></div>
        <div class="console-chart"><div class="readout"><span>CPU temperatura</span><b data-temp>68 °C</b></div><span class="badge">● Stabilno</span><canvas data-chart role="img" aria-label="Grafikon temperature procesora tokom testa"></canvas></div>
        <div class="checks"><div>Napajanje <b>OK</b></div><div>SSD 512 GB <b>OK</b></div><div>RAM 16 GB <b>OK</b></div><div>Ventilator <b class="run" data-fan>1.850 o/min</b></div></div>
        <div><div class="console-top" style="margin-bottom:8px"><span>Stres test procesora i grafike</span><span data-pct>u toku</span></div><div class="console-bar"><i></i></div></div>
      </div>
      <span class="float-chip c1">✓ Procena pre popravke</span>
    </div>
  </div>
</section>
${marq ? `<section aria-label="Proizvođači">
  <p class="marquee-label">Popravljamo uređaje svih proizvođača</p>
  <div class="marquee"><div class="marquee-track">${marq}${marq}</div></div>
</section>` : ''}
${stats()}
${bento}
<section class="section" style="padding-top:0">
  <div class="wrap compare-wrap">
    <div style="display:grid;gap:22px">
      <p class="eyebrow">Pre i posle</p>
      <h2 class="split">Razlika se <span class="serif gold">vidi</span> i meri.</h2>
      <p class="lead">Povucite klizač. Prašina i osušena pasta mogu da podignu temperaturu procesora i za 25 °C. Posle čišćenja laptop je tiši, hladniji i brži.</p>
      <div class="temp-pair"><div class="hot"><span>Pre čišćenja</span><b>96 °C</b></div><div class="cool"><span>Posle čišćenja</span><b>71 °C</b></div></div>
      <p class="note">Primer merenja. Rezultat zavisi od modela i stanja uređaja.</p>
    </div>
    ${compare('cmp-home')}
  </div>
</section>
${STEPS.length ? `<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="section-head head-split">
      <div style="display:grid;gap:18px"><p class="eyebrow">Postupak</p><h2 class="split">Sedam faza. <span class="serif gold">Nijedno iznenađenje.</span></h2></div>
      <p class="lead">Skrolujte kroz ceo put vašeg uređaja, od prijave do preuzimanja.</p>
    </div>
    <div class="story">
      <div class="story-stage" aria-hidden="true">${frames}<span class="story-count"><b data-story-num>01</b> / 0${STEPS.length}</span><span class="story-bar"></span></div>
      <ol class="story-steps">${story}</ol>
    </div>
    <p class="note"><a class="link-arrow" href="postupak.html">Detaljan postupak servisiranja ${ARROW}</a></p>
  </div>
</section>` : ''}
${calculator() ? `<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="section-head head-split">
      <div style="display:grid;gap:18px"><p class="eyebrow">Kalkulator</p><h2 class="split">Koliko će koštati? <span class="serif gold">Izračunajte</span> za 10 sekundi.</h2></div>
      <p class="lead">Izaberite uređaj i problem. Tačnu cenu potvrđujemo posle besplatne dijagnostike, pre početka rada.</p>
    </div>
    ${calculator()}
  </div>
</section>` : ''}
${reviews()}
${allQ.length ? `<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="section-head head-split">
      <div style="display:grid;gap:18px"><p class="eyebrow">Česta pitanja</p><h2 class="split">Pre nego što <span class="serif gold">pitate.</span></h2></div>
      <a class="link-arrow" href="pitanja.html">Sva pitanja ${ARROW}</a>
    </div>
    <div class="faq-group">${faqDetails(allQ.slice(0, 5), 0)}</div>
  </div>
</section>` : ''}
${cta()}
`;
  page('index.html', BIZ.name, `Servis laptopova i računara, ${C.city}: dijagnostika, popravka, čišćenje i nadogradnja.`, home);

  /* ================= USLUGE ================= */
  const rows = SERVICES.flatMap((s) => s.prices.map((p) => `<tr><td><a href="${href(s)}"><strong>${esc(p.name)}</strong></a><br><span style="color:var(--muted);font-size:.88rem">${esc(s.title)}</span></td><td class="num">${rsd(p.min)}–${rsd(p.max)} RSD</td><td class="num">${esc(s.time)}</td></tr>`)).join('\n');
  const usl = pagehead('Usluge i cene', 'Usluge i <span class="serif gold">cene</span>', 'Kliknite na uslugu za opis, šta je uključeno i grafikon raspona cena.') + `
<section class="section-tight">
  <div class="wrap"><div class="cards">
${SERVICES.map(svcCard).join('\n')}
  </div></div>
</section>
${calculator() ? `<section class="section">
  <div class="wrap">
    <div class="section-head head-split"><div style="display:grid;gap:18px"><p class="eyebrow">Kalkulator</p><h2 class="split">Izračunajte <span class="serif gold">okvirnu</span> cenu.</h2></div><p class="lead">Tačnu cenu dobijate posle besplatne dijagnostike, pre nego što bilo šta popravimo.</p></div>
    ${calculator()}
  </div>
</section>` : ''}
${rows ? `<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="section-head"><p class="eyebrow">Cenovnik ${P('probne cene')}</p><h2 class="split">Kompletan cenovnik</h2><p class="lead">Cene su u dinarima sa PDV-om. Delovi se uvek prvo odobravaju sa vama.</p></div>
    <div class="table-wrap"><table><thead><tr><th>Usluga</th><th>Raspon cene</th><th>Rok</th></tr></thead><tbody>
${rows}</tbody></table></div>
    ${DEMO ? '<p class="note">Sve cene na ovom demo sajtu su izmišljene i služe samo za prikaz.</p>' : ''}
  </div>
</section>` : ''}
${cta('Ne vidite svoj kvar na listi?', 'Opišite problem, pa ćemo vam reći da li ga popravljamo i koliko bi okvirno koštalo.', 'Pošalji upit')}
`;
  page('usluge.html', 'Usluge i cene · ' + BIZ.name, 'Usluge servisa laptopova i računara i okvirne cene.', usl);

  /* ================= STRANICE USLUGA ================= */
  const niceStep = (mx) => { for (const st of [1000, 2000, 2500, 5000, 10000, 20000]) if (mx / st <= 5) return st; return 50000; };
  function rangeChart(prices) {
    if (!prices.length) return '';
    const mx = Math.max(1, ...prices.map((p) => p.max)), st = niceStep(mx), top = Math.ceil(mx / st) * st;
    const rowsH = prices.map((p) => {
      const l = (p.min / top) * 100, w = Math.max(((p.max - p.min) / top) * 100, 1.5);
      return `<div class="range-row"><div class="range-head"><strong>${esc(p.name)}</strong><span>${rsd(p.min)}–${rsd(p.max)} RSD</span></div><div class="range-track" style="--tick:${((st / top) * 100).toFixed(4)}%"><div class="range-seg" style="left:${l.toFixed(2)}%;width:${w.toFixed(2)}%"></div></div></div>`;
    }).join('\n');
    let ticks = '';
    for (let v = 0; v <= top; v += st) ticks += `<span style="left:${((v / top) * 100).toFixed(2)}%">${rsd(v)}</span>`;
    return `<div class="range-chart" role="group" aria-label="Raspon cena po vrsti usluge">\n${rowsH}<div class="range-axis" aria-hidden="true">${ticks}</div></div>`;
  }
  for (const s of SERVICES) {
    let extra = '';
    if (s.compare) extra += `<section class="section" style="padding-top:0"><div class="wrap compare-wrap"><div style="display:grid;gap:22px"><p class="eyebrow">Pre i posle ${P()}</p><h2 class="split">Povucite i <span class="serif gold">uporedite.</span></h2><p class="lead">Isti ventilator pre i posle čišćenja. Temperatura procesora pod opterećenjem pala je sa 96 na 71 °C.</p></div>${compare('cmp-svc')}</div></section>`;
    else if (s.beforeAfter && s.beforeAfter.label) {
      const b = s.beforeAfter, sc = +b.scale || Math.max(+b.before, +b.after) * 1.2 || 1;
      extra += `<section class="section" style="padding-top:0"><div class="wrap"><div class="section-head"><p class="eyebrow">Primer rezultata ${P()}</p><h2 class="split">${esc(b.label)}</h2></div><div class="ba"><div class="ba-row"><span>Pre</span><div class="ba-bar"><i class="before" style="width:${Math.min(100, (b.before / sc) * 100).toFixed(1)}%"></i></div><b>${esc(b.before)} ${esc(b.unit)}</b></div><div class="ba-row"><span>Posle</span><div class="ba-bar"><i class="after" style="width:${Math.min(100, (b.after / sc) * 100).toFixed(1)}%"></i></div><b>${esc(b.after)} ${esc(b.unit)}</b></div><p class="note">Primer merenja. Stvarni rezultat zavisi od modela i stanja uređaja.</p></div></div></section>`;
    }
    if (s.tips && s.tips.length) extra += `<section class="section" style="padding-top:0"><div class="wrap"><div class="tip"><p class="eyebrow">Hitno</p><h2>Prva pomoć: šta da uradite odmah</h2><ul class="check-list warn">${s.tips.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div></section>`;
    const rel = s.related.map((r) => svcCard(BY_SLUG[r])).join('\n');
    const lists = [s.symptoms.length ? `<div class="list-box"><h2>Kada vam je potrebna</h2><ul class="check-list warn">${s.symptoms.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '',
      s.included.length ? `<div class="list-box"><h2>Šta je uključeno</h2><ul class="check-list">${s.included.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''].join('');
    const body = `
<section class="hero" style="padding:0">
  <div class="aurora" aria-hidden="true"><span></span><span></span><span></span></div>
  <div class="wrap svc-hero">
    <div class="hero-copy">
      <p class="crumbs"><a href="index.html">Početna</a> / <a href="usluge.html">Usluge</a> / ${esc(s.title)}</p>
      <h1 class="split">${esc(s.title)}</h1>
      <p class="lead">${esc(s.long)}</p>
      <div class="svc-facts">${s.prices.length ? `<span class="chip">Cena <b>${rsd(low(s))}–${rsd(high(s))} RSD</b> ${P()}</span>` : ''}${s.time ? `<span class="chip">Rok <b>${esc(s.time)}</b></span>` : ''}${W ? `<span class="chip">Garancija <b>${W}</b></span>` : ''}</div>
      <div class="btn-row"><a class="btn btn-primary magnetic" href="kontakt.html#zakazivanje">Zakaži servis ${ARROW}</a>${s.prices.length ? '<a class="btn btn-ghost" href="#cene">Pogledaj cene</a>' : ''}</div>
    </div>
    <div class="illus-panel" data-tilt>${svcIllus(s)}</div>
  </div>
</section>
${lists ? `<section class="section"><div class="wrap two-col">${lists}</div></section>` : ''}
${s.prices.length ? `<section class="section" style="padding-top:0" id="cene">
  <div class="wrap">
    <div class="section-head head-split"><div style="display:grid;gap:18px"><p class="eyebrow">Raspon cena ${P('probne cene')}</p><h2 class="split">Koliko <span class="serif gold">košta</span></h2></div><p class="lead">Svaka traka pokazuje od koliko do koliko obično košta ta popravka. Tačnu cenu dobijate posle besplatne dijagnostike.</p></div>
    ${rangeChart(s.prices)}
    <p class="note">Cene su u dinarima sa PDV-om.${DEMO ? ' Na demo sajtu su izmišljene.' : ''}</p>
  </div>
</section>` : ''}
${extra}
${rel ? `<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="section-head"><p class="eyebrow">Povezane usluge</p><h2 class="split">Možda vam treba <span class="serif gold">i ovo</span></h2></div>
    <div class="cards">
${rel}
    </div>
  </div>
</section>` : ''}
${cta()}
`;
    page(href(s), `${s.title} · ${BIZ.name}`, s.short, body, 'usluge.html');
  }

  /* ================= POSTUPAK ================= */
  const stepsHtml = STEPS.map((st, i) => `<li class="step" id="korak-${i + 1}"><div class="step-body"><div class="step-text"><span class="step-time">${esc(st.time)}</span><h3>${esc(st.title)}</h3><p>${esc(st.text)}</p><ul>${(st.tags || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div><div class="step-illus">${ILL.phase[i] || ''}</div></div></li>`).join('\n');
  const post = pagehead('Postupak', 'Postupak <span class="serif gold">servisiranja</span>', 'Svaki uređaj prolazi iste faze. Tako u svakom trenutku znate šta se dešava sa vašim računarom i koliko će to trajati.') + `
<section class="section-tight"><div class="wrap">${phaseStrip()}</div></section>
<section class="section">
  <div class="wrap">
    <div class="steps-wrap">
      <div class="steps-track" aria-hidden="true"></div><div class="steps-fill" aria-hidden="true"></div>
      <ol class="steps">
${stepsHtml}      </ol>
    </div>
  </div>
</section>
<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="section-head"><p class="eyebrow">Pre nego što donesete uređaj</p><h2 class="split">Šta je dobro da <span class="serif gold">pripremite</span></h2></div>
    <div class="cards">
      <article class="card spot"><div class="icon">${ILL.icons.disk}</div><h3>Rezervna kopija</h3><p>Ako možete, sačuvajte važne fajlove na eksterni disk ili u oblak. Podatke čuvamo pažljivo, ali kopija je uvek sigurnija.</p></article>
      <article class="card spot"><div class="icon">${ILL.icons.bolt}</div><h3>Punjač</h3><p>Donesite originalni punjač. Mnogi kvarovi su zapravo u punjaču ili kablu.</p></article>
      <article class="card spot"><div class="icon">${ILL.icons.shield}</div><h3>Lozinka za prijavu</h3><p>Za testiranje sistema korisna je lozinka za Windows nalog. Nije obavezna za hardverske popravke.</p></article>
    </div>
  </div>
</section>
${cta()}
`;
  page('postupak.html', 'Postupak servisiranja · ' + BIZ.name, 'Kako izgleda servisiranje laptopa i računara, faza po faza.', post);

  /* ================= PITANJA ================= */
  let fq = '';
  for (const g of S.faq) { if (!g.items.length) continue; fq += `<div class="faq-group" data-faq-group><h2>${esc(g.group)}</h2>${faqDetails(g.items, qn)}</div>`; qn += g.items.length; }
  const pit = pagehead('Česta pitanja', 'Česta <span class="serif gold">pitanja</span>', 'Odgovori na pitanja koja nam klijenti najčešće postavljaju. Ako ne nađete svoje, pišite nam.') + `
<section class="section-tight">
  <div class="wrap" style="max-width:56rem">
    <div class="faq-tools"><div class="search-field">${SEARCH}<input id="faq-search" type="search" placeholder="Pretražite pitanja, npr. garancija" aria-label="Pretraga pitanja"></div></div>
    ${fq}
    <p class="faq-empty" data-faq-empty hidden>Nema pitanja za taj pojam. Pišite nam preko <a href="kontakt.html">kontakt stranice</a>.</p>
  </div>
</section>
${cta('Imate drugo pitanje?', 'Pozovite nas ili pošaljite poruku. Odgovaramo istog radnog dana.', 'Kontaktirajte nas')}
`;
  page('pitanja.html', 'Česta pitanja · ' + BIZ.name, 'Odgovori na najčešća pitanja o servisu laptopova i računara.', pit);

  /* ================= KONTAKT ================= */
  const devIcons = [ILL.icons.laptop, ILL.icons.bolt, ILL.icons.laptop, ILL.icons.pc];
  const devLabels = calcDev.length ? calcDev.map((d) => d.label) : ['Laptop', 'Desktop'];
  const devs = devLabels.map((l, i) => `<label class="choice"><input type="radio" name="wz-dev" value="${esc(l)}"${i === 0 ? ' checked' : ''}><span>${devIcons[i % devIcons.length]}${esc(l)}</span></label>`).join('');
  const probs = PROBLEMS.map((p) => `<label><input type="checkbox" name="wz-prob" value="${p}"><span>${p}</span></label>`).join('');
  const hoursRows = `<span data-day="1">Ponedeljak–petak</span><span data-day="1">${hrs(H.weekdays)}</span><span data-day="6">Subota</span><span data-day="6">${hrs(H.saturday)}</span><span data-day="0">Nedelja</span><span data-day="0">${hrs(H.sunday)}</span>`;
  const mobileRow = C.mobile ? `<li><span class="label">Viber / WhatsApp ${P()}</span><span class="value">${esc(C.mobile)} <button class="copy-btn" type="button" data-copy="${esc(tel(C.mobile))}">Kopiraj</button></span></li>` : '';
  const mapLink = /^https:\/\//.test(C.mapUrl || '') ? `<a class="link-arrow" href="${esc(C.mapUrl)}" target="_blank" rel="noopener">Otvori mapu ${ARROW}</a>` : '';
  const kon = pagehead('Kontakt', 'Zakažite. <span class="serif gold">Mi brinemo o ostalom.</span>', 'Donesite uređaj bez zakazivanja ili rezervišite termin u četiri kratka koraka.', `<span class="pill" style="justify-self:start"><span class="dot" data-open-dot></span><b data-open-text>Pon–Pet ${hshort(H.weekdays)}</b></span>`) + `
<section class="section-tight">
  <div class="wrap contact-grid">
    <div style="display:grid;gap:28px;align-content:start;min-width:0">
      <ul class="info-list">
        <li><span class="label">Adresa ${P()}</span><span class="value">${esc(ADDRESS)}</span></li>
        <li><span class="label">Telefon ${P()}</span><span class="value"><a href="tel:${esc(tel(C.phone))}">${esc(C.phone)}</a> <button class="copy-btn" type="button" data-copy="${esc(tel(C.phone))}">Kopiraj</button></span></li>
        ${mobileRow}
        <li><span class="label">E-pošta ${P()}</span><span class="value"><a href="mailto:${esc(C.email)}">${esc(C.email)}</a> <button class="copy-btn" type="button" data-copy="${esc(C.email)}">Kopiraj</button></span></li>
        <li><span class="label">Radno vreme ${P()}</span><div class="hours" data-hours>${hoursRows}</div></li>
      </ul>
      <div class="map-box"><div class="map-art">${ILL.map}</div><strong>Kako do nas</strong><p style="color:var(--muted)">${esc(C.directions)}</p>${mapLink}</div>
    </div>
    <form class="wizard" id="zakazivanje" data-wizard novalidate>
      <div class="wz-head"><h2 style="font-size:clamp(1.5rem,2.6vw,2rem)">Zakažite servis</h2><span data-wz-label>Korak 1 od 4</span></div>
      <div class="wz-progress" aria-hidden="true"><i class="on"></i><i></i><i></i><i></i></div>
      <div class="wz-step" data-step="1"><p class="lead">Koji uređaj donosite?</p><div class="choice-grid">${devs}</div><div class="field"><label for="wz-model">Proizvođač i model (ako znate)</label><input id="wz-model" maxlength="120" placeholder="npr. Lenovo IdeaPad 5"></div></div>
      <div class="wz-step" data-step="2" hidden><p class="lead">Šta se dešava? Izaberite sve što važi.</p><div class="seg">${probs}</div><div class="field"><label for="wz-opis">Kratak opis</label><textarea id="wz-opis" maxlength="2000" placeholder="Od kada, da li je bilo pada ili prosute tečnosti..."></textarea></div></div>
      <div class="wz-step" data-step="3" hidden><p class="lead">Kada vam odgovara da donesete uređaj?</p><div class="seg" data-days></div><div class="seg" data-times></div><p class="note" data-slot-note>Termin potvrđujemo pozivom ili porukom. Možete doći i bez zakazivanja.</p></div>
      <div class="wz-step" data-step="4" hidden><p class="lead">Kako da vas kontaktiramo?</p>
        <div class="field-row"><div class="field"><label for="wz-ime">Ime i prezime</label><input id="wz-ime" maxlength="100" autocomplete="name" placeholder="Petar Petrović"></div><div class="field"><label for="wz-tel">Telefon</label><input id="wz-tel" maxlength="30" type="tel" autocomplete="tel" placeholder="06x xxx xxxx"></div></div>
        <div class="field"><label for="wz-email">E-pošta (dobićete potvrdu i obaveštenja)</label><input id="wz-email" maxlength="150" type="email" autocomplete="email" placeholder="vasa@adresa.rs"></div>
        <div class="field" aria-hidden="true" style="position:absolute;left:-9999px"><label for="wz-web">Ne popunjavajte</label><input id="wz-web" tabindex="-1" autocomplete="off"></div>
        <label class="consent"><input type="checkbox" id="wz-consent"> <span>Saglasan/na sam da ${esc(BIZ.name)} koristi ove podatke da me kontaktira u vezi sa servisom. <a href="privatnost.html" target="_blank">Politika privatnosti</a></span></label>
        <p class="form-err" data-wz-err hidden></p><div class="summary-list" data-wz-summary></div></div>
      <div class="wz-step" data-step="5" hidden tabindex="-1" data-wz-done></div>
      <div class="wz-nav"><button class="btn btn-ghost" type="button" data-wz-prev hidden>Nazad</button><button class="btn btn-primary magnetic" type="button" data-wz-next style="margin-left:auto">Dalje ${ARROW}</button></div>
    </form>
  </div>
</section>
`;
  page('kontakt.html', `Kontakt · ${BIZ.name}`, 'Adresa, telefon, radno vreme i zakazivanje servisa.', kon);

  /* ================= STATUS ================= */
  const demoOrders = DEMO ? DEMO_ORDERS : {};
  const demoCodes = DEMO ? `<p class="note" style="margin:0">Primeri za demo:</p><div class="demo-codes">${Object.keys(demoOrders).map((c) => `<button type="button" data-code="${c}">${c}</button>`).join('')}</div>` : '';
  const sta = pagehead('Status popravke', 'Gde je moj <span class="serif gold">laptop?</span>', 'Upišite broj radnog naloga sa potvrde koju ste dobili pri predaji uređaja ili posle zakazivanja.') + `
<section class="section-tight">
  <div class="wrap tracker">
    <form class="track-form" data-track novalidate>
      <label for="track-code">Broj radnog naloga</label>
      <div class="track-row"><input id="track-code" value="${DEMO ? 'RN-2026-0417' : ''}" placeholder="npr. RN-2026-7KQ4M" autocomplete="off" maxlength="20"><button class="btn btn-primary" type="submit">Proveri ${ARROW}</button></div>
      <p class="form-err" data-track-err hidden></p>
      ${demoCodes}
    </form>
    <div class="track-result" data-track-result aria-live="polite"><div class="tr-top"><div style="display:grid;gap:8px"><span class="eyebrow">Status</span><h2>Upišite broj naloga</h2></div></div><p class="lead">Broj naloga je na potvrdi koju ste dobili pri predaji uređaja. Ako ga nemate, pozovite nas na ${esc(C.phone)}.</p></div>
  </div>
</section>
${cta('Uređaj još nije kod nas?', 'Zakažite termin ili ga donesite bez zakazivanja. Broj naloga dobijate odmah pri predaji.', 'Zakaži servis')}
`;
  page('status.html', `Status popravke · ${BIZ.name}`, 'Praćenje statusa popravke po broju radnog naloga.', sta);

  /* ================= PRIVATNOST ================= */
  const priv = pagehead('Politika privatnosti', 'Politika <span class="serif gold">privatnosti</span>', `Kako ${esc(BIZ.name)} prikuplja i koristi vaše podatke.`) + `
<section class="section-tight"><div class="wrap" style="max-width:52rem"><div class="list-box legal">
  ${DEMO ? '<p class="form-err">Ovo je šablon. Pre objavljivanja ga proverite i dopunite podacima o firmi (ili sa pravnikom).</p>' : ''}
  <h2>Rukovalac podacima</h2><p>${esc(BIZ.legalName || BIZ.name)}, ${esc(ADDRESS)}${BIZ.pib ? ', PIB ' + esc(BIZ.pib) : ''}${BIZ.maticniBroj ? ', MB ' + esc(BIZ.maticniBroj) : ''}. Kontakt: ${esc(C.email)}, ${esc(C.phone)}.</p>
  <h2>Koje podatke prikupljamo</h2><p>Kada zakažete servis: ime i prezime, telefon, e-poštu (ako je navedete), opis uređaja i kvara i željeni termin. Kada se prijavite za savete: adresu e-pošte. Ne prikupljamo podatke o plaćanju preko sajta.</p>
  <h2>Svrha i pravni osnov</h2><p>Podatke koristimo samo da bismo vas kontaktirali u vezi sa servisom, vodili radni nalog, slali obaveštenja o statusu popravke i prikazali status na sajtu. Osnov je vaš pristanak i izvršenje ugovora o servisu, u skladu sa Zakonom o zaštiti podataka o ličnosti Republike Srbije.</p>
  <h2>Ko obrađuje podatke</h2><p>Podaci se čuvaju na serveru našeg pružaoca usluge hostinga, a obaveštenja e-poštom šaljemo preko pružaoca usluge slanja e-pošte. Sa njima imamo ugovor o obradi podataka. Podatke ne prodajemo i ne delimo u marketinške svrhe.</p>
  <h2>Koliko čuvamo podatke</h2><p>Podatke o radnim nalozima čuvamo dok traje garantni rok i koliko propisi o računovodstvu zahtevaju. Adresu za savete čuvamo dok se ne odjavite.</p>
  <h2>Vaša prava</h2><p>Imate pravo na pristup, ispravku i brisanje podataka, kao i na povlačenje pristanka. Pišite nam na ${esc(C.email)}. Pritužbu možete podneti Povereniku za informacije od javnog značaja i zaštitu podataka o ličnosti.</p>
  <h2>Kolačići</h2><p>Sajt ne koristi kolačiće za praćenje ni oglase. U vašem pregledaču čuva samo izbor teme i podatak da ste videli obaveštenje.${analytics ? ' Posete merimo anonimno, bez kolačića i bez ličnih podataka.' : ''}</p>
  <h2>Status popravke</h2><p>Na stranici „Status popravke“ po broju naloga prikazujemo samo uređaj, kvar, cenu i fazu popravke, nikada vaše ime i kontakt.</p>
</div></div></section>
`;
  page('privatnost.html', `Politika privatnosti · ${BIZ.name}`, 'Kako prikupljamo i koristimo podatke.', priv);

  /* ================= 404 ================= */
  page('404.html', `Stranica nije pronađena · ${BIZ.name}`, 'Stranica nije pronađena.', pagehead('Stranica nije pronađena', 'Ova stranica <span class="serif gold">ne postoji.</span>', 'Možda je link pogrešan ili je stranica premeštena.', `<div class="btn-row"><a class="btn btn-primary" href="index.html">Na početnu ${ARROW}</a><a class="btn btn-ghost" href="usluge.html">Usluge</a></div>`));

  /* ================= SEO ================= */
  const forMap = ['index.html', 'usluge.html', 'postupak.html', 'status.html', 'pitanja.html', 'kontakt.html', 'privatnost.html', ...SERVICES.map(href)];
  files['sitemap.xml'] = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + forMap.map((f) => `  <url><loc>${esc(S.siteUrl)}/${f === 'index.html' ? '' : f}</loc></url>\n`).join('') + '</urlset>\n';
  files['robots.txt'] = DEMO ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nDisallow: /admin\nDisallow: /api/\nSitemap: ${S.siteUrl}/sitemap.xml\n`;

  /* ================= PODACI ZA JS ================= */
  const search = [{ t: 'Početna', d: `${BIZ.name}, ${C.city}`, u: 'index.html', k: 'Stranica' }]
    .concat(NAV.map(([h, l]) => ({ t: l, d: '', u: h, k: 'Stranica' })))
    .concat(SERVICES.map((s) => ({ t: s.title, d: s.short, u: href(s), k: 'Usluga' })))
    .concat(allQ.map((x, i) => ({ t: x.q, d: String(x.a || '').slice(0, 90), u: `pitanja.html#q-${i + 1}`, k: 'Pitanje' })))
    .concat(STEPS.map((st, i) => ({ t: st.title, d: String(st.text || '').slice(0, 90), u: `postupak.html#korak-${i + 1}`, k: 'Postupak' })));
  const site = {
    demo: DEMO, phone: C.phone,
    biz: { name: BIZ.name, legalName: BIZ.legalName, address: ADDRESS, phone: C.phone, email: C.email },
    hours: { 1: H.weekdays, 2: H.weekdays, 3: H.weekdays, 4: H.weekdays, 5: H.weekdays, 6: H.saturday, 0: H.sunday },
    booking: { slotMinutes: S.booking.slotMinutes, horizonDays: S.booking.horizonDays },
    stages: STAGES, search,
    calc: { devices: Object.fromEntries(calcDev.map((d) => [d.key, +d.factor || 1])), issues: Object.fromEntries(calcIss.map((x) => [x.key, [x.min, x.max, x.time, BY_SLUG[x.service] ? href(BY_SLUG[x.service]) : 'usluge.html']])) },
    demoOrders: demoOrders
  };
  files['assets/site-data.js'] = 'window.RS = ' + JSON.stringify(site).replace(/</g, '\\u003c') + ';\n';

  // Upis: prvo u privremeni folder, pa zamena, da posetioci nikad ne vide polovičan sajt
  if (outDir) {
    const tmp = outDir + '.tmp-' + process.pid + '-' + Date.now();
    fs.mkdirSync(path.join(tmp, 'assets'), { recursive: true });
    for (const f of fs.readdirSync(ASSETS_SRC)) if (f !== 'site-data.js') fs.copyFileSync(path.join(ASSETS_SRC, f), path.join(tmp, 'assets', f));
    for (const [f, data] of Object.entries(files)) fs.writeFileSync(path.join(tmp, f), data);
    const old = outDir + '.old-' + process.pid + '-' + Date.now();
    if (fs.existsSync(outDir)) fs.renameSync(outDir, old);
    fs.renameSync(tmp, outDir);
    if (fs.existsSync(old)) fs.rmSync(old, { recursive: true, force: true });
  }
  return { files: Object.keys(files), content: S };
}

module.exports = { renderSite, normalize, STAGES, ICON_KEYS, esc };

if (require.main === module) {
  const out = path.resolve(process.argv[2] || path.join(ROOT, 'public'));
  const content = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'content.json'), 'utf8'));
  const r = renderSite(content, out);
  console.log(`Napravljeno ${r.files.length} fajlova u ${out}`);
}
