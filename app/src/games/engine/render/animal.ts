// Animals of the story (the goat of Bafoussam, « Mêêê ! »; Biscuit, the Hayes' dog « aux oreilles
// immenses », in Waldorf): small procedural figures with the same surface as a Character, so the view
// can draw them like any player.
import * as THREE from 'three'
import type { Look } from '../sim/types'
import type { AnimInput } from './character'

export interface Figure {
  root: THREE.Group
  height: number
  outline: THREE.Object3D | null
  update(a: AnimInput, dt: number): void
  snapFacing(facing: number): void
  setVisible(v: boolean): void
  dispose(): void
}

export class Goat implements Figure {
  root = new THREE.Group()
  height = 0.85
  outline: THREE.Object3D | null = null
  private legs: THREE.Object3D[] = []
  private head: THREE.Group
  private phase = 0
  private t = Math.random() * 5
  private mats: THREE.Material[] = []
  private geos: THREE.BufferGeometry[] = []

  constructor(look: Look, opts: { castShadow?: boolean } = {}) {
    const coat = new THREE.MeshStandardMaterial({ color: look.shirt || '#e9e2d2', roughness: 0.95, flatShading: true })
    const dark = new THREE.MeshStandardMaterial({ color: look.shorts || '#3a2a22', roughness: 0.8 })
    const horn = new THREE.MeshStandardMaterial({ color: '#cfc3a8', roughness: 0.6 })
    this.mats.push(coat, dark, horn)
    const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => { this.geos.push(g); const x = new THREE.Mesh(g, m); x.castShadow = !!opts.castShadow; return x }
    // the goat faces +Z like the characters
    const body = mesh(new THREE.CapsuleGeometry(0.17, 0.5, 4, 8), coat)
    body.rotation.x = Math.PI / 2
    body.position.set(0, 0.55, 0)
    this.root.add(body)
    for (const [x, z] of [[0.1, 0.24], [-0.1, 0.24], [0.1, -0.24], [-0.1, -0.24]]) {
      const pivot = new THREE.Group()
      pivot.position.set(x, 0.5, z)
      const leg = mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.48, 6), coat)
      leg.position.y = -0.24
      const hoof = mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.05, 6), dark)
      hoof.position.y = -0.47
      pivot.add(leg, hoof)
      this.root.add(pivot)
      this.legs.push(pivot)
    }
    this.head = new THREE.Group()
    this.head.position.set(0, 0.72, 0.36)
    const skull = mesh(new THREE.BoxGeometry(0.13, 0.15, 0.24), coat)
    skull.position.z = 0.06
    const beard = mesh(new THREE.ConeGeometry(0.03, 0.09, 5), coat)
    beard.position.set(0, -0.11, 0.14); beard.rotation.x = Math.PI
    for (const s of [-1, 1]) {
      const h = mesh(new THREE.ConeGeometry(0.022, 0.16, 5), horn)
      h.position.set(s * 0.04, 0.12, -0.02); h.rotation.x = -0.6
      const ear = mesh(new THREE.BoxGeometry(0.1, 0.03, 0.05), coat)
      ear.position.set(s * 0.1, 0.03, 0); ear.rotation.z = s * -0.4
      const eye = mesh(new THREE.SphereGeometry(0.014, 6, 4), dark)
      eye.position.set(s * 0.066, 0.03, 0.1)
      this.head.add(h, ear, eye)
    }
    this.head.add(skull, beard)
    const tail = mesh(new THREE.ConeGeometry(0.03, 0.1, 5), coat)
    tail.position.set(0, 0.68, -0.34); tail.rotation.x = -0.9
    this.root.add(this.head, tail)
  }

  snapFacing(facing: number) { this.root.rotation.y = Math.atan2(Math.cos(facing), Math.sin(facing)) }
  update(a: AnimInput, dt: number) {
    this.t += dt
    const target = Math.atan2(Math.cos(a.facing), Math.sin(a.facing))
    let d = target - this.root.rotation.y
    while (d > Math.PI) d -= Math.PI * 2
    while (d < -Math.PI) d += Math.PI * 2
    this.root.rotation.y += d * (1 - Math.exp(-8 * dt))
    const s = Math.min(1, a.speed / 3)
    this.phase += dt * (4 + a.speed * 3)
    this.legs.forEach((l, i) => { l.rotation.x = Math.sin(this.phase + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.6 * s })
    // grazing when still, head up when trotting
    this.head.rotation.x = s > 0.2 ? -0.1 : 0.55 + 0.1 * Math.sin(this.t * 2)
  }
  setVisible(v: boolean) { this.root.visible = v }
  dispose() { for (const g of this.geos) g.dispose(); for (const m of this.mats) m.dispose() }
}

/** A dog with very big ears that likes rolling in the snow (shirt = coat, shorts = ears and patches). */
export class Dog implements Figure {
  root = new THREE.Group()
  height = 0.55
  outline: THREE.Object3D | null = null
  private legs: THREE.Object3D[] = []
  private head: THREE.Group
  private tail: THREE.Object3D
  private ears: THREE.Object3D[] = []
  private phase = 0
  private t = Math.random() * 5
  private mats: THREE.Material[] = []
  private geos: THREE.BufferGeometry[] = []

  constructor(look: Look, opts: { castShadow?: boolean } = {}) {
    const furC = new THREE.Color(look.shirt || '#c8955a')
    const coat = new THREE.MeshPhysicalMaterial({ color: furC, roughness: 0.86, sheen: 0.8, sheenRoughness: 0.55, sheenColor: furC.clone().lerp(new THREE.Color('#ffffff'), 0.45) })
    const patchC = new THREE.Color(look.shorts || '#6b4126')
    const patch = new THREE.MeshPhysicalMaterial({ color: patchC, roughness: 0.85, sheen: 0.8, sheenRoughness: 0.55, sheenColor: patchC.clone().lerp(new THREE.Color('#ffffff'), 0.4) })
    const dark = new THREE.MeshStandardMaterial({ color: '#1b1512', roughness: 0.4 })
    this.mats.push(coat, patch, dark)
    const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => { this.geos.push(g); const x = new THREE.Mesh(g, m); x.castShadow = !!opts.castShadow; return x }
    const body = mesh(new THREE.CapsuleGeometry(0.13, 0.36, 4, 10), coat)
    body.rotation.x = Math.PI / 2
    body.position.set(0, 0.34, 0)
    this.root.add(body)
    // a deep chest, the haunches, a neck up to the head: one soft silhouette rather than a tube
    const chest = mesh(new THREE.SphereGeometry(0.15, 14, 10), coat)
    chest.position.set(0, 0.35, 0.16); chest.scale.set(0.95, 1.05, 1)
    const haunch = mesh(new THREE.SphereGeometry(0.14, 14, 10), coat)
    haunch.position.set(0, 0.36, -0.17); haunch.scale.set(1, 0.95, 1)
    const neck = mesh(new THREE.CapsuleGeometry(0.075, 0.12, 4, 10), coat)
    neck.position.set(0, 0.43, 0.23); neck.rotation.x = 0.75
    this.root.add(chest, haunch, neck)
    for (const [x, z] of [[0.08, 0.17], [-0.08, 0.17], [0.08, -0.17], [-0.08, -0.17]]) {
      const pivot = new THREE.Group()
      pivot.position.set(x, 0.3, z)
      const leg = mesh(new THREE.CylinderGeometry(0.05, 0.028, 0.3, 9), coat)
      leg.position.y = -0.15
      const paw = mesh(new THREE.SphereGeometry(0.04, 7, 5), coat)
      paw.position.set(0, -0.29, 0.015); paw.scale.set(1, 0.6, 1.3)
      pivot.add(leg, paw)
      this.root.add(pivot)
      this.legs.push(pivot)
    }
    this.head = new THREE.Group()
    this.head.position.set(0, 0.47, 0.26)
    const skull = mesh(new THREE.SphereGeometry(0.11, 12, 9), coat)
    const muzzle = mesh(new THREE.CapsuleGeometry(0.055, 0.08, 4, 8), coat)
    muzzle.rotation.x = Math.PI / 2; muzzle.position.set(0, -0.03, 0.11)
    const nose = mesh(new THREE.SphereGeometry(0.025, 8, 6), dark)
    nose.position.set(0, -0.015, 0.2)
    this.head.add(skull, muzzle, nose)
    for (const s of [-1, 1]) {
      const eye = mesh(new THREE.SphereGeometry(0.016, 8, 6), dark)
      eye.position.set(s * 0.05, 0.03, 0.09)
      // the ears: long, soft, hanging down to the chin
      const ear = new THREE.Group()
      ear.position.set(s * 0.09, 0.05, 0)
      const flap = mesh(new THREE.CapsuleGeometry(0.058, 0.2, 4, 10), patch)
      flap.scale.set(1, 1, 0.3); flap.position.y = -0.13
      ear.add(flap)
      ear.rotation.z = s * 0.25
      this.ears.push(ear)
      this.head.add(eye, ear)
    }
    this.tail = mesh(new THREE.CylinderGeometry(0.028, 0.012, 0.24, 8), coat)
    this.tail.position.set(0, 0.45, -0.3); this.tail.rotation.x = -0.7
    this.root.add(this.head, this.tail)
  }

  snapFacing(facing: number) { this.root.rotation.y = Math.atan2(Math.cos(facing), Math.sin(facing)) }
  update(a: AnimInput, dt: number) {
    this.t += dt
    const target = Math.atan2(Math.cos(a.facing), Math.sin(a.facing))
    let d = target - this.root.rotation.y
    while (d > Math.PI) d -= Math.PI * 2
    while (d < -Math.PI) d += Math.PI * 2
    this.root.rotation.y += d * (1 - Math.exp(-9 * dt))
    const s = Math.min(1, a.speed / 3)
    this.phase += dt * (5 + a.speed * 4)
    this.legs.forEach((l, i) => { l.rotation.x = Math.sin(this.phase + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.7 * s })
    // the tail never stops; the ears flap when he runs
    this.tail.rotation.z = 0.5 * Math.sin(this.t * 12)
    for (const [i, e] of this.ears.entries()) e.rotation.x = 0.35 * s * Math.sin(this.phase * 2 + i)
    this.head.rotation.x = s > 0.2 ? -0.15 : 0.1 * Math.sin(this.t * 1.5)
    // rolling in the snow (the story's 'lie' pose): on his back, paws in the air
    const rolling = a.anim === 'lie'
    this.root.rotation.z += ((rolling ? Math.PI * 0.9 + 0.3 * Math.sin(this.t * 6) : 0) - this.root.rotation.z) * (1 - Math.exp(-6 * dt))
    this.root.position.y = rolling ? 0.32 : 0
  }
  setVisible(v: boolean) { this.root.visible = v }
  dispose() { for (const g of this.geos) g.dispose(); for (const m of this.mats) m.dispose() }
}
