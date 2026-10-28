import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Maximize2, X } from 'lucide-react'
import { useT } from '../../i18n'
import { db } from '../../lib/db'
import { BRAND } from '../../lib/config'
import { useLiveQuery } from '../../lib/hooks'
import { cx } from '../../lib/util'
import ChatPanel from './components/ChatPanel'
import MolaAvatar from './components/MolaAvatar'
import Suggestions from './components/Suggestions'
import { ensureGreeting } from './executors'
import { useMolaBusy } from './store'
import './components/mola.css'

const SEEN = 'mola.seen'
const TEASED = 'mola.teased'
const read = (k: string) => { try { return localStorage.getItem(k) || '' } catch { return '' } }
const write = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* private mode */ } }

/** The floating Mola button on every app page (not on the hub itself), with a compact chat sheet. */
export default function MolaLauncher() {
  const { t } = useT('mola')
  const loc = useLocation()
  const busy = useMolaBusy()
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState(() => read(SEEN))
  const [teased, setTeased] = useState(() => read(TEASED))
  const last = useLiveQuery(() => db.messages.where('thread').equals('mola').sortBy('createdAt').then((l) => l.filter((m) => m.role === 'mola').pop() ?? null), [], null)
  const pending = useLiveQuery(() => db.tasks.where('status').equals('needs_approval').count(), [], 0)
  const hidden = loc.pathname.startsWith('/app/mola')

  const unread = !!last && last.createdAt > seen
  const markSeen = () => { if (last) { write(SEEN, last.createdAt); setSeen(last.createdAt) } }
  useEffect(() => { if (open) { ensureGreeting(); markSeen() } }, [open, last?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setOpen(false) }, [loc.pathname])
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open])
  if (hidden) return null

  const showTeaser = !open && unread && !!last && teased !== last.id
  const closeTeaser = () => { if (last) { write(TEASED, last.id); setTeased(last.id) } }

  return (
    <>
      {showTeaser && (
        <div className="mola-in fixed bottom-[calc(env(safe-area-inset-bottom)+146px)] right-4 z-40 w-[min(300px,calc(100vw-2rem))] lg:bottom-[96px] lg:right-6">
          <div className="relative rounded-[14px] rounded-br-[6px] border border-line bg-paper py-3 pl-3.5 pr-10 shadow-lift">
            <button type="button" onClick={() => { closeTeaser(); setOpen(true) }} className="block text-left">
              <span className="block text-[13px] font-semibold text-ink">{t('name')}</span>
              <span className="mt-0.5 line-clamp-3 text-[14px] leading-snug text-ink-soft">{last!.text}</span>
            </button>
            <button type="button" onClick={closeTeaser} className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-full text-ink-muted hover:bg-sand" aria-label={t('launcher.dismiss')}><X size={15} aria-hidden="true" /></button>
          </div>
        </div>
      )}

      {!open && (
        <button type="button" onClick={() => { closeTeaser(); setOpen(true) }}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+78px)] right-4 z-40 grid h-[60px] w-[60px] place-items-center rounded-full border border-line bg-paper shadow-lift transition hover:border-forest-300 lg:bottom-6 lg:right-6"
          aria-label={pending ? t('launcher.openPending', { count: pending }) : t('launcher.open')}>
          <MolaAvatar size={48} busy={busy} />
          {(pending > 0 || unread) && (
            <span className={cx('mola-pop absolute -right-0.5 -top-0.5 grid place-items-center rounded-full border-2 border-paper font-bold tabular-nums', pending > 0 ? 'h-[22px] min-w-[22px] bg-sun-500 px-1 text-[11px] text-ink' : 'h-3.5 w-3.5 bg-forest-500')}>
              {pending > 0 ? pending : ''}
            </span>
          )}
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 sm:inset-auto sm:bottom-6 sm:right-6" role="dialog" aria-modal="true" aria-label={t('launcher.title')}>
          <div className="absolute inset-0 bg-night-900/40 sm:hidden" onClick={() => setOpen(false)} />
          <div className="safe-bottom absolute inset-x-0 bottom-0 flex h-[min(88dvh,700px)] flex-col overflow-hidden rounded-t-[22px] border border-line bg-paper shadow-lift sm:relative sm:inset-auto sm:h-[min(660px,calc(100dvh-3rem))] sm:w-[408px] sm:rounded-[22px]">
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <MolaAvatar size={38} busy={busy} />
              <div className="min-w-0 flex-1">
                <div className="font-display text-[18px] leading-tight text-ink">{t('name')}</div>
                <div className="truncate text-[12px] text-ink-muted">{busy ? t('launcher.working') : t('agentOf', { app: BRAND.name })}</div>
              </div>
              <Link to="/app/mola" className="btn-ghost btn-sm min-h-[40px]" onClick={() => setOpen(false)}><Maximize2 size={15} aria-hidden="true" /><span className="hidden min-[380px]:inline">{t('launcher.full')}</span></Link>
              <button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full text-ink-muted hover:bg-sand" aria-label={t('launcher.close')}><X size={18} /></button>
            </div>
            <ChatPanel compact limit={14} className="min-h-0 flex-1" after={<Suggestions compact />} onNavigate={() => setOpen(false)} autoFocus inputId="mola-launcher-input" />
          </div>
        </div>
      )}
    </>
  )
}
