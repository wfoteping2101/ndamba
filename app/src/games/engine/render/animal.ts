// Animals that cross the story's pitches (the goat of Bafoussam, « Mêêê ! »): a small procedural
// figure with the same surface as a Character, so the view can draw it like any player.
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
