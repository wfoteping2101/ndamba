// The professional demo match (Étoile de la Côte 2-1 Météore de Bafoussam, ligue 1, journée 9): its tag stream,
// built from exact counts so the Indice is known in advance, and where each action happened on the pitch.
// Pure module (no database): the demo seed uses it in the browser, tools/render_demo_match.mjs uses it in Node
// to draw the 2D match video that matches the codes one for one.
import type { EventCode, MatchEvent, Player } from './types'
import { nowISO, uid } from './util'

export const PRO_ROSTER: [string, number, string, number, 'R' | 'L' | 'B', number, string?, string?][] = [
  ['Hervé Ngando', 1, 'GK', 1995, 'R', 3.5, 'Gardien relanceur, jeu au pied sûr.', 'Ball-playing keeper, safe with his feet.'],
  ['Cyrille Etondé', 16, 'GK', 1999, 'R', 3],
  ['Patrice Nyemb', 30, 'GK', 2005, 'L', 2.5, 'Troisième gardien, vient du centre de formation.', 'Third keeper, from the academy.'],
  ['Junior Ekwalla', 2, 'FB', 2000, 'R', 3.2],
  ['Ismaël Bouba', 3, 'FB', 2002, 'L', 3.4, 'Latéral intérieur, monte entre les lignes.', 'Inverted full-back, steps into midfield.'],
  ['Christian Tchoupo', 12, 'FB', 1998, 'R', 3],
  ['Moussa Hamadou', 22, 'FB', 2004, 'L', 2.8],
  ['Désiré Mvogo', 4, 'CB', 1997, 'R', 3.3],
  ['Franck Essomba', 5, 'CB', 1993, 'L', 3.6, 'Capitaine. Central gauche relanceur.', 'Captain. Left-sided ball-playing centre-back.'],
  ['Yves Belinga', 15, 'CB', 2001, 'R', 3],
  ['Lionel Nkwenti', 23, 'CB', 1999, 'R', 3, 'Blessé (ischio-jambiers), retour prévu dans deux semaines.', 'Injured (hamstring), expected back in two weeks.'],
  ['Guy Mbock', 6, 'DM', 1996, 'R', 3.7, 'Le pivot : il touche le ballon à chaque sortie.', 'The pivot: on the ball in every build-up.'],
  ['Rodrigue Tsala', 18, 'DM', 2003, 'R', 3],
  ['Steve Ndjock', 8, 'CM', 1998, 'R', 3.5],
  ['Didier Fouda', 14, 'CM', 2000, 'B', 3.1],
  ['Arthur Nlend', 20, 'CM', 2006, 'L', 2.8, 'Jeune intérieur promu cette saison.', 'Young midfielder promoted this season.'],
  ['Brice Kemayou', 10, 'AM', 1997, 'L', 3.8, 'Meneur, joue intérieur gauche dans le 4-3-3.', 'Playmaker, plays left of the midfield three.'],
  ['Aristide Moukoko', 7, 'W', 1999, 'R', 3.4],
  ['Wilfried Nana', 11, 'W', 2001, 'L', 3.3],
  ['Hamidou Sali', 17, 'W', 2004, 'R', 3],
  ['Serge Eyoum', 9, 'ST', 1996, 'R', 3.4, 'Point d\'appui, dos au but.', 'Target forward, back to goal.'],
  ['Thierry Mbida', 19, 'ST', 2002, 'L', 3],
]
export const PRO_XI = ['pl_1', 'pl_2', 'pl_4', 'pl_5', 'pl_3', 'pl_6', 'pl_8', 'pl_10', 'pl_7', 'pl_9', 'pl_11'] // GK RB RCB LCB LB DM RCM LCM RW ST LW
export const PRO_BENCH = ['pl_16', 'pl_15', 'pl_12', 'pl_18', 'pl_14', 'pl_20', 'pl_17', 'pl_19', 'pl_22']
/** Second-half substitutions of the played match: [minute of the half, off, on]. */
export const PRO_SUBS: [number, string, string][] = [[21, 'pl_7', 'pl_17'], [30, 'pl_9', 'pl_19'], [35, 'pl_8', 'pl_14']]

type Counts = Partial<Record<EventCode, number>>
/** Exact counts of each half (us), tuned on chapter 32's formulas: 59.9 then 76.6, 67.9 for the match. */
export const PRO_HALVES: { us: Counts; theirShots: number }[] = [
  { us: { PASS_OK: 198, PASS_LOST: 31, PROG: 36, LINE: 15, FINAL3: 20, BOX: 7, FIX2: 2, SWITCH: 2, LOSS: 18, REGAIN5: 12, REGAIN: 21, SHOT: 6, SHOT_IN: 3 }, theirShots: 4 },
  { us: { PASS_OK: 214, PASS_LOST: 27, PROG: 40, LINE: 19, FINAL3: 24, BOX: 9, FIX2: 5, SWITCH: 2, LOSS: 16, REGAIN5: 14, REGAIN: 19, SHOT: 8, SHOT_IN: 3 }, theirShots: 5 },
]
/** Who tends to make each action, by position (relative weights). */
const PRO_W: Record<string, Partial<Record<string, number>>> = {
  pass: { GK: 0.45, CB: 1.25, FB: 1, DM: 1.45, CM: 1.3, AM: 1.1, W: 0.8, ST: 0.55 },
  prog: { GK: 0.1, CB: 0.8, FB: 0.9, DM: 1.3, CM: 1.4, AM: 1.2, W: 0.6, ST: 0.3 },
  final3: { FB: 0.8, DM: 0.2, CM: 0.8, AM: 1.2, W: 1.4, ST: 0.9 },
  box: { FB: 0.4, CM: 0.5, AM: 1, W: 1.2, ST: 1.4 },
  fix: { FB: 0.5, DM: 0.6, CM: 1, AM: 1.2, W: 1.3, ST: 0.4 },
  switch: { CB: 0.8, FB: 0.6, DM: 1.3, CM: 1.2, AM: 0.5 },
  loss: { CB: 0.2, FB: 0.6, DM: 0.4, CM: 0.6, AM: 1, W: 1.3, ST: 1.2 },
  regain5: { CB: 0.5, FB: 0.6, DM: 1.3, CM: 1.2, AM: 1, W: 0.9, ST: 0.9 },
  regain: { GK: 0.5, CB: 1.3, FB: 1, DM: 1.2, CM: 0.8, AM: 0.3, W: 0.3, ST: 0.2 },
  shot: { CB: 0.15, FB: 0.15, DM: 0.2, CM: 0.5, AM: 1, W: 1.2, ST: 1.6 },
}
const PRO_KIND: Partial<Record<EventCode, string>> = { PASS_OK: 'pass', PASS_LOST: 'pass', PROG: 'prog', LINE: 'prog', FINAL3: 'final3', BOX: 'box', FIX2: 'fix', SWITCH: 'switch', LOSS: 'loss', REGAIN5: 'regain5', REGAIN: 'regain', SHOT: 'shot' }

/**
 * The tag stream of the professional match (two halves of 45 minutes), built from exact counts so the Indice is known in advance.
 * Each tag goes to a player on the pitch at that moment, weighted by position, so the per-player table reads like a real match.
 */
/** The goals of the played demo match (ma_past): Eyoum, then theirs, then Sali on at the 66th minute. */
export const PRO_PAST_GOALS: { half: 1 | 2; side: 'us' | 'them'; near: number; playerId?: string }[] = [
  { half: 1, side: 'us', near: 1880, playerId: 'pl_9' },
  { half: 2, side: 'them', near: 760 },
  { half: 2, side: 'us', near: 1985, playerId: 'pl_17' },
]
/** The demo match video (tools/render_demo_match.mjs): 2D animation drawn from the codes, served by the app. */
export const PRO_VIDEO = { url: '/demo/etoile-meteore.mp4', halftime: 8 }

export function proDemoEvents(matchId: string, players: Player[], goals: { half: 1 | 2; side: 'us' | 'them'; near: number; playerId?: string }[]): MatchEvent[] {
  let r = 23
  const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280 }
  const byId = new Map(players.map((p) => [p.id, p]))
  const onPitch = (half: 1 | 2, t: number) => PRO_XI.map((id) => {
    if (half === 1) return id
    const s = PRO_SUBS.find(([min, off]) => off === id && t >= min * 60)
    return s ? s[2] : id
  }).map((id) => byId.get(id)).filter((p): p is Player => !!p)
  const pick = (half: 1 | 2, t: number, code: EventCode) => {
    const kind = PRO_KIND[code]
    const squad = onPitch(half, t)
    // a position missing from a weight table gets a small share, except the keeper (no shot, no final third for him)
    const w = squad.map((p) => (kind ? PRO_W[kind][p.position] ?? (p.position === 'GK' ? 0 : 0.05) : 1))
    let x = rnd() * w.reduce((a, b) => a + b, 0)
    for (let i = 0; i < squad.length; i++) { x -= w[i]; if (x <= 0) return squad[i].id }
    return squad[squad.length - 1]?.id
  }
  const out: MatchEvent[] = []
  const push = (half: 1 | 2, t: number, code: EventCode, side: 'us' | 'them') =>
    out.push({ id: uid('ev_'), matchId, half, t: Math.round(t), code, side, playerId: side === 'us' ? pick(half, t, code) : undefined, createdAt: nowISO() })
  const shuffle = <T,>(a: T[]) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
  /** Split a total over slots in proportion to weights (largest remainder). */
  const spread = (total: number, weights: number[]) => {
    const sum = weights.reduce((a, b) => a + b, 0) || 1
    const raw = weights.map((v) => (v / sum) * total)
    const base = raw.map(Math.floor)
    let left = total - base.reduce((a, b) => a + b, 0)
    raw.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { base[i]++; left-- } })
    return base
  }

  PRO_HALVES.forEach(({ us: c, theirShots }, hi) => {
    const half = (hi + 1) as 1 | 2
    const n0 = (k: EventCode) => c[k] ?? 0
    // every possession of ours ends with a lost pass, a loss or a shot
    const ends: EventCode[] = shuffle([...Array(n0('PASS_LOST')).fill('PASS_LOST'), ...Array(n0('LOSS')).fill('LOSS'), ...Array(n0('SHOT')).fill('SHOT')])
    const length = ends.map((e) => (e === 'SHOT' ? 2.2 : 1) * (0.4 + rnd() * rnd() * 3.2))
    const passes = spread(n0('PASS_OK'), length)
    const prog = spread(n0('PROG'), passes.map((p) => p + 0.2))
    const line = spread(n0('LINE'), passes.map((p) => p * p + 0.1))
    const final3 = spread(n0('FINAL3'), ends.map((e, i) => passes[i] * (e === 'SHOT' ? 2.5 : 1) + rnd()))
    const box = spread(n0('BOX'), ends.map((e, i) => (e === 'SHOT' ? 6 : 0.4) * (1 + passes[i] / 8)))
    const fix = spread(n0('FIX2'), passes.map((p) => (p >= 7 ? p : 0.05)))
    const sw = spread(n0('SWITCH'), passes.map((p) => (p >= 8 ? p : 0.05)))
    const onTarget = new Set(shuffle(ends.map((e, i) => (e === 'SHOT' ? i : -1)).filter((i) => i >= 0)).slice(0, n0('SHOT_IN')))
    const quick = new Set(shuffle(ends.map((e, i) => (e === 'SHOT' ? -1 : i)).filter((i) => i >= 0)).slice(0, n0('REGAIN5'))) // won back within 5 seconds
    const slow = new Set(shuffle(ends.map((_, i) => i).filter((i) => !quick.has(i))).slice(0, n0('REGAIN')))
    // a raw timeline, rescaled to 45 minutes plus stoppage time at the end
    const raw: { t: number; code: EventCode; side: 'us' | 'them' }[] = []
    const theirs: [number, number][] = []
    let t = 0
    ends.forEach((end, i) => {
      const n = passes[i]
      const progAt = new Set(Array.from({ length: prog[i] }, (_, k) => Math.min(Math.max(0, n - 1), Math.floor(((k + 0.5) * n) / Math.max(1, prog[i])))))
      for (let k = 0; k < n; k++) {
        t += 3 + rnd() * 4
        raw.push({ t, code: 'PASS_OK', side: 'us' })
        if (progAt.has(k)) raw.push({ t: t + 0.5, code: 'PROG', side: 'us' })
        if (k === Math.floor(n * 0.6)) for (let j = 0; j < line[i]; j++) raw.push({ t: t + 0.6 + j, code: 'LINE', side: 'us' })
        if (k === Math.floor(n * 0.5)) {
          for (let j = 0; j < fix[i]; j++) raw.push({ t: t + 1, code: 'FIX2', side: 'us' })
          for (let j = 0; j < sw[i]; j++) raw.push({ t: t + 2, code: 'SWITCH', side: 'us' })
        }
      }
      if (n === 0) { for (let j = 0; j < line[i]; j++) raw.push({ t: t + 0.6, code: 'LINE', side: 'us' }); if (prog[i]) for (let j = 0; j < prog[i]; j++) raw.push({ t: t + 0.4, code: 'PROG', side: 'us' }) }
      for (let j = 0; j < final3[i]; j++) raw.push({ t: t + 1 + j * 3, code: 'FINAL3', side: 'us' })
      for (let j = 0; j < box[i]; j++) raw.push({ t: t + 3 + j * 3, code: 'BOX', side: 'us' })
      t += 4 + rnd() * 3
      raw.push({ t, code: end, side: 'us' })
      if (end === 'SHOT' && onTarget.has(i)) raw.push({ t, code: 'SHOT_IN', side: 'us' })
      if (quick.has(i)) { t += 2 + rnd() * 2.5; raw.push({ t, code: 'REGAIN5', side: 'us' }); return }
      const from = t
      t += 14 + rnd() * 46 // their possession
      theirs.push([from, t])
      if (slow.has(i)) raw.push({ t, code: 'REGAIN', side: 'us' })
    })
    // their shots, in the middle of their longest possessions
    for (const [a, b] of [...theirs].sort((x, y) => (y[1] - y[0]) - (x[1] - x[0])).slice(0, theirShots)) raw.push({ t: (a + b) / 2, code: 'SHOT', side: 'them' })
    const k = (45 * 60 + 120) / (t + 30)
    for (const e of raw.sort((a, b) => a.t - b.t)) push(half, 20 + e.t * k, e.code, e.side)
  })

  // each goal lands on the closest shot (on target for us) taken while the scorer is on the pitch
  for (const g of goals) {
    const scorerOn = (e: MatchEvent) => !g.playerId || onPitch(g.half, e.t).some((p) => p.id === g.playerId)
    const shots = out.filter((e) => e.half === g.half && e.side === g.side && e.code === (g.side === 'us' ? 'SHOT_IN' : 'SHOT') && scorerOn(e))
    const shot = shots.sort((a, b) => Math.abs(a.t - g.near) - Math.abs(b.t - g.near))[0]
    const at = shot ? shot.t : g.near
    if (shot && g.side === 'us' && g.playerId) for (const e of out) if (e.half === g.half && e.t === shot.t && e.side === 'us' && (e.code === 'SHOT' || e.code === 'SHOT_IN')) e.playerId = g.playerId
    out.push({ id: uid('ev_'), matchId, half: g.half, t: at, code: 'GOAL', side: g.side, playerId: g.side === 'us' ? g.playerId : undefined, createdAt: nowISO() })
  }
  // a shot on target belongs to the player who took the shot
  for (const e of out) if (e.side === 'us' && e.code === 'SHOT_IN') { const s = out.find((x) => x.side === 'us' && x.code === 'SHOT' && x.half === e.half && x.t === e.t); if (s) e.playerId = s.playerId }
  return out
}

/* ------------------------------------------------------------------------------------------------
 * Where each action happened. Positions are in percent of the pitch, seen from our attack:
 * x from our goal line (0) to theirs (100), y from our left touchline (0) to our right (100).
 * Deterministic: the same events always get the same positions (the seed and the video agree).
 * ------------------------------------------------------------------------------------------------ */

/** The 4-3-3 of Étoile de la Côte, slot by slot (the order of PRO_XI). */
const OUR_SLOTS: [number, number][] = [[5, 50], [24, 84], [19, 62], [19, 38], [24, 16], [36, 50], [46, 66], [46, 34], [64, 86], [68, 50], [64, 14]]
/** The 4-4-2 of Météore de Bafoussam, in their own attacking frame (converted with 100 - x, 100 - y). */
const THEIR_SLOTS: [number, number][] = [[5, 50], [22, 84], [18, 62], [18, 38], [22, 16], [40, 82], [38, 60], [38, 40], [40, 18], [56, 58], [56, 42]]

/** The slot index of a player at a moment (a substitute takes the slot of the player he replaced). */
export function slotOf(id: string): number {
  const i = PRO_XI.indexOf(id)
  if (i >= 0) return i
  const s = PRO_SUBS.find(([, , on]) => on === id)
  return s ? PRO_XI.indexOf(s[1]) : -1
}
export function onPitchAt(half: number, t: number): string[] {
  return PRO_XI.map((id) => {
    if (half === 1) return id
    const s = PRO_SUBS.find(([min, off]) => off === id && t >= min * 60)
    return s ? s[2] : id
  })
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

/** Where a player of ours stands when the ball is at (bx, by), attacking (we have it) or defending. */
export function ourSpot(slot: number, bx: number, by: number, attacking: boolean): [number, number] {
  const [x0, y0] = OUR_SLOTS[slot]
  if (slot === 0) return [clamp(x0 + (bx - 50) * 0.08, 2, 16), clamp(y0 + (by - 50) * 0.15, 40, 60)]
  const shift = attacking ? (bx - 45) * 0.45 : (bx - 50) * 0.38 - 4
  return [clamp(x0 + shift, 3, 96), clamp(y0 + (by - 50) * 0.22, 3, 97)]
}
/** Where a player of theirs stands (same frame as ours). */
export function theirSpot(slot: number, bx: number, by: number, attacking: boolean): [number, number] {
  const [fx, fy] = THEIR_SLOTS[slot]
  const x0 = 100 - fx, y0 = 100 - fy
  if (slot === 0) return [clamp(x0 + (bx - 50) * 0.08, 84, 98), clamp(y0 + (by - 50) * 0.15, 40, 60)]
  const shift = attacking ? (bx - 55) * 0.45 : (bx - 50) * 0.38 + 4
  return [clamp(x0 + shift, 4, 97), clamp(y0 + (by - 50) * 0.22, 3, 97)]
}

/** A point the ball passes through: the video draws the ball moving from one to the next. */
export interface BallKey { t: number; x: number; y: number; owner: string | 'them' | null; code?: EventCode; side?: 'us' | 'them'; playerId?: string }

const BALL: EventCode[] = ['PASS_OK', 'PASS_LOST', 'LOSS', 'SHOT', 'FINAL3', 'BOX', 'REGAIN', 'REGAIN5']
const META: EventCode[] = ['PROG', 'LINE', 'FIX2', 'SWITCH', 'SHOT_IN']

/**
 * Gives each action of the match a position (and each completed pass its receiver), and returns the
 * ball's path half by half for the video. The events are changed in place.
 */
export function locateProMatch(events: MatchEvent[]): Record<1 | 2, BallKey[]> {
  let r = 77
  const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280 }
  const keys: Record<1 | 2, BallKey[]> = { 1: [], 2: [] }
  for (const half of [1, 2] as const) {
    const list = events.map((e, i) => [e, i] as const).filter(([e]) => e.half === half).sort((a, b) => a[0].t - b[0].t || a[1] - b[1]).map(([e]) => e)
    const kf = keys[half]
    let ball: [number, number] = [50, 50]
    let attacking = true
    let seg: { start: [number, number]; end: number; n: number; k: number; final3: boolean; box: boolean } | null = null
    let lastPass: MatchEvent | null = null
    const put = (e: MatchEvent, x: number, y: number) => { e.x = Math.round(clamp(x, 0.5, 99.5) * 10) / 10; e.y = Math.round(clamp(y, 0.5, 99.5) * 10) / 10 }
    kf.push({ t: 0, x: 50, y: 50, owner: null })
    for (let i = 0; i < list.length; i++) {
      const e = list[i]
      if (e.side === 'them') {
        if (e.code === 'SHOT') {
          const x = 8 + rnd() * 16, y = 30 + rnd() * 40
          put(e, x, y)
          kf.push({ t: e.t - 6, x: Math.min(ball[0], 40), y: 35 + rnd() * 30, owner: 'them' })
          kf.push({ t: e.t, x, y, owner: 'them', code: 'SHOT', side: 'them' })
          const goal = list.some((g) => g.side === 'them' && g.code === 'GOAL' && Math.abs(g.t - e.t) <= 1)
          kf.push({ t: e.t + 1.5, x: goal ? 0.5 : 3, y: goal ? 48 : 50, owner: goal ? null : 'them' })
          ball = goal ? [50, 50] : [5, 50]
        } else if (e.code === 'GOAL') { put(e, 1, 48) }
        continue
      }
      if (e.code === 'GOAL') { const s = [...list.slice(0, i)].reverse().find((x) => x.side === 'us' && x.code === 'SHOT'); put(e, s?.x ?? 90, s?.y ?? 50); continue }
      const slot = slotOf(e.playerId ?? '')
      if (META.includes(e.code)) {
        const ref = e.code === 'SHOT_IN' ? [...list.slice(0, i)].reverse().find((x) => x.side === 'us' && x.code === 'SHOT') : lastPass
        put(e, (ref?.x ?? ball[0]) + (rnd() - 0.5), (ref?.y ?? ball[1]) + (rnd() - 0.5))
        continue
      }
      if (e.code === 'REGAIN' || e.code === 'REGAIN5') {
        // their possession just ended: the ball went towards our goal first
        if (e.code === 'REGAIN') {
          const from = kf[kf.length - 1]
          const depth = 18 + rnd() * 34
          const steps = Math.max(1, Math.floor((e.t - from.t) / 7))
          for (let s = 1; s < steps; s++) {
            const f = s / steps
            kf.push({ t: from.t + (e.t - from.t) * f, x: from.x + (depth - from.x) * f + (rnd() - 0.5) * 6, y: clamp(from.y + (rnd() - 0.5) * 30, 8, 92), owner: 'them' })
          }
          const p = slot >= 0 ? ourSpot(slot, depth, 50, false) : [depth, 50]
          put(e, p[0] * 0.5 + depth * 0.5, p[1] * 0.6 + (30 + rnd() * 40) * 0.4)
        } else {
          put(e, ball[0] - 2 - rnd() * 5, ball[1] + (rnd() - 0.5) * 12)
        }
        ball = [e.x!, e.y!]
        attacking = true
        seg = null
        kf.push({ t: e.t, x: e.x!, y: e.y!, owner: e.playerId ?? null, code: e.code, side: 'us', playerId: e.playerId })
        continue
      }
      if (!BALL.includes(e.code)) continue
      if (!seg) {
        // a new possession of ours: look ahead to where it ends
        let n = 0, final3 = false, box = false, endCode: EventCode = 'LOSS'
        for (let j = i; j < list.length; j++) {
          const x = list[j]
          if (x.side !== 'us') continue
          if (x.code === 'PASS_OK') n++
          if (x.code === 'FINAL3') final3 = true
          if (x.code === 'BOX') box = true
          if (x.code === 'PASS_LOST' || x.code === 'LOSS' || x.code === 'SHOT') { endCode = x.code; break }
        }
        const end = endCode === 'SHOT' ? (box ? 86 : 76) + rnd() * 6 : final3 ? 70 + rnd() * 12 : clamp(ball[0] + 8 + rnd() * 26, 30, 72)
        seg = { start: [...ball], end, n, k: 0, final3, box }
        attacking = true
      }
      const f = (seg.k + 1) / (seg.n + 1)
      let bx = seg.start[0] + (seg.end - seg.start[0]) * f + (rnd() - 0.5) * 6
      let by = clamp(ball[1] + (rnd() - 0.5) * 34, 6, 94)
      if (e.code === 'FINAL3') bx = Math.max(bx, 68 + rnd() * 8)
      if (e.code === 'BOX') { bx = 85 + rnd() * 9; by = 26 + rnd() * 48 }
      if (e.code === 'SHOT') { bx = seg.box ? 84 + rnd() * 10 : 70 + rnd() * 13; by = 28 + rnd() * 44 }
      const p = slot >= 0 ? ourSpot(slot, bx, by, attacking) : [bx, by]
      const blend = e.code === 'SHOT' || e.code === 'BOX' ? 0.15 : 0.55
      put(e, p[0] * blend + bx * (1 - blend), p[1] * blend + by * (1 - blend))
      if (e.code === 'BOX' && e.x! < 84.5) e.x = 84.5 + rnd() * 8
      ball = [e.x!, e.y!]
      kf.push({ t: e.t, x: e.x!, y: e.y!, owner: e.playerId ?? null, code: e.code, side: 'us', playerId: e.playerId })
      if (e.code === 'PASS_OK') { if (lastPass && lastPass.playerId !== e.playerId && !lastPass.toPlayerId) lastPass.toPlayerId = e.playerId; lastPass = e; seg.k++ }
      else if (lastPass && !lastPass.toPlayerId && lastPass.playerId !== e.playerId && (e.code === 'SHOT' || e.code === 'LOSS' || e.code === 'BOX' || e.code === 'FINAL3' || e.code === 'PASS_LOST')) lastPass.toPlayerId = e.playerId
      if (e.code === 'SHOT') {
        const goal = list.some((g) => g.side === 'us' && g.code === 'GOAL' && Math.abs(g.t - e.t) <= 1)
        kf.push({ t: e.t + 1.4, x: goal ? 99.6 : 96, y: goal ? 47 + rnd() * 6 : 50, owner: goal ? null : 'them' })
        ball = goal ? [50, 50] : [95, 50]
        attacking = false; seg = null; lastPass = null
      } else if (e.code === 'PASS_LOST' || e.code === 'LOSS') { attacking = false; seg = null; lastPass = null }
    }
    // the end of the half: the ball goes back to the middle
    const last = kf[kf.length - 1]
    kf.push({ t: last.t + 20, x: 50, y: 50, owner: null })
  }
  return keys
}
