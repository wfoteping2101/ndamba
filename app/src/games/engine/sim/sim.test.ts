import { describe, expect, it } from 'vitest'
import { BALL_R, groundPassSpeed, kickGround, kickLofted, makeBall, rollDistance, rollTimeTo, stepBall } from './ball'
import { pitchFromSpec } from './pitch'
import { World, makePlayer, DT } from './world'
import { analysePass, defensiveLines, linesBetween } from './lanes'
import { Tagger } from './tagger'
import { njangiFromCounts } from '../../../lib/njangi'
import { DefenderBrain, HoldBrain } from '../ai/brains'

const grid = (w = 40, h = 30) => pitchFromSpec({ view: 'grid', w, h })

describe('ball physics', () => {
  it('ground pass solver and integrator agree (exact roll)', () => {
    const p = grid(60, 30)
    for (const d of [8, 15, 25, 40]) {
      const v0 = groundPassSpeed(d, 5, 'grass')
      const t = rollTimeTo(v0, d, 'grass')
      expect(rollDistance(v0, t, 'grass')).toBeCloseTo(d, 2)
      const b = makeBall(5, 15)
      const r = kickGround(b, { x: 5 + d, y: 15 }, 5, 'grass')
      let tt = 0
      while (tt < r.time - 1e-9) { stepBall(b, DT, p); tt += DT }
      expect(Math.abs(b.pos.x - (5 + d))).toBeLessThan(0.15)
      expect(Math.hypot(b.vel.x, b.vel.y)).toBeGreaterThan(4.5)
    }
  })
  it('a ball always stops on its own and never sinks below the ground', () => {
    const p = grid()
    const b = makeBall(5, 15)
    b.vel = { x: 25, y: 3, z: 6 }
    for (let i = 0; i < 60 * 30; i++) { stepBall(b, DT, p); expect(b.pos.z).toBeGreaterThanOrEqual(BALL_R - 1e-6) }
    expect(Math.hypot(b.vel.x, b.vel.y)).toBeLessThan(0.01)
  })
  it('lofted pass lands within a metre of its target', () => {
    const p = pitchFromSpec({ view: 'full' })
    for (const d of [20, 35, 50]) {
      const b = makeBall(10, 34)
      kickLofted(b, { x: 10 + d, y: 34 }, 1.6)
      let landed: number | null = null
      for (let i = 0; i < 600 && landed === null; i++) { const r = stepBall(b, DT, p); if (r.bounced) landed = b.pos.x }
      expect(landed).not.toBeNull()
      expect(Math.abs((landed as number) - (10 + d))).toBeLessThan(1)
    }
  })
  it('red earth and mud slow the ball more than grass', () => {
    const v0 = 12
    expect(rollDistance(v0, 99, 'redEarth')).toBeLessThan(rollDistance(v0, 99, 'grass'))
    expect(rollDistance(v0, 99, 'mud')).toBeLessThan(rollDistance(v0, 99, 'redEarth'))
  })
  it('a shot between the posts under the bar is a goal; wide is not', () => {
    const p = pitchFromSpec({ view: 'half' })
    const w = new World(p)
    const s = w.add(makePlayer({ id: 's', team: 'a', pos: { x: 40, y: 34 } }))
    w.giveBall(s)
    w.requestShot(s, { x: 52.5, y: 35 }, 1, 20)
    let goal = false
    w.on((e) => { if (e.type === 'goal') goal = true })
    for (let i = 0; i < 120; i++) w.step()
    expect(goal).toBe(true)
    const w2 = new World(p)
    const s2 = w2.add(makePlayer({ id: 's', team: 'a', pos: { x: 40, y: 34 } }))
    w2.giveBall(s2)
    w2.requestShot(s2, { x: 52.5, y: 45 }, 1, 20)
    let goal2 = false
    w2.on((e) => { if (e.type === 'goal') goal2 = true })
    for (let i = 0; i < 120; i++) w2.step()
    expect(goal2).toBe(false)
  })
})

describe('passing in the world', () => {
  it('an open pass is completed and tagged PASS_OK + PROG (10 m forward)', () => {
    const w = new World(grid(50, 30))
    const a = w.add(makePlayer({ id: 'a', team: 'a', pos: { x: 5, y: 15 } }), new HoldBrain())
    const b = w.add(makePlayer({ id: 'b', team: 'a', pos: { x: 22, y: 15 }, facing: Math.PI }), new HoldBrain())
    const tag = new Tagger(w)
    w.giveBall(a)
    w.requestPass(a, { x: 22, y: 15 }, { receiver: 'b' })
    for (let i = 0; i < 200; i++) { w.step(); tag.update() }
    expect(w.ball.owner).toBe('b')
    expect(tag.counts.a.PASS_OK).toBe(1)
    expect(tag.counts.a.PROG).toBe(1)
    expect(tag.counts.a.PASS_LOST).toBe(0)
    void b
  })
  it('a defender standing in the lane cuts the pass out (PASS_LOST, regain for b)', () => {
    const w = new World(grid(50, 30))
    w.diff = { ...w.diff, reaction: 0.1, intercept: 1 }
    const a = w.add(makePlayer({ id: 'a', team: 'a', pos: { x: 5, y: 15 } }), new HoldBrain())
    w.add(makePlayer({ id: 'b', team: 'a', pos: { x: 25, y: 15 } }), new HoldBrain())
    w.add(makePlayer({ id: 'd', team: 'b', pos: { x: 14, y: 15.3 }, meta: { home: { x: 14, y: 15.3 } } }), new DefenderBrain())
    const tag = new Tagger(w)
    w.giveBall(a)
    const opt = analysePass(w, a, { x: 25, y: 15 }, w.get('b')!)
    expect(opt.risk).toBe('closed')
    w.requestPass(a, { x: 25, y: 15 }, { receiver: 'b' })
    for (let i = 0; i < 200; i++) { w.step(); tag.update() }
    expect(w.ball.owner).toBe('d')
    expect(tag.counts.a.PASS_LOST).toBe(1)
    expect(tag.counts.b.REGAIN + tag.counts.b.REGAIN5).toBe(1)
  })
  it('lane analysis: a wide open receiver has a positive margin', () => {
    const w = new World(grid(50, 30))
    const a = w.add(makePlayer({ id: 'a', team: 'a', pos: { x: 5, y: 15 } }))
    const b = w.add(makePlayer({ id: 'b', team: 'a', pos: { x: 15, y: 5 } }))
    w.add(makePlayer({ id: 'd', team: 'b', pos: { x: 30, y: 25 } }))
    w.giveBall(a)
    const o = analysePass(w, a, b.pos, b)
    expect(o.margin).toBeGreaterThan(0.35)
    expect(o.risk).toBe('open')
  })
  it('lines: a pass beyond two defenders at the same height breaks one line', () => {
    const w = new World(grid(50, 30))
    const a = w.add(makePlayer({ id: 'a', team: 'a', pos: { x: 5, y: 15 } }))
    w.add(makePlayer({ id: 'd1', team: 'b', pos: { x: 15, y: 9 } }))
    w.add(makePlayer({ id: 'd2', team: 'b', pos: { x: 15.5, y: 21 } }))
    w.giveBall(a)
    const lines = defensiveLines(w.opponents(a), 'a')
    expect(lines.length).toBe(1)
    expect(linesBetween(lines, { x: 5, y: 15 }, { x: 22, y: 15 }, 'a')).toBe(1)
    expect(linesBetween(lines, { x: 5, y: 15 }, { x: 12, y: 15 }, 'a')).toBe(0)
  })
})

describe('Indice Njangi from the book', () => {
  it('reproduces the chapter 32 worked example (65.1)', () => {
    const r = njangiFromCounts({ PASS_OK: 300, PASS_LOST: 80, PROG: 50, LINE: 30, FINAL3: 42, BOX: 15, FIX2: 12, SWITCH: 9, LOSS: 30, REGAIN5: 33, REGAIN: 40, SHOT: 10, SHOT_IN: 4, GOAL: 1 })
    expect(r.total).toBe(65.1)
  })
})
