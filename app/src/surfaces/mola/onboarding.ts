// Conversational onboarding: what Mola asks, in which order, and how a free answer fills the profile.
// Pure functions (no React, no database), so the flow is easy to reason about and to test.
import type { Role } from '../../lib/types'
import {
  COUNTRIES, detectLang, fillSlot, norm, parseAgeGroup, parseCity, parseClub, parseCountry, parseFormat, parseGoals, parseName,
  parsePlayerList, parsePosition, parseProfile, parseRole, tokens, type Lang,
} from './engine.ts'

export type Step = 'lang' | 'name' | 'role' | 'team' | 'age' | 'format' | 'players' | 'position' | 'club' | 'childAge' | 'org' | 'city' | 'country' | 'goals' | 'review'
export type Format = 5 | 7 | 8 | 9 | 11
export interface DraftPlayer { name: string; number?: number; position?: string }

export interface Draft {
  lang?: Lang
  name?: string
  role?: Role
  teamName?: string
  club?: string
  ageGroup?: string
  format?: Format
  position?: string
  city?: string
  /** ISO code when known (CM, CI...), otherwise what the person wrote */
  country?: string
  goals: string[]
  players: DraftPlayer[]
  /** steps answered with "later" or validated (players, club, city, goals...) */
  skipped: Partial<Record<Step, boolean>>
}

export const emptyDraft = (): Draft => ({ goals: [], players: [], skipped: {} })

export type Field = 'lang' | 'name' | 'role' | 'teamName' | 'club' | 'ageGroup' | 'format' | 'position' | 'city' | 'country' | 'players' | 'goals'

export const ROLES: Role[] = ['coach', 'player', 'analyst', 'parent', 'manager', 'federation']
export const AGE_GROUPS = ['U7', 'U9', 'U11', 'U13', 'U15', 'U17', 'U19', 'U21', 'Seniors']
export const FORMATS: Format[] = [5, 7, 8, 9, 11]
export const POSITIONS = ['GK', 'CB', 'FB', 'DM', 'CM', 'AM', 'W', 'ST']
export const GOALS = ['identite', 'semaine', 'analyse', 'progresser', 'jeunes', 'lire']
export const COUNTRY_CODES = COUNTRIES.map(([c]) => c)
export const QUICK_COUNTRIES = ['CM', 'CI', 'SN', 'GA', 'CD', 'FR', 'US']
export const QUICK_CITIES = ['Douala', 'Yaoundé', 'Garoua', 'Bafoussam', 'Abidjan', 'Dakar']

const MID: Record<Role, Step[]> = {
  coach: ['team', 'age', 'format', 'players'],
  player: ['age', 'position', 'club'],
  analyst: ['club'],
  parent: ['childAge'],
  manager: ['org'],
  federation: ['org'],
}

export function stepsFor(role?: Role): Step[] {
  return ['lang', 'name', 'role', ...(role ? MID[role] : []), 'city', 'country', 'goals', 'review']
}

export function filled(step: Step, d: Draft): boolean {
  switch (step) {
    case 'lang': return !!d.lang
    case 'name': return !!d.name
    case 'role': return !!d.role
    case 'team': return !!d.teamName
    case 'age': case 'childAge': return !!d.ageGroup
    case 'format': return !!d.format
    case 'players': return d.players.length > 0 || !!d.skipped.players
    case 'position': return !!d.position || !!d.skipped.position
    case 'club': case 'org': return !!d.club || !!d.skipped[step]
    case 'city': return !!d.city || !!d.skipped.city
    case 'country': return !!d.country || !!d.skipped.country
    case 'goals': return !!d.skipped.goals
    case 'review': return false
  }
}

export const nextStep = (d: Draft): Step => stepsFor(d.role).find((s) => !filled(s, d)) ?? 'review'

/** Goals that fit a role first. */
export function goalsFor(role?: Role): string[] {
  const order: Record<string, string[]> = {
    coach: ['identite', 'semaine', 'analyse', 'jeunes', 'lire'],
    player: ['progresser', 'lire', 'analyse', 'identite'],
    parent: ['jeunes', 'lire', 'progresser'],
    analyst: ['analyse', 'identite', 'semaine', 'lire'],
    manager: ['identite', 'jeunes', 'analyse', 'semaine'],
    federation: ['identite', 'jeunes', 'analyse', 'lire'],
  }
  return order[role || 'coach'] ?? GOALS
}

const SKIP = ['plus tard', 'later', 'passer', 'passe', 'skip', 'pas maintenant', 'not now', 'non', 'no', 'aucun', 'aucune', 'none', 'rien', 'nothing',
  'je ne sais pas', 'sais pas', "i don't know", 'dont know', 'pas de club', 'no club', 'sans club', 'pas encore', 'not yet', 'next', 'suivant']
export function isSkip(text: string) {
  const n = norm(text)
  return SKIP.some((w) => n === norm(w) || (n.length <= 24 && n.startsWith(norm(w) + ' ')))
}

const cleanText = (s: string) => s.replace(/^[\s:,;.\-"'«»]+|[\s:,;.!?\-"'«»]+$/g, '').replace(/\s+/g, ' ')
const titleCase = (s: string) => (s === s.toLowerCase() ? s.replace(/(^|[\s\-'])(\p{L})/gu, (_, a, b) => a + b.toUpperCase()) : s)

export interface Absorbed { draft: Draft; learned: Field[]; understood: boolean }

/** Merge what a free answer says. The asked step wins; other details fill empty fields (or correct them at the review). */
export function absorb(prev: Draft, step: Step, text: string): Absorbed {
  const d: Draft = { ...prev, goals: [...prev.goals], players: [...prev.players], skipped: { ...prev.skipped } }
  const learned = new Set<Field>()
  const set = <K extends Field & keyof Draft>(k: K, v: Draft[K] | undefined, force = false) => {
    if (v === undefined || v === '' || (Array.isArray(v) && !v.length)) return
    if (!force && d[k] !== undefined && !(Array.isArray(d[k]) && !(d[k] as unknown[]).length)) return
    if (JSON.stringify(d[k]) === JSON.stringify(v)) return
    d[k] = v
    learned.add(k)
  }
  let understood = false
  const skip = isSkip(text)
  const review = step === 'review'

  switch (step) {
    case 'lang': {
      const l = detectLang(text)
      if (l) { set('lang', l, true); understood = true }
      break
    }
    case 'name': {
      const n = parseName(text, true)
      if (n && !parseRole(n)) { set('name', n, true); understood = true }
      break
    }
    case 'role': {
      const r = parseRole(text) ?? (parsePosition(text) ? 'player' : undefined)
      if (r) { set('role', r, true); understood = true }
      break
    }
    case 'team': {
      if (skip) break
      const s = fillSlot('name', 'create_team', text, '2026-01-01')
      if (s.name) { set('teamName', s.name, true); understood = true }
      set('ageGroup', s.ageGroup); set('format', s.format)
      break
    }
    case 'age': case 'childAge': {
      const num = text.match(/\b(\d{1,2})\b/)
      const a = parseAgeGroup(text) ?? (num && Number(num[1]) >= 4 ? parseAgeGroup(`${num[1]} ans`) : undefined)
      if (a) { set('ageGroup', a, true); understood = true }
      break
    }
    case 'format': {
      const f = parseFormat(text, true)
      if (f) { set('format', f, true); understood = true }
      break
    }
    case 'players': {
      if (skip) { d.skipped.players = true; understood = true; break }
      const list = parsePlayerList(text).filter((p) => p.name.split(' ').length <= 5)
      if (list.length) { set('players', [...d.players, ...list], true); understood = true }
      break
    }
    case 'position': {
      if (skip) { d.skipped.position = true; understood = true; break }
      const p = parsePosition(text)
      if (p) { set('position', p, true); understood = true }
      break
    }
    case 'club': case 'org': {
      if (skip) { d.skipped[step] = true; understood = true; break }
      const c = parseClub(text) ?? cleanText(text)
      if (c && c.length <= 60) { set('club', titleCase(c), true); understood = true }
      break
    }
    case 'city': {
      if (skip) { d.skipped.city = true; understood = true; break }
      const c = parseCity(text, true)
      if (c.city) { set('city', c.city, true); understood = true }
      set('country', parseCountry(text) ?? c.country)
      break
    }
    case 'country': {
      if (skip) { d.skipped.country = true; understood = true; break }
      const c = parseCountry(text)
      const free = cleanText(text)
      if (c) set('country', c, true)
      else if (free && free.split(' ').length <= 4 && !/\d/.test(free)) set('country', titleCase(free), true)
      understood = learned.has('country')
      break
    }
    case 'goals': {
      const g = parseGoals(text)
      if (g.length) { set('goals', Array.from(new Set([...d.goals, ...g])), true); d.skipped.goals = true; understood = true }
      else if (skip) { d.skipped.goals = true; understood = true }
      break
    }
    case 'review': break
  }

  // everything else the sentence says ("entraîneur des U15 de Coton Sport à Garoua")
  if (step !== 'players' && step !== 'lang') {
    const p = parseProfile(text)
    if (step !== 'role') set('role', p.role, review)
    if (step !== 'name' && p.name) set('name', p.name, review)
    if (step !== 'age' && step !== 'childAge') set('ageGroup', p.ageGroup, review)
    if (step !== 'club' && step !== 'org' && step !== 'team' && p.club) set('club', p.club, review)
    if (step !== 'format') set('format', p.format, review)
    if (step !== 'position' && (d.role ?? p.role) === 'player') set('position', p.position, review)
    if (step !== 'city') set('city', p.city, review)
    if (step !== 'country' && step !== 'city') set('country', p.country, review)
    if (review) { const g = parseGoals(text); if (g.length) set('goals', Array.from(new Set([...d.goals, ...g])), true) }
  }
  // a coach who named the club and the category has told us the team
  if (d.role === 'coach' && !d.teamName && d.club && learned.has('club')) set('teamName', `${d.club}${d.ageGroup ? ` ${d.ageGroup}` : ''}`)
  return { draft: d, learned: [...learned], understood: understood || learned.size > 0 }
}

/** Whether a short reply in the composer looks like a list of players (to show the multi-line box). */
export const looksLikeList = (text: string) => text.split(/\n|,/).filter((s) => tokens(norm(s)).length).length >= 3

/** Fields to show on the profile card, in order, for a role. */
export function fieldsFor(role?: Role): Field[] {
  const mid: Record<Role, Field[]> = {
    coach: ['teamName', 'ageGroup', 'format', 'players'],
    player: ['ageGroup', 'position', 'club'],
    analyst: ['club'],
    parent: ['ageGroup'],
    manager: ['club'],
    federation: ['club'],
  }
  return ['name', 'role', ...(role ? mid[role] : []), 'city', 'country', 'goals', 'lang']
}

export function isFieldFilled(f: Field, d: Draft) {
  if (f === 'players' || f === 'goals') return d[f].length > 0
  return d[f] !== undefined && d[f] !== ''
}

export const defaultFormat = (age?: string): Format => { const m = (age || '').match(/U(\d+)/i); const n = m ? Number(m[1]) : 99; return n <= 9 ? 5 : n <= 11 ? 7 : n <= 13 ? 9 : 11 }

/** Country display name in the reading language ("Cameroun" / "Cameroon"); free text stays as written. */
export function countryName(c: string | undefined, lang: Lang) {
  if (!c) return ''
  if (!/^[A-Z]{2}$/.test(c)) return c
  try { return new Intl.DisplayNames([lang === 'fr' ? 'fr' : 'en'], { type: 'region' }).of(c) || c } catch { return c }
}
