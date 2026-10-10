-- Map Atlas High-Performance PostGIS Spatial Queries
-- Used for spatial indexing, viewport filtering, and nearest-neighbor calculations.

-- 1. Query all Places inside current Map Viewport Bounding Box
-- Parameters: :min_lng, :min_lat, :max_lng, :max_lat
SELECT 
    id,
    name,
    category,
    ST_Y(geom) AS lat,
    ST_X(geom) AS lng,
    ST_AsGeoJSON(geom)::json AS geojson
FROM places
WHERE geom && ST_MakeEnvelope(:min_lng, :min_lat, :max_lng, :max_lat, 4326);

-- 2. K-Nearest Neighbor (k-NN) Search: Find 10 closest places to user GPS coordinate
-- Uses the '<->' operator for index-accelerated nearest-neighbor searches
SELECT 
    id,
    name,
    category,
    ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(:user_lng, :user_lat), 4326)::geography) AS distance_meters
FROM places
ORDER BY geom <-> ST_SetSRID(ST_MakePoint(:user_lng, :user_lat), 4326)
LIMIT 10;

-- 3. Radius Search: Find all amenities within 2000 meters of a coordinate
SELECT 
    id,
    name,
    category,
    ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(:center_lng, :center_lat), 4326)::geography) AS distance_meters
FROM places
WHERE ST_DWithin(
    geom::geography,
    ST_SetSRID(ST_MakePoint(:center_lng, :center_lat), 4326)::geography,
    2000.0 -- 2 km radius
)
ORDER BY distance_meters ASC;

-- 4. Calculate Geodesic Area of Drawn Polygons in Square Meters
SELECT 
    id,
    label,
    ST_Area(geom::geography) AS area_sq_meters,
    (ST_Area(geom::geography) / 1000000.0) AS area_sq_km
FROM polygons;

-- 5. Export entire saved layer as standard GeoJSON FeatureCollection
SELECT json_build_object(
    'type', 'FeatureCollection',
    'features', json_agg(
        json_build_object(
            'type', 'Feature',
            'id', id,
            'geometry', ST_AsGeoJSON(geom)::json,
            'properties', json_build_object(
                'name', name,
                'category', category,
                'created_at', created_at
            )
        )
    )
) AS geojson_collection
FROM places;
