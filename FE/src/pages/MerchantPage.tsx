import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getOwnPlace } from '../api/client.ts'
import { ApiError } from '../api/types.ts'
import Icon from '../components/Icon.tsx'
import './MerchantPage.css'

// Entry for small-business owners (English: the owners are in the Philippines).
// New owners register; existing ones open their listing with the place ID + edit key.
export default function MerchantPage() {
  const navigate = useNavigate()
  const [placeId, setPlaceId] = useState('')
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const open = async (e: FormEvent) => {
    e.preventDefault()
    const id = placeId.trim().toUpperCase()
    setBusy(true)
    setError('')
    try {
      const place = await getOwnPlace(id, key.trim())
      navigate(`/merchant/edit/${encodeURIComponent(id)}`, { state: { key: key.trim(), place } })
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      setError(
        code === 'PLACE_NOT_FOUND'
          ? 'No place with that ID.'
          : code === 'INVALID_EDIT_KEY'
            ? 'That edit key does not match this place.'
            : 'Could not connect. Please try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="screen merchant" lang="en">
      <div className="header">
        <span className="logo merchant-logo">
          Tara<b>Trip</b> for business
        </span>
        <Link to="/" className="mode-switch">
          Plan a trip
        </Link>
      </div>

      <div className="merchant-main">
        <h1 className="title">{'Bring travelers\nto your door'}</h1>
        <p className="body-text">
          List your eatery, shop or stall for free. TaraTrip suggests local places like yours in day routes built
          around a traveler's budget.
        </p>

        <Link to="/merchant/new" className="btn btn-primary btn-block">
          <Icon name="pin" size={20} />
          Register my place
        </Link>

        <form className="m-card" onSubmit={open}>
          <h2 className="m-card-title">Already listed? Edit your place</h2>
          <label className="m-field">
            <span className="label">Place ID</span>
            <input
              className="m-input"
              value={placeId}
              onChange={(e) => setPlaceId(e.target.value)}
              placeholder="BIZ-0001"
              autoCapitalize="characters"
              required
            />
          </label>
          <label className="m-field">
            <span className="label">Edit key</span>
            <input
              className="m-input"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              required
            />
          </label>
          {error && (
            <p className="m-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-soft btn-block" disabled={busy}>
            {busy ? 'Opening…' : 'Edit my place'}
          </button>
        </form>
      </div>
    </main>
  )
}
