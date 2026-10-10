/* All network calls to open data services. */

import { CONFIG } from '../config'
import type { GeocodeResult, NearbyResult, OSRMRoute, WeatherResult } from '../types'

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(`Service error (${res.status})`)
  return res.json() as Promise<T>
}

/* ---- Geocoding (Nominatim with Photon typo fallback) ---- */

export async function geocodePhoton(query: string): Promise<GeocodeResult[]> {
  try {
    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6`)
    if (!res.ok) return []
    const data = await res.json()
    if (!data.features) return []
    return data.features.map((f: any) => {
      const p = f.properties || {}
      const parts = [p.name, p.city || p.county, p.state, p.country].filter(Boolean)
      const label = parts.length > 0 ? Array.from(new Set(parts)).join(', ') : p.name || 'Location'
      return {
        label,
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        category: p.osm_value || p.type || 'place',
      }
    })
  } catch {
    return []
  }
}

export async function geocode(query: string): Promise<GeocodeResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  try {
    const url = `${CONFIG.nominatimUrl}/search?format=jsonv2&limit=6&q=${encodeURIComponent(trimmed)}`
    const list = await json<Array<{ display_name: string; lat: string; lon: string; type?: string }>>(url)
    if (list && list.length > 0) {
      return list.map(p => ({
        label: p.display_name,
        lat: parseFloat(p.lat),
        lng: parseFloat(p.lon),
        category: p.type,
      }))
    }
  } catch {
    // Nominatim failed or rate-limited; fallback to Photon
  }

  // Fallback to Photon for typo tolerance (e.g. "thrisuur" -> "Thrissur")
  return geocodePhoton(trimmed)
}

/* ---- Fast Geolocation with IP Fallback ---- */

export async function locateUser(): Promise<{ lat: number; lng: number; city?: string }> {
  // 1. Rapid browser geolocation attempt (cached or quick wifi lookup)
  if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 3500,
          maximumAge: 300000,
        })
      })
      return {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      }
    } catch {
      // Timed out or permission blocked; proceed to fast IP geolocation
    }
  }

  // 2. High-speed IP Geolocation fallback (~150ms)
  try {
    const res = await fetch('https://get.geojs.io/v1/ip/geo.json')
    if (res.ok) {
      const data = await res.json()
      if (data.latitude && data.longitude) {
        return {
          lat: parseFloat(data.latitude),
          lng: parseFloat(data.longitude),
          city: [data.city, data.country].filter(Boolean).join(', '),
        }
      }
    }
  } catch {
    // Try secondary IP lookup
  }

  try {
    const res = await fetch('https://ipwho.is/')
    if (res.ok) {
      const data = await res.json()
      if (data.success && data.latitude && data.longitude) {
        return {
          lat: data.latitude,
          lng: data.longitude,
          city: [data.city, data.country].filter(Boolean).join(', '),
        }
      }
    }
  } catch {
    // ignore
  }

  throw new Error('Could not detect location. Please check browser permissions.')
}

export async function reverse(lat: number, lng: number): Promise<string> {
  const url = `${CONFIG.nominatimUrl}/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
  const r = await json<{ display_name?: string }>(url)
  return r.display_name || 'Unknown address'
}

/* ---- Overpass ---- */

export async function nearby(lat: number, lng: number, amenity: string, radius: number): Promise<NearbyResult[]> {
  const query =
    `[out:json][timeout:25];` +
    `nwr["amenity"="${amenity}"](around:${radius},${lat},${lng});` +
    `out center 40;`
  const j = await json<{ elements: Array<{ lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }> }>(
    CONFIG.overpassUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    }
  )
  return j.elements
    .map(el => ({
      lat: el.lat ?? el.center?.lat ?? 0,
      lng: el.lon ?? el.center?.lon ?? 0,
      label: el.tags?.name || CONFIG.nearby[amenity] || amenity,
      tags: el.tags,
    }))
    .filter(p => p.lat !== 0 || p.lng !== 0)
}

/* ---- Routing (OSRM for driving, Valhalla for walking/cycling) ---- */

export async function route(profileKey: string, points: { lat: number; lng: number }[]): Promise<OSRMRoute[]> {
  const profile = CONFIG.profiles[profileKey]
  if (!profile) throw new Error(`Unknown profile: ${profileKey}`)

  // Use Valhalla for walking/cycling, OSRM for driving
  if (profile.valhalla && profileKey !== 'driving') {
    return routeValhalla(profile.valhalla, points)
  }

  const coords = points.map(p => `${p.lng},${p.lat}`).join(';')
  const url =
    `${CONFIG.routingBaseUrl}/route/v1/${profile.osrm}/${coords}` +
    `?overview=full&geometries=geojson&steps=true&alternatives=true`
  const j = await json<{ code: string; message?: string; routes?: OSRMRoute[] }>(url)
  if (j.code !== 'Ok' || !j.routes?.length) throw new Error(j.message || 'No route found')
  return j.routes
}

async function routeValhalla(costing: string, points: { lat: number; lng: number }[]): Promise<OSRMRoute[]> {
  const locations = points.map(p => ({ lat: p.lat, lon: p.lng }))
  const body = {
    locations,
    costing,
    directions_options: { units: 'kilometers' },
  }
  const res = await fetch(CONFIG.valhallaUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Routing service error (${res.status})`)
  const j = await res.json()

  if (j.error) throw new Error(j.error || 'No route found')
  if (!j.trip?.legs?.length) throw new Error('No route found')

  // Convert Valhalla response to OSRM-like format
  const valhallaLegs = j.trip.legs as Array<{
    summary?: { length?: number; time?: number }
    maneuvers?: Array<Record<string, unknown>>
  }>
  const legs = valhallaLegs.map(leg => ({
    steps: (leg.maneuvers || []).map((m: Record<string, unknown>) => ({
      maneuver: {
        type: valhallaTypeToOSRM(String(m.type || '')),
        modifier: valhallaModifierToOSRM(String(m.modifier || '')),
        location: [0, 0] as [number, number],
      },
      name: String(m.instruction || ''),
      distance: Number(m.distance || 0) * 1000,
      duration: Number(m.time || 0),
      geometry: { coordinates: [] as [number, number][] },
    })),
    distance: Number(leg.summary?.length || 0) * 1000,
    duration: Number(leg.summary?.time || 0),
  }))

  // Decode shape (Valhalla returns encoded polyline)
  const coords = decodePolyline(j.trip.legs[0]?.shape || '')
  const tripSummary = j.trip.summary as { length?: number; time?: number } | undefined

  return [{
    distance: Number(tripSummary?.length || 0) * 1000,
    duration: Number(tripSummary?.time || 0),
    geometry: { coordinates: coords },
    legs,
  }]
}

function valhallaTypeToOSRM(t: string): string {
  const map: Record<string, string> = {
    '0': 'depart', '1': 'depart', '2': 'turn', '3': 'turn', '4': 'continue',
    '5': 'continue', '6': 'new name', '7': 'merge', '8': 'roundabout',
    '9': 'roundabout', '10': 'fork', '11': 'fork', '12': 'end of road',
    '13': 'continue', '14': 'continue', '15': 'continue', '16': 'roundabout',
  }
  return map[t] || 'continue'
}

function valhallaModifierToOSRM(m: string): string {
  const map: Record<string, string> = {
    'straight': '', 'slight right': 'slight right', 'right': 'right',
    'sharp right': 'sharp right', 'reverse': 'uturn', 'left': 'left',
    'slight left': 'slight left', 'sharp left': 'sharp left',
  }
  return map[m] || ''
}

// Decode Google encoded polyline (precision 6)
function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let result = 0
    let shift = 0
    let b: number
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    lat += result & 1 ? ~(result >> 1) : result >> 1

    result = 0
    shift = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    lng += result & 1 ? ~(result >> 1) : result >> 1

    coords.push([lng / 1e6, lat / 1e6])
  }
  return coords
}

/* ---- OSRM step description ---- */

export function describeStep(step: { maneuver: { type: string; modifier?: string }; name?: string }): string {
  const m = step.maneuver
  const name = step.name || 'the road'
  const mod = m.modifier ? ` ${m.modifier}` : ''
  switch (m.type) {
    case 'depart': return `Start on ${name}`
    case 'arrive': return 'Arrive at destination'
    case 'turn': return `Turn${mod} onto ${name}`
    case 'new name': return `Continue onto ${name}`
    case 'continue': return `Continue${mod} on ${name}`
    case 'merge': return `Merge${mod} onto ${name}`
    case 'fork': return `Keep${mod} onto ${name}`
    case 'roundabout': return `Enter the roundabout and exit onto ${name}`
    default: return `${m.type || 'Continue'}${mod} on ${name}`
  }
}

/* ---- Elevation (OpenTopoData) ---- */

export async function elevation(lat: number, lng: number): Promise<number> {
  const url = `${CONFIG.elevationUrl}?locations=${lat},${lng}`
  const j = await json<{ results?: Array<{ elevation?: number }> }>(url)
  const e = j.results?.[0]?.elevation
  if (e == null) throw new Error('No elevation data here')
  return e
}

export async function elevationBatch(
  points: { lat: number; lng: number }[]
): Promise<Array<{ lat: number; lng: number; elevation: number }>> {
  if (!points.length) return []
  // OpenTopoData supports up to 100 locations per request
  const BATCH = 100
  const results: Array<{ lat: number; lng: number; elevation: number }> = []

  for (let i = 0; i < points.length; i += BATCH) {
    const batch = points.slice(i, i + BATCH)
    const locs = batch.map(p => `${p.lat},${p.lng}`).join('|')
    const url = `${CONFIG.elevationUrl}?locations=${locs}`
    const j = await json<{ results?: Array<{ elevation?: number }> }>(url)
    batch.forEach((p, idx) => {
      const e = j.results?.[idx]?.elevation
      if (e != null) results.push({ lat: p.lat, lng: p.lng, elevation: e })
    })
    // Rate limit: ~1 req/sec
    if (i + BATCH < points.length) {
      await new Promise(r => setTimeout(r, 1100))
    }
  }
  return results
}

/* ---- Weather (Open-Meteo) ---- */

export async function weather(lat: number, lng: number): Promise<WeatherResult> {
  const url =
    `${CONFIG.weatherUrl}?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,wind_speed_10m,relative_humidity_2m,weather_code`
  const j = await json<{
    current: { temperature_2m: number; wind_speed_10m: number; relative_humidity_2m: number; weather_code: number }
    current_units: { temperature_2m: string; wind_speed_10m: string }
  }>(url)
  return {
    temperature: j.current.temperature_2m,
    tempUnit: j.current_units.temperature_2m,
    wind: j.current.wind_speed_10m,
    windUnit: j.current_units.wind_speed_10m,
  }
}

export function weatherCodeToEmoji(code: number): string {
  if (code === 0) return '☀️'
  if (code <= 2) return '⛅'
  if (code === 3) return '☁️'
  if (code <= 48) return '🌫'
  if (code <= 57) return '🌧'
  if (code <= 67) return '🌧'
  if (code <= 77) return '🌨'
  if (code <= 82) return '🌧'
  if (code <= 86) return '🌨'
  return '⛈'
}

/* ---- Wikipedia Places & POI ---- */

export interface WikipediaPlaceSummary {
  title: string
  description?: string
  extract: string
  thumbnail?: string
  url?: string
  lat?: number
  lng?: number
}

export async function fetchWikipediaSummary(query: string): Promise<WikipediaPlaceSummary | null> {
  const cleanTitle = query.split(',')[0].trim()
  if (!cleanTitle) return null

  try {
    // 1. Try direct page summary
    const directUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTitle.replace(/\s+/g, '_'))}`
    const res = await fetch(directUrl)
    if (res.ok) {
      const data = await res.json()
      if (data.extract) {
        return {
          title: data.title,
          description: data.description,
          extract: data.extract,
          thumbnail: data.thumbnail?.source,
          url: data.content_urls?.desktop?.page,
          lat: data.coordinates?.lat,
          lng: data.coordinates?.lon,
        }
      }
    }
  } catch {
    /* fallback to search */
  }

  try {
    // 2. Fallback to Wikipedia search API
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanTitle)}&utf8=&format=json&origin=*`
    const searchData = await json<{ query?: { search?: Array<{ title: string; snippet: string }> } }>(searchUrl)
    const firstHit = searchData.query?.search?.[0]
    if (firstHit) {
      const sumUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstHit.title.replace(/\s+/g, '_'))}`
      const sumRes = await fetch(sumUrl)
      if (sumRes.ok) {
        const sumData = await sumRes.json()
        return {
          title: sumData.title,
          description: sumData.description,
          extract: sumData.extract || firstHit.snippet.replace(/<[^>]*>/g, ''),
          thumbnail: sumData.thumbnail?.source,
          url: sumData.content_urls?.desktop?.page,
          lat: sumData.coordinates?.lat,
          lng: sumData.coordinates?.lon,
        }
      }
    }
  } catch {
    /* unavailable */
  }

  return null
}

export async function fetchNearbyWikipedia(lat: number, lng: number): Promise<WikipediaPlaceSummary | null> {
  try {
    const geoUrl = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lng}&gsradius=10000&gslimit=1&format=json&origin=*`
    const geoData = await json<{ query?: { geosearch?: Array<{ title: string; lat: number; lon: number }> } }>(geoUrl)
    const hit = geoData.query?.geosearch?.[0]
    if (hit) {
      const summary = await fetchWikipediaSummary(hit.title)
      if (summary) {
        return { ...summary, lat: hit.lat, lng: hit.lon }
      }
    }
  } catch {
    /* unavailable */
  }
  return null
}

/* ---- USGS Earthquakes (Live 24h Feed) ---- */

export interface EarthquakeRecord {
  id: string
  lat: number
  lng: number
  mag: number
  place: string
  depth: number
  time: number
  url?: string
}

export async function fetchLiveEarthquakes(): Promise<EarthquakeRecord[]> {
  const url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson'
  const data = await json<{
    features?: Array<{
      id: string
      properties: { mag: number; place: string; time: number; url?: string }
      geometry: { coordinates: [number, number, number] }
    }>
  }>(url)

  if (!data.features) return []
  return data.features
    .map(f => ({
      id: f.id,
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      depth: f.geometry.coordinates[2],
      mag: f.properties.mag,
      place: f.properties.place,
      time: f.properties.time,
      url: f.properties.url,
    }))
    .filter(eq => !isNaN(eq.lat) && !isNaN(eq.lng) && eq.mag > 0)
}

/* ---- RainViewer Live Weather Radar ---- */

export async function fetchRainViewerTimestamp(): Promise<number | null> {
  try {
    const data = await json<{ radar?: { past?: Array<{ time: number }> } }>(
      'https://api.rainviewer.com/public/weather-maps.json'
    )
    const past = data.radar?.past
    if (past && past.length) {
      return past[past.length - 1].time
    }
  } catch {
    /* fallback */
  }
  return null
}

/* ---- International Space Station (ISS) Tracker ---- */

export interface ISSPosition {
  lat: number
  lng: number
  altitude: number
  velocity: number
  timestamp: number
}

export async function fetchISSPosition(): Promise<ISSPosition | null> {
  try {
    const data = await json<{
      latitude: number
      longitude: number
      altitude: number
      velocity: number
      timestamp: number
    }>('https://api.wheretheiss.at/v1/satellites/25544')
    return {
      lat: data.latitude,
      lng: data.longitude,
      altitude: Math.round(data.altitude),
      velocity: Math.round(data.velocity),
      timestamp: data.timestamp,
    }
  } catch {
    return null
  }
}

