import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './load-module.mjs';

const G = loadModule('geo-logic.js');

test('Farbklassen: ohne Ausschreibungen gibt es nur die Klasse „keine“', () => {
  const c = G.classes([0, 0, 0]);
  assert.equal(c.classOf(0), 0);
  assert.deepEqual(c.legend.map(l => l.label), ['keine']);
});

test('Farbklassen: kleine Anzahlen bekommen je eine eigene Stufe', () => {
  const c = G.classes([0, 1, 2, 3]);
  assert.deepEqual(c.legend.map(l => l.label), ['keine', '1', '2', '3']);
  assert.deepEqual([0, 1, 2, 3].map(c.classOf), [0, 1, 2, 3]);
});

test('Farbklassen: größere Spannweite wird auf höchstens vier Stufen verteilt', () => {
  const c = G.classes([0, 1, 4, 10]);
  assert.deepEqual(c.legend.map(l => l.label), ['keine', '1–2', '3–5', '6–7', '8–10']);
  assert.equal(c.classOf(1), 1);
  assert.equal(c.classOf(5), 2);
  assert.equal(c.classOf(7), 3);
  assert.equal(c.classOf(10), 4);
  assert.equal(c.classOf(99), 4);
});

test('Farbklassen: Deckkraft steigt monoton, „keine“ bleibt leer', () => {
  const c = G.classes([0, 1, 4, 10]);
  const op = c.legend.map(l => l.opacity);
  assert.equal(op[0], 0);
  for (let i = 1; i < op.length; i++) assert.ok(op[i] > op[i - 1], `Stufe ${i} kräftiger als ${i - 1}`);
});

const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

test('Anbieter: ohne Konfiguration gilt OpenStreetMap, als Testbetrieb gekennzeichnet', () => {
  const p = G.provider(null);
  assert.equal(p.url, OSM_URL);
  assert.equal(p.host, 'tile.openstreetmap.org');
  assert.equal(p.testOnly, true);
  assert.match(p.attributionHtml, /© <a href="https:\/\/www\.openstreetmap\.org\/copyright"[^>]*>OpenStreetMap-Mitwirkende<\/a>/);
});

test('Anbieter: EU-Anbieter aus der Konfiguration wird übernommen', () => {
  const p = G.provider({ name: 'MapTiler', url: 'https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=abc', attribution: '© MapTiler', privacyUrl: 'https://www.maptiler.com/privacy-policy/' });
  assert.equal(p.name, 'MapTiler');
  assert.equal(p.host, 'api.maptiler.com');
  assert.equal(p.testOnly, false);
  assert.equal(p.privacyUrl, 'https://www.maptiler.com/privacy-policy/');
});

test('Anbieter: OSM-Namensnennung ist Pflicht und wird ergänzt, wenn sie fehlt', () => {
  const p = G.provider({ name: 'X', url: 'https://tiles.example.eu/{z}/{x}/{y}.png', attribution: '© Example' });
  assert.match(p.attributionHtml, /OpenStreetMap-Mitwirkende/);
  assert.match(p.attributionHtml, /© Example/);
});

test('Anbieter: Namensnennung aus der Konfiguration wird als Text behandelt, nicht als HTML', () => {
  const p = G.provider({ name: 'X', url: 'https://tiles.example.eu/{z}/{x}/{y}.png', attribution: '<img src=x onerror=alert(1)> OpenStreetMap' });
  assert.doesNotMatch(p.attributionHtml, /<img/);
  assert.match(p.attributionHtml, /&lt;img/);
});

test('Anbieter: unsichere oder unvollständige URL fällt auf OSM zurück und meldet den Grund', () => {
  for (const url of ['http://tiles.example.eu/{z}/{x}/{y}.png', 'https://tiles.example.eu/tiles.png', 'javascript:alert(1)']) {
    const p = G.provider({ name: 'X', url });
    assert.equal(p.url, OSM_URL, url);
    assert.ok(p.error, url);
  }
});

const HOST = 'tile.openstreetmap.org';

test('Einwilligung: ohne gespeicherten Stand ist nichts erteilt und die Straßenkarte aus', () => {
  assert.deepEqual(G.consent.read(null, HOST), { granted: false, on: false });
});

test('Einwilligung: alter Schalter „1“ aus Version 3 gilt nicht als Einwilligung', () => {
  assert.deepEqual(G.consent.read('1', HOST), { granted: false, on: false });
});

test('Einwilligung: erteilt für einen Anbieter schaltet die Straßenkarte ein', () => {
  const raw = G.consent.grant(HOST, '2026-10-01T10:00:00Z');
  assert.deepEqual(G.consent.read(raw, HOST), { granted: true, on: true });
});

test('Einwilligung: gilt nur für den Anbieter, dem sie erteilt wurde', () => {
  const raw = G.consent.grant(HOST, '2026-10-01T10:00:00Z');
  assert.deepEqual(G.consent.read(raw, 'api.maptiler.com'), { granted: false, on: false });
});

test('Einwilligung: Ausschalten behält die Einwilligung, Einschalten braucht keine neue', () => {
  const off = G.consent.setOn(G.consent.grant(HOST, '2026-10-01T10:00:00Z'), false);
  assert.deepEqual(G.consent.read(off, HOST), { granted: true, on: false });
  assert.deepEqual(G.consent.read(G.consent.setOn(off, true), HOST), { granted: true, on: true });
});

test('Einwilligung: ohne Einwilligung lässt sich die Straßenkarte nicht einschalten', () => {
  assert.deepEqual(G.consent.read(G.consent.setOn(null, true), HOST), { granted: false, on: false });
});

test('Einwilligung: beschädigter Speicherstand gilt als nicht erteilt', () => {
  assert.deepEqual(G.consent.read('{kaputt', HOST), { granted: false, on: false });
});

test('Anbieter: dokumentierter EU-Endpunkt wird erkannt, andere Hosts nicht', () => {
  assert.equal(G.provider({ url: 'https://tiles-eu.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=k' }).eu, true);
  assert.equal(G.provider({ url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=k' }).eu, false);
  assert.equal(G.provider(null).eu, false);
});

test('Vorlage Stadia EU: gültige URL mit EU-Host, Namensnennung und Datenschutz-Link', () => {
  const x = G.presets().find(q => q.id === 'stadia-eu');
  assert.ok(x);
  const p = G.provider(Object.assign({}, x, { url: x.url + 'abc123' }));
  assert.equal(p.error, '');
  assert.equal(p.host, 'tiles-eu.stadiamaps.com');
  assert.equal(p.eu, true);
  assert.equal(p.warning, '');
  assert.match(p.attributionHtml, /OpenStreetMap-Mitwirkende/);
  assert.match(p.attributionHtml, /© Stadia Maps © OpenMapTiles/);
  assert.match(p.privacyUrl, /^https:\/\/stadiamaps\.com\//);
});

test('Anbieter: leerer API-Key in der URL ergibt eine Warnung, kein Rückfall', () => {
  const x = G.presets()[0];
  const p = G.provider(x);
  assert.equal(p.testOnly, false);
  assert.match(p.warning, /API-Key fehlt/);
  assert.equal(G.provider({ url: 'https://t.example.eu/{z}/{x}/{y}.png?key=&style=a' }).warning !== '', true);
  assert.equal(G.provider({ url: 'https://t.example.eu/{z}/{x}/{y}.png?key=abc' }).warning, '');
});

test('Vorlagen: Änderungen an der Rückgabe verändern die Vorlage nicht', () => {
  G.presets()[0].url = 'https://evil.example/{z}/{x}/{y}.png';
  assert.match(G.presets()[0].url, /^https:\/\/tiles-eu\.stadiamaps\.com\//);
});
