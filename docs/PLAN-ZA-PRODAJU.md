# Plan: od gotovog koda do prodatog sajta

Ovo je spisak onoga što **vi** radite, redom. Tehnički deo je urađen i opisan u `README.md` i `docs/POSTAVLJANJE.md`.
Na svakom koraku možete otvoriti novu sesiju sa mnom (Claude) na ovom repozitorijumu i tražiti pomoć.

---

## FAZA A — Priprema (1–2 nedelje, pre prvog klijenta)

### A1. Registrujte delatnost
1. Nađite knjigovođu (preporuka poznanika ili udruženja preduzetnika). Pitajte:
   - da li da budete preduzetnik paušalac ili nešto drugo,
   - koja šifra delatnosti odgovara (najčešće 62.01, računarsko programiranje),
   - koliki su mesečni porezi i doprinosi i kako se izdaje račun.
2. Registrujte se preko APR-a (može elektronski). Knjigovođa vam obično pomaže.
3. Otvorite poslovni račun u banci.

Bez ovoga firma ne može da vam plati.

### A2. Advokat za šablone (jednom)
Odnesite advokatu fajlove iz `docs/prodaja/`: ponudu, ugovor o izradi, ugovor o obradi podataka, ugovor o održavanju i zapisnik.
Tražite pregled i prilagođavanje. Posle toga ih koristite za svakog klijenta.

### A3. Vaši nalozi
- **Menadžer lozinki** (npr. Bitwarden, besplatan): tu čuvate sve lozinke, svoje i klijentove.
- **Poslovna e-pošta** na vaše ime (može i Gmail za početak).
- **GitHub**: već imate.
- **Render.com nalog**, za demo.

### A4. Postavite demo za pokazivanje klijentima (30 minuta, besplatno)
Za demo ne treba plaćeni plan: podaci se brišu pri restartu, ali za pokazivanje je to u redu.
1. Na render.com kliknite **New → Web Service** (ne Blueprint, jer Blueprint traži plaćeni disk) i izaberite repozitorijum.
2. Podesite: **Runtime** Node, **Build Command** `true`, **Start Command** `npm start`, **Instance Type** Free.
3. Pod **Environment** dodajte `ADMIN_PASSWORD` (vaša lozinka, bar 10 znakova) i `NODE_VERSION` = `22.13.0`.
4. Kliknite **Create Web Service** i sačekajte adresu oblika `https://ime.onrender.com`.
5. Ostavite **demo režim uključen**. Prijavite se u `/admin` kao `admin`.
6. Sačuvajte link. Njega pokazujete klijentima na telefonu.

Besplatan servis „zaspi“ posle neaktivnosti, pa se prvi put otvara pola minuta do minut. Otvorite ga malo pre sastanka.

### A5. Isprobajte sve sami
Prođite ceo put kao klijent i kao zaposleni, po `docs/UPUTSTVO-ZA-PANEL.md`: zakažite, otvorite nalog, promenite faze,
odštampajte potvrdu, izmenite cenu u sadržaju. Morate znati da pokažete svaki deo.

---

## FAZA B — Pronalaženje klijenta

### B1. Napravite spisak
U Google Maps potražite „servis laptopova“ i „servis računara“ u svom gradu. Zapišite 20–30 firmi:
naziv, telefon, da li imaju sajt, kako izgleda, da li imaju zakazivanje ili praćenje statusa.
Najbolji kandidati: srednje firme (više zaposlenih, dobre ocene) sa zastarelim sajtom ili bez sajta.

### B2. Prvi kontakt
Kratko i konkretno, telefonom ili lično:
> „Napravila sam sistem za servise: klijenti sami zakazuju termin i prate gde im je laptop, a vi sve vodite u jednom panelu. Mogu da vam pokažem za 10 minuta.“

Pokažite demo na telefonu: zakazivanje, status popravke, panel.

### B3. Sastanak
- Ponesite **upitnik** (`docs/prodaja/01-UPITNIK-ZA-KLIJENTA.md`) i prođite ga zajedno.
- Pitajte šta im smeta u sadašnjem radu: telefoni, sveske, klijenti koji stalno zovu da pitaju „je l' gotovo“.
- Zapišite posebne zahteve (fakturisanje, SMS, više lokacija). Pošaljite ih meni pre ponude, da procenimo koliko posla zahtevaju.

---

## FAZA C — Ponuda i ugovor

### C1. Ponuda
Popunite `docs/prodaja/02-PONUDA.md`. Okvirno, za Srbiju (proverite sa nekim iz branše):
- izrada sa zakazivanjem i panelom za srednju firmu: najčešće nekoliko hiljada evra, u dinarima,
- održavanje: od nekoliko desetina do par stotina evra mesečno, zavisno od obima.

Ne spuštajte cenu zato što je kod pisan uz AI: firma plaća rešenje, prilagođavanje, odgovornost i podršku.

### C2. Ugovor
Kada prihvate: ugovor o izradi + ugovor o obradi podataka, potpisani, i **avans pre početka rada**.

---

## FAZA D — Izrada za klijenta (sa mnom)

### D1. Podaci od klijenta
Sakupite sve iz upitnika: logo, fotografije, cene, radno vreme, spisak zaposlenih.

### D2. Prilagođavanje (ja radim)
Otvorite novu sesiju sa mnom na ovom repozitorijumu i napišite:
> „Novi klijent: [naziv]. Napravi granu za njih. Evo podataka iz upitnika: …“

Ja prilagođavam boje, tekstove, usluge i posebne zahteve, pa pravim početni sadržaj.

### D3. Nalozi na ime firme
Zajedno sa nekim iz firme (njihova kartica, njihova e-pošta) otvorite:
Render (plaćeni plan sa diskom), domen, Brevo za e-poštu, UptimeRobot.
Sebe dodajte kao člana tima. Sve lozinke idu u menadžer lozinki.

### D4. Postavljanje
Pratite `docs/POSTAVLJANJE.md`, korake 1–8. Kada zapnete, pošaljite mi tačnu poruku greške ili snimak ekrana.

### D5. Provera
Prođite spisak „Provera pre predaje“ na kraju `docs/POSTAVLJANJE.md`. Svaka stavka mora biti štiklirana.

---

## FAZA E — Predaja

1. **Obuka** (1–2 sata): vlasnik i zaposleni, po `docs/UPUTSTVO-ZA-PANEL.md`. Ostavite im to uputstvo (PDF ili odštampano).
2. **Isključite demo režim** u panelu, zajedno sa vlasnikom.
3. **Zapisnik o primopredaji** (`docs/prodaja/06-...`): popunite i potpišite.
4. Izdajte račun za drugu ratu.
5. Ponudite **ugovor o održavanju**.

---

## FAZA F — Održavanje (ako ga ugovorite)

| Kada | Šta |
|---|---|
| Svake nedelje | Preuzmite rezervnu kopiju iz panela i sačuvajte je van servera (npr. Drive firme) |
| Svakog meseca | Pogledajte Dnevnik i E-poštu u panelu (greške, neuspele prijave); proverite da UptimeRobot radi |
| Kad stigne upozorenje | Proverite Render (Logs). Ako ne znate šta je, pošaljite mi poruku greške |
| Kad klijent traži izmenu | Tekstove i cene menja sam u panelu; za nove funkcije otvorite sesiju sa mnom |

---

## Okvirni početni troškovi (vaši, ne klijentovi)

| Stavka | Okvirno |
|---|---|
| Registracija preduzetnika | mala državna taksa (proverite na APR-u) |
| Knjigovođa | mesečno, po dogovoru |
| Advokat za šablone | jednokratno, po dogovoru |
| Demo na Renderu | besplatno |
| Menadžer lozinki | besplatno |

Troškove hostinga, domena i e-pošte za sajt plaća firma klijenta, na svoje ime.

---

## Šta ja (Claude) ne mogu umesto vas

- Da vodim pregovore, potpisujem ugovore ili otvaram naloge na tuđe ime
- Da dam pravni ili poreski savet koji zamenjuje advokata i knjigovođu
- Da nadgledam sajt 24 sata: radim samo kada mi pišete. Zato postoje UptimeRobot i rezervne kopije.

## Šta možemo da dogradimo kada klijent zatraži
SMS obaveštenja (preko domaćeg SMS servisa), više lokacija servisa, engleska verzija,
povezivanje sa programom za fakturisanje, prijem uređaja sa fotografijama, garantni list u PDF-u.
