/**
 * Default region: picked first when GET /api/regions lists it, and shown while the list
 * loads (up to ~30 s when the backend wakes up) or when the request fails.
 */
export const REGION = 'Intramuros'

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

/**
 * Nominatim (OpenStreetMap) search for typing a start or end address. The public server
 * allows about one request per second and no search-as-you-type, so the app only searches
 * when the traveler presses 검색/Search. Set VITE_GEOCODE_URL to '' to hide address search.
 * Only the typed text is sent.
 */
export const GEOCODE_URL: string = import.meta.env.VITE_GEOCODE_URL ?? 'https://nominatim.openstreetmap.org'
