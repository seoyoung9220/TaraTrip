// Similarity search for the must-see box. Plain functions, no React, so it can be tried with node.
//
// Names in the DB are English, so an English query is scored against the name: a part of the
// name ranks highest, typos ("fort santigo") still score by shared letter pairs. A Korean query
// cannot match an English name, so it is scored against the Korean description instead
// ("산티아고" finds the place whose description mentions 산티아고).

export interface Searchable {
  name: string
  description_ko?: string | null
}

const HANGUL = /[ㄱ-ㆎ가-힣]/
// Below this a place is not shown at all, so random letters do not list random places.
const MIN_SCORE = 0.34

// Case, spaces, punctuation and accents ignored: "Paco-Park" and "pacopark" are the same.
export function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .toLowerCase()
}

function pairs(s: string): string[] {
  const out: string[] = []
  for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2))
  return out
}

/** Share of the query's letter pairs found in the text (0..1). */
function coverage(q: string, text: string): number {
  const qp = pairs(q)
  if (!qp.length) return 0
  const tp = new Set(pairs(text))
  return qp.filter((p) => tp.has(p)).length / qp.length
}

/** Dice similarity of the two strings' letter pairs (0..1): penalises long names that only contain the query. */
function dice(a: string, b: string): number {
  const ap = pairs(a)
  const bp = pairs(b)
  if (!ap.length || !bp.length) return 0
  const left = [...bp]
  let shared = 0
  for (const p of ap) {
    const i = left.indexOf(p)
    if (i >= 0) {
      shared++
      left.splice(i, 1)
    }
  }
  return (2 * shared) / (ap.length + bp.length)
}

// Hangul → Latin letters, roughly Revised Romanization, tuned for loanwords: an ㅡ with no final
// consonant is dropped (트 → t, 스 → s) so "인트라무로스" becomes "intramuros", "산티아고" "santiago".
const INITIAL = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h']
const VOWEL = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i']
const FINAL = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'l', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't']

export function romanize(s: string): string {
  let out = ''
  let prevFinal = -1
  for (const ch of s) {
    const code = ch.charCodeAt(0) - 0xac00
    if (code < 0 || code > 11171) {
      out += ch
      prevFinal = -1
      continue
    }
    const ini = Math.floor(code / 588)
    const vow = Math.floor((code % 588) / 28)
    const fin = code % 28
    // ㄹ after a final ㄹ is "l" (마닐라 → manilla); otherwise "r".
    const head = ini === 5 && prevFinal === 8 ? 'l' : INITIAL[ini]
    const body = vow === 18 && fin === 0 && ini !== 11 ? '' : VOWEL[vow]
    out += head + body + FINAL[fin]
    prevFinal = fin
  }
  return out
}

function nameScore(q: string, place: Searchable): number {
  const name = norm(place.name)
  if (name.startsWith(q)) return 2
  if (name.includes(q)) return 1.5
  // Each word too, so "santigo" is compared with "santiago" and not the whole long name.
  const words = place.name.split(/\s+/).map(norm).filter(Boolean)
  const best = Math.max(dice(q, name), ...words.map((w) => dice(q, w)))
  return 0.6 * coverage(q, name) + 0.4 * best
}

// Spellings that sound alike, so romanized Korean meets Spanish/Filipino spelling:
// 키아포 "kiapo" ~ Quiapo, 리잘 "rijal" ~ Rizal, 파코 "pako" ~ Paco.
function sound(s: string): string {
  return s.replace(/qu/g, 'k').replace(/ph/g, 'p').replace(/c/g, 'k').replace(/z/g, 'j').replace(/f/g, 'p').replace(/v/g, 'b').replace(/x/g, 'ks')
}

// Common words in place names, so "파코 공원" meets "Paco Park" and "마닐라 대성당" "Manila Cathedral".
const WORDS: Record<string, string[]> = {
  공원: ['park'],
  파크: ['park'],
  성당: ['cathedral', 'church', 'basilica'],
  대성당: ['cathedral', 'basilica'],
  교회: ['church'],
  박물관: ['museum', 'museo'],
  미술관: ['museum', 'gallery'],
  시장: ['market'],
  마켓: ['market'],
  요새: ['fort'],
  성벽: ['fort', 'baluarte'],
  광장: ['plaza'],
  극장: ['theater'],
  거리: ['street'],
  카페: ['cafe'],
  식당: ['restaurant'],
  해변: ['beach', 'baywalk'],
  차이나타운: ['chinatown'],
}

function koreanScore(q: string, place: Searchable): number {
  if (q.length < 2) return 0
  const english = WORDS[q]
  if (english) return Math.max(...english.map((e) => nameScore(e, place)), 0.9 * Number(norm(place.description_ko ?? '').includes(q)))
  // The sound of the name ("산티아고" ~ "Santiago") or a word in the Korean description.
  const bySound = 0.95 * nameScore(sound(norm(romanize(q))), { name: sound(place.name.toLowerCase()) })
  const ko = norm(place.description_ko ?? '')
  const byText = !ko ? 0 : ko.includes(q) ? 0.9 : 0.8 * coverage(q, ko)
  return Math.max(bySound, byText)
}

export function score(query: string, place: Searchable): number {
  const q = norm(query)
  if (!q) return 0
  if (!HANGUL.test(q)) return nameScore(q, place)
  // "파코 공원": each word on its own too (파코 → Paco, 공원 → park in the description).
  const words = query.split(/\s+/).map(norm).filter(Boolean)
  // Capped at 1 so one strong word ("파크") cannot outweigh the others ("마닐라 오션").
  const perWord =
    words.length > 1 ? words.reduce((sum, w) => sum + Math.min(1, koreanScore(w, place)), 0) / words.length : 0
  return Math.max(koreanScore(q, place), perWord)
}

/** Best matches first, at most `limit`. */
export function searchPlaces<T extends Searchable>(query: string, places: T[], limit: number): T[] {
  return places
    .map((p) => ({ p, s: score(query, p) }))
    .filter((x) => x.s >= MIN_SCORE)
    .sort((a, b) => b.s - a.s || a.p.name.localeCompare(b.p.name))
    .slice(0, limit)
    .map((x) => x.p)
}
