"""
TaraTrip 동선 추천 알고리즘 (파이썬 버전, planRoute.js를 그대로 옮김)
- OR-Tools 버전(taratrip_step1.py)과 같은 문제를 풉니다:
  "시간·예산 안에서 점수(소상공인 가산점 포함)가 최대가 되도록 장소를 골라 순서 정하기"
- 외부 라이브러리 없이 순수 파이썬

방법
  1) 삽입(Insertion): 넣었을 때 가장 이득인 장소를 가장 좋은 위치에 하나씩 넣기
  2) 개선(2-opt + 재배치 + 교체): 순서를 뒤집거나 옮겨보면서 더 좋아지면 채택
  3) 흔들기(Iterated Local Search): 일부를 빼고 다시 채워서 더 좋아지면 채택

목표 함수
  비용 = 총 이동시간(분) + Σ(빠진 장소 점수 × PENALTY_PER_POINT)
  → 이 값을 최소화 = 이동은 적게, 점수 높은 곳은 최대한 포함
"""
import math

from .utils import js_round, to_min, to_hhmm

INF = float("inf")

DEFAULTS = {
    "smallBizBonus": 5,      # 소상공인 가산점
    "penaltyPerPoint": 100,  # 장소를 빠뜨릴 때 점수 1점당 벌점 (이동 100분과 같은 무게)
    "walkSpeedKmh": 4.5,     # 걷는 속도
    "detourFactor": 1.3,     # 직선거리 → 실제 골목길 보정
    "waitWeight": 1,         # 가게 오픈 기다리는 1분 = 걷는 1분만큼 손해로 계산
    "travelWeight": 1,       # 걷는 1분의 무게 (걷기 싫은 사람은 크게 → 가까운 곳 위주)
    "stayFactor": 1,         # 체류시간 배율 (여유롭게 1.5, 빡빡하게 0.8)
    "maxLegMin": INF,        # 한 번에 걸을 수 있는 최대 시간(분). 걷기 싫은 사람은 12분 정도
    "iterations": 200,       # 흔들기 반복 횟수
    # 코스 길이·식사 제한 (기본은 제한 없음 = JS 버전과 같은 동작)
    "maxStops": INF,         # 하루 최대 장소 수
    "maxMeals": INF,         # 먹는 곳(장소의 isMeal=True) 최대 개수
    "maxMealsInRow": INF,    # 먹는 곳 최대 연속 개수 (2면 밥→카페까지 OK, 3연속 금지)
}


def walk_minutes(a, b, opt):
    """두 좌표 사이 도보 시간(분): 하버사인 직선거리 × 골목 보정 ÷ 걷는 속도"""
    R, rad = 6371, math.pi / 180
    d_lat, d_lng = (b[0] - a[0]) * rad, (b[1] - a[1]) * rad
    h = math.sin(d_lat / 2) ** 2 + math.cos(a[0] * rad) * math.cos(b[0] * rad) * math.sin(d_lng / 2) ** 2
    km = 2 * R * math.asin(math.sqrt(h))
    return js_round((km * opt["detourFactor"]) / opt["walkSpeedKmh"] * 60)


def plan_route(input):
    """
    input:
      budget: 숫자 (페소)
      start, end: "HH:MM"
      startLocation: [lat, lng]
      places: [{ name, lat, lng, opens:"HH:MM", closes:"HH:MM",
                 stayMin, costPhp, smallBiz:bool, score:1~10, isMeal:bool(선택) }]
      options: DEFAULTS 덮어쓰기 (선택)
    반환: { stops, totalCost, totalWalkMin, returnTime, returnWalkMin, skipped }
    """
    opt = {**DEFAULTS, **(input.get("options") or {})}
    START, END = to_min(input["start"]), to_min(input["end"])
    budget = input["budget"]
    P = [{
        **p,
        "stayMin": js_round(p["stayMin"] * opt["stayFactor"]),
        "open": to_min(p["opens"]),
        "close": to_min(p["closes"]),
        "value": p["score"] + (opt["smallBizBonus"] if p.get("smallBiz") else 0),
    } for p in input["places"]]
    n = len(P)

    # 이동시간 행렬: 인덱스 n = 출발지
    loc = [[p["lat"], p["lng"]] for p in P] + [input["startLocation"]]
    T = [[walk_minutes(a, b, opt) for b in loc] for a in loc]
    DEPOT = n

    def evaluate(route):
        """경로를 시간순으로 따라가며 가능한지 확인
        → 가능하면 (이동시간 + 기다린 시간 × 가중치), 불가능하면 None"""
        if len(route) > opt["maxStops"]:          # 코스가 너무 김
            return None
        t, prev, travel, cost = START, DEPOT, 0, 0
        meals = meals_in_row = 0
        for i in route:
            p = P[i]
            if p.get("isMeal"):                   # 먹는 곳 개수·연속 제한
                meals += 1
                meals_in_row += 1
                if meals > opt["maxMeals"] or meals_in_row > opt["maxMealsInRow"]:
                    return None
            else:
                meals_in_row = 0
            if T[prev][i] > opt["maxLegMin"]:   # 한 번에 너무 멀리 걷는 구간 금지
                return None
            t += T[prev][i]
            travel += T[prev][i] * opt["travelWeight"]
            if t < p["open"]:                   # 오픈 전이면 기다림
                travel += (p["open"] - t) * opt["waitWeight"]
                t = p["open"]
            if t + p["stayMin"] > p["close"]:   # 마감 전에 못 끝내면 불가
                return None
            t += p["stayMin"]
            cost += p["costPhp"]
            if cost > budget:                   # 예산 초과
                return None
            prev = i
        if T[prev][DEPOT] > opt["maxLegMin"]:
            return None
        t += T[prev][DEPOT]
        travel += T[prev][DEPOT] * opt["travelWeight"]
        if t > END:                             # 종료 시간 초과
            return None
        return travel

    def objective(route):
        travel = evaluate(route)
        if travel is None:
            return INF
        in_route = set(route)
        penalty = 0
        for i in range(n):
            if i not in in_route:
                penalty += P[i]["value"] * opt["penaltyPerPoint"]
        return travel + penalty

    # 1) 삽입: 가장 이득이 큰 (장소, 위치)를 반복해서 추가
    def insert_greedy(route, banned=frozenset()):
        best = objective(route)
        while True:
            cand = None
            for i in range(n):
                if i in route or i in banned:
                    continue
                for pos in range(len(route) + 1):
                    r = route[:pos] + [i] + route[pos:]
                    o = objective(r)
                    if o < best and (cand is None or o < cand[1]):
                        cand = (r, o)
            if cand is None:
                return route
            route, best = cand

    # 2) 개선: 더 이상 좋아지지 않을 때까지 반복
    def local_search(route):
        best = objective(route)
        improved = True
        while improved:
            improved = False

            def try_route(r):
                nonlocal route, best, improved
                o = objective(r)
                if o < best:
                    route, best, improved = r, o, True
                    return True
                return False

            # 2-opt: 구간 뒤집기
            a = 0
            while a < len(route) - 1 and not improved:
                b = a + 1
                while b < len(route) and not improved:
                    try_route(route[:a] + route[a:b + 1][::-1] + route[b + 1:])
                    b += 1
                a += 1
            # 재배치: 한 곳을 다른 위치로 옮기기
            a = 0
            while a < len(route) and not improved:
                rest = [x for k, x in enumerate(route) if k != a]
                pos = 0
                while pos <= len(rest) and not improved:
                    if pos != a:
                        try_route(rest[:pos] + [route[a]] + rest[pos:])
                    pos += 1
                a += 1
            # 교체: 빠진 장소를 새로 끼워넣거나, 경로 안의 장소와 바꿔보기
            i = 0
            while i < n and not improved:
                if i in route:
                    i += 1
                    continue
                pos = 0
                while pos <= len(route) and not improved:
                    try_route(route[:pos] + [i] + route[pos:])
                    pos += 1
                a = 0
                while a < len(route) and not improved:
                    r = list(route)
                    r[a] = i
                    try_route(r)
                    a += 1
                i += 1
        return route

    # 3) 흔들기: 처음 고른 곳에 갇히지 않도록 1~3곳을 빼고 다시 채우기를 반복
    #    난수는 JS 버전과 똑같은 수열이 나오도록 같은 계산(실수 연산)을 사용
    seed = 12345.0

    def rand():
        nonlocal seed
        seed = (seed * 1103515245.0 + 12345.0) % 2147483648.0
        return seed / 2147483648.0

    best_route = local_search(insert_greedy([]))
    best_obj = objective(best_route)
    it = 0
    while it < opt["iterations"] and len(best_route) > 0:
        k = 1 + math.floor(rand() * min(3, len(best_route)))  # 1~3곳 빼기
        r = list(best_route)
        removed = set()
        for _ in range(k):
            removed.add(r.pop(math.floor(rand() * len(r))))
        # 뺀 곳은 잠깐 금지하고 다른 곳으로 먼저 채운 뒤 → 남는 자리에 다시 허용
        r = local_search(insert_greedy(insert_greedy(r, removed)))
        o = objective(r)
        if o < best_obj:
            best_route, best_obj = r, o
        it += 1
    route = best_route

    # 결과 만들기
    stops = []
    t, prev, total_cost, total_walk = START, DEPOT, 0, 0
    for i in route:
        p = P[i]
        walk = T[prev][i]
        t += walk
        total_walk += walk
        if t < p["open"]:
            t = p["open"]
        stops.append({
            "name": p["name"], "arrive": to_hhmm(t), "walkMin": walk,
            "stay": p["stayMin"], "cost": p["costPhp"], "smallBiz": bool(p.get("smallBiz")),
        })
        t += p["stayMin"]
        total_cost += p["costPhp"]
        prev = i
    back = T[prev][DEPOT]
    t += back
    total_walk += back

    return {
        "stops": stops,
        "totalCost": total_cost,
        "totalWalkMin": total_walk,
        "returnTime": to_hhmm(t),
        "returnWalkMin": back,
        "skipped": [p["name"] for i, p in enumerate(P) if i not in route],
    }
