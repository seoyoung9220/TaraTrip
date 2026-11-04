# TaraTrip

**An AI platform that connects tourists with small local businesses in the Philippines and recommends one-day travel routes that fit a budget.**

> 2026 Global Extracurricular Program (SCH-UST) · Team **Let's Go**
> Soonchunhyang University (IoT) × University of Santo Tomas (Tourism Management)

[한국어](#한국어)

---

## About

Small businesses near tourist sites find it hard to promote themselves online and reach international tourists. Tourists, in turn, find it hard to plan a route that covers the food and attractions they want, and harder still when they also have to stay on a budget.

TaraTrip asks for the traveler's location, food preferences, the attractions they want to see, and a daily budget. It then recommends a one-day route that links local restaurants, traditional markets, small shops and attractions. Each stop gets an estimated cost within the budget, and the route order is shown on a map.

> e.g. *"I want to try local food in Manila for about 20,000 KRW today."*

Small businesses' store information feeds the recommendations. More tourist visits bring more sales, and more sales bring more businesses onto the platform.

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
- Integration in Week 4; owns the demo flow

### Full-stack B, Data, Business & Infra: Hyungeun Kim
- Repo structure, deployment setup, and the tech stack decision (Week 1)
- **DB schema**: businesses, attractions, price range, opening hours, location
- **Agree on the local data template with UST**; build the spreadsheet → DB import script
- Place list and search API (the AI module uses it to fetch candidate places)
- Business registration and edit screens and API
- *(Stretch)* Promotion assistant UI, connected to the AI prompts
- Final deployment, stability and bug fixes

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
| 4 | Apply UST feedback to the logic | Integration, prototype complete | Deployment, *(stretch)* promotion assistant | User testing, validate routes |
| 5 | Stabilize recommendations for the demo | Polish the demo scenario | Bug fixes, server stability | Provide local materials for the presentation |

## Tech Stack

TBD (to be decided in Week 1)

---

## 한국어

### 개요
**TaraTrip**은 필리핀 소상공인과 관광객을 AI로 연결하는 플랫폼입니다. 현재 위치, 선호 음식, 가고 싶은 관광지, 하루 예산을 입력하면 현지 음식점·전통시장·소규모 상점·관광지를 잇는 하루 동선을 추천합니다. 장소별 예상 비용을 예산 안에서 나누고, 이동 순서를 지도에 표시합니다.

- 대회: 2026 글로벌 비교과 팀 프로젝트 경진대회 (SCH-UST), 팀 렛츠 고
- 기간: 5주
- MVP: 한 지역, 예산 입력 → 소상공인을 포함한 경로 추천 (규칙 + LLM API). 소상공인 홍보 도우미는 시간이 남으면 추가
- 원칙: 한국팀 = 기술 개발, UST 팀 = 관광 도메인 (추천 기준, 현지 데이터, 검증)

### 한국팀 역할 분담
풀스택 두 명은 프론트/백이 아니라 **기능별로** 나눕니다. 각자 맡은 기능을 화면부터 API, DB까지 끝까지 만듭니다.

| 담당 | 이름 | 주요 업무 |
|---|---|---|
| AI | **고준원** (대표) | 추천 기준을 로직으로 구현 (규칙 필터 + LLM), 자연어 입력 해석, 경로·비용 배분, 추천 설명 생성, UST 피드백 반영 |
| 풀스택 A: 관광객 서비스 | **허서영** | 화면 설계, 입력·결과 화면, 지도 경로 표시, 추천 API 연동, 장소 상세, 통합·데모 흐름 |
| 풀스택 B: 데이터·소상공인·인프라 | **김형은** | 기술 스택·레포·배포, DB 스키마, UST 데이터 양식 합의와 적재 스크립트, 장소 검색 API, 소상공인 등록 기능 |

**공통:** 1주차에 API 명세(입출력 JSON)를 3명이 함께 확정합니다. 발표는 고준원(문제 정의, UST 협업, AI 로직), 허서영(라이브 데모), 김형은(시스템 구조, 확장 계획)이 나눠서 맡습니다.

### 주차별 일정
| 주차 | 한국팀 | UST 팀 |
|---|---|---|
| 1주 | 기술 스택 결정, 화면 설계, DB 스키마, API 명세 | 대상 지역 확정, 추천 기준·페르소나 정리 |
| 2주 | DB·서버 구축, 추천 로직 초안, 입력·결과 화면 | 현지 데이터 수집·정리 |
| 3주 | 실제 데이터 연결, 지도 연동, 기능 개발 | 데이터 보완, 비즈니스 모델 |
| 4주 | 통합, 프로토타입 완성, 피드백 반영 | 사용자 테스트, 추천 결과 검증 |
| 5주 | 버그 수정, 데모 준비, 발표 | 발표용 현지 자료 제공 |
