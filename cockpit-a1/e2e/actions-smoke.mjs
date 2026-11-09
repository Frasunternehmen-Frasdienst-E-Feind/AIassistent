// E2E-Smoke: Aktionsleiste aller Reiter und Brennglas-PDF (jsPDF 4.2.1 mit SRI) im simulierten claude.ai-Viewer.
// Aufruf: node cockpit-a1/e2e/actions-smoke.mjs [html-datei]. jsPDF kommt aus node_modules (gleiche Datei wie auf cdnjs, SRI muss passen).
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const file = process.argv[2] || new URL('../Feind-Cockpit-A1.html', import.meta.url).pathname;
const lib = readFileSync(require.resolve('jspdf/dist/jspdf.umd.min.js'));
const b = await chromium.launch();
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
let libHits = 0;
await p.route('https://cdnjs.cloudflare.com/**', r => { libHits++; return r.fulfill({ status: 200, contentType: 'application/javascript', body: lib, headers: { 'access-control-allow-origin': '*' } }); });
await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
await p.addInitScript(() => {
  window.__saved = [];
  const downloads = { async save({ filename, data }) { const buf = new Uint8Array(data instanceof Blob ? await data.arrayBuffer() : data instanceof ArrayBuffer ? data : data.buffer || new TextEncoder().encode(String(data))); window.__saved.push({ filename, size: buf.length, head: String.fromCharCode(...buf.slice(0, 5)) }); return { status: 'saved' }; } };
  window.claude = { use: async name => (name === 'downloads' ? downloads : null) };
});
await p.goto('file://' + file + '#infratech-dashboard');
await p.waitForTimeout(1500);
let fail = 0, pdfs = 0;
const ok = (c, msg) => { if (!c) { console.log('FEHL ' + msg); fail++; } };
const worlds = await p.evaluate(() => Object.fromEntries(Object.entries(FC.app.MODULES).map(([w, l]) => [w, l.map(x => x[0])])));
for (const [w, keys] of Object.entries(worlds)) {
  for (const k of keys) {
    await p.evaluate(([w, k]) => FC.app.go(w, k), [w, k]); await p.waitForTimeout(250);
    const ids = await p.evaluate(([w, k]) => FC.app.actionsFor(w, k).map(a => a.id), [w, k]);
    const bar = await p.locator('#actionBar').isVisible();
    ok(!ids.length || bar, w + ':' + k + ' Leiste sichtbar');
    for (const id of ids.filter(x => /-pdf$|-print$/.test(x))) {
      const before = await p.evaluate(() => window.__saved.length);
      await p.evaluate(id => FC.app.runAction(id), id);
      await p.waitForFunction(n => window.__saved.length > n, before, { timeout: 10000 }).catch(() => {});
      const s = await p.evaluate(() => window.__saved[window.__saved.length - 1]);
      const good = s && s.head === '%PDF-' && /^Brennglas_.*\.pdf$/.test(s.filename) && (id.endsWith('-print') ? /_Druck\.pdf$/.test(s.filename) : true);
      ok(good, w + ':' + k + ' ' + id + ' → ' + (s ? s.filename : 'kein PDF'));
      if (good) pdfs++;
    }
    console.log((ids.length ? 'OK   ' : '—    ') + w + ':' + k + ' · ' + ids.length + ' Aktionen');
  }
}
const sri = await p.evaluate(() => { const s = Array.from(document.scripts).find(x => /jspdf/.test(x.src)); return s ? { src: s.src, integrity: s.integrity, co: s.crossOrigin } : null; });
ok(sri && /4\.2\.1/.test(sri.src) && /^sha512-/.test(sri.integrity) && sri.co === 'anonymous', 'jsPDF mit SRI geladen ' + JSON.stringify(sri));
ok(libHits === 1, 'jsPDF genau einmal geladen (' + libHits + ')');
const realErrs = errs.filter(e => !/fonts\.g|ERR_|net::/.test(e));
ok(!realErrs.length, 'Konsolenfehler ' + JSON.stringify(realErrs));
console.log(pdfs + ' PDFs erzeugt, ' + fail + ' Fehler');
await b.close();
process.exit(fail ? 1 : 0);
