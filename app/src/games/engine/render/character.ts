// Procedural footballer: a skinned mesh built in code (one draw call, plus an optional outline),
// coloured per vertex from a Look (skin, hair, kit, mismatched socks...). Adult and child proportions.
// Animation is procedural and blended: gait from speed (walk, run, sprint), lean, banking, kicks,
// first touches, tackles, keeper dives and catches, celebrations, dejection.
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { AnimState, Look } from '../sim/types'

const BONES = ['root', 'hips', 'spine', 'chest', 'neck', 'head', 'shL', 'armL', 'foreL', 'handL', 'shR', 'armR', 'foreR', 'handR', 'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR'] as const
type BoneName = (typeof BONES)[number]

interface Proportions { hipY: number; spine: number; chest: number; neck: number; headR: number; shoulderW: number; upperArm: number; foreArm: number; thigh: number; shin: number; hipW: number; girth: number }
const ADULT: Proportions = { hipY: 0.98, spine: 0.14, chest: 0.27, neck: 0.09, headR: 0.108, shoulderW: 0.19, upperArm: 0.29, foreArm: 0.26, thigh: 0.47, shin: 0.45, hipW: 0.095, girth: 1 }
const CHILD: Proportions = { hipY: 0.72, spine: 0.11, chest: 0.21, neck: 0.06, headR: 0.118, shoulderW: 0.152, upperArm: 0.22, foreArm: 0.2, thigh: 0.34, shin: 0.33, hipW: 0.08, girth: 0.82 }

let toonGradient: THREE.DataTexture | null = null
function gradient() {
  if (toonGradient) return toonGradient
  const data = new Uint8Array([90, 90, 90, 255, 168, 168, 168, 255, 236, 236, 236, 255, 255, 255, 255, 255])
  toonGradient = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat)
  toonGradient.minFilter = THREE.NearestFilter
  toonGradient.magFilter = THREE.NearestFilter
  toonGradient.needsUpdate = true
  return toonGradient
}

function outlineMaterial(width: number) {
  const m = new THREE.MeshBasicMaterial({ color: '#1c140f', side: THREE.BackSide })
  m.onBeforeCompile = (sh) => {
    sh.uniforms.outlineWidth = { value: width }
    sh.vertexShader = 'uniform float outlineWidth;\n' + sh.vertexShader.replace('#include <skinning_vertex>', '#include <skinning_vertex>\n transformed += normalize(objectNormal) * outlineWidth;')
  }
  return m
}

/** Build a part in bone-local space, paint it, bind it rigidly to one bone, move it to bind pose. */
function part(geo: THREE.BufferGeometry, color: string | THREE.Color, boneIndex: number, local: THREE.Matrix4, boneWorld: THREE.Matrix4) {
  const g = geo.index ? geo : geo
  g.applyMatrix4(local)
  g.applyMatrix4(boneWorld)
  if (g.attributes.uv) g.deleteAttribute('uv')
  const n = g.attributes.position.count
  const c = new THREE.Color(color)
  const col = new Float32Array(n * 3), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4)
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; si[i * 4] = boneIndex; sw[i * 4] = 1 }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4))
  g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4))
  return g
}
const T = (x = 0, y = 0, z = 0) => new THREE.Matrix4().makeTranslation(x, y, z)
const TS = (x: number, y: number, z: number, sx: number, sy: number, sz: number) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz))
const TR = (x: number, y: number, z: number, rx: number, ry: number, rz: number) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1))

/** A shirt number as a texture (front and back of the jersey). */
function numberTexture(text: string, color: string) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const x = c.getContext('2d')!
  x.fillStyle = color
  x.font = '700 104px "Archivo Variable", Archivo, system-ui, sans-serif'
  x.textAlign = 'center'; x.textBaseline = 'middle'
  x.fillText(text, 64, 70)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Marks drawn on a shirt: the shark fin of the Requins (« dessiné au feutre »), the spots of the Panthères. */
function markTexture(kind: 'fin' | 'spots', color: string) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const x = c.getContext('2d')!
  x.fillStyle = color; x.strokeStyle = color
  if (kind === 'fin') {
    // a felt-pen fin above a wave
    x.lineWidth = 7; x.lineJoin = 'round'
    x.beginPath(); x.moveTo(28, 88); x.quadraticCurveTo(58, 70, 66, 24); x.quadraticCurveTo(80, 62, 100, 88); x.closePath(); x.stroke()
    x.lineWidth = 5; x.beginPath(); x.moveTo(14, 104); x.quadraticCurveTo(34, 92, 54, 104); x.quadraticCurveTo(74, 116, 94, 104); x.quadraticCurveTo(108, 96, 118, 102); x.stroke()
  } else {
    let s = 7
    const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
    for (let i = 0; i < 26; i++) { x.beginPath(); x.ellipse(r() * 128, r() * 128, 5 + r() * 6, 4 + r() * 5, r() * 3, 0, Math.PI * 2); x.fill() }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Printed fabric (wax prints): circles and arcs, big leaves, or rings, in two colours on a base. */
const patternCache = new Map<string, THREE.CanvasTexture>()
function patternTexture(base: string, p?: { a: string; b: string; kind: 'wax' | 'leaves' | 'circles' }) {
  const key = `${base}|${p?.a}|${p?.b}|${p?.kind}`
  const hit = patternCache.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const x = c.getContext('2d')!
  x.fillStyle = base; x.fillRect(0, 0, 256, 256)
  if (p) {
    let seed = 7
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    for (let i = 0; i < 14; i++) {
      const cx = rnd() * 256, cy = rnd() * 256, r = 18 + rnd() * 26
      if (p.kind === 'leaves') {
        x.fillStyle = i % 2 ? p.a : p.b
        x.save(); x.translate(cx, cy); x.rotate(rnd() * Math.PI)
        x.beginPath(); x.ellipse(0, 0, r * 1.5, r * 0.6, 0, 0, Math.PI * 2); x.fill()
        x.strokeStyle = base; x.lineWidth = 3; x.beginPath(); x.moveTo(-r * 1.4, 0); x.lineTo(r * 1.4, 0); x.stroke()
        x.restore()
      } else {
        for (let k = 3; k >= 1; k--) { x.fillStyle = k % 2 ? p.a : p.b; x.beginPath(); x.arc(cx, cy, (r * k) / 3, 0, Math.PI * 2); x.fill() }
        if (p.kind === 'wax') { x.strokeStyle = p.b; x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, r * 1.35, 0, Math.PI); x.stroke() }
      }
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(2, 1)
  patternCache.set(key, t)
  return t
}

export interface AnimInput {
  /** world-space speed m/s and velocity direction (sim plane) */
  speed: number
  velAngle: number
  facing: number
  maxSpeed: number
  anim: AnimState
  animT: number
  kickFoot: 'L' | 'R'
  /** angle to look at (sim plane) or null */
  lookAngle: number | null
  /** extra mood for story scenes */
  mood?: 'neutral' | 'happy' | 'sad' | 'focused'
  gk?: boolean
}

export class Character {
  root = new THREE.Group()
  mesh: THREE.SkinnedMesh
  outline: THREE.SkinnedMesh | null = null
  bones = {} as Record<BoneName, THREE.Bone>
  private rest = {} as Record<BoneName, THREE.Vector3>
  private prop: Proportions
  private phase = 0
  private time = Math.random() * 10
  private lastFacing = 0
  private bank = 0
  private diveSide = 1
  height: number

  constructor(public look: Look, opts: { toon?: boolean; outline?: boolean; castShadow?: boolean } = {}) {
    const base = look.kid ? CHILD : ADULT
    const b = look.build ?? 1
    const hs = look.height ?? 1
    this.prop = {
      ...base, girth: base.girth * b,
      hipY: base.hipY * hs, spine: base.spine * hs, chest: base.chest * hs, upperArm: base.upperArm * hs, foreArm: base.foreArm * hs, thigh: base.thigh * hs, shin: base.shin * hs,
      shoulderW: base.shoulderW * (look.woman ? 0.88 : 1), hipW: base.hipW * (look.woman ? 1.12 : 1),
    }
    const P = this.prop
    this.height = P.hipY + P.spine + P.chest + P.neck + P.headR * 2.1
    // skeleton in bind pose (A-pose, facing +Z, left side on +X)
    const pos: Record<BoneName, [number, number, number]> = {
      root: [0, 0, 0], hips: [0, P.hipY, 0], spine: [0, 0.04, 0], chest: [0, P.spine, 0], neck: [0, P.chest, 0], head: [0, P.neck, 0],
      shL: [P.shoulderW * 0.45, P.chest * 0.88, 0], armL: [P.shoulderW * 0.55, 0, 0], foreL: [0, -P.upperArm, 0], handL: [0, -P.foreArm, 0],
      shR: [-P.shoulderW * 0.45, P.chest * 0.88, 0], armR: [-P.shoulderW * 0.55, 0, 0], foreR: [0, -P.upperArm, 0], handR: [0, -P.foreArm, 0],
      thighL: [P.hipW, -0.04, 0], shinL: [0, -P.thigh, 0], footL: [0, -P.shin, 0],
      thighR: [-P.hipW, -0.04, 0], shinR: [0, -P.thigh, 0], footR: [0, -P.shin, 0],
    }
    const parent: Partial<Record<BoneName, BoneName>> = {
      hips: 'root', spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck', shL: 'chest', armL: 'shL', foreL: 'armL', handL: 'foreL',
      shR: 'chest', armR: 'shR', foreR: 'armR', handR: 'foreR', thighL: 'hips', shinL: 'thighL', footL: 'shinL', thighR: 'hips', shinR: 'thighR', footR: 'shinR',
    }
    const list: THREE.Bone[] = []
    for (const name of BONES) {
      const bone = new THREE.Bone()
      bone.name = name
      bone.position.set(...pos[name])
      this.bones[name] = bone
      this.rest[name] = bone.position.clone()
      list.push(bone)
      const par = parent[name]
      if (par) this.bones[par].add(bone)
    }
    // slight A-pose for the arms
    this.bones.armL.rotation.z = 0.12
    this.bones.armR.rotation.z = -0.12
    this.bones.root.updateMatrixWorld(true)
    const W = (n: BoneName) => this.bones[n].matrixWorld.clone()
    const idx = (n: BoneName) => BONES.indexOf(n)
    const g = P.girth
    const parts: THREE.BufferGeometry[] = []
    const add = (geo: THREE.BufferGeometry, color: string, bone: BoneName, local: THREE.Matrix4) => parts.push(part(geo, color, idx(bone), local, W(bone)))
    const skin = look.skin
    // pelvis and shorts
    add(new THREE.CylinderGeometry(0.135 * g, 0.15 * g, 0.2, 14), look.shorts, 'hips', TS(0, -0.03, 0, 1, 1, 0.78))
    // waist and chest (shirt), shoulders, collar
    add(new THREE.CylinderGeometry(0.138 * g, 0.13 * g, P.spine + 0.04, 14), look.shirt, 'spine', TS(0, P.spine / 2, 0, 1, 1, 0.76))
    add(new THREE.CylinderGeometry(0.175 * g, 0.14 * g, P.chest, 16), look.shirt, 'chest', TS(0, P.chest / 2, 0, 1, 1, 0.68))
    for (const s of [1, -1]) add(new THREE.SphereGeometry(0.068 * g, 12, 10), look.shirt, 'chest', T(s * P.shoulderW * 0.82, P.chest * 0.86, 0))
    if (look.collar) {
      // a jersey or polo collar: a folded band around the neck, opening at the front
      add(new THREE.TorusGeometry(0.07 * g, 0.022, 6, 18, Math.PI * 1.6), look.collar, 'chest', TR(0, P.chest * 0.97, -0.004, Math.PI / 2, 0, Math.PI * 0.7))
      for (const s2 of [1, -1]) add(new THREE.BoxGeometry(0.05, 0.012, 0.045), look.collar, 'chest', TR(s2 * 0.028, P.chest * 0.93, 0.07 * g, 0.5, 0, s2 * 0.5))
    } else add(new THREE.TorusGeometry(0.062, 0.016, 6, 16), look.shirtTrim, 'chest', TR(0, P.chest * 0.98, 0, Math.PI / 2, 0, 0))
    if (look.stripe) {
      // a vertical band on the chest; the wearer's left is +X in the bind pose
      const sx = (look.stripe.side === 'L' ? 1 : -1) * 0.055 * g
      add(new THREE.BoxGeometry(0.038 * g, P.chest * 0.98 + P.spine * 0.8, 0.012), look.stripe.color, 'spine', T(sx, (P.chest + P.spine) * 0.5, 0.118 * g))
    }
    if (look.jacket) {
      // an open tracksuit top: the T-shirt shows down the front
      add(new THREE.BoxGeometry(0.07 * g, P.chest * 0.85 + P.spine * 0.6, 0.012), look.jacket, 'spine', T(0, (P.chest + P.spine) * 0.5, 0.12 * g))
    }
    // a bib (chasuble) over the shirt
    if (look.prop === 'bib' && look.bib) add(new THREE.CylinderGeometry(0.182 * g, 0.15 * g, P.chest * 0.92, 16, 1, true), look.bib, 'chest', TS(0, P.chest * 0.46, 0, 1, 1, 0.72))
    // neck and head
    add(new THREE.CylinderGeometry(0.045, 0.05, P.neck + 0.03, 10), skin, 'neck', T(0, P.neck / 2, 0))
    const hr = P.headR
    add(new THREE.SphereGeometry(hr, 20, 16), skin, 'head', TS(0, hr * 0.95, 0.005, 0.9, 1.04, 0.98))
    // face: eyes, pupils, brows, nose, mouth, ears
    const eyeR = look.kid ? 0.021 : 0.017
    const darker = new THREE.Color(skin).multiplyScalar(0.82).getStyle()
    for (const s of [1, -1]) {
      add(new THREE.SphereGeometry(eyeR, 10, 8), '#f5f1ea', 'head', TS(s * hr * 0.34, hr * 1.02, hr * 0.84, 1, 0.9, 0.55))
      add(new THREE.SphereGeometry(eyeR * 0.62, 8, 6), '#1b120c', 'head', T(s * hr * 0.34, hr * 1.01, hr * 0.84 + eyeR * 0.45))
      add(new THREE.BoxGeometry(hr * 0.36, hr * 0.07, hr * 0.06), look.hairColor, 'head', TR(s * hr * 0.34, hr * 1.22, hr * 0.86, 0, 0, s * -0.12))
      add(new THREE.SphereGeometry(hr * 0.2, 8, 6), skin, 'head', TS(s * hr * 0.95, hr * 0.95, 0, 0.5, 1, 0.8))
    }
    add(new THREE.SphereGeometry(hr * 0.15, 8, 6), darker, 'head', TS(0, hr * 0.88, hr * 0.95, 1.1, 0.9, 0.9))
    add(new THREE.BoxGeometry(hr * 0.42, hr * 0.06, hr * 0.05), '#5a2a22', 'head', T(0, hr * 0.62, hr * 0.9))
    if (look.gap) for (const s2 of [1, -1]) add(new THREE.BoxGeometry(hr * 0.12, hr * 0.09, hr * 0.03), '#f7f3ea', 'head', T(s2 * hr * 0.09, hr * 0.68, hr * 0.92))
    if (look.beard) {
      add(new THREE.SphereGeometry(hr * 0.98, 16, 10, 0, Math.PI * 2, Math.PI * 0.58, Math.PI * 0.32), look.beard, 'head', TS(0, hr * 0.92, 0.012, 0.92, 1.02, 0.99))
      add(new THREE.BoxGeometry(hr * 0.5, hr * 0.08, hr * 0.05), look.beard, 'head', T(0, hr * 0.74, hr * 0.9))
    }
    if (look.glasses) {
      for (const s2 of [1, -1]) add(new THREE.TorusGeometry(hr * 0.2, hr * 0.03, 5, 14), '#2a211b', 'head', T(s2 * hr * 0.34, hr * 1.02, hr * 0.93))
      add(new THREE.BoxGeometry(hr * 0.26, hr * 0.03, hr * 0.03), '#2a211b', 'head', T(0, hr * 1.05, hr * 0.96))
    }
    if (look.earrings) for (const s2 of [1, -1]) add(new THREE.TorusGeometry(hr * 0.13, hr * 0.03, 5, 12), look.earrings, 'head', TR(s2 * hr * 0.98, hr * 0.7, 0, 0, Math.PI / 2, 0))
    // hair
    const hairCap = (scale = 1.05) => new THREE.SphereGeometry(hr * scale, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5)
    const hc = look.hairColor
    if (look.hair !== 'bald') add(hairCap(look.hair === 'crop' || look.hair === 'cornrows' ? 1.035 : 1.06), hc, 'head', TR(0, hr * 1.02, -0.01, -0.18, 0, 0))
    // a small soft round afro, sitting back from the hairline so the face stays readable
    if (look.hair === 'afro') add(new THREE.IcosahedronGeometry(hr * 1.1, 2), hc, 'head', TS(0, hr * 1.45, -hr * 0.28, 1, 0.88, 1))
    if (look.hair === 'puff') add(new THREE.IcosahedronGeometry(hr * 0.62, 1), hc, 'head', T(0, hr * 1.95, -hr * 0.45))
    if (look.hair === 'twists') {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2, el = 0.55 + (i % 3) * 0.18
        const dir = new THREE.Vector3(Math.sin(a) * Math.cos(el), Math.sin(el), Math.cos(a) * Math.cos(el) - 0.15)
        const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), dir, new THREE.Vector3(0, 1, 0))
        m.setPosition(dir.clone().multiplyScalar(hr * 1.0).add(new THREE.Vector3(0, hr * 1.02, -0.01)))
        const twist = new THREE.CylinderGeometry(hr * 0.09, hr * 0.06, hr * 0.62, 5)
        twist.rotateX(Math.PI / 2)
        add(twist, hc, 'head', m)
      }
    }
    if (look.hair === 'cornrows') for (let i = -2; i <= 2; i++) add(new THREE.TorusGeometry(hr * 1.04, hr * 0.045, 4, 20, Math.PI * 0.9), hc, 'head', TR(i * hr * 0.2, hr * 1.02, -0.01, 0, Math.PI / 2, Math.PI * 0.05))
    if (look.hair === 'long') add(new THREE.BoxGeometry(hr * 1.7, hr * 1.5, hr * 0.5), hc, 'head', T(0, hr * 0.5, -hr * 0.7))
    if (look.hair === 'cap') {
      const cc = look.cap ?? look.shirtTrim
      add(new THREE.SphereGeometry(hr * 1.08, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), cc, 'head', TS(0, hr * 1.18, -0.005, 1, 0.82, 1))
      add(new THREE.BoxGeometry(hr * 1.25, hr * 0.06, hr * 0.85), cc, 'head', TR(0, hr * 1.22, hr * 0.98, -0.12, 0, 0))
    }
    // a thin shaved line on one side (BriBri: his left)
    if (look.part) add(new THREE.BoxGeometry(hr * 0.05, hr * 0.06, hr * 0.95), skin, 'head', TR((look.part === 'L' ? 1 : -1) * hr * 0.55, hr * 1.78, -hr * 0.05, 0.1, 0, (look.part === 'L' ? -1 : 1) * 0.55))
    // arms: sleeve, skin, elbow, forearm, hand (gloves for keepers)
    for (const s of ['L', 'R'] as const) {
      const arm = `arm${s}` as BoneName, fore = `fore${s}` as BoneName, hand = `hand${s}` as BoneName
      add(new THREE.CylinderGeometry(0.06 * g, 0.054 * g, P.upperArm * 0.5, 10), look.shirt, arm, T(0, -P.upperArm * 0.22, 0))
      if (look.collar) add(new THREE.CylinderGeometry(0.0565 * g, 0.0565 * g, 0.022, 10), look.collar, arm, T(0, -P.upperArm * 0.46, 0))
      if (look.jacket) {
        // long tracksuit sleeves with a stripe
        add(new THREE.CylinderGeometry(0.052 * g, 0.044 * g, P.upperArm * 0.55, 10), look.shirt, arm, T(0, -P.upperArm * 0.72, 0))
        add(new THREE.CylinderGeometry(0.046 * g, 0.04 * g, P.foreArm * 0.85, 10), look.shirt, fore, T(0, -P.foreArm * 0.42, 0))
        add(new THREE.BoxGeometry(0.012, P.upperArm + P.foreArm * 0.8, 0.012), look.shirtTrim, arm, T(s === 'L' ? 0.055 * g : -0.055 * g, -P.upperArm * 0.7, 0))
      }
      add(new THREE.CylinderGeometry(0.046 * g, 0.041 * g, P.upperArm * 0.6, 10), skin, arm, T(0, -P.upperArm * 0.7, 0))
      add(new THREE.SphereGeometry(0.043 * g, 10, 8), skin, fore, T(0, 0, 0))
      add(new THREE.CylinderGeometry(0.041 * g, 0.032 * g, P.foreArm, 10), skin, fore, T(0, -P.foreArm / 2, 0))
      add(new THREE.SphereGeometry(0.046 * g, 10, 8), look.gloves ?? skin, hand, TS(0, -0.045, 0, 0.75, 1.15, 0.55))
    }
    // legs: shorts, thigh, knee, sock (left and right can differ), boot
    for (const s of ['L', 'R'] as const) {
      const thigh = `thigh${s}` as BoneName, shin = `shin${s}` as BoneName, foot = `foot${s}` as BoneName
      const sock = s === 'L' ? look.sockL : look.sockR
      if (look.trousers) {
        add(new THREE.CylinderGeometry(0.09 * g, 0.072 * g, P.thigh * 1.02, 12), look.trousers, thigh, T(0, -P.thigh * 0.5, 0))
        add(new THREE.SphereGeometry(0.068 * g, 10, 8), look.trousers, shin, T(0, 0.01, 0))
        add(new THREE.CylinderGeometry(0.07 * g, 0.06 * g, P.shin * 0.95, 12), look.trousers, shin, T(0, -P.shin * 0.48, 0))
        if (look.trouserStripe) add(new THREE.BoxGeometry(0.012, P.thigh + P.shin * 0.9, 0.012), look.trouserStripe, thigh, T(s === 'L' ? 0.085 * g : -0.085 * g, -(P.thigh + P.shin) * 0.45, 0))
      } else if (look.dress) {
        // legs under the dress: skin, then the shoes
        add(new THREE.CylinderGeometry(0.06 * g, 0.05 * g, P.shin * 0.95, 10), skin, shin, T(0, -P.shin * 0.48, 0))
      } else {
        add(new THREE.CylinderGeometry(0.088 * g, 0.078 * g, P.thigh * 0.42, 12), look.shorts, thigh, T(0, -P.thigh * 0.18, 0))
        add(new THREE.CylinderGeometry(0.072 * g, 0.056 * g, P.thigh * 0.62, 12), skin, thigh, T(0, -P.thigh * 0.66, 0))
        add(new THREE.SphereGeometry(0.058 * g, 10, 8), skin, shin, T(0, 0.01, 0))
        add(new THREE.CylinderGeometry(0.06 * g, 0.044 * g, P.shin * 0.82, 12), sock, shin, T(0, -P.shin * 0.48, 0))
        add(new THREE.CylinderGeometry(0.061 * g, 0.061 * g, P.shin * 0.08, 12), new THREE.Color(sock).offsetHSL(0, 0, 0.12).getStyle(), shin, T(0, -P.shin * 0.1, 0))
      }
      const shoes = look.shoes ?? 'boots'
      if (shoes === 'sandals') {
        add(new THREE.BoxGeometry(0.085, 0.045, 0.2, 2, 1, 2), skin, foot, T(0, -0.03, 0.05))
        add(new THREE.BoxGeometry(0.095, 0.018, 0.23), look.boots, foot, T(0, -0.06, 0.05))
        add(new THREE.BoxGeometry(0.09, 0.02, 0.025), look.boots, foot, T(0, -0.02, 0.07))
      } else if (shoes === 'trainers') {
        add(new THREE.BoxGeometry(0.1, 0.075, 0.25, 2, 1, 2), look.boots, foot, T(0, -0.032, 0.055))
        add(new THREE.BoxGeometry(0.104, 0.022, 0.26), '#e9e4da', foot, T(0, -0.068, 0.055))
      } else {
        const boot = new THREE.BoxGeometry(0.095, 0.07, 0.24, 2, 1, 2)
        add(boot, look.boots, foot, T(0, -0.035, 0.055))
      }
    }
    // BriBri's notebook: a small book held in the left hand
    if (look.prop === 'notebook') add(new THREE.BoxGeometry(0.11, 0.15, 0.025), '#c8902f', 'handL', T(0, -0.09, 0.04))
    if (look.cane) add(new THREE.CylinderGeometry(0.012, 0.014, P.hipY + 0.05, 6), '#8a5a32', 'handR', T(0, -(P.hipY + 0.05) / 2 + 0.03, 0.03))

    // every part must agree on having an index before merging (some generators make non-indexed ones)
    const mixed = parts.some((q) => !q.index) && parts.some((q) => q.index)
    const ready = (mixed ? parts.map((q) => (q.index ? q.toNonIndexed() : q)) : parts).map((q) => { if (q.hasAttribute('uv')) q.deleteAttribute('uv'); return q })
    const geo = mergeGeometries(ready, false)!
    geo.computeBoundingSphere()
    const mat = opts.toon
      ? new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradient() })
      : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0 })
    this.mesh = new THREE.SkinnedMesh(geo, mat)
    this.mesh.add(this.bones.root)
    const skeleton = new THREE.Skeleton(list)
    this.mesh.bind(skeleton)
    this.mesh.castShadow = opts.castShadow ?? true
    this.mesh.frustumCulled = false
    this.root.add(this.mesh)
    if (opts.outline) {
      this.outline = new THREE.SkinnedMesh(geo, outlineMaterial(look.kid ? 0.011 : 0.013))
      this.outline.bind(skeleton, this.mesh.bindMatrix)
      this.outline.frustumCulled = false
      this.root.add(this.outline)
    }
    for (const p of parts) p.dispose()
    this.addDecorations(look, opts.castShadow ?? true)
  }

  /** Textured pieces that ride on a bone: shirt numbers, printed dresses, a head wrap. */
  private extras: THREE.Mesh[] = []
  private addDecorations(look: Look, shadow: boolean) {
    const P = this.prop, g = P.girth, hr = P.headR
    const ride = (bone: BoneName, geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number], rotY = 0) => {
      const m = new THREE.Mesh(geo, mat)
      m.position.set(...pos)
      m.rotation.y = rotY
      m.castShadow = shadow
      this.bones[bone].add(m)
      this.extras.push(m)
      return m
    }
    if (look.number !== undefined && look.numberColor) {
      const tex = numberTexture(String(look.number), look.numberColor)
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false })
      const z = 0.124 * g
      ride('chest', new THREE.PlaneGeometry(0.1 * g, 0.1 * g), mat, [0.0, P.chest * 0.5, z])
      ride('chest', new THREE.PlaneGeometry(0.16 * g, 0.16 * g), mat, [0, P.chest * 0.52, -z], Math.PI)
    }
    if (look.chestMark) {
      const tex = markTexture(look.chestMark, look.chestMarkColor ?? '#f2eee3')
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false })
      const z = 0.125 * g
      const size = look.chestMark === 'spots' ? 0.24 * g : 0.13 * g
      ride('chest', new THREE.PlaneGeometry(size, size), mat, [look.chestMark === 'fin' ? -0.035 * g : 0, P.chest * 0.5, z])
      if (look.chestMark === 'spots') ride('chest', new THREE.PlaneGeometry(size, size), mat, [0, P.chest * 0.5, -z], Math.PI)
    }
    if (look.dress) {
      const tex = patternTexture(look.dress, look.pattern)
      const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: THREE.DoubleSide })
      const len = P.hipY * 0.9
      const skirt = new THREE.CylinderGeometry(0.15 * g, 0.27 * g, len, 24, 1, true)
      ride('hips', skirt, mat, [0, 0.12 - len / 2, 0])
      ride('chest', new THREE.CylinderGeometry(0.181 * g, 0.146 * g, P.chest * 0.96, 20, 1, true), mat, [0, P.chest * 0.48, 0])
    }
    if (look.hat) {
      const mat = new THREE.MeshStandardMaterial({ color: look.hat, roughness: 0.85 })
      ride('head', new THREE.CylinderGeometry(hr * 0.78, hr * 0.92, hr * 0.7, 18), mat, [0, hr * 1.85, -hr * 0.05])
      ride('head', new THREE.CylinderGeometry(hr * 1.85, hr * 1.85, hr * 0.06, 24), mat, [0, hr * 1.55, -hr * 0.05])
      if (look.hatFlowers) {
        const fm = new THREE.MeshStandardMaterial({ color: look.hatFlowers, roughness: 0.7 })
        for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; ride('head', new THREE.SphereGeometry(hr * 0.14, 6, 5), fm, [Math.cos(a) * hr * 0.88, hr * 1.66, -hr * 0.05 + Math.sin(a) * hr * 0.88]) }
      }
    }
    if (look.headwrap) {
      const tex = patternTexture(look.headwrap, look.pattern)
      const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 })
      const wrap = ride('head', new THREE.SphereGeometry(hr * 1.22, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), mat, [0, hr * 1.25, -hr * 0.08])
      wrap.scale.set(1.05, 1.15, 1.05)
      ride('head', new THREE.SphereGeometry(hr * 0.45, 12, 8), mat, [hr * 0.5, hr * 2.15, -hr * 0.3])
    }
  }

  /** Turn the whole figure to face a sim angle immediately (spawns, cutscenes). */
  snapFacing(facing: number) { this.lastFacing = facing; this.root.rotation.y = Math.atan2(Math.cos(facing), Math.sin(facing)) }

  update(a: AnimInput, dt: number) {
    this.time += dt
    const B = this.bones, P = this.prop
    const k = 1 - Math.exp(-18 * dt)
    const s = a.speed
    const sN = Math.min(1.2, s / Math.max(1, a.maxSpeed))
    // body orientation follows facing, smoothly
    const targetY = Math.atan2(Math.cos(a.facing), Math.sin(a.facing))
    let dy = targetY - this.root.rotation.y
    while (dy > Math.PI) dy -= Math.PI * 2
    while (dy < -Math.PI) dy += Math.PI * 2
    this.root.rotation.y += dy * (1 - Math.exp(-14 * dt))
    // banking from turning speed
    let df = a.facing - this.lastFacing
    while (df > Math.PI) df -= Math.PI * 2
    while (df < -Math.PI) df += Math.PI * 2
    this.lastFacing = a.facing
    this.bank += ((-df / Math.max(dt, 1e-3)) * 0.035 * sN - this.bank) * (1 - Math.exp(-6 * dt))
    // gait weights
    const walkW = Math.min(1, s / 2), runW = Math.min(1, Math.max(0, (s - 2) / 3)), sprintW = Math.min(1, Math.max(0, (s - 5) / 2))
    const freq = 0.95 + 0.85 * sN
    if (s > 0.15) this.phase += Math.PI * 2 * freq * dt
    // moving backwards or sideways relative to the body
    let rel = a.velAngle - a.facing
    while (rel > Math.PI) rel -= Math.PI * 2
    while (rel < -Math.PI) rel += Math.PI * 2
    const fwd = s > 0.3 ? Math.cos(rel) : 1
    const side = s > 0.3 ? Math.sin(rel) : 0
    const thighAmp = (0.38 * walkW + 0.5 * runW + 0.22 * sprintW) * (0.35 + 0.65 * Math.abs(fwd))
    const kneeAmp = 0.45 * walkW + 0.75 * runW + 0.35 * sprintW
    const armAmp = 0.28 * walkW + 0.45 * runW + 0.25 * sprintW
    const ph = this.phase
    const sin = Math.sin(ph), sinR = Math.sin(ph + Math.PI)
    const dir = fwd >= 0 ? 1 : -1
    const tgt: Partial<Record<BoneName, [number, number, number]>> = {}
    // locomotion layer
    tgt.thighL = [-thighAmp * sin * dir, 0, side * 0.12 * walkW]
    tgt.thighR = [-thighAmp * sinR * dir, 0, side * 0.12 * walkW]
    tgt.shinL = [0.12 + kneeAmp * Math.max(0, Math.sin(ph - 0.9)) + 0.25 * runW, 0, 0]
    tgt.shinR = [0.12 + kneeAmp * Math.max(0, Math.sin(ph + Math.PI - 0.9)) + 0.25 * runW, 0, 0]
    tgt.footL = [-0.15 * runW * Math.max(0, sin), 0, 0]
    tgt.footR = [-0.15 * runW * Math.max(0, sinR), 0, 0]
    tgt.armL = [armAmp * sin * dir, 0, 0.14 + 0.05 * runW]
    tgt.armR = [armAmp * sinR * dir, 0, -0.14 - 0.05 * runW]
    tgt.foreL = [-0.25 - 1.05 * runW, 0, 0]
    tgt.foreR = [-0.25 - 1.05 * runW, 0, 0]
    const lean = 0.04 * walkW + 0.13 * runW + 0.1 * sprintW
    tgt.spine = [lean * dir, 0, 0]
    tgt.chest = [0.02 * Math.sin(this.time * 1.7) * (1 - walkW), -0.08 * sin * runW, 0]
    tgt.hips = [0, 0.1 * sin * runW, this.bank]
    let hipLift = -(0.018 * walkW + 0.035 * runW) * Math.abs(Math.cos(ph))
    // head looks at the ball (relative to the body), within a natural range
    let headYaw = 0
    if (a.lookAngle !== null) {
      let d = a.lookAngle - a.facing
      while (d > Math.PI) d -= Math.PI * 2
      while (d < -Math.PI) d += Math.PI * 2
      headYaw = Math.max(-1, Math.min(1, -d))
    }
    tgt.head = [a.mood === 'sad' ? 0.35 : 0, headYaw * 0.8, 0]
    tgt.neck = [0, headYaw * 0.2, 0]
    // action layers
    const t = a.animT
    const kickSide = a.kickFoot
    if (a.anim === 'kick') {
      const kt = kickSide === 'R' ? 'thighR' : 'thighL', ks = kickSide === 'R' ? 'shinR' : 'shinL'
      const pt = kickSide === 'R' ? 'thighL' : 'thighR', ps = kickSide === 'R' ? 'shinL' : 'shinR'
      let th = 0, sh = 0.2
      if (t < 0.11) { const u = t / 0.11; th = 0.75 * u; sh = 0.2 + 1.3 * u }
      else if (t < 0.2) { const u = (t - 0.11) / 0.09; th = 0.75 - 1.95 * u; sh = 1.5 - 1.35 * u }
      else { const u = Math.min(1, (t - 0.2) / 0.25); th = -1.2 + 1.2 * u * u; sh = 0.15 + 0.2 * u }
      tgt[kt] = [th, 0, 0]; tgt[ks] = [sh, 0, 0]
      tgt[pt] = [-0.15, 0, 0]; tgt[ps] = [0.35, 0, 0]
      const armOut = kickSide === 'R' ? 'armL' : 'armR'
      tgt[armOut] = [-0.5, 0, kickSide === 'R' ? 0.9 : -0.9]
      tgt.spine = [-0.08, kickSide === 'R' ? 0.25 : -0.25, 0]
      hipLift = -0.03
    } else if (a.anim === 'receive') {
      const u = Math.sin(Math.min(1, t / 0.35) * Math.PI)
      const rt = kickSide === 'R' ? 'thighR' : 'thighL', rs = kickSide === 'R' ? 'shinR' : 'shinL'
      tgt[rt] = [-0.55 * u, 0, 0]; tgt[rs] = [0.55 * u + 0.1, 0, 0]
      tgt.spine = [0.12 * u, 0, 0]
      tgt.head = [0.35 * u, tgt.head![1], 0]
    } else if (a.anim === 'tackle') {
      const u = Math.min(1, t / 0.18) * (t > 0.5 ? Math.max(0, 1 - (t - 0.5) / 0.2) : 1)
      tgt.thighR = [-1.25 * u, 0, 0]; tgt.shinR = [0.1, 0, 0]
      tgt.thighL = [0.45 * u, 0, 0]; tgt.shinL = [1.3 * u, 0, 0]
      tgt.spine = [0.32 * u, 0, 0]
      tgt.armL = [-0.6 * u, 0, 0.7 * u]; tgt.armR = [0.3 * u, 0, -0.5 * u]
      hipLift = -0.2 * u
    } else if (a.anim === 'dive') {
      if (t < 0.05) this.diveSide = side >= 0 ? -1 : 1
      const u = Math.min(1, t / 0.25) * (t > 0.8 ? Math.max(0, 1 - (t - 0.8) / 0.3) : 1)
      tgt.hips = [0, 0, this.diveSide * 1.25 * u]
      tgt.armL = [-2.7 * u, 0, 0.3]; tgt.armR = [-2.7 * u, 0, -0.3]
      tgt.foreL = [-0.1, 0, 0]; tgt.foreR = [-0.1, 0, 0]
      tgt.thighL = [-0.2 * u, 0, 0.3 * u]; tgt.thighR = [0.1, 0, -0.2 * u]
      hipLift = 0.18 * u - 0.35 * Math.max(0, u - 0.6)
    } else if (a.anim === 'catch') {
      const u = Math.min(1, t / 0.15)
      tgt.armL = [-1.25 * u, 0, -0.15]; tgt.armR = [-1.25 * u, 0, 0.15]
      tgt.foreL = [-0.6, 0, 0]; tgt.foreR = [-0.6, 0, 0]
      tgt.spine = [0.18 * u, 0, 0]
    } else if (a.anim === 'celebrate') {
      const bounce = Math.abs(Math.sin(t * 7))
      tgt.armL = [-0.2, 0, 2.6]; tgt.armR = [-0.2, 0, -2.6]
      tgt.foreL = [-0.3, 0, 0]; tgt.foreR = [-0.3, 0, 0]
      tgt.spine = [-0.15, 0, 0]; tgt.head = [-0.3, 0, 0]
      hipLift = 0.12 * bounce
      tgt.thighL = [-0.3 * bounce, 0, 0]; tgt.shinL = [0.6 * bounce, 0, 0]
      tgt.thighR = [-0.3 * bounce, 0, 0]; tgt.shinR = [0.6 * bounce, 0, 0]
    } else if (a.anim === 'dejected') {
      tgt.head = [0.5, 0, 0]; tgt.spine = [0.18, 0, 0]
      tgt.armL = [0.25, 0.5, 0.75]; tgt.armR = [0.25, -0.5, -0.75]
      tgt.foreL = [-1.7, 0, 0]; tgt.foreR = [-1.7, 0, 0]
    }
    // story poses (Lionceaux): gestures from the book, blended like the football actions
    const tt = this.time
    if (a.anim === 'sit' || a.anim === 'sew') {
      const seat = Math.min(P.hipY - 0.12, a.anim === 'sew' ? P.hipY * 0.55 : P.hipY * 0.5)
      tgt.thighL = [-1.45, 0, 0.08]; tgt.thighR = [-1.45, 0, -0.08]
      tgt.shinL = [1.45, 0, 0]; tgt.shinR = [1.45, 0, 0]
      tgt.spine = [0.08, 0, 0]
      hipLift = -seat
      if (a.anim === 'sew') {
        tgt.armL = [-0.9, 0, 0.25]; tgt.armR = [-0.9, 0, -0.25]
        tgt.foreL = [-0.9 + 0.08 * Math.sin(tt * 9), 0, 0]; tgt.foreR = [-0.9 - 0.08 * Math.sin(tt * 9), 0, 0]
        tgt.head = [0.35, 0, 0]
        tgt.shinR = [1.45 + 0.18 * Math.sin(tt * 9), 0, 0]
      } else { tgt.armL = [-0.35, 0, 0.18]; tgt.armR = [-0.35, 0, -0.18]; tgt.foreL = [-0.9, 0, 0]; tgt.foreR = [-0.9, 0, 0] }
    } else if (a.anim === 'talk') {
      tgt.armR = [-0.55 - 0.25 * Math.sin(tt * 3.1), 0.2, -0.35]
      tgt.foreR = [-1.0 - 0.3 * Math.sin(tt * 4.3), 0, 0]
      tgt.armL = [-0.15 - 0.1 * Math.sin(tt * 2.3 + 1), 0, 0.2]
      tgt.head = [0.05 * Math.sin(tt * 5), tgt.head![1], 0.04 * Math.sin(tt * 2.1)]
    } else if (a.anim === 'dance') {
      // Milla: a hand on the belly, the other in the air, the hips rolling like a pirogue
      tgt.armL = [-0.75, 0, 0.35]; tgt.foreL = [-1.9, 0, 0]
      tgt.armR = [-0.2, 0, -2.75 + 0.2 * Math.sin(tt * 6)]; tgt.foreR = [-0.2, 0, 0]
      tgt.hips = [0, 0.35 * Math.sin(tt * 4.2), 0.18 * Math.sin(tt * 4.2 + 1.2)]
      tgt.spine = [0, -0.25 * Math.sin(tt * 4.2), -0.12 * Math.sin(tt * 4.2 + 1.2)]
      tgt.thighL = [-0.25 - 0.15 * Math.sin(tt * 4.2), 0, 0.05]; tgt.thighR = [-0.25 + 0.15 * Math.sin(tt * 4.2), 0, -0.05]
      tgt.shinL = [0.45, 0, 0]; tgt.shinR = [0.45, 0, 0]
      hipLift = -0.06
    } else if (a.anim === 'fist') {
      tgt.armR = [-1.45, 0, -0.1]; tgt.foreR = [-0.15, 0, 0]
    } else if (a.anim === 'heart') {
      tgt.armR = [-0.55, 0.3, 0.55]; tgt.foreR = [-1.95, 0, 0]
    } else if (a.anim === 'cry') {
      tgt.armL = [-1.25, 0, 0.3]; tgt.armR = [-1.25, 0, -0.3]
      tgt.foreL = [-2.2, 0, 0]; tgt.foreR = [-2.2, 0, 0]
      tgt.head = [0.45, 0, 0]; tgt.spine = [0.25, 0, 0]
      tgt.chest = [0.06 * Math.max(0, Math.sin(tt * 7)), 0, 0]
    } else if (a.anim === 'wave') {
      tgt.armR = [-0.3, 0, -2.6]; tgt.foreR = [0, 0, 0.45 * Math.sin(tt * 9)]
    } else if (a.anim === 'point') {
      tgt.armR = [-1.35, 0.5, -0.4]; tgt.foreR = [-0.05, 0, 0]
    } else if (a.anim === 'palm') {
      tgt.armR = [-0.9, 0.25, -0.25]; tgt.foreR = [-0.4, 0, 0]
    } else if (a.anim === 'hold') {
      tgt.armL = [-0.7, 0, -0.25]; tgt.armR = [-0.7, 0, 0.25]
      tgt.foreL = [-1.35, 0, 0]; tgt.foreR = [-1.35, 0, 0]
    } else if (a.anim === 'juggle') {
      const u = Math.sin(tt * 6)
      tgt.thighL = [-0.9 * Math.max(0, u), 0, 0]; tgt.thighR = [-0.9 * Math.max(0, -u), 0, 0]
      tgt.shinL = [0.3, 0, 0]; tgt.shinR = [0.3, 0, 0]
      tgt.armL = [-0.2, 0, 0.6]; tgt.armR = [-0.2, 0, -0.6]
      tgt.head = [0.4, 0, 0]
    } else if (a.anim === 'kneel') {
      tgt.thighL = [-1.5, 0, 0]; tgt.shinL = [1.55, 0, 0]
      tgt.thighR = [0.05, 0, 0]; tgt.shinR = [1.55, 0, 0]
      hipLift = -(P.shin + 0.04)
      tgt.spine = [0.1, 0, 0]
    } else if (a.anim === 'open') {
      // arms wide open: « seule au milieu, les bras écartés »
      tgt.armL = [-0.1, 0, 1.35]; tgt.armR = [-0.1, 0, -1.35]; tgt.foreL = [-0.15, 0, 0]; tgt.foreR = [-0.15, 0, 0]
    } else if (a.anim === 'mic') {
      // Radio's hand in front of his mouth like a microphone, the other hand talking
      tgt.armR = [-1.1, 0.35, 0.2]; tgt.foreR = [-2.15, 0, 0]
      tgt.armL = [-0.4 - 0.25 * Math.sin(tt * 3.4), 0, 0.35]; tgt.foreL = [-0.9 - 0.3 * Math.sin(tt * 4.1), 0, 0]
      tgt.head = [0.05 * Math.sin(tt * 5), tgt.head![1], 0]
    } else if (a.anim === 'hug') {
      // sitting on the ground, knees up, holding something tight against the chest
      const seat = P.hipY - 0.06
      tgt.thighL = [-1.75, 0, 0.12]; tgt.thighR = [-1.75, 0, -0.12]
      tgt.shinL = [1.95, 0, 0]; tgt.shinR = [1.95, 0, 0]
      tgt.armL = [-0.85, 0, -0.35]; tgt.armR = [-0.85, 0, 0.35]; tgt.foreL = [-1.6, 0, 0]; tgt.foreR = [-1.6, 0, 0]
      tgt.spine = [0.3, 0, 0]; tgt.head = [0.35 + 0.05 * Math.sin(tt * 7), 0, 0]
      hipLift = -seat
    } else if (a.anim === 'sitGround') {
      const seat = P.hipY - 0.06
      tgt.thighL = [-1.5, 0, 0.15]; tgt.thighR = [-1.5, 0, -0.15]
      tgt.shinL = [0.3, 0, 0]; tgt.shinR = [0.3, 0, 0]
      tgt.armL = [0.4, 0, 0.3]; tgt.armR = [0.4, 0, -0.3]
      hipLift = -seat
    } else if (a.anim === 'climb') {
      // reaching up with both hands (taking the ball off the fence)
      tgt.armL = [-2.9, 0, 0.15]; tgt.armR = [-2.9, 0, -0.15]; tgt.foreL = [-0.3, 0, 0]; tgt.foreR = [-0.3, 0, 0]
      tgt.head = [-0.5, 0, 0]
    } else if (a.anim === 'shrug') {
      tgt.armL = [-0.3, 0, 0.6]; tgt.armR = [-0.3, 0, -0.6]; tgt.foreL = [-1.2, 0, 0]; tgt.foreR = [-1.2, 0, 0]
      tgt.chest = [0, 0, 0]; hipLift = 0.01
    } else if (a.anim === 'lie') {
      tgt.hips = [-1.5, 0, 0]
      hipLift = -(P.hipY - 0.18)
      tgt.thighL = [0, 0, 0]; tgt.thighR = [0, 0, 0]
    }
    if (this.look.elder && (a.anim === 'idle' || a.anim === 'move' || a.anim === 'talk')) tgt.spine = [(tgt.spine?.[0] ?? 0) + 0.14, tgt.spine?.[1] ?? 0, 0]
    if (a.gk && a.anim !== 'dive' && a.anim !== 'catch' && s < 1.5) {
      // keeper's ready stance: knees bent, hands forward
      tgt.armL = [-0.55, 0, 0.35]; tgt.armR = [-0.55, 0, -0.35]
      tgt.foreL = [-0.7, 0, 0]; tgt.foreR = [-0.7, 0, 0]
      tgt.thighL = [-0.35, 0, 0.12]; tgt.thighR = [-0.35, 0, -0.12]
      tgt.shinL = [0.6, 0, 0]; tgt.shinR = [0.6, 0, 0]
      tgt.spine = [0.22, 0, 0]
      hipLift = -0.09
    }
    // blend every bone towards its target
    for (const name of Object.keys(tgt) as BoneName[]) {
      const r = tgt[name]!
      const b = B[name]
      const base = name === 'armL' ? 0.12 : name === 'armR' ? -0.12 : 0
      b.rotation.x += (r[0] - b.rotation.x) * k
      b.rotation.y += (r[1] - b.rotation.y) * k
      b.rotation.z += (r[2] + (name === 'armL' || name === 'armR' ? base * 0 : 0) - b.rotation.z) * k
    }
    B.hips.position.y += (this.rest.hips.y + hipLift - B.hips.position.y) * k
    void P
  }

  setVisible(v: boolean) { this.root.visible = v }
  dispose() {
    for (const m of this.extras) { m.geometry.dispose(); const mat = m.material as THREE.MeshBasicMaterial; if (mat.map && ![...patternCache.values()].includes(mat.map as THREE.CanvasTexture)) mat.map.dispose(); mat.dispose() }
    this.mesh.geometry.dispose()
    ;(this.mesh.material as THREE.Material).dispose()
    if (this.outline) (this.outline.material as THREE.Material).dispose()
  }
}
