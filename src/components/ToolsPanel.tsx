/* Tools panel: measure, draw, undo/redo, style, weather, heatmap, geolocation, track, share, clear. */

import { useState, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import * as api from '../services/api'
import { CONFIG } from '../config'
import { coordsDMS, parseGPX, parseGPXTrack, toGPX, parseGeoJSON, toGeoJSON, download } from '../services/geo'
import { getEngine } from '../services/mapRef'

export default function ToolsPanel() {
  const [weatherInfo, setWeatherInfo] = useState('')
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [heatmapOn, setHeatmapOn] = useState(false)

  const style = useAppStore(s => s.style)
  const dark = useAppStore(s => s.dark)
  const measureMode = useAppStore(s => s.measureMode)
  const drawTool = useAppStore(s => s.drawTool)
  const recording = useAppStore(s => s.recording)
  const track = useAppStore(s => s.track)
  const userLocation = useAppStore(s => s.userLocation)
  const fullscreen = useAppStore(s => s.fullscreen)
  const coordPickerMode = useAppStore(s => s.coordPickerMode)
  const canUndo = useAppStore(s => s.canUndo)
  const canRedo = useAppStore(s => s.canRedo)
  const places = useAppStore(s => s.places)
  const searchResults = useAppStore(s => s.searchResults)

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

  const toggleHeatmap = () => {
    const engine = getEngine()
    if (!engine) return
    if (heatmapOn) {
      engine.hideHeatmap()
      setHeatmapOn(false)
      return
    }
    // Build heatmap from places + search results + user location
    const pts = [
      ...places.map(p => ({ lat: p.lat, lng: p.lng, weight: 1 })),
      ...searchResults.map(r => ({ lat: r.lat, lng: r.lng, weight: 0.8 })),
    ]
    if (userLocation) pts.push({ ...userLocation, weight: 1.5 })
    if (!pts.length) {
      useAppStore.getState().showToast('No data points for heatmap — add places or search first')
      return
    }
    engine.showHeatmap(pts, { radius: 30, maxOpacity: 0.6 })
    setHeatmapOn(true)
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
    getEngine()?.hideHeatmap()
    setHeatmapOn(false)
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

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result || '')
        if (file.name.toLowerCase().endsWith('.gpx') || text.includes('<gpx')) {
          const trackRes = parseGPXTrack(text)
          if (trackRes.points.length) {
            const trackPts = trackRes.points.map((p, i) => ({
              lat: p.lat,
              lng: p.lng,
              time: Date.now() + i * 1000,
              alt: trackRes.elevations[i],
            }))
            useAppStore.getState().setTrack(trackPts)
            if (trackPts[0]) getEngine()?.flyTo(trackPts[0].lat, trackPts[0].lng, 13)
            useAppStore.getState().showToast(`Imported GPX track: ${trackPts.length} points`)
          } else {
            const wpts = parseGPX(text)
            if (wpts.length) {
              wpts.forEach(p => useAppStore.getState().addPlace(p))
              if (wpts[0]) getEngine()?.flyTo(wpts[0].lat, wpts[0].lng, 13)
              useAppStore.getState().showToast(`Imported ${wpts.length} waypoints from GPX`)
            } else {
              throw new Error('No GPS trackpoints found in GPX')
            }
          }
        } else {
          const json = JSON.parse(text)
          const imported = parseGeoJSON(json)
          if (imported.length) {
            imported.forEach(p => useAppStore.getState().addPlace(p))
            getEngine()?.flyTo(imported[0].lat, imported[0].lng, 12)
            useAppStore.getState().showToast(`Imported ${imported.length} places from GeoJSON`)
          }
        }
      } catch (err) {
        useAppStore.getState().showToast(err instanceof Error ? err.message : 'Import failed')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const exportGPX = () => {
    const store = useAppStore.getState()
    const placesToExport = store.places.length
      ? store.places
      : store.track.map((pt, i) => ({ id: i, name: `Track Pt ${i + 1}`, lat: pt.lat, lng: pt.lng }))
    if (!placesToExport.length) {
      store.showToast('No track or places to export as GPX')
      return
    }
    const gpxText = toGPX(placesToExport)
    download('atlas_track.gpx', gpxText, 'application/gpx+xml')
    store.showToast('Exported GPX file')
  }

  const exportGeoJSON = () => {
    const store = useAppStore.getState()
    if (!store.places.length) {
      store.showToast('No saved places to export as GeoJSON')
      return
    }
    const geo = toGeoJSON(store.places)
    download('atlas_places.geojson', JSON.stringify(geo, null, 2), 'application/geo+json')
    store.showToast('Exported GeoJSON file')
  }

  return (
    <section>
      <h2>Tools</h2>

      {/* Measure + Draw + Undo/Redo */}
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
        <button
          onClick={() => useAppStore.getState().undo()}
          disabled={!canUndo}
          className="ghost"
          title="Undo (Ctrl+Z)"
        >
          ↩ Undo
        </button>
        <button
          onClick={() => useAppStore.getState().redo()}
          disabled={!canRedo}
          className="ghost"
          title="Redo (Ctrl+Y)"
        >
          ↪ Redo
        </button>
        <button onClick={() => useAppStore.getState().clearShapes()} className="ghost">
          Clear shapes
        </button>
      </div>
      {drawTool !== 'none' && (
        <div className="muted text-xs mt-1">Click points, double-click to finish</div>
      )}

      {/* Style + Weather + Heatmap */}
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
        <button onClick={toggleHeatmap} className={heatmapOn ? 'active' : 'ghost'}>
          🔥
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

      {/* GPX & GeoJSON Import / Export */}
      <div className="flex gap-1.5 mt-2 flex-wrap items-center">
        <input
          ref={fileInputRef}
          type="file"
          accept=".gpx,.geojson,.json"
          onChange={handleFileImport}
          className="hidden"
          style={{ display: 'none' }}
        />
        <button onClick={() => fileInputRef.current?.click()} className="ghost" title="Import GPX or GeoJSON file">
          📂 Import GPX
        </button>
        <button onClick={exportGPX} className="ghost" title="Export current track or places as GPX">
          💾 GPX
        </button>
        <button onClick={exportGeoJSON} className="ghost" title="Export places as GeoJSON">
          💾 GeoJSON
        </button>
      </div>

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

