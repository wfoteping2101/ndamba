// A chapter on screen: the stage, the beats one after the other, the subtitles, the walks, the
// football challenges, and a small state object React reads. Each beat builds its own place and
// cast, so any beat can be resumed from a save or skipped without breaking the next one.
import * as THREE from 'three'
import { Input } from '../../engine/input/input'
import type { BallLook } from '../../engine/render/ballView'
import type { Quality } from '../../engine/render/stage'
import { OVERLAY_COLORS } from '../../engine/render/overlays'
import type { V2 } from '../../engine/sim/math'
import { sfx } from '../../shared/audio'
import { CAST, type CastId } from '../cast'
import { framePose } from './camera'
import { Cancelled, Choreo, Superseded, type ChoreoHost } from './choreo'
import { makeChallenge, type Challenge, type ControlKey } from './challenges'
import { StoryStage } from './stage'
import type { Mood } from '../sets/common'
import { display } from './text'
import type { Action, ActorSpec, Beat, CamSpec, ExploreBeat, Line, PlayBeat, SceneBeat, Where } from './types'

export interface ChapterScript { no: number; beats: Beat[]; /** the ball of the chapter */ ball?: BallLook }

export interface ShownLine { who: string; name: string; text: string; color: string; thought: boolean; narr: boolean }

export interface StoryState {
  beat: number
  beats: number
  kind: Beat['kind'] | 'end'
  bridge: boolean
  line: ShownLine | null
  /** an instruction (i18n key of the 'lionceaux' namespace) and its values */
  prompt: { key: string; vars?: Record<string, string | number> } | null
  hint: { key: string; vars?: Record<string, string | number> } | null
  /** explore: someone close enough to talk to */
  near: { id: string; name: string } | null
  controls: ControlKey[]
  stick: boolean
  score: string | null
  paused: boolean
  lesson: number | null
  done: boolean
  skippable: boolean
  /** a frozen picture: the options on screen */
  choices: { key: string; canon: boolean }[] | null
}

export interface StoryOpts {
  quality?: Quality
  startBeat?: number
  autoAdvance?: boolean
  onSave?: (beat: number, done: boolean) => void
}

export class StorySession implements ChoreoHost {
  st: StoryStage
  input = new Input()
  choreo: Choreo
  state: StoryState
  autoAdvance: boolean
  /** QA: the challenges play the book's move by themselves */
  autoplay = false
  private listeners = new Set<() => void>()
  private notifyAt = 0
  private clock = 0
  private lineWait: { resolve: () => void; reject: (e: Error) => void; at: number; min: number } | null = null
  private explore: { beat: ExploreBeat; player: string; talked: Set<string>; resolve: () => void; yaw: number } | null = null
  private lessonWait: (() => void) | null = null
  private challenge: Challenge | null = null
  private follow: CamSpec | null = null
  private disposed = false
  private skipping = false
  private talking = false

  constructor(el: HTMLElement, public script: ChapterScript, public opts: StoryOpts = {}) {
    const first = script.beats.find((b): b is SceneBeat | ExploreBeat | PlayBeat => b.kind !== 'lesson')
    this.st = new StoryStage(el, { quality: opts.quality, place: first?.place ?? { id: 'bona', mood: 'morning' } })
    this.choreo = new Choreo(this)
    this.autoAdvance = opts.autoAdvance ?? true
    this.state = { beat: 0, beats: script.beats.length, kind: 'scene', bridge: false, line: null, prompt: null, hint: null, near: null, controls: [], stick: false, score: null, paused: false, lesson: null, done: false, skippable: false, choices: null }
    this.st.loop.onTick = (dt) => { this.choreo.tick(); this.challenge?.tick?.(dt) }
    this.st.loop.onFrame = (dt) => this.frame(dt)
    this.st.loop.start()
    void this.run(opts.startBeat ?? 0)
  }

  /* ---------------------------------------------------------------- React */

  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn) } }
  emit(force = false) {
    const now = performance.now()
    if (!force && now - this.notifyAt < 90) return
    this.notifyAt = now
    this.state = { ...this.state }
    for (const l of this.listeners) l()
  }
  set(p: Partial<StoryState>) { Object.assign(this.state, p); this.emit(true) }

  /* ---------------------------------------------------------------- ChoreoHost */

  world() { return this.st.world }
  mark(name: string) { return this.st.set?.marks[name] ?? null }
  timeScale(s: number) { this.st.loop.timeScale = this.state.paused ? 0 : s; this.scale = s }
  private scale = 1
  score(text: string | null) { this.set({ score: text }) }
  shake(a: number) { this.st.view.rig.shake(a) }
  mood(m: Mood) { this.st.setMood(m) }
  lanes(pairs: [V2, V2][] | null) {
    const o = this.st.view.overlays
    o.clear('story')
    if (pairs) for (const [a, b] of pairs) o.arrow('story', a, b, 'lane', undefined, { opacity: 0.75 })
  }
  camera(spec: CamSpec, cut = true) {
    this.follow = null
    if (spec.kind === 'match') { this.st.view.setCamera('broadcast', cut); return }
    if (spec.kind === 'follow') { this.follow = spec }
    const pose = framePose(spec, this.st.world, this.st.frame, (w) => this.choreo.pt(w))
    if (pose) this.st.view.rig.setShot(pose, { cut, rate: spec.kind === 'follow' ? 3.5 : cut ? 9 : 2.2 })
  }

  say(lines: Line[]): Promise<void> {
    return lines.reduce<Promise<void>>((p, l) => p.then(() => this.showLine(l)), Promise.resolve())
  }
  private showLine(l: Line): Promise<void> {
    if (this.skipping || this.disposed) return Promise.reject(new Cancelled())
    const text = display(l.text)
    const who = l.who === 'pensee' ? (l.of ?? 'bribri') : l.who
    const cast = who !== 'narr' ? CAST[who as CastId] : null
    this.set({ line: { who, name: cast?.name ?? '', text, color: cast?.color ?? '#F6F7F2', thought: l.who === 'pensee', narr: l.who === 'narr' } })
    // the speaker talks with his hands, if he is free to
    const actor = l.by ? this.st.world.get(l.by) : cast ? this.st.world.players.find((p) => p.meta.cast === who) : undefined
    const talking = actor && !actor.meta.pose && Math.hypot(actor.vel.x, actor.vel.y) < 0.3 && l.who !== 'pensee' ? actor : null
    if (talking) { talking.meta.pose = 'talk'; talking.meta.talkPose = true }
    const min = 0.35
    // a line said over another one (commentary during play) ends the earlier chain
    if (this.lineWait) { const old = this.lineWait; this.lineWait = null; old.reject(new Superseded()) }
    return new Promise<void>((resolve, reject) => {
      this.lineWait = { resolve, reject, at: this.clock, min }
    }).finally(() => {
      if (talking && talking.meta.talkPose) { talking.meta.pose = undefined; talking.meta.talkPose = undefined }
    })
  }
  /** Tap, Space, Enter: next line (or the instruction is understood). */
  advance() {
    if (this.state.paused) return
    const lw = this.lineWait
    if (lw && this.clock - lw.at >= lw.min) { this.lineWait = null; this.set({ line: null }); lw.resolve() }
  }
  /** QA: shorter reading times */
  readingScale = 1
  private readingTime(text: string) { return (1.6 + text.length * 0.055) * this.readingScale }

  /* ---------------------------------------------------------------- flow */

  private async run(start: number) {
    const beats = this.script.beats
    for (let i = Math.max(0, Math.min(start, beats.length - 1)); i < beats.length; i++) {
      if (this.disposed) return
      this.set({ beat: i, kind: beats[i].kind, bridge: 'bridge' in beats[i] ? !!(beats[i] as SceneBeat).bridge : false, prompt: null, hint: null, near: null, controls: [], stick: false, skippable: beats[i].kind === 'scene' })
      this.opts.onSave?.(i, false)
      this.choreo = new Choreo(this)
      this.skipping = false
      try { await this.runBeat(beats[i]) } catch (e) { if (!(e instanceof Cancelled)) console.error(e) }
      this.challenge?.dispose(); this.challenge = null
      this.lineWait = null
      this.timeScale(1)
      this.set({ line: null })
    }
    if (this.disposed) return
    this.set({ kind: 'end', done: true, prompt: null, hint: null, controls: [], stick: false, skippable: false })
    this.opts.onSave?.(beats.length, true)
  }

  private async runBeat(b: Beat) {
    if (b.kind === 'lesson') {
      this.set({ lesson: b.no })
      await new Promise<void>((r) => { this.lessonWait = r })
      this.set({ lesson: null })
      return
    }
    this.enter(b)
    if (b.kind === 'scene') await this.runScene(b)
    else if (b.kind === 'explore') await this.runExplore(b)
    else await this.runPlay(b)
  }

  /** Build the place and put the cast in it (unless the beat keeps the previous stage). */
  private enter(b: SceneBeat | ExploreBeat | PlayBeat) {
    this.st.view.overlays.clear('story')
    if (b.keep) return
    this.st.holdProp(null)
    this.st.load(b.place)
    this.st.clear()
    // everybody first, then where they look (they may look at each other)
    for (const a of b.cast) this.spawn({ ...a, face: typeof a.face === 'number' ? a.face : undefined, ball: false })
    for (const a of b.cast) {
      if (a.face !== undefined && typeof a.face !== 'number') this.faceNow(a.id, a.face)
      if (a.ball) this.choreo.give(a.id)
      if (a.carry) this.choreo.carry(a.id)
    }
    this.st.view.labels.clear()
    this.st.view.ball.setLook(this.script.ball ?? 'mami')
    // the sounds of the game: kicks, the net, the post
    this.st.world.on((e) => {
      if (e.type === 'kick') sfx('kick')
      else if (e.type === 'goal') { sfx('net'); this.shake(0.25) }
      else if (e.type === 'post') sfx('post')
      else if (e.type === 'control') sfx('touch')
    })
    this.set({ score: null })
  }
  spawn(a: ActorSpec) {
    const at = this.choreo.pt(a.at)
    const p = this.st.spawn({ id: a.id, cast: a.cast, team: a.team, at, pose: a.pose ?? null, gk: a.gk, number: a.number, variant: a.variant, look: a.look })
    if (a.face !== undefined) {
      if (typeof a.face === 'number') p.facing = a.face
      else { const t = this.choreo.pt(a.face); p.facing = Math.atan2(t.y - p.pos.y, t.x - p.pos.x) }
    }
    this.st.view.chars.get(p.id)?.snapFacing(p.facing)
    p.meta.scripted = true
    p.wantsBall = false
    if (a.ball) this.choreo.give(a.id)
    return p
  }

  private faceNow(id: string, to: Where) {
    const p = this.st.world.get(id)
    if (!p) return
    const t = this.choreo.pt(to)
    p.facing = Math.atan2(t.y - p.pos.y, t.x - p.pos.x)
    this.st.view.chars.get(p.id)?.snapFacing(p.facing)
  }

  private async runScene(b: SceneBeat) {
    try {
      for (const shot of b.shots) {
        this.camera(shot.cam, shot.cut !== false)
        for (const a of shot.do ?? []) this.act(a)
        const play = shot.play ? shot.play(this.choreo) : null
        if (shot.lines?.length) await this.say(shot.lines)
        if (play && !shot.parallel) await play
        else if (play) play.catch(() => {})
        if (shot.hold) await this.choreo.wait(shot.hold)
      }
    } catch (e) {
      if (!(e instanceof Cancelled)) throw e
    }
  }

  act(a: Action) {
    const c = this.choreo
    switch (a.a) {
      case 'move': c.go(a.id, a.to, a.speed); break
      case 'pose': c.pose(a.id, a.pose); break
      case 'face': c.face(a.id, a.to); break
      case 'look': c.look(a.id, a.at); break
      case 'spawn': this.spawn(a.actor); break
      case 'remove': { const w = this.st.world; const p = w.get(a.id); if (p) { w.players.splice(w.players.indexOf(p), 1); w.byId.delete(p.id); this.st.view.syncPlayers() } break }
      case 'ball': { const w = this.st.world; if (typeof a.at === 'string' && w.get(a.at)) c.give(a.at); else c.place(a.at); break }
      case 'mood': this.st.setMood(a.mood); break
      case 'sfx': sfx(a.kind); break
      case 'slow': this.timeScale(a.scale); break
      case 'score': this.score(a.text); break
      case 'ballLook': this.st.view.ball.setLook(a.look, a.flat); break
      case 'prop': this.st.holdProp(a.holder, a.look); break
    }
  }

  /** Skip the running scene (the next beat sets its own stage). */
  skip() {
    if (this.state.kind !== 'scene') return
    this.skipping = true
    this.choreo.cancel()
    const lw = this.lineWait; this.lineWait = null; lw?.resolve()
  }

  /* ---------------------------------------------------------------- explore */

  private runExplore(b: ExploreBeat) {
    const p = this.st.world.get(b.player)!
    p.meta.scripted = true
    const goal = this.choreo.pt(b.goal.at)
    // the camera keeps one direction: looking from the player towards the goal side
    const yaw = Math.atan2(goal.y - p.pos.y, goal.x - p.pos.x)
    this.set({ prompt: { key: b.goal.prompt }, stick: true, controls: ['talk'] })
    return new Promise<void>((resolve) => { this.explore = { beat: b, player: b.player, talked: new Set(), resolve, yaw } })
      .finally(() => { this.explore = null; this.st.view.overlays.clear('goal'); this.set({ stick: false, controls: [], near: null }) })
  }

  private exploreFrame() {
    const ex = this.explore!
    const w = this.st.world
    const p = w.get(ex.player)
    if (!p) return
    // movement from the stick, relative to the camera
    const a = this.input.axis()
    const busy = !!this.lineWait
    if (!busy && Math.hypot(a.x, a.y) > 0.05) {
      this.choreo.stop(p.id)
      const d = this.stickToSim(a)
      p.target = { x: p.pos.x + d.x * 2, y: p.pos.y + d.y * 2 }
      p.speedMode = this.input.held('sprint') ? 0.75 : 0.4
      p.faceTarget = null
    } else { p.target = null }
    // keep inside the place
    p.pos.x = Math.max(0.3, Math.min(w.pitch.w - 0.3, p.pos.x)); p.pos.y = Math.max(0.3, Math.min(w.pitch.h - 0.3, p.pos.y))
    // someone to talk to
    let near: { id: string; name: string } | null = null
    let bd = 2.0
    for (const t of ex.beat.talks) {
      const q = w.get(t.id)
      if (!q) continue
      const d = Math.hypot(q.pos.x - p.pos.x, q.pos.y - p.pos.y)
      if (d < bd) { bd = d; near = { id: t.id, name: CAST[q.meta.cast as CastId]?.name ?? '' } }
    }
    if ((near?.id ?? null) !== (this.state.near?.id ?? null)) this.set({ near })
    if (near && !busy && (this.input.pressed('pass') || this.input.pressed('skill'))) this.talk(near.id)
    // the goal opens once the people who matter have been heard
    const need = ex.beat.require ?? []
    const open = need.every((id) => ex.talked.has(id))
    const goal = this.choreo.pt(ex.beat.goal.at)
    const o = this.st.view.overlays
    o.beginMarkers()
    if (open) o.marker('goal', goal, OVERLAY_COLORS.gold, { radius: ex.beat.goal.r ?? 1.2, fill: 0.18 })
    for (const t of ex.beat.talks) { const q = w.get(t.id); if (q && !ex.talked.has(t.id)) o.marker('t-' + t.id, q.pos, OVERLAY_COLORS.chalk, { radius: 0.55, opacity: 0.8 }) }
    o.endMarkers()
    const toGoal = Math.hypot(goal.x - p.pos.x, goal.y - p.pos.y)
    if (open && !busy && toGoal < (ex.beat.goal.r ?? 1.2)) { p.target = null; ex.resolve() }
    else if (!open && toGoal < 4 && this.state.hint?.key !== 'explore.talkFirst' && need.length) this.set({ hint: { key: 'explore.talkFirst' } })
    else if (open && this.state.hint) this.set({ hint: null })
    // QA: walk to whoever is still to be heard, then to the goal
    if (this.autoplay && !busy) {
      const next = need.find((id) => !ex.talked.has(id)) ?? ex.beat.talks.find((t) => !ex.talked.has(t.id))?.id
      if (next && !open) { const q = w.get(next); if (q && Math.hypot(q.pos.x - p.pos.x, q.pos.y - p.pos.y) < 2.1) { this.choreo.stop(p.id); void this.talk(next) } else if (q && !this.choreo.isWalking(p.id)) this.choreo.go(p.id, next, 0.8) }
      else if (open && !this.choreo.isWalking(p.id)) this.choreo.go(p.id, [goal.x, goal.y], 0.8)
    }
    // camera: third person, behind the player; it swings round slowly as he turns, the right stick
    // (or a drag on the picture) turns it at will (a two-shot while talking)
    if (this.talking) return
    const look = this.input.look()
    const sp = Math.hypot(p.vel.x, p.vel.y)
    const dtc = 1 / 60
    if (Math.abs(look.x) > 0.05 || look.drag) ex.yaw += look.x * 2.2 * dtc + look.drag * 0.008
    else if (sp > 0.6 && !this.autoplay) {
      const want = Math.atan2(p.vel.y, p.vel.x)
      let d = want - ex.yaw
      while (d > Math.PI) d -= Math.PI * 2
      while (d < -Math.PI) d += Math.PI * 2
      // do not swing when he walks towards the camera
      if (Math.abs(d) < 2.2) ex.yaw += d * Math.min(1, 1.4 * dtc)
    }
    const back = { x: -Math.cos(ex.yaw), y: -Math.sin(ex.yaw) }
    const f = this.st.frame
    const h = (p.look.kid !== false ? 1.36 : 1.75) * (p.look.height ?? 1)
    this.st.view.rig.setShot({ pos: f.vec(p.pos.x + back.x * 4.4, p.pos.y + back.y * 4.4, h + 0.9), look: f.vec(p.pos.x - back.x * 2.2, p.pos.y - back.y * 2.2, h * 0.62), fov: 50 }, { rate: 4 })
  }

  /** Talk to someone during an exploration (button, key or tap on him). */
  async talk(id: string) {
    const ex = this.explore
    if (!ex || this.lineWait) return
    const t = ex.beat.talks.find((x) => x.id === id)
    if (!t) return
    const me = this.st.world.get(ex.player)!
    this.choreo.stop(me.id); me.target = null
    this.choreo.face(ex.player, id); this.choreo.face(id, ex.player)
    this.talking = true
    this.camera({ kind: 'on', who: [ex.player, id], dist: 3.4 }, false)
    try { await this.say(t.lines) } catch { /* left the chapter */ }
    this.talking = false
    ex.talked.add(id)
    this.emit(true)
  }

  private stickToSim(a: V2): V2 {
    const cam = this.st.stage.camera
    const f = new THREE.Vector3(); cam.getWorldDirection(f); f.y = 0
    if (f.lengthSq() < 1e-6) f.set(0, 0, -1)
    f.normalize()
    const r = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize()
    const d = r.multiplyScalar(a.x).add(f.multiplyScalar(a.y))
    const m = Math.max(1e-6, Math.hypot(d.x, d.z))
    const s = Math.min(1, Math.hypot(a.x, a.y))
    return { x: (d.x / m) * s, y: (d.z / m) * s }
  }

  /* ---------------------------------------------------------------- play */

  private async runPlay(b: PlayBeat) {
    this.set({ prompt: { key: b.prompt } })
    this.challenge = makeChallenge(b.challenge, this)
    this.set({ controls: this.challenge.controls, stick: this.challenge.stick })
    await this.challenge.run()
  }
  /** Challenges set their instruction and hint through these. */
  prompt(key: string | null, vars?: Record<string, string | number>) { this.set({ prompt: key ? { key, vars } : null }) }
  hint(key: string | null, vars?: Record<string, string | number>) { this.set({ hint: key ? { key, vars } : null }) }
  setControls(c: ControlKey[], stick = this.state.stick) { this.set({ controls: c, stick }) }
  /** a touch button that is not a standard action (dive left, dive right, touch) */
  pressControl(k: ControlKey) { this.challenge?.press?.(k) }
  stickDir(): V2 | null { const a = this.input.axis(); return Math.hypot(a.x, a.y) > 0.05 ? this.stickToSim(a) : null }

  /** Taps on the picture: talk to someone (explore), choose a partner (challenges), or next line. */
  pointer(e: PointerEvent) {
    if (this.state.paused) return
    this.input.pointer()
    if (this.challenge?.pointer?.(e)) return
    if (this.explore && !this.lineWait) {
      const p = this.st.view.pickPlayer(e.clientX, e.clientY, (q) => this.explore!.beat.talks.some((t) => t.id === q.id))
      if (p) { void this.talk(p.id); return }
      // tap on the ground: walk there
      const g = this.st.view.groundPoint(e.clientX, e.clientY)
      const me = this.st.world.get(this.explore.player)
      if (g && me) { this.choreo.go(me.id, [g.x, g.y], 0.4) }
      return
    }
    this.advance()
  }

  private onChoice: ((key: string) => void) | null = null
  offerChoices(opts: { key: string; canon: boolean }[] | null, cb?: (key: string) => void) { this.onChoice = cb ?? null; this.set({ choices: opts }) }
  choose(key: string) { this.onChoice?.(key) }

  /* ---------------------------------------------------------------- lesson */

  continueAfterLesson() { const r = this.lessonWait; this.lessonWait = null; r?.() }

  /* ---------------------------------------------------------------- frame */

  pause(v: boolean) { this.state.paused = v; this.st.loop.timeScale = v ? 0 : this.scale; this.input.enabled = !v; this.emit(true) }

  private frame(dt: number) {
    if (this.disposed) return
    this.input.poll(performance.now() / 1000)
    if (this.input.pressed('pause')) this.pause(!this.state.paused)
    if (!this.state.paused) {
      this.clock += dt
      if (this.lineWait && this.input.pressed('pass') && !this.explore) this.advance()
      const lw = this.lineWait
      if (lw && this.autoAdvance && this.state.line && this.clock - lw.at > this.readingTime(this.state.line.text)) this.advance()
      if (this.explore) this.exploreFrame()
      this.challenge?.frame?.(dt, this.input)
      if (this.follow) this.camera(this.follow, false)
    }
    this.st.update(dt)
    this.input.endFrame()
    this.emit()
  }

  dispose() {
    this.disposed = true
    this.choreo.cancel()
    this.lineWait?.resolve(); this.lessonWait?.()
    this.challenge?.dispose()
    this.input.dispose()
    this.st.dispose()
    this.listeners.clear()
  }
}

export function whereLabel(w: Where) { return Array.isArray(w) ? `${w[0]},${w[1]}` : w }
