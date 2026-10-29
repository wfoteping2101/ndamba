// The people of the quarter who watch: cheap instanced figures (two draw calls per posture),
// standing or sitting on walls and roofs, in varied clothes and skin tones. Close-ups use the
// real characters; these fill the edges of the picture.
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

export interface Spot { p: THREE.Vector3; rot: number; sit: boolean; kid?: boolean }

function colored(geo: THREE.BufferGeometry, m: THREE.Matrix4, shade: number) {
  const g = geo.index ? geo.toNonIndexed() : geo
  if (g !== geo) geo.dispose()
  g.deleteAttribute('uv')
  g.applyMatrix4(m)
  const n = g.attributes.position.count
  const col = new Float32Array(n * 3).fill(shade)
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  return g
}
const T = (x: number, y: number, z: number, rx = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz)), new THREE.Vector3(1, 1, 1))

/** One figure (1.0 = a 1.45 m child), split into clothes (tinted per person) and skin. */
function figure(sit: boolean) {
  const cloth: THREE.BufferGeometry[] = []
  const skin: THREE.BufferGeometry[] = []
  const hip = sit ? 0.0 : 0.66
  // torso and short sleeves
  cloth.push(colored(new THREE.CylinderGeometry(0.15, 0.13, 0.5, 8), T(0, hip + 0.3, 0), 1))
  for (const s of [-1, 1]) cloth.push(colored(new THREE.CylinderGeometry(0.055, 0.05, 0.16, 6), T(s * 0.19, hip + 0.47, 0, 0, s * 0.25), 1))
  // shorts (darker version of the shirt colour)
  cloth.push(colored(new THREE.CylinderGeometry(0.145, 0.15, 0.16, 8), T(0, hip + 0.03, 0), 0.38))
  // head, neck, arms
  skin.push(colored(new THREE.SphereGeometry(0.12, 10, 8), T(0, hip + 0.72, 0.01), 1))
  skin.push(colored(new THREE.SphereGeometry(0.125, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), T(0, hip + 0.74, -0.005), 0.25))
  skin.push(colored(new THREE.CylinderGeometry(0.04, 0.045, 0.1, 6), T(0, hip + 0.59, 0), 1))
  for (const s of [-1, 1]) skin.push(colored(new THREE.CylinderGeometry(0.035, 0.03, 0.42, 6), T(s * 0.21, hip + 0.22, sit ? 0.06 : 0, sit ? -0.4 : 0, s * 0.12), 1))
  // legs: standing, or thighs forward and shins hanging when sitting on a wall or a roof edge
  for (const s of [-1, 1]) {
    if (sit) {
      skin.push(colored(new THREE.CylinderGeometry(0.055, 0.05, 0.38, 6), T(s * 0.08, 0.0, 0.19, Math.PI / 2), 1))
      skin.push(colored(new THREE.CylinderGeometry(0.045, 0.04, 0.4, 6), T(s * 0.08, -0.2, 0.38), 1))
      skin.push(colored(new THREE.BoxGeometry(0.08, 0.05, 0.16), T(s * 0.08, -0.41, 0.42), 0.3))
    } else {
      skin.push(colored(new THREE.CylinderGeometry(0.055, 0.045, 0.66, 6), T(s * 0.08, 0.33, 0), 1))
      skin.push(colored(new THREE.BoxGeometry(0.08, 0.05, 0.17), T(s * 0.08, 0.025, 0.03), 0.3))
    }
  }
  const c = mergeGeometries(cloth, false)!, k = mergeGeometries(skin, false)!
  for (const g of [...cloth, ...skin]) g.dispose()
  return { cloth: c, skin: k }
}

const SHIRTS = ['#c45a3a', '#e2c26a', '#5a8ab6', '#f2eee3', '#7aa05a', '#b65a8a', '#3a3a3a', '#d98a2a', '#2f6b45', '#c9362b', '#1f7a7a', '#f0b92e']
const SKINS = ['#5B3A27', '#4a2f20', '#6b4430', '#3d271b', '#7a5038']

/** Instanced crowd at the given spots (three coordinates; for sitters, p is the seat). */
export function crowdMeshes(spots: Spot[], rnd: () => number, shadows: boolean) {
  const out: THREE.InstancedMesh[] = []
  const geos: THREE.BufferGeometry[] = []
  const mats: THREE.Material[] = []
  for (const sit of [false, true]) {
    const list = spots.filter((s) => s.sit === sit)
    if (!list.length) continue
    const f = figure(sit)
    geos.push(f.cloth, f.skin)
    const clothMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 })
    const skinMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 })
    mats.push(clothMat, skinMat)
    const cm = new THREE.InstancedMesh(f.cloth, clothMat, list.length)
    const sm = new THREE.InstancedMesh(f.skin, skinMat, list.length)
    const m = new THREE.Matrix4(), c = new THREE.Color()
    list.forEach((s, i) => {
      const sc = (s.kid === false ? 1.15 : 0.85) + rnd() * 0.3
      m.compose(s.p, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.rot + (rnd() - 0.5) * 0.7), new THREE.Vector3(sc, sc, sc))
      cm.setMatrixAt(i, m); sm.setMatrixAt(i, m)
      cm.setColorAt(i, c.set(SHIRTS[Math.floor(rnd() * SHIRTS.length)]))
      sm.setColorAt(i, c.set(SKINS[Math.floor(rnd() * SKINS.length)]))
    })
    cm.castShadow = shadows; sm.castShadow = shadows
    out.push(cm, sm)
  }
  return { meshes: out, dispose() { for (const g of geos) g.dispose(); for (const m of mats) m.dispose() } }
}
