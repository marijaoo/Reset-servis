(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mobilni meni
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('glavni-meni');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.textContent = open ? 'Zatvori' : 'Meni';
    });
  }

  // Glatko pojavljivanje sadržaja pri skrolovanju
  var REVEAL = '.hero-copy > *, .ticket, .facts, .section-head, .card, .phase, .step, .faq-group > *, .cta, ' +
    '.page-head > *, .svc-hero > *, .list-box, .range-row, .range-axis, .ba, .tip, .table-wrap, .info-list > li, .map-box, form.panel, .illus-panel';
  if (!reduce && 'IntersectionObserver' in window) {
    root.classList.add('js-reveal');
    var items = Array.prototype.slice.call(document.querySelectorAll(REVEAL));
    items.forEach(function (el) {
      el.classList.add('reveal');
      // Stepenasto kašnjenje za elemente u istom redu
      var i = 0, sib = el.previousElementSibling;
      while (sib && i < 6) { if (sib.matches(REVEAL)) i++; sib = sib.previousElementSibling; }
      el.style.setProperty('--d', (i * 90) + 'ms');
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
    // Sigurnosna mreža: ništa ne sme ostati skriveno
    setTimeout(function () {
      items.forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('in');
      });
    }, 1200);
  }

  // Linija napretka kroz korake postupka
  var stepsWrap = document.querySelector('.steps-wrap');
  var steps = document.querySelectorAll('.step');
  function updateSteps() {
    if (!stepsWrap) return;
    var mark = window.innerHeight * 0.6;
    var r = stepsWrap.getBoundingClientRect();
    var p = Math.min(1, Math.max(0, (mark - r.top - 24) / (r.height - 48)));
    stepsWrap.style.setProperty('--p', p.toFixed(4));
    steps.forEach(function (s) { s.classList.toggle('passed', s.getBoundingClientRect().top + 24 < mark); });
  }

  // Strelica za povratak na vrh, sa prstenom koji pokazuje koliko je stranice pređeno
  var topBtn = document.querySelector('.to-top');
  function onScroll() {
    if (topBtn) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      topBtn.classList.toggle('show', window.scrollY > 400);
      topBtn.style.setProperty('--sp', max > 0 ? (window.scrollY / max).toFixed(3) : 0);
    }
    updateSteps();
  }
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(function () { onScroll(); ticking = false; }); }
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
  if (topBtn) topBtn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });

  // Kopiranje telefona / e-pošte
  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      var label = btn.textContent;
      var done = function () { btn.textContent = 'Kopirano'; setTimeout(function () { btn.textContent = label; }, 1500); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {});
      }
    });
  });

  // Demo forma: ništa se ne šalje
  var form = document.getElementById('forma-prijava');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = document.getElementById('forma-poruka');
      msg.hidden = false;
      msg.focus();
    });
  }

  var year = document.getElementById('godina');
  if (year) year.textContent = new Date().getFullYear();
})();
