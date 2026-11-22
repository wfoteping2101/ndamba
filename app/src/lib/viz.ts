// Visualisations of coded matches: every number here comes from actions coded by a person (on the video
// or live), and every position from a tap on the mini pitch. Nothing is tracked: no distance, no speed.
// Pure module (no database, no DOM): the report tabs, the season studio and the Node test use it.
//
// Frame: positions are percent of the pitch seen from our attack, x from our goal line (0) to theirs (100),
// y from our left touchline (0) to our right (100). Opponent actions use the same frame.
//
// Formulas worth knowing:
//   possession share (passes) = our PASSES / (our PASSES + their PASSES), when their passes are coded
//   possession share (time)   = our coded sequence time / (ours + theirs), estimated from the codes when
//                               their passes are not coded: a sequence of ours runs from a regain (or our first
//                               action) to its end (PASS_LOST, LOSS, SHOT); the time between belongs to them.
//   field tilt                = our placed actions in their third / (ours there + theirs in our third),
//                               or our FINAL3 / (our FINAL3 + their FINAL3) when only codes are available
//   momentum (per minute)     = rolling 5 minutes of danger: FINAL3 1, BOX 2, SHOT 3, SHOT_IN +1, GOAL +2,
//                               ours minus theirs
//   Indice by block           = the Indice Njangi computed from the summed counts of each 15-minute block
import { countEvents, njangiFromCounts, sumCounts, type NjangiResult } from './njangi.ts'
import type { EventCode, Match, MatchEvent } from './types'

export type Side = 'us' | 'them'
export type HalfFilter = 'all' | 1 | 2
export type Half = 1 | 2 | 3 | 4
export interface Pt { x: number; y: number }
export type Placed = MatchEvent & Pt

/* ------------------------------------------------------------------ pitch geometry */

/** A pitch of 105 by 68 metres: the percent frame converted to metres for distances and kernels. */
export const PITCH = { L: 105, W: 68 }
/** Penalty area: 16.5 m deep, 40.32 m wide (percent of the pitch). */
export const BOX = { depth: (16.5 / 105) * 100, y0: 50 - (20.16 / 68) * 100, y1: 50 + (20.16 / 68) * 100 }
export const SIX = { depth: (5.5 / 105) * 100, y0: 50 - (9.16 / 68) * 100, y1: 50 + (9.16 / 68) * 100 }

export const SET_PIECES: EventCode[] = ['CORNER', 'FREEKICK', 'PENALTY', 'THROWIN', 'GOALKICK']
/** Actions with the ball (where the ball is when we have it). */
export const ON_BALL: EventCode[] = ['PASS_OK', 'PASS_LOST', 'PROG', 'LINE', 'FINAL3', 'BOX', 'FIX2', 'SWITCH', 'LOSS', 'SHOT', 'SHOT_IN', 'GOAL', 'REGAIN', 'REGAIN5']
/** Actions that put the ball somewhere on the pitch, each counted once (SHOT_IN and GOAL only qualify a shot): heat maps and territory. */
export const BALL_ACTIONS: EventCode[] = ON_BALL.filter((c) => c !== 'SHOT_IN' && c !== 'GOAL')
const POSSESSION_END: EventCode[] = ['PASS_LOST', 'LOSS', 'SHOT']

export const isPlaced = (e: Partial<Pt>): e is Pt => typeof e.x === 'number' && typeof e.y === 'number' && Number.isFinite(e.x) && Number.isFinite(e.y)
/** 0 = our third, 1 = the middle, 2 = their third. */
export const thirdOf = (x: number): 0 | 1 | 2 => (x < 100 / 3 ? 0 : x < 200 / 3 ? 1 : 2)
/** 0 = our left, 1 = the centre, 2 = our right. */
export const laneOf = (y: number): 0 | 1 | 2 => (y < 100 / 3 ? 0 : y < 200 / 3 ? 1 : 2)
export const inTheirBox = (x: number, y: number) => x >= 100 - BOX.depth && y >= BOX.y0 && y <= BOX.y1
export const inOurBox = (x: number, y: number) => x <= BOX.depth && y >= BOX.y0 && y <= BOX.y1
/** Distance in metres from a point to the goal the side attacks. */
export function distToGoal(p: Pt, side: Side) {
  const gx = side === 'us' ? 100 : 0
  return Math.hypot(((p.x - gx) / 100) * PITCH.L, ((p.y - 50) / 100) * PITCH.W)
}

/* ------------------------------------------------------------------ time */

export const extraLength = (halfMinutes: number) => (halfMinutes >= 40 ? 15 : Math.max(5, Math.round(halfMinutes / 3)))
export function halfStart(half: Half, halfMinutes: number) {
  const et = extraLength(halfMinutes)
  return half === 1 ? 0 : half === 2 ? halfMinutes : half === 3 ? 2 * halfMinutes : 2 * halfMinutes + et
}
export const halfLen = (half: Half, halfMinutes: number) => (half <= 2 ? halfMinutes : extraLength(halfMinutes))
/** Match minute (decimal) of an event. */
export const matchMinute = (e: Pick<MatchEvent, 'half' | 't'>, halfMinutes: number) => halfStart(e.half, halfMinutes) + e.t / 60
/** The minute as a football reader writes it: 12', 45+2'. */
export function minuteText(e: Pick<MatchEvent, 'half' | 't'>, halfMinutes: number) {
  const len = halfLen(e.half, halfMinutes) * 60
  const off = halfStart(e.half, halfMinutes)
  if (e.t >= len) return `${off + halfLen(e.half, halfMinutes)}+${Math.max(1, Math.ceil((e.t - len + 1) / 60))}'`
  return `${off + Math.floor(e.t / 60) + 1}'`
}

/** Order of codes coded at the same second: a regain opens, passes run, a shot is qualified, a loss closes. */
const SAME_SECOND: Partial<Record<EventCode, number>> = { REGAIN: 0, REGAIN5: 0, PASS_OK: 1, PROG: 2, LINE: 2, FIX2: 2, SWITCH: 2, FINAL3: 3, BOX: 3, SHOT: 4, SHOT_IN: 5, GOAL: 6, PASS_LOST: 7, LOSS: 7 }
const rankOf = (e: object) => ('code' in e ? SAME_SECOND[(e as MatchEvent).code] ?? 3 : 3)
/** Events in match order; the same events always come out in the same order, whatever order the database gives. */
export function sortEvents<T extends Pick<MatchEvent, 'half' | 't'>>(events: readonly T[]): T[] {
  return events.map((e, i) => [e, i] as const).sort((a, b) => a[0].half - b[0].half || a[0].t - b[0].t || rankOf(a[0]) - rankOf(b[0]) || a[1] - b[1]).map(([e]) => e)
}
export const byHalf = <T extends Pick<MatchEvent, 'half'>>(events: readonly T[], half: HalfFilter) => (half === 'all' ? [...events] : events.filter((e) => e.half === half))

/* ------------------------------------------------------------------ video */

/** The studio at a moment, three seconds before the action; with several moments, the list follows. */
export function videoHref(videoId: string, times: readonly number[], lead = 3) {
  const ts = times.filter((v) => Number.isFinite(v)).slice(0, 80)
  if (!ts.length) return `/app/analyse/video/${videoId}`
  const at = Math.max(0, Math.floor(ts[0] - lead))
  const list = ts.length > 1 ? `&list=${ts.map((v) => Math.round(v * 10) / 10).join(',')}` : ''
  return `/app/analyse/video/${videoId}?t=${at}${list}`
}
/** Video moments of a list of events, in match order (events without a video time are skipped). */
export const videoTimes = (events: readonly MatchEvent[]) => sortEvents(events.filter((e) => typeof e.videoT === 'number')).map((e) => e.videoT as number)

/* ------------------------------------------------------------------ shots */

export interface Shot { e: MatchEvent; side: Side; onTarget: boolean; goal: boolean; inBox: boolean | null; playerId?: string; dist: number | null; /** ids of the SHOT_IN and GOAL codes that qualify this shot */ marks: string[] }

/**
 * Each SHOT is one shot; a SHOT_IN or a GOAL of the same side within 3 seconds marks it on target or scored
 * (the live tagger records SHOT_IN with SHOT, and GOAL with both). A goal is always on target.
 */
export function shotList(events: readonly MatchEvent[]): Shot[] {
  const out: Shot[] = []
  for (const side of ['us', 'them'] as Side[]) {
    const shots = sortEvents(events.filter((e) => e.side === side && e.code === 'SHOT')).map((e) => ({ e, side, onTarget: false, goal: false, inBox: null as boolean | null, playerId: e.playerId, dist: null as number | null, marks: [] as string[] }))
    const mark = (code: 'SHOT_IN' | 'GOAL') => {
      for (const m of sortEvents(events.filter((e) => e.side === side && e.code === code))) {
        const free = shots.filter((s) => s.e.half === m.half && Math.abs(s.e.t - m.t) <= 3 && !(code === 'GOAL' ? s.goal : s.onTarget))
        const best = free.sort((a, b) => Number(!!m.playerId && b.playerId === m.playerId) - Number(!!m.playerId && a.playerId === m.playerId) || Math.abs(a.e.t - m.t) - Math.abs(b.e.t - m.t))[0]
        if (best) { best.onTarget = true; best.marks.push(m.id); if (code === 'GOAL') best.goal = true }
        else if (code === 'GOAL') shots.push({ e: m, side, onTarget: true, goal: true, inBox: null, playerId: m.playerId, dist: null, marks: [] })
      }
    }
    mark('SHOT_IN'); mark('GOAL')
    for (const s of shots) if (isPlaced(s.e)) { s.inBox = side === 'us' ? inTheirBox(s.e.x, s.e.y) : inOurBox(s.e.x, s.e.y); s.dist = distToGoal(s.e, side) }
    out.push(...shots)
  }
  return out
}

export interface ShotStats { total: number; onTarget: number; goals: number; inBox: number; outBox: number; unplaced: number; conversion: number | null; avgDist: number | null }
export function shotStats(shots: readonly Shot[], side: Side): ShotStats {
  const l = shots.filter((s) => s.side === side)
  const placed = l.filter((s) => s.dist != null)
  return {
    total: l.length, onTarget: l.filter((s) => s.onTarget).length, goals: l.filter((s) => s.goal).length,
    inBox: l.filter((s) => s.inBox === true).length, outBox: l.filter((s) => s.inBox === false).length, unplaced: l.filter((s) => s.inBox == null).length,
    conversion: l.length ? l.filter((s) => s.goal).length / l.length : null,
    avgDist: placed.length ? placed.reduce((a, s) => a + (s.dist ?? 0), 0) / placed.length : null,
  }
}

/* ------------------------------------------------------------------ passes */

/**
 * Where a completed pass arrived: the next placed action of the receiver within 12 seconds in the same half.
 * The codes hold where a pass was played and who received it, not the point of reception: the next
 * action of the receiver is the closest honest estimate.
 */
export function passEnds(events: readonly MatchEvent[]): Map<string, Pt> {
  const list = sortEvents(events.filter((e) => e.side === 'us'))
  const out = new Map<string, Pt>()
  for (let i = 0; i < list.length; i++) {
    const p = list[i]
    if (p.code !== 'PASS_OK' || !p.toPlayerId) continue
    for (let j = i + 1; j < list.length; j++) {
      const n = list[j]
      if (n.half !== p.half || n.t - p.t > 12) break
      if (n.playerId === p.toPlayerId && isPlaced(n)) { out.set(p.id, { x: n.x, y: n.y }); break }
    }
  }
  return out
}

export interface NetNode { id: string; x: number; y: number; passes: number; completed: number }
export interface NetLink { a: string; b: string; ab: number; ba: number; n: number }
/**
 * The passing network: each player at the average position of the passes he played (completed or lost),
 * sized by passes; a link for each pair that completed passes to each other (toPlayerId), thick by count.
 */
export function passNetwork(events: readonly MatchEvent[]): { nodes: NetNode[]; links: NetLink[]; completed: number } {
  const acc = new Map<string, { sx: number; sy: number; n: number; passes: number; completed: number }>()
  for (const e of events) {
    if (e.side !== 'us' || !e.playerId || (e.code !== 'PASS_OK' && e.code !== 'PASS_LOST')) continue
    const a = acc.get(e.playerId) ?? { sx: 0, sy: 0, n: 0, passes: 0, completed: 0 }
    a.passes++
    if (e.code === 'PASS_OK') a.completed++
    if (isPlaced(e)) { a.sx += e.x; a.sy += e.y; a.n++ }
    acc.set(e.playerId, a)
  }
  const nodes: NetNode[] = [...acc.entries()].filter(([, a]) => a.n > 0).map(([id, a]) => ({ id, x: a.sx / a.n, y: a.sy / a.n, passes: a.passes, completed: a.completed }))
  const has = new Set(nodes.map((n) => n.id))
  const pair = new Map<string, NetLink>()
  let completed = 0
  for (const e of events) {
    if (e.side !== 'us' || e.code !== 'PASS_OK' || !e.playerId || !e.toPlayerId || e.playerId === e.toPlayerId) continue
    if (!has.has(e.playerId) || !has.has(e.toPlayerId)) continue
    completed++
    const [a, b] = e.playerId < e.toPlayerId ? [e.playerId, e.toPlayerId] : [e.toPlayerId, e.playerId]
    const key = `${a}|${b}`
    const l = pair.get(key) ?? { a, b, ab: 0, ba: 0, n: 0 }
    if (e.playerId === a) l.ab++; else l.ba++
    l.n++
    pair.set(key, l)
  }
  return { nodes, links: [...pair.values()].sort((x, y) => y.n - x.n), completed }
}

/** Strings of consecutive completed passes (of at least `min`) inside one possession of ours. */
export function passStrings(events: readonly MatchEvent[], min = 5) {
  const list = sortEvents(events)
  const strings: { first: MatchEvent; n: number }[] = []
  let run = 0, first: MatchEvent | null = null, half = 0
  const close = () => { if (run >= min && first) strings.push({ first, n: run }); run = 0; first = null }
  for (const e of list) {
    if (e.half !== half) { close(); half = e.half }
    if (e.side === 'them') { close(); continue }
    if (e.code === 'PASS_OK') { if (!run) first = e; run++ }
    else if (POSSESSION_END.includes(e.code) || e.code === 'GOAL' || e.code === 'REGAIN' || e.code === 'REGAIN5' || SET_PIECES.includes(e.code)) close()
  }
  close()
  return { count: strings.length, longest: strings.reduce((a, s) => Math.max(a, s.n), 0), strings }
}

/* ------------------------------------------------------------------ density */

export interface Grid { cols: number; rows: number; v: Float32Array; max: number; n: number }
/**
 * A smooth density of points (Gaussian kernel, bandwidth in metres) on a grid over the whole pitch,
 * row-major from our left touchline: v[r * cols + c].
 */
export function density(points: readonly Pt[], cols = 84, rows = 54, bandwidth = 7): Grid {
  const v = new Float32Array(cols * rows)
  const cw = PITCH.L / cols, rh = PITCH.W / rows
  const reach = bandwidth * 3
  const k = -1 / (2 * bandwidth * bandwidth)
  for (const p of points) {
    const px = (p.x / 100) * PITCH.L, py = (p.y / 100) * PITCH.W
    const c0 = Math.max(0, Math.floor((px - reach) / cw)), c1 = Math.min(cols - 1, Math.ceil((px + reach) / cw))
    const r0 = Math.max(0, Math.floor((py - reach) / rh)), r1 = Math.min(rows - 1, Math.ceil((py + reach) / rh))
    for (let r = r0; r <= r1; r++) {
      const dy = (r + 0.5) * rh - py
      for (let c = c0; c <= c1; c++) {
        const dx = (c + 0.5) * cw - px
        v[r * cols + c] += Math.exp((dx * dx + dy * dy) * k)
      }
    }
  }
  let max = 0
  for (let i = 0; i < v.length; i++) if (v[i] > max) max = v[i]
  return { cols, rows, v, max, n: points.length }
}

/* ------------------------------------------------------------------ zones */

/** Placed events counted by third (from our goal to theirs). */
export function byThird(events: readonly MatchEvent[]): [number, number, number] {
  const out: [number, number, number] = [0, 0, 0]
  for (const e of events) if (isPlaced(e)) out[thirdOf(e.x)]++
  return out
}
export function byLane(events: readonly MatchEvent[]): [number, number, number] {
  const out: [number, number, number] = [0, 0, 0]
  for (const e of events) if (isPlaced(e)) out[laneOf(e.y)]++
  return out
}

/** Codes of the opponent beyond shots and goals (the minimum a live coder records). */
export const opponentCoded = (events: readonly MatchEvent[]) => events.some((e) => e.side === 'them' && e.code !== 'SHOT' && e.code !== 'GOAL' && e.code !== 'SHOT_IN')

/** Territory: our placed actions by third, theirs too when they are coded beyond their shots. */
export function territory(events: readonly MatchEvent[]) {
  const ours = events.filter((e) => e.side === 'us' && BALL_ACTIONS.includes(e.code) && isPlaced(e))
  const theirs = events.filter((e) => e.side === 'them' && e.code !== 'GOAL' && isPlaced(e))
  const coded = opponentCoded(events) && theirs.some((e) => e.code !== 'SHOT')
  return { us: byThird(ours), them: coded ? byThird(theirs) : null, usTotal: ours.length, themTotal: coded ? theirs.length : 0 }
}

/** Field tilt: our share of the actions played in the attacking thirds. */
export function fieldTilt(events: readonly MatchEvent[]): { value: number | null; method: 'positions' | 'codes' | null } {
  const tr = territory(events)
  if (tr.them) {
    const ours = tr.us[2], theirs = tr.them[0]
    return ours + theirs > 0 ? { value: ours / (ours + theirs), method: 'positions' } : { value: null, method: null }
  }
  const us = countEvents(events, 'us'), them = countEvents(events, 'them')
  if (them.FINAL3 > 0) return { value: us.FINAL3 / (us.FINAL3 + them.FINAL3), method: 'codes' }
  return { value: null, method: null }
}

/* ------------------------------------------------------------------ possession */

export interface Possession { share: number | null; method: 'passes' | 'time' | null; us: number; them: number }
/**
 * Possession share from the passes when the opponent's passes are coded, otherwise estimated from the
 * clock of the coded sequences (see the header). Each stretch is capped at two minutes (stoppages).
 */
export function possession(events: readonly MatchEvent[]): Possession {
  const u = countEvents(events, 'us'), th = countEvents(events, 'them')
  const pu = u.PASS_OK + u.PASS_LOST, pt = th.PASS_OK + th.PASS_LOST
  if (pt > 0 && pu + pt > 0) return { share: pu / (pu + pt), method: 'passes', us: pu, them: pt }
  let us = 0, them = 0
  const CAP = 120
  for (const half of [1, 2, 3, 4] as Half[]) {
    const list = sortEvents(events.filter((e) => e.half === half))
    let state: Side | null = null, from = 0
    const add = (side: Side, to: number) => { const d = Math.min(CAP, Math.max(0, to - from)); if (side === 'us') us += d; else them += d }
    for (const e of list) {
      if (e.side === 'us') {
        if (e.code === 'GOAL') { if (state === 'us') add('us', e.t); state = 'them'; from = e.t; continue }
        // SHOT_IN only qualifies the shot just coded: it neither starts nor ends a sequence
        if (SET_PIECES.includes(e.code) || (ON_BALL.includes(e.code) && e.code !== 'SHOT_IN')) {
          if (state === 'them') add('them', e.t)
          if (state !== 'us') { state = 'us'; from = e.t }
          if (POSSESSION_END.includes(e.code)) { add('us', e.t); state = 'them'; from = e.t }
        }
      } else {
        if (e.code === 'GOAL') { if (state === 'them') add('them', e.t); state = 'us'; from = e.t; continue }
        if (state === 'us') { add('us', e.t); state = 'them'; from = e.t }
        else if (state === null) { state = 'them'; from = e.t }
      }
    }
  }
  if (us + them < 600) return { share: null, method: null, us, them }
  return { share: us / (us + them), method: 'time', us, them }
}

/* ------------------------------------------------------------------ momentum */

export const DANGER: Partial<Record<EventCode, number>> = { FINAL3: 1, BOX: 2, SHOT: 3, SHOT_IN: 1, GOAL: 2 }
export interface MomentumPoint { half: Half; minute: number; us: number; them: number; net: number }
/** Rolling danger (window in minutes) at the end of each minute of each half, stoppage time included. */
export function momentum(events: readonly MatchEvent[], halfMinutes: number, window = 5): MomentumPoint[] {
  const out: MomentumPoint[] = []
  const halves = ([1, 2, 3, 4] as Half[]).filter((h) => h <= 2 || events.some((e) => e.half === h))
  for (const h of halves) {
    const list = events.filter((e) => e.half === h && DANGER[e.code])
    const end = Math.max(halfLen(h, halfMinutes), Math.ceil(Math.max(0, ...events.filter((e) => e.half === h).map((e) => e.t)) / 60))
    for (let m = 1; m <= end; m++) {
      let us = 0, them = 0
      for (const e of list) {
        const em = e.t / 60
        if (em <= m && em > m - window) { if (e.side === 'us') us += DANGER[e.code]!; else them += DANGER[e.code]! }
      }
      out.push({ half: h, minute: halfStart(h, halfMinutes) + m, us, them, net: us - them })
    }
  }
  return out
}

export interface Block { half: Half; from: number; to: number; stoppage: boolean; result: NjangiResult; events: number }
/** The Indice Njangi of each block of the match (15 minutes by default; a short last block joins the previous one). */
export function indiceBlocks(events: readonly MatchEvent[], halfMinutes: number, size = 15): Block[] {
  const out: Block[] = []
  const halves = ([1, 2, 3, 4] as Half[]).filter((h) => h <= 2 || events.some((e) => e.half === h))
  for (const h of halves) {
    const len = halfLen(h, halfMinutes)
    const cuts: number[] = []
    for (let a = 0; a < len; a += size) cuts.push(a)
    if (cuts.length > 1 && len - cuts[cuts.length - 1] < size / 2) cuts.pop()
    const off = halfStart(h, halfMinutes)
    cuts.forEach((a, i) => {
      const b = i + 1 < cuts.length ? cuts[i + 1] : Infinity
      const evs = events.filter((e) => e.half === h && e.t / 60 >= a && e.t / 60 < b)
      out.push({ half: h, from: off + a, to: off + (b === Infinity ? len : b), stoppage: b === Infinity, result: njangiFromCounts(countEvents(evs, 'us')), events: evs.filter((e) => e.side === 'us').length })
    })
  }
  return out
}

/* ------------------------------------------------------------------ players */

export const matchLength = (m: Pick<Match, 'halfMinutes'>) => 2 * m.halfMinutes
const starterIds = (m: Pick<Match, 'lineup'>) => m.lineup.map((l) => l.playerId).filter((x): x is string => !!x)
/** Minutes played: the staff's record, otherwise the whole match for a starter and 0 for a substitute. */
export function minutesOf(m: Pick<Match, 'lineup' | 'minutes' | 'halfMinutes'>, pid: string) {
  if (m.minutes && typeof m.minutes[pid] === 'number') return Math.max(0, m.minutes[pid])
  return starterIds(m).includes(pid) ? matchLength(m) : 0
}

export interface Sub { minute: number; off?: string; on?: string }
/** Substitutions read from the minutes record (on at full time minus his minutes, off at his minutes). */
export function substitutions(m: Pick<Match, 'lineup' | 'minutes' | 'halfMinutes' | 'subs'>): Sub[] {
  if (!m.minutes) return []
  const full = matchLength(m)
  const xi = starterIds(m)
  const offs = xi.filter((id) => { const v = m.minutes![id]; return typeof v === 'number' && v > 0 && v < full }).map((id) => ({ id, minute: m.minutes![id] }))
  const ons = Object.entries(m.minutes).filter(([id, v]) => !xi.includes(id) && v > 0).map(([id, v]) => ({ id, minute: full - Math.min(full, v) }))
  const out: Sub[] = []
  const left = [...ons]
  for (const o of offs.sort((a, b) => a.minute - b.minute)) {
    const i = left.reduce((best, x, k) => (best < 0 || Math.abs(x.minute - o.minute) < Math.abs(left[best].minute - o.minute) ? k : best), -1)
    if (i >= 0 && Math.abs(left[i].minute - o.minute) <= 2) { out.push({ minute: o.minute, off: o.id, on: left[i].id }); left.splice(i, 1) }
    else out.push({ minute: o.minute, off: o.id })
  }
  for (const x of left) out.push({ minute: x.minute, on: x.id })
  return out.sort((a, b) => a.minute - b.minute)
}

export interface PlayerLine {
  id: string; minutes: number; starter: boolean; events: MatchEvent[]
  passes: number; passOk: number; accuracy: number | null; progressive: number; final3: number; box: number
  shots: number; onTarget: number; goals: number; regains: number; regain5: number; losses: number; fixations: number
  /** a reading score of the coded contribution (see CONTRIBUTION) */
  score: number
}
/** Weights of the contribution score: what moves the ball with purpose counts, losses count against. */
export const CONTRIBUTION: Partial<Record<EventCode, number>> = { PASS_OK: 0.1, PROG: 1, LINE: 1.5, FINAL3: 1, BOX: 1.5, FIX2: 1, SWITCH: 1, SHOT: 1, SHOT_IN: 1, GOAL: 4, REGAIN5: 1.5, REGAIN: 1, PASS_LOST: -0.6, LOSS: -1 }

export function playerLine(id: string, events: readonly MatchEvent[], match?: Pick<Match, 'lineup' | 'minutes' | 'halfMinutes'>): PlayerLine {
  const mine = events.filter((e) => e.side === 'us' && e.playerId === id)
  const c = countEvents(mine, 'us')
  const shots = shotList(mine).filter((s) => s.side === 'us')
  const passes = c.PASS_OK + c.PASS_LOST
  return {
    id, minutes: match ? minutesOf(match, id) : 0, starter: match ? starterIds(match).includes(id) : false, events: mine,
    passes, passOk: c.PASS_OK, accuracy: passes ? c.PASS_OK / passes : null, progressive: c.PROG + c.LINE, final3: c.FINAL3, box: c.BOX,
    shots: shots.length, onTarget: shots.filter((s) => s.onTarget).length, goals: c.GOAL, regains: c.REGAIN + c.REGAIN5, regain5: c.REGAIN5,
    losses: c.PASS_LOST + c.LOSS, fixations: c.FIX2 + c.SWITCH,
    score: Math.round(mine.reduce((a, e) => a + (CONTRIBUTION[e.code] ?? 0), 0) * 10) / 10,
  }
}

/** Every player who played (minutes) or was coded, sorted by contribution. */
export function playerLines(match: Pick<Match, 'lineup' | 'minutes' | 'halfMinutes' | 'subs'>, events: readonly MatchEvent[]): PlayerLine[] {
  const ids = new Set<string>()
  for (const id of starterIds(match)) ids.add(id)
  if (match.minutes) for (const [id, v] of Object.entries(match.minutes)) if (v > 0) ids.add(id)
  for (const e of events) if (e.side === 'us' && e.playerId) ids.add(e.playerId)
  return [...ids].map((id) => playerLine(id, events, match)).sort((a, b) => b.score - a.score || b.events.length - a.events.length)
}
export const per90 = (v: number, minutes: number) => (minutes > 0 ? (v * 90) / minutes : null)

/* ------------------------------------------------------------------ the opponent */

/** Their shots, each with the end of our possession that came just before (within 60 seconds), if any. */
export function theirShotOrigins(events: readonly MatchEvent[]) {
  const list = sortEvents(events)
  return shotList(events).filter((s) => s.side === 'them').map((s) => {
    const idx = list.indexOf(s.e)
    let before: MatchEvent | null = null
    for (let i = idx - 1; i >= 0; i--) {
      const e = list[i]
      if (e.half !== s.e.half || s.e.t - e.t > 60) break
      if (e.side === 'us' && (e.code === 'PASS_LOST' || e.code === 'LOSS')) { before = e; break }
      if (e.side === 'us' && (e.code === 'REGAIN' || e.code === 'REGAIN5' || e.code === 'SHOT')) break
    }
    return { shot: s, before }
  })
}

/* ------------------------------------------------------------------ one match, one line */

export interface MatchDigest {
  match: Match
  events: MatchEvent[]
  result: NjangiResult
  goalsFor: number
  goalsAgainst: number
  outcome: 'W' | 'D' | 'L'
  shots: ShotStats
  theirShots: ShotStats
  possession: Possession
  tilt: ReturnType<typeof fieldTilt>
  strings: number
  longest: number
  passesOk: number
  placed: number
  /** share of our events that carry a position (0..1) */
  placedShare: number
}

export function digest(match: Match, events: readonly MatchEvent[]): MatchDigest {
  const evs = [...events]
  const shots = shotList(evs)
  const us = evs.filter((e) => e.side === 'us')
  const placed = us.filter(isPlaced).length
  const ps = passStrings(evs)
  return {
    match, events: evs, result: njangiFromCounts(countEvents(evs, 'us')),
    goalsFor: match.scoreUs, goalsAgainst: match.scoreThem, outcome: match.scoreUs > match.scoreThem ? 'W' : match.scoreUs < match.scoreThem ? 'L' : 'D',
    shots: shotStats(shots, 'us'), theirShots: shotStats(shots, 'them'), possession: possession(evs), tilt: fieldTilt(evs),
    strings: ps.count, longest: ps.longest, passesOk: us.filter((e) => e.code === 'PASS_OK').length, placed, placedShare: us.length ? placed / us.length : 0,
  }
}

/** Averages over several digests; null where no match carries the value. */
export function seasonAverages(list: readonly MatchDigest[]) {
  const avg = (f: (d: MatchDigest) => number | null) => {
    const v = list.map(f).filter((x): x is number => x != null && Number.isFinite(x))
    return v.length ? { value: v.reduce((a, b) => a + b, 0) / v.length, n: v.length } : null
  }
  const shots = list.reduce((a, d) => a + d.shots.total, 0), goals = list.reduce((a, d) => a + d.shots.goals, 0)
  return {
    goals: avg((d) => d.goalsFor), against: avg((d) => d.goalsAgainst), shotsOn: avg((d) => d.shots.onTarget), shots: avg((d) => d.shots.total),
    possession: avg((d) => d.possession.share), possessionMethods: [...new Set(list.map((d) => d.possession.method).filter(Boolean))] as ('passes' | 'time')[],
    tilt: avg((d) => d.tilt.value), strings: avg((d) => d.strings), passesOk: avg((d) => d.passesOk),
    conversion: shots ? goals / shots : null,
    winRate: list.length ? list.filter((d) => d.outcome === 'W').length / list.length : null,
    /** the season Indice: computed from the summed counts, never from an average of indices */
    indice: list.length ? njangiFromCounts(sumCounts(list.map((d) => d.result.counts))) : null,
  }
}

/* ------------------------------------------------------------------ radar */

export type RadarKey = 'goals' | 'shotsOn' | 'possession' | 'passesOk' | 'conversion' | 'winRate'
export const RADAR_KEYS: RadarKey[] = ['goals', 'shotsOn', 'possession', 'passesOk', 'conversion', 'winRate']
export type RadarValues = Record<RadarKey, number | null>

/** Our values and the opponent's in the matches played against one opponent (theirs only where coded). */
export function versusValues(list: readonly MatchDigest[]): { us: RadarValues; them: RadarValues } {
  const n = list.length || 1
  const sum = (f: (d: MatchDigest) => number) => list.reduce((a, d) => a + f(d), 0)
  const poss = list.map((d) => d.possession.share).filter((v): v is number => v != null)
  const theirPassesCoded = list.some((d) => countEvents(d.events, 'them').PASS_OK > 0)
  const usShots = sum((d) => d.shots.total), themShots = sum((d) => d.theirShots.total)
  const theirOnCoded = list.some((d) => d.events.some((e) => e.side === 'them' && e.code === 'SHOT_IN'))
  return {
    us: {
      goals: sum((d) => d.goalsFor) / n, shotsOn: sum((d) => d.shots.onTarget) / n, possession: poss.length ? poss.reduce((a, b) => a + b, 0) / poss.length : null,
      passesOk: sum((d) => d.passesOk) / n, conversion: usShots ? sum((d) => d.shots.goals) / usShots : null, winRate: list.filter((d) => d.outcome === 'W').length / n,
    },
    them: {
      goals: sum((d) => d.goalsAgainst) / n,
      // same rule as the shot tables: a goal is always on target, so their shots on target show once their shots are coded
      shotsOn: theirOnCoded || themShots ? sum((d) => d.theirShots.onTarget) / n : null,
      possession: poss.length ? 1 - poss.reduce((a, b) => a + b, 0) / poss.length : null,
      passesOk: theirPassesCoded ? sum((d) => countEvents(d.events, 'them').PASS_OK) / n : null,
      conversion: themShots ? sum((d) => d.goalsAgainst) / themShots : null,
      winRate: list.filter((d) => d.outcome === 'L').length / n,
    },
  }
}
/** Season values of a team (for a team against another team of the club). */
export function teamValues(list: readonly MatchDigest[]): RadarValues {
  if (!list.length) return { goals: null, shotsOn: null, possession: null, passesOk: null, conversion: null, winRate: null }
  return versusValues(list).us
}

/** A played match, with its digest when it was coded (null when only the score is known). */
export interface Played { match: Match; digest: MatchDigest | null }
/**
 * Radar values from played matches: goals and results come from the scores of every match,
 * the rest only from the coded ones (null when none is coded).
 */
export function radarFor(items: readonly Played[]): { us: RadarValues; them: RadarValues } {
  const empty: RadarValues = { goals: null, shotsOn: null, possession: null, passesOk: null, conversion: null, winRate: null }
  if (!items.length) return { us: { ...empty }, them: { ...empty } }
  const coded = items.map((i) => i.digest).filter((d): d is MatchDigest => !!d)
  const base = coded.length ? versusValues(coded) : { us: { ...empty }, them: { ...empty } }
  const n = items.length
  const wins = items.filter((i) => i.match.scoreUs > i.match.scoreThem).length, losses = items.filter((i) => i.match.scoreUs < i.match.scoreThem).length
  return {
    us: { ...base.us, goals: items.reduce((a, i) => a + i.match.scoreUs, 0) / n, winRate: wins / n },
    them: { ...base.them, goals: items.reduce((a, i) => a + i.match.scoreThem, 0) / n, winRate: losses / n },
  }
}
/** Each axis on a 0..1 scale against a fixed football range (or the larger value when it goes beyond). */
export function radarScale(key: RadarKey, ...values: (number | null)[]) {
  const base: Record<RadarKey, number> = { goals: 3, shotsOn: 8, possession: 1, passesOk: 450, conversion: 0.4, winRate: 1 }
  const top = Math.max(base[key], ...values.map((v) => v ?? 0))
  return (v: number | null) => (v == null ? null : Math.max(0, Math.min(1, v / top)))
}
