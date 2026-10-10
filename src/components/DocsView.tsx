import { useState } from 'react'
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
    <div className="relative my-4 rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-850 bg-zinc-900 text-zinc-100 font-mono text-xs shadow-md">
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

export default function DocsView() {
  const [activeTab, setActiveTab] = useState('map-engine')
  const [searchQuery, setSearchQuery] = useState('')

  const navItems = [
    { id: 'overview', title: 'Overview & Quickstart', icon: Zap },
    { id: 'map-engine', title: 'MapEngine (Core Class)', icon: Terminal },
    { id: 'globe-engine', title: 'GlobeEngine (3D Mode)', icon: Globe2 },
    { id: 'vector-layers', title: 'Vector Layers & Shapes', icon: Layers },
    { id: 'raster-layers', title: 'TileLayer & Weather Radar', icon: CloudRain },
    { id: 'types-math', title: 'Types, CRS & Rust WASM', icon: Cpu },
    { id: 'react-embed', title: 'React / Next.js Integration', icon: Code2 },
    { id: 'vue-embed', title: 'Vue 3 / Nuxt Integration', icon: Boxes },
    { id: 'iframe-embed', title: 'HTML & iframe Embed', icon: ExternalLink },
    { id: 'apis', title: 'REST Services & Open APIs', icon: Table },
  ]

  const filteredNav = navItems.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleReturnToMap = () => {
    window.history.pushState(null, '', '/')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <div className="min-h-screen w-full bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 flex flex-col antialiased selection:bg-blue-500 selection:text-white">
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
            <span className="font-bold text-base tracking-tight">Map Atlas API Reference</span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-400">
              v2.4
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
        <aside className="w-64 shrink-0 hidden md:block sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter API docs…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <nav className="space-y-1">
            {filteredNav.map(item => {
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
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.title}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 max-w-4xl space-y-10 pb-16">
          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-4">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Map Atlas Documentation</h1>
                <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
                  An open-source, zero-dependency JavaScript/TypeScript mapping engine for building lightning-fast interactive maps, 3D globes, and routing applications.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 text-xs">
                <h3 className="font-bold text-sm text-blue-900 dark:text-blue-300 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-600" />
                  <span>Why Map Atlas?</span>
                </h3>
                <p className="mt-1 text-gray-700 dark:text-zinc-300 leading-relaxed">
                  Unlike traditional heavy mapping libraries (Leaflet, Mapbox, or Google Maps), Map Atlas is written from scratch with pure Web APIs: Canvas 2D / WebGL rendering, Web Mercator projection, SVG vector overlays, smooth inertial physics, and WebAssembly acceleration. It has <strong>zero third-party NPM runtime dependencies</strong> and operates completely offline with IndexedDB tile storage.
                </p>
              </div>

              <h2 className="text-lg font-bold">Quick Usage Example</h2>
              <CodeBlock
                language="javascript"
                code={`// 1. Target a container <div> in your HTML
const container = document.getElementById('map')

// 2. Instantiate MapEngine
const map = new MapEngine(container, {
  center: [51.505, -0.09], // [latitude, longitude]
  zoom: 13,
  tileUrls: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
  attribution: '&copy; OpenStreetMap contributors',
  keyboard: true,
  inertia: true,
})

// 3. Add an interactive marker
map.addMarker({ lat: 51.505, lng: -0.09 }, {
  color: '#ef4444',
  size: 14,
  label: 'London Center',
})

// 4. Add a polyline track
map.addPolyline([
  { lat: 51.505, lng: -0.09 },
  { lat: 51.51, lng: -0.1 },
  { lat: 51.515, lng: -0.08 }
], {
  color: '#3b82f6',
  weight: 4,
  opacity: 0.8
})`}
              />
            </section>
          )}

          {/* TAB: MAP ENGINE CORE CLASS */}
          {activeTab === 'map-engine' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">MapEngine</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  The central class of the API. Used to initialize and manipulate interactive 2D slippy maps on a DOM element.
                </p>
              </div>

              <h2 className="text-base font-bold">Constructor</h2>
              <div className="p-3 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 font-mono text-xs">
                <code>new MapEngine(container: HTMLElement, options?: MapEngineOptions)</code>
              </div>

              <h2 className="text-base font-bold mt-6">MapEngineOptions</h2>
              <div className="overflow-x-auto border border-gray-200 dark:border-zinc-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 dark:bg-zinc-900 font-bold border-b border-gray-200 dark:border-zinc-800">
                    <tr>
                      <th className="p-3">Option</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Default</th>
                      <th className="p-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-zinc-800 text-gray-700 dark:text-zinc-300">
                    <tr>
                      <td className="p-3 font-mono font-semibold text-blue-600">center</td>
                      <td className="p-3 font-mono">[number, number]</td>
                      <td className="p-3 font-mono">[0, 0]</td>
                      <td className="p-3">Initial geographical center of the map [latitude, longitude].</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-blue-600">zoom</td>
                      <td className="p-3 font-mono">number</td>
                      <td className="p-3 font-mono">2</td>
                      <td className="p-3">Initial map zoom level (1 to 19).</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-blue-600">minZoom</td>
                      <td className="p-3 font-mono">number</td>
                      <td className="p-3 font-mono">1</td>
                      <td className="p-3">Minimum zoom level. Zooming out past minZoom fires <code>zoomlimit-min</code>.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-blue-600">maxZoom</td>
                      <td className="p-3 font-mono">number</td>
                      <td className="p-3 font-mono">19</td>
                      <td className="p-3">Maximum zoom level.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-blue-600">tileUrls</td>
                      <td className="p-3 font-mono">string[]</td>
                      <td className="p-3 font-mono">['...OSM...']</td>
                      <td className="p-3">URL template array for base raster tiles (e.g. <code>https://tile.openstreetmap.org/&#123;z&#125;/&#123;x&#125;/&#123;y&#125;.png</code>).</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-blue-600">attribution</td>
                      <td className="p-3 font-mono">string</td>
                      <td className="p-3 font-mono">''</td>
                      <td className="p-3">HTML attribution notice displayed in bottom right badge.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-blue-600">inertia</td>
                      <td className="p-3 font-mono">boolean</td>
                      <td className="p-3 font-mono">true</td>
                      <td className="p-3">Enables smooth kinetic panning momentum after pointer or touch drag release.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-blue-600">keyboard</td>
                      <td className="p-3 font-mono">boolean</td>
                      <td className="p-3 font-mono">true</td>
                      <td className="p-3">Enables arrow key panning and +/- keyboard zooming.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-blue-600">scaleBar</td>
                      <td className="p-3 font-mono">boolean</td>
                      <td className="p-3 font-mono">true</td>
                      <td className="p-3">Displays a live dynamic metric scale bar indicator in kilometers/meters.</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h2 className="text-base font-bold mt-6">Methods: Modifying Map State</h2>
              <div className="overflow-x-auto border border-gray-200 dark:border-zinc-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 dark:bg-zinc-900 font-bold border-b border-gray-200 dark:border-zinc-800">
                    <tr>
                      <th className="p-3">Method</th>
                      <th className="p-3">Returns</th>
                      <th className="p-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-zinc-800 text-gray-700 dark:text-zinc-300">
                    <tr>
                      <td className="p-3 font-mono font-semibold text-blue-600">setView(center, zoom)</td>
                      <td className="p-3 font-mono">void</td>
                      <td className="p-3">Sets geographical center and zoom level instantaneously.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-blue-600">flyTo(lat, lng, zoom?)</td>
                      <td className="p-3 font-mono">void</td>
                      <td className="p-3">Smoothly animates camera transition to target coordinates using smooth cubic curve.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-blue-600">panTo(lat, lng)</td>
                      <td className="p-3 font-mono">void</td>
                      <td className="p-3">Pans map center to given latitude and longitude.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-blue-600">fitBounds(points)</td>
                      <td className="p-3 font-mono">void</td>
                      <td className="p-3">Calculates bounding box containing all given LatLng points and zooms map to fit.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-blue-600">setTiles(templates, attr, cssFilter?)</td>
                      <td className="p-3 font-mono">void</td>
                      <td className="p-3">Switches active tile provider (e.g. OpenStreetMap, Satellite, Dark Mode, Topo, or Weather Radar overlay).</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-blue-600">destroy()</td>
                      <td className="p-3 font-mono">void</td>
                      <td className="p-3">Destroys DOM nodes, halts animation frames, and unbinds all pointer/keyboard listeners.</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h2 className="text-base font-bold mt-6">Events</h2>
              <div className="overflow-x-auto border border-gray-200 dark:border-zinc-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 dark:bg-zinc-900 font-bold border-b border-gray-200 dark:border-zinc-800">
                    <tr>
                      <th className="p-3">Event</th>
                      <th className="p-3">Data</th>
                      <th className="p-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-zinc-800 text-gray-700 dark:text-zinc-300">
                    <tr>
                      <td className="p-3 font-mono font-semibold text-blue-600">click</td>
                      <td className="p-3 font-mono">&#123; latlng: LatLng &#125;</td>
                      <td className="p-3">Fired when the user clicks or taps on the map canvas.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-blue-600">mousemove</td>
                      <td className="p-3 font-mono">&#123; latlng: LatLng &#125;</td>
                      <td className="p-3">Fired continuously as pointer hovers over map coordinates.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-blue-600">moveend</td>
                      <td className="p-3 font-mono">void</td>
                      <td className="p-3">Fired when map finishes moving or inertia gliding stops.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-blue-600">contextmenu</td>
                      <td className="p-3 font-mono">&#123; latlng: LatLng, x: number, y: number &#125;</td>
                      <td className="p-3">Fired on right click or mobile long press.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-blue-600">zoomlimit-min</td>
                      <td className="p-3 font-mono">void</td>
                      <td className="p-3">Fired when user zooms out past zoom level 1, enabling auto-transition to 3D Globe mode.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* TAB: GLOBE ENGINE */}
          {activeTab === 'globe-engine' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">GlobeEngine (3D Canvas Sphere)</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  Full 3D spherical Earth visualization rendered on HTML5 Canvas without Three.js. Supports orbital drag, auto-spin, and seamless zoom transitions into 2D slippy maps.
                </p>
              </div>

              <CodeBlock
                language="typescript"
                code={`import { GlobeEngine } from './engine/GlobeEngine'

// Instantiate 3D Globe on an HTML container
const globe = new GlobeEngine(globeContainerElement, {
  onZoomIn: (lat, lng) => {
    console.log('User zoomed into coordinates:', lat, lng)
    // Switch to 2D MapEngine centered at (lat, lng)
  }
})

// Set globe center rotation
globe.setCenter(20.5937, 78.9629) // India center

// Set automatic idle rotation
globe.setAutoRotate(true)`}
              />
            </section>
          )}

          {/* TAB: VECTOR LAYERS */}
          {activeTab === 'vector-layers' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">Vector Layers & Overlays</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  Draw markers, polylines, polygons, circles, and automatic marker clusters on your map.
                </p>
              </div>

              <h2 className="text-base font-bold">1. Markers & Clustering</h2>
              <CodeBlock
                language="typescript"
                code={`// Single Marker
const marker = map.addMarker({ lat: 40.7128, lng: -74.0060 }, {
  color: '#3b82f6',
  size: 14,
  label: 'New York City',
  draggable: false
})

// Remove marker
marker.remove()

// Marker Clustering: automatically groups thousands of points at lower zooms
map.setClusterMarkers([
  { id: 1, lat: 40.712, lng: -74.005, color: '#ef4444' },
  { id: 2, lat: 40.715, lng: -74.009, color: '#ef4444' },
  // ... thousands of points
])`}
              />

              <h2 className="text-base font-bold mt-6">2. Polylines & Polygons</h2>
              <CodeBlock
                language="typescript"
                code={`// Polyline
const line = map.addPolyline([
  { lat: 37.77, lng: -122.41 },
  { lat: 34.05, lng: -118.24 }
], {
  color: '#2563eb',
  weight: 4,
  opacity: 0.9,
  dash: '8 4' // dashed line
})

// Polygon with fill
const poly = map.addPolygon([
  { lat: 25.77, lng: -80.19 },
  { lat: 18.46, lng: -66.10 },
  { lat: 32.30, lng: -64.78 }
], {
  color: '#dc2626',
  fill: 'rgba(239, 68, 68, 0.25)',
  weight: 2
})`}
              />
            </section>
          )}

          {/* TAB: RASTER LAYERS */}
          {activeTab === 'raster-layers' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">TileLayer & Live Weather Radar</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  High-DPI slippy map tiles with multi-layer stacking, dark-mode CSS filters, and RainViewer live radar overlays.
                </p>
              </div>

              <CodeBlock
                language="typescript"
                code={`// Set Street & Topo tiles
map.setTiles(
  ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
  '&copy; OpenStreetMap contributors'
)

// Invert to sleek Dark Mode using CSS filter
map.setTiles(
  ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
  '&copy; OpenStreetMap',
  'invert(88%) hue-rotate(180deg) brightness(0.92) contrast(1.08) saturate(0.4)'
)

// Stack Live Weather Radar overlay on top of Base Map
const radarTimestamp = 1718000000 // fetched from RainViewer API
map.setTiles([
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  \`https://tilecache.rainviewer.com/v2/radar/\${radarTimestamp}/256/{z}/{x}/{y}/2/1_1.png\`
])`}
              />
            </section>
          )}

          {/* TAB: TYPES & RUST WASM */}
          {activeTab === 'types-math' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">Types, CRS & Rust WebAssembly</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  Ellipsoidal coordinate transforms and Rust WASM line simplification algorithms.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900">
                  <h3 className="font-bold text-xs uppercase text-blue-500">EPSG:3857 Web Mercator</h3>
                  <code className="block mt-2 font-mono text-xs">
                    project(lat, lng, zoom): Point &#123; x, y &#125;
                  </code>
                  <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1">
                    Converts WGS-84 decimal latitude/longitude into screen pixel coordinates at the given zoom level.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900">
                  <h3 className="font-bold text-xs uppercase text-emerald-500">Inverse Mercator</h3>
                  <code className="block mt-2 font-mono text-xs">
                    unproject(x, y, zoom): LatLng &#123; lat, lng &#125;
                  </code>
                  <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1">
                    Converts pixel coordinate offset back to geographical LatLng.
                  </p>
                </div>
              </div>

              <h2 className="text-base font-bold mt-6">Rust WebAssembly Integration (wasmGeo)</h2>
              <CodeBlock
                language="typescript"
                code={`import { simplifyTrackWasm, isPointInPolygonWasm } from './engine/wasmGeo'

// High-speed Douglas-Peucker GPS polyline simplification
// Reduces 15,000 raw GPS coordinates to 800 key vertices in 1.4 milliseconds
const simplifiedPoints = simplifyTrackWasm(rawGpsTrack, 0.0001)

// High-frequency ray-casting geofence check
const insideGeofence = isPointInPolygonWasm(
  { lat: 40.7128, lng: -74.0060 }, 
  polygonVertices
)`}
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

              <h2 className="text-base font-bold mt-4">URL Hash & Query Parameters</h2>
              <div className="overflow-x-auto border border-gray-200 dark:border-zinc-800 rounded-xl mt-2">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 dark:bg-zinc-900 font-bold border-b border-gray-200 dark:border-zinc-800">
                    <tr>
                      <th className="p-3">Parameter</th>
                      <th className="p-3">Example</th>
                      <th className="p-3">Effect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-zinc-800 text-gray-700 dark:text-zinc-300">
                    <tr>
                      <td className="p-3 font-mono font-semibold text-blue-600">embed=true</td>
                      <td className="p-3 font-mono">?embed=true</td>
                      <td className="p-3">Hides sidebars and bottom navigation for a clean embedded map widget.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-blue-600">style</td>
                      <td className="p-3 font-mono">?style=satellite</td>
                      <td className="p-3">Changes map layer: <code>osm</code>, <code>satellite</code>, <code>dark</code>, or <code>topo</code>.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-blue-600">#lat,lng,zoom</td>
                      <td className="p-3 font-mono">#9.9312,76.2673,14.00</td>
                      <td className="p-3">Coordinates and zoom level hash.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* TAB: REST SERVICES & OPEN APIS */}
          {activeTab === 'apis' && (
            <section className="space-y-6">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-3">
                <h1 className="text-2xl font-bold tracking-tight">REST Services & Open APIs</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  Overview of all external open APIs with zero CORS restrictions.
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
