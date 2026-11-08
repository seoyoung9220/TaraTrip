"""
3단계 데모: 애매한 입력, 되묻기, 대안 제안

실행 (python 폴더 안에서)
  - 진짜 AI:  python demo3.py --real
  - MOCK:     python demo3.py   (AI 키 없이 흐름만 확인)
  - 내 문장:  python demo3.py --real "돈 없는데 배고파"
"""
import json
import sys

from keys import get_keys, user_args
from parse_query import call_workers_ai
from personalize import embed_workers_ai
from assistant import handle_request
from places import places, START_LOCATION

sys.stdout.reconfigure(encoding="utf-8")

# 각 대화는 [첫 마디, (되묻기에 대한 답)] 형태
args = user_args()
conversations = [[args[0]]] if args else [
    ["추천해줘", "오후 1시부터 5시까지, 사진 찍기 좋은 곳"],
    ["돈 없어 ㅠ 오후에 배고픈데 뭐 먹지"],
    ["오늘 날씨 어때?"],
    ["친구 3명이랑 넷이서 4000페소로 오후 1시부터 6시까지 역사 탐방. 많이 걷는 건 싫어"],
    ["조용한 데서 커피 마시면서 쉬고 싶어. 오후 1시부터 4시까지"],
    ["밤 9시부터 11시까지 돌아다니고 싶어"],
]

keys = get_keys()

# MOCK: 위 문장들에 대해 LLM이 낼 법한 답을 미리 적어둔 것 (진짜 AI 아님)
base = {"budget": None, "start": None, "end": None, "tags": [], "areas": [], "mustVisit": [], "avoid": [], "preferenceText": "", "language": "ko", "isTripRequest": True, "budgetLevel": None, "budgetPer": "person", "groupSize": None, "pace": None, "walking": None}
MOCK = [json.dumps(o, ensure_ascii=False) for o in [
    {**base},
    {**base, "start": "13:00", "end": "17:00", "tags": ["sightseeing"], "preferenceText": "Wants good photo spots."},
    {**base, "start": "13:00", "tags": ["food"], "budgetLevel": "low", "preferenceText": "Hungry and wants cheap food."},
    {**base, "isTripRequest": False},
    {**base, "budget": {"amount": 4000, "currency": "PHP"}, "budgetPer": "group", "groupSize": 4, "start": "13:00", "end": "18:00", "tags": ["culture"], "walking": "minimal", "preferenceText": "Wants a history tour without much walking."},
    {**base, "start": "13:00", "end": "16:00", "tags": ["cafe"], "pace": "relaxed", "preferenceText": "Wants to rest and drink coffee in a quiet place."},
    {**base, "start": "21:00", "end": "23:00"},
]]
mi = 0


def mock_llm(messages):
    global mi
    ans = MOCK[mi]
    mi += 1
    return ans


# 진짜 임베딩이 없을 땐 취향 점수 없이(카테고리 태그 방식) 진행
call_llm = (lambda m: call_workers_ai(m, *keys)) if keys else mock_llm
embed = (lambda t: embed_workers_ai(t, *keys)) if keys else None

print("🤖 Workers AI 사용" if keys else "🧪 MOCK 모드 (진짜 AI 아님, 흐름 확인용)")

for turns in conversations:
    print("\n" + "═" * 70)
    state = None
    for text in turns:
        print(f"💬 사용자: {text}")
        res = handle_request(text, call_llm=call_llm, embed=embed, places=places,
                             start_location=START_LOCATION, previous_state=state)
        state = res.get("state")

        if res["type"] == "off_topic":
            print(f"🤖 {res['message']}")
        elif res["type"] == "clarify":
            print(f"🤖 {res['message'].replace(chr(10), chr(10) + '   ', 1)}")
            print(f"   [버튼] {' | '.join(res['options'])}")
        else:
            q = res["query"]
            print(f"🧠 {q['start']}~{q['end']}, 1인 {q['budgetPhp']}페소, {q['groupSize']}명, 페이스 {q['pace']}, 걷기 {q['walking']}")
            for a in res["assumptions"] + res["notes"]:
                print(f"   ↳ {a}")
            if res["type"] == "no_route":
                print(f"🤖 {res['message']}")
                for s in res["suggestions"]:
                    print(f"   💡 {s}")
            else:
                for s in res["route"]["stops"]:
                    print(f"   {s['arrive']}  {s['name']}{' 🏪' if s['smallBiz'] else ''}  ({s['stay']}분, {s['cost']}페소, 도보 {s['walkMin']}분)")
                print(f"   {res['route']['returnTime']}  도착 | 1인 {res['route']['totalCost']}페소, 총 도보 {res['route']['totalWalkMin']}분")
