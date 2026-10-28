// SVG charts of the analysis surface: the Indice gauge, sub-index bars, the trend line and the match timeline.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useT } from '../../../i18n'
import { cx } from '../../../lib/util'
import { NJANGI_BANDS, SUB_KEYS, fmtNjangi, njangiBand, njangiLabel, subLevel, type NjangiResult, type SubKey } from '../../../lib/njangi'
import type { MatchEvent } from '../../../lib/types'
import { halfLength, halfOffset } from './codes'

/* ------------------------------------------------------------------ sizing */

/** Width of an element in CSS pixels, so SVG text keeps its real size on phones. */
function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null)
  const [w, setW] = useState(fallback)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const set = () => { const v = Math.round(el.getBoundingClientRect().width); if (v > 0) setW(v) }
    set()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

/* ------------------------------------------------------------------ gauge */

const GAUGE_SWEEP = 240
const polar = (cx0: number, cy0: number, r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180
  return [cx0 + r * Math.cos(a), cy0 + r * Math.sin(a)] as const
}
const arc = (cx0: number, cy0: number, r: number, a0: number, a1: number) => {
  const [x0, y0] = polar(cx0, cy0, r, a0)
  const [x1, y1] = polar(cx0, cy0, r, a1)
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
}

/** The large Indice Njangi gauge (0 to 100), with the band thresholds of njangiLabel. */
export function NjangiGauge({ total, size = 240, dark = false, showLabel = true }: { total: number; size?: number; dark?: boolean; showLabel?: boolean }) {
  const { t, lang } = useT('analysis')
  const v = Math.max(0, Math.min(100, total))
  const start = -GAUGE_SWEEP / 2
  const end = start + (GAUGE_SWEEP * v) / 100
  const c = 100, r = 82
  const band = njangiBand(v)
  const fill = band >= 3 ? '#0B5D3B' : band === 2 ? '#13804F' : band === 1 ? '#BF5A2E' : '#D7263D'
  return (
    <figure className="flex flex-col items-center" aria-label={`Indice Njangi ${fmtNjangi(v, lang)} / 100, ${njangiLabel(v, lang)}`}>
      <svg viewBox="0 0 200 178" width={size} height={size * 0.89} role="img" aria-hidden="true">
        <path d={arc(c, c, r, start, start + GAUGE_SWEEP)} fill="none" stroke={dark ? 'rgba(255,255,255,.12)' : '#ECEFE8'} strokeWidth="16" strokeLinecap="round" />
        {v > 0 && <path d={arc(c, c, r, start, Math.max(start + 0.5, end))} fill="none" stroke={dark ? '#F5B700' : fill} strokeWidth="16" strokeLinecap="round" style={{ transition: 'all .5s ease' }} />}
        {NJANGI_BANDS.slice(1, -1).map((b) => {
          const a = start + (GAUGE_SWEEP * b) / 100
          const [x0, y0] = polar(c, c, r - 12, a)
          const [x1, y1] = polar(c, c, r - 19, a)
          return <line key={b} x1={x0} y1={y0} x2={x1} y2={y1} stroke={dark ? 'rgba(255,255,255,.35)' : '#94A198'} strokeWidth="1.5" strokeLinecap="round" />
        })}
        {[0, 100].map((b) => {
          const [lx, ly] = polar(c, c, r - 30, start + (GAUGE_SWEEP * b) / 100)
          return <text key={b} x={lx} y={ly + 4} textAnchor="middle" fontSize="10" fill={dark ? 'rgba(251,247,238,.55)' : '#94A198'} fontFamily="Inter, sans-serif">{b}</text>
        })}
        <text x={c} y={c + 8} textAnchor="middle" fontSize="48" fontWeight="650" fill={dark ? '#F6F7F2' : '#12211A'} fontFamily="Inter, sans-serif" style={{ letterSpacing: '-0.03em' }}>{fmtNjangi(v, lang)}</text>
        <text x={c} y={c + 30} textAnchor="middle" fontSize="11" fill={dark ? 'rgba(251,247,238,.6)' : '#5D6C63'} fontFamily="Inter, sans-serif">{t('report.outOf100')}</text>
      </svg>
      {showLabel && <figcaption className={cx('-mt-3 text-center font-display text-lg font-semibold', dark ? 'text-cream' : 'text-ink')}>{njangiLabel(v, lang)}</figcaption>}
    </figure>
  )
}

/* ------------------------------------------------------------------ sub-index bars */

const levelTone = ['text-clay-600', 'text-terra-600', 'text-forest-600']

/** One sub-index: name, value out of 20, bar. */
export function SubBar({ k, value, prev, compact = false, dark = false }: { k: SubKey; value: number; prev?: number; compact?: boolean; dark?: boolean }) {
  const { t, lang } = useT('analysis')
  const pct = Math.max(0, Math.min(100, (value / 20) * 100))
  const lvl = subLevel(value)
  const fmt = (n: number) => fmtNjangi(n, lang)
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className={cx('font-semibold', compact ? 'text-[12px]' : 'text-[15px]', dark ? 'text-cream/90' : 'text-ink')}>{t(`sub.${k}.name`)}</span>
        <span className={cx('tabular-nums', compact ? 'text-[12px]' : 'text-sm', dark ? 'text-cream' : 'text-ink')}>
          <b className="font-semibold">{fmt(value)}</b><span className={dark ? 'text-cream/50' : 'text-ink-faint'}> / 20</span>
          {!compact && <span className={cx('ml-2 text-xs font-semibold', dark ? 'text-sun-300' : levelTone[lvl])}>{t(`level.${lvl}`)}</span>}
        </span>
      </div>
      <div className={cx('relative w-full overflow-hidden rounded-full', compact ? 'h-1.5' : 'h-2.5', dark ? 'bg-white/10' : 'bg-sand')}>
        <div className={cx('h-full rounded-full transition-all duration-500', dark ? 'bg-sun-500' : lvl === 0 ? 'bg-clay-500' : lvl === 1 ? 'bg-terra-500' : 'bg-forest-600')} style={{ width: `${pct}%` }} />
        {prev != null && <div className="absolute top-0 h-full w-0.5 bg-ink/50" style={{ left: `calc(${Math.max(0, Math.min(100, (prev / 20) * 100))}% - 1px)` }} title="prev" />}
      </div>
    </div>
  )
}

export function SubBars({ result, compact = false, dark = false, className }: { result: NjangiResult; compact?: boolean; dark?: boolean; className?: string }) {
  return <div className={cx(compact ? 'space-y-1.5' : 'space-y-3', className)}>{SUB_KEYS.map((k) => <SubBar key={k} k={k} value={result.sub[k]} compact={compact} dark={dark} />)}</div>
}

/* ------------------------------------------------------------------ tooltip helper */

function Tip({ x, y, w, children }: { x: number; y: number; w: number; children: ReactNode }) {
  // x, y in percent of the chart box
  const left = x > 60 ? undefined : `${x}%`
  const right = x > 60 ? `${100 - x}%` : undefined
  return (
    <div className="pointer-events-none absolute z-10 rounded-xl border border-line bg-paper px-3 py-2 text-xs shadow-lift" style={{ left, right, top: `${y}%`, width: w, transform: 'translateY(-100%)' }}>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ trend */

export interface TrendPoint { id: string; label: string; sub: string; total: number }

/** Indice Njangi across matches (one series: no legend box). */
export function TrendChart({ points, onOpen }: { points: TrendPoint[]; onOpen?: (id: string) => void }) {
  const { t, lang } = useT('analysis')
  const [hover, setHover] = useState<number | null>(null)
  const [box, width] = useWidth<HTMLDivElement>(640)
  const W = Math.max(280, width), H = W < 480 ? 200 : 230, L = 34, R = 18, Tp = 22, B = 34
  const n = points.length
  const x = (i: number) => (n === 1 ? (L + W - R) / 2 : L + ((W - L - R) * i) / (n - 1))
  const y = (v: number) => Tp + (H - Tp - B) * (1 - v / 100)
  const path = points.map((p, i) => `${i ? 'L' : 'M'} ${x(i).toFixed(1)} ${y(p.total).toFixed(1)}`).join(' ')
  const area = n > 1 ? `${path} L ${x(n - 1)} ${y(0)} L ${x(0)} ${y(0)} Z` : ''
  const showEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((W - L - R) / 70))))
  return (
    <div ref={box} className="relative" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block h-auto w-full" role="img" aria-label={t('hub.trend')}>
        {[0, 35, 50, 65, 80, 100].map((g) => (
          <g key={g}>
            <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke={g === 0 ? '#DCE2D8' : '#ECEFE8'} strokeWidth="1" />
            <text x={L - 8} y={y(g) + 3.5} textAnchor="end" fontSize="11" fill="#94A198" style={{ fontVariantNumeric: 'tabular-nums' }}>{g}</text>
          </g>
        ))}
        {area && <path d={area} fill="#0B5D3B" opacity="0.08" />}
        {n > 1 && <path d={path} fill="none" stroke="#0B5D3B" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={Tp} y2={y(0)} stroke="#94A198" strokeWidth="1" />}
        {points.map((p, i) => (
          <g key={p.id}>
            <circle cx={x(i)} cy={y(p.total)} r={hover === i ? 6 : 4.5} fill="#0B5D3B" stroke="#FFFFFF" strokeWidth="2" />
            {(i === n - 1 || i === hover) && <text x={x(i)} y={y(p.total) - 11} textAnchor="middle" fontSize="12" fontWeight="600" fill="#12211A">{fmtNjangi(p.total, lang)}</text>}
            {(i % showEvery === 0 || i === n - 1) && <text x={x(i)} y={H - 12} textAnchor="middle" fontSize="11" fill="#5D6C63">{p.label}</text>}
            <rect x={x(i) - Math.max(14, (W - L - R) / Math.max(1, n) / 2)} y={Tp} width={Math.max(28, (W - L - R) / Math.max(1, n))} height={H - Tp - B + 10} fill="transparent"
              onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} onClick={() => onOpen?.(p.id)} style={{ cursor: onOpen ? 'pointer' : 'default' }}
              tabIndex={onOpen ? 0 : -1} role={onOpen ? 'button' : undefined} aria-label={`${p.sub}: ${fmtNjangi(p.total, lang)}`} onKeyDown={(e) => { if (e.key === 'Enter') onOpen?.(p.id) }} />
          </g>
        ))}
      </svg>
      {hover != null && points[hover] && (
        <Tip x={(x(hover) / W) * 100} y={(y(points[hover].total) / H) * 100 - 4} w={200}>
          <div className="font-semibold text-ink">{points[hover].sub}</div>
          <div className="text-ink-muted">{points[hover].label}</div>
          <div className="mt-1 flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-forest-600" /><span className="text-ink">{t('chart.value')} <b className="tabular-nums">{fmtNjangi(points[hover].total, lang)}</b></span></div>
          <div className="text-ink-muted">{njangiLabel(points[hover].total, lang)}</div>
        </Tip>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ match timeline */

const ON_BALL = new Set(['PASS_OK', 'PROG', 'LINE', 'FINAL3', 'BOX', 'FIX2', 'SWITCH', 'SHOT', 'SHOT_IN'])
const COL_ACTIONS = '#13804F'
const COL_REGAIN = '#73B391'
const COL_LOSS = '#D7263D'

interface Bucket { half: 1 | 2 | 3 | 4; i: number; a: number; b: number; actions: number; losses: number; regains: number }

export function buildBuckets(events: MatchEvent[], halfMinutes: number): Bucket[] {
  const halves = ([1, 2, 3, 4] as const).filter((h) => h <= 2 || events.some((e) => e.half === h))
  const out: Bucket[] = []
  for (const h of halves) {
    const len = halfLength(h, halfMinutes) * 60
    const maxT = Math.max(len, ...events.filter((e) => e.half === h).map((e) => e.t + 1))
    const count = Math.max(1, Math.ceil(maxT / 300))
    const off = halfOffset(h, halfMinutes)
    for (let i = 0; i < count; i++) out.push({ half: h, i, a: off + i * 5, b: off + Math.min((i + 1) * 5, Math.ceil(maxT / 60)), actions: 0, losses: 0, regains: 0 })
  }
  for (const e of events) {
    if (e.side !== 'us') continue
    const bk = out.find((b) => b.half === e.half && b.i === Math.floor(e.t / 300)) ?? out.filter((b) => b.half === e.half).slice(-1)[0]
    if (!bk) continue
    if (ON_BALL.has(e.code)) bk.actions++
    else if (e.code === 'LOSS' || e.code === 'PASS_LOST') bk.losses++
    else if (e.code === 'REGAIN' || e.code === 'REGAIN5') bk.regains++
  }
  return out
}

/** Events per 5-minute bucket (our actions; losses below the line, regains above), goals marked. */
export function TimelineChart({ events, halfMinutes }: { events: MatchEvent[]; halfMinutes: number }) {
  const { t } = useT('analysis')
  const [hover, setHover] = useState<number | null>(null)
  const [table, setTable] = useState(false)
  const buckets = useMemo(() => buildBuckets(events, halfMinutes), [events, halfMinutes])
  const goals = events.filter((e) => e.code === 'GOAL')
  const [box, width] = useWidth<HTMLDivElement>(720)
  const W = Math.max(300, width), L = 30, R = 6, GAP = W < 500 ? 8 : 14
  const top = 16, h1 = W < 500 ? 100 : 120, mid = 22, h2 = W < 500 ? 38 : 46, bottom = 24
  const H = top + h1 + mid + h2 * 2 + bottom
  const halvesUsed = [...new Set(buckets.map((b) => b.half))]
  const usable = W - L - R - GAP * (halvesUsed.length - 1)
  const bw = usable / Math.max(1, buckets.length)
  const xOf = (idx: number) => L + idx * bw + GAP * halvesUsed.indexOf(buckets[idx].half)
  const maxA = Math.max(4, ...buckets.map((b) => b.actions))
  const maxLR = Math.max(2, ...buckets.map((b) => Math.max(b.losses, b.regains)))
  const niceA = Math.ceil(maxA / 10) * 10
  const yA = (v: number) => top + h1 * (1 - v / niceA)
  const base2 = top + h1 + mid + h2
  const yLR = (v: number) => (h2 * v) / maxLR
  const barW = Math.max(3, Math.min(24, bw - 4))
  const barW2 = Math.max(3, Math.min(18, bw - 6))
  const labelEvery = bw >= 34 ? 1 : bw >= 17 ? 2 : 3
  // goal x: interpolate inside the half
  const goalX = (e: MatchEvent) => {
    const idxs = buckets.map((b, i) => (b.half === e.half ? i : -1)).filter((i) => i >= 0)
    if (!idxs.length) return null
    const first = idxs[0], last = idxs[idxs.length - 1]
    const span = (last - first + 1) * 300
    const frac = Math.min(1, e.t / span)
    return xOf(first) + frac * (last - first + 1) * bw
  }
  const roundedTop = (x0: number, y0: number, w: number, h: number) => {
    if (h <= 0) return ''
    const r = Math.min(4, h, w / 2)
    return `M ${x0} ${y0 + h} V ${y0 + r} Q ${x0} ${y0} ${x0 + r} ${y0} H ${x0 + w - r} Q ${x0 + w} ${y0} ${x0 + w} ${y0 + r} V ${y0 + h} Z`
  }
  const roundedBottom = (x0: number, y0: number, w: number, h: number) => {
    if (h <= 0) return ''
    const r = Math.min(4, h, w / 2)
    return `M ${x0} ${y0} V ${y0 + h - r} Q ${x0} ${y0 + h} ${x0 + r} ${y0 + h} H ${x0 + w - r} Q ${x0 + w} ${y0 + h} ${x0 + w} ${y0 + h - r} V ${y0} Z`
  }
  const hb = hover != null ? buckets[hover] : null
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-soft">
        <Legend color={COL_ACTIONS}>{t('report.series.actions')}</Legend>
        <Legend color={COL_REGAIN}>{t('report.series.regains')}</Legend>
        <Legend color={COL_LOSS}>{t('report.series.losses')}</Legend>
        <span className="inline-flex items-center gap-1.5"><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4.5" fill="#F5B700" stroke="#12211A" strokeWidth="1" /></svg>{t('report.series.goalUs')}</span>
        <span className="inline-flex items-center gap-1.5"><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="#FFFFFF" stroke="#D7263D" strokeWidth="2" /></svg>{t('report.series.goalThem')}</span>
        <button type="button" className="link ml-auto no-print" onClick={() => setTable((v) => !v)}>{t('chart.table')}</button>
      </div>
      <div ref={box} className="relative" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block h-auto w-full" role="img" aria-label={t('report.timeline')}>
          {/* panel 1 grid */}
          {[0, niceA / 2, niceA].map((g) => (
            <g key={g}>
              <line x1={L} x2={W - R} y1={yA(g)} y2={yA(g)} stroke={g === 0 ? '#DCE2D8' : '#ECEFE8'} strokeWidth="1" />
              <text x={L - 6} y={yA(g) + 3.5} textAnchor="end" fontSize="11" fill="#94A198">{g}</text>
            </g>
          ))}
          {/* panel 2 baseline */}
          <line x1={L} x2={W - R} y1={base2} y2={base2} stroke="#DCE2D8" strokeWidth="1" />
          <text x={L - 6} y={base2 - h2 + 8} textAnchor="end" fontSize="11" fill="#94A198">{maxLR}</text>
          <text x={L - 6} y={base2 + h2} textAnchor="end" fontSize="11" fill="#94A198">{maxLR}</text>
          {hover != null && <rect x={xOf(hover)} y={top - 6} width={bw} height={H - top - bottom + 10} fill="#ECEFE8" opacity="0.6" rx="6" />}
          {buckets.map((b, i) => {
            const x0 = xOf(i)
            const cxm = x0 + bw / 2
            return (
              <g key={`${b.half}-${b.i}`}>
                <path d={roundedTop(cxm - barW / 2, yA(b.actions), barW, yA(0) - yA(b.actions))} fill={COL_ACTIONS} />
                <path d={roundedTop(cxm - barW2 / 2, base2 - yLR(b.regains), barW2, yLR(b.regains))} fill={COL_REGAIN} />
                <path d={roundedBottom(cxm - barW2 / 2, base2 + 2, barW2, Math.max(0, yLR(b.losses) - 2))} fill={COL_LOSS} />
                {b.i % labelEvery === 0 && <text x={x0 + 2} y={H - 8} fontSize="11" fill="#5D6C63">{b.a}'</text>}
              </g>
            )
          })}
          {/* half separators */}
          {halvesUsed.slice(1).map((h) => {
            const idx = buckets.findIndex((b) => b.half === h)
            const xs = xOf(idx) - GAP / 2
            return <g key={h}><line x1={xs} x2={xs} y1={top - 8} y2={H - bottom + 4} stroke="#DCE2D8" strokeWidth="1" /></g>
          })}
          {/* goals */}
          {goals.map((g) => {
            const gx = goalX(g)
            if (gx == null) return null
            return (
              <g key={g.id}>
                <line x1={gx} x2={gx} y1={top} y2={base2 + h2} stroke={g.side === 'us' ? '#D29C00' : '#D7263D'} strokeWidth="1" />
                {g.side === 'us'
                  ? <circle cx={gx} cy={top - 4} r="6" fill="#F5B700" stroke="#12211A" strokeWidth="1" />
                  : <circle cx={gx} cy={top - 4} r="5.5" fill="#FFFFFF" stroke="#D7263D" strokeWidth="2.5" />}
              </g>
            )
          })}
          {/* hit targets */}
          {buckets.map((b, i) => (
            <rect key={`h${i}`} x={xOf(i)} y={0} width={bw} height={H} fill="transparent" onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />
          ))}
        </svg>
        {hb && hover != null && (
          <Tip x={((xOf(hover) + bw / 2) / W) * 100} y={14} w={190}>
            <div className="font-semibold text-ink">{t('chart.bucket', { a: hb.a, b: hb.b })}</div>
            <TipRow color={COL_ACTIONS} label={t('report.series.actions')} v={hb.actions} />
            <TipRow color={COL_REGAIN} label={t('report.series.regains')} v={hb.regains} />
            <TipRow color={COL_LOSS} label={t('report.series.losses')} v={hb.losses} />
          </Tip>
        )}
      </div>
      {table && (
        <div className="mt-3 max-h-72 overflow-auto rounded-xl border border-line">
          <table className="table-n">
            <thead><tr><th>{t('chart.minute')}</th><th className="text-right">{t('report.series.actions')}</th><th className="text-right">{t('report.series.regains')}</th><th className="text-right">{t('report.series.losses')}</th></tr></thead>
            <tbody>{buckets.map((b) => <tr key={`${b.half}-${b.i}`}><td>{t('chart.bucket', { a: b.a, b: b.b })}</td><td className="text-right tabular-nums">{b.actions}</td><td className="text-right tabular-nums">{b.regains}</td><td className="text-right tabular-nums">{b.losses}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Legend({ color, children }: { color: string; children: ReactNode }) {
  return <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />{children}</span>
}
function TipRow({ color, label, v }: { color: string; label: string; v: number }) {
  return <div className="mt-1 flex items-center justify-between gap-3"><span className="inline-flex items-center gap-1.5 text-ink-soft"><span className="inline-block h-2 w-2 rounded-[2px]" style={{ background: color }} />{label}</span><b className="tabular-nums text-ink">{v}</b></div>
}

/* ------------------------------------------------------------------ comparison */

/** Previous (gray) v current (green) for each sub-index. */
export function CompareBars({ cur, prev }: { cur: NjangiResult; prev: NjangiResult }) {
  const { t, lang } = useT('analysis')
  const fmt = (n: number) => fmtNjangi(n, lang)
  return (
    <div className="space-y-3">
      {SUB_KEYS.map((k) => {
        const d = Math.round((cur.sub[k] - prev.sub[k]) * 10) / 10
        return (
          <div key={k}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="font-semibold text-ink">{t(`sub.${k}.name`)}</span>
              <span className="tabular-nums text-ink-muted">{fmt(prev.sub[k])} <span className="text-ink-faint">{'>'}</span> <b className="text-ink">{fmt(cur.sub[k])}</b> <span className={cx('ml-1 font-semibold', d > 0 ? 'text-forest-600' : d < 0 ? 'text-clay-600' : 'text-ink-faint')}>{d > 0 ? '+' : ''}{fmt(d)}</span></span>
            </div>
            <div className="space-y-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-sand"><div className="h-full rounded-full bg-ink-faint" style={{ width: `${(prev.sub[k] / 20) * 100}%` }} /></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-sand"><div className="h-full rounded-full bg-forest-600" style={{ width: `${(cur.sub[k] / 20) * 100}%` }} /></div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ mini dial */

const dialColor = (v: number) => ['#D7263D', '#BF5A2E', '#F5B700', '#13804F', '#0B5D3B'][njangiBand(v)]

/** The Indice as a small ring, for lists. */
export function MiniDial({ value, size = 48 }: { value: number; size?: number }) {
  const { lang } = useT('analysis')
  const r = 20, c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value)) / 100
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`Indice Njangi ${fmtNjangi(value, lang)} / 100, ${njangiLabel(value, lang)}`}>
      <svg viewBox="0 0 48 48" width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#ECEFE8" strokeWidth="5" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={dialColor(value)} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} />
      </svg>
      <span className="absolute font-sans font-semibold tabular-nums text-ink" style={{ fontSize: Math.round(size * 0.3) }}>{Math.round(value)}</span>
    </span>
  )
}
