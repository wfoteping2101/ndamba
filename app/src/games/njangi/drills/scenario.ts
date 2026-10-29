// From a drill sheet's diagram (the same JSON the book prints) to a live world:
// the same players at the same spots, the same ball holder, the same numbered actions.
import type { DiagramSpec, Drill } from '../../../lib/types'
import { pitchFromSpec } from '../../engine/sim/pitch'
import { World, makePlayer } from '../../engine/sim/world'
import type { Player } from '../../engine/sim/types'
import { lookFor } from '../../engine/looks'
import type { V2 } from '../../engine/sim/math'

export interface Step {
  n: number
  kind: 'pass' | 'run' | 'dribble' | 'shot' | 'press'
  /** the player who acts (arrows drawn from a point are given to the player who arrives there) */
  from: string
  /** a player id or a point */
  to: string | V2
  /** a pass into space: the player who runs onto it */
  receiver?: string
  /** the actor starts the demonstration here (the diagram shows where he came from) */
  startAt?: V2
}

export interface Scenario {
  spec: DiagramSpec
  world: World
  /** the diagram's numbered actions, in order (equal numbers happen together) */
  steps: Step[]
  /** players by diagram id */
  ids: string[]
  holder: string | null
}

const teamOf = (t: string): { team: 'a' | 'b' | 'n'; gk: boolean; kit: 'a' | 'b' | 'n' | 'gk' | 'gkb' } =>
  t === 'gk' ? { team: 'a', gk: true, kit: 'gk' } : t === 'gkb' ? { team: 'b', gk: true, kit: 'gkb' } : t === 'b' ? { team: 'b', gk: false, kit: 'b' } : t === 'n' ? { team: 'n', gk: false, kit: 'n' } : { team: 'a', gk: false, kit: 'a' }

export function pointOf(spec: DiagramSpec, ref: string | [number, number]): V2 | null {
  if (Array.isArray(ref)) return { x: ref[0], y: ref[1] }
  const p = spec.players?.find((q) => q.id === ref)
  return p ? { x: p.x, y: p.y } : null
}

export function diagramOf(d: Drill, which: 1 | 2): DiagramSpec {
  return which === 2 && d.diagram2 ? d.diagram2 : d.diagram
}

export function buildScenario(spec: DiagramSpec, opts: { seed?: number; kid?: boolean; lookSeed?: string; /** the picture as drawn (briefing) rather than the start of the movement */ asDrawn?: boolean } = {}): Scenario {
  const world = new World(pitchFromSpec(spec), opts.seed ?? 7)
  const players = spec.players ?? []
  const cx = world.pitch.w / 2, cy = world.pitch.h / 2
  for (const dp of players) {
    const t = teamOf(dp.team)
    const facing = t.team === 'a' ? 0 : t.team === 'b' ? Math.PI : Math.atan2(cy - dp.y, cx - dp.x)
    const p = makePlayer({
      id: dp.id, label: dp.label, team: t.team, gk: t.gk, pos: { x: dp.x, y: dp.y }, facing,
      look: lookFor(dp.id, t.kit, { kid: opts.kid, seed: opts.lookSeed }),
      meta: { home: { x: dp.x, y: dp.y }, diagramTeam: dp.team },
    })
    if (t.gk) { p.maxSpeed = 6.4; p.skill = 0.8 }
    world.add(p)
  }
  const steps = resolveSteps(spec)
  if (!opts.asDrawn) for (const s of steps) if (s.startAt) { const p = world.get(s.from); if (p) { p.pos = { ...s.startAt }; world.prev.set(p.id, { ...s.startAt }) } }
  let holder: string | null = null
  if (typeof spec.ball === 'string' && world.byId.has(spec.ball)) { holder = spec.ball; world.giveBall(world.byId.get(spec.ball)!) }
  else if (Array.isArray(spec.ball)) world.placeBall(spec.ball[0], spec.ball[1])
  else {
    const first = steps.find((s) => s.kind === 'pass' || s.kind === 'dribble' || s.kind === 'shot')
    if (first) { holder = first.from; world.giveBall(world.byId.get(first.from)!) }
  }
  // a neutral or our keeper on the ball: the drill is about our possession
  if (holder && world.get(holder)!.team !== 'b' && !world.possTeam) world.possTeam = 'a'
  return { spec, world, steps, ids: players.map((p) => p.id), holder }
}

const near = (a: V2, b: V2, r: number) => Math.hypot(a.x - b.x, a.y - b.y) <= r

/**
 * The diagram's arrows as actions. Some arrows start from a point: the spot where a run or a
 * dribble ended, or where a pass into space was collected. Their actor is the player who got
 * there (the end of an earlier run/dribble), otherwise our player standing nearest. Passes into
 * space get a receiver: the player whose run ends at that spot.
 */
export function resolveSteps(spec: DiagramSpec): Step[] {
  const players = spec.players ?? []
  const ourIds = new Set(players.filter((p) => p.team === 'a' || p.team === 'n' || p.team === 'gk').map((p) => p.id))
  const raw = (spec.arrows ?? []).map((a, i) => ({
    n: a.n ?? i + 1, kind: a.kind,
    fromRef: a.from, to: Array.isArray(a.to) ? { x: a.to[0], y: a.to[1] } as V2 : a.to,
  })).sort((a, b) => a.n - b.n)
  // where each player is after each step (runs and dribbles move people)
  const at = new Map<string, V2>(players.map((p) => [p.id, { x: p.x, y: p.y }]))
  const out: Step[] = []
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i]
    let from: string | null = null
    if (typeof r.fromRef !== 'string' && typeof r.to === 'string' && (r.kind === 'run' || r.kind === 'press' || r.kind === 'dribble')) {
      // "from a point to a player": the diagram shows where that player came from to reach his spot
      const who = players.find((p) => p.id === r.to)
      if (who) {
        out.push({ n: r.n, kind: r.kind, from: who.id, to: { x: who.x, y: who.y }, startAt: { x: r.fromRef[0], y: r.fromRef[1] } })
        continue
      }
    }
    if (typeof r.fromRef === 'string') from = players.some((p) => p.id === r.fromRef) ? r.fromRef : null
    else {
      const pt = { x: r.fromRef[0], y: r.fromRef[1] }
      // an earlier run, dribble or pass-into-space receiver ending here
      let bestD = 3.01
      for (let k = out.length - 1; k >= 0; k--) {
        const s = out[k]
        if (typeof s.to === 'string' || s.kind === 'press' || s.kind === 'shot') continue
        const who = s.kind === 'pass' ? s.receiver ?? null : s.from
        const d = Math.hypot(s.to.x - pt.x, s.to.y - pt.y)
        if (who && ourIds.has(who) && d < bestD) { bestD = d; from = who }
      }
      if (!from) {
        // the player now standing nearest (our side), within a few metres
        let best: string | null = null, bd = 6
        for (const [id, p] of at) if (ourIds.has(id)) { const d = Math.hypot(p.x - pt.x, p.y - pt.y); if (d < bd) { bd = d; best = id } }
        from = best
      }
    }
    if (!from) continue
    const step: Step = { n: r.n, kind: r.kind, from, to: r.to }
    if (r.kind === 'pass' && typeof r.to !== 'string') {
      // who collects it: a run (this action or later) that ends there, else our nearest player
      const pt = r.to
      const run = raw.slice(i).find((q) => (q.kind === 'run' || q.kind === 'dribble') && typeof q.to !== 'string' && near(q.to, pt, 3))
      let recv: string | null = null
      if (run) recv = typeof run.fromRef === 'string' ? run.fromRef : null
      if (!recv) {
        let bd = 6
        for (const [id, p] of at) if (ourIds.has(id) && id !== from) { const d = Math.hypot(p.x - pt.x, p.y - pt.y); if (d < bd) { bd = d; recv = id } }
      }
      if (recv) step.receiver = recv
    }
    out.push(step)
    if ((r.kind === 'run' || r.kind === 'dribble') && typeof r.to !== 'string') at.set(from, { ...r.to })
    if (r.kind === 'pass' && step.receiver && typeof r.to !== 'string') at.set(step.receiver, { ...r.to })
  }
  return out
}

/** Where a step ends, as a point (players' current positions for player targets). */
export function stepTarget(w: World, s: Step): V2 {
  if (typeof s.to === 'string') { const p = w.get(s.to); return p ? { ...p.pos } : { x: w.pitch.w / 2, y: w.pitch.h / 2 } }
  return s.to
}
export const isPlayerStep = (s: Step): s is Step & { to: string } => typeof s.to === 'string'
export type { Player }
