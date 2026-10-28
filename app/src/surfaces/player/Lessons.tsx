// /app/joueur/lecons: the 40 Leçons du Ballon of Tome 1, grouped by the five parts of the journey
// (one part shown at a time, to stay light on small data plans), with « J'ai compris » and progress.
import { useEffect, useMemo, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BookOpen, CalendarCheck } from 'lucide-react'
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
        actions={<a href={BOOKS.tome1.href} className="btn-outline min-h-[44px]"><BookOpen size={16} aria-hidden="true" />{t('novel.read')}</a>}
        photo={<BookImage src={CHARACTERS_IMG} alt={t('lessons.charactersAlt', { heroes: SERIES.heroes })} width={ART_W} height={ART_H}
          className="block aspect-[2/3] w-full rounded-[3px] object-cover"
          wrap={(img) => <figure className="w-[132px] -rotate-2 rounded-md bg-white p-1.5 pb-2 shadow-card ring-1 ring-[#DCE2D8]">{img}</figure>} />}>
        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
              <span className="font-semibold text-ink">{t('lessons.progress', { n: understood.length })}</span>
              <span className="tabular-nums text-ink-muted">{Math.round((understood.length / 40) * 100)} %</span>
            </div>
            <Progress value={understood.length} max={40} tone="terra" />
            {written < 40 && <p className="mt-1.5 text-xs text-ink-faint">{t('lessons.writing', { n: written })}</p>}
          </div>
          <Link to={`#lecon-${ofDay.no}`} className="btn-primary min-h-[44px]"><CalendarCheck size={16} aria-hidden="true" />{t('lessons.ofDay', { n: ofDay.no })}</Link>
        </div>
      </NotebookHeader>

      {/* the five parts, like the tabs of a notebook */}
      <nav ref={tabs} aria-label={t('lessons.partsLabel')} className="relative -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0">
        {PARTS.map((p, i) => {
          const on = p.no === part.no
          const done = doneIn(p.no)
          return (
            <button key={p.no} type="button" data-part={p.no} onClick={() => go(p.no)} aria-pressed={on}
              className={cx('relative min-h-[76px] min-w-[150px] shrink-0 overflow-hidden rounded-2xl border px-3 pb-2.5 pt-3 text-left transition sm:min-w-0',
                on ? 'border-transparent shadow-lift' : 'border-line bg-paper hover:border-ink-faint')}
              style={on ? { background: p.tone, color: p.ink } : undefined}>
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5" style={{ background: p.tone }} />
              <span className={cx('block text-[10.5px] font-bold uppercase tracking-[0.1em]', on ? 'opacity-80' : 'text-ink-muted')}>{t('lessons.part', { n: ROMAN[i] })} · {t(`parts.${p.no}.country`)}</span>
              <span className={cx(handCls, 'mt-0.5 block text-[18px] font-semibold leading-tight', on ? '' : 'text-ink')}>{t(`parts.${p.no}.piece`)}</span>
              <span className={cx('mt-1 block text-xs tabular-nums', on ? 'opacity-80' : 'text-ink-muted')}>{t('lessons.partDone', { n: done, total: p.to - p.from + 1 })}</span>
            </button>
          )
        })}
      </nav>

      <section id="partie" className="scroll-mt-20" aria-labelledby="partie-h">
        <div className="mb-5 overflow-hidden rounded-2xl border border-line bg-paper shadow-card">
          <div className="h-1.5" style={{ background: part.tone }} aria-hidden="true" />
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-[1fr_220px] sm:items-center sm:p-5">
            <div className="min-w-0">
              <div className="eyebrow" style={{ color: part.tone }}>{t('lessons.partRange', { n: ROMAN[part.no - 1], from: part.from, to: part.to })}</div>
              <h2 id="partie-h" className={cx(handCls, 'mt-0.5 text-[26px] font-semibold leading-tight text-ink')}>{t(`parts.${part.no}.country`)}, {t(`parts.${part.no}.piece`).toLowerCase()}</h2>
              <p className="mt-1 text-[15px] text-ink-soft">{t(`parts.${part.no}.body`)}</p>
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold text-ink-muted">{t('lessons.partDone', { n: doneIn(part.no), total: inPart.length })}</div>
              <Progress value={doneIn(part.no)} max={inPart.length} tone="forest" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
          {inPart.map((l) => <LessonCard key={l.no} lesson={l} />)}
        </div>

        <div className="mt-6 flex flex-wrap justify-between gap-2">
          {part.no > 1 ? (
            <button type="button" className="btn-outline min-h-[44px]" onClick={() => go(part.no - 1)}><ArrowLeft size={16} aria-hidden="true" />{t(`parts.${part.no - 1}.country`)}</button>
          ) : <span />}
          {part.no < 5 && (
            <button type="button" className="btn-primary min-h-[44px]" onClick={() => go(part.no + 1)}>{t('lessons.nextPart', { country: t(`parts.${part.no + 1}.country`) })}<ArrowRight size={16} aria-hidden="true" /></button>
          )}
        </div>
      </section>
    </div>
  )
}
