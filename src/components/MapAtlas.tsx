import { useEffect, useRef } from 'react'
import { MapEngine } from '../engine/MapEngine'
import type { MapEngineOptions, LayerHandle } from '../engine/MapEngine'
import type { LatLng } from '../types'
import { TILE_STYLES } from '../tileStyles'

export interface MapAtlasMarker extends LatLng {
  id?: number | string
  label?: string
  color?: string
  size?: number
  icon?: string
  draggable?: boolean
}

export interface MapAtlasPolyline {
  points: LatLng[]
  color?: string
  weight?: number
  opacity?: number
  dash?: string
}

export interface MapAtlasPolygon {
  points: LatLng[]
  color?: string
  weight?: number
  fill?: string
  fillOpacity?: number
  opacity?: number
}

export interface MapAtlasProps {
  /** Map centre [lat, lng]. Default [20, 0]. */
  center?: [number, number]
  /** Initial zoom. Default 2. */
  zoom?: number
  minZoom?: number
  maxZoom?: number
  /** Tile style key from TILE_STYLES, or a custom tile URL template. */
  tileStyle?: string
  /** Custom tile URL template with {z}/{x}/{y} placeholders. Overrides `tileStyle`. */
  tileUrl?: string
  attribution?: string
  /** Markers to display. */
  markers?: MapAtlasMarker[]
  /** Polylines to draw. */
  polylines?: MapAtlasPolyline[]
  /** Polygons to draw. */
  polygons?: MapAtlasPolygon[]
  /** Enable keyboard pan/zoom. Default true. */
  keyboard?: boolean
  /** Enable inertia on pan. Default true. */
  inertia?: boolean
  /** Show scale bar. Default true. */
  scaleBar?: boolean
  /** CSS class for the container. */
  className?: string
  /** Inline styles for the container. */
  cssStyle?: React.CSSProperties
  /** Called when map is clicked. */
  onMapClick?: (latlng: LatLng, event: PointerEvent) => void
  /** Called when map centre changes (after pan/zoom). */
  onViewChange?: (center: [number, number], zoom: number) => void
  /** Called once the engine is ready. Gives access to the raw MapEngine. */
  onEngineReady?: (engine: MapEngine) => void
}

/**
 * Drop-in React map component.
 *
 * ```tsx
 * import { MapAtlas } from 'map-atlas'
 * import 'map-atlas/styles.css'
 *
 * function App() {
 *   return <MapAtlas center={[51.5, -0.12]} zoom={13} tileStyle="dark" />
 * }
 * ```
 */
export function MapAtlas({
  center = [20, 0],
  zoom = 2,
  minZoom,
  maxZoom,
  tileStyle,
  tileUrl,
  attribution,
  markers,
  polylines,
  polygons,
  keyboard,
  inertia,
  scaleBar,
  className,
  cssStyle,
  onMapClick,
  onViewChange,
  onEngineReady,
}: MapAtlasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<MapEngine | null>(null)
  const overlaysRef = useRef<LayerHandle[]>([])

  /* ---- init engine ---- */
  useEffect(() => {
    if (!containerRef.current) return

    const tile = tileStyle ? TILE_STYLES[tileStyle] : undefined
    const opts: MapEngineOptions = {
      center,
      zoom,
      minZoom,
      maxZoom,
      tileUrls: tileUrl ? [tileUrl] : tile?.tiles,
      attribution: attribution ?? tile?.attribution,
      keyboard,
      inertia,
      scaleBar,
    }

    const engine = new MapEngine(containerRef.current, opts)
    if (tile?.cssFilter) engine.setTiles(tile.tiles, attribution ?? tile.attribution, tile.cssFilter)
    engineRef.current = engine
    onEngineReady?.(engine)

    if (onMapClick) {
      engine.on('click', (e: unknown) => {
        const ev = e as { latlng: LatLng; originalEvent: PointerEvent }
        onMapClick(ev.latlng, ev.originalEvent)
      })
    }

    if (onViewChange) {
      const handler = () => {
        const c = engine.getCenter()
        onViewChange([c.lat, c.lng], engine.getZoom())
      }
      engine.on('moveend', handler)
      engine.on('zoomend', handler)
    }

    return () => {
      engine.destroy()
      engineRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---- update tiles ---- */
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    if (tileUrl) {
      engine.setTiles(tileUrl, attribution)
    } else if (tileStyle && TILE_STYLES[tileStyle]) {
      const s = TILE_STYLES[tileStyle]
      engine.setTiles(s.tiles, attribution ?? s.attribution, s.cssFilter)
    }
  }, [tileUrl, tileStyle, attribution])

  /* ---- update markers / polylines / polygons ---- */
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return

    // Clear previous overlays
    overlaysRef.current.forEach(h => h.remove())
    overlaysRef.current = []

    // Markers
    if (markers?.length) {
      // Use clustering when > 20 markers
      if (markers.length > 20) {
        engine.setClusterMarkers(
          markers.map((m, i) => ({
            lat: m.lat,
            lng: m.lng,
            id: typeof m.id === 'number' ? m.id : i,
            label: m.label,
            color: m.color,
            size: m.size,
            icon: m.icon,
          }))
        )
      } else {
        engine.setClusterMarkers([])
        for (const m of markers) {
          const h = engine.addMarker(
            { lat: m.lat, lng: m.lng },
            { label: m.label, color: m.color, size: m.size, icon: m.icon, draggable: m.draggable }
          )
          overlaysRef.current.push(h)
        }
      }
    } else {
      engine.setClusterMarkers([])
    }

    // Polylines
    if (polylines) {
      for (const pl of polylines) {
        const h = engine.addPolyline(pl.points, {
          color: pl.color,
          weight: pl.weight,
          opacity: pl.opacity,
          dash: pl.dash,
        })
        overlaysRef.current.push(h)
      }
    }

    // Polygons
    if (polygons) {
      for (const pg of polygons) {
        const h = engine.addPolygon(pg.points, {
          color: pg.color,
          weight: pg.weight,
          fill: pg.fill,
          fillOpacity: pg.fillOpacity,
          opacity: pg.opacity,
        })
        overlaysRef.current.push(h)
      }
    }
  }, [markers, polylines, polygons])

  /* ---- update centre ---- */
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    engine.setView(center[0], center[1], engine.getZoom())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1]])

  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    const c = engine.getCenter()
    engine.setView(c.lat, c.lng, zoom)
  }, [zoom])

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    ...(cssStyle || {}),
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={containerStyle}
    />
  )
}
