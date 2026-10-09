/* Public entry point — import from 'map-atlas' */

// Engine
export { MapEngine } from './engine/MapEngine'
export type { MapEngineOptions, PolylineStyle, CircleStyle, MarkerStyle, LayerHandle } from './engine/MapEngine'
export { project, unproject } from './engine/projection'
export { HeatmapOverlay } from './engine/heatmap'
export type { HeatPoint, HeatmapOptions } from './engine/heatmap'

// React component
export { MapAtlas } from './components/MapAtlas'
export type { MapAtlasProps, MapAtlasMarker, MapAtlasPolyline, MapAtlasPolygon } from './components/MapAtlas'

// Types
export type {
  LatLng,
  LatLngTuple,
  MapView,
  TileStyle,
  RoutingProfile,
  MapConfig,
  GeocodeResult,
  NearbyResult,
  WeatherResult,
  SavedPlace,
  DrawTool,
  DrawnShape,
  TrackPoint,
  ElevationProfilePoint,
  MapClickEvent,
  MapMouseEvent,
  MapEngineEvents,
  MapEventHandler,
  LayerHandleLike,
  OSRMRoute,
  OSRMLeg,
  OSRMStep,
  OSMRManeuver,
} from './types'

// Services — API
export { geocode, reverse, nearby, route, elevation, elevationBatch, weather, describeStep, weatherCodeToEmoji } from './services/api'

// Services — geo utilities
export {
  haversine,
  polygonArea,
  formatArea,
  formatDistance,
  formatDuration,
  toDecimal,
  toDMS,
  coordsDMS,
  parseLatLng,
  toGPX,
  parseGPX,
  toGeoJSON,
  parseGeoJSON,
  toKML,
  parseKML,
  download,
} from './services/geo'
export type { KMLImportResult } from './services/geo'

// Config & tile presets
export { CONFIG } from './config'
export { TILE_STYLES } from './tileStyles'
