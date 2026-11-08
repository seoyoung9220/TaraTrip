"""
TaraTrip AI 비서: 백엔드(FastAPI)가 부르는 "입구" 함수 — assistant.js를 그대로 옮김

  from assistant import handle_request
  res = handle_request("800페소로 오후에 먹거리 위주로",
                       call_llm=call_llm, embed=embed, places=places, start_location=START_LOCATION)

결과는 네 가지 중 하나 (res["type"])
  "route"     → 추천 동선 완성
  "clarify"   → 정보가 너무 적어서 되묻기 (res["options"]를 버튼으로 보여주면 좋음)
  "no_route"  → 조건에 맞는 동선이 없음 + 이렇게 바꿔보라는 대안 (res["suggestions"])
  "off_topic" → 여행과 관계없는 말

대화 이어가기
  응답의 res["state"]를 저장해뒀다가, 사용자의 다음 말과 함께 previous_state로 넘기면
  이전 조건에 새 말을 합쳐서 처리해요.
"""
import math

from parse_query import parse_raw, merge_raw, validate_query, build_plan_input
from personalize import personal_bonus
from plan_route import plan_route
from utils import js_round, to_min


def say(lang, ko, en):
    """사용자 언어에 맞춰 문구 고르기 (지금은 한국어/영어)"""
    return ko if lang == "ko" else en


def handle_request(user_text, *, call_llm, places, start_location, embed=None, previous_state=None):
    raw = parse_raw(user_text, call_llm)
    lang = raw.get("language") or (previous_state or {}).get("language") or "en"

    # 1) 여행과 관계없는 말
    if raw.get("isTripRequest") is False and not previous_state:
        return {
            "type": "off_topic",
            "message": say(lang,
                "저는 마닐라 여행 동선을 짜드리는 TaraTrip이에요 😊 예산, 시간, 좋아하는 것을 알려주시면 코스를 만들어 드릴게요!",
                "I'm TaraTrip, your Manila route planner 😊 Tell me your budget, time and what you like, and I'll plan a route!"),
        }

    merged = merge_raw(previous_state, raw)
    v = validate_query(merged)
    query, assumptions = v["query"], v["assumptions"]

    # 2) 시간도 취향도 없으면 한 번만 되묻기 (이미 한 번 물어봤으면 기본값으로 진행)
    if not query["hasTime"] and not query["hasTaste"] and not previous_state:
        return {
            "type": "clarify",
            "message": say(lang,
                "좋아요! 몇 가지만 알려주시면 딱 맞게 짜드릴게요 😊\n🕐 몇 시부터 몇 시까지? · 💰 예산은? · 🎯 뭘 좋아하세요?",
                "Sure! Tell me a bit more so I can tailor it 😊\n🕐 What time? · 💰 Budget? · 🎯 What do you like?"),
            "options": say(lang,
                ["먹거리", "카페", "역사·문화", "쇼핑", "사진 명소", "그냥 알아서 해줘"],
                ["Food", "Cafes", "History & culture", "Shopping", "Photo spots", "Just surprise me"]),
            "state": merged,
        }

    # 3) 취향 맞춤 점수 → 동선 계산
    personal = personal_bonus(query["preferenceText"], places, embed) if embed and query["preferenceText"] else None
    b = build_plan_input(query, places, start_location, personal)
    plan_input, notes = b["planInput"], b["notes"]
    route = plan_route(plan_input)

    # 걷기 최소화 때문에 동선이 너무 짧으면(시간의 60% 미만 사용) 한 구간 제한을 20분으로 풀어서 다시 계산
    def used(r):
        if not r["stops"]:
            return 0
        return (to_min(r["returnTime"]) - to_min(query["start"])) / (to_min(query["end"]) - to_min(query["start"]))

    if query["walking"] == "minimal" and used(route) < 0.6:
        retry = plan_route({**plan_input, "options": {**plan_input["options"], "maxLegMin": 20}})
        if len(retry["stops"]) > len(route["stops"]):
            route = retry
            notes.append("가까운 곳만으로는 일정이 너무 짧아서 한 구간 최대 20분까지 허용")

    # 4) 갈 곳이 없으면 이유와 대안
    if not route["stops"]:
        return {
            "type": "no_route",
            "message": say(lang, "이 조건으로는 갈 수 있는 곳을 찾지 못했어요 😢", "I couldn't find any places that fit these conditions 😢"),
            "suggestions": diagnose(query, plan_input["places"], lang),
            "query": query, "assumptions": assumptions, "notes": notes,
            "state": merged,
        }

    return {"type": "route", "query": query, "assumptions": assumptions, "notes": notes, "route": route, "state": merged}


def diagnose(query, candidates, lang):
    """동선이 비었을 때 왜 비었는지 따져보고 바꿀 만한 조건 제안"""
    out = []
    S, E = to_min(query["start"]), to_min(query["end"])
    factor = {"relaxed": 1.5, "packed": 0.8}.get(query["pace"], 1)

    def stay(p):
        return js_round(p["stayMin"] * factor)

    open_in_window = [p for p in candidates if to_min(p["opens"]) + stay(p) <= E and to_min(p["closes"]) - stay(p) >= S]

    if E - S < 60:
        out.append(say(lang, "시간이 1시간도 안 돼요. 시간을 조금 늘려보세요.", "Less than an hour — try a longer time window."))
    if len(open_in_window) < 2:
        # 문 연 곳이 충분한(최대치의 80% 이상) 4시간짜리 시간대 중 원래 요청과 가장 가까운 것
        windows = []
        s = 9 * 60
        while s + 240 <= 22 * 60:
            cnt = len([p for p in candidates if to_min(p["opens"]) + stay(p) <= s + 240 and to_min(p["closes"]) - stay(p) >= s])
            windows.append({"s": s, "cnt": cnt})
            s += 60
        max_cnt = max(w["cnt"] for w in windows)
        best = sorted([w for w in windows if w["cnt"] >= max_cnt * 0.8], key=lambda w: abs(w["s"] - S))[0]

        def hh(m):
            return f"{m // 60:02d}:00"

        out.append(say(lang,
            f"{query['start']}~{query['end']}에는 문을 연 곳이 거의 없어요. {hh(best['s'])}~{hh(best['s'] + 240)}로 바꿔볼까요?",
            f"Few places are open {query['start']}–{query['end']}. How about {hh(best['s'])}–{hh(best['s'] + 240)}?"))
    if candidates:
        cheapest = min(p["costPhp"] for p in candidates)
        if cheapest > query["budgetPhp"]:
            out.append(say(lang, f"가장 저렴한 곳도 {cheapest}페소예요. 예산을 늘려보세요.", f"The cheapest place costs ₱{cheapest}. Try a higher budget."))
    if query["avoid"]:
        out.append(say(lang,
            f'"{", ".join(query["avoid"])}" 제외 조건을 빼면 선택지가 늘어나요.',
            f'Removing "{", ".join(query["avoid"])}" from your exclusions would give more options.'))
    if not out:
        out.append(say(lang, "조건을 조금 완화해서 다시 시도해보세요.", "Try relaxing your conditions a little."))
    return out
