// /app/joueur/lecons: the 40 Leçons du Ballon of Tome 1, grouped by the five parts of the journey
// (one part shown at a time, to stay light on small data plans), with « J'ai compris » and progress.
import { useEffect, useMemo, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, BookOpen, CalendarCheck, Check } from 'lucide-react'
import { Progress } from '../../ui'
import { useT } from '../../i18n'
import { useDocumentTitle } from '../../lib/hooks'
import { BOOKS, SERIES } from '../../lib/config'
import { cx } from '../../lib/util'
import { PARTS, allLessons, lessonOfDay, partOf } from './lessons'
import { NotebookHeader, handCls } from './components/Paper'
import { LessonCard } from './components/LessonCard'
import { ART_H, ART_W, BookImage, CHARACTERS_IMG } from './components/BookImage'
import { useLocal, useUnderstood } from './components/storage'
import { useScrollToHash, useToday } from './components/data'

const ROMAN = ['I', 'II', 'III', 'IV', 'V']

export default function Lessons() {
  const { t, lang } = useT('player')
  useDocumentTitle(t('lessons.docTitle'))
  const today = useToday()
  const lessons = useMemo(() => allLessons(lang), [lang])
  const { understood } = useUnderstood()
  const [rawPart, setPart] = useLocal<number>('njangi.lessons.part', 1)
  const part = PARTS.find((p) => p.no === rawPart) ?? PARTS[0]
  const loc = useLocation()
  useScrollToHash(loc.hash, true, (id) => {
    const m = id.match(/^lecon-(\d+)$/)
    if (m) setPart(partOf(Number(m[1])).no)
  })

  // keep the selected part tab visible in the horizontal strip on phones
  const tabs = useRef<HTMLElement>(null)
  useEffect(() => {
    const nav = tabs.current
    const btn = nav?.querySelector<HTMLElement>(`[data-part="${part.no}"]`)
    if (nav && btn && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = btn.offsetLeft - (nav.clientWidth - btn.offsetWidth) / 2
  }, [part.no])

  const ofDay = lessonOfDay(lessons, today)
  const inPart = lessons.filter((l) => l.part === part.no)
  const doneIn = (no: number) => lessons.filter((l) => l.part === no && understood.includes(l.no)).length
  const written = lessons.filter((l) => l.fromBook).length

  const go = (no: number) => {
    setPart(no)
    window.setTimeout(() => document.getElementById('partie')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30)
  }

  return (
    <div>
      <NotebookHeader eyebrow={t('lessons.eyebrow')} title={t('lessons.title')}
        subtitle={t('lessons.subtitle', { book: BOOKS.tome1.title[lang], heroes: SERIES.heroes })}
        actions={<a href={BOOKS.tome1.href} className="btn-outline min-h-[44px]"><BookOpen size={16} strokeWidth={1.75} aria-hidden="true" />{t('novel.read')}</a>}
        photo={<BookImage src={CHARACTERS_IMG} alt={t('lessons.charactersAlt', { heroes: SERIES.heroes })} width={ART_W} height={ART_H}
          className="block aspect-[2/3] w-full rounded-[3px] object-cover"
          wrap={(img) => <figure className="w-[136px] -rotate-2 rounded-md bg-white p-1.5 pb-2 ring-1 ring-line">{img}</figure>} />}>
        <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <div className="mb-2 flex items-baseline justify-between gap-2 text-[14.5px]">
              <span className="font-semibold text-ink">{t('lessons.progress', { n: understood.length })}</span>
              <span className="tabular-nums text-ink-muted">{Math.round((understood.length / 40) * 100)} %</span>
            </div>
            <Progress value={understood.length} max={40} tone="terra" />
            {written < 40 && <p className="mt-2 text-[13px] text-ink-muted">{t('lessons.writing', { n: written })}</p>}
          </div>
          <Link to={`#lecon-${ofDay.no}`} className="btn-primary min-h-[44px]"><CalendarCheck size={16} strokeWidth={1.75} aria-hidden="true" />{t('lessons.ofDay', { n: ofDay.no })}</Link>
        </div>
      </NotebookHeader>

      {/* the five parts of the journey, like the tabs of a notebook */}
      <nav ref={tabs} aria-label={t('lessons.partsLabel')} className="relative -mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0">
        {PARTS.map((p, i) => {
          const on = p.no === part.no
          const done = doneIn(p.no)
          return (
            <button key={p.no} type="button" data-part={p.no} onClick={() => go(p.no)} aria-pressed={on}
              className={cx('relative min-h-[84px] min-w-[150px] shrink-0 overflow-hidden rounded-[14px] border px-3.5 pb-3 pt-3.5 text-left transition sm:min-w-0',
                on ? 'border-transparent' : 'border-line bg-paper hover:border-ink-faint')}
              style={on ? { background: p.tone, color: p.ink } : undefined}>
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ background: p.tone }} />
              <span className={cx('block text-[12.5px] font-semibold', on ? 'opacity-85' : 'text-ink-muted')}>{t('lessons.partTab', { n: ROMAN[i], country: t(`parts.${p.no}.country`) })}</span>
              <span className={cx(handCls, 'mt-0.5 block text-[18px] leading-tight', on ? '' : 'text-ink')}>{t(`parts.${p.no}.piece`)}</span>
              <span className={cx('mt-1 block text-[12.5px] tabular-nums', on ? 'opacity-85' : 'text-ink-muted')}>{t('lessons.partDone', { n: done, total: p.to - p.from + 1 })}</span>
            </button>
          )
        })}
      </nav>

      <section id="partie" className="scroll-mt-20" aria-labelledby="partie-h">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-w-0">
            <div className="mb-6 max-w-3xl">
              <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-muted"><span className="h-2.5 w-2.5 rounded-full" style={{ background: part.tone }} aria-hidden="true" />{t('lessons.partRange', { n: ROMAN[part.no - 1], from: part.from, to: part.to })}</p>
              <h2 id="partie-h" className={cx(handCls, 'mt-1 text-[28px] leading-tight text-ink sm:text-[32px]')}>{t(`parts.${part.no}.country`)}, {t(`parts.${part.no}.piece`).toLowerCase()}</h2>
              <p className="mt-2 text-[16px] leading-relaxed text-ink-soft">{t(`parts.${part.no}.body`)}</p>
            </div>
            <div className="max-w-3xl space-y-6">
              {inPart.map((l) => <LessonCard key={l.no} lesson={l} />)}
            </div>
            <div className="mt-8 flex max-w-3xl flex-wrap justify-between gap-2">
              {part.no > 1 ? (
                <button type="button" className="btn-outline min-h-[44px]" onClick={() => go(part.no - 1)}><ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />{t(`parts.${part.no - 1}.country`)}</button>
              ) : <span />}
              {part.no < 5 && (
                <button type="button" className="btn-primary min-h-[44px]" onClick={() => go(part.no + 1)}>{t('lessons.nextPart', { country: t(`parts.${part.no + 1}.country`) })}</button>
              )}
            </div>
          </div>

          {/* the pages of this part, in order */}
          <aside className="hidden lg:block">
            <div className="sticky top-8">
              <div className="mb-2 flex items-baseline justify-between text-[13.5px]">
                <span className="font-semibold text-ink">{t('lessons.inPart')}</span>
                <span className="tabular-nums text-ink-muted">{t('lessons.partDone', { n: doneIn(part.no), total: inPart.length })}</span>
              </div>
              <Progress value={doneIn(part.no)} max={inPart.length} tone="forest" className="mb-3 h-1.5" />
              <ol className="divide-y divide-line border-y border-line">
                {inPart.map((l) => (
                  <li key={l.no}>
                    <a href={`#lecon-${l.no}`} className="flex min-h-[44px] items-center gap-3 py-2 text-[14px] text-ink-soft transition hover:text-ink">
                      <span className="w-6 shrink-0 text-right text-[12.5px] font-semibold tabular-nums text-ink-muted">{l.no}</span>
                      <span className="min-w-0 flex-1 leading-snug">{l.title}</span>
                      {understood.includes(l.no) && <Check size={14} strokeWidth={2.5} className="shrink-0 text-forest-600" aria-label={t('lesson.understood')} />}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      </section>
    </div>
  )
}
