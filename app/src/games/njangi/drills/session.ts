// One lesson of the Académie Njangi on screen: the 3D view and the loop around a LessonRunner
// (the rules), the input (pointer, keyboard, gamepad, touch), the drawings on the grass and a
// small state object React reads.
import * as THREE from 'three'
import type { Drill } from '../../../lib/types'
import { Input } from '../../engine/input/input'
import { OVERLAY_COLORS } from '../../engine/render/overlays'
import { GameLoop, SimView } from '../../engine/runtime'
import { analysePass } from '../../engine/sim/lanes'
import { dist2, type V2 } from '../../engine/sim/math'
import type { Level, Player } from '../../engine/sim/types'
import type { World } from '../../engine/sim/world'
import { meetPoint } from '../../engine/ai/brains'
import type { Quality } from '../../engine/render/stage'
import type { CamMode } from '../../engine/render/cameraRig'
import { sfx } from '../../shared/audio'
import { stepTarget, type Step } from './scenario'
import type { FeedItem } from './scorer'
import { LessonRunner, ours, type LessonPhase, type LessonResult } from './runner'
import type { DrillGameplay } from './types'

export type { LessonPhase, LessonResult }

export interface LessonState {
  phase: LessonPhase
  level: Level
  paused: boolean
  /** demonstration: the numbered action being played (1-based) and how many there are */
  demoStep: number
  demoSteps: number
  demoCaption: Step[]
  demoDone: boolean
  time: number
  timeLeft: number | null
  /** attempts: seconds left in the running attempt */
  attemptLeft: number | null
  points: number
  progress: number
  attempts: number
  successes: number
  feed: FeedItem[]
  /** a short message between attempts */
  banner: { key: string; tone: 'good' | 'bad' } | null
  result: LessonResult | null
  hasGoal: boolean
  ourBall: boolean
  camera: CamMode
  /** pattern: who should receive next (to help after a wrong pass) */
  hint: string | null
  /** the running possession: completed passes and our players (keeper included) who touched it */
  chainPasses: number
  chainTouched: number
}

export interface LessonOpts { level: Level; quality?: Quality; control?: 'decisions' | 'carrier'; seed?: number }

export class LessonSession {
  view: SimView
  loop: GameLoop
  input = new Input()
  runner: LessonRunner
  state: LessonState
  private listeners = new Set<() => void>()
  private suggested: string | null = null
  private controlled: string | null = null
  private notifyAt = 0
  private disposers: (() => void)[] = []
  private laneClock = 0

  constructor(el: HTMLElement, public drill: Drill, public g: DrillGameplay, public opts: LessonOpts) {
    this.runner = new LessonRunner(drill, g, { level: opts.level, control: opts.control, seed: opts.seed }, {
      world: (w) => this.onWorld(w),
      change: (f) => this.sync(f),
      cue: (c) => sfx(c),
    })
    this.view = new SimView(el, this.runner.world, { quality: opts.quality, surround: 'training' })
    this.loop = new GameLoop(this.runner.world, this.view)
    this.state = {
      phase: 'brief', level: opts.level, paused: false, demoStep: 0, demoSteps: 0, demoCaption: [], demoDone: false,
      time: 0, timeLeft: null, attemptLeft: null, points: 0, progress: 0, attempts: 0, successes: 0, feed: [], banner: null, result: null,
      hasGoal: !!this.runner.world.pitch.goalFor.a, ourBall: true, camera: 'tactical', hint: null, chainPasses: 0, chainTouched: 0,
    }
    this.loop.onTick = (dt) => this.runner.tick(dt)
    this.loop.onFrame = () => this.frame()
    const canvas = this.view.stage.renderer.domElement
    const down = (e: PointerEvent) => this.onPointer(e)
    canvas.addEventListener('pointerdown', down)
    this.disposers.push(() => canvas.removeEventListener('pointerdown', down))
    this.showBrief()
    this.loop.start()
  }

  get world() { return this.runner.world }
  get scorer() { return this.runner.scorer }

  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn) } }
  private emit() { this.state = { ...this.state }; for (const l of this.listeners) l() }
  /** copy what the UI shows from the runner; throttled unless forced */
  private sync(force: boolean) {
    if (!this.state) return
    const now = performance.now()
    if (!force && now - this.notifyAt < 100) return
    this.notifyAt = now
    const r = this.runner, st = this.state, s = r.scorer
    st.phase = r.phase
    st.result = r.result
    st.banner = r.banner
    st.hint = r.hint
    st.demoDone = r.demoDone
    st.demoStep = r.demoStep
    st.demoSteps = r.director && r.phase === 'demo' ? r.director.groups.length : st.demoSteps
    st.demoCaption = r.director && r.phase === 'demo' ? r.director.groups[Math.max(0, r.demoStep - 1)] ?? [] : []
    st.time = r.playTime
    st.timeLeft = r.endAt !== null && r.phase === 'play' ? Math.max(0, r.endAt - r.playTime) : null
    st.attemptLeft = this.g.target.kind === 'attempts' && r.phase === 'play' && !r.betweenUntil ? Math.max(0, r.attemptLimit() - this.world.t) : null
    if (s) { st.points = s.points; st.progress = Math.min(1, s.progress()); st.attempts = s.attempts; st.successes = s.successes; st.feed = s.feed.slice(-4) }
    else { st.points = 0; st.progress = 0; st.attempts = 0; st.successes = 0; st.feed = [] }
    st.ourBall = !!r.carrier()
    st.chainPasses = s?.chainPasses() ?? 0
    st.chainTouched = s?.chainTouched() ?? 0
    if (r.phase === 'result' && !st.paused) this.loop.timeScale = 0.25
    this.emit()
  }

  private onWorld(w: World) {
    if (!this.loop) return
    this.loop.setWorld(w)
    this.controlled = null
    this.suggested = null
    this.view.overlays.clear('play')
    if (this.runner.phase === 'play' && this.g.mode === 'pattern') this.drawDiagram(0.22)
  }

  /* ------------------------------------------------------------ phases */

  showBrief() {
    this.runner.brief()
    this.view.overlays.clear()
    this.drawDiagram()
    this.showLabels(true)
    this.setCamera('tactical', true)
    this.loop.timeScale = 1
    this.sync(true)
  }

  startDemo() {
    this.runner.demo()
    this.view.overlays.clear()
    this.drawDiagram(0.55)
    this.showLabels(true)
    this.setCamera(this.state.camera === 'free' ? 'free' : 'tactical', false)
    this.loop.timeScale = 1
    this.sync(true)
  }

  startPlay() {
    this.runner.play()
    this.view.overlays.clear()
    if (this.g.mode === 'pattern') this.drawDiagram(0.22)
    this.showLabels(false)
    this.setCamera(this.state.camera === 'free' ? 'free' : this.state.camera === 'player' ? 'player' : 'tactical', true)
    this.loop.timeScale = 1
    this.sync(true)
  }

  setLevel(l: Level) { this.opts.level = l; this.runner.opts.level = l; this.state.level = l; this.emit() }
  setControl(c: 'decisions' | 'carrier') { this.opts.control = c; this.runner.opts.control = c; this.emit() }
  pause(v: boolean) { this.state.paused = v; this.loop.timeScale = v ? 0 : this.state.phase === 'result' ? 0.25 : 1; this.input.enabled = !v; this.emit() }
  setCamera(m: CamMode, snap = false) { this.state.camera = m; this.view.setCamera(m, snap); this.emit() }
  cycleCamera() {
    const order: CamMode[] = ['tactical', 'broadcast', 'player', 'free']
    this.setCamera(order[(order.indexOf(this.state.camera) + 1) % order.length])
  }

  /* ------------------------------------------------------------ drawing */

  /** The sheet's diagram on the grass: zones, numbered arrows. */
  private drawDiagram(opacity = 0.9) {
    const o = this.view.overlays
    o.clear('diagram')
    const w = this.world
    const spec = this.runner.spec
    for (const z of spec.zones ?? []) {
      const c = z.tone === 'a' ? OVERLAY_COLORS.a : z.tone === 'b' ? OVERLAY_COLORS.b : z.tone === 'n' ? OVERLAY_COLORS.n : OVERLAY_COLORS.soft
      o.zone('diagram', z.x, z.y, z.w, z.h, c, 0.16 * opacity + 0.04)
    }
    // arrows start where each actor stands at that moment of the sequence (the book's drawing)
    const at = new Map<string, V2>((spec.players ?? []).map((p) => [p.id, { x: p.x, y: p.y }]))
    for (const s of this.runner.scenario.steps) {
      const from = s.startAt ?? at.get(s.from)
      if (!from) continue
      const to = typeof s.to === 'string' ? at.get(s.to) ?? stepTarget(w, s) : s.to
      const color = s.kind === 'press' ? OVERLAY_COLORS.b : s.kind === 'run' ? OVERLAY_COLORS.run : s.kind === 'shot' ? OVERLAY_COLORS.gold : OVERLAY_COLORS.chalk
      o.arrow('diagram', from, to, s.kind, color, { opacity, trim: typeof s.to === 'string' ? 0.6 : 0 })
      if (s.kind === 'run' || s.kind === 'dribble') at.set(s.from, { ...to })
      if (s.kind === 'pass' && s.receiver && typeof s.to !== 'string') at.set(s.receiver, { ...s.to })
    }
  }

  private showLabels(on: boolean) {
    this.view.labels.clear()
    if (!on) return
    const steps = this.runner.scenario.steps
    const actors = new Set(steps.flatMap((s) => [s.from, typeof s.to === 'string' ? s.to : '', s.receiver ?? '']))
    for (const p of this.world.players) {
      const dp = this.runner.spec.players?.find((q) => q.id === p.id)
      const text = dp?.label ?? (actors.has(p.id) ? p.id.toUpperCase() : '')
      if (!text) continue
      this.view.labels.set(p.id, { id: p.id, text, tone: p.team === 'b' ? 'b' : p.team === 'n' ? 'n' : 'a' })
    }
  }

  /* ------------------------------------------------------------ input */

  /** sim direction from the screen-relative stick */
  private stickToSim(a: V2): V2 | null {
    if (Math.hypot(a.x, a.y) < 0.05) return null
    const cam = this.view.stage.camera
    const f = new THREE.Vector3(); cam.getWorldDirection(f); f.y = 0
    if (f.lengthSq() < 1e-6) f.set(0, 0, -1)
    f.normalize()
    const r = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize()
    const d = r.multiplyScalar(a.x).add(f.multiplyScalar(a.y))
    return { x: d.x, y: d.z }
  }

  private onPointer(e: PointerEvent) {
    if (this.state.phase !== 'play' || this.state.paused) return
    this.input.pointer()
    const r = this.runner
    const c = r.carrier()
    if (!c) {
      // defending in carrier mode: tap a player to control him
      if (r.control === 'carrier') {
        const p = this.view.pickPlayer(e.clientX, e.clientY, (q) => q.team === 'a' && !q.gk)
        if (p) this.controlled = p.id
      }
      return
    }
    const p = this.view.pickPlayer(e.clientX, e.clientY, (q) => q !== c && ours(this.world, q))
    if (p) { r.pass(c, p, null); return }
    const goal = this.world.pitch.goalFor.a
    const pt = this.view.groundPoint(e.clientX, e.clientY)
    if (!pt) return
    if (goal && dist2(pt, goal) < Math.max(3, goal.width)) { r.shoot(c, { x: 0, y: (pt.y - goal.y) / Math.max(1, goal.width) }); return }
    r.pass(c, null, pt)
  }

  private frame() {
    this.input.poll(performance.now() / 1000)
    if (this.input.pressed('pause') && (this.state.phase === 'play' || this.state.paused)) this.pause(!this.state.paused)
    if (this.input.pressed('camera')) this.cycleCamera()
    const o = this.view.overlays
    if (this.state.phase === 'play' && !this.state.paused && !this.runner.betweenUntil) this.handleControls()
    else { o.clear('play'); o.beginMarkers(); o.endMarkers(); for (const p of this.world.players) p.controlled = false }
    this.input.endFrame()
    this.sync(false)
  }

  private handleControls() {
    const r = this.runner
    const w = this.world
    const inp = this.input
    const dir = this.stickToSim(inp.axis())
    const c = r.carrier()
    const o = this.view.overlays
    o.beginMarkers()
    // who does the player move?
    let me: Player | null = null
    if (r.control === 'carrier') {
      if (c && c.team === 'a') me = c
      else {
        const cur = this.controlled ? w.get(this.controlled) : null
        const sw = inp.pressed('switch')
        const recv = w.pass?.receiver ? w.get(w.pass.receiver) : null
        if (recv && recv.team === 'a' && recv !== cur) me = recv
        else if (sw || !cur || cur.gk) me = nearestToBall(w, (q) => q.team === 'a' && !q.gk, sw ? cur : null)
        else me = cur
      }
      for (const p of w.players) p.controlled = p === me
      this.controlled = me?.id ?? null
      if (me) {
        if (dir) {
          me.target = { x: me.pos.x + dir.x * 3, y: me.pos.y + dir.y * 3 }
          me.speedMode = inp.held('sprint') ? 1 : 0.72
          me.faceTarget = null
          me.touchDir = dir
        } else if (w.pass && w.pass.receiver === me.id) {
          me.target = meetPoint(w, me, 0.05) ?? w.ball2(); me.speedMode = 1; me.faceTarget = w.ball2()
        } else { me.target = null; me.faceTarget = c === me ? null : w.ball2() }
        me.wantsBall = true
        if (c !== me && inp.pressed('tackle')) w.requestTackle(me, 'user')
        o.marker('me', me.pos, OVERLAY_COLORS.gold, { radius: 0.8, fill: 0.22 })
      }
    } else {
      for (const p of w.players) if (p.controlled) p.controlled = false
      if (c) o.marker('me', c.pos, OVERLAY_COLORS.gold, { radius: 0.8, fill: 0.22 })
    }
    // the carrier's options: rings under partners, the suggested receiver brighter
    const lanes = this.opts.level === 'facile' && !!c
    this.laneClock -= 1
    if (!lanes || this.laneClock <= 0) o.clear('play')
    if (c) {
      const rec = r.pickReceiver(c, dir)
      this.suggested = rec?.id ?? null
      for (const m of w.players) {
        if (m === c || !ours(w, m)) continue
        const isHint = r.hint === m.id
        const sug = m.id === this.suggested
        o.marker(m.id, m.pos, isHint ? OVERLAY_COLORS.gold : sug ? OVERLAY_COLORS.chalk : m.team === 'n' ? OVERLAY_COLORS.n : '#7FD3A2', { radius: sug ? 0.72 : 0.6, opacity: sug || isHint ? 0.95 : 0.6 })
        if (lanes && this.laneClock <= 0) {
          const a = analysePass(w, c, m.pos, m)
          o.arrow('play', c.pos, m.pos, 'lane', a.margin > 0.5 ? OVERLAY_COLORS.open : a.margin > 0 ? OVERLAY_COLORS.tight : OVERLAY_COLORS.closed, { opacity: a.margin > 0 ? 0.4 : 0.55, trim: 0.75 })
        }
      }
      if (inp.pressed('pass') && rec) r.pass(c, rec, null)
      else if (inp.pressed('through') && rec) r.pass(c, rec, null, true)
      else if (inp.pressed('shoot')) r.shoot(c, dir)
    }
    if (this.laneClock <= 0) this.laneClock = 6
    o.endMarkers()
  }

  /* ------------------------------------------------------------ teardown */

  dispose() {
    this.loop.stop()
    for (const d of this.disposers) d()
    this.runner.tagger?.dispose(); this.runner.scorer?.dispose()
    this.input.dispose()
    this.view.dispose()
    this.listeners.clear()
  }
}

function nearestToBall(w: World, filter: (p: Player) => boolean, not: Player | null = null) {
  let best: Player | null = null, bd = 1e9
  const b = w.ball2()
  for (const p of w.players) if (filter(p) && p !== not) { const d = dist2(p.pos, b); if (d < bd) { bd = d; best = p } }
  return best
}
