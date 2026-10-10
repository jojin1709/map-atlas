/* Turn-by-turn navigation HUD: real-time GPS tracking, voice guidance, and mobile-friendly turn cards. */

import { useEffect, useState, useRef, useCallback } from 'react'
import { useAppStore } from '../store/useAppStore'
import { formatDistance, formatDuration, haversine } from '../services/geo'
import { describeStep } from '../services/api'
import { getEngine } from '../services/mapRef'
import type { OSRMStep, LatLng } from '../types'
import {
  CornerUpLeft,
  CornerUpRight,
  ArrowUp,
  RotateCcw,
  Flag,
  Volume2,
  VolumeX,
  X,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  CheckCircle2,
} from 'lucide-react'

function StepIcon({ type, modifier, className = 'w-7 h-7' }: { type: string; modifier?: string; className?: string }) {
  if (type === 'arrive') return <Flag className={`${className} text-emerald-400`} />
  if (type === 'roundabout' || type === 'rotary') return <RotateCcw className={`${className} text-sky-400`} />
  if (modifier?.includes('left')) return <CornerUpLeft className={`${className} text-white`} />
  if (modifier?.includes('right')) return <CornerUpRight className={`${className} text-white`} />
  if (modifier?.includes('uturn')) return <RotateCcw className={`${className} text-white`} />
  return <ArrowUp className={`${className} text-white`} />
}

export default function NavOverlay() {
  const [activeStep, setActiveStep] = useState(0)
  const [distToNext, setDistToNext] = useState(0)
  const [autoCenter, setAutoCenter] = useState(true)
  const [isOfflineReady, setIsOfflineReady] = useState(false)

  const routes = useAppStore(s => s.routes)
  const routeIndex = useAppStore(s => s.routeIndex)
  const userLocation = useAppStore(s => s.userLocation)
  const navActive = useAppStore(s => s.navActive)
  const setNavActive = useAppStore(s => s.setNavActive)
  const voiceEnabled = useAppStore(s => s.voiceNavEnabled)
  const toggleVoice = useAppStore(s => s.toggleVoiceNav)
  const setUserLocation = useAppStore(s => s.setUserLocation)

  const watchIdRef = useRef<number | null>(null)
  const lastSpokenRef = useRef<number>(-1)

  const route = routes[routeIndex]
  const steps: OSRMStep[] = route?.legs.flatMap(l => l.steps) || []

  // Check if route is cached offline
  useEffect(() => {
    try {
      const cached = localStorage.getItem('mapapp.offlineRoute')
      setIsOfflineReady(!!cached)
    } catch {
      setIsOfflineReady(false)
    }
  }, [route])

  // Speech announcement helper
  const speakInstruction = useCallback((text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return
    try {
      window.speechSynthesis.cancel() // cancel previous utterance
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.0
      utterance.pitch = 1.0
      window.speechSynthesis.speak(utterance)
    } catch {
      // speech synthesis unavailable or blocked
    }
  }, [voiceEnabled])

  // Activate real-time phone GPS tracking when navigation starts
  useEffect(() => {
    if (!navActive) {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      return
    }

    // Automatically collapse side panel so phone / PC has full map view
    useAppStore.getState().closePanel()

    // Speak initial instruction
    if (steps.length > 0) {
      const firstText = describeStep(steps[0])
      speakInstruction(`Starting navigation. ${firstText}`)
      lastSpokenRef.current = 0
    }

    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        pos => {
          const pt: LatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setUserLocation(pt)
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
      )
    }

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [navActive, setUserLocation, steps, speakInstruction])

  // Real-time step tracking & distance calculation
  useEffect(() => {
    if (!navActive || !userLocation || !steps.length) return

    // Find nearest step within a reasonable forward window
    let bestIdx = activeStep
    let bestDist = Infinity

    for (let i = activeStep; i < Math.min(activeStep + 4, steps.length); i++) {
      const loc = steps[i].maneuver.location
      if (!loc || (!loc[0] && !loc[1])) continue
      const d = haversine(userLocation, { lat: loc[1], lng: loc[0] })
      if (d < bestDist) {
        bestDist = d
        bestIdx = i
      }
    }

    // Auto-advance step if within 25 meters of the maneuver
    if (bestDist < 25 && bestIdx < steps.length - 1) {
      bestIdx = bestIdx + 1
    }

    setActiveStep(bestIdx)

    const curLoc = steps[bestIdx]?.maneuver.location
    if (curLoc && (curLoc[0] || curLoc[1])) {
      const d = haversine(userLocation, { lat: curLoc[1], lng: curLoc[0] })
      setDistToNext(d)

      // Announce step if changed
      if (lastSpokenRef.current !== bestIdx) {
        lastSpokenRef.current = bestIdx
        const text = describeStep(steps[bestIdx])
        speakInstruction(text)
      }
    }

    // Auto-center camera to phone position
    if (autoCenter) {
      const engine = getEngine()
      if (engine) engine.flyTo(userLocation.lat, userLocation.lng, 17)
    }
  }, [userLocation, navActive, steps, activeStep, autoCenter, speakInstruction])

  if (!navActive || !route || !steps.length) return null

  const step = steps[activeStep]
  if (!step) return null
  const isLast = activeStep >= steps.length - 1

  // Compute remaining distance & ETA
  const remainingDistance = steps.slice(activeStep).reduce((acc, s) => acc + s.distance, 0)
  const remainingDurationSec = (remainingDistance / Math.max(1, route.distance)) * route.duration
  const etaDate = new Date(Date.now() + remainingDurationSec * 1000)
  const etaString = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const nextStep = activeStep + 1 < steps.length ? steps[activeStep + 1] : null

  return (
    <div className="fixed inset-x-0 inset-y-0 pointer-events-none z-40 flex flex-col justify-between p-3 sm:p-5">
      {/* Top GPS Maneuver Card */}
      <div className="pointer-events-auto max-w-lg w-full mx-auto animate-in slide-in-from-top-4 duration-300">
        <div className="bg-zinc-950/95 dark:bg-zinc-900/95 text-white rounded-2xl shadow-2xl border border-zinc-800 backdrop-blur-md overflow-hidden">
          {/* Main Direction Banner */}
          <div className="px-4 py-3.5 flex items-center gap-3.5 bg-gradient-to-r from-emerald-650 via-emerald-600 to-teal-600 text-white">
            <div className="w-12 h-12 rounded-xl bg-black/25 flex items-center justify-center shrink-0 shadow-inner">
              <StepIcon type={step.maneuver.type} modifier={step.maneuver.modifier} className="w-7 h-7" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-none">
                {isLast ? 'Arriving' : formatDistance(distToNext || step.distance)}
              </div>
              <div className="text-sm font-semibold truncate opacity-95 mt-1">
                {isLast ? 'At your destination' : describeStep(step)}
              </div>
            </div>

            {/* Quick exit */}
            <button
              onClick={() => setNavActive(false)}
              className="w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center shrink-0 transition"
              title="Exit navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sub-instruction: then next maneuver */}
          {nextStep && (
            <div className="px-4 py-2 bg-zinc-900 text-xs text-zinc-300 flex items-center gap-2 border-t border-zinc-800">
              <StepIcon type={nextStep.maneuver.type} modifier={nextStep.maneuver.modifier} className="w-4 h-4 text-zinc-400" />
              <span className="truncate">Then: {describeStep(nextStep)}</span>
            </div>
          )}

          {/* Progress bar */}
          <div className="h-1 bg-zinc-800">
            <div
              className="h-full bg-emerald-400 transition-all duration-300"
              style={{ width: `${Math.min(100, ((activeStep + 1) / steps.length) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Phone/Mobile Navigation HUD */}
      <div className="pointer-events-auto max-w-lg w-full mx-auto animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-800 p-3 flex items-center justify-between gap-2">
          {/* Left: ETA & Duration */}
          <div className="min-w-0">
            <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100 leading-none">
              {etaString}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate mt-1">
              <span>{formatDuration(remainingDurationSec)}</span>
              <span className="mx-1">·</span>
              <span>{formatDistance(remainingDistance)}</span>
            </div>
          </div>

          {/* Center: Controls & Step Skipper */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Re-center Camera */}
            <button
              onClick={() => {
                setAutoCenter(!autoCenter)
                if (userLocation) getEngine()?.flyTo(userLocation.lat, userLocation.lng, 17)
              }}
              className={`p-2 rounded-xl border text-xs font-semibold transition flex items-center gap-1 ${
                autoCenter
                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                  : 'bg-gray-100 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300'
              }`}
              title="Auto-center camera on you"
            >
              <Crosshair className="w-4 h-4" />
            </button>

            {/* Voice Guidance Toggle */}
            <button
              onClick={toggleVoice}
              className={`p-2 rounded-xl border text-xs font-semibold transition ${
                voiceEnabled
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                  : 'bg-gray-100 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-400'
              }`}
              title={voiceEnabled ? 'Voice navigation on' : 'Voice navigation muted'}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Prev step */}
            <button
              onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
              disabled={activeStep === 0}
              className="p-2 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 disabled:opacity-40 transition"
              title="Previous turn"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Next step */}
            <button
              onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))}
              disabled={isLast}
              className="p-2 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 disabled:opacity-40 transition"
              title="Next turn"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* End Navigation */}
            <button
              onClick={() => setNavActive(false)}
              className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Exit</span>
            </button>
          </div>
        </div>

        {/* Offline notice pill */}
        {isOfflineReady && (
          <div className="mt-1.5 flex items-center justify-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>100% Offline GPS Navigation Ready</span>
          </div>
        )}
      </div>
    </div>
  )
}
