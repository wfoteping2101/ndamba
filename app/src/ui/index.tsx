import { useEffect, useMemo, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cx } from '../lib/util'
import { renderDiagram } from '../lib/pitch.mjs'
import type { DiagramSpec } from '../lib/types'
import { setLang, useT } from '../i18n'
import { updateProfile } from '../lib/session'

/* ---------- Brand ---------- */

/** Brand marks live in ./brand.tsx. LogoMark and Logo keep their old names for the pages that import them. */
export { NdambaMark, NdambaWordmark, NdambaLogo, MolaMark, BRAND_COLORS } from './brand'
import { NdambaMark, NdambaLogo } from './brand'
export function LogoMark({ size = 32, className, light = false }: { size?: number; className?: string; light?: boolean }) {
  return <NdambaMark size={size} className={className} tone={light ? 'light' : 'color'} />
}
export function Logo({ light = false, className, size = 'md' }: { light?: boolean; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  return <NdambaLogo light={light} className={className} size={size} />
}

/** Small FR / EN switch. Saves to the profile when there is one. */
export function LangSwitch({ dark = false }: { dark?: boolean }) {
  const { lang } = useT()
  const pick = (l: 'fr' | 'en') => { setLang(l); updateProfile({ lang: l }) }
  return (
    <div className={cx('inline-flex rounded-full border p-0.5 text-xs font-semibold', dark ? 'border-white/20' : 'border-line bg-paper')} role="group" aria-label="Language">
      {(['fr', 'en'] as const).map((l) => (
        <button key={l} type="button" onClick={() => pick(l)} aria-pressed={lang === l}
          className={cx('rounded-full px-2.5 py-1 uppercase transition', lang === l ? (dark ? 'bg-cream text-ink' : 'bg-forest-600 text-cream') : dark ? 'text-cream/80' : 'text-ink-muted')}>
          {l}
        </button>
      ))}
    </div>
  )
}

/* ---------- Layout pieces ---------- */

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h1 className="text-[28px] font-semibold leading-tight text-ink sm:text-[34px]">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-[15px] text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ children, className, pad = true, as: As = 'div' }: { children: ReactNode; className?: string; pad?: boolean; as?: 'div' | 'section' | 'article' }) {
  return <As className={cx('card', pad && 'card-pad', className)}>{children}</As>
}

export function CardTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx('mb-3 flex items-center justify-between gap-2', className)}>
      <h2 className="font-display text-lg font-semibold text-ink">{children}</h2>
      {action}
    </div>
  )
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

type Tone = 'neutral' | 'forest' | 'terra' | 'sun' | 'clay' | 'dark' | 'ok'
const toneCls: Record<Tone, string> = {
  neutral: 'bg-sand text-ink-soft',
  forest: 'bg-forest-50 text-forest-700',
  terra: 'bg-terra-50 text-terra-700',
  sun: 'bg-sun-50 text-sun-700',
  clay: 'bg-clay-50 text-clay-700',
  dark: 'bg-night-800 text-cream',
  ok: 'bg-ok-50 text-ok-500',
}
export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', toneCls[tone], className)}>{children}</span>
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'forest' | 'terra' | 'sun' | 'clay' }) {
  const color = tone === 'terra' ? 'text-terra-600' : tone === 'sun' ? 'text-sun-700' : tone === 'clay' ? 'text-clay-600' : 'text-forest-600'
  return (
    <div className="rounded-2xl border border-line bg-paper p-4">
      <div className="text-xs font-medium text-ink-muted">{label}</div>
      <div className={cx('mt-1 font-display text-3xl font-semibold', color)}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-ink-faint">{hint}</div>}
    </div>
  )
}

export function Progress({ value, max = 100, tone = 'forest', className }: { value: number; max?: number; tone?: 'forest' | 'terra' | 'sun' | 'clay'; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100))
  const bar = tone === 'terra' ? 'bg-terra-500' : tone === 'sun' ? 'bg-sun-500' : tone === 'clay' ? 'bg-clay-500' : 'bg-forest-600'
  return (
    <div className={cx('h-2 w-full overflow-hidden rounded-full bg-sand', className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx('h-full rounded-full transition-all', bar)} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-paper/60 px-6 py-10 text-center">
      {icon && <div className="mb-3 text-forest-500">{icon}</div>}
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      {body && <p className="mt-1 max-w-md text-sm text-ink-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Modal({ open, onClose, title, children, wide = false, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  const { t } = useT('common')
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-night-900/50 p-0 sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className={cx('max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-paper shadow-lift sm:rounded-3xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper/95 px-5 py-4 backdrop-blur">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button type="button" className="btn-ghost btn-sm" onClick={onClose} aria-label={t('actions.close')}><X size={18} /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="sticky bottom-0 flex justify-end gap-2 border-t border-line bg-paper/95 px-5 py-3 backdrop-blur">{footer}</div>}
      </div>
    </div>
  )
}

export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cx('flex gap-1 overflow-x-auto rounded-2xl border border-line bg-paper p-1', className)} role="tablist">
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={cx('whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition', value === t.id ? 'bg-forest-600 text-cream' : 'text-ink-muted hover:bg-sand')}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="mb-4">
      <label className="label" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
    </div>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3">
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={cx('relative h-6 w-11 rounded-full transition', checked ? 'bg-forest-600' : 'bg-line')}>
        <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition', checked ? 'left-[22px]' : 'left-0.5')} />
      </button>
      <span className="text-sm text-ink-soft">{label}</span>
    </label>
  )
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)} aria-pressed={value === o.id} className={cx('chip cursor-pointer', value === o.id && 'chip-on')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Callout({ tone = 'forest', title, children }: { tone?: 'forest' | 'terra' | 'sun' | 'clay'; title?: string; children: ReactNode }) {
  const cls = tone === 'terra' ? 'border-terra-300 bg-terra-50' : tone === 'sun' ? 'border-sun-300 bg-sun-50' : tone === 'clay' ? 'border-clay-300 bg-clay-50' : 'border-forest-300 bg-forest-50'
  return (
    <div className={cx('rounded-2xl border-l-4 px-4 py-3', cls)}>
      {title && <div className="mb-0.5 text-sm font-semibold text-ink">{title}</div>}
      <div className="text-sm text-ink-soft">{children}</div>
    </div>
  )
}

/* ---------- Pitch diagrams (shared with the books) ---------- */

export function Pitch({ spec, width = 640, title, className }: { spec?: DiagramSpec | null; width?: number; title?: string; className?: string }) {
  const svg = useMemo(() => {
    if (!spec) return ''
    try { return renderDiagram(spec, { width, title }) } catch { return '' }
  }, [spec, width, title])
  if (!svg) return null
  return <div className={cx('pitch-svg overflow-hidden rounded-xl', className)} dangerouslySetInnerHTML={{ __html: svg }} />
}
