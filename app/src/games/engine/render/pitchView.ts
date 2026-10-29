// Procedural pitch: painted grass (mowing stripes, chalk lines to FIFA dimensions), goals with nets,
// cones, and a surround (training ground or small stadium). Everything is generated, nothing is downloaded.
import * as THREE from 'three'
import { BOX_DEPTH, BOX_WIDTH, FULL_H, FULL_W, type Goal, type PitchGeom } from '../sim/pitch'
import type { Frame, Stage } from './stage'

export type Surround = 'training' | 'stadium' | 'none'

function seeded(seed: number) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

/** Grass canvas: stripes plus fine noise, and the chalk lines of the view. */
function paintGrass(p: PitchGeom, pxPerM: number, full: boolean): HTMLCanvasElement {
  const W = full ? FULL_W : p.w, H = full ? FULL_H : p.h
  const c = document.createElement('canvas')
  const scale = Math.min(pxPerM, 2048 / W, 2048 / H)
  c.width = Math.round(W * scale); c.height = Math.round(H * scale)
  const g = c.getContext('2d')!
  // base and mowing stripes along the length
  const stripe = full ? 5.25 : Math.max(2.5, W / 8)
  for (let x = 0, i = 0; x < W; x += stripe, i++) {
    g.fillStyle = i % 2 ? '#3f8a3a' : '#479a40'
    g.fillRect(x * scale, 0, stripe * scale + 1, c.height)
  }
  // grain
  const rnd = seeded(11)
  const n = Math.round((c.width * c.height) / 18)
  for (let i = 0; i < n; i++) {
    const x = rnd() * c.width, y = rnd() * c.height
    const l = rnd()
    g.fillStyle = l < 0.5 ? 'rgba(20,60,20,0.18)' : 'rgba(180,220,140,0.12)'
    g.fillRect(x, y, 1.2, 1.2 + rnd() * 2)
  }
  // chalk
  g.strokeStyle = 'rgba(250,252,246,0.92)'
  g.lineWidth = Math.max(1.5, 0.12 * scale)
  const L = (x1: number, y1: number, x2: number, y2: number) => { g.beginPath(); g.moveTo(x1 * scale, y1 * scale); g.lineTo(x2 * scale, y2 * scale); g.stroke() }
  const R = (x: number, y: number, w: number, h: number) => g.strokeRect(x * scale, y * scale, w * scale, h * scale)
  const A = (x: number, y: number, r: number, a0: number, a1: number) => { g.beginPath(); g.arc(x * scale, y * scale, r * scale, a0, a1); g.stroke() }
  const dot = (x: number, y: number) => { g.beginPath(); g.arc(x * scale, y * scale, 0.22 * scale, 0, Math.PI * 2); g.fillStyle = 'rgba(250,252,246,0.92)'; g.fill() }
  if (full) {
    const m = 0.06
    R(m, m, FULL_W - 2 * m, FULL_H - 2 * m)
    L(FULL_W / 2, 0, FULL_W / 2, FULL_H)
    A(FULL_W / 2, FULL_H / 2, 9.15, 0, Math.PI * 2); dot(FULL_W / 2, FULL_H / 2)
    for (const side of [0, 1]) {
      const gx = side ? FULL_W : 0, dir = side ? -1 : 1
      const bx = side ? FULL_W - BOX_DEPTH : 0
      R(bx, (FULL_H - BOX_WIDTH) / 2, BOX_DEPTH, BOX_WIDTH)
      R(side ? FULL_W - 5.5 : 0, (FULL_H - 18.32) / 2, 5.5, 18.32)
      const spot = gx + dir * 11
      dot(spot, FULL_H / 2)
      const a = Math.acos((BOX_DEPTH - 11) / 9.15)
      if (side) A(spot, FULL_H / 2, 9.15, Math.PI - a, Math.PI + a)
      else A(spot, FULL_H / 2, 9.15, -a, a)
      for (const cy of [0, FULL_H]) A(gx, cy, 1, side ? (cy ? Math.PI : Math.PI / 2) : (cy ? -Math.PI / 2 : 0), side ? (cy ? Math.PI * 1.5 : Math.PI) : (cy ? 0 : Math.PI / 2))
    }
  } else {
    // training square: a faint chalk outline of the area
    g.setLineDash([0.6 * scale, 0.5 * scale])
    g.strokeStyle = 'rgba(250,252,246,0.55)'
    R(0.05, 0.05, W - 0.1, H - 0.1)
    g.setLineDash([])
  }
  return c
}

function goalMesh(g: Goal, frame: Frame, mat: THREE.Material, netMat: THREE.Material) {
  const grp = new THREE.Group()
  const r = g.mini ? 0.035 : 0.06
  const post = new THREE.CylinderGeometry(r, r, g.height, 10)
  const bar = new THREE.CylinderGeometry(r, r, g.width + r * 2, 10)
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(post, mat)
    m.position.set(0, g.height / 2, (s * g.width) / 2)
    m.castShadow = true
    grp.add(m)
  }
  const cb = new THREE.Mesh(bar, mat)
  cb.rotation.x = Math.PI / 2
  cb.position.set(0, g.height, 0)
  cb.castShadow = true
  grp.add(cb)
  // net: a box of lines behind the goal line
  const d = g.depth, w = g.width, h = g.height
  const pts: number[] = []
  const step = g.mini ? 0.18 : 0.25
  const back = -d
  for (let z = -w / 2; z <= w / 2 + 1e-6; z += step) pts.push(back, 0, z, back, h, z, back, h, z, 0, h, z) // back verticals + roof
  for (let y = 0; y <= h + 1e-6; y += step) pts.push(back, y, -w / 2, back, y, w / 2) // back horizontals
  for (const z of [-w / 2, w / 2]) {
    for (let x = back; x <= 1e-6; x += step) pts.push(x, 0, z, x, h, z) // side verticals
    for (let y = 0; y <= h + 1e-6; y += step) pts.push(back, y, z, 0, y, z) // side horizontals
  }
  const netGeo = new THREE.BufferGeometry()
  netGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  grp.add(new THREE.LineSegments(netGeo, netMat))
  grp.position.set(frame.x(g.x), 0, frame.z(g.y))
  // our local -X is "behind the goal line": rotate so it points out of the pitch
  grp.rotation.y = g.facing === -1 ? Math.PI : 0
  return grp
}

export function coneMesh(color = '#F28C28') {
  const geo = new THREE.ConeGeometry(0.11, 0.3, 12)
  geo.translate(0, 0.15, 0)
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.6 }))
}

export interface PitchView { group: THREE.Group; dispose(): void }

export function buildPitch(stage: Stage, frame: Frame, p: PitchGeom, surround: Surround = 'training'): PitchView {
  const group = new THREE.Group()
  const q = stage.quality
  const pxPerM = q.dpr >= 2 ? 16 : q.dpr >= 1.5 ? 12 : 8
  // the painted pitch: a full pitch drawn under half/third views so the real lines show
  const full = p.markings
  const canvas = paintGrass(p, full ? pxPerM : pxPerM * 1.6, full)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  const W = full ? FULL_W : p.w, H = full ? FULL_H : p.h
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }))
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  // a full pitch is 105 long; the view's x = 0 sits at offsetX on it
  const cx = full ? FULL_W / 2 - p.offsetX : p.w / 2
  ground.position.set(frame.x(cx), 0, frame.z(H / 2))
  group.add(ground)
  // run-off and surround
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(W + 60, H + 60), new THREE.MeshStandardMaterial({ color: surround === 'stadium' ? '#2f6b30' : '#4a7f3c', roughness: 1 }))
  outer.rotation.x = -Math.PI / 2
  outer.position.set(ground.position.x, -0.02, ground.position.z)
  outer.receiveShadow = true
  group.add(outer)
  // goals
  const white = new THREE.MeshStandardMaterial({ color: '#f4f4ef', roughness: 0.4 })
  const net = new THREE.LineBasicMaterial({ color: '#e9ece6', transparent: true, opacity: 0.55 })
  for (const g of p.goals) group.add(goalMesh(g, frame, white, net))
  if (full && p.view !== 'full') {
    // the other goal of a full pitch is out of the view but in the picture
    group.add(goalMesh({ x: -p.offsetX, y: FULL_H / 2, facing: 1, width: 7.32, height: 2.44, depth: 2, mini: false, attackedBy: 'b' }, frame, white, net))
  }
  // cones: the diagram's cones, plus corner cones on training squares
  const coneGeo = new THREE.ConeGeometry(0.11, 0.3, 10)
  coneGeo.translate(0, 0.15, 0)
  const coneMat = new THREE.MeshStandardMaterial({ color: '#F28C28', roughness: 0.6 })
  const conePts = [...p.cones]
  if (!full) conePts.push({ x: 0, y: 0 }, { x: p.w, y: 0 }, { x: 0, y: p.h }, { x: p.w, y: p.h })
  if (conePts.length) {
    const inst = new THREE.InstancedMesh(coneGeo, coneMat, conePts.length)
    const m = new THREE.Matrix4()
    conePts.forEach((c, i) => { m.makeTranslation(frame.x(c.x), 0, frame.z(c.y)); inst.setMatrixAt(i, m) })
    inst.castShadow = true
    group.add(inst)
  }
  if (surround !== 'none') group.add(buildSurround(frame, p, surround, q.props))
  stage.scene.add(group)
  stage.fitShadow(W, H)
  return {
    group,
    dispose() { stage.scene.remove(group); tex.dispose() },
  }
}

/** Trees, fence and benches around a training ground; stands with a crowd for the stadium. */
function buildSurround(frame: Frame, p: PitchGeom, kind: Surround, density: number) {
  const g = new THREE.Group()
  const full = p.markings
  const W = full ? FULL_W : p.w, H = full ? FULL_H : p.h
  const cx = full ? FULL_W / 2 - p.offsetX : p.w / 2
  const ox = frame.x(cx), oz = frame.z(H / 2)
  const rnd = seeded(5)
  if (kind === 'training') {
    // low fence on the long sides, a line of trees beyond
    const fenceMat = new THREE.MeshStandardMaterial({ color: '#d9d3c4', roughness: 0.8 })
    for (const s of [-1, 1]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(W + 20, 0.9, 0.08), fenceMat)
      f.position.set(ox, 0.45, oz + s * (H / 2 + 6))
      g.add(f)
    }
    const trunk = new THREE.CylinderGeometry(0.18, 0.26, 2.6, 7)
    trunk.translate(0, 1.3, 0)
    const crown = new THREE.IcosahedronGeometry(2.1, 1)
    crown.translate(0, 3.9, 0)
    const n = Math.round(46 * density)
    const tm = new THREE.InstancedMesh(trunk, new THREE.MeshStandardMaterial({ color: '#6b4a32', roughness: 1 }), n)
    const cm = new THREE.InstancedMesh(crown, new THREE.MeshStandardMaterial({ color: '#2f6a2c', roughness: 1, flatShading: true }), n)
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3()
    const col = new THREE.Color()
    for (let i = 0; i < n; i++) {
      const side = i % 4
      const along = rnd()
      const off = 10 + rnd() * 9
      if (side < 2) pos.set(ox + (along - 0.5) * (W + 30), 0, oz + (side ? 1 : -1) * (H / 2 + off))
      else pos.set(ox + (side === 2 ? 1 : -1) * (W / 2 + off), 0, oz + (along - 0.5) * (H + 30))
      const s = 0.75 + rnd() * 0.6
      sc.set(s, s * (0.85 + rnd() * 0.4), s)
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6.28)
      m.compose(pos, q, sc)
      tm.setMatrixAt(i, m); cm.setMatrixAt(i, m)
      cm.setColorAt(i, col.setHSL(0.28 + rnd() * 0.06, 0.45, 0.24 + rnd() * 0.1))
    }
    tm.castShadow = true; cm.castShadow = true
    g.add(tm, cm)
    // benches and a ball bag by the touchline
    const benchMat = new THREE.MeshStandardMaterial({ color: '#0B5D3B', roughness: 0.7 })
    for (const dx of [-8, 8]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.45, 0.5), benchMat)
      b.position.set(ox + dx, 0.23, oz + H / 2 + 3.2)
      b.castShadow = true
      g.add(b)
    }
  } else if (kind === 'stadium') {
    // four stands of steps with an instanced crowd
    const standMat = new THREE.MeshStandardMaterial({ color: '#c9cdc6', roughness: 0.9 })
    const roofMat = new THREE.MeshStandardMaterial({ color: '#0B5D3B', roughness: 0.6 })
    const crowdGeo = new THREE.BoxGeometry(0.42, 0.75, 0.32)
    crowdGeo.translate(0, 0.38, 0)
    const total = Math.round(2600 * density)
    const crowd = new THREE.InstancedMesh(crowdGeo, new THREE.MeshStandardMaterial({ roughness: 1 }), total)
    const m = new THREE.Matrix4(), col = new THREE.Color()
    const palette = ['#0B5D3B', '#F5B700', '#D7263D', '#f2efe6', '#13804F', '#2a2a2a', '#c9a227', '#8b2e2e']
    let k = 0
    const sides: { cx: number; cz: number; len: number; rot: number }[] = [
      { cx: ox, cz: oz - H / 2 - 9, len: W + 10, rot: 0 }, { cx: ox, cz: oz + H / 2 + 9, len: W + 10, rot: Math.PI },
      { cx: ox - W / 2 - 9, cz: oz, len: H + 10, rot: Math.PI / 2 }, { cx: ox + W / 2 + 9, cz: oz, len: H + 10, rot: -Math.PI / 2 },
    ]
    for (const s of sides) {
      const stand = new THREE.Group()
      for (let r = 0; r < 8; r++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(s.len, 0.7, 1.2), standMat)
        step.position.set(0, 0.35 + r * 0.7, -r * 1.2)
        step.receiveShadow = true
        stand.add(step)
      }
      const roof = new THREE.Mesh(new THREE.BoxGeometry(s.len, 0.3, 8), roofMat)
      roof.position.set(0, 8.2, -4.5)
      stand.add(roof)
      stand.position.set(s.cx, 0, s.cz)
      stand.rotation.y = s.rot
      g.add(stand)
      stand.updateMatrixWorld(true)
      const per = Math.floor(total / 4)
      for (let i = 0; i < per && k < total; i++, k++) {
        const r = Math.floor(rnd() * 8)
        const local = new THREE.Vector3((rnd() - 0.5) * (s.len - 2), 0.7 + r * 0.7, -r * 1.2 - 0.1)
        const world = local.applyMatrix4(stand.matrixWorld)
        m.makeRotationY(s.rot)
        m.setPosition(world)
        crowd.setMatrixAt(k, m)
        crowd.setColorAt(k, col.set(palette[Math.floor(rnd() * palette.length)]))
      }
    }
    crowd.count = k
    g.add(crowd)
  }
  return g
}
