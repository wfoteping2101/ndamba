// Framing for story shots: from a CamSpec (who is in the picture, from where) to a camera pose.
import * as THREE from 'three'
import type { ShotPose } from '../../engine/render/cameraRig'
import type { Frame } from '../../engine/render/stage'
import type { World } from '../../engine/sim/world'
import type { V2 } from '../../engine/sim/math'
import type { CamSpec, Where } from './types'

const HEAD_KID = 1.12, HEAD_ADULT = 1.55

export function framePose(spec: CamSpec, w: World, f: Frame, pt: (where: Where) => V2): ShotPose | null {
  const v = (x: number, y: number, h: number) => f.vec(x, y, h)
  switch (spec.kind) {
    case 'wide': {
      const c = { x: w.pitch.w / 2, y: w.pitch.h / 2 }
      const size = Math.max(w.pitch.w, w.pitch.h)
      const side = spec.side ?? 1
      return { pos: v(c.x - size * 0.18, c.y + side * (w.pitch.h * 0.5 + size * 0.5), spec.height ?? size * 0.45), look: v(c.x, c.y, 0), fov: 42 }
    }
    case 'pose':
      return {
        pos: v(spec.pos[0], spec.pos[2], spec.pos[1]), look: v(spec.look[0], spec.look[2], spec.look[1]),
        to: spec.to ? { pos: v(spec.to.pos[0], spec.to.pos[2], spec.to.pos[1]), look: v(spec.to.look[0], spec.to.look[2], spec.to.look[1]) } : undefined,
        dur: spec.dur, fov: spec.fov ?? 40,
      }
    case 'on': {
      const ids = Array.isArray(spec.who) ? spec.who : [spec.who]
      const ps = ids.map((id) => w.get(id)).filter((p): p is NonNullable<typeof p> => !!p)
      if (!ps.length) return null
      const head = Math.max(...ps.map((p) => (p.look.kid ? HEAD_KID : HEAD_ADULT) * (p.look.height ?? 1)))
      const c = ps.reduce((a, p) => ({ x: a.x + p.pos.x / ps.length, y: a.y + p.pos.y / ps.length }), { x: 0, y: 0 })
      let spread = 0
      for (const a of ps) for (const b of ps) spread = Math.max(spread, Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y))
      // looking at the faces: from the side the group faces
      let fx = 0, fy = 0
      for (const p of ps) { fx += Math.cos(p.facing); fy += Math.sin(p.facing) }
      let dir = Math.atan2(fy, fx)
      if (ps.length >= 2) {
        // perpendicular to the line between the first two, on the side they look towards
        const a = ps[0].pos, b = ps[1].pos
        const perp = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2
        dir = Math.cos(perp - dir) >= 0 ? perp : perp + Math.PI
      }
      dir += spec.side ?? (ps.length === 1 ? 0.45 : 0.15)
      const dist = spec.dist ?? (ps.length === 1 ? 2.4 : Math.max(2.8, spread * 1.25 + 1.6))
      const h = spec.height ?? head * 0.95
      const lookY = spec.lookY ?? head * 0.82
      return { pos: v(c.x + Math.cos(dir) * dist, c.y + Math.sin(dir) * dist, h), look: v(c.x, c.y, lookY), fov: spec.fov ?? (ps.length === 1 ? 34 : 40) }
    }
    case 'over': {
      const p = w.get(spec.who)
      if (!p) return null
      const t = pt(spec.to)
      const ang = Math.atan2(t.y - p.pos.y, t.x - p.pos.x)
      const d = spec.dist ?? 1.5
      const head = (p.look.kid ? HEAD_KID : HEAD_ADULT) * (p.look.height ?? 1)
      const side = ang + Math.PI / 2
      // mix: where the camera looks between the player (0) and the target (1): a game view looks at the
      // space between them, so both the player and where the ball should go are in the picture
      const mx = spec.mix ?? 1
      return { pos: v(p.pos.x - Math.cos(ang) * d + Math.cos(side) * 0.45, p.pos.y - Math.sin(ang) * d + Math.sin(side) * 0.45, spec.height ?? head + 0.25), look: v(p.pos.x + (t.x - p.pos.x) * mx, p.pos.y + (t.y - p.pos.y) * mx, 0.9), fov: 40 }
    }
    case 'follow': {
      const p = w.get(spec.who)
      if (!p) return null
      const sp = Math.hypot(p.vel.x, p.vel.y)
      const ang = sp > 0.5 ? Math.atan2(p.vel.y, p.vel.x) : p.facing
      const d = spec.dist ?? 5.5, h = spec.height ?? 3.2
      return { pos: v(p.pos.x - Math.cos(ang) * d, p.pos.y - Math.sin(ang) * d, h), look: v(p.pos.x + Math.cos(ang) * 2, p.pos.y + Math.sin(ang) * 2, 0.9), fov: 44 }
    }
    case 'match':
      return null
  }
}

/** The ground point in front of the camera (for markers), unused when off screen. */
export function camForward(cam: THREE.Camera) { const v = new THREE.Vector3(); cam.getWorldDirection(v); v.y = 0; return v.normalize() }
