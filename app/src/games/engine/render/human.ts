// Realistic players: skinned humans built offline from the MakeHuman CC0 data (tools/humans), dressed
// at runtime. One GLB per body type (boy, lean boy, big boy, girl, man...) holds the body, eyes, teeth,
// every hairstyle and every garment; a look shows the pieces it needs and paints them: skin tone with
// lips, brows, palms and nails from the detail maps, the club shirt with its stripe, number and trims,
// socks of two colours if the book says so. Faces blink, talk and smile through morph targets.
import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Look } from '../sim/types'
import type { AnimInput } from './character'
import type { Figure } from './animal'
import { Motion, loadMotions } from './motion'

export type Archetype = 'boy' | 'boyLean' | 'boyBig' | 'girl' | 'man' | 'oldman' | 'woman' | 'womanBig' | 'oldwoman'

interface Meta {
  name: string
  height: number
  kid: boolean
  kitAtlas: { torso: [number, number, number, number]; sleeveL: [number, number, number, number]; sleeveR: [number, number, number, number] }
  pieces: string[]
}

interface Asset { gltf: GLTF; meta: Meta; skinA: ImageData; skinB: ImageData }

const BASE = `${import.meta.env.BASE_URL ?? '/'}jeux/humans/`
const cache = new Map<Archetype, Promise<Asset>>()

async function image(url: string): Promise<ImageData> {
  const img = new Image()
  img.decoding = 'async'
  img.src = url
  await img.decode()
  const c = document.createElement('canvas')
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.drawImage(img, 0, 0)
  return g.getImageData(0, 0, c.width, c.height)
}

export function loadArchetype(a: Archetype): Promise<Asset> {
  let p = cache.get(a)
  if (!p) {
    p = (async () => {
      const [gltf, meta, skinA, skinB] = await Promise.all([
        new GLTFLoader().loadAsync(`${BASE}${a}.glb`),
        fetch(`${BASE}${a}.json`).then((r) => r.json() as Promise<Meta>),
        image(`${BASE}${a}_skinA.png`),
        image(`${BASE}${a}_skinB.png`),
      ])
      prepareShared(gltf)
      return { gltf, meta, skinA, skinB }
    })()
    cache.set(a, p)
  }
  return p
}

/** Which body a look wears. */
export function archetypeOf(look: Look): Archetype {
  if (look.kid === true) {
    if (look.girl) return 'girl'
    if ((look.build ?? 1) >= 1.2) return 'boyBig'
    if ((look.height ?? 1) >= 1.05 && (look.build ?? 1) <= 0.95) return 'boyLean'
    return 'boy'
  }
  if (look.woman) return look.elder ? 'oldwoman' : (look.build ?? 1) >= 1.08 ? 'womanBig' : 'woman'
  return look.elder ? 'oldman' : 'man'
}

/** Load the bodies (and the motion library) a scene needs before it starts. */
export async function preloadHumans(looks: Look[]) {
  const types = new Set(looks.filter((l) => !l.animal).map(archetypeOf))
  await Promise.all([...[...types].map(loadArchetype), loadMotions()])
}

/* ------------------------------------------------------------------------------------ shared prep */

/** Things done once per GLB (nothing to do at the moment: the eyes are drawn by their material). */
function prepareShared(_gltf: GLTF) { /* kept for future per-asset fixes */ }

/** The eyes: each vertex's colour is its direction from the eye's centre; the iris (with fibres), the
 *  limbal ring and the pupil are drawn per pixel from it, round and sharp at any distance. */
function eyeMaterial() {
  // wet but not a mirror: the clearcoat gives the catchlight, the environment stays faint
  const m = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.06, envMapIntensity: 0.45, specularIntensity: 0.4 })
  const u = { uSclera: { value: new THREE.Color('#d8cdbd') }, uIris: { value: new THREE.Color('#4a2c18') }, uIrisOut: { value: new THREE.Color('#1a0e07') } }
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u)
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uSclera; uniform vec3 uIris; uniform vec3 uIrisOut;')
      .replace('#include <color_fragment>', `#include <color_fragment>
      {
        vec3 d = normalize(vColor.rgb * 2.0 - 1.0);
        float ang = acos(clamp(-d.y, -1.0, 1.0));
        float az = atan(d.x, d.z);
        float aa = fwidth(ang) + 1e-4;
        float iris = 1.0 - smoothstep(0.555 - aa, 0.575 + aa, ang);
        float pupil = 1.0 - smoothstep(0.235 - aa, 0.255 + aa, ang);
        float limbal = 1.0 - smoothstep(0.0, 0.085, abs(ang - 0.55));
        float fib = 0.8 + 0.2 * sin(az * 41.0 + sin(az * 9.0) * 2.4) * smoothstep(0.25, 0.42, ang);
        vec3 ir = uIris * fib * mix(1.35, 0.75, smoothstep(0.25, 0.56, ang));
        vec3 c = mix(uSclera * mix(1.0, 0.78, smoothstep(0.85, 1.55, ang)), ir, iris);
        c = mix(c, uIrisOut, limbal * 0.75);
        c = mix(c, vec3(0.01), pupil);
        diffuseColor.rgb = c;
      }`)
  }
  m.customProgramCacheKey = () => 'eye-2'
  return m
}

const UP = new THREE.Vector3(0, 1, 0)

/** One layer of short curly hair above the scalp shell (the fur-shell technique): the layer is lifted
 *  along the skinned normal and keeps only the strands tall enough to reach it, so stacked layers read
 *  as a soft, fuzzy mass with an uneven outline instead of a smooth helmet. Inner layers are darker. */
function hairShell(color: string, level: number, lift: number, cell: number) {
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.75 + 0.35 * level), roughness: 0.92 })
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uLevel = { value: level }
    sh.uniforms.uLift = { value: lift }
    sh.uniforms.uCell = { value: cell }
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 color;\nuniform float uLift; uniform float uCell;\nvarying float vFade; varying vec2 vStrand;')
      .replace('#include <skinning_vertex>', '#include <skinning_vertex>\nvFade = color.r;\nvStrand = uv * uCell;\ntransformed += normalize(objectNormal) * uLift * smoothstep(0.0, 0.8, color.r);')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uLevel; varying float vFade; varying vec2 vStrand;
        float sHash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 15731.743); }`)
      .replace('#include <alphatest_fragment>', `#include <alphatest_fragment>
        { vec2 cell = floor(vStrand), f = fract(vStrand) - 0.5;
          float h = sHash(cell);
          vec2 off = vec2(sHash(cell + 7.1), sHash(cell + 3.7)) - 0.5;
          float r = length(f - off * 0.5);
          float tall = (0.35 + 0.65 * h) * smoothstep(0.05, 0.9, vFade);
          float thick = mix(0.48, 0.18, uLevel);
          if (tall < uLevel || r > thick) discard; }`)
  }
  m.customProgramCacheKey = () => 'hair-shell'
  return m
}

/** Same-material pieces of one archetype merged into one geometry (limb skin, both eyes, both shoes). */
const mergedCache = new Map<string, THREE.BufferGeometry>()

/* ------------------------------------------------------------------------------------ textures */

const texCache = new Map<string, THREE.Texture>()

function srgb(hex: string) { const c = new THREE.Color(hex); return [c.r, c.g, c.b].map((v) => Math.round(THREE.MathUtils.clamp(v, 0, 1) ** (1 / 2.2) * 255)) as [number, number, number] }

/** Skin albedo for one tone: base tone, lips, brows (in the hair colour), lighter palms, soles and nails. */
function skinMap(a: Archetype, asset: Asset, tone: string, brow: string, scalp: boolean): THREE.Texture {
  const key = `${a}|${tone}|${brow}|${scalp}`
  const hit = texCache.get(key)
  if (hit) return hit
  const A = asset.skinA, B = asset.skinB
  const W = A.width, H = A.height
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const g = c.getContext('2d')!
  const out = g.createImageData(W, H)
  const [r0, g0, b0] = srgb(tone)
  const [hr, hg, hb] = srgb(brow)
  // a little mottling so the skin is not plastic: two octaves of smooth (bilinear) value noise
  const grid = (n: number) => { const g = new Float32Array((n + 1) * (n + 1)); for (let i = 0; i < g.length; i++) g[i] = Math.random(); return g }
  const coarse = grid(24), fine = grid(96)
  const smooth = (g: Float32Array, n: number, u: number, v: number) => {
    const x = u * n, y = v * n, x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), w = n + 1
    const a = g[y0 * w + x0], b = g[y0 * w + x0 + 1], c2 = g[(y0 + 1) * w + x0], d2 = g[(y0 + 1) * w + x0 + 1]
    return (a + (b - a) * sx) * (1 - sy) + (c2 + (d2 - c2) * sx) * sy
  }
  const d = out.data, a8 = A.data, b8 = B.data
  for (let y = 0; y < H; y++) {
    const v = y / H
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4
      const sc = scalp ? a8[i] / 255 : 0, lip = a8[i + 1] / 255, br = a8[i + 2] / 255
      const palm = b8[i] / 255, nail = b8[i + 1] / 255, lid = b8[i + 2] / 255
      const u = x / W
      const n = 0.965 + smooth(coarse, 24, u, v) * 0.05 + smooth(fine, 96, u, v) * 0.025
      let r = r0 * n, gg = g0 * n, bb = b0 * n
      // lips: deeper and warmer
      const L = lip * 0.85
      r = r * (1 - L) + r * 0.82 * L; gg = gg * (1 - L) + gg * 0.62 * L; bb = bb * (1 - L) + bb * 0.66 * L
      // palms and soles, nails: lighter and pinker
      const P = Math.max(palm * 0.8, nail * 0.75)
      r = r * (1 - P) + Math.min(255, r * 1.55 + 40) * P; gg = gg * (1 - P) + Math.min(255, gg * 1.45 + 26) * P; bb = bb * (1 - P) + Math.min(255, bb * 1.45 + 22) * P
      // eyelids a touch darker, then the brows
      const Ld = 1 - lid * 0.12
      r *= Ld; gg *= Ld; bb *= Ld
      // brows, and under the hair the scalp takes the hair colour (no skin shows between the curls)
      const Bw = Math.min(1, Math.max(br * 0.95, sc * 0.92))
      r = r * (1 - Bw) + hr * Bw; gg = gg * (1 - Bw) + hg * Bw; bb = bb * (1 - Bw) + hb * Bw
      d[i] = r; d[i + 1] = gg; d[i + 2] = bb; d[i + 3] = 255
    }
  }
  g.putImageData(out, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.flipY = false
  t.anisotropy = 4
  texCache.set(key, t)
  return t
}

/** A tileable normal map from a height function painted on a canvas. */
function normalFromHeight(key: string, size: number, height: (x: number, y: number) => number, strength = 2): THREE.Texture {
  const hit = texCache.get(key)
  if (hit) return hit
  const h = new Float32Array(size * size)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) h[y * size + x] = height(x / size, y / size)
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  const img = g.createImageData(size, size)
  const at = (x: number, y: number) => h[((y + size) % size) * size + ((x + size) % size)]
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * strength, dy = (at(x, y + 1) - at(x, y - 1)) * strength
    const l = Math.hypot(dx, dy, 1)
    const i = (y * size + x) * 4
    img.data[i] = (-dx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (-dy / l * 0.5 + 0.5) * 255; img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255
  }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.NoColorSpace
  t.anisotropy = 4
  texCache.set(key, t)
  return t
}

function hashNoise(seed: number) {
  // smooth periodic noise from a few sines (tileable on 0..1)
  const rnd = (k: number) => { const x = Math.sin(seed * 91.7 + k * 12.9898) * 43758.5453; return x - Math.floor(x) }
  const waves = Array.from({ length: 6 }, (_, k) => ({ fx: 1 + Math.floor(rnd(k) * 6), fy: 1 + Math.floor(rnd(k + 9) * 6), p: rnd(k + 20) * 6.28 }))
  return (x: number, y: number, f = 1) => waves.reduce((s, w) => s + Math.sin((w.fx * x + w.fy * y) * Math.PI * 2 * f + w.p), 0) / waves.length
}

const poreNormal = () => normalFromHeight('pores', 256, (x, y) => {
  const n = hashNoise(3)
  return n(x, y, 8) * 0.5 + n(y, x, 21) * 0.35 + (Math.random() - 0.5) * 0.25
}, 1.4)

const knitNormal = () => normalFromHeight('knit', 128, (x, y) => {
  // a jersey knit: little vertical loops
  const u = x * 64, v = y * 96
  return Math.abs(Math.sin(u * Math.PI)) * 0.6 + Math.sin(v * Math.PI * 2 + Math.sin(u * Math.PI) * 1.2) * 0.25
}, 1.2)

const curlNormal = () => normalFromHeight('curls', 256, (x, y) => {
  const n = hashNoise(7)
  let s = 0
  for (let k = 0; k < 4; k++) s += Math.sin((x * 37 + Math.sin(y * 29 + k) * 1.5) * 6.28 + k) * Math.sin((y * 41 + Math.cos(x * 23 + k) * 1.5) * 6.28) / (k + 1)
  return s * 0.5 + n(x, y, 12) * 0.3
}, 2.4)

/** The shirt, painted on the kit atlas: body colour, the stripe, a felt-pen mark, the numbers. */
function kitMap(look: Look, meta: Meta, long: boolean): THREE.Texture {
  const key = `kit|${look.shirt}|${look.stripe?.color}|${look.stripe?.side}|${look.number}|${look.numberColor}|${look.chestMark}|${look.chestMarkColor}|${look.jacket}|${long}`
  const hit = texCache.get(key)
  if (hit) return hit
  const S = 512
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  const R = (r: [number, number, number, number]) => ({ x: r[0] * S, y: (1 - r[1] - r[3]) * S, w: r[2] * S, h: r[3] * S })
  g.fillStyle = look.shirt
  g.fillRect(0, 0, S, S)
  const T = R(meta.kitAtlas.torso)
  const ux = (u: number) => T.x + u * T.w
  const vy = (v: number) => T.y + (1 - v) * T.h
  // the open tracksuit top shows the T-shirt down the front
  if (look.jacket) {
    g.fillStyle = look.jacket
    g.fillRect(ux(0.21), vy(1), ux(0.29) - ux(0.21), T.h)
  }
  if (look.stripe) {
    // on the wearer's left the front centre is u 0.25 and the left side u 0.5
    const u0 = look.stripe.side === 'L' ? 0.285 : 0.18
    g.fillStyle = look.stripe.color
    g.fillRect(ux(u0), vy(1), ux(u0 + 0.035) - ux(u0), T.h)
  }
  if (look.chestMark === 'fin') {
    g.fillStyle = look.chestMarkColor ?? '#e8f0fa'
    g.beginPath()
    const cx = ux(0.25), cy = vy(0.66), s = T.w * 0.045
    g.moveTo(cx - s * 1.2, cy + s * 0.6); g.quadraticCurveTo(cx - s * 0.1, cy - s * 0.2, cx + s * 0.25, cy - s * 1.3); g.quadraticCurveTo(cx + s * 0.35, cy - s * 0.2, cx + s * 1.1, cy + s * 0.6)
    g.closePath(); g.fill()
  } else if (look.chestMark === 'spots') {
    g.fillStyle = look.chestMarkColor ?? '#1b1b1b'
    let seed = 5
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    for (let i = 0; i < 70; i++) {
      const u = rnd(), v = 0.05 + rnd() * 0.9
      g.beginPath(); g.ellipse(ux(u), vy(v), 3 + rnd() * 4, 2.5 + rnd() * 3, rnd() * 3, 0, Math.PI * 2); g.fill()
    }
  }
  if (look.number !== undefined) {
    g.fillStyle = look.numberColor ?? '#F2EEE3'
    g.textAlign = 'center'; g.textBaseline = 'middle'
    g.font = `800 ${Math.round(T.h * 0.36)}px Archivo, system-ui, sans-serif`
    g.fillText(String(look.number), ux(0.75), vy(0.56))
    g.font = `800 ${Math.round(T.h * 0.11)}px Archivo, system-ui, sans-serif`
    g.fillText(String(look.number), ux(0.205), vy(0.72))
  }
  // a faint weave so large flat areas catch light
  const img = g.getImageData(0, 0, S, S)
  for (let i = 0; i < img.data.length; i += 4) { const k = 0.97 + Math.random() * 0.05; img.data[i] *= k; img.data[i + 1] *= k; img.data[i + 2] *= k }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.flipY = false
  t.anisotropy = 4
  texCache.set(key, t)
  return t
}

/** A wax print that tiles: motifs drawn with their wrapped copies so the seams vanish. */
function waxMap(base: string, p: Look['pattern'] | undefined, repeat: number): THREE.Texture {
  const key = `wax|${base}|${p?.a}|${p?.b}|${p?.kind}|${repeat}`
  const hit = texCache.get(key)
  if (hit) return hit
  const S = 512
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  g.fillStyle = base; g.fillRect(0, 0, S, S)
  if (p) {
    let seed = 7
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    const motif = (cx: number, cy: number, r: number, rot: number, i: number) => {
      g.save(); g.translate(cx, cy); g.rotate(rot)
      if (p.kind === 'leaves') {
        g.fillStyle = i % 2 ? p.a : p.b
        g.beginPath(); g.ellipse(0, 0, r * 1.5, r * 0.58, 0, 0, Math.PI * 2); g.fill()
        g.strokeStyle = base; g.lineWidth = 3.5
        g.beginPath(); g.moveTo(-r * 1.4, 0); g.lineTo(r * 1.4, 0); g.stroke()
        for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(k * r * 0.35, 0); g.lineTo(k * r * 0.35 + r * 0.25, -r * 0.45); g.stroke() }
      } else {
        for (let k = 4; k >= 1; k--) { g.fillStyle = k % 2 ? p.a : p.b; g.beginPath(); g.arc(0, 0, (r * k) / 4, 0, Math.PI * 2); g.fill() }
        if (p.kind === 'wax') {
          g.fillStyle = p.b
          for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; g.beginPath(); g.arc(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3, r * 0.12, 0, Math.PI * 2); g.fill() }
          g.strokeStyle = p.a; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, r * 1.62, 0.3, Math.PI * 1.2); g.stroke()
        }
      }
      g.restore()
    }
    for (let i = 0; i < 16; i++) {
      const cx = rnd() * S, cy = rnd() * S, r = 22 + rnd() * 26, rot = rnd() * Math.PI
      for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) motif(cx + dx, cy + dy, r, rot, i)
    }
  }
  // the weave
  const img = g.getImageData(0, 0, S, S)
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const i = (y * S + x) * 4; const k = ((x + y) & 1 ? 0.97 : 1.02) + Math.random() * 0.03; img.data[i] *= k; img.data[i + 1] *= k; img.data[i + 2] *= k }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat, repeat)
  t.anisotropy = 4
  texCache.set(key, t)
  return t
}

/** Tracksuit trousers: a side stripe down each leg (u: front 0.5, wearer's left 0.75, right 0.25). */
function trouserMap(color: string, stripe: string): THREE.Texture {
  const key = `trousers|${color}|${stripe}`
  const hit = texCache.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = 256; c.height = 64
  const g = c.getContext('2d')!
  g.fillStyle = color; g.fillRect(0, 0, 256, 64)
  g.fillStyle = stripe
  for (const u of [0.25, 0.75]) g.fillRect(u * 256 - 4, 0, 8, 64)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.flipY = false
  texCache.set(key, t)
  return t
}

/** Hair textures: cornrow lines, BriBri's shaved part on his left. */
function hairMap(look: Look): THREE.Texture | null {
  if (look.hair !== 'cornrows' && !look.part) return null
  const key = `hair|${look.hair}|${look.part}|${look.hairColor}|${look.skin}`
  const hit = texCache.get(key)
  if (hit) return hit
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  g.fillStyle = '#ffffff'
  g.fillRect(0, 0, S, S)
  if (look.hair === 'cornrows') {
    for (let i = 0; i < 9; i++) {
      const x = (i + 0.5) / 9 * S
      g.fillStyle = '#6b6b6b'
      g.fillRect(x - 1.5, 0, 3, S)
    }
  }
  if (look.part) {
    // u grows towards the wearer's left
    const u = look.part === 'L' ? 0.66 : 0.34
    g.fillStyle = '#000000'
    g.fillRect(u * S - 1.5, 0, 3, S * 0.55)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.flipY = false
  texCache.set(key, t)
  return t
}

/* ------------------------------------------------------------------------------------ materials */

function withMasks(m: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial, fragment: string, uniforms: Record<string, THREE.IUniform> = {}) {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms)
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 color;\nvarying vec4 vMask;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMask = color;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vMask;\n' + Object.keys(uniforms).map((k) => `uniform ${uniforms[k].value instanceof THREE.Color ? 'vec3' : 'float'} ${k};`).join('\n'))
      .replace('#include <map_fragment>', '#include <map_fragment>\n' + fragment)
  }
  m.customProgramCacheKey = () => fragment + Object.keys(uniforms).join(',')
}

function trimMaterial(color: string, trim: string, opts: { map?: THREE.Texture; collar?: number; cuff?: number; hem?: number; rough?: number; sheen?: number }) {
  const m = new THREE.MeshPhysicalMaterial({ color: opts.map ? '#ffffff' : color, map: opts.map ?? null, roughness: opts.rough ?? 0.78, sheen: opts.sheen ?? 0.5, sheenRoughness: 0.7, sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.4), normalMap: knitNormal(), normalScale: new THREE.Vector2(0.35, 0.35) })
  m.normalMap!.repeat.set(9, 9)
  withMasks(m, `{ float tr = max(max(vMask.r * uCollar, vMask.g * uCuff), vMask.b * uHem); diffuseColor.rgb = mix(diffuseColor.rgb, uTrim, smoothstep(0.42, 0.62, tr)); }`, {
    uTrim: { value: new THREE.Color(trim) }, uCollar: { value: opts.collar ?? 1 }, uCuff: { value: opts.cuff ?? 1 }, uHem: { value: opts.hem ?? 0 },
  })
  return m
}

/* ------------------------------------------------------------------------------------ the figure */

const HAIR_PIECES: Record<Look['hair'], string[]> = {
  crop: ['hair_crop'], cornrows: ['hair_crop'], afro: ['hair_afro'], twists: ['hair_crop', 'hair_twists'], puff: ['hair_crop', 'hair_puff'],
  bald: [], long: ['hair_afro'], cap: ['hair_crop', 'cap_crown', 'cap_brim'],
}

export class Human implements Figure {
  root = new THREE.Group()
  height: number
  outline: THREE.Object3D | null = null
  ready = false
  private model: THREE.Object3D | null = null
  private meshes: THREE.Mesh[] = []
  private morphs: { mesh: THREE.Mesh; dict: Record<string, number> }[] = []
  private mats: THREE.Material[] = []
  private visible = true
  private blinkT = 1 + Math.random() * 3
  private blink = 0
  private talk = 0
  private time = Math.random() * 10
  motion: Motion | null = null
  private pending: AnimInput | null = null
  private facingY = 0
  /** a walking stick that always reaches the ground from the hand (rigid, not skinned) */
  private cane: { mesh: THREE.Mesh; hand: THREE.Object3D; knuckle: THREE.Object3D | null } | null = null
  private tmpV = new THREE.Vector3()
  private tmpG = new THREE.Vector3()
  private tmpK = new THREE.Vector3()
  private shells: THREE.SkinnedMesh[] = []

  constructor(public look: Look, private opts: { castShadow?: boolean } = {}) {
    const a = archetypeOf(look)
    this.height = (look.kid === true ? 1.36 : look.woman ? 1.64 : 1.75) * (look.height ?? 1)
    loadArchetype(a).then((asset) => this.build(a, asset)).catch((e) => console.error('human', a, e))
  }

  private build(a: Archetype, asset: Asset) {
    const look = this.look
    const model = SkeletonUtils.clone(asset.gltf.scene)
    const show = new Set<string>(['body', 'eye_l', 'eye_r', 'upper-teeth', 'lower-teeth', 'tongue', 'calves', 'thighs', 'forearms', ...HAIR_PIECES[look.hair]])
    const long = !!look.jacket
    const trousers = !!look.trousers
    const has = (n: string) => asset.meta.pieces.includes(n)
    if (look.dress && has('skirt')) { show.add('dress_top'); show.add('skirt') }
    else {
      show.add(long && has('longsleeves') ? 'longsleeves' : 'shirt')
      if (trousers && has('trousers')) show.add('trousers')
      else { show.add('shorts'); show.add('sock_l'); show.add('sock_r') }
    }
    if (look.headwrap && has('hair_wrap')) { for (const h of HAIR_PIECES[look.hair]) show.delete(h); show.add('hair_wrap'); show.add('wrap_knot') }
    if (look.hat && has('hat_crown')) { for (const h of HAIR_PIECES[look.hair]) show.delete(h); show.add('hat_crown'); show.add('hat_brim'); if (look.hatFlowers) show.add('hat_flowers') }
    // skin that clothes cover is not drawn (no poking through when the knees bend)
    if (show.has('skirt') || show.has('trousers')) { show.delete('thighs'); show.delete('calves') }
    if (show.has('longsleeves')) show.delete('forearms')
    if (look.beard && has('beard')) show.add('beard')
    if (look.glasses && has('glasses')) show.add('glasses')
    if (look.cane && has('cane')) show.add('cane')
    if (look.earrings && has('earrings')) show.add('earrings')
    const shoes = look.shoes ?? 'boots'
    if (shoes === 'sandals') show.add('feet')
    if (shoes === 'boots') { show.add('boot_l'); show.add('boot_r') } else if (shoes === 'trainers') { show.add('trainer_l'); show.add('trainer_r') } else if (shoes === 'shoes') { show.add(asset.meta.pieces.includes('shoe_l') ? 'shoe_l' : 'trainer_l'); show.add(asset.meta.pieces.includes('shoe_r') ? 'shoe_r' : 'trainer_r') }
    if (look.gloves) { show.add('glove_l'); show.add('glove_r') }

    const skin = new THREE.MeshPhysicalMaterial({
      map: skinMap(a, asset, look.skin, look.hairColor, look.hair !== 'bald'), roughness: 0.5, sheen: 0.3, sheenRoughness: 0.45,
      sheenColor: new THREE.Color(look.skin).lerp(new THREE.Color('#d9a27e'), 0.5), normalMap: poreNormal(), normalScale: new THREE.Vector2(0.18, 0.18),
      specularIntensity: 0.55, clearcoat: 0.05, clearcoatRoughness: 0.4,
    })
    skin.normalMap!.repeat.set(28, 28)
    const hairTex = hairMap(look)
    const hair = new THREE.MeshPhysicalMaterial({ color: look.hairColor, map: hairTex, roughness: 0.86, sheen: 0.7, sheenRoughness: 0.55, sheenColor: new THREE.Color('#5a4a3c'), normalMap: curlNormal(), normalScale: new THREE.Vector2(1.1, 1.1) })
    hair.normalMap!.repeat.set(7, 7)
    // scalp hair thins out at the hairline: the vertex colour says how far in from the edge, a fine noise
    // breaks the line, and alpha-to-coverage gives a soft, multisampled edge (no sorting, no halo)
    const hairEdge = hair.clone()
    hairEdge.alphaToCoverage = true
    hairEdge.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec4 color;\nvarying float vFade;\nvarying vec2 vHairUv;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFade = color.r;\nvHairUv = uv * vec2(90.0, 70.0);')
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          varying float vFade; varying vec2 vHairUv;
          float hHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float hNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(hHash(i), hHash(i + vec2(1, 0)), f.x), mix(hHash(i + vec2(0, 1)), hHash(i + vec2(1, 1)), f.x), f.y); }`)
        .replace('#include <alphatest_fragment>', `#include <alphatest_fragment>
          { float n = hNoise(vHairUv) * 0.65 + hNoise(vHairUv * 0.23) * 0.35;
            diffuseColor.a = smoothstep(0.0, 0.35, vFade * 1.35 - n * 0.6); }`)
    }
    hairEdge.customProgramCacheKey = () => 'hair-edge'
    const eye = eyeMaterial()
    const teeth = new THREE.MeshStandardMaterial({ color: '#e8e1d2', roughness: 0.35 })
    const mouth = new THREE.MeshStandardMaterial({ color: '#4a1f1c', roughness: 0.6 })
    const shirt = trimMaterial(look.shirt, look.collar ?? look.shirtTrim ?? look.shirt, { map: kitMap(look, asset.meta, long), collar: look.collar || look.shirtTrim ? 1 : 0, cuff: look.shirtTrim && look.shirtTrim !== look.shirt ? 1 : 0, hem: 0 })
    const shorts = trimMaterial(look.trousers ?? look.shorts, look.trouserStripe ?? look.shorts, { map: look.trousers && look.trouserStripe ? trouserMap(look.trousers, look.trouserStripe) : undefined, collar: 0, cuff: 0, hem: 0, rough: 0.7 })
    const dressBase = look.dress ?? look.shirt
    const dressTop = trimMaterial(dressBase, dressBase, { map: waxMap(dressBase, look.pattern, 5), collar: 0, cuff: 0, hem: 0, rough: 0.72, sheen: 0.35 })
    const skirtM = trimMaterial(dressBase, dressBase, { map: waxMap(dressBase, look.pattern, 1), collar: 0, cuff: 0, hem: 0, rough: 0.72, sheen: 0.35 })
    const wrap = new THREE.MeshPhysicalMaterial({ map: waxMap(look.headwrap ?? dressBase, look.headwrap ? look.pattern : undefined, 2), roughness: 0.75, sheen: 0.4, sheenColor: new THREE.Color('#ffffff') })
    const hatM = new THREE.MeshPhysicalMaterial({ color: look.hat ?? '#f2e2b8', roughness: 0.85, sheen: 0.3 })
    const flowers = new THREE.MeshStandardMaterial({ color: look.hatFlowers ?? '#d6457a', roughness: 0.6 })
    const beardM = new THREE.MeshPhysicalMaterial({ color: look.beard ?? look.hairColor, roughness: 0.9, sheen: 0.6, sheenColor: new THREE.Color('#8a8070'), normalMap: curlNormal(), normalScale: new THREE.Vector2(0.8, 0.8) })
    const glassesM = new THREE.MeshStandardMaterial({ color: '#1b1b1d', roughness: 0.3, metalness: 0.6 })
    const caneM = new THREE.MeshStandardMaterial({ color: '#6b4a2e', roughness: 0.7 })
    const gold = new THREE.MeshStandardMaterial({ color: look.earrings ?? '#e6b640', roughness: 0.25, metalness: 1 })
    const sock = (col: string) => trimMaterial(col, col, { collar: 0, cuff: 0, hem: 0, rough: 0.85, sheen: 0.6 })
    const sockL = sock(look.sockL), sockR = sock(look.sockR)
    // socks and shoes sit millimetres above the skin: win the depth test at a distance
    for (const m of [sockL, sockR]) { m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -2 }
    const soleCol = shoes === 'boots' ? '#1a1714' : '#ece8de'
    const shoe = new THREE.MeshPhysicalMaterial({ color: look.boots, roughness: shoes === 'boots' ? 0.35 : 0.6, clearcoat: shoes === 'boots' ? 0.6 : 0.1, clearcoatRoughness: 0.3 })
    withMasks(shoe, `diffuseColor.rgb = mix(diffuseColor.rgb, uSole, step(0.5, vMask.r));`, { uSole: { value: new THREE.Color(soleCol) } })
    const gloves = new THREE.MeshPhysicalMaterial({ color: look.gloves ?? '#d9cfbd', roughness: 0.7, sheen: 0.4 })
    const cap = new THREE.MeshPhysicalMaterial({ color: look.cap ?? '#6f6a62', roughness: 0.8, sheen: 0.4 })
    this.mats.push(skin, hair, hairEdge, eye, teeth, mouth, shirt, shorts, sockL, sockR, shoe, gloves, cap, dressTop, skirtM, wrap, hatM, flowers, beardM, glassesM, caneM, gold)
    const matFor = (n: string): THREE.Material => {
      if (n === 'body' || n === 'feet' || n === 'calves' || n === 'thighs' || n === 'forearms') return skin
      if (n === 'hair_wrap' || n === 'wrap_knot') return wrap
      if (n.startsWith('hair_')) return hair
      if (n.startsWith('eye_')) return eye
      if (n.endsWith('teeth')) return teeth
      if (n === 'tongue') return mouth
      if (n === 'shirt' || n === 'longsleeves') return shirt
      if (n === 'shorts' || n === 'trousers') return shorts
      if (n === 'sock_l') return sockL
      if (n === 'sock_r') return sockR
      if (n.startsWith('boot_') || n.startsWith('trainer_') || n.startsWith('shoe_')) return shoe
      if (n.startsWith('glove_')) return gloves
      if (n.startsWith('cap_')) return cap
      if (n === 'dress_top') return dressTop
      if (n === 'skirt') return skirtM
      if (n === 'hair_wrap' || n === 'wrap_knot') return wrap
      if (n === 'hat_crown' || n === 'hat_brim') return hatM
      if (n === 'hat_flowers') return flowers
      if (n === 'beard') return beardM
      if (n === 'glasses') return glassesM
      if (n === 'cane') return caneM
      if (n === 'earrings') return gold
      return skin
    }
    model.traverse((o) => {
      const m = o as THREE.SkinnedMesh
      if (!m.isMesh) return
      const name = m.name.replace(/_\d+$/, '')
      const piece = asset.meta.pieces.includes(name) ? name : m.parent && asset.meta.pieces.includes(m.parent.name) ? m.parent.name : name
      m.visible = show.has(piece)
      m.material = (piece === 'hair_crop' || piece === 'hair_afro') && m.geometry.getAttribute('color') ? hairEdge : matFor(piece)
      m.castShadow = !!this.opts.castShadow && m.visible && !piece.startsWith('eye') && !piece.endsWith('teeth') && piece !== 'tongue'
      m.receiveShadow = true
      m.frustumCulled = false
      if (m.morphTargetDictionary && m.visible) this.morphs.push({ mesh: m, dict: m.morphTargetDictionary })
      this.meshes.push(m)
    })
    // hands at rest are never flat: the fingers curl a little (and close round the stick of a cane)
    const gripR = !!look.cane
    const AX = new THREE.Vector3(1, 0, 0), q = new THREE.Quaternion()
    for (const side of ['l', 'r'] as const) {
      const grip = gripR && side === 'r'
      for (const f of ['index', 'middle', 'ring', 'pinky'] as const) {
        const spread = f === 'index' ? 0.8 : f === 'pinky' ? 1.15 : 1
        const angles = grip ? [72, 85, 55] : [16 * spread, 22 * spread, 14 * spread]
        angles.forEach((deg, k) => model.getObjectByName(`${f}_0${k + 1}_${side}`)?.quaternion.multiply(q.setFromAxisAngle(AX, THREE.MathUtils.degToRad(deg))))
      }
      const thumb = grip ? [0, 28, 30] : [0, 8, 10]
      thumb.forEach((deg, k) => { if (deg) model.getObjectByName(`thumb_0${k + 1}_${side}`)?.quaternion.multiply(q.setFromAxisAngle(AX, THREE.MathUtils.degToRad(deg))) })
    }
    // the stick: drawn from the hand to the ground every frame (the skinned one would swing with the wrist)
    const skinnedCane = this.meshes.find((m) => m.visible && m.name.replace(/_\d+$/, '') === 'cane')
    const handR = model.getObjectByName('hand_r')
    if (skinnedCane && handR) {
      skinnedCane.visible = false
      const g = new THREE.CylinderGeometry(0.011, 0.009, 1, 8)
      g.translate(0, 0.5, 0)
      const mesh = new THREE.Mesh(g, caneM)
      mesh.castShadow = !!this.opts.castShadow
      this.root.add(mesh)
      this.cane = { mesh, hand: handR, knuckle: model.getObjectByName('middle_01_r') ?? null }
    }
    // what this look does not wear leaves the scene, and same-material pieces become one draw
    for (const m of this.meshes) if (!m.visible) m.removeFromParent()
    this.meshes = this.meshes.filter((m) => m.visible)
    this.mergePieces(a)
    // a soft curly mass over short hair, close to the camera only
    const hairCap = this.meshes.find((m) => (m.name === 'hair_afro' || m.name === 'hair_crop') && (m as THREE.SkinnedMesh).isSkinnedMesh && m.geometry.getAttribute('color')) as THREE.SkinnedMesh | undefined
    if (hairCap && !look.headwrap && !look.hat && look.hair !== 'cap') {
      const cap = hairCap
      const afro = cap.name === 'hair_afro'
      const n = afro ? 6 : 4, lift = afro ? 0.008 : 0.0032
      for (let i = 1; i <= n; i++) {
        const mat = hairShell(look.hairColor, i / (n + 1), (lift * i) / n, afro ? 150 : 210)
        this.mats.push(mat)
        const sm = new THREE.SkinnedMesh(cap.geometry, mat)
        sm.position.copy(cap.position); sm.quaternion.copy(cap.quaternion); sm.scale.copy(cap.scale)
        sm.bind(cap.skeleton, cap.bindMatrix)
        sm.frustumCulled = false
        sm.receiveShadow = true
        cap.parent!.add(sm)
        this.shells.push(sm)
      }
      // shells cost a draw each: only for heads near the camera
      const shells = this.shells, wp = new THREE.Vector3()
      cap.onBeforeRender = (_r, _s, camera) => {
        cap.getWorldPosition(wp)
        const near = camera.position.distanceToSquared(wp) < 8 * 8
        for (const sm of shells) sm.visible = near
      }
    }
    // heights: a child of the book is about 1.36 m, an adult 1.75 m, times the look's own factor
    const s = ((asset.meta.kid ? 1.36 : look.woman ? 1.64 : 1.75) * (look.height ?? 1)) / asset.meta.height
    model.scale.setScalar(s)
    this.height = asset.meta.height * s
    this.root.add(model)
    this.model = model
    model.userData.archetypeKey = `${a}|${s}`
    this.motion = new Motion(model, look)
    this.ready = true
    this.root.visible = this.visible
    if (this.pending) this.update(this.pending, 0)
  }

  private mergePieces(a: Archetype) {
    const groups = new Map<THREE.Material, THREE.SkinnedMesh[]>()
    for (const m of this.meshes) {
      const sm = m as THREE.SkinnedMesh
      if (!sm.isSkinnedMesh || sm.morphTargetInfluences?.length) continue
      const mat = sm.material as THREE.Material
      const list = groups.get(mat)
      if (list) list.push(sm); else groups.set(mat, [sm])
    }
    for (const [mat, list] of groups) {
      if (list.length < 2) continue
      const ref = list[0]
      const attrs = Object.keys(ref.geometry.attributes).sort().join()
      const ok = list.every((m) => m.parent === ref.parent && m.matrix.equals(ref.matrix) && m.bindMatrix.equals(ref.bindMatrix)
        && m.skeleton.bones.length === ref.skeleton.bones.length && m.skeleton.bones.every((b, i) => b === ref.skeleton.bones[i])
        && Object.keys(m.geometry.attributes).sort().join() === attrs && !!m.geometry.index === !!ref.geometry.index)
      if (!ok) continue
      const key = `${a}|${list.map((m) => m.name).sort().join('+')}`
      let geo = mergedCache.get(key)
      if (!geo) {
        const g = mergeGeometries(list.map((m) => m.geometry))
        if (!g) continue
        geo = g
        mergedCache.set(key, geo)
      }
      const mm = new THREE.SkinnedMesh(geo, mat)
      mm.name = list.map((m) => m.name).join('+')
      mm.position.copy(ref.position); mm.quaternion.copy(ref.quaternion); mm.scale.copy(ref.scale)
      mm.bind(ref.skeleton, ref.bindMatrix)
      mm.castShadow = list.some((m) => m.castShadow)
      mm.receiveShadow = true
      mm.frustumCulled = false
      ref.parent!.add(mm)
      for (const m of list) m.removeFromParent()
      this.meshes = this.meshes.filter((m) => !list.includes(m as THREE.SkinnedMesh))
      this.meshes.push(mm)
    }
  }

  snapFacing(facing: number) { this.facingY = Math.atan2(Math.cos(facing), Math.sin(facing)); this.root.rotation.y = this.facingY }

  setVisible(v: boolean) { this.visible = v; this.root.visible = v }

  private morph(name: string, v: number) {
    for (const m of this.morphs) {
      const i = m.dict[name]
      if (i !== undefined && m.mesh.morphTargetInfluences) m.mesh.morphTargetInfluences[i] = v
    }
  }

  update(a: AnimInput, dt: number) {
    if (!this.ready) { this.pending = a; return }
    this.time += dt
    // the body turns towards where it faces
    const targetY = Math.atan2(Math.cos(a.facing), Math.sin(a.facing))
    let dy = targetY - this.root.rotation.y
    while (dy > Math.PI) dy -= Math.PI * 2
    while (dy < -Math.PI) dy += Math.PI * 2
    this.root.rotation.y += dy * (1 - Math.exp(-12 * dt))
    this.motion?.update(a, dt, this.root.rotation.y)
    if (this.cane) {
      // from a point on the ground a little ahead of and outside the hand, up to the palm
      const c = this.cane
      // the top of the stick sits in the closed fist, between the wrist and the knuckles
      c.hand.updateWorldMatrix(true, true)
      const hand = this.root.worldToLocal(c.hand.getWorldPosition(this.tmpV))
      if (c.knuckle) hand.lerp(this.root.worldToLocal(c.knuckle.getWorldPosition(this.tmpK)), 0.55)
      this.tmpG.set(hand.x - 0.05 * (this.root.scale.x || 1), 0, hand.z + 0.07)
      const d = this.tmpV.sub(this.tmpG)
      const len = Math.max(0.2, d.length() + 0.02)
      c.mesh.position.copy(this.tmpG)
      c.mesh.quaternion.setFromUnitVectors(UP, d.normalize())
      c.mesh.scale.set(1, len, 1)
    }
    // a face that lives: blinks, talks, smiles, frowns
    this.blinkT -= dt
    if (this.blinkT <= 0) { this.blink = 0.16; this.blinkT = 2 + Math.random() * 4 }
    this.blink = Math.max(0, this.blink - dt)
    this.morph('blink', this.blink > 0 ? Math.sin((this.blink / 0.16) * Math.PI) : 0)
    const talking = a.anim === 'talk' || a.anim === 'mic'
    this.talk += ((talking ? 1 : 0) - this.talk) * (1 - Math.exp(-10 * dt))
    const flap = this.talk * (0.35 + 0.35 * Math.sin(this.time * 17) * Math.sin(this.time * 6.3))
    this.morph('open', Math.max(0, flap + (a.anim === 'celebrate' ? 0.6 : 0)))
    const happy = a.mood === 'happy' || a.anim === 'celebrate' || a.anim === 'dance'
    const sad = a.mood === 'sad' || a.anim === 'dejected' || a.anim === 'cry'
    this.morph('smile', happy ? 0.8 : 0.08)
    this.morph('sad', sad ? 0.85 : 0)
    this.morph('frown', a.mood === 'focused' ? 0.45 : 0)
  }

  dispose() {
    this.cane?.mesh.geometry.dispose()
    for (const m of this.mats) m.dispose()
    this.motion?.dispose()
    this.root.removeFromParent()
  }
}
