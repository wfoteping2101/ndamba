// Pitch geometry, built from the same DiagramSpec the books and the app draw (tools/pitch.mjs).
// Views: "grid" (a training square of w x h metres), "half" (attacking half, 52.5 x 68, goal on the
// right), "third" (final third, 35 x 68, goal on the right), "full" (105 x 68, both goals).
import type { DiagramSpec } from '../../../lib/types'
import type { V2 } from './math'

export type Surface = 'grass' | 'redEarth' | 'mud' | 'concrete' | 'turf' | 'sand'

/** Rolling and bounce parameters per surface. a0: constant deceleration (m/s2), k: linear drag (1/s). */
export const SURFACES: Record<Surface, { a0: number; k: number; bounce: number; bumpiness: number }> = {
  grass: { a0: 0.5, k: 0.18, bounce: 0.55, bumpiness: 0 },
  turf: { a0: 0.42, k: 0.15, bounce: 0.6, bumpiness: 0 },
  redEarth: { a0: 0.85, k: 0.26, bounce: 0.5, bumpiness: 0.05 },
  mud: { a0: 1.8, k: 0.55, bounce: 0.25, bumpiness: 0.09 },
  concrete: { a0: 0.38, k: 0.13, bounce: 0.68, bumpiness: 0.02 },
  sand: { a0: 2.4, k: 0.7, bounce: 0.2, bumpiness: 0.06 },
}

export interface Goal {
  /** centre of the goal line */
  x: number
  y: number
  /** which way the goal mouth faces into the pitch: -1 = goal on the right edge (ball enters moving +x) */
  facing: 1 | -1
  width: number
  height: number
  depth: number
  mini: boolean
  /** which team attacks this goal */
  attackedBy: 'a' | 'b'
}

export interface PitchGeom {
  view: DiagramSpec['view']
  w: number
  h: number
  goals: Goal[]
  /** full-pitch marking offsets: where this view sits on a 105 x 68 pitch (x of view origin) */
  offsetX: number
  /** true when the view shows real pitch lines (half, third, full) rather than a cone square */
  markings: boolean
  surface: Surface
  /** walls around the area (street football): the ball bounces back instead of going out */
  walls: boolean
  /** cones from the diagram */
  cones: V2[]
  /** the opponent goal for team a (always on the right), and for team b */
  goalFor: { a: Goal | null; b: Goal | null }
  /** length of a full pitch for "towards goal" measures (35 m final third etc.) */
  fullLength: number
}

export const FULL_W = 105
export const FULL_H = 68
export const GOAL_W = 7.32
export const GOAL_H = 2.44
export const MINI_W = 2
export const MINI_H = 1
export const BOX_DEPTH = 16.5
export const BOX_WIDTH = 40.32

export function pitchFromSpec(spec: DiagramSpec, opts: { surface?: Surface; walls?: boolean } = {}): PitchGeom {
  const view = spec.view || 'grid'
  let w = 0, h = 0, offsetX = 0
  if (view === 'grid') { w = spec.w || 30; h = spec.h || 20 }
  else if (view === 'half') { w = 52.5; h = FULL_H; offsetX = 52.5 }
  else if (view === 'third') { w = 35; h = FULL_H; offsetX = 70 }
  else { w = FULL_W; h = FULL_H }
  const goals: Goal[] = []
  if (view === 'grid') {
    for (const g of spec.goals || []) {
      const mini = g.size !== 'full'
      // A goal on the right edge faces left (-1), on the left edge faces right (+1).
      // Top and bottom goals are rotated in the books; the game turns them into side goals.
      const facing: 1 | -1 = g.side === 'left' ? 1 : g.side === 'right' ? -1 : g.x > w / 2 ? -1 : 1
      const gx = g.side === 'left' ? 0 : g.side === 'right' ? w : g.x > w / 2 ? w : 0
      goals.push({ x: gx, y: g.side === 'top' || g.side === 'bottom' ? h / 2 : g.y, facing, width: mini ? MINI_W : GOAL_W, height: mini ? MINI_H : GOAL_H, depth: mini ? 0.8 : 2, mini, attackedBy: facing === -1 ? 'a' : 'b' })
    }
  } else {
    goals.push({ x: w, y: FULL_H / 2, facing: -1, width: GOAL_W, height: GOAL_H, depth: 2, mini: false, attackedBy: 'a' })
    if (view === 'full') goals.push({ x: 0, y: FULL_H / 2, facing: 1, width: GOAL_W, height: GOAL_H, depth: 2, mini: false, attackedBy: 'b' })
  }
  // Pick one goal per side for "towards goal" logic: the one nearest the middle of the edge.
  const pick = (team: 'a' | 'b') => {
    const list = goals.filter((g) => g.attackedBy === team)
    if (!list.length) return null
    return list.sort((p, q) => Math.abs(p.y - h / 2) - Math.abs(q.y - h / 2))[0]
  }
  return {
    view, w, h, goals, offsetX, markings: view !== 'grid', surface: opts.surface || 'grass', walls: !!opts.walls,
    cones: (spec.cones || []).map(([x, y]) => ({ x, y })), goalFor: { a: pick('a'), b: pick('b') }, fullLength: FULL_W,
  }
}

/** Where the team "a" is heading: the opponent goal centre if any, else the right edge of the area. */
export function attackTarget(p: PitchGeom, team: 'a' | 'b'): V2 {
  const g = p.goalFor[team]
  if (g) return { x: g.x, y: g.y }
  return team === 'a' ? { x: p.w, y: p.h / 2 } : { x: 0, y: p.h / 2 }
}

/** Distance to the opponent goal line in full-pitch metres (for the 35 m final third and the box). */
export function metresToGoal(p: PitchGeom, pt: V2, team: 'a' | 'b') {
  if (team === 'a') return p.markings ? p.w - pt.x : p.w - pt.x
  return pt.x
}

/** Is the point inside the final third (last 35 m) on a real pitch? Grids have no final third. */
export function inFinalThird(p: PitchGeom, pt: V2, team: 'a' | 'b') {
  if (!p.markings) return false
  return metresToGoal(p, pt, team) <= 35
}

/** Is the point inside the opponent penalty box (16.5 m deep, 40.32 m wide)? */
export function inBox(p: PitchGeom, pt: V2, team: 'a' | 'b') {
  if (!p.markings) return false
  const inY = Math.abs(pt.y - FULL_H / 2) <= BOX_WIDTH / 2
  return inY && metresToGoal(p, pt, team) <= BOX_DEPTH && metresToGoal(p, pt, team) >= 0
}

export function inside(p: PitchGeom, pt: V2, margin = 0) {
  return pt.x >= -margin && pt.x <= p.w + margin && pt.y >= -margin && pt.y <= p.h + margin
}
