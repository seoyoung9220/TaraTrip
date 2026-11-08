"""
TaraTrip AI 모듈 ↔ 백엔드 연결부: docs/API.md 형식 그대로 입출력

  from recommend import recommend, BudgetTooLowError, NoResultsError

  result = recommend(request_body, place_rows, call_llm=..., embed=...)
    request_body : POST /api/recommendations 요청 JSON (dict)
    place_rows   : DB places 테이블 행들 (dict 리스트, BE/db/schema.sql 컬럼 그대로)
    반환          : 명세의 200 응답 JSON (dict)

  동선이 안 나오면 예외를 던짐 → 백엔드가 422 에러로 바꿔주면 됨
    BudgetTooLowError  → 422 BUDGET_TOO_LOW
    NoResultsError     → 422 NO_RESULTS

명세에 없어서 여기서 정한 것 (팀 합의 필요, README 참고)
  - 폼 값(budget 등)이 free_text보다 우선, free_text는 빈 곳만 채움
  - 출발 시각이 요청에 없음 → free_text에 시간이 있으면 쓰고, 없으면 10:00~16:00
  - 첫 장소의 transport는 명세대로 null, 이동은 지금은 전부 도보(walk, 0페소)
"""
import uuid
from datetime import date, datetime
from zoneinfo import ZoneInfo

from parse_query import parse_raw, merge_raw, validate_query, build_plan_input, matches
from personalize import personal_bonus
from plan_route import plan_route
from utils import js_round, to_min


class BudgetTooLowError(Exception):
    """422 BUDGET_TOO_LOW: 예산 안에 들어가는 동선이 없음"""


class NoResultsError(Exception):
    """422 NO_RESULTS: 조건에 맞는 장소가 없음"""


DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

# DB 카테고리 → 내부 취향 태그 (parse_query.ALLOWED_TAGS)
CATEGORY_TO_TAG = {"restaurant": "food", "market": "food", "shop": "shopping", "attraction": "sightseeing"}
# DB tags 안에 이런 단어가 있으면 내부 태그를 더 정확하게 (카페는 food보다 cafe, 역사·성당은 culture)
TAG_OVERRIDES = [
    ("cafe", ["cafe", "coffee", "dessert", "bakery"]),
    ("culture", ["history", "historic", "church", "museum", "heritage", "cathedral"]),
]
DEFAULT_STAY = {"restaurant": 45, "market": 40, "shop": 30, "attraction": 45}
DEFAULT_HOURS = ("09:00", "18:00")  # 영업시간이 비어 있는 장소에 쓰는 임시 값
DEFAULT_SCORE = 5                   # DB에 local_score가 없으면 모두 같은 기본 점수


# ─────────────────────────────────────────────
# 1) DB 행 → 동선 알고리즘이 쓰는 장소 형식
# ─────────────────────────────────────────────
def _hours_for(row, weekday):
    """그날 영업시간 → (opens, closes) / 휴무면 None"""
    hours = row.get("opening_hours") or {}
    value = (hours.get(weekday) or "").strip().lower()
    if not value:
        return DEFAULT_HOURS
    if value == "closed":
        return None
    try:
        opens, closes = [v.strip() for v in value.split("-")]
        to_min(opens), to_min(closes)
    except (ValueError, IndexError):
        return DEFAULT_HOURS
    if to_min(closes) <= to_min(opens):  # 자정 넘어서 닫는 곳 (18:00-02:00) → 당일 23:59까지로
        closes = "23:59"
    return opens, closes


def _internal_tag(row):
    words = " ".join(row.get("tags") or []).lower() + " " + (row.get("name") or "").lower()
    for tag, keys in TAG_OVERRIDES:
        if any(k in words for k in keys):
            return tag
    return CATEGORY_TO_TAG.get(row.get("category"), "sightseeing")


def _cost(row):
    """1인 예상 비용 → (food, entry). 식당·시장·가게는 price_min~max의 가운데 값"""
    lo, hi = row.get("price_min"), row.get("price_max")
    if lo is None and hi is None:
        spend = 0
    else:
        lo = hi if lo is None else lo
        hi = lo if hi is None else hi
        spend = js_round((lo + hi) / 2)
    return spend, row.get("entry_fee") or 0


def to_internal_place(row, weekday):
    hours = _hours_for(row, weekday)
    if hours is None:
        return None
    food, entry = _cost(row)
    desc = row.get("description") or ""
    if row.get("tags"):
        desc = f"{desc} Tags: {', '.join(row['tags'])}.".strip()
    return {
        "name": row["name"],
        "area": row.get("district") or "",
        "category": _internal_tag(row),
        "lat": row["lat"], "lng": row["lng"],
        "opens": hours[0], "closes": hours[1],
        "stayMin": row.get("avg_stay_minutes") or DEFAULT_STAY.get(row.get("category"), 40),
        "costPhp": food + entry,
        "smallBiz": bool(row.get("is_small_business")),
        "score": row.get("local_score") or DEFAULT_SCORE,
        "description": desc,
        # 응답 만들 때 다시 쓰는 원본 값
        "_row": row, "_food": food, "_entry": entry,
    }


# ─────────────────────────────────────────────
# 2) 요청 JSON → 내부 조건
# ─────────────────────────────────────────────
def _form_raw(req, places):
    """폼 입력만으로 만든 조건 (LLM 결과와 같은 모양)"""
    foods = [f for f in req.get("foods") or [] if isinstance(f, str) and f.strip()]
    attractions = [a for a in req.get("attractions") or [] if isinstance(a, str) and a.strip()]
    must = [a for a in attractions if any(matches(p["name"], a) for p in places)]
    liked = [a for a in attractions if a not in must]  # 장소 이름이 아니면 취향으로

    pref = []
    if foods:
        pref.append(f"Wants to eat {', '.join(foods)}.")
    if liked:
        pref.append(f"Interested in {', '.join(liked)}.")
    tags = (["food"] if foods else []) + (["sightseeing"] if liked else [])

    areas = []
    region = (req.get("region") or "").strip()
    if region and any(p["area"].lower() == region.lower() for p in places):
        areas = [next(p["area"] for p in places if p["area"].lower() == region.lower())]

    budget = req.get("budget") or {}
    return {
        "budget": {"amount": budget.get("amount"), "currency": budget.get("currency") or "PHP"},
        "start": None, "end": None,
        "tags": tags, "areas": areas, "mustVisit": must, "avoid": [],
        "preferenceText": " ".join(pref),
        "language": "en", "isTripRequest": True,
        "budgetLevel": None, "budgetPer": "person", "groupSize": None, "pace": None, "walking": None,
    }


def build_query(req, places, call_llm):
    """폼 + free_text → 검증된 조건. 폼 값이 우선이고 free_text는 빈 곳만 채움"""
    form = _form_raw(req, places)
    notes = []
    raw = form
    text = (req.get("free_text") or "").strip()
    if text and call_llm:
        try:
            parsed = parse_raw(text, call_llm)
            if parsed.get("isTripRequest") is False:
                notes.append("free_text는 여행 요청이 아니라서 무시")
            else:
                raw = merge_raw(parsed, form)       # parsed를 바탕으로 폼에 있는 값만 덮어씀
                raw["budget"] = form["budget"]      # 예산은 항상 폼 값
                for k in ("tags", "mustVisit", "areas"):  # 목록은 둘을 합침
                    raw[k] = list(dict.fromkeys((parsed.get(k) or []) + form[k]))
                raw["language"] = parsed.get("language") or "en"
                if parsed.get("preferenceText") and form["preferenceText"]:
                    raw["preferenceText"] = f"{form['preferenceText']} {parsed['preferenceText']}"
        except Exception as e:  # LLM이 죽어도 폼 값만으로 추천은 계속
            notes.append(f"free_text 해석 실패, 폼 값만 사용: {e}")
    v = validate_query(raw)
    return v["query"], v["assumptions"] + notes


# ─────────────────────────────────────────────
# 3) 설명 문장 (지금은 템플릿, 나중에 LLM으로 바꿀 수 있음)
# ─────────────────────────────────────────────
def _say(lang, ko, en):
    return ko if lang == "ko" else en


def _reason(p, query, personal, lang):
    parts = []
    fit = personal.get(p["name"]) if personal else None
    if any(matches(p["name"], w) for w in query["mustVisit"]):
        parts.append(_say(lang, "꼭 가고 싶다고 하신 곳이에요", "You asked to visit this place"))
    elif fit and fit["fit"] >= 0.7:
        parts.append(_say(lang, "취향과 잘 맞아요", "A great match for your tastes"))
    elif p["category"] in query["tags"]:
        parts.append(_say(lang, "원하신 종류의 장소예요", "Matches what you're looking for"))
    if p["smallBiz"]:
        parts.append(_say(lang, "현지 소상공인이 운영하는 곳이에요", "Locally owned small business"))
    if p["costPhp"] == 0:
        parts.append(_say(lang, "무료예요", "Free to visit"))
    elif p["costPhp"] <= query["budgetPhp"] * 0.2:
        parts.append(_say(lang, "예산 부담이 적어요", "Easy on your budget"))
    if not parts:
        parts.append(_say(lang, "동선 중간에 들르기 좋은 위치예요", "Conveniently on your route"))
    return _say(lang, " · ".join(parts), ". ".join(parts) + ".")


def _summary(stops, query, total_cost, walk_min, lang):
    n, small = len(stops), sum(1 for s in stops if s["_smallBiz"])
    areas = list(dict.fromkeys(s["_area"] for s in stops if s["_area"]))
    where = ", ".join(areas)
    if lang == "ko":
        txt = f"{query['start']}부터 {n}곳을 도는 코스예요"
        txt += f" ({where})" if where else ""
        txt += f". 예산 {query['budgetPhp']}페소 중 {total_cost}페소를 쓰고, 총 {walk_min}분 정도 걸어요."
        if small:
            txt += f" 현지 소상공인 가게 {small}곳이 포함돼 있어요."
        return txt
    article = "An" if str(n)[0] == "8" or n in (11, 18) else "A"
    txt = f"{article} {n}-stop route starting at {query['start']}"
    txt += f" around {where}" if where else ""
    txt += f". It uses ₱{total_cost} of your ₱{query['budgetPhp']} budget with about {walk_min} minutes of walking."
    if small:
        txt += f" Includes {small} locally owned small business{'es' if small > 1 else ''}."
    return txt


# ─────────────────────────────────────────────
# 4) 입구 함수
# ─────────────────────────────────────────────
def recommend(req, place_rows, *, call_llm=None, embed=None, travel_date=None):
    """
    req         : POST /api/recommendations 요청 JSON
    place_rows  : DB places 행 리스트
    call_llm    : free_text 해석용 (없으면 폼 값만 사용)
    embed       : 취향 맞춤 점수용 임베딩 (없으면 카테고리 태그 방식)
    travel_date : 여행 날짜 (datetime.date). 없으면 마닐라 기준 오늘 → 그 요일 영업시간 사용
    """
    day = travel_date or datetime.now(ZoneInfo("Asia/Manila")).date()
    weekday = DAYS[day.weekday()]

    places = [p for p in (to_internal_place(r, weekday) for r in place_rows) if p]
    if not places:
        raise NoResultsError("No places are open on that day.")

    query, notes = build_query(req, places, call_llm)
    lang = query["language"]
    sl = req["start_location"]
    start_location = [sl["lat"], sl["lng"]]

    personal = None
    if embed and query["preferenceText"]:
        try:
            personal = personal_bonus(query["preferenceText"], places, embed)
        except Exception as e:  # 임베딩이 실패하면 태그 방식으로
            notes.append(f"취향 점수 실패, 태그 방식 사용: {e}")

    b = build_plan_input(query, places, start_location, personal)
    plan_input = b["planInput"]
    route = plan_route(plan_input)

    if not route["stops"]:
        candidates = plan_input["places"]
        if not candidates:
            raise NoResultsError(_say(lang, "조건에 맞는 장소가 없어요.", "No places match your request."))
        cheapest = min(p["costPhp"] for p in candidates)
        if cheapest > query["budgetPhp"]:
            raise BudgetTooLowError(_say(lang,
                f"가장 저렴한 곳도 {cheapest}페소예요. 예산을 늘려보세요.",
                f"The cheapest place costs ₱{cheapest}. Try a higher budget."))
        raise NoResultsError(_say(lang,
            "이 조건으로 갈 수 있는 곳을 찾지 못했어요. 시간이나 조건을 바꿔보세요.",
            "No route fits these conditions. Try a different time or fewer restrictions."))

    by_name = {p["name"]: p for p in plan_input["places"]}
    stops = []
    for i, s in enumerate(route["stops"]):
        p = by_name[s["name"]]
        row = p["_row"]
        transport = None if i == 0 else {"mode": "walk", "minutes": s["walkMin"], "cost": 0}
        stops.append({
            "order": i + 1,
            "place_id": row["place_id"],
            "name": row["name"],
            "category": row["category"],
            "lat": row["lat"],
            "lng": row["lng"],
            "arrival_time": s["arrive"],
            "est_cost": s["cost"],
            "stay_minutes": s["stay"],
            "transport": transport,
            "cost_breakdown": {"food": p["_food"], "entry": p["_entry"], "transport": 0},
            "reason": _reason(p, query, personal, lang),
            "_smallBiz": p["smallBiz"], "_area": p["area"],
        })

    total_cost = sum(s["est_cost"] + s["cost_breakdown"]["transport"] for s in stops)
    last = stops[-1]
    total_minutes = to_min(last["arrival_time"]) + last["stay_minutes"] - to_min(stops[0]["arrival_time"])
    summary = _summary(stops, query, total_cost, route["totalWalkMin"], lang)
    for s in stops:
        s.pop("_smallBiz")
        s.pop("_area")

    return {
        "route_id": uuid.uuid4().hex[:12],
        "total_cost": total_cost,
        "total_minutes": total_minutes,
        "currency": "PHP",
        "summary": summary,
        "stops": stops,
        # 명세에는 없지만 디버깅에 쓰는 값. 백엔드는 응답에서 빼면 됨 (response_model이 자동으로 걸러줌)
        "_debug": {"query": query, "assumptions": notes + b["notes"]},
    }
