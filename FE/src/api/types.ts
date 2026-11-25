// Types for docs/API.md. Update both together.

export interface LatLng {
  lat: number
  lng: number
}

export interface RecommendationRequest {
  region: string
  budget: { amount: number; currency: 'PHP' }
  foods?: string[]
  attractions?: string[]
  start_location: LatLng
  /** Where the day ends. Omit to come back to start_location. */
  end_location?: LatLng
  /** YYYY-MM-DD. Picks that weekday's opening hours; backend default is today in Manila. */
  travel_date?: string
  /** HH:MM. Omit to let free_text (or the default 10:00–16:00) decide. */
  start_time?: string
  end_time?: string
  free_text?: string
  /** Language of summary and reasons. Backend default is "ko". */
  lang?: 'ko' | 'en'
}

export type PlaceCategory = 'restaurant' | 'market' | 'shop' | 'attraction'

export type TransportMode = 'walk' | 'jeepney' | 'tricycle' | 'taxi' | 'other'

export interface Transport {
  mode: TransportMode
  minutes: number
  cost: number
}

export interface Stop extends LatLng {
  order: number
  place_id: string
  name: string
  category: PlaceCategory
  arrival_time: string
  est_cost: number
  stay_minutes: number
  /** From the previous stop; for the first stop, from start_location. */
  transport: Transport
  cost_breakdown: { food: number; entry: number; transport: number }
  reason: string
}

export interface Recommendation {
  route_id: string
  total_cost: number
  total_minutes: number
  currency: 'PHP'
  summary: string
  stops: Stop[]
  /** Last stop to end_location (or back to start_location). Its cost is part of total_cost. */
  return_transport: Transport
}

export interface PlaceDetail extends LatLng {
  place_id: string
  name: string
  category: PlaceCategory
  address: string
  price_range: { min: number; max: number; currency: 'PHP' }
  /** Dish or product the place is known for; null if not collected. */
  signature_menu: string | null
  /** PHP, one signature_menu item; null if unknown. */
  signature_price: number | null
  /** No card / GCash / Maya. */
  cash_only: boolean
  opening_hours: string
  description: string
  photos: string[]
}

/** GET /api/places: one row per place, for the must-see search. */
export interface PlaceSummary {
  place_id: string
  name: string
  category: PlaceCategory
  district: string | null
}

export interface PlaceList {
  places: PlaceSummary[]
}

export interface Regions {
  regions: string[]
}

export interface ExchangeRate {
  base: 'PHP'
  quote: 'KRW'
  rate: number
  updated_at: string
}

// ── /api/merchant/places: owners register and edit their own place ──

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

/** Each day "HH:MM-HH:MM" or "closed". */
export type OpeningHours = Record<DayKey, string>

export interface MerchantPlaceInput extends LatLng {
  name: string
  category: PlaceCategory
  address: string
  district: string | null
  price_min: number | null
  price_max: number | null
  entry_fee: number
  signature_menu: string | null
  signature_price: number | null
  cash_only: boolean
  avg_stay_minutes: number | null
  opening_hours: OpeningHours
  tags: string[]
  description: string | null
  photos: string[]
  contact: string | null
}

export interface MerchantPlace extends MerchantPlaceInput {
  place_id: string
}

export interface MerchantPlaceCreated extends MerchantPlace {
  /** Shown once. Send it as the X-Edit-Key header to read or edit the place. */
  edit_key: string
}

// ── POST /api/merchant/promo ──
export interface PromoRequest {
  name: string
  category: PlaceCategory
  district: string | null
  signature_menu: string | null
  signature_price: number | null
  cash_only: boolean
  tags: string[]
  /** The owner's own words, any language, 1–500 chars. */
  notes: string
}

export interface Promo {
  /** English, up to 400 chars; the owner may put it in `description`. */
  description: string
  /** English Facebook post, up to 600 chars, ends with hashtags. */
  post: string
}

export type ApiErrorCode =
  | 'INVALID_REQUEST'
  | 'PLACE_NOT_FOUND'
  | 'BUDGET_TOO_LOW'
  | 'NO_RESULTS'
  | 'AI_TIMEOUT'
  | 'INVALID_EDIT_KEY'
  | 'TOO_MANY_REQUESTS'
  | 'AI_UNAVAILABLE'

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number

  constructor(code: ApiErrorCode, message: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}
