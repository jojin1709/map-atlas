/* Tools panel: measure, draw, style, weather, geolocation, track, share, clear. */

import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import * as api from '../services/api'
import { CONFIG } from '../config'
import { coordsDMS } from '../services/geo'
import { getEngine } from '../services/mapRef'

export default function ToolsPanel() {
  const [weatherInfo, setWeatherInfo] = useState('')
  const [weatherLoading, setWeatherLoading] = useState(false)

  const style = useAppStore(s => s.style)
  const dark = useAppStore(s => s.dark)
  const measureMode = useAppStore(s => s.measureMode)
  const drawTool = useAppStore(s => s.drawTool)
  const recording = useAppStore(s => s.recording)
  const track = useAppStore(s => s.track)
  const userLocation = useAppStore(s => s.userLocation)
  const fullscreen = useAppStore(s => s.fullscreen)
  const coordPickerMode = useAppStore(s => s.coordPickerMode)

  const getWeather = async () => {
    const map = getEngine()
    if (!map) return
    const c = map.getCenter()
    setWeatherLoading(true)
    setWeatherInfo('Fetching weather…')
    try {
      const w = await api.weather(c.lat, c.lng)
      const emoji = api.weatherCodeToEmoji(0)
      setWeatherInfo(
        `${emoji} ${w.temperature}${w.tempUnit}, wind ${w.wind} ${w.windUnit} at ${coordsDMS(c.lat, c.lng)}`
      )
    } catch (err) {
      setWeatherInfo(err instanceof Error ? err.message : 'Weather failed')
    } finally {
      setWeatherLoading(false)
    }
  }

  const locate = () => {
    if (!navigator.geolocation) {
      useAppStore.getState().showToast('Geolocation not supported')
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        useAppStore.getState().setUserLocation(p)
        getEngine()?.flyTo(p.lat, p.lng, 15)
        useAppStore.getState().showToast('Location found')
      },
      () => useAppStore.getState().showToast('Location permission denied'),
      { enableHighAccuracy: true }
    )
  }

  const share = async () => {
    const url = location.href
    try {
      await navigator.clipboard.writeText(url)
      useAppStore.getState().showToast('Share link copied')
    } catch {
      useAppStore.getState().showToast(url)
    }
  }

  const clearAll = () => {
    const store = useAppStore.getState()
    store.clearDirections()
    store.clearShapes()
    store.clearMeasure()
    store.setSearchResults([])
    useAppStore.getState().showToast('Map cleared')
  }

  const toggleTrack = () => {
    const store = useAppStore.getState()
    if (store.recording) {
      store.setRecording(false)
      useAppStore.getState().showToast(`Track saved: ${store.track.length} points`)
    } else {
      store.clearTrack()
      store.setRecording(true)
      useAppStore.getState().showToast('Recording track…')
    }
  }

  const trackDistance = (() => {
    let d = 0
    for (let i = 1; i < track.length; i++) {
      const dx = track[i].lat - track[i - 1].lat
      const dy = track[i].lng - track[i - 1].lng
      d += Math.hypot(dx, dy) * 111000
    }
    return d
  })()

  return (
    <section>
      <h2>Tools</h2>

      {/* Measure + Draw */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => useAppStore.getState().toggleMeasure()}
          className={measureMode ? 'active' : 'ghost'}
        >
          Measure
        </button>
        <button onClick={() => useAppStore.getState().clearMeasure()} className="ghost">
          Clear
        </button>
      </div>
      <div className="flex gap-1.5 mt-1 flex-wrap">
        {(['line', 'polygon', 'rectangle'] as const).map(t => (
          <button
            key={t}
            onClick={() => useAppStore.getState().setDrawTool(drawTool === t ? 'none' : t)}
            className={drawTool === t ? 'active' : 'ghost'}
          >
            {t === 'line' ? '✏ Line' : t === 'polygon' ? '⬠ Poly' : '▭ Rect'}
          </button>
        ))}
        <button onClick={() => useAppStore.getState().clearShapes()} className="ghost">
          Clear shapes
        </button>
      </div>
      {drawTool !== 'none' && (
        <div className="muted text-xs mt-1">Click points, double-click to finish</div>
      )}

      {/* Style + Weather */}
      <div className="flex gap-1.5 mt-2">
        <select
          value={style}
          onChange={e => useAppStore.getState().setStyle(e.target.value)}
          className="flex-1"
        >
          {Object.entries(CONFIG.styles).map(([k, s]) => (
            <option key={k} value={k}>{s.label}</option>
          ))}
        </select>
        <button onClick={getWeather} disabled={weatherLoading} className="ghost">
          Weather
        </button>
      </div>
      {weatherInfo && <div className="muted text-xs mt-1">{weatherInfo}</div>}

      {/* Geolocation + Track */}
      <div className="flex gap-1.5 mt-2 flex-wrap">
        <button onClick={locate} className="ghost">
          📍 Locate me
        </button>
        <button onClick={toggleTrack} className={recording ? 'active' : 'ghost'}>
          {recording ? '⏹ Stop' : '⏺ Track'}
        </button>
      </div>
      {track.length > 1 && (
        <div className="muted text-xs mt-1">
          Track: {track.length} points, ~{Math.round(trackDistance)}m
        </div>
      )}
      {userLocation && (
        <div className="muted text-xs mt-1">
          📍 {userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}
        </div>
      )}

      {/* Share + Dark + Fullscreen + Print + Coord Picker + Clear */}
      <div className="flex gap-1.5 mt-2 flex-wrap">
        <button onClick={share} className="ghost">Share</button>
        <button onClick={() => useAppStore.getState().toggleDark()} className="ghost">
          {dark ? '☀️' : '🌙'}
        </button>
        <button onClick={() => useAppStore.getState().toggleFullscreen()} className="ghost">
          {fullscreen ? '⊡' : '⛶'}
        </button>
        <button onClick={() => window.print()} className="ghost">🖨 Print</button>
        <button
          onClick={() => useAppStore.getState().setCoordPickerMode(!coordPickerMode)}
          className={coordPickerMode ? 'active' : 'ghost'}
        >
          🎯 Pick coords
        </button>
        <button onClick={clearAll} className="ghost">Clear</button>
      </div>
      {coordPickerMode && (
        <div className="muted text-xs mt-1">Click the map to copy coordinates</div>
      )}
    </section>
  )
}
