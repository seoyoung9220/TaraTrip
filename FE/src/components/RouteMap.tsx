import { divIcon, latLngBounds } from 'leaflet'
import { useMemo } from 'react'
import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet'
import type { Stop } from '../api/types.ts'

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

// Numbered pins in visiting order, joined by a straight line (no road routing yet).
export default function RouteMap({ stops, onSelect }: Props) {
  const bounds = useMemo(() => latLngBounds(stops.map((s) => [s.lat, s.lng])), [stops])
  const line = useMemo(() => stops.map((s) => [s.lat, s.lng] as [number, number]), [stops])

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
      <Polyline positions={line} pathOptions={{ color: '#17362e', weight: 3, dashArray: '6 6' }} />
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
