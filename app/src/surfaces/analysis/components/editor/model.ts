// The editor's data helpers: set pieces, coded actions seen as one list, automatic clips,
// « Temps utile » segments, who is on the pitch at a moment, small preferences and moment links.
import type { LucideIcon } from 'lucide-react'
import { CornerDownRight, Flag, LogIn, RectangleHorizontal, Target } from 'lucide-react'
import type { Clip, EventCode, Match, MatchEvent, Player, SetPieceCode, VideoProject, VideoTag } from '../../../../lib/types'
import { fmtClock } from '../../../../lib/util'
import { defFor, minuteLabel, NOTE_DEF, type GroupId } from '../codes'
import { parseVideoLink } from '../videoSource'

export const fmtT = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)}:${fmtClock(s % 3600)}` : fmtClock(s))
/** "12:34.5" for precise in and out points. */
export const fmtTenth = (s: number) => `${fmtT(s)}.${Math.floor((Math.max(0, s) % 1) * 10)}`

/* ------------------------------------------------------------------ set pieces */

export interface SetDef { key: string; code: SetPieceCode; side: 'us' | 'them'; kbd: string; key1: string; icon: LucideIcon; color: string }
const SP: [SetPieceCode, string, LucideIcon][] = [
  ['CORNER', 'c', CornerDownRight],
  ['FREEKICK', 'x', Target],
  ['PENALTY', 'p', Flag],
  ['THROWIN', 't', LogIn],
  ['GOALKICK', 'g', RectangleHorizontal],
]
/** Set pieces for us (key) and for them (Shift + key). They never count in the Indice. */
export const SET_DEFS: SetDef[] = [
  ...SP.map(([code, k, icon]) => ({ key: code, code, side: 'us' as const, kbd: k.toUpperCase(), key1: k, icon, color: '#BF5A2E' })),
  ...SP.map(([code, k, icon]) => ({ key: `OPP_${code}`, code, side: 'them' as const, kbd: `⇧${k.toUpperCase()}`, key1: k, icon, color: '#DB8D66' })),
]
export const isSetPiece = (code: string): code is SetPieceCode => SP.some(([c]) => c === code)
export const setDef = (code: string, side: 'us' | 'them') => SET_DEFS.find((d) => d.code === code && d.side === side)
export function setFromKey(e: KeyboardEvent): SetDef | undefined {
  if (e.ctrlKey || e.metaKey || e.altKey) return undefined
  const k = e.key.toLowerCase()
  return SET_DEFS.find((d) => d.key1 === k && (d.side === 'them') === e.shiftKey)
}

/* ------------------------------------------------------------------ one list of coded actions */

/** A project tag may carry a place and players too (stored as extra fields, same frame as MatchEvent). */
export type TagX = VideoTag & { x?: number; y?: number; playerId?: string; toPlayerId?: string }
export type Group = GroupId | 'setpiece' | 'note'

/** A coded action as the editor sees it, whether it lives in the match events or in the project tags. */
export interface Coded {
  id: string
  t: number // video seconds
  code: EventCode | 'NOTE'
  side: 'us' | 'them'
  note?: string
  drawing?: string
  x?: number
  y?: number
  playerId?: string
  toPlayerId?: string
  /** where it is stored */
  store: 'event' | 'tag'
  half?: 1 | 2 | 3 | 4
  mt?: number // seconds since the kick-off of its half
}

export const isChild = (id: string) => id.includes('~')

export function groupOf(code: EventCode | 'NOTE', side: 'us' | 'them'): Group {
  if (code === 'NOTE') return 'note'
  if (isSetPiece(code)) return 'setpiece'
  return defFor(code, side)?.group ?? 'possession'
}

/** Marker colour of a coded action (timeline, list, mini-pitch). */
export function colorOf(code: EventCode | 'NOTE', side: 'us' | 'them') {
  if (code === 'NOTE') return '#C9D1C5'
  if (isSetPiece(code)) return setDef(code, side)?.color ?? '#BF5A2E'
  return defFor(code, side)?.color ?? NOTE_DEF.color
}
/** Label key: analysis:short.* for the codes, editor:sp.* for the set pieces. */
export function labelKey(code: EventCode | 'NOTE', side: 'us' | 'them') {
  if (code === 'NOTE') return 'analysis:short.NOTE'
  if (isSetPiece(code)) return `editor:sp.${side}.${code}`
  return `analysis:short.${defFor(code, side)?.key ?? code}`
}

/** Groups of the timeline lanes, top to bottom. */
export const LANES: Group[] = ['possession', 'danger', 'fixation', 'transition', 'setpiece', 'opponent', 'note']
/** The colour that stands for a whole group (lane labels, filters). */
export const GROUP_COLOR: Record<Group, string> = {
  possession: '#13804F', danger: '#F5B700', fixation: '#73B391', transition: '#D7263D', setpiece: '#BF5A2E', opponent: '#94A198', note: '#C9D1C5',
}
/** Where a coded action sits in the lanes: the opponent's set pieces go with the set pieces. */
export const laneOf = (c: Pick<Coded, 'code' | 'side'>): Group => groupOf(c.code, c.side)

/* ------------------------------------------------------------------ clips */

const AUTO_BEFORE = 8
const AUTO_AFTER = 4
export const AUTO_PREFIX = 'auto_'

/** Automatic clips: every goal and every shot of the match (a shot that ends in a goal gives one clip, the goal). */
export function autoClips(events: MatchEvent[], duration?: number): Clip[] {
  const coded = events.filter((e) => e.videoT != null)
  const goals = coded.filter((e) => e.code === 'GOAL')
  const shots = coded.filter((e) => e.code === 'SHOT' && !goals.some((g) => g.side === e.side && Math.abs((g.videoT as number) - (e.videoT as number)) <= 1.5))
  const end = duration && duration > 0 ? duration : Infinity
  return [...goals, ...shots]
    .sort((a, b) => (a.videoT as number) - (b.videoT as number))
    .map((e) => ({
      id: `${AUTO_PREFIX}${e.id}`, eventId: e.id, auto: true,
      start: Math.max(0, Math.round(((e.videoT as number) - AUTO_BEFORE) * 10) / 10),
      end: Math.min(end, Math.round(((e.videoT as number) + AUTO_AFTER) * 10) / 10),
      title: '', playerIds: e.playerId ? [e.playerId] : [], createdAt: e.createdAt,
    }))
}

/** The clips of a project: its own, plus the automatic ones that follow the coded goals and shots. */
export function mergeClips(project: VideoProject, events: MatchEvent[]): Clip[] {
  const own = (project.clips ?? []).filter((c) => !c.auto)
  const stored = new Map((project.clips ?? []).filter((c) => c.auto).map((c) => [c.id, c]))
  const auto = autoClips(events, project.duration).map((c) => ({ ...c, drawing: stored.get(c.id)?.drawing }))
  return [...own, ...auto].sort((a, b) => a.start - b.start)
}

/** Do the stored automatic clips already match the events? (avoids useless writes) */
export function sameAuto(stored: Clip[] | undefined, fresh: Clip[]) {
  const a = (stored ?? []).filter((c) => c.auto)
  if (a.length !== fresh.length) return false
  const m = new Map(a.map((c) => [c.id, c]))
  return fresh.every((c) => { const s = m.get(c.id); return !!s && s.start === c.start && s.end === c.end && (s.playerIds ?? []).join() === (c.playerIds ?? []).join() })
}

/* ------------------------------------------------------------------ Temps utile */

export const USEFUL_GAP = 12
const PAD_BEFORE = 4
const PAD_AFTER = 3

/** The parts of the video around coded actions and clips: gaps longer than 12 s without any code are skipped. */
export function usefulSegments(times: number[], clips: Pick<Clip, 'start' | 'end'>[]): [number, number][] {
  const ts = [...times].sort((a, b) => a - b)
  const raw: [number, number][] = []
  let a = -1, b = -1
  for (const t of ts) {
    if (a < 0) { a = t; b = t; continue }
    if (t - b <= USEFUL_GAP) b = t
    else { raw.push([Math.max(0, a - PAD_BEFORE), b + PAD_AFTER]); a = t; b = t }
  }
  if (a >= 0) raw.push([Math.max(0, a - PAD_BEFORE), b + PAD_AFTER])
  for (const c of clips) raw.push([c.start, c.end])
  raw.sort((x, y) => x[0] - y[0])
  const out: [number, number][] = []
  for (const s of raw) {
    const last = out[out.length - 1]
    if (last && s[0] <= last[1] + 0.5) last[1] = Math.max(last[1], s[1])
    else out.push([s[0], s[1]])
  }
  return out
}
export const segmentsLength = (segs: [number, number][]) => segs.reduce((n, [a, b]) => n + (b - a), 0)

/* ------------------------------------------------------------------ who is on the pitch */

export interface Roster { on: Player[]; others: Player[]; inferred: boolean }

/**
 * The players on the pitch at a video moment: the match line-up, plus the substitutes from their first
 * coded action, minus the starter each one most likely replaced (the one whose last action comes just before).
 * Without a line-up: the whole squad.
 */
export function rosterAt(match: Match | undefined, squad: Player[], events: MatchEvent[], videoT: number): Roster {
  const byNum = (a: Player, b: Player) => (a.number ?? 999) - (b.number ?? 999)
  const starters = (match?.lineup ?? []).map((l) => l.playerId).filter((id): id is string => !!id)
  if (!match || starters.length === 0) return { on: [...squad].sort(byNum), others: [], inferred: false }
  const byId = new Map(squad.map((p) => [p.id, p]))
  const first = new Map<string, number>(), last = new Map<string, number>()
  for (const e of events) {
    if (e.videoT == null) continue
    for (const id of [e.playerId, e.toPlayerId]) {
      if (!id) continue
      if (!first.has(id) || e.videoT < first.get(id)!) first.set(id, e.videoT)
      if (!last.has(id) || e.videoT > last.get(id)!) last.set(id, e.videoT)
    }
  }
  const entered = squad.filter((p) => !starters.includes(p.id) && first.has(p.id)).sort((a, b) => first.get(a.id)! - first.get(b.id)!)
  const replaced = new Map<string, number>() // starter id > time he went off
  const enterAt = new Map<string, number>() // substitute id > time he came on
  for (const sub of entered) {
    const tIn = first.get(sub.id)!
    const cand = starters.filter((s) => !replaced.has(s) && (last.get(s) ?? -1) <= tIn + 30)
      .sort((x, y) => Math.abs((last.get(x) ?? 0) - tIn) - Math.abs((last.get(y) ?? 0) - tIn))[0]
    const at = cand ? Math.min(tIn, (last.get(cand) ?? tIn) + 1) : tIn - 30
    if (cand) replaced.set(cand, at)
    enterAt.set(sub.id, at)
  }
  const onIds = [
    ...starters.filter((s) => (replaced.get(s) ?? Infinity) > videoT),
    ...entered.filter((p) => (enterAt.get(p.id) ?? Infinity) <= videoT).map((p) => p.id),
  ]
  const on = [...new Set(onIds)].map((id) => byId.get(id)).filter((p): p is Player => !!p).sort(byNum)
  const others = squad.filter((p) => !on.includes(p)).sort(byNum)
  return { on, others, inferred: entered.length > 0 }
}

/* ------------------------------------------------------------------ preferences */

const PREF = 'njangi.editor.'
export function getPref(k: string, fallback = false): boolean {
  try { const v = localStorage.getItem(PREF + k); return v == null ? fallback : v === '1' } catch { return fallback }
}
export function setPref(k: string, v: boolean) { try { localStorage.setItem(PREF + k, v ? '1' : '0') } catch { /* private mode */ } }

/* ------------------------------------------------------------------ links */

/** The platform link that opens the video at a moment (YouTube ?t=; Facebook links ignore the time, the text says it). */
export function momentLink(project: Pick<VideoProject, 'url' | 'source'>, t: number): { url: string; exact: boolean } | null {
  if (!project.url) return null
  const p = parseVideoLink(project.url)
  if (!p) return null
  const s = Math.max(0, Math.floor(t))
  if (p.source === 'youtube' && p.id) return { url: `https://youtu.be/${p.id}?t=${s}`, exact: true }
  return { url: p.url, exact: false }
}

export const isNativeSource = (p: Pick<VideoProject, 'source'>) => p.source !== 'youtube' && p.source !== 'facebook'

/* ------------------------------------------------------------------ clip titles */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Tr = (key: string, opts?: any) => string

/** The title of an automatic clip, from its action: « But, Serge Eyoum, 31' », « Tir adverse, 52' ». */
export function autoClipTitle(t: Tr, e: MatchEvent | undefined, player: Player | undefined, halfMinutes: number, lng?: string): string {
  if (!e) return t('editor:clips.auto', { lng })
  const what = t(e.code === 'GOAL' ? (e.side === 'us' ? 'editor:clips.kind.goal' : 'editor:clips.kind.goalThem') : e.side === 'us' ? 'editor:clips.kind.shot' : 'editor:clips.kind.shotThem', { lng })
  const minute = minuteLabel(e.half, e.t, halfMinutes)
  return player ? t('editor:clips.autoTitleWho', { what, name: player.name, minute, lng }) : t('editor:clips.autoTitle', { what, minute, lng })
}

/** The title of any clip. */
export function clipTitle(t: Tr, c: Clip, events: Map<string, MatchEvent>, players: Map<string, Player>, halfMinutes: number, lng?: string): string {
  if (c.auto) { const e = c.eventId ? events.get(c.eventId) : undefined; return autoClipTitle(t, e, e?.playerId ? players.get(e.playerId) : undefined, halfMinutes, lng) }
  return c.title || t('editor:clips.untitled', { t: fmtT(c.start), lng })
}
