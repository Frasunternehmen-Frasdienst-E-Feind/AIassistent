"""Fahrzeugmanagement – FastAPI-Backend und Auslieferung des Web-Frontends."""
from __future__ import annotations

import csv
import io
import os
import sqlite3
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Optional

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from . import db
from .models import (
    Booking,
    BookingIn,
    Dashboard,
    Driver,
    DriverIn,
    DueItem,
    Maintenance,
    MaintenanceIn,
    Vehicle,
    VehicleIn,
)

STATIC_DIR = Path(__file__).resolve().parent / "static"

# Schwellwerte für Fälligkeiten (anpassbar über die Dashboard-Query-Parameter)
HU_WARN_TAGE = 30
WARTUNG_WARN_TAGE = 30
WARTUNG_WARN_KM = 1000
FUEHRERSCHEIN_KONTROLLE_INTERVALL_TAGE = 182  # halbjährliche Kontrolle (Halterhaftung)

@asynccontextmanager
async def lifespan(_: FastAPI):
    db.init_db()
    yield


app = FastAPI(
    title="Fahrzeugmanagement",
    description="Fuhrparkverwaltung: Fahrzeuge, Fahrer, Buchungen, Wartung, Fälligkeiten.",
    version="0.2.0",
    lifespan=lifespan,
)


def _iso(value: Optional[date | datetime]) -> Optional[str]:
    return value.isoformat() if value is not None else None


def _get_or_404(conn: sqlite3.Connection, table: str, item_id: int) -> sqlite3.Row:
    row = conn.execute(f"SELECT * FROM {table} WHERE id = ?", (item_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail=f"{table[:-1]} {item_id} nicht gefunden")
    return row


# ---------------------------------------------------------------- Fahrzeuge

@app.get("/api/vehicles", response_model=list[Vehicle])
def list_vehicles(status: Optional[str] = None, q: Optional[str] = None):
    sql = "SELECT * FROM vehicles WHERE 1=1"
    params: list = []
    if status:
        sql += " AND status = ?"
        params.append(status)
    if q:
        sql += " AND (kennzeichen LIKE ? OR hersteller LIKE ? OR modell LIKE ?)"
        params += [f"%{q.upper()}%", f"%{q}%", f"%{q}%"]
    sql += " ORDER BY kennzeichen"
    with db.get_conn() as conn:
        return db.rows_to_dicts(conn.execute(sql, params).fetchall())


@app.post("/api/vehicles", response_model=Vehicle, status_code=201)
def create_vehicle(payload: VehicleIn):
    with db.get_conn() as conn:
        try:
            cur = conn.execute(
                """INSERT INTO vehicles (kennzeichen, hersteller, modell, typ, erstzulassung,
                   kilometerstand, hu_termin, naechste_wartung_datum, naechste_wartung_km, status, notizen)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    payload.kennzeichen, payload.hersteller, payload.modell, payload.typ,
                    _iso(payload.erstzulassung), payload.kilometerstand, _iso(payload.hu_termin),
                    _iso(payload.naechste_wartung_datum), payload.naechste_wartung_km,
                    payload.status, payload.notizen,
                ),
            )
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=409, detail="Kennzeichen existiert bereits")
        return dict(_get_or_404(conn, "vehicles", cur.lastrowid))


@app.get("/api/vehicles/{vehicle_id}", response_model=Vehicle)
def get_vehicle(vehicle_id: int):
    with db.get_conn() as conn:
        return dict(_get_or_404(conn, "vehicles", vehicle_id))


@app.put("/api/vehicles/{vehicle_id}", response_model=Vehicle)
def update_vehicle(vehicle_id: int, payload: VehicleIn):
    with db.get_conn() as conn:
        _get_or_404(conn, "vehicles", vehicle_id)
        try:
            conn.execute(
                """UPDATE vehicles SET kennzeichen=?, hersteller=?, modell=?, typ=?, erstzulassung=?,
                   kilometerstand=?, hu_termin=?, naechste_wartung_datum=?, naechste_wartung_km=?,
                   status=?, notizen=? WHERE id=?""",
                (
                    payload.kennzeichen, payload.hersteller, payload.modell, payload.typ,
                    _iso(payload.erstzulassung), payload.kilometerstand, _iso(payload.hu_termin),
                    _iso(payload.naechste_wartung_datum), payload.naechste_wartung_km,
                    payload.status, payload.notizen, vehicle_id,
                ),
            )
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=409, detail="Kennzeichen existiert bereits")
        return dict(_get_or_404(conn, "vehicles", vehicle_id))


@app.delete("/api/vehicles/{vehicle_id}", status_code=204)
def delete_vehicle(vehicle_id: int):
    with db.get_conn() as conn:
        _get_or_404(conn, "vehicles", vehicle_id)
        conn.execute("DELETE FROM vehicles WHERE id = ?", (vehicle_id,))


# ------------------------------------------------------------------- Fahrer

@app.get("/api/drivers", response_model=list[Driver])
def list_drivers(nur_aktive: bool = False):
    sql = "SELECT * FROM drivers" + (" WHERE aktiv = 1" if nur_aktive else "") + " ORDER BY name"
    with db.get_conn() as conn:
        return [_driver_row(r) for r in conn.execute(sql).fetchall()]


def _driver_row(row: sqlite3.Row) -> dict:
    d = dict(row)
    d["aktiv"] = bool(d["aktiv"])
    d["email"] = d["email"] or None
    return d


@app.post("/api/drivers", response_model=Driver, status_code=201)
def create_driver(payload: DriverIn):
    with db.get_conn() as conn:
        cur = conn.execute(
            """INSERT INTO drivers (name, abteilung, fuehrerscheinklasse, fuehrerschein_kontrolle_am,
               telefon, email, aktiv) VALUES (?,?,?,?,?,?,?)""",
            (
                payload.name, payload.abteilung, payload.fuehrerscheinklasse,
                _iso(payload.fuehrerschein_kontrolle_am), payload.telefon,
                payload.email or "", int(payload.aktiv),
            ),
        )
        return _driver_row(_get_or_404(conn, "drivers", cur.lastrowid))


@app.put("/api/drivers/{driver_id}", response_model=Driver)
def update_driver(driver_id: int, payload: DriverIn):
    with db.get_conn() as conn:
        _get_or_404(conn, "drivers", driver_id)
        conn.execute(
            """UPDATE drivers SET name=?, abteilung=?, fuehrerscheinklasse=?, fuehrerschein_kontrolle_am=?,
               telefon=?, email=?, aktiv=? WHERE id=?""",
            (
                payload.name, payload.abteilung, payload.fuehrerscheinklasse,
                _iso(payload.fuehrerschein_kontrolle_am), payload.telefon,
                payload.email or "", int(payload.aktiv), driver_id,
            ),
        )
        return _driver_row(_get_or_404(conn, "drivers", driver_id))


@app.delete("/api/drivers/{driver_id}", status_code=204)
def delete_driver(driver_id: int):
    with db.get_conn() as conn:
        _get_or_404(conn, "drivers", driver_id)
        try:
            conn.execute("DELETE FROM drivers WHERE id = ?", (driver_id,))
        except sqlite3.IntegrityError:
            raise HTTPException(
                status_code=409,
                detail="Fahrer hat Buchungen und kann nicht gelöscht werden. Stattdessen deaktivieren.",
            )


# ---------------------------------------------------------------- Buchungen

BOOKING_SELECT = """
SELECT b.*, v.kennzeichen AS kennzeichen, d.name AS fahrer_name
FROM bookings b
JOIN vehicles v ON v.id = b.vehicle_id
JOIN drivers d ON d.id = b.driver_id
"""


def _check_overlap(conn: sqlite3.Connection, payload: BookingIn, exclude_id: Optional[int]) -> None:
    if payload.status == "storniert":
        return
    sql = """SELECT id FROM bookings WHERE vehicle_id = ? AND status != 'storniert'
             AND von < ? AND bis > ?"""
    params: list = [payload.vehicle_id, _iso(payload.bis), _iso(payload.von)]
    if exclude_id is not None:
        sql += " AND id != ?"
        params.append(exclude_id)
    clash = conn.execute(sql, params).fetchone()
    if clash:
        raise HTTPException(
            status_code=409,
            detail=f"Fahrzeug ist im Zeitraum bereits gebucht (Buchung {clash['id']})",
        )


def _apply_booking_side_effects(conn: sqlite3.Connection, payload: BookingIn) -> None:
    """Kilometerstand fortschreiben und Fahrzeugstatus anhand aktiver Buchungen setzen."""
    if payload.km_ende is not None:
        conn.execute(
            "UPDATE vehicles SET kilometerstand = MAX(kilometerstand, ?) WHERE id = ?",
            (payload.km_ende, payload.vehicle_id),
        )
    vehicle = conn.execute("SELECT status FROM vehicles WHERE id = ?", (payload.vehicle_id,)).fetchone()
    if vehicle["status"] in ("werkstatt", "ausser_betrieb"):
        return
    active = conn.execute(
        "SELECT 1 FROM bookings WHERE vehicle_id = ? AND status = 'aktiv' LIMIT 1",
        (payload.vehicle_id,),
    ).fetchone()
    conn.execute(
        "UPDATE vehicles SET status = ? WHERE id = ?",
        ("unterwegs" if active else "verfuegbar", payload.vehicle_id),
    )


@app.get("/api/bookings", response_model=list[Booking])
def list_bookings(
    vehicle_id: Optional[int] = None,
    driver_id: Optional[int] = None,
    status: Optional[str] = None,
    ab: Optional[date] = None,
):
    sql = BOOKING_SELECT + " WHERE 1=1"
    params: list = []
    if vehicle_id:
        sql += " AND b.vehicle_id = ?"
        params.append(vehicle_id)
    if driver_id:
        sql += " AND b.driver_id = ?"
        params.append(driver_id)
    if status:
        sql += " AND b.status = ?"
        params.append(status)
    if ab:
        sql += " AND b.bis >= ?"
        params.append(ab.isoformat())
    sql += " ORDER BY b.von DESC"
    with db.get_conn() as conn:
        return db.rows_to_dicts(conn.execute(sql, params).fetchall())


@app.post("/api/bookings", response_model=Booking, status_code=201)
def create_booking(payload: BookingIn):
    with db.get_conn() as conn:
        _get_or_404(conn, "vehicles", payload.vehicle_id)
        driver = _get_or_404(conn, "drivers", payload.driver_id)
        if not driver["aktiv"]:
            raise HTTPException(status_code=422, detail="Fahrer ist deaktiviert")
        _check_overlap(conn, payload, None)
        cur = conn.execute(
            """INSERT INTO bookings (vehicle_id, driver_id, von, bis, zweck, ziel, km_start, km_ende,
               status, notizen) VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (
                payload.vehicle_id, payload.driver_id, _iso(payload.von), _iso(payload.bis),
                payload.zweck, payload.ziel, payload.km_start, payload.km_ende,
                payload.status, payload.notizen,
            ),
        )
        _apply_booking_side_effects(conn, payload)
        return dict(conn.execute(BOOKING_SELECT + " WHERE b.id = ?", (cur.lastrowid,)).fetchone())


@app.put("/api/bookings/{booking_id}", response_model=Booking)
def update_booking(booking_id: int, payload: BookingIn):
    with db.get_conn() as conn:
        _get_or_404(conn, "bookings", booking_id)
        _get_or_404(conn, "vehicles", payload.vehicle_id)
        _get_or_404(conn, "drivers", payload.driver_id)
        _check_overlap(conn, payload, booking_id)
        conn.execute(
            """UPDATE bookings SET vehicle_id=?, driver_id=?, von=?, bis=?, zweck=?, ziel=?, km_start=?,
               km_ende=?, status=?, notizen=? WHERE id=?""",
            (
                payload.vehicle_id, payload.driver_id, _iso(payload.von), _iso(payload.bis),
                payload.zweck, payload.ziel, payload.km_start, payload.km_ende,
                payload.status, payload.notizen, booking_id,
            ),
        )
        _apply_booking_side_effects(conn, payload)
        return dict(conn.execute(BOOKING_SELECT + " WHERE b.id = ?", (booking_id,)).fetchone())


@app.delete("/api/bookings/{booking_id}", status_code=204)
def delete_booking(booking_id: int):
    with db.get_conn() as conn:
        _get_or_404(conn, "bookings", booking_id)
        conn.execute("DELETE FROM bookings WHERE id = ?", (booking_id,))


# ------------------------------------------------------------------ Wartung

MAINT_SELECT = "SELECT m.*, v.kennzeichen AS kennzeichen FROM maintenance m JOIN vehicles v ON v.id = m.vehicle_id"


@app.get("/api/maintenance", response_model=list[Maintenance])
def list_maintenance(vehicle_id: Optional[int] = None):
    sql = MAINT_SELECT
    params: list = []
    if vehicle_id:
        sql += " WHERE m.vehicle_id = ?"
        params.append(vehicle_id)
    sql += " ORDER BY m.datum DESC, m.id DESC"
    with db.get_conn() as conn:
        return db.rows_to_dicts(conn.execute(sql, params).fetchall())


@app.post("/api/maintenance", response_model=Maintenance, status_code=201)
def create_maintenance(payload: MaintenanceIn):
    with db.get_conn() as conn:
        _get_or_404(conn, "vehicles", payload.vehicle_id)
        cur = conn.execute(
            """INSERT INTO maintenance (vehicle_id, datum, typ, kilometerstand, kosten, werkstatt, beschreibung)
               VALUES (?,?,?,?,?,?,?)""",
            (
                payload.vehicle_id, _iso(payload.datum), payload.typ, payload.kilometerstand,
                payload.kosten, payload.werkstatt, payload.beschreibung,
            ),
        )
        # Folgetermine am Fahrzeug fortschreiben
        updates: list[str] = []
        params: list = []
        if payload.kilometerstand is not None:
            updates.append("kilometerstand = MAX(kilometerstand, ?)")
            params.append(payload.kilometerstand)
        if payload.naechste_wartung_datum is not None:
            updates.append("naechste_wartung_datum = ?")
            params.append(_iso(payload.naechste_wartung_datum))
        if payload.naechste_wartung_km is not None:
            updates.append("naechste_wartung_km = ?")
            params.append(payload.naechste_wartung_km)
        if payload.hu_termin_neu is not None:
            updates.append("hu_termin = ?")
            params.append(_iso(payload.hu_termin_neu))
        if updates:
            conn.execute(f"UPDATE vehicles SET {', '.join(updates)} WHERE id = ?", params + [payload.vehicle_id])
        return dict(conn.execute(MAINT_SELECT + " WHERE m.id = ?", (cur.lastrowid,)).fetchone())


@app.delete("/api/maintenance/{maintenance_id}", status_code=204)
def delete_maintenance(maintenance_id: int):
    with db.get_conn() as conn:
        _get_or_404(conn, "maintenance", maintenance_id)
        conn.execute("DELETE FROM maintenance WHERE id = ?", (maintenance_id,))


# ---------------------------------------------------------------- Dashboard

def _due_items(conn: sqlite3.Connection, today: date, hu_tage: int, wartung_tage: int, wartung_km: int) -> list[DueItem]:
    items: list[DueItem] = []
    for v in conn.execute("SELECT * FROM vehicles WHERE status != 'ausser_betrieb'").fetchall():
        ref = f"{v['kennzeichen']} ({v['hersteller']} {v['modell']})"
        if v["hu_termin"]:
            hu = date.fromisoformat(v["hu_termin"])
            delta = (hu - today).days
            if delta <= hu_tage:
                items.append(DueItem(
                    art="HU/AU", referenz=ref, faellig_am=hu, tage_bis=delta, ueberfaellig=delta < 0,
                    hinweis="Hauptuntersuchung überfällig" if delta < 0 else f"HU/AU in {delta} Tagen",
                ))
        if v["naechste_wartung_datum"]:
            w = date.fromisoformat(v["naechste_wartung_datum"])
            delta = (w - today).days
            if delta <= wartung_tage:
                items.append(DueItem(
                    art="Wartung (Datum)", referenz=ref, faellig_am=w, tage_bis=delta, ueberfaellig=delta < 0,
                    hinweis="Wartung überfällig" if delta < 0 else f"Wartung in {delta} Tagen",
                ))
        if v["naechste_wartung_km"] is not None:
            rest = v["naechste_wartung_km"] - v["kilometerstand"]
            if rest <= wartung_km:
                items.append(DueItem(
                    art="Wartung (km)", referenz=ref, faellig_km=v["naechste_wartung_km"], ueberfaellig=rest < 0,
                    hinweis="Wartungs-km überschritten" if rest < 0 else f"Wartung in {rest} km",
                ))
    for d in conn.execute("SELECT * FROM drivers WHERE aktiv = 1").fetchall():
        if not d["fuehrerschein_kontrolle_am"]:
            items.append(DueItem(
                art="Führerscheinkontrolle", referenz=d["name"], ueberfaellig=True,
                hinweis="Noch keine Führerscheinkontrolle dokumentiert",
            ))
            continue
        last = date.fromisoformat(d["fuehrerschein_kontrolle_am"])
        naechste = last + timedelta(days=FUEHRERSCHEIN_KONTROLLE_INTERVALL_TAGE)
        delta = (naechste - today).days
        if delta <= 14:
            items.append(DueItem(
                art="Führerscheinkontrolle", referenz=d["name"], faellig_am=naechste, tage_bis=delta,
                ueberfaellig=delta < 0,
                hinweis="Führerscheinkontrolle überfällig" if delta < 0 else f"Kontrolle in {delta} Tagen",
            ))
    items.sort(key=lambda i: (not i.ueberfaellig, i.tage_bis if i.tage_bis is not None else 10**6))
    return items


@app.get("/api/dashboard", response_model=Dashboard)
def dashboard(
    stichtag: Optional[date] = None,
    hu_tage: int = Query(HU_WARN_TAGE, ge=0),
    wartung_tage: int = Query(WARTUNG_WARN_TAGE, ge=0),
    wartung_km: int = Query(WARTUNG_WARN_KM, ge=0),
):
    today = stichtag or date.today()
    with db.get_conn() as conn:
        total = conn.execute("SELECT COUNT(*) FROM vehicles").fetchone()[0]
        verteilung = {
            r["status"]: r["n"]
            for r in conn.execute("SELECT status, COUNT(*) AS n FROM vehicles GROUP BY status").fetchall()
        }
        aktiv = conn.execute("SELECT COUNT(*) FROM bookings WHERE status = 'aktiv'").fetchone()[0]
        kosten = conn.execute(
            "SELECT COALESCE(SUM(kosten), 0) FROM maintenance WHERE datum >= ?",
            (f"{today.year}-01-01",),
        ).fetchone()[0]
        return Dashboard(
            stichtag=today,
            fahrzeuge_gesamt=total,
            status_verteilung=verteilung,
            aktive_buchungen=aktiv,
            faellig=_due_items(conn, today, hu_tage, wartung_tage, wartung_km),
            kosten_laufendes_jahr=float(kosten),
        )


# ------------------------------------------------------------------ Export

def _csv_response(header: list[str], rows: list[list], filename: str) -> StreamingResponse:
    buf = io.StringIO()
    writer = csv.writer(buf, delimiter=";")
    writer.writerow(header)
    writer.writerows(rows)
    buf.seek(0)
    return StreamingResponse(
        iter(["﻿" + buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/api/export/vehicles.csv")
def export_vehicles():
    with db.get_conn() as conn:
        rows = conn.execute("SELECT * FROM vehicles ORDER BY kennzeichen").fetchall()
    header = ["Kennzeichen", "Hersteller", "Modell", "Typ", "Erstzulassung", "Kilometerstand",
              "HU-Termin", "Nächste Wartung (Datum)", "Nächste Wartung (km)", "Status", "Notizen"]
    data = [[r["kennzeichen"], r["hersteller"], r["modell"], r["typ"], r["erstzulassung"], r["kilometerstand"],
             r["hu_termin"], r["naechste_wartung_datum"], r["naechste_wartung_km"], r["status"], r["notizen"]]
            for r in rows]
    return _csv_response(header, data, "fahrzeuge.csv")


@app.get("/api/export/fahrtenbuch.csv")
def export_fahrtenbuch(von: Optional[date] = None, bis: Optional[date] = None):
    sql = BOOKING_SELECT + " WHERE b.status != 'storniert'"
    params: list = []
    if von:
        sql += " AND b.von >= ?"
        params.append(von.isoformat())
    if bis:
        sql += " AND b.bis <= ?"
        params.append((bis + timedelta(days=1)).isoformat())
    sql += " ORDER BY b.von"
    with db.get_conn() as conn:
        rows = conn.execute(sql, params).fetchall()
    header = ["Kennzeichen", "Fahrer", "Von", "Bis", "Zweck", "Ziel", "km Start", "km Ende", "Strecke km", "Status"]
    data = []
    for r in rows:
        strecke = (r["km_ende"] - r["km_start"]) if r["km_ende"] is not None and r["km_start"] is not None else ""
        data.append([r["kennzeichen"], r["fahrer_name"], r["von"], r["bis"], r["zweck"], r["ziel"],
                     r["km_start"], r["km_ende"], strecke, r["status"]])
    return _csv_response(header, data, "fahrtenbuch.csv")


# ----------------------------------------------------------------- Frontend

@app.get("/", include_in_schema=False)
def index():
    return FileResponse(STATIC_DIR / "index.html")


# PWA: Manifest und Service Worker müssen auf Root-Ebene liegen (Scope "/").
@app.get("/manifest.webmanifest", include_in_schema=False)
def manifest():
    return FileResponse(STATIC_DIR / "manifest.webmanifest", media_type="application/manifest+json")


@app.get("/sw.js", include_in_schema=False)
def service_worker():
    return FileResponse(
        STATIC_DIR / "sw.js",
        media_type="application/javascript",
        headers={"Service-Worker-Allowed": "/", "Cache-Control": "no-cache"},
    )


# Digital Asset Links für die Android-App (Trusted Web Activity), siehe docs/ANDROID-APK.md.
@app.get("/.well-known/assetlinks.json", include_in_schema=False)
def assetlinks():
    fingerprints = [
        f.strip()
        for f in os.environ.get("TWA_SHA256_FINGERPRINT", "PLATZHALTER-BITTE-SETZEN").split(",")
        if f.strip()
    ]
    return JSONResponse([
        {
            "relation": ["delegate_permission/common.handle_all_urls"],
            "target": {
                "namespace": "android_app",
                "package_name": os.environ.get("TWA_PACKAGE_NAME", "de.privat.fuhrpark"),
                "sha256_cert_fingerprints": fingerprints,
            },
        }
    ])


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
