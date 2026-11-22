// Group form (create and edit), new game form, invite box.
import { useId, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { LocateFixed, MessageCircle, X } from 'lucide-react'
import { Field, Modal, Segmented, Toggle } from '../../../ui'
import { useT } from '../../../i18n'
import { useSession } from '../../../lib/session'
import { whatsappLink } from '../../../lib/actions'
import { PICKUP } from '../../../lib/config'
import type { PickupGroup, PickupTier } from '../../../lib/types'
import { addDays, fmtDate } from '../../../lib/util'
import { createGame, createGroup, localISO, nextWeekday, updateGroup, type GroupInput } from '../../../lib/pickup'
import { CopyButton, dayName, PlanGate, SW, useHostPlan } from './kit'

const empty = (): GroupInput => ({
  name: '', venue: '', city: '', perSide: 5, defaultDay: 0, defaultTime: '08:00', defaultFee: 1000, currency: 'XAF',
  minTier: undefined, allowGuests: true, ratingsOn: true, payHandles: { cash: true },
})

function fromGroup(g: PickupGroup): GroupInput {
  return {
    name: g.name, venue: g.venue, city: g.city ?? '', lat: g.lat, lng: g.lng, perSide: g.perSide, defaultDay: g.defaultDay, defaultTime: g.defaultTime,
    defaultFee: g.defaultFee ?? 0, currency: g.currency, minTier: g.minTier, allowGuests: g.allowGuests, ratingsOn: g.ratingsOn, payHandles: { ...g.payHandles },
  }
}

/** The group settings form. With a group: edits it. Without: creates one with me as host. */
export function GroupForm({ group, onDone, submitLabel }: { group?: PickupGroup; onDone: (id: string) => void; submitLabel?: string }) {
  const { t, lang } = useT('pickup')
  const { profile } = useSession()
  const [v, setV] = useState<GroupInput>(() => (group ? fromGroup(group) : empty()))
  const [geo, setGeo] = useState<'idle' | 'busy' | 'error' | 'unsupported'>('idle')
  const [busy, setBusy] = useState(false)
  const id = useId()
  const set = <K extends keyof GroupInput>(k: K, val: GroupInput[K]) => setV((x) => ({ ...x, [k]: val }))

  const locate = () => {
    if (!('geolocation' in navigator)) { setGeo('unsupported'); return }
    setGeo('busy')
    navigator.geolocation.getCurrentPosition(
      (p) => { setV((x) => ({ ...x, lat: Math.round(p.coords.latitude * 1e5) / 1e5, lng: Math.round(p.coords.longitude * 1e5) / 1e5 })); setGeo('idle') },
      () => setGeo('error'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!v.name.trim() || !v.venue.trim()) return
    setBusy(true)
    const clean: GroupInput = {
      ...v, name: v.name.trim(), venue: v.venue.trim(), city: v.city?.trim() || undefined,
      perSide: Math.max(2, Math.min(11, Math.round(v.perSide || 5))), defaultFee: Math.max(0, Number(v.defaultFee) || 0),
      payHandles: { momo: v.payHandles.momo?.trim() || undefined, orange: v.payHandles.orange?.trim() || undefined, cash: !!v.payHandles.cash },
    }
    try {
      if (group) { await updateGroup(group.id, clean); onDone(group.id) }
      else { const g = await createGroup(clean, { name: profile?.name || t('common.me') }); onDone(g.id) }
    } finally { setBusy(false) }
  }

  const tiers: { id: PickupTier | 'none'; label: string }[] = [
    { id: 'none', label: t('tier.noMin') }, { id: 'bronze', label: t('tier.bronze') }, { id: 'silver', label: t('tier.silver') }, { id: 'gold', label: t('tier.gold') },
  ]

  return (
    <form onSubmit={submit} className="space-y-1">
      <Field label={t('form.name')} htmlFor={`${id}-name`} hint={t('form.nameHint')}>
        <input id={`${id}-name`} className="input" required value={v.name} onChange={(e) => set('name', e.target.value)} placeholder={t('form.namePh')} />
      </Field>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label={t('form.venue')} htmlFor={`${id}-venue`}>
          <input id={`${id}-venue`} className="input" required value={v.venue} onChange={(e) => set('venue', e.target.value)} placeholder={t('form.venuePh')} />
        </Field>
        <Field label={t('form.city')} htmlFor={`${id}-city`}>
          <input id={`${id}-city`} className="input" value={v.city ?? ''} onChange={(e) => set('city', e.target.value)} placeholder="Douala" />
        </Field>
      </div>
      <Field label={t('form.position')} hint={t('form.positionHint', { m: PICKUP.checkinRadiusM })}>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-outline" onClick={locate} disabled={geo === 'busy'}>
            <LocateFixed size={17} strokeWidth={SW} aria-hidden="true" />{geo === 'busy' ? t('form.locating') : v.lat !== undefined ? t('form.relocate') : t('form.locate')}
          </button>
          {v.lat !== undefined && v.lng !== undefined && (
            <span className="inline-flex items-center gap-1 rounded-full bg-forest-50 py-1 pl-3 pr-1 text-[13px] font-semibold text-forest-700">
              {t('form.saved', { lat: v.lat.toFixed(4), lng: v.lng.toFixed(4) })}
              <button type="button" className="grid h-8 w-8 place-items-center rounded-full hover:bg-forest-100" onClick={() => setV((x) => ({ ...x, lat: undefined, lng: undefined }))} aria-label={t('form.clearPosition')}><X size={15} strokeWidth={SW} /></button>
            </span>
          )}
        </div>
        {(geo === 'error' || geo === 'unsupported') && <p className="mt-1.5 text-[13px] text-clay-700" role="alert">{t(geo === 'error' ? 'form.geoError' : 'form.geoUnsupported')}</p>}
      </Field>
      <div className="grid gap-x-4 sm:grid-cols-3">
        <Field label={t('form.perSide')} htmlFor={`${id}-side`} hint={t('form.perSideHint', { n: v.perSide || 5 })}>
          <input id={`${id}-side`} className="input" type="number" inputMode="numeric" min={2} max={11} value={v.perSide} onChange={(e) => set('perSide', Number(e.target.value))} />
        </Field>
        <Field label={t('form.day')} htmlFor={`${id}-day`}>
          <select id={`${id}-day`} className="input" value={v.defaultDay ?? ''} onChange={(e) => set('defaultDay', e.target.value === '' ? undefined : Number(e.target.value))}>
            <option value="">{t('form.noDay')}</option>
            {[1, 2, 3, 4, 5, 6, 0].map((d) => <option key={d} value={d}>{cap(dayName(d, lang))}</option>)}
          </select>
        </Field>
        <Field label={t('form.time')} htmlFor={`${id}-time`}>
          <input id={`${id}-time`} className="input" type="time" value={v.defaultTime ?? ''} onChange={(e) => set('defaultTime', e.target.value || undefined)} />
        </Field>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3">
        <Field label={t('form.fee')} htmlFor={`${id}-fee`} hint={t('form.feeHint')}>
          <input id={`${id}-fee`} className="input" type="number" inputMode="decimal" min={0} step={v.currency === 'XAF' ? 100 : 0.5} value={v.defaultFee ?? 0} onChange={(e) => set('defaultFee', Number(e.target.value))} />
        </Field>
        <Field label={t('form.currency')} htmlFor={`${id}-cur`}>
          <select id={`${id}-cur`} className="input" value={v.currency} onChange={(e) => set('currency', e.target.value as GroupInput['currency'])}>
            <option value="XAF">FCFA</option><option value="USD">USD</option><option value="EUR">EUR</option>
          </select>
        </Field>
      </div>
      <Field label={t('form.minTier')} hint={t('form.minTierHint')}>
        <Segmented options={tiers} value={v.minTier ?? 'none'} onChange={(x) => set('minTier', x === 'none' ? undefined : x)} />
      </Field>
      <div className="flex flex-col pb-3 sm:flex-row sm:gap-8">
        <Toggle checked={v.allowGuests} onChange={(x) => set('allowGuests', x)} label={t('form.guests')} />
        <Toggle checked={v.ratingsOn} onChange={(x) => set('ratingsOn', x)} label={t('form.ratings')} />
      </div>
      <fieldset className="rounded-card border border-line px-4 pb-1 pt-3">
        <legend className="px-1 text-[13.5px] font-semibold text-ink-soft">{t('form.payTitle')}</legend>
        <p className="mb-3 text-[13px] text-ink-muted">{t('form.payHint')}</p>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label={t('form.momo')} htmlFor={`${id}-momo`}>
            <input id={`${id}-momo`} className="input" type="tel" inputMode="tel" value={v.payHandles.momo ?? ''} onChange={(e) => set('payHandles', { ...v.payHandles, momo: e.target.value })} placeholder="+237 6.. .. .. .." />
          </Field>
          <Field label={t('form.orange')} htmlFor={`${id}-orange`}>
            <input id={`${id}-orange`} className="input" type="tel" inputMode="tel" value={v.payHandles.orange ?? ''} onChange={(e) => set('payHandles', { ...v.payHandles, orange: e.target.value })} placeholder="+237 6.. .. .. .." />
          </Field>
        </div>
        <Toggle checked={!!v.payHandles.cash} onChange={(x) => set('payHandles', { ...v.payHandles, cash: x })} label={t('form.cash')} />
      </fieldset>
      <div className="flex justify-end pt-4">
        <button type="submit" className="btn-primary btn-lg w-full sm:w-auto" disabled={busy || !v.name.trim() || !v.venue.trim()}>{submitLabel ?? (group ? t('form.save') : t('form.create'))}</button>
      </div>
    </form>
  )
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Create a group in a dialog. Beyond the free groups, the organiser plan is needed. */
export function CreateGroupModal({ open, onClose, hostedCount }: { open: boolean; onClose: () => void; hostedCount: number }) {
  const { t } = useT('pickup')
  const nav = useNavigate()
  const host = useHostPlan()
  const blocked = hostedCount >= PICKUP.freeGroupsPerPlayer && !host.active
  return (
    <Modal open={open} onClose={onClose} title={t('form.createTitle')} wide>
      {blocked
        ? <PlanGate what={t('plan.what.groups', { n: PICKUP.freeGroupsPerPlayer })}><span /></PlanGate>
        : <GroupForm onDone={(id) => { onClose(); nav(`/app/pickup/${id}`) }} />}
    </Modal>
  )
}

/** A new game of the group: date, time, cap, RSVP deadline, fee. */
export function NewGameModal({ open, onClose, group }: { open: boolean; onClose: () => void; group: PickupGroup }) {
  const { t, lang } = useT('pickup')
  const nav = useNavigate()
  const id = useId()
  const initial = () => {
    const date = group.defaultDay !== undefined ? nextWeekday(group.defaultDay) : addDays(fmtISO(new Date()), 1)
    const time = group.defaultTime || '08:00'
    const k = new Date(`${date}T${time}:00`).getTime() - 2 * 3600000
    const dl = new Date(k)
    return { date, time, cap: group.perSide * 2, fee: group.defaultFee ?? 0, dlDate: fmtISO(dl), dlTime: `${String(dl.getHours()).padStart(2, '0')}:${String(dl.getMinutes()).padStart(2, '0')}`, note: '' }
  }
  const [v, setV] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) setV(initial()) }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const g = await createGame(group.id, { date: v.date, time: v.time, cap: v.cap, fee: v.fee, rsvpDeadline: v.dlDate && v.dlTime ? localISO(v.dlDate, v.dlTime) : undefined, note: v.note })
    setBusy(false)
    onClose()
    nav(`/app/pickup/match/${g.id}`)
  }
  return (
    <Modal open={open} onClose={onClose} title={t('newGame.title')}
      footer={<><button type="button" className="btn-ghost" onClick={onClose}>{t('common.cancel')}</button><button type="submit" form={`${id}-f`} className="btn-primary" disabled={busy || !v.date || !v.time}>{t('newGame.create')}</button></>}>
      <form id={`${id}-f`} onSubmit={submit}>
        <div className="grid grid-cols-2 gap-x-3">
          <Field label={t('newGame.date')} htmlFor={`${id}-d`}><input id={`${id}-d`} className="input" type="date" required value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} /></Field>
          <Field label={t('newGame.time')} htmlFor={`${id}-t`}><input id={`${id}-t`} className="input" type="time" required value={v.time} onChange={(e) => setV({ ...v, time: e.target.value })} /></Field>
        </div>
        <p className="-mt-2 mb-4 text-[13px] text-ink-muted">{v.date ? cap(fmtDate(v.date, lang, { weekday: 'long', day: 'numeric', month: 'long' })) : ''}</p>
        <div className="grid grid-cols-2 gap-x-3">
          <Field label={t('newGame.cap')} htmlFor={`${id}-c`} hint={t('newGame.capHint', { n: group.perSide })}><input id={`${id}-c`} className="input" type="number" inputMode="numeric" min={2} max={40} value={v.cap} onChange={(e) => setV({ ...v, cap: Number(e.target.value) })} /></Field>
          <Field label={t('newGame.fee', { cur: group.currency === 'XAF' ? 'FCFA' : group.currency })} htmlFor={`${id}-f2`}><input id={`${id}-f2`} className="input" type="number" inputMode="decimal" min={0} value={v.fee} onChange={(e) => setV({ ...v, fee: Number(e.target.value) })} /></Field>
        </div>
        <Field label={t('newGame.deadline')} hint={t('newGame.deadlineHint')}>
          <div className="grid grid-cols-2 gap-3">
            <input aria-label={t('newGame.deadlineDate')} className="input" type="date" value={v.dlDate} onChange={(e) => setV({ ...v, dlDate: e.target.value })} />
            <input aria-label={t('newGame.deadlineTime')} className="input" type="time" value={v.dlTime} onChange={(e) => setV({ ...v, dlTime: e.target.value })} />
          </div>
        </Field>
        <Field label={t('newGame.note')} htmlFor={`${id}-n`}><input id={`${id}-n`} className="input" value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} placeholder={t('newGame.notePh')} /></Field>
      </form>
    </Modal>
  )
}

function fmtISO(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

/** The invite link, a copy button and a WhatsApp share (the organiser sends it). */
export function InviteBox({ group }: { group: PickupGroup }) {
  const { t, lang } = useT('pickup')
  const url = `${location.origin}/rejoindre/${group.inviteCode}`
  const when = group.defaultDay !== undefined ? `${dayName(group.defaultDay, lang)}${group.defaultTime ? ` ${t('common.at')} ${group.defaultTime}` : ''}` : ''
  const text = t('invite.text', { name: group.name, venue: group.venue, when: when ? t('invite.when', { when }) : '', url, code: group.inviteCode })
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 rounded-control border border-line bg-cream px-3 py-2">
        <code className="min-w-0 flex-1 break-all text-[14px] text-ink">{url}</code>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <CopyButton text={url} label={t('invite.copy')} small={false} />
        <a className="btn-primary" href={whatsappLink(text)} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} strokeWidth={SW} aria-hidden="true" />{t('invite.whatsapp')}</a>
      </div>
      <p className="mt-3 text-[13px] leading-snug text-ink-muted">{t('invite.code', { code: group.inviteCode })} {t('invite.honest')}</p>
    </div>
  )
}
