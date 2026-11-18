import { useRef, useState, type KeyboardEvent } from 'react'
import type { LatLng } from '../api/types.ts'
import { GEOCODE_URL } from '../config.ts'
import { useLang, useT } from '../lib/i18n.ts'
import Icon from './Icon.tsx'

interface Props {
  /** A picked result: its position and a short name for the status line. */
  onPick: (value: LatLng, label: string) => void
}

interface Result {
  lat: number
  lng: number
  title: string
  detail: string
}

interface NominatimPlace {
  lat: string
  lon: string
  name?: string
  display_name: string
}

type Status = 'idle' | 'searching' | 'empty' | 'failed'

const TIMEOUT_MS = 8000
// Metro Manila first, but anywhere in the Philippines can match (bounded=0).
const VIEWBOX = '120.90,14.78,121.15,14.35'

function toResult(p: NominatimPlace): Result {
  const parts = p.display_name.split(', ')
  const title = p.name || parts[0]
  return {
    lat: Number(p.lat),
    lng: Number(p.lon),
    title,
    detail: parts.filter((x) => x !== title).slice(0, 3).join(', '),
  }
}

// Type an address or place name, press 검색/Search, pick one of up to five matches.
export default function AddressSearch({ onPick }: Props) {
  const t = useT()
  const lang = useLang()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const run = useRef(0)

  if (!GEOCODE_URL) return null

  async function search() {
    const q = query.trim()
    if (!q || status === 'searching') return
    const id = ++run.current
    setStatus('searching')
    setResults([])
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    try {
      const params = new URLSearchParams({
        q,
        format: 'jsonv2',
        countrycodes: 'ph',
        limit: '5',
        viewbox: VIEWBOX,
        'accept-language': lang === 'ko' ? 'ko,en' : 'en',
      })
      const res = await fetch(`${GEOCODE_URL}/search?${params}`, { signal: ctrl.signal })
      if (!res.ok) throw new Error(String(res.status))
      const found = ((await res.json()) as NominatimPlace[]).map(toResult)
      if (run.current !== id) return
      setResults(found)
      setStatus(found.length ? 'idle' : 'empty')
    } catch {
      if (run.current === id) setStatus('failed')
    } finally {
      clearTimeout(timer)
    }
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    // Enter searches instead of submitting the form; wait while a Korean syllable is composing.
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
    e.preventDefault()
    void search()
  }

  function pick(r: Result) {
    onPick({ lat: Math.round(r.lat * 1e5) / 1e5, lng: Math.round(r.lng * 1e5) / 1e5 }, r.title)
    setResults([])
    setQuery(r.title)
  }

  return (
    <div className="address-search">
      <div className="food-add">
        <input
          className="food-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder={t.addressPlaceholder}
          aria-label={t.addressPlaceholder}
          enterKeyHint="search"
        />
        <button
          type="button"
          className="food-add-btn"
          onClick={() => void search()}
          disabled={!query.trim() || status === 'searching'}
        >
          {status === 'searching' ? <span className="spinner light" aria-hidden="true" /> : <Icon name="search" size={18} />}
          <span className="visually-hidden">{t.search}</span>
        </button>
      </div>
      {results.length > 0 && (
        <ul className="address-results">
          {results.map((r, i) => (
            <li key={`${r.lat},${r.lng},${i}`}>
              <button type="button" onClick={() => pick(r)}>
                <Icon name="pin" size={16} />
                <span>
                  <strong>{r.title}</strong>
                  {r.detail && <small>{r.detail}</small>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {(status === 'empty' || status === 'failed') && (
        <p className="start-note warn" role="status">
          {status === 'empty' ? t.addressNone : t.addressFailed}
        </p>
      )}
    </div>
  )
}
