/* Layers panel: toggle visibility of map layers with clean SVG icons. */

import { useAppStore } from '../store/useAppStore'
import type { LayerVisibility } from '../store/useAppStore'
import {
  Globe,
  Route,
  MapPin,
  Search,
  PenLine,
  Ruler,
  Radio,
  Crosshair,
  Bookmark,
  Activity,
} from 'lucide-react'

interface LayerMeta {
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

const LAYER_CONFIG: Record<keyof LayerVisibility, LayerMeta> = {
  routes: { label: 'Routes', icon: Route, color: 'text-blue-500' },
  pins: { label: 'Start/Destination pins', icon: MapPin, color: 'text-emerald-500' },
  searchResults: { label: 'Search results', icon: Search, color: 'text-rose-500' },
  shapes: { label: 'Drawn shapes', icon: PenLine, color: 'text-amber-500' },
  measure: { label: 'Measurements', icon: Ruler, color: 'text-purple-500' },
  track: { label: 'GPS track', icon: Radio, color: 'text-indigo-500' },
  userLocation: { label: 'Your location', icon: Crosshair, color: 'text-cyan-500' },
  places: { label: 'Saved places', icon: Bookmark, color: 'text-yellow-500' },
  earthquakes: { label: 'Live Earthquakes (USGS)', icon: Activity, color: 'text-red-500' },
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
      <div className="mb-3 p-2 rounded-lg bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700/60">
        <label className="flex items-center justify-between cursor-pointer">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
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
        {(Object.keys(LAYER_CONFIG) as Array<keyof LayerVisibility>).map(key => {
          const item = LAYER_CONFIG[key]
          const IconComp = item.icon
          return (
            <label
              key={key}
              className="flex items-center gap-2.5 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md px-1.5 py-1.5 transition"
            >
              <input
                type="checkbox"
                checked={layers[key]}
                onChange={() => toggleLayer(key)}
                className="accent-blue-500"
              />
              <IconComp className={`w-4 h-4 ${item.color}`} />
              <span className="flex-1 text-gray-800 dark:text-gray-200 font-medium text-xs">
                {item.label}
              </span>
            </label>
          )
        })}
      </div>
    </section>
  )
}
