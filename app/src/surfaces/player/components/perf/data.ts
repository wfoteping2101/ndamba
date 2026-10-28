// The performance space (players of 16 and over): form, load, match week, last match.
// Form and load follow Le Code Njangi, chapter 29: a morning questionnaire of five items from 1 to 5,
// and the perceived exertion (0 to 10) about thirty minutes after the session, times the minutes,
// in arbitrary units. The player is compared with himself, never with a teammate.
import { useMemo } from 'react'
import { db } from '../../../../lib/db'
import { useLiveQuery } from '../../../../lib/hooks'
import { useSession } from '../../../../lib/session'
import { computeNjangi, type NjangiResult } from '../../../../lib/njangi'
import { seasonOf, seasonSummary, type MatchLine } from '../../../../lib/journey'
import { addDays, nowISO } from '../../../../lib/util'
import type { Match, MatchEvent, MD, Score5, VideoProject, Wellness } from '../../../../lib/types'
import { useJourney } from '../../../team/components/journey/bits'
import { usePlayerTier } from '../../tier'
import { useTeamCalendar, useToday } from '../data'

/* ---------------- form ---------------- */

export const FORM_KEYS = ['sleep', 'fatigue', 'soreness', 'mood', 'stress'] as const
export type FormKey = (typeof FORM_KEYS)[number]
export const FORM_MAX = 25

export const hasForm = (w?: Partial<Wellness> | null): w is Wellness & Record<FormKey, Score5> => !!w && FORM_KEYS.every((k) => !!w[k])
/** The five items added up, out of 25 (higher is better). */
export const formScore = (w?: Partial<Wellness> | null) => (hasForm(w) ? FORM_KEYS.reduce((a, k) => a + (w[k] as number), 0) : null)
export type FormBand = 'fresh' | 'ok' | 'low'
export const formBand = (score: number): FormBand => (score >= 20 ? 'fresh' : score >= 15 ? 'ok' : 'low')
export const FORM_TONE: Record<FormBand, { text: string; bg: string; bar: string }> = {
  fresh: { text: 'text-forest-700', bg: 'bg-forest-50', bar: 'bg-forest-600' },
  ok: { text: 'text-sun-700', bg: 'bg-sun-50', bar: 'bg-sun-500' },
  low: { text: 'text-terra-700', bg: 'bg-terra-50', bar: 'bg-terra-500' },
}

/* ---------------- load ---------------- */

/** Session load: perceived exertion times minutes (arbitrary units). */
export const loadOf = (w?: Partial<Wellness> | null) => (w && typeof w.rpe === 'number' && w.minutes ? Math.round(w.rpe * w.minutes) : 0)
export type LoadBand = 'spike' | 'steady' | 'light'
/** « Nettement plus haute » than the previous weeks: more than 30 % above their average. */
export const loadBand = (delta: number): LoadBand => (delta > 0.3 ? 'spike' : delta < -0.3 ? 'light' : 'steady')

export function formStats(logs: readonly Wellness[], today: string) {
  const scored = logs.filter(hasForm).sort((a, b) => a.date.localeCompare(b.date))
  const todays = logs.find((l) => l.date === today) ?? null
  const before = scored.filter((l) => l.date < today && l.date >= addDays(today, -28))
  const baseline = before.length >= 5 ? before.reduce((a, l) => a + formScore(l)!, 0) / before.length : null
  // chapter 29: tell the staff when the form scores drop several days in a row
  const last3 = scored.filter((l) => l.date >= addDays(today, -4)).slice(-3)
  const dropping = baseline !== null && last3.length === 3 && last3.every((l) => formScore(l)! <= baseline - 2)
  const series = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13)).map((d) => ({ date: d, score: formScore(scored.find((l) => l.date === d)) }))
  return { todays, todayScore: formScore(todays), baseline, dropping, series, count28: before.length }
}

export function loadStats(logs: readonly Wellness[], today: string) {
  const byDate = new Map<string, number>()
  for (const l of logs) byDate.set(l.date, (byDate.get(l.date) ?? 0) + loadOf(l))
  const day = (d: string) => byDate.get(d) ?? 0
  /** k = 0: the last seven days, today included; k = 1 to 3: the three weeks before. */
  const block = (k: number) => Array.from({ length: 7 }, (_, i) => day(addDays(today, -7 * k - i))).reduce((a, b) => a + b, 0)
  const current = block(0)
  const prev = [block(1), block(2), block(3)]
  const known = prev.filter((v) => v > 0)
  const prevAvg = known.length ? known.reduce((a, b) => a + b, 0) / known.length : null
  const delta = prevAvg ? (current - prevAvg) / prevAvg : null
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13)).map((d) => ({ date: d, load: day(d) }))
  const sessions7 = logs.filter((l) => l.date > addDays(today, -7) && l.date <= today && loadOf(l) > 0).length
  return { current, prev, prevAvg, delta, band: delta === null ? null : loadBand(delta), days, sessions7, weeks: [prev[2], prev[1], prev[0], current] }
}

export const wellnessId = (date: string) => `wl_${date}`

/** Merge a part of today's report (the questionnaire, or the exertion after the session). */
export async function saveWellness(date: string, patch: Partial<Omit<Wellness, 'id' | 'date' | 'createdAt'>>) {
  const id = wellnessId(date)
  const cur = await db.wellness.get(id)
  const now = nowISO()
  await db.wellness.put({ ...(cur ?? { id, date, createdAt: now }), ...patch, id, date, updatedAt: now })
}

/* ---------------- the match week ---------------- */

/** Usual intensity of each day of the match week (1 to 4), from the example week of chapter 29. */
export const MD_INTENSITY: Partial<Record<MD | 'match', number>> = { 'MD+1': 1, 'MD-4': 3, 'MD-3': 3, 'MD-2': 2, 'MD-1': 1, match: 4 }

/* ---------------- everything the pages need ---------------- */

export interface LastMatch { line: MatchLine; events: MatchEvent[]; result: NjangiResult | null }

export function usePerformance() {
  const { profile, team } = useSession()
  const { me, ready, age, tier } = usePlayerTier()
  const today = useToday()
  const journey = useJourney(me?.id)
  const cal = useTeamCalendar(team)
  const logs = useLiveQuery(() => db.wellness.orderBy('date').toArray(), [], null as Wellness[] | null)
  const mine = useMemo(() => (logs ?? []).filter((w) => !w.playerId || !me || w.playerId === me.id), [logs, me])

  const played = journey ? journey.lines.filter((l) => l.minutes > 0) : []
  const lastLine = played[played.length - 1]
  const lastId = lastLine?.match.id
  const events = useLiveQuery(async () => (lastId ? db.events.where('matchId').equals(lastId).toArray() : []), [lastId], [] as MatchEvent[])
  const matchIds = (journey?.lines ?? []).map((l) => l.match.id).join(',')
  const videos = useLiveQuery(async () => (matchIds ? db.videos.where('matchId').anyOf(matchIds.split(',')).toArray() : []), [matchIds], [] as VideoProject[])

  const season = seasonOf(today)
  const summary = useMemo(() => (journey ? seasonSummary(journey, season) : null), [journey, season.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const form = useMemo(() => formStats(mine, today), [mine, today])
  const load = useMemo(() => loadStats(mine, today), [mine, today])
  const matches: Match[] = cal?.matches ?? []
  const next = matches.find((m) => m.status !== 'done' && m.date >= today)
  const last: LastMatch | null = lastLine
    ? { line: lastLine, events: events.filter((e) => e.matchId === lastLine.match.id), result: lastLine.tagged ? computeNjangi(events.filter((e) => e.matchId === lastLine.match.id)) : null }
    : null

  return {
    ready: ready && logs !== null && cal !== null && (!me || journey !== undefined),
    profile, team, me, age, tier, today, journey: journey ?? null, cal, sessions: cal?.sessions ?? [], matches, next, last, videos,
    summary, season, logs: mine, form, load,
  }
}

export type PerfData = ReturnType<typeof usePerformance>

/** Minute of a tagged action in the match (1 and up). */
export const eventMinute = (e: Pick<MatchEvent, 'half' | 't'>, halfMinutes: number) => (e.half - 1) * halfMinutes + Math.floor(e.t / 60) + 1
