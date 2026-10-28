import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { useT } from '../../../i18n'
import { db } from '../../../lib/db'
import { useLiveQuery } from '../../../lib/hooks'
import type { ChatMessage } from '../../../lib/types'
import { cx } from '../../../lib/util'
import { askMola, type MolaTask } from '../executors'
import { useMolaBusy } from '../store'
import Chips from './Chips'
import Composer from './Composer'
import MolaAvatar, { TypingDots } from './MolaAvatar'
import TaskCard from './TaskCard'
import './mola.css'

/** The Mola thread, live from IndexedDB, plus the tasks its messages point to. */
export function useMolaThread(limit = 80) {
  const messages = useLiveQuery(
    () => db.messages.where('thread').equals('mola').sortBy('createdAt').then((l) => l.slice(-limit)),
    [limit], [] as ChatMessage[],
  )
  const ids = messages.map((m) => m.taskId).filter(Boolean).join(',')
  const tasks = useLiveQuery(async () => {
    const list = ids ? ((await db.tasks.bulkGet(ids.split(','))) as (MolaTask | undefined)[]) : []
    return Object.fromEntries(list.filter(Boolean).map((x) => [x!.id, x!])) as Record<string, MolaTask>
  }, [ids], {} as Record<string, MolaTask>)
  return { messages, tasks, busy: useMolaBusy() }
}

/** A Mola turn: the badge and the name at the start of a group, then the text set calmly on the page (no bubble).
 *  The person's words sit on the right in pitch green. The hub and the launcher share this panel. */
export default function ChatPanel({ compact = false, limit = 80, before, after, onNavigate, autoFocus, className, inputId, prefill, chipsClassName }: {
  compact?: boolean; limit?: number; before?: ReactNode; after?: ReactNode; onNavigate?: () => void; autoFocus?: boolean; className?: string; inputId?: string
  /** Extra classes for the suggestion chips above the composer (the hub hides them on wide screens, where the side list shows the same ideas). */
  chipsClassName?: string
  /** Pre-fills the composer without sending (see Composer). */
  prefill?: { text: string; n: number }
}) {
  const { t } = useT('mola')
  const { messages, tasks, busy } = useMolaThread(limit)
  const scroller = useRef<HTMLDivElement>(null)
  const last = messages[messages.length - 1]
  const chips = !busy && last?.role === 'mola' ? last.chips ?? [] : []
  const latestTask = [...messages].reverse().find((m) => m.taskId)?.taskId
  // follow the conversation: new messages, ticking steps, Mola writing
  const signature = useMemo(() => messages.map((m) => m.id).join() + JSON.stringify(Object.values(tasks).map((x) => [x.status, x.steps.length])) + busy, [messages, tasks, busy])
  useLayoutEffect(() => { const el = scroller.current; if (el) el.scrollTop = el.scrollHeight }, [signature])
  useEffect(() => { const el = scroller.current; if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight }) }, [])
  const av = compact ? 28 : 32

  return (
    <div className={cx('flex min-h-0 flex-col', className)}>
      <div ref={scroller} className={cx('min-h-0 flex-1 overflow-y-auto overscroll-contain', compact ? 'px-3.5 py-4' : 'px-4 py-5 sm:px-6 sm:py-6')} aria-live="polite" aria-relevant="additions">
        {before}
        <div>
          {messages.map((m, i) => {
            const prev = messages[i - 1]
            const grouped = prev?.role === m.role
            if (m.role === 'user') return (
              <div key={m.id} className={cx('mola-in flex justify-end', i === 0 ? '' : grouped ? 'mt-1.5' : 'mt-5')}>
                <div className="max-w-[82%] whitespace-pre-line rounded-[18px] rounded-br-[6px] bg-forest-600 px-4 py-2.5 text-[15px] leading-relaxed text-cream">{m.text}</div>
              </div>
            )
            const task = m.taskId ? tasks[m.taskId] : undefined
            return (
              <div key={m.id} className={cx('mola-in', i === 0 ? '' : grouped ? 'mt-3' : 'mt-5')}>
                <div className="flex items-start gap-3">
                  <span className="shrink-0" style={{ width: av }}>{!grouped && <MolaAvatar size={av} ring={false} />}</span>
                  <div className="min-w-0 max-w-[62ch] flex-1">
                    {!grouped && <div className="mb-0.5 text-[13px] font-semibold leading-[22px] text-ink">{t('name')}</div>}
                    <p className="whitespace-pre-line text-[15.5px] leading-[1.6] text-ink">{m.text}</p>
                  </div>
                </div>
                {/* the work itself takes the full width on phones, and sits under the text from 640 px */}
                {task && <div className={cx('max-w-[620px]', compact ? '' : 'sm:pl-11')}><TaskCard task={task} compact={compact} onNavigate={onNavigate} latest={task.id === latestTask} /></div>}
              </div>
            )
          })}
          {!busy && after && <div className="mt-4">{after}</div>}
          {busy && (
            <div className="mola-in mt-5 flex items-center gap-3">
              <span className="shrink-0" style={{ width: av }}><MolaAvatar size={av} busy /></span>
              <TypingDots label={t('typing')} />
            </div>
          )}
        </div>
      </div>
      <div className={cx('border-t border-line bg-paper', compact ? 'space-y-2 px-3 pb-3 pt-2.5' : 'space-y-2.5 px-4 pb-4 pt-3 sm:px-6')}>
        {chips.length > 0 && <Chips chips={chips} onSend={(c) => askMola(c)} onNavigate={onNavigate} scroll className={chipsClassName} />}
        <Composer id={inputId} onSend={(v) => askMola(v)} placeholder={t('composer.placeholder')} label={t('composer.label')} sendLabel={t('composer.send')} autoFocus={autoFocus} prefill={prefill} />
      </div>
    </div>
  )
}
