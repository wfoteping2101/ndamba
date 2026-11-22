// Joueurs: the recruitment profile of every player of every team. A switch makes a profile public,
// a meter shows how complete it is (no photo needed), and « Profil » opens the editor.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Search } from 'lucide-react'
import { useT } from '../../../i18n'
import { db } from '../../../lib/db'
import type { MatchEvent, Player, Team } from '../../../lib/types'
import { cx } from '../../../lib/util'
import { Progress, Segmented } from '../../../ui'
import { Switch } from '../components/bits'
import { completeness, COMPLETENESS, type ClubData } from '../components/data'

/** A team's name inside its club: « U19 » rather than « Étoile de la Côte U19 ». */
export function shortTeam(team: Team, clubName?: string) {
  if (!clubName || !team.name.startsWith(clubName)) return team.name
  const rest = team.name.slice(clubName.length).replace(/^[\s,.-]+/, '')
  return rest ? rest[0].toUpperCase() + rest.slice(1) : team.ageGroup
}

export async function setPublic(p: Player, on: boolean) {
  await db.players.update(p.id, { recruit: { ...(p.recruit ?? {}), public: on } })
}

export function PlayersTab({ data, eventsByMatch }: { data: ClubData; eventsByMatch: Map<string, MatchEvent[]> }) {
  const { t, lang } = useT('club')
  const club = data.club!
  const [team, setTeam] = useState('all')
  const [q, setQ] = useState('')
  const teamOrder = useMemo(() => new Map(data.teams.map((tm, i) => [tm.id, i])), [data.teams])
  const teamsById = useMemo(() => new Map(data.teams.map((tm) => [tm.id, tm])), [data.teams])
  const withIndice = useMemo(() => {
    const done = new Set(data.matches.filter((m) => m.status === 'done').map((m) => m.id))
    const s = new Set<string>()
    for (const [mid, evs] of eventsByMatch) if (done.has(mid)) for (const e of evs) if (e.playerId && e.side === 'us') s.add(e.playerId)
    return s
  }, [data.matches, eventsByMatch])
  const needle = q.trim().toLocaleLowerCase(lang)
  const list = useMemo(() => data.players
    .filter((p) => teamsById.has(p.teamId) && (team === 'all' || p.teamId === team) && (!needle || p.name.toLocaleLowerCase(lang).includes(needle)))
    .sort((a, b) => (teamOrder.get(a.teamId) ?? 0) - (teamOrder.get(b.teamId) ?? 0) || (a.number ?? 99) - (b.number ?? 99)), [data.players, team, needle, teamOrder, teamsById, lang])
  const publicCount = data.players.filter((p) => p.recruit?.public).length
  // all teams and no search: one block per team, in the club's team order
  const grouped = team === 'all' && !needle
  const groups: [Team | undefined, Player[]][] = grouped
    ? data.teams.map((tm) => [tm, list.filter((p) => p.teamId === tm.id)] as [Team, Player[]]).filter(([, l]) => l.length > 0)
    : [[undefined, list]]

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 rounded-card border border-line bg-paper px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-ink">{t('players.clubSwitch')}</div>
          <p className="mt-0.5 text-[13.5px] leading-snug text-ink-muted">{club.publicProfiles ? t('players.clubOn', { count: publicCount }) : t('players.clubOff')}</p>
        </div>
        <Switch checked={club.publicProfiles} label={t('players.clubSwitch')} onChange={(v) => db.club.update('club', { publicProfiles: v })} />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented value={team} onChange={setTeam} options={[{ id: 'all', label: t('players.all') }, ...data.teams.map((tm) => ({ id: tm.id, label: shortTeam(tm, club.name) }))]} />
        <label className="relative block lg:w-72">
          <span className="sr-only">{t('players.search')}</span>
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
          <input type="search" className="input min-h-[44px] pl-10" placeholder={t('players.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      {list.length === 0 ? (
        <p className="rounded-card border border-line bg-paper px-4 py-8 text-center text-[14.5px] text-ink-muted">{data.players.length ? t('players.noMatch') : t('players.empty')}</p>
      ) : (
        <div data-tour="club-players" className="space-y-6">
          {groups.map(([tm, players]) => (
            <section key={tm?.id ?? 'all'} aria-label={tm ? tm.name : undefined}>
              {tm && grouped && (
                <div className="mb-2 flex items-baseline gap-2 px-1">
                  <h3 className="text-[17px] leading-tight text-ink">{shortTeam(tm, club.name)}</h3>
                  <span className="num text-[13px] font-semibold text-ink-faint">{players.length}</span>
                </div>
              )}
              <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-paper">
                {players.map((p) => {
                const c = completeness(p, withIndice.has(p.id))
                const tm = teamsById.get(p.teamId)
                const on = !!p.recruit?.public
                return (
                  <li key={p.id} className="flex items-center gap-2 pr-2 sm:gap-3 sm:pr-3">
                    <Link to={`/app/club/joueurs/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 transition hover:bg-sand/40 sm:pl-5">
                      <span className="num grid h-10 w-10 shrink-0 place-items-center rounded-full bg-forest-50 font-display text-[15px] text-forest-700">{p.number ?? '-'}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15.5px] font-semibold text-ink">{p.name}</span>
                        <span className="mt-0.5 block truncate text-[12.5px] text-ink-muted">{[t(`common:positions.${p.position}`, { defaultValue: p.position }), tm && !grouped ? shortTeam(tm, club.name) : '', p.birthYear ? String(p.birthYear) : ''].filter(Boolean).join(', ')}</span>
                        <span className="mt-1.5 flex items-center gap-2 sm:hidden">
                          <span className="block w-24"><Progress value={c.pct} tone={c.pct === 100 ? 'forest' : 'sun'} /></span>
                          <span className="num whitespace-nowrap text-[12px] text-ink-muted">{t('players.complete', { n: c.n, total: COMPLETENESS.length })}</span>
                        </span>
                      </span>
                      <span className="hidden w-40 shrink-0 sm:block">
                        <span className="mb-1 flex justify-between text-[12px] text-ink-muted"><span>{t('players.completeness')}</span><span className="num">{c.n}/{COMPLETENESS.length}</span></span>
                        <Progress value={c.pct} tone={c.pct === 100 ? 'forest' : 'sun'} />
                      </span>
                      <ChevronRight size={18} className="hidden shrink-0 text-ink-faint md:block" aria-hidden="true" />
                    </Link>
                    <div className="flex shrink-0 flex-col items-center">
                      <Switch checked={on && club.publicProfiles} disabled={!club.publicProfiles} label={t('players.publicFor', { name: p.name })} onChange={(v) => setPublic(p, v)} />
                      <span className={cx('-mt-1 text-[11px] font-semibold', on && club.publicProfiles ? 'text-forest-700' : 'text-ink-faint')}>{on && club.publicProfiles ? t('players.public') : t('players.private')}</span>
                    </div>
                  </li>
                )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
      <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">{t('players.note')}</p>
    </div>
  )
}
