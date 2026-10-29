// How each of the 64 drills of Le Code Njangi becomes a playable lesson.
// One DrillGameplay per drill, written from the drill's own sheet (coach/drills/CODE.json).
// Every rule cites the exact French sentence it comes from (`source`).

/** What the player does in the lesson. */
export type DrillMode =
  /** the numbered sequence of the diagram (passes, runs, dribbles, shot), repeated; little or no opposition */
  | 'pattern'
  /** keep the ball against pressing defenders (rondos, positional games); points for passes and bonuses */
  | 'keepball'
  /** a small game to goals against an AI team */
  | 'ssg'
  /** an attacking phase from a fixed start: reach a zone, cross a line or score, a number of attempts */
  | 'phase'
  /** after the ball is lost: win it back fast, or after a regain: attack fast */
  | 'transition'
  /** a combination that ends in a shot on a goalkeeper */
  | 'finishing'

/** Events the drill engine can detect and score. Nothing outside this list is supported. */
export type ScoreEvent =
  /** n passes in a row by the team in possession (neutrals included) */
  | { event: 'consecutive_passes'; n: number; points: number }
  /** a completed pass that goes between two defenders (splits them) */
  | { event: 'split_pass'; points: number }
  /** a completed pass beyond a line of at least two opponents (book: LINE) */
  | { event: 'line_break'; points: number }
  /** a goal (any) */
  | { event: 'goal'; points: number }
  /** a goal right after a qualifying action within the same possession */
  | { event: 'goal_after'; after: 'line_break' | 'fix2' | 'switch' | 'zone_entry' | 'third_man' | 'one_two' | 'n_passes' | 'cutback' | 'regain'; n?: number; points: number }
  /** every player of the team touched the ball in one possession (R07) */
  | { event: 'all_touched'; points: number }
  /** the team won the ball back within 5 seconds of losing it (book: REGAIN5) */
  | { event: 'regain5'; points: number }
  /** a switch of play after the block was drawn (book: SWITCH) */
  | { event: 'switch'; points: number }
  /** the ball is controlled by the team in a target zone (diagram coordinates, metres) */
  | { event: 'zone_entry'; zone: { x: number; y: number; w: number; h: number }; points: number }
  /** the carrier waits for a defender to commit, then plays behind him (the pausa, R02) */
  | { event: 'pause_play'; points: number }
  /** a third-man combination: A to B, B one-touch to C arriving (book: troisième homme) */
  | { event: 'third_man'; points: number }
  /** a carry or dribble that draws two opponents, then a completed pass (book: FIX2) */
  | { event: 'fix2'; points: number }
  /** the pivot / a named player receives (P06: the pivot must touch) */
  | { event: 'player_touch'; playerId: string; points: number }
  /** the ball crosses a line x (diagram metres) under control: "sortir", "franchir la ligne médiane" */
  | { event: 'cross_line'; x: number; points: number }
  /** a shot on target / a goal from inside a zone */
  | { event: 'shot_on_target'; points: number }
  /** a full circuit of the diagram's sequence completed without a fault (technique circuits) */
  | { event: 'sequence'; points: number }

export type Target =
  | { kind: 'points'; value: number }
  | { kind: 'goals'; value: number }
  | { kind: 'sequences'; value: number }
  | { kind: 'regains'; value: number }
  /** attempts of a phase / finishing / transition and how many must succeed */
  | { kind: 'attempts'; attempts: number; success: number }

export type Restart = 'other_team_keeps' | 'reset' | 'coach_ball' | 'keeper_ball'

/** Mistakes the engine can detect; each one can point to a coaching line of the drill sheet. */
export type Mistake =
  | 'lane_closed' // pass into a lane an opponent closed
  | 'pressed_on_arrival' // receiver had no time when the ball arrived
  | 'polite_pass' // sideways/backwards pass when a forward one was open
  | 'too_many_touches' // more touches than the rule allows
  | 'held_too_long' // ball held while a partner was free
  | 'no_angle' // receiver hidden behind a defender (no passing angle)
  | 'same_line' // two teammates on the same line / lane
  | 'wrong_receiver' // pattern: not the receiver of the sequence
  | 'early_pass' // pattern: pass before the run arrived (timing)
  | 'slow_regain' // more than 5 seconds to win the ball back
  | 'lost_dribble' // dribble lost instead of releasing when the second defender came
  | 'shot_from_far' // shot outside the finishing zone
  | 'ball_out' // pass out of play / too long

export interface DrillGameplay {
  id: string
  mode: DrillMode
  /** which diagram is the starting picture: 1 = diagram, 2 = diagram2 */
  diagram: 1 | 2
  /** decisions: the player picks passes and timing, the AI moves; carrier: the player also drives the ball carrier */
  control: 'decisions' | 'carrier'
  /** opposition at the book's standard level; the game also offers the sheet's regression and progression */
  opposition: 'none' | 'passive' | 'active'
  /** max touches per player (from the rules), and for neutrals if different */
  touches?: number
  neutralTouches?: number
  /** the set length used in the game, in seconds (sets are shortened from the sheet; the sheet's value stays in `source`) */
  duration?: number
  target: Target
  scoring: ScoreEvent[]
  restart: Restart
  /** what ends an attempt or loses the ball for the team */
  fail?: ('loss' | 'out' | 'touches_exceeded' | 'timeout' | 'shot_saved')[]
  /** mistakes the game watches for, each linked to the index of a coaching line in drill.fr.coaching */
  feedback: { mistake: Mistake; coaching: number }[]
  /** how the sheet's progressions/regressions map to the three game levels (index into drill.fr.progressions / regressions) */
  levels?: { easy?: { regression: number }; hard?: { progression: number } }
  /** exact French sentences of the sheet that justify the rules above */
  source: string[]
  /** what the game had to simplify or interpret, in one or two sentences (French) */
  adaptation?: string
}
