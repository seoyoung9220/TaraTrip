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
import time

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
    "timeLimitSec": None,    # 흔들기 시간 상한(초). 넘으면 그때까지 찾은 가장 좋은 경로로 끝냄 (느린 서버용)
    # 코스 길이·식사 제한 (기본은 제한 없음 = JS 버전과 같은 동작)
    "maxStops": INF,         # 하루 최대 장소 수
    "maxMeals": INF,         # 먹는 곳(장소의 isMeal=True) 최대 개수
    "maxMealsInRow": INF,    # 먹는 곳 최대 연속 개수 (2면 밥→카페까지 OK, 3연속 금지)
    # 식사 시간 (None = 아무 때나, JS 버전과 같은 동작). 쓰려면 MEAL_TIMES_EXAMPLE 같은 dict를 넘김
    #   장소의 mealKind: "meal"(식당) / "breakfast"(아침도 되는 식당) / "bar" / "snack"(카페·먹거리 시장, 시간 제한 없음)
    "mealTimes": None,
    # 같은 그룹(예: 고른 음식 "halo-halo"가 들어간 곳) 최대 개수. 장소의 groups 목록으로 판단 (None = 제한 없음)
    "maxPerGroup": None,
    # 이동수단 (None = 전부 도보, JS 버전과 같은 동작). 쓰려면 TRANSPORT_EXAMPLE 같은 dict를 넘김
    "transport": None,
}

# 이동수단 설정 예시 (recommend.py가 마닐라 요금으로 채워서 넘김)
#   거리(골목 보정한 km)가 walkMaxKm 이하면 도보, taxiMinKm 미만이면 지프니, 그 이상이면 택시
#   단, 걸어서 가는 게 타는 것보다 빠르면 도보
TRANSPORT_EXAMPLE = {
    "walkMaxKm": 1.0,
    "jeepney": {"speedKmh": 12, "waitMin": 10, "baseFare": 14, "baseKm": 4, "perKm": 2},
    "taxiMinKm": 8,
    "taxi": {"speedKmh": 18, "waitMin": 5, "flagDown": 50, "perKm": 15, "perMin": 2},
}


# 식사 시간 예시 (recommend.py가 넘김). 식당은 점심·저녁 시간에만 들어가고, 식사끼리는 간격을 둠
# 간격은 그 사이에 얼마나 움직였는지로 정함: 걷거나 활동적인 곳(공원·요새·시장 등)에 있던 시간만큼
# gapMaxMin(6시간)에서 줄어들고, 아무리 많이 움직여도 gapMin(4시간)보다 짧아지지 않음
#   예) 14시 점심 → 많이 걸었으면 18시부터, 카페·박물관처럼 앉아만 있었으면 20시부터 저녁
MEAL_TIMES_EXAMPLE = {
    "breakfast": ["07:00", "10:30"],  # mealKind "breakfast"만 (실로그·다이너 등)
    "lunch": ["11:00", "15:00"],      # 들어가는 시각 기준
    "dinner": ["17:00", "20:30"],
    "barFrom": "16:00",               # 바는 이 시각부터
    "gapMin": 240,                    # 식사(식당·바) 시작 시각끼리 최소 간격 (많이 움직였을 때)
    "gapMaxMin": 360,                 # 거의 안 움직였을 때 간격
}


def road_km(a, b, opt):
    """두 좌표 사이 거리(km): 하버사인 직선거리 × 골목 보정"""
    R, rad = 6371, math.pi / 180
    d_lat, d_lng = (b[0] - a[0]) * rad, (b[1] - a[1]) * rad
    h = math.sin(d_lat / 2) ** 2 + math.cos(a[0] * rad) * math.cos(b[0] * rad) * math.sin(d_lng / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h)) * opt["detourFactor"]


def walk_minutes(a, b, opt):
    """두 좌표 사이 도보 시간(분)"""
    return js_round(road_km(a, b, opt) / opt["walkSpeedKmh"] * 60)


def leg(a, b, opt):
    """한 구간 이동 → (수단, 걸리는 분, 요금 페소)"""
    walk = walk_minutes(a, b, opt)
    tr = opt.get("transport")
    if not tr:
        return "walk", walk, 0
    km = road_km(a, b, opt)
    if km <= tr["walkMaxKm"]:
        return "walk", walk, 0
    if km < tr["taxiMinKm"]:
        j = tr["jeepney"]
        minutes = j["waitMin"] + js_round(km / j["speedKmh"] * 60)
        fare = j["baseFare"] + max(0, math.ceil(km - j["baseKm"])) * j["perKm"]
        mode = "jeepney"
    else:
        x = tr["taxi"]
        ride = js_round(km / x["speedKmh"] * 60)
        minutes = x["waitMin"] + ride
        fare = js_round(x["flagDown"] + x["perKm"] * km + x["perMin"] * ride)
        mode = "taxi"
    if walk <= minutes:  # 타는 것보다 걷는 게 빠르면 도보
        return "walk", walk, 0
    return mode, minutes, fare


def plan_route(input):
    """
    input:
      budget: 숫자 (페소)
      start, end: "HH:MM"
      startLocation: [lat, lng]
      endLocation: [lat, lng] (선택) 마지막 장소 다음에 갈 곳. 없으면 startLocation (왕복)
      places: [{ name, lat, lng, opens:"HH:MM", closes:"HH:MM",
                 stayMin, costPhp, smallBiz:bool, score:1~10, isMeal:bool(선택), mealKind(선택) }]
      options: DEFAULTS 덮어쓰기 (선택)
    반환: { stops, totalCost, totalWalkMin, totalFare, returnTime, returnWalkMin, returnMode, returnFare, skipped }
      stops[i]: { name, arrive, walkMin(이동 분, 수단 무관), mode, fare, stay, cost, smallBiz }
      totalCost = 장소 비용 + 모든 교통비(출발지→첫 장소, 마지막 장소→도착지 포함)
      return* = 마지막 장소 → 도착지(endLocation, 없으면 출발지) 구간
      totalWalkMin = 실제로 걷는 구간의 분만 합친 값
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

    # 이동 행렬: 인덱스 n = 출발지, n+1 = 도착지 (따로 없으면 출발지와 같은 곳). T = 분, F = 요금, M = 수단
    loc = [[p["lat"], p["lng"]] for p in P] + [input["startLocation"], input.get("endLocation") or input["startLocation"]]
    L = [[leg(a, b, opt) for b in loc] for a in loc]
    M = [[x[0] for x in row] for row in L]
    T = [[x[1] for x in row] for row in L]
    F = [[x[2] for x in row] for row in L]
    DEPOT, FINISH = n, n + 1

    mt = opt["mealTimes"]
    if mt:
        win = {k: (to_min(mt[k][0]), to_min(mt[k][1])) for k in ("breakfast", "lunch", "dinner")}
        WINDOWS = {
            "meal": [win["lunch"], win["dinner"]],
            "breakfast": [win["breakfast"], win["lunch"], win["dinner"]],
            "bar": [(to_min(mt["barFrom"]), 48 * 60)],
        }

    def meal_gap(active):
        """마지막 식사 뒤 움직인 시간(분)에 따라 다음 식사까지 간격"""
        return max(mt["gapMin"], mt.get("gapMaxMin", mt["gapMin"]) - active)

    def visit_start(p, t, last_meal, active=0):
        """t에 도착했을 때 실제로 들어가는 시각 (오픈·식사 시간까지 기다림). 갈 수 없으면 None"""
        s = max(t, p["open"])
        kind = p.get("mealKind")
        if mt and kind in WINDOWS:
            if last_meal is not None:
                s = max(s, last_meal + meal_gap(active))  # 점심 먹고 바로 또 식당 금지
            for ws, we in WINDOWS[kind]:
                if max(s, ws) <= we:
                    s = max(s, ws)
                    break
            else:
                return None
        if s + p["stayMin"] > p["close"]:   # 마감 전에 못 끝내면 불가
            return None
        return s

    def leg_cost(i, j):
        """목표 함수에 더할 이동 비용: 걷는 분은 travelWeight만큼 무겁게, 타는 분은 그대로"""
        return T[i][j] * (opt["travelWeight"] if M[i][j] == "walk" else 1)

    def too_far_on_foot(i, j):
        """maxLegMin은 걷는 구간에만 적용 (타는 구간은 길어도 괜찮음)"""
        return M[i][j] == "walk" and T[i][j] > opt["maxLegMin"]

    def evaluate(route):
        """경로를 시간순으로 따라가며 가능한지 확인
        → 가능하면 (이동시간 + 기다린 시간 × 가중치), 불가능하면 None"""
        if len(route) > opt["maxStops"]:          # 코스가 너무 김
            return None
        t, prev, travel, cost = START, DEPOT, 0, 0
        meals = meals_in_row = 0
        last_meal = None                          # 마지막 식사(식당·바) 시작 시각
        active = 0                                # 마지막 식사 뒤 걷거나 활동한 시간(분)
        groups = {}                               # 그룹별 방문 수
        for i in route:
            p = P[i]
            if p.get("isMeal"):                   # 먹는 곳 개수·연속 제한
                meals += 1
                meals_in_row += 1
                if meals > opt["maxMeals"] or meals_in_row > opt["maxMealsInRow"]:
                    return None
            else:
                meals_in_row = 0
            if opt["maxPerGroup"]:                # 같은 음식만 두 번 먹으러 가지 않게
                for g in p.get("groups") or ():
                    groups[g] = groups.get(g, 0) + 1
                    if groups[g] > opt["maxPerGroup"]:
                        return None
            if too_far_on_foot(prev, i):        # 한 번에 너무 멀리 걷는 구간 금지
                return None
            t += T[prev][i]
            travel += leg_cost(prev, i)
            cost += F[prev][i]                  # 교통비도 예산에 포함
            if M[prev][i] == "walk":
                active += T[prev][i]
            s = visit_start(p, t, last_meal, active)  # 오픈·식사 시간 전이면 기다림
            if s is None:
                return None
            travel += (s - t) * opt["waitWeight"]
            t = s
            if p.get("mealKind") in ("meal", "breakfast", "bar"):
                last_meal, active = t, 0
            elif p.get("active"):
                active += p["stayMin"]
            t += p["stayMin"]
            cost += p["costPhp"]
            if cost > budget:                   # 예산 초과
                return None
            prev = i
        if too_far_on_foot(prev, FINISH):
            return None
        t += T[prev][FINISH]
        travel += leg_cost(prev, FINISH)
        cost += F[prev][FINISH]                 # 도착지까지 가는 교통비도 예산 안에
        if t > END or cost > budget:            # 종료 시간·예산 초과
            return None
        return travel

    memo = {}  # 같은 경로를 여러 번 평가하므로 결과를 기억해 둠 (결과는 그대로, 속도만 빨라짐)

    def objective(route):
        key = tuple(route)
        if key in memo:
            return memo[key]
        travel = evaluate(route)
        if travel is None:
            o = INF
        else:
            in_route = set(route)
            penalty = 0
            for i in range(n):
                if i not in in_route:
                    penalty += P[i]["value"] * opt["penaltyPerPoint"]
            o = travel + penalty
        memo[key] = o
        return o

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

    started = time.monotonic()
    best_route = local_search(insert_greedy([]))
    best_obj = objective(best_route)
    it = 0
    while it < opt["iterations"] and len(best_route) > 0:
        if opt["timeLimitSec"] and time.monotonic() - started > opt["timeLimitSec"]:
            break  # 느린 서버: 시간 상한까지 찾은 가장 좋은 경로로 끝냄
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
    t, prev, total_cost, total_walk, total_fare = START, DEPOT, 0, 0, 0
    last_meal, active = None, 0
    for i in route:
        p = P[i]
        move = T[prev][i]
        t += move
        if M[prev][i] == "walk":
            total_walk += move
            active += move
        total_fare += F[prev][i]
        t = visit_start(p, t, last_meal, active)
        if p.get("mealKind") in ("meal", "breakfast", "bar"):
            last_meal, active = t, 0
        elif p.get("active"):
            active += p["stayMin"]
        stops.append({
            "name": p["name"], "arrive": to_hhmm(t), "walkMin": move,
            "mode": M[prev][i], "fare": F[prev][i],
            "stay": p["stayMin"], "cost": p["costPhp"], "smallBiz": bool(p.get("smallBiz")),
        })
        t += p["stayMin"]
        total_cost += p["costPhp"]
        prev = i
    back = T[prev][FINISH]
    t += back
    if M[prev][FINISH] == "walk":
        total_walk += back
    total_fare += F[prev][FINISH]

    return {
        "stops": stops,
        "totalCost": total_cost + total_fare,
        "totalWalkMin": total_walk,
        "totalFare": total_fare,
        "returnTime": to_hhmm(t),
        "returnWalkMin": back,
        "returnMode": M[prev][FINISH],
        "returnFare": F[prev][FINISH],
        "skipped": [p["name"] for i, p in enumerate(P) if i not in route],
    }
