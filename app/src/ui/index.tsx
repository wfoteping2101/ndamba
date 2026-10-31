import { useEffect, useId, useMemo, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cx } from '../lib/util'
import { renderDiagram } from '../lib/pitch.mjs'
import type { DiagramSpec } from '../lib/types'
import { localizeDiagram } from '../lib/diagramLang'
import { setLang, useT } from '../i18n'
import { updateProfile } from '../lib/session'

/* ---------- Brand ---------- */

/** Brand marks live in ./brand.tsx. LogoMark and Logo keep their old names for the pages that import them. */
export { NdambaMark, NdambaWordmark, NdambaLogo, MolaMark, MolaAvatar, BRAND_COLORS } from './brand'
import { NdambaMark, NdambaLogo } from './brand'
export function LogoMark({ size = 32, className, light = false }: { size?: number; className?: string; light?: boolean }) {
  return <NdambaMark size={size} className={className} tone={light ? 'light' : 'color'} />
}
export function Logo({ light = false, className, size = 'md' }: { light?: boolean; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  return <NdambaLogo light={light} className={className} size={size} />
}

/** Small FR / EN switch. Saves to the profile when there is one. FR and EN are codes, so they stay in capitals. */
export function LangSwitch({ dark = false }: { dark?: boolean }) {
  const { lang } = useT()
  const pick = (l: 'fr' | 'en') => { setLang(l); updateProfile({ lang: l }) }
  return (
    <div className={cx('inline-flex rounded-full border p-0.5 text-[12.5px] font-semibold', dark ? 'border-white/15 bg-white/[0.04]' : 'border-line bg-paper')} role="group" aria-label="Langue / Language">
      {(['fr', 'en'] as const).map((l) => (
        <button key={l} type="button" onClick={() => pick(l)} aria-pressed={lang === l} lang={l}
          className={cx('min-h-[34px] min-w-[40px] rounded-full px-2.5 uppercase transition-colors',
            lang === l ? (dark ? 'bg-cream text-ink' : 'bg-ink text-cream') : dark ? 'text-cream/70 hover:text-cream' : 'text-ink-muted hover:text-ink')}>
          {l}
        </button>
      ))}
    </div>
  )
}

/* ---------- The floating Mola launcher ---------- */

/**
 * Keep the floating Mola launcher clear of a page's own sticky action bar.
 *   useMolaDock({ lift: 72 })   moves the launcher up by 72 px while the page is shown
 *   useMolaDock({ hide: true }) hides it (the page has its own Mola entry, or a full-width bar)
 * Only the launcher button and its teaser move; the open chat is never affected.
 */
export function useMolaDock({ lift = 0, hide = false }: { lift?: number; hide?: boolean } = {}) {
  useEffect(() => {
    const el = document.documentElement
    if (hide) el.dataset.molaDock = 'hide'
    else if (lift > 0) { el.dataset.molaDock = 'lift'; el.style.setProperty('--mola-lift', `${lift}px`) }
    else return
    return () => { delete el.dataset.molaDock; el.style.removeProperty('--mola-lift') }
  }, [lift, hide])
}
/** The same as a component: <MolaDock lift={72} /> or <MolaDock hide /> anywhere in a page. */
export function MolaDock(props: { lift?: number; hide?: boolean }) {
  useMolaDock(props)
  return null
}

/* ---------- Layout pieces ---------- */

/**
 * The title block of a page. Hierarchy comes from size: one wide display title, a quiet subtitle.
 * eyebrow is optional context (a book, a section); it renders as a small sentence-case label.
 */
export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-9 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <p className="mb-2 text-[13px] font-semibold text-ink-muted">{eyebrow}</p>}
        <h1 className="text-balance text-[30px] text-ink sm:text-[40px]">{title}</h1>
        {subtitle && <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-ink-muted sm:text-[16.5px]">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  )
}

/** A 14 px card on white with a hairline. Use one grouped card rather than many small ones. */
export function Card({ children, className, pad = true, as: As = 'div' }: { children: ReactNode; className?: string; pad?: boolean; as?: 'div' | 'section' | 'article' }) {
  return <As className={cx('card', pad && 'card-pad', className)}>{children}</As>
}

export function CardTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx('mb-4 flex items-center justify-between gap-3', className)}>
      <h2 className="min-w-0 text-[17px] leading-tight text-ink sm:text-[18px]">{children}</h2>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/** Content that sits on the page background with a title, no box. */
export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 className="min-w-0 text-[20px] leading-tight text-ink sm:text-[22px]">{title}</h2>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  )
}

type Tone = 'neutral' | 'forest' | 'terra' | 'sun' | 'clay' | 'dark' | 'ok'
const toneCls: Record<Tone, string> = {
  neutral: 'bg-sand text-ink-soft',
  forest: 'bg-forest-50 text-forest-700',
  // terra is never a label colour: it renders as a pitch-green outline
  terra: 'border border-forest-300 bg-transparent text-forest-700',
  // gold is a fill with ink text, never gold text on a pale fill
  sun: 'bg-sun-100 text-ink',
  clay: 'bg-clay-50 text-clay-700',
  dark: 'bg-night-800 text-cream',
  ok: 'bg-ok-50 text-ok-700',
}
/** A status or category label: sentence case, full radius. */
export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[12px] font-semibold leading-4', toneCls[tone], className)}>{children}</span>
}

/** A key number with its label. The number carries the weight; colour only when it means something. */
export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'forest' | 'terra' | 'sun' | 'clay' }) {
  // sun marks the key number with a gold rule on top (gold text is for dark backgrounds only)
  const color = tone === 'forest' ? 'text-forest-600' : tone === 'clay' ? 'text-clay-600' : 'text-ink'
  return (
    <div className={cx('rounded-card border border-line bg-paper px-4 py-3.5', tone === 'sun' && 'border-t-[3px] border-t-sun-500')}>
      <div className="text-[13px] font-semibold leading-snug text-ink-muted">{label}</div>
      <div className={cx('num mt-2 font-display text-[30px] leading-none', color)}>{value}</div>
      {hint && <div className="mt-2 text-[12.5px] leading-snug text-ink-muted">{hint}</div>}
    </div>
  )
}

export function Progress({ value, max = 100, tone = 'forest', className }: { value: number; max?: number; tone?: 'forest' | 'terra' | 'sun' | 'clay'; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100))
  const bar = tone === 'terra' ? 'bg-forest-500' : tone === 'sun' ? 'bg-sun-500' : tone === 'clay' ? 'bg-clay-500' : 'bg-forest-600'
  return (
    <div className={cx('h-1.5 w-full overflow-hidden rounded-full bg-sand', className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx('h-full rounded-full transition-[width] duration-500', bar)} style={{ width: `${pct}%` }} />
    </div>
  )
}

/** One sentence that says what to do, and one action. No mascot. */
export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-card border border-line bg-paper px-6 py-12 text-center sm:py-14">
      {icon && <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-forest-50 text-forest-600 [&_svg]:h-[22px] [&_svg]:w-[22px]">{icon}</div>}
      <h3 className="text-balance text-[18px] leading-tight text-ink sm:text-[19px]">{title}</h3>
      {body && <p className="mt-2 max-w-md text-[15px] leading-relaxed text-ink-muted">{body}</p>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  )
}

/** Dialog: a bottom sheet on phones, a 22 px panel on larger screens. Escape closes; focus goes in and comes back. */
export function Modal({ open, onClose, title, children, wide = false, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean; footer?: ReactNode }) {
  const { t } = useT('common')
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const close = useRef(onClose)
  close.current = onClose
  // remember what had focus before the dialog rendered, to give it back on close
  const opener = useRef<HTMLElement | null>(null)
  if (open && !opener.current && typeof document !== 'undefined') opener.current = document.activeElement as HTMLElement | null
  if (!open) opener.current = null
  useEffect(() => {
    if (!open) return
    const prev = opener.current
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close.current() }
    window.addEventListener('keydown', k)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // an autofocused field inside keeps its focus; otherwise the dialog itself takes it
    if (!panel.current?.contains(document.activeElement)) panel.current?.focus({ preventScroll: true })
    return () => {
      window.removeEventListener('keydown', k)
      document.body.style.overflow = overflow
      prev?.focus?.({ preventScroll: true })
    }
  }, [open])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-night-900/55 sm:items-center sm:p-6" onClick={onClose}>
      <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId}
        className={cx('flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-panel bg-paper shadow-lift outline-none sm:rounded-panel', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}
        onClick={(e) => e.stopPropagation()}>
        <div aria-hidden="true" className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line sm:hidden" />
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line py-3 pl-5 pr-3 sm:py-4 sm:pl-6">
          <h2 id={titleId} className="min-w-0 text-[18px] leading-tight text-ink sm:text-[19px]">{title}</h2>
          <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-sand hover:text-ink" onClick={onClose} aria-label={t('actions.close')}><X size={19} strokeWidth={1.75} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="safe-bottom flex shrink-0 flex-wrap justify-end gap-2 border-t border-line bg-paper px-5 py-3 sm:px-6">{footer}</div>}
      </div>
    </div>
  )
}

/** Underlined tabs, like a match centre. Arrow keys move between tabs. */
export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; className?: string }) {
  const onKey = (e: ReactKeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
    onChange(tabs[n].id)
    const sib = (e.currentTarget.parentElement?.children[n] as HTMLElement | undefined)
    sib?.focus()
  }
  return (
    <div className={cx('no-scrollbar flex gap-6 overflow-x-auto border-b border-line sm:gap-7', className)} role="tablist">
      {tabs.map((t, i) => {
        const on = value === t.id
        return (
          <button key={t.id} type="button" role="tab" aria-selected={on} tabIndex={on ? 0 : -1} onClick={() => onChange(t.id)} onKeyDown={(e) => onKey(e, i)}
            className={cx('-mb-px inline-flex min-h-[46px] shrink-0 items-center gap-1.5 whitespace-nowrap border-b-[2.5px] pb-2 pt-2.5 text-[14.5px] font-semibold transition-colors',
              on ? 'border-forest-600 text-ink' : 'border-transparent text-ink-muted hover:text-ink')}>
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="mb-4">
      <label className="label" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-[13px] leading-snug text-ink-muted">{hint}</p>}
    </div>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-3">
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={cx('relative h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-forest-600' : 'bg-line')}>
        <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white ring-1 ring-black/5 transition-[left]', checked ? 'left-[22px]' : 'left-0.5')} />
      </button>
      <span className="text-[14.5px] text-ink-soft">{label}</span>
    </label>
  )
}

/** A row of filter chips where one is chosen. */
export function Segmented<T extends string>({ options, value, onChange }: { options: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)} aria-pressed={value === o.id}
          className={cx('chip min-h-[40px] cursor-pointer px-3.5 text-[13.5px] transition-colors', value === o.id ? 'chip-on' : 'hover:border-ink-faint hover:text-ink')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** A quiet tinted note. Red only for danger. */
export function Callout({ tone = 'forest', title, children }: { tone?: 'forest' | 'terra' | 'sun' | 'clay'; title?: string; children: ReactNode }) {
  const cls = tone === 'sun' ? 'bg-sun-50' : tone === 'clay' ? 'bg-clay-50' : tone === 'terra' ? 'bg-sand' : 'bg-forest-50'
  return (
    <div className={cx('rounded-card px-4 py-3.5', cls)}>
      {title && <div className="mb-0.5 text-[14.5px] font-semibold text-ink">{title}</div>}
      <div className="text-[14.5px] leading-relaxed text-ink-soft">{children}</div>
    </div>
  )
}

/* ---------- Pitch diagrams (shared with the books) ---------- */

const DIAGRAM_FONT = "'Archivo Variable', Archivo, sans-serif"

export function Pitch({ spec, width = 640, title, className }: { spec?: DiagramSpec | null; width?: number; title?: string; className?: string }) {
  const { lang } = useT()
  const svg = useMemo(() => {
    if (!spec) return ''
    try { return renderDiagram(localizeDiagram(spec, lang), { width, title, font: DIAGRAM_FONT }) } catch { return '' }
  }, [spec, width, title, lang])
  if (!svg) return null
  return <div className={cx('pitch-svg overflow-hidden rounded-control', className)} dangerouslySetInnerHTML={{ __html: svg }} />
}
