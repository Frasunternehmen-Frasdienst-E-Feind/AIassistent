/* app.js – Oberfläche der Stempeluhr. Logik: zeit.js, Startdaten: seed-data.js */
(function () {
  'use strict';
  const Z = window.Zeit;
  const STORAGE_KEY = 'zeiterfassung.v1';

  // ---------- Zustand ----------
  let state = load();
  let activeTab = 'days';
  let filterMonth = 'all';

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        return { bookings: s.bookings || [], settings: { ...Z.DEFAULT_SETTINGS, ...(s.settings || {}) } };
      }
    } catch (e) { /* localStorage nicht verfügbar */ }
    return { bookings: window.ZeitSeed ? window.ZeitSeed.bookings() : [], settings: { ...Z.DEFAULT_SETTINGS } };
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { toast('Speichern im Browser nicht möglich.'); }
  }

  function ctx() {
    const now = new Date();
    return { today: Z.todayISO(now), nowMinutes: now.getHours() * 60 + now.getMinutes(), now };
  }

  // ---------- Helfer ----------
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dur = (m, o) => Z.formatDuration(m, o);
  const signClass = m => (m > 0 ? 'pos' : m < 0 ? 'neg' : '');
  let toastTimer;
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  // ---------- Rendern ----------
  function render() {
    const c = ctx();
    const days = Z.computeDays(state.bookings, state.settings, c);
    const weeks = Z.computeWeeks(days);
    const totals = Z.computeTotals(days);
    renderClock(c);
    renderPunch(c, days);
    renderKpis(c, days, weeks, totals);
    renderDays(days);
    renderBookings(c);
    renderWeeks(weeks);
    renderSettings();
    $('data-info').textContent = state.bookings.length + ' Buchungen an ' + days.length + ' Tagen'
      + (days.length ? ' (' + Z.toGermanDate(days[days.length - 1].date) + ' bis ' + Z.toGermanDate(days[0].date) + ')' : '') + '.';
  }

  function renderClock(c) {
    $('clock-time').textContent = Z.nowHM(c.now);
    $('clock-date').textContent = c.now.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
      + ' · KW ' + Z.isoWeek(c.today).week;
  }

  function renderPunch(c, days) {
    const { state: st, open } = Z.clockState(state.bookings, c.today);
    const dot = $('state-dot'); dot.className = 'dot ' + (st === 'out' ? '' : st);
    const today = days.find(d => d.date === c.today);
    const txt = { out: 'Ausgestempelt', working: 'Arbeitszeit läuft', break: 'Pause läuft' }[st];
    $('state-text').textContent = txt;
    let since = '';
    if (open) since = 'seit ' + open.start + ' Uhr · ' + dur(Z.bookingMinutes(open, c)) + ' h';
    else if (today && today.lastOut) since = 'Heute ' + today.firstIn + ' – ' + today.lastOut + ' Uhr · ' + dur(today.workMin) + ' h netto';
    else since = 'Heute noch keine Buchung.';
    $('state-since').textContent = since;
    $('btn-in').disabled = st !== 'out';
    $('btn-break').disabled = st !== 'working';
    $('btn-resume').disabled = st !== 'break';
    $('btn-out').disabled = st === 'out';
  }

  function renderKpis(c, days, weeks, totals) {
    const today = days.find(d => d.date === c.today);
    const wk = Z.isoWeek(c.today).key;
    const week = weeks.find(w => w.key === wk);
    const dailyTarget = Z.dailyTarget(state.settings);
    const todayWork = today ? today.workMin : 0;
    const openPast = days.filter(d => d.openPast).length;
    const hintDays = days.filter(d => d.hints.length && !d.openPast).length;
    const tiles = [
      { k: 'Heute netto', v: dur(todayWork), s: 'h', m: 'Soll ' + dur(dailyTarget) + ' h' + (today && today.breakMin ? ' · Pause ' + dur(today.breakMin) : ''),
        cls: today && today.hints.length ? 'warn' : '' },
      { k: 'Diese Woche', v: dur(week ? week.workMin : 0), s: '/ ' + dur(week ? week.target : 0) + ' h',
        m: week ? (week.days.length + (week.days.length === 1 ? ' Tag · ' : ' Tage · ') + dur(week.overtimeMin, { signed: true }) + ' h') : 'KW ' + Z.isoWeek(c.today).week + ' · keine Buchung',
        cls: week && week.overtimeMin < 0 ? 'warn' : '' },
      { k: 'Überstunden gesamt', v: dur(totals.overtimeMin, { signed: true }), s: 'h', m: 'über ' + totals.days + (totals.days === 1 ? ' Tag' : ' Tage') + ' mit Buchung',
        cls: totals.overtimeMin >= 0 ? 'good' : 'crit' },
      { k: 'Gesamt netto', v: dur(totals.workMin), s: 'h', m: 'brutto ' + dur(totals.grossMin) + ' h · Pausen ' + dur(totals.breakMin) + ' h' },
      { k: 'Offene Buchungen', v: String(totals.open), s: '', m: openPast ? openPast + ' nicht ausgestempelt' : (hintDays ? hintDays + ' Tage mit Pausenhinweis' : 'alles ausgestempelt'),
        cls: openPast ? 'crit' : (hintDays ? 'warn' : 'good') },
    ];
    $('kpis').innerHTML = tiles.map(t =>
      '<div class="kpi ' + t.cls + '"><div class="k">' + esc(t.k) + '</div><div class="v">' + esc(t.v) + (t.s ? ' <small>' + esc(t.s) + '</small>' : '') + '</div><div class="m">' + esc(t.m) + '</div></div>').join('');
  }

  function renderDays(days) {
    const t = $('days-table');
    if (!days.length) { t.innerHTML = '<tbody><tr><td class="empty">Noch keine Buchungen. Mit „Kommen" starten oder Daten importieren.</td></tr></tbody>'; return; }
    let html = '<thead><tr><th>Datum</th><th>Tag</th><th class="num">KW</th><th class="num">Kommen</th><th class="num">Gehen</th>'
      + '<th class="num">Pausen</th><th class="num">Netto</th><th class="num">Brutto</th><th class="num">Soll</th><th class="num">Überstd.</th><th>Hinweise</th></tr></thead><tbody>';
    let lastWeek = null;
    for (const d of days) {
      if (d.week && d.week.key !== lastWeek) {
        lastWeek = d.week.key;
        html += '<tr class="week-sep"><td colspan="11">KW ' + d.week.week + '<span>' + Z.toGermanDate(Z.weekStart(d.date)) + ' – ' + Z.toGermanDate(Z.addDays(Z.weekStart(d.date), 6)) + '</span></td></tr>';
      }
      const hints = d.hints.map(h => '<span class="hint' + (d.openPast && h.includes('ausgestempelt') ? ' crit' : '') + '">' + esc(h) + '</span>').join('');
      html += '<tr>'
        + '<td class="mono"><a href="#" data-day="' + d.date + '" style="color:inherit;text-decoration:none;border-bottom:1px dotted var(--muted)">' + Z.toGermanDate(d.date) + '</a></td>'
        + '<td class="muted">' + Z.weekdayShort(d.date) + '</td>'
        + '<td class="num muted">' + (d.week ? d.week.week : '') + '</td>'
        + '<td class="num">' + (d.firstIn || '–') + '</td>'
        + '<td class="num">' + (d.lastOut || '<span class="chip open">offen</span>') + '</td>'
        + '<td class="num">' + (d.breaks.length ? dur(d.breakMin) + ' <span class="muted">(' + d.breaks.length + ')</span>' : '–') + '</td>'
        + '<td class="num"><b>' + dur(d.workMin) + '</b></td>'
        + '<td class="num muted">' + dur(d.grossMin) + '</td>'
        + '<td class="num muted">' + dur(d.target) + '</td>'
        + '<td class="num ' + signClass(d.overtimeMin) + '">' + dur(d.overtimeMin, { signed: true }) + '</td>'
        + '<td><div class="hints">' + (hints || '<span class="chip ok">ok</span>') + '</div></td></tr>';
    }
    t.innerHTML = html + '</tbody>';
  }

  function renderBookings(c) {
    const months = [...new Set(state.bookings.map(b => b.date.slice(0, 7)))].sort().reverse();
    const sel = $('filter-month');
    const cur = months.includes(filterMonth) ? filterMonth : 'all';
    sel.innerHTML = '<option value="all">Alle Monate</option>' + months.map(m => {
      const d = Z.parseISODate(m + '-01');
      const label = d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric', timeZone: 'UTC' });
      return '<option value="' + m + '"' + (m === cur ? ' selected' : '') + '>' + esc(label) + '</option>';
    }).join('');
    filterMonth = cur;
    const list = Z.sortBookings(state.bookings.filter(b => cur === 'all' || b.date.startsWith(cur))).reverse();
    const t = $('bookings-table');
    if (!list.length) { t.innerHTML = '<tbody><tr><td class="empty">Keine Buchungen.</td></tr></tbody>'; return; }
    let html = '<thead><tr><th>Datum</th><th>Tag</th><th class="num">Von</th><th class="num">Bis</th><th>Auftrag</th><th>Tätigkeit</th><th>Zeitart</th><th class="num">Dauer</th><th>Status</th><th>Bemerkung</th><th></th></tr></thead><tbody>';
    for (const b of list) {
      const min = Z.bookingMinutes(b, c);
      const isOpen = !b.end;
      const status = isOpen ? (b.date === c.today ? '<span class="chip open">läuft</span>' : '<span class="chip crit">nicht ausgestempelt</span>') : '<span class="chip ok">abgeschlossen</span>';
      html += '<tr>'
        + '<td class="mono">' + Z.toGermanDate(b.date) + '</td><td class="muted">' + Z.weekdayShort(b.date) + '</td>'
        + '<td class="num">' + esc(b.start) + '</td><td class="num">' + (b.end ? esc(b.end) : '–') + '</td>'
        + '<td class="mono muted">' + esc(b.order) + '</td><td>' + esc(b.activity) + '</td>'
        + '<td><span class="chip ' + (b.kind === Z.KIND_BREAK ? 'break' : 'work') + '">' + esc(b.kind) + '</span></td>'
        + '<td class="num">' + (min == null ? '–' : dur(min)) + '</td><td>' + status + '</td>'
        + '<td class="muted">' + esc(b.note) + '</td>'
        + '<td><button class="btn sm" data-edit="' + esc(b.id) + '">Bearbeiten</button></td></tr>';
    }
    t.innerHTML = html + '</tbody>';
  }

  function renderWeeks(weeks) {
    const el = $('weeks');
    if (!weeks.length) { el.innerHTML = '<div class="card"><p>Noch keine Buchungen.</p></div>'; return; }
    const dailyTarget = Z.dailyTarget(state.settings) || 480;
    const scale = Math.max(10 * 60, dailyTarget * 1.25);
    el.innerHTML = weeks.map(w => {
      const bars = w.days.map(d => {
        const pct = Math.min(100, (d.workMin / scale) * 100);
        const tpct = d.target ? Math.min(100, (d.target / scale) * 100) : null;
        return '<div class="bar-row"><div class="d">' + Z.weekdayShort(d.date) + ' ' + Z.toGermanDate(d.date).slice(0, 5) + '</div>'
          + '<div class="bar"><div class="fill' + (d.target && d.workMin >= d.target ? ' over' : '') + '" style="width:' + pct.toFixed(1) + '%"></div>'
          + (tpct != null ? '<div class="target" style="left:' + tpct.toFixed(1) + '%"></div>' : '') + '</div>'
          + '<div class="n">' + dur(d.workMin) + (d.open ? ' <span class="chip open">offen</span>' : '') + '</div></div>';
      }).join('');
      return '<div class="week"><div class="week-head"><h3>KW ' + w.week + ' · ' + w.year + '</h3><span class="range">' + Z.toGermanDate(w.start) + ' – ' + Z.toGermanDate(w.end) + '</span></div>'
        + '<div class="week-sum"><span>Netto <b>' + dur(w.workMin) + '</b></span><span>Soll <b>' + dur(w.target) + '</b></span>'
        + '<span>Überstunden <b class="' + signClass(w.overtimeMin) + '">' + dur(w.overtimeMin, { signed: true }) + '</b></span>'
        + '<span>Pausen <b>' + dur(w.breakMin) + '</b></span><span>Tage <b>' + w.days.length + '</b></span>'
        + (w.hints ? '<span class="hint">' + w.hints + ' Hinweis' + (w.hints > 1 ? 'e' : '') + '</span>' : '') + '</div>'
        + '<div class="bars">' + bars + '</div></div>';
    }).join('');
  }

  const DAY_NAMES = ['', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  function renderSettings() {
    $('set-hours').value = state.settings.weeklyHours;
    $('set-daily').textContent = dur(Z.dailyTarget(state.settings)) + ' h';
    $('set-days').innerHTML = [1, 2, 3, 4, 5, 6, 7].map(d =>
      '<label><input type="checkbox" name="wd" value="' + d + '"' + (state.settings.workDays.includes(d) ? ' checked' : '') + '>' + DAY_NAMES[d] + '</label>').join('');
  }

  // ---------- Aktionen ----------
  function doPunch(action) {
    const c = ctx();
    try {
      state.bookings = Z.punch(state.bookings, action, c.today, Z.nowHM(c.now));
      save(); render();
      toast({ in: 'Eingestempelt ' + Z.nowHM(c.now), break: 'Pause gestartet', resume: 'Arbeitszeit fortgesetzt', out: 'Ausgestempelt ' + Z.nowHM(c.now) }[action]);
    } catch (e) { toast(e.message); }
  }

  let editingId = null;
  function openDialog(booking) {
    editingId = booking ? booking.id : null;
    $('dlg-title').textContent = booking ? 'Buchung bearbeiten' : 'Neue Buchung';
    $('f-date').value = booking ? booking.date : ctx().today;
    $('f-kind').value = booking && booking.kind === Z.KIND_BREAK ? 'break' : 'work';
    $('f-start').value = booking ? booking.start : '';
    $('f-end').value = booking && booking.end ? booking.end : '';
    $('f-note').value = booking ? booking.note || '' : '';
    $('f-error').textContent = '';
    $('f-delete').hidden = !booking;
    $('dlg').showModal();
  }

  function saveDialog(ev) {
    ev.preventDefault();
    const type = $('f-kind').value;
    const draft = Z.makeBooking(type, $('f-date').value, $('f-start').value, $('f-end').value || null, $('f-note').value.trim());
    const errors = Z.validateBooking(draft);
    if (errors.length) { $('f-error').textContent = errors.join(' '); return; }
    if (editingId) {
      state.bookings = state.bookings.map(b => (b.id === editingId ? { ...draft, id: editingId } : b));
    } else state.bookings = [...state.bookings, draft];
    save(); $('dlg').close(); render(); toast('Buchung gespeichert');
  }

  function deleteBooking() {
    if (!editingId) return;
    state.bookings = state.bookings.filter(b => b.id !== editingId);
    save(); $('dlg').close(); render(); toast('Buchung gelöscht');
  }

  function download(name, text, mime) {
    $('export-area').value = text;
    try {
      const blob = new Blob(['﻿' + text], { type: mime + ';charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e) { /* Download blockiert – Text steht im Feld */ }
    toast(name + ' bereitgestellt');
    showTab('data');
  }

  function stamp() { return ctx().today.replace(/-/g, ''); }
  function exportBookings() { download('zeiterfassung_buchungen_' + stamp() + '.csv', Z.toCSV(state.bookings, ctx()), 'text/csv'); }
  function exportDays() { download('zeiterfassung_tage_' + stamp() + '.csv', Z.daysToCSV(Z.computeDays(state.bookings, state.settings, ctx())), 'text/csv'); }
  function exportJSON() { download('zeiterfassung_backup_' + stamp() + '.json', JSON.stringify(state, null, 2), 'application/json'); }

  function importText(text) {
    const err = $('import-error'); err.textContent = '';
    text = (text || '').trim();
    if (!text) { err.textContent = 'Kein Import-Text.'; return; }
    let incoming;
    if (text.startsWith('{')) {
      try {
        const s = JSON.parse(text);
        incoming = (s.bookings || []).filter(b => Z.validateBooking(b).length === 0);
        if (s.settings) state.settings = { ...Z.DEFAULT_SETTINGS, ...s.settings };
      } catch (e) { err.textContent = 'JSON nicht lesbar.'; return; }
    } else {
      const r = Z.fromCSV(text);
      incoming = r.bookings;
      if (r.errors.length) err.textContent = r.errors.slice(0, 3).join(' ') + (r.errors.length > 3 ? ' …' : '');
    }
    if (!incoming.length) { err.textContent = err.textContent || 'Keine gültigen Buchungen gefunden.'; return; }
    const key = b => b.date + ' ' + b.start;
    const keys = new Set(incoming.map(key));
    state.bookings = [...state.bookings.filter(b => !keys.has(key(b))), ...incoming.map(b => ({ ...b, id: b.id || Z.newId() }))];
    save(); render(); $('import-area').value = '';
    toast(incoming.length + ' Buchungen importiert');
  }

  function showTab(name) {
    activeTab = name;
    document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
    document.querySelectorAll('.panel').forEach(p => { p.hidden = p.id !== 'panel-' + name; });
  }

  // ---------- Events ----------
  document.querySelectorAll('.punch-btn').forEach(b => b.addEventListener('click', () => doPunch(b.dataset.action)));
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));
  $('btn-add').addEventListener('click', () => openDialog(null));
  $('booking-form').addEventListener('submit', saveDialog);
  $('f-cancel').addEventListener('click', () => $('dlg').close());
  $('f-delete').addEventListener('click', deleteBooking);
  $('bookings-table').addEventListener('click', e => {
    const btn = e.target.closest('[data-edit]');
    if (btn) openDialog(state.bookings.find(b => b.id === btn.dataset.edit));
  });
  $('days-table').addEventListener('click', e => {
    const a = e.target.closest('[data-day]');
    if (!a) return;
    e.preventDefault(); filterMonth = a.dataset.day.slice(0, 7); showTab('bookings'); render();
  });
  $('filter-month').addEventListener('change', e => { filterMonth = e.target.value; render(); });
  $('btn-export-bookings').addEventListener('click', exportBookings);
  $('btn-export-bookings-2').addEventListener('click', exportBookings);
  $('btn-export-days').addEventListener('click', exportDays);
  $('btn-export-days-2').addEventListener('click', exportDays);
  $('btn-export-json').addEventListener('click', exportJSON);
  $('btn-copy').addEventListener('click', async () => {
    const v = $('export-area').value;
    if (!v) { toast('Zuerst exportieren.'); return; }
    try { await navigator.clipboard.writeText(v); toast('In Zwischenablage kopiert'); }
    catch (e) { $('export-area').select(); toast('Bitte mit Strg+C kopieren'); }
  });
  $('btn-import').addEventListener('click', () => importText($('import-area').value));
  $('import-file').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => { importText(String(r.result)); e.target.value = ''; }; r.readAsText(f, 'utf-8');
  });
  $('settings-form').addEventListener('submit', e => {
    e.preventDefault();
    const hours = Number($('set-hours').value);
    const days = [...document.querySelectorAll('#set-days input:checked')].map(i => Number(i.value));
    if (!(hours > 0) || !days.length) { toast('Wochenstunden und mindestens ein Arbeitstag nötig.'); return; }
    state.settings = { ...state.settings, weeklyHours: hours, workDays: days };
    save(); render(); toast('Einstellungen gespeichert');
  });
  $('set-hours').addEventListener('input', () => {
    const days = [...document.querySelectorAll('#set-days input:checked')].length || 5;
    $('set-daily').textContent = dur(Math.round(Number($('set-hours').value) * 60 / days)) + ' h';
  });
  $('btn-seed').addEventListener('click', () => {
    if (!window.ZeitSeed) return;
    if (state.bookings.length && !confirm('Buchungen aus der Google-Tabelle laden? Vorhandene Buchungen mit gleichem Datum und gleicher Startzeit werden ersetzt.')) return;
    const seed = window.ZeitSeed.bookings();
    const key = b => b.date + ' ' + b.start;
    const keys = new Set(seed.map(key));
    state.bookings = [...state.bookings.filter(b => !keys.has(key(b))), ...seed];
    save(); render(); toast(seed.length + ' Buchungen geladen');
  });
  $('btn-clear').addEventListener('click', () => {
    if (!confirm('Wirklich alle Buchungen löschen? Vorher ggf. ein Backup exportieren.')) return;
    state.bookings = []; save(); render(); toast('Alle Buchungen gelöscht');
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('dlg').open) $('dlg').close();
  });

  render();
  setInterval(() => { renderClock(ctx()); }, 1000 * 15);
  setInterval(render, 1000 * 60);
})();
