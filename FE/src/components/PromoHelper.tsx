import { useState } from 'react'
import { writePromo } from '../api/client.ts'
import { ApiError, type Promo, type PromoRequest } from '../api/types.ts'

interface Props {
  /** Form fields the AI may use; `notes` comes from this panel. */
  facts: Omit<PromoRequest, 'notes'>
  /** Puts the suggested text in the form's description field. */
  onUse: (description: string) => void
}

// "Help me write" under the description field (POST /api/merchant/promo).
// The owner writes a line in any language; the AI suggests a description and a Facebook post.
export default function PromoHelper({ facts, onUse }: Props) {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [promo, setPromo] = useState<Promo | null>(null)
  const [copied, setCopied] = useState(false)

  if (!open) {
    return (
      <button type="button" className="quick m-promo-open" onClick={() => setOpen(true)}>
        ✨ Help me write
      </button>
    )
  }

  const write = async () => {
    if (!facts.name) return setError('Please enter the name of your place first.')
    if (!notes.trim()) return setError('Tell us a little about your place first.')
    setBusy(true)
    setError('')
    setCopied(false)
    try {
      setPromo(await writePromo({ ...facts, notes: notes.trim() }))
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      setError(
        code === 'TOO_MANY_REQUESTS'
          ? 'You asked many times. Please wait a few minutes.'
          : code === 'AI_UNAVAILABLE' || code === 'AI_TIMEOUT'
            ? 'The helper could not write it this time. Try again or change your words.'
            : 'Could not connect. Please try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!promo) return
    try {
      await navigator.clipboard.writeText(promo.post)
      setCopied(true)
    } catch {
      // Clipboard blocked: the owner can select the text by hand.
    }
  }

  return (
    <div className="m-card m-promo">
      <div className="m-row">
        <h3 className="m-promo-title">✨ Help me write</h3>
        <button type="button" className="btn-text m-promo-close" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
      <label className="m-field">
        <span className="m-hint">
          In your own words (English, Tagalog or Taglish): what do people love about your place?
        </span>
        <textarea
          className="m-input m-textarea"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
          placeholder="e.g. lutong bahay since 1998, malapit sa simbahan, sikat ang adobo namin"
        />
      </label>
      <button type="button" className="btn btn-soft btn-block" onClick={write} disabled={busy}>
        {busy ? 'Writing…' : 'Write it for me'}
      </button>
      {error && (
        <p className="m-error" role="alert">
          {error}
        </p>
      )}
      {promo && (
        <div className="m-promo-result" aria-live="polite">
          <span className="label">Description for travelers</span>
          <p className="m-promo-text">{promo.description}</p>
          <button type="button" className="quick" onClick={() => onUse(promo.description)}>
            Use this
          </button>
          <span className="label">Facebook post</span>
          <p className="m-promo-text">{promo.post}</p>
          <button type="button" className="quick" onClick={copy}>
            {copied ? 'Copied' : 'Copy post'}
          </button>
          <span className="m-hint">Check the text before you use it. Change your words above for a different version.</span>
        </div>
      )}
    </div>
  )
}
