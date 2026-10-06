"""Generiše sve HTML stranice sajta. Pokretanje: python3 tools/build.py"""
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from illus import SERVICE as SVC_ILLUS, PHASE as PHASE_ILLUS, PHASE_ICONS
OUT = pathlib.Path(__file__).resolve().parent.parent

PAGES = [
  ("index.html", "Početna"),
  ("usluge.html", "Usluge i cene"),
  ("postupak.html", "Postupak"),
  ("pitanja.html", "Česta pitanja"),
  ("kontakt.html", "Kontakt"),
]

ICONS = {
 "laptop": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/></svg>',
 "pc": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/></svg>',
 "drop": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/></svg>',
 "screen": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="13" rx="1.5"/><path d="M7 8l4 4M14 9l3 3"/></svg>',
 "disk": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>',
 "fan": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 1-7 4-7 2 0 2 3 0 5M14 12c4 0 7 1 7 4 0 2-3 2-5 0M12 14c0 4-1 7-4 7-2 0-2-3 0-5M10 12c-4 0-7-1-7-4 0-2 3-2 5 0"/></svg>',
 "shield": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
 "bolt": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
 "chip": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="1.5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/></svg>',
}

def head(title, desc):
    return f'''<!doctype html>
<html lang="sr-Latn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<link rel="stylesheet" href="assets/style.css">
</head>
<body>'''

def header(current):
    links = "\n".join(
        f'      <a href="{href}"{" aria-current=\"page\"" if href == current else ""}>{label}</a>'
        for href, label in PAGES)
    return f'''
<div class="demo-bar" role="note">
  <div class="wrap"><span class="tag">Demo</span> Ovo je probni sajt. Naziv, adresa, telefon, cene i recenzije su izmišljeni podaci za pregled.</div>
</div>
<header class="site-header">
  <div class="wrap">
    <a class="logo" href="index.html"><span class="logo-mark">R/</span>Reset servis</a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="glavni-meni">Meni</button>
    <nav class="nav" id="glavni-meni" aria-label="Glavni meni">
{links}
    </nav>
  </div>
</header>
'''

FOOTER = '''
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <h3>Reset servis <span class="probno">probno</span></h3>
        <p>Servis laptopova i računara u Beogradu. Dijagnostika, popravka, čišćenje i nadogradnja.</p>
      </div>
      <div>
        <h3>Stranice</h3>
        <ul>
          <li><a href="usluge.html">Usluge i cene</a></li>
          <li><a href="postupak.html">Postupak servisiranja</a></li>
          <li><a href="pitanja.html">Česta pitanja</a></li>
          <li><a href="kontakt.html">Kontakt</a></li>
        </ul>
      </div>
      <div>
        <h3>Kontakt <span class="probno">probno</span></h3>
        <ul>
          <li>Bulevar kralja Aleksandra 000, Beograd</li>
          <li>+381 11 000 0000</li>
          <li>servis@primer.rs</li>
        </ul>
      </div>
      <div>
        <h3>Radno vreme <span class="probno">probno</span></h3>
        <ul>
          <li>Pon–Pet: 09–19 h</li>
          <li>Subota: 10–15 h</li>
          <li>Nedelja: zatvoreno</li>
        </ul>
      </div>
    </div>
    <p class="footer-note">© <span id="godina">2026</span> Reset servis — demo sajt. Svi podaci na ovoj stranici su probni i služe samo za pregled dizajna.</p>
  </div>
</footer>
<button class="to-top" type="button" aria-label="Vrati se na vrh stranice">
  <svg class="ring" viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="26"/></svg>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
</button>
<script src="assets/script.js"></script>
</body>
</html>
'''

def page(fname, title, desc, body, nav=None):
    (OUT / fname).write_text(head(title, desc) + header(nav or fname) + "<main>\n" + body + "\n</main>\n" + FOOTER, encoding="utf-8")

def pagehead(crumb, h1, lead):
    return f'''<section class="wrap page-head">
  <p class="crumbs"><a href="index.html">Početna</a> / {crumb}</p>
  <h1>{h1}</h1>
  <p class="lead">{lead}</p>
</section>'''


def rsd(n):
    return f"{n:,}".replace(",", ".")

# ---------- Podaci o uslugama (sve cene su probne) ----------
SERVICES = [
 dict(slug="popravka-laptopova", icon="laptop", title="Popravka laptopova",
  short="Ne pali se, ne puni, gasi se, ne prikazuje sliku. Kvarovi matične ploče, napajanja i šarki.",
  long="Laptop koji ne pali, ne puni bateriju ili se sam gasi najčešće ima kvar na napajanju ili matičnoj ploči. Prvo merimo napone i tražimo tačno koja komponenta ne radi, pa menjamo samo ono što je zaista neispravno.",
  symptoms=["Ne pali se ili se upali pa odmah ugasi","Ne puni bateriju ili punjač ne radi","Ventilator radi, ali nema slike","Šarke škripe, pucaju ili se kućište otvara","Sam se restartuje ili zaledi"],
  included=["Merenje napona i dijagnostika ploče","Zamena neispravne komponente","Provera baterije i punjača","Test od 2 sata pod opterećenjem","Garantni list na 6 meseci"],
  prices=[("Zamena baterije (sa delom)",3000,6000),("Zamena šarki",4000,7500),("Popravka napajanja na ploči",6000,12000),("Zamena matične ploče (sa delom)",12000,35000)],
  time="1–5 dana", related=["ciscenje-i-pasta","lemljenje-i-bga","ekrani-i-tastature"]),
 dict(slug="servis-racunara", icon="pc", title="Servis desktop računara",
  short="Dijagnostika kvarova, zamena napajanja, matične ploče i grafičke kartice, sklapanje po meri.",
  long="Kod desktop računara kvar je najčešće u napajanju, disku ili memoriji. Testiramo svaku komponentu posebno i predlažemo zamenu koja odgovara vašoj konfiguraciji i budžetu. Sklapamo i nove računare po meri, za kancelariju ili igranje.",
  symptoms=["Računar ne reaguje na dugme za paljenje","Pišti pri paljenju ili nema slike","Gasi se tokom igranja ili rada","Plavi ekran i česti restarti","Glasan rad i visoke temperature"],
  included=["Test napajanja, memorije i diska","Čišćenje kućišta i hladnjaka","Zamena komponente po vašem izboru","Ažuriranje BIOS-a i drajvera","Stres test procesora i grafike"],
  prices=[("Dijagnostika kvara",1500,3000),("Čišćenje kućišta i hladnjaka",2500,4000),("Sklapanje po meri (rad)",3000,5000),("Zamena napajanja (sa delom)",6000,14000)],
  time="1–3 dana", related=["nadogradnja","podaci-i-sistem","ciscenje-i-pasta"]),
 dict(slug="ciscenje-i-pasta", icon="fan", title="Čišćenje i termalna pasta",
  short="Laptop se greje, ventilator je glasan ili se računar gasi pri opterećenju.",
  long="Prašina u ventilatoru i osušena termalna pasta podižu temperaturu procesora i do 25 °C. Laptop tada usporava, bučan je i može da se gasi. Rastavljamo uređaj, čistimo ventilator i hladnjak i nanosimo kvalitetnu termalnu pastu.",
  symptoms=["Ventilator je stalno glasan","Kućište je vruće na dodir","Laptop usporava posle nekoliko minuta rada","Gasi se tokom igranja ili renderovanja","Poslednje čišćenje bilo je pre više od 2 godine"],
  included=["Kompletno rastavljanje uređaja","Čišćenje ventilatora i rebara hladnjaka","Nova termalna pasta (i termo podloge po potrebi)","Merenje temperature pre i posle","Podmazivanje ventilatora"],
  prices=[("Desktop računar",2500,4000),("Standardni laptop",3500,4500),("MacBook",4500,6000),("Gejming laptop",5500,7500)],
  time="24 h", related=["popravka-laptopova","nadogradnja","servis-racunara"],
  ba=("Temperatura procesora pod opterećenjem", "°C", 96, 71, 110)),
 dict(slug="ekrani-i-tastature", icon="screen", title="Ekrani i tastature",
  short="Zamena ekrana, tastature, touchpada, kućišta i šarki.",
  long="Napukao ekran, linije na slici, tamna slika ili tasteri koji ne rade rešavaju se zamenom dela. Proveravamo tačan model panela ili tastature, poručujemo odgovarajući deo i ugrađujemo ga, najčešće za jedan do tri dana.",
  symptoms=["Napukao ili razbijen ekran","Linije, fleke ili treperenje slike","Slika je jedva vidljiva (pozadinsko svetlo)","Pojedini tasteri ne rade","Touchpad ne reaguje"],
  included=["Provera tačnog modela dela","Nabavka novog panela ili tastature","Ugradnja i podešavanje","Provera kamere, mikrofona i Wi-Fi antena","Garancija 6 meseci na deo i rad"],
  prices=[("Zamena touchpada",4000,7000),("Zamena tastature",4900,9000),("Ekran HD (sa delom)",9900,13000),("Ekran Full HD IPS (sa delom)",12000,18000)],
  time="1–3 dana", related=["popravka-laptopova","prosuta-tecnost","lemljenje-i-bga"]),
 dict(slug="podaci-i-sistem", icon="disk", title="Podaci i sistem",
  short="Instalacija Windows-a, uklanjanje virusa, prebacivanje i spasavanje podataka.",
  long="Spor sistem, virusi ili disk koji otkazuje ne moraju da znače gubitak fajlova. Pravimo kopiju vaših podataka, čistimo ili ponovo instaliramo sistem i vraćamo fajlove tamo gde su bili. Ako disk ne radi, pokušavamo da spasemo podatke.",
  symptoms=["Windows se sporo pokreće ili se ne pokreće","Iskaču reklame i nepoznati programi","Disk škripi ili se ne vidi","Slučajno obrisani fajlovi","Prelazak na novi računar"],
  included=["Rezervna kopija podataka pre rada","Instalacija i aktivacija sistema","Drajveri i osnovni programi","Vraćanje fajlova i podešavanja","Provera stanja diska"],
  prices=[("Prebacivanje podataka",1500,3000),("Uklanjanje virusa",2000,3500),("Instalacija Windows-a",2500,3500),("Spasavanje podataka sa oštećenog diska",5000,20000)],
  time="isti dan", related=["nadogradnja","servis-racunara","popravka-laptopova"]),
 dict(slug="nadogradnja", icon="chip", title="Nadogradnja",
  short="Ugradnja SSD diska i dodatne RAM memorije. Stari računar postaje primetno brži.",
  long="Najisplativija nadogradnja starijeg računara je SSD disk. Sistem se pokreće nekoliko puta brže, a programi se otvaraju odmah. Prebacujemo ceo sistem sa starog diska, tako da sve ostaje kako je bilo, samo brže.",
  symptoms=["Sistem se pokreće duže od jednog minuta","Programi se dugo otvaraju","Računar koči kad je otvoreno više kartica","Pun disk i stalna upozorenja","Računar je stariji od 4 godine"],
  included=["Savet koji deo odgovara vašem uređaju","Kloniranje sistema na novi disk","Ugradnja SSD-a i RAM memorije","Provera brzine pre i posle","Stari disk vraćamo vama"],
  prices=[("Kloniranje sistema",1500,2500),("Ugradnja SSD-a (samo rad)",2000,2500),("RAM 8 GB sa ugradnjom",4500,6500),("SSD 500 GB sa ugradnjom",6500,9000)],
  time="isti dan", related=["podaci-i-sistem","ciscenje-i-pasta","servis-racunara"],
  ba=("Vreme pokretanja sistema", "s", 58, 12, 70)),
 dict(slug="prosuta-tecnost", icon="drop", title="Prosuta tečnost",
  short="Hitno čišćenje matične ploče od korozije i procena oštećenja.",
  long="Voda, kafa ili sok na tastaturi izazivaju koroziju koja se širi danima. Što pre donesete laptop, veća je šansa da se popravi jeftino. Rastavljamo ga, čistimo ploču u ultrazvučnoj kadi i menjamo samo oštećene delove.",
  symptoms=["Prosuta voda, kafa, čaj ili sok","Tasteri lepe ili ne rade","Laptop se ugasio odmah posle prosipanja","Pali se, ali se čudno ponaša","Zelene ili bele naslage u portovima"],
  included=["Hitno rastavljanje istog dana","Čišćenje ploče u ultrazvučnoj kadi","Sušenje i provera svih napona","Zamena oštećenih komponenti","Pismena procena pre popravke"],
  prices=[("Čišćenje ploče ultrazvukom",4500,6500),("Zamena tastature posle prosipanja",5000,9000),("Popravka oštećenih komponenti",6000,15000)],
  time="2–5 dana", related=["ekrani-i-tastature","lemljenje-i-bga","popravka-laptopova"],
  tip=["Odmah isključite laptop i izvucite punjač.","Ne pokušavajte da ga upalite da proverite da li radi.","Okrenite ga naopako, otvorenog ekrana, da tečnost iscuri.","Ne sušite ga fenom. Donesite ga u servis što pre."]),
 dict(slug="lemljenje-i-bga", icon="bolt", title="Lemljenje i BGA",
  short="Zamena konektora za punjenje, čipova i komponenti na matičnoj ploči.",
  long="Polomljen konektor za punjenje ili neispravan čip ne znače kraj laptopa. Mikrolemljenjem menjamo pojedinačne komponente na matičnoj ploči, umesto da menjamo celu ploču, što je obično nekoliko puta jeftinije.",
  symptoms=["Punjač radi samo pod određenim uglom","USB ili HDMI port je polomljen","Laptop ne pali posle udara struje","Grafički čip pravi artefakte na slici","Servis je ponudio zamenu cele ploče"],
  included=["Pregled ploče pod mikroskopom","Zamena konektora i portova","Zamena SMD komponenti i čipova","BGA reballing na profesionalnoj stanici","Provera napona posle popravke"],
  prices=[("Zamena USB ili HDMI porta",5000,8000),("Zamena konektora za punjenje",6000,9000),("Reballing ili zamena čipa",12000,25000)],
  time="3–7 dana", related=["popravka-laptopova","prosuta-tecnost","servis-racunara"]),
 dict(slug="poslovni-korisnici", icon="shield", title="Poslovni korisnici",
  short="Održavanje računara za firme, prioritetni rokovi i mesečno fakturisanje.",
  long="Za kancelarije i male firme preuzimamo redovno održavanje računara i mreže. Dobijate prioritet u servisu, dolazak na lokaciju u Beogradu i jedan mesečni račun umesto pojedinačnih popravki.",
  symptoms=["Imate 3 ili više računara u kancelariji","Zastoji u radu vas koštaju","Nemate svog IT stručnjaka","Potrebne su vam redovne rezervne kopije","Otvarate novu kancelariju"],
  included=["Prioritetni rok popravke","Dolazak na lokaciju u Beogradu","Redovno čišćenje i ažuriranje","Postavljanje novih radnih mesta","Mesečni izveštaj i jedna faktura"],
  prices=[("Intervencija na lokaciji",3000,5000),("Postavljanje nove radne stanice",3500,6000),("Mesečno održavanje do 10 računara",15000,25000)],
  time="po ugovoru", related=["servis-racunara","podaci-i-sistem","nadogradnja"]),
]
BY_SLUG = {s["slug"]: s for s in SERVICES}
def href(s): return f'{s["slug"]}.html'

def svc_card(s):
    lo = min(p[1] for p in s["prices"])
    return f'''      <a class="card" href="{href(s)}"><div class="icon">{ICONS[s["icon"]]}</div><h3>{s["title"]}</h3><p>{s["short"]}</p><div class="meta"><span>od {rsd(lo)} RSD</span><span>{s["time"]}</span></div><span class="more">Detaljnije →</span></a>'''

def nice_step(mx):
    for st in (1000, 2000, 2500, 5000, 10000, 20000):
        if mx / st <= 5: return st
    return 50000

def range_chart(prices):
    mx = max(p[2] for p in prices); st = nice_step(mx)
    top = -(-mx // st) * st
    rows = ""
    for name, lo, hi in prices:
        l = lo / top * 100; w = max((hi - lo) / top * 100, 1.5)
        rows += f'''    <div class="range-row"><div class="range-head"><strong>{name}</strong><span>{rsd(lo)}–{rsd(hi)} RSD</span></div>
      <div class="range-track" style="--tick:{st/top*100:.4f}%"><div class="range-seg" style="left:{l:.2f}%;width:{w:.2f}%"></div></div></div>\n'''
    ticks = "".join(f'<span style="left:{v/top*100:.2f}%">{rsd(v)}</span>' for v in range(0, top + 1, st))
    return f'''  <div class="range-chart" role="group" aria-label="Raspon cena po vrsti usluge">
{rows}    <div class="range-axis" aria-hidden="true">{ticks}</div>
  </div>'''

def service_page(s):
    lo = min(p[1] for p in s["prices"]); hi = max(p[2] for p in s["prices"])
    sym = "".join(f"<li>{x}</li>" for x in s["symptoms"])
    inc = "".join(f"<li>{x}</li>" for x in s["included"])
    extra = ""
    if s.get("ba"):
        label, unit, b, a, scale = s["ba"]
        extra += f'''
<section class="section">
  <div class="wrap">
    <div class="section-head"><p class="eyebrow">Primer rezultata <span class="probno">probno</span></p><h2>{label}</h2></div>
    <div class="ba">
      <div class="ba-row"><span>Pre</span><div class="ba-bar"><i class="before" style="width:{b/scale*100:.1f}%"></i></div><b>{b} {unit}</b></div>
      <div class="ba-row"><span>Posle</span><div class="ba-bar"><i class="after" style="width:{a/scale*100:.1f}%"></i></div><b>{a} {unit}</b></div>
      <p class="note">Izmišljeno merenje za demo. Stvarni rezultat zavisi od modela i stanja uređaja.</p>
    </div>
  </div>
</section>'''
    if s.get("tip"):
        tips = "".join(f"<li>{x}</li>" for x in s["tip"])
        extra += f'''
<section class="section">
  <div class="wrap"><div class="tip"><h2>Prva pomoć: šta da uradite odmah</h2><ul class="check-list warn">{tips}</ul></div></div>
</section>'''
    rel = "\n".join(svc_card(BY_SLUG[r]) for r in s["related"])
    body = f'''
<section class="wrap svc-hero">
  <div class="hero-copy">
    <p class="crumbs"><a href="index.html">Početna</a> / <a href="usluge.html">Usluge</a> / {s["title"]}</p>
    <h1>{s["title"]}</h1>
    <p class="lead">{s["long"]}</p>
    <div class="svc-facts">
      <span class="chip">Cena <b>{rsd(lo)}–{rsd(hi)} RSD</b> <span class="probno">probno</span></span>
      <span class="chip">Rok <b>{s["time"]}</b></span>
      <span class="chip">Garancija <b>6 meseci</b></span>
    </div>
    <div class="btn-row"><a class="btn btn-primary" href="kontakt.html">Prijavi kvar</a><a class="btn btn-ghost" href="postupak.html">Kako radimo</a></div>
  </div>
  <div class="illus-panel">{SVC_ILLUS[s["icon"]]}</div>
</section>

<section class="section">
  <div class="wrap two-col">
    <div class="list-box"><h2>Kada vam je potrebna</h2><ul class="check-list warn">{sym}</ul></div>
    <div class="list-box"><h2>Šta je uključeno</h2><ul class="check-list">{inc}</ul></div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">Raspon cena <span class="probno">probne cene</span></p>
      <h2>Koliko košta</h2>
      <p class="lead">Traka pokazuje od koliko do koliko obično košta svaka vrsta popravke. Tačnu cenu dobijate posle besplatne dijagnostike.</p>
    </div>
{range_chart(s["prices"])}
    <p class="note">Cene su u dinarima sa PDV-om i izmišljene su za potrebe demo sajta.</p>
  </div>
</section>
{extra}
<section class="section">
  <div class="wrap">
    <div class="section-head"><p class="eyebrow">Povezane usluge</p><h2>Možda vam treba i ovo</h2></div>
    <div class="cards">
{rel}
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap"><div class="cta"><h2>Opišite kvar, javićemo vam procenu</h2><p>Pošaljite kratak opis problema i model uređaja. Odgovaramo istog radnog dana.</p><div class="btn-row"><a class="btn btn-primary" href="kontakt.html">Prijavi kvar</a></div></div></div>
</section>
'''
    page(href(s), f'{s["title"]} · Reset servis', s["short"], body, nav="usluge.html")

for s in SERVICES:
    service_page(s)

# ---------- Faze postupka ----------
STEPS = [
 ("Prijava kvara","Prijava","Odmah","Pozovete nas, popunite formu na sajtu ili jednostavno donesete uređaj. Zakazivanje nije potrebno. Za firme i veće količine dolazimo po uređaje na adresu u Beogradu.",
   ["Telefon, Viber ili forma na sajtu","Bez zakazivanja"]),
 ("Prijem i radni nalog","Prijem","10 minuta","Zajedno pregledamo uređaj i zapišemo spoljašnje stanje, opis kvara i pribor koji ostavljate. Dobijate radni nalog sa brojem po kojem pratite status.",
   ["Zapisnik o stanju uređaja","Broj radnog naloga, npr. RN-2026-0417"]),
 ("Dijagnostika","Dijagnostika","Isti ili sledeći dan","Serviser rastavlja i testira uređaj da bi pronašao pravi uzrok kvara. Dijagnostika je besplatna ako popravku radite kod nas.",
   ["Merenje napona i temperatura","Test diska, memorije i ekrana"]),
 ("Procena i vaše odobrenje","Procena","Poziv ili SMS","Javljamo vam šta je neispravno, koliko košta popravka i koliko traje. Ništa ne radimo dok ne odobrite. Ako odustanete, uređaj preuzimate u istom stanju.",
   ["Tačna cena pre početka rada","Bez skrivenih troškova"]),
 ("Popravka","Popravka","Obično 24–72 h","Menjamo ili popravljamo neispravne delove. Ako deo treba poručiti, javljamo vam tačan rok isporuke.",
   ["Originalni ili proverени zamenski delovi","Antistatičko radno mesto"]),
 ("Testiranje","Test","Najmanje 2 sata","Svaki uređaj prolazi test pod opterećenjem: temperature, napajanje, ekran, tastatura, portovi, mreža i zvuk.",
   ["Stres test procesora i grafike","Provera svih portova"]),
 ("Preuzimanje i garancija","Preuzimanje","Kad vam odgovara","Pozivamo vas kad je uređaj spreman. Plaćate gotovinom ili karticom i dobijate fiskalni račun i garantni list na 6 meseci.",
   ["Fiskalni račun","Garancija 6 meseci"]),
]
STEPS = [(a,b,c,d,[x.replace("proverени","provereni") for x in e]) for a,b,c,d,e in STEPS]

def phase_strip(link=True):
    items = ""
    for i, (h, short, t, d, e) in enumerate(STEPS):
        tag = "a" if link else "div"
        hr = f' href="postupak.html#korak-{i+1}"' if link else f' href="#korak-{i+1}"'
        items += f'      <li><a class="phase"{hr}><span class="phase-icon">{PHASE_ICONS[i]}</span><strong>{short}</strong><span>{t}</span></a></li>\n'
    return f'''    <div class="phases-scroll"><ol class="phases" aria-label="Faze servisiranja">
{items}    </ol></div>'''

# ---------- Početna ----------
home_cards = "\n".join(svc_card(BY_SLUG[x]) for x in ["ciscenje-i-pasta", "ekrani-i-tastature", "prosuta-tecnost"])
home = f'''
<section class="hero">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="eyebrow">Servis laptopova i računara · Beograd</p>
      <h1>Laptop ne pali? Računar koči? <em>Vraćamo ga u rad.</em></h1>
      <p class="lead">Besplatna dijagnostika, tačna procena pre popravke i garancija na rad. Većinu kvarova rešavamo za 24 do 72 sata.</p>
      <div class="btn-row">
        <a class="btn btn-primary" href="kontakt.html">Prijavi kvar</a>
        <a class="btn btn-ghost" href="usluge.html">Pogledaj cene</a>
      </div>
    </div>
    <aside class="ticket" aria-label="Primer radnog naloga">
      <div class="ticket-top"><span>RADNI NALOG RN-2026-0417</span><span class="probno">primer</span></div>
      <dl>
        <dt>Uređaj</dt><dd>Laptop 15,6"</dd>
        <dt>Prijavljen kvar</dt><dd>Gasi se pri opterećenju</dd>
        <dt>Dijagnoza</dt><dd>Pregrevanje, osušena pasta</dd>
        <dt>Procena</dt><dd>3.500 RSD</dd>
        <dt>Rok</dt><dd>24 h</dd>
      </dl>
      <ol class="status-list">
        <li class="done">Primljen u servis</li>
        <li class="done">Dijagnostika završena</li>
        <li class="done">Klijent odobrio popravku</li>
        <li class="now">Čišćenje i zamena paste</li>
        <li>Testiranje 2 h pod opterećenjem</li>
        <li>Spreman za preuzimanje</li>
      </ol>
    </aside>
  </div>
</section>

<section class="wrap" aria-label="Ukratko o servisu">
  <div class="facts">
    <div class="fact"><strong>0 RSD</strong><span>dijagnostika ako popravite kod nas</span></div>
    <div class="fact"><strong>24–72 h</strong><span>uobičajen rok popravke</span></div>
    <div class="fact"><strong>6 meseci</strong><span>garancija na rad i delove</span></div>
    <div class="fact"><strong>4,9 / 5</strong><span>ocena klijenata <span class="probno">probno</span></span></div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">Najčešće popravke</p>
      <h2>Šta popravljamo</h2>
      <p class="lead">Kliknite na uslugu da vidite detaljan opis i raspon cena.</p>
    </div>
    <div class="cards">
{home_cards}
    </div>
    <p class="note"><a href="usluge.html">Svih 9 usluga i ceo cenovnik →</a></p>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">Kako radimo</p>
      <h2>Od prijave do preuzimanja u 7 koraka</h2>
    </div>
{phase_strip()}
    <p class="note"><a href="postupak.html">Detaljan postupak servisiranja →</a></p>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="cta">
      <h2>Opišite kvar, javićemo vam procenu</h2>
      <p>Pošaljite kratak opis problema i model uređaja. Odgovaramo istog radnog dana.</p>
      <div class="btn-row"><a class="btn btn-primary" href="kontakt.html">Prijavi kvar</a></div>
    </div>
  </div>
</section>
'''
page("index.html", "Reset servis", "Demo sajt servisa laptopova i računara u Beogradu.", home)

# ---------- Usluge ----------
cards = "\n".join(svc_card(s) for s in SERVICES)
rows = ""
for s in SERVICES:
    for name, lo, hi in s["prices"]:
        rows += f'          <tr><td><a href="{href(s)}"><strong>{name}</strong></a><br><span style="color:var(--muted)">{s["title"]}</span></td><td class="num">{rsd(lo)}–{rsd(hi)} RSD</td><td class="num">{s["time"]}</td></tr>\n'
usl = pagehead("Usluge i cene", "Usluge i cene", "Kliknite na uslugu za detaljan opis, šta je uključeno i grafikon raspona cena. Tačnu cenu dobijate posle dijagnostike, pre nego što bilo šta popravimo.") + f'''
<section class="section">
  <div class="wrap">
    <div class="section-head"><p class="eyebrow">Usluge</p><h2>Šta radimo</h2></div>
    <div class="cards">
{cards}
    </div>
  </div>
</section>
<section class="section">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">Cenovnik <span class="probno">probne cene</span></p>
      <h2>Okvirne cene</h2>
      <p class="lead">Cene su u dinarima sa PDV-om. Delovi se uvek prvo odobravaju sa vama.</p>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Usluga</th><th>Raspon cene</th><th>Rok</th></tr></thead>
        <tbody>
{rows}        </tbody>
      </table>
    </div>
    <p class="note">Sve cene na ovom demo sajtu su izmišljene i služe samo za prikaz.</p>
  </div>
</section>
<section class="section">
  <div class="wrap"><div class="cta"><h2>Ne vidite svoj kvar na listi?</h2><p>Opišite problem, pa ćemo vam reći da li ga popravljamo i koliko bi okvirno koštalo.</p><div class="btn-row"><a class="btn btn-primary" href="kontakt.html">Pošalji upit</a></div></div></div>
</section>
'''
page("usluge.html", "Usluge i cene · Reset servis", "Usluge servisa laptopova i računara i okvirne cene.", usl)

# ---------- Postupak ----------
st = ""
for i, (h, short, t, d, extra) in enumerate(STEPS):
    li = "".join(f"<li>{x}</li>" for x in extra)
    st += f'''    <li class="step" id="korak-{i+1}"><div class="step-body"><div class="step-text"><span class="step-time">{t}</span><h3>{h}</h3><p>{d}</p><ul>{li}</ul></div><div class="step-illus">{PHASE_ILLUS[i]}</div></div></li>\n'''
post = pagehead("Postupak", "Postupak servisiranja", "Svaki uređaj prolazi istih sedam faza. Tako u svakom trenutku znate šta se dešava sa vašim računarom i koliko će to trajati.") + f'''
<section class="section" style="padding-top:24px">
  <div class="wrap">
{phase_strip(link=False)}
  </div>
</section>
<section class="section">
  <div class="wrap">
    <div class="steps-wrap">
      <div class="steps-track" aria-hidden="true"></div><div class="steps-fill" aria-hidden="true"></div>
      <ol class="steps">
{st}      </ol>
    </div>
  </div>
</section>
<section class="section">
  <div class="wrap">
    <div class="section-head"><p class="eyebrow">Pre nego što donesete uređaj</p><h2>Šta je dobro da pripremite</h2></div>
    <div class="cards">
      <article class="card"><div class="icon">{ICONS["disk"]}</div><h3>Rezervna kopija</h3><p>Ako možete, sačuvajte važne fajlove na eksterni disk ili u oblak. Podatke čuvamo pažljivo, ali kopija je uvek sigurnija.</p></article>
      <article class="card"><div class="icon">{ICONS["bolt"]}</div><h3>Punjač</h3><p>Donesite originalni punjač. Mnogi kvarovi su zapravo u punjaču ili kablu.</p></article>
      <article class="card"><div class="icon">{ICONS["shield"]}</div><h3>Lozinka za prijavu</h3><p>Za testiranje sistema korisna je lozinka za Windows nalog. Nije obavezna za hardverske popravke.</p></article>
    </div>
  </div>
</section>
'''
page("postupak.html", "Postupak servisiranja · Reset servis", "Kako izgleda servisiranje laptopa i računara, faza po faza.", post)

# ---------- Pitanja ----------
faq = [
 ("Dijagnostika i cene", [
   ("Koliko košta dijagnostika?","Dijagnostika je besplatna ako popravku radite kod nas. Ako odustanete od popravke, naplaćujemo 1.500 RSD <span class=\"probno\">probno</span>."),
   ("Da li ću znati cenu pre popravke?","Da. Posle dijagnostike vas pozovemo i kažemo tačnu cenu i rok. Ništa ne radimo bez vašeg odobrenja."),
   ("Kako mogu da platim?","Gotovinom, platnim karticama ili uplatom na račun za pravna lica. Dobijate fiskalni račun."),
 ]),
 ("Rokovi i garancija", [
   ("Koliko traje popravka?","Čišćenje, instalacija sistema i ugradnja SSD-a obično su gotovi isti ili sledeći dan. Zamena ekrana i delova traje 1 do 3 dana, a složenije popravke matične ploče do 7 dana."),
   ("Koliko traje garancija?","Na rad i ugrađene delove dajemo 6 meseci garancije. Garancija ne važi za nova mehanička oštećenja i prosutu tečnost."),
   ("Da li postoji hitna popravka?","Da, za većinu usluga možemo da završimo posao isti dan uz doplatu od 30%, ako je deo na stanju."),
 ]),
 ("Podaci i uređaji", [
   ("Da li ću izgubiti podatke?","Kod većine popravki podaci ostaju netaknuti. Ako je potrebna reinstalacija ili zamena diska, pre toga vas pitamo i nudimo prebacivanje podataka."),
   ("Da li popravljate MacBook računare?","Da. Radimo čišćenje, zamenu baterije, tastature i SSD nadogradnju na modelima gde je to moguće."),
   ("Mogu li da pratim status popravke?","Da. Pozovite nas ili pošaljite broj radnog naloga, pa ćemo vam reći u kom je koraku popravka."),
   ("Šta ako se popravka ne isplati?","Iskreno vam kažemo ako je popravka skuplja od vrednosti uređaja. Možemo da spasemo podatke i predložimo zamenu."),
 ]),
]
fq = ""
for group, items in faq:
    fq += f'    <div class="faq-group">\n      <h2>{group}</h2>\n'
    for q, a in items:
        fq += f'      <details><summary>{q}</summary><div class="answer"><p>{a}</p></div></details>\n'
    fq += '    </div>\n'
pit = pagehead("Česta pitanja", "Česta pitanja", "Odgovori na pitanja koja nam klijenti najčešće postavljaju. Ako ne nađete svoje, pišite nam.") + f'''
<section class="section">
  <div class="wrap">
{fq}    <div class="cta"><h2>Imate drugo pitanje?</h2><p>Pozovite nas ili pošaljite poruku preko forme. Odgovaramo istog radnog dana.</p><div class="btn-row"><a class="btn btn-primary" href="kontakt.html">Kontaktirajte nas</a></div></div>
  </div>
</section>
'''
page("pitanja.html", "Česta pitanja · Reset servis", "Odgovori na najčešća pitanja o servisu laptopova i računara.", pit)

# ---------- Kontakt ----------
kon = pagehead("Kontakt", "Kontakt i prijava kvara", "Donesite uređaj bez zakazivanja ili nam unapred opišite kvar preko forme.") + '''
<section class="section">
  <div class="wrap contact-grid">
    <div style="display:grid;gap:28px;min-width:0">
      <ul class="info-list">
        <li><span class="label">Adresa <span class="probno">probno</span></span><span class="value">Bulevar kralja Aleksandra 000, 11000 Beograd</span></li>
        <li><span class="label">Telefon <span class="probno">probno</span></span><span class="value">+381 11 000 0000 <button class="copy-btn" type="button" data-copy="+381110000000">Kopiraj</button></span></li>
        <li><span class="label">Viber / WhatsApp <span class="probno">probno</span></span><span class="value">+381 60 000 0000</span></li>
        <li><span class="label">E-pošta <span class="probno">probno</span></span><span class="value">servis@primer.rs <button class="copy-btn" type="button" data-copy="servis@primer.rs">Kopiraj</button></span></li>
        <li><span class="label">Radno vreme <span class="probno">probno</span></span>
          <div class="hours"><span>Pon–Pet</span><span>09:00–19:00</span><span>Subota</span><span>10:00–15:00</span><span>Nedelja</span><span>zatvoreno</span></div>
        </li>
      </ul>
      <div class="map-box">
        <strong>Kako do nas</strong>
        <p style="color:var(--muted)">Primer lokacije: blizu Vukovog spomenika, linije 7, 12 i 14. Parking u okolnim ulicama (zona 2).</p>
        <a href="https://www.openstreetmap.org/#map=15/44.8040/20.4790" target="_blank" rel="noopener">Otvori mapu Beograda →</a>
      </div>
    </div>
    <form class="panel" id="forma-prijava" novalidate>
      <h2 style="font-size:1.4rem">Prijavi kvar</h2>
      <p style="color:var(--muted)">Demo forma: podaci se nigde ne šalju.</p>
      <div class="field-row">
        <div class="field"><label for="ime">Ime i prezime</label><input id="ime" name="ime" autocomplete="name" placeholder="Petar Petrović"></div>
        <div class="field"><label for="telefon">Telefon</label><input id="telefon" name="telefon" type="tel" autocomplete="tel" placeholder="06x xxx xxxx"></div>
      </div>
      <div class="field-row">
        <div class="field"><label for="uredjaj">Vrsta uređaja</label>
          <select id="uredjaj" name="uredjaj"><option>Laptop</option><option>Desktop računar</option><option>MacBook</option><option>Drugo</option></select></div>
        <div class="field"><label for="model">Proizvođač i model</label><input id="model" name="model" placeholder="npr. Lenovo IdeaPad 5"></div>
      </div>
      <div class="field"><label for="opis">Opis kvara</label><textarea id="opis" name="opis" placeholder="Šta se dešava, od kada, da li je bilo pada ili prosute tečnosti..."></textarea></div>
      <div class="btn-row"><button class="btn btn-primary" type="submit">Pošalji prijavu</button></div>
      <p class="form-msg" id="forma-poruka" tabindex="-1" hidden>Ovo je demo sajt, pa prijava nije poslata. Na pravom sajtu ovde bi stigla potvrda sa brojem radnog naloga.</p>
    </form>
  </div>
</section>
'''
page("kontakt.html", "Kontakt · Reset servis", "Adresa, telefon, radno vreme i forma za prijavu kvara.", kon)
