import { useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { FAMILIES, INTENTIONS, MDS } from '../../../content'
import { useT } from '../../../i18n'
import { cx } from '../../../lib/util'
import type { Drill } from '../../../lib/types'
import { AGE_STEPS, EMPTY_FILTER, INTENSITIES, activeCount, ageStepLabel, facetCount, type DrillFilter, type Facet } from './helpers'

function Chip({ on, count, onClick, children, title }: { on: boolean; count: number; onClick: () => void; children: React.ReactNode; title?: string }) {
  const dim = !on && count === 0
  return (
    <button type="button" onClick={onClick} aria-pressed={on} title={title}
      className={cx('chip min-h-[36px] cursor-pointer px-3 transition', on ? 'chip-on' : 'hover:border-ink-faint', dim && 'opacity-45')}>
      <span>{children}</span>
      <span className={cx('tabular-nums text-[11px]', on ? 'text-cream/80' : 'text-ink-faint')}>{count}</span>
    </button>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 py-2 sm:flex-row sm:items-start sm:gap-3">
      <div className="shrink-0 pt-2 text-[13px] font-semibold text-ink-muted sm:w-28">{label}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

export function DrillFilters({ drills, value, onChange, facets = ['family', 'intention', 'day', 'age', 'intensity'], startOpen = false, idPrefix = 'dl' }: {
  drills: Drill[]; value: DrillFilter; onChange: (f: DrillFilter) => void; facets?: Facet[]; startOpen?: boolean; idPrefix?: string
}) {
  const { t } = useT('training')
  const [open, setOpen] = useState(startOpen)
  const n = activeCount(value)
  const toggle = (k: 'family' | 'intention' | 'day' | 'intensity', v: string) => {
    const cur = value[k]
    onChange({ ...value, [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] })
  }
  const has = (f: Facet) => facets.includes(f)
  const selectedHints = value.intention.map((i) => `${t(`common:intentions.${i}`)}${t('colon')}${t(`common:intentionsHint.${i}`)}`)

  return (
    <div>
      <div className="flex gap-2">
        <label className="relative min-w-0 flex-1" htmlFor={`${idPrefix}-q`}>
          <span className="sr-only">{t('library.search')}</span>
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
          <input id={`${idPrefix}-q`} type="search" className="input min-h-[44px] pl-10" placeholder={t('library.searchPh')} value={value.q} onChange={(e) => onChange({ ...value, q: e.target.value })} />
        </label>
        <button type="button" className={cx('btn-outline min-h-[44px] shrink-0', open && 'border-forest-600 text-forest-600')} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={`${idPrefix}-filters`}>
          <SlidersHorizontal size={17} aria-hidden="true" /><span className="hidden sm:inline">{t('library.filters')}</span>
          {n > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-forest-600 px-1 text-[11px] font-semibold tabular-nums text-cream">{n}</span>}
        </button>
      </div>

      {open && (
        <div id={`${idPrefix}-filters`} className="mt-3 divide-y divide-line/70 rounded-2xl border border-line bg-paper px-3 py-1 sm:px-4">
          {has('family') && (
            <Row label={t('library.family')}>
              {FAMILIES.map((f) => <Chip key={f} on={value.family.includes(f)} count={facetCount(drills, value, 'family', f)} onClick={() => toggle('family', f)}>{t(`common:families.${f}`)}</Chip>)}
            </Row>
          )}
          {has('intention') && (
            <Row label={t('library.intention')}>
              {INTENTIONS.map((i) => <Chip key={i} on={value.intention.includes(i)} title={t(`common:intentionsHint.${i}`)} count={facetCount(drills, value, 'intention', i)} onClick={() => toggle('intention', i)}>{t(`common:intentions.${i}`)}</Chip>)}
              {selectedHints.length > 0 && <div className="w-full pt-1 text-xs text-ink-muted">{selectedHints.map((h) => <div key={h}>{h}</div>)}</div>}
            </Row>
          )}
          {has('day') && (
            <Row label={t('library.day')}>
              {MDS.map((m) => <Chip key={m} on={value.day.includes(m)} title={t(`mdName.${m}`)} count={facetCount(drills, value, 'day', m)} onClick={() => toggle('day', m)}>{m === 'youth' ? t('common:md.youth') : m}</Chip>)}
            </Row>
          )}
          {has('age') && (
            <Row label={t('library.age')}>
              {AGE_STEPS.map((a) => <Chip key={a} on={value.age === a} title={t('library.ageHint', { age: ageStepLabel(a) })} count={facetCount(drills, value, 'age', a)} onClick={() => onChange({ ...value, age: value.age === a ? null : a })}>{ageStepLabel(a)}</Chip>)}
            </Row>
          )}
          {has('intensity') && (
            <Row label={t('intensity')}>
              {INTENSITIES.map((k) => <Chip key={k} on={value.intensity.includes(k)} count={facetCount(drills, value, 'intensity', k)} onClick={() => toggle('intensity', k)}>{t(`common:intensity.${k}`)}</Chip>)}
            </Row>
          )}
          {n > 0 && (
            <div className="flex justify-end py-2">
              <button type="button" className="btn-ghost btn-sm" onClick={() => onChange({ ...EMPTY_FILTER, q: value.q })}><X size={14} aria-hidden="true" />{t('library.clear')}</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
