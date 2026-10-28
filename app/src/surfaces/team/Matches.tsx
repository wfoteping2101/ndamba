import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CalendarPlus, ChevronRight, Clock, MapPin, Plane, House, Shirt, Trophy } from 'lucide-react'
import { db } from '../../lib/db'
import { useLiveQuery, useDocumentTitle } from '../../lib/hooks'
import { useSession } from '../../lib/session'
import { computeNjangi, njangiLabel } from '../../lib/njangi'
import { BRAND } from '../../lib/config'
import type { Match, MatchEvent, Team } from '../../lib/types'
import { EmptyState } from '../../ui'
import { useT } from '../../i18n'
import { cx, daysBetween, fmtDate, todayISO } from '../../lib/util'
import { resultOf } from './components/lineup'
import { DateBlock, NjangiDial, StatusBadge } from './components/bits'

export default function Matches() {
  const { t } = useT('team')
  const { team } = useSession()
  useDocumentTitle(t('matches.docTitle'))
  const data = useLiveQuery(async () => {
    if (!team) return { matches: [] as Match[], events: [] as MatchEvent[] }
    const matches = await db.matches.where('teamId').equals(team.id).toArray()
    const ids = matches.map((m) => m.id)
    const events = ids.length ? await db.events.where('matchId').anyOf(ids).toArray() : []
    return { matches, events }
  }, [team?.id], { matches: [] as Match[], events: [] as MatchEvent[] })

  const today = todayISO()
  const { upcoming, past, njangi, eventCount } = useMemo(() => {
    const key = (m: Match) => m.date + (m.time || '')
    const isPast = (m: Match) => m.status === 'done' || (m.status === 'planned' && m.date < today)
    const upcoming = data.matches.filter((m) => !isPast(m)).sort((a, b) => key(a).localeCompare(key(b)))
    const past = data.matches.filter(isPast).sort((a, b) => key(b).localeCompare(key(a)))
    const byMatch = new Map<string, MatchEvent[]>()
    for (const e of data.events) { const l = byMatch.get(e.matchId) ?? []; l.push(e); byMatch.set(e.matchId, l) }
    const njangi = new Map<string, number>(); const eventCount = new Map<string, number>()
    for (const [id, evs] of byMatch) { eventCount.set(id, evs.length); if (evs.length) njangi.set(id, computeNjangi(evs).total) }
    return { upcoming, past, njangi, eventCount }
  }, [data, today])

  const header = (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[30px] leading-tight text-ink sm:text-[38px]">{t('matches.title')}</h1>
        <p className="mt-1 max-w-xl text-[15px] text-ink-muted">{t('matches.subtitle')}</p>
      </div>
      {team && <Link to="/app/matchs/nouveau" className="btn-primary btn-lg self-start sm:self-auto"><CalendarPlus size={18} />{t('matches.new')}</Link>}
    </div>
  )

  if (!team) return (
    <div>{header}
      <EmptyState icon={<Shirt size={32} />} title={t('noTeam.title')} body={t('matches.noTeamBody')} action={<Link to="/app/equipe" className="btn-primary">{t('noTeam.cta')}</Link>} />
    </div>
  )

  if (!data.matches.length) return (
    <div>{header}
      <EmptyState icon={<Trophy size={32} />} title={t('matches.emptyTitle')} body={t('matches.emptyBody', { app: BRAND.name })}
        action={<Link to="/app/matchs/nouveau" className="btn-primary"><CalendarPlus size={17} />{t('matches.new')}</Link>} />
    </div>
  )

  const [next, ...later] = upcoming
  return (
    <div>
      {header}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <section aria-labelledby="up-h" className="min-w-0">
          <h2 id="up-h" className="mb-3 font-display text-[20px]">{t('matches.upcoming')}</h2>
          {next ? (
            <div className="space-y-3">
              <NextMatchCard match={next} team={team} />
              {later.length > 0 && <ul className="card divide-y divide-line overflow-hidden">{later.map((m) => <li key={m.id}><MatchRow match={m} team={team} /></li>)}</ul>}
            </div>
          ) : <p className="rounded-2xl border border-dashed border-line bg-paper/60 px-4 py-6 text-sm text-ink-muted">{t('matches.noneUpcoming')}</p>}
        </section>
        <section aria-labelledby="past-h" className="min-w-0">
          <h2 id="past-h" className="mb-3 font-display text-[20px]">{t('matches.past')}</h2>
          {past.length ? (
            <ul className="card divide-y divide-line overflow-hidden">{past.map((m) => <li key={m.id}><MatchRow match={m} team={team} njangi={njangi.get(m.id)} events={eventCount.get(m.id) || 0} /></li>)}</ul>
          ) : <p className="rounded-2xl border border-dashed border-line bg-paper/60 px-4 py-6 text-sm text-ink-muted">{t('matches.nonePast')}</p>}
        </section>
      </div>
    </div>
  )
}

function whenLabel(date: string, t: (k: string, o?: Record<string, unknown>) => string) {
  const d = daysBetween(todayISO(), date)
  if (d === 0) return t('matches.today')
  if (d === 1) return t('matches.tomorrow')
  if (d > 1) return t('matches.inDays', { count: d })
  return ''
}

function NextMatchCard({ match, team }: { match: Match; team: Team }) {
  const { t, lang } = useT('team')
  const when = whenLabel(match.date, t)
  const filled = match.lineup.filter((l) => l.playerId).length
  return (
    <Link to={`/app/matchs/${match.id}`} className="group block overflow-hidden rounded-[22px] bg-forest-600 text-cream transition hover:bg-forest-700">
      <div className="relative p-5 sm:p-6">
        <div className="relative flex items-center gap-2">
          <span className="text-[13px] font-semibold text-cream/75">{t('matches.next')}</span>
          {when && <span className="rounded-full bg-sun-500 px-2.5 py-0.5 text-[12px] font-semibold text-night-900">{when}</span>}
          {match.status === 'live' && <StatusBadge status="live" />}
        </div>
        <div className="relative mt-4 flex items-start gap-4">
          <DateBlock iso={match.date} dark />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] text-cream/75">{match.home ? t('matches.home') : t('matches.away')}{match.competition ? `, ${match.competition}` : ''}</div>
            <div className="mt-1 font-display text-[26px] leading-[1.1] sm:text-[30px]"><span className="mr-1.5 font-sans text-[15px] font-medium text-cream/70">{t('matches.vs')}</span>{match.opponent}</div>
          </div>
        </div>
        <div className="relative mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[13.5px] text-cream/85">
          <span className="inline-flex items-center gap-1.5"><Clock size={15} />{fmtDate(match.date, lang, { weekday: 'long', day: 'numeric', month: 'long' })}{match.time ? `, ${match.time}` : ''}</span>
          {match.venue && <span className="inline-flex items-center gap-1.5"><MapPin size={15} />{match.venue}</span>}
        </div>
        <div className="relative mt-5 flex items-center justify-between gap-3 border-t border-white/15 pt-4 text-[13px]">
          <span className="flex flex-wrap gap-x-3 text-cream/80"><span className="font-semibold tabular-nums text-cream">{match.formation}</span><span>{t('matches.lineupReady', { n: filled, total: match.lineup.length })}</span></span>
          <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-cream">{t('matches.sheet')}<ChevronRight size={16} className="transition group-hover:translate-x-0.5" /></span>
        </div>
      </div>
    </Link>
  )
}

function MatchRow({ match, team, njangi, events = 0 }: { match: Match; team: Team; njangi?: number; events?: number }) {
  const { t, lang } = useT('team')
  const done = match.status === 'done'
  const toScore = match.status === 'planned' && match.date < todayISO()
  const res = done ? resultOf(match) : null
  const resTone = res === 'W' ? 'bg-forest-50 text-forest-700' : res === 'L' ? 'bg-clay-50 text-clay-700' : 'bg-sand text-ink-soft'
  const left = match.home ? match.scoreUs : match.scoreThem
  const right = match.home ? match.scoreThem : match.scoreUs
  return (
    <Link to={`/app/matchs/${match.id}`} className="group flex items-center gap-3 p-3 transition hover:bg-sand/50 sm:gap-4 sm:px-4">
      <DateBlock iso={match.date} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={match.status} toScore={toScore} />
          <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-muted">
            {match.home ? <House size={13} strokeWidth={1.75} /> : <Plane size={13} strokeWidth={1.75} />}{match.home ? t('matches.home') : t('matches.away')}
          </span>
        </div>
        <div className="mt-1 line-clamp-2 break-words text-[16px] font-semibold leading-snug text-ink"><span className="mr-1 text-[13px] font-normal text-ink-faint">{t('matches.vs')}</span>{match.opponent}</div>
        <div className="mt-0.5 truncate text-[12.5px] text-ink-muted">
          {[match.competition, match.time, match.venue].filter(Boolean).join(', ')}
        </div>
      </div>
      {done ? (
        <div className="flex shrink-0 items-center gap-3">
          <div className="text-right">
            <div className="font-display text-2xl tabular-nums leading-none text-ink">{left}<span className="px-1 text-ink-faint">-</span>{right}</div>
            {res && <span className={cx('mt-1.5 inline-block rounded-full px-2 text-[11px] font-semibold', resTone)}>{t(`matches.result.${res}`)}</span>}
          </div>
          {njangi !== undefined && events > 0 && (
            <span className="flex flex-col items-center" title={t('matches.njangiTitle', { label: njangiLabel(njangi, lang) })}>
              <NjangiDial value={njangi} size={42} label={t('matches.njangi')} />
              <span className="mt-0.5 text-[11px] font-semibold text-ink-faint" aria-hidden="true">{t('matches.njangiShort')}</span>
            </span>
          )}
        </div>
      ) : <ChevronRight size={18} className="shrink-0 text-ink-faint transition group-hover:translate-x-0.5" />}
    </Link>
  )
}
