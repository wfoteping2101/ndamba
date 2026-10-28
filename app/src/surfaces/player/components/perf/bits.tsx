// Small pieces shared by the cards of the performance space.
import type { ReactNode } from 'react'
import { useT } from '../../../../i18n'
import { cx } from '../../../../lib/util'
import { fmtNjangi, type SubKey } from '../../../../lib/njangi'

/** Card heading: eyebrow, title, a short hint and an optional action on the right. */
export function PerfHead({ id, eyebrow, title, hint, action, icon }: { id?: string; eyebrow?: string; title: string; hint?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
      <div className="flex min-w-0 items-start gap-3">
        {icon && <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-forest-50 text-forest-700 [&>svg]:h-[18px] [&>svg]:w-[18px]" aria-hidden="true">{icon}</span>}
        <div className="min-w-0">
          {eyebrow && <div className="eyebrow mb-0.5">{eyebrow}</div>}
          <h2 id={id} className="font-display text-[20px] font-semibold leading-tight text-ink">{title}</h2>
          {hint && <p className="mt-0.5 max-w-xl text-[13px] text-ink-muted">{hint}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

/** A number with its label, for the rows of figures inside a card. */
export function Figure({ label, value, sub, tone = 'ink', className }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'ink' | 'forest' | 'terra' | 'sun'; className?: string }) {
  const color = tone === 'forest' ? 'text-forest-700' : tone === 'terra' ? 'text-terra-700' : tone === 'sun' ? 'text-sun-700' : 'text-ink'
  return (
    <div className={cx('min-w-0 rounded-xl bg-cream/80 px-3 py-2.5 ring-1 ring-line/70', className)}>
      <div className="line-clamp-2 text-[11.5px] font-medium leading-tight text-ink-muted">{label}</div>
      <div className={cx('font-display text-[22px] font-semibold leading-tight tabular-nums', color)}>{value}</div>
      {sub && <div className="truncate text-[11.5px] text-ink-faint">{sub}</div>}
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
      <legend id={`${id}-l`} className="mb-1.5 flex w-full items-baseline justify-between gap-2 text-[13.5px] font-semibold text-ink">
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
      <div className="mt-1 flex justify-between gap-2 text-[11px] text-ink-faint" aria-hidden="true"><span>{low}</span><span className="text-right">{high}</span></div>
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
              <span className={cx('font-medium', weak ? 'text-terra-700' : 'text-ink-soft')}>{t(`subs.${k}`)}{weak && <span className="ml-1.5 text-[11.5px] font-semibold text-terra-600">{t('indice.weakest')}</span>}</span>
              <span className="tabular-nums text-ink-muted"><span className="font-semibold text-ink">{fmtNjangi(sub[k], lang)}</span> / 20</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-sand" role="img" aria-label={`${t(`subs.${k}`)} ${fmtNjangi(sub[k], lang)} / 20`}>
              <div className={cx('h-full rounded-full', weak ? 'bg-terra-500' : 'bg-forest-600')} style={{ width: `${Math.min(100, (sub[k] / 20) * 100)}%` }} />
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
        <span key={l} className={cx('w-[4px] rounded-[1px]', l <= level ? (light ? 'bg-sun-300' : 'bg-terra-500') : light ? 'bg-white/25' : 'bg-line')} style={{ height: 3 + l * 2.5 }} />
      ))}
    </span>
  )
}

export const fmtInt = (n: number, lang: 'fr' | 'en') => Math.round(n).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US')
export const fmtSigned = (n: number, lang: 'fr' | 'en', digits = 0) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
