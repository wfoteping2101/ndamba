// Input abstraction: gameplay asks for actions ("pass", "shoot"), never for keys.
// Keyboard bindings use physical key codes, so WASD stays under the fingers on AZERTY keyboards.
// Gamepads use the standard mapping with a radial deadzone. Touch controls feed the same actions.
// Presses are buffered for a short window so a slightly early press still counts.
import type { V2 } from '../sim/math'

export type Action = 'pass' | 'through' | 'shoot' | 'sprint' | 'switch' | 'tackle' | 'camera' | 'pause' | 'skill'
export type Device = 'keyboard' | 'gamepad' | 'touch' | 'mouse'

export const DEFAULT_KEYS: Record<Action, string[]> = {
  pass: ['Space', 'KeyJ'],
  through: ['KeyL'],
  shoot: ['KeyK', 'KeyF'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  switch: ['KeyQ'],
  tackle: ['KeyE'],
  camera: ['KeyC'],
  pause: ['Escape', 'KeyP'],
  skill: ['KeyR'],
}
const MOVE_KEYS = { up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'] }
// standard gamepad mapping
const PAD: Partial<Record<Action, number[]>> = { pass: [0], shoot: [1], tackle: [2], through: [3], switch: [4], camera: [8], pause: [9], skill: [5] }
const STORE = 'ndamba.jeux.keys'

export function loadBindings(): Record<Action, string[]> {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) || 'null')
    if (raw && typeof raw === 'object') return { ...DEFAULT_KEYS, ...raw }
  } catch { /* storage blocked */ }
  return { ...DEFAULT_KEYS }
}
export function saveBindings(b: Record<Action, string[]>) {
  try { localStorage.setItem(STORE, JSON.stringify(b)) } catch { /* storage blocked */ }
}

/** Radial deadzone: inside -> zero; outside -> rescaled so motion starts smoothly at the edge. */
export function deadzone(x: number, y: number, dead = 0.18): V2 {
  const m = Math.hypot(x, y)
  if (m < dead) return { x: 0, y: 0 }
  const s = Math.min(1, (m - dead) / (1 - dead))
  return { x: (x / m) * s, y: (y / m) * s }
}

export class Input {
  bindings = loadBindings()
  lastDevice: Device = 'keyboard'
  private keys = new Set<string>()
  private down = new Map<Action, number>() // action -> time pressed (s)
  private presses = new Map<Action, number>() // unconsumed press time
  private releases = new Map<Action, number>() // release time with the hold duration
  private holdOnRelease = new Map<Action, number>()
  private touchAxis: V2 = { x: 0, y: 0 }
  private touchHeld = new Set<Action>()
  private padPrev = new Set<Action>()
  private now = 0
  enabled = true
  private target: Window

  constructor(target: Window = window) {
    this.target = target
    target.addEventListener('keydown', this.onKeyDown)
    target.addEventListener('keyup', this.onKeyUp)
    target.addEventListener('blur', this.onBlur)
  }
  dispose() {
    this.target.removeEventListener('keydown', this.onKeyDown)
    this.target.removeEventListener('keyup', this.onKeyUp)
    this.target.removeEventListener('blur', this.onBlur)
  }

  private actionsFor(code: string): Action[] {
    return (Object.keys(this.bindings) as Action[]).filter((a) => this.bindings[a].includes(code))
  }
  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.enabled) return
    const el = e.target as HTMLElement | null
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
    const acts = this.actionsFor(e.code)
    const isMove = Object.values(MOVE_KEYS).some((l) => l.includes(e.code))
    if (acts.length || isMove) {
      // keep the page from scrolling with space and arrows while playing
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault()
    }
    this.lastDevice = 'keyboard'
    if (e.repeat) return
    this.keys.add(e.code)
    for (const a of acts) this.press(a)
  }
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code)
    for (const a of this.actionsFor(e.code)) this.release(a)
  }
  private onBlur = () => { this.keys.clear(); this.down.clear(); this.touchHeld.clear(); this.touchAxis = { x: 0, y: 0 } }

  private press(a: Action) {
    if (!this.down.has(a)) { this.down.set(a, this.now); this.presses.set(a, this.now) }
  }
  private release(a: Action) {
    const t0 = this.down.get(a)
    if (t0 === undefined) return
    this.down.delete(a)
    this.releases.set(a, this.now)
    this.holdOnRelease.set(a, this.now - t0)
  }

  /** Touch controls call these. */
  touchMove(x: number, y: number) { this.touchAxis = { x, y }; if (x || y) this.lastDevice = 'touch' }
  touchButton(a: Action, isDown: boolean) {
    this.lastDevice = 'touch'
    if (isDown) { this.touchHeld.add(a); this.press(a) } else { this.touchHeld.delete(a); this.release(a) }
  }
  /** Pointer gestures (click a teammate) mark the mouse as the device. */
  pointer() { this.lastDevice = 'mouse' }

  /** Call once per rendered frame before reading. */
  poll(time: number) {
    this.now = time
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : []
    const pad = pads && Array.from(pads).find((p) => p && p.connected && p.mapping === 'standard')
    const now = new Set<Action>()
    if (pad) {
      for (const [a, idx] of Object.entries(PAD) as [Action, number[]][]) if (idx.some((i) => pad.buttons[i]?.pressed)) now.add(a)
      if ((pad.buttons[7]?.value ?? 0) > 0.4 || pad.buttons[6]?.pressed) now.add('sprint')
      for (const a of now) if (!this.padPrev.has(a)) { this.press(a); this.lastDevice = 'gamepad' }
      for (const a of this.padPrev) if (!now.has(a)) this.release(a)
      this.padPrev = now
      const ax = deadzone(pad.axes[0] ?? 0, pad.axes[1] ?? 0)
      if (ax.x || ax.y) this.lastDevice = 'gamepad'
      this.padAxis = { x: ax.x, y: -ax.y }
    } else this.padAxis = { x: 0, y: 0 }
  }
  private padAxis: V2 = { x: 0, y: 0 }

  /** Movement on screen axes: x right, y up (away from the viewer). Length <= 1. */
  axis(): V2 {
    if (!this.enabled) return { x: 0, y: 0 }
    let x = 0, y = 0
    const k = (l: string[]) => l.some((c) => this.keys.has(c))
    if (k(MOVE_KEYS.left)) x -= 1
    if (k(MOVE_KEYS.right)) x += 1
    if (k(MOVE_KEYS.up)) y += 1
    if (k(MOVE_KEYS.down)) y -= 1
    x += this.padAxis.x + this.touchAxis.x
    y += this.padAxis.y + this.touchAxis.y
    const m = Math.hypot(x, y)
    return m > 1 ? { x: x / m, y: y / m } : { x, y }
  }
  held(a: Action) { return this.enabled && (this.down.has(a) || this.touchHeld.has(a)) }
  holdTime(a: Action) { const t0 = this.down.get(a); return t0 === undefined ? 0 : this.now - t0 }
  /** A press within the buffer window, consumed when read. */
  pressed(a: Action, buffer = 0.15) {
    const t = this.presses.get(a)
    if (t === undefined || this.now - t > buffer) return false
    this.presses.delete(a)
    return true
  }
  /** A release since the last read, with how long the button was held (for charged shots and passes). */
  released(a: Action): number | null {
    const t = this.releases.get(a)
    if (t === undefined || this.now - t > 0.2) return null
    this.releases.delete(a)
    return this.holdOnRelease.get(a) ?? 0
  }
  /** Drop stale edges (call at the end of a frame). */
  endFrame() {
    for (const [a, t] of this.presses) if (this.now - t > 0.3) this.presses.delete(a)
    for (const [a, t] of this.releases) if (this.now - t > 0.3) this.releases.delete(a)
  }
  keyLabel(a: Action) {
    const code = this.bindings[a][0] ?? ''
    return code.replace(/^Key/, '').replace(/^Digit/, '').replace('ShiftLeft', 'Maj').replace('Space', 'Espace').replace('Escape', 'Échap')
  }
}
