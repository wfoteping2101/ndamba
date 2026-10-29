// Part II, chapter 11 on: Potomac Valley Soccer Academy in spring. Outside (`printemps`): a grass
// pitch for nine-a-side, « il reste de la boue près des poteaux », the parents along the touchline,
// the team benches, trees with their first leaves, the white dome in the distance. Inside
// (`salleVideo`): « une petite salle grise à côté du dôme » where Marcus Bell puts the match on a
// screen: the numbers (70 %, 312, 5), every pass as a white arrow, the one yellow arrow into the box,
// BriBri's passes on their own, and a file headed 33 full of red crosses.
import * as THREE from 'three'
import type { Frame, Stage } from '../../engine/render/stage'
import type { PitchGeom } from '../../engine/sim/pitch'
import { M, SetBuilder, addCrown, canvasTexture, grain, seeded, type Marks } from './common'
import { addGroundDetail, barkTexture, grassDetailTexture } from './nature'
import { crowdMeshes, type Spot } from './crowd'
import { room, roomPitch } from './interiors'
import type { SetHandle } from './bonamoussadi'

export const FIELD_W = 64
export const FIELD_H = 40

/** Potomac Valley (« a ») attack right; the visitors' goal is at x 62. */
export function fieldPitch(): PitchGeom {
  const goals = [
    { x: 62, y: FIELD_H / 2, facing: -1 as const, width: 6.4, height: 2.1, depth: 1.4, mini: false, attackedBy: 'a' as const },
    { x: 2, y: FIELD_H / 2, facing: 1 as const, width: 6.4, height: 2.1, depth: 1.4, mini: false, attackedBy: 'b' as const },
  ]
  return { view: 'grid', w: FIELD_W, h: FIELD_H, goals, offsetX: 0, markings: false, surface: 'grass', walls: false, cones: [], goalFor: { a: goals[0], b: goals[1] }, fullLength: 60, roam: 8 }
}

export const FIELD_MARKS: Marks = {
  center: { x: 32, y: 20 },
  benchHome: { x: 24, y: 42.2 },
  benchAway: { x: 40, y: 42.2 },
  coach: { x: 28, y: 41.2 },
  papa: { x: 18, y: 42.6 },
  car: { x: 10, y: 52 },
}

/** The spring grass: mowing bands, worn and muddy in front of both goals. */
function fieldTexture() {
  return canvasTexture(1024, 640, (g, w, h) => {
    const r = seeded(41)
    for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#5f8f3a' : '#679a3f'; g.fillRect((i / 16) * w, 0, w / 16 + 1, h) }
    grain(g, w, h, r, 5000, ['#74a548', '#557f33', '#6a9440', '#4f7a2e'], [1, 4])
    // the mud by the posts, worn in a fan in front of each goal mouth
    for (const gx of [0.03, 0.97]) {
      for (let i = 0; i < 140; i++) {
        const x = gx * w + (gx < 0.5 ? 1 : -1) * Math.abs(r() * r()) * w * 0.12, y = h / 2 + (r() - 0.5) * h * 0.28 * (0.4 + r())
        const rad = 6 + r() * 26
        const grd = g.createRadialGradient(x, y, 0, x, y, rad)
        grd.addColorStop(0, `rgba(${92 + r() * 20},${66 + r() * 12},${40},0.85)`); grd.addColorStop(1, 'rgba(90,64,40,0)')
        g.fillStyle = grd; g.fillRect(x - rad, y - rad, rad * 2, rad * 2)
      }
    }
  })
}

function goal(b: SetBuilder, frame: Frame, gx: number, gy: number, s: 1 | -1) {
  const g = frame.vec(gx, gy)
  const width = 6.4, height = 2.1, depth = 1.4
  for (const dz of [-width / 2, width / 2]) b.add(new THREE.CylinderGeometry(0.05, 0.05, height, 10), '#f4f4f0', M.t(g.x, height / 2, g.z + dz), { mat: 'shiny' })
  b.add(new THREE.CylinderGeometry(0.05, 0.05, width, 10), '#f4f4f0', M.trs([g.x, height, g.z], [Math.PI / 2, 0, 0]), { mat: 'shiny' })
  const net = b.material('net', () => new THREE.MeshStandardMaterial({ color: '#f2f2ee', wireframe: true, roughness: 0.6 }))
  b.add(new THREE.BoxGeometry(depth, height, width, 4, 6, 12), '#f2f2ee', M.t(g.x + s * depth / 2, height / 2, g.z), { mat: net, cast: false })
}

export function buildField(stage: Stage, frame: Frame, opts: { crowd?: boolean } = {}): SetHandle {
  const q = stage.quality
  const b = new SetBuilder(frame, q.shadows)
  const rnd = seeded(77)
  // the surroundings: a darker meadow, the pitch on it
  const meadow = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshStandardMaterial({ color: '#5a7a3a', roughness: 0.95 }))
  meadow.rotation.x = -Math.PI / 2; meadow.position.copy(frame.vec(FIELD_W / 2, FIELD_H / 2, -0.02)); meadow.receiveShadow = true
  b.object(meadow)
  const ft = fieldTexture()
  const fm = new THREE.MeshStandardMaterial({ map: ft, roughness: 0.9 })
  addGroundDetail(fm, 40, 0.45, grassDetailTexture())
  const field = new THREE.Mesh(new THREE.PlaneGeometry(FIELD_W + 8, FIELD_H + 8), fm)
  field.rotation.x = -Math.PI / 2; field.position.copy(frame.vec(FIELD_W / 2, FIELD_H / 2)); field.receiveShadow = true
  b.object(field); b.disposables.push(ft)
  const line = b.material('line', () => new THREE.MeshStandardMaterial({ color: '#f4f4ee', roughness: 0.8 }))
  const strip = (x0: number, y0: number, x1: number, y1: number) => {
    const a = frame.vec(x0, y0), c = frame.vec(x1, y1)
    const len = a.distanceTo(c), ang = Math.atan2(c.z - a.z, c.x - a.x)
    b.add(new THREE.PlaneGeometry(len, 0.1), '#f4f4ee', new THREE.Matrix4().compose(new THREE.Vector3((a.x + c.x) / 2, 0.01, (a.z + c.z) / 2), new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, -ang, 'YXZ')), new THREE.Vector3(1, 1, 1)), { mat: line, cast: false })
  }
  const arc = (cx: number, cy: number, rr: number, a0: number, a1: number) => { const n = 40; for (let i = 0; i < n; i++) { const u0 = a0 + (a1 - a0) * i / n, u1 = a0 + (a1 - a0) * (i + 1) / n; strip(cx + Math.cos(u0) * rr, cy + Math.sin(u0) * rr, cx + Math.cos(u1) * rr, cy + Math.sin(u1) * rr) } }
  strip(2, 2, 62, 2); strip(2, 38, 62, 38); strip(2, 2, 2, 38); strip(62, 2, 62, 38); strip(32, 2, 32, 38)
  arc(32, 20, 7, 0, Math.PI * 2)
  for (const [gx, s] of [[2, 1], [62, -1]] as const) {
    strip(gx, 7, gx + s * 13, 7); strip(gx + s * 13, 7, gx + s * 13, 33); strip(gx, 33, gx + s * 13, 33)
    strip(gx, 14, gx + s * 4, 14); strip(gx + s * 4, 14, gx + s * 4, 26); strip(gx, 26, gx + s * 4, 26)
  }
  goal(b, frame, 62, 20, 1)
  goal(b, frame, 2, 20, -1)
  // corner flags
  for (const [x, y] of [[2, 2], [62, 2], [2, 38], [62, 38]]) {
    const p = frame.vec(x, y)
    b.add(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 6), '#f2f2ee', M.t(p.x, 0.75, p.z))
    b.add(new THREE.BoxGeometry(0.02, 0.28, 0.4), '#e2c23a', M.t(p.x, 1.35, p.z + 0.2))
  }
  // the benches (a little roof of clear plastic) and the parents' folding chairs along the near side
  for (const bx of [FIELD_MARKS.benchHome.x, FIELD_MARKS.benchAway.x]) {
    const p = frame.vec(bx, FIELD_MARKS.benchHome.y)
    b.add(new THREE.BoxGeometry(5, 0.08, 0.5), '#2f4a6b', M.t(p.x, 0.45, p.z), { mat: 'shiny' })
    b.add(new THREE.BoxGeometry(5.2, 0.06, 1.3), '#cfe0ea', M.t(p.x, 2.0, p.z - 0.2), { mat: 'shiny', cast: false })
    for (const ex of [-2.5, 2.5]) b.add(new THREE.BoxGeometry(0.06, 2.0, 0.06), '#9aa0a4', M.t(p.x + ex, 1.0, p.z + 0.4), { mat: 'shiny' })
  }
  // trees with their first leaves, around the field; the dome far off; a clubhouse
  const bark = b.material('bark', () => new THREE.MeshStandardMaterial({ map: barkTexture('#5a4a3e'), roughness: 0.95 }))
  for (let i = 0; i < 16; i++) {
    const side = i % 4
    const p = side === 0 ? frame.vec(-8 + i * 5, -9) : side === 1 ? frame.vec(-10, 2 + i * 2.5) : side === 2 ? frame.vec(74, 2 + i * 2.5) : frame.vec(-6 + i * 5, 54)
    const h = 6 + rnd() * 4
    b.add(new THREE.CylinderGeometry(0.14, 0.26, h * 0.6, 7), '#ffffff', M.t(p.x, h * 0.3, p.z), { mat: bark })
    addCrown(b, new THREE.Vector3(p.x, h * 0.5, p.z), 2.2 + rnd() * 1.2, h * 0.5, ['#8fb85a', '#9cc368', '#7fae4e'][i % 3], rnd, 6)
  }
  const domeP = frame.vec(FIELD_W / 2 + 10, -48)
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#f4f4f0', roughness: 0.85 }))
  dome.scale.set(38, 21, 26); dome.position.copy(domeP); b.object(dome)
  const club = frame.vec(-14, 30)
  b.add(new THREE.BoxGeometry(8, 3.4, 12), '#b9b2a6', M.t(club.x, 1.7, club.z))
  b.add(new THREE.BoxGeometry(8.6, 0.3, 12.6), '#4a4a4c', M.t(club.x, 3.5, club.z))
  // the parents and the little brothers and sisters along the touchline
  if (opts.crowd !== false) {
    const spots: Spot[] = []
    for (let i = 0; i < 34; i++) {
      const x = 6 + rnd() * 52
      if (Math.abs(x - FIELD_MARKS.benchHome.x) < 3 || Math.abs(x - FIELD_MARKS.benchAway.x) < 3) continue
      spots.push({ p: frame.vec(x, 42.8 + rnd() * 1.6), rot: -Math.PI / 2 + (rnd() - 0.5) * 0.5, sit: false, kid: rnd() < 0.25 ? true : false, variant: rnd() < 0.25 ? 'kidStand' : rnd() < 0.5 ? 'manStand' : 'fanStand' })
    }
    const c = crowdMeshes(spots, rnd, q.shadows, {
      shirts: ['#2f3a4a', '#c9362b', '#e9e2d4', '#5a7a9a', '#7a8a5a', '#d98a2a', '#1f2a44', '#a8556a'],
      bottoms: ['#2f3a4a', '#3a3a44', '#6a6e72', '#1f2a44'],
      skins: ['#e8c4a0', '#5B3A27', '#c99b78', '#8a5a3c', '#f0d2b8', '#a8714c', '#3f2a1e', '#d9b08c'],
      hairs: ['#17110c', '#5a3a22', '#c9a060', '#3a2a1e', '#7a4a2a', '#9a9a94'],
    })
    for (const m of c.meshes) b.object(m)
    b.disposables.push(c)
  }
  const group = b.build()
  stage.scene.add(group)
  return { group, marks: FIELD_MARKS, update() {}, dispose() { stage.scene.remove(group); b.dispose() } }
}

/* ======================================================================== the video room */

export const VIDEO_W = 9
export const VIDEO_H = 7
export const videoPitch = () => roomPitch(VIDEO_W, VIDEO_H)
export const VIDEO_MARKS: Marks = {
  screen: { x: 4.5, y: 0.2 },
  marcus: { x: 6.6, y: 1.0 },
  front: { x: 4.5, y: 2.4 },
  back: { x: 4.5, y: 6.3 },
  door: { x: 8.6, y: 6.2 },
}
/** the chairs: three rows of five, facing the screen (north) */
export const VIDEO_SEATS: [number, number][] = [2.4, 3.7, 5.0].flatMap((y) => [2.1, 3.3, 4.5, 5.7, 6.9].map((x) => [x, y] as [number, number]))

type Screen = 'blank' | 'pct70' | 'p312' | 'box5' | 'arrows' | 'arrows8' | 'file33'

function screenTexture(kind: Screen) {
  return canvasTexture(1024, 576, (g, w, h) => {
    const r = seeded(kind.length * 13 + 5)
    const font = (px: number, weight = 800) => `${weight} ${px}px Archivo, system-ui, sans-serif`
    g.textAlign = 'center'; g.textBaseline = 'middle'
    if (kind === 'box5') {
      // « tout petit, seul au milieu de l'écran blanc »
      g.fillStyle = '#f6f7f6'; g.fillRect(0, 0, w, h)
      g.fillStyle = '#1b1b1b'; g.font = font(64); g.fillText('5', w / 2, h / 2)
      return
    }
    g.fillStyle = '#18212b'; g.fillRect(0, 0, w, h)
    if (kind === 'blank') { g.fillStyle = '#2a3542'; g.font = font(40, 700); g.fillText('Potomac Valley', w / 2, h / 2); return }
    if (kind === 'pct70') {
      g.fillStyle = '#f2c230'; g.font = font(260); g.fillText('70 %', w / 2, h / 2 - 20)
      g.fillStyle = '#9aa7b4'; g.font = font(40, 600); g.fillText('Possession', w / 2, h / 2 + 150)
      return
    }
    if (kind === 'p312') {
      g.fillStyle = '#f4f4ee'; g.font = font(220); g.fillText('312', w * 0.36, h / 2 - 10)
      g.fillStyle = '#5fae6a'; g.font = font(110); g.fillText('91', w * 0.78, h / 2 + 30)
      g.fillStyle = '#9aa7b4'; g.font = font(36, 600); g.fillText('Passes', w / 2, h - 70)
      return
    }
    if (kind === 'file33') {
      g.fillStyle = '#f4f4ee'; g.font = font(120); g.fillText('33', w / 2, 90)
      g.strokeStyle = '#d64a3a'; g.lineWidth = 7; g.lineCap = 'round'
      for (let i = 0; i < 48; i++) {
        const x = 90 + (i % 12) * 72 + (r() - 0.5) * 10, y = 210 + Math.floor(i / 12) * 80 + (r() - 0.5) * 10
        g.beginPath(); g.moveTo(x - 16, y - 16); g.lineTo(x + 16, y + 16); g.moveTo(x + 16, y - 16); g.lineTo(x - 16, y + 16); g.stroke()
      }
      return
    }
    // the pitch from above, then the arrows
    const px = 70, py = 40, pw = w - 140, ph = h - 80
    g.fillStyle = '#2f6b3a'; g.fillRect(px, py, pw, ph)
    g.strokeStyle = 'rgba(244,244,238,0.7)'; g.lineWidth = 3
    g.strokeRect(px, py, pw, ph); g.beginPath(); g.moveTo(px + pw / 2, py); g.lineTo(px + pw / 2, py + ph); g.stroke()
    g.beginPath(); g.arc(px + pw / 2, py + ph / 2, ph * 0.16, 0, Math.PI * 2); g.stroke()
    const boxW = pw * 0.17, boxH = ph * 0.62
    g.strokeRect(px, py + (ph - boxH) / 2, boxW, boxH); g.strokeRect(px + pw - boxW, py + (ph - boxH) / 2, boxW, boxH)
    const arrow = (x0: number, y0: number, x1: number, y1: number, col: string, lw: number) => {
      g.strokeStyle = col; g.fillStyle = col; g.lineWidth = lw
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke()
      const a = Math.atan2(y1 - y0, x1 - x0), hl = 4 + lw * 2
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - Math.cos(a - 0.4) * hl, y1 - Math.sin(a - 0.4) * hl); g.lineTo(x1 - Math.cos(a + 0.4) * hl, y1 - Math.sin(a + 0.4) * hl); g.closePath(); g.fill()
    }
    const X = (u: number) => px + u * pw, Y = (v: number) => py + v * ph
    if (kind === 'arrows') {
      // three hundred passes going round on the sides and at the back: loops, U-turns, back and forth
      for (let i = 0; i < 300; i++) {
        const side = r() < 0.5 ? 0.12 + r() * 0.2 : 0.68 + r() * 0.2
        const u0 = 0.12 + r() * 0.5, v0 = r() < 0.6 ? side : 0.3 + r() * 0.4
        const back = r() < 0.55
        const u1 = Math.min(0.7, Math.max(0.05, u0 + (back ? -1 : 1) * (0.02 + r() * 0.1))), v1 = Math.min(0.95, Math.max(0.05, v0 + (r() - 0.5) * 0.3))
        arrow(X(u0), Y(v0), X(u1), Y(v1), 'rgba(244,244,238,0.55)', 1.6)
      }
      // the only one that goes into their box
      arrow(X(0.66), Y(0.44), X(0.88), Y(0.5), '#f2c230', 5)
      return
    }
    // BriBri's passes on their own: short, clean, nearly all sideways or backwards (« comme des crabes »)
    for (let i = 0; i < 61; i++) {
      const u0 = 0.35 + r() * 0.2, v0 = 0.25 + r() * 0.5
      const u1 = u0 - 0.01 - r() * 0.07, v1 = v0 + (r() < 0.5 ? -1 : 1) * (0.05 + r() * 0.12)
      arrow(X(u0), Y(v0), X(u1), Y(v1), 'rgba(244,244,238,0.85)', 2.2)
    }
  })
}

export function buildVideoRoom(stage: Stage, frame: Frame): SetHandle {
  const q = stage.quality
  const b = new SetBuilder(frame, q.shadows)
  const H = 2.7
  const grey = b.material('grey', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }))
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(VIDEO_W, VIDEO_H), new THREE.MeshStandardMaterial({ color: '#5a5f66', roughness: 0.8 }))
  floor.rotation.x = -Math.PI / 2; floor.position.copy(frame.vec(VIDEO_W / 2, VIDEO_H / 2)); floor.receiveShadow = true
  b.object(floor)
  room(b, 0, 0, VIDEO_W, VIDEO_H, H, '#9aa0a6', grey, [{ side: 'e', at: 6.2, width: 0.95, kind: 'door', color: '#4a5560' }], { louvres: false })
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(VIDEO_W, VIDEO_H), new THREE.MeshStandardMaterial({ color: '#c9ccd0', roughness: 1, side: THREE.DoubleSide }))
  ceil.rotation.x = Math.PI / 2; ceil.position.copy(frame.vec(VIDEO_W / 2, VIDEO_H / 2, H)); b.object(ceil)
  // the screen and its cold light on the faces (the room lights are low)
  const screens = (['blank', 'pct70', 'p312', 'box5', 'arrows', 'arrows8', 'file33'] as Screen[]).map((k) => [k, screenTexture(k)] as const)
  const tex = new Map(screens)
  b.disposables.push(...screens.map(([, t]) => t))
  const scrMat = new THREE.MeshBasicMaterial({ map: tex.get('blank')!, toneMapped: false })
  const sp = frame.vec(VIDEO_MARKS.screen.x, 0.12)
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.9), scrMat)
  scr.position.set(sp.x, 1.55, sp.z); b.object(scr)
  b.add(new THREE.BoxGeometry(3.5, 2.0, 0.05), '#1b1c1f', M.t(sp.x, 1.55, sp.z - 0.03), { mat: 'shiny' })
  const screenLight = new THREE.PointLight('#cfe2ff', 3.2, 9, 1.5); screenLight.position.set(sp.x, 1.5, sp.z + 0.8); b.object(screenLight)
  const lamp = new THREE.PointLight('#f2efe6', 1.6, 12, 1.4); lamp.position.copy(frame.vec(VIDEO_W / 2, VIDEO_H / 2, H - 0.3)); b.object(lamp)
  // the chairs: grey plastic, three rows; a table at the side with the cables
  for (const [x, y] of VIDEO_SEATS) {
    const c = frame.vec(x, y)
    b.add(new THREE.BoxGeometry(0.44, 0.05, 0.42), '#3a4048', M.t(c.x, 0.45, c.z), { mat: 'shiny' })
    b.add(new THREE.BoxGeometry(0.44, 0.42, 0.05), '#3a4048', M.t(c.x, 0.68, c.z + 0.21), { mat: 'shiny' })
    for (const [ex, ez] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]]) b.add(new THREE.CylinderGeometry(0.012, 0.012, 0.45, 5), '#8a9096', M.t(c.x + ex, 0.22, c.z + ez), { mat: 'shiny' })
  }
  const t = frame.vec(7.6, 0.9)
  b.add(new THREE.BoxGeometry(1.2, 0.05, 0.6), '#d9d6ce', M.t(t.x, 0.74, t.z))
  for (const [ex, ez] of [[-0.55, -0.25], [0.55, -0.25], [-0.55, 0.25], [0.55, 0.25]]) b.add(new THREE.CylinderGeometry(0.02, 0.02, 0.74, 6), '#6a6e72', M.t(t.x + ex, 0.37, t.z + ez), { mat: 'shiny' })
  b.add(new THREE.CylinderGeometry(0.006, 0.006, 1.6, 4), '#111', M.trs([t.x - 1.2, 0.76, t.z - 0.4], [0, 0, Math.PI / 2 - 0.2]))
  const yard = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: '#6a6e72', roughness: 0.9 }))
  yard.rotation.x = -Math.PI / 2; yard.position.set(0, -0.02, 0); b.object(yard)
  const group = b.build()
  stage.scene.add(group)
  return {
    group, marks: VIDEO_MARKS,
    update() {},
    cue(name) { const m = tex.get(name as Screen); if (m) { scrMat.map = m; scrMat.needsUpdate = true } },
    dispose() { stage.scene.remove(group); b.dispose() },
  }
}
