// Défi des dix passes: from our keeper to the goal, at least ten passes, everyone involved,
// against a block that defends. Sources, both from the books:
//   - Lionceaux, tome 1, Leçon du Ballon n°40 « Le but du Njangi »: the drawing of the goal
//     (the keeper starts it, eleven players touch it, the last pass goes into the run, the shot)
//     and the line « Onze joueurs, onze touches. Personne n'a gardé la caisse. »
//   - Le Code Njangi, sheet G06 « Le but du Njangi »: « Le ballon part du gardien et passe par au
//     moins 8 joueurs différents avant le tir », « Partie 2 : à chaque perte, la séquence repart
//     du gardien », with 4 to 6 opponents.
// The count of ten passes is the game's rule (the caption of the site's diagram), not the book's.
import { DRILLS } from '../../../content/drills.gen'
import { LESSONS } from '../../../content/lessons.gen'
import type { DiagramSpec, Drill, DrillText } from '../../../lib/types'
import type { DrillGameplay } from '../drills/types'

const lesson40 = LESSONS.find((l) => l.no === 40)
const G06 = DRILLS.find((d) => d.id === 'G06')!

/** Six opponents (G06 part 2): the lesson's three defenders and keeper, two forwards and a midfielder. */
const BLOCK: DiagramSpec['players'] = [
  { id: 'o1', team: 'b', x: 30, y: 26 }, { id: 'o2', team: 'b', x: 30, y: 44 },
  { id: 'o3', team: 'b', x: 54, y: 34 },
]

export function challengeSpec(): DiagramSpec {
  const base = lesson40?.diagram ?? G06.diagram
  return {
    ...base,
    // the lesson's own players and arrows, plus the pressing forwards and midfielders
    players: [...(base.players ?? []), ...(BLOCK ?? [])],
    labels: [],
  }
}

export const CHALLENGE_GAMEPLAY: DrillGameplay = {
  id: 'DIX',
  mode: 'phase',
  diagram: 1,
  control: 'decisions',
  opposition: 'active',
  duration: 600,
  attemptSeconds: 70,
  target: { kind: 'attempts', attempts: 5, success: 1 },
  successNeeds: 2,
  scoring: [
    { event: 'goal_after', after: 'n_passes', n: 10, points: 2 },
    { event: 'all_touched', points: 1 },
  ],
  restart: 'keeper_ball',
  fail: ['loss', 'out', 'shot_saved', 'timeout'],
  feedback: [
    { mistake: 'held_too_long', coaching: 2 },
    { mistake: 'polite_pass', coaching: 1 },
    { mistake: 'shot_from_far', coaching: 4 },
  ],
  source: [
    'Le ballon part du gardien et passe par au moins 8 joueurs différents avant le tir.',
    'Partie 2 : à chaque perte, la séquence repart du gardien.',
    "Onze joueurs, onze touches. Personne n'a gardé la caisse.",
  ],
}

export function challengeDrill(texts: { fr: Partial<DrillText>; en: Partial<DrillText> }): Drill {
  return {
    ...G06,
    id: 'DIX',
    diagram: challengeSpec(),
    diagram2: null,
    fr: { ...G06.fr, ...texts.fr } as DrillText,
    en: { ...G06.en, ...texts.en } as DrillText,
  }
}
