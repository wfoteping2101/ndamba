// Analyse vidéo: a recorded attempt replayed in 3D. Slow motion, frame by frame, jumps to the
// events, the ball's path, a player's path, the carrier's passing lanes and the opponent lines at
// any moment: the freeze frames of chapter 6 and the analyst's video of chapter 33, on our own actions.
import { GameLoop, SimView } from '../../engine/runtime'
import { OVERLAY_COLORS } from '../../engine/render/overlays'
import type { CamMode } from '../../engine/render/cameraRig'
import { ReplayPlayer, type Replay } from '../../engine/replay'
import { defensiveLines, passOptions } from '../../engine/sim/lanes'

export interface AnalyseState {
  t: number
  duration: number
  playing: boolean
  speed: number
  camera: CamMode
  layers: { ball: boolean; lanes: boolean; lines: boolean; path: boolean }
  selected: string | null
}

export const SPEEDS = [0.25, 0.5, 1, 2]
export const STEP = 0.05

export class AnalyseSession {
  view: SimView
  loop: GameLoop
  player: ReplayPlayer
  state: AnalyseState
  private listeners = new Set<() => void>()
  private notifyAt = 0
  private disposers: (() => void)[] = []

  constructor(el: HTMLElement, public replay: Replay) {
    this.player = new ReplayPlayer(replay)
    this.view = new SimView(el, this.player.world, { surround: 'training' })
    this.loop = new GameLoop(this.player.world, this.view)
    this.state = { t: 0, duration: this.player.duration, playing: false, speed: 0.5, camera: 'tactical', layers: { ball: true, lanes: true, lines: false, path: false }, selected: null }
    // the replay drives the world: no simulation step, only seeking
    this.loop.onTick = () => {}
    this.loop.onFrame = (dt) => this.frame(dt)
    this.loop.simulate = () => {}
    // GameLoop steps the world; a replay world must not move by itself
    this.player.world.step = () => {}
    const canvas = this.view.stage.renderer.domElement
    const down = (e: PointerEvent) => {
      const p = this.view.pickPlayer(e.clientX, e.clientY)
      this.set({ selected: p ? p.id : null, layers: { ...this.state.layers, path: !!p || this.state.layers.path } })
      this.draw()
    }
    canvas.addEventListener('pointerdown', down)
    this.disposers.push(() => canvas.removeEventListener('pointerdown', down))
    this.seek(0)
    this.loop.start()
  }

  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn) } }
  private set(p: Partial<AnalyseState>) { this.state = { ...this.state, ...p }; for (const l of this.listeners) l() }

  seek(t: number) {
    this.player.seek(t)
    this.state.t = this.player.t
    this.draw()
    this.set({ t: this.player.t })
  }
  stepFrames(n: number) { this.set({ playing: false }); this.seek(this.state.t + n * STEP) }
  toggle() { if (this.state.t >= this.state.duration - 0.01) this.seek(0); this.set({ playing: !this.state.playing }) }
  setSpeed(s: number) { this.set({ speed: s }) }
  setLayer(k: keyof AnalyseState['layers'], v: boolean) { this.set({ layers: { ...this.state.layers, [k]: v } }); this.draw() }
  setCamera(m: CamMode) { this.view.setCamera(m); this.set({ camera: m }) }
  cycleCamera() {
    const order: CamMode[] = ['tactical', 'broadcast', 'player', 'cinematic', 'free']
    this.setCamera(order[(order.indexOf(this.state.camera) + 1) % order.length])
  }

  /** Events of the replay worth jumping to. */
  events() {
    return this.replay.events.filter((e) => ['pass_complete', 'pass_lost', 'shot', 'goal', 'regain', 'loss'].includes(e.type))
  }

  private frame(dt: number) {
    if (!this.state.playing) return
    const t = this.state.t + dt * this.state.speed
    if (t >= this.state.duration) { this.seek(this.state.duration); this.set({ playing: false }); return }
    this.player.seek(t)
    this.state.t = t
    this.draw()
    const now = performance.now()
    if (now - this.notifyAt > 80) { this.notifyAt = now; this.set({ t }) }
  }

  private draw() {
    const o = this.view.overlays
    const w = this.player.world
    const L = this.state.layers
    o.clear()
    o.beginMarkers()
    if (L.ball) {
      const path = this.player.ballPath(Math.max(0, this.state.t - 4), this.state.t)
      if (path.length > 1) o.path('ov', path, OVERLAY_COLORS.gold, 0.08, 0.8)
    }
    if (L.path && this.state.selected) {
      const path = this.player.playerPath(this.state.selected, Math.max(0, this.state.t - 6), this.state.t)
      if (path.length > 1) o.path('ov', path, OVERLAY_COLORS.chalk, 0.1, 0.85)
      const p = w.get(this.state.selected)
      if (p) o.marker('sel', p.pos, OVERLAY_COLORS.chalk, { radius: 0.8 })
    }
    const own = w.owner()
    if (own) o.marker('carrier', own.pos, OVERLAY_COLORS.gold, { radius: 0.75, fill: 0.2 })
    if (L.lanes && own && own.pos.x > -10) {
      for (const opt of passOptions(w, own)) {
        if (!opt.receiver || opt.receiver.pos.x < -10) continue
        o.arrow('ov', own.pos, opt.target, 'lane', opt.margin > 0.35 ? OVERLAY_COLORS.open : opt.margin > 0 ? OVERLAY_COLORS.tight : OVERLAY_COLORS.closed, { opacity: 0.4, trim: 0.7 })
      }
    }
    if (L.lines && own) {
      const side = own.team === 'b' ? 'b' : 'a'
      for (const l of defensiveLines(w.opponents(own).filter((p) => p.pos.x > -10), side)) o.arrow('ov', { x: l.x, y: Math.max(0, l.minY - 2) }, { x: l.x, y: Math.min(w.pitch.h, l.maxY + 2) }, 'lane', OVERLAY_COLORS.b, { opacity: 0.4, width: 0.12 })
    }
    o.endMarkers()
  }

  dispose() { this.loop.stop(); for (const d of this.disposers) d(); this.view.dispose(); this.listeners.clear() }
}
