# Sajt servisa laptopova i računara

Sajt sa zakazivanjem servisa, praćenjem statusa popravke i panelom za zaposlene.
Radi na Node.js 22 bez ijedne dodatne biblioteke. Baza je ugrađeni SQLite (jedan fajl).

## Šta sistem radi

**Za klijente (javni sajt)**
- Usluge i cene, posebna stranica za svaku uslugu, kalkulator cene, postupak, česta pitanja
- Zakazivanje u 4 koraka, samo u slobodne termine; klijent dobija broj naloga i potvrdu e-poštom
- Stranica Status popravke: faza, dijagnoza, cena, rok (bez imena i telefona)
- Svetla i tamna tema, prilagođeno telefonu, pretraga sajta, prijava za savete

**Za firmu (panel na `/admin`)**
- Nalozi: zahtevi sa sajta i nalozi sa šaltera, faze popravke, štampa potvrde, link za klijenta
- Termini po danima
- Sadržaj sajta: podaci o firmi, radno vreme, usluge i cene, česta pitanja, recenzije, logo i boje
  (bez programera; svaka verzija se čuva i može da se vrati)
- Korisnici sa ulogama: vlasnik, recepcija, serviser
- Dnevnik: ko je, kada i šta menjao
- E-poruke klijentima: potvrda zakazivanja, procena, uređaj spreman; obaveštenje servisu o novom zakazivanju
- Automatske dnevne rezervne kopije, izvoz naloga u Excel (CSV)

## Brzo pokretanje na svom računaru

Potreban je [Node.js 22](https://nodejs.org) (verzija 22.13 ili novija).

```
ADMIN_PASSWORD=neka-duga-lozinka npm start
```

Na Windows-u (PowerShell): `$env:ADMIN_PASSWORD="neka-duga-lozinka"; npm start`

- Sajt: http://localhost:3000
- Panel: http://localhost:3000/admin, korisnik `admin`, lozinka iz `ADMIN_PASSWORD`

Pri prvom pokretanju server pravi korisnika `admin`. Posle toga se lozinke menjaju u panelu.

Testovi: `npm test` · Statična kopija sajta za pregled: `npm run build` (pravi folder `public/`)

## Postavljanje na internet

Detaljno uputstvo, klik po klik: **[docs/POSTAVLJANJE.md](docs/POSTAVLJANJE.md)**

Ukratko:
1. Render.com → New → Blueprint → ovaj repozitorijum (`render.yaml` sve podešava, uključujući disk za bazu).
2. Upišite `ADMIN_PASSWORD` i podatke za slanje e-pošte.
3. Dodajte domen i podesite DNS.
4. U panelu, u kartici Sadržaj sajta, upišite prave podatke i isključite demo režim.

Folder iz `DATA_DIR` mora biti na trajnom disku, inače se podaci brišu pri restartu.

## Promenljive okruženja

| Naziv | Obavezno | Opis |
|---|---|---|
| `ADMIN_PASSWORD` | pri prvom pokretanju | Lozinka za prvog korisnika `admin` |
| `DATA_DIR` | ne | Folder za bazu, kopije i otpremljene slike (podrazumevano `./data`) |
| `TRUST_PROXY` | iza proksija | `1` na Renderu i iza Nginx/Caddy (prava IP adresa i HTTPS) |
| `PORT` | ne | Podrazumevano 3000 |
| `PUBLIC_URL` | ne | Adresa za linkove u e-porukama, ako se razlikuje od one u panelu |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | za e-poštu | Podaci SMTP servera (npr. Brevo) |
| `SMTP_SECURE` | ne | `starttls` (port 587, podrazumevano), `ssl` (port 465) ili `none` |
| `MAIL_FROM` | za e-poštu | Pošiljalac, npr. `Reset servis <servis@vas-servis.rs>` |
| `MAIL_REPLY_TO` | ne | Adresa na koju stižu odgovori klijenata |
| `BACKUP_KEEP` | ne | Koliko dnevnih kopija se čuva (podrazumevano 14) |
| `NOTIFY_WEBHOOK_URL` | ne | Slack/Discord/Make webhook za obaveštenje o novom zakazivanju |

Primer je u `.env.example`.

## Uloge u panelu

| Može | Vlasnik | Recepcija | Serviser |
|---|:-:|:-:|:-:|
| Vidi naloge i termine | ✓ | ✓ | ✓ |
| Menja fazu, dijagnozu, cenu, rok, beleške | ✓ | ✓ | ✓ |
| Otvara naloge, menja podatke klijenta | ✓ | ✓ | |
| Vidi pretplatnike | ✓ | ✓ | |
| Briše naloge, izvozi CSV | ✓ | | |
| Menja sadržaj sajta, korisnike, e-poštu | ✓ | | |
| Dnevnik i rezervne kopije | ✓ | | |

## Bezbednost

- Lozinke: scrypt; sesije u bazi (12 h), odjava sa svih uređaja pri promeni lozinke ili deaktivaciji
- Kolačić `HttpOnly`, `SameSite=Strict`, `Secure` na HTTPS-u; izmene u panelu traže posebno zaglavlje
- Ograničenje broja pokušaja: prijava, zakazivanje, provera statusa, prijava za savete
- Sav sadržaj iz panela se escapuje pri generisanju stranica; otpremaju se samo prave slike (PNG, JPG, WebP, do 3 MB)
- Bezbednosna zaglavlja: CSP, HSTS, X-Frame-Options, nosniff; zaštita od CSV formula u izvozu
- Javni status prikazuje samo uređaj, kvar, dijagnozu, cenu i fazu

## Rezervne kopije

Server jednom dnevno pravi kopiju baze u `DATA_DIR/backups` i čuva poslednjih 14.
Vlasnik ih preuzima u panelu (kartica Rezervne kopije). Preuzmite kopiju bar jednom nedeljno i čuvajte je van servera.

**Vraćanje kopije:** zaustavite server, zamenite `DATA_DIR/reset.db` preuzetom kopijom
(obrišite `reset.db-wal` i `reset.db-shm` ako postoje), pa ponovo pokrenite server.

## Struktura

```
config/content.json     početni sadržaj sajta (posle prvog pokretanja sadržaj je u bazi)
server/server.js        server i API
server/lib/             baza, prijava i uloge, e-pošta, termini, rezervne kopije
server/render/          generator stranica i crteži
server/admin/           panel
assets/                 stil i skripte sajta, ikonica, slika za deljenje
test/                   automatski testovi (npm test)
docs/                   uputstva i šabloni dokumenata
```
