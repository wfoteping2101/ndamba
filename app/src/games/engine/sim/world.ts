// The football world: players, ball, possession, kicks, first touches, dribbling, tackles and events.
// Runs on a fixed timestep (60 Hz) and is deterministic for a given seed and inputs.
import { BALL_R, groundSpeed, kickGround, kickLofted, kickShot, makeBall, onGround, rollTimeTo, stepBall, type Ball } from './ball'
import { add2, angleDiff, clamp, dist2, fromAngle, len2, limit2, norm2, Rng, scale2, sub2, turnTowards, type V2 } from './math'
import type { PitchGeom } from './pitch'
import type { Difficulty, Look, PendingAction, Player, SimEvent, Team } from './types'
import { DIFFICULTY } from './types'

export const DT = 1 / 60
export const FOOT = 0.38 // foot point ahead of the body centre
export const CONTROL_R = 0.6
export const KICK_R = 0.78
export const BODY_R = 0.32
export const TACKLE_R = 1.2
const THINK_EVERY = 6 // ticks: AI decisions at 10 Hz

export interface Brain { think(w: World, me: Player): void }

export const DEFAULT_LOOK: Look = { skin: '#6b4430', hair: 'crop', hairColor: '#17110d', shirt: '#0B5D3B', shirtTrim: '#F5B700', shorts: '#F6F7F2', sockL: '#0B5D3B', sockR: '#0B5D3B', boots: '#12211A' }

export function makePlayer(p: Partial<Player> & { id: string; team: Team; pos: V2 }): Player {
  return {
    label: undefined, name: undefined, gk: false, vel: { x: 0, y: 0 }, facing: p.team === 'b' ? Math.PI : 0,
    maxSpeed: 7.2, accel: 5.5, decel: 9, height: 1.78, target: null, speedMode: 0.7, faceTarget: null, touchDir: null,
    pending: null, anim: 'idle', animT: 0, kickFoot: 'R', touches: 0, controlled: false, reaction: 0.25, cooldown: 0,
    wantsBall: true, skill: 0.75, look: { ...DEFAULT_LOOK }, meta: {},
    ...p,
  }
}

interface PassInProgress { from: string; team: Team; start: V2; t: number; receiver: string | null; kind: 'pass' | 'lofted' | 'shot' | 'clear' }

export class World {
  pitch: PitchGeom
  ball: Ball
  players: Player[] = []
  byId = new Map<string, Player>()
  brains = new Map<string, Brain>()
  diff: Difficulty = DIFFICULTY.normal
  rng: Rng
  t = 0
  tick = 0
  events: SimEvent[] = []
  /** team that has the ball (neutrals never own possession) */
  possTeam: 'a' | 'b' | null = null
  /** last time each team lost the ball (for REGAIN5) */
  lossTime: Record<'a' | 'b', number> = { a: -99, b: -99 }
  pass: PassInProgress | null = null
  /** set when the ball went out or a goal was scored: the game layer decides the restart */
  dead: null | { reason: 'out' | 'goal'; t: number } = null
  /** previous positions for render interpolation */
  prev = new Map<string, V2>()
  prevBall = { x: 0, y: 0, z: 0 }
  /** listeners (audio, feedback, tagger) */
  private listeners: ((e: SimEvent) => void)[] = []

  constructor(pitch: PitchGeom, seed = 7) {
    this.pitch = pitch
    this.ball = makeBall(pitch.w / 2, pitch.h / 2)
    this.rng = new Rng(seed)
  }

  add(p: Player, brain?: Brain) {
    this.players.push(p)
    this.byId.set(p.id, p)
    this.prev.set(p.id, { ...p.pos })
    if (brain) this.brains.set(p.id, brain)
    return p
  }
  get(id: string | null | undefined) { return id ? this.byId.get(id) : undefined }
  on(fn: (e: SimEvent) => void) { this.listeners.push(fn); return () => { this.listeners = this.listeners.filter((f) => f !== fn) } }
  emit(e: SimEvent) { this.events.push(e); for (const l of this.listeners) l(e) }

  owner() { return this.get(this.ball.owner) }
  /** team a player effectively plays for right now (neutrals join the team in possession) */
  sideOf(p: Player): 'a' | 'b' | null { return p.team === 'n' ? this.possTeam : p.team }
  teammates(p: Player) {
    const side = this.sideOf(p)
    return this.players.filter((q) => q !== p && (q.team === side || (q.team === 'n' && side !== null) || (p.team === 'n' && q.team === side)))
  }
  opponents(p: Player) {
    const side = this.sideOf(p)
    if (side === null) return []
    return this.players.filter((q) => q.team !== 'n' && q.team !== side)
  }
  foot(p: Player): V2 { return { x: p.pos.x + Math.cos(p.facing) * FOOT, y: p.pos.y + Math.sin(p.facing) * FOOT } }
  ball2(): V2 { return { x: this.ball.pos.x, y: this.ball.pos.y } }

  /** Give the ball to a player at his feet (drill setup, restarts). */
  giveBall(p: Player) {
    const f = this.foot(p)
    this.ball.pos = { x: f.x, y: f.y, z: BALL_R }
    this.ball.vel = { x: 0, y: 0, z: 0 }
    this.ball.owner = p.id
    this.ball.lastTouch = p.id
    this.ball.lastTouchTeam = p.team
    this.ball.inFlight = false
    this.ball.inNet = null
    if (p.team !== 'n') this.possTeam = p.team
    p.touches = 0
    this.pass = null
    this.dead = null
  }
  placeBall(x: number, y: number) {
    this.ball = { ...makeBall(x, y) }
    this.pass = null
    this.dead = null
  }

  /* ------------------------------------------------------------------ actions */

  /** Ask a player to pass to a point (ground or lofted). The foot meets the ball after a short wind-up. */
  requestPass(p: Player, to: V2, opts: { receiver?: string | null; lofted?: boolean; arrive?: number; flight?: number; by?: 'user' | 'ai' } = {}) {
    p.pending = {
      type: opts.lofted ? 'lofted' : 'pass', to, receiver: opts.receiver ?? null, arrive: opts.arrive ?? 5.5,
      flight: opts.flight ?? 1.4, windup: 0.11, by: opts.by ?? 'ai',
    }
  }
  requestShot(p: Player, to: V2, height = 0.8, speed = 22, by: 'user' | 'ai' = 'ai') {
    p.pending = { type: 'shot', to, height, speed, windup: 0.16, by }
  }
  requestTackle(p: Player, by: 'user' | 'ai' = 'ai') {
    if (p.cooldown > 0) return
    p.pending = { type: 'tackle', windup: 0.08, by }
  }

  /** Point to aim a ground pass so a moving receiver meets the ball (lead pass). */
  leadPoint(passer: Player, receiver: Player, arrive = 5.5): V2 {
    let target = { ...receiver.pos }
    const from = this.ball2()
    const runDir = len2(receiver.vel) > 0.8 ? norm2(receiver.vel) : null
    for (let i = 0; i < 4; i++) {
      const d = dist2(from, target)
      const v0 = Math.max(arrive + 1, Math.min(30, 4 + d * 0.55))
      const t = rollTimeTo(v0, d, this.pitch.surface)
      if (!isFinite(t) || !runDir) break
      const lead = Math.min(len2(receiver.vel) * t, 6)
      target = add2(receiver.pos, scale2(runDir, lead * 0.85))
    }
    return { x: clamp(target.x, 0.5, this.pitch.w - 0.5), y: clamp(target.y, 0.5, this.pitch.h - 0.5) }
  }

  /* ------------------------------------------------------------------ step */

  step(dt = DT) {
    this.tick++
    this.t += dt
    for (const p of this.players) { const pr = this.prev.get(p.id)!; pr.x = p.pos.x; pr.y = p.pos.y }
    this.prevBall = { ...this.ball.pos }

    // 1. AI decisions at 10 Hz, staggered so they don't all think on the same tick
    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i]
      if (p.controlled || p.meta.scripted) continue
      const brain = this.brains.get(p.id)
      if (brain && (this.tick + i) % THINK_EVERY === 0) brain.think(this, p)
    }
    // 2. pending actions (kicks, tackles)
    for (const p of this.players) {
      if (p.cooldown > 0) p.cooldown -= dt
      p.animT += dt
      if (p.pending) this.runPending(p, dt)
    }
    // 3. movement
    for (const p of this.players) this.movePlayer(p, dt)
    this.separate()
    // 4. ball: dribble touches, free-ball physics, control, blocks
    this.updateBall(dt)
    // 5. animation bookkeeping
    for (const p of this.players) {
      if ((p.anim === 'kick' && p.animT > 0.45) || (p.anim === 'receive' && p.animT > 0.35) || (p.anim === 'tackle' && p.animT > 0.7) || (p.anim === 'dive' && p.animT > 1.1) || (p.anim === 'catch' && p.animT > 0.6)) {
        p.anim = len2(p.vel) > 0.3 ? 'move' : 'idle'; p.animT = 0
      }
      if (p.anim === 'idle' && len2(p.vel) > 0.35) { p.anim = 'move'; p.animT = 0 }
      if (p.anim === 'move' && len2(p.vel) < 0.2) { p.anim = 'idle'; p.animT = 0 }
    }
  }

  private runPending(p: Player, dt: number) {
    const a = p.pending!
    if (a.type === 'tackle') {
      a.windup -= dt
      if (a.windup <= 0) { this.doTackle(p); p.pending = null }
      return
    }
    // the player must be on the ball: close to it, low enough
    const f = this.foot(p)
    const d = dist2(f, this.ball2())
    const inReach = d < KICK_R && this.ball.pos.z < (a.type === 'shot' ? 1.1 : 0.9) && !this.ball.inNet
    if (!inReach) {
      // go to the ball; give up after a while if it's gone
      a.windup = Math.max(a.windup, 0.05)
      p.target = { ...this.ball2() }
      p.speedMode = Math.max(p.speedMode, 0.8)
      ;(a as PendingAction & { wait?: number }).wait = ((a as PendingAction & { wait?: number }).wait ?? 0) + dt
      if (((a as PendingAction & { wait?: number }).wait ?? 0) > 1.4 || (this.ball.owner && this.ball.owner !== p.id)) p.pending = null
      return
    }
    // open the body first: nobody strikes a ball behind his own back. Turn with the ball on the foot.
    if (a.to) {
      const want = Math.atan2(a.to.y - this.ball.pos.y, a.to.x - this.ball.pos.x)
      const diff = Math.abs(angleDiff(p.facing, want))
      if (diff > 1.05) {
        p.facing = turnTowards(p.facing, want, 11 * dt)
        p.target = null
        const nf = this.foot(p)
        if (this.ball.owner === p.id || dist2(nf, this.ball2()) < KICK_R) {
          this.ball.pos.x = nf.x; this.ball.pos.y = nf.y; this.ball.vel.x = 0; this.ball.vel.y = 0
        }
        a.windup = Math.max(a.windup, 0.06)
        return
      }
    }
    if (p.anim !== 'kick') { p.anim = 'kick'; p.animT = 0; p.kickFoot = this.kickFootFor(p, a.to) }
    a.windup -= dt
    if (a.windup > 0) return
    this.doKick(p, a)
    p.pending = null
  }

  private kickFootFor(p: Player, to?: V2): 'L' | 'R' {
    if (!to) return 'R'
    const ang = Math.atan2(to.y - p.pos.y, to.x - p.pos.x)
    // pitch y grows downwards in diagrams; a target to the player's right (positive diff) suits the left foot
    return angleDiff(p.facing, ang) > 0.35 ? 'L' : 'R'
  }

  private doKick(p: Player, a: PendingAction) {
    const b = this.ball
    const from = this.ball2()
    const pressure = this.pressureOn(p)
    let to = a.to ? { ...a.to } : add2(from, fromAngle(p.facing, 10))
    // execution noise: worse under pressure and with poor skill; the AI also has its difficulty noise
    const dist = dist2(from, to)
    const noiseRad = (a.by === 'ai' ? this.diff.passNoise : 0.012) * (1 + pressure * 1.5) * (1.3 - p.skill * 0.6)
    const ang = Math.atan2(to.y - from.y, to.x - from.x) + this.rng.gauss() * noiseRad
    to = add2(from, fromAngle(ang, dist))
    let kind: 'pass' | 'lofted' | 'shot' | 'clear' = 'pass'
    let speed = 0
    if (a.type === 'pass') { const r = kickGround(b, to, a.arrive ?? 5.5, this.pitch.surface); speed = r.v0 }
    else if (a.type === 'lofted') { kickLofted(b, to, a.flight ?? 1.4); kind = 'lofted'; speed = Math.hypot(b.vel.x, b.vel.y) }
    else { kickShot(b, { x: to.x, y: to.y, z: a.height ?? 0.8 }, a.speed ?? 22); kind = 'shot'; speed = a.speed ?? 22 }
    b.lastTouch = p.id
    b.lastTouchTeam = p.team
    b.owner = null
    p.cooldown = 0.25
    p.touches++
    p.facing = turnTowards(p.facing, ang, 0.8)
    const team = (this.sideOf(p) ?? p.team) as Team
    this.pass = { from: p.id, team, start: from, t: this.t, receiver: a.receiver ?? null, kind }
    this.emit({ type: 'kick', t: this.t, by: p.id, team: p.team, kind, from, to, receiver: a.receiver ?? null, speed })
    if (kind === 'shot') this.emit({ type: 'shot', t: this.t, by: p.id, team, from })
  }

  /** How close the nearest opponent is (0 = nobody within 6 m, 1 = on top of him). */
  pressureOn(p: Player) {
    let best = 99
    for (const q of this.opponents(p)) best = Math.min(best, dist2(q.pos, p.pos))
    return clamp(1 - (best - 0.8) / 5.2, 0, 1)
  }

  private doTackle(p: Player) {
    const own = this.owner()
    const ballD = dist2(this.foot(p), this.ball2())
    p.anim = 'tackle'; p.animT = 0
    p.cooldown = 0.9
    if (!own || own.team === p.team || ballD > TACKLE_R) {
      // a tackle on a loose ball near the feet just wins it
      if (!own && ballD < TACKLE_R && this.ball.pos.z < 0.6) { this.takeControl(p, false) }
      return
    }
    // success depends on how far the ball is from the carrier's foot, the angle, and skills
    const ownFoot = this.foot(own)
    const exposed = clamp(dist2(ownFoot, this.ball2()) / 1.2, 0, 1)
    const fromBehind = Math.abs(angleDiff(own.facing, Math.atan2(p.pos.y - own.pos.y, p.pos.x - own.pos.x))) > 2.2
    let chance = 0.28 + exposed * 0.45 + (p.skill - own.skill) * 0.3 + (len2(own.vel) > 4 ? 0.08 : -0.06)
    if (fromBehind) chance -= 0.18
    const success = this.rng.next() < clamp(chance, 0.05, 0.9)
    this.emit({ type: 'tackle', t: this.t, by: p.id, on: own.id, success })
    if (success) {
      const team = own.team === 'n' ? this.possTeam : own.team
      this.ball.owner = null
      if (this.rng.next() < 0.5 && ballD < 0.9) this.takeControl(p, false)
      else {
        const away = norm2(sub2(this.ball2(), p.pos))
        this.ball.vel = { x: away.x * 4.5, y: away.y * 4.5, z: 0 }
        this.ball.lastTouch = p.id; this.ball.lastTouchTeam = p.team
      }
      if (team && team !== p.team) this.registerLoss(team, own.id, 'tackle')
    } else {
      own.cooldown = 0
    }
  }

  private registerLoss(team: 'a' | 'b', by: string, reason: 'tackle' | 'control' | 'dribble' | 'out') {
    this.lossTime[team] = this.t
    this.emit({ type: 'loss', t: this.t, team, by, reason })
  }

  /* ------------------------------------------------------------------ movement */

  private movePlayer(p: Player, dt: number) {
    const max = p.maxSpeed * (this.ball.owner === p.id ? 0.86 : 1)
    let desired = { x: 0, y: 0 }
    if (p.target) {
      const off = sub2(p.target, p.pos)
      const d = len2(off)
      if (d > 0.05) {
        let sp = max * clamp(p.speedMode, 0, 1)
        const slowR = 1.6
        if (d < slowR) sp *= d / slowR
        desired = scale2(off, sp / d)
      }
    }
    const dv = sub2(desired, p.vel)
    const speeding = len2(desired) > len2(p.vel)
    // turning at speed costs: agility drops as speed rises
    const turnPenalty = 1 - clamp(len2(p.vel) / (max * 1.6), 0, 0.45)
    p.vel = add2(p.vel, limit2(dv, (speeding ? p.accel * turnPenalty : p.decel) * dt))
    p.pos = add2(p.pos, scale2(p.vel, dt))
    // stay on the playable area (plus a little run-off)
    p.pos.x = clamp(p.pos.x, -3, this.pitch.w + 3)
    p.pos.y = clamp(p.pos.y, -3, this.pitch.h + 3)
    // facing: look where you run when fast, otherwise towards faceTarget (usually the ball)
    const sp = len2(p.vel)
    let want = p.facing
    if (p.faceTarget && (sp < 2.5 || p.pending)) want = Math.atan2(p.faceTarget.y - p.pos.y, p.faceTarget.x - p.pos.x)
    else if (sp > 0.4) want = Math.atan2(p.vel.y, p.vel.x)
    p.facing = turnTowards(p.facing, want, (sp > 5 ? 6 : 10) * dt)
  }

  private separate() {
    const ps = this.players
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i], b = ps[j]
      const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y
      const d = Math.hypot(dx, dy)
      const min = 0.62
      if (d < min && d > 1e-6) {
        const push = (min - d) / 2
        const nx = dx / d, ny = dy / d
        a.pos.x -= nx * push; a.pos.y -= ny * push
        b.pos.x += nx * push; b.pos.y += ny * push
      }
    }
  }

  /* ------------------------------------------------------------------ ball */

  private updateBall(dt: number) {
    const b = this.ball
    if (this.dead) { stepBall(b, dt, this.pitch, () => this.rng.next()); return }
    const own = this.owner()
    if (own) this.dribble(own, dt)
    const r = stepBall(b, dt, this.pitch, () => this.rng.next())
    if (r.hitPost) this.emit({ type: 'post', t: this.t })
    if (r.goal) {
      const scorer = b.lastTouch
      const attacking = r.goal.attackedBy
      this.emit({ type: 'goal', t: this.t, team: attacking, by: scorer, goalAttackedBy: attacking })
      this.pass = null
      this.dead = { reason: 'goal', t: this.t }
      return
    }
    if (r.out) {
      const lastTeam = b.lastTouchTeam
      if (this.pass && (this.pass.kind === 'pass' || this.pass.kind === 'lofted')) {
        this.emit({ type: 'pass_lost', t: this.t, from: this.pass.from, team: this.pass.team, by: null, reason: 'out', start: this.pass.start, end: this.ball2() })
        if (this.pass.team !== 'n') this.lossTime[this.pass.team] = this.t
      } else if (this.possTeam && lastTeam === this.possTeam) {
        this.registerLoss(this.possTeam, b.lastTouch || '', 'out')
      }
      this.emit({ type: 'out', t: this.t, lastTeam, at: this.ball2() })
      this.pass = null
      b.owner = null
      this.dead = { reason: 'out', t: this.t }
      return
    }
    // owner lost the ball if it ran too far from him
    if (own && dist2(own.pos, this.ball2()) > 2.4) {
      b.owner = null
    }
    if (!b.owner) this.freeBallContacts()
  }

  /** Close control: the ball is pushed ahead in touches, never glued to the foot. */
  private dribble(p: Player, dt: number) {
    const b = this.ball
    if (p.pending && p.pending.type !== 'tackle') return // about to kick: leave the ball where it is
    const f = this.foot(p)
    const toBall = sub2(this.ball2(), f)
    const d = len2(toBall)
    const sp = len2(p.vel)
    // carry only when the player means to go somewhere; a player braking or turning keeps it close
    const intent = p.target ? sub2(p.target, p.pos) : { x: 0, y: 0 }
    const wantsToCarry = len2(intent) > 1.1 && p.speedMode > 0.15
    const moveDir = wantsToCarry ? norm2(intent) : sp > 0.35 ? norm2(p.vel) : fromAngle(p.facing)
    if (sp < 0.5 || !wantsToCarry) {
      // standing: keep the ball under the sole, with a soft pull to the foot point
      if (d < 0.9) {
        b.vel.x = (f.x - b.pos.x) * 4; b.vel.y = (f.y - b.pos.y) * 4; b.vel.z = 0
      } else {
        // the last touch ran a little long: reach for it and slow it down (sole, inside of the foot)
        if (d < 1.7) { const k = Math.max(0, 1 - 7 * dt); b.vel.x *= k; b.vel.y *= k }
        if (!p.controlled) {
          p.target = { x: b.pos.x - (f.x - p.pos.x), y: b.pos.y - (f.y - p.pos.y) }
          p.speedMode = Math.max(p.speedMode, 0.55)
        }
      }
      return
    }
    // moving: touch it ahead when the foot catches up with the ball
    const ballAhead = (b.pos.x - p.pos.x) * moveDir.x + (b.pos.y - p.pos.y) * moveDir.y
    const ballSpeed = groundSpeed(b)
    if (d < 0.55 && (ballAhead < 0.9 || ballSpeed < sp * 0.9) && onGround(b)) {
      // a soft touch when arriving: the ball should die near where the player means to stop
      const remain = len2(intent)
      const touch = remain < 2.6 ? Math.max(0.5, sp * 0.5) : Math.min(clamp(sp * 1.32 + 0.7, 1.4, 9.5), 1.1 + remain * 0.7)
      // the touch goes where the player is heading (a little skill noise)
      const ang = Math.atan2(moveDir.y, moveDir.x) + this.rng.gauss() * 0.04 * (1.2 - p.skill)
      b.vel = { x: Math.cos(ang) * touch, y: Math.sin(ang) * touch, z: 0 }
      b.lastTouch = p.id; b.lastTouchTeam = p.team
      p.touches++
      this.emit({ type: 'touch', t: this.t, by: p.id })
    }
  }

  /** A loose or travelling ball meets players: interception, reception, body blocks, keeper catches. */
  private freeBallContacts() {
    const b = this.ball
    const bp = this.ball2()
    const speed = Math.hypot(b.vel.x, b.vel.y)
    let best: Player | null = null, bestD = 99
    for (const p of this.players) {
      if (b.lastTouch === p.id && this.pass && this.pass.from === p.id && this.t - this.pass.t < 0.45) continue // the kicker can't touch his own pass straight away
      // a teammate lets a pass meant for someone else run through (the dummy), unless it has died
      if (this.pass && this.pass.receiver && this.pass.receiver !== p.id && (this.pass.kind === 'pass' || this.pass.kind === 'lofted') && speed > 2.5) {
        const passer = this.get(this.pass.from)
        if (passer && (p.team === passer.team || p.team === 'n' || passer.team === 'n')) continue
      }
      const reach = p.gk ? (p.anim === 'dive' ? 1.85 : 1.05) : CONTROL_R
      const d = dist2(this.foot(p), bp)
      const height = b.pos.z
      const maxH = p.gk ? 2.45 : p.wantsBall ? 1.25 : 0.7
      if (d < reach && height < maxH && d < bestD) { best = p; bestD = d }
    }
    if (!best) {
      // body block: a fast ball hitting someone who is not trying to control it
      if (speed > 4) for (const p of this.players) {
        if (b.lastTouch === p.id && this.t - (this.pass?.t ?? -9) < 0.3) continue
        if (p.meta.noBlock) continue // demonstration mannequins
        const d = dist2(p.pos, bp)
        if (d < BODY_R + BALL_R && b.pos.z < p.height * 0.75) {
          const n = norm2(sub2(bp, p.pos))
          const vn = b.vel.x * n.x + b.vel.y * n.y
          if (vn < 0) { b.vel.x = (b.vel.x - 2 * vn * n.x) * 0.4; b.vel.y = (b.vel.y - 2 * vn * n.y) * 0.4 }
          b.lastTouch = p.id; b.lastTouchTeam = p.team
          if (this.pass && p.team !== this.pass.team && p.team !== 'n') {
            this.emit({ type: 'pass_lost', t: this.t, from: this.pass.from, team: this.pass.team, by: p.id, reason: 'blocked', start: this.pass.start, end: bp })
            if (this.pass.team !== 'n') this.lossTime[this.pass.team] = this.t
            this.pass = null
          }
          break
        }
      }
      // a pass that dies with nobody around is lost when an opponent gets it; handled at control
      return
    }
    const p = best
    if (!p.wantsBall && speed > 2.5 && !p.gk) return
    // can he control it? fast balls and high balls are harder
    const limit = (p.gk ? 34 : 15 + p.skill * 9) - (b.pos.z > 0.6 ? 5 : 0)
    if (speed > limit) {
      // heavy contact: the ball deflects off him
      const ang = Math.atan2(b.vel.y, b.vel.x) + Math.PI + this.rng.gauss() * 0.9
      b.vel = { x: Math.cos(ang) * speed * 0.3, y: Math.sin(ang) * speed * 0.3, z: Math.max(0, b.vel.z * 0.3) }
      b.lastTouch = p.id; b.lastTouchTeam = p.team
      this.emit({ type: 'touch', t: this.t, by: p.id })
      if (p.gk && this.pass?.kind === 'shot') this.emit({ type: 'save', t: this.t, by: p.id })
      return
    }
    if (p.gk && this.pass?.kind === 'shot' && p.team !== this.pass.team) this.emit({ type: 'save', t: this.t, by: p.id })
    this.takeControl(p, speed > limit * 0.75)
  }

  /** p controls the ball: possession, pass outcome, first touch. */
  takeControl(p: Player, heavy: boolean) {
    const b = this.ball
    const inc = { ...b.vel }
    const incSpeed = Math.hypot(inc.x, inc.y)
    const prevOwnerTeam = this.possTeam
    const passer = this.pass ? this.get(this.pass.from) ?? null : null
    const passStart = this.pass?.start ?? null
    const passTeam = this.pass?.team ?? null
    // first touch: oriented control if the player has a direction in mind, otherwise cushion it
    if (p.touchDir && len2(p.touchDir) > 0.1) {
      const dir = norm2(p.touchDir)
      const s = clamp(incSpeed * 0.22 + 1.2, 1.4, 3.6)
      b.vel = { x: dir.x * s, y: dir.y * s, z: 0 }
    } else {
      b.vel = { x: inc.x * 0.08, y: inc.y * 0.08, z: 0 }
    }
    if (heavy) { b.vel.x += (this.rng.next() - 0.5) * 2.2; b.vel.y += (this.rng.next() - 0.5) * 2.2 }
    b.pos.z = BALL_R
    b.owner = p.id
    b.lastTouch = p.id
    b.lastTouchTeam = p.team
    b.inFlight = false
    for (const q of this.players) if (q !== p) q.touches = 0
    p.touches = 1
    p.anim = p.gk ? 'catch' : 'receive'; p.animT = 0
    if (p.gk) { b.vel = { x: 0, y: 0, z: 0 } }
    const side: 'a' | 'b' | null = p.team === 'n' ? prevOwnerTeam : p.team
    // pass outcome
    if (this.pass && passer && passer.id !== p.id && (this.pass.kind === 'pass' || this.pass.kind === 'lofted' || this.pass.kind === 'clear')) {
      // neutrals play for the side in possession; a neutral's pass before anyone had it is anyone's
      const sameSide = passer.team === 'n'
        ? p.team === 'n' || passTeam === 'n' || passTeam === null || p.team === passTeam
        : p.team === 'n' ? true : p.team === passer.team
      if (sameSide) this.emit({ type: 'pass_complete', t: this.t, from: passer.id, to: p.id, team: (passTeam ?? passer.team) as Team, start: passStart!, end: this.ball2() })
      else {
        this.emit({ type: 'pass_lost', t: this.t, from: passer.id, team: (passTeam ?? passer.team) as Team, by: p.id, reason: 'intercepted', start: passStart!, end: this.ball2() })
        if (passTeam === 'a' || passTeam === 'b') this.lossTime[passTeam] = this.t
      }
    } else if (prevOwnerTeam && side && side !== prevOwnerTeam && !this.pass) {
      // a loose ball after a heavy touch or a tackle: a loss for the other side if not already counted
      if (this.t - this.lossTime[prevOwnerTeam] > 0.6) this.registerLoss(prevOwnerTeam, b.lastTouch || '', 'control')
    }
    this.pass = null
    this.emit({ type: 'control', t: this.t, by: p.id, team: p.team, at: this.ball2(), passer: passer?.id ?? null, passerTeam: passer?.team ?? null, heavy, start: passStart })
    // possession change
    if (side && side !== prevOwnerTeam) {
      this.possTeam = side
      if (prevOwnerTeam) this.emit({ type: 'regain', t: this.t, team: side, by: p.id, within5: this.t - this.lossTime[side] <= 5, at: this.ball2() })
    } else if (side) this.possTeam = side
  }
}
