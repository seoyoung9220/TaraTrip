# TaraTrip Wireframe (Figma plugin)

Draws the traveler-flow wireframes (15 screens, 46 frames with the animation in-between frames) as auto-layout frames with prototype links.

Each run creates a **new page** (`TaraTrip 와이어프레임 <date time>`) and draws only there. Existing pages and frames, including teammates' edits, are never changed.

- App start: 0-1 시작 화면 · 0-2/0-3 첫 방문 안내 · 0-4a/0-4b 위치 권한 (허용 전 / 거절됨)
- Main flow: 1 조건 입력 (홈) · 2 추천 중 · 3 추천 코스 · 4 장소 상세 · 5a–5c 오류 (예산 부족 / 결과 없음 / 시간 초과)
- Input helpers: 1-1 지역 선택 · 1-2 관광지 검색 · 1-3 출발 위치

Animations play in **Present** mode only:

- 0-1 시작 화면 and 2 추천 중 advance by themselves with Smart Animate and loop. They match the app (`FE/src/components/Splash.tsx`, `LoadingScreen.tsx`):
  - 0-1: the logo fades in, then a plane flies pin to pin, stopping for 0.5 s at the middle pin, leaving a mango trail (a clipped layer whose width grows). Faint clouds drift across the top.
  - 2: a jeepney drives along a road from stop 1 to 4, one stop per step, and each stop turns mango as it is reached.
  - Smart Animate moves layers in a straight line, so each stop-to-stop move is split into `SUB` (6) in-between frames that follow the curve. They sit in the last two rows of the page; the screens to review are in the first three.
  - Only in the app: the road's center line scrolls, and the clouds drift continuously.
- "진행 중 (깜빡임)" is a component set (on / dim variants) placed under the frames; its instances blink in prototypes.
- Keep layer names identical across the animation frames, or Smart Animate stops matching them.

## Run (Figma desktop app only)

1. Open a Design file in the Figma desktop app
2. Main menu → **Plugins › Development › Import plugin from manifest…** → pick `manifest.json` in this folder (first time only)
3. Main menu → **Plugins › Development › TaraTrip Wireframe**

Font: Noto Sans KR. Placeholder text in `[brackets]` and sample amounts are not real data.
