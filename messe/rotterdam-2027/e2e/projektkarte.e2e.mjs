// E2E Projektkarte (Wissen › Projektkarte) auf dem gemeinsamen Karten-Baustein app.geoMap: gleiche Darstellung wie die
// Ausschreibungskarte (Kreis je Bundesland, EF-Standortmarke), eigene Fachfunktionen (Seitenleiste, Position setzen).
// Nur erfundene Projekte und Orte.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { PAGE } from '../test/load-module.mjs';

const ORIGIN = 'http://cockpit.test';
const URL_ = ORIGIN + '/feind-cockpit-v3.html';
const HTML = readFileSync(PAGE);
const PROJ = [
  ['p1', 'Deckenerneuerung Musterweg', 'Leipzig', 'Sachsen', 51.34, 12.37, 'geprueft'],
  ['p2', 'Radweg Beispielallee', 'Dresden', 'Sachsen', 51.05, 13.74, 'entwurf'],
  ['p3', 'Ortsdurchfahrt Probe', 'Cottbus', 'Brandenburg', 51.76, 14.33, 'geprueft'],
  ['p4', 'Parkplatz Testhof', '', 'Brandenburg', null, null, 'entwurf']
];

let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined }); });
after(async () => { await browser?.close(); });

async function open({ colorScheme = 'light' } = {}) {
  const db = {};
  for (const [id, name, place, state, lat, lon, status] of PROJ) {
    db['kb_projects/' + id] = { id, name, place, state, country: 'Deutschland', lat, lon, geoHow: lat == null ? 'offen' : 'verzeichnis', year: 2025, services: ['Fräsen'], status, items: [], createdAt: 1, updatedAt: 1 };
  }
  const ctx = await browser.newContext({ locale: 'de-DE', timezoneId: 'Europe/Berlin', viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce', colorScheme });
  await ctx.route(URL_, r => r.fulfill({ body: HTML, contentType: 'text/html; charset=utf-8' }));
  await ctx.route(u => u.origin !== ORIGIN && !/^(data|blob):/.test(u.href), r => r.abort());
  await ctx.addInitScript(d => {
    if (sessionStorage.getItem('e2e-seeded')) return;
    sessionStorage.setItem('e2e-seeded', '1');
    localStorage.setItem('feind-cockpit:db', JSON.stringify(d));
  }, db);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL_ + '#wissen/karte', { waitUntil: 'domcontentloaded' });
  await page.locator('#wt-wissen').click();
  await page.locator('.tab', { hasText: 'Projektkarte' }).first().click();
  await page.locator('.mp-wrap .gm-map.leaflet-container').waitFor();
  await page.waitForTimeout(300);
  return { page, ctx, errors };
}

test('Projektkarte nutzt den gemeinsamen Karten-Baustein: Kreis je Bundesland, EF-Marke, keine SVG-Eigenkarte', async () => {
  const { page, ctx, errors } = await open();
  assert.equal(await page.locator('.mp-svg').count(), 0, 'alte SVG-Karte entfernt');
  assert.equal(await page.locator('.mp-wrap .gm-sb-wrap[title^="Sachsen:"]').innerText(), '2');
  assert.match(await page.locator('.mp-wrap .gm-sb-wrap[title^="Brandenburg:"]').getAttribute('title'), /^Brandenburg: 1 Eintrag/);
  assert.equal(await page.locator('.mp-wrap .gm-home .ef-mark').count(), 2, 'Lübben und Wittenburg als EF-Marke');
  assert.equal(await page.locator('.mp-legend .ef-mark').count(), 1);
  assert.equal(await page.locator('.tools [aria-pressed]', { hasText: 'Straßenkarte' }).count(), 0, 'eigene Straßenkarten-Ansicht entfällt');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Kreis anklicken zoomt hinein; Pin antippen öffnet die Seitenleiste mit Fachfunktionen', async () => {
  const { page, ctx, errors } = await open();
  await page.locator('.mp-wrap .gm-sb-wrap[title^="Brandenburg:"]').click();
  await page.waitForFunction(() => document.querySelector('.mp-wrap .gm-map').dataset.mode === 'detail');
  await page.locator('.mp-wrap .gm-pin-wrap').first().click();
  await page.locator('.mp-side h3', { hasText: 'Ortsdurchfahrt Probe' }).waitFor();
  assert.equal(await page.locator('.mp-wrap .gm-pin-wrap.sel').count(), 1, 'Auswahl hervorgehoben');
  assert.ok(await page.locator('.mp-side button', { hasText: 'Position korrigieren' }).count());
  await page.keyboard.press('Escape');
  await page.locator('.mp-side .label', { hasText: 'Übersicht' }).waitFor();
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Position setzen: Klick auf freie Kartenfläche speichert die Lage als manuell gesetzt', async () => {
  const { page, ctx, errors } = await open();
  await page.locator('.mp-side button', { hasText: 'Position setzen' }).first().click();
  await page.locator('.mp-banner:not([hidden])').waitFor();
  assert.equal(await page.locator('.mp-wrap .gm-map.gm-pick').count(), 1, 'Fadenkreuz aktiv');
  const box = await page.locator('.mp-wrap .gm-map').boundingBox();
  // Freie Fläche in Niedersachsen (dort liegen weder Kreise noch Pins), sonst nimmt ein Marker den Klick.
  await page.mouse.click(box.x + box.width * 0.32, box.y + box.height * 0.3);
  await page.waitForFunction(() => /"lat":/.test(localStorage.getItem('feind-cockpit:db') || '') && JSON.parse(localStorage.getItem('feind-cockpit:db'))['kb_projects/p4'].lat != null);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('feind-cockpit:db'))['kb_projects/p4']);
  assert.equal(saved.geoHow, 'manuell');
  assert.ok(saved.lat > 47 && saved.lat < 56 && saved.lon > 5 && saved.lon < 16, 'innerhalb Deutschlands');
  assert.equal(await page.locator('.mp-banner:not([hidden])').count(), 0);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Dunkelmodus: Standortmarke in Markenfarben (Feind-Grau, Dach Grün, Kürzel Weiß)', async () => {
  const { page, ctx } = await open({ colorScheme: 'dark' });
  const c = await page.evaluate(() => {
    const ef = getComputedStyle(document.querySelector('.mp-legend .ef-mark'));
    const root = getComputedStyle(document.documentElement);
    return { plate: ef.getPropertyValue('--ic-tone-c').trim(), tone: ef.getPropertyValue('--ic-tone').trim(), color: ef.color, inv: root.getPropertyValue('--brand-anth').trim(), acc: root.getPropertyValue('--accent').trim(), roof: ef.getPropertyValue('--ic-accent').trim() };
  });
  const hex = v => v.replace(/rgb\((\d+), (\d+), (\d+)\)/, (_, r, g, b) => '#' + [r, g, b].map(n => (+n).toString(16).padStart(2, '0')).join(''));
  assert.equal(c.plate, c.inv, 'Plakette Feind-Grau');
  assert.equal(c.roof, c.acc, 'Dach Feind-Grün');
  assert.equal(c.tone, '1', 'Fläche deckend');
  assert.equal(hex(c.color), '#ffffff', 'Kürzel Weiß');
  await ctx.close();
});
