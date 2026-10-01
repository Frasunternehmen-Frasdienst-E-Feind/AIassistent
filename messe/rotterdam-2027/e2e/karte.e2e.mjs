// E2E für die Ausschreibungskarte im Feind Cockpit v3 (Chromium).
// Die Seite kommt von einem festen Test-Ursprung (http://cockpit.test), nicht per file://: dort verliert
// Chromium localStorage gelegentlich beim Neuladen, was Einwilligung und Widerruf verfälscht.
// Jeder andere Request wird mitgeschrieben; Kacheln bekommen ein 1×1-PNG.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { PAGE } from '../test/load-module.mjs';

const ORIGIN = 'http://cockpit.test';
const URL_ = ORIGIN + '/feind-cockpit-v3.html';
const HTML = readFileSync(PAGE);
const own = u => u.origin === ORIGIN || /^(data|blob):/.test(u.href);
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
  await ctx.route(URL_, r => r.fulfill({ body: HTML, contentType: 'text/html; charset=utf-8' }));
  await ctx.route(u => !own(u), r => {
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
  await page.route(u => !own(u), r => r.abort());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.tab', { hasText: 'Ausschreibungen' }).click();
  await page.getByText('ließ sich nicht laden').waitFor({ timeout: 10000 });
  assert.equal(await page.getByRole('button', { name: 'Straßenkarte laden' }).count(), 1);
  await ctx.close();
});

test('Admin: Vorlage Stadia EU füllt die Felder und meldet den fehlenden API-Key', async () => {
  const { page, ext, ctx, errors } = await open();
  await page.locator('#wt-admin').click();
  await page.locator('.tab', { hasText: 'Konfiguration' }).click();
  await page.getByRole('button', { name: /Funktionen und Quellen/ }).first().click();
  await page.locator('#mt-preset').selectOption('stadia-eu');
  // Ein Renderlauf zwischen Wählen und Übernehmen (z. B. durch ein Speicher-Ereignis) darf die Auswahl nicht verlieren.
  await page.evaluate(() => new Promise(r => { window.FC.app.refresh(); requestAnimationFrame(() => requestAnimationFrame(r)); }));
  await page.getByRole('button', { name: 'Vorlage übernehmen' }).click();
  // Übernehmen rendert die Admin-Ansicht neu; erst danach stehen die Werte in den Feldern.
  await page.waitForFunction(() => (document.getElementById('mt-url') || {}).value?.startsWith('https://tiles-eu.stadiamaps.com/'));
  assert.match(await page.locator('#mt-url').inputValue(), /^https:\/\/tiles-eu\.stadiamaps\.com\/tiles\/alidade_smooth\/\{z\}\/\{x\}\/\{y\}\{r\}\.png\?api_key=$/);
  assert.equal(await page.locator('#mt-attribution').inputValue(), '© Stadia Maps © OpenMapTiles');
  const card = page.locator('.card', { has: page.locator('#mt-preset') });
  assert.match(await card.innerText(), /EU-Endpunkt/);
  assert.match(await card.innerText(), /API-Key fehlt/);
  assert.deepEqual(ext, []);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('EU-Endpunkt Stadia: Dialog weist auf EU-Server hin, Kacheln nur von tiles-eu.stadiamaps.com', async () => {
  const mapTiles = { name: 'Stadia Maps (EU)', url: 'https://tiles-eu.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=test', attribution: '© Stadia Maps © OpenMapTiles' };
  const { page, ext, ctx } = await open({ db: { 'admin/config': { version: 1, mapTiles } } });
  await page.getByRole('button', { name: 'Straßenkarte laden' }).click();
  const dlg = page.getByRole('dialog', { name: /Einwilligung/ });
  assert.match(await dlg.innerText(), /EU-Endpunkt/);
  await dlg.getByRole('button', { name: 'Einwilligen und laden' }).click();
  await page.locator('.leaflet-tile-pane img').first().waitFor({ state: 'attached' });
  assert.ok(tileRequests(ext, 'tiles-eu.stadiamaps.com').length > 0);
  assert.deepEqual(ext.filter(u => !u.includes('tiles-eu.stadiamaps.com')), []);
  assert.match(await page.locator('.gm-map .leaflet-control-attribution').innerText(), /© Stadia Maps © OpenMapTiles/);
  await ctx.close();
});

test('Filterwechsel: Karte bleibt dieselbe, Zoom bleibt, nur Färbung und Auswahl ändern sich', async () => {
  const { page, ctx, errors } = await open();
  const map = page.locator('.gm-map.leaflet-container');
  await map.evaluate(el => { el.dataset.e2eMark = 'erste'; });
  await map.click({ position: { x: 40, y: 40 } });
  await page.keyboard.press('+');
  await page.waitForTimeout(500);
  const zoom = await map.getAttribute('data-zoom');
  const sachsen = page.locator('.gm-map path.leaflet-interactive[aria-label^="Sachsen,"]');
  await sachsen.dispatchEvent('click');
  await page.waitForTimeout(400);
  assert.equal(await page.locator('#geo-SN').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('.gm-map.leaflet-container').getAttribute('data-e2e-mark'), 'erste', 'Kartencontainer wurde neu erzeugt');
  assert.equal(await page.locator('.gm-map.leaflet-container').getAttribute('data-zoom'), zoom, 'Zoom wurde zurückgesetzt');
  assert.equal(await page.locator('.gm-map path.leaflet-interactive[aria-label^="Sachsen,"]').getAttribute('stroke-width'), '3');
  assert.equal(await page.locator('.gm-map').count(), 1);
  // Zweiter Klick hebt den Filter auf, die Karte bleibt weiterhin dieselbe.
  await page.locator('.gm-map path.leaflet-interactive[aria-label^="Sachsen,"]').dispatchEvent('click');
  await page.waitForTimeout(400);
  assert.notEqual(await page.locator('#geo-SN').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('.gm-map.leaflet-container').getAttribute('data-e2e-mark'), 'erste');
  assert.equal(await page.locator('.gm-map .marker-cluster, .gm-map .gm-home').count() > 0, true);
  assert.deepEqual(errors, []);
  await ctx.close();
});
