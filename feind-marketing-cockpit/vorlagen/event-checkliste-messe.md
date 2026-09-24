# Event-Checkliste: Messe

Vorlage für `events/<id>.checklist` (`type: "messe"`). Der Skill `event-planning`
überträgt jede Zeile als `{area, item, done: false}`. Ansprechpartner nur als Rollen.
Zeitangaben relativ zum Messebeginn (T).

## sicherheit
- Standbau-Vorschriften der Messegesellschaft liegen vor und sind geprüft (T-10 Wochen)
- Exponat (Maschine/Fräswalze) standsicher, Kanten und Meißel abgedeckt, Transport- und Aufstellkonzept abgestimmt
- Brandschutz- und Elektroabnahme des Standes eingeplant
- Erste-Hilfe-Material und Notfallkontakte der Messe am Stand
- Unterweisung Standpersonal (Exponat, Fluchtwege) dokumentiert

## ansprechpartner
- Rolle Standleitung festgelegt
- Rolle Fachberatung Technik (Kaltfräsen) je Messetag besetzt
- Rolle Vertrieb für Terminvereinbarungen je Messetag besetzt
- Ansprechpartner der Messegesellschaft (Rolle: Aussteller-Service) bekannt
- Freigabe Geschäftsführung für Budget und Standkonzept

## materialien
- Referenzblätter nur mit freigegebenen Kundennamen (`clientApproved: true`)
- Leistungsübersicht mit bestätigten Fakten (Status in `kontext/unternehmen.md` geprüft)
- Kontaktbogen für Leads nach Datenschutzvorgaben (Einwilligung, Zweck, Löschfrist)
- Grafiken im CI (`branding/feind-ci.tokens.json`), Druckdaten freigegeben
- Give-aways und Arbeitskleidung mit Logo

## verkehrssicherung
- Anlieferung und Abbau von Exponaten: Zufahrt, Zeitfenster und Ladezone mit Messe abgestimmt
- Bei Überlänge/-breite: Genehmigung für Großraum- und Schwertransport geprüft
- Freigeländestand: Absperrung des Exponats und Besucherwege gekennzeichnet

## nachbereitung
- Leads innerhalb von 2 Werktagen im Cockpit erfasst (`leads/*`, `channel: "messe"`), ohne Personendaten
- Follow-up je Lead mit Vorlage `follow-up-lead.md` als Entwurf vorbereitet
- `leadsCaptured` und `followupStatus` im Event gepflegt
- Kosten-Nutzen-Notiz (Leads, Gespräche, Folgetermine) für Messeentscheidung Folgejahr
- Fotos nur mit Einwilligung bzw. ohne erkennbare Personen in `Marketing/Events/` abgelegt
