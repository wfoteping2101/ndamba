// The chapters that are playable as story (scene, walk, football, consequence), loaded on demand.
// The others are presented with their summary, their illustration and their playable lesson.
import type { ChapterScript } from '../story/session'

export const SCRIPTS: Partial<Record<number, () => Promise<ChapterScript>>> = {
  1: () => import('./ch01').then((m) => m.CH01),
  2: () => import('./ch02').then((m) => m.CH02),
}

export const isPlayable = (n: number) => !!SCRIPTS[n]
export const PLAYABLE = Object.keys(SCRIPTS).map(Number).sort((a, b) => a - b)
