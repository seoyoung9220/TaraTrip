"""
1단계 데모: 문장 → 조건 → 동선

실행 (python 폴더 안에서)
  - LLM 없이 구조만 확인:   python demo.py
  - 진짜 Workers AI 사용:    python demo.py --real
  - 내 문장으로 해보기:      python demo.py --real "500페소로 오후에 카페랑 먹거리"
"""
import json
import sys

from keys import get_keys, user_args
from parse_query import parse_query, call_workers_ai, build_plan_input, MODEL
from plan_route import plan_route
from places import places, START_LOCATION

sys.stdout.reconfigure(encoding="utf-8")

args = user_args()
examples = args[:1] or [
    "1000페소 정도로 점심 먹고 저녁 전까지 돌아다니고 싶어. 현지 음식이랑 길거리 간식 위주로!",
    "I only have 10 dollars. Morning to 3pm. I love history and taking photos, but no shopping please.",
    "Fort Santiago는 꼭 가고 싶고 성당은 별로야. 저녁 7시까지",
]

keys = get_keys()

# MOCK: 실제 AI가 아니라, 위 예시 문장에 대해 LLM이 낼 법한 답을 미리 적어둔 것
MOCK_ANSWERS = [
    '{"budget":{"amount":1000,"currency":"PHP"},"start":"13:00","end":"18:00","tags":["food"],"areas":[],"mustVisit":[],"avoid":[],"preferenceText":"Wants local food and street snacks.","language":"ko"}',
    'Here is the JSON:\n{"budget":{"amount":10,"currency":"USD"},"start":"09:00","end":"15:00","tags":["culture","sightseeing"],"areas":[],"mustVisit":[],"avoid":["shopping"],"preferenceText":"Loves history and photography, no shopping.","language":"en"}',
    '{"budget":null,"start":null,"end":"19:00","tags":[],"areas":[],"mustVisit":["Fort Santiago"],"avoid":["churches"],"preferenceText":"Must see Fort Santiago, not interested in churches.","language":"ko"}',
]
mock_idx = 0


def mock_llm(messages):
    global mock_idx
    ans = MOCK_ANSWERS[mock_idx % len(MOCK_ANSWERS)]
    mock_idx += 1
    return ans


call_llm = (lambda m: call_workers_ai(m, *keys)) if keys else mock_llm

print(f"🤖 Workers AI 사용 ({MODEL})" if keys else "🧪 MOCK 모드 (AI 키 없음 → 미리 적어둔 답으로 테스트)")

for text in examples:
    print("\n" + "═" * 70)
    print(f"💬 사용자: {text}\n")

    r = parse_query(text, call_llm)
    query, assumptions = r["query"], r["assumptions"]
    print("🧠 AI가 이해한 조건:", json.dumps(query, ensure_ascii=False, separators=(",", ":")))
    for a in assumptions:
        print(f"   ↳ 가정: {a}")

    b = build_plan_input(query, places, START_LOCATION)
    for n in b["notes"]:
        print(f"   ↳ {n}")

    route = plan_route(b["planInput"])
    print(f"\n📍 추천 동선 ({query['start']}~{query['end']}, 예산 {query['budgetPhp']}페소)")
    for s in route["stops"]:
        print(f"  {s['arrive']}  {s['name']}{' 🏪' if s['smallBiz'] else ''}  ({s['cost']}페소)")
    print(f"  {route['returnTime']}  출발지 도착  |  총 {route['totalCost']}페소, 도보 {route['totalWalkMin']}분")
