// Shared "do something" operations. Used by the pages AND by Mola (the action agent),
// so a session that Mola builds is exactly the session a coach would build by hand.
import { db } from './db'
import { DRILLS } from '../content/drills.gen'
import type { Drill, Intention, Lang, Match, MD, Player, Session, SessionBlock, SkillKey, Team } from './types'
import { addDays, nowISO, todayISO, uid, fmtDate } from './util'
import { DEFAULT_FORMATION, formationSlots } from './formations'

/* ---------------- sessions ---------------- */

type Slot = { families: Drill['family'][]; minutes: number }
const TEMPLATES: Record<MD, Slot[]> = {
  'MD-4': [{ families: ['rondo'], minutes: 12 }, { families: ['ssg'], minutes: 20 }, { families: ['transition', 'ssg'], minutes: 15 }, { families: ['finishing'], minutes: 12 }],
  'MD-3': [{ families: ['rondo'], minutes: 12 }, { families: ['position'], minutes: 20 }, { families: ['lsg', 'phase'], minutes: 30 }],
  'MD-2': [{ families: ['rondo'], minutes: 10 }, { families: ['transition'], minutes: 15 }, { families: ['finishing'], minutes: 15 }, { families: ['ssg'], minutes: 12 }],
  'MD-1': [{ families: ['technique', 'rondo'], minutes: 10 }, { families: ['phase', 'finishing'], minutes: 15 }],
  'MD+1': [{ families: ['technique', 'rondo'], minutes: 12 }],
  youth: [{ families: ['technique'], minutes: 10 }, { families: ['rondo'], minutes: 12 }, { families: ['ssg'], minutes: 20 }, { families: ['position'], minutes: 15 }, { families: ['finishing', 'ssg'], minutes: 15 }],
}

const ageNum = (ages: string) => { const m = ages.match(/U(\d+)/i); return m ? Number(m[1]) : 9 }
const groupNum = (g?: string) => { const m = (g || '').match(/U(\d+)/i); return m ? Number(m[1]) : 99 }

/** Pick drills for one slot: right family, right day, right age, preferred intention, not already used. */
function pickDrill(slot: Slot, md: MD, intention: Intention | undefined, ageGroup: string | undefined, used: Set<string>, seed: number): Drill | undefined {
  const age = groupNum(ageGroup)
  const pool = DRILLS.filter((d) => slot.families.includes(d.family) && !used.has(d.id) && ageNum(d.ages) <= age)
  if (!pool.length) return undefined
  const score = (d: Drill) =>
    (d.md.includes(md) ? 4 : 0) + (intention && d.intentions.includes(intention) ? 5 : 0) + (md === 'youth' && d.md.includes('youth') ? 2 : 0) + ((d.order + seed) % 3) * 0.3
  return [...pool].sort((a, b) => score(b) - score(a))[0]
}

export interface AutoSessionInput { md: MD; date?: string; teamId?: string; intention?: Intention; ageGroup?: string; minutes?: number; lang?: Lang; title?: string; createdBy?: 'user' | 'mola' }

export function buildBlocks(input: AutoSessionInput): SessionBlock[] {
  const used = new Set<string>()
  const seed = Math.floor(Math.random() * 7)
  const blocks: SessionBlock[] = []
  for (const slot of TEMPLATES[input.md]) {
    const d = pickDrill(slot, input.md, input.intention, input.ageGroup, used, seed)
    if (d) { used.add(d.id); blocks.push({ id: uid('bl_'), drillId: d.id, minutes: slot.minutes }) }
  }
  const fr = (input.lang ?? 'fr') === 'fr'
  if (input.md === 'MD-1') blocks.push({ id: uid('bl_'), title: fr ? 'Coups de pied arrêtés' : 'Set pieces', minutes: 15 })
  if (input.md === 'MD+1') blocks.push({ id: uid('bl_'), title: fr ? 'Récupération active et étirements' : 'Active recovery and stretching', minutes: 20 })
  if (input.md === 'youth') blocks.push({ id: uid('bl_'), title: fr ? 'Match libre' : 'Free match', minutes: 20 })
  // stretch or trim to the requested total
  if (input.minutes) {
    const total = blocks.reduce((s, b) => s + b.minutes, 0)
    if (total > 0) { const k = input.minutes / total; blocks.forEach((b) => { b.minutes = Math.max(6, Math.round((b.minutes * k) / 1) ) }) }
  }
  return blocks
}

const MD_TITLE: Record<MD, [string, string]> = {
  'MD-4': ['Tension : petits espaces', 'Tension: small spaces'],
  'MD-3': ['Durée : jouer comme le match', 'Duration: play like the match'],
  'MD-2': ['Vitesse : transitions et finition', 'Speed: transitions and finishing'],
  'MD-1': ['Activation et coups de pied arrêtés', 'Activation and set pieces'],
  'MD+1': ['Récupération', 'Recovery'],
  youth: ['Séance jeunes', 'Youth session'],
}

export async function createAutoSession(input: AutoSessionInput): Promise<Session> {
  const lang = input.lang ?? 'fr'
  const s: Session = {
    id: uid('se_'), teamId: input.teamId, date: input.date ?? todayISO(), md: input.md, intention: input.intention,
    title: input.title ?? MD_TITLE[input.md][lang === 'fr' ? 0 : 1], blocks: buildBlocks(input), createdBy: input.createdBy ?? 'user', createdAt: nowISO(),
  }
  await db.sessions.put(s)
  return s
}

/** Plan the four days before a match (MD-4 to MD-1). Skips days that already have a session. */
/** Plans MD-4 to MD-1 before a match. Days before `from` (default: today) are skipped, and so are days that already have a session. */
/** Days before a match that must stay free of MD-4 to MD-1 work because another match is played there:
 *  that match day itself and the day after it (MD+1, recovery). */
export async function matchBusyDays(matchDate: string, teamId?: string) {
  const others = await db.matches.where('date').between(addDays(matchDate, -5), addDays(matchDate, -1), true, true)
    .filter((m) => !teamId || m.teamId === teamId).toArray()
  const busy = new Set<string>()
  for (const m of others) { busy.add(m.date); busy.add(addDays(m.date, 1)) }
  return busy
}

export async function planWeek(opts: { matchDate: string; teamId?: string; ageGroup?: string; lang?: Lang; intention?: Intention; createdBy?: 'user' | 'mola'; from?: string }) {
  const created: Session[] = []
  const mds: [MD, number][] = [['MD-4', -4], ['MD-3', -3], ['MD-2', -2], ['MD-1', -1]]
  const from = opts.from ?? todayISO()
  const busy = await matchBusyDays(opts.matchDate, opts.teamId)
  for (const [md, off] of mds) {
    const date = addDays(opts.matchDate, off)
    if (date < from || busy.has(date)) continue
    const exists = await db.sessions.where('date').equals(date).filter((s) => !opts.teamId || s.teamId === opts.teamId).count()
    if (exists) continue
    created.push(await createAutoSession({ md, date, teamId: opts.teamId, ageGroup: opts.ageGroup, lang: opts.lang, intention: opts.intention, createdBy: opts.createdBy }))
  }
  return created
}

export const sessionMinutes = (s: Session) => s.blocks.reduce((a, b) => a + (b.minutes || 0), 0)

/* ---------------- teams, players, lineups ---------------- */

export async function createTeam(p: { name: string; ageGroup: string; format: Team['format']; formation?: string }) {
  const team: Team = { id: uid('tm_'), name: p.name, ageGroup: p.ageGroup, format: p.format, formation: p.formation || DEFAULT_FORMATION[p.format], colors: { primary: '#0B5D3B', secondary: '#F5B700' }, createdAt: nowISO() }
  await db.teams.put(team)
  const prof = await db.profile.get('me')
  if (prof && !prof.activeTeamId) await db.profile.update('me', { activeTeamId: team.id })
  return team
}

export async function addPlayer(p: { teamId: string; name: string; number?: number; position?: string; birthYear?: number }) {
  const player: Player = { id: uid('pl_'), teamId: p.teamId, name: p.name, number: p.number, position: p.position || 'CM', birthYear: p.birthYear, skills: {}, createdAt: nowISO() }
  await db.players.put(player)
  return player
}

const SKILL_KEYS: SkillKey[] = ['scan', 'controle', 'passe', 'conduite', 'dribble-njangi', 'appels', 'communication', 'protection', 'contre-pression', 'decision']
export const skillAvg = (p: Player) => { const v: number[] = SKILL_KEYS.map((k) => Number(p.skills[k] || 0)).filter(Boolean); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0 }

const ROLE_FIT: Record<string, string[]> = { GK: ['GK'], CB: ['CB', 'FB', 'DM'], FB: ['FB', 'W', 'CB'], DM: ['DM', 'CM', 'CB'], CM: ['CM', 'DM', 'AM'], AM: ['AM', 'CM', 'W'], W: ['W', 'AM', 'ST', 'FB'], ST: ['ST', 'W', 'AM'] }

/** Fill a formation with the best-fitting players (position first, then skills). */
export function autoLineup(players: Player[], format: number, formation: string) {
  const slots = formationSlots(format, formation)
  const left = [...players]
  const lineup = slots.map((s) => {
    const fits = ROLE_FIT[s.role] || [s.role]
    let best = -1, bestScore = -1
    left.forEach((p, i) => {
      const rank = fits.indexOf(p.position)
      if (s.role === 'GK' && p.position !== 'GK') return
      if (s.role !== 'GK' && p.position === 'GK') return
      const sc = (rank === -1 ? 0 : (fits.length - rank) * 10) + skillAvg(p)
      if (sc > bestScore) { bestScore = sc; best = i }
    })
    const p = best >= 0 ? left.splice(best, 1)[0] : undefined
    return { slot: s.id, playerId: p?.id }
  })
  return { lineup, subs: left.map((p) => p.id) }
}

/* ---------------- matches ---------------- */

export async function createMatch(p: { teamId: string; opponent: string; date: string; time?: string; venue?: string; home?: boolean; competition?: string; halfMinutes?: number; createdBy?: 'user' | 'mola' }) {
  const team = await db.teams.get(p.teamId)
  const format = team?.format ?? 11
  const formation = team?.formation ?? DEFAULT_FORMATION[format]
  const players = await db.players.where('teamId').equals(p.teamId).toArray()
  const { lineup, subs } = autoLineup(players, format, formation)
  const captain = players.slice().sort((a, b) => skillAvg(b) - skillAvg(a))[0]
  const match: Match = {
    id: uid('ma_'), teamId: p.teamId, opponent: p.opponent, date: p.date, time: p.time, venue: p.venue, home: p.home ?? true, competition: p.competition,
    format, formation, halfMinutes: p.halfMinutes ?? (format === 11 ? 45 : format >= 8 ? 30 : 20), lineup, subs, captainId: captain?.id,
    plan: { possession: '', transitionDef: '', defense: '', transitionOff: '', setPieces: '' }, status: 'planned', scoreUs: 0, scoreThem: 0,
    createdBy: p.createdBy ?? 'user', createdAt: nowISO(),
  }
  await db.matches.put(match)
  return match
}

export async function nextMatch(teamId?: string) {
  const today = todayISO()
  const all = await db.matches.where('date').aboveOrEqual(today).toArray()
  return all.filter((m) => m.status !== 'done' && (!teamId || m.teamId === teamId)).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))[0]
}

/* ---------------- messages and calendar ---------------- */

export function convocationText(match: Match, team: Team | undefined, players: Player[], lang: Lang = 'fr') {
  const names = (ids: (string | undefined)[]) => ids.map((id) => players.find((p) => p.id === id)?.name).filter(Boolean).join(', ')
  const starters = names(match.lineup.map((l) => l.playerId))
  const subs = names(match.subs)
  const when = `${fmtDate(match.date, lang, { weekday: 'long', day: 'numeric', month: 'long' })}${match.time ? (lang === 'fr' ? ' à ' : ' at ') + match.time : ''}`
  if (lang === 'en') {
    return `${team?.name ?? 'Team'}: match against ${match.opponent}\n${when}${match.venue ? `, ${match.venue}` : ''}\n\nStarting: ${starters || 'to be confirmed'}\nSubs: ${subs || 'to be confirmed'}\n\nPlease arrive 45 minutes before kick-off with both kits, water and shin pads. Reply to confirm.\nThe ball must travel. But it must know where it is going.`
  }
  return `${team?.name ?? 'Équipe'} : match contre ${match.opponent}\n${when}${match.venue ? `, ${match.venue}` : ''}\n\nTitulaires : ${starters || 'à confirmer'}\nRemplaçants : ${subs || 'à confirmer'}\n\nRendez-vous 45 minutes avant le coup d'envoi, avec les deux tenues, de l'eau et les protège-tibias. Merci de répondre pour confirmer.\nLe ballon doit voyager. Mais il doit savoir où il va.`
}

export function whatsappLink(text: string, phone?: string) {
  const base = phone ? `https://wa.me/${phone.replace(/\D/g, '')}` : 'https://wa.me/'
  return `${base}?text=${encodeURIComponent(text)}`
}
export const smsLink = (text: string, phone = '') => `sms:${phone}?&body=${encodeURIComponent(text)}`
export const mailLink = (subject: string, text: string, to = '') => `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`

const icsDate = (date: string, time = '10:00') => date.replace(/-/g, '') + 'T' + time.replace(':', '') + '00'
export function toICS(events: { uid: string; title: string; date: string; time?: string; minutes?: number; location?: string; description?: string }[]) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ndamba//FR']
  for (const e of events) {
    const start = icsDate(e.date, e.time)
    const [h, m] = (e.time || '10:00').split(':').map(Number)
    const endMin = h * 60 + m + (e.minutes ?? 90)
    const end = icsDate(e.date, `${String(Math.floor(endMin / 60) % 24).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`)
    lines.push('BEGIN:VEVENT', `UID:${e.uid}@ndamba`, `DTSTAMP:${icsDate(todayISO(), '00:00')}`, `DTSTART:${start}`, `DTEND:${end}`, `SUMMARY:${e.title}`)
    if (e.location) lines.push(`LOCATION:${e.location}`)
    if (e.description) lines.push(`DESCRIPTION:${e.description.replace(/\n/g, '\\n')}`)
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}
