// Small, allocation-light vector maths for the football simulation.
// Pitch plane: x along the length (the team "a" attacks towards +x, as in the books' diagrams),
// y across the width (y = 0 is the top touchline of a diagram), z is height. Units: metres, seconds.

export interface V2 { x: number; y: number }
export interface V3 { x: number; y: number; z: number }

export const v2 = (x = 0, y = 0): V2 => ({ x, y })
export const v3 = (x = 0, y = 0, z = 0): V3 => ({ x, y, z })
export const copy2 = (a: V2): V2 => ({ x: a.x, y: a.y })
export const add2 = (a: V2, b: V2): V2 => ({ x: a.x + b.x, y: a.y + b.y })
export const sub2 = (a: V2, b: V2): V2 => ({ x: a.x - b.x, y: a.y - b.y })
export const scale2 = (a: V2, s: number): V2 => ({ x: a.x * s, y: a.y * s })
export const dot2 = (a: V2, b: V2) => a.x * b.x + a.y * b.y
export const cross2 = (a: V2, b: V2) => a.x * b.y - a.y * b.x
export const len2 = (a: V2) => Math.hypot(a.x, a.y)
export const dist2 = (a: V2, b: V2) => Math.hypot(a.x - b.x, a.y - b.y)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const lerp2 = (a: V2, b: V2, t: number): V2 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
export const norm2 = (a: V2): V2 => {
  const l = Math.hypot(a.x, a.y)
  return l > 1e-9 ? { x: a.x / l, y: a.y / l } : { x: 0, y: 0 }
}
export const limit2 = (a: V2, max: number): V2 => {
  const l = Math.hypot(a.x, a.y)
  return l > max && l > 0 ? { x: (a.x / l) * max, y: (a.y / l) * max } : a
}
export const angleOf = (a: V2) => Math.atan2(a.y, a.x)
export const fromAngle = (ang: number, l = 1): V2 => ({ x: Math.cos(ang) * l, y: Math.sin(ang) * l })
/** Shortest signed difference b - a between two angles, in (-pi, pi]. */
export const angleDiff = (a: number, b: number) => {
  let d = (b - a) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d <= -Math.PI) d += Math.PI * 2
  return d
}
/** Rotate angle a towards b by at most step. */
export const turnTowards = (a: number, b: number, step: number) => {
  const d = angleDiff(a, b)
  return Math.abs(d) <= step ? b : a + Math.sign(d) * step
}
/** Distance from point p to segment ab, and the parameter t (0..1) of the closest point. */
export function pointSegment(p: V2, a: V2, b: V2) {
  const abx = b.x - a.x, aby = b.y - a.y
  const l2 = abx * abx + aby * aby
  const t = l2 > 0 ? clamp(((p.x - a.x) * abx + (p.y - a.y) * aby) / l2, 0, 1) : 0
  const cx = a.x + abx * t, cy = a.y + aby * t
  return { d: Math.hypot(p.x - cx, p.y - cy), t, x: cx, y: cy }
}
/** Do segments ab and cd cross? */
export function segmentsCross(a: V2, b: V2, c: V2, d: V2) {
  const d1 = cross2(sub2(b, a), sub2(c, a)), d2 = cross2(sub2(b, a), sub2(d, a))
  const d3 = cross2(sub2(d, c), sub2(a, c)), d4 = cross2(sub2(d, c), sub2(b, c))
  return d1 * d2 < 0 && d3 * d4 < 0
}
/** Exponential smoothing factor that is frame-rate independent (rate ~ 5..12). */
export const smoothK = (rate: number, dt: number) => 1 - Math.exp(-rate * dt)
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

/** Deterministic seeded random numbers (mulberry32), so a drill replays identically. */
export class Rng {
  private s: number
  constructor(seed = 1) { this.s = seed >>> 0 || 1 }
  next() {
    let t = (this.s += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  range(lo: number, hi: number) { return lo + (hi - lo) * this.next() }
  /** Roughly normal (sum of three uniforms), mean 0, sd ~ 1. */
  gauss() { return (this.next() + this.next() + this.next() - 1.5) * 2 }
  pick<T>(list: readonly T[]): T { return list[Math.floor(this.next() * list.length) % list.length] }
}
