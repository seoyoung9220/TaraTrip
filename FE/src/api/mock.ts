// Sample responses shaped like docs/API.md. Names and amounts are placeholders, not real data.
import type { ExchangeRate, PlaceDetail, Recommendation } from './types.ts'

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

export function mockPlace(placeId: string): PlaceDetail | undefined {
  const stop = mockRecommendation.stops.find((s) => s.place_id === placeId)
  if (!stop) return undefined
  return {
    place_id: stop.place_id,
    name: stop.name,
    category: stop.category,
    lat: stop.lat,
    lng: stop.lng,
    address: '[주소]',
    price_range: { min: 100, max: 300, currency: 'PHP' },
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
