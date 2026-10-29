// The pitch of Bonamoussadi (Douala), as tome 1 describes it: red earth turned to powder in the
// dry season and to mud in the rains, two leaning bamboo goals (« les bambous, eux, penchent »),
// the mango tree with Tonton Fokou's yellow bidon underneath, Monsieur Bilé's low wall and fence
// with its line of barbed wire on top, Madame Ekotto's red parasol, tin roofs all around.
// The pitch is the football area of the World (44 x 28 m, 8 against 8); the set is built around it.
import * as THREE from 'three'
import { addGroundDetail, bananaPlant, grassTufts, mangoTree, palmTree } from './nature'
import type { Frame, Stage } from '../../engine/render/stage'
import type { Goal, PitchGeom, Surface } from '../../engine/sim/pitch'
import { FULL_W } from '../../engine/sim/pitch'
import { crowdMeshes, type Spot } from './crowd'
import {
  M, SetBuilder, addHouse, canvasTexture, grain, meshTexture, plasterTexture, seeded, segmentMatrix, tinTexture, type Marks,
} from './common'

export const BONA_W = 44
export const BONA_H = 28
export const BONA_GOAL = { width: 5, height: 1.9 }

export function bonaPitch(surface: Surface = 'redEarth'): PitchGeom {
  const goals: Goal[] = [
    { x: BONA_W, y: BONA_H / 2, facing: -1, width: BONA_GOAL.width, height: BONA_GOAL.height, depth: 1.1, mini: false, attackedBy: 'a' },
    { x: 0, y: BONA_H / 2, facing: 1, width: BONA_GOAL.width, height: BONA_GOAL.height, depth: 1.1, mini: false, attackedBy: 'b' },
  ]
  return { view: 'grid', w: BONA_W, h: BONA_H, goals, offsetX: 0, markings: false, surface, walls: false, cones: [], goalFor: { a: goals[0], b: goals[1] }, fullLength: FULL_W, roam: 14 }
}

export type Crowd = 'none' | 'few' | 'many' | 'packed'
export interface BonaOpts {
  mud?: boolean; crowd?: Crowd; night?: boolean
  /** bits of bamboo planted in the mud (the triangles of ch04), sim metres */
  poles?: [number, number][]
  /** the day of the final (ch08): big drums set up by the mango tree */
  drums?: boolean
  /** Mami's yellow taxi, stopped in the lane beside the pitch (ch08) */
  taxi?: boolean
}

/** Named places of the set (sim metres). */
export const BONA_MARKS: Marks = {
  center: { x: 22, y: 14 },
  mango: { x: -3.5, y: -5.5 },
  bidon: { x: -1.6, y: -3.2 },
  fokou: { x: -1.2, y: -2.4 },
  wallFoot: { x: -6.5, y: -8.2 },
  wireTop: { x: -6.5, y: -9 },
  ekotto: { x: 48.2, y: 24.5 },
  goalA: { x: BONA_W, y: BONA_H / 2 },
  goalB: { x: 0, y: BONA_H / 2 },
  bileWall: { x: 10, y: -9 },
}
const WALL_Y = -9
const WALL_X0 = -16, WALL_X1 = 28

export interface SetHandle { group: THREE.Group; marks: Marks; update(dt: number, t: number): void; dispose(): void; /** a moment the set plays when the script says so */ cue?(name: string): void }

export function buildBonamoussadi(stage: Stage, frame: Frame, opts: BonaOpts = {}): SetHandle {
  const q = stage.quality
  const b = new SetBuilder(frame, q.shadows)
  const rnd = seeded(1990)
  const plaster = b.material('plaster', () => new THREE.MeshStandardMaterial({ map: plasterTexture(), vertexColors: true, roughness: 0.95 }))
  const tin = b.material('tin', () => new THREE.MeshStandardMaterial({ map: tinTexture(), vertexColors: true, roughness: 0.6, metalness: 0.25 }))

  /* ---------------- ground: red earth, worn where the game is played */
  const X0 = -44, X1 = 92, Y0 = -40, Y1 = 66
  const GW = X1 - X0, GH = Y1 - Y0
  const ppm = q.dpr >= 2 ? 8 : 6
  const tex = canvasTexture(Math.round(GW * ppm), Math.round(GH * ppm), (g, w, h) => {
    const s = w / GW
    const px = (x: number) => (x - X0) * s, py = (y: number) => (y - Y0) * s
    g.fillStyle = opts.mud ? '#6e3a26' : '#9e5a3c'
    g.fillRect(0, 0, w, h)
    // grass creeping in beyond the pitch: small tufts in clumps, thicker further out
    for (let k = 0; k < 900; k++) {
      const cx = X0 + rnd() * GW, cy = Y0 + rnd() * GH
      const out = Math.max(Math.max(-cx - 1, cx - BONA_W - 1, 0) / 9, Math.max(-cy - 9.5, cy - BONA_H - 1.5, 0) / 7)
      if (rnd() > Math.min(0.95, out)) continue
      const tufts = 6 + Math.floor(rnd() * 18)
      for (let i = 0; i < tufts; i++) {
        const x = cx + (rnd() - 0.5) * 2.4, y = cy + (rnd() - 0.5) * 1.6
        g.fillStyle = ['#6b7a35', '#7d8a3c', '#5d6b2e', '#8a8a45', '#4f6a2a'][i % 5]
        g.globalAlpha = 0.45 + rnd() * 0.45
        g.beginPath(); g.ellipse(px(x), py(y), (0.08 + rnd() * 0.22) * s, (0.05 + rnd() * 0.12) * s, rnd() * 3, 0, Math.PI * 2); g.fill()
      }
    }
    g.globalAlpha = 1
    grain(g, w, h, rnd, 6000, opts.mud ? ['#5a2a18', '#7e4430', '#63361f'] : ['#b06a46', '#8a4a30', '#c08a68', '#9a5034', '#a87a5c'], [1.5 * s / 8, 7 * s / 8])
    // the playing area: packed and paler where the feet go, darker goalmouths and centre
    const area = g.createRadialGradient(px(BONA_W / 2), py(BONA_H / 2), 2 * s, px(BONA_W / 2), py(BONA_H / 2), 26 * s)
    area.addColorStop(0, opts.mud ? 'rgba(60,30,20,0.35)' : 'rgba(205,150,115,0.42)'); area.addColorStop(1, 'rgba(205,150,115,0)')
    g.fillStyle = area; g.fillRect(0, 0, w, h)
    for (const gx of [0, BONA_W]) {
      const mouth = g.createRadialGradient(px(gx), py(BONA_H / 2), 0, px(gx), py(BONA_H / 2), 6 * s)
      mouth.addColorStop(0, 'rgba(90,35,18,0.55)'); mouth.addColorStop(1, 'rgba(90,35,18,0)')
      g.fillStyle = mouth; g.fillRect(0, 0, w, h)
    }
    // footprints and scuffs
    for (let i = 0; i < 2200; i++) {
      const x = 1 + rnd() * (BONA_W - 2), y = 1 + rnd() * (BONA_H - 2)
      g.fillStyle = rnd() < 0.5 ? 'rgba(120,45,22,0.35)' : 'rgba(230,160,115,0.3)'
      g.save(); g.translate(px(x), py(y)); g.rotate(rnd() * 6.28); g.fillRect(-0.12 * s, -0.05 * s, 0.24 * s, 0.1 * s); g.restore()
    }
    // the edges of the pitch are scraped lines in the dust, not chalk
    g.strokeStyle = opts.mud ? 'rgba(40,20,12,0.4)' : 'rgba(120,48,24,0.45)'; g.lineWidth = 0.18 * s
    g.setLineDash([1.6 * s, 0.9 * s])
    g.strokeRect(px(0), py(0), BONA_W * s, BONA_H * s)
    g.beginPath(); g.moveTo(px(BONA_W / 2), py(0)); g.lineTo(px(BONA_W / 2), py(BONA_H)); g.stroke()
    g.setLineDash([])
    if (opts.mud) {
      // puddles with « îles » of drier earth between them
      for (let i = 0; i < 46; i++) {
        const x = rnd() * BONA_W, y = rnd() * BONA_H
        g.fillStyle = 'rgba(52,26,16,0.75)'
        g.beginPath(); g.ellipse(px(x), py(y), (0.8 + rnd() * 2.6) * s, (0.5 + rnd() * 1.6) * s, rnd() * 3, 0, Math.PI * 2); g.fill()
      }
    }
    // stones
    for (let i = 0; i < 700; i++) { g.fillStyle = ['#d9c9b0', '#8a7a68', '#efe2cc'][i % 3]; g.fillRect(rnd() * w, rnd() * h, 1.5, 1.5) }
  })
  const gm = new THREE.MeshStandardMaterial({ map: tex, roughness: opts.mud ? 0.7 : 0.97 })
  addGroundDetail(gm, Math.round(GW / 1.6), opts.mud ? 0.3 : 0.5)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(GW, GH), gm)
  ground.rotation.x = -Math.PI / 2
  ground.position.copy(frame.vec(X0 + GW / 2, Y0 + GH / 2))
  ground.receiveShadow = true
  b.object(ground)
  b.disposables.push(tex)
  // beyond: plain earth to the horizon
  const far = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ color: opts.mud ? '#62382a' : '#8e5a40', roughness: 1 }))
  far.rotation.x = -Math.PI / 2; far.position.set(0, -0.03, 0)
  b.object(far)
  if (opts.mud) {
    // puddles that catch the sky
    const pm = new THREE.MeshStandardMaterial({ color: '#3d2418', roughness: 0.08, metalness: 0.3 })
    for (let i = 0; i < 18; i++) {
      const geo = new THREE.CircleGeometry(1, 20)
      geo.scale(0.8 + rnd() * 2.2, 0.5 + rnd() * 1.4, 1)
      const m = new THREE.Mesh(geo, pm)
      m.rotation.x = -Math.PI / 2; m.rotation.z = rnd() * 3
      m.position.copy(frame.vec(2 + rnd() * (BONA_W - 4), 2 + rnd() * (BONA_H - 4), 0.012))
      m.receiveShadow = true
      b.object(m)
    }
  }

  // tufts of grass where nobody runs: beyond the lines, along the wall, around the tree
  grassTufts(b, { x0: frame.x(-16), z0: frame.z(-8.6), x1: frame.x(BONA_W + 16), z1: frame.z(BONA_H + 9) }, Math.round(1100 * q.props), (x, z) => {
    const p = frame.toSim(new THREE.Vector3(x, 0, z))
    const out = Math.max(-p.x - 0.6, p.x - BONA_W - 0.6, -p.y - 0.6, p.y - BONA_H - 0.6)
    const nearMango = Math.hypot(p.x - BONA_MARKS.mango.x, p.y - BONA_MARKS.mango.y) < 2.2
    if (nearMango) return 0.05
    return out < 0 ? 0.004 : Math.min(0.9, 0.12 + out / 5)
  }, rnd)

  /* ---------------- the bamboo goals, leaning, with a tired net */
  const bamboo = '#c9b26a'
  // short bamboo stakes planted in the mud, a little crooked
  for (const [x, y] of opts.poles ?? []) {
    const at = frame.vec(x, y)
    const hh = 0.7 + rnd() * 0.25
    b.add(new THREE.CylinderGeometry(0.025, 0.03, hh, 7), bamboo, M.trs([at.x, hh / 2 - 0.08, at.z], [(rnd() - 0.5) * 0.25, 0, (rnd() - 0.5) * 0.25]), {})
    b.add(new THREE.TorusGeometry(0.028, 0.008, 4, 8), '#a88f4f', M.trs([at.x, hh * 0.55, at.z], [Math.PI / 2, 0, 0]))
  }
  for (const side of [0, 1]) {
    const gx = side ? BONA_W : 0, dir = side ? 1 : -1
    const lean = (side ? -0.07 : 0.05)
    const base = frame.vec(gx, BONA_H / 2)
    const w = BONA_GOAL.width, h = BONA_GOAL.height
    for (const s of [-1, 1]) {
      const geo = new THREE.CylinderGeometry(0.05, 0.06, h + 0.15, 8)
      b.add(geo, bamboo, M.trs([base.x, (h + 0.15) / 2, base.z + s * w / 2], [lean, 0, s * 0.02]), {})
      for (let k = 1; k < 4; k++) b.add(new THREE.TorusGeometry(0.058, 0.012, 4, 10), '#a88f4f', M.trs([base.x + Math.sin(-lean) * 0, (h / 4) * k, base.z + s * w / 2 + Math.sin(lean) * (h / 4) * k], [Math.PI / 2, 0, 0]))
    }
    const bar = new THREE.CylinderGeometry(0.045, 0.045, w + 0.3, 8)
    b.add(bar, bamboo, M.trs([base.x, h, base.z + Math.sin(lean) * h], [Math.PI / 2, 0, 0.04 * dir]))
    // lashings
    for (const s of [-1, 1]) b.add(new THREE.SphereGeometry(0.075, 6, 4), '#5a4a32', M.t(base.x, h, base.z + s * w / 2 + Math.sin(lean) * h), { mat: 'flat' })
    // the net: a sagging grid of old string behind the line
    const pts: number[] = []
    const d = 1.1
    for (let i = 0; i <= 14; i++) {
      const z = -w / 2 + (w * i) / 14
      const sag = 0.18 * Math.sin((i / 14) * Math.PI)
      pts.push(base.x, h, base.z + z + Math.sin(lean) * h, base.x + dir * d, 0.05, base.z + z)
      pts.push(base.x + dir * (d * 0.5 + sag), h * 0.55, base.z + z, base.x + dir * d, 0.05, base.z + z)
    }
    for (let k = 0; k <= 6; k++) {
      const u = k / 6
      const x = base.x + dir * d * u, y = h * (1 - u) + 0.05 * u
      pts.push(x, y, base.z - w / 2, x, y - 0.12, base.z + w / 2)
    }
    const ng = new THREE.BufferGeometry(); ng.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    const nm = new THREE.LineBasicMaterial({ color: opts.night ? '#7a7a70' : '#e8e2d2', transparent: true, opacity: 0.55 })
    b.object(new THREE.LineSegments(ng, nm))
    b.disposables.push(ng, nm)
  }
  // corner flags: sticks with rags
  for (const [cx, cy] of [[0, 0], [BONA_W, 0], [0, BONA_H], [BONA_W, BONA_H]]) {
    const p = frame.vec(cx, cy)
    b.add(new THREE.CylinderGeometry(0.02, 0.025, 1.4, 5), '#8a6a3a', M.t(p.x, 0.7, p.z))
    b.add(new THREE.PlaneGeometry(0.34, 0.24), ['#d63c2f', '#f2c230', '#3f8f4e', '#d63c2f'][(cx ? 1 : 0) + (cy ? 2 : 0)], M.trs([p.x + 0.17, 1.25, p.z], [0, 0, 0]), { mat: b.material('cloth', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide })) })
  }

  /* ---------------- the mango tree and Tonton Fokou's yellow bidon */
  const mango = frame.vec(BONA_MARKS.mango.x, BONA_MARKS.mango.y)
  mangoTree(b, mango, 6.2, 3.3, rnd, q.props)
  // a few mangoes
  for (let i = 0; i < 14; i++) {
    const a = rnd() * 6.28, r = 2 + rnd() * 3
    b.add(new THREE.SphereGeometry(0.09, 6, 5), rnd() < 0.5 ? '#c9a23a' : '#7a9a3a', M.trs([mango.x + Math.cos(a) * r, 3.6 + rnd() * 0.8, mango.z + Math.sin(a) * r], [0, 0, 0], [1, 1.3, 1]))
  }
  // roots and a ring of packed earth, a stone to sit on
  b.add(new THREE.CylinderGeometry(1.6, 1.8, 0.04, 20), '#7a3a20', M.t(mango.x, 0.02, mango.z), { cast: false })
  const bid = frame.vec(BONA_MARKS.bidon.x, BONA_MARKS.bidon.y)
  b.add(new THREE.BoxGeometry(0.36, 0.48, 0.26), '#f2c230', M.trs([bid.x, 0.24, bid.z], [0, 0.4, 0]), { mat: 'shiny' })
  b.add(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 8), '#d6a91f', M.t(bid.x + 0.06, 0.52, bid.z), { mat: 'shiny' })
  b.add(new THREE.TorusGeometry(0.07, 0.02, 5, 10, Math.PI), '#d6a91f', M.trs([bid.x - 0.06, 0.5, bid.z], [0, 0.4, 0]))

  /* ---------------- Monsieur Bilé's low wall, fence and barbed wire */
  const wa = frame.vec(WALL_X0, WALL_Y), wb = frame.vec(WALL_X1, WALL_Y)
  const wallLen = wa.distanceTo(wb)
  b.add(new THREE.BoxGeometry(wallLen, 1.05, 0.3), '#d9d0bf', segmentMatrix(wa, wb, 0.525), { mat: plaster })
  b.add(new THREE.BoxGeometry(wallLen, 0.06, 0.36), '#b9b0a0', segmentMatrix(wa, wb, 1.08), { mat: plaster })
  const fenceTop = 2.62
  for (let x = WALL_X0; x <= WALL_X1 + 0.01; x += 2.5) {
    const p = frame.vec(x, WALL_Y)
    b.add(new THREE.CylinderGeometry(0.03, 0.03, fenceTop - 1.05 + 0.25, 6), '#6b5a4a', M.t(p.x, (1.05 + fenceTop + 0.25) / 2, p.z), { mat: 'shiny' })
    // the angled arm that carries the barbed wire, leaning out over the pitch
    b.add(new THREE.CylinderGeometry(0.018, 0.018, 0.45, 5), '#6b5a4a', M.trs([p.x, fenceTop + 0.32, p.z + 0.12], [0.5, 0, 0]), { mat: 'shiny' })
  }
  const meshTex = meshTexture()
  meshTex.repeat.set(wallLen / 0.9, (fenceTop - 1.1) / 0.9)
  const fence = new THREE.Mesh(new THREE.PlaneGeometry(wallLen, fenceTop - 1.1), new THREE.MeshStandardMaterial({ map: meshTex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.4, color: '#bdbdb4' }))
  fence.position.set((wa.x + wb.x) / 2, (fenceTop + 1.1) / 2, wa.z)
  fence.castShadow = false
  b.object(fence)
  b.disposables.push(meshTex)
  // barbed wire: two strands with little crosses
  const bw: number[] = []
  for (const [dy, dz] of [[fenceTop + 0.12, 0.06], [fenceTop + 0.5, 0.26]]) {
    bw.push(wa.x, dy, wa.z + dz, wb.x, dy, wb.z + dz)
    for (let x = wa.x; x < wb.x; x += 0.22) bw.push(x - 0.04, dy - 0.04, wa.z + dz, x + 0.04, dy + 0.04, wa.z + dz, x - 0.04, dy + 0.04, wa.z + dz + 0.03, x + 0.04, dy - 0.04, wa.z + dz - 0.03)
  }
  const bwg = new THREE.BufferGeometry(); bwg.setAttribute('position', new THREE.Float32BufferAttribute(bw, 3))
  const bwm = new THREE.LineBasicMaterial({ color: '#4a4a46' })
  b.object(new THREE.LineSegments(bwg, bwm))
  b.disposables.push(bwg, bwm)
  // Bilé's house behind his fence
  addHouse(b, frame.vec(6, -16), 11, 6, 3.1, Math.PI, '#e6dccb', rnd, { plaster, tin })

  /* ---------------- Madame Ekotto: red parasol, table, basin of beignets */
  const ek = frame.vec(BONA_MARKS.ekotto.x, BONA_MARKS.ekotto.y)
  b.add(new THREE.CylinderGeometry(0.03, 0.03, 2.3, 6), '#e9e2d2', M.t(ek.x, 1.15, ek.z))
  b.add(new THREE.ConeGeometry(1.45, 0.55, 12, 1, true), '#c9362b', M.t(ek.x, 2.35, ek.z), { mat: b.material('parasol', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide })) })
  b.add(new THREE.BoxGeometry(1.1, 0.06, 0.65), '#8a6a4a', M.t(ek.x + 0.5, 0.78, ek.z - 0.35))
  for (const [dx, dz] of [[-0.45, -0.25], [0.45, -0.25], [-0.45, 0.25], [0.45, 0.25]]) b.add(new THREE.BoxGeometry(0.05, 0.76, 0.05), '#6a4a32', M.t(ek.x + 0.5 + dx, 0.38, ek.z - 0.35 + dz))
  b.add(new THREE.CylinderGeometry(0.3, 0.22, 0.16, 14), '#d9d9d2', M.t(ek.x + 0.4, 0.89, ek.z - 0.35), { mat: 'shiny' })
  for (let i = 0; i < 9; i++) b.add(new THREE.SphereGeometry(0.06, 6, 5), '#b8702a', M.t(ek.x + 0.4 + (rnd() - 0.5) * 0.36, 0.98, ek.z - 0.35 + (rnd() - 0.5) * 0.3), { mat: 'flat' })
  b.add(new THREE.CylinderGeometry(0.2, 0.2, 0.42, 10), '#3f6e8c', M.t(ek.x - 0.6, 0.21, ek.z + 0.3))

  /* ---------------- the quarter: houses, palms, banana plants, poles and wires */
  const houseColors = ['#e9c98f', '#c9dbe0', '#efe6d2', '#e2a77a', '#d6e2c4', '#f0d2a8', '#c4b4d6']
  const rows: { x0: number; x1: number; y: number; rot: number }[] = [
    { x0: 18, x1: 66, y: -18, rot: Math.PI },
    { x0: -34, x1: -6, y: -19, rot: Math.PI },
    { x0: -32, x1: 60, y: 52, rot: 0 },
  ]
  for (const r of rows) {
    for (let x = r.x0; x < r.x1; x += 8 + rnd() * 5) {
      const w = 6 + rnd() * 4, d = 5 + rnd() * 2, h = 2.7 + rnd() * 0.6
      addHouse(b, frame.vec(x + w / 2, r.y + (rnd() - 0.5) * 3), w, d, h, r.rot + (rnd() - 0.5) * 0.08, houseColors[Math.floor(rnd() * houseColors.length)], rnd, { plaster, tin })
    }
  }
  for (const [x0, rot] of [[-22, Math.PI / 2], [66, -Math.PI / 2]] as const) {
    for (let y = -6; y < 44; y += 9 + rnd() * 4) {
      const w = 6 + rnd() * 3, d = 5 + rnd() * 2
      addHouse(b, frame.vec(x0 + (rnd() - 0.5) * 3, y), w, d, 2.8 + rnd() * 0.5, rot, houseColors[Math.floor(rnd() * houseColors.length)], rnd, { plaster, tin })
    }
  }
  for (const [x, y, h] of [[-12, -4, 9], [56, -8, 11], [60, 36, 8], [-14, 34, 10], [30, 44, 9], [40, -13, 12], [-26, 10, 10]]) palmTree(b, frame.vec(x, y), h, 1.4 + rnd() * 1.6, rnd)
  for (const [x, y] of [[-9, 30], [52, 30], [54, 31.5], [-10, -1], [34, -12], [-18, 24]]) bananaPlant(b, frame.vec(x, y), rnd)
  mangoTree(b, frame.vec(58, 18), 3.8, 3.0, rnd, q.props * 0.6)
  b.add(new THREE.CylinderGeometry(0.22, 0.34, 3.6, 8), '#5a4232', M.t(frame.vec(58, 18).x, 1.8, frame.vec(58, 18).z))
  // electricity poles with sagging wires along the street behind the wall
  const wire: number[] = []
  let prev: THREE.Vector3 | null = null
  for (let x = -30; x <= 70; x += 18) {
    const p = frame.vec(x, -12.5)
    b.add(new THREE.CylinderGeometry(0.09, 0.12, 7.5, 6), '#6b5a48', M.t(p.x, 3.75, p.z))
    b.add(new THREE.BoxGeometry(1.2, 0.08, 0.08), '#6b5a48', M.t(p.x, 7.1, p.z))
    if (prev) for (const dz of [-0.5, 0.5]) {
      const n = 10
      for (let i = 0; i < n; i++) {
        const u0 = i / n, u1 = (i + 1) / n
        const sag = (u: number) => -0.8 * Math.sin(u * Math.PI)
        wire.push(prev.x + (p.x - prev.x) * u0 + dz, 7.1 + sag(u0), p.z, prev.x + (p.x - prev.x) * u1 + dz, 7.1 + sag(u1), p.z)
      }
    }
    prev = p
  }
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3))
  const wm = new THREE.LineBasicMaterial({ color: '#2a2622' })
  b.object(new THREE.LineSegments(wg, wm))
  b.disposables.push(wg, wm)
  // a couple of benskins parked by the road, a water drum, a pile of tyres
  for (const [x, y, rot] of [[-14, -12, 0.3], [-11.5, -12.6, 0.1], [32, -12.8, -0.2]]) {
    const p = frame.vec(x, y)
    const rq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot)
    const at = (lx: number, ly: number, lz: number) => new THREE.Vector3(lx, ly, lz).applyQuaternion(rq).add(p)
    for (const lx of [-0.65, 0.65]) b.add(new THREE.TorusGeometry(0.3, 0.07, 6, 14), '#1c1c1c', new THREE.Matrix4().compose(at(lx, 0.32, 0), rq, new THREE.Vector3(1, 1, 1)))
    b.add(new THREE.BoxGeometry(1.2, 0.24, 0.28), ['#c9362b', '#1f4f8c', '#2a2a2a'][Math.floor(rnd() * 3)], new THREE.Matrix4().compose(at(0, 0.62, 0), rq, new THREE.Vector3(1, 1, 1)), { mat: 'shiny' })
    b.add(new THREE.BoxGeometry(0.7, 0.1, 0.3), '#1a1a1a', new THREE.Matrix4().compose(at(-0.15, 0.8, 0), rq, new THREE.Vector3(1, 1, 1)))
    b.add(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 5), '#888', new THREE.Matrix4().compose(at(0.55, 1.0, 0), rq.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)), new THREE.Vector3(1, 1, 1)))
  }
  if (opts.drums) {
    // the final: big drums by the mango tree, hide heads laced on with cord
    const hide = b.material('hide', () => new THREE.MeshStandardMaterial({ color: '#e6d6b4', roughness: 0.85 }))
    for (const [x, y, h, r] of [[-6.4, -3.2, 1.05, 0.31], [-5.5, -2.3, 0.9, 0.27], [-7.3, -2.1, 1.15, 0.33], [-6.9, -4.3, 0.8, 0.25]]) {
      const p = frame.vec(x, y)
      b.add(new THREE.CylinderGeometry(r, r * 0.72, h, 16), '#6b3f22', M.t(p.x, h / 2, p.z))
      b.add(new THREE.CylinderGeometry(r * 1.04, r * 1.04, 0.05, 16), '#e6d6b4', M.t(p.x, h + 0.01, p.z), { mat: hide })
      b.add(new THREE.TorusGeometry(r * 1.03, 0.022, 5, 18), '#3a2416', M.trs([p.x, h - 0.04, p.z], [Math.PI / 2, 0, 0]))
      b.add(new THREE.TorusGeometry(r * 0.86, 0.02, 5, 18), '#3a2416', M.trs([p.x, h * 0.45, p.z], [Math.PI / 2, 0, 0]))
      // the cords, zigzag from the head ring down to the belt
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2, a2 = a + Math.PI / 10
        const top = new THREE.Vector3(p.x + Math.cos(a) * r * 1.02, h - 0.05, p.z + Math.sin(a) * r * 1.02)
        const bot = new THREE.Vector3(p.x + Math.cos(a2) * r * 0.87, h * 0.46, p.z + Math.sin(a2) * r * 0.87)
        b.add(new THREE.CylinderGeometry(0.008, 0.008, top.distanceTo(bot), 3), '#d9c8a0', segmentMatrix3(top, bot))
      }
    }
  }
  if (opts.taxi) {
    // a Douala taxi: yellow, a little dented, stopped in the lane between the houses and the pitch
    const p = frame.vec(-12.6, 10.6)
    const rq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2 + 0.05)
    const at = (lx: number, ly: number, lz: number) => new THREE.Vector3(lx, ly, lz).applyQuaternion(rq).add(p)
    const put = (geo: THREE.BufferGeometry, col: string, l: [number, number, number], opts2: Parameters<SetBuilder['add']>[3] = { mat: 'shiny' }) => b.add(geo, col, new THREE.Matrix4().compose(at(...l), rq, new THREE.Vector3(1, 1, 1)), opts2)
    put(new THREE.BoxGeometry(4.3, 0.62, 1.72), '#f2c230', [0, 0.6, 0])
    put(new THREE.BoxGeometry(2.2, 0.56, 1.56), '#f2c230', [-0.25, 1.18, 0])
    // glass all round the cabin
    put(new THREE.BoxGeometry(2.24, 0.42, 1.6), '#26303a', [-0.25, 1.2, 0])
    put(new THREE.BoxGeometry(0.04, 0.08, 1.62), '#f2c230', [-0.25, 1.2, 0])
    put(new THREE.BoxGeometry(4.36, 0.14, 1.76), '#3a3a3a', [0, 0.36, 0], {})
    for (const lx of [-1.38, 1.38]) for (const lz of [-0.78, 0.78]) {
      const wq = rq.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2))
      b.add(new THREE.CylinderGeometry(0.31, 0.31, 0.22, 14), '#151515', new THREE.Matrix4().compose(at(lx, 0.31, lz), wq, new THREE.Vector3(1, 1, 1)))
      b.add(new THREE.CylinderGeometry(0.17, 0.17, 0.235, 10), '#9a9a96', new THREE.Matrix4().compose(at(lx, 0.31, lz), wq, new THREE.Vector3(1, 1, 1)), { mat: 'shiny' })
    }
    for (const lz of [-0.6, 0.6]) {
      put(new THREE.BoxGeometry(0.05, 0.12, 0.3), '#f6f2e0', [2.16, 0.68, lz])
      put(new THREE.BoxGeometry(0.05, 0.1, 0.26), '#b8261c', [-2.16, 0.7, lz])
    }
  }
  const drum = frame.vec(-15, 30)
  b.add(new THREE.CylinderGeometry(0.32, 0.32, 0.9, 12), '#2f5a8c', M.t(drum.x, 0.45, drum.z), { mat: 'shiny' })
  for (let i = 0; i < 4; i++) b.add(new THREE.TorusGeometry(0.34, 0.12, 6, 14), '#1e1e1e', M.trs([frame.vec(50, -4).x, 0.12 + i * 0.22, frame.vec(50, -4).z], [Math.PI / 2, 0, 0]))

  /* ---------------- people of the quarter watching (instanced, cheap) */
  const crowd = opts.crowd ?? 'few'
  const spots: Spot[] = []
  const n = crowd === 'none' ? 0 : crowd === 'few' ? 22 : crowd === 'many' ? 70 : 160
  const density = Math.max(0.35, q.crowd)
  const count = Math.round(n * density)
  for (let i = 0; i < count; i++) {
    const zone = rnd()
    if (zone < 0.35) spots.push({ p: frame.vec(WALL_X0 + 2 + rnd() * (WALL_X1 - WALL_X0 - 4), WALL_Y + 0.12, 1.1), rot: 0, sit: true }) // on Bilé's wall
    else if (zone < 0.7) spots.push({ p: frame.vec(rnd() * BONA_W, BONA_H + 1.4 + rnd() * 3.5), rot: Math.PI, sit: false }) // along the near touchline
    else if (zone < 0.85) spots.push({ p: frame.vec(-2.5 - rnd() * 4, 2 + rnd() * (BONA_H - 4)), rot: Math.PI / 2, sit: false })
    else spots.push({ p: frame.vec(BONA_W + 2.5 + rnd() * 4, 1 + rnd() * (BONA_H - 6)), rot: -Math.PI / 2, sit: false })
  }
  if (crowd === 'packed') {
    // the roofs and the mango tree full of children (« roofs and mango tree full »)
    for (let i = 0; i < Math.round(30 * density); i++) spots.push({ p: frame.vec(20 + rnd() * 40, -18 + (rnd() - 0.5) * 2, 3.3), rot: 0, sit: true })
    for (let i = 0; i < Math.round(8 * density); i++) { const a = rnd() * 6.28; spots.push({ p: mango.clone().add(new THREE.Vector3(Math.cos(a) * 2, 2.6 + rnd() * 0.8, Math.sin(a) * 2)), rot: rnd() * 6.28, sit: true }) }
  }
  if (spots.length) {
    const c = crowdMeshes(spots, rnd, q.shadows)
    for (const m of c.meshes) b.object(m)
    b.disposables.push(c)
  }

  const group = b.build()
  stage.scene.add(group)
  stage.fitShadow(80, 70)
  return {
    group,
    marks: BONA_MARKS,
    update() {},
    dispose() { stage.scene.remove(group); b.dispose() },
  }
}

/** a Y-up mesh (a cylinder) stretched from a to b */
function segmentMatrix3(a: THREE.Vector3, b: THREE.Vector3) {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())
  return new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1))
}
