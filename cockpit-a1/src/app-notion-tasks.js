/* ---- app-notion-tasks.js ---- */
/* Feind Cockpit · InfraTech-Aufgaben live aus Notion („Aufgaben InfraTech 2027“) und zurück.
   Lesen: Standardansicht der Datenbank, alle Seiten, jede Minute (nur bei sichtbarer Seite).
   Schreiben: über den Notion-Connector der ansehenden Person; vor jedem Schreiben wird neu gelesen, geänderte
   Felder werden erst nach Rückfrage überschrieben. Ohne Notion-Zugang: letzter Notion-Stand aus dem Speicher
   (notion/tasks), nur lesend. Der Speicher tasks/* bleibt Zwischenstand und trägt Links und Anhänge. */
(function () {
  'use strict';
  const FC = window.FC, app = FC.app, H = FC.helpers, D = FC.data, N = FC.notionTasks;
  const { h } = app;
  const S = app.state;
  const CFG = {
    server: 'Notion', read: 'notion-query-data-sources', update: 'notion-update-page', create: 'notion-create-pages',
    view: 'https://app.notion.com/p/5718273f9a2c4ba085d5da4e62c0c878?v=5d6e27b172f5476aaaead24fc9de1085',
    db: 'https://app.notion.com/p/5718273f9a2c4ba085d5da4e62c0c878',
    ds: 'b640ffee-6dfd-4324-b3d6-4b1f2fec0153',
    snapshot: 'notion/tasks'
  };
  const MEETING_NOTE = 'Aus Messe-Abstimmung';
  const nt = S.notionTasks = { state: 'off', text: '', tasks: [], byId: new Map(), at: null, dupes: [], snap: null, busy: 0, lastSnapHash: '' };
  const inViewer = () => !!(window.claude && window.claude.use);
  const errText = code => (app.mcpErrText ? app.mcpErrText(CFG.server, code) : 'Notion-Abfrage fehlgeschlagen (' + code + ').');
  const fmtAt = at => (at ? H.fmtTs(new Date(at)) : '–');

  function setTasks(tasks, dupes) {
    nt.tasks = tasks;
    nt.byId = new Map(tasks.map(t => [t.id, t]));
    nt.dupes = dupes || [];
  }
  // Aufgaben-Dokumente fürs Modell: Speicher zuerst, Notion zuletzt (Notion gewinnt je Feld).
  app.taskDocs = () => (S.data.tasks || []).concat(nt.tasks);
  app.notionLinked = t => !!(t && t._nurl);
  app.notionLive = () => nt.state === 'live';

  let mcpP = null;
  function useMcp() {
    if (!inViewer()) return Promise.resolve(null);
    if (!mcpP) mcpP = window.claude.use('mcp').catch(() => null);
    return mcpP;
  }

  async function fetchAll(mcp, fresh) {
    let rows = [], cursor = null, at = null, n = 0;
    do {
      const input = { data: { mode: 'view', view_url: CFG.view, page_size: 100 } };
      if (cursor) input.data.start_cursor = cursor;
      const r = await mcp.callTool(CFG.server, CFG.read, input, { cache: fresh ? { refresh: true } : { staleTime: 20000 } });
      let p = r && r.payload;
      if (typeof p === 'string') { try { p = JSON.parse(p); } catch (e) { p = null; } }
      if (!p || !Array.isArray(p.results)) throw { code: 'tool_error' };
      rows = rows.concat(p.results);
      if (!at) at = (r.cache && r.cache.storedAt) || Date.now();
      cursor = p.has_more && p.next_cursor ? p.next_cursor : null;
    } while (cursor && ++n < 20);
    return { rows, at };
  }

  function apply(rows, at) {
    const r = N.rowsToTasks(rows, D.CATS, D.ROLES);
    setTasks(r.tasks, r.dupes);
    nt.state = 'live';
    nt.at = at;
    nt.text = 'Live aus Notion · ' + r.tasks.length + ' Aufgaben · Stand ' + fmtAt(at);
    saveSnapshot();
  }

  // Letzten Notion-Stand für Ansichten ohne Notion-Zugang ablegen (nur bei Änderung, höchstens alle 5 Minuten).
  let snapAt = 0;
  function saveSnapshot() {
    if (!S.store || S.readOnly || S.store.mode !== 'shared') return;
    const tasks = nt.tasks.map(t => { const o = Object.assign({}, t); return o; });
    const hash = JSON.stringify(tasks);
    if (hash === nt.lastSnapHash || Date.now() - snapAt < 5 * 60 * 1000 && nt.lastSnapHash) return;
    if (nt.snap && JSON.stringify(nt.snap.tasks || []) === hash) { nt.lastSnapHash = hash; return; }
    nt.lastSnapHash = hash;
    snapAt = Date.now();
    S.store.write(CFG.snapshot, 'set', { at: nt.at || Date.now(), tasks }).catch(() => false);
  }

  function useSnapshot(reason) {
    if (reason) nt.reason = reason; else reason = nt.reason || '';
    const s = nt.snap;
    if (s && Array.isArray(s.tasks) && s.tasks.length) {
      setTasks(s.tasks, []);
      nt.text = 'Notion-Stand vom ' + fmtAt(s.at) + ' · nur lesen' + (reason ? ' · ' + reason : '');
    } else nt.text = 'Notion nicht erreichbar, Anzeige aus dem Cockpit-Speicher' + (reason ? ' · ' + reason : '');
  }

  const RETRACT = new Set(['needs_reauth', 'server_not_connected', 'blocked_by_policy', 'approval_required', 'not_in_manifest', 'selection_required', 'consent_required']);
  let loading = null;
  async function load(fresh) {
    if (loading) return loading;
    loading = (async () => {
      const mcp = await useMcp();
      if (!mcp) { nt.state = 'off'; useSnapshot(inViewer() ? 'Notion in dieser Ansicht nicht verfügbar' : 'Live-Daten nur in claude.ai'); app.refresh(); return false; }
      try {
        const { rows, at } = await fetchAll(mcp, fresh);
        apply(rows, at);
        app.refresh();
        return true;
      } catch (e) {
        const code = (e && e.code) || 'upstream_error';
        if (RETRACT.has(code) || nt.state !== 'live') { nt.state = code === 'server_unavailable' ? 'warn' : 'err'; useSnapshot(errText(code)); }
        else nt.text = 'Live aus Notion · Stand ' + fmtAt(nt.at) + ' · Aktualisierung fehlgeschlagen: ' + errText(code);
        app.refresh();
        return false;
      }
    })();
    try { return await loading; } finally { loading = null; }
  }
  app.notionReload = () => load(true);

  /* ---------- Schreiben ---------- */
  const show = (k, v) => (k === 'status' ? N.STATUS[v] || v : k === 'archived' ? (v ? 'ja' : 'nein') : k === 'due' ? (v ? H.fmtD(v) : 'ohne Termin') : H.str(v) || 'leer');
  function findTask(id) {
    return app.tasks().concat(FC.model.allTasks(D.TASKS, app.taskDocs(), true)).find(t => t.id === id) || null;
  }
  function roleLabel(owner) {
    const r = D.ROLES.find(x => x.key === owner);
    if (r) return r.label;
    const l = app.ownerRole ? app.ownerRole(owner) : '';
    return D.ROLES.some(x => x.label === l) ? l : 'Messeteam';
  }
  function writeFailed(e, what) {
    const code = (e && e.code) || 'upstream_error';
    if (code === 'server_unavailable' || code === 'upstream_error' || code === 'cancelled') {
      app.toast('Notion hat nicht rechtzeitig geantwortet. ' + what + ' ist vielleicht trotzdem gespeichert. Der Stand wird neu geladen, bitte prüfen.', true);
    } else if (code === 'tool_error') app.toast('Notion hat die Änderung abgelehnt: ' + H.str(e.message).slice(0, 160), true);
    else app.toast(errText(code), true);
    setTimeout(() => load(true), 1500);
  }

  async function writeNotion(cur, fields) {
    const mcp = await useMcp();
    if (!mcp) { app.toast('Notion ist in dieser Ansicht nicht verfügbar: Änderung nicht gespeichert.', true); return false; }
    nt.busy++;
    try {
      try { const { rows, at } = await fetchAll(mcp, true); apply(rows, at); }
      catch (e) { app.toast('Notion-Stand konnte nicht geprüft werden: ' + errText((e && e.code) || 'upstream_error'), true); return false; }
      const fresh = nt.byId.get(cur.id);
      if (!fresh) { app.toast('Diese Aufgabe gibt es in Notion nicht mehr. Bitte in Notion prüfen.', true); app.refresh(); return false; }
      const cf = N.conflicts(cur, fresh, fields);
      if (cf.length) {
        const ok = await app.confirm({
          title: 'In Notion inzwischen geändert',
          text: cf.map(k => N.LABEL[k] + ': in Notion jetzt „' + show(k, fresh[k]) + '“, vorher „' + show(k, cur[k]) + '“').join(' · ') + '. Mit deinem Wert überschreiben?',
          confirmLabel: 'Überschreiben'
        });
        if (!ok) { app.refresh(); return false; }
      }
      try {
        await mcp.callTool(CFG.server, CFG.update, { page_id: N.pageId(fresh._nurl), command: 'update_properties', properties: N.toProps(fields) }, { cache: false });
      } catch (e) { writeFailed(e, 'Die Änderung'); return false; }
      Object.assign(fresh, fields);
      setTasks(nt.tasks.slice(), nt.dupes);
      if (mcp.invalidate) mcp.invalidate(CFG.server, CFG.read).catch(() => {});
      return true;
    } finally { nt.busy--; }
  }

  async function createNotion(id, t) {
    const mcp = await useMcp();
    if (!mcp) return false;
    const source = H.str(t.note).startsWith(MEETING_NOTE) ? 'Meeting' : 'Cockpit';
    const props = N.newTaskProps(id, t, D.CATS, roleLabel(t.owner), source);
    nt.busy++;
    try {
      await mcp.callTool(CFG.server, CFG.create, { parent: { type: 'data_source_id', data_source_id: CFG.ds }, pages: [{ properties: props }], allow_async: false }, { cache: false });
      if (mcp.invalidate) mcp.invalidate(CFG.server, CFG.read).catch(() => {});
      load(true);
      return true;
    } catch (e) { writeFailed(e, 'Die neue Aufgabe'); return false; }
    finally { nt.busy--; }
  }

  // Alle Aufgaben-Schreibvorgänge (Liste, Dialog, Meeting-Modus) laufen hier durch.
  const origPatch = app.cmd.tasks.patch;
  app.cmd.tasks.patch = async function (id, patch) {
    const cur = findTask(id);
    const linked = app.notionLinked(cur);
    if (linked) {
      const sp = N.splitPatch(patch, cur, true);
      if (sp.owned.length) app.toast(sp.owned.map(k => N.LABEL[k]).join(', ') + ' wird in Notion gepflegt und wurde hier nicht geändert.');
      if (Object.keys(sp.notion).length) {
        if (nt.state !== 'live') { app.toast('Notion ist nicht verbunden: Status, Notiz, Termin, Priorität und Beschluss lassen sich gerade nur in Notion ändern.', true); return false; }
        if (S.readOnly) return origPatch(id, sp.local);
        if (!await writeNotion(cur, sp.notion)) { app.refresh(); return false; }
      }
      if (!Object.keys(sp.local).length) { app.refresh(); return true; }
      const ok = await origPatch(id, sp.local);
      app.refresh();
      return ok;
    }
    const isNew = !cur && patch && patch.custom && H.str(patch.title);
    const ok = await origPatch(id, isNew ? Object.assign({}, patch, { notionPending: true }) : patch);
    if (ok && isNew && nt.state === 'live') {
      if (await createNotion(id, patch)) origPatch(id, { notionPending: false });
      else app.toast('Aufgabe im Cockpit gespeichert, aber noch nicht in Notion. Über „Nach Notion übertragen“ nachholen.', true);
    }
    return ok;
  };

  // Im Cockpit angelegte Aufgaben, die (noch) nicht in Notion stehen.
  function pending() {
    if (nt.state !== 'live') return [];
    return FC.model.allTasks(D.TASKS, S.data.tasks || []).filter(t => t.custom && !nt.byId.has(t.id));
  }
  async function pushPending() {
    const list = pending();
    let n = 0;
    for (const t of list) { if (await createNotion(t.id, t)) { n++; await origPatch(t.id, { notionPending: false }); } else break; }
    app.toast(n + ' von ' + list.length + ' Aufgaben nach Notion übertragen.', n < list.length);
  }

  /* ---------- Statuszeile im Aufgaben-Modul ---------- */
  app.notionTaskStatus = function () {
    const cls = nt.state === 'live' ? 'live' : nt.state === 'warn' ? 'warn' : nt.state === 'err' ? 'err' : '';
    const pend = pending();
    return h('div', { class: 'sync-line ' + cls, role: 'status', id: 'it-notion' },
      h('span', { class: 'dot', 'aria-hidden': 'true' }),
      h('span', { text: nt.text || 'Notion-Anbindung wird geprüft …' }),
      nt.dupes.length ? h('span', { class: 'pill flag', text: 'Doppelte Cockpit-ID in Notion: ' + Array.from(new Set(nt.dupes)).join(', ') }) : null,
      pend.length && !app.ro() ? h('button', { class: 'btn small', type: 'button', onclick: pushPending }, pend.length + ' nach Notion übertragen') : null,
      inViewer() ? h('button', { class: 'linkbtn', type: 'button', onclick: () => load(true) }, 'Neu laden') : null,
      h('a', { href: CFG.db, target: '_blank', rel: 'noopener', class: 'small' }, 'In Notion öffnen'));
  };

  /* ---------- Start ---------- */
  let started = false;
  function start() {
    if (started) return;
    started = true;
    const cf = app.cfg ? app.cfg() : {};
    const wait = setInterval(() => {
      if (!S.store) return;
      clearInterval(wait);
      S.store.watchDoc(CFG.snapshot, v => {
        nt.snap = v;
        if (v && Array.isArray(v.tasks)) nt.lastSnapHash = nt.lastSnapHash || JSON.stringify(v.tasks);
        if (nt.state !== 'live') { useSnapshot(''); app.refresh(); }
      });
    }, 200);
    if (cf && cf.features && cf.features.notionTasks === false) { nt.text = 'Notion-Aufgaben per Administration deaktiviert'; return; }
    load(false);
    setInterval(() => { if (!document.hidden && !nt.busy) load(false); }, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && nt.at && Date.now() - nt.at > 60000) load(false); });
  }
  const origBoot = app.boot;
  app.boot = function () { const r = origBoot.apply(this, arguments); start(); return r; };
})();

