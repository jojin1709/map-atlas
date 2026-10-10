import { useState, useMemo } from 'react'
import {
  Code2,
  Cpu,
  Layers,
  CloudRain,
  Copy,
  Check,
  ArrowLeft,
  Search,
  ExternalLink,
  Terminal,
  Boxes,
  Zap,
  Globe2,
  Table,
  BookOpen,
  MapPin,
  Compass,
  Move,
  MousePointer,
  Sparkles,
  Sliders,
  Maximize2,
} from 'lucide-react'

interface CodeBlockProps {
  language: string
  code: string
}

function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative my-4 rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-800 bg-zinc-900 text-zinc-100 font-mono text-xs shadow-md">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800/80 border-b border-zinc-700/60 text-zinc-400">
        <span className="uppercase text-[11px] font-semibold tracking-wider text-blue-400">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-700/60 hover:bg-zinc-700 text-zinc-200 text-xs transition"
          title="Copy code to clipboard"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs leading-relaxed text-zinc-200">
        <code>{code}</code>
      </pre>
    </div>
  )
}

interface DocTableProps {
  headers: string[]
  rows: (string | JSX.Element)[][]
}

function DocTable({ headers, rows }: DocTableProps) {
  return (
    <div className="overflow-x-auto border border-gray-200 dark:border-zinc-800 rounded-xl my-3 shadow-sm">
      <table className="w-full text-left text-xs">
        <thead className="bg-gray-100 dark:bg-zinc-900 font-bold border-b border-gray-200 dark:border-zinc-800 text-gray-800 dark:text-zinc-200">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="p-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-zinc-800 text-gray-700 dark:text-zinc-300">
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-gray-50/50 dark:hover:bg-zinc-850/50 transition">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="p-3 align-top leading-relaxed">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function DocsView() {
  const [activeTab, setActiveTab] = useState('overview')
  const [searchQuery, setSearchQuery] = useState('')

  const navCategories = [
    {
      name: 'Getting Started',
      items: [
        { id: 'overview', title: 'Overview & Quickstart', icon: Zap },
        { id: 'tutorials', title: 'Tutorials & Examples', icon: BookOpen },
        { id: 'download', title: 'Download & CDN Setup', icon: Terminal },
      ],
    },
    {
      name: 'Map & Engine Core',
      items: [
        { id: 'map', title: 'Map (Creation & Options)', icon: Move },
        { id: 'map-methods', title: 'Map Methods (State & Views)', icon: Sliders },
        { id: 'map-events', title: 'Map Events & Listeners', icon: MousePointer },
        { id: 'map-panes', title: 'Map Panes & Handlers', icon: Layers },
        { id: 'globe-engine', title: 'GlobeEngine (3D Mode)', icon: Globe2 },
      ],
    },
    {
      name: 'UI Layers',
      items: [
        { id: 'marker', title: 'Marker & Draggable', icon: MapPin },
        { id: 'popup-tooltip', title: 'Popup, Tooltip & DivOverlay', icon: Sparkles },
        { id: 'icon', title: 'Icon, Icon.Default & DivIcon', icon: Compass },
      ],
    },
    {
      name: 'Raster Layers',
      items: [
        { id: 'tilelayer', title: 'TileLayer & WMS Service', icon: CloudRain },
        { id: 'image-video-overlay', title: 'Image, Video & SVG Overlay', icon: Maximize2 },
        { id: 'gridlayer', title: 'GridLayer (Custom Tiles)', icon: Layers },
      ],
    },
    {
      name: 'Vector Layers',
      items: [
        { id: 'path-polyline', title: 'Path, Polyline & MultiPolyline', icon: Layers },
        { id: 'polygon-shapes', title: 'Polygon, Rectangle & Circles', icon: Boxes },
        { id: 'svg-canvas', title: 'SVG & Canvas Renderers', icon: Code2 },
      ],
    },
    {
      name: 'Other Layers & Data',
      items: [
        { id: 'layergroup', title: 'LayerGroup & FeatureGroup', icon: Layers },
        { id: 'geojson', title: 'GeoJSON Engine', icon: Table },
      ],
    },
    {
      name: 'Basic Types & Math',
      items: [
        { id: 'latlng-latlngbounds', title: 'LatLng & LatLngBounds', icon: Compass },
        { id: 'point-bounds', title: 'Point & Bounds', icon: Cpu },
      ],
    },
    {
      name: 'Controls',
      items: [
        { id: 'controls', title: 'Zoom, Attribution, Layers & Scale', icon: Sliders },
      ],
    },
    {
      name: 'Utilities & DOM',
      items: [
        { id: 'browser-util', title: 'Browser & Util Namespace', icon: Terminal },
        { id: 'dom-utilities', title: 'DomEvent, DomUtil & Draggable', icon: MousePointer },
        { id: 'line-poly-util', title: 'LineUtil & PolyUtil Algorithms', icon: Cpu },
      ],
    },
    {
      name: 'Base Classes & CRS',
      items: [
        { id: 'base-classes', title: 'Class, Evented & Layer', icon: Boxes },
        { id: 'crs-projection', title: 'CRS, Projections & Earth', icon: Globe2 },
      ],
    },
    {
      name: 'Framework Integration',
      items: [
        { id: 'react-embed', title: 'React / Next.js Integration', icon: Code2 },
        { id: 'vue-embed', title: 'Vue 3 / Nuxt Integration', icon: Boxes },
        { id: 'iframe-embed', title: 'HTML & iframe Embed', icon: ExternalLink },
        { id: 'apis', title: 'REST Services & Open APIs', icon: Table },
      ],
    },
  ]

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return navCategories
    const q = searchQuery.toLowerCase()
    return navCategories
      .map(cat => ({
        ...cat,
        items: cat.items.filter(
          item =>
            item.title.toLowerCase().includes(q) ||
            item.id.toLowerCase().includes(q)
        ),
      }))
      .filter(cat => cat.items.length > 0)
  }, [searchQuery])

  const handleReturnToMap = () => {
    window.history.pushState(null, '', '/')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <div className="h-screen w-full overflow-y-auto bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 flex flex-col antialiased selection:bg-blue-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/90 dark:bg-zinc-900/90 border-b border-gray-200 dark:border-zinc-800 px-4 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleReturnToMap}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 font-bold text-xs transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Map</span>
          </button>
          <div className="h-5 w-px bg-gray-200 dark:bg-zinc-800 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-xl">🗺️</span>
            <span className="font-bold text-base tracking-tight">Leaflet & Map Atlas API Reference</span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-400">
              v2.0 & v2.4
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="https://github.com/jojin1709/map-atlas"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
          >
            <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
            <span>GitHub</span>
          </a>
          <a
            href="https://map-atlas.apkscope.workers.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
          >
            <span>Cloudflare Edge</span>
          </a>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 gap-8">
        {/* Sidebar */}
        <aside className="w-72 shrink-0 hidden md:block sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
          <div className="relative mb-4">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter API docs & classes…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-zinc-200"
            />
          </div>

          <div className="space-y-4">
            {filteredCategories.map((cat, idx) => (
              <div key={idx} className="space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 px-3 py-1">
                  {cat.name}
                </div>
                {cat.items.map(item => {
                  const Icon = item.icon
                  const isActive = activeTab === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition text-left ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-850'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 max-w-4xl space-y-10 pb-20">
          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-4">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Leaflet & Map Atlas API Reference
                </h1>
                <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400 leading-relaxed">
                  An open-source JavaScript library for building powerful interactive maps, mobile-optimized navigation apps, 3D globes, and GIS visualizations.
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-4 text-xs">
                  <a href="#overview" onClick={() => setActiveTab('overview')} className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                    Overview
                  </a>
                  <span className="text-gray-300 dark:text-zinc-700">•</span>
                  <a href="#tutorials" onClick={() => setActiveTab('tutorials')} className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                    Tutorials
                  </a>
                  <span className="text-gray-300 dark:text-zinc-700">•</span>
                  <a href="#download" onClick={() => setActiveTab('download')} className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                    Download
                  </a>
                  <span className="text-gray-300 dark:text-zinc-700">•</span>
                  <a href="https://leafletjs.com/plugins.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1">
                    Plugins <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="text-gray-300 dark:text-zinc-700">•</span>
                  <a href="https://leafletjs.com/blog.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1">
                    Blog <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 text-xs">
                <h3 className="font-bold text-sm text-blue-900 dark:text-blue-300 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-600" />
                  <span>Dual Compatibility: Leaflet 2.0 & Native MapEngine</span>
                </h3>
                <p className="mt-1 text-gray-700 dark:text-zinc-300 leading-relaxed">
                  Map Atlas fully mirrors Leaflet’s API specifications (such as <code>L.map</code>, <code>L.marker</code>, <code>L.polyline</code>, <code>L.latLng</code>, <code>L.tileLayer</code>, <code>L.control</code>) while offering a native zero-dependency Canvas 2D/WebGL rendering pipeline, 3D Globe mode, and WebAssembly line simplification. You can use standard Leaflet paradigms or native modern TypeScript classes.
                </p>
              </div>

              <h2 className="text-lg font-bold">Quick Usage Example</h2>
              <CodeBlock
                language="html"
                code={`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Map Atlas Quickstart</title>
  <style>
    #map { height: 100vh; width: 100vw; margin: 0; }
  </style>
</head>
<body>
  <div id="map"></div>

  <!-- Load Map Atlas / Leaflet API Script -->
  <script type="module">
    import { MapEngine } from 'https://mapapp-lovat.vercel.app/dist/map-atlas.js';

    // 1. Initialize map on "map" div with center and zoom
    const map = new MapEngine('map', {
      center: [51.505, -0.09],
      zoom: 13,
      tileUrls: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      attribution: '&copy; OpenStreetMap contributors'
    });

    // 2. Add marker with popup
    const marker = map.addMarker({ lat: 51.5, lng: -0.09 }, {
      label: 'Hello London!'
    });

    // 3. Add polyline
    map.addPolyline([
      { lat: 51.505, lng: -0.09 },
      { lat: 51.51, lng: -0.1 },
      { lat: 51.515, lng: -0.08 }
    ], { color: '#3b82f6', weight: 4 });
  </script>
</body>
</html>`}
              />
            </section>
          )}

          {/* TAB: TUTORIALS */}
          {activeTab === 'tutorials' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">Tutorials & Step-by-Step Guides</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  Learn how to build interactive maps, work with mobile events, style GeoJSON, and add layer controls.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50">
                  <h3 className="font-bold text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <span>1. Leaflet on Mobile</span>
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                    How to configure mobile viewports, touch-pinch zooming, and geolocation with <code>map.locate(&#123; setView: true, maxZoom: 16 &#125;)</code>.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50">
                  <h3 className="font-bold text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <span>2. Custom Markers & Icons</span>
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                    Create custom SVG icons, Retina icons, custom shadows, and HTML-based <code>DivIcon</code> styling.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50">
                  <h3 className="font-bold text-sm text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                    <span>3. Using GeoJSON Data</span>
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                    Load GeoJSON Point, LineString, and MultiPolygon datasets with interactive style functions and click popups.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50">
                  <h3 className="font-bold text-sm text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                    <span>4. Layer Groups & Layer Control</span>
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                    Group markers with <code>FeatureGroup</code>, switch between OpenStreetMap, Satellite, and Weather Radar layers.
                  </p>
                </div>
              </div>

              <h2 className="text-base font-bold mt-6">Example: Mobile Geolocation Tutorial</h2>
              <CodeBlock
                language="javascript"
                code={`// Initialize map with auto-locate
const map = new Map('map').fitWorld();

map.locate({ setView: true, maxZoom: 16 });

function onLocationFound(e) {
  const radius = e.accuracy / 2;

  new Marker(e.latlng).addTo(map)
    .bindPopup("You are within " + radius + " meters from this point").openPopup();

  new Circle(e.latlng, radius).addTo(map);
}

map.on('locationfound', onLocationFound);

function onLocationError(e) {
  alert(e.message);
}

map.on('locationerror', onLocationError);`}
              />
            </section>
          )}

          {/* TAB: DOWNLOAD */}
          {activeTab === 'download' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">Download & Installation</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  Add Map Atlas to your project via NPM or instant CDN script tags.
                </p>
              </div>

              <h2 className="text-base font-bold">1. Install via NPM / Yarn / PNPM</h2>
              <CodeBlock language="bash" code={`npm install map-atlas\n# or with pnpm\npnpm add map-atlas`} />

              <h2 className="text-base font-bold mt-6">2. CDN Script Tag</h2>
              <CodeBlock
                language="html"
                code={`<!-- CSS Stylesheet -->
<link rel="stylesheet" href="https://mapapp-lovat.vercel.app/dist/map-atlas.css" />

<!-- ES Module -->
<script type="module" src="https://mapapp-lovat.vercel.app/dist/map-atlas.js"></script>`}
              />
            </section>
          )}

          {/* TAB: MAP CLASS & CREATION */}
          {activeTab === 'map' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">Map</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  The central class of the API — it is used to create a map on a page and manipulate it.
                </p>
              </div>

              <h2 className="text-base font-bold">Usage Example</h2>
              <CodeBlock
                language="javascript"
                code={`// Initialize the map on the "map" div with a given center and zoom
const map = new Map('map', {
  center: [51.505, -0.09],
  zoom: 13,
  zoomControl: true,
  preferCanvas: false
});`}
              />

              <h2 className="text-base font-bold mt-6">Constructor</h2>
              <DocTable
                headers={['Constructor', 'Description']}
                rows={[
                  [
                    <code>new Map(id: string, options?: MapOptions)</code>,
                    'Instantiates a map object given the DOM ID of a <div> element and optionally an object literal with Map options.',
                  ],
                  [
                    <code>new Map(el: HTMLElement, options?: MapOptions)</code>,
                    'Instantiates a map object given an instance of a <div> HTML element and optionally an object literal with Map options.',
                  ],
                  [
                    <code>new MapEngine(id | el, options?: MapEngineOptions)</code>,
                    'Instantiates the native Map Atlas high-performance Canvas 2D engine with built-in tile caching.',
                  ],
                ]}
              />

              <h2 className="text-base font-bold mt-6">Control Options</h2>
              <DocTable
                headers={['Option', 'Type', 'Default', 'Description']}
                rows={[
                  [<code>attributionControl</code>, <code>Boolean</code>, 'true', 'Whether an attribution control is added to the map by default.'],
                  [<code>zoomControl</code>, <code>Boolean</code>, 'true', 'Whether a zoom control (+ / - buttons) is added to the map by default.'],
                ]}
              />

              <h2 className="text-base font-bold mt-6">Interaction Options</h2>
              <DocTable
                headers={['Option', 'Type', 'Default', 'Description']}
                rows={[
                  [<code>closePopupOnClick</code>, <code>Boolean</code>, 'true', 'Set it to false if you do not want popups to close when user clicks the map.'],
                  [<code>boxZoom</code>, <code>Boolean</code>, 'true', 'Whether the map can be zoomed to a rectangular area by shift-dragging.'],
                  [<code>doubleClickZoom</code>, <code>Boolean | String</code>, 'true', "Double-clicking zooms in, holding shift zooms out. Pass 'center' to zoom to center."],
                  [<code>dragging</code>, <code>Boolean</code>, 'true', 'Whether the map is draggable with mouse pointer or touch.'],
                  [<code>zoomSnap</code>, <code>Number</code>, '1', 'Forces zoom level to snap to multiples of this value (e.g. 0.5 or 0.1 for smooth granularity).'],
                  [<code>zoomDelta</code>, <code>Number</code>, '1', 'How much the map zoom level changes after zoomIn/zoomOut or keyboard presses.'],
                  [<code>trackResize</code>, <code>Boolean</code>, 'true', 'Whether the map automatically updates its viewport when the browser window resizes.'],
                ]}
              />

              <h2 className="text-base font-bold mt-6">Panning Inertia Options</h2>
              <DocTable
                headers={['Option', 'Type', 'Default', 'Description']}
                rows={[
                  [<code>inertia</code>, <code>Boolean</code>, 'true', 'Panning builds momentum and smoothly glides to a stop on mouse/touch release.'],
                  [<code>inertiaDeceleration</code>, <code>Number</code>, '3000', 'Rate with which inertial movement slows down (px/s²).'],
                  [<code>inertiaMaxSpeed</code>, <code>Number</code>, 'Infinity', 'Max speed of the inertial movement (px/s).'],
                  [<code>easeLinearity</code>, <code>Number</code>, '0.2', 'Curvature factor of panning animation cubic bezier easing.'],
                  [<code>worldCopyJump</code>, <code>Boolean</code>, 'false', 'Seamlessly jumps across the date line copy so overlays remain visible.'],
                  [<code>maxBoundsViscosity</code>, <code>Number</code>, '0.0', 'Controls how solid maxBounds are: 0.0 allows normal dragging, 1.0 prevents any movement outside.'],
                ]}
              />

              <h2 className="text-base font-bold mt-6">Touch & Wheel Options</h2>
              <DocTable
                headers={['Option', 'Type', 'Default', 'Description']}
                rows={[
                  [<code>pinchZoom</code>, <code>Boolean | String</code>, 'true', 'Pinch-to-zoom on touch devices.'],
                  [<code>bounceAtZoomLimits</code>, <code>Boolean</code>, 'true', 'Whether to bounce back when pinching past min/max zoom.'],
                  [<code>scrollWheelZoom</code>, <code>Boolean | String</code>, 'true', 'Zooms using mouse wheel scroll.'],
                  [<code>wheelDebounceTime</code>, <code>Number</code>, '40', 'Limits wheel fire rate (milliseconds).'],
                  [<code>wheelPxPerZoomLevel</code>, <code>Number</code>, '60', 'Scroll pixels required for one full zoom level.'],
                ]}
              />

              <h2 className="text-base font-bold mt-6">Map State Options</h2>
              <DocTable
                headers={['Option', 'Type', 'Default', 'Description']}
                rows={[
                  [<code>crs</code>, <code>CRS</code>, 'CRS.EPSG3857', 'Coordinate Reference System. Defaults to Web Mercator.'],
                  [<code>center</code>, <code>LatLng</code>, 'undefined', 'Initial geographical center [latitude, longitude].'],
                  [<code>zoom</code>, <code>Number</code>, 'undefined', 'Initial zoom level.'],
                  [<code>minZoom</code>, <code>Number</code>, '0', 'Minimum zoom level constraint.'],
                  [<code>maxZoom</code>, <code>Number</code>, '19', 'Maximum zoom level constraint.'],
                  [<code>maxBounds</code>, <code>LatLngBounds</code>, 'null', 'Restricts view to given geographic bounds.'],
                  [<code>renderer</code>, <code>Renderer</code>, 'SVG', 'Default renderer for vector layers (SVG or Canvas).'],
                ]}
              />
            </section>
          )}

          {/* TAB: MAP METHODS */}
          {activeTab === 'map-methods' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">Map Methods</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  Methods for modifying map state, querying current views, managing layers, and performing conversions.
                </p>
              </div>

              <h2 className="text-base font-bold">1. Modifying Map State</h2>
              <DocTable
                headers={['Method', 'Returns', 'Description']}
                rows={[
                  [<code>setView(center, zoom?, options?)</code>, <code>this</code>, 'Sets geographical center and zoom with animation options.'],
                  [<code>setZoom(zoom, options?)</code>, <code>this</code>, 'Sets the zoom level of the map.'],
                  [<code>zoomIn(delta?, options?)</code>, <code>this</code>, 'Increases zoom level by delta (default 1).'],
                  [<code>zoomOut(delta?, options?)</code>, <code>this</code>, 'Decreases zoom level by delta (default 1).'],
                  [<code>setZoomAround(latlng, zoom, options?)</code>, <code>this</code>, 'Zooms keeping specified geographical point stationary.'],
                  [<code>fitBounds(bounds, options?)</code>, <code>this</code>, 'Sets view containing given LatLngBounds with maximum possible zoom.'],
                  [<code>fitWorld(options?)</code>, <code>this</code>, 'Sets view containing the entire globe.'],
                  [<code>panTo(latlng, options?)</code>, <code>this</code>, 'Pans map to a given coordinate.'],
                  [<code>panBy(point, options?)</code>, <code>this</code>, 'Pans map by a given pixel offset.'],
                  [<code>flyTo(latlng, zoom?, options?)</code>, <code>this</code>, 'Smooth pan-zoom flying animation.'],
                  [<code>flyToBounds(bounds, options?)</code>, <code>this</code>, 'Smooth fly animation fitting given bounds.'],
                  [<code>setMaxBounds(bounds)</code>, <code>this</code>, 'Restricts map view to given bounds.'],
                  [<code>setMinZoom(zoom)</code>, <code>this</code>, 'Sets the lower zoom limit.'],
                  [<code>setMaxZoom(zoom)</code>, <code>this</code>, 'Sets the upper zoom limit.'],
                  [<code>panInsideBounds(bounds, options?)</code>, <code>this</code>, 'Pans to the closest view inside given bounds.'],
                  [<code>invalidateSize(options?)</code>, <code>this</code>, 'Re-calculates size after container resize.'],
                  [<code>stop()</code>, <code>this</code>, 'Stops currently active panTo or flyTo animation.'],
                ]}
              />

              <h2 className="text-base font-bold mt-6">2. Getting Map State</h2>
              <DocTable
                headers={['Method', 'Returns', 'Description']}
                rows={[
                  [<code>getCenter()</code>, <code>LatLng</code>, 'Returns geographical center coordinate.'],
                  [<code>getZoom()</code>, <code>Number</code>, 'Returns current zoom level.'],
                  [<code>getBounds()</code>, <code>LatLngBounds</code>, 'Returns visible geographical bounds.'],
                  [<code>getMinZoom()</code>, <code>Number</code>, 'Returns minimum zoom.'],
                  [<code>getMaxZoom()</code>, <code>Number</code>, 'Returns maximum zoom.'],
                  [<code>getSize()</code>, <code>Point</code>, 'Returns map container size in pixels (x, y).'],
                  [<code>getPixelBounds()</code>, <code>Bounds</code>, 'Returns bounds in projected pixel coordinates.'],
                  [<code>getPixelOrigin()</code>, <code>Point</code>, 'Returns projected pixel coordinate of top-left origin.'],
                ]}
              />

              <h2 className="text-base font-bold mt-6">3. Layers and Controls</h2>
              <DocTable
                headers={['Method', 'Returns', 'Description']}
                rows={[
                  [<code>addLayer(layer)</code>, <code>this</code>, 'Adds a Layer to the map.'],
                  [<code>removeLayer(layer)</code>, <code>this</code>, 'Removes a Layer from the map.'],
                  [<code>hasLayer(layer)</code>, <code>Boolean</code>, 'Returns true if layer is currently added.'],
                  [<code>eachLayer(fn, context?)</code>, <code>this</code>, 'Iterates over all layers on the map.'],
                  [<code>openPopup(popup | content, latlng?)</code>, <code>this</code>, 'Opens popup on the map.'],
                  [<code>closePopup(popup?)</code>, <code>this</code>, 'Closes open popup.'],
                  [<code>openTooltip(tooltip)</code>, <code>this</code>, 'Opens specified tooltip.'],
                  [<code>closeTooltip(tooltip?)</code>, <code>this</code>, 'Closes specified tooltip.'],
                  [<code>addControl(control)</code>, <code>this</code>, 'Adds UI Control to the map.'],
                  [<code>removeControl(control)</code>, <code>this</code>, 'Removes UI Control from the map.'],
                ]}
              />

              <h2 className="text-base font-bold mt-6">4. Conversion & Projection Methods</h2>
              <DocTable
                headers={['Method', 'Returns', 'Description']}
                rows={[
                  [<code>project(latlng, zoom?)</code>, <code>Point</code>, 'Projects LatLng into pixel coordinates relative to CRS origin.'],
                  [<code>unproject(point, zoom?)</code>, <code>LatLng</code>, 'Inverse of project: converts pixel coordinates back to LatLng.'],
                  [<code>layerPointToLatLng(point)</code>, <code>LatLng</code>, 'Given pixel coordinate relative to origin pixel, returns LatLng.'],
                  [<code>latLngToLayerPoint(latlng)</code>, <code>Point</code>, 'Given LatLng, returns pixel coordinate relative to origin pixel.'],
                  [<code>containerPointToLatLng(point)</code>, <code>LatLng</code>, 'Converts pixel coordinate relative to container into LatLng.'],
                  [<code>latLngToContainerPoint(latlng)</code>, <code>Point</code>, 'Converts LatLng into pixel coordinate relative to container.'],
                  [<code>distance(latlng1, latlng2)</code>, <code>Number</code>, 'Calculates distance in meters between two coordinates.'],
                ]}
              />
            </section>
          )}

          {/* TAB: MAP EVENTS */}
          {activeTab === 'map-events' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">Map Events</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  Events fired by the Map instance. Listen using <code>map.on(eventName, handler)</code>.
                </p>
              </div>

              <h2 className="text-base font-bold">1. Interaction Events</h2>
              <DocTable
                headers={['Event', 'Data', 'Description']}
                rows={[
                  [<code>click</code>, <code>PointerEvent</code>, 'Fired when the user clicks or taps the map.'],
                  [<code>dblclick</code>, <code>PointerEvent</code>, 'Fired on double click / double tap.'],
                  [<code>pointerdown</code>, <code>PointerEvent</code>, 'Fired when pointer touches or mouse clicks down.'],
                  [<code>pointerup</code>, <code>PointerEvent</code>, 'Fired when pointer / mouse is released.'],
                  [<code>pointermove</code>, <code>PointerEvent</code>, 'Fired while pointer moves over map.'],
                  [<code>contextmenu</code>, <code>PointerEvent</code>, 'Fired on right-click or mobile long-press.'],
                  [<code>keydown</code>, <code>KeyboardEvent</code>, 'Fired when key is pressed while map is focused.'],
                  [<code>keyup</code>, <code>KeyboardEvent</code>, 'Fired when key is released.'],
                ]}
              />

              <h2 className="text-base font-bold mt-6">2. Map State Change Events</h2>
              <DocTable
                headers={['Event', 'Data', 'Description']}
                rows={[
                  [<code>load</code>, <code>Event</code>, 'Fired when map is initialized with center and zoom.'],
                  [<code>movestart</code>, <code>Event</code>, 'Fired when view starts changing (user starts dragging).'],
                  [<code>move</code>, <code>Event</code>, 'Fired repeatedly during panning or flying.'],
                  [<code>moveend</code>, <code>Event</code>, 'Fired when center stops changing.'],
                  [<code>zoomstart</code>, <code>Event</code>, 'Fired before zoom animation begins.'],
                  [<code>zoom</code>, <code>Event</code>, 'Fired repeatedly during zoom level changes.'],
                  [<code>zoomend</code>, <code>Event</code>, 'Fired when zoom change completes.'],
                  [<code>resize</code>, <code>ResizeEvent</code>, 'Fired when map container is resized.'],
                  [<code>viewreset</code>, <code>Event</code>, 'Fired when map needs full redraw (on heavy zoom/load).'],
                ]}
              />

              <h2 className="text-base font-bold mt-6">3. Geolocation Events</h2>
              <DocTable
                headers={['Event', 'Data', 'Description']}
                rows={[
                  [<code>locationfound</code>, <code>LocationEvent</code>, 'Fired with latlng, bounds, accuracy, and altitude when locate() succeeds.'],
                  [<code>locationerror</code>, <code>ErrorEvent</code>, 'Fired when locate() fails or permission is denied.'],
                ]}
              />
            </section>
          )}

          {/* TAB: MAP PANES */}
          {activeTab === 'map-panes' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">Map Panes & Handlers</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  Panes are DOM elements controlling z-index layering order of layers, vectors, and popups.
                </p>
              </div>

              <DocTable
                headers={['Pane', 'Type', 'Z-Index', 'Description']}
                rows={[
                  [<code>mapPane</code>, <code>HTMLElement</code>, 'auto', 'Parent pane containing all map panes.'],
                  [<code>tilePane</code>, <code>HTMLElement</code>, '200', 'Pane for TileLayer and GridLayers.'],
                  [<code>overlayPane</code>, <code>HTMLElement</code>, '400', 'Pane for vectors (Path, Polyline, Polygon), ImageOverlay.'],
                  [<code>shadowPane</code>, <code>HTMLElement</code>, '500', 'Pane for overlay shadows (Marker shadows).'],
                  [<code>markerPane</code>, <code>HTMLElement</code>, '600', 'Pane for Marker icons.'],
                  [<code>tooltipPane</code>, <code>HTMLElement</code>, '650', 'Pane for Tooltips.'],
                  [<code>popupPane</code>, <code>HTMLElement</code>, '700', 'Top-most pane for Popups.'],
                ]}
              />

              <h2 className="text-base font-bold mt-6">Custom Panes Example</h2>
              <CodeBlock
                language="javascript"
                code={`// Create a custom high-priority pane for geo-labels
map.createPane('labelsPane');
map.getPane('labelsPane').style.zIndex = 650;
map.getPane('labelsPane').style.pointerEvents = 'none';

// Add tile layer specifically to the custom pane
const labelsLayer = new TileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png', {
  pane: 'labelsPane'
}).addTo(map);`}
              />
            </section>
          )}

          {/* TAB: GLOBE ENGINE */}
          {activeTab === 'globe-engine' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">GlobeEngine (3D Mode)</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  Full 3D spherical Earth visualization rendered on HTML5 Canvas without heavy Three.js bundles. Supports orbital drag, auto-spin, and seamless zoom transitions into 2D slippy maps.
                </p>
              </div>

              <CodeBlock
                language="typescript"
                code={`import { GlobeEngine } from './engine/GlobeEngine'

// Instantiate 3D Globe on an HTML container
const globe = new GlobeEngine(document.getElementById('globe-container'), {
  onZoomIn: (lat, lng) => {
    console.log('User zoomed into coordinates:', lat, lng)
    // Seamlessly transition to 2D MapEngine centered at (lat, lng)
  }
})

// Rotate to target coordinates
globe.setCenter(20.5937, 78.9629) // India center

// Enable automatic orbital spinning
globe.setAutoRotate(true)`}
              />
            </section>
          )}

          {/* TAB: MARKER */}
          {activeTab === 'marker' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">Marker</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  Displays clickable and draggable icons at specific geographical points on the map.
                </p>
              </div>

              <h2 className="text-base font-bold">Usage Example</h2>
              <CodeBlock
                language="javascript"
                code={`// Basic Marker
const marker = new Marker([50.5, 30.5], {
  draggable: true,
  autoPan: true
}).addTo(map);

// Bind popup
marker.bindPopup("<b>Kyiv</b><br>Capital of Ukraine.").openPopup();

// Listen to drag events
marker.on('dragend', function(e) {
  const newLatLng = marker.getLatLng();
  console.log("Moved to:", newLatLng.lat, newLatLng.lng);
});`}
              />

              <h2 className="text-base font-bold mt-6">Marker Options</h2>
              <DocTable
                headers={['Option', 'Type', 'Default', 'Description']}
                rows={[
                  [<code>icon</code>, <code>Icon</code>, 'Icon.Default', 'Icon instance to use for rendering.'],
                  [<code>keyboard</code>, <code>Boolean</code>, 'true', 'Whether marker can be tabbed to with keyboard and clicked with enter.'],
                  [<code>title</code>, <code>String</code>, "''", 'Tooltip title displayed on hover.'],
                  [<code>alt</code>, <code>String</code>, "'Marker'", 'Accessibility alt text for screen readers.'],
                  [<code>zIndexOffset</code>, <code>Number</code>, '0', 'Offset added to z-index to bring marker above others.'],
                  [<code>opacity</code>, <code>Number</code>, '1.0', 'Marker opacity from 0.0 to 1.0.'],
                  [<code>riseOnHover</code>, <code>Boolean</code>, 'false', 'Brings marker to front when hovered.'],
                  [<code>draggable</code>, <code>Boolean</code>, 'false', 'Whether marker is draggable with pointer.'],
                  [<code>autoPan</code>, <code>Boolean</code>, 'false', 'Whether to pan map when dragging marker near edge.'],
                ]}
              />

              <h2 className="text-base font-bold mt-6">Marker Methods</h2>
              <DocTable
                headers={['Method', 'Returns', 'Description']}
                rows={[
                  [<code>getLatLng()</code>, <code>LatLng</code>, 'Returns current geographical position.'],
                  [<code>setLatLng(latlng)</code>, <code>this</code>, 'Changes marker position to new LatLng.'],
                  [<code>setIcon(icon)</code>, <code>this</code>, 'Changes the marker icon.'],
                  [<code>getIcon()</code>, <code>Icon</code>, 'Returns current icon instance.'],
                  [<code>setOpacity(opacity)</code>, <code>this</code>, 'Changes marker opacity.'],
                  [<code>toGeoJSON()</code>, <code>Object</code>, 'Returns GeoJSON Point feature representation.'],
                ]}
              />
            </section>
          )}

          {/* TAB: POPUP & TOOLTIP */}
          {activeTab === 'popup-tooltip' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">Popup & Tooltip</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  Informational speech bubbles and hover labels attached to markers or coordinates.
                </p>
              </div>

              <h2 className="text-base font-bold">Popup Usage Example</h2>
              <CodeBlock
                language="javascript"
                code={`// Standalone Popup
const popup = new Popup()
  .setLatLng([51.5, -0.09])
  .setContent('<p>Hello world!<br />This is a nice popup.</p>')
  .openOn(map);

// Bound to a layer
marker.bindPopup("Content string or HTMLElement").openPopup();`}
              />

              <h2 className="text-base font-bold mt-6">Popup Options</h2>
              <DocTable
                headers={['Option', 'Type', 'Default', 'Description']}
                rows={[
                  [<code>maxWidth</code>, <code>Number</code>, '300', 'Maximum width in pixels.'],
                  [<code>minWidth</code>, <code>Number</code>, '50', 'Minimum width in pixels.'],
                  [<code>maxHeight</code>, <code>Number</code>, 'null', 'Creates scrollable container if content exceeds height.'],
                  [<code>autoPan</code>, <code>Boolean</code>, 'true', 'Pans map view so popup is fully visible when opened.'],
                  [<code>keepInView</code>, <code>Boolean</code>, 'false', 'Prevents user from panning popup off screen.'],
                  [<code>closeButton</code>, <code>Boolean</code>, 'true', 'Controls presence of close "x" button.'],
                  [<code>autoClose</code>, <code>Boolean</code>, 'true', 'Closes previous popup when a new one opens.'],
                  [<code>closeOnClick</code>, <code>Boolean</code>, 'true', 'Closes popup when user clicks map.'],
                ]}
              />

              <h2 className="text-base font-bold mt-6">Tooltip Usage Example</h2>
              <CodeBlock
                language="javascript"
                code={`// Hover Tooltip
marker.bindTooltip("Fast hover label", {
  direction: 'top',
  permanent: false,
  sticky: true
}).openTooltip();`}
              />
            </section>
          )}

          {/* TAB: ICON & DIVICON */}
          {activeTab === 'icon' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">Icon, Icon.Default & DivIcon</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  Customize marker graphics with image assets, Retina screens, or pure HTML <code>DivIcon</code> elements.
                </p>
              </div>

              <h2 className="text-base font-bold">Custom Image Icon</h2>
              <CodeBlock
                language="javascript"
                code={`const leafIcon = new Icon({
  iconUrl: 'leaf-green.png',
  shadowUrl: 'leaf-shadow.png',
  iconSize: [38, 95], // size of the icon
  shadowSize: [50, 64], // size of the shadow
  iconAnchor: [22, 94], // point of the icon which will correspond to marker's location
  shadowAnchor: [4, 62],
  popupAnchor: [-3, -76] // point from which the popup should open relative to the iconAnchor
});

new Marker([51.5, -0.09], { icon: leafIcon }).addTo(map);`}
              />

              <h2 className="text-base font-bold mt-6">DivIcon (HTML & CSS Markers)</h2>
              <CodeBlock
                language="javascript"
                code={`// Lightweight HTML pin marker
const htmlIcon = new DivIcon({
  className: 'custom-pin',
  html: '<div style="background:#ef4444; width:20px; height:20px; border-radius:50%; border:2px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

new Marker([51.5, -0.09], { icon: htmlIcon }).addTo(map);`}
              />
            </section>
          )}

          {/* TAB: TILELAYER */}
          {activeTab === 'tilelayer' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">TileLayer & WMS Service</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  Load and display raster slippy map tiles and OGC WMS (Web Map Service) layers.
                </p>
              </div>

              <h2 className="text-base font-bold">TileLayer Usage</h2>
              <CodeBlock
                language="javascript"
                code={`// OpenStreetMap TileLayer
const osm = new TileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Retina URL template with {r}
const retinaLayer = new TileLayer('https://{s}.tile.example.com/{z}/{x}/{y}{r}.png', {
  detectRetina: true,
  subdomains: ['a', 'b', 'c']
});`}
              />

              <h2 className="text-base font-bold mt-6">TileLayer.WMS</h2>
              <CodeBlock
                language="javascript"
                code={`// Weather radar WMS tile layer
const nexrad = new TileLayer.WMS("https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi", {
  layers: 'nexrad-n0r-900913',
  format: 'image/png',
  transparent: true,
  attribution: "Weather data © 2026 IEM Nexrad"
}).addTo(map);`}
              />
            </section>
          )}

          {/* TAB: OVERLAYS */}
          {activeTab === 'image-video-overlay' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">Image, Video & SVG Overlay</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  Display static floor plans, drone imagery, animated radar videos, or scalable SVGs tied to geographic bounds.
                </p>
              </div>

              <CodeBlock
                language="javascript"
                code={`// 1. ImageOverlay (Historical map or floor plan)
const imageUrl = 'https://maps.lib.utexas.edu/maps/historical/newark_nj_1922.jpg';
const imageBounds = [[40.7122, -74.2265], [40.7739, -74.1254]];
new ImageOverlay(imageUrl, imageBounds, { opacity: 0.8 }).addTo(map);

// 2. VideoOverlay (Satellite hurricane animation)
const videoUrl = 'https://www.mapbox.com/bites/00188/patricia_nasa.webm';
const videoBounds = [[32, -130], [13, -100]];
new VideoOverlay(videoUrl, videoBounds, {
  autoplay: true,
  loop: true,
  muted: true
}).addTo(map);`}
              />
            </section>
          )}

          {/* TAB: GRIDLAYER */}
          {activeTab === 'gridlayer' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">GridLayer</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  Generic base class for tiled grids of HTML elements (canvas, div, svg). Create custom heatmaps or dynamic tile renderers by implementing <code>createTile()</code>.
                </p>
              </div>

              <CodeBlock
                language="javascript"
                code={`// Custom GridLayer drawing coordinate numbers on Canvas
class CanvasGridLayer extends GridLayer {
  createTile(coords) {
    const tile = document.createElement('canvas');
    const size = this.getTileSize();
    tile.width = size.x;
    tile.height = size.y;

    const ctx = tile.getContext('2d');
    ctx.strokeStyle = '#3b82f6';
    ctx.strokeRect(0, 0, size.x, size.y);
    ctx.fillStyle = '#1e293b';
    ctx.font = '12px sans-serif';
    ctx.fillText(\`\${coords.x}, \${coords.y}, z:\${coords.z}\`, 10, 20);

    return tile;
  }
}

new CanvasGridLayer().addTo(map);`}
              />
            </section>
          )}

          {/* TAB: PATH & POLYLINE */}
          {activeTab === 'path-polyline' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">Path & Polyline</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  Abstract vector base class and Polyline class for drawing multi-point routes, GPS tracks, and multi-segments.
                </p>
              </div>

              <CodeBlock
                language="javascript"
                code={`// Red route polyline
const latlngs = [
  [45.51, -122.68],
  [37.77, -122.43],
  [34.04, -118.2]
];

const polyline = new Polyline(latlngs, {
  color: '#ef4444',
  weight: 5,
  opacity: 0.85,
  smoothFactor: 1.0,
  dashArray: '10, 5' // Dashed line
}).addTo(map);

// Zoom map to fit polyline
map.fitBounds(polyline.getBounds());`}
              />

              <h2 className="text-base font-bold mt-6">Common Path Options</h2>
              <DocTable
                headers={['Option', 'Type', 'Default', 'Description']}
                rows={[
                  [<code>stroke</code>, <code>Boolean</code>, 'true', 'Whether to draw stroke border.'],
                  [<code>color</code>, <code>String</code>, "'#3388ff'", 'Stroke color hex or rgba.'],
                  [<code>weight</code>, <code>Number</code>, '3', 'Stroke width in pixels.'],
                  [<code>opacity</code>, <code>Number</code>, '1.0', 'Stroke opacity.'],
                  [<code>dashArray</code>, <code>String</code>, 'null', 'SVG dash pattern (e.g. "5, 10").'],
                  [<code>fill</code>, <code>Boolean</code>, 'false', 'Whether to fill shape interior.'],
                  [<code>fillColor</code>, <code>String</code>, '*color*', 'Fill color.'],
                  [<code>fillOpacity</code>, <code>Number</code>, '0.2', 'Fill opacity.'],
                ]}
              />
            </section>
          )}

          {/* TAB: POLYGON & SHAPES */}
          {activeTab === 'polygon-shapes' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">Polygon, Rectangle & Circles</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  Enclosed vector geofences, bounding boxes, and geodesic circles.
                </p>
              </div>

              <CodeBlock
                language="javascript"
                code={`// 1. Polygon (with inner hole)
const polygon = new Polygon([
  // Outer boundary
  [[37, -109], [41, -109], [41, -102], [37, -102]],
  // Inner hole
  [[38, -107], [40, -107], [40, -104], [38, -104]]
], { color: '#10b981', fillOpacity: 0.3 }).addTo(map);

// 2. Rectangle
const bounds = [[54.55, -5.76], [56.12, -3.02]];
new Rectangle(bounds, { color: "#f59e0b", weight: 2 }).addTo(map);

// 3. Geodesic Circle (radius in meters)
new Circle([50.5, 30.5], {
  radius: 500, // 500 meters
  color: '#8b5cf6'
}).addTo(map);

// 4. CircleMarker (fixed radius in screen pixels)
new CircleMarker([50.5, 30.5], {
  radius: 12, // 12 pixels regardless of zoom
  color: '#ec4899'
}).addTo(map);`}
              />
            </section>
          )}

          {/* TAB: SVG & CANVAS */}
          {activeTab === 'svg-canvas' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">SVG & Canvas Renderers</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  Hardware accelerated vector renderers. Canvas mode delivers 60fps performance when displaying tens of thousands of vector features.
                </p>
              </div>

              <CodeBlock
                language="javascript"
                code={`// Prefer Canvas for all paths on the map
const map = new Map('map', {
  preferCanvas: true // Render all polylines and polygons on HTML5 Canvas
});

// Or instantiate a dedicated Canvas renderer instance
const myRenderer = new Canvas({ padding: 0.5 });
const line = new Polyline(latlngs, { renderer: myRenderer }).addTo(map);`}
              />
            </section>
          )}

          {/* TAB: LAYERGROUP & FEATUREGROUP */}
          {activeTab === 'layergroup' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">LayerGroup & FeatureGroup</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  Manage multiple layers as a single unit with synchronized event propagation and batch methods.
                </p>
              </div>

              <CodeBlock
                language="javascript"
                code={`// FeatureGroup with shared popup and click handler
const cities = new FeatureGroup([marker1, marker2, marker3])
  .bindPopup("Member of Cities Group")
  .on('click', function(e) {
    console.log("Clicked a city marker:", e.layer);
  })
  .addTo(map);

// Fit map to contain all cities in the group
map.fitBounds(cities.getBounds());`}
              />
            </section>
          )}

          {/* TAB: GEOJSON */}
          {activeTab === 'geojson' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">GeoJSON</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  Parse and render RFC 7946 GeoJSON datasets with custom styling, point conversion, and filter callbacks.
                </p>
              </div>

              <CodeBlock
                language="javascript"
                code={`const geojsonData = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [-105.016, 39.756] },
      "properties": { "name": "Coors Field", "amenity": "Baseball" }
    }
  ]
};

new GeoJSON(geojsonData, {
  pointToLayer: function (feature, latlng) {
    return new CircleMarker(latlng, {
      radius: 8,
      fillColor: "#ff7800",
      color: "#000",
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8
    });
  },
  onEachFeature: function (feature, layer) {
    if (feature.properties && feature.properties.name) {
      layer.bindPopup(feature.properties.name);
    }
  }
}).addTo(map);`}
              />
            </section>
          )}

          {/* TAB: LATLNG & LATLNGBOUNDS */}
          {activeTab === 'latlng-latlngbounds' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">LatLng & LatLngBounds</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  Geographical points and rectangular bounding areas on the ellipsoidal Earth.
                </p>
              </div>

              <CodeBlock
                language="javascript"
                code={`// LatLng creation
const p = new LatLng(51.5, -0.09);
console.log(p.lat, p.lng);

// Distance calculation in meters (Haversine formula)
const distanceMeters = p.distanceTo([51.5, -0.15]);

// LatLngBounds
const bounds = new LatLngBounds([40.712, -74.227], [40.774, -74.125]);
const center = bounds.getCenter();
const isInside = bounds.contains([40.73, -74.15]);`}
              />
            </section>
          )}

          {/* TAB: POINT & BOUNDS */}
          {activeTab === 'point-bounds' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">Point & Bounds</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  2D pixel coordinate math used for screen layout, tile offsets, and canvas positioning.
                </p>
              </div>

              <CodeBlock
                language="javascript"
                code={`const p1 = new Point(200, 300);
const p2 = new Point(50, 100);

// Vector arithmetic
const sum = p1.add(p2);       // Point(250, 400)
const scaled = p1.multiplyBy(2); // Point(400, 600)
const dist = p1.distanceTo(p2); // Euclidean pixel distance`}
              />
            </section>
          )}

          {/* TAB: CONTROLS */}
          {activeTab === 'controls' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">Controls</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  UI overlays added to map corners: Zoom buttons, legal Attribution, Layer switchers, and Scale bars.
                </p>
              </div>

              <CodeBlock
                language="javascript"
                code={`// 1. Layer Switcher Control
const baseMaps = {
  "OpenStreetMap": osmLayer,
  "Satellite": satelliteLayer
};
const overlayMaps = {
  "Radar Weather": weatherRadarLayer,
  "Earthquakes": quakeLayer
};
new Control.Layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);

// 2. Metric / Imperial Scale Bar
new Control.Scale({
  position: 'bottomleft',
  metric: true,
  imperial: true
}).addTo(map);`}
              />
            </section>
          )}

          {/* TAB: BROWSER & UTIL */}
          {activeTab === 'browser-util' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">Browser & Util Namespace</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  Internal browser capability detection and high-speed utility functions.
                </p>
              </div>

              <CodeBlock
                language="javascript"
                code={`// Browser feature detection
if (Browser.mobile) {
  console.log("Running on touch phone/tablet!");
}
if (Browser.retina) {
  console.log("High-DPI Retina screen active");
}

// Util formatting and templating
const str = Util.template("Hello {name}, your zoom is {zoom}", { name: "User", zoom: 12 });
const rounded = Util.formatNum(51.5052938492, 4); // 51.5053`}
              />
            </section>
          )}

          {/* TAB: DOM UTILITIES */}
          {activeTab === 'dom-utilities' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">DomEvent, DomUtil & Draggable</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  Cross-browser DOM event isolation, CSS 3D transformation utilities, and draggable elements.
                </p>
              </div>

              <CodeBlock
                language="javascript"
                code={`// Prevent clicks inside a custom sidebar from triggering map clicks
DomEvent.disableClickPropagation(sidebarElement);
DomEvent.disableScrollPropagation(sidebarElement);

// Smooth CSS 3D position
DomUtil.setPosition(el, new Point(100, 250));`}
              />
            </section>
          )}

          {/* TAB: LINEUTIL & POLYUTIL */}
          {activeTab === 'line-poly-util' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">LineUtil & PolyUtil Algorithms</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  Computational geometry: Ramer-Douglas-Peucker line simplification, Cohen-Sutherland line clipping, and Sutherland-Hodgman polygon clipping.
                </p>
              </div>

              <CodeBlock
                language="javascript"
                code={`// Simplify 10,000 points down to essential curve vertices
const simplified = LineUtil.simplify(pointsArray, 1.5);

// Calculate polygon centroid / center of mass
const centerLatLng = PolyUtil.polygonCenter(polygonPoints, CRS.EPSG3857);`}
              />
            </section>
          )}

          {/* TAB: BASE CLASSES */}
          {activeTab === 'base-classes' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">Class, Evented & Layer</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  Core OOP architecture powering Leaflet extensions and plugins.
                </p>
              </div>

              <CodeBlock
                language="javascript"
                code={`// Extend Class with options and init hooks
const CustomPlugin = Class.extend({
  options: {
    color: 'blue'
  },
  initialize(options) {
    Util.setOptions(this, options);
  },
  doSomething() {
    console.log("Plugin action with color:", this.options.color);
  }
});`}
              />
            </section>
          )}

          {/* TAB: CRS & PROJECTIONS */}
          {activeTab === 'crs-projection' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">CRS, Projections & Earth</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  Coordinate Reference Systems for projecting geospatial coordinates onto flat computer screens.
                </p>
              </div>

              <DocTable
                headers={['CRS', 'Code', 'Description']}
                rows={[
                  [<code>CRS.EPSG3857</code>, 'EPSG:3857', 'Spherical Mercator projection used by OpenStreetMap, Google Maps, Carto, Esri.'],
                  [<code>CRS.EPSG4326</code>, 'EPSG:4326', 'Equirectangular Plate Carrée WGS-84 projection used in scientific and GIS datasets.'],
                  [<code>CRS.EPSG3395</code>, 'EPSG:3395', 'Elliptical Mercator projection.'],
                  [<code>CRS.Earth</code>, '-', 'Base ellipsoid model for calculating geodesic distances in meters.'],
                ]}
              />
            </section>
          )}

          {/* TAB: REACT EMBED */}
          {activeTab === 'react-embed' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">React / Next.js Integration</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  Complete copy-paste ready React component wrapper for Map Atlas.
                </p>
              </div>

              <CodeBlock
                language="tsx"
                code={`import { useEffect, useRef } from 'react'
import { MapEngine } from './engine/MapEngine'

interface MapAtlasProps {
  center?: [number, number]
  zoom?: number
  onMarkerClick?: (lat: number, lng: number) => void
}

export function MapAtlas({ center = [40.7128, -74.0060], zoom = 13, onMarkerClick }: MapAtlasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<MapEngine | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const engine = new MapEngine(containerRef.current, {
      center,
      zoom,
      tileUrls: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      attribution: '&copy; OpenStreetMap contributors',
      keyboard: true,
      inertia: true,
    })
    engineRef.current = engine

    engine.addMarker({ lat: center[0], lng: center[1] }, {
      color: '#3b82f6',
      size: 14,
      label: 'Home Location'
    })

    engine.on('click', (e: any) => {
      if (onMarkerClick && e?.latlng) {
        onMarkerClick(e.latlng.lat, e.latlng.lng)
      }
    })

    return () => {
      engine.destroy()
    }
  }, [])

  return (
    <div 
      ref={containerRef} 
      style={{ width: '100%', height: '500px', borderRadius: '16px', overflow: 'hidden' }} 
    />
  )
}`}
              />
            </section>
          )}

          {/* TAB: VUE EMBED */}
          {activeTab === 'vue-embed' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">Vue 3 / Nuxt Integration</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  Vue 3 Composition API integration with reactive map props.
                </p>
              </div>

              <CodeBlock
                language="vue"
                code={`<template>
  <div ref="mapContainer" class="map-view" />
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { MapEngine } from './engine/MapEngine'

const props = defineProps({
  lat: { type: Number, default: 48.8566 },
  lng: { type: Number, default: 2.3522 },
  zoom: { type: Number, default: 13 }
})

const mapContainer = ref<HTMLDivElement | null>(null)
let engine: MapEngine | null = null

onMounted(() => {
  if (!mapContainer.value) return
  engine = new MapEngine(mapContainer.value, {
    center: [props.lat, props.lng],
    zoom: props.zoom,
    tileUrls: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png']
  })
})

onBeforeUnmount(() => {
  engine?.destroy()
})
</script>

<style scoped>
.map-view {
  width: 100%;
  height: 600px;
  position: relative;
  border-radius: 16px;
}
</style>`}
              />
            </section>
          )}

          {/* TAB: IFRAME EMBED */}
          {activeTab === 'iframe-embed' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">HTML & iframe Embed</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  Embed live Map Atlas instances into any website or CMS with single-line iframes.
                </p>
              </div>

              <CodeBlock
                language="html"
                code={`<iframe
  src="https://mapapp-lovat.vercel.app/?embed=true#40.71280,-74.00600,13.00"
  width="100%"
  height="500px"
  style="border: 0; border-radius: 16px; box-shadow: 0 4px 25px rgba(0,0,0,0.15);"
  allow="geolocation"
  loading="lazy"
></iframe>`}
              />
            </section>
          )}

          {/* TAB: APIS */}
          {activeTab === 'apis' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">REST Services & Open APIs</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  High-speed external open APIs integrated into Map Atlas with zero CORS restrictions.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900">
                  <h3 className="font-bold text-sm text-blue-600 dark:text-blue-400">1. Komoot Photon POI Search</h3>
                  <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1">
                    CORS-enabled geocoding and POI search across OpenStreetMap amenity, tourism, and shop tags.
                  </p>
                  <code className="block mt-2 p-2 rounded bg-white dark:bg-zinc-800 font-mono text-xs">
                    GET https://photon.komoot.io/api/?q=coffee&lat=51.5074&lon=-0.1278&limit=40
                  </code>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900">
                  <h3 className="font-bold text-sm text-emerald-600 dark:text-emerald-400">2. OSRM Routing with Toll/Highway Avoidance</h3>
                  <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1">
                    Multi-modal navigation routes with turn-by-turn geometry and exclusions.
                  </p>
                  <code className="block mt-2 p-2 rounded bg-white dark:bg-zinc-800 font-mono text-xs">
                    GET https://router.project-osrm.org/route/v1/driving/lng1,lat1;lng2,lat2?overview=full&exclude=toll,motorway
                  </code>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900">
                  <h3 className="font-bold text-sm text-sky-600 dark:text-sky-400">3. RainViewer Live Radar Maps</h3>
                  <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1">
                    Global real-time precipitation radar tiles updated every 10 minutes.
                  </p>
                  <code className="block mt-2 p-2 rounded bg-white dark:bg-zinc-800 font-mono text-xs">
                    GET https://api.rainviewer.com/public/weather-maps.json
                  </code>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900">
                  <h3 className="font-bold text-sm text-purple-600 dark:text-purple-400">4. USGS 24h Live Earthquakes Feed</h3>
                  <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1">
                    Real-time seismic data feed updated every minute by the United States Geological Survey.
                  </p>
                  <code className="block mt-2 p-2 rounded bg-white dark:bg-zinc-800 font-mono text-xs">
                    GET https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson
                  </code>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}
