import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getPlace } from '../api/client.ts'
import type { PlaceDetail } from '../api/types.ts'
import Icon from '../components/Icon.tsx'
import { duration, peso, pesoRange, won } from '../lib/format.ts'
import { useLang, useT } from '../lib/i18n.ts'
import { useExchangeRate } from '../lib/useExchangeRate.ts'
import type { PlaceState } from './ResultPage.tsx'
import './PlacePage.css'

// 4. 장소 상세. The "이 코스에서는" card needs the stop from the result screen (router state);
// opened directly by URL, the page shows only the place itself.
export default function PlacePage() {
  const { placeId = '' } = useParams()
  const navigate = useNavigate()
  const stop = (useLocation().state as PlaceState | null)?.stop ?? null
  const t = useT()
  const lang = useLang()
  const rate = useExchangeRate()

  const [place, setPlace] = useState<PlaceDetail | null>(null)
  const [failed, setFailed] = useState(false)
  const [photo, setPhoto] = useState(0)
  // Photo links that failed to load (dead link, hotlink block, web page instead of an image).
  const [broken, setBroken] = useState<ReadonlySet<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    getPlace(placeId, lang)
      .then((p) => !cancelled && setPlace(p))
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [placeId, lang])

  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/'))

  if (failed || !place) {
    return (
      <main className="screen">
        <div className="header">
          <button type="button" className="icon-btn" onClick={goBack} aria-label={t.back}>
            <Icon name="back" />
          </button>
        </div>
        <p className="place-status" role="status">
          {failed ? t.placeNotFound : t.loading}
        </p>
      </main>
    )
  }

  const directions = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`
  const photos = place.photos.filter((url) => !broken.has(url))
  const shown = photos.length ? photo % photos.length : 0
  const hidePhoto = (url: string) => setBroken((s) => new Set(s).add(url))

  return (
    <main className="screen place">
      <div className="place-photo">
        {photos.length ? (
          <button
            type="button"
            className="photo-btn"
            onClick={() => setPhoto((shown + 1) % photos.length)}
            aria-label={t.nextPhoto}
          >
            <img
              key={photos[shown]}
              src={photos[shown]}
              alt={t.photoAlt(place.name, shown + 1)}
              onError={() => hidePhoto(photos[shown])}
            />
          </button>
        ) : (
          <span className="photo-empty">
            <Icon name="image" size={44} stroke={1.5} />
          </span>
        )}
        <button type="button" className="icon-btn floating photo-back" onClick={goBack} aria-label={t.backToRoute}>
          <Icon name="back" />
        </button>
        {photos.length > 0 && (
          <span className="photo-count">
            {shown + 1} / {photos.length}
          </span>
        )}
      </div>

      <div className="place-main">
        <div className="place-head">
          <div className="place-tags">
            <span className="place-tag">
              {stop ? t.stopNth(stop.order) : ''}
              {t.category[place.category]}
            </span>
            {place.cash_only && <span className="place-tag cash">{t.cashOnly}</span>}
          </div>
          <h1 className="place-name">{place.name}</h1>
          <p className="place-desc">{place.description}</p>
        </div>

        <dl className="facts">
          {place.signature_menu && (
            <div>
              <dt>
                <Icon name="dish" size={18} stroke={2} />
                {t.signatureMenu}
              </dt>
              <dd>
                {place.signature_menu}
                {place.signature_price !== null && (
                  <span className="fact-sub">
                    {peso(place.signature_price)}
                    {rate !== null && ` ≈ ${won(place.signature_price, rate)}`}
                  </span>
                )}
              </dd>
            </div>
          )}
          <div>
            <dt>
              <Icon name="wallet" size={18} stroke={2} />
              {t.priceRange}
            </dt>
            <dd>{pesoRange(place.price_range.min, place.price_range.max, t)}</dd>
          </div>
          <div>
            <dt>
              <Icon name="clock" size={18} stroke={2} />
              {t.hours}
            </dt>
            <dd>{place.opening_hours.replace('-', ' – ')}</dd>
          </div>
          <div>
            <dt>
              <Icon name="pin" size={18} stroke={2} />
              {t.address}
            </dt>
            <dd>{place.address}</dd>
          </div>
        </dl>

        {stop && (
          <section className="in-route">
            <h2>{t.inRoute}</h2>
            <p className="in-route-cost">
              <strong>{peso(stop.est_cost)}</strong>
              <span>
                {rate !== null && `≈ ${won(stop.est_cost, rate)} · `}
                {t.stay(duration(stop.stay_minutes, t))}
              </span>
            </p>
            <p className="in-route-reason">{stop.reason}</p>
          </section>
        )}
      </div>

      <div className="footer">
        <a className="btn btn-primary btn-block" href={directions} target="_blank" rel="noreferrer">
          <Icon name="route" size={20} />
          {t.directions}
        </a>
      </div>
    </main>
  )
}
