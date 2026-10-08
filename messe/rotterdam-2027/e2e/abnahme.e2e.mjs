// E2E Phase 4 (Abnahme) in Kurzform für CI: Betriebsarten und Stichproben für Kontrast und Bewegung.
// Die vollständige Prüfung aller Module läuft mit `node tools/abnahme.mjs`.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { contrastAudit, newPage, go } from '../tools/abnahme.mjs';

let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined }); });
after(async () => { await browser?.close(); });

const STICHPROBE = [['marketing', 'heute'], ['marketing', 'tenders'], ['infratech', 'dashboard'], ['infratech', 'budget'], ['wissen', 'karte']];

for (const scheme of ['light', 'dark']) {
  test('Kontrast und Bewegung (' + scheme + '): Stichprobe ohne Fehler', async () => {
    const { ctx, page, errors } = await newPage(browser, { scheme });
    for (const [w, k] of STICHPROBE) {
      await go(page, w, k);
      const c = await page.evaluate(contrastAudit);
      assert.ok(c.checked > 10, w + '/' + k + ': Text gefunden');
      assert.deepEqual(c.fails, [], w + '/' + k + ': Kontrast');
      assert.equal(await page.evaluate(() => document.getAnimations().filter(a => !(window.CSSTransition && a instanceof CSSTransition)).length), 0, w + '/' + k + ': keine Animation');
    }
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

test('Viewer ohne geteilte Datenbank: Hinweis „nur dieses Gerät“, Admin gesperrt', async () => {
  const { ctx, page, errors } = await newPage(browser, { claude: 'viewer-ohne-db' });
  await page.locator('#localBanner').waitFor();
  assert.equal(await page.evaluate(() => window.FC.app.isAdmin() || window.FC.app.canWriteAdmin()), false);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Nur-Lesen-Zugang: Hinweis, Erfassen gesperrt, Admin gesperrt', async () => {
  const { ctx, page, errors } = await newPage(browser, { claude: 'nur-lesen' });
  await page.locator('#readonlyBanner').waitFor();
  await go(page, 'marketing', 'references');
  assert.equal(await page.locator('#ab-r-new').isDisabled(), true);
  assert.equal(await page.evaluate(() => window.FC.app.isAdmin() || window.FC.app.canWriteAdmin()), false);
  assert.deepEqual(errors, []);
  await ctx.close();
});
