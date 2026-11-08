"""
TaraTrip 1단계: 가짜 데이터로 동선 최적화 돌려보기
- 장소 데이터는 실습용 예시입니다. 가게 이름에 (가상)이 붙은 곳은 지어낸 곳이고,
  영업시간·비용도 실제와 다를 수 있어요. 나중에 UST 리서치 데이터로 교체하면 됩니다.
- 이동시간은 API 없이 "직선거리 → 도보시간"으로 대충 계산합니다.

실행: pip install ortools  →  python taratrip_step1.py
"""
import math
from ortools.constraint_solver import pywrapcp, routing_enums_pb2
import sys
sys.stdout.reconfigure(encoding="utf-8")


# ─────────────────────────────────────────────
# 1. 사용자 입력 (나중에 LLM이 문장을 해석해서 채워줄 부분)
# ─────────────────────────────────────────────
START_TIME = 13 * 60       # 13:00 (자정부터 몇 분째인지로 표현)
END_TIME = 17 * 60         # 20:00
BUDGET = 1500              # 페소
SMALL_BIZ_BONUS = 0        # 소상공인 가게 가산점 (TaraTrip의 핵심 컨셉)

# ─────────────────────────────────────────────
# 2. 장소 데이터 (나중에 UST 리서치 시트로 교체)
#    0번은 출발/도착 지점
# ─────────────────────────────────────────────
places = [
    # 이름,                         위도,     경도,      오픈, 마감, 체류(분), 비용, 소상공인, 기본점수
    ("출발지: 인트라무로스 Plaza Roma", 14.5915, 120.9737, 0,  24, 0,   0,   False, 0),
    ("Fort Santiago",                14.5951, 120.9706, 8,  22, 60,  75,  False, 8),
    ("San Agustin Church",           14.5888, 120.9752, 8,  17, 45,  200, False, 7),
    ("Manila Cathedral",             14.5916, 120.9733, 7,  20, 20,  0,   False, 5),
    ("Casa Manila",                  14.5889, 120.9758, 9,  18, 40,  75,  False, 5),
    ("Binondo Church",               14.6000, 120.9744, 6,  20, 20,  0,   False, 5),
    ("비논도 만두 가게 (가상)",        14.6008, 120.9750, 10, 21, 40,  250, True,  6),
    ("에스콜타 로컬 카페 (가상)",      14.5975, 120.9785, 9,  20, 45,  200, True,  5),
    ("Quiapo Church",                14.5988, 120.9837, 5,  21, 20,  0,   False, 6),
    ("키아포 수공예 시장 (가상)",      14.5982, 120.9844, 9,  19, 40,  400, True,  5),
    ("인트라무로스 할로할로 노점 (가상)", 14.5905, 120.9745, 11, 21, 25,  120, True,  5),
]

names = [p[0] for p in places]
coords = [(p[1], p[2]) for p in places]
windows = [(p[3] * 60, p[4] * 60) for p in places]
stay = [p[5] for p in places]
cost = [p[6] for p in places]
score = [p[8] + (SMALL_BIZ_BONUS if p[7] else 0) for p in places]


# ─────────────────────────────────────────────
# 3. 이동시간 행렬 (나중에 Google Maps API로 교체)
# ─────────────────────────────────────────────
def walk_minutes(a, b):
    """두 좌표 사이 도보 시간(분). 직선거리 × 1.3(골목 보정) ÷ 시속 4.5km"""
    lat1, lon1, lat2, lon2 = map(math.radians, (*a, *b))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    km = 2 * 6371 * math.asin(math.sqrt(h))
    return round(km * 1.3 / 4.5 * 60)


n = len(places)
travel = [[walk_minutes(coords[i], coords[j]) for j in range(n)] for i in range(n)]

# ─────────────────────────────────────────────
# 4. OR-Tools로 최적화 문제 세팅
# ─────────────────────────────────────────────
manager = pywrapcp.RoutingIndexManager(n, 1, 0)  # 장소 n개, 사람 1명, 0번에서 출발
routing = pywrapcp.RoutingModel(manager)


# (a) 이동 비용 = 이동시간 → 쓸데없이 왔다갔다하지 않게
def travel_cb(i, j):
    return travel[manager.IndexToNode(i)][manager.IndexToNode(j)]


travel_idx = routing.RegisterTransitCallback(travel_cb)
routing.SetArcCostEvaluatorOfAllVehicles(travel_idx)


# (b) 시간 제약: 현재 장소 체류시간 + 다음 장소까지 이동시간
def time_cb(i, j):
    a, b = manager.IndexToNode(i), manager.IndexToNode(j)
    return stay[a] + travel[a][b]


time_idx = routing.RegisterTransitCallback(time_cb)
routing.AddDimension(time_idx, 120, 24 * 60, False, "Time")  # 120 = 최대 대기 가능 시간(분)
time_dim = routing.GetDimensionOrDie("Time")

for node in range(1, n):
    idx = manager.NodeToIndex(node)
    open_t, close_t = windows[node]
    # 도착 시각은 오픈 이후, 그리고 마감 전에 체류를 끝낼 수 있어야 함
    time_dim.CumulVar(idx).SetRange(open_t, max(open_t, close_t - stay[node]))

time_dim.CumulVar(routing.Start(0)).SetRange(START_TIME, START_TIME)
time_dim.CumulVar(routing.End(0)).SetRange(START_TIME, END_TIME)


# (c) 예산 제약: 방문한 곳들의 비용 합 ≤ BUDGET
def cost_cb(i):
    return cost[manager.IndexToNode(i)]


cost_idx = routing.RegisterUnaryTransitCallback(cost_cb)
routing.AddDimensionWithVehicleCapacity(cost_idx, 0, [BUDGET], True, "Budget")
budget_dim = routing.GetDimensionOrDie("Budget")

# (d) 모든 곳을 다 갈 필요는 없음. 대신 빠뜨리면 점수만큼 벌점
#     → 점수 높은 곳(소상공인 포함)을 최대한 넣으려고 함
for node in range(1, n):
    routing.AddDisjunction([manager.NodeToIndex(node)], score[node] * 100)

# ─────────────────────────────────────────────
# 5. 풀기
# ─────────────────────────────────────────────
params = pywrapcp.DefaultRoutingSearchParameters()
params.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
params.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
params.time_limit.seconds = 5

solution = routing.SolveWithParameters(params)

# ─────────────────────────────────────────────
# 6. 결과 출력 (나중에 LLM이 자연스러운 설명으로 바꿔줄 부분)
# ─────────────────────────────────────────────
def hhmm(m):
    return f"{m // 60:02d}:{m % 60:02d}"


if not solution:
    print("조건에 맞는 동선을 찾지 못했어요. 예산이나 시간을 늘려보세요.")
else:
    print(f"\n📍 TaraTrip 추천 동선 ({hhmm(START_TIME)}~{hhmm(END_TIME)}, 예산 {BUDGET}페소)\n")
    idx = routing.Start(0)
    total_cost, visited = 0, []
    while not routing.IsEnd(idx):
        node = manager.IndexToNode(idx)
        arrive = solution.Value(time_dim.CumulVar(idx))
        if node != 0:
            tag = " 🏪소상공인" if places[node][7] else ""
            print(f"  {hhmm(arrive)}  {names[node]}  ({stay[node]}분, {cost[node]}페소){tag}")
            total_cost += cost[node]
            visited.append(node)
        nxt = solution.Value(routing.NextVar(idx))
        print(f"           ↓ 도보 {travel[node][manager.IndexToNode(nxt)]}분")
        idx = nxt
    print(f"  {hhmm(solution.Value(time_dim.CumulVar(idx)))}  {names[0]} 도착\n")
    print(f"총 비용: {total_cost}페소 / {BUDGET}페소")
    skipped = [names[i] for i in range(1, n) if i not in visited]
    if skipped:
        print("이번 동선에서 빠진 곳: " + ", ".join(skipped))
