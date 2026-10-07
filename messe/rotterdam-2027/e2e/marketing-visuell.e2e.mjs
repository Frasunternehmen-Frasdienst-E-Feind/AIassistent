// E2E Phase 3 „textlastig zu visuell“: Marketing-Welt mit erfundenen Beispieldaten (fixtures-marketing.mjs).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { PAGE } from '../test/load-module.mjs';
import { marketingSeed } from './fixtures-marketing.mjs';

const ORIGIN = 'http://cockpit.test';
const URL_ = ORIGIN + '/feind-cockpit-v3.html';
const HTML = readFileSync(PAGE);

let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined }); });
after(async () => { await browser?.close(); });

async function open(tab) {
  const ctx = await browser.newContext({ locale: 'de-DE', timezoneId: 'Europe/Berlin', viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
  await ctx.route(URL_, r => r.fulfill({ body: HTML, contentType: 'text/html; charset=utf-8' }));
  await ctx.route(u => u.origin !== ORIGIN && !/^(data|blob):/.test(u.href), r => r.abort());
  await ctx.addInitScript(d => {
    if (sessionStorage.getItem('e2e-seeded')) return;
    sessionStorage.setItem('e2e-seeded', '1');
    localStorage.setItem('feind-cockpit:db', JSON.stringify(d));
  }, marketingSeed());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL_, { waitUntil: 'domcontentloaded' });
  await page.locator('#wt-marketing').click();
  await page.locator('.tab', { hasText: tab }).first().click();
  await page.locator('.theme-banner').first().waitFor();
  return { page, ctx, errors };
}

test('Copilot: Hinweise als Kacheln mit Zahl und Symbol, Wochenplan als 7-Spalten-Raster', async () => {
  const { page, ctx, errors } = await open('Copilot');
  const tiles = page.locator('.hint-tile');
  assert.ok(await tiles.count() >= 6);
  assert.match(await tiles.filter({ hasText: 'Follow-up fällig' }).getAttribute('aria-label'), /Follow-up fällig: \d+, kritisch/);
  assert.equal(await page.locator('.week7 .w7d').count(), 7);
  assert.equal(await page.locator('.week7 .w7t').count(), 3);
  assert.doesNotMatch(await page.locator('.copilot-grid').innerText(), /\[object/);
  await tiles.filter({ hasText: 'Follow-up fällig' }).click();
  await page.locator('.tab[aria-selected="true"]', { hasText: 'Leads' }).waitFor();
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Content: Balken nach Kanal filtern, Kalender klappt auf und bleibt offen', async () => {
  const { page, ctx, errors } = await open('Content');
  await page.locator('.fc-bars .fc-hrow', { hasText: 'LinkedIn' }).click();
  await page.waitForFunction(() => document.querySelector('#c-channel').value === 'linkedin');
  assert.equal(await page.locator('.ct-card').count(), 2);
  assert.equal(await page.locator('details.cal-fold').getAttribute('open'), null);
  await page.locator('details.cal-fold > summary').click();
  await page.locator('#cal-next').click();
  await page.waitForTimeout(200);
  assert.equal(await page.locator('details.cal-fold').getAttribute('open'), '');
  assert.ok(await page.locator('.ct-age[role="img"]').count() >= 1, 'Tage im Status als Balken');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Leads: Trichter filtert das Kanban, Wochenverlauf mit Tabelle, Karten ohne Nebentext', async () => {
  const { page, ctx, errors } = await open('Leads');
  await page.locator('.fc-funnel .fc-hrow', { hasText: 'Qualifiziert' }).click();
  await page.waitForFunction(() => document.querySelector('#l-stage').value === 'qualifiziert');
  assert.match(await page.locator('.fc-line').getAttribute('aria-label'), /Neue Leads je Woche, 5 Punkte/);
  assert.match(await page.locator('.cols .card').first().getAttribute('data-tip'), /Fräsen/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Ausschreibungen: Ampel-Donut, Restlaufzeit-Balken, Verteilung nach Landkreis', async () => {
  const { page, ctx, errors } = await open('Ausschreibungen');
  assert.match(await page.locator('.tender-ampel .fc-donut').getAttribute('aria-label'), /Ampel der offenen Ausschreibungen/);
  assert.equal(await page.locator('.trow .rl[role="img"]').count(), 5);
  assert.match(await page.locator('.trow .rl').first().getAttribute('aria-label'), /^Restlaufzeit: /);
  assert.ok(await page.locator('.fc-bars .fc-hrow', { hasText: 'Leipzig' }).count());
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Events: Fortschrittsring je Event und Mini-Kalender mit Eventtag', async () => {
  const { page, ctx } = await open('Events');
  assert.match(await page.locator('.ev-side .fc-ring').first().getAttribute('aria-label'), /67 Prozent/);
  assert.ok(await page.locator('.mini-cal .mc-d.ev').count() >= 1);
  await ctx.close();
});

test('SEO: Verlauf über charts.line, Positions-Histogramm, Keyword-Details im Tooltip', async () => {
  const { page, ctx, errors } = await open('SEO');
  assert.match(await page.locator('.fc-line').getAttribute('aria-label'), /Klicks je Monat, 5 Punkte, zuletzt 460, Trend steigend/);
  assert.match(await page.locator('.fc-bars.fc-v').getAttribute('aria-label'), /Keywords nach Position/);
  assert.equal(await page.evaluate(() => typeof window.FC.app.lineChart), 'undefined', 'altes lineChart entfernt');
  assert.match(await page.locator('td [data-tip]').first().getAttribute('data-tip'), /Brandenburg/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('90-Tage-Plan: Ring-Kacheln, Fortschritt je Welle, Sprung aus dem Zeitplan öffnet die Tabelle', async () => {
  const { page, ctx, errors } = await open('90-Tage');
  assert.equal(await page.locator('.ring-tile .fc-ring').count(), 4);
  assert.equal(await page.locator('.wave-btn .wave-bar').count(), 4);
  assert.equal(await page.locator('details.ap-fold').getAttribute('open'), null);
  await page.locator('.gantt a.g-lab').first().click();
  await page.waitForTimeout(300);
  assert.equal(await page.locator('details.ap-fold').getAttribute('open'), '');
  assert.deepEqual(errors, []);
  await ctx.close();
});
