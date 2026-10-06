# Reset servis — sajt servisa laptopova i računara

Kompletan sajt sa zakazivanjem servisa, praćenjem statusa popravke i administratorskim panelom.
Radi na Node.js 22 bez ijedne dodatne biblioteke (baza je ugrađeni SQLite).

## Šta sajt radi

| Za klijente | Za servis (panel na `/admin`) |
|---|---|
| Usluge, cene, kalkulator cene, postupak, česta pitanja | Lista svih naloga, pretraga i filteri po fazi |
| Zakazivanje u 4 koraka, dobija broj naloga (npr. `RN-2026-7KQ4M`) | Novi zahtevi sa sajta stižu kao „Zakazan termin“ |
| Stranica **Status popravke**: faza, dijagnoza, cena, rok | Otvaranje naloga na šalteru, štampa potvrde za klijenta |
| Prijava za savete (e-pošta) | Promena faze jednim klikom; klijent odmah vidi novu fazu |
| | Interne beleške, izvoz u CSV (Excel), lista pretplatnika |

Na javnoj stranici statusa nikada se ne prikazuju ime ni telefon klijenta.

## Pre pokretanja: 3 koraka

1. **Upišite podatke o servisu** u `config/site.json`: naziv, adresa, telefon, e-pošta, radno vreme, domen (`siteUrl`), PIB.
   Ocene (`rating`), brojke (`stats`) i recenzije (`reviews`) zamenite pravim podacima ili ih obrišite (`[]` / `null`), pa se taj deo neće prikazivati.
2. **Proverite usluge i cene** u `tools/data.py` (`SERVICES`, `prices`) i cene u kalkulatoru u `tools/build.py` (`CALC_ISSUES`).
3. U `config/site.json` postavite **`"demo": false`** i pokrenite:

   ```
   python3 tools/build.py
   ```

   Time nestaju demo traka, oznake „probno“ i probni nalozi, a sajt postaje vidljiv pretraživačima.

Pregledajte i `privatnost.html` (politika privatnosti je šablon; dopunite je podacima firme).

## Pokretanje na svom računaru

Potreban je Node.js 22.13 ili noviji (i Python 3, samo za `build.py`).

```
ADMIN_PASSWORD=neka-lozinka npm start
```

Sajt: http://localhost:3000 · Panel: http://localhost:3000/admin

Testovi: `npm test`

## Postavljanje na internet

Server čuva bazu u folderu `DATA_DIR`. Taj folder **mora biti trajan disk**, inače se nalozi brišu pri svakom restartu.

### Render.com (najjednostavnije)
1. Na render.com: **New → Blueprint**, izaberite ovaj GitHub repozitorijum (koristi `render.yaml`).
2. Unesite `ADMIN_PASSWORD`. `SESSION_SECRET` se sam generiše, a disk za bazu je već podešen.
3. U podešavanjima servisa dodajte svoj domen (Custom Domain); HTTPS je automatski.

Plan sa diskom je plaćen (oko 7 USD mesečno). Besplatan plan ne čuva bazu.

### Sopstveni server (VPS) sa Dockerom
```
docker build -t reset-servis .
docker run -d --name reset -p 3000:3000 -v reset-data:/data \
  -e ADMIN_PASSWORD=... -e SESSION_SECRET=... --restart unless-stopped reset-servis
```
Ispred postavite Caddy ili Nginx za HTTPS i domen (npr. Caddy: `vas-domen.rs { reverse_proxy localhost:3000 }`).

### Promenljive okruženja
| Naziv | Obavezno | Opis |
|---|---|---|
| `ADMIN_PASSWORD` | da | Lozinka za `/admin`. Bez nje je panel isključen. |
| `SESSION_SECRET` | preporučeno | Dug nasumičan niz; bez njega se prijava u panel gubi pri restartu. |
| `DATA_DIR` | ne | Folder za bazu (podrazumevano `./data`). |
| `TRUST_PROXY` | iza proksija | `1` na Renderu, Railwayu ili iza Nginx/Caddy. |
| `PORT` | ne | Podrazumevano 3000. |
| `NOTIFY_WEBHOOK_URL` | ne | Adresa (npr. Slack, Discord ili Make/Zapier webhook) na koju stiže poruka o svakom novom zakazivanju. |

Primer je u `.env.example`.

## Svakodnevni rad

1. Klijent zakaže na sajtu → u panelu se pojavi nalog „Zakazan termin“ (filter **Zakazani**). Pozovite ga da potvrdite termin.
2. Kada donese uređaj, otvorite nalog i kliknite fazu **Primljen u servis**, pa **Štampaj potvrdu**.
   Ako dođe bez zakazivanja: **+ Novi nalog**.
3. Kako popravka napreduje, kliknite odgovarajuću fazu i upišite dijagnozu, cenu i rok, pa **Sačuvaj**.
   Klijent sve to vidi na stranici Status popravke (link: **Kopiraj link za klijenta**, može se poslati SMS-om ili Viberom).
4. Kada je gotovo: **Spreman za preuzimanje**, a po preuzimanju **Preuzet**.

## Rezervna kopija

Cela baza je jedan fajl: `DATA_DIR/reset.db`. Kopirajte ga redovno (npr. jednom dnevno).
Za brzi pregled podataka u Excelu koristite **Izvoz CSV** u panelu.

## Struktura

```
config/site.json      podaci o servisu i demo prekidač
tools/data.py         usluge, cene, faze, česta pitanja
tools/build.py        generiše sve .html stranice (pokrenuti posle svake izmene)
tools/illus.py        crteži
assets/               stil, skripte, ikonica, slika za deljenje
server/server.js      server i API
server/admin/         administratorski panel
test/                 automatski testovi servera
```

Izmene sadržaja: menjajte `config/site.json` ili `tools/*.py`, pa pokrenite `python3 tools/build.py`.
Ne menjajte `.html` fajlove ručno, jer ih `build.py` prepisuje.
