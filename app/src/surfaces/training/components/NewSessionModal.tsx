import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PenLine } from 'lucide-react'
import { MolaMark } from '../../../ui/brand'
import { Field, Modal } from '../../../ui'
import { useT } from '../../../i18n'
import { db } from '../../../lib/db'
import { createAutoSession } from '../../../lib/actions'
import { GATES, coachLimited } from '../../../lib/config'
import { useLiveQuery } from '../../../lib/hooks'
import { useSession } from '../../../lib/session'
import { todayISO, cx } from '../../../lib/util'
import { INTENTIONS } from '../../../content'
import type { Drill, Intention, MD, Session } from '../../../lib/types'
import { MD_LIST, createSession, drillBlock, suggestMd } from './helpers'
import { UpgradeCard } from './bits'

export interface NewSessionPreset { date?: string; md?: MD; intention?: Intention; drill?: Drill; title?: string }

/** Free plan: how many sessions are left. Infinity on every paid plan (and on the demo). */
export function useSessionQuota() {
  const { profile } = useSession()
  const count = useLiveQuery(() => db.sessions.count(), [], 0)
  const free = coachLimited(profile?.plan)
  return { count, limited: free && count >= GATES.sessionsFree, left: free ? Math.max(0, GATES.sessionsFree - count) : Infinity }
}

export function NewSessionModal({ open, onClose, preset, onCreated }: { open: boolean; onClose: () => void; preset?: NewSessionPreset; onCreated?: (s: Session) => void }) {
  const { t, lang } = useT('training')
  const nav = useNavigate()
  const { team, teams } = useSession()
  const quota = useSessionQuota()
  const matchesAll = useLiveQuery(() => (team ? db.matches.where('teamId').equals(team.id).toArray() : db.matches.toArray()), [team?.id], [])
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayISO())
  const [md, setMd] = useState<MD>('MD-3')
  const [mdTouched, setMdTouched] = useState(false)
  const [intention, setIntention] = useState<Intention | ''>('')
  const [teamId, setTeamId] = useState<string>('')
  const [mode, setMode] = useState<'me' | 'mola'>('mola')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    const d = preset?.date ?? todayISO()
    setTitle(preset?.title ?? '')
    setDate(d)
    setMd(preset?.md ?? suggestMd(d, matchesAll, team?.ageGroup))
    setMdTouched(!!preset?.md)
    setIntention(preset?.intention ?? (preset?.drill?.intentions[0] ?? ''))
    setTeamId(team?.id ?? '')
    setMode(preset?.drill ? 'me' : 'mola')
    setBusy(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // follow the calendar until the coach picks a day type himself
  const onDate = (d: string) => { setDate(d); if (!mdTouched && d) setMd(suggestMd(d, matchesAll, team?.ageGroup)) }

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (busy || !date) return
    setBusy(true)
    const ageGroup = teams.find((x) => x.id === teamId)?.ageGroup
    const name = title.trim() || t(`mdTitle.${md}`)
    let s: Session
    if (mode === 'mola' && !preset?.drill) {
      s = await createAutoSession({ md, date, teamId: teamId || undefined, intention: intention || undefined, ageGroup, lang, title: name, createdBy: 'mola' })
    } else {
      s = await createSession({ title: name, date, md, intention: intention || undefined, teamId: teamId || undefined, blocks: preset?.drill ? [drillBlock(preset.drill)] : [] })
    }
    onClose()
    if (onCreated) onCreated(s)
    else nav(`/app/seances/${s.id}`)
  }

  if (open && quota.limited) {
    return <Modal open={open} onClose={onClose} title={t('newSession.title')}><UpgradeCard /></Modal>
  }

  return (
    <Modal open={open} onClose={onClose} title={preset?.drill ? t('newSession.titleWith', { drill: preset.drill.id }) : t('newSession.title')}
      footer={<><button type="button" className="btn-ghost" onClick={onClose}>{t('common:actions.cancel')}</button><button type="submit" form="new-session" className="btn-primary" disabled={busy || !date}>{mode === 'mola' && !preset?.drill ? <><MolaMark size={16} aria-hidden="true" />{t('newSession.submitMola')}</> : t('newSession.submit')}</button></>}>
      <form id="new-session" onSubmit={submit}>
        <Field label={t('fields.title')} htmlFor="ns-title" hint={t('newSession.titleHint', { title: t(`mdTitle.${md}`) })}>
          <input id="ns-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t(`mdTitle.${md}`)} maxLength={80} />
        </Field>
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Field label={t('fields.date')} htmlFor="ns-date">
            <input id="ns-date" type="date" className="input" value={date} required onChange={(e) => onDate(e.target.value)} />
          </Field>
          <Field label={t('fields.team')} htmlFor="ns-team">
            <select id="ns-team" className="input" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              {teams.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              <option value="">{t('fields.noTeam')}</option>
            </select>
          </Field>
        </div>
        <Field label={t('fields.md')} hint={t(`mdHint.${md}`)}>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('fields.md')}>
            {MD_LIST.map((m) => (
              <button key={m} type="button" aria-pressed={md === m} title={t(`mdName.${m}`)} onClick={() => { setMd(m); setMdTouched(true) }}
                className={cx('chip min-h-[38px] cursor-pointer px-3', md === m && 'chip-on')}>{m === 'youth' ? t('common:md.youth') : m}</button>
            ))}
          </div>
        </Field>
        <Field label={t('fields.intention')} htmlFor="ns-int" hint={intention ? t(`common:intentionsHint.${intention}`) : t('fields.intentionHint')}>
          <select id="ns-int" className="input" value={intention} onChange={(e) => setIntention(e.target.value as Intention | '')}>
            <option value="">{t('fields.anyIntention')}</option>
            {INTENTIONS.map((i) => <option key={i} value={i}>{t(`common:intentions.${i}`)}</option>)}
          </select>
        </Field>

        {!preset?.drill && (
          <fieldset>
            <legend className="label">{t('newSession.how')}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {([['mola', MolaMark], ['me', PenLine]] as const).map(([k, Icon]) => (
                <label key={k} className={cx('flex cursor-pointer gap-3 rounded-[14px] border p-3 transition has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-forest-500', mode === k ? 'border-forest-600 bg-forest-50' : 'border-line hover:border-ink-faint')}>
                  <input type="radio" name="ns-mode" className="sr-only" checked={mode === k} onChange={() => setMode(k)} />
                  <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-xl', mode === k ? 'bg-forest-600 text-cream' : 'bg-sand text-ink-soft')}><Icon size={18} aria-hidden="true" /></span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink">{t(`newSession.${k}`)}</span>
                    <span className="block text-xs text-ink-muted">{t(`newSession.${k}Hint`)}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {quota.left !== Infinity && <p className="mt-3 text-xs text-ink-faint">{t('upgrade.left', { count: quota.left })}</p>}
      </form>
    </Modal>
  )
}
