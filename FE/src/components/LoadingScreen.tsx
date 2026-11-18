import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createMover, moveTo, runMovers, type Mover } from './anim/pathMover.ts'
import { BUSHES, ROAD_FRACS, ROAD_PATH } from './anim/scenery.ts'
import { useT } from '../lib/i18n.ts'
import Icon from './Icon.tsx'
import './anim/anim.css'

const STEP_COUNT = 3
const STEP_MS = 1600
const DRIVE_MS = 1400

interface Props {
  region: string
  /** True once the recommendation has arrived: all steps finish and the jeepney reaches stop 4. */
  done: boolean
  onClose: () => void
}

// 2. 추천 중: a jeepney drives stop to stop, one stop per step.
// Steps advance on a timer and wait at the last step until `done`.
export default function LoadingScreen({ region, done, onClose }: Props) {
  const t = useT()
  const [timedStep, setTimedStep] = useState(0)
  const step = done ? STEP_COUNT : timedStep

  const pathRef = useRef<SVGPathElement>(null)
  const jeepRef = useRef<SVGGElement>(null)
  const stopRefs = useRef<SVGGElement[]>([])
  const moverRef = useRef<Mover | null>(null)

  useEffect(() => {
    if (done || timedStep >= STEP_COUNT - 1) return
    const t = setTimeout(() => setTimedStep((s) => s + 1), STEP_MS)
    return () => clearTimeout(t)
  }, [timedStep, done])

  useLayoutEffect(() => {
    const mover = createMover({
      path: pathRef.current!,
      obj: jeepRef.current!,
      marks: stopRefs.current,
      fracs: ROAD_FRACS,
      markOffset: 22,
    })
    moverRef.current = mover
    return runMovers([mover])
  }, [])

  useEffect(() => {
    if (moverRef.current) moveTo(moverRef.current, ROAD_FRACS[Math.min(step + 1, ROAD_FRACS.length - 1)], DRIVE_MS)
  }, [step])

  return (
    <div className="loading" role="status" aria-live="polite">
      <div className="header">
        <button type="button" className="icon-btn" onClick={onClose} aria-label={t.cancel}>
          <Icon name="close" />
        </button>
      </div>
      <div className="loading-main">
        <svg className="loading-art" viewBox="0 0 334 200" aria-hidden="true">
          {BUSHES.map((b, i) => (
            <circle
              key={i}
              cx={b.x.toFixed(1)}
              cy={b.y.toFixed(1)}
              r={b.r.toFixed(1)}
              fill={b.dark ? 'var(--forest-line)' : 'var(--forest-mid)'}
            />
          ))}
          <path d={ROAD_PATH} fill="none" stroke="var(--forest-deep)" strokeWidth="30" strokeLinecap="round" />
          <path d={ROAD_PATH} fill="none" stroke="var(--forest-line)" strokeWidth="24" strokeLinecap="round" />
          <path
            className="lane"
            d={ROAD_PATH}
            fill="none"
            stroke="var(--on-forest)"
            strokeWidth="1.6"
            strokeDasharray="7 9"
            opacity="0.5"
          />
          <path ref={pathRef} d={ROAD_PATH} fill="none" stroke="none" />
          {ROAD_FRACS.map((_, i) => (
            <g
              key={i}
              className="stop"
              ref={(el) => {
                if (el) stopRefs.current[i] = el
              }}
            >
              <circle r="11" />
              <text textAnchor="middle" dominantBaseline="central">
                {i + 1}
              </text>
            </g>
          ))}
          <g ref={jeepRef}>
            <rect x="-14" y="-7.5" width="28" height="15" rx="3.5" fill="var(--on-forest)" />
            <rect x="7" y="-7.5" width="7" height="15" rx="3" fill="var(--mango)" />
            <rect x="-10" y="-4.5" width="14" height="9" rx="1.5" fill="var(--forest-mid)" />
            <line x1="-3" y1="-4.5" x2="-3" y2="4.5" stroke="var(--on-forest)" strokeWidth="1.2" />
          </g>
        </svg>

        <h1 className="title">{t.loadingTitle(region)}</h1>

        <ol className="loading-steps">
          {t.loadingSteps.map((label, i) => {
            const state = i < step ? 'done' : i === step ? 'active' : ''
            return (
              <li key={i} className={state}>
                <span className="n">{String(i + 1).padStart(2, '0')}</span>
                <span className="l">{label}</span>
                <span className="st">{i < step ? t.stepState.done : i === step ? t.stepState.active : t.stepState.waiting}</span>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
