"""The real API app, with the database swapped for dev/sample_places.py.

For working on the frontend before Supabase has data. Not for deployment.

Run (from BE/):
    python -m uvicorn dev.fake_server:app --reload --port 8000
then the FE with VITE_USE_MOCK=false.
"""
from app.db import get_conn
from app.main import app
from dev.sample_places import SAMPLE_PLACES

__all__ = ["app"]


class _Cursor:
    def __init__(self, rows):
        self._rows = rows

    def fetchall(self):
        return self._rows

    def fetchone(self):
        return self._rows[0] if self._rows else None


class SampleConn:
    """Answers the two queries the routers make: every place, or one by place_id."""

    def execute(self, _sql, params=None):
        if params:
            return _Cursor([r for r in SAMPLE_PLACES if r["place_id"] == params[0]])
        return _Cursor(list(SAMPLE_PLACES))


app.dependency_overrides[get_conn] = SampleConn
