import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './load-module.mjs';

const C = loadModule('config.js');

test('Konfiguration: Kachelanbieter bleibt beim Bereinigen erhalten', () => {
  const m = C.merge({ mapTiles: { name: 'MapTiler', url: 'https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=abc', attribution: '© MapTiler', privacyUrl: 'https://www.maptiler.com/privacy-policy/', fremd: 1 } });
  assert.deepEqual(m.mapTiles, { name: 'MapTiler', url: 'https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=abc', attribution: '© MapTiler', privacyUrl: 'https://www.maptiler.com/privacy-policy/' });
});

test('Konfiguration: ohne Kachel-URL gibt es keinen eigenen Anbieter', () => {
  assert.equal(C.merge({}).mapTiles, null);
  assert.equal(C.merge({ mapTiles: { name: 'X', url: '  ' } }).mapTiles, null);
});

test('Konfiguration: Anbieterwechsel zählt als Änderung', () => {
  assert.equal(C.same({}, { mapTiles: { url: 'https://t.example.eu/{z}/{x}/{y}.png' } }), false);
});
