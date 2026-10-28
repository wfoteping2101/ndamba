// /app/observer: fast observation during a session or a match. ?seance=<id>, ?match=<id> and ?joueur=<id>
// set the context and preselect a player. Every observation feeds the players' Parcours.
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ClipboardList, Eye, Shirt } from 'lucide-react'
import { EmptyState } from '../../ui'
import { useT } from '../../i18n'
import { db } from '../../lib/db'
import { useDocumentTitle, useLiveQuery } from '../../lib/hooks'
import { useSession } from '../../lib/session'
import { addDays, fmtDate, todayISO } from '../../lib/util'
import { attended } from '../../lib/journey'
import type { Match, Player, Session } from '../../lib/types'
import { byNumber } from './components/lineup'
import { BackLink, Spinner } from './components/journey/bits'
import { ObservationFeed, ObservePanel, type PlayerGroup } from './components/journey/ObservePanel'
import { AttendanceModal, attendanceCounts, useAttendance } from './components/journey/AttendanceModal'

export default function Observe() {
  const { t, lang } = useT('journey')
  useDocumentTitle(t('observe.docTitle'))
  const [params, setParams] = useSearchParams()
  const sessionQ = params.get('seance') ?? undefined
  const matchQ = params.get('match') ?? undefined
  const playerQ = params.get('joueur') ?? undefined
  const { team: active } = useSession()
  const today = todayISO()

  const data = useLiveQuery(async () => {
    const [session, match, player] = await Promise.all([
      sessionQ ? db.sessions.get(sessionQ) : undefined, matchQ ? db.matches.get(matchQ) : undefined, playerQ ? db.players.get(playerQ) : undefined,
    ])
    const teamId = session?.teamId ?? match?.teamId ?? player?.teamId ?? active?.id
    if (!teamId) return { teamId: null }
    const [team, players, sessions, matches] = await Promise.all([
      db.teams.get(teamId), db.players.where('teamId').equals(teamId).toArray(), db.sessions.where('teamId').equals(teamId).toArray(), db.matches.where('teamId').equals(teamId).toArray(),
    ])
    return { teamId, team, players: players.sort(byNumber), sessions, matches, player }
  }, [sessionQ, matchQ, playerQ, active?.id], undefined as undefined | { teamId: null } | { teamId: string; team?: { name: string }; players: Player[]; sessions: Session[]; matches: Match[]; player?: Player })

  // contexts on offer: recent and today's sessions and matches
  const options = useMemo(() => {
    if (!data || !data.teamId) return { sessions: [] as Session[], matches: [] as Match[] }
    const sessions = data.sessions.filter((s) => (s.date >= addDays(today, -14) && s.date <= addDays(today, 1)) || s.id === sessionQ).sort((a, b) => b.date.localeCompare(a.date))
    const matches = data.matches.filter((m) => m.status === 'live' || (m.date >= addDays(today, -21) && m.date <= addDays(today, 1)) || m.id === matchQ).sort((a, b) => b.date.localeCompare(a.date))
    return { sessions, matches }
  }, [data, today, sessionQ, matchQ])

  const ctx = sessionQ ? `s:${sessionQ}` : matchQ ? `m:${matchQ}` : (() => {
    const live = options.matches.find((m) => m.status === 'live') ?? options.matches.find((m) => m.date === today)
    if (live) return `m:${live.id}`
    const s = options.sessions.find((x) => x.date === today)
    return s ? `s:${s.id}` : 'free'
  })()
  const session = ctx.startsWith('s:') && data?.teamId ? data.sessions.find((s) => s.id === ctx.slice(2)) : undefined
  const match = ctx.startsWith('m:') && data?.teamId ? data.matches.find((m) => m.id === ctx.slice(2)) : undefined
  const marks = useAttendance(session?.id)
  const [minute, setMinute] = useState<number | null>(null)
  const [attOpen, setAttOpen] = useState(false)

  const setCtx = (v: string) => {
    const next = new URLSearchParams()
    if (v.startsWith('s:')) next.set('seance', v.slice(2))
    else if (v.startsWith('m:')) next.set('match', v.slice(2))
    if (playerQ) next.set('joueur', playerQ)
    setParams(next, { replace: true })
    setMinute(null)
  }

  if (data === undefined) return <Spinner />
  if (!data.teamId) return (
    <div className="mx-auto max-w-xl pt-6">
      <EmptyState icon={<Shirt size={32} />} title={t('observe.noTeamTitle')} body={t('observe.noTeamBody')} action={<Link to="/app/equipe" className="btn-primary">{t('observe.noTeamCta')}</Link>} />
    </div>
  )

  const players = data.players
  const byId = new Map(players.map((p) => [p.id, p]))
  let groups: PlayerGroup[]
  if (match) {
    const starters = match.lineup.map((l) => l.playerId).filter((id): id is string => !!id && byId.has(id)).map((id) => byId.get(id)!).sort(byNumber)
    const subs = match.subs.filter((id) => byId.has(id)).map((id) => byId.get(id)!).sort(byNumber)
    const others = players.filter((p) => !starters.includes(p) && !subs.includes(p))
    groups = [{ id: 'xi', label: t('observe.groups.starters'), players: starters }, { id: 'subs', label: t('observe.groups.subs'), players: subs }, { id: 'others', label: t('observe.groups.others'), players: others, muted: true }]
  } else if (session && marks.length) {
    const st = new Map(marks.map((m) => [m.playerId, m.status]))
    groups = [
      { id: 'in', label: t('observe.groups.present'), players: players.filter((p) => attended(st.get(p.id))) },
      { id: 'unmarked', label: t('observe.groups.unmarked'), players: players.filter((p) => !st.has(p.id)) },
      { id: 'out', label: t('observe.groups.absent'), players: players.filter((p) => st.has(p.id) && !attended(st.get(p.id))), muted: true },
    ]
  } else groups = [{ id: 'all', label: t('observe.groups.squad'), players }]

  const c = attendanceCounts(marks)
  const back = data.player ? `/app/equipe/${data.player.id}/parcours` : session ? `/app/seances/${session.id}` : match ? `/app/matchs/${match.id}` : '/app/equipe'
  const backLabel = data.player ? t('observe.backPlayer', { name: data.player.name }) : session ? t('observe.backSession') : match ? t('observe.backMatch') : t('observe.backTeam')
  const context = { sessionId: session?.id, matchId: match?.id, date: session?.date ?? match?.date ?? today }

  return (
    <div>
      <BackLink to={back}><ArrowLeft size={16} />{backLabel}</BackLink>
      <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2.5 font-display text-[30px] font-semibold leading-tight text-ink sm:text-[36px]"><Eye size={28} className="text-forest-600" aria-hidden="true" />{t('observe.title')}</h1>
          <p className="mt-1 max-w-2xl text-[15px] text-ink-muted">{t('observe.subtitle', { team: data.team?.name ?? '' })}</p>
        </div>
        <div className="card flex flex-col gap-2 p-3 sm:flex-row sm:items-end lg:min-w-[440px]">
          <div className="min-w-0 flex-1">
            <label htmlFor="obs-ctx" className="mb-1 block text-xs font-semibold text-ink-muted">{t('observe.context')}</label>
            <select id="obs-ctx" className="input h-11 py-0 text-sm" value={ctx} onChange={(e) => setCtx(e.target.value)}>
              <option value="free">{t('observe.ctxFree')}</option>
              {options.sessions.length > 0 && <optgroup label={t('observe.ctxSessions')}>{options.sessions.map((s) => <option key={s.id} value={`s:${s.id}`}>{fmtDate(s.date, lang, { weekday: 'short', day: 'numeric', month: 'short' })}, {s.title}</option>)}</optgroup>}
              {options.matches.length > 0 && <optgroup label={t('observe.ctxMatches')}>{options.matches.map((m) => <option key={m.id} value={`m:${m.id}`}>{fmtDate(m.date, lang, { weekday: 'short', day: 'numeric', month: 'short' })}, {t('timeline.vs', { opponent: m.opponent })}{m.status === 'live' ? ` (${t('observe.live')})` : ''}</option>)}</optgroup>}
            </select>
          </div>
          {session && (
            <button type="button" className="btn-outline h-11 shrink-0" onClick={() => setAttOpen(true)}>
              <ClipboardList size={16} />{c.marked ? t('observe.attendanceDone', { n: c.attended, count: players.length }) : t('observe.attendanceTake')}
            </button>
          )}
        </div>
      </header>

      <ObservePanel key={`${ctx}|${playerQ ?? ''}|${data.teamId}`} teamId={data.teamId} groups={groups} context={context}
        showMinute={!!match} minute={minute} onMinute={setMinute} initialSelected={playerQ && byId.has(playerQ) ? [playerQ] : []} />

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <ObservationFeed teamId={data.teamId} context={context} players={players} />
        <aside className="card card-pad h-fit text-[13.5px] leading-relaxed text-ink-soft">
          <h2 className="mb-1 font-display text-base font-semibold text-ink">{t('observe.tipTitle')}</h2>
          <p>{t('observe.tipBody')}</p>
        </aside>
      </div>

      {session && <AttendanceModal open={attOpen} onClose={() => setAttOpen(false)} session={session} players={players} />}
    </div>
  )
}
