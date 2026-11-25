"""GET /api/places and GET /api/places/{place_id} (docs/API.md section 2)."""
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.db import get_conn
from app.errors import ApiError
from app.schemas import PlaceDetail, PriceRange

router = APIRouter()

DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]



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


def to_place_detail(row: dict, lang: str = "en") -> PlaceDetail:
    # Korean copies when asked for and already translated; otherwise the stored English.
    ko = lang == "ko"
    description = (ko and row.get("description_ko")) or row["description"] or ""
    signature_menu = (ko and row.get("signature_menu_ko")) or row.get("signature_menu") or None
    return PlaceDetail(
        place_id=row["place_id"],
        name=row["name"],
        category=row["category"],
        lat=row["lat"],
        lng=row["lng"],
        address=row["address"],
        price_range=price_range(row),
        # .get(): rows from before PR #13's columns (and dev samples) may lack them
        signature_menu=signature_menu,
        signature_price=row.get("signature_price"),
        cash_only=bool(row.get("cash_only")),
        opening_hours=format_opening_hours(row["opening_hours"]),
        description=description,
        photos=row["photos"] or [],
    )


class PlaceSummary(BaseModel):
    place_id: str
    name: str
    category: str
    district: str | None = None
    description_ko: str | None = None


class PlaceList(BaseModel):
    places: list[PlaceSummary]


@router.get("/places", response_model=PlaceList)
def list_places(conn: Annotated[Any, Depends(get_conn)]) -> PlaceList:  # psycopg.Connection
    """Every place's name, for the input screen's "places you must see" search.

    description_ko lets a Korean query find a place (names are English). select *: works
    before and after schema.sql adds description_ko, like get_place below."""
    rows = conn.execute("select * from places").fetchall()
    places = [
        PlaceSummary(
            place_id=r["place_id"],
            name=(r["name"] or "").strip(),
            category=r["category"],
            district=(r.get("district") or "").strip() or None,
            description_ko=(r.get("description_ko") or "").strip() or None,
        )
        for r in rows
        if (r["name"] or "").strip()
    ]
    return PlaceList(places=sorted(places, key=lambda p: p.name.casefold()))


@router.get("/places/{place_id}", response_model=PlaceDetail)
def get_place(
    place_id: str,
    conn: Annotated[Any, Depends(get_conn)],  # psycopg.Connection
    lang: Literal["ko", "en"] = "ko",
) -> PlaceDetail:
    row = conn.execute(
        # select *: works before and after schema.sql adds description_ko / signature_menu_ko,
        # so deploying this ahead of the DB change never breaks the place screen.
        "select * from places where place_id = %s", (place_id,)
    ).fetchone()
    if row is None:
        raise ApiError(404, "PLACE_NOT_FOUND", f"No place with id '{place_id}'")
    return to_place_detail(row, lang)
