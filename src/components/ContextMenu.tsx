/* Right-click context menu on the map with clean vector icons. */

import { useAppStore } from '../store/useAppStore'
import { coordsDMS, toDecimal } from '../services/geo'
import { getEngine } from '../services/mapRef'
import {
  Navigation,
  Flag,
  MapPin,
  Bookmark,
  Camera,
  ZoomIn,
  Copy,
} from 'lucide-react'

export default function ContextMenu() {
  const ctx = useAppStore(s => s.contextMenu)
  const hide = useAppStore(s => s.hideContextMenu)
  const setFrom = useAppStore(s => s.setFrom)
  const setTo = useAppStore(s => s.setTo)
  const addWaypoint = useAppStore(s => s.addWaypoint)
  const addPlace = useAppStore(s => s.addPlace)
  const showToast = useAppStore(s => s.showToast)
  const setStreetViewCoord = useAppStore(s => s.setStreetViewCoord)

  if (!ctx.visible) return null

  const p = ctx.latlng

  const act = (fn: () => void) => {
    fn()
    hide()
  }

  return (
    <>
      {/* Backdrop to close */}
      <div
        className="fixed inset-0 z-[9998]"
        onClick={hide}
        onContextMenu={e => { e.preventDefault(); hide() }}
      />
      <div
        className="fixed z-[9999] bg-white dark:bg-zinc-850 rounded-xl shadow-2xl border border-gray-200 dark:border-zinc-700 py-1.5 min-w-[200px] text-gray-800 dark:text-gray-200 animate-in fade-in zoom-in-95 duration-100"
        style={{ left: Math.min(ctx.x, window.innerWidth - 220), top: Math.min(ctx.y, window.innerHeight - 300) }}
      >
        <div className="px-3.5 py-2 text-[11px] text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-zinc-750 font-mono">
          <div className="font-semibold text-gray-700 dark:text-gray-300">{toDecimal(p.lat, p.lng)}</div>
          <div className="text-[10px] opacity-80 mt-0.5">{coordsDMS(p.lat, p.lng)}</div>
        </div>

        <button
          className="w-full text-left px-3.5 py-2 text-xs hover:bg-gray-50 dark:hover:bg-zinc-750 flex items-center gap-2.5 transition"
          onClick={() => act(() => {
            setFrom(p)
            showToast('Start location set')
          })}
        >
          <Navigation className="w-3.5 h-3.5 text-emerald-500" />
          <span>Set as start</span>
        </button>

        <button
          className="w-full text-left px-3.5 py-2 text-xs hover:bg-gray-50 dark:hover:bg-zinc-750 flex items-center gap-2.5 transition"
          onClick={() => act(() => {
            setTo(p)
            showToast('Destination set')
          })}
        >
          <Flag className="w-3.5 h-3.5 text-red-500" />
          <span>Set as destination</span>
        </button>

        <button
          className="w-full text-left px-3.5 py-2 text-xs hover:bg-gray-50 dark:hover:bg-zinc-750 flex items-center gap-2.5 transition"
          onClick={() => act(() => {
            addWaypoint(p)
            showToast('Waypoint added')
          })}
        >
          <MapPin className="w-3.5 h-3.5 text-amber-500" />
          <span>Add waypoint</span>
        </button>

        <div className="border-t border-gray-100 dark:border-zinc-750 my-1" />

        <button
          className="w-full text-left px-3.5 py-2 text-xs hover:bg-gray-50 dark:hover:bg-zinc-750 flex items-center gap-2.5 transition text-sky-600 dark:text-sky-400 font-medium"
          onClick={() => act(() => {
            setStreetViewCoord(p)
          })}
        >
          <Camera className="w-3.5 h-3.5 text-sky-500" />
          <span>Street View here</span>
        </button>

        <button
          className="w-full text-left px-3.5 py-2 text-xs hover:bg-gray-50 dark:hover:bg-zinc-750 flex items-center gap-2.5 transition"
          onClick={() => act(() => {
            const name = window.prompt('Name for this place', toDecimal(p.lat, p.lng))
            if (name) {
              addPlace({ id: Date.now(), name, lat: p.lat, lng: p.lng })
              showToast(`Saved "${name}"`)
            }
          })}
        >
          <Bookmark className="w-3.5 h-3.5 text-amber-500" />
          <span>Save place</span>
        </button>

        <button
          className="w-full text-left px-3.5 py-2 text-xs hover:bg-gray-50 dark:hover:bg-zinc-750 flex items-center gap-2.5 transition"
          onClick={() => act(() => {
            getEngine()?.flyTo(p.lat, p.lng, Math.max(getEngine()?.getZoom() || 15, 15))
          })}
        >
          <ZoomIn className="w-3.5 h-3.5 text-blue-500" />
          <span>Zoom here</span>
        </button>

        <button
          className="w-full text-left px-3.5 py-2 text-xs hover:bg-gray-50 dark:hover:bg-zinc-750 flex items-center gap-2.5 transition"
          onClick={() => act(() => {
            navigator.clipboard?.writeText(`${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`)
            showToast('Coordinates copied')
          })}
        >
          <Copy className="w-3.5 h-3.5 text-gray-400" />
          <span>Copy coordinates</span>
        </button>
      </div>
    </>
  )
}
