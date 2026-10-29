// Vegetation and ground detail for the places of Lionceaux, drawn in the browser: leaf textures painted
// on canvases (mango leaves, palm leaflets, banana leaves, grass blades), trees built from real limbs
// and hundreds of alpha-cut leaf cards with outward normals (so a crown shades like a volume and casts
// a dappled shadow), palms with fronds that arc and droop, grass tufts along the edges.
import * as THREE from 'three'
import { canvasTexture, seeded, type SetBuilder } from './common'

/* ------------------------------------------------------------------ textures */

const cache = new Map<string, THREE.Texture>()
function once(key: string, make: () => THREE.Texture) { let t = cache.get(key); if (!t) { t = make(); cache.set(key, t) } return t }

/**
 * A cut-out texture painted on a canvas, with the colour bled into the transparent pixels (otherwise
 * the mipmaps of alpha-tested leaves fringe them with black).
 */
function cutout(w: number, h: number, bleed: string, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, repeat = false): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const g = c.getContext('2d', { willReadFrequently: true })!
  draw(g, w, h)
  const img = g.getImageData(0, 0, w, h)
  const d = img.data
  const col = new THREE.Color(bleed)
  const br = Math.round(col.r * 255), bg = Math.round(col.g * 255), bb = Math.round(col.b * 255)
  // average colour of the opaque pixels, mixed with the bleed colour
  let sr = 0, sg = 0, sb = 0, n = 0
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; n++ }
  const ar = n ? (sr / n + br) / 2 : br, ag = n ? (sg / n + bg) / 2 : bg, ab = n ? (sb / n + bb) / 2 : bb
  const out = new Uint8Array(d.length)
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3]
    if (a < 128) { out[i] = ar; out[i + 1] = ag; out[i + 2] = ab } else { out[i] = d[i]; out[i + 1] = d[i + 1]; out[i + 2] = d[i + 2] }
    out[i + 3] = a
  }
  // canvas rows go top to bottom: flip so the texture reads like a CanvasTexture (flipY)
  const flipped = new Uint8Array(out.length)
  const row = w * 4
  for (let y = 0; y < h; y++) flipped.set(out.subarray(y * row, y * row + row), (h - 1 - y) * row)
  const t = new THREE.DataTexture(flipped, w, h, THREE.RGBAFormat)
  t.colorSpace = THREE.SRGBColorSpace
  t.generateMipmaps = true
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.magFilter = THREE.LinearFilter
  t.anisotropy = 4
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.needsUpdate = true
  return t
}

/** A spray of mango leaves: long, narrow, pointed, dark glossy green with a pale midrib. */
export function mangoLeafTexture() {
  return once('mango', () => {
    const t = cutout(512, 512, '#24552a', (g, w, h) => {
      g.clearRect(0, 0, w, h)
      const r = seeded(7)
      const leaf = (x: number, y: number, ang: number, len: number, wid: number, col: string) => {
        g.save(); g.translate(x, y); g.rotate(ang)
        g.fillStyle = col
        g.beginPath(); g.moveTo(0, 0)
        g.bezierCurveTo(len * 0.3, -wid, len * 0.75, -wid * 0.8, len, 0)
        g.bezierCurveTo(len * 0.75, wid * 0.8, len * 0.3, wid, 0, 0)
        g.fill()
        g.strokeStyle = 'rgba(200,220,150,0.45)'; g.lineWidth = 1.4
        g.beginPath(); g.moveTo(2, 0); g.lineTo(len * 0.95, 0); g.stroke()
        g.restore()
      }
      const greens = ['#1f4a22', '#24552a', '#2c6230', '#1a3f1e', '#336b2f', '#2a5a26']
      // several twigs, each with a whorl of leaves (mango leaves grow in clusters at the twig ends)
      for (let k = 0; k < 7; k++) {
        const cx = w * (0.25 + r() * 0.5), cy = h * (0.25 + r() * 0.5)
        const base = r() * Math.PI * 2
        const n = 9 + Math.floor(r() * 6)
        for (let i = 0; i < n; i++) {
          const a = base + (i / n) * Math.PI * 2 + (r() - 0.5) * 0.4
          leaf(cx, cy, a, 95 + r() * 80, 14 + r() * 8, greens[Math.floor(r() * greens.length)])
        }
      }
      // a few young reddish leaves at the tips
      for (let i = 0; i < 6; i++) leaf(w * (0.15 + r() * 0.7), h * (0.15 + r() * 0.7), r() * 6.28, 60 + r() * 40, 10, 'rgba(120,70,40,0.85)')
    })
    return t
  })
}

/** A strip of palm leaflets on a rachis (v along the frond, u across). */
export function palmLeafTexture() {
  return once('palm', () => cutout(256, 512, '#3f7a30', (g, w, h) => {
    g.clearRect(0, 0, w, h)
    const r = seeded(11)
    const mid = w / 2
    for (let y = 8; y < h - 4; y += 7) {
      const t = y / h
      const len = (w / 2 - 6) * (0.35 + 0.65 * Math.sin(Math.min(1, t * 1.25) * Math.PI * 0.5) * (1 - Math.max(0, t - 0.8) * 2.2))
      for (const s of [-1, 1]) {
        g.strokeStyle = ['#3b7a2e', '#447f33', '#356b28', '#4f8a3a'][Math.floor(r() * 4)]
        g.lineWidth = 4 + r() * 2
        g.beginPath(); g.moveTo(mid, y)
        g.quadraticCurveTo(mid + s * len * 0.5, y + 10, mid + s * len, y + 26 + r() * 10)
        g.stroke()
      }
    }
    g.strokeStyle = '#8a7a3a'; g.lineWidth = 4
    g.beginPath(); g.moveTo(mid, 0); g.lineTo(mid, h); g.stroke()
  }))
}

/** A banana leaf: broad, bright, a pale midrib, torn into strips at the edges. */
export function bananaLeafTexture() {
  return once('banana', () => cutout(256, 512, '#4e8c35', (g, w, h) => {
    g.clearRect(0, 0, w, h)
    const r = seeded(13)
    const mid = w / 2
    g.fillStyle = '#4e8c35'
    g.beginPath(); g.moveTo(mid, 0)
    g.bezierCurveTo(w * 1.02, h * 0.15, w * 1.02, h * 0.85, mid, h)
    g.bezierCurveTo(-w * 0.02, h * 0.85, -w * 0.02, h * 0.15, mid, 0)
    g.fill()
    // veins
    g.strokeStyle = 'rgba(30,70,20,0.35)'; g.lineWidth = 1.5
    for (let y = 10; y < h; y += 9) { g.beginPath(); g.moveTo(mid, y); g.lineTo(2, y + 30); g.moveTo(mid, y); g.lineTo(w - 2, y + 30); g.stroke() }
    // tears: cut the blade into strips
    g.globalCompositeOperation = 'destination-out'
    for (let i = 0; i < 14; i++) {
      const y = r() * h, s = r() < 0.5 ? -1 : 1
      g.fillRect(s > 0 ? mid + 10 + r() * 30 : 0, y, s > 0 ? w : mid - 10 - r() * 30, 1.6 + r() * 1.5)
    }
    g.globalCompositeOperation = 'source-over'
    g.fillStyle = '#c9d98a'; g.fillRect(mid - 3, 0, 6, h)
  }))
}

/** A clump of grass blades. */
export function grassTexture() {
  return once('grass', () => cutout(256, 256, '#7d8a3c', (g, w, h) => {
    g.clearRect(0, 0, w, h)
    const r = seeded(17)
    for (let i = 0; i < 90; i++) {
      const x = w * (0.2 + r() * 0.6), top = h * (0.05 + r() * 0.55), bend = (r() - 0.5) * 70
      g.strokeStyle = ['#7d8a3c', '#6b7a35', '#9a9a4a', '#5d6b2e', '#a89a5a'][Math.floor(r() * 5)]
      g.lineWidth = 2 + r() * 2.5
      g.beginPath(); g.moveTo(x + (r() - 0.5) * 10, h); g.quadraticCurveTo(x, h * 0.6, x + bend, top); g.stroke()
    }
  }))
}

/** Bark: vertical fissures. */
export function barkTexture(color = '#5a4636') {
  return once('bark' + color, () => canvasTexture(128, 256, (g, w, h) => {
    const r = seeded(19)
    g.fillStyle = color; g.fillRect(0, 0, w, h)
    for (let i = 0; i < 60; i++) {
      g.strokeStyle = r() < 0.5 ? 'rgba(30,20,12,0.5)' : 'rgba(150,130,110,0.25)'
      g.lineWidth = 1 + r() * 3
      const x = r() * w
      g.beginPath(); g.moveTo(x, 0)
      for (let y = 0; y < h; y += 16) g.lineTo(x + (r() - 0.5) * 8, y)
      g.stroke()
    }
  }, { repeat: [2, 3] }))
}

/** Palm trunk: rings of old leaf bases. */
export function palmTrunkTexture() {
  return once('palmTrunk', () => canvasTexture(64, 256, (g, w, h) => {
    const r = seeded(23)
    g.fillStyle = '#7a6550'; g.fillRect(0, 0, w, h)
    for (let y = 0; y < h; y += 10) {
      g.fillStyle = r() < 0.5 ? '#5e4c3a' : '#6b5844'
      g.fillRect(0, y, w, 3 + r() * 2)
      g.fillStyle = 'rgba(200,180,150,0.18)'; g.fillRect(0, y + 5, w, 2)
    }
  }, { repeat: [3, 6] }))
}

/** Fine dirt for close-ups: grains and pebbles (multiplied over the painted ground). */
export function dirtDetailTexture() {
  return once('dirt', () => {
    const t = canvasTexture(256, 256, (g, w, h) => {
      const r = seeded(29)
      g.fillStyle = '#808080'; g.fillRect(0, 0, w, h)
      for (let i = 0; i < 9000; i++) {
        const v = 100 + Math.floor(r() * 60)
        g.fillStyle = `rgb(${v},${v},${v})`
        g.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5)
      }
      for (let i = 0; i < 160; i++) {
        const v = r() < 0.5 ? 175 + Math.floor(r() * 50) : 70 + Math.floor(r() * 30)
        g.fillStyle = `rgb(${v},${v},${v})`
        g.beginPath(); g.ellipse(r() * w, r() * h, 1.5 + r() * 3, 1 + r() * 2.5, r() * 3, 0, Math.PI * 2); g.fill()
      }
    }, { repeat: [1, 1], srgb: false })
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    return t
  })
}

/** Turf seen close: fine blades and tufts (grey, multiplied over the painted grass). */
export function grassDetailTexture() {
  return once('turf', () => {
    const t = canvasTexture(256, 256, (g, w, h) => {
      const r = seeded(37)
      g.fillStyle = '#808080'; g.fillRect(0, 0, w, h)
      for (let i = 0; i < 7000; i++) {
        const v = 90 + Math.floor(r() * 90)
        g.strokeStyle = `rgb(${v},${v},${v})`
        g.lineWidth = 1
        const x = r() * w, y = r() * h, l = 2 + r() * 5
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 2, y - l); g.stroke()
      }
    }, { repeat: [1, 1], srgb: false })
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    return t
  })
}

/** Multiply a tiled detail texture over a ground material's painted map (sharp up close, same colour far). */
export function addGroundDetail(m: THREE.MeshStandardMaterial, repeat: number, strength = 0.45, tex?: THREE.Texture) {
  const det = tex ?? dirtDetailTexture()
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uDetail = { value: det }
    sh.uniforms.uRepeat = { value: repeat }
    sh.uniforms.uStrength = { value: strength }
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uDetail; uniform float uRepeat; uniform float uStrength;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        { vec2 du = vMapUv * uRepeat; float d = texture2D(uDetail, du).r * 0.6 + texture2D(uDetail, du * 0.37 + 0.13).r * 0.4;
          diffuseColor.rgb *= mix(1.0, d * 2.0, uStrength); }`)
  }
  m.customProgramCacheKey = () => 'ground-detail' + (tex ? '-t' : '')
}

/* ------------------------------------------------------------------ foliage materials */

function foliageMaterial(b: SetBuilder, key: string, tex: THREE.Texture, rough = 0.7) {
  return b.material(key, () => {
    const m = new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, alphaTest: 0.42, side: THREE.DoubleSide, roughness: rough })
    // both sides of a leaf card take the light of its (outward) normal
    m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n  normal = normalize( vNormal );') }
    m.customProgramCacheKey = () => 'foliage'
    m.userData.depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.42 })
    return m
  })
}

/** A card (quad) in world space with normals bent towards `out` (crowns light like volumes). */
function card(center: THREE.Vector3, size: number, rot: THREE.Quaternion, out: THREE.Vector3, bend = 0.65) {
  const geo = new THREE.PlaneGeometry(size, size)
  geo.applyQuaternion(rot)
  geo.translate(center.x, center.y, center.z)
  const n = geo.attributes.normal as THREE.BufferAttribute
  const fn = new THREE.Vector3(0, 0, 1).applyQuaternion(rot)
  if (fn.dot(out) < 0) fn.negate()
  const v = new THREE.Vector3()
  for (let i = 0; i < n.count; i++) {
    v.copy(fn).lerp(out, bend).normalize()
    n.setXYZ(i, v.x, v.y, v.z)
  }
  return geo
}

/* ------------------------------------------------------------------ trees */

/** A tapered limb from a to b (a cylinder aligned on the segment). */
function limb(b: SetBuilder, a: THREE.Vector3, c: THREE.Vector3, r0: number, r1: number, mat: THREE.Material, color = '#ffffff') {
  const len = a.distanceTo(c)
  const geo = new THREE.CylinderGeometry(r1, r0, len, 8, 1, true)
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), c.clone().sub(a).normalize())
  b.add(geo, color, new THREE.Matrix4().compose(a.clone().add(c).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)), { mat })
}

/**
 * A big mango tree: a short thick trunk, limbs spreading into a wide dome, and a dense crown of leaf
 * sprays (`radius` across, the crown's underside at `height`).
 */
export function mangoTree(b: SetBuilder, at: THREE.Vector3, radius: number, height: number, rnd: () => number, quality = 1) {
  const bark = b.material('bark', () => new THREE.MeshStandardMaterial({ map: barkTexture(), vertexColors: true, roughness: 0.95 }))
  const leaves = foliageMaterial(b, 'mangoLeaves', mangoLeafTexture(), 0.55)
  const fork = at.clone().add(new THREE.Vector3(0, height * 0.62, 0))
  limb(b, at.clone().add(new THREE.Vector3(0, -0.1, 0)), fork, 0.42, 0.3, bark)
  // root flare
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + rnd()
    limb(b, at.clone().add(new THREE.Vector3(Math.cos(a) * 0.75, 0.02, Math.sin(a) * 0.75)), at.clone().add(new THREE.Vector3(Math.cos(a) * 0.12, 0.7, Math.sin(a) * 0.12)), 0.12, 0.2, bark)
  }
  const tips: THREE.Vector3[] = []
  const main = 5
  for (let i = 0; i < main; i++) {
    const a = (i / main) * Math.PI * 2 + rnd() * 0.6
    const reach = radius * (0.45 + rnd() * 0.2)
    const p1 = fork.clone().add(new THREE.Vector3(Math.cos(a) * reach * 0.55, height * 0.32 + rnd() * 0.5, Math.sin(a) * reach * 0.55))
    limb(b, fork, p1, 0.24, 0.15, bark)
    for (let k = 0; k < 3; k++) {
      const a2 = a + (rnd() - 0.5) * 1.3
      const p2 = p1.clone().add(new THREE.Vector3(Math.cos(a2) * reach * (0.35 + rnd() * 0.3), height * (0.15 + rnd() * 0.3), Math.sin(a2) * reach * (0.35 + rnd() * 0.3)))
      limb(b, p1, p2, 0.12, 0.05, bark)
      tips.push(p2)
    }
  }
  // the crown: an oblate dome of leaf sprays, denser at the surface
  const centre = at.clone().add(new THREE.Vector3(0, height + radius * 0.32, 0))
  const n = Math.round(620 * quality)
  const out = new THREE.Vector3(), pos = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler()
  for (let i = 0; i < n; i++) {
    // a point in the shell of an ellipsoid (rx = radius, ry = radius * 0.55)
    const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2
    const s = Math.sqrt(1 - u * u)
    const dir = new THREE.Vector3(s * Math.cos(th), Math.max(-0.35, u), s * Math.sin(th))
    const shell = 0.72 + Math.pow(rnd(), 0.4) * 0.3
    pos.set(dir.x * radius * shell, dir.y * radius * 0.55 * shell, dir.z * radius * shell).add(centre)
    // near a branch tip now and then: the crown is lumpy, not a ball
    if (rnd() < 0.35 && tips.length) pos.lerp(tips[Math.floor(rnd() * tips.length)], 0.25)
    out.copy(pos).sub(centre).normalize()
    e.set(rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI)
    q.setFromEuler(e)
    const geo = card(pos, 1.3 + rnd() * 0.9, q, out)
    const c = new THREE.Color().setHSL(0.22 + rnd() * 0.08, 0.3 + rnd() * 0.2, 0.68 + rnd() * 0.22 + out.y * 0.08)
    b.add(geo, c, null, { mat: leaves })
  }
  return centre
}

/** A coconut / oil palm: a slender curved ringed trunk, a crown of arching fronds, a few coconuts. */
export function palmTree(b: SetBuilder, at: THREE.Vector3, h: number, lean: number, rnd: () => number) {
  const trunk = b.material('palmTrunk', () => new THREE.MeshStandardMaterial({ map: palmTrunkTexture(), vertexColors: true, roughness: 0.95 }))
  const fronds = foliageMaterial(b, 'palmFronds', palmLeafTexture(), 0.75)
  const dir = rnd() * Math.PI * 2
  const top = at.clone().add(new THREE.Vector3(Math.cos(dir) * lean, h, Math.sin(dir) * lean))
  const ctrl = at.clone().add(new THREE.Vector3(Math.cos(dir) * lean * 0.1, h * 0.55, Math.sin(dir) * lean * 0.1))
  const curve = new THREE.QuadraticBezierCurve3(at.clone(), ctrl, top)
  const tube = new THREE.TubeGeometry(curve, 14, 0.17, 8, false)
  // taper: thinner at the top
  const p = tube.attributes.position as THREE.BufferAttribute
  const tmp = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    tmp.fromBufferAttribute(p, i)
    const tt = THREE.MathUtils.clamp((tmp.y - at.y) / h, 0, 1)
    const c = curve.getPoint(tt)
    tmp.sub(c).multiplyScalar(1.15 - tt * 0.4).add(c)
    p.setXYZ(i, tmp.x, tmp.y, tmp.z)
  }
  b.add(tube, '#ffffff', null, { mat: trunk })
  // fronds: ribbons that rise, arch and droop, folded along the rachis
  const nf = 13
  for (let i = 0; i < nf; i++) {
    const a = (i / nf) * Math.PI * 2 + rnd() * 0.4
    const len = 3.2 + rnd() * 1.4
    const up = 0.25 + rnd() * 0.65
    const segs = 10
    const pos: number[] = [], uv: number[] = [], idx: number[] = []
    const side = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a))
    for (let k = 0; k <= segs; k++) {
      const t = k / segs
      const d = len * t
      const y = up * d - 0.55 * d * d / len * 1.4
      const c = top.clone().add(new THREE.Vector3(Math.cos(a) * d, y, Math.sin(a) * d))
      const wdt = 0.55 * Math.sin(Math.min(1, t * 1.2) * Math.PI * 0.6 + 0.3) * (1 - t * 0.45)
      for (const s of [-1, 0, 1]) {
        const q = c.clone().add(side.clone().multiplyScalar(s * wdt)).add(new THREE.Vector3(0, s === 0 ? 0.06 : -0.05 * Math.abs(s), 0))
        pos.push(q.x, q.y, q.z)
        uv.push((s + 1) / 2, t)
      }
    }
    for (let k = 0; k < segs; k++) for (let s = 0; s < 2; s++) {
      const a0 = k * 3 + s, a1 = a0 + 1, b0 = a0 + 3, b1 = b0 + 1
      idx.push(a0, b0, a1, a1, b0, b1)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    geo.setIndex(idx)
    geo.computeVertexNormals()
    b.add(geo, new THREE.Color().setHSL(0.2 + rnd() * 0.06, 0.25, 0.72 + rnd() * 0.2), null, { mat: fronds })
  }
  for (let i = 0; i < 5; i++) {
    const a = rnd() * Math.PI * 2
    b.add(new THREE.SphereGeometry(0.11, 8, 6), rnd() < 0.5 ? '#6b5a2a' : '#7a8a3a', new THREE.Matrix4().makeTranslation(top.x + Math.cos(a) * 0.22, top.y - 0.25, top.z + Math.sin(a) * 0.22))
  }
}

/** A banana plant: a few pseudo-stems and broad torn leaves that arch out. */
export function bananaPlant(b: SetBuilder, at: THREE.Vector3, rnd: () => number) {
  const leafMat = foliageMaterial(b, 'bananaLeaves', bananaLeafTexture(), 0.6)
  for (let s = 0; s < 3; s++) {
    const base = at.clone().add(new THREE.Vector3((rnd() - 0.5) * 0.7, 0, (rnd() - 0.5) * 0.7))
    const hh = 1.3 + rnd() * 0.9
    b.add(new THREE.CylinderGeometry(0.09, 0.14, hh, 8), '#7a8a46', new THREE.Matrix4().makeTranslation(base.x, hh / 2, base.z))
    const n = 5 + Math.floor(rnd() * 3)
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd() * 0.5
      const len = 1.4 + rnd() * 0.8, segs = 6
      const pos: number[] = [], uv: number[] = [], idx: number[] = []
      const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a))
      const side = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a))
      const up = 0.8 + rnd() * 0.6
      const top = new THREE.Vector3(base.x, hh, base.z)
      for (let k = 0; k <= segs; k++) {
        const t = k / segs, d = len * t
        const c = top.clone().add(dir.clone().multiplyScalar(d)).add(new THREE.Vector3(0, up * d - 0.9 * d * d / len, 0))
        for (const sg of [-1, 1]) {
          const q = c.clone().add(side.clone().multiplyScalar(sg * 0.32))
          pos.push(q.x, q.y, q.z); uv.push((sg + 1) / 2, t)
        }
      }
      for (let k = 0; k < segs; k++) { const a0 = k * 2; idx.push(a0, a0 + 2, a0 + 1, a0 + 1, a0 + 2, a0 + 3) }
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
      geo.setIndex(idx)
      geo.computeVertexNormals()
      b.add(geo, new THREE.Color().setHSL(0.22, 0.25, 0.8 + rnd() * 0.15), null, { mat: leafMat })
    }
  }
}

/** Grass tufts scattered where `density(x, z)` (three coordinates) says, as crossed alpha cards. */
export function grassTufts(b: SetBuilder, area: { x0: number; z0: number; x1: number; z1: number }, count: number, density: (x: number, z: number) => number, rnd: () => number) {
  const mat = foliageMaterial(b, 'grass', grassTexture(), 0.9)
  let placed = 0, tries = 0
  while (placed < count && tries < count * 8) {
    tries++
    const x = area.x0 + rnd() * (area.x1 - area.x0), z = area.z0 + rnd() * (area.z1 - area.z0)
    if (rnd() > density(x, z)) continue
    placed++
    const s = 0.28 + rnd() * 0.35
    const col = new THREE.Color().setHSL(0.15 + rnd() * 0.08, 0.2 + rnd() * 0.2, 0.7 + rnd() * 0.25)
    for (let k = 0; k < 2; k++) {
      const geo = new THREE.PlaneGeometry(s * 1.2, s)
      geo.translate(0, s / 2, 0)
      geo.rotateY(rnd() * Math.PI + k * Math.PI / 2)
      // grass lit like the ground beneath it
      const n = geo.attributes.normal as THREE.BufferAttribute
      for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0)
      geo.translate(x, 0, z)
      b.add(geo, col, null, { mat, cast: false })
    }
  }
}
