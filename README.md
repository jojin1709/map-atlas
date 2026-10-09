# MapApp

A modern open-source web map built with **TypeScript, React, Vite, Tailwind CSS, and Zustand**.
Features a custom dependency-free map engine — no Leaflet, no Mapbox, no Google Maps.

## Quick start

```bash
npm install
npm run dev       # development server
npm run build     # production build
npm run preview   # preview production build
```

## Features

### Map engine (custom, zero dependencies)
- Web Mercator projection with retina (2x) tile support
- Smooth pan with **inertia physics**
- **Pinch-to-zoom** on touch devices
- **Keyboard controls**: arrow keys to pan, +/- to zoom
- Double-click zoom, scroll wheel zoom
- Scale bar
- SVG overlays: polylines, polygons, circles, markers
- **Marker clustering** at low zoom levels
- Popups anchored to coordinates

### Search & navigation
- Place and address search (Nominatim geocoding)
- Nearby search: cafés, restaurants, fuel, pharmacies, hospitals, ATMs, schools, banks, bars, hotels, supermarkets (Overpass API)
- Driving directions with **alternative routes** and turn-by-turn steps
- **Multi-stop routes** with waypoints
- **Elevation profile** chart along routes
- Swap start/destination
- 4 map styles: Street, Satellite, Dark, Topo

### Tools
- **Distance measurement** along a path
- **Drawing tools**: lines, polygons, rectangles
- Current **weather** at map centre (Open-Meteo)
- **Geolocation**: locate me, GPS track recording
- **Dark mode** UI
- Shareable link that encodes map view in URL

### Data
- **Saved places** in browser (localStorage)
- **Import/Export**: GPX, GeoJSON, KML
- Fullscreen mode
- Responsive layout — bottom sheet on mobile

## Architecture

```
src/
  engine/          ← framework-free map engine (TypeScript)
    MapEngine.ts     core engine: pan, zoom, overlays, popups, clustering
    projection.ts    Web Mercator math
    tiles.ts         tile layer management with retina support
  services/
    api.ts           network calls (Nominatim, OSRM, Overpass, Open-Meteo, OpenTopoData)
    geo.ts           haversine, formatting, GPX/GeoJSON/KML parsers
    mapRef.ts        safe global engine reference
  store/
    useAppStore.ts   Zustand global state
  components/
    MapView.tsx      map container + overlay management
    Layout.tsx       panel layout
    SearchPanel.tsx  geocoding + nearby
    DirectionsPanel.tsx  routing + waypoints + elevation
    ToolsPanel.tsx   measure, draw, style, weather, geolocation
    PlacesPanel.tsx  saved places + import/export
    ElevationChart.tsx  SVG elevation profile
    Toast.tsx        notifications
  types/            shared TypeScript types
  config.ts         app configuration
  App.tsx           root component
  main.tsx          entry point
  index.css         Tailwind + custom styles
```

## Configuration

Edit `src/config.ts`:

- **Map styles**: add any raster tile URL with `{z}/{x}/{y}` placeholders
- **Nearby categories**: add any OSM `amenity` value
- **Routing profiles**: the public OSRM demo serves only `driving`. Self-host OSRM for walking/cycling.
- **Service URLs**: point at your own instances for production

## Running your own services

Public endpoints (`nominatim.openstreetmap.org`, `router.project-osrm.org`, `overpass-api.de`) are free but rate-limited. For production, self-host:

- **Routing**: [OSRM](https://project-osrm.org/), [GraphHopper](https://www.graphhopper.com/), or [Valhalla](https://valhalla.github.io/valhalla/)
- **Geocoding**: [Nominatim](https://nominatim.org/) or [Photon](https://photon.komoot.io/)
- **Tiles**: [Planetiler](https://github.com/onthegomap/planetiler) or [Tilemaker](https://github.com/systemed/tilemaker) → PMTiles or [TileServer GL](https://github.com/maptiler/tileserver-gl)

## Attribution & licensing

- Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, licensed under ODbL
- Satellite imagery © [Esri](https://www.esri.com), dark tiles © [CARTO](https://carto.com), topo tiles © [OpenTopoMap](https://opentopomap.org) (CC-BY-SA)
- Code in this project is yours to license (MIT is a common choice)

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| Arrow keys | Pan map |
| `+` / `=` | Zoom in |
| `-` | Zoom out |
| Double-click | Zoom in at cursor |
| Scroll wheel | Zoom at cursor |
| Pinch | Zoom (touch) |
