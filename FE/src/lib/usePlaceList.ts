import { useEffect, useState } from 'react'
import { getPlaceList } from '../api/client.ts'
import type { PlaceSummary } from '../api/types.ts'

// Every place name (GET /api/places), loaded once per visit. null while loading,
// [] on failure; the must-see search then lets the traveler type a name freely.
let pending: Promise<PlaceSummary[]> | null = null

export function usePlaceList(): PlaceSummary[] | null {
  const [places, setPlaces] = useState<PlaceSummary[] | null>(null)

  useEffect(() => {
    let alive = true
    pending ??= getPlaceList()
      .then((r) => r.places)
      .catch(() => {
        pending = null
        return []
      })
    pending.then((p) => alive && setPlaces(p))
    return () => {
      alive = false
    }
  }, [])

  return places
}
