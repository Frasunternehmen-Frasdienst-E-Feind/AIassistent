"""Sichert die Cluster-Zuordnung der mitgelieferten config.example.yaml ab.

Beispiel-Suchanfragen stammen aus dem Notion „Marketing-Scan" (Keyword-Cluster) und
dem „Marketing-Audit August 2026" (Empfohlene Keyword-Struktur).
"""
from pathlib import Path

import pytest

from seo_reporting.analysis.brand import BrandMatcher
from seo_reporting.analysis.clusters import BRAND_CLUSTER, OTHER_CLUSTER, ClusterAssigner
from seo_reporting.config import load_config

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="module")
def assigner():
    cfg = load_config(ROOT / "config.example.yaml")
    return ClusterAssigner(cfg.clusters, BrandMatcher(cfg.brand_terms))


@pytest.mark.parametrize(
    "query, expected",
    [
        # Marke
        ("fräsdienst feind", BRAND_CLUSTER),
        ("fräsdienst enrico feind", BRAND_CLUSTER),
        # Hauptleistungen
        ("kaltfräsen", "Hauptleistungen (Kalt-, Asphalt-, Betonfräsen)"),
        ("Asphaltfräsen", "Hauptleistungen (Kalt-, Asphalt-, Betonfräsen)"),
        ("betonfräsen", "Hauptleistungen (Kalt-, Asphalt-, Betonfräsen)"),
        ("straßenfräsen", "Hauptleistungen (Kalt-, Asphalt-, Betonfräsen)"),
        ("fräsarbeiten", "Hauptleistungen (Kalt-, Asphalt-, Betonfräsen)"),
        # Flächengröße
        ("kleinflächenfräsen", "Flächengröße (Klein-, Groß-, Feinfräsen)"),
        ("großflächenfräsen", "Flächengröße (Klein-, Groß-, Feinfräsen)"),
        ("feinfräsen", "Flächengröße (Klein-, Groß-, Feinfräsen)"),
        # Spezialverfahren
        ("diamond grinding", "Spezialverfahren (Grinding, Grooving, Nutfräsen)"),
        ("grooving beton", "Spezialverfahren (Grinding, Grooving, Nutfräsen)"),
        ("pflasterschleifen", "Spezialverfahren (Grinding, Grooving, Nutfräsen)"),
        ("nutfräsen", "Spezialverfahren (Grinding, Grooving, Nutfräsen)"),
        ("3d-fräsen nivellieren", "Spezialverfahren (Grinding, Grooving, Nutfräsen)"),
        ("fräsen mit überbreite", "Spezialverfahren (Grinding, Grooving, Nutfräsen)"),
        # Service
        ("fräsarbeiten mit kehrsauger", "Service (Kehrsauger, Fräsgut, Räumung)"),
        ("fräsgut aufnehmen", "Service (Kehrsauger, Fräsgut, Räumung)"),
        ("baustellenreinigung", "Service (Kehrsauger, Fräsgut, Räumung)"),
        # Regional (hat Vorrang vor Hauptleistungen)
        ("asphaltfräsen brandenburg", "Regional"),
        ("fräsarbeiten berlin", "Regional"),
        ("betonfräsen sachsen", "Regional"),
        ("kaltfräsen mecklenburg-vorpommern", "Regional"),
        # Zielgruppen
        ("fräsdienst für bauunternehmen", "Zielgruppen"),
        ("fräsarbeiten für kommunen", "Zielgruppen"),
        # Problembezogen
        ("asphalt abfräsen lassen", "Problembezogen"),
        ("betonfläche bearbeiten", "Problembezogen"),
        ("straßenbelag entfernen", "Problembezogen"),
        # Sonstige
        ("fräsmaschine kaufen", OTHER_CLUSTER),
        ("fräsen definition", "Hauptleistungen (Kalt-, Asphalt-, Betonfräsen)"),
    ],
)
def test_example_config_assigns_notion_examples(assigner, query, expected):
    assert assigner.assign(query) == expected


def test_example_config_has_seven_clusters_in_priority_order():
    cfg = load_config(ROOT / "config.example.yaml")
    names = [c.name for c in cfg.clusters]
    assert names[0] == "Regional"
    assert names[-1].startswith("Hauptleistungen")
    assert len(names) == 7
