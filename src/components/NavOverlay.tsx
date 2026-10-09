/* Turn-by-turn navigation overlay: shows active maneuver with distance countdown. */

import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { formatDistance, haversine } from '../services/geo'
import { describeStep } from '../services/api'
import { getEngine } from '../services/mapRef'
import type { OSRMStep } from '../types'

function maneuverIcon(type: string, modifier?: string): string {
  if (type === 'depart') return '🚩'
  if (type === 'arrive') return '🏁'
  if (type === 'roundabout' || type === 'rotary') return '🔄'
  if (modifier?.includes('left')) return '⬅️'
  if (modifier?.includes('right')) return '➡️'
  if (modifier?.includes('straight') || type === 'continue') return '⬆️'
  if (modifier?.includes('uturn')) return '↩️'
  return '⬆️'
}

export default function NavOverlay() {
  const [activeStep, setActiveStep] = useState(0)
  const [distToNext, setDistToNext] = useState(0)
  const [navActive, setNavActive] = useState(false)

  const routes = useAppStore(s => s.routes)
  const routeIndex = useAppStore(s => s.routeIndex)
  const userLocation = useAppStore(s => s.userLocation)

  const route = routes[routeIndex]
  const steps: OSRMStep[] = route?.legs.flatMap(l => l.steps) || []

  useEffect(() => {
    if (!navActive || !userLocation || !steps.length) return
    // Find nearest step to user
    let bestIdx = 0
    let bestDist = Infinity
    for (let i = activeStep; i < Math.min(activeStep + 5, steps.length); i++) {
      const loc = steps[i].maneuver.location
      if (!loc || (!loc[0] && !loc[1])) continue
      const d = haversine(userLocation, { lat: loc[1], lng: loc[0] })
      if (d < bestDist) {
        bestDist = d
        bestIdx = i
      }
    }
    setActiveStep(bestIdx)
    const nextLoc = steps[bestIdx]?.maneuver.location
    if (nextLoc && (nextLoc[0] || nextLoc[1])) {
      setDistToNext(haversine(userLocation, { lat: nextLoc[1], lng: nextLoc[0] }))
    }
  }, [userLocation, navActive, steps, activeStep])

  useEffect(() => {
    if (navActive && userLocation) {
      const engine = getEngine()
      if (engine) engine.flyTo(userLocation.lat, userLocation.lng, 16)
    }
  }, [navActive, userLocation])

  if (!route || !steps.length) return null

  // If nav not active, show start button
  if (!navActive) {
    return (
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20">
        <button
          onClick={() => setNavActive(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg font-medium hover:bg-blue-700 transition"
        >
          🧭 Start Navigation
        </button>
      </div>
    )
  }

  const step = steps[activeStep]
  if (!step) return null
  const isLast = activeStep >= steps.length - 1

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-80 max-w-[90vw]">
      {/* Main maneuver card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Top: distance + icon */}
        <div className="bg-blue-600 text-white px-4 py-3 flex items-center gap-3">
          <span className="text-3xl">{maneuverIcon(step.maneuver.type, step.maneuver.modifier)}</span>
          <div className="flex-1 min-w-0">
            <div className="text-2xl font-bold leading-tight">
              {isLast ? 'Arrive' : formatDistance(distToNext || step.distance)}
            </div>
            <div className="text-sm opacity-90 truncate">
              {isLast ? 'at destination' : describeStep(step).replace(/^(Turn|Continue|Go|Depart)\s*/i, '') || 'Continue'}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-green-500 transition-all duration-500"
            style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Bottom: step counter + controls */}
        <div className="px-4 py-2 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
          <span>Step {activeStep + 1} of {steps.length}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
              disabled={activeStep === 0}
              className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40"
            >
              ←
            </button>
            <button
              onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))}
              disabled={isLast}
              className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40"
            >
              →
            </button>
            <button
              onClick={() => setNavActive(false)}
              className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* Next step preview */}
      {activeStep + 1 < steps.length && (
        <div className="mt-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-lg shadow px-4 py-2 text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
          <span>{maneuverIcon(steps[activeStep + 1].maneuver.type, steps[activeStep + 1].maneuver.modifier)}</span>
          <span className="truncate">Then: {describeStep(steps[activeStep + 1])}</span>
        </div>
      )}
    </div>
  )
}
