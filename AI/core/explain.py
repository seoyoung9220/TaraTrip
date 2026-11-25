"""
TaraTrip AI 3단계: 추천 이유를 LLM이 자연스러운 문장으로 쓰기

역할 나누기
  - 숫자(도착 시각, 비용, 교통비, 걷는 시간)는 코드가 계산 → 정확함
  - "왜 이 사람에게 이 장소인지"는 LLM이 씀 → 자연스러움
  LLM에게는 숫자를 쓰지 말라고 하고, 답을 검사해서 이상하면 그 장소만 템플릿 문장으로 대신함

  result = explain(stops, traveler, lang, call_llm)
    → {"intro": "코스 한 줄 소개" 또는 None, "reasons": {place_id: "이유 한 문장"}, "error": None 또는 이유}
"""
import json
import re

from .parse_query import extract_json

# 상위 모델이 있으면 한국어 문장이 훨씬 자연스러워요 (백엔드가 explain_llm으로 넘길 수 있음)
EXPLAIN_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast"

MAX_REASON_CHARS = {"ko": 90, "en": 180}
MAX_INTRO_CHARS = {"ko": 110, "en": 220}

HANGUL = re.compile(r"[가-힣]")
# 한국어 문장에 허용하는 글자: 한글, 영문·숫자(고유명사), 기본 문장부호. 키릴·한자·가나 등이 섞이면 버림
KO_ALLOWED = re.compile(r"^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9\s.,!?~'’\"“”()·\-–&/:%+]+$")
KO_ENDING = re.compile(r"요[.!~]?$")  # 해요체로 끝나야 함
# "여행자는 ~를 좋아해서" 같은 제3자 말투 금지
META = re.compile(r"여행자|이 사람|traveler|the user", re.I)
# 가격·시간·거리는 코드가 이미 정확하게 보여주니까 LLM 문장에는 못 쓰게 함
# 자주 틀리는 맞춤법은 고쳐서 씀: "선택이예요" → "선택이에요", "되요" → "돼요"
def _fix_ko(text):
    def iyeyo(m):
        ch = m.group(1)
        has_batchim = (ord(ch) - 0xAC00) % 28 != 0
        return ch + ("이에요" if has_batchim else "예요")
    text = re.sub(r"([가-힣])이예요", iyeyo, text)
    text = re.sub(r"아니예요", "아니에요", text)
    return text.replace("되요", "돼요")


def _repeats(text):
    """같은 두 단어 묶음이 한 문장에 두 번 나오면 True ("가족과 함께 … 가족과 함께")"""
    words = re.findall(r"[가-힣A-Za-z]+", text)
    pairs = list(zip(words, words[1:]))
    return len(pairs) != len(set(pairs))


NUMBERS = re.compile(r"[₱$]|페소|peso|php|\d+\s*(분|시간|시|km|원|min|hour)|\d{1,2}:\d{2}", re.I)

LANG_RULE = {
    "ko": """Korean only, in friendly polite 해요체 (every sentence ends with ~요). Use Hangul; English only for proper nouns.
For food or item names use the common Korean word, or keep the original English word if unsure (never invent odd transliterations).
The examples below are about unrelated places. Copy only their tone and length, never their content:
  intro: "바닷가 산책과 동네 빵집을 천천히 즐기는 하루예요."
  reason: "도자기를 좋아하신다면 장인이 물레 돌리는 모습을 꼭 구경해 보세요."
  reason: "삼대째 이어 온 가게라 손으로 빚은 만두 맛이 남달라요."
  reason: "창가 자리에 앉아 바다를 보며 쉬어 가기 좋아요."
""",
    "en": """English, warm and concise.
The examples below are about unrelated places. Copy only their tone and length, never their content:
  intro: "A slow day of seaside walks and neighborhood bakeries."
  reason: "If you love ceramics, watch the potters at their wheels."
  reason: "Run by the same family for three generations, with hand-folded dumplings."
""",
}

SYSTEM_PROMPT = """You write the short texts a travel app shows for a one-day Manila route that is already planned.
Output ONLY a JSON object, no other text:
{{"intro": string, "reasons": {{"<stop id>": string, ...}}}}

Language and tone: {lang_rule}

Rules:
- Talk TO the traveler (second person). Never write "traveler", "여행자", "this person" or "they".
- "intro": ONE sentence describing the course itself (its mood or theme). Do not repeat the request back.
- "reasons": exactly one entry per stop id, ONE short sentence each, saying why this stop suits the traveler's wishes.
  The place name is already shown above the sentence, so do NOT start with the place name.
  Use the stop's facts (description, signature item, tags).
  If the stop matches something the traveler asked for (a food, an attraction or a word in free_text), say that link plainly.
- Each stop has "time_of_day". Only call a meal breakfast, lunch or dinner if it matches that time. Never repeat a phrase within one sentence.
- If "small_business" is true, you may warmly mention it is locally or family owned, but not for every stop.
- Do NOT mention prices, money, times, durations, distances or transport. Those are shown elsewhere.
- Do NOT invent facts that are not in the data (no architectural style, era or history unless the description says so).
- Vary how sentences start."""


def _traveler_text(traveler):
    """사용자 정보를 LLM에게 보여줄 모양으로"""
    out = {}
    for key in ("preferences", "foods", "attractions", "must_visit", "avoid", "free_text", "pace", "walking"):
        v = traveler.get(key)
        if v not in (None, "", [], "normal"):
            out[key] = v
    return out


def _stop_text(s):
    row = s["row"]
    data = {
        "id": row["place_id"],
        "name": row["name"],
        "category": row.get("category"),
        "description": (row.get("description") or "")[:300],
        "tags": row.get("tags") or [],
        "small_business": bool(row.get("is_small_business")),
    }
    if s.get("arrive"):  # 숫자 대신 때만 알려줌 (11시 반 식당을 "아침 식사"라고 쓰지 않게)
        h = int(s["arrive"][:2])
        data["time_of_day"] = "morning" if h < 11 else "midday" if h < 15 else "afternoon" if h < 18 else "evening"
    if row.get("signature_menu"):
        data["signature"] = row["signature_menu"]
    return data


def _clean(text, lang, limit):
    """LLM 문장 검사: 통과하면 다듬은 문장, 아니면 None (→ 그 부분은 템플릿 문장)"""
    if not isinstance(text, str):
        return None
    text = " ".join(text.split()).strip().strip('"')
    if not text or len(text) > limit:
        return None
    if NUMBERS.search(text) or META.search(text):
        return None  # 가격·시간을 지어냈거나, 제3자 말투
    if lang == "ko":
        text = _fix_ko(text)
        if _repeats(text):
            return None  # 같은 말 반복
        if not HANGUL.search(text) or not KO_ALLOWED.match(text):
            return None  # 영어로 썼거나 다른 나라 글자가 섞임
        if not KO_ENDING.search(text):
            return None  # 해요체가 아님 (~합니다, ~할 거야)
    return text


def explain(stops, traveler, lang, call_llm):
    """
    stops   : [{"row": DB 행}, ...] 동선 순서대로
    traveler: {"preferences", "foods", "attractions", "must_visit", "avoid", "free_text", "pace", "walking"}
    lang    : "ko" 또는 "en" (그 외는 en)
    call_llm: messages → 텍스트
    """
    lang = lang if lang in LANG_RULE else "en"
    if not call_llm or not stops:
        return {"intro": None, "reasons": {}, "error": "no llm"}
    user = json.dumps({"traveler": _traveler_text(traveler), "stops": [_stop_text(s) for s in stops]},
                      ensure_ascii=False)
    try:
        raw = extract_json(call_llm([
            {"role": "system", "content": SYSTEM_PROMPT.format(lang_rule=LANG_RULE[lang])},
            {"role": "user", "content": user},
        ]))
    except Exception as e:  # LLM이 죽거나 JSON이 아니면 전부 템플릿으로
        return {"intro": None, "reasons": {}, "error": f"{type(e).__name__}: {e}"[:200]}

    ids = {s["row"]["place_id"] for s in stops}
    got = raw.get("reasons") if isinstance(raw.get("reasons"), dict) else {}
    reasons = {}
    for pid, text in got.items():
        pid = str(pid)
        if pid in ids:
            ok = _clean(text, lang, MAX_REASON_CHARS[lang])
            if ok:
                reasons[pid] = ok
    intro = _clean(raw.get("intro"), lang, MAX_INTRO_CHARS[lang])
    missing = len(ids) - len(reasons)
    return {"intro": intro, "reasons": reasons,
            "error": f"{missing}곳은 템플릿 사용" if missing else None}
