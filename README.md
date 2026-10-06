# Reset servis — demo sajt

Demo sajt na srpskom za servis laptopova i računara u Beogradu. Svi podaci (adresa, telefon, cene, ocene, recenzije, nalozi i merenja) su probni i jasno označeni.

## Stranice
- Početna: dijagnostička konzola uživo, brendovi, brojke, bento mreža usluga, klizač pre/posle, postupak kroz 7 faza (sticky), kalkulator cene, recenzije, pitanja
- Usluge i cene, plus posebna stranica za svaku od 9 usluga (opis, liste, grafikon raspona cena)
- Postupak servisiranja, Status popravke (praćenje po broju naloga), Česta pitanja (sa pretragom), Kontakt (zakazivanje u 4 koraka)

## Mogućnosti
Tamna i svetla tema, glatko skrolovanje (Lenis), pojavljivanje sadržaja pri skrolovanju, pretraga celog sajta (Ctrl/⌘ K), mega meni, mobilni meni preko celog ekrana, magnetna dugmad, kursor, traka napretka, strelica za vrh sa prstenom, status „otvoreno/zatvoreno“ po beogradskom vremenu, akciona traka na telefonu.

## Izmene
Sadržaj je u `tools/data.py`, crteži u `tools/illus.py`, a stranice generiše:

```
python3 tools/build.py
```

Stil i skripte su u `assets/`. Sajt je statičan: dovoljno je otvoriti `index.html` u pregledaču.
