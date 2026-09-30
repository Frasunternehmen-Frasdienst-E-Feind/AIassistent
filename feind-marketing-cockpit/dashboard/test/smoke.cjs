// Abschlusstest Feind Cockpit: jedes Modul jeder Welt, Desktop und Handy, hell und dunkel.
// Prüft JS-Fehler, seitliches Überlaufen, Höhe der Reiterleiste und Tastatur-Navigation.
// Aufruf: node test/smoke.cjs  (Playwright mit Chromium unter /opt/pw-browsers)
const { chromium } = require('playwright');
const path = require('path');
const url = 'file://' + path.resolve(__dirname, '../dashboard.html');
const shots = process.env.SHOTS || '';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let fail = 0;
  for (const [w, dark] of [[1280, false], [768, true], [390, true], [390, false]]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 }, colorScheme: dark ? 'dark' : 'light' });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(url + '#marketing-copilot'); await p.waitForTimeout(800);
    const mods = await p.evaluate(() => Object.fromEntries(Object.entries(FC.app.MODULES).map(([k, v]) => [k, v.map(x => x[0])])));
    const problems = [];
    for (const [world, keys] of Object.entries(mods)) for (const key of keys) {
      await p.evaluate(([a, c]) => FC.app.navigate(a, c), [world, key]); await p.waitForTimeout(150);
      const r = await p.evaluate(() => ({
        sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
        bar: document.querySelector('.tabbar').getBoundingClientRect().height,
        err: !!document.querySelector('.panel:not([hidden]) .banner.crit strong')?.textContent.includes('Anzeige fehlgeschlagen')
      }));
      if (r.sw > r.cw + 1) problems.push(world + '-' + key + ': seitlicher Überlauf ' + r.sw + '>' + r.cw);
      if (r.bar > 90) problems.push(world + '-' + key + ': Reiterleiste ' + Math.round(r.bar) + ' px hoch');
      if (r.err) problems.push(world + '-' + key + ': Modul-Fehler');
      if (shots && ['copilot', 'aufgaben', 'status'].includes(key)) await p.screenshot({ path: shots + '/' + w + (dark ? 'd' : 'l') + '-' + key + '.png' });
    }
    // Tastatur: Pfeil rechts im Reiter wechselt das Modul
    await p.evaluate(() => FC.app.navigate('infratech', 'dashboard'));
    await p.focus('#tab-infratech-dashboard'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150);
    const hash = await p.evaluate(() => location.hash);
    if (hash !== '#infratech-aufgaben') problems.push('Tastatur-Navigation: ' + hash);
    const ok = !errs.length && !problems.length;
    if (!ok) fail++;
    console.log((ok ? 'OK   ' : 'FEHL ') + w + 'px ' + (dark ? 'dunkel' : 'hell') + (errs.length ? ' · JS: ' + errs.join(' | ') : '') + (problems.length ? ' · ' + problems.join(' | ') : ''));
    await p.close();
  }
  await b.close();
  process.exit(fail ? 1 : 0);
})();
