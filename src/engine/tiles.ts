/* Tile layer management: creation, caching, cleanup, retina support. */

import { TILE_SIZE } from './projection'

export interface TileLayerConfig {
  template: string
  attribution?: string
  retina?: boolean
  opacity?: number
}

export class TileLayer {
  private container: HTMLElement
  private imgs = new Map<string, HTMLImageElement>()
  private template: string
  private opacity: number | undefined

  constructor(
    container: HTMLElement,
    attributionEl: HTMLElement | null,
    config: TileLayerConfig
  ) {
    this.container = container
    this.template = config.template
    this.opacity = config.opacity
    if (config.attribution && attributionEl) {
      attributionEl.innerHTML = config.attribution
    }
  }

  setTemplate(template: string): void {
    this.template = template
    this.clear()
  }

  clear(): void {
    for (const img of this.imgs.values()) img.remove()
    this.imgs.clear()
  }

  draw(ox: number, oy: number, w: number, h: number, zoom: number, dpr: number): void {
    const n = Math.pow(2, zoom)
    const tileSize = TILE_SIZE
    const x0 = Math.floor(ox / tileSize)
    const x1 = Math.floor((ox + w) / tileSize)
    const y0 = Math.floor(oy / tileSize)
    const y1 = Math.floor((oy + h) / tileSize)
    const wanted = new Set<string>()

    for (let ty = y0; ty <= y1; ty++) {
      if (ty < 0 || ty >= n) continue
      for (let tx = x0; tx <= x1; tx++) {
        const wrappedX = ((tx % n) + n) % n
        const key = `${zoom}/${tx}/${ty}`
        wanted.add(key)

        let img = this.imgs.get(key)
        if (!img) {
          img = document.createElement('img')
          img.className = 'me-tile'
          img.alt = ''
          img.draggable = false
          img.width = tileSize
          img.height = tileSize
          if (this.opacity !== undefined) {
            img.style.opacity = String(this.opacity)
          }

          let url = this.template
            .replace('{z}', String(zoom))
            .replace('{x}', String(wrappedX))
            .replace('{y}', String(ty))
          
          if (url.includes('{r}')) {
            url = url.replace('{r}', dpr >= 2 ? '@2x' : '')
          }

          img.src = url
          img.onerror = () => {
            const currentSrc = img?.getAttribute('src') || ''
            if (currentSrc.includes('@2x')) {
              img!.src = currentSrc.replace('@2x', '')
            } else {
              img?.classList.add('missing')
            }
          }
          this.container.appendChild(img)
          this.imgs.set(key, img)
        }
        img.style.transform = `translate3d(${tx * tileSize - ox}px,${ty * tileSize - oy}px,0)`
      }
    }

    for (const [key, img] of this.imgs) {
      if (!wanted.has(key)) {
        img.remove()
        this.imgs.delete(key)
      }
    }
  }

  destroy(): void {
    this.clear()
  }
}
