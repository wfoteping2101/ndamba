// One page of BriBri's notebook: a Leçon du Ballon with its lines, its diagram,
// the chapter picture when it exists, « J'ai compris », and what to do next.
import { Link } from 'react-router-dom'
import { BookOpen, Check, Dumbbell, NotebookPen, Target } from 'lucide-react'
import { Badge, Pitch } from '../../../ui'
import { useT } from '../../../i18n'
import { cx } from '../../../lib/util'
import { viewSize } from '../../../lib/pitch.mjs'
import type { DiagramSpec } from '../../../lib/types'
import { getDrill, drillText } from '../../../content'
import { chapterHref, partOf, type LessonView } from '../lessons'
import { challengeText, challengesForLesson } from '../challenges'
import { PaperCard, handCls } from './Paper'
import { ART_H, ART_W, BookImage, chapterImg } from './BookImage'
import { useUnderstood } from './storage'

export function LessonCard({ lesson: l, variant = 'full', className }: { lesson: LessonView; variant?: 'full' | 'home'; className?: string }) {
  const { t, lang } = useT('player')
  const { has, toggle } = useUnderstood()
  const ok = has(l.no)
  const part = partOf(l.no)
  const challenge = challengesForLesson(l.no)[0]
  const drill = getDrill(l.drill)
  const home = variant === 'home'

  return (
    <PaperCard as="article" className={cx('scroll-mt-24', className)}>
      <div id={home ? undefined : `lecon-${l.no}`} className="scroll-mt-24 py-5 pl-12 pr-4 sm:py-6 sm:pl-14 sm:pr-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-7 items-center rounded-full px-2.5 text-[12.5px] font-bold tabular-nums" style={{ background: part.tone, color: part.ink }}>
            {t('lesson.number', { n: l.no })}
          </span>
          <span className="text-[13.5px] font-medium text-ink-muted">{t('lesson.chapter', { n: l.no, title: l.chapterTitle })}</span>
          {!l.fromBook && <Badge tone="sun">{t('lesson.writing')}</Badge>}
          {ok && <Badge tone="forest"><Check size={11} aria-hidden="true" />{t('lesson.understood')}</Badge>}
        </div>

        <h3 className={cx(handCls, 'mt-3 leading-[1.12] text-ink', home ? 'text-[27px] sm:text-[32px]' : 'text-[26px] sm:text-[30px]')}>{l.title}</h3>

        <div className="mt-2 flow-root">
          <BookImage src={chapterImg(l.no)} alt={t('lesson.imgAlt', { n: l.no, title: l.chapterTitle })} width={ART_W} height={ART_H}
            className="block aspect-[2/3] w-full rounded-[3px] object-cover"
            wrap={(img) => (
              <figure className={cx('float-right mb-2 ml-4 mt-1 rotate-[1.5deg] rounded-md bg-white p-1.5 pb-2 ring-1 ring-line', home ? 'w-[40%] max-w-[200px]' : 'w-[38%] max-w-[180px]')}>{img}</figure>
            )} />
          <Lines lines={l.lines} />
        </div>

        {lang === 'en' && l.original.length > 0 && (
          <details className="mt-1 text-sm">
            <summary className="flex min-h-[44px] cursor-pointer items-center font-medium text-forest-600">{t('lesson.original')}</summary>
            <div lang="fr"><Lines lines={l.original} className={cx(handCls, 'pb-1')} /></div>
          </details>
        )}

        {l.diagram && (
          <figure className="mx-auto mt-4 rounded-[14px] border border-line bg-paper p-1.5" style={{ maxWidth: diagramMaxWidth(l.diagram) }}>
            <Pitch spec={l.diagram} width={560} title={l.title} />
            <figcaption className="px-1.5 pb-0.5 pt-1.5 text-[13px] text-ink-muted">{t('lesson.diagram')}</figcaption>
          </figure>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => toggle(l.no)} aria-pressed={ok}
            className={cx('btn min-h-[44px]', ok ? 'bg-forest-600 text-cream hover:bg-forest-700' : 'border border-forest-600 bg-paper text-forest-700 hover:bg-forest-50')}>
            <Check size={17} aria-hidden="true" />{ok ? t('lesson.understoodDone') : t('lesson.understand')}
          </button>
          <a href={chapterHref(l.no)} className="btn-outline min-h-[44px]"><BookOpen size={16} strokeWidth={1.75} aria-hidden="true" />{t('lesson.read', { n: l.no })}</a>
        </div>

        {!home && (challenge || drill) && (
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {challenge && (
              <Link to={`/app/joueur#defi-${challenge.id}`} className="flex min-h-[56px] items-center gap-3 rounded-[14px] border border-line bg-paper px-3.5 py-2.5 transition hover:border-terra-300">
                <Target size={18} strokeWidth={1.75} className="shrink-0 text-terra-600" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-semibold text-terra-700">{t('lesson.challenge')}</span>
                  <span className="block truncate text-[14px] font-medium text-ink">{challengeText(challenge, lang).title}</span>
                </span>
              </Link>
            )}
            {drill && (
              <Link to={`/app/exercices/${drill.id}`} className="flex min-h-[56px] items-center gap-3 rounded-[14px] border border-line bg-paper px-3.5 py-2.5 transition hover:border-forest-300">
                <Dumbbell size={18} strokeWidth={1.75} className="shrink-0 text-forest-600" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-semibold text-forest-700">{t('lesson.drill', { id: drill.id })}</span>
                  <span className="block truncate text-[14px] font-medium text-ink">{drillText(drill, lang).title}</span>
                </span>
              </Link>
            )}
          </div>
        )}
        {!home && (
          <Link to={`/app/joueur/carnet?lecon=${l.no}`} className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-medium text-forest-600 hover:underline">
            <NotebookPen size={15} strokeWidth={1.75} aria-hidden="true" />{t('lesson.write')}
          </Link>
        )}
      </div>
    </PaperCard>
  )
}

/** Carnet lines: a line starting with "- " is a bullet of the notebook, the others are sentences. */
function Lines({ lines, className }: { lines: string[]; className?: string }) {
  return (
    <ul className={cx('text-[16px] leading-[28px] text-ink-soft', className)}>
      {lines.map((raw, i) => {
        const bullet = /^\s*[-*]\s+/.test(raw)
        const line = raw.replace(/^\s*[-*]\s+/, '')
        return bullet
          ? <li key={i} className="relative pl-4"><span aria-hidden="true" className="absolute left-0 top-[12px] h-1.5 w-1.5 rounded-full bg-terra-500" />{line}</li>
          : <li key={i}>{line}</li>
      })}
    </ul>
  )
}

/** Tall diagrams (a half pitch seen upright) are narrowed so they stay about 400 px high. */
function diagramMaxWidth(spec: DiagramSpec) {
  try {
    const { w, h } = viewSize(spec)
    const ratio = (h + 2) / (w + 2)
    return ratio > 0.72 ? Math.round(420 / ratio) : undefined
  } catch { return undefined }
}
