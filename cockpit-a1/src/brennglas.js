/* ---- brennglas.js ---- */
/* Feind Cockpit · Brennglas-PDF (Layout wie „Brennglas InfraTech 2027“, 01.10.2026): A4 hoch, Ränder 15 mm,
   grüner Balken oben, Titel 22 pt, Untertitel mit Datenstand, Kopffelder Datum/Teilnehmende/Protokoll,
   Kennzahl-Kacheln, Tabellen mit Anthrazit-Kopf und Zebra, Fließtext 10 pt (nichts kleiner), ausfüllbare
   Felder (AcroForm) mit fest gezeichnetem Rahmen, Abschluss „Weitere Notizen (optional)“ und Freigabe.
   jsPDF wird erst beim ersten PDF von cdnjs geladen. Nur WinAnsi-Zeichen; Kontaktdaten werden entfernt.
   Farben: CI-Werte aus branding/feind-ci.tokens.json (Druck immer im hellen Schema). */
(function () {
  'use strict';
  const FC = window.FC;
  // jsPDF 4.2.1 statt 2.5.1 (für 2.x gibt es veröffentlichte Sicherheitshinweise); SRI-Hash von cdnjs: Der Browser führt nur genau diese Datei aus.
  const SRC = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/4.2.1/jspdf.umd.min.js';
  const SRI = 'sha512-plOdviVmws4Y3JAvbnpfKb2hVxKM1lCwsi3vmElYRj+tiDLffZ4FVUj5a8vyKJ9pIgl8JCAHEJ4D1iUKBecswg==';
  let libP = null;
  function loadLib() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf);
    if (!libP) {
      libP = new Promise((resolve, reject) => {
        const sc = document.createElement('script');
        sc.src = SRC;
        sc.integrity = SRI;
        sc.crossOrigin = 'anonymous';
        sc.referrerPolicy = 'no-referrer';
        sc.async = true;
        sc.onload = () => (window.jspdf && window.jspdf.jsPDF ? resolve(window.jspdf) : reject(new Error('PDF-Bibliothek nicht ladbar')));
        sc.onerror = () => { libP = null; sc.remove(); reject(new Error('PDF-Bibliothek nicht ladbar')); };
        (document.head || document.body).append(sc);
      });
    }
    return libP;
  }

  /* ---------- Text: Datenschutz und Zeichensatz ---------- */
  const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  const PHONE = /(?:\+|00)\d{2}[\s\d/-]{6,}\d|(?:Tel\.?|Telefon|Mobil|Fax)[:\s]*[\d+][\d\s/-]{5,}\d|\b0\d{2,5}[\s/-]\d{3,}(?:[\s-]\d+)*/gi;
  // Exporte ohne Kontaktdaten und ohne Personennamen (der Plan nennt den Marketing-Verantwortlichen beim Vornamen).
  function scrub(s) {
    return String(s == null ? '' : s)
      .replace(/\[([^\]]*)\]\((?:mailto:|https?:)[^)]*\)/g, '$1')
      .replace(EMAIL, '[E-Mail entfernt]')
      .replace(PHONE, '[Telefon entfernt]')
      .replace(/\bDavid\b/g, 'Marketing')
      .replace(/\\([|~*_`[\]\\#>+\-.!])/g, '$1');
  }
  const CP1252 = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
  const MAP = { '≥': 'mind. ', '≤': 'max. ', '→': ' > ', '←': ' < ', '↗': '', '✓': 'x', '✔': 'x', '−': '-', '▲': '+', '▼': '-', '≈': 'ca. ',
    '⌘': 'Cmd', '①': '(1)', '②': '(2)', '③': '(3)', '④': '(4)', ' ': ' ', ' ': ' ', '‑': '-', '­': '', '\t': ' ', '\r': '' };
  function win(s) {
    let out = '';
    for (const ch of String(s)) {
      if (MAP[ch] != null) { out += MAP[ch]; continue; }
      const c = ch.codePointAt(0);
      if (c === 10 || (c >= 32 && c < 127) || (c >= 160 && c <= 255) || CP1252.includes(ch)) out += ch;
    }
    return out.replace(/[ ]{2,}/g, ' ');
  }
  const txt = s => win(scrub(s)).trim();

  /* ---------- Layout ---------- */
  const PT = 72 / 25.4;
  const C = { green: '#84bb20', anth: '#424e4e', red: '#e3000b', sig: '#b8000a', text: '#3c5457', muted: '#6b7575', line: '#d5dada', area: '#f2f4f4', white: '#ffffff' };
  const FS = 10, LD = 13.5, P = 5;
  const COLOR = { signal: C.sig, muted: C.muted, strong: C.anth };

  async function build(spec) {
    const lib = await loadLib();
    const { jsPDF, AcroFormTextField, AcroFormCheckBox } = lib;
    const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
    const PW = doc.internal.pageSize.getWidth(), PH = doc.internal.pageSize.getHeight();
    const ML = 15 * PT, W = PW - 2 * ML, TOP = 15 * PT, BOTTOM = PH - 17 * PT;
    const title = 'Brennglas ' + spec.name;
    let y = TOP;
    const names = new Set();
    const uniq = n => { const b = String(n || 'Feld').replace(/[^A-Za-z0-9_]/g, '_').slice(0, 60); let k = b, i = 2; while (names.has(k)) k = b + '_' + i++; names.add(k); return k; };

    const font = (style, size, color) => { doc.setFont('helvetica', style || 'normal'); doc.setFontSize(size || FS); doc.setTextColor(color || C.text); };
    const bar = () => { doc.setFillColor(C.green); doc.rect(0, 0, PW, 6, 'F'); };
    bar();
    const newPage = () => { doc.addPage(); bar(); y = TOP; };
    const need = hh => { if (y + hh > BOTTOM) newPage(); };
    const split = (t, w, style, size) => { font(style, size); return doc.splitTextToSize(txt(t), Math.max(10, w)); };
    // Zeilen oben bündig ab y0 setzen (Grundlinie aus Schriftgröße und Zeilenabstand).
    function put(ls, x, y0, lead, size, align, w) {
      ls.forEach((l, i) => {
        const by = y0 + i * lead + size * 0.78 + (lead - size) / 2;
        if (align === 'right') doc.text(l, x + w, by, { align: 'right' });
        else if (align === 'center') doc.text(l, x + w / 2, by, { align: 'center' });
        else doc.text(l, x, by);
      });
    }
    function textField(x, yy, w, hh, name) {
      doc.setDrawColor(C.line); doc.setFillColor(C.white); doc.setLineWidth(0.8);
      doc.rect(x, yy, w, hh, 'FD');
      const f = new AcroFormTextField();
      f.fieldName = uniq(name);
      f.Rect = [x, yy, w, hh];
      f.fontSize = FS;
      f.multiline = hh > 24;
      f.value = '';
      doc.addField(f);
    }
    function checkBox(x, yy, name) {
      const s = 11;
      doc.setDrawColor(C.anth); doc.setFillColor(C.white); doc.setLineWidth(0.8);
      doc.rect(x, yy, s, s, 'FD');
      const c = new AcroFormCheckBox();
      c.fieldName = uniq(name);
      c.Rect = [x, yy, s, s];
      c.appearanceState = 'Off';
      doc.addField(c);
    }
    function label(text, optional, x, yy) {
      font('bold', FS, C.anth);
      const t = txt(text);
      doc.text(t, x, yy + FS * 0.78 + 1.75);
      if (optional) { const lw = doc.getTextWidth(t) + 4; font('normal', FS, C.muted); doc.text('(optional)', x + lw, yy + FS * 0.78 + 1.75); }
    }
    function fieldRow(items, hh) {
      const fh = hh || 18, gap = 8, cw = (W - gap * (items.length - 1)) / items.length;
      need(16 + fh + 10);
      items.forEach((it, i) => { const x = ML + i * (cw + gap); label(it.label, it.optional, x, y); textField(x, y + 16, cw, fh, it.name); });
      y += 16 + fh + 10;
    }

    /* Kopf */
    font('bold', 22, C.anth);
    const tl = doc.splitTextToSize(txt(title), W);
    put(tl, ML, y, 26, 22); y += tl.length * 26 + 2;
    font('normal', 11, C.muted);
    const sl = doc.splitTextToSize(txt(spec.subtitle || ''), W);
    put(sl, ML, y, 15, 11); y += sl.length * 15 + 10;
    if (spec.meta !== false) fieldRow([{ label: 'Datum', name: 'Meta_Datum' }, { label: 'Teilnehmende', name: 'Meta_Teilnehmende' }, { label: 'Protokoll', name: 'Meta_Protokoll' }]);

    /* Kennzahl-Kacheln: Fläche, farbige Oberlinie (Grün, Rot nur als Signal) */
    function kpis(list) {
      const per = Math.min(4, list.length), gap = 4, tw = (W - gap * (per - 1)) / per;
      for (let i = 0; i < list.length; i += per) {
        const row = list.slice(i, i + per);
        const meas = row.map(k => ({ v: split(k.v, tw - 16, 'bold', 15), l: split(k.k, tw - 16, 'normal', FS) }));
        const hh = 16 + Math.max(...meas.map(m => m.v.length * 18 + 2 + m.l.length * LD));
        need(3 + hh + 14);
        y += 3;
        row.forEach((k, j) => {
          const x = ML + j * (tw + gap);
          doc.setFillColor(C.area); doc.rect(x, y, tw, hh, 'F');
          doc.setFillColor(k.signal ? C.red : C.green); doc.rect(x, y - 3, tw, 3, 'F');
          font('bold', 15, C.anth); put(meas[j].v, x + 8, y + 8, 18, 15);
          font('normal', FS, C.muted); put(meas[j].l, x + 8, y + 8 + meas[j].v.length * 18 + 2, LD, FS);
        });
        y += hh + 14;
      }
    }
    function heading(t) {
      need(6 + 18 + 6 + 3 * LD);
      y += 6;
      font('bold', 14, C.anth);
      const ls = doc.splitTextToSize(txt(t), W);
      put(ls, ML, y, 18, 14);
      y += ls.length * 18 + 6;
    }
    function para(t, style) {
      const st = style === 'signal' ? ['bold', C.sig] : style === 'muted' ? ['normal', C.muted] : style === 'strong' ? ['bold', C.anth] : ['normal', C.text];
      const ls = split(t, W, st[0], FS);
      for (const l of ls) { need(LD); font(st[0], FS, st[1]); put([l], ML, y, LD, FS); y += LD; }
      y += 6;
    }
    function bullets(list) {
      for (const b of list) {
        const ls = split(b, W - 12, 'normal', FS);
        need(ls.length * LD);
        font('normal', FS, C.text);
        doc.text('•', ML + 1, y + FS * 0.78 + (LD - FS) / 2);
        put(ls, ML + 12, y, LD, FS);
        y += ls.length * LD + 1;
      }
      y += 6;
    }

    /* Tabelle: Kopf Anthrazit mit weißer fetter Schrift, Zebra, Linien; Zellen Text, Kästchen oder Feld */
    function measure(cell, w) {
      if (cell && typeof cell === 'object' && cell.check) return { kind: 'check', h: 11, cell };
      if (cell && typeof cell === 'object' && cell.field) return { kind: 'field', h: cell.h || 18, cell };
      const c = cell && typeof cell === 'object' ? cell : { t: cell };
      const style = c.bold || c.color === 'signal' ? 'bold' : 'normal';
      const ls = split(c.t == null || c.t === '' ? '–' : c.t, w, style, FS);
      const sub = c.sub ? split(c.sub, w, 'normal', FS) : [];
      return { kind: 'text', h: (ls.length + sub.length) * LD, ls, sub, style, color: c.bold ? C.anth : COLOR[c.color] || C.text, cell: c };
    }
    function table(t) {
      const cols = t.cols;
      const fixed = cols.reduce((s, c) => s + (c.w ? c.w * PT : 0), 0);
      const stars = cols.filter(c => !c.w).length || 1;
      const ws = cols.map(c => (c.w ? c.w * PT : (W - fixed) / stars));
      font('bold', FS, C.white);
      const hl = cols.map((c, i) => doc.splitTextToSize(txt(c.t), ws[i] - 2 * P));
      const hh = Math.max(...hl.map(l => l.length)) * LD + 2 * P;
      const maxBody = BOTTOM - TOP - hh - 2 * P;
      const drawHead = () => {
        doc.setFillColor(C.anth); doc.rect(ML, y, W, hh, 'F');
        font('bold', FS, C.white);
        let x = ML;
        cols.forEach((c, i) => { put(hl[i], x + P, y + P, LD, FS, c.align, ws[i] - 2 * P); x += ws[i]; });
        y += hh;
      };
      const rows = (t.rows || []).map(r => {
        const cells = Array.isArray(r) ? r : r.cells;
        const m = cells.map((cell, i) => measure(cell, ws[i] - 2 * P));
        for (const x of m) if (x.kind === 'text' && x.h > maxBody) { const keep = Math.floor(maxBody / LD) - 1; x.ls = x.ls.slice(0, keep).concat(['…']); x.sub = []; x.h = (keep + 1) * LD; }
        return { m, total: !Array.isArray(r) && r.total, h: Math.max(...m.map(x => x.h)) + 2 * P };
      });
      need(hh + (rows[0] ? rows[0].h : 0));
      drawHead();
      rows.forEach((r, ri) => {
        if (y + r.h > BOTTOM) { newPage(); drawHead(); }
        if (ri % 2 === 1 && t.zebra !== false && !r.total) { doc.setFillColor(C.area); doc.rect(ML, y, W, r.h, 'F'); }
        if (r.total) { doc.setDrawColor(C.anth); doc.setLineWidth(1.2); doc.line(ML, y, ML + W, y); }
        let x = ML;
        r.m.forEach((m, i) => {
          const cw = ws[i] - 2 * P, al = cols[i].align, top = y + (r.h - m.h) / 2;
          if (m.kind === 'check') checkBox(al === 'left' ? x + P : x + (ws[i] - 11) / 2, top, m.cell.check);
          else if (m.kind === 'field') textField(x + P, top, cw, m.h, m.cell.field);
          else {
            font(r.total ? 'bold' : m.style, FS, r.total ? C.anth : m.color);
            put(m.ls, x + P, top, LD, FS, al, cw);
            if (m.sub.length) { font('normal', FS, C.muted); put(m.sub, x + P, top + m.ls.length * LD, LD, FS, al, cw); }
          }
          x += ws[i];
        });
        y += r.h;
        doc.setDrawColor(C.line); doc.setLineWidth(0.5); doc.line(ML, y, ML + W, y);
      });
      if (!rows.length) { font('normal', FS, C.muted); need(LD + 2 * P); put([txt(t.empty || 'Keine Einträge.')], ML + P, y + P, LD, FS); y += LD + 2 * P; }
      y += 12;
    }

    if (spec.kpis && spec.kpis.length) kpis(spec.kpis);
    for (const b of spec.blocks || []) {
      if (!b) continue;
      if (b.h) heading(b.h);
      else if (b.p != null) para(b.p, b.style);
      else if (b.bullets) bullets(b.bullets);
      else if (b.table) table(b.table);
      else if (b.field) { const f = b.field; need(16 + (f.h || 18) + 10); label(f.label, f.optional, ML, y); textField(ML, y + 16, W, f.h || 18, f.name); y += 16 + (f.h || 18) + 10; }
      else if (b.fields) fieldRow(b.fields, b.h);
      else if (b.pagebreak) newPage();
    }

    /* Abschluss: Weitere Notizen (optional), Protokoll freigegeben / Datum */
    const tail = 16 + 18 + 10;
    if (BOTTOM - y < 16 + 80 + 10 + tail) newPage();
    const nh = Math.max(80, Math.min(240, BOTTOM - y - 16 - 10 - tail - 2));
    label('Weitere Notizen', true, ML, y);
    textField(ML, y + 16, W, nh, 'Weitere_Notizen');
    y += 16 + nh + 10;
    fieldRow([{ label: spec.approval || 'Protokoll freigegeben', name: 'Freigabe' }, { label: 'Datum', name: 'Freigabe_Datum' }]);

    /* Fußzeile auf jeder Seite */
    const n = doc.getNumberOfPages();
    const day = FC.helpers.fmtD(new Date());
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      font('normal', FS, C.muted);
      doc.text(txt(title + ' · ' + day + ' · intern'), ML, PH - 9 * PT);
      doc.text('Seite ' + i, PW - ML, PH - 9 * PT, { align: 'right' });
    }
    doc.setProperties({ title: txt(title), subject: txt(spec.subject || spec.subtitle || title), author: 'Marketing, Fräsdienst-Service E. Feind GmbH', creator: 'Feind Cockpit' });
    if (spec.autoPrint) doc.autoPrint();
    return { bytes: doc.output('arraybuffer'), pages: n, fields: names.size };
  }

  FC.brennglas = { build, loadLib, scrub, win, txt };
})();
