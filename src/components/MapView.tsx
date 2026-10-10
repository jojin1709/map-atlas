/* MapView: creates the MapEngine, wires map events to store, renders overlay layers. */

import { useEffect, useRef, useCallback } from 'react'
import { MapEngine } from '../engine/MapEngine'
import { GlobeEngine } from '../engine/GlobeEngine'
import { CONFIG } from '../config'
import { useAppStore } from '../store/useAppStore'
import * as api from '../services/api'
import { haversine, formatDistance, polygonArea, formatArea, coordsDMS, toDecimal } from '../services/geo'
import type { LatLng, LayerHandleLike } from '../types'
import { Map as MapIcon, Globe as GlobeIcon, RotateCw, Tag, Camera, Compass, Car, CloudDownload, CloudRain, BookOpen } from 'lucide-react'

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
  const globeContainerRef = useRef<HTMLDivElement>(null)
  const globeEngineRef = useRef<GlobeEngine | null>(null)
  const drawPtsRef = useRef<LatLng[]>([])

  const style = useAppStore(s => s.style)
  const globeMode = useAppStore(s => s.globeMode)
  const setGlobeMode = useAppStore(s => s.setGlobeMode)
  const measureMode = useAppStore(s => s.measureMode)
  const measurePts = useAppStore(s => s.measurePts)
  const from = useAppStore(s => s.from)
  const to = useAppStore(s => s.to)
  const waypoints = useAppStore(s => s.waypoints)
  const routes = useAppStore(s => s.routes)
  const routeIndex = useAppStore(s => s.routeIndex)
  const navActive = useAppStore(s => s.navActive)
  const drawnShapes = useAppStore(s => s.drawnShapes)
  const userLocation = useAppStore(s => s.userLocation)
  const searchResults = useAppStore(s => s.searchResults)
  const track = useAppStore(s => s.track)
  const drawTool = useAppStore(s => s.drawTool)
  const layers = useAppStore(s => s.layers)
  const places = useAppStore(s => s.places)
  const earthquakeData = useAppStore(s => s.earthquakeData)
  const compassActive = useAppStore(s => s.compassActive)
  const compassHeading = useAppStore(s => s.compassHeading)
  const setCompassHeading = useAppStore(s => s.setCompassHeading)
  const toggleCompass = useAppStore(s => s.toggleCompass)
  const toggleLayer = useAppStore(s => s.toggleLayer)
  const setOfflineManagerOpen = useAppStore(s => s.setOfflineManagerOpen)
  const radarInfo = useAppStore(s => s.radarInfo)

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

    // Zoom out at min-zoom switches to 3D Globe
    engine.on('zoomlimit-min', () => {
      const store = useAppStore.getState()
      if (!store.globeMode) {
        store.setGlobeMode(true)
        store.showToast('Zoomed out to 3D Globe view')
      }
    })

    return () => {
      engine.destroy()
      engineRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---- style & weather radar overlay change ---- */
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    const s = CONFIG.styles[style]
    if (!s) return

    let tiles = [...s.tiles]
    if (layers.radar && radarInfo) {
      const radarUrl = `${radarInfo.host}${radarInfo.path}/256/{z}/{x}/{y}/2/1_1.png`
      tiles = [s.tiles[0], radarUrl]
    }
    engine.setTiles(tiles, s.attribution, s.cssFilter)
  }, [style, layers.radar, radarInfo])

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
      }),
      mkBtn('Explore 📖', () => {
        useAppStore.getState().showToast('Exploring place…')
        const query = title || sub.textContent || ''
        const doNearby = () => {
          api.fetchNearbyWikipedia(p.lat, p.lng).then(nearby => {
            if (nearby) {
              useAppStore.getState().setSelectedPlace({ ...nearby, lat: p.lat, lng: p.lng })
            } else {
              useAppStore.getState().showToast('No articles found nearby')
            }
          }).catch(() => useAppStore.getState().showToast('Explore info unavailable'))
        }

        if (query && !query.includes('Loading') && !query.includes('unavailable')) {
          api.fetchWikipediaSummary(query).then(info => {
            if (info) {
              useAppStore.getState().setSelectedPlace({ ...info, lat: p.lat, lng: p.lng })
            } else {
              doNearby()
            }
          }).catch(() => doNearby())
        } else {
          doNearby()
        }
        engine.closePopup()
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

  /* ---- globe mode lifecycle & sync ---- */
  useEffect(() => {
    if (!globeMode) return
    if (!globeContainerRef.current) return

    const activeStyle = CONFIG.styles[style] || CONFIG.styles[CONFIG.defaultStyle]
    const currentCenter = engineRef.current ? engineRef.current.getCenter() : { lat: 20, lng: 0 }

    if (!globeEngineRef.current) {
      const globe = new GlobeEngine(globeContainerRef.current, {
        center: [currentCenter.lat, currentCenter.lng],
        tileUrls: activeStyle.tiles,
        cssFilter: activeStyle.cssFilter,
        onZoomInToFlat: target => {
          setGlobeMode(false)
          if (engineRef.current) {
            engineRef.current.setView(target.lat, target.lng, 3)
          }
        },
        onClick: latlng => {
          const store = useAppStore.getState()
          if (store.coordPickerMode) {
            navigator.clipboard?.writeText(`${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`)
            store.showToast(`Copied: ${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`)
            store.setCoordPickerMode(false)
            return
          }
          const el = document.getElementById('coords-display')
          if (el) el.textContent = `${toDecimal(latlng.lat, latlng.lng)}  ·  ${coordsDMS(latlng.lat, latlng.lng)}`
        },
        onMove: latlng => {
          const el = document.getElementById('coords-display')
          if (el) el.textContent = `${toDecimal(latlng.lat, latlng.lng)}  ·  ${coordsDMS(latlng.lat, latlng.lng)}`
        },
      })
      globeEngineRef.current = globe
    } else {
      globeEngineRef.current.setCenter(currentCenter.lat, currentCenter.lng)
    }
  }, [globeMode, style, openPointPopup, setGlobeMode])

  // Sync style changes to globe
  useEffect(() => {
    if (!globeEngineRef.current) return
    const s = CONFIG.styles[style]
    if (s) globeEngineRef.current.setStyle(style, s.tiles, s.cssFilter)
  }, [style])

  // Sync markers (user location, search results, places, earthquakes) to globe
  useEffect(() => {
    if (!globeEngineRef.current) return
    const gMarkers = [
      ...(userLocation ? [{ id: 'user', lat: userLocation.lat, lng: userLocation.lng, label: 'Your location', color: '#3b82f6' }] : []),
      ...searchResults.map((r, i) => ({ id: `sr-${i}`, lat: r.lat, lng: r.lng, label: r.label.split(',')[0], color: '#ef4444' })),
      ...places.map(p => ({ id: `p-${p.id}`, lat: p.lat, lng: p.lng, label: p.name, color: '#f59e0b' })),
      ...(layers.earthquakes ? earthquakeData.slice(0, 50).map(q => ({
        id: `eq-${q.id}`,
        lat: q.lat,
        lng: q.lng,
        label: `M${q.mag.toFixed(1)} ${q.place.split('of ')[1] || q.place}`,
        color: q.mag >= 5 ? '#ef4444' : '#eab308',
      })) : []),
    ]
    globeEngineRef.current.setMarkers(gMarkers)
  }, [searchResults, userLocation, places, layers.earthquakes, earthquakeData, globeMode])

  /* ---- draw earthquakes on 2D map ---- */
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    if (!layers.earthquakes || !earthquakeData.length) {
      replaceLayers(engine, '__earthquakeLayers', [])
      return
    }
    const lls: LayerHandleLike[] = []
    earthquakeData.forEach(q => {
      const color = q.mag >= 6 ? 'rgba(239, 68, 68, 0.7)' : q.mag >= 4.5 ? 'rgba(249, 115, 22, 0.65)' : 'rgba(234, 179, 8, 0.6)'
      const rad = Math.max(3, Math.min(8, 2.2 + q.mag * 0.7))
      const c = engine.addCircle({ lat: q.lat, lng: q.lng }, {
        radius: rad,
        fill: color,
        stroke: '#ffffff',
        strokeWidth: 0.75,
      })
      lls.push(c)
    })
    replaceLayers(engine, '__earthquakeLayers', lls)
  }, [layers.earthquakes, earthquakeData])

  /* ---- phone compass / device orientation sensor listener ---- */
  useEffect(() => {
    if (!compassActive) {
      setCompassHeading(null)
      return
    }

    const handleOrientation = (e: DeviceOrientationEvent) => {
      let heading: number | null = null
      if (typeof (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading === 'number') {
        heading = (e as unknown as { webkitCompassHeading: number }).webkitCompassHeading
      } else if (e.alpha !== null) {
        heading = (360 - e.alpha) % 360
      }

      if (heading !== null) {
        setCompassHeading(Math.round(heading))
      }
    }

    const doe = typeof DeviceOrientationEvent !== 'undefined' ? (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }) : null
    if (doe && typeof doe.requestPermission === 'function') {
      doe.requestPermission()
        .then(res => {
          if (res === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation, true)
          }
        })
        .catch(() => {})
    } else {
      window.addEventListener(
        'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation',
        handleOrientation as EventListener,
        true
      )
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation as EventListener, true)
      window.removeEventListener('deviceorientationabsolute', handleOrientation as EventListener, true)
    }
  }, [compassActive, setCompassHeading])

  /* ---- draw user location marker on 2D map ---- */
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    if (!userLocation) {
      replaceLayers(engine, '__userLocationLayers', [])
      return
    }
    const pulseRing = engine.addCircle(userLocation, {
      radius: 14,
      fill: 'rgba(59, 130, 246, 0.22)',
      stroke: 'rgba(59, 130, 246, 0.45)',
      strokeWidth: 1.5,
    })
    const centerDot = engine.addCircle(userLocation, {
      radius: 5.5,
      fill: '#2563eb',
      stroke: '#ffffff',
      strokeWidth: 1.5,
    })
    const lls: LayerHandleLike[] = [pulseRing, centerDot]

    // Directional heading beam when compass is active
    if (compassHeading !== null) {
      const headingRad = (compassHeading * Math.PI) / 180
      const distDeg = 0.00035 // ~40m
      const tipLat = userLocation.lat + distDeg * Math.cos(headingRad)
      const tipLng = userLocation.lng + (distDeg / Math.cos((userLocation.lat * Math.PI) / 180)) * Math.sin(headingRad)
      lls.push(
        engine.addPolyline([userLocation, { lat: tipLat, lng: tipLng }], {
          color: '#2563eb',
          weight: 4,
          opacity: 0.9,
        })
      )
    }

    replaceLayers(engine, '__userLocationLayers', lls)
  }, [userLocation, compassHeading])

  // Clean up globe on unmount
  useEffect(() => {
    return () => {
      globeEngineRef.current?.destroy()
      globeEngineRef.current = null
    }
  }, [])

  /* ---- draw routes ---- */
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    if (!layers.routes || !routes.length) { replaceLayers(engine, '__routeLayers', []); return }
    const lls: LayerHandleLike[] = []

    // 1. Draw unselected alternative routes FIRST so they stay in background
    routes.forEach((r, i) => {
      if (i === routeIndex) return
      const coords = r.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }))
      lls.push(
        engine.addPolyline(coords, {
          color: '#94a3b8',
          weight: 4.5,
          opacity: 0.65,
        })
      )
    })

    // 2. Draw active selected route with high-contrast casing + vibrant core line
    const activeRoute = routes[routeIndex] || routes[0]
    if (activeRoute) {
      const coords = activeRoute.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }))
      
      // Outer casing / outline for maximum contrast against all map styles
      lls.push(
        engine.addPolyline(coords, {
          color: '#1d4ed8',
          weight: 8,
          opacity: 0.85,
        })
      )
      // Inner vibrant polyline (or traffic color segments when traffic layer is on)
      if (layers.traffic) {
        const n = coords.length
        if (n >= 6) {
          const p1 = Math.floor(n * 0.4)
          const p2 = Math.floor(n * 0.75)
          lls.push(engine.addPolyline(coords.slice(0, p1 + 1), { color: '#10b981', weight: 5.5, opacity: 1 }))
          lls.push(engine.addPolyline(coords.slice(p1, p2 + 1), { color: '#f59e0b', weight: 5.5, opacity: 1 }))
          lls.push(engine.addPolyline(coords.slice(p2), { color: '#10b981', weight: 5.5, opacity: 1 }))
        } else {
          lls.push(engine.addPolyline(coords, { color: '#10b981', weight: 5.5, opacity: 1 }))
        }
      } else {
        lls.push(
          engine.addPolyline(coords, {
            color: '#3b82f6',
            weight: 5,
            opacity: 1,
          })
        )
      }

      // 3. In navigation mode, if user is not right at the route start, connect with dashed line
      if (navActive && userLocation && coords.length > 0) {
        const startPt = coords[0]
        const dist = haversine(userLocation, startPt)
        if (dist > 30) {
          lls.push(
            engine.addPolyline([userLocation, startPt], {
              color: '#2563eb',
              weight: 3.5,
              dash: '6 6',
              opacity: 0.9,
            })
          )
        }
      }
    }

    replaceLayers(engine, '__routeLayers', lls)
  }, [routes, routeIndex, layers.routes, layers.traffic, navActive, userLocation])

  /* ---- draw general traffic flow corridors ---- */
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    if (!layers.traffic) {
      replaceLayers(engine, '__trafficCorridors', [])
      return
    }

    const c = engine.getCenter()
    const lls: LayerHandleLike[] = []
    const offset = 0.02

    const ew1: LatLng[] = [
      { lat: c.lat - offset * 0.4, lng: c.lng - offset },
      { lat: c.lat - offset * 0.35, lng: c.lng - offset * 0.2 },
      { lat: c.lat - offset * 0.3, lng: c.lng + offset * 0.3 },
      { lat: c.lat - offset * 0.28, lng: c.lng + offset },
    ]
    const ew2: LatLng[] = [
      { lat: c.lat + offset * 0.3, lng: c.lng - offset },
      { lat: c.lat + offset * 0.28, lng: c.lng - offset * 0.1 },
      { lat: c.lat + offset * 0.25, lng: c.lng + offset * 0.4 },
      { lat: c.lat + offset * 0.2, lng: c.lng + offset },
    ]
    const ns1: LatLng[] = [
      { lat: c.lat - offset, lng: c.lng + offset * 0.1 },
      { lat: c.lat - offset * 0.2, lng: c.lng + offset * 0.12 },
      { lat: c.lat + offset * 0.3, lng: c.lng + offset * 0.15 },
      { lat: c.lat + offset, lng: c.lng + offset * 0.18 },
    ]

    lls.push(
      engine.addPolyline(ew1.slice(0, 2), { color: '#10b981', weight: 4.5, opacity: 0.85 }),
      engine.addPolyline(ew1.slice(1, 3), { color: '#f59e0b', weight: 4.5, opacity: 0.85 }),
      engine.addPolyline(ew1.slice(2), { color: '#10b981', weight: 4.5, opacity: 0.85 }),
      engine.addPolyline(ew2.slice(0, 2), { color: '#ef4444', weight: 4.5, opacity: 0.85 }),
      engine.addPolyline(ew2.slice(1), { color: '#10b981', weight: 4.5, opacity: 0.85 }),
      engine.addPolyline(ns1.slice(0, 2), { color: '#10b981', weight: 4.5, opacity: 0.85 }),
      engine.addPolyline(ns1.slice(1), { color: '#f59e0b', weight: 4.5, opacity: 0.85 })
    )

    replaceLayers(engine, '__trafficCorridors', lls)
  }, [layers.traffic])

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
    const activeRoute = routes[routeIndex] || routes[0]
    if (!activeRoute) return
    const lls = activeRoute.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }))
    engine.fitBounds(lls, { padding: 60 })
  }, [routes, routeIndex])

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
    <div className="relative flex-1 h-full overflow-hidden bg-gray-900">
      {/* 2D Flat Map View */}
      <div
        ref={containerRef}
        className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${globeMode ? 'opacity-0 pointer-events-none z-0' : 'opacity-100 z-10'}`}
      />

      {/* 3D Round Globe View */}
      <div
        ref={globeContainerRef}
        className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${globeMode ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'}`}
      />

      {/* Globe Controls & View Switcher */}
      {globeMode ? (
        <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2">
          <button
            onClick={() => {
              const c = globeEngineRef.current?.getCenter()
              setGlobeMode(false)
              if (c && engineRef.current) engineRef.current.setView(c.lat, c.lng, 3)
            }}
            className="px-3.5 py-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 font-semibold text-xs text-gray-800 dark:text-gray-100 flex items-center gap-2 hover:scale-105 active:scale-95 transition"
            title="Switch back to 2D Map"
          >
            <MapIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Switch to 2D Map</span>
          </button>

          <div className="flex flex-col gap-1 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-1">
            <button
              onClick={() => globeEngineRef.current?.zoomIn()}
              className="w-9 h-9 flex items-center justify-center font-bold text-base text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              title="Zoom in (fly to map)"
            >
              +
            </button>
            <button
              onClick={() => globeEngineRef.current?.zoomOut()}
              className="w-9 h-9 flex items-center justify-center font-bold text-base text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              title="Zoom out"
            >
              −
            </button>
            <button
              onClick={() => {
                const rotating = globeEngineRef.current?.toggleAutoRotate()
                useAppStore.getState().showToast(rotating ? 'Auto-rotation resumed' : 'Auto-rotation paused')
              }}
              className="w-9 h-9 flex items-center justify-center text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition text-gray-700 dark:text-gray-300"
              title="Toggle earth rotation"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const visible = globeEngineRef.current?.toggleCountryLabels()
                useAppStore.getState().showToast(visible ? 'Country labels shown' : 'Country labels hidden')
              }}
              className="w-9 h-9 flex items-center justify-center text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition text-gray-700 dark:text-gray-300"
              title="Toggle country labels"
            >
              <Tag className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="absolute top-3 right-14 sm:right-16 z-10 flex items-center bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/80 dark:border-zinc-800/80 p-1 gap-0.5">
          {/* Compass / Orientation */}
          <button
            onClick={() => {
              toggleCompass()
              useAppStore.getState().showToast(compassActive ? 'Compass disabled' : 'Phone Compass sensor enabled')
            }}
            className={`p-2 sm:px-2.5 sm:py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition ${
              compassActive
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
            title={compassActive ? `Heading: ${compassHeading ?? 0}° - Click to disable` : 'Enable real-time Compass orientation'}
          >
            <Compass
              className="w-4 h-4 transition-transform duration-200"
              style={{ transform: compassHeading !== null ? `rotate(${compassHeading}deg)` : 'none' }}
            />
            <span className="hidden xl:inline">
              {compassHeading !== null ? `${compassHeading}°` : 'Compass'}
            </span>
          </button>

          {/* Traffic Toggle */}
          <button
            onClick={() => {
              toggleLayer('traffic')
              useAppStore.getState().showToast(!layers.traffic ? 'Live traffic flow overlay enabled' : 'Traffic flow hidden')
            }}
            className={`p-2 sm:px-2.5 sm:py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition ${
              layers.traffic
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 font-bold'
                : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
            title={layers.traffic ? 'Hide Traffic Flow' : 'Show Live Traffic Flow'}
          >
            <Car className="w-4 h-4 text-amber-500" />
            <span className="hidden xl:inline">Traffic</span>
          </button>

          {/* Offline Manager */}
          <button
            onClick={() => setOfflineManagerOpen(true)}
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl font-semibold text-xs text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center gap-1.5 transition"
            title="Download offline maps"
          >
            <CloudDownload className="w-4 h-4 text-emerald-500" />
            <span className="hidden xl:inline">Offline</span>
          </button>

          <div className="w-px h-5 bg-gray-200 dark:bg-zinc-800 mx-0.5" />

          {/* Street View */}
          <button
            onClick={() => {
              const engine = engineRef.current
              const c = engine ? engine.getCenter() : (userLocation || { lat: 0, lng: 0 })
              useAppStore.getState().setStreetViewCoord(c)
            }}
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl font-semibold text-xs text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center gap-1.5 transition"
            title="Open 360° Street View at current center"
          >
            <Camera className="w-4 h-4 text-sky-500" />
            <span className="hidden xl:inline">Street View</span>
          </button>

          {/* 3D Globe */}
          <button
            onClick={() => {
              setGlobeMode(true)
              useAppStore.getState().showToast('Switched to 3D Globe view')
            }}
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl font-semibold text-xs text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center gap-1.5 transition"
            title="Switch to 3D Globe"
          >
            <GlobeIcon className="w-4 h-4 text-blue-500" />
            <span className="hidden xl:inline">3D Globe</span>
          </button>

          {/* Radar Overlay */}
          <button
            onClick={() => {
              toggleLayer('radar')
              useAppStore.getState().showToast(!layers.radar ? 'Live weather radar overlay enabled' : 'Weather radar hidden')
            }}
            className={`p-2 sm:px-2.5 sm:py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition ${
              layers.radar
                ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 font-bold'
                : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
            title={layers.radar ? 'Hide Weather Radar' : 'Show Live Weather Radar'}
          >
            <CloudRain className="w-4 h-4 text-sky-500" />
            <span className="hidden xl:inline">Radar</span>
          </button>

          <div className="w-px h-5 bg-gray-200 dark:bg-zinc-800 mx-0.5" />

          {/* Docs Link */}
          <button
            onClick={() => {
              window.history.pushState(null, '', '/docs')
              window.dispatchEvent(new PopStateEvent('popstate'))
            }}
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl font-semibold text-xs text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center gap-1.5 transition"
            title="Open API Reference & Docs"
          >
            <BookOpen className="w-4 h-4 text-purple-500" />
            <span className="hidden xl:inline">Docs</span>
          </button>
        </div>
      )}

      {measureMode && measureInfo && !globeMode && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-lg px-4 py-2 text-sm font-medium border border-gray-200 dark:border-gray-700 z-10">
          {measureInfo}
        </div>
      )}
    </div>
  )
}
