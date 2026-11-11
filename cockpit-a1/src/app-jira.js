/* ---- app-jira.js ---- */
/* Feind Cockpit · InfraTech › Aufgaben: Jira führt (Entscheidung David 09.11.2026, Spec SPEC-quellen-jira-katalog.md).
   Liest die offenen Vorgänge im Projekt MAR lesend über den Atlassian-Connector der ansehenden Person; geschrieben wird
   in Jira selbst. Darunter die Aufgabenliste des Teams aus SharePoint. Die Notion-Liste bleibt als Spiegel stehen. */
(function () {
  'use strict';
  const FC = window.FC, app = FC.app, H = FC.helpers, J = FC.jira;
  const { h, icon } = app;
  const S = app.state;
  const CFG = { server: 'Atlassian MCP', tool: 'searchJiraIssuesUsingJql', site: 'fraesdienst-feind.atlassian.net',
    jql: 'project = MAR AND statusCategory != Done ORDER BY duedate ASC', board: 'https://fraesdienst-feind.atlassian.net/jira/software/projects/MAR' };
  const st = S.ui.jira = { state: 'idle', rows: [], more: false, url: '', code: null, at: null };
  const inViewer = () => !!(window.claude && window.claude.use);

  async function load(force) {
    if (st.state === 'busy') return;
    st.state = 'busy'; st.code = null; app.refresh();
    try {
      const r = await app.mcpRead(CFG.server, CFG.tool,
        { cloudId: CFG.site, jql: CFG.jql, maxResults: 50, fields: ['summary', 'status', 'duedate', 'priority', 'labels', 'assignee'] },
        { cache: force ? { staleTime: 0, refresh: true } : { staleTime: 120000 } });
      const p = J.parse(app.mcpBlocks(r)[0]);
      st.rows = J.sort(p.rows); st.more = p.more; st.url = p.url; st.at = app.mcpStoredAt(r); st.state = 'ok';
    } catch (e) {
      st.state = 'err'; st.code = (e && e.code) || 'upstream_error';
    }
    app.refresh();
  }

  app.jiraBox = function () {
    if (inViewer() && st.state === 'idle') setTimeout(() => load(false), 0);
    const tk = H.ymd(H.today0(new Date()));
    const src = st.state === 'ok' ? 'Quelle: Jira live · ' + H.fmtTs(new Date(st.at)) : st.state === 'err' ? 'Quelle: Jira nicht erreichbar' : 'Quelle: Jira';
    const head = h('div', { class: 'tools', style: 'margin:0;justify-content:space-between' },
      h('h3', { text: 'Jira · Projekt MAR (führend)' }),
      h('div', { class: 'row' },
        h('span', { class: 'pill ' + (st.state === 'ok' ? 'ready' : st.state === 'err' ? 'block' : 'wait'), id: 'jira-src', text: src }),
        inViewer() ? h('button', { class: 'btn small', type: 'button', id: 'jira-load', disabled: st.state === 'busy', onclick: () => load(true) }, icon('refresh'), 'Aktualisieren') : null,
        h('a', { class: 'btn small', href: st.url || CFG.board, target: '_blank', rel: 'noopener noreferrer' }, icon('ext'), 'In Jira öffnen')));
    let body;
    if (!inViewer()) body = h('p', { class: 'muted small', text: 'Die Jira-Vorgänge gibt es im geteilten Cockpit in claude.ai. Beim ersten Laden fragt claude.ai nach der Freigabe für Atlassian.' });
    else if (st.state === 'busy' || st.state === 'idle') body = app.skeleton(4, 'Lade Jira-Vorgänge');
    else if (st.state === 'err') body = h('p', { class: 'small', role: 'status', style: 'color:var(--signal-text)', text: app.mcpErrText('Atlassian (Jira)', st.code) });
    else body = st.rows.length
      ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'data' }, h('caption', { class: 'sr', text: 'Offene Jira-Vorgänge im Projekt MAR' }),
        h('thead', {}, h('tr', {}, ['Vorgang', 'Titel', 'Status', 'Fällig', 'Priorität'].map(t => h('th', { scope: 'col', text: t })))),
        h('tbody', {}, st.rows.map(r => h('tr', {},
          h('td', {}, r.url ? h('a', { href: r.url, target: '_blank', rel: 'noopener noreferrer', text: r.key }) : r.key),
          h('td', { text: r.title }),
          h('td', { text: r.status }),
          h('td', {}, r.due ? H.fmtD(r.due) : '–', J.overdue(r, tk) ? h('span', { class: 'pill over', style: 'margin-left:8px', text: 'überfällig' }) : null),
          h('td', { text: r.prio || '–' }))))))
      : h('p', { class: 'muted small', text: 'Keine offenen Vorgänge im Projekt MAR.' });
    return h('div', { class: 'section' }, head, body,
      st.more ? h('p', { class: 'muted small', text: 'Angezeigt werden die ersten 50 Vorgänge; alle weiteren in Jira.' }) : null,
      h('p', { class: 'muted small', text: 'Nur lesend. Ändern und neu anlegen bitte direkt in Jira. Bearbeiter werden aus Datenschutzgründen nicht angezeigt.' }),
      app.teamTasksBox ? h('div', { class: 'src-box' }, app.teamTasksBox()) : null);
  };
})();
