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

  /** The tactical camera for an area: from above and slightly behind the near touchline. */
  tacticalFor(ctx: CamContext) {
    const cam = this.stage.camera
    const vfov = THREE.MathUtils.degToRad(cam.fov)
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * cam.aspect)
    const pitch = THREE.MathUtils.degToRad(62)
    let w = ctx.size.w, h = ctx.size.h
    let center = ctx.center.clone()
    // big pitches on narrow screens: follow the ball within a window instead of showing everything
    const maxW = cam.aspect < 1 ? 34 : 70
    if (w > maxW) {
      const half = maxW / 2
      center.x = THREE.MathUtils.clamp(ctx.ball.x, ctx.center.x - ctx.size.w / 2 + half, ctx.center.x + ctx.size.w / 2 - half)
      w = maxW
      h = Math.min(h, maxW / Math.max(0.6, cam.aspect) * 0.9)
      center.z = THREE.MathUtils.clamp(ctx.ball.z, ctx.center.z - ctx.size.h / 2 + h / 2, ctx.center.z + ctx.size.h / 2 - h / 2)
    }
    const dW = (w / 2 + 2) / Math.tan(hfov / 2)
    const dH = (h / 2 + 2) / Math.tan(vfov / 2) * 0.95
    const d = Math.max(dW, dH, 8)
    const pos = new THREE.Vector3(center.x, center.y + Math.sin(pitch) * d, center.z + Math.cos(pitch) * d)
    return { pos, look: center }
  }

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
