import { useEffect, useState } from 'react'
import { CalendarPlus, Copy, Mail, MessageCircle, MessageSquare, Pencil, ShieldCheck, X } from 'lucide-react'
import { useT } from '../../../i18n'
import type { AgentApproval } from '../../../lib/types'
import { cx, download } from '../../../lib/util'
import { approvalHref, cancelTask, markApproved, saveApproval, type MolaTask } from '../executors'

type Channel = NonNullable<AgentApproval['channel']>
const CHANNELS: { id: Channel; icon: typeof Mail }[] = [
  { id: 'whatsapp', icon: MessageCircle }, { id: 'sms', icon: MessageSquare }, { id: 'email', icon: Mail }, { id: 'copy', icon: Copy },
]

/** Open the person's own app with the message ready. A click on a link: nothing is sent from Ndamba. */
function openExternal(href: string, newTab: boolean) {
  const a = document.createElement('a')
  a.href = href
  if (newTab) { a.target = '_blank'; a.rel = 'noopener noreferrer' }
  document.body.appendChild(a)
  a.click()
  a.remove()
}

async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true } catch { /* older browsers */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'
    document.body.appendChild(ta); ta.select()
    const ok = document.execCommand('copy'); ta.remove(); return ok
  } catch { return false }
}

/** "Mola never sends anything by itself": channel, recipient, editable preview, then the person decides. */
export default function ApprovalCard({ task, compact = false }: { task: MolaTask; compact?: boolean }) {
  const { t } = useT('mola')
  const [draft, setDraft] = useState<AgentApproval>(task.approval!)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (!editing) setDraft(task.approval!) }, [task.approval, editing])

  const isCal = draft.kind === 'calendar'
  const channel: Channel = draft.channel ?? 'whatsapp'
  const set = (patch: Partial<AgentApproval>) => setDraft((d) => ({ ...d, ...patch }))
  const persist = (patch: Partial<AgentApproval> = {}) => saveApproval(task.id, { ...draft, ...patch })
  const idp = `appr-${task.id}`

  const approve = async () => {
    if (busy) return
    setBusy(true)
    const a = { ...draft }
    if (isCal) download(task.payload?.icsName || 'calendar.ics', task.payload?.ics || '', 'text/calendar')
    else if (a.channel === 'copy') await copyText(a.text)
    else { const href = approvalHref(a); if (href) openExternal(href, a.channel === 'whatsapp') }
    setEditing(false)
    await markApproved(task.id, a)
    setBusy(false)
  }

  const approveLabel = isCal ? t('approval.cta.calendar') : t(`approval.cta.${channel}`)

  return (
    <div className={cx('mola-in mt-3 rounded-2xl border border-sun-300 bg-sun-50/70', compact ? 'p-3' : 'p-3.5 sm:p-4')}>
      <div className="flex items-start gap-2">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-sun-700" aria-hidden="true" />
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-ink">{t('approval.title')}</div>
          <p className="text-[13px] leading-snug text-ink-soft">{isCal ? t('approval.explain.calendar') : t(`approval.explain.${channel}`)}</p>
        </div>
      </div>

      {!isCal && (
        <div className="mt-3">
          <div className="mb-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-muted" id={`${idp}-ch`}>{t('approval.channel')}</div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby={`${idp}-ch`}>
            {CHANNELS.map(({ id, icon: Icon }) => (
              <button key={id} type="button" aria-pressed={channel === id} onClick={() => { set({ channel: id }); persist({ channel: id }) }}
                className={cx('inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition',
                  channel === id ? 'border-forest-600 bg-forest-600 text-cream' : 'border-line bg-paper text-ink-soft hover:border-forest-300')}>
                <Icon size={14} aria-hidden="true" />{t(`channel.${id}`)}
              </button>
            ))}
          </div>
          {channel !== 'copy' && (
            <div className={cx('mt-2.5 grid gap-2', channel === 'email' && 'sm:grid-cols-2')}>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-ink-muted" htmlFor={`${idp}-to`}>{t(`approval.to.${channel}`)}</label>
                <input id={`${idp}-to`} className="input py-2 text-[14px]" value={draft.to ?? ''} inputMode={channel === 'email' ? 'email' : 'tel'}
                  placeholder={t(`approval.toPh.${channel}`)} onChange={(e) => set({ to: e.target.value })} onBlur={() => persist()} />
              </div>
              {channel === 'email' && (
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-ink-muted" htmlFor={`${idp}-subj`}>{t('approval.subject')}</label>
                  <input id={`${idp}-subj`} className="input py-2 text-[14px]" value={draft.subject ?? ''} onChange={(e) => set({ subject: e.target.value })} onBlur={() => persist()} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between">
          <label className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-muted" htmlFor={`${idp}-text`}>{isCal ? t('approval.events') : t('approval.preview')}</label>
          {editing && <span className="text-[11px] text-ink-faint">{t('approval.editing')}</span>}
        </div>
        {editing && !isCal ? (
          <textarea id={`${idp}-text`} className="input min-h-[180px] font-sans text-[14px] leading-relaxed" value={draft.text} onChange={(e) => set({ text: e.target.value })} onBlur={() => persist()} />
        ) : (
          <div id={`${idp}-text`} className={cx('overflow-y-auto whitespace-pre-wrap rounded-xl border border-line bg-white px-3 py-2.5 text-[14px] leading-relaxed text-ink-soft', compact ? 'max-h-40' : 'max-h-64')}>{draft.text}</div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <button type="button" className={cx('btn-primary col-span-2 min-h-[44px]', isCal && 'col-span-1')} onClick={approve} disabled={busy || !draft.text.trim()}>
          {isCal ? <CalendarPlus size={16} aria-hidden="true" /> : <ShieldCheck size={16} aria-hidden="true" />}{approveLabel}
        </button>
        {!isCal && (
          <button type="button" className="btn-outline min-h-[44px] px-3" aria-pressed={editing} onClick={() => { if (editing) persist(); setEditing(!editing) }}>
            <Pencil size={15} aria-hidden="true" />{editing ? t('approval.doneEditing') : t('approval.edit')}
          </button>
        )}
        <button type="button" className="btn-ghost min-h-[44px] px-3" onClick={() => cancelTask(task.id)} disabled={busy}>
          <X size={15} aria-hidden="true" />{t('approval.cancel')}
        </button>
      </div>
    </div>
  )
}
