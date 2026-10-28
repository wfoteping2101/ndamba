import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { MolaMark } from '../../../ui/brand'
import { useT } from '../../../i18n'
import { db } from '../../../lib/db'
import { useLiveQuery } from '../../../lib/hooks'
import { useSession } from '../../../lib/session'
import { todayISO } from '../../../lib/util'
import { askMola, loadCtx, proactive, type Suggestion } from '../executors'

const KEY = 'mola.dismissed'
const readDismissed = (): string[] => { try { const v = JSON.parse(localStorage.getItem(KEY) || '{}'); return v.d === todayISO() ? v.ids : [] } catch { return [] } }
const writeDismissed = (ids: string[]) => { try { localStorage.setItem(KEY, JSON.stringify({ d: todayISO(), ids })) } catch { /* private mode */ } }

/** What Mola noticed in the person's real data (a match without its week, a call-up to write, a report to read),
 *  offered like an assistant who leans in: one sentence, one yes. */
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
    <div className={compact ? '' : 'sm:pl-11'}>
      <div className="overflow-hidden rounded-[14px] border border-forest-100 bg-forest-50/50">
        <div className="flex items-center gap-1.5 px-3.5 pt-2.5 text-[13px] font-semibold text-forest-700">
          <MolaMark size={15} aria-hidden="true" />{t('pro.eyebrow')}
        </div>
        <ul className="divide-y divide-forest-100">
          {shown.map((s) => (
            <li key={s.id} className="mola-in flex items-start gap-2 px-3.5 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-[14.5px] leading-snug text-ink">{s.text}</p>
                <button type="button" className="btn-primary btn-sm mt-2 min-h-[40px] px-3.5" onClick={() => { dismiss(s.id); askMola(s.request, { intent: s.intent, slots: s.slots }) }}>{s.cta}</button>
              </div>
              <button type="button" className="-mr-1.5 grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-forest-100 hover:text-ink" aria-label={t('pro.dismiss')} onClick={() => dismiss(s.id)}><X size={16} aria-hidden="true" /></button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
