// Parcours: the journey of each player over the seasons, from a U9 child to a senior professional.
// Pure helpers (seasons, age stage, minutes, stats, timeline, summaries) and the writes the pages share:
// dated evaluations of the ten competences (Le Code Njangi, chapter 25), observations, attendance,
// objectives (1 to 3 per cycle of six to eight weeks) and milestones.
import { db } from './db'
import type {
  Attendance, AttendanceStatus, Evaluation, EventCode, Match, MatchEvent, Milestone, NjangiSub, Objective,
  Observation, ObsTone, Player, Session, SkillKey, Team,
} from './types'
import { addDays, nowISO, todayISO, uid, weekStart } from './util'

export const SKILL_KEYS: SkillKey[] = ['scan', 'controle', 'passe', 'conduite', 'dribble-njangi', 'appels', 'communication', 'protection', 'contre-pression', 'decision']
export const NJANGI_SUBS: NjangiSub[] = ['progression', 'penetration', 'fixation', 'reprise', 'controle']
export type Level = 1 | 2 | 3 | 4
export type Skills = Partial<Record<SkillKey, Level>>

/* ---------------- seasons ---------------- */

/** A season runs from 1 August to 31 July (Cameroonian and European calendars alike). */
export const SEASON_START_MONTH = 8
export interface Season { id: string; start: string; end: string; label: string }

export function seasonOf(date: string): Season {
  const y = Number(date.slice(0, 4)), m = Number(date.slice(5, 7))
  const s = m >= SEASON_START_MONTH ? y : y - 1
  const mm = String(SEASON_START_MONTH).padStart(2, '0')
  return { id: `${s}-${s + 1}`, start: `${s}-${mm}-01`, end: addDays(`${s + 1}-${mm}-01`, -1), label: `${s}-${s + 1}` }
}
export const inSeason = (date: string, s: Season | null) => !s || (date >= s.start && date <= s.end)

/* ---------------- age stage ---------------- */

/** kid: under 13 (play, discover); teen: 13 to 16; adult: 17 and over (more performance detail). */
export type Stage = 'kid' | 'teen' | 'adult'

export function ageOf(player: Pick<Player, 'birthYear'>, team?: Pick<Team, 'ageGroup'> | null, ref = todayISO()): number | null {
  if (player.birthYear) return Number(ref.slice(0, 4)) - player.birthYear
  const g = team?.ageGroup ?? ''
  const u = g.match(/U\s?(\d+)/i)
  if (u) return Number(u[1]) - 1
  if (/senior|pro|élite|elite|équipe a|first|ligue|réserve|reserve|vétéran|veteran|adulte|adult/i.test(g)) return 22
  return null
}

export function stageOf(player: Pick<Player, 'birthYear'>, team?: Pick<Team, 'ageGroup'> | null): Stage {
  const a = ageOf(player, team)
  if (a === null) return 'teen'
  return a < 13 ? 'kid' : a < 17 ? 'teen' : 'adult'
}

/* ---------------- observation quick tags ---------------- */

export interface ObsTag { id: string; tone: ObsTone; skill?: SkillKey }

/** Quick tags of the Observer. Labels live in the journey namespace (tags.<id>). A tag linked to a competence counts as evidence for it. */
export const OBS_TAGS: ObsTag[] = [
  { id: 'head-up', tone: 'plus', skill: 'scan' },
  { id: 'forward', tone: 'plus', skill: 'passe' },
  { id: 'free-run', tone: 'plus', skill: 'appels' },
  { id: 'react-loss', tone: 'plus', skill: 'contre-pression' },
  { id: 'dares', tone: 'plus', skill: 'dribble-njangi' },
  { id: 'guides', tone: 'plus', skill: 'communication' },
  { id: 'effort', tone: 'plus' },
  { id: 'focus', tone: 'plus' },
  { id: 'leader', tone: 'plus' },
  { id: 'head-down', tone: 'work', skill: 'scan' },
  { id: 'backwards', tone: 'work', skill: 'passe' },
  { id: 'static', tone: 'work', skill: 'appels' },
  { id: 'stops-loss', tone: 'work', skill: 'contre-pression' },
  { id: 'loses-contact', tone: 'work', skill: 'protection' },
  { id: 'rushed', tone: 'work', skill: 'decision' },
  { id: 'silent', tone: 'work', skill: 'communication' },
  { id: 'distracted', tone: 'work' },
  { id: 'frustration', tone: 'work' },
]
export const obsTag = (id: string) => OBS_TAGS.find((t) => t.id === id)

/** Competences an observation speaks about, with their tone (direct competences first, then tags linked to one). */
export function obsSkillTones(o: Pick<Observation, 'skills' | 'tags'>): [SkillKey, ObsTone][] {
  const out = new Map<SkillKey, ObsTone>()
  for (const k of SKILL_KEYS) { const v = o.skills?.[k]; if (v) out.set(k, v) }
  for (const id of o.tags ?? []) { const tg = obsTag(id); if (tg?.skill && !out.has(tg.skill)) out.set(tg.skill, tg.tone) }
  return [...out.entries()]
}

/** Overall tone of an observation: mostly strengths, mostly to work on, or both. */
export function obsTone(o: Pick<Observation, 'skills' | 'tags'>): 'plus' | 'work' | 'mixed' | 'none' {
  let p = 0, w = 0
  for (const k of SKILL_KEYS) { const v = o.skills?.[k]; if (v === 'plus') p++; else if (v === 'work') w++ }
  for (const id of o.tags ?? []) { const tg = obsTag(id); if (tg?.tone === 'plus') p++; else if (tg?.tone === 'work') w++ }
  return p && w ? 'mixed' : p ? 'plus' : w ? 'work' : 'none'
}

export const nowHHMM = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }

export interface ObservationInput {
  teamId: string
  date?: string
  sessionId?: string
  matchId?: string
  minute?: number
  skills: Partial<Record<SkillKey, ObsTone>>
  tags: string[]
  rating?: 1 | 2 | 3 | 4 | 5
  note?: string
  by?: 'coach' | 'player'
}

/** One observation record per player (they share a groupId when several players were picked). */
export async function addObservations(input: ObservationInput, playerIds: string[]) {
  const groupId = playerIds.length > 1 ? uid('og_') : undefined
  const now = nowISO()
  const time = nowHHMM()
  const list: Observation[] = playerIds.map((pid) => ({
    id: uid('obs_'), playerId: pid, teamId: input.teamId, date: input.date ?? todayISO(), sessionId: input.sessionId, matchId: input.matchId,
    minute: input.minute, time, skills: { ...input.skills }, tags: [...input.tags], rating: input.rating, note: input.note?.trim() || undefined,
    groupId, by: input.by ?? 'coach', createdAt: now,
  }))
  await db.observations.bulkPut(list)
  return list
}

/* ---------------- attendance ---------------- */

export const ATTENDANCE_STATUSES: AttendanceStatus[] = ['present', 'late', 'absent', 'excused', 'injured']
export const attended = (s?: AttendanceStatus) => s === 'present' || s === 'late'
export const attendanceId = (sessionId: string, playerId: string) => `${sessionId}:${playerId}`

export async function setAttendance(session: Pick<Session, 'id' | 'date' | 'teamId'>, player: Pick<Player, 'id' | 'teamId'>, status: AttendanceStatus | null) {
  const id = attendanceId(session.id, player.id)
  if (!status) { await db.attendance.delete(id); return }
  await db.attendance.put({ id, sessionId: session.id, playerId: player.id, teamId: session.teamId ?? player.teamId, date: session.date, status, createdAt: nowISO() })
}

/** Mark every player not yet marked as present (the "everyone is here" button). */
export async function markAllPresent(session: Pick<Session, 'id' | 'date' | 'teamId'>, players: Pick<Player, 'id' | 'teamId'>[]) {
  const existing = new Set((await db.attendance.where('sessionId').equals(session.id).toArray()).map((a) => a.playerId))
  const now = nowISO()
  const list: Attendance[] = players.filter((p) => !existing.has(p.id)).map((p) => ({
    id: attendanceId(session.id, p.id), sessionId: session.id, playerId: p.id, teamId: session.teamId ?? p.teamId, date: session.date, status: 'present', createdAt: now,
  }))
  if (list.length) await db.attendance.bulkPut(list)
  return list.length
}

/* ---------------- matches: minutes and contributions ---------------- */

export const matchLength = (m: Pick<Match, 'halfMinutes'>) => 2 * m.halfMinutes
export const isStarter = (m: Pick<Match, 'lineup'>, pid: string) => m.lineup.some((l) => l.playerId === pid)
export const inSquad = (m: Pick<Match, 'lineup' | 'subs'>, pid: string) => isStarter(m, pid) || m.subs.includes(pid)

/** Minutes played: the coach's record when there is one, otherwise the whole match for a starter and 0 for a sub. Only played matches count. */
export function minutesOf(m: Match, pid: string): number {
  if (m.status !== 'done') return 0
  if (m.minutes && typeof m.minutes[pid] === 'number') return Math.max(0, m.minutes[pid])
  return isStarter(m, pid) ? matchLength(m) : 0
}

export async function saveMinutes(matchId: string, minutes: Record<string, number>) {
  await db.matches.update(matchId, { minutes })
}

export const zeroCounts = (): Record<EventCode, number> =>
  ({ PASS_OK: 0, PASS_LOST: 0, PROG: 0, LINE: 0, FINAL3: 0, BOX: 0, FIX2: 0, SWITCH: 0, LOSS: 0, REGAIN5: 0, REGAIN: 0, SHOT: 0, SHOT_IN: 0, GOAL: 0 })

export function countFor(events: readonly MatchEvent[], pid?: string) {
  const c = zeroCounts()
  for (const e of events) if (e.side === 'us' && (!pid || e.playerId === pid)) c[e.code] += 1
  return c
}

export interface MatchLine {
  match: Match
  minutes: number
  starter: boolean
  captain: boolean
  counts: Record<EventCode, number>
  /** the team's tagged counts in that match (for shares, 17 and over) */
  team: Record<EventCode, number>
  tagged: boolean
}

/* ---------------- evaluations ---------------- */

export const byDate = <T extends { date: string; createdAt: string }>(a: T, b: T) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)

/** Levels as they stood on a date (latest evaluation up to that date, competence by competence). */
export function levelsAt(evals: readonly Evaluation[], date: string): Skills {
  const out: Skills = {}
  for (const e of [...evals].sort(byDate)) {
    if (e.date > date) break
    for (const k of SKILL_KEYS) { const v = e.skills[k]; if (v) out[k] = v }
  }
  return out
}

/** Changes between an evaluation and the levels just before it. */
export function evalChanges(evals: readonly Evaluation[], ev: Evaluation) {
  const sorted = [...evals].sort(byDate)
  const before: Skills = {}
  for (const e of sorted) {
    if (e.id === ev.id) break
    for (const k of SKILL_KEYS) { const v = e.skills[k]; if (v) before[k] = v }
  }
  const changes: { skill: SkillKey; from?: Level; to: Level }[] = []
  for (const k of SKILL_KEYS) {
    const to = ev.skills[k]
    if (to && before[k] !== to) changes.push({ skill: k, from: before[k], to })
  }
  return { changes, first: sorted[0]?.id === ev.id }
}

/** One series of (date, level) points per competence. */
export function skillSeries(evals: readonly Evaluation[], skill: SkillKey) {
  return [...evals].sort(byDate).filter((e) => e.skills[skill]).map((e) => ({ date: e.date, level: e.skills[skill] as Level }))
}

async function syncSnapshot(playerId: string) {
  const evals = await db.evaluations.where('playerId').equals(playerId).toArray()
  if (!evals.length) return
  const latest = [...evals].sort(byDate).pop()!
  await db.players.update(playerId, { skills: { ...latest.skills } })
}

/** Save a full dated evaluation. When it is the most recent one, the player's current levels follow it. */
export async function saveEvaluation(e: Omit<Evaluation, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) {
  const ev: Evaluation = { ...e, id: e.id ?? uid('eva_'), createdAt: e.createdAt ?? nowISO() }
  await db.transaction('rw', db.evaluations, db.players, async () => {
    await db.evaluations.put(ev)
    await syncSnapshot(ev.playerId)
  })
  return ev
}

export async function deleteEvaluation(ev: Evaluation) {
  await db.transaction('rw', db.evaluations, db.players, async () => {
    await db.evaluations.delete(ev.id)
    await syncSnapshot(ev.playerId)
  })
}

/**
 * Keep the history when the coach changes a level on the player's page: today's coach evaluation
 * is created or updated with the full current grid.
 */
export async function recordLevels(player: Pick<Player, 'id' | 'teamId'>, skills: Skills, date = todayISO()) {
  const same = await db.evaluations.where('[playerId+date]').equals([player.id, date]).filter((e) => e.by === 'coach').first()
  if (!Object.values(skills).some(Boolean)) { if (same) await db.evaluations.delete(same.id); return }
  if (same) await db.evaluations.update(same.id, { skills: { ...skills } })
  else await db.evaluations.put({ id: uid('eva_'), playerId: player.id, teamId: player.teamId, date, skills: { ...skills }, by: 'coach', createdAt: nowISO() })
}

/* ---------------- objectives and milestones ---------------- */

export const MAX_ACTIVE_OBJECTIVES = 3
/** Le Code Njangi, chapter 25: two competences to work on for a cycle of six to eight weeks. */
export const CYCLE_WEEKS = 6

export async function saveObjective(o: Omit<Objective, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) {
  const obj: Objective = { ...o, id: o.id ?? uid('obj_'), createdAt: o.createdAt ?? nowISO() }
  await db.objectives.put(obj)
  return obj
}

export async function saveMilestone(m: Omit<Milestone, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) {
  const ms: Milestone = { ...m, id: m.id ?? uid('mil_'), createdAt: m.createdAt ?? nowISO() }
  await db.milestones.put(ms)
  return ms
}

/** Which tagged actions speak for each sub-index of the Indice Njangi at the level of one player. */
export const SUB_ACTIONS: Record<NjangiSub, EventCode[]> = {
  progression: ['PROG', 'LINE'],
  penetration: ['FINAL3', 'BOX'],
  fixation: ['FIX2', 'SWITCH'],
  reprise: ['REGAIN5'],
  controle: ['PASS_OK'],
}

/* ---------------- loading a journey ---------------- */

export interface JourneyData {
  player: Player
  team: Team | null
  evaluations: Evaluation[]
  observations: Observation[]
  attendance: Attendance[]
  /** sessions of the team up to today where the register was taken */
  registers: Session[]
  /** all sessions of the team (to name the context of an observation) */
  sessions: Session[]
  /** done matches of the team where the player was in the squad */
  lines: MatchLine[]
  matches: Match[]
  objectives: Objective[]
  milestones: Milestone[]
}

export async function loadJourney(playerId: string): Promise<JourneyData | null> {
  const player = await db.players.get(playerId)
  if (!player) return null
  const [team, evaluations, observations, attendance, teamAttendance, sessions, matches, objectives, milestones] = await Promise.all([
    db.teams.get(player.teamId),
    db.evaluations.where('playerId').equals(playerId).toArray(),
    db.observations.where('playerId').equals(playerId).toArray(),
    db.attendance.where('playerId').equals(playerId).toArray(),
    db.attendance.where('teamId').equals(player.teamId).toArray(),
    db.sessions.where('teamId').equals(player.teamId).toArray(),
    db.matches.where('teamId').equals(player.teamId).toArray(),
    db.objectives.where('playerId').equals(playerId).toArray(),
    db.milestones.where('playerId').equals(playerId).toArray(),
  ])
  const squadMatches = matches.filter((m) => m.status === 'done' && inSquad(m, playerId))
  const events = squadMatches.length ? await db.events.where('matchId').anyOf(squadMatches.map((m) => m.id)).toArray() : []
  const byMatch = new Map<string, MatchEvent[]>()
  for (const e of events) { const l = byMatch.get(e.matchId); if (l) l.push(e); else byMatch.set(e.matchId, [e]) }
  const lines: MatchLine[] = squadMatches.map((m) => {
    const evs = byMatch.get(m.id) ?? []
    return { match: m, minutes: minutesOf(m, playerId), starter: isStarter(m, playerId), captain: m.captainId === playerId, counts: countFor(evs, playerId), team: countFor(evs), tagged: evs.length > 0 }
  }).sort((a, b) => a.match.date.localeCompare(b.match.date))
  const taken = new Set(teamAttendance.map((a) => a.sessionId))
  const today = todayISO()
  const registers = sessions.filter((s) => taken.has(s.id) && s.date <= today).sort((a, b) => a.date.localeCompare(b.date))
  return {
    player, team: team ?? null, evaluations: evaluations.sort(byDate), observations: observations.sort(byDate), attendance,
    registers, sessions, lines, matches, objectives: objectives.sort((a, b) => a.start.localeCompare(b.start)), milestones: milestones.sort(byDate),
  }
}

/** Seasons that have something for this player, most recent first (always includes the current one). */
export function journeySeasons(d: JourneyData): Season[] {
  const dates = [todayISO(), ...d.evaluations.map((e) => e.date), ...d.observations.map((o) => o.date), ...d.lines.map((l) => l.match.date), ...d.attendance.map((a) => a.date), ...d.objectives.map((o) => o.start), ...d.milestones.map((m) => m.date)]
  const map = new Map<string, Season>()
  for (const x of dates) { const s = seasonOf(x); map.set(s.id, s) }
  return [...map.values()].sort((a, b) => b.start.localeCompare(a.start))
}

/* ---------------- season summary ---------------- */

export interface SeasonSummary {
  season: Season | null
  sessions: { attended: number; late: number; marked: number; rate: number | null }
  matches: { squad: number; played: number; starts: number; minutes: number; goals: number; captain: number; tagged: number }
  counts: Record<EventCode, number>
  team: Record<EventCode, number>
  /** minutes in matches that were tagged (to compute rates per 90) */
  taggedMinutes: number
  observations: { total: number; plus: number; work: number }
  bySkill: Partial<Record<SkillKey, { plus: number; work: number }>>
  objectives: { total: number; achieved: number; active: number }
  levels: { start: Skills; now: Skills; gained: number; changed: number }
  strength?: SkillKey
  nextStep?: SkillKey
}

export function seasonSummary(d: JourneyData, season: Season | null): SeasonSummary {
  const lines = d.lines.filter((l) => inSeason(l.match.date, season))
  const played = lines.filter((l) => l.minutes > 0)
  const counts = zeroCounts(), team = zeroCounts()
  let taggedMinutes = 0
  for (const l of lines) {
    for (const k of Object.keys(counts) as EventCode[]) { counts[k] += l.counts[k]; team[k] += l.team[k] }
    if (l.tagged) taggedMinutes += l.minutes
  }
  const regIds = new Set(d.registers.filter((s) => inSeason(s.date, season)).map((s) => s.id))
  const marks = d.attendance.filter((a) => regIds.has(a.sessionId))
  const att = marks.filter((a) => attended(a.status)).length
  const obs = d.observations.filter((o) => inSeason(o.date, season))
  const bySkill: SeasonSummary['bySkill'] = {}
  let plus = 0, work = 0
  for (const o of obs) {
    const tone = obsTone(o)
    if (tone === 'plus' || tone === 'mixed') plus++
    if (tone === 'work' || tone === 'mixed') work++
    for (const [k, t] of obsSkillTones(o)) { const r = bySkill[k] ?? { plus: 0, work: 0 }; r[t] += 1; bySkill[k] = r }
  }
  const objs = d.objectives.filter((o) => inSeason(o.start, season) || (season && o.status === 'active' && o.review >= season.start && o.start <= season.end))
  const end = season ? (season.end < todayISO() ? season.end : todayISO()) : todayISO()
  const evalsIn = d.evaluations.filter((e) => inSeason(e.date, season))
  // levels at the start: last evaluation before the season, otherwise the first one inside it
  const before = season ? levelsAt(d.evaluations, addDays(season.start, -1)) : {}
  const firstIn = evalsIn[0]?.skills ?? {}
  const start: Skills = { ...firstIn, ...before }
  const now = levelsAt(d.evaluations, end)
  let gained = 0, changed = 0
  for (const k of SKILL_KEYS) {
    const a = start[k], b = now[k]
    if (a && b && a !== b) { changed++; if (b > a) gained += b - a }
  }
  const rated = SKILL_KEYS.filter((k) => now[k])
  const strength = [...rated].sort((a, b) => (now[b]! - now[a]!) || ((bySkill[b]?.plus ?? 0) - (bySkill[a]?.plus ?? 0)) || SKILL_KEYS.indexOf(a) - SKILL_KEYS.indexOf(b))[0]
  const worked = SKILL_KEYS.filter((k) => k !== strength && (bySkill[k]?.work ?? 0) > 0 && (now[k] ?? 0) < 4).sort((a, b) => (bySkill[b]!.work - bySkill[a]!.work) || ((now[a] ?? 0) - (now[b] ?? 0)))
  const nextStep = worked[0] ?? [...rated].filter((k) => k !== strength && now[k]! < 4).sort((a, b) => (now[a]! - now[b]!) || SKILL_KEYS.indexOf(a) - SKILL_KEYS.indexOf(b))[0]
  return {
    season,
    sessions: { attended: att, late: marks.filter((a) => a.status === 'late').length, marked: regIds.size, rate: regIds.size ? att / regIds.size : null },
    matches: {
      squad: lines.length, played: played.length, starts: played.filter((l) => l.starter).length, minutes: played.reduce((a, l) => a + l.minutes, 0),
      goals: counts.GOAL, captain: played.filter((l) => l.captain).length, tagged: lines.filter((l) => l.tagged).length,
    },
    counts, team, taggedMinutes,
    observations: { total: obs.length, plus, work },
    bySkill,
    objectives: { total: objs.length, achieved: objs.filter((o) => o.status === 'achieved').length, active: objs.filter((o) => o.status === 'active').length },
    levels: { start, now, gained, changed },
    strength, nextStep,
  }
}

/* ---------------- timeline ---------------- */

export type DerivedKind = 'first_match' | 'first_start' | 'first_goal' | 'first_captain' | 'matches_n' | 'skill_level'

export type JourneyItem =
  | { kind: 'evaluation'; id: string; date: string; ev: Evaluation; changes: { skill: SkillKey; from?: Level; to: Level }[]; first: boolean }
  | { kind: 'observation'; id: string; date: string; obs: Observation; session?: Session; match?: Match }
  | { kind: 'match'; id: string; date: string; line: MatchLine }
  | { kind: 'week'; id: string; date: string; marks: { session: Session; status?: AttendanceStatus }[] }
  | { kind: 'objective'; id: string; date: string; obj: Objective; phase: 'set' | 'review' }
  | { kind: 'milestone'; id: string; date: string; ms: Milestone }
  | { kind: 'derived'; id: string; date: string; type: DerivedKind; match?: Match; skill?: SkillKey; level?: Level; n?: number }

export type ItemFilter = 'all' | 'evaluation' | 'observation' | 'match' | 'week' | 'objective' | 'milestone'
export const filterOf = (i: JourneyItem): ItemFilter => (i.kind === 'derived' ? 'milestone' : i.kind)

/** Milestones the data already proves: first match, first start, first goal, first armband, 10/25/50/100 matches, a competence reaching Acquis or Référence. */
export function derivedMilestones(d: JourneyData): JourneyItem[] {
  const out: JourneyItem[] = []
  const played = d.lines.filter((l) => l.minutes > 0)
  if (played[0]) out.push({ kind: 'derived', id: `d_first_${played[0].match.id}`, date: played[0].match.date, type: 'first_match', match: played[0].match })
  const firstStart = played.find((l) => l.starter)
  if (firstStart && firstStart !== played[0]) out.push({ kind: 'derived', id: `d_start_${firstStart.match.id}`, date: firstStart.match.date, type: 'first_start', match: firstStart.match })
  const goal = played.find((l) => l.counts.GOAL > 0)
  if (goal) out.push({ kind: 'derived', id: `d_goal_${goal.match.id}`, date: goal.match.date, type: 'first_goal', match: goal.match })
  const capt = played.find((l) => l.captain)
  if (capt) out.push({ kind: 'derived', id: `d_capt_${capt.match.id}`, date: capt.match.date, type: 'first_captain', match: capt.match })
  for (const n of [10, 25, 50, 100, 200]) {
    const l = played[n - 1]
    if (l) out.push({ kind: 'derived', id: `d_n${n}`, date: l.match.date, type: 'matches_n', match: l.match, n })
  }
  // a competence reaching level 3 or 4 for the first time (not on the very first evaluation)
  const best: Skills = {}
  d.evaluations.forEach((e, i) => {
    for (const k of SKILL_KEYS) {
      const v = e.skills[k]
      if (!v) continue
      if (i > 0 && v >= 3 && (best[k] ?? 0) < v) out.push({ kind: 'derived', id: `d_lvl_${e.id}_${k}`, date: e.date, type: 'skill_level', skill: k, level: v })
      if ((best[k] ?? 0) < v) best[k] = v
    }
  })
  return out
}

const order: Record<JourneyItem['kind'], number> = { milestone: 0, derived: 1, evaluation: 2, objective: 3, match: 4, observation: 5, week: 6 }

/** Everything that happened, most recent first. Attendance is grouped by week so the thread stays readable. */
export function buildTimeline(d: JourneyData, season: Season | null): JourneyItem[] {
  const items: JourneyItem[] = []
  const sessionById = new Map(d.sessions.map((s) => [s.id, s]))
  const matchById = new Map(d.matches.map((m) => [m.id, m]))
  for (const ev of d.evaluations) { const { changes, first } = evalChanges(d.evaluations, ev); items.push({ kind: 'evaluation', id: ev.id, date: ev.date, ev, changes, first }) }
  for (const o of d.observations) items.push({ kind: 'observation', id: o.id, date: o.date, obs: o, session: o.sessionId ? sessionById.get(o.sessionId) : undefined, match: o.matchId ? matchById.get(o.matchId) : undefined })
  for (const l of d.lines) items.push({ kind: 'match', id: `m_${l.match.id}`, date: l.match.date, line: l })
  const markBySession = new Map(d.attendance.map((a) => [a.sessionId, a.status]))
  const weeks = new Map<string, { session: Session; status?: AttendanceStatus }[]>()
  for (const s of d.registers) { const k = weekStart(s.date); const l = weeks.get(k) ?? []; l.push({ session: s, status: markBySession.get(s.id) }); weeks.set(k, l) }
  for (const [k, marks] of weeks) if (marks.some((m) => m.status)) items.push({ kind: 'week', id: `w_${k}`, date: marks[marks.length - 1].session.date, marks })
  for (const o of d.objectives) {
    items.push({ kind: 'objective', id: `os_${o.id}`, date: o.start, obj: o, phase: 'set' })
    if (o.status !== 'active' && o.reviewedAt) items.push({ kind: 'objective', id: `or_${o.id}`, date: o.reviewedAt.slice(0, 10), obj: o, phase: 'review' })
  }
  for (const ms of d.milestones) items.push({ kind: 'milestone', id: ms.id, date: ms.date, ms })
  items.push(...derivedMilestones(d))
  return items.filter((i) => inSeason(i.date, season)).sort((a, b) => b.date.localeCompare(a.date) || order[a.kind] - order[b.kind])
}

/** The player record a profile stands for: the explicit link, otherwise the same name in the team. */
export function linkedPlayer(players: Player[], profile: { playerId?: string; name?: string } | null) {
  if (!profile) return null
  if (profile.playerId) { const p = players.find((x) => x.id === profile.playerId); if (p) return p }
  const key = (profile.name || '').trim().toLowerCase()
  return key ? players.find((p) => p.name.trim().toLowerCase() === key) ?? null : null
}
