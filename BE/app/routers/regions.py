"""GET /api/regions (docs/API.md section 4): the districts that have places.

Until UST fixes the region list, the input screen offers whatever districts the
data has. The value goes back as `region` in POST /api/recommendations.
"""
from typing import Annotated, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.db import get_conn

router = APIRouter()


class Regions(BaseModel):
    regions: list[str]


@router.get("/regions", response_model=Regions)
def list_regions(conn: Annotated[Any, Depends(get_conn)]) -> Regions:  # psycopg.Connection
    rows = conn.execute("select distinct district from places where district is not null").fetchall()
    # Deduplicated here too: the dev fake connection answers with every place row.
    # Case-insensitive, like the region match in the AI module.
    seen: dict[str, str] = {}
    for r in rows:
        name = (r["district"] or "").strip()
        if name:
            seen.setdefault(name.casefold(), name)
    return Regions(regions=sorted(seen.values(), key=str.casefold))
