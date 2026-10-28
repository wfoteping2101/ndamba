import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, CalendarDays, CalendarPlus, ChevronDown, ChevronRight, ClipboardList, Dumbbell, LineChart, Send, Shirt, Trophy, UserPlus, type LucideIcon } from 'lucide-react'
import { useT } from '../../../i18n'
import { BRAND } from '../../../lib/config'
import { fmtNjangi, SUB_KEYS } from '../../../lib/njangi'
import { cx } from '../../../lib/util'
import type { MolaTask } from '../executors'
import ApprovalCard from './ApprovalCard'
import PassSteps, { type StepState } from './PassSteps'
import './mola.css'

export const INTENT_ICON: Record<string, LucideIcon> = {
  plan_week: CalendarDays, create_session: ClipboardList, setup_match: Trophy, add_player: UserPlus, create_team: Shirt,
  send_convocation: Send, export_calendar: CalendarPlus, analyze_last_match: LineChart, recommend_drills: Dumbbell, open_lesson: BookOpen, open_book: BookOpen,
}

/** Pages outside the app (the books, downloads) are plain links; the rest go through the router. */
export function SmartLink({ to, className, children, onClick }: { to: string; className?: string; children: ReactNode; onClick?: () => void }) {
  if (/^\/(book|downloads)\//.test(to)) return <a href={to} className={className} onClick={onClick}>{children}</a>
  return <Link to={to} className={className} onClick={onClick}>{children}</Link>
}

/** What Mola is doing or did, drawn as a passing move: the steps tick live, then the ball arrives with the result.
 *  `latest` gives the arriving ball its gold (only the newest result of a thread carries the accent). */
export default function TaskCard({ task, compact = false, onNavigate, latest = false, stepsOpen = false }: { task: MolaTask; compact?: boolean; onNavigate?: () => void; latest?: boolean; stepsOpen?: boolean }) {
  const { t } = useT('mola')
  const [showSteps, setShowSteps] = useState(stepsOpen)
  const running = task.status === 'running'
  const waiting = task.status === 'needs_approval'
  const done = task.status === 'done'
  const lastOpen = task.steps.findIndex((s) => !s.done)
  const state = (done: boolean, i: number): StepState =>
    done ? 'done' : i === lastOpen ? (running ? 'running' : waiting ? 'waiting' : task.status === 'cancelled' || task.status === 'failed' ? 'cancelled' : 'todo') : task.status === 'cancelled' || task.status === 'failed' ? 'cancelled' : 'todo'
  const steps = task.steps.map((s, i) => ({ label: s.label, state: state(s.done, i) }))

  if (done) {
    return (
      <div className="mt-3">
        <PassSteps steps={showSteps ? steps : []} label={t('task.steps')} live={false} ball={latest} end={<Result task={task} compact={compact} onNavigate={onNavigate}
          stepsToggle={task.steps.length > 0 && (
            <button type="button" className="inline-flex min-h-[40px] items-center gap-1 rounded-lg px-2 text-[13px] font-semibold text-ink-muted hover:bg-sand hover:text-ink" aria-expanded={showSteps} onClick={() => setShowSteps((v) => !v)}>
              {showSteps ? t('task.hideSteps') : t('task.showSteps', { count: task.steps.length })}
              <ChevronDown size={14} aria-hidden="true" className={cx('transition', showSteps && 'rotate-180')} />
            </button>
          )} />} />
      </div>
    )
  }

  return (
    <div className="mt-3">
      <PassSteps steps={steps} label={t('task.steps')} />
      {waiting && task.approval && <ApprovalCard task={task} compact={compact} />}
      {(task.status === 'cancelled' || task.status === 'failed') && task.summary && <p className="mt-2 pl-8 text-[13.5px] text-ink-muted">{task.summary}</p>}
    </div>
  )
}

function Result({ task, compact, onNavigate, stepsToggle }: { task: MolaTask; compact: boolean; onNavigate?: () => void; stepsToggle?: ReactNode }) {
  const { t, lang } = useT('mola')
  const items = task.payload?.items ?? []
  const shown = compact ? items.slice(0, 3) : items
  const nj = task.payload?.njangi
  return (
    <div className="min-w-0">
      {task.summary && <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink">{task.summary}</p>}

      {nj && (
        <div className="mt-3 rounded-[14px] border border-line bg-cream/70 px-3.5 py-3">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-[34px] leading-none tabular-nums text-forest-600">{fmtNjangi(nj.total, lang)}</span>
            <span className="text-[13px] font-semibold text-ink-faint">/ 100</span>
          </div>
          <div className="mt-1 text-[13px] font-semibold text-ink">{nj.label}</div>
          <div className="mt-2.5 grid gap-1.5">
            {SUB_KEYS.map((k) => (
              <div key={k} className="grid grid-cols-[92px_1fr_34px] items-center gap-2 text-[12.5px] sm:grid-cols-[116px_1fr_34px]">
                <span className="truncate text-ink-muted">{t(`analysis:sub.${k}.name`)}</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-sand"><span className={cx('block h-full rounded-full', nj.sub[k] < 8 ? 'bg-ink-faint' : nj.sub[k] < 13 ? 'bg-forest-300' : 'bg-forest-600')} style={{ width: `${(nj.sub[k] / 20) * 100}%` }} /></span>
                <span className="text-right font-semibold tabular-nums text-ink-soft">{fmtNjangi(nj.sub[k], lang)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {shown.length > 0 && (
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[14px] border border-line bg-paper">
          {shown.map((it, i) => {
            const body = (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-ink">{it.code && <span className="mr-1.5 text-[12.5px] text-forest-600">{it.code}</span>}{it.label}</span>
                  {it.sub && <span className="block truncate text-[12.5px] text-ink-muted">{it.sub}</span>}
                </span>
                {it.route && <ChevronRight size={16} className="shrink-0 text-ink-faint" aria-hidden="true" />}
              </>
            )
            return (
              <li key={i}>
                {it.route
                  ? <SmartLink to={it.route} onClick={onNavigate} className="flex min-h-[48px] items-center gap-2 px-3.5 py-2 hover:bg-cream">{body}</SmartLink>
                  : <div className="flex min-h-[48px] items-center gap-2 px-3.5 py-2">{body}</div>}
              </li>
            )
          })}
        </ul>
      )}
      {compact && items.length > shown.length && <p className="mt-1.5 text-[12.5px] text-ink-muted">{t('task.more', { count: items.length - shown.length })}</p>}

      {(task.resultRoute || stepsToggle) && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {task.resultRoute && (
            <SmartLink to={task.resultRoute} onClick={onNavigate} className="btn-primary btn-sm min-h-[40px] px-3.5">
              {task.payload?.resultLabel ?? t('open.result')}
            </SmartLink>
          )}
          {stepsToggle}
        </div>
      )}
      {task.payload?.motto && <p className="mt-3 text-[14px] italic text-ink-muted">{BRAND.motto[lang]}</p>}
    </div>
  )
}
