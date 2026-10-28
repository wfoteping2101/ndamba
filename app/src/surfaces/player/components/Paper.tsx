// BriBri's notebook look: a lined paper page with a red-earth margin, a wax-print (pagne) band drawn in SVG,
// and headings in Archivo italic (the brand's one family: no second typeface to download).
import { useId, type CSSProperties, type ReactNode } from 'react'
import { cx } from '../../../lib/util'

/** Kept for the pages that call it: Archivo italic ships with the app, nothing to load any more. */
export function useHandFont() { /* no-op */ }

export const handCls = 'font-display italic'

/** Lined paper with a red margin line. `lines` false gives a plain grain only. */
export function paperStyle(lines = true): CSSProperties {
  const grain = 'radial-gradient(rgba(18,33,26,0.035) 1px, transparent 1.2px)'
  if (!lines) return { backgroundColor: '#FBFCF9', backgroundImage: grain, backgroundSize: '5px 5px' }
  return {
    backgroundColor: '#FBFCF9',
    backgroundImage: [
      'linear-gradient(90deg, transparent 37px, rgba(191,90,46,0.38) 37px, rgba(191,90,46,0.38) 38.5px, transparent 38.5px)',
      'repeating-linear-gradient(180deg, transparent 0, transparent 27px, rgba(18,33,26,0.075) 27px, rgba(18,33,26,0.075) 28px)',
      grain,
    ].join(','),
    backgroundSize: '100% 100%, 100% 28px, 5px 5px',
  }
}

export function PaperCard({ children, className, lines = true, as: As = 'div', style }: { children: ReactNode; className?: string; lines?: boolean; as?: 'div' | 'article' | 'section'; style?: CSSProperties }) {
  return (
    <As className={cx('relative overflow-hidden rounded-[18px] border border-line', className)} style={{ ...paperStyle(lines), ...style }}>
      {children}
    </As>
  )
}

/** A strip of pagne: concentric circles, diamonds and dots, like the cover of the notebook. */
export function WaxBand({ height = 56, base = '#BF5A2E', accent = '#F5B700', third = '#0B5D3B', light = '#F6F7F2', className }: { height?: number; base?: string; accent?: string; third?: string; light?: string; className?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg className={cx('block w-full', className)} height={height} aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <pattern id={`wax-${id}`} width="56" height="56" patternUnits="userSpaceOnUse">
          <rect width="56" height="56" fill={base} />
          <circle cx="14" cy="14" r="11" fill={accent} />
          <circle cx="14" cy="14" r="7.5" fill={third} />
          <circle cx="14" cy="14" r="4" fill={light} />
          <circle cx="14" cy="14" r="1.6" fill={base} />
          <circle cx="42" cy="42" r="11" fill={accent} />
          <circle cx="42" cy="42" r="7.5" fill={third} />
          <circle cx="42" cy="42" r="4" fill={light} />
          <circle cx="42" cy="42" r="1.6" fill={base} />
          <path d="M42 4 L50 14 L42 24 L34 14 Z" fill={light} opacity="0.9" />
          <path d="M42 9 L46 14 L42 19 L38 14 Z" fill={third} />
          <path d="M14 32 L22 42 L14 52 L6 42 Z" fill={light} opacity="0.9" />
          <path d="M14 37 L18 42 L14 47 L10 42 Z" fill={third} />
          <circle cx="28" cy="28" r="2.4" fill={light} />
          <circle cx="0" cy="28" r="2.4" fill={light} />
          <circle cx="56" cy="28" r="2.4" fill={light} />
          <circle cx="28" cy="0" r="2.4" fill={light} />
          <circle cx="28" cy="56" r="2.4" fill={light} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#wax-${id})`} />
    </svg>
  )
}

/** The header band of the notebook pages. */
export function NotebookHeader({ eyebrow, title, subtitle, actions, photo, children }: { eyebrow?: string; title: string; subtitle?: ReactNode; actions?: ReactNode; photo?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-8 overflow-hidden rounded-[22px] border border-line">
      <WaxBand height={40} />
      <div className="flex gap-8 px-5 py-6 sm:px-8 sm:py-7" style={paperStyle(false)}>
        <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {eyebrow && <p className="mb-1.5 text-[14px] font-semibold text-terra-700">{eyebrow}</p>}
            <h1 className={cx(handCls, 'text-[32px] leading-tight text-ink sm:text-[42px]')}>{title}</h1>
            {subtitle && <p className="mt-2 max-w-2xl text-[15.5px] leading-relaxed text-ink-soft">{subtitle}</p>}
          </div>
          {actions && <div className="no-print flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </div>
        {children}
        </div>
        {photo && <div className="no-print hidden shrink-0 md:block">{photo}</div>}
      </div>
    </header>
  )
}
