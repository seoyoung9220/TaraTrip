"""Tests for GET /api/exchange-rate, with the external sources replaced (no network).

Run (from BE/): .venv\\Scripts\\python.exe -m pytest
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routers import exchange_rate as er

client = TestClient(app)


@pytest.fixture(autouse=True)
def fresh_cache(monkeypatch):
    er.reset_cache()
    yield
    er.reset_cache()


def use_sources(monkeypatch, *sources):
    monkeypatch.setattr(er, "SOURCES", list(sources))


def test_returns_rate_in_spec_shape(monkeypatch):
    use_sources(monkeypatch, lambda _c: 24.1)
    res = client.get("/api/exchange-rate")
    assert res.status_code == 200
    body = res.json()
    assert body["base"] == "PHP" and body["quote"] == "KRW" and body["rate"] == 24.1
    assert body["updated_at"].endswith("Z")


def test_caches_between_requests(monkeypatch):
    calls = []
    use_sources(monkeypatch, lambda _c: calls.append(1) or 24.1)
    client.get("/api/exchange-rate")
    client.get("/api/exchange-rate")
    assert len(calls) == 1


def test_falls_back_to_second_source(monkeypatch):
    def broken(_c):
        raise RuntimeError("down")
    use_sources(monkeypatch, broken, lambda _c: 23.5)
    assert client.get("/api/exchange-rate").json()["rate"] == 23.5


def test_serves_stale_rate_when_refresh_fails(monkeypatch):
    use_sources(monkeypatch, lambda _c: 24.1)
    client.get("/api/exchange-rate")

    def broken(_c):
        raise RuntimeError("down")
    use_sources(monkeypatch, broken)
    er._next_fetch = 0.0  # force a refresh
    res = client.get("/api/exchange-rate")
    assert res.status_code == 200 and res.json()["rate"] == 24.1


def test_503_when_no_rate_ever_fetched(monkeypatch):
    def broken(_c):
        raise RuntimeError("down")
    use_sources(monkeypatch, broken)
    res = client.get("/api/exchange-rate")
    assert res.status_code == 503
    assert res.json()["error"]["code"] == "RATE_UNAVAILABLE"
