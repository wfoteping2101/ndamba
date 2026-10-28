import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { Modal } from '../../../ui'
import { useT } from '../../../i18n'
import { db } from '../../../lib/db'
import { sessionMinutes } from '../../../lib/actions'
import { useLiveQuery } from '../../../lib/hooks'
import { useSession } from '../../../lib/session'
import { fmtDate, todayISO, cx } from '../../../lib/util'
import { drillText } from '../../../content'
import type { Drill, Session } from '../../../lib/types'
import { drillBlock, drillDefaultMd, forTeam, sortSessions } from './helpers'
import { MdBadge } from './bits'
import { NewSessionModal } from './NewSessionModal'

/** "Ajouter à une séance": pick an upcoming session, or create a new one with this drill. */
export function AddToSessionModal({ drill, open, onClose, onDone }: { drill: Drill; open: boolean; onClose: () => void; onDone: (s: Session, created: boolean) => void }) {
  const { t, lang } = useT('training')
  const { team } = useSession()
  const [creating, setCreating] = useState(false)
  const upcoming = useLiveQuery(async () => (await db.sessions.where('date').aboveOrEqual(todayISO()).toArray()).filter(forTeam(team?.id)).sort(sortSessions).slice(0, 12), [team?.id], [] as Session[])

  const add = async (s: Session) => {
    await db.sessions.update(s.id, { blocks: [...s.blocks, drillBlock(drill)] })
    onClose()
    onDone({ ...s }, false)
  }

  return (
    <>
      <Modal open={open && !creating} onClose={onClose} title={t('detail.addTitle', { title: drillText(drill, lang).title })}>
        <button type="button" onClick={() => setCreating(true)} className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-dashed border-forest-300 bg-forest-50 p-3 text-left transition hover:border-forest-600">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-forest-600 text-cream"><Plus size={20} aria-hidden="true" /></span>
          <span><span className="block font-semibold text-ink">{t('detail.addNew')}</span><span className="block text-xs text-ink-muted">{t('detail.addNewHint')}</span></span>
        </button>
        <h3 className="mb-2 font-sans text-[13px] font-semibold tracking-normal text-ink-muted" style={{ fontStretch: '100%' }}>{t('detail.addExisting')}</h3>
        {upcoming.length === 0 ? (
          <p className="rounded-2xl bg-sand px-4 py-3 text-sm text-ink-muted">{t('detail.noUpcoming')}</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((s) => {
              const already = s.blocks.some((b) => b.drillId === drill.id)
              const fits = drill.md.includes(s.md)
              return (
                <li key={s.id}>
                  <button type="button" onClick={() => add(s)} className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl border border-line bg-paper p-3 text-left transition hover:border-forest-600">
                    <div className="w-14 shrink-0 text-center">
                      <div className="text-[11.5px] font-semibold text-ink-faint">{fmtDate(s.date, lang, { weekday: 'short' })}</div>
                      <div className="font-display text-xl font-semibold leading-none text-ink">{fmtDate(s.date, lang, { day: 'numeric' })}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><MdBadge md={s.md} />{fits && <span className="text-[11px] font-semibold text-ok-500">{t('detail.fitsDay')}</span>}</div>
                      <div className="truncate font-semibold text-ink">{s.title}</div>
                      <div className="flex gap-x-3 text-[12.5px] text-ink-muted"><span>{t('blocksCount', { count: s.blocks.length })}</span><span className="tabular-nums">{sessionMinutes(s)} {t('common:misc.minutes')}</span></div>
                    </div>
                    {already ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-faint"><Check size={14} aria-hidden="true" />{t('detail.already')}</span> : <Plus size={18} className="shrink-0 text-forest-600" aria-hidden="true" />}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Modal>
      <NewSessionModal open={open && creating} onClose={() => { setCreating(false); onClose() }}
        preset={{ drill, md: drillDefaultMd(drill), intention: drill.intentions[0] }}
        onCreated={(s) => { setCreating(false); onDone(s, true) }} />
    </>
  )
}

export function PillToggle<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="inline-flex rounded-full border border-line bg-paper p-0.5 text-xs font-semibold" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}
          className={cx('min-h-[32px] rounded-full px-3 transition', value === o.id ? 'bg-forest-600 text-cream' : 'text-ink-muted hover:text-ink')}>{o.label}</button>
      ))}
    </div>
  )
}
