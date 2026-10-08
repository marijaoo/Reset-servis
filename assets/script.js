(function () {
  'use strict';
  var root = document.documentElement;
  var RS = window.RS || {};
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var fmt = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };

  /* ---------- Predučitavanje ---------- */
  var loader = $('.loader');
  if (loader && root.classList.contains('show-loader')) {
    var cnt = $('[data-loader-count]'), line = $('[data-loader-line]'), t0 = performance.now();
    (function tick(now) {
      var p = Math.min(1, (now - t0) / 900);
      var e = 1 - Math.pow(1 - p, 3);
      cnt.textContent = Math.round(e * 100);
      line.style.width = (e * 100) + '%';
      if (p < 1) requestAnimationFrame(tick);
      else setTimeout(function () { loader.classList.add('done'); setTimeout(function () { root.classList.remove('show-loader'); }, 1000); }, 150);
    })(t0);
  }

  /* ---------- Tema ---------- */
  var themeBtn = $('[data-theme-toggle]');
  function isLight() {
    var t = root.getAttribute('data-theme');
    if (t) return t === 'light';
    return window.matchMedia('(prefers-color-scheme: light)').matches;
  }
  function syncTheme() { if (themeBtn) themeBtn.classList.toggle('is-light', isLight()); document.dispatchEvent(new Event('rs-theme')); }
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = isLight() ? 'dark' : 'light';
      var apply = function () { root.setAttribute('data-theme', next); store.set('rs-theme', next); syncTheme(); };
      if (document.startViewTransition && !reduce) document.startViewTransition(apply); else apply();
    });
  }
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', syncTheme);
  new MutationObserver(syncTheme).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  syncTheme();

  /* ---------- Glatko skrolovanje (Lenis) ---------- */
  var lenis = null;
  if (window.Lenis && !reduce) {
    try {
      lenis = new window.Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
      var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    } catch (e) { lenis = null; }
  }
  // Stvarni položaj elementa, bez privremenog pomeranja iz animacije pojavljivanja
  function absTop(el) { var y = 0; while (el) { y += el.offsetTop; el = el.offsetParent; } return y; }
  // Kad je sajt ugrađen u okvir koji se sam ne skroluje (npr. pregled u aplikaciji),
  // skroluje se stranica oko okvira: tada pomeramo preko scrollIntoView, koji radi i kroz okvir.
  function pageCanScroll() { return document.documentElement.scrollHeight > window.innerHeight + 2; }
  function scrollToEl(target, instant) {
    var behavior = instant || reduce ? 'auto' : 'smooth';
    if (!pageCanScroll()) {
      var el = target === 0 ? document.body : target;
      try { el.scrollIntoView({ block: 'start', behavior: behavior }); } catch (e) { el.scrollIntoView(true); }
      return;
    }
    var y = target === 0 ? 0 : Math.max(0, absTop(target) - 92);
    if (lenis) lenis.scrollTo(y, instant ? { immediate: true } : { duration: 1.4 });
    else window.scrollTo({ top: y, behavior: behavior });
  }
  // Nova stranica uvek počinje od vrha (ili od traženog dela, ako link ima #deo).
  // Povratak dugmetom „nazad“ zadržava položaj koji je pregledač zapamtio.
  (function () {
    var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    if (nav && nav.type === 'back_forward') return;
    var hashEl = location.hash && /^#[\w-]+$/.test(location.hash) ? document.getElementById(location.hash.slice(1)) : null;
    setTimeout(function () { scrollToEl(hashEl || 0, true); }, 60);
  })();
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1); var el = id && document.getElementById(id);
      if (el) { e.preventDefault(); scrollToEl(el); }
    });
  });

  /* ---------- Zaglavlje, napredak, strelica ---------- */
  var header = $('.site-header'), topBtn = $('.to-top'), bar = $('.progress-bar');
  var stepsWrap = $('.steps-wrap'), steps = $$('.step');
  function onScroll() {
    var y = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight;
    var sp = max > 0 ? Math.min(1, y / max) : 0;
    if (header) header.classList.toggle('scrolled', y > 12);
    if (bar) bar.style.setProperty('--sp', sp.toFixed(4));
    if (topBtn) { topBtn.classList.toggle('show', y > 500); topBtn.style.setProperty('--sp', sp.toFixed(4)); }
    if (stepsWrap) {
      var mark = window.innerHeight * 0.6, r = stepsWrap.getBoundingClientRect();
      stepsWrap.style.setProperty('--p', Math.min(1, Math.max(0, (mark - r.top - 24) / (r.height - 48))).toFixed(4));
      steps.forEach(function (s) { s.classList.toggle('passed', s.getBoundingClientRect().top + 24 < mark); });
    }
  }
  var ticking = false;
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { onScroll(); ticking = false; }); } }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
  if (topBtn) topBtn.addEventListener('click', function () { scrollToEl(0); });

  /* ---------- Mobilni meni ---------- */
  var mm = $('#mobilni-meni'), mmOpen = $('[data-menu-open]'), mmClose = $('[data-menu-close]');
  function setMenu(open) {
    if (!mm) return;
    mm.classList.toggle('open', open); mm.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (mmOpen) mmOpen.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
    if (lenis) { if (open) lenis.stop(); else lenis.start(); }
    if (open && mmClose) mmClose.focus();
  }
  if (mmOpen) mmOpen.addEventListener('click', function () { setMenu(true); });
  if (mmClose) mmClose.addEventListener('click', function () { setMenu(false); });

  /* ---------- Otvoreno / zatvoreno (beogradsko vreme) ---------- */
  (function () {
    var parts;
    try {
      parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Belgrade', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    } catch (e) { return; }
    var get = function (t) { var p = parts.filter(function (x) { return x.type === t; })[0]; return p ? p.value : ''; };
    var dayIdx = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    var mins = parseInt(get('hour'), 10) % 24 * 60 + parseInt(get('minute'), 10);
    var toMin = function (t) { var x = t.split(':'); return +x[0] * 60 + +x[1]; };
    var hours = {}; for (var d = 0; d < 7; d++) { var hh = RS.hours && RS.hours[d]; hours[d] = hh ? [toMin(hh[0]), toMin(hh[1])] : null; }
    var h = hours[dayIdx], open = h && mins >= h[0] && mins < h[1];
    var hhmm = function (m) { return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
    var text;
    if (open) text = 'Otvoreno · do ' + hhmm(h[1]);
    else {
      var names = ['nedelje', 'ponedeljka', 'utorka', 'srede', 'četvrtka', 'petka', 'subote'];
      for (var i = 0; i < 8; i++) {
        var dd = (dayIdx + i) % 7, hh = hours[dd];
        if (hh && (i > 0 || mins < hh[0])) { text = 'Zatvoreno · otvaramo ' + (i === 0 ? 'u ' : (i === 1 ? 'sutra u ' : 'od ' + names[dd] + ' u ')) + hhmm(hh[0]); break; }
      }
    }
    $$('[data-open-text]').forEach(function (el) { el.textContent = text; });
    $$('[data-open-dot]').forEach(function (el) { el.classList.toggle('off', !open); });
    var group = dayIdx >= 1 && dayIdx <= 5 ? '1' : String(dayIdx);
    $$('[data-hours] [data-day="' + group + '"]').forEach(function (el) { el.classList.add('today'); });
  })();

  /* ---------- Razbijanje naslova na reči ---------- */
  $$('.split').forEach(function (el) {
    var i = 0;
    (function walk(node) {
      $$(':scope > *', node).length; // noop for older engines
      Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) {
          var frag = document.createDocumentFragment();
          var gold = ch.parentNode.classList && ch.parentNode.classList.contains('gold');
          ch.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement('span'); w.className = 'w';
            var wi = document.createElement('span'); wi.className = 'wi' + (gold ? ' gold' : ''); wi.style.setProperty('--i', i++);
            wi.textContent = part; w.appendChild(wi); frag.appendChild(w);
          });
          ch.parentNode.replaceChild(frag, ch);
        } else if (ch.nodeType === 1) walk(ch);
      });
    })(el);
    $$('.gold', el).forEach(function (g) { if (!g.classList.contains('wi')) g.classList.remove('gold'); });
  });

  /* ---------- Pojavljivanje pri skrolovanju ---------- */
  var REVEAL = '.hero-copy > *:not(h1), .console, .stat, .section-head > *:not(.split), .tile, .card, .phase, .step, .faq-group > *, .cta > *:not(.split), ' +
    '.page-head > *:not(h1), .svc-hero > .illus-panel, .list-box, .range-row, .range-axis, .ba, .tip, .table-wrap, .info-list > li, .map-box, .wizard, ' +
    '.compare, .temp-pair, .calc, .review, .track-form, .track-result, .marquee-label, .newsletter, .footer-grid > div';
  var counters = $$('[data-count]');
  function runCounter(el) {
    var to = +el.getAttribute('data-count'), t0 = performance.now(), dur = 1800;
    (function f(now) { var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 4); el.textContent = fmt(to * e); if (p < 1) requestAnimationFrame(f); })(t0);
  }
  if (!reduce && 'IntersectionObserver' in window) {
    root.classList.add('js-reveal');
    var items = $$(REVEAL).concat($$('.split'));
    items.forEach(function (el) {
      if (!el.classList.contains('split')) el.classList.add('reveal');
      var i = 0, sib = el.previousElementSibling;
      while (sib && i < 6) { if (sib.classList.contains('reveal')) i++; sib = sib.previousElementSibling; }
      el.style.setProperty('--d', (i * 80) + 'ms');
    });
    // Radi u oba smera: element koji izađe sa ekrana se sakrije i ponovo pojavi
    // kad se vrati, klizeći iz smera iz kog dolazi (odozdo ili odozgo).
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var el = e.target;
        if (e.isIntersecting) { el.classList.add('in'); }
        else {
          var above = e.boundingClientRect.bottom <= (e.rootBounds ? e.rootBounds.top : 0) + 1;
          el.classList.remove('in');
          el.classList.toggle('from-top', above);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
    setTimeout(function () { items.forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('in'); }); }, 1600);
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !e.target._counted) { e.target._counted = true; runCounter(e.target); }
        else if (!e.isIntersecting) e.target._counted = false;
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { cio.observe(c); });
  }

  /* ---------- Svetlo koje prati miš, nagib, magnetna dugmad, kursor ---------- */
  if (finePointer && !reduce) {
    $$('.spot').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px'); el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
    $$('[data-tilt]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        el.style.transform = 'perspective(1100px) rotateY(' + (x * 8) + 'deg) rotateX(' + (-y * 8) + 'deg)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
    $$('.magnetic').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * .22) + 'px,' + ((e.clientY - r.top - r.height / 2) * .3) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
    var cursorEl = $('.cursor');
    if (cursorEl) {
      var cx = -100, cy = -100, tx = -100, ty = -100;
      window.addEventListener('pointermove', function (e) { tx = e.clientX; ty = e.clientY; cursorEl.classList.add('on'); }, { passive: true });
      document.addEventListener('pointerleave', function () { cursorEl.classList.remove('on'); });
      (function loop() { cx += (tx - cx) * .18; cy += (ty - cy) * .18; cursorEl.style.transform = 'translate(' + cx + 'px,' + cy + 'px)'; requestAnimationFrame(loop); })();
      document.addEventListener('pointerover', function (e) { cursorEl.classList.toggle('hover', !!e.target.closest('a, button, summary, label, input[type=range], select')); });
    }
  }

  /* ---------- Dijagnostička konzola (grafikon temperature) ---------- */
  var canvas = $('[data-chart]');
  if (canvas) {
    var ctx = canvas.getContext('2d'), pts = [], temp = 68, tempEl = $('[data-temp]'), fanEl = $('[data-fan]');
    for (var k = 0; k < 60; k++) { temp += (Math.random() - .5) * 2.2; temp = Math.max(62, Math.min(75, temp)); pts.push(temp); }
    var colors = {};
    var readColors = function () { var cs = getComputedStyle(canvas); colors.a = cs.getPropertyValue('--accent').trim(); colors.b = cs.getPropertyValue('--accent-2').trim(); colors.l = cs.getPropertyValue('--line').trim(); };
    readColors(); document.addEventListener('rs-theme', function () { setTimeout(function () { readColors(); draw(); }, 30); });
    var draw = function () {
      var w = canvas.clientWidth, h = canvas.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = colors.l; ctx.lineWidth = 1;
      for (var g = 1; g < 4; g++) { ctx.beginPath(); ctx.moveTo(0, h * g / 4); ctx.lineTo(w, h * g / 4); ctx.stroke(); }
      var y = function (v) { return h - 16 - (v - 55) / 30 * (h - 50); };
      var grad = ctx.createLinearGradient(0, 0, w, 0); grad.addColorStop(0, colors.b); grad.addColorStop(1, colors.a);
      ctx.beginPath();
      pts.forEach(function (v, i) { var x = i / (pts.length - 1) * w; if (i) ctx.lineTo(x, y(v)); else ctx.moveTo(x, y(v)); });
      ctx.strokeStyle = grad; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
      var fill = ctx.createLinearGradient(0, 0, 0, h); fill.addColorStop(0, colors.a + '40'); fill.addColorStop(1, colors.a + '00');
      ctx.fillStyle = fill; ctx.fill();
      var lx = w, ly = y(pts[pts.length - 1]);
      ctx.beginPath(); ctx.arc(lx - 3, ly, 4, 0, 7); ctx.fillStyle = colors.a; ctx.fill();
    };
    draw(); window.addEventListener('resize', draw);
    if (!reduce) {
      var visible = true;
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(canvas);
      setInterval(function () {
        if (!visible || document.hidden) return;
        temp += (Math.random() - .5) * 2.2; temp = Math.max(62, Math.min(75, temp));
        pts.push(temp); pts.shift(); draw();
        if (tempEl) tempEl.textContent = Math.round(temp) + ' °C';
        if (fanEl) fanEl.textContent = fmt(1700 + (temp - 62) * 40 + Math.random() * 30) + ' o/min';
      }, 450);
    }
  }

  /* ---------- Pre/posle klizač ---------- */
  $$('[data-compare]').forEach(function (c) {
    var input = $('input', c);
    var set = function () { c.style.setProperty('--pos', input.value + '%'); };
    input.addEventListener('input', set); set();
  });

  /* ---------- Pripovedanje postupka: aktivna je kartica koja stoji uz crtež ---------- */
  var storySteps = $$('[data-story]');
  if (storySteps.length) {
    var frameEls = $$('[data-frame]'), num = $('[data-story-num]'), stage = $('.story-stage'), storyCur = -1;
    var setStory = function (i) {
      if (i === storyCur) return; storyCur = i;
      storySteps.forEach(function (s, j) { s.classList.toggle('active', j === i); });
      frameEls.forEach(function (f, j) { f.classList.toggle('active', j === i); });
      if (num) num.textContent = '0' + (i + 1);
      if (stage) stage.style.setProperty('--sp', ((i + 1) / storySteps.length).toFixed(3));
    };
    var updateStory = function () {
      var st = stage.getBoundingClientRect(), vh = window.innerHeight;
      // Na širokom ekranu crtež stoji pored kartica: referentna linija je sredina crteža.
      // Na uskom ekranu crtež je iznad: linija je u prostoru ispod njega.
      var line = window.innerWidth >= 960 ? (st.top + st.bottom) / 2 : st.bottom + (vh - st.bottom) * 0.4;
      var best = 0, bestD = Infinity;
      storySteps.forEach(function (s, i) {
        var r = s.getBoundingClientRect(), d = line < r.top ? r.top - line : (line > r.bottom ? line - r.bottom : 0);
        if (d < bestD) { bestD = d; best = i; }
      });
      setStory(best);
    };
    window.addEventListener('scroll', function () { requestAnimationFrame(updateStory); }, { passive: true });
    window.addEventListener('resize', updateStory);
    updateStory();
  }

  /* ---------- Kalkulator ---------- */
  $$('[data-calc]').forEach(function (form) {
    var wrap = form.closest('.calc'), priceEl = $('[data-calc-price]', wrap), timeEl = $('[data-calc-time]', wrap), link = $('[data-calc-link]', wrap);
    var cur = [3500, 4500];
    var update = function () {
      var dev = (form.querySelector('[name=calc-dev]:checked') || {}).value || 'laptop';
      var iss = form.querySelector('[name=calc-issue]').value;
      var fast = ((form.querySelector('[name=calc-speed]:checked') || {}).value === 'fast');
      var m = RS.calc.devices[dev], d = RS.calc.issues[iss], f = fast ? 1.3 : 1;
      var target = [Math.round(d[0] * m * f / 100) * 100, Math.round(d[1] * m * f / 100) * 100];
      if (timeEl) timeEl.textContent = fast && d[2] !== 'isti dan' ? 'isti dan, ako je deo na stanju' : d[2];
      if (link) link.setAttribute('href', d[3]);
      var from = cur.slice(), t0 = performance.now();
      (function anim(now) {
        var p = reduce ? 1 : Math.min(1, (now - t0) / 600), e = 1 - Math.pow(1 - p, 3);
        cur = [from[0] + (target[0] - from[0]) * e, from[1] + (target[1] - from[1]) * e];
        priceEl.textContent = fmt(Math.round(cur[0] / 100) * 100) + '–' + fmt(Math.round(cur[1] / 100) * 100);
        if (p < 1) requestAnimationFrame(anim); else cur = target;
      })(t0);
    };
    if (RS.calc) { form.addEventListener('change', update); }
  });

  /* ---------- Recenzije ---------- */
  var track = $('[data-reviews]');
  if (track) {
    var step = function (dir) { var card = $('.review', track); var w = card ? card.getBoundingClientRect().width + 14 : 300; track.scrollBy({ left: dir * w, behavior: reduce ? 'auto' : 'smooth' }); };
    $$('[data-rev]').forEach(function (b) { b.addEventListener('click', function () { step(+b.getAttribute('data-rev')); }); });
    var hover = false; track.addEventListener('pointerenter', function () { hover = true; }); track.addEventListener('pointerleave', function () { hover = false; });
    if (!reduce) setInterval(function () {
      if (hover || document.hidden) return;
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 4) track.scrollTo({ left: 0, behavior: 'smooth' }); else step(1);
    }, 5000);
  }

  /* ---------- FAQ: glatko otvaranje i pretraga ---------- */
  $$('details').forEach(function (d) {
    var sum = $('summary', d), ans = $('.answer', d);
    if (!sum || !ans || reduce) return;
    sum.addEventListener('click', function (e) {
      e.preventDefault();
      if (d.open) {
        var a = ans.animate([{ height: ans.offsetHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 350, easing: 'cubic-bezier(.16,1,.3,1)' });
        a.onfinish = function () { d.open = false; };
      } else {
        d.open = true;
        ans.animate([{ height: '0px', opacity: 0 }, { height: ans.offsetHeight + 'px', opacity: 1 }], { duration: 450, easing: 'cubic-bezier(.16,1,.3,1)' });
      }
    });
  });
  var faqSearch = $('#faq-search');
  if (faqSearch) {
    var norm = function (s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'dj'); };
    faqSearch.addEventListener('input', function () {
      var q = norm(faqSearch.value.trim()), any = false;
      $$('[data-faq-group]').forEach(function (g) {
        var vis = 0;
        $$('details', g).forEach(function (d) { var hit = !q || norm(d.textContent).indexOf(q) > -1; d.hidden = !hit; if (hit) vis++; if (q && hit) d.open = true; });
        g.hidden = !vis; if (vis) any = true;
      });
      $('[data-faq-empty]').hidden = any;
    });
  }
  if (location.hash && /^#q-\d+$/.test(location.hash)) { var qd = $(location.hash); if (qd) qd.open = true; }

  /* ---------- Paleta komandi (Ctrl/⌘ K) ---------- */
  var pal = $('.palette'), palInput = $('#palette-input'), palList = $('#palette-list'), sel = 0, results = [];
  function renderPalette() {
    var q = palInput.value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    var all = RS.search || [];
    results = (q ? all.filter(function (r) { return (r.t + ' ' + r.d).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').indexOf(q) > -1; }) : all.filter(function (r) { return r.k !== 'Pitanje' && r.k !== 'Postupak'; })).slice(0, 9);
    sel = Math.min(sel, Math.max(0, results.length - 1));
    palList.innerHTML = results.length ? results.map(function (r, i) {
      return '<li role="option"' + (i === sel ? ' class="sel" aria-selected="true"' : '') + '><a href="' + r.u + '">' + r.t.replace(/</g, '&lt;') + '<em>' + r.k + '</em>' + (r.d ? '<small>' + r.d.replace(/</g, '&lt;') + '</small>' : '') + '</a></li>';
    }).join('') : '<li class="palette-empty">Nema rezultata za „' + palInput.value.replace(/</g, '&lt;') + '“</li>';
  }
  function openPalette() { if (!pal) return; pal.hidden = false; palInput.value = ''; sel = 0; renderPalette(); palInput.focus(); if (lenis) lenis.stop(); }
  function closePalette() { if (!pal || pal.hidden) return; pal.hidden = true; if (lenis) lenis.start(); }
  $$('[data-palette-open]').forEach(function (b) { b.addEventListener('click', openPalette); });
  if (pal) {
    pal.addEventListener('click', function (e) { if (e.target === pal) closePalette(); });
    palInput.addEventListener('input', function () { sel = 0; renderPalette(); });
    palInput.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { sel = Math.min(results.length - 1, sel + 1); renderPalette(); e.preventDefault(); }
      if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); renderPalette(); e.preventDefault(); }
      if (e.key === 'Enter' && results[sel]) { location.href = results[sel].u; }
    });
  }
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (pal && pal.hidden) openPalette(); else closePalette(); }
    if (e.key === '/' && pal && pal.hidden && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); openPalette(); }
    if (e.key === 'Escape') { closePalette(); setMenu(false); }
  });

  /* ---------- Komunikacija sa serverom ---------- */
  function api(method, path, body) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 12000);
    return fetch('/api/' + path, {
      method: method, headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined, signal: ctrl ? ctrl.signal : undefined, credentials: 'same-origin'
    }).then(function (r) {
      clearTimeout(timer);
      return r.json().catch(function () { return {}; }).then(function (data) { return { ok: r.ok, status: r.status, data: data }; });
    }, function () { clearTimeout(timer); return { ok: false, status: 0, data: {} }; });
  }
  var esc = function (x) { var d = document.createElement('div'); d.textContent = x == null ? '' : String(x); return d.innerHTML; };

  /* ---------- Status popravke ---------- */
  var DAYS = ['Ned', 'Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub'];
  function fmtTime(t) {
    if (!t) return '—';
    if (!/^\d{4}-\d\d-\d\dT/.test(t)) return t;
    try {
      var d = new Date(t), p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Belgrade', weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d);
      var g = function (k) { return (p.filter(function (x) { return x.type === k; })[0] || {}).value; };
      return DAYS[['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday'))] + ' ' + g('day') + '.' + g('month') + '. ' + g('hour') + ':' + g('minute');
    } catch (e) { return t; }
  }
  function renderOrder(code, o) {
    var st = RS.stages || [], stage = o.stage, times = o.times || [];
    var label = stage < 0 ? 'Termin zakazan' : stage === 2 ? 'Čeka vaše odobrenje' : stage === 7 ? 'Preuzet' : st[stage];
    var tl = '';
    for (var i = 0; i < st.length; i++) {
      if (i === 7 && stage !== 7) continue;
      var cls = (i < stage || (i === stage && (stage === 6 || stage === 7))) ? 'done' : (i === stage ? 'now' : '');
      tl += '<li class="' + cls + '"><span></span><span>' + esc(st[i]) + '</span><time>' + esc(fmtTime(times[i])) + '</time></li>';
    }
    var meta = [['Uređaj', o.device], ['Prijavljen kvar', o.issue], ['Dijagnoza', o.diag], ['Cena', o.price]].filter(function (m) { return m[1]; })
      .map(function (m) { return '<div><span>' + m[0] + '</span><b>' + esc(m[1]) + '</b></div>'; }).join('');
    var note = stage < 0 ? '<p class="lead">Uređaj još nije predat. Kada ga donesete, ovde ćete pratiti svaku fazu popravke.' + (o.slot ? ' Termin: <b>' + esc(o.slot) + '</b>.' : '') + '</p>' : '';
    return '<div class="tr-top"><div style="display:grid;gap:8px"><span class="eyebrow">' + esc(code) + (RS.demo && RS.demoOrders[code] ? ' <span class="probno">demo</span>' : '') + '</span><h2>' + esc(label) + '</h2></div>' +
      (o.eta ? '<span class="badge">● ' + esc(o.eta) + '</span>' : '') + '</div>' + (meta ? '<div class="tr-meta">' + meta + '</div>' : '') + note + (stage >= 0 ? '<ol class="tl">' + tl + '</ol>' : '');
  }
  var trackForm = $('[data-track]');
  if (trackForm) {
    var codeIn = $('#track-code'), out = $('[data-track-result]'), err = $('[data-track-err]'), trackBtn = $('button[type=submit]', trackForm);
    var showOrder = function (code, o) {
      codeIn.value = code; err.hidden = true;
      out.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: reduce ? 1 : 500, easing: 'cubic-bezier(.16,1,.3,1)' });
      out.innerHTML = renderOrder(code, o);
    };
    var showErr = function (msg) { err.textContent = msg; err.hidden = false; };
    var lookup = function (raw) {
      var code = String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
      if (!code) { showErr('Upišite broj radnog naloga.'); return; }
      if (/^[0-9A-Z]{4,6}$/.test(code)) code = 'RN-' + new Date().getFullYear() + '-' + code;
      if (RS.demo && RS.demoOrders && RS.demoOrders[code]) { showOrder(code, RS.demoOrders[code]); return; }
      trackBtn.disabled = true;
      api('GET', 'orders/' + encodeURIComponent(code)).then(function (r) {
        trackBtn.disabled = false;
        if (r.ok && r.data && r.data.order) showOrder(code, r.data.order);
        else if (r.status === 404) showErr('Nalog sa tim brojem nije pronađen. Proverite broj sa potvrde.');
        else if (r.status === 429) showErr('Previše pokušaja. Sačekajte minut pa probajte ponovo.');
        else showErr(RS.demo ? 'U demo verziji rade samo primeri ispod.' : 'Provera trenutno nije dostupna. Pozovite nas na ' + RS.phone + '.');
      });
    };
    trackForm.addEventListener('submit', function (e) { e.preventDefault(); lookup(codeIn.value); });
    $$('[data-code]').forEach(function (b) { b.addEventListener('click', function () { lookup(b.getAttribute('data-code')); }); });
    var qp = (location.hash.match(/^#(RN-[0-9]{4}-[0-9A-Z]{4,6})$/i) || [])[1];
    if (qp) lookup(qp); else if (codeIn.value) lookup(codeIn.value);
    window.addEventListener('hashchange', function () {
      var h = (location.hash.match(/^#(RN-[0-9]{4}-[0-9A-Z]{4,6})$/i) || [])[1];
      if (h) lookup(h);
    });
  }

  /* ---------- Čarobnjak za zakazivanje ---------- */
  var wz = $('[data-wizard]');
  if (wz) {
    var stepNo = 1, total = 4, sending = false;
    var pad = function (n) { return String(n).padStart(2, '0'); };
    var days = $('[data-days]'), timesEl = $('[data-times]'), slotNote = $('[data-slot-note]');
    var slotData = null; // termini sa servera: [{date, label, times:[{t, free}]}]
    var renderTimes = function () {
      var chosen = wz.querySelector('[name=wz-day]:checked'), html = '';
      if (slotData) {
        var day = chosen && slotData.filter(function (d) { return d.date === chosen.value; })[0];
        (day ? day.times : []).forEach(function (x, i) {
          html += '<label><input type="radio" name="wz-time" value="' + x.t + '"' + (i ? '' : ' checked') + '><span>' + x.t + '</span></label>';
        });
      } else {
        var dow = chosen ? +chosen.getAttribute('data-dow') : 1, hh = RS.hours && RS.hours[dow];
        if (hh) {
          var toMin = function (t) { var x = t.split(':'); return +x[0] * 60 + +x[1]; };
          for (var m = toMin(hh[0]); m <= toMin(hh[1]) - 60; m += 60) {
            var lab = pad(Math.floor(m / 60)) + ':' + pad(m % 60);
            html += '<label><input type="radio" name="wz-time" value="' + lab + '"' + (html ? '' : ' checked') + '><span>' + lab + '</span></label>';
          }
        }
      }
      timesEl.innerHTML = html;
    };
    var renderDays = function () {
      var html = '';
      if (slotData) {
        slotData.slice(0, 10).forEach(function (d, i) {
          html += '<label><input type="radio" name="wz-day" value="' + d.date + '" data-label="' + esc(d.label) + '"' + (i ? '' : ' checked') + '><span>' + esc(d.label) + '</span></label>';
        });
        if (!slotData.length && slotNote) slotNote.textContent = 'Trenutno nema slobodnih termina preko sajta. Pozovite nas ili dođite bez zakazivanja.';
      } else {
        var d0 = new Date(), added = 0;
        for (var i = 1; added < 6 && i < 21; i++) {
          var dt = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + i);
          if (!(RS.hours && RS.hours[dt.getDay()])) continue;
          var lab = DAYS[dt.getDay()] + ' ' + dt.getDate() + '.' + (dt.getMonth() + 1) + '.';
          var iso = dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate());
          html += '<label><input type="radio" name="wz-day" value="' + iso + '" data-label="' + lab + '" data-dow="' + dt.getDay() + '"' + (added === 0 ? ' checked' : '') + '><span>' + lab + '</span></label>';
          added++;
        }
      }
      days.innerHTML = html;
      renderTimes();
    };
    var loadSlots = function () {
      return api('GET', 'slots').then(function (r) { if (r.ok && r.data && Array.isArray(r.data.days)) slotData = r.data.days; renderDays(); });
    };
    if (days) { days.addEventListener('change', renderTimes); renderDays(); loadSlots(); }
    var val = function (n) { var el = wz.querySelector('[name=' + n + ']:checked'); return el ? el.value : ''; };
    var dayLabel = function () { var el = wz.querySelector('[name=wz-day]:checked'); return el ? el.getAttribute('data-label') : ''; };
    var collect = function () {
      return {
        device: val('wz-dev'), model: $('#wz-model').value.trim(),
        problems: $$('[name=wz-prob]:checked', wz).map(function (x) { return x.value; }),
        description: $('#wz-opis').value.trim(), day: val('wz-day'), time: val('wz-time'),
        name: $('#wz-ime').value.trim(), phone: $('#wz-tel').value.trim(), email: $('#wz-email').value.trim(),
        consent: $('#wz-consent').checked, website: $('#wz-web').value
      };
    };
    var summary = function () {
      var d = collect();
      var rows = [['Uređaj', d.device + (d.model ? ', ' + d.model : '')], ['Problem', d.problems.join(', ') || 'nije navedeno'], ['Termin', d.day ? dayLabel() + ' u ' + d.time : 'bez termina']];
      if (d.name) rows.push(['Ime', d.name]); if (d.phone) rows.push(['Telefon', d.phone]);
      return rows.map(function (r) { return '<div><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>'; }).join('');
    };
    var errEl = $('[data-wz-err]', wz), done = $('[data-wz-done]', wz), next = $('[data-wz-next]', wz);
    var render = function () {
      $$('.wz-step', wz).forEach(function (s) { s.hidden = +s.getAttribute('data-step') !== stepNo; });
      $$('.wz-progress i', wz).forEach(function (b, i) { b.classList.toggle('on', i < Math.min(stepNo, total)); });
      $('[data-wz-label]', wz).textContent = stepNo > total ? 'Gotovo' : 'Korak ' + stepNo + ' od ' + total;
      $('[data-wz-prev]', wz).hidden = stepNo === 1 || stepNo > total;
      next.hidden = stepNo > total;
      next.firstChild.nodeValue = stepNo === total ? 'Pošalji zahtev ' : 'Dalje ';
      if (stepNo === total) $('[data-wz-summary]', wz).innerHTML = summary();
      if (stepNo > total) done.focus();
    };
    var finish = function (html) { done.innerHTML = html; stepNo = total + 1; render(); };
    next.addEventListener('click', function () {
      if (stepNo < total) { stepNo++; render(); return; }
      if (sending) return;
      var d = collect(), msg = '';
      if (d.name.length < 2) msg = 'Upišite ime i prezime.';
      else if (d.phone.replace(/\D/g, '').length < 6) msg = 'Upišite ispravan broj telefona.';
      else if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) msg = 'E-pošta nije ispravna.';
      else if (!d.consent) msg = 'Potrebna je vaša saglasnost da bismo vas kontaktirali.';
      errEl.textContent = msg; errEl.hidden = !msg;
      if (msg) return;
      sending = true; next.disabled = true; next.firstChild.nodeValue = 'Šaljem… ';
      api('POST', 'bookings', d).then(function (r) {
        sending = false; next.disabled = false;
        var sum = '<div class="summary-list">' + summary() + '</div>';
        if (r.ok && r.data.code) {
          finish('<p class="eyebrow">Zahtev je primljen</p><h3 style="font-size:1.6rem">Hvala, ' + esc(d.name.split(' ')[0]) + '!</h3>' +
            '<p class="lead">Javićemo vam se da potvrdimo termin. Vaš broj naloga je:</p><div class="wz-code">' + esc(r.data.code) + '</div>' +
            '<p class="note">Sačuvajte ga. Sa njim pratite popravku na stranici <a class="link-arrow" href="status.html#' + esc(r.data.code) + '">Status popravke</a>.</p>' + sum);
        } else if (r.status === 409) {
          loadSlots().then(function () { stepNo = 3; render(); if (slotNote) slotNote.textContent = r.data.error; });
        } else if (r.status === 400 || r.status === 429) {
          errEl.textContent = r.data.error || 'Proverite unete podatke.'; errEl.hidden = false; render();
        } else if (RS.demo) {
          finish('<p class="eyebrow">Demo</p><h3 style="font-size:1.6rem">Hvala! Ovo je bio prikaz zakazivanja.</h3><p class="form-msg">Zahtev nije poslat jer ova demo verzija nema server. Na pravom sajtu ovde stiže broj radnog naloga, na primer RN-2026-7KQ4M.</p>' + sum);
        } else {
          errEl.textContent = 'Slanje nije uspelo. Pokušajte ponovo ili nas pozovite na ' + RS.phone + '.'; errEl.hidden = false; render();
        }
      });
    });
    $('[data-wz-prev]', wz).addEventListener('click', function () { stepNo--; errEl.hidden = true; render(); });
    render();
  }

  /* ---------- Sitnice ---------- */
  $$('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var label = btn.textContent, done = function () { btn.textContent = 'Kopirano'; setTimeout(function () { btn.textContent = label; }, 1500); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(btn.getAttribute('data-copy')).then(done, function () {});
    });
  });
  $$('[data-demo-form]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var m = f.nextElementSibling, input = $('input', f), btn = $('button', f), email = input.value.trim();
      var say = function (t, ok) { m.textContent = t; m.className = ok ? 'form-msg' : 'form-err'; m.hidden = false; };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { say('Upišite ispravnu adresu e-pošte.'); return; }
      btn.disabled = true;
      api('POST', 'newsletter', { email: email }).then(function (r) {
        btn.disabled = false;
        if (r.ok) { say('Hvala! Prijavljeni ste.', true); input.value = ''; }
        else if (RS.demo && r.status !== 400 && r.status !== 429) say('Ovo je demo, pa prijava nije poslata.', true);
        else say(r.data.error || 'Prijava trenutno nije uspela. Pokušajte kasnije.');
      });
    });
  });
  var cookie = $('.cookie');
  if (cookie && !store.get('rs-cookie')) {
    cookie.hidden = false;
    $('[data-cookie-ok]', cookie).addEventListener('click', function () { cookie.hidden = true; store.set('rs-cookie', '1'); });
  }
  var year = $('#godina'); if (year) year.textContent = new Date().getFullYear();
})();
