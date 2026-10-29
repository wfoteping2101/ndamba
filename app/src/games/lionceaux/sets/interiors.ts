// Indoor places of Part I: the family house in Douala (the living room under a bare bulb where
// Papa dances Milla's dance, the small blue bedroom with two beds and two mosquito nets) and
// Mami's compound in Bafoussam (the courtyard of the njangi, the small ochre room with the old
// black pedal sewing machine with its faded golden flowers, the iron trunk of fabric scraps).
import * as THREE from 'three'
import type { Frame, Stage } from '../../engine/render/stage'
import { FULL_W, type PitchGeom } from '../../engine/sim/pitch'
import { M, SetBuilder, addBanana, addHouse, canvasTexture, grain, plasterTexture, seeded, tinTexture, type Marks } from './common'
import type { SetHandle } from './bonamoussadi'

export function roomPitch(w: number, h: number): PitchGeom {
  return { view: 'grid', w, h, goals: [], offsetX: 0, markings: false, surface: 'concrete', walls: true, cones: [], goalFor: { a: null, b: null }, fullLength: FULL_W }
}

type Side = 'n' | 's' | 'e' | 'w'
interface Opening { side: Side; at: number; width: number; kind: 'door' | 'window' | 'gap'; color?: string }

/**
 * A room of plaster walls between sim x0..x1, y0..y1 with doors and windows cut out.
 * North is y0 (far from the default camera), south is y1.
 */
function room(b: SetBuilder, x0: number, y0: number, x1: number, y1: number, height: number, wall: string, plaster: THREE.Material, openings: Opening[], opts: { skip?: Side[]; louvres?: boolean } = {}) {
  const T = 0.14
  const sides: { side: Side; a: [number, number]; c: [number, number] }[] = [
    { side: 'n', a: [x0, y0], c: [x1, y0] }, { side: 's', a: [x0, y1], c: [x1, y1] },
    { side: 'w', a: [x0, y0], c: [x0, y1] }, { side: 'e', a: [x1, y0], c: [x1, y1] },
  ]
  for (const s of sides) {
    if (opts.skip?.includes(s.side)) continue
    const along = s.side === 'n' || s.side === 's'
    const L = along ? s.c[0] - s.a[0] : s.c[1] - s.a[1]
    const holes = openings.filter((o) => o.side === s.side).sort((p, q) => p.at - q.at)
    let cur = 0
    const seg = (from: number, to: number, y0w: number, y1w: number) => {
      if (to - from < 0.01) return
      const mid = (from + to) / 2
      const cx = along ? s.a[0] + mid : s.a[0], cy = along ? s.a[1] : s.a[1] + mid
      const p = b.at(cx, cy)
      const geo = along ? new THREE.BoxGeometry(to - from, y1w - y0w, T) : new THREE.BoxGeometry(T, y1w - y0w, to - from)
      b.add(geo, wall, M.t(p.x, (y0w + y1w) / 2, p.z), { mat: plaster, cast: false })
    }
    for (const o of holes) {
      const from = o.at - o.width / 2, to = o.at + o.width / 2
      seg(cur, from, 0, height)
      const top = o.kind === 'window' ? 2.05 : 2.1
      const bottom = o.kind === 'window' ? 0.95 : 0
      seg(from, to, top, height)
      if (bottom > 0) seg(from, to, 0, bottom)
      // frame and leaf
      const mid = o.at
      const cx = along ? s.a[0] + mid : s.a[0], cy = along ? s.a[1] : s.a[1] + mid
      const p = b.at(cx, cy)
      const frameGeo = along ? new THREE.BoxGeometry(o.width + 0.1, 0.08, T + 0.04) : new THREE.BoxGeometry(T + 0.04, 0.08, o.width + 0.1)
      b.add(frameGeo, '#6b4a32', M.t(p.x, top, p.z))
      if (o.kind === 'door') {
        // the leaf stands open into the room, square to the wall, hinged on one side of the opening
        const inward = s.side === 'n' || s.side === 'w' ? 1 : -1
        const w2 = o.width * 0.95
        const leaf = along ? new THREE.BoxGeometry(0.04, 2.05, w2) : new THREE.BoxGeometry(w2, 2.05, 0.04)
        const at = along ? [p.x - o.width / 2 + 0.03, 1.03, p.z + inward * w2 / 2] : [p.x + inward * w2 / 2, 1.03, p.z - o.width / 2 + 0.03]
        b.add(leaf, o.color ?? '#3f6e8c', M.t(at[0], at[1], at[2]))
      } else if (o.kind === 'window' && opts.louvres !== false) {
        // glass louvres (« naco ») in a metal frame
        for (let k = 0; k < 7; k++) {
          const y = 1.02 + k * 0.145
          const lv = along ? new THREE.BoxGeometry(o.width * 0.94, 0.012, 0.11) : new THREE.BoxGeometry(0.11, 0.012, o.width * 0.94)
          b.add(lv, '#b9d0d6', M.trs([p.x, y, p.z], along ? [0.35, 0, 0] : [0, 0, 0.35]), { mat: 'shiny', cast: false })
        }
      }
      cur = to
    }
    seg(cur, L, 0, height)
  }
}

function floorTex(kind: 'tiles' | 'cement' | 'earth' | 'wood') {
  return canvasTexture(512, 512, (g, w, h) => {
    const r = seeded(kind.length * 13)
    if (kind === 'tiles') {
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        g.fillStyle = (x + y) % 2 ? '#d8cdb8' : '#c4b59a'
        g.fillRect(x * 64, y * 64, 64, 64)
      }
      g.strokeStyle = 'rgba(80,60,40,0.35)'; g.lineWidth = 2
      for (let k = 0; k <= 8; k++) { g.beginPath(); g.moveTo(k * 64, 0); g.lineTo(k * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, k * 64); g.lineTo(w, k * 64); g.stroke() }
      grain(g, w, h, r, 600, ['#ffffff', '#a89a80'], [1, 3])
    } else if (kind === 'cement') {
      g.fillStyle = '#a9a196'; g.fillRect(0, 0, w, h)
      grain(g, w, h, r, 1600, ['#bdb5a9', '#958d82', '#b0a89c'], [2, 10])
    } else if (kind === 'earth') {
      g.fillStyle = '#9a5a36'; g.fillRect(0, 0, w, h)
      grain(g, w, h, r, 2200, ['#b06a40', '#86502e', '#a8643a', '#c88a5a'], [2, 12])
    } else {
      for (let y = 0; y < 16; y++) { g.fillStyle = y % 2 ? '#8a6242' : '#7a5538'; g.fillRect(0, y * 32, w, 32) }
      grain(g, w, h, r, 900, ['#6a4a30', '#9a7250'], [1, 4])
    }
  }, { repeat: [1, 1] })
}

/** A bed with a mosquito net hanging from the ceiling. */
function bedWithNet(b: SetBuilder, x: number, y: number, along: boolean, sheet: string, rnd: () => number, netMat: THREE.Material) {
  const p = b.at(x, y)
  const L = 1.9, W = 0.95
  const size = along ? [L, W] : [W, L]
  b.add(new THREE.BoxGeometry(size[0], 0.32, size[1]), '#6b4a32', M.t(p.x, 0.22, p.z))
  b.add(new THREE.BoxGeometry(size[0] - 0.06, 0.16, size[1] - 0.06), sheet, M.t(p.x, 0.45, p.z))
  const pil = along ? new THREE.Vector3(p.x - L / 2 + 0.3, 0.57, p.z) : new THREE.Vector3(p.x, 0.57, p.z - L / 2 + 0.3)
  b.add(new THREE.BoxGeometry(along ? 0.36 : 0.6, 0.1, along ? 0.6 : 0.36), '#f2eee3', M.t(pil.x, pil.y, pil.z))
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.add(new THREE.BoxGeometry(0.06, 0.5, 0.06), '#5a3a26', M.t(p.x + dx * (size[0] / 2 - 0.03), 0.25, p.z + dz * (size[1] / 2 - 0.03)))
  // the net: a translucent box gathered to a ring under the ceiling
  const net = new THREE.Mesh(new THREE.CylinderGeometry(0.25, Math.max(size[0], size[1]) * 0.62, 2.0, 16, 1, true), netMat)
  net.scale.set(along ? 1 : 0.58, 1, along ? 0.58 : 1)
  net.position.set(p.x, 1.55, p.z)
  b.object(net)
  void rnd
}

/* ======================================================================== the house in Douala */

export const MAISON_W = 12.4
export const MAISON_H = 6.6
export const MAISON_MARKS: Marks = {
  salon: { x: 3.4, y: 3.4 },
  sofa: { x: 2.2, y: 1.0 },
  table: { x: 5.2, y: 4.6 },
  laptop: { x: 5.0, y: 4.45 },
  door: { x: 0.4, y: 4.6 },
  chambre: { x: 9.8, y: 3.3 },
  bedB: { x: 9.3, y: 1.1 },
  bedK: { x: 9.3, y: 5.5 },
  desk: { x: 11.7, y: 3.3 },
  window: { x: 12.2, y: 3.3 },
}

export function buildMaison(stage: Stage, frame: Frame, opts: { night?: boolean } = {}): SetHandle {
  const q = stage.quality
  const b = new SetBuilder(frame, q.shadows)
  const rnd = seeded(42)
  const plaster = b.material('plaster', () => new THREE.MeshStandardMaterial({ map: plasterTexture(), vertexColors: true, roughness: 0.95 }))
  const H = 2.85
  // floors and ceiling
  const tiles = floorTex('tiles'); tiles.repeat.set(3.5, 3.3)
  const salonFloor = new THREE.Mesh(new THREE.PlaneGeometry(7, MAISON_H), new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.55 }))
  salonFloor.rotation.x = -Math.PI / 2; salonFloor.position.copy(frame.vec(3.5, MAISON_H / 2)); salonFloor.receiveShadow = true
  b.object(salonFloor)
  const cem = floorTex('cement'); cem.repeat.set(2, 2)
  const chFloor = new THREE.Mesh(new THREE.PlaneGeometry(MAISON_W - 7, MAISON_H), new THREE.MeshStandardMaterial({ map: cem, roughness: 0.9 }))
  chFloor.rotation.x = -Math.PI / 2; chFloor.position.copy(frame.vec(7 + (MAISON_W - 7) / 2, MAISON_H / 2)); chFloor.receiveShadow = true
  b.object(chFloor)
  b.disposables.push(tiles, cem)
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(MAISON_W, MAISON_H), new THREE.MeshStandardMaterial({ color: '#e9e2d2', roughness: 1, side: THREE.DoubleSide }))
  ceil.rotation.x = Math.PI / 2; ceil.position.copy(frame.vec(MAISON_W / 2, MAISON_H / 2, H))
  b.object(ceil)
  // walls: a warm cream living room, the boys' blue bedroom
  room(b, 0, 0, 7, MAISON_H, H, '#efe2c4', plaster, [
    { side: 'n', at: 2.4, width: 1.5, kind: 'window' }, { side: 'w', at: 4.6, width: 0.95, kind: 'door', color: '#6b3a2a' },
    { side: 'e', at: 3.4, width: 0.9, kind: 'gap' }, { side: 's', at: 4.6, width: 1.3, kind: 'window' },
  ])
  room(b, 7, 0, MAISON_W, MAISON_H, H, '#7fa6c9', plaster, [
    { side: 'e', at: 3.3, width: 1.2, kind: 'window' }, { side: 'w', at: 3.4, width: 0.9, kind: 'gap' },
  ], { skip: ['w'] })
  // the living room
  const sofa = frame.vec(MAISON_MARKS.sofa.x, 0.55)
  b.add(new THREE.BoxGeometry(2.3, 0.42, 0.85), '#8a3a2a', M.t(sofa.x, 0.21, sofa.z))
  b.add(new THREE.BoxGeometry(2.3, 0.55, 0.2), '#7a3224', M.t(sofa.x, 0.62, sofa.z - 0.33))
  for (const s of [-1, 1]) b.add(new THREE.BoxGeometry(0.2, 0.62, 0.85), '#7a3224', M.t(sofa.x + s * 1.15, 0.31, sofa.z))
  for (let i = 0; i < 3; i++) b.add(new THREE.BoxGeometry(0.66, 0.1, 0.6), ['#c9362b', '#f2c230', '#3f8f4e'][i], M.t(sofa.x - 0.72 + i * 0.72, 0.47, sofa.z + 0.05))
  const lt = frame.vec(2.2, 2.2)
  b.add(new THREE.BoxGeometry(1.1, 0.06, 0.6), '#6b4a32', M.t(lt.x, 0.42, lt.z))
  for (const [dx, dz] of [[-0.5, -0.25], [0.5, -0.25], [-0.5, 0.25], [0.5, 0.25]]) b.add(new THREE.BoxGeometry(0.05, 0.4, 0.05), '#5a3a26', M.t(lt.x + dx, 0.2, lt.z + dz))
  b.add(new THREE.CylinderGeometry(0.1, 0.08, 0.14, 10), '#e9e2d2', M.t(lt.x + 0.2, 0.52, lt.z), { mat: 'shiny' })
  // the dining table with the laptop
  const tb = frame.vec(MAISON_MARKS.table.x, MAISON_MARKS.table.y)
  b.add(new THREE.BoxGeometry(1.6, 0.06, 0.95), '#7a5538', M.t(tb.x, 0.76, tb.z))
  b.add(new THREE.PlaneGeometry(1.5, 0.85), '#f2eee3', M.trs([tb.x, 0.795, tb.z], [-Math.PI / 2, 0, 0]), { mat: b.material('cloth', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide })) })
  for (const [dx, dz] of [[-0.74, -0.42], [0.74, -0.42], [-0.74, 0.42], [0.74, 0.42]]) b.add(new THREE.BoxGeometry(0.06, 0.74, 0.06), '#5a3a26', M.t(tb.x + dx, 0.37, tb.z + dz))
  for (const [dx, dz, r] of [[-0.45, -0.75, 0], [0.45, -0.75, 0], [-0.45, 0.75, Math.PI], [0.45, 0.75, Math.PI], [1.1, 0, -Math.PI / 2]]) {
    const cp = new THREE.Vector3(tb.x + dx, 0, tb.z + dz)
    b.add(new THREE.BoxGeometry(0.44, 0.05, 0.44), '#6b4a32', M.t(cp.x, 0.46, cp.z))
    b.add(new THREE.BoxGeometry(0.44, 0.5, 0.05), '#6b4a32', M.trs([cp.x + Math.sin(r) * 0.2, 0.72, cp.z - Math.cos(r) * 0.2], [0, r, 0]))
    for (const [ex, ez] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) b.add(new THREE.BoxGeometry(0.04, 0.46, 0.04), '#5a3a26', M.t(cp.x + ex, 0.23, cp.z + ez))
  }
  // the laptop: base and screen with an old grainy match on it (no real picture, a glow)
  const lp = frame.vec(MAISON_MARKS.laptop.x, MAISON_MARKS.laptop.y)
  b.add(new THREE.BoxGeometry(0.36, 0.02, 0.25), '#2a2a2c', M.t(lp.x, 0.81, lp.z), { mat: 'shiny' })
  const screenTex = canvasTexture(128, 80, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#6f8a5a'); grd.addColorStop(1, '#3f6a3a')
    g.fillStyle = grd; g.fillRect(0, 0, w, h)
    const r = seeded(9)
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.18})`; g.fillRect(r() * w, r() * h, 1, 1) }
    for (let i = 0; i < 9; i++) { g.fillStyle = i < 5 ? '#2f7a3a' : '#f2f2ee'; g.fillRect(10 + r() * 108, 30 + r() * 40, 3, 6) }
  })
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.21), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }))
  screen.position.set(lp.x, 0.93, lp.z - 0.12); screen.rotation.x = -0.18
  b.object(screen); b.disposables.push(screenTex)
  b.add(new THREE.BoxGeometry(0.36, 0.23, 0.012), '#2a2a2c', M.trs([lp.x, 0.93, lp.z - 0.128], [-0.18, 0, 0]), { mat: 'shiny' })
  // a shelf with a radio, a plant, a calendar on the wall
  const sh = frame.vec(6.7, 1.2)
  b.add(new THREE.BoxGeometry(0.4, 1.2, 1.4), '#6b4a32', M.t(sh.x, 0.6, sh.z))
  b.add(new THREE.BoxGeometry(0.22, 0.16, 0.36), '#3a3a3a', M.t(sh.x, 1.28, sh.z - 0.3))
  b.add(new THREE.CylinderGeometry(0.12, 0.09, 0.22, 10), '#b8643a', M.t(sh.x, 1.31, sh.z + 0.35))
  b.add(new THREE.IcosahedronGeometry(0.22, 0), '#3f7a33', M.t(sh.x, 1.55, sh.z + 0.35), { mat: 'flat' })
  b.add(new THREE.BoxGeometry(0.02, 0.5, 0.36), '#f2eee3', M.t(frame.vec(6.93, 3.0).x, 1.75, frame.vec(6.93, 3.0).z))
  b.add(new THREE.BoxGeometry(0.025, 0.14, 0.36), '#c9362b', M.t(frame.vec(6.92, 3.0).x, 1.96, frame.vec(6.92, 3.0).z))
  // the bare bulb on its wire
  const bulbP = frame.vec(MAISON_MARKS.salon.x, MAISON_MARKS.salon.y)
  b.add(new THREE.CylinderGeometry(0.006, 0.006, 0.6, 4), '#222', M.t(bulbP.x, H - 0.3, bulbP.z))
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: opts.night ? '#fff2c8' : '#e9e2d2', toneMapped: !opts.night }))
  bulb.position.set(bulbP.x, H - 0.62, bulbP.z)
  b.object(bulb)
  if (opts.night) {
    const pl = new THREE.PointLight('#ffd9a0', 9, 9, 1.6)
    pl.position.copy(bulb.position)
    b.object(pl)
    const pl2 = new THREE.PointLight('#ffd9a0', 4, 7, 1.6)
    pl2.position.copy(frame.vec(MAISON_MARKS.chambre.x, MAISON_MARKS.chambre.y, H - 0.5))
    b.object(pl2)
  }
  // the bedroom: two beds, two nets, a small desk under the window
  const netMat = b.material('net', () => new THREE.MeshStandardMaterial({ color: '#f4f2ea', transparent: true, opacity: 0.32, side: THREE.DoubleSide, roughness: 1, depthWrite: false }))
  bedWithNet(b, MAISON_MARKS.bedB.x, MAISON_MARKS.bedB.y, true, '#2E6B45', rnd, netMat)
  bedWithNet(b, MAISON_MARKS.bedK.x, MAISON_MARKS.bedK.y, true, '#F2C230', rnd, netMat)
  const dk = frame.vec(MAISON_MARKS.desk.x, MAISON_MARKS.desk.y)
  b.add(new THREE.BoxGeometry(0.55, 0.05, 1.0), '#7a5538', M.t(dk.x, 0.72, dk.z))
  for (const [dx, dz] of [[-0.24, -0.45], [0.24, -0.45], [-0.24, 0.45], [0.24, 0.45]]) b.add(new THREE.BoxGeometry(0.04, 0.7, 0.04), '#5a3a26', M.t(dk.x + dx, 0.35, dk.z + dz))
  b.add(new THREE.BoxGeometry(0.22, 0.03, 0.3), '#3a6aa0', M.t(dk.x - 0.05, 0.76, dk.z - 0.1))
  b.add(new THREE.BoxGeometry(0.2, 0.02, 0.28), '#f2eee3', M.t(dk.x - 0.05, 0.785, dk.z + 0.2))
  // outside the bedroom window: the neighbours' tin roofs (« la lune posée sur les tôles »)
  const tin = b.material('tin', () => new THREE.MeshStandardMaterial({ map: tinTexture(), vertexColors: true, roughness: 0.6, metalness: 0.25 }))
  for (let i = 0; i < 4; i++) addHouse(b, frame.vec(MAISON_W + 6 + i * 2, -4 + i * 5), 6, 5, 2.7, -Math.PI / 2, ['#e9c98f', '#c9dbe0', '#efe6d2'][i % 3], rnd, { plaster, tin })
  const yard = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: '#8a4a2c', roughness: 1 }))
  yard.rotation.x = -Math.PI / 2; yard.position.set(0, -0.02, 0)
  b.object(yard)
  if (opts.night) {
    const moon = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 12), new THREE.MeshBasicMaterial({ color: '#f4f0dc', fog: false, toneMapped: false }))
    moon.position.copy(frame.vec(MAISON_W + 60, MAISON_H / 2 - 8, 16))
    b.object(moon)
  }
  addBanana(b, frame.vec(-2, 5.5), rnd)
  const group = b.build()
  stage.scene.add(group)
  return { group, marks: MAISON_MARKS, update() {}, dispose() { stage.scene.remove(group); b.dispose() } }
}

/* ======================================================================== Mami's compound in Bafoussam */

export const MAMI_W = 16
export const MAMI_H = 13
export const MAMI_MARKS: Marks = {
  cour: { x: 8, y: 8.5 },
  bench: { x: 11.5, y: 6.2 },
  gate: { x: 8, y: 12.8 },
  atelier: { x: 3.4, y: 2.0 },
  machine: { x: 2.4, y: 1.0 },
  stool: { x: 2.4, y: 1.65 },
  trunk: { x: 5.2, y: 0.8 },
  window: { x: 3.4, y: 0.05 },
  door: { x: 3.4, y: 4.0 },
  hens: { x: 13, y: 10 },
  table: { x: 8, y: 6.6 },
}

export function buildMami(stage: Stage, frame: Frame, opts: { night?: boolean; njangi?: boolean } = {}): SetHandle {
  const q = stage.quality
  const b = new SetBuilder(frame, q.shadows)
  const rnd = seeded(68)
  const plaster = b.material('plaster', () => new THREE.MeshStandardMaterial({ map: plasterTexture(), vertexColors: true, roughness: 0.95 }))
  const tin = b.material('tin', () => new THREE.MeshStandardMaterial({ map: tinTexture(), vertexColors: true, roughness: 0.6, metalness: 0.25 }))
  // beaten earth of the yard and beyond
  const earth = floorTex('earth'); earth.wrapS = earth.wrapT = THREE.RepeatWrapping; earth.repeat.set(6, 6)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ map: earth, roughness: 1 }))
  ground.rotation.x = -Math.PI / 2; ground.position.copy(frame.vec(MAMI_W / 2, MAMI_H / 2)); ground.receiveShadow = true
  b.object(ground); b.disposables.push(earth)
  // the house along the north side: the ochre sewing room (open to the camera), then the kitchen
  const H = 2.7
  const cem = floorTex('cement'); cem.repeat.set(1.5, 1.2)
  const rf = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 4), new THREE.MeshStandardMaterial({ map: cem, roughness: 0.9 }))
  rf.rotation.x = -Math.PI / 2; rf.position.copy(frame.vec(3.3, 2, 0.01)); rf.receiveShadow = true
  b.object(rf); b.disposables.push(cem)
  room(b, 0.2, 0, 6.4, 4, H, '#d9a04a', plaster, [
    { side: 'n', at: 3.2, width: 1.1, kind: 'window' }, { side: 's', at: 3.2, width: 0.95, kind: 'door', color: '#7a4a2a' },
  ], { louvres: false })
  room(b, 6.4, 0, 12.2, 4, H, '#e6d2b0', plaster, [{ side: 's', at: 2.8, width: 0.95, kind: 'door', color: '#3f6e8c' }], { skip: ['w'] })
  // roof over both rooms (tin), it does not cast inside so the sewing room keeps its light
  b.add(new THREE.BoxGeometry(12.6, 0.05, 5), '#b9b6ad', M.trs([frame.vec(6.2, 2).x, H + 0.2, frame.vec(6.2, 2).z], [0.1, 0, 0]), { mat: tin, cast: false })
  // the pedal sewing machine: black with faded golden flowers, on its iron stand with the treadle
  const mc = frame.vec(MAMI_MARKS.machine.x, MAMI_MARKS.machine.y)
  b.add(new THREE.BoxGeometry(0.95, 0.04, 0.5), '#5a3a26', M.t(mc.x, 0.78, mc.z))
  for (const s of [-1, 1]) {
    b.add(new THREE.BoxGeometry(0.04, 0.74, 0.42), '#1e1e1e', M.t(mc.x + s * 0.42, 0.39, mc.z), { mat: 'shiny' })
    b.add(new THREE.TorusGeometry(0.16, 0.02, 5, 14), '#1e1e1e', M.trs([mc.x + s * 0.42, 0.3, mc.z], [0, Math.PI / 2, 0]), { mat: 'shiny' })
  }
  b.add(new THREE.BoxGeometry(0.62, 0.03, 0.3), '#1e1e1e', M.trs([mc.x, 0.1, mc.z + 0.05], [0.2, 0, 0]), { mat: 'shiny' })
  const headTex = canvasTexture(128, 64, (g, w, h) => {
    g.fillStyle = '#141414'; g.fillRect(0, 0, w, h)
    const r = seeded(40)
    for (let i = 0; i < 9; i++) {
      const x = 10 + r() * 108, y = 10 + r() * 44
      g.fillStyle = `rgba(214,170,80,${0.25 + r() * 0.3})`
      for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(x + Math.cos(k * 1.25) * 5, y + Math.sin(k * 1.25) * 5, 4, 2, k * 1.25, 0, Math.PI * 2); g.fill() }
    }
  })
  const headMat = new THREE.MeshStandardMaterial({ map: headTex, roughness: 0.35, metalness: 0.2 })
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.13), headMat)
  arm.position.set(mc.x, 1.02, mc.z); b.object(arm)
  const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.13), headMat)
  pillar.position.set(mc.x + 0.19, 0.9, mc.z); b.object(pillar)
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.12), headMat)
  nose.position.set(mc.x - 0.2, 0.92, mc.z); b.object(nose)
  b.disposables.push(headTex, headMat)
  b.add(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 14), '#9a8a6a', M.trs([mc.x + 0.27, 1.0, mc.z], [0, 0, Math.PI / 2]), { mat: 'shiny' })
  // the stool, the iron trunk of scraps, a shelf of folded cloth
  const st = frame.vec(MAMI_MARKS.stool.x, MAMI_MARKS.stool.y)
  b.add(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 12), '#6b4a32', M.t(st.x, 0.45, st.z))
  for (let i = 0; i < 3; i++) { const a = (i / 3) * 6.28; b.add(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 5), '#5a3a26', M.t(st.x + Math.cos(a) * 0.13, 0.22, st.z + Math.sin(a) * 0.13)) }
  const tr = frame.vec(MAMI_MARKS.trunk.x, MAMI_MARKS.trunk.y)
  b.add(new THREE.BoxGeometry(0.9, 0.48, 0.52), '#4a5a6a', M.t(tr.x, 0.24, tr.z), { mat: 'shiny' })
  for (const s of [-1, 1]) b.add(new THREE.BoxGeometry(0.06, 0.5, 0.54), '#8a7a5a', M.t(tr.x + s * 0.3, 0.25, tr.z), { mat: 'shiny' })
  const wax = ['#c9362b', '#f0b92e', '#1f7a7a', '#2f5aa0', '#3f8f4e', '#b65a8a', '#e2a22a', '#7a3a8a']
  for (let i = 0; i < 9; i++) b.add(new THREE.BoxGeometry(0.22 + rnd() * 0.2, 0.03, 0.18 + rnd() * 0.1), wax[i % wax.length], M.trs([tr.x + (rnd() - 0.5) * 0.6, 0.5 + i * 0.012, tr.z + (rnd() - 0.5) * 0.3], [0, rnd() * 3, 0]))
  const shelf = frame.vec(0.45, 2.4)
  b.add(new THREE.BoxGeometry(0.35, 1.6, 1.3), '#6b4a32', M.t(shelf.x, 0.8, shelf.z))
  for (let k = 0; k < 4; k++) for (let j = 0; j < 3; j++) b.add(new THREE.BoxGeometry(0.3, 0.12, 0.36), wax[(k * 3 + j) % wax.length], M.t(shelf.x, 0.25 + k * 0.38, shelf.z - 0.42 + j * 0.42))
  // the courtyard: a bench, a bulb on a wire, a low wall with a gate, a water drum, hens
  const bn = frame.vec(MAMI_MARKS.bench.x, MAMI_MARKS.bench.y)
  b.add(new THREE.BoxGeometry(2.2, 0.06, 0.35), '#7a5538', M.t(bn.x, 0.45, bn.z))
  for (const s of [-1, 1]) b.add(new THREE.BoxGeometry(0.06, 0.44, 0.3), '#5a3a26', M.t(bn.x + s * 0.95, 0.22, bn.z))
  b.add(new THREE.BoxGeometry(2.2, 0.06, 0.35), '#7a5538', M.t(bn.x - 4.5, 0.45, bn.z + 2.6))
  for (const s of [-1, 1]) b.add(new THREE.BoxGeometry(0.06, 0.44, 0.3), '#5a3a26', M.t(bn.x - 4.5 + s * 0.95, 0.22, bn.z + 2.6))
  const bulbP = frame.vec(MAMI_MARKS.cour.x, MAMI_MARKS.cour.y - 2.5)
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: opts.night ? '#fff2c8' : '#e9e2d2', toneMapped: !opts.night }))
  bulb.position.set(bulbP.x, 2.6, bulbP.z); b.object(bulb)
  b.add(new THREE.CylinderGeometry(0.006, 0.006, 3.4, 4), '#222', M.trs([bulbP.x, 2.7, bulbP.z - 1.6], [Math.PI / 2 - 0.1, 0, 0]))
  if (opts.night) { const pl = new THREE.PointLight('#ffd9a0', 14, 14, 1.5); pl.position.copy(bulb.position); b.object(pl) }
  const wallPts: [number, number, number, number][] = [[-0.2, 4, -0.2, MAMI_H], [MAMI_W, 4, MAMI_W, MAMI_H], [-0.2, MAMI_H, 7, MAMI_H], [9, MAMI_H, MAMI_W, MAMI_H]]
  for (const [ax, ay, cx, cy] of wallPts) {
    const a = frame.vec(ax, ay), c = frame.vec(cx, cy)
    const len = a.distanceTo(c)
    const mid = a.clone().add(c).multiplyScalar(0.5)
    b.add(new THREE.BoxGeometry(ax === cx ? 0.22 : len, 1.5, ax === cx ? len : 0.22), '#c9b89a', M.t(mid.x, 0.75, mid.z), { mat: plaster })
  }
  if (opts.njangi) {
    // the njangi meeting: a small table in the middle with the big black book and the green metal box
    const tb = frame.vec(MAMI_MARKS.table.x, MAMI_MARKS.table.y)
    b.add(new THREE.BoxGeometry(1.0, 0.05, 0.6), '#7a5538', M.t(tb.x, 0.74, tb.z))
    for (const [dx, dz] of [[-0.45, -0.25], [0.45, -0.25], [-0.45, 0.25], [0.45, 0.25]]) b.add(new THREE.BoxGeometry(0.05, 0.72, 0.05), '#5a3a26', M.t(tb.x + dx, 0.36, tb.z + dz))
    b.add(new THREE.BoxGeometry(0.34, 0.05, 0.26), '#141414', M.t(tb.x - 0.22, 0.79, tb.z))
    b.add(new THREE.BoxGeometry(0.3, 0.16, 0.2), '#2f7a4a', M.t(tb.x + 0.24, 0.85, tb.z), { mat: 'shiny' })
    // benches in rows facing the table
    for (let r = 0; r < 3; r++) for (const s2 of [-1, 1]) {
      const p = frame.vec(MAMI_MARKS.table.x + s2 * 2.6, MAMI_MARKS.table.y + 1.6 + r * 1.2)
      b.add(new THREE.BoxGeometry(2.0, 0.06, 0.32), '#7a5538', M.t(p.x, 0.44, p.z))
      for (const e of [-0.85, 0.85]) b.add(new THREE.BoxGeometry(0.06, 0.42, 0.28), '#5a3a26', M.t(p.x + e, 0.21, p.z))
    }
  }
  const dr = frame.vec(14.5, 5)
  b.add(new THREE.CylinderGeometry(0.32, 0.32, 0.9, 12), '#2f5a8c', M.t(dr.x, 0.45, dr.z), { mat: 'shiny' })
  for (let i = 0; i < 5; i++) {
    const h = frame.vec(MAMI_MARKS.hens.x + (rnd() - 0.5) * 3, MAMI_MARKS.hens.y + (rnd() - 0.5) * 2)
    const c = ['#7a4a2a', '#f2eee3', '#3a2a22', '#a8643a'][i % 4]
    b.add(new THREE.SphereGeometry(0.16, 8, 6), c, M.trs([h.x, 0.25, h.z], [0, rnd() * 6, 0], [1.2, 0.9, 0.8]), { mat: 'flat' })
    b.add(new THREE.SphereGeometry(0.07, 6, 5), c, M.t(h.x + 0.16, 0.42, h.z), { mat: 'flat' })
    b.add(new THREE.ConeGeometry(0.03, 0.06, 4), '#c9362b', M.t(h.x + 0.17, 0.5, h.z), { mat: 'flat' })
  }
  // neighbours' houses, eucalyptus and banana plants around, hills in the distance
  for (let i = 0; i < 5; i++) addHouse(b, frame.vec(-10 + i * 9, 20 + rnd() * 3), 6, 5, 2.7, 0, ['#d9a04a', '#e6d2b0', '#c97a4a'][i % 3], rnd, { plaster, tin })
  for (const [x, y] of [[17.5, 2], [18, 9], [-2, 8], [15, 14.5]]) addBanana(b, frame.vec(x, y), rnd)
  for (let i = 0; i < 14; i++) {
    const p = frame.vec(-20 + rnd() * 56, -8 - rnd() * 14)
    const h = 9 + rnd() * 7
    b.add(new THREE.CylinderGeometry(0.12, 0.2, h, 6), '#c9bfae', M.t(p.x, h / 2, p.z))
    b.add(new THREE.ConeGeometry(1.4, h * 0.5, 6), '#5a7a4a', M.t(p.x, h * 0.9, p.z), { mat: 'flat' })
  }
  for (let i = 0; i < 6; i++) {
    const hill = new THREE.SphereGeometry(30 + rnd() * 25, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2)
    const p = frame.vec(-60 + i * 30, -70 - rnd() * 30)
    b.add(hill, new THREE.Color('#4f7a3f').offsetHSL(0, 0, (rnd() - 0.5) * 0.08), M.trs([p.x, -8, p.z], [0, 0, 0], [1, 0.45, 1]), { mat: 'flat', cast: false })
  }
  const group = b.build()
  stage.scene.add(group)
  return { group, marks: MAMI_MARKS, update() {}, dispose() { stage.scene.remove(group); b.dispose() } }
}
