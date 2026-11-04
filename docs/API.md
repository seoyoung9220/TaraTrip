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
  "free_text": "I want to try local food for about 1000 PHP today"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `region` | string | yes | Target region |
| `budget.amount` | number | yes | Daily budget |
| `budget.currency` | string | yes | `"PHP"` |
| `foods` | string[] | no | Preferred foods |
| `attractions` | string[] | no | Attractions the traveler wants to visit |
| `start_location` | object | yes | Starting point (`lat`, `lng`) |
| `free_text` | string | no | Natural-language request. The AI module parses it and merges it with the fields above |

### Response `200 OK`

```json
{
  "route_id": "string",
  "total_cost": 920,
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
      "est_cost": 250,
      "stay_minutes": 60,
      "cost_breakdown": { "food": 250, "entry": 0, "transport": 30 },
      "reason": "Why this stop was chosen"
    }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `route_id` | string | Route identifier |
| `total_cost` | number | Sum of all stops' costs; must not exceed `budget.amount` |
| `currency` | string | `"PHP"` |
| `summary` | string | Explanation of the whole route |
| `stops[].order` | number | Visit order, starting at 1 |
| `stops[].place_id` | string | ID usable with `GET /api/places/{place_id}` |
| `stops[].category` | string | `restaurant` \| `market` \| `shop` \| `attraction` |
| `stops[].est_cost` | number | Estimated cost at this stop |
| `stops[].stay_minutes` | number | Suggested time spent |
| `stops[].cost_breakdown` | object | `food`, `entry`, `transport` (transport = cost to reach this stop) |
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
  "price_range": { "min": 100, "max": 300, "currency": "PHP" },
  "opening_hours": "08:00-20:00",
  "description": "string",
  "photos": ["https://..."]
}
```

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
| 504 | `AI_TIMEOUT` | The AI module did not respond in time |
