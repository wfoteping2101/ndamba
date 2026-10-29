// Motion for the skinned players: motion-captured clips (CMU Graphics Lab Motion Capture Database,
// retargeted by tools/humans/motions.py) blended by speed and direction with the feet in step, one-shot
// kicks timed on the strike, story gestures from the clip library, and what mocap has no clip for
// (a fist held out, a hand on the heart, a ball held in both hands) posed with two-bone arm IK on top.
import * as THREE from 'three'
import type { Look } from '../sim/types'
import type { AnimInput } from './character'

const BASE = `${import.meta.env.BASE_URL ?? '/'}jeux/humans/`

interface ClipInfo { loop: boolean; speed?: number; contact?: number; duration: number; frames: number }
interface Library { clips: Map<string, THREE.AnimationClip>; info: Record<string, ClipInfo>; rest: Map<string, { q: THREE.Quaternion; p: THREE.Vector3 }>; pelvisY: number }

let lib: Promise<Library | null> | null = null

interface MotionsJson { fps: number; bones: string[]; rest: Record<string, { q: number[]; t: number[] }>; pelvisY: number; clips: Record<string, ClipInfo & { offset: number }> }

export function loadMotions(): Promise<Library | null> {
  if (!lib) {
    lib = (async () => {
      try {
        const [meta, bin] = await Promise.all([
          fetch(`${BASE}motions.json`).then((r) => r.json() as Promise<MotionsJson>),
          fetch(`${BASE}motions.bin`).then((r) => r.arrayBuffer()),
        ])
        const data = new Float32Array(bin)
        const rest = new Map<string, { q: THREE.Quaternion; p: THREE.Vector3 }>()
        for (const [b, r] of Object.entries(meta.rest)) rest.set(b, { q: new THREE.Quaternion(r.q[0], r.q[1], r.q[2], r.q[3]), p: new THREE.Vector3(r.t[0], r.t[1], r.t[2]) })
        const nb = meta.bones.length
        const stride = nb * 4 + 3
        const clips = new Map<string, THREE.AnimationClip>()
        for (const [name, c] of Object.entries(meta.clips)) {
          const n = c.frames
          const times = new Float32Array(n)
          for (let i = 0; i < n; i++) times[i] = i / meta.fps
          const tracks: THREE.KeyframeTrack[] = []
          for (let bi = 0; bi < nb; bi++) {
            const v = new Float32Array(n * 4)
            for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) v[i * 4 + k] = data[c.offset + i * stride + bi * 4 + k]
            tracks.push(new THREE.QuaternionKeyframeTrack(`${meta.bones[bi]}.quaternion`, times as unknown as number[], v as unknown as number[]))
          }
          const pv = new Float32Array(n * 3)
          for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) pv[i * 3 + k] = data[c.offset + i * stride + nb * 4 + k]
          tracks.push(new THREE.VectorKeyframeTrack('pelvis.position', times as unknown as number[], pv as unknown as number[]))
          clips.set(name, new THREE.AnimationClip(name, (n - 1) / meta.fps, tracks))
        }
        return { clips, info: meta.clips, rest, pelvisY: meta.pelvisY }
      } catch (e) {
        console.warn('motions unavailable', e)
        return null
      }
    })()
  }
  return lib
}

/** The library's clips re-expressed for another skeleton (other rest pose, other leg length). */
const converted = new WeakMap<THREE.Object3D, Map<string, THREE.AnimationClip>>()
function clipsFor(model: THREE.Object3D, L: Library, key: string): Map<string, THREE.AnimationClip> {
  const cacheKey = model.userData.archetypeKey as string | undefined
  const shared = cacheKey ? sharedClips.get(cacheKey) : undefined
  if (shared) return shared
  const restT = new Map<string, { q: THREE.Quaternion; p: THREE.Vector3 }>()
  let pelvisY = L.pelvisY
  model.updateMatrixWorld(true)
  model.traverse((o) => {
    if ((o as THREE.Bone).isBone) restT.set(o.name, { q: o.quaternion.clone(), p: o.position.clone() })
    if (o.name === 'pelvis') { const v = new THREE.Vector3(); o.getWorldPosition(v); pelvisY = v.y / model.scale.y }
  })
  const k = pelvisY / L.pelvisY
  const out = new Map<string, THREE.AnimationClip>()
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), corr = new THREE.Quaternion()
  for (const [name, clip] of L.clips) {
    const tracks: THREE.KeyframeTrack[] = []
    for (const tr of clip.tracks) {
      const [bone, prop] = tr.name.split('.')
      const rc = L.rest.get(bone), rt = restT.get(bone)
      if (!rc || !rt) continue
      if (prop === 'quaternion') {
        corr.copy(rt.q).multiply(qa.copy(rc.q).invert())
        const v = (tr.values as Float32Array).slice()
        for (let i = 0; i < v.length; i += 4) {
          qb.set(v[i], v[i + 1], v[i + 2], v[i + 3]).premultiply(corr)
          v[i] = qb.x; v[i + 1] = qb.y; v[i + 2] = qb.z; v[i + 3] = qb.w
        }
        tracks.push(new THREE.QuaternionKeyframeTrack(tr.name, tr.times as unknown as number[], v as unknown as number[]))
      } else if (prop === 'position' && bone === 'pelvis') {
        const v = (tr.values as Float32Array).slice()
        for (let i = 0; i < v.length; i += 3) {
          v[i] = rt.p.x + (v[i] - rc.p.x) * k; v[i + 1] = rt.p.y + (v[i + 1] - rc.p.y) * k; v[i + 2] = rt.p.z + (v[i + 2] - rc.p.z) * k
        }
        tracks.push(new THREE.VectorKeyframeTrack(tr.name, tr.times as unknown as number[], v as unknown as number[]))
      }
    }
    out.set(name, new THREE.AnimationClip(name, clip.duration, tracks))
  }
  out.set('__scale', new THREE.AnimationClip(String(k), 0, []))
  if (cacheKey) sharedClips.set(cacheKey, out)
  converted.set(model, out)
  void key
  return out
}
const sharedClips = new Map<string, Map<string, THREE.AnimationClip>>()

/* ------------------------------------------------------------------------------------ IK poses */

type Arm = 'l' | 'r'
/** Hand targets in the body's own frame (x the body's left, y up, z forward), in metres for a 1.33 m child. */
interface ArmPose { hand: [number, number, number]; elbowOut?: number; /** the hand goes up and down (drumming): amplitude, phase */ beat?: [number, number] }
const POSES: Partial<Record<string, Partial<Record<Arm, ArmPose>>>> = {
  fist: { r: { hand: [-0.06, 1.0, 0.36], elbowOut: 0.3 } },
  heart: { r: { hand: [0.05, 0.98, 0.11], elbowOut: 0.6 } },
  palm: { r: { hand: [-0.05, 1.22, 0.36], elbowOut: 0.4 } },
  hold: { l: { hand: [0.115, 0.86, 0.25], elbowOut: 0.5 }, r: { hand: [-0.115, 0.86, 0.25], elbowOut: 0.5 } },
  open: { l: { hand: [0.55, 1.0, 0.08] }, r: { hand: [-0.55, 1.0, 0.08] } },
  mic: { r: { hand: [-0.02, 1.12, 0.12], elbowOut: 0.5 } },
  climb: { l: { hand: [0.12, 1.62, 0.12] }, r: { hand: [-0.12, 1.62, 0.12] } },
  point: { r: { hand: [-0.12, 1.08, 0.5] } },
  wave: { r: { hand: [-0.3, 1.45, 0.05] } },
  juggle: { l: { hand: [0.22, 0.72, 0.05] }, r: { hand: [-0.22, 0.72, 0.05] } },
  catch: { l: { hand: [0.1, 0.95, 0.3] }, r: { hand: [-0.1, 0.95, 0.3] } },
  // arms round someone standing close in front (Mami and her lions, the airport goodbyes)
  embrace: { l: { hand: [0.14, 1.1, 0.24], elbowOut: 1 }, r: { hand: [-0.14, 1.08, 0.24], elbowOut: 1 } },
  // seated, one hand on the armrest beside: the two brothers' hands meet on it (ch08, the plane)
  restL: { l: { hand: [0.4, 0.84, 0.12], elbowOut: 0.15 } },
  restR: { r: { hand: [-0.4, 0.84, 0.12], elbowOut: 0.15 } },
  // seated at a school desk: the hand up (« Kaydoudou lève la main »), or both hands on the desk
  // holding something small (Mrs. Patterson's card)
  sitHand: { r: { hand: [-0.14, 1.38, 0.1] } },
  sitHold: { l: { hand: [0.1, 0.74, 0.32], elbowOut: 0.4 }, r: { hand: [-0.1, 0.74, 0.32], elbowOut: 0.4 } },
  // both hands on a big drum in front of the hips, beating in turn
  drum: { l: { hand: [0.14, 0.92, 0.4], elbowOut: 0.6, beat: [0.07, 0] }, r: { hand: [-0.14, 0.92, 0.4], elbowOut: 0.6, beat: [0.07, Math.PI] } },
}

/** Which clip plays under a story pose (the IK arms, if any, go on top). */
const POSE_CLIP: Record<string, string> = {
  sit: 'sitIdle', talk: 'talk', dance: 'dance', cry: 'cry', sew: 'sew', sitGround: 'sitGround', shrug: 'shrug', celebrate: 'celebrate',
  catch: 'idleRelaxed', dejected: 'mope', wave: 'idleRelaxed', point: 'idleRelaxed', fist: 'idleRelaxed', heart: 'idleRelaxed', palm: 'idleRelaxed', hold: 'idleRelaxed', open: 'idleRelaxed', mic: 'talk',
  climb: 'idleRelaxed', juggle: 'idleRelaxed', hug: 'sitGround', kneel: 'sitGround', lie: 'getUp', embrace: 'idleRelaxed', drum: 'idleRelaxed', restL: 'sitIdle', restR: 'sitIdle', sitHand: 'sitIdle', sitHold: 'sitIdle',
  throw: 'throw', slip: 'slip', laugh: 'laugh',
}

/** Story poses that hold one frame of their clip (a fraction of it): lying is the first frame of getting up. */
const POSE_HOLD: Record<string, number> = { lie: 0 }

const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpV3 = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion()

/** Rotate `bone` (world) so that the direction from its world position to `from` turns towards `to`. */
function aimBone(bone: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, w = 1) {
  const p = bone.getWorldPosition(tmpV3)
  const a = tmpV.copy(from).sub(p).normalize()
  const b = tmpV2.copy(to).sub(p).normalize()
  if (a.lengthSq() < 1e-8 || b.lengthSq() < 1e-8) return
  const q = tmpQ.setFromUnitVectors(a, b)
  if (w < 1) q.slerp(tmpQ2.identity(), 1 - w)
  // world delta -> local
  const parentQ = bone.parent!.getWorldQuaternion(new THREE.Quaternion())
  const worldQ = bone.getWorldQuaternion(new THREE.Quaternion())
  worldQ.premultiply(q)
  bone.quaternion.copy(parentQ.invert().multiply(worldQ))
  bone.updateMatrixWorld(true)
}

function solveArm(upper: THREE.Bone, lower: THREE.Bone, hand: THREE.Bone, target: THREE.Vector3, pole: THREE.Vector3, w: number) {
  if (w <= 0.001) return
  const a = upper.getWorldPosition(new THREE.Vector3())
  const b = lower.getWorldPosition(new THREE.Vector3())
  const c = hand.getWorldPosition(new THREE.Vector3())
  const l1 = a.distanceTo(b), l2 = b.distanceTo(c)
  const t = target.clone().sub(a)
  const d = THREE.MathUtils.clamp(t.length(), Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3)
  t.setLength(d)
  // elbow position: law of cosines, bent towards the pole
  const cosA = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)
  const dir = t.clone().normalize()
  const pv = pole.clone().sub(a)
  const side = pv.sub(dir.clone().multiplyScalar(pv.dot(dir))).normalize()
  const elbow = a.clone().add(dir.clone().multiplyScalar(cosA * l1)).add(side.multiplyScalar(Math.sqrt(Math.max(0, 1 - cosA * cosA)) * l1))
  aimBone(upper, b, elbow, w)
  const b2 = lower.getWorldPosition(new THREE.Vector3())
  const c2 = hand.getWorldPosition(new THREE.Vector3())
  aimBone(lower, c2, a.clone().add(t), w)
  void b2
}

/* ------------------------------------------------------------------------------------ the driver */

const LOCO = ['idle', 'walk', 'jog', 'run', 'sprint', 'walkBack', 'strafeL', 'strafeR'] as const
/** the standing clip (calm, weight shifting); 'idle' (waiting, looking around) is kept for variety */
const STAND = 'idleRelaxed'
type Loco = (typeof LOCO)[number]

export class Motion {
  private mixer: THREE.AnimationMixer
  private clips: Map<string, THREE.AnimationClip> | null = null
  private info: Record<string, ClipInfo> = {}
  private actions = new Map<string, THREE.AnimationAction>()
  private weights = new Map<string, number>()
  private phase = Math.random()
  private bones = new Map<string, THREE.Bone>()
  private oneShot: { name: string; t: number; dur: number } | null = null
  private lastAnim = ''
  private lastAnimT = 0
  private poseW = 0
  private pose = ''
  private scale = 1
  private lookYaw = 0
  private ikW = { l: 0, r: 0 }
  private stand = STAND
  private diveSide = 1
  private tilt = { z: 0, x: 0, y: 0 }
  /** art checks: hold one clip at one time */
  debug: { clip: string; t: number } | null = null

  constructor(private model: THREE.Object3D, private look: Look) {
    this.mixer = new THREE.AnimationMixer(model)
    model.traverse((o) => { if ((o as THREE.Bone).isBone) this.bones.set(o.name, o as THREE.Bone) })
    void loadMotions().then((L) => {
      if (!L) return
      this.clips = clipsFor(model, L, '')
      this.info = L.info
      this.scale = Number(this.clips.get('__scale')?.name ?? 1) * model.scale.y
      for (const [name, clip] of this.clips) {
        if (name.startsWith('__')) continue
        const a = this.mixer.clipAction(clip)
        a.enabled = true
        a.setEffectiveWeight(0)
        a.play()
        a.timeScale = 0
        // nobody stands in step with the others
        a.time = Math.random() * clip.duration
        this.actions.set(name, a)
        this.weights.set(name, 0)
      }
      if (!this.actions.has(STAND)) this.stand = 'idle'
      this.weights.set(this.stand, 1)
    })
  }

  private speedOf(name: string) { return (this.info[name]?.speed ?? 1) * this.scale }

  update(a: AnimInput, dt: number, rootYaw: number) {
    if (!this.clips || !this.actions.size) return
    const target = new Map<string, number>()
    const s = a.speed
    // moving direction relative to the body
    let rel = a.velAngle - a.facing
    while (rel > Math.PI) rel -= Math.PI * 2
    while (rel < -Math.PI) rel += Math.PI * 2
    const fwd = Math.cos(rel), side = Math.sin(rel)
    const story = a.anim in POSE_CLIP && (s < 0.6 || (a.anim !== 'celebrate' && a.anim !== 'dejected')) ? a.anim : ''
    // one-shots: kicks (the sim starts them at the strike), dives, tackles
    if ((a.anim === 'kick') && (this.lastAnim !== 'kick' || a.animT < this.lastAnimT)) {
      const name = a.kickFoot === 'L' ? 'kickL' : 'kickR'
      const alt = [name, `${name}2`, `${name}3`].filter((n) => this.actions.has(n))
      const pick = alt[Math.floor(Math.random() * alt.length)] ?? name
      const info = this.info[pick]
      if (info && this.actions.has(pick)) {
        const start = Math.max(0, (info.contact ?? 0.9) - 0.16)
        this.oneShot = { name: pick, t: start, dur: info.duration }
      }
    }
    this.lastAnim = a.anim
    this.lastAnimT = a.animT
    if (this.oneShot) {
      this.oneShot.t += dt
      if (this.oneShot.t >= this.oneShot.dur - 0.05) this.oneShot = null
    }
    if (story && !this.oneShot) {
      this.pose = story
      const clip = POSE_CLIP[story]
      target.set(this.actions.has(clip) ? clip : this.stand, 1)
    } else if (!this.oneShot) {
      this.pose = ''
      // locomotion: idle / walk / jog / run / sprint forwards, backpedal, strafes
      const sp = (n: Loco) => this.speedOf(n)
      if (s < 0.25) target.set(this.stand, 1)
      else if (fwd < -0.45 && s < 3) target.set('walkBack', 1)
      else if (Math.abs(side) > 0.7 && s < 3.5) target.set(side > 0 ? 'strafeL' : 'strafeR', 1)
      else {
        const ladder: Loco[] = ['walk', 'jog', 'run', 'sprint']
        if (this.look.elder && this.actions.has('walkOld') && s < 1.6) { target.set('walkOld' as Loco, 1) }
        else {
        const v = ladder.map(sp)
        if (s <= v[0]) { const k = Math.min(1, s / v[0]); target.set('walk', k); target.set(this.stand, 1 - k) }
        else {
          let i = 0
          while (i < ladder.length - 2 && s > v[i + 1]) i++
          const k = THREE.MathUtils.clamp((s - v[i]) / (v[i + 1] - v[i]), 0, 1)
          target.set(ladder[i], 1 - k)
          target.set(ladder[i + 1], k)
        }
        }
      }
    } else target.set(this.oneShot.name, 1)
    if (this.debug && this.actions.has(this.debug.clip)) {
      for (const [n, act] of this.actions) { act.setEffectiveWeight(n === this.debug.clip ? 1 : 0); if (n === this.debug.clip) act.time = this.debug.t }
      this.mixer.update(0)
      this.model.updateMatrixWorld(true)
      return
    }
    // smooth weights
    const rate = 1 - Math.exp(-(this.oneShot ? 16 : 8) * dt)
    let total = 0
    for (const [name] of this.actions) {
      const w = this.weights.get(name)! + ((target.get(name) ?? 0) - this.weights.get(name)!) * rate
      this.weights.set(name, w)
      total += w
    }
    // the stride phase: locomotion clips share it, so blends keep the feet together
    let freq = 0
    for (const n of ['walk', 'jog', 'run', 'sprint', 'walkBack', 'strafeL', 'strafeR', 'walkOld'] as Loco[]) {
      const w = this.weights.get(n) ?? 0
      const inf = this.info[n]
      if (!w || !inf) continue
      freq += w * (Math.max(0.3, s) / this.speedOf(n)) / inf.duration
    }
    if (freq > 0) this.phase = (this.phase + dt * freq) % 1
    for (const [name, act] of this.actions) {
      const w = this.weights.get(name)! / Math.max(1e-3, total)
      act.setEffectiveWeight(w)
      const inf = this.info[name]
      if (!inf) continue
      if (((LOCO as readonly string[]).includes(name) || name === 'walkOld') && name !== 'idle') act.time = this.phase * inf.duration
      else if (this.oneShot && name === this.oneShot.name) act.time = this.oneShot.t
      else if (this.pose in POSE_HOLD && name === POSE_CLIP[this.pose]) act.time = POSE_HOLD[this.pose] * inf.duration
      else if (w > 0.001) act.time = inf.loop ? (act.time + dt) % inf.duration : Math.min(inf.duration, act.time + dt)
      else if (!inf.loop) act.time = 0
    }
    // whole-body moves mocap has no clip for: the keeper's dive (the body lays out sideways, arms
    // reaching), a defender's lunge
    let tz = 0, tx = 0, ty = 0, armsUp = 0
    if (a.anim === 'dive') {
      if (this.lastDive !== true) this.diveSide = side >= 0 ? 1 : -1
      this.lastDive = true
      const t = a.animT
      const u = Math.min(1, t / 0.22) * (t > 0.85 ? Math.max(0, 1 - (t - 0.85) / 0.35) : 1)
      tz = -this.diveSide * 1.3 * u
      ty = (0.22 * Math.min(1, t / 0.2) - 0.5 * Math.max(0, Math.min(1, (t - 0.25) / 0.3))) * u
      armsUp = u
    } else this.lastDive = false
    if (a.anim === 'tackle') {
      const t = a.animT
      const u = Math.min(1, t / 0.15) * (t > 0.45 ? Math.max(0, 1 - (t - 0.45) / 0.25) : 1)
      tx = 0.38 * u
      ty = -0.12 * u
    }
    const k = 1 - Math.exp(-22 * dt)
    this.tilt.z += (tz - this.tilt.z) * k
    this.tilt.x += (tx - this.tilt.x) * k
    this.tilt.y += (ty - this.tilt.y) * k
    this.model.rotation.set(this.tilt.x, 0, this.tilt.z)
    this.model.position.y = this.tilt.y * this.scale
    this.armsUp = armsUp
    this.mixer.update(0)
    this.model.updateMatrixWorld(true)
    this.overlays(a, dt, rootYaw)
  }
  private lastDive = false
  private armsUp = 0

  /** On top of the clips: IK arms for the story poses, the head turning to what it looks at. */
  private clock = 0
  private overlays(a: AnimInput, dt: number, rootYaw: number) {
    this.clock += dt
    const P = this.armsUp > 0.05 ? POSES.climb : POSES[this.pose]
    const k = 1 - Math.exp(-10 * dt)
    for (const side of ['l', 'r'] as Arm[]) {
      const want = P?.[side] ? (this.armsUp > 0.05 ? this.armsUp : 1) : 0
      this.ikW[side] += (want - this.ikW[side]) * k
      const pose = P?.[side]
      if (!pose || this.ikW[side] < 0.01) continue
      const up = this.bones.get(`upperarm_${side}`), lo = this.bones.get(`lowerarm_${side}`), ha = this.bones.get(`hand_${side}`)
      if (!up || !lo || !ha) continue
      const k2 = this.scale / Math.max(0.01, this.model.scale.y)
      const lift = pose.beat ? pose.beat[0] * Math.max(0, Math.sin(this.clock * 9 + pose.beat[1])) : 0
      const target = this.model.localToWorld(new THREE.Vector3(pose.hand[0] * k2, (pose.hand[1] + lift) * k2, pose.hand[2] * k2))
      const elbowSide = (side === 'l' ? 1 : -1) * (0.25 + (pose.elbowOut ?? 0.3) * 0.5)
      const pole = this.model.localToWorld(new THREE.Vector3(elbowSide * k2, 0.75 * k2, -0.35 * k2))
      solveArm(up, lo, ha, target, pole, this.ikW[side])
    }
    // head look: yaw towards the look angle, limited, spread over neck and head
    if (a.lookAngle !== null) {
      const bodyYaw = rootYaw
      const wantY = Math.atan2(Math.cos(a.lookAngle), Math.sin(a.lookAngle))
      let d = wantY - bodyYaw
      while (d > Math.PI) d -= Math.PI * 2
      while (d < -Math.PI) d += Math.PI * 2
      d = THREE.MathUtils.clamp(d, -1.1, 1.1)
      this.lookYaw += (d - this.lookYaw) * (1 - Math.exp(-6 * dt))
    } else this.lookYaw *= 1 - Math.exp(-4 * dt)
    for (const [bn, part] of [['neck_01', 0.4], ['head', 0.6]] as const) {
      const b = this.bones.get(bn)
      if (!b) continue
      const parentQ = b.parent!.getWorldQuaternion(new THREE.Quaternion())
      const worldQ = b.getWorldQuaternion(new THREE.Quaternion())
      worldQ.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.lookYaw * part))
      b.quaternion.copy(parentQ.invert().multiply(worldQ))
      b.updateMatrixWorld(true)
    }
  }

  dispose() { this.mixer.stopAllAction() }
}
