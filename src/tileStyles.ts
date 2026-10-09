/* Reusable tile style presets — importable without the full app config. */

import type { TileStyle } from './types'

export const TILE_STYLES: Record<string, TileStyle> = {
  osm: {
    label: 'Street',
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    label: 'Satellite',
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    attribution: 'Imagery &copy; <a href="https://www.esri.com">Esri</a>',
  },
  dark: {
    label: 'Dark',
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    cssFilter: 'invert(88%) hue-rotate(180deg) brightness(0.92) contrast(1.08) saturate(0.4)',
  },
  topo: {
    label: 'Topo',
    tiles: ['https://tile.opentopomap.org/{z}/{x}/{y}.png'],
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
  },
  humanitarian: {
    label: 'Humanitarian',
    tiles: ['https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'],
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> Tiles style by <a href="https://www.hotosm.org/">HOT</a>',
  },
  cyclosm: {
    label: 'Cycling',
    tiles: ['https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png'],
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> <a href="https://cyclosm.org/">CyclOSM</a>',
  },
}
