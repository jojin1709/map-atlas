/* Safe global access for map engine reference shared between components. */

import type { MapEngine } from '../engine/MapEngine'
import type { LatLng } from '../types'

declare global {
  interface Window {
    __mapEngine?: () => MapEngine | null
    __mapOpenPopup?: (p: LatLng, title?: string) => void
  }
}

export function getEngine(): MapEngine | null {
  return window.__mapEngine?.() ?? null
}

export function openPopup(p: LatLng, title?: string): void {
  window.__mapOpenPopup?.(p, title)
}
