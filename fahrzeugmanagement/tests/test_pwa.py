"""Tests für die PWA-Auslieferung (Manifest, Service Worker, Asset Links, Icons)."""
import pytest
from fastapi.testclient import TestClient

from app import db
from app.main import app


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "test.db")
    with TestClient(app) as c:
        yield c


def test_manifest(client):
    r = client.get("/manifest.webmanifest")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/manifest+json")
    m = r.json()
    assert m["name"] and m["short_name"]
    assert m["start_url"].startswith("/")
    assert m["scope"] == "/"
    assert m["display"] == "standalone"
    assert m["theme_color"] == "#0f5c8c"
    sizes = {i["sizes"] for i in m["icons"]}
    assert {"192x192", "512x512"} <= sizes
    assert any(i.get("purpose") == "maskable" for i in m["icons"])


def test_service_worker(client):
    r = client.get("/sw.js")
    assert r.status_code == 200
    assert "javascript" in r.headers["content-type"]
    assert r.headers["service-worker-allowed"] == "/"
    assert "install" in r.text and "fetch" in r.text


def test_assetlinks_from_env(client, monkeypatch):
    monkeypatch.setenv("TWA_PACKAGE_NAME", "de.test.app")
    monkeypatch.setenv("TWA_SHA256_FINGERPRINT", "AA:BB:CC")
    r = client.get("/.well-known/assetlinks.json")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) == 1
    assert "delegate_permission/common.handle_all_urls" in data[0]["relation"]
    assert data[0]["target"]["package_name"] == "de.test.app"
    assert data[0]["target"]["sha256_cert_fingerprints"] == ["AA:BB:CC"]

    monkeypatch.setenv("TWA_SHA256_FINGERPRINT", "AA:BB, CC:DD")
    assert client.get("/.well-known/assetlinks.json").json()[0]["target"]["sha256_cert_fingerprints"] == ["AA:BB", "CC:DD"]


def test_index_links_manifest(client):
    html = client.get("/").text
    assert 'rel="manifest"' in html
    assert 'name="theme-color"' in html


@pytest.mark.parametrize("name", ["icon-192.png", "icon-512.png", "icon-512-maskable.png"])
def test_icons_served(client, name):
    r = client.get(f"/static/icons/{name}")
    assert r.status_code == 200
    assert r.content.startswith(b"\x89PNG")
