"""Legt Demo-Daten an (nur für Test/Präsentation). Aufruf: python seed_demo.py"""
from datetime import date, timedelta

from app import db

today = date.today()
d = lambda days: (today + timedelta(days=days)).isoformat()  # noqa: E731

db.init_db()
with db.get_conn() as conn:
    if conn.execute("SELECT COUNT(*) FROM vehicles").fetchone()[0]:
        raise SystemExit("Datenbank enthält bereits Fahrzeuge – Seed übersprungen.")
    conn.executemany(
        """INSERT INTO vehicles (kennzeichen, hersteller, modell, typ, erstzulassung, kilometerstand, hu_termin,
           naechste_wartung_datum, naechste_wartung_km, status) VALUES (?,?,?,?,?,?,?,?,?,?)""",
        [
            ("AB-XY 101", "VW", "Crafter", "Transporter", "2022-03-15", 68400, d(12), d(45), 70000, "verfuegbar"),
            ("AB-XY 102", "Skoda", "Octavia Combi", "PKW", "2023-06-01", 31200, d(300), None, 45000, "verfuegbar"),
            ("AB-XY 103", "Ford", "Transit", "Transporter", "2019-11-20", 142000, d(-5), d(-2), None, "werkstatt"),
            ("AB-XY 104", "Mercedes", "Sprinter", "Transporter", "2021-01-10", 98750, d(120), d(20), 100000, "verfuegbar"),
            ("FS 7", "Linde", "H25", "Stapler", "2018-05-01", 0, d(60), d(10), None, "verfuegbar"),
        ],
    )
    conn.executemany(
        "INSERT INTO drivers (name, abteilung, fuehrerscheinklasse, fuehrerschein_kontrolle_am, telefon) VALUES (?,?,?,?,?)",
        [
            ("Anna Beispiel", "Vertrieb", "B", d(-30), "0000 000-11"),
            ("Bernd Muster", "Fertigung", "B, C1", d(-190), "0000 000-12"),
            ("Claudia Test", "Marketing", "B", None, "0000 000-13"),
        ],
    )
    conn.executemany(
        "INSERT INTO bookings (vehicle_id, driver_id, von, bis, zweck, ziel, km_start, km_ende, status) VALUES (?,?,?,?,?,?,?,?,?)",
        [
            (2, 1, f"{d(0)}T08:00", f"{d(0)}T17:00", "Kundenbesuch", "Jena", 31200, None, "aktiv"),
            (1, 2, f"{d(2)}T07:00", f"{d(2)}T16:00", "Auslieferung", "Gotha", None, None, "geplant"),
            (4, 3, f"{d(7)}T06:00", f"{d(9)}T20:00", "Messe", "Hannover", None, None, "geplant"),
            (1, 1, f"{d(-10)}T08:00", f"{d(-10)}T14:00", "Materialabholung", "Weimar", 68100, 68400, "abgeschlossen"),
        ],
    )
    conn.execute("UPDATE vehicles SET status='unterwegs' WHERE id=2")
    conn.executemany(
        "INSERT INTO maintenance (vehicle_id, datum, typ, kilometerstand, kosten, werkstatt, beschreibung) VALUES (?,?,?,?,?,?,?)",
        [
            (1, d(-120), "Inspektion", 60000, 489.00, "VW Autohaus", "60.000-km-Inspektion"),
            (3, d(-1), "Reparatur", 142000, 1250.50, "Freie Werkstatt", "Bremsen vorne + Kupplung"),
            (2, d(-200), "Reifenwechsel", 22000, 89.00, "Reifen-Service", "Sommerreifen"),
        ],
    )
print("Demo-Daten angelegt.")
