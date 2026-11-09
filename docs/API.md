# TaraTrip API Spec

All parts are developed against this spec. Any change to it needs agreement from all three SCH members and an update to this file first.

- Base URL: `/api`
- Format: JSON, UTF-8
- Currency: amounts are in **PHP**. The frontend also shows the KRW equivalent.
- Coordinates: WGS84 decimal degrees (`lat`, `lng`)

| Endpoint | Owner |
|---|---|
| `POST /api/recommendations` | Seoyoung (API), Junwon (AI module behind it) |
| `GET /api/places/{place_id}` | Seoyoung (API), Hyungeun (DB) |
| `GET /api/exchange-rate` | Hyungeun |

---

## POST /api/recommendations

Recommends a one-day route within the budget.

### Request

```json
{
  "region": "string",
  "budget": { "amount": 1000, "currency": "PHP" },
  "foods": ["local street food"],
  "attractions": ["string"],
  "start_location": { "lat": 14.6, "lng": 120.98 },
  "travel_date": "2026-11-20",
  "start_time": "10:00",
  "end_time": "16:00",
  "free_text": "I want to try local food for about 1000 PHP today"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `region` | string | yes | Target region. Matched case-insensitively against `places.district`; stops in that district come first. An unknown region is ignored (stops can come from any district) |
| `budget.amount` | number | yes | Daily budget |
| `budget.currency` | string | yes | `"PHP"` |
| `foods` | string[] | no | Preferred foods |
| `attractions` | string[] | no | Attractions the traveler wants to visit |
| `start_location` | object | yes | Starting point (`lat`, `lng`) |
| `travel_date` | string | no | Trip date, `YYYY-MM-DD`. Picks that weekday's opening hours. Default: today in Manila |
| `start_time` | string | no | Earliest time to leave `start_location`, local `HH:MM`. Default: `"10:00"` |
| `end_time` | string | no | Time the day should end, local `HH:MM`, later than `start_time`. Default: `"16:00"` |
| `free_text` | string | no | Natural-language request. The AI module parses it and merges it with the fields above. Form fields win when both are given; `free_text` only fills fields left out (e.g. "from 1pm" sets the times only if `start_time`/`end_time` are absent) |

### Response `200 OK`

```json
{
  "route_id": "string",
  "total_cost": 920,
  "total_minutes": 330,
  "currency": "PHP",
  "summary": "Why this route was recommended",
  "stops": [
    {
      "order": 1,
      "place_id": "string",
      "name": "string",
      "category": "restaurant",
      "lat": 14.6,
      "lng": 120.98,
      "arrival_time": "10:00",
      "est_cost": 250,
      "stay_minutes": 60,
      "transport": null,
      "cost_breakdown": { "food": 250, "entry": 0, "transport": 0 },
      "reason": "Why this stop was chosen"
    },
    {
      "order": 2,
      "place_id": "string",
      "name": "string",
      "category": "market",
      "lat": 14.6,
      "lng": 120.98,
      "arrival_time": "11:20",
      "est_cost": 180,
      "stay_minutes": 60,
      "transport": { "mode": "jeepney", "minutes": 15, "cost": 13 },
      "cost_breakdown": { "food": 180, "entry": 0, "transport": 13 },
      "reason": "Why this stop was chosen"
    }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `route_id` | string | Route identifier |
| `total_cost` | number | Sum of all stops' costs; must not exceed `budget.amount` |
| `total_minutes` | number | Total time from the first arrival to leaving the last stop, travel included |
| `currency` | string | `"PHP"` |
| `summary` | string | Explanation of the whole route |
| `stops[].order` | number | Visit order, starting at 1 |
| `stops[].place_id` | string | ID usable with `GET /api/places/{place_id}` |
| `stops[].category` | string | `restaurant` \| `market` \| `shop` \| `attraction` |
| `stops[].arrival_time` | string | Planned arrival, local time `HH:MM` |
| `stops[].est_cost` | number | Estimated cost at this stop (food or entry) |
| `stops[].stay_minutes` | number | Suggested time spent |
| `stops[].transport` | object \| null | How to get here from the previous stop; `null` for the first stop |
| `stops[].transport.mode` | string | `walk` \| `jeepney` \| `tricycle` \| `taxi` \| `other` |
| `stops[].transport.minutes` | number | Travel time |
| `stops[].transport.cost` | number | Fare; `0` for walking |
| `stops[].cost_breakdown` | object | `food`, `entry`, `transport` (`transport` equals `transport.cost`) |
| `stops[].reason` | string | Explanation for this stop |

---

## GET /api/places/{place_id}

Returns details for one place.

### Response `200 OK`

```json
{
  "place_id": "string",
  "name": "string",
  "category": "restaurant",
  "lat": 14.6,
  "lng": 120.98,
  "address": "string",
  "price_range": { "min": 100, "max": 300, "currency": "PHP" },
  "opening_hours": "08:00-20:00",
  "description": "string",
  "photos": ["https://..."]
}
```

---

## GET /api/exchange-rate

PHP → KRW rate for showing the KRW equivalent next to peso amounts. The server fetches it from an external rate API about once a day and caches it; the frontend never calls the external API directly.

### Response `200 OK`

```json
{
  "base": "PHP",
  "quote": "KRW",
  "rate": 24.1,
  "updated_at": "2026-11-04T00:00:00Z"
}
```

| Field | Type | Description |
|---|---|---|
| `rate` | number | KRW per 1 PHP |
| `updated_at` | string | When the rate was fetched (ISO 8601) |

If the server has never managed to fetch a rate, it answers `503 RATE_UNAVAILABLE`. If a later refresh fails, it keeps serving the last good rate (`updated_at` shows its age). On any error the frontend hides the KRW line instead of failing.

---

## Errors

```json
{ "error": { "code": "BUDGET_TOO_LOW", "message": "string" } }
```

| Status | `code` | When |
|---|---|---|
| 400 | `INVALID_REQUEST` | Missing or invalid fields |
| 404 | `PLACE_NOT_FOUND` | Unknown `place_id` |
| 422 | `BUDGET_TOO_LOW` | No route fits the budget |
| 422 | `NO_RESULTS` | No places match the request |
| 503 | `RATE_UNAVAILABLE` | No exchange rate could be fetched yet (`GET /api/exchange-rate`) |
| 504 | `AI_TIMEOUT` | The AI module did not respond in time |
