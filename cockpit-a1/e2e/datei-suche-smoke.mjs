// E2E-Smoke: „Dateien suchen“ im Wissens-Eingang – Ordnersuche (lokal, ohne Upload) und Ablagen-Suche (simulierte Connectoren).
// Aufruf: node cockpit-a1/e2e/datei-suche-smoke.mjs <ordner> [html-datei]
import { chromium } from '@playwright/test';
const dir = process.argv[2], file = process.argv[3] || new URL('../Feind-Cockpit-A1.html', import.meta.url).pathname;
const b = await chromium.launch(); const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.route('https://**', r => r.fulfill({ status: 200, body: '' }));
await p.addInitScript(() => {
  window.__calls = [];
  const R = {
    sharepoint_search: { name: 'Plan.xlsx', webUrl: 'https://fraesdienst.sharepoint.com/sites/Marketing/Freigegebene Dokumente/01_Aufgabenlisten/Plan.xlsx', lastModifiedDateTime: '2026-10-09T12:00:00Z' },
    search: { results: [{ title: 'Bilder.zip', url: 'https://www.dropbox.com/preview/Marketing/Bilder.zip', path_display: '/Marketing/Bilder.zip', object_type: 'file' }] },
    'notion-search': { results: [{ title: 'Messe Rotterdam', url: 'https://app.notion.com/p/1', type: 'page', path: 'Projektleiter' }] }
  };
  const mcp = { async callTool(server, tool, input) { window.__calls.push([server, tool, input]); if (server === 'Dropbox') throw { code: 'server_not_connected' }; return { content: [{ type: 'text', text: JSON.stringify(R[tool]) }] }; } };
  window.claude = { use: async n => (n === 'mcp' ? mcp : null) };
});
await p.goto('file://' + file);
await p.waitForTimeout(1200);
await p.evaluate(() => FC.app.go('wissen', 'eingang')); await p.waitForTimeout(300);
let fail = 0; const ok = (c, m) => { if (!c) { console.log('FEHL ' + m); fail++; } else console.log('ok   ' + m); };
ok(await p.locator('#fs-q').isVisible(), 'Suchfeld sichtbar');
await p.fill('#fs-q', 'rotterdam');
const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('#fs-folder')]);
await fc.setFiles(dir); await p.waitForTimeout(800);
const local = await p.locator('ul.files li').allTextContents();
ok(local.some(t => t.includes('Angebot_Rotterdam.pdf')), 'Treffer per Dateiname');
ok(local.some(t => t.includes('notiz.txt') && t.includes('im Inhalt')), 'Treffer im Textinhalt');
ok(!local.some(t => t.includes('anderes.txt')), 'Nicht-Treffer ausgeblendet');
await p.click('#fs-remote'); await p.waitForTimeout(800);
const txt = await p.locator('.section').filter({ hasText: 'Dateien suchen' }).innerText();
ok(txt.includes('Plan.xlsx') && txt.includes('01_Aufgabenlisten'), 'SharePoint-Treffer');
ok(txt.includes('Messe Rotterdam'), 'Notion-Treffer');
ok(/Dropbox ist für dich nicht verbunden/.test(txt), 'Dropbox-Fehler verständlich');
const calls = await p.evaluate(() => window.__calls.filter(c => /search/.test(c[1])).map(c => c[0] + '/' + c[1]));
ok(calls.length === 3, 'genau 3 Abfragen: ' + calls.join(', '));
const real = errs.filter(e => !/ERR_FILE_NOT_FOUND/.test(e)); // file://-Aufruf: Artefakt-Assets fehlen lokal
ok(!real.length, 'keine Konsolenfehler ' + real.join(' | '));
await b.close(); process.exit(fail ? 1 : 0);
