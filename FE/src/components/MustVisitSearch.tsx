import { useState, type KeyboardEvent } from 'react'
import { MAX_MUST_VISIT } from '../config.ts'
import { useT } from '../lib/i18n.ts'
import { usePlaceList } from '../lib/usePlaceList.ts'
import Icon from './Icon.tsx'

interface Props {
  /** Chosen place names, sent as `attractions` (docs/API.md). */
  value: string[]
  onChange: (next: string[]) => void
}

const MAX_SUGGESTIONS = 6

// Case, spaces and accents ignored: "pacopark" finds "Paco Park", "jose" finds "José".
function norm(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase()
}

// Type part of a name, pick a place from the list. If the list could not load,
// Enter adds the typed name as it is (the AI module still matches it by name).
export default function MustVisitSearch({ value, onChange }: Props) {
  const t = useT()
  const places = usePlaceList()
  const [query, setQuery] = useState('')
  const q = norm(query)
  const full = value.length >= MAX_MUST_VISIT
  const chosen = new Set(value.map(norm))
  const matches =
    q && places
      ? places
          .filter((p) => !chosen.has(norm(p.name)) && norm(p.name).includes(q))
          .sort((a, b) => Number(!norm(b.name).startsWith(q)) - Number(!norm(a.name).startsWith(q)))
          .slice(0, MAX_SUGGESTIONS)
      : []
  const freeTyping = places !== null && places.length === 0

  function add(name: string) {
    const n = name.trim()
    if (!n || full || chosen.has(norm(n))) return
    onChange([...value, n])
    setQuery('')
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    // Enter picks the first match instead of submitting the form; wait while a Korean syllable is composing.
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
    e.preventDefault()
    if (matches.length) add(matches[0].name)
    else if (freeTyping) add(query)
  }

  return (
    <div className="address-search">
      <div className="food-add">
        <input
          className="food-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder={full ? t.mustVisitFull(MAX_MUST_VISIT) : t.mustVisitPlaceholder}
          aria-label={t.mustVisitLabel}
          disabled={full}
          enterKeyHint="done"
          autoComplete="off"
        />
        {freeTyping && (
          <button type="button" className="food-add-btn" onClick={() => add(query)} disabled={!query.trim() || full}>
            {t.add}
          </button>
        )}
      </div>
      {matches.length > 0 && (
        <ul className="address-results">
          {matches.map((p) => (
            <li key={p.place_id}>
              <button type="button" onClick={() => add(p.name)}>
                <Icon name="pin" size={16} />
                <span>
                  <strong>{p.name}</strong>
                  <small>{[t.category[p.category], p.district].filter(Boolean).join(' · ')}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q && places && places.length > 0 && matches.length === 0 && (
        <p className="start-note warn" role="status">
          {t.mustVisitNone}
        </p>
      )}
      {value.length > 0 && (
        <ul className="chips food-chips">
          {value.map((name) => (
            <li key={name}>
              <button
                type="button"
                className="chip food-chip"
                onClick={() => onChange(value.filter((x) => x !== name))}
                aria-label={t.removePlace(name)}
              >
                {name}
                <Icon name="close" size={14} stroke={2.4} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
