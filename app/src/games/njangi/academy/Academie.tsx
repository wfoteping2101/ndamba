// The Académie Njangi: the 64 drill sheets of the book as lessons, by family, with progress.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Star } from 'lucide-react'
import { useT } from '../../../i18n'
import { useDocumentTitle, useLiveQuery } from '../../../lib/hooks'
import { cx } from '../../../lib/util'
import { Pitch } from '../../../ui'
import type { Drill } from '../../../lib/types'
import { GameFrame, TopBar } from '../../shared/ui'
import { allDrillProgress, type DrillProgress } from '../../shared/save'
import { FAMILY_ORDER, LESSON_IDS, LESSONS_ORDERED } from '../drills/catalog'
import { sheetUrl } from '../links'

export default function Academie() {
  const { t, lang } = useT('jeux')
  useDocumentTitle(t('academie.title'))
  const [fam, setFam] = useState<'all' | Drill['family']>('all')
  const progress = useLiveQuery(() => allDrillProgress(), [], [])
  const byId = useMemo(() => new Map(progress.map((p) => [p.id, p])), [progress])
  const list = LESSONS_ORDERED.filter((d) => fam === 'all' || d.family === fam)
  // the 64 sheets only (the Défi des dix passes keeps its progress in the same table, as DIX)
  const done = progress.filter((p) => LESSON_IDS.has(p.id) && Object.values(p.done).some(Boolean)).length
  return (
    <GameFrame className="overflow-y-auto bg-night-800">
      <TopBar back="/jeux/code-njangi" title={t('academie.title')} sub={t('academie.count', { done, total: LESSONS_ORDERED.length })} />
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-20 sm:px-6 sm:pt-24">
        <p className="max-w-2xl text-[15.5px] leading-relaxed text-cream/75">{t('academie.subtitle')}</p>
        <div className="-mx-4 mt-5 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label={t('academie.title')}>
          {(['all', ...FAMILY_ORDER] as const).map((f) => (
            <button key={f} type="button" role="tab" aria-selected={fam === f} onClick={() => setFam(f)}
              className={cx('min-h-[44px] shrink-0 rounded-full px-4 text-[14px] font-semibold', fam === f ? 'bg-cream text-ink' : 'bg-white/10 text-cream hover:bg-white/15')}>
              {t(`academie.families.${f}`)}
            </button>
          ))}
        </div>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((d) => <Card key={d.id} d={d} p={byId.get(d.id)} lang={lang} />)}
        </ul>
      </div>
    </GameFrame>
  )
}

function Card({ d, p, lang }: { d: Drill; p?: DrillProgress; lang: 'fr' | 'en' }) {
  const { t } = useT('jeux')
  const text = lang === 'en' ? d.en : d.fr
  // as on the result screen: one star for Facile, two for Normal, three for Difficile (the best level won)
  const stars = p ? (['facile', 'normal', 'difficile'] as const).reduce((n, l, i) => (p.done[l] ? i + 1 : n), 0) : 0
  return (
    <li className="flex flex-col overflow-hidden rounded-[18px] border border-white/10 bg-night-700">
      <Link to={d.id} className="block bg-[#1d6b45]/30 p-2" aria-label={`${t('academie.play')} ${d.id} ${text.title}`} tabIndex={-1}>
        <Pitch spec={d.diagram} width={360} className="mx-auto max-h-[150px] [&_svg]:mx-auto [&_svg]:max-h-[150px] [&_svg]:w-auto" />
      </Link>
      <div className="flex flex-1 flex-col p-3.5">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 text-[16px] font-semibold leading-snug"><span className="text-sun-300">{d.id}</span> {text.title}</p>
          <span className="flex shrink-0 gap-0.5 pt-0.5" aria-label={stars ? t('academie.done') : t('academie.notPlayed')}>
            {[0, 1, 2].map((i) => <Star key={i} size={14} strokeWidth={1.75} className={i < stars ? 'fill-sun-500 text-sun-500' : 'text-white/20'} aria-hidden="true" />)}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-[13.5px] leading-snug text-cream/65">{text.objective}</p>
        <div className="mt-auto flex items-center gap-2 pt-3">
          <Link to={d.id} className="btn-sun btn-sm min-h-[44px] flex-1">{t('academie.play')}</Link>
          <a href={sheetUrl(d)} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-cream hover:bg-white/15" aria-label={t('academie.sheet')} title={t('academie.sheet')}>
            <BookOpen size={18} strokeWidth={1.75} aria-hidden="true" />
          </a>
        </div>
      </div>
    </li>
  )
}
