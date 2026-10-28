// Data helpers shared by the hub, the report and the video pages.
import { useEffect, useState } from 'react'
import { db } from '../../../lib/db'
import { useLiveQuery } from '../../../lib/hooks'
import { computeNjangi, type NjangiResult } from '../../../lib/njangi'
import type { Match, MatchEvent } from '../../../lib/types'

export interface TeamAnalysis {
  ready: boolean
  matches: Match[]
  events: Map<string, MatchEvent[]>
}

/** All matches of a team with their events, live. */
export function useTeamAnalysis(teamId?: string): TeamAnalysis {
  return useLiveQuery<TeamAnalysis>(async () => {
    if (!teamId) return { ready: true, matches: [] as Match[], events: new Map<string, MatchEvent[]>() }
    const matches = await db.matches.where('teamId').equals(teamId).toArray()
    const ids = matches.map((m) => m.id)
    const all = ids.length ? await db.events.where('matchId').anyOf(ids).toArray() : []
    const events = new Map<string, MatchEvent[]>()
    for (const e of all) { const l = events.get(e.matchId); if (l) l.push(e); else events.set(e.matchId, [e]) }
    return { ready: true, matches, events }
  }, [teamId], { ready: false, matches: [], events: new Map() })
}

export const matchKey = (m: Match) => `${m.date} ${m.time || '99:99'} ${m.createdAt}`

/** Matches that carry tags, oldest first, with their Indice. */
export function analysedMatches(a: TeamAnalysis): { match: Match; events: MatchEvent[]; result: NjangiResult }[] {
  return a.matches
    .filter((m) => (a.events.get(m.id)?.length ?? 0) > 0)
    .sort((x, y) => matchKey(x).localeCompare(matchKey(y)))
    .map((match) => { const events = a.events.get(match.id)!; return { match, events, result: computeNjangi(events) } })
}

/** The analysed match just before this one (same team), if any. */
export function previousAnalysed(a: TeamAnalysis, match: Match) {
  const list = analysedMatches(a).filter((x) => x.match.id !== match.id && matchKey(x.match) < matchKey(match))
  return list[list.length - 1] ?? null
}

/** Copy text to the clipboard, with a fallback for older Android browsers. */
export async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true } catch { /* fallback below */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'
    document.body.appendChild(ta); ta.select()
    const ok = document.execCommand('copy'); ta.remove(); return ok
  } catch { return false }
}

/** A file-name friendly slug. */
export const slug = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48).replace(/^-+|-+$/g, '') || 'export'

/** A CSS media query as React state. */
export function useMedia(q: string) {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const mq = window.matchMedia(q)
    const on = () => setM(mq.matches)
    mq.addEventListener('change', on); on()
    return () => mq.removeEventListener('change', on)
  }, [q])
  return m
}
