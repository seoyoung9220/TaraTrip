import { useEffect, useState } from 'react'
import type { Stop } from '../api/types.ts'
import { ROUTING_URL } from '../config.ts'

export type LatLngTuple = [number, number]

const TIMEOUT_MS = 3000
const cache = new Map<string, LatLngTuple[][]>()

interface OsrmStep {
  geometry: { coordinates: [number, number][] } // [lng, lat]
}
interface OsrmResponse {
  code: string
  routes?: { legs: { steps: OsrmStep[] }[] }[]
}

/**
 * Road geometry for each leg between consecutive stops (legs[i] runs stops[i] → stops[i+1]),
 * from one OSRM request. Returns null while loading, on failure or timeout, or when
 * ROUTING_URL is empty; the map then keeps straight lines.
 */
export function useRoadLegs(stops: Stop[]): LatLngTuple[][] | null {
  const key = stops.map((s) => `${s.lng},${s.lat}`).join(';')
  const [legs, setLegs] = useState<{ key: string; legs: LatLngTuple[][] } | null>(null)

  useEffect(() => {
    if (!ROUTING_URL || stops.length < 2 || cache.has(key)) return
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    // The public demo server only has the car profile; walking legs are styled differently instead.
    fetch(`${ROUTING_URL}/route/v1/driving/${key}?overview=false&steps=true&geometries=geojson`, {
      signal: ctrl.signal,
    })
      .then((res) => (res.ok ? (res.json() as Promise<OsrmResponse>) : Promise.reject(res.status)))
      .then((data) => {
        const route = data.code === 'Ok' ? data.routes?.[0] : undefined
        if (!route || route.legs.length !== stops.length - 1) return
        const result = route.legs.map((leg) =>
          leg.steps.flatMap((step) => step.geometry.coordinates.map(([lng, lat]): LatLngTuple => [lat, lng])),
        )
        cache.set(key, result)
        setLegs({ key, legs: result })
      })
      .catch(() => {}) // straight lines stay
      .finally(() => clearTimeout(timer))
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [key, stops.length])

  return cache.get(key) ?? (legs?.key === key ? legs.legs : null)
}
