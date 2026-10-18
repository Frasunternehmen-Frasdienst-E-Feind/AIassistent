---
name: feind-brand
description: Corporate Design der Fräsdienst-Service E. Feind GmbH auf Artefakte, Dashboards, Grafiken, Präsentationen und Dokumente anwenden. Nutzen bei jeder Feind-Arbeit mit Farben, Schriften, Theme, CI-Prüfung oder „markenkonform“ – statt brand-guidelines (das ist Anthropic-CI).
---

# Feind-CI anwenden

Einzige Quelle: `branding/feind-ci.tokens.json`. Keine Farbwerte aus dem
Gedächtnis, keine eigenen Paletten, keine Hex-Werte im Markup.

## Vorgehen

1. Theme-Block erzeugen und unverändert in das `<style>` übernehmen:
   `node .claude/skills/feind-brand/scripts/tokens-to-css.mjs`
   Er liefert hell auf `:root`, dunkel über
   `@media (prefers-color-scheme: dark)` mit `:root:not([data-theme="light"])`
   und über `:root[data-theme="dark"]`, dazu Schrift-, Radius- und Abstandsvariablen.
2. Im Markup nur `var(--…)` verwenden.
3. Vor Übergabe die Kontrastregeln unten prüfen.

## Regeln, die am häufigsten brechen

* Grün (`--accent`) ist Fläche und Akzent, nie Text auf hellem Grund –
  dort `--accent-text`.
* Schrift auf vollem Grün (Primär-Button): `--on-accent-strong`.
  Nie Weiß auf Grün.
* Rot (`--signal`) nur als Signal: Fehler, Fehlbuchung, Minus. Auf dunklem
  Grund Text in `--signal-text`, Rot nur als Fläche oder Linie.
* Überschriften `--font-display` (Exo), Fließtext `--font-sans`.
* Radien: Fläche `--radius`, Eingabe `--radius-input`, Button
  `--radius-button`. Abstände nur `--space-1` … `--space-6`.

## Diagramme

Serienfarben nicht frei wählen: Grün für die Hauptreihe, Anthrazit-/Grau-Töne
für Vergleichsreihen, Rot nur für Abweichungen. Für Aufbau und Achsen den
Skill `dataviz` laden.

## Nicht-HTML (PPTX, DOCX, PDF, Grafik)

Werte aus `palette` und `typography` der Token-Datei übernehmen. Exo fehlt
oft im Zielsystem: Fallback „Arial Black“ ist zulässig und als
**Annahme** zu kennzeichnen.
