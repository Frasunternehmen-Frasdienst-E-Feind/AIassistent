// E2E-Smoke-Tests gegen die Akzeptanzkriterien (Kap. 10). Laufzeit claude.ai wird gemockt (mock-claude.js).
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(here, '..', 'Feind-Cockpit.html');
const URL = 'file://' + FILE;
const MOCK = path.join(here, 'mock-claude.js');
const AXE = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const SEED = {
  'events/infratech-2027': { title: 'InfraTech 2027 · Rotterdam Ahoy', type: 'messe', date: '2027-01-12', endDate: '2027-01-15', region: 'Niederlande', checklist: [{ area: 'materialien', item: 'Druckdaten', done: false }] },
  'tenders/t1': { title: 'Fräsarbeiten B96', deadline: '2026-10-01', region: 'Brandenburg', status: 'neu', fit: 'passt' },
  'mkt_leads/l1': { organisation: 'Stadt Testhausen', stage: 'neu', channel: 'website', region: 'Sachsen', lastContact: '2026-09-01' },
  'leads/altlead': { organisation: 'Altbestand GmbH', stage: 'neu' },
  'content/c1': { title: 'Beitrag Kaltfräsen', channel: 'linkedin', status: 'entwurf', plannedDate: '2026-09-30', statusSince: '2026-09-01' },
  'overrides/i1': { id: 'i1', status: 'done', note: 'Fristgerecht eingereicht.' }
};

async function open(page, cfg) {
  await page.route('**/fonts.g*/**', r => r.abort());
  page.__errors = [];
  page.on('pageerror', e => page.__errors.push(e.message));
  if (cfg !== false) {
    await page.addInitScript(`window.__mockCfg=${JSON.stringify(Object.assign({ seed: SEED }, cfg || {}))};`);
    await page.addInitScript({ path: MOCK });
  }
  await page.goto(URL);
  await page.waitForFunction(() => window.__feindCockpit && window.__feindCockpit.S.dbState !== 'loading', null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(150);
}
const world = (page, w) => page.click('#world-tab-' + w);
const tab = (page, t) => page.click('#mtab-' + t);
test.afterEach(async ({ page }) => { expect(page.__errors || [], 'keine JS-Fehler').toEqual([]); });

test('AK1 · Beide Welten (und Admin) über die Top-Navigation erreichbar', async ({ page }) => {
  await open(page);
  await world(page, 'marketing'); await expect(page.locator('#world-marketing')).toBeVisible(); await expect(page.locator('#world-infratech')).toBeHidden();
  await world(page, 'infratech'); await expect(page.locator('#world-infratech')).toBeVisible(); await expect(page.locator('#world-marketing')).toBeHidden();
  await world(page, 'admin'); await expect(page.locator('#world-admin')).toBeVisible();
  // Tastatur: Pfeiltasten wechseln die Welt
  await page.focus('#world-tab-admin'); await page.keyboard.press('ArrowLeft'); await expect(page.locator('#world-tab-infratech')).toHaveAttribute('aria-selected', 'true');
});

test('AK2 · Alle KERN-Module vorhanden', async ({ page }) => {
  await open(page);
  await world(page, 'marketing');
  for (const t of ['Copilot', 'Content', 'Leads', 'Ausschreibungen', 'Events', 'SEO', 'Referenzen', '90-Tage-Plan']) await expect(page.locator('#modulebar-wrap')).toContainText(t);
  await world(page, 'infratech');
  for (const t of ['Dashboard', 'Aufgaben', 'Fristen', 'Budget', 'Ziele & KPIs', 'Lead-Zähler', 'Akquise-Planer', 'Packen & Material', 'Vorlagen', 'Lessons Learned', 'Faktencheck', 'Team & Zugriff', 'Protokoll', 'Wissensbasis']) await expect(page.locator('#modulebar-wrap')).toContainText(t);
  await world(page, 'admin');
  for (const t of ['Status', 'Module & Reiter', 'Datenpflege', 'Migration']) await expect(page.locator('#modulebar-wrap')).toContainText(t);
  // jeder Reiter rendert ohne Fehler
  for (const w of ['marketing', 'infratech', 'admin']) { await world(page, w); for (const id of await page.$$eval('#modulebar-wrap button', bs => bs.map(b => b.id))) { await page.click('#' + id); await expect(page.locator('#world-' + w + ' [role=tabpanel]')).toBeVisible(); } }
});

test('AK3/14/15 · Keine CDN-Skripte, nur Google Fonts, CI-Tokens, Größe < 500 KB', async () => {
  const html = fs.readFileSync(FILE, 'utf8');
  expect(html.match(/<script[^>]+src=/g)).toBeNull();
  const ext = [...html.matchAll(/<link[^>]+href="(https?:[^"]+)"/g)].map(m => new globalThis.URL(m[1]).host);
  expect(new Set(ext)).toEqual(new Set(['fonts.googleapis.com', 'fonts.gstatic.com']));
  expect(html.match(/rel="stylesheet"/g).length).toBe(1);
  for (const c of ['#84bb20', '#424e4e', '#e3000b', '#5e8a14']) expect(html).toContain(c);
  // Keine harten Farbwerte im Skript/Markup (nur in den Token-Blöcken des Stylesheets)
  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
  expect(scripts.match(/#[0-9a-fA-F]{6}\b/g)).toBeNull();
  expect(fs.statSync(FILE).size).toBeLessThan(500 * 1024);
});

test('AK4 · Offline-First: ohne Artefakt-Speicher lokal nutzbar und persistent', async ({ page }) => {
  await open(page, false);
  await expect(page.locator('#banner-slot')).toContainText('Offline-Modus');
  await world(page, 'infratech'); await tab(page, 'aufgaben');
  await page.click('button[data-cb="s1"]');
  await expect(page.locator('li[data-id="s1"]')).toHaveClass(/done/);
  await page.reload(); await page.waitForTimeout(200);
  await world(page, 'infratech'); await tab(page, 'aufgaben');
  await expect(page.locator('li[data-id="s1"]')).toHaveClass(/done/);
  await tab(page, 'leadzaehler'); await page.click('button[data-ld="2027-01-12"][data-lg="a"][data-dl="1"]');
  await expect(page.locator('.lc-total').first()).toHaveText('1');
});

test('AK5 · Exporte CSV, Markdown, ICS funktionieren', async ({ page }) => {
  await open(page);
  await world(page, 'infratech'); await tab(page, 'aufgaben');
  await page.click('#csvTasksBtn'); await page.click('#mdTasksBtn');
  await tab(page, 'fristen'); await page.click('#icsBtn'); await page.click('#csvBtn');
  await tab(page, 'dashboard'); await page.click('#reportBtn');
  const dl = await page.evaluate(() => window.__downloads.map(d => ({ f: d.filename, n: d.data.length, head: d.data.slice(0, 40) })));
  expect(dl.map(d => d.f)).toEqual(['InfraTech2027-Aufgaben.csv', 'InfraTech2027-Aufgaben.md', 'InfraTech2027-Fristen.ics', 'InfraTech2027-Fristen.csv', 'InfraTech2027-Statusbericht.md']);
  expect(dl[0].head.startsWith('﻿Bereich;Titel;Priorität')).toBeTruthy();
  const ics = await page.evaluate(() => window.__downloads[2].data);
  expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/); expect(ics).toContain('DTSTART;VALUE=DATE:20261115');
  expect(ics.split('\r\n').every(l => new TextEncoder().encode(l).length <= 75)).toBeTruthy();
});

test('AK6/12 · Rechte: Viewer nur lesend mit Banner, Nicht-Admin ohne Admin-Funktionen', async ({ page }) => {
  await open(page, { canWrite: false, isOwner: false, canEdit: false });
  await expect(page.locator('#readonly-banner')).toContainText('Nur Lesen');
  await world(page, 'infratech'); await tab(page, 'aufgaben');
  await expect(page.locator('button[data-cb="s1"]')).toBeDisabled();
  await expect(page.locator('#addBtn')).toBeDisabled();
  await world(page, 'admin');
  await expect(page.locator('#world-admin')).toContainText('Admin-Zugang anfragen');
  await expect(page.locator('.adm-bar')).toHaveCount(0);
});

test('AK6 · Editor sieht Admin-Leiste und darf veröffentlichen', async ({ page }) => {
  await open(page);
  await world(page, 'admin'); await tab(page, 'comms');
  await page.check('#an-active'); await page.fill('#an-text', 'Testhinweis für alle');
  await page.click('.adm-bar button:has-text("Veröffentlichen")');
  await expect(page.locator('#banner-slot')).toContainText('Testhinweis für alle');
  const v = await page.evaluate(() => window.__mockStore.get('admin/config').version); expect(v).toBe(1);
});

test('AK7 · mkt_leads und leads/counts sind getrennt', async ({ page }) => {
  await open(page);
  await world(page, 'marketing'); await tab(page, 'mkt_leads');
  await expect(page.locator('#world-marketing')).toContainText('Stadt Testhausen');
  await expect(page.locator('#world-marketing')).not.toContainText('Altbestand GmbH');
  await world(page, 'infratech'); await tab(page, 'leadzaehler');
  await page.click('button[data-ld="2027-01-13"][data-lg="b"][data-dl="1"]');
  await page.waitForTimeout(100);
  const st = await page.evaluate(() => ({ counts: window.__mockStore.get('leads/counts'), mkt: window.__mockStore.get('mkt_leads/l1') }));
  expect(st.counts.days['2027-01-13'].b).toBe(1);
  expect(st.mkt.organisation).toBe('Stadt Testhausen');
});

test('AK8 · Barrierefreiheit (axe WCAG A/AA) in beiden Themes – einzige Ausnahme: CI-Primärbutton', async ({ page }) => {
  test.setTimeout(240000);
  await open(page);
  const found = [];
  for (const theme of ['light', 'dark']) {
    await page.click('#theme-' + theme);
    for (const w of ['marketing', 'infratech', 'admin']) {
      await world(page, w);
      for (const id of await page.$$eval('#modulebar-wrap button', bs => bs.map(b => b.id))) {
        await page.click('#' + id); await page.addScriptTag({ path: AXE });
        const v = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations
          .flatMap(x => x.nodes.map(n => ({ id: x.id, t: n.target.join(' '), primary: !!document.querySelector(n.target.join(' '))?.closest('.btn.primary') }))));
        v.filter(x => !(x.id === 'color-contrast' && x.primary)).forEach(x => found.push(theme + ' ' + id + ' ' + x.id + ' ' + x.t));
      }
    }
  }
  expect(found).toEqual([]);
  // Alle Bedienelemente sind per Tab erreichbar (kein negativer tabindex auf Buttons in Panels)
  await world(page, 'infratech'); await tab(page, 'aufgaben');
  expect(await page.$$eval('#world-infratech button', bs => bs.filter(b => b.tabIndex < 0).length)).toBe(0);
});

test('AK9 · Druckansicht ohne Navigation, mit Druckkopf, hell', async ({ page }) => {
  await open(page);
  await page.click('#theme-dark');
  await world(page, 'infratech'); await tab(page, 'fristen');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('header.top')).toBeHidden(); await expect(page.locator('nav.tabs')).toBeHidden();
  await expect(page.locator('#printHead')).toBeVisible(); await expect(page.locator('#printHead')).toContainText('Fristen');
  const bg = await page.evaluate(() => getComputedStyle(document.querySelector('table.data')).backgroundColor);
  expect(bg).toBe('rgb(255, 255, 255)');
});

test('AK10/11 · Migration ohne Datenverlust und Innovationspreis-Status im Dashboard', async ({ page }) => {
  await open(page);
  await world(page, 'infratech'); await tab(page, 'dashboard');
  await expect(page.locator('#world-infratech .alert').first()).toContainText('Innovationspreis');   // vor Migration: Alarm (rot)
  await expect(page.locator('#world-infratech .alert').first()).toContainText('Sofort prüfen');
  await world(page, 'admin'); await tab(page, 'migration');
  await page.click('button:has-text("1 · Backup herunterladen")');
  await page.waitForFunction(() => (window.__downloads || []).some(d => d.filename.startsWith('feind-cockpit-backup')));
  await page.click('button:has-text("2 · Plan berechnen")');
  await expect(page.locator('#world-admin')).toContainText('Override i1 → tasks/i1');
  await expect(page.locator('#world-admin')).toContainText('Lead altlead → mkt_leads');
  await page.click('button:has-text("3 · Migration ausführen")');
  await page.click('button:has-text("Wirklich")');
  await expect(page.locator('#world-admin')).toContainText('Migration:');
  const st = await page.evaluate(() => ({ t: window.__mockStore.get('tasks/i1'), o: window.__mockStore.get('overrides/i1'), old: window.__mockStore.get('leads/altlead'), neu: window.__mockStore.get('mkt_leads/altlead') }));
  expect(st.t.status).toBe('done'); expect(st.o.migratedAt).toBeTruthy(); expect(st.old.organisation).toBe('Altbestand GmbH'); expect(st.neu.organisation).toBe('Altbestand GmbH');
  await world(page, 'infratech'); await tab(page, 'dashboard');
  await expect(page.locator('#world-infratech .alert.ok')).toContainText('Innovationspreis: eingereicht');
  // zweiter Lauf: nichts mehr zu tun
  await world(page, 'admin'); await tab(page, 'migration');
  await page.click('button:has-text("1 · Backup herunterladen")'); await page.waitForTimeout(200);
  await page.click('button:has-text("2 · Plan berechnen")');
  await expect(page.locator('#world-admin')).toContainText('Nichts zu migrieren');
});

test('AK13 · Farbschema Auto/Hell/Dunkel', async ({ page }) => {
  await open(page);
  const html = page.locator('html');
  await expect(html).not.toHaveAttribute('data-theme', /.+/);
  await page.click('#theme-dark'); await expect(html).toHaveAttribute('data-theme', 'dark');
  await page.click('#theme-light'); await expect(html).toHaveAttribute('data-theme', 'light');
  await page.reload(); await expect(html).toHaveAttribute('data-theme', 'light');
  await page.click('#theme-auto'); await expect(html).not.toHaveAttribute('data-theme', /.+/);
});

test('Zusatz · Messe-Briefing (KI), Notion-Live, globale Suche, Aufgabe anlegen', async ({ page }) => {
  await open(page, { notion: { ap: { id: 'd8d00c33', rows: [{ AP: 'AP9', Name: 'Live-Paket', Bereich: 'Messe', Status: 'startklar', Statushinweis: 'startklar', Balken: '1-2 Live', Top: '__NO__', Sortierung: 0, 'date:Zeitraum:start': '2026-09-14', 'date:Zeitraum:end': '2026-09-27' }] } } });
  await world(page, 'marketing'); await tab(page, 'copilot');
  await page.click('#ai-messe');
  await expect(page.locator('#world-marketing')).toContainText('Testbrief aus Mock');
  expect(await page.evaluate(() => /Rechtsabteilung/.test(window.__lastPrompt) && /"ueberfaellig"/.test(window.__lastPrompt))).toBeTruthy();
  await page.waitForTimeout(900);
  await tab(page, 'plan90');
  await expect(page.locator('#notion-state')).toContainText('Teilweise live');
  await expect(page.locator('#world-marketing')).toContainText('AP9 · Live-Paket');
  await page.click('#searchBtn'); await page.fill('#srchInput', 'Zoll');
  await expect(page.locator('#srchResults')).toContainText('Zoll / Grenzübertritt');
  await page.click('.srch-item >> nth=0');
  await expect(page.locator('#world-infratech')).toBeVisible();
  await tab(page, 'aufgaben'); await page.click('#addBtn');
  await page.fill('#f_title', 'E2E-Testaufgabe'); await page.fill('#f_budget', '1.200'); await page.click('#f_save');
  await page.waitForTimeout(100);
  const t = await page.evaluate(() => [...window.__mockStore.entries()].find(([k, v]) => k.startsWith('tasks/u') && v.title === 'E2E-Testaufgabe'));
  expect(t[1].budget).toBe('1.200');
  expect(await page.evaluate(() => [...window.__mockStore.keys()].some(k => k.startsWith('activity/')))).toBeTruthy();
});
