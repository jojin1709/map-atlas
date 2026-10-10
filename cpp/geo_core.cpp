#include "geo_core.hpp"
#include <algorithm>
#include <iostream>

namespace MapAtlas {

static inline double toRadians(double deg) {
    return deg * (GeoCore::PI / 180.0);
}

static inline double toDegrees(double rad) {
    return rad * (180.0 / GeoCore::PI);
}

double GeoCore::haversineDistance(const LatLng& a, const LatLng& b) {
    double dLat = toRadians(b.lat - a.lat);
    double dLon = toRadians(b.lng - a.lng);
    double lat1 = toRadians(a.lat);
    double lat2 = toRadians(b.lat);

    double sinDlat = std::sin(dLat / 2.0);
    double sinDlon = std::sin(dLon / 2.0);

    double val = sinDlat * sinDlat + std::cos(lat1) * std::cos(lat2) * sinDlon * sinDlon;
    double c = 2.0 * std::atan2(std::sqrt(val), std::sqrt(1.0 - val));
    return EARTH_RADIUS_METERS * c;
}

double GeoCore::vincentyDistance(const LatLng& a, const LatLng& b) {
    // WGS-84 ellipsoid parameters
    constexpr double a_axis = 6378137.0;
    constexpr double b_axis = 6356752.314245;
    constexpr double f = 1.0 / 298.257223563;

    double L = toRadians(b.lng - a.lng);
    double U1 = std::atan((1.0 - f) * std::tan(toRadians(a.lat)));
    double U2 = std::atan((1.0 - f) * std::tan(toRadians(b.lat)));
    double sinU1 = std::sin(U1), cosU1 = std::cos(U1);
    double sinU2 = std::sin(U2), cosU2 = std::cos(U2);

    double lambda = L;
    double lambdaP = 2.0 * PI;
    int iterLimit = 100;
    double cosSqAlpha = 0.0, sinSigma = 0.0, cos2SigmaM = 0.0, cosSigma = 0.0, sigma = 0.0;

    while (std::abs(lambda - lambdaP) > 1e-12 && --iterLimit > 0) {
        double sinLambda = std::sin(lambda), cosLambda = std::cos(lambda);
        sinSigma = std::sqrt((cosU2 * sinLambda) * (cosU2 * sinLambda) +
            (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) * (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda));
        if (sinSigma == 0.0) return 0.0; // coincident points

        cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
        sigma = std::atan2(sinSigma, cosSigma);
        double sinAlpha = cosU1 * cosU2 * sinLambda / sinSigma;
        cosSqAlpha = 1.0 - sinAlpha * sinAlpha;
        cos2SigmaM = (cosSqAlpha != 0.0) ? (cosSigma - 2.0 * sinU1 * sinU2 / cosSqAlpha) : 0.0;

        double C = f / 16.0 * cosSqAlpha * (4.0 + f * (4.0 - 3.0 * cosSqAlpha));
        lambdaP = lambda;
        lambda = L + (1.0 - C) * f * sinAlpha *
            (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1.0 + 2.0 * cos2SigmaM * cos2SigmaM)));
    }

    if (iterLimit == 0) return haversineDistance(a, b); // fallback if formula failed to converge

    double uSq = cosSqAlpha * (a_axis * a_axis - b_axis * b_axis) / (b_axis * b_axis);
    double A = 1.0 + uSq / 16384.0 * (4096.0 + uSq * (-768.0 + uSq * (320.0 - 175.0 * uSq)));
    double B = uSq / 1024.0 * (256.0 + uSq * (-128.0 + uSq * (74.0 - 47.0 * uSq)));
    double deltaSigma = B * sinSigma * (cos2SigmaM + B / 4.0 * (cosSigma * (-1.0 + 2.0 * cos2SigmaM * cos2SigmaM) -
        B / 6.0 * cos2SigmaM * (-3.0 + 4.0 * sinSigma * sinSigma) * (-3.0 + 4.0 * cos2SigmaM * cos2SigmaM)));

    return b_axis * A * (sigma - deltaSigma);
}

Point2D GeoCore::projectToMercator(const LatLng& coord, int zoom, int tileSize) {
    double scale = static_cast<double>(tileSize) * std::pow(2.0, zoom);
    double x = (coord.lng + 180.0) / 360.0 * scale;

    double sinLat = std::sin(toRadians(coord.lat));
    sinLat = std::clamp(sinLat, -0.9999, 0.9999);
    double y = (0.5 - std::log((1.0 + sinLat) / (1.0 - sinLat)) / (4.0 * PI)) * scale;

    return { x, y };
}

LatLng GeoCore::unprojectFromMercator(const Point2D& pixel, int zoom, int tileSize) {
    double scale = static_cast<double>(tileSize) * std::pow(2.0, zoom);
    double lng = (pixel.x / scale) * 360.0 - 180.0;

    double yNorm = 0.5 - (pixel.y / scale);
    double lat = toDegrees(2.0 * std::atan(std::exp(yNorm * 2.0 * PI)) - PI / 2.0);

    return { lat, lng };
}

TileCoord GeoCore::latLngToTile(const LatLng& coord, int zoom) {
    int n = 1 << zoom;
    int x = static_cast<int>((coord.lng + 180.0) / 360.0 * n);
    double latRad = toRadians(coord.lat);
    int y = static_cast<int>((1.0 - std::asinh(std::tan(latRad)) / PI) / 2.0 * n);
    return { zoom, std::clamp(x, 0, n - 1), std::clamp(y, 0, n - 1) };
}

static void ramerDouglasPeucker(const std::vector<LatLng>& points, size_t first, size_t last, double epsilon, std::vector<bool>& keep) {
    if (last <= first + 1) return;

    double maxDist = 0.0;
    size_t index = first;
    const LatLng& p1 = points[first];
    const LatLng& p2 = points[last];
    double lineLen = GeoCore::haversineDistance(p1, p2);

    for (size_t i = first + 1; i < last; ++i) {
        double dist = 0.0;
        if (lineLen < 1e-5) {
            dist = GeoCore::haversineDistance(points[i], p1);
        } else {
            double d1 = GeoCore::haversineDistance(p1, points[i]);
            double d2 = GeoCore::haversineDistance(p2, points[i]);
            double s = (lineLen + d1 + d2) / 2.0;
            double area = s * (s - lineLen) * (s - d1) * (s - d2);
            dist = area <= 0.0 ? 0.0 : (2.0 * std::sqrt(area)) / lineLen;
        }

        if (dist > maxDist) {
            maxDist = dist;
            index = i;
        }
    }

    if (maxDist > epsilon) {
        keep[index] = true;
        ramerDouglasPeucker(points, first, index, epsilon, keep);
        ramerDouglasPeucker(points, index, last, epsilon, keep);
    }
}

std::vector<LatLng> GeoCore::simplifyPolyline(const std::vector<LatLng>& points, double toleranceMeters) {
    if (points.size() <= 2) return points;

    std::vector<bool> keep(points.size(), false);
    keep[0] = true;
    keep[points.size() - 1] = true;

    ramerDouglasPeucker(points, 0, points.size() - 1, toleranceMeters, keep);

    std::vector<LatLng> result;
    result.reserve(points.size());
    for (size_t i = 0; i < points.size(); ++i) {
        if (keep[i]) result.push_back(points[i]);
    }
    return result;
}

double GeoCore::calculatePolygonArea(const std::vector<LatLng>& ring) {
    size_t n = ring.size();
    if (n < 3) return 0.0;

    double total = 0.0;
    for (size_t i = 0; i < n; ++i) {
        size_t j = (i + 1) % n;
        double lat1 = toRadians(ring[i].lat);
        double lon1 = toRadians(ring[i].lng);
        double lat2 = toRadians(ring[j].lat);
        double lon2 = toRadians(ring[j].lng);

        total += (lon2 - lon1) * (2.0 + std::sin(lat1) + std::sin(lat2));
    }
    return std::abs(total * EARTH_RADIUS_METERS * EARTH_RADIUS_METERS / 4.0);
}

bool GeoCore::pointInPolygon(const LatLng& pt, const std::vector<LatLng>& polygon) {
    size_t n = polygon.size();
    if (n < 3) return false;

    bool inside = false;
    for (size_t i = 0, j = n - 1; i < n; j = i++) {
        double xi = polygon[i].lng, yi = polygon[i].lat;
        double xj = polygon[j].lng, yj = polygon[j].lat;

        bool intersect = ((yi > pt.lat) != (yj > pt.lat)) &&
            (pt.lng < (xj - xi) * (pt.lat - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

BoundingBox GeoCore::computeBoundingBox(const std::vector<LatLng>& points) {
    if (points.empty()) return { 0.0, 0.0, 0.0, 0.0 };

    double minLat = points[0].lat, maxLat = points[0].lat;
    double minLng = points[0].lng, maxLng = points[0].lng;

    for (const auto& p : points) {
        minLat = std::min(minLat, p.lat);
        maxLat = std::max(maxLat, p.lat);
        minLng = std::min(minLng, p.lng);
        maxLng = std::max(maxLng, p.lng);
    }
    return { minLat, minLng, maxLat, maxLng };
}

} // namespace MapAtlas

int main() {
    using namespace MapAtlas;
    LatLng ny { 40.7128, -74.0060 };
    LatLng london { 51.5074, -0.1278 };

    double dist = GeoCore::haversineDistance(ny, london);
    std::cout << "[MapAtlas C++ GeoCore] Distance NY to London: " << dist / 1000.0 << " km\n";
    return 0;
}
