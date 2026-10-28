import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Eye, ListPlus, Pencil, Shirt, Trash2, Trophy, UserPlus } from 'lucide-react'
import { db } from '../../lib/db'
import { useLiveQuery, useDocumentTitle } from '../../lib/hooks'
import { useSession, updateProfile } from '../../lib/session'
import { skillAvg } from '../../lib/actions'
import { BRAND } from '../../lib/config'
import type { Player } from '../../lib/types'
import { EmptyState } from '../../ui'
import { useT } from '../../i18n'
import { cx } from '../../lib/util'
import { LINES, byNumber, lineOf, fmtAvg, type Line } from './components/lineup'
import { AvgBar, ConfirmModal, NumberBadge } from './components/bits'
import { ImportModal, PlayerFormModal, TeamFormModal } from './components/forms'
import { LineupBoard } from './components/LineupBoard'
import { removePlayer } from './components/data'
import { autoLineup } from '../../lib/actions'

export default function Roster() {
  const { t, lang } = useT('team')
  const { team, teams } = useSession()
  useDocumentTitle(team?.name ?? t('roster.docTitle'))
  const players = useLiveQuery(() => (team ? db.players.where('teamId').equals(team.id).toArray() : Promise.resolve([] as Player[])), [team?.id], [] as Player[])
  const [teamModal, setTeamModal] = useState<'create' | 'edit' | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Player | null>(null)

  const grouped = useMemo(() => {
    const g: Record<Line, Player[]> = { gk: [], def: [], mid: [], att: [] }
    for (const p of [...players].sort(byNumber)) g[lineOf(p.position)].push(p)
    return g
  }, [players])
  const rated = players.filter((p) => skillAvg(p) > 0)
  const teamAvg = rated.length ? rated.reduce((s, p) => s + skillAvg(p), 0) / rated.length : 0
  const preview = useMemo(() => (team && players.length ? autoLineup(players, team.format, team.formation).lineup : []), [players, team])

  const remove = async (p: Player) => { await removePlayer(p); setToDelete(null) }

  if (!team) {
    return (
      <>
        <div className="mx-auto max-w-xl pt-6">
          <EmptyState icon={<Shirt size={34} />} title={t('noTeam.title')} body={t('noTeam.body', { app: BRAND.name })}
            action={<button type="button" className="btn-primary btn-lg" onClick={() => setTeamModal('create')}>{t('noTeam.cta')}</button>} />
        </div>
        <TeamFormModal open={teamModal === 'create'} onClose={() => setTeamModal(null)} />
      </>
    )
  }

  return (
    <div>
      {/* Team plate */}
      <section className="relative mb-8 overflow-hidden rounded-[22px] bg-forest-600 text-cream [&_:focus-visible]:outline-cream">
        <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_250px] lg:items-center">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-semibold text-cream/70">{t('roster.eyebrow')}</span>
              {teams.length > 1 && (
                <label className="ml-auto inline-flex items-center gap-2 text-xs text-cream/80">
                  <span className="sr-only">{t('roster.switchTeam')}</span>
                  <select className="rounded-lg border border-white/20 bg-forest-700 px-2 py-1 text-xs font-semibold text-cream" value={team.id}
                    onChange={(e) => updateProfile({ activeTeamId: e.target.value })}>
                    {teams.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                </label>
              )}
            </div>
            <h1 className="font-display text-[30px] leading-[1.06] sm:text-[42px]">{team.name}</h1>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[team.ageGroup, t('formatLabel', { n: team.format }), team.formation].map((x) => (
                <span key={x} className="rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold">{x}</span>
              ))}
            </div>
            <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3">
              <div><dt className="text-[13px] text-cream/70">{t('roster.statPlayers')}</dt><dd className="mt-0.5 font-display text-[32px] leading-none tabular-nums">{players.length}</dd></div>
              <div><dt className="text-[13px] text-cream/70">{t('roster.statKeepers')}</dt><dd className="mt-0.5 font-display text-[32px] leading-none tabular-nums">{grouped.gk.length}</dd></div>
              <div><dt className="text-[13px] text-cream/70">{t('roster.avgLevel')}</dt><dd className="mt-0.5 font-display text-[32px] leading-none tabular-nums">{teamAvg ? fmtAvg(teamAvg, lang) : '-'}<span className="ml-1 font-sans text-[15px] font-medium text-cream/60">/ 4</span></dd></div>
            </dl>
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" className="btn bg-cream text-forest-700 hover:bg-white" onClick={() => setAddOpen(true)}><UserPlus size={17} />{t('roster.addPlayer')}</button>
              <button type="button" className="btn border border-white/25 text-cream hover:bg-white/10" onClick={() => setImportOpen(true)}><ListPlus size={17} />{t('roster.import')}</button>
              <button type="button" className="btn text-cream/90 hover:bg-white/10" onClick={() => setTeamModal('edit')}><Pencil size={16} />{t('roster.editTeam')}</button>
              {players.length > 0 && <Link to="/app/observer" className="btn-sun"><Eye size={17} />{t('journey:actions.observe')}</Link>}
            </div>
          </div>
          {players.length > 0 && (
            <div className="hidden lg:block">
              <LineupBoard format={team.format} formation={team.formation} lineup={preview} players={players} size="sm" className="!rounded-2xl !shadow-none ring-white/15" />
            </div>
          )}
        </div>
      </section>

      {players.length === 0 ? (
        <EmptyState icon={<UserPlus size={32} />} title={t('roster.emptyTitle')} body={t('roster.emptyBody')}
          action={<div className="flex flex-wrap justify-center gap-2">
            <button type="button" className="btn-primary" onClick={() => setAddOpen(true)}><UserPlus size={17} />{t('roster.addPlayer')}</button>
            <button type="button" className="btn-outline" onClick={() => setImportOpen(true)}><ListPlus size={17} />{t('roster.import')}</button>
          </div>} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 lg:grid-cols-2">
            {LINES.map((line) => (
              <section key={line} aria-labelledby={`line-${line}`} className="min-w-0">
                <div className="mb-2.5 flex items-baseline gap-2 px-1">
                  <h2 id={`line-${line}`} className="font-display text-[20px] text-ink">{t(`lines.${line}`)}</h2>
                  <span className="text-[13px] font-semibold tabular-nums text-ink-faint">{grouped[line].length}</span>
                </div>
                <ul className="card divide-y divide-line/70 overflow-hidden">
                  {grouped[line].length === 0 && <li className="px-4 py-5 text-sm text-ink-faint">{t('roster.emptyLine')}</li>}
                  {grouped[line].map((p) => (
                    <li key={p.id} className="flex items-center">
                      <Link to={`/app/equipe/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 transition hover:bg-sand/50 sm:px-4">
                        <NumberBadge player={p} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15.5px] font-semibold text-ink">{p.name}</span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-ink-muted">
                            <span>{t(`common:positions.${p.position}`)}</span>
                            {p.birthYear && <span className="tabular-nums">{p.birthYear}</span>}
                            {p.foot && <span>{t(`footShort.${p.foot}`)}</span>}
                          </span>
                          <AvgBar value={skillAvg(p)} className="mt-1 sm:hidden" />
                        </span>
                        <AvgBar value={skillAvg(p)} className="hidden sm:inline-flex" />
                        <ChevronRight size={18} className="hidden shrink-0 text-ink-faint sm:block" />
                      </Link>
                      <button type="button" onClick={() => setToDelete(p)} aria-label={t('roster.remove', { name: p.name })}
                        className={cx('mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-faint/70 transition hover:bg-clay-50 hover:text-clay-600')}>
                        <Trash2 size={16} strokeWidth={1.75} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <Link to="/app/matchs" className="btn-outline"><Trophy size={17} />{t('roster.toMatches')}</Link>
          </div>
        </>
      )}

      <TeamFormModal open={teamModal !== null} onClose={() => setTeamModal(null)} team={teamModal === 'edit' ? team : null} />
      <PlayerFormModal open={addOpen} onClose={() => setAddOpen(false)} teamId={team.id} takenNumbers={players.map((p) => p.number).filter((n): n is number => n !== undefined)} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} teamId={team.id} />
      <ConfirmModal open={!!toDelete} onClose={() => setToDelete(null)} title={t('roster.deleteTitle')} body={t('roster.deleteBody', { name: toDelete?.name ?? '' })}
        confirm={t('roster.deleteConfirm')} onConfirm={() => toDelete && remove(toDelete)} />
    </div>
  )
}
