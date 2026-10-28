// BriBri's notebook look: a lined paper page with a margin, a wax-print (pagne) band
// drawn in SVG, and handwritten-feel headings in Fraunces italic.
import { useEffect, useId, type CSSProperties, type ReactNode } from 'react'
import { cx } from '../../../lib/util'

const ITALIC_HREF = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,400;1,9..144,600&display=swap'

/** Loads Fraunces italic once (the app shell only loads the roman styles). */
export function useHandFont() {
  useEffect(() => {
    if (document.querySelector('link[data-njangi-italic]')) return
    const l = document.createElement('link')
    l.rel = 'stylesheet'
    l.href = ITALIC_HREF
    l.setAttribute('data-njangi-italic', '1')
    document.head.appendChild(l)
  }, [])
}

export const handCls = 'font-display italic'

/** Lined paper with a red margin line. `lines` false gives a plain grain only. */
export function paperStyle(lines = true): CSSProperties {
  const grain = 'radial-gradient(rgba(120,90,40,0.05) 1px, transparent 1.2px)'
  if (!lines) return { backgroundColor: '#FBFCF9', backgroundImage: grain, backgroundSize: '5px 5px' }
  return {
    backgroundColor: '#FBFCF9',
    backgroundImage: [
      'linear-gradient(90deg, transparent 37px, rgba(184,67,47,0.35) 37px, rgba(184,67,47,0.35) 38.5px, transparent 38.5px)',
      'repeating-linear-gradient(180deg, transparent 0, transparent 27px, rgba(61,79,107,0.13) 27px, rgba(61,79,107,0.13) 28px)',
      grain,
    ].join(','),
    backgroundSize: '100% 100%, 100% 28px, 5px 5px',
  }
}

export function PaperCard({ children, className, lines = true, as: As = 'div', style }: { children: ReactNode; className?: string; lines?: boolean; as?: 'div' | 'article' | 'section'; style?: CSSProperties }) {
  return (
    <As className={cx('relative overflow-hidden rounded-2xl border border-[#DCE2D8] shadow-card', className)} style={{ ...paperStyle(lines), ...style }}>
      {children}
    </As>
  )
}

/** A strip of pagne: concentric circles, diamonds and dots, like the cover of the notebook. */
export function WaxBand({ height = 56, base = '#D7263D', accent = '#F5B700', third = '#0B5D3B', light = '#F6F7F2', className }: { height?: number; base?: string; accent?: string; third?: string; light?: string; className?: string }) {
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
  useHandFont()
  return (
    <header className="mb-6 overflow-hidden rounded-3xl border border-[#DCE2D8] shadow-card">
      <WaxBand height={44} />
      <div className="flex gap-6 px-5 py-5 sm:px-7 sm:py-6" style={paperStyle(false)}>
        <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
            <h1 className={cx(handCls, 'text-[30px] font-semibold leading-tight text-ink sm:text-[38px]')}>{title}</h1>
            {subtitle && <p className="mt-1.5 max-w-2xl text-[15px] text-ink-muted">{subtitle}</p>}
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
