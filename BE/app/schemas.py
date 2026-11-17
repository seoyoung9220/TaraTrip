"""Request/response models for docs/API.md. Keep in sync with FE/src/api/types.ts."""
from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, Field, model_validator

PlaceCategory = Literal["restaurant", "market", "shop", "attraction"]
TransportMode = Literal["walk", "jeepney", "tricycle", "taxi", "other"]

# Local time "HH:MM", 00:00–23:59. Zero-padded strings compare correctly as text.
ClockTime = Annotated[str, Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")]


# ── POST /api/recommendations ───────────────────────────────

class LatLng(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class Budget(BaseModel):
    amount: float = Field(gt=0)
    currency: Literal["PHP"]


class RecommendationRequest(BaseModel):
    region: str = Field(min_length=1)
    budget: Budget
    foods: list[str] = []
    attractions: list[str] = []
    start_location: LatLng
    travel_date: date | None = None  # "YYYY-MM-DD"; default: today in Manila (AI module)
    start_time: ClockTime | None = None
    end_time: ClockTime | None = None
    free_text: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def _end_after_start(self) -> "RecommendationRequest":
        if self.start_time and self.end_time and self.end_time <= self.start_time:
            raise ValueError("end_time must be later than start_time")
        return self


class Transport(BaseModel):
    mode: TransportMode
    minutes: int
    cost: int


class CostBreakdown(BaseModel):
    food: int
    entry: int
    transport: int


class Stop(BaseModel):
    order: int
    place_id: str
    name: str
    category: PlaceCategory
    lat: float
    lng: float
    arrival_time: str
    est_cost: int
    stay_minutes: int
    transport: Transport | None
    cost_breakdown: CostBreakdown
    reason: str


class Recommendation(BaseModel):
    """Extra keys from the AI module (e.g. `_debug`) are dropped by this model."""
    route_id: str
    total_cost: int
    total_minutes: int
    currency: Literal["PHP"] = "PHP"
    summary: str
    stops: list[Stop]


# ── GET /api/places/{place_id} ──────────────────────────────


class PriceRange(BaseModel):
    min: int
    max: int
    currency: Literal["PHP"] = "PHP"


class PlaceDetail(BaseModel):
    place_id: str
    name: str
    category: PlaceCategory
    lat: float
    lng: float
    address: str
    price_range: PriceRange
    signature_menu: str | None
    signature_price: int | None
    cash_only: bool
    opening_hours: str
    description: str
    photos: list[str]


# ── /api/merchant/places ────────────────────────────────────

# "08:00-20:00" or "closed". Same rule as scripts/import_places.py (closing may be 24:00;
# a closing time before opening means the place closes after midnight).
DayHours = Annotated[
    str, Field(pattern=r"^(closed|([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-4]):[0-5]\d)$")
]
Peso = Annotated[int, Field(ge=0, le=100_000)]


def _short(n: int):
    return Annotated[str, Field(min_length=1, max_length=n)]


class OpeningHours(BaseModel):
    mon: DayHours
    tue: DayHours
    wed: DayHours
    thu: DayHours
    fri: DayHours
    sat: DayHours
    sun: DayHours


class MerchantPlaceInput(BaseModel):
    """What an owner sends to register or edit a place. Field names are the DB columns."""
    name: _short(120)
    category: PlaceCategory
    lat: float = Field(ge=4, le=22)      # roughly the Philippines; catches swapped lat/lng
    lng: float = Field(ge=116, le=127)
    address: _short(300)
    district: _short(80) | None = None   # shows up in GET /api/regions
    price_min: Peso | None = None
    price_max: Peso | None = None
    entry_fee: Peso = 0
    signature_menu: _short(120) | None = None
    signature_price: Peso | None = None
    cash_only: bool = False
    avg_stay_minutes: int | None = Field(default=None, ge=5, le=600)
    opening_hours: OpeningHours
    tags: list[_short(40)] = Field(default=[], max_length=10)
    description: Annotated[str, Field(max_length=1000)] | None = None
    photos: list[Annotated[str, Field(pattern=r"^https://\S+$", max_length=500)]] = Field(default=[], max_length=10)
    contact: _short(120) | None = None

    @model_validator(mode="before")
    @classmethod
    def _blank_to_none(cls, data):
        """Trim text; an empty optional field means "not given" (form inputs send "")."""
        if not isinstance(data, dict):
            return data
        out = {}
        for k, v in data.items():
            if isinstance(v, str):
                v = v.strip() or None
            elif isinstance(v, list):
                v = [x.strip() if isinstance(x, str) else x for x in v]
                v = [x for x in v if x not in ("", None)]
            out[k] = v
        return out

    @model_validator(mode="after")
    def _price_order(self) -> "MerchantPlaceInput":
        if self.price_min is not None and self.price_max is not None and self.price_min > self.price_max:
            raise ValueError("price_min must not be greater than price_max")
        return self


class MerchantPlace(MerchantPlaceInput):
    place_id: str


class MerchantPlaceCreated(MerchantPlace):
    edit_key: str  # shown once; only its hash is stored
