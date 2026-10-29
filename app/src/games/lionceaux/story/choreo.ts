// Choreography for scenes and challenges: small awaitable steps over the World (walk there, pass
// to him, shoot, the ball flies over the mango tree...). Every step resolves on a condition checked
// at each simulation tick, or on a timeout so a scene can never hang.
import * as THREE from 'three'
import { meetPoint } from '../../engine/ai/brains'
import type { AnimState, Player } from '../../engine/sim/types'
import { dist2, type V2 } from '../../engine/sim/math'
import type { World } from '../../engine/sim/world'
import { sfx } from '../../shared/audio'
import type { CamSpec, Line, Pt, Where } from './types'

export class Cancelled extends Error { constructor(m = 'cancelled') { super(m) } }
/** a line replaced by a newer one before it was read */
export class Superseded extends Cancelled { constructor() { super('superseded') } }

/** What the choreography needs from the running session. */
export interface ChoreoHost {
  world(): World
  /** a mark of the current place */
  mark(name: string): V2 | null
  /** show lines one after the other; resolves when the last one has been read */
  say(lines: Line[]): Promise<void>
  /** frame a shot */
  camera(spec: CamSpec, cut?: boolean): void
  /** slow motion (1 = normal) */
  timeScale(s: number): void
  /** the score overlay */
  score(text: string | null): void
  shake(amount: number): void
  /** the light of the moment (fog falls, night comes) */
  mood(m: import('../sets/common').Mood): void
}

interface Waiter { until: () => boolean; resolve: () => void; reject: (e: Error) => void; deadline: number }

export class Choreo {
  private waiters: Waiter[] = []
  /** actors walking somewhere, kept moving each tick */
  private walking = new Map<string, { to: V2; speed: number }>()
  /** receivers moving to meet a pass */
  private meeting = new Set<string>()
  cancelled = false

  constructor(public host: ChoreoHost) {}

  get w() { return this.host.world() }

  /* ---------------------------------------------------------------- engine */

  /** Called by the session before each world step. */
  tick() {
    const w = this.w
    for (const [id, m] of this.walking) {
      const p = w.get(id)
      if (!p) { this.walking.delete(id); continue }
      p.meta.scripted = true
      p.target = m.to; p.speedMode = m.speed
      if (dist2(p.pos, m.to) < 0.25) { p.target = null; this.walking.delete(id) }
    }
    for (const id of this.meeting) {
      const p = w.get(id)
      if (!p || !w.pass || w.pass.receiver !== id) { this.meeting.delete(id); continue }
      const mp = meetPoint(w, p, 0.05) ?? w.ball2()
      p.target = mp; p.speedMode = 1; p.faceTarget = w.ball2()
    }
    for (const wt of [...this.waiters]) {
      let done = false
      try { done = wt.until() } catch { done = true }
      if (done || w.t > wt.deadline) { this.waiters.splice(this.waiters.indexOf(wt), 1); wt.resolve() }
    }
  }

  /** Abort the running script (skip, leave): every pending step rejects. */
  cancel() {
    this.cancelled = true
    for (const wt of this.waiters) wt.reject(new Cancelled())
    this.waiters = []
    this.walking.clear(); this.meeting.clear()
  }

  until(fn: () => boolean, timeout = 25): Promise<void> {
    if (this.cancelled) return Promise.reject(new Cancelled())
    if (fn()) return Promise.resolve()
    return new Promise((resolve, reject) => this.waiters.push({ until: fn, resolve, reject, deadline: this.w.t + timeout }))
  }
  wait(seconds: number) { const t0 = this.w.t; return this.until(() => this.w.t >= t0 + seconds, seconds + 1) }

  /* ---------------------------------------------------------------- where and who */

  p(id: string): Player {
    const p = this.w.get(id)
    if (!p) throw new Error(`no actor ${id}`)
    return p
  }
  pt(where: Where): V2 {
    if (Array.isArray(where)) return { x: where[0], y: where[1] }
    const a = this.w.get(where)
    if (a) return { ...a.pos }
    const m = this.host.mark(where)
    if (m) return { ...m }
    throw new Error(`unknown place ${where}`)
  }

  /* ---------------------------------------------------------------- bodies */

  /** Walk (speed 0.3) or run (1) to a place; resolves on arrival. */
  move(id: string, to: Where, speed = 0.45) {
    const p = this.p(id)
    const t = this.pt(to)
    p.meta.pose = undefined
    this.walking.set(id, { to: t, speed })
    p.meta.scripted = true
    return this.until(() => !this.walking.has(id), 30)
  }
  /** Set off without waiting. */
  go(id: string, to: Where, speed = 0.45) { void this.move(id, to, speed).catch(() => {}) }
  isWalking(id: string) { return this.walking.has(id) }
  stop(id: string) { this.walking.delete(id); const p = this.w.get(id); if (p) p.target = null }
  pose(id: string, pose: AnimState | null) { const p = this.p(id); p.meta.pose = pose ?? undefined; p.meta.poseT = 0 }
  face(id: string, to: Where | number) {
    const p = this.p(id)
    if (typeof to === 'number') { p.facing = to; p.faceTarget = null; return }
    const t = this.pt(to)
    p.facing = Math.atan2(t.y - p.pos.y, t.x - p.pos.x)
    p.faceTarget = t
  }
  look(id: string, at: Where | null) { const p = this.p(id); p.meta.lookAt = at === null ? undefined : this.pt(at) }

  /* ---------------------------------------------------------------- ball */

  give(id: string) { const p = this.p(id); this.w.ballScript = null; this.w.giveBall(p); if (p.team !== 'n') this.w.possTeam = p.team }
  place(at: Where) { const t = this.pt(at); this.w.ballScript = null; this.w.placeBall(t.x, t.y) }

  /** A ground pass (or lofted). With a receiver id, he moves to meet it; resolves when he has it or the ball dies. */
  pass(from: string, to: Where, opts: { lofted?: boolean; arrive?: number; flight?: number; oneTouch?: boolean; lead?: number } = {}) {
    const w = this.w
    const p = this.p(from)
    const recv = typeof to === 'string' ? w.get(to) ?? null : null
    let target = this.pt(to)
    if (recv && opts.lead) target = { x: recv.pos.x + recv.vel.x * opts.lead, y: recv.pos.y + recv.vel.y * opts.lead }
    if (recv) recv.wantsBall = true
    w.requestPass(p, target, { receiver: recv?.id ?? null, lofted: opts.lofted, arrive: opts.arrive, flight: opts.flight, precise: true })
    const t0 = w.t
    let kicked = false
    const stop = w.on((e) => { if (e.type === 'kick' && e.by === from) { kicked = true; if (recv) this.meeting.add(recv.id) } })
    return this.until(() => {
      if (!kicked) return w.t - t0 > 2.5
      if (recv) return w.ball.owner === recv.id || (!w.ball.inFlight && Math.hypot(w.ball.vel.x, w.ball.vel.y) < 0.3)
      return !w.ball.inFlight && Math.hypot(w.ball.vel.x, w.ball.vel.y) < 0.5
    }, 8).finally(stop)
  }

  /** A shot at a point (sim x, y) and height; resolves on goal, save, out or when the ball dies. */
  shot(from: string, at: Pt, opts: { height?: number; speed?: number } = {}) {
    const w = this.w
    w.requestShot(this.p(from), { x: at[0], y: at[1] }, opts.height ?? 0.5, opts.speed ?? 15)
    const t0 = w.t
    let kicked = false
    const stop = w.on((e) => { if (e.type === 'kick' && e.by === from) kicked = true })
    return this.until(() => (!kicked ? w.t - t0 > 2.5 : !!w.dead || (!w.ball.inFlight && Math.hypot(w.ball.vel.x, w.ball.vel.y) < 0.6)), 6).finally(stop)
  }

  /** A scripted flight of the ball (a clearance onto the barbed wire): a parabola from -> to. */
  arc(from: [number, number, number], to: [number, number, number], peak: number, dur: number) {
    const w = this.w
    const t0 = w.t
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to)
    w.ball.owner = null
    w.ballScript = (t) => {
      const u = Math.min(1, (t - t0) / dur)
      const x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u
      const z = a.z + (b.z - a.z) * u + 4 * peak * u * (1 - u)
      return { x, y, z }
    }
    return this.until(() => w.t - t0 >= dur, dur + 1)
  }
  /** Hold the ball still somewhere (stuck on the wire, in a hand). */
  hold(at: [number, number, number]) { this.w.ballScript = () => ({ x: at[0], y: at[1], z: at[2] }) }
  /** The ball follows an actor's hands (carried). */
  carry(id: string, height = 0.95) {
    const p = this.p(id)
    this.w.ballScript = () => ({ x: p.pos.x + Math.cos(p.facing) * 0.28, y: p.pos.y + Math.sin(p.facing) * 0.28, z: height })
  }
  release() { this.w.ballScript = null }

  /* ---------------------------------------------------------------- presentation */

  say(lines: Line[]) { return this.host.say(lines) }
  cam(spec: CamSpec, cut = true) { this.host.camera(spec, cut) }
  slow(s: number) { this.host.timeScale(s) }
  score(text: string | null) { this.host.score(text) }
  sfx(kind: Parameters<typeof sfx>[0]) { sfx(kind) }
  shake(a = 0.4) { this.host.shake(a) }
}
