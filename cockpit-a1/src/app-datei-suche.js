/* ---- app-datei-suche.js ---- */
/* Feind Cockpit · Wissen › Eingang: „Dateien suchen“ (Wunsch David 19.10.2026). Ein Suchfeld, zwei Quellen:
   1. Ordner am Rechner: Die Person gibt einen Ordner frei; gesucht wird nur im Browser (Dateinamen, bei kleinen
      Textdateien auch der Inhalt). Nichts verlässt das Gerät, bis bei einem Treffer „Ablegen“ geklickt wird.
      Handy und Tablet erlauben keine Ordnersuche im Browser: dort öffnet der Knopf die Dateiauswahl des Geräts.
   2. Ablagen: SharePoint Marketing, Dropbox und Notion lesend über die Connectoren der ansehenden Person. */
(function () {
  'use strict';
  const FC = window.FC, app = FC.app, H = FC.helpers, F = FC.fileSearch;
  const { h, icon } = app;
  const S = app.state;
  const SOURCES = [
    ['sharepoint', 'SharePoint Marketing', 'Microsoft 365', 'sharepoint_search', q => ({ query: q, limit: 25, offset: 0 })],
    ['dropbox', 'Dropbox', 'Dropbox', 'search', q => ({ query: q, max_results: 25 })],
    ['notion', 'Notion', 'Notion', 'notion-search', q => ({ query: q, page_size: 10, max_highlight_length: 0 })]
  ];
  const MAX_HITS = 50, MAX_SCAN = 20000;
  const st = S.ui.fsearch = { q: '', files: null, folder: '', local: null, busyLocal: false, remote: {} };
  const inViewer = () => !!(window.claude && window.claude.use);
  const isTouch = () => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } };

  async function searchLocal() {
    const q = st.q.trim();
    if (!st.files || !q) return;
    st.busyLocal = true; app.refresh();
    const hits = [];
    for (const f of st.files.slice(0, MAX_SCAN)) {
      const path = f.webkitRelativePath || f.name;
      let inText = false;
      if (!F.matches(path, q) && F.isTextLike(f.name, f.size)) {
        try { inText = F.matches(await f.text(), q); } catch (e) { /* nicht lesbar: nur Name zählt */ }
      }
      if (inText || F.matches(path, q)) hits.push({ file: f, path, inText });
      if (hits.length >= MAX_HITS) break;
    }
    st.local = hits; st.busyLocal = false; app.refresh();
  }
  function pickFolder() {
    const inp = h('input', { type: 'file', multiple: true, class: 'kb-pick', tabindex: '-1', 'aria-hidden': 'true' });
    inp.setAttribute('webkitdirectory', '');
    inp.addEventListener('change', () => {
      st.files = Array.from(inp.files || []);
      st.folder = st.files.length ? String(st.files[0].webkitRelativePath || '').split('/')[0] : '';
      inp.remove();
      if (st.q.trim()) searchLocal(); else app.refresh();
    });
    inp.addEventListener('cancel', () => inp.remove());
    document.body.append(inp);
    inp.click();
  }
  async function searchRemote() {
    const q = st.q.trim();
    if (!q) return;
    await Promise.all(SOURCES.map(async ([key, , server, tool, input]) => {
      st.remote[key] = { state: 'busy' }; app.refresh();
      try {
        const r = await app.mcpRead(server, tool, input(q), { cache: { staleTime: 60000 } });
        st.remote[key] = { state: 'ok', hits: F.parse(key, app.mcpBlocks(r)).slice(0, 15), at: app.mcpStoredAt(r) };
      } catch (e) {
        st.remote[key] = { state: 'err', code: (e && e.code) || 'upstream_error' };
      }
      app.refresh();
    }));
  }

  function localPart() {
    const touch = isTouch();
    const btn = touch
      ? h('button', { class: 'btn', type: 'button', onclick: () => app.kbPickFiles && app.kbPickFiles(false) }, app.ico('ordner'), 'Auf dem Gerät suchen')
      : h('button', { class: 'btn', type: 'button', id: 'fs-folder', onclick: pickFolder }, app.ico('ordner'), st.files ? 'Anderen Ordner wählen' : 'Ordner freigeben');
    let body;
    if (touch) body = h('p', { class: 'muted small', text: 'Am Handy und Tablet erlaubt der Browser keine Ordnersuche. Die Dateiauswahl des Geräts hat eine eigene Suche; gewählte Dateien werden direkt abgelegt.' });
    else if (!st.files) body = h('p', { class: 'muted small', text: 'Gibt einen Ordner samt Unterordnern frei. Gesucht wird nur im Browser: Dateinamen, bei kleinen Textdateien auch der Inhalt. Nichts wird hochgeladen, bis du bei einem Treffer „Ablegen“ klickst.' });
    else if (st.busyLocal) body = app.skeleton(3, 'Durchsuche Ordner');
    else if (!st.local) body = h('p', { class: 'muted small', text: st.files.length + ' Dateien in „' + st.folder + '“ freigegeben. Suchbegriff eingeben.' });
    else body = st.local.length
      ? h('ul', { class: 'files' }, st.local.map(x => h('li', {},
        h('span', { text: x.file.name + (x.inText ? ' (im Inhalt)' : '') }),
        h('span', { class: 'fp', text: x.path.replace(/\/[^/]*$/, '') }),
        h('button', { class: 'btn small', type: 'button', onclick: () => app.kbIntake && app.kbIntake({ files: [x.file], texts: [] }, 'suche') }, icon('plus'), 'Ablegen'))))
      : h('p', { class: 'muted small', text: 'Keine Treffer in „' + st.folder + '“ (' + st.files.length + ' Dateien durchsucht).' });
    return h('div', {}, h('div', { class: 'label', text: touch ? 'Dieses Gerät' : 'Ordner am Rechner' }), h('div', { class: 'row', style: 'margin:6px 0 8px' }, btn), body);
  }
  function remotePart() {
    const btn = h('button', { class: 'btn', type: 'button', id: 'fs-remote', disabled: !inViewer() || !st.q.trim(), onclick: searchRemote }, icon('refresh'), 'In Ablagen suchen');
    const rows = !inViewer()
      ? [h('p', { class: 'muted small', text: 'Die Ablagen-Suche gibt es im geteilten Cockpit in claude.ai.' })]
      : SOURCES.map(([key, label, server]) => {
        const r = st.remote[key];
        let body;
        if (!r) return null;
        if (r.state === 'busy') body = app.skeleton(2, 'Suche in ' + label);
        else if (r.state === 'err') body = h('p', { class: 'small', role: 'status', style: 'color:var(--signal-text)', text: app.mcpErrText(server, r.code) });
        else body = r.hits.length
          ? h('ul', { class: 'files' }, r.hits.map(x => h('li', {},
            x.url ? h('a', { href: x.url, target: '_blank', rel: 'noopener noreferrer', text: x.name }) : h('span', { text: x.name }),
            h('span', { class: 'fd', text: x.at ? H.fmtTs(new Date(x.at)) : '–' }),
            h('span', { class: 'fp', text: x.where }))))
          : h('p', { class: 'muted small', text: 'Keine Treffer.' });
        return h('div', {}, h('h4', { class: 'small', text: label }), body);
      });
    return h('div', {}, h('div', { class: 'label', text: 'Ablagen · SharePoint, Dropbox, Notion' }), h('div', { class: 'row', style: 'margin:6px 0 8px' }, btn),
      rows.some(Boolean) ? rows : h('p', { class: 'muted small', text: 'Lesend mit deinen Connectoren; funktioniert auf allen Geräten. Lokale Dateien findet nur die Ordnersuche.' }));
  }

  app.fileSearchBox = function () {
    const q = h('input', { type: 'search', id: 'fs-q', value: st.q, placeholder: 'Dateiname oder Stichwort', autocomplete: 'off' });
    q.addEventListener('input', () => { st.q = q.value; const b = document.getElementById('fs-remote'); if (b) b.disabled = !inViewer() || !st.q.trim(); });
    q.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (st.files) searchLocal(); if (inViewer()) searchRemote(); } });
    return h('div', { class: 'section' }, h('h3', { text: 'Dateien suchen' }),
      h('div', { class: 'field grow' }, h('label', { for: 'fs-q', text: 'Suchbegriff' }), q),
      h('div', { class: 'grid2' }, localPart(), remotePart()),
      h('p', { class: 'muted small', text: 'Treffer können personenbezogene Dateien enthalten: Solche nur mit dokumentierter Einwilligung ablegen.' }));
  };
})();
