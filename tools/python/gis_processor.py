#!/usr/bin/env python3
"""
Map Atlas GIS Data Processor (Python).
Utilities for GeoJSON optimization, GPX/KML conversion, and offline tile package preparation.
"""

import sys
import os
import json
import math
import xml.etree.ElementTree as ET
from typing import List, Dict, Tuple, Any

EARTH_RADIUS_KM = 6371.0

def haversine(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    """Calculate distance in km between two (lat, lng) tuples."""
    lat1, lon1 = math.radians(coord1[0]), math.radians(coord1[1])
    lat2, lon2 = math.radians(coord2[0]), math.radians(coord2[1])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_KM * c

def latlng_to_tile(lat: float, lng: float, zoom: int) -> Tuple[int, int]:
    """Convert WGS84 lat/lng to Web Mercator slippy tile coordinates."""
    lat_rad = math.radians(lat)
    n = 2.0 ** zoom
    x = int((lng + 180.0) / 360.0 * n)
    y = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return (x, y)

def optimize_geojson(input_path: str, output_path: str, precision: int = 5) -> Dict[str, Any]:
    """
    Rounds GeoJSON coordinates to reduce file size while maintaining centimeter accuracy.
    """
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    def round_coords(obj):
        if isinstance(obj, (int, float)):
            return round(obj, precision)
        elif isinstance(obj, list):
            return [round_coords(item) for item in obj]
        elif isinstance(obj, dict):
            return {k: round_coords(v) for k, v in obj.items()}
        return obj

    optimized = round_coords(data)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(optimized, f, separators=(',', ':'))

    orig_size = os.path.getsize(input_path)
    new_size = os.path.getsize(output_path)
    savings = (1 - (new_size / orig_size)) * 100 if orig_size else 0

    return {
        "original_bytes": orig_size,
        "optimized_bytes": new_size,
        "saved_percent": round(savings, 2)
    }

def gpx_to_geojson(gpx_path: str, output_path: str) -> Dict[str, Any]:
    """
    Convert GPX track points to GeoJSON FeatureCollection.
    """
    tree = ET.parse(gpx_path)
    root = tree.getroot()

    # Handle GPX namespaces
    ns = {'gpx': root.tag.split('}')[0].strip('{')} if '}' in root.tag else {}
    find_tag = lambda el, tag: el.findall(f"gpx:{tag}", ns) if ns else el.findall(tag)

    coordinates = []
    total_dist = 0.0
    prev_pt = None

    for trk in find_tag(root, 'trk'):
        for seg in find_tag(trk, 'trkseg'):
            for pt in find_tag(seg, 'trkpt'):
                lat = float(pt.attrib['lat'])
                lon = float(pt.attrib['lon'])
                curr_pt = (lat, lon)
                if prev_pt:
                    total_dist += haversine(prev_pt, curr_pt)
                prev_pt = curr_pt

                ele = pt.find('gpx:ele', ns) if ns else pt.find('ele')
                z = float(ele.text) if ele is not None and ele.text else 0.0
                coordinates.append([round(lon, 6), round(lat, 6), round(z, 1)])

    geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "source": os.path.basename(gpx_path),
                    "total_distance_km": round(total_dist, 2),
                    "points_count": len(coordinates)
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": coordinates
                }
            }
        ]
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, indent=2)

    return {"points": len(coordinates), "distance_km": round(total_dist, 2)}

def generate_offline_tile_manifest(bbox: Tuple[float, float, float, float], min_zoom: int, max_zoom: int) -> List[str]:
    """
    Generates tile download URLs for an offline region.
    Bbox format: (min_lat, min_lng, max_lat, max_lng)
    """
    min_lat, min_lng, max_lat, max_lng = bbox
    tiles = []

    for z in range(min_zoom, max_zoom + 1):
        x_min, y_max = latlng_to_tile(min_lat, min_lng, z)
        x_max, y_min = latlng_to_tile(max_lat, max_lng, z)

        x_start, x_end = min(x_min, x_max), max(x_min, x_max)
        y_start, y_end = min(y_min, y_max), max(y_min, y_max)

        for x in range(x_start, x_end + 1):
            for y in range(y_start, y_end + 1):
                tiles.append(f"https://tile.openstreetmap.org/{z}/{x}/{y}.png")

    return tiles

if __name__ == "__main__":
    print("🗺 Map Atlas Python GIS Processor")
    # Quick test of tile manifest generation for a city (e.g. London area)
    sample_bbox = (51.48, -0.15, 51.52, -0.08)
    urls = generate_offline_tile_manifest(sample_bbox, 12, 14)
    print(f"Generated {len(urls)} offline tile download URLs for bounding box: {sample_bbox}")
