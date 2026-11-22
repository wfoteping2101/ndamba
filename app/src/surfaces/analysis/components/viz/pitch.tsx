// The pitch every map is drawn on: horizontal, our attack from left to right, metres in decimetres
// (1050 by 680 units). Children get k, the number of units in one CSS pixel, so marks and text keep
// their real size on a phone and on a wide screen.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { useT } from '../../../../i18n'
import { cx } from '../../../../lib/util'
import type { Grid } from '../../../../lib/viz'

export const PW = 1050, PH = 680, PAD = 16
export const X = (x: number) => (x / 100) * PW
export const Y = (y: number) => (y / 100) * PH

/** Colours of the maps (DESIGN.md tokens). Us: pitch green. Them: ink, drawn as squares. Goals: the gold star. Losses: kola red. */
export const C = {
  us: '#13804F', usDeep: '#0B5D3B', usSoft: '#73B391', them: '#34443B', themSoft: '#94A198', goal: '#F5B700', loss: '#D7263D',
  ink: '#12211A', muted: '#5D6C63', faint: '#94A198', line: '#DCE2D8', grass: '#EEF3EA', stripe: '#E7EEE2', chalk: '#B4C4B7', paper: '#FFFFFF',
}

/** Width of an element in CSS pixels. */
export function useWidth<T extends HTMLElement>(fallback: number) {
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

export interface PitchProps {
  children?: (k: number) => ReactNode
  /** dashed lines of the thirds */
  thirds?: boolean
  /** a small pitch for player cards (no caption, fewer details) */
  mini?: boolean
  label: string
  /** an HTML layer over the pitch (tooltips), positioned in percent */
  overlay?: ReactNode
  caption?: boolean
  className?: string
  onLeave?: () => void
}

export function PitchMap({ children, thirds = false, mini = false, label, overlay, caption = !mini, className, onLeave }: PitchProps) {
  const { t } = useT('viz')
  const [box, w] = useWidth<HTMLDivElement>(mini ? 160 : 640)
  const VW = PW + PAD * 2, VH = PH + PAD * 2
  const k = VW / Math.max(120, w)
  const sw = mini ? 1 : 1.3
  const line = { fill: 'none', stroke: C.chalk, strokeWidth: sw, vectorEffect: 'non-scaling-stroke' as const }
  const boxH = 403.2, sixH = 183.2, goalH = 73.2
  return (
    <figure className={cx('m-0', className)}>
      {caption && (
        <figcaption className="mb-1.5 flex items-center justify-between gap-2 text-[12px] text-ink-muted">
          <span>{t('pitch.ourGoal')}</span>
          <span className="inline-flex items-center gap-1 font-semibold text-forest-700">{t('pitch.attack')}<ArrowRight size={13} strokeWidth={2} aria-hidden="true" /></span>
          <span>{t('pitch.theirGoal')}</span>
        </figcaption>
      )}
      <div ref={box} className="relative" onMouseLeave={onLeave}>
        <svg viewBox={`${-PAD} ${-PAD} ${VW} ${VH}`} className="block h-auto w-full select-none" role="img" aria-label={label}>
          <rect x={-PAD} y={-PAD} width={VW} height={VH} rx={mini ? 18 : 26} fill={C.grass} />
          {!mini && Array.from({ length: 12 }, (_, i) => i % 2 === 1 && <rect key={i} x={(i * PW) / 12} y={0} width={PW / 12} height={PH} fill={C.stripe} />)}
          <rect x={0} y={0} width={PW} height={PH} {...line} />
          <line x1={PW / 2} y1={0} x2={PW / 2} y2={PH} {...line} />
          <circle cx={PW / 2} cy={PH / 2} r={91.5} {...line} />
          <circle cx={PW / 2} cy={PH / 2} r={mini ? 6 : 4} fill={C.chalk} />
          {[0, 1].map((s) => {
            const gx = s ? PW : 0, dir = s ? -1 : 1
            return (
              <g key={s}>
                <rect x={s ? PW - 165 : 0} y={(PH - boxH) / 2} width={165} height={boxH} {...line} />
                <rect x={s ? PW - 55 : 0} y={(PH - sixH) / 2} width={55} height={sixH} {...line} />
                {!mini && <circle cx={gx + dir * 110} cy={PH / 2} r={4} fill={C.chalk} />}
                {!mini && <path d={arcOutside(gx + dir * 110, PH / 2, 91.5, gx + dir * 165)} {...line} />}
                <rect x={s ? PW : -11} y={(PH - goalH) / 2} width={11} height={goalH} fill="none" stroke={C.faint} strokeWidth={sw} vectorEffect="non-scaling-stroke" />
              </g>
            )
          })}
          {thirds && [1, 2].map((i) => <line key={i} x1={(i * PW) / 3} y1={0} x2={(i * PW) / 3} y2={PH} stroke={C.muted} strokeOpacity={0.55} strokeWidth={1} strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />)}
          {children?.(k)}
        </svg>
        {overlay}
      </div>
    </figure>
  )
}

/** The arc of the penalty area: the part of the circle around the spot that lies outside the box. */
function arcOutside(cx0: number, cy0: number, r: number, edge: number) {
  const dx = edge - cx0
  if (Math.abs(dx) >= r) return ''
  const dy = Math.sqrt(r * r - dx * dx)
  const sweep = dx > 0 ? 1 : 0
  return `M ${edge} ${cy0 - dy} A ${r} ${r} 0 0 ${sweep} ${edge} ${cy0 + dy}`
}

/* ------------------------------------------------------------------ heat */

/** Sequential pitch-green ramp: light mint to deep pitch, transparent where nothing happens. */
const RAMP: [number, number, number][] = [[203, 229, 214], [115, 179, 145], [19, 128, 79], [11, 93, 59], [6, 58, 37]]
function ramp(t: number): [number, number, number] {
  const p = Math.max(0, Math.min(1, t)) * (RAMP.length - 1)
  const i = Math.min(RAMP.length - 2, Math.floor(p)), f = p - i
  const a = RAMP[i], b = RAMP[i + 1]
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]
}

/** The density grid painted on a small canvas, then stretched over the pitch (the browser smooths it). */
export function HeatLayer({ grid, opacity = 0.92 }: { grid: Grid; opacity?: number }) {
  const href = useMemo(() => {
    if (typeof document === 'undefined' || !grid.max) return ''
    const cv = document.createElement('canvas')
    cv.width = grid.cols; cv.height = grid.rows
    const ctx = cv.getContext('2d')
    if (!ctx) return ''
    const img = ctx.createImageData(grid.cols, grid.rows)
    for (let i = 0; i < grid.v.length; i++) {
      const t = grid.v[i] / grid.max
      if (t < 0.05) continue
      const [r, g, b] = ramp(Math.pow(t, 0.8))
      img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b
      img.data[i * 4 + 3] = Math.round(255 * Math.min(1, 0.18 + t * 0.95))
    }
    ctx.putImageData(img, 0, 0)
    return cv.toDataURL('image/png')
  }, [grid])
  if (!href) return null
  return <image href={href} x={0} y={0} width={PW} height={PH} preserveAspectRatio="none" opacity={opacity} style={{ imageRendering: 'auto' }} />
}

/** The legend of the heat ramp: few to many. */
export function HeatLegend() {
  const { t } = useT('viz')
  return (
    <span className="inline-flex items-center gap-2 text-[12px] text-ink-muted">
      {t('legend.few')}
      <span className="h-2.5 w-20 rounded-full" style={{ background: 'linear-gradient(90deg, rgba(203,229,214,.5), #73B391, #13804F, #063A25)' }} aria-hidden="true" />
      {t('legend.many')}
    </span>
  )
}

/* ------------------------------------------------------------------ marks */

export type MarkKind = 'circle' | 'square' | 'cross' | 'ring'
/** A data mark sized in CSS pixels (r), with a larger transparent hit area when it is clickable. */
export function Mark({ x, y, k, r = 5, kind = 'circle', fill, stroke = C.paper, strokeW = 1.5, onClick, onEnter, label, focusable = false, dim = false }: {
  x: number; y: number; k: number; r?: number; kind?: MarkKind; fill: string; stroke?: string; strokeW?: number
  onClick?: () => void; onEnter?: () => void; label?: string; focusable?: boolean; dim?: boolean
}) {
  const cx0 = X(x), cy0 = Y(y), R = r * k
  const shape = kind === 'square'
    ? <rect x={cx0 - R * 0.9} y={cy0 - R * 0.9} width={R * 1.8} height={R * 1.8} rx={R * 0.25} fill={fill} stroke={stroke} strokeWidth={strokeW * k} />
    : kind === 'cross'
      ? <g stroke={fill} strokeWidth={2.2 * k} strokeLinecap="round"><line x1={cx0 - R * 0.8} y1={cy0 - R * 0.8} x2={cx0 + R * 0.8} y2={cy0 + R * 0.8} /><line x1={cx0 - R * 0.8} y1={cy0 + R * 0.8} x2={cx0 + R * 0.8} y2={cy0 - R * 0.8} /></g>
      : kind === 'ring'
        ? <circle cx={cx0} cy={cy0} r={R} fill={C.paper} fillOpacity={0.9} stroke={fill} strokeWidth={2 * k} />
        : <circle cx={cx0} cy={cy0} r={R} fill={fill} stroke={stroke} strokeWidth={strokeW * k} />
  const interactive = !!onClick
  return (
    <g opacity={dim ? 0.18 : 1} className={interactive ? 'cursor-pointer outline-none [&:focus-visible>circle:first-child]:stroke-forest-600' : undefined}
      role={interactive ? 'button' : undefined} tabIndex={interactive && focusable ? 0 : undefined} aria-label={interactive ? label : undefined}
      onClick={onClick} onMouseEnter={onEnter} onFocus={onEnter}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.() } } : undefined}>
      {interactive && <circle cx={cx0} cy={cy0} r={Math.max(R + 4 * k, 11 * k)} fill="transparent" stroke="transparent" strokeWidth={3 * k} />}
      {shape}
    </g>
  )
}

/** A small floating card over a map, placed at a point given in pitch percent. */
export function MapTip({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  const left = ((X(x) + PAD) / (PW + PAD * 2)) * 100
  const top = ((Y(y) + PAD) / (PH + PAD * 2)) * 100
  const flip = left > 62
  return (
    <div role="status" className="pointer-events-none absolute z-10 w-max max-w-[220px] rounded-xl border border-line bg-paper px-3 py-2 text-[12.5px] leading-snug text-ink-soft shadow-lift"
      style={{ left: `${left}%`, top: `${top}%`, transform: `translate(${flip ? 'calc(-100% - 12px)' : '12px'}, ${top > 60 ? 'calc(-100% + 4px)' : '-4px'})` }}>
      {children}
    </div>
  )
}

/** A legend swatch drawn like the mark itself. */
export function Swatch({ kind = 'circle', fill, stroke }: { kind?: MarkKind | 'line'; fill: string; stroke?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="shrink-0">
      {kind === 'square' ? <rect x="2" y="2" width="10" height="10" rx="2" fill={fill} stroke={stroke ?? 'none'} strokeWidth="1.6" />
        : kind === 'cross' ? <g stroke={fill} strokeWidth="2.2" strokeLinecap="round"><line x1="3" y1="3" x2="11" y2="11" /><line x1="3" y1="11" x2="11" y2="3" /></g>
          : kind === 'ring' ? <circle cx="7" cy="7" r="4.6" fill="#fff" stroke={fill} strokeWidth="2" />
            : kind === 'line' ? <line x1="1" y1="7" x2="13" y2="7" stroke={fill} strokeWidth="3" strokeLinecap="round" />
              : <circle cx="7" cy="7" r="5" fill={fill} stroke={stroke ?? 'none'} strokeWidth="1.6" />}
    </svg>
  )
}
export function LegendItem({ children, ...p }: { children: ReactNode; kind?: MarkKind | 'line'; fill: string; stroke?: string }) {
  return <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-soft"><Swatch {...p} />{children}</span>
}
