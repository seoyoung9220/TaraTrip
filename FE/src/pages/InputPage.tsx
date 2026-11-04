import { useNavigate } from 'react-router-dom'
import type { RecommendationRequest } from '../api/types.ts'

// TODO(week 2): full input form from the wireframe (1. 조건 입력)
const sampleRequest: RecommendationRequest = {
  region: '[지역]',
  budget: { amount: 1000, currency: 'PHP' },
  foods: [],
  attractions: [],
  start_location: { lat: 14.5995, lng: 120.9842 },
}

export default function InputPage() {
  const navigate = useNavigate()

  return (
    <main style={{ padding: 20 }}>
      <h1>오늘 하루, 어떻게 보내고 싶나요?</h1>
      <button type="button" onClick={() => navigate('/route', { state: sampleRequest })}>
        코스 추천받기
      </button>
    </main>
  )
}
