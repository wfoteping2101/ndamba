import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRight, Hand, ListChecks, ShieldCheck, Sparkles } from 'lucide-react'
import { useT } from '../../i18n'
import { db } from '../../lib/db'
import { useDocumentTitle, useLiveQuery } from '../../lib/hooks'
import { useSession } from '../../lib/session'
import type { TaskStatus } from '../../lib/types'
import { cx } from '../../lib/util'
import { Badge, EmptyState, Tabs } from '../../ui'
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

const STATUS_TONE: Record<TaskStatus, 'forest' | 'sun' | 'ok' | 'neutral' | 'clay'> = { running: 'forest', needs_approval: 'sun', done: 'ok', cancelled: 'neutral', failed: 'clay' }

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
    { id: 'tasks' as Tab, label: <span className="inline-flex items-center gap-1.5">{t('hub.tabs.tasks')}{tasks.length > 0 && <span className="text-[11px] opacity-70">{tasks.length}</span>}</span> },
    { id: 'approvals' as Tab, label: <span className="inline-flex items-center gap-1.5">{t('hub.tabs.approvals')}{pending.length > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-sun-500 px-1.5 text-[11px] font-bold text-ink" aria-label={t('hub.pendingCount', { count: pending.length })}>{pending.length}</span>}</span> },
  ]

  return (
    <div>
      <header className="mb-4 flex items-center gap-3 sm:mb-6 sm:gap-4">
        <MolaAvatar size={48} busy={busy} className="sm:hidden" />
        <MolaAvatar size={64} busy={busy} className="hidden sm:inline-grid" />
        <div className="min-w-0">
          <div className="eyebrow">{t('agentOf', { app: BRAND.name })}</div>
          <h1 className="text-[26px] font-semibold leading-tight text-ink sm:text-[34px]">{t('name')}</h1>
          <p className="mt-0.5 hidden max-w-2xl text-[15px] text-ink-muted sm:block">{t('hub.subtitle')}</p>
        </div>
      </header>

      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-4 w-full sm:w-fit" />

      {tab === 'chat' && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="card flex h-[calc(100dvh-17.5rem)] min-h-[440px] flex-col overflow-hidden lg:h-[calc(100dvh-15rem)] lg:min-h-[560px]">
            <ChatPanel className="h-full" after={<Suggestions />} autoFocus={typeof window !== 'undefined' && window.innerWidth >= 1024} prefill={prefill} />
          </div>
          <aside className="hidden space-y-4 lg:block">
            <Capabilities role={profile?.role} />
            <div className="rounded-2xl border border-forest-100 bg-forest-50 p-4">
              <div className="flex items-center gap-2 text-[14px] font-semibold text-forest-700"><ShieldCheck size={17} aria-hidden="true" />{t('hub.trustTitle')}</div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{t('hub.trustBody')}</p>
              {pending.length > 0 && <button type="button" className="link mt-2 text-[13px]" onClick={() => setTab('approvals')}>{t('hub.seePending', { count: pending.length })}</button>}
            </div>
          </aside>
        </div>
      )}

      {tab === 'tasks' && <TaskList tasks={tasks} lang={lang} onChat={() => setTab('chat')} />}

      {tab === 'approvals' && (
        pending.length === 0 ? (
          <EmptyState icon={<ShieldCheck size={36} />} title={t('hub.approvals.emptyTitle')} body={t('hub.approvals.emptyBody')}
            action={<button type="button" className="btn-primary" onClick={() => { setTab('chat'); askMola(t('chips.sendConvocation')) }}>{t('hub.approvals.cta')}</button>} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {pending.map((task) => (
              <div key={task.id} className="card card-pad">
                <TaskHead task={task} lang={lang} />
                <TaskCard task={task} />
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

function Capabilities({ role }: { role?: string }) {
  const { t, lang } = useT('mola')
  const chips = defaultChips(lang, role)
  return (
    <div className="card card-pad">
      <div className="mb-2 flex items-center gap-2 font-display text-[17px] font-semibold text-ink"><Sparkles size={17} className="text-terra-600" aria-hidden="true" />{t('hub.canDo')}</div>
      <ul className="space-y-0.5">
        {chips.map((c) => (
          <li key={c}>
            <button type="button" onClick={() => askMola(c)} className="group flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[14px] text-ink-soft hover:bg-sand">
              <span className="min-w-0 flex-1">{c}</span><ArrowRight size={14} className="shrink-0 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-forest-600" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TaskHead({ task, lang }: { task: MolaTask; lang: 'fr' | 'en' }) {
  const { t } = useT('mola')
  const Icon = INTENT_ICON[task.intent] ?? Sparkles
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sand text-forest-600"><Icon size={18} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-ink">{t(`intent.${task.intent}`)}</span>
          <Badge tone={STATUS_TONE[task.status]}>{t(`status.${task.status}`)}</Badge>
        </div>
        <p className="mt-0.5 truncate text-[13px] text-ink-muted">{t('hub.tasks.asked', { request: task.request })} · {new Date(task.createdAt).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
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
    <EmptyState icon={<ListChecks size={36} />} title={t('hub.tasks.emptyTitle')} body={t('hub.tasks.emptyBody')}
      action={<button type="button" className="btn-primary" onClick={onChat}>{t('hub.tasks.start')}</button>} />
  )
  return (
    <div>
      <div className="mola-noscroll -mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label={t('hub.tasks.filter')}>
        {(['all', 'running', 'needs_approval', 'done', 'cancelled'] as Filter[]).map((f) => (
          <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}
            className={cx('inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition', filter === f ? 'border-forest-600 bg-forest-600 text-cream' : 'border-line bg-paper text-ink-soft hover:border-forest-300')}>
            {f === 'needs_approval' && <Hand size={13} aria-hidden="true" />}{t(`hub.tasks.f.${f}`)}<span className="opacity-60">{count(f)}</span>
          </button>
        ))}
      </div>
      {list.length === 0 ? <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">{t('hub.tasks.none')}</p> : (
        <ul className="space-y-3">
          {list.map((task) => (
            <li key={task.id} className="card card-pad">
              <TaskHead task={task} lang={lang} />
              {task.summary && <p className="mt-2.5 line-clamp-3 whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">{task.summary}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {task.resultRoute && task.status === 'done' && <SmartLink to={task.resultRoute} className="btn-outline btn-sm min-h-[40px]">{task.payload?.resultLabel ?? t('open.result')}<ArrowRight size={14} aria-hidden="true" /></SmartLink>}
                <button type="button" className="btn-ghost btn-sm min-h-[40px]" aria-expanded={open === task.id} onClick={() => setOpen(open === task.id ? null : task.id)}>
                  {open === task.id ? t('hub.tasks.hide') : t(task.status === 'needs_approval' ? 'hub.tasks.review' : 'hub.tasks.details', { count: task.steps.length })}
                </button>
              </div>
              {open === task.id && <TaskCard task={task} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
