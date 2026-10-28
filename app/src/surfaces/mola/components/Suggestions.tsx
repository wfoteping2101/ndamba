import { useEffect, useState } from 'react'
import { Lightbulb, X } from 'lucide-react'
import { useT } from '../../../i18n'
import { db } from '../../../lib/db'
import { useLiveQuery } from '../../../lib/hooks'
import { useSession } from '../../../lib/session'
import { todayISO } from '../../../lib/util'
import { askMola, loadCtx, proactive, type Suggestion } from '../executors'

const KEY = 'mola.dismissed'
const readDismissed = (): string[] => { try { const v = JSON.parse(localStorage.getItem(KEY) || '{}'); return v.d === todayISO() ? v.ids : [] } catch { return [] } }
const writeDismissed = (ids: string[]) => { try { localStorage.setItem(KEY, JSON.stringify({ d: todayISO(), ids })) } catch { /* private mode */ } }

/** Mola's ideas from the person's real data (next match without a week, convocation, last report), one tap to do it. */
export default function Suggestions({ compact = false }: { compact?: boolean }) {
  const { t, lang } = useT('mola')
  const { team } = useSession()
  const [list, setList] = useState<Suggestion[]>([])
  const [dismissed, setDismissed] = useState<string[]>(readDismissed)
  // recompute when tasks, sessions or matches change
  const sig = useLiveQuery(async () => `${await db.tasks.count()}:${await db.sessions.count()}:${await db.matches.count()}`, [], '')
  useEffect(() => { let on = true; loadCtx().then(proactive).then((l) => { if (on) setList(l) }); return () => { on = false } }, [sig, team?.id, lang])

  const shown = list.filter((s) => !dismissed.includes(s.id))
  if (!shown.length) return null
  const dismiss = (id: string) => { const ids = [...dismissed, id]; setDismissed(ids); writeDismissed(ids) }
  return (
    <div className={compact ? 'space-y-2 pt-1' : 'space-y-2 pt-1 sm:pl-10'}>
      {shown.map((s) => (
        <div key={s.id} className="mola-in flex items-start gap-2.5 rounded-2xl border border-terra-100 bg-terra-50/70 px-3 py-2.5">
          <Lightbulb size={17} className="mt-0.5 shrink-0 text-terra-600" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-terra-700">{t('pro.eyebrow')}</div>
            <p className="mt-0.5 text-[14px] leading-snug text-ink">{s.text}</p>
            <button type="button" className="btn-primary btn-sm mt-2 min-h-[40px]" onClick={() => { dismiss(s.id); askMola(s.request, { intent: s.intent, slots: s.slots }) }}>{s.cta}</button>
          </div>
          <button type="button" className="-mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-terra-100" aria-label={t('pro.dismiss')} onClick={() => dismiss(s.id)}><X size={16} /></button>
        </div>
      ))}
    </div>
  )
}
