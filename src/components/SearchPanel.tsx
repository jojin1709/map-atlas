/* Search panel: geocoding with live autocomplete + nearby search. */

import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import * as api from '../services/api'
import { CONFIG } from '../config'
import { coordsDMS, toDecimal } from '../services/geo'
import { getEngine, openPopup } from '../services/mapRef'

export default function SearchPanel() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const inputRef = useRef<HTMLInputElement>(null)
  const searchResults = useAppStore(s => s.searchResults)
  const suggestions = useAppStore(s => s.searchSuggestions)
  const setSearchResults = useAppStore(s => s.setSearchResults)
  const setSearchSuggestions = useAppStore(s => s.setSearchSuggestions)

  // Live autocomplete with debounce
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (query.trim().length < 3) {
      setSearchSuggestions([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const items = await api.geocode(query.trim())
        setSearchSuggestions(items)
        setShowSuggestions(true)
      } catch {
        setSearchSuggestions([])
      }
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [query, setSearchSuggestions])

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!inputRef.current?.contains(e.target as Node)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const runSearch = async () => {
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setError('')
    setShowSuggestions(false)
    try {
      const items = await api.geocode(q)
      setSearchResults(items)
      if (!items.length) setError('No results found')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const pickSuggestion = (label: string, lat: number, lng: number) => {
    setQuery(label)
    setShowSuggestions(false)
    setSearchSuggestions([])
    flyTo(lat, lng, label)
  }

  const runNearby = async () => {
    const map = getEngine()
    if (!map) return
    const c = map.getCenter()
    const type = (document.getElementById('nearby-type') as HTMLSelectElement)?.value
    if (!type) return
    setNearbyLoading(true)
    setError('')
    try {
      const items = await api.nearby(c.lat, c.lng, type, CONFIG.nearbyRadiusMeters)
      setSearchResults(items.map(i => ({ label: i.label, lat: i.lat, lng: i.lng })))
      if (!items.length) setError('Nothing found nearby')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nearby search failed')
    } finally {
      setNearbyLoading(false)
    }
  }

  const flyTo = (lat: number, lng: number, label: string) => {
    const map = getEngine()
    map?.flyTo(lat, lng, Math.max(map.getZoom(), 15))
    openPopup({ lat, lng }, label)
  }

  return (
    <section>
      <h2>Search</h2>
      <div className="relative">
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') runSearch()
                if (e.key === 'Escape') setShowSuggestions(false)
              }}
              onFocus={() => suggestions.length && setShowSuggestions(true)}
              placeholder="Search a place or address"
              className="w-full"
            />
            {/* Autocomplete dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-b-lg shadow-lg max-h-48 overflow-y-auto">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0 truncate"
                    onClick={() => pickSuggestion(s.label, s.lat, s.lng)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={runSearch} disabled={loading}>
            {loading ? '…' : 'Go'}
          </button>
        </div>
      </div>
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}

      <div className="mt-2 flex gap-1.5">
        <select id="nearby-type" className="flex-1">
          {Object.entries(CONFIG.nearby).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
        <button onClick={runNearby} disabled={nearbyLoading} className="ghost">
          {nearbyLoading ? '…' : 'Nearby'}
        </button>
      </div>

      {searchResults.length > 0 && (
        <div className="list mt-2">
          {searchResults.map((r, i) => (
            <div
              key={i}
              className="item"
              onClick={() => flyTo(r.lat, r.lng, r.label)}
              title={`${toDecimal(r.lat, r.lng)}\n${coordsDMS(r.lat, r.lng)}`}
            >
              {r.label}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
