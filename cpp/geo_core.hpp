#ifndef MAP_ATLAS_GEO_CORE_HPP
#define MAP_ATLAS_GEO_CORE_HPP

#include <vector>
#include <string>
#include <cmath>
#include <cstdint>

namespace MapAtlas {

struct LatLng {
    double lat;
    double lng;
};

struct Point2D {
    double x;
    double y;
};

struct TileCoord {
    int32_t z;
    int32_t x;
    int32_t y;
};

struct BoundingBox {
    double min_lat;
    double min_lng;
    double max_lat;
    double max_lng;
};

class GeoCore {
public:
    static constexpr double EARTH_RADIUS_METERS = 6371000.0;
    static constexpr double PI = 3.14159265358979323846;

    // Great circle distance using Haversine formula
    static double haversineDistance(const LatLng& a, const LatLng& b);

    // High-precision geodesic distance using Vincenty's inverse formula
    static double vincentyDistance(const LatLng& a, const LatLng& b);

    // Convert WGS84 (lat/lng) to Web Mercator pixel coordinates at zoom level
    static Point2D projectToMercator(const LatLng& coord, int zoom, int tileSize = 256);

    // Convert Web Mercator pixel back to WGS84
    static LatLng unprojectFromMercator(const Point2D& pixel, int zoom, int tileSize = 256);

    // Convert lat/lng to slippy tile numbers (x, y, z)
    static TileCoord latLngToTile(const LatLng& coord, int zoom);

    // Douglas-Peucker polyline simplification
    static std::vector<LatLng> simplifyPolyline(const std::vector<LatLng>& points, double toleranceMeters);

    // Spherical polygon area (m^2)
    static double calculatePolygonArea(const std::vector<LatLng>& ring);

    // Point-in-polygon ray-casting test
    static bool pointInPolygon(const LatLng& pt, const std::vector<LatLng>& polygon);

    // Calculate bounding box for a collection of points
    static BoundingBox computeBoundingBox(const std::vector<LatLng>& points);
};

} // namespace MapAtlas

#endif // MAP_ATLAS_GEO_CORE_HPP
