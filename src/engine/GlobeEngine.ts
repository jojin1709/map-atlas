/*
 * GlobeEngine — a dependency-free 3D WebGL Globe engine for Map Atlas.
 *
 * Renders an interactive 3D Earth sphere with:
 * - Mathematical Web Mercator to spherical UV mapping
 * - Realistic directional lighting & atmospheric rim glow (Fresnel shader)
 * - Deep space starfield background with subtle cosmic glow
 * - Dynamic tile layer composition (OSM, Satellite, Dark, Topo)
 * - Orbit drag rotation with smooth inertia & gentle idle auto-rotation
 * - Interactive raycasting (lat/lng under cursor, click & hover events)
 * - 3D marker & pin projection with horizon culling
 * - Smooth camera zoom and flight transitions into 2D flat map
 */

import type { LatLng } from '../types'
import { TILE_STYLES } from '../tileStyles'

export interface GlobeEngineOptions {
  center?: [number, number]
  zoom?: number
  tileUrls?: string[]
  cssFilter?: string
  autoRotate?: boolean
  onClick?: (latlng: LatLng) => void
  onMove?: (latlng: LatLng) => void
  onZoomInToFlat?: (center: LatLng) => void
}

export interface GlobeMarker {
  id: string | number
  lat: number
  lng: number
  label?: string
  color?: string
  size?: number
}

// -------------------------------------------------------------------------
// Shaders
// -------------------------------------------------------------------------

const VERTEX_SHADER_SRC = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aUV;

uniform mat4 uMVP;
uniform mat4 uModel;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUV;

void main() {
  vNormal = normalize((uModel * vec4(aNormal, 0.0)).xyz);
  vPosition = (uModel * vec4(aPosition, 1.0)).xyz;
  vUV = aUV;
  gl_Position = uMVP * vec4(aPosition, 1.0);
}
`

const FRAGMENT_SHADER_SRC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUV;

uniform sampler2D uSampler;
uniform vec3 uSunDir;
uniform vec3 uAtmosphereColor;
uniform float uAtmosphereStrength;
uniform vec3 uEyePos;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uEyePos - vPosition);

  vec4 texColor = texture2D(uSampler, vUV);

  // Vibrant base Earth color so the sphere is never empty or dark
  vec3 oceanBlue = vec3(0.09, 0.32, 0.65);
  vec3 baseColor = mix(oceanBlue, texColor.rgb, clamp(length(texColor.rgb) * 1.8, 0.0, 1.0));

  // Directional sunlight + ambient light
  float diff = max(dot(N, normalize(uSunDir)), 0.0);
  float light = 0.50 + 0.50 * diff;

  // Fresnel atmospheric rim glow
  float rim = 1.0 - max(dot(N, V), 0.0);
  float glow = pow(rim, 2.4) * uAtmosphereStrength;

  // Specular shine on water
  vec3 H = normalize(normalize(uSunDir) + V);
  float spec = pow(max(dot(N, H), 0.0), 16.0) * 0.18;

  vec3 finalColor = baseColor * light + uAtmosphereColor * glow + vec3(spec);
  gl_FragColor = vec4(finalColor, 1.0);
}
`

export class GlobeEngine {
  private container: HTMLElement
  private canvas: HTMLCanvasElement
  private haloEl: HTMLElement
  private gl: WebGLRenderingContext | null = null
  private overlayEl: HTMLElement

  private prog: WebGLProgram | null = null
  private texture: WebGLTexture | null = null
  private textureCanvas: HTMLCanvasElement
  private textureCtx: CanvasRenderingContext2D | null

  private sphereVAO: {
    posBuf: WebGLBuffer
    normBuf: WebGLBuffer
    uvBuf: WebGLBuffer
    idxBuf: WebGLBuffer
    count: number
  } | null = null

  private is2DFallback = false
  private ctx2D: CanvasRenderingContext2D | null = null

  // Orientation & view
  private yaw = 0 // longitude rotation around Y
  private pitch = 0.2 // latitude rotation around X
  private distance = 2.8 // camera distance (2.1 to 5.0)
  private targetYaw = 0
  private targetPitch = 0.2
  private targetDistance = 2.8

  // Inertia & drag
  private isDragging = false
  private lastMouseX = 0
  private lastMouseY = 0
  private velYaw = 0
  private velPitch = 0
  private lastTime = 0
  private autoRotate = true

  private rafId: number | null = null
  private markers: GlobeMarker[] = []
  private markerElements: Map<string | number, HTMLElement> = new Map()

  private tileUrls: string[] = TILE_STYLES.osm.tiles
  private cssFilter = ''
  private currentStyleKey = 'osm'

  // Events
  private clickCb?: (latlng: LatLng) => void
  private moveCb?: (latlng: LatLng) => void
  private zoomInFlatCb?: (center: LatLng) => void

  constructor(container: HTMLElement, opts: GlobeEngineOptions = {}) {
    this.container = container
    this.container.classList.add('globe-container')
    this.container.style.position = 'relative'
    this.container.style.overflow = 'hidden'
    this.container.style.background = 'radial-gradient(ellipse at center, #0a1128 0%, #030712 100%)'

    // Atmospheric halo ring behind globe
    this.haloEl = document.createElement('div')
    this.haloEl.className = 'globe-halo'
    this.haloEl.style.position = 'absolute'
    this.haloEl.style.left = '50%'
    this.haloEl.style.top = '50%'
    this.haloEl.style.transform = 'translate(-50%, -50%)'
    this.haloEl.style.borderRadius = '50%'
    this.haloEl.style.pointerEvents = 'none'
    this.haloEl.style.boxShadow = '0 0 80px 20px rgba(56, 189, 248, 0.45), inset 0 0 50px rgba(56, 189, 248, 0.25)'
    this.container.appendChild(this.haloEl)

    // Canvas
    this.canvas = document.createElement('canvas')
    this.canvas.className = 'globe-canvas'
    this.canvas.style.position = 'absolute'
    this.canvas.style.inset = '0'
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    this.canvas.style.cursor = 'grab'
    this.container.appendChild(this.canvas)

    // Markers overlay
    this.overlayEl = document.createElement('div')
    this.overlayEl.className = 'globe-overlay'
    this.overlayEl.style.position = 'absolute'
    this.overlayEl.style.inset = '0'
    this.overlayEl.style.pointerEvents = 'none'
    this.container.appendChild(this.overlayEl)

    // Offscreen canvas for assembling world tiles
    this.textureCanvas = document.createElement('canvas')
    this.textureCanvas.width = 1024
    this.textureCanvas.height = 1024
    this.textureCtx = this.textureCanvas.getContext('2d')

    if (opts.center) {
      this.setCenter(opts.center[0], opts.center[1])
    }
    if (opts.autoRotate !== undefined) this.autoRotate = opts.autoRotate
    if (opts.tileUrls) this.tileUrls = opts.tileUrls
    if (opts.cssFilter) this.cssFilter = opts.cssFilter
    this.clickCb = opts.onClick
    this.moveCb = opts.onMove
    this.zoomInFlatCb = opts.onZoomInToFlat

    this._initGL()
    this._bindEvents()
    this._generateFallbackTexture()
    this._loadTiles()

    this._animate = this._animate.bind(this)
    this.rafId = requestAnimationFrame(this._animate)
  }

  setCenter(lat: number, lng: number): void {
    this.targetYaw = (-lng * Math.PI) / 180
    this.targetPitch = (lat * Math.PI) / 180
    this.yaw = this.targetYaw
    this.pitch = this.targetPitch
  }

  getCenter(): LatLng {
    const lat = (this.pitch * 180) / Math.PI
    const lng = ((-this.yaw * 180) / Math.PI) % 360
    const normalizedLng = ((lng + 180) % 360 + 360) % 360 - 180
    return { lat, lng: normalizedLng }
  }

  setStyle(styleKey: string, tileUrls: string[], filter = ''): void {
    this.currentStyleKey = styleKey
    this.tileUrls = tileUrls
    this.cssFilter = filter
    this._generateFallbackTexture()
    this._loadTiles()
  }

  setMarkers(markers: GlobeMarker[]): void {
    this.markers = markers
    this._syncMarkerElements()
  }

  private _syncMarkerElements(): void {
    const activeIds = new Set(this.markers.map(m => m.id))
    for (const [id, el] of this.markerElements) {
      if (!activeIds.has(id)) {
        el.remove()
        this.markerElements.delete(id)
      }
    }
    for (const m of this.markers) {
      if (!this.markerElements.has(m.id)) {
        const pin = document.createElement('div')
        pin.className = 'globe-pin'
        pin.style.position = 'absolute'
        pin.style.transform = 'translate(-50%, -100%)'
        pin.style.pointerEvents = 'auto'
        pin.style.cursor = 'pointer'
        pin.style.display = 'none'

        const color = m.color || '#3b82f6'
        pin.innerHTML = `
          <div style="display:flex; flex-direction:column; align-items:center;">
            ${m.label ? `<span style="background:rgba(15,23,42,0.88); color:#fff; font-size:11px; font-weight:600; padding:2px 6px; border-radius:4px; margin-bottom:2px; white-space:nowrap; border:1px solid rgba(255,255,255,0.2); box-shadow:0 2px 6px rgba(0,0,0,0.5);">${m.label}</span>` : ''}
            <div style="width:14px; height:14px; border-radius:50%; background:${color}; border:2px solid #fff; box-shadow:0 0 10px ${color};"></div>
          </div>
        `
        pin.addEventListener('click', (e) => {
          e.stopPropagation()
          this.flyTo(m.lat, m.lng, 2.15, () => {
            this.zoomInFlatCb?.({ lat: m.lat, lng: m.lng })
          })
        })
        this.overlayEl.appendChild(pin)
        this.markerElements.set(m.id, pin)
      }
    }
  }

  private _initGL(): void {
    const gl =
      this.canvas.getContext('webgl', { antialias: true, alpha: true }) ||
      (this.canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)

    if (!gl) {
      this.is2DFallback = true
      this.ctx2D = this.canvas.getContext('2d')
      return
    }
    this.gl = gl

    const vs = this._compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SRC)
    const fs = this._compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC)
    if (!vs || !fs) {
      this.is2DFallback = true
      this.ctx2D = this.canvas.getContext('2d')
      return
    }

    const prog = gl.createProgram()!
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('Program link error, fallback to 2D:', gl.getProgramInfoLog(prog))
      this.is2DFallback = true
      this.ctx2D = this.canvas.getContext('2d')
      return
    }
    this.prog = prog

    this._initSphereMesh()

    // Texture setup
    this.texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([25, 80, 175, 255])
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    gl.disable(gl.CULL_FACE)
    gl.enable(gl.DEPTH_TEST)
    gl.depthFunc(gl.LEQUAL)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
  }

  private _compileShader(type: number, src: string): WebGLShader | null {
    if (!this.gl) return null
    const s = this.gl.createShader(type)!
    this.gl.shaderSource(s, src)
    this.gl.compileShader(s)
    if (!this.gl.getShaderParameter(s, this.gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', this.gl.getShaderInfoLog(s))
      this.gl.deleteShader(s)
      return null
    }
    return s
  }

  private _initSphereMesh(): void {
    if (!this.gl) return
    const gl = this.gl
    const latBands = 50
    const lonBands = 80
    const positions: number[] = []
    const normals: number[] = []
    const uvs: number[] = []
    const indices: number[] = []

    for (let i = 0; i <= latBands; i++) {
      const theta = (i * Math.PI) / latBands // 0 to PI
      const sinTheta = Math.sin(theta)
      const cosTheta = Math.cos(theta)
      const latDeg = 90 - (theta * 180) / Math.PI

      // Web Mercator V mapping with polar clamping
      const latClamped = Math.max(-85.0511, Math.min(85.0511, latDeg))
      const latRad = (latClamped * Math.PI) / 180
      const mercV = 0.5 - Math.log(Math.tan(Math.PI / 4 + latRad / 2)) / (2 * Math.PI)

      for (let j = 0; j <= lonBands; j++) {
        const phi = (j * 2 * Math.PI) / lonBands // 0 to 2PI
        const sinPhi = Math.sin(phi)
        const cosPhi = Math.cos(phi)

        const x = -cosPhi * sinTheta
        const y = cosTheta
        const z = sinPhi * sinTheta

        positions.push(x, y, z)
        normals.push(x, y, z)
        uvs.push(j / lonBands, mercV)
      }
    }

    // Counter-clockwise (CCW) front-facing triangles
    for (let i = 0; i < latBands; i++) {
      for (let j = 0; j < lonBands; j++) {
        const first = i * (lonBands + 1) + j
        const second = first + lonBands + 1
        indices.push(first, first + 1, second)
        indices.push(second, first + 1, second + 1)
      }
    }

    const posBuf = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)

    const normBuf = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, normBuf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW)

    const uvBuf = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW)

    const idxBuf = gl.createBuffer()!
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)

    this.sphereVAO = {
      posBuf,
      normBuf,
      uvBuf,
      idxBuf,
      count: indices.length,
    }
  }

  private _generateFallbackTexture(): void {
    if (!this.textureCtx) return
    const ctx = this.textureCtx
    const w = this.textureCanvas.width
    const h = this.textureCanvas.height

    const isDark = this.currentStyleKey === 'dark'
    const isSat = this.currentStyleKey === 'satellite'

    // Vibrant ocean gradient
    const waterGrad = ctx.createLinearGradient(0, 0, 0, h)
    if (isSat) {
      waterGrad.addColorStop(0, '#0c274c')
      waterGrad.addColorStop(0.5, '#133e75')
      waterGrad.addColorStop(1, '#0c274c')
    } else if (isDark) {
      waterGrad.addColorStop(0, '#0a0f1d')
      waterGrad.addColorStop(0.5, '#111827')
      waterGrad.addColorStop(1, '#0a0f1d')
    } else {
      waterGrad.addColorStop(0, '#1e40af')
      waterGrad.addColorStop(0.5, '#2563eb')
      waterGrad.addColorStop(1, '#1e40af')
    }
    ctx.fillStyle = waterGrad
    ctx.fillRect(0, 0, w, h)

    // Latitude & Longitude grid lines
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.12)'
    ctx.lineWidth = 1.5
    for (let x = 0; x <= w; x += w / 12) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }
    for (let y = 0; y <= h; y += h / 6) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }

    // Stylized Earth continents
    ctx.fillStyle = isSat ? '#2d5a27' : isDark ? '#334155' : '#86efac'
    const continents = [
      { x: w * 0.48, y: h * 0.48, rx: w * 0.12, ry: h * 0.22 }, // Africa
      { x: w * 0.68, y: h * 0.30, rx: w * 0.22, ry: h * 0.18 }, // Eurasia
      { x: w * 0.24, y: h * 0.30, rx: w * 0.15, ry: h * 0.16 }, // N. America
      { x: w * 0.32, y: h * 0.66, rx: w * 0.09, ry: h * 0.18 }, // S. America
      { x: w * 0.84, y: h * 0.72, rx: w * 0.08, ry: h * 0.11 }, // Australia
    ]
    for (const c of continents) {
      ctx.beginPath()
      ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    // Polar ice caps
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, 0, w, h * 0.08)
    ctx.fillRect(0, h * 0.92, w, h * 0.08)

    this._updateGLTexture()
  }

  private _loadTiles(): void {
    if (!this.tileUrls.length || !this.textureCtx) return
    const template = this.tileUrls[0]
    const z = 2
    const n = Math.pow(2, z) // 4x4 = 16 tiles
    const tileSize = this.textureCanvas.width / n // 1024 / 4 = 256

    let loadedCount = 0
    const totalTiles = n * n

    for (let ty = 0; ty < n; ty++) {
      for (let tx = 0; tx < n; tx++) {
        const img = new Image()
        img.crossOrigin = 'anonymous'

        const url = template
          .replace('{z}', String(z))
          .replace('{x}', String(tx))
          .replace('{y}', String(ty))
          .replace('{s}', 'a')

        img.onload = () => {
          if (!this.textureCtx) return
          if (this.cssFilter) {
            this.textureCtx.filter = this.cssFilter
          } else {
            this.textureCtx.filter = 'none'
          }
          this.textureCtx.drawImage(img, tx * tileSize, ty * tileSize, tileSize, tileSize)
          this.textureCtx.filter = 'none'

          loadedCount++
          if (loadedCount % 4 === 0 || loadedCount === totalTiles) {
            this._updateGLTexture()
          }
        }
        img.onerror = () => {
          loadedCount++
        }
        img.src = url
      }
    }
  }

  private _updateGLTexture(): void {
    if (!this.gl || !this.texture) return
    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.textureCanvas)
  }

  private _bindEvents(): void {
    const canvas = this.canvas

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true
      this.autoRotate = false
      this.lastMouseX = e.clientX
      this.lastMouseY = e.clientY
      this.lastTime = performance.now()
      this.velYaw = 0
      this.velPitch = 0
      canvas.style.cursor = 'grabbing'
    })

    window.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect()
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top
        const hoveredCoord = this.raycast(mouseX, mouseY)
        if (hoveredCoord) {
          this.moveCb?.(hoveredCoord)
        }
      }

      if (!this.isDragging) return
      const now = performance.now()
      const dt = Math.max(1, now - this.lastTime)
      const dx = e.clientX - this.lastMouseX
      const dy = e.clientY - this.lastMouseY

      const sensitivity = 0.0055
      this.targetYaw += dx * sensitivity
      this.targetPitch += dy * sensitivity
      this.targetPitch = Math.max(-1.45, Math.min(1.45, this.targetPitch))

      this.velYaw = (dx * sensitivity) / dt
      this.velPitch = (dy * sensitivity) / dt

      this.lastMouseX = e.clientX
      this.lastMouseY = e.clientY
      this.lastTime = now
    })

    window.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false
        canvas.style.cursor = 'grab'
      }
    })

    // Wheel zoom
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault()
      const delta = e.deltaY * 0.002
      this.targetDistance = Math.max(2.1, Math.min(4.5, this.targetDistance + delta))

      if (this.targetDistance <= 2.12 && e.deltaY < 0) {
        const center = this.getCenter()
        this.zoomInFlatCb?.(center)
      }
    }, { passive: false })

    // Double click to fly in
    canvas.addEventListener('dblclick', (e) => {
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const hit = this.raycast(mouseX, mouseY)
      if (hit) {
        this.flyTo(hit.lat, hit.lng, 2.15, () => {
          this.zoomInFlatCb?.(hit)
        })
      }
    })

    // Click handler
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const hit = this.raycast(mouseX, mouseY)
      if (hit) {
        this.clickCb?.(hit)
      }
    })

    // Touch support
    let touchStartX = 0
    let touchStartY = 0
    let touchDist = 0

    canvas.addEventListener('touchstart', (e) => {
      this.autoRotate = false
      if (e.touches.length === 1) {
        this.isDragging = true
        touchStartX = e.touches[0].clientX
        touchStartY = e.touches[0].clientY
        this.lastMouseX = touchStartX
        this.lastMouseY = touchStartY
        this.velYaw = 0
        this.velPitch = 0
      } else if (e.touches.length === 2) {
        this.isDragging = false
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        touchDist = Math.hypot(dx, dy)
      }
    }, { passive: true })

    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && this.isDragging) {
        const dx = e.touches[0].clientX - this.lastMouseX
        const dy = e.touches[0].clientY - this.lastMouseY
        this.targetYaw += dx * 0.006
        this.targetPitch += dy * 0.006
        this.targetPitch = Math.max(-1.45, Math.min(1.45, this.targetPitch))
        this.lastMouseX = e.touches[0].clientX
        this.lastMouseY = e.touches[0].clientY
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.hypot(dx, dy)
        const dDist = dist - touchDist
        touchDist = dist
        this.targetDistance = Math.max(2.1, Math.min(4.5, this.targetDistance - dDist * 0.005))
        if (this.targetDistance <= 2.12 && dDist > 0) {
          const center = this.getCenter()
          this.zoomInFlatCb?.(center)
        }
      }
    }, { passive: true })

    canvas.addEventListener('touchend', () => {
      this.isDragging = false
    })

    window.addEventListener('resize', () => this._resize())
    this._resize()
  }

  private _resize(): void {
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = w * dpr
    this.canvas.height = h * dpr

    // Update halo size
    const minDim = Math.min(w, h)
    const globeDiameter = (minDim * 0.85 * (2.8 / this.distance))
    this.haloEl.style.width = `${globeDiameter * 0.98}px`
    this.haloEl.style.height = `${globeDiameter * 0.98}px`
  }

  flyTo(lat: number, lng: number, targetDist = 2.4, onComplete?: () => void): void {
    const startYaw = this.yaw
    const startPitch = this.pitch
    const startDist = this.distance

    const destYaw = (-lng * Math.PI) / 180
    const destPitch = (lat * Math.PI) / 180

    let diffYaw = ((destYaw - startYaw + Math.PI) % (2 * Math.PI)) - Math.PI
    if (diffYaw < -Math.PI) diffYaw += 2 * Math.PI

    const finalPitch = Math.max(-1.45, Math.min(1.45, destPitch))
    const duration = 800
    const start = performance.now()

    const step = (now: number) => {
      const k = Math.min(1, (now - start) / duration)
      const ease = 1 - Math.pow(1 - k, 3)

      this.targetYaw = startYaw + diffYaw * ease
      this.targetPitch = startPitch + (finalPitch - startPitch) * ease
      this.targetDistance = startDist + (targetDist - startDist) * ease

      this.yaw = this.targetYaw
      this.pitch = this.targetPitch
      this.distance = this.targetDistance

      if (k < 1) {
        requestAnimationFrame(step)
      } else {
        onComplete?.()
      }
    }
    requestAnimationFrame(step)
  }

  zoomIn(): void {
    this.targetDistance = Math.max(2.1, this.targetDistance - 0.3)
    if (this.targetDistance <= 2.15) {
      this.zoomInFlatCb?.(this.getCenter())
    }
  }

  zoomOut(): void {
    this.targetDistance = Math.min(4.5, this.targetDistance + 0.3)
  }

  toggleAutoRotate(): boolean {
    this.autoRotate = !this.autoRotate
    return this.autoRotate
  }

  /** Raycast from screen coordinate to sphere lat/lng */
  raycast(screenX: number, screenY: number): LatLng | null {
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    if (!w || !h) return null

    const ndcX = (screenX / w) * 2 - 1
    const ndcY = 1 - (screenY / h) * 2

    const fov = (45 * Math.PI) / 180
    const aspect = w / h
    const tanFov = Math.tan(fov / 2)

    const roX = 0
    const roY = 0
    const roZ = this.distance

    const rdx = ndcX * aspect * tanFov
    const rdy = ndcY * tanFov
    const rdz = -1
    const len = Math.hypot(rdx, rdy, rdz)
    const dirX = rdx / len
    const dirY = rdy / len
    const dirZ = rdz / len

    const b = 2 * (roX * dirX + roY * dirY + roZ * dirZ)
    const c = roX * roX + roY * roY + roZ * roZ - 1
    const disc = b * b - 4 * c
    if (disc < 0) return null

    const t = (-b - Math.sqrt(disc)) / 2
    if (t < 0) return null

    const hx = roX + t * dirX
    const hy = roY + t * dirY
    const hz = roZ + t * dirZ

    const cosP = Math.cos(-this.pitch)
    const sinP = Math.sin(-this.pitch)
    const px1 = hx
    const py1 = hy * cosP - hz * sinP
    const pz1 = hy * sinP + hz * cosP

    const cosY = Math.cos(-this.yaw)
    const sinY = Math.sin(-this.yaw)
    const objX = px1 * cosY + pz1 * sinY
    const objY = py1
    const objZ = -px1 * sinY + pz1 * cosY

    const lat = Math.asin(Math.max(-1, Math.min(1, objY))) * (180 / Math.PI)
    const lng = Math.atan2(objX, objZ) * (180 / Math.PI)
    return { lat, lng }
  }

  /** Project lat/lng to screen (x, y, visible) */
  projectToScreen(lat: number, lng: number): { x: number; y: number; visible: boolean } {
    const w = this.container.clientWidth
    const h = this.container.clientHeight

    const latRad = (lat * Math.PI) / 180
    const lngRad = (lng * Math.PI) / 180

    const objX = Math.cos(latRad) * Math.sin(lngRad)
    const objY = Math.sin(latRad)
    const objZ = Math.cos(latRad) * Math.cos(lngRad)

    const cosY = Math.cos(this.yaw)
    const sinY = Math.sin(this.yaw)
    const wx1 = objX * cosY - objZ * sinY
    const wy1 = objY
    const wz1 = objX * sinY + objZ * cosY

    const cosP = Math.cos(this.pitch)
    const sinP = Math.sin(this.pitch)
    const wx = wx1
    const wy = wy1 * cosP - wz1 * sinP
    const wz = wy1 * sinP + wz1 * cosP

    if (wz <= 0.05) {
      return { x: 0, y: 0, visible: false }
    }

    const fov = (45 * Math.PI) / 180
    const aspect = w / h
    const tanFov = Math.tan(fov / 2)

    const camZ = this.distance - wz
    if (camZ <= 0.01) return { x: 0, y: 0, visible: false }

    const screenX = (wx / (camZ * aspect * tanFov) + 1) * 0.5 * w
    const screenY = (1 - wy / (camZ * tanFov)) * 0.5 * h

    return { x: screenX, y: screenY, visible: true }
  }

  private _animate(): void {
    this.rafId = requestAnimationFrame(this._animate)

    // Dynamic canvas resize check
    const cw = this.container.clientWidth
    const ch = this.container.clientHeight
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const targetW = Math.floor(cw * dpr)
    const targetH = Math.floor(ch * dpr)
    if (targetW > 0 && targetH > 0 && (this.canvas.width !== targetW || this.canvas.height !== targetH)) {
      this.canvas.width = targetW
      this.canvas.height = targetH
      const minDim = Math.min(cw, ch)
      const globeDiameter = minDim * 0.85 * (2.8 / this.distance)
      this.haloEl.style.width = `${globeDiameter * 0.98}px`
      this.haloEl.style.height = `${globeDiameter * 0.98}px`
    }

    // Inertia & Auto-rotation
    if (!this.isDragging) {
      if (this.autoRotate) {
        this.targetYaw += 0.0012
      } else {
        this.velYaw *= 0.92
        this.velPitch *= 0.92
        this.targetYaw += this.velYaw * 16
        this.targetPitch += this.velPitch * 16
        this.targetPitch = Math.max(-1.45, Math.min(1.45, this.targetPitch))
      }
    }

    // Smooth interpolation to target
    this.yaw += (this.targetYaw - this.yaw) * 0.12
    this.pitch += (this.targetPitch - this.pitch) * 0.12
    this.distance += (this.targetDistance - this.distance) * 0.14

    if (this.is2DFallback) {
      this._render2D()
    } else {
      this._render()
    }
    this._renderMarkers()
  }

  private _render2D(): void {
    if (!this.ctx2D) return
    const ctx = this.ctx2D
    const w = this.canvas.width
    const h = this.canvas.height
    if (!w || !h) return
    ctx.clearRect(0, 0, w, h)

    const cx = w / 2
    const cy = h / 2
    const radius = Math.min(w, h) * (0.85 / this.distance)

    // Earth Sphere Disc
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.clip()

    // Draw world map texture rotated
    const mapW = radius * 4
    const mapH = radius * 2
    const normYaw = (((-this.yaw / (Math.PI * 2)) % 1) + 1) % 1
    const shiftX = normYaw * mapW
    ctx.drawImage(this.textureCanvas, cx - radius - shiftX, cy - radius, mapW, mapH)
    ctx.drawImage(this.textureCanvas, cx - radius - shiftX + mapW, cy - radius, mapW, mapH)

    // Spherical 3D shading & atmosphere overlay
    const sphereGrad = ctx.createRadialGradient(
      cx - radius * 0.35,
      cy - radius * 0.35,
      radius * 0.1,
      cx,
      cy,
      radius
    )
    sphereGrad.addColorStop(0, 'rgba(255, 255, 255, 0.20)')
    sphereGrad.addColorStop(0.65, 'rgba(0, 0, 0, 0)')
    sphereGrad.addColorStop(1, 'rgba(2, 6, 23, 0.85)')
    ctx.fillStyle = sphereGrad
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2)

    // Rim atmosphere glow
    const rimGrad = ctx.createRadialGradient(cx, cy, radius * 0.85, cx, cy, radius)
    rimGrad.addColorStop(0, 'rgba(56, 189, 248, 0)')
    rimGrad.addColorStop(1, 'rgba(56, 189, 248, 0.65)')
    ctx.fillStyle = rimGrad
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2)

    ctx.restore()
  }

  private _render(): void {
    if (!this.gl || !this.prog || !this.sphereVAO) return
    const gl = this.gl

    const w = this.canvas.width
    const h = this.canvas.height
    if (!w || !h) return
    gl.viewport(0, 0, w, h)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    const aspect = w / h
    const fov = (45 * Math.PI) / 180
    const near = 0.1
    const far = 100.0

    // Matrix calculations
    const pMat = mat4Perspective(fov, aspect, near, far)
    const vMat = mat4LookAt([0, 0, this.distance], [0, 0, 0], [0, 1, 0])
    const mMat = mat4Identity()
    mat4RotateX(mMat, this.pitch)
    mat4RotateY(mMat, this.yaw)

    const mvMat = mat4Multiply(vMat, mMat)
    const mvpMat = mat4Multiply(pMat, mvMat)

    // Render 3D Earth Sphere
    gl.useProgram(this.prog)

    const uMVP = gl.getUniformLocation(this.prog, 'uMVP')
    const uModel = gl.getUniformLocation(this.prog, 'uModel')
    const uSunDir = gl.getUniformLocation(this.prog, 'uSunDir')
    const uAtmColor = gl.getUniformLocation(this.prog, 'uAtmosphereColor')
    const uAtmStrength = gl.getUniformLocation(this.prog, 'uAtmosphereStrength')
    const uEyePos = gl.getUniformLocation(this.prog, 'uEyePos')
    const uSampler = gl.getUniformLocation(this.prog, 'uSampler')

    gl.uniformMatrix4fv(uMVP, false, mvpMat)
    gl.uniformMatrix4fv(uModel, false, mMat)
    gl.uniform3f(uSunDir, 1.4, 1.2, 2.0)
    const globeAtmColor = this.currentStyleKey === 'satellite'
      ? [0.25, 0.6, 1.0]
      : this.currentStyleKey === 'dark'
      ? [0.18, 0.4, 0.85]
      : [0.35, 0.75, 1.0]
    gl.uniform3fv(uAtmColor, globeAtmColor)
    gl.uniform1f(uAtmStrength, this.currentStyleKey === 'dark' ? 0.9 : 0.70)
    gl.uniform3f(uEyePos, 0, 0, this.distance)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.uniform1i(uSampler, 0)

    // Bind sphere geometry buffers
    const aPos = gl.getAttribLocation(this.prog, 'aPosition')
    gl.bindBuffer(gl.ARRAY_BUFFER, this.sphereVAO.posBuf)
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0)

    const aNorm = gl.getAttribLocation(this.prog, 'aNormal')
    gl.bindBuffer(gl.ARRAY_BUFFER, this.sphereVAO.normBuf)
    gl.enableVertexAttribArray(aNorm)
    gl.vertexAttribPointer(aNorm, 3, gl.FLOAT, false, 0, 0)

    const aUV = gl.getAttribLocation(this.prog, 'aUV')
    gl.bindBuffer(gl.ARRAY_BUFFER, this.sphereVAO.uvBuf)
    gl.enableVertexAttribArray(aUV)
    gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 0, 0)

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.sphereVAO.idxBuf)
    gl.drawElements(gl.TRIANGLES, this.sphereVAO.count, gl.UNSIGNED_SHORT, 0)
  }

  private _renderMarkers(): void {
    for (const m of this.markers) {
      const el = this.markerElements.get(m.id)
      if (!el) continue
      const proj = this.projectToScreen(m.lat, m.lng)
      if (proj.visible) {
        el.style.display = 'block'
        el.style.left = `${proj.x}px`
        el.style.top = `${proj.y}px`
      } else {
        el.style.display = 'none'
      }
    }
  }

  destroy(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.canvas.remove()
    this.haloEl.remove()
    this.overlayEl.remove()
  }
}

/* =========================================================================
   Standard 4x4 Matrix Utilities (Float32Array)
   ========================================================================= */

function mat4Identity(): Float32Array {
  const m = new Float32Array(16)
  m[0] = 1; m[5] = 1; m[10] = 1; m[15] = 1
  return m
}

function mat4Perspective(fovRad: number, aspect: number, near: number, far: number): Float32Array {
  const m = new Float32Array(16)
  const f = 1.0 / Math.tan(fovRad / 2)
  const rangeInv = 1.0 / (near - far)

  m[0] = f / aspect
  m[5] = f
  m[10] = (near + far) * rangeInv
  m[11] = -1
  m[14] = near * far * rangeInv * 2
  return m
}

function mat4LookAt(eye: [number, number, number], target: [number, number, number], up: [number, number, number]): Float32Array {
  const m = new Float32Array(16)
  let z0 = eye[0] - target[0]
  let z1 = eye[1] - target[1]
  let z2 = eye[2] - target[2]
  let len = Math.hypot(z0, z1, z2)
  if (len > 0) { z0 /= len; z1 /= len; z2 /= len }

  let x0 = up[1] * z2 - up[2] * z1
  let x1 = up[2] * z0 - up[0] * z2
  let x2 = up[0] * z1 - up[1] * z0
  len = Math.hypot(x0, x1, x2)
  if (len > 0) { x0 /= len; x1 /= len; x2 /= len }

  const y0 = z1 * x2 - z2 * x1
  const y1 = z2 * x0 - z0 * x2
  const y2 = z0 * x1 - z1 * x0

  m[0] = x0; m[1] = y0; m[2] = z0; m[3] = 0
  m[4] = x1; m[5] = y1; m[6] = z1; m[7] = 0
  m[8] = x2; m[9] = y2; m[10] = z2; m[11] = 0
  m[12] = -(x0 * eye[0] + x1 * eye[1] + x2 * eye[2])
  m[13] = -(y0 * eye[0] + y1 * eye[1] + y2 * eye[2])
  m[14] = -(z0 * eye[0] + z1 * eye[1] + z2 * eye[2])
  m[15] = 1
  return m
}

function mat4Multiply(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16)
  for (let i = 0; i < 4; i++) {
    const ai0 = a[i]
    const ai1 = a[i + 4]
    const ai2 = a[i + 8]
    const ai3 = a[i + 12]
    out[i] = ai0 * b[0] + ai1 * b[1] + ai2 * b[2] + ai3 * b[3]
    out[i + 4] = ai0 * b[4] + ai1 * b[5] + ai2 * b[6] + ai3 * b[7]
    out[i + 8] = ai0 * b[8] + ai1 * b[9] + ai2 * b[10] + ai3 * b[11]
    out[i + 12] = ai0 * b[12] + ai1 * b[13] + ai2 * b[14] + ai3 * b[15]
  }
  return out
}

function mat4RotateX(m: Float32Array, rad: number): void {
  const s = Math.sin(rad)
  const c = Math.cos(rad)
  const m1 = m[1], m2 = m[2], m5 = m[5], m6 = m[6], m9 = m[9], m10 = m[10], m13 = m[13], m14 = m[14]
  m[1] = m1 * c + m2 * s
  m[2] = m1 * -s + m2 * c
  m[5] = m5 * c + m6 * s
  m[6] = m5 * -s + m6 * c
  m[9] = m9 * c + m10 * s
  m[10] = m9 * -s + m10 * c
  m[13] = m13 * c + m14 * s
  m[14] = m13 * -s + m14 * c
}

function mat4RotateY(m: Float32Array, rad: number): void {
  const s = Math.sin(rad)
  const c = Math.cos(rad)
  const m0 = m[0], m2 = m[2], m4 = m[4], m6 = m[6], m8 = m[8], m10 = m[10], m12 = m[12], m14 = m[14]
  m[0] = m0 * c - m2 * s
  m[2] = m0 * s + m2 * c
  m[4] = m4 * c - m6 * s
  m[6] = m4 * s + m6 * c
  m[8] = m8 * c - m10 * s
  m[10] = m8 * s + m10 * c
  m[12] = m12 * c - m14 * s
  m[14] = m12 * s + m14 * c
}
