"""Tests for /api/merchant/places with an in-memory fake DB.

Run (from BE/): .venv\\Scripts\\python.exe -m pytest
"""
import re

import pytest
from fastapi.testclient import TestClient

from app.db import get_conn
from app.main import app
from app.routers.merchant import FIELDS, hash_key

DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

BODY = {
    "name": "Aling Nena's Carinderia",
    "category": "restaurant",
    "lat": 14.5995,
    "lng": 120.9748,
    "address": "123 Ongpin St, Binondo, Manila",
    "district": "Binondo",
    "price_min": 80,
    "price_max": 200,
    "signature_menu": "Adobo rice meal",
    "signature_price": 95,
    "cash_only": True,
    "avg_stay_minutes": 40,
    "opening_hours": {**{d: "07:00-19:00" for d in DAYS}, "sun": "closed"},
    "tags": ["lutong bahay", " silog ", ""],
    "description": "Home-cooked Filipino meals since 1998.",
    "photos": [],
    "contact": "",
}


class FakeConn:
    """Answers the four statements app/routers/merchant.py sends."""

    def __init__(self):
        self.rows: dict[str, dict] = {"MNL-0001": {"place_id": "MNL-0001", "edit_key_hash": None}}
        self.seq = 0

    def execute(self, sql, params):
        sql = " ".join(sql.split())
        result = None
        if sql.startswith("insert into places"):
            assert "nextval('merchant_place_seq')" in sql
            self.seq += 1
            pid = f"BIZ-{self.seq:04d}"
            values = [getattr(v, "obj", v) for v in params]  # unwrap Jsonb
            self.rows[pid] = {"place_id": pid, **dict(zip(FIELDS, values)), "edit_key_hash": values[-1]}
            result = self.public(pid)
        elif sql.startswith("select count(*) as n from information_schema.columns"):
            result = {"n": 1}  # the Korean columns exist
        elif sql.startswith("select edit_key_hash"):
            result = self.rows.get(params[0])
        elif sql.startswith("select"):
            result = self.public(params[0])
        elif sql.startswith("update places"):
            *values, pid = [getattr(v, "obj", v) for v in params]
            self.rows[pid].update(zip(FIELDS, values))
            result = self.public(pid)
        else:
            raise AssertionError(sql)

        class Cursor:
            def fetchone(self):
                return result

        return Cursor()

    def public(self, pid):
        row = self.rows[pid]
        return {k: row[k] for k in ["place_id", *FIELDS]}

    def commit(self):
        pass


@pytest.fixture
def db():
    conn = FakeConn()
    app.dependency_overrides[get_conn] = lambda: conn
    yield conn
    app.dependency_overrides.clear()


@pytest.fixture
def client(db):
    return TestClient(app)


def register(client, **changes):
    return client.post("/api/merchant/places", json={**BODY, **changes})


def test_register_returns_id_and_key_once(client, db):
    res = register(client)
    assert res.status_code == 201
    body = res.json()
    assert body["place_id"] == "BIZ-0001"
    assert re.fullmatch(r"[\w-]{16}", body["edit_key"])
    # cleaned up: blank contact → null, tags trimmed and blanks dropped
    assert body["contact"] is None
    assert body["tags"] == ["lutong bahay", "silog"]
    assert body["entry_fee"] == 0
    # only the hash is stored
    assert db.rows["BIZ-0001"]["edit_key_hash"] == hash_key(body["edit_key"])


def test_read_and_update_with_key(client):
    created = register(client).json()
    key = {"X-Edit-Key": created["edit_key"]}

    got = client.get("/api/merchant/places/BIZ-0001", headers=key)
    assert got.status_code == 200
    assert got.json()["opening_hours"]["sun"] == "closed"
    assert "edit_key" not in got.json()

    res = client.put("/api/merchant/places/BIZ-0001", headers=key, json={**BODY, "price_max": 250})
    assert res.status_code == 200
    assert res.json()["price_max"] == 250


@pytest.mark.parametrize("headers", [{}, {"X-Edit-Key": "wrong-key"}])
def test_wrong_or_missing_key(client, headers):
    register(client)
    assert client.get("/api/merchant/places/BIZ-0001", headers=headers).status_code == 401
    res = client.put("/api/merchant/places/BIZ-0001", headers=headers, json=BODY)
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "INVALID_EDIT_KEY"


def test_imported_places_cannot_be_edited(client):
    res = client.put("/api/merchant/places/MNL-0001", headers={"X-Edit-Key": "anything"}, json=BODY)
    assert res.status_code == 401


def test_unknown_place(client):
    res = client.get("/api/merchant/places/BIZ-9999", headers={"X-Edit-Key": "k"})
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "PLACE_NOT_FOUND"


@pytest.mark.parametrize(
    "changes",
    [
        {"name": "  "},
        {"category": "cafe"},
        {"lat": 120.9748, "lng": 14.5995},  # swapped
        {"price_min": 300, "price_max": 100},
        {"opening_hours": {d: "7am-7pm" for d in DAYS}},
        {"opening_hours": {"mon": "07:00-19:00"}},  # missing days
        {"photos": ["http://insecure.example/a.jpg"]},
        {"signature_price": -5},
    ],
)
def test_invalid_input(client, changes):
    res = register(client, **changes)
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "INVALID_REQUEST"
