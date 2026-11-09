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

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토']

/** "오늘", "내일", or "11월 20일 (금)". */
export function dayLabel(iso: string): string {
  if (iso === today()) return '오늘'
  if (iso === tomorrow()) return '내일'
  const [y, m, d] = iso.split('-').map(Number)
  const weekday = WEEKDAY_KO[new Date(y, m - 1, d).getDay()]
  return `${m}월 ${d}일 (${weekday})`
}
