/* Shared types for MapApp. */

export interface LatLng {
  lat: number
  lng: number
}

export interface LatLngTuple {
  0: number
  1: number
}

export interface MapView {
  center: [number, number] // [lat, lng]
  zoom: number
}

export interface TileStyle {
  label: string
  tiles: string[]
  attribution: string
  maxZoom?: number
}

export interface RoutingProfile {
  label: string
  osrm: string
  valhalla?: string
}

export interface MapConfig {
  center: [number, number]
  zoom: number
  defaultStyle: string
  minZoom: number
  maxZoom: number
  styles: Record<string, TileStyle>
  nominatimUrl: string
  overpassUrl: string
  nearbyRadiusMeters: number
  nearby: Record<string, string>
  routingBaseUrl: string
  valhallaUrl: string
  profiles: Record<string, RoutingProfile>
  elevationUrl: string
  weatherUrl: string
}

/* ---- OSRM ---- */

export interface OSMRManeuver {
  type: string
  modifier?: string
  location: [number, number]
}

export interface OSRMStep {
  maneuver: OSMRManeuver
  name: string
  distance: number
  duration: number
  geometry: { coordinates: [number, number][] }
}

export interface OSRMLeg {
  steps: OSRMStep[]
  distance: number
  duration: number
}

export interface OSRMRoute {
  distance: number
  duration: number
  geometry: { coordinates: [number, number][] }
  legs: OSRMLeg[]
}

/* ---- Nominatim ---- */

export interface GeocodeResult {
  label: string
  lat: number
  lng: number
  category?: string
}

/* ---- Overpass ---- */

export interface NearbyResult {
  lat: number
  lng: number
  label: string
  tags?: Record<string, string>
}

/* ---- Weather ---- */

export interface WeatherResult {
  temperature: number
  tempUnit: string
  wind: number
  windUnit: string
}

/* ---- Places ---- */

export interface SavedPlace {
  id: number
  name: string
  lat: number
  lng: number
}

/* ---- Drawing ---- */

export type DrawTool = 'none' | 'measure' | 'line' | 'polygon' | 'rectangle'

export interface DrawnShape {
  id: number
  type: 'line' | 'polygon' | 'rectangle'
  points: LatLng[]
  label?: string
}

/* ---- Track recording ---- */

export interface TrackPoint {
  lat: number
  lng: number
  time: number
  accuracy?: number
}

/* ---- Elevation ---- */

export interface ElevationProfilePoint {
  lat: number
  lng: number
  elevation: number
}

/* ---- Map engine events ---- */

export interface MapClickEvent {
  latlng: LatLng
  originalEvent: PointerEvent
}

export interface MapMouseEvent {
  latlng: LatLng
}

export interface MapEngineEvents {
  click: MapClickEvent
  mousemove: MapMouseEvent
  moveend: void
  zoomend: void
}

export type MapEventHandler<K extends keyof MapEngineEvents> = (
  data: MapEngineEvents[K]
) => void

/* ---- Engine layer handle (structural) ---- */

export interface LayerHandleLike {
  remove(): void
  setLatLngs?(latlngs: LatLng[]): void
  setLatLng?(latlng: LatLng): void
  setVisible?(visible: boolean): void
}
