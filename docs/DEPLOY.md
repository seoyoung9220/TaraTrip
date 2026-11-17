# Deploy

- **BE** (FastAPI + AI module): Render, free web service, from `render.yaml`
- **FE** (Vite): Vercel, project root `FE/`
- **DB**: Supabase (already running)

The FE calls `/api/...` on its own domain; `FE/vercel.json` forwards that to Render.
So there is no CORS setup and the FE code stays the same as in local dev.

## 1. Backend on Render

1. Sign in at https://render.com with GitHub and allow access to `seoyoung9220/TaraTrip`.
2. **New → Blueprint**, pick the repo, branch `main`. Render reads `render.yaml`.
3. It asks for the `sync: false` values:
   - `DATABASE_URL`: the line from `BE/.env` (Supabase session pooler)
   - `CF_ACCOUNT_ID`, `CF_API_TOKEN`: from Junwon. Leave empty to recommend from form fields only.
4. Wait for the deploy, then open `https://<service>.onrender.com/api/health` → `{"status":"ok"}`.
   Also try `/api/regions` (data from Supabase) and `/api/exchange-rate`.
5. If the URL is not `https://taratrip-api.onrender.com` (name already taken), change
   the destination in `FE/vercel.json` to the real URL and merge that change.

Free plan: the service sleeps after 15 minutes without requests, and the first request after that
takes about a minute. **Before a demo, open `/api/health` once to wake it up.**

## 2. Frontend on Vercel

1. Sign in at https://vercel.com with GitHub, **Add New → Project**, import `seoyoung9220/TaraTrip`.
2. **Root Directory: `FE`**. Framework preset: Vite (detected). Build and output settings stay default.
3. Environment variable: `VITE_USE_MOCK` = `false`.
4. Deploy. Open the site: the region list should show the real districts, and a recommendation
   should name real places (e.g. Fort Santiago for Intramuros).

Every merge to `main` redeploys both services.

## Checklist after a deploy

- `/` → pick a region, ask for a route → real places on the map
- Tap a stop → place detail with signature menu / cash-only
- KRW amounts show (exchange rate reachable)
- `/merchant` → register a test place → it opens in place detail; delete it afterwards in Supabase
  (`delete from places where place_id = 'BIZ-000N';`)
