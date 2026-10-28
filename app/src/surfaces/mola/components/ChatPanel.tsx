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

/** Chat bubbles, steps, approvals, chips and the composer. The hub and the launcher share it. */
export default function ChatPanel({ compact = false, limit = 80, before, after, onNavigate, autoFocus, className, inputId, prefill }: {
  compact?: boolean; limit?: number; before?: ReactNode; after?: ReactNode; onNavigate?: () => void; autoFocus?: boolean; className?: string; inputId?: string
  /** Pre-fills the composer without sending (see Composer). */
  prefill?: { text: string; n: number }
}) {
  const { t } = useT('mola')
  const { messages, tasks, busy } = useMolaThread(limit)
  const scroller = useRef<HTMLDivElement>(null)
  const last = messages[messages.length - 1]
  const chips = !busy && last?.role === 'mola' ? last.chips ?? [] : []
  // follow the conversation: new messages, ticking steps, the typing dots
  const signature = useMemo(() => messages.map((m) => m.id).join() + JSON.stringify(Object.values(tasks).map((x) => [x.status, x.steps.length])) + busy, [messages, tasks, busy])
  useLayoutEffect(() => { const el = scroller.current; if (el) el.scrollTop = el.scrollHeight }, [signature])
  useEffect(() => { const el = scroller.current; if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight }) }, [])

  return (
    <div className={cx('flex min-h-0 flex-col', className)}>
      <div ref={scroller} className={cx('min-h-0 flex-1 overflow-y-auto overscroll-contain', compact ? 'px-3 py-3' : 'px-3 py-4 sm:px-5 sm:py-5')} aria-live="polite" aria-relevant="additions">
        {before}
        <div className="space-y-3">
          {messages.map((m, i) => {
            const prev = messages[i - 1]
            const grouped = prev?.role === m.role
            if (m.role === 'user') return (
              <div key={m.id} className="mola-in flex justify-end">
                <div className="max-w-[86%] whitespace-pre-line rounded-2xl rounded-br-md bg-forest-600 px-4 py-2.5 text-[15px] leading-relaxed text-cream">{m.text}</div>
              </div>
            )
            const task = m.taskId ? tasks[m.taskId] : undefined
            return (
              <div key={m.id} className="mola-in flex items-start gap-2">
                {!compact && <span className="w-8 shrink-0">{!grouped && <MolaAvatar size={32} ring={false} />}</span>}
                <div className={cx('min-w-0 rounded-2xl rounded-tl-md border border-line bg-paper px-4 py-3 shadow-card', task ? 'w-full max-w-[560px]' : 'max-w-[92%]')}>
                  <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink">{m.text}</p>
                  {task && <TaskCard task={task} compact={compact} onNavigate={onNavigate} />}
                </div>
              </div>
            )
          })}
          {!busy && after}
          {busy && (
            <div className="mola-in flex items-center gap-2">
              {!compact && <span className="w-8 shrink-0"><MolaAvatar size={32} busy /></span>}
              <div className="rounded-2xl rounded-tl-md border border-line bg-paper px-4 py-2.5 shadow-card"><TypingDots label={t('typing')} /></div>
            </div>
          )}
        </div>
      </div>
      <div className={cx('border-t border-line bg-paper/95', compact ? 'space-y-2 px-3 pb-3 pt-2.5' : 'space-y-2.5 px-3 pb-3 pt-3 sm:px-5')}>
        {chips.length > 0 && <Chips chips={chips} onSend={(c) => askMola(c)} onNavigate={onNavigate} scroll />}
        <Composer id={inputId} onSend={(v) => askMola(v)} placeholder={t('composer.placeholder')} label={t('composer.label')} sendLabel={t('composer.send')} autoFocus={autoFocus} prefill={prefill} />
      </div>
    </div>
  )
}
