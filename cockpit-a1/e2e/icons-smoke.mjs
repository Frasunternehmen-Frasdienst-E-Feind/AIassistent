// Browser-Test Icons 2.0: Übersicht, alle <use>-Verweise lösen auf, Detailfassung ab 40 px, beide Themes, keine Fehler.
import { chromium } from '@playwright/test';
const file = process.argv[2] || new URL('../Feind-Cockpit-A1.html', import.meta.url).pathname;
const shots = process.argv[3] || '';
const b = await chromium.launch(); let bad = 0;
for (const scheme of ['light', 'dark']) {
  const ctx = await b.newContext({ colorScheme: scheme, viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => { window.claude = { use: async () => null }; });
  await p.goto('file://' + file + '#admin-icons'); await p.waitForTimeout(1500);
  const cards = await p.locator('.iccard').count();
  const dangling = await p.evaluate(() => [...document.querySelectorAll('use')].map(u => (u.getAttribute('href') || '').slice(1)).filter(id => id && !document.getElementById(id)));
  const detailSyms = await p.evaluate(() => document.querySelectorAll('#feindSprite symbol[id^="ih-"]').length);
  console.log(scheme, '| Karten:', cards, '| Detail-Symbole:', detailSyms, '| lose Verweise:', dangling.length);
  if (cards !== 108 || detailSyms !== 18 || dangling.length) bad++;
  for (const size of [24, 48]) {
    await p.locator('button', { hasText: new RegExp('^' + size + ' px$') }).click(); await p.waitForTimeout(300);
    const refs = await p.evaluate(() => [...document.querySelectorAll('.iccard .icprev use')].map(u => u.getAttribute('href').slice(1, 3)));
    const detail = refs.filter(r => r === 'ih').length;
    console.log('  Größe', size, '→ Detailfassungen in der Übersicht:', detail);
    if ((size === 24 && detail !== 0) || (size === 48 && detail !== 18)) bad++;
    if (shots) await p.screenshot({ path: `${shots}/icons-${scheme}-${size}.png`, fullPage: false });
  }
  for (const [tab, name] of [['#infratech-aufgaben', 'aufgaben'], ['#infratech-dashboard', 'dashboard'], ['#marketing-copilot', 'copilot'], ['#marketing-tenders', 'tenders']]) {
    await p.goto('file://' + file + tab); await p.reload(); await p.waitForTimeout(1200);
    if (shots) await p.screenshot({ path: `${shots}/app-${scheme}-${name}.png` });
  }
  const real = errs.filter(e => !/fonts\.g|ERR_|net::/.test(e));
  console.log('  Fehler:', real); if (real.length) bad++;
  await ctx.close();
}
await b.close(); process.exit(bad ? 1 : 0);
