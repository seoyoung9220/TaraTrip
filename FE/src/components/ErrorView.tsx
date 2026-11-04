import type { ApiErrorCode } from '../api/types.ts'
import { peso } from '../lib/format.ts'
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
function copyFor(code: ApiErrorCode, region: string, budget: number): Copy {
  switch (code) {
    case 'BUDGET_TOO_LOW':
      return {
        title: '예산이 조금 부족해요',
        body: `${peso(budget)}으로는 하루 코스를 짜기 어려워요. 예산을 조금 올리거나, 가고 싶은 곳을 줄여 보세요.`,
        edit: '예산 다시 정하기',
        retry: false,
      }
    case 'NO_RESULTS':
      return {
        title: '맞는 장소를 찾지 못했어요',
        body: `${region}에서 고른 조건에 맞는 곳이 아직 없어요. 다른 음식을 고르거나 조건을 줄여 보세요.`,
        edit: '조건 바꾸기',
        retry: false,
      }
    case 'AI_TIMEOUT':
      return {
        title: '추천이 평소보다 오래 걸려요',
        body: '잠시 후 다시 시도해 주세요. 입력한 조건은 그대로 남아 있어요.',
        edit: '조건 바꾸기',
        retry: true,
      }
    default:
      return {
        title: '추천을 받지 못했어요',
        body: '연결이 잠시 끊겼을 수 있어요. 다시 시도해 주세요. 입력한 조건은 그대로 남아 있어요.',
        edit: '조건 바꾸기',
        retry: true,
      }
  }
}

export default function ErrorView({ code, region, budget, onEdit, onRetry }: Props) {
  const copy = copyFor(code, region, budget)

  return (
    <main className="screen error-view">
      <div className="header">
        <button type="button" className="icon-btn" onClick={onEdit} aria-label="조건 입력으로 돌아가기">
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
              다시 시도하기
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
