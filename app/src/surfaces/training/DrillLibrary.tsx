import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BookOpen, Dumbbell, SearchX } from 'lucide-react'
import { PageHeader, EmptyState } from '../../ui'
import { useT } from '../../i18n'
import { useDocumentTitle } from '../../lib/hooks'
import { DRILLS, FAMILIES, FAMILY_CODE } from '../../content'
import { BOOKS } from '../../lib/config'
import { DrillCard } from './components/DrillCard'
import { DrillFilters } from './components/DrillFilters'
import { EMPTY_FILTER, activeCount, filterToParams, matches, paramsToFilter, type DrillFilter } from './components/helpers'

const TOTAL = 64

export default function DrillLibrary() {
  const { t } = useT('training')
  useDocumentTitle(t('library.docTitle'))
  const [sp, setSp] = useSearchParams()
  const filter = useMemo(() => paramsToFilter(sp), [sp])
  const setFilter = (f: DrillFilter) => setSp(filterToParams(f), { replace: true })
  const list = useMemo(() => DRILLS.filter((d) => matches(d, filter)), [filter])
  const filtered = activeCount(filter) > 0 || filter.q.trim() !== ''
  const search = sp.toString() ? `?${sp.toString()}` : ''
  const book = t('common:footer.methode')

  return (
    <div>
      <PageHeader title={t('library.title')} subtitle={t('library.subtitle')}
        actions={<a href={BOOKS.methode.href} className="btn-outline btn-sm"><BookOpen size={16} aria-hidden="true" />{t('library.readBook', { book })}</a>} />

      {DRILLS.length === 0 ? (
        <EmptyState icon={<Dumbbell size={36} />} title={t('library.emptyTitle')} body={t('library.emptyBody')} action={<a href={BOOKS.methode.href} className="btn-primary">{t('library.readBook', { book })}</a>} />
      ) : (
        <>
          <div className="sticky top-14 z-20 -mx-4 mb-5 bg-cream/95 px-4 pb-3 pt-1 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pt-0 sm:backdrop-blur-none lg:top-0">
            <DrillFilters drills={DRILLS} value={filter} onChange={setFilter} />
          </div>

          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 text-sm text-ink-muted">
            <span aria-live="polite">
              {filtered ? t('library.found', { count: list.length }) : t('library.count', { count: DRILLS.length })}
              {DRILLS.length < TOTAL && <span className="ml-2 text-ink-faint">{t('library.partial', { n: DRILLS.length, total: TOTAL })}</span>}
            </span>
            {filtered && <button type="button" className="link text-sm" onClick={() => setFilter(EMPTY_FILTER)}>{t('library.showAll')}</button>}
          </div>

          {list.length === 0 ? (
            <EmptyState icon={<SearchX size={32} />} title={t('library.noneTitle')} body={t('library.noneBody')}
              action={<button type="button" className="btn-primary" onClick={() => setFilter(EMPTY_FILTER)}>{t('library.showAll')}</button>} />
          ) : filtered ? (
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">{list.map((d) => <DrillCard key={d.id} d={d} search={search} />)}</div>
          ) : (
            <>
              <nav aria-label={t('library.family')} className="-mx-4 mb-6 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                {FAMILIES.filter((f) => list.some((d) => d.family === f)).map((f) => (
                  <a key={f} href={`#fam-${f}`} className="chip shrink-0 px-3 py-1.5 hover:border-ink-faint">
                    <span className="font-semibold text-forest-700">{FAMILY_CODE[f]}</span>{t(`common:families.${f}`)}
                  </a>
                ))}
              </nav>
              {FAMILIES.map((f) => {
                const items = list.filter((d) => d.family === f)
                if (!items.length) return null
                return (
                  <section key={f} id={`fam-${f}`} className="mb-10 scroll-mt-32 lg:scroll-mt-6">
                    <div className="mb-4 flex items-start gap-4 border-b border-line pb-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-forest-600 font-display text-[22px] leading-none text-cream" aria-hidden="true">{FAMILY_CODE[f]}</span>
                      <div className="min-w-0">
                        <h2 className="flex items-baseline gap-2 font-display text-xl text-ink">{t(`common:families.${f}`)}<span className="font-sans text-[15px] font-semibold tabular-nums text-ink-faint" style={{ fontStretch: '100%' }}>{items.length}</span></h2>
                        <p className="mt-0.5 max-w-2xl text-[14px] text-ink-muted">{t(`familyIntro.${f}`)}</p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">{items.map((d) => <DrillCard key={d.id} d={d} search={search} />)}</div>
                  </section>
                )
              })}
            </>
          )}
          <p className="mt-12 text-center text-[17px] font-semibold italic text-ink-muted">{t('common:brand.motto')}</p>
          <p className="mt-2 text-center text-sm"><Link to="/app/seances" className="link">{t('library.toSessions')}</Link></p>
        </>
      )}
    </div>
  )
}
