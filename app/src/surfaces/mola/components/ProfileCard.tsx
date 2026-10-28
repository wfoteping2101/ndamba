import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import { NdambaMark } from '../../../ui/brand'
import { useT } from '../../../i18n'
import type { Role } from '../../../lib/types'
import { cx } from '../../../lib/util'
import {
  AGE_GROUPS, CHILD_LEVELS, COUNTRY_CODES, FORMATS, GOALS, POSITIONS, ROLES, countryName, fieldsFor, goalsFor, isFieldFilled, type Draft, type Field,
} from '../onboarding'
import './mola.css'

export type TLike = (key: string, opts?: Record<string, unknown>) => string

export function fieldLabel(t: TLike, f: Field, role?: Role) {
  if (f === 'club') return t(role === 'player' ? 'ob.field.clubPlayer' : role === 'analyst' ? 'ob.field.clubAnalyst' : role === 'manager' || role === 'federation' ? 'ob.field.org' : 'ob.field.club')
  if (f === 'ageGroup' && role === 'parent') return t('ob.field.childAge')
  return t(`ob.field.${f}`)
}

/** "Seniors" and "Pro" read as words; the U-categories stay as they are. */
export function levelLabel(t: TLike, a?: string) {
  if (!a) return ''
  return a === 'Seniors' || a === 'Pro' ? t(`ob.level.${a}`) : a
}

export function fieldValue(t: TLike, lang: 'fr' | 'en', f: Field, d: Draft): string {
  switch (f) {
    case 'ageGroup': return levelLabel(t, d.ageGroup)
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

/** The profile as a club licence that prints itself while the person talks: name and role on the green band,
 *  the rest below. Every field can be tapped and corrected. `bare` drops the band (the phone shows its own summary). */
export default function ProfileCard({ draft, onEdit, flash, className, bare = false, footer }: {
  draft: Draft; onEdit: (f: Field, value: unknown) => void; flash: Field[]; className?: string; bare?: boolean; footer?: ReactNode
}) {
  const { t: tr, lang } = useT('mola')
  const t = tr as unknown as TLike
  const [editing, setEditing] = useState<Field | null>(null)
  const fields = fieldsFor(draft.role)
  const done = fields.filter((f) => isFieldFilled(f, draft)).length
  const pct = Math.round((done / fields.length) * 100)
  const wide = (f: Field) => f === 'players' || f === 'goals' || f === 'teamName' || f === 'club'
  // half-width fields first (in pairs), the wide ones (players, goals) below; an odd one out takes the full row
  const all = bare ? fields : fields.filter((f) => f !== 'name' && f !== 'role')
  const halves = all.filter((f) => !wide(f))
  const grid = [...all.filter((f) => f === 'teamName' || f === 'club'), ...halves, ...all.filter((f) => f === 'players' || f === 'goals')]
  const full = (f: Field) => wide(f) || (halves.length % 2 === 1 && f === halves[halves.length - 1])
  const fl = (f: Field) => flash.includes(f)
  const editor = (f: Field) => <FieldEditor field={f} draft={draft} onDone={(v) => { if (v !== undefined) onEdit(f, v); setEditing(null) }} />

  return (
    <div className={cx('overflow-hidden rounded-[22px] border border-line bg-paper', className)}>
      {!bare && (
        <div className="relative overflow-hidden bg-forest-600 px-5 pb-5 pt-4 text-cream">
          <CentreCircle />
          <div className="relative flex items-center justify-between gap-3">
            <span className="text-[13px] font-semibold text-cream/75">{t('ob.card.eyebrow')}</span>
            <NdambaMark size={22} tone="light" />
          </div>
          {editing === 'name' || editing === 'role' ? (
            <div className="relative mt-3 rounded-xl bg-paper p-3 text-ink">{editor(editing)}</div>
          ) : (
            <>
              <button type="button" onClick={() => setEditing('name')} aria-label={`${fieldLabel(t, 'name', draft.role)} : ${t('ob.card.edit')}`}
                className={cx('group relative mt-4 block max-w-full rounded-lg text-left', fl('name') && 'mola-flash')}>
                <span className={cx('block truncate font-display text-[27px] leading-[1.1]', draft.name ? 'text-cream' : 'text-cream/45')}>{draft.name || t('ob.card.namePh')}</span>
              </button>
              <button type="button" onClick={() => setEditing('role')} aria-label={`${fieldLabel(t, 'role', draft.role)} : ${t('ob.card.edit')}`}
                className={cx('relative mt-1 block max-w-full rounded-lg text-left text-[14.5px]', draft.role ? 'text-cream/90' : 'text-cream/45', fl('role') && 'mola-flash')}>
                {draft.role ? t(`common:roles.${draft.role}`) : t('ob.card.rolePh')}
              </button>
            </>
          )}
          <div className="relative mt-5 flex items-center gap-3">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t('ob.card.progress', { done, total: fields.length })}>
              <div className="h-full rounded-full bg-cream transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[12.5px] font-semibold tabular-nums text-cream/75">{t('ob.card.count', { done, total: fields.length })}</span>
          </div>
        </div>
      )}

      {editing && editing !== 'name' && editing !== 'role' && <div className="border-b border-line bg-forest-50/50 px-4 py-3">{editor(editing)}</div>}
      <div className="grid grid-cols-2 gap-px bg-line">
        {grid.map((f) => (
          <div key={f + (fl(f) ? '-f' : '')} className={cx('min-w-0 bg-paper', full(f) ? 'col-span-2' : '', fl(f) && 'mola-flash')}>
            {f === 'goals' ? <GoalsField draft={draft} onEdit={onEdit} />
              : (
                <button type="button" onClick={() => setEditing(f)} aria-pressed={editing === f} className={cx('group flex min-h-[60px] w-full items-start gap-2 px-4 py-2.5 text-left transition hover:bg-cream/70', editing === f && 'bg-forest-50/60')} aria-label={`${fieldLabel(t, f, draft.role)} : ${t('ob.card.edit')}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-semibold text-ink-muted">{fieldLabel(t, f, draft.role)}</span>
                    <span className={cx('block truncate text-[15px] leading-snug', isFieldFilled(f, draft) ? 'font-medium text-ink' : 'text-ink-faint')}>
                      {fieldValue(t, lang, f, draft) || t('ob.card.empty')}
                    </span>
                    {f === 'players' && draft.players.length > 0 && <span className="block truncate text-[12.5px] text-ink-muted">{draft.players.map((p) => p.name).join(', ')}</span>}
                  </span>
                  <Pencil size={13} className="mt-1 shrink-0 text-ink-faint opacity-60 transition group-hover:text-forest-600 group-hover:opacity-100" aria-hidden="true" />
                </button>
              )}
          </div>
        ))}
      </div>
      {footer}
    </div>
  )
}

/** The centre circle and halfway line of a pitch, in chalk, at the corner of the licence. */
function CentreCircle() {
  return (
    <svg aria-hidden="true" viewBox="0 0 160 160" className="pointer-events-none absolute -bottom-24 -right-16 h-52 w-52 text-cream/[0.09]">
      <circle cx="80" cy="80" r="56" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <line x1="80" y1="0" x2="80" y2="160" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="80" cy="80" r="4" fill="currentColor" />
    </svg>
  )
}

function GoalsField({ draft, onEdit }: { draft: Draft; onEdit: (f: Field, v: unknown) => void }) {
  const { t } = useT('mola')
  const order = [...goalsFor(draft.role), ...GOALS.filter((g) => !goalsFor(draft.role).includes(g))]
  const lid = useId()
  return (
    <div className="px-4 py-3">
      <div className="text-[12.5px] font-semibold text-ink-muted" id={lid}>{t('ob.field.goals')}</div>
      <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-labelledby={lid}>
        {order.map((g) => {
          const on = draft.goals.includes(g)
          return (
            <button key={g} type="button" aria-pressed={on} onClick={() => onEdit('goals', on ? draft.goals.filter((x) => x !== g) : [...draft.goals, g])}
              className={cx('inline-flex min-h-[36px] items-center gap-1 rounded-full border px-3 text-[13px] font-medium transition', on ? 'border-forest-600 bg-forest-600 text-cream' : 'border-line bg-paper text-ink-soft hover:border-forest-300')}>
              {on && <Check size={12} strokeWidth={3} aria-hidden="true" />}{t(`ob.goal.${g}`)}
            </button>
          )
        })}
      </div>
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
    : field === 'ageGroup' ? [...(draft.role === 'parent' ? CHILD_LEVELS : AGE_GROUPS).map((a) => [a, levelLabel(t, a)] as [string, string]), ...(draft.ageGroup && !AGE_GROUPS.includes(draft.ageGroup) ? [[draft.ageGroup, draft.ageGroup] as [string, string]] : [])]
    : field === 'format' ? FORMATS.map((n) => [String(n), t('ob.formatLabel', { n })])
    : field === 'position' ? POSITIONS.map((p) => [p, t(`common:positions.${p}`)])
    : field === 'lang' ? [['fr', t('ob.langName.fr')], ['en', t('ob.langName.en')]]
    : field === 'country' ? [...COUNTRY_CODES.map((c) => [c, countryName(c, lang)] as [string, string]).sort((a, b) => a[1].localeCompare(b[1], lang)), ...(draft.country && !COUNTRY_CODES.includes(draft.country) ? [[draft.country, draft.country] as [string, string]] : [])]
    : null
  return (
    <div>
      <label htmlFor={id} className="text-[12.5px] font-semibold text-forest-600">{label}</label>
      <div className="mt-1 flex items-start gap-1.5">
        {options ? (
          <select id={id} ref={ref} className="input py-2 text-[15px]" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onDone() }}>
            <option value="">{t('ob.card.choose')}</option>
            {options.map(([val, lab]) => <option key={val} value={val}>{lab}</option>)}
          </select>
        ) : field === 'players' ? (
          <textarea id={id} className="input min-h-[120px] py-2 text-[14.5px]" value={v} onChange={(e) => setV(e.target.value)} placeholder={t('ob.playersPh')} />
        ) : (
          <input id={id} ref={ref} className="input py-2 text-[15px]" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onDone() }} />
        )}
        <button type="button" onClick={save} className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl bg-forest-600 text-cream hover:bg-forest-700" aria-label={t('ob.card.save')}><Check size={17} aria-hidden="true" /></button>
        <button type="button" onClick={() => onDone()} className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl text-ink-muted hover:bg-sand" aria-label={t('ob.card.cancel')}><X size={17} aria-hidden="true" /></button>
      </div>
    </div>
  )
}
