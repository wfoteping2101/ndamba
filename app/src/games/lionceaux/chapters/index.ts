// The chapters that are playable as story (scene, walk, football, consequence), loaded on demand.
// The others are presented with their summary, their illustration and their playable lesson.
import type { ChapterScript } from '../story/session'

export const SCRIPTS: Partial<Record<number, () => Promise<ChapterScript>>> = {
  1: () => import('./ch01').then((m) => m.CH01),
  2: () => import('./ch02').then((m) => m.CH02),
  3: () => import('./ch03').then((m) => m.CH03),
  4: () => import('./ch04').then((m) => m.CH04),
  5: () => import('./ch05').then((m) => m.CH05),
  6: () => import('./ch06').then((m) => m.CH06),
  7: () => import('./ch07').then((m) => m.CH07),
  8: () => import('./ch08').then((m) => m.CH08),
  9: () => import('./ch09').then((m) => m.CH09),
  10: () => import('./ch10').then((m) => m.CH10),
  11: () => import('./ch11').then((m) => m.CH11),
}

export const isPlayable = (n: number) => !!SCRIPTS[n]
export const PLAYABLE = Object.keys(SCRIPTS).map(Number).sort((a, b) => a - b)
