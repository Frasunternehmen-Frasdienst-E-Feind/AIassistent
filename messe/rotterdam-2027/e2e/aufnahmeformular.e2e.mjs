// E2E Brennglas-Aufnahmeformular für neue Referenzprojekte (Referenz-Bibliothek › Mehr › Aufnahmeformular).
// Prüft Aktion und Formularaufbau; das PDF selbst baut jsPDF aus dem CDN, das im Test nicht geladen wird.
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

test('Aufnahmeformular: Aktion unter „Mehr“, Felder wie „Neues Referenzprojekt“, Verwendung mit drei Kästchen', async () => {
  const ctx = await browser.newContext({ locale: 'de-DE', timezoneId: 'Europe/Berlin', viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
  await ctx.route(URL_, r => r.fulfill({ body: HTML, contentType: 'text/html; charset=utf-8' }));
  await ctx.route(u => u.origin !== ORIGIN && !/^(data|blob):/.test(u.href), r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL_, { waitUntil: 'domcontentloaded' });
  await page.locator('#wt-marketing').click();
  await page.locator('.tab', { hasText: 'Referenzen' }).first().click();
  await page.locator('#ab-more').click();
  assert.equal(await page.getByRole('menuitem', { name: /Aufnahmeformular \(PDF, leer\)/ }).count(), 1);

  const spec = await page.evaluate(() => window.FC.app.ACTION_SPECS.specRefForm());
  assert.equal(spec.meta, false, 'kein Protokollkopf');
  const json = JSON.stringify(spec);
  for (const name of ['Titel', 'Ort', 'Bundesland', 'Jahr', 'Leistungen', 'Zusammenfassung', 'Kunde', 'Printmedium', 'Interner_Zweck', 'Quelle'])
    assert.match(json, new RegExp('"(name|field)":"' + name + '"'), name);
  for (const c of ['Kundenfreigabe', 'Verwendung_Online', 'Verwendung_Print', 'Verwendung_Intern']) assert.match(json, new RegExp('"check":"' + c + '"'), c);
  assert.match(json, /Bitte Rechtsabteilung prüfen/);
  assert.match(json, /Einwilligung erforderlich/);
  assert.doesNotMatch(json, /@|\+49/, 'keine Kontaktdaten');
  assert.deepEqual(errors, []);
  await ctx.close();
});
