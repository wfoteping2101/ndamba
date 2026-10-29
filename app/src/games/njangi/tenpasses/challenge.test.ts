import { describe, expect, it } from 'vitest'
import { LessonRunner } from '../drills/runner'
import { CHALLENGE_GAMEPLAY, challengeDrill } from './challenge'

describe('défi des dix passes', () => {
  it('the demonstration of the Njangi goal plays to the end, and a sequence restarts from the keeper', () => {
    const d = challengeDrill({ fr: { title: 'Défi' }, en: { title: 'Challenge' } })
    const r = new LessonRunner(d, CHALLENGE_GAMEPLAY, { level: 'normal', record: false })
    r.demo()
    let t = 0
    while (!r.demoDone && t < 60) { r.tick(); r.world.step(); t += 1 / 60 }
    expect(r.demoDone).toBe(true)
    r.play()
    const keeper = r.world.players.find((p) => p.gk && p.team === 'a')!
    expect(r.world.ball.owner).toBe(keeper.id)
    expect(r.world.players.filter((p) => p.team === 'b' && !p.gk).length).toBe(6)
  })
})
