// Part II, indoors in Waldorf: the little beige house (« une maison sous la maison » : the basement
// with the washing machine, the boiler that purrs like a big iron cat and the bare bulb on its wire,
// up the stairs the living room and the kitchen), Mrs. Patterson's small classroom (her board, where
// she draws a cooking pot and a hen), and the community centre gym where the futsal is played on
// Saturday mornings (« Le gymnase sent la cire et le chocolat chaud »).
import * as THREE from 'three'
import type { Frame, Stage } from '../../engine/render/stage'
import { FULL_W, type PitchGeom } from '../../engine/sim/pitch'
import { M, SetBuilder, canvasTexture, grain, seeded, type Marks } from './common'
import { floorTex, room, roomPitch } from './interiors'
import type { SetHandle } from './bonamoussadi'

/** A window pane with the snowy outside behind it (indoor places of Part II). */
function snowWindow(b: SetBuilder, frame: Frame, x: number, y: number, along: boolean, w: number, h: number, bottom: number, out: 1 | -1, onWall = false) {
  const p = frame.vec(x, y)
  const tex = b.material('outside', () => new THREE.MeshBasicMaterial({ map: canvasTexture(256, 256, (g, W, H) => {
    const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#c9d6e2'); grd.addColorStop(0.55, '#eef3f7'); grd.addColorStop(1, '#f7fafc')
    g.fillStyle = grd; g.fillRect(0, 0, W, H)
    const r = seeded(3)
    // bare branches and a roof line in the white
    g.strokeStyle = 'rgba(80,80,90,0.45)'; g.lineWidth = 2
    for (let i = 0; i < 9; i++) { const x0 = r() * W; g.beginPath(); g.moveTo(x0, H * 0.75); g.lineTo(x0 + (r() - 0.5) * 40, H * 0.3); g.stroke() }
    g.fillStyle = 'rgba(120,110,105,0.5)'; g.fillRect(W * 0.55, H * 0.55, W * 0.4, H * 0.12)
    for (let i = 0; i < 220; i++) { g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(r() * W, r() * H, 2, 2) }
  }), toneMapped: false, fog: false }))
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), tex)
  // in an opening the pane sits just outside; on a solid wall (high windows) just in front of it
  const off = onWall ? -out * 0.085 : out * 0.09
  pane.position.set(p.x + (along ? 0 : off), bottom + h / 2, p.z + (along ? off : 0))
  pane.rotation.y = along ? (out > 0 ? Math.PI : 0) : (out > 0 ? -Math.PI / 2 : Math.PI / 2)
  b.object(pane)
  // a white frame and a cross bar
  const fx = p.x + (along ? 0 : onWall ? off : 0), fz = p.z + (along ? (onWall ? off : 0) : 0)
  const fr = along ? new THREE.BoxGeometry(w + 0.12, 0.08, 0.1) : new THREE.BoxGeometry(0.1, 0.08, w + 0.12)
  b.add(fr.clone(), '#f4f2ee', M.t(fx, bottom, fz)); b.add(fr, '#f4f2ee', M.t(fx, bottom + h, fz))
  b.add(along ? new THREE.BoxGeometry(0.05, h, 0.08) : new THREE.BoxGeometry(0.08, h, 0.05), '#f4f2ee', M.t(fx, bottom + h / 2, fz))
}

/** Painted drywall, clean (Waldorf is not Bonamoussadi: no rain streaks, no red dust), with a baseboard. */
function paintTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    const r = seeded(77)
    g.fillStyle = '#f7f5f0'; g.fillRect(0, 0, w, h)
    grain(g, w, h, r, 900, ['#efece5', '#ffffff', '#ebe7df'], [1, 4])
    g.fillStyle = '#e2ddd2'; g.fillRect(0, h * 0.955, w, h * 0.045)
    g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(0, h * 0.952, w, 2)
  })
}

/** Painted concrete blocks (the gym). */
function paintedBlockTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    const r = seeded(9)
    g.fillStyle = '#d9d6ce'; g.fillRect(0, 0, w, h)
    for (let y = 0; y < h; y += 32) for (let x = (y / 32) % 2 ? -32 : 0; x < w; x += 64) {
      const v = 228 + r() * 8
      g.fillStyle = `rgb(${v},${v - 3},${v - 9})`; g.fillRect(x + 2, y + 2, 60, 28)
    }
    grain(g, w, h, r, 500, ['#e8e5dd', '#d4d0c6'], [1, 3])
  }, { repeat: [4, 2] })
}

/* ======================================================================== the house in Waldorf */

export const MAISON_US_W = 14
export const MAISON_US_H = 7
export const MAISON_US_MARKS: Marks = {
  cave: { x: 3.2, y: 3.8 },
  bulb: { x: 3.2, y: 3.4 },
  boiler: { x: 1.1, y: 1.2 },
  washer: { x: 4.6, y: 0.7 },
  stairs: { x: 5.7, y: 5.9 },
  salon: { x: 9.6, y: 4.2 },
  sofa: { x: 9.4, y: 6.1 },
  kitchen: { x: 10.8, y: 1.0 },
  table: { x: 12, y: 3.2 },
  door: { x: 13.6, y: 5.6 },
}

export const maisonUsPitch = () => roomPitch(MAISON_US_W, MAISON_US_H)

export function buildMaisonUS(stage: Stage, frame: Frame, opts: { night?: boolean } = {}): SetHandle {
  const q = stage.quality
  const b = new SetBuilder(frame, q.shadows)
  const plaster = b.material('paint', () => new THREE.MeshStandardMaterial({ map: paintTexture(), vertexColors: true, roughness: 0.9 }))
  const CAVE_H = 2.3, H = 2.5
  // the basement: grey concrete, cinder-block walls, pipes under the joists
  const cem = floorTex('cement'); cem.repeat.set(2, 2)
  const caveFloor = new THREE.Mesh(new THREE.PlaneGeometry(6.5, MAISON_US_H), new THREE.MeshStandardMaterial({ map: cem, roughness: 0.92, color: '#c9c6c0' }))
  caveFloor.rotation.x = -Math.PI / 2; caveFloor.position.copy(frame.vec(3.25, MAISON_US_H / 2)); caveFloor.receiveShadow = true
  b.object(caveFloor); b.disposables.push(cem)
  const block = b.material('block', () => new THREE.MeshStandardMaterial({ roughness: 0.95, map: canvasTexture(256, 256, (g, w, h) => {
    const r = seeded(8)
    g.fillStyle = '#b5b2ab'; g.fillRect(0, 0, w, h)
    for (let y = 0; y < h; y += 32) for (let x = (y / 32) % 2 ? -32 : 0; x < w; x += 64) { g.fillStyle = `rgb(${165 + r() * 20},${162 + r() * 20},${155 + r() * 18})`; g.fillRect(x + 2, y + 2, 60, 28) }
    grain(g, w, h, r, 900, ['#9a978f', '#c8c5be'], [1, 3])
  }, { repeat: [3, 1.5] }) }))
  room(b, 0, 0, 6.5, MAISON_US_H, CAVE_H, '#ffffff', block, [{ side: 'e', at: 3.2, width: 0.9, kind: 'gap' }], { louvres: false })
  const caveCeil = new THREE.Mesh(new THREE.PlaneGeometry(6.5, MAISON_US_H), new THREE.MeshStandardMaterial({ color: '#8a7a68', roughness: 1, side: THREE.DoubleSide }))
  caveCeil.rotation.x = Math.PI / 2; caveCeil.position.copy(frame.vec(3.25, MAISON_US_H / 2, CAVE_H)); b.object(caveCeil)
  for (let x = 0.4; x < 6.5; x += 0.6) b.add(new THREE.BoxGeometry(0.06, 0.2, MAISON_US_H), '#8a6a4a', M.t(frame.vec(x, 3.5).x, CAVE_H - 0.1, frame.vec(x, 3.5).z))
  for (const [y, r] of [[1.6, 0.045], [2.1, 0.03], [5.2, 0.05]] as const) b.add(new THREE.CylinderGeometry(r, r, 6.4, 8), y === 5.2 ? '#b87333' : '#7a7d80', M.trs([frame.vec(3.25, y).x, CAVE_H - 0.3, frame.vec(3.25, y).z], [0, 0, Math.PI / 2]), { mat: 'shiny' })
  // the boiler: a squat iron body, a little window of flame, pipes going up (« un gros chat en fer qui ronronne »)
  const bo = frame.vec(MAISON_US_MARKS.boiler.x, MAISON_US_MARKS.boiler.y)
  b.add(new THREE.BoxGeometry(1.1, 1.4, 0.9), '#3b3d40', M.t(bo.x, 0.7, bo.z), { mat: 'shiny' })
  b.add(new THREE.CylinderGeometry(0.16, 0.16, CAVE_H - 1.4, 10), '#7a7d80', M.t(bo.x, 1.4 + (CAVE_H - 1.4) / 2, bo.z), { mat: 'shiny' })
  const flame = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.12), new THREE.MeshBasicMaterial({ color: '#ff8a3a', toneMapped: false }))
  flame.position.set(bo.x, 0.4, bo.z + 0.452); b.object(flame)
  const glow = new THREE.PointLight('#ff9a4a', 1.4, 2.6, 2); glow.position.set(bo.x, 0.45, bo.z + 0.7); b.object(glow)
  // the washing machine and a laundry basket
  const wa = frame.vec(MAISON_US_MARKS.washer.x, MAISON_US_MARKS.washer.y)
  b.add(new THREE.BoxGeometry(0.66, 0.86, 0.62), '#eef0f0', M.t(wa.x, 0.43, wa.z), { mat: 'shiny' })
  b.add(new THREE.TorusGeometry(0.2, 0.035, 8, 20), '#9aa3aa', M.t(wa.x, 0.48, wa.z + 0.32), { mat: 'shiny' })
  b.add(new THREE.CircleGeometry(0.18, 18), '#4a5560', M.t(wa.x, 0.48, wa.z + 0.315), { mat: 'shiny' })
  b.add(new THREE.CylinderGeometry(0.26, 0.22, 0.34, 12), '#5a7a9a', M.t(wa.x - 0.9, 0.17, wa.z + 0.1))
  // the stairs up to the house
  for (let k = 0; k < 9; k++) {
    const st = frame.vec(5.7, 6.7 - k * 0.24)
    b.add(new THREE.BoxGeometry(1.0, 0.04, 0.26), '#9a7a58', M.t(st.x, 0.22 + k * 0.24, st.z))
  }
  // the bare bulb on its wire: it swings when the ball brushes it, and the shadows dance on the walls
  const bulbP = frame.vec(MAISON_US_MARKS.bulb.x, MAISON_US_MARKS.bulb.y)
  const pendulum = new THREE.Group()
  pendulum.position.set(bulbP.x, CAVE_H, bulbP.z)
  const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.55, 4), new THREE.MeshBasicMaterial({ color: '#1a1a1a' }))
  wire.position.y = -0.275
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff4d2', toneMapped: false }))
  bulb.position.y = -0.6
  const bulbLight = new THREE.PointLight('#ffe2b0', 8, 9, 1.6)
  bulbLight.position.y = -0.62
  bulbLight.castShadow = q.shadows
  bulbLight.shadow.mapSize.set(512, 512)
  pendulum.add(wire, bulb, bulbLight)
  b.object(pendulum)

  // upstairs: the living room and the kitchen, beige carpet, a window on the snow
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(MAISON_US_W - 6.5, MAISON_US_H), new THREE.MeshStandardMaterial({ color: '#c9b9a0', roughness: 1 }))
  carpet.rotation.x = -Math.PI / 2; carpet.position.copy(frame.vec(6.5 + (MAISON_US_W - 6.5) / 2, MAISON_US_H / 2)); carpet.receiveShadow = true
  b.object(carpet)
  room(b, 6.5, 0, MAISON_US_W, MAISON_US_H, H, '#e9e2d4', plaster, [
    { side: 's', at: 3.0, width: 1.6, kind: 'window' }, { side: 'e', at: 5.6, width: 0.95, kind: 'door', color: '#7a2e2a' }, { side: 'w', at: 3.2, width: 0.9, kind: 'gap' },
  ], { louvres: false, skip: ['w'] })
  snowWindow(b, frame, 9.5, MAISON_US_H, true, 1.5, 1.05, 0.98, 1)
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(MAISON_US_W - 6.5, MAISON_US_H), new THREE.MeshStandardMaterial({ color: '#f2efe8', roughness: 1, side: THREE.DoubleSide }))
  ceil.rotation.x = Math.PI / 2; ceil.position.copy(frame.vec(6.5 + (MAISON_US_W - 6.5) / 2, MAISON_US_H / 2, H)); b.object(ceil)
  const so = frame.vec(MAISON_US_MARKS.sofa.x, MAISON_US_MARKS.sofa.y)
  b.add(new THREE.BoxGeometry(2.1, 0.42, 0.85), '#5a6a7a', M.t(so.x, 0.21, so.z))
  b.add(new THREE.BoxGeometry(2.1, 0.5, 0.2), '#4f5e6c', M.t(so.x, 0.6, so.z + 0.33))
  // the kitchen along the north wall: counter, stove, fridge
  const k = frame.vec(MAISON_US_MARKS.kitchen.x, 0.35)
  b.add(new THREE.BoxGeometry(3.4, 0.9, 0.62), '#e6e1d6', M.t(k.x, 0.45, k.z))
  b.add(new THREE.BoxGeometry(3.44, 0.04, 0.66), '#6b6560', M.t(k.x, 0.92, k.z), { mat: 'shiny' })
  b.add(new THREE.BoxGeometry(0.76, 1.8, 0.7), '#f2f2f0', M.t(k.x + 2.2, 0.9, k.z), { mat: 'shiny' })
  for (const dx of [-0.25, 0.25]) for (const dz of [-0.12, 0.12]) b.add(new THREE.CylinderGeometry(0.09, 0.09, 0.012, 14), '#2a2a2a', M.t(k.x - 0.8 + dx, 0.945, k.z + dz))
  b.add(new THREE.CylinderGeometry(0.14, 0.12, 0.18, 14), '#7a8a96', M.t(k.x - 1.05, 1.03, k.z - 0.1), { mat: 'shiny' })
  const tb = frame.vec(MAISON_US_MARKS.table.x, MAISON_US_MARKS.table.y)
  b.add(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 20), '#8a6a4a', M.t(tb.x, 0.75, tb.z))
  b.add(new THREE.CylinderGeometry(0.06, 0.08, 0.73, 8), '#6b4a32', M.t(tb.x, 0.37, tb.z))
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; b.add(new THREE.BoxGeometry(0.42, 0.45, 0.42), '#7a5a3a', M.t(tb.x + Math.cos(a) * 0.85, 0.225, tb.z + Math.sin(a) * 0.85)) }
  // a lamp over the table
  const lampLight = new THREE.PointLight('#ffe6c4', opts.night ? 7 : 2.5, 8, 1.6)
  lampLight.position.set(tb.x, H - 0.5, tb.z)
  b.object(lampLight)
  b.add(new THREE.ConeGeometry(0.25, 0.2, 16, 1, true), '#e9dcc0', M.t(tb.x, H - 0.4, tb.z))
  // outside: snow all round the house
  const yard = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: '#eef2f6', roughness: 0.9 }))
  yard.rotation.x = -Math.PI / 2; yard.position.set(0, -0.02, 0); b.object(yard)
  const group = b.build()
  stage.scene.add(group)
  // the swing of the bulb, when the script says so: it settles down in a few seconds
  let swing = 0, t = 0
  return {
    group, marks: MAISON_US_MARKS,
    update(dt) {
      t += dt
      swing *= Math.exp(-0.35 * dt)
      pendulum.rotation.z = swing * Math.sin(t * 3.4)
      pendulum.rotation.x = swing * 0.4 * Math.sin(t * 3.4 + 1.3)
      flame.scale.y = 0.85 + 0.15 * Math.sin(t * 9)
      glow.intensity = 1.2 + 0.25 * Math.sin(t * 7)
    },
    cue(name) { if (name === 'swing') swing = 0.32 },
    dispose() { stage.scene.remove(group); b.dispose() },
  }
}

/* ======================================================================== Mrs. Patterson's classroom */

export const CLASSE_W = 9
export const CLASSE_H = 8
export const CLASSE_MARKS: Marks = {
  board: { x: 4.5, y: 0.3 },
  teacher: { x: 4.6, y: 1.5 },
  deskK: { x: 3.0, y: 3.6 },
  deskB: { x: 4.6, y: 3.6 },
  deskCoree: { x: 6.2, y: 3.6 },
  deskGuat: { x: 6.2, y: 5.2 },
  door: { x: 0.4, y: 6.6 },
}
export const classePitch = () => roomPitch(CLASSE_W, CLASSE_H)

/** The board: blank, then the cooking pot, then the pot and the hen with its feathers every which way. */
function boardTexture(stage: 0 | 1 | 2) {
  return canvasTexture(512, 256, (g, w, h) => {
    g.fillStyle = '#f6f7f6'; g.fillRect(0, 0, w, h)
    g.strokeStyle = 'rgba(160,170,175,0.25)'; g.lineWidth = 3
    for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(20 + i * 70, 30); g.lineTo(60 + i * 70, 200); g.stroke() }
    g.lineCap = 'round'; g.lineJoin = 'round'
    if (stage >= 1) {
      // the pot, in blue marker
      g.strokeStyle = '#2a4f9a'; g.lineWidth = 6
      g.beginPath(); g.moveTo(80, 120); g.lineTo(96, 200); g.lineTo(196, 200); g.lineTo(212, 120); g.closePath(); g.stroke()
      g.beginPath(); g.moveTo(70, 120); g.lineTo(222, 120); g.stroke()
      g.beginPath(); g.moveTo(80, 140); g.lineTo(50, 132); g.moveTo(212, 140); g.lineTo(242, 132); g.stroke()
      for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(110 + i * 35, 100); g.bezierCurveTo(100 + i * 35, 80, 125 + i * 35, 70, 112 + i * 35, 50); g.stroke() }
    }
    if (stage >= 2) {
      // the hen, in red marker, feathers every which way
      g.strokeStyle = '#b8261c'; g.lineWidth = 6
      g.beginPath(); g.ellipse(380, 150, 62, 44, 0, 0, Math.PI * 2); g.stroke()
      g.beginPath(); g.arc(432, 92, 22, 0, Math.PI * 2); g.stroke()
      g.beginPath(); g.moveTo(452, 92); g.lineTo(474, 98); g.lineTo(452, 102); g.stroke()
      g.beginPath(); g.moveTo(424, 70); g.lineTo(430, 56); g.lineTo(436, 70); g.lineTo(442, 58); g.lineTo(446, 74); g.stroke()
      for (let i = 0; i < 7; i++) { const a = Math.PI * 0.75 + i * 0.25; g.beginPath(); g.moveTo(330 + Math.cos(a) * 30, 150 + Math.sin(a) * 30); g.lineTo(330 + Math.cos(a) * 70, 150 + Math.sin(a) * 60); g.stroke() }
      for (const x of [365, 395]) { g.beginPath(); g.moveTo(x, 192); g.lineTo(x, 222); g.lineTo(x - 10, 230); g.moveTo(x, 222); g.lineTo(x + 10, 230); g.stroke() }
      g.fillStyle = '#1b1b1b'; g.beginPath(); g.arc(438, 88, 4, 0, Math.PI * 2); g.fill()
    }
  })
}

export function buildClasse(stage: Stage, frame: Frame): SetHandle {
  const q = stage.quality
  const b = new SetBuilder(frame, q.shadows)
  const rnd = seeded(5)
  const plaster = b.material('paint', () => new THREE.MeshStandardMaterial({ map: paintTexture(), vertexColors: true, roughness: 0.9 }))
  const H = 2.9
  const lino = canvasTexture(256, 256, (g, w, h) => {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#d9d4c6' : '#cfc9ba'; g.fillRect(x * 32, y * 32, 32, 32) }
    grain(g, w, h, rnd, 700, ['#e6e1d4', '#bdb7a8'], [1, 3])
  }, { repeat: [5, 4] })
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(CLASSE_W, CLASSE_H), new THREE.MeshStandardMaterial({ map: lino, roughness: 0.6 }))
  floor.rotation.x = -Math.PI / 2; floor.position.copy(frame.vec(CLASSE_W / 2, CLASSE_H / 2)); floor.receiveShadow = true
  b.object(floor); b.disposables.push(lino)
  room(b, 0, 0, CLASSE_W, CLASSE_H, H, '#f1e6bf', plaster, [
    { side: 'e', at: 2.5, width: 1.6, kind: 'window' }, { side: 'e', at: 5.2, width: 1.6, kind: 'window' }, { side: 'w', at: 6.6, width: 0.95, kind: 'door', color: '#5a7a9a' },
  ], { louvres: false })
  snowWindow(b, frame, CLASSE_W, 2.5, false, 1.5, 1.05, 0.98, 1)
  snowWindow(b, frame, CLASSE_W, 5.2, false, 1.5, 1.05, 0.98, 1)
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(CLASSE_W, CLASSE_H), new THREE.MeshStandardMaterial({ color: '#f4f2ec', roughness: 1, side: THREE.DoubleSide }))
  ceil.rotation.x = Math.PI / 2; ceil.position.copy(frame.vec(CLASSE_W / 2, CLASSE_H / 2, H)); b.object(ceil)
  for (const [x, y] of [[2.5, 2.5], [6.5, 2.5], [2.5, 5.5], [6.5, 5.5]]) {
    const p = frame.vec(x, y)
    b.add(new THREE.BoxGeometry(1.2, 0.04, 0.3), '#ffffff', M.t(p.x, H - 0.03, p.z))
  }
  const light = new THREE.PointLight('#fff6e8', 6, 14, 1.4); light.position.copy(frame.vec(CLASSE_W / 2, CLASSE_H / 2, H - 0.3)); b.object(light)
  // the whiteboard and its tray of markers
  const bp = frame.vec(CLASSE_MARKS.board.x, 0.08)
  const boards = [boardTexture(0), boardTexture(1), boardTexture(2)]
  const boardMat = new THREE.MeshStandardMaterial({ map: boards[0], roughness: 0.35 })
  const board = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.2), boardMat)
  board.position.set(bp.x, 1.55, bp.z + 0.02); b.object(board)
  b.disposables.push(...boards)
  b.add(new THREE.BoxGeometry(3.3, 1.3, 0.04), '#b9bec2', M.t(bp.x, 1.55, bp.z - 0.01), { mat: 'shiny' })
  b.add(new THREE.BoxGeometry(3.2, 0.04, 0.12), '#b9bec2', M.t(bp.x, 0.93, bp.z + 0.07), { mat: 'shiny' })
  for (let i = 0; i < 4; i++) b.add(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 6), ['#2a4f9a', '#b8261c', '#2f7a3a', '#1b1b1b'][i], M.trs([bp.x - 1.2 + i * 0.15, 0.96, bp.z + 0.08], [0, 0, Math.PI / 2]))
  // posters: colour shapes, the alphabet as blocks of colour (no words)
  for (let i = 0; i < 5; i++) b.add(new THREE.BoxGeometry(0.6, 0.45, 0.02), ['#e9a23b', '#4a90c2', '#7ab55c', '#d9534f', '#9b6bb3'][i], M.t(frame.vec(0.02, 1.2 + i * 1.1).x + 0.02, 1.9, frame.vec(0.02, 1.2 + i * 1.1).z), {})
  // the teacher's desk and the pupils' desks with their chairs
  const td = frame.vec(CLASSE_MARKS.teacher.x - 1.6, 1.4)
  b.add(new THREE.BoxGeometry(1.4, 0.75, 0.7), '#8a6a4a', M.t(td.x, 0.375, td.z))
  b.add(new THREE.BoxGeometry(0.3, 0.2, 0.22), '#d6cfc0', M.t(td.x + 0.4, 0.85, td.z))
  for (const k of ['deskK', 'deskB', 'deskCoree', 'deskGuat']) {
    const d = CLASSE_MARKS[k]
    for (const [dx, dy] of [[0, 0]]) {
      const p = frame.vec(d.x + dx, d.y + dy - 0.5)
      b.add(new THREE.BoxGeometry(0.75, 0.04, 0.5), '#c9b28a', M.t(p.x, 0.68, p.z))
      for (const [ex, ez] of [[-0.33, -0.2], [0.33, -0.2], [-0.33, 0.2], [0.33, 0.2]]) b.add(new THREE.CylinderGeometry(0.015, 0.015, 0.66, 6), '#6a6e72', M.t(p.x + ex, 0.33, p.z + ez), { mat: 'shiny' })
      const c = frame.vec(d.x, d.y)
      b.add(new THREE.BoxGeometry(0.4, 0.04, 0.38), '#3f6e8c', M.t(c.x, 0.44, c.z))
      b.add(new THREE.BoxGeometry(0.4, 0.36, 0.04), '#3f6e8c', M.t(c.x, 0.66, c.z + 0.2))
    }
  }
  for (const [x, y] of [[3.0, 5.2], [4.6, 5.2], [1.4, 3.6], [1.4, 5.2], [7.8, 3.6], [7.8, 5.2], [3.0, 6.8], [4.6, 6.8], [6.2, 6.8], [1.4, 6.8], [7.8, 6.8]]) {
    const p = frame.vec(x, y - 0.5)
    b.add(new THREE.BoxGeometry(0.75, 0.04, 0.5), '#c9b28a', M.t(p.x, 0.68, p.z))
    for (const [ex, ez] of [[-0.33, -0.2], [0.33, -0.2], [-0.33, 0.2], [0.33, 0.2]]) b.add(new THREE.CylinderGeometry(0.015, 0.015, 0.66, 6), '#6a6e72', M.t(p.x + ex, 0.33, p.z + ez), { mat: 'shiny' })
    const c = frame.vec(x, y)
    b.add(new THREE.BoxGeometry(0.4, 0.04, 0.38), '#3f6e8c', M.t(c.x, 0.44, c.z))
    b.add(new THREE.BoxGeometry(0.4, 0.36, 0.04), '#3f6e8c', M.t(c.x, 0.66, c.z + 0.2))
  }
  const yard = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: '#eef2f6', roughness: 0.9 }))
  yard.rotation.x = -Math.PI / 2; yard.position.set(0, -0.02, 0); b.object(yard)
  const group = b.build()
  stage.scene.add(group)
  return {
    group, marks: CLASSE_MARKS,
    update() {},
    cue(name) {
      const k = name === 'pot' ? 1 : name === 'chicken' ? 2 : name === 'clean' ? 0 : -1
      if (k >= 0) { boardMat.map = boards[k]; boardMat.needsUpdate = true }
    },
    dispose() { stage.scene.remove(group); b.dispose() },
  }
}

/* ======================================================================== the community centre gym */

export const GYM_W = 28
export const GYM_H = 16
export const GYM_MARKS: Marks = {
  center: { x: 14, y: 8 },
  bench: { x: 6, y: 15.2 },
  goalA: { x: 27, y: 8 },
  goalB: { x: 1, y: 8 },
  door: { x: 0.6, y: 14 },
  fountain: { x: 0.3, y: 12 },
}

/** Futsal goals (3 x 2 m) at both ends of the court. Our team attacks right. */
export function gymPitch(): PitchGeom {
  const goals = [
    { x: 27, y: 8, facing: -1 as const, width: 3, height: 2, depth: 0.8, mini: true, attackedBy: 'a' as const },
    { x: 1, y: 8, facing: 1 as const, width: 3, height: 2, depth: 0.8, mini: true, attackedBy: 'b' as const },
  ]
  return { view: 'grid', w: GYM_W, h: GYM_H, goals, offsetX: 0, markings: false, surface: 'parquet', walls: true, cones: [], goalFor: { a: goals[0], b: goals[1] }, fullLength: FULL_W }
}

function parquetTexture() {
  return canvasTexture(512, 512, (g, w, h) => {
    const r = seeded(19)
    for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? -64 : 0; x < w; x += 128) {
      const v = r()
      g.fillStyle = new THREE.Color('#c99a5e').lerp(new THREE.Color('#b07f45'), v).getStyle()
      g.fillRect(x, y, 127, 15)
    }
    grain(g, w, h, r, 600, ['#d8ae74', '#a87840'], [1, 6])
  }, { repeat: [6, 4] })
}

export function buildGym(stage: Stage, frame: Frame): SetHandle {
  const q = stage.quality
  const b = new SetBuilder(frame, q.shadows)
  const plaster = b.material('blocks', () => new THREE.MeshStandardMaterial({ map: paintedBlockTexture(), vertexColors: true, roughness: 0.88 }))
  const H = 7
  const pt = parquetTexture()
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(GYM_W + 4, GYM_H + 4), new THREE.MeshStandardMaterial({ map: pt, roughness: 0.32, metalness: 0.02 }))
  floor.rotation.x = -Math.PI / 2; floor.position.copy(frame.vec(GYM_W / 2, GYM_H / 2)); floor.receiveShadow = true
  b.object(floor); b.disposables.push(pt)
  // the court lines, painted: the outline, halfway, centre circle, the two areas (quarter circles)
  const line = b.material('line', () => new THREE.MeshBasicMaterial({ color: '#f4f2ec' }))
  const strip = (x0: number, y0: number, x1: number, y1: number) => {
    const a = frame.vec(x0, y0), c = frame.vec(x1, y1)
    const len = a.distanceTo(c)
    const g = new THREE.PlaneGeometry(len, 0.06)
    const ang = Math.atan2(c.z - a.z, c.x - a.x)
    b.add(g, '#f4f2ec', new THREE.Matrix4().compose(new THREE.Vector3((a.x + c.x) / 2, 0.006, (a.z + c.z) / 2), new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, -ang, 'YXZ')), new THREE.Vector3(1, 1, 1)), { mat: line, cast: false })
  }
  strip(1, 1, 27, 1); strip(1, 15, 27, 15); strip(1, 1, 1, 15); strip(27, 1, 27, 15); strip(14, 1, 14, 15)
  const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => { const n = 24; for (let i = 0; i < n; i++) { const u0 = a0 + (a1 - a0) * i / n, u1 = a0 + (a1 - a0) * (i + 1) / n; strip(cx + Math.cos(u0) * r, cy + Math.sin(u0) * r, cx + Math.cos(u1) * r, cy + Math.sin(u1) * r) } }
  arc(14, 8, 2.4, 0, Math.PI * 2)
  for (const [gx, s] of [[1, 1], [27, -1]] as const) { arc(gx, 6.5, 4.5, s > 0 ? -Math.PI / 2 : Math.PI / 2, s > 0 ? 0 : Math.PI); arc(gx, 9.5, 4.5, s > 0 ? 0 : Math.PI, s > 0 ? Math.PI / 2 : Math.PI * 1.5); strip(gx + s * 4.5, 6.5, gx + s * 4.5, 9.5) }
  // walls: painted block below, high windows on the snow above; a padded strip behind the goals
  room(b, -1, -1, GYM_W + 1, GYM_H + 1, H, '#d9d4c8', plaster, [{ side: 'w', at: 15, width: 1.6, kind: 'door', color: '#4f6a8a' }], { louvres: false })
  for (let i = 0; i < 6; i++) snowWindow(b, frame, 2 + i * 4.8, -1, true, 2.4, 1.2, 4.6, -1, true)
  for (const x of [-0.92, GYM_W + 0.92]) b.add(new THREE.BoxGeometry(0.08, 1.8, 6), '#2f4a6b', M.t(frame.vec(x, 8).x, 0.9, frame.vec(x, 8).z))
  b.add(new THREE.BoxGeometry(GYM_W + 2, 1.1, 0.06), '#2f4a6b', M.t(frame.vec(GYM_W / 2, -0.96).x, 0.55, frame.vec(GYM_W / 2, -0.96).z))
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(GYM_W + 2, GYM_H + 2), new THREE.MeshStandardMaterial({ color: '#cfd2d4', roughness: 1, side: THREE.DoubleSide }))
  ceil.rotation.x = Math.PI / 2; ceil.position.copy(frame.vec(GYM_W / 2, GYM_H / 2, H)); b.object(ceil)
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
    const p = frame.vec(4 + i * 6.7, 4 + j * 8)
    b.add(new THREE.BoxGeometry(1.4, 0.08, 0.6), '#ffffff', M.t(p.x, H - 0.05, p.z), { mat: b.material('panel', () => new THREE.MeshBasicMaterial({ color: '#fbfaf4' })) })
    const l = new THREE.PointLight('#f6f4ec', 9, 16, 1.4); l.position.set(p.x, H - 0.4, p.z); b.object(l)
  }
  // folded basketball hoops on the long walls
  for (const x of [7, 21]) {
    const p = frame.vec(x, -0.9)
    b.add(new THREE.BoxGeometry(1.6, 1.0, 0.06), '#f2f2ee', M.t(p.x, 5.2, p.z + 0.3), { mat: 'shiny' })
    b.add(new THREE.TorusGeometry(0.23, 0.015, 6, 16), '#d5652a', M.trs([p.x, 4.75, p.z + 0.6], [Math.PI / 2, 0, 0]), { mat: 'shiny' })
  }
  // the futsal goals: red and white posts, nets
  const netMat = b.material('net', () => new THREE.MeshStandardMaterial({ color: '#f2f2ee', wireframe: true, roughness: 0.6 }))
  for (const [gx, s] of [[27, 1], [1, -1]] as const) {
    const g = frame.vec(gx, 8)
    for (const dz of [-1.5, 1.5]) for (let k = 0; k < 4; k++) b.add(new THREE.BoxGeometry(0.08, 0.5, 0.08), k % 2 ? '#f4f2ec' : '#c9362b', M.t(g.x, 0.25 + k * 0.5, g.z + dz))
    for (let k = 0; k < 6; k++) b.add(new THREE.BoxGeometry(0.08, 0.08, 0.5), k % 2 ? '#f4f2ec' : '#c9362b', M.t(g.x, 2, g.z - 1.25 + k * 0.5))
    b.add(new THREE.BoxGeometry(0.8, 2, 3), '#f2f2ee', M.t(g.x + s * 0.4, 1, g.z), { mat: netMat, cast: false })
  }
  // the bench along the near side, a few parents' chairs, a table with the hot chocolate urn
  const be = frame.vec(GYM_MARKS.bench.x + 4, GYM_MARKS.bench.y + 0.4)
  b.add(new THREE.BoxGeometry(12, 0.06, 0.4), '#8a6a4a', M.t(be.x, 0.45, be.z))
  for (let i = 0; i < 6; i++) b.add(new THREE.BoxGeometry(0.06, 0.45, 0.35), '#6a6e72', M.t(be.x - 5.5 + i * 2.2, 0.22, be.z), { mat: 'shiny' })
  const tbl = frame.vec(22, 16.3)
  b.add(new THREE.BoxGeometry(1.8, 0.05, 0.7), '#e6e1d6', M.t(tbl.x, 0.75, tbl.z))
  for (const dx of [-0.8, 0.8]) b.add(new THREE.BoxGeometry(0.05, 0.75, 0.6), '#6a6e72', M.t(tbl.x + dx, 0.37, tbl.z), { mat: 'shiny' })
  b.add(new THREE.CylinderGeometry(0.16, 0.16, 0.42, 14), '#b9bec2', M.t(tbl.x - 0.4, 0.99, tbl.z), { mat: 'shiny' })
  for (let i = 0; i < 6; i++) b.add(new THREE.CylinderGeometry(0.04, 0.035, 0.1, 10), '#f4f2ec', M.t(tbl.x + 0.1 + (i % 3) * 0.12, 0.83, tbl.z - 0.1 + Math.floor(i / 3) * 0.14))
  // the drinking fountain by the door: a steel basin on a pedestal
  const fo = frame.vec(GYM_MARKS.fountain.x - 0.32, GYM_MARKS.fountain.y)
  b.add(new THREE.BoxGeometry(0.34, 0.8, 0.34), '#9aa0a4', M.t(fo.x, 0.4, fo.z), { mat: 'shiny' })
  b.add(new THREE.BoxGeometry(0.46, 0.14, 0.42), '#c9cdd0', M.t(fo.x, 0.86, fo.z), { mat: 'shiny' })
  b.add(new THREE.CylinderGeometry(0.018, 0.018, 0.08, 8), '#d9dde0', M.t(fo.x + 0.06, 0.96, fo.z), { mat: 'shiny' })
  const group = b.build()
  stage.scene.add(group)
  return { group, marks: GYM_MARKS, update() {}, dispose() { stage.scene.remove(group); b.dispose() } }
}
