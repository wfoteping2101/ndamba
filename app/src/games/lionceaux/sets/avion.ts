// Chapter 8, the last morning in Cameroon: Douala airport (« sent l'essence d'avion et le café »)
// and the plane, where BriBri leaves the window to Kaydoudou; through it, the shining roofs and
// the Wouri. The airport hall and the cabin are side by side in one small World (x along the hall).
import * as THREE from 'three'
import type { Frame, Stage } from '../../engine/render/stage'
import { M, SetBuilder, canvasTexture, grain, seeded, type Marks } from './common'
import { roomPitch } from './interiors'
import type { SetHandle } from './bonamoussadi'

export const AVION_W = 30
export const AVION_H = 10
export const avionPitch = () => roomPitch(AVION_W, AVION_H)

export const AVION_MARKS: Marks = {
  hall: { x: 7, y: 6 },
  gate: { x: 12.5, y: 3 },
  board: { x: 7, y: 0.4 },
  // the cabin: rows along x from 18 to 29, aisle at y = 5, window seats at y = 3.6
  // on the cushion of the row at x = 22.95 (its back is at +0.24)
  seatK: { x: 22.9, y: 3.75 },
  seatB: { x: 22.9, y: 4.35 },
  window: { x: 22.9, y: 3.15 },
  aisle: { x: 21, y: 5 },
}

export function buildAvion(stage: Stage, frame: Frame): SetHandle {
  const q = stage.quality
  const b = new SetBuilder(frame, q.shadows)
  const rnd = seeded(8)
  /* ---------------- the hall: a polished floor, a departures board, rows of seats, the big window */
  const floorTex = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#cfc8ba'; g.fillRect(0, 0, w, h)
    grain(g, w, h, rnd, 700, ['#bdb6a8', '#e0dacd', '#b5ad9e'], [1, 6])
    g.strokeStyle = 'rgba(90,80,70,0.3)'; g.lineWidth = 2
    for (let k = 0; k <= 4; k++) { g.beginPath(); g.moveTo(k * 64, 0); g.lineTo(k * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, k * 64); g.lineTo(w, k * 64); g.stroke() }
  }, { repeat: [5, 3] })
  const hall = new THREE.Mesh(new THREE.PlaneGeometry(15, AVION_H), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.35 }))
  hall.rotation.x = -Math.PI / 2; hall.position.copy(frame.vec(7.5, AVION_H / 2)); hall.receiveShadow = true
  b.object(hall); b.disposables.push(floorTex)
  const H = 4.2
  const wallC = '#e9e4d8'
  b.add(new THREE.BoxGeometry(15, H, 0.2), wallC, M.t(frame.vec(7.5, 0).x, H / 2, frame.vec(7.5, 0).z), { cast: false })
  b.add(new THREE.BoxGeometry(0.2, H, AVION_H), wallC, M.t(frame.vec(0, 5).x, H / 2, frame.vec(0, 5).z), { cast: false })
  // the glass wall on the tarmac side, with the plane's tail beyond
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(15, H), new THREE.MeshStandardMaterial({ color: '#cfe2ea', transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.4, side: THREE.DoubleSide, depthWrite: false }))
  glass.position.copy(frame.vec(7.5, AVION_H, H / 2)); b.object(glass)
  for (let x = 0; x <= 15; x += 2.5) b.add(new THREE.BoxGeometry(0.08, H, 0.08), '#5a5a5a', M.t(frame.vec(x, AVION_H).x, H / 2, frame.vec(x, AVION_H).z), { mat: 'shiny' })
  const boardTex = canvasTexture(512, 160, (g, w, h) => {
    g.fillStyle = '#121a24'; g.fillRect(0, 0, w, h)
    g.fillStyle = '#f5c542'; g.font = '700 30px Archivo, system-ui, sans-serif'
    g.fillText('Vol pour Paris', 24, 52)
    g.fillStyle = '#dfe6ea'; g.font = '500 24px Archivo, system-ui, sans-serif'
    g.fillText('Douala, Paris, Washington', 24, 100)
    g.fillStyle = '#7fd3a2'; g.fillText('Embarquement', 24, 140)
  })
  const board = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.0), new THREE.MeshBasicMaterial({ map: boardTex, toneMapped: false }))
  board.position.copy(frame.vec(AVION_MARKS.board.x, 0.12, 2.9)); b.object(board); b.disposables.push(boardTex)
  for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) {
    const p = frame.vec(2.5 + i * 0.62, 3.2 + r * 1.6)
    b.add(new THREE.BoxGeometry(0.52, 0.06, 0.5), '#3f5a7a', M.t(p.x, 0.45, p.z), { mat: 'shiny' })
    b.add(new THREE.BoxGeometry(0.52, 0.5, 0.06), '#3f5a7a', M.t(p.x, 0.72, p.z + 0.23), { mat: 'shiny' })
  }
  for (const [dx, dz] of [[0, 0], [3.7, 0], [0, 3.2], [3.7, 3.2]]) b.add(new THREE.BoxGeometry(0.06, 0.42, 0.06), '#666', M.t(frame.vec(2.5 + dx, 3.2 + dz).x, 0.21, frame.vec(2.5 + dx, 3.2 + dz).z))
  // a coffee counter (« et le café »)
  const cf = frame.vec(12.8, 1.2)
  b.add(new THREE.BoxGeometry(2.4, 1.05, 0.7), '#6b4a32', M.t(cf.x, 0.52, cf.z))
  b.add(new THREE.CylinderGeometry(0.12, 0.12, 0.36, 10), '#bfbfbf', M.t(cf.x - 0.6, 1.23, cf.z), { mat: 'shiny' })
  // tarmac and the plane outside
  const tarmac = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: '#7a7a74', roughness: 0.9 }))
  tarmac.rotation.x = -Math.PI / 2; tarmac.position.set(0, -0.03, 0); b.object(tarmac)
  const fus = frame.vec(6, 30)
  b.add(new THREE.CylinderGeometry(2.0, 2.0, 30, 18), '#f2f2ee', M.trs([fus.x, 3.2, fus.z], [0, 0, Math.PI / 2]), { mat: 'shiny' })
  b.add(new THREE.BoxGeometry(4, 5, 0.3), '#0B5D3B', M.trs([fus.x - 14, 7, fus.z], [0, 0, -0.35]))
  b.add(new THREE.BoxGeometry(6, 0.35, 26), '#e9e9e4', M.t(fus.x + 2, 2.4, fus.z), { mat: 'shiny' })
  /* ---------------- the cabin: rows of seats, the curved wall with windows */
  const cabin = new THREE.Mesh(new THREE.PlaneGeometry(13, AVION_H), new THREE.MeshStandardMaterial({ color: '#4a5260', roughness: 0.9 }))
  cabin.rotation.x = -Math.PI / 2; cabin.position.copy(frame.vec(23.5, AVION_H / 2, 0.01)); cabin.receiveShadow = true
  b.object(cabin)
  const CH = 2.2
  // the side wall with windows at y = 3, the other side at y = 7, a curved ceiling
  for (const wy of [3.0, 7.0]) {
    for (let x = 17; x < 30; x += 0.9) {
      const p = frame.vec(x + 0.45, wy)
      b.add(new THREE.BoxGeometry(0.55, CH, 0.1), '#e9e6de', M.t(p.x - 0.18, CH / 2, p.z), { cast: false })
      b.add(new THREE.BoxGeometry(0.36, 0.95, 0.1), '#e9e6de', M.t(p.x + 0.27, 0.48, p.z), { cast: false })
      b.add(new THREE.BoxGeometry(0.36, 0.7, 0.1), '#e9e6de', M.t(p.x + 0.27, CH - 0.35, p.z), { cast: false })
    }
  }
  const ceil = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 13, 18, 1, true, Math.PI / 2 + 0.6, Math.PI - 1.2), new THREE.MeshStandardMaterial({ color: '#efece6', side: THREE.DoubleSide, roughness: 1 }))
  ceil.rotation.z = Math.PI / 2
  ceil.position.copy(frame.vec(23.5, 5, 0.6))
  b.object(ceil)
  for (let x = 18.2; x < 29; x += 0.95) for (const y of [3.75, 4.35, 5.65, 6.25]) {
    const p = frame.vec(x, y)
    b.add(new THREE.BoxGeometry(0.46, 0.12, 0.5), '#2f4a6b', M.t(p.x, 0.45, p.z))
    b.add(new THREE.BoxGeometry(0.1, 0.75, 0.5), '#2f4a6b', M.trs([p.x + 0.24, 0.85, p.z], [0, 0, -0.12]))
    b.add(new THREE.BoxGeometry(0.11, 0.12, 0.5), '#f2eee3', M.t(p.x + 0.28, 1.25, p.z))
  }
  for (let x = 18.2; x < 29; x += 0.95) b.add(new THREE.BoxGeometry(0.42, 0.05, 0.06), '#6b6b6b', M.t(frame.vec(x, 4.05).x, 0.66, frame.vec(x, 4.05).z), { mat: 'shiny' })
  // the view through the windows: the morning sun on the tin roofs, the Wouri, then clouds
  const viewTex = canvasTexture(1024, 512, (g, w, h) => {
    const r = seeded(14)
    const sky = g.createLinearGradient(0, 0, 0, h * 0.35)
    sky.addColorStop(0, '#bcd6ea'); sky.addColorStop(1, '#f2efe6')
    g.fillStyle = sky; g.fillRect(0, 0, w, h * 0.35)
    g.fillStyle = '#8a7a52'; g.fillRect(0, h * 0.35, w, h * 0.65)
    grain(g, w, h, r, 2200, ['#6f8a4a', '#a06a3a', '#7a7a5a'], [2, 8])
    // the river, wide and silver, towards the sea
    g.fillStyle = '#cfd9d6'
    g.beginPath(); g.moveTo(0, h * 0.62); g.bezierCurveTo(w * 0.3, h * 0.5, w * 0.55, h * 0.75, w, h * 0.45); g.lineTo(w, h * 0.58); g.bezierCurveTo(w * 0.55, h * 0.88, w * 0.3, h * 0.64, 0, h * 0.74); g.fill()
    // tin roofs catching the light
    for (let i = 0; i < 900; i++) {
      const x = r() * w, y = h * 0.36 + r() * h * 0.6
      if (y > h * 0.5 && y < h * 0.78 && x > w * 0.1) continue
      g.fillStyle = r() < 0.3 ? '#f4f1e6' : r() < 0.6 ? '#b4a48a' : '#a0583a'
      g.fillRect(x, y, 3 + r() * 5, 2 + r() * 3)
    }
    // clouds in the upper part
    for (let i = 0; i < 26; i++) { g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(r() * w, h * 0.3 + r() * h * 0.2, 40 + r() * 90, 12 + r() * 20, 0, 0, Math.PI * 2); g.fill() }
  })
  viewTex.repeat.set(0.7, 1)
  const view = new THREE.Mesh(new THREE.PlaneGeometry(40, 18), new THREE.MeshBasicMaterial({ map: viewTex, toneMapped: false, fog: false }))
  const viewHome = frame.vec(23.5, -6, 0.6)
  view.position.copy(viewHome); view.rotation.x = -0.25
  b.object(view); b.disposables.push(viewTex)
  // « Puis les nuages arrivent, blancs et épais comme le brouillard de Bafoussam »
  const cloudTex = canvasTexture(512, 256, (g, w, h) => {
    const r = seeded(31)
    g.clearRect(0, 0, w, h)
    for (let i = 0; i < 140; i++) {
      const x = r() * w, y = h * 0.15 + r() * h * 0.75, rx = 30 + r() * 90, ry = 14 + r() * 30
      const grd = g.createRadialGradient(x, y, 0, x, y, rx)
      grd.addColorStop(0, 'rgba(255,255,255,0.55)'); grd.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = grd; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill()
    }
  })
  const cloudMat = new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, fog: false })
  const clouds = new THREE.Mesh(new THREE.PlaneGeometry(26, 9), cloudMat)
  clouds.position.copy(frame.vec(23.5, -1.6, 1.2))
  clouds.visible = false
  b.object(clouds); b.disposables.push(cloudTex)
  const group = b.build()
  stage.scene.add(group)
  // the flight, moment by moment when the script says so: 'roll' (the ground starts to run past),
  // 'takeoff' (it rushes, the horizon drops as the nose comes up), 'clouds' (they close over the red earth)
  let roll = -1, fly = -1, cl = -1
  const pose = () => {
    const rolled = roll < 0 ? 0 : 0.1 * THREE.MathUtils.smoothstep(roll, 0, 8)
    const flown = fly < 0 ? 0 : Math.min(1, fly / 4)
    viewTex.offset.x = rolled + (0.3 - rolled) * flown * flown
    const climb = fly < 0 ? 0 : THREE.MathUtils.smoothstep(fly, 1.5, 8)
    view.position.set(viewHome.x, viewHome.y - climb * 5, viewHome.z)
    const c = cl < 0 ? 0 : THREE.MathUtils.smoothstep(cl, 0, 5)
    cloudMat.opacity = c; clouds.visible = c > 0.01
    clouds.position.x = frame.vec(23.5 - Math.min(30, Math.max(0, cl)) * 0.25, 0).x
  }
  return {
    group, marks: AVION_MARKS,
    update(dt) {
      if (roll < 0 && fly < 0 && cl < 0) return
      if (roll >= 0) roll += dt
      if (fly >= 0) fly += dt
      if (cl >= 0) cl += dt
      pose()
    },
    cue(name) {
      if (name === 'roll') roll = 0
      else if (name === 'takeoff') { roll = Math.max(roll, 8); fly = 0 }
      else if (name === 'clouds') { roll = Math.max(roll, 8); fly = Math.max(fly, 8); cl = 0 }
      pose()
    },
    dispose() { stage.scene.remove(group); b.dispose() },
  }
}
