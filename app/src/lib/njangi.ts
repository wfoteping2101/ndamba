// The Indice Njangi: did the team possess WITH PURPOSE? 0 to 100, five sub-indices of 0 to 20.
// Owner of this file: the analysis surface. Other surfaces import computeNjangi, countEvents,
// NjangiResult, SUB_KEYS, DRILLS_FOR, njangiLabel and EVENT_CODES: keep those names stable.
//
// SOURCE: Le Code Njangi (The Njangi Code), chapter 19 (coach/chapters/19-mesurer-la-possession.md), implemented exactly:
//   PASSES  = PASS_OK + PASS_LOST
//   PERTES  = PASS_LOST + LOSS
//   POSS    = PASS_LOST + LOSS + SHOT
//   ACTIONS = PASS_OK + PASS_LOST + LOSS
//   Progression = min(20, 20 * (PROG + LINE) / (0.35 * PASSES))
//   Penetration = min(20, 20 * (FINAL3 + 2 * BOX) / (1.00 * POSS))
//   Fixation    = min(20, 20 * (FIX2 + SWITCH) / (0.25 * POSS))
//   Reprise     = min(20, 20 * REGAIN5 / (0.40 * PERTES))
//   Controle    = max(0, min(20, 20 * (PASS_OK / ACTIONS - 0.55) / 0.30))
//   Indice      = sum of the five, each rounded to 0.1 (so the total has one decimal)
// A zero denominator gives 0. A match (or a season) is computed from summed counts, never from an
// average of half indices. Worked examples: chapter 19 gives 65.1, chapter 21 gives 68.4.
import type { EventCode, Intention, Lang, MatchEvent } from './types'

export const EVENT_CODES: EventCode[] = ['PASS_OK', 'PASS_LOST', 'PROG', 'LINE', 'FINAL3', 'BOX', 'FIX2', 'SWITCH', 'LOSS', 'REGAIN5', 'REGAIN', 'SHOT', 'SHOT_IN', 'GOAL']

export type SubKey = 'progression' | 'penetration' | 'fixation' | 'reprise' | 'controle'
export const SUB_KEYS: SubKey[] = ['progression', 'penetration', 'fixation', 'reprise', 'controle']

/** Where the formulas come from. */
export const NJANGI_SOURCE: 'provisional' | 'chapter19' = 'chapter19'

/** Reference values of chapter 19 (internal Njangi benchmarks, to calibrate on your own matches). */
export const NJANGI_TARGETS = {
  progression: 0.35, // (PROG + LINE) per pass attempted for 20 points
  penetration: 1.0, // (FINAL3 + 2 BOX) per possession for 20 points
  fixation: 0.25, // (FIX2 + SWITCH) per possession for 20 points
  reprise: 0.4, // REGAIN5 per loss for 20 points
  controleMin: 0.55, // conservation rate K that scores 0
  controleSpan: 0.3, // K = 0.85 scores 20
} as const

/** Anything with a code and a side can be scored: live MatchEvents and VideoTags alike. */
export interface Taggable { code: EventCode | 'NOTE'; side: 'us' | 'them' }

export interface NjangiResult {
  /** 0..100, one decimal (sum of the five rounded sub-indices) */
  total: number
  /** each 0..20, one decimal */
  sub: Record<SubKey, number>
  counts: Record<EventCode, number>
  /** PASSES = PASS_OK + PASS_LOST */
  passes: number
  /** PASS_OK / PASSES, 0..1 */
  passAccuracy: number
  /** POSS = PASS_LOST + LOSS + SHOT */
  possessions: number
  /** PERTES = PASS_LOST + LOSS */
  losses: number
  /** ACTIONS = PASS_OK + PASS_LOST + LOSS */
  actions: number
  /** K = PASS_OK / ACTIONS, the conservation rate, 0..1 */
  conservation: number
  /** REGAIN5 / PERTES, 0..1 */
  repriseRate: number
  /** (PROG + LINE) / PASSES */
  progressionRate: number
  /** (FINAL3 + 2 BOX) / POSS */
  penetrationRate: number
  /** (FIX2 + SWITCH) / POSS */
  fixationRate: number
  /** number of tagged events counted for this side */
  tagged: number
}

const cap = (v: number) => Math.max(0, Math.min(20, v))
const r1 = (v: number) => Math.round(v * 10) / 10
const ratio = (a: number, b: number) => (b > 0 ? a / b : 0)

export function countEvents(events: readonly Taggable[] | readonly MatchEvent[], side: 'us' | 'them' = 'us') {
  const counts = Object.fromEntries(EVENT_CODES.map((c) => [c, 0])) as Record<EventCode, number>
  for (const e of events as readonly Taggable[]) if (e.side === side && e.code !== 'NOTE') counts[e.code] = (counts[e.code] || 0) + 1
  return counts
}

/** The Indice from already summed counts (a season, several matches, a spreadsheet). */
export function njangiFromCounts(c: Record<EventCode, number>): NjangiResult {
  const T = NJANGI_TARGETS
  const passes = c.PASS_OK + c.PASS_LOST
  const losses = c.PASS_LOST + c.LOSS
  const possessions = c.PASS_LOST + c.LOSS + c.SHOT
  const actions = c.PASS_OK + c.PASS_LOST + c.LOSS
  const conservation = ratio(c.PASS_OK, actions)

  const progression = passes ? cap((20 * (c.PROG + c.LINE)) / (T.progression * passes)) : 0
  const penetration = possessions ? cap((20 * (c.FINAL3 + 2 * c.BOX)) / (T.penetration * possessions)) : 0
  const fixation = possessions ? cap((20 * (c.FIX2 + c.SWITCH)) / (T.fixation * possessions)) : 0
  const reprise = losses ? cap((20 * c.REGAIN5) / (T.reprise * losses)) : 0
  const controle = actions ? cap((20 * (conservation - T.controleMin)) / T.controleSpan) : 0

  const sub: Record<SubKey, number> = { progression: r1(progression), penetration: r1(penetration), fixation: r1(fixation), reprise: r1(reprise), controle: r1(controle) }
  const tagged = EVENT_CODES.reduce((a, k) => a + (c[k] || 0), 0)
  return {
    total: r1(sub.progression + sub.penetration + sub.fixation + sub.reprise + sub.controle),
    sub, counts: c, passes, passAccuracy: ratio(c.PASS_OK, passes), possessions, losses, actions, conservation,
    repriseRate: ratio(c.REGAIN5, losses), progressionRate: ratio(c.PROG + c.LINE, passes),
    penetrationRate: ratio(c.FINAL3 + 2 * c.BOX, possessions), fixationRate: ratio(c.FIX2 + c.SWITCH, possessions), tagged,
  }
}

export function computeNjangi(events: readonly Taggable[] | readonly MatchEvent[], side: 'us' | 'them' = 'us'): NjangiResult {
  return njangiFromCounts(countEvents(events, side))
}

/** Sum the counts of several event lists (for a season Indice: add codes, then compute). */
export function sumCounts(list: Record<EventCode, number>[]) {
  const out = Object.fromEntries(EVENT_CODES.map((c) => [c, 0])) as Record<EventCode, number>
  for (const c of list) for (const k of EVENT_CODES) out[k] += c[k] || 0
  return out
}

/**
 * Complementary benchmarks of chapter 19 (outside the Indice). They need the opponent's
 * PASS_OK, PASS_LOST and FINAL3 to be tagged too; null when they are not.
 *   possession share = our PASSES / (our PASSES + their PASSES)
 *   field tilt       = our FINAL3 / (our FINAL3 + their FINAL3)
 */
export function njangiExtras(events: readonly Taggable[] | readonly MatchEvent[]) {
  const us = countEvents(events, 'us'), them = countEvents(events, 'them')
  const pu = us.PASS_OK + us.PASS_LOST, pt = them.PASS_OK + them.PASS_LOST
  return {
    possessionShare: pt > 0 && pu + pt > 0 ? pu / (pu + pt) : null,
    fieldTilt: them.FINAL3 > 0 && us.FINAL3 + them.FINAL3 > 0 ? us.FINAL3 / (us.FINAL3 + them.FINAL3) : null,
  }
}

/** Drills that train each sub-index (chapter 19 table). */
export const DRILLS_FOR: Record<SubKey, string[]> = {
  progression: ['P05', 'S07', 'L02', 'R06'],
  penetration: ['F03', 'F05', 'G05', 'G01'],
  fixation: ['R02', 'S04', 'P07', 'F04'],
  reprise: ['R08', 'T01', 'T03', 'F06'],
  controle: ['R01', 'R07', 'P01', 'P10'],
}

/** The intention to train in the week when a sub-index is the weakest (used with planWeek). */
export const SUB_INTENTION: Record<SubKey, Intention> = {
  progression: 'progresser',
  penetration: 'finir',
  fixation: 'fixer',
  reprise: 'reprendre',
  controle: 'respirer',
}

/** Sub-indices sorted from weakest to strongest (ties keep SUB_KEYS order). */
export function rankSubs(r: NjangiResult): SubKey[] {
  return [...SUB_KEYS].sort((a, b) => r.sub[a] - r.sub[b] || SUB_KEYS.indexOf(a) - SUB_KEYS.indexOf(b))
}

/** Level of one sub-index: 0 = to build (under 8), 1 = improving (8 to 13), 2 = solid (13 and more, the model zone of chapter 19). */
export const subLevel = (v: number): 0 | 1 | 2 => (v < 8 ? 0 : v < 13 ? 1 : 2)

/** Reading bands of chapter 19: under 35, 35, 50, 65, 80 and more. */
export const NJANGI_BANDS = [0, 35, 50, 65, 80, 100]
export const njangiBand = (total: number): 0 | 1 | 2 | 3 | 4 => (total < 35 ? 0 : total < 50 ? 1 : total < 65 ? 2 : total < 80 ? 3 : 4)

export function njangiLabel(total: number, lang: Lang = 'fr') {
  const fr = ['Possession sans intention', 'Intention fragile', 'Njangi en construction', 'Njangi solide', 'Njangi de champion']
  const en = ['Possession without purpose', 'Fragile purpose', 'Njangi in progress', 'Solid Njangi', 'Championship Njangi']
  return (lang === 'fr' ? fr : en)[njangiBand(total)]
}

/** Display an Indice or a sub-index with one decimal ("65,1" in French, "65.1" in English). */
export function fmtNjangi(v: number, lang: Lang = 'fr') {
  return v.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}
