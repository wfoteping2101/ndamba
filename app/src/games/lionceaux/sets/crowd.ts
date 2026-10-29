// The people of the quarter who watch: real figures baked offline from the game's characters in poses
// from the motion library (standing, waiting, sitting on a wall, cheering; men and women in pagne), one
// instanced draw per pose. Each person gets their own skin, shirt, shorts or skirt and hair colours
// (a region code in the vertex colours says which part is which). Close-ups use the real characters.
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export interface Spot { p: THREE.Vector3; rot: number; sit: boolean; kid?: boolean; cheer?: boolean }

const BASE = `${import.meta.env.BASE_URL ?? '/'}jeux/humans/`
type Variant = 'kidStand' | 'kidWait' | 'kidSit' | 'kidCheer' | 'manStand' | 'womanStand'
const VARIANTS: Variant[] = ['kidStand', 'kidWait', 'kidSit', 'kidCheer', 'manStand', 'womanStand']
interface Meta { seat: number; kid: boolean }

let assets: Promise<{ geos: Map<Variant, THREE.BufferGeometry>; meta: Record<Variant, Meta> }> | null = null
function load() {
  if (!assets) {
    assets = (async () => {
      const meta = await fetch(`${BASE}crowd.json`).then((r) => r.json() as Promise<Record<Variant, Meta>>)
      const loader = new GLTFLoader()
      const geos = new Map<Variant, THREE.BufferGeometry>()
      await Promise.all(VARIANTS.map(async (v) => {
        const g = await loader.loadAsync(`${BASE}crowd_${v}.glb`)
        let geo: THREE.BufferGeometry | null = null
        g.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && !geo) { m.updateWorldMatrix(true, false); geo = m.geometry.clone().applyMatrix4(m.matrixWorld) } })
        if (geo) geos.set(v, geo)
      }))
      return { geos, meta }
    })()
  }
  return assets
}

const SHIRTS = ['#c45a3a', '#e2c26a', '#5a8ab6', '#f2eee3', '#7aa05a', '#b65a8a', '#3a3a3a', '#d98a2a', '#2f6b45', '#c9362b', '#1f7a7a', '#f0b92e', '#8a5a9a', '#e9e3d6']
const BOTTOMS = ['#2a2a2a', '#2f3f5a', '#5a3a2a', '#3a4a3a', '#6d7550', '#1f2a44', '#4a4a4a']
const PAGNES = ['#c9362b', '#2f5aa0', '#1f9a9a', '#e2a22a', '#7a3a6a', '#3f8f4e']
const SKINS = ['#5B3A27', '#4a2f20', '#6b4430', '#3d271b', '#7a5038', '#56372a']
const HAIRS = ['#15100c', '#1d140e', '#120d0a', '#2a1c12']

function crowdMaterial() {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.82 })
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec4 color; attribute vec3 iSkin; attribute vec3 iShirt; attribute vec3 iBottom; attribute vec3 iHair; varying vec3 vReg;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float r = color.r; vec3 c = iSkin;
        if (r > 0.2) c = iShirt; if (r > 0.4) c = iBottom; if (r > 0.6) c = iHair; if (r > 0.8) c = vec3(0.06, 0.055, 0.05); if (r > 0.93) c = vec3(0.7, 0.66, 0.6);
        vReg = c;`)
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vReg;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = vReg;')
  }
  m.customProgramCacheKey = () => 'crowd-regions'
  return m
}

/** Instanced crowd at the given spots (three coordinates; for sitters, p is the seat). */
export function crowdMeshes(spots: Spot[], rnd: () => number, shadows: boolean) {
  const group = new THREE.Group()
  group.name = 'crowd'
  const mats: THREE.Material[] = []
  const meshes: THREE.InstancedMesh[] = []
  // choose everyone's pose and clothes now (deterministic), build when the figures have loaded
  const people = spots.map((s) => {
    const adult = s.kid === false || (!s.sit && rnd() < 0.28)
    const woman = adult && rnd() < 0.5
    const v: Variant = s.sit ? 'kidSit' : adult ? (woman ? 'womanStand' : 'manStand') : s.cheer ? 'kidCheer' : rnd() < 0.5 ? 'kidStand' : 'kidWait'
    return {
      s, v, sc: adult ? 0.94 + rnd() * 0.12 : 0.88 + rnd() * 0.24, turn: (rnd() - 0.5) * 0.7,
      skin: SKINS[Math.floor(rnd() * SKINS.length)], shirt: woman ? PAGNES[Math.floor(rnd() * PAGNES.length)] : SHIRTS[Math.floor(rnd() * SHIRTS.length)],
      bottom: woman ? PAGNES[Math.floor(rnd() * PAGNES.length)] : BOTTOMS[Math.floor(rnd() * BOTTOMS.length)], hair: woman ? PAGNES[Math.floor(rnd() * PAGNES.length)] : HAIRS[Math.floor(rnd() * HAIRS.length)],
    }
  })
  let disposed = false
  void load().then(({ geos, meta }) => {
    if (disposed) return
    for (const v of VARIANTS) {
      const list = people.filter((p) => p.v === v)
      const shared = geos.get(v)
      if (!list.length || !shared) continue
      const geo = shared.clone()
      const mat = crowdMaterial()
      mats.push(mat)
      const im = new THREE.InstancedMesh(geo, mat, list.length)
      const attrs = { iSkin: new Float32Array(list.length * 3), iShirt: new Float32Array(list.length * 3), iBottom: new Float32Array(list.length * 3), iHair: new Float32Array(list.length * 3) }
      const m = new THREE.Matrix4(), c = new THREE.Color(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0)
      list.forEach((p, i) => {
        const pos = p.s.p.clone()
        if (p.s.sit) pos.y -= meta[v].seat * p.sc
        m.compose(pos, q.setFromAxisAngle(up, p.s.rot + p.turn), new THREE.Vector3(p.sc, p.sc, p.sc))
        im.setMatrixAt(i, m)
        for (const [k, col] of [['iSkin', p.skin], ['iShirt', p.shirt], ['iBottom', p.bottom], ['iHair', p.hair]] as const) {
          c.set(col)
          attrs[k].set([c.r, c.g, c.b], i * 3)
        }
      })
      for (const [k, arr] of Object.entries(attrs)) geo.setAttribute(k, new THREE.InstancedBufferAttribute(arr, 3))
      im.castShadow = shadows
      im.receiveShadow = true
      im.instanceMatrix.needsUpdate = true
      im.computeBoundingSphere()
      group.add(im)
      meshes.push(im)
    }
  }).catch((e) => console.warn('crowd unavailable', e))
  return { meshes: [group] as unknown as THREE.InstancedMesh[], dispose() { disposed = true; for (const m of mats) m.dispose(); for (const im of meshes) im.geometry.dispose() } }
}
