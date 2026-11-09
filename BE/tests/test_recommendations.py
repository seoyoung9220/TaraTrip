"""Tests for POST /api/recommendations with a fake DB and no LLM keys.

Run (from BE/): .venv\\Scripts\\python.exe -m pytest
"""
import time

import pytest
from fastapi.testclient import TestClient

from app.db import get_conn
from app.main import app
from app.routers import recommendations

ALL_DAY = {d: "08:00-20:00" for d in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]}


def row(place_id, name, category, lat, lng, price=None, entry=0, small=False, tags=()):
    return {
        "place_id": place_id, "name": name, "category": category, "is_small_business": small,
        "lat": lat, "lng": lng, "address": "Manila", "district": "Intramuros",
        "price_min": price, "price_max": price, "entry_fee": entry, "avg_stay_minutes": 40,
        "opening_hours": ALL_DAY, "tags": list(tags), "description": None, "photos": [],
    }


ROWS = [
    row("MNL-0001", "Fort Santiago", "attraction", 14.5958, 120.9705, entry=75, tags=["history"]),
    row("MNL-0002", "Kalye Lumpia", "restaurant", 14.5905, 120.9750, price=150, small=True, tags=["street food"]),
    row("MNL-0003", "Plaza Cafe", "restaurant", 14.5915, 120.9737, price=120, small=True, tags=["cafe"]),
]

REQ = {
    "region": "Intramuros",
    "budget": {"amount": 1000, "currency": "PHP"},
    "foods": ["street food"],
    "attractions": ["Fort Santiago"],
    "start_location": {"lat": 14.5915, "lng": 120.9737},
}


class FakeConn:
    def __init__(self, rows):
        self.rows = rows

    def execute(self, _sql, _params=None):
        rows = self.rows

        class Cursor:
            def fetchall(self):
                return rows

        return Cursor()


@pytest.fixture
def client_with(monkeypatch):
    # Never call Workers AI from tests, even if BE/.env has keys.
    monkeypatch.delenv("CF_ACCOUNT_ID", raising=False)
    monkeypatch.delenv("CF_API_TOKEN", raising=False)

    def make(rows=ROWS):
        app.dependency_overrides[get_conn] = lambda: FakeConn(rows)
        return TestClient(app)

    yield make
    app.dependency_overrides.clear()


def test_recommendation_matches_spec(client_with):
    res = client_with().post("/api/recommendations", json=REQ)
    assert res.status_code == 200, res.text
    body = res.json()
    assert set(body) == {"route_id", "total_cost", "total_minutes", "currency", "summary", "stops"}
    assert body["currency"] == "PHP"
    assert 0 < body["total_cost"] <= REQ["budget"]["amount"]
    assert body["stops"], "expected at least one stop"
    assert body["stops"][0]["transport"] is None
    assert [s["order"] for s in body["stops"]] == list(range(1, len(body["stops"]) + 1))
    assert {s["place_id"] for s in body["stops"]} <= {r["place_id"] for r in ROWS}
    assert "Fort Santiago" in [s["name"] for s in body["stops"]]  # asked for by name


def test_budget_too_low(client_with):
    res = client_with().post("/api/recommendations", json={**REQ, "budget": {"amount": 10, "currency": "PHP"}})
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "BUDGET_TOO_LOW"


def test_no_places(client_with):
    res = client_with([]).post("/api/recommendations", json=REQ)
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "NO_RESULTS"


def test_all_closed_is_no_results(client_with):
    closed = [{**r, "opening_hours": {d: "closed" for d in ALL_DAY}} for r in ROWS]
    res = client_with(closed).post("/api/recommendations", json=REQ)
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "NO_RESULTS"


@pytest.mark.parametrize(
    "patch",
    [
        {"budget": {"amount": 0, "currency": "PHP"}},
        {"budget": {"amount": 1000, "currency": "KRW"}},
        {"start_location": {"lat": 200, "lng": 120.9}},
        {"region": ""},
    ],
)
def test_invalid_request(client_with, patch):
    res = client_with().post("/api/recommendations", json={**REQ, **patch})
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "INVALID_REQUEST"


def test_missing_start_location(client_with):
    body = {k: v for k, v in REQ.items() if k != "start_location"}
    res = client_with().post("/api/recommendations", json=body)
    assert res.status_code == 400


MONDAY, TUESDAY = "2026-11-16", "2026-11-17"


@pytest.mark.parametrize("day, expected", [(MONDAY, False), (TUESDAY, True)])
def test_travel_date_uses_that_weekdays_hours(client_with, day, expected):
    rows = [{**ROWS[0], "opening_hours": {**ALL_DAY, "mon": "closed"}}, *ROWS[1:]]
    res = client_with(rows).post("/api/recommendations", json={**REQ, "travel_date": day})
    assert res.status_code == 200, res.text
    names = [s["name"] for s in res.json()["stops"]]
    assert ("Fort Santiago" in names) is expected


def test_reasons_are_korean_even_for_english_free_text(client_with):
    res = client_with().post("/api/recommendations", json={**REQ, "free_text": "I want street food"})
    assert res.status_code == 200, res.text
    assert "코스" in res.json()["summary"]


def test_times_are_accepted(client_with):
    res = client_with().post("/api/recommendations", json={**REQ, "start_time": "09:00", "end_time": "18:30"})
    assert res.status_code == 200, res.text


@pytest.mark.parametrize(
    "patch, message",
    [
        ({"start_time": "14:00", "end_time": "13:00"}, "end_time must be later than start_time"),
        ({"start_time": "10:00", "end_time": "10:00"}, "end_time must be later than start_time"),
        ({"start_time": "9:00"}, "start_time"),
        ({"end_time": "24:00"}, "end_time"),
        ({"travel_date": "2026-13-01"}, "travel_date"),
        ({"travel_date": "11/20/2026"}, "travel_date"),
    ],
)
def test_invalid_date_or_time(client_with, patch, message):
    res = client_with().post("/api/recommendations", json={**REQ, **patch})
    assert res.status_code == 400
    error = res.json()["error"]
    assert error["code"] == "INVALID_REQUEST"
    assert message in error["message"]


def test_ai_timeout(client_with, monkeypatch):
    def slow(*_args, **_kwargs):
        time.sleep(0.5)

    monkeypatch.setattr(recommendations, "recommend", slow)
    monkeypatch.setattr(recommendations, "AI_TIMEOUT_SECONDS", 0.05)
    res = client_with().post("/api/recommendations", json=REQ)
    assert res.status_code == 504
    assert res.json()["error"]["code"] == "AI_TIMEOUT"
