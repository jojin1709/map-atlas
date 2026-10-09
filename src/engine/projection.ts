/* Web Mercator (EPSG:3857) projection — the same projection OpenStreetMap uses. */

export const TILE_SIZE = 256

export function scaleAt(zoom: number): number {
  return TILE_SIZE * Math.pow(2, zoom)
}

/** lat/lng (degrees) → world pixel coordinates at zoom z. */
export function project(lat: number, lng: number, z: number): { x: number; y: number } {
  const s = scaleAt(z)
  const sin = Math.max(-0.9999, Math.min(0.9999, Math.sin((lat * Math.PI) / 180)))
  return {
    x: ((lng + 180) / 360) * s,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s,
  }
}

/** World pixel coordinates at zoom z → lat/lng (degrees). */
export function unproject(x: number, y: number, z: number): { lat: number; lng: number } {
  const s = scaleAt(z)
  const n = Math.PI - (2 * Math.PI * y) / s
  return {
    lat: (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))),
    lng: (x / s) * 360 - 180,
  }
}

/** Great-circle distance in metres. */
export function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
