import { describe, expect, it } from 'vitest'
import { DRILLS } from '../../../content/drills.gen'
import { buildScenario, diagramOf } from './scenario'
import { SequenceDirector } from './director'
import { assignBrains } from './setup'
import { gameplayFor } from './catalog'

function runDemo(id: string, verbose = false, seed = 11) {
  const d = DRILLS.find((x) => x.id === id)!
  const g = gameplayFor(d)
  const sc = buildScenario(diagramOf(d, g.diagram), { seed })
  const w = sc.world
  assignBrains(w, { gameplay: g, level: 'facile', user: false, demo: true })
  const dir = new SequenceDirector(w, sc.steps, { speed: 0.9 })
  const log: string[] = []
  w.on((e) => { if (e.type !== 'touch') log.push(`${w.t.toFixed(2)} ${e.type} ${JSON.stringify(e).slice(0, 160)}`) })
  let t = 0
  while (t < 40 && dir.state === 'running') { dir.tick(); w.step(); t += 1 / 60 }
  if (verbose) console.log(id, dir.state, dir.failReason, 'gi', dir.gi, '/', dir.groups.length, '\n' + log.join('\n'))
  return { state: dir.state, reason: dir.failReason, t, gi: dir.gi, n: dir.groups.length }
}

describe('demonstrations', () => {
  it('every drill sheet plays its numbered sequence to the end', () => {
    const bad: string[] = []
    for (const seed of [11, 23, 5]) for (const d of DRILLS) {
      const r = runDemo(d.id, process.env.DEMO_VERBOSE === d.id, seed)
      if (r.state !== 'done') bad.push(`${d.id} seed ${seed} ${r.state} ${r.reason ?? ''} at action ${r.gi + 1}/${r.n} after ${r.t.toFixed(1)} s`)
    }
    if (bad.length) console.log(bad.join('\n'))
    expect(bad).toEqual([])
  })
})
