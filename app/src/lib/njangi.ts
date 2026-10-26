// The Indice Njangi: did the team possess WITH PURPOSE? 0 to 100, five sub-indices of 0 to 20.
// Formulas follow La Méthode Njangi, chapter 19 (owner of this file: the analysis surface).
// PROVISIONAL implementation: the analysis surface aligns it exactly with coach/chapters/19-*.md.
import type { EventCode, Lang, MatchEvent } from './types'

export const EVENT_CODES: EventCode[] = ['PASS_OK', 'PASS_LOST', 'PROG', 'LINE', 'FINAL3', 'BOX', 'FIX2', 'SWITCH', 'LOSS', 'REGAIN5', 'REGAIN', 'SHOT', 'SHOT_IN', 'GOAL']

export type SubKey = 'progression' | 'penetration' | 'fixation' | 'reprise' | 'controle'
export const SUB_KEYS: SubKey[] = ['progression', 'penetration', 'fixation', 'reprise', 'controle']

export interface NjangiResult {
  total: number // 0..100
  sub: Record<SubKey, number> // each 0..20
  counts: Record<EventCode, number>
  passes: number
  passAccuracy: number // 0..1
  possessions: number
}

const cap = (v: number) => Math.max(0, Math.min(20, v))
const r1 = (v: number) => Math.round(v * 10) / 10

export function countEvents(events: MatchEvent[], side: 'us' | 'them' = 'us') {
  const counts = Object.fromEntries(EVENT_CODES.map((c) => [c, 0])) as Record<EventCode, number>
  for (const e of events) if (e.side === side) counts[e.code] = (counts[e.code] || 0) + 1
  return counts
}

export function computeNjangi(events: MatchEvent[], side: 'us' | 'them' = 'us'): NjangiResult {
  const c = countEvents(events, side)
  const passes = c.PASS_OK + c.PASS_LOST
  const possessions = Math.max(1, c.LOSS + c.PASS_LOST + c.SHOT)
  const progression = cap((20 * (c.PROG + c.LINE)) / Math.max(1, 0.35 * passes))
  const penetration = cap((20 * (c.FINAL3 + 2 * c.BOX)) / Math.max(1, 1.2 * possessions))
  const fixation = cap((20 * (c.FIX2 + c.SWITCH)) / Math.max(1, 0.25 * possessions))
  const losses = c.LOSS + c.PASS_LOST
  const reprise = cap((20 * c.REGAIN5) / Math.max(1, 0.5 * losses))
  const controle = cap(20 * (passes ? c.PASS_OK / passes : 0) * 1.15 - 3)
  const sub = { progression: r1(progression), penetration: r1(penetration), fixation: r1(fixation), reprise: r1(reprise), controle: r1(controle) }
  return { total: Math.round(sub.progression + sub.penetration + sub.fixation + sub.reprise + sub.controle), sub, counts: c, passes, passAccuracy: passes ? c.PASS_OK / passes : 0, possessions }
}

/** Drills that train each sub-index (codes from La Méthode Njangi). */
export const DRILLS_FOR: Record<SubKey, string[]> = {
  progression: ['P05', 'S07', 'L02', 'R06'],
  penetration: ['F03', 'F05', 'G05', 'G01'],
  fixation: ['R02', 'S04', 'P07', 'F04'],
  reprise: ['R08', 'T01', 'T03', 'F06'],
  controle: ['R01', 'R07', 'P01', 'P10'],
}

export function njangiLabel(total: number, lang: Lang = 'fr') {
  const fr = ['Possession sans intention', 'Intention fragile', 'Njangi en construction', 'Njangi solide', 'Njangi de champion']
  const en = ['Possession without purpose', 'Fragile purpose', 'Njangi in progress', 'Solid Njangi', 'Championship Njangi']
  const i = total < 35 ? 0 : total < 50 ? 1 : total < 65 ? 2 : total < 80 ? 3 : 4
  return (lang === 'fr' ? fr : en)[i]
}
