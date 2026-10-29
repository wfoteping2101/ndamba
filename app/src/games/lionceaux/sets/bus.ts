// Chapter 9, the yellow school bus home (« Dans le bus du retour, Kaydoudou rebondit sur son
// siège »): two rows of high green benches, a black ribbed floor, cream walls and ceiling, and
// Waldorf under the snow sliding past the windows (the bus stands still in its World, x along the aisle).
import * as THREE from 'three'
import type { Frame, Stage } from '../../engine/render/stage'
import { M, SetBuilder, canvasTexture, grain, seeded, type Marks } from './common'
import { roomPitch } from './interiors'
import type { SetHandle } from './bonamoussadi'

export const BUS_W = 10
export const BUS_H = 2.5
export const busPitch = () => roomPitch(BUS_W, BUS_H)

/** Benches two by two: window seats at y 0.45 and 2.05, aisle seats at 0.95 and 1.55, aisle at 1.25.
 *  Passengers face -x (the driver is at x 0.6). */
export const BUS_MARKS: Marks = {
  seatK: { x: 5.0, y: 0.47 }, seatB: { x: 5.0, y: 0.95 },
  aisle: { x: 6.6, y: 1.25 }, front: { x: 1.2, y: 1.25 },
}
export const BUS_ROWS = [1.9, 2.75, 3.6, 4.45, 5.3, 6.15, 7.0, 7.85, 8.7]

export function buildBus(stage: Stage, frame: Frame): SetHandle {
  const b = new SetBuilder(frame, stage.quality.shadows)
  const rnd = seeded(41)
  const W = BUS_W, H = BUS_H, R = 2.0, SILL = 0.95
  const at = (x: number, y: number, z = 0) => frame.vec(x, y, z)
  // the ribbed black rubber floor
  const rubber = canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#26272a'; g.fillRect(0, 0, w, h)
    for (let y = 0; y < h; y += 8) { g.fillStyle = '#333539'; g.fillRect(0, y, w, 3) }
    grain(g, w, h, rnd, 300, ['#1c1d1f', '#3a3c40'], [1, 2])
  }, { repeat: [12, 3] })
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: rubber, roughness: 0.85 }))
  floor.rotation.x = -Math.PI / 2; floor.position.copy(at(W / 2, H / 2)); floor.receiveShadow = true
  b.object(floor); b.disposables.push(rubber)
  // the sides: a cream panel under the windows, the pillars between them, the curved roof
  for (const wy of [0, H]) {
    const z = at(0, wy).z
    b.add(new THREE.BoxGeometry(W, SILL, 0.08), '#e9e4d6', M.t(at(W / 2, wy).x, SILL / 2, z), { cast: false })
    b.add(new THREE.BoxGeometry(W, 0.1, 0.16), '#c9c3b2', M.t(at(W / 2, wy).x, SILL, z), { cast: false })
    b.add(new THREE.BoxGeometry(W, 0.18, 0.08), '#e9e4d6', M.t(at(W / 2, wy).x, R + 0.06, z), { cast: false })
    for (let x = 1.45; x <= W; x += 0.85) b.add(new THREE.BoxGeometry(0.1, R - SILL, 0.09), '#d9d3c4', M.t(at(x, wy).x, SILL + (R - SILL) / 2, z), { cast: false })
  }
  // the roof: flat in the middle, sloping down to the tops of the windows on both sides
  b.add(new THREE.BoxGeometry(W, 0.05, H - 0.8), '#f1ede2', M.t(at(W / 2, H / 2).x, R + 0.36, at(W / 2, H / 2).z), { cast: false })
  const slope = Math.atan2(0.26, 0.4), sl = Math.hypot(0.26, 0.4)
  b.add(new THREE.BoxGeometry(W, 0.05, sl), '#f1ede2', M.trs([at(W / 2, 0.2).x, R + 0.23, at(W / 2, 0.2).z], [-slope, 0, 0]), { cast: false })
  b.add(new THREE.BoxGeometry(W, 0.05, sl), '#f1ede2', M.trs([at(W / 2, H - 0.2).x, R + 0.23, at(W / 2, H - 0.2).z], [slope, 0, 0]), { cast: false })
  // a row of lights along the roof
  for (let x = 1.5; x < W; x += 2.4) {
    b.add(new THREE.BoxGeometry(0.7, 0.04, 0.16), '#fbf8ee', M.t(at(x, H / 2).x, R + 0.33, at(x, H / 2).z), { mat: b.material('lamp', () => new THREE.MeshBasicMaterial({ color: '#fbf8ee' })), cast: false })
  }
  const light = new THREE.PointLight('#fff4e0', 4, 12, 1.4); light.position.copy(at(W / 2, H / 2, R + 0.2)); b.object(light)
  // the benches: green vinyl, a high padded back with a steel rail on top, two by two
  const vinyl = b.material('vinyl', () => new THREE.MeshStandardMaterial({ color: '#3f6b4a', roughness: 0.5 }))
  for (const x of BUS_ROWS) for (const [y0, y1] of [[0.18, 1.07], [1.43, 2.32]]) {
    const yc = (y0 + y1) / 2, len = y1 - y0
    const p = at(x, yc)
    // low benches, made for children (the seat at 38 cm)
    b.add(new THREE.BoxGeometry(0.46, 0.1, len), '#ffffff', M.t(p.x + 0.02, 0.33, p.z), { mat: vinyl })
    b.add(new THREE.BoxGeometry(0.1, 0.66, len), '#ffffff', M.trs([p.x + 0.29, 0.7, p.z], [0, 0, -0.08]), { mat: vinyl })
    b.add(new THREE.CylinderGeometry(0.025, 0.025, len, 8), '#b9bec2', M.trs([p.x + 0.33, 1.04, p.z], [Math.PI / 2, 0, 0]), { mat: 'shiny' })
    b.add(new THREE.BoxGeometry(0.06, 0.28, 0.06), '#6a6e72', M.t(p.x, 0.14, at(x, y0 < 1 ? y1 - 0.05 : y0 + 0.05).z), { mat: 'shiny' })
  }
  // the driver's corner: the big flat wheel, the dashboard, the folding door
  const dr = at(0.6, 0.6)
  b.add(new THREE.BoxGeometry(0.5, 0.5, 0.5), '#2a2a2a', M.t(dr.x, 0.25, dr.z))
  b.add(new THREE.TorusGeometry(0.24, 0.025, 8, 20), '#1b1b1b', M.trs([dr.x + 0.1, 0.95, dr.z], [Math.PI / 2 - 0.5, 0, 0]))
  b.add(new THREE.BoxGeometry(0.3, 0.75, H), '#2b2d30', M.t(at(0.05, H / 2).x, 0.6, at(0.05, H / 2).z))
  b.add(new THREE.BoxGeometry(0.06, 1.8, 0.8), '#2b3540', M.t(at(0.15, H - 0.5).x, 1.0, at(0.15, H - 0.5).z), { mat: 'shiny' })
  // the windscreen and the back window, white with snow light
  const glow = b.material('glow', () => new THREE.MeshBasicMaterial({ color: '#e9f0f6', toneMapped: false }))
  b.add(new THREE.PlaneGeometry(H, 0.9), '#ffffff', M.trs([at(-0.02, H / 2).x, 1.45, at(-0.02, H / 2).z], [0, Math.PI / 2, 0]), { mat: glow, cast: false })
  b.add(new THREE.BoxGeometry(0.06, R, H), '#e9e4d6', M.t(at(W + 0.03, H / 2).x, R / 2, at(W + 0.03, H / 2).z), { cast: false })
  // Waldorf under the snow, sliding past on both sides: white yards, beige houses, bare trees
  const street = canvasTexture(1024, 256, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h * 0.55); sky.addColorStop(0, '#c4d1dc'); sky.addColorStop(1, '#eef2f5')
    g.fillStyle = sky; g.fillRect(0, 0, w, h)
    for (let x = -20; x < w; x += 120 + rnd() * 60) {
      const hw = 70 + rnd() * 30, hh = 34 + rnd() * 10, base = h * 0.62
      g.fillStyle = ['#d8c9a8', '#b9c7cf', '#e7e2d6', '#c9b29a', '#a9b9a2'][Math.floor(rnd() * 5)]
      g.fillRect(x, base - hh, hw, hh)
      g.fillStyle = '#f6f9fc'; g.beginPath(); g.moveTo(x - 6, base - hh); g.lineTo(x + hw / 2, base - hh - 22); g.lineTo(x + hw + 6, base - hh); g.fill()
      g.fillStyle = '#2c3a46'; g.fillRect(x + 10, base - hh + 10, 12, 12); g.fillRect(x + hw - 22, base - hh + 10, 12, 12)
    }
    g.strokeStyle = 'rgba(70,64,60,0.7)'; g.lineWidth = 3
    for (let i = 0; i < 26; i++) {
      const x0 = rnd() * w, top = h * (0.12 + rnd() * 0.2)
      g.beginPath(); g.moveTo(x0, h * 0.64); g.lineTo(x0 + (rnd() - 0.5) * 8, top); g.stroke()
      for (let k = 0; k < 4; k++) { const y = top + (h * 0.64 - top) * (0.15 + k * 0.15); g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + (rnd() - 0.5) * 50, y - 14 - rnd() * 14); g.stroke() }
    }
    g.fillStyle = '#f7fafc'; g.fillRect(0, h * 0.62, w, h * 0.38)
    g.fillStyle = '#d9dee2'; g.fillRect(0, h * 0.86, w, h * 0.05)
    for (let i = 0; i < 400; i++) { g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(rnd() * w, rnd() * h * 0.6, 2, 2) }
  })
  street.wrapS = THREE.RepeatWrapping
  street.repeat.set(2, 1)
  for (const wy of [-3, H + 3]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(50, 7), new THREE.MeshBasicMaterial({ map: street, toneMapped: false }))
    m.position.copy(at(W / 2, wy, 1.6))
    if (wy > 0) m.rotation.y = Math.PI
    b.object(m)
  }
  b.disposables.push(street)
  const group = b.build()
  stage.scene.add(group)
  return {
    group, marks: BUS_MARKS,
    update(dt) { street.offset.x = (street.offset.x + dt * 0.03) % 1 },
    dispose() { stage.scene.remove(group); b.dispose() },
  }
}
