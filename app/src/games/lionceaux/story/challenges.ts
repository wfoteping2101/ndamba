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

export type ControlKey = 'talk' | 'dribble' | 'pass' | 'shoot' | 'touch' | 'diveL' | 'diveR' | 'next' | 'draw'

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
    case 'ritual': return new Ritual(spec, s)
    case 'support': return new Support(spec, s)
    case 'sketch': return new Sketch(spec, s)
    case 'lure': return new Lure(spec, s)
    case 'nutmeg': return new Nutmeg(spec, s)
    case 'firstTouch': return new FirstTouch(spec, s)
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
        // (QA autoplay: a coarse catch-up step can jump past the window; it dribbles instead)
        if (dd < 0.95 && w.ball.owner === c.id && this.moveT <= 0) { if (this.s.autoplay) this.beat(d); else this.poke(d) }
      } else d.target = null
    })
    if (this.moveT > 0) this.moveT -= dt
    // a defender never keeps it during the run (a slow ball by a beaten one): it is knocked loose
    // back towards the carrier, who gathers it again
    if (this.state === 'play' && w.ball.owner && w.ball.owner !== c.id && this.spec.defenders.includes(w.ball.owner)) {
      const d = w.get(w.ball.owner)!
      const u = norm(c.pos.x - d.pos.x, c.pos.y - d.pos.y)
      w.ball.owner = null
      w.ball.vel = { x: u.x * 2.4, y: u.y * 2.4, z: 0 }
      this.stunned.set(d.id, 0.9)
    }
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
      if ((input.pressed('skill') || (this.s.autoplay && dd < 2.2)) && w.ball.owner === c.id && this.moveT <= 0) {
        if (ready || (this.s.autoplay && dd <= 0.8)) this.beat(d)
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
    const pass = ch.pass(this.spec.player, this.spec.to, { arrive: 6, lead: this.spec.lead })
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
    this.s.camera(this.spec.cam ?? { kind: 'on', who: this.spec.players, dist: 5.5, height: 2.6 }, true)
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
      const call = this.spec.calls?.[this.count]
      if (call) this.s.say(call).catch(() => {})
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
    // QA autoplay touches on the first frame inside the window (a slow frame may jump past its middle)
    if (input.pressed('pass') || input.pressed('skill') || (this.s.autoplay && this.active && this.w.t >= this.arrive - 0.22)) this.touch()
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
    this.s.prompt(this.spec.prompt ?? 'play.run')
    flash(this.s, this.spec.cue)
    return new Promise<void>((res) => { this.done = res })
  }
  tick() {
    const r = this.w.get(this.spec.runner)!, m = this.w.get(this.spec.marker)!
    m.meta.scripted = true
    // the marker sticks to the runner, goal side
    m.target = { x: r.pos.x + 0.9, y: r.pos.y + 0.4 }; m.speedMode = this.spec.markerSpeed ?? 0.9; m.faceTarget = r.pos
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
  private goal() { const team = this.spec.attackedBy ?? (this.w.get(this.spec.taker)!.team === 'b' ? 'b' : 'a'); return this.w.pitch.goals.find((g) => g.attackedBy === team)! }

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

/* ======================================================================== ritual */

/** A gesture in steps: the button of each step, then what the book says happens. */
class Ritual implements Challenge {
  controls: ControlKey[] = []
  stick = false
  constructor(private spec: Extract<ChallengeSpec, { type: 'ritual' }>, private s: StorySession) {}
  async run() {
    for (const step of this.spec.steps) {
      await new Promise<void>((resolve) => {
        this.s.offerChoices([{ key: step.key, canon: true }], () => { this.s.offerChoices(null); sfx('tap'); resolve() })
        if (this.s.autoplay) setTimeout(() => this.s.choose(step.key), 1200)
      })
      await step.act(this.s.choreo)
    }
    this.s.prompt(null)
  }
  dispose() { this.s.offerChoices(null) }
}

/* ======================================================================== support */

/** Distance from a point to the segment a-b. */
function distSeg(p: V2, a: V2, b: V2) {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2))
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t))
}

/**
 * Offer a solution (Leçon du Ballon n°4). The player is at a corner of the triangle; the opponent in
 * the middle stands between him and the ball: « tu n'existes pas ». A step or two to the side opens
 * the line (the arrow turns gold), the carrier sees him and the ball comes along the ground; he gives
 * it on with the pass button. The opponent shifts back into the line; again. While the line is shut,
 * the ball never comes, whatever he does: that is the lesson, not a failure.
 */
class Support implements Challenge {
  controls: ControlKey[] = []
  stick = true
  private phase: 'setup' | 'hide' | 'incoming' | 'give' | 'away' = 'setup'
  private openFor = 0
  private stillFor = 0
  private hiddenFor = 0
  private home: V2 = { x: 0, y: 0 }
  private side = 1
  private opened: (() => void) | null = null
  private gave: (() => void) | null = null
  private drawn = ''
  private finished = false
  constructor(private spec: Extract<ChallengeSpec, { type: 'support' }>, private s: StorySession) {}
  get w() { return this.s.world() }
  private p(id: string) { return this.w.get(id)! }

  async run() {
    const ch = this.s.choreo, sp = this.spec
    const me = this.p(sp.player), def = this.p(sp.defender)
    me.meta.scripted = true; def.meta.scripted = true
    if (sp.setup) await sp.setup(ch)
    this.home = { ...me.pos }
    if (this.w.ball.owner !== sp.carrier) ch.give(sp.carrier)
    this.s.camera({ kind: 'over', who: sp.player, to: sp.carrier, dist: 4.6, height: 3.4, mix: 0.55 }, true)
    for (let rep = 0; rep < sp.reps; rep++) {
      const last = rep === sp.reps - 1
      // the opponent steps back into the line
      this.block(0.55)
      await ch.until(() => distSeg(def.pos, this.p(sp.carrier).pos, me.pos) < 0.6, 4).catch(() => {})
      if (sp.hideLines?.[rep]) await this.s.say(sp.hideLines[rep]!).catch(() => {})
      this.phase = 'hide'; this.openFor = 0; this.stillFor = 0; this.hiddenFor = 0
      this.s.prompt(rep === 0 ? sp.prompt ?? 'play.support' : 'play.supportAgain', { name: this.p(sp.defender).label ?? '' })
      this.s.setControls([], true)
      me.controlled = true
      if (sp.slow) this.s.timeScale(sp.slow)
      await new Promise<void>((r) => { this.opened = r })
      // he is visible: the ball comes
      this.phase = 'incoming'
      me.controlled = false; me.target = null
      this.s.hint(null); this.s.prompt(null)
      this.s.st.view.overlays.clear('support'); this.drawn = ''
      sfx('tap')
      // the book's lines while the ball comes (read to the end before the next move)
      await Promise.all([ch.pass(sp.carrier, sp.player, { arrive: 5 }), sp.openLines?.[rep] ? this.s.say(sp.openLines[rep]!).catch(() => {}) : null])
      if (sp.slow) this.s.timeScale(1)
      // give it on, along the ground
      const to = last && sp.finish ? sp.finish : sp.partner
      this.phase = 'give'
      this.s.prompt('play.supportGive', { name: this.p(to).label ?? '' })
      this.s.setControls(['pass'], false)
      ch.face(sp.player, to)
      await new Promise<void>((r) => { this.gave = r })
      this.phase = 'away'
      this.s.prompt(null); this.s.setControls([], false)
      await Promise.all([ch.pass(sp.player, to), sp.giveLines?.[rep] ? this.s.say(sp.giveLines[rep]!).catch(() => {}) : null])
      if (last) break
      // round the triangle and back to the carrier
      await ch.pass(sp.partner, sp.carrier)
    }
    this.finished = true
    me.controlled = false
    this.s.st.view.overlays.clear('support')
    if (sp.after) await sp.after(ch)
  }

  /** The opponent's place: on the line from the ball to the player, a little nearer the ball. */
  private block(speed: number) {
    const def = this.p(this.spec.defender), car = this.p(this.spec.carrier), me = this.p(this.spec.player)
    def.target = { x: car.pos.x + (me.pos.x - car.pos.x) * 0.55, y: car.pos.y + (me.pos.y - car.pos.y) * 0.55 }
    def.speedMode = speed
    def.faceTarget = car.pos
  }

  frame(dt: number, input: Input) {
    if (this.finished) return
    const sp = this.spec
    if (this.phase === 'give') {
      if (input.pressed('pass') || (this.s.autoplay && Math.random() < dt * 1.5)) { const g = this.gave; this.gave = null; g?.() }
      return
    }
    if (this.phase !== 'hide') return
    const me = this.p(sp.player), car = this.p(sp.carrier), def = this.p(sp.defender)
    // the player moves round his corner (a few steps, no more)
    let dir = this.s.stickDir()
    if (this.s.autoplay) {
      const ax = me.pos.x - car.pos.x, ay = me.pos.y - car.pos.y, l = Math.hypot(ax, ay) || 1
      dir = { x: (-ay / l) * this.side, y: (ax / l) * this.side }
    }
    let moving = false
    if (dir) {
      let tx = me.pos.x + dir.x * 1.6, ty = me.pos.y + dir.y * 1.6
      const ox = tx - this.home.x, oy = ty - this.home.y, ol = Math.hypot(ox, oy)
      const R = 3.2
      if (ol > R) { tx = this.home.x + (ox / ol) * R; ty = this.home.y + (oy / ol) * R }
      moving = Math.hypot(tx - me.pos.x, ty - me.pos.y) > 0.3
      me.target = { x: tx, y: ty }; me.speedMode = input.held('sprint') ? 0.7 : 0.55
      this.stillFor = moving ? 0 : this.stillFor + dt
      // the autoplay that has run out of room tries the other side
      if (this.s.autoplay && !moving) this.side = -this.side
    } else { me.target = null; this.stillFor += dt }
    me.faceTarget = car.pos
    // the opponent drifts back into the line, slowly, and only once the player has stopped: two quick
    // steps beat him (the longer the player stays hidden, the lazier he gets)
    this.hiddenFor = this.openFor > 0 ? 0 : this.hiddenFor + dt
    this.block(this.stillFor > 0.3 ? (this.hiddenFor > 8 ? 0.05 : 0.11) : 0.04)
    const blocked = distSeg(def.pos, car.pos, me.pos) < 0.75
    this.openFor = blocked ? 0 : this.openFor + dt
    // the line from the ball to him: red while hidden, gold when he can be seen (redrawn when it changes)
    const key = `${blocked}|${Math.round(me.pos.x * 8)}|${Math.round(me.pos.y * 8)}|${Math.round(car.pos.x * 8)}|${Math.round(car.pos.y * 8)}`
    if (key !== this.drawn) {
      this.drawn = key
      const o = this.s.st.view.overlays
      o.clear('support')
      o.arrow('support', car.pos, me.pos, 'lane', blocked ? OVERLAY_COLORS.closed : OVERLAY_COLORS.gold, { opacity: blocked ? 0.55 : 0.9 })
    }
    if (this.stillFor > 4 && blocked) this.s.hint('play.supportHint')
    if (this.openFor > 0.3) { const r = this.opened; this.opened = null; this.side = -this.side; r?.() }
  }

  dispose() {
    const me = this.w.get(this.spec.player); if (me) me.controlled = false
    this.s.st.view.overlays.clear('support')
  }
}

/* ======================================================================== sketch */

/**
 * BriBri's notebook at night: a line of three circles (the comb of defenders), a circle for him. The
 * polite arrow draws itself along the line and loses itself at the edge of the page. The player
 * draws the useful one: from him, between two circles without touching them, to the other side.
 * A stroke that misses is rubbed out with a hint. The pass button (or a gamepad) traces it for him.
 */
class Sketch implements Challenge {
  controls: ControlKey[] = []
  stick = false
  private done: (() => void) | null = null
  constructor(private spec: Extract<ChallengeSpec, { type: 'sketch' }>, private s: StorySession) {}
  async run() {
    const ch = this.s.choreo, sp = this.spec
    if (sp.setup) await sp.setup(ch)
    this.s.setSketch({ phase: 'polite' })
    if (sp.politeLines) await this.s.say(sp.politeLines)
    this.s.setSketch({ phase: 'draw' })
    if (sp.drawLines) await this.s.say(sp.drawLines)
    this.s.prompt('play.sketch')
    this.s.setControls(['draw'], false)
    this.s.onSketch = (ok) => {
      if (ok) { const d = this.done; this.done = null; d?.() } else { sfx('fail'); this.s.hint('play.sketchHint') }
    }
    if (this.s.autoplay) setTimeout(() => this.s.sketchResult(true), 1500)
    await new Promise<void>((r) => { this.done = r })
    this.s.onSketch = null
    this.s.prompt(null); this.s.hint(null); this.s.setControls([], false)
    // the arrow is on the page; the hesitation; then the word, pressed so hard the lead breaks
    this.s.setSketch({ phase: 'arrow' })
    if (sp.drawnLines) await this.s.say(sp.drawnLines)
    this.s.setSketch({ phase: 'done' })
    sfx('touch')
    if (sp.wordLines) await this.s.say(sp.wordLines)
    if (sp.after) await sp.after(ch)
    this.s.setSketch(null)
  }
  press(k: ControlKey) { if (k === 'draw') this.s.sketchResult(true) }
  frame(_dt: number, input: Input) { if (this.done && input.pressed('pass')) this.s.sketchResult(true) }
  dispose() { this.s.onSketch = null; this.s.setSketch(null) }
}

/* ======================================================================== lure */

/**
 * Chapter 8: « Je ne peux pas les battre. Alors je vais les faire bouger. » Near the touchline one
 * opponent jockeys in front of the carrier, another marks the partner, and they wait. The margouillat
 * (the dribble button) is only a promise now: the feint makes them both come at him. When both have
 * come, the partner is alone and the lane turns gold: pass, along the ground. Too early, he is still
 * marked; too late, a long leg takes the ball and everyone goes back to try again.
 */
class Lure implements Challenge {
  controls: ControlKey[] = []
  stick = false
  private phase: 'setup' | 'wait' | 'lunge' | 'lost' | 'gone' = 'setup'
  private home = new Map<string, V2>()
  private done: (() => void) | null = null
  private since = 0
  private drawnFor = -1
  private drawn = ''
  constructor(private spec: Extract<ChallengeSpec, { type: 'lure' }>, private s: StorySession) {}
  get w() { return this.s.world() }
  private p(id: string) { return this.w.get(id)! }

  async run() {
    const ch = this.s.choreo, sp = this.spec
    if (sp.setup) await sp.setup(ch)
    for (const id of [sp.carrier, sp.partner, ...sp.defenders]) { const p = this.p(id); p.meta.scripted = true; p.target = null; this.home.set(id, { ...p.pos }) }
    if (this.w.ball.owner !== sp.carrier) ch.give(sp.carrier)
    this.s.camera({ kind: 'over', who: sp.carrier, to: sp.partner, dist: 5.2, height: 4.2, mix: 0.45 }, true)
    this.start()
    await new Promise<void>((r) => { this.done = r })
    this.s.timeScale(1)
    this.s.prompt(null); this.s.hint(null); this.s.setControls([], false)
    this.s.st.view.overlays.clear('lure')
    for (const id of sp.defenders) this.p(id).target = null
    await Promise.all([ch.pass(sp.carrier, sp.partner), sp.passLines ? this.s.say(sp.passLines).catch(() => {}) : null])
    if (sp.after) await sp.after(ch)
  }

  private start() {
    const sp = this.spec
    this.phase = 'wait'; this.since = 0; this.drawnFor = -1
    this.s.prompt(sp.prompt ?? 'play.lure', { name: this.p(sp.partner).label ?? '' })
    this.s.setControls(['dribble', 'pass'], false)
    const car = this.p(sp.carrier)
    for (const id of sp.defenders) { const d = this.p(id); d.target = null; d.faceTarget = car.pos }
    car.faceTarget = this.p(sp.defenders[0]).pos
  }

  /** all of them have come to the carrier: nobody is left with the partner */
  private allDrawn() {
    const car = this.p(this.spec.carrier).pos
    return this.spec.defenders.every((id) => dist2(this.p(id).pos, car) < 2.1)
  }

  frame(dt: number, input: Input) {
    const sp = this.spec
    if (this.phase === 'setup' || this.phase === 'gone') return
    const car = this.p(sp.carrier)
    this.since += dt
    const drawn = this.phase === 'lunge' && this.allDrawn()
    this.draw(drawn)
    if (this.phase === 'lost') return
    const feint = input.pressed('skill') || (this.s.autoplay && this.phase === 'wait' && this.since > 1.2)
    const pass = input.pressed('pass') || (this.s.autoplay && drawn && this.drawnFor > 0.5)
    if (this.phase === 'wait') {
      // they jockey and wait: nobody dives in on a little boy who does not move
      for (const id of sp.defenders) { const d = this.p(id); d.target = null; d.faceTarget = car.pos }
      if (pass) { sfx('fail'); this.s.hint('play.lureEarly', { name: this.p(sp.partner).label ?? '' }) }
      if (feint) {
        // the margouillat, as a promise: a shimmy of the hips, and they come
        this.phase = 'lunge'; this.since = 0
        car.anim = 'receive'; car.animT = 0
        sfx('touch')
        this.s.hint(null)
        this.s.timeScale(0.5)
        if (sp.feintLines) this.s.say(sp.feintLines).catch(() => {})
      }
      return
    }
    // lunge: they come at him and stop a long leg away, waiting for the touch
    for (const id of sp.defenders) {
      const d = this.p(id)
      const u = norm(d.pos.x - car.pos.x, d.pos.y - car.pos.y)
      d.target = { x: car.pos.x + u.x * 1.1, y: car.pos.y + u.y * 1.1 }; d.speedMode = 0.5; d.faceTarget = car.pos
    }
    if (drawn) this.drawnFor = this.drawnFor < 0 ? 0 : this.drawnFor + dt
    if (pass) {
      if (drawn) { this.phase = 'gone'; const r = this.done; this.done = null; r?.(); return }
      sfx('fail'); this.s.hint('play.lureEarly', { name: this.p(sp.partner).label ?? '' })
    }
    if (this.drawnFor > 2.4) void this.lose()
  }

  /** too late: a long leg takes the ball; everyone back to his place, and again */
  private async lose() {
    const sp = this.spec, ch = this.s.choreo, w = this.w
    this.phase = 'lost'
    this.s.timeScale(1)
    this.s.setControls([], false)
    const car = this.p(sp.carrier)
    const d = this.p(sp.defenders[0])
    d.anim = 'tackle'; d.animT = 0
    w.ball.owner = null
    w.ball.vel = { x: (car.pos.x - d.pos.x) * 2, y: (car.pos.y - d.pos.y) * 2, z: 0 }
    sfx('touch')
    this.s.hint('play.lureLate')
    for (const id of sp.defenders) this.p(id).target = null
    try { await ch.wait(1.4) } catch (e) { if (e instanceof Cancelled) return; throw e }
    for (const [id, at] of this.home) { const p = this.p(id); p.pos = { ...at }; w.prev.set(id, { ...at }); p.vel = { x: 0, y: 0 }; p.target = null }
    ch.give(sp.carrier)
    this.start()
  }

  private draw(drawn: boolean) {
    const sp = this.spec, a = this.p(sp.carrier).pos, b = this.p(sp.partner).pos
    const key = `${drawn}|${this.phase}|${Math.round(a.x * 6)}|${Math.round(a.y * 6)}`
    if (key === this.drawn) return
    this.drawn = key
    const o = this.s.st.view.overlays
    o.clear('lure')
    if (this.phase === 'gone' || this.phase === 'lost') return
    o.arrow('lure', a, b, 'lane', drawn ? OVERLAY_COLORS.gold : OVERLAY_COLORS.closed, { opacity: drawn ? 0.9 : 0.5 })
  }

  dispose() { this.s.st.view.overlays.clear('lure'); this.s.timeScale(1) }
}

/* ======================================================================== nutmeg */

/** One against one: let the big one come, roll the ball aside so he dives that way, then through his legs. */
class Nutmeg implements Challenge {
  controls: ControlKey[] = []
  stick = false
  private phase: 'setup' | 'charge' | 'open' | 'lost' | 'gone' = 'setup'
  private since = 0
  private done: (() => void) | null = null
  private home = new Map<string, V2>()
  private warned = false
  constructor(private spec: Extract<ChallengeSpec, { type: 'nutmeg' }>, private s: StorySession) {}
  get w() { return this.s.world() }
  private p(id: string) { return this.w.get(id)! }

  async run() {
    const ch = this.s.choreo, sp = this.spec
    if (sp.setup) await sp.setup(ch)
    for (const id of [sp.carrier, sp.defender]) { const p = this.p(id); p.meta.scripted = true; p.target = null; this.home.set(id, { ...p.pos }) }
    if (this.w.ball.owner !== sp.carrier) ch.give(sp.carrier)
    this.s.camera({ kind: 'over', who: sp.carrier, to: sp.defender, dist: 3.4, height: 2.1, mix: 0.5 }, true)
    this.start()
    await new Promise<void>((r) => { this.done = r })
    this.s.timeScale(1)
    this.s.prompt(null); this.s.hint(null); this.s.setControls([], false)
    this.clearMarks()
    if (sp.after) await sp.after(ch)
  }

  private start() {
    this.phase = 'charge'; this.since = 0
    this.s.prompt(this.spec.prompt ?? 'play.nutmeg')
    this.s.setControls(['dribble'], false)
    const car = this.p(this.spec.carrier)
    car.target = null; car.vel = { x: 0, y: 0 }
  }

  frame(dt: number, input: Input) {
    if (this.phase === 'setup' || this.phase === 'gone' || this.phase === 'lost') return
    const sp = this.spec, car = this.p(sp.carrier), d = this.p(sp.defender)
    this.since += dt
    const dd = dist2(car.pos, d.pos)
    car.target = null; car.faceTarget = d.pos
    const o = this.s.st.view.overlays
    o.beginMarkers()
    o.marker('me', car.pos, OVERLAY_COLORS.gold, { radius: 0.7, fill: 0.2 })
    if (this.phase === 'charge') {
      // he comes like a truck, straight at the ball
      d.target = { ...car.pos }; d.speedMode = this.since < 0.4 ? 0.4 : 0.85; d.faceTarget = car.pos
      const ready = dd < 2.7 && dd > 1.05
      o.marker('def', d.pos, ready ? OVERLAY_COLORS.gold : OVERLAY_COLORS.b, { radius: ready ? 0.9 : 0.65, opacity: ready ? 0.95 : 0.6 })
      o.endMarkers()
      const feint = input.pressed('skill') || (this.s.autoplay && dd < 2.3)
      if (feint && ready) { this.open(); return }
      if (feint && dd >= 2.7 && !this.warned) { this.warned = true; this.s.hint('play.nutmegWait') }
      if (dd < 0.95) void this.lose('play.nutmegLate')
      return
    }
    // open: he has thrown himself to the side, legs wide; the ball must go through now
    o.marker('legs', d.pos, OVERLAY_COLORS.gold, { radius: 0.55, fill: 0.25 })
    o.endMarkers()
    const push = input.pressed('pass') || input.pressed('shoot') || input.pressed('skill') || (this.s.autoplay && this.since > 0.35)
    if (push) { this.phase = 'gone'; const r = this.done; this.done = null; r?.(); return }
    if (this.since > 1.5) void this.lose('play.nutmegSlow')
  }

  /** the ball rolls to his left under the sole; the defender throws himself that way, legs apart */
  private open() {
    const sp = this.spec, car = this.p(sp.carrier), d = this.p(sp.defender)
    this.phase = 'open'; this.since = 0
    const f = norm(d.pos.x - car.pos.x, d.pos.y - car.pos.y)
    const left = { x: f.y, y: -f.x }
    car.anim = 'receive'; car.animT = 0
    d.target = { x: car.pos.x + f.x * 0.9 + left.x * 1.3, y: car.pos.y + f.y * 0.9 + left.y * 1.3 }; d.speedMode = 1
    d.anim = 'tackle'; d.animT = 0
    sfx('touch')
    this.s.hint(null)
    this.s.timeScale(0.3)
    this.s.prompt('play.nutmegPush')
    this.s.setControls(['pass'], false)
    if (sp.feintLines) this.s.say(sp.feintLines).catch(() => {})
  }

  private async lose(hint: string) {
    const sp = this.spec, ch = this.s.choreo, w = this.w
    this.phase = 'lost'
    this.s.timeScale(1)
    this.s.setControls([], false)
    const car = this.p(sp.carrier), d = this.p(sp.defender)
    d.anim = 'tackle'; d.animT = 0
    w.ball.owner = null
    w.ball.vel = { x: (car.pos.x - d.pos.x) * 2.2, y: (car.pos.y - d.pos.y) * 2.2, z: 0 }
    sfx('touch')
    this.s.hint(hint)
    this.clearMarks()
    try { await ch.wait(1.4) } catch (e) { if (e instanceof Cancelled) return; throw e }
    for (const [id, at] of this.home) { const p = this.p(id); p.pos = { ...at }; w.prev.set(id, { ...at }); p.vel = { x: 0, y: 0 }; p.target = null }
    ch.give(sp.carrier)
    this.start()
  }

  private clearMarks() { this.s.st.view.overlays.beginMarkers(); this.s.st.view.overlays.endMarkers() }
  dispose() { this.clearMarks(); this.s.timeScale(1) }
}

/* ======================================================================== first touch */

/** The ball comes with a defender at the back: show the free grass and push the first touch there. */
class FirstTouch implements Challenge {
  controls: ControlKey[] = []
  stick = true
  private phase: 'setup' | 'coming' | 'lost' | 'gone' = 'setup'
  private done: (() => void) | null = null
  private home = new Map<string, V2>()
  private tapDir: V2 | null = null
  constructor(private spec: Extract<ChallengeSpec, { type: 'firstTouch' }>, private s: StorySession) {}
  get w() { return this.s.world() }
  private p(id: string) { return this.w.get(id)! }
  private get space(): V2 { return { x: this.spec.space[0], y: this.spec.space[1] } }

  async run() {
    const ch = this.s.choreo, sp = this.spec
    if (sp.setup) await sp.setup(ch)
    for (const id of [sp.player, sp.from, sp.defender]) { const p = this.p(id); p.meta.scripted = true; p.target = null; this.home.set(id, { ...p.pos }) }
    this.s.camera({ kind: 'on', who: [sp.player, sp.defender], dist: 6.5, height: 4.2 }, true)
    void this.start()
    await new Promise<void>((r) => { this.done = r })
    this.s.timeScale(1)
    this.s.prompt(null); this.s.hint(null); this.s.setControls([], false)
    this.clearMarks()
    if (sp.after) await sp.after(this.s.choreo)
  }

  private async start() {
    const sp = this.spec, ch = this.s.choreo
    this.tapDir = null
    ch.give(sp.from)
    this.s.prompt(sp.prompt ?? 'play.firstTouch')
    this.s.setControls(['pass'], true)
    try { await ch.wait(0.5) } catch (e) { if (e instanceof Cancelled) return; throw e }
    this.phase = 'coming'
    void ch.pass(sp.from, sp.player).catch(() => {})
  }

  frame(_dt: number, input: Input) {
    if (this.phase !== 'coming') return
    const sp = this.spec, me = this.p(sp.player), d = this.p(sp.defender), w = this.w
    // the defender closes in at his back
    const fromD = norm(me.pos.x - d.pos.x, me.pos.y - d.pos.y)
    d.target = { x: me.pos.x - fromD.x * 0.8, y: me.pos.y - fromD.y * 0.8 }; d.speedMode = 0.45; d.faceTarget = me.pos
    const ballD = dist2(w.ball2(), me.pos)
    this.s.timeScale(w.ball.owner === sp.player ? 1 : ballD < 7 ? 0.3 : 1)
    const toSpace = norm(this.space.x - me.pos.x, this.space.y - me.pos.y)
    const dir = this.tapDir ?? this.s.stickDir() ?? (this.s.autoplay ? toSpace : null)
    const o = this.s.st.view.overlays
    o.beginMarkers()
    o.marker('space', this.space, OVERLAY_COLORS.gold, { radius: 2.4, fill: 0.12 })
    o.marker('me', me.pos, OVERLAY_COLORS.gold, { radius: 0.7, fill: 0.2 })
    o.marker('def', d.pos, OVERLAY_COLORS.b, { radius: 0.7, opacity: 0.7 })
    if (dir) o.marker('dir', { x: me.pos.x + dir.x * 1.4, y: me.pos.y + dir.y * 1.4 }, OVERLAY_COLORS.gold, { radius: 0.3, fill: 0.6 })
    o.endMarkers()
    const arrived = w.ball.owner === sp.player || ballD < 0.6
    if (input.pressed('pass') || (this.s.autoplay && ballD < 1.2) || arrived) this.decide(dir, arrived)
  }

  pointer(e: PointerEvent) {
    if (this.phase !== 'coming') return false
    const g = this.s.st.view.groundPoint(e.clientX, e.clientY)
    const me = this.p(this.spec.player)
    if (g) this.tapDir = norm(g.x - me.pos.x, g.y - me.pos.y)
    return true
  }

  private decide(dir: V2 | null, arrived: boolean) {
    const sp = this.spec, me = this.p(sp.player), d = this.p(sp.defender), w = this.w
    const toSpace = norm(this.space.x - me.pos.x, this.space.y - me.pos.y)
    const good = !!dir && dir.x * toSpace.x + dir.y * toSpace.y > Math.cos(1.0)
    if (!good) {
      // pressed too soon without a direction: wait for the ball; otherwise it dies under the foot
      if (!arrived && !dir) return
      void this.lose(dir ? 'play.firstTouchWrong' : 'play.firstTouchUnder')
      return
    }
    // the touch: a metre aside, away from him, towards the free grass; he goes through empty air
    this.phase = 'gone'
    this.s.timeScale(1)
    const dv = dir!
    w.ballScript = null
    w.ball.owner = null
    w.ball.pos = { x: me.pos.x + dv.x * 0.3, y: me.pos.y + dv.y * 0.3, z: 0.11 }
    w.ball.vel = { x: dv.x * 2.6, y: dv.y * 2.6, z: 0 }
    me.target = { x: me.pos.x + dv.x * 1.2, y: me.pos.y + dv.y * 1.2 }; me.speedMode = 0.55
    d.target = { x: me.pos.x - dv.x * 0.2, y: me.pos.y - dv.y * 0.2 }; d.speedMode = 0.9
    d.anim = 'tackle'; d.animT = 0
    sfx('touch')
    if (sp.touchLines) this.s.say(sp.touchLines).catch(() => {})
    const r = this.done; this.done = null; r?.()
  }

  private async lose(hint: string) {
    const sp = this.spec, ch = this.s.choreo, w = this.w
    this.phase = 'lost'
    this.s.timeScale(1)
    const me = this.p(sp.player), d = this.p(sp.defender)
    // stopped dead: the defender is already on him and takes it
    if (w.ball.owner !== sp.player) ch.give(sp.player)
    d.target = { ...me.pos }; d.speedMode = 0.9
    this.s.hint(hint)
    sfx('fail')
    this.clearMarks()
    try {
      await ch.wait(0.5)
      ch.give(sp.defender); d.anim = 'tackle'; d.animT = 0
      sfx('touch')
      await ch.wait(1.2)
    } catch (e) { if (e instanceof Cancelled) return; throw e }
    for (const [id, at] of this.home) { const p = this.p(id); p.pos = { ...at }; w.prev.set(id, { ...at }); p.vel = { x: 0, y: 0 }; p.target = null }
    void this.start()
  }

  private clearMarks() { this.s.st.view.overlays.beginMarkers(); this.s.st.view.overlays.endMarkers() }
  dispose() { this.clearMarks(); this.s.timeScale(1) }
}
