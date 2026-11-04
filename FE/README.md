# FE

Frontend: traveler screens (input, results, map) and small-business screens.

- Traveler service: Seoyoung Heo
- Small-business screens: Hyungeun Kim

## Stack

React 19 + Vite + TypeScript, React Router, Leaflet (react-leaflet) + OpenStreetMap. Mobile-first.

## Run

```bash
cd FE
npm install
cp .env.example .env.local   # VITE_USE_MOCK=true: use mock data, no backend needed
npm run dev                  # http://localhost:5173
```

With `VITE_USE_MOCK=false`, `/api` requests are proxied to the FastAPI server at `http://localhost:8000` (see `vite.config.ts`).

```bash
npm run build   # type-check + production build
npm run lint    # oxlint
```

## Structure

```
src/
├── api/
│   ├── types.ts    # Types for docs/API.md (update both together)
│   ├── client.ts   # API calls; switches to mock with VITE_USE_MOCK
│   └── mock.ts     # Sample responses (placeholders, not real data)
├── components/
│   ├── Splash.tsx         # 0-1. 시작 화면 (plane), once per browser session
│   ├── LoadingScreen.tsx  # 2. 추천 중 (jeepney on a road)
│   ├── ErrorView.tsx      # 5a–5c. 오류
│   ├── RouteMap.tsx       # Leaflet map with numbered stops
│   ├── Icon.tsx           # Icon set from the wireframes
│   └── anim/              # Path animation helper, artwork data, shared CSS
├── lib/                   # Formatting (₱, 원, 시간) and the exchange-rate hook
├── pages/
│   ├── InputPage.tsx    # /                 1. 조건 입력
│   ├── ResultPage.tsx   # /route            2. 추천 중 · 3. 추천 코스 · 5. 오류
│   └── PlacePage.tsx    # /places/:placeId  4. 장소 상세
├── config.ts            # Region / food placeholders until the UST team decides
└── styles/global.css    # Design tokens (same as the wireframes)
```

## Mock mode

With `VITE_USE_MOCK=true`:

- A recommendation takes about 5 seconds, so you can watch all three loading steps.
- A budget under ₱300 returns `BUDGET_TOO_LOW`.
- Add `?mockError=NO_RESULTS` (or `AI_TIMEOUT`, `BUDGET_TOO_LOW`, `INVALID_REQUEST`) to the URL to see that error screen.
- The splash plays once per browser session. Open a new tab, or clear `taratrip.splashSeen` from sessionStorage, to see it again.
