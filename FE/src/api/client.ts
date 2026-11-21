import { mockExchangeRate, mockPlace, mockRegions, mockRouteFor } from './mock.ts'
import {
  ApiError,
  type ApiErrorCode,
  type ExchangeRate,
  type MerchantPlace,
  type MerchantPlaceCreated,
  type MerchantPlaceInput,
  type PlaceDetail,
  type Promo,
  type PromoRequest,
  type Recommendation,
  type RecommendationRequest,
  type Regions,
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
  return delay(mockRouteFor(req), MOCK_RECOMMEND_MS)
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

/** `lang` picks the Korean or English description and signature menu (docs/API.md). */
export async function getPlace(placeId: string, lang: 'ko' | 'en'): Promise<PlaceDetail> {
  if (USE_MOCK) {
    const place = mockPlace(placeId)
    if (!place) throw new ApiError('PLACE_NOT_FOUND', 'Unknown place', 404)
    return delay(place)
  }
  return request(`/places/${encodeURIComponent(placeId)}?lang=${lang}`)
}

export function getExchangeRate(): Promise<ExchangeRate> {
  if (USE_MOCK) return delay(mockExchangeRate)
  return request('/exchange-rate')
}

export function getRegions(): Promise<Regions> {
  if (USE_MOCK) return delay(mockRegions)
  return request('/regions')
}

// ── merchant ──
// Mock mode keeps registered places in memory (lost on reload); the edit key is always "mock-key".
const mockOwned = new Map<string, MerchantPlace>()

function mockOwn(placeId: string, key: string): MerchantPlace {
  const place = mockOwned.get(placeId)
  if (!place) throw new ApiError('PLACE_NOT_FOUND', 'Unknown place', 404)
  if (key !== 'mock-key') throw new ApiError('INVALID_EDIT_KEY', 'Wrong edit key', 401)
  return place
}

export function registerPlace(body: MerchantPlaceInput): Promise<MerchantPlaceCreated> {
  if (USE_MOCK) {
    const place = { ...body, place_id: `BIZ-${String(mockOwned.size + 1).padStart(4, '0')}` }
    mockOwned.set(place.place_id, place)
    return delay({ ...place, edit_key: 'mock-key' })
  }
  return request('/merchant/places', { method: 'POST', body: JSON.stringify(body) })
}

export async function getOwnPlace(placeId: string, key: string): Promise<MerchantPlace> {
  if (USE_MOCK) return delay(mockOwn(placeId, key))
  return request(`/merchant/places/${encodeURIComponent(placeId)}`, { headers: { 'X-Edit-Key': key } })
}

export async function updateOwnPlace(placeId: string, key: string, body: MerchantPlaceInput): Promise<MerchantPlace> {
  if (USE_MOCK) {
    mockOwn(placeId, key)
    const place = { ...body, place_id: placeId }
    mockOwned.set(placeId, place)
    return delay(place)
  }
  return request(`/merchant/places/${encodeURIComponent(placeId)}`, {
    method: 'PUT',
    headers: { 'X-Edit-Key': key },
    body: JSON.stringify(body),
  })
}

// Mock mode: a fixed text built from the form, so the screen can be tried without the AI.
export function writePromo(body: PromoRequest): Promise<Promo> {
  if (USE_MOCK) {
    const where = body.district ? ` in ${body.district}` : ''
    const best = body.signature_menu ? ` Try the ${body.signature_menu}.` : ''
    return delay(
      {
        description: `A local favorite${where}.${best} ${body.notes}`.slice(0, 400),
        post: `Visiting${where || ' Manila'}? Drop by ${body.name}!${best} Find us on TaraTrip. #TaraTrip #SupportLocal`,
      },
      1500,
    )
  }
  return request('/merchant/promo', { method: 'POST', body: JSON.stringify(body) })
}
