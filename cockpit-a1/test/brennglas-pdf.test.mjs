// Unit-Tests: Brennglas-PDF im Cockpit A1 (Modelle je Reiter und Renderer auf jsPDF).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const B = require('../src/brennglas-pdf.js');
const { jsPDF } = require('jspdf');

const CATS = [{ id: 'steuerung', label: 'Steuerung & Fristen' }, { id: 'standbau', label: 'Standbau & Technik' }];
const ROLE = { mkt: 'Marketing & Event', gl: 'Geschäftsleitung' };
const ctx = { cats: CATS, roleOf: o => ROLE[o] || 'Teammitglied', today: new Date(2026, 9, 10), now: new Date(2026, 9, 10, 8, 30) };
const tasks = [
  { id: 'a', cat: 'steuerung', prio: 'P1', owner: 'mkt', due: '2026-10-05', status: 'open', title: 'Überfällig', note: 'n', flags: [] },
  { id: 'b', cat: 'steuerung', prio: 'P0', owner: 'gl', due: '2026-10-20', status: 'blocked', title: 'Blockiert', flags: ['recht'] },
  { id: 'c', cat: 'standbau', prio: 'P2', owner: 'u-123', due: null, status: 'done', title: 'Erledigt', beschluss: 'ja', flags: ['neu'] },
  { id: 'd', cat: 'standbau', prio: 'P0', owner: 'mkt', due: '2026-10-15', status: 'open', title: 'Neu', flags: ['neu', 'fakt'] }
];

test('CI-Tokens im PDF entsprechen branding/feind-ci.tokens.json (hell)', () => {
  const tok = JSON.parse(readFileSync(new URL('../../branding/feind-ci.tokens.json', import.meta.url), 'utf8')).tokens.light;
  for (const [k, v] of Object.entries(B.TOKENS)) assert.equal(v.toLowerCase(), String(tok[k]).toLowerCase(), k);
});

test('Aufgabenliste: Bereiche, Sortierung P0 zuerst, Marker und Status', () => {
  const m = B.tasksModel(tasks, ctx);
  assert.deepEqual(m.sections.map(s => s.title), ['Steuerung & Fristen (0/2 erledigt)', 'Standbau & Technik (1/2 erledigt)']);
  const [s1, s2] = m.sections;
  assert.deepEqual(s1.items.map(i => i.text), ['Blockiert', 'Überfällig']);
  assert.deepEqual(s1.items.map(i => i.mk), ['warn', 'no']);
  assert.equal(s1.items[0].status, 'Klärung nötig');
  assert.match(s1.items[1].meta, /5 T überfällig/);
  assert.match(s1.items[0].meta, /Recht prüfen/);
  assert.deepEqual(s2.items.map(i => [i.text, i.mk, i.done]), [['Neu', 'add', false], ['Erledigt', 'ok', true]]);
  assert.equal(s2.items[1].note, 'Beschluss: ja');
  assert.equal(m.blockers.length, 2);
  assert.equal(m.chip, '3 offen · 4 gesamt');
  assert.equal(B.filename(m), 'Brennglas_Aufgaben_InfraTech2027_2026-10-10.pdf');
});

test('Datenschutz: nur Rollen, unbekannte Kennungen als „Teammitglied“', () => {
  const s = JSON.stringify(B.tasksModel(tasks, ctx));
  assert.ok(!s.includes('u-123'));
  assert.ok(s.includes('Teammitglied'));
  assert.ok(B.tasksModel(tasks, ctx).dp.join(' ').includes('Bitte Rechtsabteilung prüfen'));
});

test('Lagebericht, Fristen, Budget, KPIs, Leads, Lessons, Fakten, Rollen, Protokoll liefern Abschnitte', () => {
  const dl = [{ d: '2026-10-12', t: 'Frist A', s: 'belegt', st: 'r' }, { d: '2026-12-01', t: 'Frist B', s: '2027 verifizieren', st: 'y' }, { d: '2026-09-01', t: 'Alt', s: '', st: 'r' }];
  const dash = B.dashboardModel(tasks, dl, ctx);
  assert.deepEqual(dash.sections.map(s => s.title), ['P0 offen (2)', 'Fristen in den nächsten 45 Tagen (1)']);
  const fr = B.deadlinesModel(dl, ctx);
  assert.deepEqual(fr.sections.map(s => s.items.length), [2, 1]);
  assert.deepEqual(fr.sections[0].items.map(i => i.mk), ['no', 'warn']);
  assert.equal(fr.blockers.length, 1);
  const bud = B.budgetModel({ rows: [{ p: 'Stand', z: '11.000–13.000', a: 'x', forecast: 12000, ist: 14000, dev: { cls: 'r', txt: '+17 %' } }], sumF: 12000, sumI: 14000, haveI: true, dev: { cls: 'r', txt: '+17 %' } }, { planMin: 24200, planMax: 26500, baseline: 21023, maxDeviation: 0.1 }, ctx);
  assert.equal(bud.sections[0].items[0].mk, 'no');
  assert.match(bud.sections[0].items[0].meta, /Forecast 12\.000 €/);
  assert.equal(B.kpiModel([{ k: 'Leads', b: '–', z: '≥ 300', m: 'Formular' }], ctx).sections[0].items.length, 1);
  const ld = B.leadsModel([{ date: '2027-01-12', a: 2, b: 3, c: 1 }, { date: '2027-01-13', a: 0, b: 0, c: 0 }], Object.assign({ target: 300 }, ctx));
  assert.match(ld.sections[1].items[0].text, /Gesamt: 6 Leads/);
  assert.deepEqual(B.lessonsModel([['E1', 'x', 'Hoch', 'm'], ['E5', 'y', 'Mittel', 'n']], ctx).sections.map(s => s.title), ['Impact Hoch', 'Impact Mittel']);
  const fk = B.factsModel([['Datum', '12.–15.01.', 'Bestätigt', 'ok']], tasks, ctx);
  assert.equal(fk.sections[1].items.length, 2);
  assert.deepEqual(B.rolesModel(tasks, ctx).sections.map(s => s.title), ['Geschäftsleitung', 'Marketing & Event']);
  const mt = B.meetingModel({ date: '2026-10-01', status: 'abgeschlossen', decisions: ['D1'], created: [['T1', 'Vertrieb · 12.10.2026']], changes: [['X', 'offen → erledigt']], notes: '' }, ctx);
  assert.deepEqual(mt.sections.map(s => s.items[0].mk), ['add', 'none', 'ok']);
});

test('Zeichen außerhalb Windows-1252 werden lesbar ersetzt', () => {
  assert.equal(B.sanitize('≥ 300 → ok ✓ äöüß € „x“ – •'), '>= 300 -> ok x äöüß € „x“ – •');
  assert.equal(B.sanitize('漢'), '?');
});

test('Renderer: PDF mit Formularfeldern je Position, Fußzeile auf jeder Seite, Druckvariante', () => {
  const many = Array.from({ length: 25 }, (_, i) => Object.assign({}, tasks[i % 4], { id: 'x' + i, title: 'Aufgabe ' + i + ' mit längerem Titel, der umbricht und das Layout testet' }));
  const r = B.render(jsPDF, B.tasksModel(many, ctx), { compress: false });
  assert.equal(r.items, 25);
  assert.ok(r.pages >= 2);
  const out = r.doc.output();
  assert.ok(out.startsWith('%PDF-'));
  assert.ok(out.includes('/AcroForm'));
  for (const f of ['done_000', 'sel_024', 'note_024']) assert.ok(out.includes('(' + f + ')'), f);
  assert.ok(out.includes('Seite ' + r.pages + ' von ' + r.pages));
  assert.ok(out.includes('/MaxLen 250'));
  const p = B.render(jsPDF, B.kpiModel([{ k: 'A', b: '-', z: '1', m: 'm' }], ctx), { compress: false, print: true }).doc.output();
  assert.ok(/\/S \/Named[\s\S]*\/N \/Print/.test(p));
});

test('Modul ist im Cockpit-HTML eingebettet', () => {
  const html = readFileSync(new URL('../Feind-Cockpit-A1.html', import.meta.url), 'utf8');
  const src = readFileSync(new URL('../src/brennglas-pdf.js', import.meta.url), 'utf8');
  assert.ok(html.includes(src.trim().split('\n').slice(0, 3).join('\n')), 'Kopf von brennglas-pdf.js fehlt im HTML');
  assert.ok(html.includes(src.trim().split('\n').slice(-3).join('\n')), 'Ende von brennglas-pdf.js fehlt im HTML');
});
