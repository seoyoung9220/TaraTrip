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
    assert set(res) - {"_debug"} == {"route_id", "total_cost", "total_minutes", "currency", "summary", "stops",
                                     "return_transport"}
    assert res["currency"] == "PHP" and isinstance(res["summary"], str) and res["summary"]
    assert res["total_cost"] <= budget, "예산 초과"
    rt = res["return_transport"]
    assert set(rt) == {"mode", "minutes", "cost"} and rt["mode"] in ("walk", "jeepney", "tricycle", "taxi", "other")
    # 총액 = 장소 비용 + 첫 구간 포함 모든 교통비 + 돌아가는 교통비
    assert res["total_cost"] == sum(s["est_cost"] + s["cost_breakdown"]["transport"] for s in res["stops"]) + rt["cost"]
    for i, s in enumerate(res["stops"]):
        assert set(s) == {"order", "place_id", "name", "category", "lat", "lng", "arrival_time", "est_cost",
                          "stay_minutes", "transport", "cost_breakdown", "reason"}, set(s)
        assert s["order"] == i + 1
        assert s["category"] in ("restaurant", "market", "shop", "attraction")
        assert len(s["arrival_time"]) == 5 and s["arrival_time"][2] == ":"
        assert set(s["cost_breakdown"]) == {"food", "entry", "transport"}
        assert s["est_cost"] == s["cost_breakdown"]["food"] + s["cost_breakdown"]["entry"]
        assert s["transport"]["mode"] in ("walk", "jeepney", "tricycle", "taxi", "other")  # 첫 장소도 채움
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


def test_language():
    # 1) free_text 없음 → 기본 한국어
    res = recommend(REQ, ROWS, travel_date=TUE)
    assert "페소" in res["summary"] and "코스" in res["summary"], res["summary"]
    # 2) 백엔드가 lang="en"을 넘기면 영어
    res = recommend(REQ, ROWS, travel_date=TUE, lang="en")
    assert "route" in res["summary"], res["summary"]
    # 3) free_text가 영어여도 lang="ko"가 우선
    llm = lambda m: '{"budget":null,"start":"13:00","end":"18:00","tags":["food"],"areas":[],"mustVisit":[],"avoid":[],"preferenceText":"Wants food.","language":"en","isTripRequest":true}'
    res = recommend({**REQ, "free_text": "food after lunch"}, ROWS, call_llm=llm, travel_date=TUE, lang="ko")
    assert "코스" in res["summary"], res["summary"]
    # 4) lang 없이 free_text가 영어면 영어
    res = recommend({**REQ, "free_text": "food after lunch"}, ROWS, call_llm=llm, travel_date=TUE)
    assert "route" in res["summary"], res["summary"]
    # 5) 에러 메시지도 같은 언어
    closed = [{**r, "opening_hours": {d: "closed" for d in DAYS}} for r in ROWS]
    try:
        recommend(REQ, closed, travel_date=TUE)
    except NoResultsError as e:
        assert "장소" in str(e), str(e)


def test_course_length_and_meals():
    """코스가 너무 길거나 먹는 곳만 연달아 나오지 않는지 (서영 님 피드백)"""
    from recommend import MAX_STOPS, MAX_MEALS, MAX_MEALS_FOOD_LOVER, MAX_MEALS_IN_ROW
    cat = {r["place_id"]: r["category"] for r in ROWS}
    for req, max_meals in [
        ({**REQ, "foods": [], "attractions": []}, MAX_MEALS),
        (REQ, MAX_MEALS_FOOD_LOVER),  # foods가 있으면 먹거리 위주
        ({**REQ, "budget": {"amount": 5000, "currency": "PHP"}}, MAX_MEALS_FOOD_LOVER),
    ]:
        res = recommend(req, ROWS, travel_date=TUE)
        check_shape(res, req["budget"]["amount"])
        meals = [cat[s["place_id"]] in ("restaurant", "market") for s in res["stops"]]
        assert len(res["stops"]) <= MAX_STOPS["normal"], len(res["stops"])
        assert sum(meals) <= max_meals, meals
        row = best = 0
        for m in meals:
            row = row + 1 if m else 0
            best = max(best, row)
        assert best <= MAX_MEALS_IN_ROW, meals


def _ends(s):
    h, m = map(int, s["arrival_time"].split(":"))
    return h * 60 + m + s["stay_minutes"]


def test_trip_times():
    """start_time / end_time / travel_date (docs/API.md)"""
    # 1) 폼 시간 안에서만 동선
    res = recommend({**REQ, "start_time": "13:00", "end_time": "17:00"}, ROWS, travel_date=TUE)
    check_shape(res, 1000)
    assert res["stops"][0]["arrival_time"] >= "13:00"
    assert max(_ends(s) for s in res["stops"]) <= 17 * 60
    # 2) 폼 시간이 free_text 시간보다 우선
    llm = lambda m: '{"budget":null,"start":"09:00","end":"12:00","tags":[],"areas":[],"mustVisit":[],"avoid":[],"preferenceText":"","language":"ko","isTripRequest":true}'
    res = recommend({**REQ, "start_time": "14:00", "end_time": "18:00", "free_text": "아침 9시부터 12시까지"},
                    ROWS, call_llm=llm, travel_date=TUE)
    assert res["stops"][0]["arrival_time"] >= "14:00"
    # 3) 폼에 시간이 없으면 free_text 시간 사용
    res = recommend({**REQ, "free_text": "아침 9시부터 12시까지"}, ROWS, call_llm=llm, travel_date=TUE)
    assert max(_ends(s) for s in res["stops"]) <= 12 * 60
    # 4) 시작만 있으면 종료는 16:00
    res = recommend({**REQ, "start_time": "12:00"}, ROWS, travel_date=TUE)
    assert res["stops"][0]["arrival_time"] >= "12:00" and max(_ends(s) for s in res["stops"]) <= 16 * 60
    # 5) 아무 시간도 없으면 10:00~16:00
    res = recommend(REQ, ROWS, travel_date=TUE)
    assert res["stops"][0]["arrival_time"] >= "10:00" and max(_ends(s) for s in res["stops"]) <= 16 * 60
    # 6) 요청 안의 travel_date 문자열도 사용 (월요일 휴무인 곳 제외)
    res = recommend({**REQ, "travel_date": "2026-11-09"}, ROWS)
    assert ROWS[1]["name"] not in [s["name"] for s in res["stops"]]


def test_course_length_follows_time():
    """짧은 일정은 적게, 긴 일정은 조금 더 (하지만 MAX_STOPS + 2까지만)"""
    from recommend import MAX_STOPS, MAX_STOPS_EXTRA
    short = recommend({**REQ, "start_time": "13:00", "end_time": "16:00"}, ROWS, travel_date=TUE)
    long = recommend({**REQ, "budget": {"amount": 5000, "currency": "PHP"},
                      "start_time": "08:00", "end_time": "21:00"}, ROWS, travel_date=TUE)
    assert len(short["stops"]) <= 3, len(short["stops"])
    assert len(long["stops"]) <= MAX_STOPS["normal"] + MAX_STOPS_EXTRA, len(long["stops"])
    assert len(long["stops"]) > len(short["stops"])


def test_transport_modes():
    """장소가 멀리 흩어져 있으면 지프니·택시를 타고, 요금이 예산에 들어가는지 (서영 님 피드백)"""
    from recommend import TRANSPORT
    far = [
        {**ROWS[0], "place_id": "FAR-1", "name": "Makati Museum", "lat": 14.5547, "lng": 121.0244, "district": "Makati"},
        {**ROWS[5], "place_id": "FAR-2", "name": "Cubao Food Hall", "lat": 14.6190, "lng": 121.0530, "district": "Cubao"},
        {**ROWS[6], "place_id": "FAR-3", "name": "Alabang Cafe", "lat": 14.4195, "lng": 121.0390, "district": "Alabang"},
    ]
    rows = ROWS + far
    # 마카티에서 출발: 인트라무로스까지 걸어가면 1시간 넘음 → 첫 구간이 탈것이어야 함
    req = {**REQ, "budget": {"amount": 2000, "currency": "PHP"}, "start_location": {"lat": 14.5547, "lng": 121.0244},
           "start_time": "09:00", "end_time": "18:00"}
    res = recommend(req, rows, travel_date=TUE)
    check_shape(res, 2000)
    stops = res["stops"]
    assert stops[0]["transport"] is not None  # 첫 장소도 출발지에서 오는 구간을 채움
    walk_cap = round(TRANSPORT["walkMaxKm"] / 4.5 * 60) + 1  # 도보 기준 거리 ≈ 13~14분
    for s in stops:
        t = s["transport"]
        assert t["mode"] in ("walk", "jeepney", "taxi"), t
        assert t["cost"] == s["cost_breakdown"]["transport"]
        if t["mode"] == "walk":
            assert t["cost"] == 0 and t["minutes"] <= walk_cap, t
        else:
            assert t["cost"] > 0, t
    assert res["total_cost"] == sum(s["est_cost"] + s["transport"]["cost"] for s in stops) + res["return_transport"]["cost"]
    legs = [s["transport"]["mode"] for s in stops] + [res["return_transport"]["mode"]]
    assert any(m != "walk" for m in legs), legs  # 멀리 흩어져 있으니 탈것이 있어야 함
    # 첫 도착 시간: 걸어서 가면 10시 넘어야 하지만 탈것이라 훨씬 빠름
    assert stops[0]["arrival_time"] < "10:00", stops[0]["arrival_time"]
    # 요약문의 걷는 시간은 도보 구간만
    walked = sum(s["transport"]["minutes"] for s in stops if s["transport"]["mode"] == "walk")
    assert "걷는 시간" in res["summary"] or "걷는 구간" in res["summary"], res["summary"]
    # 교통비까지 합쳐서 예산 안
    import re
    spend = int(re.search(r"중 (\d+)페소", res["summary"]).group(1))
    assert res["total_cost"] == spend <= 2000  # 화면 총액과 설명 문장의 금액이 같음
    # 걷기 싫어 → 도보 구간이 더 짧아짐
    llm = lambda m: '{"budget":null,"start":null,"end":null,"tags":[],"areas":[],"mustVisit":[],"avoid":[],"preferenceText":"","language":"ko","isTripRequest":true,"walking":"minimal"}'
    lazy = recommend({**req, "free_text": "많이 걷는 건 싫어"}, rows, call_llm=llm, travel_date=TUE)
    for s in lazy["stops"]:
        if s["transport"]["mode"] == "walk":
            assert s["transport"]["minutes"] <= 12, s["transport"]


def _explain_llm(answer):
    """free_text 해석 요청에는 빈 조건, 설명 요청에는 answer(함수)를 돌려주는 가짜 LLM"""
    import json as _json
    def llm(messages):
        if "short texts a travel app" in messages[0]["content"]:
            ids = [st["id"] for st in _json.loads(messages[1]["content"])["stops"]]
            return answer(ids)
        return '{"isTripRequest": true, "language": "ko"}'
    return llm


def test_llm_explanations():
    """LLM이 쓴 이유·소개가 들어가고, 숫자·영어·형식 오류는 템플릿으로 대체되는지"""
    import json as _json
    base = recommend(REQ, ROWS, travel_date=TUE)  # LLM 없이 = 템플릿
    # 1) 정상 답변 → 전부 LLM 문장
    good = lambda ids: _json.dumps({"intro": "역사와 길거리 음식을 함께 즐기는 인트라무로스 코스예요.",
                                    "reasons": {i: "현지 분위기를 느끼기 좋은 곳이에요." for i in ids}},
                                   ensure_ascii=False)
    res = recommend(REQ, ROWS, travel_date=TUE, call_llm=_explain_llm(good))
    check_shape(res, 1000)
    assert res["summary"].startswith("역사와 길거리 음식"), res["summary"]
    assert "페소" in res["summary"]  # 숫자 부분은 코드가 그대로 붙임
    assert all(s["reason"].startswith("현지 분위기") for s in res["stops"])
    assert [s["place_id"] for s in res["stops"]] == [s["place_id"] for s in base["stops"]]  # 동선은 그대로
    # 2) 숫자·영어·너무 긴 문장·빠진 장소 → 그 장소만 템플릿
    BAD = ["입장료 75페소라 저렴해요", "Great place to visit!", "아" * 200]
    def mixed(ids):
        reasons = {i: (BAD[k] if k < len(BAD) else "골목 산책하기 좋은 곳이에요") for k, i in enumerate(ids[:-1])}
        return _json.dumps({"intro": "10:00에 출발하는 코스예요", "reasons": reasons}, ensure_ascii=False)
    res = recommend(REQ, ROWS, travel_date=TUE, call_llm=_explain_llm(mixed))
    tmpl = {s["place_id"]: s["reason"] for s in base["stops"]}
    stops = res["stops"]
    assert len(stops) > len(BAD) + 1
    for k, s in enumerate(stops):
        if len(BAD) <= k < len(stops) - 1:
            assert s["reason"] == "골목 산책하기 좋은 곳이에요"
        else:
            assert s["reason"] == tmpl[s["place_id"]], (k, s["reason"])
    # 실제 데모에서 나온 어색한 문장들은 걸러지고, 자연스러운 해요체는 통과
    from core.explain import _clean
    for t in ["이 велич스러운 대성당에 가봐요", "여행자는 역사를 좋아해서 좋아요", "역사적인 경험을 제공합니다.",
              "시오파오를 맛볼 수 있을 거야", "새벽 5시에 열어요"]:
        assert _clean(t, "ko", 90) is None, t
    for t in ["역사를 좋아하신다면 성당 내부를 꼭 둘러보세요.", "Bahay Tsinoy에서 중국계 필리핀 역사를 볼 수 있어요!"]:
        assert _clean(t, "ko", 90) == t, t
    assert res["summary"] == base["summary"]  # 시간이 들어간 소개는 버림
    # 3) JSON이 아니거나 LLM이 죽으면 전부 템플릿, 추천은 정상
    for answer in (lambda ids: "Sorry, I can't help.", lambda ids: (_ for _ in ()).throw(TimeoutError("down"))):
        res = recommend(REQ, ROWS, travel_date=TUE, call_llm=_explain_llm(answer))
        assert [s["reason"] for s in res["stops"]] == [s["reason"] for s in base["stops"]]
        assert res["summary"] == base["summary"]
    # 4) explain=False면 LLM을 부르지 않음
    calls = []
    res = recommend(REQ, ROWS, travel_date=TUE, call_llm=lambda m: calls.append(1) or "{}", explain=False)
    assert not calls
    # 5) 영어 요청이면 영어 문장만 통과
    en = lambda ids: _json.dumps({"intro": "A heritage walk with local bites.",
                                  "reasons": {i: "A local favorite with plenty of character." for i in ids}})
    res = recommend(REQ, ROWS, travel_date=TUE, lang="en", call_llm=_explain_llm(en))
    assert res["summary"].startswith("A heritage walk") and all("local favorite" in s["reason"] for s in res["stops"])


def test_prefers_nearby():
    """기준점(선택한 지역 중심)에서 멀리 떨어진 곳은 비슷한 점수면 고르지 않음 (6번)"""
    # 인트라무로스 장소들과 똑같은 장소를 퀘존시티(약 8km)에 하나씩 더 만들어 둠 → 가까운 쪽을 골라야 함
    far = [{**r, "place_id": "QC-" + r["place_id"], "name": "QC " + r["name"], "district": "Quezon City",
            "lat": r["lat"] + 0.06, "lng": r["lng"] + 0.06} for r in ROWS]
    req = {**REQ, "region": "Intramuros", "budget": {"amount": 3000, "currency": "PHP"}}
    res = recommend(req, ROWS + far, travel_date=TUE)
    assert not any(s["place_id"].startswith("QC-") for s in res["stops"]), [s["name"] for s in res["stops"]]
    # 반대로 지역을 Quezon City로 고르면 그쪽 장소 위주
    res = recommend({**req, "region": "Quezon City"}, ROWS + far, travel_date=TUE)
    assert sum(s["place_id"].startswith("QC-") for s in res["stops"]) >= len(res["stops"]) - 1


def test_attraction_words():
    """관광지 칸: 장소 이름이면 꼭 가기, 일반 단어면 취향 (임베딩 없어도 태그·설명에서 찾아 가산점)"""
    q = recommend({**REQ, "attractions": ["Fort Santiago"]}, ROWS, travel_date=TUE)["_debug"]["query"]
    assert q["mustVisitNames"] == ["Fort Santiago"]
    q = recommend({**REQ, "attractions": ["church"]}, ROWS, travel_date=TUE)["_debug"]["query"]
    assert q["mustVisitNames"] == []  # 성당 전부를 꼭 가기로 만들지 않음
    # 3시간짜리 짧은 일정에서 "halo-halo"를 고르면 할로할로 노점이 들어감
    req = {**REQ, "foods": ["halo-halo"], "attractions": [], "start_time": "13:00", "end_time": "16:00"}
    names = [s["name"] for s in recommend(req, ROWS, travel_date=TUE)["stops"]]
    assert any("할로할로" in n for n in names), names


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
