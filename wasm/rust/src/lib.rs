//! High-performance geospatial computations for Map Atlas.
//! Compiles to WebAssembly (WASM) for near-native in-browser execution.

use wasm_bindgen::prelude::*;

const EARTH_RADIUS_METERS: f64 = 6_371_000.0;

/// Calculate Great-Circle distance using Haversine formula in meters.
#[wasm_bindgen]
pub fn haversine_distance(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    let d_lat = (lat2 - lat1).to_radians();
    let d_lon = (lon2 - lon1).to_radians();

    let r_lat1 = lat1.to_radians();
    let r_lat2 = lat2.to_radians();

    let a = (d_lat / 2.0).sin().powi(2)
        + r_lat1.cos() * r_lat2.cos() * (d_lon / 2.0).sin().powi(2);
    let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());

    EARTH_RADIUS_METERS * c
}

/// Point-in-polygon ray-casting test.
/// Coordinates are passed as parallel slices of x (lng) and y (lat).
#[wasm_bindgen]
pub fn point_in_polygon(px: f64, py: f64, poly_x: &[f64], poly_y: &[f64]) -> bool {
    let n = poly_x.len();
    if n != poly_y.len() || n < 3 {
        return false;
    }

    let mut inside = false;
    let mut j = n - 1;

    for i in 0..n {
        let xi = poly_x[i];
        let yi = poly_y[i];
        let xj = poly_x[j];
        let yj = poly_y[j];

        let intersect = ((yi > py) != (yj > py))
            && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);

        if intersect {
            inside = !inside;
        }
        j = i;
    }

    inside
}

/// Spherical geodesic polygon area in square meters.
#[wasm_bindgen]
pub fn polygon_area(coords_flat: &[f64]) -> f64 {
    let num_pts = coords_flat.len() / 2;
    if num_pts < 3 {
        return 0.0;
    }

    let mut total_angle = 0.0;
    for i in 0..num_pts {
        let j = (i + 1) % num_pts;
        let lat1 = coords_flat[i * 2].to_radians();
        let lon1 = coords_flat[i * 2 + 1].to_radians();
        let lat2 = coords_flat[j * 2].to_radians();
        let lon2 = coords_flat[j * 2 + 1].to_radians();

        total_angle += (lon2 - lon1) * (2.0 + lat1.sin() + lat2.sin());
    }

    let area = (total_angle * EARTH_RADIUS_METERS * EARTH_RADIUS_METERS / 4.0).abs();
    area
}

/// Douglas-Peucker Polyline Simplification.
/// Input: flat array `[lat0, lng0, lat1, lng1, ...]`
/// Output: simplified flat array `[lat0, lng0, ...]`.
#[wasm_bindgen]
pub fn douglas_peucker(coords_flat: &[f64], tolerance_meters: f64) -> Vec<f64> {
    let num_pts = coords_flat.len() / 2;
    if num_pts <= 2 {
        return coords_flat.to_vec();
    }

    let mut keep = vec![false; num_pts];
    keep[0] = true;
    keep[num_pts - 1] = true;

    simplify_recursive(coords_flat, 0, num_pts - 1, tolerance_meters, &mut keep);

    let mut result = Vec::with_capacity(num_pts * 2);
    for i in 0..num_pts {
        if keep[i] {
            result.push(coords_flat[i * 2]);
            result.push(coords_flat[i * 2 + 1]);
        }
    }
    result
}

fn simplify_recursive(
    coords: &[f64],
    start: usize,
    end: usize,
    tolerance: f64,
    keep: &mut [bool],
) {
    if end <= start + 1 {
        return;
    }

    let mut max_dist = 0.0;
    let mut max_idx = start;

    let lat1 = coords[start * 2];
    let lon1 = coords[start * 2 + 1];
    let lat2 = coords[end * 2];
    let lon2 = coords[end * 2 + 1];

    for i in (start + 1)..end {
        let p_lat = coords[i * 2];
        let p_lon = coords[i * 2 + 1];
        let dist = perpendicular_distance(p_lat, p_lon, lat1, lon1, lat2, lon2);
        if dist > max_dist {
            max_dist = dist;
            max_idx = i;
        }
    }

    if max_dist > tolerance {
        keep[max_idx] = true;
        simplify_recursive(coords, start, max_idx, tolerance, keep);
        simplify_recursive(coords, max_idx, end, tolerance, keep);
    }
}

fn perpendicular_distance(
    p_lat: f64,
    p_lon: f64,
    lat1: f64,
    lon1: f64,
    lat2: f64,
    lon2: f64,
) -> f64 {
    let dist12 = haversine_distance(lat1, lon1, lat2, lon2);
    if dist12 < 1e-6 {
        return haversine_distance(p_lat, p_lon, lat1, lon1);
    }

    let dist1p = haversine_distance(lat1, lon1, p_lat, p_lon);
    let dist2p = haversine_distance(lat2, lon2, p_lat, p_lon);

    // Heron's formula for triangle height
    let s = (dist12 + dist1p + dist2p) / 2.0;
    let area_sq = s * (s - dist12) * (s - dist1p) * (s - dist2p);
    if area_sq <= 0.0 {
        0.0
    } else {
        (2.0 * area_sq.sqrt()) / dist12
    }
}
