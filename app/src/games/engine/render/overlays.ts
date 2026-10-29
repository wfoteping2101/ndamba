// Tactical drawings on the grass: pass lanes coloured by risk, numbered arrows (pass solid, run dashed,
// dribble wavy, shot thick, press short red) in the books' notation, zones, rings under players,
// a target marker and trajectories. Flat ribbons just above the ground, no textures to download.
import * as THREE from 'three'
import type { Frame } from './stage'

export const OVERLAY_COLORS = {
  open: '#13804F', tight: '#F5B700', closed: '#D7263D',
  a: '#0B5D3B', b: '#D7263D', n: '#F5B700', soft: '#F6F7F2', chalk: '#F6F7F2', run: '#F6F7F2', gold: '#F5B700',
}

const Y = 0.025

function ribbon(points: THREE.Vector2[], width: number, color: string, opacity = 0.9, dash = 0) {
  // build a flat strip along a polyline in the ground plane (x, z)
  const pos: number[] = [], idx: number[] = []
  let acc = 0
  const lens = [0]
  for (let i = 1; i < points.length; i++) { acc += points[i].distanceTo(points[i - 1]); lens.push(acc) }
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)]
    const d = new THREE.Vector2(b.x - a.x, b.y - a.y).normalize()
    const n = new THREE.Vector2(-d.y, d.x).multiplyScalar(width / 2)
    pos.push(p.x + n.x, Y, p.y + n.y, p.x - n.x, Y, p.y - n.y)
  }
  for (let i = 0; i < points.length - 1; i++) {
    if (dash > 0 && Math.floor(((lens[i] + lens[i + 1]) / 2) / dash) % 2 === 1) continue
    const k = i * 2
    idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }))
  m.renderOrder = 2
  return m
}

function arrowHead(at: THREE.Vector2, dir: THREE.Vector2, size: number, color: string, opacity = 0.95) {
  const d = dir.clone().normalize()
  const n = new THREE.Vector2(-d.y, d.x)
  const tip = at
  const l = at.clone().sub(d.clone().multiplyScalar(size)).add(n.clone().multiplyScalar(size * 0.55))
  const r = at.clone().sub(d.clone().multiplyScalar(size)).sub(n.clone().multiplyScalar(size * 0.55))
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute([tip.x, Y + 0.002, tip.y, l.x, Y + 0.002, l.y, r.x, Y + 0.002, r.y], 3))
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }))
  m.renderOrder = 3
  return m
}

export type ArrowKind = 'pass' | 'run' | 'dribble' | 'shot' | 'press' | 'lane'

export class Overlays {
  group = new THREE.Group()
  private layers = new Map<string, THREE.Group>()
  constructor(private frame: Frame) { this.group.name = 'overlays' }

  layer(name: string) {
    let g = this.layers.get(name)
    if (!g) { g = new THREE.Group(); g.name = name; this.layers.set(name, g); this.group.add(g) }
    return g
  }
  clear(name?: string) {
    const list = name ? [this.layers.get(name)].filter(Boolean) as THREE.Group[] : [...this.layers.values()]
    for (const g of list) {
      for (const c of [...g.children]) {
        g.remove(c)
        const m = c as THREE.Mesh
        m.geometry?.dispose()
        ;(m.material as THREE.Material)?.dispose()
      }
    }
  }
  show(name: string, v: boolean) { this.layer(name).visible = v }

  private v2(x: number, y: number) { return new THREE.Vector2(this.frame.x(x), this.frame.z(y)) }

  /** A numbered arrow in the books' notation. from/to in sim metres. */
  arrow(layer: string, from: { x: number; y: number }, to: { x: number; y: number }, kind: ArrowKind, color?: string, opts: { width?: number; opacity?: number; trim?: number } = {}) {
    const g = this.layer(layer)
    const a = this.v2(from.x, from.y), b = this.v2(to.x, to.y)
    const dir = b.clone().sub(a)
    const len = dir.length()
    if (len < 0.2) return
    const trim = opts.trim ?? 0.45
    const d = dir.clone().normalize()
    const a2 = a.clone().add(d.clone().multiplyScalar(Math.min(trim, len * 0.3)))
    const b2 = b.clone().sub(d.clone().multiplyScalar(Math.min(trim, len * 0.3)))
    const col = color ?? (kind === 'press' ? OVERLAY_COLORS.b : kind === 'run' ? OVERLAY_COLORS.run : kind === 'lane' ? OVERLAY_COLORS.open : OVERLAY_COLORS.chalk)
    const width = opts.width ?? (kind === 'shot' ? 0.32 : kind === 'lane' ? 0.5 : 0.17)
    const pts: THREE.Vector2[] = []
    const n = Math.max(2, Math.ceil(len / 0.25))
    const nrm = new THREE.Vector2(-d.y, d.x)
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const p = a2.clone().lerp(b2, t)
      if (kind === 'dribble') p.add(nrm.clone().multiplyScalar(Math.sin(t * len * 2.2) * 0.25))
      pts.push(p)
    }
    g.add(ribbon(pts, width, col, opts.opacity ?? 0.92, kind === 'run' ? 0.55 : 0))
    if (kind !== 'lane') g.add(arrowHead(b2.clone().add(d.clone().multiplyScalar(0.3)), d, kind === 'shot' ? 0.75 : 0.55, col, opts.opacity ?? 0.95))
  }

  /** Ring on the ground under a player (selection, receiver highlight). */
  ring(layer: string, at: { x: number; y: number }, color: string, radius = 0.55, opacity = 0.9) {
    const g = this.layer(layer)
    const m = new THREE.Mesh(new THREE.RingGeometry(radius * 0.78, radius, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }))
    m.rotation.x = -Math.PI / 2
    m.position.set(this.frame.x(at.x), Y + 0.004, this.frame.z(at.y))
    m.renderOrder = 4
    g.add(m)
    return m
  }

  /** Filled translucent rectangle (zones of the diagrams). */
  zone(layer: string, x: number, y: number, w: number, h: number, color: string, opacity = 0.18) {
    const g = this.layer(layer)
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }))
    m.rotation.x = -Math.PI / 2
    m.position.set(this.frame.x(x + w / 2), Y - 0.004, this.frame.z(y + h / 2))
    m.renderOrder = 1
    g.add(m)
    return m
  }

  /** A polyline trajectory (replays). */
  path(layer: string, pts: { x: number; y: number }[], color: string, width = 0.09, opacity = 0.75) {
    if (pts.length < 2) return
    this.layer(layer).add(ribbon(pts.map((p) => this.v2(p.x, p.y)), width, color, opacity))
  }

  /** A pulsing target disc. Returns the mesh so callers can animate it. */
  target(layer: string, at: { x: number; y: number }, color = OVERLAY_COLORS.gold) {
    const g = this.layer(layer)
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.5, 28), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, depthWrite: false }))
    m.rotation.x = -Math.PI / 2
    m.position.set(this.frame.x(at.x), Y + 0.002, this.frame.z(at.y))
    m.renderOrder = 3
    g.add(m)
    return m
  }

  dispose() { this.clear(); this.group.removeFromParent() }
}
