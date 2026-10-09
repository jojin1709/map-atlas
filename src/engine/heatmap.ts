/* Canvas-based heatmap overlay for the map engine. */

import { project } from './projection'

export interface HeatPoint {
  lat: number
  lng: number
  weight?: number
}

export interface HeatmapOptions {
  radius?: number
  maxOpacity?: number
  gradient?: Record<number, string>
}

const DEFAULT_GRADIENT: Record<number, string> = {
  0.0: 'blue',
  0.2: 'cyan',
  0.4: 'lime',
  0.6: 'yellow',
  0.8: 'orange',
  1.0: 'red',
}

export class HeatmapOverlay {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private points: HeatPoint[] = []
  private radius: number
  private maxOpacity: number
  private gradient: Record<number, string>

  constructor(
    private container: HTMLElement,
    opts: HeatmapOptions = {}
  ) {
    this.radius = opts.radius ?? 25
    this.maxOpacity = opts.maxOpacity ?? 0.7
    this.gradient = opts.gradient ?? DEFAULT_GRADIENT

    this.canvas = document.createElement('canvas')
    this.canvas.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:5;'
    this.container.appendChild(this.canvas)
    this.ctx = this.canvas.getContext('2d')!
  }

  setPoints(points: HeatPoint[]): void {
    this.points = points
    this.draw()
  }

  addPoint(p: HeatPoint): void {
    this.points.push(p)
    this.draw()
  }

  clear(): void {
    this.points = []
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  setRadius(r: number): void {
    this.radius = r
    this.draw()
  }

  draw(center?: { x: number; y: number }, zoom?: number): void {
    if (!center || zoom === undefined) return

    const w = this.container.clientWidth
    const h = this.container.clientHeight
    const dpr = window.devicePixelRatio || 1
    this.canvas.width = w * dpr
    this.canvas.height = h * dpr
    this.canvas.style.width = w + 'px'
    this.canvas.style.height = h + 'px'
    this.ctx.scale(dpr, dpr)
    this.ctx.clearRect(0, 0, w, h)

    if (!this.points.length) return

    // Create radial gradient for heat spots
    const r = this.radius
    const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, r)
    for (const [stop, color] of Object.entries(this.gradient)) {
      gradient.addColorStop(parseFloat(stop), color)
    }

    // Draw each point
    for (const p of this.points) {
      const screen = project(p.lat, p.lng, zoom)
      const x = screen.x - center.x + w / 2
      const y = screen.y - center.y + h / 2

      // Skip off-screen
      if (x < -r || x > w + r || y < -r || y > h + r) continue

      const weight = p.weight ?? 1
      this.ctx.globalAlpha = Math.min(1, weight * this.maxOpacity)
      this.ctx.save()
      this.ctx.translate(x, y)
      this.ctx.fillStyle = gradient
      this.ctx.beginPath()
      this.ctx.arc(0, 0, r * weight, 0, Math.PI * 2)
      this.ctx.fill()
      this.ctx.restore()
    }

    this.ctx.globalAlpha = 1
  }

  destroy(): void {
    this.canvas.remove()
  }
}
