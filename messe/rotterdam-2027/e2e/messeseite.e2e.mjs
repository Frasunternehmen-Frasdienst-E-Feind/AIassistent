// E2E für die Messeseite „Feind auf der InfraTech 2027“ (Design „Landingpage Editor“, Vorlage Messe):
// Sprachwechsel DE/EN/NL, E-Mail-Entwurf, Platzhalter-Markierung, Barrierefreiheit in hellem und dunklem Theme.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'http://messe.test';
const URL_ = ORIGIN + '/messeseite-pflasterschleifen.html';
const AXE = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined }); });
after(async () => { await browser?.close(); });

async function open({ colorScheme = 'light', locale = 'de-DE', query = '' } = {}) {
  const ctx = await browser.newContext({ locale, viewport: { width: 1280, height: 900 }, colorScheme });
  await ctx.route(u => u.origin === ORIGIN, r => {
    const path = new URL(r.request().url()).pathname;
    const file = path.startsWith('/assets/') ? join(DIR, 'assets', basename(path)) : join(DIR, basename(path));
    r.fulfill({ body: readFileSync(file), contentType: file.endsWith('.html') ? 'text/html; charset=utf-8' : undefined });
  });
  await ctx.route(u => u.origin !== ORIGIN && !/^(data|blob):/.test(u.href), r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL_ + query, { waitUntil: 'load' });
  return { page, ctx, errors };
}

test('Deutsch: Inhalte, Messedaten, E-Mail an Messeteam, Jury-Zitat als Platzhalter markiert', async () => {
  const { page, ctx, errors } = await open();
  assert.equal(await page.locator('html').getAttribute('lang'), 'de');
  assert.equal(await page.locator('h1').textContent(), 'Pflasterschleifen live in Rotterdam');
  assert.match(await page.locator('.band').textContent(), /Stand 5\.209/);
  assert.equal(await page.locator('#mailTo').textContent(), 'marketing@fraesdienst-feind.de');
  assert.match(await page.locator('#openMail').getAttribute('href'), /^mailto:marketing@fraesdienst-feind\.de\?subject=/);
  assert.ok(await page.locator('.press blockquote p').evaluate(e => e.classList.contains('pending')));
  await page.locator('label.chip:has-text("Do 14.01.")').click();
  await page.locator('label.chip:has-text("Nachmittag")').click();
  await page.locator('#company').fill('Gemeente Test');
  const body = await page.locator('#mailBody').textContent();
  assert.match(body, /Donnerstag, 14\.01\.2027, Nachmittag/);
  assert.match(body, /Organisation: Gemeente Test/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Sprachwechsel NL und EN: Texte, E-Mail und Auswahl wechseln, Auswahl bleibt erhalten', async () => {
  const { page, ctx, errors } = await open();
  await page.locator('label.chip:has-text("Fr 15.01.")').click();
  await page.locator('button[data-lang="nl"]').click();
  assert.equal(await page.locator('html').getAttribute('lang'), 'nl');
  assert.equal(await page.locator('h1').textContent(), 'Kasseien slijpen live in Rotterdam');
  assert.equal(await page.locator('button[data-lang="nl"]').getAttribute('aria-pressed'), 'true');
  assert.match(await page.locator('#mailBody').textContent(), /vrijdag 15 januari 2027/);
  await page.locator('button[data-lang="en"]').click();
  assert.equal(await page.locator('h1').textContent(), 'Cobblestone grinding live in Rotterdam');
  assert.ok(!(await page.locator('.press blockquote p').evaluate(e => e.classList.contains('pending'))), 'EN-Zitat liegt vor');
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('lang'), 'en', 'gewählte Sprache bleibt nach Neuladen');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Browsersprache Niederländisch öffnet NL, ?lang=de hat Vorrang', async () => {
  let r = await open({ locale: 'nl-NL' });
  assert.equal(await r.page.locator('html').getAttribute('lang'), 'nl');
  await r.ctx.close();
  r = await open({ locale: 'nl-NL', query: '?lang=de' });
  assert.equal(await r.page.locator('html').getAttribute('lang'), 'de');
  await r.ctx.close();
});

for (const colorScheme of ['light', 'dark']) {
  test(`axe ohne Verstöße (WCAG 2 AA), Theme ${colorScheme}`, async () => {
    const { page, ctx } = await open({ colorScheme });
    await page.addScriptTag({ content: AXE });
    const res = await page.evaluate(() => window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] }));
    const v = res.violations.map(x => x.id + ': ' + x.nodes.map(n => n.target.join(' ')).slice(0, 3).join(' | '));
    assert.deepEqual(v, []);
    await ctx.close();
  });
}
