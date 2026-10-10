/*
 * MapEngine — a dependency-free slippy-map engine in TypeScript.
 *
 * Features: Web Mercator projection, raster tile layers with retina support,
 * SVG overlay (polylines, circles, markers), pointer/touch pan, wheel/pinch
 * zoom with inertia, keyboard controls, popups, clustering, scale bar.
 */

import { project, unproject } from './projection'
import type { LatLng } from '../types'
import { TileLayer } from './tiles'
import { HeatmapOverlay } from './heatmap'
import type { HeatPoint, HeatmapOptions } from './heatmap'
import '../engine.css'

const SVG_NS = 'http://www.w3.org/2000/svg'
const MIN_ZOOM = 1
const MAX_ZOOM = 19

export interface MapEngineOptions {
  center?: [number, number]
  zoom?: number
  minZoom?: number
  maxZoom?: number
  tileUrls?: string[]
  attribution?: string
  cssFilter?: string
  keyboard?: boolean
  inertia?: boolean
  scaleBar?: boolean
}

export interface PolylineStyle {
  color?: string
  weight?: number
  opacity?: number
  dash?: string
}

export interface CircleStyle {
  radius?: number
  fill?: string
  stroke?: string
  strokeWidth?: number
}

export interface MarkerStyle {
  color?: string
  size?: number
  label?: string
  draggable?: boolean
  icon?: string
}

export interface LayerHandle {
  remove(): void
  setLatLngs?(latlngs: LatLng[]): void
  setLatLng?(latlng: LatLng): void
  setVisible?(visible: boolean): void
}

type EventHandler = (data: unknown) => void

function clampZoom(z: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(z)))
}

function el(tag: string, cls?: string, parent?: HTMLElement): HTMLElement {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (parent) parent.appendChild(e)
  return e
}

/* ---------- clustering ---------- */

interface ClusterInput {
  lat: number
  lng: number
  id: number
}

function clusterPoints(
  points: ClusterInput[],
  zoom: number,
  cx: number,
  cy: number,
  w: number,
  h: number
): { clusters: { x: number; y: number; count: number; members: ClusterInput[] }[]; singles: (ClusterInput & { x: number; y: number })[] } {
  if (zoom >= 14) {
    return {
      clusters: [],
      singles: points.map(p => {
        const proj = project(p.lat, p.lng, zoom)
        return { ...p, x: proj.x, y: proj.y }
      }),
    }
  }

  const gridSize = zoom >= 10 ? 40 : zoom >= 6 ? 60 : 80
  const grids = new Map<string, ClusterInput[]>()

  for (const p of points) {
    const proj = project(p.lat, p.lng, zoom)
    const gx = Math.floor(proj.x / gridSize)
    const gy = Math.floor(proj.y / gridSize)
    const key = `${gx}/${gy}`
    if (!grids.has(key)) grids.set(key, [])
    grids.get(key)!.push(p)
  }

  const clusters: { x: number; y: number; count: number; members: ClusterInput[] }[] = []
  const singles: (ClusterInput & { x: number; y: number })[] = []

  for (const members of grids.values()) {
    if (members.length === 1) {
      const p = members[0]
      const proj = project(p.lat, p.lng, zoom)
      singles.push({ ...p, x: proj.x, y: proj.y })
    } else {
      let sumX = 0
      let sumY = 0
      for (const m of members) {
        const proj = project(m.lat, m.lng, zoom)
        sumX += proj.x
        sumY += proj.y
      }
      clusters.push({
        x: sumX / members.length,
        y: sumY / members.length,
        count: members.length,
        members,
      })
    }
  }

  // Filter to visible only
  const visClusters = clusters.filter(
    c => c.x > cx - 100 && c.x < cx + w + 100 && c.y > cy - 100 && c.y < cy + h + 100
  )
  const visSingles = singles.filter(
    s => s.x > cx - 50 && s.x < cx + w + 50 && s.y > cy - 50 && s.y < cy + h + 50
  )

  return { clusters: visClusters, singles: visSingles }
}

/* ---------- engine ---------- */

export class MapEngine {
  private container: HTMLElement
  private tileLayerEl: HTMLElement
  private svg: SVGSVGElement
  private popupLayer: HTMLElement
  private attrEl: HTMLElement
  private scaleBarEl: HTMLElement | null = null
  private tileLayer: TileLayer | null = null
  private tileLayer2: TileLayer | null = null

  zoom: number
  minZoom: number
  maxZoom: number
  private cx = 0
  private cy = 0

  private events: Record<string, EventHandler[]> = {}
  private overlays = new Set<Record<string, unknown>>()
  private popup: { latlng: LatLng; el: HTMLElement } | null = null
  private anim: number | null = null

  private dragging = false
  private dragMoved = false
  private dragId: number | null = null
  private lastX = 0
  private lastY = 0
  private velocityX = 0
  private velocityY = 0
  private lastTime = 0
  private inertiaRAF: number | null = null

  private pinch: { dist: number; cx: number; cy: number } | null = null
  private wheelAcc = 0

  private markersForCluster: (ClusterInput & MarkerStyle)[] = []
  private clusterSVG: SVGGElement

  private keyHandler: ((e: KeyboardEvent) => void) | null = null

  constructor(container: HTMLElement | string, opts: MapEngineOptions = {}) {
    this.container = typeof container === 'string' ? document.getElementById(container)! : container
    this.minZoom = opts.minZoom ?? MIN_ZOOM
    this.maxZoom = opts.maxZoom ?? MAX_ZOOM
    this.zoom = clampZoom(opts.zoom ?? 2, this.minZoom, this.maxZoom)

    const c = opts.center ?? [0, 0]
    const p = project(c[0], c[1], this.zoom)
    this.cx = p.x
    this.cy = p.y

    this.container.classList.add('me-root')

    this.tileLayerEl = el('div', 'me-tiles', this.container)
    this.svg = document.createElementNS(SVG_NS, 'svg')
    this.svg.setAttribute('class', 'me-overlay')
    this.container.appendChild(this.svg)
    this.popupLayer = el('div', 'me-popups', this.container)
    this.attrEl = el('div', 'me-attr', this.container)

    // Brand label
    const brand = el('div', 'me-attr-brand', this.container)
    brand.textContent = '© Map Atlas'

    this.clusterSVG = document.createElementNS(SVG_NS, 'g')
    this.clusterSVG.setAttribute('class', 'me-clusters')
    this.svg.appendChild(this.clusterSVG)

    // Zoom controls
    const ctrl = el('div', 'me-controls', this.container)
    const zin = el('button', 'me-ctrl-btn', ctrl)
    zin.textContent = '+'
    zin.title = 'Zoom in'
    zin.addEventListener('click', () => this.zoomIn())
    const zout = el('button', 'me-ctrl-btn', ctrl)
    zout.textContent = '−'
    zout.title = 'Zoom out'
    zout.addEventListener('click', () => this.zoomOut())

    // Scale bar
    if (opts.scaleBar !== false) {
      this.scaleBarEl = el('div', 'me-scalebar', this.container)
      this.scaleBarEl.innerHTML = '<span class="me-scalebar-line"></span><span class="me-scalebar-text"></span>'
    }

    if (opts.tileUrls?.length) this.setTiles(opts.tileUrls, opts.attribution, opts.cssFilter)
    if (opts.keyboard !== false) this._bindKeyboard()
    this._bindInput()

    window.addEventListener('resize', () => this._draw())
    this._draw()
  }

  /* ---- events ---- */

  on<K extends string>(type: K, fn: EventHandler): this {
    ;(this.events[type] = this.events[type] || []).push(fn)
    return this
  }

  off(type: string, fn: EventHandler): this {
    const list = this.events[type]
    if (list) {
      const i = list.indexOf(fn)
      if (i >= 0) list.splice(i, 1)
    }
    return this
  }

  private fire(type: string, data?: unknown): void {
    for (const fn of this.events[type] || []) fn(data)
  }

  /* ---- tiles ---- */

  setTiles(templates: string[] | string, attribution?: string, cssFilter?: string): void {
    const arr = typeof templates === 'string' ? [templates] : templates
    if (this.tileLayer) this.tileLayer.destroy()
    if (this.tileLayer2) { this.tileLayer2.destroy(); this.tileLayer2 = null }

    this.tileLayerEl.style.filter = cssFilter || ''

    this.tileLayer = new TileLayer(this.tileLayerEl, this.attrEl, {
      template: arr[0] || '',
      attribution: attribution || '',
    })
    if (arr[1]) {
      this.tileLayer2 = new TileLayer(this.tileLayerEl, null, { template: arr[1] })
    }
    this._draw()
  }

  /* ---- overlays ---- */

  addPolyline(latlngs: LatLng[], style: PolylineStyle = {}): LayerHandle {
    const layer = { type: 'polyline' as const, latlngs: latlngs.map(p => ({ ...p })), style, visible: true }
    return this._addOverlay(layer)
  }

  addCircle(latlng: LatLng, style: CircleStyle = {}): LayerHandle {
    const layer = { type: 'circle' as const, latlng: { ...latlng }, style, visible: true }
    return this._addOverlay(layer)
  }

  addMarker(latlng: LatLng, style: MarkerStyle = {}): LayerHandle {
    const layer = { type: 'marker' as const, latlng: { ...latlng }, style, visible: true }
    return this._addOverlay(layer)
  }

  addPolygon(latlngs: LatLng[], style: PolylineStyle & { fill?: string; fillOpacity?: number } = {}): LayerHandle {
    const layer = {
      type: 'polygon' as const,
      latlngs: latlngs.map(p => ({ ...p })),
      style: { fill: style.fill || 'rgba(26,115,232,0.15)', ...style },
      visible: true,
    }
    return this._addOverlay(layer)
  }

  setClusterMarkers(points: (LatLng & MarkerStyle & { id: number })[]): void {
    this.markersForCluster = points
    this._draw()
  }

  /* ---- heatmap ---- */

  private heatmap: HeatmapOverlay | null = null

  showHeatmap(points: HeatPoint[], opts?: HeatmapOptions): void {
    if (!this.heatmap) {
      this.heatmap = new HeatmapOverlay(this.container, opts)
    }
    this.heatmap.setPoints(points)
    this._drawHeatmap()
  }

  hideHeatmap(): void {
    this.heatmap?.destroy()
    this.heatmap = null
  }

  setHeatmapPoints(points: HeatPoint[]): void {
    if (!this.heatmap) return
    this.heatmap.setPoints(points)
    this._drawHeatmap()
  }

  private _drawHeatmap(): void {
    if (!this.heatmap) return
    const { w, h } = this._size()
    const ox = this.cx - w / 2
    const oy = this.cy - h / 2
    // The heatmap needs center in pixel coords and zoom
    this.heatmap.draw({ x: ox + w / 2, y: oy + h / 2 }, this.zoom)
  }

  private _addOverlay(layer: Record<string, unknown>): LayerHandle {
    this.overlays.add(layer)
    const self = this
    const handle: LayerHandle = {
      remove() {
        self.overlays.delete(layer)
        self._draw()
      },
      setLatLngs(ll: LatLng[]) {
        layer.latlngs = ll.map(p => ({ ...p }))
        self._draw()
      },
      setLatLng(ll: LatLng) {
        layer.latlng = { ...ll }
        self._draw()
      },
      setVisible(v: boolean) {
        layer.visible = v
        self._draw()
      },
    }
    this._draw()
    return handle
  }

  /* ---- popups ---- */

  openPopup(latlng: LatLng, content: HTMLElement): void {
    this.closePopup()
    const wrap = el('div', 'me-popup', this.popupLayer)
    const close = el('button', 'me-popup-close', wrap)
    close.innerHTML = '&times;'
    close.title = 'Close'
    close.addEventListener('click', () => this.closePopup())
    wrap.appendChild(content)
    this.popup = { latlng: { ...latlng }, el: wrap }
    this._draw()
  }

  closePopup(): void {
    if (this.popup) {
      this.popup.el.remove()
      this.popup = null
    }
  }

  /* ---- view ---- */

  getCenter(): LatLng {
    return unproject(this.cx, this.cy, this.zoom)
  }

  getZoom(): number {
    return this.zoom
  }

  getBounds(): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
    const { w, h } = this._size()
    const tl = unproject(this.cx - w / 2, this.cy - h / 2, this.zoom)
    const br = unproject(this.cx + w / 2, this.cy + h / 2, this.zoom)
    return {
      minLat: br.lat,
      maxLat: tl.lat,
      minLng: tl.lng,
      maxLng: br.lng,
    }
  }

  setView(lat: number, lng: number, zoom?: number): void {
    this._stopAnim()
    if (zoom != null) this.zoom = clampZoom(zoom, this.minZoom, this.maxZoom)
    const p = project(lat, lng, this.zoom)
    this.cx = p.x
    this.cy = p.y
    this._draw()
    this.fire('moveend')
    this.fire('zoomend')
  }

  flyTo(lat: number, lng: number, zoom?: number, duration = 600): void {
    this._stopAnim()
    const z = zoom != null ? clampZoom(zoom, this.minZoom, this.maxZoom) : this.zoom
    const scale = Math.pow(2, z - this.zoom)
    const sx = this.cx * scale
    const sy = this.cy * scale
    this.zoom = z
    const target = project(lat, lng, z)
    const start = performance.now()

    const step = (now: number) => {
      const k = Math.min(1, (now - start) / duration)
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
      this.cx = sx + (target.x - sx) * e
      this.cy = sy + (target.y - sy) * e
      this._draw()
      if (k < 1) {
        this.anim = requestAnimationFrame(step)
      } else {
        this.anim = null
        this.fire('moveend')
        this.fire('zoomend')
      }
    }
    this.anim = requestAnimationFrame(step)
  }

  fitBounds(latlngs: LatLng[], opts: { padding?: number; maxZoom?: number } = {}): void {
    if (!latlngs.length) return
    const pad = opts.padding ?? 40
    const maxZ = Math.min(opts.maxZoom ?? this.maxZoom, this.maxZoom)
    const { w, h } = this._size()

    let minLat = 90
    let maxLat = -90
    let minLng = 180
    let maxLng = -180
    for (const p of latlngs) {
      if (p.lat < minLat) minLat = p.lat
      if (p.lat > maxLat) maxLat = p.lat
      if (p.lng < minLng) minLng = p.lng
      if (p.lng > maxLng) maxLng = p.lng
    }

    let z = maxZ
    for (; z > this.minZoom; z--) {
      const a = project(maxLat, minLng, z)
      const b = project(minLat, maxLng, z)
      if (Math.abs(b.x - a.x) <= w - 2 * pad && Math.abs(b.y - a.y) <= h - 2 * pad) break
    }
    this.setView((minLat + maxLat) / 2, (minLng + maxLng) / 2, z)
  }

  zoomIn(): void {
    this._zoomAt(this.zoom + 1, this._size().w / 2, this._size().h / 2)
  }

  zoomOut(): void {
    if (this.zoom <= this.minZoom) {
      this.fire('zoomlimit-min', { center: this.getCenter() })
      return
    }
    this._zoomAt(this.zoom - 1, this._size().w / 2, this._size().h / 2)
  }

  private _stopAnim(): void {
    if (this.anim) cancelAnimationFrame(this.anim)
    this.anim = null
    if (this.inertiaRAF) cancelAnimationFrame(this.inertiaRAF)
    this.inertiaRAF = null
  }

  private _zoomAt(z: number, px: number, py: number): void {
    if (z < this.minZoom) {
      this.fire('zoomlimit-min', { center: this.getCenter() })
    }
    z = clampZoom(z, this.minZoom, this.maxZoom)
    if (z === this.zoom) return
    this._stopAnim()
    const { w, h } = this._size()
    const wx = this.cx - w / 2 + px
    const wy = this.cy - h / 2 + py
    const k = Math.pow(2, z - this.zoom)
    this.zoom = z
    this.cx = wx * k - px + w / 2
    this.cy = wy * k - py + h / 2
    this._draw()
    this.fire('zoomend')
    this.fire('moveend')
  }

  /* ---- rendering ---- */

  private _size(): { w: number; h: number } {
    return { w: this.container.clientWidth, h: this.container.clientHeight }
  }

  private _draw(): void {
    const { w, h } = this._size()
    const ox = this.cx - w / 2
    const oy = this.cy - h / 2
    const dpr = window.devicePixelRatio || 1

    this.tileLayer?.draw(ox, oy, w, h, this.zoom, dpr)
    this.tileLayer2?.draw(ox, oy, w, h, this.zoom, dpr)

    this.svg.setAttribute('width', String(w))
    this.svg.setAttribute('height', String(h))

    // Keep cluster group as first child
    while (this.svg.childNodes.length > 1) this.svg.removeChild(this.svg.lastChild!)

    const z = this.zoom

    for (const layer of this.overlays) {
      if (layer.visible === false) continue

      if (layer.type === 'polyline') {
        const lls = layer.latlngs as LatLng[]
        if (lls.length < 2) continue
        const style = layer.style as PolylineStyle
        const pts = lls
          .map(ll => {
            const p = project(ll.lat, ll.lng, z)
            return `${(p.x - ox).toFixed(1)},${(p.y - oy).toFixed(1)}`
          })
          .join(' ')
        const pl = document.createElementNS(SVG_NS, 'polyline')
        pl.setAttribute('points', pts)
        pl.setAttribute('fill', 'none')
        pl.setAttribute('stroke', style.color || '#3b82f6')
        pl.setAttribute('stroke-width', String(style.weight ?? 4))
        pl.setAttribute('stroke-opacity', String(style.opacity ?? 1))
        pl.setAttribute('stroke-linecap', 'round')
        pl.setAttribute('stroke-linejoin', 'round')
        if (style.dash) pl.setAttribute('stroke-dasharray', style.dash)
        this.svg.appendChild(pl)
      } else if (layer.type === 'polygon') {
        const lls = layer.latlngs as LatLng[]
        if (lls.length < 2) continue
        const style = layer.style as PolylineStyle & { fill?: string; fillOpacity?: number }
        const pts = lls
          .map(ll => {
            const p = project(ll.lat, ll.lng, z)
            return `${(p.x - ox).toFixed(1)},${(p.y - oy).toFixed(1)}`
          })
          .join(' ')
        const pg = document.createElementNS(SVG_NS, 'polygon')
        pg.setAttribute('points', pts)
        pg.setAttribute('fill', style.fill || 'rgba(59,130,246,0.15)')
        pg.setAttribute('fill-opacity', String(style.fillOpacity ?? 0.15))
        pg.setAttribute('stroke', style.color || '#3b82f6')
        pg.setAttribute('stroke-width', String(style.weight ?? 2))
        pg.setAttribute('stroke-opacity', String(style.opacity ?? 0.8))
        this.svg.appendChild(pg)
      } else if (layer.type === 'circle') {
        const ll = layer.latlng as LatLng
        const style = layer.style as CircleStyle
        const p = project(ll.lat, ll.lng, z)
        const c = document.createElementNS(SVG_NS, 'circle')
        c.setAttribute('cx', (p.x - ox).toFixed(1))
        c.setAttribute('cy', (p.y - oy).toFixed(1))
        c.setAttribute('r', String(style.radius ?? 8))
        c.setAttribute('fill', style.fill || '#3b82f6')
        c.setAttribute('stroke', style.stroke || '#fff')
        c.setAttribute('stroke-width', String(style.strokeWidth ?? 2))
        this.svg.appendChild(c)
      } else if (layer.type === 'marker') {
        const ll = layer.latlng as LatLng
        const style = layer.style as MarkerStyle
        const p = project(ll.lat, ll.lng, z)
        const g = document.createElementNS(SVG_NS, 'g')
        g.setAttribute(
          'transform',
          `translate(${(p.x - ox).toFixed(1)},${(p.y - oy).toFixed(1)})`
        )

        if (style.icon) {
          // Emoji pin
          const t = document.createElementNS(SVG_NS, 'text')
          t.setAttribute('text-anchor', 'middle')
          t.setAttribute('dominant-baseline', 'auto')
          t.setAttribute('font-size', String((style.size ?? 24) + 'px'))
          t.textContent = style.icon
          g.appendChild(t)
        } else {
          const r = style.size ?? 10
          // Pin shape: teardrop
          const path = document.createElementNS(SVG_NS, 'path')
          const c = style.color || '#ef4444'
          path.setAttribute(
            'd',
            `M0,0 C-${r * 0.6},-${r * 1.2} -${r},-${r * 1.6} -${r},-${r * 2.2} a${r},${r} 0 1,1 ${r * 2},0 c0,${r * 0.6} -${r * 0.4},${r * 1} -${r},${r * 2.2} Z`
          )
          path.setAttribute('fill', c)
          path.setAttribute('stroke', '#fff')
          path.setAttribute('stroke-width', '1.5')
          g.appendChild(path)
          const circle = document.createElementNS(SVG_NS, 'circle')
          circle.setAttribute('cx', '0')
          circle.setAttribute('cy', String(-r * 2.2))
          circle.setAttribute('r', String(r * 0.35))
          circle.setAttribute('fill', '#fff')
          g.appendChild(circle)

          if (style.label) {
            const txt = document.createElementNS(SVG_NS, 'text')
            txt.setAttribute('text-anchor', 'middle')
            txt.setAttribute('y', String(-r * 2.2 - r * 0.7))
            txt.setAttribute('font-size', '11')
            txt.setAttribute('font-weight', '600')
            txt.setAttribute('fill', '#1f2937')
            txt.setAttribute('paint-order', 'stroke')
            txt.setAttribute('stroke', '#fff')
            txt.setAttribute('stroke-width', '3')
            txt.textContent = style.label
            g.appendChild(txt)
          }
        }
        this.svg.appendChild(g)
      }
    }

    // Clustering
    this._drawClusters(ox, oy, w, h)

    // Popup position
    if (this.popup) {
      const p = project(this.popup.latlng.lat, this.popup.latlng.lng, z)
      this.popup.el.style.left = `${p.x - ox}px`
      this.popup.el.style.top = `${p.y - oy}px`
    }

    // Scale bar
    this._updateScaleBar(w)

    // Heatmap
    this._drawHeatmap()
  }

  private _drawClusters(ox: number, oy: number, w: number, h: number): void {
    this.clusterSVG.replaceChildren()
    if (!this.markersForCluster.length) return

    const input: ClusterInput[] = this.markersForCluster.map(m => ({
      lat: m.lat,
      lng: m.lng,
      id: m.id,
    }))

    const { clusters, singles } = clusterPoints(input, this.zoom, ox, oy, w, h)

    for (const s of singles) {
      const markerStyle = this.markersForCluster.find(m => m.id === s.id)
      const g = document.createElementNS(SVG_NS, 'g')
      const px = s.x - ox
      const py = s.y - oy
      g.setAttribute('transform', `translate(${px.toFixed(1)},${py.toFixed(1)})`)

      const c = document.createElementNS(SVG_NS, 'circle')
      c.setAttribute('r', '6')
      c.setAttribute('fill', markerStyle?.color || '#3b82f6')
      c.setAttribute('stroke', '#fff')
      c.setAttribute('stroke-width', '2')
      g.appendChild(c)

      if (markerStyle?.label) {
        const txt = document.createElementNS(SVG_NS, 'text')
        txt.setAttribute('text-anchor', 'middle')
        txt.setAttribute('y', '-10')
        txt.setAttribute('font-size', '10')
        txt.setAttribute('fill', '#1f2937')
        txt.setAttribute('paint-order', 'stroke')
        txt.setAttribute('stroke', '#fff')
        txt.setAttribute('stroke-width', '2.5')
        txt.textContent = markerStyle.label
        g.appendChild(txt)
      }

      this.clusterSVG.appendChild(g)
    }

    for (const cl of clusters) {
      const px = cl.x - ox
      const py = cl.y - oy
      const g = document.createElementNS(SVG_NS, 'g')
      g.setAttribute('transform', `translate(${px.toFixed(1)},${py.toFixed(1)})`)

      const r = Math.min(14 + cl.count * 0.3, 24)
      const c = document.createElementNS(SVG_NS, 'circle')
      c.setAttribute('r', String(r))
      c.setAttribute('fill', 'rgba(59,130,246,0.8)')
      c.setAttribute('stroke', '#fff')
      c.setAttribute('stroke-width', '2')
      g.appendChild(c)

      const txt = document.createElementNS(SVG_NS, 'text')
      txt.setAttribute('text-anchor', 'middle')
      txt.setAttribute('dominant-baseline', 'central')
      txt.setAttribute('font-size', '12')
      txt.setAttribute('font-weight', '700')
      txt.setAttribute('fill', '#fff')
      txt.textContent = String(cl.count)
      g.appendChild(txt)

      this.clusterSVG.appendChild(g)
    }
  }

  private _updateScaleBar(_w: number): void {
    if (!this.scaleBarEl) return
    const center = unproject(this.cx, this.cy, this.zoom)
    // metres per pixel at current zoom at this latitude
    const mpp =
      (156543.03392 * Math.cos((center.lat * Math.PI) / 180)) / Math.pow(2, this.zoom)

    const targets = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000]
    let best = targets[0]
    for (const t of targets) {
      if (t / mpp <= 120) best = t
    }
    const px = best / mpp
    const line = this.scaleBarEl.querySelector('.me-scalebar-line') as HTMLElement
    const text = this.scaleBarEl.querySelector('.me-scalebar-text') as HTMLElement
    line.style.width = `${px.toFixed(0)}px`
    text.textContent = best >= 1000 ? `${best / 1000} km` : `${best} m`
  }

  /* ---- input ---- */

  private _latlngAt(clientX: number, clientY: number): LatLng {
    const r = this.container.getBoundingClientRect()
    const { w, h } = this._size()
    const x = this.cx - w / 2 + (clientX - r.left)
    const y = this.cy - h / 2 + (clientY - r.top)
    return unproject(x, y, this.zoom)
  }

  private _bindInput(): void {
    const root = this.container

    root.addEventListener('pointerdown', e => {
      if ((e.target as HTMLElement).closest('.me-popup, .me-controls')) return
      if (e.button !== 0) return
      this._stopAnim()
      this.dragging = true
      this.dragMoved = false
      this.lastX = e.clientX
      this.lastY = e.clientY
      this.dragId = e.pointerId
      this.velocityX = 0
      this.velocityY = 0
      this.lastTime = performance.now()
      root.setPointerCapture(e.pointerId)
      root.classList.add('me-dragging')
    })

    root.addEventListener('pointermove', e => {
      if (!this.dragging) {
        this.fire('mousemove', { latlng: this._latlngAt(e.clientX, e.clientY) })
        return
      }
      const dx = e.clientX - this.lastX
      const dy = e.clientY - this.lastY
      if (!this.dragMoved) {
        if (Math.hypot(dx, dy) < 4) return
        this.dragMoved = true
      }
      this.cx -= dx
      this.cy -= dy

      const now = performance.now()
      const dt = now - this.lastTime
      if (dt > 0) {
        this.velocityX = dx / dt
        this.velocityY = dy / dt
      }
      this.lastX = e.clientX
      this.lastY = e.clientY
      this.lastTime = now
      this._draw()
    })

    const end = (e: PointerEvent) => {
      if (!this.dragging) return
      this.dragging = false
      root.classList.remove('me-dragging')
      try {
        root.releasePointerCapture(this.dragId!)
      } catch {
        /* already released */
      }
      if (this.dragMoved) {
        // Inertia
        const speed = Math.hypot(this.velocityX, this.velocityY)
        if (speed > 0.15) {
          this._startInertia(this.velocityX, this.velocityY)
        } else {
          this.fire('moveend')
        }
      } else if (e.type === 'pointerup') {
        this.fire('click', { latlng: this._latlngAt(e.clientX, e.clientY), originalEvent: e })
      }
    }
    root.addEventListener('pointerup', end)
    root.addEventListener('pointercancel', end)

    // Wheel zoom
    root.addEventListener(
      'wheel',
      e => {
        e.preventDefault()
        this.wheelAcc += e.deltaY
        if (Math.abs(this.wheelAcc) < 50) return
        const dir = this.wheelAcc < 0 ? 1 : -1
        this.wheelAcc = 0
        if (dir < 0 && this.zoom <= this.minZoom) {
          this.fire('zoomlimit-min', { center: this.getCenter() })
          return
        }
        const r = root.getBoundingClientRect()
        this._zoomAt(this.zoom + dir, e.clientX - r.left, e.clientY - r.top)
      },
      { passive: false }
    )

    // Double-click zoom
    root.addEventListener('dblclick', e => {
      if ((e.target as HTMLElement).closest('.me-popup, .me-controls')) return
      const r = root.getBoundingClientRect()
      this._zoomAt(this.zoom + 1, e.clientX - r.left, e.clientY - r.top)
    })

    // Right-click context menu
    root.addEventListener('contextmenu', e => {
      if ((e.target as HTMLElement).closest('.me-popup, .me-controls')) return
      e.preventDefault()
      const latlng = this._latlngAt(e.clientX, e.clientY)
      this.fire('contextmenu', { latlng, x: e.clientX, y: e.clientY })
    })

    // Touch pinch
    root.addEventListener(
      'touchstart',
      e => {
        if (e.touches.length === 2) {
          this._stopAnim()
          const dx = e.touches[0].clientX - e.touches[1].clientX
          const dy = e.touches[0].clientY - e.touches[1].clientY
          this.pinch = {
            dist: Math.hypot(dx, dy),
            cx: (e.touches[0].clientX + e.touches[1].clientX) / 2,
            cy: (e.touches[0].clientY + e.touches[1].clientY) / 2,
          }
          this.dragging = false
        }
      },
      { passive: true }
    )

    root.addEventListener(
      'touchmove',
      e => {
        if (e.touches.length === 2 && this.pinch) {
          e.preventDefault()
          const dx = e.touches[0].clientX - e.touches[1].clientX
          const dy = e.touches[0].clientY - e.touches[1].clientY
          const dist = Math.hypot(dx, dy)
          if (this.pinch.dist === 0) return
          const ratio = dist / this.pinch.dist
          if (ratio > 1.1 || ratio < 0.9) {
            const r = root.getBoundingClientRect()
            const dir = ratio > 1 ? 1 : -1
            this._zoomAt(this.zoom + dir, this.pinch.cx - r.left, this.pinch.cy - r.top)
            this.pinch.dist = dist
          }
        }
      },
      { passive: false }
    )

    root.addEventListener(
      'touchend',
      e => {
        if (e.touches.length < 2) this.pinch = null
      },
      { passive: true }
    )
  }

  private _startInertia(vx: number, vy: number): void {
    let decay = 0.95
    const step = () => {
      this.cx -= vx * 16
      this.cy -= vy * 16
      vx *= decay
      vy *= decay
      decay -= 0.005
      this._draw()
      if (Math.hypot(vx, vy) > 0.01 && decay > 0.1) {
        this.inertiaRAF = requestAnimationFrame(step)
      } else {
        this.inertiaRAF = null
        this.fire('moveend')
      }
    }
    this.inertiaRAF = requestAnimationFrame(step)
  }

  private _bindKeyboard(): void {
    this.keyHandler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return

      const step = 80
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          this.cy -= step
          this._draw()
          this.fire('moveend')
          break
        case 'ArrowDown':
          e.preventDefault()
          this.cy += step
          this._draw()
          this.fire('moveend')
          break
        case 'ArrowLeft':
          e.preventDefault()
          this.cx -= step
          this._draw()
          this.fire('moveend')
          break
        case 'ArrowRight':
          e.preventDefault()
          this.cx += step
          this._draw()
          this.fire('moveend')
          break
        case '+':
        case '=':
          e.preventDefault()
          this.zoomIn()
          break
        case '-':
          e.preventDefault()
          this.zoomOut()
          break
      }
    }
    window.addEventListener('keydown', this.keyHandler)
  }

  destroy(): void {
    this._stopAnim()
    this.tileLayer?.destroy()
    this.tileLayer2?.destroy()
    if (this.keyHandler) window.removeEventListener('keydown', this.keyHandler)
    this.container.innerHTML = ''
  }
}
