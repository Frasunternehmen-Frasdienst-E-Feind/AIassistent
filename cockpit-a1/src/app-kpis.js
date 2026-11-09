/* ---- app-kpis.js ---- */
/* Feind Cockpit · Marketing › KPIs: übernimmt den KOMPASS KPI-Tracker (SX6bS…). Sammlung kpis/<id> =
   { kpi, ziel, ist, basis, messung, checkin }, gepflegt im Freitags-Review bzw. über /cockpit-sync.
   Kennzahl-Kacheln statt Diagramm: je KPI ein Ist und ein Ziel; Zustand immer als Wort, nie nur als Farbe. */
(function () {
  'use strict';
  const FC = window.FC, app = FC.app, H = FC.helpers, K = FC.kpiLogic;
  const { h, panelHead } = app;
  const S = app.state, str = H.str;
  const LABEL = { offen: 'noch nicht gemessen', erreicht: 'Ziel erreicht', verfehlt: 'Ziel verfehlt' };
  const show = v => (v == null || v === '' ? '–' : String(v));

  app.module('marketing', 'kpis', {
    count: () => S.data.kpis.length,
    render() {
      const items = S.data.kpis.slice().sort((a, b) => str(a._id).localeCompare(str(b._id)));
      const head = panelHead('KPIs', items.length ? items.filter(r => K.status(r) !== 'offen').length + ' von ' + items.length + ' gemessen' : null, null, app.mkSrcNote('kpis'));
      if (!items.length) return [head, app.mkEmpty('kpis', false)];
      const cards = items.map(r => {
        const st = K.status(r);
        return h('div', { class: 'card kpi-card kpi-' + st, tabindex: '0', 'data-tip': 'Basis: ' + show(r.basis) + ' · Messung: ' + show(r.messung) },
          h('h3', { text: show(r.kpi) }),
          h('div', { class: 'kpi-vals' },
            h('div', {}, h('span', { class: 'muted small', text: 'Ist' }), h('strong', { class: 'kpi-big', text: show(r.ist) })),
            h('div', {}, h('span', { class: 'muted small', text: 'Ziel' }), h('strong', { class: 'kpi-big', text: show(r.ziel) }))),
          h('p', { class: 'kpi-state small', text: LABEL[st] }),
          r.checkin ? h('p', { class: 'muted small', text: 'Check-in ' + str(r.checkin) }) : null);
      });
      return [head, h('div', { class: 'kpi-cards' }, cards),
        h('details', { class: 'section' }, h('summary', { class: 'small', text: 'Tabelle: Basis und Messmethode' }),
          h('div', { class: 'tbl-wrap' }, h('table', { class: 'data' },
            h('thead', {}, h('tr', {}, ['KPI', 'Ist', 'Ziel', 'Stand', 'Basis', 'Messung', 'Check-in'].map(t => h('th', { scope: 'col', text: t })))),
            h('tbody', {}, items.map(r => h('tr', {}, [r.kpi, r.ist, r.ziel, LABEL[K.status(r)], r.basis, r.messung, r.checkin].map(v => h('td', { text: show(v) }))))))))];
    }
  });
})();
