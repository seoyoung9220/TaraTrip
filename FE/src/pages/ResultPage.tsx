import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { getRecommendation } from '../api/client.ts'
import { ApiError, type Recommendation, type RecommendationRequest } from '../api/types.ts'

// TODO(week 2-3): loading (2. 추천 중), result + map (3. 추천 코스), error (5a-5c) from the wireframe
export default function ResultPage() {
  const req = useLocation().state as RecommendationRequest | null
  const [route, setRoute] = useState<Recommendation | null>(null)
  const [error, setError] = useState<ApiError | null>(null)

  useEffect(() => {
    if (!req) return
    let cancelled = false
    getRecommendation(req)
      .then((r) => !cancelled && setRoute(r))
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof ApiError ? e : new ApiError('INVALID_REQUEST', String(e), 0))
      })
    return () => {
      cancelled = true
    }
  }, [req])

  if (!req) return <Navigate to="/" replace />
  if (error) return <main style={{ padding: 20 }}>오류: {error.code}</main>
  if (!route) return <main style={{ padding: 20 }}>하루 코스를 짜고 있어요…</main>

  return (
    <main style={{ padding: 20 }}>
      <h1>₱{route.total_cost.toLocaleString()}</h1>
      <ol>
        {route.stops.map((s) => (
          <li key={s.place_id}>
            <Link to={`/places/${s.place_id}`}>
              {s.arrival_time} {s.name} · ₱{s.est_cost}
            </Link>
          </li>
        ))}
      </ol>
    </main>
  )
}
