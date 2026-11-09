# BE

Backend: server, DB, APIs, data import, deployment.

- Recommendation API, place detail API: Seoyoung Heo
- DB schema, data import, place search API, business API, deployment: Hyungeun Kim

## Run locally

```powershell
cd BE
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt -r requirements-dev.txt
# BE/.env needs DATABASE_URL (ask Hyungeun)
# Optional, for free_text parsing and taste matching (ask Junwon):
#   CF_ACCOUNT_ID=...  CF_API_TOKEN=...   (without them, routes use the form fields only)
#   AI_TIMEOUT_SECONDS=20                 (default 20; past this → 504 AI_TIMEOUT)
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

### Without a database

`dev/fake_server.py` runs the same app with `get_conn` swapped for 10 placeholder places
(`dev/sample_places.py`, made-up prices and hours). No `.env` needed:

```powershell
.venv\Scripts\python.exe -m uvicorn dev.fake_server:app --reload --port 8000
```

FE dev server proxies `/api` to `http://localhost:8000`, so run FE with `VITE_USE_MOCK=false` to hit this server.

## Layout

- `app/main.py` – FastAPI app; routers mounted under `/api`
- `app/routers/places.py` – `GET /api/places/{place_id}`
- `app/routers/recommendations.py` – `POST /api/recommendations`; calls `recommend()` from `AI/recommend.py`
- `app/errors.py` – `{"error": {"code", "message"}}` responses; validation errors → 400 `INVALID_REQUEST`
- `app/db.py` – `get_conn` dependency (DATABASE_URL from `BE/.env`)
- `dev/` – placeholder places + fake-DB server for local FE work (not for deployment)
- `tests/` – `.venv\Scripts\python.exe -m pytest` (DB is faked, no `.env` needed)

## Place detail mapping (DB → API)

- `price_min`/`price_max` → `price_range`; if both are empty, falls back to `entry_fee`
- `opening_hours` (per-weekday jsonb) → one string: `"08:00-20:00"` if every day matches,
  otherwise `"Mon-Fri 08:00-20:00, Sat-Sun closed"`
- `description` null → `""`

## Recommendation flow

- Loads every row of `places` and passes it with the request to `AI/recommend.py:recommend()`
- `BudgetTooLowError` → 422 `BUDGET_TOO_LOW`, `NoResultsError` (or empty DB) → 422 `NO_RESULTS`
- Passes `travel_date` (that weekday's opening hours) and `lang="ko"` (FE is Korean-only, so `summary`/`reason` stay Korean even for English `free_text`)
- `start_time`/`end_time` are validated (`HH:MM`, end after start → else 400) and passed on in the request; the AI module does not read them yet
- Runs in a worker thread with a time limit; past `AI_TIMEOUT_SECONDS` → 504 `AI_TIMEOUT`
- The AI module's `_debug` key is dropped by the response model and logged at INFO
