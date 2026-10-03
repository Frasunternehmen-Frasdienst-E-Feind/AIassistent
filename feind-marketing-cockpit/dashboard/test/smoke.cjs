// Abschlusstest Feind Cockpit: jedes Modul jeder Welt, Desktop, Tablet und Handy, hell und dunkel.
// Prüft JS-Fehler, seitliches Überlaufen, Höhe der Reiterleiste, Tastatur-Navigation, die Aktionsleiste
// (eine Zeile, höchstens vier sichtbare Knöpfe, kein Überlauf, Menü „Mehr“ per Tastatur) und die
// Erläuterungs-Bubbles (Fokus, Klick, Esc, innerhalb des Bildschirms).
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
      const r = await p.evaluate(() => {
        const bar = document.getElementById('actionBar');
        const vis = el => el && el.offsetParent !== null && getComputedStyle(el).display !== 'none';
        const btns = bar ? Array.from(bar.querySelectorAll('.ab-btn')).filter(vis) : [];
        const sc = bar && bar.querySelector('.ab-scroll');
        const br = bar && !bar.hidden ? bar.getBoundingClientRect() : null;
        return {
          sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
          bar: document.querySelector('.tabbar').getBoundingClientRect().height,
          err: !!document.querySelector('.panel:not([hidden]) .banner.crit strong')?.textContent.includes('Anzeige fehlgeschlagen'),
          ab: br ? { n: btns.length, h: Math.round(br.height), right: Math.round(br.right), scroll: sc ? sc.scrollWidth - sc.clientWidth : 0,
            tops: Array.from(new Set(btns.map(x => Math.round(x.getBoundingClientRect().top)))).length,
            out: btns.filter(x => x.getBoundingClientRect().right > document.documentElement.clientWidth + 1).length } : null
        };
      });
      const id = world + '-' + key;
      if (r.sw > r.cw + 1) problems.push(id + ': seitlicher Überlauf ' + r.sw + '>' + r.cw);
      if (r.bar > 90) problems.push(id + ': Reiterleiste ' + Math.round(r.bar) + ' px hoch');
      if (r.err) problems.push(id + ': Modul-Fehler');
      if (!r.ab) problems.push(id + ': Aktionsleiste fehlt');
      else {
        if (r.ab.n < 1 || r.ab.n > 4) problems.push(id + ': Aktionsleiste ' + r.ab.n + ' sichtbare Knöpfe');
        if (r.ab.tops !== 1 || r.ab.h > 60) problems.push(id + ': Aktionsleiste nicht einzeilig (' + r.ab.h + ' px)');
        if (r.ab.scroll > 1 || r.ab.out || r.ab.right > r.cw + 1) problems.push(id + ': Aktionsleiste läuft über');
      }
      if (shots && ['copilot', 'aufgaben', 'status', 'fristen'].includes(key)) await p.screenshot({ path: shots + '/' + w + (dark ? 'd' : 'l') + '-' + key + '.png' });
    }
    // Tastatur: Pfeil rechts im Reiter wechselt das Modul
    await p.evaluate(() => FC.app.navigate('infratech', 'dashboard'));
    await p.focus('#tab-infratech-dashboard'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150);
    const hash = await p.evaluate(() => location.hash);
    if (hash !== '#infratech-aufgaben') problems.push('Tastatur-Navigation: ' + hash);
    // Aktionsleiste: Menü „Mehr“ per Tastatur öffnen und mit Esc schließen
    await p.focus('#ab-more'); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(100);
    const menu = await p.evaluate(() => ({ open: !document.getElementById('ab-menu').hidden, item: document.activeElement && document.activeElement.getAttribute('role') }));
    if (!menu.open || menu.item !== 'menuitem') problems.push('Menü „Mehr“ öffnet nicht per Tastatur');
    await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    const closed = await p.evaluate(() => ({ hidden: document.getElementById('ab-menu').hidden, focus: document.activeElement && document.activeElement.id }));
    if (!closed.hidden || closed.focus !== 'ab-more') problems.push('Menü „Mehr“ schließt nicht mit Esc');
    // Erläuterungs-Bubble: Fokus per Tastatur, Klick (Tippen), Esc, Lage im Bildschirm
    const tipState = () => p.evaluate(() => {
      const t = document.getElementById('tipBubble');
      if (!t || t.hidden) return { open: false };
      const r = t.getBoundingClientRect();
      return { open: true, text: t.textContent, left: r.left, right: r.right, top: r.top, bottom: r.bottom, cw: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth, vh: innerHeight };
    });
    await p.focus('#ab-more'); await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab'); await p.waitForTimeout(80);
    let tp = await tipState();
    if (!tp.open) problems.push('Bubble öffnet nicht bei Tastaturfokus');
    await p.keyboard.press('Escape'); await p.waitForTimeout(80);
    if ((await tipState()).open) problems.push('Bubble schließt nicht mit Esc (Fokus)');
    const note = await p.$('.tip-note');
    if (!note) problems.push('Keine Details-Bubble in den Aufgaben');
    else {
      await note.scrollIntoViewIfNeeded(); await note.click(); await p.waitForTimeout(80);
      tp = await tipState();
      if (!tp.open) problems.push('Bubble öffnet nicht per Klick');
      else if (tp.left < 0 || tp.right > tp.cw + 0.5 || tp.top < 0 || tp.bottom > tp.vh + 0.5 || tp.sw > tp.cw + 1) problems.push('Bubble ragt aus dem Bildschirm');
      await p.mouse.click(2, 450); await p.waitForTimeout(80);
      if ((await tipState()).open) problems.push('Bubble schließt nicht bei Klick daneben');
      await note.click(); await p.waitForTimeout(80); await p.keyboard.press('Escape'); await p.waitForTimeout(80);
      if ((await tipState()).open) problems.push('Bubble schließt nicht mit Esc (Klick)');
    }
    const ok = !errs.length && !problems.length;
    if (!ok) fail++;
    console.log((ok ? 'OK   ' : 'FEHL ') + w + 'px ' + (dark ? 'dunkel' : 'hell') + (errs.length ? ' · JS: ' + errs.join(' | ') : '') + (problems.length ? ' · ' + problems.join(' | ') : ''));
    await p.close();
  }
  await b.close();
  process.exit(fail ? 1 : 0);
})();
