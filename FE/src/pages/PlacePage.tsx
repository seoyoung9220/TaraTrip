import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getPlace } from '../api/client.ts'
import type { PlaceDetail } from '../api/types.ts'
import Icon from '../components/Icon.tsx'
import { CATEGORY_KO, duration, peso, pesoRange, won } from '../lib/format.ts'
import { useExchangeRate } from '../lib/useExchangeRate.ts'
import type { PlaceState } from './ResultPage.tsx'
import './PlacePage.css'

// 4. 장소 상세. The "이 코스에서는" card needs the stop from the result screen (router state);
// opened directly by URL, the page shows only the place itself.
export default function PlacePage() {
  const { placeId = '' } = useParams()
  const navigate = useNavigate()
  const stop = (useLocation().state as PlaceState | null)?.stop ?? null
  const rate = useExchangeRate()

  const [place, setPlace] = useState<PlaceDetail | null>(null)
  const [failed, setFailed] = useState(false)
  const [photo, setPhoto] = useState(0)

  useEffect(() => {
    let cancelled = false
    getPlace(placeId)
      .then((p) => !cancelled && setPlace(p))
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [placeId])

  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/'))

  if (failed || !place) {
    return (
      <main className="screen">
        <div className="header">
          <button type="button" className="icon-btn" onClick={goBack} aria-label="뒤로">
            <Icon name="back" />
          </button>
        </div>
        <p className="place-status" role="status">
          {failed ? '장소 정보를 찾지 못했어요.' : '불러오는 중…'}
        </p>
      </main>
    )
  }

  const directions = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`
  const photos = place.photos

  return (
    <main className="screen place">
      <div className="place-photo">
        {photos.length ? (
          <button
            type="button"
            className="photo-btn"
            onClick={() => setPhoto((i) => (i + 1) % photos.length)}
            aria-label="다음 사진"
          >
            <img src={photos[photo]} alt={`${place.name} 사진 ${photo + 1}`} />
          </button>
        ) : (
          <span className="photo-empty">
            <Icon name="image" size={44} stroke={1.5} />
          </span>
        )}
        <button type="button" className="icon-btn floating photo-back" onClick={goBack} aria-label="코스로 돌아가기">
          <Icon name="back" />
        </button>
        {photos.length > 0 && (
          <span className="photo-count">
            {photo + 1} / {photos.length}
          </span>
        )}
      </div>

      <div className="place-main">
        <div className="place-head">
          <span className="place-tag">
            {stop ? `코스 ${stop.order}번째 · ` : ''}
            {CATEGORY_KO[place.category]}
          </span>
          <h1 className="place-name">{place.name}</h1>
          <p className="place-desc">{place.description}</p>
        </div>

        <dl className="facts">
          <div>
            <dt>
              <Icon name="wallet" size={18} stroke={2} />
              가격대
            </dt>
            <dd>{pesoRange(place.price_range.min, place.price_range.max)}</dd>
          </div>
          <div>
            <dt>
              <Icon name="clock" size={18} stroke={2} />
              영업시간
            </dt>
            <dd>{place.opening_hours.replace('-', ' – ')}</dd>
          </div>
          <div>
            <dt>
              <Icon name="pin" size={18} stroke={2} />
              주소
            </dt>
            <dd>{place.address}</dd>
          </div>
        </dl>

        {stop && (
          <section className="in-route">
            <h2>이 코스에서는</h2>
            <p className="in-route-cost">
              <strong>{peso(stop.est_cost)}</strong>
              <span>
                {rate !== null && `≈ ${won(stop.est_cost, rate)} · `}
                {duration(stop.stay_minutes)} 머물러요
              </span>
            </p>
            <p className="in-route-reason">{stop.reason}</p>
          </section>
        )}
      </div>

      <div className="footer">
        <a className="btn btn-primary btn-block" href={directions} target="_blank" rel="noreferrer">
          <Icon name="route" size={20} />
          길찾기
        </a>
      </div>
    </main>
  )
}
