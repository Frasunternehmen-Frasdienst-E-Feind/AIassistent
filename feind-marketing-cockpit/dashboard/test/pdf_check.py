"""Prüft die Brennglas-PDFs aus test/pdf.cjs: kleinste Schriftgröße (mind. 10 pt), Formularfelder,
keine Zeichen außerhalb WinAnsi-Ersatz (≥ ≤ → ✓), keine E-Mail-Adressen/Telefonnummern, Rendern als PNG.
Aufruf: python3 test/pdf_check.py <ordner> [png-ordner]"""
import sys, os, re, json
import pypdfium2 as pdfium
import pypdfium2.raw as raw
import pikepdf

src = sys.argv[1]
png = sys.argv[2] if len(sys.argv) > 2 else None
if png: os.makedirs(png, exist_ok=True)
EMAIL = re.compile(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}')
PHONE = re.compile(r'(?:\+|00)\d{2}[\s\d/-]{6,}\d|\b0\d{3,5}[\s/-]\d{4,}')
bad = 0
for f in sorted(x for x in os.listdir(src) if x.endswith('.pdf')):
    p = os.path.join(src, f)
    doc = pdfium.PdfDocument(p)
    mins, text, chars = 99.0, '', 0
    for i in range(len(doc)):
        tp = doc[i].get_textpage()
        n = tp.count_chars()
        for c in range(n):
            u = raw.FPDFText_GetUnicode(tp, c)
            if chr(u).isspace(): continue
            mins = min(mins, raw.FPDFText_GetFontSize(tp, c)); chars += 1
        text += tp.get_text_range() + '\n'
    with pikepdf.open(p) as pk:
        fields = len(pk.Root.AcroForm.Fields) if '/AcroForm' in pk.Root else 0
        oa = pk.Root.get('/OpenAction')
        auto = isinstance(oa, pikepdf.Dictionary) and str(oa.get('/N')) == '/Print'
    probs = []
    if mins < 10: probs.append('Schrift %.1f pt' % mins)
    if fields < 3: probs.append('nur %d Formularfelder' % fields)
    for ch in '≥≤→✓↗−':
        if ch in text: probs.append('Zeichen ' + ch)
    if EMAIL.search(text): probs.append('E-Mail: ' + EMAIL.search(text).group(0))
    if PHONE.search(text): probs.append('Telefon: ' + PHONE.search(text).group(0))
    if re.search(r'\bDavid\b', text): probs.append('Personenname')
    if 'Brennglas' not in text or 'intern' not in text or 'Seite 1' not in text: probs.append('Kopf/Fußzeile fehlt')
    if 'Weitere Notizen' not in text or '(optional)' not in text: probs.append('Notizfeld fehlt')
    if ('_Druck' in f or '-print' in f) and not auto: probs.append('Druckdialog fehlt')
    if png:
        for i in range(len(doc)):
            doc[i].render(scale=1.3, may_draw_forms=True).to_pil().save(os.path.join(png, f[:-4] + '-%d.png' % (i + 1)))
    bad += bool(probs)
    print(('OK   ' if not probs else 'FEHL ') + f + ' · %d S. · min %.1f pt · %d Felder · %d Zeichen' % (len(doc), mins, fields, chars) + (' · ' + ' | '.join(probs) if probs else ''))
sys.exit(1 if bad else 0)
