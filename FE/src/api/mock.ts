// Sample responses shaped like docs/API.md. Names and amounts are placeholders, not real data.
import type { ExchangeRate, PlaceDetail, Recommendation, RecommendationRequest, Regions, Stop } from './types.ts'

export const mockRecommendation: Recommendation = {
  route_id: 'mock-route-1',
  total_cost: 920,
  total_minutes: 330,
  currency: 'PHP',
  summary: '[AI 추천 요약: 이 코스가 예산과 취향에 맞는 이유]',
  stops: [
    {
      order: 1,
      place_id: 'mock-place-1',
      name: '[식당 이름]',
      category: 'restaurant',
      lat: 14.5995,
      lng: 120.9842,
      arrival_time: '10:00',
      est_cost: 250,
      stay_minutes: 60,
      transport: null,
      cost_breakdown: { food: 250, entry: 0, transport: 0 },
      reason: '[이곳을 추천한 이유]',
    },
    {
      order: 2,
      place_id: 'mock-place-2',
      name: '[시장 이름]',
      category: 'market',
      lat: 14.6025,
      lng: 120.9881,
      arrival_time: '11:20',
      est_cost: 180,
      stay_minutes: 60,
      transport: { mode: 'jeepney', minutes: 15, cost: 13 },
      cost_breakdown: { food: 180, entry: 0, transport: 13 },
      reason: '[이곳을 추천한 이유]',
    },
    {
      order: 3,
      place_id: 'mock-place-3',
      name: '[관광지 이름]',
      category: 'attraction',
      lat: 14.5978,
      lng: 120.9925,
      arrival_time: '12:40',
      est_cost: 150,
      stay_minutes: 90,
      transport: { mode: 'walk', minutes: 20, cost: 0 },
      cost_breakdown: { food: 0, entry: 150, transport: 0 },
      reason: '[이곳을 추천한 이유]',
    },
    {
      order: 4,
      place_id: 'mock-place-4',
      name: '[가게 이름]',
      category: 'shop',
      lat: 14.6061,
      lng: 120.9968,
      arrival_time: '14:30',
      est_cost: 280,
      stay_minutes: 45,
      transport: { mode: 'tricycle', minutes: 10, cost: 47 },
      cost_breakdown: { food: 280, entry: 0, transport: 47 },
      reason: '[이곳을 추천한 이유]',
    },
  ],
}

// Extra candidates so longer trips get longer mock routes.
const EXTRA_STOPS: Stop[] = [
  {
    order: 5,
    place_id: 'mock-place-5',
    name: '[카페 이름]',
    category: 'restaurant',
    lat: 14.6042,
    lng: 120.9931,
    arrival_time: '15:30',
    est_cost: 120,
    stay_minutes: 40,
    transport: { mode: 'walk', minutes: 10, cost: 0 },
    cost_breakdown: { food: 120, entry: 0, transport: 0 },
    reason: '[이곳을 추천한 이유]',
  },
  {
    order: 6,
    place_id: 'mock-place-6',
    name: '[관광지 이름 2]',
    category: 'attraction',
    lat: 14.6003,
    lng: 120.9897,
    arrival_time: '16:30',
    est_cost: 75,
    stay_minutes: 60,
    transport: { mode: 'walk', minutes: 15, cost: 0 },
    cost_breakdown: { food: 0, entry: 75, transport: 0 },
    reason: '[이곳을 추천한 이유]',
  },
  {
    order: 7,
    place_id: 'mock-place-7',
    name: '[식당 이름 2]',
    category: 'restaurant',
    lat: 14.5968,
    lng: 120.9861,
    arrival_time: '18:00',
    est_cost: 220,
    stay_minutes: 60,
    transport: { mode: 'jeepney', minutes: 15, cost: 13 },
    cost_breakdown: { food: 220, entry: 0, transport: 13 },
    reason: '[이곳을 추천한 이유]',
  },
]

const MOCK_POOL = [...mockRecommendation.stops, ...EXTRA_STOPS]
const isMeal = (s: Stop) => s.category === 'restaurant' || s.category === 'market'

const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
const toClock = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/**
 * Mock route that follows the AI module's length rules (AI/recommend.py, PR #14) so
 * the result screen can be checked with short and long trips:
 * up to round(5 × hours / 6) stops (max 7), up to 2 food stops (3 if foods were picked,
 * +1 for 8 h or more), never 3 food stops in a row, and nothing past end_time (default 10:00–16:00).
 */
export function mockRouteFor(req: RecommendationRequest): Recommendation {
  const start = toMinutes(req.start_time ?? '10:00')
  const hours = (toMinutes(req.end_time ?? '16:00') - start) / 60
  const maxStops = Math.min(7, Math.max(1, Math.round((5 * hours) / 6)))
  const maxMeals = (req.foods?.length ? 3 : 2) + (hours >= 8 ? 1 : 0)

  const end = start + hours * 60
  const stops: Stop[] = []
  let clock = start
  for (const s of MOCK_POOL) {
    if (stops.length >= maxStops) break
    const meals = stops.filter(isMeal).length
    const lastTwoMeals = stops.length >= 2 && stops.slice(-2).every(isMeal)
    if (isMeal(s) && (meals >= maxMeals || lastTwoMeals)) continue
    const transport = stops.length === 0 ? null : s.transport
    const arrival = clock + (transport?.minutes ?? 0)
    // Like the AI module: a stop that would run past end_time is left out (keep at least one).
    if (stops.length > 0 && arrival + s.stay_minutes > end) continue
    stops.push({
      ...s,
      order: stops.length + 1,
      arrival_time: toClock(arrival),
      transport,
      cost_breakdown: { ...s.cost_breakdown, transport: transport?.cost ?? 0 },
    })
    clock = arrival + s.stay_minutes
  }

  return {
    ...mockRecommendation,
    total_cost: stops.reduce((sum, s) => sum + s.est_cost + (s.transport?.cost ?? 0), 0),
    total_minutes: clock - start,
    stops,
  }
}

export function mockPlace(placeId: string): PlaceDetail | undefined {
  const stop = MOCK_POOL.find((s) => s.place_id === placeId)
  if (!stop) return undefined
  return {
    place_id: stop.place_id,
    name: stop.name,
    category: stop.category,
    lat: stop.lat,
    lng: stop.lng,
    address: '[주소]',
    price_range: { min: 100, max: 300, currency: 'PHP' },
    signature_menu: stop.category === 'restaurant' ? '[대표 메뉴]' : null,
    signature_price: stop.category === 'restaurant' ? 150 : null,
    cash_only: stop.category === 'restaurant',
    opening_hours: '08:00-20:00',
    description: '[가게 소개 문구]',
    photos: [],
  }
}

export const mockExchangeRate: ExchangeRate = {
  base: 'PHP',
  quote: 'KRW',
  rate: 24,
  updated_at: '2026-11-04T00:00:00Z',
}

// Same districts as BE/dev/sample_places.py.
export const mockRegions: Regions = { regions: ['Binondo', 'Intramuros'] }
