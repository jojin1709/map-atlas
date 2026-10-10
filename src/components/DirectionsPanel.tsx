/* Directions panel: routing with waypoints, alternatives, turn-by-turn, elevation profile. */

import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import * as api from '../services/api'
import { CONFIG } from '../config'
import { formatDistance, formatDuration, parseLatLng } from '../services/geo'
import ElevationChart from './ElevationChart'
import type { LatLng } from '../types'
import { Navigation, ArrowUpDown, TrendingUp, Sparkles } from 'lucide-react'

export default function DirectionsPanel() {
  const [fromText, setFromText] = useState('')
  const [toText, setToText] = useState('')
  const [showElev, setShowElev] = useState(false)

  const from = useAppStore(s => s.from)
  const to = useAppStore(s => s.to)
  const waypoints = useAppStore(s => s.waypoints)
  const routes = useAppStore(s => s.routes)
  const routeIndex = useAppStore(s => s.routeIndex)
  const routingProfile = useAppStore(s => s.routingProfile)
  const dirStatus = useAppStore(s => s.dirStatus)

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

  const route = routes[routeIndex]

  return (
    <section>
      <h2>Directions</h2>
      <input
        value={from ? `${from.lat.toFixed(5)}, ${from.lng.toFixed(5)}` : fromText}
        onChange={e => {
          setFromText(e.target.value)
          useAppStore.getState().setFrom(null)
        }}
        placeholder="From: address, lat,lng, or click map"
      />
      <input
        value={to ? `${to.lat.toFixed(5)}, ${to.lng.toFixed(5)}` : toText}
        onChange={e => {
          setToText(e.target.value)
          useAppStore.getState().setTo(null)
        }}
        placeholder="To: address, lat,lng, or click map"
        className="mt-1"
      />

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
