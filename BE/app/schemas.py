"""Response models for docs/API.md. Keep in sync with FE/src/api/types.ts."""
from typing import Literal

from pydantic import BaseModel

PlaceCategory = Literal["restaurant", "market", "shop", "attraction"]


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
