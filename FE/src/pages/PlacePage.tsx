import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPlace } from '../api/client.ts'
import type { PlaceDetail } from '../api/types.ts'

// TODO(week 3): place detail from the wireframe (4. 장소 상세)
export default function PlacePage() {
  const { placeId = '' } = useParams()
  const [place, setPlace] = useState<PlaceDetail | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    getPlace(placeId)
      .then((p) => !cancelled && setPlace(p))
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [placeId])

  if (failed) return <main style={{ padding: 20 }}>장소를 찾지 못했어요</main>
  if (!place) return <main style={{ padding: 20 }}>불러오는 중…</main>

  return (
    <main style={{ padding: 20 }}>
      <h1>{place.name}</h1>
      <p>{place.address}</p>
      <p>{place.opening_hours}</p>
    </main>
  )
}
