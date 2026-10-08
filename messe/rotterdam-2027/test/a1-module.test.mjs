import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Aus A1 übernommene Module müssen unverändert in v3 stecken (Quelle: cockpit-a1/src).
const html = readFileSync(new URL('../feind-cockpit-v3.html', import.meta.url), 'utf8');

for (const f of ['notion-tasks.js', 'app-notion-tasks.js', 'brennglas.js']) {
  test('v3 enthält ' + f + ' im Stand von cockpit-a1/src', () => {
    const src = readFileSync(new URL('../../../cockpit-a1/src/' + f, import.meta.url), 'utf8').trimEnd();
    assert.ok(html.includes(src), f + ' weicht vom A1-Quellstand ab');
  });
}

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
  test('v3 enthält ' + f + ' im Stand von A1', () => {
    const v = section(html, f);
    assert.ok(v, f + ' fehlt in v3');
    assert.equal(v, section(a1, f), f + ' weicht zwischen A1 und v3 ab');
  });
}

test('v3 hat Aktionsleiste und Notion-Stand im Markup', () => {
  for (const id of ['actionBar', 'dataStand']) assert.ok(html.includes('id="' + id + '"'), id + ' fehlt');
});
