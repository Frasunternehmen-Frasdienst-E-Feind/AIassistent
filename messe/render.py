# -*- coding: utf-8 -*-
"""Render-Engine fuer mehrsprachige Messe-Projektdokumente (Fraesdienst-Service E. Feind GmbH).

Zeichnet ein Dokument aus einem Inhalts-Dict (siehe messe/content/<doc>/<lang>.json) als
ausfuellbares PDF-Formular im Corporate Design (branding/feind-ci.tokens.json).

Pro Position: Checkbox + Status-Dropdown + festes Notizfeld (max. 250 Zeichen inkl. Link).
Formularfelder nutzen Helvetica (reportlab-Vorgabe); der Fliesstext nutzt eine eingebettete
Unicode-TTF (Liberation Sans / DejaVu Sans), damit DE-Umlaute und PL-Sonderzeichen korrekt
gedruckt werden. Getippte Sonderzeichen in Notizfeldern rendert Adobe Acrobat/Reader ueber
Font-Fallback.
"""
import os
import json
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import stringWidth

PAGE_W, PAGE_H = A4
ML, MR, MB = 38, 38, 42
CW = PAGE_W - ML - MR
NOTE_H = 22
FS = 8.3
FF = "Helvetica"  # Formularfeld-Font (Standard-14, von reportlab vorgegeben)

_FONT_CANDIDATES = [
    ("Lib", "Lib-B", "Lib-I",
     "LiberationSans-Regular.ttf", "LiberationSans-Bold.ttf", "LiberationSans-Italic.ttf"),
    ("Dej", "Dej-B", "Dej-I",
     "DejaVuSans.ttf", "DejaVuSans-Bold.ttf", "DejaVuSans-Oblique.ttf"),
]
_FONT_DIRS = [
    os.environ.get("FEIND_FONT_DIR", ""),
    "/usr/share/fonts/truetype/liberation/",
    "/usr/share/fonts/truetype/dejavu/",
    "/usr/share/fonts/liberation/",
    "/Library/Fonts/", "/System/Library/Fonts/Supplemental/",
    "C:/Windows/Fonts/",
]


def _register_fonts():
    """Registriert eine Unicode-Schrift; gibt (regular, bold, italic) zurueck.
    Faellt auf die eingebauten Helvetica-Fonts zurueck, wenn keine TTF gefunden wird
    (dann sind PL-Sonderzeichen im Druck evtl. nicht korrekt)."""
    for reg, bold, ital, fr, fb, fi in _FONT_CANDIDATES:
        for d in _FONT_DIRS:
            if not d:
                continue
            pr, pb, pi = os.path.join(d, fr), os.path.join(d, fb), os.path.join(d, fi)
            if os.path.exists(pr) and os.path.exists(pb):
                try:
                    pdfmetrics.registerFont(TTFont(reg, pr))
                    pdfmetrics.registerFont(TTFont(bold, pb))
                    pdfmetrics.registerFont(TTFont(ital, pi if os.path.exists(pi) else pr))
                    return reg, bold, ital, True
                except Exception:
                    continue
    return "Helvetica", "Helvetica-Bold", "Helvetica-Oblique", False


def load_tokens(branding_path):
    tok = json.load(open(branding_path, encoding="utf-8"))
    return tok["tokens"]["light"]


def render_document(content, out_path, branding_path):
    """content: Inhalts-Dict (eine Sprache). out_path: Ziel-PDF. branding_path: CI-Tokens-JSON."""
    S = content
    L = load_tokens(branding_path)
    ACCENT = HexColor(L["accent"]); ACCENT_TEXT = HexColor(L["accent-text"]); ON_ACCENT = HexColor(L["on-accent"])
    ON_ACCENT_STRONG = HexColor(L.get("on-accent-strong", L["on-accent"]))  # Text auf Vollgruen (6,9:1)
    SIGNAL = HexColor(L["signal"]); SURFACE = HexColor(L["surface"]); SURFACE_MUT = HexColor(L["surface-muted"])
    INK = HexColor(L["ink"]); INK_STRONG = HexColor(L["ink-strong"]); INK_MUTED = HexColor(L["ink-muted"])
    INK_INV = HexColor(L["ink-inverse"]); LINE = HexColor(L["line"])

    F_TXT, F_TXTB, F_TXTI, have_ttf = _register_fonts()
    F_DISP = F_TXTB

    c = canvas.Canvas(out_path, pagesize=A4)
    c.setTitle(S["title"]); c.setAuthor("Fraesdienst-Service E. Feind GmbH - Marketing")
    c.setSubject("InfraTech 2027, Rotterdam Ahoy, Stand 5.209")
    af = c.acroForm
    st = {"y": 0.0, "page": 1, "idx": 0}

    def wrap(text, font, size, maxw):
        out, cur = [], ""
        for w in text.split():
            t = (cur + " " + w).strip()
            if stringWidth(t, font, size) <= maxw:
                cur = t
            else:
                if cur:
                    out.append(cur)
                cur = w
        if cur:
            out.append(cur)
        return out

    def footer():
        c.setFont(F_TXT, 7); c.setFillColor(INK_MUTED)
        c.drawString(ML, 24, S["footer"])
        c.drawRightString(PAGE_W - MR, 24, "%s %d" % (S["page"], st["page"]))
        c.setStrokeColor(LINE); c.setLineWidth(0.5); c.line(ML, 33, PAGE_W - MR, 33)

    def slim_header(title):
        c.setFillColor(INK_STRONG); c.rect(0, PAGE_H - 30, PAGE_W, 30, stroke=0, fill=1)
        c.setFillColor(ACCENT); c.rect(0, PAGE_H - 32, PAGE_W, 2, stroke=0, fill=1)
        c.setFont(F_DISP, 10); c.setFillColor(INK_INV); c.drawString(ML, PAGE_H - 21, S["brand"])
        c.setFont(F_TXT, 8); c.setFillColor(HexColor("#c7cfcf")); c.drawRightString(PAGE_W - MR, PAGE_H - 21, title)

    def new_page(cont=None):
        footer(); c.showPage(); st["page"] += 1
        slim_header(cont or S["cont"]); st["y"] = PAGE_H - 48

    def ensure(space, cont=None):
        if st["y"] - space < MB + 8:
            new_page(cont)

    def marker(mk, cx, cy):
        r = 3.4
        if mk == "ok":
            c.setFillColor(ACCENT); c.circle(cx, cy, r, stroke=0, fill=1)
        elif mk == "no":
            c.setFillColor(SIGNAL); c.circle(cx, cy, r, stroke=0, fill=1)
        elif mk == "warn":
            c.setFillColor(INK_STRONG); c.circle(cx, cy, r, stroke=0, fill=1)
        elif mk == "add":
            c.setStrokeColor(ACCENT_TEXT); c.setLineWidth(1.1); c.setFillColor(SURFACE)
            c.circle(cx, cy, r, stroke=1, fill=1); c.setLineWidth(1.0)
            c.line(cx - 1.7, cy, cx + 1.7, cy); c.line(cx, cy - 1.7, cx, cy + 1.7)
        else:
            c.setStrokeColor(INK_MUTED); c.setLineWidth(0.8); c.setFillColor(SURFACE)
            c.circle(cx, cy, r, stroke=1, fill=1)

    X_MARK = ML + 4; X_CB = ML + 12; X_TXT = ML + 30; X_STAT = PAGE_W - MR - 92; STAT_W = 92
    TXT_W = X_STAT - X_TXT - 8

    def draw_item(mk, text):
        lines = wrap(text, F_TXT, FS, TXT_W)
        row_h = max(len(lines) * (FS + 1.6), 15)
        ensure(row_h + NOTE_H + 6)
        top = st["y"]; first_base = top - FS
        marker(mk, X_MARK, first_base + FS * 0.32)
        c.setFillColor(INK if mk != "no" else INK_MUTED); c.setFont(F_TXT, FS)
        ty = first_base
        for ln in lines:
            c.drawString(X_TXT, ty, ln); ty -= (FS + 1.6)
        cb_y = first_base - 1; i = st["idx"]
        af.checkbox(name="done_%03d" % i, x=X_CB, y=cb_y, size=10, buttonStyle="check",
                    borderColor=INK_MUTED, fillColor=SURFACE, borderWidth=0.8,
                    textColor=INK_STRONG, checked=False, tooltip=S["tt_done"])
        af.choice(name="sel_%03d" % i, options=S["status"], value=S["status_def"],
                  x=X_STAT, y=cb_y - 1.5, width=STAT_W, height=13.5, borderColor=LINE,
                  fillColor=SURFACE_MUT, borderWidth=0.6, textColor=INK_STRONG,
                  fontName=FF, fontSize=7.4, fieldFlags="combo", tooltip=S["tt_status"])
        ny = top - row_h - NOTE_H - 2
        af.textfield(name="note_%03d" % i, value="", maxlen=250, x=X_TXT, y=ny,
                     width=(PAGE_W - MR) - X_TXT, height=NOTE_H, borderColor=ACCENT,
                     fillColor=HexColor("#fbfdf6"), borderWidth=0.8, textColor=INK,
                     fontName=FF, fontSize=7.6, fieldFlags="multiline", tooltip=S["tt_note"])
        st["idx"] += 1; st["y"] = ny - 6

    def section_head(title):
        ensure(30, title); st["y"] -= 4
        c.setFillColor(INK_STRONG); c.setFont(F_DISP, 10.5); c.drawString(ML, st["y"] - 9, title)
        c.setStrokeColor(ACCENT); c.setLineWidth(1.6); c.line(ML, st["y"] - 13, PAGE_W - MR, st["y"] - 13)
        st["y"] -= 22

    # ---- Deckkopf
    c.setFillColor(INK_STRONG); c.rect(0, PAGE_H - 96, PAGE_W, 96, stroke=0, fill=1)
    c.setFillColor(ACCENT); c.rect(0, PAGE_H - 100, PAGE_W, 4, stroke=0, fill=1)
    # Titel automatisch verkleinern, damit er nicht in den Chip laeuft
    title_maxw = (PAGE_W - MR - 130) - ML - 12
    title_fs = 20
    while title_fs > 12 and stringWidth(S["title"], F_DISP, title_fs) > title_maxw:
        title_fs -= 0.5
    c.setFont(F_DISP, title_fs); c.setFillColor(INK_INV); c.drawString(ML, PAGE_H - 42, S["title"])
    c.setFont(F_TXT, 10); c.setFillColor(HexColor("#d3dada")); c.drawString(ML, PAGE_H - 58, S["event"])
    c.setFillColor(ACCENT); c.roundRect(PAGE_W - MR - 130, PAGE_H - 52, 130, 18, 3, stroke=0, fill=1)
    c.setFillColor(ON_ACCENT_STRONG); c.setFont(F_TXTB, 8); c.drawCentredString(PAGE_W - MR - 65, PAGE_H - 46, S["chip"])
    c.setFont(F_TXT, 8); c.setFillColor(HexColor("#aab4b4")); c.drawString(ML, PAGE_H - 74, S["src"])
    c.setFillColor(HexColor("#ff9a9f")); c.setFont(F_TXTB, 8); c.drawString(ML, PAGE_H - 86, S["intern"])
    c.setFont(F_TXT, 8); c.setFillColor(HexColor("#8f9a9a")); c.drawRightString(PAGE_W - MR, PAGE_H - 86, S["basis"])
    st["y"] = PAGE_H - 116

    # ---- Howto-Box
    bx, bw, bh = ML, CW, 62
    c.setFillColor(SURFACE_MUT); c.setStrokeColor(LINE); c.setLineWidth(0.6)
    c.roundRect(bx, st["y"] - bh, bw, bh, 3, stroke=1, fill=1)
    c.setFillColor(INK_STRONG); c.setFont(F_TXTB, 8.5); c.drawString(bx + 10, st["y"] - 14, S["howto"])
    c.setFont(F_TXT, 7.8); c.setFillColor(INK); ly = st["y"] - 26
    for ln in S["howto_lines"]:
        c.drawString(bx + 10, ly, ln); ly -= 9.4
    st["y"] = st["y"] - bh - 14
    # Legende
    lx = ML; c.setFont(F_TXTB, 7.8); c.setFillColor(INK_STRONG); c.drawString(lx, st["y"], S["legend_label"])
    x0 = lx + stringWidth(S["legend_label"], F_TXTB, 7.8) + 10; x = x0
    for mk, label in S["legend"]:
        w = 11 + stringWidth(label, F_TXT, 7.6) + 16
        if x + w > PAGE_W - MR:
            st["y"] -= 12; x = x0
        marker(mk, x + 4, st["y"] + 2.2)
        c.setFont(F_TXT, 7.6); c.setFillColor(INK); c.drawString(x + 11, st["y"], label); x += w
    st["y"] -= 18

    # ---- Blocker
    ensure(96)
    c.setFillColor(INK_STRONG); c.setFont(F_DISP, 10.5); c.drawString(ML, st["y"] - 9, S["blocker_title"])
    c.setStrokeColor(SIGNAL); c.setLineWidth(1.6); c.line(ML, st["y"] - 13, PAGE_W - MR, st["y"] - 13)
    st["y"] -= 24
    for t, s in S["blockers"]:
        c.setFillColor(SIGNAL); c.circle(ML + 4, st["y"] + 2.4, 2.2, stroke=0, fill=1)
        c.setFont(F_TXTB, 8); c.setFillColor(INK_STRONG); c.drawString(ML + 12, st["y"], t)
        c.setFont(F_TXT, 8); c.setFillColor(INK_MUTED)
        c.drawString(ML + 12 + stringWidth(t, F_TXTB, 8) + 8, st["y"], "\u2013 " + s)
        st["y"] -= 12.5
    st["y"] -= 4
    c.setFont(F_TXTI, 7.4); c.setFillColor(INK_MUTED); c.drawString(ML, st["y"], S["blocker_note"]); st["y"] -= 16

    # ---- Sektionen
    for title, items in S["sections"]:
        section_head(title)
        for mk, text in items:
            draw_item(mk, text)

    # ---- Blinde Flecken
    new_page(S["blind_banner"])
    c.setFillColor(ACCENT); c.roundRect(ML, st["y"] - 2, CW, 20, 3, stroke=0, fill=1)
    c.setFillColor(ON_ACCENT_STRONG); c.setFont(F_DISP, 11); c.drawString(ML + 8, st["y"] + 4, S["blind_banner"])
    st["y"] -= 26
    c.setFont(F_TXTI, 7.8); c.setFillColor(INK_MUTED); c.drawString(ML, st["y"], S["blind_sub"]); st["y"] -= 16
    for title, items in S["blind"]:
        section_head(title)
        for mk, text in items:
            draw_item(mk, text)

    # ---- Datenschutz-Box
    ensure(60)
    c.setFillColor(SURFACE_MUT); c.setStrokeColor(SIGNAL); c.setLineWidth(0.8)
    c.roundRect(ML, st["y"] - 52, CW, 52, 3, stroke=1, fill=1)
    c.setFillColor(INK_STRONG); c.setFont(F_TXTB, 8.5); c.drawString(ML + 10, st["y"] - 14, S["dp_title"])
    c.setFont(F_TXT, 7.8); c.setFillColor(INK)
    for i, ln in enumerate(S["dp"]):
        c.drawString(ML + 10, st["y"] - 26 - i * 9.4, ln)
    st["y"] -= 60

    # ---- Quellen (klickbar)
    ensure(46)
    c.setFillColor(INK_STRONG); c.setFont(F_TXTB, 8.5); c.drawString(ML, st["y"], S["src_title"]); st["y"] -= 13
    c.setFont(F_TXT, 8)
    for label, url in zip(S["links"], S["link_urls"]):
        c.setFillColor(ACCENT_TEXT); c.drawString(ML + 8, st["y"], "\u203a " + label)
        w = stringWidth("\u203a " + label, F_TXT, 8)
        c.linkURL(url, (ML + 8, st["y"] - 2, ML + 8 + w, st["y"] + 9), relative=0, thickness=0)
        st["y"] -= 11.5

    footer(); c.save()
    return {"path": out_path, "items": st["idx"], "pages": st["page"], "embedded_font": have_ttf}
