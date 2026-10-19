"""Füllt ein Aufgaben-PDF aus dem Cockpit wie eine Person am Papier/PDF-Viewer: zwei offene Aufgaben als erledigt
ankreuzen, bei einer dritten eine Notiz eintragen, bei einer vierten Rolle und Termin ändern. Schlüssel kommen aus der Stand-Kennung (Dokument-Stichwörter).
Aufruf: python3 test/pdf_fill.py <ein.pdf> <aus.pdf>  → gibt die gewählten Schlüssel als JSON aus."""
import sys, json, pikepdf
src, dst = sys.argv[1], sys.argv[2]
pdf = pikepdf.open(src)
kw = str(pdf.docinfo.get('/Keywords', ''))
base = json.loads(kw[kw.index('feind-cockpit-aufgaben:') + len('feind-cockpit-aufgaben:'):])
open_keys = [k for k, v in base['rows'].items() if v[1] != 'done']
done_keys, note_key, edit_key = open_keys[:2], open_keys[2], open_keys[3]
fields = {str(f.get('/T')): f for f in pdf.Root.AcroForm.Fields}
for k in done_keys:
    f = fields['E_' + k]
    f.V = pikepdf.Name('/On')
    for w in ([f] if '/AS' in f or '/AP' in f else list(f.get('/Kids', []))):
        w.AS = pikepdf.Name('/On')
fields['N_' + note_key].V = pikepdf.String('Testnotiz aus PDF')
fields['V_' + edit_key].V = pikepdf.String('Messeteam')
fields['B_' + edit_key].V = pikepdf.String('15.11.2026')
pdf.Root.AcroForm.NeedAppearances = True
pdf.save(dst)
print(json.dumps({'done': done_keys, 'note': note_key, 'edit': edit_key, 'ids': {k: base['rows'][k][0] for k in done_keys + [note_key, edit_key]}}))
