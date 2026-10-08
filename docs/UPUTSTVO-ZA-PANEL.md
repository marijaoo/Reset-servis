# Uputstvo za zaposlene: kako se koristi panel

Panel je na adresi **vaš-sajt/admin** (npr. `https://www.vas-servis.rs/admin`).
Radi na računaru, tabletu i telefonu. Svako ima svoje korisničko ime i lozinku. Ne delite ih sa drugima.

## Prijava

1. Otvorite `/admin`, upišite korisničko ime i lozinku i kliknite **Prijavi se**.
2. Prijava traje 12 sati. Na zajedničkom računaru kliknite **Odjava** kada završite.
3. Lozinku menjate u kartici **Moj nalog**. Zaboravljenu lozinku resetuje vlasnik u kartici **Korisnici**.

## Šta ko vidi

- **Recepcija:** prima klijente, otvara naloge, menja podatke i faze, štampa potvrde.
- **Serviser:** vidi naloge, menja fazu, dijagnozu, cenu, rok i beleške. Ne menja podatke klijenta.
- **Vlasnik:** sve to, plus sadržaj sajta, korisnici, dnevnik, e-pošta i rezervne kopije.

---

## Svakodnevni rad

### 1. Novi zahtev sa sajta
Kada klijent zakaže na sajtu, nalog se pojavljuje u kartici **Nalozi** sa oznakom **Zakazan termin**
(i u kartici **Termini**, po danima). Klijent dobija broj naloga i potvrdu e-poštom, ako je ostavio adresu.

**Šta radite:** pozovite klijenta i potvrdite termin. Ako termin treba promeniti, otvorite nalog,
promenite datum i vreme i kliknite **Sačuvaj**.

### 2. Klijent donosi uređaj
- **Ako je zakazao:** pronađite nalog (pretraga po imenu, telefonu ili broju), kliknite fazu **Primljen u servis**, dopunite model i opis, pa **Sačuvaj**.
- **Ako nije zakazao:** kliknite **+ Novi nalog**, upišite podatke klijenta i uređaja, pa **Otvori nalog**.

Zatim kliknite **Štampaj potvrdu**. Klijent potpisuje potvrdu i nosi je sa sobom. Na njoj su broj naloga i adresa za praćenje statusa.

### 3. Dijagnostika i procena
1. Serviser upiše **Dijagnozu**, **Cenu** i **Rok**.
2. Klikne fazu **Procena poslata** i **Sačuvaj**.
3. Klijent automatski dobija e-poruku sa procenom. Ako nema e-poštu, pozovite ga telefonom; panel vas na to podseća.

### 4. Klijent odobri
Kliknite **Vi ste odobrili**, pa kako posao napreduje **U popravci** i **Testiranje**.
Svaka promena se odmah vidi na stranici Status popravke.

### 5. Uređaj je gotov
Kliknite **Spreman za preuzimanje**. Klijent dobija e-poruku da može da dođe.
Kada preuzme uređaj, kliknite **Preuzet**. Nalog se tada sklanja iz liste aktivnih (filter **Preuzeti**).

### Link za klijenta
Dugme **Kopiraj link za klijenta** kopira adresu na kojoj klijent vidi status svog naloga.
Možete je poslati SMS-om ili Viberom.

### Interne beleške
Polje **Interne beleške** vidi samo osoblje, nikad klijent. Tu upišite šifru za Windows, napomene o delovima i slično.

### Istorija naloga
Na dnu svakog naloga, pod **Istorija izmena**, vidi se ko je i kada menjao fazu i podatke.

---

## Za vlasnika

### Izmena sajta (kartica Sadržaj sajta)
Sve na sajtu menjate sami, bez programera:
- **Osnovni podaci:** naziv, adresa, telefon, e-pošta, radno vreme, garancija, demo režim,
- **Početna:** naslov, ocena, brojke, recenzije,
- **Usluge i cene:** dodavanje, brisanje i redosled usluga, cene, fotografije,
- **Postupak** i **Česta pitanja**,
- **Kalkulator:** cene koje kalkulator nudi,
- **Zakazivanje i obaveštenja:** trajanje termina, koliko klijenata po terminu, neradni dani, ko prima obaveštenja,
- **Izgled:** logo i boje.

Posle izmene kliknite **Sačuvaj izmene**. Sajt se osveži za par sekundi.
Ako nešto pođe naopako, pod **Ranije verzije** kliknite **Vrati ovu verziju**.

**Važno:** ocene, brojke i recenzije moraju biti stvarne. Recenziju objavite samo uz dozvolu klijenta.

### Praznici i godišnji odmor
U **Zakazivanje i obaveštenja → Neradni dani** upišite datume (npr. `2026-12-31`), jedan po redu.
Ti dani se ne nude za zakazivanje.

### Korisnici
- **Novi zaposleni:** kartica **Korisnici → Novi korisnik**. Izaberite ulogu, kliknite **Predloži lozinku**, pa **Dodaj korisnika**. Lozinku predajte zaposlenom; on je menja u **Moj nalog**.
- **Zaposleni odlazi:** kliknite **Deaktiviraj**. Odmah gubi pristup, a njegove izmene ostaju zabeležene.

### Rezervne kopije
Server sam pravi kopiju svaki dan. **Jednom nedeljno** u kartici **Rezervne kopije** kliknite **Preuzmi** kod najnovije
i sačuvajte fajl na sigurno mesto van servera (npr. Google Drive firme).

### Dnevnik
Kartica **Dnevnik** pokazuje sve radnje u panelu: prijave, neuspele pokušaje prijave, izmene naloga i sajta.

### Izvoz u Excel
Dugme **Izvoz CSV** (kartica Nalozi) preuzima sve naloge. Fajl se otvara u Excelu.

---

## Česta pitanja zaposlenih

**Klijent kaže da nije dobio e-poruku.** Neka proveri folder za neželjenu poštu. Vlasnik u kartici **E-pošta** vidi da li je poruka poslata i zašto nije, ako nije.

**Klijent je izgubio broj naloga.** Pronađite nalog po imenu ili telefonu i pošaljite mu link za praćenje.

**Pogrešno sam promenio fazu.** Kliknite ispravnu fazu i sačuvajte. Promena se beleži u istoriji.

**Termin je pun, a klijent insistira.** Otvorite nalog ručno (**+ Novi nalog**) i upišite termin. Ograničenje važi samo za zakazivanje preko sajta.

**Sajt ne radi.** Javite se osobi zaduženoj za održavanje. Ona dobija i automatsko upozorenje.
