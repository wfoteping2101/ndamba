import { describe, expect, it } from 'vitest'
import { pitchFromSpec } from '../../engine/sim/pitch'
import { World, makePlayer } from '../../engine/sim/world'
import { judge, readSituation } from './judge'
import { makeSituation, POOL } from './situations'

function world(players: { id: string; team: 'a' | 'b'; x: number; y: number; gk?: boolean }[], holder: string) {
  const w = new World(pitchFromSpec({ view: 'full' }), 3)
  for (const p of players) w.add(makePlayer({ ...p, pos: { x: p.x, y: p.y }, gk: !!p.gk }))
  w.giveBall(w.get(holder)!)
  return w
}

describe('lecture du jeu', () => {
  it('a free man beyond the line makes Progresser the reading, and a forced pass into a closed line loses points', () => {
    // our 6 on the ball in midfield, a free 10 behind their midfield line, a covered 9
    const w = world([
      { id: 'c6', team: 'a', x: 40, y: 34 }, { id: 'p10', team: 'a', x: 58, y: 30 }, { id: 'p9', team: 'a', x: 70, y: 40 }, { id: 'l2', team: 'a', x: 40, y: 60 },
      { id: 'm1', team: 'b', x: 50, y: 22 }, { id: 'm2', team: 'b', x: 50, y: 46 }, { id: 'd1', team: 'b', x: 70.5, y: 41 }, { id: 'd2', team: 'b', x: 70, y: 28 },
    ], 'c6')
    const r = readSituation(w, w.get('c6')!)
    expect(r.valid).toContain('progresser')
    const good = judge(w, r, { intention: 'progresser', receiver: 'p10' })
    expect(good.laneOpen).toBe(true)
    expect(good.serves).toBe(true)
    const forced = judge(w, r, { intention: 'progresser', receiver: 'p9' })
    expect(forced.points).toBeLessThan(good.points)
  })

  it('a carrier facing goal at the edge of the box with an open angle should finish', () => {
    const w = world([
      { id: 'p9', team: 'a', x: 88, y: 34 }, { id: 'p7', team: 'a', x: 80, y: 10 },
      { id: 'd1', team: 'b', x: 92, y: 20 }, { id: 'd2', team: 'b', x: 86, y: 50 }, { id: 'gk', team: 'b', x: 104, y: 34, gk: true },
    ], 'p9')
    const r = readSituation(w, w.get('p9')!)
    expect(r.valid).toContain('finir')
    expect(r.best).toBe('finir')
    expect(judge(w, r, { intention: 'finir', receiver: 'shot' }).points).toBe(4)
    expect(judge(w, r, { intention: 'respirer', receiver: 'p7' }).intentionBest).toBe(false)
  })

  it('builds a series of freeze frames from the drill pictures, each with our player on the ball', () => {
    expect(POOL.length).toBeGreaterThan(20)
    for (let n = 0; n < 12; n++) {
      const s = makeSituation(n, 7)
      expect(s.world.ball.owner).toBe(s.carrier.id)
      expect(s.carrier.team).not.toBe('b')
      const r = readSituation(s.world, s.carrier)
      expect(r.valid.length).toBeGreaterThan(0)
      expect(r.bestAnswer).not.toBeNull()
    }
  })
})
