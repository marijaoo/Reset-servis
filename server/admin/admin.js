(function () {
  'use strict';
  var RS = window.RS || {};
  var STAGE_NAMES = ['Zakazan termin'].concat(RS.stages || []); // indeks 0 ovde = faza -1
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var el = function (tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'on') Object.keys(attrs.on).forEach(function (ev) { e.addEventListener(ev, attrs.on[ev]); });
      else if (attrs[k] !== undefined && attrs[k] !== null && attrs[k] !== false) e.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    (kids || []).forEach(function (k) { if (k) e.appendChild(typeof k === 'string' ? document.createTextNode(k) : k); });
    return e;
  };
  var show = function (node, text) { node.textContent = text; node.hidden = !text; };
  var me = null, perms = [], mailOn = false;
  var can = function (p) { return perms.indexOf(p) > -1; };

  function api(method, path, body, raw) {
    var headers = { 'X-RS-Admin': '1' };
    if (body && !raw) headers['Content-Type'] = 'application/json';
    return fetch('/api/admin/' + path, { method: method, credentials: 'same-origin', headers: headers, body: raw ? body : body ? JSON.stringify(body) : undefined })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) {
          if (r.status === 401 && path !== 'login' && path !== 'me') showLogin();
          return { ok: r.ok, status: r.status, data: d };
        });
      }, function () { return { ok: false, status: 0, data: { error: 'Server nije dostupan. Proverite internet vezu.' } }; });
  }
  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return d.toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'numeric', year: 'numeric' }) + ' ' + d.toLocaleTimeString('sr-Latn-RS', { hour: '2-digit', minute: '2-digit' });
  }
  var stageName = function (s) { return STAGE_NAMES[s + 1] || '?'; };
  var genPassword = function () { var a = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '', r = new Uint32Array(14); crypto.getRandomValues(r); for (var i = 0; i < 14; i++) s += a[r[i] % a.length]; return s; };

  /* ================= PRIJAVA I KARTICE ================= */
  var TABS = [
    ['tickets', 'Nalozi', 'tickets.read'], ['calendar', 'Termini', 'tickets.read'], ['content', 'Sadržaj sajta', 'content'],
    ['users', 'Korisnici', 'users'], ['audit', 'Dnevnik', 'audit'], ['subs', 'Pretplatnici', 'subscribers.read'],
    ['mail', 'E-pošta', 'mail'], ['backups', 'Rezervne kopije', 'backups'], ['account', 'Moj nalog', null]
  ];
  var LOADERS = {};
  function showLogin() { $('#app').hidden = true; $('#login').hidden = false; $('#lg-user').focus(); }
  function showApp() {
    $('#login').hidden = true; $('#app').hidden = false;
    $('#who').textContent = (me.name || me.username) + ' · ' + ({ owner: 'Vlasnik', reception: 'Recepcija', technician: 'Serviser' }[me.role] || '');
    var tabs = $('#tabs'); tabs.textContent = '';
    TABS.filter(function (t) { return !t[2] || can(t[2]); }).forEach(function (t, i) {
      tabs.appendChild(el('button', { type: 'button', role: 'tab', 'data-tab': t[0], 'aria-selected': i === 0 ? 'true' : 'false', text: t[1], on: { click: function () { openTab(t[0]); } } }));
    });
    $$('[data-perm]').forEach(function (n) { n.hidden = !can(n.getAttribute('data-perm')); });
    openTab(location.hash.slice(1) && $('[data-tab="' + location.hash.slice(1) + '"]') ? location.hash.slice(1) : 'tickets');
  }
  function openTab(id) {
    $$('[data-tab]').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-tab') === id ? 'true' : 'false'); });
    $$('[data-pane]').forEach(function (p) { p.hidden = p.getAttribute('data-pane') !== id; });
    history.replaceState(null, '', '#' + id);
    if (LOADERS[id]) LOADERS[id]();
  }
  $('#login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('#login-err'); err.hidden = true;
    api('POST', 'login', { username: $('#lg-user').value, password: $('#pw').value }).then(function (r) {
      if (r.ok) { $('#pw').value = ''; boot(); } else show(err, r.data.error || 'Prijava nije uspela.');
    });
  });
  $('#logout').addEventListener('click', function () { api('POST', 'logout').then(showLogin); });
  function boot() {
    api('GET', 'me').then(function (r) {
      if (!r.ok) { showLogin(); show($('#login-err'), r.data.error || 'Server nije dostupan.'); return; }
      perms = r.data.perms || []; mailOn = r.data.mail; me = r.data.user;
      if (me) showApp(); else { showLogin(); if (!r.data.configured) show($('#login-err'), 'Panel nije podešen: na serveru postavite ADMIN_PASSWORD i ponovo ga pokrenite.'); }
    });
  }
  $$('[data-biz-name]').forEach(function (n) { if (RS.biz && RS.biz.name) n.textContent = RS.biz.name; });
  if (RS.biz && RS.biz.name) document.title = 'Panel · ' + RS.biz.name;

  /* ================= NALOZI ================= */
  var FIELDS = ['name', 'phone', 'email', 'device', 'model', 'description', 'slot_day', 'slot_time', 'diag', 'price', 'eta', 'notes'];
  var tickets = [], current = null, stageSel = 0, searchTimer;
  function loadTickets() {
    var sf = ($('[name=sf]:checked') || {}).value || '';
    api('GET', 'tickets?stage=' + encodeURIComponent(sf) + '&q=' + encodeURIComponent($('#q').value.trim())).then(function (r) {
      if (!r.ok) return; tickets = r.data.tickets || []; renderList();
    });
  }
  LOADERS.tickets = loadTickets;
  function ticketRow(t) {
    var b = el('button', { type: 'button', class: 'adm-row' + (current && current.code === t.code ? ' sel' : ''), on: { click: function () { openTab('tickets'); openTicket(t); } } }, [
      el('span', {}, [el('b', { text: t.code }), '  ' + (t.name || 'bez imena') + (t.phone ? ' · ' + t.phone : '')]),
      el('span', { class: 'pill-st s' + t.stage, text: stageName(t.stage) }),
      el('small', { text: [t.device, t.model].filter(Boolean).join(', ') + (t.slot_day ? ' · termin ' + t.slot_day.split('-').reverse().join('.') + '. ' + t.slot_time : '') + ' · izmenjen ' + fmtDate(t.updated_at) })
    ]);
    return b;
  }
  function renderList() {
    var list = $('#list'); list.textContent = '';
    if (!tickets.length) { list.appendChild(el('div', { class: 'adm-empty', text: 'Nema naloga za ovaj izbor.' })); return; }
    tickets.forEach(function (t) { list.appendChild(ticketRow(t)); });
  }
  $$('[name=sf]').forEach(function (r) { r.addEventListener('change', loadTickets); });
  $('#q').addEventListener('input', function () { clearTimeout(searchTimer); searchTimer = setTimeout(loadTickets, 250); });
  function renderStages() {
    var box = $('#d-stages'); box.textContent = '';
    STAGE_NAMES.forEach(function (name, i) {
      var s = i - 1;
      box.appendChild(el('button', { type: 'button', class: s === stageSel ? 'on' : (s < stageSel ? 'past' : ''), text: name, on: { click: function () { stageSel = s; renderStages(); mailNote(); } } }));
    });
  }
  function mailNote() {
    var n = $('#d-mailnote'), email = $('#f-email').value.trim();
    var t = '';
    if (current && current.stage !== stageSel && (stageSel === 2 || stageSel === 6)) {
      t = !mailOn ? 'Slanje e-pošte nije podešeno, pa klijent neće dobiti poruku.' : email ? 'Posle čuvanja klijent dobija e-poruku (' + (stageSel === 2 ? 'procena' : 'uređaj je spreman') + ').' : 'Klijent nema e-poštu, pa ga obavestite telefonom.';
    }
    n.textContent = t;
  }
  function openTicket(t) {
    current = t; stageSel = t ? t.stage : 0;
    $('#d-title').textContent = t ? t.code : 'Novi nalog';
    FIELDS.forEach(function (f) { $('#f-' + f).value = t ? (t[f] || '') : ''; });
    $('#f-problems').value = t ? (t.problems || []).join(', ') : '';
    var custOk = can('tickets.editCustomer') || !t;
    $$('[data-cust] input, [data-cust] textarea').forEach(function (i) { i.disabled = !custOk; });
    $('#d-print').hidden = $('#d-link').hidden = !t;
    $('#d-delete').hidden = !t || !can('tickets.delete');
    $('#d-err').hidden = true; $('#d-ok').hidden = true; $('#d-confirm').hidden = true;
    $('#d-save').textContent = t ? 'Sačuvaj' : 'Otvori nalog';
    $('#d-history-box').hidden = !t; $('#d-history').textContent = '';
    if (t) api('GET', 'tickets/' + t.code + '/history').then(function (r) {
      (r.data.history || []).forEach(function (h) { $('#d-history').appendChild(el('li', {}, [el('time', { text: fmtDate(h.at) }), el('span', { text: h.user_name + ': ' + describe(h.action, h.details) })])); });
    });
    renderStages(); renderList(); mailNote();
    var d = $('#detail'); d.hidden = false;
    if (window.innerWidth < 1000) d.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('#f-email').addEventListener('input', mailNote);
  $('#new-ticket').addEventListener('click', function () { openTicket(null); });
  $('#d-close').addEventListener('click', function () { $('#detail').hidden = true; current = null; renderList(); });
  $('#detail').addEventListener('submit', function (e) {
    e.preventDefault();
    var body = { stage: stageSel, problems: $('#f-problems').value.split(',').map(function (x) { return x.trim(); }).filter(Boolean) };
    FIELDS.forEach(function (f) { body[f] = $('#f-' + f).value; });
    var err = $('#d-err'), ok = $('#d-ok'); err.hidden = ok.hidden = true;
    (current ? api('PATCH', 'tickets/' + current.code, body) : api('POST', 'tickets', body)).then(function (r) {
      if (!r.ok) { show(err, r.data.error || 'Čuvanje nije uspelo.'); return; }
      var wasNew = !current;
      openTicket(r.data.ticket);
      show(ok, wasNew ? 'Nalog ' + r.data.ticket.code + ' je otvoren. Odštampajte potvrdu za klijenta.' : 'Sačuvano.');
      loadTickets();
    });
  });
  $('#d-delete').addEventListener('click', function () { $('#d-confirm').hidden = false; });
  $('#d-delete-no').addEventListener('click', function () { $('#d-confirm').hidden = true; });
  $('#d-delete-yes').addEventListener('click', function () {
    api('DELETE', 'tickets/' + current.code).then(function (r) { if (r.ok) { $('#detail').hidden = true; current = null; loadTickets(); } else show($('#d-err'), r.data.error); });
  });
  $('#d-link').addEventListener('click', function () {
    var link = location.origin + '/status.html#' + current.code, ok = $('#d-ok');
    var done = function () { show(ok, 'Link je kopiran: ' + link); };
    if (navigator.clipboard) navigator.clipboard.writeText(link).then(done, function () { show(ok, link); }); else show(ok, link);
  });
  $('#d-print').addEventListener('click', function () {
    var t = current, p = $('#print'), B = RS.biz || {}; p.textContent = '';
    p.appendChild(el('h1', { text: B.legalName || B.name || 'Servis' }));
    p.appendChild(el('div', { text: [B.address, B.phone, B.email].filter(Boolean).join(' · ') }));
    p.appendChild(el('h2', { text: 'Potvrda o prijemu uređaja na servis' }));
    p.appendChild(el('div', { class: 'code', text: t.code }));
    var table = el('table');
    [['Datum prijema', fmtDate((t.times && t.times[0]) || t.created_at)], ['Klijent', t.name], ['Telefon', t.phone], ['Uređaj', [t.device, t.model].filter(Boolean).join(', ')],
     ['Prijavljen kvar', [(t.problems || []).join(', '), t.description].filter(Boolean).join('. ')], ['Okvirna cena', t.price || 'posle dijagnostike'], ['Status popravke', location.origin + '/status.html#' + t.code]]
      .forEach(function (row) { table.appendChild(el('tr', {}, row.map(function (c) { return el('td', { text: c || '—' }); }))); });
    p.appendChild(table);
    p.appendChild(el('p', { text: 'Dijagnostika je besplatna ako se popravka radi kod nas. Ništa ne popravljamo bez vašeg odobrenja. Uređaj se izdaje uz ovu potvrdu ili ličnu kartu.' }));
    p.appendChild(el('div', { class: 'sign' }, [el('span', { text: 'Primio: ____________________' }), el('span', { text: 'Klijent: ____________________' })]));
    window.print();
  });

  /* ================= TERMINI ================= */
  LOADERS.calendar = function () {
    api('GET', 'tickets?stage=active').then(function (r) {
      var box = $('#cal'); box.textContent = '';
      var today = new Date().toISOString().slice(0, 10);
      var list = (r.data.tickets || []).filter(function (t) { return t.slot_day && t.slot_day >= today; })
        .sort(function (a, b) { return (a.slot_day + a.slot_time).localeCompare(b.slot_day + b.slot_time); });
      if (!list.length) { box.appendChild(el('div', { class: 'adm-empty', text: 'Nema zakazanih termina od danas nadalje.' })); return; }
      var byDay = {};
      list.forEach(function (t) { (byDay[t.slot_day] = byDay[t.slot_day] || []).push(t); });
      Object.keys(byDay).forEach(function (d) {
        var date = new Date(d + 'T12:00:00');
        var sec = el('section', { class: 'cal-day' }, [el('h3', { text: date.toLocaleDateString('sr-Latn-RS', { weekday: 'long', day: 'numeric', month: 'long' }) + ' · ' + byDay[d].length })]);
        var wrap = el('div', { class: 'adm-list' });
        byDay[d].forEach(function (t) { wrap.appendChild(ticketRow(t)); });
        sec.appendChild(wrap); box.appendChild(sec);
      });
    });
  };

  /* ================= DNEVNIK ================= */
  var ACTIONS = { 'login': 'prijava', 'login.failed': 'neuspela prijava', 'ticket.create': 'otvoren nalog', 'ticket.update': 'izmena naloga', 'ticket.stage': 'promena faze', 'ticket.delete': 'obrisan nalog',
    'content.update': 'izmena sadržaja sajta', 'content.restore': 'vraćena ranija verzija sadržaja', 'user.create': 'nov korisnik', 'user.update': 'izmena korisnika', 'user.password': 'promena lozinke',
    'export': 'izvoz naloga', 'backup.create': 'rezervna kopija', 'backup.download': 'preuzeta kopija', 'subscriber.delete': 'uklonjen pretplatnik', 'upload': 'otpremljena slika' };
  function describe(action, details) {
    var d = {}; try { d = details ? JSON.parse(details) : {}; } catch (e) {}
    var txt = ACTIONS[action] || action;
    if (d.stage !== undefined && typeof d.stage === 'number') txt += ' → ' + stageName(d.stage);
    var keys = Object.keys(d).filter(function (k) { return k !== 'stage'; });
    if (keys.length && action.indexOf('ticket') === 0) txt += ' (' + keys.map(function (k) { return k + ': ' + d[k]; }).join(', ') + ')';
    else if (keys.length) txt += ' (' + keys.map(function (k) { return k + ': ' + d[k]; }).join(', ') + ')';
    return txt;
  }
  var auditBefore = 0;
  function loadAudit(more) {
    api('GET', 'audit' + (more && auditBefore ? '?before=' + auditBefore : '')).then(function (r) {
      var tb = $('#audit'); if (!more) tb.textContent = '';
      (r.data.items || []).forEach(function (a) {
        auditBefore = a.id;
        tb.appendChild(el('tr', {}, [el('td', { class: 'num', text: fmtDate(a.at) }), el('td', { text: a.user_name }), el('td', { text: describe(a.action, '') }),
          el('td', { text: (a.entity_id ? a.entity + ' ' + a.entity_id + ' ' : '') + (a.details && a.details !== '{}' ? a.details : '') })]));
      });
      $('#audit-more').hidden = (r.data.items || []).length < 200;
    });
  }
  LOADERS.audit = function () { auditBefore = 0; loadAudit(false); };
  $('#audit-more').addEventListener('click', function () { loadAudit(true); });

  /* ================= PRETPLATNICI ================= */
  LOADERS.subs = function () {
    api('GET', 'subscribers').then(function (r) {
      var tb = $('#subs'); tb.textContent = '';
      (r.data.subscribers || []).forEach(function (s) {
        tb.appendChild(el('tr', {}, [el('td', { text: s.email }), el('td', { text: fmtDate(s.created_at) }),
          el('td', {}, [can('subscribers.delete') ? el('button', { type: 'button', class: 'copy-btn', text: 'Ukloni', on: { click: function () { api('DELETE', 'subscribers/' + s.id).then(LOADERS.subs); } } }) : null])]));
      });
      if (!tb.children.length) tb.appendChild(el('tr', {}, [el('td', { colspan: '3', text: 'Još nema prijava.' })]));
    });
  };

  /* ================= KORISNICI ================= */
  var ROLE_NAMES = { owner: 'Vlasnik', reception: 'Recepcija', technician: 'Serviser' };
  LOADERS.users = function () {
    api('GET', 'users').then(function (r) {
      var tb = $('#users'); tb.textContent = '';
      (r.data.users || []).forEach(function (u) {
        var role = el('select', { 'aria-label': 'Uloga', on: { change: function () { patchUser(u.id, { role: role.value }); } } },
          Object.keys(ROLE_NAMES).map(function (k) { var o = el('option', { value: k, text: ROLE_NAMES[k] }); if (k === u.role) o.selected = true; return o; }));
        tb.appendChild(el('tr', {}, [
          el('td', {}, [el('b', { text: u.name || u.username }), el('br'), el('span', { class: 'note', text: u.username + (u.active ? '' : ' · deaktiviran') })]),
          el('td', {}, [role]),
          el('td', { class: 'num', text: u.last_login ? fmtDate(u.last_login) : '—' }),
          el('td', {}, [
            el('button', { type: 'button', class: 'copy-btn', text: 'Nova lozinka', on: { click: function () { var pw = genPassword(); patchUser(u.id, { password: pw }, 'Nova lozinka za ' + u.username + ': ' + pw + ' (prepišite je i predajte korisniku).'); } } }),
            el('button', { type: 'button', class: 'copy-btn', text: u.active ? 'Deaktiviraj' : 'Aktiviraj', on: { click: function () { patchUser(u.id, { active: !u.active }); } } })
          ])
        ]));
      });
    });
  };
  function patchUser(id, body, okText) {
    api('PATCH', 'users/' + id, body).then(function (r) {
      if (r.ok) { show($('#u-ok'), okText || 'Sačuvano.'); $('#u-err').hidden = true; } else { show($('#u-err'), r.data.error); $('#u-ok').hidden = true; }
      LOADERS.users();
    });
  }
  $('#u-gen').addEventListener('click', function () { $('#u-pass').value = genPassword(); });
  $('#user-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var body = { username: $('#u-username').value.trim(), name: $('#u-name').value.trim(), role: $('#u-role').value, password: $('#u-pass').value };
    api('POST', 'users', body).then(function (r) {
      if (r.ok) { show($('#u-ok'), 'Korisnik ' + body.username + ' je dodat. Lozinka: ' + body.password + ' (predajte je korisniku; može je promeniti u „Moj nalog“).'); $('#u-err').hidden = true; $('#user-form').reset(); LOADERS.users(); }
      else { show($('#u-err'), r.data.error); $('#u-ok').hidden = true; }
    });
  });

  /* ================= E-POŠTA ================= */
  var MAIL_STATUS = { sent: 'poslato', pending: 'čeka', failed: 'nije uspelo' };
  LOADERS.mail = function () {
    api('GET', 'mail').then(function (r) {
      $('#mail-state').textContent = r.data.enabled ? 'Slanje je uključeno. Poruke se šalju sa adrese ' + r.data.from + '.' : 'Slanje e-pošte nije podešeno na serveru. Pogledajte uputstvo (SMTP_HOST, SMTP_USER, SMTP_PASS, MAIL_FROM).';
      var tb = $('#mail'); tb.textContent = '';
      (r.data.items || []).forEach(function (m) {
        tb.appendChild(el('tr', {}, [el('td', { class: 'num', text: fmtDate(m.created_at) }), el('td', { text: m.to_addr }), el('td', { text: m.subject }),
          el('td', {}, [el('span', { class: 'st-' + m.status, text: MAIL_STATUS[m.status] || m.status }), m.last_error ? el('div', { class: 'note', text: m.last_error }) : null]),
          el('td', {}, [m.status !== 'sent' ? el('button', { type: 'button', class: 'copy-btn', text: 'Pošalji ponovo', on: { click: function () { api('POST', 'mail/' + m.id + '/retry').then(function () { setTimeout(LOADERS.mail, 1500); }); } } }) : null])]));
      });
      if (!tb.children.length) tb.appendChild(el('tr', {}, [el('td', { colspan: '5', text: 'Još nema poslatih poruka.' })]));
    });
  };
  $('#mail-test').addEventListener('submit', function (e) {
    e.preventDefault();
    api('POST', 'mail/test', { to: $('#mt-to').value.trim() }).then(function (r) {
      if (r.ok) { show($('#mt-ok'), 'Poruka je u redu za slanje. Proverite sanduče (i folder za neželjenu poštu) za minut.'); $('#mt-err').hidden = true; setTimeout(LOADERS.mail, 2500); }
      else { show($('#mt-err'), r.data.error); $('#mt-ok').hidden = true; }
    });
  });

  /* ================= REZERVNE KOPIJE ================= */
  LOADERS.backups = function () {
    api('GET', 'backups').then(function (r) {
      var tb = $('#backups'); tb.textContent = '';
      (r.data.backups || []).forEach(function (b) {
        tb.appendChild(el('tr', {}, [el('td', { text: fmtDate(b.created_at) }), el('td', { class: 'num', text: (b.size / 1024).toFixed(0) + ' KB' }),
          el('td', {}, [el('a', { class: 'copy-btn', href: '/api/admin/backups/' + encodeURIComponent(b.name), text: 'Preuzmi' })])]));
      });
      if (!tb.children.length) tb.appendChild(el('tr', {}, [el('td', { colspan: '3', text: 'Još nema kopija. Prva se pravi automatski nekoliko sekundi posle pokretanja servera.' })]));
    });
  };
  $('#bk-now').addEventListener('click', function () { api('POST', 'backups').then(LOADERS.backups); });

  /* ================= MOJ NALOG ================= */
  $('#pw-form').addEventListener('submit', function (e) {
    e.preventDefault();
    api('POST', 'me/password', { current: $('#pw-cur').value, password: $('#pw-new').value }).then(function (r) {
      if (r.ok) { $('#pw-form').reset(); showLogin(); show($('#login-err'), 'Lozinka je promenjena. Prijavite se novom lozinkom.'); }
      else show($('#pw-err'), r.data.error);
    });
  });

  /* ================= SADRŽAJ SAJTA (forme po šemi) ================= */
  var ICONS = [['laptop', 'Laptop'], ['pc', 'Desktop računar'], ['fan', 'Ventilator'], ['screen', 'Ekran'], ['disk', 'Disk / podaci'], ['chip', 'Čip / nadogradnja'], ['drop', 'Tečnost'], ['bolt', 'Lemljenje / struja'], ['shield', 'Štit / firme']];
  var content = null, contentVersion = null, section = 'basic';
  var serviceOptions = function () { return (content.services || []).map(function (s) { return [s.slug, s.title || s.slug]; }); };
  var T = function (k, label, help, extra) { return Object.assign({ k: k, type: 'text', label: label, help: help }, extra || {}); };
  var SCHEMA = [
    { id: 'basic', label: 'Osnovni podaci', fields: [
      { k: 'demo', type: 'bool', label: 'Demo režim', help: 'Dok je uključen, sajt prikazuje demo traku, oznake „probno“ i probne naloge, i skriven je od Google-a. Isključite kada su svi podaci pravi.' },
      T('siteUrl', 'Adresa sajta', 'Puna adresa sa https, npr. https://www.vas-servis.rs. Koristi se za linkove u e-porukama i za Google.'),
      { k: 'business', type: 'object', label: 'Firma', fields: [T('name', 'Naziv (kako ga vide klijenti)'), T('legalName', 'Pun pravni naziv', 'npr. Reset servis d.o.o. Beograd'), T('pib', 'PIB'), T('maticniBroj', 'Matični broj'), T('warranty', 'Garancija', 'npr. 6 meseci. Ostavite prazno da se ne prikazuje.')] },
      { k: 'contact', type: 'object', label: 'Kontakt', fields: [T('street', 'Ulica i broj'), T('postal', 'Poštanski broj'), T('city', 'Grad'), T('phone', 'Telefon'), T('mobile', 'Viber / WhatsApp'), T('email', 'E-pošta'),
        T('mapUrl', 'Link do mape', 'Kopirajte link iz Google Maps (Podeli → Kopiraj link).'), T('directions', 'Kako do nas', '', { type: 'textarea' })] },
      { k: 'hours', type: 'object', label: 'Radno vreme', fields: [{ k: 'weekdays', type: 'hours', label: 'Ponedeljak–petak' }, { k: 'saturday', type: 'hours', label: 'Subota' }, { k: 'sunday', type: 'hours', label: 'Nedelja' }] }
    ] },
    { id: 'home', label: 'Početna', fields: [
      { k: 'home', type: 'object', label: 'Glavni naslov', fields: [T('heroTitle1', 'Naslov, prvi deo'), T('heroAccent', 'Naslov, istaknuti deo (kurziv)'), T('heroTitle2', 'Naslov, kraj'), T('heroLead', 'Tekst ispod naslova', '', { type: 'textarea' })] },
      { k: 'rating', type: 'object', label: 'Ocena', help: 'Upišite samo stvarnu ocenu, npr. sa Google profila. Ostavite prazno da se ne prikazuje.', fields: [T('value', 'Ocena', 'npr. 4,9'), T('count', 'Opis', 'npr. 320 ocena na Google-u')] },
      { k: 'stats', type: 'list', label: 'Brojke', help: 'Samo stvarni podaci. Prazna lista sakriva ovaj deo.', itemLabel: function (x) { return (x.value || '') + ' ' + (x.suffix || '') + ' ' + (x.label || ''); }, newItem: function () { return { value: 0, suffix: '', label: '' }; },
        fields: [{ k: 'value', type: 'number', label: 'Broj' }, T('suffix', 'Dodatak', 'npr. +, h, %'), T('label', 'Opis')] },
      { k: 'brands', type: 'lines', label: 'Proizvođači u traci', help: 'Jedan po redu.' },
      { k: 'reviews', type: 'list', label: 'Recenzije', help: 'Samo stvarne recenzije, uz dozvolu klijenta. Prazna lista sakriva ovaj deo.', itemLabel: function (x) { return x.name || 'nova recenzija'; }, newItem: function () { return { initials: '', name: '', place: '', text: '' }; },
        fields: [T('name', 'Ime', 'npr. Milica J.'), T('initials', 'Inicijali', 'npr. MJ'), T('place', 'Mesto / opština'), T('text', 'Tekst', '', { type: 'textarea' })] }
    ] },
    { id: 'services', label: 'Usluge i cene', fields: [
      { k: 'services', type: 'list', label: 'Usluge', itemLabel: function (s) { return s.title || 'nova usluga'; },
        newItem: function () { return { slug: 'nova-usluga-' + Date.now().toString(36).slice(-4), icon: 'laptop', title: 'Nova usluga', short: '', long: '', time: '', image: '', symptoms: [], included: [], tips: [], prices: [], related: [] }; },
        fields: [
          T('title', 'Naziv usluge'),
          T('slug', 'Adresa stranice', 'Samo mala slova, brojevi i crtice, npr. zamena-baterije. Ne menjajte posle objavljivanja (stari linkovi prestaju da rade).'),
          { k: 'icon', type: 'select', label: 'Ikonica i crtež', options: function () { return ICONS; } },
          { k: 'image', type: 'image', label: 'Fotografija (umesto crteža)', help: 'PNG, JPG ili WebP, do 3 MB. Ako je prazno, prikazuje se crtež.' },
          T('short', 'Kratak opis (kartica)', '', { type: 'textarea' }), T('long', 'Duži opis (stranica usluge)', '', { type: 'textarea' }), T('time', 'Rok', 'npr. 1–3 dana'),
          { k: 'prices', type: 'list', label: 'Cene', itemLabel: function (p) { return (p.name || 'stavka') + ': ' + (p.min || 0) + '–' + (p.max || 0) + ' RSD'; }, newItem: function () { return { name: '', min: 0, max: 0 }; },
            fields: [T('name', 'Stavka'), { k: 'min', type: 'number', label: 'Od (RSD)' }, { k: 'max', type: 'number', label: 'Do (RSD)' }] },
          { k: 'symptoms', type: 'lines', label: 'Kada vam je potrebna', help: 'Jedna stavka po redu.' },
          { k: 'included', type: 'lines', label: 'Šta je uključeno', help: 'Jedna stavka po redu.' },
          { k: 'tips', type: 'lines', label: 'Prva pomoć (nije obavezno)', help: 'Saveti za hitne slučajeve, jedan po redu.' },
          { k: 'related', type: 'refs', label: 'Povezane usluge', options: serviceOptions },
          { k: 'compare', type: 'bool', label: 'Prikaži klizač pre/posle za ventilator' }
        ] }
    ] },
    { id: 'steps', label: 'Postupak', fields: [
      { k: 'steps', type: 'list', fixed: true, label: 'Faze servisiranja', help: 'Sedam faza, svaka ima svoj crtež. Tekst možete menjati.', itemLabel: function (s, i) { return (i + 1) + '. ' + (s.title || ''); },
        fields: [T('title', 'Naslov'), T('short', 'Kratak naziv (traka faza)'), T('time', 'Trajanje', 'npr. Isti ili sledeći dan'), T('text', 'Opis', '', { type: 'textarea' }), { k: 'tags', type: 'lines', label: 'Oznake', help: 'Jedna po redu.' }] }
    ] },
    { id: 'faq', label: 'Česta pitanja', fields: [
      { k: 'faq', type: 'list', label: 'Grupe pitanja', itemLabel: function (g) { return (g.group || 'grupa') + ' (' + (g.items || []).length + ')'; }, newItem: function () { return { group: 'Nova grupa', items: [] }; },
        fields: [T('group', 'Naziv grupe'), { k: 'items', type: 'list', label: 'Pitanja', itemLabel: function (x) { return x.q || 'novo pitanje'; }, newItem: function () { return { q: '', a: '' }; }, fields: [T('q', 'Pitanje'), T('a', 'Odgovor', '', { type: 'textarea' })] }] }
    ] },
    { id: 'calc', label: 'Kalkulator', fields: [
      { k: 'calc', type: 'object', label: 'Kalkulator cene', help: 'Okvirna cena = raspon problema × faktor uređaja. Hitno dodaje 30%.', fields: [
        { k: 'devices', type: 'list', label: 'Uređaji', itemLabel: function (d) { return (d.label || '') + ' × ' + (d.factor || 1); }, newItem: function () { return { key: 'uredjaj-' + Date.now().toString(36).slice(-4), label: '', factor: 1 }; },
          fields: [T('label', 'Naziv'), { k: 'factor', type: 'number', label: 'Faktor', step: '0.05', help: '1 = osnovna cena, 1.25 = 25% skuplje' }, T('key', 'Interna oznaka', 'Mala slova i crtice, ne menjajte.')] },
        { k: 'issues', type: 'list', label: 'Problemi', itemLabel: function (x) { return (x.label || '') + ': ' + (x.min || 0) + '–' + (x.max || 0) + ' RSD'; }, newItem: function () { return { key: 'problem-' + Date.now().toString(36).slice(-4), label: '', min: 0, max: 0, time: '', service: '' }; },
          fields: [T('label', 'Naziv'), { k: 'min', type: 'number', label: 'Od (RSD)' }, { k: 'max', type: 'number', label: 'Do (RSD)' }, T('time', 'Rok'), { k: 'service', type: 'select', label: 'Stranica usluge', options: serviceOptions }, T('key', 'Interna oznaka', 'Mala slova i crtice, ne menjajte.')] }
      ] }
    ] },
    { id: 'booking', label: 'Zakazivanje i obaveštenja', fields: [
      { k: 'booking', type: 'object', label: 'Termini', fields: [
        { k: 'slotMinutes', type: 'number', label: 'Trajanje termina (minuta)', help: 'Na koliko minuta se nude termini, npr. 60.' },
        { k: 'perSlot', type: 'number', label: 'Broj klijenata po terminu', help: 'Koliko zakazivanja prima jedan termin. Popunjen termin se više ne nudi.' },
        { k: 'horizonDays', type: 'number', label: 'Koliko dana unapred', help: 'npr. 14' },
        { k: 'minNoticeHours', type: 'number', label: 'Najkasnije sati pre termina', help: 'npr. 2 = ne može se zakazati termin koji počinje za manje od 2 sata.' },
        { k: 'blockedDates', type: 'lines', label: 'Neradni dani', help: 'Datum po redu, u obliku GGGG-MM-DD, npr. 2026-12-31.' }
      ] },
      { k: 'notifications', type: 'object', label: 'E-poruke', help: 'Šalju se samo ako je slanje e-pošte podešeno na serveru.', fields: [
        { k: 'staffEmails', type: 'lines', label: 'Ko prima obaveštenje o novom zakazivanju', help: 'Adresa po redu, npr. recepcija@vas-servis.rs' },
        { k: 'customerOnBooking', type: 'bool', label: 'Klijentu potvrda o zakazivanju' },
        { k: 'customerOnEstimate', type: 'bool', label: 'Klijentu poruka kada je procena poslata' },
        { k: 'customerOnReady', type: 'bool', label: 'Klijentu poruka kada je uređaj spreman' }
      ] }
    ] },
    { id: 'brand', label: 'Izgled', fields: [
      { k: 'brand', type: 'object', label: 'Brend', fields: [
        { k: 'accent', type: 'color', label: 'Glavna boja (svetla tema)' }, { k: 'accentDark', type: 'color', label: 'Glavna boja (tamna tema)', help: 'Svetlija nijansa iste boje.' },
        { k: 'logo', type: 'image', label: 'Logo', help: 'PNG, JPG ili WebP, po mogućstvu kvadratni. Ako nema loga, prikazuje se znak ispod.' },
        T('mark', 'Znak umesto loga', 'npr. R/ (do 3 znaka)')
      ] },
      { k: 'analytics', type: 'object', label: 'Statistika poseta', help: 'Plausible meri posete bez kolačića. Upišite domen sajta kako je prijavljen na plausible.io, npr. vas-servis.rs.', fields: [T('plausibleDomain', 'Domen na Plausible-u')] }
    ] }
  ];

  function fieldId() { fieldId.n = (fieldId.n || 0) + 1; return 'cf-' + fieldId.n; }
  function renderField(f, obj, parentRerender) {
    var id = fieldId(), wrap = el('div', { class: 'cf-field' });
    var help = f.help ? el('p', { class: 'cf-help', text: f.help }) : null;
    var v = obj[f.k];
    if (f.type === 'object') {
      if (!obj[f.k] || typeof obj[f.k] !== 'object') obj[f.k] = {};
      var g = el('div', { class: 'cf-group' }, [el('div', { class: 'cf-legend', text: f.label }), help]);
      f.fields.forEach(function (sf) { g.appendChild(renderField(sf, obj[f.k], parentRerender)); });
      return g;
    }
    if (f.type === 'list') return renderListField(f, obj, help);
    if (f.type === 'bool') {
      var cb = el('input', { type: 'checkbox', id: id, on: { change: function () { obj[f.k] = cb.checked; } } }); cb.checked = v !== false && !!v;
      wrap.appendChild(el('label', { class: 'cf-check', for: id }, [cb, f.label])); if (help) wrap.appendChild(help); return wrap;
    }
    wrap.appendChild(el('label', { for: id, text: f.label }));
    var input;
    if (f.type === 'textarea') { input = el('textarea', { id: id }); input.value = v || ''; input.addEventListener('input', function () { obj[f.k] = input.value; }); }
    else if (f.type === 'number') { input = el('input', { id: id, type: 'number', step: f.step || '1' }); input.value = v == null ? '' : v; input.addEventListener('input', function () { obj[f.k] = input.value === '' ? 0 : +input.value; }); }
    else if (f.type === 'color') { input = el('input', { id: id, type: 'color', style: 'width:80px;height:44px;padding:4px' }); input.value = /^#[0-9a-f]{6}$/i.test(v || '') ? v : '#0b6e8a'; input.addEventListener('input', function () { obj[f.k] = input.value; }); }
    else if (f.type === 'lines') { input = el('textarea', { id: id, rows: '4' }); input.value = (v || []).join('\n'); input.addEventListener('input', function () { obj[f.k] = input.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); }); }
    else if (f.type === 'select') {
      input = el('select', { id: id }, [el('option', { value: '', text: '—' })].concat(f.options().map(function (o) { return el('option', { value: o[0], text: o[1] }); })));
      input.value = v || ''; input.addEventListener('change', function () { obj[f.k] = input.value; });
    } else if (f.type === 'hours') {
      var closed = !v, from = el('input', { type: 'time', id: id, value: v ? v[0] : '09:00' }), to = el('input', { type: 'time', 'aria-label': f.label + ' do', value: v ? v[1] : '17:00' });
      var cl = el('input', { type: 'checkbox' }); cl.checked = closed;
      var sync = function () { from.disabled = to.disabled = cl.checked; obj[f.k] = cl.checked ? null : [from.value, to.value]; };
      [from, to].forEach(function (x) { x.addEventListener('input', sync); }); cl.addEventListener('change', sync); from.disabled = to.disabled = closed;
      input = el('div', { class: 'cf-pair' }, [from, '–', to, el('label', { class: 'cf-check' }, [cl, 'zatvoreno'])]);
    } else if (f.type === 'refs') {
      input = el('div', { class: 'seg', id: id });
      var cur = v || [];
      f.options().forEach(function (o) {
        if (o[0] === obj.slug) return;
        var c = el('input', { type: 'checkbox', value: o[0] }); c.checked = cur.indexOf(o[0]) > -1;
        c.addEventListener('change', function () { obj[f.k] = $$('input:checked', input).map(function (x) { return x.value; }); });
        input.appendChild(el('label', {}, [c, el('span', { text: o[1] })]));
      });
    } else if (f.type === 'image') {
      var prev = el('img', { alt: '', src: v || undefined }); prev.hidden = !v;
      var file = el('input', { type: 'file', id: id, accept: 'image/png,image/jpeg,image/webp' });
      var msg = el('span', { class: 'cf-help' });
      var rm = el('button', { type: 'button', class: 'copy-btn', text: 'Ukloni', on: { click: function () { obj[f.k] = ''; prev.hidden = true; rm.hidden = true; } } }); rm.hidden = !v;
      file.addEventListener('change', function () {
        var fl = file.files[0]; if (!fl) return;
        if (fl.size > 3 * 1024 * 1024) { msg.textContent = 'Slika je veća od 3 MB.'; return; }
        msg.textContent = 'Otpremam…';
        api('POST', 'uploads', fl, true).then(function (r) {
          if (r.ok) { obj[f.k] = r.data.url; prev.src = r.data.url; prev.hidden = false; rm.hidden = false; msg.textContent = 'Otpremljeno. Sačuvajte izmene.'; }
          else msg.textContent = r.data.error || 'Otpremanje nije uspelo.';
        });
      });
      input = el('div', { class: 'cf-img' }, [prev, file, rm, msg]);
    } else { input = el('input', { id: id, type: 'text' }); input.value = v || ''; input.addEventListener('input', function () { obj[f.k] = input.value; }); }
    wrap.appendChild(input); if (help) wrap.appendChild(help);
    return wrap;
  }
  function renderListField(f, obj, help) {
    if (!Array.isArray(obj[f.k])) obj[f.k] = [];
    var arr = obj[f.k];
    var box = el('div', { class: 'cf-group' });
    var draw = function (openIdx) {
      box.textContent = '';
      box.appendChild(el('div', { class: 'cf-legend', text: f.label + ' (' + arr.length + ')' }));
      if (help) box.appendChild(help);
      arr.forEach(function (item, i) {
        var d = el('details', { class: 'cf-item' }); if (openIdx === i) d.open = true;
        var sum = el('summary', { text: f.itemLabel ? f.itemLabel(item, i) : 'Stavka ' + (i + 1) });
        var body = el('div', { class: 'cf-body' });
        d.appendChild(sum); d.appendChild(body);
        var filled = false;
        var fill = function () {
          if (filled) return; filled = true;
          f.fields.forEach(function (sf) { body.appendChild(renderField(sf, item)); });
          body.addEventListener('input', function () { if (f.itemLabel) sum.textContent = f.itemLabel(item, i); });
          if (!f.fixed) body.appendChild(el('div', { class: 'cf-item-tools' }, [
            el('button', { type: 'button', class: 'copy-btn', text: '↑ Gore', disabled: i === 0 ? true : null, on: { click: function () { arr.splice(i - 1, 0, arr.splice(i, 1)[0]); draw(i - 1); } } }),
            el('button', { type: 'button', class: 'copy-btn', text: '↓ Dole', disabled: i === arr.length - 1 ? true : null, on: { click: function () { arr.splice(i + 1, 0, arr.splice(i, 1)[0]); draw(i + 1); } } }),
            el('button', { type: 'button', class: 'copy-btn adm-danger', text: 'Ukloni', on: { click: function () { arr.splice(i, 1); draw(); } } })
          ]));
        };
        d.addEventListener('toggle', function () { if (d.open) fill(); });
        if (d.open) fill();
        box.appendChild(d);
      });
      if (!f.fixed) box.appendChild(el('div', {}, [el('button', { type: 'button', class: 'btn btn-ghost btn-sm', text: '+ Dodaj', on: { click: function () { arr.push(f.newItem()); draw(arr.length - 1); } } })]));
    };
    draw();
    return box;
  }
  function renderContent() {
    var tabs = $('#c-sections'); tabs.textContent = '';
    SCHEMA.forEach(function (s) {
      tabs.appendChild(el('button', { type: 'button', role: 'tab', 'aria-selected': s.id === section ? 'true' : 'false', text: s.label, on: { click: function () { section = s.id; renderContent(); } } }));
    });
    var form = $('#c-form'); form.textContent = '';
    var sec = SCHEMA.filter(function (s) { return s.id === section; })[0];
    var wrap = el('div', { class: 'cf-section' });
    sec.fields.forEach(function (f) { wrap.appendChild(renderField(f, content)); });
    form.appendChild(wrap);
  }
  function loadVersions() {
    api('GET', 'content/versions').then(function (r) {
      var ol = $('#c-versions'); ol.textContent = '';
      (r.data.versions || []).forEach(function (v, i) {
        ol.appendChild(el('li', {}, [el('time', { text: fmtDate(v.created_at) }), el('span', {}, [v.user_name + (i === 0 ? ' · trenutna' : ' '),
          i === 0 ? null : el('button', { type: 'button', class: 'copy-btn', text: 'Vrati ovu verziju', on: { click: function () {
            api('POST', 'content/restore/' + v.id).then(function (x) { if (x.ok) { show($('#c-ok'), 'Vraćena je verzija od ' + fmtDate(v.created_at) + '.'); LOADERS.content(); } else show($('#c-err'), x.data.error); });
          } } })])]));
      });
    });
  }
  LOADERS.content = function () {
    $('#c-err').hidden = true;
    api('GET', 'content').then(function (r) {
      if (!r.ok) { show($('#c-err'), r.data.error); return; }
      content = r.data.content; contentVersion = r.data.version;
      renderContent(); loadVersions();
    });
  };
  $('#c-save').addEventListener('click', function () {
    var err = $('#c-err'), ok = $('#c-ok'); err.hidden = ok.hidden = true;
    var btn = $('#c-save'); btn.disabled = true;
    api('PUT', 'content', { version: contentVersion, content: content }).then(function (r) {
      btn.disabled = false;
      if (r.ok) { contentVersion = r.data.version; show(ok, 'Sačuvano. Izmene su vidljive na sajtu.'); loadVersions(); }
      else show(err, r.data.error || 'Čuvanje nije uspelo.');
    });
  });
  window.addEventListener('beforeunload', function () {});

  boot();
})();
