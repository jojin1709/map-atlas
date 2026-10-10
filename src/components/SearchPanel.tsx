/* Search panel: geocoding with live autocomplete, quick category chips, and actionable cards. */

import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import * as api from '../services/api'
import { CONFIG } from '../config'
import { getEngine, openPopup } from '../services/mapRef'
import {
  Coffee,
  Utensils,
  Fuel,
  Hotel,
  Landmark,
  MapPin,
  Navigation,
  X,
  Loader2,
  Bookmark,
  Sparkles,
} from 'lucide-react'

const QUICK_CATEGORIES = [
  { id: 'cafe', label: 'Cafés', icon: Coffee, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60' },
  { id: 'restaurant', label: 'Food', icon: Utensils, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60' },
  { id: 'fuel', label: 'Fuel', icon: Fuel, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60' },
  { id: 'hotel', label: 'Hotels', icon: Hotel, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60' },
  { id: 'atm', label: 'ATMs', icon: Landmark, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60' },
]

export default function SearchPanel() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
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
    setActiveCategory(null)
    setShowSuggestions(false)
    try {
      const items = await api.geocode(q)
      setSearchResults(items)
      if (!items.length) setError('No results found for this search')
      else if (items[0]) {
        flyTo(items[0].lat, items[0].lng, items[0].label)
      }
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

  const runCategorySearch = async (type: string) => {
    const map = getEngine()
    if (!map) return
    const c = map.getCenter()
    setNearbyLoading(true)
    setActiveCategory(type)
    setError('')
    try {
      const items = await api.nearby(c.lat, c.lng, type, CONFIG.nearbyRadiusMeters)
      setSearchResults(items.map(i => ({ label: i.label, lat: i.lat, lng: i.lng })))
      if (!items.length) setError(`No ${type} found in this area. Try zooming out.`)
      else if (items[0]) {
        flyTo(items[0].lat, items[0].lng, items[0].label)
      }
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
      <div className="flex items-center justify-between mb-2">
        <h2 className="mb-0">Search & Explore</h2>
        {searchResults.length > 0 && (
          <button
            onClick={() => {
              setSearchResults([])
              setQuery('')
              setActiveCategory(null)
            }}
            className="text-[11px] text-gray-500 hover:text-red-500 font-semibold"
          >
            Clear results
          </button>
        )}
      </div>

      {/* Main Search Input */}
      <div className="relative">
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') runSearch()
              if (e.key === 'Escape') setShowSuggestions(false)
            }}
            onFocus={() => suggestions.length && setShowSuggestions(true)}
            placeholder="Search city, address, or landmark"
            className="w-full pr-18 text-xs sm:text-sm py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-500"
          />
          <div className="absolute right-1.5 flex items-center gap-1">
            {query && (
              <button
                onClick={() => { setQuery(''); setSearchSuggestions([]) }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={runSearch}
              disabled={loading}
              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Go'}
            </button>
          </div>
        </div>

        {/* Autocomplete dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-2xl shadow-2xl max-h-56 overflow-y-auto mt-1 divide-y divide-gray-100 dark:divide-zinc-700/60">
            {suggestions.map((s, i) => (
              <button
                key={i}
                className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-blue-50/60 dark:hover:bg-zinc-700/70 transition flex items-center gap-2"
                onClick={() => pickSuggestion(s.label, s.lat, s.lng)}
              >
                <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="truncate text-gray-800 dark:text-gray-200">{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs mt-2">
          {error}
        </div>
      )}

      {/* Quick Category Discovery Chips */}
      <div className="mt-3">
        <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Quick Nearby Explore</span>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {QUICK_CATEGORIES.map(cat => {
            const Icon = cat.icon
            const isCurrent = activeCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => runCategorySearch(cat.id)}
                disabled={nearbyLoading}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-[11px] font-semibold transition active:scale-95 ${
                  isCurrent
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-102'
                    : `${cat.color} hover:brightness-95`
                }`}
                title={`Find nearby ${cat.label}`}
              >
                <Icon className={`w-4 h-4 mb-1 ${isCurrent ? 'text-white' : ''}`} />
                <span className="truncate text-[10px]">{cat.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Search Results List */}
      {searchResults.length > 0 && (
        <div className="mt-3.5 space-y-2">
          <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {searchResults.length} {searchResults.length === 1 ? 'Result' : 'Results'} Found
          </div>
          <div className="space-y-1.5 max-h-[46vh] overflow-y-auto pr-1">
            {searchResults.map((r, i) => (
              <div
                key={i}
                className="p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/70 border border-gray-100 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-700 transition flex items-center justify-between gap-2 shadow-xs group"
              >
                <div
                  className="min-w-0 flex-1 cursor-pointer"
                  onClick={() => flyTo(r.lat, r.lng, r.label)}
                >
                  <div className="font-semibold text-xs text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {r.label}
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                    {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      useAppStore.getState().setTo({ lat: r.lat, lng: r.lng })
                      useAppStore.getState().setActiveTab('directions')
                    }}
                    className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition"
                    title="Directions to this place"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      useAppStore.getState().addPlace({
                        id: Date.now(),
                        name: r.label,
                        lat: r.lat,
                        lng: r.lng,
                      })
                      useAppStore.getState().showToast('Saved to Bookmarks')
                    }}
                    className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-700/60 text-gray-500 dark:text-zinc-300 hover:text-amber-500 transition"
                    title="Bookmark this place"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

