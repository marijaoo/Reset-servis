(function () {
  'use strict';
  var RS = window.RS || {}, BIZ = RS.biz || {};
  var STAGES = ['Zakazan termin'].concat(RS.stages || []); // indeks 0 ovde = faza -1
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var FIELDS = ['name', 'phone', 'email', 'device', 'model', 'description', 'slot_day', 'slot_time', 'diag', 'price', 'eta', 'notes'];
  var tickets = [], current = null, stageSel = 0, searchTimer;

  $$('[data-biz-name]').forEach(function (el) { if (BIZ.name) el.textContent = BIZ.name; });
  if (BIZ.name) document.title = 'Panel · ' + BIZ.name;

  function api(method, path, body) {
    return fetch('/api/admin/' + path, {
      method: method, credentials: 'same-origin',
      headers: Object.assign({ 'X-RS-Admin': '1' }, body ? { 'Content-Type': 'application/json' } : {}),
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (r.status === 401 && path !== 'login') showLogin();
        return { ok: r.ok, status: r.status, data: d };
      });
    }, function () { return { ok: false, status: 0, data: { error: 'Server nije dostupan.' } }; });
  }
  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return d.toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'numeric', year: 'numeric' }) + ' ' + d.toLocaleTimeString('sr-Latn-RS', { hour: '2-digit', minute: '2-digit' });
  }
  function stageName(s) { return STAGES[s + 1] || '?'; }

  /* ----- prijava ----- */
  function showLogin() { $('#app').hidden = true; $('#login').hidden = false; $('#pw').focus(); }
  function showApp() { $('#login').hidden = true; $('#app').hidden = false; loadTickets(); }
  $('#login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('#login-err'); err.hidden = true;
    api('POST', 'login', { password: $('#pw').value }).then(function (r) {
      if (r.ok) { $('#pw').value = ''; showApp(); } else { err.textContent = r.data.error || 'Prijava nije uspela.'; err.hidden = false; }
    });
  });
  $('#logout').addEventListener('click', function () { api('POST', 'logout').then(showLogin); });
  api('GET', 'me').then(function (r) {
    if (r.data.admin) showApp(); else {
      showLogin();
      if (r.ok && !r.data.configured) { var err = $('#login-err'); err.textContent = 'Panel nije podešen: na serveru postavite ADMIN_PASSWORD.'; err.hidden = false; }
    }
  });

  /* ----- kartice ----- */
  $$('[data-tab]').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('[data-tab]').forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
      $('#tab-tickets').hidden = b.getAttribute('data-tab') !== 'tickets';
      $('#tab-subs').hidden = b.getAttribute('data-tab') !== 'subs';
      if (b.getAttribute('data-tab') === 'subs') loadSubs();
    });
  });

  /* ----- lista naloga ----- */
  function loadTickets() {
    var sf = ($('[name=sf]:checked') || {}).value || '';
    var q = $('#q').value.trim();
    api('GET', 'tickets?stage=' + encodeURIComponent(sf) + '&q=' + encodeURIComponent(q)).then(function (r) {
      if (!r.ok) return;
      tickets = r.data.tickets || [];
      renderList();
    });
  }
  function renderList() {
    var list = $('#list'); list.textContent = '';
    if (!tickets.length) { var em = document.createElement('div'); em.className = 'adm-empty'; em.textContent = 'Nema naloga za ovaj izbor.'; list.appendChild(em); return; }
    tickets.forEach(function (t) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'adm-row' + (current && current.code === t.code ? ' sel' : '');
      var top = document.createElement('span'); var code = document.createElement('b'); code.textContent = t.code; top.appendChild(code);
      top.appendChild(document.createTextNode('  ' + (t.name || 'bez imena') + (t.phone ? ' · ' + t.phone : '')));
      var pill = document.createElement('span'); pill.className = 'pill-st s' + t.stage; pill.textContent = stageName(t.stage);
      var sm = document.createElement('small');
      sm.textContent = [t.device, t.model].filter(Boolean).join(', ') + (t.stage < 0 && t.slot_day ? ' · termin ' + t.slot_day.split('-').reverse().join('.') + '. ' + t.slot_time : '') + ' · izmenjen ' + fmtDate(t.updated_at);
      b.appendChild(top); b.appendChild(pill); b.appendChild(sm);
      b.addEventListener('click', function () { openTicket(t); });
      list.appendChild(b);
    });
  }
  $$('[name=sf]').forEach(function (r) { r.addEventListener('change', loadTickets); });
  $('#q').addEventListener('input', function () { clearTimeout(searchTimer); searchTimer = setTimeout(loadTickets, 250); });

  /* ----- detalji ----- */
  function renderStages() {
    var box = $('#d-stages'); box.textContent = '';
    STAGES.forEach(function (name, i) {
      var s = i - 1, b = document.createElement('button'); b.type = 'button'; b.textContent = name;
      b.className = s === stageSel ? 'on' : (s < stageSel ? 'past' : '');
      b.addEventListener('click', function () { stageSel = s; renderStages(); });
      box.appendChild(b);
    });
  }
  function openTicket(t) {
    current = t; stageSel = t ? t.stage : 0;
    $('#d-title').textContent = t ? t.code : 'Novi nalog';
    FIELDS.forEach(function (f) { $('#f-' + f).value = t ? (t[f] || '') : ''; });
    $('#f-problems').value = t ? (t.problems || []).join(', ') : '';
    $('#d-print').hidden = $('#d-link').hidden = $('#d-delete').hidden = !t;
    $('#d-err').hidden = true; $('#d-ok').hidden = true; $('#d-confirm').hidden = true;
    $('#d-save').textContent = t ? 'Sačuvaj' : 'Otvori nalog';
    renderStages(); renderList();
    var d = $('#detail'); d.hidden = false;
    if (window.innerWidth < 1000) d.scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('#f-name').focus({ preventScroll: true });
  }
  $('#new-ticket').addEventListener('click', function () { openTicket(null); });
  $('#d-close').addEventListener('click', function () { $('#detail').hidden = true; current = null; renderList(); });
  $('#detail').addEventListener('submit', function (e) {
    e.preventDefault();
    var body = { stage: stageSel, problems: $('#f-problems').value.split(',').map(function (x) { return x.trim(); }).filter(Boolean) };
    FIELDS.forEach(function (f) { body[f] = $('#f-' + f).value; });
    var err = $('#d-err'), ok = $('#d-ok'); err.hidden = ok.hidden = true;
    var req = current ? api('PATCH', 'tickets/' + current.code, body) : api('POST', 'tickets', body);
    req.then(function (r) {
      if (!r.ok) { err.textContent = r.data.error || 'Čuvanje nije uspelo.'; err.hidden = false; return; }
      var wasNew = !current;
      openTicket(r.data.ticket);
      ok.textContent = wasNew ? 'Nalog ' + r.data.ticket.code + ' je otvoren. Odštampajte potvrdu za klijenta.' : 'Sačuvano.';
      ok.hidden = false;
      loadTickets();
    });
  });
  $('#d-delete').addEventListener('click', function () { $('#d-confirm').hidden = false; });
  $('#d-delete-no').addEventListener('click', function () { $('#d-confirm').hidden = true; });
  $('#d-delete-yes').addEventListener('click', function () {
    api('DELETE', 'tickets/' + current.code).then(function (r) {
      if (r.ok) { $('#detail').hidden = true; current = null; loadTickets(); }
    });
  });
  function clientLink() { return location.origin + '/status.html#' + current.code; }
  $('#d-link').addEventListener('click', function () {
    var link = clientLink(), ok = $('#d-ok');
    var done = function () { ok.textContent = 'Link je kopiran: ' + link; ok.hidden = false; };
    if (navigator.clipboard) navigator.clipboard.writeText(link).then(done, function () { ok.textContent = link; ok.hidden = false; });
    else { ok.textContent = link; ok.hidden = false; }
  });

  /* ----- potvrda za klijenta (štampa) ----- */
  $('#d-print').addEventListener('click', function () {
    var t = current, p = $('#print'); p.textContent = '';
    var add = function (tag, text, cls) { var el = document.createElement(tag); if (cls) el.className = cls; el.textContent = text; p.appendChild(el); return el; };
    add('h1', BIZ.legalName || BIZ.name || 'Servis');
    add('div', [BIZ.address, BIZ.phone, BIZ.email].filter(Boolean).join(' · '));
    add('h2', 'Potvrda o prijemu uređaja na servis');
    add('div', t.code, 'code');
    var table = document.createElement('table');
    [['Datum prijema', fmtDate((t.times && t.times[0]) || t.created_at)], ['Klijent', t.name], ['Telefon', t.phone], ['Uređaj', [t.device, t.model].filter(Boolean).join(', ')],
     ['Prijavljen kvar', [(t.problems || []).join(', '), t.description].filter(Boolean).join('. ')], ['Okvirna cena', t.price || 'posle dijagnostike'], ['Status popravke', location.origin + '/status.html#' + t.code]]
      .forEach(function (row) { var tr = document.createElement('tr'); row.forEach(function (c) { var td = document.createElement('td'); td.textContent = c || '—'; tr.appendChild(td); }); table.appendChild(tr); });
    p.appendChild(table);
    add('p', 'Dijagnostika je besplatna ako se popravka radi kod nas. Ništa ne popravljamo bez vašeg odobrenja. Uređaj se izdaje uz ovu potvrdu ili ličnu kartu.');
    var sign = add('div', '', 'sign'); sign.innerHTML = '<span>Primio: ____________________</span><span>Klijent: ____________________</span>';
    window.print();
  });

  /* ----- pretplatnici ----- */
  function loadSubs() {
    api('GET', 'subscribers').then(function (r) {
      var tb = $('#subs'); tb.textContent = '';
      (r.data.subscribers || []).forEach(function (s) {
        var tr = document.createElement('tr');
        var a = document.createElement('td'); a.textContent = s.email;
        var b = document.createElement('td'); b.textContent = fmtDate(s.created_at);
        var c = document.createElement('td'); var del = document.createElement('button'); del.type = 'button'; del.className = 'copy-btn'; del.textContent = 'Ukloni';
        del.addEventListener('click', function () { api('DELETE', 'subscribers/' + s.id).then(loadSubs); });
        c.appendChild(del); tr.appendChild(a); tr.appendChild(b); tr.appendChild(c); tb.appendChild(tr);
      });
      if (!tb.children.length) { var tr = document.createElement('tr'); var td = document.createElement('td'); td.colSpan = 3; td.textContent = 'Još nema prijava.'; tr.appendChild(td); tb.appendChild(tr); }
    });
  }
})();
