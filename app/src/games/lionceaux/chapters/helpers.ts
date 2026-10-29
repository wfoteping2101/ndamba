// Small helpers to write the chapter scripts: lines, teams on the Bonamoussadi pitch.
import type { CastId } from '../cast'
import type { ActorSpec, Line, Pt } from '../story/types'

/** a line of the narrator */
export const N = (text: string): Line => ({ who: 'narr', text })
/** a thought of a character (italic in the book) */
export const T = (of: CastId, text: string): Line => ({ who: 'pensee', of, text })
/** a spoken line */
export const S = (who: CastId, text: string, by?: string): Line => ({ who, text, by })

const mateShirts = ['#d9cdb4', '#3f6e8c', '#c45a3a', '#7aa05a', '#e2c26a']
const mateShorts = ['#2f3f5a', '#2a2a2a', '#5a3a2a', '#3a4a2a']

/** an unnamed Lionceau, in his own clothes */
export function lion(id: string, at: Pt, v: number, face?: ActorSpec['face']): ActorSpec {
  return { id, cast: 'lion', team: 'a', at, face, variant: v, look: { shirt: mateShirts[v % mateShirts.length], shirtTrim: mateShirts[(v + 2) % mateShirts.length], shorts: mateShorts[v % mateShorts.length], sockL: v % 2 ? '#e9e3d6' : '#3a3a3a', sockR: v % 2 ? '#e9e3d6' : '#3a3a3a' } }
}

/** a player of another team of the quarter (the cast entry gives the kit) */
export function rival(id: string, cast: CastId, at: Pt, v: number, extra: Partial<ActorSpec> = {}): ActorSpec {
  return { id, cast, team: 'b', at, variant: v, face: Math.PI, ...extra }
}
