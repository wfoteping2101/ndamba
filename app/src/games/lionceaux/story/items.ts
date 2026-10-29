// Small things held in the hands during a scene (chapter 9: Mrs. Hayes's sweet potato pie, Mr. Hayes's
// snow shovel, Mrs. Patterson's little card with « snow » and a snowflake). Modelled pointing along +x
// (the holder's forward), origin at the hands.
import * as THREE from 'three'

export type ItemKind = 'pie' | 'shovel' | 'card' | 'tablet'

function cardTexture() {
  const c = document.createElement('canvas')
  c.width = 256; c.height = 160
  const g = c.getContext('2d')!
  g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, 256, 160)
  g.strokeStyle = 'rgba(120,150,190,0.35)'; g.lineWidth = 2
  for (let y = 40; y < 160; y += 28) { g.beginPath(); g.moveTo(10, y); g.lineTo(246, y); g.stroke() }
  // the word, in blue marker, and a snowflake beside it
  g.fillStyle = '#2a4f9a'; g.font = 'bold 64px Archivo, Arial, sans-serif'; g.textBaseline = 'middle'
  g.fillText('snow', 28, 86)
  g.strokeStyle = '#2a4f9a'; g.lineWidth = 5; g.lineCap = 'round'
  const cx = 208, cy = 84
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    const ex = cx + Math.cos(a) * 30, ey = cy + Math.sin(a) * 30
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(ex, ey); g.stroke()
    for (const s of [-1, 1]) {
      const mx = cx + Math.cos(a) * 18, my = cy + Math.sin(a) * 18
      g.beginPath(); g.moveTo(mx, my); g.lineTo(mx + Math.cos(a + s * 0.8) * 9, my + Math.sin(a + s * 0.8) * 9); g.stroke()
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

export function makeItem(kind: ItemKind): THREE.Object3D {
  const g = new THREE.Group()
  const mat = (color: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o })
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, p: [number, number, number], r: [number, number, number] = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(geo, m)
    mesh.position.set(...p); mesh.rotation.set(...r)
    mesh.castShadow = true
    g.add(mesh)
    return mesh
  }
  if (kind === 'pie') {
    // a tin, the fluted crust, the orange-brown sweet potato filling
    add(new THREE.CylinderGeometry(0.135, 0.12, 0.035, 28), mat('#b9bec2', { metalness: 0.6, roughness: 0.35 }), [0.04, 0, 0])
    add(new THREE.TorusGeometry(0.125, 0.018, 8, 28), mat('#c98a4a', { roughness: 0.8 }), [0.04, 0.02, 0], [Math.PI / 2, 0, 0])
    add(new THREE.CylinderGeometry(0.115, 0.115, 0.012, 28), mat('#b8642a', { roughness: 0.5 }), [0.04, 0.026, 0])
  } else if (kind === 'shovel') {
    // the wooden handle with its D grip at the hands, down to a wide plastic blade in front
    const wood = mat('#9a7650', { roughness: 0.7 })
    const to = new THREE.Vector3(0.52, -0.66, 0)
    const len = to.length()
    const h = add(new THREE.CylinderGeometry(0.016, 0.018, len, 8), wood, [to.x / 2, to.y / 2, 0])
    h.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().normalize())
    add(new THREE.TorusGeometry(0.05, 0.012, 6, 14), mat('#2a2a2a'), [-0.04, 0.04, 0], [0, 0, 0.7])
    const blade = add(new THREE.BoxGeometry(0.3, 0.02, 0.42), mat('#2f4f7a', { roughness: 0.45 }), [to.x + 0.12, to.y - 0.04, 0])
    blade.rotation.z = -0.35
    add(new THREE.BoxGeometry(0.02, 0.07, 0.42), mat('#2f4f7a', { roughness: 0.45 }), [to.x - 0.02, to.y + 0.0, 0])
  } else if (kind === 'tablet') {
    // a tablet held in front of the chest, tilted up towards the face: a dark slab, its screen lit
    const tilt = new THREE.Group(); tilt.rotation.z = 0.95; tilt.position.set(0.02, 0.05, 0)
    const slab = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.012, 0.17), mat('#1b1c1f', { roughness: 0.35, metalness: 0.3 }))
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.145), new THREE.MeshBasicMaterial({ color: '#a9cfee' }))
    screen.rotation.x = -Math.PI / 2; screen.position.y = 0.0065
    slab.castShadow = true
    tilt.add(slab, screen); g.add(tilt)
  } else {
    // the little card, tilted up towards the one who holds it
    // (face up, the top of the word towards the far edge, the far edge raised a little)
    const card = add(new THREE.PlaneGeometry(0.15, 0.094), new THREE.MeshStandardMaterial({ map: cardTexture(), roughness: 0.8, side: THREE.DoubleSide }), [0, 0, 0], [-Math.PI / 2, 0, 0])
    const turn = new THREE.Group(); turn.rotation.y = -Math.PI / 2
    const tilt = new THREE.Group(); tilt.rotation.z = 0.35; tilt.position.set(0.05, 0.01, 0)
    g.remove(card); turn.add(card); tilt.add(turn); g.add(tilt)
  }
  return g
}

export function disposeItem(o: THREE.Object3D) {
  o.removeFromParent()
  o.traverse((m) => {
    if (m instanceof THREE.Mesh) {
      m.geometry.dispose()
      const ms = Array.isArray(m.material) ? m.material : [m.material]
      for (const x of ms) { (x as THREE.MeshStandardMaterial).map?.dispose(); x.dispose() }
    }
  })
}
