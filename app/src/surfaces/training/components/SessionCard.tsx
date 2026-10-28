import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, MoreVertical, Trash2 } from 'lucide-react'
import { MolaMark } from '../../../ui/brand'
import { useT } from '../../../i18n'
import { sessionMinutes } from '../../../lib/actions'
import { fmtDate, todayISO, cx } from '../../../lib/util'
import type { Session } from '../../../lib/types'
import { IntensityProfile, IntentionBadge, MdBadge } from './bits'

export function SessionCard({ s, onDuplicate, onDelete, canDuplicate = true }: { s: Session; onDuplicate: () => void; onDelete: () => void; canDuplicate?: boolean }) {
  const { t, lang } = useT('training')
  const [menu, setMenu] = useState(false)
  const today = s.date === todayISO()
  const mins = sessionMinutes(s)
  return (
    <article className={cx('card relative flex min-w-0 items-stretch gap-3 p-3 transition hover:shadow-lift sm:gap-4 sm:p-4', today && 'ring-2 ring-terra-300')}>
      <Link to={`/app/seances/${s.id}`} className="absolute inset-0 rounded-2xl" aria-label={`${s.title}, ${fmtDate(s.date, lang, { weekday: 'long', day: 'numeric', month: 'long' })}`} />
      <div className={cx('flex w-14 shrink-0 flex-col items-center justify-center rounded-xl py-2 sm:w-16', today ? 'bg-terra-500 text-white' : 'bg-sand text-ink')}>
        <span className={cx('text-[11px] font-semibold uppercase', today ? 'text-white/85' : 'text-ink-muted')}>{fmtDate(s.date, lang, { weekday: 'short' })}</span>
        <span className="font-display text-2xl font-semibold leading-none">{fmtDate(s.date, lang, { day: 'numeric' })}</span>
        <span className={cx('text-[11px]', today ? 'text-white/85' : 'text-ink-muted')}>{fmtDate(s.date, lang, { month: 'short' })}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {today && <span className="rounded-md bg-terra-500 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">{t('common:misc.today')}</span>}
          <MdBadge md={s.md} />
          {s.intention && <IntentionBadge i={s.intention} />}
          {s.createdBy === 'mola' && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-terra-600" title={t('sessions.byMola')}><MolaMark size={12} aria-hidden="true" />Mola</span>}
        </div>
        <h3 className="mt-1 truncate font-display text-[17px] font-semibold text-ink">{s.title}</h3>
        <div className="mt-0.5 text-xs text-ink-muted">{mins} {t('common:misc.minutes')} · {t('blocksCount', { count: s.blocks.length })}</div>
        <div className="mt-2 max-w-[260px]"><IntensityProfile session={s} height={18} /></div>
      </div>
      <div className="relative z-10 -mr-1 -mt-1 shrink-0">
        <button type="button" className="btn-ghost h-11 w-11 p-0" onClick={() => setMenu((m) => !m)} aria-label={t('sessions.menu')} aria-expanded={menu} aria-haspopup="menu"><MoreVertical size={18} /></button>
        {menu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} aria-hidden="true" />
            <div className="absolute right-0 top-11 z-20 w-48 overflow-hidden rounded-xl border border-line bg-paper py-1 shadow-lift" role="menu">
              {canDuplicate && <button type="button" role="menuitem" className="flex min-h-[44px] w-full items-center gap-2 px-3 text-left text-sm hover:bg-sand" onClick={() => { setMenu(false); onDuplicate() }}><Copy size={16} aria-hidden="true" />{t('sessions.duplicate')}</button>}
              <button type="button" role="menuitem" className="flex min-h-[44px] w-full items-center gap-2 px-3 text-left text-sm text-clay-600 hover:bg-clay-50" onClick={() => { setMenu(false); onDelete() }}><Trash2 size={16} aria-hidden="true" />{t('common:actions.delete')}</button>
            </div>
          </>
        )}
      </div>
    </article>
  )
}
