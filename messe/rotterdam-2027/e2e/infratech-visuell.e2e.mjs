// E2E Phase 2 „textlastig zu visuell“: InfraTech-Welt (Dashboard, Aufgaben, Fristen, Budget, Ziele & KPIs).
// Prüft Primärdiagramme, Filter per Klick und Tastatur, Eingaben im Budget, Druck und Meeting-Modus.
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

async function open(tab, { reducedMotion = 'reduce' } = {}) {
  const ctx = await browser.newContext({ locale: 'de-DE', timezoneId: 'Europe/Berlin', viewport: { width: 1280, height: 1000 }, reducedMotion });
  await ctx.route(URL_, r => r.fulfill({ body: HTML, contentType: 'text/html; charset=utf-8' }));
  await ctx.route(u => u.origin !== ORIGIN && !/^(data|blob):/.test(u.href), r => r.abort());
  await ctx.addInitScript(() => {
    if (sessionStorage.getItem('e2e-seeded')) return;
    sessionStorage.setItem('e2e-seeded', '1');
    localStorage.setItem('feind-cockpit:db', JSON.stringify({ 'leads/counts': { days: { '2027-01-12': { a: 4, b: 3, c: 2 } } } }));
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL_, { waitUntil: 'domcontentloaded' });
  await page.locator('#wt-infratech').click();
  await page.locator('.tab', { hasText: tab }).first().click();
  await page.locator('.theme-banner').first().waitFor();
  return { page, ctx, errors };
}

test('Dashboard: Banner, Ring, Status-Donut, Balken je Bereich; Klick auf einen Bereich filtert die Aufgaben', async () => {
  const { page, ctx, errors } = await open('Dashboard');
  assert.equal(await page.locator('.theme-banner').count(), 1);
  assert.match(await page.locator('.dash-rings .fc-donut').getAttribute('aria-label'), /Aufgaben nach Status/);
  const rows = page.locator('.fc-bars .fc-hrow.fc-hit');
  assert.ok(await rows.count() >= 10, 'ein Balken je Bereich');
  assert.equal(await page.locator('#innovationAlarm .fc-timeline').count(), 1, 'Innovationspreis als Zeitachse');
  await page.locator('.fc-bars .fc-hrow', { hasText: 'Catering' }).focus();
  await page.keyboard.press('Enter');
  await page.locator('#it-cat').waitFor();
  assert.equal(await page.locator('#it-cat').inputValue(), 'catering');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Aufgaben: Klick auf einen Balken setzt und löst den Bereichsfilter; Liste folgt', async () => {
  const { page, ctx, errors } = await open('Aufgaben');
  const bar = page.locator('.it-visual .fc-hrow', { hasText: 'Logistik' });
  await bar.click();
  await page.waitForFunction(() => document.querySelector('#it-cat').value === 'logistik');
  assert.equal(await page.locator('.it-visual .fc-hrow', { hasText: 'Logistik' }).getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('.it-groups details').count(), 1);
  await page.locator('.it-visual .fc-hrow', { hasText: 'Logistik' }).click();
  await page.waitForFunction(() => document.querySelector('#it-cat').value === 'all');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Fristen: Zeitachse ab heute mit Legende, alle Fristen weiterhin als Tabelle', async () => {
  const { page, ctx } = await open('Fristen');
  assert.ok(await page.locator('.fc-timeline .fc-mark').count() >= 5);
  assert.match(await page.locator('.fc-legend').innerText(), /bestätigt[\s\S]*Referenz[\s\S]*Messetermin/);
  await page.getByText('Alle Fristen als Tabelle').click();
  assert.equal(await page.locator('details table.data tbody tr').count(), 10);
  await ctx.close();
});

test('Budget: Ist eintragen aktualisiert Balken und Ampel, Eingabebereich bleibt offen', async () => {
  const { page, ctx, errors } = await open('Budget');
  await page.getByText('Forecast und Ist eintragen').click();
  const inp = page.locator('input[id^="bud-ist-"]').first();
  await inp.fill('13000');
  await inp.press('Tab');
  await page.waitForFunction(() => /13\.000/.test(document.querySelector('.fc-bars .fc-hrow').textContent));
  assert.equal(await page.locator('details.bud-edit').getAttribute('open'), '');
  assert.match(await page.locator('.panel-head .st').first().innerText(), /Abweichung \+8 %/);
  assert.equal(await page.locator('.fc-waterfall').count(), 1);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Ziele & KPIs: ein Ring je KPI, Leads aus dem Lead-Zähler, Baseline im Tooltip', async () => {
  const { page, ctx } = await open('Ziele');
  assert.equal(await page.locator('.kpi-card .fc-ring').count(), 6);
  const leads = page.locator('.kpi-card', { hasText: 'Qualifizierte Leads' });
  assert.equal(await leads.locator('.fc-center').textContent(), '9');
  assert.match(await leads.getAttribute('data-tip'), /Baseline 2026/);
  await ctx.close();
});

test('Druck: Diagramme statisch, Banner aus; Meeting-Modus startet ohne Fehler', async () => {
  const { page, ctx, errors } = await open('Aufgaben', { reducedMotion: 'no-preference' });
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.locator('.theme-banner').isVisible(), false);
  assert.equal(await page.locator('.it-visual .fc-bars').isVisible(), true);
  await page.emulateMedia({ media: 'screen' });
  await page.locator('#it-meeting').click();
  await page.locator('#meetingRoot > *').first().waitFor({ state: 'visible' });
  assert.deepEqual(errors, []);
  await ctx.close();
});
