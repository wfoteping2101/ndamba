// Every Leçon du Ballon that has a drawing can be demonstrated: the numbered arrows play to the end.
import { describe, expect, it } from 'vitest'
import { LESSONS } from '../../content/lessons.gen'
import { buildScenario } from '../njangi/drills/scenario'
import { SequenceDirector } from '../njangi/drills/director'
import { assignBrains } from '../njangi/drills/setup'
import { LessonRunner } from '../njangi/drills/runner'
import { lessonDrill, lessonGameplay, playableDiagram } from './lessons'

function demo(no: number, seed: number) {
  const l = LESSONS.find((x) => x.no === no)!
  const g = lessonGameplay(l)
  const sc = buildScenario(playableDiagram(l)!, { seed })
  const w = sc.world
  assignBrains(w, { gameplay: g, level: 'facile', user: false, demo: true })
  const dir = new SequenceDirector(w, sc.steps, { speed: 0.9 })
  let t = 0
  while (t < 45 && dir.state === 'running') { dir.tick(); w.step(); t += 1 / 60 }
  return { state: dir.state, reason: dir.failReason, gi: dir.gi, n: dir.groups.length, t }
}

describe('Leçons du Ballon', () => {
  it('39 lessons have a drawing, lesson 24 has none (the book prints none)', () => {
    expect(LESSONS.length).toBe(40)
    expect(LESSONS.filter((l) => l.diagram).length).toBe(39)
    expect(LESSONS.find((l) => l.no === 24)?.diagram ?? null).toBeNull()
  })
  it('every drawn lesson plays its move to the end', () => {
    const bad: string[] = []
    for (const seed of [11, 23]) for (const l of LESSONS) {
      if (!l.diagram) continue
      const r = demo(l.no, seed)
      if (r.state !== 'done') bad.push(`lesson ${l.no} seed ${seed}: ${r.state} ${r.reason ?? ''} at ${r.gi + 1}/${r.n} after ${r.t.toFixed(1)} s`)
    }
    if (bad.length) console.log(bad.join('\n'))
    expect(bad).toEqual([])
  })
})

/** a player who knows the notebook: makes the expected pass, shoots when the move ends in a shot */
function botLesson(no: number, seed = 11) {
  const l = LESSONS.find((x) => x.no === no)!
  const d = lessonDrill(l, { fr: {}, en: {} })
  const r = new LessonRunner(d, lessonGameplay(l), { level: 'facile', control: 'decisions', seed, record: false })
  r.play()
  let t = 0, thinkAt = 0
  while (r.phase === 'play' && t < 240) {
    const w = r.world
    if (w.t >= thinkAt) {
      thinkAt = w.t + 0.25
      const c = r.carrier()
      if (c && !c.pending && !w.pass) {
        const shot = r.director?.current().find((s) => s.kind === 'shot' && s.from === c.id)
        const exp = r.expected()
        if (shot) r.shoot(c, null)
        else if (exp && exp.from === c.id) {
          const rid = typeof exp.to === 'string' ? exp.to : exp.receiver
          // a pass into a team-mate's run: wait until he is on his way to the spot
          const run = rid ? r.director?.current().find((s) => s.kind === 'run' && s.from === rid) : null
          const rp = rid ? w.get(rid) : null
          if (run && rp && typeof run.to !== 'string' && Math.hypot(rp.pos.x - run.to.x, rp.pos.y - run.to.y) > 8) { r.tick(); w.step(); t += 1 / 60; continue }
          r.pass(c, typeof exp.to === 'string' ? (rid ? w.get(rid) ?? null : null) : null, typeof exp.to === 'string' ? null : exp.to)
        }
      }
    }
    r.tick(); w.step(); t += 1 / 60
  }
  return { phase: r.phase, success: r.result?.success ?? false, t }
}

describe('Leçons du Ballon, played', () => {
  it('every drawn lesson can be played to its result, and won by following the notebook', () => {
    const bad: string[] = []
    for (const l of LESSONS) {
      if (!l.diagram) continue
      const o = botLesson(l.no)
      if (o.phase !== 'result' || !o.success) bad.push(`lesson ${l.no}: ${o.phase} ${o.success ? 'won' : 'not won'} after ${o.t.toFixed(0)} s`)
    }
    if (bad.length) console.log(bad.join('\n'))
    expect(bad).toEqual([])
  }, 300_000)
})
