const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const P = require('../arbeitszeitkonto/pruefung.js');

const dir = path.join(__dirname, '..', 'arbeitszeitkonto');
const w = (start, end) => ({ start, end, kind: 'work' });
const p = (start, end) => ({ start, end, kind: 'pause' });

test('Block über 6 h: kurze Pausen unter 15 Minuten unterbrechen nicht', () => {
  const r = P.check([w('06:48', '13:20'), p('13:20', '13:24'), w('13:24', '14:59')]);
  assert.equal(r.longBlocks.length, 1);
  assert.deepEqual(r.longBlocks[0], { start: '06:48', end: '14:59', min: 491 });
});

test('Ruhepause ab 15 Minuten trennt die Blöcke', () => {
  const r = P.check([w('06:58', '10:27'), p('10:27', '10:50'), w('10:50', '16:53')]);
  assert.equal(r.longBlocks.length, 1);   // 10:50–16:53 = 6:03
  assert.equal(r.longBlocks[0].start, '10:50');
  const ok = P.check([w('07:00', '12:00'), p('12:00', '12:30'), w('12:30', '16:00')]);
  assert.equal(ok.longBlocks.length, 0);
  assert.equal(ok.any, false);
});

test('Genau 6 h am Stück ist zulässig', () => {
  assert.equal(P.check([w('07:00', '13:00')]).longBlocks.length, 0);
  assert.equal(P.check([w('07:00', '13:01')]).longBlocks.length, 1);
});

test('Ungewöhnlich lange Pause über 2 h', () => {
  const r = P.check([w('06:42', '10:23'), p('10:23', '13:00'), w('13:00', '15:36')]);
  assert.deepEqual(r.longPauses, [{ start: '10:23', end: '13:00', min: 157 }]);
  assert.equal(P.check([w('07:00', '10:00'), p('10:00', '12:00'), w('12:00', '13:00')]).longPauses.length, 0);
});

test('Überschneidung und Ende vor Beginn', () => {
  const r = P.check([w('07:00', '12:00'), p('11:30', '12:10'), w('15:00', '14:00')]);
  assert.equal(r.overlaps.length, 1);
  assert.equal(r.overlaps[0].a, '07:00–12:00');
  assert.equal(r.endBeforeStart.length, 1);
  assert.equal(r.any, true);
});

test('Offene Buchung bleibt ohne Befund, Brutto dann unbekannt', () => {
  const books = [w('06:48', '14:37'), p('14:37', '14:57'), w('14:57', null)];
  assert.equal(P.check(books).overlaps.length, 0);
  assert.equal(P.brutto(books), null);
  assert.equal(P.brutto([w('07:00', '12:00'), p('12:00', '12:30'), w('12:30', '16:00')]), 540);
  assert.equal(P.brutto([]), 0);
});

test('Laufender Timer zählt offene Arbeit bis jetzt, Pausen nicht', () => {
  const books = [w('07:00', '09:00'), p('09:00', '09:15'), w('09:15', null)];
  const now = (10 * 60 + 15) * 60 + 30;   // 10:15:30
  assert.equal(P.liveSeconds(books, now), 2 * 3600 + 3600 + 30);
  assert.equal(P.liveSeconds([w('07:00', null)], 6 * 3600), 0);   // Start in der Zukunft
});

test('index.html bettet pruefung.js unverändert ein', () => {
  const mod = fs.readFileSync(path.join(dir, 'pruefung.js'), 'utf8');
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const cut = (s) => s.slice(s.indexOf('/* <pruefung.js>'), s.indexOf('/* </pruefung.js> */'));
  assert.ok(cut(html).length > 100, 'Marker in index.html fehlen');
  assert.equal(cut(html), cut(mod));
});

test('settingsDoc() schreibt alle Felder aus CLAUDE.md', () => {
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const fn = /function settingsDoc\(\) \{([\s\S]*?)\n  \}/.exec(html)[1];
  ['weekHours', 'workdays', 'seeded', 'vacation', 'gleittag', 'autoIn'].forEach((k) => assert.match(fn, new RegExp(k + ':')));
});

test('Theme: beide Farbschemata, Primär-Button mit on-accent-strong, keine Daten Dritter', () => {
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  assert.match(html, /@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme="light"\]\)/);
  assert.match(html, /:root\[data-theme="dark"\]/);
  assert.match(html, /button\.primary \{[^}]*color: var\(--on-accent-strong\)/);
  const pnr = html.match(/PNR=\d{3,}|Personalnummer \d+/g) || [];
  pnr.forEach((m) => assert.match(m, /1626$/));
});

test('Notfall-Datenstand beginnt am Eintrittsdatum und deckt sich mit seed-data.js', () => {
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const embed = JSON.parse(/var EMBED_DAYS = (\[.*?\]);\n/.exec(html)[1]);
  assert.equal(embed[0].date, '2026-08-17');
  const seed = require('../seed-data.js').bookings().filter((b) => b.date <= '2026-08-18');
  const flat = embed.filter((d) => d.date <= '2026-08-18')
    .flatMap((d) => d.books.map((b) => d.date + ' ' + b.start + '-' + b.end));
  seed.forEach((b) => assert.ok(flat.includes(b.date + ' ' + b.start + '-' + b.end), 'fehlt: ' + b.date + ' ' + b.start));
});
