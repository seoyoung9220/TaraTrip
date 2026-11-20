"""Tests for POST /api/merchant/promo with a fake LLM (no Workers AI calls)."""
import json

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routers import promo

BODY = {
    "name": "Aling Nena's Carinderia",
    "category": "restaurant",
    "district": "Binondo",
    "signature_menu": "Adobo rice meal",
    "signature_price": 95,
    "cash_only": True,
    "tags": ["lutong bahay"],
    "notes": "lutong bahay since 1998, malapit sa simbahan",
}
GOOD = {
    "description": "A family carinderia in Binondo cooking lutong bahay since 1998. Try the adobo rice meal (PHP 95).",
    "post": "Hungry in Binondo? Come try our adobo rice meal! #Binondo #LutongBahay",
}


@pytest.fixture
def llm(monkeypatch):
    """Queue of fake LLM answers; records the messages it was sent."""
    answers, calls = [], []

    def call(messages):
        calls.append(list(messages))
        a = answers.pop(0)
        if isinstance(a, Exception):
            raise a
        return a if isinstance(a, str) else json.dumps(a)

    monkeypatch.setattr(promo, "llm", lambda: call)
    promo._recent.clear()
    return answers, calls


client = TestClient(app)


def test_promo_ok(llm):
    answers, calls = llm
    answers.append(GOOD)
    r = client.post("/api/merchant/promo", json=BODY)
    assert r.status_code == 200
    assert r.json() == GOOD
    facts = calls[0][1]["content"]
    assert "Best seller: Adobo rice meal (PHP 95)" in facts and "Payment: cash only" in facts


def test_invented_number_is_retried(llm):
    answers, calls = llm
    answers += [{**GOOD, "post": "Open since 1985! #Binondo"}, GOOD]
    r = client.post("/api/merchant/promo", json=BODY)
    assert r.status_code == 200 and r.json() == GOOD
    assert "1985" in calls[1][-1]["content"]  # the retry says what was wrong


def test_two_bad_answers_give_503(llm):
    answers, _ = llm
    answers += ["not json", RuntimeError("Workers AI down")]
    r = client.post("/api/merchant/promo", json=BODY)
    assert r.status_code == 503 and r.json()["error"]["code"] == "AI_UNAVAILABLE"


def test_too_long_is_rejected(llm):
    answers, _ = llm
    answers += [{**GOOD, "description": "x" * 401}, {**GOOD, "description": "x" * 401}]
    assert client.post("/api/merchant/promo", json=BODY).status_code == 503


def test_post_gets_a_hashtag(llm):
    answers, _ = llm
    answers.append({**GOOD, "post": "Come visit us in Binondo!"})
    assert client.post("/api/merchant/promo", json=BODY).json()["post"].endswith("#TaraTrip")


def test_no_keys_gives_503(monkeypatch):
    monkeypatch.setattr(promo, "llm", lambda: None)
    r = client.post("/api/merchant/promo", json=BODY)
    assert r.status_code == 503 and r.json()["error"]["code"] == "AI_UNAVAILABLE"


def test_notes_required(llm):
    r = client.post("/api/merchant/promo", json={**BODY, "notes": "  "})
    assert r.status_code == 400 and r.json()["error"]["code"] == "INVALID_REQUEST"


def test_rate_limit(llm):
    answers, _ = llm
    answers += [GOOD] * promo.RATE_LIMIT
    headers = {"X-Forwarded-For": "203.0.113.5, 10.0.0.1"}
    for _ in range(promo.RATE_LIMIT):
        assert client.post("/api/merchant/promo", json=BODY, headers=headers).status_code == 200
    r = client.post("/api/merchant/promo", json=BODY, headers=headers)
    assert r.status_code == 429 and r.json()["error"]["code"] == "TOO_MANY_REQUESTS"
    # another client is not affected
    answers.append(GOOD)
    assert client.post("/api/merchant/promo", json=BODY, headers={"X-Forwarded-For": "198.51.100.7"}).status_code == 200
