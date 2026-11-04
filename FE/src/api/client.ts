import { mockExchangeRate, mockPlace, mockRecommendation } from './mock.ts'
import {
  ApiError,
  type ApiErrorCode,
  type ExchangeRate,
  type PlaceDetail,
  type Recommendation,
  type RecommendationRequest,
} from './types.ts'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const MOCK_DELAY_MS = 800

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_DELAY_MS))
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const code: ApiErrorCode = body?.error?.code ?? 'INVALID_REQUEST'
    throw new ApiError(code, body?.error?.message ?? res.statusText, res.status)
  }
  return res.json() as Promise<T>
}

export function getRecommendation(req: RecommendationRequest): Promise<Recommendation> {
  if (USE_MOCK) return delay(mockRecommendation)
  return request('/recommendations', { method: 'POST', body: JSON.stringify(req) })
}

export async function getPlace(placeId: string): Promise<PlaceDetail> {
  if (USE_MOCK) {
    const place = mockPlace(placeId)
    if (!place) throw new ApiError('PLACE_NOT_FOUND', 'Unknown place', 404)
    return delay(place)
  }
  return request(`/places/${encodeURIComponent(placeId)}`)
}

export function getExchangeRate(): Promise<ExchangeRate> {
  if (USE_MOCK) return delay(mockExchangeRate)
  return request('/exchange-rate')
}
