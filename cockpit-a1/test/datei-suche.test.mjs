// Unit-Tests: Dateisuche (Ordner am Rechner, Ablagen SharePoint/Dropbox/Notion).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const F = require('../src/datei-suche-logic.js');

test('Suchwörter: alle müssen vorkommen, Umlaute und Trenner egal', () => {
  assert.ok(F.matches('Messe/InfraTech_2027_Fräswalze.pdf', 'Fraswalze infratech'));
  assert.ok(F.matches('Angebot-Großbaustelle.docx', 'grossbaustelle angebot'));
  assert.ok(!F.matches('Angebot.docx', 'angebot rotterdam'));
  assert.ok(!F.matches('egal.txt', '   '));
});

test('Inhalt nur bei kleinen Textdateien', () => {
  assert.ok(F.isTextLike('notiz.md', 2000));
  assert.ok(!F.isTextLike('notiz.md', F.MAX_TEXT + 1));
  assert.ok(!F.isTextLike('vertrag.pdf', 10));
});

test('SharePoint: nur sites/Marketing, kein persönliches OneDrive', () => {
  const hits = F.parse('sharepoint', [
    { name: 'a.xlsx', webUrl: 'https://fraesdienst.sharepoint.com/sites/Marketing/Freigegebene Dokumente/01_Aufgabenlisten/a.xlsx', lastModifiedDateTime: '2026-10-09T12:12:28.000Z' },
    { name: 'b.pdf', webUrl: 'https://fraesdienst-my.sharepoint.com/personal/x/Documents/b.pdf' },
    { moreResults: true, nextOffset: 2 }
  ]);
  assert.deepEqual(hits.map(x => [x.name, x.where]), [['a.xlsx', '01_Aufgabenlisten']]);
  assert.equal(typeof hits[0].at, 'number');
});

test('Dropbox und Notion: Titel, Link, Ort', () => {
  const d = F.parse('dropbox', [{ results: [{ title: 'x.zip', url: 'https://www.dropbox.com/preview/M/x.zip', path_display: '/Marketing/x.zip', object_type: 'file' }, { title: 'weg', object_type: 'deleted' }] }]);
  assert.deepEqual(d.map(x => [x.name, x.where]), [['x.zip', '/Marketing']]);
  const n = F.parse('notion', [{ results: [{ title: 'Messe', url: 'https://app.notion.com/p/1', type: 'page', path: 'Projektleiter' }, { title: 'Max', type: 'user' }] }]);
  assert.deepEqual(n.map(x => [x.name, x.where]), [['Messe', 'Projektleiter']]);
  assert.equal(F.parse('notion', [{ results: [{ title: 'böse', url: 'javascript:alert(1)', type: 'page' }] }])[0].url, '');
});

test('Artefakt enthält genau diese Modulstände', () => {
  const html = readFileSync(new URL('../Feind-Cockpit-A1.html', import.meta.url), 'utf8');
  for (const f of ['datei-suche-logic.js', 'app-datei-suche.js']) {
    const src = readFileSync(new URL('../src/' + f, import.meta.url), 'utf8').trim();
    assert.ok(html.includes(src), f + ' weicht vom veröffentlichten Artefakt ab');
  }
});
