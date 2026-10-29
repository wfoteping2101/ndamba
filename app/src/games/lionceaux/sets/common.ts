// Shared tools for the places of Lionceaux: a builder that merges a set's static pieces into a few
// draw calls (one per material, colours carried by the vertices), painted canvas textures (red
// earth, plaster, corrugated tin, chain-link), the sky dome, the light of each moment of the day,
// and the air (dust, rain, fog drift). Everything is generated in the browser; nothing is downloaded.
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { Frame, Stage } from '../../engine/render/stage'
import type { V2 } from '../../engine/sim/math'

export function seeded(seed: number) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

/* ------------------------------------------------------------------ textures */

export function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, opts: { repeat?: [number, number]; srgb?: boolean } = {}) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  draw(c.getContext('2d')!, w, h)
  const t = new THREE.CanvasTexture(c)
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...opts.repeat) }
  t.anisotropy = 4
  return t
}

/** Speckles and soft blotches over a base colour (plaster, earth, cloth). */
export function grain(g: CanvasRenderingContext2D, w: number, h: number, rnd: () => number, n: number, colors: string[], size: [number, number]) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = colors[Math.floor(rnd() * colors.length)]
    const s = size[0] + rnd() * (size[1] - size[0])
    g.globalAlpha = 0.15 + rnd() * 0.35
    g.beginPath(); g.ellipse(rnd() * w, rnd() * h, s, s * (0.5 + rnd() * 0.8), rnd() * 3, 0, Math.PI * 2); g.fill()
  }
  g.globalAlpha = 1
}

/** Lime-washed plaster, white so vertex colours tint it: mottling, rain streaks from the roof, patches
 * where the render has fallen off and the cement blocks show, red dust splashed at the foot. */
export function plasterTexture() {
  return canvasTexture(512, 512, (g, w, h) => {
    const r = seeded(31)
    g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, w, h)
    grain(g, w, h, r, 2600, ['#dcd5c7', '#ffffff', '#d2c9b8', '#e8e2d6'], [1, 9])
    // rain streaks under the eaves
    for (let i = 0; i < 26; i++) {
      const x = r() * w, len = 60 + r() * 260
      const grd = g.createLinearGradient(0, 0, 0, len)
      grd.addColorStop(0, 'rgba(95,80,62,0.32)'); grd.addColorStop(1, 'rgba(95,80,62,0)')
      g.fillStyle = grd; g.fillRect(x, 0, 4 + r() * 22, len)
    }
    // patches of bare blockwork
    for (let i = 0; i < 4; i++) {
      const x = r() * w * 0.85, y = h * (0.2 + r() * 0.55), pw = 30 + r() * 70, ph = 20 + r() * 45
      g.save(); g.beginPath()
      g.moveTo(x, y); for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2; g.lineTo(x + pw / 2 + Math.cos(a) * pw / 2 * (0.7 + r() * 0.4), y + ph / 2 + Math.sin(a) * ph / 2 * (0.7 + r() * 0.4)) }
      g.closePath(); g.clip()
      g.fillStyle = '#a7a299'; g.fillRect(x - 5, y - 5, pw + 10, ph + 10)
      g.strokeStyle = 'rgba(70,66,60,0.6)'; g.lineWidth = 1.5
      for (let yy = y - 5; yy < y + ph + 10; yy += 14) { g.beginPath(); g.moveTo(x - 5, yy); g.lineTo(x + pw + 10, yy); g.stroke(); for (let xx = x - 5 + ((yy / 14) % 2) * 18; xx < x + pw + 10; xx += 36) { g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx, yy + 14); g.stroke() } }
      g.restore()
      g.strokeStyle = 'rgba(120,110,95,0.5)'; g.lineWidth = 1
      g.strokeRect(x, y, pw, ph)
    }
    // hairline cracks
    g.strokeStyle = 'rgba(90,80,68,0.4)'; g.lineWidth = 1
    for (let i = 0; i < 8; i++) { let x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 30; y += 8 + r() * 14; g.lineTo(x, y) } g.stroke() }
    // red dust splashed at the foot of the walls
    const foot = g.createLinearGradient(0, h, 0, h * 0.7)
    foot.addColorStop(0, 'rgba(150,64,34,0.55)'); foot.addColorStop(1, 'rgba(150,64,34,0)')
    g.fillStyle = foot; g.fillRect(0, h * 0.7, w, h * 0.3)
  }, { repeat: [1, 1] })
}

/** Corrugated tin: ridges, rust streaks and patches. */
export function tinTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    const r = seeded(77)
    // galvanised grey, the ridges are real geometry now; rust runs along them
    g.fillStyle = '#b4b6b1'; g.fillRect(0, 0, w, h)
    grain(g, w, h, r, 900, ['#9fa19c', '#c8cac5', '#a8a39a'], [1, 6])
    for (let i = 0; i < 26; i++) {
      g.fillStyle = ['rgba(150,72,30,0.55)', 'rgba(120,55,25,0.5)', 'rgba(175,95,45,0.45)'][i % 3]
      const x = r() * w, y = r() * h, rw = 10 + r() * 60, rh = 10 + r() * 90
      g.beginPath(); g.ellipse(x, y, rw, rh, 0, 0, Math.PI * 2); g.fill()
    }
    for (let i = 0; i < 18; i++) { g.fillStyle = 'rgba(110,50,20,0.35)'; g.fillRect(r() * w, 0, 2 + r() * 4, h) }
  }, { repeat: [1, 1] })
}

/** Chain-link mesh (alpha). */
export function meshTexture() {
  const t = canvasTexture(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h)
    g.strokeStyle = 'rgba(160,160,150,0.95)'; g.lineWidth = 2.2
    for (let k = -h; k < w + h; k += 16) {
      g.beginPath(); g.moveTo(k, 0); g.lineTo(k + h, h); g.stroke()
      g.beginPath(); g.moveTo(k, h); g.lineTo(k + h, 0); g.stroke()
    }
  }, { repeat: [1, 1] })
  return t
}

/** Soft round sprite for particles. */
export function dotTexture() {
  return canvasTexture(64, 64, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2)
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.45, 'rgba(255,255,255,0.45)'); grd.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grd; g.fillRect(0, 0, w, h)
  })
}

/* ------------------------------------------------------------------ builder */

type Bucket = { mat: THREE.Material; geos: THREE.BufferGeometry[]; cast: boolean; receive: boolean }

/**
 * Collects a set's static pieces and merges them: one mesh per material, colours in the vertices.
 * Pieces are given in three coordinates (metres); use `at(x, y)` for sim positions.
 */
export class SetBuilder {
  group = new THREE.Group()
  private buckets = new Map<string, Bucket>()
  private mats = new Map<string, THREE.Material>()
  disposables: { dispose(): void }[] = []

  constructor(public frame: Frame, public shadows: boolean) {}

  /** a sim point to three (ground) */
  at(x: number, y: number, z = 0) { return this.frame.vec(x, y, z) }

  material(key: string, make: () => THREE.Material) {
    let m = this.mats.get(key)
    if (!m) { m = make(); this.mats.set(key, m) }
    return m
  }
  /** plain vertex-coloured materials */
  plain(key: 'plain' | 'flat' | 'shiny' = 'plain') {
    return this.material(key, () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: key === 'shiny' ? 0.45 : 0.92, flatShading: key === 'flat', metalness: key === 'shiny' ? 0.15 : 0 }))
  }

  /** Add a geometry with a colour and a transform. The geometry is consumed. */
  add(geo: THREE.BufferGeometry, color: THREE.ColorRepresentation, m: THREE.Matrix4 | null, opts: { mat?: string | THREE.Material; cast?: boolean; receive?: boolean } = {}) {
    const mat = typeof opts.mat === 'object' ? opts.mat : this.plain((opts.mat as 'plain' | 'flat' | 'shiny') ?? 'plain')
    const key = (mat as THREE.Material).uuid + (opts.cast === false ? '-nc' : '') + (opts.receive === false ? '-nr' : '')
    let b = this.buckets.get(key)
    if (!b) { b = { mat, geos: [], cast: opts.cast !== false, receive: opts.receive !== false }; this.buckets.set(key, b) }
    let g = geo.index ? geo.toNonIndexed() : geo
    if (g !== geo) geo.dispose()
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name)
    if (!g.hasAttribute('uv')) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2))
    if (!g.hasAttribute('normal')) g.computeVertexNormals()
    if (m) g.applyMatrix4(m)
    const c = new THREE.Color(color)
    const n = g.attributes.position.count
    const col = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    b.geos.push(g)
    return this
  }

  /** a free object that is not merged (animated, special material) */
  object(o: THREE.Object3D) { this.group.add(o); return o }

  build() {
    for (const b of this.buckets.values()) {
      if (!b.geos.length) continue
      const geo = mergeGeometries(b.geos, false)
      for (const g of b.geos) g.dispose()
      if (!geo) continue
      const mesh = new THREE.Mesh(geo, b.mat)
      // alpha-cut foliage casts the shadow of its leaves, not of its cards
      if (b.mat.userData.depth) mesh.customDepthMaterial = b.mat.userData.depth as THREE.Material
      mesh.castShadow = b.cast && this.shadows
      mesh.receiveShadow = b.receive
      this.group.add(mesh)
    }
    this.buckets.clear()
    return this.group
  }

  dispose() {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh
      m.geometry?.dispose()
      const mat = m.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose()); else mat?.dispose()
    })
    for (const m of this.mats.values()) { for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose(); m.dispose() }
    for (const d of this.disposables) d.dispose()
  }
}

/* ------------------------------------------------------------------ matrices */

export const M = {
  t: (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z),
  /** translate, rotate (euler XYZ), scale */
  trs: (p: THREE.Vector3 | [number, number, number], r: [number, number, number] = [0, 0, 0], s: [number, number, number] | number = 1) => {
    const pos = Array.isArray(p) ? new THREE.Vector3(...p) : p
    const sc = typeof s === 'number' ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s)
    return new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), sc)
  },
}

/** A box between two ground points (walls, fences): length along the segment. */
export function segmentMatrix(a: THREE.Vector3, b: THREE.Vector3, y: number) {
  const mid = a.clone().add(b).multiplyScalar(0.5)
  const ang = Math.atan2(b.z - a.z, b.x - a.x)
  return new THREE.Matrix4().compose(new THREE.Vector3(mid.x, y, mid.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -ang), new THREE.Vector3(1, 1, 1))
}

/* ------------------------------------------------------------------ props shared by places */

/** A tree crown of a few lumps (mango, avocado): a wide dome of flat-shaded leaves, open underneath. */
export function addCrown(b: SetBuilder, at: THREE.Vector3, radius: number, height: number, color: string, rnd: () => number, lumps = 7) {
  for (let i = 0; i < lumps; i++) {
    const a = (i / lumps) * Math.PI * 2 + rnd() * 0.5
    const rr = radius * (0.45 + rnd() * 0.3)
    const lr = radius * (0.38 + rnd() * 0.18)
    const geo = new THREE.IcosahedronGeometry(lr, 1)
    const c = new THREE.Color(color).offsetHSL((rnd() - 0.5) * 0.03, 0, (rnd() - 0.5) * 0.08)
    b.add(geo, c, M.trs([at.x + Math.cos(a) * rr, at.y + height + lr * 0.35 + rnd() * radius * 0.15, at.z + Math.sin(a) * rr], [rnd(), rnd(), rnd()], [1, 0.62 + rnd() * 0.2, 1]), { mat: 'flat' })
  }
  b.add(new THREE.IcosahedronGeometry(radius * 0.62, 1), new THREE.Color(color).offsetHSL(0, 0, 0.05), M.trs([at.x, at.y + height + radius * 0.55, at.z], [0, 0, 0], [1.1, 0.6, 1.1]), { mat: 'flat' })
}

/** A coconut or oil palm: a leaning trunk of rings and a crown of fronds. */
export function addPalm(b: SetBuilder, at: THREE.Vector3, h: number, lean: number, rnd: () => number) {
  const segs = 9
  let p = at.clone()
  const dir = rnd() * Math.PI * 2
  for (let i = 0; i < segs; i++) {
    const u = i / segs
    const next = at.clone().add(new THREE.Vector3(Math.cos(dir) * lean * u * u, h * (i + 1) / segs, Math.sin(dir) * lean * u * u))
    const len = next.distanceTo(p)
    const geo = new THREE.CylinderGeometry(0.16 - u * 0.05, 0.19 - u * 0.05, len, 7)
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), next.clone().sub(p).normalize())
    b.add(geo, i % 2 ? '#7a6248' : '#6b553f', new THREE.Matrix4().compose(p.clone().add(next).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)))
    p = next
  }
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rnd() * 0.3
    const frond = new THREE.ConeGeometry(0.32, 3.2, 4, 1)
    frond.translate(0, 1.6, 0)
    frond.scale(1, 1, 0.12)
    const m = new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a, 1.25 + rnd() * 0.35, 'YXZ')), new THREE.Vector3(1, 1, 1))
    b.add(frond, new THREE.Color('#3f7a33').offsetHSL(0, 0, (rnd() - 0.5) * 0.1), m, { mat: 'flat' })
  }
}

/** A banana plant: a short trunk and broad leaves. */
export function addBanana(b: SetBuilder, at: THREE.Vector3, rnd: () => number) {
  b.add(new THREE.CylinderGeometry(0.1, 0.16, 1.4, 7), '#6f8a3a', M.t(at.x, 0.7, at.z))
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rnd() * 0.4
    const leaf = new THREE.PlaneGeometry(0.55, 1.9, 1, 3)
    leaf.translate(0, 0.95, 0)
    const m = new THREE.Matrix4().compose(new THREE.Vector3(at.x, 1.35, at.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a, 0.9 + rnd() * 0.4, 'YXZ')), new THREE.Vector3(1, 1, 1))
    b.add(leaf, new THREE.Color('#4c8c34').offsetHSL(0, 0, (rnd() - 0.5) * 0.12), m, { mat: b.material('leaf2', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide })) })
  }
}

/** A one-storey house: plaster walls, a door and shuttered windows, a mono-pitch tin roof. */
export function addHouse(b: SetBuilder, at: THREE.Vector3, w: number, d: number, h: number, rotY: number, wall: string, rnd: () => number, mats: { plaster: THREE.Material; tin: THREE.Material }) {
  const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY)
  const place = (lx: number, ly: number, lz: number) => new THREE.Vector3(lx, ly, lz).applyQuaternion(rot).add(at)
  const box = (sx: number, sy: number, sz: number, lx: number, ly: number, lz: number, color: string, mat?: THREE.Material | 'plain' | 'flat') =>
    b.add(new THREE.BoxGeometry(sx, sy, sz), color, new THREE.Matrix4().compose(place(lx, ly, lz), rot, new THREE.Vector3(1, 1, 1)), { mat })
  box(w, h, d, 0, h / 2, 0, wall, mats.plaster)
  // a plinth darker with red dust
  box(w + 0.04, 0.35, d + 0.04, 0, 0.175, 0, new THREE.Color(wall).multiplyScalar(0.72).getStyle(), mats.plaster)
  // door and windows on the front (+z local)
  const doorX = (rnd() - 0.5) * w * 0.4
  box(0.9, 2.0, 0.06, doorX, 1.0, d / 2 + 0.02, ['#2f4f6b', '#6b3a2a', '#3b5a3a', '#7a5a2a'][Math.floor(rnd() * 4)])
  for (const sx of [-1, 1]) {
    const wx = doorX + sx * (1.3 + rnd() * 0.6)
    if (Math.abs(wx) > w / 2 - 0.6) continue
    box(0.85, 0.85, 0.06, wx, 1.55, d / 2 + 0.02, '#2a2a28')
    // burglar bars across the opening
    for (let k = -2; k <= 2; k++) box(0.025, 0.85, 0.025, wx + k * 0.17, 1.55, d / 2 + 0.08, '#3a3a38')
    box(0.95, 0.08, 0.1, wx, 1.1, d / 2 + 0.06, new THREE.Color(wall).multiplyScalar(0.85).getStyle(), mats.plaster)
    box(0.42, 0.85, 0.07, wx - 0.22, 1.55, d / 2 + 0.05, ['#3f6e8c', '#8c5a3f', '#5a7a3f'][Math.floor(rnd() * 3)])
  }
  // mono-pitch roof of corrugated sheets with an overhang (real ridges that catch the light)
  const roof = corrugated(w + 0.7, d + 0.9)
  const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.12)
  b.add(roof, ['#c9c6bd', '#b8aa9a', '#d2c8b8'][Math.floor(rnd() * 3)], new THREE.Matrix4().compose(place(0, h + 0.18, 0.1), rot.clone().multiply(tilt), new THREE.Vector3(1, 1, 1)), { mat: mats.tin })
  // the wooden fascia under the edge, window bars, a meter box
  box(w + 0.7, 0.12, 0.04, 0, h + 0.1, d / 2 + 0.45, '#5a4636')
  if (rnd() < 0.6) box(0.28, 0.36, 0.12, w / 2 - 0.5, 1.7, d / 2 + 0.06, '#d9d6cc')
  // a stone or two holding the sheets down
  for (let i = 0; i < 2; i++) b.add(new THREE.DodecahedronGeometry(0.16, 0), '#8a8379', new THREE.Matrix4().compose(place((rnd() - 0.5) * w * 0.7, h + 0.3, (rnd() - 0.5) * d * 0.5), rot, new THREE.Vector3(1, 0.7, 1)), { mat: 'flat' })
}

/** A corrugated sheet (w along the ridges' row, d along the ridges), centred, lying flat. */
export function corrugated(w: number, d: number) {
  const ridges = Math.max(4, Math.round(w / 0.076))
  const geo = new THREE.PlaneGeometry(w, d, ridges * 4, 1)
  geo.rotateX(-Math.PI / 2)
  const p = geo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) p.setY(i, Math.sin((p.getX(i) / w + 0.5) * ridges * Math.PI * 2) * 0.012)
  geo.computeVertexNormals()
  // the underside too
  const back = geo.clone()
  const idx = back.index!.array as Uint16Array | Uint32Array
  for (let i = 0; i < idx.length; i += 3) { const t = idx[i]; idx[i] = idx[i + 2]; idx[i + 2] = t }
  back.translate(0, -0.004, 0)
  back.computeVertexNormals()
  const merged = mergeGeometries([geo.toNonIndexed(), back.toNonIndexed()], false)!
  geo.dispose(); back.dispose()
  return merged
}

/* ------------------------------------------------------------------ sky and light */

export type Mood = 'morning' | 'noon' | 'golden' | 'evening' | 'night' | 'rain' | 'overcast' | 'fog' | 'whiteout' | 'interior' | 'interiorNight'

interface Light { top: string; horizon: string; fog: string; fogNear: number; fogFar: number; hemiSky: string; hemiGround: string; hemi: number; sun: string; sunI: number; sunPos: [number, number, number]; exposure: number }
const LIGHTS: Record<Mood, Light> = {
  // Douala's white late-morning light, red dust in the air
  morning: { top: '#8fb6d6', horizon: '#f1e3cf', fog: '#e9d8c2', fogNear: 60, fogFar: 260, hemiSky: '#fff4e2', hemiGround: '#8a4a2a', hemi: 1.25, sun: '#fff3dc', sunI: 2.7, sunPos: [-30, 60, 22], exposure: 1.02 },
  noon: { top: '#7eaedb', horizon: '#e9eef0', fog: '#e6e9e6', fogNear: 80, fogFar: 320, hemiSky: '#ffffff', hemiGround: '#7a4a30', hemi: 1.2, sun: '#ffffff', sunI: 2.9, sunPos: [-10, 80, 10], exposure: 1 },
  golden: { top: '#6f8fb8', horizon: '#f6c27a', fog: '#efc08a', fogNear: 50, fogFar: 240, hemiSky: '#ffe2b8', hemiGround: '#7a3a22', hemi: 1.05, sun: '#ffb85c', sunI: 2.9, sunPos: [-60, 22, 30], exposure: 1.05 },
  evening: { top: '#3a4f7a', horizon: '#e98c5a', fog: '#c27a5c', fogNear: 30, fogFar: 180, hemiSky: '#ffc49a', hemiGround: '#4a2a22', hemi: 0.85, sun: '#ff8a4a', sunI: 1.9, sunPos: [-70, 12, 20], exposure: 1.05 },
  night: { top: '#0b1224', horizon: '#26324f', fog: '#151d33', fogNear: 18, fogFar: 120, hemiSky: '#6f86b8', hemiGround: '#1a1414', hemi: 0.5, sun: '#9fb4e6', sunI: 0.45, sunPos: [20, 50, -30], exposure: 1.15 },
  rain: { top: '#6f7a82', horizon: '#a9b0b2', fog: '#9aa3a6', fogNear: 15, fogFar: 120, hemiSky: '#d6dde0', hemiGround: '#3a2a22', hemi: 1.15, sun: '#dfe6ea', sunI: 0.9, sunPos: [-20, 70, 10], exposure: 1.0 },
  overcast: { top: '#8a959c', horizon: '#c9cbc6', fog: '#bfc2bd', fogNear: 40, fogFar: 220, hemiSky: '#eef0ec', hemiGround: '#5a3a2a', hemi: 1.3, sun: '#f2f2ee', sunI: 1.3, sunPos: [-20, 70, 20], exposure: 1.0 },
  // « Du blanc partout » : the fog of Bafoussam swallows everything a few metres away
  whiteout: { top: '#eceee9', horizon: '#eceee9', fog: '#eceee9', fogNear: 0.5, fogFar: 9, hemiSky: '#ffffff', hemiGround: '#8a8a80', hemi: 1.5, sun: '#ffffff', sunI: 0.5, sunPos: [-20, 60, 20], exposure: 1.02 },
  fog: { top: '#c9cfcc', horizon: '#e4e6e1', fog: '#dfe2dd', fogNear: 4, fogFar: 46, hemiSky: '#f4f6f2', hemiGround: '#5a4a3a', hemi: 1.35, sun: '#f7f4ea', sunI: 1.0, sunPos: [-20, 60, 20], exposure: 1.02 },
  interior: { top: '#d9c9ae', horizon: '#d9c9ae', fog: '#3a2a22', fogNear: 60, fogFar: 200, hemiSky: '#fff1dc', hemiGround: '#6a4a3a', hemi: 1.4, sun: '#ffe8c8', sunI: 1.4, sunPos: [-8, 14, 10], exposure: 1.0 },
  interiorNight: { top: '#1a1410', horizon: '#1a1410', fog: '#1a1410', fogNear: 60, fogFar: 200, hemiSky: '#ffd9a8', hemiGround: '#3a2620', hemi: 1.05, sun: '#ffd29a', sunI: 1.25, sunPos: [2, 10, 4], exposure: 1.05 },
}

export function skyDome(mood: Mood) {
  const L = LIGHTS[mood]
  const cloudy = mood === 'overcast' || mood === 'rain'
  const clear = mood === 'night' || mood === 'interior' || mood === 'interiorNight' || mood === 'whiteout' || mood === 'fog'
  const tex = canvasTexture(1024, 512, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h)
    grd.addColorStop(0, L.top); grd.addColorStop(0.62, L.horizon); grd.addColorStop(1, L.horizon)
    g.fillStyle = grd; g.fillRect(0, 0, w, h)
    if (clear) return
    // clouds: soft cumulus and drifts of haze in the upper half (the dome's u wraps around)
    const r = seeded(mood.length * 97 + 5)
    const tint = mood === 'golden' || mood === 'evening' ? 'rgba(255,214,170,' : 'rgba(255,255,255,'
    const shade = mood === 'golden' || mood === 'evening' ? 'rgba(170,110,90,' : 'rgba(150,160,170,'
    const n = cloudy ? 260 : 120
    for (let i = 0; i < n; i++) {
      const cx = r() * w, cy = h * (0.12 + r() * 0.42)
      const k = 1 - Math.abs(cy / h - 0.36) * 1.6
      const rx = (30 + r() * 90) * (cloudy ? 1.6 : 1), ry = rx * (0.28 + r() * 0.2)
      for (const [dx, a, col] of [[0, 0.22 * k, tint], [ry * 0.35, 0.12 * k, shade]] as [number, number, string][]) {
        const rg = g.createRadialGradient(cx, cy + dx, 0, cx, cy + dx, rx)
        rg.addColorStop(0, col + a + ')'); rg.addColorStop(1, col + '0)')
        g.fillStyle = rg
        g.beginPath(); g.ellipse(cx, cy + dx, rx, ry, 0, 0, Math.PI * 2); g.fill()
      }
    }
  })
  tex.wrapS = THREE.RepeatWrapping
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(420, 48, 24), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }))
  mesh.renderOrder = -10
  return mesh
}

/** Set the stage's light, fog and sky for a moment of the day. */
export function applyMood(stage: Stage, mood: Mood, center = new THREE.Vector3()) {
  const L = LIGHTS[mood]
  stage.scene.background = new THREE.Color(L.horizon)
  stage.scene.fog = new THREE.Fog(L.fog, L.fogNear, L.fogFar)
  stage.hemi.color.set(L.hemiSky); stage.hemi.groundColor.set(L.hemiGround); stage.hemi.intensity = L.hemi
  stage.sun.color.set(L.sun); stage.sun.intensity = L.sunI
  stage.sun.position.set(center.x + L.sunPos[0], L.sunPos[1], center.z + L.sunPos[2])
  stage.sun.target.position.copy(center)
  stage.renderer.toneMappingExposure = L.exposure
  // image-based light from the same sky: skin, cloth and metal pick up its colours
  const indoor = mood === 'interior' || mood === 'interiorNight'
  const sunDir = new THREE.Vector3(L.sunPos[0], L.sunPos[1], L.sunPos[2]).normalize()
  stage.setSkyLight(indoor ? L.hemiSky : L.top, indoor ? L.hemiSky : L.horizon, L.hemiGround, sunDir, L.sun,
    mood === 'night' ? 0.35 : mood === 'interiorNight' ? 0.45 : mood === 'whiteout' ? 0.9 : 0.7)
  // the hemisphere light now only fills: the sky light does the rest
  stage.hemi.intensity = L.hemi * 0.55
  const warm: Partial<Record<Mood, string>> = { golden: '#fff1dc', evening: '#ffe6d2', morning: '#fffaf0', night: '#e6ecff', rain: '#f2f6f8' }
  stage.setGrade(warm[mood] ?? '#ffffff')
}

/* ------------------------------------------------------------------ air */

export interface Air { object: THREE.Object3D; update(dt: number, cam: THREE.Camera): void; dispose(): void }

/** Red dust hanging in the light, drifting slowly around a centre. */
export function dust(center: THREE.Vector3, radius: number, count: number, color = '#d9824e'): Air {
  const rnd = seeded(91)
  const pos = new Float32Array(count * 3)
  const seeds = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    pos[i * 3] = center.x + (rnd() - 0.5) * radius * 2
    pos[i * 3 + 1] = 0.2 + rnd() * 3.2
    pos[i * 3 + 2] = center.z + (rnd() - 0.5) * radius * 2
    seeds[i] = rnd() * 100
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const tex = dotTexture()
  const mat = new THREE.PointsMaterial({ color, size: 0.09, map: tex, transparent: true, opacity: 0.55, depthWrite: false, sizeAttenuation: true })
  const pts = new THREE.Points(geo, mat)
  let t = 0
  return {
    object: pts,
    update(dt) {
      t += dt
      const a = geo.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < count; i++) {
        const s = seeds[i]
        a.array[i * 3] += Math.sin(t * 0.3 + s) * dt * 0.12
        a.array[i * 3 + 1] += Math.sin(t * 0.5 + s * 2) * dt * 0.05
        a.array[i * 3 + 2] += Math.cos(t * 0.27 + s) * dt * 0.12
      }
      a.needsUpdate = true
    },
    dispose() { geo.dispose(); mat.dispose(); tex.dispose() },
  }
}

/** Rain: streaks falling around the camera. */
export function rain(count = 1400): Air {
  const rnd = seeded(5)
  const pos = new Float32Array(count * 6)
  const R = 26
  const geo = new THREE.BufferGeometry()
  const off = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) { off[i * 3] = (rnd() - 0.5) * R * 2; off[i * 3 + 1] = rnd() * 18; off[i * 3 + 2] = (rnd() - 0.5) * R * 2 }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const mat = new THREE.LineBasicMaterial({ color: '#cfd8de', transparent: true, opacity: 0.45, depthWrite: false })
  const lines = new THREE.LineSegments(geo, mat)
  lines.frustumCulled = false
  return {
    object: lines,
    update(dt, cam) {
      const c = cam.position
      for (let i = 0; i < count; i++) {
        off[i * 3 + 1] -= dt * 16
        if (off[i * 3 + 1] < 0) off[i * 3 + 1] += 18
        const x = c.x + off[i * 3], y = off[i * 3 + 1], z = c.z + off[i * 3 + 2]
        pos[i * 6] = x; pos[i * 6 + 1] = y; pos[i * 6 + 2] = z
        pos[i * 6 + 3] = x + 0.04; pos[i * 6 + 4] = y + 0.45; pos[i * 6 + 5] = z
      }
      ;(geo.attributes.position as THREE.BufferAttribute).needsUpdate = true
    },
    dispose() { geo.dispose(); mat.dispose() },
  }
}

/** Banks of fog drifting low over the ground (Bafoussam). */
export function fogBanks(center: THREE.Vector3, radius: number, count = 40): Air {
  const rnd = seeded(17)
  const tex = dotTexture()
  const group = new THREE.Group()
  const mats: THREE.SpriteMaterial[] = []
  for (let i = 0; i < count; i++) {
    const m = new THREE.SpriteMaterial({ map: tex, color: '#f4f6f2', transparent: true, opacity: 0.18 + rnd() * 0.18, depthWrite: false })
    mats.push(m)
    const s = new THREE.Sprite(m)
    const sc = 6 + rnd() * 10
    s.scale.set(sc * 1.8, sc, 1)
    s.position.set(center.x + (rnd() - 0.5) * radius * 2, 0.8 + rnd() * 3, center.z + (rnd() - 0.5) * radius * 2)
    s.userData.v = 0.2 + rnd() * 0.4
    group.add(s)
  }
  return {
    object: group,
    update(dt) { for (const s of group.children) { s.position.x += s.userData.v * dt; if (s.position.x > center.x + radius) s.position.x -= radius * 2 } },
    dispose() { for (const m of mats) m.dispose(); tex.dispose() },
  }
}

/** A point where actors stand or the camera looks, in sim coordinates. */
export type Marks = Record<string, V2>
