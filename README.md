# Reset servis — demo sajt

Demo sajt na srpskom za servis laptopova i računara u Beogradu. Svi podaci (adresa, telefon, cene, ocene, merenja) su probni i jasno označeni.

Stranice: početna (`index.html`), usluge i cene, posebna stranica za svaku od 9 usluga (opis, šta je uključeno, grafikon raspona cena), postupak servisiranja kroz 7 faza sa crtežima, česta pitanja i kontakt.

Stil i skripta su u `assets/`. Sve stranice generiše `tools/build.py` (crteži su u `tools/illus.py`):

```
python3 tools/build.py
```

Sajt je statičan: dovoljno je otvoriti `index.html` u pregledaču.
