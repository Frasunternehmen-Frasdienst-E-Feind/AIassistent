"""Markdown-Report (deutsch) – Übergabe an Workflow 2 (Client-Ready-Fassung)."""
from __future__ import annotations


def _num(v) -> str:
    if v is None:
        return "–"
    if isinstance(v, float):
        return f"{v:,.1f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"{v:,}".replace(",", ".")


def _pct(v) -> str:
    if v is None:
        return "n/a"
    sign = "+" if v > 0 else ""
    return f"{sign}{_num(float(v))} %"


def _d(d: dict | None, unit: str = "") -> str:
    """Kurzdarstellung eines Deltas: 'aktuell (Δ +x %)'."""
    if d is None:
        return "–"
    return f"{_num(d['current'])}{unit} ({_pct(d['pct'])})"


def _signed(v: float, digits: int = 2) -> str:
    return f"{v:+.{digits}f}".replace(".", ",")


def _arrow(direction: str) -> str:
    return "▲" if direction == "up" else "▼"


def render(report: dict) -> str:
    meta = report["meta"]
    p = meta["periods"]
    prev_label = p["previous_label"]
    wf = "Monatsreport (Workflow 1)" if meta["workflow"] == "monthly" else "Wochen-Check (Workflow 3)"
    has_yoy = report["gsc"]["totals"]["YoY"] is not None

    out: list[str] = []
    out.append(f"# {wf} – {meta['site']}")
    out.append("")
    out.append(f"**Zeitraum:** {p['current']['label']} ({p['current']['start']} bis {p['current']['end']})  ")
    out.append(f"**Vergleich {prev_label}:** {p['previous']['label']}" + (f"  \n**Vergleich YoY:** {p['yoy']['label']}" if has_yoy else ""))
    out.append(f"**Erstellt:** {meta['generated_at']} · {meta['tool']}")
    out.append("")

    if meta["data_notes"]:
        out.append("> **Datenhinweise**")
        for n in meta["data_notes"]:
            out.append(f"> - {n}")
        out.append("")

    # --- Auto-Highlights ------------------------------------------------------
    out.append("## 1. Auto-Highlights (Cluster-Bewegungen)")
    out.append("")
    if not report["movements"]:
        out.append("Keine Cluster-Bewegung über den Schwellenwerten.")
    else:
        for m in report["movements"][:10]:
            if m["metric"] == "clicks":
                out.append(
                    f"- {_arrow(m['direction'])} **{m['cluster']}** ({m['basis']}, {m['severity']}): "
                    f"Klicks {_num(m['previous'])} → {_num(m['current'])} ({_pct(m['delta_pct'])})"
                )
            else:
                out.append(
                    f"- {_arrow(m['direction'])} **{m['cluster']}** ({m['basis']}, {m['severity']}): "
                    f"Ø Position {_num(m['previous'])} → {_num(m['current'])} ({_signed(m['delta_abs'])})"
                )
    out.append("")

    # --- Search Console ------------------------------------------------------
    g = report["gsc"]
    out.append("## 2. Google Search Console")
    out.append("")
    out.append(f"| Kennzahl | Aktuell | {prev_label} |" + (" YoY |" if has_yoy else ""))
    out.append("|---|---:|---:|" + ("---:|" if has_yoy else ""))
    for key, label, unit in (("clicks", "Klicks", ""), ("impressions", "Impressionen", ""), ("ctr", "CTR", " %"), ("position", "Ø Position", "")):
        cur = g["totals"]["current"][key]
        cur_s = f"{_num(cur * 100 if key == 'ctr' else cur)}{unit}" if isinstance(cur, float) else f"{_num(cur)}{unit}"
        fmt = (lambda d: _signed(d["abs"])) if key == "position" else (lambda d: _pct(d["pct"]))
        row = f"| {label} | {cur_s} | {fmt(g['totals'][prev_label][key])} |"
        if has_yoy:
            row += f" {fmt(g['totals']['YoY'][key])} |"
        out.append(row)
    out.append("")

    bs = g["brand_split"]
    out.append("**Marke vs. Nicht-Marke (Klicks)**")
    out.append("")
    out.append(f"| Segment | Aktuell | {prev_label} |")
    out.append("|---|---:|---:|")
    for seg, label in (("brand", "Marke"), ("non_brand", "Nicht-Marke")):
        cur, prev = bs["current"][seg]["clicks"], bs["previous"][seg]["clicks"]
        pct = None if not prev else round((cur - prev) / prev * 100, 1)
        out.append(f"| {label} | {_num(cur)} | {_pct(pct)} |")
    out.append("")

    out.append(f"**Cluster-Übersicht ({prev_label})**")
    out.append("")
    out.append("| Cluster | Klicks | Δ Klicks | Impressionen | Ø Position | Δ Position |")
    out.append("|---|---:|---:|---:|---:|---:|")
    for c in g["clusters"][prev_label]:
        out.append(
            f"| {c['name']} | {_num(c['clicks']['current'])} | {_pct(c['clicks']['pct'])} | "
            f"{_num(c['impressions']['current'])} | {_num(c['position']['current'])} | {_signed(c['position']['abs'])} |"
        )
    out.append("")

    if has_yoy and g["clusters"]["YoY"]:
        out.append("**Cluster-Übersicht (YoY)**")
        out.append("")
        out.append("| Cluster | Klicks | Δ Klicks YoY | Δ Position YoY |")
        out.append("|---|---:|---:|---:|")
        for c in g["clusters"]["YoY"]:
            out.append(f"| {c['name']} | {_num(c['clicks']['current'])} | {_pct(c['clicks']['pct'])} | {_signed(c['position']['abs'])} |")
        out.append("")

    qm = g["query_movers"]
    out.append(f"**Top-Gewinner Queries ({prev_label})**")
    out.append("")
    out.append("| Query | Klicks | Δ Klicks | Ø Position |")
    out.append("|---|---:|---:|---:|")
    for q in qm["winners"][:10]:
        out.append(f"| {q['query']} | {_num(q['clicks']['current'])} | {q['clicks']['abs']:+d} | {_num(q['position']['current'])} |")
    out.append("")
    out.append(f"**Top-Verlierer Queries ({prev_label})**")
    out.append("")
    out.append("| Query | Klicks | Δ Klicks | Ø Position |")
    out.append("|---|---:|---:|---:|")
    for q in qm["losers"][:10]:
        out.append(f"| {q['query']} | {_num(q['clicks']['current'])} | {q['clicks']['abs']:+d} | {_num(q['position']['current'])} |")
    out.append("")

    out.append("**Top-Seiten (Klicks)**")
    out.append("")
    out.append("| Seite | Klicks | Impressionen | Ø Position |")
    out.append("|---|---:|---:|---:|")
    for pg in g["top_pages"][:10]:
        out.append(f"| {pg['key']} | {_num(pg['clicks'])} | {_num(pg['impressions'])} | {_num(pg['position'])} |")
    out.append("")

    # --- GA4 ----------------------------------------------------------------
    a = report["ga4"]
    out.append("## 3. Google Analytics 4")
    out.append("")
    out.append(f"| Kennzahl | Aktuell | {prev_label} |" + (" YoY |" if has_yoy else ""))
    out.append("|---|---:|---:|" + ("---:|" if has_yoy else ""))
    for key, label in (("sessions", "Sitzungen"), ("engaged_sessions", "Engagierte Sitzungen"), ("total_users", "Nutzer"), ("key_events", "Key Events (Conversions)")):
        row = f"| {label} | {_num(a['totals']['current'][key])} | {_pct(a['totals'][prev_label][key]['pct'])} |"
        if has_yoy and a["totals"]["YoY"]:
            row += f" {_pct(a['totals']['YoY'][key]['pct'])} |"
        out.append(row)
    out.append("")
    out.append("**Kanäle**")
    out.append("")
    out.append(f"| Kanal | Sitzungen | Δ {prev_label} | Key Events |")
    out.append("|---|---:|---:|---:|")
    for ch in a["channels"]:
        d = ch.get(prev_label)
        out.append(f"| {ch['channel']} | {_num(ch['current']['sessions'])} | {_pct(d['sessions']['pct']) if d else 'neu'} | {_num(ch['current']['key_events'])} |")
    out.append("")
    if a["landing_pages"]:
        out.append("**Top-Landingpages (Sitzungen)**")
        out.append("")
        out.append("| Landingpage | Sitzungen | Key Events |")
        out.append("|---|---:|---:|")
        for lp in a["landing_pages"][:10]:
            out.append(f"| {lp['key']} | {_num(lp['sessions'])} | {_num(lp['key_events'])} |")
        out.append("")

    # --- CRM ----------------------------------------------------------------
    c = report["crm"]
    out.append("## 4. CRM / Leads")
    out.append("")
    if not c["current"]["available"]:
        out.append(f"_{c['current']['note']}_")
    else:
        out.append(f"| Kennzahl | Aktuell | {prev_label} |" + (" YoY |" if c['YoY'] else ""))
        out.append("|---|---:|---:|" + ("---:|" if c["YoY"] else ""))
        for key, label in (("leads", "Leads"), ("won", "Gewonnen"), ("value", "Pipeline-Wert (€)")):
            cur = c["current"][key]
            prev = c[prev_label][key]["pct"] if c[prev_label] else None
            row = f"| {label} | {_num(cur)} | {_pct(prev)} |"
            if c["YoY"]:
                row += f" {_pct(c['YoY'][key]['pct'])} |"
            out.append(row)
        out.append("")
        out.append("**Leads nach Quelle**")
        out.append("")
        out.append("| Quelle | Leads | Gewonnen |")
        out.append("|---|---:|---:|")
        for s in c["current"]["by_source"]:
            out.append(f"| {s['source']} | {_num(s['leads'])} | {_num(s['won'])} |")
    out.append("")

    out.append("---")
    out.append("_Rohdaten für die Client-Ready-Fassung (Workflow 2): siehe gleichnamige JSON-Datei._")
    return "\n".join(out) + "\n"
