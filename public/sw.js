/* Service Worker for Map Atlas PWA — caches tiles and app shell. */

const CACHE_NAME = 'map-atlas-v1'
const TILE_CACHE = 'map-atlas-tiles-v1'

// App shell files to cache
const APP_SHELL = [
  '/',
  '/index.html',
]

// Install: cache app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  )
})

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== TILE_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

// Fetch: strategy depends on request type
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // Tile requests: cache-first with network fallback
  if (isTileRequest(url)) {
    event.respondWith(
      caches.open(TILE_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached
          return fetch(event.request).then(response => {
            if (response.ok) {
              cache.put(event.request, response.clone())
            }
            return response
          }).catch(() => cached || new Response('', { status: 404 }))
        })
      )
    )
    return
  }

  // App shell: network-first with cache fallback
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
          }
          return response
        })
        .catch(() =>
          caches.match(event.request).then(cached =>
            cached || caches.match('/index.html')
          )
        )
    )
    return
  }

  // External APIs: network only (don't cache API calls)
  if (isApiRequest(url)) return

  // Other: cache-first
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request)
    )
  )
})

function isTileRequest(url: URL): boolean {
  const host = url.hostname
  return (
    host.includes('tile.openstreetmap.org') ||
    host.includes('arcgisonline.com') ||
    host.includes('opentopomap.org') ||
    host.includes('tile-cyclosm.openstreetmap.fr') ||
    host.includes('tile.openstreetmap.fr') ||
    host.includes('cartocdn.com') ||
    host.includes('basemaps.') ||
    host.includes('.tile.')
  )
}

function isApiRequest(url: URL): boolean {
  const host = url.hostname
  return (
    host.includes('nominatim') ||
    host.includes('overpass-api') ||
    host.includes('router.project-osrm') ||
    host.includes('valhalla') ||
    host.includes('open-meteo') ||
    host.includes('opentopodata')
  )
}
