// The forty chapters of tome 1, by part: the book's own summary and illustration, what can be
// played (the whole chapter, or its Leçon du Ballon), and where the player stopped.
import { BookOpen, Check, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useT } from '../../i18n'
import { useDocumentTitle } from '../../lib/hooks'
import { TOME1_TOC } from '../../content/books.gen'
import { GameFrame, TopBar } from '../shared/ui'
import { tome1Chapter } from '../njangi/links'
import { isPlayable } from './chapters'
import { lessonByNo } from './lessons'
import { useSave } from './progress'

export default function Chapters() {
  const { t } = useT('lionceaux')
  useDocumentTitle(t('chapters.title'))
  const save = useSave()
  const parts = [1, 2, 3, 4, 5].map((p) => ({ p, list: TOME1_TOC.filter((c) => c.part === p) }))
  return (
    <GameFrame className="overflow-y-auto bg-night-800">
      <TopBar back="/jeux/lionceaux" title={t('chapters.title')} sub={t('chapters.sub')} />
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-20 sm:px-6 sm:pt-24">
        {parts.map(({ p, list }) => (
          <section key={p} className="mt-6 first:mt-0" aria-labelledby={`part-${p}`}>
            <h2 id={`part-${p}`} className="text-[18px] font-semibold">{t(`parts.${p}`)}</h2>
            <ul className="mt-3 grid gap-3 md:grid-cols-2">
              {list.map((c) => {
                const playable = isPlayable(c.no)
                const done = save?.done.includes(`ch${c.no}`)
                const going = save?.chapter === String(c.no)
                const lesson = lessonByNo(c.no)
                const img = `/book/tome1/img/ch${String(c.no).padStart(2, '0')}-480`
                return (
                  <li key={c.no} className="overflow-hidden rounded-[18px] border border-white/10 bg-night-700">
                    <div className="flex gap-3 p-3">
                      <picture className="h-[92px] w-[68px] shrink-0 overflow-hidden rounded-[10px] bg-white/5">
                        <source srcSet={`${img}.webp`} type="image/webp" />
                        <img src={`${img}.jpg`} alt="" loading="lazy" className="h-full w-full object-cover" />
                      </picture>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-x-2 text-[12.5px] font-semibold text-cream/60">
                          <span>{t('player.chapter', { n: c.no })}</span>
                          {c.pov && <span>{t('chapters.pov', { name: c.pov })}</span>}
                        </p>
                        <h3 className="mt-0.5 text-[16.5px] font-semibold leading-tight">{c.title}</h3>
                        <p className="mt-1 flex flex-wrap gap-1.5 text-[12px] font-semibold">
                          {playable ? <span className="rounded-full bg-forest-600 px-2 py-0.5 text-cream">{t('chapters.playable')}</span> : lesson?.diagram ? <span className="rounded-full bg-white/10 px-2 py-0.5 text-cream/80">{t('chapters.lessonOnly')}</span> : null}
                          {done && <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-cream/85"><Check size={12} strokeWidth={2} aria-hidden="true" />{t('chapters.done')}</span>}
                          {going && !done && <span className="rounded-full bg-white/10 px-2 py-0.5 text-cream/85">{t('chapters.inProgress')}</span>}
                        </p>
                      </div>
                    </div>
                    {c.summary && <p className="px-3 text-[13.5px] leading-snug text-cream/70"><span className="sr-only">{t('chapters.summary')} : </span>{c.summary}</p>}
                    {!playable && <p className="px-3 pt-1.5 text-[12.5px] text-cream/50">{t('chapters.lessonOnlyHint')}</p>}
                    <div className="flex flex-wrap items-center gap-1.5 p-3">
                      {playable && <Link to={`/jeux/lionceaux/chapitre/${c.no}${done && !going ? '?debut' : ''}`} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-cream px-4 text-[14px] font-semibold text-ink"><Play size={15} strokeWidth={1.75} aria-hidden="true" />{going ? t('chapters.resume') : done ? t('chapters.replay') : t('chapters.play')}</Link>}
                      {lesson?.diagram && <Link to={`/jeux/lionceaux/lecon/${c.no}`} className="inline-flex min-h-[44px] items-center rounded-full bg-white/10 px-4 text-[14px] font-semibold hover:bg-white/15">{t('chapters.lesson', { n: c.no })}</Link>}
                      <a href={tome1Chapter(c.no)} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold text-cream/75 hover:text-cream"><BookOpen size={15} strokeWidth={1.75} aria-hidden="true" />{t('chapters.read')}</a>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </GameFrame>
  )
}
