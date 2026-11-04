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
├── pages/
│   ├── InputPage.tsx    # /                 1. 조건 입력
│   ├── ResultPage.tsx   # /route            2. 추천 중 · 3. 추천 코스 · 5. 오류
│   └── PlacePage.tsx    # /places/:placeId  4. 장소 상세
└── styles/global.css    # Design tokens (same as the wireframes)
```
