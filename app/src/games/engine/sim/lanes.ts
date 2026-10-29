// Passing-lane geometry. For a pass from the ball to a target, compare the ball's arrival time at
// every point of its path with the earliest time each opponent can get there. A positive margin
// means the lane is open. This drives the AI's choices and the explanations given to the player.
import { firmArrive, groundPassSpeed, rollTimeTo } from './ball'
import { clamp, dist2, dot2, norm2, pointSegment, sub2, type V2 } from './math'
import { attackTarget, inBox, inFinalThird, type PitchGeom } from './pitch'
import type { Player } from './types'
import type { World } from './world'

export interface PassOption {
  receiver: Player | null
  target: V2
  distance: number
  v0: number
  time: number
  /** seconds: min over the path of (opponent arrival - ball arrival). Positive = safe. */
  margin: number
  interceptor: Player | null
  /** metres of free space the receiver should have when the ball arrives */
  space: number
  /** metres gained towards the opponent goal */
  progress: number
  /** opponent lines (2 players or more) the ball goes beyond */
  linesBroken: number
  finalThird: boolean
  box: boolean
  /** ball changes side of the pitch (more than a third of the width) */
  switchesSide: boolean
  /** players the receiver will have in front of him (opponents goal-side of the target) */
  risk: 'open' | 'tight' | 'closed'
  score: number
  reasons: string[]
}

export interface Line { x: number; players: Player[]; minY: number; maxY: number }

/** Time for player d to reach point p (reaction + acceleration + top speed, minus reach). */
export function timeToReach(d: Player, p: V2, reaction: number, reach = 0.75) {
  const dist = Math.max(0, dist2(d.pos, p) - reach)
  if (dist <= 0) return reaction * 0.5
  const dir = norm2(sub2(p, d.pos))
  const v0 = Math.max(0, dot2(d.vel, dir))
  const v = d.maxSpeed, a = d.accel
  const tAcc = Math.max(0, (v - v0) / a)
  const dAcc = v0 * tAcc + 0.5 * a * tAcc * tAcc
  const t = dist <= dAcc ? (-v0 + Math.sqrt(v0 * v0 + 2 * a * dist)) / a : tAcc + (dist - dAcc) / v
  return reaction + t
}

/** Group opponents (keepers excluded) into lines across the pitch, ordered along the attack. */
export function defensiveLines(opps: Player[], team: 'a' | 'b'): Line[] {
  const field = opps.filter((p) => !p.gk).slice().sort((p, q) => (team === 'a' ? p.pos.x - q.pos.x : q.pos.x - p.pos.x))
  const lines: Line[] = []
  for (const p of field) {
    const last = lines[lines.length - 1]
    if (last && Math.abs(p.pos.x - last.x) < 3.2) {
      last.players.push(p)
      last.x = last.players.reduce((s, q) => s + q.pos.x, 0) / last.players.length
      last.minY = Math.min(last.minY, p.pos.y); last.maxY = Math.max(last.maxY, p.pos.y)
    } else lines.push({ x: p.pos.x, players: [p], minY: p.pos.y, maxY: p.pos.y })
  }
  return lines.filter((l) => l.players.length >= 2)
}

/** How many lines of two or more opponents does the ball go beyond between a and b? */
export function linesBetween(lines: Line[], a: V2, b: V2, team: 'a' | 'b') {
  let n = 0
  for (const l of lines) {
    const before = team === 'a' ? a.x < l.x - 0.3 : a.x > l.x + 0.3
    const beyond = team === 'a' ? b.x > l.x + 0.4 : b.x < l.x - 0.4
    if (before && beyond) n++
  }
  return n
}

export interface AnalyseOpts {
  /** ground pass arrival speed (m/s) */
  arrive?: number
  /** reaction time the opponents get (defaults to the world difficulty) */
  reaction?: number
  intention?: 'respirer' | 'progresser' | 'fixer' | 'finir' | 'sortir' | 'reprendre' | 'regarder-devant'
}

/** Analyse one pass from the ball's current position to a target. */
export function analysePass(w: World, passer: Player, target: V2, receiver: Player | null, opts: AnalyseOpts = {}): PassOption {
  const from = w.ball2()
  const side = (w.sideOf(passer) ?? 'a') as 'a' | 'b'
  const opps = w.opponents(passer)
  const reaction = opts.reaction ?? w.diff.reaction
  const d = dist2(from, target)
  const arrive = opts.arrive ?? firmArrive(d)
  const v0 = groundPassSpeed(d, arrive, w.pitch.surface)
  const time = rollTimeTo(v0, d, w.pitch.surface)
  // sample the path
  let margin = 9, interceptor: Player | null = null
  const steps = Math.max(2, Math.ceil(d / 0.5))
  for (let i = 1; i <= steps; i++) {
    const s = (i / steps) * d
    if (s < 0.9) continue
    const pt = { x: from.x + ((target.x - from.x) * s) / d, y: from.y + ((target.y - from.y) * s) / d }
    const tb = rollTimeTo(v0, s, w.pitch.surface)
    for (const o of opps) {
      // the last metre belongs to the receiver: there it's a duel, measured by `space`
      if (receiver && s > d - 0.6) continue
      const td = timeToReach(o, pt, reaction, o.gk ? 1.1 : 0.75)
      const m = td - tb
      if (m < margin) { margin = m; interceptor = o }
    }
  }
  // space on arrival: how far the nearest opponent still is when the ball gets there
  let space = 30
  for (const o of opps) {
    const left = dist2(o.pos, target) - o.maxSpeed * Math.max(0, time - reaction) * 0.75
    space = Math.min(space, Math.max(0, left))
  }
  const goal = attackTarget(w.pitch, side)
  const progress = dist2(from, goal) - dist2(target, goal)
  const lines = defensiveLines(opps, side)
  const linesBroken = linesBetween(lines, from, target, side)
  const finalThird = inFinalThird(w.pitch, target, side) && !inFinalThird(w.pitch, from, side)
  const box = inBox(w.pitch, target, side)
  const switchesSide = Math.abs(target.y - from.y) > w.pitch.h / 3
  const risk: PassOption['risk'] = margin > 0.35 ? 'open' : margin > 0 ? 'tight' : 'closed'
  const reasons: string[] = []
  reasons.push(risk === 'open' ? 'lane_open' : risk === 'tight' ? 'lane_tight' : 'lane_closed')
  if (linesBroken > 0) reasons.push('breaks_line')
  if (progress >= 10) reasons.push('progress')
  else if (progress < -3) reasons.push('backwards')
  if (space >= 4) reasons.push('space')
  else if (space < 1.5) reasons.push('pressed_on_arrival')
  if (finalThird) reasons.push('final_third')
  if (box) reasons.push('box')
  if (switchesSide) reasons.push('switch')
  const score = scoreOption({ margin, progress, linesBroken, space, finalThird, box, switchesSide, distance: d }, opts.intention)
  return { receiver, target, distance: d, v0, time, margin, interceptor, space, progress, linesBroken, finalThird, box, switchesSide, risk, score, reasons }
}

/** Utility of a pass: safety times value, tuned by the intention of the moment (book chapter 5). */
export function scoreOption(o: { margin: number; progress: number; linesBroken: number; space: number; finalThird: boolean; box: boolean; switchesSide: boolean; distance: number }, intention?: AnalyseOpts['intention']) {
  const safety = 1 / (1 + Math.exp(-o.margin / 0.12))
  const safeW = intention === 'respirer' || intention === 'sortir' ? 1.6 : intention === 'finir' ? 0.8 : 1
  const progW = intention === 'progresser' || intention === 'regarder-devant' ? 1.5 : intention === 'respirer' ? 0.5 : 1
  const value =
    0.35 +
    progW * clamp(o.progress, -10, 30) * 0.022 +
    progW * o.linesBroken * 0.38 +
    clamp(o.space, 0, 8) * 0.045 +
    (o.finalThird ? 0.25 : 0) + (o.box ? (intention === 'finir' ? 0.8 : 0.45) : 0) +
    (o.switchesSide && intention === 'fixer' ? 0.35 : 0) -
    (o.distance > 35 ? 0.15 : 0)
  return Math.pow(safety, safeW) * Math.max(0.05, value)
}

/** All teammate options for the ball carrier, best first. */
export function passOptions(w: World, passer: Player, opts: AnalyseOpts = {}): PassOption[] {
  const out: PassOption[] = []
  for (const r of w.teammates(passer)) {
    if (r.gk && dist2(r.pos, passer.pos) > 40) continue
    const target = len(r.vel) > 1 ? w.leadPoint(passer, r, opts.arrive) : { ...r.pos }
    out.push(analysePass(w, passer, target, r, opts))
  }
  return out.sort((a, b) => b.score - a.score)
}
const len = (v: V2) => Math.hypot(v.x, v.y)

/** Is a player "between the lines" or free: distance to the closest opponent and to the passing lane. */
export function freedom(w: World, p: Player) {
  let nearest = 99
  for (const o of w.opponents(p)) nearest = Math.min(nearest, dist2(o.pos, p.pos))
  return nearest
}

/** Distance from each opponent to the segment ball -> target (who is in the lane). */
export function laneBlockers(w: World, passer: Player, target: V2, width = 1.4) {
  const from = w.ball2()
  return w.opponents(passer).filter((o) => {
    const r = pointSegment(o.pos, from, target)
    return r.d < width && r.t > 0.05 && r.t < 0.97
  })
}
