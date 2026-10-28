import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, ChevronDown, Feather, Languages } from 'lucide-react'
import { DRILLS, METHODE_TOC, TOME1_TOC } from '../../content'
import type { TocEntry } from '../../content/books.gen'
import { BOOKS, SERIES } from '../../lib/config'
import { useDocumentTitle } from '../../lib/hooks'
import { cx } from '../../lib/util'
import BookCover from './components/BookCover'
import SeriesShelf from './components/SeriesShelf'
import { ROMAN, chapterUrl, isMethodeChapter, methodeShape } from './components/books'
import { GoldLabel, PageFrame, useSiteT } from './components/brand'

/** Planned size of the novel (the online reader fills in as chapters are written). */
const PLANNED_TOME1 = 40

export default function Library() {
  const { t, lang } = useSiteT()
  useDocumentTitle(t('library.docTitle'))
  const frenchOnly = t('library.frenchOnly')
  return (
    <PageFrame>
      <header className="max-w-3xl">
        <p className="eyebrow">{t('library.eyebrow')}</p>
        <h1 className="mt-2 text-[34px] font-semibold leading-[1.08] text-ink sm:text-[46px]">{t('library.title')}</h1>
        <p className="mt-3 text-[16px] leading-relaxed text-ink-muted sm:text-[17px]">{t('library.subtitle')}</p>
        {lang === 'en' && frenchOnly && (
          <p className="mt-4 inline-flex items-start gap-2 rounded-2xl bg-sand px-3.5 py-2 text-[13.5px] text-ink-soft">
            <Languages size={16} className="mt-0.5 shrink-0 text-terra-600" />{frenchOnly}
          </p>
        )}
      </header>
      <MethodeBlock />
      <SeriesBlock />
    </PageFrame>
  )
}

/* ---------------- the LIONCEAUX saga ---------------- */

function SeriesBlock() {
  const { t, lang } = useSiteT()
  const tome = SERIES.tomes[0]
  const facts = ['chapters', 'parts', 'lessons'] as const
  return (
    <section id="lionceaux" className="mt-20 scroll-mt-20" aria-labelledby="lionceaux-title">
      {/* tome 1, the available book */}
      <div className="relative isolate overflow-hidden rounded-[32px] bg-forest-800 text-cream">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(700px_420px_at_0%_0%,rgba(197,118,47,0.30),transparent_60%),radial-gradient(600px_380px_at_100%_100%,rgba(227,169,43,0.16),transparent_65%)]" />
        <div className="grid grid-cols-1 items-center gap-8 p-6 sm:p-10 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)] lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:gap-14 lg:p-14">
          <a href={BOOKS.tome1.href} className="mx-auto block w-[62%] max-w-[260px] rounded-[4px_10px_10px_4px] md:mx-0 md:w-full md:max-w-none" aria-label={t('shelf.readLabel', { title: BOOKS.tome1.title[lang] })}>
            <BookCover book="tome1" eager sizes="(min-width: 1024px) 300px, (min-width: 768px) 240px, 62vw" />
          </a>
          <div className="min-w-0">
            <GoldLabel dark>{t('library.series.label')}</GoldLabel>
            <p id="lionceaux-title" className="mt-1.5 font-display text-[30px] font-semibold uppercase leading-none tracking-[0.12em] text-cream sm:text-[38px]">{SERIES.name}</p>
            <p className="mt-2 text-[15px] font-semibold text-cream/80">{t('library.series.heroes')}<span className="font-normal text-cream/60"> · {t('library.series.meta')}</span></p>
            <div className="mt-7 border-t border-white/10 pt-6">
              <GoldLabel dark>{t('shelf.tome', { n: tome?.n ?? 1 })}<span className="ml-1.5 tracking-[0.12em] text-cream/55">· {t('shelf.available')}</span></GoldLabel>
              <h2 className="mt-1.5 text-[32px] font-semibold leading-[1.08] text-cream sm:text-[44px]">{tome?.title}</h2>
              <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-cream/75">{t('library.tome1.body')}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {facts.map((f) => <li key={f} className="rounded-full border border-white/15 px-3 py-1 text-[13px] font-semibold text-cream/85">{t(`library.tome1.facts.${f}`)}</li>)}
              </ul>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a href={BOOKS.tome1.href} className="btn-sun btn-lg"><BookOpen size={18} />{t('library.read')}</a>
              </div>
              <Link to="/app/joueur/lecons" className="mt-5 inline-flex min-h-[44px] items-center gap-1.5 text-[15px] font-semibold text-sun-300 underline-offset-4 hover:underline">
                {t('library.tome1.lessonsLink')}<ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* the six tomes */}
      <div className="mt-14">
        <h2 className="text-[26px] font-semibold leading-tight text-ink sm:text-[32px]">{t('library.series.shelfTitle')}</h2>
        <p className="mt-2 max-w-2xl text-[15.5px] leading-relaxed text-ink-muted">{t('library.series.shelfLead')}</p>
        <SeriesShelf className="mt-7" />
      </div>

      {/* five countries */}
      <div className="mt-14">
        <h2 className="text-[26px] font-semibold leading-tight text-ink sm:text-[32px]">{t('library.tome1.partsTitle')}</h2>
        <ol className="mt-6 grid gap-3 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((n) => (
            <li key={n} className="flex gap-4 rounded-2xl border border-line bg-paper p-4 lg:flex-col lg:gap-0 lg:p-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-forest-600 font-display text-[15px] font-semibold text-cream lg:mb-4">{ROMAN[n]}</span>
              <div className="min-w-0">
                <div className="font-display text-[19px] font-semibold leading-tight text-ink">{t(`library.tome1.parts.${n}.country`)}</div>
                <div className="font-display text-[15px] italic text-terra-600">{t(`library.tome1.parts.${n}.piece`)}</div>
                <div className="mt-2 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">{t(`library.tome1.parts.${n}.place`)}</div>
                <p className="mt-1 text-[14.5px] leading-snug text-ink-soft">{t(`library.tome1.parts.${n}.idea`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <Toc
        entries={TOME1_TOC}
        planned={PLANNED_TOME1}
        base={BOOKS.tome1.href}
        partLabel={(p) => t('library.tome1.partLabel', { n: ROMAN[p] || p })}
        partName={(p) => `${t(`library.tome1.parts.${p}.country`)}, ${t(`library.tome1.parts.${p}.piece`)}`}
        numberOf={(e) => String(e.no)}
        showPov
      />
    </section>
  )
}

/* ---------------- Le Code Njangi ---------------- */

function MethodeBlock() {
  const { t, lang } = useSiteT()
  const shape = methodeShape()
  const facts: [string, number][] = [['chapters', shape.planned], ['parts', shape.parts], ['drills', DRILLS.length]]
  const b = BOOKS.methode
  return (
    <section id="code-njangi" className="mt-10 scroll-mt-20 sm:mt-12" aria-labelledby="methode-title">
      <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)] lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:gap-14">
        <a href={b.href} className="mx-auto block w-[62%] max-w-[260px] rounded-[4px_10px_10px_4px] md:mx-0 md:w-full md:max-w-none" aria-label={t('shelf.readLabel', { title: b.title[lang] })}>
          <BookCover book="methode" sizes="(min-width: 1024px) 300px, (min-width: 768px) 240px, 62vw" />
        </a>
        <div className="min-w-0">
          <GoldLabel>{t('library.methode.label')}</GoldLabel>
          <h2 id="methode-title" className="mt-1.5 text-[32px] font-semibold leading-[1.08] text-ink sm:text-[44px]">{b.title[lang]}</h2>
          <p className="mt-2 font-display text-[18px] italic leading-snug text-ink-soft sm:text-[20px]">{b.subtitle[lang]}</p>
          <p className="mt-4 text-[13px] font-semibold text-terra-600">{t('library.methode.audience')}</p>
          <p className="mt-2 max-w-2xl text-[16px] leading-relaxed text-ink-muted">{t('library.methode.body')}</p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {facts.filter(([, n]) => n > 0).map(([f, n]) => <li key={f} className="chip px-3 py-1 text-[13px] font-semibold">{t(`library.methode.facts.${f}`, { n })}</li>)}
          </ul>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a href={b.href} className="btn-primary btn-lg"><BookOpen size={18} />{t('library.read')}</a>
          </div>
          <Link to="/app/exercices" className="link mt-5 inline-flex min-h-[44px] items-center gap-1.5 text-[15px]">
            {t('library.methode.drillsLink')}<ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <Toc
        entries={METHODE_TOC}
        planned={shape.planned}
        base={b.href}
        partLabel={(p) => (METHODE_TOC.some((e) => e.part === p && isMethodeChapter(e)) ? t('library.methode.partLabel', { n: p }) : '')}
        partName={(_p, first) => first.partTitle || first.title}
        numberOf={(e) => (isMethodeChapter(e) ? String(e.no) : '')}
        countable={isMethodeChapter}
      />
    </section>
  )
}

/* ---------------- table of contents ---------------- */

function Toc({ entries, planned, base, partLabel, partName, numberOf, countable, showPov = false }: {
  entries: TocEntry[]
  planned: number
  base: string
  partLabel: (part: number) => string
  partName: (part: number, first: TocEntry) => string
  numberOf: (e: TocEntry) => string
  /** which entries count as chapters (front and back matter do not) */
  countable?: (e: TocEntry) => boolean
  showPov?: boolean
}) {
  const { t } = useSiteT()
  const groups = new Map<number, TocEntry[]>()
  for (const e of [...entries].sort((a, b) => a.no - b.no)) {
    if (!groups.has(e.part)) groups.set(e.part, [])
    groups.get(e.part)!.push(e)
  }
  const n = countable ? entries.filter(countable).length : entries.length
  const plain = (part: number, list: TocEntry[]) => !partLabel(part) && list.length === 1
  const firstOpen = [...groups.entries()].findIndex(([p, l]) => !plain(p, l))

  return (
    <div className="mt-10 overflow-hidden rounded-[24px] border border-line bg-paper shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line px-5 py-4 sm:px-6">
        <h3 className="font-display text-[20px] font-semibold text-ink">{t('library.contents')}</h3>
        {n > 0 && <span className="text-[13px] font-medium text-ink-muted">{n >= planned ? t('library.onlineAll', { n }) : t('library.online', { n, total: planned })}</span>}
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <Feather size={28} className="text-terra-500" />
          <p className="mt-3 font-display text-lg font-semibold text-ink">{t('library.arriving')}</p>
          <p className="mt-1 max-w-md text-[14.5px] text-ink-muted">{t('library.arrivingBody')}</p>
        </div>
      ) : (
        [...groups.entries()].map(([part, list], gi) => {
          const label = partLabel(part)
          // front or back matter on its own (foreword, appendices): one plain row, no accordion
          if (plain(part, list)) {
            const e = list[0]
            return (
              <a key={part} href={chapterUrl(base, e.no)} className="block border-b border-line px-5 py-4 transition last:border-b-0 hover:bg-sand/40 sm:px-6">
                <span className="block font-display text-[17px] font-semibold leading-snug text-ink">{partName(part, e)}</span>
                {e.summary && <span className="mt-0.5 line-clamp-2 block text-[14px] leading-snug text-ink-muted">{e.summary}</span>}
              </a>
            )
          }
          return (
            <details key={part} open={gi === firstOpen} className="group border-b border-line last:border-b-0">
              <summary className="flex min-h-[60px] cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 hover:bg-sand/40 sm:px-6 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0">
                  {label && <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-terra-600">{label}</span>}
                  <span className="block font-display text-[17px] font-semibold leading-snug text-ink">{partName(part, list[0])}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-[13px] text-ink-muted">
                  {list.length > 1 && t('library.chapterCount', { n: list.length })}
                  <ChevronDown size={18} className="transition group-open:rotate-180 motion-reduce:transition-none" />
                </span>
              </summary>
              <ol className="px-2 pb-3 sm:px-3">
                {list.map((e) => {
                  const num = numberOf(e)
                  return (
                    <li key={e.no}>
                      <a href={chapterUrl(base, e.no)} className="flex gap-3 rounded-xl px-3 py-3 transition hover:bg-sand/60 sm:gap-4">
                        <span aria-hidden={!num} className={cx('w-7 shrink-0 pt-px text-right font-display text-[17px] tabular-nums text-ink-faint', !num && 'invisible')}>{num || '0'}</span>
                        <span className="min-w-0">
                          <span className="block font-semibold leading-snug text-ink">
                            {num && <span className="sr-only">{t('library.chapter', { n: num })}, </span>}{e.title}
                          </span>
                          {e.summary && <span className="mt-0.5 line-clamp-2 block text-[14px] leading-snug text-ink-muted">{e.summary}</span>}
                          {showPov && e.pov && <span className="mt-1 block text-[12px] font-semibold text-terra-600">{t('library.povLabel', { pov: e.pov })}</span>}
                        </span>
                      </a>
                    </li>
                  )
                })}
              </ol>
            </details>
          )
        })
      )}
    </div>
  )
}
