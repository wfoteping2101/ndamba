// Freeze frames for the Lecture du jeu. Each one starts from a drill sheet of the book (its
// players and its area), lets both teams play with the AI for a few seconds, and stops the moment
// one of our outfield players controls the ball with partners and opponents around him.
// Same seed, same picture: a series can be replayed and compared.
import { DRILLS } from '../../../content/drills.gen'
import { CarrierBrain, DefenderBrain, KeeperBrain, PhaseBrain, SupportBrain } from '../../engine/ai/brains'
import { DIFFICULTY, type Player } from '../../engine/sim/types'
import type { World } from '../../engine/sim/world'
import { DT } from '../../engine/sim/world'
import { buildScenario } from '../drills/scenario'
import type { Drill } from '../../../lib/types'

export interface Situation { drill: Drill; seed: number; world: World; carrier: Player }

/** Drill pictures with a real opposition and a direction of play. */
export const POOL: Drill[] = DRILLS.filter((d) =>
  ['position', 'ssg', 'lsg', 'phase', 'transition', 'finishing'].includes(d.family) &&
  (d.diagram.players ?? []).filter((p) => p.team === 'b').length >= 2 &&
  (d.diagram.players ?? []).filter((p) => p.team === 'a').length >= 3)

function brains(w: World) {
  w.diff = DIFFICULTY.normal
  for (const p of w.players) {
    if (p.gk) { w.brains.set(p.id, new KeeperBrain()); continue }
    const support = new SupportBrain({ roam: 5 })
    if (p.team === 'b') w.brains.set(p.id, new PhaseBrain(new CarrierBrain(new SupportBrain(), { intention: 'progresser' }), new SupportBrain(), new DefenderBrain()))
    else w.brains.set(p.id, new PhaseBrain(new CarrierBrain(support, { intention: 'progresser', patience: 1.2 }), support, p.team === 'n' ? support : new DefenderBrain()))
  }
}

/** Build situation number `n` of a series started with `base`. Always returns a situation. */
export function makeSituation(n: number, base: number): Situation {
  for (let attempt = 0; attempt < 12; attempt++) {
    const seed = base * 977 + n * 131 + attempt * 17
    const drill = POOL[(seed >>> 0) % POOL.length]
    const sc = buildScenario(drill.diagram, { seed })
    const w = sc.world
    brains(w)
    let picked: Player | null = null
    let at = -1
    const off = w.on((e) => {
      if (picked || e.type !== 'control' || e.team !== 'a' || w.t < 1.2) return
      const p = w.get(e.by)
      if (!p || p.gk) return
      if (w.teammates(p).filter((q) => !q.gk).length < 2 || w.opponents(p).filter((q) => !q.gk).length < 2) return
      picked = p; at = w.t
    })
    // a few seconds of play, then stop a quarter of a second after the control
    for (let i = 0; i < 60 * 14; i++) {
      w.step(DT)
      if (picked && w.t > at + 0.25) break
      if (w.dead) break
    }
    off()
    if (picked && w.ball.owner === (picked as Player).id) {
      // from here on the user decides for the carrier
      w.brains.delete((picked as Player).id)
      return { drill, seed, world: w, carrier: picked }
    }
  }
  // fall back to the starting picture of a drill (always valid)
  const drill = POOL[n % POOL.length]
  const sc = buildScenario(drill.diagram, { seed: base + n })
  brains(sc.world)
  const holder = sc.world.owner() ?? sc.world.players.find((p) => p.team === 'a' && !p.gk)!
  if (sc.world.ball.owner !== holder.id) sc.world.giveBall(holder)
  sc.world.brains.delete(holder.id)
  return { drill, seed: base + n, world: sc.world, carrier: holder }
}
