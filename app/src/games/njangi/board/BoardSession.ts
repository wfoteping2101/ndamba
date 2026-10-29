// Tableau du coach in 3D: the board's diagram becomes a world. "Jouer" runs the numbered actions
// with the same director as the lessons' demonstrations; with live opponents the idea is tested
// against defenders who read the lanes, and every pass is measured when it is struck.
import type { DiagramSpec } from '../../../lib/types'
import { GameLoop, SimView } from '../../engine/runtime'
import { OVERLAY_COLORS } from '../../engine/render/overlays'
import type { CamMode } from '../../engine/render/cameraRig'
import { analysePass } from '../../engine/sim/lanes'
import type { Level } from '../../engine/sim/types'
import type { World } from '../../engine/sim/world'
import { DefenderBrain, HoldBrain, KeeperBrain, PhaseBrain, ShadowBrain, SupportBrain, CarrierBrain } from '../../engine/ai/brains'
import { DIFFICULTY } from '../../engine/sim/types'
import { sfx } from '../../shared/audio'
import { SequenceDirector } from '../drills/director'
import { buildScenario, stepTarget } from '../drills/scenario'
import { UserCarrierBrain } from '../drills/setup'

export interface PassReport { n: number; from: string; to: string; margin: number; interceptor: string | null; lines: number; outcome: 'ok' | 'lost' | 'pending' }
export interface BoardState {
  mode: 'edit' | 'play' | 'done'
  outcome: 'done' | 'failed' | null
  reason: string | null
  step: number
  steps: number
  passes: PassReport[]
  camera: CamMode
  opposition: 'shadow' | 'live'
  level: Level
}

export class BoardSession {
  view: SimView
  loop: GameLoop
  state: BoardState
  private world: World
  private director: SequenceDirector | null = null
  private listeners = new Set<() => void>()
  private spec: DiagramSpec
  private pitchKey = ''

  constructor(el: HTMLElement, spec: DiagramSpec) {
    this.spec = spec
    this.pitchKey = JSON.stringify([spec.view, spec.w, spec.h, spec.goals ?? null])
    this.world = buildScenario(spec, { asDrawn: true }).world
    this.view = new SimView(el, this.world, { surround: 'training' })
    this.loop = new GameLoop(this.world, this.view)
    this.state = { mode: 'edit', outcome: null, reason: null, step: 0, steps: 0, passes: [], camera: 'tactical', opposition: 'shadow', level: 'normal' }
    this.loop.onTick = () => this.tick()
    this.show(spec)
    this.loop.start()
  }

  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn) } }
  private set(p: Partial<BoardState>) { this.state = { ...this.state, ...p }; for (const l of this.listeners) l() }

  /** The static picture of the board (while editing). */
  show(spec: DiagramSpec) {
    this.spec = spec
    const key = JSON.stringify([spec.view, spec.w, spec.h, spec.goals ?? null])
    const sameSize = key === this.pitchKey
    this.pitchKey = key
    const sc = buildScenario(spec, { asDrawn: true })
    this.world = sc.world
    if (!sameSize) this.rebuildView()
    else this.loop.setWorld(this.world)
    for (const p of this.world.players) p.meta.scripted = true
    this.director = null
    this.drawArrows()
    this.labels()
    this.view.setCamera(this.state.camera, true)
    this.set({ mode: 'edit', outcome: null, reason: null, passes: [], step: 0, steps: 0 })
  }

  private rebuildView() {
    // a different pitch: a fresh view on the same container
    const el = this.view.container
    this.loop.stop()
    this.view.dispose()
    this.view = new SimView(el, this.world, { surround: 'training' })
    this.loop = new GameLoop(this.world, this.view)
    this.loop.onTick = () => this.tick()
    this.loop.start()
  }

  private labels() {
    this.view.labels.clear()
    for (const p of this.spec.players ?? []) if (p.label) this.view.labels.set(p.id, { id: p.id, text: p.label, tone: p.team === 'b' || p.team === 'gkb' ? 'b' : p.team === 'n' ? 'n' : 'a' })
  }

  private drawArrows(opacity = 0.85) {
    const o = this.view.overlays
    o.clear()
    for (const z of this.spec.zones ?? []) o.zone('board', z.x, z.y, z.w, z.h, z.tone === 'b' ? OVERLAY_COLORS.b : z.tone === 'n' ? OVERLAY_COLORS.n : z.tone === 'a' ? OVERLAY_COLORS.a : OVERLAY_COLORS.soft, 0.14)
    const at = new Map((this.spec.players ?? []).map((p) => [p.id, { x: p.x, y: p.y }]))
    const w = this.world
    const sc = buildScenario(this.spec, { asDrawn: true })
    for (const s of sc.steps) {
      const from = s.startAt ?? at.get(s.from)
      if (!from) continue
      const to = typeof s.to === 'string' ? at.get(s.to) ?? stepTarget(w, s) : s.to
      o.arrow('board', from, to, s.kind, s.kind === 'press' ? OVERLAY_COLORS.b : s.kind === 'shot' ? OVERLAY_COLORS.gold : s.kind === 'run' ? OVERLAY_COLORS.run : OVERLAY_COLORS.chalk, { opacity, trim: typeof s.to === 'string' ? 0.6 : 0 })
      if (s.kind === 'run' || s.kind === 'dribble') at.set(s.from, { ...to })
    }
  }

  setOpposition(o: 'shadow' | 'live') { this.set({ opposition: o }) }
  setLevel(l: Level) { this.set({ level: l }) }
  setCamera(m: CamMode) { this.view.setCamera(m); this.set({ camera: m }) }
  cycleCamera() {
    const order: CamMode[] = ['tactical', 'broadcast', 'player', 'cinematic', 'free']
    this.setCamera(order[(order.indexOf(this.state.camera) + 1) % order.length])
  }

  /** Play the numbered actions. */
  play() {
    const sc = buildScenario(this.spec, { seed: 5 })
    const w = sc.world
    this.world = w
    this.loop.setWorld(w)
    w.diff = DIFFICULTY[this.state.level]
    const live = this.state.opposition === 'live'
    for (const p of w.players) {
      const ours = p.team === 'a' || p.team === 'n'
      if (p.gk) w.brains.set(p.id, new KeeperBrain({ waitForCall: ours }))
      else if (ours) w.brains.set(p.id, new PhaseBrain(new UserCarrierBrain(new HoldBrain()), new HoldBrain(), new HoldBrain()))
      else w.brains.set(p.id, live ? new PhaseBrain(new CarrierBrain(new SupportBrain()), new SupportBrain(), new DefenderBrain()) : new ShadowBrain())
    }
    this.director = new SequenceDirector(w, sc.steps, { speed: 1 })
    const passes: PassReport[] = []
    let current = 0
    w.on((e) => {
      if (e.type === 'kick' && e.kind !== 'shot' && (e.team === 'a' || e.team === 'n')) {
        const p = w.get(e.by)
        const to = e.to ?? w.ball2()
        const recv = e.receiver ? w.get(e.receiver) ?? null : null
        // the lane is measured at the strike, as the defenders see it
        const a = p ? analysePass(w, p, to, recv) : null
        current = passes.length
        passes.push({ n: (this.director?.gi ?? 0) + 1, from: p?.label ?? e.by, to: recv?.label ?? (recv?.id ?? ''), margin: a?.margin ?? 0, interceptor: a?.interceptor ? (a.interceptor.label ?? a.interceptor.id) : null, lines: a?.linesBroken ?? 0, outcome: 'pending' })
        sfx('kick')
      }
      if (e.type === 'pass_complete' && passes[current]) passes[current].outcome = 'ok'
      if (e.type === 'pass_lost' && passes[current]) passes[current].outcome = 'lost'
      if (e.type === 'goal') sfx('net')
    })
    this.passesRef = passes
    this.drawArrows(0.3)
    this.set({ mode: 'play', outcome: null, reason: null, passes: [], step: 1, steps: this.director.groups.length })
  }
  private passesRef: PassReport[] = []

  private tick() {
    const d = this.director
    if (!d || this.state.mode !== 'play') return
    d.tick()
    const step = Math.min(d.gi + 1, d.groups.length)
    if (step !== this.state.step || this.passesRef.length !== this.state.passes.length || this.passesRef.some((p, i) => this.state.passes[i]?.outcome !== p.outcome)) this.set({ step, passes: this.passesRef.map((p) => ({ ...p })) })
    if (d.state !== 'running') {
      this.director = null
      sfx(d.state === 'done' ? 'success' : 'fail')
      this.set({ mode: 'done', outcome: d.state === 'done' ? 'done' : 'failed', reason: d.failReason, passes: this.passesRef.map((p) => ({ ...p })) })
    }
  }

  dispose() { this.loop.stop(); this.view.dispose(); this.listeners.clear() }
}

export const pitchW = (s: DiagramSpec) => (s.view === 'grid' ? s.w ?? 40 : s.view === 'third' ? 35 : s.view === 'half' ? 52.5 : 105)
export const pitchH = (s: DiagramSpec) => (s.view === 'grid' ? s.h ?? 30 : 68)
