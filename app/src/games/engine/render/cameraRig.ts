// Cameras: tactical (the whole picture from above), broadcast (side-on, follows the ball), player
// (behind the controlled player, towards the attack), cinematic (slow orbit for demos and replays)
// and free (orbit controls). Switching glides from one to the other; all smoothing is exponential
// so it feels the same at 30 or 144 fps. Shake is an additive offset, never moving the target.
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { Stage } from './stage'

export type CamMode = 'tactical' | 'broadcast' | 'player' | 'cinematic' | 'free'

export interface CamContext {
  /** ball in three coordinates */
  ball: THREE.Vector3
  /** controlled or highlighted player, three coordinates */
  focus: THREE.Vector3 | null
  /** attack direction in three (unit, ground plane) */
  attack: THREE.Vector3
  /** playing area centre and size in metres (three coordinates) */
  center: THREE.Vector3
  size: { w: number; h: number }
}

export class CameraRig {
  mode: CamMode = 'tactical'
  private pos = new THREE.Vector3(0, 30, 30)
  private look = new THREE.Vector3()
  private smoothRate = 4
  private glide = 0
  private orbitAngle = 0.6
  private trauma = 0
  private t = 0
  controls: OrbitControls | null = null
  /** limit the camera to stay above this height (street scenes) */
  minY = 1.2

  constructor(private stage: Stage) {}

  setMode(m: CamMode, snap = false) {
    if (m === this.mode && !snap) return
    if (this.mode === 'free' && this.controls) { this.controls.dispose(); this.controls = null }
    this.mode = m
    this.glide = snap ? 0 : 1.1
    if (m === 'free') {
      this.controls = new OrbitControls(this.stage.camera, this.stage.renderer.domElement)
      this.controls.target.copy(this.look)
      this.controls.enableDamping = true
      this.controls.maxPolarAngle = Math.PI * 0.47
      this.controls.minDistance = 4
      this.controls.maxDistance = 140
    }
    if (snap) this.glide = 0
  }

  /** Strong feedback only (goal, post): decays by itself. */
  shake(amount: number) { this.trauma = Math.min(1, this.trauma + amount) }

  /**
   * The tactical camera for an area: from above and behind the near touchline, the whole area in view.
   * On a portrait screen a long area is turned so the attack goes up the screen (behind our goal).
   */
  tacticalFor(ctx: CamContext) {
    const cam = this.stage.camera
    const { fx, fy } = this.stage.visibleFraction()
    const aspect = cam.aspect * fx / fy
    const endOn = aspect < 0.9 && ctx.size.w > ctx.size.h * 0.95
    const pitch = THREE.MathUtils.degToRad(endOn ? 55 : aspect < 0.8 ? 58 : 50)
    // area extents across and along the view
    let across = endOn ? ctx.size.h : ctx.size.w, along = endOn ? ctx.size.w : ctx.size.h
    const center = ctx.center.clone()
    // phones follow the ball inside a window where players stay readable
    const maxAcross = aspect < 1 ? (endOn ? 34 : 30) : 72
    const maxAlong = aspect < 1 ? (endOn ? 48 : 40) : 52
    if (across > maxAcross) {
      if (endOn) center.z = THREE.MathUtils.clamp(ctx.ball.z, ctx.center.z - ctx.size.h / 2 + maxAcross / 2, ctx.center.z + ctx.size.h / 2 - maxAcross / 2)
      else center.x = THREE.MathUtils.clamp(ctx.ball.x, ctx.center.x - ctx.size.w / 2 + maxAcross / 2, ctx.center.x + ctx.size.w / 2 - maxAcross / 2)
      across = maxAcross
    }
    if (along > maxAlong) {
      if (endOn) center.x = THREE.MathUtils.clamp(ctx.ball.x + 6, ctx.center.x - ctx.size.w / 2 + maxAlong / 2, ctx.center.x + ctx.size.w / 2 - maxAlong / 2)
      else center.z = THREE.MathUtils.clamp(ctx.ball.z, ctx.center.z - ctx.size.h / 2 + maxAlong / 2, ctx.center.z + ctx.size.h / 2 - maxAlong / 2)
      along = maxAlong
    }
    // the camera stands on the side `back` points to (three coordinates, ground plane)
    const back = endOn ? new THREE.Vector3(-1, 0, 0) : new THREE.Vector3(0, 0, 1)
    const w = endOn ? along : across, h = endOn ? across : along
    const d = this.fitDistance(center, w + 3, h + 3, pitch, fx, fy, back)
    const pos = center.clone().add(back.clone().multiplyScalar(Math.cos(pitch) * d)).setY(center.y + Math.sin(pitch) * d)
    return { pos, look: center }
  }

  /** Smallest distance at which a w x h ground rectangle fits the visible part of the view. */
  private fitDistance(center: THREE.Vector3, w: number, h: number, pitch: number, fx: number, fy: number, back: THREE.Vector3) {
    const cam = this.probe ?? (this.probe = this.stage.camera.clone())
    cam.fov = this.stage.camera.fov
    cam.aspect = this.stage.camera.aspect
    cam.clearViewOffset()
    cam.updateProjectionMatrix()
    const corners = [[-w / 2, -h / 2], [w / 2, -h / 2], [-w / 2, h / 2], [w / 2, h / 2]].map(([x, z]) => new THREE.Vector3(center.x + x, 0, center.z + z))
    const v = new THREE.Vector3()
    let lo = 4, hi = 400
    for (let i = 0; i < 22; i++) {
      const d = (lo + hi) / 2
      cam.position.copy(center).add(back.clone().multiplyScalar(Math.cos(pitch) * d)).setY(Math.sin(pitch) * d)
      cam.lookAt(center)
      cam.updateMatrixWorld()
      let ok = true
      for (const c of corners) { v.copy(c).project(cam); if (Math.abs(v.x) > fx || Math.abs(v.y) > fy || v.z > 1) { ok = false; break } }
      if (ok) hi = d; else lo = d
    }
    return hi
  }
  private probe: THREE.PerspectiveCamera | null = null

  update(dt: number, ctx: CamContext) {
    this.t += dt
    const cam = this.stage.camera
    if (this.mode === 'free' && this.controls) { this.controls.update(); this.look.copy(this.controls.target); this.pos.copy(cam.position); return }
    let want: { pos: THREE.Vector3; look: THREE.Vector3 }
    const scale = Math.max(ctx.size.w, ctx.size.h)
    switch (this.mode) {
      case 'tactical': want = this.tacticalFor(ctx); break
      case 'broadcast': {
        const big = scale > 45
        const dist = big ? 34 : Math.max(14, scale * 0.85)
        const height = big ? 17 : Math.max(8, scale * 0.42)
        const lx = THREE.MathUtils.clamp(ctx.ball.x, ctx.center.x - ctx.size.w / 2 + 8, ctx.center.x + ctx.size.w / 2 - 8)
        const look = new THREE.Vector3(lx, 0, THREE.MathUtils.lerp(ctx.center.z, ctx.ball.z, 0.35))
        want = { pos: new THREE.Vector3(lx, height, ctx.center.z + ctx.size.h / 2 + dist * 0.55), look }
        break
      }
      case 'player': {
        const f = ctx.focus ?? ctx.ball
        const a = ctx.attack.clone().normalize()
        const pos = f.clone().sub(a.clone().multiplyScalar(8.5)).add(new THREE.Vector3(0, 4.2, 0))
        const look = f.clone().add(a.clone().multiplyScalar(7)).setY(0.6)
        want = { pos, look }
        break
      }
      case 'cinematic': {
        this.orbitAngle += dt * 0.16
        const c = ctx.focus ?? ctx.ball
        const r = Math.max(9, Math.min(scale * 0.45, 22))
        want = { pos: new THREE.Vector3(c.x + Math.cos(this.orbitAngle) * r, 3.4 + r * 0.12, c.z + Math.sin(this.orbitAngle) * r), look: c.clone().setY(0.9) }
        break
      }
      default: want = this.tacticalFor(ctx)
    }
    const rate = this.glide > 0 ? 3.2 : this.mode === 'tactical' ? 3 : this.smoothRate
    this.glide = Math.max(0, this.glide - dt)
    const k = 1 - Math.exp(-rate * dt)
    this.pos.lerp(want.pos, k)
    this.look.lerp(want.look, k)
    this.pos.y = Math.max(this.minY, this.pos.y)
    // shake: smooth noise scaled by trauma squared, decaying
    this.trauma = Math.max(0, this.trauma - dt * 1.4)
    const s = this.trauma * this.trauma * 0.35
    const off = new THREE.Vector3(Math.sin(this.t * 37) * s, Math.sin(this.t * 41 + 1) * s * 0.6, Math.sin(this.t * 29 + 2) * s)
    cam.position.copy(this.pos).add(off)
    cam.lookAt(this.look)
  }

  /** Jump straight to the current mode's framing (first frame, after loading a drill). */
  snap(ctx: CamContext) {
    this.glide = 0
    const before = this.smoothRate
    this.smoothRate = 1000
    for (let i = 0; i < 3; i++) {
      const want = this.mode === 'tactical' ? this.tacticalFor(ctx) : null
      if (want) { this.pos.copy(want.pos); this.look.copy(want.look) } else this.update(1, ctx)
    }
    this.smoothRate = before
    this.stage.camera.position.copy(this.pos)
    this.stage.camera.lookAt(this.look)
  }

  dispose() { this.controls?.dispose() }
}
