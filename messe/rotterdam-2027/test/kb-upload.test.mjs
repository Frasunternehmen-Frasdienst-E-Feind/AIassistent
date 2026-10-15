// Wissens-Upload M1 (konzepte/wissens-upload.md, Prototyp vom 06.10.2026): reine Logik in kb-logic.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './load-module.mjs';

const K = loadModule('kb-logic.js');

test('Neue Fassung: bisheriger Stand vorn in versions, rev steigt', () => {
  const it = { name: 'Plan_v1.pdf', sha256: 'aaa', size: 100, assetId: 'A1', rev: 0 };
  const v = K.versionPush(it, 1000, 'u1');
  assert.equal(v.rev, 1);
  assert.deepEqual(v.versions, [{ at: 1000, by: 'u1', name: 'Plan_v1.pdf', sha256: 'aaa', size: 100, assetId: 'A1' }]);
  assert.deepEqual(v.dropped, []);
  const v2 = K.versionPush(Object.assign({}, it, { name: 'Plan_v2.pdf', assetId: 'A2', versions: v.versions, rev: v.rev }), 2000, 'u1');
  assert.equal(v2.rev, 2);
  assert.deepEqual(v2.versions.map(x => x.name), ['Plan_v2.pdf', 'Plan_v1.pdf']);
});

test('Höchstens 10 Fassungen; herausfallende Assets werden zum Löschen gemeldet', () => {
  const versions = Array.from({ length: 10 }, (_, i) => ({ at: i, name: 'v' + i, assetId: i === 9 ? 'ALT' : undefined }));
  const v = K.versionPush({ name: 'neu', assetId: 'N', versions, rev: 10 }, 99, null);
  assert.equal(v.versions.length, K.MAX_VERSIONS);
  assert.equal(v.versions[0].name, 'neu');
  assert.deepEqual(v.dropped, ['ALT']);
});

test('Ohne Asset kein assetId-Feld in der Fassung', () => {
  const v = K.versionPush({ name: 'zu-gross.pdf', size: 3e7 }, 1, null);
  assert.equal('assetId' in v.versions[0], false);
});

test('Sperre: fremde frische Sperre weist ab, abgelaufene darf übernommen werden', () => {
  const now = 100 * 60000;
  assert.equal(K.lockFree({}, 's1', now), true);
  assert.equal(K.lockFree({ lock: { by: 's1', at: now } }, 's1', now), true);
  assert.equal(K.lockFree({ lock: { by: 's2', at: now - 60000 } }, 's1', now), false);
  assert.equal(K.lockFree({ lock: { by: 's2', at: now - K.LOCK_MS } }, 's1', now), true);
});

test('Abgebrochener Lauf (in Arbeit, Sperre abgelaufen) wartet wieder', () => {
  const now = 100 * 60000;
  assert.equal(K.stale({ status: 'in_arbeit', lock: { by: 's2', at: now - K.LOCK_MS - 1 } }, now), true);
  assert.equal(K.stale({ status: 'in_arbeit', lock: { by: 's2', at: now - 1000 } }, now), false);
  assert.equal(K.stale({ status: 'neu', lock: null }, now), false);
});

test('Ergebnis zur alten Fassung oder zu gelöschtem Eintrag wird verworfen', () => {
  assert.equal(K.resultFresh({ rev: 2 }, 2), true);
  assert.equal(K.resultFresh({}, 0), true);
  assert.equal(K.resultFresh({ rev: 3 }, 2), false);
  assert.equal(K.resultFresh(null, 0), false);
});

test('Löschen: Rückverweise in anderen Einträgen werden entfernt', () => {
  const items = [
    { id: 'a', related: [{ id: 'x', score: 3 }, { id: 'b', score: 2 }] },
    { id: 'b', related: [{ id: 'c', score: 1 }] },
    { id: 'x', related: [{ id: 'a', score: 3 }] }
  ];
  assert.deepEqual(K.unlinkRelated(items, 'x'), [{ id: 'a', related: [{ id: 'b', score: 2 }] }]);
  assert.deepEqual(K.unlinkRelated(items, 'zzz'), []);
});

test('OCR: höchstens 20 Seiten, der Rest wird gemeldet; Scan-Erkennung', () => {
  assert.deepEqual(K.ocrPlan(5), { pages: 5, rest: 0 });
  assert.deepEqual(K.ocrPlan(37), { pages: 20, rest: 17 });
  assert.deepEqual(K.ocrPlan(undefined), { pages: 0, rest: 0 });
  assert.equal(K.needsOcr('', 3), true);
  assert.equal(K.needsOcr('Seite 1  2  3', 3), true);
  assert.equal(K.needsOcr('x'.repeat(200), 3), false);
});
