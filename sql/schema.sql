-- Map Atlas PostGIS Spatial Database Schema
-- Provides high-performance spatial indexing, vector layers, and routing.

-- 1. Enable PostGIS & pgRouting extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgrouting;

-- 2. Places / POI Table
CREATE TABLE IF NOT EXISTS places (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) DEFAULT 'point',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    geom GEOMETRY(Point, 4326) NOT NULL
);

-- GiST Spatial Index for millisecond radius & bounding box queries
CREATE INDEX IF NOT EXISTS idx_places_geom ON places USING GIST (geom);

-- 3. Routes & Polylines Table
CREATE TABLE IF NOT EXISTS routes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    profile VARCHAR(32) DEFAULT 'driving', -- 'driving' | 'walking' | 'cycling'
    distance_meters DOUBLE PRECISION,
    duration_seconds DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    geom GEOMETRY(LineString, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_routes_geom ON routes USING GIST (geom);

-- 4. Drawn Polygons & Regions
CREATE TABLE IF NOT EXISTS polygons (
    id SERIAL PRIMARY KEY,
    label VARCHAR(255),
    fill_color VARCHAR(32) DEFAULT 'rgba(59,130,246,0.2)',
    stroke_color VARCHAR(32) DEFAULT '#2563eb',
    area_sq_meters DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    geom GEOMETRY(Polygon, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_polygons_geom ON polygons USING GIST (geom);

-- 5. Earthquakes Live Cache Table
CREATE TABLE IF NOT EXISTS earthquakes (
    event_id VARCHAR(64) PRIMARY KEY,
    place VARCHAR(255) NOT NULL,
    magnitude DOUBLE PRECISION NOT NULL,
    depth_km DOUBLE PRECISION NOT NULL,
    event_time TIMESTAMP WITH TIME ZONE NOT NULL,
    geom GEOMETRY(Point, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_earthquakes_geom ON earthquakes USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_earthquakes_mag ON earthquakes (magnitude);
