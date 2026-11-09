// Test PDF-Rücklauf und Notion-führende Aufgaben: Notion wird im Browser nachgebildet (Lesen liefert die eingebaute
// Liste als Notion-Zeilen, Schreiben wird nur protokolliert). Ablauf: Quelle „Notion live“ prüfen, Event-Checkliste
// InfraTech aus den Aufgaben ableiten, Aufgaben-PDF erzeugen, mit pikepdf ausfüllen (2 erledigt, 1 Notiz), in Notion
// eine der Aufgaben inzwischen ändern (Konflikt); zusätzlich Rolle und Termin einer vierten Aufgabe, PDF einlesen, Diff prüfen, Konflikt auf PDF stellen, übernehmen,
// geschriebene Notion-Eigenschaften prüfen. Danach ohne Notion: Notfallstand gekennzeichnet, Übernehmen gesperrt.
// Aufruf: NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt node test/pdf_return.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const url = 'file://' + path.resolve(__dirname, '../dashboard.html');
const OUT = process.env.PDF_OUT || path.join(require('os').tmpdir(), 'feind-cockpit-pdfin');
fs.mkdirSync(OUT, { recursive: true });
const html = fs.readFileSync(path.resolve(__dirname, '../dashboard.html'), 'utf8');
const TASKS = eval(html.slice(html.indexOf('const TASKS = [') + 14, html.indexOf('\n  ];', html.indexOf('const TASKS = [')) + 4));
const CATS = { steuerung: 'Steuerung & Fristen', innovation: 'Innovationspreis', standbau: 'Standbau & Technik', logistik: 'Logistik & Transport', reise: 'Hotel & Reise', material: 'Material & Packliste', catering: 'Catering', marketing: 'Marketing & Print', leads: 'Leads & CRM', rotterdam: 'Rotterdam / NL-Spezifika', ablauf: 'Durchführung & Review', dokumente: 'Dokumente & Ablage' };
const ROLES = { mkt: 'Marketing & Event', team: 'Messeteam', gl: 'Geschäftsleitung', vertrieb: 'Vertrieb', werkstatt: 'Werkstatt', it: 'IT / Webbetreuung', extern: 'Dienstleister' };
const hex = i => ('3eb40f8bbabb81' + String(i).padStart(18, '0')).slice(0, 32);
const ROWS = TASKS.map((t, i) => ({ url: 'https://app.notion.com/' + hex(i + 1), Nr: i + 1, Aufgabe: t.title, Status: t.status === 'done' ? 'erledigt' : 'offen', Bereich: CATS[t.cat], 'Zuständig (Rolle)': ROLES[t.owner], 'Priorität': t.prio, 'date:Fällig:start': t.due, Notiz: t.note, 'Cockpit-ID': t.id, Archiviert: '__NO__', Hinweis: '[]', Quelle: 'Cockpit' }));
const SEED = { 'events/infratech-2027': { title: 'InfraTech 2027 – Messe Rotterdam', type: 'messe', date: '2027-01-12', endDate: '2027-01-15', location: 'Rotterdam Ahoy', checklist: [{ area: 'budget', item: 'Budgetrahmen 2027 festlegen', done: false }, { area: 'marketing', item: 'Innovatieprijs-Einreichung', done: true }] } };
const fake = ({ rows, seed, withNotion }) => {
  try { if (!localStorage.getItem('feind-cockpit:db')) localStorage.setItem('feind-cockpit:db', JSON.stringify(seed)); } catch (e) { /* egal */ }
  window.__rows = rows; window.__writes = []; window.__saved = null;
  const mcp = {
    callTool: async (server, tool, input) => {
      if (tool === 'notion-query-data-sources') return { payload: { results: JSON.parse(JSON.stringify(window.__rows)), has_more: false }, cache: { storedAt: Date.now() } };
      if (tool === 'notion-update-page') { window.__writes.push(input); return { payload: {} }; }
      throw { code: 'tool_error' };
    },
    watchTool: () => () => {}, invalidate: async () => {}
  };
  const downloads = { save: async ({ filename, data }) => { const b = data instanceof Blob ? new Uint8Array(await data.arrayBuffer()) : new TextEncoder().encode(String(data)); let s = ''; for (const x of b) s += String.fromCharCode(x); window.__saved = { filename, b64: btoa(s) }; } };
  window.claude = { use: async n => (n === 'mcp' ? (withNotion ? mcp : null) : n === 'downloads' ? downloads : null) };
};
(async () => {
  const launch = { executablePath: '/opt/pw-browsers/chromium' };
  if (process.env.HTTPS_PROXY) launch.proxy = { server: process.env.HTTPS_PROXY };
  const b = await chromium.launch(launch);
  const problems = [], log = m => console.log('     ' + m);
  // ---------- mit Notion ----------
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, ignoreHTTPSErrors: true });
  await ctx.addInitScript(fake, { rows: ROWS, seed: SEED, withNotion: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(url + '#infratech-aufgaben');
  await p.waitForFunction(() => FC.app.taskSource && FC.app.taskSource().kind === 'live', null, { timeout: 20000 });
  const src = await p.evaluate(() => ({ s: FC.app.taskSource(), line: document.getElementById('it-src') && document.getElementById('it-src').textContent, meta: (document.getElementById('it-src-meta') || {}).textContent, banner: !!document.getElementById('it-notfall') }));
  log(src.line + ' · ' + src.meta);
  if (src.s.count !== TASKS.length || !/Notion live/.test(src.line) || src.banner) problems.push('Quelle/Anzahl falsch: ' + JSON.stringify(src));
  // Event-Checkliste aus Notion
  await p.evaluate(() => FC.app.navigate('marketing', 'events')); await p.waitForTimeout(300);
  const ev = await p.evaluate(() => { const c = document.getElementById('ev-infratech-2027'); return c ? { txt: c.textContent, boxes: c.querySelectorAll('details.chk:not(.chk-arch) input[type=checkbox]').length, enabled: c.querySelectorAll('details.chk:not(.chk-arch) input[type=checkbox]:not(:disabled)').length, arch: !!c.querySelector('.chk-arch'), archInputs: c.querySelectorAll('.chk-arch input').length } : null; });
  if (process.env.SHOTS) await (await p.$('#ev-infratech-2027')).screenshot({ path: process.env.SHOTS + '/event-karte.png' });
  log('Event-Karte: ' + (ev ? ev.boxes + ' Punkte aus Notion, Archiv ' + (ev.arch ? 'ja' : 'nein') : 'fehlt'));
  if (!ev || ev.boxes !== TASKS.length || ev.enabled !== TASKS.length || !ev.arch || ev.archInputs || !/Aus Notion: Notion live/.test(ev.txt)) problems.push('Event-Checkliste nicht aus Notion: ' + JSON.stringify(ev && { boxes: ev.boxes, enabled: ev.enabled, arch: ev.arch }));
  // Abhaken in der Checkliste → Rückfrage → Notion-Schreibweg
  await p.evaluate(() => { document.querySelector('#ev-infratech-2027 details.chk:not(.chk-arch)').open = true; });
  await p.click('#chk-infratech-2027-s1'); await p.waitForTimeout(150);
  const ask = await p.evaluate(() => (document.querySelector('.modal h3') || {}).textContent);
  if (!/In Notion als erledigt/.test(ask || '')) problems.push('Keine Rückfrage beim Abhaken: ' + ask);
  await p.click('.modal-actions .btn.primary'); await p.waitForTimeout(600);
  let w = await p.evaluate(() => window.__writes.slice());
  if (w.length !== 1 || w[0].properties.Status !== 'erledigt' || !/0001$/.test(w[0].page_id.replace(/-/g, '').slice(-4))) problems.push('Abhaken schrieb nicht die Notion-Aufgabe: ' + JSON.stringify(w));
  const evDb = await p.evaluate(() => JSON.parse(localStorage.getItem('feind-cockpit:db'))['events/infratech-2027'].checklist[0].done);
  if (evDb !== false) problems.push('events/…checklist wurde verändert');
  await p.evaluate(() => { window.__writes = []; window.__rows[0].Status = 'offen'; return FC.app.notionReload(); }); await p.waitForTimeout(200);
  // Aufgaben-PDF erzeugen
  await p.evaluate(() => FC.app.navigate('infratech', 'aufgaben')); await p.waitForTimeout(200);
  await p.evaluate(() => FC.app.runAction('it-pdf'));
  try { await p.waitForFunction(() => window.__saved, null, { timeout: 30000 }); } catch (e) { console.log('Meldung: ' + await p.evaluate(() => document.getElementById('toast').textContent)); throw e; }
  const saved = await p.evaluate(() => window.__saved);
  const pdfIn = path.join(OUT, 'aufgaben.pdf'), pdfOut = path.join(OUT, 'aufgaben-ausgefuellt.pdf');
  fs.writeFileSync(pdfIn, Buffer.from(saved.b64, 'base64'));
  const pick = JSON.parse(execFileSync('python3', [path.join(__dirname, 'pdf_fill.py'), pdfIn, pdfOut]).toString());
  log('PDF ' + saved.filename + ' ausgefüllt: erledigt ' + pick.done.map(k => pick.ids[k]).join(', ') + ', Notiz ' + pick.ids[pick.note] + ', Rolle/Termin ' + pick.ids[pick.edit]);
  // In Notion inzwischen geändert: zweite Aufgabe steht jetzt „in Arbeit“ → Konflikt
  const conflictId = pick.ids[pick.done[1]];
  await p.evaluate(id => { window.__rows.find(r => r['Cockpit-ID'] === id).Status = 'in Arbeit'; return FC.app.notionReload(); }, conflictId); await p.waitForTimeout(200);
  // Einlesen über den Knopf in der Aktionsleiste
  await p.click('#ab-it-pdfin'); await p.waitForSelector('#pdfin-file');
  await p.setInputFiles('#pdfin-file', pdfOut);
  try { await p.waitForSelector('#pdfin-list', { timeout: 30000 }); } catch (e) { console.log('Status: ' + await p.evaluate(() => (document.getElementById('pdfin-status') || {}).textContent)); throw e; }
  const diff = await p.evaluate(() => ({ sum: document.getElementById('pdfin-sum').textContent, rows: Array.from(document.querySelectorAll('.pdfin-ch')).map(r => [r.dataset.field, r.dataset.conflict]), btn: Array.from(document.querySelectorAll('.modal-actions .btn.primary')).map(x => x.disabled), offline: !!document.getElementById('pdfin-offline') }));
  if (process.env.SHOTS) await p.screenshot({ path: process.env.SHOTS + '/pdf-diff.png' });
  log('Diff: ' + diff.sum.replace(/\s+/g, ' ') + ' · ' + JSON.stringify(diff.rows));
  const fields = diff.rows.map(r => r[0]).sort().join(',');
  if (fields !== 'due,note,owner,status,status' || diff.rows.filter(r => r[1] === '1').length !== 1 || diff.btn[0] !== false || diff.offline) problems.push('Diff falsch: ' + JSON.stringify(diff));
  // Konflikt einzeln auf „PDF-Wert übernehmen“ stellen, dann übernehmen
  await p.check('input[id^="pdfin-k-"][id$="-pdf"]');
  await p.click('.modal-actions .btn.primary'); await p.waitForTimeout(800);
  if (await p.$('.modal h3') && /inzwischen geändert/.test(await p.textContent('.modal h3'))) { await p.click('.modal-actions .btn.primary'); await p.waitForTimeout(600); }
  w = await p.evaluate(() => window.__writes.slice());
  const byPage = Object.fromEntries(w.map(x => [x.page_id, x.properties]));
  const pid = id => hex(TASKS.findIndex(t => t.id === id) + 1);
  const ed = byPage[pid(pick.ids[pick.edit])] || {};
  const okWrites = w.length === 4 && ed['Zuständig (Rolle)'] === 'Messeteam' && ed['date:Fällig:start'] === '2026-11-15' && byPage[pid(pick.ids[pick.done[0]])].Status === 'erledigt' && byPage[pid(conflictId)].Status === 'erledigt' && /PDF-Rücklauf \(Stand \d\d\.\d\d\.\d{4}\): Testnotiz aus PDF$/.test(byPage[pid(pick.ids[pick.note])].Notiz || '');
  log('Geschrieben (gestubbt): ' + w.length + ' Notion-Aufrufe');
  if (!okWrites) problems.push('Notion-Schreibvorgänge falsch: ' + JSON.stringify(w).slice(0, 400));
  const toast = await p.evaluate(() => document.getElementById('toast').textContent);
  log('Meldung: ' + toast);
  await p.close(); await ctx.close();
  // ---------- ohne Notion: Notfallstand, nichts schreiben ----------
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 900 }, colorScheme: 'dark', ignoreHTTPSErrors: true });
  await ctx2.addInitScript(fake, { rows: ROWS, seed: SEED, withNotion: false });
  const q = await ctx2.newPage();
  q.on('pageerror', e => errs.push(e.message));
  await q.goto(url + '#infratech-aufgaben'); await q.waitForTimeout(1500);
  const off = await q.evaluate(() => ({ s: FC.app.taskSource(), banner: !!document.getElementById('it-notfall'), line: (document.getElementById('it-src') || {}).textContent, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  if (process.env.SHOTS) await q.screenshot({ path: process.env.SHOTS + '/aufgaben-notfall-handy.png' });
  log('Ohne Notion: ' + off.line + ' · Banner ' + (off.banner ? 'ja' : 'nein'));
  if (off.s.kind !== 'notfall' || !off.banner || !/Notfallstand, nicht aktuell/.test(off.line) || off.sw > off.cw + 1) problems.push('Notfallstand nicht gekennzeichnet: ' + JSON.stringify(off));
  await q.evaluate(() => FC.app.openPdfReturn()); await q.waitForSelector('#pdfin-file');
  await q.setInputFiles('#pdfin-file', pdfOut);
  try { await q.waitForSelector('#pdfin-offline', { timeout: 30000 }); } catch (e) { console.log('Status: ' + await q.evaluate(() => (document.getElementById('pdfin-status') || {}).textContent)); throw e; }
  const off2 = await q.evaluate(() => ({ btn: document.querySelector('.modal-actions .btn.primary').disabled, writes: window.__writes.length, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  if (process.env.SHOTS) await q.screenshot({ path: process.env.SHOTS + '/pdf-diff-handy-dunkel.png' });
  if (!off2.btn || off2.writes) problems.push('Ohne Notion nicht gesperrt: ' + JSON.stringify(off2));
  else log('Ohne Notion: Unterschiede angezeigt, Übernehmen gesperrt, nichts geschrieben');
  await b.close();
  if (errs.length) problems.push('JS-Fehler: ' + errs.join(' | '));
  console.log((problems.length ? 'FEHL ' : 'OK   ') + 'PDF-Rücklauf' + (problems.length ? ' · ' + problems.join(' | ') : ''));
  process.exit(problems.length ? 1 : 0);
})();
