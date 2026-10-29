// Around Bafoussam (chapter 2): the green hills, a red-earth road with the vulcanisateur at the
// crossroads, and the pitch of the cousins: « une pente d'herbe entre deux champs de maïs », with
// stones for goals, where the evening fog comes down « comme si quelqu'un avait renversé un grand
// bol de lait sur le monde ». The football area is 34 x 20 m; the road and the shed are beyond.
import * as THREE from 'three'
import type { Frame, Stage } from '../../engine/render/stage'
import { FULL_W, type Goal, type PitchGeom } from '../../engine/sim/pitch'
import { M, SetBuilder, addBanana, addHouse, canvasTexture, grain, plasterTexture, seeded, tinTexture, type Marks } from './common'
import type { SetHandle } from './bonamoussadi'

export const HILL_W = 34
export const HILL_H = 20

export function hillPitch(): PitchGeom {
  const goals: Goal[] = [
    { x: HILL_W, y: HILL_H / 2, facing: -1, width: 3.2, height: 1.2, depth: 0.6, mini: true, attackedBy: 'a' },
    { x: 0, y: HILL_H / 2, facing: 1, width: 3.2, height: 1.2, depth: 0.6, mini: true, attackedBy: 'b' },
  ]
  return { view: 'grid', w: HILL_W, h: HILL_H, goals, offsetX: 0, markings: false, surface: 'grass', walls: false, cones: [], goalFor: { a: goals[0], b: goals[1] }, fullLength: FULL_W, roam: 12 }
}

export const HILL_MARKS: Marks = {
  center: { x: 17, y: 10 },
  road: { x: -9, y: 10 },
  shed: { x: -12, y: 2 },
  pump: { x: -10.5, y: 4.5 },
  crossroads: { x: -9, y: -4 },
  goat: { x: 20, y: 6 },
}

export function buildBafoussam(stage: Stage, frame: Frame): SetHandle {
  const q = stage.quality
  const b = new SetBuilder(frame, q.shadows)
  const rnd = seeded(2)
  // ground: hill grass, worn on the pitch, a red-earth road
  const X0 = -40, X1 = 70, Y0 = -40, Y1 = 60
  const GW = X1 - X0, GH = Y1 - Y0
  const ppm = 6
  const tex = canvasTexture(GW * ppm, GH * ppm, (g, w, h) => {
    const s = ppm
    const px = (x: number) => (x - X0) * s, py = (y: number) => (y - Y0) * s
    g.fillStyle = '#5f8a3a'; g.fillRect(0, 0, w, h)
    grain(g, w, h, rnd, 9000, ['#6f9a45', '#4f7a30', '#7aa04f', '#567f34'], [1, 5])
    // the pitch, trampled to earth in the middle and at the stones
    const area = g.createRadialGradient(px(HILL_W / 2), py(HILL_H / 2), 2 * s, px(HILL_W / 2), py(HILL_H / 2), 18 * s)
    area.addColorStop(0, 'rgba(140,96,60,0.6)'); area.addColorStop(1, 'rgba(140,96,60,0)')
    g.fillStyle = area; g.fillRect(0, 0, w, h)
    for (const gx of [0, HILL_W]) {
      const m = g.createRadialGradient(px(gx), py(HILL_H / 2), 0, px(gx), py(HILL_H / 2), 4 * s)
      m.addColorStop(0, 'rgba(120,70,40,0.75)'); m.addColorStop(1, 'rgba(120,70,40,0)')
      g.fillStyle = m; g.fillRect(0, 0, w, h)
    }
    // the road: red earth with ruts, and the crossroads
    g.fillStyle = '#a5562e'
    g.fillRect(px(-12), 0, 6 * s, h)
    g.fillRect(0, py(-7), w, 6 * s)
    grain(g, w, h, rnd, 1600, ['#b8683a', '#8a4424'], [1, 4])
    g.strokeStyle = 'rgba(80,35,20,0.5)'; g.lineWidth = 0.25 * s
    for (const dx of [-10.6, -7.4]) { g.beginPath(); g.moveTo(px(dx), 0); g.lineTo(px(dx), h); g.stroke() }
  })
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(GW, GH), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }))
  ground.rotation.x = -Math.PI / 2; ground.position.copy(frame.vec(X0 + GW / 2, Y0 + GH / 2)); ground.receiveShadow = true
  b.object(ground); b.disposables.push(tex)
  // stones for goals
  for (const gx of [0, HILL_W]) for (const s of [-1, 1]) {
    const p = frame.vec(gx, HILL_H / 2 + s * 1.6)
    b.add(new THREE.DodecahedronGeometry(0.28, 0), '#8a8378', M.trs([p.x, 0.16, p.z], [rnd(), rnd(), rnd()], [1, 0.7, 1]), { mat: 'flat' })
  }
  // the two maize fields on the long sides: rows of tall stalks with leaves and tassels
  const stalk = new THREE.CylinderGeometry(0.02, 0.03, 2.2, 4); stalk.translate(0, 1.1, 0)
  const leaf = new THREE.PlaneGeometry(0.12, 0.9); leaf.translate(0, 0.45, 0)
  const field: { x: number; y: number }[] = []
  for (const [y0, y1] of [[-14, -2.5], [HILL_H + 2.5, HILL_H + 16]]) for (let y = y0; y < y1; y += 0.85) for (let x = -2; x < HILL_W + 6; x += 0.7) field.push({ x: x + (rnd() - 0.5) * 0.3, y: y + (rnd() - 0.5) * 0.3 })
  const n = Math.round(field.length * Math.max(0.4, q.props))
  const stM = new THREE.InstancedMesh(stalk, new THREE.MeshStandardMaterial({ color: '#7a9a3a', roughness: 0.9 }), n)
  const lfM = new THREE.InstancedMesh(leaf, new THREE.MeshStandardMaterial({ color: '#5f8a2e', roughness: 0.8, side: THREE.DoubleSide }), n * 3)
  const m4 = new THREE.Matrix4()
  for (let i = 0; i < n; i++) {
    const f = field[Math.floor((i / n) * field.length)]
    const p = frame.vec(f.x, f.y)
    const sc = 0.8 + rnd() * 0.4
    m4.compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler((rnd() - 0.5) * 0.1, rnd() * 6, (rnd() - 0.5) * 0.1)), new THREE.Vector3(1, sc, 1))
    stM.setMatrixAt(i, m4)
    for (let k = 0; k < 3; k++) {
      m4.compose(new THREE.Vector3(p.x, (0.6 + k * 0.5) * sc, p.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rnd() * 6, 0.9 + rnd() * 0.4, 'YXZ')), new THREE.Vector3(1, 1, 1))
      lfM.setMatrixAt(i * 3 + k, m4)
    }
  }
  stM.castShadow = q.shadows; lfM.castShadow = q.shadows
  b.object(stM); b.object(lfM)
  b.disposables.push(stalk, leaf, stM.material as THREE.Material, lfM.material as THREE.Material)
  // the vulcanisateur's shed at the crossroads: a tin roof on poles, tyres, a hand pump, a bench
  const plaster = b.material('plaster', () => new THREE.MeshStandardMaterial({ map: plasterTexture(), vertexColors: true, roughness: 0.95 }))
  const tin = b.material('tin', () => new THREE.MeshStandardMaterial({ map: tinTexture(), vertexColors: true, roughness: 0.6, metalness: 0.25 }))
  const sh = frame.vec(HILL_MARKS.shed.x, HILL_MARKS.shed.y)
  for (const [dx, dz] of [[-1.6, -1.2], [1.6, -1.2], [-1.6, 1.2], [1.6, 1.2]]) b.add(new THREE.CylinderGeometry(0.06, 0.07, 2.5, 6), '#6b553f', M.t(sh.x + dx, 1.25, sh.z + dz))
  b.add(new THREE.BoxGeometry(3.8, 0.05, 3.0), '#b9b0a0', M.trs([sh.x, 2.55, sh.z], [0.1, 0, 0]), { mat: tin })
  for (let i = 0; i < 7; i++) b.add(new THREE.TorusGeometry(0.34, 0.12, 6, 14), '#1e1e1e', M.trs([sh.x - 1.2 + (i % 3) * 0.15, 0.12 + Math.floor(i / 3) * 0.24 + (i % 3) * 0.24, sh.z - 0.6], [Math.PI / 2, 0, 0]))
  b.add(new THREE.TorusGeometry(0.42, 0.13, 6, 14), '#1e1e1e', M.trs([sh.x + 0.9, 0.55, sh.z + 0.6], [0, 0.4, 0]))
  const pump = frame.vec(HILL_MARKS.pump.x, HILL_MARKS.pump.y)
  b.add(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8), '#3f5a7a', M.t(pump.x, 0.4, pump.z), { mat: 'shiny' })
  b.add(new THREE.BoxGeometry(0.3, 0.03, 0.12), '#3f5a7a', M.t(pump.x, 0.02, pump.z), { mat: 'shiny' })
  b.add(new THREE.BoxGeometry(0.34, 0.04, 0.04), '#1e1e1e', M.t(pump.x, 0.82, pump.z))
  b.add(new THREE.BoxGeometry(1.4, 0.05, 0.3), '#7a5538', M.t(sh.x + 0.6, 0.42, sh.z + 1.0))
  b.add(new THREE.BoxGeometry(0.4, 0.6, 0.4), '#c9362b', M.t(sh.x - 0.5, 0.3, sh.z + 0.8), { mat: 'shiny' }) // a red compressor tank
  // houses along the road, a kiosk of fruit, banana plants, eucalyptus on the hills
  for (let i = 0; i < 5; i++) addHouse(b, frame.vec(-22, -18 + i * 10), 6, 5, 2.7, Math.PI / 2, ['#d9a04a', '#e6d2b0', '#c97a4a', '#e9c98f'][i % 4], rnd, { plaster, tin })
  for (const [x, y] of [[-5, -10], [-16, 16], [-4, 26], [40, -4], [40, 25]]) addBanana(b, frame.vec(x, y), rnd)
  for (let i = 0; i < 22; i++) {
    const p = frame.vec(-30 + rnd() * 100, (rnd() < 0.5 ? -24 - rnd() * 14 : 40 + rnd() * 14))
    const h = 10 + rnd() * 8
    b.add(new THREE.CylinderGeometry(0.12, 0.22, h, 6), '#c9bfae', M.t(p.x, h / 2, p.z))
    b.add(new THREE.ConeGeometry(1.6, h * 0.55, 6), new THREE.Color('#577a45').offsetHSL(0, 0, (rnd() - 0.5) * 0.1), M.t(p.x, h * 0.85, p.z), { mat: 'flat' })
  }
  // the hills all around
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const r = 110 + rnd() * 60
    const hill = new THREE.SphereGeometry(40 + rnd() * 30, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2)
    const c = frame.vec(HILL_W / 2, HILL_H / 2)
    b.add(hill, new THREE.Color('#4f7a3f').offsetHSL(0, 0, (rnd() - 0.5) * 0.1), M.trs([c.x + Math.cos(a) * r, -10, c.z + Math.sin(a) * r], [0, 0, 0], [1, 0.5 + rnd() * 0.3, 1]), { mat: 'flat', cast: false })
  }
  const far = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ color: '#4f7a35', roughness: 1 }))
  far.rotation.x = -Math.PI / 2; far.position.set(0, -0.03, 0)
  b.object(far)
  const group = b.build()
  stage.scene.add(group)
  return { group, marks: HILL_MARKS, update() {}, dispose() { stage.scene.remove(group); b.dispose() } }
}
