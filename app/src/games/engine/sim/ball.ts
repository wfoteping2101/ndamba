// Ball physics. On the ground the ball follows an exact solution of dv/dt = -(a0 + k v), so the
// pass solver and the interception predictor agree with the simulation to the millimetre.
// In the air: gravity, quadratic drag and bounces with the surface's restitution.
import { SURFACES, type Goal, type PitchGeom, type Surface } from './pitch'
import { clamp, type V2, type V3 } from './math'

export const BALL_R = 0.11
export const G = 9.81
const AIR_DRAG = 0.012 // per metre: a = -AIR_DRAG * |v| * v
const POST_R = 0.06

export interface Ball {
  pos: V3
  vel: V3
  /** player id who last touched the ball */
  lastTouch: string | null
  lastTouchTeam: 'a' | 'b' | 'n' | null
  /** player id in close control, if any */
  owner: string | null
  /** true from a kick until the ball is controlled or stops */
  inFlight: boolean
  /** a goal was scored: the ball sits in the net */
  inNet: Goal | null
  spin: number
}

export const makeBall = (x: number, y: number): Ball => ({
  pos: { x, y, z: BALL_R }, vel: { x: 0, y: 0, z: 0 }, lastTouch: null, lastTouchTeam: null, owner: null, inFlight: false, inNet: null, spin: 0,
})

export const groundSpeed = (b: Ball) => Math.hypot(b.vel.x, b.vel.y)
export const onGround = (b: Ball) => b.pos.z <= BALL_R + 0.002 && Math.abs(b.vel.z) < 0.4

/* ---------- exact ground roll ---------- */

/** Speed after t seconds of rolling from v0 (0 once stopped). */
export function rollSpeed(v0: number, t: number, s: Surface) {
  const { a0, k } = SURFACES[s]
  const c = a0 / k
  return Math.max(0, (v0 + c) * Math.exp(-k * t) - c)
}
/** Time until a ball rolling at v0 stops. */
export function rollStopTime(v0: number, s: Surface) {
  const { a0, k } = SURFACES[s]
  const c = a0 / k
  return v0 <= 0 ? 0 : Math.log((v0 + c) / c) / k
}
/** Distance rolled after t seconds (stops growing once the ball stops). */
export function rollDistance(v0: number, t: number, s: Surface) {
  const { a0, k } = SURFACES[s]
  const c = a0 / k
  const tt = Math.min(t, rollStopTime(v0, s))
  return ((v0 + c) * (1 - Math.exp(-k * tt))) / k - c * tt
}
/** Total distance until stop. */
export const rollRange = (v0: number, s: Surface) => rollDistance(v0, 1e9, s)
/** Time to roll distance d from v0 (Infinity if it never gets there). */
export function rollTimeTo(v0: number, d: number, s: Surface) {
  if (d <= 0) return 0
  if (rollRange(v0, s) < d) return Infinity
  let lo = 0, hi = rollStopTime(v0, s)
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (rollDistance(v0, mid, s) < d) lo = mid
    else hi = mid
  }
  return hi
}
/** The arrival speed of a firm ground pass of d metres: short passes soft, long ones driven. */
export const firmArrive = (d: number) => Math.max(5.5, Math.min(11, 4 + d * 0.22))

/** Initial speed so a ground pass covers d metres and still arrives at `arrive` m/s. */
export function groundPassSpeed(d: number, arrive: number, s: Surface) {
  const { a0, k } = SURFACES[s]
  const c = a0 / k
  // From v(t) and s(t): d = (v0 - va)/k - c * ln((v0 + c)/(va + c))/k, monotonic in v0.
  const f = (v0: number) => (v0 - arrive) / k - (c * Math.log((v0 + c) / (arrive + c))) / k - d
  let lo = arrive, hi = 45
  if (f(hi) < 0) return hi
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2
    if (f(mid) < 0) lo = mid
    else hi = mid
  }
  return hi
}

/* ---------- integration ---------- */

export interface BallStepResult {
  bounced: boolean
  hitPost: boolean
  goal: Goal | null
  out: boolean
}

/** Advance the ball by dt. Ground rolling uses the exact solution; flight uses semi-implicit Euler. */
export function stepBall(b: Ball, dt: number, p: PitchGeom, rnd: () => number = Math.random): BallStepResult {
  const res: BallStepResult = { bounced: false, hitPost: false, goal: null, out: false }
  if (b.inNet) {
    // settle in the net
    b.vel.x *= 0.8; b.vel.y *= 0.8; b.vel.z = 0; b.pos.z = BALL_R
    return res
  }
  const surf = SURFACES[p.surface]
  const prevX = b.pos.x, prevY = b.pos.y
  if (onGround(b)) {
    b.pos.z = BALL_R; b.vel.z = 0
    const v = groundSpeed(b)
    if (v > 1e-4) {
      const nv = rollSpeed(v, dt, p.surface)
      const dist = rollDistance(v, dt, p.surface)
      let dx = b.vel.x / v, dy = b.vel.y / v
      if (surf.bumpiness > 0 && v > 1) {
        // uneven red earth and mud: tiny random deflections, deterministic through rnd
        const a = (rnd() - 0.5) * surf.bumpiness * dt * 6
        const ca = Math.cos(a), sa = Math.sin(a)
        const ndx = dx * ca - dy * sa, ndy = dx * sa + dy * ca
        dx = ndx; dy = ndy
      }
      b.pos.x += dx * dist; b.pos.y += dy * dist
      b.vel.x = dx * nv; b.vel.y = dy * nv
      if (nv <= 1e-3) { b.vel.x = 0; b.vel.y = 0; b.inFlight = false }
    } else { b.vel.x = 0; b.vel.y = 0; b.inFlight = false }
  } else {
    const sub = 2, h = dt / sub
    for (let i = 0; i < sub; i++) {
      const sp = Math.hypot(b.vel.x, b.vel.y, b.vel.z)
      b.vel.x -= AIR_DRAG * sp * b.vel.x * h
      b.vel.y -= AIR_DRAG * sp * b.vel.y * h
      b.vel.z -= (G + AIR_DRAG * sp * b.vel.z) * h
      b.pos.x += b.vel.x * h; b.pos.y += b.vel.y * h; b.pos.z += b.vel.z * h
      if (b.pos.z < BALL_R) {
        b.pos.z = BALL_R
        if (b.vel.z < 0) {
          const e = surf.bounce
          b.vel.z = -b.vel.z * e
          b.vel.x *= 0.82; b.vel.y *= 0.82 // grass grabs the ball on impact
          if (b.vel.z < 0.9) b.vel.z = 0
          res.bounced = true
        }
      }
    }
  }
  // goals and posts
  for (const g of p.goals) {
    const r = goalCollision(b, g, prevX, prevY)
    if (r === 'goal') { res.goal = g; b.inNet = g; b.inFlight = false; b.owner = null; break }
    if (r === 'post') res.hitPost = true
  }
  if (!res.goal) {
    if (p.walls) {
      // street pitch: walls send the ball back with some energy loss
      if (b.pos.x < BALL_R) { b.pos.x = BALL_R; b.vel.x = Math.abs(b.vel.x) * 0.6; res.bounced = true }
      if (b.pos.x > p.w - BALL_R) { b.pos.x = p.w - BALL_R; b.vel.x = -Math.abs(b.vel.x) * 0.6; res.bounced = true }
      if (b.pos.y < BALL_R) { b.pos.y = BALL_R; b.vel.y = Math.abs(b.vel.y) * 0.6; res.bounced = true }
      if (b.pos.y > p.h - BALL_R) { b.pos.y = p.h - BALL_R; b.vel.y = -Math.abs(b.vel.y) * 0.6; res.bounced = true }
    } else if (b.pos.x < -BALL_R || b.pos.x > p.w + BALL_R || b.pos.y < -BALL_R || b.pos.y > p.h + BALL_R) {
      res.out = true
    }
  }
  return res
}

/** Posts, crossbar and goal line crossing for one goal. */
function goalCollision(b: Ball, g: Goal, prevX: number, prevY: number): 'goal' | 'post' | null {
  const half = g.width / 2
  // posts: vertical cylinders at the two ends of the goal line
  for (const py of [g.y - half, g.y + half]) {
    const dx = b.pos.x - g.x, dy = b.pos.y - py
    const d = Math.hypot(dx, dy)
    if (d < BALL_R + POST_R && b.pos.z < g.height + BALL_R) {
      const nx = dx / (d || 1), ny = dy / (d || 1)
      const vn = b.vel.x * nx + b.vel.y * ny
      if (vn < 0) { b.vel.x -= 1.7 * vn * nx; b.vel.y -= 1.7 * vn * ny }
      b.pos.x = g.x + nx * (BALL_R + POST_R); b.pos.y = py + ny * (BALL_R + POST_R)
      return 'post'
    }
  }
  // crossbar: horizontal cylinder along the goal line at height g.height
  if (Math.abs(b.pos.y - g.y) < half) {
    const dx = b.pos.x - g.x, dz = b.pos.z - g.height
    const d = Math.hypot(dx, dz)
    if (d < BALL_R + POST_R) {
      const nx = dx / (d || 1), nz = dz / (d || 1)
      const vn = b.vel.x * nx + b.vel.z * nz
      if (vn < 0) { b.vel.x -= 1.6 * vn * nx; b.vel.z -= 1.6 * vn * nz }
      return 'post'
    }
  }
  // goal line crossed between the posts and under the bar, moving into the goal
  const crossed = g.facing === -1 ? prevX < g.x && b.pos.x >= g.x : prevX > g.x && b.pos.x <= g.x
  if (crossed) {
    const t = (g.x - prevX) / ((b.pos.x - prevX) || 1e-9)
    const yAt = prevY + (b.pos.y - prevY) * clamp(t, 0, 1)
    if (Math.abs(yAt - g.y) < half - BALL_R * 0.5 && b.pos.z < g.height) return 'goal'
  }
  return null
}

/* ---------- kicks ---------- */

/** Ground pass: set velocity so the ball reaches `to` with `arrive` m/s. Returns the expected travel time. */
export function kickGround(b: Ball, to: V2, arrive: number, s: Surface) {
  const dx = to.x - b.pos.x, dy = to.y - b.pos.y
  const d = Math.hypot(dx, dy)
  const v0 = groundPassSpeed(d, arrive, s)
  b.vel.x = (dx / (d || 1)) * v0; b.vel.y = (dy / (d || 1)) * v0; b.vel.z = 0
  b.pos.z = BALL_R
  b.inFlight = true; b.owner = null
  return { v0, time: rollTimeTo(v0, d, s) }
}

/** Simulate a flight (no ground roll) and return where it first lands. Used by the lofted-pass solver. */
function flightLanding(vx: number, vy: number, vz: number, h = 1 / 240) {
  let x = 0, y = 0, z = BALL_R, t = 0
  for (let i = 0; i < 2400; i++) {
    const sp = Math.hypot(vx, vy, vz)
    vx -= AIR_DRAG * sp * vx * h; vy -= AIR_DRAG * sp * vy * h; vz -= (G + AIR_DRAG * sp * vz) * h
    x += vx * h; y += vy * h; z += vz * h; t += h
    if (z <= BALL_R && vz < 0) break
  }
  return { d: Math.hypot(x, y), t }
}

/** Lofted pass that lands on `to` after roughly `flight` seconds (apex grows with flight time). */
export function kickLofted(b: Ball, to: V2, flight: number) {
  const dx = to.x - b.pos.x, dy = to.y - b.pos.y
  const d = Math.hypot(dx, dy)
  const ux = dx / (d || 1), uy = dy / (d || 1)
  const vz = (G * flight) / 2
  // secant on horizontal speed so the drag-affected landing hits the target distance
  let vh = d / flight
  for (let i = 0; i < 8; i++) {
    const land = flightLanding(ux * vh, uy * vh, vz).d
    if (Math.abs(land - d) < 0.02) break
    vh *= d / Math.max(0.1, land)
  }
  b.vel.x = ux * vh; b.vel.y = uy * vh; b.vel.z = vz
  b.pos.z = BALL_R + 0.01
  b.inFlight = true; b.owner = null
  return { time: flightLanding(ux * vh, uy * vh, vz).t, vh, vz }
}

/** Shot at a 3D target (a point in the goal mouth) with a given speed. */
export function kickShot(b: Ball, target: V3, speed: number) {
  const dx = target.x - b.pos.x, dy = target.y - b.pos.y
  const d = Math.hypot(dx, dy)
  const t = d / speed
  // rise needed to arrive at target height, compensating gravity over the flight time
  const vz = (target.z - b.pos.z) / t + (G * t) / 2
  b.vel.x = (dx / (d || 1)) * speed; b.vel.y = (dy / (d || 1)) * speed; b.vel.z = Math.max(0, vz)
  b.inFlight = true; b.owner = null
  return { time: t }
}

/** Where will a ground ball be in t seconds (ignores collisions)? */
export function predictGround(b: Ball, t: number, s: Surface): V2 {
  const v = groundSpeed(b)
  if (v < 1e-4) return { x: b.pos.x, y: b.pos.y }
  const d = rollDistance(v, t, s)
  return { x: b.pos.x + (b.vel.x / v) * d, y: b.pos.y + (b.vel.y / v) * d }
}
