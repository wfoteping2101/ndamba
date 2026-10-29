// The three.js stage: renderer, scene, lights, resize, quality tiers.
// Sim coordinates (x along the pitch, y across, z up) map to three as X = x - w/2, Y = z, Z = y - h/2.
import * as THREE from 'three'

export type Quality = 'low' | 'medium' | 'high'

export interface QualitySettings { dpr: number; shadows: boolean; shadowMap: number; antialias: boolean; outlines: boolean; crowd: number; props: number }
export const QUALITY: Record<Quality, QualitySettings> = {
  low: { dpr: 1, shadows: false, shadowMap: 512, antialias: false, outlines: false, crowd: 0.25, props: 0.4 },
  medium: { dpr: 1.5, shadows: true, shadowMap: 1024, antialias: true, outlines: true, crowd: 0.6, props: 0.75 },
  high: { dpr: 2, shadows: true, shadowMap: 2048, antialias: true, outlines: true, crowd: 1, props: 1 },
}

/** A first guess from the device; the frame-rate monitor can step it down later. */
export function detectQuality(): Quality {
  try {
    const nav = navigator as Navigator & { deviceMemory?: number }
    const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || matchMedia('(pointer: coarse)').matches
    const mem = nav.deviceMemory ?? 8
    const saved = localStorage.getItem('ndamba.jeux.quality') as Quality | null
    if (saved === 'low' || saved === 'medium' || saved === 'high') return saved
    if (mem <= 3) return 'low'
    if (mobile) return 'medium'
    return 'high'
  } catch { return 'medium' }
}

export interface StageOpts { quality: Quality; background?: string; fog?: [number, number] | null; toon?: boolean }

export class Stage {
  renderer: THREE.WebGLRenderer
  scene = new THREE.Scene()
  camera: THREE.PerspectiveCamera
  sun: THREE.DirectionalLight
  hemi: THREE.HemisphereLight
  quality: QualitySettings
  qualityName: Quality
  private ro: ResizeObserver
  private container: HTMLElement
  width = 1
  height = 1

  constructor(container: HTMLElement, opts: StageOpts) {
    this.container = container
    this.qualityName = opts.quality
    this.quality = QUALITY[opts.quality]
    this.renderer = new THREE.WebGLRenderer({ antialias: this.quality.antialias, powerPreference: 'high-performance', preserveDrawingBuffer: false })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.quality.dpr))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    this.renderer.shadowMap.enabled = this.quality.shadows
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.domElement.style.display = 'block'
    this.renderer.domElement.style.width = '100%'
    this.renderer.domElement.style.height = '100%'
    this.renderer.domElement.setAttribute('aria-hidden', 'true')
    container.appendChild(this.renderer.domElement)

    this.scene.background = new THREE.Color(opts.background ?? '#b9d6e6')
    if (opts.fog) this.scene.fog = new THREE.Fog(opts.background ?? '#b9d6e6', opts.fog[0], opts.fog[1])
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 600)
    this.hemi = new THREE.HemisphereLight(0xfff4e2, 0x2d3a26, 1.25)
    this.scene.add(this.hemi)
    this.sun = new THREE.DirectionalLight(0xfff1d6, 2.6)
    this.sun.position.set(-30, 55, 25)
    this.sun.castShadow = this.quality.shadows
    this.sun.shadow.mapSize.set(this.quality.shadowMap, this.quality.shadowMap)
    this.sun.shadow.bias = -0.0004
    this.sun.shadow.normalBias = 0.03
    this.scene.add(this.sun)
    this.scene.add(this.sun.target)

    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(container)
    this.resize()
  }

  /** Fit the shadow camera to the playing area (w x h metres centred on the origin). */
  fitShadow(w: number, h: number) {
    const s = this.sun.shadow.camera
    const r = Math.max(w, h) * 0.62 + 4
    s.left = -r; s.right = r; s.top = r; s.bottom = -r
    s.near = 1; s.far = 220
    s.updateProjectionMatrix()
  }

  resize() {
    const w = Math.max(1, this.container.clientWidth), h = Math.max(1, this.container.clientHeight)
    this.width = w; this.height = h
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  render() { this.renderer.render(this.scene, this.camera) }

  /** Project a world point to CSS pixels inside the container (for HTML labels). */
  project(v: THREE.Vector3): { x: number; y: number; visible: boolean } {
    const p = v.clone().project(this.camera)
    return { x: ((p.x + 1) / 2) * this.width, y: ((1 - p.y) / 2) * this.height, visible: p.z < 1 && p.z > -1 }
  }

  dispose() {
    this.ro.disconnect()
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.geometry) m.geometry.dispose()
      const mat = m.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
      else if (mat) {
        for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose()
        mat.dispose()
      }
    })
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}

/** sim (x, y, z) -> three world */
export class Frame {
  constructor(public w: number, public h: number) {}
  x(x: number) { return x - this.w / 2 }
  z(y: number) { return y - this.h / 2 }
  vec(x: number, y: number, z = 0) { return new THREE.Vector3(x - this.w / 2, z, y - this.h / 2) }
  /** three world -> sim (x, y) on the ground */
  toSim(v: THREE.Vector3) { return { x: v.x + this.w / 2, y: v.z + this.h / 2 } }
  /** sim facing angle (in the pitch plane) -> three rotation.y for a model whose forward is +Z */
  rotY(facing: number) { return Math.atan2(Math.cos(facing), Math.sin(facing)) }
}

/** Measures frame time and suggests a lower tier when the device struggles. */
export class FpsMonitor {
  private samples: number[] = []
  private last = performance.now()
  fps = 60
  tick() {
    const now = performance.now()
    const dt = now - this.last
    this.last = now
    if (dt > 0 && dt < 1000) this.samples.push(dt)
    if (this.samples.length > 90) this.samples.shift()
    const avg = this.samples.reduce((a, b) => a + b, 0) / Math.max(1, this.samples.length)
    this.fps = 1000 / Math.max(1, avg)
    return this.fps
  }
  /** true when the average over the window is clearly too slow */
  struggling() { return this.samples.length >= 90 && this.fps < 34 }
  reset() { this.samples = [] }
}
