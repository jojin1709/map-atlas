<div align="center">

# 🗺 Map Atlas

**A modern, open-source web map with a custom dependency-free engine.**

No Leaflet. No Mapbox. No Google Maps. Just TypeScript, React, and pure engineering.

[![npm](https://img.shields.io/npm/v/map-atlas?logo=npm&color=CB3837)](https://www.npmjs.com/package/map-atlas)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

[Live Demo](https://mapapp-lovat.vercel.app) · [npm](https://www.npmjs.com/package/map-atlas) · [Report Bug](https://github.com/jojin1709/map-atlas/issues)

</div>

---

## Install

```bash
npm i map-atlas
# or
yarn add map-atlas
# or
pnpm add map-atlas
```

Peer dependencies (you likely already have them):

```bash
npm install react react-dom
```

### CDN (no build step)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/map-atlas@1.0.1/dist/map-atlas.css" />
<script type="module">
  import { MapEngine } from 'https://cdn.jsdelivr.net/npm/map-atlas@1.0.1/dist/map-atlas.js'

  const map = new MapEngine('#map', {
    center: [51.5, -0.12],
    zoom: 13,
    tileUrls: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
  })

  map.addMarker({ lat: 51.5074, lng: -0.1278 }, { label: 'London' })
</script>
```

> **Note:** The ESM bundle imports `react/jsx-runtime`. For vanilla JS CDN use, you can load the CJS bundle via a bundler, or use the ESM build with an import map. For production apps, `npm i map-atlas` is recommended.

---

## Usage

### React — drop-in component

```tsx
import { MapAtlas } from 'map-atlas'
import 'map-atlas/styles.css'

export default function App() {
  return (
    <div style={{ height: '100vh' }}>
      <MapAtlas
        center={[51.5, -0.12]}
        zoom={13}
        tileStyle="dark"
        markers={[
          { lat: 51.5074, lng: -0.1278, label: 'London' },
          { lat: 48.8566, lng: 2.3522, label: 'Paris' },
        ]}
        polylines={[
          {
            points: [
              { lat: 51.5074, lng: -0.1278 },
              { lat: 48.8566, lng: 2.3522 },
            ],
            color: '#1a73e8',
            weight: 3,
          },
        ]}
        onMapClick={(latlng) => console.log('Clicked:', latlng)}
      />
    </div>
  )
}
```

### React — all props

```tsx
<MapAtlas
  center={[lat, lng]}          // [number, number]
  zoom={12}                     // number
  minZoom={1}                   // number
  maxZoom={19}                  // number
  tileStyle="dark"             // 'osm' | 'satellite' | 'dark' | 'topo' | 'humanitarian' | 'cyclosm'
  tileUrl="https://..."         // custom tile URL (overrides style)
  attribution="..."             // override attribution
  markers={[]}                  // MapAtlasMarker[]
  polylines={[]}                // MapAtlasPolyline[]
  polygons={[]}                 // MapAtlasPolygon[]
  keyboard={true}               // arrow keys + +/- to zoom
  inertia={true}                // smooth pan glide
  scaleBar={true}               // show scale bar
  className="my-map"            // container CSS class
  cssStyle={{ borderRadius: 8 }}  // container inline styles
  onMapClick={(latlng, e) => {}} // click handler
  onViewChange={(center, zoom) => {}} // view change handler
  onEngineReady={(engine) => {}}     // raw MapEngine access
/>
```

### Vanilla JavaScript / any framework

```ts
import { MapEngine, TILE_STYLES } from 'map-atlas'
import 'map-atlas/styles.css'

const engine = new MapEngine('#map-container', {
  center: [40.7128, -74.006],
  zoom: 12,
  tileUrls: TILE_STYLES.dark.tiles,
  attribution: TILE_STYLES.dark.attribution,
  keyboard: true,
  inertia: true,
  scaleBar: true,
})

// Events
engine.on('click', ({ latlng }) => console.log(latlng))
engine.on('moveend', () => console.log(engine.getCenter(), engine.getZoom()))

// Overlays
const marker = engine.addMarker({ lat: 40.7128, lng: -74.006 }, {
  label: 'NYC',
  color: '#e53935',
  size: 14,
})

const line = engine.addPolyline(
  [
    { lat: 40.7128, lng: -74.006 },
    { lat: 34.0522, lng: -118.2437 },
  ],
  { color: '#1a73e8', weight: 3, dash: '6 4' }
)

const poly = engine.addPolygon(
  [
    { lat: 40.8, lng: -74.1 },
    { lat: 40.8, lng: -73.9 },
    { lat: 40.6, lng: -73.9 },
    { lat: 40.6, lng: -74.1 },
  ],
  { fill: 'rgba(26,115,232,0.2)', color: '#1a73e8' }
)

// Navigation
engine.setView(51.5, -0.12, 14)
engine.flyTo(48.8566, 2.3522, 12, 800)
engine.fitBounds([
  { lat: 40.7, lng: -74.1 },
  { lat: 40.5, lng: -73.7 },
])

// Popup
const el = document.createElement('div')
el.textContent = 'Hello from Map Atlas!'
engine.openPopup({ lat: 40.7128, lng: -74.006 }, el)

// Cleanup
marker.remove()
line.remove()
engine.destroy()
```

### Tile styles

```ts
import { TILE_STYLES } from 'map-atlas'

// Built-in presets:
TILE_STYLES.osm          // Street
TILE_STYLES.satellite    // Satellite (Esri)
TILE_STYLES.dark         // Dark (CARTO)
TILE_STYLES.topo         // Topographic (OpenTopoMap)
TILE_STYLES.humanitarian // Humanitarian (HOT)
TILE_STYLES.cyclosm      // Cycling (CyclOSM)

// Use any preset:
engine.setTiles(TILE_STYLES.satellite.tiles, TILE_STYLES.satellite.attribution)

// Or use a custom URL:
engine.setTiles('https://my-tiles.example.com/{z}/{x}/{y}.png', '© Me')
```

### Geocoding & search

```ts
import { geocode, reverse } from 'map-atlas'

// Forward geocode
const results = await geocode('Times Square')
// [{ label: 'Times Square, Manhattan, NY', lat: 40.758, lng: -73.9855, ... }]

// Reverse geocode
const address = await reverse(40.758, -73.9855)
// 'Times Square, Manhattan, New York, NY 10036, USA'
```

### Routing

```ts
import { route } from 'map-atlas'

const routes = await route(
  'driving',  // 'driving' | 'walking' | 'cycling'
  [
    { lat: 40.7128, lng: -74.006 },
    { lat: 40.758, lng: -73.9855 },
  ]
)

const r = routes[0]
// r.distance  — meters
// r.duration  — seconds
// r.geometry  — { coordinates: [[lng, lat], ...] }
// r.legs      — turn-by-turn steps
```

### Elevation & weather

```ts
import { elevationBatch, weather } from 'map-atlas'

const elevations = await elevationBatch([
  { lat: 40.7128, lng: -74.006 },
  { lat: 40.758, lng: -73.9855 },
])
// [{ lat, lng, elevation }, ...]

const w = await weather(40.7128, -74.006)
// { temperature: 22, tempUnit: '°C', wind: 5.2, windUnit: 'km/h' }
```

### Geo file import/export

```ts
import {
  parseGPX, toGPX,
  parseGeoJSON, toGeoJSON,
  parseKML, toKML,
  download,
} from 'map-atlas'

// Parse GPX
const places = parseGPX(gpxXmlString)

// Parse GeoJSON (FeatureCollection with Points)
const places2 = parseGeoJSON(geoJsonObject)

// Parse KML (points, lines, polygons, MultiGeometry)
const { places: p, lines, polygons } = parseKML(kmlString)

// Export
download('places.gpx', toGPX(places), 'application/gpx+xml')
download('places.json', JSON.stringify(toGeoJSON(places)), 'application/json')
download('places.kml', toKML(places), 'application/vnd.google-earth.kml+xml')
```

### Distance & formatting

```ts
import { haversine, formatDistance, formatDuration, toDMS } from 'map-atlas'

const meters = haversine(
  { lat: 51.5074, lng: -0.1278 },
  { lat: 48.8566, lng: 2.3522 }
)
// 343551.9...

formatDistance(meters)  // "343.55 km"
formatDuration(3600)    // "1 h 0 min"
toDMS(48.8566, 'N', 'S') // "48°51′23.8″N"
```

### Projection (advanced)

```ts
import { project, unproject } from 'map-atlas'

// lat/lng → pixel coordinates at a zoom level
const pixel = project(51.5, -0.12, 13)

// pixel → lat/lng
const latlng = unproject(pixel.x, pixel.y, 13)
```

---

## API Reference

### `MapEngine`

| Method | Signature | Description |
|--------|-----------|-------------|
| `constructor` | `new MapEngine(container, opts?)` | Create map on element or selector |
| `on` | `on(event, handler)` | Subscribe to events (`click`, `mousemove`, `moveend`, `zoomend`) |
| `off` | `off(event, handler)` | Unsubscribe |
| `setTiles` | `setTiles(template[], attribution?)` | Change tile layer |
| `addMarker` | `addMarker(latlng, style?)` | Add marker → `LayerHandle` |
| `addPolyline` | `addPolyline(latlngs[], style?)` | Add polyline ��� `LayerHandle` |
| `addPolygon` | `addPolygon(latlngs[], style?)` | Add polygon → `LayerHandle` |
| `addCircle` | `addCircle(latlng, style?)` | Add circle → `LayerHandle` |
| `setClusterMarkers` | `setClusterMarkers(points[])` | Enable marker clustering |
| `openPopup` | `openPopup(latlng, element)` | Open popup at coordinate |
| `closePopup` | `closePopup()` | Close current popup |
| `getCenter` | `getCenter(): LatLng` | Current centre |
| `getZoom` | `getZoom(): number` | Current zoom |
| `getBounds` | `getBounds(): {minLat, maxLat, minLng, maxLng}` | Visible bounds |
| `setView` | `setView(lat, lng, zoom?)` | Jump to location |
| `flyTo` | `flyTo(lat, lng, zoom?, duration?)` | Animated fly-to |
| `fitBounds` | `fitBounds(latlngs[], opts?)` | Fit to bounding box |
| `zoomIn` | `zoomIn()` | Zoom in one level |
| `zoomOut` | `zoomOut()` | Zoom out one level |
| `destroy` | `destroy()` | Clean up |

### `LayerHandle`

| Method | Description |
|--------|-------------|
| `remove()` | Remove from map |
| `setLatLngs(latlngs[])` | Update polyline/polygon points (polyline/polygon only) |
| `setLatLng(latlng)` | Update marker/circle position |
| `setVisible(bool)` | Show or hide |

### `MapEngineOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `center` | `[lat, lng]` | `[0, 0]` | Initial centre |
| `zoom` | `number` | `2` | Initial zoom |
| `minZoom` | `number` | `1` | Minimum zoom |
| `maxZoom` | `number` | `19` | Maximum zoom |
| `tileUrls` | `string[]` | �� | Tile URL templates |
| `attribution` | `string` | — | Attribution HTML |
| `keyboard` | `boolean` | `true` | Keyboard controls |
| `inertia` | `boolean` | `true` | Pan inertia |
| `scaleBar` | `boolean` | `true` | Show scale bar |

---

## About

Map Atlas is a full-featured web map built from scratch. The custom map engine handles projection, tile rendering, inertia panning, pinch-to-zoom, marker clustering, and SVG overlays — all without any mapping library.

Built by **[Jojin John](https://github.com/jojin1709)**

## Features

### 🗺 Custom Map Engine

| Feature | Description |
|---------|-------------|
| Web Mercator projection | Industry-standard EPSG:3857 with retina (2x) tile support |
| Inertia panning | Smooth physics-based glide after drag release |
| Pinch-to-zoom | Native touch gesture support |
| Keyboard controls | Arrow keys to pan, `+`/`-` to zoom |
| Marker clustering | Groups markers at low zoom levels |
| SVG overlays | Polylines, polygons, circles, custom markers |
| Scale bar | Dynamic distance scale |
| Popups | Coordinate-anchored popup system |

### 🔍 Search & Navigation

- **Place search** — address and place lookup via Nominatim with live autocomplete
- **Nearby search** — cafés, restaurants, fuel, pharmacies, hospitals, ATMs, schools, banks, bars, hotels, supermarkets
- **Driving directions** — alternative routes with turn-by-turn steps
- **Walking & cycling** — multi-modal routing via Valhalla
- **Multi-stop routes** �� add waypoints between start and destination
- **Elevation profile** — SVG chart showing terrain along routes
- **6 map styles** — Street, Satellite, Dark, Topo, Humanitarian, Cycling

### 🛠 Tools

- **Distance & area measurement** — click points, see cumulative distance and polygon area (m²/km²/ft²/acre)
- **Drawing tools** — lines, polygons, rectangles with **undo/redo** (Ctrl+Z / Ctrl+Y)
- **Heatmap** — visualise density of places and search results
- **Turn-by-turn navigation** — maneuver cards with distance countdown during route playback
- **Weather** — current conditions at map centre (Open-Meteo)
- **Geolocation** — locate me, GPS track recording
- **Coordinate picker** — click to copy exact coordinates
- **Right-click menu** — set start/dest, save place, zoom, copy coords
- **Layer toggles** — show/hide routes, pins, shapes, tracks independently
- **Dark mode** — full dark UI theme
- **Print** — clean print layout

### 💾 Data

- **Saved places** — persisted in browser localStorage
- **Import/Export** — GPX, GeoJSON, KML (points, lines, and polygons)
- **Shareable links** — map view encoded in URL hash
- **Fullscreen mode** — distraction-free map view
- **Responsive** — bottom sheet on mobile devices
- **PWA offline** — installable, tiles cached for offline use

### 📎 Embed Mode

Embed a map with URL parameters — no code required:

```
https://yourapp.com/?embed=true&lat=48.8584&lng=2.2945&zoom=16&style=dark&marker=48.8584,2.2945,Eiffel Tower
```

| Param | Description |
|-------|-------------|
| `embed=true` | Hide side panel, map only |
| `lat`, `lng`, `zoom` | Centre and zoom level |
| `style` | Tile style key (street, satellite, dark, topo, humanitarian, cycling) |
| `marker` | `lat,lng,label` (pipe-separated for multiple) |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↑` `↓` `←` `→` | Pan map |
| `+` / `=` | Zoom in |
| `-` | Zoom out |
| Double-click | Zoom in at cursor |
| Scroll wheel | Zoom at cursor |
| Pinch | Zoom (touch devices) |
| Right-click | Context menu |

## Architecture

```
src/
├── index.ts                 # Public library entry point
├── engine/                  # Framework-free map engine (TypeScript)
│   ├── MapEngine.ts         # Core: pan, zoom, overlays, popups, clustering
│   ├── projection.ts        # Web Mercator math
│   └── tiles.ts             # Tile layer management with retina support
├── services/
│   ├── api.ts               # Nominatim, OSRM, Valhalla, Overpass, Open-Meteo
│   ├── geo.ts               # Haversine, formatting, GPX/GeoJSON/KML parsers
���   └── mapRef.ts            # Safe global engine reference
├── store/
│   └── useAppStore.ts       # Zustand global state (demo app only)
├── components/
│   ├── MapAtlas.tsx         # React wrapper component (library export)
│   ��── MapView.tsx          # Map container + overlay management (demo)
│   ├── Layout.tsx           # Panel layout (demo)
│   ├── SearchPanel.tsx      # Geocoding + autocomplete + nearby (demo)
│   ├─��� DirectionsPanel.tsx  # Routing + waypoints + elevation (demo)
│   ├── ToolsPanel.tsx       # Measure, draw, weather, geolocation (demo)
│   ├── LayersPanel.tsx      # Layer visibility toggles (demo)
│   ���── PlacesPanel.tsx      # Saved places + import/export (demo)
│   ├── ContextMenu.tsx      # Right-click menu (demo)
│   ├── ElevationChart.tsx   # SVG elevation profile (demo)
│   └── Toast.tsx            # Notifications (demo)
├── types/                   # Shared TypeScript types
├── tileStyles.ts            # Reusable tile style presets
├── config.ts                # Demo app configuration
├��─ App.tsx                  # Demo app root
├── main.tsx                 # Demo app entry
└── index.css                # Tailwind + custom styles
```

## Configuration (demo app)

Edit `src/config.ts` to customise:

| Setting | Description |
|---------|-------------|
| **Map styles** | Add any raster tile URL with `{z}/{x}/{y}` placeholders |
| **Nearby categories** | Add any OSM `amenity` value |
| **Routing profiles** | OSRM for driving, Valhalla for walking/cycling |
| **Service URLs** | Point at your own instances for production |

## Self-Hosting Services

Public endpoints are free but rate-limited. For production, self-host:

| Service | Options |
|---------|---------|
| **Routing** | [OSRM](https://project-osrm.org/), [GraphHopper](https://www.graphhopper.com/), [Valhalla](https://valhalla.github.io/valhalla/) |
| **Geocoding** | [Nominatim](https://nominatim.org/), [Photon](https://photon.komoot.io/) |
| **Tiles** | [Planetiler](https://github.com/onthegomap/planetiler), [Tilemaker](https://github.com/systemed/tilemaker) → PMTiles or [TileServer GL](https://github.com/maptiler/tileserver-gl) |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 5.6 |
| UI | React 18 |
| Build | Vite 5.4 |
| Styling | Tailwind CSS 3.4 |
| State | Zustand 4.5 (demo only) |
| Map Engine | Custom (zero dependencies) |
| Geocoding | Nominatim (OpenStreetMap) |
| Routing | OSRM + Valhalla |
| Weather | Open-Meteo |
| Elevation | OpenTopoData |

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License — see [LICENSE](LICENSE) for details.

## Credits

- Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors ([ODbL](https://opendatacommons.org/licenses/odbl/))
- Satellite imagery © [Esri](https://www.esri.com)
- Dark tiles © [CARTO](https://carto.com)
- Topo tiles © [OpenTopoMap](https://opentopomap.org) (CC-BY-SA)

---

<div align="center">

**Built with ❤️ by [Jojin John](https://github.com/jojin1709)**

⭐ Star this repo if you find it useful!

</div>
