// The title screen: the pitch of Bonamoussadi in the late light, the two brothers and their
// ritual (« Poing contre poing. Main sur le cœur. »), and the way into the chapters.
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Play, Shirt, MapPin, ListOrdered } from 'lucide-react'
import * as THREE from 'three'
import { useT } from '../../i18n'
import { useDocumentTitle } from '../../lib/hooks'
import { TOME1_TOC } from '../../content/books.gen'
import { GameFrame, TopBar, hasWebGL, useMounted } from '../shared/ui'
import { isPlayable } from './chapters'
import { useSave } from './progress'
import { StoryStage } from './story/stage'

class TitleScene {
  st: StoryStage
  private a = 0
  constructor(el: HTMLElement) {
    this.st = new StoryStage(el, { place: { id: 'bona', mood: 'golden', opts: { crowd: 'few' } } })
    const st = this.st
    const b = st.spawn({ id: 'B', cast: 'bribri', at: { x: 9.6, y: 9 }, facing: 0, number: 8 })
    const k = st.spawn({ id: 'K', cast: 'kaydoudou', at: { x: 10.45, y: 9 }, facing: Math.PI })
    b.meta.pose = 'heart'; k.meta.pose = 'fist'
    st.view.ball.setLook('mamiPatched')
    st.world.placeBall(10.0, 9.55)
    const f = st.frame
    const c = f.vec(10.05, 9, 0.9)
    st.loop.onFrame = (dt) => {
      this.a += dt * 0.07
      const r = 4.2
      st.view.rig.setShot({ pos: new THREE.Vector3(c.x + Math.sin(this.a + 0.4) * r, 1.35, c.z + Math.cos(this.a + 0.4) * r), look: c, fov: 40 }, { rate: 30 })
      st.update(dt)
    }
    st.loop.start()
  }
  dispose() { this.st.dispose() }
}

export default function Title() {
  const { t } = useT('lionceaux')
  useDocumentTitle(t('title'))
  const webgl = useMemo(() => hasWebGL(), [])
  const { ref } = useMounted((el) => (webgl ? new TitleScene(el) : null), [webgl])
  const save = useSave()
  const resume = save?.chapter ? Number(save.chapter) : null
  const resumeToc = resume ? TOME1_TOC.find((c) => c.no === resume) : null
  const firstUndone = [1, 2, 3, 4, 5, 6, 7, 8].find((n) => isPlayable(n) && !save?.done.includes(`ch${n}`)) ?? 1
  return (
    <GameFrame className="bg-night-800">
      <div ref={ref} className="absolute inset-0" data-testid="game-canvas" aria-hidden="true">
        {!webgl && <picture><source srcSet="/book/tome1/img/cover.webp" type="image/webp" /><img src="/book/tome1/img/cover.jpg" alt="" className="h-full w-full object-cover opacity-60" /></picture>}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" aria-hidden="true" />
      <TopBar back="/jeux" title={t('brand')} />
      <div className="absolute inset-x-0 bottom-0 z-20 p-4 sm:inset-y-0 sm:left-0 sm:right-auto sm:flex sm:w-[460px] sm:items-center sm:p-8" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
        <div>
          <h1 className="text-[44px] font-semibold leading-[0.95] tracking-tight sm:text-[60px]">{t('brand')}</h1>
          <p className="mt-1 text-[19px] font-semibold text-sun-300 sm:text-[22px]">{t('tagline')}</p>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-cream/80">{t('intro')}</p>
          <div className="mt-5 grid max-w-sm gap-2">
            {resume && resumeToc ? (
              <Link to={`/jeux/lionceaux/chapitre/${resume}`} className="btn-sun justify-start">
                <Play size={18} strokeWidth={1.75} aria-hidden="true" />
                <span className="text-left leading-tight">{t('menu.continue')}<span className="block text-[12.5px] font-medium opacity-80">{t('menu.continueSub', { n: resume, title: resumeToc.title })}</span></span>
              </Link>
            ) : (
              <Link to={`/jeux/lionceaux/chapitre/${firstUndone}`} className="btn-sun justify-start"><Play size={18} strokeWidth={1.75} aria-hidden="true" />{t('menu.start')}</Link>
            )}
            <Link to="/jeux/lionceaux/chapitres" className="glass inline-flex min-h-[48px] items-center gap-2 rounded-full px-5 text-[15px] font-semibold hover:bg-white/15"><ListOrdered size={18} strokeWidth={1.75} aria-hidden="true" />{t('menu.chapters')}</Link>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/jeux/lionceaux/personnages" className="glass inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-[14px] font-semibold hover:bg-white/15"><Shirt size={17} strokeWidth={1.75} aria-hidden="true" />{t('menu.cast')}</Link>
              <Link to="/jeux/lionceaux/lieux" className="glass inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-[14px] font-semibold hover:bg-white/15"><MapPin size={17} strokeWidth={1.75} aria-hidden="true" />{t('menu.places')}</Link>
            </div>
            <a href="/book/tome1/" className="inline-flex min-h-[44px] items-center gap-2 px-1 text-[14.5px] font-semibold text-cream/80 underline underline-offset-4 hover:text-cream"><BookOpen size={17} strokeWidth={1.75} aria-hidden="true" />{t('menu.read')}</a>
          </div>
        </div>
      </div>
    </GameFrame>
  )
}
