// Misst je Welt/Reiter den sichtbaren Text (Zeichen ohne Leerraum) und die Zahl der Informationsblöcke.
// Grundlage für das Ziel „sichtbarer Text je Modul −40 %“ (Arbeitsanweisung visuell, Blinder Fleck 1).
// Aufruf: node messe/rotterdam-2027/tools/textmass.mjs [ausgabe.json] [seite.html]   (PW_CHROMIUM optional)
// SEED=marketing füllt vorher die Beispieldaten aus e2e/fixtures-marketing.mjs ein (nur erfundene Organisationen),
// damit Module mit Daten statt im Leerzustand gemessen werden.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { PAGE as DEFAULT_PAGE } from '../test/load-module.mjs';
import { marketingSeed } from '../e2e/fixtures-marketing.mjs';
const PAGE = process.argv[3] || DEFAULT_PAGE;

const ORIGIN = 'http://cockpit.test', URL_ = ORIGIN + '/feind-cockpit-v3.html';
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const ctx = await b.newContext({ locale: 'de-DE', timezoneId: 'Europe/Berlin', viewport: { width: 1280, height: 900 } });
await ctx.route(URL_, r => r.fulfill({ body: readFileSync(PAGE), contentType: 'text/html; charset=utf-8' }));
await ctx.route(u => u.origin !== ORIGIN && !/^(data|blob):/.test(u.href), r => r.abort());
if (process.env.SEED === 'marketing') await ctx.addInitScript(d => { if (!sessionStorage.getItem('tm')) { sessionStorage.setItem('tm', '1'); localStorage.setItem('feind-cockpit:db', JSON.stringify(d)); } }, marketingSeed());
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push(e.message));
await p.goto(URL_, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(800);
const rows = [];
for (const w of await p.locator('.worldtab').allInnerTexts()) {
  const world = w.split('\n')[0].trim();
  await p.locator('.worldtab', { hasText: world }).first().click(); await p.waitForTimeout(300);
  const n = await p.locator('.tab').count();
  for (let i = 0; i < n; i++) {
    const tab = p.locator('.tab').nth(i);
    const name = (await tab.innerText()).split('\n')[0].trim();
    await tab.click(); await p.waitForTimeout(350);
    const m = await p.evaluate(() => {
      const panel = [...document.querySelectorAll('.panel')].find(el => el.offsetParent !== null);
      if (!panel) return { chars: 0, blocks: 0 };
      // Nur sichtbarer Text: eingeklappte <details> zählen nicht (innerText liefert nur Gerendertes).
      // Text nur für Screenreader (.sr-only) und nicht gewählte Optionen sind nicht sichtbar und zählen nicht mit.
      const len = t => String(t || '').replace(/\s+/g, '').length;
      // innerText liefert bei <select> alle Optionen; sichtbar ist nur die gewählte.
      const selects = [...panel.querySelectorAll('select')].reduce((n, el) => n + len(el.innerText) - len(el.selectedOptions[0] && el.selectedOptions[0].text), 0);
      const hidden = selects + [...panel.querySelectorAll('.sr-only')].reduce((n, el) => n + len(el.textContent), 0);
      const chars = panel.innerText.replace(/\s+/g, '').length - hidden;
      const blocks = panel.querySelectorAll('.section, .card, .kpi, .alert, table, .tl-item, .trow').length;
      return { chars, blocks };
    });
    rows.push({ welt: world, reiter: name, zeichen: m.chars, bloecke: m.blocks });
  }
}
await b.close();
console.table(rows);
console.log('Seitenfehler:', errors.length ? errors : 'keine');
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify({ stand: new Date().toISOString().slice(0, 10), rows, errors }, null, 2) + '\n');
