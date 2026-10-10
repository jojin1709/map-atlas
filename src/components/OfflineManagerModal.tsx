/* Visual Offline Area Manager Modal: Allows selecting radius, estimating MBs, and batch downloading tiles. */

import { useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { getEngine } from '../services/mapRef'
import { downloadAreaOffline, getOfflineStorageUsage, clearOfflineTiles } from '../services/offline'
import {
  DownloadCloud,
  HardDrive,
  Trash2,
  X,
  CheckCircle2,
  Loader2,
  Layers,
  MapPin,
} from 'lucide-react'

export default function OfflineManagerModal() {
  const isOpen = useAppStore(s => s.offlineManagerOpen)
  const setOpen = useAppStore(s => s.setOfflineManagerOpen)
  const showToast = useAppStore(s => s.showToast)
  const userLocation = useAppStore(s => s.userLocation)

  const [radiusKm, setRadiusKm] = useState(10)
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTile, setCurrentTile] = useState(0)
  const [totalTiles, setTotalTiles] = useState(0)
  const [cacheStats, setCacheStats] = useState({ count: 0, approxMB: 0 })
  const [downloadSuccess, setDownloadSuccess] = useState(false)

  const refreshStats = async () => {
    const stats = await getOfflineStorageUsage()
    setCacheStats(stats)
  }

  useEffect(() => {
    if (isOpen) {
      refreshStats()
      setDownloadSuccess(false)
      setProgress(0)
    }
  }, [isOpen])

  if (!isOpen) return null

  const engine = getEngine()
  const center = engine ? engine.getCenter() : (userLocation || { lat: 40.7128, lng: -74.006 })

  // Estimate tile count based on radius:
  const estTiles = Math.min(180, Math.max(30, Math.round(radiusKm * 8.5)))
  const estMB = ((estTiles * 22) / 1024).toFixed(1)

  const handleDownload = async () => {
    setDownloading(true)
    setProgress(0)
    setDownloadSuccess(false)

    try {
      const savedCount = await downloadAreaOffline(center, (pct, cur, tot) => {
        setProgress(pct)
        setCurrentTile(cur)
        setTotalTiles(tot)
      })

      setDownloading(false)
      setDownloadSuccess(true)
      await refreshStats()
      showToast(`Successfully cached ${savedCount} offline tiles!`)
    } catch {
      setDownloading(false)
      showToast('Offline download interrupted')
    }
  }

  const handleClear = async () => {
    if (confirm('Clear all downloaded offline tiles?')) {
      await clearOfflineTiles()
      await refreshStats()
      showToast('Offline tile cache cleared')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-zinc-800 p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <DownloadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Offline Maps Manager</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Navigate even with no cellular signal</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            disabled={downloading}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Area Details */}
        <div className="my-5 space-y-4">
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                Current Center
              </span>
              <span className="font-mono text-[11px] text-gray-700 dark:text-gray-300">
                {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                Included Zoom Levels
              </span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">Zoom 13 — 15</span>
            </div>
          </div>

          {/* Area Radius Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Download Radius</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{radiusKm} km</span>
            </div>
            <input
              type="range"
              min={3}
              max={25}
              value={radiusKm}
              disabled={downloading}
              onChange={e => setRadiusKm(Number(e.target.value))}
              className="w-full accent-blue-600 h-2 bg-gray-200 dark:bg-zinc-700 rounded-lg cursor-pointer disabled:opacity-50"
            />
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>3 km (Neighborhood)</span>
              <span>10 km (City)</span>
              <span>25 km (Metro)</span>
            </div>
          </div>

          {/* Estimate Card */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
              <div className="text-[11px] font-medium text-blue-600 dark:text-blue-400">Estimated Tiles</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">{estTiles} tiles</div>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
              <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Estimated Size</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">~{estMB} MB</div>
            </div>
          </div>

          {/* Progress / Status */}
          {downloading && (
            <div className="space-y-2 p-3 rounded-2xl bg-gray-50 dark:bg-zinc-800/80 border border-gray-100 dark:border-zinc-700 animate-in fade-in">
              <div className="flex justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Downloading tiles...
                </span>
                <span className="font-bold text-gray-800 dark:text-gray-200">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-[11px] text-gray-400 text-right">
                {currentTile} of {totalTiles} tiles saved
              </div>
            </div>
          )}

          {downloadSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Offline area ready! You can now browse this zone with zero internet.</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="space-y-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Downloading Area ({progress}%)...</span>
              </>
            ) : (
              <>
                <DownloadCloud className="w-4 h-4" />
                <span>Download This Area (~{estMB} MB)</span>
              </>
            )}
          </button>

          {/* Storage Management */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-zinc-800 text-xs">
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <HardDrive className="w-3.5 h-3.5" />
              <span>
                Cached Storage: <strong className="text-gray-800 dark:text-gray-200">{cacheStats.approxMB} MB</strong> ({cacheStats.count} tiles)
              </span>
            </div>
            {cacheStats.count > 0 && (
              <button
                onClick={handleClear}
                disabled={downloading}
                className="text-red-500 hover:text-red-600 font-semibold flex items-center gap-1 transition"
                title="Clear cached tiles"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
