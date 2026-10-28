// /app/joueur/parcours: the player's own journey. The player sees the coach's evaluations and
// observations, the matches and sessions, and sets personal objectives.
import { Link } from 'react-router-dom'
import { ArrowLeft, Route, Shirt } from 'lucide-react'
import { EmptyState } from '../../ui'
import { useT } from '../../i18n'
import { db } from '../../lib/db'
import { useDocumentTitle, useLiveQuery } from '../../lib/hooks'
import { updateProfile, useSession } from '../../lib/session'
import { linkedPlayer } from '../../lib/journey'
import type { Player } from '../../lib/types'
import { BackLink, Spinner, useJourney } from '../team/components/journey/bits'
import { JourneyView } from '../team/components/journey/JourneyView'
import { NumberBadge } from '../team/components/bits'
import { byNumber } from '../team/components/lineup'

export default function PlayerJourney() {
  const { t } = useT('journey')
  useDocumentTitle(t('page.playerDocTitle'))
  const { profile, team } = useSession()
  const players = useLiveQuery(() => (team ? db.players.where('teamId').equals(team.id).toArray() : Promise.resolve([] as Player[])), [team?.id], null as Player[] | null)
  const me = players ? linkedPlayer(players, profile) : null
  const data = useJourney(me?.id)
  const back = <BackLink to="/app/joueur"><ArrowLeft size={16} />{t('page.backToSpace')}</BackLink>

  if (!team) return (
    <div>{back}
      <EmptyState icon={<Shirt size={32} />} title={t('page.noTeamTitle')} body={t('page.noTeamBody')} action={<Link to="/app/joueur" className="btn-primary">{t('page.backToSpace')}</Link>} />
    </div>
  )
  if (players === null || (me && data === undefined)) return <Spinner />
  if (!me || !data) return (
    <div>{back}
      <section className="card card-pad mx-auto max-w-2xl">
        <div className="mb-3 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-forest-600 text-cream"><Route size={20} aria-hidden="true" /></span>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">{t('page.linkTitle')}</h1>
            <p className="text-sm text-ink-muted">{t('page.linkBody', { team: team.name })}</p>
          </div>
        </div>
        {players.length === 0 ? <p className="rounded-xl bg-sand/60 px-3 py-3 text-sm text-ink-muted">{t('page.linkEmpty')}</p> : (
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {[...players].sort(byNumber).map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => updateProfile({ playerId: p.id })} className="flex min-h-[52px] w-full items-center gap-3 rounded-xl border border-line px-3 text-left transition hover:border-forest-300 hover:bg-forest-50/40">
                  <NumberBadge player={p} size="sm" /><span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{p.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
  return <JourneyView data={data} viewer="player" top={back} />
}
