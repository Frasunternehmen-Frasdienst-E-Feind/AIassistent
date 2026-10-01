// E2E-Smoke: Aktionsleiste unter den InfraTech-Reitern und Brennglas-PDF (lokal und im simulierten claude.ai-Viewer).
// Aufruf: node cockpit-a1/e2e/actions-smoke.mjs [html-datei] [local|viewer]. jsPDF kommt aus node_modules (gleiche Version und SRI wie cdnjs).
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const file = process.argv[2] || new URL('../Feind-Cockpit-A1.html', import.meta.url).pathname, mode = process.argv[3] || 'viewer';
const lib = readFileSync(require.resolve('jspdf/dist/jspdf.umd.min.js'));
const b = await chromium.launch();
const ctx = await b.newContext({ acceptDownloads: true });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.route('https://cdnjs.cloudflare.com/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: lib, headers: { 'access-control-allow-origin': '*' } }));
await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
if (mode === 'viewer') await p.addInitScript(() => {
  window.__saved = [];
  const downloads = { async save({ filename, data }) { const buf = new Uint8Array(await data.arrayBuffer()); window.__saved.push({ filename, size: buf.length, head: String.fromCharCode(...buf.slice(0, 5)) }); return { status: 'saved' }; } };
  window.claude = { use: async name => (name === 'downloads' ? downloads : null) };
});
await p.goto('file://' + file + '#infratech-dashboard');
await p.waitForTimeout(1500);
const tabs = ['dashboard', 'aufgaben', 'fristen', 'budget', 'kpi', 'leadzaehler', 'lessons', 'fakten', 'team', 'meetings', 'protokoll', 'wissen'];
let fail = 0;
// Ein abgeschlossenes Protokoll (nur Rollen) für den Reiter Protokolle.
await p.evaluate(() => { const S = FC.app.state; S.data.meetings = [{ id: 'm1', date: '2026-09-30', status: 'abgeschlossen', durationMin: 42, participants: ['mkt', 'gl'],
  decisions: { a: { text: 'Standfläche bestätigt' } }, created: { b: { title: 'Angebot Standbau einholen', owner: 'mkt', due: '2026-10-16' } },
  changes: { c: { title: 'Hotel buchen', fromStatus: 'open', toStatus: 'done' } }, agenda: [], notes: 'Kurzprotokoll' }]; S.loaded.meetings = true; });
const ok = (c, msg) => { console.log((c ? 'OK   ' : 'FEHL ') + msg); if (!c) fail++; };
for (const t of tabs) {
  await p.evaluate(t => FC.app.go('infratech', t), t); await p.waitForTimeout(400);
  const bar = p.locator('#panel-infratech-' + t + ' .actionbar');
  const has = await bar.count();
  const pdfBtn = bar.locator('.ab-pdf .btn.primary').first();
  const nPdf = has ? await bar.locator('.ab-pdf').count() : 0;
  const first = await p.locator('#panel-infratech-' + t + ' > *').first().getAttribute('class');
  if (!nPdf) { console.log('—    ' + t + ': ' + (has ? 'Leiste ohne PDF' : 'keine Leiste')); continue; }
  ok(first.includes('actionbar'), t + ': Leiste steht direkt unter den Reitern');
  if (mode === 'viewer') {
    const before = await p.evaluate(() => window.__saved.length);
    await pdfBtn.click(); await p.waitForFunction(n => window.__saved.length > n, before, { timeout: 8000 }).catch(() => {});
    const s = await p.evaluate(() => window.__saved[window.__saved.length - 1]);
    ok(s && s.head === '%PDF-' && s.size > 3000 && /^Brennglas_.*\.pdf$/.test(s.filename), t + ': PDF ' + (s ? s.filename + ' (' + s.size + ' B)' : 'fehlt'));
  } else {
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }).catch(() => null), pdfBtn.click()]);
    const path = dl && await dl.path();
    const head = path ? readFileSync(path).subarray(0, 5).toString() : '';
    ok(head === '%PDF-', t + ': Download ' + (dl ? dl.suggestedFilename() : 'fehlt'));
  }
}
if (mode === 'viewer') {
  await p.goto('file://' + file + '#infratech-aufgaben'); await p.waitForTimeout(400);
  await p.selectOption('#it-prio', 'P0'); await p.waitForTimeout(300);
  await p.locator('#ab-tasks-print').click(); await p.waitForTimeout(1500);
  const s = await p.evaluate(() => window.__saved[window.__saved.length - 1]);
  ok(s && /_Druck\.pdf$/.test(s.filename), 'Druckfassung: ' + (s && s.filename));
  const toast = await p.locator('.toast').innerText().catch(() => '');
  ok(/Druckdialog/.test(toast), 'Hinweis zum Druckdialog: ' + toast.replace(/\s+/g, ' ').slice(0, 90));
  await p.setViewportSize({ width: 390, height: 800 });
  await p.emulateMedia({ colorScheme: 'dark' });
  await p.goto('file://' + file + '#infratech-aufgaben'); await p.waitForTimeout(500);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  ok(sw, 'Mobil 390 px: kein horizontales Scrollen');
  await p.locator('.actionbar').first().screenshot({ path: process.env.SHOT || '/tmp/actionbar-dark.png' });
}
const realErrs = errs.filter(e => !/fonts\.g|ERR_|net::/.test(e));
ok(!realErrs.length, 'Keine Konsolenfehler ' + JSON.stringify(realErrs));
await b.close();
process.exit(fail ? 1 : 0);
