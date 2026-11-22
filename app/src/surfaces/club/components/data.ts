// What the club space reads: the club row, every team, player, member, match, coded event and video of this device.
// Everything stays local (IndexedDB). Pure helpers below compute the season figures the tabs show.
import { db } from '../../../lib/db'
import { useLiveQuery } from '../../../lib/hooks'
import { countEvents, njangiFromCounts, rankSubs, sumCounts, type NjangiResult, type SubKey } from '../../../lib/njangi'
import { minutesOf, seasonOf, type Season } from '../../../lib/journey'
import type { Clip, Club, EventCode, Match, MatchEvent, Member, Player, Team, VideoProject } from '../../../lib/types'
import { todayISO } from '../../../lib/util'

export interface ClubData {
  ready: boolean
  club: Club | null
  teams: Team[]
  players: Player[]
  members: Member[]
  matches: Match[]
  events: MatchEvent[]
  videos: VideoProject[]
}

const EMPTY: ClubData = { ready: false, club: null, teams: [], players: [], members: [], matches: [], events: [], videos: [] }

export function useClubData(): ClubData {
  return useLiveQuery(async () => {
    const [club, teams, players, members, matches, events, videos] = await Promise.all([
      db.club.get('club'), db.teams.orderBy('createdAt').toArray(), db.players.toArray(), db.members.toArray(),
      db.matches.toArray(), db.events.toArray(), db.videos.orderBy('createdAt').reverse().toArray(),
    ])
    return { ready: true, club: club ?? null, teams, players, members, matches, events, videos }
  }, [], EMPTY)
}

export const currentSeason = (): Season => seasonOf(todayISO())

export function groupBy<T>(list: readonly T[], key: (x: T) => string | undefined) {
  const m = new Map<string, T[]>()
  for (const x of list) { const k = key(x); if (!k) continue; const a = m.get(k); if (a) a.push(x); else m.set(k, [x]) }
  return m
}

/** Initials for the crest: the meaningful words of the name (Étoile de la Côte gives EC). */
export function initials(name: string) {
  const skip = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'et', 'of', 'the', 'fc', 'ac', 'as'])
  const words = name.replace(/[’']/g, ' ').split(/[\s,.-]+/).filter((w) => w && !skip.has(w.toLowerCase()))
  const s = words.slice(0, 3).map((w) => w[0]).join('').toUpperCase()
  return s || name.slice(0, 2).toUpperCase()
}

/** Text colour that reads on a given background (hex). */
export function readableOn(hex: string) {
  const h = hex.replace('#', '')
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 0.45 ? '#12211A' : '#FFFFFF'
}

export interface TeamSeason {
  team: Team
  players: Player[]
  played: Match[] // done this season, newest first
  coded: Match[] // done this season with coded events
  next?: Match
  result: NjangiResult | null
  weakest?: SubKey
}

export function teamSeason(team: Team, data: Pick<ClubData, 'players' | 'matches'>, eventsByMatch: Map<string, MatchEvent[]>, season = currentSeason()): TeamSeason {
  const own = data.matches.filter((m) => m.teamId === team.id)
  const played = own.filter((m) => m.status === 'done' && m.date >= season.start && m.date <= season.end).sort((a, b) => b.date.localeCompare(a.date))
  const coded = played.filter((m) => (eventsByMatch.get(m.id)?.length ?? 0) > 0)
  const today = todayISO()
  const next = own.filter((m) => m.status !== 'done' && m.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0]
  const result = coded.length ? njangiFromCounts(sumCounts(coded.map((m) => countEvents(eventsByMatch.get(m.id) ?? [], 'us')))) : null
  return { team, players: data.players.filter((p) => p.teamId === team.id), played, coded, next, result, weakest: result ? rankSubs(result)[0] : undefined }
}

export const outcome = (m: Match): 'W' | 'D' | 'L' => (m.scoreUs > m.scoreThem ? 'W' : m.scoreUs < m.scoreThem ? 'L' : 'D')

/* ---------------- videos ---------------- */

export const videoKind = (v: VideoProject) => v.kind ?? 'match'
/** The team a video belongs to: its own teamId, or the team of its match. */
export const videoTeamId = (v: VideoProject, matchesById: Map<string, Match>) => v.teamId ?? (v.matchId ? matchesById.get(v.matchId)?.teamId : undefined)
/** Coded: actions coded on the video (match events with a video time) or its own codes. */
export function videoCoded(v: VideoProject, eventsByMatch: Map<string, MatchEvent[]>) {
  const own = v.tags.filter((t) => t.code !== 'NOTE').length
  const ev = v.matchId ? (eventsByMatch.get(v.matchId) ?? []).filter((e) => e.videoT != null).length : 0
  return own + ev
}
export const videoSourceGroup = (v: VideoProject): 'link' | 'file' | 'hosted' => (v.source === 'hosted' ? 'hosted' : v.source === 'youtube' || v.source === 'facebook' ? 'link' : 'file')

/** Highlight clip ids are `${videoId}:${clipId}`. */
export const clipKey = (videoId: string, clipId: string) => `${videoId}:${clipId}`
export function resolveClip(key: string, videos: readonly VideoProject[]): { video: VideoProject; clip: Clip } | null {
  const i = key.indexOf(':')
  if (i < 0) return null
  const video = videos.find((v) => v.id === key.slice(0, i))
  const clip = video?.clips?.find((c) => c.id === key.slice(i + 1))
  return video && clip ? { video, clip } : null
}

/* ---------------- members ---------------- */

/** The invite code is the member id without its prefix: the link /rejoindre-club/<code> names one invitation. */
export const inviteCode = (m: Pick<Member, 'id'>) => m.id.replace(/^mb_/, '')
export const inviteUrl = (m: Pick<Member, 'id'>) => `${location.origin}/rejoindre-club/${inviteCode(m)}`
export const newMemberId = () => `mb_${Math.random().toString(36).slice(2, 6)}${Date.now().toString(36).slice(-4)}`

/* ---------------- one player's season (recruitment profile) ---------------- */

export interface PlayerSeason {
  matches: number
  minutes: number
  goals: number
  counts: Record<EventCode, number>
  per90: (code: EventCode) => number
  /** share of the team's actions of each sub-index made by this player, 0..1 (null when the team coded none) */
  shares: Record<SubKey, number | null>
  actions: Record<SubKey, number>
  coded: number
}

const SUB_ACTIONS: Record<SubKey, EventCode[]> = { progression: ['PROG', 'LINE'], penetration: ['FINAL3', 'BOX'], fixation: ['FIX2', 'SWITCH'], reprise: ['REGAIN5'], controle: ['PASS_OK'] }

export function playerSeason(player: Player, matches: readonly Match[], eventsByMatch: Map<string, MatchEvent[]>, season = currentSeason()): PlayerSeason {
  const played = matches.filter((m) => m.teamId === player.teamId && m.status === 'done' && m.date >= season.start && m.date <= season.end)
  let mins = 0, n = 0, coded = 0
  const mine: MatchEvent[] = [], team: MatchEvent[] = []
  for (const m of played) {
    const ev = eventsByMatch.get(m.id) ?? []
    const own = ev.filter((e) => e.side === 'us' && e.playerId === player.id)
    const mm = minutesOf(m, player.id) || (own.length ? Math.round(m.halfMinutes / 2) : 0)
    if (mm > 0) { n += 1; mins += mm }
    if (ev.length) { coded += 1; team.push(...ev); mine.push(...own) }
  }
  const counts = countEvents(mine, 'us')
  const teamCounts = countEvents(team, 'us')
  const sum = (c: Record<EventCode, number>, codes: EventCode[]) => codes.reduce((a, k) => a + (c[k] || 0), 0)
  const actions = Object.fromEntries((Object.keys(SUB_ACTIONS) as SubKey[]).map((k) => [k, sum(counts, SUB_ACTIONS[k])])) as Record<SubKey, number>
  const shares = Object.fromEntries((Object.keys(SUB_ACTIONS) as SubKey[]).map((k) => { const tot = sum(teamCounts, SUB_ACTIONS[k]); return [k, tot ? actions[k] / tot : null] })) as Record<SubKey, number | null>
  return { matches: n, minutes: mins, goals: counts.GOAL, counts, per90: (code) => (mins > 0 ? (counts[code] * 90) / mins : 0), shares, actions, coded }
}

/** What makes a recruitment profile complete (no photo needed). */
export const COMPLETENESS = ['number', 'position', 'foot', 'birthYear', 'height', 'bio', 'clips', 'indice'] as const
export type CompletenessKey = (typeof COMPLETENESS)[number]
export function completeness(p: Player, hasIndice: boolean) {
  const r = p.recruit
  const done: Record<CompletenessKey, boolean> = {
    number: p.number != null, position: !!p.position, foot: !!p.foot, birthYear: !!p.birthYear, height: !!r?.heightCm,
    bio: (r?.bio?.trim().length ?? 0) >= 30, clips: (r?.highlightClipIds?.length ?? 0) > 0, indice: hasIndice,
  }
  const n = COMPLETENESS.filter((k) => done[k]).length
  return { done, n, pct: Math.round((n / COMPLETENESS.length) * 100) }
}

/** The public link of a recruitment profile (works on this device until accounts exist). */
export const publicUrl = (playerId: string) => `${location.origin}/profil/${playerId}`
