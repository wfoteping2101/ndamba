// Part II, Waldorf (Maryland), January: « La maison de Waldorf est petite et beige », the driveway
// with the basketball hoop whose net has frozen, the car under the snow, the neighbours (the Hayes),
// the street where the yellow school bus stops. With `field`, the place is behind the school instead:
// the football pitches gone under the snow, only the top of the goals showing (« Les buts ont mis un
// chapeau blanc »).
import * as THREE from 'three'
import type { Frame, Stage } from '../../engine/render/stage'
import type { PitchGeom } from '../../engine/sim/pitch'
import { M, SetBuilder, canvasTexture, grain, seeded, type Marks } from './common'
import { barkTexture } from './nature'
import type { SetHandle } from './bonamoussadi'

export const WALDORF_W = 44
export const WALDORF_H = 32

export function waldorfPitch(): PitchGeom {
  return { view: 'grid', w: WALDORF_W, h: WALDORF_H, goals: [], offsetX: 0, markings: false, surface: 'concrete', walls: false, cones: [], goalFor: { a: null, b: null }, fullLength: WALDORF_W, roam: 6 }
}

/** Named places (sim metres). The family house faces the street (+y). */
export const WALDORF_MARKS: Marks = {
  house: { x: 14, y: 8.5 },
  door: { x: 14, y: 12.3 },
  porch: { x: 14, y: 13.4 },
  window: { x: 11.2, y: 12.2 },
  drive: { x: 20, y: 17.5 },
  car: { x: 20, y: 15 },
  hoop: { x: 20, y: 21.2 },
  street: { x: 20, y: 26 },
  stop: { x: 14, y: 22.6 },
  hayes: { x: 31, y: 13.6 },
  // behind the school
  field: { x: 22, y: 14 },
  goalA: { x: 9, y: 14 },
  goalB: { x: 35, y: 14 },
}

export interface WaldorfOpts { snow?: boolean; bus?: boolean; field?: boolean }

/* ------------------------------------------------------------------ textures */

export function snowTexture() {
  return canvasTexture(512, 512, (g, w, h) => {
    const r = seeded(77)
    g.fillStyle = '#f4f7fa'; g.fillRect(0, 0, w, h)
    // soft drifts and the blue of the shadows in the hollows
    for (let i = 0; i < 160; i++) {
      const x = r() * w, y = r() * h, rad = 20 + r() * 70
      const grd = g.createRadialGradient(x, y, 0, x, y, rad)
      grd.addColorStop(0, r() < 0.5 ? 'rgba(205,218,232,0.35)' : 'rgba(255,255,255,0.6)'); grd.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = grd; g.fillRect(x - rad, y - rad, rad * 2, rad * 2)
    }
    grain(g, w, h, r, 2600, ['#ffffff', '#e2e9f1', '#dbe3ec'], [1, 3])
  }, { repeat: [10, 10] })
}

function sidingTexture(color: string) {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h)
    const dark = new THREE.Color(color).multiplyScalar(0.8).getStyle()
    const light = new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.25).getStyle()
    for (let y = 0; y < h; y += 16) {
      g.fillStyle = dark; g.fillRect(0, y + 13, w, 3)
      g.fillStyle = light; g.fillRect(0, y, w, 2)
    }
  }, { repeat: [3, 1.5] })
}

function shingleTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    const r = seeded(12)
    g.fillStyle = '#4a4a4c'; g.fillRect(0, 0, w, h)
    for (let y = 0; y < h; y += 20) for (let x = (y / 20) % 2 ? -16 : 0; x < w; x += 32) {
      const v = 60 + Math.floor(r() * 30)
      g.fillStyle = `rgb(${v},${v},${v + 3})`; g.fillRect(x + 1, y + 1, 30, 18)
    }
  }, { repeat: [4, 2] })
}

export function asphaltTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    const r = seeded(4)
    g.fillStyle = '#4b4d50'; g.fillRect(0, 0, w, h)
    grain(g, w, h, r, 1800, ['#56585b', '#3f4144', '#5f6164'], [1, 3])
  }, { repeat: [12, 2] })
}

function brickTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    const r = seeded(31)
    g.fillStyle = '#b9b2a6'; g.fillRect(0, 0, w, h)
    for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? -16 : 0; x < w; x += 32) {
      const k = r() * 0.18
      g.fillStyle = new THREE.Color('#8e3f2c').lerp(new THREE.Color('#6f2f22'), k * 4).getStyle()
      g.fillRect(x + 1, y + 1, 30, 14)
    }
  }, { repeat: [6, 2] })
}

/* ------------------------------------------------------------------ pieces */

type Place = (lx: number, ly: number, lz: number) => THREE.Vector3

/** A small American house: siding, a gable roof (snowed on), white-framed windows, a porch with steps. */
function usHouse(b: SetBuilder, at: THREE.Vector3, w: number, d: number, h: number, rotY: number, siding: THREE.Material, roof: THREE.Material, snow: boolean, opts: { door?: string; porch?: boolean } = {}) {
  const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY)
  const place: Place = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(rot).add(at)
  const box = (sx: number, sy: number, sz: number, lx: number, ly: number, lz: number, color: string, mat?: THREE.Material | 'plain' | 'shiny', r?: THREE.Quaternion) =>
    b.add(new THREE.BoxGeometry(sx, sy, sz), color, new THREE.Matrix4().compose(place(lx, ly, lz), r ? rot.clone().multiply(r) : rot, new THREE.Vector3(1, 1, 1)), { mat })
  box(w, h, d, 0, h / 2, 0, '#ffffff', siding)
  box(w + 0.06, 0.45, d + 0.06, 0, 0.22, 0, '#8d8a84')
  // gable roof: two slopes along the width, snow on top
  const pitch = 0.6, half = d / 2 + 0.45, slope = half / Math.cos(pitch)
  for (const s of [-1, 1]) {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), s * pitch)
    box(w + 0.6, 0.12, slope, 0, h + Math.tan(pitch) * half / 2, s * half / 2, '#ffffff', roof, q)
    if (snow) box(w + 0.62, 0.1, slope * 0.96, 0, h + Math.tan(pitch) * half / 2 + 0.11, s * half / 2 - s * 0.02, '#f6f9fc', 'plain', q)
  }
  // the gable ends
  const tri = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, Math.tan(pitch) * d / 2)].map((v) => v))
  for (const s of [-1, 1]) {
    const g = new THREE.ShapeGeometry(tri)
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), s * Math.PI / 2)
    b.add(g, '#ffffff', new THREE.Matrix4().compose(place(s * (w / 2 + 0.005), h, 0), rot.clone().multiply(q), new THREE.Vector3(1, 1, 1)), { mat: siding })
  }
  // front: door, windows with white frames and shutters
  const door = opts.door ?? '#7a2e2a'
  box(0.95, 2.05, 0.08, 0, 1.03 + 0.25, d / 2 + 0.03, door)
  box(1.1, 0.1, 0.12, 0, 2.35 + 0.25, d / 2 + 0.05, '#f4f2ee')
  b.add(new THREE.SphereGeometry(0.035, 8, 6), '#d6b65a', new THREE.Matrix4().compose(place(0.33, 1.25, d / 2 + 0.09), rot, new THREE.Vector3(1, 1, 1)), { mat: 'shiny' })
  for (const wx of [-w / 2 + 1.3, w / 2 - 1.3]) {
    box(1.1, 1.2, 0.06, wx, 1.65, d / 2 + 0.02, '#2c3a46', 'shiny')
    box(1.22, 0.08, 0.1, wx, 2.28, d / 2 + 0.05, '#f4f2ee'); box(1.22, 0.08, 0.1, wx, 1.02, d / 2 + 0.05, '#f4f2ee')
    box(0.06, 1.2, 0.1, wx, 1.65, d / 2 + 0.05, '#f4f2ee')
    for (const s of [-1, 1]) box(0.32, 1.25, 0.05, wx + s * 0.74, 1.65, d / 2 + 0.05, '#2f4a3a')
  }
  if (opts.porch !== false) {
    // a small porch: a deck, two steps, two posts and a little roof
    box(2.6, 0.25, 1.4, 0, 0.125, d / 2 + 0.7, '#9a9790')
    box(1.4, 0.12, 0.35, 0, 0.06, d / 2 + 1.55, '#9a9790')
    for (const s of [-1, 1]) box(0.1, 2.3, 0.1, s * 1.2, 1.4, d / 2 + 1.3, '#f4f2ee')
    box(2.8, 0.1, 1.6, 0, 2.6, d / 2 + 0.75, '#ffffff', roof)
    if (snow) box(2.8, 0.08, 1.5, 0, 2.69, d / 2 + 0.75, '#f6f9fc')
  }
  // a chimney
  box(0.6, 1.4, 0.6, w / 2 - 1, h + 0.9, -0.6, '#7d3a2c')
}

export function bareTree(b: SetBuilder, at: THREE.Vector3, h: number, rnd: () => number, bark: THREE.Material) {
  const trunk = new THREE.CylinderGeometry(0.1 * h / 6, 0.2 * h / 6, h * 0.55, 7)
  b.add(trunk, '#ffffff', M.t(at.x, h * 0.275, at.z), { mat: bark })
  // branches: a few levels of thinner cylinders reaching up and out
  const grow = (from: THREE.Vector3, dir: THREE.Vector3, len: number, r: number, depth: number) => {
    const to = from.clone().add(dir.clone().multiplyScalar(len))
    const g = new THREE.CylinderGeometry(r * 0.6, r, len, 5)
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
    b.add(g, '#ffffff', new THREE.Matrix4().compose(from.clone().add(to).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)), { mat: bark })
    if (depth <= 0) return
    for (let i = 0; i < 2 + (depth > 1 ? 1 : 0); i++) {
      const a = rnd() * Math.PI * 2
      const nd = dir.clone().multiplyScalar(0.6).add(new THREE.Vector3(Math.cos(a), 0.5 + rnd() * 0.5, Math.sin(a)).multiplyScalar(0.7)).normalize()
      grow(to, nd, len * (0.55 + rnd() * 0.2), r * 0.6, depth - 1)
    }
  }
  const top = new THREE.Vector3(at.x, h * 0.5, at.z)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rnd()
    grow(top, new THREE.Vector3(Math.cos(a) * 0.6, 1, Math.sin(a) * 0.6).normalize(), h * 0.3, 0.07 * h / 6, 2)
  }
}

export function pine(b: SetBuilder, at: THREE.Vector3, h: number, snow: boolean) {
  b.add(new THREE.CylinderGeometry(0.08, 0.12, h * 0.25, 6), '#4a3628', M.t(at.x, h * 0.12, at.z))
  for (let k = 0; k < 4; k++) {
    const y = h * (0.2 + k * 0.19), r = h * (0.28 - k * 0.055)
    b.add(new THREE.ConeGeometry(r, h * 0.32, 9), '#26432f', M.t(at.x, y + h * 0.16, at.z), { mat: 'flat' })
    if (snow) b.add(new THREE.ConeGeometry(r * 0.78, h * 0.12, 9), '#f2f6fa', M.t(at.x, y + h * 0.27, at.z), { mat: 'flat' })
  }
}

export function sedan(b: SetBuilder, at: THREE.Vector3, rotY: number, color: string, snow: boolean) {
  const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY)
  const place: Place = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(rot).add(at)
  const box = (sx: number, sy: number, sz: number, lx: number, ly: number, lz: number, c: string, mat: 'plain' | 'shiny' = 'shiny') => b.add(new THREE.BoxGeometry(sx, sy, sz), c, new THREE.Matrix4().compose(place(lx, ly, lz), rot, new THREE.Vector3(1, 1, 1)), { mat })
  // the body: a side profile (boot, rear glass, roof, windscreen, bonnet) extruded across, edges rounded
  const prof = (pts: [number, number][], depth: number, bevel: number) => {
    const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)))
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 4 })
    g.translate(0, 0, -depth / 2)
    return g
  }
  const M0 = new THREE.Matrix4().compose(place(0, 0, 0), rot, new THREE.Vector3(1, 1, 1))
  b.add(prof([[-2.15, 0.36], [-2.2, 0.74], [-1.9, 0.86], [-1.2, 0.9], [-0.76, 1.36], [0.52, 1.38], [1.18, 0.93], [2.1, 0.8], [2.18, 0.56], [2.12, 0.36]], 1.62, 0.07), color, M0, { mat: 'shiny' })
  // the glass: a darker prism that shows through at the sides, the windscreen and the rear window
  b.add(prof([[-1.24, 0.92], [-0.79, 1.37], [0.55, 1.39], [1.23, 0.94]], 1.78, 0), '#26303a', M0, { mat: 'shiny' })
  // pillars between the side windows
  box(0.1, 0.42, 1.8, -0.12, 1.16, 0, color)
  box(4.36, 0.14, 1.8, 0, 0.36, 0, '#2a2a2a', 'plain')
  for (const lx of [-1.4, 1.4]) for (const lz of [-0.8, 0.8]) {
    const wq = rot.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2))
    b.add(new THREE.CylinderGeometry(0.33, 0.33, 0.24, 14), '#151515', new THREE.Matrix4().compose(place(lx, 0.33, lz), wq, new THREE.Vector3(1, 1, 1)))
  }
  for (const lz of [-0.62, 0.62]) { box(0.05, 0.12, 0.32, 2.21, 0.72, lz, '#f6f2e0'); box(0.05, 0.1, 0.3, -2.21, 0.74, lz, '#b8261c') }
  if (snow) {
    // a thick cap of snow on the roof, the hood and the boot
    box(1.3, 0.16, 1.6, -0.12, 1.5, 0, '#f6f9fc', 'plain')
    box(0.95, 0.09, 1.62, 1.66, 0.93, 0, '#f6f9fc', 'plain')
    box(0.66, 0.09, 1.62, -1.55, 0.95, 0, '#f6f9fc', 'plain')
  }
}

/** The basketball hoop at the end of the driveway, its net frozen stiff. */
function hoop(b: SetBuilder, at: THREE.Vector3, rotY: number, snow: boolean) {
  const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY)
  const place: Place = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(rot).add(at)
  b.add(new THREE.CylinderGeometry(0.06, 0.07, 3.1, 8), '#3a3d40', new THREE.Matrix4().compose(place(0, 1.55, 0), rot, new THREE.Vector3(1, 1, 1)), { mat: 'shiny' })
  b.add(new THREE.BoxGeometry(1.2, 0.8, 0.05), '#f2f2ee', new THREE.Matrix4().compose(place(0, 3.15, -0.35), rot, new THREE.Vector3(1, 1, 1)), { mat: 'shiny' })
  b.add(new THREE.BoxGeometry(0.5, 0.36, 0.06), '#c9362b', new THREE.Matrix4().compose(place(0, 3.05, -0.38), rot, new THREE.Vector3(1, 1, 1)))
  b.add(new THREE.BoxGeometry(0.44, 0.3, 0.07), '#f2f2ee', new THREE.Matrix4().compose(place(0, 3.05, -0.39), rot, new THREE.Vector3(1, 1, 1)))
  const ring = new THREE.TorusGeometry(0.23, 0.012, 6, 20)
  b.add(ring, '#d5652a', new THREE.Matrix4().compose(place(0, 3.0, -0.65), rot.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)), new THREE.Vector3(1, 1, 1)), { mat: 'shiny' })
  // the net, stiff with ice: a short open cone of white strands
  const net = new THREE.CylinderGeometry(0.23, 0.15, 0.4, 12, 1, true)
  b.add(net, snow ? '#e8f0f6' : '#f2f2ee', new THREE.Matrix4().compose(place(0, 2.8, -0.65), rot, new THREE.Vector3(1, 1, 1)), { mat: b.material('netIce', () => new THREE.MeshStandardMaterial({ vertexColors: true, wireframe: true, roughness: 0.3 })) })
  if (snow) b.add(new THREE.BoxGeometry(1.2, 0.08, 0.12), '#f6f9fc', new THREE.Matrix4().compose(place(0, 3.6, -0.35), rot, new THREE.Vector3(1, 1, 1)))
}

/** The yellow school bus « des films ». No lettering. */
function schoolBus(b: SetBuilder, at: THREE.Vector3, rotY: number) {
  const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY)
  const place: Place = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(rot).add(at)
  const box = (sx: number, sy: number, sz: number, lx: number, ly: number, lz: number, c: string, mat: 'plain' | 'shiny' = 'shiny') => b.add(new THREE.BoxGeometry(sx, sy, sz), c, new THREE.Matrix4().compose(place(lx, ly, lz), rot, new THREE.Vector3(1, 1, 1)), { mat })
  const Y = '#f2b21b'
  box(8.6, 2.2, 2.45, -0.6, 1.75, 0, Y)
  box(1.9, 1.0, 2.3, 4.45, 1.05, 0, Y)
  box(10.5, 0.22, 2.5, -0.1, 0.62, 0, '#1f1f1f', 'plain')
  // black rub rails and the row of windows
  for (const y of [1.2, 1.55]) box(8.62, 0.07, 2.47, -0.6, y, 0, '#1b1b1b', 'plain')
  for (let i = 0; i < 8; i++) for (const s of [-1, 1]) box(0.82, 0.62, 0.03, -4.3 + i * 0.98, 2.2, s * 1.235, '#2b3540')
  box(0.04, 0.7, 2.0, 3.36, 2.2, 0, '#2b3540')
  for (const lx of [-3.3, 2.8]) for (const lz of [-1.1, 1.1]) {
    const wq = rot.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2))
    b.add(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16), '#151515', new THREE.Matrix4().compose(place(lx, 0.5, lz), wq, new THREE.Vector3(1, 1, 1)))
  }
  // lights, the folding stop arm (a red disc, no word), the front grille
  for (const lz of [-0.9, 0.9]) { box(0.05, 0.16, 0.2, 5.42, 1.05, lz, '#f6f2e0'); box(0.06, 0.18, 0.18, 3.0, 2.95, lz, '#c9362b') }
  box(0.05, 0.5, 1.3, 5.42, 0.95, 0, '#2a2a2a', 'plain')
  b.add(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 8), '#c9362b', new THREE.Matrix4().compose(place(2.4, 1.6, 1.42), rot.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)), new THREE.Vector3(1, 1, 1)))
  // the door on the kerb side (+z local)
  box(0.9, 1.9, 0.04, 3.0, 1.65, 1.24, '#2b3540')
}

/* ------------------------------------------------------------------ the place */

export function buildWaldorf(stage: Stage, frame: Frame, opts: WaldorfOpts = {}): SetHandle {
  const q = stage.quality
  const b = new SetBuilder(frame, q.shadows)
  const rnd = seeded(2026)
  const snow = opts.snow !== false
  const snowTex = snowTexture()
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshStandardMaterial({ map: snowTex, roughness: 0.82, color: snow ? '#ffffff' : '#9aa77a' }))
  snowTex.repeat.set(26, 26)
  ground.rotation.x = -Math.PI / 2; ground.position.copy(frame.vec(WALDORF_W / 2, WALDORF_H / 2, -0.01)); ground.receiveShadow = true
  b.object(ground); b.disposables.push(snowTex)
  const bark = b.material('bark', () => new THREE.MeshStandardMaterial({ map: barkTexture('#4f4741'), roughness: 0.95 }))
  const roof = b.material('roof', () => new THREE.MeshStandardMaterial({ map: shingleTexture(), roughness: 0.85 }))

  if (opts.field) {
    // behind the school: a long brick building, a chain-link fence, the pitches under the snow
    const brick = b.material('brick', () => new THREE.MeshStandardMaterial({ map: brickTexture(), roughness: 0.9 }))
    const sch = frame.vec(22, -6)
    b.add(new THREE.BoxGeometry(52, 7, 10), '#ffffff', M.t(sch.x, 3.5, sch.z), { mat: brick })
    b.add(new THREE.BoxGeometry(52.6, 0.4, 10.6), '#d9d6cf', M.t(sch.x, 7.1, sch.z))
    for (let i = 0; i < 16; i++) for (const y of [2, 5]) b.add(new THREE.BoxGeometry(1.8, 1.3, 0.06), '#2c3a46', M.t(sch.x - 23 + i * 3.1, y, sch.z + 5.02), { mat: 'shiny' })
    // the goals: only the crossbars and the tops of the posts show above the drifts
    for (const gx of [WALDORF_MARKS.goalA.x, WALDORF_MARKS.goalB.x]) {
      const g = frame.vec(gx, 14)
      const width = 7.3
      b.add(new THREE.CylinderGeometry(0.06, 0.06, width, 8), '#f4f4f0', M.trs([g.x, 1.0, g.z], [Math.PI / 2, 0, 0]), { mat: 'shiny' })
      for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8), '#f4f4f0', M.t(g.x, 0.5, g.z + s * width / 2), { mat: 'shiny' })
      // the white hat on the bar, and the drift that swallowed the rest
      b.add(new THREE.BoxGeometry(0.22, 0.12, width), '#f6f9fc', M.t(g.x, 1.1, g.z))
      b.add(new THREE.SphereGeometry(1, 16, 10), '#f4f7fa', M.trs([g.x, -0.2, g.z], [0, 0, 0], [2.4, 0.9, width * 0.62]))
    }
    for (let i = 0; i < 26; i++) {
      const p = frame.vec(rnd() * WALDORF_W, 3 + rnd() * 24)
      b.add(new THREE.SphereGeometry(1, 12, 8), '#f4f7fa', M.trs([p.x, -0.3, p.z], [0, rnd() * 3, 0], [2 + rnd() * 3, 0.5 + rnd() * 0.4, 1.5 + rnd() * 2]))
    }
    const fence = b.material('fence', () => new THREE.MeshStandardMaterial({ color: '#9aa0a4', wireframe: true, roughness: 0.5 }))
    for (const fy of [1, 29]) {
      const p = frame.vec(WALDORF_W / 2, fy)
      b.add(new THREE.PlaneGeometry(WALDORF_W, 2, 60, 4), '#9aa0a4', M.t(p.x, 1, p.z), { mat: fence })
      for (let x = 0; x <= WALDORF_W; x += 3) b.add(new THREE.CylinderGeometry(0.04, 0.04, 2.1, 6), '#7a8084', M.t(frame.vec(x, fy).x, 1.05, p.z), { mat: 'shiny' })
    }
    for (let i = 0; i < 6; i++) bareTree(b, frame.vec(-6 + i * 11, 34 + rnd() * 4), 7 + rnd() * 3, rnd, bark)
  } else {
    // the street: asphalt with snow pushed to the kerbs, sidewalks, a lamp post
    const asphalt = asphaltTexture()
    const road = new THREE.Mesh(new THREE.PlaneGeometry(260, 7), new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.75, color: snow ? '#e3e7ea' : '#ffffff' }))
    asphalt.repeat.set(60, 2)
    road.rotation.x = -Math.PI / 2; road.position.copy(frame.vec(WALDORF_W / 2, 26, 0.01)); road.receiveShadow = true
    b.object(road); b.disposables.push(asphalt)
    for (const ky of [22.4, 29.6]) {
      const p = frame.vec(WALDORF_W / 2, ky)
      b.add(new THREE.BoxGeometry(260, 0.14, 1.0), '#c9cdd0', M.t(p.x, 0.07, p.z))
      if (snow) for (let i = 0; i < 40; i++) {
        const sp = frame.vec(-50 + i * 4 + rnd() * 2, ky + (ky < 26 ? 0.9 : -0.9))
        b.add(new THREE.SphereGeometry(1, 10, 6), '#f4f7fa', M.trs([sp.x, 0.05, sp.z], [0, rnd() * 3, 0], [1.6 + rnd(), 0.35 + rnd() * 0.2, 0.55]))
      }
    }
    // the driveway, cleared in two tracks, the car under its cap of snow, the hoop at the end
    const drive = frame.vec(20, 17.4)
    b.add(new THREE.BoxGeometry(3.4, 0.02, 9.4), snow ? '#dfe5ea' : '#6a6c6e', M.t(drive.x, 0.012, drive.z))
    sedan(b, frame.vec(WALDORF_MARKS.car.x, WALDORF_MARKS.car.y), Math.PI / 2, '#5b6f86', snow)
    hoop(b, frame.vec(WALDORF_MARKS.hoop.x + 1.6, WALDORF_MARKS.hoop.y), Math.PI, snow)
    // the family house and the neighbours on both sides of the street
    const sidings = ['#d8c9a8', '#b9c7cf', '#e7e2d6', '#c9b29a', '#a9b9a2', '#d9d0c4']
    const houses: [number, number, number, number, number][] = [
      [14, 8.5, 9, 7, 0], [31, 8.2, 9.5, 7.5, 1], [-3, 8.4, 9, 7, 2], [47, 8.6, 9, 7, 3],
      [6, 37.5, 9, 7, 4], [22, 37.8, 9.5, 7, 5], [38, 37.4, 9, 7, 2], [54, 37.6, 9, 7, 1],
    ]
    for (const [x, y, w, d, c] of houses) {
      const front = y < 26 ? 0 : Math.PI
      const siding = b.material(`siding${c}`, () => new THREE.MeshStandardMaterial({ map: sidingTexture(sidings[c]), roughness: 0.8 }))
      usHouse(b, frame.vec(x, y), w, d, 2.9, front, siding, roof, snow, { door: ['#7a2e2a', '#2f4a6b', '#2f4a3a', '#3a3a3a', '#7a2e2a', '#5a3a2a'][c] })
      // a mailbox at the end of each path
      const mb = frame.vec(x - 2.4, y < 26 ? 21.6 : 30.4)
      b.add(new THREE.CylinderGeometry(0.04, 0.04, 1.05, 6), '#4a3628', M.t(mb.x, 0.52, mb.z))
      b.add(new THREE.BoxGeometry(0.22, 0.24, 0.48), '#2a2a2a', M.t(mb.x, 1.15, mb.z), { mat: 'shiny' })
      if (snow) b.add(new THREE.BoxGeometry(0.24, 0.07, 0.5), '#f6f9fc', M.t(mb.x, 1.3, mb.z))
    }
    // the path from the porch to the sidewalk
    const path = frame.vec(14, 17.8)
    b.add(new THREE.BoxGeometry(1.3, 0.02, 8.6), snow ? '#e0e6eb' : '#a9a49a', M.t(path.x, 0.014, path.z))
    // trees: bare maples and a few pines under the snow
    for (const [x, y, h] of [[6, 18, 8], [26, 17, 9], [40, 19, 7.5], [-8, 18, 8], [2, 33, 8.5], [30, 33.5, 9], [48, 33, 7]] as const) bareTree(b, frame.vec(x, y), h, rnd, bark)
    for (const [x, y, h] of [[9, 4, 6], [24, 3.5, 7], [36, 4, 5.5], [-10, 5, 6.5], [58, 5, 7]] as const) pine(b, frame.vec(x, y), h, snow)
    // a street lamp
    const lamp = frame.vec(28, 22.9)
    b.add(new THREE.CylinderGeometry(0.07, 0.09, 4.6, 8), '#2f3236', M.t(lamp.x, 2.3, lamp.z), { mat: 'shiny' })
    b.add(new THREE.BoxGeometry(0.5, 0.18, 0.3), '#2f3236', M.t(lamp.x, 4.6, lamp.z + 0.2), { mat: 'shiny' })
    // the bus stops on the house side of the street, its door to the kerb
    if (opts.bus) schoolBus(b, frame.vec(12, 24.2), Math.PI)
  }
  // far away: rows of bare trees closing the view
  for (let i = 0; i < 18; i++) bareTree(b, frame.vec(-40 + i * 7 + rnd() * 3, -18 - rnd() * 6), 8 + rnd() * 4, rnd, bark)
  const group = b.build()
  stage.scene.add(group)
  return { group, marks: WALDORF_MARKS, update() {}, dispose() { stage.scene.remove(group); b.dispose() } }
}
