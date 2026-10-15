import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModule, HUB } from './load-module.mjs';

const L = loadModule('hub-logic.js', HUB);

test('Hub: Startbefüllung schreibt nur fehlende Dokumente, nie vorhandene', () => {
  const seed = { hotels: [{ id: 'ibis', name: 'ibis' }, { id: 'nhow', name: 'nhow' }], stand: [{ id: 'info', nummer: '5.209' }] };
  const plan = L.seedPlan(new Set(['hotels/ibis']), seed);
  assert.deepEqual(plan.map(p => p.path), ['hotels/nhow', 'stand/info']);
  assert.equal(plan[0].data.id, undefined, 'id steckt im Pfad, nicht im Dokument');
  assert.deepEqual(L.seedPlan(new Set(['hotels/ibis', 'hotels/nhow', 'stand/info']), seed), []);
});

test('Hub: Speicher gewinnt gegen Momentaufnahme, Momentaufnahme füllt Lücken', () => {
  const seed = [{ id: 'a', status: 'offen', title: 'A' }, { id: 'b', status: 'offen' }];
  const out = L.mergeById(seed, { a: { status: 'favorit' }, c: { title: 'neu' } });
  assert.deepEqual(out, [{ id: 'a', status: 'favorit', title: 'A' }, { id: 'b', status: 'offen' }, { id: 'c', title: 'neu' }]);
});

test('Hub: Fristen-Ampel nach Resttagen', () => {
  const heute = '2026-10-14';
  assert.equal(L.ampel('2026-10-13', heute).stufe, 'ueberfaellig');
  assert.equal(L.ampel('2026-10-14', heute).tage, 0);
  assert.equal(L.ampel('2026-10-28', heute).stufe, 'dringend');
  assert.equal(L.ampel('2026-10-29', heute).stufe, 'geplant');
  assert.equal(L.ampel('2026-11-15', heute).tage, 32);
});

test('Hub: Giveaway-Stufen zählen nur aktive Ideen', () => {
  const n = L.stufen([{ tier: 'A' }, { tier: 'A', status: 'verworfen' }, { tier: 'B' }, { tier: 'P', status: 'favorit' }]);
  assert.deepEqual(n, { A: 1, B: 1, C: 0, P: 1 });
});

test('Hub: Momentaufnahme ist vollständig und frei von Personendaten', () => {
  const html = readFileSync(HUB, 'utf8');
  const seed = JSON.parse(html.match(/<script type="application\/json" id="seed">([\s\S]*?)<\/script>/)[1]);
  assert.equal(seed.hotels.length, 11);
  assert.equal(seed.giveaways.length, 24);
  assert.ok(seed.fristen.every(f => /^\d{4}-\d{2}-\d{2}$/.test(f.datum)));
  assert.equal(seed.stand[0].nummer, '5.209');
  assert.doesNotMatch(JSON.stringify(seed), /@(?!infratech\.nl)[a-z0-9-]+\.[a-z]/i, 'keine E-Mail-Adressen');
});

test('Hub: CI – keine Hex-Farben außerhalb des Token-Blocks', () => {
  const html = readFileSync(HUB, 'utf8');
  const ohneTokens = html.replace(/\/\* tokens:start[^*]*\*\/[\s\S]*?\/\* tokens:end \*\//, '').replace(/<meta name="theme-color"[^>]*>/g, '');
  assert.doesNotMatch(ohneTokens, /#[0-9a-f]{6}\b/i);
});
