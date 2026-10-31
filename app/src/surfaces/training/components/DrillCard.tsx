import { Link } from 'react-router-dom'
import { Clock, Users } from 'lucide-react'
import { drillText } from '../../../content'
import { useT } from '../../../i18n'
import type { Drill } from '../../../lib/types'
import { PitchVideoThumb } from '../../../ui/PitchVideo'
import { IntensityMeter, IntentionBadges } from './bits'

export function DrillCard({ d, search = '' }: { d: Drill; search?: string }) {
  const { t, lang } = useT('training')
  const tx = drillText(d, lang)
  return (
    <Link to={`/app/exercices/${d.id}${search}`} className="card group flex flex-col overflow-hidden transition hover:border-forest-300">
      <div className="relative shrink-0 border-b border-line bg-[#3E7A44]">
        <PitchVideoThumb spec={d.diagram} title={tx.title} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">
        <div className="mb-1 flex items-center gap-2 text-[12px] font-semibold">
          <span className="tabular-nums text-forest-700">{d.id}</span>
          <span className="hidden truncate font-medium text-ink-muted sm:inline">{t(`common:families.${d.family}`)}</span>
          <span className="ml-auto shrink-0 font-medium text-ink-faint">{d.ages}</span>
        </div>
        <h3 className="font-display text-[17px] leading-snug text-ink group-hover:text-forest-700 sm:text-lg">{tx.title}</h3>
        <p className="mt-0.5 line-clamp-2 text-[13px] text-ink-muted sm:text-sm">{tx.subtitle}</p>
        <div className="mt-2 sm:mt-3"><IntentionBadges list={d.intentions} max={2} /></div>
        <div className="mt-auto flex items-center gap-3 pt-3 text-[12.5px] tabular-nums text-ink-muted sm:gap-4 sm:pt-4">
          <span className="inline-flex items-center gap-1"><Clock size={14} strokeWidth={1.75} aria-hidden="true" />{d.minutes} {t('common:misc.minutes')}</span>
          <span className="inline-flex items-center gap-1"><Users size={14} strokeWidth={1.75} aria-hidden="true" />{d.players.min === d.players.max ? d.players.min : `${d.players.min} ${t('to')} ${d.players.max}`}</span>
          <span className="ml-auto"><IntensityMeter level={d.intensity} showLabel={false} /></span>
        </div>
      </div>
    </Link>
  )
}

/** Compact row used in pickers. */
export function DrillRow({ d, action }: { d: Drill; action: React.ReactNode }) {
  const { t, lang } = useT('training')
  const tx = drillText(d, lang)
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-paper p-2.5">
      <div className="w-24 shrink-0 overflow-hidden rounded-lg sm:w-28"><PitchVideoThumb spec={d.diagram} title={tx.title} button={false} /></div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-faint">
          <span className="tabular-nums text-forest-700">{d.id}</span><span className="truncate font-medium text-ink-muted">{t(`common:families.${d.family}`)}</span>
        </div>
        <div className="truncate font-semibold text-ink">{tx.title}</div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          <span>{d.minutes} {t('common:misc.minutes')}</span><span>{d.ages}</span><IntensityMeter level={d.intensity} showLabel={false} />
        </div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  )
}
