// Unit-Tests: Icon-Basis 2.0 „Fräskante“ (A1). Prüft Aufbau, CI-Treue und Einbettung ins Artefakt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const I = require('../src/icons.js');

const GROUPS = ['Branche', 'Messe', 'Status', 'Priorität', 'Flag', 'Rolle', 'UI'];

// Sehr kleine Tag-Prüfung: jedes Element ist selbstschließend oder <g> mit Gegenstück.
function wellFormed(svg) {
  const tags = svg.match(/<\/?[a-z]+[^>]*>/g) || [];
  let g = 0;
  for (const t of tags) {
    if (/^<g[\s>]/.test(t)) g++;
    else if (t === '</g>') g--;
    else assert.ok(/\/>$/.test(t), 'Element nicht selbstschließend: ' + t);
    assert.ok(g >= 0, 'schließendes </g> ohne Anfang');
  }
  assert.equal(g, 0, '<g> nicht geschlossen');
  assert.equal((svg.match(/"/g) || []).length % 2, 0, 'Anführungszeichen unpaarig');
}

test('Alle Icons haben Gruppe, Titel, Zweck und eine Zeichnung', () => {
  assert.equal(I.VERSION, '2.0');
  assert.equal(I.ORDER.length, 108);
  for (const id of I.ORDER) {
    const [g, title, use, svg] = I.DEFS[id];
    assert.ok(GROUPS.includes(g), id + ': unbekannte Gruppe ' + g);
    assert.ok(title && use, id + ': Titel/Zweck fehlt');
    assert.ok(svg.length > 10, id + ': Zeichnung fehlt');
  }
  assert.equal(new Set(I.ORDER).size, I.ORDER.length);
});

test('Zeichnungen sind wohlgeformt (24er und 48er)', () => {
  for (const id of I.ORDER) {
    wellFormed(I.DEFS[id][3]);
    if (I.hasDetail(id)) wellFormed(I.DEFS[id][4]);
  }
});

test('Keine festen Farbwerte: nur currentColor und --ic-accent (CI-Token)', () => {
  for (const id of I.ORDER) for (const svg of [I.DEFS[id][3], I.DEFS[id][4] || '']) {
    assert.ok(!/#[0-9a-f]{3,8}\b/i.test(svg), id + ': fester Farbwert');
    assert.ok(!/\b(red|green|blue|black|white|rgb\()/i.test(svg), id + ': Farbname im Markup');
    for (const m of svg.matchAll(/(?:fill|stroke)\s*[:=]\s*"?([^;"/]+(?:\([^)]*\))?)/g)) {
      const v = m[1].trim();
      assert.ok(/^(none|currentColor|var\(--ic-accent,(none|currentColor)\))$/.test(v), id + ': unerlaubter Farbwert ' + v);
    }
  }
});

test('Detailfassungen: 18 Stück, jeweils zum Icon passend, Branche vollständig', () => {
  assert.equal(I.DETAIL.length, 18);
  for (const id of I.ORDER.filter(x => I.DEFS[x][0] === 'Branche')) assert.ok(I.hasDetail(id), id + ' ohne Detailfassung');
  for (const id of ['messestand', 'pokal', 'leer']) assert.ok(I.hasDetail(id));
});

test('Sprite und Einzel-SVG: Detailfassung erst ab 40 px', () => {
  const sp = I.sprite();
  for (const id of I.ORDER) assert.ok(sp.includes('id="i-' + id + '"'), id + ' fehlt im Sprite');
  for (const id of I.DETAIL) assert.ok(sp.includes('id="ih-' + id + '" viewBox="0 0 48 48"'));
  assert.ok(I.standalone('fraese', 24, '#84bb20').includes('viewBox="0 0 24 24"'));
  assert.ok(I.standalone('fraese', 64, '#84bb20').includes('viewBox="0 0 48 48"'));
  assert.ok(I.standalone('check', 64, '#84bb20').includes('viewBox="0 0 24 24"'), 'ohne Detailfassung bleibt 24er');
});

test('Status-Icons unterscheiden sich in der Form, nicht nur in der Farbe', () => {
  const forms = ['st-open', 'st-progress', 'st-blocked', 'st-deferred', 'st-done'].map(id => I.DEFS[id][3]);
  assert.equal(new Set(forms).size, 5);
});

test('Artefakt enthält genau diesen Modulstand', () => {
  const html = readFileSync(new URL('../Feind-Cockpit-A1.html', import.meta.url), 'utf8');
  const src = readFileSync(new URL('../src/icons.js', import.meta.url), 'utf8').trim();
  assert.ok(html.includes(src), 'icons.js weicht vom Artefakt ab');
});
