// Lecture du jeu on screen: the frozen picture, the two questions (the intention, then the
// receiver), the verdict drawn on the grass, then the continuation played in 3D.
import { GameLoop, SimView } from '../../engine/runtime'
import { OVERLAY_COLORS } from '../../engine/render/overlays'
import type { Quality } from '../../engine/render/stage'
import type { CamMode } from '../../engine/render/cameraRig'
import type { Player } from '../../engine/sim/types'
import { Input } from '../../engine/input/input'
import { sfx } from '../../shared/audio'
import { judge, linesAhead, readSituation, type Answer, type Intention, type Reading, type Verdict } from './judge'
import { makeSituation, type Situation } from './situations'

export type LecturePhase = 'intro' | 'intention' | 'receiver' | 'verdict' | 'outcome' | 'summary'
export const SERIES_LENGTH = 8

export interface LectureState {
  phase: LecturePhase
  index: number
  total: number
  score: number
  max: number
  intention: Intention | null
  verdict: Verdict | null
  reading: Reading | null
  /** our players numbered for the keyboard (1..n), the carrier excluded */
  numbers: { id: string; n: number }[]
  answers: { intention: Intention; best: Intention; points: number; valid: boolean }[]
  drillTitle: string
  camera: CamMode
}

export class LectureSession {
  view: SimView
  loop: GameLoop
  input = new Input()
  state: LectureState
  situation: Situation
  private listeners = new Set<() => void>()
  private outcomeUntil = 0
  private disposers: (() => void)[] = []

  constructor(el: HTMLElement, private base: number, private lang: 'fr' | 'en', quality?: Quality) {
    this.situation = makeSituation(0, base)
    this.view = new SimView(el, this.situation.world, { quality, surround: 'training' })
    this.loop = new GameLoop(this.situation.world, this.view)
    this.state = { phase: 'intro', index: 0, total: SERIES_LENGTH, score: 0, max: SERIES_LENGTH * 4, intention: null, verdict: null, reading: null, numbers: [], answers: [], drillTitle: '', camera: 'tactical' }
    this.loop.timeScale = 0
    this.loop.onTick = () => {
      if (this.state.phase === 'outcome' && this.situation.world.t > this.outcomeUntil) { this.loop.timeScale = 0; this.set({ phase: 'verdict' }) }
    }
    this.loop.onFrame = () => this.frame()
    const canvas = this.view.stage.renderer.domElement
    const down = (e: PointerEvent) => this.onPointer(e)
    canvas.addEventListener('pointerdown', down)
    this.disposers.push(() => canvas.removeEventListener('pointerdown', down))
    this.show(0)
    this.state.phase = 'intro'
    this.loop.start()
  }

  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn) } }
  private set(p: Partial<LectureState>) { this.state = { ...this.state, ...p }; for (const l of this.listeners) l() }

  get world() { return this.situation.world }
  get carrier(): Player { return this.situation.carrier }

  /** Load question i: freeze the picture and draw it. */
  private show(i: number) {
    this.situation = makeSituation(i, this.base)
    this.loop.setWorld(this.situation.world)
    this.loop.timeScale = 0
    const w = this.world
    const c = this.carrier
    // number our players from the back to the front, for the keyboard
    const mates = w.players.filter((p) => p !== c && (p.team === 'a' || p.team === 'n')).sort((a, b) => a.pos.x - b.pos.x || a.pos.y - b.pos.y)
    const numbers = mates.map((p, k) => ({ id: p.id, n: k + 1 }))
    this.view.labels.clear()
    for (const m of numbers) this.view.labels.set(m.id, { id: m.id, text: String(m.n), tone: w.get(m.id)!.team === 'n' ? 'n' : 'a' })
    this.view.labels.set(c.id, { id: c.id, text: this.lang === 'en' ? 'Ball' : 'Ballon', tone: 'gold', big: true })
    const reading = readSituation(w, c)
    this.drawPicture()
    this.view.setCamera(this.state.camera, true)
    const d = this.situation.drill
    this.set({ index: i, intention: null, verdict: null, reading, numbers, phase: 'intention', drillTitle: `${d.id} ${this.lang === 'en' ? d.en.title : d.fr.title}` })
  }

  private drawPicture() {
    const o = this.view.overlays
    o.clear()
    const w = this.world
    o.beginMarkers()
    o.marker('carrier', this.carrier.pos, OVERLAY_COLORS.gold, { radius: 0.85, fill: 0.25 })
    for (const p of w.players) if (p !== this.carrier && (p.team === 'a' || p.team === 'n')) o.marker(p.id, p.pos, p.team === 'n' ? OVERLAY_COLORS.n : '#7FD3A2', { radius: 0.6, opacity: 0.7 })
    o.endMarkers()
    // the opponent lines ahead of the ball, as the book draws them
    for (const l of linesAhead(w, this.carrier)) o.arrow('lines', { x: l.x, y: Math.max(0, l.minY - 2) }, { x: l.x, y: Math.min(w.pitch.h, l.maxY + 2) }, 'lane', OVERLAY_COLORS.b, { opacity: 0.35, width: 0.12 })
  }

  start() { sfx('whistle'); this.set({ phase: 'intention' }) }

  chooseIntention(i: Intention) {
    if (this.state.phase !== 'intention' && this.state.phase !== 'receiver') return
    sfx('tap')
    this.set({ intention: i, phase: 'receiver' })
  }

  /** The receiver (a player id) or 'shot'. */
  answer(receiver: string | 'shot') {
    if (this.state.phase !== 'receiver' || !this.state.intention || !this.state.reading) return
    const a: Answer = { intention: this.state.intention, receiver }
    const v = judge(this.world, this.state.reading, a)
    this.drawVerdict(a, v)
    const r = this.state.reading
    sfx(v.points >= 3 ? 'point' : v.points >= 2 ? 'tap' : 'fail')
    this.set({
      verdict: v, phase: 'verdict', score: this.state.score + v.points,
      answers: [...this.state.answers, { intention: a.intention, best: r.best, points: v.points, valid: v.intentionOk }],
    })
  }

  private drawVerdict(a: Answer, v: Verdict) {
    const o = this.view.overlays
    const w = this.world
    const r = this.state.reading!
    const c = this.carrier
    o.clear('lanes')
    for (const opt of r.options) {
      if (!opt.receiver) continue
      o.arrow('lanes', c.pos, opt.target, 'lane', opt.margin > 0.35 ? OVERLAY_COLORS.open : opt.margin > 0 ? OVERLAY_COLORS.tight : OVERLAY_COLORS.closed, { opacity: opt.margin > 0 ? 0.32 : 0.5, trim: 0.7 })
    }
    // the book's best answer (dashed) and the player's (gold)
    const goal = w.pitch.goalFor.a
    if (r.bestAnswer && r.bestAnswer !== a.receiver) {
      const to = r.bestAnswer === 'shot' ? goal : w.get(r.bestAnswer)?.pos
      if (to) o.arrow('lanes', c.pos, to, 'run', OVERLAY_COLORS.chalk, { opacity: 0.9, trim: 0.6 })
    }
    const mine = a.receiver === 'shot' ? goal : v.option?.target ?? w.get(a.receiver)?.pos
    if (mine) o.arrow('lanes', c.pos, mine, a.receiver === 'shot' ? 'shot' : 'pass', OVERLAY_COLORS.gold, { opacity: 1, trim: 0.5 })
  }

  /** Play the answer out: the pass (or the shot) and three seconds of football. */
  playOutcome() {
    if (this.state.phase !== 'verdict') return
    const w = this.world
    const c = this.carrier
    const last = this.state.answers[this.state.answers.length - 1]
    const v = this.state.verdict
    if (!last || !v) return
    this.view.overlays.clear('lanes')
    if (v.option?.receiver) w.requestPass(c, v.option.target, { receiver: v.option.receiver.id, by: 'user' })
    else if (w.pitch.goalFor.a) { const g = w.pitch.goalFor.a; w.requestShot(c, { x: g.x, y: g.y + (w.rng.next() - 0.5) * g.width * 0.6 }, 0.6, 22, 'user') }
    sfx('kick')
    this.outcomeUntil = w.t + 3.2
    this.loop.timeScale = 1
    this.set({ phase: 'outcome' })
  }

  next() {
    const i = this.state.index + 1
    if (i >= SERIES_LENGTH) { this.loop.timeScale = 0; sfx(this.state.score >= this.state.max * 0.6 ? 'success' : 'fail'); this.set({ phase: 'summary' }); return }
    this.show(i)
  }

  restart(base: number) {
    this.base = base
    this.set({ score: 0, answers: [] })
    this.show(0)
  }

  setCamera(m: CamMode) { this.view.setCamera(m); this.set({ camera: m }) }
  cycleCamera() {
    const order: CamMode[] = ['tactical', 'player', 'free']
    this.setCamera(order[(order.indexOf(this.state.camera) + 1) % order.length])
  }

  private onPointer(e: PointerEvent) {
    if (this.state.phase !== 'receiver') return
    const c = this.carrier
    const p = this.view.pickPlayer(e.clientX, e.clientY, (q) => q !== c && (q.team === 'a' || q.team === 'n'))
    if (p) { this.answer(p.id); return }
    const goal = this.world.pitch.goalFor.a
    const pt = this.view.groundPoint(e.clientX, e.clientY)
    if (goal && pt && Math.hypot(pt.x - goal.x, pt.y - goal.y) < Math.max(4, goal.width)) this.answer('shot')
  }

  private frame() {
    this.input.poll(performance.now() / 1000)
    if (this.input.pressed('camera')) this.cycleCamera()
    this.input.endFrame()
  }

  /** Keyboard: 1..9 for the numbered players, T for the shot (handled by the React layer). */
  answerByNumber(n: number) {
    const m = this.state.numbers.find((x) => x.n === n)
    if (m) this.answer(m.id)
  }

  dispose() {
    this.loop.stop()
    for (const d of this.disposers) d()
    this.input.dispose()
    this.view.dispose()
    this.listeners.clear()
  }
}
