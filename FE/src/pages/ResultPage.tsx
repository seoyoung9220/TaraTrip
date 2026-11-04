import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { getRecommendation } from '../api/client.ts'
import { ApiError, type Recommendation, type RecommendationRequest, type Stop } from '../api/types.ts'
import ErrorView from '../components/ErrorView.tsx'
import Icon from '../components/Icon.tsx'
import LoadingScreen from '../components/LoadingScreen.tsx'
import RouteMap from '../components/RouteMap.tsx'
import { CATEGORY_KO, duration, peso, transportLabel, won } from '../lib/format.ts'
import { useExchangeRate } from '../lib/useExchangeRate.ts'
import './ResultPage.css'

// Results by request, so coming back from a place page does not ask the AI again.
const cache = new Map<string, Recommendation>()

/** How long the finished loading screen stays up before the result slides in. */
const FINISH_MS = 900

export interface PlaceState {
  stop: Stop
}

// 2. 추천 중 → 3. 추천 코스, or 5a–5c on error.
export default function ResultPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const req = location.state as RecommendationRequest | null
  const key = req ? JSON.stringify(req) : ''

  const [attempt, setAttempt] = useState(0)
  const [route, setRoute] = useState<Recommendation | null>(() => cache.get(key) ?? null)
  const [error, setError] = useState<ApiError | null>(null)
  const [revealed, setRevealed] = useState(() => cache.has(key))

  useEffect(() => {
    if (!req) return
    const key = JSON.stringify(req)
    if (cache.has(key)) return
    let cancelled = false
    getRecommendation(req)
      .then((r) => {
        if (cancelled) return
        cache.set(key, r)
        setRoute(r)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof ApiError ? e : new ApiError('INVALID_REQUEST', String(e), 0))
      })
    return () => {
      cancelled = true
    }
    // `attempt` re-runs this for "다시 시도하기".
  }, [req, attempt])

  useEffect(() => {
    if (!route || revealed) return
    const t = setTimeout(() => setRevealed(true), FINISH_MS)
    return () => clearTimeout(t)
  }, [route, revealed])

  if (!req) return <Navigate to="/" replace />

  const backToInput = () => navigate({ pathname: '/', search: location.search }, { state: req })

  if (error) {
    return (
      <ErrorView
        code={error.code}
        region={req.region}
        budget={req.budget.amount}
        onEdit={backToInput}
        onRetry={() => {
          setError(null)
          setAttempt((a) => a + 1)
        }}
      />
    )
  }

  if (!route || !revealed) {
    return <LoadingScreen key={attempt} region={req.region} done={!!route} onClose={backToInput} />
  }

  return <RouteView route={route} req={req} onBack={backToInput} />
}

interface ViewProps {
  route: Recommendation
  req: RecommendationRequest
  onBack: () => void
}

function RouteView({ route, req, onBack }: ViewProps) {
  const navigate = useNavigate()
  const rate = useExchangeRate()
  const left = req.budget.amount - route.total_cost
  const totals = route.stops.reduce(
    (t, s) => ({
      food: t.food + s.cost_breakdown.food,
      entry: t.entry + s.cost_breakdown.entry,
      transport: t.transport + s.cost_breakdown.transport,
    }),
    { food: 0, entry: 0, transport: 0 },
  )

  const openPlace = (stop: Stop) => {
    const state: PlaceState = { stop }
    navigate(`/places/${encodeURIComponent(stop.place_id)}`, { state })
  }

  return (
    <main className="result">
      <div className="result-map">
        <RouteMap stops={route.stops} onSelect={openPlace} />
        <button type="button" className="icon-btn floating map-back" onClick={onBack} aria-label="조건 입력으로 돌아가기">
          <Icon name="back" />
        </button>
      </div>

      <section className="sheet">
        <div className="grabber" aria-hidden="true" />

        <div className="ticket">
          <div className="ticket-top">
            <p className="ticket-sub">
              {req.region} 하루 코스 · {route.stops.length}곳
            </p>
            <p className="ticket-price">
              <strong>{peso(route.total_cost)}</strong>
              {rate !== null && <span>≈ {won(route.total_cost, rate)}</span>}
            </p>
          </div>
          <div className="perforation" aria-hidden="true" />
          <dl className="ticket-stats">
            <div>
              <dt>예산</dt>
              <dd>{peso(req.budget.amount)}</dd>
            </div>
            <div>
              <dt>남는 돈</dt>
              <dd className="accent">{peso(Math.max(0, left))}</dd>
            </div>
            <div>
              <dt>소요 시간</dt>
              <dd>{duration(route.total_minutes)}</dd>
            </div>
          </dl>
        </div>

        <dl className="cost-tiles">
          <div>
            <dt>식비</dt>
            <dd>{peso(totals.food)}</dd>
          </div>
          <div>
            <dt>입장료</dt>
            <dd>{peso(totals.entry)}</dd>
          </div>
          <div>
            <dt>교통비</dt>
            <dd>{peso(totals.transport)}</dd>
          </div>
        </dl>

        <div className="why">
          <p className="why-label">왜 이 코스냐면</p>
          <p className="why-text">{route.summary}</p>
        </div>

        <h2 className="stops-heading">코스 순서</h2>
        <ol className="stops">
          {route.stops.map((s) => (
            <li key={s.place_id}>
              {s.transport && (
                <div className="transport">
                  <span className="transport-line" aria-hidden="true" />
                  <span className="transport-pill">{transportLabel(s.transport)}</span>
                </div>
              )}
              <button type="button" className="stop-row" onClick={() => openPlace(s)}>
                <span className="order">{s.order}</span>
                <span className="stop-info">
                  <span className="stop-meta">
                    {s.arrival_time} · {CATEGORY_KO[s.category]} · {duration(s.stay_minutes)}
                  </span>
                  <span className="stop-name-row">
                    <span className="stop-name">{s.name}</span>
                    <span className="stop-cost">{peso(s.est_cost)}</span>
                  </span>
                  <span className="stop-reason">{s.reason}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>

        <button type="button" className="btn btn-soft btn-block again" onClick={onBack}>
          조건 바꿔서 다시 추천받기
        </button>
      </section>
    </main>
  )
}
