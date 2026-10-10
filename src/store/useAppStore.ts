import { create } from 'zustand'
import type { DrawTool, DrawnShape, GeocodeResult, LatLng, OSRMRoute, SavedPlace, TrackPoint } from '../types'
import type { WikipediaPlaceSummary, EarthquakeRecord } from '../services/api'
import { fetchLiveEarthquakes } from '../services/api'

export interface LayerVisibility {
  routes: boolean
  pins: boolean
  searchResults: boolean
  shapes: boolean
  measure: boolean
  track: boolean
  userLocation: boolean
  places: boolean
  earthquakes: boolean
  traffic: boolean
}

export interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  latlng: LatLng
}

export type PanelTab = 'search' | 'directions' | 'layers' | 'tools' | 'places' | 'all'

interface AppState {
  // Map style
  style: string
  setStyle: (s: string) => void

  // Panel
  panelOpen: boolean
  activeTab: PanelTab
  setActiveTab: (t: PanelTab) => void
  togglePanel: () => void
  openPanel: (tab?: PanelTab) => void
  closePanel: () => void

  // Dark mode
  dark: boolean
  toggleDark: () => void

  // 3D Globe mode
  globeMode: boolean
  setGlobeMode: (on: boolean) => void
  toggleGlobeMode: () => void

  // Search
  searchResults: GeocodeResult[]
  setSearchResults: (r: GeocodeResult[]) => void
  searchSuggestions: GeocodeResult[]
  setSearchSuggestions: (r: GeocodeResult[]) => void

  // Directions
  from: LatLng | null
  to: LatLng | null
  waypoints: LatLng[]
  routes: OSRMRoute[]
  routeIndex: number
  routingProfile: string
  dirStatus: string
  setFrom: (p: LatLng | null) => void
  setTo: (p: LatLng | null) => void
  addWaypoint: (p: LatLng) => void
  removeWaypoint: (i: number) => void
  setWaypoints: (w: LatLng[]) => void
  clearWaypoints: () => void
  setRoutes: (r: OSRMRoute[]) => void
  setRouteIndex: (i: number) => void
  setRoutingProfile: (p: string) => void
  setDirStatus: (s: string) => void
  clearDirections: () => void

  // GPS Navigation Mode
  navActive: boolean
  setNavActive: (active: boolean) => void
  voiceNavEnabled: boolean
  toggleVoiceNav: () => void

  // Drawing
  drawTool: DrawTool
  setDrawTool: (t: DrawTool) => void
  drawnShapes: DrawnShape[]
  addShape: (s: DrawnShape) => void
  removeShape: (id: number) => void
  clearShapes: () => void

  // Undo/Redo
  undoStack: DrawnShape[][]
  redoStack: DrawnShape[][]
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean

  // Measure
  measureMode: boolean
  measurePts: LatLng[]
  toggleMeasure: () => void
  addMeasurePoint: (p: LatLng) => void
  clearMeasure: () => void

  // Saved places
  places: SavedPlace[]
  setPlaces: (p: SavedPlace[]) => void
  addPlace: (p: SavedPlace) => void
  removePlace: (id: number) => void

  // Track recording
  recording: boolean
  track: TrackPoint[]
  setTrack: (t: TrackPoint[]) => void
  setRecording: (r: boolean) => void
  addTrackPoint: (p: TrackPoint) => void
  clearTrack: () => void

  // Geolocation
  userLocation: LatLng | null
  setUserLocation: (p: LatLng | null) => void

  // Layer visibility
  layers: LayerVisibility
  toggleLayer: (key: keyof LayerVisibility) => void

  // Context menu
  contextMenu: ContextMenuState
  showContextMenu: (x: number, y: number, latlng: LatLng) => void
  hideContextMenu: () => void

  // Coordinate picker
  coordPickerMode: boolean
  setCoordPickerMode: (on: boolean) => void

  // Toast
  toast: string
  showToast: (msg: string) => void

  // Fullscreen
  fullscreen: boolean
  toggleFullscreen: () => void

  // Live Earthquakes
  earthquakeData: EarthquakeRecord[]
  fetchEarthquakes: () => Promise<void>

  // Selected Wikipedia Place Card
  selectedPlace: WikipediaPlaceSummary | null
  setSelectedPlace: (p: WikipediaPlaceSummary | null) => void

  // Street View
  streetViewCoord: LatLng | null
  setStreetViewCoord: (coord: LatLng | null) => void

  // Compass / Device Orientation
  compassActive: boolean
  compassHeading: number | null
  setCompassActive: (active: boolean) => void
  setCompassHeading: (heading: number | null) => void
  toggleCompass: () => void

  // Offline Area Manager Modal
  offlineManagerOpen: boolean
  setOfflineManagerOpen: (open: boolean) => void
}

function loadPlaces(): SavedPlace[] {
  try {
    return JSON.parse(localStorage.getItem('mapapp.places') || '[]')
  } catch {
    return []
  }
}

function persistPlaces(places: SavedPlace[]) {
  try {
    localStorage.setItem('mapapp.places', JSON.stringify(places))
  } catch {
    /* quota exceeded */
  }
}

let toastTimer: ReturnType<typeof setTimeout> | undefined

export const useAppStore = create<AppState>((set, get) => ({
  style: 'osm',
  setStyle: s => set({ style: s }),

  panelOpen: typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
  activeTab: 'search',
  setActiveTab: t => set({ activeTab: t, panelOpen: true }),
  togglePanel: () => set(s => ({ panelOpen: !s.panelOpen })),
  openPanel: tab => set({ panelOpen: true, ...(tab ? { activeTab: tab } : {}) }),
  closePanel: () => set({ panelOpen: false }),

  dark: false,
  toggleDark: () => {
    const d = !get().dark
    set({ dark: d })
    document.documentElement.classList.toggle('dark', d)
  },

  globeMode: false,
  setGlobeMode: on => set({ globeMode: on }),
  toggleGlobeMode: () => set(s => ({ globeMode: !s.globeMode })),

  searchResults: [],
  setSearchResults: r => set({ searchResults: r }),
  searchSuggestions: [],
  setSearchSuggestions: r => set({ searchSuggestions: r }),

  from: null,
  to: null,
  waypoints: [],
  routes: [],
  routeIndex: 0,
  routingProfile: 'driving',
  dirStatus: '',
  setFrom: p => set({ from: p }),
  setTo: p => set({ to: p }),
  addWaypoint: p => set(s => ({ waypoints: [...s.waypoints, p] })),
  removeWaypoint: i => set(s => ({ waypoints: s.waypoints.filter((_, idx) => idx !== i) })),
  setWaypoints: w => set({ waypoints: w }),
  clearWaypoints: () => set({ waypoints: [] }),
  setRoutes: r => set({ routes: r, routeIndex: 0 }),
  setRouteIndex: i => set({ routeIndex: i }),
  setRoutingProfile: p => set({ routingProfile: p }),
  setDirStatus: s => set({ dirStatus: s }),
  clearDirections: () => set({ from: null, to: null, waypoints: [], routes: [], routeIndex: 0, dirStatus: '', navActive: false }),

  navActive: false,
  setNavActive: active => set({ navActive: active }),
  voiceNavEnabled: true,
  toggleVoiceNav: () => set(s => ({ voiceNavEnabled: !s.voiceNavEnabled })),

  drawTool: 'none',
  setDrawTool: t => set({ drawTool: t }),
  drawnShapes: [],
  addShape: s =>
    set(st => ({
      drawnShapes: [...st.drawnShapes, s],
      undoStack: [...st.undoStack, st.drawnShapes],
      redoStack: [],
      canUndo: true,
      canRedo: false,
    })),
  removeShape: id =>
    set(st => ({
      drawnShapes: st.drawnShapes.filter(x => x.id !== id),
      undoStack: [...st.undoStack, st.drawnShapes],
      redoStack: [],
      canUndo: true,
      canRedo: false,
    })),
  clearShapes: () =>
    set(st => ({
      drawnShapes: [],
      undoStack: [...st.undoStack, st.drawnShapes],
      redoStack: [],
      canUndo: true,
      canRedo: false,
    })),

  undoStack: [],
  redoStack: [],
  undo: () =>
    set(st => {
      if (!st.undoStack.length) return st
      const prev = st.undoStack[st.undoStack.length - 1]
      const newUndo = st.undoStack.slice(0, -1)
      return {
        drawnShapes: prev,
        undoStack: newUndo,
        redoStack: [...st.redoStack, st.drawnShapes],
        canUndo: newUndo.length > 0,
        canRedo: true,
      }
    }),
  redo: () =>
    set(st => {
      if (!st.redoStack.length) return st
      const next = st.redoStack[st.redoStack.length - 1]
      const newRedo = st.redoStack.slice(0, -1)
      return {
        drawnShapes: next,
        undoStack: [...st.undoStack, st.drawnShapes],
        redoStack: newRedo,
        canUndo: true,
        canRedo: newRedo.length > 0,
      }
    }),
  canUndo: false,
  canRedo: false,

  measureMode: false,
  measurePts: [],
  toggleMeasure: () =>
    set(s => {
      const on = !s.measureMode
      return { measureMode: on, measurePts: on ? s.measurePts : [] }
    }),
  addMeasurePoint: p => set(s => ({ measurePts: [...s.measurePts, p] })),
  clearMeasure: () => set({ measurePts: [] }),

  places: loadPlaces(),
  setPlaces: p => {
    persistPlaces(p)
    set({ places: p })
  },
  addPlace: p => {
    const places = [...get().places, p]
    persistPlaces(places)
    set({ places })
  },
  removePlace: id => {
    const places = get().places.filter(x => x.id !== id)
    persistPlaces(places)
    set({ places })
  },

  recording: false,
  track: [],
  setTrack: t => set({ track: t }),
  setRecording: r => set({ recording: r }),
  addTrackPoint: p => set(s => ({ track: [...s.track, p] })),
  clearTrack: () => set({ track: [] }),

  userLocation: null,
  setUserLocation: p => set({ userLocation: p }),

  layers: {
    routes: true,
    pins: true,
    searchResults: true,
    shapes: true,
    measure: true,
    track: true,
    userLocation: true,
    places: true,
    earthquakes: false,
    traffic: false,
  },
  toggleLayer: key => {
    const next = !get().layers[key]
    set(s => ({
      layers: { ...s.layers, [key]: next },
    }))
    if (key === 'earthquakes' && next && !get().earthquakeData.length) {
      get().fetchEarthquakes()
    }
  },

  earthquakeData: [],
  fetchEarthquakes: async () => {
    try {
      get().showToast('Fetching USGS live earthquakes…')
      const data = await fetchLiveEarthquakes()
      set({ earthquakeData: data })
      get().showToast(`Loaded ${data.length} recent earthquakes`)
    } catch (err) {
      get().showToast(err instanceof Error ? err.message : 'Earthquake feed failed')
    }
  },

  selectedPlace: null,
  setSelectedPlace: p => set({ selectedPlace: p }),

  streetViewCoord: null,
  setStreetViewCoord: coord => set({ streetViewCoord: coord }),

  contextMenu: { visible: false, x: 0, y: 0, latlng: { lat: 0, lng: 0 } },
  showContextMenu: (x, y, latlng) => set({ contextMenu: { visible: true, x, y, latlng } }),
  hideContextMenu: () => set(s => ({ contextMenu: { ...s.contextMenu, visible: false } })),

  coordPickerMode: false,
  setCoordPickerMode: on => set({ coordPickerMode: on }),

  toast: '',
  showToast: msg => {
    set({ toast: msg })
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => set({ toast: '' }), 4000)
  },

  fullscreen: false,
  toggleFullscreen: () => set(s => ({ fullscreen: !s.fullscreen })),

  compassActive: false,
  compassHeading: null,
  setCompassActive: active => set({ compassActive: active }),
  setCompassHeading: heading => set({ compassHeading: heading }),
  toggleCompass: () => set(s => ({ compassActive: !s.compassActive })),

  offlineManagerOpen: false,
  setOfflineManagerOpen: open => set({ offlineManagerOpen: open }),
}))
