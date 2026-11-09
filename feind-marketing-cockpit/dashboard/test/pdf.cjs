// PDF-Test Feind Cockpit: löst in jedem Modul die Brennglas-PDF (und eine Druckfassung) aus, fängt den Download ab
// und speichert die Dateien in PDF_OUT. Geprüft wird danach mit test/pdf_check.py (Schriftgröße, Formularfelder,
// Rendern). Beispieldaten nur für den Test (lokaler Speicher), keine echten Personen.
// Aufruf: PDF_OUT=/pfad [JSPDF_FILE=/pfad/jspdf.umd.min.js] node test/pdf.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const url = 'file://' + path.resolve(__dirname, '../dashboard.html');
const OUT = process.env.PDF_OUT || path.join(require('os').tmpdir(), 'feind-cockpit-pdf');
const JSPDF = process.env.JSPDF_FILE || '';
fs.mkdirSync(OUT, { recursive: true });
const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const SEED = {
  'meta/sync': { content: { at: new Date().toISOString(), source: 'Test' }, leads: { at: new Date().toISOString(), source: 'Test' }, tenders: { at: new Date().toISOString(), source: 'Test' } },
  'content/c1': { title: 'Fallstudie Kaltfräsen B96', channel: 'linkedin', status: 'entwurf', plannedDate: d(3), statusSince: d(-20), region: 'Brandenburg', source: 'Test' },
  'content/c2': { title: 'Messe-Countdown InfraTech', channel: 'website', status: 'review', plannedDate: d(8), region: 'Niederlande', source: 'Test' },
  'content/c3': { title: 'Newsletter Oktober', channel: 'newsletter', status: 'veroeffentlicht', publishedDate: d(-2), source: 'Test' },
  'mkt_leads/l1': { organisation: 'Stadt Beispielstadt Tiefbauamt', orgType: 'kommune', stage: 'qualifiziert', channel: 'messe', region: 'Brandenburg', createdAt: d(-12), lastContact: d(-11), nextAction: 'Rückruf bei max.mustermann@beispiel.de, Tel. 0171 1234567', valueBand: '10-50k' },
  'mkt_leads/l2': { organisation: 'Beispiel Bau GmbH', orgType: 'bauunternehmen', stage: 'angebot', channel: 'website', region: 'Sachsen', createdAt: d(-3), lastContact: d(-1), valueBand: '50-150k' },
  'mkt_leads/l3': { organisation: 'Ingenieurbüro Muster', orgType: 'ingenieurbuero', stage: 'neu', channel: 'empfehlung', region: 'Berlin', createdAt: d(-40), lastContact: d(-30) },
  'mkt_leads/l4': { organisation: 'Landesbetrieb Straßenbau (Test)', orgType: 'behoerde', stage: 'gewonnen', channel: 'ausschreibung', region: 'Brandenburg', createdAt: d(-60), lastContact: d(-5) },
  'tenders/t1': { title: 'Fräsarbeiten L 49 Ortsdurchfahrt', authority: 'Landesbetrieb Straßenwesen Brandenburg', deadline: d(2), status: 'in_pruefung', fit: 'passt', region: 'Brandenburg', portal: 'Vergabemarktplatz', url: 'https://example.org/t1' },
  'tenders/t2': { title: 'Deckenerneuerung A 24 Abschnitt 3', authority: 'Autobahn GmbH', deadline: d(6), status: 'neu', fit: 'pruefen', region: 'Mecklenburg-Vorpommern' },
  'tenders/t3': { title: 'Grinding Betonfahrbahn', authority: 'Rijkswaterstaat', deadline: d(25), status: 'neu', fit: 'pruefen', region: 'Niederlande' },
  'events/e1': { title: 'Tag der offenen Tür Lübben', type: 'tag_der_offenen_tuer', date: d(20), location: 'Lübben', checklist: [{ area: 'sicherheit', item: 'Absperrung planen', done: true }, { area: 'marketing', item: 'Einladung versenden', done: false }, { area: 'logistik', item: 'Parkflächen markieren', done: false }] },
  'events/infratech-2027': { title: 'InfraTech 2027 – Messe Rotterdam', type: 'messe', date: '2027-01-12', endDate: '2027-01-15', location: 'Rotterdam Ahoy', checklist: [{ area: 'budget', item: 'Budgetrahmen 2027 festlegen', done: false }, { area: 'marketing', item: 'Einreichung Innovationspreis', done: true }] },
  'seo_keywords/k1': { keyword: 'kaltfräsen brandenburg', region: 'Brandenburg', position: 4, previousPosition: 7, clicks: 31, impressions: 800, url: 'https://example.org/kaltfraesen', checkedAt: d(-1) },
  'seo_keywords/k2': { keyword: 'straßenfräsen', position: 18, previousPosition: 12, clicks: 4, impressions: 1200, url: 'https://example.org/', checkedAt: d(-1) },
  'seo_gaps/g1': { topic: 'Grooving für Flughäfen', service: 'Grooving', priority: 'hoch', reason: 'Suchvolumen ohne eigene Seite' },
  'references/r1': { title: 'B96 Fahrbahnerneuerung', year: '2025', region: 'Brandenburg', client: 'Musterkunde GmbH', clientApproved: true, services: ['Kaltfräsen'], facts: ['12.000 m²'], summary: 'Nachtbaustelle' },
  'references/r2': { title: 'Kreisstraße Wittenburg', year: '2024', region: 'Mecklenburg-Vorpommern', client: 'Geheim AG', clientApproved: false, services: ['Kaltfräsen', 'Grinding'] },
  ['briefings/' + d(0)]: { date: d(0), summary: 'Zwei Fristen in dieser Woche, ein Lead wartet auf Rückruf.', items: [{ module: 'tenders', severity: 'kritisch', text: 'Frist L 49 in 2 Tagen.' }, { module: 'mkt_leads', severity: 'warnung', text: 'Rückruf bei info@beispiel.de offen.' }], generatedBy: 'copilot' },
  'meetings/m1': { id: 'm1', title: 'Messe-Abstimmung InfraTech 2027', date: d(-7), status: 'abgeschlossen', durationMin: 42, participants: ['mkt', 'gl'], agenda: [{ id: 's1', title: '2027-Handbuch anfordern', section: 'over', owner: 'mkt' }],
    changes: { s1: { title: '2027-Handbuch anfordern', fromStatus: 'open', toStatus: 'in_progress', fromDue: '2026-10-02', toDue: '2026-10-09', note: 'Anfrage raus' } }, decisions: { d1: { text: 'Stand ab 25 m² anfragen', taskTitle: 'Flächenentscheidung' } }, created: {}, notes: 'Nächster Termin in zwei Wochen.' },
  'budget/actuals': { blocks: { 'messestand-standbau': { ist: 14500 } } }
};
(async () => {
  const launch = { executablePath: '/opt/pw-browsers/chromium' };
  if (!JSPDF && process.env.HTTPS_PROXY) launch.proxy = { server: process.env.HTTPS_PROXY };
  const b = await chromium.launch(launch);
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, ignoreHTTPSErrors: true });
  if (JSPDF) await ctx.route('https://cdnjs.cloudflare.com/**', r => r.fulfill({ path: JSPDF, contentType: 'application/javascript' }));
  await ctx.addInitScript(seed => { try { if (!localStorage.getItem('feind-cockpit:db')) localStorage.setItem('feind-cockpit:db', JSON.stringify(seed)); } catch (e) { /* egal */ } }, SEED);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(url + '#marketing-copilot'); await p.waitForTimeout(1200);
  const mods = await p.evaluate(() => Object.fromEntries(Object.entries(FC.app.MODULES).map(([k, v]) => [k, v.map(x => x[0])])));
  const res = [];
  let printed = false;
  for (const [world, keys] of Object.entries(mods)) for (const key of keys) {
    await p.evaluate(([a, c]) => FC.app.navigate(a, c), [world, key]); await p.waitForTimeout(150);
    const ids = await p.evaluate(([a, c]) => FC.app.actionsFor(a, c).filter(x => /-pdf$/.test(x.id) && !x.disabled).map(x => x.id).concat(FC.app.actionsFor(a, c).filter(x => /-print$/.test(x.id)).slice(0, 1).map(x => x.id)), [world, key]);
    for (const id of ids) {
      if (/-print$/.test(id) && printed) continue;
      try {
        const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }), p.evaluate(x => FC.app.runAction(x), id)]);
        const file = path.join(OUT, world + '-' + key + '-' + id + '.pdf');
        await dl.saveAs(file);
        const info = await p.evaluate(() => FC.app.lastPdf);
        res.push({ module: world + '-' + key, id, file: path.basename(file), pages: info.pages, fields: info.fields, name: dl.suggestedFilename() });
        if (/-print$/.test(id)) printed = true;
      } catch (e) { res.push({ module: world + '-' + key, id, error: String(e.message || e).slice(0, 200) }); }
    }
  }
  fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify({ res, errs }, null, 1));
  for (const r of res) console.log((r.error ? 'FEHL ' : 'OK   ') + r.module + ' ' + r.id + (r.error ? ' · ' + r.error : ' · ' + r.name + ' · ' + r.pages + ' S. · ' + r.fields + ' Felder'));
  if (errs.length) console.log('JS-Fehler: ' + errs.join(' | '));
  await b.close();
  process.exit(res.some(r => r.error) || errs.length ? 1 : 0);
})();
