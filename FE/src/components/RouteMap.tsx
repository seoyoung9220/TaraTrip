import { divIcon, latLngBounds } from 'leaflet'
import { useMemo } from 'react'
import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet'
import type { Stop } from '../api/types.ts'
import { duration } from '../lib/format.ts'
import { useT } from '../lib/i18n.ts'
import { useRoadLegs, type LatLngTuple } from '../lib/useRoadLegs.ts'

interface Props {
  stops: Stop[]
  onSelect: (stop: Stop) => void
}

function pinIcon(order: number) {
  return divIcon({
    className: 'map-pin',
    html: `<span>${order}</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

function legIcon(text: string) {
  // Zero-size icon at the leg's midpoint; the label centers itself on it (ResultPage.css).
  return divIcon({ className: 'map-leg', html: `<span>${text}</span>`, iconSize: [0, 0], iconAnchor: [0, 0] })
}

const LINE = { color: '#17362e', weight: 4, opacity: 0.85 }
const WALK_LINE = { ...LINE, weight: 3, dashArray: '2 7', lineCap: 'round' as const }

// Numbered pins in visiting order. Legs follow roads when OSRM answers (useRoadLegs),
// straight lines otherwise; walking legs are dotted. Each leg is labeled with mode and minutes.
export default function RouteMap({ stops, onSelect }: Props) {
  const t = useT()
  const bounds = useMemo(() => latLngBounds(stops.map((s) => [s.lat, s.lng])), [stops])
  const roads = useRoadLegs(stops)
  const legs = useMemo(
    () =>
      stops.slice(1).map((to, i) => {
        const from = stops[i]
        const path: LatLngTuple[] = roads?.[i]?.length ? roads[i] : [[from.lat, from.lng], [to.lat, to.lng]]
        const mid = roads?.[i]?.length
          ? path[Math.floor(path.length / 2)]
          : ([(from.lat + to.lat) / 2, (from.lng + to.lng) / 2] as LatLngTuple)
        return { key: to.place_id, path, mid, transport: to.transport }
      }),
    [stops, roads],
  )

  return (
    <MapContainer
      className="route-map"
      bounds={bounds}
      // Top: room for the back button. Bottom: the sheet overlaps the map by 24px.
      boundsOptions={{ paddingTopLeft: [40, 64], paddingBottomRight: [40, 52] }}
      zoomControl={false}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {legs.map((leg) => (
        <Polyline
          key={leg.key}
          positions={leg.path}
          pathOptions={leg.transport?.mode === 'walk' ? WALK_LINE : LINE}
        />
      ))}
      {legs.map(
        (leg) =>
          leg.transport && (
            <Marker
              key={`${leg.key}-label`}
              position={leg.mid}
              icon={legIcon(`${t.mode[leg.transport.mode]} ${duration(leg.transport.minutes, t)}`)}
              interactive={false}
              keyboard={false}
            />
          ),
      )}
      {stops.map((s) => (
        <Marker
          key={s.place_id}
          position={[s.lat, s.lng]}
          icon={pinIcon(s.order)}
          title={s.name}
          eventHandlers={{ click: () => onSelect(s) }}
        />
      ))}
    </MapContainer>
  )
}
