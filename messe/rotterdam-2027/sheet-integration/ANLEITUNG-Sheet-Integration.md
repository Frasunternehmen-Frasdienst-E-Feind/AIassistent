# Messe-Aufgaben ins Team-Sheet integrieren — Anleitung (Paket A)

Ziel: Ein Tab **„Messe-Aufgaben"** im Sheet *Aufgabenliste_Team_Marketing_FEIND*, der die
InfraTech-Aufgaben als **Live-Cockpit** zeigt und mit der Team-Liste gekoppelt ist. Die Aufgaben
laufen unter dem bestehenden **Thema „Events" / Unterthema „INFRA TECH 12. bis 15.01.2027"** und
damit in eurer vorhandenen Automatik (IDs, Wochenmail, Log, Backup).

## Wie die Kopplung funktioniert (ehrlich eingeordnet)
- **Innerhalb des Sheets ist die Kopplung echt und live:** Der Tab „Messe-Aufgaben" ist eine
  QUERY-Live-Ansicht auf den Tab „Aufgaben". Jede Änderung dort (Status, Frist, Notiz …) erscheint
  sofort im Messe-Cockpit. **Gepflegt/geändert wird im Tab „Aufgaben"** – so bleibt eure Automatik
  intakt (das entspricht euren bestehenden Ansichten „Übersicht"/„Meine Woche").
- **Claude-Cockpit ↔ Sheet:** Eine *automatische Echtzeit*-Kopplung zwischen dem Claude-Artefakt
  und Google Sheets ist technisch nicht verfügbar (kein Sheets-Schreib-Connector, Artefakt-Sandbox).
  Deshalb ist ab jetzt das **Sheet die führende Quelle für den Aufgabenstatus** des Teams; das
  Claude-Cockpit bleibt die visuelle Planungs-/Übersichtsebene und verweist auf das Sheet.
  *(Optional möglich: ein periodischer Abgleich durch den Messe-Manager-Agenten – auf Wunsch.)*

## Einrichtung (einmalig, nur David als Eigentümer)
> Empfehlung: zuerst an einer **Kopie** testen (Datei › Kopie erstellen). Das Skript **löscht nichts** –
> es legt nur den Tab „Messe-Aufgaben" an und hängt beim Import Zeilen unten am Aufgaben-Tab an.
> **Du musst den Tab-Namen nicht kennen:** das Skript **erkennt den Aufgaben-Tab automatisch**
> (sucht das Blatt mit einer Kopfzeile aus ID / Thema / Aufgabe / Status) und findet auch die
> Spalten selbst – egal wie sie angeordnet sind.

1. Sheet öffnen → Menü **Erweiterungen › Apps Script**.
2. Neue Skriptdatei anlegen (z. B. `Messe-Cockpit.gs`), den **kompletten Inhalt von `Messe-Cockpit.gs`** einfügen und **speichern** (💾).
3. Zurück ins Sheet, Seite **neu laden**. Es erscheint das Menü **„Messe-Cockpit"**.
4. Zum Prüfen einmal **„Messe-Cockpit › Erkannten Aufgaben-Tab anzeigen"** – zeigt, welchen Tab das Skript nutzt.
5. **„Messe-Cockpit › Tab ‚Messe-Aufgaben' einrichten / aktualisieren"** ausführen.
   Beim ersten Mal fragt Google **einmalig nach Berechtigungen** → erlauben (dein Konto, Eigentümer).
6. Optional, um die Cockpit-Aufgaben zu übernehmen: **„Messe-Cockpit › Cockpit-Aufgaben importieren (einmalig)"**.
   Das trägt ~25 InfraTech-Aufgaben als `MK-###`-Zeilen unter Events/InfraTech ein (idempotent –
   erneuter Lauf legt keine Dubletten an). Verantwortliche danach bei Bedarf im Aufgaben-Tab umverteilen.

## Was du bekommst
- **Tab „Messe-Aufgaben":** Kopf mit Countdown, Ampel (Gesamt/Aktiv/Überfällig/Fällig ≤ 14 T/Erledigt),
  Budgetrahmen, darunter die **Live-Tabelle** der InfraTech-Aufgaben (ID, Aufgabe, Priorität,
  Verantwortlich, Fällig, Status, Notiz), sortiert nach Fälligkeit.
- **Import** der Cockpit-Aufgaben in eure „Aufgaben"-Liste (mit Fristen rückwärts vom 12.01.2027).

## Corporate Design & Datenschutz
- CI aus `branding/feind-ci.tokens.json`: Grün `#84bb20` nur als Fläche, darauf Anthrazit `#424e4e`
  (nie Weiß); Rot `#e3000b` nur als Signal (überfällig). Status steht immer als **Text**, nicht nur Farbe.
- Es werden **keine personenbezogenen Daten Dritter** importiert (Verantwortlich = David, im Sheet frei
  umverteilbar). Bei vertraglichen/zoll-/versicherungsbezogenen Punkten gilt: **Bitte Rechtsabteilung prüfen.**

## Rückgängig machen
- Tab „Messe-Aufgaben" per Rechtsklick › Tab löschen. Importierte Zeilen: über **Datei › Versionsverlauf**
  oder das automatische Backup („Aufgabenliste_Backups") zurückholen.
