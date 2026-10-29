// Chapter 2, the coach from Douala to Bafoussam: rows of seats, the open windows, the green hills
// « si vertes qu'on les croirait peintes » sliding past, then the fog falls « d'un coup ».
// The hills move past the windows (the coach stands still in its World, x along the aisle).
import * as THREE from 'three'
import type { Frame, Stage } from '../../engine/render/stage'
import { M, SetBuilder, addBanana, canvasTexture, grain, seeded, type Marks } from './common'
import { roomPitch } from './interiors'
import type { SetHandle } from './bonamoussadi'

export const CAR_W = 11
export const CAR_H = 3
export const carPitch = () => roomPitch(CAR_W, CAR_H)

export const CAR_MARKS: Marks = {
  // window seats on the right side (y = 0.55), aisle at y = 1.5
  seatK: { x: 5.2, y: 0.62 }, seatB: { x: 6.1, y: 2.38 }, seatMaman: { x: 5.2, y: 1.18 }, seatPapa: { x: 6.1, y: 1.82 },
  seatDame: { x: 4.3, y: 0.62 }, seatMonsieur: { x: 4.3, y: 1.18 },
  windowK: { x: 5.2, y: -0.4 }, aisle: { x: 7, y: 1.5 },
}

export function buildCar(stage: Stage, frame: Frame): SetHandle {
  const b = new SetBuilder(frame, stage.quality.shadows)
  const rnd = seeded(22)
  const W = CAR_W, H = CAR_H, R = 2.15
  // floor, walls with window openings, roof
  b.add(new THREE.BoxGeometry(W, 0.05, H), '#4a4a44', M.t(frame.vec(W / 2, H / 2).x, 0, frame.vec(W / 2, H / 2).z), { cast: false })
  for (const wy of [0, H]) {
    const z = frame.vec(0, wy).z
    b.add(new THREE.BoxGeometry(W, 0.85, 0.08), '#e9e2d2', M.t(frame.vec(W / 2, wy).x, 0.42, z), { cast: false })
    b.add(new THREE.BoxGeometry(W, 0.35, 0.08), '#e9e2d2', M.t(frame.vec(W / 2, wy).x, R - 0.17, z), { cast: false })
    for (let x = 0; x <= W; x += 1.1) b.add(new THREE.BoxGeometry(0.1, R, 0.09), '#d9d0bf', M.t(frame.vec(x, wy).x, R / 2, z), { cast: false })
    b.add(new THREE.BoxGeometry(W, 0.05, 0.12), '#2f6b45', M.t(frame.vec(W / 2, wy).x, 0.86, z), { cast: false })
  }
  b.add(new THREE.BoxGeometry(W, 0.06, H + 0.1), '#efe9dc', M.t(frame.vec(W / 2, H / 2).x, R + 0.02, frame.vec(W / 2, H / 2).z), { cast: false })
  // seats: two by two, worn red vinyl
  for (let x = 1.6; x < W - 0.5; x += 0.9) for (const y of [0.62, 1.18, 1.82, 2.38]) {
    const p = frame.vec(x, y)
    b.add(new THREE.BoxGeometry(0.46, 0.12, 0.5), '#9a3a2a', M.t(p.x, 0.45, p.z))
    b.add(new THREE.BoxGeometry(0.1, 0.62, 0.5), '#8a3224', M.trs([p.x + 0.24, 0.78, p.z], [0, 0, -0.12]))
  }
  // the landscape outside: a long strip of painted hills that slides past, on both sides
  const hills = canvasTexture(1024, 256, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h * 0.5); sky.addColorStop(0, '#a9c9e2'); sky.addColorStop(1, '#eef0e6')
    g.fillStyle = sky; g.fillRect(0, 0, w, h)
    for (let layer = 0; layer < 3; layer++) {
      g.fillStyle = ['#7aa86a', '#4f8a45', '#3a6e35'][layer]
      g.beginPath(); g.moveTo(0, h)
      for (let x = 0; x <= w; x += 16) g.lineTo(x, h * (0.42 + layer * 0.14) - Math.sin((x / w) * Math.PI * (3 + layer * 2) + layer) * h * 0.09)
      g.lineTo(w, h); g.fill()
    }
    grain(g, w, h, rnd, 900, ['#2f5a2a', '#9ac07a'], [1, 4])
    // eucalyptus and the red road edge
    for (let i = 0; i < 40; i++) { const x = rnd() * w; g.fillStyle = '#2f4f2a'; g.fillRect(x, h * 0.48 - 30, 3, 40); g.beginPath(); g.ellipse(x + 1, h * 0.48 - 34, 8, 14, 0, 0, Math.PI * 2); g.fill() }
    g.fillStyle = '#a5562e'; g.fillRect(0, h * 0.92, w, h * 0.08)
  })
  hills.wrapS = THREE.RepeatWrapping
  hills.repeat.set(2, 1)
  const strips: THREE.Mesh[] = []
  for (const wy of [-3.5, H + 3.5]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(60, 9), new THREE.MeshBasicMaterial({ map: hills, toneMapped: false }))
    m.position.copy(frame.vec(W / 2, wy, 1.5))
    if (wy > 0) m.rotation.y = Math.PI
    b.object(m); strips.push(m)
  }
  b.disposables.push(hills)
  // a basket of plums on the seat, the sack with the wounded ball
  const sk = frame.vec(5.2, 0.62)
  b.add(new THREE.BoxGeometry(0.3, 0.26, 0.24), '#6b4a8a', M.t(sk.x + 0.42, 0.62, sk.z + 0.05))
  void addBanana
  const group = b.build()
  stage.scene.add(group)
  return {
    group, marks: CAR_MARKS,
    update(dt) { hills.offset.x = (hills.offset.x + dt * 0.035) % 1 },
    dispose() { stage.scene.remove(group); b.dispose() },
  }
}
