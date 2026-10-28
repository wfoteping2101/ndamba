import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ClipboardList, Dumbbell, Plus, Sparkles } from 'lucide-react'
import { EmptyState, PageHeader, Tabs } from '../../ui'
import { useT } from '../../i18n'
import { db } from '../../lib/db'
import { sessionMinutes } from '../../lib/actions'
import { useDocumentTitle, useLiveQuery } from '../../lib/hooks'
import { useSession } from '../../lib/session'
import { addDays, fmtDate, nowISO, todayISO, uid, weekStart } from '../../lib/util'
import type { Session } from '../../lib/types'
import { SessionCard } from './components/SessionCard'
import { NewSessionModal, useSessionQuota } from './components/NewSessionModal'
import { ConfirmModal, UpgradeCard, useToast } from './components/bits'
import { CreateTeamCard } from './components/CreateTeamCard'
import { forTeam, sessionLoad, sortSessions, weekKeyLabel } from './components/helpers'

export default function Sessions() {
  const { t, lang } = useT('training')
  useDocumentTitle(t('sessions.docTitle'))
  const { team } = useSession()
  const quota = useSessionQuota()
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [creating, setCreating] = useState(false)
  const [toDelete, setToDelete] = useState<Session | null>(null)
  const { toast, toastNode } = useToast()
  const all = useLiveQuery(async () => (await db.sessions.toArray()).filter(forTeam(team?.id)).sort(sortSessions), [team?.id], null as Session[] | null)
  const today = todayISO()

  const groups = useMemo(() => {
    const list = (all ?? []).filter((s) => (tab === 'upcoming' ? s.date >= today : s.date < today))
    if (tab === 'past') list.reverse()
    const map = new Map<string, Session[]>()
    for (const s of list) { const k = weekStart(s.date); map.set(k, [...(map.get(k) ?? []), s]) }
    return [...map.entries()]
  }, [all, tab, today])
  const counts = { upcoming: (all ?? []).filter((s) => s.date >= today).length, past: (all ?? []).filter((s) => s.date < today).length }

  const duplicate = async (s: Session) => {
    if (quota.limited) { setCreating(true); return }
    const copy: Session = { ...s, id: uid('se_'), title: t('sessions.copyTitle', { title: s.title }), date: s.date < today ? today : s.date, blocks: s.blocks.map((b) => ({ ...b, id: uid('bl_') })), createdBy: 'user', createdAt: nowISO() }
    await db.sessions.put(copy)
    toast({ text: t('sessions.duplicated'), to: `/app/seances/${copy.id}`, action: t('common:actions.open') })
  }
  const remove = async (s: Session) => { await db.sessions.delete(s.id); toast({ text: t('sessions.deleted', { title: s.title }) }) }

  const weekTitle = (k: string) => {
    const key = weekKeyLabel(k, today)
    const range = `${fmtDate(k, lang, { day: 'numeric', month: 'short' })} ${t('to')} ${fmtDate(addDays(k, 6), lang, { day: 'numeric', month: 'short' })}`
    return { title: key === 'weekOf' ? t('week.weekOf', { date: fmtDate(k, lang, { day: 'numeric', month: 'long' }) }) : t(`week.${key}`), range }
  }

  return (
    <div>
      <PageHeader eyebrow={t('sessions.eyebrow')} title={t('sessions.title')} subtitle={t('sessions.subtitle')}
        actions={<>
          <Link to="/app/semaine" className="btn-outline"><CalendarDays size={17} aria-hidden="true" />{t('sessions.toWeek')}</Link>
          <button type="button" className="btn-primary" onClick={() => setCreating(true)}><Plus size={17} aria-hidden="true" />{t('sessions.new')}</button>
        </>} />

      {!team && <CreateTeamCard />}
      {quota.limited && <div className="mb-6"><UpgradeCard /></div>}

      {all === null ? null : all.length === 0 ? (
        <EmptyState icon={<ClipboardList size={36} />} title={t('sessions.emptyTitle')} body={t('sessions.emptyBody')}
          action={<div className="flex flex-wrap justify-center gap-2">
            <button type="button" className="btn-primary" onClick={() => setCreating(true)}><Sparkles size={16} aria-hidden="true" />{t('sessions.emptyCta')}</button>
            <Link to="/app/exercices" className="btn-outline"><Dumbbell size={16} aria-hidden="true" />{t('sessions.browse')}</Link>
          </div>} />
      ) : (
        <>
          <Tabs className="mb-6 w-full sm:w-max" value={tab} onChange={setTab}
            tabs={[{ id: 'upcoming', label: `${t('sessions.upcoming')} · ${counts.upcoming}` }, { id: 'past', label: `${t('sessions.past')} · ${counts.past}` }]} />
          {groups.length === 0 ? (
            <EmptyState icon={<CalendarDays size={32} />} title={tab === 'upcoming' ? t('sessions.noUpcoming') : t('sessions.noPast')} body={tab === 'upcoming' ? t('sessions.noUpcomingBody') : undefined}
              action={tab === 'upcoming' ? <Link to="/app/semaine" className="btn-primary">{t('week.plan')}</Link> : undefined} />
          ) : groups.map(([k, items]) => {
            const w = weekTitle(k)
            const mins = items.reduce((a, s) => a + sessionMinutes(s), 0)
            const load = items.reduce((a, s) => a + sessionLoad(s), 0)
            return (
              <section key={k} className="mb-8">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line pb-2">
                  <h2 className="font-display text-xl font-semibold text-ink">{w.title} <span className="text-sm font-normal text-ink-faint">{w.range}</span></h2>
                  <span className="text-xs text-ink-muted">{t('sessions.weekSummary', { count: items.length, minutes: mins, load })}</span>
                </div>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {items.map((s) => <SessionCard key={s.id} s={s} onDuplicate={() => duplicate(s)} onDelete={() => setToDelete(s)} />)}
                </div>
              </section>
            )
          })}
        </>
      )}

      <NewSessionModal open={creating} onClose={() => setCreating(false)} />
      <ConfirmModal open={!!toDelete} onClose={() => setToDelete(null)} danger title={t('sessions.deleteTitle')} confirm={t('common:actions.delete')}
        body={toDelete ? t('sessions.deleteBody', { title: toDelete.title, date: fmtDate(toDelete.date, lang, { weekday: 'long', day: 'numeric', month: 'long' }) }) : ''}
        onConfirm={() => toDelete && remove(toDelete)} />
      {toastNode}
    </div>
  )
}
