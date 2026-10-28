// Small SVG charts for the home page and the player space. Thin marks, recessive axes,
// a hover/focus tooltip on every mark, values always reachable as text elsewhere too.
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cx } from '../../../lib/util'

const C = { line: '#E6DDCB', axis: '#9AA39D', ink: '#1D2621', soft: '#66706A', forest: '#1F4D3A', terra: '#C5762F', sun: '#E3A92B', surface: '#FFFDF8' }

/** Tooltip placed in % of the chart box (x in viewBox units of width w, yPct in % of the height). */
function Tip({ x, yPct, children, w }: { x: number; yPct: number; children: ReactNode; w: number }) {
  const left = Math.max(w * 0.12, Math.min(x, w * 0.88))
  return (
    <div className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs shadow-lift"
      style={{ left: `${(left / w) * 100}%`, top: `calc(${yPct}% - 8px)` }}>
      {children}
    </div>
  )
}

/** Width of the chart box in px, so 1 viewBox unit = 1 px and text stays readable on phones. */
function useBoxWidth(fallback = 640) {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(fallback)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const set = () => { const v = Math.round(el.clientWidth); if (v > 0) setW(Math.max(260, v)) }
    set()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

/** A trend line with an end dot. `values` oldest first. */
export function Sparkline({ values, labels, width = 160, height = 44, color = C.forest, max = 100, ariaLabel }: { values: number[]; labels?: string[]; width?: number; height?: number; color?: string; max?: number; ariaLabel: string }) {
  const [hover, setHover] = useState<number | null>(null)
  if (!values.length) return null
  const pad = 6
  const n = values.length
  const x = (i: number) => (n === 1 ? width - pad : pad + (i * (width - pad * 2)) / (n - 1))
  const y = (v: number) => pad + (1 - Math.max(0, Math.min(max, v)) / max) * (height - pad * 2)
  const d = values.map((v, i) => `${i ? 'L' : 'M'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const area = n > 1 ? `${d} L ${x(n - 1).toFixed(1)} ${height - pad} L ${x(0).toFixed(1)} ${height - pad} Z` : ''
  const hi = hover ?? n - 1
  return (
    <div className="relative" style={{ width }}>
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={ariaLabel}
        onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
          const px = ((e.clientX - r.left) / r.width) * width
          let best = 0
          values.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i })
          setHover(best)
        }}>
        <line x1={pad} x2={width - pad} y1={height - pad} y2={height - pad} stroke={C.line} strokeWidth="1" />
        {area && <path d={area} fill={color} opacity="0.1" />}
        {n > 1 && <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
        {hover !== null && <line x1={x(hi)} x2={x(hi)} y1={pad} y2={height - pad} stroke={C.axis} strokeWidth="1" />}
        <circle cx={x(hi)} cy={y(values[hi])} r="4.5" fill={color} stroke={C.surface} strokeWidth="2" />
      </svg>
      {hover !== null && (
        <Tip x={x(hi)} yPct={(y(values[hi]) / height) * 100} w={width}>
          <span className="font-semibold text-ink">{values[hi]}</span>
          {labels?.[hi] && <span className="ml-1.5 text-ink-muted">{labels[hi]}</span>}
        </Tip>
      )}
    </div>
  )
}

export interface BarDatum { key: string; label: string; short: string; value: number; highlight?: boolean }

/** Columns that grow from one baseline, 4px rounded top, value on hover and in the label below. */
export function DayBars({ data, height = 150, unit, ariaLabel, max: maxIn }: { data: BarDatum[]; height?: number; unit: string; ariaLabel: string; max?: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const [box, W] = useBoxWidth()
  const top = 18, bottom = 22
  const max = Math.max(maxIn ?? 0, ...data.map((d) => d.value), 1)
  const nice = max <= 20 ? Math.ceil(max / 5) * 5 : max <= 50 ? Math.ceil(max / 10) * 10 : Math.ceil(max / 25) * 25
  const band = W / data.length
  const bw = Math.min(24, band * 0.62)
  const h = height - top - bottom
  const y = (v: number) => top + h - (v / nice) * h
  const r = 4
  return (
    <div className="relative" ref={box}>
      <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label={ariaLabel} onPointerLeave={() => setHover(null)}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1="0" x2={W} y1={y(nice * f)} y2={y(nice * f)} stroke={C.line} strokeWidth="1" />
            {f > 0 && <text x="0" y={y(nice * f) - 4} fontSize="11" fill={C.axis} style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.round(nice * f)}</text>}
          </g>
        ))}
        {data.map((d, i) => {
          const cx = band * i + band / 2
          const bh = Math.max(0, y(0) - y(d.value))
          const x0 = cx - bw / 2, y0 = y(d.value)
          const path = bh > r
            ? `M ${x0} ${y(0)} L ${x0} ${y0 + r} Q ${x0} ${y0} ${x0 + r} ${y0} L ${x0 + bw - r} ${y0} Q ${x0 + bw} ${y0} ${x0 + bw} ${y0 + r} L ${x0 + bw} ${y(0)} Z`
            : `M ${x0} ${y(0)} L ${x0} ${y(0) - bh} L ${x0 + bw} ${y(0) - bh} L ${x0 + bw} ${y(0)} Z`
          return (
            <g key={d.key} onPointerEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} aria-label={`${d.label}: ${d.value} ${unit}`} className="outline-none">
              <rect x={band * i} y={top} width={band} height={h + bottom} fill="transparent" />
              {d.value > 0 && <path d={path} fill={d.highlight ? C.terra : C.forest} opacity={hover === null || hover === i ? 1 : 0.55} />}
              <text x={cx} y={height - 6} fontSize="11" textAnchor="middle" fill={d.highlight ? C.ink : C.soft} fontWeight={d.highlight ? 700 : 500}>{d.short}</text>
            </g>
          )
        })}
      </svg>
      {hover !== null && (
        <Tip x={band * hover + band / 2} yPct={(y(data[hover].value) / height) * 100} w={W}>
          <span className="font-semibold text-ink">{data[hover].value} {unit}</span>
          <span className="ml-1.5 text-ink-muted">{data[hover].label}</span>
        </Tip>
      )}
    </div>
  )
}

/** A best-score history with the target as a reference line. */
export function HistoryLine({ points, target, unit, ariaLabel, targetLabel }: { points: { label: string; value: number }[]; target: number; unit: string; ariaLabel: string; targetLabel: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const [box, W] = useBoxWidth()
  const H = 170, top = 16, bottom = 22, left = 28, right = 14
  const max = Math.max(target * 1.25, ...points.map((p) => p.value), 1)
  const n = points.length
  const x = (i: number) => (n === 1 ? (left + W - right) / 2 : left + (i * (W - left - right)) / (n - 1))
  const y = (v: number) => top + (1 - v / max) * (H - top - bottom)
  const d = points.map((p, i) => `${i ? 'L' : 'M'} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ')
  const gid = useId().replace(/:/g, '')
  return (
    <div className="relative" ref={box}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={ariaLabel} onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
          const px = ((e.clientX - r.left) / r.width) * W
          let best = 0
          points.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i })
          setHover(best)
        }}>
        <defs><clipPath id={`c-${gid}`}><rect x="0" y="0" width={W} height={H - bottom} /></clipPath></defs>
        <line x1={left} x2={W - right} y1={y(0)} y2={y(0)} stroke={C.line} strokeWidth="1" />
        <line x1={left} x2={W - right} y1={y(target)} y2={y(target)} stroke={C.sun} strokeWidth="1.5" />
        <text x={W - right} y={y(target) - 5} fontSize="11" textAnchor="end" fill={C.soft} fontWeight="600">{targetLabel} {target}</text>
        <text x={left - 6} y={y(0) + 4} fontSize="11" textAnchor="end" fill={C.axis}>0</text>
        {n > 1 && <path d={`${d} L ${x(n - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`} fill={C.forest} opacity="0.08" clipPath={`url(#c-${gid})`} />}
        {n > 1 && <path d={d} fill="none" stroke={C.forest} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={top} y2={y(0)} stroke={C.axis} strokeWidth="1" />}
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.value)} r={i === n - 1 || i === hover ? 5 : 4} fill={p.value >= target ? C.terra : C.forest} stroke={C.surface} strokeWidth="2" />
        ))}
        {points.map((p, i) => (n <= 8 || i === 0 || i === n - 1) && (
          <text key={'l' + i} x={x(i)} y={H - 6} fontSize="11" textAnchor="middle" fill={C.soft}>{p.label}</text>
        ))}
      </svg>
      {hover !== null && (
        <Tip x={x(hover)} yPct={(y(points[hover].value) / H) * 100} w={W}>
          <span className="font-semibold text-ink">{points[hover].value} {unit}</span>
          <span className="ml-1.5 text-ink-muted">{points[hover].label}</span>
        </Tip>
      )}
    </div>
  )
}

/** Ten-axis radar of the competences. Series: me (forest) and optionally my coach (terra). */
export function SkillRadar({ axes, series, size = 300, className }: { axes: { key: string; label: string }[]; series: { name: string; color: string; values: Record<string, number | undefined> }[]; size?: number; className?: string }) {
  const cx = size / 2, cy = size / 2, R = size / 2 - 40
  const padX = 90 // room for the long competence names on the left and right
  const n = axes.length
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    return [cx + Math.cos(a) * R * (v / 4), cy + Math.sin(a) * R * (v / 4)] as const
  }
  return (
    <svg viewBox={`${-padX} 0 ${size + padX * 2} ${size}`} className={cx2('h-auto w-full', className)} role="img" aria-label={series.map((s) => s.name).join(', ')}>
      {[1, 2, 3, 4].map((lv) => (
        <polygon key={lv} points={axes.map((_, i) => pt(i, lv).join(',')).join(' ')} fill="none" stroke={C.line} strokeWidth="1" />
      ))}
      {axes.map((a, i) => {
        const [x2, y2] = pt(i, 4)
        const [lx, ly] = pt(i, 4.62)
        const anchor = Math.abs(lx - cx) < 8 ? 'middle' : lx > cx ? 'start' : 'end'
        const words = a.label.split(' ')
        const lines = words.length > 2 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [a.label]
        return (
          <g key={a.key}>
            <line x1={cx} y1={cy} x2={x2} y2={y2} stroke={C.line} strokeWidth="1" />
            <text x={lx} y={ly - (lines.length - 1) * 6.5} fontSize="12" textAnchor={anchor} fill={C.soft} fontWeight="600">
              {lines.map((l, j) => <tspan key={j} x={lx} dy={j ? 13 : 0}>{l}</tspan>)}
            </text>
          </g>
        )
      })}
      {series.map((s) => {
        const pts = axes.map((a, i) => pt(i, s.values[a.key] || 0))
        if (!axes.some((a) => s.values[a.key])) return null
        return (
          <g key={s.name}>
            <polygon points={pts.map((p) => p.join(',')).join(' ')} fill={s.color} fillOpacity="0.12" stroke={s.color} strokeWidth="2" strokeLinejoin="round" />
            {pts.map((p, i) => s.values[axes[i].key] ? <circle key={i} cx={p[0]} cy={p[1]} r="4" fill={s.color} stroke={C.surface} strokeWidth="2" /> : null)}
          </g>
        )
      })}
    </svg>
  )
}
const cx2 = cx

export function Legend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
      {items.map((i) => <span key={i.name} className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />{i.name}</span>)}
    </div>
  )
}

export function RingProgress({ value, max, size = 64, stroke = 6, color = C.forest, children, className }: { value: number; max: number; size?: number; stroke?: number; color?: string; children?: ReactNode; className?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const f = Math.max(0, Math.min(1, max ? value / max : 0))
  return (
    <div className={cx('relative inline-grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1EADB" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${c * f} ${c}`} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}
