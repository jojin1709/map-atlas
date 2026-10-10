/* Geometry, formatting, and GPX / GeoJSON / KML helpers. */

import type { LatLng, SavedPlace } from '../types'

export function haversine(a: LatLng, b: LatLng): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/* Spherical polygon area in square meters (spherical excess / shoelace on sphere). */
export function polygonArea(pts: LatLng[]): number {
  if (pts.length < 3) return 0
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  let total = 0
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i]
    const p2 = pts[(i + 1) % pts.length]
    total += toRad(p2.lng - p1.lng) * (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)))
  }
  return Math.abs((total * R * R) / 2)
}

export function formatArea(sqm: number): string {
  if (sqm >= 1e6) return `${(sqm / 1e6).toFixed(2)} km²`
  if (sqm >= 1e4) return `${(sqm / 1e4).toFixed(2)} ha`
  return `${Math.round(sqm)} m²`
}

export function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`
}

export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)} h ${mins % 60} min`
}

export function toDecimal(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
}

export function toDMS(deg: number, pos: string, neg: string): string {
  const abs = Math.abs(deg)
  const d = Math.floor(abs)
  const mFloat = (abs - d) * 60
  const m = Math.floor(mFloat)
  const s = ((mFloat - m) * 60).toFixed(1)
  return `${d}°${m}′${s}″${deg >= 0 ? pos : neg}`
}

export function coordsDMS(lat: number, lng: number): string {
  return `${toDMS(lat, 'N', 'S')} ${toDMS(lng, 'E', 'W')}`
}

function escapeXml(s: string): string {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!
  )
}

/* ---- GPX ---- */

export function toGPX(places: SavedPlace[]): string {
  const wpts = places
    .map(p => `  <wpt lat="${p.lat}" lon="${p.lng}"><name>${escapeXml(p.name)}</name></wpt>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="MapApp" xmlns="http://www.topografix.com/GPX/1/1">
${wpts}
</gpx>`
}

export function parseGPX(text: string): SavedPlace[] {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) throw new Error('Invalid GPX file')
  return Array.from(doc.getElementsByTagName('wpt')).map(w => ({
    id: Date.now() + Math.random(),
    name: w.getElementsByTagName('name')[0]?.textContent || 'Imported',
    lat: parseFloat(w.getAttribute('lat') || '0'),
    lng: parseFloat(w.getAttribute('lon') || '0'),
  }))
}

export interface GPXTrackResult {
  name: string
  points: LatLng[]
  elevations: number[]
  distance: number
}

export function parseGPXTrack(text: string): GPXTrackResult {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) throw new Error('Invalid GPX file format')

  const name =
    doc.getElementsByTagName('name')[0]?.textContent ||
    doc.getElementsByTagName('trk')[0]?.getElementsByTagName('name')[0]?.textContent ||
    'Imported Trail'

  const trkpts = Array.from(doc.getElementsByTagName('trkpt'))
  const points: LatLng[] = []
  const elevations: number[] = []

  for (const pt of trkpts) {
    const lat = parseFloat(pt.getAttribute('lat') || '')
    const lng = parseFloat(pt.getAttribute('lon') || '')
    if (!isNaN(lat) && !isNaN(lng)) {
      points.push({ lat, lng })
      const ele = pt.getElementsByTagName('ele')[0]?.textContent
      elevations.push(ele ? parseFloat(ele) : 0)
    }
  }

  // Fallback to route points <rtept> if no <trkpt>
  if (!points.length) {
    const rtepts = Array.from(doc.getElementsByTagName('rtept'))
    for (const pt of rtepts) {
      const lat = parseFloat(pt.getAttribute('lat') || '')
      const lng = parseFloat(pt.getAttribute('lon') || '')
      if (!isNaN(lat) && !isNaN(lng)) {
        points.push({ lat, lng })
      }
    }
  }

  let distance = 0
  for (let i = 1; i < points.length; i++) {
    distance += haversine(points[i - 1], points[i])
  }

  return { name, points, elevations, distance }
}

export function exportShapesToGPX(shapes: { points: LatLng[]; label?: string }[], title = 'MapAtlas Export'): string {
  const tracks = shapes
    .map(
      (s, idx) => `  <trk>
    <name>${escapeXml(s.label || `Shape ${idx + 1}`)}</name>
    <trkseg>
${s.points.map(p => `      <trkpt lat="${p.lat}" lon="${p.lng}" />`).join('\n')}
    </trkseg>
  </trk>`
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="MapAtlas" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${escapeXml(title)}</name></metadata>
${tracks}
</gpx>`
}

export function exportShapesToGeoJSON(shapes: { type: string; points: LatLng[]; label?: string }[]): object {
  return {
    type: 'FeatureCollection',
    features: shapes.map((s, idx) => ({
      type: 'Feature',
      properties: { name: s.label || `Shape ${idx + 1}`, type: s.type },
      geometry:
        s.type === 'polygon' || s.type === 'rectangle'
          ? {
              type: 'Polygon',
              coordinates: [[...s.points.map(p => [p.lng, p.lat]), [s.points[0].lng, s.points[0].lat]]],
            }
          : {
              type: 'LineString',
              coordinates: s.points.map(p => [p.lng, p.lat]),
            },
    })),
  }
}

/* ---- GeoJSON ---- */

export function toGeoJSON(places: SavedPlace[]): object {
  return {
    type: 'FeatureCollection',
    features: places.map(p => ({
      type: 'Feature',
      properties: { name: p.name },
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
    })),
  }
}

export function parseGeoJSON(obj: { features?: Array<{ geometry?: { type: string; coordinates: unknown }; properties?: { name?: string } }> }): SavedPlace[] {
  return (obj.features || [])
    .filter(f => f.geometry?.type === 'Point')
    .map(f => {
      const coords = f.geometry!.coordinates as [number, number]
      return {
        id: Date.now() + Math.random(),
        name: f.properties?.name || 'Imported',
        lng: coords[0],
        lat: coords[1],
      }
    })
}

/* ---- KML ---- */

export interface KMLImportResult {
  places: SavedPlace[]
  lines: Array<{ name: string; points: LatLng[] }>
  polygons: Array<{ name: string; points: LatLng[] }>
}

export function parseKML(text: string): KMLImportResult {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) throw new Error('Invalid KML file')

  const result: KMLImportResult = { places: [], lines: [], polygons: [] }
  const placemarks = doc.getElementsByTagName('Placemark')

  for (let i = 0; i < placemarks.length; i++) {
    const pm = placemarks[i]
    const name = pm.getElementsByTagName('name')[0]?.textContent || `Imported ${i + 1}`

    // Point
    const point = pm.getElementsByTagName('Point')
    if (point.length) {
      const coordsText = point[0].getElementsByTagName('coordinates')[0]?.textContent?.trim()
      if (coordsText) {
        const [lngStr, latStr] = coordsText.split(',')
        const lat = parseFloat(latStr)
        const lng = parseFloat(lngStr)
        if (!isNaN(lat) && !isNaN(lng)) {
          result.places.push({ id: Date.now() + Math.random(), name, lat, lng })
        }
      }
      continue
    }

    // LineString
    const lineString = pm.getElementsByTagName('LineString')
    if (lineString.length) {
      const coordsText = lineString[0].getElementsByTagName('coordinates')[0]?.textContent?.trim()
      if (coordsText) {
        const points = coordsText.split(/\s+/).map(pair => {
          const [lng, lat] = pair.split(',').map(Number)
          return { lat, lng }
        }).filter(p => !isNaN(p.lat) && !isNaN(p.lng))
        if (points.length >= 2) result.lines.push({ name, points })
      }
      continue
    }

    // Polygon
    const polygon = pm.getElementsByTagName('Polygon')
    if (polygon.length) {
      const outerRing = polygon[0].getElementsByTagName('outerBoundaryIs')[0]
      const coordsText = outerRing?.getElementsByTagName('coordinates')[0]?.textContent?.trim()
      if (coordsText) {
        const points = coordsText.split(/\s+/).map(pair => {
          const [lng, lat] = pair.split(',').map(Number)
          return { lat, lng }
        }).filter(p => !isNaN(p.lat) && !isNaN(p.lng))
        if (points.length >= 3) result.polygons.push({ name, points })
      }
      continue
    }

    // MultiGeometry — recurse into child placemarks
    const multi = pm.getElementsByTagName('MultiGeometry')
    if (multi.length) {
      const innerPoints = multi[0].getElementsByTagName('Point')
      for (let j = 0; j < innerPoints.length; j++) {
        const coordsText = innerPoints[j].getElementsByTagName('coordinates')[0]?.textContent?.trim()
        if (coordsText) {
          const [lngStr, latStr] = coordsText.split(',')
          const lat = parseFloat(latStr)
          const lng = parseFloat(lngStr)
          if (!isNaN(lat) && !isNaN(lng)) {
            result.places.push({ id: Date.now() + Math.random(), name: `${name} ${j + 1}`, lat, lng })
          }
        }
      }
    }
  }

  return result
}

export function toKML(places: SavedPlace[]): string {
  const placemarks = places
    .map(
      p => `  <Placemark>
    <name>${escapeXml(p.name)}</name>
    <Point><coordinates>${p.lng},${p.lat},0</coordinates></Point>
  </Placemark>`
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
${placemarks}
</Document>
</kml>`
}

/* ---- File download ---- */

export function download(filename: string, text: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/* ---- Parse lat,lng text ---- */

export function parseLatLng(text: string): LatLng | null {
  const m = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(text || '')
  if (!m) return null
  const lat = parseFloat(m[1])
  const lng = parseFloat(m[2])
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat, lng }
}
