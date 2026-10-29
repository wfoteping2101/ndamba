// How a chapter of Lionceaux is written for the game. A chapter is a list of beats: scenes
// (framed shots with the book's own lines as subtitles), explorations (walk, talk to people),
// football challenges (the player performs what the book says happens; the book's outcome is
// locked) and the chapter's Leçon du Ballon.
//
// Book text: every subtitle is the author's words. A line may be assembled from fragments of the
// same chapter separated by '|' (an incise like « a répondu BriBri » is left out); a test checks
// that every fragment appears in the chapter file. Anything that is not the author's text (UI
// instructions, bridges) lives in the i18n files and is labelled as such on screen.
import type { AnimState, Look, Team } from '../../engine/sim/types'
import type { CastId } from '../cast'
import type { Place } from './stage'
import type { Choreo } from './choreo'
import type { BallLook } from '../../engine/render/ballView'

/** Who speaks: a member of the cast, the narrator, or a character's thought (italic in the book). */
export type Who = CastId | 'narr' | 'pensee'

export interface Line {
  who: Who
  /** verbatim text; '|' separates fragments taken from the same chapter */
  text: string
  /** the actor on stage who speaks (talk gesture); defaults to the actor of that cast id */
  by?: string
  /** a thought belongs to someone (shown in italic, with the name) */
  of?: CastId
}

export type Pt = [number, number]
/** a mark of the place, an actor id, or a point (sim metres) */
export type Where = string | Pt

export interface ActorSpec {
  id: string
  cast: CastId
  at: Where
  /** facing in radians, or towards an actor or mark */
  face?: number | Where
  pose?: AnimState | null
  team?: Team
  number?: number
  gk?: boolean
  /** this actor holds the ball at the start (at his feet), or carries it in his hands */
  ball?: boolean
  carry?: boolean
  /** an unnamed extra: a variation of the cast look (skin, hair, height), and look overrides */
  variant?: number
  look?: Partial<Look>
  /** resting above the ground, metres (lying on a bed) */
  elev?: number
}

export type CamSpec =
  /** the whole place from high up */
  | { kind: 'wide'; height?: number; side?: 1 | -1 }
  /** framing one or more actors: a single, a two-shot, a group */
  | { kind: 'on'; who: string | string[]; dist?: number; height?: number; side?: number; fov?: number; lookY?: number }
  /** over the shoulder of `who`, towards `to` */
  | { kind: 'over'; who: string; to: Where; dist?: number; height?: number; mix?: number }
  /** an explicit pose (sim x, height, sim y), optionally dollying to a second pose */
  | { kind: 'pose'; pos: [number, number, number]; look: [number, number, number]; to?: { pos: [number, number, number]; look: [number, number, number] }; dur?: number; fov?: number }
  /** follow an actor (walks, runs) from behind and above */
  | { kind: 'follow'; who: string; dist?: number; height?: number }
  /** the match camera (broadcast-like, follows the ball) */
  | { kind: 'match' }

export type Action =
  | { a: 'move'; id: string; to: Where; speed?: number }
  | { a: 'pose'; id: string; pose: AnimState | null }
  | { a: 'face'; id: string; to: Where | number }
  | { a: 'look'; id: string; at: Where | null }
  | { a: 'spawn'; actor: ActorSpec }
  | { a: 'remove'; id: string }
  | { a: 'ball'; at: Where }
  | { a: 'mood'; mood: Place['mood'] }
  | { a: 'sfx'; kind: 'kick' | 'whistle' | 'net' | 'post' | 'success' | 'fail' | 'tap' | 'page' | 'touch' | 'point' | 'thunder' | 'splash' | 'drums' | 'engine' }
  /** something the set does when told (the plane takes off) */
  | { a: 'cue'; name: string }
  | { a: 'slow'; scale: number }
  | { a: 'score'; text: string | null }
  /** the ball: Mami's leather ball, patched, the plastic-bag ball; flat = punctured */
  | { a: 'ballLook'; look: BallLook; flat?: boolean }
  /** a second ball in someone's hands (null: none) */
  | { a: 'prop'; holder: string | null; look?: BallLook }

export interface Shot {
  cam: CamSpec
  /** cut (default) or glide from the previous framing */
  cut?: boolean
  /** stage directions at the start of the shot */
  do?: Action[]
  /** football or movement played during the shot (async; the shot waits for it unless `parallel`) */
  play?: (c: Choreo) => Promise<void>
  parallel?: boolean
  /** subtitles, one after the other (tap to go on; they also move on by themselves when auto-play is on) */
  lines?: Line[]
  /** seconds to hold the shot when it has no lines */
  hold?: number
}

/** A cutscene. `bridge` marks a scene that frames something the book only reports (labelled on screen). */
export interface SceneBeat { kind: 'scene'; id: string; place: Place; cast: ActorSpec[]; shots: Shot[]; bridge?: boolean; keep?: boolean }

export interface Talk { id: string; lines: Line[] }
/** Walk as one of the brothers, talk to people; reach the goal (after the required talks) to go on. */
export interface ExploreBeat {
  kind: 'explore'; id: string; place: Place; cast: ActorSpec[]; player: string
  talks: Talk[]
  /** talks needed before the goal opens */
  require?: string[]
  /** where to go next, and the i18n key of the instruction */
  goal: { at: Where; r?: number; prompt: string }
  bridge?: boolean
  keep?: boolean
}

/** A football challenge: the player acts, the book's outcome is locked. */
export interface PlayBeat {
  kind: 'play'; id: string; place: Place; cast: ActorSpec[]
  /** i18n key of the instruction shown first */
  prompt: string
  challenge: ChallengeSpec
  /** subtitles that come with it (commentary, thoughts) are in the challenge */
  bridge?: boolean
  keep?: boolean
}

/** The chapter's Leçon du Ballon, then the playable lesson. */
export interface LessonBeat { kind: 'lesson'; no: number }

export type Beat = SceneBeat | ExploreBeat | PlayBeat | LessonBeat

/** Challenges available to the scripts (implemented in challenges.ts). */
export type ChallengeSpec =
  /** carry the ball past defenders one after the other with the dribble button; scripted end */
  | { type: 'dribble'; carrier: string; defenders: string[]; calls?: Line[]; intro?: Line[]; end: 'lose' | 'free'; loseTo?: string; dir: 1 | -1; loseLines?: Line[] }
  /** the ball comes to the player, time slows: pass first time to the right partner */
  | { type: 'oneTouch'; player: string; to: string; setup: (c: Choreo) => Promise<void>; after: (c: Choreo) => Promise<void>; wrongLine?: Line; lines?: Line[]; /** a pass into the stride: seconds of the receiver's run to lead him by */ lead?: number }
  /** keep the ball up between partners for n touches, in rhythm (the ten-pass ritual); `calls`: what
   *  is said when the count reaches a number (the team counting out loud) */
  | { type: 'juggle'; players: string[]; count: number; ball: string; lines?: Line[]; calls?: Record<number, Line[]> }
  /** offer a solution (two steps to the side): an opponent hides the player from the carrier; move
   *  until the line opens, the ball comes, give it on with the pass button; `reps` times round the
   *  triangle. Lines per rep: when the opponent shuts the line, when it opens, when the ball is given.
   *  `finish`: the last pass goes to this team-mate instead, then `after`. `slow`: the moment in slow
   *  motion (« comme dans un rêve »). */
  | { type: 'support'; player: string; carrier: string; defender: string; partner: string; reps: number; finish?: string; slow?: number; prompt?: string
      hideLines?: (Line[] | undefined)[]; openLines?: (Line[] | undefined)[]; giveLines?: (Line[] | undefined)[]
      setup?: (c: Choreo) => Promise<void>; after?: (c: Choreo) => Promise<void> }
  /** draw opponents, then give it (« je vais les faire bouger »): two opponents jockey in front of the
   *  carrier and wait; the dribble button is the feint that makes them jump at him; when they have
   *  come, the lane to the partner opens: pass. Too early, the lane is shut; too late, they take it. */
  | { type: 'lure'; carrier: string; defenders: string[]; partner: string; prompt?: string; feintLines?: Line[]; passLines?: Line[]
      setup?: (c: Choreo) => Promise<void>; after?: (c: Choreo) => Promise<void> }
  /** run into space at the right moment (decoy), dragging a marker; then the scripted finish */
  | { type: 'run'; runner: string; marker: string; zone: { at: Pt; r: number }; cue?: Line; after: (c: Choreo) => Promise<void>; lines?: Line[] }
  /** take a penalty (aim, power) or save one (dive); the result is the book's */
  | { type: 'penalty'; role: 'shoot' | 'save'; taker: string; keeper: string; result: 'goal' | 'miss' | 'saved' | 'post'; missTo?: Pt; lines?: Line[]
      /** the goal of a shoot-out (the one this team attacks), when it is not the taker's own */
      attackedBy?: 'a' | 'b' }
  /** a frozen picture: choose; the canon option plays, the others are explained */
  | { type: 'choose'; options: { key: string; canon: boolean; line?: Line }[]; setup: (c: Choreo) => Promise<void>; after: (c: Choreo) => Promise<void>; prompt?: string; lockedHint?: string }
  /** a gesture in steps (the brothers' ritual): one button per step, each followed by its scripted moment */
  | { type: 'ritual'; steps: { key: string; act: (c: Choreo) => Promise<void> }[] }
  /** BriBri's notebook: the polite arrow draws itself along the line of circles, the player draws the
   *  one that crosses between two circles to the other side (finger or mouse; the pass button traces it) */
  | { type: 'sketch'; setup?: (c: Choreo) => Promise<void>; politeLines?: Line[]; drawLines?: Line[]; drawnLines?: Line[]; wordLines?: Line[]; after?: (c: Choreo) => Promise<void> }
  /** a run of play the player drives (carrier mode) until the scripted finish */
  | { type: 'drive'; player: string; target: Pt; r: number; after: (c: Choreo) => Promise<void>; lines?: Line[] }
