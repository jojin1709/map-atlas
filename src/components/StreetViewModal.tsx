/* Street View Modal: interactive 360° street-level panorama viewer. */

import { useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import * as api from '../services/api'
import { toDecimal } from '../services/geo'
import { Camera, X, ExternalLink, Copy, Check, Compass, Layers } from 'lucide-react'

export default function StreetViewModal() {
  const coord = useAppStore(s => s.streetViewCoord)
  const setCoord = useAppStore(s => s.setStreetViewCoord)
  const [address, setAddress] = useState<string>('')
  const [copied, setCopied] = useState<boolean>(false)

  useEffect(() => {
    if (!coord) {
      setAddress('')
      return
    }
    api.reverse(coord.lat, coord.lng)
      .then(a => setAddress(a))
      .catch(() => setAddress(`${toDecimal(coord.lat, coord.lng)}`))
  }, [coord])

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && coord) {
        setCoord(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [coord, setCoord])

  if (!coord) return null

  const googleMapsUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${coord.lat},${coord.lng}`
  const mapillaryUrl = `https://www.mapillary.com/app/?lat=${coord.lat}&lng=${coord.lng}&z=17`
  const embedUrl = `https://maps.google.com/maps?q=&layer=c&cbll=${coord.lat},${coord.lng}&output=svembed`

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(googleMapsUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={() => setCoord(null)}
    >
      <div
        className="relative w-full max-w-4xl h-[85vh] max-h-[750px] bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-zinc-800 bg-gray-50/80 dark:bg-zinc-850/80 backdrop-blur-sm">
          <div className="flex items-center gap-2.5 min-w-0 pr-3">
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/60 flex items-center justify-center shrink-0">
              <Camera className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5 truncate">
                <span>Street View Panorama</span>
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-gray-200/70 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 font-normal">
                  {toDecimal(coord.lat, coord.lng)}
                </span>
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {address || 'Fetching address…'}
              </p>
            </div>
          </div>

          {/* Action Links & Close */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={copyUrl}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200 flex items-center gap-1 transition"
              title="Copy Street View URL"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
            </button>
            <a
              href={mapillaryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200 flex items-center gap-1 transition"
              title="Open open-source street imagery on Mapillary"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Mapillary</span>
            </a>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200 flex items-center gap-1 transition"
              title="Open full interactive Street View in Google Maps"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">Google View</span>
            </a>
            <button
              onClick={() => setCoord(null)}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-200 dark:hover:bg-zinc-800 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 360° Street View Panorama Frame */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
          <iframe
            title="Interactive Street View Panorama"
            src={embedUrl}
            className="w-full h-full border-0"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2 border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[11px] text-gray-500 dark:text-gray-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-sky-500" />
            <span>Click and drag inside the frame to rotate the 360° panoramic view.</span>
          </div>
          <div className="text-right">
            <span>Powered by Google Street View & Mapillary</span>
          </div>
        </div>
      </div>
    </div>
  )
}
