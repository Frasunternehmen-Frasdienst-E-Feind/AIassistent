/* ---- kpi-logic.js ---- */
/* Feind Cockpit · KPI-Modul (ehemals KOMPASS KPI-Tracker): Ist gegen Ziel bewerten. Reine Funktionen.
   Ziel als Text wie im Freitags-Review: „≤ 1“, „≥ 300“, „0 Fälle“. Ohne Vergleichszeichen gilt „höchstens“ (Nacharbeit soll sinken). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.FC = root.FC || {}).kpiLogic = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const num = v => (typeof v === 'number' ? v : parseFloat(String(v == null ? '' : v).replace(',', '.')));

  function parseTarget(ziel) {
    const m = /^\s*(≤|<=|≥|>=)?\s*(-?\d+(?:[.,]\d+)?)/.exec(String(ziel == null ? '' : ziel));
    return m ? { dir: m[1] === '≥' || m[1] === '>=' ? 'min' : 'max', v: num(m[2]) } : null;
  }

  // state: 'offen' (noch kein Ist oder Ziel nicht lesbar), 'erreicht', 'verfehlt'.
  function status(row) {
    const ist = num(row && row.ist), t = parseTarget(row && row.ziel);
    if (row == null || row.ist == null || row.ist === '' || Number.isNaN(ist) || !t) return 'offen';
    return (t.dir === 'max' ? ist <= t.v : ist >= t.v) ? 'erreicht' : 'verfehlt';
  }

  return { parseTarget, status };
});
