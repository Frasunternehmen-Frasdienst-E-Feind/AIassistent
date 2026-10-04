import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeTed, buildTedQuery, applyFilters } from '../src/ted.js';
import { parseBundRss } from '../src/bund.js';
import { prepareTenders, similarTitle } from '../src/prepare.js';
import { scrub, regionFromNuts } from '../src/common.js';

const fx = (f: string) => readFileSync(new URL('../../test/fixtures/' + f, import.meta.url), 'utf-8');

test('TED-Abfrage wird korrekt gebaut', () => {
  assert.equal(buildTedQuery({ cpv: ['45233220'], country: 'DEU', nuts: [], publishedFrom: '2026-09-01' }),
    'form-type IN (competition) AND classification-cpv IN (45233220) AND place-of-performance IN (DEU) AND publication-date>=20260901');
  assert.ok(!buildTedQuery({ cpv: [], country: 'DEU', nuts: [], publishedFrom: '2026-09-01', onlyCompetition: false }).includes('form-type'));
  assert.match(buildTedQuery({ cpv: [], country: 'DEU', nuts: ['DE4', 'DE8'], publishedFrom: '2026-09-01', publishedTo: '2026-09-30' }), /place-of-performance IN \(DE4 DE8\).*<=20260930/);
});

test('TED-Treffer werden normalisiert (Frist, Region, Titel, Link)', () => {
  const n = normalizeTed(JSON.parse(fx('ted.json')).notices[0]);
  assert.equal(n.noticeId, '600374-2026');
  assert.equal(n.deadline, '2026-10-02');
  assert.equal(n.publishedAt, '2026-09-01');
  assert.equal(n.region, 'Hessen');
  assert.ok(!n.title.startsWith('Deutschland'));
  assert.equal(n.url, 'https://ted.europa.eu/de/notice/-/detail/600374-2026');
  assert.ok(n.cpv.length > 0 && new Set(n.cpv).size === n.cpv.length);
});

test('service.bund.de-Feed wird gelesen, leere Frist bleibt null', () => {
  const list = parseBundRss(fx('bund.xml'));
  assert.ok(list.length >= 2);
  assert.equal(list[0].deadline, '2026-10-23');
  assert.equal(list[0].region, '19059 Schwerin');
  assert.ok(list[0].authority.includes('Landesrechnungshof'));
  assert.ok(!list[0].url.includes('#'));
  assert.equal(list[1].deadline, null);
});

test('RSS: numerische Entities werden dekodiert', () => {
  const x = '<rss><channel><item><title>Asphaltoberbau auf Stra&#223;en</title><link>https://www.service.bund.de/a/1.html</link><description><![CDATA[Vergabestelle: <strong>Landesbetrieb Stra&#223;enbau</strong>]]></description><pubDate>Wed, 30 Sep 2026 10:00:00 +0200</pubDate></item></channel></rss>';
  const [n] = parseBundRss(x);
  assert.equal(n.title, 'Asphaltoberbau auf Straßen');
  assert.equal(n.authority, 'Landesbetrieb Straßenbau');
});

test('TED: Teilnahmefrist als Rückfall', () => {
  const n = normalizeTed({ 'publication-number': '1-2026', 'deadline-receipt-request-date-lot': ['2026-11-05+01:00'] });
  assert.equal(n.deadline, '2026-11-05');
});

test('Datenschutz: E-Mail und Telefon werden entfernt', () => {
  assert.equal(scrub('Stadt X, info@stadt-x.de, Tel. 0351 123456'), 'Stadt X, [entfernt], [entfernt]');
});

test('NUTS → Bundesland', () => { assert.equal(regionFromNuts(['DE40E', 'DE803']), 'Brandenburg, Mecklenburg-Vorpommern'); });

test('Filter: abgelaufene Fristen und Stichworte', () => {
  const base = { source: 'ted' as const, noticeId: '1-2026', authority: '', cpv: [], nuts: [], region: '', publishedAt: null, url: 'u', noticeType: '' };
  const l = [{ ...base, title: 'Asphalt fräsen B96', deadline: '2026-10-10' }, { ...base, title: 'Netzwerk', deadline: '2026-10-10' }, { ...base, title: 'Fräsen alt', deadline: '2026-09-01' }];
  assert.equal(applyFilters(l, '2026-09-30', true, ['fräs']).length, 1);
});

test('Vorbereitung: neu, Frist geändert, Dublette', () => {
  const n = normalizeTed(JSON.parse(fx('ted.json')).notices[0]);
  const r1 = prepareTenders([n, n], [], ['45233000'], ['brücke'], '2026-09-30');
  assert.equal(r1.neu.length, 1); assert.equal(r1.dubletten.length, 1);
  assert.equal(r1.neu[0].id, 'ted-600374-2026');
  assert.equal(r1.neu[0].data.fit, 'pruefen');
  const r2 = prepareTenders([n], [{ id: 'ted-600374-2026', deadline: '2026-09-28' }], [], [], '2026-09-30');
  assert.equal(r2.aktualisiert.length, 1);
  const r3 = prepareTenders([n], [{ id: 'x', url: n.url + '#frag', deadline: '2026-10-02' }], [], [], '2026-09-30');
  assert.equal(r3.dubletten[0].id, 'x');
  // gleiche TED-Nummer, andere Sprache im Link und eigene ID mit Zusatz
  const r4 = prepareTenders([n], [{ id: 'ted-600374-2026-kassel', url: 'https://ted.europa.eu/en/notice/-/detail/600374-2026', deadline: '2026-10-02' }], [], [], '2026-09-30');
  assert.equal(r4.dubletten[0].id, 'ted-600374-2026-kassel');
  // gleiche Maßnahme mit neuer Nummer (Änderungsbekanntmachung), bereits verworfen
  const r5 = prepareTenders([n], [{ id: 'ted-666551-2026-kassel', url: 'https://ted.europa.eu/en/notice/-/detail/666551-2026', title: n.title, status: 'verworfen' }], [], [], '2026-09-30');
  assert.equal(r5.neu.length, 0); assert.match(r5.dubletten[0].grund, /verworfen/);
  // nur IDs ohne Frist: kein „Frist geändert“
  const r6 = prepareTenders([n], [{ id: 'ted-600374-2026' }], [], [], '2026-09-30');
  assert.equal(r6.aktualisiert.length, 0); assert.equal(r6.dubletten.length, 1);
  // Aktualisierung trägt nur Frist, Link und Quelle (Status und Eignung bleiben im Cockpit)
  assert.deepEqual(Object.keys(r2.aktualisiert[0].data).sort(), ['deadline', 'source', 'url']);
  assert.equal(r2.aktualisiert[0].vorher, '2026-09-28');
  // Änderungsbekanntmachung mit neuer Frist: Frist wird übernommen statt verworfen
  const r7 = prepareTenders([n], [{ id: 'ted-666551-2026', url: 'https://ted.europa.eu/de/notice/-/detail/666551-2026', title: n.title, deadline: '2026-09-01', status: 'angebot' }], [], [], '2026-09-30');
  assert.equal(r7.aktualisiert.length, 1); assert.equal(r7.aktualisiert[0].id, 'ted-666551-2026');
});

test('TED-Titel: nur Länder- und Kategoriepräfix entfernen', () => {
  const t = normalizeTed({ 'publication-number': '2-2026', 'notice-title': { deu: 'Deutschland – Bauarbeiten – B 96 Los 2 – Deckenerneuerung' } });
  assert.equal(t.title, 'B 96 Los 2 – Deckenerneuerung');
  const u = normalizeTed({ 'publication-number': '3-2026', 'notice-title': { deu: 'Berliner Brücke – Gleiserneuerung' } });
  assert.equal(u.title, 'Berliner Brücke – Gleiserneuerung');
});

test('Vorbereitung: ähnliche Titel und mehrere Bekanntmachungen derselben Vergabe', () => {
  assert.ok(similarTitle('Berliner Brücke (Teichstr.) – Gleiserneuerung, Brückensanierung und Radverkehrsanlagen',
    'Berliner Brücke (Teichstr.) - Gleiserneuerung, Brückensanierung und Integration von Radverkehrsanlagen'));
  assert.ok(!similarTitle('Straßenerhaltung 2026 Paket 2', 'Straßenerhaltung 2026 Paket 3 Brückenbau'));
  assert.ok(!similarTitle('Los 1', 'Los 1'));
  const n = normalizeTed(JSON.parse(fx('ted.json')).notices[0]);
  const a = { ...n, noticeId: '640974-2026', url: 'https://ted.europa.eu/de/notice/-/detail/640974-2026' };
  const b = { ...n, noticeId: '657400-2026', url: 'https://ted.europa.eu/de/notice/-/detail/657400-2026' };
  const r = prepareTenders([b, a], [], [], [], '2026-09-30');
  assert.equal(r.neu.length, 1); assert.equal(r.neu[0].id, 'ted-657400-2026');
  assert.equal(r.dubletten[0].notice, 'ted-640974-2026'); assert.match(r.dubletten[0].grund, /frühere Bekanntmachung/);
});
