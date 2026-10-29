// The places of the game, to look at freely: each set in each light, with the brothers standing
// in it for scale. The art check of the environments, next to the character sheet.
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as THREE from 'three'
import { useT } from '../../i18n'
import { useDocumentTitle } from '../../lib/hooks'
import { cx } from '../../lib/util'
import { GameFrame, NoWebGL, Panel, TopBar, hasWebGL, useMounted } from '../shared/ui'
import type { Mood } from './sets/common'
import type { PlaceId } from './sets'
import { StoryStage } from './story/stage'

const PLACES: { id: PlaceId; moods: Mood[]; opts?: Record<string, unknown>; at: [number, number]; key: string }[] = [
  { id: 'bona', key: 'bona', moods: ['morning', 'golden', 'overcast', 'evening', 'night'], at: [8, 6] },
  { id: 'bona', key: 'bonaRain', moods: ['rain'], opts: { mud: true }, at: [8, 6] },
  { id: 'bona', key: 'bonaFinal', moods: ['golden'], opts: { crowd: 'packed' }, at: [8, 6] },
  { id: 'maison', key: 'maison', moods: ['interiorNight', 'interior'], opts: { night: true }, at: [3.4, 3.4] },
  { id: 'mami', key: 'mami', moods: ['golden', 'fog', 'night'], at: [8, 8] },
  { id: 'colline', key: 'colline', moods: ['fog', 'golden'], at: [12, 9] },
  { id: 'avion', key: 'avion', moods: ['interior'], at: [7, 6] },
  { id: 'waldorf', key: 'waldorf', moods: ['snow', 'winter'], opts: { bus: true }, at: [17, 18] },
  { id: 'waldorf', key: 'ecoleNeige', moods: ['winter', 'snow'], opts: { field: true }, at: [20, 16] },
  { id: 'maisonUS', key: 'maisonUS', moods: ['interiorNight', 'interior'], opts: { night: true }, at: [3.2, 4.4] },
  { id: 'classe', key: 'classe', moods: ['interior'], at: [4.6, 4.6] },
  { id: 'gymnase', key: 'gymnase', moods: ['interior'], at: [12, 9] },
  { id: 'bus', key: 'bus', moods: ['interior'], at: [6.6, 1.25] },
  { id: 'parking', key: 'parking', moods: ['winter', 'snow'], at: [26, 24] },
  { id: 'dome', key: 'dome', moods: ['dome'], at: [32, 22] },
]

class PlaceView {
  st: StoryStage
  constructor(el: HTMLElement, i: number, mood: Mood) {
    const p = PLACES[i]
    this.st = new StoryStage(el, { place: { id: p.id, mood, opts: p.opts } })
    this.st.view.setCamera('free', true)
    this.populate(i)
    ;(window as unknown as { __places?: PlaceView }).__places = this
    this.st.loop.onFrame = (dt) => this.st.update(dt)
    this.st.loop.start()
  }
  populate(i: number) {
    const p = PLACES[i]
    this.st.clear()
    this.st.spawn({ id: 'B', cast: 'bribri', at: { x: p.at[0], y: p.at[1] }, facing: Math.PI / 2 })
    this.st.spawn({ id: 'K', cast: 'kaydoudou', at: { x: p.at[0] + 0.8, y: p.at[1] }, facing: Math.PI / 2 })
    const f = this.st.frame.vec(p.at[0] + 0.4, p.at[1])
    const rig = this.st.view.rig
    if (rig.controls) { rig.controls.target.copy(f.clone().setY(0.8)); this.st.stage.camera.position.copy(f.clone().add(new THREE.Vector3(-3, 2.2, 6))) }
  }
  go(i: number, mood: Mood) {
    const p = PLACES[i]
    this.st.load({ id: p.id, mood, opts: p.opts })
    this.populate(i)
  }
  dispose() { this.st.dispose() }
}

export default function Places() {
  const { t } = useT('lionceaux')
  useDocumentTitle(t('places.title'))
  const [params] = useSearchParams()
  const [i, setI] = useState(Math.max(0, PLACES.findIndex((p) => p.key === params.get('lieu'))))
  const [mood, setMood] = useState<Mood>((params.get('ambiance') as Mood) || PLACES[i].moods[0])
  const webgl = useMemo(() => hasWebGL(), [])
  const { ref, inst } = useMounted((el) => (webgl ? new PlaceView(el, i, mood) : null), [webgl])
  const pick = (k: number) => { setI(k); const m = PLACES[k].moods[0]; setMood(m); inst?.go(k, m) }
  const pickMood = (m: Mood) => { setMood(m); inst?.go(i, m) }
  return (
    <GameFrame>
      <div ref={ref} className="absolute inset-0" data-testid="game-canvas" />
      {!webgl && <NoWebGL />}
      <TopBar back="/jeux/lionceaux/personnages" title={t('places.title')} sub={t('places.sub')} />
      <div className="absolute inset-x-0 bottom-0 z-20 p-2 sm:p-3">
        <Panel className="mx-auto max-w-3xl p-3">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('places.title')}>
            {PLACES.map((p, k) => <button key={p.key} type="button" role="radio" aria-checked={i === k} onClick={() => pick(k)} className={cx('min-h-[44px] rounded-full px-3.5 text-[13.5px] font-semibold', i === k ? 'bg-cream text-ink' : 'bg-white/10')}>{t(`places.names.${p.key}`)}</button>)}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('places.light')}>
            {PLACES[i].moods.map((m) => <button key={m} type="button" role="radio" aria-checked={mood === m} onClick={() => pickMood(m)} className={cx('min-h-[40px] rounded-full px-3 text-[13px] font-semibold', mood === m ? 'bg-sun-500 text-ink' : 'bg-white/10 text-cream/80')}>{t(`places.moods.${m}`)}</button>)}
          </div>
        </Panel>
      </div>
    </GameFrame>
  )
}
