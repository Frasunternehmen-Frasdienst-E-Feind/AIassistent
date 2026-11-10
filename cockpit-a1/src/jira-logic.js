/* ---- jira-logic.js ---- */
/* Feind Cockpit · Jira-Vorgänge (Projekt MAR) aus der Antwort von searchJiraIssuesUsingJql lesen. Reine Funktionen.
   Datenschutz: Bearbeiter (Name, E-Mail, Konto) werden nicht übernommen, nur ob jemand zugewiesen ist. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.FC = root.FC || {}).jira = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const str = v => (v == null ? '' : String(v));
  const safeUrl = u => (/^https:\/\/[a-z0-9-]+\.atlassian\.net\//i.test(str(u)) ? str(u) : '');
  const DAY = /^\d{4}-\d{2}-\d{2}$/;

  // payload: { issues: { nodes: [...], pageInfo: { hasNextPage } }, webUrl? } oder { issues: [...] }
  function parse(payload) {
    const box = payload && payload.issues;
    const nodes = Array.isArray(box) ? box : (box && Array.isArray(box.nodes) ? box.nodes : []);
    const rows = [];
    for (const n of nodes) {
      const f = (n && n.fields) || {};
      if (!n || !n.key || !f.summary) continue;
      const st = f.status || {};
      rows.push({
        key: str(n.key), title: str(f.summary), url: safeUrl(n.webUrl),
        status: str(st.name), cat: str(st.statusCategory && st.statusCategory.key) || 'new',
        due: DAY.test(str(f.duedate)) ? str(f.duedate) : '', prio: str(f.priority && f.priority.name),
        labels: Array.isArray(f.labels) ? f.labels.map(str) : [], assigned: !!f.assignee
      });
    }
    const more = !!(box && box.pageInfo && box.pageInfo.hasNextPage);
    return { rows, more, url: safeUrl(payload && payload.webUrl) };
  }

  // Sortierung: mit Fälligkeit zuerst (früheste oben), dann ohne Fälligkeit nach Schlüssel.
  const sort = rows => rows.slice().sort((a, b) => (a.due && b.due ? a.due.localeCompare(b.due) : a.due ? -1 : b.due ? 1 : a.key.localeCompare(b.key, 'de', { numeric: true })));
  const overdue = (row, todayYmd) => !!row.due && row.cat !== 'done' && row.due < todayYmd;

  return { parse, sort, overdue };
});
