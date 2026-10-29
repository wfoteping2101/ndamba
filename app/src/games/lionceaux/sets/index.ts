// The places of the game, by id: the size of their World and how to build them.
import type { Frame, Stage } from '../../engine/render/stage'
import type { PitchGeom } from '../../engine/sim/pitch'
import { bonaPitch, buildBonamoussadi, type BonaOpts, type SetHandle } from './bonamoussadi'
import { buildBafoussam, hillPitch } from './bafoussam'
import { MAISON_H, MAISON_W, MAMI_H, MAMI_W, buildMaison, buildMami, roomPitch } from './interiors'
import { avionPitch, buildAvion } from './avion'
import { buildCar, carPitch } from './car'
import { buildWaldorf, waldorfPitch, type WaldorfOpts } from './waldorf'
import { buildClasse, buildGym, buildMaisonUS, classePitch, gymPitch, maisonUsPitch } from './waldorfInside'
import { buildBus, busPitch } from './bus'
import { buildDome, buildParking, domePitch, parkingPitch, type DomeOpts } from './dome'
import { buildField, buildVideoRoom, fieldPitch, videoPitch } from './academie'

export type PlaceId = 'bona' | 'maison' | 'mami' | 'colline' | 'avion' | 'car' | 'waldorf' | 'maisonUS' | 'classe' | 'gymnase' | 'bus' | 'dome' | 'parking' | 'printemps' | 'salleVideo'

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
  // Part II, Waldorf (Maryland)
  waldorf: { pitch: () => waldorfPitch(), build: (s, f, o) => buildWaldorf(s, f, o as WaldorfOpts), shadowSize: 60 },
  maisonUS: { pitch: () => maisonUsPitch(), build: (s, f, o) => buildMaisonUS(s, f, o as { night?: boolean }), indoor: true, shadowSize: 18 },
  classe: { pitch: () => classePitch(), build: (s, f) => buildClasse(s, f), indoor: true, shadowSize: 14 },
  gymnase: { pitch: () => gymPitch(), build: (s, f) => buildGym(s, f), indoor: true, shadowSize: 34 },
  bus: { pitch: () => busPitch(), build: (s, f) => buildBus(s, f), indoor: true, shadowSize: 14 },
  dome: { pitch: () => domePitch(), build: (s, f, o) => buildDome(s, f, o as DomeOpts), indoor: true, shadowSize: 80 },
  parking: { pitch: () => parkingPitch(), build: (s, f, o) => buildParking(s, f, o as { snow?: boolean }), shadowSize: 70 },
  printemps: { pitch: () => fieldPitch(), build: (s, f, o) => buildField(s, f, o as { crowd?: boolean }), shadowSize: 80 },
  salleVideo: { pitch: () => videoPitch(), build: (s, f) => buildVideoRoom(s, f), indoor: true, shadowSize: 14 },
}
