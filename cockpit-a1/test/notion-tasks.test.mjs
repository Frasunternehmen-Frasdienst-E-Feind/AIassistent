// Unit-Tests: Zuordnung Notion-Datenbank „Aufgaben InfraTech 2027“ ↔ Cockpit-Aufgaben (A1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const N = require('../src/notion-tasks.js');

const CATS = [{ id: 'steuerung', label: 'Steuerung & Fristen' }, { id: 'standbau', label: 'Standbau & Technik' }];
const ROLES = [{ key: 'mkt', label: 'Marketing & Event' }, { key: 'team', label: 'Messeteam' }];
const U = 'https://app.notion.com/p/';
const rows = [
  { 'Priorität': 'P0', Notiz: 'x', 'Zuständig (Rolle)': 'Marketing & Event', Archiviert: '__NO__', Nr: '5', Quelle: 'Cockpit', 'Cockpit-ID': 's1', Bereich: 'Steuerung & Fristen', 'date:Fällig:start': '2026-10-02', Status: 'in Arbeit', Beschluss: '', Aufgabe: 'A', 'Person (intern)': '["user://abc"]', url: U + '3eb40f8bbabb8100b95edf623f827608' },
  { 'Priorität': 'P2', 'Zuständig (Rolle)': 'Messeteam', Archiviert: '__YES__', Nr: '98', Hinweis: '["neu","Recht prüfen"]', 'Cockpit-ID': '', Bereich: 'Standbau & Technik', Status: 'offen', Aufgabe: 'B', 'Blockiert durch': '["' + U + '3eb40f8bbabb8100b95edf623f827608"]', url: U + '3eb40f8bbabb811683f7f2d17f8235d8' },
  { 'Cockpit-ID': 's1', Aufgabe: 'Dublette', Nr: '7', url: U + '3eb40f8bbabb811683f7f2d17f8235d9' }
];

test('Zeilen werden zu Aufgaben, Dubletten gemeldet', () => {
  const r = N.rowsToTasks(rows, CATS, ROLES);
  assert.equal(r.tasks.length, 2);
  assert.deepEqual(r.dupes, ['s1']);
  const [a, b] = r.tasks;
  assert.equal(a.status, 'in_progress');
  assert.equal(a.due, '2026-10-02');
  assert.equal(a.owner, 'mkt');
  assert.equal(a.cat, 'steuerung');
  assert.equal(b.id, 'n-98');
  assert.equal(b.archived, true);
  assert.deepEqual(b.flags, ['neu', 'recht']);
  assert.deepEqual(b.deps, ['s1']);
});

test('„Person (intern)“ wird nie übernommen (Datenschutz)', () => {
  const r = N.rowsToTasks(rows, CATS, ROLES);
  assert.ok(!JSON.stringify(r.tasks).includes('user://'));
});

test('Nur freigegebene Felder gehen nach Notion', () => {
  const cur = { status: 'open', title: 'alt', note: 'x' };
  const sp = N.splitPatch({ status: 'done', title: 'neu', links: [1], note: 'x' }, cur, true);
  assert.deepEqual(sp.notion, { status: 'done' });
  assert.deepEqual(sp.owned, ['title']);
  assert.deepEqual(Object.keys(sp.local).sort(), ['links', 'note', 'status']);
});

test('Eigenschaften im Notion-Format', () => {
  assert.deepEqual(N.toProps({ status: 'done', due: null, archived: true, prio: 'P1' }),
    { Status: 'erledigt', 'date:Fällig:start': null, Archiviert: '__YES__', 'Priorität': 'P1' });
  assert.deepEqual(N.toProps({ due: '2026-11-01' }), { 'date:Fällig:start': '2026-11-01', 'date:Fällig:is_datetime': 0 });
  assert.equal(N.pageId('3eb40f8b-babb-8100-b95e-df623f827608'), '3eb40f8bbabb8100b95edf623f827608');
});

test('Konflikt nur, wenn Notion inzwischen abweicht und der neue Wert es überschreibt', () => {
  assert.deepEqual(N.conflicts({ status: 'open' }, { status: 'blocked' }, { status: 'done' }), ['status']);
  assert.deepEqual(N.conflicts({ status: 'open' }, { status: 'open' }, { status: 'done' }), []);
  assert.deepEqual(N.conflicts({ status: 'open' }, { status: 'done' }, { status: 'done' }), []);
});

test('Neue Aufgabe: Quelle, Bereich, Hinweis „neu“', () => {
  const p = N.newTaskProps('u1', { title: 'T', cat: 'standbau', status: 'open', prio: 'P1', due: '', note: '', flags: [] }, CATS, 'Messeteam', 'Meeting');
  assert.equal(p.Bereich, 'Standbau & Technik');
  assert.equal(p.Quelle, 'Meeting');
  assert.equal(p.Hinweis, '["neu"]');
  assert.ok(!('date:Fällig:start' in p));
});

test('Artefakt enthält genau diese Modulstände', () => {
  const html = readFileSync(new URL('../Feind-Cockpit-A1.html', import.meta.url), 'utf8');
  for (const f of ['notion-tasks.js', 'app-notion-tasks.js']) {
    const src = readFileSync(new URL('../src/' + f, import.meta.url), 'utf8').trim();
    assert.ok(html.includes(src), f + ' weicht vom veröffentlichten Artefakt ab');
  }
});

test('newTaskProps: „Blockiert durch“ beim Anlegen als Notion-Relation, ungültige URLs fallen weg', () => {
  const t = { title: 'T', cat: 'standbau', status: 'open', prio: 'P1', flags: [], deps: ['s1'] };
  const dep = U + '3eb40f8bbabb8100b95edf623f827608';
  const p = N.newTaskProps('u2', t, CATS, 'Messeteam', 'Cockpit', [dep, dep, 'kein-link']);
  assert.deepEqual(JSON.parse(p['Blockiert durch']), [dep]);
  assert.equal('Blockiert durch' in N.newTaskProps('u3', t, CATS, 'Messeteam', 'Cockpit'), false);
});
