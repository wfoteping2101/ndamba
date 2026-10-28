import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cx } from '../../../lib/util'

/** Bottom sheet on phones, centred dialog on desktop. Dark variant for the live tagger. */
export function Sheet({ open, onClose, title, children, footer, dark = true, closeLabel = 'Close', wide = false }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; dark?: boolean; closeLabel?: string; wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    window.addEventListener('keydown', k, true)
    return () => window.removeEventListener('keydown', k, true)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div onClick={(e) => e.stopPropagation()}
        className={cx('safe-bottom flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-3xl shadow-lift sm:rounded-3xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg',
          dark ? 'bg-night-800 text-cream ring-1 ring-white/10' : 'bg-paper text-ink')}>
        <div className={cx('flex items-center justify-between border-b px-5 py-3.5', dark ? 'border-white/10' : 'border-line')}>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label={closeLabel}
            className={cx('grid h-11 w-11 place-items-center rounded-xl', dark ? 'text-cream/80 hover:bg-white/10' : 'text-ink-soft hover:bg-sand')}><X size={20} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className={cx('flex flex-wrap justify-end gap-2 border-t px-5 py-3', dark ? 'border-white/10' : 'border-line')}>{footer}</div>}
      </div>
    </div>
  )
}
