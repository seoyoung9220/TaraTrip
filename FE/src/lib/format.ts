import type { Transport } from '../api/types.ts'
import type { Messages } from './i18n.ts'

export function peso(amount: number): string {
  return `₱${Math.round(amount).toLocaleString('en-US')}`
}

// Rounded to 100 won: the rate changes daily, so more precision is noise.
export function won(php: number, rate: number): string {
  return `₩${(Math.round((php * rate) / 100) * 100).toLocaleString('ko-KR')}`
}

/** "₱100 – ₱300", or one value when both ends match ("₱75"); "무료"/"Free" when it costs nothing. */
export function pesoRange(min: number, max: number, t: Messages): string {
  if (max <= 0) return t.free
  return min === max ? peso(min) : `${peso(min)} – ${peso(max)}`
}

export function duration(minutes: number, t: Messages): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h ? t.hoursMinutes(h, m) : t.minutes(m)
}

export function transportLabel(tr: Transport, t: Messages): string {
  const parts = [t.mode[tr.mode], duration(tr.minutes, t)]
  if (tr.cost > 0) parts.push(peso(tr.cost))
  return parts.join(' · ')
}
