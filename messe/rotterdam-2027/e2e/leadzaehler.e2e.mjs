// E2E für das Referenzmodul Lead-Zähler (Phase 1 „textlastig zu visuell“): Ringe, Balken, Ticker,
// Animation nur für geänderte Werte, reduzierte Bewegung, Druck. Seite vom Test-Ursprung wie karte.e2e.mjs.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { PAGE } from '../test/load-module.mjs';

const ORIGIN = 'http://cockpit.test';
const URL_ = ORIGIN + '/feind-cockpit-v3.html';
const HTML = readFileSync(PAGE);
const DAYS = { '2027-01-12': { a: 14, b: 22, c: 18 }, '2027-01-13': { a: 21, b: 30, c: 17 } };

let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined }); });
after(async () => { await browser?.close(); });

async function open({ reducedMotion = 'no-preference', colorScheme = 'light' } = {}) {
  const ctx = await browser.newContext({ locale: 'de-DE', timezoneId: 'Europe/Berlin', viewport: { width: 1280, height: 1000 }, reducedMotion, colorScheme });
  await ctx.route(URL_, r => r.fulfill({ body: HTML, contentType: 'text/html; charset=utf-8' }));
  await ctx.route(u => u.origin !== ORIGIN && !/^(data|blob):/.test(u.href), r => r.abort());
  await ctx.addInitScript(d => {
    if (sessionStorage.getItem('e2e-seeded')) return;
    sessionStorage.setItem('e2e-seeded', '1');
    localStorage.setItem('feind-cockpit:db', JSON.stringify({ 'leads/counts': { days: d } }));
  }, DAYS);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL_, { waitUntil: 'domcontentloaded' });
  await page.locator('#wt-infratech').click();
  await page.locator('.tab', { hasText: 'Lead-Zähler' }).first().click();
  await page.locator('.lz-day').first().waitFor();
  return { page, ctx, errors };
}
const settle = page => page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running'), null, { timeout: 3000 });

test('Ringe, Ziel-Balken und Tabelle zeigen die Stückzahlen; Diagramme haben Textalternativen', async () => {
  const { page, ctx, errors } = await open();
  assert.equal(await page.locator('.lz-day .fc-ring').count(), 4);
  assert.deepEqual(await page.locator('.lz-day .fc-center').allTextContents(), ['54', '68', '0', '0']);
  assert.match(await page.locator('.lz-day .fc-ring').first().getAttribute('aria-label'), /Tag 1 · 12\.01\.: 54 von 75 \(A · heiß 14, B · warm 22, C · Info 18\)/);
  assert.match(await page.locator('.lz-goal [role="img"]').getAttribute('aria-label'), /122 von 300 Leads \(41 %\)/);
  await page.locator('.fc-table summary').click();
  const cells = await page.locator('.fc-table tbody tr').first().locator('td').allTextContents();
  assert.deepEqual(cells, ['Tag 1', '14', '22', '18', '54']);
  await settle(page);
  assert.equal(await page.locator('.lz-kpi b').first().textContent(), '122');
  assert.equal(await page.locator('.theme-banner[aria-hidden="true"]').count(), 1, 'Themenbanner, dekorativ');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Plus animiert nur den geänderten Tag (Ring und Zeile), nicht das ganze Modul', async () => {
  const { page, ctx } = await open();
  await settle(page);
  await page.getByRole('button', { name: 'Tag 2 A erhöhen' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.lz-day .fc-center')[1].textContent === '69');
  const targets = await page.evaluate(() => document.getAnimations().map(a => {
    const t = a.effect && a.effect.target;
    const card = t && t.closest('.lz-day');
    const row = t && t.closest('.fc-hrow');
    return card ? 'tag' + (Array.from(document.querySelectorAll('.lz-day')).indexOf(card) + 1) : row ? 'zeile:' + row.dataset.key : t && t.closest('.lz-goal') ? 'ziel' : 'sonst';
  }));
  assert.ok(targets.includes('tag2'), 'Ring Tag 2 bewegt sich: ' + targets);
  assert.ok(!targets.includes('tag1') && !targets.includes('tag3'), 'andere Tage bleiben ruhig: ' + targets);
  assert.ok(!targets.includes('sonst'), targets.join());
  await ctx.close();
});

test('prefers-reduced-motion: keine Animationen, Endwerte sofort', async () => {
  const { page, ctx } = await open({ reducedMotion: 'reduce' });
  // Nur Skript-Animationen (Web Animations) zählen; CSS-Übergänge sind über base.css auf 0,01 ms gesetzt.
  const scripted = () => page.evaluate(() => document.getAnimations().filter(a => !(a instanceof CSSAnimation) && !(a instanceof CSSTransition)).length);
  assert.equal(await scripted(), 0);
  assert.equal(await page.locator('.lz-kpi b').first().textContent(), '122');
  await page.getByRole('button', { name: 'Tag 1 C erhöhen' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.lz-day .fc-center')[0].textContent === '55');
  assert.equal(await scripted(), 0);
  await ctx.close();
});

test('Druck: Diagramme statisch sichtbar, Banner und Zählknöpfe ausgeblendet, Tabelle offen', async () => {
  const { page, ctx } = await open({ colorScheme: 'dark' });
  await settle(page);
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.locator('.theme-banner').isVisible(), false);
  assert.equal(await page.locator('.lc-btn').first().isVisible(), false);
  assert.equal(await page.locator(".lz-day .fc-ring").first().isVisible(), true, "Ring");
  assert.equal(await page.locator(".fc-table tbody tr").first().isVisible(), true, "Tabelle");
  // Druck ist hell: Serie 2 wieder Anthrazit statt des hellen Dark-Mode-Tons.
  const fill = await page.locator('.lz-day .fc-arc.fc-k-s2').first().evaluate(el => getComputedStyle(el).stroke);
  assert.equal(fill, 'rgb(66, 78, 78)');
  await ctx.close();
});
