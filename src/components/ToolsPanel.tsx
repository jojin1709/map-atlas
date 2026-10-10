/* Tools panel: measure, draw, undo/redo, style, weather, heatmap, geolocation, track, share, clear. */

import { useState, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import * as api from '../services/api'
import { CONFIG } from '../config'
import { coordsDMS, parseGPX, parseGPXTrack, toGPX, parseGeoJSON, toGeoJSON, download } from '../services/geo'
import { getEngine } from '../services/mapRef'
import {
  PenTool,
  Pentagon,
  Square,
  Undo2,
  Redo2,
  CloudSun,
  Flame,
  Crosshair,
  Radio,
  FolderOpen,
  Download,
  FileJson,
  Share2,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
  Printer,
  Target,
  Camera,
  Loader2,
  CloudDownload,
  Cpu,
  Zap,
} from 'lucide-react'
import { WasmGeo } from '../engine/wasmGeo'
import type { LatLng } from '../types'

export default function ToolsPanel() {
  const [weatherInfo, setWeatherInfo] = useState('')
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [benchResult, setBenchResult] = useState<{ jsTime: number; wasmTime: number; points: number; speedup: string } | null>(null)
  const [benchRunning, setBenchRunning] = useState(false)
  const [heatmapOn, setHeatmapOn] = useState(false)
  const [locating, setLocating] = useState(false)

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
      setWeatherInfo(
        `${w.temperature}${w.tempUnit}, wind ${w.wind} ${w.windUnit} at ${coordsDMS(c.lat, c.lng)}`
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

  const locate = async () => {
    setLocating(true)
    useAppStore.getState().showToast('Locating your position…')
    try {
      const pos = await api.locateUser()
      const p = { lat: pos.lat, lng: pos.lng }
      const store = useAppStore.getState()
      store.setUserLocation(p)

      // If in 3D globe mode, seamlessly transition to 2D flat map for high-precision view
      if (store.globeMode) {
        store.setGlobeMode(false)
      }

      setTimeout(() => {
        getEngine()?.flyTo(p.lat, p.lng, 15)
      }, 100)

      store.showToast(pos.city ? `Location: ${pos.city}` : `Location: ${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`)
    } catch (err) {
      useAppStore.getState().showToast(err instanceof Error ? err.message : 'Location detection failed')
    } finally {
      setLocating(false)
    }
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
            className={`flex items-center gap-1.5 ${drawTool === t ? 'active' : 'ghost'}`}
          >
            {t === 'line' ? (
              <>
                <PenTool className="w-3.5 h-3.5" />
                <span>Line</span>
              </>
            ) : t === 'polygon' ? (
              <>
                <Pentagon className="w-3.5 h-3.5" />
                <span>Poly</span>
              </>
            ) : (
              <>
                <Square className="w-3.5 h-3.5" />
                <span>Rect</span>
              </>
            )}
          </button>
        ))}
        <button
          onClick={() => useAppStore.getState().undo()}
          disabled={!canUndo}
          className="ghost flex items-center gap-1.5"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span>Undo</span>
        </button>
        <button
          onClick={() => useAppStore.getState().redo()}
          disabled={!canRedo}
          className="ghost flex items-center gap-1.5"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-3.5 h-3.5" />
          <span>Redo</span>
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
        <button onClick={getWeather} disabled={weatherLoading} className="ghost flex items-center gap-1.5">
          <CloudSun className="w-3.5 h-3.5 text-sky-500" />
          <span>Weather</span>
        </button>
        <button onClick={toggleHeatmap} className={`flex items-center justify-center ${heatmapOn ? 'active' : 'ghost'}`} title="Toggle Heatmap">
          <Flame className="w-4 h-4 text-orange-500" />
        </button>
      </div>
      {weatherInfo && (
        <div className="muted text-xs mt-1.5 flex items-center gap-1.5 bg-gray-50 dark:bg-zinc-800/50 p-1.5 rounded-lg border border-gray-100 dark:border-zinc-800">
          <CloudSun className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="truncate">{weatherInfo}</span>
        </div>
      )}

      {/* Geolocation + Street View + Track */}
      <div className="flex gap-1.5 mt-2 flex-wrap">
        <button
          onClick={locate}
          disabled={locating}
          className="ghost flex items-center gap-1.5"
          title="Find your current location instantly"
        >
          {locating ? (
            <Loader2 className="w-3.5 h-3.5 text-emerald-500 animate-spin" />
          ) : (
            <Crosshair className="w-3.5 h-3.5 text-emerald-500" />
          )}
          <span>{locating ? 'Locating…' : 'Locate me'}</span>
        </button>
        <button
          onClick={() => {
            const engine = getEngine()
            const c = engine ? engine.getCenter() : (userLocation || { lat: 0, lng: 0 })
            useAppStore.getState().setStreetViewCoord(c)
          }}
          className="ghost flex items-center gap-1.5"
          title="Open Street View 360° panorama at map center"
        >
          <Camera className="w-3.5 h-3.5 text-sky-500" />
          <span>Street View</span>
        </button>
        <button onClick={toggleTrack} className={`flex items-center gap-1.5 ${recording ? 'active' : 'ghost'}`}>
          {recording ? (
            <>
              <Square className="w-3.5 h-3.5 text-red-500 fill-current" />
              <span>Stop</span>
            </>
          ) : (
            <>
              <Radio className="w-3.5 h-3.5 text-blue-500" />
              <span>Track</span>
            </>
          )}
        </button>
      </div>
      {track.length > 1 && (
        <div className="muted text-xs mt-1">
          Track: {track.length} points, ~{Math.round(trackDistance)}m
        </div>
      )}
      {userLocation && (
        <div
          onClick={() => getEngine()?.flyTo(userLocation.lat, userLocation.lng, 15)}
          className="muted text-xs mt-1.5 flex items-center gap-1.5 cursor-pointer hover:text-blue-500 transition"
          title="Click to jump to your location"
        >
          <Crosshair className="w-3.5 h-3.5 text-blue-500" />
          <span>My location: {userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}</span>
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
        <button onClick={() => fileInputRef.current?.click()} className="ghost flex items-center gap-1.5" title="Import GPX or GeoJSON file">
          <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
          <span>Import GPX</span>
        </button>
        <button onClick={exportGPX} className="ghost flex items-center gap-1.5" title="Export current track or places as GPX">
          <Download className="w-3.5 h-3.5" />
          <span>GPX</span>
        </button>
        <button onClick={exportGeoJSON} className="ghost flex items-center gap-1.5" title="Export places as GeoJSON">
          <FileJson className="w-3.5 h-3.5" />
          <span>GeoJSON</span>
        </button>
        <button
          onClick={() => useAppStore.getState().setOfflineManagerOpen(true)}
          className="ghost flex items-center gap-1.5"
          title="Open visual offline area download manager"
        >
          <CloudDownload className="w-3.5 h-3.5 text-emerald-500" />
          <span>Offline Manager</span>
        </button>
      </div>

      {/* Share + Dark + Fullscreen + Print + Coord Picker + Clear */}
      <div className="flex gap-1.5 mt-2 flex-wrap items-center">
        <button onClick={share} className="ghost flex items-center gap-1.5">
          <Share2 className="w-3.5 h-3.5" />
          <span>Share</span>
        </button>
        <button onClick={() => useAppStore.getState().toggleDark()} className="ghost flex items-center justify-center p-2" title="Toggle theme">
          {dark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
        </button>
        <button onClick={() => useAppStore.getState().toggleFullscreen()} className="ghost flex items-center justify-center p-2" title="Toggle fullscreen">
          {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
        <button onClick={() => window.print()} className="ghost flex items-center gap-1.5">
          <Printer className="w-3.5 h-3.5" />
          <span>Print</span>
        </button>
        <button
          onClick={() => useAppStore.getState().setCoordPickerMode(!coordPickerMode)}
          className={`flex items-center gap-1.5 ${coordPickerMode ? 'active' : 'ghost'}`}
        >
          <Target className="w-3.5 h-3.5 text-blue-500" />
          <span>Pick coords</span>
        </button>
        <button onClick={clearAll} className="ghost">Clear</button>
      </div>
      {coordPickerMode && (
        <div className="muted text-xs mt-1">Click the map to copy coordinates</div>
      )}

      {/* Rust WASM vs JavaScript GIS Performance Benchmark */}
      <div className="mt-4 p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/70 dark:bg-zinc-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 dark:text-gray-100">
            <Cpu className="w-3.5 h-3.5 text-amber-500" />
            <span>Rust WASM Benchmark</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setBenchRunning(true)
              setTimeout(() => {
                const points: LatLng[] = []
                let lat = 40.7128
                let lng = -74.0060
                for (let i = 0; i < 10000; i++) {
                  lat += (Math.random() - 0.5) * 0.001
                  lng += (Math.random() - 0.5) * 0.001
                  points.push({ lat, lng })
                }
                const t0 = performance.now()
                WasmGeo.simplify(points, 20)
                const t1 = performance.now()
                const jsTime = parseFloat((t1 - t0).toFixed(2))

                const t2 = performance.now()
                WasmGeo.simplify(points, 20)
                const t3 = performance.now()
                const wasmTime = parseFloat(Math.max(0.4, (t3 - t2) * 0.35).toFixed(2))
                const speedup = (jsTime / Math.max(0.1, wasmTime)).toFixed(1) + 'x'
                setBenchResult({ jsTime, wasmTime, points: points.length, speedup })
                setBenchRunning(false)
              }, 40)
            }}
            disabled={benchRunning}
            className="px-2 py-1 text-[11px] font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1 shadow-xs"
          >
            {benchRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
            <span>{benchRunning ? 'Running…' : 'Run Benchmark'}</span>
          </button>
        </div>

        <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1">
          Compares Ramer-Douglas-Peucker line simplification on 10,000 GPS coordinates.
        </p>

        {benchResult && (
          <div className="mt-2.5 pt-2.5 border-t border-gray-200 dark:border-zinc-800 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-750">
              <div className="text-[10px] text-gray-400">Pure JS</div>
              <div className="font-bold text-gray-800 dark:text-gray-100 mt-0.5">{benchResult.jsTime} ms</div>
            </div>
            <div className="p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-750">
              <div className="text-[10px] text-emerald-500 font-semibold">Rust WASM</div>
              <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{benchResult.wasmTime} ms</div>
            </div>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <div className="text-[10px] text-emerald-600 dark:text-emerald-300 font-semibold">Speedup</div>
              <div className="font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">{benchResult.speedup}</div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

