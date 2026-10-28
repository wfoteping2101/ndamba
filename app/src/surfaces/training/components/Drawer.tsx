import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useT } from '../../../i18n'

/** Side drawer on desktop, bottom sheet on phone. */
export function Drawer({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const { t } = useT('training')
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="no-print fixed inset-0 z-50 bg-night-900/50" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div onClick={(e) => e.stopPropagation()}
        className="safe-bottom absolute inset-x-0 bottom-0 flex max-h-[90vh] flex-col rounded-t-3xl bg-cream shadow-lift sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[520px] sm:rounded-none sm:rounded-l-3xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button type="button" className="btn-ghost h-11 w-11 p-0" onClick={onClose} aria-label={t('common:actions.close')}><X size={18} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        {footer && <div className="border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}
