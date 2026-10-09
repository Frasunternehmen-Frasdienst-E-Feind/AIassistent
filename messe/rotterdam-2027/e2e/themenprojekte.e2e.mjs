// E2E Themenprojekte (umbau/SPEC-themenprojekte.md): gehäufte Themen ohne Projekt erscheinen als Vorschlag in
// Wissen › Eingang und Archiv; „Als Projekt anlegen“ ordnet alle Einträge zu, „Nicht vorschlagen“ blendet aus.
// Nur erfundene Einträge.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { PAGE } from '../test/load-module.mjs';

const ORIGIN = 'http://cockpit.test';
const URL_ = ORIGIN + '/feind-cockpit-v3.html';
const HTML = readFileSync(PAGE);
const TOPIC = 'Messeplanung Rotterdam 2027';

function seed() {
  const db = {};
  const mk = (id, title, extra) => { db['kb_items/' + id] = Object.assign({ id, title, name: title + '.txt', kind: 'text', status: 'fertig', category: 'marketing', docType: 'Notiz', services: [], tags: [], entities: { projects: [], orgs: [], places: [], machines: [], dates: [] }, createdAt: 1, review: [] }, extra); };
  mk('t1', 'Standfläche Halle 1', { entities: { projects: [TOPIC], orgs: [], places: [], machines: [], dates: [] } });
  mk('t2', 'Hotelkontingent Messe', { entities: { projects: ['messeplanung rotterdam 2027'], orgs: [], places: [], machines: [], dates: [] } });
  mk('t3', 'Transport Messestand', { fileTopic: TOPIC });
  mk('t4', 'Ohne Thema', {});
  mk('f1', 'Fachpresse Teil 1', { tags: ['Fachpresse Straßenbau'] });
  mk('f2', 'Fachpresse Teil 2', { tags: ['Fachpresse Straßenbau'] });
  mk('f3', 'Fachpresse Teil 3', { tags: ['Fachpresse Straßenbau'] });
  return db;
}

let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined }); });
after(async () => { await browser?.close(); });

async function open() {
  const ctx = await browser.newContext({ locale: 'de-DE', timezoneId: 'Europe/Berlin', viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
  await ctx.route(URL_, r => r.fulfill({ body: HTML, contentType: 'text/html; charset=utf-8' }));
  await ctx.route(u => u.origin !== ORIGIN && !/^(data|blob):/.test(u.href), r => r.abort());
  await ctx.addInitScript(d => {
    if (sessionStorage.getItem('e2e-seeded')) return;
    sessionStorage.setItem('e2e-seeded', '1');
    localStorage.setItem('feind-cockpit:db', JSON.stringify(d));
  }, seed());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL_, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FC && window.FC.app && window.FC.app.MODULES);
  await page.evaluate(() => window.FC.app.go('wissen', 'eingang'));
  await page.locator('.kb-themes').waitFor();
  return { page, ctx, errors };
}
const db = page => page.evaluate(() => JSON.parse(localStorage.getItem('feind-cockpit:db')));

test('Vorschlag erscheint in Eingang und Archiv; Anlegen ordnet alle Einträge zu und der Vorschlag verschwindet', async () => {
  const { page, ctx, errors } = await open();
  const card = page.locator('.kb-theme', { hasText: TOPIC });
  assert.match(await card.innerText(), /3 Einträge/);
  assert.equal(await page.locator('.kb-theme').count(), 2, 'Messeplanung und Fachpresse');
  await page.evaluate(() => window.FC.app.go('wissen', 'archiv'));
  await page.locator('.kb-theme', { hasText: TOPIC }).waitFor();
  await page.evaluate(() => window.FC.app.go('wissen', 'eingang'));

  await page.locator('.kb-theme', { hasText: TOPIC }).getByRole('button', { name: 'Als Projekt anlegen' }).click();
  await page.waitForFunction(t => !Array.from(document.querySelectorAll('.kb-theme h4')).some(e => e.textContent === t), TOPIC);
  const d = await db(page);
  const proj = Object.values(d).find(x => x && x.kind === 'thema');
  assert.equal(proj.name, TOPIC);
  assert.equal(proj.lat, null);
  assert.equal(proj.createdFrom, 'themenvorschlag');
  assert.deepEqual(proj.items.slice().sort(), ['t1', 't2', 't3']);
  for (const id of ['t1', 't2', 't3']) assert.equal(d['kb_items/' + id].projectId, proj.id, id);
  assert.equal(d['kb_items/t4'].projectId, undefined);
  assert.equal(await page.locator('.kb-theme').count(), 1, 'nur noch Fachpresse');

  // Themenprojekte haben keinen Ort und stehen nicht auf der Projektkarte.
  const onMap = await page.evaluate(() => window.FC.app.kbProjects().filter(p => p.kind !== 'thema').length);
  assert.equal(onMap, 0);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('„Nicht vorschlagen“ blendet das Thema aus, ohne Daten zu ändern', async () => {
  const { page, ctx, errors } = await open();
  const before = await db(page);
  await page.locator('.kb-theme', { hasText: 'Fachpresse Straßenbau' }).getByRole('button', { name: 'Nicht vorschlagen' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.kb-theme').length === 1);
  assert.equal(await page.locator('.kb-theme', { hasText: 'Fachpresse' }).count(), 0);
  const after = await db(page);
  assert.deepEqual(Object.keys(after).filter(k => k.startsWith('kb_')).sort(), Object.keys(before).filter(k => k.startsWith('kb_')).sort());
  assert.equal(after['kb_items/f1'].projectId, undefined);
  assert.deepEqual(errors, []);
  await ctx.close();
});
