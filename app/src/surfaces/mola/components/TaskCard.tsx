import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, CalendarDays, CalendarPlus, Check, ChevronRight, ClipboardList, Dumbbell, Hand, LineChart, LoaderCircle, Send, Shirt, Trophy, UserPlus, X, type LucideIcon } from 'lucide-react'
import { useT } from '../../../i18n'
import { BRAND } from '../../../lib/config'
import { fmtNjangi, SUB_KEYS } from '../../../lib/njangi'
import { cx } from '../../../lib/util'
import type { MolaTask } from '../executors'
import ApprovalCard from './ApprovalCard'
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

/** What Mola is doing or did: the steps ticking live, then the result, or the approval card. */
export default function TaskCard({ task, compact = false, onNavigate }: { task: MolaTask; compact?: boolean; onNavigate?: () => void }) {
  const { t, lang } = useT('mola')
  const running = task.status === 'running'
  const waiting = task.status === 'needs_approval'
  const lastOpen = task.steps.findIndex((s) => !s.done)
  const items = task.payload?.items ?? []
  const shown = compact ? items.slice(0, 3) : items
  const nj = task.payload?.njangi

  return (
    <div className="mt-2.5">
      <ol className="space-y-1.5" aria-label={t('task.steps')} aria-live="polite">
        {task.steps.map((s, i) => {
          const pendingHere = !s.done && i === lastOpen
          const icon = s.done ? <Check size={12} strokeWidth={3} />
            : pendingHere && running ? <LoaderCircle size={12} className="motion-safe:animate-spin" />
            : waiting ? <Hand size={12} /> : task.status === 'cancelled' ? <X size={12} /> : <span className="h-1.5 w-1.5 rounded-full bg-ink-faint" />
          return (
            <li key={i} className="mola-in flex items-start gap-2.5 text-[14px] leading-snug">
              <span className={cx('mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full',
                s.done ? 'bg-forest-600 text-cream' : waiting ? 'bg-sun-100 text-sun-700' : 'bg-sand text-ink-muted')}>{icon}</span>
              <span className={s.done ? 'text-ink-soft' : waiting ? 'font-medium text-sun-700' : 'text-ink-muted'}>{s.label}</span>
            </li>
          )
        })}
      </ol>

      {task.status === 'done' && task.summary && (
        <div className="mola-in mt-3 border-t border-line pt-3">
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink">{task.summary}</p>

          {nj && (
            <div className="mt-3 rounded-xl bg-cream px-3 py-3">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl font-semibold text-forest-600">{fmtNjangi(nj.total, lang)}</span>
                <span className="text-xs font-semibold text-ink-muted">/ 100 · {nj.label}</span>
              </div>
              <div className="mt-2 grid gap-1.5">
                {SUB_KEYS.map((k) => (
                  <div key={k} className="grid grid-cols-[96px_1fr_34px] items-center gap-2 text-[12px] sm:grid-cols-[120px_1fr_34px]">
                    <span className="truncate text-ink-muted">{t(`analysis:sub.${k}.name`)}</span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-sand"><span className={cx('block h-full rounded-full', nj.sub[k] < 8 ? 'bg-clay-500' : nj.sub[k] < 13 ? 'bg-sun-500' : 'bg-forest-600')} style={{ width: `${(nj.sub[k] / 20) * 100}%` }} /></span>
                    <span className="text-right font-semibold tabular-nums text-ink-soft">{fmtNjangi(nj.sub[k], lang)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {shown.length > 0 && (
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
              {shown.map((it, i) => {
                const body = (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-ink">{it.label}</span>
                      {it.sub && <span className="block truncate text-[12px] text-ink-muted">{it.sub}</span>}
                    </span>
                    {it.route && <ChevronRight size={16} className="shrink-0 text-ink-faint" aria-hidden="true" />}
                  </>
                )
                return (
                  <li key={i}>
                    {it.route
                      ? <SmartLink to={it.route} onClick={onNavigate} className="flex min-h-[48px] items-center gap-2 px-3 py-2 hover:bg-cream">{body}</SmartLink>
                      : <div className="flex min-h-[48px] items-center gap-2 px-3 py-2">{body}</div>}
                  </li>
                )
              })}
            </ul>
          )}
          {compact && items.length > shown.length && <p className="mt-1.5 text-[12px] text-ink-muted">{t('task.more', { count: items.length - shown.length })}</p>}

          {task.resultRoute && (
            <SmartLink to={task.resultRoute} onClick={onNavigate} className="btn-primary btn-sm mt-3 min-h-[44px] sm:min-h-[36px]">
              {task.payload?.resultLabel ?? t('open.result')}<ArrowRight size={15} aria-hidden="true" />
            </SmartLink>
          )}
          {task.payload?.motto && <p className="mt-3 font-display text-[14px] italic text-terra-700">{BRAND.motto[lang]}</p>}
        </div>
      )}

      {waiting && task.approval && <ApprovalCard task={task} compact={compact} />}

      {task.status === 'cancelled' && task.summary && <p className="mt-2 text-[13px] text-ink-muted">{task.summary}</p>}
    </div>
  )
}
