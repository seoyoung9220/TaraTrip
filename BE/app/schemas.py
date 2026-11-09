"""Request/response models for docs/API.md. Keep in sync with FE/src/api/types.ts."""
from typing import Literal

from pydantic import BaseModel, Field

PlaceCategory = Literal["restaurant", "market", "shop", "attraction"]
TransportMode = Literal["walk", "jeepney", "tricycle", "taxi", "other"]


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
    free_text: str | None = Field(default=None, max_length=1000)


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
    opening_hours: str
    description: str
    photos: list[str]
