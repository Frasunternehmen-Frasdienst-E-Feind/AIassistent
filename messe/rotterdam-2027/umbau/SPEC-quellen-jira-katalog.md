# Kurz-Spec: Aufgaben aus Jira, Wissensarchiv liest Ablagen mit

Stand 09.11.2026 · Wünsche David (Kommentare im Cockpit 06.11. und 09.11.):
„Quelle über JIRA und Teams-SharePoint umstellen auf Aufgabenlisten“ und
„Alle Daten einlesen und kontinuierlich zuordnen, katalogisieren, vergleichen, kategorisieren.“

Entscheidungen David 09.11.2026:
- **Jira führt** bei Aufgaben, die SharePoint-Aufgabenlisten des Teams werden ergänzend angezeigt. Die Regel „Notion führt“ vom 22.10. (#89) ist damit aufgehoben.
- Das Wissensarchiv wertet laufend aus: abgelegte Dateien, **SharePoint Marketing, Dropbox und Notion**.
- Eingelesen wird **beim Öffnen des Cockpits**, nicht im Hintergrund.
- Dateien mit Personendaten werden **erkannt und zur Prüfung gelegt**, nicht automatisch eingeordnet.

## Teil A: Aufgaben-Quelle Jira

1. Das Modul InfraTech › Aufgaben liest Vorgänge lesend über den Atlassian-Connector der ansehenden Person (JQL-Suche). Angezeigt werden Titel, Status, Fälligkeit, Zuständig (nur Rolle, keine Namen) und Link.
2. Die bisherige Notion-Anbindung (`notion-tasks.js`, `app-notion-tasks.js`) bleibt im Code, wird aber über den Schalter `FEATURES.notionTasks` abgeschaltet. So bleibt ein Rückweg.
3. Die SharePoint-Aufgabenliste (`Aufgabenliste_Team_Marketing_FEIND.xlsx`, Einlesen über `read_resource` gibt es bereits) erscheint als zweiter Block „Teamliste“ unter den Jira-Vorgängen. Nur Anzeige, keine Schreibzugriffe.
4. Schreiben (Status ändern, neu anlegen) passiert vorerst **nur in Jira selbst**. Das Cockpit verlinkt dorthin. Schreibzugriff kommt nur nach einer eigenen Freigabe.
5. Die Quellenanzeige („Quelle: Notion live“) zeigt künftig „Quelle: Jira live · Teamliste SharePoint“.

Offen, vor dem Bau zu klären:
- Jira-Site und Projektschlüssel (vermutlich „MAR“) und die JQL, z. B. alle offenen Vorgänge mit Label `infratech-2027`.
- Ist der Atlassian-Connector in claude.ai für dich verbunden? Ohne ihn zeigt das Cockpit nur den eingebetteten Stand.
- Sollen die vorhandenen Notion-Aufgaben einmalig nach Jira übertragen werden? Das wäre ein eigener Schritt mit Freigabe und Sicherung vorher.

## Teil B: Wissensarchiv liest Ablagen mit

1. Beim Öffnen des Cockpits (Person mit Schreibrecht, Schalter `kbAuto` an) fragt das Cockpit je Quelle nur **neue oder seit dem letzten Lauf geänderte** Dateien ab:
   - SharePoint Marketing: `sharepoint_search` mit `afterDateTime`, nur unterhalb von `sites/Marketing`
   - Dropbox: `search` mit `last_modified_after`, nur im Ordner `/Marketing`
   - Notion: `notion-search`, sortiert nach letzter Änderung, wo der Tarif es erlaubt, sonst neueste Treffer der Stichwortsuche
2. Der Zeitpunkt des letzten Laufs je Quelle steht in `meta/kb_sync` (`{ sharepoint, dropbox, notion }` als ISO-Zeit). Das Dokument wird nur ergänzt, nie überschrieben.
3. Jeder Fund wird als Eintrag mit **Verweis** angelegt (`kb_items/<id>`, `origin: "sharepoint" | "dropbox" | "notion"`, `sourceUrl`). Die Datei wird nicht kopiert. Gelesen wird nur der Text für die Einordnung, über die vorhandene KI-Einordnung.
4. Doppelte Einträge erkennt das Cockpit über `sourceUrl` und den bestehenden Fingerabdruck. Bereits vorhandene Einträge werden aktualisiert, nicht neu angelegt.
5. Verdacht auf Personendaten (vorhandene Prüfung `pii`) setzt `status: "pruefen"`. Diese Einträge werden nicht eingeordnet und nicht mit anderen verknüpft.
6. Höchstens 25 Funde je Quelle und Lauf, damit das Öffnen schnell bleibt. Der Rest folgt beim nächsten Öffnen.
7. Manifest-Freigaben, die neu dazukommen: Atlassian (JQL-Suche, Vorgang lesen), Dropbox `fetch`, Notion `notion-fetch`.

## Nicht Teil dieser Spec
- Einlesen im Hintergrund ohne geöffnetes Cockpit, z. B. durch eine geplante Routine.
- Schreiben nach Jira oder SharePoint.
- Ablagen anderer Abteilungen.

## Datenschutz und Recht
Verarbeitet werden nur Inhalte aus den eigenen Marketing-Ablagen. Dateien mit Personendaten bleiben bis zur Prüfung uneingeordnet. Ob das automatische Einlesen von Teamablagen mit Personaldaten oder Kundendaten zulässig ist: **Bitte Rechtsabteilung prüfen**, bevor Teil B live geht.

## Abnahme
- Unit-Tests für die reinen Funktionen: Abbildung von Jira-Vorgängen, Abfrage „neu seit“, Erkennung von Dubletten über `sourceUrl`.
- E2E mit simulierten Connectoren:
  - Aufgabenliste aus Jira
  - Teamliste aus SharePoint
  - Lauf beim Öffnen legt Einträge an, und ein zweiter Lauf legt keine Dubletten an
  - Personendaten landen in der Prüfung
