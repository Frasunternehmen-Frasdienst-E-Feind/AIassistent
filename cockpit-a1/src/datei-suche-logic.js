/* ---- datei-suche-logic.js ---- */
/* Feind Cockpit · Dateisuche (Wunsch David 19.10.2026): reine Funktionen für die Suche in einem freigegebenen Ordner
   und in den Ablagen SharePoint Marketing, Dropbox und Notion. Treffer = { source, name, url, where, at }. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.FC = root.FC || {}).fileSearch = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const str = v => (v == null ? '' : String(v));
  const fold = s => str(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
  const terms = q => fold(q).split(/[\s_\-.]+/).filter(Boolean);
  // Alle Suchwörter müssen vorkommen (Groß-/Kleinschreibung, Umlaute und Trenner egal).
  function matches(text, q) {
    const t = fold(text).replace(/[_\-.]+/g, ' '), ts = terms(q);
    return ts.length > 0 && ts.every(w => t.includes(w));
  }
  // Inhalt nur bei kleinen Textdateien durchsuchen; Office und PDF bleiben bei der Namenssuche.
  const TEXT_EXT = /\.(txt|md|csv|json|xml|html?|log|ics|vcf)$/i;
  const MAX_TEXT = 1024 * 1024;
  const isTextLike = (name, size) => TEXT_EXT.test(str(name)) && (size == null || size <= MAX_TEXT);
  const safeUrl = u => (/^https:\/\//i.test(str(u)) ? str(u) : '');
  const ts = v => { const d = v ? new Date(v) : null; return d && !isNaN(d) ? d.getTime() : null; };

  const SP_ROOT = 'https://fraesdienst.sharepoint.com/sites/Marketing/';
  function sharepoint(blocks) {
    const out = [];
    for (const p of blocks) {
      if (!p || typeof p !== 'object' || !p.name || !p.webUrl) continue;
      let plain = str(p.webUrl);
      try { plain = decodeURI(plain); } catch (e) { /* bleibt roh */ }
      if (!plain.startsWith(SP_ROOT)) continue; // nur SharePoint Marketing, kein persönliches OneDrive
      const rel = plain.slice(SP_ROOT.length).replace(/^Freigegebene Dokumente\//, '').replace(/\/[^/]*$/, '');
      out.push({ source: 'sharepoint', name: str(p.name), url: safeUrl(p.webUrl), where: rel || '(Wurzel)', at: ts(p.lastModifiedDateTime) });
    }
    return out;
  }
  function dropbox(blocks) {
    const out = [];
    for (const b of blocks) for (const r of (b && Array.isArray(b.results) ? b.results : [])) {
      if (!r || !r.title || r.object_type === 'deleted') continue;
      out.push({ source: 'dropbox', name: str(r.title), url: safeUrl(r.url), where: str(r.path_display).replace(/\/[^/]*$/, '') || '/', at: ts(r.last_modified) });
    }
    return out;
  }
  function notion(blocks) {
    const out = [];
    for (const b of blocks) for (const r of (b && Array.isArray(b.results) ? b.results : [])) {
      if (!r || !r.title || (r.type && r.type !== 'page' && r.type !== 'database')) continue;
      out.push({ source: 'notion', name: str(r.title), url: safeUrl(r.url), where: str(r.path) || 'Notion', at: ts(r.timestamp) });
    }
    return out;
  }
  const PARSE = { sharepoint, dropbox, notion };
  const parse = (source, blocks) => (PARSE[source] ? PARSE[source](Array.isArray(blocks) ? blocks : []) : []);

  return { matches, isTextLike, parse, MAX_TEXT };
});
