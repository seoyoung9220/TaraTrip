import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { LatLng, RecommendationRequest } from '../api/types.ts'
import AddressSearch from '../components/AddressSearch.tsx'
import Icon from '../components/Icon.tsx'
import LocationPicker from '../components/LocationPicker.tsx'
import { BUDGET_STEPS, FALLBACK_START, MAX_FOOD_LENGTH, MAX_FOODS, REGION } from '../config.ts'
import { dayLabel, today, tomorrow } from '../lib/date.ts'
import { peso, won } from '../lib/format.ts'
import { useExchangeRate } from '../lib/useExchangeRate.ts'
import { setLang, useLang, useT } from '../lib/i18n.ts'
import { useRegions } from '../lib/useRegions.ts'
import './InputPage.css'

// Where the start pin came from, for the line under the map.
type StartState = 'default' | 'locating' | 'here' | 'picked' | 'searched' | 'denied' | 'abroad'

/** Gives up on a location request that never answers (a permission prompt left open ignores `timeout`). */
const LOCATE_LIMIT_MS = 12_000

/** Rough box around the Philippines: a phone elsewhere (a tester in Korea) can't be the start. */
function inPhilippines({ lat, lng }: LatLng): boolean {
  return lat >= 4.5 && lat <= 21.5 && lng >= 116 && lng <= 127
}

// Shown until the traveler picks times; same as the backend default (docs/API.md).
const DEFAULT_START = '10:00'
const DEFAULT_END = '16:00'

// Every 30 minutes from 06:00 to 23:30. A select instead of <input type="time">, whose
// AM/PM text follows the phone's language and ignores the KO/EN switch.
const TIME_OPTIONS = Array.from({ length: 36 }, (_, i) => {
  const minutes = 6 * 60 + i * 30
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${minutes % 60 ? '30' : '00'}`
})

/** The grid, plus `value` if it came from elsewhere (an earlier request) and is off the grid. */
function timeOptions(value: string): string[] {
  return TIME_OPTIONS.includes(value) ? TIME_OPTIONS : [...TIME_OPTIONS, value].sort()
}

// 1. 조건 입력. Coming back from an error or the result screen refills the previous request.
export default function InputPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const prev = location.state as RecommendationRequest | null
  const t = useT()
  const lang = useLang()
  const rate = useExchangeRate()
  const regions = useRegions()

  const [pickedRegion, setPickedRegion] = useState(prev?.region ?? '')
  // A region from an earlier visit may be gone from the data; then take the first one.
  const region = regions.includes(pickedRegion) ? pickedRegion : (regions[0] ?? REGION)

  const [freeText, setFreeText] = useState(prev?.free_text ?? '')
  const [budget, setBudget] = useState(prev?.budget.amount ?? 1000)
  const [foods, setFoods] = useState<string[]>(prev?.foods ?? [])
  const [foodDraft, setFoodDraft] = useState('')
  const [start, setStart] = useState<LatLng>(prev?.start_location ?? FALLBACK_START)
  const [startState, setStartState] = useState<StartState>(prev?.start_location ? 'picked' : 'default')
  const [startName, setStartName] = useState('') // the address search result picked, for the status line
  // Where the day ends. null = back to the start (no end_location in the request).
  const [end, setEnd] = useState<LatLng | null>(prev?.end_location ?? null)
  const [endName, setEndName] = useState('')
  // Bumped on every locate/cancel so a late answer from an abandoned request is ignored.
  const locateRun = useRef(0)
  // A date left over from an earlier visit can be in the past; fall back to today.
  const [date, setDate] = useState(() => {
    const t = today()
    return prev?.travel_date && prev.travel_date >= t ? prev.travel_date : t
  })
  const [startTime, setStartTime] = useState(prev?.start_time ?? DEFAULT_START)
  const [endTime, setEndTime] = useState(prev?.end_time ?? DEFAULT_END)
  // Times are sent only once the traveler changes them, so "오후 1시부터" in free_text still works.
  const [timesSet, setTimesSet] = useState(!!(prev?.start_time || prev?.end_time))
  const timeError = endTime <= startTime
  const canSubmit = budget > 0 && !timeError

  /** Adds what is typed, split on commas ("sisig, halo-halo"). Duplicates and blanks are dropped. */
  function withDraft(list: string[], draft: string): string[] {
    const next = [...list]
    for (const raw of draft.split(',')) {
      const food = raw.trim().slice(0, MAX_FOOD_LENGTH)
      if (food && next.length < MAX_FOODS && !next.some((f) => f.toLowerCase() === food.toLowerCase())) next.push(food)
    }
    return next
  }

  function addFood() {
    setFoods((f) => withDraft(f, foodDraft))
    setFoodDraft('')
  }

  function onFoodKey(e: KeyboardEvent<HTMLInputElement>) {
    // Enter adds the food instead of submitting the form; wait while a Korean syllable is still composing.
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
    e.preventDefault()
    addFood()
  }

  // Current location: cancellable, gives up after LOCATE_LIMIT_MS, and keeps the pin where
  // it was on failure instead of jumping to the default.
  function locate() {
    if (!('geolocation' in navigator)) {
      setStartState('denied')
      return
    }
    const run = ++locateRun.current
    const settle = (fn: () => void) => {
      if (locateRun.current !== run) return
      locateRun.current++
      clearTimeout(timer)
      fn()
    }
    const timer = setTimeout(() => settle(() => setStartState('denied')), LOCATE_LIMIT_MS)
    setStartState('locating')
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        settle(() => {
          const here = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          if (!inPhilippines(here)) {
            setStartState('abroad')
            return
          }
          setStart(here)
          setStartState('here')
        }),
      () => settle(() => setStartState('denied')),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  }

  function cancelLocate() {
    locateRun.current++
    setStartState(start === FALLBACK_START ? 'default' : 'picked')
  }

  function pickStart(value: LatLng) {
    locateRun.current++ // a tap on the map wins over a location request still running
    setStart(value)
    setStartState('picked')
  }

  function searchedStart(value: LatLng, name: string) {
    pickStart(value)
    setStartName(name)
    setStartState('searched')
  }

  function pickEnd(value: LatLng, name = '') {
    setEnd(value)
    setEndName(name)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    const req: RecommendationRequest = {
      region,
      budget: { amount: budget, currency: 'PHP' },
      foods: withDraft(foods, foodDraft), // a food typed but not added yet still counts
      attractions: prev?.attractions ?? [],
      start_location: start,
      ...(end ? { end_location: end } : {}),
      travel_date: date,
      ...(timesSet ? { start_time: startTime, end_time: endTime } : {}),
      ...(freeText.trim() ? { free_text: freeText.trim() } : {}),
      lang,
    }
    // Keep the query string so ?mockError=... survives into the result screen.
    navigate({ pathname: '/route', search: location.search }, { state: req })
  }


  return (
    <form className="screen input-page" onSubmit={submit}>
      <header className="input-header">
        <span className="logo">
          Tara<b>Trip</b>
        </span>
        <button type="button" className="lang-switch" onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}>
          {lang === 'ko' ? 'EN' : '한국어'}
          <span className="visually-hidden">{t.langSwitch}</span>
        </button>
        {regions.length > 1 ? (
          <label className="region-pill region-select">
            <Icon name="pin" size={15} />
            <select value={region} onChange={(e) => setPickedRegion(e.target.value)} aria-label={t.regionLabel}>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" size={14} />
          </label>
        ) : (
          <span className="region-pill">
            <Icon name="pin" size={15} />
            {region}
          </span>
        )}
      </header>

      <main className="input-main">
        <h1 className="title">{t.title(dayLabel(date, t))}</h1>

        <section className="field">
          <label className="label" htmlFor="free-text">
            {t.freeTextLabel}
          </label>
          <textarea
            id="free-text"
            className="textarea"
            rows={2}
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder={t.freeTextPlaceholder}
          />
        </section>

        <section className="field">
          <label className="label" htmlFor="budget">
            {t.budgetLabel}
          </label>
          <div className="amount">
            <span className="amount-sign">₱</span>
            <input
              id="budget"
              className="amount-input"
              inputMode="numeric"
              autoComplete="off"
              value={budget ? budget.toLocaleString('en-US') : ''}
              onChange={(e) => setBudget(Number(e.target.value.replace(/\D/g, '').slice(0, 7)) || 0)}
              placeholder="0"
            />
            <span className="amount-unit">{t.pesoUnit}</span>
          </div>
          {rate !== null && budget > 0 && (
            <p className="amount-krw">≈ {won(budget, rate)} · {t.rateNote}</p>
          )}
          <div className="quick-add">
            {BUDGET_STEPS.map((step) => (
              <button key={step} type="button" className="quick" onClick={() => setBudget((b) => b + step)}>
                +{peso(step)}
              </button>
            ))}
          </div>
        </section>

        <section className="field">
          <h2 className="label">{t.whenLabel}</h2>
          <div className="chips">
            {[today(), tomorrow()].map((d) => (
              <button key={d} type="button" className="chip" aria-pressed={date === d} onClick={() => setDate(d)}>
                {dayLabel(d, t)}
              </button>
            ))}
            <label className="chip date-chip" data-selected={date !== today() && date !== tomorrow()}>
              <Icon name="calendar" size={16} />
              {date !== today() && date !== tomorrow() ? dayLabel(date, t) : t.otherDay}
              <input
                type="date"
                className="date-native"
                aria-label={t.pickDate}
                min={today()}
                value={date}
                onChange={(e) => e.target.value && setDate(e.target.value)}
              />
            </label>
          </div>
          <div className="time-row">
            <label className="time-field">
              <span>{t.startTime}</span>
              <select
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value)
                  setTimesSet(true)
                }}
              >
                {timeOptions(startTime).map((v) => (
                  <option key={v} value={v}>
                    {t.clock(v)}
                  </option>
                ))}
              </select>
            </label>
            <span className="time-sep" aria-hidden="true">
              ~
            </span>
            <label className="time-field">
              <span>{t.endTime}</span>
              <select
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value)
                  setTimesSet(true)
                }}
              >
                {timeOptions(endTime).map((v) => (
                  <option key={v} value={v}>
                    {t.clock(v)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="time-note">{t.timeZoneNote}</p>
          {timeError && <p className="field-error">{t.timeError}</p>}
        </section>

        <section className="field">
          <h2 className="label">{t.foodsLabel}</h2>
          <div className="food-add">
            <input
              className="food-input"
              value={foodDraft}
              onChange={(e) => setFoodDraft(e.target.value)}
              onKeyDown={onFoodKey}
              placeholder={t.foodPlaceholder}
              aria-label={t.foodsLabel}
              maxLength={MAX_FOOD_LENGTH * 3}
              disabled={foods.length >= MAX_FOODS}
              enterKeyHint="done"
            />
            <button type="button" className="food-add-btn" onClick={addFood} disabled={!foodDraft.trim()}>
              {t.add}
            </button>
          </div>
          {foods.length > 0 && (
            <ul className="chips food-chips">
              {foods.map((food) => (
                <li key={food}>
                  <button
                    type="button"
                    className="chip food-chip"
                    onClick={() => setFoods((f) => f.filter((x) => x !== food))}
                    aria-label={t.removeFood(food)}
                  >
                    {food}
                    <Icon name="close" size={14} stroke={2.4} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="field">
          <h2 className="label">{t.mustVisitLabel}</h2>
          <button type="button" className="search-field" disabled title={t.searchSoonTitle}>
            <Icon name="search" size={18} />
            {t.searchAttractions}
            <span className="soon">{t.soon}</span>
          </button>
        </section>

        <section className="field">
          <div className="start-head">
            <h2 className="label">{t.startLabel}</h2>
            {startState === 'locating' ? (
              <button type="button" className="locate" onClick={cancelLocate}>
                <span className="spinner" aria-hidden="true" />
                {t.locating} · {t.cancelLocate}
              </button>
            ) : (
              <button type="button" className="locate" onClick={locate}>
                <Icon name="locate" size={16} stroke={2.4} />
                {t.useMyLocation}
              </button>
            )}
          </div>
          <AddressSearch onPick={searchedStart} />
          <LocationPicker value={start} onChange={pickStart} />
          <p className={`start-note${startState === 'denied' || startState === 'abroad' ? ' warn' : ''}`} role="status">
            {startState === 'searched' ? t.startFrom(startName) : t.startStatus[startState]}
          </p>
        </section>

        <section className="field">
          <h2 className="label">{t.endLabel}</h2>
          <div className="chips">
            <button type="button" className="chip" aria-pressed={end === null} onClick={() => setEnd(null)}>
              {t.sameAsStart}
            </button>
            <button
              type="button"
              className="chip"
              aria-pressed={end !== null}
              onClick={() => end === null && pickEnd(start)}
            >
              {t.elsewhere}
            </button>
          </div>
          {end !== null && (
            <>
              <AddressSearch onPick={pickEnd} />
              <LocationPicker value={end} onChange={(v) => pickEnd(v)} />
            </>
          )}
          <p className="start-note" role="status">
            {end === null ? t.endSame : endName ? t.endAt(endName) : t.endPicked}
          </p>
        </section>

        {/* The one door to the business side (/merchant); the business side links back. */}
        <Link to="/merchant" className="biz-entry">
          <span className="biz-icon">
            <Icon name="store" size={22} />
          </span>
          <span className="biz-text">
            <strong>{t.bizTitle}</strong>
            <span>{t.bizBody}</span>
          </span>
          <Icon name="chevronRight" size={18} />
        </Link>
      </main>

      <div className="footer">
        <button type="submit" className="btn btn-primary btn-block" disabled={!canSubmit}>
          {t.submit}
        </button>
      </div>
    </form>
  )
}
