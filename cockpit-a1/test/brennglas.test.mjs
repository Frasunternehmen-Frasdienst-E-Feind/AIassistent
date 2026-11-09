// Unit-Tests: Brennglas-PDF im Cockpit A1 (brennglas.js aus dem Live-Stand, ausgeführt mit jsPDF 4.2.1 aus node_modules).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const SRC = readFileSync(new URL('../src/brennglas.js', import.meta.url), 'utf8');

// Modul wie im Browser laden: window.FC, jsPDF bereits vorhanden (kein Nachladen von cdnjs).
function load() {
  const window = { FC: { helpers: { fmtD: () => '01.10.2026' } }, jspdf: require('jspdf') };
  vm.runInNewContext(SRC, { window, console });
  return window.FC.brennglas;
}

test('jsPDF wird in Version 4.2.1 mit SRI-Hash geladen, der zur Datei passt', () => {
  assert.match(SRC, /cdnjs\.cloudflare\.com\/ajax\/libs\/jspdf\/4\.2\.1\/jspdf\.umd\.min\.js/);
  assert.match(SRC, /sc\.integrity = SRI/);
  assert.match(SRC, /sc\.crossOrigin = 'anonymous'/);
  const sri = /const SRI = '(sha512-[^']+)'/.exec(SRC)[1];
  const file = readFileSync(require.resolve('jspdf/dist/jspdf.umd.min.js'));
  assert.equal(sri, 'sha512-' + createHash('sha512').update(file).digest('base64'));
  assert.equal(require('jspdf/package.json').version, '4.2.1');
});

test('PDF-Farben entsprechen den CI-Tokens (hell)', () => {
  const tok = JSON.parse(readFileSync(new URL('../../branding/feind-ci.tokens.json', import.meta.url), 'utf8')).tokens.light;
  const C = /const C = (\{[^}]+\})/.exec(SRC)[1];
  for (const [key, token] of [['green', 'accent'], ['anth', 'ink-strong'], ['red', 'signal'], ['sig', 'signal-text'], ['text', 'ink'], ['muted', 'ink-muted'], ['line', 'line'], ['area', 'surface-muted']]) {
    assert.match(C, new RegExp(key + ": '" + tok[token] + "'", 'i'), key + ' ≠ ' + token);
  }
});

test('Datenschutz: E-Mail, Telefon und Vorname werden entfernt, Sonderzeichen ersetzt', () => {
  const B = load();
  assert.equal(B.scrub('Mail an info@infratech.nl'), 'Mail an [E-Mail entfernt]');
  assert.match(B.scrub('Tel. 0351 123456'), /\[Telefon entfernt\]/);
  assert.equal(B.scrub('David · GL'), 'Marketing · GL');
  assert.equal(B.txt('≥ 300 → ok ✓'), 'mind. 300 > ok x');
  assert.equal(B.win('漢x'), 'x');
});

test('build: ausfüllbares A4-PDF mit Feldern, Tabelle und Druckfassung', async () => {
  const B = load();
  const rows = Array.from({ length: 40 }, (_, i) => [{ check: 'Erledigt_' + i }, { t: 'Aufgabe ' + i, sub: 'P0 · Marketing & Event' }, { field: 'Notiz_' + i }]);
  const spec = { name: 'Test', subtitle: 'Datenstand 01.10.2026', kpis: [{ v: '12', k: 'offen' }, { v: '3', k: 'überfällig', signal: true }],
    blocks: [{ h: 'Aufgaben' }, { table: { cols: [{ t: 'Erl.', w: 12, align: 'center' }, { t: 'Aufgabe' }, { t: 'Notiz', w: 60 }], rows } }, { bullets: ['Rechtliches: Bitte Rechtsabteilung prüfen.'] }] };
  const out = await B.build(spec);
  assert.ok(out.pages >= 2, 'mehrseitig');
  assert.ok(out.fields >= 80 + 5, 'Felder je Zeile plus Kopf und Abschluss');
  const head = Buffer.from(out.bytes).subarray(0, 5).toString();
  assert.equal(head, '%PDF-');
  const pr = await B.build(Object.assign({}, spec, { autoPrint: true }));
  // Druckfassung: autoPrint setzt eine OpenAction im (komprimierten) Katalog; die Datei unterscheidet sich daher.
  assert.equal(pr.pages, out.pages);
  assert.notEqual(Buffer.compare(Buffer.from(pr.bytes), Buffer.from(out.bytes)), 0);
});

test('Modul ist unverändert im Cockpit-HTML eingebettet', () => {
  const html = readFileSync(new URL('../Feind-Cockpit-A1.html', import.meta.url), 'utf8');
  assert.ok(html.includes(SRC.trimEnd()), 'brennglas.js weicht vom Artefakt ab');
});
