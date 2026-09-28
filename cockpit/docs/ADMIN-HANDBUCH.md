# Feind Cockpit – Admin-Handbuch

Für David als Admin. Stand: 28.09.2026 · Cockpit v1.0. Datenschema: `SCHEMA.md`.

Der Admin-Bereich funktioniert nur mit Live-Verbindung, also mit dem Cockpit über den
Artefakt-Link in claude.ai geöffnet. Lokal geöffnet erscheint „Kein Zugriff auf den
Artefakt-Speicher“.

## 1. Rollen und Freigaben

### Teilen-Menü (claude.ai)

| Freigabe | Wirkung im Cockpit |
|---|---|
| Viewer | liest alles, Banner „Nur Lesen“ |
| Contributor | pflegt Daten (Aufgaben, Zähler, Checklisten, Briefings), kann Admin-Zugang anfragen |
| Editor („Kann bearbeiten“) | zusätzlich Schreibrecht im Admin-Bereich |
| Owner | wie Editor |

### Warum „Kann bearbeiten“/Editor nötig ist

Die DB-Regel `{ path: "admin", write: "admin" }` lässt Schreibzugriffe auf `admin/*` nur für
Editor und Owner zu. Das setzt der Server durch, nicht die Seite. `admin/roles` bestimmt nur,
wer den Admin-Bereich **sieht**. Wer dort eingetragen ist, aber nur Contributor ist, sieht die
Konfiguration, alle Schreib-Schaltflächen sind jedoch gesperrt (Hinweis „nur Lesen: Freigabe
‚Editor‘ fehlt“).

### Admin-Zugang anfragen und genehmigen

1. Eine Person ohne Admin-Sicht öffnet die Welt **Admin** und schickt unter „Admin-Zugang
   anfragen“ eine Anfrage (optional mit Begründung). Gespeichert werden nur Konto-ID,
   Zeitpunkt und Begründung in `admin_requests/<userId>`.
2. Du siehst offene Anfragen unter **Admin → Zugänge** (Zähler am Reiter).
3. **Genehmigen** trägt die Konto-ID in `admin/roles` ein. **Ablehnen** setzt nur den Status.
4. Danach im Teilen-Menü die Freigabe **Editor** vergeben, sonst bleibt der Zugang lesend.
5. **Rolle entziehen** unter „Zusätzliche Admins“ entfernt die Sichtbarkeit. Die Freigabe im
   Teilen-Menü separat zurücknehmen.

Eigentümer und Editoren sind immer Admin und stehen nicht in der Liste.

## 2. Konfiguration: Entwurf → Vorschau → Veröffentlichen

Alle Einstellungen der Bereiche Schwellen, Module, Hinweis & Links, Funktionen und
Weiterentwicklung wirken erst nach dem Veröffentlichen. Die Leiste oben zeigt `Live: vN` und
den Entwurfsstand (ungespeichert / gespeichert / keiner).

| Schritt | Schaltfläche | Wirkung |
|---|---|---|
| Ändern | Felder im jeweiligen Bereich | nur in deiner Sitzung |
| Sichern | **Entwurf speichern** | schreibt `admin/draft`, für andere ändert sich nichts |
| Prüfen | **Vorschau testen** | zeigt den Entwurf nur dir (Banner „Vorschau“) |
| Freigeben | Notiz eintragen, **Veröffentlichen** | schreibt `admin/config` mit Version +1, Zeitpunkt, Konto-ID und Notiz ins Protokoll; `admin/draft` wird gelöscht |
| Zurück | **Verwerfen** | löscht den Entwurf, lädt den Live-Stand |

- Jede Veröffentlichung erhöht die Version. Das Änderungsprotokoll (**Admin → Protokoll**)
  behält die letzten 40 Einträge.
- Eine Notiz ist optional, aber empfohlen („Was wurde geändert?“, max. 300 Zeichen).
- Rücknahme: alte Werte eintragen und erneut veröffentlichen. Es gibt kein automatisches Zurückrollen.

## 3. Schwellen & Regionen

| Feld | Bedeutung |
|---|---|
| Entwurf hängt nach | Tage, nach denen ein Content-Entwurf als hängend gilt (`staleDraftDays`) |
| Lead-Follow-up fällig nach | Tage ohne Kontakt bis zum Follow-up-Hinweis (`followupDays`) |
| Ausschreibung rot bis | Resttage bis Frist für Ampel Rot (`tenderRedDays`) |
| Ausschreibung gelb bis | Resttage bis Frist für Ampel Gelb (`tenderYellowDays`) |
| Feste Regionen im Filter | eine Region je Zeile |

Beim Veröffentlichen werden Schwellen und Regionen zusätzlich nach `settings/general`
gespiegelt, denn dort liest der Sync-Skill. InfraTech-Einstellungen (Team, Erinnerungen) liegen
getrennt in `settings/infratech` und werden in der InfraTech-Welt unter „Team & Zugriff“ gepflegt.

## 4. Module & Reiter

- Marketing-Module ein- und ausblenden, Reihenfolge mit ↑/↓ ändern, Titel und Kurzname des
  Reiters überschreiben (leer = Standard).
- **Start-Ansicht:** Welt und Marketing-Reiter beim Öffnen.
- **Titel:** Überschrift im Kopf (Standard „Feind Cockpit“).

Ausgeblendete Module behalten ihre Daten. Der Sync schreibt weiter hinein.

## 5. Hinweisbanner & Links

- **Hinweisbanner für alle:** anzeigen ja/nein, Art (Information, Achtung, Störung), Text,
  „Ausblenden ab“ (Datum). „Störung“ nur bei echten Ausfällen verwenden.
- **Schnellzugriff-Links:** erscheinen in der Marketing-Leiste, nur `https://`-Adressen.
  Keine Links auf Dokumente mit personenbezogenen Daten Dritter.

## 6. Funktionen & Quellen

### KI-Briefings

- Schalter „KI-Briefings (Tagesbrief + Messe-Briefing) anbieten“.
- Erzeugt werden sie über die Capability `sample`. Tagesbrief → `briefings/<JJJJ-MM-TT>`,
  Messe-Briefing → `briefings/<JJJJ-MM-TT>-messe`.
- Die Prompt-Vorlagen (`PROMPTS` im Code) sind im Klartext hinterlegt: nur Daten aus dem
  Speicher, keine Personennamen, keine Preise, keine erfundenen Zahlen, Rechtsthemen mit
  „Bitte Rechtsabteilung prüfen.“, offene GL-Entscheidungen nur benennen.
- Ohne Schreibrecht wird das Briefing angezeigt, aber nicht gespeichert.

### Notion-Live und Feeds

- Schalter „Live-Abfrage aus Notion“. Aus = eingebetteter Snapshot.
- Vier Feeds: Arbeitspakete, Meilensteine, GL-Entscheidungen, Messgrößen. Leer = Standard-Ansicht.
  Nur Notion-Ansichtslinks (`https://app.notion.com/…?v=…` bzw. `notion.so`).
- Abfrage über den Connector „Notion“, Werkzeug `notion-query-data-sources`, jede Minute.
  Änderungen an Feeds wirken nach dem nächsten Laden der Seite.
- Zusatzhinweise (abgelaufene Fristen, Referenzen ohne Freigabe) separat schaltbar.

Die Tabelle „Datenzufluss“ zeigt, welcher Skill welche Sammlung befüllt.

## 7. Datenpflege

Wirkt **sofort für alle**, ohne Entwurf. Nur mit Editor-Freigabe und Schreibrecht.

- **Sammlung wählen**, Filter über den Inhalt, bis zu 200 Treffer in der Liste.
- **JSON-Editor:** Datensatz auswählen, bearbeiten, **Speichern**. Neuer Datensatz: ID eingeben
  (erlaubt: Buchstaben, Ziffern, `_ - . ~ : @ +`), JSON-Objekt einfügen, **Anlegen**.
  Speichern ersetzt das ganze Dokument (`set`).
- **Export JSON:** lädt die gewählte Sammlung als `cockpit-<sammlung>-<datum>.json`
  (Capability `downloads`, sonst Browser-Download, sonst Zwischenablage).
- **Löschen:** zweistufig. Erster Klick → „Wirklich löschen“, zweiter Klick löscht endgültig.
  Vorher exportieren. InfraTech-Aufgaben besser archivieren (`archived: true`) als löschen.
- Jede Speicherung und Löschung landet im Aktivitätsprotokoll (nur Konto-ID).

## 8. Migration Schritt für Schritt

Ziel: Altbestände aus A2, A3 und A4 verlustfrei ins Cockpit übernehmen. Nur Editor/Owner.

1. **Backup herunterladen (Pflicht).** Lädt alle Sammlungen als
   `feind-cockpit-backup-<datum>.json`. Ohne Backup bleibt „Plan berechnen“ gesperrt.
   Datei außerhalb des Artefakts ablegen.
2. **Quell-Export einfügen (optional).** Im Altartefakt unter Admin → Datenpflege →
   Export JSON erzeugen oder von Claude erstellen lassen. Format:
   `{ "a2": { "leads": [ … ], "events": [ … ] }, "a3": { "erfassung": [ … ] } }`.
3. **Plan berechnen.** Zeigt jede Schreiboperation und alle Konflikte, bevor etwas passiert.
   Ist die Liste leer: „Nichts zu migrieren – Stand ist konsolidiert“.
4. **Plan prüfen.** Anzahl Schreibvorgänge, Konflikte (Zielstand bleibt), keine Personennamen.
5. **Ausführen.** Erster Klick → „Wirklich N Schreibvorgänge ausführen“, zweiter Klick schreibt.
   Das Sitzungsprotokoll zeigt Erfolge und Fehler je Dokument.

Alternativ offline: `npm run migrate:cockpit -- --target backup.json --a2 a2.json --a3 a3.json --out plan.json`
und den Plan paketweise (≤ 50) mit `ArtifactData batch` schreiben lassen.

### Regeln

- **Nie löschen, nie Vorhandenes überschreiben.** Die Migration ist idempotent, ein zweiter
  Lauf erzeugt keine Änderungen.
- **`leads/<id>` (Marketing)** → `mkt_leads/<id>`. Die Quelle erhält nur `migratedTo`.
  `leads/counts` (Messe-Lead-Zähler) bleibt unberührt.
- **`overrides/<id>`** → `tasks/<id>`. Übernommen werden nur Felder, die in `tasks` fehlen.
  Die Quelle erhält `migratedAt`. Beispiel: `overrides/i1` (Innovationspreis eingereicht) → `tasks/i1`.
- **A3-Erfassung** `erfassung/<id>` → `tasks/a3-<id>` mit Status, Frist, Budget, Beschluss und
  Notiz. **Verantwortliche Personen werden nicht übernommen.**
- A2-Sammlungen (`content`, `tenders`, `events`, …) werden nur ergänzt. Bei Konflikt gilt der Zielstand.
- `admin/config` und `admin/roles` werden nur übernommen, wenn im Ziel noch keine existieren.

## 9. Datenschutz-Checkliste

- [ ] Leads nur als Organisation. Keine Namen, E-Mail-Adressen oder Telefonnummern von Personen.
- [ ] Personen nur als opake Konto-ID (`u_…`). Keine Klarnamen in `tasks`, `activity`, `notes`.
- [ ] Referenzen mit Kundennamen nur bei `clientApproved: true`.
- [ ] Quell-Exporte und Backups vor dem Einfügen auf Personendaten prüfen, danach nicht im Repository ablegen.
- [ ] Keine Zugangsdaten, Tokens oder privaten Links in Konfiguration, Links oder Datensätzen.
- [ ] Anhänge (`assets`) nur ohne Personendaten Dritter.
- [ ] Fragen zu Einwilligung, Verträgen, Zoll, Versicherung oder Arbeitsrecht: **Bitte Rechtsabteilung prüfen.**

## 10. Fehlerbilder und Lösungen

| Anzeige | Ursache | Lösung |
|---|---|---|
| Banner „Nur Lesen“ | Freigabe Contributor (Daten) bzw. Editor (Admin) fehlt, oder ein Schreibversuch wurde abgelehnt (`not_granted`, `invalid_argument`, `revoked`) | Freigabe im Teilen-Menü prüfen, Seite neu laden |
| Banner „Offline-Modus“ | kein geteilter Speicher, Datei lokal oder außerhalb claude.ai geöffnet | über den Artefakt-Link in claude.ai öffnen. InfraTech-Änderungen dieses Geräts liegen nur in `localStorage` und sind danach manuell abzugleichen |
| „Notion nicht verbunden“ | Connector fehlt (`server_not_connected`) | claude.ai → Einstellungen → Connectors → Notion verbinden |
| „Notion-Verbindung abgelaufen“ / „nicht freigegeben“ / „durch Organisationsrichtlinie gesperrt“ | `needs_reauth`, `not_in_manifest`, `blocked_by_policy` | neu verbinden; bei `not_in_manifest` `mcp`-Capability beim Veröffentlichen prüfen; bei Richtlinie IT fragen. Bis dahin gilt der Snapshot |
| „Speicher voll – alte Datensätze aufräumen.“ | `quota_exceeded` (5.000 Dokumente oder 256 KiB je Dokument) | Backup ziehen, veraltete Datensätze exportieren und löschen, große Dokumente teilen |
| „zu viele Anfragen, bitte kurz warten.“ | `resource_exhausted` | kurz warten, erneut versuchen |
| KI-Briefing „nicht verfügbar“ | `sample` fehlt, `not_granted`, `sampling_disabled`, `rate_limited`, `session_expired` | Capability prüfen, in claude.ai neu anmelden oder später erneut; bei Formatfehler erneut erzeugen |
| Admin-Schaltflächen gesperrt | nur Sicht über `admin/roles`, keine Editor-Freigabe | im Teilen-Menü Editor vergeben |

## 11. Wartung

- **Notion-Snapshot bei Republish:** Der eingebettete Plan (`<script id="plan90">`, Feld `stand`)
  ist Notfall-Anzeige. Vor jedem erneuten Veröffentlichen den Snapshot aus Notion aktualisieren
  und `stand` anpassen.
- **5.000-Dokumente-Grenze:** Datenbestand unter Admin → Status regelmäßig prüfen. Ab etwa
  4.000 Dokumenten aufräumen (nach Backup).
- **Protokoll max. 400:** Das Aktivitätsprotokoll (`activity`) wird automatisch auf 400 Einträge
  gekürzt, angezeigt werden 200. Für längere Nachweise vorher exportieren.
- **Änderungsprotokoll der Konfiguration:** hält 40 Veröffentlichungen.
- **Nach Code-Änderungen:** `npm run test:cockpit` und `npm run e2e:cockpit` vor dem Veröffentlichen.
