/* Saved places panel: list, import/export (GPX, GeoJSON, KML). */

import { useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import * as geo from '../services/geo'
import { getEngine } from '../services/mapRef'

export default function PlacesPanel() {
  const places = useAppStore(s => s.places)
  const fileRef = useRef<HTMLInputElement>(null)

  const flyTo = (lat: number, lng: number) => {
    getEngine()?.flyTo(lat, lng, 15)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result)
        const store = useAppStore.getState()
        let placeCount = 0
        let shapeCount = 0

        if (/\.gpx$/i.test(file.name)) {
          const imported = geo.parseGPX(text)
          imported.forEach(p => store.addPlace(p))
          placeCount = imported.length
        } else if (/\.kml$/i.test(file.name)) {
          const result = geo.parseKML(text)
          result.places.forEach(p => store.addPlace(p))
          placeCount = result.places.length
          // Import KML lines as shapes
          result.lines.forEach((line, i) => {
            store.addShape({ id: Date.now() + i, type: 'line', points: line.points, label: line.name })
            shapeCount++
          })
          // Import KML polygons as shapes
          result.polygons.forEach((poly, i) => {
            store.addShape({ id: Date.now() + 1000 + i, type: 'polygon', points: poly.points, label: poly.name })
            shapeCount++
          })
        } else {
          const imported = geo.parseGeoJSON(JSON.parse(text))
          imported.forEach(p => store.addPlace(p))
          placeCount = imported.length
        }

        const parts: string[] = []
        if (placeCount) parts.push(`${placeCount} places`)
        if (shapeCount) parts.push(`${shapeCount} shapes`)
        useAppStore.getState().showToast(`Imported ${parts.join(', ') || 'nothing'}`)
      } catch (err) {
        useAppStore.getState().showToast(`Import failed: ${err instanceof Error ? err.message : 'unknown error'}`)
      }
      e.target.value = ''
    }
    reader.readAsText(file)
  }

  return (
    <section>
      <h2>Saved places</h2>
      <div className="list">
        {places.length === 0 && (
          <div className="muted text-xs p-2">No saved places yet. Click the map, then "Save place".</div>
        )}
        {places.map(p => (
          <div key={p.id} className="item place">
            <span onClick={() => flyTo(p.lat, p.lng)} className="flex-1 cursor-pointer truncate">
              {p.name}
            </span>
            <button
              className="ghost small"
              onClick={() => useAppStore.getState().removePlace(p.id)}
              title="Remove"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-2 flex-wrap">
        <button
          className="ghost small"
          onClick={() => geo.download('places.geojson', JSON.stringify(geo.toGeoJSON(places), null, 2), 'application/geo+json')}
        >
          GeoJSON
        </button>
        <button
          className="ghost small"
          onClick={() => geo.download('places.gpx', geo.toGPX(places), 'application/gpx+xml')}
        >
          GPX
        </button>
        <button
          className="ghost small"
          onClick={() => geo.download('places.kml', geo.toKML(places), 'application/vnd.google-earth.kml+xml')}
        >
          KML
        </button>
        <label className="ghost small cursor-pointer">
          Import
          <input
            ref={fileRef}
            type="file"
            accept=".geojson,.json,.gpx,.kml"
            onChange={handleImport}
            className="hidden"
          />
        </label>
      </div>
    </section>
  )
}
