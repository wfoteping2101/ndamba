// Football AI. Decision (what to do) is separated from motion (the world steers players to their
// target). Brains run at 10 Hz. Difficulty changes reaction, anticipation and aggression, never speed.
import { rollTimeTo, predictGround, groundSpeed } from '../sim/ball'
import { clamp, dist2, dot2, fromAngle, len2, norm2, sub2, add2, scale2, type V2 } from '../sim/math'
import { attackTarget } from '../sim/pitch'
import { passOptions, timeToReach } from '../sim/lanes'
import type { Player } from '../sim/types'
import { TACKLE_R, type Brain, type World } from '../sim/world'

/* ---------------------------------------------------------------- helpers */

/** Where along the ball's current path can p get first? Returns the meeting point or null. */
export function meetPoint(w: World, p: Player, reaction = 0): V2 | null {
  const b = w.ball
  const sp = groundSpeed(b)
  if (sp < 0.4) return w.ball2()
  for (let t = 0.1; t < 4; t += 0.1) {
    const pt = predictGround(b, t, w.pitch.surface)
    if (pt.x < -1 || pt.x > w.pitch.w + 1 || pt.y < -1 || pt.y > w.pitch.h + 1) break
    if (timeToReach(p, pt, reaction, 0.55) <= t) return pt
  }
  return null
}

/** Is a ball in flight coming towards p (within a corridor)? */
export function ballComingTo(w: World, p: Player) {
  const b = w.ball
  const sp = groundSpeed(b)
  if (sp < 1.5) return false
  const dir = { x: b.vel.x / sp, y: b.vel.y / sp }
  const to = sub2(p.pos, w.ball2())
  const along = dot2(to, dir)
  if (along < 0) return false
  const across = Math.abs(to.x * dir.y - to.y * dir.x)
  return across < 2.2 + along * 0.06
}

/** Direction for an oriented first touch: towards goal if free, else away from the nearest opponent. */
export function orientedTouch(w: World, p: Player): V2 {
  const side = w.sideOf(p) ?? 'a'
  const goal = attackTarget(w.pitch, side)
  let nearest: Player | null = null, nd = 99
  for (const o of w.opponents(p)) { const d = dist2(o.pos, p.pos); if (d < nd) { nd = d; nearest = o } }
  const toGoal = norm2(sub2(goal, p.pos))
  if (!nearest || nd > 5) return toGoal
  const away = norm2(sub2(p.pos, nearest.pos))
  return norm2(add2(scale2(away, 1.2), scale2(toGoal, 0.6)))
}

const inArea = (w: World, pt: V2, m = 0.8): V2 => ({ x: clamp(pt.x, m, w.pitch.w - m), y: clamp(pt.y, m, w.pitch.h - m) })
const home = (p: Player): V2 => (p.meta.home as V2) || p.pos

/* ---------------------------------------------------------------- brains */

/** Stand still, look at the ball (neutrals on the side lines, cones). */
export class HoldBrain implements Brain {
  constructor(private spot?: V2) {}
  think(w: World, me: Player) {
    if (receiveIfComing(w, me)) return
    me.target = this.spot ? { ...this.spot } : { ...home(me) }
    me.speedMode = 0.5
    me.faceTarget = w.ball2()
    me.wantsBall = true
  }
}

/** Go and meet a pass aimed at me; returns true when receiving. */
function receiveIfComing(w: World, me: Player) {
  const pass = w.pass
  const mine = pass && pass.receiver === me.id && pass.team !== null
  if ((mine || (w.ball.owner === null && ballComingTo(w, me) && sameSideAsBall(w, me))) && !w.dead) {
    const mp = meetPoint(w, me, 0.05) ?? w.ball2()
    me.target = mp
    me.speedMode = 1
    me.faceTarget = w.ball2()
    me.wantsBall = true
    me.touchDir = (me.meta.touchDir as V2) ?? orientedTouch(w, me)
    return true
  }
  return false
}
function sameSideAsBall(w: World, me: Player) {
  const lt = w.ball.lastTouchTeam
  return lt === null || lt === me.team || me.team === 'n' || lt === 'n'
}

/** Scripted movement: timed waypoints (drill arrows), then hand over to another brain. */
export interface Waypoint { at: number; to: V2; speed?: number }
export class ScriptBrain implements Brain {
  private i = 0
  constructor(private path: Waypoint[], private then: Brain, private t0 = 0) {}
  think(w: World, me: Player) {
    if (receiveIfComing(w, me)) return
    const t = w.t - this.t0
    while (this.i < this.path.length - 1 && t >= this.path[this.i + 1].at) this.i++
    const wp = this.path[this.i]
    if (!wp || t < wp.at) { me.faceTarget = w.ball2(); return }
    if (this.i >= this.path.length - 1 && dist2(me.pos, wp.to) < 0.5) { this.then.think(w, me); return }
    me.target = { ...wp.to }
    me.speedMode = wp.speed ?? 0.8
    me.faceTarget = w.ball2()
  }
}

/** Attacker without the ball: offers a passing angle in space, keeps the shape. */
export class SupportBrain implements Brain {
  constructor(private opts: { roam?: number; minGap?: number } = {}) {}
  think(w: World, me: Player) {
    me.wantsBall = true
    if (receiveIfComing(w, me)) return
    me.touchDir = null
    const carrier = w.owner()
    const h = home(me)
    const roam = this.opts.roam ?? 6
    if (!carrier || w.sideOf(carrier) !== w.sideOf(me)) {
      me.target = { ...h }; me.speedMode = 0.6; me.faceTarget = w.ball2(); return
    }
    // sample candidate spots around home, score them: open lane from the ball, distance from
    // opponents, no teammate on the same spot, forward value
    const side = w.sideOf(me) ?? 'a'
    const goal = attackTarget(w.pitch, side)
    let best = h, bestScore = -1e9
    const opps = w.opponents(me)
    const mates = w.teammates(me)
    for (let i = 0; i < 14; i++) {
      const ang = (i / 14) * Math.PI * 2
      const r = i % 2 ? roam : roam * 0.5
      const pt = inArea(w, i === 0 ? h : add2(h, fromAngle(ang, r)))
      let free = 99
      for (const o of opps) free = Math.min(free, dist2(o.pos, pt))
      let crowd = 0
      for (const m of mates) if (m !== carrier && dist2(m.pos, pt) < (this.opts.minGap ?? 5)) crowd++
      // lane openness from the ball: distance of opponents to the segment
      let lane = 9
      const bp = w.ball2()
      for (const o of opps) {
        const ab = sub2(pt, bp), ao = sub2(o.pos, bp)
        const L = len2(ab) || 1
        const t = clamp(dot2(ao, ab) / (L * L), 0, 1)
        const c = add2(bp, scale2(ab, t))
        lane = Math.min(lane, dist2(c, o.pos))
      }
      const dBall = dist2(pt, bp)
      const fwd = dist2(bp, goal) - dist2(pt, goal)
      const score = Math.min(free, 6) * 0.6 + Math.min(lane, 3) * 1.1 + fwd * 0.05 - crowd * 2.5 - Math.abs(dBall - 10) * 0.08 - dist2(pt, me.pos) * 0.05
      if (score > bestScore) { bestScore = score; best = pt }
    }
    me.target = best
    me.speedMode = 0.75
    me.faceTarget = w.ball2()
  }
}

/** Ball carrier (AI): shoot, pass by utility, or carry into space. Respects a touches limit. */
export class CarrierBrain implements Brain {
  constructor(private fallback: Brain, private opts: { maxTouches?: number; intention?: 'respirer' | 'progresser' | 'fixer' | 'finir'; patience?: number; canShoot?: boolean } = {}) {}
  think(w: World, me: Player) {
    if (w.ball.owner !== me.id) { this.fallback.think(w, me); return }
    if (me.pending) return
    const side = w.sideOf(me) ?? 'a'
    const goal = w.pitch.goalFor[side]
    // shoot when close and facing the goal
    if (goal && this.opts.canShoot !== false) {
      const d = dist2(me.pos, goal)
      if (d < (goal.mini ? 12 : 20)) {
        const aimY = goal.y + (w.rng.next() - 0.5) * goal.width * 0.7
        w.requestShot(me, { x: goal.x, y: aimY }, goal.mini ? 0.25 : 0.6 + w.rng.next() * 1.2, goal.mini ? 13 : 21)
        return
      }
    }
    const opts = passOptions(w, me, { intention: this.opts.intention })
    const best = opts[0]
    const noise = w.diff.noise * (w.rng.next() - 0.5)
    const pressure = w.pressureOn(me)
    const touchesLeft = (this.opts.maxTouches ?? 99) - me.touches
    const held = (me.meta.heldFor as number) ?? 0
    const shouldPass = best && (best.score + noise > 0.32 || pressure > 0.6 || touchesLeft <= 1 || held > (this.opts.patience ?? 1.6))
    if (best && shouldPass && best.margin > -0.15) {
      w.requestPass(me, best.target, { receiver: best.receiver?.id ?? null, arrive: 5.5 })
      me.meta.heldFor = 0
      return
    }
    // carry: towards goal, away from pressure
    me.meta.heldFor = held + 0.1
    const dir = orientedTouch(w, me)
    me.target = inArea(w, add2(me.pos, scale2(dir, 3)), 1)
    me.speedMode = pressure > 0.4 ? 0.65 : 0.8
    me.faceTarget = null
  }
}

/** Defender: utility between pressing the carrier, cutting a lane, marking, holding the zone, intercepting. */
export class DefenderBrain implements Brain {
  constructor(private opts: { passive?: boolean; zone?: number; shift?: number; pressDistance?: number } = {}) {}
  think(w: World, me: Player) {
    const d = w.diff
    me.touchDir = null
    me.wantsBall = !this.opts.passive
    const bp = w.ball2()
    const mates = w.players.filter((q) => q.team === me.team && !q.gk)
    // rank by time to the ball: the first presses, the second covers
    const ranked = mates.slice().sort((p, q) => timeToReach(p, bp, 0) - timeToReach(q, bp, 0))
    const rank = ranked.indexOf(me)
    const carrier = w.owner()
    const theyHaveIt = carrier && w.sideOf(carrier) !== me.team && carrier.team !== me.team

    // 1. a pass is travelling: can I cut it out?
    if (!this.opts.passive && w.pass && w.pass.team !== me.team && groundSpeed(w.ball) > 1.5) {
      const mp = meetPoint(w, me, d.reaction * (1 - d.anticipation * 0.5))
      if (mp && (rank <= 1 || dist2(mp, me.pos) < 6) && w.rng.next() < d.intercept + 0.15) {
        me.target = mp; me.speedMode = 1; me.faceTarget = bp; return
      }
    }
    // 2. loose ball: the nearest two chase it
    if (!w.ball.owner && !w.pass) {
      if (rank <= 1) { me.target = bp; me.speedMode = 1; me.faceTarget = bp; return }
    }
    if (theyHaveIt && carrier) {
      const opts = passOptions(w, carrier, { reaction: d.reaction })
      const danger = opts[0]?.receiver ?? null
      if (rank === 0) {
        // press with a cover shadow: approach on the line between the carrier and his best option
        const shadowFrom = danger && d.anticipation > 0.3 ? norm2(sub2(danger.pos, carrier.pos)) : norm2(sub2(attackTarget(w.pitch, me.team === 'a' ? 'b' : 'a'), carrier.pos))
        const stand = this.opts.passive ? 2.2 : 0.9
        me.target = inArea(w, add2(carrier.pos, scale2(shadowFrom, stand)), 0.3)
        me.speedMode = this.opts.passive ? 0.45 : clamp(d.press + 0.15, 0.4, 1)
        me.faceTarget = bp
        const exposed = dist2(w.foot(carrier), bp) > 0.55
        if (!this.opts.passive && dist2(w.foot(me), bp) < TACKLE_R && me.cooldown <= 0 && (exposed || w.rng.next() < d.press * 0.35)) w.requestTackle(me)
        return
      }
      if (rank === 1 && danger && !this.opts.passive) {
        // cut the most dangerous lane: stand on it, nearer the receiver
        const onLane = add2(danger.pos, scale2(sub2(carrier.pos, danger.pos), 0.32))
        me.target = inArea(w, onLane, 0.3)
        me.speedMode = 0.85
        me.faceTarget = bp
        return
      }
      // mark the nearest attacker in my zone, goal side
      const h = home(me)
      const shift = this.opts.shift ?? 0.35
      const zone = add2(h, scale2(sub2(bp, h), shift))
      const attackers = w.players.filter((q) => q !== carrier && (q.team === carrier.team || q.team === 'n'))
      let mark: Player | null = null, md = this.opts.zone ?? 9
      for (const q of attackers) { const dd = dist2(q.pos, zone); if (dd < md) { md = dd; mark = q } }
      if (mark) {
        const ownGoal = attackTarget(w.pitch, carrier.team === 'n' ? (w.possTeam ?? 'a') : (carrier.team as 'a' | 'b'))
        const goalSide = add2(mark.pos, scale2(norm2(sub2(ownGoal, mark.pos)), 1.4))
        me.target = inArea(w, add2(scale2(goalSide, 0.7), scale2(zone, 0.3)), 0.3)
      } else me.target = inArea(w, zone, 0.3)
      me.speedMode = 0.7
      me.faceTarget = bp
      return
    }
    // our ball or nothing to do: hold the zone
    const h = home(me)
    me.target = inArea(w, add2(h, scale2(sub2(bp, h), this.opts.shift ?? 0.3)), 0.3)
    me.speedMode = 0.55
    me.faceTarget = bp
  }
}

/** Goalkeeper: angle positioning, dives on shots, catches; distributes like a carrier. */
export class KeeperBrain implements Brain {
  private carrier: CarrierBrain
  constructor() { this.carrier = new CarrierBrain(new HoldBrain(), { intention: 'respirer', canShoot: false, patience: 1.2 }) }
  think(w: World, me: Player) {
    me.wantsBall = true
    if (w.ball.owner === me.id) { this.carrier.think(w, me); return }
    const side = me.team === 'n' ? 'a' : (me.team as 'a' | 'b')
    const own = w.pitch.goalFor[side === 'a' ? 'b' : 'a']
    if (!own) { me.target = { ...home(me) }; return }
    const bp = w.ball2()
    // shot coming: dive to where it crosses the goal line
    const b = w.ball
    const sp = Math.hypot(b.vel.x, b.vel.y)
    if (sp > 8 && w.pass?.kind === 'shot' && Math.sign(b.vel.x) === -own.facing) {
      const t = (own.x - b.pos.x) / (b.vel.x || 1e-6)
      if (t > 0 && t < 2) {
        const yCross = b.pos.y + b.vel.y * t
        me.target = { x: own.x + own.facing * 0.6, y: clamp(yCross, own.y - own.width / 2 - 0.5, own.y + own.width / 2 + 0.5) }
        me.speedMode = 1
        if (Math.abs(yCross - me.pos.y) > 0.9 && me.anim !== 'dive') { me.anim = 'dive'; me.animT = 0 }
        me.faceTarget = bp
        return
      }
    }
    // loose ball near goal: come and get it
    if (!w.ball.owner && dist2(bp, own) < 9 && groundSpeed(b) < 6) { me.target = bp; me.speedMode = 1; me.faceTarget = bp; return }
    // stand on the bisector, off the line by up to 5 m depending on the ball distance
    const toBall = sub2(bp, own)
    const dist = len2(toBall)
    const depth = clamp(dist * 0.12, 0.6, own.mini ? 0.8 : 5)
    me.target = add2(own, scale2(norm2(toBall), depth))
    me.speedMode = 0.7
    me.faceTarget = bp
  }
}

/** Switches brain by phase: with the ball, my side has it, the other side has it. */
export class PhaseBrain implements Brain {
  constructor(private withBall: Brain, private attacking: Brain, private defending: Brain) {}
  think(w: World, me: Player) {
    if (w.ball.owner === me.id) return this.withBall.think(w, me)
    const side = w.sideOf(me)
    if (me.team === 'n' || side === w.possTeam) return this.attacking.think(w, me)
    return this.defending.think(w, me)
  }
}

export { rollTimeTo }
