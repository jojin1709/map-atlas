/* Layers panel: toggle visibility of map layers. */

import { useAppStore } from '../store/useAppStore'
import type { LayerVisibility } from '../store/useAppStore'

const LAYER_LABELS: Record<keyof LayerVisibility, string> = {
  routes: 'Routes',
  pins: 'Start/Destination pins',
  searchResults: 'Search results',
  shapes: 'Drawn shapes',
  measure: 'Measurements',
  track: 'GPS track',
  userLocation: 'Your location',
  places: 'Saved places',
  earthquakes: 'Live Earthquakes (USGS)',
}

const LAYER_ICONS: Record<keyof LayerVisibility, string> = {
  routes: '🛤',
  pins: '📍',
  searchResults: '🔍',
  shapes: '✏️',
  measure: '📏',
  track: '⏺',
  userLocation: '📡',
  places: '⭐',
  earthquakes: '🌋',
}

export default function LayersPanel() {
  const layers = useAppStore(s => s.layers)
  const toggleLayer = useAppStore(s => s.toggleLayer)
  const globeMode = useAppStore(s => s.globeMode)
  const setGlobeMode = useAppStore(s => s.setGlobeMode)

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="mb-0">Layers & View</h2>
      </div>
      <div className="mb-3 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60">
        <label className="flex items-center justify-between cursor-pointer">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌐</span>
            <div>
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">3D Globe Mode</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Spherical Earth view on zoom out</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={globeMode}
            onChange={e => setGlobeMode(e.target.checked)}
            className="w-4 h-4 accent-blue-600 rounded"
          />
        </label>
      </div>
      <div className="space-y-1">
        {(Object.keys(LAYER_LABELS) as Array<keyof LayerVisibility>).map(key => (
          <label
            key={key}
            className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-1 py-1"
          >
            <input
              type="checkbox"
              checked={layers[key]}
              onChange={() => toggleLayer(key)}
              className="accent-blue-500"
            />
            <span>{LAYER_ICONS[key]}</span>
            <span className="flex-1">{LAYER_LABELS[key]}</span>
          </label>
        ))}
      </div>
    </section>
  )
}
