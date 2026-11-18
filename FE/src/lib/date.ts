import type { Messages } from './i18n.ts'

// Dates as "YYYY-MM-DD" in Manila time (PHT, UTC+8), the same "today" the backend uses,
// so a tester outside the Philippines sees the trip's local date.

const MANILA = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' })
const DAY_MS = 24 * 60 * 60 * 1000

export function isoDate(d: Date): string {
  return MANILA.format(d) // en-CA formats as YYYY-MM-DD
}

export function today(): string {
  return isoDate(new Date())
}

export function tomorrow(): string {
  return isoDate(new Date(Date.now() + DAY_MS)) // Manila has no daylight saving time
}

/** "오늘"/"Today", "내일"/"Tomorrow", or "11월 20일 (금)"/"Fri, Nov 20". */
export function dayLabel(iso: string, t: Messages): string {
  if (iso === today()) return t.today
  if (iso === tomorrow()) return t.tomorrow
  const [y, m, d] = iso.split('-').map(Number)
  return t.date(m, d, t.weekdays[new Date(y, m - 1, d).getDay()])
}
