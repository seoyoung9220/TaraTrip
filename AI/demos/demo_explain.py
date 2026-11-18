"""
4단계 데모: LLM이 쓴 추천 이유 vs 템플릿 문장, 작은 모델 vs 큰 모델

실행 (AI 폴더 안에서)
  - 진짜 AI:  python demos/demo_explain.py --real
  - MOCK:     python demos/demo_explain.py          (LLM 없음 → 템플릿 문장만)
  - 내 취향:  python demos/demo_explain.py --real "스페인 시대 건물이랑 디저트 좋아해"
"""
import os
import sys
import time
from datetime import date

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))  # AI 폴더

from keys import get_keys, user_args
from core.explain import EXPLAIN_MODEL
from core.parse_query import call_workers_ai, MODEL
from data.places import places as SAMPLE
from recommend import recommend

sys.stdout.reconfigure(encoding="utf-8")

DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
CAT = {"food": "restaurant", "cafe": "restaurant", "shopping": "shop", "sightseeing": "attraction", "culture": "attraction"}

# data/places.py 샘플을 DB 행 모양으로 (실제 서비스에선 DB의 UST 데이터)
ROWS = []
for i, p in enumerate(SAMPLE, 1):
    attr = CAT[p["category"]] == "attraction"
    ROWS.append({
        "place_id": f"MNL-{i:04d}", "name": p["name"], "category": CAT[p["category"]],
        "is_small_business": p["smallBiz"], "lat": p["lat"], "lng": p["lng"], "district": p["area"],
        "price_min": None if attr else p["costPhp"], "price_max": None if attr else p["costPhp"],
        "entry_fee": p["costPhp"] if attr else 0, "avg_stay_minutes": p["stayMin"],
        "opening_hours": {d: f"{p['opens']}-{p['closes']}" for d in DAYS},
        "tags": [p["category"]], "description": p["description"],
    })

args = user_args()
text = args[0] if args else "길거리 음식이랑 스페인 식민지 시대 역사에 관심 많아. 너무 많이 걷는 건 싫어"
REQ = {"budget": {"amount": 1000, "currency": "PHP"}, "foods": ["street food"], "attractions": [],
       "free_text": text, "start_location": {"lat": 14.5915, "lng": 120.9737},
       "start_time": "10:00", "end_time": "16:00"}

keys = get_keys()
runs = [("템플릿 (LLM 없음)", None, None)]
if keys:
    small = lambda m: call_workers_ai(m, *keys)
    big = lambda m: call_workers_ai(m, *keys, model=EXPLAIN_MODEL)
    runs += [(f"작은 모델 {MODEL.split('/')[-1]}", small, small),
             (f"큰 모델 {EXPLAIN_MODEL.split('/')[-1]}", small, big)]
else:
    print("🧪 MOCK 모드: LLM이 없어서 템플릿 문장만 보여줘요. --real을 붙이면 진짜 AI로 비교해요.")

print(f"💬 {text}\n")
for label, call_llm, explain_llm in runs:
    t0 = time.time()
    res = recommend(REQ, ROWS, call_llm=call_llm, explain_llm=explain_llm, travel_date=date(2026, 11, 24))
    info = res["_debug"]["explain"]
    print("═" * 70)
    print(f"[{label}]  {time.time() - t0:.1f}초  (LLM 문장 {info['llm_reasons']}/{len(res['stops'])}곳"
          + (f", {info['error']}" if info["error"] and call_llm else "") + ")")
    print(f"📝 {res['summary']}")
    for s in res["stops"]:
        print(f"   {s['arrival_time']}  {s['name']}")
        print(f"          → {s['reason']}")
