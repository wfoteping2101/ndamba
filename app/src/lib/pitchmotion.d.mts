import type { DiagramSpec } from './types'
export interface MotionStep { n: number; sub: boolean; t0: number; t1: number; text: string }
export interface Motion {
  spec: DiagramSpec
  duration: number
  /** when the last move ends (the rest is the finished diagram, held) */
  end: number
  steps: { n: number; sub: boolean; t0: number; t1: number }[]
}
export interface MotionLayout { W: number; H: number }
export interface DrawMotionOptions {
  width: number
  height: number
  font?: string
  lang?: 'fr' | 'en'
  labelText?: (text: string) => string
  caption?: boolean
  title?: string
  minUnit?: number
  palette?: Record<string, string>
}
export const MOTION_PALETTE: Record<string, string>
export function buildMotion(spec: DiagramSpec, opts?: { noSpeedUp?: boolean }): Motion
export function drawMotion(ctx: CanvasRenderingContext2D, m: Motion, t: number, opts: DrawMotionOptions): MotionLayout
export function motionSteps(m: Motion, lang?: 'fr' | 'en', opts?: object): MotionStep[]
export function hasMotion(spec?: DiagramSpec | null): boolean
export function viewSize(spec: DiagramSpec): { w: number; h: number }
