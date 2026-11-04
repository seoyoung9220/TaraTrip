// Moves an SVG group along a path (plane on the splash, jeepney on the loading screen).
// Marks placed along the path get the `lit` class once the mover has passed them.

export interface Mover {
  path: SVGPathElement
  obj: SVGGElement
  marks: SVGGElement[]
  fracs: number[]
  trail: SVGPathElement | null
  scale: number
  length: number
  cur: number
  from: number
  to: number
  t0: number
  dur: number
}

interface Options {
  path: SVGPathElement
  obj: SVGGElement
  marks: SVGGElement[]
  /** Position of each mark along the path, 0–1. */
  fracs: number[]
  /** Distance of each mark from the path, to the left of the direction of travel. */
  markOffset?: number
  trail?: SVGPathElement | null
  scale?: number
}

export const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

function angleAt(path: SVGPathElement, length: number, total: number): number {
  const a = path.getPointAtLength(Math.max(0, length - 1))
  const b = path.getPointAtLength(Math.min(total, length + 1))
  return Math.atan2(b.y - a.y, b.x - a.x)
}

export function createMover(o: Options): Mover {
  const length = o.path.getTotalLength()
  const offset = o.markOffset ?? 0
  o.trail?.setAttribute('stroke-dasharray', `${length} ${length}`)
  o.marks.forEach((g, i) => {
    const at = length * o.fracs[i]
    const p = o.path.getPointAtLength(at)
    const ang = angleAt(o.path, at, length)
    const x = p.x + Math.sin(ang) * offset
    const y = p.y - Math.cos(ang) * offset
    g.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`)
  })
  const m: Mover = {
    path: o.path,
    obj: o.obj,
    marks: o.marks,
    fracs: o.fracs,
    trail: o.trail ?? null,
    scale: o.scale ?? 1,
    length,
    cur: 0,
    from: 0,
    to: 0,
    t0: 0,
    dur: 0,
  }
  placeMover(m, 0)
  return m
}

export function placeMover(m: Mover, p: number): void {
  const at = m.length * p
  const c = m.path.getPointAtLength(at)
  const deg = (angleAt(m.path, at, m.length) * 180) / Math.PI
  m.obj.setAttribute(
    'transform',
    `translate(${c.x.toFixed(2)},${c.y.toFixed(2)}) rotate(${deg.toFixed(1)}) scale(${m.scale})`,
  )
  m.trail?.setAttribute('stroke-dashoffset', (m.length * (1 - p)).toFixed(2))
  m.marks.forEach((g, i) => g.classList.toggle('lit', p >= m.fracs[i] - 0.002))
  m.cur = p
}

export function moveTo(m: Mover, to: number, dur: number): void {
  m.from = m.cur
  m.to = to
  m.t0 = performance.now()
  m.dur = prefersReducedMotion() ? 0 : dur
}

export function jumpTo(m: Mover, p: number): void {
  m.from = p
  m.to = p
  m.dur = 0
  placeMover(m, p)
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** Starts a frame loop for the movers. Returns a function that stops it. */
export function runMovers(movers: Mover[]): () => void {
  let id = 0
  const frame = (now: number) => {
    for (const m of movers) {
      const t = m.dur ? Math.min(1, (now - m.t0) / m.dur) : 1
      placeMover(m, m.from + (m.to - m.from) * ease(t))
    }
    id = requestAnimationFrame(frame)
  }
  id = requestAnimationFrame(frame)
  return () => cancelAnimationFrame(id)
}
