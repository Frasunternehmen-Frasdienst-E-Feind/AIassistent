// Unit-Tests: Jira-Vorgänge (Projekt MAR) lesen, sortieren, Überfälligkeit; keine Bearbeiterdaten.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const J = require('../src/jira-logic.js');

const node = (key, summary, due, cat = 'new', extra = {}) => ({ key, webUrl: 'https://fraesdienst-feind.atlassian.net/browse/' + key,
  fields: Object.assign({ summary, duedate: due, status: { name: 'Zu erledigen', statusCategory: { key: cat } }, priority: { name: 'Hoch' }, labels: ['Werbung'],
    assignee: { displayName: 'X', emailAddress: 'x@example.org', accountId: 'a1' } }, extra) });

test('Antwort von searchJiraIssuesUsingJql wird gelesen, ohne Bearbeiterdaten', () => {
  const p = J.parse({ issues: { nodes: [node('MAR-2', 'B', '2026-12-01'), { key: 'MAR-9', fields: {} }], pageInfo: { hasNextPage: true } },
    webUrl: 'https://fraesdienst-feind.atlassian.net/issues?jql=x' });
  assert.equal(p.rows.length, 1);
  assert.equal(p.more, true);
  const r = p.rows[0];
  assert.deepEqual(Object.keys(r).sort(), ['assigned', 'cat', 'due', 'key', 'labels', 'prio', 'status', 'title', 'url']);
  assert.equal(r.assigned, true);
  assert.ok(!JSON.stringify(p).includes('example.org'));
});

test('Links nur auf die eigene Atlassian-Site', () => {
  const p = J.parse({ issues: [Object.assign(node('MAR-1', 'A', ''), { webUrl: 'javascript:alert(1)' })] });
  assert.equal(p.rows[0].url, '');
});

test('Sortierung nach Fälligkeit, ohne Datum ans Ende; überfällig nur wenn offen', () => {
  const rows = J.parse({ issues: [node('MAR-10', 'ohne', null), node('MAR-3', 'spät', '2026-12-01'), node('MAR-4', 'früh', '2026-05-01')] }).rows;
  assert.deepEqual(J.sort(rows).map(r => r.key), ['MAR-4', 'MAR-3', 'MAR-10']);
  assert.equal(J.overdue(rows[2], '2026-11-09'), true);
  assert.equal(J.overdue(Object.assign({}, rows[2], { cat: 'done' }), '2026-11-09'), false);
  assert.equal(J.overdue(rows[0], '2026-11-09'), false);
});

test('Artefakt enthält genau diese Modulstände', () => {
  const html = readFileSync(new URL('../Feind-Cockpit-A1.html', import.meta.url), 'utf8');
  for (const f of ['jira-logic.js', 'app-jira.js']) assert.ok(html.includes(readFileSync(new URL('../src/' + f, import.meta.url), 'utf8').trim()), f);
});
