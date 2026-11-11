// E2E-Smoke: InfraTech › Aufgaben zeigt offene Jira-Vorgänge (simulierter Atlassian-Connector), Fehlerfall verständlich.
// Aufruf: node cockpit-a1/e2e/jira-smoke.mjs [html-datei]
import { chromium } from '@playwright/test';
const file = process.argv[2] || new URL('../Feind-Cockpit-A1.html', import.meta.url).pathname;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FEHL ') + m); if (!c) fail++; };
const b = await chromium.launch();
for (const mode of ['ok', 'err']) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_FILE_NOT_FOUND/.test(m.text())) errs.push(m.text()); });
  await p.route('https://**', r => r.fulfill({ status: 200, body: '' }));
  await p.addInitScript(mode => {
    window.__calls = [];
    const issue = (key, s, due) => ({ key, webUrl: 'https://fraesdienst-feind.atlassian.net/browse/' + key,
      fields: { summary: s, duedate: due, status: { name: 'In Arbeit', statusCategory: { key: 'indeterminate' } }, priority: { name: 'Hoch' }, labels: [], assignee: { displayName: 'Geheim Name', emailAddress: 'geheim@example.org' } } });
    const mcp = { async callTool(server, tool, input) { window.__calls.push([server, tool, input]);
      if (server === 'Atlassian MCP') { if (mode === 'err') throw { code: 'server_not_connected' };
        return { content: [{ type: 'text', text: JSON.stringify({ issues: { nodes: [issue('MAR-7', 'Messestand buchen', '2026-01-10'), issue('MAR-8', 'Flyer drucken', null)] } }) }] }; }
      throw { code: 'server_not_connected' }; } };
    window.claude = { use: async n => (n === 'mcp' ? mcp : null) };
  }, mode);
  await p.goto('file://' + file); await p.waitForTimeout(1200);
  await p.evaluate(() => FC.app.go('infratech', 'aufgaben')); await p.waitForTimeout(800);
  const txt = await p.locator('#jira-src').evaluate(el => el.closest('.section').innerText);
  if (mode === 'ok') {
    ok(/MAR-7[\s\S]*Messestand buchen[\s\S]*überfällig/i.test(txt), 'Vorgang mit Fälligkeit und „überfällig“');
    ok(txt.includes('MAR-8'), 'Vorgang ohne Fälligkeit');
    ok(!/Geheim|example\.org/.test(await p.content()), 'keine Bearbeiterdaten im Cockpit');
    ok(/Quelle: Jira live/i.test(txt), 'Quellenhinweis Jira live');
    const c = await p.evaluate(() => window.__calls.find(x => x[0] === 'Atlassian MCP'));
    ok(c && /project = MAR/.test(c[2].jql) && c[2].cloudId === 'fraesdienst-feind.atlassian.net', 'JQL und Site');
  } else ok(/Atlassian \(Jira\) ist für dich nicht verbunden/.test(txt), 'Fehler verständlich');
  ok(!errs.length, mode + ': keine Konsolenfehler ' + errs.join(' | '));
  await p.close();
}
await b.close(); process.exit(fail ? 1 : 0);
