// Pure helpers for the training surface (drills, sessions, week). No React here.
import { DRILLS, getDrill, drillText } from '../../../content'
import { db } from '../../../lib/db'
import type { Drill, Intention, Lang, Match, MD, Session, SessionBlock, SkillKey } from '../../../lib/types'
import { addDays, daysBetween, fmtDate, nowISO, todayISO, uid, weekStart } from '../../../lib/util'

export type Intensity = Drill['intensity']
export type Family = Drill['family']
export type Tone = 'neutral' | 'forest' | 'terra' | 'sun' | 'clay' | 'dark' | 'ok'

export const INTENSITIES: Intensity[] = ['low', 'medium', 'high', 'very-high']
export const INTENSITY_FACTOR: Record<Intensity, number> = { low: 1, medium: 2, high: 3, 'very-high': 4 }
/** Sequential terracotta ramp, light to dark (validated against the paper surface). */
export const INTENSITY_COLOR: Record<Intensity, string> = { low: '#E0A56B', medium: '#C5762F', high: '#A86020', 'very-high': '#844A17' }
export const LOAD_COLOR = '#C5762F'

export const MD_LIST: MD[] = ['MD-4', 'MD-3', 'MD-2', 'MD-1', 'MD+1', 'youth']
export const MD_TONE: Record<MD, Tone> = { 'MD-4': 'clay', 'MD-3': 'terra', 'MD-2': 'sun', 'MD-1': 'forest', 'MD+1': 'neutral', youth: 'ok' }

/** "U11+" -> 11. Drills without an age are open to everyone. */
export const ageNum = (ages?: string) => { const m = (ages || '').match(/U(\d+)/i); return m ? Number(m[1]) : 6 }
export const groupAge = (g?: string) => { const m = (g || '').match(/U(\d+)/i); return m ? Number(m[1]) : 99 }
/** Age chips: a drill fits a group when its minimum age is at or below the group's age. 99 = seniors. */
export const AGE_STEPS = [9, 11, 13, 15, 17, 99] as const
export const ageStepLabel = (n: number) => (n >= 99 ? 'Seniors' : `U${n}`)
export const ageStepFor = (g?: string) => { const a = groupAge(g); return AGE_STEPS.find((s) => a <= s) ?? 99 }

/** "lundi 26" in French, "Monday, Oct 26" in English (en-US would otherwise print "26 Monday"). */
export const fmtDay = (iso: string, lang: Lang) => fmtDate(iso, lang, lang === 'en' ? { weekday: 'long', month: 'short', day: 'numeric' } : { weekday: 'long', day: 'numeric' })

export const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/* ---------------- drill filters ---------------- */

export interface DrillFilter { q: string; family: string[]; intention: string[]; day: string[]; age: number | null; intensity: string[] }
export type Facet = 'family' | 'intention' | 'day' | 'age' | 'intensity'
export const EMPTY_FILTER: DrillFilter = { q: '', family: [], intention: [], day: [], age: null, intensity: [] }

const searchIndex = new Map<string, string>()
function haystack(d: Drill) {
  let s = searchIndex.get(d.id)
  if (!s) {
    s = norm([d.id, d.fr?.title, d.fr?.subtitle, d.en?.title, d.en?.subtitle, d.fr?.objective, d.en?.objective, d.skills.join(' '), d.intentions.join(' ')].join(' '))
    searchIndex.set(d.id, s)
  }
  return s
}

export function matches(d: Drill, f: DrillFilter, skip?: Facet) {
  if (f.q.trim()) {
    const h = haystack(d)
    if (!norm(f.q).split(/\s+/).filter(Boolean).every((w) => h.includes(w))) return false
  }
  if (skip !== 'family' && f.family.length && !f.family.includes(d.family)) return false
  if (skip !== 'intention' && f.intention.length && !d.intentions.some((i) => f.intention.includes(i))) return false
  if (skip !== 'day' && f.day.length && !d.md.some((m) => f.day.includes(m))) return false
  if (skip !== 'age' && f.age !== null && ageNum(d.ages) > f.age) return false
  if (skip !== 'intensity' && f.intensity.length && !f.intensity.includes(d.intensity)) return false
  return true
}

/** Faceted count: drills that would match if this value were the only choice in its facet. */
export function facetCount(drills: Drill[], f: DrillFilter, facet: Facet, value: string | number) {
  return drills.filter((d) => {
    if (!matches(d, f, facet)) return false
    if (facet === 'family') return d.family === value
    if (facet === 'intention') return d.intentions.includes(value as Intention)
    if (facet === 'day') return d.md.includes(value as MD)
    if (facet === 'age') return ageNum(d.ages) <= Number(value)
    return d.intensity === value
  }).length
}

export const activeCount = (f: DrillFilter) => f.family.length + f.intention.length + f.day.length + (f.age !== null ? 1 : 0) + f.intensity.length

export function filterToParams(f: DrillFilter) {
  const p: Record<string, string> = {}
  if (f.q) p.q = f.q
  if (f.family.length) p.f = f.family.join(',')
  if (f.intention.length) p.i = f.intention.join(',')
  if (f.day.length) p.d = f.day.join(',')
  if (f.age !== null) p.a = String(f.age)
  if (f.intensity.length) p.n = f.intensity.join(',')
  return p
}
export function paramsToFilter(sp: URLSearchParams): DrillFilter {
  const list = (k: string) => (sp.get(k) || '').split(',').filter(Boolean)
  const a = sp.get('a')
  return { q: sp.get('q') || '', family: list('f'), intention: list('i'), day: list('d'), age: a ? Number(a) : null, intensity: list('n') }
}

/* ---------------- blocks and sessions ---------------- */

export const blockDrill = (b: SessionBlock) => (b.drillId ? getDrill(b.drillId) : undefined)

export function blockIntensity(b: SessionBlock, md: MD): Intensity {
  const d = blockDrill(b)
  if (d) return d.intensity
  return md === 'MD-1' || md === 'MD+1' ? 'low' : 'medium'
}
export const blockLoad = (b: SessionBlock, md: MD) => (Number(b.minutes) || 0) * INTENSITY_FACTOR[blockIntensity(b, md)]
export const sessionLoad = (s: Session) => s.blocks.reduce((a, b) => a + blockLoad(b, s.md), 0)

export function blockTitle(b: SessionBlock, lang: Lang) {
  const d = blockDrill(b)
  if (d) return drillText(d, lang).title
  return b.title || b.drillId || ''
}

export function coverage(s: Session) {
  const intentions = new Set<Intention>()
  const skills = new Set<SkillKey>()
  for (const b of s.blocks) {
    const d = blockDrill(b)
    if (!d) continue
    d.intentions.forEach((i) => intentions.add(i))
    d.skills.forEach((k) => skills.add(k))
  }
  return { intentions, skills }
}

export const sortSessions = (a: Session, b: Session) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)

export const forTeam = (teamId?: string | null) => (s: { teamId?: string }) => !teamId || !s.teamId || s.teamId === teamId

export async function createSession(p: { title: string; date: string; md: MD; intention?: Intention; teamId?: string; blocks?: SessionBlock[]; createdBy?: 'user' | 'mola' }) {
  const s: Session = { id: uid('se_'), teamId: p.teamId, title: p.title, date: p.date, md: p.md, intention: p.intention, blocks: p.blocks ?? [], createdBy: p.createdBy ?? 'user', createdAt: nowISO() }
  await db.sessions.put(s)
  return s
}

export const drillBlock = (d: Drill): SessionBlock => ({ id: uid('bl_'), drillId: d.id, minutes: d.minutes || 15 })

/** A drill's best day for a new session: the first match-week day it fits, else its first day. */
export const drillDefaultMd = (d: Drill): MD => d.md.find((m) => m !== 'youth' && m !== 'MD+1') ?? d.md[0] ?? 'youth'

/* ---------------- week and match days ---------------- */

export interface DayInfo { label: string; alt?: string; kind: 'match' | 'pre' | 'post' | 'none'; k: number; md: MD; hint: string }

/**
 * Names a day relative to the next match of that week (MD-4 ... MD), or MD+n after a recent match.
 * `alt` is the label relative to the previous match when it is close (MD-5 is also MD+2, the rest day).
 * `md` is the session type to prefill when the coach creates a session on that day.
 * `hint` is an i18n key under dayHint.
 */
export function dayInfo(date: string, matchesAll: Match[], ageGroup?: string): DayInfo {
  const mon = weekStart(date), sun = addDays(mon, 6)
  const next = matchesAll.filter((m) => m.date >= date && m.date <= sun).sort((a, b) => a.date.localeCompare(b.date))[0]
  const prev = matchesAll.filter((m) => m.date < date).sort((a, b) => b.date.localeCompare(a.date))[0]
  const since = prev ? daysBetween(prev.date, date) : 99
  if (next) {
    const k = daysBetween(date, next.date)
    if (k === 0) return { label: 'MD', kind: 'match', k: 0, md: 'MD-1', hint: 'MD' }
    if (k <= 4) return { label: `MD-${k}`, alt: since <= 2 ? `MD+${since}` : undefined, kind: 'pre', k, md: `MD-${k}` as MD, hint: since === 1 ? 'MD+1' : `MD-${k}` }
    return { label: `MD-${k}`, alt: since <= 3 ? `MD+${since}` : undefined, kind: 'pre', k, md: since === 1 ? 'MD+1' : 'MD-4', hint: since === 1 ? 'MD+1' : since === 2 ? 'MD+2' : 'free' }
  }
  if (since <= 3) return { label: `MD+${since}`, kind: 'post', k: since, md: since === 1 ? 'MD+1' : groupAge(ageGroup) <= 13 ? 'youth' : 'MD-4', hint: since === 1 ? 'MD+1' : since === 2 ? 'MD+2' : 'free' }
  return { label: '', kind: 'none', k: 0, md: groupAge(ageGroup) <= 13 ? 'youth' : 'MD-3', hint: 'free' }
}

/** The session type to suggest for a date (looks at matches up to a week ahead). */
export function suggestMd(date: string, matchesAll: Match[], ageGroup?: string): MD {
  const next = matchesAll.filter((m) => m.date > date && m.status !== 'done').sort((a, b) => a.date.localeCompare(b.date))[0]
  if (next) { const k = daysBetween(date, next.date); if (k >= 1 && k <= 4) return `MD-${k}` as MD }
  const prev = matchesAll.filter((m) => m.date < date).sort((a, b) => b.date.localeCompare(a.date))[0]
  if (prev && daysBetween(prev.date, date) === 1) return 'MD+1'
  return dayInfo(date, matchesAll, ageGroup).md
}

export const isUpcoming = (s: Session) => s.date >= todayISO()

export function weekKeyLabel(key: string, today = todayISO()) {
  const cur = weekStart(today)
  const diff = daysBetween(cur, key) / 7
  if (diff === 0) return 'thisWeek'
  if (diff === 1) return 'nextWeek'
  if (diff === -1) return 'lastWeek'
  return 'weekOf'
}

export { DRILLS }
