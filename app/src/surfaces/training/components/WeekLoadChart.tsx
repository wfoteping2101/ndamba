import { useState } from 'react'
import { Table2, Trophy } from 'lucide-react'
import { useT } from '../../../i18n'
import { cx, fmtDate } from '../../../lib/util'
import { LOAD_COLOR, fmtDay } from './helpers'

export interface LoadDay { date: string; label: string; minutes: number; load: number; match?: string; today?: boolean }

/** Weekly load: one column per day (minutes x intensity factor). Single series, value on each cap. */
export function WeekLoadChart({ days }: { days: LoadDay[] }) {
  const { t, lang } = useT('training')
  const [hover, setHover] = useState<number | null>(null)
  const [table, setTable] = useState(false)
  const max = Math.max(60, ...days.map((d) => d.load))
  const H = 140

  return (
    <div>
      <div className="relative" style={{ height: H + 22 }}>
        {/* hairline grid: quarter steps */}
        {[0.25, 0.5, 0.75].map((f) => <div key={f} className="absolute inset-x-0 border-t border-line/70" style={{ top: 22 + H * (1 - f) }} aria-hidden="true" />)}
        <div className="absolute inset-x-0 border-t border-line" style={{ top: 22 + H }} aria-hidden="true" />
        <div className="absolute inset-0 grid grid-cols-7 gap-1 sm:gap-2" role="list" aria-label={t('week.loadTitle')}>
          {days.map((d, i) => {
            const h = d.load ? Math.max(4, (d.load / max) * H) : 0
            const desc = `${fmtDay(d.date, lang)}${d.label ? ` (${d.label})` : ''}${t('colon')}${d.match ? t('week.matchDay', { opponent: d.match }) : d.load ? t('week.loadValue', { load: d.load, minutes: d.minutes }) : t('week.restDay')}`
            return (
              <div key={d.date} role="listitem" tabIndex={0} aria-label={desc}
                onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                className="relative flex flex-col items-center justify-end rounded-lg focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500" style={{ paddingBottom: 0, height: H + 22 }}>
                {d.match ? (
                  <div className="mb-1 flex flex-col items-center gap-1 text-[11px] font-semibold text-forest-700">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-forest-600 text-cream"><Trophy size={15} aria-hidden="true" /></span>
                    {t('week.match')}
                  </div>
                ) : d.load > 0 ? (
                  <>
                    <span className="mb-1 text-[12px] font-semibold tabular-nums text-ink-soft">{d.load}</span>
                    <div className={cx('w-full max-w-[24px] rounded-t-[4px] transition-opacity', hover !== null && hover !== i && 'opacity-55')} style={{ height: h, background: LOAD_COLOR }} />
                  </>
                ) : (
                  <span className="mb-1 text-[11px] text-ink-faint">0</span>
                )}
                {hover === i && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 w-max max-w-[200px] -translate-x-1/2 rounded-lg bg-night-800 px-2.5 py-1.5 text-xs text-cream shadow-lift">
                    <div className="font-semibold">{d.match ? t('week.matchDay', { opponent: d.match }) : t('week.loadValue', { load: d.load, minutes: d.minutes })}</div>
                    <div className="text-cream/75">{fmtDay(d.date, lang)}{d.label ? ` (${d.label})` : ''}</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1 text-center sm:gap-2" aria-hidden="true">
        {days.map((d) => (
          <div key={d.date} className="min-w-0">
            <div className={cx('text-[12px] font-semibold', d.today ? 'text-forest-700 underline decoration-2 underline-offset-4' : 'text-ink-muted')}>{fmtDate(d.date, lang, { weekday: 'narrow' })}</div>
            <div className="truncate text-[11px] tabular-nums text-ink-faint">{d.label || ' '}</div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-end">
        <button type="button" className="btn-ghost btn-sm text-xs" onClick={() => setTable((v) => !v)} aria-expanded={table}><Table2 size={14} aria-hidden="true" />{table ? t('week.hideTable') : t('week.showTable')}</button>
      </div>
      {table && (
        <div className="overflow-x-auto">
          <table className="table-n">
            <thead><tr><th>{t('week.day')}</th><th>MD</th><th className="text-right">{t('builder.minutes')}</th><th className="text-right">{t('builder.load')}</th></tr></thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.date}><td>{fmtDay(d.date, lang)}</td><td>{d.label}</td><td className="text-right tabular-nums">{d.match ? t('week.match') : d.minutes}</td><td className="text-right tabular-nums">{d.match ? '' : d.load}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
