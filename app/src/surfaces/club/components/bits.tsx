// Small pieces of the club space: the crest, a compact switch, a copy button, a confirm dialog.
import { useEffect, useId, useState, type ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'
import { useT } from '../../../i18n'
import { cx } from '../../../lib/util'
import { Modal } from '../../../ui'
import { initials, readableOn } from './data'

/** The club crest, drawn from its two colours and its initials: a shield, a band of the second colour, the letters. */
export function Crest({ name, colors, size = 56, className }: { name: string; colors: { primary: string; secondary: string }; size?: number; className?: string }) {
  const id = useId().replace(/:/g, '')
  const letters = initials(name)
  const ink = readableOn(colors.primary)
  const fs = letters.length > 2 ? 19 : 23
  return (
    <svg viewBox="0 0 64 72" width={size} height={(size * 72) / 64} className={cx('shrink-0', className)} role="img" aria-label={name}>
      <defs>
        <clipPath id={`cr-${id}`}><path d="M32 2 L60 10 V34 C60 52 47 64 32 70 C17 64 4 52 4 34 V10 Z" /></clipPath>
      </defs>
      <g clipPath={`url(#cr-${id})`}>
        <rect width="64" height="72" fill={colors.primary} />
        <path d="M0 47 L64 31 V39 L0 55 Z" fill={colors.secondary} />
      </g>
      <path d="M32 2 L60 10 V34 C60 52 47 64 32 70 C17 64 4 52 4 34 V10 Z" fill="none" stroke="rgba(18,33,26,.18)" strokeWidth="1.5" />
      <text x="32" y="31" textAnchor="middle" dominantBaseline="middle" fill={ink} fontFamily="'Archivo Variable', Archivo, sans-serif" fontWeight={800} fontSize={fs} style={{ fontStretch: '116%' }}>{letters}</text>
      <path d="M32 54.5 l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5Z" fill={colors.secondary} />
    </svg>
  )
}

/** A compact on/off switch with an accessible name (for rows where the label is elsewhere). */
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
      className="grid h-11 w-14 shrink-0 place-items-center rounded-full disabled:cursor-not-allowed disabled:opacity-45">
      <span className={cx('relative h-6 w-11 rounded-full transition-colors', checked ? 'bg-forest-600' : 'bg-line')}>
        <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white ring-1 ring-black/5 transition-[left]', checked ? 'left-[22px]' : 'left-0.5')} />
      </span>
    </button>
  )
}

export async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true } catch {
    try {
      const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok
    } catch { return false }
  }
}

/** A button that copies a text and says so for two seconds. */
export function CopyButton({ text, label, done, className }: { text: string; label: string; done: string; className?: string }) {
  const [ok, setOk] = useState(false)
  useEffect(() => { if (!ok) return; const h = window.setTimeout(() => setOk(false), 2000); return () => window.clearTimeout(h) }, [ok])
  return (
    <button type="button" className={cx('btn-outline', className)} onClick={async () => setOk(await copyText(text))} aria-live="polite">
      {ok ? <Check size={16} /> : <Copy size={16} />}{ok ? done : label}
    </button>
  )
}

export function ConfirmModal({ open, title, body, confirm, onClose, onConfirm }: { open: boolean; title: string; body: ReactNode; confirm: string; onClose: () => void; onConfirm: () => void }) {
  const { t } = useT('common')
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<>
        <button type="button" className="btn-ghost min-h-[44px]" onClick={onClose}>{t('actions.cancel')}</button>
        <button type="button" className="btn-danger min-h-[44px]" onClick={onConfirm}>{confirm}</button>
      </>}>
      <div className="text-[15px] leading-relaxed text-ink-soft">{body}</div>
    </Modal>
  )
}

/** Name initials in a round avatar. */
export function Avatar({ name, tone = 'forest' }: { name: string; tone?: 'forest' | 'sand' }) {
  const letters = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  return <span aria-hidden="true" className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-full text-[13.5px] font-bold', tone === 'forest' ? 'bg-forest-50 text-forest-700' : 'bg-sand text-ink-soft')}>{letters}</span>
}
