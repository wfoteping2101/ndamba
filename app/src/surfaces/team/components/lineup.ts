// Pure helpers for the team surface: lines, names, lineup edits. No React here.
import type { LineupSlot, Match, Player, SkillKey } from '../../../lib/types'
import { formationSlots, type Slot } from '../../../lib/formations'
import { skillAvg } from '../../../lib/actions'

export const SKILL_KEYS: SkillKey[] = ['scan', 'controle', 'passe', 'conduite', 'dribble-njangi', 'appels', 'communication', 'protection', 'contre-pression', 'decision']

export type Line = 'gk' | 'def' | 'mid' | 'att'
export const LINES: Line[] = ['gk', 'def', 'mid', 'att']
export const lineOf = (position: string): Line =>
  position === 'GK' ? 'gk' : position === 'CB' || position === 'FB' ? 'def' : position === 'W' || position === 'ST' ? 'att' : 'mid'

/** Shirt name: the nickname between « » or quotes if there is one, otherwise the last word. */
export function shortName(name: string) {
  const nick = name.match(/[«"“]\s*([^»"”]+?)\s*[»"”]/)
  if (nick) return nick[1]
  const parts = name.trim().split(/\s+/)
  return parts.length > 1 ? parts[parts.length - 1] : parts[0] || ''
}

export const initials = (name: string) =>
  name.replace(/[«»"“”]/g, ' ').split(/\s+/).filter((w) => w.length > 2 || /^[A-Z]/.test(w)).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || name.slice(0, 2).toUpperCase()

export const byNumber = (a: Player, b: Player) => (a.number ?? 999) - (b.number ?? 999) || a.name.localeCompare(b.name)

/** Which outfield positions fit a formation role, best first (same table as lib/actions autoLineup). */
export const ROLE_FIT: Record<string, string[]> = { GK: ['GK'], CB: ['CB', 'FB', 'DM'], FB: ['FB', 'W', 'CB'], DM: ['DM', 'CM', 'CB'], CM: ['CM', 'DM', 'AM'], AM: ['AM', 'CM', 'W'], W: ['W', 'AM', 'ST', 'FB'], ST: ['ST', 'W', 'AM'] }

export function fitScore(p: Player, role: string) {
  const fits = ROLE_FIT[role] || [role]
  if (role === 'GK') return p.position === 'GK' ? 100 : -100
  if (p.position === 'GK') return -100
  const rank = fits.indexOf(p.position)
  return (rank === -1 ? 0 : (fits.length - rank) * 10) + skillAvg(p)
}

export const isSuggested = (p: Player, role: string) => (ROLE_FIT[role] || [role]).slice(0, 2).includes(p.position)

/** Make sure the lineup has exactly one entry per formation slot, in slot order. */
export function normalizeLineup(lineup: LineupSlot[], slots: Slot[]): LineupSlot[] {
  return slots.map((s) => ({ slot: s.id, playerId: lineup.find((l) => l.slot === s.id)?.playerId }))
}

/**
 * Move a lineup to another formation (or format) while keeping the coach's choices:
 * same slot id keeps its player, displaced starters go to the best-fitting free slot, the rest go to the bench,
 * and remaining holes are filled from the bench by position.
 */
export function remapLineup(lineup: LineupSlot[], subs: string[], format: number, formation: string, players: Player[]) {
  const slots = formationSlots(format, formation)
  const byId = new Map(players.map((p) => [p.id, p]))
  const placed = new Set<string>()
  const next: LineupSlot[] = slots.map((s) => {
    const pid = lineup.find((l) => l.slot === s.id)?.playerId
    if (pid && byId.has(pid)) { placed.add(pid); return { slot: s.id, playerId: pid } }
    return { slot: s.id }
  })
  const fill = (pool: string[]) => {
    for (const entry of next) {
      if (entry.playerId) continue
      const role = slots.find((s) => s.id === entry.slot)!.role
      let best = -1, bestScore = -50
      pool.forEach((pid, i) => { const p = byId.get(pid); if (!p || placed.has(pid)) return; const sc = fitScore(p, role); if (sc > bestScore) { bestScore = sc; best = i } })
      if (best >= 0) { const pid = pool[best]; entry.playerId = pid; placed.add(pid) }
    }
  }
  const displaced = lineup.map((l) => l.playerId).filter((pid): pid is string => !!pid && !placed.has(pid))
  fill(displaced)
  const leftovers = displaced.filter((pid) => !placed.has(pid))
  const bench = [...leftovers, ...subs.filter((pid) => !placed.has(pid) && !leftovers.includes(pid))]
  fill(bench)
  return { lineup: next, subs: bench.filter((pid) => !placed.has(pid)) }
}

/** Put a player in a slot. A starter elsewhere swaps places; a sub or unselected player replaces the occupant, who goes to the bench. */
export function assignSlot(lineup: LineupSlot[], subs: string[], slotId: string, playerId: string | undefined) {
  const prev = lineup.find((l) => l.slot === slotId)?.playerId
  if (prev === playerId) return { lineup, subs }
  let nextSubs = [...subs]
  const otherSlot = playerId ? lineup.find((l) => l.playerId === playerId)?.slot : undefined
  const nextLineup = lineup.map((l) => {
    if (l.slot === slotId) return { slot: l.slot, playerId }
    if (otherSlot && l.slot === otherSlot) return { slot: l.slot, playerId: prev }
    return l
  })
  if (!otherSlot) {
    const idx = playerId ? nextSubs.indexOf(playerId) : -1
    if (idx >= 0) nextSubs.splice(idx, 1)
    if (prev) { if (idx >= 0) nextSubs.splice(idx, 0, prev); else nextSubs = [prev, ...nextSubs] }
  }
  return { lineup: nextLineup, subs: nextSubs }
}

export function swapSlots(lineup: LineupSlot[], a: string, b: string) {
  const pa = lineup.find((l) => l.slot === a)?.playerId
  const pb = lineup.find((l) => l.slot === b)?.playerId
  return lineup.map((l) => (l.slot === a ? { slot: a, playerId: pb } : l.slot === b ? { slot: b, playerId: pa } : l))
}

export type Result = 'W' | 'D' | 'L'
export const resultOf = (m: Pick<Match, 'scoreUs' | 'scoreThem'>): Result => (m.scoreUs > m.scoreThem ? 'W' : m.scoreUs < m.scoreThem ? 'L' : 'D')

export const defaultHalf = (format: number) => (format === 11 ? 45 : format >= 8 ? 30 : 20)

/** The match's own call-up message. Stored on the match record (see report: `convocation?: string` on Match). */
export type MatchWithConvo = Match & { convocation?: string }

export const fmtAvg = (v: number, lang: 'fr' | 'en') => v.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
