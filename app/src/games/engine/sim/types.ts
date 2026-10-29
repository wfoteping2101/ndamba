// Shared simulation types: players, intents, events.
import type { V2 } from './math'

export type Team = 'a' | 'b' | 'n'
export type AnimState = 'idle' | 'move' | 'kick' | 'receive' | 'tackle' | 'dive' | 'celebrate' | 'dejected' | 'catch'
  // story poses (Lionceaux)
  | 'sit' | 'talk' | 'dance' | 'fist' | 'heart' | 'cry' | 'wave' | 'point' | 'hold' | 'juggle' | 'kneel' | 'palm' | 'sew' | 'lie'
  | 'open' | 'mic' | 'hug' | 'sitGround' | 'climb' | 'shrug'

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
  /** a girl's body (Mireille) */
  girl?: boolean
  /** 0.9 .. 1.1 */
  build?: number
  /** BriBri's notebook, a headband, a bib... */
  prop?: 'notebook' | 'bib' | 'none'
  bib?: string
  gloves?: string
  /* ---- story looks (Lionceaux): all optional, the footballers never set them ---- */
  /** a collar on the shirt (jersey, polo) in this colour */
  collar?: string
  /** a vertical stripe on the chest, on the wearer's left or right */
  stripe?: { color: string; side: 'L' | 'R' }
  /** shirt number on chest and back (drawn) */
  numberColor?: string
  /** long trousers instead of shorts and socks */
  trousers?: string
  /** trouser side stripes (tracksuits) */
  trouserStripe?: string
  /** a long dress or skirt in this colour, with an optional printed pattern */
  dress?: string
  pattern?: { a: string; b: string; kind: 'wax' | 'leaves' | 'circles' }
  /** a head wrap (with the pattern if any) */
  headwrap?: string
  /** a cap in this colour (when hair is 'cap') */
  cap?: string
  /** shoes: football boots (default), trainers, sandals, town shoes */
  shoes?: 'boots' | 'trainers' | 'sandals' | 'shoes'
  /** a thin shaved line in the hair, on the wearer's left or right */
  part?: 'L' | 'R'
  /** a gap between the front teeth */
  gap?: boolean
  beard?: string
  glasses?: boolean
  earrings?: string
  /** an elder's slight stoop, a cane in the right hand */
  elder?: boolean
  cane?: boolean
  /** adult woman proportions */
  woman?: boolean
  /** height scale (1 = standard for adults / children) */
  height?: number
  /** an open tracksuit top: `shirt` is the top (body and long sleeves), `jacket` is the T-shirt showing down the front */
  jacket?: string
  /** a mark on the shirt: a felt-pen shark fin, leopard spots */
  chestMark?: 'fin' | 'spots'
  chestMarkColor?: string
  /** a brimmed hat (with a band of flowers) */
  hat?: string
  hatFlowers?: string
  /** not a person: an animal crossing the pitch (shirt = coat colour) */
  animal?: 'goat'
}

export interface PendingAction {
  type: 'pass' | 'lofted' | 'shot' | 'clear' | 'tackle'
  /** pass target point (receiver's meeting point or a space) */
  to?: V2
  receiver?: string | null
  /** arrival speed for ground passes (m/s) */
  arrive?: number
  /** demonstrations: the ball goes exactly where the sheet draws it */
  precise?: boolean
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
  facile: { reaction: 0.45, anticipation: 0.1, press: 0.38, intercept: 0.4, passNoise: 0.09, noise: 0.35 },
  normal: { reaction: 0.3, anticipation: 0.4, press: 0.6, intercept: 0.62, passNoise: 0.05, noise: 0.18 },
  difficile: { reaction: 0.17, anticipation: 0.8, press: 0.92, intercept: 0.9, passNoise: 0.025, noise: 0.07 },
}
export type Level = keyof typeof DIFFICULTY
