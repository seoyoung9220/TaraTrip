# TaraTrip

**An AI platform that connects tourists with small local businesses in the Philippines and recommends one-day travel routes that fit a budget.**

> 2026 Global Extracurricular Program (SCH-UST) · Team **Let's Go**
> Soonchunhyang University (IoT) × University of Santo Tomas (Tourism Management)

**Live demo: https://tara-trip.vercel.app**

[한국어](#한국어)

---

## About

Small businesses near tourist sites find it hard to promote themselves online and reach international tourists. Tourists, in turn, find it hard to plan a route that covers the food and attractions they want, and harder still when they also have to stay on a budget.

TaraTrip asks for the traveler's location, food preferences, the attractions they want to see, and a daily budget. It then recommends a one-day route that links local restaurants, traditional markets, small shops and attractions. Each stop gets an estimated cost within the budget, and the route order is shown on a map.

> e.g. *"I want to try local food in Manila for about 20,000 KRW today."*

Small businesses' store information feeds the recommendations. More tourist visits bring more sales, and more sales bring more businesses onto the platform.

## Features

**Travelers**
- Input: region, daily budget (₱), trip date, start and end time, start and end location (current location, address search or a point on the map), favorite foods, must-see places (searchable, tolerates typos), and a free-text request
- Result: a one-day route on a map with numbered stops along the roads, arrival time and estimated cost per stop, transport between stops (walk, jeepney or taxi) with its fare, and a short reason for each stop
- Place detail: photos, opening hours, price range, signature menu, and whether the place is cash only
- Prices in PHP with the KRW equivalent from a live exchange rate
- Korean and English screens

**Small businesses**
- Register and edit their own place (an edit key is given once at registration); a registered place becomes a recommendation candidate right away
- Promotion helper: writes English promotional text from the place's information

## MVP Scope (5 weeks)

- **One target region** (chosen by the UST team in Week 1)
- **One core feature:** budget input → route recommendation that includes local small businesses
- Recommendations use **rules + an LLM API**, based on criteria defined by the UST team
- Small-business promotion assistant (English promo text, menu translation): *stretch goal*, built only if time allows
- The presentation covers expansion plans to other regions

## Team

| Team | Member | Role |
|---|---|---|
| SCH (IoT) | **Junwon Ko** (Team Lead) | AI |
| SCH (IoT) | **Seoyoung Heo** | Full-stack A: Traveler Service |
| SCH (IoT) | **Hyungeun Kim** | Full-stack B: Data, Business & Infra |
| UST (Tourism Mgmt.) | Kian Nil Adrienne Roxas | Tourism domain |
| UST (Tourism Mgmt.) | Keisha Nicole Bagtas | Tourism domain |
| UST (Tourism Mgmt.) | Ana Maria Martha Baylon | Tourism domain |

**Principle:** the SCH team builds the technology, and the UST team owns the tourism domain (what TaraTrip recommends, and why).

## Roles: SCH Team

Full-stack work is split **by feature, not by frontend/backend**. Each person builds their features end to end, from UI to API to DB, so nobody waits on anyone else.

### AI: Junwon Ko
- Turn the UST team's **recommendation criteria** into logic: rule-based filters (budget, opening hours, distance) plus an LLM
- Parse natural-language input into budget, food preferences and attractions
- Generate routes: stop order, time spent at each stop, and how the budget splits across food, entry fees and transport
- Generate a short explanation for each recommendation
- *(Stretch)* Prompts for the promotion assistant: English promo text and menu translation
- Revise the logic and prompts based on UST feedback in Week 4

### Full-stack A, Traveler Service: Seoyoung Heo
- Screen design and overall UI structure (Week 1)
- **Budget and preference input screen**, and the **recommendation result screen**
- **Map view** with route order and the estimated cost of each stop
- Recommendation API: receives requests from the frontend, calls the AI module, returns the result
- Place detail API and screen
- Frontend deployment on Vercel
- Integration in Week 4; owns the demo flow

### Full-stack B, Data, Business & Infra: Hyungeun Kim
- Repo structure, deployment setup, and the tech stack decision (Week 1)
- **DB schema**: businesses, attractions, price range, opening hours, location
- **Agree on the local data template with UST**; build the spreadsheet → DB import script
- Place list and search API (the AI module uses it to fetch candidate places)
- Business registration and edit screens and API
- *(Stretch)* Promotion assistant UI, connected to the AI prompts
- Backend deployment on Render, stability and bug fixes

### Shared
- **Fix the API spec (request/response JSON) together in Week 1.** All parallel work builds on it.
- The SCH team gives the presentation:
  - Junwon: problem definition, UST collaboration, AI logic
  - Seoyoung: live demo
  - Hyungeun: system architecture, data flow, expansion plan

## Timeline

| Week | AI (Junwon) | Full-stack A (Seoyoung) | Full-stack B (Hyungeun) | UST Team |
|---|---|---|---|---|
| 1 | Review criteria, choose LLM API, design output format | Wireframes / screen design | Tech stack, repo, DB schema, data template | Pick target region, define criteria and personas |
| 2 | Draft rule filters and route generation (dummy data) | Input and result screens | DB and server, place API, import script | Collect local data |
| 3 | Connect real data, budget split, explanations | Map integration, connect recommendation API | Load real data, business features | Fill data gaps, business model |
| 4 | Apply UST feedback to the logic | Integration, prototype complete, Vercel deployment | Backend deployment (Render), *(stretch)* promotion assistant | User testing, validate routes |
| 5 | Stabilize recommendations for the demo | Polish the demo scenario | Bug fixes, server stability | Provide local materials for the presentation |

## Repository Structure

```
TaraTrip/
├── AI/          # Recommendation logic (rules + LLM), evaluation
├── FE/          # Frontend (React + Vite)
├── BE/          # Backend (FastAPI server, DB schema, data scripts)
├── design/      # Wireframes (Figma plugin that draws the traveler screens)
├── docs/        # API spec, deployment guide, UST data template
└── render.yaml  # Render deployment settings for the backend
```

Full-stack members work in both `FE/` and `BE/` on the features they own.

Each part has its own README with more detail: [AI](AI/README.md) · [BE](BE/README.md) · [FE](FE/README.md) · [API spec](docs/API.md) · [Deploy](docs/DEPLOY.md)

## Tech Stack

| Area | Choice |
|---|---|
| Frontend | React 19 (Vite) + TypeScript, React Router, mobile-first |
| Map | Leaflet + OpenStreetMap; road routes from OSRM |
| Backend | FastAPI (Python), imports the AI module directly |
| Database | Supabase (PostgreSQL) |
| AI | Cloudflare Workers AI: Llama 3.1 8B Instruct (free-text parsing, recommendation reasons), bge-base-en-v1.5 (embeddings for taste matching), Llama 3.3 70B Instruct (promotion helper, Korean translation of place text) |
| Currency | PHP, with KRW shown alongside (Frankfurter / open.er-api.com exchange rates) |
| Deployment | Frontend on Vercel, backend on Render |

## Getting Started

### Requirements

- **Node.js** 20.19+ or 22.12+ (needed by Vite 8)
- **Python** 3.14 (the version Render uses; the AI module alone runs on 3.9+ with the standard library only)
- Optional, only for the full setup: a Supabase `DATABASE_URL` (ask Hyungeun) and Cloudflare Workers AI keys `CF_ACCOUNT_ID` / `CF_API_TOKEN` (ask Junwon)

Run every command below from the repository root unless it says otherwise.

### Option 1. Frontend only, with mock data (no backend needed)

The quickest way to see the screens. Responses come from `FE/src/api/mock.ts` (sample data, not real places).

```bash
cd FE
npm install
cp .env.example .env.local      # Windows: copy .env.example .env.local
npm run dev                     # http://localhost:5173
```

`.env.local` has `VITE_USE_MOCK=true` by default. See [FE/README.md](FE/README.md) for how to show each error screen in mock mode.

### Option 2. Frontend + backend with sample places (no database needed)

Runs the real recommendation logic on 10 placeholder places (`BE/dev/sample_places.py`, made-up prices and hours). No `.env` needed.

**1) Backend** (terminal 1)

```bash
cd BE
python -m venv .venv
# macOS / Linux
.venv/bin/python -m pip install -r requirements.txt -r requirements-dev.txt
.venv/bin/python -m uvicorn dev.fake_server:app --reload --port 8000
# Windows
.venv\Scripts\python.exe -m pip install -r requirements.txt -r requirements-dev.txt
.venv\Scripts\python.exe -m uvicorn dev.fake_server:app --reload --port 8000
```

Check http://localhost:8000/api/health → `{"status":"ok"}`.

**2) Frontend** (terminal 2): set `VITE_USE_MOCK=false` in `FE/.env.local`, then

```bash
cd FE
npm run dev
```

The Vite dev server forwards `/api` requests to `http://localhost:8000`.

### Option 3. Full setup with the real database

Same as Option 2, but the backend reads the real places from Supabase.

**1) Create `BE/.env`**

```
DATABASE_URL=postgresql://...        # Supabase session pooler URL (ask Hyungeun)
CF_ACCOUNT_ID=...                    # optional: free-text parsing and taste matching (ask Junwon)
CF_API_TOKEN=...                     # optional
AI_TIMEOUT_SECONDS=20                # optional, default 20; past this the API answers 504 AI_TIMEOUT
```

Without the Cloudflare keys, routes are still recommended from the form fields and category tags only.

**2) Run the backend**

```bash
cd BE
# macOS / Linux
.venv/bin/python -m uvicorn app.main:app --reload --port 8000
# Windows
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

**3) Run the frontend** with `VITE_USE_MOCK=false`, as in Option 2.

### Environment variables

| Where | Variable | Required | Meaning |
|---|---|---|---|
| `FE/.env.local` | `VITE_USE_MOCK` | yes | `true`: mock data, `false`: call the backend |
| `FE/.env.local` | `VITE_ROUTING_URL` | no | OSRM server for road routes. Default: the public demo server. Empty: straight lines |
| `BE/.env` | `DATABASE_URL` | Option 3 | Supabase session pooler URL |
| `BE/.env` | `CF_ACCOUNT_ID`, `CF_API_TOKEN` | no | Cloudflare Workers AI keys for free-text parsing, taste matching and the promotion helper |
| `BE/.env` | `AI_TIMEOUT_SECONDS` | no | Time limit for one recommendation. Default 20 (Render uses 45) |
| `AI/.env` | `CF_ACCOUNT_ID`, `CF_API_TOKEN` | no | Same keys, for the AI demos with `--real` |

`.env` files are blocked by `.gitignore`. Never commit them under another name.

## Tests

```bash
# Backend (DB is faked, no .env needed)
cd BE
.venv/bin/python -m pytest              # Windows: .venv\Scripts\python.exe -m pytest

# AI module (format check, no keys needed)
cd AI
python tests/test_recommend.py

# Frontend (type check + production build, lint)
cd FE
npm run build
npm run lint
```

## AI Demos and Evaluation

Run inside `AI/`. See [AI/README.md](AI/README.md) for details.

```bash
python demos/demo3.py                    # mock mode, no keys
python demos/demo3.py --real             # real Workers AI (needs AI/.env)
python demos/demo_explain.py --real      # compare recommendation reason sentences: template / small model / large model
python eval/run_eval.py places.xlsx      # evaluation: 20 travelers × TaraTrip / nearest-first / random (needs openpyxl)
```

The latest evaluation results are in [AI/eval/RESULTS.md](AI/eval/RESULTS.md).

## Loading Place Data (UST spreadsheet → DB)

Needs `DATABASE_URL` in `BE/.env`. Run from the repository root (Windows: `BE\.venv\Scripts\python.exe` instead of `BE/.venv/bin/python`).

```bash
BE/.venv/bin/python BE/scripts/apply_schema.py                                  # create or update the tables (safe to re-run)
BE/.venv/bin/python BE/scripts/import_places.py path/to/filled.xlsx --dry-run   # check only, write nothing
BE/.venv/bin/python BE/scripts/import_places.py path/to/filled.xlsx             # write to the DB
BE/.venv/bin/python BE/scripts/translate_places.py                              # Korean place text (needs the Cloudflare keys)
```

- If any row has a problem, nothing is written and every problem is listed by row, so the list can be sent straight back to UST.
- Re-importing a corrected sheet updates rows by `place_id`; it never duplicates them.
- The blank template is `docs/data-template/TaraTrip_Places_Template.xlsx` (rebuild it with `BE/scripts/make_data_template.py`).

## Deployment

| Part | Service | Address |
|---|---|---|
| Frontend | Vercel (project root `FE/`) | https://tara-trip.vercel.app |
| Backend | Render (`render.yaml`) | https://taratrip-api.onrender.com |
| Database | Supabase | — |

- Every merge to `main` redeploys both the frontend and the backend.
- The frontend calls `/api/...` on its own domain, and `FE/vercel.json` forwards it to Render, so no CORS setup is needed.
- The backend is on Render's free plan: it sleeps after 15 minutes without requests, and the first request after that takes about a minute. **Before a demo, open https://taratrip-api.onrender.com/api/health once to wake it up.**

Step-by-step setup is in [docs/DEPLOY.md](docs/DEPLOY.md).

---

## 한국어

**TaraTrip**은 필리핀의 관광객과 지역 소상공인을 연결하고, 예산에 맞는 하루 여행 경로를 추천하는 AI 플랫폼입니다.

> 2026 글로벌 비교과 프로그램 (SCH-UST) · 팀 **렛츠 고**
> 순천향대학교 (IoT학과) × 산토토마스 대학교 (UST, 관광경영학과)

**데모 사이트: https://tara-trip.vercel.app**

### 소개

관광지 주변 소상공인은 온라인으로 가게를 알리고 외국인 관광객을 끌어오기 어렵습니다. 관광객도 원하는 음식과 관광지를 함께 담은 동선을 짜기 어렵고, 예산까지 맞춰야 하면 더 어려워집니다.

TaraTrip은 여행자의 위치, 선호 음식, 가고 싶은 관광지, 하루 예산을 입력받습니다. 그리고 현지 음식점, 전통시장, 소규모 상점, 관광지를 잇는 하루 동선을 추천합니다. 장소마다 예산 안에서 예상 비용을 나누고, 이동 순서를 지도에 표시합니다.

> 예: *"마닐라에서 오늘 2만 원 정도로 현지 음식을 먹고 싶어."*

소상공인의 가게 정보가 추천 데이터로 쓰입니다. 관광객 방문이 늘면 매출이 늘고, 매출이 늘면 플랫폼에 참여하는 가게도 늘어납니다.

### 기능

**관광객**
- 입력: 지역, 하루 예산(₱), 여행 날짜, 출발·종료 시각, 출발·도착 위치(현재 위치, 주소 검색, 지도에서 선택), 좋아하는 음식, 꼭 가고 싶은 곳(검색 가능, 오타도 찾아 줌), 자유 문장 요청
- 결과: 도로를 따라 번호가 매겨진 지도 위 하루 동선, 장소별 도착 시각과 예상 비용, 장소 사이 이동수단(도보, 지프니, 택시)과 요금, 장소마다 짧은 추천 이유
- 장소 상세: 사진, 영업시간, 가격대, 대표 메뉴, 현금 결제만 되는지 여부
- 가격은 페소(PHP)로 보여 주고, 실시간 환율로 원화(KRW) 금액을 함께 표시
- 한국어·영어 화면

**소상공인**
- 자기 가게를 직접 등록하고 수정 (등록할 때 수정용 키를 한 번 발급). 등록한 가게는 바로 추천 후보가 됨
- 홍보 도우미: 가게 정보로 영어 홍보 문구를 작성

### MVP 범위 (5주)

- **대상 지역 1곳** (1주차에 UST 팀이 선정)
- **핵심 기능 1개:** 예산 입력 → 지역 소상공인을 포함한 경로 추천
- 추천은 UST 팀이 정한 기준을 바탕으로 **규칙 + LLM API**로 구현
- 소상공인 홍보 도우미(영어 홍보 문구, 메뉴 번역): *추가 목표*, 시간이 남을 때만 구현
- 다른 지역으로의 확장 계획은 발표에서 다룸

### 팀

| 소속 | 이름 | 역할 |
|---|---|---|
| SCH (IoT학과) | **고준원** (팀장) | AI |
| SCH (IoT학과) | **허서영** | 풀스택 A: 관광객 서비스 |
| SCH (IoT학과) | **김형은** | 풀스택 B: 데이터·소상공인·인프라 |
| UST (관광경영학과) | Kian Nil Adrienne Roxas | 관광 도메인 |
| UST (관광경영학과) | Keisha Nicole Bagtas | 관광 도메인 |
| UST (관광경영학과) | Ana Maria Martha Baylon | 관광 도메인 |

**원칙:** SCH 팀은 기술을 만들고, UST 팀은 관광 도메인(TaraTrip이 무엇을, 왜 추천하는지)을 책임집니다.

### 역할: SCH 팀

풀스택 작업은 **프론트엔드/백엔드가 아니라 기능별로** 나눕니다. 각자 맡은 기능을 화면부터 API, DB까지 끝까지 만들어서 서로 기다리는 일이 없게 합니다.

#### AI: 고준원
- UST 팀의 **추천 기준**을 로직으로 구현: 규칙 기반 필터(예산, 영업시간, 거리) + LLM
- 자연어 입력을 예산, 선호 음식, 관광지로 해석
- 경로 생성: 장소 순서, 장소별 체류 시간, 식비·입장료·교통비로 예산 배분
- 추천마다 짧은 설명 생성
- *(추가 목표)* 홍보 도우미용 프롬프트: 영어 홍보 문구, 메뉴 번역
- 4주차에 UST 피드백을 반영해 로직과 프롬프트 수정

#### 풀스택 A, 관광객 서비스: 허서영
- 화면 설계와 전체 UI 구조 (1주차)
- **예산·취향 입력 화면**과 **추천 결과 화면**
- 경로 순서와 장소별 예상 비용을 보여 주는 **지도 화면**
- 추천 API: 프론트엔드 요청을 받아 AI 모듈을 호출하고 결과를 돌려줌
- 장소 상세 API와 화면
- Vercel 프론트엔드 배포
- 4주차 통합, 데모 흐름 담당

#### 풀스택 B, 데이터·소상공인·인프라: 김형은
- 레포 구조, 배포 설정, 기술 스택 결정 (1주차)
- **DB 스키마**: 가게, 관광지, 가격대, 영업시간, 위치
- **UST와 현지 데이터 양식 합의**, 스프레드시트 → DB 적재 스크립트 작성
- 장소 목록·검색 API (AI 모듈이 후보 장소를 가져올 때 사용)
- 소상공인 등록·수정 화면과 API
- *(추가 목표)* 홍보 도우미 UI, AI 프롬프트와 연결
- Render 백엔드 배포, 안정화, 버그 수정

#### 공통
- **1주차에 API 명세(요청·응답 JSON)를 함께 확정합니다.** 모든 병렬 작업이 이 명세를 기준으로 진행됩니다.
- 발표는 SCH 팀이 맡습니다:
  - 고준원: 문제 정의, UST 협업, AI 로직
  - 허서영: 라이브 데모
  - 김형은: 시스템 구조, 데이터 흐름, 확장 계획

### 일정

| 주차 | AI (고준원) | 풀스택 A (허서영) | 풀스택 B (김형은) | UST 팀 |
|---|---|---|---|---|
| 1 | 추천 기준 검토, LLM API 선택, 출력 형식 설계 | 와이어프레임 / 화면 설계 | 기술 스택, 레포, DB 스키마, 데이터 양식 | 대상 지역 선정, 추천 기준·페르소나 정리 |
| 2 | 규칙 필터·경로 생성 초안 (더미 데이터) | 입력·결과 화면 | DB와 서버, 장소 API, 적재 스크립트 | 현지 데이터 수집 |
| 3 | 실제 데이터 연결, 예산 배분, 추천 설명 | 지도 연동, 추천 API 연결 | 실제 데이터 적재, 소상공인 기능 | 데이터 보완, 비즈니스 모델 |
| 4 | UST 피드백을 로직에 반영 | 통합, 프로토타입 완성, Vercel 배포 | 백엔드 배포 (Render), *(추가 목표)* 홍보 도우미 | 사용자 테스트, 추천 경로 검증 |
| 5 | 데모용 추천 안정화 | 데모 시나리오 다듬기 | 버그 수정, 서버 안정화 | 발표용 현지 자료 제공 |

### 저장소 구조

```
TaraTrip/
├── AI/          # 추천 로직 (규칙 + LLM), 성능 평가
├── FE/          # 프론트엔드 (React + Vite)
├── BE/          # 백엔드 (FastAPI 서버, DB 스키마, 데이터 스크립트)
├── design/      # 와이어프레임 (관광객 화면을 그리는 Figma 플러그인)
├── docs/        # API 명세, 배포 안내, UST 데이터 양식
└── render.yaml  # 백엔드용 Render 배포 설정
```

풀스택 팀원은 자기가 맡은 기능에 대해 `FE/`와 `BE/`를 모두 작업합니다.

파트별 자세한 내용은 각 README에 있습니다: [AI](AI/README.md) · [BE](BE/README.md) · [FE](FE/README.md) · [API 명세](docs/API.md) · [배포](docs/DEPLOY.md)

### 기술 스택

| 영역 | 선택 |
|---|---|
| 프론트엔드 | React 19 (Vite) + TypeScript, React Router, 모바일 우선 |
| 지도 | Leaflet + OpenStreetMap, 도로 경로는 OSRM |
| 백엔드 | FastAPI (Python), AI 모듈을 직접 import |
| 데이터베이스 | Supabase (PostgreSQL) |
| AI | Cloudflare Workers AI: Llama 3.1 8B Instruct (자유 문장 해석, 추천 이유), bge-base-en-v1.5 (취향 맞춤용 임베딩), Llama 3.3 70B Instruct (홍보 도우미, 장소 설명 한국어 번역) |
| 통화 | 페소(PHP), 원화(KRW) 함께 표시 (Frankfurter / open.er-api.com 환율) |
| 배포 | 프론트엔드는 Vercel, 백엔드는 Render |

### 시작하기

#### 준비물

- **Node.js** 20.19 이상 또는 22.12 이상 (Vite 8 요구 사항)
- **Python** 3.14 (Render와 같은 버전. AI 모듈만 따로 쓸 때는 표준 라이브러리만으로 3.9 이상에서 동작)
- 선택, 전체 실행에만 필요: Supabase `DATABASE_URL` (김형은에게 요청), Cloudflare Workers AI 키 `CF_ACCOUNT_ID` / `CF_API_TOKEN` (고준원에게 요청)

따로 적혀 있지 않으면 아래 명령은 모두 저장소 최상위 폴더에서 실행합니다.

#### 방법 1. 프론트엔드만, 가짜 데이터로 (백엔드 불필요)

화면을 가장 빨리 볼 수 있는 방법입니다. 응답은 `FE/src/api/mock.ts`에서 나옵니다 (실제 장소가 아닌 샘플 데이터).

```bash
cd FE
npm install
cp .env.example .env.local      # Windows: copy .env.example .env.local
npm run dev                     # http://localhost:5173
```

`.env.local`에는 기본으로 `VITE_USE_MOCK=true`가 들어 있습니다. 가짜 데이터 모드에서 오류 화면을 하나씩 보는 방법은 [FE/README.md](FE/README.md)를 참고하세요.

#### 방법 2. 프론트엔드 + 샘플 장소를 쓰는 백엔드 (DB 불필요)

임시 장소 10곳(`BE/dev/sample_places.py`, 가격·영업시간은 지어낸 값)으로 실제 추천 로직을 실행합니다. `.env`가 필요 없습니다.

**1) 백엔드** (터미널 1)

```bash
cd BE
python -m venv .venv
# macOS / Linux
.venv/bin/python -m pip install -r requirements.txt -r requirements-dev.txt
.venv/bin/python -m uvicorn dev.fake_server:app --reload --port 8000
# Windows
.venv\Scripts\python.exe -m pip install -r requirements.txt -r requirements-dev.txt
.venv\Scripts\python.exe -m uvicorn dev.fake_server:app --reload --port 8000
```

http://localhost:8000/api/health 에서 `{"status":"ok"}`가 나오는지 확인합니다.

**2) 프론트엔드** (터미널 2): `FE/.env.local`에서 `VITE_USE_MOCK=false`로 바꾼 뒤

```bash
cd FE
npm run dev
```

Vite 개발 서버가 `/api` 요청을 `http://localhost:8000`으로 넘겨 줍니다.

#### 방법 3. 실제 데이터베이스로 전체 실행

방법 2와 같지만, 백엔드가 Supabase의 실제 장소 데이터를 읽습니다.

**1) `BE/.env` 만들기**

```
DATABASE_URL=postgresql://...        # Supabase session pooler 주소 (김형은에게 요청)
CF_ACCOUNT_ID=...                    # 선택: 자유 문장 해석과 취향 맞춤 (고준원에게 요청)
CF_API_TOKEN=...                     # 선택
AI_TIMEOUT_SECONDS=20                # 선택, 기본 20. 이 시간을 넘기면 API가 504 AI_TIMEOUT으로 응답
```

Cloudflare 키가 없어도 입력 폼 값과 카테고리 태그만으로 경로를 추천합니다.

**2) 백엔드 실행**

```bash
cd BE
# macOS / Linux
.venv/bin/python -m uvicorn app.main:app --reload --port 8000
# Windows
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

**3) 프론트엔드 실행**: 방법 2처럼 `VITE_USE_MOCK=false`로 실행합니다.

#### 환경 변수

| 위치 | 변수 | 필수 | 의미 |
|---|---|---|---|
| `FE/.env.local` | `VITE_USE_MOCK` | 예 | `true`: 가짜 데이터, `false`: 백엔드 호출 |
| `FE/.env.local` | `VITE_ROUTING_URL` | 아니요 | 도로 경로용 OSRM 서버. 기본값: 공개 데모 서버. 비우면 직선으로 표시 |
| `BE/.env` | `DATABASE_URL` | 방법 3 | Supabase session pooler 주소 |
| `BE/.env` | `CF_ACCOUNT_ID`, `CF_API_TOKEN` | 아니요 | 자유 문장 해석, 취향 맞춤, 홍보 도우미에 쓰는 Cloudflare Workers AI 키 |
| `BE/.env` | `AI_TIMEOUT_SECONDS` | 아니요 | 추천 한 번의 시간 제한. 기본 20 (Render는 45) |
| `AI/.env` | `CF_ACCOUNT_ID`, `CF_API_TOKEN` | 아니요 | 같은 키. `--real`로 AI 데모를 돌릴 때 사용 |

`.env` 파일은 `.gitignore`가 막고 있습니다. 다른 이름으로 바꿔서 커밋하지 마세요.

### 테스트

```bash
# 백엔드 (DB는 가짜로 대체, .env 불필요)
cd BE
.venv/bin/python -m pytest              # Windows: .venv\Scripts\python.exe -m pytest

# AI 모듈 (형식 검사, 키 불필요)
cd AI
python tests/test_recommend.py

# 프론트엔드 (타입 검사 + 배포용 빌드, 린트)
cd FE
npm run build
npm run lint
```

### AI 데모와 성능 평가

`AI/` 폴더 안에서 실행합니다. 자세한 내용은 [AI/README.md](AI/README.md)를 참고하세요.

```bash
python demos/demo3.py                    # 가짜 모드, 키 불필요
python demos/demo3.py --real             # 실제 Workers AI (AI/.env 필요)
python demos/demo_explain.py --real      # 추천 이유 문장 비교: 템플릿 / 작은 모델 / 큰 모델
python eval/run_eval.py places.xlsx      # 성능 평가: 여행자 20명 × TaraTrip / 가까운 곳부터 / 무작위 (openpyxl 필요)
```

최근 평가 결과는 [AI/eval/RESULTS.md](AI/eval/RESULTS.md)에 있습니다.

### 장소 데이터 넣기 (UST 스프레드시트 → DB)

`BE/.env`에 `DATABASE_URL`이 필요합니다. 저장소 최상위 폴더에서 실행합니다 (Windows는 `BE/.venv/bin/python` 대신 `BE\.venv\Scripts\python.exe`).

```bash
BE/.venv/bin/python BE/scripts/apply_schema.py                                  # 테이블 생성·갱신 (여러 번 실행해도 안전)
BE/.venv/bin/python BE/scripts/import_places.py path/to/filled.xlsx --dry-run   # 검사만 하고 쓰지 않음
BE/.venv/bin/python BE/scripts/import_places.py path/to/filled.xlsx             # DB에 쓰기
BE/.venv/bin/python BE/scripts/translate_places.py                              # 장소 설명 한국어 번역 (Cloudflare 키 필요)
```

- 한 행이라도 문제가 있으면 아무것도 쓰지 않고, 문제를 행별로 모두 보여 줍니다. 그 목록을 그대로 UST에 보내면 됩니다.
- 고친 시트를 다시 넣으면 `place_id` 기준으로 행을 갱신하고, 중복으로 추가하지 않습니다.
- 빈 양식은 `docs/data-template/TaraTrip_Places_Template.xlsx`입니다 (`BE/scripts/make_data_template.py`로 다시 만들 수 있음).

### 배포

| 파트 | 서비스 | 주소 |
|---|---|---|
| 프론트엔드 | Vercel (프로젝트 루트 `FE/`) | https://tara-trip.vercel.app |
| 백엔드 | Render (`render.yaml`) | https://taratrip-api.onrender.com |
| 데이터베이스 | Supabase | — |

- `main`에 머지할 때마다 프론트엔드와 백엔드가 모두 다시 배포됩니다.
- 프론트엔드는 자기 도메인의 `/api/...`를 호출하고, `FE/vercel.json`이 이를 Render로 넘겨 줍니다. 그래서 CORS 설정이 필요 없습니다.
- 백엔드는 Render 무료 플랜이라 15분 동안 요청이 없으면 잠들고, 그다음 첫 요청은 1분 정도 걸립니다. **데모 전에 https://taratrip-api.onrender.com/api/health 를 한 번 열어서 깨워 두세요.**

단계별 설정 방법은 [docs/DEPLOY.md](docs/DEPLOY.md)에 있습니다.
