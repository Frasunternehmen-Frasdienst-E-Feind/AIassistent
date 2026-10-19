// E2E Wissens-Upload M1 (konzepte/wissens-upload.md): Reiter heißt „Wissens-Upload“, „Neue Fassung hochladen“
// legt den alten Stand unter „Frühere Fassungen“ ab und ordnet neu ein, „Löschen“ räumt Text und Rückverweise ab.
// Nur erfundene Einträge, ohne Netz (Tesseract wird hier nicht geladen).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PAGE } from '../test/load-module.mjs';

// https, damit crypto.subtle (Prüfsumme der Datei) wie im Artefakt verfügbar ist.
const ORIGIN = 'https://cockpit.test';
const URL_ = ORIGIN + '/feind-cockpit-v3.html';
const HTML = readFileSync(PAGE);

function seed() {
  const db = {};
  const base = { kind: 'datei', status: 'fertig', category: 'technik', docType: 'Datenblatt', services: [], tags: [], entities: { projects: [], orgs: [], places: [], machines: [], dates: [] }, review: [], createdAt: 1 };
  db['kb_items/d1'] = Object.assign({}, base, { id: 'd1', title: 'Datenblatt Fräse', name: 'datenblatt_v1.txt', ext: 'txt', mime: 'text/plain', size: 40, sha256: 'alt-hash', original: 'gespeichert', related: [{ id: 'd2', score: 3, why: 'Thema' }] });
  db['kb_items/d2'] = Object.assign({}, base, { id: 'd2', title: 'Wartungsplan Fräse', name: 'wartung.txt', ext: 'txt', mime: 'text/plain', size: 30, sha256: 'h2', original: 'gespeichert', related: [{ id: 'd1', score: 3, why: 'Thema' }] });
  db['kb_text/d1'] = { text: 'Alter Text', chars: 10, at: 1 };
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
  await page.locator('#kb-drop').waitFor();
  return { page, ctx, errors };
}
const db = page => page.evaluate(() => JSON.parse(localStorage.getItem('feind-cockpit:db')));

test('Reiter heißt „Wissens-Upload“', async () => {
  const { page, ctx, errors } = await open();
  assert.ok(await page.getByRole('tab', { name: /Wissens-Upload/ }).count() > 0 || await page.locator('text=Wissens-Upload').count() > 0);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Neue Fassung: alter Stand unter „Frühere Fassungen“, rev 1, neu eingeordnet', async () => {
  const { page, ctx, errors } = await open();
  await page.evaluate(() => window.FC.app.kbOpen('d1'));
  const dlg = page.locator('#modalRoot .modal');
  await dlg.waitFor();
  await dlg.locator('#kd-replace').setInputFiles({ name: 'datenblatt_v2.txt', mimeType: 'text/plain', buffer: Buffer.from('Datenblatt Wirtgen W 210 XF, Fräsbreite 2,2 m, technische Daten Fassung 2') });
  await page.waitForFunction(() => { const d = JSON.parse(localStorage.getItem('feind-cockpit:db')); const it = d['kb_items/d1']; return it && it.rev === 1 && ['fertig', 'pruefen'].includes(it.status); }, null, { timeout: 20000 });
  const d = await db(page);
  const it = d['kb_items/d1'];
  assert.equal(it.name, 'datenblatt_v2.txt');
  assert.equal(it.versions.length, 1);
  assert.equal(it.versions[0].name, 'datenblatt_v1.txt');
  assert.equal(it.versions[0].sha256, 'alt-hash');
  assert.equal(it.attempts, 0, 'erfolgreicher Lauf zählt keinen Versuch');
  assert.equal(it.lock, null);
  assert.match(d['kb_text/d1'].text, /Fassung 2/);
  await page.evaluate(() => window.FC.app.kbOpen('d1'));
  await page.locator('#modalRoot .kb-versions summary', { hasText: 'Frühere Fassungen (1)' }).waitFor();
  assert.ok(await page.locator('#modalRoot .chip', { hasText: 'Fassung 2' }).count() > 0);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Gleiche Datei noch einmal: keine neue Fassung', async () => {
  const { page, ctx, errors } = await open();
  const buf = Buffer.from('identisch');
  const hash = createHash('sha256').update(buf).digest('hex');
  await page.evaluate(h => { const d = JSON.parse(localStorage.getItem('feind-cockpit:db')); d['kb_items/d2'].sha256 = h; localStorage.setItem('feind-cockpit:db', JSON.stringify(d)); }, hash);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FC && window.FC.app && window.FC.app.MODULES);
  await page.evaluate(() => window.FC.app.kbOpen('d2'));
  await page.locator('#modalRoot #kd-replace').setInputFiles({ name: 'wartung.txt', mimeType: 'text/plain', buffer: buf });
  await page.locator('#toast', { hasText: 'schon die aktuelle Fassung' }).waitFor();
  const d = await db(page);
  assert.equal(d['kb_items/d2'].rev, undefined);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Löschen räumt gelesenen Text und Rückverweise ab', async () => {
  const { page, ctx, errors } = await open();
  await page.evaluate(() => window.FC.app.kbOpen('d1'));
  await page.locator('#modalRoot').getByRole('button', { name: 'Löschen' }).click();
  await page.getByRole('button', { name: 'Endgültig löschen' }).click();
  await page.waitForFunction(() => !JSON.parse(localStorage.getItem('feind-cockpit:db'))['kb_items/d1']);
  const d = await db(page);
  assert.equal(d['kb_text/d1'], undefined);
  assert.deepEqual(d['kb_items/d2'].related, []);
  assert.deepEqual(errors, []);
  await ctx.close();
});
