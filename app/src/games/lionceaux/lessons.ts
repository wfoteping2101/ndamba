// The forty « Leçons du Ballon » of tome 1 (content/lessons.gen.ts, from the chapters' notebook
// boxes and their diagrams) as playable lessons: the notebook's drawing becomes the pitch, the
// numbered arrows become the move to play. The words are the book's; the scoring rule (play the
// move three times) is the game's, and the lesson screen says so.
import { DRILLS } from '../../content/drills.gen'
import { LESSONS } from '../../content/lessons.gen'
import type { DiagramSpec, Drill, DrillText, Lesson } from '../../lib/types'
import type { DrillGameplay } from '../njangi/drills/types'

export const lessonByNo = (no: number): Lesson | undefined => LESSONS.find((l) => l.no === no)

type Arrow = NonNullable<DiagramSpec['arrows']>[number]
const near = (a: [number, number], b: [number, number], r: number) => Math.hypot(a[0] - b[0], a[1] - b[1]) <= r

/**
 * The notebook drawings number only the actions that matter; the game needs an order for all of
 * them. Unnumbered runs go with the pass played into their stride, unnumbered pressing goes with
 * the action it answers, an unnumbered shot comes last. A few drawings show two examples side by
 * side or two options for the same player: the playable move is the one the lesson asks for.
 */
export function playableDiagram(l: Lesson): DiagramSpec | null {
  const d = l.diagram
  if (!d) return null
  let arrows: Arrow[] = (d.arrows ?? []).map((a) => ({ ...a }))
  let ball = d.ball
  // the drawing shows the polite pass and the useful one: play the useful one (« la passe utile »)
  if (l.no === 5) arrows = arrows.filter((a) => a.to === 'R').map((a) => ({ ...a, n: 1 }))
  // the circulation that keeps the ball, then the pass that breaks the lines: play them in order
  if (l.no === 11) { ball = 'a2'; arrows = arrows.map((a, i) => ({ ...a, n: i + 1 })) }
  // two players side by side: the closed body (top) and the open body (bottom); play the open one
  if (l.no === 19) arrows = arrows.filter((a) => a.from === 'P2' || a.from === 'K2')
  // the ball in the middle is the pot of the njangi: the circle starts from the keeper
  if (l.no === 36 && Array.isArray(ball)) ball = typeof arrows[0]?.from === 'string' ? arrows[0].from : ball
  const numbered = arrows.filter((a) => a.n !== undefined)
  let max = numbered.reduce((m, a) => Math.max(m, a.n ?? 0), 0)
  const pt = (r: Arrow['to']): [number, number] | null => {
    if (Array.isArray(r)) return r
    const p = d.players?.find((q) => q.id === r)
    return p ? [p.x, p.y] : null
  }
  if (numbered.length) {
    for (const a of arrows) {
      if (a.n !== undefined) continue
      const end = pt(a.to)
      if (a.kind === 'run' && end) {
        const pass = numbered.find((q) => q.kind === 'pass' && Array.isArray(q.to) && near(q.to, end, 3))
        if (pass) { a.n = pass.n; continue }
      }
      if (a.kind === 'press' && end) {
        // the defender reacts to the action that brings the ball near him
        const act = numbered.filter((q) => q.kind !== 'press').sort((p, q) => {
          const pe = pt(p.to), qe = pt(q.to)
          return (pe ? Math.hypot(pe[0] - end[0], pe[1] - end[1]) : 99) - (qe ? Math.hypot(qe[0] - end[0], qe[1] - end[1]) : 99)
        })[0]
        a.n = act?.n ?? 1
        continue
      }
      a.n = ++max
    }
  }
  return { ...d, ball, arrows }
}

export function lessonGameplay(l: Lesson): DrillGameplay {
  const opp = (l.diagram?.players ?? []).some((p) => p.team === 'b' || p.team === 'gkb')
  return {
    id: `LB${String(l.no).padStart(2, '0')}`,
    mode: 'pattern',
    diagram: 1,
    control: 'decisions',
    opposition: opp ? 'passive' : 'none',
    target: { kind: 'sequences', value: 3 },
    scoring: [{ event: 'sequence', points: 1 }],
    feedback: [],
    source: l.lines.slice(0, 2),
    restart: 'reset',
  }
}

const TEMPLATE = DRILLS.find((d) => d.family === 'technique') ?? DRILLS[0]

/** A lesson in the shape of a drill sheet, so the Académie's lesson engine can play it. */
export function lessonDrill(l: Lesson, text: { fr: Partial<DrillText>; en: Partial<DrillText> }): Drill {
  const empty: DrillText = { title: l.title, subtitle: l.chapterTitle, objective: '', organisation: [], rules: l.lines, coaching: [], progressions: [], regressions: [], measure: '' }
  return {
    ...TEMPLATE,
    id: `LB${String(l.no).padStart(2, '0')}`,
    intentions: [], skills: [], pieces: [],
    diagram: playableDiagram(l)!,
    diagram2: null,
    fr: { ...empty, ...text.fr },
    en: { ...empty, ...text.en },
  }
}
