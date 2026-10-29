// Shared simulation types: players, intents, events.
import type { V2 } from './math'

export type Team = 'a' | 'b' | 'n'
export type AnimState = 'idle' | 'move' | 'kick' | 'receive' | 'tackle' | 'dive' | 'celebrate' | 'dejected' | 'catch'

/** Looks for the procedural character (kit, skin, hair...). The renderer reads it, the sim ignores it. */
export interface Look {
  skin: string
  hair: 'crop' | 'twists' | 'afro' | 'bald' | 'cornrows' | 'puff' | 'long' | 'cap'
  hairColor: string
  shirt: string
  shirtTrim: string
  shorts: string
  sockL: string
  sockR: string
  boots: string
  number?: number
  /** child proportions (Lionceaux) */
  kid?: boolean
  /** 0.9 .. 1.1 */
  build?: number
  /** BriBri's notebook, a headband, a bib... */
  prop?: 'notebook' | 'bib' | 'none'
  bib?: string
  gloves?: string
}

export interface PendingAction {
  type: 'pass' | 'lofted' | 'shot' | 'clear' | 'tackle'
  /** pass target point (receiver's meeting point or a space) */
  to?: V2
  receiver?: string | null
  /** arrival speed for ground passes (m/s) */
  arrive?: number
  /** flight time for lofted passes (s) */
  flight?: number
  /** shot target height and speed */
  height?: number
  speed?: number
  /** seconds until the foot meets the ball (wind-up) */
  windup: number
  /** who asked: the user or the AI */
  by: 'user' | 'ai'
}

export interface Player {
  id: string
  label?: string
  name?: string
  team: Team
  gk: boolean
  pos: V2
  vel: V2
  facing: number
  /** sprint speed m/s */
  maxSpeed: number
  accel: number
  decel: number
  height: number
  /** movement intent */
  target: V2 | null
  /** 0..1 of max speed */
  speedMode: number
  /** where to look when slow (usually the ball) */
  faceTarget: V2 | null
  /** desired first-touch direction when receiving (oriented control) */
  touchDir: V2 | null
  pending: PendingAction | null
  anim: AnimState
  animT: number
  kickFoot: 'L' | 'R'
  /** touches in the current possession (for two-touch rules) */
  touches: number
  /** controlled by the user */
  controlled: boolean
  /** seconds of reaction delay for AI decisions */
  reaction: number
  /** time before the player can kick or tackle again */
  cooldown: number
  /** player wants the ball (AI receivers, interceptors); false = ignores a passing ball */
  wantsBall: boolean
  /** skill 0..1: first touch, pass accuracy */
  skill: number
  look: Look
  /** freeform data for the game layer (drill role, story character id...) */
  meta: Record<string, unknown>
}

export type SimEvent =
  | { type: 'kick'; t: number; by: string; team: Team; kind: 'pass' | 'lofted' | 'shot' | 'clear'; from: V2; to?: V2; receiver?: string | null; speed: number }
  | { type: 'control'; t: number; by: string; team: Team; at: V2; passer: string | null; passerTeam: Team | null; heavy: boolean; start: V2 | null }
  | { type: 'pass_complete'; t: number; from: string; to: string; team: Team; start: V2; end: V2 }
  | { type: 'pass_lost'; t: number; from: string; team: Team; by: string | null; reason: 'intercepted' | 'out' | 'stopped' | 'blocked'; start: V2; end: V2 }
  | { type: 'tackle'; t: number; by: string; on: string; success: boolean }
  | { type: 'loss'; t: number; team: Team; by: string; reason: 'tackle' | 'control' | 'dribble' | 'out' }
  | { type: 'regain'; t: number; team: Team; by: string; within5: boolean; at: V2 }
  | { type: 'shot'; t: number; by: string; team: Team; from: V2 }
  | { type: 'save'; t: number; by: string }
  | { type: 'goal'; t: number; team: Team; by: string | null; goalAttackedBy: 'a' | 'b' }
  | { type: 'out'; t: number; lastTeam: Team | null; at: V2 }
  | { type: 'post'; t: number }
  | { type: 'touch'; t: number; by: string }

export interface Difficulty {
  /** decision reaction delay (s) */
  reaction: number
  /** 0..1: reading the carrier's body to anticipate a pass */
  anticipation: number
  /** 0..1: how hard the closest defender presses */
  press: number
  /** 0..1: willingness to step into lanes */
  intercept: number
  /** radians of pass direction noise for the AI */
  passNoise: number
  /** 0..1: utility noise in AI choices */
  noise: number
}

export const DIFFICULTY: Record<'facile' | 'normal' | 'difficile', Difficulty> = {
  facile: { reaction: 0.42, anticipation: 0.1, press: 0.45, intercept: 0.45, passNoise: 0.09, noise: 0.35 },
  normal: { reaction: 0.28, anticipation: 0.45, press: 0.7, intercept: 0.7, passNoise: 0.05, noise: 0.18 },
  difficile: { reaction: 0.17, anticipation: 0.8, press: 0.92, intercept: 0.9, passNoise: 0.025, noise: 0.07 },
}
export type Level = keyof typeof DIFFICULTY
