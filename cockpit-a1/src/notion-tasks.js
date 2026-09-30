/* ---- notion-tasks.js ---- */
/* Feind Cockpit · Notion-Datenbank „Aufgaben InfraTech 2027“ ↔ Cockpit-Aufgaben. Reine Funktionen:
   Zeilen der Notion-Ansicht in Aufgaben übersetzen, Änderungen in Notion-Eigenschaften, Konflikte finden.
   Notion ist führend. Das Cockpit schreibt nur Status, Notiz, Fällig, Priorität, Beschluss und Archiviert;
   Titel, Bereich, Rolle, Budget und Abhängigkeiten werden in Notion gepflegt. „Person (intern)“ wird nie gelesen. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.FC = root.FC || {}).notionTasks = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const STATUS = { open: 'offen', in_progress: 'in Arbeit', blocked: 'blockiert', deferred: 'zurückgestellt', done: 'erledigt' };
  const STATUS_IN = Object.fromEntries(Object.entries(STATUS).map(([k, v]) => [v, k]));
  const FLAG = { fakt: 'Fakt prüfen', recht: 'Recht prüfen', neu: 'neu' };
  const FLAG_IN = Object.fromEntries(Object.entries(FLAG).map(([k, v]) => [v, k]));
  const WRITABLE = ['status', 'note', 'due', 'prio', 'beschluss', 'archived'];
  const NOTION_OWNED = ['title', 'cat', 'owner', 'budget', 'deps'];
  const LABEL = { status: 'Status', note: 'Notiz', due: 'Fällig', prio: 'Priorität', beschluss: 'Beschluss', archived: 'Archiviert', title: 'Titel', cat: 'Bereich', owner: 'Zuständig', budget: 'Budget', deps: 'Blockiert durch' };
  const ISO_DAY = /^\d{4}-\d{2}-\d{2}/;

  const str = v => (v == null ? '' : String(v));
  function list(v) {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string' && v.trim().startsWith('[')) { try { const a = JSON.parse(v); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
    return [];
  }
  // Seiten-ID (32 Hex) aus einer Notion-URL oder ID, mit oder ohne Bindestriche.
  function pageId(u) {
    const s = str(u).replace(/-/g, '');
    const m = s.match(/([0-9a-f]{32})(?![0-9a-f])/i);
    return m ? m[1].toLowerCase() : null;
  }
  const day = v => (ISO_DAY.test(str(v)) ? str(v).slice(0, 10) : null);

  // Normalisierte Feldwerte für Vergleiche (leer = '').
  function norm(key, v) {
    if (key === 'archived') return v ? '1' : '';
    if (key === 'due') return day(v) || '';
    if (key === 'status') return str(v || 'open');
    return str(v).trim();
  }

  function rowToTask(row, cats, roles, idByPage) {
    const nr = str(row.Nr).replace(/\D/g, '');
    const id = str(row['Cockpit-ID']).trim() || (nr ? 'n-' + nr : '');
    if (!id || !row.url) return null;
    const cat = (cats || []).find(c => c.label === row.Bereich);
    const role = (roles || []).find(r => r.label === row['Zuständig (Rolle)']);
    const prio = str(row['Priorität']);
    const t = {
      id,
      title: str(row.Aufgabe).trim() || '(ohne Titel)',
      status: STATUS_IN[row.Status] || 'open',
      prio: /^P[012]$/.test(prio) ? prio : 'P2',
      due: day(row['date:Fällig:start']),
      note: str(row.Notiz),
      beschluss: str(row.Beschluss),
      budget: str(row.Budget),
      archived: row.Archiviert === '__YES__',
      flags: list(row.Hinweis).map(x => FLAG_IN[x]).filter(Boolean),
      source: str(row.Quelle),
      nr: nr ? +nr : null,
      _nurl: str(row.url)
    };
    if (cat) t.cat = cat.id;
    if (role) t.owner = role.key;
    const bd = list(row['Blockiert durch']);
    if (bd.length && idByPage) t.deps = bd.map(u => idByPage.get(pageId(u))).filter(Boolean);
    return t;
  }

  // Alle Zeilen → Aufgaben; doppelte Cockpit-IDs: erste gewinnt, der Rest wird gemeldet.
  function rowsToTasks(rows, cats, roles) {
    const idByPage = new Map();
    for (const r of rows || []) {
      const nr = str(r.Nr).replace(/\D/g, '');
      const id = str(r['Cockpit-ID']).trim() || (nr ? 'n-' + nr : '');
      const p = pageId(r.url);
      if (id && p) idByPage.set(p, id);
    }
    const seen = new Set(), tasks = [], dupes = [];
    for (const r of rows || []) {
      const t = rowToTask(r, cats, roles, idByPage);
      if (!t) continue;
      if (seen.has(t.id)) { dupes.push(t.id); continue; }
      seen.add(t.id);
      tasks.push(t);
    }
    return { tasks, dupes };
  }

  // Änderung aufteilen: was nach Notion geht, was nur lokal bleibt, was Notion gehört (verworfen).
  function splitPatch(patch, current, linked) {
    const notion = {}, local = {}, owned = [];
    for (const [k, v] of Object.entries(patch || {})) {
      if (!linked) { local[k] = v; continue; }
      if (WRITABLE.includes(k)) {
        if (!current || norm(k, current[k]) !== norm(k, v)) notion[k] = v;
        local[k] = v;
      } else if (NOTION_OWNED.includes(k)) {
        const same = k === 'deps' ? JSON.stringify(list(current && current[k])) === JSON.stringify(list(v)) : norm(k, current && current[k]) === norm(k, v);
        if (!same) owned.push(k);
      } else local[k] = v;
    }
    return { notion, local, owned };
  }

  function toProps(fields) {
    const p = {};
    for (const [k, v] of Object.entries(fields || {})) {
      if (k === 'status') p.Status = STATUS[v] || 'offen';
      else if (k === 'prio') p['Priorität'] = /^P[012]$/.test(str(v)) ? v : 'P2';
      else if (k === 'note') p.Notiz = str(v).slice(0, 1900);
      else if (k === 'beschluss') p.Beschluss = str(v).slice(0, 1900);
      else if (k === 'archived') p.Archiviert = v ? '__YES__' : '__NO__';
      else if (k === 'due') {
        if (day(v)) { p['date:Fällig:start'] = day(v); p['date:Fällig:is_datetime'] = 0; }
        else p['date:Fällig:start'] = null;
      }
    }
    return p;
  }

  // Neue Aufgabe aus dem Cockpit als Notion-Zeile (Titel, Bereich, Rolle nur beim Anlegen).
  function newTaskProps(id, t, cats, roleLabel, source) {
    const cat = (cats || []).find(c => c.id === t.cat);
    const p = Object.assign({
      Aufgabe: str(t.title).slice(0, 200) || '(ohne Titel)',
      'Cockpit-ID': id,
      Bereich: cat ? cat.label : 'Steuerung & Fristen',
      'Zuständig (Rolle)': roleLabel || 'Messeteam',
      Quelle: source || 'Cockpit',
      Archiviert: t.archived ? '__YES__' : '__NO__'
    }, toProps({ status: t.status || 'open', prio: t.prio || 'P2', due: t.due, note: t.note, beschluss: t.beschluss }));
    if (!day(t.due)) delete p['date:Fällig:start'];
    if (!str(t.note)) delete p.Notiz;
    if (!str(t.beschluss)) delete p.Beschluss;
    const fl = list(t.flags).map(f => FLAG[f]).filter(Boolean);
    p.Hinweis = JSON.stringify(Array.from(new Set(fl.concat(['neu']))));
    if (str(t.budget)) p.Budget = str(t.budget).slice(0, 200);
    return p;
  }

  // Felder, die in Notion seit dem angezeigten Stand geändert wurden und die dieser Schreibvorgang überschreiben würde.
  function conflicts(base, fresh, fields) {
    return Object.keys(fields || {}).filter(k => base && fresh && norm(k, base[k]) !== norm(k, fresh[k]) && norm(k, fresh[k]) !== norm(k, fields[k]));
  }

  return { STATUS, FLAG, WRITABLE, NOTION_OWNED, LABEL, pageId, rowToTask, rowsToTasks, splitPatch, toProps, newTaskProps, conflicts, norm };
});

