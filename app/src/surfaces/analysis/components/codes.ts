// Tag buttons shared by the live tagger and the video studio: codes, groups, colours, shortcuts.
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeftRight, ArrowRight, ArrowUpRight, ChevronsRight, Crosshair, Flag, Goal, Hand, Magnet,
  ShieldAlert, SquareDashed, StickyNote, Target, Timer, Unlink, X,
} from 'lucide-react'
import type { EventCode } from '../../../lib/types'

export type LiveKey = EventCode | 'OPP_SHOT' | 'OPP_GOAL' | 'OPP_PASS' | 'OPP_PASS_LOST' | 'OPP_FINAL3'
export type GroupId = 'possession' | 'danger' | 'fixation' | 'transition' | 'opponent'

export interface TagDef {
  key: LiveKey
  code: EventCode
  side: 'us' | 'them'
  group: GroupId
  /** label shown on the keyboard badge */
  kbd: string
  /** KeyboardEvent.code values (layout independent) or lower-case KeyboardEvent.key values */
  codes: string[]
  keys: string[]
  icon: LucideIcon
  /** tailwind classes for the big dark-screen button (possession green, danger chalk, the goal gold, fixation mint, losses kola red) */
  btn: string
  /** a hex colour for dots, markers and chart marks (readable on chalk and on night) */
  color: string
  /** negative event (a loss of the ball) */
  negative?: boolean
  /** only shown when "tag the opponent too" is on */
  optional?: boolean
  /** codes recorded with it (chapter 32: SHOT_IN adds SHOT, GOAL adds SHOT and SHOT_IN) */
  implies?: EventCode[]
}

const d = (key: LiveKey, code: EventCode, side: 'us' | 'them', group: GroupId, kbd: string, codes: string[], keys: string[], icon: LucideIcon, btn: string, color: string, negative = false, extra: Partial<TagDef> = {}): TagDef =>
  ({ key, code, side, group, kbd, codes, keys, icon, btn, color, negative, ...extra })

const digit = (n: number) => [`Digit${n}`, `Numpad${n}`]

export const TAGS: TagDef[] = [
  d('PASS_OK', 'PASS_OK', 'us', 'possession', '1', digit(1), [], ArrowRight, 'bg-forest-500 text-cream', '#13804F'),
  d('PASS_LOST', 'PASS_LOST', 'us', 'possession', '2', digit(2), [], X, 'bg-clay-500 text-white', '#D7263D', true),
  d('PROG', 'PROG', 'us', 'possession', '3', digit(3), [], ArrowUpRight, 'bg-forest-600 text-cream ring-1 ring-inset ring-forest-300/35', '#0B5D3B'),
  d('LINE', 'LINE', 'us', 'possession', '4', digit(4), [], ChevronsRight, 'bg-forest-600 text-cream ring-1 ring-inset ring-forest-300/35', '#0B5D3B'),
  d('FINAL3', 'FINAL3', 'us', 'danger', '5', digit(5), [], Flag, 'bg-cream text-ink', '#C9D1C5'),
  d('BOX', 'BOX', 'us', 'danger', '6', digit(6), [], SquareDashed, 'bg-cream text-ink', '#C9D1C5'),
  d('SHOT', 'SHOT', 'us', 'danger', '7', digit(7), [], Crosshair, 'bg-cream text-ink', '#94A198'),
  d('SHOT_IN', 'SHOT_IN', 'us', 'danger', '8', digit(8), [], Target, 'bg-cream text-ink', '#94A198', false, { implies: ['SHOT'] }),
  d('GOAL', 'GOAL', 'us', 'danger', '9', digit(9), [], Goal, 'bg-sun-500 text-ink', '#F5B700', false, { implies: ['SHOT', 'SHOT_IN'] }),
  d('FIX2', 'FIX2', 'us', 'fixation', 'F', [], ['f'], Magnet, 'bg-forest-300 text-night-900', '#73B391'),
  d('SWITCH', 'SWITCH', 'us', 'fixation', 'S', [], ['s'], ArrowLeftRight, 'bg-forest-300 text-night-900', '#73B391'),
  d('LOSS', 'LOSS', 'us', 'transition', 'L', [], ['l'], Unlink, 'bg-clay-600 text-white', '#B51D31', true),
  d('REGAIN5', 'REGAIN5', 'us', 'transition', 'K', [], ['k'], Timer, 'bg-night-700 text-forest-100 ring-2 ring-inset ring-forest-300/60', '#CBE5D6'),
  d('REGAIN', 'REGAIN', 'us', 'transition', 'R', [], ['r'], Hand, 'bg-night-700 text-forest-100 ring-2 ring-inset ring-forest-300/60', '#CBE5D6'),
  d('OPP_SHOT', 'SHOT', 'them', 'opponent', 'A', [], ['a'], Crosshair, 'bg-white/[0.03] text-cream/90 ring-1 ring-inset ring-white/20', '#5D6C63'),
  d('OPP_GOAL', 'GOAL', 'them', 'opponent', 'B', [], ['b'], ShieldAlert, 'bg-white/[0.03] text-cream ring-2 ring-inset ring-clay-300/80', '#E8798A', false, { implies: ['SHOT'] }),
  d('OPP_PASS', 'PASS_OK', 'them', 'opponent', 'Q', [], ['q'], ArrowRight, 'bg-white/[0.03] text-cream/80 ring-1 ring-inset ring-white/15', '#5D6C63', false, { optional: true }),
  d('OPP_PASS_LOST', 'PASS_LOST', 'them', 'opponent', 'W', [], ['w'], X, 'bg-white/[0.03] text-cream/80 ring-1 ring-inset ring-white/15', '#5D6C63', false, { optional: true }),
  d('OPP_FINAL3', 'FINAL3', 'them', 'opponent', 'E', [], ['e'], Flag, 'bg-white/[0.03] text-cream/80 ring-1 ring-inset ring-white/15', '#5D6C63', false, { optional: true }),
]

/** Ink or chalk for an icon drawn on a tag's marker colour. */
export function markInk(color?: string) {
  const m = /^#([0-9a-f]{6})$/i.exec(color ?? '')
  if (!m) return 'text-ink'
  const n = parseInt(m[1], 16)
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return lum > 0.55 ? 'text-ink' : 'text-white'
}

export const NOTE_DEF = { icon: StickyNote, color: '#ECEFE8', kbd: 'N' }

export const GROUP_ORDER: GroupId[] = ['possession', 'danger', 'fixation', 'transition', 'opponent']

export const tagByKey = (k: LiveKey) => TAGS.find((t) => t.key === k)!

/** The definition matching a stored event (code + side). */
export function defFor(code: EventCode | 'NOTE', side: 'us' | 'them'): TagDef | undefined {
  if (code === 'NOTE') return undefined
  return TAGS.find((t) => t.side === side && t.code === code) ?? TAGS.find((t) => t.code === code)
}

/** Label key (analysis:short.*) for a stored event. */
export const shortKey = (code: EventCode | 'NOTE', side: 'us' | 'them') => (code === 'NOTE' ? 'NOTE' : defFor(code, side)?.key ?? code)

/** Which tag a key press means (ignores presses with ctrl, meta or alt). */
export function tagFromKey(e: KeyboardEvent): TagDef | undefined {
  if (e.ctrlKey || e.metaKey || e.altKey) return undefined
  return TAGS.find((t) => t.codes.includes(e.code) || (e.key && t.keys.includes(e.key.toLowerCase())))
}

/** Do not steal keys from text fields. */
export const isTyping = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
}

/** Haptic feedback when the device supports it. */
export function buzz(pattern: number | number[] = 12) {
  try { if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern) } catch { /* not supported */ }
}

/** Length of an extra-time half for a given half length. */
export const extraMinutes = (halfMinutes: number) => (halfMinutes >= 40 ? 15 : Math.max(5, Math.round(halfMinutes / 3)))

/** Minutes already played before a half starts. */
export function halfOffset(half: 1 | 2 | 3 | 4, halfMinutes: number) {
  const et = extraMinutes(halfMinutes)
  return half === 1 ? 0 : half === 2 ? halfMinutes : half === 3 ? 2 * halfMinutes : 2 * halfMinutes + et
}
export const halfLength = (half: 1 | 2 | 3 | 4, halfMinutes: number) => (half <= 2 ? halfMinutes : extraMinutes(halfMinutes))

/** Match clock in seconds (for display), from a half and seconds since its kick-off. */
export const matchSeconds = (half: 1 | 2 | 3 | 4, t: number, halfMinutes: number) => halfOffset(half, halfMinutes) * 60 + t

/** "12'" style minute, with added time ("45+2'"). */
export function minuteLabel(half: 1 | 2 | 3 | 4, t: number, halfMinutes: number) {
  const len = halfLength(half, halfMinutes) * 60
  const off = halfOffset(half, halfMinutes)
  if (t > len) return `${off + halfLength(half, halfMinutes)}+${Math.ceil((t - len) / 60)}'`
  return `${off + Math.floor(t / 60) + 1}'`
}

/** "Lionceaux de Bonamoussadi U13" > "Lionceaux": the first meaningful word, for the tight top bar. */
export function shortTeam(name: string) {
  const words = name.trim().split(/\s+/)
  const first = words.find((w) => w.length > 3 && !/^(fc|as|us|ac|sc|cs|afc|club|team|les|the)$/i.test(w)) ?? words[0] ?? name
  return first.length > 14 ? first.slice(0, 13) + '.' : first
}

/** A share as a percentage: "75 %" in French (narrow no-break space), "75%" in English. */
export const fmtPct = (v: number, lang: 'fr' | 'en' = 'fr', digits = 0) => {
  const n = (v * 100).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  return lang === 'fr' ? `${n} %` : `${n}%`
}
