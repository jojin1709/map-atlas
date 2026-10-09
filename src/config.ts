/* Configuration for MapApp. Edit to change styles, services or defaults. */

import type { MapConfig } from './types'

export const CONFIG: MapConfig = {
  center: [20, 0],
  zoom: 2,
  defaultStyle: 'osm',
  minZoom: 1,
  maxZoom: 19,

  styles: {
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
      tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com">CARTO</a>',
    },
    topo: {
      label: 'Topo',
      tiles: ['https://tile.opentopomap.org/{z}/{x}/{y}.png'],
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    },
  },

  nominatimUrl: 'https://nominatim.openstreetmap.org',
  overpassUrl: 'https://overpass-api.de/api/interpreter',
  nearbyRadiusMeters: 2000,
  nearby: {
    cafe: 'Cafés',
    restaurant: 'Restaurants',
    fuel: 'Fuel stations',
    pharmacy: 'Pharmacies',
    hospital: 'Hospitals',
    atm: 'ATMs',
    school: 'Schools',
    bank: 'Banks',
    bar: 'Bars',
    hotel: 'Hotels',
    supermarket: 'Supermarkets',
  },

  routingBaseUrl: 'https://router.project-osrm.org',
  valhallaUrl: 'https://valhalla1.openstreetmap.de/route',
  profiles: {
    driving: { label: 'Driving', osrm: 'driving', valhalla: 'auto' },
    walking: { label: 'Walking', osrm: 'driving', valhalla: 'pedestrian' },
    cycling: { label: 'Cycling', osrm: 'driving', valhalla: 'bicycle' },
  },

  elevationUrl: 'https://api.opentopodata.org/v1/srtm90m',
  weatherUrl: 'https://api.open-meteo.com/v1/forecast',
}
