/* Right-click context menu on the map. */

import { useAppStore } from '../store/useAppStore'
import { coordsDMS, toDecimal } from '../services/geo'
import { getEngine } from '../services/mapRef'

export default function ContextMenu() {
  const ctx = useAppStore(s => s.contextMenu)
  const hide = useAppStore(s => s.hideContextMenu)
  const setFrom = useAppStore(s => s.setFrom)
  const setTo = useAppStore(s => s.setTo)
  const addWaypoint = useAppStore(s => s.addWaypoint)
  const addPlace = useAppStore(s => s.addPlace)
  const showToast = useAppStore(s => s.showToast)

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
        className="fixed z-[9999] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[180px]"
        style={{ left: Math.min(ctx.x, window.innerWidth - 200), top: Math.min(ctx.y, window.innerHeight - 250) }}
      >
        <div className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
          {toDecimal(p.lat, p.lng)}
          <br />
          {coordsDMS(p.lat, p.lng)}
        </div>
        <button
          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
          onClick={() => act(() => {
            setFrom(p)
            showToast('Start set')
          })}
        >
          🟢 Set as start
        </button>
        <button
          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
          onClick={() => act(() => {
            setTo(p)
            showToast('Destination set')
          })}
        >
          🔴 Set as destination
        </button>
        <button
          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
          onClick={() => act(() => {
            addWaypoint(p)
            showToast('Waypoint added')
          })}
        >
          🟡 Add waypoint
        </button>
        <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
        <button
          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
          onClick={() => act(() => {
            const name = window.prompt('Name for this place', toDecimal(p.lat, p.lng))
            if (name) {
              addPlace({ id: Date.now(), name, lat: p.lat, lng: p.lng })
              showToast(`Saved "${name}"`)
            }
          })}
        >
          ⭐ Save place
        </button>
        <button
          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
          onClick={() => act(() => {
            getEngine()?.flyTo(p.lat, p.lng, Math.max(getEngine()?.getZoom() || 15, 15))
          })}
        >
          🎯 Zoom here
        </button>
        <button
          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
          onClick={() => act(() => {
            navigator.clipboard?.writeText(`${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`)
            showToast('Coordinates copied')
          })}
        >
          📋 Copy coordinates
        </button>
      </div>
    </>
  )
}
