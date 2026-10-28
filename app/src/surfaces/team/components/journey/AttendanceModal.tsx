// Who came to the session: a simple checklist. One tap marks present, a second tap absent;
// the menu on the right gives the nuance (late, excused, injured). Every change is saved at once.
import { Check, Users } from 'lucide-react'
import { Modal } from '../../../../ui'
import { useT } from '../../../../i18n'
import { db } from '../../../../lib/db'
import { useLiveQuery } from '../../../../lib/hooks'
import { cx, fmtDate } from '../../../../lib/util'
import { ATTENDANCE_STATUSES, attended, markAllPresent, setAttendance } from '../../../../lib/journey'
import type { Attendance, AttendanceStatus, Player, Session } from '../../../../lib/types'
import { NumberBadge } from '../bits'
import { byNumber } from '../lineup'

export function useAttendance(sessionId: string | undefined) {
  return useLiveQuery(async () => (sessionId ? db.attendance.where('sessionId').equals(sessionId).toArray() : []), [sessionId], [] as Attendance[])
}

export function attendanceCounts(marks: Attendance[]) {
  const c: Record<AttendanceStatus, number> = { present: 0, late: 0, absent: 0, excused: 0, injured: 0 }
  for (const m of marks) c[m.status] += 1
  return { ...c, attended: c.present + c.late, marked: marks.length }
}

export function AttendanceModal({ open, onClose, session, players }: { open: boolean; onClose: () => void; session: Session; players: Player[] }) {
  const { t, lang } = useT('journey')
  const marks = useAttendance(open ? session.id : undefined)
  const by = new Map(marks.map((m) => [m.playerId, m.status]))
  const c = attendanceCounts(marks)
  const sorted = [...players].sort(byNumber)
  const tapRow = (p: Player) => {
    const cur = by.get(p.id)
    setAttendance(session, p, !cur || !attended(cur) ? 'present' : 'absent')
  }
  return (
    <Modal open={open} onClose={onClose} title={t('attendance.title')}
      footer={<>
        <span className="mr-auto self-center text-[13px] tabular-nums text-ink-muted">{t('attendance.summary', { n: c.attended, count: players.length })}</span>
        <button type="button" className="btn-primary" onClick={onClose}>{t('attendance.done')}</button>
      </>}>
      <p className="mb-3 text-[13.5px] text-ink-muted">{t('attendance.hint', { title: session.title, date: fmtDate(session.date, lang, { weekday: 'long', day: 'numeric', month: 'long' }) })}</p>
      <div className="mb-3 flex flex-wrap gap-2">
        <button type="button" className="btn-outline btn-sm min-h-[40px]" onClick={() => markAllPresent(session, players)} disabled={c.marked >= players.length}><Users size={15} />{t('attendance.allPresent')}</button>
        {c.marked > 0 && <button type="button" className="btn-ghost btn-sm min-h-[40px]" onClick={() => db.attendance.where('sessionId').equals(session.id).delete()}>{t('attendance.clear')}</button>}
      </div>
      {players.length === 0 ? <p className="rounded-xl bg-sand/60 px-3 py-3 text-sm text-ink-muted">{t('attendance.noPlayers')}</p> : (
        <ul className="divide-y divide-line/70 rounded-2xl border border-line">
          {sorted.map((p) => {
            const st = by.get(p.id)
            const on = attended(st)
            return (
              <li key={p.id} className="flex items-center gap-2 pr-2">
                <button type="button" role="checkbox" aria-checked={on} onClick={() => tapRow(p)}
                  className="flex min-h-[56px] min-w-0 flex-1 items-center gap-3 px-3 text-left">
                  <span className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 transition', on ? 'border-forest-600 bg-forest-600 text-cream' : st ? 'border-clay-300 bg-clay-50' : 'border-line bg-paper')}>
                    {on && <Check size={16} strokeWidth={3} aria-hidden="true" />}
                  </span>
                  <NumberBadge player={p} size="sm" />
                  <span className={cx('min-w-0 flex-1 truncate text-[14.5px] font-semibold', st && !on ? 'text-ink-muted' : 'text-ink')}>{p.name}</span>
                </button>
                <label className="sr-only" htmlFor={`att-${p.id}`}>{t('attendance.statusFor', { name: p.name })}</label>
                <select id={`att-${p.id}`} value={st ?? ''} onChange={(e) => setAttendance(session, p, (e.target.value || null) as AttendanceStatus | null)}
                  className={cx('h-10 shrink-0 rounded-lg border px-2 text-[12.5px] font-semibold',
                    st === 'present' ? 'border-forest-100 bg-forest-50 text-forest-700' : st === 'late' ? 'border-sun-100 bg-sun-50 text-sun-700' : st === 'absent' ? 'border-clay-100 bg-clay-50 text-clay-700' : st ? 'border-line bg-sand text-ink-soft' : 'border-line bg-paper text-ink-faint')}>
                  <option value="">{t('attendance.unmarked')}</option>
                  {ATTENDANCE_STATUSES.map((s) => <option key={s} value={s}>{t(`attendance.status.${s}`)}</option>)}
                </select>
              </li>
            )
          })}
        </ul>
      )}
      <p className="mt-3 text-xs text-ink-faint">{t('attendance.note')}</p>
    </Modal>
  )
}
