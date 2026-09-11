/* Fahrzeugmanagement – Frontend-Logik (Vanilla JS, keine Abhängigkeiten)
   Fahrer-Ansicht: Start (Fahrt starten/beenden), Fahrten, Fälligkeiten.
   Verwaltung: Fahrzeuge, Fahrer, Buchungen, Wartung (Tabellen, Experten-Formulare). */
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
  const DRIVER_KEY = "fm.driverId";

  const state = {
    vehicles: [], drivers: [], activeDrivers: [], bookings: [], maintenance: [], activeTrips: [],
    driverId: Number(localStorage.getItem(DRIVER_KEY)) || null,
    tripFilter: "",
  };

  // ------------------------------------------------------------ Helpers
  async function api(path, options = {}) {
    const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...options });
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
  const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "–");
  const fmtDateTime = (iso) =>
    iso ? new Date(iso).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }) : "–";
  const fmtKm = (n) => (n == null ? "–" : `${Number(n).toLocaleString("de-DE")} km`);
  const fmtEur = (n) => `${Number(n || 0).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €`;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const firstName = (name) => String(name || "").split(" ")[0];
  const initials = (name) => String(name || "").split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  function toLocalInput(d) {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  const todayIso = () => toLocalInput(new Date()).slice(0, 10);
  const isToday = (iso) => String(iso || "").slice(0, 10) === todayIso();

  function daysUntil(iso) {
    if (!iso) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.round((new Date(iso) - today) / 86400000);
  }
  function addDays(iso, n) {
    const d = new Date(iso); d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function dueBadge(iso, warnDays = 30) {
    if (!iso) return "–";
    const d = daysUntil(iso);
    const cls = d < 0 ? "overdue" : d <= warnDays ? "soon" : "";
    return cls ? `<span class="badge ${cls}">${fmtDate(iso)}</span>` : fmtDate(iso);
  }
  // Letzte Kontrolle anzeigen, Farbe nach nächster Fälligkeit (halbjährlich, 14 Tage Vorwarnung)
  function licenseBadge(iso) {
    if (!iso) return '<span class="badge overdue">fehlt</span>';
    const d = daysUntil(addDays(iso, 182));
    const cls = d < 0 ? "overdue" : d <= 14 ? "soon" : "";
    return cls ? `<span class="badge ${cls}">${fmtDate(iso)}</span>` : fmtDate(iso);
  }
  function durationSince(iso) {
    const mins = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
    return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} h ${String(mins % 60).padStart(2, "0")} min`;
  }

  function formToObject(form) {
    const data = {};
    for (const el of form.elements) {
      if (!el.name) continue;
      if (el.type === "checkbox") data[el.name] = el.checked;
      else if (el.type === "radio") { if (el.checked) data[el.name] = el.value; }
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
  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

  // ------------------------------------------------------------ Router (Hash, für Zurück-Taste in der App)
  const VIEW_FOR = {
    start: "view-start", fahrten: "view-fahrten", faellig: "view-faellig", verwaltung: "view-verwaltung",
    "verwaltung/fahrzeuge": "tab-vehicles", "verwaltung/fahrer": "tab-drivers",
    "verwaltung/buchungen": "tab-bookings", "verwaltung/wartung": "tab-maintenance",
  };
  const TITLE_FOR = { start: "Fuhrpark", fahrten: "Fahrten", faellig: "Fälligkeiten", verwaltung: "Verwaltung" };

  function route() {
    const hash = location.hash.replace(/^#/, "") || "start";
    const viewId = VIEW_FOR[hash] || "view-start";
    const top = hash.split("/")[0];
    $$(".view").forEach((v) => v.classList.toggle("active", v.id === viewId));
    $$("#mainnav a").forEach((a) => a.classList.toggle("active", a.dataset.view === top));
    $("#page-title").textContent = TITLE_FOR[top] || "Fuhrpark";
    window.scrollTo(0, 0);
    refresh(viewId);
  }
  const navigate = (hash) => { if (location.hash === `#${hash}`) route(); else location.hash = hash; };
  window.addEventListener("hashchange", route);

  // ------------------------------------------------------------ Fahrerkontext
  function currentDriver() { return state.activeDrivers.find((d) => d.id === state.driverId) || null; }

  function renderDriverChip() {
    const d = currentDriver();
    $("#driver-name").textContent = d ? d.name : "Wer bist du?";
    $("#driver-avatar").textContent = d ? initials(d.name) : "?";
  }

  function renderDriverPick(show) {
    const sel = $("#driver-select");
    sel.innerHTML = `<option value="">Bitte wählen …</option>` +
      state.activeDrivers.map((d) => `<option value="${d.id}" ${d.id === state.driverId ? "selected" : ""}>${esc(d.name)}${d.abteilung ? ` (${esc(d.abteilung)})` : ""}</option>`).join("");
    $("#driver-pick").hidden = !show;
  }

  $("#btn-driver-ok").addEventListener("click", () => {
    const id = Number($("#driver-select").value);
    if (!id) { toast("Bitte einen Namen auswählen.", true); return; }
    state.driverId = id;
    localStorage.setItem(DRIVER_KEY, String(id));
    $("#driver-pick").hidden = true;
    refresh("view-start");
  });
  $("#driver-chip").addEventListener("click", () => {
    const pick = $("#driver-pick");
    if (location.hash && location.hash !== "#start") { navigate("start"); }
    renderDriverPick(pick.hidden);
  });

  // ------------------------------------------------------------ Start (Fahrer)
  async function loadStart() {
    const [dash, active, vehicles, drivers, planned] = await Promise.all([
      api("/api/dashboard"),
      api("/api/bookings?status=aktiv"),
      api("/api/vehicles"),
      api("/api/drivers?nur_aktive=true"),
      api(`/api/bookings?status=geplant&ab=${todayIso()}`),
    ]);
    state.vehicles = vehicles; state.activeDrivers = drivers; state.activeTrips = active;
    if (state.driverId && !currentDriver()) { state.driverId = null; localStorage.removeItem(DRIVER_KEY); }
    renderDriverChip();
    renderDriverPick(!state.driverId);

    const overdue = dash.faellig.filter((f) => f.ueberfaellig).length;
    const badge = $("#nav-due-badge");
    badge.hidden = !overdue; badge.textContent = overdue;

    const me = currentDriver();
    const myTrip = me ? active.find((b) => b.driver_id === me.id) : null;
    const byId = (id) => vehicles.find((v) => v.id === id) || {};
    const card = $("#trip-card");

    if (!me) {
      card.innerHTML = `<div class="empty-title">Wähle zuerst deinen Namen</div><div class="model">Dann kannst du Fahrten starten und beenden.</div>`;
    } else if (myTrip) {
      const v = byId(myTrip.vehicle_id);
      card.innerHTML = `
        <div class="head"><span class="badge aktiv">Unterwegs</span><span>seit ${fmtTime(myTrip.von)} · ${durationSince(myTrip.von)}</span></div>
        <div><div class="plate plate-big">${esc(myTrip.kennzeichen)}</div>
          <div class="model">${esc(v.hersteller || "")} ${esc(v.modell || "")}${myTrip.zweck ? ` · ${esc(myTrip.zweck)}` : ""}${myTrip.ziel ? `, ${esc(myTrip.ziel)}` : ""}</div></div>
        <div>
          <div class="field-label">km-Stand bei Rückgabe</div>
          <div class="km-field"><input type="number" inputmode="numeric" min="0" id="trip-km-ende" value="${myTrip.km_start ?? v.kilometerstand ?? ""}"><small>km · Start ${myTrip.km_start != null ? Number(myTrip.km_start).toLocaleString("de-DE") : "–"}</small></div>
        </div>
        <button type="button" class="btn big" id="btn-end-trip">Fahrt beenden</button>`;
      $("#btn-end-trip").addEventListener("click", () => endTrip(myTrip));
      $("#trip-km-ende").addEventListener("keydown", (e) => { if (e.key === "Enter") endTrip(myTrip); });
    } else {
      const free = vehicles.filter((v) => v.status === "verfuegbar").length;
      card.innerHTML = `
        <div><div class="empty-title">Keine laufende Fahrt</div><div class="model">${free} ${free === 1 ? "Fahrzeug" : "Fahrzeuge"} verfügbar</div></div>
        <button type="button" class="btn big" id="btn-start-trip" ${free ? "" : "disabled"}>+ Fahrt starten</button>`;
      $("#btn-start-trip").addEventListener("click", () => openTripDialog());
    }

    // Geplante Buchung des Fahrers (nächste)
    const mine = me ? planned.filter((b) => b.driver_id === me.id && !myTrip).sort((a, b) => a.von.localeCompare(b.von)) : [];
    const next = mine[0];
    $("#planned-card").innerHTML = next ? `
      <div class="card planned">
        <div class="grow">
          <div class="label">${isToday(next.von) ? "Heute geplant" : "Geplant"}</div>
          <div><span class="plate">${esc(next.kennzeichen)}</span> · ${isToday(next.von) ? "" : fmtDate(next.von) + ", "}${fmtTime(next.von)}–${String(next.von).slice(0, 10) === String(next.bis).slice(0, 10) ? fmtTime(next.bis) : fmtDateTime(next.bis)}</div>
          <div class="sub muted" style="margin:0">${esc([next.zweck, next.ziel].filter(Boolean).join(", ") || "Ohne Angabe")}</div>
        </div>
        <button type="button" class="btn secondary" id="btn-start-planned">Starten</button>
      </div>` : "";
    if (next) $("#btn-start-planned").addEventListener("click", () => startPlanned(next, byId(next.vehicle_id)));

    // Fälligkeiten (Top 3)
    const due = dash.faellig.slice(0, 3);
    $("#start-due-all").textContent = `Alle ${dash.faellig.length}`;
    $("#start-due").innerHTML = due.length ? due.map((f) => `
      <div><div class="dot ${f.ueberfaellig ? "overdue" : "soon"}"></div>
        <div class="grow"><div class="title">${esc(f.hinweis)}</div><div class="sub">${esc(f.art)} · ${esc(f.referenz)}</div></div></div>`).join("")
      : `<div class="empty">Keine Fälligkeiten – alles im grünen Bereich.</div>`;

    // Fahrzeuge jetzt
    const tripFor = (vid) => active.find((b) => b.vehicle_id === vid);
    $("#start-vehicles").innerHTML = vehicles.filter((v) => v.status !== "ausser_betrieb").map((v) => {
      const t = tripFor(v.id);
      const badge = t
        ? (me && t.driver_id === me.id ? `<span class="badge me">Du</span>` : `<span class="badge unterwegs">${esc(firstName(t.fahrer_name))}</span>`)
        : `<span class="badge ${v.status}">${label(v.status)}</span>`;
      return `<div><div class="plate" style="width:96px">${esc(v.kennzeichen)}</div><div class="grow"><div class="sub">${esc(v.hersteller)} ${esc(v.modell)}</div></div>${badge}</div>`;
    }).join("") || `<div class="empty">Noch keine Fahrzeuge angelegt.</div>`;
  }

  async function endTrip(trip) {
    const km = Number($("#trip-km-ende").value);
    if (!Number.isFinite(km) || $("#trip-km-ende").value === "") { toast("Bitte den km-Stand eintragen.", true); return; }
    if (trip.km_start != null && km < trip.km_start) { toast(`km-Stand darf nicht unter dem Startwert (${trip.km_start}) liegen.`, true); return; }
    const now = new Date();
    const minEnd = new Date(new Date(trip.von).getTime() + 60000);
    try {
      await api(`/api/bookings/${trip.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...trip, status: "abgeschlossen", km_ende: km, bis: toLocalInput(now > minEnd ? now : minEnd) }),
      });
      toast(`Fahrt beendet. ${esc(trip.kennzeichen)} ist wieder verfügbar.`);
      await loadStart();
    } catch (e) { toast(e.message, true); }
  }

  async function startPlanned(b, vehicle) {
    const now = new Date();
    const von = new Date(b.von) > now ? toLocalInput(now) : b.von;
    const bis = new Date(b.bis) > new Date(von) ? b.bis : toLocalInput(new Date(now.getTime() + 4 * 3600000));
    try {
      await api(`/api/bookings/${b.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...b, status: "aktiv", von, bis, km_start: b.km_start ?? vehicle.kilometerstand ?? null }),
      });
      toast(`Fahrt mit ${b.kennzeichen} gestartet.`);
      await loadStart();
    } catch (e) { toast(e.message, true); }
  }

  // ------------------------------------------------------------ Fahrt starten (Dialog)
  async function openTripDialog() {
    if (!state.driverId) { renderDriverPick(true); toast("Bitte zuerst deinen Namen wählen.", true); return; }
    const [vehicles, active] = await Promise.all([api("/api/vehicles"), api("/api/bookings?status=aktiv")]);
    state.vehicles = vehicles; state.activeTrips = active;
    const form = $("#form-trip");
    form.reset();
    const usable = vehicles.filter((v) => v.status !== "ausser_betrieb");
    let first = true;
    $("#trip-vehicles").innerHTML = usable.map((v) => {
      const t = active.find((b) => b.vehicle_id === v.id);
      const free = v.status === "verfuegbar" && !t;
      const reason = t ? `unterwegs mit ${esc(firstName(t.fahrer_name))}` : v.status === "werkstatt" ? "in der Werkstatt" : v.status === "unterwegs" ? "unterwegs" : "";
      const checked = free && first ? "checked" : "";
      if (checked) first = false;
      return `<label class="vchoice ${free ? "" : "disabled"}">
        <input type="radio" name="vehicle_id" value="${v.id}" data-km="${v.kilometerstand}" data-plate="${esc(v.kennzeichen)}" ${free ? "" : "disabled"} ${checked}>
        <div class="grow"><div class="plate">${esc(v.kennzeichen)}</div><div class="sub">${esc(v.hersteller)} ${esc(v.modell)} · ${free ? fmtKm(v.kilometerstand) : reason}</div></div>
        <span class="badge ${t ? "unterwegs" : v.status}">${t ? "Unterwegs" : label(v.status)}</span>
        <svg class="tick" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>
      </label>`;
    }).join("") || `<div class="empty">Keine Fahrzeuge verfügbar.</div>`;
    const bis = new Date(); bis.setHours(bis.getHours() + 4, 0, 0, 0);
    form.bis.value = toLocalInput(bis);
    syncTripForm();
    openDialog("#dlg-trip");
  }

  function syncTripForm() {
    const form = $("#form-trip");
    const sel = form.querySelector("input[name=vehicle_id]:checked");
    form.km_start.value = sel ? sel.dataset.km : "";
    $("#btn-trip-submit").textContent = sel ? `Fahrt starten mit ${sel.dataset.plate}` : "Fahrt starten";
    $("#btn-trip-submit").disabled = !sel;
    const b = form.bis.value ? new Date(form.bis.value) : null;
    $("#trip-bis-preview").textContent = b ? (isToday(form.bis.value) ? `heute, ${fmtTime(b)}` : fmtDateTime(b)) : "";
  }
  $("#form-trip").addEventListener("change", syncTripForm);
  $("#btn-new-trip").addEventListener("click", () => openTripDialog());
  $("#form-trip").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const data = formToObject(ev.target);
    const payload = {
      vehicle_id: Number(data.vehicle_id), driver_id: state.driverId,
      von: toLocalInput(new Date()), bis: data.bis,
      zweck: data.zweck ?? "", ziel: data.ziel ?? "", km_start: data.km_start, status: "aktiv", notizen: "",
    };
    try {
      const b = await api("/api/bookings", { method: "POST", body: JSON.stringify(payload) });
      $("#dlg-trip").close();
      toast(`Gute Fahrt mit ${b.kennzeichen}!`);
      navigate("start");
    } catch (e) { toast(e.message, true); }
  });

  // ------------------------------------------------------------ Fahrten (Liste)
  async function loadTrips() {
    const [bookings, drivers] = await Promise.all([
      api(`/api/bookings${state.tripFilter ? `?status=${state.tripFilter}` : ""}`),
      state.activeDrivers.length ? Promise.resolve(state.activeDrivers) : api("/api/drivers?nur_aktive=true"),
    ]);
    state.activeDrivers = drivers; state.bookings = bookings;
    renderDriverChip();
    const me = currentDriver();
    const list = $("#trips-list");
    list.innerHTML = bookings.length ? bookings.slice(0, 100).map((b) => {
      const km = b.km_start != null || b.km_ende != null
        ? `${b.km_start ?? "?"} → ${b.km_ende ?? "?"}${b.km_start != null && b.km_ende != null ? ` (${b.km_ende - b.km_start} km)` : ""}` : "";
      const mine = me && b.driver_id === me.id;
      const action = mine && b.status === "geplant" ? `<button type="button" class="btn small" data-start="${b.id}">Starten</button>`
        : mine && b.status === "aktiv" ? `<a class="btn small" href="#start">Beenden</a>` : "";
      return `<div class="card trip-card">
        <div class="head"><span class="plate">${esc(b.kennzeichen)}</span><span class="badge ${b.status}">${label(b.status)}</span></div>
        <div>${esc(b.fahrer_name)}${mine ? " (du)" : ""}</div>
        <div class="meta">${fmtDateTime(b.von)} – ${fmtDateTime(b.bis)}</div>
        <div class="meta">${esc([b.zweck, b.ziel].filter(Boolean).join(", ") || "Ohne Angabe")}${km ? ` · ${km}` : ""}</div>
        <div class="actions">${action}<button type="button" class="btn small secondary" data-edit="${b.id}">Bearbeiten</button></div>
      </div>`;
    }).join("") : `<div class="card empty">Keine Fahrten vorhanden.</div>`;
    $$("[data-edit]", list).forEach((el) => el.addEventListener("click", () => editBooking(Number(el.dataset.edit), loadTrips)));
    $$("[data-start]", list).forEach((el) => el.addEventListener("click", async () => {
      const b = bookings.find((x) => x.id === Number(el.dataset.start));
      const v = await api(`/api/vehicles/${b.vehicle_id}`);
      await startPlanned(b, v);
      navigate("start");
    }));
  }
  $("#trip-filter").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    $$("#trip-filter .chip").forEach((c) => c.classList.toggle("active", c === chip));
    state.tripFilter = chip.dataset.status;
    loadTrips().catch((err) => toast(err.message, true));
  });

  // ------------------------------------------------------------ Fälligkeiten
  async function loadDue() {
    const dash = await api("/api/dashboard");
    const sv = dash.status_verteilung;
    $("#due-kpis").innerHTML = [
      ["ok", sv.verfuegbar || 0, "Verfügbar"], ["busy", sv.unterwegs || 0, "Unterwegs"], ["warn", sv.werkstatt || 0, "Werkstatt"],
    ].map(([cls, v, l]) => `<div class="kpi ${cls}"><div class="value">${v}</div><div class="label">${l}</div></div>`).join("");
    const when = (f) => f.faellig_am ? `Fällig ${fmtDate(f.faellig_am)}` : f.faellig_km != null ? `Fällig bei ${fmtKm(f.faellig_km)}` : "";
    const badge = (f) => f.ueberfaellig
      ? `<span class="badge overdue">${f.tage_bis != null ? `seit ${-f.tage_bis} Tagen` : f.faellig_km != null ? "km überschritten" : "fehlt"}</span>`
      : `<span class="badge soon">${f.tage_bis != null ? `in ${f.tage_bis} Tagen` : "bald"}</span>`;
    const card = (f) => `<div class="card due-card">
      <div class="head"><span>${esc(f.art)}</span>${badge(f)}</div>
      <div>${esc(f.referenz)}</div>
      <div class="sub">${esc(when(f) || f.hinweis)}</div></div>`;
    const overdue = dash.faellig.filter((f) => f.ueberfaellig);
    const soon = dash.faellig.filter((f) => !f.ueberfaellig);
    $("#due-overdue-count").textContent = overdue.length;
    $("#due-soon-count").textContent = soon.length;
    $("#due-overdue").innerHTML = overdue.map(card).join("") || `<div class="card empty">Nichts überfällig.</div>`;
    $("#due-soon").innerHTML = soon.map(card).join("") || `<div class="card empty">Nichts in den nächsten 30 Tagen.</div>`;
    const nb = $("#nav-due-badge"); nb.hidden = !overdue.length; nb.textContent = overdue.length;
  }

  // ------------------------------------------------------------ Verwaltung (Menü)
  async function loadVerwaltung() {
    const { vehicles, drivers } = await ensureLookups();
    $("#menu-vehicle-count").textContent = vehicles.length;
    $("#menu-driver-count").textContent = drivers.length;
    $("#app-status").textContent = navigator.onLine ? "Server verbunden" : "Offline";
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
            <td class="plate" data-label="Kennzeichen">${esc(v.kennzeichen)}</td>
            <td data-label="Fahrzeug"><span>${esc(v.hersteller)} ${esc(v.modell)}<br><small class="muted">EZ ${fmtDate(v.erstzulassung)}</small></span></td>
            <td data-label="Typ">${label(v.typ)}</td><td data-label="km-Stand">${fmtKm(v.kilometerstand)}</td>
            <td data-label="HU/AU">${dueBadge(v.hu_termin)}</td><td data-label="Nächste Wartung"><span>${wart}</span></td>
            <td data-label="Status"><span class="badge ${v.status}">${label(v.status)}</span></td>
            <td class="actions">
              <button type="button" class="btn small secondary" data-edit="${v.id}">Bearbeiten</button>
              <button type="button" class="btn small danger" data-del="${v.id}">Löschen</button>
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
          <td data-label="Name">${esc(d.name)}</td><td data-label="Abteilung">${esc(d.abteilung) || "–"}</td><td data-label="Klasse">${esc(d.fuehrerscheinklasse)}</td>
          <td data-label="Letzte FS-Kontrolle">${licenseBadge(d.fuehrerschein_kontrolle_am)}</td>
          <td data-label="Kontakt"><span>${[d.telefon, d.email].filter(Boolean).map(esc).join("<br>") || "–"}</span></td>
          <td data-label="Aktiv">${d.aktiv ? "✔" : "–"}</td>
          <td class="actions">
            <button type="button" class="btn small secondary" data-edit="${d.id}">Bearbeiten</button>
            <button type="button" class="btn small danger" data-del="${d.id}">Löschen</button>
          </td></tr>`).join("")
      : `<tr><td colspan="7" class="empty">Noch keine Fahrer angelegt.</td></tr>`;
    $$("[data-edit]", tb).forEach((b) => b.addEventListener("click", () => editDriver(Number(b.dataset.edit))));
    $$("[data-del]", tb).forEach((b) => b.addEventListener("click", () => {
      const d = state.drivers.find((x) => x.id === Number(b.dataset.del));
      confirmDelete(`Fahrer ${d.name} löschen?`, `/api/drivers/${d.id}`, loadDrivers);
    }));
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
      state.activeDrivers = [];
      await loadDrivers();
    } catch (e) { toast(e.message, true); }
  });

  // ------------------------------------------------------------ Buchungen (Verwaltung)
  async function ensureLookups() {
    const [vehicles, drivers] = await Promise.all([api("/api/vehicles"), api("/api/drivers?nur_aktive=true")]);
    state.activeDrivers = drivers;
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

  let bookingAfterSave = null;
  async function loadBookings() {
    const st = $("#booking-status-filter").value;
    state.bookings = await api(`/api/bookings${st ? `?status=${st}` : ""}`);
    const tb = $("#bookings-table tbody");
    tb.innerHTML = state.bookings.length
      ? state.bookings.map((b) => `<tr>
          <td class="plate" data-label="Fahrzeug">${esc(b.kennzeichen)}</td><td data-label="Fahrer">${esc(b.fahrer_name)}</td>
          <td data-label="Von">${fmtDateTime(b.von)}</td><td data-label="Bis">${fmtDateTime(b.bis)}</td>
          <td data-label="Zweck / Ziel"><span>${esc(b.zweck) || "–"}${b.ziel ? `<br><small class="muted">${esc(b.ziel)}</small>` : ""}</span></td>
          <td data-label="km">${b.km_start != null || b.km_ende != null ? `${b.km_start ?? "?"} → ${b.km_ende ?? "?"}${b.km_start != null && b.km_ende != null ? ` (${b.km_ende - b.km_start} km)` : ""}` : "–"}</td>
          <td data-label="Status"><span class="badge ${b.status}">${label(b.status)}</span></td>
          <td class="actions">
            <button type="button" class="btn small secondary" data-edit="${b.id}">Bearbeiten</button>
            <button type="button" class="btn small danger" data-del="${b.id}">Löschen</button>
          </td></tr>`).join("")
      : `<tr><td colspan="8" class="empty">Keine Buchungen vorhanden.</td></tr>`;
    $$("[data-edit]", tb).forEach((b) => b.addEventListener("click", () => editBooking(Number(b.dataset.edit), loadBookings)));
    $$("[data-del]", tb).forEach((b) => b.addEventListener("click", () =>
      confirmDelete("Buchung löschen? (Alternativ: Status auf „Storniert“ setzen.)", `/api/bookings/${b.dataset.del}`, loadBookings)));
  }

  async function editBooking(id, after) {
    await ensureLookups();
    bookingAfterSave = after || loadBookings;
    const now = new Date(); now.setMinutes(0, 0, 0);
    const later = new Date(now.getTime() + 4 * 3600000);
    const b = id ? state.bookings.find((x) => x.id === id) : { von: toLocalInput(now), bis: toLocalInput(later), status: "geplant", driver_id: state.driverId || "" };
    $("#dlg-booking-title").textContent = id ? `Buchung #${id} bearbeiten` : "Neue Buchung";
    fillForm($("#form-booking"), { ...b, id: id || "" });
    openDialog("#dlg-booking");
  }

  $("#btn-new-booking").addEventListener("click", () => editBooking(null, loadBookings));
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
      await (bookingAfterSave || loadBookings)();
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
          <td data-label="Datum">${fmtDate(m.datum)}</td><td class="plate" data-label="Fahrzeug">${esc(m.kennzeichen)}</td><td data-label="Typ">${label(m.typ)}</td>
          <td data-label="km-Stand">${fmtKm(m.kilometerstand)}</td><td data-label="Kosten">${fmtEur(m.kosten)}</td><td data-label="Werkstatt">${esc(m.werkstatt) || "–"}</td>
          <td data-label="Beschreibung">${esc(m.beschreibung) || "–"}</td>
          <td class="actions"><button type="button" class="btn small danger" data-del="${m.id}">Löschen</button></td></tr>`).join("")
      : `<tr><td colspan="8" class="empty">Keine Wartungseinträge vorhanden.</td></tr>`;
    $$("[data-del]", tb).forEach((b) => b.addEventListener("click", () =>
      confirmDelete("Wartungseintrag löschen?", `/api/maintenance/${b.dataset.del}`, loadMaintenance)));
  }

  $("#btn-new-maintenance").addEventListener("click", async () => {
    await ensureLookups();
    const f = $("#form-maintenance");
    f.reset();
    f.datum.value = todayIso();
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

  // ------------------------------------------------------------ PWA: Installation + Service Worker
  let deferredInstall = null;
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstall = e;
    if (!standalone) $("#btn-install").hidden = false;
  });
  $("#btn-install").addEventListener("click", async (e) => {
    e.preventDefault();
    if (!deferredInstall) return;
    deferredInstall.prompt();
    await deferredInstall.userChoice.catch(() => null);
    deferredInstall = null;
    $("#btn-install").hidden = true;
  });
  window.addEventListener("appinstalled", () => { $("#btn-install").hidden = true; toast("App installiert."); });
  window.addEventListener("online", () => { $("#app-status").textContent = "Server verbunden"; });
  window.addEventListener("offline", () => { $("#app-status").textContent = "Offline"; toast("Offline – Daten werden aus dem Zwischenspeicher angezeigt.", true); });
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("/sw.js").catch(() => { /* z. B. http ohne localhost: kein SW */ });
  }

  // ------------------------------------------------------------ Init
  const loaders = {
    "view-start": loadStart, "view-fahrten": loadTrips, "view-faellig": loadDue, "view-verwaltung": loadVerwaltung,
    "tab-vehicles": loadVehicles, "tab-bookings": loadBookings, "tab-maintenance": loadMaintenance, "tab-drivers": loadDrivers,
  };
  async function refresh(viewId) {
    try { await loaders[viewId](); } catch (e) { toast(`Fehler beim Laden: ${e.message}`, true); }
  }
  route();
})();
