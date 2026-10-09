// Themenprojekte aus gehäuften Einträgen (umbau/SPEC-themenprojekte.md): reine Logik in kb-logic.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './load-module.mjs';

const K = loadModule('kb-logic.js');
const it = (id, extra) => Object.assign({ id, title: 'Eintrag ' + id, status: 'fertig', entities: { projects: [] }, tags: [] }, extra);
const proj = name => ({ entities: { projects: [name] } });

test('Ab drei Einträgen zum selben Thema entsteht ein Vorschlag, darunter nicht', () => {
  const two = [it('a', proj('Messeplanung Rotterdam 2027')), it('b', proj('Messeplanung Rotterdam 2027'))];
  assert.deepEqual(K.topicSuggestions(two, []), []);
  const three = two.concat([it('c', proj('Messeplanung Rotterdam 2027'))]);
  const s = K.topicSuggestions(three, []);
  assert.equal(s.length, 1);
  assert.equal(s[0].name, 'Messeplanung Rotterdam 2027');
  assert.deepEqual(s[0].itemIds.sort(), ['a', 'b', 'c']);
  assert.equal(s[0].key, 'messeplanung rotterdam 2027');
});

test('Schreibweisen werden gefaltet; der Name ist die häufigste Original-Schreibweise', () => {
  const items = [it('a', proj('Messeplanung Rotterdam 2027')), it('b', proj('messeplanung rotterdam 2027')), it('c', { fileTopic: 'Messeplanung  Rotterdam-2027' }), it('d', proj('Messeplanung Rotterdam 2027'))];
  const s = K.topicSuggestions(items, []);
  assert.equal(s.length, 1);
  assert.equal(s[0].itemIds.length, 4);
  assert.equal(s[0].name, 'Messeplanung Rotterdam 2027');
});

test('Mehrteilige Schlagwörter zählen, einzelne Wörter nicht', () => {
  const multi = ['a', 'b', 'c'].map(id => it(id, { tags: ['Fachpresse Straßenbau'] }));
  assert.equal(K.topicSuggestions(multi, []).length, 1);
  const single = ['a', 'b', 'c'].map(id => it(id, { tags: ['messe'] }));
  assert.deepEqual(K.topicSuggestions(single, []), []);
});

test('Kein Vorschlag bei bestehendem Projekt gleichen Namens oder ausgeblendetem Thema', () => {
  const items = ['a', 'b', 'c'].map(id => it(id, proj('Messeplanung Rotterdam 2027')));
  assert.deepEqual(K.topicSuggestions(items, [{ id: 'p1', name: 'Messeplanung  Rotterdam 2027' }]), []);
  assert.deepEqual(K.topicSuggestions(items, [], { dismissed: ['messeplanung rotterdam 2027'] }), []);
});

test('Zugeordnete und archivierte Einträge zählen nicht mit', () => {
  const items = [it('a', proj('Kampagne Frühjahr')), it('b', proj('Kampagne Frühjahr')), it('c', Object.assign(proj('Kampagne Frühjahr'), { projectId: 'p9' })), it('d', Object.assign(proj('Kampagne Frühjahr'), { status: 'archiviert' }))];
  assert.deepEqual(K.topicSuggestions(items, []), []);
});

test('Überschneidung: jeder Eintrag zählt nur im größeren Vorschlag', () => {
  const both = { entities: { projects: ['Messeplanung Rotterdam 2027'] }, tags: ['Standbau Rotterdam'] };
  const items = [it('a', both), it('b', both), it('c', both), it('d', proj('Messeplanung Rotterdam 2027')), it('e', { tags: ['Standbau Rotterdam'] })];
  const s = K.topicSuggestions(items, []);
  assert.equal(s.length, 1, 'Standbau behält nur 1 Eintrag und fällt unter die Schwelle');
  assert.equal(s[0].name, 'Messeplanung Rotterdam 2027');
  assert.equal(s[0].itemIds.length, 4);
});

test('Schwelle ist einstellbar; Vorschläge sind nach Größe sortiert', () => {
  const items = [it('a', proj('Thema A')), it('b', proj('Thema A')), it('c', proj('Thema B')), it('d', proj('Thema B')), it('e', proj('Thema B'))];
  const s = K.topicSuggestions(items, [], { min: 2 });
  assert.deepEqual(s.map(x => x.name), ['Thema B', 'Thema A']);
});

test('matchTheme: neuer Eintrag findet das passende Themenprojekt, Bauprojekte zählen nicht', () => {
  const projects = [{ id: 'p1', name: 'Messeplanung Rotterdam 2027', kind: 'thema' }, { id: 'p2', name: 'Kampagne Frühjahr' }];
  assert.equal(K.matchTheme(it('x', proj('messeplanung rotterdam 2027')), projects), 'p1');
  assert.equal(K.matchTheme(it('y', { fileTopic: 'Messeplanung Rotterdam 2027' }), projects), 'p1');
  assert.equal(K.matchTheme(it('z', proj('Kampagne Frühjahr')), projects), null, 'nur Projekte der Art „thema“');
  assert.equal(K.matchTheme(it('w', {}), projects), null);
});
