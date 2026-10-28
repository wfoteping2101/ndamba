import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, Minus, Plus, StickyNote, Trash2 } from 'lucide-react'
import { useT } from '../../../i18n'
import { cx } from '../../../lib/util'
import type { MD, SessionBlock } from '../../../lib/types'
import { drillText } from '../../../content'
import { IntensityMeter, IntentionBadges, LazyPitch, NoDiagram } from './bits'
import { blockDrill, blockIntensity } from './helpers'

export function BlockRow({ b, index, count, md, startMin, onChange, onMove, onRemove }: {
  b: SessionBlock; index: number; count: number; md: MD; startMin: number
  onChange: (p: Partial<SessionBlock>) => void; onMove: (dir: -1 | 1) => void; onRemove: () => void
}) {
  const { t, lang } = useT('training')
  const d = blockDrill(b)
  const [notesOpen, setNotesOpen] = useState(!!b.notes)
  const title = d ? drillText(d, lang).title : b.title || b.drillId || t('builder.freeBlock')
  const setMin = (v: number) => onChange({ minutes: Math.max(1, Math.min(120, Math.round(v) || 1)) })
  const iconBtn = 'grid h-11 w-11 place-items-center rounded-xl text-ink-muted transition hover:bg-sand hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent'

  return (
    <li className="card overflow-hidden">
      <div className="flex gap-3 p-3 sm:gap-4 sm:p-4">
        <div className="relative w-28 shrink-0 sm:w-36">
          {d ? <Link to={`/app/exercices/${d.id}`} aria-label={title}><LazyPitch spec={d.diagram} width={260} fit={0.85} /></Link>
            : <NoDiagram label={b.drillId ? t('builder.drillPending') : t('builder.freeBlock')} />}
          <span className="absolute -left-1.5 -top-1.5 grid h-7 w-7 place-items-center rounded-full border-2 border-paper bg-forest-600 text-xs font-semibold tabular-nums text-cream">{index + 1}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-ink-faint">
            {b.drillId ? <span className="tabular-nums text-forest-700">{b.drillId}</span> : <span>{t('builder.freeBlock')}</span>}
            {d && <span className="hidden truncate font-medium text-ink-muted sm:inline">{t(`common:families.${d.family}`)}</span>}
            <span className="ml-auto shrink-0 tabular-nums text-ink-muted" title={t('builder.startsAt')}>{startMin}' {t('to')} {startMin + (Number(b.minutes) || 0)}'</span>
          </div>
          {d ? (
            <Link to={`/app/exercices/${d.id}`} className="line-clamp-2 font-display text-[17px] leading-snug text-ink hover:text-forest-600">{title}</Link>
          ) : b.drillId ? (
            <div className="font-display text-[17px] font-semibold leading-snug text-ink-muted">{t('builder.drillPendingTitle', { id: b.drillId })}</div>
          ) : (
            <input aria-label={t('fields.title')} className="-ml-1 w-full rounded-lg border border-transparent bg-transparent px-1 py-0.5 font-display text-[17px] font-semibold text-ink hover:border-line focus:border-forest-500 focus:bg-white focus:outline-none"
              value={b.title ?? ''} placeholder={t('builder.freeTitlePh')} onChange={(e) => onChange({ title: e.target.value })} />
          )}
          {d && <p className="mt-0.5 line-clamp-1 text-[13px] text-ink-muted">{drillText(d, lang).subtitle}</p>}
          {d && <div className="mt-1.5 hidden sm:block"><IntentionBadges list={d.intentions} max={3} /></div>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-line/70 px-3 py-2 sm:gap-x-3 sm:px-4">
        <div className="flex items-center rounded-xl border border-line bg-white" role="group" aria-label={t('builder.minutes')}>
          <button type="button" className="grid h-10 w-10 place-items-center text-ink-muted hover:text-ink" onClick={() => setMin(b.minutes - 1)} aria-label={t('builder.lessMin')}><Minus size={15} /></button>
          <input type="number" inputMode="numeric" min={1} max={120} aria-label={t('builder.minutes')} className="w-10 bg-transparent text-center text-sm font-semibold tabular-nums text-ink focus:outline-none"
            value={b.minutes} onChange={(e) => setMin(Number(e.target.value))} />
          <button type="button" className="grid h-10 w-10 place-items-center text-ink-muted hover:text-ink" onClick={() => setMin(b.minutes + 1)} aria-label={t('builder.moreMin')}><Plus size={15} /></button>
        </div>
        <span className="text-xs text-ink-muted">{t('common:misc.minutes')}</span>
        <span className="hidden sm:inline-flex"><IntensityMeter level={blockIntensity(b, md)} /></span>
        <span className="inline-flex sm:hidden"><IntensityMeter level={blockIntensity(b, md)} showLabel={false} /></span>
        <div className="ml-auto flex items-center">
          <button type="button" className={iconBtn} onClick={() => onMove(-1)} disabled={index === 0} aria-label={t('builder.up')}><ArrowUp size={17} /></button>
          <button type="button" className={iconBtn} onClick={() => onMove(1)} disabled={index === count - 1} aria-label={t('builder.down')}><ArrowDown size={17} /></button>
          <button type="button" className={cx(iconBtn, 'hover:bg-clay-50 hover:text-clay-600')} onClick={onRemove} aria-label={t('builder.remove')}><Trash2 size={17} /></button>
        </div>
      </div>
      <div className="border-t border-line/70 bg-cream/50 px-3 py-2 sm:px-4">
        {notesOpen ? (
          <textarea aria-label={t('builder.notes')} rows={2} className="input min-h-[44px] resize-y bg-white text-sm" placeholder={t('builder.notesPh')}
            value={b.notes ?? ''} onChange={(e) => onChange({ notes: e.target.value })} autoFocus={!b.notes} />
        ) : (
          <button type="button" className="inline-flex min-h-[36px] items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-forest-600" onClick={() => setNotesOpen(true)}>
            <StickyNote size={15} aria-hidden="true" />{t('builder.addNote')}
          </button>
        )}
      </div>
    </li>
  )
}
