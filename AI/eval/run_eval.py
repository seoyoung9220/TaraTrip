"""
TaraTrip AI 성능 평가 (발표용)

같은 여행자 20명, 같은 장소 데이터, 같은 규칙(영업시간·예산·종료 시각·장소 수·식사 제한·이동수단)으로
세 가지 방법을 비교해요.
  - TaraTrip      : recommend() (점수 + 최적화 + 취향)
  - 가까운 곳부터  : 출발지에서 제일 가까운 갈 수 있는 곳을 계속 고르기 (흔한 단순 방식)
  - 무작위        : 갈 수 있는 곳을 무작위 순서로 채우기 (아무 지능 없음)

실행 (AI 폴더 안에서)
  python eval/run_eval.py 장소파일.xlsx            # LLM·임베딩 없이 (취향 점수는 태그 방식)
  python eval/run_eval.py 장소파일.xlsx --real     # 진짜 임베딩으로 취향 점수 (../token.env 또는 .env 키 필요)
  장소파일: UST 엑셀(TaraTrip_Places 양식, openpyxl 필요) 또는 DB 행 JSON 리스트

결과: 화면에 표 + eval/results.csv (여행자별 상세) + eval/RESULTS.md (요약)
"""
import csv
import json
import os
import random
import sys
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))  # AI 폴더
sys.path.insert(0, os.path.join(HERE, "..", "demos"))
sys.stdout.reconfigure(encoding="utf-8")

from core.plan_route import DEFAULTS, leg  # noqa: E402
from core.utils import to_min, to_hhmm  # noqa: E402
from recommend import (  # noqa: E402
    DAYS, TRANSPORT, build_query, _limits, recommend, to_internal_place, BudgetTooLowError, NoResultsError,
)

TRAVEL_DATE = date(2026, 11, 25)  # 수요일

# ─────────────────────────────────────────────
# 출발지와 여행자 20명
# ─────────────────────────────────────────────
START = {
    "인트라무로스": (14.5915, 120.9737), "에르미타(리잘 공원)": (14.5831, 120.9794),
    "비논도": (14.6003, 120.9747), "UST(삼팔록)": (14.6096, 120.9894), "마카티": (14.5547, 121.0244),
    "퀘존시티(쿠바오)": (14.6190, 121.0530), "말라테": (14.5700, 120.9830), "키아포": (14.5986, 120.9836),
}

# 앱은 region을 항상 보냄 → 출발지가 있는 동네(데이터의 district 이름)
REGION = {"인트라무로스": "Intramuros", "에르미타(리잘 공원)": "Ermita", "비논도": "Binondo", "UST(삼팔록)": "Sampaloc",
          "마카티": "Makati CBD", "퀘존시티(쿠바오)": "Cubao", "말라테": "Malate", "키아포": "Quiapo"}

# (이름, 출발지, 예산, 시작, 끝, foods, attractions, 취향 키워드)
PROFILES = [
    ("역사 덕후", "인트라무로스", 1000, "10:00", "16:00", [], ["history", "museum"],
     ["history", "museum", "heritage", "spanish", "fort", "colonial"]),
    ("길거리 음식", "비논도", 500, "13:00", "18:00", ["street food"], [],
     ["street food", "siopao", "dumpling", "snack", "food trip"]),
    ("가족 여행", "에르미타(리잘 공원)", 2000, "09:00", "17:00", ["filipino food"], ["family-friendly", "park"],
     ["family", "park", "nature", "filipino"]),
    ("기념품 쇼핑", "인트라무로스", 1500, "10:00", "15:00", [], ["souvenirs", "handicrafts"],
     ["souvenir", "handicraft", "craft", "local products", "handmade"]),
    ("저예산 배낭여행", "에르미타(리잘 공원)", 300, "10:00", "16:00", ["budget eats"], ["park"],
     ["budget", "park", "silog", "street food", "free"]),
    ("사진 찍기", "인트라무로스", 800, "15:00", "19:00", [], ["photography", "photo spot"],
     ["photo", "view", "baroque", "river", "scenic"]),
    ("UST 학생 3시간", "UST(삼팔록)", 400, "14:00", "17:00", ["filipino food"], [],
     ["filipino", "lutong bahay", "comfort", "dessert", "budget"]),
    ("마카티 퇴근 후", "마카티", 1200, "17:00", "21:00", ["filipino food"], ["culture"],
     ["filipino", "culture", "art", "local"]),
    ("퀘존시티 자연", "퀘존시티(쿠바오)", 1000, "09:00", "15:00", [], ["nature", "park"],
     ["nature", "park", "eco", "rainforest", "picnic", "wildlife"]),
    ("예술·공방", "비논도", 1500, "11:00", "17:00", [], ["arts", "pottery"],
     ["art", "pottery", "craft", "studio", "handmade", "workshop"]),
    ("하루 종일 알차게", "인트라무로스", 3000, "09:00", "19:00", ["street food", "dessert"], ["history"],
     ["history", "street food", "dessert", "heritage", "snack"]),
    ("디저트·카페", "에르미타(리잘 공원)", 600, "13:00", "17:00", ["dessert", "coffee"], [],
     ["dessert", "coffee", "cafe", "cake", "sweet", "halo"]),
    ("성당 투어", "인트라무로스", 500, "08:00", "12:00", [], ["church", "catholic heritage"],
     ["church", "catholic", "baroque", "cathedral", "basilica"]),
    ("차이나타운 푸드트립", "비논도", 800, "11:00", "16:00", ["dumplings", "binondo food trip"], [],
     ["dumpling", "siopao", "chinese", "binondo food", "noodle", "hopia"]),
    ("비 오는 날 실내", "에르미타(리잘 공원)", 1000, "10:00", "16:00", [], ["museum", "indoor attraction"],
     ["museum", "indoor", "gallery", "exhibit"]),
    ("2시간 짧게", "인트라무로스", 300, "16:00", "18:00", ["street food"], [],
     ["street food", "snack", "budget"]),
    ("아침 시장 구경", "키아포", 700, "07:00", "12:00", [], ["bargain market", "local products"],
     ["market", "bargain", "local products", "flower", "vendor"]),
    ("커플 데이트", "인트라무로스", 2500, "15:00", "21:00", ["filipino cuisine"], ["photo spot"],
     ["photo", "river", "view", "filipino", "romantic", "sunset"]),
    ("미식 여행", "말라테", 3000, "11:00", "20:00", ["filipino restaurant", "heritage dining"], [],
     ["filipino", "heritage", "restaurant", "dining", "cuisine"]),
    ("취향 없음", "인트라무로스", 1000, None, None, [], [], []),
]


# ─────────────────────────────────────────────
# 장소 데이터 읽기 (UST 엑셀 → DB 행 모양)
# ─────────────────────────────────────────────
def _txt(v):
    s = "" if v is None else str(v).strip()
    return s or None


def _int(v):
    try:
        return int(float(v)) if _txt(v) is not None else None
    except ValueError:
        return None


def load_rows(path):
    if path.endswith(".json"):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    from openpyxl import load_workbook
    wb = load_workbook(path, data_only=True, read_only=True)
    ws = wb["Places"] if "Places" in wb.sheetnames else wb.worksheets[0]
    it = ws.iter_rows(values_only=True)
    hdr = [(_txt(h) or "").lower() for h in next(it)]
    if hdr and not hdr[0]:
        hdr[0] = "place_id"  # UST 파일은 첫 열 제목이 지워져 있었음
    rows = []
    for v in it:
        r = dict(zip(hdr, v))
        if not _txt(r.get("name")) or r.get("lat") is None:
            continue
        rows.append({
            "place_id": _txt(r.get("place_id")), "name": _txt(r["name"]), "category": _txt(r.get("category")),
            "is_small_business": str(r.get("is_small_business") or "").lower().startswith(("y", "t", "1")),
            "local_score": _int(r.get("local_score")), "lat": float(r["lat"]), "lng": float(r["lng"]),
            "district": _txt(r.get("district")), "price_min": _int(r.get("price_min")),
            "price_max": _int(r.get("price_max")), "entry_fee": _int(r.get("entry_fee")) or 0,
            "avg_stay_minutes": _int(r.get("avg_stay_minutes")),
            "opening_hours": {d: _txt(r.get(f"hours_{d}")) for d in DAYS},
            "tags": [t.strip() for t in str(r.get("tags") or "").split(",") if t.strip()],
            "description": _txt(r.get("description")), "signature_menu": _txt(r.get("signature_menu")),
        })
    return rows


# ─────────────────────────────────────────────
# 일정 따라가기 (세 방법 모두 같은 계산으로 지표를 냄)
# ─────────────────────────────────────────────
def _opt(query):
    walk_km = 0.5 if query["walking"] == "minimal" else TRANSPORT["walkMaxKm"]
    return {**DEFAULTS, "transport": {**TRANSPORT, "walkMaxKm": walk_km}}


def simulate(order, places, start_loc, query, limits):
    """order(장소 인덱스 순서)대로 다녀오면 어떻게 되는지. 규칙을 하나라도 어기면 None"""
    opt = _opt(query)
    if len(order) > limits["maxStops"]:
        return None
    t, pos, cost = to_min(query["start"]), start_loc, 0
    walk = ride = wait = fare = meals = in_row = 0
    max_walk_leg = 0
    stops = []
    for i in order:
        p = places[i]
        if p["isMeal"]:
            meals += 1
            in_row += 1
            if meals > limits["maxMeals"] or in_row > limits["maxMealsInRow"]:
                return None
        else:
            in_row = 0
        mode, minutes, f = leg(pos, [p["lat"], p["lng"]], opt)
        t += minutes
        fare += f
        if mode == "walk":
            walk += minutes
            max_walk_leg = max(max_walk_leg, minutes)
        else:
            ride += minutes
        if t < to_min(p["opens"]):
            wait += to_min(p["opens"]) - t
            t = to_min(p["opens"])
        if t + p["stayMin"] > to_min(p["closes"]):
            return None
        stops.append({"place": p, "arrive": to_hhmm(t), "mode": mode})
        t += p["stayMin"]
        cost += p["costPhp"]
        pos = [p["lat"], p["lng"]]
    if stops:
        mode, minutes, f = leg(pos, list(start_loc), opt)
        t += minutes
        fare += f
        if mode == "walk":
            walk += minutes
            max_walk_leg = max(max_walk_leg, minutes)
        else:
            ride += minutes
    if t > to_min(query["end"]) or cost + fare > query["budgetPhp"]:
        return None
    return {"stops": stops, "walk": walk, "ride": ride, "wait": wait, "fare": fare, "spend": cost + fare,
            "end": t, "max_walk_leg": max_walk_leg}


def greedy(places, start_loc, query, limits, pick):
    """pick(후보 목록, 지금까지 순서) → 다음 장소. 넣을 수 있는 곳이 없을 때까지 반복"""
    order = []
    while True:
        cands = [i for i in range(len(places)) if i not in order and simulate(order + [i], places, start_loc, query, limits)]
        if not cands:
            return order
        order.append(pick(cands, order))


def nearest_first(places, start_loc, query, limits):
    opt = _opt(query)

    def pick(cands, order):
        pos = start_loc if not order else (places[order[-1]]["lat"], places[order[-1]]["lng"])
        return min(cands, key=lambda i: leg(list(pos), [places[i]["lat"], places[i]["lng"]], opt)[1])
    return greedy(places, start_loc, query, limits, pick)


def random_fill(places, start_loc, query, limits, seed):
    rng = random.Random(seed)
    return greedy(places, start_loc, query, limits, lambda cands, order: rng.choice(cands))


# ─────────────────────────────────────────────
# 지표
# ─────────────────────────────────────────────
def matches_taste(p, keywords):
    row = p["_row"]
    text = " ".join([row["name"], row.get("description") or "", " ".join(row.get("tags") or []),
                     row.get("signature_menu") or "", row.get("category") or ""]).lower()
    return any(k.lower() in text for k in keywords)


def metrics(sim, query, keywords):
    if not sim or not sim["stops"]:
        return None
    ps = [s["place"] for s in sim["stops"]]
    day = sim["end"] - to_min(query["start"])
    move = sim["walk"] + sim["ride"]
    return {
        "stops": len(ps),
        "walk_min": sim["walk"],
        "max_walk_leg": sim["max_walk_leg"],
        "move_min": move,
        "move_share": move / day if day else 0,
        "wait_min": sim["wait"],
        "fare": sim["fare"],
        "budget_use": sim["spend"] / query["budgetPhp"],
        "taste_match": sum(matches_taste(p, keywords) for p in ps) / len(ps) if keywords else None,
        "small_biz": sum(p["smallBiz"] for p in ps) / len(ps),
        "local_score": sum(p["score"] for p in ps) / len(ps),
    }


METHODS = ["TaraTrip", "가까운 곳부터", "무작위"]
LABEL = {
    "success": "추천 성공", "stops": "장소 수", "walk_min": "걷는 시간(분)", "max_walk_leg": "가장 긴 도보 구간(분)",
    "move_min": "이동 시간 합(분)", "move_share": "하루 중 이동 비율", "wait_min": "문 열기 기다린 시간(분)",
    "fare": "교통비(페소)", "budget_use": "예산 사용률", "taste_match": "취향 일치율",
    "small_biz": "소상공인 비율", "local_score": "현지 평점(1~10)",
}
PCT = {"move_share", "budget_use", "taste_match", "small_biz", "success"}


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        sys.exit(__doc__)
    rows = load_rows(args[0])
    weekday = DAYS[TRAVEL_DATE.weekday()]
    places = [p for p in (to_internal_place(r, weekday) for r in rows) if p]

    embed = None
    if "--real" in sys.argv:
        from keys import get_keys
        from core.personalize import embed_workers_ai
        keys = get_keys()
        embed = lambda t: embed_workers_ai(t, *keys)  # noqa: E731

    print(f"장소 {len(rows)}곳 (그날 문 연 곳 {len(places)}곳), 여행자 {len(PROFILES)}명, "
          f"취향 점수: {'임베딩(진짜 AI)' if embed else '태그 방식(키 없음)'}\n")
    detail = []
    for n, (name, start, budget, st, en, foods, attrs, keywords) in enumerate(PROFILES):
        loc = START[start]
        req = {"region": REGION[start], "budget": {"amount": budget, "currency": "PHP"}, "foods": foods, "attractions": attrs,
               "start_location": {"lat": loc[0], "lng": loc[1]}, "travel_date": TRAVEL_DATE.isoformat()}
        if st:
            req.update(start_time=st, end_time=en)
        query, _ = build_query(req, places, None)
        limits = _limits(query, req)
        by_id = {p["_row"]["place_id"]: i for i, p in enumerate(places)}

        try:
            res = recommend(req, rows, embed=embed, explain=False)
            tara = [by_id[s["place_id"]] for s in res["stops"]]
        except (BudgetTooLowError, NoResultsError):
            tara = []
        orders = {"TaraTrip": tara,
                  "가까운 곳부터": nearest_first(places, loc, query, limits),
                  "무작위": random_fill(places, loc, query, limits, seed=n)}
        for m, order in orders.items():
            sim = simulate(order, places, loc, query, limits) if order else None
            met = metrics(sim, query, keywords)
            detail.append({"여행자": name, "방법": m, "출발": start, "예산": budget,
                           "시간": f"{query['start']}~{query['end']}",
                           "코스": " → ".join(f"{s['arrive']} {s['place']['name']}" for s in sim["stops"]) if sim else "",
                           **({k: round(v, 3) for k, v in met.items() if v is not None} if met else {})})

    # 방법별 평균
    summary = {}
    for m in METHODS:
        ds = [d for d in detail if d["방법"] == m]
        ok = [d for d in ds if "stops" in d]
        avg = {"success": len(ok) / len(ds)}
        for k in LABEL:
            if k == "success":
                continue
            vals = [d[k] for d in ok if k in d]
            avg[k] = sum(vals) / len(vals) if vals else None
        summary[m] = avg

    def fmt(k, v):
        if v is None:
            return "-"
        return f"{v * 100:.0f}%" if k in PCT else (f"{v:.1f}" if k in ("stops", "local_score") else f"{v:.0f}")

    lines = ["| 지표 | " + " | ".join(METHODS) + " |", "|---|" + "---|" * len(METHODS)]
    for k, lab in LABEL.items():
        lines.append(f"| {lab} | " + " | ".join(fmt(k, summary[m][k]) for m in METHODS) + " |")
    table = "\n".join(lines)
    print(table)

    with open(os.path.join(HERE, "results.csv"), "w", encoding="utf-8-sig", newline="") as f:
        keys = ["여행자", "방법", "출발", "예산", "시간"] + [k for k in LABEL if k != "success"] + ["코스"]
        w = csv.DictWriter(f, fieldnames=keys, extrasaction="ignore")
        w.writeheader()
        w.writerows(detail)
    by = {}
    for d in detail:
        by.setdefault(d["여행자"], {})[d["방법"]] = d
    examples = []
    for name in ("기념품 쇼핑", "역사 덕후", "UST 학생 3시간"):
        if name in by:
            examples.append(f"**{name}**")
            for m in ("TaraTrip", "가까운 곳부터"):
                d = by[name].get(m, {})
                tm = f"{d['taste_match'] * 100:.0f}%" if "taste_match" in d else "-"
                examples.append(f"- {m} (취향 {tm}, 이동 {d.get('move_min', '-')}분): {d.get('코스', '')}")
            examples.append("")
    with open(os.path.join(HERE, "RESULTS.md"), "w", encoding="utf-8") as f:
        f.write(f"""# TaraTrip AI 평가 결과

- 장소 {len(rows)}곳(UST 리서치 데이터), 여행자 {len(PROFILES)}명, 여행일 {TRAVEL_DATE}
- 취향 점수: {'임베딩(진짜 AI)' if embed else '태그·키워드 방식(키 없음)'}
- 세 방법 모두 같은 규칙(영업시간, 예산, 종료 시각, 장소 수, 식사 제한, 이동수단)을 지킴. 차이는 "어떤 곳을 어떤 순서로 고르나"뿐
- 평균은 추천에 성공한 여행자 기준

{table}

## 읽는 법
- **취향 일치율**: 코스의 장소 중 여행자 취향 키워드(이름·설명·태그·대표 메뉴)가 들어간 곳의 비율
- **하루 중 이동 비율**: 출발부터 출발지로 돌아올 때까지 중 이동(도보 + 탈것)에 쓴 시간
- TaraTrip은 취향·소상공인·현지 평점을 챙기느라 "가까운 곳부터"보다 조금 더 이동함. 대신 문 열기를 기다리는 시간은 거의 없음

## 예시
{chr(10).join(examples)}
## 주의
- 받은 UST 데이터의 좌표가 소수점 2~3자리로 잘려 있어서(수백 m 오차) 이동 시간은 대략값
- 키 없이 돌리면 취향은 키워드 방식이라, 취향 일치율 지표와 같은 단어를 씀. 진짜 임베딩 결과는 `--real`로 확인
- 요금·속도는 recommend.py의 TRANSPORT 추정값

여행자별 전체 코스와 지표는 results.csv
""")
    print("\n저장: eval/results.csv, eval/RESULTS.md")


if __name__ == "__main__":
    main()
