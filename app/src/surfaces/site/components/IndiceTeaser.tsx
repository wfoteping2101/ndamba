import { useMemo, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useT } from '../../../i18n'
import { computeNjangi, fmtNjangi, njangiLabel, SUB_KEYS, type SubKey } from '../../../lib/njangi'
import type { EventCode, MatchEvent } from '../../../lib/types'
import { cx } from '../../../lib/util'

// Colours of the five sub-indices on a dark background.
export const SUB_COLOR: Record<SubKey, string> = {
  progression: '#3E9E6E', penetration: '#73B391', fixation: '#CBE5D6', reprise: '#F5B700', controle: '#F6F7F2',
}

// A realistic half of football for the Lionceaux (counts of tags), so the index starts near 65.
const BASE: Partial<Record<EventCode, number>> = {
  PASS_OK: 120, PASS_LOST: 22, PROG: 20, LINE: 12, FINAL3: 18, BOX: 7, FIX2: 4, SWITCH: 3, LOSS: 14, REGAIN5: 11, REGAIN: 9, SHOT: 6, SHOT_IN: 3,
}
const ACTIONS: EventCode[] = ['LINE', 'BOX', 'FIX2', 'REGAIN5', 'PASS_OK', 'LOSS']

function expand(counts: Partial<Record<EventCode, number>>): MatchEvent[] {
  const out: MatchEvent[] = []
  for (const [code, n] of Object.entries(counts)) {
    for (let i = 0; i < (n || 0); i++) out.push({ id: `${code}${i}`, matchId: 'demo', t: i, half: 2, code: code as EventCode, side: 'us', createdAt: '' })
  }
  return out
}

/* ---------- the gauge: a 240 degree arc made of the five sub-indices ---------- */

const C = 120, RAD = 94, START = 150, SWEEP = 240, GAP = 3.5
const pt = (a: number, r = RAD) => [C + r * Math.cos((a * Math.PI) / 180), C + r * Math.sin((a * Math.PI) / 180)]
const arcPath = (a0: number, a1: number) => {
  const [x0, y0] = pt(a0), [x1, y1] = pt(a1)
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${RAD} ${RAD} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
}

export function IndiceGauge({ sub, total, label, className }: { sub: Record<SubKey, number>; total: number; label: string; className?: string }) {
  const { t, lang } = useT('site')
  const shown = fmtNjangi(total, lang)
  const per = SWEEP / SUB_KEYS.length
  return (
    <svg viewBox="0 0 240 212" className={cx('block h-auto w-full', className)} role="img" aria-label={t('landing.live.gaugeLabel', { v: shown })}>
      {/* ticks every 10 points */}
      <g stroke="#F6F7F2" strokeOpacity=".22" strokeWidth="1.2">
        {Array.from({ length: 11 }, (_, i) => {
          const a = START + (SWEEP * i) / 10
          const [x0, y0] = pt(a, RAD + 13), [x1, y1] = pt(a, RAD + (i % 5 === 0 ? 20 : 17))
          return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} />
        })}
      </g>
      {SUB_KEYS.map((k, i) => {
        const a0 = START + per * i + GAP / 2, a1 = START + per * (i + 1) - GAP / 2
        const d = arcPath(a0, a1)
        const pct = Math.max(0.0001, Math.min(1, (sub[k] || 0) / 20)) * 100
        return (
          <g key={k}>
            <path d={d} stroke="#F6F7F2" strokeOpacity=".1" strokeWidth="14" fill="none" strokeLinecap="butt" />
            <path d={d} stroke={SUB_COLOR[k]} strokeWidth="14" fill="none" strokeLinecap="butt" pathLength={100}
              strokeDasharray={`${pct} 100`} className="motion-safe:transition-[stroke-dasharray] motion-safe:duration-500" />
          </g>
        )
      })}
      <text x={C} y={C + 10} textAnchor="middle" fontSize="56" fontWeight="780" fill="#F6F7F2" fontFamily="'Archivo Variable', Archivo, sans-serif" style={{ fontStretch: '116%' }} letterSpacing="-1.5">{shown}</text>
      <text x={C} y={C + 32} textAnchor="middle" fontSize="11.5" fill="#F6F7F2" fillOpacity=".6" fontFamily="'Archivo Variable', Archivo, sans-serif">{t('landing.live.outOf')}</text>
      <text x={C} y={C + 74} textAnchor="middle" fontSize="14" fontStyle="italic" fontWeight="650" fill="#FFD452" fontFamily="'Archivo Variable', Archivo, sans-serif">{label}</text>
    </svg>
  )
}

/* ---------- the teaser: tap an action, watch the index move ---------- */

export default function IndiceTeaser() {
  const { t, lang } = useT('site')
  const [extra, setExtra] = useState<EventCode[]>([])
  const res = useMemo(() => {
    const c: Partial<Record<EventCode, number>> = { ...BASE }
    for (const e of extra) c[e] = (c[e] || 0) + 1
    return computeNjangi(expand(c))
  }, [extra])
  const base = useMemo(() => computeNjangi(expand(BASE)).total, [])
  const delta = Math.round((res.total - base) * 10) / 10
  const last = extra[extra.length - 1]

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
      <div className="mx-auto w-full max-w-[340px]">
        <IndiceGauge sub={res.sub} total={res.total} label={njangiLabel(res.total, lang)} />
        <p className="mt-1 text-center text-xs text-cream/55">{t('landing.live.example')}</p>
      </div>

      <div>
        <ul className="space-y-3.5">
          {SUB_KEYS.map((k) => (
            <li key={k}>
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-semibold text-cream">{t(`landing.live.subs.${k}.label`)}</span>
                  <span className="ml-2 text-[13px] text-cream/55">{t(`landing.live.subs.${k}.hint`)}</span>
                </div>
                <span className="num shrink-0 font-display text-lg text-cream">{fmtNjangi(res.sub[k], lang)}<span className="text-xs text-cream/45"> / 20</span></span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full motion-safe:transition-all motion-safe:duration-500" style={{ width: `${(res.sub[k] / 20) * 100}%`, background: SUB_COLOR[k] }} />
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-8 rounded-card border border-white/10 bg-white/[0.04] p-4">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-cream">{t('landing.live.try')}</span>
            <span aria-live="polite" className={cx('text-xs tabular-nums', delta > 0 ? 'text-forest-300' : delta < 0 ? 'text-clay-300' : 'text-cream/50')}>
              {last ? <>{t('landing.live.last', { label: t(`common:events.${last}`) })}<span className="ml-2 font-semibold">{delta > 0 ? '+' : ''}{fmtNjangi(delta, lang)}</span></> : ''}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ACTIONS.map((code) => (
              <button key={code} type="button" onClick={() => setExtra((x) => [...x, code])}
                className={cx('min-h-[44px] rounded-control border px-3 py-2 text-left text-[13.5px] font-semibold transition-colors',
                  code === 'LOSS' ? 'border-clay-300/40 bg-clay-500/15 text-clay-100 hover:bg-clay-500/25' : 'border-white/15 bg-white/[0.06] text-cream hover:bg-white/[0.12]')}>
                {t(`common:events.${code}`)}
              </button>
            ))}
          </div>
          {extra.length > 0 && (
            <button type="button" onClick={() => setExtra([])} className="mt-2.5 inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-cream/60 hover:text-cream">
              <RotateCcw size={13} />{t('landing.live.reset')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
