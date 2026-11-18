import type { ApiErrorCode } from '../api/types.ts'
import { peso } from '../lib/format.ts'
import { useT, type Messages } from '../lib/i18n.ts'
import Icon from './Icon.tsx'
import './ErrorView.css'

interface Props {
  code: ApiErrorCode
  region: string
  budget: number
  /** Back to the input screen with the same conditions filled in. */
  onEdit: () => void
  onRetry: () => void
}

interface Copy {
  title: string
  body: string
  edit: string
  retry: boolean
}

// 5a–5c. Anything that is not about the request itself (timeouts, network) gets the retry copy.
function copyFor(code: ApiErrorCode, region: string, budget: number, t: Messages): Copy {
  switch (code) {
    case 'BUDGET_TOO_LOW':
      return { ...t.errors.budget(peso(budget)), retry: false }
    case 'NO_RESULTS':
      return { ...t.errors.noResults(region), retry: false }
    case 'AI_TIMEOUT':
      return { ...t.errors.timeout, retry: true }
    default:
      return { ...t.errors.other, retry: true }
  }
}

export default function ErrorView({ code, region, budget, onEdit, onRetry }: Props) {
  const t = useT()
  const copy = copyFor(code, region, budget, t)

  return (
    <main className="screen error-view">
      <div className="header">
        <button type="button" className="icon-btn" onClick={onEdit} aria-label={t.backToInput}>
          <Icon name="back" />
        </button>
      </div>
      <div className="error-main">
        <div className="error-badge">
          <Icon name="alert" size={30} />
        </div>
        <h1 className="title">{copy.title}</h1>
        <p className="body-text">{copy.body}</p>
      </div>
      <div className="footer">
        {copy.retry ? (
          <>
            <button type="button" className="btn btn-primary btn-block" onClick={onRetry}>
              {t.errors.retry}
            </button>
            <button type="button" className="btn btn-soft btn-block" onClick={onEdit}>
              {copy.edit}
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-primary btn-block" onClick={onEdit}>
            {copy.edit}
          </button>
        )}
      </div>
    </main>
  )
}
