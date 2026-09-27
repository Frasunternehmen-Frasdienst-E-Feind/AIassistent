#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Mehrsprachiger Generator fuer Messe-Projektdokumente (NL / DE / EN / PL).

Erzeugt aus den Inhaltsdateien unter messe/content/<doc>/<lang>.json ausfuellbare
PDF-Formulare im Corporate Design. Personenbezogene Daten (z. B. Teamnamen) stehen NICHT
im Repository, sondern werden als Platzhalter {{SCHLUESSEL}} gefuehrt und beim Erzeugen aus
messe/data/team.local.json (nicht versioniert) ersetzt. Fehlt die lokale Datei, greift die
neutrale messe/data/team.example.json.

Beispiele:
  python messe/generate.py                         # alle Sprachen, Dokument 'todo'
  python messe/generate.py --langs de,en           # nur DE + EN
  python messe/generate.py --doc todo --out /tmp   # Zielordner setzen

Neues Dokument ergaenzen: messe/content/<neuer-key>/<lang>.json anlegen, dann
  python messe/generate.py --doc <neuer-key>
"""
import os
import re
import sys
import json
import argparse

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import render  # noqa: E402

DEFAULT_LANGS = ["nl", "de", "en", "pl"]
PLACEHOLDER_RE = re.compile(r"\{\{([A-Z0-9_]+)\}\}")


def load_placeholders(data_dir):
    """team.local.json (falls vorhanden) hat Vorrang vor team.example.json."""
    values = {}
    for name in ("team.example.json", "team.local.json"):
        p = os.path.join(data_dir, name)
        if os.path.exists(p):
            try:
                values.update(json.load(open(p, encoding="utf-8")))
            except Exception as e:
                print("  ! %s konnte nicht gelesen werden: %s" % (name, e))
    return values


def substitute(obj, values):
    if isinstance(obj, str):
        return PLACEHOLDER_RE.sub(lambda m: values.get(m.group(1), m.group(0)), obj)
    if isinstance(obj, list):
        return [substitute(x, values) for x in obj]
    if isinstance(obj, dict):
        return {k: substitute(v, values) for k, v in obj.items()}
    return obj


def main():
    ap = argparse.ArgumentParser(description="Mehrsprachige Messe-Projektdokumente erzeugen")
    ap.add_argument("--doc", default="todo", help="Dokument-Key (Ordner unter messe/content/)")
    ap.add_argument("--langs", default=",".join(DEFAULT_LANGS),
                    help="Sprachen als Komma-Liste, z. B. nl,de,en,pl")
    ap.add_argument("--out", default=os.path.join(HERE, "output"), help="Zielordner fuer PDFs")
    ap.add_argument("--branding", default=os.path.join(REPO, "branding", "feind-ci.tokens.json"),
                    help="Pfad zur CI-Tokens-JSON")
    args = ap.parse_args()

    content_dir = os.path.join(HERE, "content", args.doc)
    if not os.path.isdir(content_dir):
        sys.exit("Kein Inhaltsordner: %s" % content_dir)
    os.makedirs(args.out, exist_ok=True)
    values = load_placeholders(os.path.join(HERE, "data"))
    if "TEAM_2026" in values and "lokale" not in values["TEAM_2026"].lower():
        print("Hinweis: Teamnamen aus data/team.local.json werden eingesetzt (nicht committen).")

    langs = [x.strip().lower() for x in args.langs.split(",") if x.strip()]
    print("Dokument '%s' -> %s  (Sprachen: %s)" % (args.doc, args.out, ", ".join(langs)))
    ok = 0
    for lang in langs:
        cf = os.path.join(content_dir, lang + ".json")
        if not os.path.exists(cf):
            print("  - %s: uebersprungen (keine %s.json)" % (lang.upper(), lang))
            continue
        content = substitute(json.load(open(cf, encoding="utf-8")), values)
        out_pdf = os.path.join(args.out, content.get("file", "%s_%s.pdf" % (args.doc, lang.upper())))
        res = render.render_document(content, out_pdf, args.branding)
        font = "TTF eingebettet" if res["embedded_font"] else "Helvetica-Fallback (PL evtl. eingeschraenkt)"
        print("  + %s: %s  (%d Positionen, %d Seiten, %s)" %
              (lang.upper(), os.path.basename(out_pdf), res["items"], res["pages"], font))
        ok += 1
    print("Fertig: %d Dokument(e) erzeugt." % ok)


if __name__ == "__main__":
    main()
