"""recommend()가 docs/API.md 형식대로 답하는지 확인 (LLM·DB 없이)

실행 (AI 폴더에서):  python tests/test_recommend.py
"""
import json
import os
import sys
from datetime import date

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.stdout.reconfigure(encoding="utf-8")

from data.places import places as SAMPLE
from recommend import recommend, BudgetTooLowError, NoResultsError

DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
CAT = {"food": "restaurant", "cafe": "restaurant", "shopping": "shop", "sightseeing": "attraction", "culture": "attraction"}

# places.py 샘플을 DB 행 모양(BE/db/schema.sql)으로 바꾼 가짜 데이터
ROWS = []
for i, p in enumerate(SAMPLE, 1):
    is_attr = CAT[p["category"]] == "attraction"
    ROWS.append({
        "place_id": f"MNL-{i:04d}", "name": p["name"], "category": CAT[p["category"]],
        "is_small_business": p["smallBiz"], "lat": p["lat"], "lng": p["lng"],
        "address": "Manila", "district": p["area"],
        "price_min": None if is_attr else p["costPhp"], "price_max": None if is_attr else p["costPhp"],
        "entry_fee": p["costPhp"] if is_attr else 0, "avg_stay_minutes": p["stayMin"],
        "opening_hours": {d: f"{p['opens']}-{p['closes']}" for d in DAYS},
        "tags": [p["category"]], "description": p["description"], "photos": [],
    })
# 월요일 휴무인 곳 하나
ROWS[1]["opening_hours"]["mon"] = "closed"

MON, TUE = date(2026, 11, 9), date(2026, 11, 10)
REQ = {"region": "Manila", "budget": {"amount": 1000, "currency": "PHP"},
       "foods": ["local street food"], "attractions": ["Fort Santiago"],
       "start_location": {"lat": 14.5915, "lng": 120.9737}}


def check_shape(res, budget):
    """FE/src/api/types.ts의 Recommendation과 같은 모양인지"""
    assert set(res) - {"_debug"} == {"route_id", "total_cost", "total_minutes", "currency", "summary", "stops"}
    assert res["currency"] == "PHP" and isinstance(res["summary"], str) and res["summary"]
    assert res["total_cost"] <= budget, "예산 초과"
    assert res["total_cost"] == sum(s["est_cost"] + s["cost_breakdown"]["transport"] for s in res["stops"])
    for i, s in enumerate(res["stops"]):
        assert set(s) == {"order", "place_id", "name", "category", "lat", "lng", "arrival_time", "est_cost",
                          "stay_minutes", "transport", "cost_breakdown", "reason"}, set(s)
        assert s["order"] == i + 1
        assert s["category"] in ("restaurant", "market", "shop", "attraction")
        assert len(s["arrival_time"]) == 5 and s["arrival_time"][2] == ":"
        assert set(s["cost_breakdown"]) == {"food", "entry", "transport"}
        assert s["est_cost"] == s["cost_breakdown"]["food"] + s["cost_breakdown"]["entry"]
        if i == 0:
            assert s["transport"] is None
        else:
            assert s["transport"]["mode"] in ("walk", "jeepney", "tricycle", "taxi", "other")
            assert s["cost_breakdown"]["transport"] == s["transport"]["cost"]
    json.dumps(res)  # JSON으로 바꿀 수 있는지


def test_form_only():
    res = recommend(REQ, ROWS, travel_date=TUE)
    check_shape(res, 1000)
    names = [s["name"] for s in res["stops"]]
    assert "Fort Santiago" in names, "꼭 가고 싶은 곳이 빠짐"
    return res


def test_closed_day():
    res = recommend(REQ, ROWS, travel_date=MON)
    check_shape(res, 1000)
    assert ROWS[1]["name"] not in [s["name"] for s in res["stops"]], "휴무인 곳이 들어감"


def test_free_text_with_mock_llm():
    llm = lambda m: '{"budget":{"amount":5000,"currency":"PHP"},"start":"13:00","end":"18:00","tags":["cafe"],"areas":[],"mustVisit":[],"avoid":["churches"],"preferenceText":"Wants coffee.","language":"ko","isTripRequest":true}'
    res = recommend({**REQ, "free_text": "오후 1시부터 6시까지 카페, 성당 빼고"}, ROWS, call_llm=llm, travel_date=TUE)
    check_shape(res, 1000)  # free_text의 5000페소가 아니라 폼의 1000페소가 적용돼야 함
    assert res["stops"][0]["arrival_time"] >= "13:00"
    assert not any("Church" in s["name"] or "Cathedral" in s["name"] for s in res["stops"])
    assert "페소" in res["summary"]  # 한국어 요청이면 한국어 설명


def test_llm_failure_falls_back():
    def broken(m):
        raise TimeoutError("LLM down")
    res = recommend({**REQ, "free_text": "anything"}, ROWS, call_llm=broken, travel_date=TUE)
    check_shape(res, 1000)


def test_budget_too_low():
    rows = [{**r, "entry_fee": 500, "price_min": 500, "price_max": 500} for r in ROWS]
    try:
        recommend({**REQ, "budget": {"amount": 100, "currency": "PHP"}}, rows, travel_date=TUE)
    except BudgetTooLowError:
        return
    raise AssertionError("BudgetTooLowError가 안 남")


def test_no_results():
    rows = [{**r, "opening_hours": {d: "closed" for d in DAYS}} for r in ROWS]
    try:
        recommend(REQ, rows, travel_date=TUE)
    except NoResultsError:
        return
    raise AssertionError("NoResultsError가 안 남")


if __name__ == "__main__":
    tests = [v for k, v in dict(globals()).items() if k.startswith("test_")]
    for t in tests:
        t()
        print(f"✓ {t.__name__}")
    print(f"\n{len(tests)}개 통과\n")
    print(json.dumps({k: v for k, v in test_form_only().items() if k != "_debug"}, ensure_ascii=False, indent=2))
