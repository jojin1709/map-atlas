/*
 * GlobeEngine — 3D WebGL Globe engine for Map Atlas powered by Three.js.
 *
 * Features:
 * - Hardware-accelerated WebGL 3D Earth sphere with realistic atmospheric Fresnel glow
 * - Dynamic Mercator tile layer texture mapping (Street, Satellite, Dark, Topo)
 * - 3D orbit drag rotation with smooth momentum/inertia & gentle auto-rotation
 * - Double-click / wheel zoom transition from 3D Globe into 2D flat map
 * - Precise raycasting for coordinate tracking and pin click handling
 * - 3D marker pins with camera occlusion / horizon culling
 */

import * as THREE from 'three'
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

export class GlobeEngine {
  private container: HTMLElement
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private globeGroup: THREE.Group
  private earthMesh: THREE.Mesh
  private atmosphereMesh: THREE.Mesh
  private overlayEl: HTMLElement

  private textureCanvas: HTMLCanvasElement
  private textureCtx: CanvasRenderingContext2D | null
  private earthTexture: THREE.CanvasTexture

  // Spherical camera & rotation state
  private yaw = 0 // longitude rotation around Y
  private pitch = 0.2 // latitude rotation around X
  private distance = 2.8 // camera distance (2.1 to 4.5)
  private targetYaw = 0
  private targetPitch = 0.2
  private targetDistance = 2.8

  // Interaction
  private isDragging = false
  private dragStartX = 0
  private dragStartY = 0
  private hasDragged = false
  private lastMouseX = 0
  private lastMouseY = 0
  private velYaw = 0
  private velPitch = 0
  private lastTime = 0
  private autoRotate = true

  private rafId: number | null = null
  private resizeObserver?: ResizeObserver
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
    this.container.style.position = 'absolute'
    this.container.style.inset = '0'
    this.container.style.width = '100%'
    this.container.style.height = '100%'
    this.container.style.overflow = 'hidden'
    this.container.style.background = 'radial-gradient(ellipse at center, #0a1128 0%, #030712 100%)'

    const w = Math.max(100, this.container.clientWidth || window.innerWidth)
    const h = Math.max(100, this.container.clientHeight || window.innerHeight)

    // Three.js Scene, Camera, Renderer
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100)
    this.camera.position.set(0, 0, this.distance)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setSize(w, h)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.domElement.className = 'globe-canvas'
    this.renderer.domElement.style.position = 'absolute'
    this.renderer.domElement.style.inset = '0'
    this.renderer.domElement.style.width = '100%'
    this.renderer.domElement.style.height = '100%'
    this.renderer.domElement.style.cursor = 'grab'
    this.container.appendChild(this.renderer.domElement)

    // Markers DOM overlay
    this.overlayEl = document.createElement('div')
    this.overlayEl.className = 'globe-overlay'
    this.overlayEl.style.position = 'absolute'
    this.overlayEl.style.inset = '0'
    this.overlayEl.style.pointerEvents = 'none'
    this.container.appendChild(this.overlayEl)

    // Offscreen texture canvas
    this.textureCanvas = document.createElement('canvas')
    this.textureCanvas.width = 1024
    this.textureCanvas.height = 1024
    this.textureCtx = this.textureCanvas.getContext('2d')
    this._generateFallbackTexture()

    this.earthTexture = new THREE.CanvasTexture(this.textureCanvas)
    this.earthTexture.wrapS = THREE.RepeatWrapping
    this.earthTexture.wrapT = THREE.ClampToEdgeWrapping

    // Earth Mesh
    this.globeGroup = new THREE.Group()
    this.scene.add(this.globeGroup)

    const sphereGeom = new THREE.SphereGeometry(1, 64, 64)
    this._adjustSphereUVs(sphereGeom)

    const earthMat = new THREE.MeshPhongMaterial({
      map: this.earthTexture,
      shininess: 18,
      specular: new THREE.Color(0x336699),
    })
    this.earthMesh = new THREE.Mesh(sphereGeom, earthMat)
    this.globeGroup.add(this.earthMesh)

    // Atmospheric Glow Mesh
    const atmGeom = new THREE.SphereGeometry(1.025, 48, 48)
    const atmMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float d = dot(vNormal, vec3(0.0, 0.0, 1.0));
          float intensity = pow(max(0.0, 0.65 - d), 2.2);
          gl_FragColor = vec4(0.3, 0.65, 1.0, 1.0) * intensity * 0.85;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    })
    this.atmosphereMesh = new THREE.Mesh(atmGeom, atmMat)
    this.scene.add(this.atmosphereMesh)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9)
    this.scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.3)
    dirLight.position.set(5, 3, 5)
    this.scene.add(dirLight)

    if (opts.center) {
      this.setCenter(opts.center[0], opts.center[1])
    }
    if (opts.autoRotate !== undefined) this.autoRotate = opts.autoRotate
    if (opts.tileUrls) this.tileUrls = opts.tileUrls
    if (opts.cssFilter) this.cssFilter = opts.cssFilter
    this.clickCb = opts.onClick
    this.moveCb = opts.onMove
    this.zoomInFlatCb = opts.onZoomInToFlat

    this._bindEvents()
    this._loadTiles()

    // Observe container resizing cleanly
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this._resize()
      })
      this.resizeObserver.observe(this.container)
    }

    this._animate = this._animate.bind(this)
    this.rafId = requestAnimationFrame(this._animate)
  }

  /** Adjust UVs of sphere to map Web Mercator projection accurately */
  private _adjustSphereUVs(geometry: THREE.SphereGeometry): void {
    const uvAttr = geometry.attributes.uv
    const posAttr = geometry.attributes.position

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i)
      const y = posAttr.getY(i)
      const z = posAttr.getZ(i)

      const latRad = Math.asin(Math.max(-1, Math.min(1, y)))
      const latDeg = (latRad * 180) / Math.PI
      const lngRad = Math.atan2(x, -z)

      const u = (lngRad + Math.PI) / (2 * Math.PI)

      // Web Mercator V mapping with polar clamping
      const latClamped = Math.max(-85.0511, Math.min(85.0511, latDeg))
      const latClampedRad = (latClamped * Math.PI) / 180
      const mercV = 1.0 - (0.5 - Math.log(Math.tan(Math.PI / 4 + latClampedRad / 2)) / (2 * Math.PI))

      uvAttr.setXY(i, u, Math.max(0, Math.min(1, mercV)))
    }
    uvAttr.needsUpdate = true
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
    this.earthTexture.needsUpdate = true
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
            ${m.label ? `<span style="background:rgba(15,23,42,0.9); color:#fff; font-size:11px; font-weight:600; padding:2px 6px; border-radius:4px; margin-bottom:2px; white-space:nowrap; border:1px solid rgba(255,255,255,0.2); box-shadow:0 2px 6px rgba(0,0,0,0.5);">${m.label}</span>` : ''}
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

  private _generateFallbackTexture(): void {
    if (!this.textureCtx) return
    const ctx = this.textureCtx
    const w = this.textureCanvas.width
    const h = this.textureCanvas.height

    const isDark = this.currentStyleKey === 'dark'
    const isSat = this.currentStyleKey === 'satellite'

    // Vibrant ocean background
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

    // Lat/Long subtle grid lines
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)'
    ctx.lineWidth = 1
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

    // Geographically accurate continent polygons [x, y] in 0..1 UV coordinates
    const landPolys: [number, number][][] = [
      // North America
      [
        [0.08, 0.20], [0.12, 0.16], [0.18, 0.14], [0.25, 0.15], [0.30, 0.20],
        [0.34, 0.22], [0.31, 0.28], [0.32, 0.35], [0.28, 0.40], [0.24, 0.44],
        [0.26, 0.52], [0.23, 0.50], [0.20, 0.45], [0.14, 0.40], [0.12, 0.32],
        [0.06, 0.28], [0.05, 0.24]
      ],
      // South America
      [
        [0.26, 0.53], [0.30, 0.52], [0.36, 0.55], [0.38, 0.60], [0.37, 0.68],
        [0.33, 0.78], [0.30, 0.84], [0.27, 0.82], [0.28, 0.72], [0.25, 0.62],
        [0.24, 0.56]
      ],
      // Eurasia (Europe + Asia)
      [
        [0.46, 0.28], [0.52, 0.24], [0.58, 0.20], [0.66, 0.18], [0.76, 0.18],
        [0.86, 0.20], [0.94, 0.22], [0.92, 0.30], [0.88, 0.36], [0.84, 0.44],
        [0.80, 0.48], [0.74, 0.44], [0.72, 0.38], [0.68, 0.40], [0.62, 0.48],
        [0.58, 0.44], [0.54, 0.40], [0.50, 0.44], [0.44, 0.44], [0.42, 0.38],
        [0.44, 0.32]
      ],
      // Africa
      [
        [0.46, 0.44], [0.54, 0.44], [0.59, 0.50], [0.62, 0.56], [0.58, 0.66],
        [0.55, 0.74], [0.52, 0.80], [0.48, 0.74], [0.46, 0.64], [0.42, 0.58],
        [0.42, 0.50], [0.44, 0.46]
      ],
      // Australia
      [
        [0.80, 0.68], [0.86, 0.66], [0.90, 0.70], [0.90, 0.78], [0.86, 0.82],
        [0.80, 0.80], [0.78, 0.74]
      ],
      // Greenland
      [
        [0.32, 0.12], [0.38, 0.10], [0.40, 0.16], [0.36, 0.20], [0.32, 0.18]
      ],
      // UK / Ireland
      [
        [0.44, 0.24], [0.46, 0.24], [0.47, 0.28], [0.44, 0.28]
      ],
      // Japan
      [
        [0.89, 0.35], [0.91, 0.33], [0.92, 0.38], [0.90, 0.40]
      ],
      // Madagascar
      [
        [0.60, 0.68], [0.62, 0.66], [0.62, 0.74], [0.60, 0.74]
      ],
      // Indonesia
      [
        [0.78, 0.56], [0.84, 0.56], [0.88, 0.58], [0.82, 0.60]
      ]
    ]

    const landFill = isSat ? '#22543d' : isDark ? '#1e293b' : '#34d399'
    const landStroke = isSat ? '#2d6a4f' : isDark ? '#334155' : '#10b981'

    ctx.fillStyle = landFill
    ctx.strokeStyle = landStroke
    ctx.lineWidth = 1.5

    for (const poly of landPolys) {
      if (poly.length < 3) continue
      ctx.beginPath()
      ctx.moveTo(poly[0][0] * w, poly[0][1] * h)
      for (let i = 1; i < poly.length; i++) {
        ctx.lineTo(poly[i][0] * w, poly[i][1] * h)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }

    // Polar ice caps (North & South)
    ctx.fillStyle = '#f1f5f9'
    ctx.beginPath()
    ctx.rect(0, 0, w, h * 0.08)
    ctx.fill()

    ctx.beginPath()
    ctx.rect(0, h * 0.90, w, h * 0.10)
    ctx.fill()

    if (this.earthTexture) this.earthTexture.needsUpdate = true
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
          try {
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
              this.earthTexture.needsUpdate = true
            }
          } catch {
            // Silently keep fallback texture if canvas tainted
          }
        }
        img.onerror = () => {
          loadedCount++
        }
        img.src = url
      }
    }
  }

  private _bindEvents(): void {
    const el = this.renderer.domElement

    el.addEventListener('mousedown', (e) => {
      this.isDragging = true
      this.autoRotate = false
      this.dragStartX = e.clientX
      this.dragStartY = e.clientY
      this.hasDragged = false
      this.lastMouseX = e.clientX
      this.lastMouseY = e.clientY
      this.lastTime = performance.now()
      this.velYaw = 0
      this.velPitch = 0
      el.style.cursor = 'grabbing'
    })

    window.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect()
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
      if (Math.hypot(e.clientX - this.dragStartX, e.clientY - this.dragStartY) > 5) {
        this.hasDragged = true
      }

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
        el.style.cursor = 'grab'
      }
    })

    // Wheel zoom
    el.addEventListener('wheel', (e) => {
      e.preventDefault()
      const delta = e.deltaY * 0.002
      this.targetDistance = Math.max(2.1, Math.min(4.5, this.targetDistance + delta))

      if (this.targetDistance <= 2.12 && e.deltaY < 0) {
        const center = this.getCenter()
        this.zoomInFlatCb?.(center)
      }
    }, { passive: false })

    // Double click to zoom closer on globe
    el.addEventListener('dblclick', (e) => {
      const rect = el.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const hit = this.raycast(mouseX, mouseY)
      if (hit) {
        this.flyTo(hit.lat, hit.lng, 2.15)
      }
    })

    // Click handler: centers on clicked location without switching to 2D
    el.addEventListener('click', (e) => {
      if (this.hasDragged) return
      const rect = el.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const hit = this.raycast(mouseX, mouseY)
      if (hit) {
        this.flyTo(hit.lat, hit.lng, this.distance)
        this.clickCb?.(hit)
      }
    })

    // Touch support
    let touchStartX = 0
    let touchStartY = 0
    let touchDist = 0

    el.addEventListener('touchstart', (e) => {
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

    el.addEventListener('touchmove', (e) => {
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

    el.addEventListener('touchend', () => {
      this.isDragging = false
    })

    window.addEventListener('resize', () => this._resize())
  }

  private _resize(): void {
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    if (!w || !h) return
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
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

    const mouse = new THREE.Vector2(
      (screenX / w) * 2 - 1,
      -(screenY / h) * 2 + 1
    )
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, this.camera)

    const intersects = raycaster.intersectObject(this.earthMesh)
    if (!intersects.length) return null

    // Point in local sphere coordinates
    const localPoint = this.earthMesh.worldToLocal(intersects[0].point.clone())
    const lat = Math.asin(Math.max(-1, Math.min(1, localPoint.y))) * (180 / Math.PI)
    const lng = Math.atan2(localPoint.x, -localPoint.z) * (180 / Math.PI)
    return { lat, lng }
  }

  /** Project lat/lng to 2D screen coordinate with horizon culling */
  projectToScreen(lat: number, lng: number): { x: number; y: number; visible: boolean } {
    const w = this.container.clientWidth
    const h = this.container.clientHeight

    const latRad = (lat * Math.PI) / 180
    const lngRad = (lng * Math.PI) / 180

    // Local sphere coordinate (radius = 1.0)
    const localPos = new THREE.Vector3(
      Math.cos(latRad) * Math.sin(lngRad),
      Math.sin(latRad),
      -Math.cos(latRad) * Math.cos(lngRad)
    )

    const worldPos = localPos.applyMatrix4(this.earthMesh.matrixWorld)

    // Check if facing camera
    const camDir = new THREE.Vector3().subVectors(this.camera.position, worldPos).normalize()
    const normal = worldPos.clone().normalize()
    if (normal.dot(camDir) < 0.05) {
      return { x: 0, y: 0, visible: false }
    }

    const projected = worldPos.project(this.camera)
    const x = ((projected.x + 1) / 2) * w
    const y = ((-projected.y + 1) / 2) * h

    return { x, y, visible: true }
  }

  private _animate(): void {
    this.rafId = requestAnimationFrame(this._animate)

    // Inertia & Auto-rotation
    if (!this.isDragging) {
      if (this.autoRotate) {
        this.targetYaw += 0.0015
      } else {
        this.velYaw *= 0.92
        this.velPitch *= 0.92
        this.targetYaw += this.velYaw * 16
        this.targetPitch += this.velPitch * 16
        this.targetPitch = Math.max(-1.45, Math.min(1.45, this.targetPitch))
      }
    }

    this.yaw += (this.targetYaw - this.yaw) * 0.12
    this.pitch += (this.targetPitch - this.pitch) * 0.12
    this.distance += (this.targetDistance - this.distance) * 0.14

    // Apply rotation
    this.globeGroup.rotation.x = this.pitch
    this.globeGroup.rotation.y = this.yaw
    this.camera.position.z = this.distance

    this.renderer.render(this.scene, this.camera)
    this._renderMarkers()
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
    this.resizeObserver?.disconnect()
    this.renderer.dispose()
    this.renderer.domElement.remove()
    this.overlayEl.remove()
  }
}
