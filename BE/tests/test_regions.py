"""Tests for GET /api/regions, with the DB replaced by an in-memory fake.

Run (from BE/): .venv\\Scripts\\python.exe -m pytest
"""
from fastapi.testclient import TestClient

from app.db import get_conn
from app.main import app


class FakeConn:
    def __init__(self, districts):
        self.rows = [{"district": d} for d in districts]

    def execute(self, _sql, _params=None):
        rows = self.rows

        class Cursor:
            def fetchall(self):
                return rows

        return Cursor()


def get(districts):
    app.dependency_overrides[get_conn] = lambda: FakeConn(districts)
    try:
        return TestClient(app).get("/api/regions")
    finally:
        app.dependency_overrides.clear()


def test_sorted_and_deduplicated():
    res = get(["Intramuros", "Binondo", "intramuros ", None, ""])
    assert res.status_code == 200
    assert res.json() == {"regions": ["Binondo", "Intramuros"]}


def test_empty_db():
    assert get([]).json() == {"regions": []}
