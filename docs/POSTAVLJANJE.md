# Postavljanje sajta na internet, korak po korak

Ovo uputstvo vodi od koda na GitHub-u do sajta koji radi na domenu firme, sa slanjem e-pošte,
statistikom poseta i nadzorom rada. Za sve zajedno treba oko 2–3 sata.

> **Pravilo:** sve naloge (hosting, domen, e-pošta, statistika) otvorite **na ime i karticu firme klijenta**,
> a sebe dodajte kao člana tima ili administratora. Tako firma ostaje vlasnik svega, a vi ne plaćate njihove račune.

Cene u ovom uputstvu su okvirne. Proverite ih na sajtu svakog servisa pre nego što ih navedete u ponudi.

---

## 1. Hosting na Render.com (oko 30 minuta)

1. Na https://render.com napravite nalog (najlakše „Sign up with GitHub“), ili neka ga napravi klijent i pozove vas u tim.
2. Povežite GitHub nalog na kom je repozitorijum sa kodom.
3. Kliknite **New → Blueprint** i izaberite repozitorijum. Render čita `render.yaml` i sam podešava:
   - Node 22, komandu za pokretanje i proveru rada (`/api/health`),
   - disk od 1 GB za bazu (`/var/data`),
   - region Frankfurt (najbliži Srbiji).
4. Render traži vrednosti koje niste upisali u kod:
   - `ADMIN_PASSWORD`: dugačka lozinka (bar 10 znakova) za prvog korisnika `admin`. Zapišite je u menadžer lozinki.
   - `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`: za sada ostavite prazno. Popunjavate ih u koraku 3.
5. Kliknite **Apply**. Posle nekoliko minuta dobijate adresu oblika `https://servis-sajt.onrender.com`.
6. Otvorite tu adresu i proverite sajt. Zatim otvorite `/admin` i prijavite se kao `admin`.

**Cena:** plan „Starter“ sa diskom, oko 7 USD mesečno plus disk (oko 0,25 USD po GB). Besplatan plan **ne čuva bazu** i nije za pravu upotrebu.

**Probna verzija (staging):** za isprobavanje izmena pre objavljivanja napravite drugi servis iz istog Blueprint-a, sa druge grane (npr. `staging`) i drugim imenom. Izmene prvo pustite tamo.

---

## 2. Domen (oko 20 minuta, plus vreme da se DNS proširi)

1. Domen `.rs` se kupuje kod registra ovlašćenog od RNIDS-a. Spisak je na https://www.rnids.rs. Kupuje ga firma, na svoje ime.
   - Domen `.rs` za firmu traži podatke firme (PIB, matični broj).
   - Cena je obično nekoliko hiljada dinara godišnje.
2. Na Renderu, u servisu: **Settings → Custom Domains → Add**, pa upišite `www.vas-servis.rs` i `vas-servis.rs`.
3. Render prikazuje DNS zapise. Kod registra domena (DNS podešavanja) dodajte:
   - za `www`: zapis **CNAME** koji pokazuje na adresu servisa (`servis-sajt.onrender.com`),
   - za sam domen: zapis koji Render navede (**A** ili **ALIAS/ANAME**).
4. Sačekajte da Render pokaže „Verified“. Može da potraje od par minuta do 24 sata. HTTPS sertifikat se pravi automatski.
5. U panelu: **Sadržaj sajta → Osnovni podaci → Adresa sajta** upišite `https://www.vas-servis.rs` i sačuvajte.

---

## 3. Slanje e-pošte preko Brevo-a (oko 30 minuta)

Sajt šalje e-poruke klijentima (potvrda, procena, uređaj spreman) i servisu (novo zakazivanje).
Može se koristiti bilo koji SMTP servis. Ovde je opisan **Brevo**, koji ima besplatan paket za manji broj poruka dnevno.

1. Napravite nalog na https://www.brevo.com, na ime firme.
2. **Senders, Domains & Dedicated IPs → Domains → Add a domain**: upišite domen firme.
   Brevo pokazuje DNS zapise (SPF, DKIM, DMARC). Dodajte ih kod registra domena isto kao u koraku 2 i sačekajte potvrdu.
   **Bez ovoga poruke završavaju u neželjenoj pošti.**
3. **SMTP & API → SMTP** prepišite vrednosti:
   - SMTP server (npr. `smtp-relay.brevo.com`), port `587`, login (korisničko ime),
   - napravite **SMTP key** i prepišite ga. To je lozinka.
4. Na Renderu: **Environment** upišite:
   - `SMTP_HOST` = SMTP server, `SMTP_PORT` = `587`, `SMTP_USER` = login, `SMTP_PASS` = SMTP ključ,
   - `MAIL_FROM` = `Naziv servisa <servis@vas-servis.rs>` (adresa sa domena koji ste potvrdili),
   - po želji `MAIL_REPLY_TO` = adresa na koju firma prima odgovore.
   Sačuvajte; servis se sam ponovo pokreće.
5. U panelu: **E-pošta → Probna poruka**, pošaljite sebi. Proverite i folder za neželjenu poštu.
6. **Sadržaj sajta → Zakazivanje i obaveštenja**: upišite adrese zaposlenih koji primaju obaveštenje o novom zakazivanju.

Ako poruka ne stigne, u kartici **E-pošta** piše razlog greške (npr. pogrešna lozinka ili nepotvrđen domen).

---

## 4. Poslovna e-pošta firme (ako je nemaju)

Da bi klijenti pisali na `servis@vas-servis.rs`, firmi treba poštansko sanduče: Google Workspace, Microsoft 365 ili Zoho Mail.
Svaki od njih daje svoje DNS zapise (MX). Dodajte ih kod registra domena. Cena je obično nekoliko dolara po korisniku mesečno.

---

## 5. Sadržaj i puštanje u rad (oko 1 sat, zajedno sa klijentom)

1. Prijavite se u panel kao `admin`. U kartici **Moj nalog** promenite lozinku.
2. **Korisnici:** napravite naloge za zaposlene (recepcija, serviseri) i vlasnika. Svako ima svoju lozinku.
   Korisnika `admin` možete deaktivirati kada vlasnik dobije svoj nalog.
3. **Sadržaj sajta**, redom po karticama:
   - Osnovni podaci: firma, PIB, adresa, telefon, e-pošta, radno vreme, link do mape,
   - Početna: naslov, stvarna ocena sa Google-a ili prazno, **recenzije samo stvarne i uz dozvolu**,
   - Usluge i cene: proverite svaku uslugu i cenu, dodajte fotografije ako ih firma ima,
   - Zakazivanje: trajanje termina, broj klijenata po terminu, neradni dani (praznici),
   - Izgled: logo i boje firme.
4. Proverite **Politiku privatnosti** na sajtu (`/privatnost.html`). Firma ili njen pravnik treba da je odobri.
5. Na kraju, u **Osnovni podaci** isključite **Demo režim** i sačuvajte.
   Nestaju demo traka i oznake „probno“, a sajt postaje vidljiv Google-u.

---

## 6. Google (oko 30 minuta)

1. **Google Search Console** (https://search.google.com/search-console): dodajte domen, potvrdite ga DNS zapisom,
   pa u „Sitemaps“ pošaljite `https://www.vas-servis.rs/sitemap.xml`.
2. **Google Business profil** firme: u polje za sajt upišite novu adresu. Za lokalni servis to donosi najviše novih klijenata.

---

## 7. Statistika poseta bez kolačića (opciono)

1. Nalog na https://plausible.io (plaćen, cena po broju poseta; postoji probni period).
2. Dodajte sajt sa domenom firme.
3. U panelu: **Sadržaj sajta → Izgled → Domen na Plausible-u**, upišite domen i sačuvajte.

Plausible ne koristi kolačiće, pa sajtu ne treba traka za pristanak.

---

## 8. Nadzor rada (15 minuta)

1. Nalog na https://uptimerobot.com (besplatan paket je dovoljan).
2. **Add New Monitor → HTTP(s)**, adresa `https://www.vas-servis.rs/api/health`, provera na 5 minuta.
3. Upišite e-poštu (i telefon, ako želite SMS) na koju stiže upozorenje kada sajt ne radi.

---

## 9. Rezervne kopije

- Server sam pravi kopiju svaki dan i čuva poslednjih 14, na istom disku.
- **Jednom nedeljno** u panelu (Rezervne kopije) preuzmite najnoviju kopiju i sačuvajte je van servera
  (npr. na Google Drive firme). Ovo je obaveza iz ugovora o održavanju.
- Render nudi i sopstvene snimke diska (Disk → Snapshots). Proverite da su uključeni.

**Vraćanje kopije:** na Renderu otvorite **Shell** servisa i zamenite `/var/data/reset.db` kopijom, ili zamolite Claude-a da vas vodi kroz to.

---

## 10. Provera pre predaje klijentu

- [ ] Sajt radi na domenu, sa HTTPS-om, na telefonu i računaru
- [ ] Zakazivanje sa sajta stiže u panel; klijent i servis dobijaju e-poruke
- [ ] Promena faze na „Procena poslata“ i „Spreman“ šalje poruku klijentu
- [ ] Status popravke radi sa pravim brojem naloga
- [ ] Svaki zaposleni ima svoj nalog; `admin` je deaktiviran ili ima jaku lozinku
- [ ] Demo režim je isključen; nema izmišljenih ocena, brojki ni recenzija
- [ ] Politika privatnosti je odobrena
- [ ] Probna rezervna kopija je preuzeta i otvara se (npr. u programu DB Browser for SQLite)
- [ ] UptimeRobot šalje upozorenje (probajte ga privremeno pauziranjem servisa)
- [ ] Search Console prihvatio sitemap; Google Business profil vodi na novi sajt
