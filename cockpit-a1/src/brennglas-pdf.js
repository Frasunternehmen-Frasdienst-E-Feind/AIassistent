/* ---- brennglas-pdf.js ---- */
/* Feind Cockpit · Brennglas-Dokumente als PDF direkt im Browser (jsPDF).
   Layout wie messe/render.py (Stand main): dunkler Deckkopf mit grüner Kante und Chip, Kurzanleitung,
   Legende, Blocker-Block, Abschnitte mit Marker, Ankreuzfeld, Status-Auswahl und festem Notizfeld (max. 250 Zeichen).
   Teil 1: reine Modell-Bausteine je Reiter (ohne DOM, testbar in Node). Teil 2: Renderer auf eine jsPDF-Klasse.
   Personen erscheinen nur als Rollen; der Aufrufer liefert dafür roleOf(owner). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.FC = root.FC || {}).brennglas = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // CI-Tokens (hell) aus branding/feind-ci.tokens.json; ein Test hält beide gleich. PDF ist immer hell (Druck).
  const TOKENS = {
    accent: '#84bb20', 'accent-text': '#5e8a14', 'on-accent': '#424e4e', 'on-accent-strong': '#1f2525',
    signal: '#e3000b', 'signal-text': '#b8000a', surface: '#ffffff', 'surface-muted': '#f2f4f4', 'surface-inverse': '#424e4e',
    ink: '#3c5457', 'ink-strong': '#424e4e', 'ink-muted': '#6b7575', 'ink-inverse': '#ffffff', line: '#d5dada', focus: '#424e4e'
  };
  const STATUS = ['Offen', 'In Arbeit', 'Erledigt', 'Entfällt', 'Klärung nötig'];
  const TASK_STATUS = { open: 'Offen', in_progress: 'In Arbeit', done: 'Erledigt', deferred: 'Entfällt', blocked: 'Klärung nötig' };
  const BRAND = 'Fräsdienst-Service E. Feind GmbH';
  const EVENT = 'InfraTech 2027 · Rotterdam Ahoy · Stand 5.209 · Di 12.–Fr 15. Januar 2027';
  const NOTE_MAX = 250;

  const str = v => (v == null ? '' : String(v));
  const arr = v => (Array.isArray(v) ? v : []);
  function parseDay(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str(s));
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  const day0 = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayDiff = (a, b) => Math.round((day0(b) - day0(a)) / 864e5);
  const pad = n => String(n).padStart(2, '0');
  const fmtD = s => { const d = s instanceof Date ? s : parseDay(s); return d ? pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() : '–'; };
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const fmtEuro = n => (n == null || isNaN(n) ? '—' : Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' €');
  const isOpen = t => t && t.status !== 'done' && t.status !== 'deferred' && !t.archived && !t.deleted;
  const PRIO = { P0: 0, P1: 1, P2: 2 };
  const byPrioDue = (a, b) => (PRIO[a.prio] ?? 3) - (PRIO[b.prio] ?? 3) || str(a.due || '9999').localeCompare(str(b.due || '9999')) || str(a.title).localeCompare(str(b.title));

  // jsPDF-Standardschriften kennen nur Windows-1252: Zeichen außerhalb werden ersetzt statt als Kästchen gedruckt.
  const CP1252 = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
  const REPL = { '≤': '<=', '≥': '>=', '→': '->', '←': '<-', '↔': '<->', '✓': 'x', '✔': 'x', '−': '-', '‑': '-', ' ': ' ', ' ': ' ', ' ': ' ', '…': '...', '①': '(1)', '②': '(2)', '③': '(3)', '④': '(4)' };
  function sanitize(s) {
    let out = '';
    for (const ch of str(s).replace(/\r\n?/g, '\n')) {
      const c = ch.codePointAt(0);
      if (REPL[ch] != null) out += REPL[ch];
      else if ((c >= 32 && c < 127) || (c >= 160 && c < 256) || ch === '\n' || CP1252.includes(ch)) out += ch;
      else out += '?';
    }
    return out;
  }
  const clip = (s, n) => { const t = str(s).replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };

  /* ---------------- Teil 1: Modelle ---------------- */
  const HOWTO = [
    '1)  Kästchen abhaken = erledigt.   2)  Status-Auswahl rechts: Offen / In Arbeit / Erledigt / Entfällt / Klärung nötig.',
    '3)  Festes Notizfeld unter jedem Punkt – Freitext + Link, max. 250 Zeichen.',
    'Vorbelegung: Status und Notiz zeigen den Stand im Cockpit zum Zeitpunkt der Ausgabe.',
    'Speichern/Weitergeben: „Formular ausgefüllt speichern“. Ausfüllen & Drucken funktionieren in jedem PDF-Viewer.'
  ];
  const DP = [
    'Enthält nur Rollen, keine Personennamen. Keine personenbezogenen Daten Dritter ergänzen (Einwilligung erforderlich).',
    'Verträge, Freigaben, Entsendung und Lead-Erfassung: Bitte Rechtsabteilung prüfen.'
  ];
  function base(o) {
    const now = o.now || new Date();
    return Object.assign({
      brand: BRAND, event: EVENT, chip: 'InfraTech 2027', intern: 'INTERN – nur für das Messeteam, nicht veröffentlichen.',
      basis: 'Stand ' + fmtD(now) + ', ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ' Uhr',
      howto: HOWTO, legend: [], blockerTitle: '', blockers: [], blockerNote: '', sections: [], dp: DP,
      dpTitle: 'Datenschutz & Recht', footer: 'Feind Cockpit · ' + BRAND + ' · intern', status: STATUS, stamp: ymd(now)
    }, o.meta || {});
  }
  const TASK_LEGEND = [['ok', 'erledigt'], ['no', 'überfällig'], ['warn', 'blockiert / Klärung'], ['add', 'neu'], ['none', 'offen']];
  function taskMarker(t, today) {
    if (t.status === 'done') return 'ok';
    const d = parseDay(t.due);
    if (isOpen(t) && d && dayDiff(today, d) < 0) return 'no';
    if (t.status === 'blocked') return 'warn';
    if (arr(t.flags).includes('neu')) return 'add';
    return 'none';
  }
  function taskItem(t, ctx) {
    const d = parseDay(t.due);
    const dd = d ? dayDiff(ctx.today, d) : null;
    const due = !d ? 'Termin offen' : isOpen(t) && dd < 0 ? 'fällig ' + fmtD(d) + ' (' + (-dd) + ' T überfällig)' : 'fällig ' + fmtD(d);
    const flags = [arr(t.flags).includes('fakt') ? 'Fakt prüfen' : '', arr(t.flags).includes('recht') ? 'Recht prüfen' : ''].filter(Boolean);
    const meta = [str(t.prio) || 'P2', ctx.roleOf ? ctx.roleOf(t.owner) : '', due].concat(flags, str(t.budget) ? ['Budget: ' + str(t.budget)] : []).filter(Boolean).join(' · ');
    const note = [str(t.note).trim(), str(t.beschluss).trim() ? 'Beschluss: ' + str(t.beschluss).trim() : ''].filter(Boolean).join(' | ');
    return { mk: taskMarker(t, ctx.today), text: str(t.title) || '(ohne Titel)', meta, status: TASK_STATUS[t.status] || 'Offen', done: t.status === 'done', note: clip(note, NOTE_MAX) };
  }
  function blockersOf(tasks, ctx, n) {
    const over = tasks.filter(t => isOpen(t) && parseDay(t.due) && dayDiff(ctx.today, parseDay(t.due)) < 0).sort(byPrioDue);
    const blk = tasks.filter(t => t.status === 'blocked' && !over.includes(t)).sort(byPrioDue);
    return over.map(t => [clip(t.title, 70), (-dayDiff(ctx.today, parseDay(t.due))) + ' T überfällig · ' + (ctx.roleOf ? ctx.roleOf(t.owner) : '')])
      .concat(blk.map(t => [clip(t.title, 70), 'blockiert · ' + (ctx.roleOf ? ctx.roleOf(t.owner) : '')])).slice(0, n || 8);
  }

  // Aufgabenliste (aktueller Filter), gruppiert nach Bereich, je Bereich P0 vor P1 vor P2, dann Termin.
  function tasksModel(tasks, ctx) {
    const list = arr(tasks);
    const cats = arr(ctx.cats);
    const sections = cats.map(c => [c.label, list.filter(t => t.cat === c.id)]).concat([['Ohne Bereich', list.filter(t => !cats.some(c => c.id === t.cat))]])
      .filter(([, ts]) => ts.length).map(([title, ts]) => ({ title: title + ' (' + ts.filter(t => t.status === 'done').length + '/' + ts.length + ' erledigt)', items: ts.slice().sort(byPrioDue).map(t => taskItem(t, ctx)) }));
    const open = list.filter(isOpen).length;
    return base({ now: ctx.now, meta: {
      kind: 'aufgaben', title: 'Brennglas – Aufgaben InfraTech 2027', chip: open + ' offen · ' + list.length + ' gesamt',
      src: 'Ausfüllbares Formular · Quelle: Notion „Aufgaben InfraTech 2027“ via Feind Cockpit' + (ctx.filterLabel ? ' · Filter: ' + ctx.filterLabel : ''),
      legend: TASK_LEGEND, blockerTitle: 'Zuerst klären – überfällig und blockiert', blockers: blockersOf(list, ctx),
      blockerNote: 'Überfällige und blockierte Aufgaben zuerst im Jour fixe entscheiden.', sections, file: 'Brennglas_Aufgaben_InfraTech2027'
    } });
  }

  // Lagebericht fürs Dashboard: Blocker, P0 offen, fällig in 14 Tagen, nächste Fristen.
  function dashboardModel(tasks, deadlines, ctx) {
    const list = arr(tasks).filter(t => !t.archived && !t.deleted);
    const done = list.filter(t => t.status === 'done').length;
    const p0 = list.filter(t => isOpen(t) && t.prio === 'P0').sort(byPrioDue);
    const soon = list.filter(t => { const d = parseDay(t.due); return isOpen(t) && t.prio !== 'P0' && d && dayDiff(ctx.today, d) >= 0 && dayDiff(ctx.today, d) <= 14; }).sort(byPrioDue);
    const fr = arr(deadlines).filter(d => { const x = parseDay(d.d); return x && dayDiff(ctx.today, x) >= 0 && dayDiff(ctx.today, x) <= 45; });
    const sections = [
      { title: 'P0 offen (' + p0.length + ')', items: p0.map(t => taskItem(t, ctx)) },
      { title: 'Fällig in den nächsten 14 Tagen (' + soon.length + ')', items: soon.map(t => taskItem(t, ctx)) },
      { title: 'Fristen in den nächsten 45 Tagen (' + fr.length + ')', items: fr.map(d => deadlineItem(d, ctx)) }
    ].filter(s => s.items.length);
    const days = dayDiff(ctx.today, parseDay('2027-01-12'));
    return base({ now: ctx.now, meta: {
      kind: 'dashboard', title: 'Brennglas – Lagebericht InfraTech 2027',
      chip: (days > 0 ? 'noch ' + days + ' Tage' : days === 0 ? 'Messe heute' : 'Messe läuft') + ' · ' + (list.length ? Math.round(done / list.length * 100) : 0) + ' %',
      src: 'Ausfüllbares Formular · ' + done + ' von ' + list.length + ' Aufgaben erledigt · Quelle: Feind Cockpit',
      legend: TASK_LEGEND, blockerTitle: 'Zuerst entscheiden – kritische Blocker', blockers: blockersOf(list, ctx),
      blockerNote: 'Grundlage für den Jour fixe: Blocker zuerst, dann P0, dann Fristen.', sections, file: 'Brennglas_Lagebericht_InfraTech2027'
    } });
  }

  function deadlineItem(d, ctx) {
    const x = parseDay(d.d), dd = x ? dayDiff(ctx.today, x) : null;
    const rest = dd == null ? '' : dd < 0 ? (-dd) + ' T vorbei' : dd === 0 ? 'heute' : 'in ' + dd + ' T';
    const mk = dd != null && dd < 0 ? 'ok' : d.st === 'g' ? 'add' : dd != null && dd <= 14 ? 'no' : d.st === 'y' ? 'warn' : 'none';
    return { mk, text: fmtD(d.d) + ' – ' + str(d.t), meta: [rest, str(d.s)].filter(Boolean).join(' · '), status: dd != null && dd < 0 ? 'Erledigt' : d.st === 'y' ? 'Klärung nötig' : 'Offen', done: false, note: '' };
  }
  function deadlinesModel(deadlines, ctx) {
    const list = arr(deadlines).slice().sort((a, b) => str(a.d).localeCompare(str(b.d)));
    const fut = list.filter(d => dayDiff(ctx.today, parseDay(d.d)) >= 0), past = list.filter(d => dayDiff(ctx.today, parseDay(d.d)) < 0);
    const near = fut.filter(d => dayDiff(ctx.today, parseDay(d.d)) <= 30 && d.st !== 'g');
    return base({ now: ctx.now, meta: {
      kind: 'fristen', title: 'Brennglas – Fristenmatrix InfraTech 2027', chip: fut.length + ' kommende Fristen',
      src: 'Ausfüllbares Formular · Quelle: Fristenmatrix Feind Cockpit (Aussteller-Handbuch 2027 V1.3, Referenz 2026)',
      legend: [['no', '≤ 14 Tage'], ['warn', 'für 2027 verifizieren'], ['none', 'bestätigt'], ['add', 'Messetermin'], ['ok', 'vorbei']],
      blockerTitle: 'In den nächsten 30 Tagen fällig', blockers: near.map(d => [fmtD(d.d) + ' ' + clip(d.t, 60), 'in ' + dayDiff(ctx.today, parseDay(d.d)) + ' T · ' + str(d.s)]),
      blockerNote: 'Gelb markierte Fristen beim Veranstalter (infratech.nl, Ahoy) bestätigen lassen.',
      sections: [{ title: 'Kommende Fristen', items: fut.map(d => deadlineItem(d, ctx)) }, { title: 'Vergangene Fristen', items: past.map(d => deadlineItem(d, ctx)) }].filter(s => s.items.length),
      file: 'Brennglas_Fristen_InfraTech2027'
    } });
  }

  // Budget: r ist die Ausgabe von budgetRows (Plan, Forecast, Ist, Abweichung).
  function budgetModel(r, frame, ctx) {
    const mk = c => (c === 'r' ? 'no' : c === 'y' ? 'warn' : c === 'g' ? 'ok' : 'none');
    const items = arr(r && r.rows).map(x => ({
      mk: mk(x.dev && x.dev.cls), text: str(x.p), meta: 'Plan ' + str(x.z) + ' € · Forecast ' + fmtEuro(x.forecast) + ' · Ist ' + fmtEuro(x.ist) + ' · Abweichung ' + str(x.dev && x.dev.txt) + (str(x.a) ? ' · Annahme: ' + str(x.a) : ''),
      status: x.ist != null ? 'Erledigt' : 'Offen', done: false, note: ''
    }));
    const over = arr(r && r.rows).filter(x => x.dev && x.dev.cls === 'r');
    const f = frame || {};
    return base({ now: ctx.now, meta: {
      kind: 'budget', title: 'Brennglas – Budget Plan vs. Ist 2027', chip: 'Forecast ' + fmtEuro(r && r.sumF),
      src: 'Ausfüllbares Formular · Planrahmen ' + fmtEuro(f.planMin) + '–' + fmtEuro(f.planMax) + ' brutto · Baseline 2026 ' + fmtEuro(f.baseline),
      legend: [['ok', 'im Plan'], ['warn', 'bis +10 %'], ['no', 'über +10 %'], ['none', 'noch kein Ist']],
      blockerTitle: 'Über Plan (mehr als +10 %)', blockers: over.map(x => [str(x.p), 'Abweichung ' + x.dev.txt]),
      blockerNote: over.length ? '' : 'Kein Kostenblock liegt mehr als 10 % über dem Forecast.',
      sections: [{ title: 'Kostenblöcke', items }, { title: 'Gesamt', items: [{ mk: mk(r && r.dev && r.dev.cls), text: 'Gesamt: Forecast ' + fmtEuro(r && r.sumF) + (r && r.haveI ? ' · Ist ' + fmtEuro(r.sumI) : ''), meta: 'Ziel: Abweichung höchstens ' + Math.round((f.maxDeviation || 0.1) * 100) + ' % · ' + (r && r.haveI ? 'Abweichung ' + r.dev.txt : 'noch keine Ist-Werte'), status: 'Offen', done: false, note: '' }] }],
      dp: DP.concat(['Angebote und Stornobedingungen: Bitte Rechtsabteilung prüfen.']).slice(0, 3), file: 'Brennglas_Budget_InfraTech2027'
    } });
  }

  function kpiModel(kpis, ctx) {
    return base({ now: ctx.now, meta: {
      kind: 'kpi', title: 'Brennglas – Ziele & KPIs InfraTech 2027', chip: arr(kpis).length + ' KPIs',
      src: 'Ausfüllbares Formular · Messbogen: Ist-Wert ins Notizfeld, Status setzen',
      legend: [['none', 'zu messen']], sections: [{ title: 'KPIs 2027', items: arr(kpis).map(k => ({ mk: 'none', text: str(k.k) + ': Ziel ' + str(k.z), meta: 'Baseline 2026: ' + str(k.b) + ' · Messmethode: ' + str(k.m), status: 'Offen', done: false, note: '' })) }],
      file: 'Brennglas_KPIs_InfraTech2027'
    } });
  }

  function leadsModel(days, ctx) {
    const list = arr(days);
    const sum = list.reduce((s, d) => ({ a: s.a + d.a, b: s.b + d.b, c: s.c + d.c }), { a: 0, b: 0, c: 0 });
    const total = sum.a + sum.b + sum.c;
    return base({ now: ctx.now, meta: {
      kind: 'leads', title: 'Brennglas – Lead-Tagesbilanz InfraTech 2027', chip: total + ' Leads · Ziel ' + (ctx.target || 300),
      src: 'Ausfüllbares Formular · nur Stückzahlen, keine personenbezogenen Daten · Tages-Debrief ins Notizfeld',
      legend: [['ok', 'Tag erfasst'], ['none', 'kommt noch']],
      sections: [{ title: 'Messetage', items: list.map((d, i) => ({ mk: d.a + d.b + d.c ? 'ok' : 'none', text: 'Tag ' + (i + 1) + ' · ' + fmtD(d.date) + ': ' + (d.a + d.b + d.c) + ' Leads', meta: 'A (heiß) ' + d.a + ' · B (warm) ' + d.b + ' · C (Info) ' + d.c + ' · A-Leads nachfassen ≤ 48 h', status: d.a + d.b + d.c ? 'Erledigt' : 'Offen', done: false, note: '' })) },
        { title: 'Gesamt', items: [{ mk: total >= (ctx.target || 300) ? 'ok' : 'none', text: 'Gesamt: ' + total + ' Leads (A ' + sum.a + ' · B ' + sum.b + ' · C ' + sum.c + ')', meta: 'Zielerreichung ' + Math.min(100, Math.round(total / (ctx.target || 300) * 100)) + ' %', status: 'Offen', done: false, note: '' }] }],
      file: 'Brennglas_Leads_InfraTech2027'
    } });
  }

  function lessonsModel(lessons, ctx) {
    const groups = ['Hoch', 'Mittel', 'Niedrig'];
    return base({ now: ctx.now, meta: {
      kind: 'lessons', title: 'Brennglas – Maßnahmen aus Lessons Learned 2026', chip: arr(lessons).length + ' Maßnahmen',
      src: 'Ausfüllbares Formular · Quelle: Auswertung InfraTech 2026 (ca. 350 Standbesucher)',
      legend: [['warn', 'Impact hoch'], ['none', 'Impact mittel/niedrig']],
      sections: groups.map(g => ({ title: 'Impact ' + g, items: arr(lessons).filter(l => l[2] === g).map(l => ({ mk: g === 'Hoch' ? 'warn' : 'none', text: str(l[0]) + ' – ' + str(l[3]), meta: 'Erkenntnis 2026: ' + str(l[1]), status: 'Offen', done: false, note: '' })) })).filter(s => s.items.length),
      file: 'Brennglas_Lessons_InfraTech2027'
    } });
  }

  function factsModel(facts, tasks, ctx) {
    const mk = s => (/^Bestätigt/.test(s) ? 'ok' : /^Korrektur/.test(s) ? 'no' : 'warn');
    const flagged = arr(tasks).filter(t => isOpen(t) && (arr(t.flags).includes('fakt') || arr(t.flags).includes('recht'))).sort(byPrioDue);
    return base({ now: ctx.now, meta: {
      kind: 'fakten', title: 'Brennglas – Faktencheck & Prüfvermerke', chip: flagged.length + ' offene Prüfungen',
      src: 'Ausfüllbares Formular · Abgleich mit infratech.nl und ahoy.nl · Aufgaben mit „Fakt prüfen“ / „Recht prüfen“',
      legend: [['ok', 'bestätigt'], ['warn', 'prüfen'], ['no', 'Korrektur nötig'], ['none', 'Aufgabe offen']],
      sections: [
        { title: 'Faktencheck Rotterdam Ahoy', items: arr(facts).map(f => ({ mk: mk(str(f[2])), text: str(f[0]) + ': ' + str(f[1]), meta: str(f[2]) + ' · ' + str(f[3]), status: /^Bestätigt/.test(str(f[2])) ? 'Erledigt' : 'Klärung nötig', done: false, note: '' })) },
        { title: 'Aufgaben mit Prüfvermerk (' + flagged.length + ')', items: flagged.map(t => Object.assign(taskItem(t, ctx), { mk: 'none' })) }
      ].filter(s => s.items.length),
      file: 'Brennglas_Faktencheck_InfraTech2027'
    } });
  }

  // Zuständigkeiten je Rolle: offene Aufgaben, damit jede Rolle ihre Liste mitnehmen kann.
  function rolesModel(tasks, ctx) {
    const open = arr(tasks).filter(isOpen);
    const roles = Array.from(new Set(open.map(t => (ctx.roleOf ? ctx.roleOf(t.owner) : str(t.owner)) || 'offen'))).sort((a, b) => a.localeCompare(b, 'de'));
    return base({ now: ctx.now, meta: {
      kind: 'team', title: 'Brennglas – Zuständigkeiten je Rolle', chip: roles.length + ' Rollen · ' + open.length + ' offen',
      src: 'Ausfüllbares Formular · offene Aufgaben je Rolle · Personen nur als Rollen',
      legend: TASK_LEGEND, sections: roles.map(r => ({ title: r, items: open.filter(t => ((ctx.roleOf ? ctx.roleOf(t.owner) : str(t.owner)) || 'offen') === r).sort(byPrioDue).map(t => taskItem(t, ctx)) })),
      file: 'Brennglas_Zustaendigkeiten_InfraTech2027'
    } });
  }

  // Meeting-Protokoll; p kommt vorbereitet aus dem Modul Protokolle (Rollen statt Namen).
  function meetingModel(p, ctx) {
    const it = (text, meta, mk) => ({ mk: mk || 'none', text, meta: meta || '', status: 'Offen', done: false, note: '' });
    return base({ now: ctx.now, meta: {
      kind: 'meeting', title: 'Brennglas – Messe-Abstimmung ' + fmtD(p.date), chip: str(p.status) || 'Protokoll',
      src: 'Protokoll · Dauer ' + (str(p.duration) || '–') + ' · Teilnehmer (Rollen): ' + (str(p.participants) || '–'),
      legend: [['add', 'Beschluss'], ['ok', 'erledigt'], ['none', 'nachhalten']],
      sections: [
        { title: 'Beschlüsse (' + arr(p.decisions).length + ')', items: arr(p.decisions).map(d => it(d, '', 'add')) },
        { title: 'Neue Aufgaben (' + arr(p.created).length + ')', items: arr(p.created).map(c => it(c[0], c[1])) },
        { title: 'Änderungen (' + arr(p.changes).length + ')', items: arr(p.changes).map(c => it(c[0], c[1], /→ erledigt/.test(c[1]) ? 'ok' : 'none')) },
        { title: 'Notizen', items: str(p.notes).trim() ? [it(clip(p.notes, 600), '')] : [] }
      ].filter(s => s.items.length),
      file: 'Brennglas_Protokoll_' + str(p.date)
    } });
  }

  function filename(model) { return (model.file || 'Brennglas') + '_' + model.stamp + '.pdf'; }

  /* ---------------- Teil 2: Renderer (jsPDF, Einheit pt, Ursprung oben links) ---------------- */
  const PAGE_W = 595.28, PAGE_H = 841.89, ML = 38, MR = 38, MB = 42, CW = PAGE_W - ML - MR, NOTE_H = 22, FS = 8.3;
  // Zwischentöne des Deckkopfs wie in messe/render.py (helle Schrift auf Anthrazit).
  const HEAD = { sub: '#d3dada', src: '#aab4b4', basis: '#8f9a9a', slim: '#c7cfcf', note: '#fbfdf6' };

  function render(JsPDF, model, opts) {
    const o = opts || {};
    const L = Object.assign({}, TOKENS, o.tokens || {});
    const doc = new JsPDF({ unit: 'pt', format: 'a4', compress: o.compress !== false });
    const S = model;
    doc.setProperties({ title: sanitize(S.title), author: BRAND + ' – Marketing', subject: sanitize(S.event), creator: 'Feind Cockpit' });
    const st = { y: 0, idx: 0 };
    const T = (t, x, y, opt) => doc.text(sanitize(t), x, y, opt);
    const font = (style, size, color) => { doc.setFont('helvetica', style); doc.setFontSize(size); if (color) doc.setTextColor(color); };
    const wrap = (t, maxw) => doc.splitTextToSize(sanitize(t), maxw);
    const width = t => doc.getTextWidth(sanitize(t));

    function slimHeader(title) {
      doc.setFillColor(L['ink-strong']); doc.rect(0, 0, PAGE_W, 30, 'F');
      doc.setFillColor(L.accent); doc.rect(0, 30, PAGE_W, 2, 'F');
      font('bold', 10, L['ink-inverse']); T(S.brand, ML, 21);
      font('normal', 8, HEAD.slim); T(clip(title, 90), PAGE_W - MR, 21, { align: 'right' });
    }
    function newPage(cont) { doc.addPage(); slimHeader(cont || S.title); st.y = 48; }
    function ensure(space, cont) { if (st.y + space > PAGE_H - MB - 8) newPage(cont); }
    function marker(mk, cx, cy) {
      const r = 3.4;
      if (mk === 'ok') { doc.setFillColor(L.accent); doc.circle(cx, cy, r, 'F'); }
      else if (mk === 'no') { doc.setFillColor(L.signal); doc.circle(cx, cy, r, 'F'); }
      else if (mk === 'warn') { doc.setFillColor(L['ink-strong']); doc.circle(cx, cy, r, 'F'); }
      else if (mk === 'add') {
        doc.setDrawColor(L['accent-text']); doc.setLineWidth(1.1); doc.setFillColor(L.surface); doc.circle(cx, cy, r, 'FD');
        doc.setLineWidth(1); doc.line(cx - 1.7, cy, cx + 1.7, cy); doc.line(cx, cy - 1.7, cx, cy + 1.7);
      } else { doc.setDrawColor(L['ink-muted']); doc.setLineWidth(0.8); doc.setFillColor(L.surface); doc.circle(cx, cy, r, 'FD'); }
    }
    function sectionHead(title, color) {
      ensure(30 + 50, title); st.y += 4;
      font('bold', 10.5, L['ink-strong']); T(title, ML, st.y + 9);
      doc.setDrawColor(color || L.accent); doc.setLineWidth(1.6); doc.line(ML, st.y + 13, PAGE_W - MR, st.y + 13);
      st.y += 22;
    }
    const X_MARK = ML + 4, X_CB = ML + 12, X_TXT = ML + 30, STAT_W = 92, X_STAT = PAGE_W - MR - STAT_W, TXT_W = X_STAT - X_TXT - 8;
    function item(it, cont) {
      font('normal', FS);
      const lines = wrap(it.text, TXT_W);
      font('normal', 7);
      const meta = it.meta ? wrap(it.meta, TXT_W) : [];
      const rowH = Math.max(lines.length * (FS + 1.6) + meta.length * 8.6, 15);
      ensure(rowH + NOTE_H + 6, cont);
      const top = st.y, base0 = top + FS;
      marker(it.mk, X_MARK, base0 - FS * 0.32);
      font('normal', FS, it.mk === 'no' ? L.ink : it.done ? L['ink-muted'] : L.ink);
      let ty = base0;
      for (const ln of lines) { doc.text(ln, X_TXT, ty); ty += FS + 1.6; }
      if (meta.length) { font('normal', 7, L['ink-muted']); for (const ln of meta) { doc.text(ln, X_TXT, ty - 0.6); ty += 8.6; } }
      const i = st.idx, cbY = base0 - 9;
      // Sichtbare Rahmen gezeichnet (druckt überall gleich), darüber die Formularfelder.
      doc.setDrawColor(L['ink-muted']); doc.setLineWidth(0.8); doc.setFillColor(L.surface); doc.rect(X_CB, cbY, 10, 10, 'FD');
      const cb = new doc.AcroFormCheckBox();
      cb.fieldName = 'done_' + String(i).padStart(3, '0'); cb.Rect = [X_CB, cbY, 10, 10];
      cb.appearanceState = it.done ? 'On' : 'Off'; if (it.done) cb.value = 'On';
      cb.tooltip = 'Erledigt'; doc.addField(cb);
      doc.setDrawColor(L.line); doc.setLineWidth(0.6); doc.setFillColor(L['surface-muted']); doc.rect(X_STAT, cbY - 1.5, STAT_W, 13.5, 'FD');
      const sel = new doc.AcroFormComboBox();
      sel.fieldName = 'sel_' + String(i).padStart(3, '0'); sel.Rect = [X_STAT, cbY - 1.5, STAT_W, 13.5];
      sel.setOptions(S.status.map(sanitize)); sel.value = sanitize(it.status || S.status[0]); sel.defaultValue = sel.value;
      sel.fontSize = 7.4; sel.color = L['ink-strong']; sel.tooltip = 'Status'; doc.addField(sel);
      const ny = top + rowH + 2;
      doc.setDrawColor(L.accent); doc.setLineWidth(0.8); doc.setFillColor(HEAD.note); doc.rect(X_TXT, ny, (PAGE_W - MR) - X_TXT, NOTE_H, 'FD');
      const tf = new doc.AcroFormTextField();
      tf.fieldName = 'note_' + String(i).padStart(3, '0'); tf.Rect = [X_TXT, ny, (PAGE_W - MR) - X_TXT, NOTE_H];
      tf.multiline = true; tf.maxLength = NOTE_MAX; tf.fontSize = 7.6; tf.color = L.ink; tf.tooltip = 'Notiz (max. 250 Zeichen)';
      if (it.note) tf.value = sanitize(clip(it.note, NOTE_MAX));
      doc.addField(tf);
      st.idx += 1; st.y = ny + NOTE_H + 6;
    }

    // ---- Deckkopf
    doc.setFillColor(L['ink-strong']); doc.rect(0, 0, PAGE_W, 96, 'F');
    doc.setFillColor(L.accent); doc.rect(0, 96, PAGE_W, 4, 'F');
    const chipW = 150, titleMax = (PAGE_W - MR - chipW) - ML - 12;
    let tfs = 20;
    font('bold', tfs);
    while (tfs > 12 && width(S.title) > titleMax) { tfs -= 0.5; doc.setFontSize(tfs); }
    font('bold', tfs, L['ink-inverse']); T(S.title, ML, 42);
    font('normal', 10, HEAD.sub); T(S.event, ML, 58);
    doc.setFillColor(L.accent); doc.roundedRect(PAGE_W - MR - chipW, 34, chipW, 18, 3, 3, 'F');
    font('bold', 8, L['on-accent-strong']); T(clip(S.chip, 34), PAGE_W - MR - chipW / 2, 46, { align: 'center' });
    font('normal', 8, HEAD.src); T(clip(S.src, 135), ML, 74);
    // Intern-Hinweis als rote Fläche mit weißer Schrift (Rot auf dunklem Grund nur als Fläche).
    font('bold', 7.4);
    const iw = width(S.intern) + 10;
    doc.setFillColor(L.signal); doc.rect(ML, 79, iw, 11, 'F');
    font('bold', 7.4, L['ink-inverse']); T(S.intern, ML + 5, 87);
    font('normal', 8, HEAD.basis); T(S.basis, PAGE_W - MR, 87, { align: 'right' });
    st.y = 116;

    // ---- Kurzanleitung
    if (arr(S.howto).length) {
      const bh = 22 + S.howto.length * 9.4;
      doc.setFillColor(L['surface-muted']); doc.setDrawColor(L.line); doc.setLineWidth(0.6);
      doc.roundedRect(ML, st.y, CW, bh, 3, 3, 'FD');
      font('bold', 8.5, L['ink-strong']); T('So funktioniert das Formular', ML + 10, st.y + 14);
      font('normal', 7.8, L.ink);
      S.howto.forEach((ln, i) => T(ln, ML + 10, st.y + 26 + i * 9.4));
      st.y += bh + 14;
    }
    // ---- Legende
    if (arr(S.legend).length) {
      font('bold', 7.8, L['ink-strong']); T('Legende:', ML, st.y);
      const x0 = ML + width('Legende:') + 10; let x = x0;
      for (const [mk, label] of S.legend) {
        font('normal', 7.6);
        const w = 11 + width(label) + 16;
        if (x + w > PAGE_W - MR) { st.y += 12; x = x0; }
        marker(mk, x + 4, st.y - 2.2);
        font('normal', 7.6, L.ink); T(label, x + 11, st.y); x += w;
      }
      st.y += 18;
    }
    // ---- Blocker
    if (S.blockerTitle && (arr(S.blockers).length || S.blockerNote)) {
      ensure(40 + Math.min(arr(S.blockers).length, 8) * 12.5);
      font('bold', 10.5, L['ink-strong']); T(S.blockerTitle, ML, st.y + 9);
      doc.setDrawColor(L.signal); doc.setLineWidth(1.6); doc.line(ML, st.y + 13, PAGE_W - MR, st.y + 13);
      st.y += 24;
      if (!arr(S.blockers).length) { font('normal', 8, L['ink-muted']); T('Keine – gut so.', ML + 12, st.y); st.y += 12.5; }
      for (const [t, s] of arr(S.blockers)) {
        ensure(14);
        doc.setFillColor(L.signal); doc.circle(ML + 4, st.y - 2.4, 2.2, 'F');
        font('bold', 8, L['ink-strong']); T(t, ML + 12, st.y);
        const tw = width(t);
        font('normal', 8, L['ink-muted']); T(clip('– ' + s, Math.max(10, Math.floor((CW - 20 - tw) / 4))), ML + 12 + tw + 8, st.y);
        st.y += 12.5;
      }
      if (S.blockerNote) { st.y += 4; font('italic', 7.4, L['ink-muted']); T(S.blockerNote, ML, st.y); }
      st.y += 16;
    }
    // ---- Abschnitte
    if (!arr(S.sections).length) { font('normal', 9, L['ink-muted']); T('Keine Einträge für diese Auswahl.', ML, st.y + 10); st.y += 24; }
    for (const sec of arr(S.sections)) {
      sectionHead(sec.title);
      for (const it of arr(sec.items)) item(it, sec.title);
    }
    // ---- Datenschutz & Recht
    if (arr(S.dp).length) {
      const bh = 22 + S.dp.length * 9.4;
      ensure(bh + 8);
      doc.setFillColor(L['surface-muted']); doc.setDrawColor(L.signal); doc.setLineWidth(0.8);
      doc.roundedRect(ML, st.y, CW, bh, 3, 3, 'FD');
      font('bold', 8.5, L['ink-strong']); T(S.dpTitle, ML + 10, st.y + 14);
      font('normal', 7.8, L.ink);
      S.dp.forEach((ln, i) => T(ln, ML + 10, st.y + 26 + i * 9.4));
      st.y += bh + 8;
    }
    // ---- Fußzeile auf jeder Seite
    const n = doc.getNumberOfPages();
    for (let p = 1; p <= n; p++) {
      doc.setPage(p);
      doc.setDrawColor(L.line); doc.setLineWidth(0.5); doc.line(ML, PAGE_H - 33, PAGE_W - MR, PAGE_H - 33);
      font('normal', 7, L['ink-muted']); T(S.footer, ML, PAGE_H - 24); T('Seite ' + p + ' von ' + n, PAGE_W - MR, PAGE_H - 24, { align: 'right' });
    }
    if (o.print && doc.autoPrint) doc.autoPrint();
    return { doc, pages: n, items: st.idx };
  }

  return { TOKENS, STATUS, EVENT, sanitize, tasksModel, dashboardModel, deadlinesModel, budgetModel, kpiModel, leadsModel, lessonsModel, factsModel, rolesModel, meetingModel, filename, render, _: { parseDay, dayDiff, fmtD, fmtEuro, taskMarker } };
});
