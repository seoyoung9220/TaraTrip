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

## 명세에 없어서 일단 이렇게 정한 것 (합의 필요)

| 항목 | 지금 동작 |
|---|---|
| 폼 값과 `free_text`가 다를 때 | 폼 값 우선. 예산은 항상 폼 값, `free_text`는 시간·취향·제외할 곳 등 빈 곳만 채움 |
| 출발 시각 | 요청에 없어서 `free_text`에 시간이 있으면 사용, 없으면 10:00~16:00 |
| 이동 수단 | 지금은 전부 도보 (`walk`, 0페소). 첫 장소는 명세대로 `transport: null` |
| `est_cost` | 식당·시장·가게는 `price_min`~`price_max`의 가운데 값, 관광지는 `entry_fee` |
| `summary`, `reason` 언어 | `free_text`가 한국어면 한국어, 그 외엔 영어 |
| 영업시간 | 여행 날짜(기본: 마닐라 기준 오늘)의 요일 값 사용. `closed`면 제외, 비어 있으면 09:00-18:00으로 가정 |
| 장소 점수 | DB에 `local_score`가 없어서 모두 5점. 컬럼이 생기면 자동으로 사용 |
| `region` | `district`와 이름이 같으면 그 지역 우선, 아니면 무시 |

## 폴더 구조

```
AI/
├─ README.md
├─ recommend.py        ← 백엔드가 부르는 입구 (이것만 알면 됨)
├─ core/               ← 핵심 로직
│   ├─ parse_query.py     문장 → 조건 (LLM 프롬프트, 검증, 키워드 보정)
│   ├─ personalize.py     임베딩으로 취향 맞춤 점수
│   ├─ plan_route.py      시간·예산·영업시간 안에서 동선 최적화
│   ├─ assistant.py       대화형 버전 handle_request() (되묻기·대안 제안, 채팅 UI용)
│   └─ utils.py           공용 도구
├─ data/
│   └─ places.py          테스트용 가짜 장소 10곳
├─ demos/              ← 단계별 데모
│   ├─ demo.py, demo2.py, demo3.py
│   └─ keys.py            데모용 키 읽기
├─ tests/
│   └─ test_recommend.py  API.md 형식 검증
└─ legacy/
    └─ taratrip_step1.py  OR-Tools로 만든 첫 버전 (참고용, 실행엔 pip install ortools 필요)
```

## 실행 (AI 폴더 안에서)

```
python tests/test_recommend.py   # 형식 검증 (키 필요 없음)
python demos/demo3.py            # MOCK 모드
python demos/demo3.py --real     # 진짜 Workers AI (아래 키 파일 필요)
```

`--real`은 `AI/.env`에서 키를 읽어요. 이 파일은 저장소 `.gitignore`가 막아주니 절대 다른 이름으로 바꿔서 올리지 마세요.

```
CF_ACCOUNT_ID=여기에_계정ID
CF_API_TOKEN=여기에_API토큰
```

## 참고

처음엔 Cloudflare Workers에 올리려고 JS로 만들었다가, 백엔드가 FastAPI로 정해져서 파이썬으로 옮겼어요. 같은 입력에 JS 버전과 같은 결과가 나오는 것을 데모 3개와 무작위 동선 300개로 확인했어요.
