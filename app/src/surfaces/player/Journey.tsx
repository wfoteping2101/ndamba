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
  const parent = profile?.role === 'parent' // a parent picks their child's record, not their own
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
      <section className="max-w-2xl rounded-[22px] border border-line bg-paper p-5 sm:p-7">
        <div className="mb-5">
          <Route size={24} strokeWidth={1.75} className="text-forest-600" aria-hidden="true" />
          <h1 className="mt-3 text-[26px] leading-tight text-ink sm:text-[30px]">{t(parent ? 'page.linkTitleParent' : 'page.linkTitle')}</h1>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink-muted">{t(parent ? 'page.linkBodyParent' : 'page.linkBody', { team: team.name })}</p>
        </div>
        {players.length === 0 ? <p className="text-[14.5px] text-ink-muted">{t('page.linkEmpty')}</p> : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[...players].sort(byNumber).map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => updateProfile({ playerId: p.id })} className="flex min-h-[52px] w-full items-center gap-3 rounded-xl border border-line px-3 text-left transition hover:border-forest-500 hover:bg-forest-50/40">
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
