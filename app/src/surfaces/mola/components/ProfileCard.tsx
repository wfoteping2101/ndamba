import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import { useT } from '../../../i18n'
import type { Role } from '../../../lib/types'
import { cx } from '../../../lib/util'
import {
  AGE_GROUPS, COUNTRY_CODES, FORMATS, GOALS, POSITIONS, ROLES, countryName, fieldsFor, goalsFor, isFieldFilled, type Draft, type Field,
} from '../onboarding'
import './mola.css'

export type TLike = (key: string, opts?: Record<string, unknown>) => string

export function fieldLabel(t: TLike, f: Field, role?: Role) {
  if (f === 'club') return t(role === 'player' ? 'ob.field.clubPlayer' : role === 'analyst' ? 'ob.field.clubAnalyst' : role === 'manager' || role === 'federation' ? 'ob.field.org' : 'ob.field.club')
  if (f === 'ageGroup' && role === 'parent') return t('ob.field.childAge')
  return t(`ob.field.${f}`)
}

export function fieldValue(t: TLike, lang: 'fr' | 'en', f: Field, d: Draft): string {
  switch (f) {
    case 'role': return d.role ? t(`common:roles.${d.role}`) : ''
    case 'format': return d.format ? t('ob.formatLabel', { n: d.format }) : ''
    case 'position': return d.position ? t(`common:positions.${d.position}`) : ''
    case 'country': return countryName(d.country, lang)
    case 'lang': return d.lang ? t(`ob.langName.${d.lang}`) : ''
    case 'players': return d.players.length ? t('ob.playersCount', { count: d.players.length }) : ''
    case 'goals': return d.goals.map((g) => t(`ob.goal.${g}`)).join(', ')
    default: return (d[f] as string | undefined) ?? ''
  }
}

/** The profile filling itself as the person talks. Every field can be tapped and corrected. */
export default function ProfileCard({ draft, onEdit, flash, className, header }: {
  draft: Draft; onEdit: (f: Field, value: unknown) => void; flash: Field[]; className?: string; header?: ReactNode
}) {
  const { t: tr, lang } = useT('mola')
  const t = tr as unknown as TLike
  const [editing, setEditing] = useState<Field | null>(null)
  const fields = fieldsFor(draft.role)
  const done = fields.filter((f) => isFieldFilled(f, draft)).length

  return (
    <div className={cx('card overflow-hidden', className)}>
      {header ?? (
        <div className="border-b border-line px-4 pb-3 pt-4">
          <div className="eyebrow">{t('ob.card.eyebrow')}</div>
          <div className="mt-0.5 font-display text-[19px] font-semibold text-ink">{draft.name || t('ob.card.title')}</div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sand" role="progressbar" aria-valuenow={Math.round((done / fields.length) * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={t('ob.card.progress', { done, total: fields.length })}>
              <div className="h-full rounded-full bg-forest-600 transition-all duration-500" style={{ width: `${(done / fields.length) * 100}%` }} />
            </div>
            <span className="text-[12px] font-semibold tabular-nums text-ink-muted">{done}/{fields.length}</span>
          </div>
        </div>
      )}
      <div className="divide-y divide-line">
        {fields.map((f) => (
          <div key={f + (flash.includes(f) ? '-f' : '')} className={cx('px-4 py-2.5', flash.includes(f) && 'mola-flash')}>
            {editing === f
              ? <FieldEditor field={f} draft={draft} onDone={(v) => { if (v !== undefined) onEdit(f, v); setEditing(null) }} />
              : f === 'goals'
                ? <GoalsField draft={draft} onEdit={onEdit} />
                : (
                  <button type="button" onClick={() => setEditing(f)} className="group flex min-h-[40px] w-full items-center gap-3 text-left" aria-label={`${fieldLabel(t, f, draft.role)} : ${t('ob.card.edit')}`}>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{fieldLabel(t, f, draft.role)}</span>
                      <span className={cx('block truncate text-[15px]', isFieldFilled(f, draft) ? 'font-medium text-ink' : 'italic text-ink-faint')}>
                        {fieldValue(t, lang, f, draft) || t('ob.card.empty')}
                      </span>
                      {f === 'players' && draft.players.length > 0 && <span className="block truncate text-[12px] text-ink-muted">{draft.players.map((p) => p.name).join(', ')}</span>}
                    </span>
                    <Pencil size={14} className="shrink-0 text-ink-faint transition group-hover:text-forest-600" aria-hidden="true" />
                  </button>
                )}
          </div>
        ))}
      </div>
    </div>
  )
}

function GoalsField({ draft, onEdit }: { draft: Draft; onEdit: (f: Field, v: unknown) => void }) {
  const { t } = useT('mola')
  const order = [...goalsFor(draft.role), ...GOALS.filter((g) => !goalsFor(draft.role).includes(g))]
  return (
    <div>
      <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{t('ob.field.goals')}</span>
      <span className="mt-1.5 flex flex-wrap gap-1.5">
        {order.map((g) => {
          const on = draft.goals.includes(g)
          return (
            <button key={g} type="button" aria-pressed={on} onClick={() => onEdit('goals', on ? draft.goals.filter((x) => x !== g) : [...draft.goals, g])}
              className={cx('min-h-[36px] rounded-full border px-2.5 text-[12px] font-medium transition', on ? 'border-forest-600 bg-forest-600 text-cream' : 'border-line bg-paper text-ink-soft hover:border-forest-300')}>
              {t(`ob.goal.${g}`)}
            </button>
          )
        })}
      </span>
    </div>
  )
}

function FieldEditor({ field, draft, onDone }: { field: Field; draft: Draft; onDone: (v?: unknown) => void }) {
  const { t: tr, lang } = useT('mola')
  const t = tr as unknown as TLike
  const ref = useRef<HTMLInputElement & HTMLSelectElement>(null)
  const initial = field === 'players' ? draft.players.map((p) => `${p.number ? p.number + ' ' : ''}${p.name}`).join('\n') : String((draft[field as keyof Draft] as string | number | undefined) ?? '')
  const [v, setV] = useState(initial)
  useEffect(() => { ref.current?.focus() }, [])
  const id = `ob-edit-${field}`
  const label = fieldLabel(t, field, draft.role)
  const save = () => {
    if (field === 'format') return onDone(v ? (Number(v) as 5) : undefined)
    if (field === 'players') return onDone(v)
    onDone(v.trim() || undefined)
  }
  const options: [string, string][] | null =
    field === 'role' ? ROLES.map((r) => [r, t(`common:roles.${r}`)])
    : field === 'ageGroup' ? AGE_GROUPS.map((a) => [a, a])
    : field === 'format' ? FORMATS.map((n) => [String(n), t('ob.formatLabel', { n })])
    : field === 'position' ? POSITIONS.map((p) => [p, t(`common:positions.${p}`)])
    : field === 'lang' ? [['fr', t('ob.langName.fr')], ['en', t('ob.langName.en')]]
    : field === 'country' ? [...COUNTRY_CODES.map((c) => [c, countryName(c, lang)] as [string, string]).sort((a, b) => a[1].localeCompare(b[1], lang)), ...(draft.country && !COUNTRY_CODES.includes(draft.country) ? [[draft.country, draft.country] as [string, string]] : [])]
    : null
  return (
    <div className="py-0.5">
      <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-[0.12em] text-forest-600">{label}</label>
      <div className="mt-1 flex items-start gap-1.5">
        {options ? (
          <select id={id} ref={ref} className="input py-2 text-[15px]" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onDone() }}>
            <option value="">{t('ob.card.choose')}</option>
            {options.map(([val, lab]) => <option key={val} value={val}>{lab}</option>)}
          </select>
        ) : field === 'players' ? (
          <textarea id={id} className="input min-h-[120px] py-2 text-[14px]" value={v} onChange={(e) => setV(e.target.value)} placeholder={t('ob.playersPh')} />
        ) : (
          <input id={id} ref={ref} className="input py-2 text-[15px]" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onDone() }} />
        )}
        <button type="button" onClick={save} className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl bg-forest-600 text-cream" aria-label={t('ob.card.save')}><Check size={17} /></button>
        <button type="button" onClick={() => onDone()} className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl text-ink-muted hover:bg-sand" aria-label={t('ob.card.cancel')}><X size={17} /></button>
      </div>
    </div>
  )
}
