// The Ndamba ball: white panels, dark seams and one gold star panel (the brand mark), rolling with
// its true ground speed, plus a soft contact shadow that stays readable on every quality tier.
import * as THREE from 'three'
import { BALL_R } from '../sim/ball'

function ballTexture() {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = '#f7f6f1'
  g.fillRect(0, 0, 512, 256)
  // equirectangular panels: dark pentagon-like patches spread over the sphere
  const spots: [number, number][] = [[0.0, 0.5], [0.2, 0.18], [0.4, 0.5], [0.6, 0.18], [0.8, 0.5], [0.1, 0.82], [0.3, 0.82], [0.5, 0.82], [0.7, 0.82], [0.9, 0.82], [0.5, 0.02], [0.5, 0.98]]
  g.fillStyle = '#12211A'
  for (const [u, v] of spots) {
    for (const du of [-1, 0, 1]) {
      g.beginPath()
      const cx = (u + du) * 512, cy = v * 256
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2
        g.lineTo(cx + Math.cos(a) * 26 / Math.max(0.35, Math.sin(Math.PI * v)), cy + Math.sin(a) * 22)
      }
      g.closePath(); g.fill()
    }
  }
  // the gold star panel
  const star = (cx: number, cy: number, r: number) => {
    g.beginPath()
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2
      const rr = i % 2 ? r * 0.45 : r
      g.lineTo(cx + Math.cos(a) * rr * 1.25, cy + Math.sin(a) * rr)
    }
    g.closePath()
    g.fillStyle = '#F5B700'; g.fill()
  }
  star(128, 128, 30)
  // seams
  g.strokeStyle = 'rgba(18,33,26,0.35)'
  g.lineWidth = 2
  for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(0, 40 + i * 35); g.bezierCurveTo(170, 20 + i * 40, 340, 60 + i * 30, 512, 40 + i * 35); g.stroke() }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

let shadowTex: THREE.Texture | null = null
export function blobShadowTexture() {
  if (shadowTex) return shadowTex
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 30)
  grd.addColorStop(0, 'rgba(0,0,0,0.55)')
  grd.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 64, 64)
  shadowTex = new THREE.CanvasTexture(c)
  return shadowTex
}

export class BallView {
  mesh: THREE.Mesh
  shadow: THREE.Mesh
  group = new THREE.Group()
  private q = new THREE.Quaternion()
  constructor(scale = 1.15) {
    // a touch bigger than life so it reads on a phone
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_R * scale, 24, 16), new THREE.MeshStandardMaterial({ map: ballTexture(), roughness: 0.45 }))
    this.mesh.castShadow = true
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshBasicMaterial({ map: blobShadowTexture(), transparent: true, depthWrite: false }))
    this.shadow.rotation.x = -Math.PI / 2
    this.shadow.position.y = 0.012
    this.group.add(this.mesh, this.shadow)
  }
  /** pos in three coords; vel in three coords (for rolling) */
  update(pos: THREE.Vector3, velX: number, velZ: number, dt: number) {
    this.mesh.position.copy(pos)
    const sp = Math.hypot(velX, velZ)
    if (sp > 0.05) {
      const axis = new THREE.Vector3(velZ, 0, -velX).normalize()
      this.q.setFromAxisAngle(axis, (sp * dt) / BALL_R)
      this.mesh.quaternion.premultiply(this.q)
    }
    this.shadow.position.set(pos.x, 0.012, pos.z)
    const h = Math.max(0, pos.y - BALL_R)
    const s = 1 + h * 0.35
    this.shadow.scale.set(s, s, s)
    ;(this.shadow.material as THREE.MeshBasicMaterial).opacity = Math.max(0.15, 1 - h * 0.25)
  }
}
