import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import CloudLayer from './anim/CloudLayer.tsx'
import { createMover, moveTo, prefersReducedMotion, runMovers } from './anim/pathMover.ts'
import { FLIGHT_CLOUDS, FLIGHT_FRACS, FLIGHT_PATH, PLANE_SHAPE, SKY_CLOUDS } from './anim/scenery.ts'
import './anim/anim.css'

const FLY_AT = 300
const FLY_MS = 1600
const LEAVE_AT = 2700
const FADE_MS = 400

interface Props {
  onDone: () => void
}

// 0-1. 시작 화면: the logo fades in while a plane flies between three pins. Tap to skip.
export default function Splash({ onDone }: Props) {
  const pathRef = useRef<SVGPathElement>(null)
  const trailRef = useRef<SVGPathElement>(null)
  const planeRef = useRef<SVGGElement>(null)
  const markRefs = useRef<SVGGElement[]>([])
  const [ready, setReady] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const doneRef = useRef(onDone)
  useEffect(() => {
    doneRef.current = onDone
  }, [onDone])

  useLayoutEffect(() => {
    const mover = createMover({
      path: pathRef.current!,
      obj: planeRef.current!,
      marks: markRefs.current,
      fracs: FLIGHT_FRACS,
      trail: trailRef.current,
      scale: 0.78,
    })
    const stop = runMovers([mover])
    const reduce = prefersReducedMotion()
    const timers = [
      setTimeout(() => setReady(true), 30),
      setTimeout(() => moveTo(mover, 1, FLY_MS), reduce ? 0 : FLY_AT),
      setTimeout(() => setLeaving(true), reduce ? 1200 : LEAVE_AT),
      setTimeout(() => doneRef.current(), (reduce ? 1200 : LEAVE_AT) + FADE_MS),
    ]
    return () => {
      stop()
      timers.forEach(clearTimeout)
    }
  }, [])

  // Keep the page behind from scrolling while the splash covers it.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return (
    <button
      type="button"
      className={`splash${ready ? ' ready' : ''}${leaving ? ' leaving' : ''}`}
      onClick={() => doneRef.current()}
      aria-label="TaraTrip 시작하기"
    >
      <svg className="splash-sky" viewBox="0 0 390 320" aria-hidden="true">
        <CloudLayer clouds={SKY_CLOUDS} from={430} to={-150} />
      </svg>
      <span className="logo fade">
        Tara<b>Trip</b>
      </span>
      <svg className="splash-flight" viewBox="0 0 200 64" aria-hidden="true">
        <CloudLayer clouds={FLIGHT_CLOUDS} from={230} to={-90} />
        <path
          d={FLIGHT_PATH}
          fill="none"
          stroke="var(--on-forest-sub)"
          strokeWidth="1.8"
          strokeDasharray="3 5"
          opacity="0.55"
        />
        <path ref={trailRef} d={FLIGHT_PATH} fill="none" stroke="var(--mango)" strokeWidth="2.4" strokeLinecap="round" />
        <path ref={pathRef} d={FLIGHT_PATH} fill="none" stroke="none" />
        {FLIGHT_FRACS.map((_, i) => (
          <g
            key={i}
            className="wp"
            ref={(el) => {
              if (el) markRefs.current[i] = el
            }}
          >
            <circle className="o" r="5.5" />
            <circle className="i" r="2" />
          </g>
        ))}
        <g ref={planeRef}>
          <path d={PLANE_SHAPE} fill="var(--on-forest)" />
        </g>
      </svg>
      <span className="splash-tagline fade">예산 안에서 만나는 현지의 하루</span>
    </button>
  )
}
