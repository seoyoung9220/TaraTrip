import { divIcon } from 'leaflet'
import { useEffect } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { LatLng } from '../api/types.ts'

interface Props {
  value: LatLng
  onChange: (value: LatLng) => void
}

const PIN = divIcon({ className: 'map-pin pick-pin', html: '<span></span>', iconSize: [28, 28], iconAnchor: [14, 14] })

// Round to ~1 m; more digits only look precise.
const round = (x: number) => Math.round(x * 1e5) / 1e5

function ClickToMove({ onChange }: Pick<Props, 'onChange'>) {
  useMapEvents({ click: (e) => onChange({ lat: round(e.latlng.lat), lng: round(e.latlng.lng) }) })
  return null
}

function FollowValue({ value }: Pick<Props, 'value'>) {
  const map = useMap()
  useEffect(() => {
    if (!map.getBounds().contains([value.lat, value.lng])) map.panTo([value.lat, value.lng])
  }, [map, value.lat, value.lng])
  return null
}

// Tap the map or drag the pin to set where the place is.
export default function LocationPicker({ value, onChange }: Props) {
  return (
    <MapContainer className="pick-map" center={[value.lat, value.lng]} zoom={16} scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker
        position={[value.lat, value.lng]}
        icon={PIN}
        draggable
        eventHandlers={{
          dragend: (e) => {
            const p = e.target.getLatLng()
            onChange({ lat: round(p.lat), lng: round(p.lng) })
          },
        }}
      />
      <ClickToMove onChange={onChange} />
      <FollowValue value={value} />
    </MapContainer>
  )
}
