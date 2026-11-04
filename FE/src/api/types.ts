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
  free_text?: string
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
  transport: Transport | null
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
}

export interface PlaceDetail extends LatLng {
  place_id: string
  name: string
  category: PlaceCategory
  address: string
  price_range: { min: number; max: number; currency: 'PHP' }
  opening_hours: string
  description: string
  photos: string[]
}

export interface ExchangeRate {
  base: 'PHP'
  quote: 'KRW'
  rate: number
  updated_at: string
}

export type ApiErrorCode =
  | 'INVALID_REQUEST'
  | 'PLACE_NOT_FOUND'
  | 'BUDGET_TOO_LOW'
  | 'NO_RESULTS'
  | 'AI_TIMEOUT'

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number

  constructor(code: ApiErrorCode, message: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}
