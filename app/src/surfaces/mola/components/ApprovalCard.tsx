import { useEffect, useState } from 'react'
import { CalendarPlus, Copy, Mail, MessageCircle, MessageSquare, Pencil } from 'lucide-react'
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

/** "Mola never sends anything by itself". The draft sits on the desk like a letter waiting for the coach's signature:
 *  how it leaves, to whom, the text (editable), then the person decides. */
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
  const pad = compact ? 'px-3.5' : 'px-4 sm:px-5'

  return (
    <section className="mola-in mt-4 overflow-hidden rounded-[14px] border border-line bg-paper" aria-labelledby={`${idp}-h`}>
      <header className={cx('border-b border-line py-3', pad)}>
        <h3 id={`${idp}-h`} className="flex items-center gap-2 text-[14.5px] font-semibold text-ink">
          <span className="h-2 w-2 shrink-0 rounded-full bg-sun-500" aria-hidden="true" />{t('approval.title')}
        </h3>
        <p className="mt-0.5 text-[13.5px] leading-snug text-ink-muted">{isCal ? t('approval.explain.calendar') : t(`approval.explain.${channel}`)}</p>
      </header>

      <div className={cx('space-y-3.5 py-3.5', pad)}>
        {!isCal && (
          <div>
            <div className="mb-1.5 text-[13px] font-semibold text-ink-soft" id={`${idp}-ch`}>{t('approval.channel')}</div>
            <div className="grid grid-cols-4 gap-0.5 rounded-xl bg-sand p-0.5" role="group" aria-labelledby={`${idp}-ch`}>
              {CHANNELS.map(({ id, icon: Icon }) => (
                <button key={id} type="button" aria-pressed={channel === id} onClick={() => { set({ channel: id }); persist({ channel: id }) }}
                  className={cx('inline-flex min-h-[40px] min-w-0 items-center justify-center gap-1.5 rounded-[10px] px-1.5 text-[13px] font-semibold transition',
                    channel === id ? 'bg-paper text-ink shadow-[0_1px_2px_rgba(18,33,26,.12)]' : 'text-ink-muted hover:text-ink')}>
                  <Icon size={14} aria-hidden="true" className={cx('shrink-0', compact ? 'hidden' : 'hidden min-[400px]:block')} /><span className="truncate">{t(`channel.${id}`)}</span>
                </button>
              ))}
            </div>
            {channel !== 'copy' && (
              <div className={cx('mt-3 grid gap-3', channel === 'email' && !compact && 'sm:grid-cols-2')}>
                <div>
                  <label className="mb-1 block text-[13px] font-semibold text-ink-soft" htmlFor={`${idp}-to`}>{t(`approval.to.${channel}`)}</label>
                  <input id={`${idp}-to`} className="input py-2 text-[14.5px]" value={draft.to ?? ''} inputMode={channel === 'email' ? 'email' : 'tel'}
                    placeholder={t(`approval.toPh.${channel}`)} onChange={(e) => set({ to: e.target.value })} onBlur={() => persist()} />
                </div>
                {channel === 'email' && (
                  <div>
                    <label className="mb-1 block text-[13px] font-semibold text-ink-soft" htmlFor={`${idp}-subj`}>{t('approval.subject')}</label>
                    <input id={`${idp}-subj`} className="input py-2 text-[14.5px]" value={draft.subject ?? ''} onChange={(e) => set({ subject: e.target.value })} onBlur={() => persist()} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div>
          <div className="mb-1 flex min-h-[32px] items-center justify-between gap-2">
            <label className="text-[13px] font-semibold text-ink-soft" htmlFor={`${idp}-text`}>{isCal ? t('approval.events') : t('approval.preview')}</label>
            {!isCal && (
              <button type="button" className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold text-forest-600 hover:bg-forest-50" aria-pressed={editing}
                onClick={() => { if (editing) persist(); setEditing(!editing) }}>
                <Pencil size={13} aria-hidden="true" />{editing ? t('approval.doneEditing') : t('approval.edit')}
              </button>
            )}
          </div>
          {editing && !isCal ? (
            <textarea id={`${idp}-text`} className="input min-h-[200px] text-[14.5px] leading-relaxed" value={draft.text} onChange={(e) => set({ text: e.target.value })} onBlur={() => persist()} />
          ) : (
            <div id={`${idp}-text`} className={cx('overflow-y-auto whitespace-pre-wrap rounded-xl bg-cream px-3.5 py-3 text-[14.5px] leading-relaxed text-ink-soft', compact ? 'max-h-44' : 'max-h-72')}>{draft.text}</div>
          )}
        </div>
      </div>

      <footer className={cx('flex flex-wrap items-center gap-2 border-t border-line bg-cream/60 py-3', pad)}>
        <button type="button" className="btn-primary min-h-[44px] w-full whitespace-nowrap min-[420px]:w-auto" onClick={approve} disabled={busy || !draft.text.trim()}>
          {isCal && <CalendarPlus size={16} aria-hidden="true" />}{approveLabel}
        </button>
        <button type="button" className="btn-ghost min-h-[44px] w-full px-3 min-[420px]:w-auto" onClick={() => cancelTask(task.id)} disabled={busy}>{t('approval.cancel')}</button>
      </footer>
    </section>
  )
}
