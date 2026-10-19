// Phase 4 „textlastig zu visuell“: Abnahme über alle Welten und Module des Feind Cockpits.
// Prüft je Modul in Hell und Dunkel: Skriptfehler, Kontrast der sichtbaren Schrift (WCAG AA), Querscrollen bei 390 px,
// Animationen bei „Bewegung reduzieren“, Druckansicht. Dazu die Betriebsarten lokal, Viewer ohne geteilte
// Datenbank und Nur-Lesen. Nur erfundene Beispieldaten (fixtures-marketing.mjs).
// Aufruf: node tools/abnahme.mjs [Ausgabe.json]   (PW_CHROMIUM optional)
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { marketingSeed } from '../e2e/fixtures-marketing.mjs';

const ORIGIN = 'http://cockpit.test';
const URL_ = ORIGIN + '/feind-cockpit-v3.html';
const HTML = readFileSync(new URL('../feind-cockpit-v3.html', import.meta.url));
const OUT = process.argv[2] || null;

// Im Browser: Kontrast aller sichtbaren Textstellen gegen die tatsächliche Hintergrundfarbe.
export function contrastAudit() {
  const parse = c => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const mix = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  // Liefert mögliche Hintergründe: bei Farbverläufen jede Farbstufe (geprüft wird gegen die ungünstigste).
  function bgsOf(el) {
    const stack = [];
    let stops = null;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') {
        if (!/gradient/.test(cs.backgroundImage)) return null; // Bild: nicht messbar
        const cols = (cs.backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(parse).filter(c => c && c.a > 0);
        if (cols.length && cols.every(c => c.a >= 1)) { stops = cols; break; }
      }
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; }
    }
    let base = [{ r: 255, g: 255, b: 255, a: 1 }];
    const root = parse(getComputedStyle(document.body).backgroundColor);
    if (stops) base = stops; else if (root && root.a >= 1) base = [root];
    return base.map(b => { let bg = b; for (let i = stack.length - 1; i >= 0; i--) bg = mix(stack[i], bg); return bg; });
  }
  const fails = [];
  let checked = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.textContent.trim();
    if (t.length < 2) continue;
    const el = n.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);
    if (el.closest('.sr-only, .sr, [aria-hidden="true"], svg, .leaflet-tile-pane, .leaflet-control-attribution, option, script, style, noscript')) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (el.disabled || el.closest('[disabled], [aria-disabled="true"]')) continue; // inaktive Elemente: WCAG-Ausnahme
    const fg = parse(cs.color); const bgs = bgsOf(el);
    if (!fg || !bgs) continue;
    let ratio = Infinity, bg = bgs[0];
    for (const b of bgs) {
      const c = fg.a < 1 ? mix(fg, b) : fg;
      const L1 = lum(c), L2 = lum(b);
      const r = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      if (r < ratio) { ratio = r; bg = b; }
    }
    const px = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
    const need = px >= 24 || (bold && px >= 18.66) ? 3 : 4.5;
    checked++;
    if (ratio + 0.005 < need) fails.push({ text: t.slice(0, 50), ratio: Math.round(ratio * 100) / 100, need, cls: (el.className && el.className.baseVal == null ? String(el.className) : '').slice(0, 60), tag: el.tagName.toLowerCase(), color: cs.color, bg: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})` });
  }
  return { checked, fails };
}

export async function newPage(browser, { scheme = 'light', width = 1280, reduced = true, claude = null } = {}) {
  const ctx = await browser.newContext({ locale: 'de-DE', timezoneId: 'Europe/Berlin', viewport: { width, height: 900 }, colorScheme: scheme, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.route(URL_, r => r.fulfill({ body: HTML, contentType: 'text/html; charset=utf-8' }));
  await ctx.route(u => u.origin !== ORIGIN && !/^(data|blob):/.test(u.href), r => r.abort());
  await ctx.addInitScript(([d, mode]) => {
    if (!sessionStorage.getItem('e2e-seeded')) { sessionStorage.setItem('e2e-seeded', '1'); localStorage.setItem('feind-cockpit:db', JSON.stringify(d)); }
    if (mode === 'viewer-ohne-db') window.claude = { use: name => Promise.reject(Object.assign(new Error('nicht verfügbar'), { code: 'unavailable' })) };
    if (mode === 'nur-lesen') window.claude = { use: async name => {
      if (name === 'db') return new window.FC.localdb.LocalDb({ storage: localStorage });
      if (name === 'user') return { me: async () => ({ id: 'betrachter', isOwner: false, canEdit: false }), can: async () => false };
      throw Object.assign(new Error('nicht freigegeben'), { code: 'unavailable' });
    } };
  }, [marketingSeed(), claude]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL_, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FC && window.FC.app && window.FC.app.MODULES && document.querySelector('.theme-banner'), null, { timeout: 15000 });
  return { ctx, page, errors };
}
export const go = (page, w, k) => page.evaluate(([w, k]) => window.FC.app.go(w, k), [w, k]).then(() => page.waitForTimeout(250));

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
  const report = { stand: new Date().toISOString(), module: [], betrieb: {} };
  const probe = await newPage(browser);
  const MODULES = await probe.page.evaluate(() => window.FC.app.MODULES);
  await probe.ctx.close();
  const list = Object.entries(MODULES).flatMap(([w, mods]) => mods.map(([k, label]) => ({ w, k, label })));

  for (const scheme of ['light', 'dark']) {
    const { ctx, page, errors } = await newPage(browser, { scheme });
    for (const m of list) {
      errors.length = 0;
      await go(page, m.w, m.k);
      const c = await page.evaluate(contrastAudit);
      const anim = await page.evaluate(() => document.getAnimations().filter(a => !(window.CSSTransition && a instanceof CSSTransition)).length);
      report.module.push({ welt: m.w, modul: m.k, name: m.label, theme: scheme, fehler: errors.slice(), kontrastGeprueft: c.checked, kontrastFehler: c.fails, animationenTrotzReduziert: anim });
    }
    await ctx.close();
  }
  // Handy-Breite: kein Querscrollen
  {
    const { ctx, page } = await newPage(browser, { width: 390 });
    for (const m of list) {
      await go(page, m.w, m.k);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      report.module.find(x => x.welt === m.w && x.modul === m.k && x.theme === 'light').querUeberlauf390 = over > 1 ? over : 0;
    }
    await ctx.close();
  }
  // Druck: Banner aus, Aktionsleiste aus, keine Fehler
  {
    const { ctx, page, errors } = await newPage(browser);
    const druck = [];
    for (const m of list) {
      await go(page, m.w, m.k);
      await page.emulateMedia({ media: 'print' });
      const st = await page.evaluate(() => ({
        banner: [...document.querySelectorAll('.theme-banner')].some(e => e.offsetParent !== null),
        aktionsleiste: !!(document.getElementById('actionBar') && document.getElementById('actionBar').offsetParent !== null),
        geschlosseneDetailsGedruckt: [...document.querySelectorAll('details:not([open])')].every(d => { const kids = [...d.children].filter(c => c.tagName !== 'SUMMARY'); return !kids.length || kids.some(c => c.getClientRects().length > 0); })
      }));
      await page.emulateMedia({ media: 'screen' });
      druck.push(Object.assign({ welt: m.w, modul: m.k }, st));
    }
    report.druck = { seiten: druck, fehler: errors.slice() };
    await ctx.close();
  }
  // Betriebsarten
  for (const mode of ['lokal', 'viewer-ohne-db', 'nur-lesen']) {
    const { ctx, page, errors } = await newPage(browser, { claude: mode === 'lokal' ? null : mode });
    await page.waitForTimeout(400);
    await go(page, 'marketing', 'references');
    const st = await page.evaluate(() => ({
      lokalBanner: !!document.getElementById('localBanner'),
      nurLesenBanner: !!document.getElementById('readonlyBanner'),
      erfassenGesperrt: !!(document.getElementById('ab-r-new') && document.getElementById('ab-r-new').disabled),
      modus: window.FC.app.state.mode, readOnly: !!window.FC.app.state.readOnly, viewerLocal: !!window.FC.app.state.viewerLocal
    }));
    await go(page, 'admin', 'status');
    st.adminGesperrt = await page.evaluate(() => !window.FC.app.isAdmin() && !window.FC.app.canWriteAdmin());
    st.fehler = errors.slice();
    report.betrieb[mode] = st;
    await ctx.close();
  }
  await browser.close();
  const sum = {
    module: list.length,
    seitenMitSkriptfehler: report.module.filter(x => x.fehler.length).length,
    kontrastFehler: report.module.reduce((s, x) => s + x.kontrastFehler.length, 0),
    textstellenGeprueft: report.module.reduce((s, x) => s + x.kontrastGeprueft, 0),
    animationenTrotzReduziert: report.module.filter(x => x.animationenTrotzReduziert).length,
    querUeberlauf390: report.module.filter(x => x.querUeberlauf390).length,
    druckBannerSichtbar: report.druck.seiten.filter(x => x.banner).length,
    druckDetailsVerborgen: report.druck.seiten.filter(x => !x.geschlosseneDetailsGedruckt).length
  };
  report.summe = sum;
  if (OUT) writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(sum, null, 2));
  console.log(JSON.stringify(report.betrieb, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error(e); process.exit(1); });
