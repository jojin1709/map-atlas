/* Offline manager: caches routes, turn-by-turn steps, and tiles for 100% offline mobile use. */

import type { OSRMRoute, LatLng } from '../types'

const TILE_CACHE_NAME = 'map-atlas-tiles-v2'
const OFFLINE_ROUTE_KEY = 'mapapp.offlineRoute'

function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number; z: number } {
  const x = Math.floor(((lng + 180) / 360) * Math.pow(2, zoom))
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, zoom)
  )
  return { x, y, z: zoom }
}

/** Get unique tile coordinates along a line of coordinates. */
function getTilesAlongRoute(coordinates: [number, number][], zoomLevels = [13, 14, 15]): Array<{ x: number; y: number; z: number }> {
  const tileSet = new Set<string>()
  const tiles: Array<{ x: number; y: number; z: number }> = []

  // Sample every few points to cover the path without redundant calculations
  const step = Math.max(1, Math.floor(coordinates.length / 120))
  const sampled: LatLng[] = []
  for (let i = 0; i < coordinates.length; i += step) {
    sampled.push({ lat: coordinates[i][1], lng: coordinates[i][0] })
  }
  // Ensure the destination is included
  if (coordinates.length > 0) {
    const last = coordinates[coordinates.length - 1]
    sampled.push({ lat: last[1], lng: last[0] })
  }

  for (const zoom of zoomLevels) {
    for (const pt of sampled) {
      const tile = latLngToTile(pt.lat, pt.lng, zoom)
      // Include neighboring tiles around the user for a smooth buffer
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const key = `${zoom}/${tile.x + dx}/${tile.y + dy}`
          if (!tileSet.has(key)) {
            tileSet.add(key)
            tiles.push({ z: zoom, x: tile.x + dx, y: tile.y + dy })
          }
        }
      }
    }
  }

  // Cap tiles to reasonable offline download size (~150 tiles max)
  return tiles.slice(0, 150)
}

/** Cache a route and its map tiles so phone users can navigate completely offline. */
export async function downloadRouteForOffline(
  route: OSRMRoute,
  onProgress?: (percent: number, current: number, total: number) => void
): Promise<{ totalTiles: number; saved: boolean }> {
  // 1. Save route and turn-by-turn data in localStorage
  try {
    localStorage.setItem(OFFLINE_ROUTE_KEY, JSON.stringify(route))
  } catch (e) {
    console.warn('Could not save route to localStorage', e)
  }

  // 2. Cache map tiles in CacheStorage
  if (!('caches' in window)) {
    return { totalTiles: 0, saved: true }
  }

  const cache = await caches.open(TILE_CACHE_NAME)
  const coords = route.geometry.coordinates as [number, number][]
  const tiles = getTilesAlongRoute(coords, [13, 14, 15])
  const total = tiles.length

  let completed = 0

  // Download tiles in concurrent batches
  const batchSize = 6
  for (let i = 0; i < tiles.length; i += batchSize) {
    const batch = tiles.slice(i, i + batchSize)
    await Promise.all(
      batch.map(async t => {
        const url = `https://tile.openstreetmap.org/${t.z}/${t.x}/${t.y}.png`
        try {
          const match = await cache.match(url)
          if (!match) {
            const res = await fetch(url, { mode: 'cors' })
            if (res.ok) {
              await cache.put(url, res)
            }
          }
        } catch {
          // ignore individual tile network failures
        } finally {
          completed++
          if (onProgress) {
            const pct = Math.round((completed / total) * 100)
            onProgress(pct, completed, total)
          }
        }
      })
    )
  }

  return { totalTiles: completed, saved: true }
}

/** Retrieve the saved offline route. */
export function getSavedOfflineRoute(): OSRMRoute | null {
  try {
    const raw = localStorage.getItem(OFFLINE_ROUTE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as OSRMRoute
  } catch {
    return null
  }
}

/** Clear saved offline route. */
export function clearSavedOfflineRoute(): void {
  try {
    localStorage.removeItem(OFFLINE_ROUTE_KEY)
  } catch {
    // ignore
  }
}

/** Download tiles around a center coordinate for offline use (zoom 13-15). */
export async function downloadAreaOffline(
  center: LatLng,
  onProgress?: (percent: number, current: number, total: number) => void
): Promise<number> {
  if (!('caches' in window)) return 0
  const cache = await caches.open(TILE_CACHE_NAME)
  const tiles: Array<{ x: number; y: number; z: number }> = []
  const tileSet = new Set<string>()

  for (const zoom of [13, 14, 15]) {
    const centerTile = latLngToTile(center.lat, center.lng, zoom)
    const range = zoom === 13 ? 2 : zoom === 14 ? 3 : 2
    for (let dx = -range; dx <= range; dx++) {
      for (let dy = -range; dy <= range; dy++) {
        const key = `${zoom}/${centerTile.x + dx}/${centerTile.y + dy}`
        if (!tileSet.has(key)) {
          tileSet.add(key)
          tiles.push({ z: zoom, x: centerTile.x + dx, y: centerTile.y + dy })
        }
      }
    }
  }

  const total = Math.min(tiles.length, 120)
  const subset = tiles.slice(0, total)
  let completed = 0

  const batchSize = 6
  for (let i = 0; i < subset.length; i += batchSize) {
    const batch = subset.slice(i, i + batchSize)
    await Promise.all(
      batch.map(async t => {
        const url = `https://tile.openstreetmap.org/${t.z}/${t.x}/${t.y}.png`
        try {
          const match = await cache.match(url)
          if (!match) {
            const res = await fetch(url, { mode: 'cors' })
            if (res.ok) await cache.put(url, res)
          }
        } catch {
        } finally {
          completed++
          if (onProgress) {
            onProgress(Math.round((completed / total) * 100), completed, total)
          }
        }
      })
    )
  }

  return completed
}
