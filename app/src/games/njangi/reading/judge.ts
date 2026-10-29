// Lecture du jeu: reading a frozen situation with the book's five intentions (Le Code Njangi,
// chapter 5) and judging the player's answer by geometry, never by taste.
//
// The entry triggers come from chapter 5:
//   Sortir      ball with the keeper or the back line and the opponent presses; done when the free
//               man receives beyond the first line.
//   Progresser  a partner can receive facing play with space, free between the lines, or depth opens.
//   Fixer       the line ahead is closed, the block has slid, a partner is isolated on the far side.
//   Finir       the ball is in the last third with an advantage, a partner receives at the box edge.
//   Respirer    no risk in our half: keep the ball with the safest pass, make them run.
// "On ne juge pas la direction du ballon. On juge son intention." A sideways pass is right when it
// serves Fixer or Respirer; a forward pass into a closed line is the most dangerous loss of all.
import { analysePass, defensiveLines, passOptions, type PassOption } from '../../engine/sim/lanes'
import { dist2, type V2 } from '../../engine/sim/math'
import { inBox } from '../../engine/sim/pitch'
import type { Player } from '../../engine/sim/types'
import type { World } from '../../engine/sim/world'

export type Intention = 'sortir' | 'progresser' | 'fixer' | 'finir' | 'respirer'
export const INTENTIONS: Intention[] = ['sortir', 'progresser', 'fixer', 'finir', 'respirer']

export interface ShotRead { dist: number; angle: number; open: boolean }

export interface Reading {
  carrier: string
  /** where the ball is along the attack: 0 = our goal line, 1 = theirs */
  depth: number
  pressure: number
  pressers: number
  options: PassOption[]
  shot: ShotRead | null
  valid: Intention[]
  best: Intention
  /** the receiver (or 'shot') that best serves the best intention */
  bestAnswer: string | null
}

export interface Answer { intention: Intention; receiver: string | 'shot' }

export interface Verdict {
  points: number
  max: number
  intentionOk: boolean
  intentionBest: boolean
  serves: boolean
  laneOpen: boolean
  /** i18n keys under lecture.notes, with their values */
  notes: { key: string; params?: Record<string, string | number> }[]
  option: PassOption | null
}

const PROG_OK = (o: PassOption) => o.margin > 0.35 && o.space >= 1.5 && (o.linesBroken >= 1 || o.progress >= 10)

function shotRead(w: World, c: Player): ShotRead | null {
  const goal = w.pitch.goalFor.a
  if (!goal) return null
  const dist = dist2(c.pos, goal)
  // the angle the goal mouth offers from the ball
  const a1 = Math.atan2(goal.y - goal.width / 2 - c.pos.y, goal.x - c.pos.x)
  const a2 = Math.atan2(goal.y + goal.width / 2 - c.pos.y, goal.x - c.pos.x)
  const angle = Math.abs(a2 - a1) * 180 / Math.PI
  // a defender standing on the line to the goal centre blocks it
  let blocked = false
  for (const o of w.opponents(c)) {
    if (o.gk) continue
    const t = ((o.pos.x - c.pos.x) * (goal.x - c.pos.x) + (o.pos.y - c.pos.y) * (goal.y - c.pos.y)) / Math.max(1, dist * dist)
    if (t <= 0 || t >= 1) continue
    const px = c.pos.x + (goal.x - c.pos.x) * t, py = c.pos.y + (goal.y - c.pos.y) * t
    if (Math.hypot(o.pos.x - px, o.pos.y - py) < 1.1) blocked = true
  }
  const range = goal.mini ? 12 : 20
  return { dist, angle, open: dist < range && angle > (goal.mini ? 6 : 11) && !blocked }
}

/** What the situation offers, read with the book's triggers. */
export function readSituation(w: World, c: Player): Reading {
  const opps = w.opponents(c)
  const depth = Math.max(0, Math.min(1, c.pos.x / w.pitch.w))
  const pressure = w.pressureOn(c)
  const pressers = opps.filter((o) => !o.gk && dist2(o.pos, c.pos) < 12).length
  const options = passOptions(w, c).filter((o) => o.receiver)
  const shot = shotRead(w, c)
  const lines = defensiveLines(opps, 'a')
  const valid: Intention[] = []

  const ownZone = depth < 0.36
  const lastZone = depth > 0.64
  // Sortir: in our zone and pressed
  if (ownZone && (pressers >= 2 || pressure > 0.4)) valid.push('sortir')
  // Progresser: a partner facing play with space beyond a line or well forward
  const prog = options.filter(PROG_OK)
  if (prog.length) valid.push('progresser')
  // Fixer: the way ahead is closed, or the block has slid and a far partner waits
  const ballTop = c.pos.y < w.pitch.h / 2
  const field = opps.filter((o) => !o.gk)
  const slid = field.length >= 3 && field.filter((o) => (o.pos.y < w.pitch.h / 2) === ballTop).length / field.length >= 0.6
  const farOpen = options.some((o) => o.switchesSide && o.margin > 0.2)
  const nextLineClosed = !prog.length && lines.some((l) => l.x > c.pos.x)
  if ((nextLineClosed || (slid && farOpen)) && options.some((o) => o.margin > 0.3)) valid.push('fixer')
  // Finir: last third with an advantage (an open shot, or a partner in the box or at its edge)
  const finishPass = options.some((o) => o.margin > 0.3 && (o.box || (w.pitch.goalFor.a && dist2(o.target, w.pitch.goalFor.a) < 20)))
  if ((lastZone || (shot && shot.dist < 22)) && ((shot && shot.open) || finishPass)) valid.push('finir')
  // Respirer: a safe ball exists, and we are not breathing in our own box under pressure
  const safe = options.some((o) => o.margin > 0.5)
  const ownBox = inBox(w.pitch, c.pos, 'b')
  if (safe && !(ownBox && pressure > 0.6)) valid.push('respirer')
  if (!valid.length) valid.push('respirer')

  const best: Intention = valid.includes('finir') ? 'finir'
    : valid.includes('sortir') ? 'sortir'
      : valid.includes('progresser') ? 'progresser'
        : valid.includes('fixer') ? 'fixer' : 'respirer'
  const r: Reading = { carrier: c.id, depth, pressure, pressers, options, shot, valid, best, bestAnswer: null }
  r.bestAnswer = bestAnswerFor(r, best)
  return r
}

/** Does this answer serve this intention? */
export function serves(r: Reading, intention: Intention, o: PassOption | null, shoot: boolean): boolean {
  if (shoot) return intention === 'finir' && !!r.shot?.open
  if (!o) return false
  switch (intention) {
    case 'sortir': return o.margin > 0.2 && (o.linesBroken >= 1 || (o.space >= 3 && o.progress > 0))
    case 'progresser': return o.progress >= 8 || o.linesBroken >= 1
    case 'fixer': return (o.switchesSide && o.margin > 0.2) || (o.distance < 14 && o.margin > 0.3 && o.progress > -6)
    case 'finir': return o.box || o.finalThird || o.progress >= 6
    case 'respirer': return o.margin > 0.5 && o.space >= 2
  }
}

function bestAnswerFor(r: Reading, intention: Intention): string | null {
  if (intention === 'finir' && r.shot?.open) return 'shot'
  const fit = r.options.filter((o) => serves(r, intention, o, false) && o.margin > 0)
  const rank = (o: PassOption) => (intention === 'respirer' ? o.margin + o.space * 0.1 : o.score)
  fit.sort((a, b) => rank(b) - rank(a))
  return fit[0]?.receiver?.id ?? r.options.slice().sort((a, b) => b.margin - a.margin)[0]?.receiver?.id ?? null
}

export function judge(w: World, r: Reading, a: Answer): Verdict {
  const c = w.get(r.carrier)!
  const shoot = a.receiver === 'shot'
  let o: PassOption | null = null
  if (!shoot) {
    const rec = w.get(a.receiver)
    o = r.options.find((x) => x.receiver?.id === a.receiver) ?? (rec ? analysePass(w, c, rec.pos, rec) : null)
  }
  const intentionOk = r.valid.includes(a.intention)
  const intentionBest = a.intention === r.best
  const sv = serves(r, a.intention, o, shoot)
  const laneOpen = shoot ? !!r.shot?.open : !!o && o.margin > 0
  const notes: Verdict['notes'] = []
  const label = (p: Player | null | undefined) => p ? (p.label ?? p.id.toUpperCase()) : ''
  if (!intentionOk) notes.push({ key: `notValid.${a.intention}` })
  else if (!intentionBest) notes.push({ key: 'betterIntention', params: { best: r.best } })
  if (shoot && !r.shot?.open) notes.push({ key: r.shot && r.shot.dist >= 20 ? 'shotFar' : 'shotBlocked' })
  if (o) {
    if (o.margin <= 0) notes.push({ key: 'laneClosed', params: { who: label(o.interceptor) } })
    else if (o.margin < 0.35) notes.push({ key: 'laneTight' })
    if (o.space < 1.5) notes.push({ key: 'pressedOnArrival' })
    if (o.linesBroken >= 1 && o.margin > 0) notes.push({ key: 'lineCrossed', params: { n: o.linesBroken } })
    if (a.intention === 'progresser' && o.margin <= 0 && o.progress > 5) notes.push({ key: 'forcedLine' })
    if (o.progress < -3 && (a.intention === 'respirer' || a.intention === 'fixer') && sv) notes.push({ key: 'sidewaysGood' })
  }
  if (!sv) notes.push({ key: `notServing.${a.intention}` })
  const points = (intentionOk ? 1 : 0) + (intentionBest ? 1 : 0) + (sv ? 1 : 0) + (laneOpen ? 1 : 0)
  return { points, max: 4, intentionOk, intentionBest, serves: sv, laneOpen, notes, option: o }
}

/** Points of the next line of opponents, for drawing it across the pitch. */
export function linesAhead(w: World, c: Player): { x: number; minY: number; maxY: number }[] {
  return defensiveLines(w.opponents(c), 'a').filter((l) => l.x > c.pos.x - 2).map((l) => ({ x: l.x, minY: l.minY, maxY: l.maxY }))
}
export type { V2 }
