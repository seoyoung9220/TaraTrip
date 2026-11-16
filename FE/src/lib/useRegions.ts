import { useEffect, useState } from 'react'
import { getRegions } from '../api/client.ts'

// Districts that have places (GET /api/regions). Empty while loading or on failure,
// in which case the input screen falls back to REGION from config.ts.
let pending: Promise<string[]> | null = null

export function useRegions(): string[] {
  const [regions, setRegions] = useState<string[]>([])

  useEffect(() => {
    let alive = true
    pending ??= getRegions()
      .then((r) => r.regions)
      .catch(() => {
        pending = null
        return []
      })
    pending.then((r) => alive && setRegions(r))
    return () => {
      alive = false
    }
  }, [])

  return regions
}
