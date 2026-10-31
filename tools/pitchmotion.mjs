// Njangi pitch motion: plays a diagram spec (same JSON as tools/pitch.mjs) as a short film.
// One engine, two outputs: the app draws it live in a <canvas>, tools/render_videos.mjs encodes MP4s.
// No dependencies. Any Canvas 2D context works (browser or @napi-rs/canvas).
//
//   import { buildMotion, drawMotion, motionSteps } from './pitchmotion.mjs'
//   const m = buildMotion(spec)               // timeline, once per spec
//   drawMotion(ctx, m, t, { width, height })  // one frame at time t (seconds)
//   motionSteps(m, 'fr')                      // [{ n, t0, t1, text }] for captions
//
// The arrows carry the story. Arrows with the same number move together; numbers play in order.
//   pass    the ball travels to a player (or to a point, where the nearest player meets it)
//   run     the player runs, without the ball
//   dribble the player carries the ball
//   shot    the ball flies to the target, fast
//   press   the player closes down the target
// A run followed by a pass to the runner is timed so that ball and runner arrive together.

export const MOTION_PALETTE = {
  grass1: '#3E7A44',
  grass2: '#458449',
  surround: '#376F3D',
  line: 'rgba(255,255,255,0.86)',
  gridLine: 'rgba(255,255,255,0.62)',
  ink: '#1D2621',
  cream: '#FBF7EE',
  a: '#FBF7EE', aRim: '#1F4D3A', aText: '#1F4D3A', aTrail: '#FFF1C9',
  b: '#C8492F', bRim: '#FFFFFF', bText: '#FFFFFF', bTrail: '#FFB39E',
  n: '#E9B23A', nRim: '#2A1F05', nText: '#2A1F05', nTrail: '#FFE08A',
  gk: '#2F4466', gkRim: '#FFFFFF', gkText: '#FFFFFF',
  gkb: '#6B4A7A', gkbRim: '#FFFFFF', gkbText: '#FFFFFF',
  pass: '#FFFFFF',
  shot: '#FFB23E',
  cone: '#F07F2A',
  zoneA: 'rgba(255,246,214,0.17)',
  zoneB: 'rgba(240,112,80,0.22)',
  zoneN: 'rgba(247,196,64,0.24)',
  zoneSoft: 'rgba(255,255,255,0.10)',
  badge: '#FBF7EE',
  shadow: 'rgba(10,30,14,0.32)',
}

const VIEWS = { full: { w: 105, h: 68 }, half: { w: 52.5, h: 68 }, third: { w: 35, h: 68 } }

export function viewSize(spec) {
  if (spec.view === 'grid') return { w: Number(spec.w) || 30, h: Number(spec.h) || 20 }
  return VIEWS[spec.view] || VIEWS.half
}

/* ------------------------------------------------------------------ timing */

const INTRO = 0.9
const GAP = 0.32
const END_HOLD = 2.3
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y)
const lerp = (a, b, t) => a + (b - a) * t
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easePass = (t) => 0.3 * t + 0.7 * (1 - (1 - t) * (1 - t))
const easeCarry = (t) => 0.2 * t + 0.8 * easeInOut(t)

function durFor(kind, d, f = 1) {
  let v
  if (kind === 'pass') v = clamp(0.55 + d / 16, 0.7, 1.9)
  else if (kind === 'shot') v = clamp(0.4 + d / 30, 0.5, 1.05)
  else if (kind === 'dribble') v = clamp(0.7 + d / 5, 1.0, 3.0)
  else if (kind === 'press') v = clamp(0.5 + d / 7, 0.8, 2.2)
  else v = clamp(0.6 + d / 7, 0.9, 2.6) // run
  return v * f
}

const KINDS = ['pass', 'run', 'dribble', 'shot', 'press']

/**
 * Builds the timeline of a diagram. Pure data: positions are in the spec's meters,
 * team "a" attacking to the right, like the static diagram.
 * A long move (many steps) is played a little faster so the film stays short.
 */
export function buildMotion(spec, opts = {}) {
  const m = timeline(spec, 1)
  const play = m.end - INTRO
  if (play > 15 && !opts.noSpeedUp) return timeline(spec, Math.max(0.62, 15 / play))
  return m
}

function timeline(spec, F) {
  const size = viewSize(spec)
  const players = (spec.players || []).map((p) => ({ ...p }))
  const byId = new Map(players.map((p) => [p.id, p]))
  const reach = Math.max(2.6, Math.min(size.w, size.h) * 0.1) // how far a player may be from a point to own it
  const gap = GAP * F

  // number the arrows: an arrow without a number moves with the one before it,
  // unless it starts where that one ends (a shot after the pass): then it comes just after
  const firstN = (spec.arrows || []).find((a) => a.n != null)?.n ?? 1
  const near = (p, q) => p && q && Math.hypot(p.x - q.x, p.y - q.y) <= 1.2
  const ptOf0 = (v) => (typeof v === 'string' ? (byId.get(v) ? { x: byId.get(v).x, y: byId.get(v).y } : null) : Array.isArray(v) ? { x: v[0], y: v[1] } : null)
  let lastN = null
  const arrows = []
  for (const [i, a] of (spec.arrows || []).entries()) {
    if (!KINDS.includes(a.kind)) continue
    let n = a.n != null ? Number(a.n) : (lastN ?? Number(firstN))
    if (a.n == null) {
      const before = arrows.filter((e) => e.n === n)
      const follows = before.some((e) => (typeof a.from === 'string' && e.to === a.from && e.kind === 'pass') || (Array.isArray(a.from) && Array.isArray(e.to) && near(ptOf0(a.from), ptOf0(e.to))))
      if (follows) n = n + 0.5
    }
    lastN = n
    arrows.push({ ...a, n, i, badge: a.n != null })
  }
  const ns = [...new Set(arrows.map((a) => a.n))].sort((a, b) => a - b)

  const pos = new Map(players.map((p) => [p.id, { x: p.x, y: p.y }])) // where each player is once every move so far is over
  const moves = new Map(players.map((p) => [p.id, []])) // { t0, t1, from, to, ease }
  const glows = []
  const trails = []
  const steps = []

  // balls: each has an open segment (held or free) that its next action closes
  const balls = []
  const newBall = (open) => { const b = { open, segs: [] }; balls.push(b); return b }
  if (typeof spec.ball === 'string' && byId.has(spec.ball)) newBall({ type: 'held', holder: spec.ball, t0: 0 })
  else if (Array.isArray(spec.ball)) newBall({ type: 'free', x: spec.ball[0], y: spec.ball[1], t0: 0 })
  let anyBallAction = false

  const attackDir = (id) => {
    const p = byId.get(id)
    return p && (p.team === 'b' || p.team === 'gkb') ? { x: -1, y: 0 } : { x: 1, y: 0 }
  }
  const unit = (from, to, fallback) => {
    const d = dist(from, to)
    return d > 0.01 ? { x: (to.x - from.x) / d, y: (to.y - from.y) / d } : (fallback || { x: 1, y: 0 })
  }
  // closes a ball's open segment at time t, turning a held ball towards where it goes next
  const closeBall = (b, t, towards) => {
    if (!b || !b.open) return null
    const s = b.open
    s.t1 = t
    if (s.type === 'held') s.dir = s.dir || (towards ? unit(pos.get(s.holder), towards, s.inDir || attackDir(s.holder)) : (s.inDir || attackDir(s.holder)))
    b.segs.push(s)
    b.open = null
    return s
  }
  const ballOf = (id) => balls.find((b) => b.open && b.open.type === 'held' && b.open.holder === id)
  const ballNear = (pt) => balls.find((b) => b.open && b.open.type === 'free' && dist({ x: b.open.x, y: b.open.y }, pt) <= reach)
  // a player who needs the ball gets his own, or one nobody uses in this step (it jumps: fade out, fade in), or a new one
  const giveBallTo = (id, t, busy) => {
    let b = ballOf(id)
    if (b) return { b, t }
    b = balls.find((x) => !busy.has(x) && x.open)
    if (b) {
      const tf = Math.max(t - 0.36, b.open.t0 + 0.05)
      b.open.fadeOut = true
      closeBall(b, tf)
      b.open = { type: 'held', holder: id, t0: tf, fadeIn: true }
      busy.add(b)
      return { b, t: Math.max(t, tf + 0.3) }
    }
    b = newBall(anyBallAction ? { type: 'held', holder: id, t0: Math.max(0, t - 0.36), fadeIn: true } : { type: 'held', holder: id, t0: 0 })
    busy.add(b)
    return { b, t: anyBallAction ? Math.max(t, t - 0.36 + 0.3) : t }
  }
  const nearest = (pt, exclude) => {
    let best = null, bd = Infinity
    for (const p of players) {
      if (p.id === exclude) continue
      const d = dist(pos.get(p.id), pt)
      if (d < bd) { bd = d; best = p.id }
    }
    return bd <= reach ? best : null
  }

  let prev = null // { start, end, ballAction, movers: Map id -> arrival }
  for (const n of ns) {
    const group = arrows.filter((a) => a.n === n)
    const hasBall = group.some((a) => a.kind === 'pass' || a.kind === 'shot' || a.kind === 'dribble')
    const sub = prev && n % 1 !== 0 // a continuation (shot after the pass): straight on
    let start = prev ? prev.end + (sub ? gap * 0.4 : gap) : INTRO
    // third man: a pass to someone still running from the step before leaves early, so they arrive together
    let syncFrom = null
    if (prev && !prev.ballAction) {
      const toRunner = group.filter((a) => a.kind === 'pass' && (typeof a.to === 'string' ? prev.movers.has(a.to) : Array.isArray(a.to) && [...prev.movers.keys()].some((id) => dist(pos.get(id), { x: a.to[0], y: a.to[1] }) <= reach)))
      if (toRunner.length) { syncFrom = prev; start = prev.start + Math.min(0.5 * F, (prev.end - prev.start) * 0.3) }
    }
    const items = []

    // 1. who acts
    for (const a of group) {
      let actor = null, origin = null
      if (typeof a.from === 'string') { actor = byId.has(a.from) ? a.from : null; origin = actor ? { ...pos.get(actor) } : null }
      else if (Array.isArray(a.from)) { origin = { x: a.from[0], y: a.from[1] }; actor = nearest(origin) }
      if (!origin) continue
      // a run from an empty spot to a player: that player arrives there from the spot (he starts on it)
      if (!actor && ['run', 'press', 'dribble'].includes(a.kind) && typeof a.to === 'string' && byId.has(a.to) && !moves.get(a.to).length && !items.some((x) => x.actor === a.to)) {
        const p = byId.get(a.to)
        p.x0 = origin.x; p.y0 = origin.y
        items.push({ a, actor: a.to, origin, arrival: { ...pos.get(a.to) } })
        continue
      }
      items.push({ a, actor, origin })
    }
    // balls already in use in this step: nobody takes them away
    const busy = new Set()
    for (const it of items) if (it.actor && (it.a.kind === 'pass' || it.a.kind === 'shot' || it.a.kind === 'dribble')) { const b = ballOf(it.actor); if (b) busy.add(b) }

    // 2. movements (run, press, dribble): destinations, twice so a move towards a moving player aims at where he ends
    const dest = new Map()
    for (let k = 0; k < 2; k++) {
      for (const it of items) {
        if (!['run', 'press', 'dribble'].includes(it.a.kind) || !it.actor) continue
        if (it.arrival) { dest.set(it.actor, it.arrival); it.dest = it.arrival; continue }
        let to
        if (typeof it.a.to === 'string') {
          const target = dest.get(it.a.to) || pos.get(it.a.to)
          if (!target) continue
          const stop = it.a.kind === 'press' ? 1.3 : 1.7
          const d = dist(it.origin, target)
          to = d > stop ? { x: target.x - ((target.x - it.origin.x) / d) * stop, y: target.y - ((target.y - it.origin.y) / d) * stop } : { ...it.origin }
          it.toPlayer = it.a.to
        } else to = { x: it.a.to[0], y: it.a.to[1] }
        dest.set(it.actor, to)
        it.dest = to
      }
    }
    let end = start
    const movers = new Map()
    for (const it of items) {
      if (!it.dest) continue
      const d = dist(it.origin, it.dest)
      let t0 = start
      if (it.a.kind === 'dribble') { const g = giveBallTo(it.actor, start, busy); t0 = g.t; it.ball = g.b; anyBallAction = true }
      const t1 = t0 + durFor(it.a.kind, d, F)
      it.t0 = t0; it.t1 = t1
      movers.set(it.actor, t1)
      end = Math.max(end, t1)
    }

    // 3. ball actions (pass, shot)
    for (const it of items) {
      if (it.a.kind !== 'pass' && it.a.kind !== 'shot') continue
      let target = null, receiver = null, meet = null
      if (typeof it.a.to === 'string' && byId.has(it.a.to)) {
        receiver = it.a.to
        target = dest.get(receiver) || pos.get(receiver)
      } else if (Array.isArray(it.a.to)) {
        target = { x: it.a.to[0], y: it.a.to[1] }
        if (it.a.kind === 'pass') {
          // a runner of this step who ends there, else the player standing closest, who steps to meet the ball
          for (const [id, d] of dest) if (id !== it.actor && dist(d, target) <= reach) receiver = id
          if (!receiver && syncFrom) for (const [id] of syncFrom.movers) if (id !== it.actor && dist(pos.get(id), target) <= reach) receiver = id
          if (!receiver) { const id = nearest(target, it.actor); if (id && !dest.has(id)) { receiver = id; meet = target } }
        }
      }
      if (!target) continue
      const from = it.actor ? pos.get(it.actor) : it.origin
      const d = dist(from, target)
      const dur = durFor(it.a.kind, d, F)
      let t0 = start
      // in step with a runner: leave so that ball and runner arrive at the same time
      const runnerArrival = receiver ? (movers.get(receiver) ?? syncFrom?.movers.get(receiver)) : undefined
      if (runnerArrival !== undefined) t0 = Math.max(start, runnerArrival - dur)
      let b, prevHold = null
      if (it.actor) { const g = giveBallTo(it.actor, t0, busy); b = g.b; t0 = g.t; prevHold = closeBall(b, t0, target) }
      else {
        b = ballNear(from)
        if (b) closeBall(b, t0)
        else {
          b = balls.find((x) => !busy.has(x) && x.open) || null
          if (b) { b.open.fadeOut = true; closeBall(b, Math.max(b.open.t0 + 0.05, t0 - 0.3)) } else b = newBall(null)
          busy.add(b)
        }
      }
      anyBallAction = true
      const t1 = t0 + dur
      const peak = it.a.kind === 'shot' ? Math.min(1.4, d * 0.04) : d > 22 ? Math.min(4.2, d * 0.1) : 0
      const seg = { type: 'flight', kind: it.a.kind, t0, t1, from: { x: from.x, y: from.y, holder: it.actor }, to: { x: target.x, y: target.y, holder: receiver }, peak, prevHold }
      b.segs.push(seg)
      b.open = receiver ? { type: 'held', holder: receiver, t0: t1, inDir: unit(from, target) } : { type: 'free', x: target.x, y: target.y, t0: t1 }
      seg.next = b.open
      if (meet && receiver) {
        const md = dist(pos.get(receiver), meet)
        if (md > 0.35) it.meet = { id: receiver, from: { ...pos.get(receiver) }, to: meet, t0: t0 + dur * 0.25, t1 }
      }
      it.t0 = t0; it.t1 = t1; it.target = target; it.receiver = receiver; it.from = from
      if (it.actor) glows.push({ id: it.actor, t0: t0 - 0.15, t1: t0 + 0.45 })
      if (receiver) glows.push({ id: receiver, t0: t1 - 0.2, t1: t1 + 0.4 })
      end = Math.max(end, t1)
    }

    // 4. commit the moves, the carries and the trails
    for (const it of items) {
      if (it.dest) {
        moves.get(it.actor).push({ t0: it.t0, t1: it.t1, from: { ...it.origin }, to: { ...it.dest }, ease: it.a.kind === 'dribble' ? easeCarry : easeInOut })
        glows.push({ id: it.actor, t0: it.t0, t1: it.t1 })
        if (it.a.kind === 'dribble' && it.ball) {
          const dir = unit(it.origin, it.dest, attackDir(it.actor))
          const b = it.ball
          if (b.open && b.open.type === 'held' && b.open.holder === it.actor) { b.open.dir = b.open.dir || dir; closeBall(b, it.t0) }
          b.segs.push({ type: 'carry', holder: it.actor, t0: it.t0, t1: it.t1, dir })
          b.open = { type: 'held', holder: it.actor, t0: it.t1, inDir: dir, turnFrom: dir }
        }
        trails.push({ kind: it.a.kind, n: it.a.n, badge: it.a.badge, team: byId.get(it.actor)?.team || 'a', t0: it.t0, t1: it.t1, from: { ...it.origin }, to: { ...it.dest }, fromPlayer: true, toPlayer: !!it.toPlayer, mover: it.actor })
        pos.set(it.actor, { ...it.dest })
      }
      if (it.meet) {
        moves.get(it.meet.id).push({ t0: it.meet.t0, t1: it.meet.t1, from: it.meet.from, to: it.meet.to, ease: easeInOut })
        pos.set(it.meet.id, { ...it.meet.to })
      }
      if (it.target) {
        trails.push({ kind: it.a.kind, n: it.a.n, badge: it.a.badge, team: (it.actor && byId.get(it.actor)?.team) || 'a', t0: it.t0, t1: it.t1, from: { ...it.from }, to: { ...it.target }, fromPlayer: !!it.actor, toPlayer: !!it.receiver, receiver: it.receiver })
      }
    }
    // a free ball is picked up by a player who arrives on it
    for (const b of balls) {
      if (!b.open || b.open.type !== 'free') continue
      for (const it of items) {
        if (!it.dest || !it.actor || ballOf(it.actor)) continue
        if (dist(it.dest, { x: b.open.x, y: b.open.y }) <= reach * 0.8) {
          const tp = Math.max(b.open.t0, it.t1)
          closeBall(b, tp)
          b.open = { type: 'held', holder: it.actor, t0: tp }
          break
        }
      }
    }
    if (prev) end = Math.max(end, prev.end)
    const t0s = items.map((it) => it.t0).filter((v) => v !== undefined)
    const stepStart = t0s.length ? Math.min(...t0s) : start
    steps.push({ n: Math.floor(n), sub: n % 1 !== 0, t0: stepStart, t1: end, arrows: items.map((it) => ({ kind: it.a.kind, actor: it.actor, receiver: it.receiver, toPlayer: it.toPlayer })) })
    prev = { start, end, ballAction: hasBall, movers }
  }
  const last = steps.length ? Math.max(...steps.map((s) => s.t1)) : INTRO
  const duration = last + END_HOLD
  for (const b of balls) {
    if (b.open) { if (b.open.type === 'held') b.open.dir = b.open.dir || b.open.inDir || attackDir(b.open.holder); b.open.t1 = duration + 1; b.segs.push(b.open); b.open = null }
    for (const s of b.segs) if (s.type === 'held' && !s.dir) s.dir = s.inDir || attackDir(s.holder)
  }
  return { spec, size, players, moves, glows, trails, steps, balls: balls.map((b) => b.segs), duration, end: last, speed: F }
}

/* ------------------------------------------------------------------ state at time t */

function playerAt(m, id, t) {
  const p = m.players.find((q) => q.id === id)
  let cur = { x: p.x0 ?? p.x, y: p.y0 ?? p.y }
  for (const s of m.moves.get(id) || []) {
    if (t >= s.t1) cur = { ...s.to }
    else if (t > s.t0) { const k = s.ease((t - s.t0) / (s.t1 - s.t0)); return { x: lerp(s.from.x, s.to.x, k), y: lerp(s.from.y, s.to.y, k), moving: true } }
    else break
  }
  return cur
}

/** One ball at time t, in meters (h = height above the grass). offM: distance from a holder's centre to the ball. */
function ballAt(m, segs, t, offM) {
  const held = (holder, dir, tt) => { const p = playerAt(m, holder, tt); return { x: p.x + dir.x * offM, y: p.y + dir.y * offM, h: 0 } }
  for (const s of segs) {
    if (t < s.t0 || t >= s.t1) continue
    if (s.type === 'held' || s.type === 'carry') {
      let dir = s.dir
      if (s.turnFrom && t < s.t0 + 0.3) {
        const e = easeInOut((t - s.t0) / 0.3)
        const x = lerp(s.turnFrom.x, s.dir.x, e), y = lerp(s.turnFrom.y, s.dir.y, e)
        const l = Math.hypot(x, y) || 1
        dir = { x: x / l, y: y / l }
      }
      const b = held(s.holder, dir, t)
      let alpha = 1
      if (s.fadeIn) alpha = clamp((t - s.t0) / 0.25, 0, 1)
      if (s.fadeOut) alpha = Math.min(alpha, clamp((s.t1 - t) / 0.25, 0, 1))
      return { ...b, alpha }
    }
    if (s.type === 'free') {
      let alpha = 1
      if (s.fadeOut) alpha = clamp((s.t1 - t) / 0.25, 0, 1)
      return { x: s.x, y: s.y, h: 0, alpha }
    }
    if (s.type === 'flight') {
      const k = (t - s.t0) / (s.t1 - s.t0)
      const next = s.next
      const fromDir = s.from.holder ? ((s.prevHold && s.prevHold.dir) || unitv(s.from, s.to)) : null
      const a = s.from.holder ? held(s.from.holder, fromDir, s.t0) : { x: s.from.x, y: s.from.y }
      const b = s.to.holder && next && next.type === 'held' ? held(s.to.holder, next.dir || next.inDir || unitv(s.from, s.to), s.t1) : { x: s.to.x, y: s.to.y }
      const e = s.kind === 'shot' ? k : easePass(k)
      return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), h: 4 * s.peak * k * (1 - k), alpha: 1, flying: true }
    }
  }
  return null
}
function unitv(a, b) { const d = Math.hypot(b.x - a.x, b.y - a.y) || 1; return { x: (b.x - a.x) / d, y: (b.y - a.y) / d } }

/* ------------------------------------------------------------------ projection */

/**
 * Perspective camera over the area. Long side across the screen; a half or a third of a pitch is
 * turned so the goal comes towards the camera.
 */
export function layoutMotion(spec, W, H, opts = {}) {
  const { w, h } = viewSize(spec)
  const rot = spec.view === 'half' || spec.view === 'third'
  const U = rot ? h : w, V = rot ? w : h
  const toUV = rot ? (x, y) => [h - y, x] : (x, y) => [x, y]
  const r = 0.72 // far edge width / near edge width
  const isGrid = spec.view === 'grid'
  const mU = Math.max(U * 0.035, 1.2), mV = Math.max(V * 0.05, 1.2) + ((spec.goals || []).length || !isGrid ? 1.2 : 0)
  const u0 = -mU, u1 = U + mU, v0 = -mV, v1 = V + mV
  const cap = opts.caption ? H * 0.115 : 0
  const padX = W * 0.035, padTop = H * 0.075, padBot = H * 0.06 + cap
  // how flat the depth looks: enough perspective to read as a pitch, flatter when that fills the frame better
  const Sw = (W - padX * 2) / (u1 - u0)
  const q = opts.depth ?? clamp((H - padTop - padBot) / ((v1 - v0) * Sw), 0.6, 0.76)
  const S = Math.min(Sw, (H - padTop - padBot) / ((v1 - v0) * q))
  const depthPx = (v1 - v0) * S * q
  const C = depthPx / (1 - r)
  const yNear = H - padBot - Math.max(0, (H - padTop - padBot - depthPx) / 2)
  const horizon = yNear - C
  const cx = W / 2, uc = (u0 + u1) / 2
  const zOf = (v) => 1 / r + (1 - 1 / r) * ((v - v0) / (v1 - v0))
  const kh = 0.82
  /** spec meters (+ height in meters) to screen pixels; k = scale against the near edge */
  const project = (x, y, hm = 0) => {
    const [u, v] = toUV(x, y)
    const z = zOf(v)
    const k = 1 / z
    return { x: cx + (u - uc) * S * k, y: horizon + C * k - hm * S * k * kh, k }
  }
  // sizes: one unit per 540 px of height, never too small on a small card
  const un = H / 540
  const ub = Math.max(un, opts.minUnit ?? 0.62)
  const rm = isGrid ? 1.0 : 1.7
  const R = clamp(S * rm, 17 * ub, 27 * ub)
  const br = Math.max(4.2 * ub, R * 0.4)
  const offM = (R * 0.92 + br * 0.35) / S
  return { W, H, S, R, br, un, ub, offM, project, rot, toUV, U, V, u0, u1, v0, v1, w, h, cap, zOf }
}

/* ------------------------------------------------------------------ drawing */

function poly(ctx, pts) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))) }

function groundLine(ctx, L, pts) {
  const P = pts.map(([x, y]) => L.project(x, y))
  poly(ctx, P)
}

function circlePts(cx, cy, r, a0 = 0, a1 = Math.PI * 2, n = 48) {
  const out = []
  for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]) }
  return out
}

function drawTurf(ctx, L, P) {
  ctx.fillStyle = P.surround
  ctx.fillRect(0, 0, L.W, L.H)
  // stripes across the depth, wider than the frame so the grass fills it
  const span = L.v1 - L.v0
  const band = L.V >= 50 ? 5.5 : Math.max(2, L.V / 7)
  const uA = L.u0 - (L.u1 - L.u0) * 1.2, uB = L.u1 + (L.u1 - L.u0) * 1.2
  const vA = L.v0 - span * 1.4, vB = L.v1 + span * 0.55
  const fromUV = L.rot ? (u, v) => [v, L.h - u] : (u, v) => [u, v]
  const start = Math.floor(vA / band) * band
  for (let v = start, i = Math.floor(vA / band); v < vB; v += band, i++) {
    ctx.fillStyle = i % 2 === 0 ? P.grass1 : P.grass2
    const q = [fromUV(uA, v), fromUV(uB, v), fromUV(uB, v + band), fromUV(uA, v + band)].map(([x, y]) => L.project(x, y))
    poly(ctx, q); ctx.closePath(); ctx.fill()
  }
  // a soft light from the top
  const g = ctx.createLinearGradient(0, 0, 0, L.H)
  g.addColorStop(0, 'rgba(255,255,240,0.07)')
  g.addColorStop(0.5, 'rgba(255,255,240,0)')
  g.addColorStop(1, 'rgba(0,20,0,0.10)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, L.W, L.H)
}

function drawMarkings(ctx, L, spec, P) {
  ctx.save()
  ctx.strokeStyle = P.line
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.lineWidth = Math.max(1.4, 2.1 * L.ub)
  const S = (pts) => { groundLine(ctx, L, pts); ctx.stroke() }
  const rect = (x, y, w, h) => S([[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]])
  const Hh = 68
  const box = (gx, dir) => {
    const bx = dir < 0 ? gx - 16.5 : gx
    rect(bx, (Hh - 40.32) / 2, 16.5, 40.32)
    const sx = dir < 0 ? gx - 5.5 : gx
    rect(sx, (Hh - 18.32) / 2, 5.5, 18.32)
    const spot = gx + dir * 11
    dot(spot, Hh / 2)
    const edge = gx + dir * 16.5
    const dx = Math.abs(edge - spot)
    const a = Math.acos(dx / 9.15)
    const base = dir < 0 ? Math.PI : 0
    S(circlePts(spot, Hh / 2, 9.15, base - a, base + a, 24))
  }
  const dot = (x, y) => { const p = L.project(x, y); ctx.save(); ctx.fillStyle = P.line; ctx.beginPath(); ctx.ellipse(p.x, p.y, 2.6 * L.ub * p.k, 1.6 * L.ub * p.k, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore() }
  if (spec.view === 'grid') {
    ctx.strokeStyle = P.gridLine
    ctx.lineWidth = Math.max(1.2, 1.7 * L.ub)
    rect(0, 0, L.w, L.h)
  } else if (spec.view === 'full') {
    rect(0, 0, 105, Hh)
    S([[52.5, 0], [52.5, Hh]])
    S(circlePts(52.5, Hh / 2, 9.15))
    dot(52.5, Hh / 2)
    box(0, 1); box(105, -1)
  } else if (spec.view === 'half') {
    rect(0, 0, 52.5, Hh)
    S(circlePts(0, Hh / 2, 9.15, -Math.PI / 2, Math.PI / 2, 24))
    box(52.5, -1)
  } else if (spec.view === 'third') {
    rect(0, 0, 35, Hh)
    box(35, -1)
  }
  ctx.restore()
}

function goalList(spec) {
  const out = []
  for (const g of spec.goals || []) {
    const big = g.size === 'full'
    const normal = { left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] }[g.side] || [1, 0]
    out.push({ x: g.x, y: g.y, nx: normal[0], ny: normal[1], w: big ? 7.32 : 3, h: big ? 2.44 : 1.05, d: big ? 1.6 : 0.9 })
  }
  if (spec.view === 'full') { out.push({ x: 0, y: 34, nx: -1, ny: 0, w: 7.32, h: 2.44, d: 1.8 }); out.push({ x: 105, y: 34, nx: 1, ny: 0, w: 7.32, h: 2.44, d: 1.8 }) }
  if (spec.view === 'half') out.push({ x: 52.5, y: 34, nx: 1, ny: 0, w: 7.32, h: 2.44, d: 1.8 })
  if (spec.view === 'third') out.push({ x: 35, y: 34, nx: 1, ny: 0, w: 7.32, h: 2.44, d: 1.8 })
  return out
}

function drawGoal(ctx, L, g, P) {
  const ax = -g.ny, ay = g.nx // along the goal line
  const hw = g.w / 2
  const p1 = [g.x + ax * hw, g.y + ay * hw], p2 = [g.x - ax * hw, g.y - ay * hw]
  const b1 = [p1[0] + g.nx * g.d, p1[1] + g.ny * g.d], b2 = [p2[0] + g.nx * g.d, p2[1] + g.ny * g.d]
  const pr = (pt, hm = 0) => L.project(pt[0], pt[1], hm)
  ctx.save()
  // net: back, roof and sides, light
  ctx.fillStyle = 'rgba(255,255,255,0.16)'
  ctx.strokeStyle = 'rgba(255,255,255,0.42)'
  ctx.lineWidth = Math.max(0.8, 1 * L.ub)
  const faces = [
    [pr(b1), pr(b2), pr(b2, g.h * 0.85), pr(b1, g.h * 0.85)],
    [pr(p1, g.h), pr(p2, g.h), pr(b2, g.h * 0.85), pr(b1, g.h * 0.85)],
    [pr(p1), pr(b1), pr(b1, g.h * 0.85), pr(p1, g.h)],
    [pr(p2), pr(b2), pr(b2, g.h * 0.85), pr(p2, g.h)],
  ]
  for (const f of faces) { poly(ctx, f); ctx.closePath(); ctx.fill() }
  // net mesh on the back
  for (let i = 1; i < 6; i++) {
    const t = i / 6
    const a = [lerp(b1[0], b2[0], t), lerp(b1[1], b2[1], t)]
    poly(ctx, [pr(a), pr(a, g.h * 0.85)]); ctx.stroke()
  }
  for (let j = 1; j < 3; j++) { const hh = (g.h * 0.85 * j) / 3; poly(ctx, [pr(b1, hh), pr(b2, hh)]); ctx.stroke() }
  // frame
  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = Math.max(1.8, 3 * L.ub * pr(p1).k)
  ctx.lineCap = 'round'
  poly(ctx, [pr(p1), pr(p1, g.h), pr(p2, g.h), pr(p2)]); ctx.stroke()
  ctx.restore()
}

function drawCone(ctx, L, x, y, P) {
  const p = L.project(x, y)
  const s = 5.2 * L.ub * p.k
  ctx.save()
  ctx.fillStyle = P.shadow
  ctx.beginPath(); ctx.ellipse(p.x + s * 0.3, p.y + s * 0.15, s * 1.1, s * 0.42, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = P.cone
  ctx.beginPath(); ctx.moveTo(p.x - s, p.y); ctx.lineTo(p.x, p.y - s * 2.1); ctx.lineTo(p.x + s, p.y); ctx.closePath(); ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.beginPath(); ctx.moveTo(p.x - s * 0.55, p.y - s * 0.95); ctx.lineTo(p.x + s * 0.55, p.y - s * 0.95); ctx.lineTo(p.x + s * 0.42, p.y - s * 1.25); ctx.lineTo(p.x - s * 0.42, p.y - s * 1.25); ctx.closePath(); ctx.fill()
  ctx.restore()
}

function teamColors(team, P) {
  const t = { a: [P.a, P.aRim, P.aText, P.aTrail], b: [P.b, P.bRim, P.bText, P.bTrail], n: [P.n, P.nRim, P.nText, P.nTrail], gk: [P.gk, P.gkRim, P.gkText, P.aTrail], gkb: [P.gkb, P.gkbRim, P.gkbText, P.bTrail] }
  return t[team] || t.a
}

function wavePts(from, to, ampM, waveM) {
  const d = dist(from, to)
  if (d < 0.5) return [[from.x, from.y], [to.x, to.y]]
  const ux = (to.x - from.x) / d, uy = (to.y - from.y) / d
  const nx = -uy, ny = ux
  const straight = Math.min(d * 0.2, 2.2)
  const wl = d - straight
  const n = Math.max(2, Math.round(wl / waveM))
  const steps = n * 10
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const f = i / steps
    const off = Math.sin(f * n * Math.PI * 2) * ampM * Math.min(1, f * 6, (1 - f) * 6)
    pts.push([from.x + ux * wl * f + nx * off, from.y + uy * wl * f + ny * off])
  }
  pts.push([to.x, to.y])
  return pts
}

/** Cuts a projected polyline: drops `a` px at the start and `b` px at the end, keeps the share `f` (0..1) of what is left. */
function trimScreen(P, a, b, f = 1) {
  const segLen = []
  let total = 0
  for (let i = 1; i < P.length; i++) { const l = Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y); segLen.push(l); total += l }
  const s0 = Math.min(a, total * 0.4)
  const s1 = Math.max(s0, total - Math.min(b, total * 0.4))
  const sEnd = s0 + (s1 - s0) * clamp(f, 0, 1)
  const at = (s) => {
    let acc = 0
    for (let i = 0; i < segLen.length; i++) {
      if (acc + segLen[i] >= s) { const k = segLen[i] ? (s - acc) / segLen[i] : 0; return { i, p: { x: lerp(P[i].x, P[i + 1].x, k), y: lerp(P[i].y, P[i + 1].y, k) } } }
      acc += segLen[i]
    }
    return { i: P.length - 2, p: P[P.length - 1] }
  }
  const A = at(s0), B = at(sEnd)
  const out = [A.p]
  for (let i = A.i + 1; i <= B.i; i++) out.push(P[i])
  out.push(B.p)
  return { pts: out, total }
}

function arrowHead(ctx, pts, size, color) {
  if (pts.length < 2) return
  const b = pts[pts.length - 1]
  let a = pts[pts.length - 2]
  for (let i = pts.length - 2; i >= 0; i--) { if (Math.hypot(b.x - pts[i].x, b.y - pts[i].y) > size * 0.8) { a = pts[i]; break } }
  const ang = Math.atan2(b.y - a.y, b.x - a.x)
  ctx.save()
  ctx.fillStyle = color
  ctx.translate(b.x, b.y)
  ctx.rotate(ang)
  ctx.beginPath(); ctx.moveTo(size * 0.35, 0); ctx.lineTo(-size * 0.85, size * 0.62); ctx.lineTo(-size * 0.85, -size * 0.62); ctx.closePath(); ctx.fill()
  ctx.restore()
}

function drawTrail(ctx, L, m, tr, t, P, focus) {
  if (t < tr.t0) return null
  const f = clamp((t - tr.t0) / (tr.t1 - tr.t0), 0, 1)
  let groundPts
  if (tr.kind === 'dribble') groundPts = wavePts(tr.from, tr.to, Math.max(0.45, L.R / L.S * 0.42), Math.max(1.5, L.R / L.S * 1.6))
  else groundPts = [[tr.from.x, tr.from.y], [tr.to.x, tr.to.y]]
  const Pp = groundPts.map(([x, y]) => L.project(x, y))
  const k0 = Pp[0].k, k1 = Pp[Pp.length - 1].k
  // the trail follows the ball or the runner
  let progress = f
  if (tr.kind === 'pass' || tr.kind === 'shot') progress = tr.kind === 'shot' ? f : easePass(f)
  else progress = tr.kind === 'dribble' ? easeCarry(f) : easeInOut(f)
  const gapA = tr.fromPlayer ? L.R * k0 * 1.05 : 2
  const gapB = tr.toPlayer ? L.R * k1 * 1.2 : (tr.kind === 'shot' ? 0 : 3)
  const { pts } = trimScreen(Pp, gapA, gapB, progress)
  const [, , , trailColor] = teamColors(tr.team, P)
  const alpha = focus ? 1 : 0.78
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  const lw = 2.6 * L.ub
  let color = P.pass
  // a thin dark under-stroke keeps light lines readable on bright grass
  const stroke = (w, c, dash) => { poly(ctx, pts); ctx.setLineDash(dash || []); ctx.lineWidth = w; ctx.strokeStyle = c; ctx.stroke() }
  if (tr.kind === 'pass') { color = P.pass; stroke(lw + 2.2 * L.ub, 'rgba(10,30,14,0.28)'); stroke(lw, color) }
  else if (tr.kind === 'run') { color = trailColor; stroke(lw + 2 * L.ub, 'rgba(10,30,14,0.22)', [7 * L.ub, 6 * L.ub]); stroke(lw, color, [7 * L.ub, 6 * L.ub]) }
  else if (tr.kind === 'press') { color = tr.team === 'a' || tr.team === 'gk' ? P.aTrail : P.bTrail; stroke(lw + 2.4 * L.ub, 'rgba(10,30,14,0.22)', [2 * L.ub, 5.5 * L.ub]); stroke(lw + 0.6 * L.ub, color, [2 * L.ub, 5.5 * L.ub]) }
  else if (tr.kind === 'dribble') { color = trailColor; stroke(lw + 1.8 * L.ub, 'rgba(10,30,14,0.24)'); stroke(lw * 0.9, color) }
  else if (tr.kind === 'shot') { color = P.shot; stroke(lw * 1.9 + 2 * L.ub, 'rgba(10,30,14,0.26)'); stroke(lw * 1.9, color) }
  ctx.setLineDash([])
  if (f > 0.04) arrowHead(ctx, pts, (tr.kind === 'shot' ? 8.5 : 7.2) * L.ub * Math.max(0.8, k1), color)
  ctx.restore()
  // where the number badge goes: middle of the whole path, pushed to the side
  const mid = Pp[Math.floor(Pp.length / 2)]
  const a = Pp[0], b = Pp[Pp.length - 1]
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
  const off = 13 * L.ub
  if (!tr.badge) return null
  return { x: (Pp.length > 2 ? mid.x : (a.x + b.x) / 2) + ((b.y - a.y) / len) * off, y: (Pp.length > 2 ? mid.y : (a.y + b.y) / 2) - ((b.x - a.x) / len) * off, n: tr.n, t0: tr.t0 }
}

function drawBadge(ctx, L, b, t, P) {
  const pop = clamp((t - b.t0) / 0.22, 0, 1)
  const s = 0.6 + 0.4 * (pop < 1 ? 1 + Math.sin(pop * Math.PI) * 0.18 : 1)
  const r = 10.8 * L.ub * s
  ctx.save()
  ctx.globalAlpha = pop
  ctx.fillStyle = 'rgba(10,30,14,0.3)'
  ctx.beginPath(); ctx.arc(b.x, b.y + 1.2 * L.ub, r, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = P.badge
  ctx.strokeStyle = P.ink
  ctx.lineWidth = 1.3 * L.ub
  ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  ctx.fillStyle = P.ink
  ctx.font = `800 ${(13 * L.ub * s).toFixed(2)}px ${L.font}`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(String(b.n), b.x, b.y + 0.6 * L.ub)
  ctx.restore()
}

function drawPlayer(ctx, L, p, at, glow, P) {
  const pp = L.project(at.x, at.y)
  const k = pp.k
  const R = L.R * k
  const [fill, rim, text] = teamColors(p.team, P)
  const lift = R * 0.32
  ctx.save()
  // shadow on the grass
  ctx.fillStyle = P.shadow
  ctx.beginPath(); ctx.ellipse(pp.x + R * 0.18, pp.y + R * 0.1, R * 1.08, R * 0.5, 0, 0, Math.PI * 2); ctx.fill()
  if (glow > 0) {
    ctx.globalAlpha = glow
    ctx.strokeStyle = p.team === 'b' || p.team === 'gkb' ? '#FFD2C4' : '#FFF4C2'
    ctx.lineWidth = 3 * L.ub
    ctx.beginPath(); ctx.ellipse(pp.x, pp.y, R * 1.45, R * 0.72, 0, 0, Math.PI * 2); ctx.stroke()
    ctx.globalAlpha = 1
  }
  // the puck: side then top
  const cy = pp.y - lift
  ctx.fillStyle = shade(fill, -0.28)
  ctx.beginPath(); ctx.ellipse(pp.x, cy + R * 0.2, R, R * 0.8, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = fill
  ctx.strokeStyle = rim
  ctx.lineWidth = Math.max(1.4, 2.2 * L.ub * k)
  ctx.beginPath(); ctx.ellipse(pp.x, cy, R, R * 0.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  if (p.label) {
    const lab = String(p.label)
    const fs = (lab.length > 2 ? R * 0.72 : lab.length === 2 ? R * 0.86 : R * 1.0)
    ctx.fillStyle = text
    ctx.font = `800 ${fs.toFixed(2)}px ${L.font}`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(lab, pp.x, cy + fs * 0.05)
  }
  ctx.restore()
}

function shade(hex, amt) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const f = (c) => Math.round(clamp(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt, 0, 255))
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`
}

function drawBall(ctx, L, b, P) {
  if (!b || b.alpha <= 0) return
  const g = L.project(b.x, b.y, 0)
  const top = L.project(b.x, b.y, b.h)
  const r = L.br * g.k * (1 + b.h * 0.05)
  ctx.save()
  ctx.globalAlpha = b.alpha
  ctx.fillStyle = 'rgba(10,30,14,0.38)'
  const sh = 1 / (1 + b.h * 0.25)
  ctx.beginPath(); ctx.ellipse(g.x + r * 0.2, g.y + r * 0.25, r * 1.05 * sh, r * 0.45 * sh, 0, 0, Math.PI * 2); ctx.fill()
  const y = top.y - r * 0.75
  ctx.fillStyle = '#FFFFFF'
  ctx.strokeStyle = P.ink
  ctx.lineWidth = Math.max(1, 1.3 * L.ub * g.k)
  ctx.beginPath(); ctx.arc(top.x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  ctx.fillStyle = P.ink
  ctx.beginPath()
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * Math.PI * 2) / 5; const px = top.x + Math.cos(a) * r * 0.42, py = y + Math.sin(a) * r * 0.42; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py) }
  ctx.closePath(); ctx.fill()
  ctx.restore()
}

function drawLabel(ctx, L, x, y, text, P) {
  const p = L.project(x, y)
  const fs = 15 * L.ub * Math.sqrt(p.k)
  ctx.save()
  ctx.font = `700 ${fs.toFixed(2)}px ${L.font}`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const w = ctx.measureText(text).width
  const padX = 6 * L.ub, h = fs * 1.5
  ctx.fillStyle = 'rgba(16,40,22,0.62)'
  roundRect(ctx, p.x - w / 2 - padX, p.y - h / 2, w + padX * 2, h, h / 2)
  ctx.fill()
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText(text, p.x, p.y + fs * 0.04)
  ctx.restore()
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath()
}

/**
 * Draws the frame at time t (seconds; t >= m.duration shows the finished diagram).
 * opts: width, height, font, lang, labelText(text) -> translated label, caption (draw the step caption bar, for MP4s),
 *       title (small tag at the top left, for MP4s), palette, minUnit
 */
export function drawMotion(ctx, m, t, opts = {}) {
  const P = { ...MOTION_PALETTE, ...(opts.palette || {}) }
  const W = opts.width, H = opts.height
  const L = opts.layout || layoutMotion(m.spec, W, H, opts)
  L.font = opts.font || "'Archivo Variable', Archivo, Inter, 'Helvetica Neue', Arial, sans-serif"
  const spec = m.spec
  t = clamp(t, 0, m.duration)
  ctx.save()
  drawTurf(ctx, L, P)
  // zones under everything
  const toneFill = { a: P.zoneA, b: P.zoneB, n: P.zoneN, soft: P.zoneSoft }
  for (const z of spec.zones || []) {
    ctx.fillStyle = toneFill[z.tone] || P.zoneSoft
    groundLine(ctx, L, [[z.x, z.y], [z.x + z.w, z.y], [z.x + z.w, z.y + z.h], [z.x, z.y + z.h]]); ctx.closePath(); ctx.fill()
  }
  drawMarkings(ctx, L, spec, P)
  // goals behind the line first (far side), the rest after the players' level is fine at this scale
  const goals = goalList(spec)
  for (const g of goals) drawGoal(ctx, L, g, P)
  const cones = spec.cones || (spec.view === 'grid' ? [[0, 0], [L.w, 0], [0, L.h], [L.w, L.h]] : [])
  const lab = opts.labelText || ((s) => s)
  for (const z of spec.zones || []) if (z.label) {
    const p = L.project(z.x + 0.6, z.y + 0.6)
    const fs = 12 * L.ub * Math.sqrt(p.k)
    ctx.save(); ctx.font = `700 ${fs.toFixed(2)}px ${L.font}`; ctx.textAlign = L.rot ? 'right' : 'left'; ctx.textBaseline = 'top'
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillText(lab(z.label), p.x, p.y); ctx.restore()
  }
  // trails: the current step stands out
  const cur = m.steps.find((s) => t >= s.t0 && t <= s.t1 + 0.4)
  const badges = []
  for (const tr of m.trails) {
    const b = drawTrail(ctx, L, m, tr, t, P, cur ? tr.n === cur.n : t >= m.end)
    if (b) badges.push(b)
  }
  // cones, players and ball, far to near
  const items = []
  for (const [cx, cy] of cones) items.push({ v: L.toUV(cx, cy)[1], draw: () => drawCone(ctx, L, cx, cy, P) })
  for (const p of m.players) {
    const at = playerAt(m, p.id, t)
    let glow = 0
    for (const g of m.glows) if (g.id === p.id && t >= g.t0 && t <= g.t1) glow = Math.max(glow, Math.min(1, (t - g.t0) / 0.15, (g.t1 - t) / 0.2 + 0.2))
    items.push({ v: L.toUV(at.x, at.y)[1], draw: () => drawPlayer(ctx, L, p, at, clamp(glow, 0, 1) * 0.9, P) })
  }
  for (const segs of m.balls) {
    const ball = ballAt(m, segs, t, L.offM)
    if (ball) items.push({ v: L.toUV(ball.x, ball.y)[1] + 0.01, draw: () => drawBall(ctx, L, ball, P) })
  }
  items.sort((a, b) => a.v - b.v)
  for (const b of badges) drawBadge(ctx, L, b, t, P)
  for (const it of items) it.draw()
  for (const l of spec.labels || []) drawLabel(ctx, L, l.x, l.y, lab(l.text), P)
  if (opts.title) drawTitle(ctx, L, opts.title, P)
  if (opts.caption) drawCaption(ctx, L, m, t, opts, P)
  ctx.restore()
  return L
}

function drawTitle(ctx, L, title, P) {
  const fs = 15 * L.un
  ctx.save()
  ctx.font = `700 ${fs.toFixed(2)}px ${L.font}`
  ctx.textBaseline = 'middle'
  const w = ctx.measureText(title).width
  const x = 18 * L.un, y = 16 * L.un, h = fs * 1.9
  ctx.fillStyle = 'rgba(16,40,22,0.72)'
  roundRect(ctx, x, y, w + 22 * L.un, h, h / 2); ctx.fill()
  ctx.fillStyle = '#FBF7EE'
  ctx.fillText(title, x + 11 * L.un, y + h / 2 + fs * 0.04)
  ctx.restore()
}

function drawCaption(ctx, L, m, t, opts, P) {
  const steps = motionSteps(m, opts.lang || 'fr', opts)
  const cur = [...steps].reverse().find((s) => t >= s.t0 - 0.05)
  const H = L.H, W = L.W
  const barH = L.cap
  ctx.save()
  ctx.fillStyle = 'rgba(14,34,19,0.86)'
  ctx.fillRect(0, H - barH, W, barH)
  const fs = barH * 0.36
  const cx = 26 * L.un + barH * 0.3
  const cy = H - barH / 2
  // progress line
  ctx.fillStyle = 'rgba(251,247,238,0.18)'
  ctx.fillRect(0, H - barH, W, 3 * L.un)
  ctx.fillStyle = '#E9B23A'
  ctx.fillRect(0, H - barH, W * clamp(t / m.duration, 0, 1), 3 * L.un)
  if (cur && t < m.end + 0.6) {
    ctx.fillStyle = P.badge
    ctx.beginPath(); ctx.arc(cx, cy, barH * 0.27, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = P.ink
    ctx.font = `800 ${(fs * 0.95).toFixed(2)}px ${L.font}`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(String(cur.n), cx, cy + fs * 0.04)
    ctx.textAlign = 'left'
    ctx.fillStyle = '#FBF7EE'
    ctx.font = `650 ${fs.toFixed(2)}px ${L.font}`
    ctx.fillText(fitText(ctx, cur.text, W - cx - barH * 0.5 - 24 * L.un), cx + barH * 0.42, cy + fs * 0.04)
  } else {
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(251,247,238,0.85)'
    ctx.font = `650 ${fs.toFixed(2)}px ${L.font}`
    const txt = t < (steps[0]?.t0 ?? 1) ? (opts.lang === 'en' ? 'Starting positions' : 'Placement de départ') : (opts.lang === 'en' ? 'The whole move' : 'Le mouvement complet')
    ctx.fillText(txt, 26 * L.un, cy + fs * 0.04)
  }
  ctx.restore()
}

function fitText(ctx, s, max) {
  if (ctx.measureText(s).width <= max) return s
  let t = s
  while (t.length > 4 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1)
  return t.trimEnd() + '…'
}

/* ------------------------------------------------------------------ captions */

const WORDS = {
  fr: { pass: 'Passe', run: 'Appel', dribble: 'Conduite', shot: 'Frappe', press: 'Pression', space: 'espace', a: 'joueur', b: 'adversaire', n: 'joker', gk: 'gardien', gkb: 'gardien', goal: 'but' },
  en: { pass: 'Pass', run: 'Run', dribble: 'Carry', shot: 'Shot', press: 'Press', space: 'space', a: 'player', b: 'opponent', n: 'joker', gk: 'goalkeeper', gkb: 'goalkeeper', goal: 'goal' },
}

/** One caption per numbered step: "Passe : A → B", "Appel : C"… Identical parts are counted (×2). */
export function motionSteps(m, lang = 'fr', opts = {}) {
  const W = WORDS[lang] || WORDS.fr
  const sep = lang === 'fr' ? ' : ' : ': '
  // only labelled players are named: "Passe : A → B"; unlabelled ones just give "Passe"
  const name = (id) => {
    const p = id && m.players.find((q) => q.id === id)
    return p && p.label ? String(p.label) : ''
  }
  return m.steps.map((s) => {
    const parts = []
    for (const a of s.arrows) {
      const who = name(a.actor)
      const to = a.kind === 'pass' ? name(a.receiver) : a.kind === 'press' ? name(a.toPlayer) : ''
      const word = W[a.kind]
      let txt = word
      if (who && to) txt = `${word}${sep}${who} → ${to}`
      else if (who) txt = `${word}${sep}${who}`
      else if (to) txt = `${word} → ${to}`
      parts.push(txt)
    }
    const counted = []
    for (const p of parts) { const c = counted.find((x) => x.p === p); if (c) c.c++; else counted.push({ p, c: 1 }) }
    return { n: s.n, sub: !!s.sub, t0: s.t0, t1: s.t1, text: counted.map((x) => (x.c > 1 ? `${x.p} ×${x.c}` : x.p)).join('  ·  ') }
  })
}

/** True when the diagram has something to animate. */
export function hasMotion(spec) {
  return !!(spec && (spec.arrows || []).some((a) => ['pass', 'run', 'dribble', 'shot', 'press'].includes(a.kind)))
}
