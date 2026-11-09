"""FastAPI entry point.

Run (from BE/):
    .venv\\Scripts\\python.exe -m uvicorn app.main:app --reload --port 8000
The FE dev server proxies /api to http://localhost:8000 (FE/vite.config.ts).
"""
from fastapi import FastAPI

from app.errors import register_error_handlers
from app.routers import places, recommendations

app = FastAPI(title="TaraTrip API")
register_error_handlers(app)

app.include_router(places.router, prefix="/api")
app.include_router(recommendations.router, prefix="/api")


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
