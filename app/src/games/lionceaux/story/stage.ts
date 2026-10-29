// The stage of a chapter: one renderer for the whole chapter, the place of the current beat
// (a set built around a World of the right size), its light and air, and the cast.
// Changing place swaps the set and the World; the renderer, camera rig and characters stay.
import * as THREE from 'three'
import { GameLoop, SimView } from '../../engine/runtime'
import type { Quality } from '../../engine/render/stage'
import { BallView, type BallLook } from '../../engine/render/ballView'
import { World, makePlayer } from '../../engine/sim/world'
import type { PitchGeom } from '../../engine/sim/pitch'
import type { V2 } from '../../engine/sim/math'
import type { AnimState, Look, Player, Team } from '../../engine/sim/types'
import { CAST, type CastId } from '../cast'
import { applyMood, dust, fogBanks, rain, skyDome, type Air, type Mood } from '../sets/common'
import { SETS, type PlaceId } from '../sets'
import { sfx } from '../../shared/audio'
import type { SetHandle } from '../sets/bonamoussadi'

export interface Place { id: PlaceId; mood: Mood; opts?: Record<string, unknown> }

export interface Actor { id: string; cast: CastId; team?: Team; at: V2; facing?: number; pose?: AnimState | null; gk?: boolean; number?: number; variant?: number; look?: Partial<Look> }

export class StoryStage {
  view: SimView
  loop: GameLoop
  world: World
  set: SetHandle | null = null
  place: Place | null = null
  private airs: Air[] = []
  private sky: THREE.Mesh | null = null
  /** a second ball held by someone (Mami's ball in BriBri's hands while the cousins play with theirs) */
  private prop: { ball: BallView; holder: string } | null = null

  constructor(el: HTMLElement, opts: { quality?: Quality; place: Place }) {
    const def = SETS[opts.place.id]
    this.world = new World(def.pitch(opts.place.opts ?? {}), 11)
    this.view = new SimView(el, this.world, { noPitch: true, quality: opts.quality, fog: null })
    this.loop = new GameLoop(this.world, this.view)
    this.view.rig.minY = 0.3
    this.load(opts.place, true)
  }

  get stage() { return this.view.stage }
  get frame() { return this.view.frame }

  /** Build a place: its set, a fresh World of its size, its light. Actors are re-added by the caller. */
  load(place: Place, first = false): World {
    const def = SETS[place.id]
    const sameSet = !first && this.place && this.place.id === place.id && JSON.stringify(this.place.opts ?? {}) === JSON.stringify(place.opts ?? {})
    const pitch: PitchGeom = def.pitch(place.opts ?? {})
    const w = new World(pitch, 11)
    if (!first) this.loop.setWorld(w); else this.view.setWorld(w)
    this.world = w
    if (!sameSet) {
      this.set?.dispose()
      this.set = def.build(this.stage, this.frame, place.opts ?? {})
    }
    this.setMood(place.mood, place.id)
    this.place = place
    return w
  }

  setMood(mood: Mood, id: PlaceId = this.place?.id ?? 'bona') {
    const def = SETS[id]
    const center = this.frame.vec(this.world.pitch.w / 2, this.world.pitch.h / 2)
    applyMood(this.stage, mood, center)
    if (def.indoor) this.stage.scene.fog = null
    this.sky?.removeFromParent(); (this.sky?.material as THREE.MeshBasicMaterial | undefined)?.map?.dispose(); this.sky?.geometry.dispose()
    this.sky = def.indoor ? null : skyDome(mood)
    if (this.sky) { this.sky.position.copy(center); this.stage.scene.add(this.sky) }
    for (const a of this.airs) { a.object.removeFromParent(); a.dispose() }
    this.airs = []
    const q = this.stage.quality
    const add = (a: Air) => { this.airs.push(a); this.stage.scene.add(a.object) }
    if (!def.indoor) {
      if (mood === 'rain') add(rain(Math.round(1400 * q.props)))
      else if (mood === 'fog') add(fogBanks(center, 40, Math.round(36 * q.props)))
      else if (id === 'bona' && (mood === 'morning' || mood === 'noon' || mood === 'golden')) add(dust(center, 26, Math.round(700 * q.props)))
    }
    this.stage.fitShadow(def.shadowSize ?? 70, def.shadowSize ?? 70)
    this.stage.sun.shadow.camera.updateProjectionMatrix()
  }

  /** Put a member of the cast on stage. */
  spawn(a: Actor): Player {
    const c = CAST[a.cast]
    let look: Look = a.number !== undefined ? { ...c.look, number: a.number, numberColor: c.look.numberColor ?? '#F2EEE3' } : { ...c.look }
    if (a.variant !== undefined) {
      // extras of the same team: other faces, other hair, other heights, same kit
      const v = a.variant
      const skins = ['#5B3A27', '#4a2f20', '#6b4430', '#3d271b', '#7a5038']
      const hairs: Look['hair'][] = ['crop', 'twists', 'crop', 'cornrows', 'afro', 'crop']
      look = { ...look, skin: skins[v % skins.length], hair: look.hair === 'cap' || look.hair === 'bald' ? look.hair : hairs[v % hairs.length], height: (look.height ?? 1) * (0.94 + ((v * 37) % 13) / 100) }
    }
    if (a.look) look = { ...look, ...a.look }
    const p = makePlayer({ id: a.id, team: a.team ?? 'n', pos: { ...a.at }, facing: a.facing ?? 0, look, label: c.name, gk: a.gk ?? false })
    p.meta.cast = a.cast
    if (a.pose) p.meta.pose = a.pose
    p.maxSpeed = c.look.kid ? 6.6 : c.look.elder ? 2.2 : 5.5
    this.world.add(p)
    this.view.syncPlayers()
    return p
  }

  /** Remove everybody (between places). */
  clear() {
    for (const p of [...this.world.players]) { this.world.byId.delete(p.id); this.world.brains.delete(p.id) }
    this.world.players.length = 0
    this.view.syncPlayers()
  }

  /** Give someone a second ball to hold (null removes it). */
  holdProp(holder: string | null, look: BallLook = 'mamiPatched') {
    if (this.prop) { this.stage.scene.remove(this.prop.ball.group); this.prop = null }
    if (!holder) return
    const ball = new BallView()
    ball.setLook(look)
    this.stage.scene.add(ball.group)
    this.prop = { ball, holder }
  }

  /* Flung mud: a lump that flies in an arc and bursts into drops where it lands. */
  private flings: { mesh: THREE.Mesh; a: [number, number, number]; b: [number, number, number]; t: number; dur: number; peak: number }[] = []
  private drops: { mesh: THREE.Mesh; v: THREE.Vector3; life: number }[] = []
  private mudMat: THREE.MeshStandardMaterial | null = null
  private mudGeo: THREE.BufferGeometry | null = null
  fling(a: [number, number, number], b: [number, number, number], dur: number) {
    this.mudMat ??= new THREE.MeshStandardMaterial({ color: '#4b2a1a', roughness: 0.45, metalness: 0.05 })
    this.mudGeo ??= new THREE.IcosahedronGeometry(0.055, 1)
    const mesh = new THREE.Mesh(this.mudGeo, this.mudMat)
    mesh.castShadow = true
    mesh.scale.set(1, 0.8, 1.15)
    this.stage.scene.add(mesh)
    const peak = 0.35 + Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.12
    this.flings.push({ mesh, a, b, t: 0, dur, peak })
  }
  private updateMud(dt: number) {
    for (const f of [...this.flings]) {
      f.t += dt
      const u = Math.min(1, f.t / f.dur)
      f.mesh.position.copy(this.frame.vec(f.a[0] + (f.b[0] - f.a[0]) * u, f.a[1] + (f.b[1] - f.a[1]) * u, f.a[2] + (f.b[2] - f.a[2]) * u + 4 * f.peak * u * (1 - u)))
      f.mesh.rotation.x += dt * 9
      if (u >= 1) {
        f.mesh.removeFromParent()
        this.flings.splice(this.flings.indexOf(f), 1)
        sfx('splash')
        for (let i = 0; i < 9; i++) {
          const m = new THREE.Mesh(this.mudGeo!, this.mudMat!)
          m.scale.setScalar(0.25 + Math.random() * 0.3)
          m.position.copy(f.mesh.position)
          this.stage.scene.add(m)
          const ang = Math.random() * Math.PI * 2
          this.drops.push({ mesh: m, v: new THREE.Vector3(Math.cos(ang) * (0.8 + Math.random() * 1.4), 0.8 + Math.random() * 1.8, Math.sin(ang) * (0.8 + Math.random() * 1.4)), life: 1.2 })
        }
      }
    }
    for (const d of [...this.drops]) {
      d.v.y -= 9.8 * dt
      d.mesh.position.addScaledVector(d.v, dt)
      d.life -= dt
      if (d.life <= 0 || d.mesh.position.y < 0.01) { d.mesh.removeFromParent(); this.drops.splice(this.drops.indexOf(d), 1) }
    }
  }

  update(dt: number) {
    if (this.flings.length || this.drops.length) this.updateMud(dt)
    if (this.prop) {
      const p = this.world.get(this.prop.holder)
      if (p) this.prop.ball.update(this.frame.vec(p.pos.x + Math.cos(p.facing) * 0.26, p.pos.y + Math.sin(p.facing) * 0.26, (p.look.kid ? 0.82 : 1.0) * (p.look.height ?? 1)), 0, 0, dt)
    }
    const cam = this.stage.camera
    for (const a of this.airs) a.update(dt, cam)
    this.set?.update(dt, this.world.t)
  }

  dispose() {
    this.mudMat?.dispose(); this.mudGeo?.dispose()
    this.loop.stop()
    for (const a of this.airs) a.dispose()
    this.set?.dispose()
    this.view.dispose()
  }
}
