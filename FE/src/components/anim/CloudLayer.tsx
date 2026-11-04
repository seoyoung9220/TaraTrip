import type { CSSProperties } from 'react'
import type { Cloud } from './scenery.ts'

interface Props {
  clouds: Cloud[]
  /** Clouds enter at `from` and leave at `to` (SVG units, in the parent's viewBox). */
  from: number
  to: number
}

// Three soft blobs per cloud; the CSS animation `drift` moves each one across the viewBox.
export default function CloudLayer({ clouds, from, to }: Props) {
  return (
    <>
      {clouds.map((c, i) => (
        <g key={i} transform={`translate(0,${c.y})`}>
          <g
            className="cloud"
            style={
              {
                '--from': `${from}px`,
                '--to': `${to}px`,
                animationDuration: `${c.dur}s`,
                animationDelay: `-${c.lead}s`,
              } as CSSProperties
            }
          >
            <g transform={`scale(${c.scale})`} fill="var(--on-forest)" opacity={c.opacity}>
              <ellipse cx="22" cy="14" rx="22" ry="9" />
              <ellipse cx="40" cy="6" rx="16" ry="11" />
              <ellipse cx="58" cy="13" rx="19" ry="8" />
              <rect x="6" y="13" width="70" height="9" rx="4.5" />
            </g>
          </g>
        </g>
      ))}
    </>
  )
}
