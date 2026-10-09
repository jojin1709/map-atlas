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
}

export default function LayersPanel() {
  const layers = useAppStore(s => s.layers)
  const toggleLayer = useAppStore(s => s.toggleLayer)

  return (
    <section>
      <h2>Layers</h2>
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
