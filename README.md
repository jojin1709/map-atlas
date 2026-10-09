<div align="center">

# 🗺 Map Atlas

**A modern, open-source web map with a custom dependency-free engine.**

No Leaflet. No Mapbox. No Google Maps. Just TypeScript, React, and pure engineering.

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

[Live Demo](https://mapapp-lovat.vercel.app) · [Report Bug](https://github.com/jojin1709/map-atlas/issues) · [Request Feature](https://github.com/jojin1709/map-atlas/issues)

</div>

---

## About

Map Atlas is a full-featured web map built from scratch. The custom map engine handles projection, tile rendering, inertia panning, pinch-to-zoom, marker clustering, and SVG overlays — all without any mapping library.

Built by **[Jojin John](https://github.com/jojin1709)**

## Quick Start

```bash
# Clone the repository
git clone https://github.com/jojin1709/map-atlas.git
cd map-atlas

# Install dependencies
npm install

# Start development server
npm run dev
```

Open **http://localhost:5173** in your browser.

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
- **Multi-stop routes** — add waypoints between start and destination
- **Elevation profile** — SVG chart showing terrain along routes
- **4 map styles** — Street, Satellite, Dark, Topo

### 🛠 Tools

- **Distance measurement** — click points, see cumulative distance
- **Drawing tools** — lines, polygons, rectangles
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
├── engine/                  # Framework-free map engine (TypeScript)
│   ├── MapEngine.ts         # Core: pan, zoom, overlays, popups, clustering
│   ├── projection.ts        # Web Mercator math
│   └── tiles.ts             # Tile layer management with retina support
├── services/
│   ├── api.ts               # Nominatim, OSRM, Valhalla, Overpass, Open-Meteo
│   ├── geo.ts               # Haversine, formatting, GPX/GeoJSON/KML parsers
│   └── mapRef.ts            # Safe global engine reference
├── store/
│   └── useAppStore.ts       # Zustand global state
├── components/
│   ├── MapView.tsx          # Map container + overlay management
│   ├── Layout.tsx           # Panel layout
│   ├── SearchPanel.tsx      # Geocoding + autocomplete + nearby
│   ├── DirectionsPanel.tsx  # Routing + waypoints + elevation
│   ├── ToolsPanel.tsx       # Measure, draw, weather, geolocation
│   ├── LayersPanel.tsx      # Layer visibility toggles
│   ├── PlacesPanel.tsx      # Saved places + import/export
│   ├── ContextMenu.tsx      # Right-click menu
│   ├── ElevationChart.tsx   # SVG elevation profile
│   └── Toast.tsx            # Notifications
├── types/                   # Shared TypeScript types
├── config.ts                # App configuration
├── App.tsx                  # Root component
├── main.tsx                 # Entry point
└── index.css                # Tailwind + custom styles
```

## Configuration

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
| State | Zustand 4.5 |
| Map Engine | Custom (zero dependencies) |
| Geocoding | Nominatim (OpenStreetMap) |
| Routing | OSRM + Valhalla |
| Weather | Open-Meteo |
| Elevation | OpenTopoData |

## Deployment

### Vercel (recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jojin1709/map-atlas)

### Manual

```bash
npm run build
# Upload dist/ to any static host
```

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
