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
  function scrollToEl(target) {
    var y = target === 0 ? 0 : Math.max(0, absTop(target) - 92);
    if (lenis) lenis.scrollTo(y, { duration: 1.4 });
    else window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  }
  // Dolazak sa druge stranice na #deo: postavi deo tačno ispod menija
  if (location.hash && /^#[\w-]+$/.test(location.hash)) {
    var hashEl = document.getElementById(location.hash.slice(1));
    if (hashEl) setTimeout(function () {
      var y = Math.max(0, absTop(hashEl) - 92);
      if (lenis) lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
    }, 60);
  }
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
    var hours = { 0: null, 6: [600, 900] }; for (var d = 1; d <= 5; d++) hours[d] = [540, 1140];
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

  /* ---------- Status popravke ---------- */
  var trackForm = $('[data-track]');
  if (trackForm) {
    var codeIn = $('#track-code'), out = $('[data-track-result]'), err = $('[data-track-err]');
    var show = function (code) {
      code = code.trim().toUpperCase().replace(/\s+/g, '');
      if (/^\d{4}$/.test(code)) code = 'RN-2026-' + code;
      var html = RS.orders && RS.orders[code];
      err.hidden = !!html;
      if (!html) return;
      codeIn.value = code;
      out.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: reduce ? 1 : 500, easing: 'cubic-bezier(.16,1,.3,1)' });
      out.innerHTML = html;
    };
    trackForm.addEventListener('submit', function (e) { e.preventDefault(); show(codeIn.value); });
    $$('[data-code]').forEach(function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-code')); }); });
  }

  /* ---------- Čarobnjak za zakazivanje ---------- */
  var wz = $('[data-wizard]');
  if (wz) {
    var stepNo = 1, total = 4;
    var days = $('[data-days]');
    if (days) {
      var dn = ['Ned', 'Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub'], d0 = new Date(), added = 0, html = '';
      for (var i = 1; added < 6 && i < 14; i++) {
        var dt = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + i);
        if (dt.getDay() === 0) continue;
        var lab = dn[dt.getDay()] + ' ' + dt.getDate() + '.' + (dt.getMonth() + 1) + '.';
        html += '<label><input type="radio" name="wz-day" value="' + lab + '"' + (added === 0 ? ' checked' : '') + '><span>' + lab + '</span></label>';
        added++;
      }
      days.innerHTML = html;
    }
    var val = function (n) { var el = wz.querySelector('[name=' + n + ']:checked'); return el ? el.value : '—'; };
    var summary = function () {
      var probs = $$('[name=wz-prob]:checked', wz).map(function (x) { return x.value; }).join(', ') || 'nije navedeno';
      var rows = [['Uređaj', val('wz-dev') + ($('#wz-model').value ? ', ' + $('#wz-model').value : '')], ['Problem', probs], ['Termin', val('wz-day') + ' u ' + val('wz-time')]];
      var nm = $('#wz-ime').value, tel = $('#wz-tel').value;
      if (nm) rows.push(['Ime', nm]); if (tel) rows.push(['Telefon', tel]);
      return rows.map(function (r) { var d = document.createElement('div'); var a = document.createElement('span'); a.textContent = r[0]; var b = document.createElement('b'); b.textContent = r[1]; d.appendChild(a); d.appendChild(b); return d.outerHTML; }).join('');
    };
    var render = function () {
      $$('.wz-step', wz).forEach(function (s) { s.hidden = +s.getAttribute('data-step') !== stepNo; });
      $$('.wz-progress i', wz).forEach(function (b, i) { b.classList.toggle('on', i < Math.min(stepNo, total)); });
      $('[data-wz-label]', wz).textContent = stepNo > total ? 'Gotovo' : 'Korak ' + stepNo + ' od ' + total;
      $('[data-wz-prev]', wz).hidden = stepNo === 1 || stepNo > total;
      var next = $('[data-wz-next]', wz);
      next.hidden = stepNo > total;
      next.firstChild.nodeValue = stepNo === total ? 'Potvrdi termin ' : 'Dalje ';
      if (stepNo === total) $('[data-wz-summary]', wz).innerHTML = summary();
      if (stepNo > total) { $('[data-wz-summary2]', wz).innerHTML = summary(); $('[data-step="5"]', wz).focus(); }
    };
    $('[data-wz-next]', wz).addEventListener('click', function () {
      if (stepNo === total) {
        var ok = $('#wz-ime').value.trim() && $('#wz-tel').value.trim();
        $('[data-wz-err]', wz).hidden = !!ok;
        if (!ok) return;
      }
      stepNo++; render();
    });
    $('[data-wz-prev]', wz).addEventListener('click', function () { stepNo--; render(); });
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
    f.addEventListener('submit', function (e) { e.preventDefault(); var m = f.nextElementSibling; if (m) { m.hidden = false; m.focus(); } });
  });
  var cookie = $('.cookie');
  if (cookie && !store.get('rs-cookie')) {
    cookie.hidden = false;
    $('[data-cookie-ok]', cookie).addEventListener('click', function () { cookie.hidden = true; store.set('rs-cookie', '1'); });
  }
  var year = $('#godina'); if (year) year.textContent = new Date().getFullYear();
})();
