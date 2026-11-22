// Where the numbers come from, said once and plainly: coded actions, not player tracking.
import { Hand } from 'lucide-react'
import { useT } from '../../../../i18n'

export function Honesty({ tracking = true }: { tracking?: boolean }) {
  const { t } = useT('viz')
  return (
    <div className="flex gap-3 rounded-card bg-sand/70 px-4 py-3">
      <Hand size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-forest-600" aria-hidden="true" />
      <div className="text-[13.5px] leading-relaxed text-ink-soft">
        <p className="font-semibold text-ink">{t('honest.coded')}</p>
        {tracking && <p className="mt-0.5 text-ink-muted">{t('honest.tracking')}</p>}
      </div>
    </div>
  )
}
