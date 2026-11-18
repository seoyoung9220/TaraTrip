import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { getRecommendation } from '../api/client.ts'
import { ApiError, type Recommendation, type RecommendationRequest, type Stop, type Transport } from '../api/types.ts'
import ErrorView from '../components/ErrorView.tsx'
import Icon from '../components/Icon.tsx'
import LoadingScreen from '../components/LoadingScreen.tsx'
import RouteMap from '../components/RouteMap.tsx'
import { duration, peso, transportLabel, won } from '../lib/format.ts'
import { useT } from '../lib/i18n.ts'
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
  const t = useT()
  const rate = useExchangeRate()
  const left = req.budget.amount - route.total_cost
  const totals = route.stops.reduce(
    (t, s) => ({
      food: t.food + s.cost_breakdown.food,
      entry: t.entry + s.cost_breakdown.entry,
      transport: t.transport + s.cost_breakdown.transport,
    }),
    { food: 0, entry: 0, transport: route.return_transport.cost },
  )

  const openPlace = (stop: Stop) => {
    const state: PlaceState = { stop }
    navigate(`/places/${encodeURIComponent(stop.place_id)}`, { state })
  }

  return (
    <main className="result">
      <div className="result-map">
        <RouteMap stops={route.stops} onSelect={openPlace} />
        <button type="button" className="icon-btn floating map-back" onClick={onBack} aria-label={t.backToInput}>
          <Icon name="back" />
        </button>
      </div>

      <section className="sheet">
        <div className="grabber" aria-hidden="true" />

        <div className="ticket">
          <div className="ticket-top">
            <p className="ticket-sub">
              {t.ticketSub(req.region, route.stops.length)}
            </p>
            <p className="ticket-price">
              <strong>{peso(route.total_cost)}</strong>
              {rate !== null && <span>≈ {won(route.total_cost, rate)}</span>}
            </p>
          </div>
          <div className="perforation" aria-hidden="true" />
          <dl className="ticket-stats">
            <div>
              <dt>{t.budget}</dt>
              <dd>{peso(req.budget.amount)}</dd>
            </div>
            <div>
              <dt>{t.left}</dt>
              <dd className="accent">{peso(Math.max(0, left))}</dd>
            </div>
            <div>
              <dt>{t.totalTime}</dt>
              <dd>{duration(route.total_minutes, t)}</dd>
            </div>
          </dl>
        </div>

        <dl className="cost-tiles">
          <div>
            <dt>{t.food}</dt>
            <dd>{peso(totals.food)}</dd>
          </div>
          <div>
            <dt>{t.entry}</dt>
            <dd>{peso(totals.entry)}</dd>
          </div>
          <div>
            <dt>{t.transport}</dt>
            <dd>{peso(totals.transport)}</dd>
          </div>
        </dl>

        <div className="why">
          <p className="why-label">{t.why}</p>
          <p className="why-text">{route.summary}</p>
        </div>

        <h2 className="stops-heading">{t.stopsHeading}</h2>
        <ol className="stops">
          {route.stops.map((s, i) => (
            <li key={s.place_id}>
              <Leg transport={s.transport} prefix={i === 0 ? t.fromStart : undefined} />
              <button type="button" className="stop-row" onClick={() => openPlace(s)}>
                <span className="order">{s.order}</span>
                <span className="stop-info">
                  <span className="stop-meta">
                    {s.arrival_time} · {t.category[s.category]} · {duration(s.stay_minutes, t)}
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
        <Leg transport={route.return_transport} prefix={t.toStart} className="return-leg" />

        <button type="button" className="btn btn-soft btn-block again" onClick={onBack}>
          {t.again}
        </button>
      </section>
    </main>
  )
}

interface LegProps {
  transport: Transport
  /** Names the start for the first and return legs. */
  prefix?: string
  className?: string
}

/** One leg between stops. Hidden when there is no travel (e.g. starting right at the first stop). */
function Leg({ transport, prefix, className }: LegProps) {
  const t = useT()
  if (transport.minutes <= 0) return null
  const label = transportLabel(transport, t)
  return (
    <div className={className ? `transport ${className}` : 'transport'}>
      <span className="transport-line" aria-hidden="true" />
      <span className="transport-pill">{prefix ? `${prefix} · ${label}` : label}</span>
    </div>
  )
}
