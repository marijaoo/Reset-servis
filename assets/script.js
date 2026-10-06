(function () {
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

  // Strelica za povratak na vrh
  var topBtn = document.querySelector('.to-top');
  if (topBtn) {
    var onScroll = function () { topBtn.classList.toggle('show', window.scrollY > 400); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    topBtn.addEventListener('click', function () { window.scrollTo({ top: 0 }); });
  }

  // Kopiranje telefona / e-pošte
  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      var done = function () { var t = btn.textContent; btn.textContent = 'Kopirano'; setTimeout(function () { btn.textContent = t; }, 1500); };
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
