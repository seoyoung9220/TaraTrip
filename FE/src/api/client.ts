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
// Long enough to watch all three loading steps (1.6 s each).
const MOCK_RECOMMEND_MS = 5200
// Below this the mock answers BUDGET_TOO_LOW, like the real backend would.
const MOCK_MIN_BUDGET = 300

const MOCK_ERRORS: Record<string, [ApiErrorCode, number]> = {
  BUDGET_TOO_LOW: ['BUDGET_TOO_LOW', 422],
  NO_RESULTS: ['NO_RESULTS', 422],
  AI_TIMEOUT: ['AI_TIMEOUT', 504],
  INVALID_REQUEST: ['INVALID_REQUEST', 400],
}

function delay<T>(value: T, ms = MOCK_DELAY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

function fail(code: ApiErrorCode, status: number, ms: number): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new ApiError(code, `Mock ${code}`, status)), ms))
}

// Mock only: add ?mockError=NO_RESULTS (or another code) to the URL to see an error screen.
function mockRecommend(req: RecommendationRequest): Promise<Recommendation> {
  const forced = MOCK_ERRORS[new URLSearchParams(window.location.search).get('mockError') ?? '']
  if (forced) return fail(forced[0], forced[1], 1800)
  if (req.budget.amount < MOCK_MIN_BUDGET) return fail('BUDGET_TOO_LOW', 422, 1800)
  return delay(mockRecommendation, MOCK_RECOMMEND_MS)
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
  if (USE_MOCK) return mockRecommend(req)
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
