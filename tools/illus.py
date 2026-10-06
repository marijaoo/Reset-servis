"""Crteži (inline SVG) za usluge i faze postupka. Boje dolaze iz CSS tokena preko klasa."""

def svg(body, label, vb="0 0 320 220"):
    return f'<svg class="illus" viewBox="{vb}" role="img" aria-label="{label}">{body}</svg>'

def _laptop_base(y=156):
    return f'<path class="b" d="M58 {y}h204l-14 18H72z"/><path class="l" d="M140 {y+9}h40"/>'

SERVICE = {
"laptop": svg('''<circle class="g" cx="160" cy="112" r="98"/>
<rect class="b" x="78" y="40" width="164" height="112" rx="8"/><rect class="m" x="90" y="52" width="140" height="88" rx="3"/>
<path class="as" d="M160 76v18"/><path class="as" d="M148 83a17 17 0 1 0 24 0"/>
''' + _laptop_base() + '''
<g transform="translate(262 40) rotate(35)"><rect class="s" x="-8" y="0" width="16" height="40" rx="6"/><path class="l" d="M0 40v38"/></g>
<circle class="s blink" cx="104" cy="164" r="3"/>''', "Laptop sa simbolom za uključivanje i šrafcigerom"),

"pc": svg('''<circle class="g" cx="160" cy="112" r="98"/>
<rect class="b" x="48" y="50" width="148" height="96" rx="6"/><rect class="m" x="58" y="60" width="128" height="76" rx="2"/>
<path class="as" d="M70 120l22-18 18 10 24-28 26 16 16-8"/>
<path class="l" d="M122 146v18M94 168h56"/>
<rect class="b" x="214" y="40" width="62" height="130" rx="6"/>
<circle class="as" cx="245" cy="66" r="9"/><path class="t" d="M226 94h38M226 104h38M226 114h38M226 124h38"/>
<circle class="s blink" cx="262" cy="156" r="3.5"/>''', "Desktop računar sa monitorom"),

"fan": svg('''<circle class="g" cx="150" cy="112" r="98"/>
<rect class="b" x="64" y="40" width="144" height="144" rx="18"/>
<circle class="t" cx="136" cy="112" r="56"/>
<g class="spin" style="transform-origin:136px 112px">
<ellipse class="a" cx="136" cy="80" rx="13" ry="26" opacity=".9"/>
<ellipse class="a" cx="136" cy="80" rx="13" ry="26" opacity=".9" transform="rotate(90 136 112)"/>
<ellipse class="a" cx="136" cy="80" rx="13" ry="26" opacity=".9" transform="rotate(180 136 112)"/>
<ellipse class="a" cx="136" cy="80" rx="13" ry="26" opacity=".9" transform="rotate(270 136 112)"/>
</g><circle class="b" cx="136" cy="112" r="10"/>
<circle class="m" cx="80" cy="54" r="4"/><circle class="m" cx="194" cy="170" r="5"/><circle class="m" cx="88" cy="168" r="3"/><circle class="m" cx="192" cy="58" r="3"/>
<rect class="b" x="234" y="44" width="22" height="108" rx="11"/><circle class="b" cx="245" cy="164" r="17"/>
<rect class="s" x="240" y="100" width="10" height="60" rx="5"/><circle class="s" cx="245" cy="164" r="11"/>
<path class="t" d="M262 64h8M262 84h8M262 104h8M262 124h8"/>''', "Ventilator i termometar"),

"screen": svg('''<circle class="g" cx="140" cy="112" r="98"/>
<rect class="b" x="44" y="40" width="160" height="108" rx="8"/><rect class="m" x="56" y="52" width="136" height="84" rx="3"/>
<path class="l" d="M118 58l14 24-12 12 18 22M132 82l26-8M120 94l-26 16M138 116l6 18"/>
<path class="b" d="M28 152h196l-14 18H42z"/>
<g transform="rotate(8 262 90)"><rect class="b" x="222" y="58" width="80" height="58" rx="4"/><rect class="a" x="230" y="66" width="64" height="42" rx="2" opacity=".3"/></g>
<path class="as" d="M252 140c-8 20-36 30-56 22"/><path class="as" d="M202 154l-8 8 11 3"/>
<circle class="ok" cx="290" cy="56" r="13"/><path class="l" style="stroke:var(--surface)" d="M284 56l4 4 8-8"/>''', "Napukao ekran laptopa i novi panel"),

"disk": svg('''<circle class="g" cx="160" cy="112" r="98"/>
<rect class="b" x="40" y="56" width="104" height="128" rx="12"/>
<circle class="l" cx="92" cy="112" r="34"/><circle class="a" cx="92" cy="112" r="7"/>
<path class="l" d="M124 166l-26-48"/><circle class="s" cx="124" cy="166" r="5"/>
<path class="as flow" d="M156 120h52"/><path class="as" d="M202 110l12 10-12 10"/>
<path class="b" d="M226 78h30l10 12h30v82h-70z"/>
<path class="t" d="M240 112h42M240 126h42M240 140h30"/>
<circle class="ok" cx="292" cy="168" r="13"/><path class="l" style="stroke:var(--surface)" d="M286 168l4 4 8-8"/>''', "Prebacivanje podataka sa diska u folder"),

"chip": svg('''<circle class="g" cx="160" cy="112" r="98"/>
<rect class="b" x="40" y="60" width="124" height="52" rx="7"/><rect class="s" x="54" y="72" width="46" height="28" rx="4"/>
<path class="t" d="M114 78h36M114 88h36M114 98h24"/>
<rect class="b" x="30" y="132" width="164" height="44" rx="4"/>
<rect class="a" x="44" y="140" width="20" height="24" rx="2"/><rect class="a" x="72" y="140" width="20" height="24" rx="2"/><rect class="a" x="100" y="140" width="20" height="24" rx="2"/><rect class="a" x="128" y="140" width="20" height="24" rx="2"/><rect class="a" x="156" y="140" width="20" height="24" rx="2"/>
<path class="t" d="M40 176v6M52 176v6M64 176v6M76 176v6M88 176v6M100 176v6M124 176v6M136 176v6M148 176v6M160 176v6M172 176v6M184 176v6"/>
<path class="m" d="M206 140a54 54 0 0 1 108 0z" opacity=".6"/>
<path class="l" d="M206 140a54 54 0 0 1 108 0"/>
<path class="as" style="stroke-width:7" d="M268 92a54 54 0 0 1 42 38"/>
<path class="l" d="M260 140l30-34"/><circle class="b" cx="260" cy="140" r="7"/>
<path class="t" d="M216 140h6M298 140h6M260 92v6"/>''', "SSD disk, RAM memorija i merač brzine"),

"drop": svg('''<circle class="g" cx="160" cy="112" r="98"/>
<rect class="b" x="40" y="118" width="240" height="74" rx="8"/>
<path class="t" d="M56 140h40l10 10h40M56 168h70l10-12h30M200 136h60M210 172h50l8-8"/>
<rect class="m" x="160" y="132" width="34" height="34" rx="3"/>
<circle class="t" cx="232" cy="154" r="8"/><circle class="t" cx="82" cy="154" r="5"/>
<g class="bob"><path class="a" d="M160 18c0 0 34 40 34 62a34 34 0 0 1-68 0c0-22 34-62 34-62z" opacity=".9"/>
<path class="l" style="stroke:var(--surface)" d="M146 78a16 16 0 0 0 10 16"/></g>
<circle class="a" cx="116" cy="110" r="5" opacity=".5"/><circle class="a" cx="206" cy="106" r="4" opacity=".5"/>''', "Kap tečnosti iznad matične ploče"),

"bolt": svg('''<circle class="g" cx="160" cy="112" r="98"/>
<rect class="b" x="30" y="128" width="240" height="64" rx="8"/>
<path class="t" d="M44 150h50M44 172h40l8-8M210 150h50M220 174h40"/>
<rect class="b" x="110" y="122" width="76" height="48" rx="4"/>
<path class="t" d="M120 122v-8M134 122v-8M148 122v-8M162 122v-8M176 122v-8M120 170v8M134 170v8M148 170v8M162 170v8M176 170v8"/>
<path class="hs" d="M296 30l-46 40"/><path class="l" d="M250 70l-52 46"/><path class="l" style="stroke-width:4" d="M200 114l-6 6"/>
<path class="ss blink" d="M186 104l-8-6M190 96l-2-10M196 94l8-6"/>''', "Lemilica i čip na matičnoj ploči"),

"shield": svg('''<circle class="g" cx="160" cy="112" r="98"/>
<rect class="b" x="24" y="44" width="80" height="56" rx="5"/><rect class="m" x="32" y="52" width="64" height="40" rx="2"/>
<rect class="b" x="120" y="34" width="80" height="56" rx="5"/><rect class="m" x="128" y="42" width="64" height="40" rx="2"/>
<rect class="b" x="216" y="44" width="80" height="56" rx="5"/><rect class="m" x="224" y="52" width="64" height="40" rx="2"/>
<path class="l" d="M64 100v10M160 90v10M256 100v10"/>
<path class="as flow" d="M64 112v12h192v-12M160 100v24"/>
<path class="b" d="M160 128l40 13v24c0 22-17 34-40 40-23-6-40-18-40-40v-24z"/>
<path class="oks" d="M144 164l11 11 21-21"/>''', "Tri računara pod zaštitom"),
}

# Faze postupka (manji crteži)
def ps(body, label):
    return svg(body, label, "0 0 240 160")

PHASE = [
ps('''<circle class="g" cx="120" cy="80" r="70"/>
<rect class="b" x="70" y="20" width="62" height="120" rx="10"/><rect class="m" x="78" y="34" width="46" height="88" rx="3"/>
<rect class="a" x="140" y="34" width="66" height="26" rx="10"/><path class="l" style="stroke:var(--surface)" d="M150 47h40"/>
<rect class="b" x="148" y="70" width="58" height="24" rx="10"/><path class="t" d="M158 82h34"/>
<circle class="s blink" cx="101" cy="130" r="3"/>''', "Telefon i poruke"),
ps('''<circle class="g" cx="120" cy="80" r="70"/>
<rect class="b" x="72" y="22" width="96" height="122" rx="8"/><rect class="s" x="100" y="14" width="40" height="18" rx="5"/>
<path class="t" d="M88 56h64M88 72h64M88 88h40"/>
<rect class="a" x="88" y="104" width="64" height="24" rx="4" opacity=".2"/><text x="120" y="121" text-anchor="middle" style="font:600 12px var(--font-mono);fill:var(--accent)">RN-0417</text>''', "Radni nalog na tabli"),
ps('''<circle class="g" cx="120" cy="80" r="70"/>
<rect class="b" x="40" y="54" width="150" height="86" rx="6"/>
<path class="t" d="M52 74h30l8 8h30M52 120h44l8-8h20M140 70h38M150 126h30"/><rect class="m" x="112" y="88" width="30" height="26" rx="2"/>
<circle class="b" cx="146" cy="76" r="30" style="fill:color-mix(in srgb, var(--surface) 70%, transparent)"/><circle class="s" cx="132" cy="70" r="4"/>
<path class="l" style="stroke-width:7" d="M168 98l26 26"/>''', "Lupa iznad matične ploče"),
ps('''<circle class="g" cx="120" cy="80" r="70"/>
<rect class="b" x="80" y="16" width="80" height="132" rx="12"/><rect class="m" x="88" y="30" width="64" height="100" rx="3"/>
<rect class="b" x="94" y="42" width="52" height="34" rx="6"/><text x="120" y="64" text-anchor="middle" style="font:600 11px var(--font-mono);fill:var(--ink)">3.500</text>
<rect class="ok" x="94" y="94" width="52" height="22" rx="11"/><path class="l" style="stroke:var(--surface)" d="M112 105l5 5 10-10"/>''', "Telefon sa procenom i dugmetom za odobrenje"),
ps('''<circle class="g" cx="120" cy="80" r="70"/>
<path class="b" d="M34 92h172l-12 40H46z"/><rect class="m" x="56" y="100" width="128" height="24" rx="3"/>
<rect class="a" x="70" y="104" width="22" height="16" rx="2"/><rect class="a" x="100" y="104" width="22" height="16" rx="2" opacity=".6"/>
<g transform="translate(174 16) rotate(35)"><rect class="s" x="-8" y="0" width="16" height="38" rx="6"/><path class="l" d="M0 38v40"/></g>''', "Otvoren laptop i šrafciger"),
ps('''<circle class="g" cx="120" cy="80" r="70"/>
<rect class="b" x="40" y="26" width="160" height="100" rx="6"/><rect class="m" x="50" y="36" width="140" height="80" rx="2"/>
<path class="as" d="M56 92l18-24 16 30 16-44 16 52 16-34 16 18 14-8 16 6"/>
<path class="l" d="M120 126v14M96 144h48"/><circle class="ok" cx="184" cy="46" r="6"/>''', "Monitor sa grafikom testa"),
ps('''<circle class="g" cx="120" cy="80" r="70"/>
<path class="b" d="M50 70h110v68H50z"/><path class="b" d="M50 70l20-26h110l-20 26"/><path class="b" d="M160 70l20-26v68l-20 26"/>
<path class="ss" d="M96 70v20"/>
<rect class="b" x="150" y="14" width="56" height="74" rx="4" transform="rotate(10 178 50)"/>
<path class="t" d="M162 34h30M161 46h30M160 58h20" transform="rotate(10 178 50)"/>
<circle class="ok" cx="196" cy="98" r="14"/><path class="l" style="stroke:var(--surface)" d="M189 98l5 5 9-9"/>''', "Paket i račun sa garancijom"),
]

# Male ikonice za traku faza (24x24)
def icon(d):
    return f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{d}</svg>'

PHASE_ICONS = [
 icon('<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>'),
 icon('<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 2h6v4H9zM9 11h6M9 15h4"/>'),
 icon('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>'),
 icon('<path d="M4 5h16v11H9l-5 4z"/><path d="M9 10.5l2 2 4-4"/>'),
 icon('<path d="M14.5 6.5a4 4 0 0 0-5.6 5L3 17.4 6.6 21l5.9-5.9a4 4 0 0 0 5-5.6l-2.6 2.6-2.4-.6-.6-2.4z"/>'),
 icon('<path d="M3 12h4l3-8 4 16 3-8h4"/>'),
 icon('<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M8.5 12l2.5 2.5 5-5"/>'),
]

def fan_scene(dirty):
    """Ventilator laptopa pre (prašnjav) i posle čišćenja, za klizač pre/posle."""
    dust = ""
    if dirty:
        import random
        rnd = random.Random(7)
        for _ in range(70):
            x, y, r = rnd.uniform(60, 250), rnd.uniform(40, 200), rnd.uniform(1.5, 5)
            dust += f'<circle class="dust" cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}"/>'
        dust += '<path class="dust" d="M70 70c30-8 50 6 80-4s40 10 70 2v12c-30 8-40-10-70-2s-50-6-80 4z" opacity=".5"/>'
    blades = "".join(f'<path class="a" d="M155 120c-6-30 4-52 26-60 6 22-4 44-26 60z" opacity="{.55 if dirty else .95}" transform="rotate({a} 155 120)"/>' for a in range(0, 360, 45))
    spin = "spin-slow" if dirty else "spin"
    therm_h = 96 if dirty else 52
    therm_col = "s" if dirty else "ok"
    label = "Prašnjav ventilator pre čišćenja" if dirty else "Čist ventilator posle čišćenja"
    return svg(f'''<rect class="b" x="40" y="22" width="232" height="196" rx="22"/>
<circle class="t" cx="155" cy="120" r="78"/><circle class="t" cx="155" cy="120" r="84"/>
<g class="{spin}" style="transform-origin:155px 120px">{blades}</g>
<circle class="b" cx="155" cy="120" r="14"/>
{dust}
<rect class="b" x="282" y="40" width="18" height="140" rx="9"/><circle class="b" cx="291" cy="190" r="14"/>
<rect class="{therm_col}" x="287" y="{176-therm_h}" width="8" height="{therm_h}" rx="4"/><circle class="{therm_col}" cx="291" cy="190" r="9"/>''', label, "0 0 320 240")

MAP_ART = '''<svg viewBox="0 0 400 150" role="img" aria-label="Ilustracija lokacije servisa (nije prava mapa)">
<rect width="400" height="150" style="fill:var(--bg-2)"/>
<g style="stroke:var(--line-2);stroke-width:10;fill:none;stroke-linecap:round">
<path d="M-10 40L410 70"/><path d="M-10 120L410 95"/><path d="M90 -10L130 160"/><path d="M260 -10L240 160"/></g>
<g style="stroke:var(--line);stroke-width:4;fill:none"><path d="M-10 15L410 30"/><path d="M180 -10L190 160"/><path d="M330 -10L350 160"/><path d="M-10 150L410 130"/></g>
<path d="M-10 82L410 82" style="stroke:var(--accent);stroke-width:3;fill:none;opacity:.35;stroke-dasharray:2 8;stroke-linecap:round"/>
<circle cx="200" cy="80" r="26" style="fill:var(--accent);opacity:.15"><animate attributeName="r" values="14;34;14" dur="3s" repeatCount="indefinite"/></circle>
<path d="M200 48c-12 0-21 9-21 21 0 16 21 33 21 33s21-17 21-33c0-12-9-21-21-21z" style="fill:var(--accent)"/><circle cx="200" cy="69" r="7" style="fill:var(--bg)"/>
</svg>'''
