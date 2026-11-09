import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Seit 20.10.2026 gibt es nur eine Quelle: cockpit-a1/Feind-Cockpit-A1.html (= Live „Feind Cockpit“, TfuzbG).
// feind-cockpit-v3.html ist entfallen (David: „aus zwei mach eins“). Die Module in cockpit-a1/src
// müssen unverändert im HTML stehen.
const html = readFileSync(new URL('../../../cockpit-a1/Feind-Cockpit-A1.html', import.meta.url), 'utf8');

for (const f of ['notion-tasks.js', 'app-notion-tasks.js', 'brennglas.js']) {
  test('Cockpit enthält ' + f + ' im Stand von cockpit-a1/src', () => {
    const src = readFileSync(new URL('../../../cockpit-a1/src/' + f, import.meta.url), 'utf8').trimEnd();
    assert.ok(html.includes(src), f + ' weicht vom Quellstand ab');
  });
}

for (const f of ['app-actions.js', 'app-tooltip.js', 'actionbar.css', 'tooltip.css']) {
  test('Cockpit enthält den Abschnitt ' + f, () => assert.ok(html.includes('/* ---- ' + f + ' ---- */'), f + ' fehlt'));
}

test('Cockpit hat Aktionsleiste und Notion-Stand im Markup', () => {
  for (const id of ['actionBar', 'dataStand']) assert.ok(html.includes('id="' + id + '"'), id + ' fehlt');
});
