// Charts of the season studio: progression bars over the last matches, the comparison radar, the form guide.
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../../../../i18n'
import { cx } from '../../../../lib/util'
import { RADAR_KEYS, radarScale, type RadarKey, type RadarValues } from '../../../../lib/viz'
import { C, useWidth } from './pitch'

/* ------------------------------------------------------------------ progression bars */

export interface BarItem { id: string; label: string; tip: ReactNode; value: number | null; value2?: number | null; color?: string; href?: string }

/**
 * One measure over the last matches. single: one bar; nested: a total with its part inside (shots and on target);
 * diverging: for above the line, against below it (goals).
 */
export function BarSeries({ title, items, mode = 'single', format, legend, max }: {
  title: string; items: BarItem[]; mode?: 'single' | 'nested' | 'diverging'; format: (v: number) => string; legend?: ReactNode; max?: number
}) {
  const { t, lang } = useT('viz')
  const [box, width] = useWidth<HTMLDivElement>(480)
  const [hover, setHover] = useState<number | null>(null)
  const W = Math.max(260, width), L = 30, R = 4, top = 12, bottom = 22
  const h = mode === 'diverging' ? 54 : 110
  const H = top + h * (mode === 'diverging' ? 2 : 1) + bottom
  const base = top + h
  const vals = items.flatMap((i) => [i.value ?? 0, mode === 'diverging' ? i.value2 ?? 0 : 0])
  const top0 = max ?? Math.max(1, ...vals)
  const nice = top0 <= 1 ? 1 : top0 <= 5 ? Math.ceil(top0) : Math.ceil(top0 / 5) * 5
  const n = Math.max(1, items.length)
  const slot = (W - L - R) / n
  const bw = Math.max(6, Math.min(30, slot - 8))
  const y = (v: number) => (h * Math.max(0, v)) / nice
  const fmtAxis = (v: number) => (nice === 1 && max === 1 ? `${Math.round(v * 100)}` : (Math.round(v * 10) / 10).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US'))
  const rounded = (x: number, yTop: number, w: number, hh: number, down = false) => {
    if (hh <= 0) return ''
    const r = Math.min(4, hh, w / 2)
    return down
      ? `M ${x} ${yTop} V ${yTop + hh - r} Q ${x} ${yTop + hh} ${x + r} ${yTop + hh} H ${x + w - r} Q ${x + w} ${yTop + hh} ${x + w} ${yTop + hh - r} V ${yTop} Z`
      : `M ${x} ${yTop + hh} V ${yTop + r} Q ${x} ${yTop} ${x + r} ${yTop} H ${x + w - r} Q ${x + w} ${yTop} ${x + w} ${yTop + r} V ${yTop + hh} Z`
  }
  const hv = hover != null ? items[hover] : null
  return (
    <div className="rounded-card border border-line bg-paper p-4">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-[14.5px] font-semibold text-ink">{title}</h4>
        {legend && <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ink-soft">{legend}</div>}
      </div>
      <div ref={box} className="relative" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block h-auto w-full" role="img" aria-label={title}>
          {[0, nice / 2, nice].map((g) => (
            <g key={g}>
              <line x1={L} x2={W - R} y1={base - y(g)} y2={base - y(g)} stroke={g === 0 ? C.line : '#ECEFE8'} />
              <text x={L - 5} y={base - y(g) + 3.5} textAnchor="end" fontSize="10.5" fill={C.faint}>{fmtAxis(g)}</text>
            </g>
          ))}
          {mode === 'diverging' && <text x={L - 5} y={base + h} textAnchor="end" fontSize="10.5" fill={C.faint}>{fmtAxis(nice)}</text>}
          {items.map((it, i) => {
            const cx0 = L + slot * i + slot / 2
            const x0 = cx0 - bw / 2
            const on = hover === i
            return (
              <g key={it.id} opacity={hover != null && !on ? 0.55 : 1}>
                {it.value == null
                  ? <g><line x1={x0} x2={x0 + bw} y1={base - 1} y2={base - 1} stroke={C.faint} strokeWidth="2" strokeDasharray="3 2" /><text x={cx0} y={base - 6} textAnchor="middle" fontSize="9.5" fill={C.faint}>{t('season.nc')}</text></g>
                  : mode === 'nested'
                    ? <g><path d={rounded(x0, base - y(it.value), bw, y(it.value))} fill="#CBE5D6" /><path d={rounded(x0 + bw * 0.22, base - y(it.value2 ?? 0), bw * 0.56, y(it.value2 ?? 0))} fill={C.usDeep} /></g>
                    : <path d={rounded(x0, base - y(it.value), bw, y(it.value))} fill={it.color ?? C.us} />}
                {mode === 'diverging' && it.value2 != null && <path d={rounded(x0, base + 2, bw, Math.max(0, y(it.value2) - 2), true)} fill={C.loss} fillOpacity={0.85} />}
                <text x={cx0} y={H - 6} textAnchor="middle" fontSize="10.5" fill={on ? C.ink : C.muted}>{it.label}</text>
                <rect x={L + slot * i} y={0} width={slot} height={H} fill="transparent" onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />
              </g>
            )
          })}
        </svg>
        {hv && hover != null && (
          <div role="status" className="absolute top-0 z-10 w-max max-w-[220px] rounded-xl border border-line bg-paper px-3 py-2 text-[12.5px] leading-snug text-ink-soft shadow-lift"
            style={{ left: `${((L + slot * hover + slot / 2) / W) * 100}%`, transform: `translateX(${(L + slot * hover) / W > 0.55 ? 'calc(-100% - 8px)' : '8px'})` }}>
            {hv.tip}
            {hv.href && <Link to={hv.href} className="link mt-1 block text-[12px]">{t('season.openReport')}</Link>}
          </div>
        )}
      </div>
      <ul className="sr-only">{items.map((it) => <li key={it.id}>{it.label}: {it.value == null ? t('season.nc') : format(it.value)}{mode !== 'single' && it.value2 != null ? `, ${format(it.value2)}` : ''}</li>)}</ul>
    </div>
  )
}

/* ------------------------------------------------------------------ radar */

export function Radar({ a, b, aLabel, bLabel, format }: { a: RadarValues; b: RadarValues; aLabel: string; bLabel: string; format: (k: RadarKey, v: number | null) => string }) {
  const { t } = useT('viz')
  const S = 340, cx0 = S / 2, cy0 = 150, R = 104
  const ang = (i: number) => (-90 + (360 / RADAR_KEYS.length) * i) * (Math.PI / 180)
  const pt = (i: number, f: number) => [cx0 + Math.cos(ang(i)) * R * f, cy0 + Math.sin(ang(i)) * R * f] as const
  const scaled = (vals: RadarValues) => RADAR_KEYS.map((k) => radarScale(k, a[k], b[k])(vals[k]))
  const sa = scaled(a), sb = scaled(b)
  const poly = (s: (number | null)[]) => s.map((f, i) => (f == null ? null : pt(i, Math.max(0.02, f)))).filter((p): p is readonly [number, number] => !!p).map((p) => p.join(',')).join(' ')
  return (
    <div>
      <svg viewBox={`-80 0 ${S + 160} 300`} className="mx-auto block h-auto w-full max-w-[520px]" role="img" aria-label={t('season.radarAria', { a: aLabel, b: bLabel })}>
        {[0.25, 0.5, 0.75, 1].map((f) => <polygon key={f} points={RADAR_KEYS.map((_, i) => pt(i, f).join(',')).join(' ')} fill="none" stroke={f === 1 ? C.line : '#ECEFE8'} />)}
        {RADAR_KEYS.map((k, i) => {
          const [x, y] = pt(i, 1)
          const [lx, ly] = pt(i, 1.2)
          const missing = sb[i] == null || sa[i] == null
          return (
            <g key={k}>
              <line x1={cx0} y1={cy0} x2={x} y2={y} stroke={C.line} strokeDasharray={missing ? '3 3' : undefined} />
              <text x={lx} y={ly} dy={ly > cy0 + 10 ? 10 : ly < cy0 - 10 ? -2 : 4} textAnchor={Math.abs(lx - cx0) < 10 ? 'middle' : lx > cx0 ? 'start' : 'end'} fontSize="12.5" fontWeight={600} fill={C.ink}>{t(`season.axis.${k}`)}</text>
            </g>
          )
        })}
        {poly(sb) && <polygon points={poly(sb)} fill={C.them} fillOpacity={0.08} stroke={C.them} strokeWidth="2" strokeDasharray="5 3" strokeLinejoin="round" />}
        {poly(sa) && <polygon points={poly(sa)} fill={C.us} fillOpacity={0.22} stroke={C.usDeep} strokeWidth="2.2" strokeLinejoin="round" />}
        {sa.map((f, i) => f != null && <circle key={`a${i}`} cx={pt(i, Math.max(0.02, f))[0]} cy={pt(i, Math.max(0.02, f))[1]} r="3.6" fill={C.usDeep} stroke="#fff" strokeWidth="1.5" />)}
        {sb.map((f, i) => f != null && <rect key={`b${i}`} x={pt(i, Math.max(0.02, f))[0] - 3.2} y={pt(i, Math.max(0.02, f))[1] - 3.2} width="6.4" height="6.4" rx="1" fill={C.them} stroke="#fff" strokeWidth="1.3" />)}
      </svg>
      <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[12.5px] text-ink-soft">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: C.usDeep }} />{aLabel}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: C.them }} />{bLabel}</span>
      </div>
      <table className="table-n mt-3">
        <thead><tr><th>{t('season.measure')}</th><th className="num">{aLabel}</th><th className="num">{bLabel}</th></tr></thead>
        <tbody>
          {RADAR_KEYS.map((k) => (
            <tr key={k}><td className="text-ink-soft">{t(`season.axis.${k}`)}</td><td className="num font-semibold">{format(k, a[k])}</td><td className={cx('num', b[k] == null ? 'text-ink-faint' : 'text-ink-soft')}>{format(k, b[k])}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------------------------------------------ form guide */

export function FormGuide({ items }: { items: { id: string; outcome: 'W' | 'D' | 'L'; score: string; opp: string; href: string }[] }) {
  const { t } = useT('viz')
  if (!items.length) return null
  return (
    <ol className="flex flex-wrap gap-2" aria-label={t('season.form')}>
      {items.map((m) => (
        <li key={m.id}>
          <Link to={m.href} title={`${m.score}, ${m.opp}`} className="group flex flex-col items-center gap-1">
            <span className={cx('grid h-10 w-10 place-items-center rounded-full text-[14px] font-bold', m.outcome === 'W' ? 'bg-forest-600 text-white' : m.outcome === 'L' ? 'bg-clay-500 text-white' : 'bg-sand text-ink')}>{t(`season.res.${m.outcome}`)}</span>
            <span className="text-[11.5px] tabular-nums text-ink-muted group-hover:text-ink">{m.score}</span>
            <span className="sr-only">{m.opp}</span>
          </Link>
        </li>
      ))}
    </ol>
  )
}
