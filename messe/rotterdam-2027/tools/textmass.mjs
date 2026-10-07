// Misst je Welt/Reiter den sichtbaren Text (Zeichen ohne Leerraum) und die Zahl der Informationsblöcke.
// Grundlage für das Ziel „sichtbarer Text je Modul −40 %“ (Arbeitsanweisung visuell, Blinder Fleck 1).
// Aufruf: node messe/rotterdam-2027/tools/textmass.mjs [ausgabe.json]   (PW_CHROMIUM optional)
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { PAGE } from '../test/load-module.mjs';

const ORIGIN = 'http://cockpit.test', URL_ = ORIGIN + '/feind-cockpit-v3.html';
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const ctx = await b.newContext({ locale: 'de-DE', timezoneId: 'Europe/Berlin', viewport: { width: 1280, height: 900 } });
await ctx.route(URL_, r => r.fulfill({ body: readFileSync(PAGE), contentType: 'text/html; charset=utf-8' }));
await ctx.route(u => u.origin !== ORIGIN && !/^(data|blob):/.test(u.href), r => r.abort());
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
      // Text nur für Screenreader (.sr-only) ist nicht sichtbar und zählt nicht mit.
      const hidden = [...panel.querySelectorAll('.sr-only')].reduce((n, el) => n + el.textContent.replace(/\s+/g, '').length, 0);
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
