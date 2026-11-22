import type { Transport } from '../api/types.ts'
import type { Lang, Messages } from './i18n.ts'

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

const DAYS_KO: Record<string, string> = { Mon: '월', Tue: '화', Wed: '수', Thu: '목', Fri: '금', Sat: '토', Sun: '일' }

/**
 * Opening hours from the data ("Mon closed, Tue-Sun 09:00-18:00") for the place screen:
 * day names and "closed" in Korean for ko, en dashes between days and times, and
 * "00:00-23:59" / "00:00-24:00" as open 24 hours. One line per part.
 */
export function formatHours(hours: string, lang: Lang): string[] {
  const ko = lang === 'ko'
  return hours.split(',').map((part) => {
    let s = part.trim()
    if (/^00:00-(23:59|24:00)$/.test(s)) return ko ? '24시간' : 'Open 24 hours'
    s = s.replace(/(\d{2}:\d{2})-(\d{2}:\d{2})/g, '$1 – $2')
    s = s.replace(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)-(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/g, '$1–$2')
    if (ko) s = s.replace(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/g, (d) => DAYS_KO[d]).replace(/\bclosed\b/gi, '휴무')
    else s = s.replace(/\bclosed\b/g, 'Closed')
    return s
  })
}
