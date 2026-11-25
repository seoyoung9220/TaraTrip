"""Tests for GET /api/places, with the DB replaced by an in-memory fake.

Run (from BE/): .venv\\Scripts\\python.exe -m pytest
"""
from fastapi.testclient import TestClient

from app.db import get_conn
from app.main import app


class FakeConn:
    def __init__(self, rows):
        self.rows = rows

    def execute(self, _sql, _params=None):
        rows = self.rows

        class Cursor:
            def fetchall(self):
                return rows

        return Cursor()


def get(rows):
    app.dependency_overrides[get_conn] = lambda: FakeConn(rows)
    try:
        return TestClient(app).get("/api/places")
    finally:
        app.dependency_overrides.clear()


def test_sorted_by_name_and_trimmed():
    res = get([
        {"place_id": "MNL-0002", "name": "Paco Park", "category": "attraction", "district": "Paco", "description_ko": "조용한 정원이에요."},
        {"place_id": "MNL-0001", "name": "fort Santiago\n", "category": "attraction", "district": " Intramuros "},
        {"place_id": "MNL-0003", "name": "  ", "category": "shop", "district": None},
        {"place_id": "MNL-0004", "name": "Kanamit", "category": "restaurant", "district": None, "description_ko": None},
    ])
    assert res.status_code == 200
    assert res.json() == {"places": [
        {"place_id": "MNL-0001", "name": "fort Santiago", "category": "attraction", "district": "Intramuros", "description_ko": None},
        {"place_id": "MNL-0004", "name": "Kanamit", "category": "restaurant", "district": None, "description_ko": None},
        {"place_id": "MNL-0002", "name": "Paco Park", "category": "attraction", "district": "Paco", "description_ko": "조용한 정원이에요."},
    ]}


def test_empty_db():
    assert get([]).json() == {"places": []}


def test_detail_route_still_works_next_to_list():
    # /api/places/{id} must not be swallowed by the new list route
    class One(FakeConn):
        def execute(self, _sql, params=None):
            class Cursor:
                def fetchone(self):
                    return None
            return Cursor()

    app.dependency_overrides[get_conn] = lambda: One([])
    try:
        assert TestClient(app).get("/api/places/MNL-9999").status_code == 404
    finally:
        app.dependency_overrides.clear()
