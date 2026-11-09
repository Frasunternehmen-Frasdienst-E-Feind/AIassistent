// E2E leeres Brennglas-Formular „Referenz erfassen“ (Referenz-Bibliothek › Mehr). Gleiche Felder wie der Assistent
// im Cockpit. Prüft Aktion und Formularaufbau; das PDF selbst baut jsPDF aus dem CDN, das im Test nicht geladen wird.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { PAGE } from '../test/load-module.mjs';

const ORIGIN = 'http://cockpit.test';
const URL_ = ORIGIN + '/feind-cockpit-v3.html';
const HTML = readFileSync(PAGE);

let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined }); });
after(async () => { await browser?.close(); });

test('Leeres Formular „Referenz erfassen“: Aktion in der Leiste, Felder des Assistenten, Verwendung und Freigabe zum Ankreuzen', async () => {
  const ctx = await browser.newContext({ locale: 'de-DE', timezoneId: 'Europe/Berlin', viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
  await ctx.route(URL_, r => r.fulfill({ body: HTML, contentType: 'text/html; charset=utf-8' }));
  await ctx.route(u => u.origin !== ORIGIN && !/^(data|blob):/.test(u.href), r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL_, { waitUntil: 'domcontentloaded' });
  await page.locator('#wt-marketing').click();
  await page.locator('.tab', { hasText: 'Referenzen' }).first().click();
  // Je nach Breite steht die Aktion in der Leiste oder unter „Mehr“: Knopf oder Menüeintrag mit derselben Kennung.
  if (!(await page.locator('#ab-rf-pdf').isVisible())) await page.locator('#ab-more').click();
  assert.match(await page.locator('#ab-rf-pdf, [data-id="rf-pdf"], [role="menuitem"]:has-text("Leeres Formular")').first().innerText(), /Formular/);

  const spec = await page.evaluate(() => window.FC.app.ACTION_SPECS.specRefForm());
  assert.equal(spec.meta, false, 'kein Protokollkopf');
  const json = JSON.stringify(spec);
  for (const name of ['Titel', 'Ort', 'Bundesland', 'Jahr', 'Beschreibung', 'Kunde', 'Printmedium', 'Interner_Zweck'])
    assert.match(json, new RegExp('"name":"' + name + '"'), name);
  for (const c of ['Kunde_freigabe0', 'Verwendung_0', 'Verwendung_1', 'Verwendung_2', 'Foto_0']) assert.match(json, new RegExp('"check":"' + c + '"'), c);
  assert.doesNotMatch(json, /@|\+49/, 'keine Kontaktdaten');
  assert.deepEqual(errors, []);
  await ctx.close();
});
