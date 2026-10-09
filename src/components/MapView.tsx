/* MapView: creates the MapEngine, wires map events to store, renders overlay layers. */

import { useEffect, useRef, useCallback } from 'react'
import { MapEngine } from '../engine/MapEngine'
import { CONFIG } from '../config'
import { useAppStore } from '../store/useAppStore'
import * as api from '../services/api'
import { haversine, formatDistance, polygonArea, formatArea, coordsDMS, toDecimal } from '../services/geo'
import type { LatLng, LayerHandleLike } from '../types'

type LayerList = LayerHandleLike[]

function replaceLayers(engine: MapEngine, key: string, layers: LayerHandleLike[]): void {
  const old = (engine as unknown as Record<string, LayerList | undefined>)[key]
  if (old) old.forEach(l => l.remove())
  ;(engine as unknown as Record<string, LayerList>)[key] = layers
}

/** Parse embed/URL params for shareable map views. */
function parseUrlParams(): {
  center?: [number, number]
  zoom?: number
  style?: string
  embed?: boolean
  markers?: Array<{ lat: number; lng: number; label?: string }>
} {
  const params = new URLSearchParams(location.search)
  const hash = /^#(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(\d+(?:\.\d+)?)$/.exec(location.hash)

  let center: [number, number] | undefined
  let zoom: number | undefined

  // Query params take priority over hash
  const lat = parseFloat(params.get('lat') || '')
  const lng = parseFloat(params.get('lng') || '')
  const z = parseFloat(params.get('zoom') || '')
  if (!isNaN(lat) && !isNaN(lng)) center = [lat, lng]
  if (!isNaN(z)) zoom = z

  if (!center && hash) center = [parseFloat(hash[1]), parseFloat(hash[2])]
  if (!zoom && hash) zoom = parseFloat(hash[3])

  const style = params.get('style') || undefined
  const embed = params.get('embed') === 'true'

  const markers: Array<{ lat: number; lng: number; label?: string }> = []
  const markerParam = params.get('marker')
  if (markerParam) {
    for (const m of markerParam.split('|')) {
      const [mlat, mlng, ...labelParts] = m.split(',')
      const mLat = parseFloat(mlat)
      const mLng = parseFloat(mlng)
      if (!isNaN(mLat) && !isNaN(mLng)) {
        markers.push({ lat: mLat, lng: mLng, label: labelParts.join(',') || undefined })
      }
    }
  }

  return { center, zoom, style, embed, markers }
}

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<MapEngine | null>(null)
  const drawPtsRef = useRef<LatLng[]>([])

  const style = useAppStore(s => s.style)
  const measureMode = useAppStore(s => s.measureMode)
  const measurePts = useAppStore(s => s.measurePts)
  const from = useAppStore(s => s.from)
  const to = useAppStore(s => s.to)
  const waypoints = useAppStore(s => s.waypoints)
  const routes = useAppStore(s => s.routes)
  const routeIndex = useAppStore(s => s.routeIndex)
  const drawnShapes = useAppStore(s => s.drawnShapes)
  const userLocation = useAppStore(s => s.userLocation)
  const searchResults = useAppStore(s => s.searchResults)
  const track = useAppStore(s => s.track)
  const drawTool = useAppStore(s => s.drawTool)
  const layers = useAppStore(s => s.layers)
  const places = useAppStore(s => s.places)

  /* ---- create engine ---- */
  useEffect(() => {
    if (!containerRef.current) return
    const params = parseUrlParams()

    const center = params.center || CONFIG.center
    const zoom = params.zoom || CONFIG.zoom

    // Apply URL style if provided
    if (params.style && CONFIG.styles[params.style]) {
      useAppStore.getState().setStyle(params.style)
    }

    const activeStyle = params.style && CONFIG.styles[params.style]
      ? CONFIG.styles[params.style]
      : CONFIG.styles[CONFIG.defaultStyle]

    const engine = new MapEngine(containerRef.current, {
      center,
      zoom,
      minZoom: CONFIG.minZoom,
      maxZoom: CONFIG.maxZoom,
      tileUrls: activeStyle.tiles,
      attribution: activeStyle.attribution,
      cssFilter: activeStyle.cssFilter,
      keyboard: true,
      inertia: true,
      scaleBar: true,
    })
    engineRef.current = engine

    window.__mapEngine = () => engineRef.current

    // Add markers from URL params
    if (params.markers?.length) {
      for (const m of params.markers) {
        engine.addMarker(m, { label: m.label, color: '#ef4444', size: 12 })
      }
    }

    engine.on('moveend', () => {
      const c = engine.getCenter()
      try {
        history.replaceState(null, '', `#${c.lat.toFixed(5)},${c.lng.toFixed(5)},${engine.getZoom().toFixed(2)}`)
      } catch {
        /* sandboxed */
      }
    })

    engine.on('click', (data: unknown) => {
      const ll = (data as { latlng: LatLng }).latlng
      const store = useAppStore.getState()
      if (store.measureMode) {
        store.addMeasurePoint(ll)
        return
      }
      if (store.drawTool !== 'none') {
        drawPtsRef.current.push(ll)
        return
      }
      openPointPopup(ll)
    })

    engine.on('mousemove', (data: unknown) => {
      const ll = (data as { latlng: LatLng }).latlng
      const el = document.getElementById('coords-display')
      if (el) el.textContent = `${toDecimal(ll.lat, ll.lng)}  ·  ${coordsDMS(ll.lat, ll.lng)}`
    })

    engine.on('contextmenu', (data: unknown) => {
      const { latlng, x, y } = data as { latlng: LatLng; x: number; y: number }
      useAppStore.getState().showContextMenu(x, y, latlng)
    })

    // Coordinate picker mode
    engine.on('click', (data: unknown) => {
      const store = useAppStore.getState()
      if (!store.coordPickerMode) return
      const ll = (data as { latlng: LatLng }).latlng
      navigator.clipboard?.writeText(`${ll.lat.toFixed(6)}, ${ll.lng.toFixed(6)}`)
      store.showToast(`Copied: ${ll.lat.toFixed(6)}, ${ll.lng.toFixed(6)}`)
      store.setCoordPickerMode(false)
    })

    return () => {
      engine.destroy()
      engineRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---- style change ---- */
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    const s = CONFIG.styles[style]
    if (s) engine.setTiles(s.tiles, s.attribution, s.cssFilter)
  }, [style])

  /* ---- open popup ---- */
  const openPointPopup = useCallback((p: LatLng, title?: string) => {
    const engine = engineRef.current
    if (!engine) return
    const box = document.createElement('div')
    box.className = 'popup'

    const heading = document.createElement('strong')
    heading.textContent = title || coordsDMS(p.lat, p.lng)

    const sub = document.createElement('div')
    sub.className = 'muted'
    sub.textContent = title ? toDecimal(p.lat, p.lng) : 'Looking up address…'

    const elev = document.createElement('div')
    elev.className = 'muted'

    const actions = document.createElement('div')
    actions.className = 'popup-actions'

    const mkBtn = (label: string, fn: () => void) => {
      const b = document.createElement('button')
      b.textContent = label
      b.onclick = fn
      return b
    }

    actions.append(
      mkBtn('Start here', () => {
        useAppStore.getState().setFrom(p)
        useAppStore.getState().showToast('Start set')
        engine.closePopup()
      }),
      mkBtn('Destination', () => {
        useAppStore.getState().setTo(p)
        useAppStore.getState().showToast('Destination set')
        engine.closePopup()
      }),
      mkBtn('Save place', () => {
        const name = window.prompt('Name for this place', title || toDecimal(p.lat, p.lng))
        if (name) {
          useAppStore.getState().addPlace({ id: Date.now(), name, lat: p.lat, lng: p.lng })
          useAppStore.getState().showToast(`Saved "${name}"`)
        }
        engine.closePopup()
      }),
      mkBtn('Elevation', () => {
        elev.textContent = 'Fetching elevation…'
        api.elevation(p.lat, p.lng)
          .then(e => { elev.textContent = `Elevation: ${Math.round(e)} m` })
          .catch(err => { elev.textContent = err.message })
      })
    )

    box.append(heading, sub, actions, elev)

    if (!title) {
      api.reverse(p.lat, p.lng)
        .then(addr => { sub.textContent = addr })
        .catch(() => { sub.textContent = 'Address unavailable' })
    }

    engine.openPopup(p, box)
  }, [])

  /* ---- expose openPointPopup globally for panels ---- */
  useEffect(() => {
    window.__mapOpenPopup = openPointPopup
  }, [openPointPopup])

  /* ---- draw routes ---- */
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    if (!layers.routes) { replaceLayers(engine, '__routeLayers', []); return }
    const lls: LayerHandleLike[] = []
    routes.forEach((r, i) => {
      const coords = r.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }))
      const sel = i === routeIndex
      lls.push(
        engine.addPolyline(coords, {
          color: sel ? '#3b82f6' : '#9ca3af',
          weight: sel ? 6 : 4,
          opacity: 0.9,
        })
      )
    })
    replaceLayers(engine, '__routeLayers', lls)
  }, [routes, routeIndex, layers.routes])

  /* ---- draw from/to/waypoint pins ---- */
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    if (!layers.pins) { replaceLayers(engine, '__pinLayers', []); return }
    const lls: LayerHandleLike[] = []
    if (from) lls.push(engine.addMarker(from, { color: '#22c55e', size: 10 }))
    if (to) lls.push(engine.addMarker(to, { color: '#ef4444', size: 10 }))
    waypoints.forEach((wp, i) => {
      lls.push(engine.addMarker(wp, { color: '#f59e0b', size: 8, label: String(i + 1) }))
    })
    replaceLayers(engine, '__pinLayers', lls)
  }, [from, to, waypoints, layers.pins])

  /* ---- draw measure ---- */
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    if (!layers.measure) { replaceLayers(engine, '__measureLayers', []); return }
    const lls: LayerHandleLike[] = []
    if (measurePts.length > 1) {
      lls.push(engine.addPolyline(measurePts, { color: '#f97316', weight: 3, dash: '6 6' }))
    }
    measurePts.forEach(p => lls.push(engine.addCircle(p, { radius: 5, fill: '#f97316' })))
    replaceLayers(engine, '__measureLayers', lls)
  }, [measurePts, layers.measure])

  /* ---- draw shapes ---- */
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    if (!layers.shapes) { replaceLayers(engine, '__shapeLayers', []); return }
    const lls: LayerHandleLike[] = []
    drawnShapes.forEach(shape => {
      if (shape.type === 'polygon') {
        lls.push(
          engine.addPolygon(shape.points, { color: '#8b5cf6', weight: 2, fill: 'rgba(139,92,246,0.15)' })
        )
      } else {
        lls.push(engine.addPolyline(shape.points, { color: '#8b5cf6', weight: 3 }))
      }
      shape.points.forEach(p => lls.push(engine.addCircle(p, { radius: 4, fill: '#8b5cf6' })))
    })
    replaceLayers(engine, '__shapeLayers', lls)
  }, [drawnShapes, layers.shapes])

  /* ---- user location ---- */
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    if (userLocation && layers.userLocation) {
      const l = engine.addCircle(userLocation, { radius: 10, fill: '#3b82f6', stroke: '#fff', strokeWidth: 3 })
      replaceLayers(engine, '__userLayer', [l])
    } else {
      replaceLayers(engine, '__userLayer', [])
    }
  }, [userLocation, layers.userLocation])

  /* ---- search results ---- */
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    if (!layers.searchResults) { replaceLayers(engine, '__searchLayers', []); return }
    const lls: LayerHandleLike[] = []
    searchResults.forEach(r => {
      lls.push(engine.addMarker(r, { color: '#ef4444', size: 8 }))
    })
    replaceLayers(engine, '__searchLayers', lls)
  }, [searchResults, layers.searchResults])

  /* ---- saved places markers ---- */
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    if (!layers.places) { replaceLayers(engine, '__placesLayers', []); return }
    const lls: LayerHandleLike[] = []
    places.forEach(p => {
      lls.push(engine.addMarker(p, { color: '#eab308', size: 10, icon: '⭐' }))
    })
    replaceLayers(engine, '__placesLayers', lls)
  }, [places, layers.places])

  /* ---- track ---- */
  useEffect(() => {
    const engine = engineRef.current
    if (!engine || track.length < 2) return
    if (!layers.track) { replaceLayers(engine, '__trackLayer', []); return }
    const l = engine.addPolyline(track.map(t => ({ lat: t.lat, lng: t.lng })), {
      color: '#10b981',
      weight: 3,
      dash: '4 4',
    })
    replaceLayers(engine, '__trackLayer', [l])
  }, [track, layers.track])

  /* ---- fit to routes ---- */
  useEffect(() => {
    const engine = engineRef.current
    if (!engine || !routes.length) return
    const lls = routes[0].geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }))
    engine.fitBounds(lls, { padding: 60 })
  }, [routes])

  /* ---- fit to search results ---- */
  useEffect(() => {
    const engine = engineRef.current
    if (!engine || searchResults.length < 2) return
    engine.fitBounds(searchResults, { padding: 60, maxZoom: 15 })
  }, [searchResults])

  /* ---- geolocation watch ---- */
  useEffect(() => {
    if (!navigator.geolocation) return
    const watch = navigator.geolocation.watchPosition(
      pos => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        useAppStore.getState().setUserLocation(p)
        if (useAppStore.getState().recording) {
          useAppStore.getState().addTrackPoint({
            lat: p.lat,
            lng: p.lng,
            time: Date.now(),
            accuracy: pos.coords.accuracy,
          })
        }
      },
      () => {
        /* denied */
      },
      { enableHighAccuracy: true, maximumAge: 10000 }
    )
    return () => navigator.geolocation.clearWatch(watch)
  }, [])

  /* ---- finalise drawing on double click ---- */
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    const handler = () => {
      const store = useAppStore.getState()
      if (store.drawTool === 'none') return
      const pts = drawPtsRef.current
      if (pts.length < 2) return

      const id = Date.now()
      if (store.drawTool === 'rectangle' && pts.length >= 2) {
        const a = pts[0]
        const b = pts[pts.length - 1]
        const rect = [
          { lat: a.lat, lng: a.lng },
          { lat: a.lat, lng: b.lng },
          { lat: b.lat, lng: b.lng },
          { lat: b.lat, lng: a.lng },
        ]
        store.addShape({ id, type: 'rectangle', points: rect })
      } else if (store.drawTool === 'polygon') {
        store.addShape({ id, type: 'polygon', points: [...pts] })
      } else {
        store.addShape({ id, type: 'line', points: [...pts] })
      }
      drawPtsRef.current = []
      store.setDrawTool('none')
    }
    engine.on('dblclick', handler)
    return () => { engine.off('dblclick', handler) }
  }, [])

  /* ---- cursor ---- */
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.style.cursor = measureMode || drawTool !== 'none' ? 'crosshair' : ''
  }, [measureMode, drawTool])

  /* ---- measure display ---- */
  const measureInfo = (() => {
    if (!measurePts.length) return ''
    let total = 0
    for (let i = 1; i < measurePts.length; i++) total += haversine(measurePts[i - 1], measurePts[i])
    let areaStr = ''
    if (measurePts.length >= 3) {
      const area = polygonArea(measurePts)
      areaStr = ` · Area: ${formatArea(area)}`
    }
    return `Total: ${formatDistance(total)}${areaStr} (${measurePts.length} points)`
  })()

  return (
    <div className="relative flex-1 h-full">
      <div ref={containerRef} className="w-full h-full" />
      {measureMode && measureInfo && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-lg px-4 py-2 text-sm font-medium border border-gray-200 dark:border-gray-700 z-10">
          {measureInfo}
        </div>
      )}
    </div>
  )
}
