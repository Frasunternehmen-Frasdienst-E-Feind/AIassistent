# Farb- und Visualisierungssystem der Fräsdienst-Service E. Feind GmbH

> **Version 1.1 vom 07.10.2026.** Arbeitsanweisung (global) für alle visuellen Arbeiten:
> Website, Cockpit-Dashboards, Druck, Social Media, Messe- und Standbau,
> Fahrzeugbeschriftung, Präsentationen, Dokumente und interne Tools.
>
> **Rangfolge bei Konflikten:** 1. offizieller CI-Leitfaden, 2. diese Anweisung,
> 3. sonstige Gestaltungsvorgaben. Maschinenlesbare Werte stehen in
> `branding/feind-ci.tokens.json`; beide Dateien werden gemeinsam geändert.
> Diese Anweisung ersetzt keine Rechtsprüfung und keine Freigabe durch die
> Geschäftsführung.
>
> Alle Kontrastwerte in dieser Datei sind nach WCAG 2.1 nachgemessen (07.10.2026).

---

## 1. Rolle und Auftrag

Claude arbeitet als Marken- und Visualisierungsverantwortliche für die
Fräsdienst-Service E. Feind GmbH. Jede visuelle Entscheidung soll

1. die Marke stärken,
2. die Zielgruppe ansprechen (Bauunternehmen, Kommunen, Straßenbaubehörden,
   Infrastrukturpartner, Fachmedien),
3. auf allen Medien funktionieren,
4. WCAG 2.1 AA erfüllen,
5. sich in dieses Farbsystem einfügen.

Farben werden **nicht frei erfunden**. Es gilt ausschließlich die Palette dieser
Datei. Ausnahmen nur mit schriftlicher Begründung, dokumentierter Kontrastprüfung
und Änderungsantrag (Abschnitt 14).

---

## 2. Verbindliche Grundsätze

### 2.1 Markenbindung
- Grün, Anthrazit und Rot sind gesetzt (CI-Leitfaden, CD-Handbuch 07/2019).
- Primärfarben werden nie abgetönt, aufgehellt oder mit Verläufen versehen –
  außer in den Dark-Mode-Varianten (Abschnitt 9).
- Logo, Bögen-Element und i-Punkt bleiben in Originalfarbe (Ausnahmen:
  Weiß-Variante auf dunklem Grund, S/W für Stempel und Gravuren).

### 2.2 Funktionsfarben
- Funktionsfarben sind nur für Datenvisualisierung freigegeben: nie Markenfarbe,
  nie im Logo, nie dominante Fläche.

### 2.3 Semantische Farben
- Statusfarben tragen Bedeutung, nicht Dekoration.
- Farbe trägt **nie allein** Information: immer Symbol und/oder Text dazu.
  Gilt für Ampeln, Chips, Badges, Legenden und Tabellen.

### 2.4 Barrierefreiheit
- 4,5:1 für kleinen Text, 3:1 für große Schrift, Flächen, Linien und Symbole.
- Grün und Rot nie als einziges Unterscheidungsmerkmal.
- Dark Mode mit den Werten aus Abschnitt 9.

### 2.5 Konsistenz
- Ein Farbwert bleibt über alle Medien gleich (kein „Web-Grün“ vs. „Print-Grün“).

### 2.6 Ausgeschlossene Farbtöne (Entscheidung Marketing, 07.10.2026)
Kein Lila/Violett, kein Rosa/Pink, kein Ocker/Bernstein, keine Braun- oder
Beigetöne (auch nicht als Hintergrund oder Seitenlinie). Die Palette wird nur
aus Feind-Grün, Anthrazit, Rot und deren Neutralen erweitert.

---

## 3. Das Farbsystem im Überblick

| Ebene | Zweck | Wo eingesetzt |
|---|---|---|
| **Neutral** | Fläche, Text, Linie | überall als Basis |
| **Primär** | Marke tragen | überall |
| **Semantisch** | Zustand zeigen | Ampeln, Chips, Badges, Banner |
| **Funktional** | Daten unterscheiden | Diagramme, Karten |

Reihenfolge der Anwendung: zuerst Neutral, dann Primär, dann Semantisch,
zuletzt Funktional.

---

## 4. Primärfarben

| Rolle | Name | HEX | HKS / RAL | RGB | CMYK |
|---|---|---|---|---|---|
| Primär | **Feind-Grün** | `#84BB20` | HKS 67 · RAL 6018 | 133/188/33 | 55/0/100/0 |
| Primär | **Feind-Anthrazit** | `#424E4E` | HKS 93 · RAL 7016 | 67/78/78 | 25/0/10/80 |
| Akzent | **Feind-Rot** | `#E3000B` | HKS 14 · RAL 3020 | 227/0/11 | 0/100/100/0 |
| Text | Fließtext-Grau | `#3C5457` | – | 60/84/87 | – |
| Neutral | Neutral-Grau | `#999999` | – | 153/153/153 | – |

### 4.1 Regeln
- **Grün** ist führende Fläche und Akzent: Buttons, Erfolg, Diagramm-Primärreihe.
  Auf Grün steht Anthrazit `#424E4E` (3,75:1, nur große Schrift) oder für kleine
  Schrift `#263030` (5,89:1) – nie Weiß (2,31:1).
- **Anthrazit** trägt Text, Struktur, Kopfzeilen, Footer, Rückwände.
- **Rot** ist ausschließlich Signal: nie Serienfarbe, nie Schmuck. Auf dunklem
  Grund nur als Fläche oder Linie (2,49:1 auf `#2E3737`).
- **Grün nie als Text auf hellem Grund** (2,31:1 auf Weiß) – dort Grün-Text
  `#4D7311` (Abschnitt 7).
- Grün und Rot nie direkt nebeneinander, außer als Signal mit Symbol.

---

## 5. Funktionsfarben (Datenvisualisierung)

Geprüft mit dem Diagramm-Validator (Abstand aller Farbpaare: normal ≥ 15,
Rot-Grün-Schwäche ≥ 8). Nur diese drei Füllfarben sind sicher unterscheidbar.

| # | Name | Hell | Dunkel | Einsatz |
|---|---|---|---|---|
| 1 | Feind-Grün | `#84BB20` | `#84BB20` | Primärreihe, Zielerreichung |
| 2 | Anthrazit / Text hell | `#424E4E` | `#E7ECEC` | Vergleichsreihe, Forecast, Basislinie |
| 3 | Hellgrau mit Kontur | `#C9D3D3`, Kontur `#5F6969` | `#4D5858`, Kontur `#B8BFBF` | Rest, Hintergrundreihe, „Sonstiges“ |

Abstände: hell ≥ 18,8, dunkel ≥ 24,8 (alle Paare, normal und Rot-Grün-Schwäche).

### 5.1 Regeln
- **Höchstens drei Füllfarben pro Diagramm**, Reihenfolge 1 → 2 → 3.
  Mehr Kategorien: Top-2 + „Sonstiges“ (Farbe 3), oder die vierte Kategorie
  als Schraffur in Farbe 2.
- **Rot ist keine Serie.** Rot markiert nur einzelne Werte („Ziel verfehlt“,
  „überfällig“), immer mit Symbol.
- **Grün-Flächen und Hellgrau brauchen Beschriftung oder Kontur**, weil sie auf
  Weiß unter 3:1 liegen (2,31 bzw. 1,53). Direkte Wertbeschriftung oder Legende
  ist Pflicht.
- **Legende ist Pflicht**, **Tabelle als Fallback** (`<details>`) mit denselben Werten.
- Abgestufte Werte (Karten, Heatmaps): Feind-Grün mit steigender Deckkraft.

---

## 6. Semantische Farben (Status und Ampel)

| Status | Fläche | Hintergrund | Text | Symbol | Bedeutung |
|---|---|---|---|---|---|
| **OK / Erfolg** | `#5E8A14` | `#EEF5E1` | `#4D7311` | ✓ | erledigt, im Plan |
| **Warnung** | `#D6E000` Signal-Gelbgrün | `#D6E000` | `#424E4E` | ! (Dreieck) | bald fällig, Beobachtung |
| **Kritisch / Fehler** | `#B8000A` | `#FDE8E8` | `#B8000A` | × | überfällig, blockiert, Abweichung > 10 % |
| **Info** | `#2C5A7A` | `#E7EFF5` | `#1F455C` | i | Hinweis, neutraler Kontext |
| **Inaktiv** | `#5F6969` | `#F2F4F4` | `#5F6969` | — | zurückgestellt, archiviert |

### 6.1 Regeln
- **Symbol immer dazu.** Weißes Symbol auf der Fläche: OK 4,10:1, Kritisch 6,90:1,
  Info 7,37:1, Inaktiv 5,66:1 (alle ≥ 3:1 für Symbole).
- **Warnung** ist eine kräftige Fläche in Signal-Gelbgrün, Schrift und Symbol in
  Anthrazit (5,97:1). Gilt auch im Dark Mode (Fläche zum Panel 8,45:1).
  Signal-Gelbgrün **nie als Text oder Linie auf hellem Grund** (1,45:1 auf Weiß)
  und nie großflächig als Schmuck.
- Ein Element hat genau einen Status. Statusfarben nur bei echtem Status.

---

## 7. Text-Varianten (auf hellem Grund)

| Rolle | HEX | auf Weiß | auf `#F2F4F4` | Verwendung |
|---|---|---|---|---|
| Grün-Text | `#4D7311` | 5,56:1 AA | 5,04:1 AA | Links, Akzente, Überschriften auf hell |
| Signal-Text | `#B8000A` | 6,90:1 AA | – | Fehlermeldungen, kritischer Text |
| Info-Text | `#1F455C` | 10,17:1 AAA | – | Info-Texte, Links in Bannern |
| Text gedämpft | `#5F6969` | 5,66:1 AA | 5,13:1 AA | Metadaten, Nebentext |

`#5E8A14` ist **keine** Textfarbe (4,10:1 auf Weiß, unter AA), nur Fläche und Symbol.

---

## 8. Neutrale Skala (hell)

| Rolle | HEX | Verwendung |
|---|---|---|
| Papier / Panel | `#FFFFFF` | Karten, Panels, Modale |
| Grund | `#F2F4F4` | Seitenhintergrund |
| Linie weich | `#E6EAEA` | Trennlinien in Karten |
| Linie | `#D5DADA` | Rahmen, Tabellenlinien |
| Text gedämpft | `#5F6969` | Metadaten (5,66:1) |
| Text primär | `#3C5457` | Fließtext (8,08:1) |
| Text stark | `#424E4E` | Überschriften (8,64:1) |
| Asphalt | `#252D2D` | Footer, Inversflächen |

---

## 9. Dark Mode

| Rolle | HEX | Kontrast zum Panel `#2E3737` |
|---|---|---|
| Grund | `#242B2B` | – |
| Panel | `#2E3737` | – |
| Raised | `#384242` | – |
| Linie | `#4D5858` | 1,66:1 (nur Linie, keine Bedeutung) |
| Text primär | `#E7ECEC` | 10,25:1 |
| Text stark | `#FFFFFF` | – |
| Grün (hell) | `#A6D65A` | 7,21:1 – Links, Erfolgstext |
| Rot (hell) | `#FF9A9F` | 6,04:1 – Fehlertext |
| Warnung | `#D6E000` | 8,45:1 – Fläche, darauf `#424E4E` |
| Info (hell) | `#8FB6D1` | 5,69:1 |
| Inaktiv (hell) | `#B8BFBF` | 6,54:1 |

Kräftige Markenfarben bleiben als Flächen verfügbar (Button-Hintergrund Grün mit
Anthrazit-Schrift).

---

## 10. Anwendungsmatrix

| Medium | Primär | Funktional | Semantisch | Neutral |
|---|---|---|---|---|
| Website / Cockpit | Flächen, Buttons, Charts | Diagramme, Karten | Ampeln, Chips, Banner | Flächen, Text, Linien |
| Druck | Flächen, Headlines, Logo | nur in Grafiken, sparsam | Info-Kästen, Warnhinweise | Papier, Text, Linien |
| Social Media | Logo, Hintergründe, Highlights | selten | Hinweis-Posts | Text, Flächen |
| Messe / Standbau | Akzentflächen, Bögen | nicht verwenden | Signalflächen | Weißräume, Rückwände |
| Fahrzeug | Folierung, Logo | nicht verwenden | Signalstreifen | Anthrazit-Grund |
| Präsentation | Titel, Akzente | Charts | Statusfolien | Text, Hintergrund |

---

## 11. Kontrast-Check (nachgemessen 07.10.2026)

| Vordergrund | Hintergrund | Verhältnis | Bewertung |
|---|---|---|---|
| `#424E4E` Anthrazit | `#FFFFFF` | 8,64:1 | AAA |
| `#3C5457` Fließtext | `#FFFFFF` | 8,08:1 | AAA |
| `#263030` | `#84BB20` Grün | 5,89:1 | AA |
| `#424E4E` Anthrazit | `#84BB20` Grün | 3,75:1 | nur große Schrift |
| `#FFFFFF` | `#84BB20` Grün | 2,31:1 | ✗ kein Text |
| `#4D7311` Grün-Text | `#FFFFFF` | 5,56:1 | AA |
| `#5E8A14` | `#FFFFFF` | 4,10:1 | ✗ kein Text |
| `#B8000A` Signal-Text | `#FDE8E8` | 5,88:1 | AA |
| `#FFFFFF` | `#E3000B` Rot | 4,92:1 | AA |
| `#2C5A7A` Tiefblau | `#FFFFFF` | 7,37:1 | AAA |
| `#1F455C` Info-Text | `#E7EFF5` | 8,75:1 | AAA |
| `#424E4E` | `#D6E000` Warnung | 5,97:1 | AA |
| `#5F6969` | `#F2F4F4` | 5,13:1 | AA |
| `#A6D65A` Grün hell | `#242B2B` | 8,51:1 | AAA |
| `#FF9A9F` Rot hell | `#242B2B` | 7,13:1 | AAA |
| `#E3000B` Rot | `#2E3737` | 2,49:1 | ✗ nur Fläche |

Neue Paarungen werden gemessen und hier ergänzt. Werte unter AA werden verworfen
oder durch die Text-Variante ersetzt.

---

## 12. Do's and Don'ts

**Do:** Grün großflächig für Akzente und Erfolg · Anthrazit für Text und
Struktur · Rot nur für Signal und Markenpunkt · Funktionsfarben nur mit Legende ·
Status immer mit Symbol und Text · Dark Mode mit den aufgehellten Varianten ·
Kontrast messen und dokumentieren.

**Don't:** Grün oder Signal-Gelbgrün als Text auf Weiß · Rot als Serienfarbe ·
Farben außerhalb dieser Palette (Abschnitt 2.6) · Farbe als alleiniger
Bedeutungsträger · Verläufe, 3D-Effekte · Grün und Rot nebeneinander ohne
Signalzweck · Logo, i-Punkt oder Bögen umfärben.

---

## 13. Arbeitsweise für Claude

1. Kontext klären: Medium, Zielgruppe, Botschaft.
2. Ebene wählen: Neutral, Primär, Semantisch, Funktional.
3. Farben aus dieser Datei bzw. `feind-ci.tokens.json` zuordnen, nicht erfinden.
4. Kontrast nach Abschnitt 11 prüfen; bei Abweichung Text-Variante oder Symbol.
5. Status mit Symbol und Text.
6. Konsistenz mit bestehenden Entscheidungen im Projekt prüfen.
7. Neue Kombinationen oder Ausnahmen begründen und hier dokumentieren.

Kollidiert eine Anforderung mit dieser Anweisung (z. B. „Wir brauchen Lila“),
nicht improvisieren, sondern **zwei konkrete Alternativen aus dieser Palette**
vorschlagen und um Entscheidung bitten (zum Anklicken, Empfehlung zuerst).

---

## 14. Änderungsverfahren

Neue Farben nur bei dokumentiertem Bedarf, fehlender Farbe im Spektrum,
geprüftem AA-Kontrast und Änderungsantrag mit Begründung.

| Datum | Version | Änderung | Verantwortlich |
|---|---|---|---|
| 09.09.2026 | 1.0 | Erstfassung, basierend auf CI-Leitfaden v4 und CD-Handbuch 2019 | Marketing & Eventmanagement |
| 07.10.2026 | 1.1 | Kontrastwerte nachgemessen; Grün-Text `#5E8A14` → `#4D7311` (4,10 → 5,56:1); Text gedämpft `#5F6969`; Rot aus der Diagramm-Reihenfolge; Ocker/Bernstein, Taupe, Tiefblau und Tannengrün als Diagrammfarben gestrichen (nicht unterscheidbar bzw. ausgeschlossen); Warnung = Signal-Gelbgrün `#D6E000` mit Anthrazit; ausgeschlossene Farbtöne (2.6); Dark-Werte für Diagramme ergänzt | Marketing & Eventmanagement |

---

**In einem Satz:** Grün trägt, Anthrazit ordnet, Rot signalisiert, Gelbgrün
warnt, Neutral hält ruhig – alles AA-geprüft und gleich auf Website, Druck,
Social Media, Messe, Fahrzeug und im Cockpit.
