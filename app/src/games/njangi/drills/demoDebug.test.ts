import { it } from 'vitest'
import { DRILLS } from '../../../content/drills.gen'
import { buildScenario, diagramOf } from './scenario'
import { SequenceDirector } from './director'
import { assignBrains } from './setup'
import { gameplayFor } from './catalog'

it.skipIf(!process.env.DEMO_DEBUG)('debug one demo', () => {
  for (const id of (process.env.DEMO_DEBUG ?? '').split(',')) {
    const d = DRILLS.find((x) => x.id === id)!
    const g = gameplayFor(d)
    const sc = buildScenario(diagramOf(d, g.diagram), { seed: 11 })
    const w = sc.world
    assignBrains(w, { gameplay: g, level: 'facile', user: false, demo: true })
    const dir = new SequenceDirector(w, sc.steps, { speed: 0.9 })
    const lines: string[] = [`== ${id} ball ${JSON.stringify(sc.spec.ball)} holder ${sc.holder} owner ${w.ball.owner} poss ${w.possTeam}`, ...sc.steps.map((s) => `  step ${s.n} ${s.kind} ${s.from} -> ${typeof s.to === 'string' ? s.to : `(${s.to.x},${s.to.y})`} ${s.receiver ? 'recv ' + s.receiver : ''}`)]
    w.on((e) => {
      if (e.type === 'touch') return
      const x = e as unknown as Record<string, unknown>
      lines.push(`  ${w.t.toFixed(2)} g${dir.gi} ${e.type} ${['by', 'from', 'to', 'team', 'reason', 'receiver'].map((k) => (x[k] !== undefined && typeof x[k] !== 'object' ? `${k}=${x[k]}` : '')).filter(Boolean).join(' ')}`)
    })
    let t = 0, last = -1
    while (t < 30 && dir.state === 'running') {
      dir.tick(); w.step(); t += 1 / 60
      if (Math.floor(t) !== last) { last = Math.floor(t); if (last % 3 === 0) lines.push(`  ${t.toFixed(1)} g${dir.gi} owner=${w.ball.owner} ball=(${w.ball.pos.x.toFixed(1)},${w.ball.pos.y.toFixed(1)}) ${[...dir.driven].join(',')}`) }
    }
    lines.push(`  => ${dir.state} ${dir.failReason ?? ''}`)
    console.log(lines.join('\n'))
  }
})

it.skipIf(!process.env.DEMO_TRACE)('trace positions', () => {
  const id = process.env.DEMO_TRACE!
  const d = DRILLS.find((x) => x.id === id)!
  const g = gameplayFor(d)
  const sc = buildScenario(diagramOf(d, g.diagram), { seed: 11 })
  const w = sc.world
  assignBrains(w, { gameplay: g, level: 'facile', user: false, demo: true })
  const dir = new SequenceDirector(w, sc.steps, { speed: 0.9 })
  const who = process.env.WHO ?? sc.holder!
  for (let i = 0; i < 60 * 6 && dir.state === 'running'; i++) {
    dir.tick(); w.step()
    if (i % 10 === 0) { const p = w.get(who)!; console.log(w.t.toFixed(2), 'g' + dir.gi, who, p.pos.x.toFixed(2), p.pos.y.toFixed(2), 'v', Math.hypot(p.vel.x, p.vel.y).toFixed(2), 'tgt', p.target ? `${p.target.x.toFixed(1)},${p.target.y.toFixed(1)}` : '-', 'ball', w.ball.pos.x.toFixed(2), w.ball.pos.y.toFixed(2), 'bv', Math.hypot(w.ball.vel.x, w.ball.vel.y).toFixed(2), 'own', w.ball.owner, p.meta.scripted ? 'S' : '') }
  }
})
