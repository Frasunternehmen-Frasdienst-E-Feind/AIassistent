// Unit-Tests für FeindCore – der Kern wird direkt aus Feind-Cockpit.html geladen (eine Quelle).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from '../tools/migrate.mjs';
import live from './fixtures/live-2026-09-28.mjs';

const C = loadCore();
const D = (y, m, d) => new Date(y, m - 1, d);
// Kern läuft in eigenem VM-Kontext (andere Prototypen) → strukturell über JSON vergleichen.
const eq = (a, b) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b);

describe('Datum', () => {
  test('parseDay ISO und ungültig', () => {
    const d = C.parseDay('2027-01-12');
    assert.equal(d.getFullYear(), 2027); assert.equal(d.getMonth(), 0); assert.equal(d.getDate(), 12);
    assert.equal(C.parseDay(''), null); assert.equal(C.parseDay(null), null); assert.equal(C.parseDay('kein Datum'), null);
  });
  test('dayDiff über Monats- und Zeitumstellungsgrenze', () => {
    assert.equal(C.dayDiff(C.parseDay('2027-01-12'), C.parseDay('2027-01-15')), 3);
    assert.equal(C.dayDiff(C.parseDay('2026-10-24'), C.parseDay('2026-10-26')), 2); // Umstellung 25.10.
    assert.equal(C.dayDiff(D(2026, 9, 28), C.parseDay('2027-01-12')), 106);
  });
  test('ymd, fmtD, isoShift', () => {
    assert.equal(C.ymd(D(2027, 1, 5)), '2027-01-05');
    assert.equal(C.fmtD(D(2027, 1, 5)), '05.01.2027');
    assert.equal(C.isoShift('2026-12-31', 1), '2027-01-01');
    assert.equal(C.isoShift('2026-11-15', -7), '2026-11-08');
  });
});

describe('Budget', () => {
  test('parseEuroRange', () => {
    assert.equal(C.parseEuroRange('11.000–13.000'), 12000);
    assert.equal(C.parseEuroRange('2.500'), 2500);
    assert.equal(C.parseEuroRange('—'), null);
    assert.equal(C.parseEuroRange(''), null);
  });
  test('budgetDev Ampel-Grenzen', () => {
    eq(C.budgetDev(1000, 1000), { cls: 'g', txt: '0 %' });
    assert.equal(C.budgetDev(1000, 1100).cls, 'y');   // genau +10 % = gelb
    assert.equal(C.budgetDev(1000, 1101).cls, 'r');
    assert.equal(C.budgetDev(1000, null).txt, '—');
  });
  test('euroKey stabil (Umlaute, Sonderzeichen)', () => {
    assert.equal(C.euroKey('Technik, Strom, TV, Parken/Müll'), 'technik-strom-tv-parken-muell');
  });
});

describe('CSV & ICS', () => {
  test('csvCell/csvDoc – BOM, Semikolon, CRLF, Quoting', () => {
    assert.equal(C.csvCell('a;b'), '"a;b"'); assert.equal(C.csvCell('Zoll "NL"'), '"Zoll ""NL"""'); assert.equal(C.csvCell(null), '');
    const doc = C.csvDoc(['A', 'B'], [[1, 'x;y']]);
    assert.ok(doc.startsWith('﻿A;B\r\n')); assert.ok(doc.endsWith('1;"x;y"\r\n'));
  });
  test('icsDate/icsDateEnd', () => {
    assert.equal(C.icsDate('2027-01-12'), '20270112');
    assert.equal(C.icsDateEnd('2026-12-31'), '20270101');
  });
  test('icsFold: Zeilen ≤ 75 Oktett, Umlaute nicht zerteilt', () => {
    const folded = C.icsFold('SUMMARY:' + 'Ä'.repeat(120));
    const lines = folded.split('\r\n');
    assert.ok(lines.length > 1);
    lines.forEach(l => assert.ok(Buffer.byteLength(l, 'utf8') <= 75, l.length));
    assert.equal(folded.replace(/\r\n /g, ''), 'SUMMARY:' + 'Ä'.repeat(120));
  });
  test('buildICS: gültiger Kalender mit Escaping', () => {
    const ics = C.buildICS([{ d: '2026-11-15', t: 'Standentwurf; Frist, 2027', desc: 'Zeile1\nZeile2' }], { calName: 'Test', now: Date.UTC(2026, 8, 28, 10, 0, 0) });
    assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n')); assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
    assert.match(ics, /DTSTART;VALUE=DATE:20261115/); assert.match(ics, /DTEND;VALUE=DATE:20261116/);
    assert.match(ics, /SUMMARY:Standentwurf\\; Frist\\, 2027/); assert.match(ics, /DESCRIPTION:Zeile1\\nZeile2/);
    assert.match(ics, /DTSTAMP:20260928T100000Z/);
  });
});

describe('Aufgabenmodell (allTasks/progress/dueLabel)', () => {
  const seed = [{ id: 's1', title: 'A', due: '2026-10-02' }, { id: 's2', title: 'B' }, { id: 'i1', title: 'Innovationspreis', due: '2026-09-25' }];
  test('mergeTasks: Seed + Änderungen, eigene Aufgaben, Archiv', () => {
    const custom = { s1: { status: 'done' }, u1: { title: 'Eigene', custom: true }, s2: { archived: true } };
    const act = C.mergeTasks(seed, custom, false), arch = C.mergeTasks(seed, custom, true);
    eq(act.map(x => x.id).sort(), ['i1', 's1', 'u1']);
    eq(arch.map(x => x.id), ['s2']);
    assert.equal(act.find(x => x.id === 's1').status, 'done');
    assert.equal(act.find(x => x.id === 'u1').prio, 'P2'); // Standardwerte für eigene Aufgaben
    assert.equal(C.mergeTasks(seed, { s2: { deleted: true } }, true).length, 1); // Alt-Tombstone = Archiv
  });
  test('progress', () => {
    eq(C.progress([{ status: 'done' }, { status: 'open' }, { status: 'in_progress' }]), { done: 1, total: 3, pct: 33 });
    eq(C.progress([]), { done: 0, total: 0, pct: 0 });
  });
  test('dueLabel/dueClass relativ zu heute', () => {
    const today = D(2026, 9, 28);
    assert.equal(C.dueLabel('2026-09-25', today), '25.09.2026 · 3 T überfällig');
    assert.equal(C.dueLabel('2026-09-28', today), '28.09.2026 · heute');
    assert.equal(C.dueLabel('2026-10-02', today), '02.10.2026 · in 4 T');
    assert.equal(C.dueLabel(null, today), 'offen');
    assert.equal(C.dueClass('2026-09-25', today), 'over'); assert.equal(C.dueClass('2026-10-12', today), 'soon'); assert.equal(C.dueClass('2026-10-13', today), '');
  });
  test('unmetDeps: nur offene Blocker', () => {
    const act = [{ id: 'a', status: 'done' }, { id: 'b', status: 'open' }];
    eq(C.unmetDeps({ deps: ['a', 'b', 'x'] }, act).map(x => x.id), ['b']);
  });
  test('innovationState: Alarm hängt an Daten, nicht an festem Banner', () => {
    const today = D(2026, 9, 28);
    assert.equal(C.innovationState(C.mergeTasks(seed, {}, false), today).level, 'overdue');
    assert.equal(C.innovationState(C.mergeTasks(seed, { i1: { status: 'done' } }, false), today).level, 'done');
    assert.equal(C.innovationState(C.mergeTasks(seed, {}, false), D(2026, 9, 20)).level, 'open');
  });
  test('Lead-Zähler: 4 Messetage, nur Zahlen', () => {
    const days = C.fairDays('2027-01-12', '2027-01-15');
    eq(days, ['2027-01-12', '2027-01-13', '2027-01-14', '2027-01-15']);
    eq(C.leadsSum({ '2027-01-12': { a: 2, b: 1 }, '2027-01-14': { c: '3' }, '2026-01-01': { a: 99 } }, days), { a: 2, b: 1, c: 3, total: 6 });
  });
});

describe('Marketing-Ableitungen & Geo', () => {
  const today = D(2026, 9, 28);
  test('tenderAmpel', () => {
    assert.equal(C.tenderAmpel({ deadline: '2026-09-30' }, today, 3, 7).level, 'red');
    assert.equal(C.tenderAmpel({ deadline: '2026-10-05' }, today, 3, 7).level, 'yellow');
    assert.equal(C.tenderAmpel({ deadline: '2026-11-05' }, today, 3, 7).level, 'green');
    assert.equal(C.tenderAmpel({ deadline: '2026-09-01' }, today, 3, 7).text, 'abgelaufen');
    assert.equal(C.tenderAmpel({}, today, 3, 7).text, 'Frist fehlt');
  });
  test('leadFollowup / contentStale', () => {
    assert.equal(C.leadFollowup({ stage: 'neu', lastContact: '2026-09-01' }, today, 5), 27);
    assert.equal(C.leadFollowup({ stage: 'gewonnen', lastContact: '2026-09-01' }, today, 5), null);
    assert.equal(C.contentStale({ status: 'entwurf', statusSince: '2026-09-01' }, today, 14), 27);
    assert.equal(C.contentStale({ status: 'review', statusSince: '2026-09-01' }, today, 14), null);
  });
  test('Geo: Heimat = Ring 0, Nachbarn, Ausland, unbekannt', () => {
    assert.equal(C.ringOf({ region: 'Landkreis Dahme-Spreewald, Brandenburg' }), 0);
    assert.equal(C.ringOf({ landkreis: 'Ludwigslust-Parchim, MV' }), 0);
    assert.equal(C.ringOf({ bundesland: 'Sachsen' }), 1);
    assert.equal(C.ringOf({ region: 'Niederlande' }), C.RING_COUNTRY);
    assert.equal(C.ringOf({}), C.RING_UNKNOWN);
    assert.equal(C.STATE_RING['Bayern'], 2);
  });
});

describe('Migration (verlustfrei, idempotent)', () => {
  test('Live-Bestand 28.09.2026: i1-Status nach tasks, A2-Event übernommen, nichts gelöscht', () => {
    const plan = C.planMigration({ target: live.target, sources: { a2: live.a2, a3: live.a3 } }, { nowIso: '2026-09-28T12:00:00Z' });
    assert.equal(plan.ops.filter(o => o.op === 'delete').length, 0);
    const t = plan.ops.find(o => o.collection === 'tasks' && o.doc_id === 'i1');
    assert.equal(t.op, 'set'); assert.equal(t.data.status, 'done');
    assert.ok(plan.ops.some(o => o.collection === 'overrides' && o.doc_id === 'i1' && o.op === 'update' && o.data.migratedAt));
    assert.ok(plan.ops.some(o => o.collection === 'events' && o.doc_id === 'infratech-2027'));
    assert.equal(plan.ops.length, 3);
  });
  test('leads → mkt_leads; leads/counts bleibt unberührt', () => {
    const plan = C.planMigration({ target: { leads: [{ _id: 'counts', days: {} }, { _id: 'l1', organisation: 'Stadt X', stage: 'neu' }] } });
    assert.ok(plan.ops.some(o => o.collection === 'mkt_leads' && o.doc_id === 'l1' && o.data.organisation === 'Stadt X'));
    assert.ok(!plan.ops.some(o => o.doc_id === 'counts'));
    assert.ok(plan.ops.some(o => o.collection === 'leads' && o.doc_id === 'l1' && o.op === 'update' && o.data.migratedTo === 'mkt_leads/l1'));
  });
  test('Idempotenz: zweiter Lauf auf migriertem Stand schreibt nichts', () => {
    const first = C.planMigration({ target: { overrides: [{ _id: 'i1', status: 'done' }], leads: [{ _id: 'l1', organisation: 'O' }] } }, { nowIso: 'X' });
    const target2 = { overrides: [{ _id: 'i1', status: 'done', migratedAt: 'X' }], tasks: [{ _id: 'i1', id: 'i1', status: 'done' }], leads: [{ _id: 'l1', organisation: 'O', migratedTo: 'mkt_leads/l1' }], mkt_leads: [first.ops.find(o => o.collection === 'mkt_leads').data] };
    assert.equal(C.planMigration({ target: target2 }).ops.length, 0);
  });
  test('Vorhandene Aufgabenfelder werden nie überschrieben', () => {
    const plan = C.planMigration({ target: { overrides: [{ _id: 's1', status: 'done', note: 'alt' }], tasks: [{ _id: 's1', status: 'in_progress', note: '' }] } });
    const op = plan.ops.find(o => o.collection === 'tasks');
    assert.equal(op.op, 'update'); eq(Object.keys(op.data).sort(), ['note', 'updatedAt']);
  });
  test('A3-Erfassung: keine Personennamen, Status-Mapping', () => {
    const plan = C.planMigration({ target: {}, sources: { a3: { erfassung: [{ _id: 'x 1', status: 'zurueckgestellt', verantwortlich: 'Max Muster', frist: '2026-11-01', budget: '500', beschluss: 'GL ok' }] } } });
    const op = plan.ops[0];
    assert.equal(op.doc_id, 'a3-x_1'); assert.equal(op.data.status, 'deferred'); assert.equal(op.data.due, '2026-11-01');
    assert.ok(!JSON.stringify(op.data).includes('Max Muster'));
  });
  test('Konflikt: abweichender Zielstand bleibt, wird gemeldet', () => {
    const plan = C.planMigration({ target: { events: [{ _id: 'e1', title: 'Neu' }] }, sources: { a2: { events: [{ _id: 'e1', title: 'Alt' }] } } });
    assert.equal(plan.ops.length, 0); assert.equal(plan.conflicts.length, 1);
  });
  test('chunk: Pakete ≤ 50', () => {
    const b = C.chunk(Array.from({ length: 120 }, (_, i) => i), 50);
    eq(b.map(x => x.length), [50, 50, 20]);
  });
});

describe('Notion-Normalisierung', () => {
  test('Escapes, Markdown-Links, Checkboxen', () => {
    const [a] = C.normPlanRows('ap', [{ AP: 'AP0', Name: 'Messe', Top: '__YES__', 'Rechtsprüfung': '__NO__', Balken: '1-3 A\\|4-8 B\\~', Sortierung: 0 }]);
    assert.equal(a.Top, true); assert.equal(a['Rechtsprüfung'], false); assert.equal(a.Balken, '1-3 A|4-8 B~');
    const [m] = C.normPlanRows('ms', [{ Meilenstein: 'X', Details: 'an [info@infratech.nl](mailto:info@infratech.nl)', Messetag: '__YES__' }]);
    assert.equal(m.details, 'an info@infratech.nl'); assert.equal(m.messe, true);
    eq(C.normPlanRows('unbekannt', [{}]), []);
  });
});
