// The 64 lessons: the drill sheets (content/drills.gen.ts, generated from the book) joined with
// their gameplay rules (gameplay.ts). A drill without rules falls back to a family default, so
// a new sheet added to the book is playable straight away (and flagged as such).
import { DRILLS } from '../../../content/drills.gen'
import type { Drill } from '../../../lib/types'
import { GAMEPLAY_LIST } from './gameplayList'
import type { DrillGameplay } from './types'

const BY_ID = new Map<string, DrillGameplay>(GAMEPLAY_LIST.map((g) => [g.id, g]))

export const FAMILY_ORDER: Drill['family'][] = ['technique', 'rondo', 'position', 'ssg', 'lsg', 'phase', 'transition', 'finishing']

export const LESSONS_ORDERED: Drill[] = DRILLS.slice().sort((a, b) => FAMILY_ORDER.indexOf(a.family) - FAMILY_ORDER.indexOf(b.family) || a.order - b.order)
/** the ids of the 64 sheets (progress rows of other modes, like the Défi's DIX, are not lessons) */
export const LESSON_IDS: ReadonlySet<string> = new Set(DRILLS.map((d) => d.id))

export const lessonDrill = (id?: string) => DRILLS.find((d) => d.id === id)

export function gameplayFor(d: Drill): DrillGameplay & { fallback?: boolean } {
  return BY_ID.get(d.id) ?? { ...fallbackGameplay(d), fallback: true }
}

/** Family defaults, used only when a sheet has no hand-written rules. */
export function fallbackGameplay(d: Drill): DrillGameplay {
  const hasGoal = (d.diagram.goals?.length ?? 0) > 0 || d.diagram.view !== 'grid'
  const base = { id: d.id, diagram: 1 as const, feedback: [], source: [], restart: 'reset' as const }
  switch (d.family) {
    case 'technique':
      return { ...base, mode: 'pattern', control: 'decisions', opposition: 'none', target: { kind: 'sequences', value: 3 }, scoring: [{ event: 'sequence', points: 1 }] }
    case 'rondo':
      return { ...base, mode: 'keepball', control: 'decisions', opposition: 'active', touches: 2, duration: 90, target: { kind: 'points', value: 6 }, scoring: [{ event: 'consecutive_passes', n: 5, points: 1 }, { event: 'split_pass', points: 1 }], fail: ['loss', 'out'] }
    case 'position':
      return { ...base, mode: 'keepball', control: 'decisions', opposition: 'active', duration: 120, target: { kind: 'points', value: 6 }, scoring: [{ event: 'consecutive_passes', n: 6, points: 1 }, { event: 'line_break', points: 1 }], fail: ['loss', 'out'] }
    case 'ssg': case 'lsg':
      return { ...base, mode: 'ssg', control: 'carrier', opposition: 'active', duration: 150, target: { kind: 'goals', value: 2 }, scoring: [{ event: 'goal', points: 1 }], restart: 'other_team_keeps', fail: [] }
    case 'phase':
      return { ...base, mode: 'phase', control: 'decisions', opposition: 'active', duration: 25, target: { kind: 'attempts', attempts: 5, success: 3 }, scoring: hasGoal ? [{ event: 'goal', points: 1 }] : [{ event: 'cross_line', x: d.diagram.view === 'full' ? 52.5 : 35, points: 1 }], fail: ['loss', 'out', 'timeout'] }
    case 'transition':
      return { ...base, mode: 'transition', control: 'carrier', opposition: 'active', duration: 20, target: { kind: 'attempts', attempts: 5, success: 3 }, scoring: [{ event: 'regain5', points: 1 }, { event: 'goal', points: 1 }], fail: ['timeout'] }
    case 'finishing':
      return { ...base, mode: 'finishing', control: 'decisions', opposition: 'passive', duration: 20, target: { kind: 'attempts', attempts: 5, success: 3 }, scoring: [{ event: 'goal', points: 1 }], fail: ['loss', 'out', 'timeout', 'shot_saved'] }
  }
}
