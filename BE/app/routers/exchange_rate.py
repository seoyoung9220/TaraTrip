"""GET /api/exchange-rate (docs/API.md section 3): PHP -> KRW, cached in memory.

The rate is fetched at most once per CACHE_SECONDS. If every source fails, the last good
rate is served (stale beats nothing for a "≈ ₩" hint); with no rate at all the endpoint
answers 503 and the FE hides the KRW line.
"""
import logging
import threading
import time
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

from app.errors import ApiError

log = logging.getLogger(__name__)
router = APIRouter()

CACHE_SECONDS = 12 * 60 * 60  # sources publish once a day; 12 h keeps us within a day of it
RETRY_SECONDS = 10 * 60       # after a failed refresh, don't hit the sources on every request
TIMEOUT_SECONDS = 5


class ExchangeRate(BaseModel):
    base: str = "PHP"
    quote: str = "KRW"
    rate: float
    updated_at: str


def _from_frankfurter(client: httpx.Client) -> float:
    # ECB reference rates, no API key.
    r = client.get("https://api.frankfurter.dev/v1/latest", params={"base": "PHP", "symbols": "KRW"})
    r.raise_for_status()
    return float(r.json()["rates"]["KRW"])


def _from_open_er_api(client: httpx.Client) -> float:
    # ExchangeRate-API open endpoint, no API key. Fallback only.
    r = client.get("https://open.er-api.com/v6/latest/PHP")
    r.raise_for_status()
    data = r.json()
    if data.get("result") != "success":
        raise ValueError(f"open.er-api result={data.get('result')}")
    return float(data["rates"]["KRW"])


SOURCES = [_from_frankfurter, _from_open_er_api]

_lock = threading.Lock()
_cached: ExchangeRate | None = None
_next_fetch = 0.0  # time.monotonic() after which the cache is refreshed


def fetch_rate() -> float:
    errors = []
    with httpx.Client(timeout=TIMEOUT_SECONDS) as client:
        for source in SOURCES:
            try:
                rate = source(client)
                if rate > 0:
                    return rate
                errors.append(f"{source.__name__}: non-positive rate {rate}")
            except Exception as e:  # network, HTTP status, bad JSON: try the next source
                errors.append(f"{source.__name__}: {e!r}")
    raise RuntimeError("; ".join(errors))


def get_rate() -> ExchangeRate:
    global _cached, _next_fetch
    with _lock:
        now = time.monotonic()
        if _cached is None or now >= _next_fetch:
            try:
                rate = fetch_rate()
                fetched = datetime.now(timezone.utc).replace(microsecond=0)
                _cached = ExchangeRate(rate=round(rate, 4),
                                       updated_at=fetched.isoformat().replace("+00:00", "Z"))
                _next_fetch = now + CACHE_SECONDS
            except Exception as e:
                log.warning("exchange rate refresh failed: %s", e)
                _next_fetch = now + RETRY_SECONDS
        if _cached is None:
            raise ApiError(503, "RATE_UNAVAILABLE", "Exchange rate is unavailable right now.")
        return _cached


def reset_cache() -> None:
    """For tests."""
    global _cached, _next_fetch
    with _lock:
        _cached, _next_fetch = None, 0.0


@router.get("/exchange-rate", response_model=ExchangeRate)
def exchange_rate() -> ExchangeRate:
    return get_rate()
