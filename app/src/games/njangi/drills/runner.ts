// The rules side of a lesson, without any rendering: phases, demonstration, attempts, scoring,
// resets, the user's decisions (passes, shots) and the result. LessonSession draws it and feeds it
// input; the tests drive it with a bot to prove every drill can be played to its end.
import { njangiFromCounts, type NjangiResult } from '../../../lib/njangi'
import type { DiagramSpec, Drill, EventCode } from '../../../lib/types'
import { analysePass, passOptions } from '../../engine/sim/lanes'
import { dist2, len2, type V2 } from '../../engine/sim/math'
import { Tagger } from '../../engine/sim/tagger'
import type { Level, Player } from '../../engine/sim/types'
import type { World } from '../../engine/sim/world'
import { DT } from '../../engine/sim/world'
import { Recorder, type Replay } from '../../engine/replay'
import { SequenceDirector } from './director'
import { buildScenario, diagramOf, stepTarget, type Scenario, type Step } from './scenario'
import { DrillScorer, type FeedItem, type MistakeHit } from './scorer'
import { assignBrains } from './setup'
import type { DrillGameplay } from './types'

export type LessonPhase = 'brief' | 'demo' | 'play' | 'result'
export type Cue = 'kick' | 'point' | 'whistle' | 'success' | 'fail'

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

export const ours = (w: World, p: Player) => p.team === 'a' || (p.team === 'n' && w.possTeam !== 'b')

export interface RunnerHooks {
  /** a new world replaced the old one (demo, attempt reset) */
  world?: (w: World) => void
  /** something the UI shows changed */
  change?: (force: boolean) => void
  cue?: (c: Cue) => void
}

export class LessonRunner {
  spec: DiagramSpec
  scenario: Scenario
  phase: LessonPhase = 'brief'
  director: SequenceDirector | null = null
  tagger: Tagger | null = null
  scorer: DrillScorer | null = null
  recorder: Recorder | null = null
  result: LessonResult | null = null
  banner: { key: string; tone: 'good' | 'bad' } | null = null
  hint: string | null = null
  demoStep = 0
  demoDone = false
  playTime = 0
  endAt: number | null = null
  betweenUntil = 0
  private deadBall = 0
  private seed: number

  constructor(public drill: Drill, public g: DrillGameplay, public opts: { level: Level; control?: 'decisions' | 'carrier'; seed?: number; record?: boolean }, private hooks: RunnerHooks = {}) {
    this.seed = opts.seed ?? 11
    this.spec = diagramOf(drill, g.diagram)
    this.scenario = buildScenario(this.spec, { seed: this.seed, asDrawn: true })
  }

  get world() { return this.scenario.world }
  get control() { return this.opts.control ?? this.g.control }
  private change(force = true) { this.hooks.change?.(force) }

  private fresh(opts: { asDrawn?: boolean; seedOffset?: number } = {}) {
    this.tagger?.dispose(); this.scorer?.dispose()
    this.tagger = null; this.scorer = null; this.director = null
    this.scenario = buildScenario(this.spec, { seed: this.seed + (opts.seedOffset ?? 0), asDrawn: opts.asDrawn })
    this.hooks.world?.(this.world)
  }

  /* ------------------------------------------------------------ phases */

  brief() {
    this.fresh({ asDrawn: true })
    assignBrains(this.world, { gameplay: this.g, level: this.opts.level, user: false, demo: true })
    for (const p of this.world.players) p.meta.scripted = true // everyone stands on his spot
    this.phase = 'brief'
    this.result = null
    this.change()
  }

  demo() {
    this.fresh()
    assignBrains(this.world, { gameplay: this.g, level: 'facile', user: false, demo: true })
    this.director = new SequenceDirector(this.world, this.scenario.steps, { speed: 0.9 })
    this.phase = 'demo'
    this.demoDone = false
    this.demoStep = 0
    this.change()
  }

  play() {
    this.fresh()
    const w = this.world
    assignBrains(w, { gameplay: this.g, level: this.opts.level, user: true, demo: false })
    this.tagger = new Tagger(w)
    this.scorer = new DrillScorer(w, this.g, this.tagger)
    this.recorder = this.opts.record === false ? null : new Recorder(w, this.spec)
    if (this.g.mode === 'pattern') this.director = new SequenceDirector(w, this.scenario.steps, { speed: 1, userPasses: true, userDribbles: this.control === 'carrier' })
    this.playTime = 0
    this.endAt = this.g.duration ?? null
    this.betweenUntil = 0
    this.phase = 'play'
    this.result = null
    this.banner = null
    this.hint = null
    this.change()
  }

  /** Start a new attempt inside the same lesson (after a goal, a loss, a reset). */
  private nextAttempt() {
    const scorer = this.scorer!, tagger = this.tagger!
    this.scenario = buildScenario(this.spec, { seed: this.seed + scorer.attempts + 1 + Math.round(this.playTime) })
    const w = this.world
    assignBrains(w, { gameplay: this.g, level: this.opts.level, user: true, demo: false })
    scorer.rebind(w)
    tagger.rebind(w)
    this.recorder?.rebind(w)
    scorer.nextAttempt()
    this.director = this.g.mode === 'pattern' ? new SequenceDirector(w, this.scenario.steps, { speed: 1, userPasses: true, userDribbles: this.control === 'carrier' }) : null
    this.banner = null
    this.hint = null
    this.hooks.world?.(w)
  }

  private finish(success: boolean) {
    const s = this.scorer!
    const counts = this.tagger!.counts.a
    const actions = counts.PASS_OK + counts.PASS_LOST + counts.LOSS
    const by = new Map<string, { mistake: MistakeHit['mistake']; coaching: number | null; count: number }>()
    for (const m of s.mistakes) { const x = by.get(m.mistake); if (x) x.count++; else by.set(m.mistake, { mistake: m.mistake, coaching: m.coaching, count: 1 }) }
    this.result = {
      success, level: this.opts.level, points: s.points, goals: s.goals, sequences: s.sequences, regains: s.regains,
      attempts: s.attempts, successes: s.successes, time: this.playTime,
      mistakes: [...by.values()].sort((a, b) => b.count - a.count), counts: { ...counts },
      indice: actions >= 4 ? njangiFromCounts(counts) : null,
      replay: this.recorder?.finish() ?? null,
    }
    this.phase = 'result'
    this.hooks.cue?.(success ? 'success' : 'fail')
    this.change()
  }

  /** seconds allowed for one attempt: enough to cross the area at a walk, at most 30 */
  attemptLimit() {
    if (this.g.attemptSeconds) return this.g.attemptSeconds
    const p = this.world.pitch
    return Math.max(12, Math.min(30, Math.max(p.w, p.h) * 0.45 + 8))
  }

  /* ------------------------------------------------------------ simulation */

  /** Advance one fixed step (call before world.step). */
  tick(dt = DT) {
    const w = this.world
    if (this.phase === 'demo' && this.director) {
      this.director.tick()
      const gi = Math.min(this.director.gi, this.director.groups.length - 1)
      if (this.demoStep !== gi + 1 && this.director.state === 'running') { this.demoStep = gi + 1; this.change() }
      if (this.director.state === 'done' && !this.demoDone) { this.demoDone = true; this.change() }
      // physics can spoil a demo pass now and then: play it again from the start
      if (this.director.state === 'failed') this.demo()
      return
    }
    if (this.phase !== 'play' || !this.scorer || !this.tagger) return
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
      this.banner = { key: `between.${ok ? 'ok' : 'ko'}.${s.attemptEnded.reason}`, tone: ok ? 'good' : 'bad' }
      this.betweenUntil = w.t + (ok ? 1.6 : 1.4)
      this.hooks.cue?.(ok ? 'point' : 'whistle')
      this.change()
    }
    if (this.betweenUntil && w.t >= this.betweenUntil) {
      this.betweenUntil = 0
      if (s.targetReached()) return this.finish(true)
      if (!s.stillPossible()) return this.finish(false)
      if (this.g.target.kind === 'attempts' && s.attempts >= this.g.target.attempts) return this.finish(s.targetReached())
      if (this.endAt !== null && this.playTime >= this.endAt) return this.finish(s.targetReached())
      this.nextAttempt()
      this.change()
      return
    }
    if (!s.attemptEnded && s.targetReached() && this.g.target.kind !== 'attempts') return this.finish(true)
    if (this.endAt !== null && this.playTime >= this.endAt && !this.betweenUntil) return this.finish(s.targetReached())
    // attempts have a time limit each
    if (this.g.target.kind === 'attempts' && !s.attemptEnded && w.t > this.attemptLimit()) s.stop('timeout')
    // the ball stopped dead with nobody on it for a while (out of reach): reset
    if (!w.ball.owner && !w.pass && Math.hypot(w.ball.vel.x, w.ball.vel.y) < 0.05) {
      this.deadBall += dt
      if (this.deadBall > 4) s.stop('dead')
    } else this.deadBall = 0
    if (w.dead) s.stop(w.dead.reason, w.dead.reason === 'goal')
  }

  /* ------------------------------------------------------------ the user's decisions */

  carrier(): Player | null {
    const own = this.world.owner()
    return own && ours(this.world, own) ? own : null
  }

  /** The teammate in a direction (sim metres), or ahead of the carrier when none is given. */
  pickReceiver(c: Player, dir: V2 | null): Player | null {
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

  /** The user passes to a teammate, or into space at a point. Returns false if the pass was refused (pattern). */
  pass(c: Player, receiver: Player | null, point: V2 | null, through = false): boolean {
    const w = this.world
    if (c.pending || this.phase !== 'play' || this.betweenUntil) return false
    if (this.director && this.g.mode === 'pattern') {
      const exp = this.director.expectedPass()
      const want = exp ? (typeof exp.to === 'string' ? exp.to : exp.receiver ?? null) : null
      if (exp && exp.from === c.id && receiver && want && want !== receiver.id) {
        this.scorer?.mistake('wrong_receiver')
        this.hint = want
        this.change()
        return false
      }
      if (exp && exp.from === c.id) {
        // a run in this action or the next: did it start?
        const runner = receiver ?? (want ? w.get(want) ?? null : null)
        const run = runner ? this.director.groups.slice(this.director.gi, this.director.gi + 2).flat().find((s) => s.kind === 'run' && s.from === runner.id) : null
        if (run && runner) {
          const end = stepTarget(w, run)
          const home = (runner.meta.home as V2) ?? runner.pos
          const done = 1 - dist2(runner.pos, end) / Math.max(1, dist2(home, end))
          if (done < 0.25) this.scorer?.mistake('early_pass')
        }
        this.director.markPassed(exp)
        // the sequence's pass into space goes where the sheet draws it
        if (!receiver && typeof exp.to !== 'string') point = exp.to
      }
      this.hint = null
    }
    let target: V2
    if (receiver) target = through ? this.throughPoint(c, receiver) : w.leadPoint(c, receiver)
    else if (point) target = point
    else return false
    const rec = receiver ?? this.nearestMateTo(target, c)
    const a = analysePass(w, c, target, rec)
    // a forward option was open and the ball went sideways or back
    if (['ssg', 'phase', 'transition', 'finishing'].includes(this.g.mode) && a.progress < 2) {
      const fwd = passOptions(w, c).find((o) => o.progress >= 8 && o.margin > 0.45)
      if (fwd) this.scorer?.mistake('polite_pass')
    }
    this.scorer?.userKick(c.id, a.margin)
    w.requestPass(c, target, { receiver: rec?.id ?? null, arrive: through || !receiver ? 4 : undefined, by: 'user' })
    this.hooks.cue?.('kick')
    return true
  }

  shoot(c: Player, dir: V2 | null) {
    const w = this.world
    const goal = w.pitch.goalFor.a
    if (!goal || c.pending || this.phase !== 'play' || this.betweenUntil) return
    const spread = goal.width * 0.38
    let aimY = goal.y + (w.rng.next() - 0.5) * spread
    if (dir) aimY = goal.y + Math.max(-1, Math.min(1, dir.y * 1.6)) * spread
    w.requestShot(c, { x: goal.x, y: aimY }, goal.mini ? 0.2 : 0.5 + w.rng.next() * 1.1, goal.mini ? 14 : 23, 'user')
    this.hooks.cue?.('kick')
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

  /** The step the user should play now (pattern lessons). */
  expected(): Step | null { return this.director?.expectedPass() ?? null }
}
