import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { LatLng, RecommendationRequest } from '../api/types.ts'
import Icon from '../components/Icon.tsx'
import { BUDGET_STEPS, FALLBACK_START, FOODS, REGION } from '../config.ts'
import { dayLabel, today, tomorrow } from '../lib/date.ts'
import { peso, won } from '../lib/format.ts'
import { useExchangeRate } from '../lib/useExchangeRate.ts'
import './InputPage.css'

type StartState = 'idle' | 'locating' | 'here' | 'denied'

// Shown until the traveler picks times; same as the backend default (docs/API.md).
const DEFAULT_START = '10:00'
const DEFAULT_END = '16:00'

// 1. 조건 입력. Coming back from an error or the result screen refills the previous request.
export default function InputPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const prev = location.state as RecommendationRequest | null
  const rate = useExchangeRate()

  const [freeText, setFreeText] = useState(prev?.free_text ?? '')
  const [budget, setBudget] = useState(prev?.budget.amount ?? 1000)
  const [foods, setFoods] = useState<string[]>(prev?.foods ?? [])
  const [start, setStart] = useState<LatLng>(prev?.start_location ?? FALLBACK_START)
  const [startState, setStartState] = useState<StartState>('idle')
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

  function toggleFood(food: string) {
    setFoods((f) => (f.includes(food) ? f.filter((x) => x !== food) : [...f, food]))
  }

  function locate() {
    if (!('geolocation' in navigator)) {
      setStartState('denied')
      return
    }
    setStartState('locating')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStart({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setStartState('here')
      },
      () => {
        setStart(FALLBACK_START)
        setStartState('denied')
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    )
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    const req: RecommendationRequest = {
      region: REGION,
      budget: { amount: budget, currency: 'PHP' },
      foods,
      attractions: prev?.attractions ?? [],
      start_location: start,
      travel_date: date,
      ...(timesSet ? { start_time: startTime, end_time: endTime } : {}),
      ...(freeText.trim() ? { free_text: freeText.trim() } : {}),
    }
    // Keep the query string so ?mockError=... survives into the result screen.
    navigate({ pathname: '/route', search: location.search }, { state: req })
  }

  const startLabel = {
    idle: '현재 위치로 설정',
    locating: '찾는 중…',
    here: '현재 위치 사용 중',
    denied: '기본 위치 사용 중',
  }[startState]

  return (
    <form className="screen input-page" onSubmit={submit}>
      <header className="input-header">
        <span className="logo">
          Tara<b>Trip</b>
        </span>
        <span className="region-pill" title="지역은 곧 고를 수 있어요">
          <Icon name="pin" size={15} />
          {REGION}
        </span>
      </header>

      <main className="input-main">
        <h1 className="title">{`${dayLabel(date)} 하루,\n어떻게 보내고 싶나요?`}</h1>

        <section className="field">
          <label className="label" htmlFor="free-text">
            편하게 적어도 돼요
          </label>
          <textarea
            id="free-text"
            className="textarea"
            rows={2}
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="예: 1,000페소로 현지 음식 먹고 시장 구경하고 싶어"
          />
        </section>

        <section className="field">
          <label className="label" htmlFor="budget">
            하루 예산
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
            <span className="amount-unit">페소</span>
          </div>
          {rate !== null && budget > 0 && (
            <p className="amount-krw">≈ {won(budget, rate)} · 오늘 환율 기준</p>
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
          <h2 className="label">언제 가요?</h2>
          <div className="chips">
            {[today(), tomorrow()].map((d) => (
              <button key={d} type="button" className="chip" aria-pressed={date === d} onClick={() => setDate(d)}>
                {dayLabel(d)}
              </button>
            ))}
            <label className="chip date-chip" data-selected={date !== today() && date !== tomorrow()}>
              <Icon name="calendar" size={16} />
              {date !== today() && date !== tomorrow() ? dayLabel(date) : '다른 날'}
              <input
                type="date"
                className="date-native"
                aria-label="여행 날짜 고르기"
                min={today()}
                value={date}
                onChange={(e) => e.target.value && setDate(e.target.value)}
              />
            </label>
          </div>
          <div className="time-row">
            <label className="time-field">
              <span>출발</span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value || DEFAULT_START)
                  setTimesSet(true)
                }}
              />
            </label>
            <span className="time-sep" aria-hidden="true">
              ~
            </span>
            <label className="time-field">
              <span>마무리</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value || DEFAULT_END)
                  setTimesSet(true)
                }}
              />
            </label>
          </div>
          {timeError && <p className="field-error">마무리 시간은 출발 시간보다 늦어야 해요.</p>}
        </section>

        <section className="field">
          <h2 className="label">먹고 싶은 음식</h2>
          <div className="chips">
            {FOODS.map((food) => (
              <button
                key={food}
                type="button"
                className="chip"
                aria-pressed={foods.includes(food)}
                onClick={() => toggleFood(food)}
              >
                {food}
              </button>
            ))}
          </div>
        </section>

        <section className="field">
          <h2 className="label">꼭 가보고 싶은 곳</h2>
          <button type="button" className="search-field" disabled title="관광지 검색은 준비 중이에요">
            <Icon name="search" size={18} />
            관광지 검색
            <span className="soon">준비 중</span>
          </button>
          <div className="start-row">
            <span>출발 위치</span>
            <button
              type="button"
              className="locate"
              onClick={locate}
              disabled={startState === 'locating'}
            >
              <Icon name="locate" size={16} stroke={2.4} />
              {startLabel}
            </button>
          </div>
          {startState === 'denied' && (
            <p className="start-note">위치를 쓸 수 없어서 기본 출발점으로 추천해요. 지도에서 고르는 기능은 곧 열려요.</p>
          )}
        </section>
      </main>

      <div className="footer">
        <button type="submit" className="btn btn-primary btn-block" disabled={!canSubmit}>
          코스 추천받기
        </button>
      </div>
    </form>
  )
}
