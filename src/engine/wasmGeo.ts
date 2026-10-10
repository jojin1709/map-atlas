/**
 * WebAssembly (WASM) & Rust Geospatial Acceleration Interface.
 *
 * Provides high-speed geometric computing (Haversine, Douglas-Peucker simplification,
 * Point-in-Polygon, and Geodesic Area) with seamless in-browser execution.
 */

import type { LatLng } from '../types'

export interface WasmGeoExports {
  haversine_distance: (lat1: number, lon1: number, lat2: number, lon2: number) => number
  point_in_polygon: (px: number, py: number, poly_x: Float64Array, poly_y: Float64Array) => boolean
  polygon_area: (coords_flat: Float64Array) => number
  douglas_peucker: (coords_flat: Float64Array, tolerance_meters: number) => Float64Array
}

const EARTH_RADIUS = 6371000 // meters

/**
 * High-speed native TypeScript / JS implementation matching the Rust WASM algorithms.
 */
export const WasmGeo = {
  /**
   * Fast Haversine great-circle distance (meters)
   */
  distance(p1: LatLng, p2: LatLng): number {
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180
    const dLon = ((p2.lng - p1.lng) * Math.PI) / 180
    const rLat1 = (p1.lat * Math.PI) / 180
    const rLat2 = (p2.lat * Math.PI) / 180

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return EARTH_RADIUS * c
  },

  /**
   * Ray-casting point-in-polygon test
   */
  containsPoint(point: LatLng, polygon: LatLng[]): boolean {
    let inside = false
    const n = polygon.length
    if (n < 3) return false

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i].lng
      const yi = polygon[i].lat
      const xj = polygon[j].lng
      const yj = polygon[j].lat

      const intersect =
        yi > point.lat !== yj > point.lat &&
        point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi
      if (intersect) inside = !inside
    }
    return inside
  },

  /**
   * Geodesic polygon area on spherical Earth (sq meters)
   */
  area(polygon: LatLng[]): number {
    const n = polygon.length
    if (n < 3) return 0

    let total = 0
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      const lat1 = (polygon[i].lat * Math.PI) / 180
      const lon1 = (polygon[i].lng * Math.PI) / 180
      const lat2 = (polygon[j].lat * Math.PI) / 180
      const lon2 = (polygon[j].lng * Math.PI) / 180

      total += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2))
    }
    return Math.abs((total * EARTH_RADIUS * EARTH_RADIUS) / 4)
  },

  /**
   * Douglas-Peucker polyline simplification algorithm
   */
  simplify(points: LatLng[], toleranceMeters = 5): LatLng[] {
    if (points.length <= 2) return points

    const keep = new Uint8Array(points.length)
    keep[0] = 1
    keep[points.length - 1] = 1

    function simplifySection(start: number, end: number) {
      if (end <= start + 1) return
      let maxDist = 0
      let maxIdx = start

      const pStart = points[start]
      const pEnd = points[end]
      const lineDist = WasmGeo.distance(pStart, pEnd)

      for (let i = start + 1; i < end; i++) {
        const p = points[i]
        let dist = 0
        if (lineDist < 1e-4) {
          dist = WasmGeo.distance(p, pStart)
        } else {
          const d1 = WasmGeo.distance(pStart, p)
          const d2 = WasmGeo.distance(pEnd, p)
          const s = (lineDist + d1 + d2) / 2
          const areaSq = s * (s - lineDist) * (s - d1) * (s - d2)
          dist = areaSq <= 0 ? 0 : (2 * Math.sqrt(areaSq)) / lineDist
        }

        if (dist > maxDist) {
          maxDist = dist
          maxIdx = i
        }
      }

      if (maxDist > toleranceMeters) {
        keep[maxIdx] = 1
        simplifySection(start, maxIdx)
        simplifySection(maxIdx, end)
      }
    }

    simplifySection(0, points.length - 1)
    return points.filter((_, i) => keep[i] === 1)
  },
}
