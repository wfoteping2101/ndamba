// The places of the game, by id: the size of their World and how to build them.
import type { Frame, Stage } from '../../engine/render/stage'
import type { PitchGeom } from '../../engine/sim/pitch'
import { bonaPitch, buildBonamoussadi, type BonaOpts, type SetHandle } from './bonamoussadi'
import { buildBafoussam, hillPitch } from './bafoussam'
import { MAISON_H, MAISON_W, MAMI_H, MAMI_W, buildMaison, buildMami, roomPitch } from './interiors'
import { avionPitch, buildAvion } from './avion'
import { buildCar, carPitch } from './car'

export type PlaceId = 'bona' | 'maison' | 'mami' | 'colline' | 'avion' | 'car'

export interface SetDef {
  pitch(opts: Record<string, unknown>): PitchGeom
  build(stage: Stage, frame: Frame, opts: Record<string, unknown>): SetHandle
  indoor?: boolean
  shadowSize?: number
}

export const SETS: Record<PlaceId, SetDef> = {
  bona: { pitch: (o) => bonaPitch(o.mud ? 'mud' : 'redEarth'), build: (s, f, o) => buildBonamoussadi(s, f, o as BonaOpts), shadowSize: 80 },
  maison: { pitch: () => roomPitch(MAISON_W, MAISON_H), build: (s, f, o) => buildMaison(s, f, o as { night?: boolean }), indoor: true, shadowSize: 18 },
  mami: { pitch: () => roomPitch(MAMI_W, MAMI_H), build: (s, f, o) => buildMami(s, f, o as { night?: boolean; njangi?: boolean }), shadowSize: 30 },
  colline: { pitch: () => hillPitch(), build: (s, f) => buildBafoussam(s, f), shadowSize: 60 },
  avion: { pitch: () => avionPitch(), build: (s, f) => buildAvion(s, f), indoor: true, shadowSize: 40 },
  car: { pitch: () => carPitch(), build: (s, f) => buildCar(s, f), indoor: true, shadowSize: 14 },
}
