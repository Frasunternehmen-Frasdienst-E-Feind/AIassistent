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

test('v3 hat Aktionsleiste, Erläuterungen und Notion-Stand im Markup', () => {
  for (const id of ['actionBar', 'dataStand']) assert.ok(html.includes('id="' + id + '"'), id + ' fehlt');
  for (const m of ['app-actions.js', 'app-tooltip.js', 'actionbar.css', 'tooltip.css']) {
    assert.ok(html.includes('/* ---- ' + m + ' ---- */'), m + ' fehlt');
  }
});
