"""Pydantic-Schemas für Ein- und Ausgabe der API."""
from __future__ import annotations

from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

VehicleType = Literal["PKW", "Transporter", "LKW", "Stapler", "Anhaenger", "Sonstiges"]
VehicleStatus = Literal["verfuegbar", "unterwegs", "werkstatt", "ausser_betrieb"]
BookingStatus = Literal["geplant", "aktiv", "abgeschlossen", "storniert"]
MaintenanceType = Literal[
    "Inspektion", "HU/AU", "Reifenwechsel", "Reparatur", "Oelwechsel", "Sonstiges"
]


def _normalize_plate(value: str) -> str:
    return " ".join(value.upper().split())


class VehicleIn(BaseModel):
    kennzeichen: str = Field(min_length=3, max_length=15)
    hersteller: str = Field(min_length=1, max_length=60)
    modell: str = Field(min_length=1, max_length=60)
    typ: VehicleType = "PKW"
    erstzulassung: Optional[date] = None
    kilometerstand: int = Field(default=0, ge=0)
    hu_termin: Optional[date] = None
    naechste_wartung_datum: Optional[date] = None
    naechste_wartung_km: Optional[int] = Field(default=None, ge=0)
    status: VehicleStatus = "verfuegbar"
    notizen: str = ""

    @field_validator("kennzeichen")
    @classmethod
    def normalize(cls, v: str) -> str:
        return _normalize_plate(v)


class Vehicle(VehicleIn):
    id: int
    created_at: str


class DriverIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    abteilung: str = ""
    fuehrerscheinklasse: str = Field(default="B", max_length=20)
    fuehrerschein_kontrolle_am: Optional[date] = None
    telefon: str = ""
    email: Optional[EmailStr] = None
    aktiv: bool = True


class Driver(DriverIn):
    id: int
    created_at: str


class BookingIn(BaseModel):
    vehicle_id: int
    driver_id: int
    von: datetime
    bis: datetime
    zweck: str = ""
    ziel: str = ""
    km_start: Optional[int] = Field(default=None, ge=0)
    km_ende: Optional[int] = Field(default=None, ge=0)
    status: BookingStatus = "geplant"
    notizen: str = ""

    @field_validator("bis")
    @classmethod
    def bis_after_von(cls, v: datetime, info):
        von = info.data.get("von")
        if von is not None and v <= von:
            raise ValueError("'bis' muss nach 'von' liegen")
        return v

    @field_validator("km_ende")
    @classmethod
    def km_ende_ge_start(cls, v: Optional[int], info):
        start = info.data.get("km_start")
        if v is not None and start is not None and v < start:
            raise ValueError("'km_ende' darf nicht kleiner als 'km_start' sein")
        return v


class Booking(BookingIn):
    id: int
    created_at: str
    kennzeichen: Optional[str] = None
    fahrer_name: Optional[str] = None


class MaintenanceIn(BaseModel):
    vehicle_id: int
    datum: date
    typ: MaintenanceType = "Inspektion"
    kilometerstand: Optional[int] = Field(default=None, ge=0)
    kosten: float = Field(default=0, ge=0)
    werkstatt: str = ""
    beschreibung: str = ""
    # Optional: Folgetermine direkt am Fahrzeug fortschreiben
    naechste_wartung_datum: Optional[date] = None
    naechste_wartung_km: Optional[int] = Field(default=None, ge=0)
    hu_termin_neu: Optional[date] = None


class Maintenance(BaseModel):
    id: int
    vehicle_id: int
    datum: date
    typ: str
    kilometerstand: Optional[int]
    kosten: float
    werkstatt: str
    beschreibung: str
    created_at: str
    kennzeichen: Optional[str] = None


class DueItem(BaseModel):
    art: str
    referenz: str
    faellig_am: Optional[date] = None
    faellig_km: Optional[int] = None
    tage_bis: Optional[int] = None
    ueberfaellig: bool
    hinweis: str


class Dashboard(BaseModel):
    stichtag: date
    fahrzeuge_gesamt: int
    status_verteilung: dict[str, int]
    aktive_buchungen: int
    faellig: list[DueItem]
    kosten_laufendes_jahr: float
