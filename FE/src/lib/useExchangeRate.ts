import { useEffect, useState } from 'react'
import { getExchangeRate } from '../api/client.ts'

// One request per page load. On failure the KRW line is hidden (docs/API.md) and the next mount retries.
let pending: Promise<number | null> | null = null

export function useExchangeRate(): number | null {
  const [rate, setRate] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    pending ??= getExchangeRate()
      .then((r) => r.rate)
      .catch(() => {
        pending = null
        return null
      })
    pending.then((r) => alive && setRate(r))
    return () => {
      alive = false
    }
  }, [])

  return rate
}
