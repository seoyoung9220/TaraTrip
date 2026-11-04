// Static artwork data for the splash and loading animations (same shapes as the design mockup).

type Pt = [number, number]

function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ]
}

// ---------- splash: flight path ----------
export const FLIGHT_PATH = 'M10 48 C 46 48, 58 18, 100 20 S 158 50, 190 18'
export const FLIGHT_FRACS = [0, 0.5, 1]
export const PLANE_SHAPE =
  'M15 0c0-1.6-2-2.2-4-2.2H3.6L-4.4-11h-3.2l4.2 8.8H-9l-3-4h-2.4l1.6 6.2-1.6 6.2h2.4l3-4h5.6L-7.6 11h3.2l8-8.8H11c2 0 4-.6 4-2.2z'

export interface Cloud {
  y: number
  scale: number
  opacity: number
  /** Seconds for one pass. */
  dur: number
  /** Seconds already elapsed at load, so clouds start spread out. */
  lead: number
}

/** Large, faint clouds across the top of the splash screen. */
export const SKY_CLOUDS: Cloud[] = [
  { y: 34, scale: 1.5, opacity: 0.07, dur: 46, lead: 6 },
  { y: 92, scale: 1.1, opacity: 0.1, dur: 36, lead: 22 },
  { y: 150, scale: 0.8, opacity: 0.06, dur: 52, lead: 38 },
  { y: 62, scale: 0.9, opacity: 0.05, dur: 58, lead: 44 },
]

/** Small clouds right around the flight path. */
export const FLIGHT_CLOUDS: Cloud[] = [
  { y: 6, scale: 1, opacity: 0.08, dur: 16, lead: 3 },
  { y: 40, scale: 0.7, opacity: 0.06, dur: 21, lead: 12 },
]

// ---------- loading: road ----------
// The S commands written out as cubics, so the bushes can be placed without a DOM.
const ROAD_SEGMENTS: [Pt, Pt, Pt, Pt][] = [
  [[14, 182], [92, 182], [34, 112], [112, 106]],
  [[112, 106], [190, 100], [214, 152], [236, 100]],
  [[236, 100], [258, 48], [266, 28], [320, 28]],
]
export const ROAD_PATH = 'M14 182 C 92 182, 34 112, 112 106 S 214 152, 236 100 S 266 28, 320 28'
export const ROAD_FRACS = [0, 1 / 3, 2 / 3, 1]

export interface Bush {
  x: number
  y: number
  r: number
  dark: boolean
}

function makeBushes(): Bush[] {
  const samples: Pt[] = []
  for (const seg of ROAD_SEGMENTS) {
    for (let i = 0; i <= 30; i++) samples.push(cubic(seg[0], seg[1], seg[2], seg[3], i / 30))
  }
  const r = rng(21)
  const out: Bush[] = []
  for (let tries = 0; tries < 160 && out.length < 26; tries++) {
    const x = 4 + r() * 326
    const y = 8 + r() * 186
    const clear = samples.every(([sx, sy]) => (sx - x) ** 2 + (sy - y) ** 2 >= 30 * 30)
    if (!clear) continue
    out.push({ x, y, r: 4 + r() * 6, dark: r() <= 0.4 })
  }
  return out
}

export const BUSHES = makeBushes()
