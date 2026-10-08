'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Custom SVG pin marker
const pinIcon = new L.DivIcon({
  className: '',
  html: `<svg width="32" height="44" viewBox="0 0 32 44" xmlns="http://www.w3.org/2000/svg">
    <filter id="shadow" x="-30%" y="-10%" width="160%" height="160%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.25)"/>
    </filter>
    <path filter="url(#shadow)" d="M16 1C8.268 1 2 7.268 2 15c0 10.2 14 28 14 28S30 25.2 30 15C30 7.268 23.732 1 16 1z" fill="#3b82f6"/>
    <circle cx="16" cy="15" r="5.5" fill="white"/>
  </svg>`,
  iconSize: [32, 44],
  iconAnchor: [16, 44],
  popupAnchor: [0, -44],
})

export interface LocationResult {
  lat: number
  lng: number
  city: string | null
  state: string | null
  country: string
  display: string | null
}

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address?: {
    city?: string
    town?: string
    municipality?: string
    state?: string
    country_code?: string
    neighbourhood?: string
    suburb?: string
    road?: string
  }
}

async function reverseGeocode(lat: number, lng: number): Promise<Partial<LocationResult>> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=pt-BR`,
      { headers: { 'User-Agent': 'CarPassport/1.0' } }
    )
    if (!res.ok) return {}
    const data = await res.json()
    return {
      city: data.address?.city || data.address?.town || data.address?.municipality || null,
      state: data.address?.state || null,
      country: data.address?.country_code?.toUpperCase() || 'BR',
      display: data.address?.neighbourhood || data.address?.suburb || data.address?.road || null,
    }
  } catch {
    return {}
  }
}

// Map sub-components (must live inside MapContainer)
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) })
  return null
}

function FlyToTarget({ target }: { target: [number, number] | null }) {
  const map = useMap()
  const prev = useRef<string>('')
  useEffect(() => {
    if (!target) return
    const key = target.join(',')
    if (key === prev.current) return
    prev.current = key
    map.flyTo(target, 15, { duration: 1.2 })
  }, [map, target])
  return null
}

// Props
interface Props {
  onLocationChange: (result: LocationResult) => void
  initialLocation?: { lat: number; lng: number } | null
}

const BRAZIL_CENTER: [number, number] = [-14.235, -51.925]

export default function LocationPicker({ onLocationChange, initialLocation }: Props) {
  const [markerPos, setMarkerPos] = useState<[number, number] | null>(
    initialLocation ? [initialLocation.lat, initialLocation.lng] : null
  )
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null)
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [locationInfo, setLocationInfo] = useState<Partial<LocationResult>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const applyLocation = useCallback((lat: number, lng: number, geo: Partial<LocationResult>) => {
    const result: LocationResult = {
      lat,
      lng,
      city: geo.city || null,
      state: geo.state || null,
      country: geo.country || 'BR',
      display: geo.display || null,
    }
    setLocationInfo(geo)
    onLocationChange(result)
  }, [onLocationChange])

  const updateMarker = useCallback((lat: number, lng: number) => {
    setMarkerPos([lat, lng])
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current)
    geocodeTimer.current = setTimeout(async () => {
      const geo = await reverseGeocode(lat, lng)
      applyLocation(lat, lng, geo)
    }, 500)
  }, [applyLocation])

  const requestGPS = useCallback(() => {
    setGeoStatus('loading')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        const geo = await reverseGeocode(lat, lng)
        setGeoStatus('success')
        setFlyTarget([lat, lng])
        setMarkerPos([lat, lng])
        applyLocation(lat, lng, geo)
      },
      () => setGeoStatus('error'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [applyLocation])

  // Auto-request GPS on first mount
  useEffect(() => {
    if (initialLocation) {
      reverseGeocode(initialLocation.lat, initialLocation.lng).then(geo =>
        applyLocation(initialLocation.lat, initialLocation.lng, geo)
      )
    } else {
      requestGPS()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (q: string) => {
    setSearchQuery(q)
    setSearchResults([])
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (q.trim().length < 3) { setSearchLoading(false); return }
    setSearchLoading(true)
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(q)}&limit=5&accept-language=pt-BR`,
          { headers: { 'User-Agent': 'CarPassport/1.0' } }
        )
        if (res.ok) setSearchResults(await res.json())
      } catch { /* ignore */ }
      setSearchLoading(false)
    }, 600)
  }

  const selectResult = (r: NominatimResult) => {
    const lat = parseFloat(r.lat)
    const lng = parseFloat(r.lon)
    const geo: Partial<LocationResult> = {
      city: r.address?.city || r.address?.town || r.address?.municipality || null,
      state: r.address?.state || null,
      country: r.address?.country_code?.toUpperCase() || 'BR',
      display: r.address?.neighbourhood || r.address?.suburb || r.address?.road || null,
    }
    setSearchQuery('')
    setSearchResults([])
    setGeoStatus('success')
    setFlyTarget([lat, lng])
    setMarkerPos([lat, lng])
    applyLocation(lat, lng, geo)
  }

  const locationLabel = locationInfo.city
    ? [locationInfo.city, locationInfo.state].filter(Boolean).join(', ')
    : locationInfo.state || null

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
      {/* Map area */}
      <div className="relative">
        <MapContainer
          center={markerPos || BRAZIL_CENTER}
          zoom={markerPos ? 15 : 4}
          style={{ height: 260, width: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapClickHandler onMapClick={updateMarker} />
          <FlyToTarget target={flyTarget} />
          {markerPos && (
            <Marker
              position={markerPos}
              icon={pinIcon}
              draggable
              eventHandlers={{
                dragend(e) {
                  const { lat, lng } = (e.target as L.Marker).getLatLng()
                  updateMarker(lat, lng)
                },
              }}
            />
          )}
        </MapContainer>

        {/* Search bar */}
        <div className="absolute top-3 left-3 right-14 z-[1000]">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Buscar cidade ou local..."
              className="w-full bg-white rounded-xl px-3 py-2 pr-8 text-sm shadow-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
            />
            {searchLoading ? (
              <span className="absolute right-2.5 top-2 text-slate-400 text-sm animate-spin">⏳</span>
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setSearchResults([]) }}
                className="absolute right-2.5 top-1.5 text-slate-400 text-xs px-1"
              >
                ✕
              </button>
            ) : (
              <span className="absolute right-2.5 top-2 text-slate-400 text-sm">🔍</span>
            )}
          </div>

          {searchResults.length > 0 && (
            <ul className="mt-1 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
              {searchResults.map(r => (
                <li key={r.place_id}>
                  <button
                    type="button"
                    onClick={() => selectResult(r)}
                    className="w-full text-left px-3 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 border-b border-slate-100 last:border-0 truncate"
                  >
                    📍 {r.display_name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* GPS button */}
        <button
          type="button"
          onClick={requestGPS}
          title="Usar minha localização atual"
          className="absolute bottom-3 right-3 z-[1000] w-10 h-10 bg-white rounded-xl border border-slate-200 shadow-lg flex items-center justify-center hover:bg-blue-50 active:scale-95 transition-all"
        >
          {geoStatus === 'loading' ? (
            <span className="text-sm animate-spin">⏳</span>
          ) : geoStatus === 'error' ? (
            <span className="text-sm">⚠️</span>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <line x1="12" y1="2" x2="12" y2="6"/>
              <line x1="12" y1="18" x2="12" y2="22"/>
              <line x1="2" y1="12" x2="6" y2="12"/>
              <line x1="18" y1="12" x2="22" y2="12"/>
            </svg>
          )}
        </button>

        {/* Hint */}
        {!markerPos && geoStatus !== 'loading' && (
          <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5 text-xs text-slate-500 shadow">
            Toque no mapa para marcar o local
          </div>
        )}
      </div>

      {/* Location info bar */}
      <div className="px-4 py-3 border-t border-slate-100 min-h-[52px] flex items-center gap-2">
        {geoStatus === 'loading' && !markerPos ? (
          <p className="text-sm text-slate-400">Obtendo localização GPS...</p>
        ) : markerPos ? (
          <>
            <span className="text-blue-500 shrink-0">📍</span>
            <div className="flex-1 min-w-0">
              {locationLabel ? (
                <p className="text-sm font-semibold text-slate-800 truncate">{locationLabel}</p>
              ) : (
                <p className="text-sm text-slate-400 italic">Identificando...</p>
              )}
              {locationInfo.display && (
                <p className="text-xs text-slate-500 truncate">{locationInfo.display}</p>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400">Busque ou toque no mapa para escolher o local</p>
        )}
      </div>
    </div>
  )
}
