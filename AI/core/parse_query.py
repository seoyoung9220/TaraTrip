"""
TaraTrip AI 1단계: 사용자 문장 → 여행 조건 JSON (parseQuery.js를 그대로 옮김)

  "1000페소로 점심 먹고 저녁 전까지, 먹거리 위주로"
     → { budget: {amount:1000, currency:"PHP"}, start:"13:00", end:"18:00", tags:["food"], ... }

구조
  1) LLM 호출 (Cloudflare Workers AI)     ← AI가 "이해"하는 부분
  2) JSON 꺼내기                          ← LLM이 앞뒤에 말을 붙여도 JSON만 추출
  3) 검증 + 기본값                        ← LLM이 틀려도 앱이 깨지지 않게 코드가 한 번 더 확인
  4) plan_route 입력으로 변환             ← 취향 태그 가산점, 꼭 갈 곳/뺄 곳 반영
"""
import json
import re

from .utils import js_round, to_min, to_hhmm, post_json

ALLOWED_TAGS = ["food", "cafe", "shopping", "sightseeing", "culture"]
ALLOWED_AREAS = ["Intramuros", "Binondo", "Quiapo", "Sampaloc"]

# 대략적인 환율 (발표 전에 최신 값으로 한 번 확인하세요)
RATES_TO_PHP = {"PHP": 1, "USD": 58, "KRW": 0.042}

DEFAULTS = {"budgetPhp": 1000, "start": "10:00", "durationHours": 6, "latestEnd": "22:00"}
# "돈 없어" 같은 말만 있고 금액이 없을 때 쓰는 1인 예산
BUDGET_LEVEL_PHP = {"low": 300, "medium": 1000, "high": 3000}

# ─────────────────────────────────────────────
# 1) LLM에게 주는 지시문 (프롬프트)
#    작은 모델도 잘 따르도록 영어로, 규칙 + 예시
# ─────────────────────────────────────────────
SYSTEM_PROMPT = f"""You convert a tourist's trip request for Manila into JSON. Output ONLY the JSON object, no explanation.

Schema:
{{
  "budget": {{ "amount": number, "currency": "PHP" | "USD" | "KRW" }} | null,
  "start": "HH:MM" | null,
  "end": "HH:MM" | null,
  "tags": string[],          // only from: {", ".join(ALLOWED_TAGS)}
  "areas": string[],         // only from: {", ".join(ALLOWED_AREAS)}
  "mustVisit": string[],     // place names the user explicitly wants
  "avoid": string[],         // place names or things the user explicitly does not want
  "preferenceText": string,  // one short English sentence describing the user's tastes
  "language": string,        // user's language code, e.g. "ko", "en", "tl"
  "isTripRequest": boolean,  // false if the message has nothing to do with planning a trip or going out in Manila
  "budgetLevel": "low" | "medium" | "high" | null,  // only when no exact amount: "no money"/"cheap"/"돈 없어"/"싸게" -> "low"; "돈 많아"/"luxury" -> "high"
  "budgetPer": "person" | "group",  // "group" only if the user says the amount is for everyone together
  "groupSize": number | null,       // total number of people INCLUDING the user ("친구 3명이랑" = 4)
  "pace": "relaxed" | "normal" | "packed" | null,   // "쉬고 싶어"/"여유롭게"/"천천히"/"relax" -> "relaxed"; "최대한 많이"/"알차게"/"as many as possible" -> "packed"
  "walking": "minimal" | "normal" | null            // "걷기 싫어"/"다리 아파"/"don't want to walk much" -> "minimal"
}}

Rules:
- Use 24-hour time. The user may write in Korean, English or Tagalog.
  "after lunch" / "점심 먹고" / "점심 이후" = start "13:00"
  "morning" / "아침" / "오전" = start "09:00"
  "afternoon" / "오후" = start "13:00"
  "before dinner" / "저녁 전" / "저녁 먹기 전" = end "18:00"
  "evening" / "저녁" = "19:00"
  "오후 2시" = "14:00", "저녁 7시" = "19:00"
- If something is not mentioned, use null (or [] for lists). Never invent values.
- Only add tags for tastes the user actually mentioned. If no taste is mentioned, "tags" must be [].
- "preferenceText" must always be written in English, even if the user wrote in another language.
- Budget is per person, in the currency the user used. "peso"/"페소" = PHP, "dollar"/"달러" = USD, "won"/"원" = KRW.
- "isTripRequest" is true for any request about going around, eating, or visiting places, even a very short one like "추천해줘" or "recommend something".
- Map tastes to tags: eating/street food/local dishes -> "food"; coffee/dessert -> "cafe"; souvenirs/market/handicrafts -> "shopping"; photos/views/landmarks -> "sightseeing"; history/churches/museums -> "culture".

Example
User: "I have 20 dollars, want to explore from 2pm to 7pm, love history and local snacks but skip churches"
{{"budget":{{"amount":20,"currency":"USD"}},"start":"14:00","end":"19:00","tags":["culture","food"],"areas":[],"mustVisit":[],"avoid":["churches"],"preferenceText":"Likes history and local snacks, does not want to visit churches.","language":"en","isTripRequest":true,"budgetLevel":null,"budgetPer":"person","groupSize":null,"pace":null,"walking":null}}

Example
User: "점심 먹고 저녁 먹기 전까지 비논도 쪽 구경하고 싶어. 2만원 정도 있어"
{{"budget":{{"amount":20000,"currency":"KRW"}},"start":"13:00","end":"18:00","tags":[],"areas":["Binondo"],"mustVisit":[],"avoid":[],"preferenceText":"Wants to look around Binondo.","language":"ko","isTripRequest":true,"budgetLevel":null,"budgetPer":"person","groupSize":null,"pace":null,"walking":null}}

Example
User: "친구 2명이랑 셋이서 3000페소로 여유롭게 돌고 싶어. 많이 걷는 건 싫어"
{{"budget":{{"amount":3000,"currency":"PHP"}},"start":null,"end":null,"tags":[],"areas":[],"mustVisit":[],"avoid":[],"preferenceText":"Wants a relaxed trip without much walking.","language":"ko","isTripRequest":true,"budgetLevel":null,"budgetPer":"group","groupSize":3,"pace":"relaxed","walking":"minimal"}}

Example
User: "오늘 날씨 어때?"
{{"budget":null,"start":null,"end":null,"tags":[],"areas":[],"mustVisit":[],"avoid":[],"preferenceText":"","language":"ko","isTripRequest":false,"budgetLevel":null,"budgetPer":"person","groupSize":null,"pace":null,"walking":null}}"""

# ─────────────────────────────────────────────
# LLM 호출: Cloudflare Workers AI (REST API)
#   token.env의 CF_ACCOUNT_ID, CF_API_TOKEN 사용
# ─────────────────────────────────────────────
MODEL = "@cf/meta/llama-3.1-8b-instruct"


def call_workers_ai(messages, account_id, api_token, model=MODEL):
    url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}"
    status, data = post_json(
        url,
        {"messages": messages, "temperature": 0, "max_tokens": 400},
        {"Authorization": f"Bearer {api_token}"},
    )
    if status >= 400 or not data.get("success"):
        raise RuntimeError(f"Workers AI 오류 ({status}): {json.dumps(data.get('errors', data), ensure_ascii=False)}")
    return data["result"]["response"]  # 모델이 생성한 텍스트


# ─────────────────────────────────────────────
# 2) 텍스트에서 JSON만 꺼내기
# ─────────────────────────────────────────────
def extract_json(text):
    if isinstance(text, dict):  # 이미 객체로 온 경우
        return text
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end <= start:
        raise ValueError("LLM 응답에서 JSON을 찾지 못했어요: " + text)
    return json.loads(text[start:end + 1])


# ─────────────────────────────────────────────
# 3) 검증 + 기본값: LLM 결과를 그대로 믿지 않기
# ─────────────────────────────────────────────
TIME_RE = re.compile(r"([01]\d|2[0-3]):[0-5]\d")


def is_time(v):
    return isinstance(v, str) and TIME_RE.fullmatch(v) is not None


def str_list(v):
    return [x for x in v if isinstance(x, str) and x.strip()] if isinstance(v, list) else []


def _is_int(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and float(v).is_integer()


def _to_number(v):
    """JS의 Number()처럼: 숫자/숫자 문자열은 숫자로, 나머지는 None"""
    if isinstance(v, bool) or v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def validate_query(raw):
    raw = raw if isinstance(raw, dict) else {}
    assumptions = []  # 사용자에게 "이렇게 가정했어요"라고 보여줄 내용
    if raw.get("_hints"):
        assumptions.append(f"키워드로 보충: {', '.join(raw['_hints'])}")

    # 인원수
    gs = raw.get("groupSize")
    group_size = int(gs) if _is_int(gs) and 1 <= gs <= 20 else 1

    # 예산 → 1인 기준 페소로 통일
    budget_php = DEFAULTS["budgetPhp"]
    budget = raw.get("budget") if isinstance(raw.get("budget"), dict) else {}
    amt = _to_number(budget.get("amount"))
    cur = str(budget.get("currency") or "PHP").upper()
    level = raw.get("budgetLevel") if raw.get("budgetLevel") in ("low", "medium", "high") else None
    if amt is not None and amt > 0 and cur in RATES_TO_PHP:
        budget_php = js_round(amt * RATES_TO_PHP[cur])
        if cur != "PHP":
            amt_txt = str(int(amt)) if amt.is_integer() else str(amt)
            assumptions.append(f"{amt_txt} {cur} ≈ {budget_php}페소로 환산")
        if raw.get("budgetPer") == "group" and group_size > 1:
            budget_php = budget_php // group_size
            assumptions.append(f"{group_size}명 합계 예산 → 1인 {budget_php}페소로 계산")
    elif level:
        budget_php = BUDGET_LEVEL_PHP[level]
        assumptions.append(f'예산 "{level}" → 1인 {budget_php}페소로 가정')
    else:
        assumptions.append(f"예산 언급 없음 → {DEFAULTS['budgetPhp']}페소로 가정")

    # 시간
    start = raw["start"] if is_time(raw.get("start")) else None
    end = raw["end"] if is_time(raw.get("end")) else None
    if not start:
        start = DEFAULTS["start"]
        assumptions.append(f"시작 시간 없음 → {start}로 가정")
    if not end:
        end = to_hhmm(min(to_min(start) + DEFAULTS["durationHours"] * 60, to_min(DEFAULTS["latestEnd"])))
        assumptions.append(f"종료 시간 없음 → {end}로 가정")
    if to_min(end) <= to_min(start):
        end = to_hhmm(min(to_min(start) + 4 * 60, to_min(DEFAULTS["latestEnd"])))
        assumptions.append(f"종료 시간이 시작보다 빨라서 → {end}로 조정")

    pref = raw.get("preferenceText")
    return {
        "query": {
            "budgetPhp": budget_php, "start": start, "end": end,
            "tags": [t.lower() for t in str_list(raw.get("tags")) if t.lower() in ALLOWED_TAGS],
            "areas": [a for a in str_list(raw.get("areas")) if a in ALLOWED_AREAS],
            "mustVisit": str_list(raw.get("mustVisit")),
            "avoid": str_list(raw.get("avoid")),
            "preferenceText": pref if isinstance(pref, str) else "",
            "language": raw["language"] if isinstance(raw.get("language"), str) else "en",
            "isTripRequest": raw.get("isTripRequest") is not False,
            "groupSize": group_size,
            "pace": raw["pace"] if raw.get("pace") in ("relaxed", "normal", "packed") else "normal",
            "walking": "minimal" if raw.get("walking") == "minimal" else "normal",
            # 되묻기 판단용: 사용자가 실제로 말한 게 있었는지
            "hasTime": is_time(raw.get("start")) or is_time(raw.get("end")),
            "hasTaste": len(str_list(raw.get("tags"))) > 0 or len(str_list(raw.get("mustVisit"))) > 0
                        or (isinstance(pref, str) and len(pref.strip()) > 0),
        },
        "assumptions": assumptions,
    }


# ─────────────────────────────────────────────
# 키워드 안전망: 작은 LLM이 놓친 확실한 표현을 코드가 보충
#   AI가 값을 채웠으면 AI를 믿고, 비워둔 경우에만 키워드로 채움
# ─────────────────────────────────────────────
HINTS = [
    {"field": "start", "value": "09:00", "words": ["아침", "오전", "morning"]},
    {"field": "start", "value": "13:00", "words": ["오후", "점심 먹고", "점심 이후", "afternoon", "after lunch"]},
    {"field": "start", "value": "18:00", "words": ["저녁에", "evening", "tonight"]},
    {"field": "pace", "value": "relaxed", "words": ["쉬고", "쉬면서", "여유", "천천히", "느긋", "relax", "chill", "slow"]},
    {"field": "pace", "value": "packed", "words": ["최대한 많이", "알차게", "빡빡하게", "as many as", "packed"]},
    {"field": "walking", "value": "minimal", "words": ["걷기 싫", "걷는 거 싫", "걷는 건 싫", "많이 걷", "다리 아", "don't want to walk", "less walking", "not walk much"]},
    {"field": "budgetLevel", "value": "low", "words": ["돈 없", "돈이 없", "싸게", "저렴", "가성비", "cheap", "broke", "low budget"]},
]


def apply_hints(raw, user_text):
    text = user_text.lower()
    filled = []
    for h in HINTS:
        if raw.get(h["field"]):  # AI가 이미 채운 값은 그대로
            continue
        budget = raw.get("budget") if isinstance(raw.get("budget"), dict) else {}
        if h["field"] == "budgetLevel" and budget.get("amount"):  # 금액이 있으면 불필요
            continue
        if any(w in text for w in h["words"]):
            raw[h["field"]] = h["value"]
            filled.append(f"{h['field']}={h['value']}")
    raw["_hints"] = filled  # 디버깅용: 어떤 걸 키워드로 채웠는지
    return raw


def parse_raw(user_text, call_llm):
    """문장 → LLM이 뽑은 날것의 조건 (검증 전) + 키워드 안전망"""
    text = call_llm([
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_text},
    ])
    return apply_hints(extract_json(text), user_text)


def _is_empty(v):
    return v is None or v == "" or (isinstance(v, list) and len(v) == 0)


def merge_raw(prev, nxt):
    """되묻기에 대한 답을 이전 조건에 합치기: 새로 말한 것만 덮어씀
    1차 "추천해줘" → 2차 "오후 1시부터 5시, 사진 찍기 좋은 곳" → 둘을 합친 조건"""
    if not prev:
        return nxt
    out = dict(prev)
    for k, v in nxt.items():
        if k in ("isTripRequest", "language", "_hints"):
            continue
        if not _is_empty(v) and not (k == "budgetPer" and v == "person"):
            out[k] = v
    if nxt.get("preferenceText") and prev.get("preferenceText"):
        out["preferenceText"] = f"{prev['preferenceText']} {nxt['preferenceText']}"
    out["isTripRequest"] = True  # 대화가 이어지는 중이면 여행 얘기로 봄
    return out


def parse_query(user_text, call_llm):
    """전체: 문장 → 검증된 조건 (demo.py, demo2.py에서 사용)"""
    return validate_query(parse_raw(user_text, call_llm))


# ─────────────────────────────────────────────
# 4) 조건 → plan_route 입력
# ─────────────────────────────────────────────
TAG_BONUS = 4            # 취향 카테고리에 맞는 장소 가산점
MUST_VISIT_BONUS = 50    # 꼭 가고 싶은 곳: 사실상 무조건 포함
OTHER_AREA_PENALTY = 3   # 원하는 지역이 있을 때 다른 지역 감점
SMALL_BIZ_MAX = 5        # 취향 맞춤 모드에서 소상공인이 받을 수 있는 최대 가산점


def norm(s):
    """이름 비교용: 소문자로, 영문·숫자·한글 말고는 다 지움"""
    return re.sub(r"[^a-z0-9가-힣]", "", s.lower())


def matches(place_name, wanted):
    """대소문자·띄어쓰기 무시, 한쪽이 다른 쪽을 포함하면 같은 곳으로 봄"""
    a, b = norm(place_name), norm(wanted)
    return len(b) >= 3 and (b in a or a in b)


# "churches" 같은 일반명사도 잡기 위한 동의어 (필요하면 계속 추가)
SYNONYMS = {
    "church": ["church", "cathedral", "basilica", "chapel", "성당", "교회"],
    "museum": ["museum", "casa", "박물관"],
    "market": ["market", "시장"],
    "cafe": ["cafe", "coffee", "카페"],
}


def generic_match(place, word):
    w = re.sub(r"(es|s)$", "", norm(word), count=1)
    if len(w) < 2:
        return False
    name = norm(place["name"])
    group = next((lst for lst in SYNONYMS.values() if any(norm(s) == w for s in lst)), None)
    if group:
        return any(norm(s) in name for s in group)
    return (len(w) >= 3 and w in name) or norm(place["category"]) == w


def build_plan_input(query, places, start_location, personal=None):
    """
    personal: personalize.personal_bonus() 결과 (없으면 None)
      - 있으면: 임베딩 기반 개인 맞춤 가산점 사용 (2단계)
      - 없으면: 카테고리 태그 일치 시 TAG_BONUS (1단계 방식, 예비용)
    """
    notes = []
    avoided = [p for p in places if any(matches(p["name"], w) or generic_match(p, w) for w in query["avoid"])]
    if avoided:
        notes.append(f"제외: {', '.join(p['name'] for p in avoided)}")

    unmatched_must = [w for w in query["mustVisit"] if not any(matches(p["name"], w) for p in places)]
    if unmatched_must:
        notes.append(f"DB에 없는 장소라 반영 못 함: {', '.join(unmatched_must)}")

    # 여유롭게: 취향에 별로 안 맞는 곳(하위 절반)은 아예 후보에서 빼고, 맞는 곳에 오래 머물기
    def not_relaxed_fit(p):
        if query["pace"] != "relaxed" or personal is None:
            return False
        fit = personal.get(p["name"])
        return (fit["fit"] if fit else 1) < 0.5

    dropped = [p for p in places if p not in avoided and not_relaxed_fit(p)]
    if dropped:
        notes.append(f"여유로운 일정이라 취향에 덜 맞는 곳 제외: {len(dropped)}곳")
    if query["walking"] == "minimal":
        notes.append("걷기 최소화: 한 번에 12분 넘게 걷지 않도록 가까운 곳끼리 묶음")

    adjusted = []
    for p in places:
        if p in avoided or not_relaxed_fit(p):
            continue
        score = p["score"]
        if personal is not None:
            fit = personal.get(p["name"])
            score += fit["bonus"] if fit else 0
            # 취향 우선 원칙: 소상공인 가산점도 "취향에 맞는 만큼만" 줌
            #   취향에 딱 맞는 소상공인 → +SMALL_BIZ_MAX, 관심 없는 소상공인 → 거의 0
            if p.get("smallBiz"):
                score += SMALL_BIZ_MAX * (fit["fit"] if fit else 0.5)
        elif p["category"] in query["tags"]:
            score += TAG_BONUS
        if any(matches(p["name"], w) for w in query["mustVisit"]):
            score += MUST_VISIT_BONUS
        if query["areas"] and p["area"] not in query["areas"]:
            score = max(1, score - OTHER_AREA_PENALTY)
        adjusted.append({**p, "score": score})

    options = {}
    if personal is not None:
        # 취향 맞춤 모드에선 소상공인 가산점을 위에서 직접 계산했으니 plan_route의 고정 가산점은 끔
        options["smallBizBonus"] = 0
    options["stayFactor"] = {"relaxed": 1.5, "normal": 1, "packed": 0.8}.get(query["pace"], 1)
    options["travelWeight"] = 3 if query["walking"] == "minimal" else 1
    options["maxLegMin"] = 12 if query["walking"] == "minimal" else float("inf")  # 걷기 싫으면 한 구간 최대 12분

    return {
        "planInput": {
            "budget": query["budgetPhp"],
            "start": query["start"],
            "end": query["end"],
            "startLocation": start_location,
            "places": adjusted,
            "options": options,
        },
        "notes": notes,
    }
