"""Tests for GET /api/places/{place_id}, with the DB replaced by an in-memory fake.

Run (from BE/): .venv\\Scripts\\python.exe -m pytest
"""
import pytest
from fastapi.testclient import TestClient

from app.db import get_conn
from app.main import app
from app.routers.places import format_opening_hours

ROW = {
    "place_id": "MNL-0001",
    "name": "Binondo Lumpia House",
    "category": "restaurant",
    "lat": 14.6005,
    "lng": 120.9747,
    "address": "Ongpin St, Binondo, Manila",
    "price_min": 80,
    "price_max": 200,
    "entry_fee": 0,
    "opening_hours": {d: "08:00-20:00" for d in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]},
    "description": None,
    "photos": [],
}


class FakeConn:
    def __init__(self, rows):
        self.rows = {r["place_id"]: r for r in rows}

    def execute(self, _sql, params):
        row = self.rows.get(params[0])

        class Cursor:
            def fetchone(self):
                return row

        return Cursor()


@pytest.fixture
def client_with():
    def make(*rows):
        app.dependency_overrides[get_conn] = lambda: FakeConn(rows)
        return TestClient(app)

    yield make
    app.dependency_overrides.clear()


def test_place_found(client_with):
    res = client_with(ROW).get("/api/places/MNL-0001")
    assert res.status_code == 200
    assert res.json() == {
        "place_id": "MNL-0001",
        "name": "Binondo Lumpia House",
        "category": "restaurant",
        "lat": 14.6005,
        "lng": 120.9747,
        "address": "Ongpin St, Binondo, Manila",
        "price_range": {"min": 80, "max": 200, "currency": "PHP"},
        "signature_menu": None,
        "signature_price": None,
        "cash_only": False,
        "opening_hours": "08:00-20:00",
        "description": "",
        "photos": [],
    }


def test_signature_fields(client_with):
    row = {**ROW, "signature_menu": "Fresh lumpia", "signature_price": 60, "cash_only": True}
    body = client_with(row).get("/api/places/MNL-0001").json()
    assert (body["signature_menu"], body["signature_price"], body["cash_only"]) == ("Fresh lumpia", 60, True)


def test_place_not_found(client_with):
    res = client_with(ROW).get("/api/places/MNL-9999")
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "PLACE_NOT_FOUND"


def test_price_falls_back_to_entry_fee(client_with):
    row = {**ROW, "place_id": "MNL-0002", "category": "attraction",
           "price_min": None, "price_max": None, "entry_fee": 75}
    res = client_with(row).get("/api/places/MNL-0002")
    assert res.json()["price_range"] == {"min": 75, "max": 75, "currency": "PHP"}


@pytest.mark.parametrize(
    "hours, expected",
    [
        ({}, ""),
        (
            {"mon": "08:00-20:00", "tue": "08:00-20:00", "wed": "08:00-20:00",
             "thu": "08:00-20:00", "fri": "08:00-20:00", "sat": "closed", "sun": "closed"},
            "Mon-Fri 08:00-20:00, Sat-Sun closed",
        ),
        (
            {"mon": "09:00-17:00", "wed": "09:00-17:00", "sat": "10:00-15:00"},
            "Mon 09:00-17:00, Wed 09:00-17:00, Sat 10:00-15:00",
        ),
    ],
)
def test_format_opening_hours(hours, expected):
    assert format_opening_hours(hours) == expected


KO_ROW = {
    **ROW,
    "description": "Family-run lumpia stall.",
    "signature_menu": "Fresh lumpia",
    "description_ko": "가족이 운영하는 룸피아 가게예요.",
    "signature_menu_ko": "생 룸피아",
}


def test_korean_by_default(client_with):
    body = client_with(KO_ROW).get("/api/places/MNL-0001").json()
    assert body["description"] == "가족이 운영하는 룸피아 가게예요."
    assert body["signature_menu"] == "생 룸피아"
    assert body["name"] == "Binondo Lumpia House"  # names are never translated


def test_english_when_asked(client_with):
    body = client_with(KO_ROW).get("/api/places/MNL-0001?lang=en").json()
    assert body["description"] == "Family-run lumpia stall."
    assert body["signature_menu"] == "Fresh lumpia"


def test_english_until_translated(client_with):
    row = {**KO_ROW, "description_ko": None, "signature_menu_ko": None}
    body = client_with(row).get("/api/places/MNL-0001?lang=ko").json()
    assert body["description"] == "Family-run lumpia stall."
    assert body["signature_menu"] == "Fresh lumpia"


def test_unknown_lang(client_with):
    assert client_with(KO_ROW).get("/api/places/MNL-0001?lang=fr").status_code == 400
