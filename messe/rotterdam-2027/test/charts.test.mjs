import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './load-module.mjs';
import { fakeDocument } from './fake-dom.mjs';

const C = loadModule('charts.js');
const doc = fakeDocument();
const o = extra => Object.assign({ doc, reducedMotion: true }, extra);
const cls = n => (n.attrs.class || '').split(/\s+/);

/* ---------- reine Rechenfunktionen ---------- */

test('Ringsegmente: Anteile vom Ziel, hintereinander, unter dem Ziel bleibt Rest frei', () => {
  const a = C.ringArcs([10, 20, 15], 90, 360);
  assert.deepEqual(a.map(x => x.len), [40, 80, 60]);
  assert.deepEqual(a.map(x => x.start), [0, 40, 120]);
});

test('Ringsegmente: über dem Ziel füllt die Summe den Ring, Verhältnis bleibt', () => {
  const a = C.ringArcs([60, 30, 30], 90, 360);
  assert.equal(a.reduce((s, x) => s + x.len, 0), 360);
  assert.equal(a[0].len, 180);
});

test('Stapel: gemeinsame Skala über alle Zeilen, Segmente schließen lückenlos an', () => {
  const lay = C.stackLayout([{ key: 'd1', values: { a: 2, b: 1, c: 1 } }, { key: 'd2', values: { a: 4, b: 2, c: 2 } }], ['a', 'b', 'c']);
  assert.equal(lay[1].segs[2].x1, 1);
  assert.equal(lay[0].segs[2].x1, 0.5);
  assert.equal(lay[0].segs[1].x0, lay[0].segs[0].x1);
  assert.deepEqual(lay.map(r => r.total), [4, 8]);
});

test('Top-N: höchstens n Kategorien, Rest als „Sonstiges“ in Hellgrau (Ton s3)', () => {
  const t = C.topN([1, 5, 3, 2, 4].map((v, i) => ({ key: 'k' + i, label: 'K' + i, value: v })), 3);
  assert.equal(t.length, 3);
  assert.deepEqual(t.map(x => x.value), [5, 4, 6]);
  assert.equal(t[2].label, 'Sonstiges');
  assert.equal(t[2].tone, 's3');
});

test('Töne: höchstens drei Serienfarben, eigener Ton hat Vorrang', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(i => C.toneOf({}, i)), ['s1', 's2', 's3', 's3', 's3']);
  assert.equal(C.toneOf({ tone: 'crit' }, 0), 'crit');
});

test('Wasserfall: laufende Summe, Summenposten als volle Säule', () => {
  const w = C.waterfallLayout([{ label: 'Planrahmen', value: 100, total: true }, { label: 'Stand', value: -40 }, { label: 'Reserve', value: -10 }, { label: 'Frei', total: true }]);
  assert.deepEqual(w.map(s => [s.kind, s.start, s.end]), [['total', 0, 100], ['down', 100, 60], ['down', 60, 50], ['total', 0, 50]]);
});

test('Trichter: Breite relativ zur größten Stufe, Umwandlung zur Vorstufe', () => {
  const f = C.funnelLayout([{ key: 'n', value: 40 }, { key: 'q', value: 20 }, { key: 'w', value: 5 }]);
  assert.deepEqual(f.map(s => s.w), [1, 0.5, 0.125]);
  assert.deepEqual(f.map(s => s.conv), [null, 50, 25]);
});

test('Zeitachse: Position zwischen Start und Ende, außerhalb wird an den Rand gesetzt', () => {
  const t = C.timelineLayout([{ date: '2027-01-12' }, { date: '2026-12-01' }, { date: '2027-03-01' }], '2026-12-01', '2027-01-15');
  assert.ok(t[0].t > 0.9 && t[0].t < 1);
  assert.equal(t[1].t, 0);
  assert.equal(t[2].t, 1);
  assert.equal(t[2].inside, false);
});

test('Achsen: runde Schritte und Maximum', () => {
  assert.equal(C.niceStep(23), 50);
  assert.equal(C.niceMax(73), 80);
  assert.equal(C.niceMax(0), 1);
});

/* ---------- Bausteine: Textalternative, Tabelle, Tokens, Tastatur ---------- */

test('Jeder Baustein hat role=img, aria-label und Textalternative und nutzt keine festen Farbwerte', () => {
  const all = [
    C.donut([{ key: 'a', label: 'offen', value: 3 }, { key: 'b', label: 'erledigt', value: 5 }], o({ title: 'Aufgaben' })),
    C.bars([{ key: 'x', label: 'Messe', value: 4 }], o()),
    C.stackedBars({ keys: [{ key: 'a', label: 'A' }], rows: [{ key: 'd', label: 'Tag 1', values: { a: 2 } }] }, o()),
    C.line([{ x: 'Jan', v: 2 }, { x: 'Feb', v: 3 }], o()),
    C.sparkline([1, 2, 3], o()),
    C.histogram([{ key: 't3', label: 'Top 3', value: 2 }], o()),
    C.timeline([{ date: '2026-11-01', label: 'Frist' }], o({ from: '2026-10-01', to: '2027-01-15' })),
    C.funnel([{ key: 'n', label: 'Neu', value: 4 }], o()),
    C.waterfall([{ label: 'Plan', value: 10, total: true }], o()),
    C.progressRing(40, o()),
    C.heatmap({ rows: ['A'], cols: ['KW1'], values: [[2]] }, o())
  ];
  for (const svg of all) {
    assert.equal(svg.getAttribute('role'), 'img');
    assert.ok(svg.getAttribute('aria-label').length > 5, svg.getAttribute('class'));
    // SVG-Diagramme: <title> zuerst; Balkenzeilen (HTML + SVG): Beschreibung als sr-only-Text.
    if (svg.tagName === 'svg') assert.equal(svg.children[0].tagName, 'title');
    else assert.ok(svg.byClass('sr-only').length && svg.byTag('svg').length, 'Balken als SVG, Text für Screenreader');
    const fixed = svg.all(n => /#[0-9a-f]{3,6}\b|rgb\(/i.test(Object.values(n.attrs).join(' ')));
    assert.deepEqual(fixed, [], 'Farben nur über Tokens/Klassen');
  }
});

test('Tabellen-Fallback: mit table: true kommen dieselben Werte als <details>-Tabelle', () => {
  const el = C.bars([{ key: 'a', label: 'Messe', value: 4 }, { key: 'b', label: 'Web', value: 2 }], o({ table: true, title: 'Leads nach Kanal' }));
  assert.equal(el.tagName, 'div');
  const det = el.byTag('details')[0];
  assert.ok(det);
  const cells = det.byTag('td').map(td => td.textContent);
  assert.deepEqual(cells, ['Messe', '4', 'Web', '2']);
});

test('Ring: Mittelwert, Segmente mit Ton-Klassen, Beschreibung nennt alle Teile und das Ziel', () => {
  const svg = C.progressRing({ value: 30, max: 75, segments: [{ key: 'a', label: 'A heiß', value: 12 }, { key: 'b', label: 'B warm', value: 10 }, { key: 'c', label: 'C Info', value: 8 }] }, o({ title: 'Tag 1', sub: 'von 75' }));
  assert.match(svg.getAttribute('aria-label'), /Tag 1: 30 von 75 \(A heiß 12, B warm 10, C Info 8\)/);
  assert.equal(svg.byClass('fc-center')[0].textContent, '30');
  const arcs = svg.byClass('fc-arc');
  assert.deepEqual(arcs.map(a => cls(a).find(c => c.startsWith('fc-k-'))), ['fc-k-s1', 'fc-k-s2', 'fc-k-s3']);
  assert.equal(svg.byClass('fc-arc-edge').length, 3, 'Kontur für helle Töne');
});

test('Donut: Segmente sind per Tastatur erreichbar und melden den Schlüssel', () => {
  const picked = [];
  const svg = C.donut([{ key: 'offen', label: 'offen', value: 3 }, { key: 'erledigt', label: 'erledigt', value: 5 }], o({ onSelect: k => picked.push(k), selected: 'offen' }));
  const segs = svg.byClass('fc-arc');
  assert.equal(segs[0].getAttribute('tabindex'), '0');
  assert.equal(segs[0].getAttribute('role'), 'button');
  assert.equal(segs[0].getAttribute('aria-pressed'), 'true');
  segs[1].dispatch('keydown', { key: 'Enter' });
  segs[1].dispatch('click', {});
  segs[1].dispatch('keydown', { key: 'a' });
  assert.deepEqual(picked, ['erledigt', 'erledigt']);
});

test('Balken: Zielmarke und Tagesmarker werden gezeichnet und beschriftet', () => {
  const svg = C.bars([{ key: 't', label: 'Leads', value: 120 }], o({ max: 300, target: 300, markers: [{ value: 40, label: 'Tag 1', short: 'T1' }, { value: 90, label: 'Tag 2', short: 'T2' }] }));
  assert.equal(svg.byClass('fc-target').length, 1);
  assert.equal(svg.byClass('fc-marker').length, 2);
  assert.deepEqual(svg.byClass('fc-hmark').map(t => t.textContent), ['T1', 'T2', 'Ziel 300']);
});

test('Gestapelte Balken: Summe je Zeile am Ende, leere Teile werden nicht gezeichnet', () => {
  const svg = C.stackedBars({ keys: [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }, { key: 'c', label: 'C' }], rows: [{ key: 'd1', label: 'Tag 1', values: { a: 3, b: 0, c: 2 } }] }, o());
  assert.equal(svg.byClass('fc-bar').length, 2);
  assert.equal(svg.byClass('fc-hval')[0].textContent, '5');
});

test('Ticker: ohne Bewegung steht sofort der Endwert', () => {
  const el = doc.createElement('span');
  C.ticker(el, 0, 42, { reducedMotion: true });
  assert.equal(el.textContent, '42');
});

test('Balkenzeilen: Klick und Enter auf eine Zeile melden den Schlüssel (Filter)', () => {
  const picked = [];
  const el = C.bars([{ key: 'sn', label: 'Sachsen', value: 3 }, { key: 'bb', label: 'Brandenburg', value: 5 }], o({ onSelect: k => picked.push(k), selected: 'bb' }));
  const rows = el.byClass('fc-hrow');
  assert.equal(rows[1].getAttribute('aria-pressed'), 'true');
  assert.equal(rows[0].getAttribute('tabindex'), '0');
  rows[0].dispatch('keydown', { key: ' ' });
  assert.deepEqual(picked, ['sn']);
});

test('Mehrfach aufrufbar ohne Seiteneffekt: gleiche Eingabe, gleiches Ergebnis', () => {
  const input = [{ key: 'a', label: 'A', value: 2 }, { key: 'b', label: 'B', value: 5 }];
  const copy = JSON.parse(JSON.stringify(input));
  const a = C.bars(input, o({ sort: 'desc' })), b = C.bars(input, o({ sort: 'desc' }));
  assert.deepEqual(input, copy, 'Eingabe bleibt unverändert');
  assert.equal(a.getAttribute('aria-label'), b.getAttribute('aria-label'));
});
