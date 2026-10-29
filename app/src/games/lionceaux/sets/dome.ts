// Part II, chapter 10 on: the Potomac Valley Soccer Academy's air dome, « une guimauve géante ».
// Outside (`parking`): the white dome on the snow, the revolving door in its little glass porch, the
// parking lot with the cars under their caps of snow. Inside (`dome`): the white membrane sewn in
// panels, the projectors hanging from it, the artificial pitch « trop verte » sown with little black
// rubber grains, painted lines for a nine-a-side game, goals, the cone squares of the one-against-one,
// a small goal, the benches along the side, and the video analyst's camera on its tall tripod.
import * as THREE from 'three'
import type { Frame, Stage } from '../../engine/render/stage'
import type { PitchGeom } from '../../engine/sim/pitch'
import { M, SetBuilder, canvasTexture, grain, seeded, type Marks } from './common'
import { asphaltTexture, bareTree, pine, sedan, snowTexture } from './waldorf'
import { barkTexture } from './nature'
import type { SetHandle } from './bonamoussadi'
import { crowdMeshes, type Spot } from './crowd'

export const DOME_W = 64
export const DOME_H = 40
/** the dome's membrane: a half ellipsoid over the pitch */
const DOME_RX = DOME_W / 2 + 7, DOME_RZ = DOME_H / 2 + 7, DOME_TOP = 21

/** Nine-a-side goals on the lines (x 2 and 62); the team in « a » attacks right. */
export function domePitch(): PitchGeom {
  const goals = [
    { x: 62, y: DOME_H / 2, facing: -1 as const, width: 6.4, height: 2.1, depth: 1.4, mini: false, attackedBy: 'a' as const },
    { x: 2, y: DOME_H / 2, facing: 1 as const, width: 6.4, height: 2.1, depth: 1.4, mini: false, attackedBy: 'b' as const },
  ]
  return { view: 'grid', w: DOME_W, h: DOME_H, goals, offsetX: 0, markings: false, surface: 'turf', walls: false, cones: [], goalFor: { a: goals[0], b: goals[1] }, fullLength: 60, roam: 4 }
}

export const DOME_MARKS: Marks = {
  center: { x: 32, y: 20 },
  door: { x: 32, y: 41.5 },
  // the one-against-one: a square of cones by the side, a small goal at its far end, the queue
  square: { x: 13, y: 9 },
  miniGoal: { x: 18.6, y: 9 },
  queue: { x: 5.5, y: 9 },
  coach: { x: 20, y: 15.5 },
  bench: { x: 40, y: 40.4 },
  tripod: { x: 30, y: 40.6 },
}

export const PARKING_W = 60
export const PARKING_H = 40
export function parkingPitch(): PitchGeom {
  return { view: 'grid', w: PARKING_W, h: PARKING_H, goals: [], offsetX: 0, markings: false, surface: 'concrete', walls: false, cones: [], goalFor: { a: null, b: null }, fullLength: PARKING_W, roam: 6 }
}
export const PARKING_MARKS: Marks = {
  car: { x: 22, y: 30 },
  door: { x: 30, y: 13.2 },
  walk: { x: 26, y: 22 },
}

/* ------------------------------------------------------------------ textures */

/** The membrane: white fabric sewn in panels (meridians and rings), lighter where the day comes through. */
function membraneTexture() {
  return canvasTexture(1024, 512, (g, w, h) => {
    const r = seeded(5)
    const grd = g.createLinearGradient(0, 0, 0, h)
    grd.addColorStop(0, '#fbfbf7'); grd.addColorStop(0.7, '#f0f0ea'); grd.addColorStop(1, '#e2e2da')
    g.fillStyle = grd; g.fillRect(0, 0, w, h)
    grain(g, w, h, r, 1200, ['#ffffff', '#ecece4'], [1, 5])
    g.strokeStyle = 'rgba(150,150,140,0.35)'; g.lineWidth = 2
    for (let i = 0; i < 32; i++) { const x = (i / 32) * w; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke() }
    g.strokeStyle = 'rgba(150,150,140,0.28)'
    for (let j = 1; j < 9; j++) { const y = (j / 9) * h; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke() }
  })
}

/** The artificial pitch: 10 m of it, two mowing bands « d'un vert trop vif », blades, black rubber grains. */
function turfTexture() {
  return canvasTexture(1024, 1024, (g, w, h) => {
    const r = seeded(33)
    for (let band = 0; band < 2; band++) {
      g.fillStyle = band ? '#2fa548' : '#38b552'
      g.fillRect(band * w / 2, 0, w / 2, h)
    }
    grain(g, w, h, r, 9000, ['#4cc866', '#27913d', '#3fbe5a', '#23873a'], [1, 2.4])
    // the rubber crumb: thousands of little black grains
    for (let i = 0; i < 16000; i++) {
      g.fillStyle = r() < 0.85 ? '#141414' : '#2a2a2a'
      g.globalAlpha = 0.5 + r() * 0.5
      g.fillRect(r() * w, r() * h, 1 + r() * 1.6, 1 + r() * 1.6)
    }
    g.globalAlpha = 1
  })
}

/* ------------------------------------------------------------------ pieces */

function goal(b: SetBuilder, frame: Frame, gx: number, gy: number, s: 1 | -1, width: number, height: number, depth: number, mini = false) {
  const g = frame.vec(gx, gy)
  const r = mini ? 0.03 : 0.05
  const white = '#f4f4f0'
  for (const dz of [-width / 2, width / 2]) b.add(new THREE.CylinderGeometry(r, r, height, 10), white, M.t(g.x, height / 2, g.z + dz), { mat: 'shiny' })
  b.add(new THREE.CylinderGeometry(r, r, width, 10), white, M.trs([g.x, height, g.z], [Math.PI / 2, 0, 0]), { mat: 'shiny' })
  // the back frame on the ground and the net (s: which way is behind the goal)
  for (const dz of [-width / 2, width / 2]) b.add(new THREE.CylinderGeometry(r * 0.6, r * 0.6, depth, 6), '#d9d9d4', M.trs([g.x + s * depth / 2, r, g.z + dz], [0, 0, Math.PI / 2]), { mat: 'shiny' })
  const net = b.material('net', () => new THREE.MeshStandardMaterial({ color: '#f2f2ee', wireframe: true, roughness: 0.6 }))
  b.add(new THREE.BoxGeometry(depth, height, width, 4, 6, 12), '#f2f2ee', M.t(g.x + s * depth / 2, height / 2, g.z), { mat: net, cast: false })
}

function cone(b: SetBuilder, at: THREE.Vector3) {
  b.add(new THREE.ConeGeometry(0.1, 0.24, 12), '#f26b1d', M.t(at.x, 0.12, at.z), { mat: 'shiny' })
  b.add(new THREE.CylinderGeometry(0.13, 0.13, 0.015, 12), '#e85f14', M.t(at.x, 0.008, at.z))
}

/* ------------------------------------------------------------------ inside */

export interface DomeOpts { crowd?: boolean }

export function buildDome(stage: Stage, frame: Frame, opts: DomeOpts = {}): SetHandle {
  const q = stage.quality
  const b = new SetBuilder(frame, q.shadows)
  const rnd = seeded(10)
  // the turf, a little larger than the dome's footprint
  const tt = turfTexture()
  tt.wrapS = tt.wrapT = THREE.RepeatWrapping
  const gw = DOME_RX * 2 + 4, gh = DOME_RZ * 2 + 4
  tt.repeat.set(gw / 10, gh / 10)
  const turf = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh), new THREE.MeshStandardMaterial({ map: tt, roughness: 0.78 }))
  turf.rotation.x = -Math.PI / 2; turf.position.copy(frame.vec(DOME_W / 2, DOME_H / 2)); turf.receiveShadow = true
  b.object(turf); b.disposables.push(tt)
  // the lines of the nine-a-side pitch
  const line = b.material('line', () => new THREE.MeshStandardMaterial({ color: '#f4f4ee', roughness: 0.7 }))
  const strip = (x0: number, y0: number, x1: number, y1: number, wd = 0.1) => {
    const a = frame.vec(x0, y0), c = frame.vec(x1, y1)
    const len = a.distanceTo(c)
    const ang = Math.atan2(c.z - a.z, c.x - a.x)
    b.add(new THREE.PlaneGeometry(len, wd), '#f4f4ee', new THREE.Matrix4().compose(new THREE.Vector3((a.x + c.x) / 2, 0.008, (a.z + c.z) / 2), new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, -ang, 'YXZ')), new THREE.Vector3(1, 1, 1)), { mat: line, cast: false })
  }
  const arc = (cx: number, cy: number, rr: number, a0: number, a1: number) => { const n = 40; for (let i = 0; i < n; i++) { const u0 = a0 + (a1 - a0) * i / n, u1 = a0 + (a1 - a0) * (i + 1) / n; strip(cx + Math.cos(u0) * rr, cy + Math.sin(u0) * rr, cx + Math.cos(u1) * rr, cy + Math.sin(u1) * rr) } }
  strip(2, 2, 62, 2); strip(2, 38, 62, 38); strip(2, 2, 2, 38); strip(62, 2, 62, 38); strip(32, 2, 32, 38)
  arc(32, 20, 7, 0, Math.PI * 2)
  for (const [gx, s] of [[2, 1], [62, -1]] as const) {
    strip(gx, 7, gx + s * 13, 7); strip(gx + s * 13, 7, gx + s * 13, 33); strip(gx, 33, gx + s * 13, 33)
    strip(gx, 14, gx + s * 4, 14); strip(gx + s * 4, 14, gx + s * 4, 26); strip(gx, 26, gx + s * 4, 26)
  }
  goal(b, frame, 62, 20, 1, 6.4, 2.1, 1.4)
  goal(b, frame, 2, 20, -1, 6.4, 2.1, 1.4)
  // the one-against-one square, its small goal; more cone grids along the side for the small games
  for (const [x, y] of [[9, 5], [17, 5], [9, 13], [17, 13]]) cone(b, frame.vec(x, y))
  goal(b, frame, 18.6, 9, 1, 2, 1, 0.8, true)
  for (const ox of [24, 38]) for (const [dx, dy] of [[0, 0], [10, 0], [0, 7], [10, 7]]) cone(b, frame.vec(ox + dx, 24 + dy))
  // the membrane, its concrete footing ring, the revolving door's porch on the near side
  const memT = membraneTexture()
  const mem = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ map: memT, roughness: 0.92, side: THREE.BackSide, emissive: '#e9ecef', emissiveIntensity: 0.18 }))
  mem.scale.set(DOME_RX, DOME_TOP, DOME_RZ); mem.position.copy(frame.vec(DOME_W / 2, DOME_H / 2))
  b.object(mem); b.disposables.push(memT)
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2
    const p = frame.vec(DOME_W / 2 + Math.cos(a) * (DOME_RX - 0.2), DOME_H / 2 + Math.sin(a) * (DOME_RZ - 0.2))
    b.add(new THREE.BoxGeometry(3.6, 1.1, 0.4), '#bdbab2', M.trs([p.x, 0.55, p.z], [0, -a + Math.PI / 2, 0]))
  }
  const door = frame.vec(DOME_MARKS.door.x, DOME_H / 2 + DOME_RZ - 1.2)
  b.add(new THREE.BoxGeometry(4.6, 3, 0.3), '#d9d9d4', M.t(door.x, 1.5, door.z))
  b.add(new THREE.CylinderGeometry(1.2, 1.2, 2.5, 20, 1, true), '#a9c4d6', M.t(door.x, 1.25, door.z - 0.6), { mat: 'shiny', cast: false })
  // projectors: rows of white lamps hung from the membrane, the light they pour on the pitch
  const lamp = b.material('lamp', () => new THREE.MeshBasicMaterial({ color: '#fbfdff' }))
  const lights: [number, number][] = [[14, 10], [32, 10], [50, 10], [14, 30], [32, 30], [50, 30]]
  for (const [x, y] of lights) {
    const p = frame.vec(x, y)
    const nx = (x - DOME_W / 2) / DOME_RX, nz = (y - DOME_H / 2) / DOME_RZ
    const hY = DOME_TOP * Math.sqrt(Math.max(0, 1 - nx * nx - nz * nz)) - 2.2
    b.add(new THREE.CylinderGeometry(0.008, 0.008, 2, 4), '#5a5a5a', M.t(p.x, hY + 1, p.z))
    b.add(new THREE.BoxGeometry(1.4, 0.18, 0.7), '#3a3d40', M.t(p.x, hY, p.z), { mat: 'shiny' })
    b.add(new THREE.BoxGeometry(1.2, 0.04, 0.55), '#fbfdff', M.t(p.x, hY - 0.1, p.z), { mat: lamp, cast: false })
    const l = new THREE.PointLight('#f2f6ff', 120, 46, 1.25); l.position.set(p.x, hY - 0.4, p.z); b.object(l)
  }
  // the benches and the bags along the near side, the analyst's camera on its tall tripod
  const be = frame.vec(DOME_MARKS.bench.x, DOME_MARKS.bench.y)
  for (const dx of [-6, 0, 6]) {
    b.add(new THREE.BoxGeometry(4.6, 0.06, 0.42), '#4a5a6a', M.t(be.x + dx, 0.45, be.z), { mat: 'shiny' })
    for (const ex of [-2, 2]) b.add(new THREE.BoxGeometry(0.06, 0.45, 0.38), '#6a6e72', M.t(be.x + dx + ex, 0.22, be.z), { mat: 'shiny' })
  }
  for (let i = 0; i < 9; i++) b.add(new THREE.BoxGeometry(0.55, 0.3, 0.3), ['#2f3a4a', '#c9362b', '#2f6f8f', '#3a3a3a'][i % 4], M.trs([be.x - 8 + i * 1.9 + rnd() * 0.4, 0.15, be.z - 0.6], [0, rnd() - 0.5, 0]))
  const tp = frame.vec(DOME_MARKS.tripod.x, DOME_MARKS.tripod.y)
  for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; b.add(new THREE.CylinderGeometry(0.015, 0.02, 3.3, 6), '#222', M.trs([tp.x + Math.cos(a) * 0.35, 1.6, tp.z + Math.sin(a) * 0.35], [Math.sin(a) * 0.11, 0, -Math.cos(a) * 0.11])) }
  b.add(new THREE.BoxGeometry(0.34, 0.2, 0.22), '#1b1b1d', M.t(tp.x, 3.3, tp.z), { mat: 'shiny' })
  b.add(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12), '#0f0f10', M.trs([tp.x, 3.3, tp.z - 0.16], [Math.PI / 2, 0, 0]), { mat: 'shiny' })
  // the tryouts: « like a hundred kids » in bibs, in little groups round the cones, the parents behind
  if (opts.crowd) {
    const spots: Spot[] = []
    const groupsAt: [number, number, number][] = [[29, 27.5, 14], [43, 27.5, 14], [46, 9, 12], [32, 6, 10], [54, 20, 12], [24, 18, 8]]
    for (const [gx, gy, n] of groupsAt) for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, rr = 1 + rnd() * 3.2
      spots.push({ p: frame.vec(gx + Math.cos(a) * rr * 1.4, gy + Math.sin(a) * rr), rot: rnd() * Math.PI * 2, sit: false, kid: true, variant: rnd() < 0.5 ? 'kidStand' : 'kidWait' })
    }
    for (let i = 0; i < 26; i++) spots.push({ p: frame.vec(6 + rnd() * 52, 42.4 + rnd() * 2.2), rot: -Math.PI / 2 + (rnd() - 0.5) * 0.6, sit: false, kid: false, variant: rnd() < 0.5 ? 'manStand' : 'fanStand' })
    const c = crowdMeshes(spots, rnd, q.shadows, {
      shirts: ['#f26b1d', '#f26b1d', '#f26b1d', '#2f8f4e', '#2a5aa0', '#e2c23a'],
      bottoms: ['#1d1d1d', '#2a2a2a', '#1f2a44', '#3a3a44'],
      skins: ['#e8c4a0', '#5B3A27', '#c99b78', '#8a5a3c', '#f0d2b8', '#a8714c', '#3f2a1e', '#d9b08c'],
      hairs: ['#17110c', '#5a3a22', '#c9a060', '#3a2a1e', '#7a4a2a'],
    })
    for (const m of c.meshes) b.object(m)
    b.disposables.push(c)
  }
  const group = b.build()
  stage.scene.add(group)
  return { group, marks: DOME_MARKS, update() {}, dispose() { stage.scene.remove(group); b.dispose() } }
}

/* ------------------------------------------------------------------ outside */

export function buildParking(stage: Stage, frame: Frame, opts: { snow?: boolean } = {}): SetHandle {
  const q = stage.quality
  const b = new SetBuilder(frame, q.shadows)
  const rnd = seeded(61)
  const snow = opts.snow !== false
  const sn = snowTexture()
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ map: sn, roughness: 0.82 }))
  sn.repeat.set(30, 30)
  ground.rotation.x = -Math.PI / 2; ground.position.copy(frame.vec(PARKING_W / 2, PARKING_H / 2, -0.01)); ground.receiveShadow = true
  b.object(ground); b.disposables.push(sn)
  // the lot: cleared asphalt, painted bays, banks of pushed snow at its edges
  const asp = asphaltTexture()
  asp.repeat.set(10, 6)
  const lot = new THREE.Mesh(new THREE.PlaneGeometry(52, 22), new THREE.MeshStandardMaterial({ map: asp, roughness: 0.75, color: '#e9edf0' }))
  lot.rotation.x = -Math.PI / 2; lot.position.copy(frame.vec(PARKING_W / 2, 28, 0.005)); lot.receiveShadow = true
  b.object(lot); b.disposables.push(asp)
  for (let i = 0; i < 18; i++) for (const y of [20.5, 35.5]) {
    const p = frame.vec(6 + i * 2.8, y)
    b.add(new THREE.PlaneGeometry(0.1, 4.6), '#f2f2ec', M.trs([p.x, 0.012, p.z], [-Math.PI / 2, 0, 0]), { cast: false })
  }
  for (let i = 0; i < 30; i++) {
    const side = i % 2 ? 17.3 : 38.8
    const p = frame.vec(3 + rnd() * 54, side + (rnd() - 0.5))
    b.add(new THREE.SphereGeometry(1, 10, 6), '#f4f7fa', M.trs([p.x, -0.1, p.z], [0, rnd() * 3, 0], [1.4 + rnd() * 1.6, 0.6 + rnd() * 0.4, 0.8 + rnd() * 0.5]))
  }
  // the parked cars, under their caps of snow
  const colors = ['#5b6f86', '#8a2f2a', '#d9d9d4', '#2f3a3a', '#6b7a5a', '#a9a9ae', '#1f2a44']
  for (let i = 0; i < 11; i++) {
    if (i === 6) continue
    const p = frame.vec(7.4 + i * 2.8 * 1.5, i % 3 === 0 ? 33.2 : 22.8)
    sedan(b, p, i % 3 === 0 ? -Math.PI / 2 : Math.PI / 2, colors[i % colors.length], snow)
  }
  // the dome: a huge white marshmallow sitting on the snow behind the lot
  const memT = membraneTexture()
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ map: memT, roughness: 0.85, emissive: '#ffffff', emissiveIntensity: 0.05 }))
  dome.scale.set(DOME_RX, DOME_TOP, DOME_RZ)
  dome.position.copy(frame.vec(30, 13.2 - DOME_RZ))
  b.object(dome); b.disposables.push(memT)
  // the revolving door in its little glass porch
  const d = frame.vec(PARKING_MARKS.door.x, PARKING_MARKS.door.y - 0.4)
  b.add(new THREE.BoxGeometry(5, 3.2, 3), '#d9dcdf', M.t(d.x, 1.6, d.z - 1.2), { mat: 'shiny' })
  b.add(new THREE.BoxGeometry(5.1, 0.25, 3.1), '#8a8e92', M.t(d.x, 3.3, d.z - 1.2), { mat: 'shiny' })
  b.add(new THREE.CylinderGeometry(1.25, 1.25, 2.6, 24, 1, true), '#a9c4d6', M.t(d.x, 1.3, d.z + 0.35), { mat: 'shiny', cast: false })
  for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.4; b.add(new THREE.BoxGeometry(1.2, 2.3, 0.04), '#9fb8c9', M.trs([d.x + Math.cos(a) * 0.6, 1.2, d.z + 0.35 + Math.sin(a) * 0.6], [0, -a, 0]), { mat: 'shiny', cast: false }) }
  // lamp posts and trees round the lot
  for (const x of [10, 30, 50]) {
    const p = frame.vec(x, 28)
    b.add(new THREE.CylinderGeometry(0.09, 0.12, 7, 8), '#3a3d40', M.t(p.x, 3.5, p.z), { mat: 'shiny' })
    b.add(new THREE.BoxGeometry(1.4, 0.2, 0.4), '#3a3d40', M.t(p.x, 7, p.z), { mat: 'shiny' })
  }
  const bark = b.material('bark', () => new THREE.MeshStandardMaterial({ map: barkTexture('#4f4741'), roughness: 0.95 }))
  for (let i = 0; i < 9; i++) bareTree(b, frame.vec(-6 + i * 9 + rnd() * 3, 44 + rnd() * 4), 8 + rnd() * 3, rnd, bark)
  for (let i = 0; i < 5; i++) pine(b, frame.vec(-10 + i * 4, 10 + rnd() * 6), 6 + rnd() * 2, snow)
  const group = b.build()
  stage.scene.add(group)
  return { group, marks: PARKING_MARKS, update() {}, dispose() { stage.scene.remove(group); b.dispose() } }
}
