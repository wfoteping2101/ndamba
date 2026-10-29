// Replays: the recorder samples the world at 20 Hz (players, ball, events) and the player rebuilds a
// ghost world from it for the Analyse vidéo mode (slow motion, frame by frame, trajectories).
// Recording is cheap (one Float32Array per sample) and stops at a few minutes.
import type { DiagramSpec } from '../../lib/types'
import { pitchFromSpec } from './sim/pitch'
import type { AnimState, Look, SimEvent, Team } from './sim/types'
import { World, makePlayer } from './sim/world'

const ANIMS: AnimState[] = ['idle', 'move', 'kick', 'receive', 'tackle', 'dive', 'celebrate', 'dejected', 'catch']
const PER = 7 // x, y, facing, vx, vy, anim, animT
const EVERY = 3 // ticks between samples (60 Hz / 3 = 20 Hz)
// eight minutes: the five attempts of a Défi (up to 70 s each) and the moments between them
const MAX_SAMPLES = 20 * 60 * 8

export interface ReplayRosterEntry { id: string; team: Team; gk: boolean; label?: string; look: Look; height: number }
export interface Replay {
  spec?: DiagramSpec | null
  pitch: { w: number; h: number }
  roster: ReplayRosterEntry[]
  /** sample times (s) from the start of the recording */
  times: number[]
  /** one array per sample: players (PER floats each, in roster order) then ball x, y, z, owner index (-1) */
  frames: Float32Array[]
  /** attempt boundaries (sample index where each attempt starts) */
  cuts: number[]
  events: (SimEvent & { rt: number })[]
}

export class Recorder {
  private r: Replay
  private n = 0
  private t0 = 0
  private off: () => void
  private index = new Map<string, number>()
  private base = 0

  constructor(private w: World, spec?: DiagramSpec | null) {
    this.r = { spec: spec ?? null, pitch: { w: w.pitch.w, h: w.pitch.h }, roster: [], times: [], frames: [], cuts: [0], events: [] }
    this.setRoster(w)
    this.t0 = w.t
    this.off = w.on((e) => { if (this.r.frames.length < MAX_SAMPLES) this.r.events.push({ ...e, rt: this.base + (w.t - this.t0) }) })
  }
  private setRoster(w: World) {
    for (const p of w.players) {
      if (this.index.has(p.id)) continue
      this.index.set(p.id, this.r.roster.length)
      this.r.roster.push({ id: p.id, team: p.team, gk: p.gk, label: p.label, look: p.look, height: p.height })
    }
  }
  /** a new attempt: the next samples continue the timeline after a cut */
  rebind(w: World) {
    this.off()
    this.base = this.r.times.length ? this.r.times[this.r.times.length - 1] + 0.05 : 0
    this.w = w
    this.t0 = w.t
    this.setRoster(w)
    this.r.cuts.push(this.r.frames.length)
    this.off = w.on((e) => { if (this.r.frames.length < MAX_SAMPLES) this.r.events.push({ ...e, rt: this.base + (w.t - this.t0) }) })
  }
  tick() {
    if (this.n++ % EVERY !== 0 || this.r.frames.length >= MAX_SAMPLES) return
    const w = this.w
    const f = new Float32Array(this.r.roster.length * PER + 4).fill(NaN)
    for (const p of w.players) {
      const i = this.index.get(p.id)
      if (i === undefined) continue
      const o = i * PER
      f[o] = p.pos.x; f[o + 1] = p.pos.y; f[o + 2] = p.facing; f[o + 3] = p.vel.x; f[o + 4] = p.vel.y
      f[o + 5] = ANIMS.indexOf(p.anim); f[o + 6] = p.animT
    }
    const b = this.r.roster.length * PER
    f[b] = w.ball.pos.x; f[b + 1] = w.ball.pos.y; f[b + 2] = w.ball.pos.z
    f[b + 3] = w.ball.owner ? this.index.get(w.ball.owner) ?? -1 : -1
    this.r.frames.push(f)
    this.r.times.push(this.base + (w.t - this.t0))
  }
  finish(): Replay | null { this.off(); return this.r.frames.length > 10 ? this.r : null }
}

/** A world that only shows a replay: no brains, positions set from the samples. */
export class ReplayPlayer {
  world: World
  t = 0
  constructor(public r: Replay) {
    const spec: DiagramSpec = r.spec ?? { view: 'grid', w: r.pitch.w, h: r.pitch.h }
    this.world = new World(pitchFromSpec(spec), 1)
    for (const e of r.roster) this.world.add(makePlayer({ id: e.id, team: e.team, gk: e.gk, label: e.label, look: e.look, height: e.height, pos: { x: -50, y: -50 } }))
    this.seek(0)
  }
  get duration() { return this.r.times.length ? this.r.times[this.r.times.length - 1] : 0 }
  /** sample index at or before time t */
  indexAt(t: number) {
    const T = this.r.times
    let lo = 0, hi = T.length - 1
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (T[mid] <= t) lo = mid; else hi = mid - 1 }
    return lo
  }
  seek(t: number) {
    const r = this.r
    if (!r.frames.length) return
    this.t = Math.max(0, Math.min(this.duration, t))
    const i = this.indexAt(this.t)
    const j = Math.min(r.frames.length - 1, i + 1)
    const a = r.frames[i], b = r.frames[j]
    // never interpolate across an attempt cut
    const cut = r.cuts.includes(j) && j !== i
    const span = r.times[j] - r.times[i]
    const k = cut || span <= 0 ? 0 : (this.t - r.times[i]) / span
    const w = this.world
    r.roster.forEach((e, n) => {
      const p = w.get(e.id)!
      const o = n * PER
      const pr = w.prev.get(e.id)!
      pr.x = p.pos.x; pr.y = p.pos.y
      if (Number.isNaN(a[o])) { p.pos = { x: -50, y: -50 }; return }
      const bx = Number.isNaN(b[o]) ? a[o] : b[o], by = Number.isNaN(b[o + 1]) ? a[o + 1] : b[o + 1]
      p.pos = { x: a[o] + (bx - a[o]) * k, y: a[o + 1] + (by - a[o + 1]) * k }
      p.facing = a[o + 2]
      p.vel = { x: a[o + 3], y: a[o + 4] }
      p.anim = ANIMS[a[o + 5]] ?? 'idle'
      p.animT = a[o + 6] + k * span
      pr.x = p.pos.x; pr.y = p.pos.y
    })
    const o = r.roster.length * PER
    w.prevBall = { x: a[o] + (b[o] - a[o]) * k, y: a[o + 1] + (b[o + 1] - a[o + 1]) * k, z: a[o + 2] + (b[o + 2] - a[o + 2]) * k }
    w.ball.pos = { ...w.prevBall }
    w.ball.vel = { x: span > 0 ? (b[o] - a[o]) / span : 0, y: span > 0 ? (b[o + 1] - a[o + 1]) / span : 0, z: 0 }
    const own = a[o + 3]
    w.ball.owner = own >= 0 ? r.roster[own].id : null
    w.t = this.t
  }
  /** the ball's path between two times (for trajectory overlays) */
  ballPath(t0: number, t1: number) {
    const r = this.r
    const out: { x: number; y: number }[] = []
    const o = r.roster.length * PER
    for (let i = this.indexAt(t0); i < r.frames.length && r.times[i] <= t1; i++) out.push({ x: r.frames[i][o], y: r.frames[i][o + 1] })
    return out
  }
  /** a player's path between two times */
  playerPath(id: string, t0: number, t1: number) {
    const r = this.r
    const n = r.roster.findIndex((e) => e.id === id)
    if (n < 0) return []
    const out: { x: number; y: number }[] = []
    for (let i = this.indexAt(t0); i < r.frames.length && r.times[i] <= t1; i++) { const f = r.frames[i]; if (!Number.isNaN(f[n * PER])) out.push({ x: f[n * PER], y: f[n * PER + 1] }) }
    return out
  }
}
