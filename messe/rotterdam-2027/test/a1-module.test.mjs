import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Seit 14.10.2026 ist A1 (cockpit-a1/Feind-Cockpit-A1.html) wieder führend und v3 eingefrorenes Archiv.
// Die Richtung hat sich umgekehrt: die aus A1 nach v3 übernommenen Module müssen im führenden A1 erhalten bleiben.
const html = readFileSync(new URL('../feind-cockpit-v3.html', import.meta.url), 'utf8');

const a1 = readFileSync(new URL('../../../cockpit-a1/Feind-Cockpit-A1.html', import.meta.url), 'utf8');
// Abschnitt „/* ---- name ---- */“ bis zum nächsten Marker bzw. Block-Ende
function section(s, name) {
  const m = '/* ---- ' + name + ' ---- */';
  const i = s.indexOf(m);
  if (i < 0) return null;
  const rest = s.slice(i + m.length);
  const ends = [rest.indexOf('/* ---- '), rest.indexOf('</script>'), rest.indexOf('</style>')].filter(x => x >= 0);
  return rest.slice(0, Math.min(...ends));
}

for (const f of ['app-actions.js', 'app-tooltip.js', 'actionbar.css', 'tooltip.css']) {
  test('führendes A1 enthält ' + f + ' (aus v3 übernommen)', () => {
    assert.ok(section(html, f), f + ' fehlt im Archivstand v3');
    assert.ok(section(a1, f), f + ' fehlt im führenden A1');
  });
}

test('A1 und v3 haben Aktionsleiste und Notion-Stand im Markup', () => {
  for (const s of [html, a1]) for (const id of ['actionBar', 'dataStand']) assert.ok(s.includes('id="' + id + '"'), id + ' fehlt');
});
