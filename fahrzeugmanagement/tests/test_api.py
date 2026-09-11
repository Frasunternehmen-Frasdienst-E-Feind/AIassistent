"""API-Tests für das Fahrzeugmanagement (SQLite-Datei pro Testlauf)."""
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from app import db
from app.main import app


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "test.db")
    with TestClient(app) as c:
        yield c


def _vehicle(client, **overrides):
    payload = {"kennzeichen": "EF-FD 100", "hersteller": "VW", "modell": "Crafter", "typ": "Transporter",
               "kilometerstand": 45000}
    payload.update(overrides)
    r = client.post("/api/vehicles", json=payload)
    assert r.status_code == 201, r.text
    return r.json()


def _driver(client, **overrides):
    payload = {"name": "Max Muster", "abteilung": "Fertigung",
               "fuehrerschein_kontrolle_am": date.today().isoformat()}
    payload.update(overrides)
    r = client.post("/api/drivers", json=payload)
    assert r.status_code == 201, r.text
    return r.json()


def test_index_served(client):
    r = client.get("/")
    assert r.status_code == 200
    assert "Fuhrpark" in r.text and 'id="mainnav"' in r.text


def test_vehicle_crud_and_plate_normalization(client):
    v = _vehicle(client, kennzeichen="ef-fd 100")
    assert v["kennzeichen"] == "EF-FD 100"
    assert client.post("/api/vehicles", json={"kennzeichen": "ef-fd  100", "hersteller": "x", "modell": "y"}).status_code == 409

    r = client.put(f"/api/vehicles/{v['id']}", json={**v, "kilometerstand": 46000, "status": "werkstatt"})
    assert r.status_code == 200 and r.json()["kilometerstand"] == 46000

    assert client.get("/api/vehicles?status=werkstatt").json()[0]["id"] == v["id"]
    assert client.get("/api/vehicles?q=craft").json()[0]["id"] == v["id"]
    assert client.delete(f"/api/vehicles/{v['id']}").status_code == 204
    assert client.get(f"/api/vehicles/{v['id']}").status_code == 404


def test_booking_overlap_and_km_update(client):
    v = _vehicle(client)
    d = _driver(client)
    base = {"vehicle_id": v["id"], "driver_id": d["id"], "zweck": "Kundenbesuch"}

    r = client.post("/api/bookings", json={**base, "von": "2026-09-14T08:00", "bis": "2026-09-14T12:00", "status": "aktiv"})
    assert r.status_code == 201, r.text
    first = r.json()
    assert first["kennzeichen"] == "EF-FD 100" and first["fahrer_name"] == "Max Muster"
    assert client.get(f"/api/vehicles/{v['id']}").json()["status"] == "unterwegs"

    # Überschneidung -> 409
    r = client.post("/api/bookings", json={**base, "von": "2026-09-14T11:00", "bis": "2026-09-14T15:00"})
    assert r.status_code == 409

    # Anschlusstermin ohne Überschneidung -> ok
    r = client.post("/api/bookings", json={**base, "von": "2026-09-14T12:00", "bis": "2026-09-14T15:00"})
    assert r.status_code == 201

    # bis <= von -> 422
    r = client.post("/api/bookings", json={**base, "von": "2026-09-15T12:00", "bis": "2026-09-15T12:00"})
    assert r.status_code == 422

    # Abschluss mit km_ende schreibt Kilometerstand fort und gibt Fahrzeug frei
    r = client.put(f"/api/bookings/{first['id']}", json={**first, "status": "abgeschlossen", "km_start": 45000, "km_ende": 45230})
    assert r.status_code == 200, r.text
    veh = client.get(f"/api/vehicles/{v['id']}").json()
    assert veh["kilometerstand"] == 45230 and veh["status"] == "verfuegbar"


def test_active_trip_lookup(client):
    """Fahrer-Startseite: laufende Fahrt per status=aktiv&driver_id finden, nach Abschluss leer."""
    v = _vehicle(client)
    d = _driver(client)
    other = _driver(client, name="Andere Person")
    r = client.post("/api/bookings", json={"vehicle_id": v["id"], "driver_id": d["id"], "von": "2026-09-14T08:00",
                                           "bis": "2026-09-14T12:00", "km_start": 45000, "status": "aktiv"})
    trip = r.json()
    assert [b["id"] for b in client.get(f"/api/bookings?status=aktiv&driver_id={d['id']}").json()] == [trip["id"]]
    assert client.get(f"/api/bookings?status=aktiv&driver_id={other['id']}").json() == []

    client.put(f"/api/bookings/{trip['id']}", json={**trip, "status": "abgeschlossen", "km_ende": 45080})
    assert client.get(f"/api/bookings?status=aktiv&driver_id={d['id']}").json() == []


def test_inactive_driver_cannot_book_and_cannot_be_deleted_with_bookings(client):
    v = _vehicle(client)
    d = _driver(client)
    client.post("/api/bookings", json={"vehicle_id": v["id"], "driver_id": d["id"], "von": "2026-10-01T08:00", "bis": "2026-10-01T10:00"})
    assert client.delete(f"/api/drivers/{d['id']}").status_code == 409

    client.put(f"/api/drivers/{d['id']}", json={**d, "aktiv": False})
    r = client.post("/api/bookings", json={"vehicle_id": v["id"], "driver_id": d["id"], "von": "2026-10-02T08:00", "bis": "2026-10-02T10:00"})
    assert r.status_code == 422


def test_maintenance_updates_vehicle_dates_and_km(client):
    v = _vehicle(client, kilometerstand=50000)
    r = client.post("/api/maintenance", json={
        "vehicle_id": v["id"], "datum": "2026-09-01", "typ": "HU/AU", "kilometerstand": 51000, "kosten": 149.9,
        "werkstatt": "TÜV Süd", "naechste_wartung_km": 60000, "hu_termin_neu": "2028-09-01",
    })
    assert r.status_code == 201, r.text
    veh = client.get(f"/api/vehicles/{v['id']}").json()
    assert veh["kilometerstand"] == 51000
    assert veh["naechste_wartung_km"] == 60000
    assert veh["hu_termin"] == "2028-09-01"
    assert client.get(f"/api/maintenance?vehicle_id={v['id']}").json()[0]["kennzeichen"] == "EF-FD 100"


def test_dashboard_due_items(client):
    today = date(2026, 9, 11)
    _vehicle(client, kennzeichen="EF-A 1", hu_termin=(today - timedelta(days=3)).isoformat())
    _vehicle(client, kennzeichen="EF-A 2", hu_termin=(today + timedelta(days=10)).isoformat(),
             naechste_wartung_km=45500, kilometerstand=45000)
    _vehicle(client, kennzeichen="EF-A 3", hu_termin=(today + timedelta(days=200)).isoformat())
    _vehicle(client, kennzeichen="EF-A 4", hu_termin=(today - timedelta(days=30)).isoformat(), status="ausser_betrieb")
    _driver(client, name="Ohne Kontrolle", fuehrerschein_kontrolle_am=None)
    _driver(client, name="Kontrolle alt", fuehrerschein_kontrolle_am=(today - timedelta(days=200)).isoformat())
    _driver(client, name="Kontrolle frisch", fuehrerschein_kontrolle_am=(today - timedelta(days=10)).isoformat())

    r = client.get(f"/api/dashboard?stichtag={today.isoformat()}")
    assert r.status_code == 200, r.text
    dash = r.json()
    assert dash["fahrzeuge_gesamt"] == 4
    assert dash["status_verteilung"] == {"verfuegbar": 3, "ausser_betrieb": 1}

    arten = [(f["art"], f["referenz"].split(" (")[0], f["ueberfaellig"]) for f in dash["faellig"]]
    assert ("HU/AU", "EF-A 1", True) in arten
    assert ("HU/AU", "EF-A 2", False) in arten
    assert ("Wartung (km)", "EF-A 2", False) in arten
    assert not any(ref == "EF-A 3" for _, ref, _ in arten)
    assert not any(ref == "EF-A 4" for _, ref, _ in arten)  # außer Betrieb wird ignoriert
    assert ("Führerscheinkontrolle", "Ohne Kontrolle", True) in arten
    assert ("Führerscheinkontrolle", "Kontrolle alt", True) in arten
    assert not any(ref == "Kontrolle frisch" for _, ref, _ in arten)
    # Überfällige zuerst
    assert dash["faellig"][0]["ueberfaellig"] is True


def test_csv_exports(client):
    v = _vehicle(client)
    d = _driver(client)
    client.post("/api/bookings", json={"vehicle_id": v["id"], "driver_id": d["id"], "von": "2026-09-14T08:00",
                                       "bis": "2026-09-14T12:00", "km_start": 100, "km_ende": 180, "status": "abgeschlossen"})
    r = client.get("/api/export/vehicles.csv")
    assert r.status_code == 200 and "EF-FD 100" in r.text and r.text.startswith("﻿")
    r = client.get("/api/export/fahrtenbuch.csv?von=2026-09-01&bis=2026-09-30")
    assert "Max Muster" in r.text and ";80;" in r.text
    r = client.get("/api/export/fahrtenbuch.csv?von=2026-10-01")
    assert "Max Muster" not in r.text
