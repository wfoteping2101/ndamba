import { useEffect, useMemo, useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { useT } from '../../../i18n'
import { DRILLS } from '../../../content'
import type { Drill, MD } from '../../../lib/types'
import { Drawer } from './Drawer'
import { DrillFilters } from './DrillFilters'
import { DrillRow } from './DrillCard'
import { EMPTY_FILTER, matches, type DrillFilter } from './helpers'

/** "Ajouter un exercice": search and filter the library, add with one tap. Starts filtered on the session's day. */
export function AddDrillDrawer({ open, onClose, md, used, onAdd }: { open: boolean; onClose: () => void; md: MD; used: string[]; onAdd: (d: Drill) => void }) {
  const { t } = useT('training')
  // start on the drills of the session's day, unless that leaves almost nothing to choose from (MD+1 has a single drill)
  const dayFilter = (m: MD): DrillFilter => ({ ...EMPTY_FILTER, day: DRILLS.filter((d) => d.md.includes(m)).length >= 4 ? [m] : [] })
  const [filter, setFilter] = useState<DrillFilter>(() => dayFilter(md))
  // each opening starts on the session's current day (the coach may have changed it since)
  useEffect(() => { if (open) setFilter(dayFilter(md)) }, [open, md]) // eslint-disable-line react-hooks/exhaustive-deps
  const [added, setAdded] = useState<string[]>([])
  const list = useMemo(() => DRILLS.filter((d) => matches(d, filter)), [filter])
  const close = () => { setAdded([]); onClose() }
  return (
    <Drawer open={open} onClose={close} title={t('builder.addDrill')}
      footer={<div className="flex items-center justify-between gap-2"><span className="text-sm text-ink-muted">{added.length ? t('builder.addedCount', { count: added.length }) : t('library.found', { count: list.length })}</span><button type="button" className="btn-primary" onClick={close}>{t('common:actions.done')}</button></div>}>
      <DrillFilters drills={DRILLS} value={filter} onChange={setFilter} startOpen={false} idPrefix="dd" />
      {filter.day.length > 0 && (
        <p className="mt-2 text-xs text-ink-muted">{t('builder.filteredDay', { md: filter.day.join(', ') })} <button type="button" className="link" onClick={() => setFilter({ ...filter, day: [] })}>{t('builder.allDays')}</button></p>
      )}
      <ul className="mt-4 space-y-2">
        {list.length === 0 && <li className="rounded-2xl bg-sand px-4 py-6 text-center text-sm text-ink-muted">{DRILLS.length ? t('library.noneBody') : t('library.emptyBody')}</li>}
        {list.map((d) => {
          const isIn = used.includes(d.id) || added.includes(d.id)
          return (
            <li key={d.id}>
              <DrillRow d={d} action={
                <button type="button" onClick={() => { if (isIn) return; onAdd(d); setAdded((a) => [...a, d.id]) }} disabled={isIn} className={isIn ? 'btn-outline h-11 w-11 p-0 disabled:opacity-100' : 'btn-primary h-11 w-11 p-0'} aria-label={`${t('common:actions.add')} ${d.id}`}>
                  {isIn ? <Check size={18} /> : <Plus size={18} />}
                </button>} />
            </li>
          )
        })}
      </ul>
    </Drawer>
  )
}
