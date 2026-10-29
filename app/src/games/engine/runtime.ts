// Runtime: the fixed-timestep loop and the view that draws a World with interpolation.
import * as THREE from 'three'
import { BallView } from './render/ballView'
import { CameraRig, type CamContext, type CamMode } from './render/cameraRig'
import { Character } from './render/character'
import { Human } from './render/human'
import { Goat, type Figure } from './render/animal'
import { Overlays } from './render/overlays'
import { buildPitch, type PitchView, type Surround } from './render/pitchView'
import { FpsMonitor, Frame, Stage, detectQuality, type Quality } from './render/stage'
import { attackTarget } from './sim/pitch'
import { DT, type World } from './sim/world'
import type { Player } from './sim/types'
import type { V2 } from './sim/math'

export interface ViewOpts {
  quality?: Quality
  surround?: Surround
  toon?: boolean
  outline?: boolean
  background?: string
  fog?: [number, number] | null
  /** skip building the pitch (story scenes build their own world) */
  noPitch?: boolean
  /** the old procedural figures (tests, very old devices) instead of the skinned humans */
  legacyFigures?: boolean
}

export interface Label { id: string; text: string; tone?: 'a' | 'b' | 'n' | 'gold' | 'dark'; big?: boolean }

export class SimView {
  stage: Stage
  frame: Frame
  pitch: PitchView | null = null
  ball = new BallView()
  chars = new Map<string, Figure>()
  overlays: Overlays
  rig: CameraRig
  fps = new FpsMonitor()
  labels = new Map<string, Label>()
  private labelEls = new Map<string, HTMLDivElement>()
  private labelRoot: HTMLDivElement
  private raycaster = new THREE.Raycaster()
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  private lastBall = new THREE.Vector3()
  highlight: string | null = null
  /** art checks and screenshots: keep the full picture even when the frame rate is low */
  noDegrade = typeof location !== 'undefined' && new URLSearchParams(location.search).has('hq')

  constructor(public container: HTMLElement, public world: World, public opts: ViewOpts = {}) {
    const quality = opts.quality ?? detectQuality()
    const fog = opts.fog !== undefined ? opts.fog : (opts.surround ?? 'training') === 'training' ? [150, 460] as [number, number] : null
    this.stage = new Stage(container, { quality, background: opts.background, fog })
    this.frame = new Frame(world.pitch.w, world.pitch.h)
    if (!opts.noPitch) this.pitch = buildPitch(this.stage, this.frame, world.pitch, opts.surround ?? 'training')
    this.stage.scene.add(this.ball.group)
    this.overlays = new Overlays(this.frame)
    this.stage.scene.add(this.overlays.group)
    this.rig = new CameraRig(this.stage)
    this.labelRoot = document.createElement('div')
    this.labelRoot.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden'
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative'
    container.appendChild(this.labelRoot)
    this.syncPlayers()
  }

  syncPlayers() {
    const q = this.stage.quality
    for (const p of this.world.players) {
      if (this.chars.has(p.id)) continue
      const c: Figure = p.look.animal ? new Goat(p.look, { castShadow: q.shadows }) : this.opts.legacyFigures ? new Character(p.look, { toon: this.opts.toon, outline: (this.opts.outline ?? true) && q.outlines, castShadow: q.shadows }) : new Human(p.look, { castShadow: q.shadows })
      c.root.position.copy(this.frame.vec(p.pos.x, p.pos.y))
      c.snapFacing(p.facing)
      this.chars.set(p.id, c)
      this.stage.scene.add(c.root)
    }
    for (const [id, c] of this.chars) if (!this.world.byId.has(id)) { this.stage.scene.remove(c.root); c.dispose(); this.chars.delete(id) }
  }

  /** Swap in a new world on the same pitch (restarts, demo then attempt). Characters with the same id are kept. */
  setWorld(w: World) {
    this.world = w
    // a new place may have another size: the frame is shared (overlays), so it changes in place
    this.frame.w = w.pitch.w; this.frame.h = w.pitch.h
    for (const [id, c] of this.chars) {
      const p = w.get(id)
      if (!p) continue
      c.root.position.copy(this.frame.vec(p.pos.x, p.pos.y))
      c.snapFacing(p.facing)
    }
    this.syncPlayers()
    this.labels.clear()
    this.highlight = null
  }

  camContext(): CamContext {
    const w = this.world
    const ctl = w.players.find((p) => p.controlled) ?? (this.highlight ? w.get(this.highlight) : undefined) ?? w.owner()
    const side = ctl ? (w.sideOf(ctl) ?? 'a') : 'a'
    const goal = attackTarget(w.pitch, side)
    const focus = ctl ? this.frame.vec(ctl.pos.x, ctl.pos.y) : null
    const attack = ctl ? this.frame.vec(goal.x, goal.y).sub(this.frame.vec(ctl.pos.x, ctl.pos.y)).setY(0) : new THREE.Vector3(1, 0, 0)
    if (attack.lengthSq() < 1) attack.set(side === 'a' ? 1 : -1, 0, 0)
    // a pure "towards the goal" direction feels better than a wobbling one
    attack.set(side === 'a' ? 1 : -1, 0, attack.z * 0.15)
    return {
      ball: this.lastBall.clone(), focus, attack,
      center: new THREE.Vector3(0, 0, 0), size: { w: w.pitch.w, h: w.pitch.h },
    }
  }

  setCamera(m: CamMode, snap = false) { this.rig.setMode(m, snap); if (snap) this.rig.snap(this.camContext()) }

  /** Draw the world, interpolated between the last two ticks by alpha (0..1). */
  render(alpha: number, dt: number) {
    const w = this.world
    const a = Math.max(0, Math.min(1, alpha))
    for (const p of w.players) {
      const c = this.chars.get(p.id)
      if (!c) continue
      const pr = w.prev.get(p.id) ?? p.pos
      const x = pr.x + (p.pos.x - pr.x) * a, y = pr.y + (p.pos.y - pr.y) * a
      c.root.position.set(this.frame.x(x), 0, this.frame.z(y))
      const speed = Math.hypot(p.vel.x, p.vel.y)
      const look = p.meta.lookAt ? Math.atan2((p.meta.lookAt as V2).y - p.pos.y, (p.meta.lookAt as V2).x - p.pos.x) : p.faceTarget ? Math.atan2(p.faceTarget.y - p.pos.y, p.faceTarget.x - p.pos.x) : Math.atan2(w.ball.pos.y - p.pos.y, w.ball.pos.x - p.pos.x)
      const pose = p.meta.pose as Player['anim'] | undefined
      c.update({ speed: pose ? 0 : speed, velAngle: Math.atan2(p.vel.y, p.vel.x), facing: p.facing, maxSpeed: p.maxSpeed, anim: pose ?? p.anim, animT: pose ? (p.meta.poseT as number ?? p.animT) : p.animT, kickFoot: p.kickFoot, lookAngle: look, gk: p.gk, mood: (p.meta.mood as 'happy' | 'sad' | undefined) }, dt)
    }
    const pb = w.prevBall, b = w.ball.pos
    const bx = pb.x + (b.x - pb.x) * a, by = pb.y + (b.y - pb.y) * a, bz = pb.z + (b.z - pb.z) * a
    this.lastBall.set(this.frame.x(bx), bz, this.frame.z(by))
    this.ball.update(this.lastBall, w.ball.vel.x, w.ball.vel.y, dt)
    this.rig.update(dt, this.camContext())
    this.stage.render()
    this.drawLabels()
    this.fps.tick()
    if (this.fps.struggling() && !this.noDegrade) this.degrade()
  }

  /** The picture stutters: drop one notch (pixel ratio, then shadows and outlines). */
  degrade() {
    const st = this.stage
    this.fps.reset()
    if (st.degradePost()) return
    const dpr = st.renderer.getPixelRatio()
    if (dpr > 1.01) { st.renderer.setPixelRatio(Math.max(1, dpr - 0.5)); st.resize(); return }
    if (st.renderer.shadowMap.enabled) {
      st.renderer.shadowMap.enabled = false
      st.scene.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.Material | undefined; if (m) m.needsUpdate = true })
      return
    }
    for (const c of this.chars.values()) if (c.outline) c.outline.visible = false
  }

  private drawLabels() {
    const seen = new Set<string>()
    for (const [id, l] of this.labels) {
      const p = this.world.get(id)
      const c = this.chars.get(id)
      if (!p || !c) continue
      seen.add(id)
      let el = this.labelEls.get(id)
      if (!el) {
        el = document.createElement('div')
        el.style.cssText = 'position:absolute;transform:translate(-50%,-100%);font:700 12px/1 "Archivo Variable",system-ui,sans-serif;padding:4px 7px;border-radius:999px;white-space:nowrap;letter-spacing:.01em;box-shadow:0 2px 8px rgba(0,0,0,.25)'
        this.labelRoot.appendChild(el)
        this.labelEls.set(id, el)
      }
      const tone = l.tone ?? 'dark'
      const bg = tone === 'a' ? '#0B5D3B' : tone === 'b' ? '#D7263D' : tone === 'n' ? '#F5B700' : tone === 'gold' ? '#F5B700' : 'rgba(10,33,23,.86)'
      const fg = tone === 'n' || tone === 'gold' ? '#12211A' : '#F6F7F2'
      if (el.textContent !== l.text) el.textContent = l.text
      el.style.background = bg; el.style.color = fg
      el.style.fontSize = l.big ? '14px' : '12px'
      const top = c.root.position.clone().add(new THREE.Vector3(0, c.height + 0.35, 0))
      const s = this.stage.project(top)
      el.style.display = s.visible ? 'block' : 'none'
      el.style.left = `${s.x}px`; el.style.top = `${s.y}px`
    }
    for (const [id, el] of this.labelEls) if (!seen.has(id)) { el.remove(); this.labelEls.delete(id) }
  }

  /** Sim point on the grass under a screen position (client coordinates). */
  groundPoint(clientX: number, clientY: number) {
    const r = this.stage.renderer.domElement.getBoundingClientRect()
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1)
    this.raycaster.setFromCamera(ndc, this.stage.camera)
    const hit = new THREE.Vector3()
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, hit)) return null
    return this.frame.toSim(hit)
  }

  /** The player nearest to a click/tap (on the grass or on the body), within reach. */
  pickPlayer(clientX: number, clientY: number, filter?: (p: Player) => boolean, maxDist = 2.2): Player | null {
    const pt = this.groundPoint(clientX, clientY)
    // also test screen distance to each player's chest, which is kinder on phones
    const r = this.stage.renderer.domElement.getBoundingClientRect()
    let best: Player | null = null, bestScore = Infinity
    for (const p of this.world.players) {
      if (filter && !filter(p)) continue
      const c = this.chars.get(p.id)
      if (!c) continue
      const chest = this.stage.project(c.root.position.clone().add(new THREE.Vector3(0, c.height * 0.55, 0)))
      const screenD = Math.hypot(chest.x + r.left - clientX, chest.y + r.top - clientY)
      const groundD = pt ? Math.hypot(pt.x - p.pos.x, pt.y - p.pos.y) : 99
      const score = Math.min(screenD / 34, groundD / maxDist)
      if (score < bestScore) { bestScore = score; best = p }
    }
    return bestScore <= 1 ? best : null
  }

  dispose() {
    this.labelRoot.remove()
    for (const c of this.chars.values()) c.dispose()
    this.overlays.dispose()
    this.pitch?.dispose()
    this.rig.dispose()
    this.stage.dispose()
  }
}

/** Fixed 60 Hz simulation with render interpolation and a time scale (slow motion, freeze). */
export class GameLoop {
  running = false
  timeScale = 1
  private acc = 0
  private last = 0
  private raf = 0
  /** game logic before each simulation tick (input, rules) */
  onTick: (dt: number) => void = () => {}
  /** after each rendered frame (UI sync, labels) */
  onFrame: (dt: number) => void = () => {}

  constructor(public world: World, public view: SimView) {}

  setWorld(w: World) { this.world = w; this.view.setWorld(w); this.acc = 0 }

  start() {
    if (this.running) return
    this.running = true
    this.last = performance.now()
    const frame = (now: number) => {
      if (!this.running) return
      const dt = Math.min(0.1, (now - this.last) / 1000)
      this.last = now
      this.acc += dt * this.timeScale
      let steps = 0
      while (this.acc >= DT && steps < 6) {
        this.onTick(DT)
        this.world.step(DT)
        this.acc -= DT
        steps++
      }
      if (steps >= 6) this.acc = 0
      this.view.render(this.timeScale > 0 ? this.acc / DT : 1, dt)
      this.onFrame(dt)
      this.raf = requestAnimationFrame(frame)
    }
    this.raf = requestAnimationFrame(frame)
  }
  stop() { this.running = false; cancelAnimationFrame(this.raf) }
  /** run the simulation without drawing (tests, fast-forward) */
  simulate(seconds: number) { const n = Math.round(seconds / DT); for (let i = 0; i < n; i++) { this.onTick(DT); this.world.step(DT) } }
}
