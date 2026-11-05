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
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

FE dev server proxies `/api` to `http://localhost:8000`, so run FE with `VITE_USE_MOCK=false` to hit this server.

## Layout

- `app/main.py` – FastAPI app; routers mounted under `/api`
- `app/routers/places.py` – `GET /api/places/{place_id}`
- `app/errors.py` – `{"error": {"code", "message"}}` responses; validation errors → 400 `INVALID_REQUEST`
- `app/db.py` – `get_conn` dependency (DATABASE_URL from `BE/.env`)
- `tests/` – `.venv\Scripts\python.exe -m pytest` (DB is faked, no `.env` needed)

## Place detail mapping (DB → API)

- `price_min`/`price_max` → `price_range`; if both are empty, falls back to `entry_fee`
- `opening_hours` (per-weekday jsonb) → one string: `"08:00-20:00"` if every day matches,
  otherwise `"Mon-Fri 08:00-20:00, Sat-Sun closed"`
- `description` null → `""`
