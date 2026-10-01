/* ---- app-actions.js ---- */
/* Feind Cockpit · Aktionsleiste unter den Reitern (Pilot InfraTech 2027, Kommentar 01.10.2026).
   Je Reiter die passenden Arbeitserleichterungen: Brennglas-PDF zum Herunterladen oder Drucken (Layout wie
   messe/render.py, erzeugt im Browser mit jsPDF von cdnjs) und Schnellaktionen. Das PDF enthält nur Rollen.
   Drucken: window.print() ist im claude.ai-Viewer gesperrt; die Druckfassung öffnet beim Öffnen den Druckdialog. */
(function () {
  'use strict';
  const FC = window.FC, app = FC.app, H = FC.helpers, D = FC.data, M = FC.model, BG = FC.brennglas;
  const { h, icon } = app;
  const S = app.state;
  const JSPDF = { src: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/4.2.1/jspdf.umd.min.js', sri: 'sha512-plOdviVmws4Y3JAvbnpfKb2hVxKM1lCwsi3vmElYRj+tiDLffZ4FVUj5a8vyKJ9pIgl8JCAHEJ4D1iUKBecswg==' };
  const inViewer = () => !!(window.claude && window.claude.use);
  const busy = S.ui.actionBusy = S.ui.actionBusy || new Set();

  let libP = null;
  function loadJsPdf() {
    const ready = () => window.jspdf && window.jspdf.jsPDF;
    if (ready()) return Promise.resolve(ready());
    if (!libP) libP = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = JSPDF.src; s.integrity = JSPDF.sri; s.crossOrigin = 'anonymous'; s.referrerPolicy = 'no-referrer';
      s.onload = () => (ready() ? resolve(ready()) : reject(new Error('jspdf_missing')));
      s.onerror = () => { libP = null; s.remove(); reject(new Error('jspdf_load')); };
      document.head.append(s);
    });
    return libP;
  }
  app.loadJsPdf = loadJsPdf;

  function blobDownload(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: filename, hidden: true });
    document.body.append(a);
    a.click();
    setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) { /* egal */ } a.remove(); }, 1500);
  }
  // PDF bereitstellen: im Viewer über die downloads-Capability (Bestätigung durch die ansehende Person), lokal direkt.
  async function savePdf(filename, blob, print) {
    if (!inViewer()) {
      if (print) {
        const url = URL.createObjectURL(blob);
        const w = window.open(url, '_blank', 'noopener');
        if (w) { setTimeout(() => URL.revokeObjectURL(url), 60000); return 'opened'; }
        URL.revokeObjectURL(url);
      }
      blobDownload(filename, blob);
      return 'download';
    }
    let dl = null;
    try { dl = await window.claude.use('downloads'); } catch (e) { dl = null; }
    if (!dl) { app.toast('Herunterladen ist in dieser Ansicht nicht verfügbar.', true); return 'unavailable'; }
    try { await dl.save({ filename, data: blob }); return 'saved'; }
    catch (e) {
      const code = e && e.code;
      if (code === 'declined') return 'declined';
      if (code === 'rate_limited') app.toast('Es ist bereits ein Speichern-Dialog offen.', true);
      else app.toast('PDF konnte nicht bereitgestellt werden' + (code ? ' (' + code + ')' : '') + '.', true);
      return 'failed';
    }
  }

  const ctx = extra => Object.assign({ cats: D.CATS, roleOf: o => (app.ownerRole ? app.ownerRole(o) : 'Teammitglied'), today: app.today(), now: new Date() }, extra || {});
  async function makePdf(id, build, print) {
    if (busy.has(id)) return;
    busy.add(id); app.refresh();
    try {
      const model = build();
      if (!model) { app.toast('Für diesen Reiter liegt gerade nichts zum Ausgeben vor.', true); return; }
      let JsPDF;
      try { JsPDF = await loadJsPdf(); }
      catch (e) { app.toast('PDF-Baustein (jsPDF) konnte nicht geladen werden. Verbindung prüfen und erneut versuchen.', true); return; }
      const r = BG.render(JsPDF, model, { print });
      const name = BG.filename(model).replace(/\.pdf$/, print ? '_Druck.pdf' : '.pdf');
      const how = await savePdf(name, r.doc.output('blob'), print);
      if (how === 'saved' || how === 'download' || how === 'opened') {
        app.toast(print ? name + ' bereitgestellt – beim Öffnen startet der Druckdialog.' : name + ' bereitgestellt (' + r.items + ' Positionen, ' + r.pages + (r.pages === 1 ? ' Seite).' : ' Seiten).'));
        if (app.log) app.log('Brennglas-PDF erstellt', model.title + (print ? ' (Druck)' : ''));
      }
    } catch (e) {
      if (window.console) console.error('[Feind Cockpit] PDF', e);
      app.toast('PDF konnte nicht erstellt werden.', true);
    } finally { busy.delete(id); app.refresh(); }
  }

  // Bausteine der Leiste: PDF-Paar (Herunterladen, Drucken), Aktion, Link.
  const pdf = (id, label, build) => ({ kind: 'pdf', id, label, build });
  const act = (id, label, ic, run, opts) => Object.assign({ kind: 'act', id, label, ic, run }, opts || {});
  const link = (id, label, href) => ({ kind: 'link', id, label, href });
  const ro = () => (app.ro ? app.ro() : false);
  const goTasks = patch => () => { const ui = S.ui.it; if (ui) Object.assign(ui, { cat: 'all', prio: 'all', owner: 'all', q: '', archived: false }, patch || {}); app.go('infratech', 'aufgaben'); };
  const notionUrl = () => (app.notionDbUrl ? app.notionDbUrl() : null);
  const allTasks = () => app.tasks();
  const startMeeting = () => act('meeting', (S.data.meetings || []).some(m => m.status === 'offen') ? 'Meeting fortsetzen' : 'Meeting starten', 'meeting', () => app.startMeeting(), { disabled: ro() || !app.startMeeting });
  const newTask = () => act('new', 'Neue Aufgabe', 'plus', () => app.openTaskModal(null), { disabled: ro() || !app.openTaskModal });

  const ACTIONS = {
    'infratech:dashboard': () => [
      pdf('dash', 'Lagebericht', () => BG.dashboardModel(allTasks(), D.DEADLINES, ctx())),
      newTask(), startMeeting(),
      act('p0', 'P0 offen zeigen', 'p0', goTasks({ prio: 'P0' }))
    ],
    'infratech:aufgaben': () => [
      pdf('tasks', 'Aufgabenliste', () => {
        const f = app.itFiltered ? app.itFiltered() : { list: allTasks(), label: 'alle' };
        return BG.tasksModel(f.list, ctx({ filterLabel: f.label }));
      }),
      pdf('roles', 'Je Rolle', () => BG.rolesModel(allTasks(), ctx())),
      notionUrl() ? link('notion', 'In Notion öffnen', notionUrl()) : null
    ],
    'infratech:fristen': () => [
      pdf('fristen', 'Fristenmatrix', () => BG.deadlinesModel(D.DEADLINES, ctx())),
      act('fr-tasks', 'Fristen-Aufgaben', 'kalender', goTasks({ cat: 'steuerung' }))
    ],
    'infratech:budget': () => [
      pdf('budget', 'Budget Plan vs. Ist', () => BG.budgetModel(M.budgetRows(D.BUDGET, (S.docs.budget && S.docs.budget.blocks) || {}), D.BUDGET_FRAME, ctx())),
      app.exportButton ? { kind: 'node', node: app.exportButton('Budget als CSV', 'InfraTech2027-Budget.csv', 'text/csv', budgetCsv, 'ab-budget-csv') } : null
    ],
    'infratech:kpi': () => [pdf('kpi', 'KPI-Messbogen', () => BG.kpiModel(D.KPIS, ctx()))],
    'infratech:leadzaehler': () => [
      pdf('leads', 'Tagesbilanz', () => {
        const days = app.cmd && app.cmd.leads ? app.cmd.leads.view((S.docs.leadCounts && S.docs.leadCounts.days) || {}) : {};
        return BG.leadsModel(M.fairDays(D.FAIR.start, D.FAIR.end).map(d => Object.assign({ date: d }, M.dayCounts(days, d))), ctx({ target: D.LEAD_TARGET }));
      })
    ],
    'infratech:lessons': () => [pdf('lessons', 'Maßnahmen-Checkliste', () => BG.lessonsModel(D.LESSONS, ctx()))],
    'infratech:fakten': () => [pdf('fakten', 'Prüfliste', () => BG.factsModel(D.FACTS, allTasks(), ctx()))],
    'infratech:team': () => [pdf('team', 'Zuständigkeiten je Rolle', () => BG.rolesModel(allTasks(), ctx()))],
    'infratech:meetings': () => {
      const m = app.meetingSelected ? app.meetingSelected() : null;
      return [m ? pdf('meeting', 'Protokoll ' + H.fmtD(m.date), () => BG.meetingModel(app.meetingPdfData(m), ctx())) : null, startMeeting()];
    }
  };
  function budgetCsv() {
    const r = M.budgetRows(D.BUDGET, (S.docs.budget && S.docs.budget.blocks) || {});
    const rows = r.rows.map(x => [x.p, x.z, x.forecast == null ? '' : x.forecast, x.ist == null ? '' : x.ist, x.dev.txt, x.a]);
    rows.push(['Gesamt', D.BUDGET_FRAME.planMin + '–' + D.BUDGET_FRAME.planMax, r.sumF, r.haveI ? r.sumI : '', r.dev.txt, '']);
    return H.toCsv(['Kostenblock', 'Planrahmen €', 'Forecast €', 'Ist €', 'Abweichung', 'Annahme'], rows);
  }
  app.moduleActions = (world, key) => { const f = ACTIONS[world + ':' + key]; return f ? f().filter(Boolean) : []; };

  function button(a) {
    if (a.kind === 'node') return a.node;
    if (a.kind === 'link') return h('a', { class: 'btn ghost', href: a.href, target: '_blank', rel: 'noopener noreferrer', id: 'ab-' + a.id }, icon('ext'), a.label);
    if (a.kind === 'act') return h('button', { class: 'btn ghost', type: 'button', id: 'ab-' + a.id, disabled: !!a.disabled, onclick: a.run }, app.ico ? app.ico(a.ic) : null, a.label);
    const dl = busy.has(a.id), pr = busy.has(a.id + ':print');
    return h('span', { class: 'ab-pdf', role: 'group', 'aria-label': 'Brennglas-PDF: ' + a.label },
      h('button', { class: 'btn primary', type: 'button', id: 'ab-' + a.id, disabled: dl, 'aria-busy': String(dl), title: 'Brennglas-PDF herunterladen (ausfüllbar)', onclick: () => makePdf(a.id, a.build, false) },
        app.ico ? app.ico('dokument') : null, dl ? 'Erstelle PDF …' : a.label + ' · PDF'),
      h('button', { class: 'btn', type: 'button', id: 'ab-' + a.id + '-print', disabled: pr, 'aria-busy': String(pr), 'aria-label': a.label + ' drucken', title: 'Druckfassung: öffnet beim Öffnen den Druckdialog', onclick: () => makePdf(a.id + ':print', a.build, true) },
        app.ico ? app.ico('drucker') : null, pr ? '…' : 'Drucken'));
  }
  // Leiste direkt unter den Reitern (vor dem Panelkopf); ohne Aktionen nichts.
  app.actionBar = function (world, key) {
    let list = [];
    try { list = app.moduleActions(world, key); } catch (e) { if (window.console) console.error('[Feind Cockpit] Aktionen', e); }
    if (!list.length) return null;
    return h('div', { class: 'actionbar no-print', role: 'toolbar', 'aria-label': 'Aktionen für ' + (app.moduleLabel ? app.moduleLabel(world, key) : key) },
      h('span', { class: 'ab-label', text: 'Aktionen' }), list.map(button));
  };
})();
