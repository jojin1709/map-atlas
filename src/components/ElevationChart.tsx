/* Elevation profile chart for a route (SVG). */

import { useEffect, useState } from 'react'
import type { OSRMRoute } from '../types'
import { elevationBatch } from '../services/api'
import { formatDistance } from '../services/geo'

interface Props {
  route: OSRMRoute
}

export default function ElevationChart({ route }: Props) {
  const [points, setPoints] = useState<Array<{ lat: number; lng: number; elevation: number; dist: number }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    // Sample every Nth coordinate to keep requests small
    const coords = route.geometry.coordinates
    const step = Math.max(1, Math.floor(coords.length / 80))
    const sampled: { lat: number; lng: number }[] = []
    for (let i = 0; i < coords.length; i += step) {
      sampled.push({ lat: coords[i][1], lng: coords[i][0] })
    }

    // Compute cumulative distance
    let cumDist = 0
    const dists: number[] = [0]
    for (let i = 1; i < coords.length; i++) {
      const dy = coords[i][1] - coords[i - 1][1]
      const dx = coords[i][0] - coords[i - 1][0]
      cumDist += Math.hypot(dx, dy) * 111000 // rough
      dists.push(cumDist)
    }

    elevationBatch(sampled)
      .then(elevs => {
        if (cancelled) return
        const result = elevs.map((e, i) => ({
          ...e,
          dist: (i / (elevs.length - 1)) * route.distance,
        }))
        setPoints(result)
        setLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        setError(err.message)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [route])

  if (loading) return <div className="muted text-xs mt-2">Loading elevation…</div>
  if (error) return <div className="text-red-500 text-xs mt-2">{error}</div>
  if (points.length < 2) return null

  const W = 300
  const H = 80
  const PAD = { l: 4, r: 4, t: 8, b: 16 }

  const minElev = Math.min(...points.map(p => p.elevation))
  const maxElev = Math.max(...points.map(p => p.elevation))
  const range = maxElev - minElev || 1

  const path = points
    .map((p, i) => {
      const x = PAD.l + (i / (points.length - 1)) * (W - PAD.l - PAD.r)
      const y = PAD.t + (1 - (p.elevation - minElev) / range) * (H - PAD.t - PAD.b)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const areaPath = path + ` L${W - PAD.r},${H - PAD.b} L${PAD.l},${H - PAD.b} Z`

  return (
    <div className="mt-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: '80px' }}>
        <path d={areaPath} fill="rgba(59,130,246,0.15)" />
        <path d={path} fill="none" stroke="#3b82f6" strokeWidth="1.5" />
        <text x={PAD.l} y={H - 2} fontSize="9" fill="currentColor" opacity="0.5">
          0
        </text>
        <text x={W - PAD.r} y={H - 2} fontSize="9" fill="currentColor" opacity="0.5" textAnchor="end">
          {formatDistance(route.distance)}
        </text>
        <text x={PAD.l} y={PAD.t + 6} fontSize="9" fill="currentColor" opacity="0.5">
          {Math.round(maxElev)}m
        </text>
      </svg>
      <div className="text-xs muted text-center">
        ↑ {Math.round(maxElev)}m &nbsp; ↓ {Math.round(minElev)}m &nbsp; gain ~{Math.round(
          points.reduce((acc, p, i) => (i > 0 && p.elevation > points[i - 1].elevation ? acc + p.elevation - points[i - 1].elevation : acc), 0)
        )}m
      </div>
    </div>
  )
}
