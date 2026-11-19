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
  - 출발·종료 시각: start_time/end_time > free_text의 시간 > 기본 10:00~16:00 (docs/API.md)
  - 여행 날짜: travel_date 인자 > 요청의 travel_date > 마닐라 기준 오늘 → 그 요일 영업시간 사용
  - 이동수단: 1km 이하는 도보, 8km 미만은 지프니, 그 이상은 택시 (걷는 게 더 빠르면 도보). 요금은 TRANSPORT 참고
    출발지→첫 장소는 첫 장소의 transport, 마지막 장소→출발지는 return_transport로 응답에 넣고
    total_cost·예산에 두 구간 교통비 포함 (docs/API.md)
  - summary·reason 언어: recommend(lang=...)로 넘긴 값 > free_text의 언어 > 기본 "ko" (앱 화면이 한국어)
  - reason·summary 문장: LLM이 장소별 이유와 코스 소개를 쓰고(core/explain.py), 숫자는 코드가 붙임
    LLM이 없거나 실패하거나 이상한 문장(숫자 포함, 언어 틀림, 너무 김)을 쓰면 그 부분만 템플릿 문장
  - 코스 길이·식사: 6시간 기준 최대 5곳(여유 4, 알차게 6), 시간이 길거나 짧으면 비례해서 조정
    먹는 곳 최대 2곳(음식 선택 시 3곳, 8시간 이상이면 +1), 먹는 곳 3연속 금지
"""
import logging
import uuid
from datetime import date, datetime
from zoneinfo import ZoneInfo

from core.parse_query import parse_raw, merge_raw, validate_query, build_plan_input, matches, norm
from core.explain import explain as explain_route
from core.personalize import personal_bonus
from core.plan_route import DEFAULTS as ROUTE_DEFAULTS, plan_route, road_km
from core.utils import js_round, to_min

log = logging.getLogger(__name__)


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
DEFAULT_LANG = "ko"                 # 설명 문장 기본 언어 (앱 화면이 한국어). 지금 문장은 "ko"와 "en"만 있음

# 코스 길이·식사 제한 (UST 피드백 보고 조정)
DEFAULT_START, DEFAULT_END = "10:00", "16:00"        # 시간 입력이 없을 때 (docs/API.md 기본값)
MAX_STOPS = {"relaxed": 4, "normal": 5, "packed": 6}  # 페이스별 최대 장소 수 (BASE_HOURS 기준)
BASE_HOURS = 6                                        # MAX_STOPS가 기준으로 삼는 여행 시간
MAX_STOPS_EXTRA = 2                                   # 시간이 아무리 길어도 MAX_STOPS보다 이만큼까지만 더
LONG_DAY_HOURS = 8                                    # 이 시간 이상이면 먹는 곳 1곳 더 (점심 + 저녁)

# 이동수단·요금 (메트로 마닐라, 2026년 기준 추정값. 발표 전에 최신 요금표로 한 번 확인하세요)
#   지프니: 2026년 9월 인상 후 전통 지프니 최저요금 14페소(첫 4km). km당 추가요금은 추정
#   택시: 일반 택시 기본요금·km·분당 요금은 추정 (공항 택시는 더 비쌈)
#   속도·대기시간은 마닐라 교통체증을 감안한 대략적인 값
TRANSPORT = {
    "walkMaxKm": 1.0,                 # 이 거리(골목 보정 km) 이하는 걸어감 (약 13분)
    "jeepney": {"speedKmh": 12, "waitMin": 10, "baseFare": 14, "baseKm": 4, "perKm": 2},
    "taxiMinKm": 8,                   # 이 거리 이상은 택시
    "taxi": {"speedKmh": 18, "waitMin": 5, "flagDown": 50, "perKm": 15, "perMin": 2},
}
WALK_MAX_KM_LAZY = 0.5                # "걷기 싫어"면 이 거리까지만 걸음

# 거리 vs 점수 저울 (eval/run_eval.py로 비교해서 정함)
#   PENALTY_PER_POINT: 장소 점수 1점을 이동 몇 분과 같게 볼지. 크면 좋은 곳을 찾아 멀리 가고, 작으면 가까운 곳 위주
#   기준점(선택한 지역의 중심, 없으면 출발지)에서 FREE_RADIUS_KM 넘게 떨어진 곳은 1km마다 FAR_PENALTY_PER_KM점 감점
PENALTY_PER_POINT = 20
FREE_RADIUS_KM = 2.0
FAR_PENALTY_PER_KM = 2.0
# 임베딩이 없을 때(키 없음·실패) 고른 음식·관광지 단어가 장소 태그·설명에 있으면 주는 가산점
KEYWORD_BONUS = 8
# 같은 상황에서 소상공인 가산점: 취향에 맞으면 크게, 아니면 작게 (취향 우선 원칙, 임베딩 모드와 같은 생각)
SMALL_BIZ_MATCH, SMALL_BIZ_OTHER = 5, 2
MODE_KO = {"walk": "도보", "jeepney": "지프니", "tricycle": "트라이시클", "taxi": "택시", "other": "기타"}
MEAL_CATEGORIES = {"restaurant", "market"}           # "먹는 곳"으로 세는 DB 카테고리 (카페·빵집도 restaurant)
MAX_MEALS = 2                                         # 먹는 곳 최대 개수
MAX_MEALS_FOOD_LOVER = 3                              # 음식을 고르거나 먹거리 위주로 요청했을 때
MAX_MEALS_IN_ROW = 2                                  # 먹는 곳 최대 연속 (밥 → 카페까지 OK)


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
        "isMeal": row.get("category") in MEAL_CATEGORIES,
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
    must = [a for a in attractions if _is_place_name(a, places)]
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
        "start": req.get("start_time"), "end": req.get("end_time"),
        "tags": tags, "areas": areas, "mustVisit": must, "avoid": [],
        "preferenceText": " ".join(pref),
        "language": DEFAULT_LANG, "isTripRequest": True,
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
                raw["language"] = parsed.get("language") or DEFAULT_LANG
                if parsed.get("preferenceText") and form["preferenceText"]:
                    raw["preferenceText"] = f"{form['preferenceText']} {parsed['preferenceText']}"
        except Exception as e:  # LLM이 죽어도 폼 값만으로 추천은 계속
            notes.append(f"free_text 해석 실패, 폼 값만 사용: {e}")
    if not raw.get("start"):
        raw["start"] = DEFAULT_START
    if not raw.get("end"):
        raw["end"] = DEFAULT_END  # 시작이 16:00 이후면 validate_query가 시작 + 4시간으로 고쳐줌
    v = validate_query(raw)
    query = v["query"]
    # region은 DB의 district 이름 그대로 비교 (parse_query의 지역 목록에 없는 동네도 OK)
    query["areas"] = list(dict.fromkeys(query["areas"] + form["areas"]))
    return query, v["assumptions"] + notes


def _is_place_name(word, places):
    """폼의 관광지 칸 값이 진짜 장소 이름인지 ("Fort Santiago" → 예, "museum" → 아니고 취향)"""
    w = norm(word)
    return any(matches(p["name"], word) and len(w) > 0.6 * len(norm(p["name"])) for p in places)


def _keyword_bonus(plan_input, req):
    """임베딩 없이도 취향 반영: 고른 단어가 장소의 이름·태그·설명·대표 메뉴에 있으면 가산점 (한 번만)
    소상공인 가산점도 여기서 취향에 맞는 만큼 줌 (plan_route의 고정 가산점은 끔)"""
    terms = [t.lower().strip() for t in (req.get("foods") or []) + (req.get("attractions") or []) if t and t.strip()]
    if not terms:
        return  # 고른 게 없으면 plan_route의 기본 소상공인 가산점 그대로
    plan_input["options"]["smallBizBonus"] = 0
    for p in plan_input["places"]:
        row = p["_row"]
        text = " ".join([row["name"], row.get("description") or "", " ".join(row.get("tags") or []),
                         row.get("signature_menu") or ""]).lower()
        hit = any(t in text for t in terms)
        if hit:
            p["score"] += KEYWORD_BONUS
        if p["smallBiz"]:
            p["score"] += SMALL_BIZ_MATCH if hit else SMALL_BIZ_OTHER


def _anchor(query, places, start_location):
    """거리 기준점: 선택한 지역(region)에 장소가 있으면 그 장소들의 중심, 없으면 출발지"""
    inside = [p for p in places if p["area"] in query["areas"]]
    if inside:
        return [sum(p["lat"] for p in inside) / len(inside), sum(p["lng"] for p in inside) / len(inside)]
    return start_location


def _penalize_far(plan_input, query, start_location):
    """기준점에서 멀리 떨어진 장소는 점수를 깎아서 가까운 곳 위주로 (동네 이름이 달라도 가까우면 괜찮음)
    모든 가산점(취향·소상공인·꼭 가기)을 더한 다음 마지막에 적용해야 함"""
    anchor = _anchor(query, plan_input["places"], start_location)
    opt = {**ROUTE_DEFAULTS, "detourFactor": 1}
    for p in plan_input["places"]:
        km = road_km(anchor, [p["lat"], p["lng"]], opt)
        p["score"] = max(0, p["score"] - FAR_PENALTY_PER_KM * max(0, km - FREE_RADIUS_KM))  # 너무 멀면 0점 = 안 감


def _limits(query, req):
    """여행 시간에 맞춘 장소 수·식사 제한"""
    hours = (to_min(query["end"]) - to_min(query["start"])) / 60
    base = MAX_STOPS.get(query["pace"], MAX_STOPS["normal"])
    max_stops = min(base + MAX_STOPS_EXTRA, max(1, js_round(base * hours / BASE_HOURS)))
    food_lover = bool(req.get("foods")) or any(t in ("food", "cafe") for t in query["tags"])
    max_meals = (MAX_MEALS_FOOD_LOVER if food_lover else MAX_MEALS) + (1 if hours >= LONG_DAY_HOURS else 0)
    return {"maxStops": max_stops, "maxMeals": max_meals, "maxMealsInRow": MAX_MEALS_IN_ROW}


# ─────────────────────────────────────────────
# 3) 설명 문장 (지금은 템플릿, 나중에 LLM으로 바꿀 수 있음)
# ─────────────────────────────────────────────
def _say(lang, ko, en):
    return ko if lang == "ko" else en


def _reason(p, query, personal, lang):
    parts = []
    fit = personal.get(p["name"]) if personal else None
    if p["name"] in query.get("mustVisitNames", []):
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


def _summary(stops, query, route, lang):
    """전체 설명. 돈은 출발지 왕복 교통비까지 포함한 실제 지출, 걷는 시간은 도보 구간만"""
    n, small = len(stops), sum(1 for s in stops if s["_smallBiz"])
    areas = list(dict.fromkeys(s["_area"] for s in stops if s["_area"]))
    where = ", ".join(areas)
    legs = [s["mode"] for s in route["stops"]] + [route["returnMode"]]
    rides = {m: legs.count(m) for m in ("jeepney", "tricycle", "taxi") if legs.count(m)}
    spend, walk, fare = route["totalCost"], route["totalWalkMin"], route["totalFare"]
    if lang == "ko":
        txt = f"{query['start']}에 출발해서 {n}곳을 도는 코스예요"
        txt += f" ({where})" if where else ""
        txt += f". 예산 {query['budgetPhp']}페소 중 {spend}페소를 써요"
        txt += f"(교통비 포함)." if fare else "."
        txt += f" 걷는 시간은 총 {walk}분이에요." if walk else " 걷는 구간은 거의 없어요."
        if rides:
            txt += " " + "·".join(f"{MODE_KO[m]} {c}번" for m, c in rides.items()) + f"을 타요(교통비 {fare}페소)."
        if small:
            txt += f" 현지 소상공인 가게 {small}곳이 포함돼 있어요."
        return txt
    article = "An" if str(n)[0] == "8" or n in (11, 18) else "A"
    txt = f"{article} {n}-stop route leaving at {query['start']}"
    txt += f" around {where}" if where else ""
    txt += f". It uses ₱{spend} of your ₱{query['budgetPhp']} budget"
    txt += " (fares included)." if fare else "."
    txt += f" About {walk} minutes of walking." if walk else " Almost no walking."
    if rides:
        txt += " Rides: " + ", ".join(f"{m} ×{c}" for m, c in rides.items()) + f" (₱{fare} in fares)."
    if small:
        txt += f" Includes {small} locally owned small business{'es' if small > 1 else ''}."
    return txt


# ─────────────────────────────────────────────
# 4) 입구 함수
# ─────────────────────────────────────────────
def recommend(req, place_rows, *, call_llm=None, embed=None, travel_date=None, lang=None,
              explain_llm=None, explain=True):
    """
    req         : POST /api/recommendations 요청 JSON
    place_rows  : DB places 행 리스트
    call_llm    : free_text 해석용 (없으면 폼 값만 사용)
    embed       : 취향 맞춤 점수용 임베딩 (없으면 카테고리 태그 방식)
    travel_date : 여행 날짜 (datetime.date). 없으면 요청의 travel_date("YYYY-MM-DD"), 그것도 없으면 마닐라 기준 오늘
    lang        : summary·reason·에러 메시지 언어 ("ko" 또는 "en"). 넘기면 free_text 언어보다 우선
                  없으면 free_text의 언어, 그것도 없으면 DEFAULT_LANG("ko")
    explain_llm : 추천 이유를 쓸 LLM (없으면 call_llm). 큰 모델(core.explain.EXPLAIN_MODEL)을 추천
    explain     : False면 LLM 설명 없이 템플릿 문장만 (빠름)
    """
    if travel_date is None and req.get("travel_date"):
        travel_date = date.fromisoformat(str(req["travel_date"]))
    day = travel_date or datetime.now(ZoneInfo("Asia/Manila")).date()
    weekday = DAYS[day.weekday()]

    places = [p for p in (to_internal_place(r, weekday) for r in place_rows) if p]
    if not places:
        raise NoResultsError(_say(lang or DEFAULT_LANG,
            "그날 문을 연 장소가 없어요.", "No places are open on that day."))

    query, notes = build_query(req, places, call_llm)
    lang = (lang or query["language"] or DEFAULT_LANG).lower()
    sl = req["start_location"]
    start_location = [sl["lat"], sl["lng"]]
    el = req.get("end_location")  # 없으면 출발지로 돌아오는 코스
    end_location = [el["lat"], el["lng"]] if el else None

    personal = None
    if embed and query["preferenceText"]:
        try:
            personal = personal_bonus(query["preferenceText"], places, embed)
        except Exception as e:  # 임베딩이 실패하면 태그 방식으로
            notes.append(f"취향 점수 실패, 태그 방식 사용: {e}")

    b = build_plan_input(query, places, start_location, personal, end_location)
    plan_input = b["planInput"]
    query["mustVisitNames"] = b["mustVisitNames"]
    plan_input["options"].update(_limits(query, req))
    plan_input["options"]["transport"] = {
        **TRANSPORT,
        "walkMaxKm": WALK_MAX_KM_LAZY if query["walking"] == "minimal" else TRANSPORT["walkMaxKm"],
    }
    plan_input["options"]["penaltyPerPoint"] = PENALTY_PER_POINT
    if personal is None:
        _keyword_bonus(plan_input, req)
    # plan_route가 따로 더하던 소상공인 가산점도 점수에 미리 넣어서, 거리 감점이 모든 가산점 뒤에 오게 함
    biz = plan_input["options"].get("smallBizBonus", ROUTE_DEFAULTS["smallBizBonus"])
    for p in plan_input["places"]:
        if p["smallBiz"]:
            p["score"] += biz
    plan_input["options"]["smallBizBonus"] = 0
    _penalize_far(plan_input, query, start_location)
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
        transport = {"mode": s["mode"], "minutes": s["walkMin"], "cost": s["fare"]}
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
            "cost_breakdown": {"food": p["_food"], "entry": p["_entry"], "transport": transport["cost"]},
            "reason": _reason(p, query, personal, lang),
            "_smallBiz": p["smallBiz"], "_area": p["area"], "_row": row,
        })

    # LLM이 이유·소개 문장 쓰기 (실패한 부분은 위의 템플릿 그대로)
    explained = {"intro": None, "reasons": {}, "error": "off"}
    llm = explain_llm or call_llm
    if explain and llm:
        traveler = {
            "preferences": query["preferenceText"], "foods": req.get("foods") or [],
            "attractions": req.get("attractions") or [], "must_visit": query["mustVisit"],
            "avoid": query["avoid"], "free_text": req.get("free_text"),
            "pace": query["pace"], "walking": query["walking"],
        }
        explained = explain_route([{"row": s["_row"]} for s in stops], traveler, lang, llm)
        if explained["error"]:
            # 소개·이유가 템플릿으로 나간 이유를 서버 로그에서 볼 수 있게
            log.warning("explain fallback (intro=%s, reasons=%d/%d): %s", bool(explained["intro"]),
                        len(explained["reasons"]), len(stops), explained["error"])
        for s in stops:
            s["reason"] = explained["reasons"].get(s["place_id"], s["reason"])

    return_transport = {"mode": route["returnMode"], "minutes": route["returnWalkMin"], "cost": route["returnFare"]}
    total_cost = sum(s["est_cost"] + s["cost_breakdown"]["transport"] for s in stops) + return_transport["cost"]
    if total_cost != route["totalCost"]:
        # 화면 총액과 경로 계산의 지출이 다르면 버그. 사용자에게 500을 내지 않고 로그만 남김
        log.warning("total_cost mismatch: response %s vs route %s stops=%s",
                    total_cost, route["totalCost"], [s["place_id"] for s in stops])
    last = stops[-1]
    total_minutes = to_min(last["arrival_time"]) + last["stay_minutes"] - to_min(stops[0]["arrival_time"])
    summary = _summary(stops, query, route, lang)
    if explained["intro"]:
        summary = f"{explained['intro']} {summary}"
    for s in stops:
        s.pop("_smallBiz")
        s.pop("_area")
        s.pop("_row")

    return {
        "route_id": uuid.uuid4().hex[:12],
        "total_cost": total_cost,
        "total_minutes": total_minutes,
        "currency": "PHP",
        "summary": summary,
        "stops": stops,
        "return_transport": return_transport,
        # 명세에는 없지만 디버깅에 쓰는 값. 백엔드는 응답에서 빼면 됨 (response_model이 자동으로 걸러줌)
        "_debug": {"query": query, "assumptions": notes + b["notes"],
                   "explain": {"llm_reasons": len(explained["reasons"]), "intro": bool(explained["intro"]),
                               "error": explained["error"]}},
    }
