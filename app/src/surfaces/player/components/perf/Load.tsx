// « Ma charge » and « Ma forme sur deux semaines »: the player compared with himself (chapter 29).
import { useT } from '../../../../i18n'
import { cx, fmtDate } from '../../../../lib/util'
import { DayBars, HistoryLine } from '../Charts'
import { FORM_KEYS, FORM_MAX, formBand, FORM_TONE, formScore, hasForm, loadOf, type PerfData } from './data'
import { Figure, PerfHead, fmtInt, fmtSigned } from './bits'

const BAND_TONE = { spike: 'text-clay-700 bg-clay-50', steady: 'text-forest-700 bg-forest-50', light: 'text-ink-soft bg-sand' } as const

export function LoadCard({ d, full = false }: { d: PerfData; full?: boolean }) {
  const { t, lang } = useT('player')
  const L = d.load
  const has = L.days.some((x) => x.load > 0) || L.prev.some((v) => v > 0)
  const bars = L.days.map((x) => ({ key: x.date, label: fmtDate(x.date, lang, { weekday: 'long', day: 'numeric', month: 'long' }), short: String(Number(x.date.slice(8, 10))), value: x.load, highlight: x.date === d.today }))
  const pct = L.delta !== null ? fmtSigned(L.delta * 100, lang) + (lang === 'fr' ? ' %' : '%') : null
  return (
    <section className="h-full rounded-[22px] border border-line bg-paper p-5 sm:p-6" aria-labelledby="load-h">
      <PerfHead id="load-h" eyebrow={t('perf.load.eyebrow')} title={t('perf.load.title')} hint={t('perf.load.hint')} />
      {!has ? (
        <p className="text-[14.5px] leading-relaxed text-ink-muted">{t('perf.load.empty')}</p>
      ) : (
        <>
          <dl className={cx('grid grid-cols-2 gap-x-4 gap-y-4', full && 'sm:grid-cols-3')}>
            <Figure label={t('perf.load.last7')} value={fmtInt(L.current, lang)} sub={t('perf.load.sessions', { count: L.sessions7 })} tone="forest" />
            <Figure label={t('perf.load.prevAvg')} value={L.prevAvg !== null ? fmtInt(L.prevAvg, lang) : null} sub={t('perf.load.uaShort')} />
            <div className={cx('col-span-2 min-w-0 border-l-2 border-line pl-3', full && 'sm:col-span-1')}>
              <dt className="truncate text-[12.5px] font-medium text-ink-muted">{t('perf.load.delta')}</dt>
              <dd className="mt-0.5 flex flex-wrap items-center gap-2">
                {pct ? <span className="font-display text-[24px] leading-tight tabular-nums text-ink">{pct}</span> : <span className="py-1 text-[15px] font-medium text-ink-faint">{t('perf.none')}</span>}
                {L.band && <span className={cx('inline-flex rounded-full px-2 py-0.5 text-[12px] font-semibold', BAND_TONE[L.band])}>{t(`perf.load.band.${L.band}`)}</span>}
              </dd>
            </div>
          </dl>
          {L.band === 'spike' && <p className="mt-3 text-[13.5px] font-medium text-clay-700">{t('perf.load.spikeHint')}</p>}
          <div className="mt-6">
            <div className="mb-1 text-[13px] font-semibold text-ink-soft">{t('perf.load.daily')}</div>
            <DayBars data={bars} unit={t('perf.load.uaShort')} height={full ? 160 : 130} ariaLabel={t('perf.load.dailyAria', { values: L.days.map((x) => x.load).join(', ') })} />
          </div>
          {full && (
            <div className="mt-6">
              <div className="mb-2 text-[13px] font-semibold text-ink-soft">{t('perf.load.weeks')}</div>
              <WeekBars weeks={L.weeks} />
            </div>
          )}
        </>
      )}
    </section>
  )
}

/** Four rolling weeks side by side: three before, then the last seven days. */
function WeekBars({ weeks }: { weeks: number[] }) {
  const { t, lang } = useT('player')
  const max = Math.max(1, ...weeks)
  const names = [t('perf.load.wk', { n: 3 }), t('perf.load.wk', { n: 2 }), t('perf.load.wk', { n: 1 }), t('perf.load.last7')]
  return (
    <ul className="grid grid-cols-4 gap-2">
      {weeks.map((v, i) => (
        <li key={i} className="min-w-0">
          <div className="flex h-20 items-end justify-center"><span className={cx('block w-full max-w-[56px] rounded-t-[4px]', i === 3 ? 'bg-forest-600' : 'bg-forest-300')} style={{ height: `${Math.max(3, (v / max) * 100)}%` }} /></div>
          <div className="mt-1 text-center text-[12px] font-semibold tabular-nums text-ink">{fmtInt(v, lang)}</div>
          <div className="truncate text-center text-[12px] text-ink-muted">{names[i]}</div>
        </li>
      ))}
    </ul>
  )
}

export function FormTrendCard({ d }: { d: PerfData }) {
  const { t, lang } = useT('player')
  const F = d.form
  const pts = F.series.filter((x) => x.score !== null).map((x) => ({ label: fmtDate(x.date, lang, { day: 'numeric', month: 'short' }), value: x.score as number }))
  const recent = [...d.logs].filter((l) => hasForm(l) || loadOf(l) > 0).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7)
  return (
    <section className="h-full rounded-[22px] border border-line bg-paper p-5 sm:p-6" aria-labelledby="ft-h">
      <PerfHead id="ft-h" eyebrow={t('perf.trend.eyebrow')} title={t('perf.trend.title')} hint={t('perf.trend.hint')} />
      {pts.length < 2 ? (
        <p className="text-[14.5px] leading-relaxed text-ink-muted">{t('perf.trend.empty')}</p>
      ) : (
        <HistoryLine points={pts} min={5} max={FORM_MAX} labelAt="start" plain target={Math.round(F.baseline ?? pts.reduce((a, p) => a + p.value, 0) / pts.length)} unit={`/ ${FORM_MAX}`}
          targetLabel={t('perf.trend.avg')} ariaLabel={t('perf.trend.aria', { values: pts.map((p) => p.value).join(', ') })} />
      )}
      {recent.length > 0 && (
        <ul className="mt-5 divide-y divide-line border-t border-line">
          {recent.map((l) => {
            const s = formScore(l)
            const band = s !== null ? formBand(s) : null
            const lowPoint = (w: typeof l) => {
              if (!hasForm(w)) return ''
              const lows = FORM_KEYS.filter((k) => (w[k] as number) <= 2)
              return lows.length ? t('perf.trend.low', { items: lows.map((k) => `${t(`perf.form.items.${k}.label`).toLowerCase()} ${w[k]}`).join(', ') }) : ''
            }
            return (
              <li key={l.id} className="flex items-center gap-3 py-2">
                <span className="w-24 shrink-0 text-[13px] text-ink-muted first-letter:uppercase">{fmtDate(l.date, lang, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                {s !== null && band ? <span className={cx('w-12 shrink-0 rounded-full px-2 py-0.5 text-center text-[12.5px] font-semibold tabular-nums', FORM_TONE[band].bg, FORM_TONE[band].text)}>{s}</span> : <span className="w-12 shrink-0" aria-hidden="true" />}
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-muted">{lowPoint(l)}</span>
                <span className="ml-auto shrink-0 text-right text-[13px] tabular-nums text-ink-soft">{loadOf(l) > 0 ? t('perf.trend.rowLoad', { rpe: l.rpe, n: fmtInt(loadOf(l), lang) }) : t('perf.trend.noLoad')}</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
