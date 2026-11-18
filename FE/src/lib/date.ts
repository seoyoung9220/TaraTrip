import type { Messages } from './i18n.ts'

// Dates as "YYYY-MM-DD" in the device's local time (the traveler is in the Philippines).

export function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function today(): string {
  return isoDate(new Date())
}

export function tomorrow(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return isoDate(d)
}

/** "오늘"/"Today", "내일"/"Tomorrow", or "11월 20일 (금)"/"Fri, Nov 20". */
export function dayLabel(iso: string, t: Messages): string {
  if (iso === today()) return t.today
  if (iso === tomorrow()) return t.tomorrow
  const [y, m, d] = iso.split('-').map(Number)
  return t.date(m, d, t.weekdays[new Date(y, m - 1, d).getDay()])
}
