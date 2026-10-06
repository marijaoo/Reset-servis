"""Generiše sve HTML stranice sajta i indeks za pretragu. Pokretanje: python3 tools/build.py"""
import json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from illus import SERVICE as SVC_ILLUS, PHASE as PHASE_ILLUS, PHASE_ICONS, fan_scene, MAP_ART
from data import ICONS, SERVICES, STEPS, faq as FAQ

OUT = pathlib.Path(__file__).resolve().parent.parent
BY_SLUG = {s["slug"]: s for s in SERVICES}

def rsd(n): return f"{n:,}".replace(",", ".")
def href(s): return f'{s["slug"]}.html'
def low(s): return min(p[1] for p in s["prices"])
def high(s): return max(p[2] for p in s["prices"])

ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
ARROW_UP_RIGHT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg>'
CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'
SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>'
SUN = '<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
MOON = '<svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>'
MENU = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 8h16M4 16h16"/></svg>'
CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'

NAV = [("usluge.html", "Usluge"), ("postupak.html", "Postupak"), ("status.html", "Status popravke"), ("pitanja.html", "Pitanja"), ("kontakt.html", "Kontakt")]

def head(title, desc):
    return f'''<!doctype html>
<html lang="sr-Latn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#0b6e8a">
<script>(function(){{var r=document.documentElement;try{{var t=localStorage.getItem('rs-theme');if(t)r.setAttribute('data-theme',t);}}catch(e){{}}try{{if(!sessionStorage.getItem('rs-loaded')&&!matchMedia('(prefers-reduced-motion: reduce)').matches){{r.classList.add('show-loader');sessionStorage.setItem('rs-loaded','1');}}}}catch(e){{}}}})();</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@300..700&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap">
<link rel="stylesheet" href="assets/style.css">
<style>.loader{{display:none}}.show-loader .loader{{display:grid;animation:loader-failsafe 0s linear 3s forwards}}@keyframes loader-failsafe{{to{{visibility:hidden}}}}</style>
</head>
<body>'''

def mega():
    links = "".join(f'<a href="{href(s)}"><span class="mi">{ICONS[s["icon"]]}</span><strong>{s["title"]}</strong><span>od {rsd(low(s))} RSD · {s["time"]}</span></a>' for s in SERVICES)
    return f'<div class="mega" role="menu">{links}<a class="mega-all" href="usluge.html"><span>Sve usluge i cenovnik</span>{ARROW}</a></div>'

def header(current):
    def cur(h): return ' aria-current="page"' if h == current else ""
    items = f'<div class="nav-item"><a href="usluge.html"{cur("usluge.html")}>Usluge {CHEV}</a>{mega()}</div>'
    items += "".join(f'<a href="{h}"{cur(h)}>{l}</a>' for h, l in NAV[1:])
    mm = "".join(f'<a href="{h}" style="transition-delay:{120+i*60}ms"><small>0{i+1}</small>{l}</a>' for i, (h, l) in enumerate([("index.html", "Početna")] + NAV))
    return f'''
<div class="loader" aria-hidden="true"><div class="loader-inner"><span class="logo-mark">R/</span><div class="loader-count" data-loader-count>0</div><div class="loader-line"><i data-loader-line></i></div></div></div>
<div class="progress-bar" aria-hidden="true"></div>
<div class="demo-bar" role="note">
  <div class="wrap"><span class="tag">Demo</span> Ovo je probni sajt. Naziv, adresa, telefon, cene, ocene i recenzije su izmišljeni podaci za pregled.</div>
</div>
<header class="site-header">
  <div class="wrap nav-row">
    <a class="logo" href="index.html" aria-label="Reset servis, početna"><span class="logo-mark">R/</span>Reset servis</a>
    <nav class="nav" aria-label="Glavni meni">{items}</nav>
    <div class="nav-tools">
      <a class="status-link" href="kontakt.html"><span class="dot" data-open-dot></span><span data-open-text>Pon–Pet 09–19 h</span></a>
      <button class="search-btn" type="button" data-palette-open aria-label="Pretraži sajt">{SEARCH}<span class="label">Pretraga</span><kbd>Ctrl K</kbd></button>
      <button class="icon-btn theme-btn" type="button" data-theme-toggle aria-label="Promeni svetlu ili tamnu temu">{SUN}{MOON}</button>
      <a class="btn btn-primary btn-sm magnetic" href="kontakt.html">Prijavi kvar</a>
      <button class="icon-btn menu-btn" type="button" data-menu-open aria-label="Otvori meni" aria-expanded="false" aria-controls="mobilni-meni">{MENU}</button>
    </div>
  </div>
</header>
<div class="mobile-menu" id="mobilni-meni" aria-hidden="true">
  <div class="mm-top"><a class="logo" href="index.html"><span class="logo-mark">R/</span>Reset servis</a><button class="icon-btn" type="button" data-menu-close aria-label="Zatvori meni">{CLOSE}</button></div>
  <nav class="mm-links" aria-label="Mobilni meni">{mm}</nav>
  <div class="mm-foot"><a class="btn btn-primary" href="kontakt.html">Prijavi kvar {ARROW}</a><span>+381 11 000 0000 <span class="probno">probno</span></span></div>
</div>
'''

def footer():
    svc = "".join(f'<li><a href="{href(s)}">{s["title"]}</a></li>' for s in SERVICES[:6])
    return f'''
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-top">
      <div class="newsletter">
        <h3>Saveti za duži život vašeg laptopa</h3>
        <p>Jednom mesečno: kako da čuvate bateriju, kada da očistite ventilator i šta da radite kad prospete kafu.</p>
        <form class="nl-row" data-demo-form novalidate><input id="nl-email" type="email" placeholder="vasa@adresa.rs" aria-label="Vaša e-pošta" autocomplete="email"><button class="btn btn-ghost" type="submit">Prijavi se</button></form>
        <p class="form-msg" tabindex="-1" hidden>Ovo je demo, pa prijava nije poslata.</p>
      </div>
      <div class="footer-grid">
        <div><h3>Usluge</h3><ul>{svc}<li><a href="usluge.html">Sve usluge →</a></li></ul></div>
        <div><h3>Servis</h3><ul><li><a href="postupak.html">Postupak</a></li><li><a href="status.html">Status popravke</a></li><li><a href="pitanja.html">Česta pitanja</a></li><li><a href="kontakt.html">Zakazivanje</a></li></ul></div>
        <div><h3>Kontakt <span class="probno">probno</span></h3><ul><li>Bulevar kralja Aleksandra 000</li><li>11000 Beograd</li><li>+381 11 000 0000</li><li>servis@primer.rs</li></ul></div>
        <div><h3>Radno vreme <span class="probno">probno</span></h3><ul><li>Pon–Pet: 09–19 h</li><li>Subota: 10–15 h</li><li>Nedelja: zatvoreno</li></ul></div>
      </div>
    </div>
    <div class="wordmark" aria-hidden="true">Reset servis</div>
    <div class="footer-bottom"><span>© <span id="godina">2026</span> Reset servis. Demo sajt, svi podaci su probni.</span><span>Beograd, Srbija</span></div>
  </div>
</footer>
<div class="action-bar"><a class="btn btn-ghost" href="kontakt.html">Kontakt</a><a class="btn btn-primary" href="kontakt.html#zakazivanje">Prijavi kvar</a></div>
<button class="to-top" type="button" aria-label="Vrati se na vrh stranice">
  <svg class="ring" viewBox="0 0 58 58" aria-hidden="true"><circle cx="29" cy="29" r="27"/></svg>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
</button>
<div class="cookie" hidden role="dialog" aria-label="Kolačići"><strong>Kolačići</strong><span>Demo sajt pamti samo izbor teme i da ste videli ovu poruku, u vašem pregledaču.</span><div class="btn-row"><button class="btn btn-primary btn-sm" type="button" data-cookie-ok>U redu</button></div></div>
<div class="palette" hidden role="dialog" aria-modal="true" aria-label="Pretraga sajta">
  <div class="palette-box">
    <div class="palette-search">{SEARCH}<input id="palette-input" type="text" placeholder="Pretražite usluge, pitanja, stranice..." autocomplete="off" aria-controls="palette-list"><span class="kbd">Esc</span></div>
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
'''

def page(fname, title, desc, body, nav=None):
    (OUT / fname).write_text(head(title, desc) + header(nav or fname) + "<main>\n" + body + "\n</main>\n" + footer(), encoding="utf-8")

def pagehead(crumb, h1, lead, extra=""):
    return f'''<section class="wrap page-head">
  <p class="crumbs"><a href="index.html">Početna</a> / {crumb}</p>
  <h1 class="split">{h1}</h1>
  <p class="lead">{lead}</p>{extra}
</section>'''

def cta(h="Opišite kvar. Javljamo vam procenu istog dana.", p="Pošaljite kratak opis problema i model uređaja, ili zakažite termin za dva minuta.", btn="Zakaži servis"):
    return f'''<section class="section-tight">
  <div class="wrap"><div class="cta"><p class="eyebrow">Spremni kad i vi</p><h2 class="split">{h}</h2><p class="lead">{p}</p><div class="btn-row"><a class="btn btn-primary magnetic" href="kontakt.html#zakazivanje">{btn} {ARROW}</a><a class="btn btn-ghost" href="status.html">Proveri status popravke</a></div></div></div>
</section>'''

def svc_card(s):
    return f'''      <a class="card spot" href="{href(s)}"><div class="icon">{ICONS[s["icon"]]}</div><h3>{s["title"]}</h3><p>{s["short"]}</p><div class="meta"><span>od {rsd(low(s))} RSD</span><span>{s["time"]}</span></div><span class="more">Detaljnije →</span></a>'''

def tile(s, cls, big=False):
    illus = f'<div class="tile-illus">{SVC_ILLUS[s["icon"]]}</div>' if big else ""
    icon = "" if big else f'<div class="tile-icon">{ICONS[s["icon"]]}</div>'
    return f'''      <a class="tile spot {cls}" href="{href(s)}"><span class="arrow">{ARROW_UP_RIGHT}</span>{icon}<h3>{s["title"]}</h3><p>{s["long"] if big else s["short"]}</p>{illus}<div class="tile-meta"><span>od <b>{rsd(low(s))} RSD</b></span><span>{s["time"]}</span></div></a>'''

# ---------- Kalkulator ----------
CALC_DEVICES = [("laptop", "Laptop", 1.0), ("gaming", "Gejming laptop", 1.25), ("mac", "MacBook", 1.35), ("desktop", "Desktop", 0.85)]
CALC_ISSUES = [
 ("ciscenje", "Pregrevanje, čišćenje i pasta", 3500, 4500, "24 h", "ciscenje-i-pasta"),
 ("ekran", "Zamena ekrana", 9900, 15000, "1–3 dana", "ekrani-i-tastature"),
 ("ne-pali", "Ne pali se / ne puni", 4000, 12000, "1–5 dana", "popravka-laptopova"),
 ("tecnost", "Prosuta tečnost", 4500, 9000, "2–5 dana", "prosuta-tecnost"),
 ("sistem", "Instalacija sistema i virusi", 2500, 3500, "isti dan", "podaci-i-sistem"),
 ("ssd", "SSD nadogradnja (sa diskom)", 6500, 9000, "isti dan", "nadogradnja"),
 ("konektor", "Konektor za punjenje", 6000, 9000, "2–3 dana", "lemljenje-i-bga"),
 ("tastatura", "Zamena tastature", 4900, 9000, "1–2 dana", "ekrani-i-tastature"),
]
def calculator():
    dev = "".join(f'<label><input type="radio" name="calc-dev" value="{k}"{" checked" if i == 0 else ""}><span>{l}</span></label>' for i, (k, l, _) in enumerate(CALC_DEVICES))
    opts = "".join(f'<option value="{k}">{l}</option>' for k, l, *_ in CALC_ISSUES)
    return f'''<div class="calc" id="kalkulator">
  <div class="calc-inner">
    <form class="calc-form" data-calc novalidate>
      <fieldset class="calc-group"><legend>1 · Uređaj</legend><div class="seg">{dev}</div></fieldset>
      <div class="calc-group"><label for="calc-issue">2 · Problem</label><select id="calc-issue" name="calc-issue">{opts}</select></div>
      <fieldset class="calc-group"><legend>3 · Brzina</legend><div class="seg"><label><input type="radio" name="calc-speed" value="std" checked><span>Standardno</span></label><label><input type="radio" name="calc-speed" value="fast"><span>Hitno, isti dan (+30%)</span></label></div></fieldset>
    </form>
    <div class="calc-out" aria-live="polite">
      <div style="display:grid;gap:10px"><span class="eyebrow">Okvirna cena <span class="probno">probno</span></span>
      <div class="calc-price"><span data-calc-price>3.500–4.500</span><small>RSD</small></div></div>
      <div class="calc-lines"><div><span>Rok</span><b data-calc-time>24 h</b></div><div><span>Dijagnostika</span><b>0 RSD uz popravku</b></div><div><span>Garancija</span><b>6 meseci</b></div></div>
      <div class="btn-row"><a class="btn btn-primary" href="kontakt.html#zakazivanje">Zakaži {ARROW}</a><a class="btn btn-ghost" data-calc-link href="ciscenje-i-pasta.html">O usluzi</a></div>
    </div>
  </div>
</div>'''

def phase_strip(link=True):
    items = ""
    for i, (h, short, t, d, e) in enumerate(STEPS):
        hr = f"postupak.html#korak-{i+1}" if link else f"#korak-{i+1}"
        items += f'<li><a class="phase" href="{hr}"><span class="phase-icon">{PHASE_ICONS[i]}</span><strong>{short}</strong><span>{t}</span></a></li>'
    return f'<div class="phases-scroll"><ol class="phases" aria-label="Faze servisiranja">{items}</ol></div>'

def compare(cid):
    return f'''<div class="compare" data-compare>
  <div class="layer before">{fan_scene(True)}</div>
  <div class="layer after">{fan_scene(False)}</div>
  <span class="cmp-label l">Pre · 96 °C</span><span class="cmp-label r">Posle · 71 °C</span>
  <input id="{cid}" type="range" min="0" max="100" value="50" aria-label="Pomerite da uporedite ventilator pre i posle čišćenja">
  <div class="handle"></div>
</div>'''

REVIEWS = [
 ("MJ", "Milica J.", "Vračar", "Laptop se gasio usred rada. Sutradan je bio gotov, tih i hladan. Dobila sam i fotografije pre i posle čišćenja."),
 ("NP", "Nikola P.", "Novi Beograd", "Prosuo sam kafu na tastaturu u ponedeljak. U sredu je laptop radio, a podaci su ostali netaknuti."),
 ("AS", "Ana S.", "Zvezdara", "Jasna procena pre popravke i tačno ta cena na računu. Tako treba da izgleda servis."),
 ("DM", "Dušan M.", "Zemun", "Ugradili su SSD i prebacili ceo sistem. Stari računar se sada pali za desetak sekundi."),
 ("JK", "Jelena K.", "Voždovac", "Za našu kancelariju održavaju 8 računara. Kad nešto stane, dođu isti dan."),
 ("SR", "Stefan R.", "Palilula", "Zamenili su konektor za punjenje umesto cele ploče. Platio sam trećinu cene koju su mi drugde tražili."),
]
def reviews():
    cards = "".join(f'<figure class="review"><blockquote>„{t}“</blockquote><footer><span class="av">{i}</span><div>{n}<span>{loc} · <span class="probno">probna recenzija</span></span></div></footer></figure>' for i, n, loc, t in REVIEWS)
    return f'''<div class="reviews">
  <div class="section-head head-split"><div style="display:grid;gap:18px"><p class="eyebrow">Utisci klijenata <span class="probno">probno</span></p><h2 class="split">Šta kažu ljudi kojima smo <span class="serif gold">vratili</span> laptop.</h2></div>
  <div style="display:grid;gap:16px;justify-items:start"><p class="lead">Primeri recenzija za demo. Na pravom sajtu ovde bi bile stvarne ocene sa Google profila.</p><div class="review-nav"><button class="icon-btn" type="button" data-rev="-1" aria-label="Prethodna recenzija"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg></button><button class="icon-btn" type="button" data-rev="1" aria-label="Sledeća recenzija">{ARROW}</button></div></div></div>
  <div class="review-track" data-reviews tabindex="0" aria-label="Recenzije">{cards}</div>
</div>'''

def faq_details(items, start=0):
    out = ""
    for j, (q, a) in enumerate(items):
        out += f'<details id="q-{start+j+1}"><summary>{q}</summary><div class="answer"><p>{a}</p></div></details>'
    return out

BRANDS = ["Lenovo", "Dell", "HP", "ASUS", "Acer", "Apple MacBook", "MSI", "Samsung", "Huawei", "Microsoft Surface", "Razer", "Toshiba"]

# ================= POČETNA =================
story = ""
frames = ""
dots = ""
for i, (h, short, t, d, e) in enumerate(STEPS):
    act = " active" if i == 0 else ""
    story += f'<li class="story-step{act}" data-story="{i}"><span class="num">0{i+1} — {t}</span><h3>{h}</h3><p>{d}</p><ul>{"".join(f"<li>{x}</li>" for x in e)}</ul></li>'
    frames += f'<div class="frame{act}" data-frame="{i}">{PHASE_ILLUS[i]}</div>'
    dots += f'<li><button type="button" data-goto="{i}"{" class=\"on\"" if i == 0 else ""} aria-label="Faza {i+1}: {short}">0{i+1}</button></li>'

all_q = [qa for _, items in FAQ for qa in items]
marq = "".join(f"<span>{b}</span>" for b in BRANDS)
home = f'''
<section class="hero">
  <div class="aurora" aria-hidden="true"><span></span><span></span><span></span></div>
  <div class="grid-lines" aria-hidden="true"></div>
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <span class="pill"><span class="dot" data-open-dot></span><b data-open-text>Servis laptopova i računara</b><span>· Beograd</span></span>
      <h1 class="split">Vaš laptop. <span class="serif gold">Kao nov.</span> Već sutra.</h1>
      <p class="lead">Besplatna dijagnostika, tačna cena pre popravke i 6 meseci garancije. Većinu kvarova rešavamo za 24 do 72 sata, uz test pod opterećenjem pre nego što vam vratimo uređaj.</p>
      <div class="btn-row">
        <a class="btn btn-primary magnetic" href="kontakt.html#zakazivanje">Zakaži servis {ARROW}</a>
        <a class="btn btn-ghost magnetic" href="#kalkulator">Izračunaj cenu</a>
      </div>
      <div class="trust-row">
        <span class="avatars" aria-hidden="true"><span>MJ</span><span>NP</span><span>AS</span></span>
        <span><span class="stars" aria-hidden="true">★★★★★</span> 4,9 od 5 · 2.400+ popravki <span class="probno">probno</span></span>
      </div>
    </div>
    <div class="console" data-tilt>
      <span class="float-chip c2"><span class="dot"></span>Garancija 6 meseci</span>
      <div class="console-inner">
        <div class="console-top"><div class="lights" aria-hidden="true"><i></i><i></i><i></i></div><span>RN-2026-0417 · dijagnostika uživo</span><span class="probno">demo</span></div>
        <div class="console-chart"><div class="readout"><span>CPU temperatura</span><b data-temp>68 °C</b></div><span class="badge">● Stabilno</span><canvas data-chart role="img" aria-label="Grafikon temperature procesora tokom testa"></canvas></div>
        <div class="checks"><div>Napajanje <b>OK</b></div><div>SSD 512 GB <b>OK</b></div><div>RAM 16 GB <b>OK</b></div><div>Ventilator <b class="run" data-fan>1.850 o/min</b></div></div>
        <div><div class="console-top" style="margin-bottom:8px"><span>Stres test procesora i grafike</span><span data-pct>u toku</span></div><div class="console-bar"><i></i></div></div>
      </div>
      <span class="float-chip c1">✓ Procena: 3.500 RSD</span>
    </div>
  </div>
</section>

<section aria-label="Proizvođači">
  <p class="marquee-label">Popravljamo uređaje svih proizvođača</p>
  <div class="marquee"><div class="marquee-track">{marq}{marq}</div></div>
</section>

<section class="section-tight">
  <div class="wrap">
    <div class="stats">
      <div class="stat"><strong><span data-count="2400">2.400</span><small>+</small></strong><span>popravljenih uređaja <span class="probno">probno</span></span></div>
      <div class="stat"><strong><span data-count="24">24</span><small>h</small></strong><span>prosečan rok za čišćenje i sistem</span></div>
      <div class="stat"><strong><span data-count="6">6</span><small>mes.</small></strong><span>garancija na rad i delove</span></div>
      <div class="stat"><strong><span data-count="98">98</span><small>%</small></strong><span>popravki bez zamene ploče <span class="probno">probno</span></span></div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head head-split">
      <div style="display:grid;gap:18px"><p class="eyebrow">Usluge</p><h2 class="split">Sve što vašem računaru treba, <span class="serif gold">na jednom mestu.</span></h2></div>
      <p class="lead">Kliknite na uslugu za detaljan opis, grafikon raspona cena i rokove.</p>
    </div>
    <div class="bento">
{tile(BY_SLUG["ciscenje-i-pasta"], "t-a", big=True)}
{tile(BY_SLUG["popravka-laptopova"], "t-b")}
{tile(BY_SLUG["ekrani-i-tastature"], "t-c")}
{tile(BY_SLUG["prosuta-tecnost"], "t-d")}
{tile(BY_SLUG["nadogradnja"], "t-e")}
      <a class="tile spot t-f t-all" href="usluge.html"><span class="arrow">{ARROW_UP_RIGHT}</span><p class="eyebrow">Još 4 usluge</p><h3>Servis računara, podaci, lemljenje i održavanje za firme.</h3><span class="link-arrow">Sve usluge {ARROW}</span></a>
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap compare-wrap">
    <div style="display:grid;gap:22px">
      <p class="eyebrow">Pre i posle</p>
      <h2 class="split">Razlika se <span class="serif gold">vidi</span> i meri.</h2>
      <p class="lead">Povucite klizač. Prašina i osušena pasta mogu da podignu temperaturu procesora i za 25 °C. Posle čišćenja laptop je tiši, hladniji i brži.</p>
      <div class="temp-pair"><div class="hot"><span>Pre čišćenja</span><b>96 °C</b></div><div class="cool"><span>Posle čišćenja</span><b>71 °C</b></div></div>
      <p class="note">Primer merenja za demo <span class="probno">probno</span></p>
    </div>
    {compare("cmp-home")}
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="section-head head-split">
      <div style="display:grid;gap:18px"><p class="eyebrow">Postupak</p><h2 class="split">Sedam faza. <span class="serif gold">Nijedno iznenađenje.</span></h2></div>
      <p class="lead">Skrolujte kroz ceo put vašeg uređaja, od prijave do preuzimanja.</p>
    </div>
    <div class="story">
      <div class="story-stage" aria-hidden="true">{frames}<span class="story-count"><b data-story-num>01</b> / 07</span><span class="story-bar"></span></div>
      <ol class="story-steps">{story}</ol>
    </div>
    <p class="note"><a class="link-arrow" href="postupak.html">Detaljan postupak servisiranja {ARROW}</a></p>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="section-head head-split">
      <div style="display:grid;gap:18px"><p class="eyebrow">Kalkulator</p><h2 class="split">Koliko će koštati? <span class="serif gold">Izračunajte</span> za 10 sekundi.</h2></div>
      <p class="lead">Izaberite uređaj i problem. Tačnu cenu potvrđujemo posle besplatne dijagnostike, pre početka rada.</p>
    </div>
    {calculator()}
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap">{reviews()}</div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="section-head head-split">
      <div style="display:grid;gap:18px"><p class="eyebrow">Česta pitanja</p><h2 class="split">Pre nego što <span class="serif gold">pitate.</span></h2></div>
      <a class="link-arrow" href="pitanja.html">Sva pitanja {ARROW}</a>
    </div>
    <div class="faq-group">{faq_details(all_q[:5])}</div>
  </div>
</section>
{cta()}
'''
page("index.html", "Reset servis", "Demo sajt servisa laptopova i računara u Beogradu.", home)

# ================= USLUGE =================
cards = "\n".join(svc_card(s) for s in SERVICES)
rows = ""
for s in SERVICES:
    for name, lo, hi in s["prices"]:
        rows += f'<tr><td><a href="{href(s)}"><strong>{name}</strong></a><br><span style="color:var(--muted);font-size:.88rem">{s["title"]}</span></td><td class="num">{rsd(lo)}–{rsd(hi)} RSD</td><td class="num">{s["time"]}</td></tr>\n'
usl = pagehead("Usluge i cene", 'Usluge i <span class="serif gold">cene</span>', "Devet oblasti u kojima radimo svakog dana. Kliknite na uslugu za opis, šta je uključeno i grafikon raspona cena.") + f'''
<section class="section-tight">
  <div class="wrap"><div class="cards">
{cards}
  </div></div>
</section>
<section class="section">
  <div class="wrap">
    <div class="section-head head-split"><div style="display:grid;gap:18px"><p class="eyebrow">Kalkulator</p><h2 class="split">Izračunajte <span class="serif gold">okvirnu</span> cenu.</h2></div><p class="lead">Tačnu cenu dobijate posle besplatne dijagnostike, pre nego što bilo šta popravimo.</p></div>
    {calculator()}
  </div>
</section>
<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="section-head"><p class="eyebrow">Cenovnik <span class="probno">probne cene</span></p><h2 class="split">Kompletan cenovnik</h2><p class="lead">Cene su u dinarima sa PDV-om. Delovi se uvek prvo odobravaju sa vama.</p></div>
    <div class="table-wrap"><table><thead><tr><th>Usluga</th><th>Raspon cene</th><th>Rok</th></tr></thead><tbody>
{rows}</tbody></table></div>
    <p class="note">Sve cene na ovom demo sajtu su izmišljene i služe samo za prikaz.</p>
  </div>
</section>
{cta("Ne vidite svoj kvar na listi?", "Opišite problem, pa ćemo vam reći da li ga popravljamo i koliko bi okvirno koštalo.", "Pošalji upit")}
'''
page("usluge.html", "Usluge i cene · Reset servis", "Usluge servisa laptopova i računara i okvirne cene.", usl)

# ================= STRANICE USLUGA =================
def nice_step(mx):
    for st in (1000, 2000, 2500, 5000, 10000, 20000):
        if mx / st <= 5: return st
    return 50000

def range_chart(prices):
    mx = max(p[2] for p in prices); st = nice_step(mx); top = -(-mx // st) * st
    rows = ""
    for name, lo, hi in prices:
        l = lo / top * 100; w = max((hi - lo) / top * 100, 1.5)
        rows += f'<div class="range-row"><div class="range-head"><strong>{name}</strong><span>{rsd(lo)}–{rsd(hi)} RSD</span></div><div class="range-track" style="--tick:{st/top*100:.4f}%"><div class="range-seg" style="left:{l:.2f}%;width:{w:.2f}%"></div></div></div>\n'
    ticks = "".join(f'<span style="left:{v/top*100:.2f}%">{rsd(v)}</span>' for v in range(0, top + 1, st))
    return f'<div class="range-chart" role="group" aria-label="Raspon cena po vrsti usluge">\n{rows}<div class="range-axis" aria-hidden="true">{ticks}</div></div>'

for s in SERVICES:
    sym = "".join(f"<li>{x}</li>" for x in s["symptoms"])
    inc = "".join(f"<li>{x}</li>" for x in s["included"])
    extra = ""
    if s["slug"] == "ciscenje-i-pasta":
        extra += f'''<section class="section" style="padding-top:0"><div class="wrap compare-wrap"><div style="display:grid;gap:22px"><p class="eyebrow">Pre i posle <span class="probno">probno</span></p><h2 class="split">Povucite i <span class="serif gold">uporedite.</span></h2><p class="lead">Isti ventilator pre i posle čišćenja. Temperatura procesora pod opterećenjem pala je sa 96 na 71 °C.</p></div>{compare("cmp-svc")}</div></section>'''
    elif s.get("ba"):
        label, unit, b, a, scale = s["ba"]
        extra += f'''<section class="section" style="padding-top:0"><div class="wrap"><div class="section-head"><p class="eyebrow">Primer rezultata <span class="probno">probno</span></p><h2 class="split">{label}</h2></div><div class="ba"><div class="ba-row"><span>Pre</span><div class="ba-bar"><i class="before" style="width:{b/scale*100:.1f}%"></i></div><b>{b} {unit}</b></div><div class="ba-row"><span>Posle</span><div class="ba-bar"><i class="after" style="width:{a/scale*100:.1f}%"></i></div><b>{a} {unit}</b></div><p class="note">Izmišljeno merenje za demo. Stvarni rezultat zavisi od modela i stanja uređaja.</p></div></div></section>'''
    if s.get("tip"):
        tips = "".join(f"<li>{x}</li>" for x in s["tip"])
        extra += f'<section class="section" style="padding-top:0"><div class="wrap"><div class="tip"><p class="eyebrow">Hitno</p><h2>Prva pomoć: šta da uradite odmah</h2><ul class="check-list warn">{tips}</ul></div></div></section>'
    rel = "\n".join(svc_card(BY_SLUG[r]) for r in s["related"])
    body = f'''
<section class="hero" style="padding:0">
  <div class="aurora" aria-hidden="true"><span></span><span></span><span></span></div>
  <div class="wrap svc-hero">
    <div class="hero-copy">
      <p class="crumbs"><a href="index.html">Početna</a> / <a href="usluge.html">Usluge</a> / {s["title"]}</p>
      <h1 class="split">{s["title"]}</h1>
      <p class="lead">{s["long"]}</p>
      <div class="svc-facts"><span class="chip">Cena <b>{rsd(low(s))}–{rsd(high(s))} RSD</b> <span class="probno">probno</span></span><span class="chip">Rok <b>{s["time"]}</b></span><span class="chip">Garancija <b>6 meseci</b></span></div>
      <div class="btn-row"><a class="btn btn-primary magnetic" href="kontakt.html#zakazivanje">Zakaži servis {ARROW}</a><a class="btn btn-ghost" href="#cene">Pogledaj cene</a></div>
    </div>
    <div class="illus-panel" data-tilt>{SVC_ILLUS[s["icon"]]}</div>
  </div>
</section>
<section class="section">
  <div class="wrap two-col">
    <div class="list-box"><h2>Kada vam je potrebna</h2><ul class="check-list warn">{sym}</ul></div>
    <div class="list-box"><h2>Šta je uključeno</h2><ul class="check-list">{inc}</ul></div>
  </div>
</section>
<section class="section" style="padding-top:0" id="cene">
  <div class="wrap">
    <div class="section-head head-split"><div style="display:grid;gap:18px"><p class="eyebrow">Raspon cena <span class="probno">probne cene</span></p><h2 class="split">Koliko <span class="serif gold">košta</span></h2></div><p class="lead">Svaka traka pokazuje od koliko do koliko obično košta ta popravka. Tačnu cenu dobijate posle besplatne dijagnostike.</p></div>
    {range_chart(s["prices"])}
    <p class="note">Cene su u dinarima sa PDV-om i izmišljene su za potrebe demo sajta.</p>
  </div>
</section>
{extra}
<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="section-head"><p class="eyebrow">Povezane usluge</p><h2 class="split">Možda vam treba <span class="serif gold">i ovo</span></h2></div>
    <div class="cards">
{rel}
    </div>
  </div>
</section>
{cta()}
'''
    page(href(s), f'{s["title"]} · Reset servis', s["short"], body, nav="usluge.html")

# ================= POSTUPAK =================
st = ""
for i, (h, short, t, d, extra) in enumerate(STEPS):
    li = "".join(f"<li>{x}</li>" for x in extra)
    st += f'<li class="step" id="korak-{i+1}"><div class="step-body"><div class="step-text"><span class="step-time">{t}</span><h3>{h}</h3><p>{d}</p><ul>{li}</ul></div><div class="step-illus">{PHASE_ILLUS[i]}</div></div></li>\n'
post = pagehead("Postupak", 'Postupak <span class="serif gold">servisiranja</span>', "Svaki uređaj prolazi istih sedam faza. Tako u svakom trenutku znate šta se dešava sa vašim računarom i koliko će to trajati.") + f'''
<section class="section-tight"><div class="wrap">{phase_strip(link=False)}</div></section>
<section class="section">
  <div class="wrap">
    <div class="steps-wrap">
      <div class="steps-track" aria-hidden="true"></div><div class="steps-fill" aria-hidden="true"></div>
      <ol class="steps">
{st}      </ol>
    </div>
  </div>
</section>
<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="section-head"><p class="eyebrow">Pre nego što donesete uređaj</p><h2 class="split">Šta je dobro da <span class="serif gold">pripremite</span></h2></div>
    <div class="cards">
      <article class="card spot"><div class="icon">{ICONS["disk"]}</div><h3>Rezervna kopija</h3><p>Ako možete, sačuvajte važne fajlove na eksterni disk ili u oblak. Podatke čuvamo pažljivo, ali kopija je uvek sigurnija.</p></article>
      <article class="card spot"><div class="icon">{ICONS["bolt"]}</div><h3>Punjač</h3><p>Donesite originalni punjač. Mnogi kvarovi su zapravo u punjaču ili kablu.</p></article>
      <article class="card spot"><div class="icon">{ICONS["shield"]}</div><h3>Lozinka za prijavu</h3><p>Za testiranje sistema korisna je lozinka za Windows nalog. Nije obavezna za hardverske popravke.</p></article>
    </div>
  </div>
</section>
{cta()}
'''
page("postupak.html", "Postupak servisiranja · Reset servis", "Kako izgleda servisiranje laptopa i računara, faza po faza.", post)

# ================= PITANJA =================
fq = ""; n = 0
for group, items in FAQ:
    fq += f'<div class="faq-group" data-faq-group><h2>{group}</h2>{faq_details(items, n)}</div>'
    n += len(items)
pit = pagehead("Česta pitanja", 'Česta <span class="serif gold">pitanja</span>', "Odgovori na pitanja koja nam klijenti najčešće postavljaju. Ako ne nađete svoje, pišite nam.") + f'''
<section class="section-tight">
  <div class="wrap" style="max-width:56rem">
    <div class="faq-tools"><div class="search-field">{SEARCH}<input id="faq-search" type="search" placeholder="Pretražite pitanja, npr. garancija" aria-label="Pretraga pitanja"></div></div>
    {fq}
    <p class="faq-empty" data-faq-empty hidden>Nema pitanja za taj pojam. Pišite nam preko <a href="kontakt.html">kontakt stranice</a>.</p>
  </div>
</section>
{cta("Imate drugo pitanje?", "Pozovite nas ili pošaljite poruku. Odgovaramo istog radnog dana.", "Kontaktirajte nas")}
'''
page("pitanja.html", "Česta pitanja · Reset servis", "Odgovori na najčešća pitanja o servisu laptopova i računara.", pit)

# ================= KONTAKT =================
DEV_ICONS = [ICONS["laptop"], ICONS["bolt"], ICONS["laptop"], ICONS["pc"]]
devs = "".join(f'<label class="choice"><input type="radio" name="wz-dev" value="{l}"{" checked" if i == 0 else ""}><span>{DEV_ICONS[i]}{l}</span></label>' for i, (_, l, _) in enumerate(CALC_DEVICES))
probs = "".join(f'<label><input type="checkbox" name="wz-prob" value="{p}"><span>{p}</span></label>' for p in ["Ne pali se", "Greje se / buka", "Ekran", "Tastatura", "Prosuta tečnost", "Spor sistem", "Punjenje", "Drugo"])
times = "".join(f'<label><input type="radio" name="wz-time" value="{t}"{" checked" if t == "10:00" else ""}><span>{t}</span></label>' for t in ["09:00", "10:00", "11:30", "13:00", "15:00", "17:30"])
kon = pagehead("Kontakt", 'Zakažite. <span class="serif gold">Mi brinemo o ostalom.</span>', "Donesite uređaj bez zakazivanja ili rezervišite termin u četiri kratka koraka.", '<span class="pill" style="justify-self:start"><span class="dot" data-open-dot></span><b data-open-text>Pon–Pet 09–19 h</b></span>') + f'''
<section class="section-tight">
  <div class="wrap contact-grid">
    <div style="display:grid;gap:28px;align-content:start;min-width:0">
      <ul class="info-list">
        <li><span class="label">Adresa <span class="probno">probno</span></span><span class="value">Bulevar kralja Aleksandra 000, 11000 Beograd</span></li>
        <li><span class="label">Telefon <span class="probno">probno</span></span><span class="value">+381 11 000 0000 <button class="copy-btn" type="button" data-copy="+381110000000">Kopiraj</button></span></li>
        <li><span class="label">Viber / WhatsApp <span class="probno">probno</span></span><span class="value">+381 60 000 0000</span></li>
        <li><span class="label">E-pošta <span class="probno">probno</span></span><span class="value">servis@primer.rs <button class="copy-btn" type="button" data-copy="servis@primer.rs">Kopiraj</button></span></li>
        <li><span class="label">Radno vreme <span class="probno">probno</span></span><div class="hours" data-hours><span data-day="1">Ponedeljak–petak</span><span data-day="1">09:00–19:00</span><span data-day="6">Subota</span><span data-day="6">10:00–15:00</span><span data-day="0">Nedelja</span><span data-day="0">zatvoreno</span></div></li>
      </ul>
      <div class="map-box"><div class="map-art">{MAP_ART}</div><strong>Kako do nas</strong><p style="color:var(--muted)">Primer lokacije: blizu Vukovog spomenika, linije 7, 12 i 14. Parking u okolnim ulicama (zona 2).</p><a class="link-arrow" href="https://www.openstreetmap.org/#map=15/44.8040/20.4790" target="_blank" rel="noopener">Otvori mapu Beograda {ARROW}</a></div>
    </div>
    <form class="wizard" id="zakazivanje" data-wizard novalidate>
      <div class="wz-head"><h2 style="font-size:clamp(1.5rem,2.6vw,2rem)">Zakažite servis</h2><span data-wz-label>Korak 1 od 4</span></div>
      <div class="wz-progress" aria-hidden="true"><i class="on"></i><i></i><i></i><i></i></div>
      <div class="wz-step" data-step="1"><p class="lead">Koji uređaj donosite?</p><div class="choice-grid">{devs}</div><div class="field"><label for="wz-model">Proizvođač i model (ako znate)</label><input id="wz-model" placeholder="npr. Lenovo IdeaPad 5"></div></div>
      <div class="wz-step" data-step="2" hidden><p class="lead">Šta se dešava? Izaberite sve što važi.</p><div class="seg">{probs}</div><div class="field"><label for="wz-opis">Kratak opis</label><textarea id="wz-opis" placeholder="Od kada, da li je bilo pada ili prosute tečnosti..."></textarea></div></div>
      <div class="wz-step" data-step="3" hidden><p class="lead">Kada vam odgovara da donesete uređaj?</p><div class="seg" data-days></div><div class="seg">{times}</div><p class="note">Termini su primer za demo. Možete doći i bez zakazivanja.</p></div>
      <div class="wz-step" data-step="4" hidden><p class="lead">Kako da vas kontaktiramo?</p><div class="field-row"><div class="field"><label for="wz-ime">Ime i prezime</label><input id="wz-ime" autocomplete="name" placeholder="Petar Petrović"></div><div class="field"><label for="wz-tel">Telefon</label><input id="wz-tel" type="tel" autocomplete="tel" placeholder="06x xxx xxxx"></div></div><p class="form-err" data-wz-err hidden>Upišite ime i telefon da bismo mogli da potvrdimo termin.</p><div class="summary-list" data-wz-summary></div></div>
      <div class="wz-step" data-step="5" hidden tabindex="-1"><p class="eyebrow">Demo</p><h3 style="font-size:1.6rem">Hvala! Ovo je bio prikaz zakazivanja.</h3><p class="form-msg">Zahtev nije poslat jer je ovo demo sajt. Na pravom sajtu ovde bi stigla potvrda termina i broj radnog naloga, na primer RN-2026-0471.</p><div class="summary-list" data-wz-summary2></div></div>
      <div class="wz-nav"><button class="btn btn-ghost" type="button" data-wz-prev hidden>Nazad</button><button class="btn btn-primary magnetic" type="button" data-wz-next style="margin-left:auto">Dalje {ARROW}</button></div>
    </form>
  </div>
</section>
'''
page("kontakt.html", "Kontakt · Reset servis", "Adresa, telefon, radno vreme i zakazivanje servisa.", kon)

# ================= STATUS =================
STAGES = ["Primljen u servis", "Dijagnostika", "Procena poslata", "Vi ste odobrili", "U popravci", "Testiranje", "Spreman za preuzimanje"]
ORDERS = {
 "RN-2026-0417": dict(device="Lenovo IdeaPad 5, 15,6\"", issue="Gasi se pri opterećenju", diag="Pregrevanje, osušena termalna pasta", price="3.500 RSD", eta="Danas do 17:00", done=4,
   times=["Pon 09:42", "Pon 13:10", "Pon 13:25", "Pon 14:02", "Uto 10:15", "", ""]),
 "RN-2026-0388": dict(device="MacBook Air 13\"", issue="Baterija traje 40 minuta", diag="Istrošena baterija, 1.100 ciklusa", price="9.800 RSD", eta="Spreman, čeka vas", done=7,
   times=["Čet 11:05", "Čet 15:30", "Čet 15:41", "Pet 09:12", "Pet 10:00", "Pet 12:30", "Pet 15:45"]),
 "RN-2026-0452": dict(device="ASUS TUF Gaming F15", issue="Ne pali se", diag="Neispravan konektor za punjenje", price="7.900 RSD", eta="2 dana od odobrenja", done=2,
   times=["Uto 16:20", "Sre 11:40", "Sre 12:05", "", "", "", ""]),
}
def order_html(code):
    o = ORDERS[code]; done = o["done"]
    status = STAGES[min(done, 6)] if done < 7 else STAGES[6]
    tl = ""
    for i, sname in enumerate(STAGES):
        cls = "done" if i < done else ("now" if i == done else "")
        if done == 7 and i == 6: cls = "done"
        tl += f'<li class="{cls}"><span></span><span>{sname}</span><time>{o["times"][i] or "—"}</time></li>'
    label = "Spreman za preuzimanje" if done == 7 else ("Čeka vaše odobrenje" if done == 3 or done == 2 else STAGES[done])
    return f'''<div class="tr-top"><div style="display:grid;gap:8px"><span class="eyebrow">{code} <span class="probno">demo</span></span><h2>{label}</h2></div><span class="badge">● {o["eta"]}</span></div>
<div class="tr-meta"><div><span>Uređaj</span><b>{o["device"]}</b></div><div><span>Prijavljen kvar</span><b>{o["issue"]}</b></div><div><span>Dijagnoza</span><b>{o["diag"]}</b></div><div><span>Cena</span><b>{o["price"]}</b></div></div>
<ol class="tl">{tl}</ol>'''
codes = "".join(f'<button type="button" data-code="{c}">{c}</button>' for c in ORDERS)
sta = pagehead("Status popravke", 'Gde je moj <span class="serif gold">laptop?</span>', "Upišite broj radnog naloga sa potvrde koju ste dobili pri predaji uređaja.") + f'''
<section class="section-tight">
  <div class="wrap tracker">
    <form class="track-form" data-track novalidate>
      <label for="track-code">Broj radnog naloga</label>
      <div class="track-row"><input id="track-code" value="RN-2026-0417" placeholder="RN-2026-0000" autocomplete="off"><button class="btn btn-primary" type="submit">Proveri {ARROW}</button></div>
      <p class="form-err" data-track-err hidden>Nalog sa tim brojem nije pronađen. Proverite broj ili probajte neki od primera ispod.</p>
      <p class="note" style="margin:0">Primeri za demo:</p>
      <div class="demo-codes">{codes}</div>
    </form>
    <div class="track-result" data-track-result aria-live="polite">{order_html("RN-2026-0417")}</div>
  </div>
</section>
{cta("Uređaj još nije kod nas?", "Zakažite termin ili ga donesite bez zakazivanja. Broj naloga dobijate odmah pri predaji.", "Zakaži servis")}
'''
page("status.html", "Status popravke · Reset servis", "Praćenje statusa popravke po broju radnog naloga.", sta)

# ================= PODACI ZA JS =================
search = [{"t": "Početna", "d": "Reset servis, Beograd", "u": "index.html", "k": "Stranica"}]
search += [{"t": l, "d": "", "u": h, "k": "Stranica"} for h, l in NAV]
search += [{"t": s["title"], "d": s["short"], "u": href(s), "k": "Usluga"} for s in SERVICES]
search += [{"t": q, "d": a.split("<")[0][:90], "u": f"pitanja.html#q-{i+1}", "k": "Pitanje"} for i, (q, a) in enumerate(all_q)]
search += [{"t": h, "d": d[:90], "u": f"postupak.html#korak-{i+1}", "k": "Postupak"} for i, (h, _, _, d, _) in enumerate(STEPS)]
site = {
  "search": search,
  "calc": {"devices": {k: m for k, _, m in CALC_DEVICES}, "issues": {k: [lo, hi, t, href(BY_SLUG[sl])] for k, _, lo, hi, t, sl in CALC_ISSUES}},
  "orders": {c: order_html(c) for c in ORDERS},
}
(OUT / "assets" / "site-data.js").write_text("window.RS = " + json.dumps(site, ensure_ascii=False) + ";\n", encoding="utf-8")
print("ok")
