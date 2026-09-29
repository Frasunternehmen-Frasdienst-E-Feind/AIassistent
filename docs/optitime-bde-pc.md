# BDE_PC (OptiControl) – Analyse der Zeiterfassung

Stand 24.09.2026. Grundlage: die echten Dateien der Installation auf
`NB-EFEIND-0021` (Protokoll vom 20.08. bis 11.09.2026, 11.004 Zeilen) sowie die
Produktunterlagen des Herstellers. Personenbezogene Inhalte und Zugangsdaten
sind hier nicht wiedergegeben.

## 1. Was BDE_PC ist

`BDE_PC.exe` ist der stationäre PC-Erfassungsplatz von **OptiControl**, dem
Zeitwirtschaftssystem der **OptiTime GmbH & Co. KG**, Schulten Sundern 14,
48432 Rheine (Tel. +49 5975 9282-0, info@optitime.de). OptiControl besteht aus
der Personalzeiterfassung (PZE, Kommt/Geht) und der darauf aufsetzenden
Betriebsdatenerfassung (BDE, Buchung auf Aufträge und Kostenstellen). Erfasst
wird wahlweise am Terminal, am PC, mobil per App oder per digitalem Stift.
Der Hersteller nennt Schnittstellen zu Lohn- und Gehaltsprogrammen sowie zu
ERP-Systemen als Standardfunktion.

`BDE_PC.exe` ist damit **kein eigenständiges Programm mit eigener Datenhaltung**,
sondern die Bedienoberfläche eines Client-Server-Systems.

## 2. Wie es arbeitet

### Zentrale Datenhaltung
Das Protokoll zeigt den Betrieb eindeutig: Der Client prüft im Takt von
120 Sekunden die Datenbankverbindung (`Überprüfung der DB-Verbindung`,
4.288 Vorgänge in 17 Tagen) und schreibt jede Buchung direkt in die zentrale
Datenbank (`InsertStunden`, `UpdateStunden`). Die Buchungen liegen also bereits
zentral – der PC ist Eingabegerät, nicht Datenspeicher.

Als Serverablage ist die Freigabe `\\S21\OptiControl` hinterlegt
(Einstellung `ANTRAGPFADOPTI`, genutzt für digitale Anträge).

### Maßgebliche Zeit
`SERVERZEIT = 1` und `LOKALZEIT = 0`: Die Serverzeit gilt, nicht die Uhr des
Arbeitsplatzes. Das ist für jede Auswertung wichtig, die lokale Protokolle
heranzieht.

### Identifikation des Mitarbeiters
`ANMELDWINDOWS = 1` – die **Windows-Anmeldung** identifiziert die Person.
`BESITZER = 0` (kein fest verdrahteter Besitzer); beim Start liest das Programm
den Besitzer (`LeseBesitzer`). Jedes Windows-Profil führt daher seinen eigenen
Datenordner unter `%LOCALAPPDATA%\OptiTime`.

### Offline-Betrieb
Beim Start und danach alle 300 Sekunden lädt der Client Stammdaten-Kopien
(`LadeOfflineListen`), damit bei Ausfall der Datenbank weitergestempelt werden
kann. Diese Kopien sind die `Offliste*.txt`-Dateien.

## 3. Dateien je Arbeitsplatz

Verzeichnis: `C:\Users\<windows-benutzer>\AppData\Local\OptiTime`

| Datei | Inhalt |
| --- | --- |
| `logger.txt` | Laufendes Protokoll aller Vorgänge, Detailgrad über `LOGGERSTUFE` |
| `OfflisteMa.txt` | Mitarbeiterstamm (546 Sätze), µ-getrennt |
| `OfflisteTaet.txt` | Tätigkeiten, µ-getrennt |
| `OfflisteAuf.txt` | Aufträge (499 Sätze), µ-getrennt |
| `config.ini` | Einstellungen des Erfassungsplatzes, 542 Schlüssel |

`bde_pc.ini` wird beim Wiederverbinden erwartet, fehlt auf diesem Rechner
(58-mal `Fehler Reconnect: bde_pc.ini ist nicht vorhanden`). Der Reconnect
gelingt trotzdem gelegentlich, die Datei gehört vermutlich ins
Installationsverzeichnis und nicht ins Benutzerprofil. **Von der IT zu klären.**

### Protokollformat
```
20.08.2026 13:01:05 1/10[NB-EFEIND-0021] - Programm gestartet
```
Datum, Uhrzeit, Detailstufe/Maximalstufe, Rechnername, Meldung.

### Tätigkeitsschlüssel (aus `OfflisteTaet.txt`)

| Schlüssel | Bedeutung |
| --- | --- |
| `000999` | Kommen |
| `000007` | *Pause* |
| `000000` | Arbeitsende vom System |
| `000004` | Sonderurlaub |
| `000803` | Arbeit trotz Krankheit |

### Ablauf einer Buchung
```
PNR 1626 war heute bereits anwesend.
VerarbeiteBuchung: Insert/Update
VerarbeiteBuchung: Geänderte Buchung      -> UpdateStunden  (vorherige wird beendet)
VerarbeiteBuchung: Neue Buchung           -> InsertStunden  (neue beginnt)
Erzeuge_Buchung_Online Meldung: <Name> hat umgestempelt.
```
Jede Buchung beendet die vorherige. Übernommen werden darf nur, was das
Terminal bestätigt hat („hat an-/um-/ausgestempelt"); abgewiesene Versuche
stehen ebenfalls im Protokoll.

### Bekannte Eigenheit
In der Zeile
`VerarbeiteBuchung: PNR=1626 KST=000007 BEG_STD=15 BEG_MIN=15`
enthalten `BEG_STD` **und** `BEG_MIN` die Stunde. Belegt über alle 77 Buchungen
(15/15, 6/6, 9/9 …). Maßgeblich ist deshalb der Zeitstempel der Protokollzeile,
nicht `BEG_MIN`.

## 4. Grenze des lokalen Protokolls

Das Protokoll kennt nur, was **an diesem Rechner** passiert ist. Die Tätigkeit
`000000 Arbeitsende vom System` ist im Stamm hinterlegt, kommt im Protokoll
dieses Rechners aber **kein einziges Mal** vor. Schließt der Server einen Tag
automatisch ab, bleibt die Buchung lokal unsichtbar und der Tag erscheint
offen – genau das Muster der offenen Tage vom 20.08. und 14.09.2026.

Eine Auswertung allein aus lokalen Protokollen ist daher **immer unvollständig**.
Vollständig ist nur die zentrale Datenbank.

## 5. Takte und Kennzahlen dieser Installation

| Einstellung | Wert | Wirkung |
| --- | --- | --- |
| `PRUEFDBSTATUS` | 120 s | Prüfung der Datenbankverbindung |
| `PRUEFKONFIG` | 300 s | Erneutes Lesen der Konfiguration |
| `OFFLINELISTENLADEN` | 300 s | Erneutes Laden der Stammdaten |
| `RECONNECT` | 120 s | Wiederverbindungsversuch |
| `BUCHLISTETAGE` | 30 | Sichtbarer Zeitraum in der Buchungsliste |
| `LOGGERSTUFE` | 10 | Maximaler Detailgrad des Protokolls |
| `DEFAULTKST` | `000999` | Vorbelegung Kommen |

Protokollumfang: rund 650 Zeilen je Arbeitstag, etwa 33 KB. In 17 Arbeitstagen
26 Programmstarts, 24 reguläre Beendigungen, 77 Buchungen, ausschließlich
Personalnummer 1626.

## 6. Datenschutz

`config.ini` enthält Zugangsdaten im Klartext (SMTP-Kennwort für den
Antragsversand). Die Datei gehört nicht in ein Repository, in eine Sicherung
oder in einen Diagnosebericht ohne Maskierung.

Die Stammdatenkopien enthalten den vollständigen Mitarbeiterstamm des
Unternehmens. Für die eigene Zeitauswertung wird davon nur die eigene
Personalnummer benötigt; alle übrigen Sätze bleiben ungenutzt.

Eine Auswertung, die Zeiten **anderer Beschäftigter** sichtbar macht, ist eine
Verarbeitung von Beschäftigtendaten und berührt die Mitbestimmung nach
§ 87 Abs. 1 Nr. 6 BetrVG (technische Einrichtung zur Leistungskontrolle).
Vor einem solchen Schritt: **bitte Rechtsabteilung prüfen** und den Betriebsrat
einbeziehen.
