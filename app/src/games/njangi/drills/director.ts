// Plays a diagram's numbered actions in the live world. Runs start on cue, passes are aimed into
// the runner's stride when the next action is his run (the book's "passe dans la course"),
// dribbles carry the ball, shots go at the goal. Players not involved keep their own brains.
import { dist2, type V2 } from '../../engine/sim/math'
import type { World } from '../../engine/sim/world'
import type { Player } from '../../engine/sim/types'
import { stepTarget, type Step } from './scenario'

export type DirectorState = 'running' | 'done' | 'failed'

export class SequenceDirector {
  groups: Step[][] = []
  gi = 0
  private groupStart = 0
  private passed = new Set<Step>()
  private started = new Set<Step>()
  state: DirectorState = 'running'
  /** players currently driven by the director (their brains are skipped) */
  driven = new Set<string>()
  failReason: string | null = null

  constructor(private w: World, steps: Step[], private opts: { speed?: number; userPasses?: boolean; userDribbles?: boolean } = {}) {
    const byN = new Map<number, Step[]>()
    for (const s of steps) { const l = byN.get(s.n) ?? []; l.push(s); byN.set(s.n, l) }
    this.groups = [...byN.keys()].sort((a, b) => a - b).map((k) => byN.get(k)!)
    this.groupStart = w.t
    // listen for failures
    w.on((e) => {
      if (this.state !== 'running') return
      // the user's shot for a shooting action of the sequence
      if (e.type === 'shot' && this.opts.userPasses) {
        const st = this.current().find((s) => s.kind === 'shot' && s.from === e.by)
        if (st) this.passed.add(st)
      }
      const lastPlayed = () => this.gi >= this.groups.length - 1 && this.current().every((s) => s.kind !== 'pass' && s.kind !== 'shot' ? this.started.has(s) || s.kind === 'run' || s.kind === 'press' : this.passed.has(s))
      if (e.type === 'pass_lost') {
        // the last action played, the ball rolls on over a line: the sequence is complete
        if (e.reason === 'out' && lastPlayed()) { this.state = 'done'; return }
        this.state = 'failed'; this.failReason = e.reason
      }
      if (e.type === 'out') {
        if (lastPlayed()) { this.state = 'done'; return }
        this.state = 'failed'; this.failReason = 'out'
      }
    })
    if (!this.groups.length) this.state = 'done'
  }

  current() { return this.groups[this.gi] ?? [] }

  private inside(p: V2, m: number): V2 {
    const w = this.w.pitch
    return { x: Math.max(m, Math.min(w.w - m, p.x)), y: Math.max(m, Math.min(w.h - m, p.y)) }
  }

  /** For a pass from `from` to `to`: if `to` has a run later, aim at the end of that run. */
  private passPoint(s: Step): V2 {
    if (typeof s.to !== 'string') return this.inside(s.to, 1.2)
    const receiver = this.w.get(s.to)!
    for (let k = this.gi; k < Math.min(this.groups.length, this.gi + 2); k++) {
      const run = this.groups[k].find((r) => r.kind === 'run' && r.from === s.to)
      if (run) {
        const end = stepTarget(this.w, run)
        // meet him most of the way along his run
        return { x: receiver.pos.x + (end.x - receiver.pos.x) * 0.85, y: receiver.pos.y + (end.y - receiver.pos.y) * 0.85 }
      }
    }
    return this.w.leadPoint(this.w.get(s.from)!, receiver)
  }

  /** Call before each world step. */
  tick() {
    if (this.state !== 'running') return
    const w = this.w
    const group = this.current()
    if (!group.length) { this.state = 'done'; return }
    const elapsed = w.t - this.groupStart
    const speed = this.opts.speed ?? 1
    for (const id of this.driven) { const q = w.get(id); if (q) q.meta.scripted = false }
    this.driven.clear()
    const receiving = new Set<string>()
    let allDone = true
    for (const s of group) {
      const p = w.get(s.from)
      if (!p) continue
      if (s.kind === 'run' || s.kind === 'press') {
        const to = stepTarget(w, s)
        this.driven.add(p.id)
        p.target = to; p.speedMode = 0.85 * speed; p.faceTarget = w.ball2()
        if (dist2(p.pos, to) > 0.8 && elapsed < 4.5) allDone = false
      } else if (s.kind === 'dribble') {
        // stop short of the lines: the touches go a metre or two ahead of the feet
        const to = this.inside(stepTarget(w, s), 3)
        if (this.opts.userDribbles) {
          // the user carries the ball there
          if (!(w.ball.owner === p.id && dist2(p.pos, to) < 3) && elapsed < 14) allDone = false
        } else if (w.ball.owner === p.id) {
          this.driven.add(p.id)
          p.target = to; p.speedMode = 0.7 * speed; p.faceTarget = null
          if ((dist2(p.pos, to) > 2.5 || Math.hypot(w.ball.vel.x, w.ball.vel.y) > 2) && elapsed < 7) allDone = false
        } else {
          // not on the ball (yet): go and get a loose ball first
          this.fetch(p)
          allDone = false
          if (this.broken(p, elapsed)) return
        }
        this.started.add(s)
      } else if (s.kind === 'pass') {
        const rid = typeof s.to === 'string' ? s.to : s.receiver ?? null
        // the picture already shows this pass made (the ball starts with its receiver)
        if (!this.passed.has(s) && this.gi === 0 && rid && w.ball.owner === rid && w.ball.owner !== s.from) this.passed.add(s)
        if (this.passed.has(s)) {
          // wait for the receiver to have it; he now plays the ball, not his scripted run
          const r = rid ? w.get(rid) : null
          if (r) receiving.add(r.id)
          if (r && w.ball.owner !== r.id && elapsed < 6) allDone = false
          if (!r && (w.ball.inFlight || Math.hypot(w.ball.vel.x, w.ball.vel.y) > 1)) allDone = false
          continue
        }
        allDone = false
        if (this.opts.userPasses) continue // the player makes this pass
        if (w.ball.owner === p.id && !p.pending && elapsed > 0.25 / speed) {
          // wait a moment for a runner of the same group to set off
          const runner = group.find((r) => r.kind === 'run' && r.from === rid)
          if (runner && elapsed < 0.6) continue
          const pt = this.passPoint(s)
          // the receiver's first touch opens towards his own next pass (the sheet's oriented control)
          if (rid) {
            const r = w.get(rid)
            const next = this.groups.slice(this.gi + 1).flat().find((q) => q.from === rid && (q.kind === 'pass' || q.kind === 'shot' || q.kind === 'dribble'))
            if (r && next) {
              const nt = stepTarget(w, next)
              const dx = nt.x - pt.x, dy = nt.y - pt.y, l = Math.hypot(dx, dy)
              if (l > 1) r.meta.touchDir = { x: dx / l, y: dy / l }
            }
          }
          w.requestPass(p, pt, { receiver: rid, arrive: typeof s.to === 'string' ? undefined : rid ? 3.5 : 0.8, precise: true })
          this.passed.add(s)
        } else { this.fetch(p); if (this.broken(p, elapsed)) return }
      } else if (s.kind === 'shot') {
        if (this.passed.has(s)) { if (w.ball.inFlight && elapsed < 3) allDone = false; continue }
        allDone = false
        if (this.opts.userPasses) continue // the user shoots
        if (w.ball.owner !== p.id) { this.fetch(p); if (this.broken(p, elapsed)) return }
        else if (!p.pending) {
          const goal = nearestGoal(w, p)
          const to = typeof s.to === 'string' ? stepTarget(w, s) : goal ? { x: goal.x, y: goal.y + (w.rng.next() - 0.5) * goal.width * 0.6 } : s.to
          w.requestShot(p, to, goal?.mini ? 0.25 : 0.7, goal?.mini ? 14 : 21)
          this.passed.add(s)
        }
      }
    }
    for (const id of receiving) this.driven.delete(id)
    for (const id of this.driven) { const q = w.get(id); if (q) q.meta.scripted = true }
    if (allDone) { this.gi++; this.groupStart = w.t; this.started.clear() }
  }
  /**
   * The move is broken when another player of ours has the ball instead of the actor (a loose ball
   * picked up by the wrong team-mate): the attempt is over, the drill starts it again. Waits a
   * moment, since a ball on its way to the actor can be touched on the way.
   */
  private broken(p: Player, elapsed: number) {
    // only when someone plays it: a demonstration that goes wrong is replayed by the runner anyway
    if (!this.opts.userPasses && !this.opts.userDribbles) return false
    const own = this.w.ball.owner
    if (!own || own === p.id || elapsed < 1.5) return false
    const o = this.w.get(own)
    if (!o) return false
    // the receiver of a pass of this group may still be about to play it on
    if (this.current().some((s) => s.kind === 'pass' && this.passed.has(s) && (s.to === own || s.receiver === own))) return false
    this.state = 'failed'; this.failReason = o.team === p.team ? 'broken' : 'loss'
    return true
  }

  /** Release every player back to his brain. */
  release() { for (const id of this.driven) { const q = this.w.get(id); if (q) q.meta.scripted = false } this.driven.clear() }

  /** The actor needs the ball and it is loose (a heavy touch, a pass that stopped short): go and get it. */
  private fetch(p: Player) {
    const w = this.w
    if (w.ball.owner === p.id || w.ball.owner || p.pending) return
    const speed = Math.hypot(w.ball.vel.x, w.ball.vel.y)
    if (w.pass && speed > 3) return // a pass is still travelling, maybe to him
    if (dist2(p.pos, w.ball2()) > 14) return
    this.driven.add(p.id)
    p.target = w.ball2(); p.speedMode = 0.85; p.faceTarget = w.ball2(); p.wantsBall = true
  }

  /** The pass the user is expected to make now (pattern lessons), if any. */
  expectedPass(): Step | null {
    const g = this.current()
    return g.find((s) => s.kind === 'pass' && !this.passed.has(s)) ?? null
  }
  /** Tell the director the user made the expected pass. */
  markPassed(s: Step) { this.passed.add(s) }
  isDriven(p: Player) { return this.driven.has(p.id) }
}

function nearestGoal(w: World, p: Player) {
  let best = null as null | (typeof w.pitch.goals)[number], bd = 1e9
  for (const g of w.pitch.goals) { const d = dist2(g, p.pos); if (d < bd && g.attackedBy === (p.team === 'b' ? 'b' : 'a')) { bd = d; best = g } }
  return best ?? w.pitch.goals[0] ?? null
}
