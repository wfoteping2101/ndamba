// Small pieces shared by the cards of the performance space.
import type { ReactNode } from 'react'
import { useT } from '../../../../i18n'
import { cx } from '../../../../lib/util'
import { fmtNjangi, type SubKey } from '../../../../lib/njangi'

/** Card heading: a small label when it says something (when, which cycle), the title, a short hint, an optional action.
 *  `icon` is accepted for older call sites and no longer drawn: the cards are told apart by their content. */
export function PerfHead({ id, eyebrow, title, hint, action }: { id?: string; eyebrow?: string; title: string; hint?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-[13.5px] font-semibold text-forest-600 first-letter:uppercase">{eyebrow}</p>}
        <h2 id={id} className="text-[22px] leading-tight text-ink">{title}</h2>
        {hint && <p className="mt-1.5 max-w-xl text-[14px] leading-relaxed text-ink-muted">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

/** A number with its label, for the rows of figures inside a card: no box, a hairline on its left. */
export function Figure({ label, value, sub, tone = 'ink', className }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'ink' | 'forest' | 'terra' | 'sun'; className?: string }) {
  const { t } = useT('player')
  const color = tone === 'forest' ? 'text-forest-600' : 'text-ink'
  const empty = value === null || value === undefined || value === ''
  return (
    <div className={cx('min-w-0 border-l-2 border-line pl-3', className)}>
      <dt className="line-clamp-2 text-[12.5px] font-medium leading-tight text-ink-muted">{label}</dt>
      <dd className={cx('mt-0.5 leading-tight tabular-nums', empty ? 'py-1 text-[15px] font-medium text-ink-faint' : cx('font-display text-[24px]', color))}>{empty ? t('perf.none') : value}</dd>
      {sub && <dd className="truncate text-[12.5px] text-ink-muted">{sub}</dd>}
    </div>
  )
}

/** One row of the 1 to 5 questionnaire, or the 0 to 10 exertion scale: big buttons, end labels below. */
export function ScaleRow({ id, label, value, onChange, from = 1, to = 5, low, high, describe }: {
  id: string; label: string; value?: number; onChange: (v: number) => void; from?: number; to?: number; low: string; high: string; describe?: (v: number) => string
}) {
  // 0 to 10: two rows on phones, one row from 640 px
  const values = Array.from({ length: to - from + 1 }, (_, i) => from + i)
  const wide = values.length > 6
  return (
    <fieldset className="min-w-0">
      <legend id={`${id}-l`} className="mb-1.5 flex w-full items-baseline justify-between gap-2 text-[14px] font-semibold text-ink">
        <span>{label}</span>
        {value !== undefined && describe && <span className="text-[12px] font-medium text-ink-muted">{describe(value)}</span>}
      </legend>
      <div className={cx('grid gap-1.5', wide ? 'grid-cols-6 sm:grid-cols-11' : 'grid-cols-5')}>
        {values.map((v) => (
          <button key={v} type="button" onClick={() => onChange(v)} aria-pressed={value === v} aria-label={`${label} : ${v}${describe ? `, ${describe(v)}` : ''}`}
            className={cx('grid h-11 place-items-center rounded-xl border text-[15px] font-semibold tabular-nums transition',
              value === v ? 'border-forest-600 bg-forest-600 text-cream' : 'border-line bg-paper text-ink-soft hover:border-ink-faint')}>
            {v}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between gap-2 text-[12px] text-ink-muted" aria-hidden="true"><span>{low}</span><span className="text-right">{high}</span></div>
    </fieldset>
  )
}

/** The five sub-indices of the Indice Njangi as bars (out of 20), the weakest highlighted. */
export function SubBars({ sub, weakest }: { sub: Record<SubKey, number>; weakest?: SubKey }) {
  const { t, lang } = useT('player')
  return (
    <ul className="space-y-2.5">
      {(Object.keys(sub) as SubKey[]).map((k) => {
        const weak = k === weakest
        return (
          <li key={k}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-[13px]">
              <span className={cx(weak ? 'font-semibold text-ink' : 'font-medium text-ink-soft')}>{t(`subs.${k}`)}{weak && <span className="ml-2 rounded-full bg-sand px-2 py-0.5 text-[12px] font-semibold text-ink-soft">{t('indice.weakest')}</span>}</span>
              <span className="tabular-nums text-ink-muted"><span className="font-semibold text-ink">{fmtNjangi(sub[k], lang)}</span> / 20</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-sand" role="img" aria-label={`${t(`subs.${k}`)} ${fmtNjangi(sub[k], lang)} / 20`}>
              <div className={cx('h-full rounded-full', weak ? 'bg-forest-300' : 'bg-forest-600')} style={{ width: `${Math.min(100, (sub[k] / 20) * 100)}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/** Intensity of a day of the match week, as four small bars. */
export function IntensityPips({ level, light = false, label }: { level: number; light?: boolean; label?: string }) {
  return (
    <span className="inline-flex items-end gap-[2px]" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {[1, 2, 3, 4].map((l) => (
        <span key={l} className={cx('w-[4px] rounded-[1px]', l <= level ? (light ? 'bg-cream' : 'bg-forest-600') : light ? 'bg-white/25' : 'bg-line')} style={{ height: 3 + l * 2.5 }} />
      ))}
    </span>
  )
}

export const fmtInt = (n: number, lang: 'fr' | 'en') => Math.round(n).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US')
export const fmtSigned = (n: number, lang: 'fr' | 'en', digits = 0) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
