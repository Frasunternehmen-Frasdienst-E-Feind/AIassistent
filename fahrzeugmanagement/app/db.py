"""SQLite-Anbindung und Schema für das Fahrzeugmanagement."""
from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

# Die Datenbank liegt bewusst außerhalb des Projektordners (privates Benutzerverzeichnis),
# damit Daten und Code strikt getrennt bleiben. Überschreibbar per FAHRZEUG_DB.
DEFAULT_DB_DIR = Path.home() / ".fuhrpark"
DB_PATH = Path(os.environ.get("FAHRZEUG_DB", DEFAULT_DB_DIR / "fahrzeuge.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kennzeichen TEXT NOT NULL UNIQUE,
    hersteller TEXT NOT NULL,
    modell TEXT NOT NULL,
    typ TEXT NOT NULL DEFAULT 'PKW',
    erstzulassung TEXT,
    kilometerstand INTEGER NOT NULL DEFAULT 0,
    hu_termin TEXT,
    naechste_wartung_datum TEXT,
    naechste_wartung_km INTEGER,
    status TEXT NOT NULL DEFAULT 'verfuegbar',
    notizen TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    abteilung TEXT NOT NULL DEFAULT '',
    fuehrerscheinklasse TEXT NOT NULL DEFAULT 'B',
    fuehrerschein_kontrolle_am TEXT,
    telefon TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    aktiv INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
    von TEXT NOT NULL,
    bis TEXT NOT NULL,
    zweck TEXT NOT NULL DEFAULT '',
    ziel TEXT NOT NULL DEFAULT '',
    km_start INTEGER,
    km_ende INTEGER,
    status TEXT NOT NULL DEFAULT 'geplant',
    notizen TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS maintenance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    datum TEXT NOT NULL,
    typ TEXT NOT NULL DEFAULT 'Inspektion',
    kilometerstand INTEGER,
    kosten REAL NOT NULL DEFAULT 0,
    werkstatt TEXT NOT NULL DEFAULT '',
    beschreibung TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bookings_vehicle ON bookings(vehicle_id, von, bis);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON maintenance(vehicle_id, datum);
"""


def connect(path: Path | None = None) -> sqlite3.Connection:
    target = Path(path or DB_PATH)
    target.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(target, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(path: Path | None = None) -> None:
    conn = connect(path)
    try:
        conn.executescript(SCHEMA)
        conn.commit()
    finally:
        conn.close()


@contextmanager
def get_conn(path: Path | None = None) -> Iterator[sqlite3.Connection]:
    conn = connect(path)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def rows_to_dicts(rows: list[sqlite3.Row]) -> list[dict]:
    return [dict(r) for r in rows]
