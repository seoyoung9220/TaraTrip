"""
2단계 데모: 조건(예산·시간)은 똑같고 취향만 다른 3명 → 동선이 어떻게 달라지나

실행 (AI 폴더 안에서)
  - 진짜 AI:  python demos/demo2.py --real
  - MOCK:     python demos/demo2.py   (AI 키 없이 흐름만 확인)
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))  # AI 폴더

from keys import get_keys
from core.parse_query import parse_query, call_workers_ai, build_plan_input
from core.personalize import personal_bonus, embed_workers_ai, embed_mock, EMBED_MODEL
from core.plan_route import plan_route
from data.places import places, START_LOCATION
from core.utils import fmt_num

sys.stdout.reconfigure(encoding="utf-8")

# 일부러 시간을 3시간으로 빡빡하게 → 다 못 가니까 "누구에게 뭘 고를지"가 드러남
travelers = [
    "800페소로 오후 1시부터 4시까지. 길거리 음식이랑 달달한 간식 먹고 싶어",
    "800페소로 오후 1시부터 4시까지. 조용한 데서 커피 마시면서 쉬고 싶어",
    "800페소로 오후 1시부터 4시까지. 스페인 식민지 시대 역사에 관심 많아",
]

keys = get_keys()

MOCK_LLM = [
    '{"budget":{"amount":800,"currency":"PHP"},"start":"13:00","end":"16:00","tags":["food","cafe"],"areas":[],"mustVisit":[],"avoid":[],"preferenceText":"Wants street food and sweet snacks and dessert.","language":"ko"}',
    '{"budget":{"amount":800,"currency":"PHP"},"start":"13:00","end":"16:00","tags":["cafe"],"areas":[],"mustVisit":[],"avoid":[],"preferenceText":"Wants a quiet place to rest and drink coffee.","language":"ko"}',
    '{"budget":{"amount":800,"currency":"PHP"},"start":"13:00","end":"16:00","tags":["culture"],"areas":[],"mustVisit":[],"avoid":[],"preferenceText":"Interested in Spanish colonial era history.","language":"ko"}',
]
mi = 0


def mock_llm(messages):
    global mi
    ans = MOCK_LLM[mi]
    mi += 1
    return ans


call_llm = (lambda m: call_workers_ai(m, *keys)) if keys else mock_llm
embed = (lambda t: embed_workers_ai(t, *keys)) if keys else embed_mock

print(f"🤖 Workers AI 사용 (임베딩: {EMBED_MODEL})" if keys else "🧪 MOCK 모드 (진짜 AI 아님, 흐름 확인용)")

for text in travelers:
    print("\n" + "═" * 70)
    print(f"💬 {text}")

    query = parse_query(text, call_llm)["query"]
    print(f'🧠 취향: "{query["preferenceText"]}"')

    personal = personal_bonus(query["preferenceText"], places, embed)

    # 이 사람에게 잘 맞는 장소 TOP 3
    if personal:
        top = sorted(personal.items(), key=lambda kv: -kv[1]["bonus"])[:3]
        print("🎯 잘 맞는 곳: " + ", ".join(f"{n} ({'+' if v['bonus'] >= 0 else ''}{fmt_num(v['bonus'])})" for n, v in top))

    plan_input = build_plan_input(query, places, START_LOCATION, personal)["planInput"]
    r = plan_route(plan_input)
    print("📍 동선:")
    for s in r["stops"]:
        print(f"   {s['arrive']}  {s['name']}{' 🏪' if s['smallBiz'] else ''}")
    print(f"   {r['returnTime']}  도착 | {r['totalCost']}페소")
