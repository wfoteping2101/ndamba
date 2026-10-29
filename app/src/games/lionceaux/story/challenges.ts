// The football challenges of the chapters. The player performs what the book says happens; the
// book's outcome is locked (a lost ball, a missed penalty and a lost match are scripted, never a
// game over). A wrong choice is not played: it gets a hint and the moment waits for the right one.
import { OVERLAY_COLORS } from '../../engine/render/overlays'
import type { Input } from '../../engine/input/input'
import { dist2, type V2 } from '../../engine/sim/math'
import type { Player } from '../../engine/sim/types'
import { sfx } from '../../shared/audio'
import { Cancelled } from './choreo'
import type { StorySession } from './session'
import type { ChallengeSpec, Line } from './types'

export type ControlKey = 'talk' | 'dribble' | 'pass' | 'shoot' | 'touch' | 'diveL' | 'diveR' | 'next'

export interface Challenge {
  controls: ControlKey[]
  stick: boolean
  run(): Promise<void>
  tick?(dt: number): void
  frame?(dt: number, input: Input): void
  /** a tap on the picture; true when used */
  pointer?(e: PointerEvent): boolean
  /** a touch button that is not a standard action */
  press?(key: ControlKey): void
  dispose(): void
}

export function makeChallenge(spec: ChallengeSpec, s: StorySession): Challenge {
  switch (spec.type) {
    case 'dribble': return new DribbleRun(spec, s)
    case 'oneTouch': return new OneTouch(spec, s)
    case 'juggle': return new Juggle(spec, s)
    case 'run': return new DecoyRun(spec, s)
    case 'penalty': return new Penalty(spec, s)
    case 'choose': return new Choose(spec, s)
    case 'drive': return new Drive(spec, s)
  }
}

const norm = (x: number, y: number) => { const l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l } }

/** Show a line without holding the game (commentary during play). */
function flash(s: StorySession, line: Line | undefined) { if (line) s.say([line]).catch(() => {}) }

/* ======================================================================== dribble */

/**
 * Carry the ball past defenders, one after the other: when a defender comes close, the dribble
 * button sends the ball past him (hook, nutmeg, spin: the moves Radio names). Too early or too
 * late and he pokes it away; the carrier gets it back and tries again. Then the book's ending.
 */
class DribbleRun implements Challenge {
  controls: ControlKey[] = ['dribble']
  stick = true
  private beaten = 0
  private state: 'play' | 'end' = 'play'
  private moveT = 0
  private done!: () => void
  private stunned = new Map<string, number>()
  private warned = false

  constructor(private spec: Extract<ChallengeSpec, { type: 'dribble' }>, private s: StorySession) {}

  get w() { return this.s.world() }
  get carrier() { return this.w.get(this.spec.carrier)! }
  private next(): Player | null { const id = this.spec.defenders[this.beaten]; return id ? this.w.get(id) ?? null : null }

  run() {
    const c = this.carrier
    c.controlled = true; c.wantsBall = true; c.meta.scripted = false
    if (this.w.ball.owner !== c.id) this.s.choreo.give(c.id)
    this.s.camera({ kind: 'follow', who: c.id, dist: 6.5, height: 3.6 }, true)
    this.s.prompt('play.dribble', { n: 1, total: this.spec.defenders.length })
    if (this.spec.intro) this.s.say(this.spec.intro).catch(() => {})
    return new Promise<void>((r) => { this.done = r })
  }

  tick(dt: number) {
    const w = this.w, c = this.carrier
    for (const [id, t] of this.stunned) { if (t - dt <= 0) this.stunned.delete(id); else this.stunned.set(id, t - dt) }
    // defenders: the next one steps up, the beaten ones turn round too late
    this.spec.defenders.forEach((id, i) => {
      const d = w.get(id)
      if (!d) return
      d.meta.scripted = true
      if (this.stunned.has(id)) { d.target = null; return }
      if (i < this.beaten) { d.target = { x: d.pos.x + (c.pos.x - d.pos.x) * 0.3, y: d.pos.y + (c.pos.y - d.pos.y) * 0.3 }; d.speedMode = 0.25; d.faceTarget = c.pos; return }
      if (i === this.beaten) {
        const dd = dist2(d.pos, c.pos)
        // he steps up and jockeys a metre and a half in front of the carrier, then waits for him
        if (dd < 9) {
          const jx = c.pos.x + this.spec.dir * 1.5, jy = c.pos.y + (d.pos.y - c.pos.y) * 0.3
          d.target = { x: jx, y: jy }; d.speedMode = dd < 3 ? 0.3 : 0.55; d.faceTarget = w.ball2()
        } else d.target = null
        // too close without a dribble: he pokes the ball away
        if (dd < 0.95 && w.ball.owner === c.id && this.moveT <= 0) this.poke(d)
      } else d.target = null
    })
    if (this.moveT > 0) this.moveT -= dt
    // the ending the book wrote
    if (this.state === 'play' && this.beaten >= this.spec.defenders.length) this.finish()
  }

  private poke(d: Player) {
    const w = this.w, c = this.carrier
    const side = Math.sign((w.ball.pos.y - d.pos.y) || 1)
    w.ball.owner = null
    w.ball.vel = { x: (c.pos.x - d.pos.x) * 0.8, y: side * 2.2, z: 0 }
    d.anim = 'tackle'; d.animT = 0
    this.stunned.set(d.id, 0.9)
    sfx('touch')
    if (!this.warned) { this.s.hint('play.dribbleHint'); this.warned = true }
  }

  frame(_dt: number, input: Input) {
    if (this.state !== 'play') return
    const w = this.w, c = this.carrier
    const dir = this.s.stickDir()
    const fwd = { x: this.spec.dir, y: 0 }
    const go = dir ?? fwd
    if (w.ball.owner === c.id) {
      c.target = { x: c.pos.x + go.x * 3, y: c.pos.y + go.y * 3 }
      c.speedMode = dir ? (input.held('sprint') ? 0.85 : 0.62) : 0.4
    } else {
      // the ball got away: go and get it
      c.target = w.ball2(); c.speedMode = 0.9
      if (!w.ball.owner && dist2(c.pos, w.ball2()) < 0.8) this.s.choreo.give(c.id)
    }
    const d = this.next()
    const o = this.s.st.view.overlays
    o.beginMarkers()
    o.marker('me', c.pos, OVERLAY_COLORS.gold, { radius: 0.75, fill: 0.2 })
    if (d) {
      const dd = dist2(d.pos, c.pos)
      const ready = dd < 3.2 && dd > 0.8
      o.marker('def', d.pos, ready ? OVERLAY_COLORS.gold : OVERLAY_COLORS.b, { radius: ready ? 0.9 : 0.65, opacity: ready ? 0.95 : 0.6 })
      if ((input.pressed('skill') || (this.s.autoplay && ready && dd < 2.2)) && w.ball.owner === c.id && this.moveT <= 0) {
        if (ready) this.beat(d)
        else if (dd >= 3.2) this.s.hint('play.dribbleWait')
      }
    }
    o.endMarkers()
  }

  /** The move: the ball goes past him, he lunges the wrong way. */
  private beat(d: Player) {
    const w = this.w, c = this.carrier
    const k = this.beaten
    // hook, nutmeg, spin, then anything that works
    const style = k % 3
    const ahead = { x: this.spec.dir, y: 0 }
    const side = style === 1 ? 0 : (c.pos.y < w.pitch.h / 2 ? 1 : -1) * (style === 0 ? 1 : -1)
    const to: V2 = { x: d.pos.x + ahead.x * 2.4, y: Math.max(1.5, Math.min(w.pitch.h - 1.5, d.pos.y + side * 1.3)) }
    w.requestPass(c, to, { receiver: c.id, arrive: 1.6, precise: true })
    d.meta.noBlock = true
    d.anim = 'tackle'; d.animT = 0
    d.target = { x: d.pos.x - side * 0.8, y: d.pos.y - side * 0.8 }
    this.stunned.set(d.id, 1.1)
    setTimeout(() => { d.meta.noBlock = undefined }, 900)
    c.target = to; c.speedMode = 0.9
    this.moveT = 0.7
    this.beaten++
    sfx('touch')
    this.s.hint(null)
    flash(this.s, this.spec.calls?.[k])
    if (this.beaten < this.spec.defenders.length) this.s.prompt('play.dribble', { n: this.beaten + 1, total: this.spec.defenders.length })
  }

  private async finish() {
    this.state = 'end'
    const w = this.w, c = this.carrier
    this.s.prompt(null); this.s.hint(null)
    this.s.setControls([], false)
    const ch = this.s.choreo
    try {
      if (this.spec.end === 'lose' && this.spec.loseTo) {
        const thief = w.get(this.spec.loseTo)!
        // he stands in the way and just puts his foot out
        thief.meta.scripted = true
        const ahead = { x: c.pos.x + this.spec.dir * 3.2, y: c.pos.y }
        thief.pos = { ...ahead }; w.prev.set(thief.id, { ...ahead })
        thief.facing = this.spec.dir > 0 ? Math.PI : 0
        c.controlled = false; c.meta.scripted = true
        await ch.wait(0.4)
        c.target = { x: thief.pos.x, y: thief.pos.y }; c.speedMode = 0.4
        await ch.until(() => dist2(c.pos, thief.pos) < 1.5, 4)
        ch.give(thief.id)
        c.target = null; thief.anim = 'receive'; thief.animT = 0
        sfx('touch')
        await ch.wait(0.6)
        if (this.spec.loseLines) await this.s.say(this.spec.loseLines)
      }
    } catch (e) { if (!(e instanceof Cancelled)) throw e }
    c.controlled = false
    this.s.st.view.overlays.beginMarkers(); this.s.st.view.overlays.endMarkers()
    this.done()
  }

  dispose() { const c = this.w.get(this.spec.carrier); if (c) c.controlled = false; this.s.st.view.overlays.beginMarkers(); this.s.st.view.overlays.endMarkers() }
}

/* ======================================================================== one touch */

/** The ball comes, time slows: pass first time to the partner the book names. */
class OneTouch implements Challenge {
  controls: ControlKey[] = ['pass']
  stick = false
  private waiting = false
  private chosen = false
  private resolveChoice!: () => void
  constructor(private spec: Extract<ChallengeSpec, { type: 'oneTouch' }>, private s: StorySession) {}
  get w() { return this.s.world() }

  async run() {
    const ch = this.s.choreo
    const me = this.w.get(this.spec.player)!
    me.wantsBall = false
    await this.spec.setup(ch)
    // the moment stops: the ball turns slowly, seam after seam
    this.waiting = true
    this.s.timeScale(0.12)
    this.s.prompt('play.oneTouch', { name: this.w.get(this.spec.to)?.label ?? '' })
    if (this.spec.lines) flash(this.s, this.spec.lines[0])
    await new Promise<void>((r) => { this.resolveChoice = r })
    this.waiting = false
    this.s.prompt(null); this.s.hint(null)
    this.s.st.view.overlays.beginMarkers(); this.s.st.view.overlays.endMarkers()
    this.s.timeScale(1)
    // first time, no control
    const pass = ch.pass(this.spec.player, this.spec.to, { arrive: 6 })
    await pass
    await this.spec.after(ch)
  }

  tick() {
    if (!this.waiting) return
    const me = this.w.get(this.spec.player)!
    // never let the ball reach him before the choice
    if (dist2(this.w.ball2(), me.pos) < 1.2) this.s.timeScale(0.015)
  }

  frame(_dt: number, input: Input) {
    if (!this.waiting) return
    const o = this.s.st.view.overlays
    o.beginMarkers()
    for (const p of this.w.players) if (p.team === 'a' && p.id !== this.spec.player && !p.gk) o.marker('o-' + p.id, p.pos, p.id === this.spec.to && this.s.state.hint ? OVERLAY_COLORS.gold : '#7FD3A2', { radius: 0.65, opacity: 0.85 })
    o.endMarkers()
    if (this.s.autoplay) { this.choose(this.spec.to); return }
    if (input.pressed('pass')) {
      const dir = this.s.stickDir()
      if (!dir) { this.choose(this.spec.to); return }
      const me = this.w.get(this.spec.player)!
      let best: Player | null = null, bs = -2
      for (const p of this.w.players) {
        if (p.team !== 'a' || p.id === me.id || p.gk) continue
        const dx = p.pos.x - me.pos.x, dy = p.pos.y - me.pos.y, l = Math.hypot(dx, dy) || 1
        const sc = (dx * dir.x + dy * dir.y) / l
        if (sc > bs) { bs = sc; best = p }
      }
      if (best) this.choose(best.id)
    }
  }

  pointer(e: PointerEvent) {
    if (!this.waiting) return false
    const p = this.s.st.view.pickPlayer(e.clientX, e.clientY, (q) => q.team === 'a' && q.id !== this.spec.player)
    if (p) this.choose(p.id)
    return true
  }

  private choose(id: string) {
    if (this.chosen) return
    if (id !== this.spec.to) {
      this.s.hint('play.oneTouchWrong', { name: this.w.get(this.spec.to)?.label ?? '' })
      flash(this.s, this.spec.wrongLine)
      sfx('fail')
      return
    }
    this.chosen = true
    sfx('tap')
    this.resolveChoice()
  }

  dispose() { this.s.st.view.overlays.beginMarkers(); this.s.st.view.overlays.endMarkers() }
}

/* ======================================================================== juggle */

/** The ten passes without the ball touching the ground: touch it when it comes down to you. */
class Juggle implements Challenge {
  controls: ControlKey[] = ['touch']
  stick = false
  private count = 0
  private arrive = 0
  private active = false
  private holder = 0
  private pressedAt: number | null = null
  private done!: () => void
  constructor(private spec: Extract<ChallengeSpec, { type: 'juggle' }>, private s: StorySession) {}
  get w() { return this.s.world() }

  run() {
    const ps = this.spec.players.map((id) => this.w.get(id)!)
    for (const p of ps) { p.meta.scripted = true; p.target = null }
    this.s.prompt('play.juggle', { n: 0, total: this.spec.count })
    if (this.spec.lines) this.s.say(this.spec.lines).catch(() => {})
    this.holder = Math.max(0, this.spec.players.indexOf(this.spec.ball))
    this.s.camera({ kind: 'on', who: this.spec.players, dist: 5.5, height: 2.6 }, true)
    void this.toss()
    return new Promise<void>((r) => { this.done = r })
  }

  /** The ball goes up from the holder to the next one; the player must touch it as it lands. */
  private async toss() {
    const ch = this.s.choreo
    const ps = this.spec.players.map((id) => this.w.get(id)!)
    const from = ps[this.holder]
    const nextI = (this.holder + 1) % ps.length
    const to = ps[nextI]
    const foot = (p: Player): [number, number, number] => [p.pos.x + Math.cos(p.facing) * 0.35, p.pos.y + Math.sin(p.facing) * 0.35, 0.45]
    for (const p of ps) ch.face(p.id, this.spec.players[(ps.indexOf(p) + 1) % ps.length])
    ch.face(to.id, from.id)
    const dur = 1.05
    this.arrive = this.w.t + dur
    this.active = true
    this.pressedAt = null
    from.meta.pose = 'juggle'; from.meta.poseT = 0
    setTimeout(() => { if (from.meta.pose === 'juggle') from.meta.pose = undefined }, 350)
    sfx('touch')
    try {
      await ch.arc(foot(from), foot(to), 1.6, dur)
      // judged at the landing: a touch close to it keeps the ball up
      await ch.wait(0.25)
    } catch { return }
    this.active = false
    const ok = this.pressedAt !== null && Math.abs(this.pressedAt - this.arrive) < 0.3
    if (ok) {
      this.count++
      this.holder = nextI
      this.s.prompt('play.juggle', { n: this.count, total: this.spec.count })
      this.s.hint(null)
      if (this.count >= this.spec.count) {
        sfx('success')
        const ch2 = this.s.choreo
        ch2.release(); ch2.give(to.id)
        try { await ch2.wait(0.6) } catch { return }
        this.s.prompt(null)
        this.done()
        return
      }
    } else {
      // it touched the ground: start again from one
      sfx('fail')
      this.count = 0
      this.s.prompt('play.juggle', { n: 0, total: this.spec.count })
      this.s.hint(this.pressedAt === null ? 'play.juggleLate' : this.pressedAt < this.arrive ? 'play.juggleEarly' : 'play.juggleLate')
      const ch3 = this.s.choreo
      ch3.release(); ch3.place([to.pos.x, to.pos.y])
      try { await ch3.wait(0.8) } catch { return }
      this.holder = nextI
    }
    void this.toss()
  }

  frame(_dt: number, input: Input) {
    if (input.pressed('pass') || input.pressed('skill') || (this.s.autoplay && this.active && Math.abs(this.arrive - this.w.t) < 0.08)) this.touch()
    // the ring that closes as the ball comes down
    const o = this.s.st.view.overlays
    o.beginMarkers()
    if (this.active) {
      const ps = this.spec.players.map((id) => this.w.get(id)!)
      const to = ps[(this.holder + 1) % ps.length]
      const left = Math.max(0, this.arrive - this.w.t)
      o.marker('ring', to.pos, left < 0.3 ? OVERLAY_COLORS.gold : OVERLAY_COLORS.chalk, { radius: 0.5 + left * 1.4, opacity: 0.9 })
    }
    o.endMarkers()
  }
  private touch() { if (this.active && this.pressedAt === null) this.pressedAt = this.w.t }
  pointer() { this.touch(); return true }
  press(k: ControlKey) { if (k === 'touch') this.touch() }
  dispose() { this.s.choreo.release(); this.s.st.view.overlays.beginMarkers(); this.s.st.view.overlays.endMarkers() }
}

/* ======================================================================== decoy run */

/** Run into the space: the marker follows you, the gap opens for someone else. */
class DecoyRun implements Challenge {
  controls: ControlKey[] = []
  stick = true
  private done!: () => void
  private finished = false
  constructor(private spec: Extract<ChallengeSpec, { type: 'run' }>, private s: StorySession) {}
  get w() { return this.s.world() }
  run() {
    const r = this.w.get(this.spec.runner)!
    r.controlled = true; r.meta.scripted = false
    this.s.camera({ kind: 'follow', who: r.id, dist: 7, height: 4.5 }, true)
    this.s.prompt('play.run')
    flash(this.s, this.spec.cue)
    return new Promise<void>((res) => { this.done = res })
  }
  tick() {
    const r = this.w.get(this.spec.runner)!, m = this.w.get(this.spec.marker)!
    m.meta.scripted = true
    // the marker sticks to the runner, goal side
    m.target = { x: r.pos.x + 0.9, y: r.pos.y + 0.4 }; m.speedMode = 0.9; m.faceTarget = r.pos
  }
  frame(_dt: number, input: Input) {
    if (this.finished) return
    const r = this.w.get(this.spec.runner)!
    const z = { x: this.spec.zone.at[0], y: this.spec.zone.at[1] }
    const dir = this.s.autoplay ? norm(z.x - r.pos.x, z.y - r.pos.y) : this.s.stickDir()
    if (dir) { r.target = { x: r.pos.x + dir.x * 3, y: r.pos.y + dir.y * 3 }; r.speedMode = input.held('sprint') ? 1 : 0.8 } else r.target = null
    const o = this.s.st.view.overlays
    o.beginMarkers()
    o.marker('zone', z, OVERLAY_COLORS.gold, { radius: this.spec.zone.r, fill: 0.15 })
    o.marker('me', r.pos, OVERLAY_COLORS.gold, { radius: 0.7, fill: 0.2 })
    o.endMarkers()
    if (dist2(r.pos, z) < this.spec.zone.r) void this.finish()
  }
  private async finish() {
    this.finished = true
    const r = this.w.get(this.spec.runner)!
    r.controlled = false; r.meta.scripted = true; r.target = null
    this.s.prompt(null)
    this.s.setControls([], false)
    this.s.st.view.overlays.beginMarkers(); this.s.st.view.overlays.endMarkers()
    try { await this.spec.after(this.s.choreo); if (this.spec.lines) await this.s.say(this.spec.lines) } catch (e) { if (!(e instanceof Cancelled)) throw e }
    this.done()
  }
  dispose() { const r = this.w.get(this.spec.runner); if (r) r.controlled = false; this.s.st.view.overlays.beginMarkers(); this.s.st.view.overlays.endMarkers() }
}

/* ======================================================================== penalty */

/** Take a penalty (choose the corner, then strike) or dive to save one. The book decides the result. */
class Penalty implements Challenge {
  controls: ControlKey[]
  stick = false
  private done!: () => void
  private step: 'aim' | 'fly' = 'aim'
  private side: -1 | 1 | 0 = 0
  constructor(private spec: Extract<ChallengeSpec, { type: 'penalty' }>, private s: StorySession) {
    this.controls = spec.role === 'shoot' ? ['diveL', 'shoot', 'diveR'] : ['diveL', 'diveR']
  }
  get w() { return this.s.world() }
  run() {
    const t = this.w.get(this.spec.taker)!, k = this.w.get(this.spec.keeper)!
    this.s.choreo.give(t.id)
    this.s.camera({ kind: 'over', who: this.spec.role === 'shoot' ? t.id : k.id, to: this.spec.role === 'shoot' ? k.id : t.id, dist: this.spec.role === 'shoot' ? 2.6 : 1.4 }, true)
    this.s.prompt(this.spec.role === 'shoot' ? 'play.penaltyShoot' : 'play.penaltySave')
    return new Promise<void>((r) => { this.done = r })
  }
  frame(_dt: number, input: Input) {
    if (this.step !== 'aim') return
    if (this.s.autoplay) { if (this.spec.role === 'shoot') void this.strike(1); else void this.dive(1); return }
    const dir = this.s.stickDir()
    if (this.spec.role === 'shoot') {
      if (input.pressed('shoot') || input.pressed('pass')) void this.strike(dir ? (dir.y > 0 ? 1 : -1) : this.side)
    } else if (dir && Math.abs(dir.y) > 0.3) void this.dive(dir.y > 0 ? 1 : -1)
  }
  press(k: ControlKey) {
    if (this.step !== 'aim') return
    const side = k === 'diveL' ? -1 : k === 'diveR' ? 1 : 0
    if (this.spec.role === 'shoot') { if (k === 'shoot') void this.strike(this.side); else this.side = side as -1 | 1 }
    else if (side) void this.dive(side as -1 | 1)
  }
  pointer(e: PointerEvent) {
    const r = this.s.st.stage.renderer.domElement.getBoundingClientRect()
    const side = e.clientX < r.left + r.width / 2 ? -1 : 1
    if (this.spec.role === 'shoot') { this.side = side; void this.strike(side) } else void this.dive(side)
    return true
  }
  private goal() { return this.w.pitch.goals.find((g) => g.attackedBy === (this.w.get(this.spec.taker)!.team === 'b' ? 'b' : 'a'))! }

  private async strike(side: -1 | 1 | 0) {
    this.step = 'fly'
    this.s.prompt(null)
    this.s.setControls([], false)
    const ch = this.s.choreo
    const g = this.goal()
    const t = this.w.get(this.spec.taker)!
    try {
      if (this.spec.result === 'miss' && this.spec.missTo) {
        // the book: it flies over everything
        t.anim = 'kick'; t.animT = 0
        sfx('kick')
        const b = this.w.ball.pos
        await ch.arc([b.x, b.y, 0.11], [this.spec.missTo[0], this.spec.missTo[1], 2.2], 6, 1.3)
        ch.release(); ch.place(this.spec.missTo)
      } else {
        await ch.shot(t.id, [g.x, g.y + (side || 1) * g.width * 0.32], { height: 0.35, speed: 17 })
      }
      if (this.spec.lines) await this.s.say(this.spec.lines)
    } catch (e) { if (!(e instanceof Cancelled)) throw e }
    this.done()
  }

  private async dive(side: -1 | 1) {
    const ch = this.s.choreo
    const g = this.goal()
    const t = this.w.get(this.spec.taker)!, k = this.w.get(this.spec.keeper)!
    // the book's save is to one side: the keeper reads it; the other way, look again
    const canonSide: -1 | 1 = 1
    if (this.spec.result === 'saved' && side !== canonSide) { this.s.hint('play.penaltyLook'); sfx('fail'); return }
    this.step = 'fly'
    this.s.prompt(null); this.s.hint(null)
    this.s.setControls([], false)
    try {
      const target: [number, number] = [g.x, g.y + canonSide * g.width * 0.36]
      const shot = ch.shot(t.id, target, { height: 0.5, speed: 15 })
      await ch.wait(0.18)
      k.anim = 'dive'; k.animT = 0
      k.target = { x: k.pos.x, y: g.y + canonSide * g.width * 0.42 }; k.speedMode = 1
      if (this.spec.result === 'saved' || this.spec.result === 'post') {
        // fingertips: the ball goes onto the post and away
        await ch.until(() => dist2(this.w.ball2(), { x: g.x, y: target[1] }) < 2.2, 2)
        const b = this.w.ball.pos
        sfx('post'); this.s.shake(0.3)
        await ch.arc([b.x, b.y, b.z], [g.x - g.facing * 3, g.y + canonSide * (g.width / 2 + 2.5), 0.11], 0.8, 0.7)
        ch.release()
      } else await shot
      if (this.spec.lines) await this.s.say(this.spec.lines)
    } catch (e) { if (!(e instanceof Cancelled)) throw e }
    this.done()
  }
  dispose() {}
}

/* ======================================================================== choose */

/** A frozen picture: the options, the one the book's player could play, and the others, locked. */
class Choose implements Challenge {
  controls: ControlKey[] = []
  stick = false
  constructor(private spec: Extract<ChallengeSpec, { type: 'choose' }>, private s: StorySession) {}
  async run() {
    const ch = this.s.choreo
    await this.spec.setup(ch)
    this.s.timeScale(0)
    this.s.prompt(this.spec.prompt ?? 'play.choose')
    let canon: (typeof this.spec.options)[number] | undefined
    if (this.s.autoplay) setTimeout(() => this.s.choose(this.spec.options.find((o) => o.canon)!.key), 1500)
    await new Promise<void>((resolve) => {
      this.s.offerChoices(this.spec.options.map((o) => ({ key: o.key, canon: o.canon })), (key) => {
        const opt = this.spec.options.find((o) => o.key === key)
        if (!opt) return
        if (opt.canon) { canon = opt; this.s.offerChoices(null); resolve(); return }
        // the other option exists, the book's player does not play it: say why
        sfx('fail')
        this.s.hint(this.spec.lockedHint ?? 'play.chooseLocked')
        if (opt.line) this.s.say([opt.line]).catch(() => {})
      })
    })
    this.s.prompt(null); this.s.hint(null)
    if (canon?.line) await this.s.say([canon.line])
    this.s.timeScale(1)
    await this.spec.after(ch)
  }
  dispose() { this.s.offerChoices(null) }
}

/* ======================================================================== drive */

/** Carry the ball yourself to a place, then the book's finish. */
class Drive implements Challenge {
  controls: ControlKey[] = []
  stick = true
  private done!: () => void
  private finished = false
  constructor(private spec: Extract<ChallengeSpec, { type: 'drive' }>, private s: StorySession) {}
  get w() { return this.s.world() }
  run() {
    const p = this.w.get(this.spec.player)!
    p.controlled = true; p.wantsBall = true; p.meta.scripted = false
    if (this.w.ball.owner !== p.id) this.s.choreo.give(p.id)
    this.s.camera({ kind: 'follow', who: p.id }, true)
    if (this.spec.lines) this.s.say(this.spec.lines).catch(() => {})
    return new Promise<void>((r) => { this.done = r })
  }
  frame(_dt: number, input: Input) {
    if (this.finished) return
    const p = this.w.get(this.spec.player)!
    const dir = this.s.autoplay ? norm(this.spec.target[0] - p.pos.x, this.spec.target[1] - p.pos.y) : this.s.stickDir()
    if (this.w.ball.owner === p.id) {
      if (dir) { p.target = { x: p.pos.x + dir.x * 3, y: p.pos.y + dir.y * 3 }; p.speedMode = input.held('sprint') ? 0.85 : 0.6 } else p.target = null
    } else { p.target = this.w.ball2(); p.speedMode = 0.8; if (!this.w.ball.owner && dist2(p.pos, this.w.ball2()) < 0.8) this.s.choreo.give(p.id) }
    const z = { x: this.spec.target[0], y: this.spec.target[1] }
    const o = this.s.st.view.overlays
    o.beginMarkers(); o.marker('zone', z, OVERLAY_COLORS.gold, { radius: this.spec.r, fill: 0.15 }); o.endMarkers()
    if (dist2(p.pos, z) < this.spec.r) void this.finish()
  }
  private async finish() {
    this.finished = true
    const p = this.w.get(this.spec.player)!
    p.controlled = false; p.meta.scripted = true; p.target = null
    this.s.setControls([], false)
    this.s.st.view.overlays.beginMarkers(); this.s.st.view.overlays.endMarkers()
    try { await this.spec.after(this.s.choreo) } catch (e) { if (!(e instanceof Cancelled)) throw e }
    this.done()
  }
  dispose() { const p = this.w.get(this.spec.player); if (p) p.controlled = false }
}
