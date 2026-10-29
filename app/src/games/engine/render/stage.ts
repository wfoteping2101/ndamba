// The three.js stage: renderer, scene, lights, resize, quality tiers.
// Sim coordinates (x along the pitch, y across, z up) map to three as X = x - w/2, Y = z, Z = y - h/2.
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

export type Quality = 'low' | 'medium' | 'high'

export interface QualitySettings { dpr: number; shadows: boolean; shadowMap: number; antialias: boolean; outlines: boolean; crowd: number; props: number; post: boolean; ao: boolean; bloom: boolean }
export const QUALITY: Record<Quality, QualitySettings> = {
  low: { dpr: 1, shadows: false, shadowMap: 512, antialias: false, outlines: false, crowd: 0.25, props: 0.4, post: false, ao: false, bloom: false },
  medium: { dpr: 1.5, shadows: true, shadowMap: 2048, antialias: true, outlines: true, crowd: 0.6, props: 0.75, post: true, ao: false, bloom: true },
  high: { dpr: 2, shadows: true, shadowMap: 4096, antialias: true, outlines: true, crowd: 1, props: 1, post: true, ao: true, bloom: true },
}

/** The broadcast grade: a touch of contrast and saturation, a soft vignette (applied before tone mapping output). */
const GradeShader = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null }, contrast: { value: 1.06 }, saturation: { value: 1.08 }, vignette: { value: 0.22 }, tint: { value: new THREE.Color(1, 1, 1) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float contrast; uniform float saturation; uniform float vignette; uniform vec3 tint; varying vec2 vUv;
  void main(){
    vec4 c = texture2D(tDiffuse, vUv);
    vec3 col = c.rgb * tint;
    float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(vec3(l), col, saturation);
    col = (col - 0.18) * contrast + 0.18;
    vec2 d = vUv - 0.5; float v = 1.0 - vignette * smoothstep(0.25, 0.85, dot(d, d) * 2.2);
    gl_FragColor = vec4(max(col, 0.0) * v, c.a);
  }`,
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
  /** UI covering the edges of the view (CSS px): the camera centres the action in what stays visible */
  insets = { l: 0, t: 0, r: 0, b: 0 }

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
    if (this.composer) {
      const size = this.renderer.getDrawingBufferSize(new THREE.Vector2())
      this.composer.setSize(w, h)
      this.composer.setPixelRatio(this.renderer.getPixelRatio())
      this.gtao?.setSize(size.x, size.y)
    }
    this.camera.aspect = w / h
    this.applyInsets()
  }

  setInsets(l: number, t: number, r: number, b: number) {
    const i = this.insets
    if (i.l === l && i.t === t && i.r === r && i.b === b) return
    this.insets = { l, t, r, b }
    this.applyInsets()
  }
  private applyInsets() {
    const { l, t, r, b } = this.insets
    if (l || t || r || b) this.camera.setViewOffset(this.width, this.height, -(l - r) / 2, -(t - b) / 2, this.width, this.height)
    else this.camera.clearViewOffset()
    this.camera.updateProjectionMatrix()
  }
  /** The visible part of the view as fractions (for framing). */
  visibleFraction() {
    const { l, t, r, b } = this.insets
    return { fx: Math.max(0.2, (this.width - l - r) / this.width), fy: Math.max(0.2, (this.height - t - b) / this.height) }
  }

  /* ------------------------------------------------------------------ post-processing */
  private composer: EffectComposer | null = null
  private gtao: GTAOPass | null = null
  private bloom: UnrealBloomPass | null = null
  grade: ShaderPass | null = null
  private gradeTint = new THREE.Color(1, 1, 1)
  postEnabled = true
  /** a colour cast for the moment of the day (warm late afternoon, cool night) */
  setGrade(tint: string) { this.gradeTint.set(tint); if (this.grade) this.grade.uniforms.tint.value.copy(this.gradeTint) }
  private pmrem: THREE.PMREMGenerator | null = null
  private envRT: THREE.WebGLRenderTarget | null = null

  private buildPost() {
    const q = this.quality
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2())
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: q.antialias ? 4 : 0 })
    const c = new EffectComposer(this.renderer, rt)
    c.addPass(new RenderPass(this.scene, this.camera))
    if (q.ao) {
      this.gtao = new GTAOPass(this.scene, this.camera, size.x, size.y)
      this.gtao.output = GTAOPass.OUTPUT.Default
      this.gtao.blendIntensity = 0.85
      this.gtao.updateGtaoMaterial({ radius: 0.45, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 12 })
      this.gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 })
      c.addPass(this.gtao)
    }
    if (q.bloom) {
      this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.16, 0.45, 0.9)
      c.addPass(this.bloom)
    }
    this.grade = new ShaderPass(GradeShader)
    this.grade.uniforms.tint.value.copy(this.gradeTint)
    c.addPass(this.grade)
    c.addPass(new OutputPass())
    this.composer = c
  }

  render() {
    if (this.quality.post && this.postEnabled) {
      if (!this.composer) this.buildPost()
      this.composer!.render()
    } else this.renderer.render(this.scene, this.camera)
  }

  /** Drop the costly passes first when the frame rate struggles (ambient occlusion, then everything). */
  degradePost(): boolean {
    if (this.gtao && this.gtao.enabled) { this.gtao.enabled = false; return true }
    if (this.postEnabled && this.composer) { this.postEnabled = false; return true }
    return false
  }

  /** Image-based light from a sky: top, horizon and ground colours with the sun's glow, as a PMREM. */
  setSkyLight(top: string, horizon: string, ground: string, sunDir: THREE.Vector3, sunColor: string, intensity = 1) {
    this.pmrem ??= new THREE.PMREMGenerator(this.renderer)
    const sc = new THREE.Scene()
    const geo = new THREE.SphereGeometry(10, 32, 16)
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: new THREE.Color(top) }, hor: { value: new THREE.Color(horizon) }, gnd: { value: new THREE.Color(ground) }, sd: { value: sunDir.clone().normalize() }, sc: { value: new THREE.Color(sunColor) } },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 top; uniform vec3 hor; uniform vec3 gnd; uniform vec3 sd; uniform vec3 sc; varying vec3 vD;
        void main(){ float y = vD.y; vec3 c = y > 0.0 ? mix(hor, top, pow(clamp(y, 0.0, 1.0), 0.6)) : mix(hor, gnd, clamp(-y * 3.0, 0.0, 1.0));
        float s = max(dot(normalize(vD), sd), 0.0); c += sc * (pow(s, 64.0) * 6.0 + pow(s, 6.0) * 0.35); gl_FragColor = vec4(c, 1.0); }`,
    })
    sc.add(new THREE.Mesh(geo, mat))
    this.envRT?.dispose()
    this.envRT = this.pmrem.fromScene(sc, 0.02)
    this.scene.environment = this.envRT.texture
    this.scene.environmentIntensity = intensity
    geo.dispose(); mat.dispose()
  }

  /** Project a world point to CSS pixels inside the container (for HTML labels). */
  project(v: THREE.Vector3): { x: number; y: number; visible: boolean } {
    const p = v.clone().project(this.camera)
    return { x: ((p.x + 1) / 2) * this.width, y: ((1 - p.y) / 2) * this.height, visible: p.z < 1 && p.z > -1 }
  }

  dispose() {
    this.ro.disconnect()
    this.composer?.dispose()
    this.envRT?.dispose()
    this.pmrem?.dispose()
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
