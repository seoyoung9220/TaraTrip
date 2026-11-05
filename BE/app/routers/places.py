"""GET /api/places/{place_id} (docs/API.md section 2)."""
from typing import Annotated, Any

from fastapi import APIRouter, Depends

from app.db import get_conn
from app.errors import ApiError
from app.schemas import PlaceDetail, PriceRange

router = APIRouter()

DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

PLACE_COLUMNS = """
    place_id, name, category, lat, lng, address,
    price_min, price_max, entry_fee, opening_hours, description, photos
"""


def format_opening_hours(hours: dict | None) -> str:
    """Collapse the per-weekday jsonb into the single string the API returns.

    {"mon": "08:00-20:00", ..., "sun": "08:00-20:00"} -> "08:00-20:00"
    Mixed days are grouped by consecutive runs: "Mon-Fri 08:00-20:00, Sat-Sun closed".
    Missing days are left out; an empty object gives "".
    """
    if not hours:
        return ""
    values = [(day, hours.get(day)) for day in DAYS]
    present = [(d, v) for d, v in values if v]
    if len(present) == len(DAYS) and len({v for _, v in present}) == 1:
        return present[0][1]

    runs: list[tuple[str, str, str]] = []  # (first_day, last_day, value)
    for day, value in values:
        if not value:
            continue
        prev_idx = DAYS.index(day) - 1
        if runs and runs[-1][2] == value and prev_idx >= 0 and runs[-1][1] == DAYS[prev_idx]:
            runs[-1] = (runs[-1][0], day, value)
        else:
            runs.append((day, day, value))

    def label(first: str, last: str) -> str:
        return first.title() if first == last else f"{first.title()}-{last.title()}"

    return ", ".join(f"{label(f, l)} {v}" for f, l, v in runs)


def price_range(row: dict) -> PriceRange:
    """price_min/max are optional in the DB but numbers in the API.

    Fall back to whichever end is set, then to entry_fee (attractions often only have that).
    """
    lo, hi = row["price_min"], row["price_max"]
    fallback = row["entry_fee"] or 0
    lo = lo if lo is not None else (hi if hi is not None else fallback)
    hi = hi if hi is not None else lo
    return PriceRange(min=lo, max=hi)


def to_place_detail(row: dict) -> PlaceDetail:
    return PlaceDetail(
        place_id=row["place_id"],
        name=row["name"],
        category=row["category"],
        lat=row["lat"],
        lng=row["lng"],
        address=row["address"],
        price_range=price_range(row),
        opening_hours=format_opening_hours(row["opening_hours"]),
        description=row["description"] or "",
        photos=row["photos"] or [],
    )


@router.get("/places/{place_id}", response_model=PlaceDetail)
def get_place(
    place_id: str, conn: Annotated[Any, Depends(get_conn)]  # psycopg.Connection
) -> PlaceDetail:
    row = conn.execute(
        f"select {PLACE_COLUMNS} from places where place_id = %s", (place_id,)
    ).fetchone()
    if row is None:
        raise ApiError(404, "PLACE_NOT_FOUND", f"No place with id '{place_id}'")
    return to_place_detail(row)
