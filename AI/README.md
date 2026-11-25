# AI

Recommendation logic: rule-based filters + LLM, natural-language input parsing, route and budget allocation, recommendation explanations.

- Owner: Junwon Ko

파이썬 표준 라이브러리만 사용해요 (`pip install` 필요 없음, Python 3.9+).

## 백엔드에서 쓰는 법 (`POST /api/recommendations`)

`recommend()`가 `docs/API.md`의 요청 JSON을 받아서 응답 JSON을 그대로 돌려줘요.

```python
# BE/app/routers/recommendations.py 예시
import os, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "AI"))  # 저장소의 AI/ 폴더
from recommend import recommend, BudgetTooLowError, NoResultsError
from core.parse_query import call_workers_ai
from core.personalize import embed_workers_ai

ACC, TOK = os.environ["CF_ACCOUNT_ID"], os.environ["CF_API_TOKEN"]  # BE/.env에 추가

@router.post("/recommendations")
def create_recommendation(body: dict, conn=Depends(get_conn)):
    rows = conn.execute("select * from places").fetchall()
    try:
        return recommend(
            body, rows,
            call_llm=lambda m: call_workers_ai(m, ACC, TOK),
            embed=lambda t: embed_workers_ai(t, ACC, TOK),
        )
    except BudgetTooLowError as e:
        raise ApiError(422, "BUDGET_TOO_LOW", str(e))
    except NoResultsError as e:
        raise ApiError(422, "NO_RESULTS", str(e))
```

- `rows`는 `BE/db/schema.sql`의 places 행 그대로 넘기면 돼요 (dict 리스트).
- 응답에 디버깅용 `_debug` 키가 하나 더 있어요. `response_model`을 쓰면 자동으로 빠지고, 안 쓰면 `pop("_debug")` 해주세요.
- LLM이나 임베딩 호출이 실패해도 예외를 던지지 않고 폼 값만으로 추천해요. 그래서 `AI_TIMEOUT`은 백엔드 쪽 시간 제한에서만 나와요.
- 키가 없거나 테스트할 땐 `call_llm`, `embed`를 빼도 돼요 (폼 값 + 카테고리 태그로 추천).
- 설명 문장 언어는 `lang="ko"` 또는 `lang="en"`으로 정할 수 있어요. 안 넘기면 `free_text`의 언어, 그것도 없으면 한국어예요.

## 명세에 없어서 일단 이렇게 정한 것 (합의 필요)

| 항목 | 지금 동작 |
|---|---|
| 폼 값과 `free_text`가 다를 때 | 폼 값 우선. 예산은 항상 폼 값, `free_text`는 시간·취향·제외할 곳 등 빈 곳만 채움 |
| 출발·종료 시각 | `start_time`/`end_time` > `free_text`의 시간 > 기본 10:00~16:00. 여행 날짜는 `travel_date`(없으면 마닐라 기준 오늘)의 요일 영업시간 사용 |
| 이동 수단 | 거리(직선 × 1.3)가 1km 이하면 도보, 8km 미만이면 지프니, 그 이상은 택시. 걷는 게 더 빠르면 도보. "걷기 싫어"면 도보는 0.5km까지. 요금은 `recommend.py`의 `TRANSPORT` (지프니 최저 14페소는 2026년 9월 요금, km당·택시 요금은 추정) |
| 교통비 | `transport.cost` = `cost_breakdown.transport`. `total_cost` = 모든 장소의 `est_cost` + 모든 `transport.cost`(첫 장소 포함) + `return_transport.cost`. 화면 총액·`summary` 금액·예산 검사가 모두 같은 값 |
| 추천 이유·소개 | 동선이 정해진 뒤 LLM이 장소별 `reason`과 `summary` 앞의 소개 한 문장을 씀 (`core/explain.py`). 시간·요금·걷는 시간은 코드가 붙임. 해요체가 아니거나, 숫자·다른 나라 글자·"여행자는" 같은 제3자 말투가 들어가거나, 너무 길거나, 실패하면 그 부분만 템플릿 문장. 백엔드가 `explain_llm`으로 큰 모델(`EXPLAIN_MODEL`, Llama 3.3 70B)을 넘기면 한국어가 더 자연스러움. `explain=False`면 템플릿만 |
| 첫 구간·돌아가는 구간 | 출발지→첫 장소는 첫 장소의 `transport`에 채움. 마지막 장소→출발지는 응답 최상위 `return_transport` `{mode, minutes, cost}` |
| `est_cost` | 식당·시장·가게는 `price_min`~`price_max`의 가운데 값, 관광지는 `entry_fee` |
| `summary`, `reason` 언어 | `recommend(..., lang="ko")`로 넘긴 값이 최우선. 없으면 `free_text`의 언어, 그것도 없으면 한국어. 지금 문장은 한국어·영어만 있음 |
| 영업시간 | 여행 날짜(기본: 마닐라 기준 오늘)의 요일 값 사용. `closed`면 제외, 비어 있으면 09:00-18:00으로 가정 |
| 코스 길이 | 6시간 기준 최대 5곳 ("여유롭게" 4곳, "알차게" 6곳). 시간에 비례해서 조정 (3시간이면 3곳, 최대 +2곳까지). 시간·예산이 남아도 더 채우지 않음 |
| 먹는 곳 | 식당·카페·먹거리 시장 최대 2곳, 음식을 골랐거나 먹거리 위주 요청이면 3곳, 8시간 이상이면 +1곳. 3곳 연속 금지 (밥 → 카페까지는 OK). 공예품·잡화 시장은 먹는 곳으로 안 셈 |
| 식사 시간 | 식당은 점심(11:00~15:00, 늦은 점심 포함)·저녁(17:00~20:30)에 들어감. 실로그·다이너처럼 아침 메뉴가 있는 곳은 07:00~10:30도 가능. 바(이름·태그에 bar, craft beer 등)는 16:00부터. 식당·바끼리는 4시간 이상 간격(점심 먹고 바로 또 식당 금지). 카페·먹거리 시장은 아무 때나. 성격은 이름·태그로 판단 (`MEAL_TIMES`, `meal_kind()`) |
| 장소 점수 | DB의 `local_score`(없으면 5점) + 취향 + 소상공인 + 꼭 가기, 그다음 거리 감점. 점수 1점 = 이동 20분으로 저울질 (`PENALTY_PER_POINT`) |
| `region` | `district`와 대소문자 무시하고 같으면 그 지역 우선. 거리 기준점은 선택한 지역 장소들의 중심(없으면 출발지)이고, 1.5km 넘게 떨어진 곳은 1km마다 4점 감점 (`FREE_RADIUS_KM`, `FAR_PENALTY_PER_KM`). 동네 이름이 달라도 가까우면 괜찮음 |
| 관광지(`attractions`) | 장소 이름과 거의 같으면 꼭 가기(가장 잘 맞는 한 곳만), `museum` 같은 일반 단어면 취향으로 봄 |
| 임베딩이 없을 때 취향 | 고른 음식·관광지 단어가 장소 이름·태그·설명·대표 메뉴에 있으면 +8점, 그 중 소상공인은 +5점(아니면 +2점). 취향 우선, 그 안에서 소상공인 우대 |

## 폴더 구조

```
AI/
├─ README.md
├─ recommend.py        ← 백엔드가 부르는 입구 (이것만 알면 됨)
├─ core/               ← 핵심 로직
│   ├─ parse_query.py     문장 → 조건 (LLM 프롬프트, 검증, 키워드 보정)
│   ├─ personalize.py     임베딩으로 취향 맞춤 점수
│   ├─ plan_route.py      시간·예산·영업시간 안에서 동선 최적화
│   ├─ explain.py         LLM이 추천 이유·코스 소개 쓰기 (해요체 검사, 실패 시 템플릿)
│   ├─ assistant.py       대화형 버전 handle_request() (되묻기·대안 제안, 채팅 UI용)
│   └─ utils.py           공용 도구
├─ data/
│   └─ places.py          테스트용 가짜 장소 10곳
├─ demos/              ← 단계별 데모
│   ├─ demo.py, demo2.py, demo3.py
│   └─ keys.py            데모용 키 읽기
├─ tests/
│   └─ test_recommend.py  API.md 형식 검증
├─ eval/
│   ├─ run_eval.py        성능 평가 (여행자 20명 × TaraTrip / 가까운 곳부터 / 무작위)
│   └─ RESULTS.md         최근 평가 결과 (발표용 표와 예시)
└─ legacy/
    └─ taratrip_step1.py  OR-Tools로 만든 첫 버전 (참고용, 실행엔 pip install ortools 필요)
```

## 실행 (AI 폴더 안에서)

```
python tests/test_recommend.py   # 형식 검증 (키 필요 없음)
python demos/demo3.py            # MOCK 모드
python demos/demo3.py --real     # 진짜 Workers AI (아래 키 파일 필요)
python demos/demo_explain.py --real   # 추천 이유 문장: 템플릿 / 작은 모델 / 큰 모델 비교
python eval/run_eval.py 장소.xlsx     # 성능 평가 (UST 엑셀 또는 DB 행 JSON, openpyxl 필요). --real이면 진짜 임베딩
```

`--real`은 `AI/.env`에서 키를 읽어요. 이 파일은 저장소 `.gitignore`가 막아주니 절대 다른 이름으로 바꿔서 올리지 마세요.

```
CF_ACCOUNT_ID=여기에_계정ID
CF_API_TOKEN=여기에_API토큰
```

## 참고

처음엔 Cloudflare Workers에 올리려고 JS로 만들었다가, 백엔드가 FastAPI로 정해져서 파이썬으로 옮겼어요. 같은 입력에 JS 버전과 같은 결과가 나오는 것을 데모 3개와 무작위 동선 300개로 확인했어요.
