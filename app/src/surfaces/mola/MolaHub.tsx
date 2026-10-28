import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { MolaMark } from '../../ui/brand'
import { useT } from '../../i18n'
import { db } from '../../lib/db'
import { useDocumentTitle, useLiveQuery } from '../../lib/hooks'
import { useSession } from '../../lib/session'
import type { TaskStatus } from '../../lib/types'
import { cx } from '../../lib/util'
import { Tabs } from '../../ui'
import { BRAND } from '../../lib/config'
import ChatPanel from './components/ChatPanel'
import MolaAvatar from './components/MolaAvatar'
import Suggestions from './components/Suggestions'
import TaskCard, { INTENT_ICON, SmartLink } from './components/TaskCard'
import { askMola, defaultChips, ensureGreeting, type MolaTask } from './executors'
import { useMolaBusy } from './store'
import './components/mola.css'

type Tab = 'chat' | 'tasks' | 'approvals'
type Filter = 'all' | 'running' | 'needs_approval' | 'done' | 'cancelled'

const STATUS_DOT: Record<TaskStatus, string> = { running: 'bg-forest-500', needs_approval: 'bg-sun-500', done: 'bg-forest-600', cancelled: 'bg-ink-faint', failed: 'bg-clay-500' }

export default function MolaHub() {
  const { t, lang } = useT('mola')
  useDocumentTitle(t('hub.docTitle'))
  const { profile } = useSession()
  const busy = useMolaBusy()
  const [sp, setSp] = useSearchParams()
  const tab = (['chat', 'tasks', 'approvals'].includes(sp.get('tab') || '') ? sp.get('tab') : 'chat') as Tab
  const setTab = (v: Tab) => setSp(v === 'chat' ? {} : { tab: v }, { replace: true })
  const tasks = useLiveQuery(() => db.tasks.orderBy('createdAt').reverse().toArray() as Promise<MolaTask[]>, [], [] as MolaTask[])
  const pending = tasks.filter((x) => x.status === 'needs_approval')
  useEffect(() => { ensureGreeting() }, [])

  // /app/mola?q=<request>: pre-fill the composer (never auto-send), then clear q from the URL.
  const q = sp.get('q')
  const [prefill, setPrefill] = useState<{ text: string; n: number } | undefined>(undefined)
  useEffect(() => {
    if (q == null) return
    if (q.trim()) setPrefill({ text: q, n: Date.now() })
    const next = new URLSearchParams(sp)
    next.delete('q'); next.delete('tab') // the composer lives on the chat tab
    setSp(next, { replace: true })
  }, [q]) // eslint-disable-line react-hooks/exhaustive-deps

  const tabs = [
    { id: 'chat' as Tab, label: t('hub.tabs.chat') },
    { id: 'tasks' as Tab, label: <span className="inline-flex items-center gap-1.5">{t('hub.tabs.tasks')}{tasks.length > 0 && <span className="tabular-nums opacity-60">{tasks.length}</span>}</span> },
    { id: 'approvals' as Tab, label: <span className="inline-flex items-center gap-1.5">{t('hub.tabs.approvals')}{pending.length > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-sun-500 px-1.5 text-[11px] font-bold tabular-nums text-ink" aria-label={t('hub.pendingCount', { count: pending.length })}>{pending.length}</span>}</span> },
  ]

  return (
    <div>
      <header className="mb-5 flex items-center gap-4 sm:mb-7">
        <MolaAvatar size={52} busy={busy} className="sm:hidden" />
        <MolaAvatar size={68} busy={busy} className="hidden sm:inline-grid" />
        <div className="min-w-0">
          <h1 className="text-[30px] leading-none text-ink sm:text-[38px]">{t('name')}</h1>
          <p className="mt-1.5 text-[14.5px] text-ink-muted sm:text-[15.5px]">
            <span className="font-semibold text-ink-soft">{t('agentOf', { app: BRAND.name })}</span>{' '}
            <span className="hidden sm:inline">{busy ? t('hub.statusBusy') : t('hub.status')}</span>
          </p>
        </div>
      </header>

      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-4 w-full sm:mb-5 sm:w-fit" />

      {tab === 'chat' && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_288px]">
          <div className="-mx-4 flex h-[calc(100dvh-17rem)] min-h-[460px] flex-col overflow-hidden border-y border-line bg-paper sm:mx-0 sm:rounded-[22px] sm:border lg:h-[calc(100dvh-15.5rem)] lg:min-h-[560px]">
            <ChatPanel className="h-full" after={<Suggestions />} autoFocus={typeof window !== 'undefined' && window.innerWidth >= 1024} prefill={prefill} />
          </div>
          <aside className="hidden lg:block">
            <Capabilities role={profile?.role} />
            <div className="mt-7 border-t border-line pt-5">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink"><ShieldCheck size={17} strokeWidth={1.75} className="text-forest-600" aria-hidden="true" />{t('hub.trustTitle')}</h2>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">{t('hub.trustBody')}</p>
              {pending.length > 0 && <button type="button" className="link mt-2 text-[13.5px]" onClick={() => setTab('approvals')}>{t('hub.seePending', { count: pending.length })}</button>}
            </div>
          </aside>
        </div>
      )}

      {tab === 'tasks' && <TaskList tasks={tasks} lang={lang} onChat={() => setTab('chat')} />}

      {tab === 'approvals' && (
        pending.length === 0 ? (
          <Empty title={t('hub.approvals.emptyTitle')} body={t('hub.approvals.emptyBody')}
            action={<button type="button" className="btn-primary min-h-[44px]" onClick={() => { setTab('chat'); askMola(t('chips.sendConvocation')) }}><MolaMark size={16} aria-hidden="true" />{t('hub.approvals.cta')}</button>} />
        ) : (
          <div className="max-w-3xl space-y-5">
            {pending.map((task) => (
              <article key={task.id} className="rounded-[22px] border border-line bg-paper p-4 sm:p-6">
                <TaskHead task={task} lang={lang} />
                <TaskCard task={task} latest />
              </article>
            ))}
          </div>
        )
      )}
    </div>
  )
}

function Empty({ title, body, action }: { title: string; body: string; action: React.ReactNode }) {
  return (
    <div className="max-w-xl rounded-[22px] border border-line bg-paper px-5 py-8 sm:px-8">
      <MolaAvatar size={40} ring={false} />
      <h2 className="mt-4 text-[22px] text-ink">{title}</h2>
      <p className="mt-1.5 text-[15px] leading-relaxed text-ink-muted">{body}</p>
      <div className="mt-5">{action}</div>
    </div>
  )
}

function Capabilities({ role }: { role?: string }) {
  const { t, lang } = useT('mola')
  const chips = defaultChips(lang, role)
  return (
    <div>
      <h2 className="flex items-center gap-2 text-[17px] text-ink"><MolaMark size={18} className="text-forest-600" aria-hidden="true" />{t('hub.canDo')}</h2>
      <ul className="mt-2 divide-y divide-line border-y border-line">
        {chips.map((c) => (
          <li key={c}>
            <button type="button" onClick={() => askMola(c)} className="flex min-h-[44px] w-full items-center py-2.5 text-left text-[14.5px] leading-snug text-ink-soft transition hover:text-forest-700">
              {c}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function when(iso: string, lang: 'fr' | 'en') {
  return new Date(iso).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function TaskHead({ task, lang }: { task: MolaTask; lang: 'fr' | 'en' }) {
  const { t } = useT('mola')
  const Icon = INTENT_ICON[task.intent] ?? MolaMark
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sand text-forest-700"><Icon size={17} strokeWidth={1.75} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
          <h3 className="text-[16px] font-semibold leading-snug text-ink">{t(`intent.${task.intent}`)}</h3>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted"><span className={cx('h-1.5 w-1.5 rounded-full', STATUS_DOT[task.status])} aria-hidden="true" />{t(`status.${task.status}`)}</span>
        </div>
        <p className="mt-0.5 text-[13.5px] text-ink-muted"><span className="text-ink-soft">{t('hub.tasks.asked', { request: task.request })}</span>, {when(task.createdAt, lang)}</p>
      </div>
    </div>
  )
}

function TaskList({ tasks, lang, onChat }: { tasks: MolaTask[]; lang: 'fr' | 'en'; onChat: () => void }) {
  const { t } = useT('mola')
  const [filter, setFilter] = useState<Filter>('all')
  const [open, setOpen] = useState<string | null>(null)
  const list = useMemo(() => tasks.filter((x) => filter === 'all' || x.status === filter || (filter === 'cancelled' && x.status === 'failed')), [tasks, filter])
  const count = (f: Filter) => tasks.filter((x) => f === 'all' || x.status === f || (f === 'cancelled' && x.status === 'failed')).length
  if (!tasks.length) return (
    <Empty title={t('hub.tasks.emptyTitle')} body={t('hub.tasks.emptyBody')}
      action={<button type="button" className="btn-primary min-h-[44px]" onClick={onChat}>{t('hub.tasks.start')}</button>} />
  )
  return (
    <div className="max-w-4xl">
      <div className="mola-noscroll -mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label={t('hub.tasks.filter')}>
        {(['all', 'running', 'needs_approval', 'done', 'cancelled'] as Filter[]).map((f) => (
          <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}
            className={cx('inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13.5px] font-semibold transition', filter === f ? 'border-forest-600 bg-forest-600 text-cream' : 'border-line bg-paper text-ink-soft hover:border-forest-300')}>
            {t(`hub.tasks.f.${f}`)}<span className="tabular-nums opacity-60">{count(f)}</span>
          </button>
        ))}
      </div>
      {list.length === 0 ? <p className="rounded-[14px] border border-dashed border-line px-4 py-8 text-center text-[14px] text-ink-muted">{t('hub.tasks.none')}</p> : (
        <ul className="divide-y divide-line overflow-hidden rounded-[22px] border border-line bg-paper">
          {list.map((task) => (
            <li key={task.id} className="px-4 py-4 sm:px-6">
              <TaskHead task={task} lang={lang} />
              <div className="sm:pl-12">
                {task.summary && open !== task.id && <p className="mt-2 line-clamp-2 whitespace-pre-line text-[14.5px] leading-relaxed text-ink-soft">{task.summary}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {task.resultRoute && task.status === 'done' && <SmartLink to={task.resultRoute} className="btn-outline btn-sm min-h-[40px] px-3.5">{task.payload?.resultLabel ?? t('open.result')}</SmartLink>}
                  <button type="button" className={cx('btn-sm min-h-[40px] px-3', task.status === 'needs_approval' ? 'btn-primary' : 'btn-ghost')} aria-expanded={open === task.id} onClick={() => setOpen(open === task.id ? null : task.id)}>
                    {open === task.id ? t('hub.tasks.hide') : t(task.status === 'needs_approval' ? 'hub.tasks.review' : 'hub.tasks.details', { count: task.steps.length })}
                  </button>
                </div>
                {open === task.id && <TaskCard task={task} stepsOpen />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
