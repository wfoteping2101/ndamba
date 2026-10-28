// Entry points to the Parcours, the Observer, the attendance and the playing time, placed on
// existing pages (player page, session builder, match sheet, live tagger).
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Eye, Route, Timer } from 'lucide-react'
import { Modal } from '../../../../ui'
import { useT } from '../../../../i18n'
import { db } from '../../../../lib/db'
import { useLiveQuery } from '../../../../lib/hooks'
import { cx, todayISO } from '../../../../lib/util'
import { seasonOf, seasonSummary } from '../../../../lib/journey'
import type { Match, Player, Session } from '../../../../lib/types'
import { byNumber } from '../lineup'
import { fmtMinutes, fmtPct, useJourney } from './bits'
import { SeasonRibbon } from './SeasonRibbon'
import { AttendanceModal, attendanceCounts, useAttendance } from './AttendanceModal'
import { MinutesModal } from './MinutesModal'
import { ObservePanel, type PlayerGroup } from './ObservePanel'

/** On the player's page (coach): the season at a glance and the way into the Parcours and the Observer. */
export function JourneyTeaser({ playerId }: { playerId: string }) {
  const { t, lang } = useT('journey')
  const data = useJourney(playerId)
  const season = seasonOf(todayISO())
  const s = useMemo(() => (data ? seasonSummary(data, season) : null), [data, season])
  if (!data || !s) return null
  const stats = [
    { label: t('hero.sessions'), value: s.sessions.marked ? `${s.sessions.attended}/${s.sessions.marked}` : '·', sub: s.sessions.rate !== null ? fmtPct(s.sessions.rate, lang) : undefined },
    { label: t('hero.matches'), value: s.matches.played, sub: s.matches.played ? fmtMinutes(s.matches.minutes, lang) : undefined },
    { label: t('hero.observations'), value: s.observations.total },
    { label: t('hero.objectives'), value: s.objectives.active, sub: t('teaser.active') },
  ]
  return (
    <section className="overflow-hidden rounded-2xl bg-forest-600 text-cream shadow-card" aria-labelledby="jt-h">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 sm:px-5">
        <h2 id="jt-h" className="flex items-center gap-2 font-display text-lg font-semibold"><Route size={18} className="text-sun-300" aria-hidden="true" />{t('teaser.title', { season: season.label })}</h2>
        <div className="flex gap-2">
          <Link to={`/app/observer?joueur=${playerId}`} className="btn min-h-[40px] border border-white/25 px-3 py-1.5 text-[13px] text-cream hover:bg-white/10"><Eye size={15} />{t('actions.observe')}</Link>
          <Link to={`/app/equipe/${playerId}/parcours`} className="btn-sun min-h-[40px] px-3 py-1.5 text-[13px]">{t('teaser.open')}</Link>
        </div>
      </div>
      <div className="mx-4 mt-3 rounded-xl bg-forest-700/50 p-2.5 ring-1 ring-white/10 sm:mx-5"><SeasonRibbon data={data} season={season} /></div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 px-4 pb-4 pt-3 sm:grid-cols-4 sm:px-5">
        {stats.map((x) => (
          <div key={x.label} className="min-w-0">
            <dt className="truncate text-[11.5px] text-cream/70">{x.label}</dt>
            <dd className="font-display text-2xl font-semibold tabular-nums leading-tight">{x.value}</dd>
            {x.sub && <dd className="truncate text-[11px] text-cream/70">{x.sub}</dd>}
          </div>
        ))}
      </dl>
    </section>
  )
}

/** In the session builder: the register and the Observer for this session. */
export function SessionJourneyCard({ session }: { session: Session }) {
  const { t } = useT('journey')
  const players = useLiveQuery(() => (session.teamId ? db.players.where('teamId').equals(session.teamId).toArray() : Promise.resolve([] as Player[])), [session.teamId], [] as Player[])
  const marks = useAttendance(session.id)
  const obsCount = useLiveQuery(() => db.observations.where('sessionId').equals(session.id).count(), [session.id], 0)
  const [open, setOpen] = useState(false)
  if (!session.teamId) return null
  const c = attendanceCounts(marks)
  const past = session.date <= todayISO()
  return (
    <div className="no-print card card-pad mt-3">
      <h3 className="mb-1 font-display text-base font-semibold text-ink">{t('sessionCard.title')}</h3>
      <p className="text-[13px] text-ink-muted">
        {c.marked ? t('sessionCard.marked', { n: c.attended, count: players.length }) : past ? t('sessionCard.unmarked') : t('sessionCard.future')}
        {c.late > 0 && <span>{t('sessionCard.late', { count: c.late })}</span>}
      </p>
      {c.marked > 0 && (
        <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-sand" aria-hidden="true">
          <span className="bg-forest-600" style={{ width: `${(c.present / Math.max(1, players.length)) * 100}%` }} />
          <span className="bg-sun-500" style={{ width: `${(c.late / Math.max(1, players.length)) * 100}%` }} />
          <span className="bg-clay-500" style={{ width: `${((c.absent + c.excused + c.injured) / Math.max(1, players.length)) * 100}%` }} />
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" className="btn-outline min-h-[48px]" onClick={() => setOpen(true)}><ClipboardList size={16} aria-hidden="true" />{c.marked ? t('sessionCard.edit') : t('sessionCard.take')}</button>
        <Link to={`/app/observer?seance=${session.id}`} className="btn-outline min-h-[48px]"><Eye size={16} aria-hidden="true" />{t('sessionCard.observe')}</Link>
      </div>
      {obsCount > 0 && <p className="mt-2 text-xs text-ink-muted">{t('sessionCard.obs', { count: obsCount })}</p>}
      <AttendanceModal open={open} onClose={() => setOpen(false)} session={session} players={players} />
    </div>
  )
}

/** On the match sheet: observe the match and record playing time once it is played. */
export function MatchJourneyButtons({ match, players }: { match: Match; players: Player[] }) {
  const { t } = useT('journey')
  const [open, setOpen] = useState(false)
  const done = match.status === 'done'
  return (
    <div className={cx('grid gap-2 sm:contents', done ? 'grid-cols-2' : 'grid-cols-1')}>
      <Link to={`/app/observer?match=${match.id}`} className="btn-outline btn-lg justify-center px-3"><Eye size={18} />{t('matchCard.observe')}</Link>
      {done && <button type="button" className="btn-outline btn-lg justify-center px-3" onClick={() => setOpen(true)}><Timer size={18} />{t('matchCard.minutes')}</button>}
      {done && <MinutesModal open={open} onClose={() => setOpen(false)} match={match} players={players} />}
    </div>
  )
}

/** In the live tagger: the Observer as a sheet, with the match minute filled in. */
export function ObserveSheet({ open, onClose, match, squad, minute }: { open: boolean; onClose: () => void; match: Match; squad: Player[]; minute: number }) {
  const { t } = useT('journey')
  const [min, setMin] = useState<number | null>(minute)
  useEffect(() => { if (open) setMin(minute) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const groups: PlayerGroup[] = useMemo(() => {
    const starters = new Set(match.lineup.map((l) => l.playerId).filter(Boolean) as string[])
    const xi = squad.filter((p) => starters.has(p.id)).sort(byNumber)
    const rest = squad.filter((p) => !starters.has(p.id)).sort(byNumber)
    return [{ id: 'xi', label: t('observe.groups.starters'), players: xi }, { id: 'subs', label: t('observe.groups.subs'), players: rest }]
  }, [match.lineup, squad, t])
  return (
    // the live tagger is a dark, non-selectable screen: give the sheet its own ink and text selection
    <div className="select-text text-ink">
      <Modal open={open} onClose={onClose} wide title={t('observe.sheetTitle', { minute: min ?? minute })}>
        {open && <ObservePanel teamId={match.teamId} groups={groups} context={{ matchId: match.id, date: match.date }} showMinute minute={min} onMinute={setMin} compact stickyClass={cx('bottom-0')} />}
      </Modal>
    </div>
  )
}
