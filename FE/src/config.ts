// Placeholder until the UST team settles the first region (same as the wireframes).

/** Shown when GET /api/regions fails or returns nothing. */
export const REGION = '[지역]'

/** Foods the traveler can add on the input screen; each one is sent to the AI as typed. */
export const MAX_FOODS = 8
export const MAX_FOOD_LENGTH = 40

/** Used when location permission is denied or unavailable. Matches the mock route area. */
export const FALLBACK_START = { lat: 14.5995, lng: 120.9842 }

export const BUDGET_STEPS = [500, 1000, 3000]

/**
 * OSRM server for road routes on the result map. The public demo server is for demos only
 * (car routing, no SLA). Set VITE_ROUTING_URL to '' to draw straight lines instead.
 * Only the stop coordinates are sent; the first stop can be near the traveler's location.
 */
export const ROUTING_URL: string = import.meta.env.VITE_ROUTING_URL ?? 'https://router.project-osrm.org'
