// Map Atlas Go Backend — High-performance Tile Proxy & Offline Cache Server.
// Serves PWA static assets and provides an in-memory caching tile proxy.

package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type TileCache struct {
	sync.RWMutex
	items map[string][]byte
}

var cache = &TileCache{
	items: make(map[string][]byte),
}

func (c *TileCache) Get(key string) ([]byte, bool) {
	c.RLock()
	defer c.RUnlock()
	val, ok := c.items[key]
	return val, ok
}

func (c *TileCache) Set(key string, data []byte) {
	c.Lock()
	defer c.Unlock()
	// Limit in-memory cache to 10,000 tiles
	if len(c.items) > 10000 {
		for k := range c.items {
			delete(c.items, k)
			break
		}
	}
	c.items[key] = data
}

func tileProxyHandler(w http.ResponseWriter, r *http.Request) {
	// Path format: /api/tiles/{style}/{z}/{x}/{y}
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 6 {
		http.Error(w, "Invalid tile path format. Use: /api/tiles/{style}/{z}/{x}/{y}.png", http.StatusBadRequest)
		return
	}

	style := parts[2]
	z := parts[3]
	x := parts[4]
	y := strings.TrimSuffix(parts[5], ".png")

	cacheKey := fmt.Sprintf("%s/%s/%s/%s", style, z, x, y)

	// Check cache
	if data, found := cache.Get(cacheKey); found {
		w.Header().Set("Content-Type", "image/png")
		w.Header().Set("X-Cache", "HIT")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Write(data)
		return
	}

	// Resolve upstream tile template
	var upstreamURL string
	switch style {
	case "satellite":
		upstreamURL = fmt.Sprintf("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/%s/%s/%s", z, y, x)
	case "topo":
		upstreamURL = fmt.Sprintf("https://tile.opentopomap.org/%s/%s/%s.png", z, x, y)
	default:
		upstreamURL = fmt.Sprintf("https://tile.openstreetmap.org/%s/%s/%s.png", z, x, y)
	}

	req, err := http.NewRequest("GET", upstreamURL, nil)
	if err != nil {
		http.Error(w, "Failed to create upstream request", http.StatusInternalServerError)
		return
	}
	req.Header.Set("User-Agent", "MapAtlas-Go-TileServer/1.0 (https://mapapp-lovat.vercel.app)")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		http.Error(w, "Tile upstream unavailable", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	tileData, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Error reading tile data", http.StatusInternalServerError)
		return
	}

	// Cache and respond
	cache.Set(cacheKey, tileData)

	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("X-Cache", "MISS")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Cache-Control", "public, max-age=604800") // 7 days
	w.Write(tileData)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	cache.RLock()
	cachedCount := len(cache.items)
	cache.RUnlock()

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":       "ok",
		"service":      "Map Atlas Go Tile Cache Server",
		"cached_tiles": cachedCount,
		"timestamp":    time.Now().UTC().Format(time.RFC3339),
	})
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/api/tiles/", tileProxyHandler)

	// Serve built PWA from dist/ directory if present
	distDir := filepath.Join("..", "dist")
	if _, err := os.Stat("dist"); err == nil {
		distDir = "dist"
	}

	fs := http.FileServer(http.Dir(distDir))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		path := filepath.Join(distDir, filepath.Clean(r.URL.Path))
		if _, err := os.Stat(path); os.IsNotExist(err) {
			// SPA fallback
			http.ServeFile(w, r, filepath.Join(distDir, "index.html"))
			return
		}
		fs.ServeHTTP(w, r)
	})

	fmt.Printf("🚀 Map Atlas Go Server running on port %s (http://localhost:%s)\n", port, port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}
