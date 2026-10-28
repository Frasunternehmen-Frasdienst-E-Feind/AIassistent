// Unit-Tests: KPI-Modul (ehemals KOMPASS KPI-Tracker) – Ist gegen Ziel.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const K = require('../src/kpi-logic.js');

test('Ziele aus dem Freitags-Review werden gelesen', () => {
  assert.deepEqual(K.parseTarget('≤ 1'), { dir: 'max', v: 1 });
  assert.deepEqual(K.parseTarget('0 Fälle'), { dir: 'max', v: 0 });
  assert.deepEqual(K.parseTarget('≥ 300'), { dir: 'min', v: 300 });
  assert.deepEqual(K.parseTarget('>= 2,5'), { dir: 'min', v: 2.5 });
  assert.equal(K.parseTarget('steigend'), null);
});

test('Zustand: offen ohne Ist, sonst erreicht oder verfehlt', () => {
  assert.equal(K.status({ ziel: '≤ 1', ist: null }), 'offen');
  assert.equal(K.status({ ziel: 'steigend', ist: 3 }), 'offen');
  assert.equal(K.status({ ziel: '≤ 1', ist: 1 }), 'erreicht');
  assert.equal(K.status({ ziel: '≤ 3', ist: '3,5' }), 'verfehlt');
  assert.equal(K.status({ ziel: '0 Fälle', ist: 0 }), 'erreicht');
  assert.equal(K.status({ ziel: '≥ 300', ist: 299 }), 'verfehlt');
});

test('Artefakt enthält genau diese Modulstände', () => {
  const html = readFileSync(new URL('../Feind-Cockpit-A1.html', import.meta.url), 'utf8');
  for (const f of ['kpi-logic.js', 'app-kpis.js']) {
    const src = readFileSync(new URL('../src/' + f, import.meta.url), 'utf8').trim();
    assert.ok(html.includes(src), f + ' weicht vom veröffentlichten Artefakt ab');
  }
});
