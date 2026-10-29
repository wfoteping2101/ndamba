// Live evaluation of a lesson: the drill sheet's own scoring (DrillGameplay.scoring), its target,
// its failures, and the mistakes the sheet's coaching points talk about. Every rule reads world
// events or the Tagger (the book's fourteen codes), never a guess about the player's intentions.
import { dist2, segmentsCross, type V2 } from '../../engine/sim/math'
import type { Tagger } from '../../engine/sim/tagger'
import type { SimEvent } from '../../engine/sim/types'
import type { World } from '../../engine/sim/world'
import type { DrillGameplay, Mistake, ScoreEvent } from './types'

export type ScoreKind = ScoreEvent['event']
export interface FeedItem { id: number; t: number; key: string; params?: Record<string, string | number>; points?: number; tone: 'good' | 'bad' | 'info' }
export interface MistakeHit { mistake: Mistake; t: number; coaching: number | null }

/**
 * Events that end an attempt (phases, finishing, transitions). An attempt succeeds when it has
 * earned at least one point (gameplay.ts), whatever ends it; other scoring events add points and
 * play goes on.
 */
const TERMINAL: ScoreKind[] = ['goal', 'goal_after', 'zone_entry', 'cross_line', 'shot_on_target', 'sequence', 'regain5']

interface Possession {
  passes: number
  touched: Set<string>
  /** our players including the keeper */
  touchedAll: Set<string>
  flags: Set<string>
  zones: Set<number>
  crossed: Set<number>
  allTouched: boolean
  start: number
  fromRegain: boolean
  polite: boolean
  held: boolean
}

interface PassRec { from: string; to: string; t: number; quick: boolean; start: V2; end: V2 }

export type AttemptEnd = { ok: boolean; reason: string }

export class DrillScorer {
  points = 0
  goals = 0
  sequences = 0
  regains = 0
  attempts = 0
  successes = 0
  /** points scored in the running attempt */
  attemptPoints = 0
  feed: FeedItem[] = []
  mistakes: MistakeHit[] = []
  /** set when the running attempt (or the set, for non-attempt targets) just ended */
  attemptEnded: AttemptEnd | null = null
  private poss: Possession
  private chain: PassRec[] = []
  private nextId = 1
  private lastKick: { by: string; t: number; touches: number; held: number; pressBy: string | null } | null = null
  private pauseCandidate: { defender: string; from: V2 } | null = null
  private lossAt: number | null = null
  private slowFlagged = false
  private off: () => void
  /** the ids of our outfield players (all_touched) */
  private ourIds: string[]
  private userPassMargin: { by: string; margin: number; t: number } | null = null

  constructor(private w: World, private g: DrillGameplay, private tagger: Tagger) {
    this.poss = this.freshPossession(false)
    this.off = w.on((e) => this.onEvent(e))
    this.ourIds = w.players.filter((p) => p.team === 'a' && !p.gk).map((p) => p.id)
    // the book's codes arrive synchronously, before this scorer sees the same world event
    tagger.onCode = (a) => this.onCode(a)
  }
  dispose() { this.off(); if (this.tagger.onCode) this.tagger.onCode = null }

  private onCode(a: { code: string; side: 'a' | 'b' }) {
    if (a.side !== 'a') return
    if (a.code === 'LINE') { this.poss.flags.add('line_break'); for (const r of this.rules('line_break')) this.award('line_break', r.points) }
    if (a.code === 'FIX2') { this.poss.flags.add('fix2'); for (const r of this.rules('fix2')) this.award('fix2', r.points) }
    if (a.code === 'SWITCH') { this.poss.flags.add('switch'); for (const r of this.rules('switch')) this.award('switch', r.points) }
    if (a.code === 'SHOT_IN') for (const r of this.rules('shot_on_target')) this.award('shot_on_target', r.points)
    if (a.code === 'REGAIN5') for (const r of this.rules('regain5')) this.award('regain5', r.points)
  }
  /** follow a new world (a new attempt on the same drill) */
  rebind(w: World) {
    this.off()
    this.w = w
    this.off = w.on((e) => this.onEvent(e))
    this.ourIds = w.players.filter((p) => p.team === 'a' && !p.gk).map((p) => p.id)
  }

  private freshPossession(fromRegain: boolean): Possession {
    return { passes: 0, touched: new Set(), touchedAll: new Set(), flags: new Set(), zones: new Set(), crossed: new Set(), allTouched: false, start: this.w?.t ?? 0, fromRegain, polite: false, held: false }
  }

  /** neutrals play for the side that has the ball */
  private ours(team: string | null | undefined) { return team === 'a' || (team === 'n' && this.w.possTeam === 'a') }

  private rules<K extends ScoreKind>(k: K) { return this.g.scoring.filter((s): s is Extract<ScoreEvent, { event: K }> => s.event === k) }

  award(kind: ScoreKind, points: number, params?: Record<string, string | number>) {
    if (points <= 0) return
    this.points += points
    this.attemptPoints += points
    this.push({ key: `score.${kind}`, params, points, tone: 'good' })
    if (kind === 'goal' || kind === 'goal_after') { /* goals counted on the goal event */ }
    if (kind === 'sequence') this.sequences++
    if (TERMINAL.includes(kind) && this.g.target.kind === 'attempts' && !this.attemptEnded && this.attemptPoints >= (this.g.successNeeds ?? 1)) this.stop(kind, true)
  }

  mistake(m: Mistake) {
    // one of each per possession is enough to teach; the summary keeps the count
    const recent = this.mistakes.find((x) => x.mistake === m && this.w.t - x.t < 2.5)
    if (recent) return
    const link = this.g.feedback.find((f) => f.mistake === m)
    this.mistakes.push({ mistake: m, t: this.w.t, coaching: link ? link.coaching : null })
    this.push({ key: `mistake.${m}`, tone: 'bad' })
  }

  push(f: Omit<FeedItem, 'id' | 't'>) {
    this.feed.push({ ...f, id: this.nextId++, t: this.w.t })
    if (this.feed.length > 40) this.feed.splice(0, this.feed.length - 40)
  }

  /**
   * The running attempt (or, for sets scored in points or goals, the running sequence of play) stops.
   * With an attempts target its success is "at least one point earned"; otherwise `success` only
   * picks the banner.
   */
  stop(reason: string, success = false) {
    if (this.attemptEnded) return
    const attempts = this.g.target.kind === 'attempts'
    const ok = attempts ? this.attemptPoints >= (this.g.successNeeds ?? 1) : success
    if (attempts) { this.attempts++; if (ok) this.successes++ }
    this.attemptEnded = { ok, reason }
  }
  /** a new attempt starts (after a reset) */
  nextAttempt() {
    this.attemptEnded = null
    this.attemptPoints = 0
    this.poss = this.freshPossession(false)
    this.chain = []
    this.lossAt = null
    this.slowFlagged = false
    this.pauseCandidate = null
  }

  chainPasses() { return this.poss.passes }
  chainTouched() {
    // the player who starts the possession on the ball counts too
    const own = this.w.owner()
    const set = new Set(this.poss.touchedAll)
    if (own && own.team === 'a') set.add(own.id)
    return set.size
  }

  /** Has the lesson's target been reached? */
  targetReached() {
    const t = this.g.target
    switch (t.kind) {
      case 'points': return this.points >= t.value
      case 'goals': return this.goals >= t.value
      case 'sequences': return this.sequences >= t.value
      case 'regains': return this.regains >= t.value
      case 'attempts': return this.successes >= t.success
    }
  }
  /** How far along the target, 0..1 */
  progress() {
    const t = this.g.target
    switch (t.kind) {
      case 'points': return this.points / t.value
      case 'goals': return this.goals / t.value
      case 'sequences': return this.sequences / t.value
      case 'regains': return this.regains / t.value
      case 'attempts': return this.successes / t.success
    }
  }
  /** Can the target still be reached (attempts)? */
  stillPossible() {
    const t = this.g.target
    if (t.kind !== 'attempts') return true
    return this.successes + (t.attempts - this.attempts) >= t.success
  }

  /** Call after each world step. */
  update() {
    const w = this.w
    // the carrier keeps it while a partner is free
    const own = w.owner()
    if (own && this.ours(own.team) && !own.gk) {
      const held = (own.meta.heldFor as number) ?? 0
      if (held > 3.2 && !this.poss.held) { this.poss.held = true; this.mistake('held_too_long') }
    }
    // after a loss: more than five seconds without winning it back
    if (this.lossAt !== null && !this.slowFlagged && w.t - this.lossAt > 5 && w.possTeam !== 'a') {
      this.slowFlagged = true
      if (this.g.scoring.some((s) => s.event === 'regain5') || this.g.mode === 'transition') this.mistake('slow_regain')
    }
  }

  /** The session tells the scorer about the user's pass decisions (for the pausa and touches). */
  userKick(by: string, margin = 1) {
    const p = this.w.get(by)
    if (!p) return
    this.userPassMargin = { by, margin, t: this.w.t }
    const limit = p.team === 'n' ? this.g.neutralTouches ?? this.g.touches : this.g.touches
    // p.touches counts the control; the kick itself adds one when it happens
    if (limit && p.touches + 1 > limit) {
      this.mistake('too_many_touches')
      if (this.g.fail?.includes('touches_exceeded')) this.failPossession('touches_exceeded')
    }
  }

  private failPossession(reason: string) {
    this.push({ key: `fail.${reason}`, tone: 'bad' })
    this.stop(reason)
    this.poss = this.freshPossession(false)
  }

  private onEvent(e: SimEvent) {
    const w = this.w
    switch (e.type) {
      case 'kick': {
        if (!this.ours(e.team) || e.kind === 'shot') {
          if (e.kind === 'shot' && this.ours(e.team)) {
            const goal = w.pitch.goalFor.a
            if (goal && dist2(e.from, goal) > (goal.mini ? 13 : 22)) this.mistake('shot_from_far')
          }
          return
        }
        const p = w.get(e.by)
        // the pausa: a defender committed onto the carrier just before he released it
        let pressBy: string | null = null
        if (p) {
          for (const o of w.opponents(p)) if (dist2(o.pos, p.pos) < 3.2 && Math.hypot(o.vel.x, o.vel.y) > 1.5) { pressBy = o.id; break }
        }
        const held = p ? ((p.meta.heldFor as number) ?? 0) : 0
        this.lastKick = { by: e.by, t: e.t, touches: p?.touches ?? 0, held, pressBy }
        this.pauseCandidate = pressBy && held >= 0.6 ? { defender: pressBy, from: { ...e.from } } : null
        if (p) p.meta.heldFor = 0
        return
      }
      case 'pass_complete': {
        if (!this.ours(e.team)) return
        const quick = !!this.lastKick && this.lastKick.by === e.from && this.lastKick.touches <= 2 && this.lastKick.held < 0.8
        const rec: PassRec = { from: e.from, to: e.to, t: e.t, quick, start: e.start, end: e.end }
        this.poss.passes++
        for (const r of this.rules('consecutive_passes')) if (this.poss.passes % r.n === 0) this.award('consecutive_passes', r.points, { n: r.n })
        // a pass that splits two defenders
        if (this.rules('split_pass').length) {
          const opps = w.players.filter((q) => q.team === 'b' && !q.gk)
          let split = false
          for (let i = 0; i < opps.length && !split; i++) for (let j = i + 1; j < opps.length; j++) {
            const a = opps[i].pos, b = opps[j].pos
            if (dist2(a, b) < 10 && segmentsCross(e.start, e.end, a, b)) { split = true; break }
          }
          if (split) for (const r of this.rules('split_pass')) this.award('split_pass', r.points)
        }
        // third man and one-two: the previous pass ended where this one started
        const prev = this.chain[this.chain.length - 1]
        if (prev && prev.to === e.from && e.t - prev.t < 3.5) {
          if (e.to === prev.from) this.poss.flags.add('one_two')
          else if (quick) {
            this.poss.flags.add('third_man')
            for (const r of this.rules('third_man')) this.award('third_man', r.points)
          }
        }
        // the pausa paid off: the pass went past the defender who came
        if (this.pauseCandidate) {
          const d = w.get(this.pauseCandidate.defender)
          if (d && progressPast(this.pauseCandidate.from, e.end, d.pos)) for (const r of this.rules('pause_play')) this.award('pause_play', r.points)
          this.pauseCandidate = null
        }
        // a cut-back: from near the goal line, backwards, into the box
        const goal = w.pitch.goalFor.a
        if (goal && Math.abs(goal.x - e.start.x) < 7 && Math.abs(goal.x - e.end.x) > Math.abs(goal.x - e.start.x) + 1) this.poss.flags.add('cutback')
        this.chain.push(rec)
        if (this.chain.length > 6) this.chain.shift()
        return
      }
      case 'control': {
        if (!this.ours(e.team)) return
        const p = w.get(e.by)
        if (!p) return
        if (p.team === 'a') this.poss.touchedAll.add(p.id)
        if (p.team === 'a' && !p.gk) {
          this.poss.touched.add(p.id)
          if (!this.poss.allTouched && this.ourIds.length > 1 && this.ourIds.every((id) => this.poss.touched.has(id))) {
            this.poss.allTouched = true
            for (const r of this.rules('all_touched')) this.award('all_touched', r.points)
          }
        }
        for (const r of this.rules('player_touch')) if (r.playerId === p.id) this.award('player_touch', r.points, { who: p.label ?? p.id })
        this.rules('zone_entry').forEach((r, i) => {
          const z = r.zone
          if (!this.poss.zones.has(i) && e.at.x >= z.x && e.at.x <= z.x + z.w && e.at.y >= z.y && e.at.y <= z.y + z.h) {
            this.poss.zones.add(i); this.poss.flags.add('zone_entry'); this.award('zone_entry', r.points)
          }
        })
        this.rules('cross_line').forEach((r, i) => {
          if (!this.poss.crossed.has(i) && e.at.x >= r.x && (e.start ? e.start.x < r.x : true)) { this.poss.crossed.add(i); this.award('cross_line', r.points) }
        })
        return
      }
      case 'pass_lost': {
        if (!this.ours(e.team)) return
        if (e.reason === 'out') this.mistake('ball_out')
        else if (this.userPassMargin && this.userPassMargin.by === e.from && e.t - this.userPassMargin.t < 4 && this.userPassMargin.margin < 0.15) this.mistake('lane_closed')
        this.lostIt(e.reason === 'out' ? 'out' : 'loss')
        return
      }
      case 'loss': {
        if (!this.ours(e.team)) return
        if (e.reason === 'dribble' || e.reason === 'tackle') {
          const p = w.get(e.by)
          if (p && w.opponents(p).filter((o) => dist2(o.pos, p.pos) < 3.2).length >= 2) this.mistake('lost_dribble')
          // received under pressure and lost straight away: the pass put him in trouble
          const prev = this.chain[this.chain.length - 1]
          if (prev && prev.to === e.by && e.t - prev.t < 1.6) this.mistake('pressed_on_arrival')
        }
        this.lostIt('loss')
        return
      }
      case 'regain': {
        if (e.team === 'a') {
          this.regains += this.g.scoring.some((s) => s.event === 'regain5') ? (e.within5 ? 1 : 0) : 1
          this.poss = this.freshPossession(true)
          this.lossAt = null
          this.chain = []
        } else if (e.team === 'b') {
          if (this.lossAt === null) this.lossAt = e.t
        }
        return
      }
      case 'goal': {
        if (e.team !== 'a') {
          this.stop('conceded')
          this.push({ key: 'fail.conceded', tone: 'bad' })
          return
        }
        this.goals++
        for (const r of this.rules('goal')) this.award('goal', r.points)
        for (const r of this.rules('goal_after')) {
          const ok = r.after === 'n_passes' ? this.poss.passes >= (r.n ?? 3) : r.after === 'regain' ? this.poss.fromRegain && e.t - this.poss.start < 12 : this.poss.flags.has(r.after)
          if (ok) this.award('goal_after', r.points, { after: r.after })
        }
        // a goal is always the end of an attempt, even when the sheet scores something else
        this.stop('goal', true)
        return
      }
      case 'save': {
        const shot = w.pass
        if (shot && shot.kind === 'shot' && this.ours(shot.team) && this.g.fail?.includes('shot_saved')) this.stop('shot_saved')
        return
      }
      case 'out': {
        if (this.ours(e.lastTeam) && !w.pass) this.lostIt('out')
        return
      }
    }
  }

  private lostIt(reason: 'loss' | 'out') {
    if (this.lossAt === null) this.lossAt = this.w.t
    const fails = this.g.fail ?? ['loss']
    if (fails.includes(reason)) {
      if (this.g.target.kind === 'attempts' || this.g.restart !== 'other_team_keeps') this.stop(reason)
      this.push({ key: `fail.${reason}`, tone: 'bad' })
    }
    this.poss = this.freshPossession(false)
    this.chain = []
  }
}

/** Did a pass from `a` to `b` go past the point `d` (beyond it, towards b)? */
function progressPast(a: V2, b: V2, d: V2) {
  const ab = { x: b.x - a.x, y: b.y - a.y }
  const L2 = ab.x * ab.x + ab.y * ab.y || 1
  const t = ((d.x - a.x) * ab.x + (d.y - a.y) * ab.y) / L2
  return t > 0.05 && t < 0.85 && dist2(b, d) > 2.2
}
