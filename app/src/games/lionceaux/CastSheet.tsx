// The character reference sheet of the game: the canonical looks in 3D, turning slowly, with the
// locks the book's art direction imposes. Also the place where art checks are made.
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { useT } from '../../i18n'
import { useDocumentTitle } from '../../lib/hooks'
import { cx } from '../../lib/util'
import { Human } from '../engine/render/human'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { Stage } from '../engine/render/stage'
import { GameFrame, NoWebGL, Panel, TopBar, hasWebGL, useMounted } from '../shared/ui'
import { CAST, type CastId } from './cast'

const GROUPS: { key: string; ids: CastId[] }[] = [
  { key: 'brothers', ids: ['bribri', 'kaydoudou'] },
  { key: 'family', ids: ['mami', 'fokou', 'papa', 'maman'] },
  { key: 'team', ids: ['mireille', 'ousmane', 'radio', 'samuel'] },
  { key: 'quarter', ids: ['ekotto', 'bile', 'bulldozer'] },
]

class Turntable {
  stage: Stage
  chars: Human[] = []
  private raf = 0
  private group = new THREE.Group()
  constructor(el: HTMLElement, ids: CastId[]) {
    this.stage = new Stage(el, { quality: 'high', background: '#efe4cf' })
    const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 48), new THREE.MeshStandardMaterial({ color: '#d9c7a6', roughness: 1 }))
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    this.stage.scene.add(floor, this.group)
    this.stage.sun.position.set(-4, 9, 7)
    this.stage.fitShadow(8, 8)
    const pm = new THREE.PMREMGenerator(this.stage.renderer)
    this.stage.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture
    this.stage.scene.environmentIntensity = 0.55
    this.set(ids)
    const q = new URLSearchParams(location.search)
    const speed = Number(q.get('speed') ?? 0), pose = (q.get('pose') ?? 'idle') as 'idle', spin = q.get('spin') !== '0'
    const clip = q.get('clip'), clipT = Number(q.get('t') ?? 0)
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      if (spin) this.group.rotation.y += dt * 0.25
      for (const c of this.chars) {
        if (clip && c.motion) c.motion.debug = { clip, t: clipT }
        c.update({ speed, velAngle: Math.PI / 2, facing: Math.PI / 2, maxSpeed: 7, anim: pose, animT: 0, kickFoot: 'R', lookAngle: null }, dt)
      }
      this.stage.render()
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
    ;(window as unknown as { __cast?: Turntable }).__cast = this
  }
  set(ids: CastId[]) {
    for (const c of this.chars) { this.group.remove(c.root); c.dispose() }
    this.chars = ids.map((id, i) => {
      const c = new Human(CAST[id].look, { castShadow: true })
      c.root.position.set((i - (ids.length - 1) / 2) * 0.85, 0, 0)
      c.snapFacing(Math.PI / 2)
      this.group.add(c.root)
      return c
    })
    this.group.rotation.y = 0
    const h = Math.max(...this.chars.map((c) => c.height))
    const cam = this.stage.camera
    const zoom = new URLSearchParams(location.search).get('zoom')
    if (zoom === 'head') { cam.position.set(0, h * 0.86, 1.25); cam.lookAt(0, h * 0.82, 0) }
    else if (zoom === 'legs') { cam.position.set(0.3, h * 0.42, 1.3); cam.lookAt(0, h * 0.4, 0) }
    else { cam.position.set(0, h * 0.62, 2.2 + ids.length * 0.75); cam.lookAt(0, h * 0.55, 0) }
  }
  dispose() { cancelAnimationFrame(this.raf); for (const c of this.chars) c.dispose(); this.stage.dispose() }
}

export default function CastSheet() {
  const { t } = useT('lionceaux')
  useDocumentTitle(t('cast.title'))
  const [group, setGroup] = useState(0)
  const webgl = useMemo(() => hasWebGL(), [])
  const { ref, inst } = useMounted((el) => (webgl ? new Turntable(el, GROUPS[0].ids) : null), [webgl])
  const pick = (i: number) => { setGroup(i); inst?.set(GROUPS[i].ids) }
  return (
    <GameFrame className="bg-[#efe4cf]">
      <div ref={ref} className="absolute inset-0" data-testid="game-canvas" />
      {!webgl && <NoWebGL />}
      <TopBar back="/jeux/lionceaux" title={t('cast.title')} sub={t('cast.sub')} />
      <div className="absolute inset-x-0 bottom-0 z-20 p-2 sm:p-3">
        <Panel className="mx-auto max-w-2xl p-4">
          <div className="flex flex-wrap gap-1.5" role="tablist">
            {GROUPS.map((g, i) => <button key={g.key} type="button" role="tab" aria-selected={group === i} onClick={() => pick(i)} className={cx('min-h-[44px] rounded-full px-4 text-[14px] font-semibold', group === i ? 'bg-cream text-ink' : 'bg-white/10')}>{t(`cast.groups.${g.key}`)}</button>)}
          </div>
          <ul className="mt-3 grid gap-2 text-[13.5px] leading-snug sm:grid-cols-2">
            {GROUPS[group].ids.map((id) => (
              <li key={id}><span className="font-semibold" style={{ color: CAST[id].color === '#2E6B45' ? '#8fd3a8' : undefined }}>{CAST[id].name}</span> : <span className="text-cream/80">{t(`cast.notes.${id}`)}</span></li>
            ))}
          </ul>
        </Panel>
      </div>
    </GameFrame>
  )
}
