import type { PlaceCategory, Transport, TransportMode } from '../api/types.ts'

export function peso(amount: number): string {
  return `₱${Math.round(amount).toLocaleString('en-US')}`
}

// Rounded to 100 won: the rate changes daily, so more precision is noise.
export function won(php: number, rate: number): string {
  return `${(Math.round((php * rate) / 100) * 100).toLocaleString('ko-KR')}원`
}

export function duration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m}분`
  return m ? `${h}시간 ${m}분` : `${h}시간`
}

export const CATEGORY_KO: Record<PlaceCategory, string> = {
  restaurant: '식당',
  market: '시장',
  shop: '가게',
  attraction: '관광지',
}

export const TRANSPORT_KO: Record<TransportMode, string> = {
  walk: '도보',
  jeepney: '지프니',
  tricycle: '트라이시클',
  taxi: '택시',
  other: '이동',
}

export function transportLabel(t: Transport): string {
  const parts = [TRANSPORT_KO[t.mode], duration(t.minutes)]
  if (t.cost > 0) parts.push(peso(t.cost))
  return parts.join(' · ')
}
