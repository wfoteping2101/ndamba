import type { DiagramSpec } from './types'
export const PALETTE: Record<string, string>
export function renderDiagram(spec: DiagramSpec, opts?: { width?: number; pad?: number; title?: string; radius?: number; palette?: Record<string, string>; font?: string }): string
export function validateDiagram(spec: unknown): string[]
export function viewSize(spec: DiagramSpec): { w: number; h: number }
