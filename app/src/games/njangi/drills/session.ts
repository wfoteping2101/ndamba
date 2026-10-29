// One lesson of the Académie Njangi, outside React: the 3D view, the loop, the drill's world,
// the demonstration (SequenceDirector), the attempt (user decisions or carrier control), the
// scorer and the result. React components read `state` and call the public methods.
import * as THREE from 'three'
import type { Drill } from '../../../lib/types'
import { njangiFromCounts, type NjangiResult } from '../../../lib/njangi'
import type { EventCode } from '../../../lib/types'
import { Input } from '../../engine/input/input'
import { OVERLAY_COLORS } from '../../engine/render/overlays'
import { GameLoop, SimView } from '../../engine/runtime'
import { analysePass, passOptions } from '../../engine/sim/lanes'
import { dist2, len2, type V2 } from '../../engine/sim/math'
import { Tagger } from '../../engine/sim/tagger'
import type { Level, Player } from '../../engine/sim/types'
import type { World } from '../../engine/sim/world'
import { meetPoint } from '../../engine/ai/brains'
import type { Quality } from '../../engine/render/stage'
import type { CamMode } from '../../engine/render/cameraRig'
import { Recorder, type Replay } from '../../engine/replay'
import { sfx } from '../../shared/audio'
import { SequenceDirector } from './director'
import { buildScenario, diagramOf, stepTarget, type Scenario, type Step } from './scenario'
import { DrillScorer, type FeedItem, type MistakeHit } from './scorer'
import { assignBrains } from './setup'
import type { DrillGameplay } from './types'

export type LessonPhase = 'brief' | 'demo' | 'play' | 'result'

export interface LessonResult {
  success: boolean
  level: Level
  points: number
  goals: number
  sequences: number
  regains: number
  attempts: number
  successes: number
  time: number
  mistakes: { mistake: MistakeHit['mistake']; coaching: number | null; count: number }[]
  counts: Record<EventCode, number>
  indice: NjangiResult | null
  replay: Replay | null
}

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
  controlLabel: string | null
  camera: CamMode
  /** pattern: who should receive next (to help after a wrong pass) */
  hint: string | null
}

export interface LessonOpts { level: Level; quality?: Quality; control?: 'decisions' | 'carrier'; seed?: number }

const ours = (w: World, p: Player) => p.team === 'a' || (p.team === 'n' && w.possTeam !== 'b')

export class LessonSession {
  view: SimView
  loop: GameLoop
  input = new Input()
  scenario: Scenario
  director: SequenceDirector | null = null
  tagger: Tagger | null = null
  scorer: DrillScorer | null = null
  recorder: Recorder | null = null
  state: LessonState
  private listeners = new Set<() => void>()
  private spec
  private endAt: number | null = null
  private betweenUntil = 0
  private playTime = 0
  private deadBall = 0
  private suggested: string | null = null
  private controlled: string | null = null
  private notifyAt = 0
  private seed: number
  private disposers: (() => void)[] = []

  constructor(private el: HTMLElement, public drill: Drill, public g: DrillGameplay, public opts: LessonOpts) {
    this.seed = opts.seed ?? 11
    this.spec = diagramOf(drill, g.diagram)
    this.scenario = buildScenario(this.spec, { seed: this.seed })
    this.view = new SimView(el, this.scenario.world, { quality: opts.quality, surround: 'training' })
    this.loop = new GameLoop(this.scenario.world, this.view)
    this.state = {
      phase: 'brief', level: opts.level, paused: false, demoStep: 0, demoSteps: 0, demoCaption: [], demoDone: false,
      time: 0, timeLeft: null, attemptLeft: null, points: 0, progress: 0, attempts: 0, successes: 0, feed: [], banner: null, result: null,
      hasGoal: !!this.scenario.world.pitch.goalFor.a, ourBall: true, controlLabel: null, camera: 'tactical', hint: null,
    }
    this.loop.onTick = (dt) => this.tick(dt)
    this.loop.onFrame = (dt) => this.frame(dt)
    const canvas = this.view.stage.renderer.domElement
    const down = (e: PointerEvent) => this.onPointer(e)
    canvas.addEventListener('pointerdown', down)
    this.disposers.push(() => canvas.removeEventListener('pointerdown', down))
    this.showBrief()
    this.loop.start()
  }

  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn) } }
  private notify(force = false) {
    const now = performance.now()
    if (!force && now - this.notifyAt < 100) return
    this.notifyAt = now
    this.state = { ...this.state }
    for (const l of this.listeners) l()
  }

  get world() { return this.scenario.world }

  private fresh(seedOffset = 0) {
    this.tagger?.dispose(); this.scorer?.dispose()
    this.tagger = null; this.scorer = null; this.director = null
    this.scenario = buildScenario(this.spec, { seed: this.seed + seedOffset })
    this.loop.setWorld(this.scenario.world)
    this.view.overlays.clear()
    this.controlled = null
    this.suggested = null
  }

  /* ------------------------------------------------------------ phases */

  showBrief() {
    this.fresh()
    assignBrains(this.world, { gameplay: this.g, level: this.opts.level, user: false, demo: true })
    for (const p of this.world.players) p.meta.scripted = true // everyone stands on his spot
    this.drawDiagram()
    this.showLabels(true)
    this.setCamera('tactical', true)
    this.state.phase = 'brief'
    this.state.result = null
    this.notify(true)
  }

  startDemo() {
    this.fresh()
    assignBrains(this.world, { gameplay: this.g, level: 'facile', user: false, demo: true })
    this.director = new SequenceDirector(this.world, this.scenario.steps, { speed: 0.9 })
    this.drawDiagram(0.55)
    this.showLabels(true)
    this.setCamera(this.state.camera === 'free' ? 'free' : 'tactical', false)
    this.state.phase = 'demo'
    this.state.demoDone = false
    this.state.demoSteps = this.director.groups.length
    this.state.demoStep = 0
    this.loop.timeScale = 1
    this.notify(true)
  }

  startPlay() {
    this.fresh()
    const w = this.world
    const user = true
    assignBrains(w, { gameplay: this.g, level: this.opts.level, user, demo: false })
    this.tagger = new Tagger(w)
    this.scorer = new DrillScorer(w, this.g, this.tagger)
    this.recorder = new Recorder(w, this.spec)
    if (this.g.mode === 'pattern') {
      this.director = new SequenceDirector(w, this.scenario.steps, { speed: 1, userPasses: true, userDribbles: (this.opts.control ?? this.g.control) === 'carrier' })
      this.drawDiagram(0.22)
    }
    this.showLabels(false)
    this.playTime = 0
    this.endAt = this.g.duration ?? null
    this.state.phase = 'play'
    this.state.result = null
    this.state.banner = null
    this.state.points = 0; this.state.progress = 0; this.state.attempts = 0; this.state.successes = 0; this.state.feed = []
    this.setCamera(this.state.camera === 'tactical' || this.state.camera === 'free' ? this.state.camera : 'broadcast', true)
    this.loop.timeScale = 1
    this.notify(true)
  }

  /** Start a new attempt inside the same lesson (after a goal, a loss, a reset). */
  private resetAttempt() {
    const scorer = this.scorer!, tagger = this.tagger!, recorder = this.recorder
    // keep scorer, tagger and recorder (they follow the new world)
    this.scenario = buildScenario(this.spec, { seed: this.seed + scorer.attempts + 1 })
    const w = this.world
    this.loop.setWorld(w)
    assignBrains(w, { gameplay: this.g, level: this.opts.level, user: true, demo: false })
    scorer.rebind(w)
    tagger.rebind(w)
    recorder?.rebind(w)
    scorer.nextAttempt()
    if (this.g.mode === 'pattern') this.director = new SequenceDirector(w, this.scenario.steps, { speed: 1, userPasses: true, userDribbles: (this.opts.control ?? this.g.control) === 'carrier' })
    this.controlled = null
    this.state.banner = null
  }

  private finish(success: boolean) {
    const s = this.scorer!
    const counts = this.tagger!.counts.a
    const actions = counts.PASS_OK + counts.PASS_LOST + counts.LOSS
    const by = new Map<string, { mistake: MistakeHit['mistake']; coaching: number | null; count: number }>()
    for (const m of s.mistakes) { const x = by.get(m.mistake); if (x) x.count++; else by.set(m.mistake, { mistake: m.mistake, coaching: m.coaching, count: 1 }) }
    this.state.result = {
      success, level: this.opts.level, points: s.points, goals: s.goals, sequences: s.sequences, regains: s.regains,
      attempts: s.attempts, successes: s.successes, time: this.playTime,
      mistakes: [...by.values()].sort((a, b) => b.count - a.count), counts: { ...counts },
      indice: actions >= 4 ? njangiFromCounts(counts) : null,
      replay: this.recorder?.finish() ?? null,
    }
    this.state.phase = 'result'
    this.loop.timeScale = 0.25
    if (success) sfx('success'); else sfx('fail')
    this.notify(true)
  }

  setLevel(l: Level) { this.opts.level = l; this.state.level = l; this.notify(true) }
  setControl(c: 'decisions' | 'carrier') { this.opts.control = c; this.notify(true) }
  pause(v: boolean) { this.state.paused = v; this.loop.timeScale = v ? 0 : this.state.phase === 'result' ? 0.25 : 1; this.input.enabled = !v; this.notify(true) }
  setCamera(m: CamMode, snap = false) { this.state.camera = m; this.view.setCamera(m, snap); this.notify(true) }
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
    for (const z of this.spec.zones ?? []) {
      const c = z.tone === 'a' ? OVERLAY_COLORS.a : z.tone === 'b' ? OVERLAY_COLORS.b : z.tone === 'n' ? OVERLAY_COLORS.n : OVERLAY_COLORS.soft
      o.zone('diagram', z.x, z.y, z.w, z.h, c, 0.16 * opacity + 0.04)
    }
    for (const s of this.scenario.steps) {
      const from = w.get(s.from)
      if (!from) continue
      const to = stepTarget(w, s)
      const color = s.kind === 'press' ? OVERLAY_COLORS.b : s.kind === 'run' ? OVERLAY_COLORS.run : s.kind === 'shot' ? OVERLAY_COLORS.gold : OVERLAY_COLORS.chalk
      o.arrow('diagram', from.pos, to, s.kind, color, { opacity, trim: typeof s.to === 'string' ? 0.6 : 0 })
    }
  }

  private showLabels(on: boolean) {
    this.view.labels.clear()
    if (!on) return
    const actors = new Set(this.scenario.steps.flatMap((s) => [s.from, typeof s.to === 'string' ? s.to : '', s.receiver ?? '']))
    for (const p of this.world.players) {
      const dp = this.spec.players?.find((q) => q.id === p.id)
      const text = dp?.label ?? (actors.has(p.id) ? p.id.toUpperCase() : '')
      if (!text) continue
      this.view.labels.set(p.id, { id: p.id, text, tone: p.team === 'b' ? 'b' : p.team === 'n' ? 'n' : 'a' })
    }
  }

  /* ------------------------------------------------------------ simulation */

  private tick(dt: number) {
    const w = this.world
    if (this.state.phase === 'demo' && this.director) {
      this.director.tick()
      const gi = Math.min(this.director.gi, this.director.groups.length - 1)
      if (this.state.demoStep !== gi + 1 && this.director.state === 'running') {
        this.state.demoStep = gi + 1
        this.state.demoCaption = this.director.groups[gi] ?? []
        this.notify(true)
      }
      if (this.director.state === 'done' && !this.state.demoDone) {
        this.state.demoDone = true
        this.notify(true)
      }
      if (this.director.state === 'failed') {
        // physics can spoil a demo pass now and then: play it again from the start
        this.startDemo()
      }
      return
    }
    if (this.state.phase !== 'play' || !this.scorer || !this.tagger) return
    this.tagger.update()
    this.scorer.update()
    this.recorder?.tick()
    this.director?.tick()
    this.playTime += dt
    const s = this.scorer
    if (this.director && this.director.state === 'done') {
      for (const r of this.g.scoring) if (r.event === 'sequence') s.award('sequence', r.points)
      this.director = null
      s.stop('sequence', true)
    }
    if (this.director && this.director.state === 'failed') s.stop(this.director.failReason ?? 'loss')

    // the end of an attempt: a short pause, then reset
    if (s.attemptEnded && this.betweenUntil === 0) {
      const ok = s.attemptEnded.ok
      this.state.banner = { key: ok ? `between.ok.${s.attemptEnded.reason}` : `between.ko.${s.attemptEnded.reason}`, tone: ok ? 'good' : 'bad' }
      this.betweenUntil = w.t + (ok ? 1.6 : 1.4)
      sfx(ok ? 'point' : 'whistle')
      this.notify(true)
    }
    if (this.betweenUntil && w.t >= this.betweenUntil) {
      this.betweenUntil = 0
      if (s.targetReached()) return this.finish(true)
      if (!s.stillPossible()) return this.finish(false)
      if (this.g.target.kind === 'attempts' && s.attempts >= this.g.target.attempts) return this.finish(s.targetReached())
      if (this.endAt !== null && this.playTime >= this.endAt) return this.finish(s.targetReached())
      this.resetAttempt()
      this.notify(true)
      return
    }
    if (!s.attemptEnded && s.targetReached() && this.g.target.kind !== 'attempts') return this.finish(true)
    if (this.endAt !== null && this.playTime >= this.endAt) return this.finish(s.targetReached())
    // attempts have a time limit each
    if (this.g.target.kind === 'attempts' && !s.attemptEnded && w.t > this.attemptLimit()) s.stop('timeout')
    // the ball stopped dead with nobody on it for a while (out of reach): reset
    if (!w.ball.owner && !w.pass && Math.hypot(w.ball.vel.x, w.ball.vel.y) < 0.05) {
      this.deadBall += dt
      if (this.deadBall > 4) s.stop('dead')
    } else this.deadBall = 0
    if (w.dead) s.stop(w.dead.reason, w.dead.reason === 'goal')
  }

  /** seconds allowed for one attempt: enough to cross the area at a walk, at most 30 */
  attemptLimit() {
    const p = this.world.pitch
    return Math.max(12, Math.min(30, Math.max(p.w, p.h) * 0.45 + 8))
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

  private carrier(): Player | null {
    const own = this.world.owner()
    return own && ours(this.world, own) ? own : null
  }

  /** The teammate in the stick's direction (or ahead of the carrier). */
  private pickReceiver(c: Player, dir: V2 | null): Player | null {
    const w = this.world
    const d = dir ?? { x: Math.cos(c.facing), y: Math.sin(c.facing) }
    let best: Player | null = null, bs = -1e9
    for (const m of w.players) {
      if (m === c || !ours(w, m)) continue
      const v = { x: m.pos.x - c.pos.x, y: m.pos.y - c.pos.y }
      const L = len2(v)
      if (L < 1.2) continue
      const cos = (v.x * d.x + v.y * d.y) / L
      const score = cos * 3 - L * 0.04
      if (cos > 0.35 && score > bs) { bs = score; best = m }
    }
    return best
  }

  private userPass(c: Player, receiver: Player | null, point: V2 | null, through = false) {
    const w = this.world
    if (c.pending) return
    if (this.director && this.g.mode === 'pattern') {
      const exp = this.director.expectedPass()
      if (exp && exp.from === c.id && receiver && typeof exp.to === 'string' && exp.to !== receiver.id) {
        this.scorer?.mistake('wrong_receiver')
        this.state.hint = exp.to
        this.notify(true)
        return
      }
      if (exp && receiver) {
        // a run in this action or the next: did it start?
        const run = this.director.groups.slice(this.director.gi, this.director.gi + 2).flat().find((s) => s.kind === 'run' && s.from === receiver.id)
        if (run) {
          const end = stepTarget(w, run)
          const home = (receiver.meta.home as V2) ?? receiver.pos
          const done = 1 - dist2(receiver.pos, end) / Math.max(1, dist2(home, end))
          if (done < 0.25) this.scorer?.mistake('early_pass')
        }
        this.director.markPassed(exp)
      }
      this.state.hint = null
    }
    let target: V2
    if (receiver) target = through ? this.throughPoint(c, receiver) : w.leadPoint(c, receiver)
    else target = point!
    const rec = receiver ?? this.nearestMateTo(point!, c)
    const a = analysePass(w, c, target, rec)
    // a forward option was open and the ball went sideways or back
    if (['ssg', 'phase', 'transition', 'finishing'].includes(this.g.mode) && a.progress < 2) {
      const fwd = passOptions(w, c).find((o) => o.progress >= 8 && o.margin > 0.45)
      if (fwd) this.scorer?.mistake('polite_pass')
    }
    this.scorer?.userKick(c.id, a.margin)
    w.requestPass(c, target, { receiver: rec?.id ?? null, arrive: through ? 4 : 5.5, by: 'user' })
    sfx('kick')
  }

  private throughPoint(c: Player, r: Player): V2 {
    const w = this.world
    const goal = w.pitch.goalFor.a
    const dir = len2(r.vel) > 1 ? { x: r.vel.x / len2(r.vel), y: r.vel.y / len2(r.vel) } : goal ? { x: (goal.x - r.pos.x) / Math.max(1, dist2(goal, r.pos)), y: (goal.y - r.pos.y) / Math.max(1, dist2(goal, r.pos)) } : { x: 1, y: 0 }
    const lead = Math.min(7, 3 + dist2(c.pos, r.pos) * 0.15)
    return { x: Math.max(0.8, Math.min(w.pitch.w - 0.8, r.pos.x + dir.x * lead)), y: Math.max(0.8, Math.min(w.pitch.h - 0.8, r.pos.y + dir.y * lead)) }
  }

  private nearestMateTo(pt: V2, c: Player) {
    let best: Player | null = null, bd = 99
    for (const m of this.world.players) if (m !== c && ours(this.world, m) && !m.gk) { const d = dist2(m.pos, pt); if (d < bd) { bd = d; best = m } }
    return best
  }

  private userShot(c: Player, dir: V2 | null) {
    const w = this.world
    const goal = w.pitch.goalFor.a
    if (!goal || c.pending) return
    const spread = goal.width * 0.38
    let aimY = goal.y + (w.rng.next() - 0.5) * spread
    if (dir) aimY = goal.y + Math.max(-1, Math.min(1, dir.y * 1.6)) * spread
    w.requestShot(c, { x: goal.x, y: aimY }, goal.mini ? 0.2 : 0.5 + w.rng.next() * 1.1, goal.mini ? 14 : 23, 'user')
    sfx('kick')
  }

  private onPointer(e: PointerEvent) {
    if (this.state.phase !== 'play' || this.state.paused) return
    this.input.pointer()
    const c = this.carrier()
    if (!c) {
      // defending in carrier mode: tap a player to control him
      if (this.opts.control === 'carrier') {
        const p = this.view.pickPlayer(e.clientX, e.clientY, (q) => q.team === 'a' && !q.gk)
        if (p) this.controlled = p.id
      }
      return
    }
    const p = this.view.pickPlayer(e.clientX, e.clientY, (q) => q !== c && ours(this.world, q))
    if (p) return this.userPass(c, p, null)
    const goal = this.world.pitch.goalFor.a
    const pt = this.view.groundPoint(e.clientX, e.clientY)
    if (!pt) return
    if (goal && dist2(pt, goal) < Math.max(3, goal.width)) return this.userShot(c, { x: 0, y: (pt.y - goal.y) / Math.max(1, goal.width) })
    this.userPass(c, null, pt)
  }

  private frame(dt: number) {
    this.input.poll(performance.now() / 1000)
    const w = this.world
    if (this.input.pressed('pause')) this.pause(!this.state.paused)
    if (this.input.pressed('camera')) this.cycleCamera()
    if (this.state.phase === 'play' && !this.state.paused && !this.betweenUntil) this.handleControls()
    else { this.view.overlays.clear('play'); this.view.overlays.beginMarkers(); this.view.overlays.endMarkers() }
    this.input.endFrame()
    // HUD numbers
    if (this.scorer) {
      const s = this.scorer
      const st = this.state
      if (st.points !== s.points || st.attempts !== s.attempts || st.successes !== s.successes || st.feed.length !== s.feed.length || (s.feed.length && st.feed[st.feed.length - 1]?.id !== s.feed[s.feed.length - 1].id)) {
        st.points = s.points; st.progress = Math.min(1, s.progress()); st.attempts = s.attempts; st.successes = s.successes
        st.feed = s.feed.slice(-4)
        this.notify(true)
      }
    }
    this.state.time = this.playTime
    this.state.timeLeft = this.endAt !== null ? Math.max(0, this.endAt - this.playTime) : null
    this.state.attemptLeft = this.g.target.kind === 'attempts' && this.state.phase === 'play' && !this.betweenUntil ? Math.max(0, this.attemptLimit() - w.t) : null
    const ourBall = !!this.carrier()
    if (ourBall !== this.state.ourBall) { this.state.ourBall = ourBall; this.notify(true) }
    this.notify()
    void dt
  }

  private laneClock = 0
  private handleControls() {
    const w = this.world
    const inp = this.input
    const axis = inp.axis()
    const dir = this.stickToSim(axis)
    const c = this.carrier()
    const o = this.view.overlays
    o.beginMarkers()
    const control = this.opts.control ?? this.g.control
    // who does the player move?
    let me: Player | null = null
    if (control === 'carrier') {
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
    if (!lanes) o.clear('play')
    else if (this.laneClock <= 0) o.clear('play')
    if (c) {
      const rec = this.pickReceiver(c, dir)
      this.suggested = rec?.id ?? null
      for (const m of w.players) {
        if (m === c || !ours(w, m)) continue
        const isHint = this.state.hint === m.id
        const sug = m.id === this.suggested
        o.marker(m.id, m.pos, isHint ? OVERLAY_COLORS.gold : sug ? OVERLAY_COLORS.chalk : m.team === 'n' ? OVERLAY_COLORS.n : '#7FD3A2', { radius: sug ? 0.72 : 0.6, opacity: sug || isHint ? 0.95 : 0.6 })
        if (lanes && this.laneClock <= 0) {
          const a = analysePass(w, c, m.pos, m)
          o.arrow('play', c.pos, m.pos, 'lane', a.margin > 0.5 ? OVERLAY_COLORS.open : a.margin > 0 ? OVERLAY_COLORS.tight : OVERLAY_COLORS.closed, { opacity: 0.4, trim: 0.75 })
        }
      }
      if (inp.pressed('pass') && rec) this.userPass(c, rec, null)
      else if (inp.pressed('through') && rec) this.userPass(c, rec, null, true)
      else if (inp.pressed('shoot')) this.userShot(c, dir)
    }
    if (this.laneClock <= 0) this.laneClock = 6
    o.endMarkers()
  }

  /* ------------------------------------------------------------ teardown */

  dispose() {
    this.loop.stop()
    for (const d of this.disposers) d()
    this.tagger?.dispose(); this.scorer?.dispose()
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
