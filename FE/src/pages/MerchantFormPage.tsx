import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { registerPlace, updateOwnPlace } from '../api/client.ts'
import {
  ApiError,
  type DayKey,
  type LatLng,
  type MerchantPlace,
  type MerchantPlaceCreated,
  type MerchantPlaceInput,
  type PlaceCategory,
} from '../api/types.ts'
import Icon from '../components/Icon.tsx'
import LocationPicker from '../components/LocationPicker.tsx'
import { FALLBACK_START } from '../config.ts'
import './MerchantPage.css'

const DAYS: [DayKey, string][] = [
  ['mon', 'Mon'],
  ['tue', 'Tue'],
  ['wed', 'Wed'],
  ['thu', 'Thu'],
  ['fri', 'Fri'],
  ['sat', 'Sat'],
  ['sun', 'Sun'],
]

const CATEGORIES: [PlaceCategory, string][] = [
  ['restaurant', 'Eatery'],
  ['market', 'Market / stall'],
  ['shop', 'Shop'],
  ['attraction', 'Place to visit'],
]

interface DayForm {
  open: boolean
  from: string
  to: string
}

// Everything as the inputs hold it (strings); converted to the API shape on submit.
interface Form {
  name: string
  category: PlaceCategory
  address: string
  district: string
  location: LatLng
  priceMin: string
  priceMax: string
  entryFee: string
  signatureMenu: string
  signaturePrice: string
  cashOnly: boolean
  stay: string
  hours: Record<DayKey, DayForm>
  tags: string
  description: string
  photos: string
  contact: string
}

export interface EditState {
  key: string
  place: MerchantPlace
}

const EMPTY: Form = {
  name: '',
  category: 'restaurant',
  address: '',
  district: '',
  location: FALLBACK_START,
  priceMin: '',
  priceMax: '',
  entryFee: '',
  signatureMenu: '',
  signaturePrice: '',
  cashOnly: false,
  stay: '',
  hours: Object.fromEntries(DAYS.map(([d]) => [d, { open: true, from: '08:00', to: '20:00' }])) as Form['hours'],
  tags: '',
  description: '',
  photos: '',
  contact: '',
}

const str = (n: number | null) => (n === null ? '' : String(n))
const num = (s: string) => (s.trim() === '' ? null : Number(s))
const text = (s: string) => s.trim() || null

function fromPlace(p: MerchantPlace): Form {
  return {
    name: p.name,
    category: p.category,
    address: p.address,
    district: p.district ?? '',
    location: { lat: p.lat, lng: p.lng },
    priceMin: str(p.price_min),
    priceMax: str(p.price_max),
    entryFee: p.entry_fee ? String(p.entry_fee) : '',
    signatureMenu: p.signature_menu ?? '',
    signaturePrice: str(p.signature_price),
    cashOnly: p.cash_only,
    stay: str(p.avg_stay_minutes),
    hours: Object.fromEntries(
      DAYS.map(([d]) => {
        const v = p.opening_hours[d]
        const [from = '08:00', to = '20:00'] = v === 'closed' ? [] : v.split('-')
        return [d, { open: v !== 'closed', from, to }]
      }),
    ) as Form['hours'],
    tags: p.tags.join(', '),
    description: p.description ?? '',
    photos: p.photos.join('\n'),
    contact: p.contact ?? '',
  }
}

function toInput(f: Form): MerchantPlaceInput {
  return {
    name: f.name.trim(),
    category: f.category,
    address: f.address.trim(),
    district: text(f.district),
    ...f.location,
    price_min: num(f.priceMin),
    price_max: num(f.priceMax),
    entry_fee: num(f.entryFee) ?? 0,
    signature_menu: text(f.signatureMenu),
    signature_price: num(f.signaturePrice),
    cash_only: f.cashOnly,
    avg_stay_minutes: num(f.stay),
    opening_hours: Object.fromEntries(
      DAYS.map(([d]) => {
        const h = f.hours[d]
        return [d, h.open ? `${h.from}-${h.to}` : 'closed']
      }),
    ) as MerchantPlaceInput['opening_hours'],
    tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean),
    description: text(f.description),
    photos: f.photos.split(/\s+/).filter(Boolean),
    contact: text(f.contact),
  }
}

/** First problem the server would also reject, in words an owner understands. */
function check(f: Form): string {
  if (!f.name.trim()) return 'Please enter the name of your place.'
  if (!f.address.trim()) return 'Please enter the address.'
  const lo = num(f.priceMin)
  const hi = num(f.priceMax)
  if (lo !== null && hi !== null && lo > hi) return 'The lowest price is higher than the highest price.'
  if (DAYS.some(([d]) => f.hours[d].open && !(f.hours[d].from && f.hours[d].to))) return 'Please set opening and closing times.'
  if (f.photos.split(/\s+/).some((u) => u && !u.startsWith('https://'))) return 'Photo links must start with https://'
  return ''
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="m-field">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="m-hint">{hint}</span>}
    </label>
  )
}

function PesoInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <span className="m-peso">
      <span aria-hidden="true">₱</span>
      <input
        className="m-input"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        aria-label={label}
      />
    </span>
  )
}

// Register (/merchant/new) or edit (/merchant/edit/:placeId, opened from MerchantPage with the key).
export default function MerchantFormPage() {
  const { placeId } = useParams()
  const navigate = useNavigate()
  const edit = (useLocation().state as EditState | null) ?? null
  const editing = placeId !== undefined

  const [form, setForm] = useState<Form>(() => (edit ? fromPlace(edit.place) : EMPTY))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [locating, setLocating] = useState(false)
  const [created, setCreated] = useState<MerchantPlaceCreated | null>(null)
  const [saved, setSaved] = useState(false)

  // Edit page opened by URL without the key: go back to the key form.
  if (editing && !edit) return <Navigate to="/merchant" replace />

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setSaved(false)
  }
  const setDay = (d: DayKey, v: Partial<DayForm>) => set('hours', { ...form.hours, [d]: { ...form.hours[d], ...v } })
  const copyMonday = () =>
    set('hours', Object.fromEntries(DAYS.map(([d]) => [d, { ...form.hours.mon }])) as Form['hours'])

  const locate = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set('location', { lat: Math.round(pos.coords.latitude * 1e5) / 1e5, lng: Math.round(pos.coords.longitude * 1e5) / 1e5 })
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const problem = check(form)
    setError(problem)
    if (problem) return
    setBusy(true)
    try {
      if (edit && placeId) {
        const place = await updateOwnPlace(placeId, edit.key, toInput(form))
        // Keep the router state current so a reload of this page shows the saved values.
        navigate('.', { replace: true, state: { key: edit.key, place } satisfies EditState })
        setForm(fromPlace(place))
        setSaved(true)
      } else {
        setCreated(await registerPlace(toInput(form)))
        window.scrollTo(0, 0)
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INVALID_REQUEST') setError(`Please check the form: ${err.message}`)
      else if (err instanceof ApiError && err.code === 'INVALID_EDIT_KEY') setError('Your edit key is no longer valid.')
      else setError('Could not save. Please check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  if (created) return <Registered place={created} />

  return (
    <main className="screen merchant" lang="en">
      <div className="header">
        <button type="button" className="icon-btn" onClick={() => navigate('/merchant')} aria-label="Back">
          <Icon name="back" />
        </button>
        <span className="m-header-title">{editing ? `Edit ${placeId}` : 'Register your place'}</span>
      </div>

      <form className="merchant-main" onSubmit={submit} noValidate>
        <section className="m-section">
          <h2 className="m-section-title">About your place</h2>
          <Field label="Name *">
            <input className="m-input" value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={120} />
          </Field>
          <div className="m-field">
            <span className="label">Type *</span>
            <div className="chips">
              {CATEGORIES.map(([c, label]) => (
                <button
                  key={c}
                  type="button"
                  className="chip"
                  aria-pressed={form.category === c}
                  onClick={() => set('category', c)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <Field label="Short description" hint="What makes your place special? Travelers read this.">
            <textarea
              className="m-input m-textarea"
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              maxLength={1000}
            />
          </Field>
          <Field label="Tags" hint="Separate with commas, e.g. lutong bahay, silog, street food">
            <input className="m-input" value={form.tags} onChange={(e) => set('tags', e.target.value)} />
          </Field>
        </section>

        <section className="m-section">
          <h2 className="m-section-title">Location</h2>
          <Field label="Address *">
            <input className="m-input" value={form.address} onChange={(e) => set('address', e.target.value)} maxLength={300} />
          </Field>
          <Field label="Barangay / district" hint="e.g. Binondo, Intramuros">
            <input className="m-input" value={form.district} onChange={(e) => set('district', e.target.value)} maxLength={80} />
          </Field>
          <div className="m-field">
            <span className="label">Pin on the map *</span>
            <LocationPicker value={form.location} onChange={(v) => set('location', v)} />
            <div className="m-row">
              <span className="m-hint">Tap the map or drag the pin to your door.</span>
              <button type="button" className="quick" onClick={locate} disabled={locating}>
                <Icon name="locate" size={14} stroke={2} /> {locating ? 'Locating…' : "I'm here now"}
              </button>
            </div>
          </div>
        </section>

        <section className="m-section">
          <h2 className="m-section-title">Prices (per person)</h2>
          <div className="m-row m-row-fill">
            <Field label="From">
              <PesoInput label="Lowest price" value={form.priceMin} onChange={(v) => set('priceMin', v)} />
            </Field>
            <Field label="To">
              <PesoInput label="Highest price" value={form.priceMax} onChange={(v) => set('priceMax', v)} />
            </Field>
          </div>
          <div className="m-row m-row-fill">
            <Field label="Best seller">
              <input
                className="m-input"
                value={form.signatureMenu}
                onChange={(e) => set('signatureMenu', e.target.value)}
                placeholder="e.g. Pancit canton"
                maxLength={120}
              />
            </Field>
            <Field label="Its price">
              <PesoInput label="Best seller price" value={form.signaturePrice} onChange={(v) => set('signaturePrice', v)} />
            </Field>
          </div>
          {form.category === 'attraction' && (
            <Field label="Entrance fee">
              <PesoInput label="Entrance fee" value={form.entryFee} onChange={(v) => set('entryFee', v)} />
            </Field>
          )}
          <label className="m-check">
            <input type="checkbox" checked={form.cashOnly} onChange={(e) => set('cashOnly', e.target.checked)} />
            Cash only (no card, GCash or Maya)
          </label>
        </section>

        <section className="m-section">
          <div className="m-row">
            <h2 className="m-section-title">Opening hours</h2>
            <button type="button" className="quick" onClick={copyMonday}>
              Same as Monday
            </button>
          </div>
          <ul className="m-hours">
            {DAYS.map(([d, label]) => {
              const h = form.hours[d]
              return (
                <li key={d}>
                  <label className="m-check">
                    <input type="checkbox" checked={h.open} onChange={(e) => setDay(d, { open: e.target.checked })} />
                    {label}
                  </label>
                  {h.open ? (
                    <span className="m-times">
                      <input type="time" className="m-input" value={h.from} onChange={(e) => setDay(d, { from: e.target.value })} aria-label={`${label} opens`} />
                      –
                      <input type="time" className="m-input" value={h.to} onChange={(e) => setDay(d, { to: e.target.value })} aria-label={`${label} closes`} />
                    </span>
                  ) : (
                    <span className="m-closed">Closed</span>
                  )}
                </li>
              )
            })}
          </ul>
          <Field label="Usual visit length (minutes)">
            <input
              className="m-input"
              inputMode="numeric"
              value={form.stay}
              onChange={(e) => set('stay', e.target.value.replace(/\D/g, '').slice(0, 3))}
              placeholder="e.g. 30"
            />
          </Field>
        </section>

        <section className="m-section">
          <h2 className="m-section-title">Contact and photos</h2>
          <Field label="Phone or Facebook page">
            <input className="m-input" value={form.contact} onChange={(e) => set('contact', e.target.value)} maxLength={120} />
          </Field>
          <Field label="Photo links" hint="One https:// link per line (up to 10).">
            <textarea
              className="m-input m-textarea"
              rows={2}
              value={form.photos}
              onChange={(e) => set('photos', e.target.value)}
              spellCheck={false}
            />
          </Field>
        </section>

        <div className="footer">
          {error && (
            <p className="m-error" role="alert">
              {error}
            </p>
          )}
          {saved && (
            <p className="m-ok" role="status">
              Saved. Travelers see the changes now.
            </p>
          )}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Register'}
          </button>
        </div>
      </form>
    </main>
  )
}

function Registered({ place }: { place: MerchantPlaceCreated }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`TaraTrip place ID: ${place.place_id}\nEdit key: ${place.edit_key}`)
      setCopied(true)
    } catch {
      // Clipboard blocked: the owner can still write the values down.
    }
  }

  return (
    <main className="screen merchant" lang="en">
      <div className="merchant-main">
        <div className="m-done-badge">
          <Icon name="pin" size={30} />
        </div>
        <h1 className="title">{`${place.name}\nis on TaraTrip`}</h1>
        <p className="body-text">Travelers can now get your place in their routes.</p>

        <div className="m-card m-keys">
          <p className="m-warn">
            Save these two now. You need them to edit your place, and the edit key is shown only once.
          </p>
          <dl>
            <div>
              <dt className="label">Place ID</dt>
              <dd className="m-code">{place.place_id}</dd>
            </div>
            <div>
              <dt className="label">Edit key</dt>
              <dd className="m-code">{place.edit_key}</dd>
            </div>
          </dl>
          <button type="button" className="btn btn-soft btn-block" onClick={copy}>
            {copied ? 'Copied' : 'Copy both'}
          </button>
        </div>

        <Link className="btn btn-primary btn-block" to={`/places/${encodeURIComponent(place.place_id)}`}>
          See how travelers see it
        </Link>
        <Link className="btn btn-text" to="/merchant">
          Done
        </Link>
      </div>
    </main>
  )
}
