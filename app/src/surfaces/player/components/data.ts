// Live data hooks and small date helpers shared by the home page and the player space.
import { useEffect, useMemo, useRef, useState } from 'react'
import { db } from '../../../lib/db'
import { useLiveQuery } from '../../../lib/hooks'
import { addDays, daysBetween, todayISO } from '../../../lib/util'
import type { ChallengeLog, Match, MD, Role, Session, Team } from '../../../lib/types'
import { computeProgress, dailyChallenges, todayBests } from '../challenges'

/** Coaches, analysts, managers and federations get the staff dashboard; players and parents the player one. */
export const isPlayerRole = (r?: Role) => r === 'player' || r === 'parent'

/** Today's date, refreshed when the tab comes back after midnight. */
export function useToday() {
  const [today, setToday] = useState(todayISO())
  useEffect(() => {
    const tick = () => setToday(todayISO())
    const id = window.setInterval(tick, 60_000)
    document.addEventListener('visibilitychange', tick)
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', tick) }
  }, [])
  return today
}

/** Challenge logs, computed XP, level, streak, today's bests and the three daily challenges. */
export function usePlayerData() {
  const today = useToday()
  const logs = useLiveQuery(() => db.challenges.toArray(), [], null as ChallengeLog[] | null)
  const progress = useMemo(() => computeProgress(logs ?? [], today), [logs, today])
  const bests = useMemo(() => todayBests(logs ?? [], today), [logs, today])
  const daily = useMemo(() => dailyChallenges(today), [today])
  return { loading: logs === null, logs: logs ?? [], progress, bests, daily, today }
}

/** Returns the level just reached (once), so the page can celebrate it. Never fires on first load. */
export function useLevelUp(level: number, loading: boolean) {
  const prev = useRef<number | null>(null)
  const [reached, setReached] = useState<number | null>(null)
  useEffect(() => {
    if (loading) return
    if (prev.current !== null && level > prev.current) {
      setReached(level)
      const id = window.setTimeout(() => setReached(null), 6000)
      prev.current = level
      return () => window.clearTimeout(id)
    }
    prev.current = level
  }, [level, loading])
  return { reached, dismiss: () => setReached(null) }
}

/** Sessions and matches of the active team (or the ones without a team when there is none). */
export function useTeamCalendar(team: Team | null) {
  const teamId = team?.id
  return useLiveQuery(async () => {
    const [sessions, matches] = await Promise.all([db.sessions.toArray(), db.matches.toArray()])
    const mine = <T extends { teamId?: string }>(x: T) => (teamId ? x.teamId === teamId : !x.teamId)
    return {
      sessions: sessions.filter(mine).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)),
      matches: matches.filter(mine).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))),
    }
  }, [teamId], null as { sessions: Session[]; matches: Match[] } | null)
}

export type DayTag = MD | 'match' | null

/** Where a date sits in the match week: MD-4 to MD-1 before a match, "match" on the day, MD+1 the day after. */
export function dayTag(date: string, matches: Match[]): DayTag {
  if (matches.some((m) => m.date === date)) return 'match'
  const next = matches.find((m) => m.date > date)
  if (next) {
    const d = daysBetween(date, next.date)
    if (d >= 1 && d <= 4) return `MD-${d}` as MD
  }
  if (matches.some((m) => m.date === addDays(date, -1) && m.status === 'done')) return 'MD+1'
  return null
}

/** The session type to suggest for a date with no session. */
export function suggestedMd(date: string, matches: Match[], ageGroup?: string): MD | null {
  const tag = dayTag(date, matches)
  if (tag === 'match') return null
  if (tag) return tag
  const age = Number((ageGroup || '').match(/U(\d+)/i)?.[1] ?? 99)
  return age <= 13 ? 'youth' : 'MD-3'
}

/** Milliseconds until a match kicks off (local time), or null without a time. */
export function msToKickoff(m: Match, now = new Date()) {
  const [y, mo, d] = m.date.split('-').map(Number)
  const [h, mi] = (m.time || '').split(':').map(Number)
  if (!m.time || Number.isNaN(h)) return null
  return new Date(y, mo - 1, d, h, mi || 0).getTime() - now.getTime()
}

/** A clock that ticks every `ms` (for countdowns). */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), ms)
    return () => window.clearInterval(id)
  }, [ms])
  return now
}

/** True when the user asked the system to reduce motion. */
export function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(() => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
  })
  useEffect(() => {
    let mq: MediaQueryList
    try { mq = window.matchMedia('(prefers-reduced-motion: reduce)') } catch { return }
    const on = () => setReduce(mq.matches)
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])
  return reduce
}

/** Scroll to the element named in the URL hash once it exists (after data has loaded). */
export function useScrollToHash(hash: string, ready: boolean, onBeforeScroll?: (id: string) => void) {
  const done = useRef('')
  useEffect(() => {
    const id = decodeURIComponent(hash.replace(/^#/, ''))
    if (!id || !ready || done.current === hash) return
    onBeforeScroll?.(id)
    let tries = 0
    const tryScroll = () => {
      const el = document.getElementById(id)
      if (el) {
        done.current = hash
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        const glow = ['outline', 'outline-2', 'outline-offset-4', 'outline-terra-300']
        el.classList.add(...glow)
        window.setTimeout(() => el.classList.remove(...glow), 2400)
      } else if (tries++ < 20) window.setTimeout(tryScroll, 60)
    }
    window.setTimeout(tryScroll, 30)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, ready])
}
