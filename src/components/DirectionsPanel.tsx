import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import * as api from '../services/api'
import { CONFIG } from '../config'
import { formatDistance, formatDuration, parseLatLng } from '../services/geo'
import { downloadRouteForOffline, getSavedOfflineRoute } from '../services/offline'
import ElevationChart from './ElevationChart'
import type { LatLng, GeocodeResult } from '../types'
import { Navigation, ArrowUpDown, TrendingUp, Sparkles, MapPin, Compass, Download, Check, Loader2, Crosshair } from 'lucide-react'

export default function DirectionsPanel() {
  const [fromText, setFromText] = useState('')
  const [toText, setToText] = useState('')
  const [showElev, setShowElev] = useState(false)
  const [downloadingOffline, setDownloadingOffline] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [isOfflineSaved, setIsOfflineSaved] = useState(false)
  const [fromSuggestions, setFromSuggestions] = useState<GeocodeResult[]>([])
  const [toSuggestions, setToSuggestions] = useState<GeocodeResult[]>([])
  const [showFromSug, setShowFromSug] = useState(false)
  const [showToSug, setShowToSug] = useState(false)
  const fromDebounce = useRef<ReturnType<typeof setTimeout>>()
  const toDebounce = useRef<ReturnType<typeof setTimeout>>()
  const fromContainerRef = useRef<HTMLDivElement>(null)
  const toContainerRef = useRef<HTMLDivElement>(null)

  const from = useAppStore(s => s.from)
  const to = useAppStore(s => s.to)
  const waypoints = useAppStore(s => s.waypoints)
  const routes = useAppStore(s => s.routes)
  const routeIndex = useAppStore(s => s.routeIndex)
  const routingProfile = useAppStore(s => s.routingProfile)
  const dirStatus = useAppStore(s => s.dirStatus)

  // Live autocomplete for "From"
  useEffect(() => {
    clearTimeout(fromDebounce.current)
    const q = fromText.trim()
    if (q.length < 2 || from) {
      setFromSuggestions([])
      setShowFromSug(false)
      return
    }
    fromDebounce.current = setTimeout(async () => {
      try {
        const items = await api.geocode(q)
        setFromSuggestions(items)
        setShowFromSug(items.length > 0)
      } catch {
        setFromSuggestions([])
      }
    }, 300)
    return () => clearTimeout(fromDebounce.current)
  }, [fromText, from])

  // Live autocomplete for "To"
  useEffect(() => {
    clearTimeout(toDebounce.current)
    const q = toText.trim()
    if (q.length < 2 || to) {
      setToSuggestions([])
      setShowToSug(false)
      return
    }
    toDebounce.current = setTimeout(async () => {
      try {
        const items = await api.geocode(q)
        setToSuggestions(items)
        setShowToSug(items.length > 0)
      } catch {
        setToSuggestions([])
      }
    }, 300)
    return () => clearTimeout(toDebounce.current)
  }, [toText, to])

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!fromContainerRef.current?.contains(e.target as Node)) setShowFromSug(false)
      if (!toContainerRef.current?.contains(e.target as Node)) setShowToSug(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const resolvePoint = async (text: string, point: LatLng | null) => {
    if (point) return point
    const coords = parseLatLng(text)
    if (coords) return coords
    if (!text.trim()) throw new Error('Enter a start and destination')
    const items = await api.geocode(text)
    if (!items.length) throw new Error(`Not found: ${text}`)
    return items[0]
  }

  const getRoute = async () => {
    setShowFromSug(false)
    setShowToSug(false)
    const store = useAppStore.getState()
    store.setDirStatus('Routing…')
    try {
      const a = await resolvePoint(fromText, store.from)
      const b = await resolvePoint(toText, store.to)
      const start = store.from || { lat: a.lat, lng: a.lng }
      const end = store.to || { lat: b.lat, lng: b.lng }
      store.setFrom(start)
      store.setTo(end)

      const points = [start, ...store.waypoints, end]
      const result = await api.route(store.routingProfile, points)
      store.setRoutes(result)
      store.setDirStatus(
        `Shortest: ${formatDistance(result[0].distance)}, ${formatDuration(result[0].duration)}`
      )
    } catch (err) {
      store.setDirStatus(err instanceof Error ? err.message : 'Routing failed')
    }
  }

  const swap = () => {
    const store = useAppStore.getState()
    const f = store.from
    const t = store.to
    store.setFrom(t)
    store.setTo(f)
    setFromText(toText)
    setToText(fromText)
  }

  const optimizeWaypoints = () => {
    if (waypoints.length < 2) return
    const store = useAppStore.getState()
    const start = store.from || waypoints[0]
    const remaining = [...waypoints]
    const ordered: LatLng[] = []
    let current = start

    while (remaining.length > 0) {
      let bestIdx = 0
      let bestDist = Infinity
      for (let i = 0; i < remaining.length; i++) {
        const d = Math.hypot(remaining[i].lat - current.lat, remaining[i].lng - current.lng)
        if (d < bestDist) {
          bestDist = d
          bestIdx = i
        }
      }
      current = remaining[bestIdx]
      ordered.push(remaining.splice(bestIdx, 1)[0])
    }

    useAppStore.getState().setWaypoints(ordered)
    useAppStore.getState().showToast('Waypoints optimized for shortest distance')
    getRoute()
  }

  // Check on mount if an offline route was saved
  useEffect(() => {
    const saved = getSavedOfflineRoute()
    if (saved) {
      setIsOfflineSaved(true)
    }
  }, [])

  const handleStartNav = () => {
    const store = useAppStore.getState()
    store.setNavActive(true)
    store.closePanel()
    store.showToast('Starting GPS turn-by-turn navigation')
  }

  const handleDownloadOffline = async () => {
    if (!route) return
    setDownloadingOffline(true)
    setDownloadProgress(0)
    useAppStore.getState().showToast('Downloading route and map tiles for offline use…')
    try {
      const res = await downloadRouteForOffline(route, pct => {
        setDownloadProgress(pct)
      })
      setIsOfflineSaved(true)
      useAppStore.getState().showToast(`Saved for offline! (${res.totalTiles} map tiles cached)`)
    } catch {
      useAppStore.getState().showToast('Failed to download offline tiles')
    } finally {
      setDownloadingOffline(false)
    }
  }

  const route = routes[routeIndex]

  return (
    <section>
      <h2>Directions</h2>

      {/* From Input with Autocomplete & My Location button */}
      <div ref={fromContainerRef} className="relative">
        <input
          value={from ? `${from.lat.toFixed(5)}, ${from.lng.toFixed(5)}` : fromText}
          onChange={e => {
            setFromText(e.target.value)
            useAppStore.getState().setFrom(null)
          }}
          onFocus={() => {
            if (fromSuggestions.length > 0) setShowFromSug(true)
          }}
          placeholder="From: address, lat,lng, or my location"
          className="pr-8"
        />
        <button
          type="button"
          onClick={async () => {
            let loc = useAppStore.getState().userLocation
            if (!loc) {
              try {
                loc = await api.locateUser()
                useAppStore.getState().setUserLocation(loc)
              } catch {
                useAppStore.getState().showToast('Could not fetch GPS location')
                return
              }
            }
            useAppStore.getState().setFrom(loc)
            setFromText('My Current Location')
            useAppStore.getState().showToast('Start point set to your location')
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-blue-500 rounded transition"
          title="Use my current GPS location as starting point"
        >
          <Crosshair className="w-3.5 h-3.5" />
        </button>
        {showFromSug && fromSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700 rounded-b-lg shadow-xl max-h-48 overflow-y-auto mt-0.5">
            {fromSuggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-zinc-750 border-b border-gray-100 dark:border-zinc-800 last:border-0 truncate flex items-center gap-1.5"
                onClick={() => {
                  setFromText(s.label)
                  useAppStore.getState().setFrom({ lat: s.lat, lng: s.lng })
                  setShowFromSug(false)
                }}
              >
                <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                <span className="truncate">{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* To Input with Autocomplete */}
      <div ref={toContainerRef} className="relative mt-1">
        <input
          value={to ? `${to.lat.toFixed(5)}, ${to.lng.toFixed(5)}` : toText}
          onChange={e => {
            setToText(e.target.value)
            useAppStore.getState().setTo(null)
          }}
          onFocus={() => {
            if (toSuggestions.length > 0) setShowToSug(true)
          }}
          placeholder="To: address, lat,lng, or click map"
        />
        {showToSug && toSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700 rounded-b-lg shadow-xl max-h-48 overflow-y-auto mt-0.5">
            {toSuggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-zinc-750 border-b border-gray-100 dark:border-zinc-800 last:border-0 truncate flex items-center gap-1.5"
                onClick={() => {
                  setToText(s.label)
                  useAppStore.getState().setTo({ lat: s.lat, lng: s.lng })
                  setShowToSug(false)
                }}
              >
                <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                <span className="truncate">{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {waypoints.length > 0 && (
        <div className="mt-1 space-y-1">
          {waypoints.map((wp, i) => (
            <div key={i} className="flex items-center gap-1 text-xs bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-1">
              <span className="flex-1">Via {i + 1}: {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}</span>
              <button
                className="ghost small"
                onClick={() => useAppStore.getState().removeWaypoint(i)}
              >
                ✕
              </button>
            </div>
          ))}
          {waypoints.length >= 2 && (
            <button
              onClick={optimizeWaypoints}
              className="ghost small w-full flex items-center justify-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 mt-1"
              title="Optimize order of stops"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Optimize stops order</span>
            </button>
          )}
        </div>
      )}

      <div className="flex gap-1.5 mt-2">
        <select
          value={routingProfile}
          onChange={e => useAppStore.getState().setRoutingProfile(e.target.value)}
          className="flex-1"
        >
          {Object.entries(CONFIG.profiles).map(([k, p]) => (
            <option key={k} value={k}>{p.label}</option>
          ))}
        </select>
        <button onClick={getRoute} className="flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5" />
          <span>Route</span>
        </button>
        <button onClick={swap} className="ghost flex items-center gap-1.5" title="Swap start and destination">
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span>Swap</span>
        </button>
      </div>

      {dirStatus && <div className="muted mt-1 text-xs">{dirStatus}</div>}

      {routes.length > 1 && (
        <div className="list mt-2">
          {routes.map((r, i) => (
            <div
              key={i}
              className={`item ${i === routeIndex ? 'active' : ''}`}
              onClick={() => useAppStore.getState().setRouteIndex(i)}
            >
              Route {i + 1}: {formatDistance(r.distance)}, {formatDuration(r.duration)}
            </div>
          ))}
        </div>
      )}

      {route && (
        <>
          {/* Prominent Navigation and Offline Download Buttons */}
          <div className="mt-3 flex flex-col gap-2">
            <button
              onClick={handleStartNav}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 active:scale-98"
            >
              <Compass className="w-4 h-4" />
              <span>Start Navigation</span>
            </button>

            <button
              onClick={handleDownloadOffline}
              disabled={downloadingOffline}
              className={`w-full py-2 px-3 text-xs font-semibold rounded-xl border transition flex items-center justify-center gap-1.5 ${
                isOfflineSaved
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 border-gray-200 dark:border-zinc-700 text-gray-800 dark:text-gray-200'
              }`}
            >
              {downloadingOffline ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                  <span>Caching offline map… {downloadProgress}%</span>
                </>
              ) : isOfflineSaved ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Route Saved Offline (Ready)</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-blue-500" />
                  <span>Save Route & Map for Offline Use</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-2 flex gap-1.5">
            <button onClick={() => setShowElev(!showElev)} className="ghost small flex-1 flex items-center justify-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
              <span>{showElev ? 'Hide' : 'Show'} elevation</span>
            </button>
          </div>
          {showElev && <ElevationChart route={route} />}

          <ol className="steps mt-2">
            {route.legs.flatMap(leg =>
              leg.steps
                .filter(s => !(s.maneuver.type === 'depart' && s.distance === 0))
                .map((s, i) => (
                  <li key={i}>
                    {api.describeStep(s)}
                    {s.distance > 0 && ` (${formatDistance(s.distance)})`}
                  </li>
                ))
            )}
          </ol>
        </>
      )}
    </section>
  )
}
