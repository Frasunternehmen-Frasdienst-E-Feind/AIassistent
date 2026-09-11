"""Marken- vs. Nicht-Marken-Erkennung für Suchanfragen."""
from __future__ import annotations

import re

_UMLAUTS = str.maketrans({"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss"})
_NON_WORD = re.compile(r"[^a-z0-9 ]+")
_SPACES = re.compile(r"\s+")


def normalize(text: str) -> str:
    """Kleinschreibung, Umlaute → ae/oe/ue, Sonderzeichen raus, Leerzeichen normalisiert."""
    t = text.lower().translate(_UMLAUTS)
    t = _NON_WORD.sub(" ", t)
    return _SPACES.sub(" ", t).strip()


class BrandMatcher:
    def __init__(self, brand_terms: list[str]):
        self.terms = [normalize(t) for t in brand_terms if t.strip()]
        self.terms_compact = [t.replace(" ", "") for t in self.terms]

    def is_brand(self, query: str) -> bool:
        q = normalize(query)
        if any(t and t in q for t in self.terms):
            return True
        q_compact = q.replace(" ", "")
        return any(t and t in q_compact for t in self.terms_compact)
