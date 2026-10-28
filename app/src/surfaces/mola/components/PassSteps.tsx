import type { ReactNode } from 'react'
import { cx } from '../../../lib/util'
import './mola.css'

export type StepState = 'done' | 'running' | 'waiting' | 'cancelled' | 'todo'
export interface PassStep { label: ReactNode; state: StepState }

/** Mola's work as a passing move: each step a player, each line a pass; the ball arrives at the end.
 *  The same drawing as Mola's sign (the M of four passes and the gold ball). */
export default function PassSteps({ steps, end, ball = false, label, className, live = true }: {
  steps: PassStep[]; end?: ReactNode; ball?: boolean; label?: string; className?: string; live?: boolean
}) {
  return (
    <ol className={cx('mola-pass space-y-2', className)} aria-label={label} aria-live={live ? 'polite' : undefined}>
      {steps.map((s, i) => (
        <li key={i} className={cx('mola-in flex items-start gap-3 text-[14px] leading-[1.45]', s.state === 'done' && 'is-done')}>
          <span className="relative z-[1] grid h-5 w-5 shrink-0 place-items-center" aria-hidden="true"><Node state={s.state} /></span>
          <span className={cx('min-w-0 pt-px', s.state === 'done' ? 'text-ink-soft' : s.state === 'running' || s.state === 'waiting' ? 'font-medium text-ink' : 'text-ink-muted', s.state === 'cancelled' && 'line-through decoration-ink-faint')}>{s.label}</span>
        </li>
      ))}
      {end && (
        <li className="mola-in flex items-start gap-3">
          <span className="relative z-[1] grid h-5 w-5 shrink-0 place-items-center" aria-hidden="true">
            <span className={cx('block rounded-full', ball ? 'h-3 w-3 bg-sun-500 ring-[3px] ring-sun-50' : 'h-2.5 w-2.5 bg-forest-600')} />
          </span>
          <div className="min-w-0 flex-1">{end}</div>
        </li>
      )}
    </ol>
  )
}

function Node({ state }: { state: StepState }) {
  if (state === 'done') return <span className="block h-2.5 w-2.5 rounded-full bg-forest-600" />
  if (state === 'running') return <span className="block h-3 w-3 rounded-full border-2 border-forest-500 bg-paper" />
  if (state === 'waiting') return <span className="block h-3 w-3 rounded-full border-2 border-sun-500 bg-sun-50" />
  if (state === 'cancelled') return <span className="block h-2 w-2 rounded-full border border-ink-faint" />
  return <span className="block h-2 w-2 rounded-full border-[1.5px] border-line bg-paper" />
}
