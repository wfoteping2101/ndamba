// Every lesson of the Académie can be played to its end: a bot makes the user's decisions
// (the sequence's pass for pattern drills, the best-rated option otherwise, a shot when close),
// the runner applies the sheet's rules, and each lesson must reach its result screen.
import { describe, expect, it } from 'vitest'
import { DRILLS } from '../../../content/drills.gen'
import { passOptions } from '../../engine/sim/lanes'
import { dist2 } from '../../engine/sim/math'
import type { Level } from '../../engine/sim/types'
import { gameplayFor } from './catalog'
import { LessonRunner } from './runner'
import { stepTarget } from './scenario'

export function botPlay(id: string, level: Level, seed = 11, maxSeconds = 420, verbose = false) {
  const d = DRILLS.find((x) => x.id === id)!
  const g = gameplayFor(d)
  const log: string[] = []
  const r = new LessonRunner(d, g, { level, control: 'decisions', seed, record: false }, {
    world: (w) => { if (verbose) w.on((e) => { if (e.type !== 'touch' && e.type !== 'control') log.push(`${w.t.toFixed(1)} ${e.type} ${'by' in e ? e.by : ''} ${'reason' in e ? e.reason : ''} ${'team' in e ? e.team : ''}`) }) },
    change: () => { if (verbose && r.banner) log.push(`   banner ${r.banner.key}`) },
  })
  r.play()
  let t = 0
  let thinkAt = 0
  while (r.phase === 'play' && t < maxSeconds) {
    const w = r.world
    // the bot decides at human speed (every 0.35 s)
    if (w.t >= thinkAt) {
      thinkAt = w.t + 0.2
      const c = r.carrier()
      if (c && !c.pending && !w.pass) {
        const held = (c.meta.heldFor as number) ?? 0
        const exp = r.expected()
        const dribble = r.director?.current().find((s) => s.kind === 'dribble' && s.from === c.id)
        const shot = r.director?.current().find((s) => s.kind === 'shot' && s.from === c.id)
        if (dribble && r.control === 'carrier') { /* the director waits for the user's carry; not used with decisions */ }
        else if (shot) r.shoot(c, null)
        else if (exp && exp.from === c.id) {
          const rid = typeof exp.to === 'string' ? exp.to : exp.receiver
          const runner = rid ? w.get(rid) ?? null : null
          r.pass(c, typeof exp.to === 'string' ? runner : null, typeof exp.to === 'string' ? null : exp.to)
        } else if (!r.director && held > 0.25) {
          const goal = w.pitch.goalFor.a
          if (goal && dist2(c.pos, goal) < (goal.mini ? 11 : 20)) r.shoot(c, null)
          else {
            const best = passOptions(w, c, { intention: 'progresser' }).find((o) => o.receiver && o.margin > 0.1)
            if (best?.receiver) r.pass(c, best.receiver, null)
            else if (held > 2.2) { const any = passOptions(w, c)[0]; if (any?.receiver) r.pass(c, any.receiver, null) }
          }
        }
      }
    }
    r.tick()
    w.step()
    t += 1 / 60
  }
  void stepTarget
  if (verbose) console.log(id + '\n' + log.slice(0, 160).join('\n'))
  return { id, phase: r.phase, result: r.result, t }
}

it.skipIf(!process.env.BOT_ONE)('one lesson, verbose', () => {
  for (const id of (process.env.BOT_ONE ?? '').split(',')) { const o = botPlay(id, 'normal', 11, 200, true); console.log(o.phase, JSON.stringify({ ...o.result, replay: null, counts: null })) }
})

describe.skipIf(!!process.env.BOT_ONE)('lessons', () => {
  it('every lesson reaches its result screen with a bot playing at Normal', () => {
    const rows: string[] = []
    const stuck: string[] = []
    let won = 0
    for (const d of DRILLS) {
      const out = botPlay(d.id, (process.env.BOT_LEVEL as 'facile' | 'normal' | 'difficile') ?? 'normal')
      if (out.phase !== 'result') stuck.push(`${d.id} still ${out.phase} after ${out.t.toFixed(0)} s`)
      if (out.result?.success) won++
      rows.push(`${d.id} ${out.result ? (out.result.success ? 'WIN ' : 'LOSE') : 'STUCK'} pts ${out.result?.points ?? '-'} att ${out.result?.successes ?? '-'}/${out.result?.attempts ?? '-'} t ${out.t.toFixed(0)} s`)
    }
    if (process.env.LESSON_REPORT) console.log(rows.join('\n') + `\nbot won ${won}/${DRILLS.length}`)
    expect(stuck).toEqual([])
  }, 300_000)
})
