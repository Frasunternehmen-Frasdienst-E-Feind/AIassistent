// E2E für die Ausschreibungskarte im Feind Cockpit v3 (Seite per file://, Chromium).
// Jeder Request außerhalb von file:/data:/blob: wird mitgeschrieben; Kacheln bekommen ein 1×1-PNG.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { PAGE } from '../test/load-module.mjs';

const URL_ = pathToFileURL(PAGE).href;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64');
const PLACES = [['Leipzig', 'Sachsen'], ['Dresden', 'Sachsen'], ['Chemnitz', 'Sachsen'], ['Cottbus', 'Brandenburg'], ['Potsdam', 'Brandenburg'], ['Rostock', 'Mecklenburg-Vorpommern'], ['Hamburg', 'Hamburg']];

let browser;
before(async () => {
  const executablePath = process.env.PW_CHROMIUM || undefined;
  browser = await chromium.launch({ executablePath });
});
after(async () => { await browser?.close(); });

async function open({ db = {}, storage = {} } = {}) {
  const docs = {};
  PLACES.forEach(([ort, region], i) => { docs['tenders/t' + i] = { title: 'Fräsarbeiten ' + ort, region, ort, deadline: '2026-10-' + (10 + i), status: 'offen', fit: 'hoch' }; });
  Object.assign(docs, db);
  const ctx = await browser.newContext({ locale: 'de-DE', timezoneId: 'Europe/Berlin', viewport: { width: 1280, height: 1000 } });
  const ext = [];
  await ctx.route(u => !/^(file|data|blob):/.test(u.href), r => {
    ext.push(r.request().url());
    return /\{?\d+\}?\/\d+\/\d+\.png/.test(r.request().url()) ? r.fulfill({ body: PNG, contentType: 'image/png' }) : r.abort();
  });
  await ctx.addInitScript(([d, s]) => {
    if (sessionStorage.getItem('e2e-seeded')) return;
    sessionStorage.setItem('e2e-seeded', '1');
    localStorage.setItem('feind-cockpit:db', d);
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
  }, [JSON.stringify(docs), storage]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL_, { waitUntil: 'domcontentloaded' });
  await page.locator('.tab', { hasText: 'Ausschreibungen' }).click();
  await page.locator('.gm-map.leaflet-container').waitFor();
  await page.waitForTimeout(400);
  return { page, ext, errors, ctx };
}

const tileRequests = (ext, host) => ext.filter(u => u.includes(host));

test('ohne Einwilligung: keine externen Requests, Umrisskarte mit Legende', async () => {
  const { page, ext, errors, ctx } = await open();
  assert.deepEqual(ext, [], 'keine Requests an Dritte (auch keine Schriften)');
  assert.equal(await page.locator('.leaflet-tile-pane img').count(), 0);
  const legend = await page.locator('.gm-legend').innerText();
  assert.match(legend, /keine/);
  assert.match(legend, /Standort/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Einwilligung: Dialog nennt Anbieter, Abbrechen lädt nichts', async () => {
  const { page, ext, ctx } = await open();
  await page.getByRole('button', { name: 'Straßenkarte laden' }).click();
  const dlg = page.getByRole('dialog', { name: /Einwilligung/ });
  await dlg.waitFor();
  assert.match(await dlg.innerText(), /OpenStreetMap/);
  assert.match(await dlg.innerText(), /IP-Adresse/);
  await dlg.getByRole('button', { name: 'Abbrechen' }).click();
  await page.waitForTimeout(300);
  assert.deepEqual(ext, []);
  await ctx.close();
});

test('Einwilligung erteilt: Kacheln von OSM, Namensnennung sichtbar, Wahl bleibt nach Neuladen', async () => {
  const { page, ext, ctx } = await open();
  await page.getByRole('button', { name: 'Straßenkarte laden' }).click();
  await page.getByRole('button', { name: 'Einwilligen und laden' }).click();
  await page.locator('.leaflet-tile-pane img').first().waitFor({ state: 'attached' });
  assert.ok(tileRequests(ext, 'tile.openstreetmap.org').length > 0);
  assert.match(await page.locator('.gm-map .leaflet-control-attribution').innerText(), /© OpenStreetMap-Mitwirkende/);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.tab', { hasText: 'Ausschreibungen' }).click();
  await page.locator('.leaflet-tile-pane img').first().waitFor({ state: 'attached' });
  assert.equal(await page.getByRole('dialog', { name: /Einwilligung/ }).count(), 0, 'kein zweiter Dialog');
  assert.equal(await page.getByRole('button', { name: 'Straßenkarte an' }).getAttribute('aria-pressed'), 'true');
  await ctx.close();
});

test('Widerruf: danach wieder Umrisskarte ohne Requests', async () => {
  const { page, ext, ctx } = await open({ storage: { 'feind-cockpit:osm-consent': JSON.stringify({ host: 'tile.openstreetmap.org', at: '2026-10-01', on: true }) } });
  await page.locator('.leaflet-tile-pane img').first().waitFor({ state: 'attached' });
  await page.getByRole('button', { name: 'Einwilligung widerrufen' }).click();
  await page.waitForTimeout(300);
  ext.length = 0;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.tab', { hasText: 'Ausschreibungen' }).click();
  await page.locator('.gm-map.leaflet-container').waitFor();
  await page.waitForTimeout(400);
  assert.deepEqual(ext, []);
  assert.equal(await page.getByRole('button', { name: 'Straßenkarte laden' }).count(), 1);
  await ctx.close();
});

test('konfigurierter EU-Anbieter: Dialog nennt ihn, Kacheln kommen von seinem Host', async () => {
  const mapTiles = { name: 'Testanbieter EU', url: 'https://tiles.example.eu/{z}/{x}/{y}.png', attribution: '© Testanbieter', privacyUrl: 'https://tiles.example.eu/datenschutz' };
  const { page, ext, ctx } = await open({ db: { 'admin/config': { version: 1, mapTiles } } });
  await page.getByRole('button', { name: 'Straßenkarte laden' }).click();
  const dlg = page.getByRole('dialog', { name: /Einwilligung/ });
  assert.match(await dlg.innerText(), /Testanbieter EU/);
  await dlg.getByRole('button', { name: 'Einwilligen und laden' }).click();
  await page.locator('.leaflet-tile-pane img').first().waitFor({ state: 'attached' });
  assert.ok(tileRequests(ext, 'tiles.example.eu').length > 0);
  assert.equal(tileRequests(ext, 'openstreetmap.org').length, 0);
  const attr = await page.locator('.gm-map .leaflet-control-attribution').innerText();
  assert.match(attr, /OpenStreetMap-Mitwirkende/);
  assert.match(attr, /© Testanbieter/);
  await ctx.close();
});

test('Klick auf ein Bundesland setzt den Regionsfilter', async () => {
  const { page, ctx } = await open();
  // Mitte von Sachsen liegt unter einem Cluster, daher Klick direkt auf die Landesfläche auslösen.
  await page.locator('.gm-map path.leaflet-interactive[aria-label^="Sachsen,"]').dispatchEvent('click');
  await page.waitForTimeout(300);
  assert.equal(await page.locator('#geo-SN').getAttribute('aria-pressed'), 'true');
  await ctx.close();
});

test('Pins werden geclustert, Standorte bleiben einzeln sichtbar', async () => {
  const { page, ctx } = await open();
  assert.ok(await page.locator('.gm-map .marker-cluster').count() >= 1, 'mindestens ein Cluster');
  assert.equal(await page.locator('.gm-map .gm-home').count(), 2, 'Lübben und Wittenburg');
  await ctx.close();
});

test('Tastatur: Karte ist fokussierbar und zoomt mit +', async () => {
  const { page, ctx } = await open();
  const pane = page.locator('.gm-map .leaflet-map-pane');
  const before = await page.locator('.gm-map').getAttribute('data-zoom');
  await page.locator('.gm-map').focus();
  await page.keyboard.press('+');
  await page.waitForTimeout(500);
  assert.notEqual(await page.locator('.gm-map').getAttribute('data-zoom'), before);
  assert.ok(await pane.count());
  await ctx.close();
});

test('Anbieter nicht erreichbar: Rückfall auf Umrisskarte mit Hinweis', async () => {
  const consent = JSON.stringify({ host: 'tile.openstreetmap.org', at: '2026-10-01', on: true });
  const { page, ctx } = await open({ storage: { 'feind-cockpit:osm-consent': consent } });
  await ctx.unroute(() => true).catch(() => {});
  await page.route(u => !/^(file|data|blob):/.test(u.href), r => r.abort());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.tab', { hasText: 'Ausschreibungen' }).click();
  await page.getByText('ließ sich nicht laden').waitFor({ timeout: 10000 });
  assert.equal(await page.getByRole('button', { name: 'Straßenkarte laden' }).count(), 1);
  await ctx.close();
});
