/* Fahrzeugmanagement – Frontend-Logik (Vanilla JS, keine Abhängigkeiten) */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const LABELS = {
    verfuegbar: "Verfügbar", unterwegs: "Unterwegs", werkstatt: "Werkstatt", ausser_betrieb: "Außer Betrieb",
    geplant: "Geplant", aktiv: "Aktiv", abgeschlossen: "Abgeschlossen", storniert: "Storniert",
    Anhaenger: "Anhänger", Oelwechsel: "Ölwechsel",
  };
  const label = (v) => LABELS[v] || v;

  const state = { vehicles: [], drivers: [], bookings: [], maintenance: [], dashboard: null };

  // ------------------------------------------------------------ Helpers
  async function api(path, options = {}) {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (res.status === 204) return null;
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = Array.isArray(body.detail)
        ? body.detail.map((d) => `${(d.loc || []).slice(-1)[0]}: ${d.msg}`).join(", ")
        : body.detail || res.statusText;
      throw new Error(detail);
    }
    return body;
  }

  function toast(msg, isError = false) {
    const el = $("#toast");
    el.textContent = msg;
    el.className = "toast" + (isError ? " error" : "");
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(() => (el.hidden = true), isError ? 6000 : 2500);
  }

  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("de-DE") : "–");
  const fmtDateTime = (iso) =>
    iso ? new Date(iso).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }) : "–";
  const fmtKm = (n) => (n == null ? "–" : `${Number(n).toLocaleString("de-DE")} km`);
  const fmtEur = (n) => `${Number(n || 0).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €`;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function daysUntil(iso) {
    if (!iso) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.round((new Date(iso) - today) / 86400000);
  }

  function dueBadge(iso, warnDays = 30) {
    if (!iso) return "–";
    const d = daysUntil(iso);
    const cls = d < 0 ? "overdue" : d <= warnDays ? "soon" : "";
    return cls ? `<span class="badge ${cls}">${fmtDate(iso)}</span>` : fmtDate(iso);
  }

  function formToObject(form) {
    const data = {};
    for (const el of form.elements) {
      if (!el.name) continue;
      if (el.type === "checkbox") data[el.name] = el.checked;
      else if (el.type === "number") data[el.name] = el.value === "" ? null : Number(el.value);
      else data[el.name] = el.value === "" ? null : el.value;
    }
    return data;
  }

  function fillForm(form, data) {
    form.reset();
    for (const el of form.elements) {
      if (!el.name || !(el.name in data)) continue;
      const v = data[el.name];
      if (el.type === "checkbox") el.checked = Boolean(v);
      else if (el.type === "datetime-local") el.value = v ? String(v).slice(0, 16) : "";
      else el.value = v ?? "";
    }
  }

  function openDialog(id) { $(id).showModal(); }
  $$("dialog [data-close]").forEach((b) => b.addEventListener("click", () => b.closest("dialog").close()));

  async function confirmDelete(text, path, after) {
    if (!window.confirm(text)) return;
    try {
      await api(path, { method: "DELETE" });
      toast("Gelöscht.");
      await after();
    } catch (e) { toast(e.message, true); }
  }

  // ------------------------------------------------------------ Tabs
  $$(".tabs button").forEach((btn) =>
    btn.addEventListener("click", () => {
      $$(".tabs button").forEach((b) => b.classList.toggle("active", b === btn));
      $$(".tab").forEach((t) => t.classList.toggle("active", t.id === `tab-${btn.dataset.tab}`));
      refresh(btn.dataset.tab);
    })
  );

  // ------------------------------------------------------------ Dashboard
  async function loadDashboard() {
    const [dash, bookings] = await Promise.all([
      api("/api/dashboard"),
      api(`/api/bookings?ab=${new Date().toISOString().slice(0, 10)}`),
    ]);
    state.dashboard = dash;
    const overdue = dash.faellig.filter((f) => f.ueberfaellig).length;
    const soon = dash.faellig.length - overdue;
    const sv = dash.status_verteilung;
    $("#kpis").innerHTML = [
      ["Fahrzeuge gesamt", dash.fahrzeuge_gesamt, ""],
      ["Verfügbar", sv.verfuegbar || 0, ""],
      ["Unterwegs", sv.unterwegs || 0, ""],
      ["In Werkstatt", sv.werkstatt || 0, sv.werkstatt ? "warn" : ""],
      ["Überfällig", overdue, overdue ? "danger" : ""],
      ["Bald fällig", soon, soon ? "warn" : ""],
      ["Aktive Buchungen", dash.aktive_buchungen, ""],
      [`Servicekosten ${dash.stichtag.slice(0, 4)}`, fmtEur(dash.kosten_laufendes_jahr), ""],
    ].map(([l, v, cls]) => `<div class="kpi ${cls}"><div class="value">${v}</div><div class="label">${l}</div></div>`).join("");

    const tb = $("#due-table tbody");
    tb.innerHTML = dash.faellig.length
      ? dash.faellig.map((f) => `
        <tr class="${f.ueberfaellig ? "due-overdue" : "due-soon"}">
          <td>${esc(f.art)}</td><td>${esc(f.referenz)}</td>
          <td>${f.faellig_am ? fmtDate(f.faellig_am) : f.faellig_km != null ? fmtKm(f.faellig_km) : "–"}</td>
          <td>${esc(f.hinweis)}</td></tr>`).join("")
      : `<tr><td colspan="4" class="empty">Keine Fälligkeiten – alles im grünen Bereich.</td></tr>`;

    const upcoming = bookings.filter((b) => b.status === "aktiv" || b.status === "geplant").slice(0, 10);
    $("#upcoming-table tbody").innerHTML = upcoming.length
      ? upcoming.map((b) => `<tr><td class="plate">${esc(b.kennzeichen)}</td><td>${esc(b.fahrer_name)}</td>
          <td>${fmtDateTime(b.von)}</td><td>${fmtDateTime(b.bis)}</td>
          <td><span class="badge ${b.status}">${label(b.status)}</span></td></tr>`).join("")
      : `<tr><td colspan="5" class="empty">Keine anstehenden Buchungen.</td></tr>`;
  }

  // ------------------------------------------------------------ Fahrzeuge
  async function loadVehicles() {
    const q = $("#vehicle-search").value.trim();
    const st = $("#vehicle-status-filter").value;
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (st) params.set("status", st);
    state.vehicles = await api(`/api/vehicles?${params}`);
    const tb = $("#vehicles-table tbody");
    tb.innerHTML = state.vehicles.length
      ? state.vehicles.map((v) => {
          const wart = [
            v.naechste_wartung_datum ? dueBadge(v.naechste_wartung_datum) : "",
            v.naechste_wartung_km != null
              ? `<span class="badge ${v.naechste_wartung_km - v.kilometerstand < 0 ? "overdue" : v.naechste_wartung_km - v.kilometerstand <= 1000 ? "soon" : ""}">${fmtKm(v.naechste_wartung_km)}</span>`
              : "",
          ].filter(Boolean).join(" ") || "–";
          return `<tr>
            <td class="plate">${esc(v.kennzeichen)}</td>
            <td>${esc(v.hersteller)} ${esc(v.modell)}<br><small class="muted">EZ ${fmtDate(v.erstzulassung)}</small></td>
            <td>${label(v.typ)}</td><td>${fmtKm(v.kilometerstand)}</td>
            <td>${dueBadge(v.hu_termin)}</td><td>${wart}</td>
            <td><span class="badge ${v.status}">${label(v.status)}</span></td>
            <td class="actions">
              <button class="btn small secondary" data-edit="${v.id}">Bearbeiten</button>
              <button class="btn small danger" data-del="${v.id}">Löschen</button>
            </td></tr>`;
        }).join("")
      : `<tr><td colspan="8" class="empty">Noch keine Fahrzeuge angelegt.</td></tr>`;
    $$("[data-edit]", tb).forEach((b) => b.addEventListener("click", () => editVehicle(Number(b.dataset.edit))));
    $$("[data-del]", tb).forEach((b) => b.addEventListener("click", () => {
      const v = state.vehicles.find((x) => x.id === Number(b.dataset.del));
      confirmDelete(`Fahrzeug ${v.kennzeichen} inkl. Buchungen und Wartungshistorie löschen?`, `/api/vehicles/${v.id}`, loadVehicles);
    }));
  }

  function editVehicle(id) {
    const v = id ? state.vehicles.find((x) => x.id === id) : { kilometerstand: 0, typ: "PKW", status: "verfuegbar" };
    $("#dlg-vehicle-title").textContent = id ? `Fahrzeug ${v.kennzeichen} bearbeiten` : "Neues Fahrzeug";
    fillForm($("#form-vehicle"), { ...v, id: id || "" });
    openDialog("#dlg-vehicle");
  }

  $("#btn-new-vehicle").addEventListener("click", () => editVehicle(null));
  $("#vehicle-search").addEventListener("input", debounce(loadVehicles, 250));
  $("#vehicle-status-filter").addEventListener("change", loadVehicles);
  $("#form-vehicle").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const data = formToObject(ev.target);
    const id = data.id; delete data.id;
    data.kilometerstand = data.kilometerstand ?? 0;
    data.notizen = data.notizen ?? "";
    try {
      await api(id ? `/api/vehicles/${id}` : "/api/vehicles", { method: id ? "PUT" : "POST", body: JSON.stringify(data) });
      $("#dlg-vehicle").close();
      toast("Fahrzeug gespeichert.");
      await loadVehicles();
    } catch (e) { toast(e.message, true); }
  });

  // ------------------------------------------------------------ Fahrer
  async function loadDrivers() {
    const only = $("#drivers-active-only").checked;
    state.drivers = await api(`/api/drivers?nur_aktive=${only}`);
    const tb = $("#drivers-table tbody");
    tb.innerHTML = state.drivers.length
      ? state.drivers.map((d) => `<tr>
          <td>${esc(d.name)}</td><td>${esc(d.abteilung) || "–"}</td><td>${esc(d.fuehrerscheinklasse)}</td>
          <td>${licenseBadge(d.fuehrerschein_kontrolle_am)}</td>
          <td>${[d.telefon, d.email].filter(Boolean).map(esc).join("<br>") || "–"}</td>
          <td>${d.aktiv ? "✔" : "–"}</td>
          <td class="actions">
            <button class="btn small secondary" data-edit="${d.id}">Bearbeiten</button>
            <button class="btn small danger" data-del="${d.id}">Löschen</button>
          </td></tr>`).join("")
      : `<tr><td colspan="7" class="empty">Noch keine Fahrer angelegt.</td></tr>`;
    $$("[data-edit]", tb).forEach((b) => b.addEventListener("click", () => editDriver(Number(b.dataset.edit))));
    $$("[data-del]", tb).forEach((b) => b.addEventListener("click", () => {
      const d = state.drivers.find((x) => x.id === Number(b.dataset.del));
      confirmDelete(`Fahrer ${d.name} löschen?`, `/api/drivers/${d.id}`, loadDrivers);
    }));
  }

  function addDays(iso, n) {
    const d = new Date(iso); d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }

  // Letzte Kontrolle anzeigen, Farbe nach nächster Fälligkeit (halbjährlich, 14 Tage Vorwarnung)
  function licenseBadge(iso) {
    if (!iso) return '<span class="badge overdue">fehlt</span>';
    const d = daysUntil(addDays(iso, 182));
    const cls = d < 0 ? "overdue" : d <= 14 ? "soon" : "";
    return cls ? `<span class="badge ${cls}">${fmtDate(iso)}</span>` : fmtDate(iso);
  }

  function editDriver(id) {
    const d = id ? state.drivers.find((x) => x.id === id) : { fuehrerscheinklasse: "B", aktiv: true };
    $("#dlg-driver-title").textContent = id ? `${d.name} bearbeiten` : "Neuer Fahrer";
    fillForm($("#form-driver"), { ...d, id: id || "" });
    openDialog("#dlg-driver");
  }

  $("#btn-new-driver").addEventListener("click", () => editDriver(null));
  $("#drivers-active-only").addEventListener("change", loadDrivers);
  $("#form-driver").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const data = formToObject(ev.target);
    const id = data.id; delete data.id;
    for (const k of ["abteilung", "telefon"]) data[k] = data[k] ?? "";
    try {
      await api(id ? `/api/drivers/${id}` : "/api/drivers", { method: id ? "PUT" : "POST", body: JSON.stringify(data) });
      $("#dlg-driver").close();
      toast("Fahrer gespeichert.");
      await loadDrivers();
    } catch (e) { toast(e.message, true); }
  });

  // ------------------------------------------------------------ Buchungen
  async function ensureLookups() {
    const [vehicles, drivers] = await Promise.all([api("/api/vehicles"), api("/api/drivers?nur_aktive=true")]);
    const vOpts = vehicles.map((v) => `<option value="${v.id}">${esc(v.kennzeichen)} – ${esc(v.hersteller)} ${esc(v.modell)}</option>`).join("");
    const dOpts = drivers.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join("");
    $("#form-booking [name=vehicle_id]").innerHTML = vOpts;
    $("#form-booking [name=driver_id]").innerHTML = dOpts;
    $("#form-maintenance [name=vehicle_id]").innerHTML = vOpts;
    const filter = $("#maintenance-vehicle-filter");
    const current = filter.value;
    filter.innerHTML = `<option value="">Alle Fahrzeuge</option>` + vOpts;
    filter.value = current;
    return { vehicles, drivers };
  }

  async function loadBookings() {
    const st = $("#booking-status-filter").value;
    state.bookings = await api(`/api/bookings${st ? `?status=${st}` : ""}`);
    const tb = $("#bookings-table tbody");
    tb.innerHTML = state.bookings.length
      ? state.bookings.map((b) => `<tr>
          <td class="plate">${esc(b.kennzeichen)}</td><td>${esc(b.fahrer_name)}</td>
          <td>${fmtDateTime(b.von)}</td><td>${fmtDateTime(b.bis)}</td>
          <td>${esc(b.zweck) || "–"}${b.ziel ? `<br><small class="muted">${esc(b.ziel)}</small>` : ""}</td>
          <td>${b.km_start != null || b.km_ende != null ? `${b.km_start ?? "?"} → ${b.km_ende ?? "?"}${b.km_start != null && b.km_ende != null ? ` (${b.km_ende - b.km_start} km)` : ""}` : "–"}</td>
          <td><span class="badge ${b.status}">${label(b.status)}</span></td>
          <td class="actions">
            <button class="btn small secondary" data-edit="${b.id}">Bearbeiten</button>
            <button class="btn small danger" data-del="${b.id}">Löschen</button>
          </td></tr>`).join("")
      : `<tr><td colspan="8" class="empty">Keine Buchungen vorhanden.</td></tr>`;
    $$("[data-edit]", tb).forEach((b) => b.addEventListener("click", () => editBooking(Number(b.dataset.edit))));
    $$("[data-del]", tb).forEach((b) => b.addEventListener("click", () =>
      confirmDelete("Buchung löschen? (Alternativ: Status auf „Storniert“ setzen.)", `/api/bookings/${b.dataset.del}`, loadBookings)));
  }

  async function editBooking(id) {
    await ensureLookups();
    const now = new Date(); now.setMinutes(0, 0, 0);
    const later = new Date(now.getTime() + 4 * 3600000);
    const b = id ? state.bookings.find((x) => x.id === id) : { von: toLocalInput(now), bis: toLocalInput(later), status: "geplant" };
    $("#dlg-booking-title").textContent = id ? `Buchung #${id} bearbeiten` : "Neue Buchung";
    fillForm($("#form-booking"), { ...b, id: id || "" });
    openDialog("#dlg-booking");
  }

  function toLocalInput(d) {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  $("#btn-new-booking").addEventListener("click", () => editBooking(null));
  $("#booking-status-filter").addEventListener("change", loadBookings);
  $("#form-booking").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const data = formToObject(ev.target);
    const id = data.id; delete data.id;
    data.vehicle_id = Number(data.vehicle_id); data.driver_id = Number(data.driver_id);
    for (const k of ["zweck", "ziel", "notizen"]) data[k] = data[k] ?? "";
    try {
      await api(id ? `/api/bookings/${id}` : "/api/bookings", { method: id ? "PUT" : "POST", body: JSON.stringify(data) });
      $("#dlg-booking").close();
      toast("Buchung gespeichert.");
      await loadBookings();
    } catch (e) { toast(e.message, true); }
  });

  // ------------------------------------------------------------ Wartung
  async function loadMaintenance() {
    await ensureLookups();
    const vid = $("#maintenance-vehicle-filter").value;
    state.maintenance = await api(`/api/maintenance${vid ? `?vehicle_id=${vid}` : ""}`);
    const tb = $("#maintenance-table tbody");
    tb.innerHTML = state.maintenance.length
      ? state.maintenance.map((m) => `<tr>
          <td>${fmtDate(m.datum)}</td><td class="plate">${esc(m.kennzeichen)}</td><td>${label(m.typ)}</td>
          <td>${fmtKm(m.kilometerstand)}</td><td>${fmtEur(m.kosten)}</td><td>${esc(m.werkstatt) || "–"}</td>
          <td>${esc(m.beschreibung) || "–"}</td>
          <td class="actions"><button class="btn small danger" data-del="${m.id}">Löschen</button></td></tr>`).join("")
      : `<tr><td colspan="8" class="empty">Keine Wartungseinträge vorhanden.</td></tr>`;
    $$("[data-del]", tb).forEach((b) => b.addEventListener("click", () =>
      confirmDelete("Wartungseintrag löschen?", `/api/maintenance/${b.dataset.del}`, loadMaintenance)));
  }

  $("#btn-new-maintenance").addEventListener("click", async () => {
    await ensureLookups();
    const f = $("#form-maintenance");
    f.reset();
    f.datum.value = new Date().toISOString().slice(0, 10);
    const vid = $("#maintenance-vehicle-filter").value;
    if (vid) f.vehicle_id.value = vid;
    openDialog("#dlg-maintenance");
  });
  $("#maintenance-vehicle-filter").addEventListener("change", loadMaintenance);
  $("#form-maintenance").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const data = formToObject(ev.target);
    data.vehicle_id = Number(data.vehicle_id);
    data.kosten = data.kosten ?? 0;
    for (const k of ["werkstatt", "beschreibung"]) data[k] = data[k] ?? "";
    try {
      await api("/api/maintenance", { method: "POST", body: JSON.stringify(data) });
      $("#dlg-maintenance").close();
      toast("Wartung gespeichert.");
      await loadMaintenance();
    } catch (e) { toast(e.message, true); }
  });

  // ------------------------------------------------------------ Init
  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

  const loaders = { dashboard: loadDashboard, vehicles: loadVehicles, bookings: loadBookings, maintenance: loadMaintenance, drivers: loadDrivers };
  async function refresh(tab) {
    try { await loaders[tab](); } catch (e) { toast(`Fehler beim Laden: ${e.message}`, true); }
  }
  refresh("dashboard");
})();
