// In the player space: a doorway to "Mon parcours", with the season in three numbers.
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Route } from 'lucide-react'
import { useT } from '../../../i18n'
import { db } from '../../../lib/db'
import { useLiveQuery } from '../../../lib/hooks'
import { useSession } from '../../../lib/session'
import { todayISO } from '../../../lib/util'
import { linkedPlayer, seasonOf, seasonSummary } from '../../../lib/journey'
import type { Player } from '../../../lib/types'
import { useJourney } from '../../team/components/journey/bits'

export function JourneyCard() {
  const { t } = useT('journey')
  const { profile, team } = useSession()
  const players = useLiveQuery(() => (team ? db.players.where('teamId').equals(team.id).toArray() : Promise.resolve([] as Player[])), [team?.id], [] as Player[])
  const me = linkedPlayer(players, profile)
  const data = useJourney(me?.id)
  const season = seasonOf(todayISO())
  const s = useMemo(() => (data ? seasonSummary(data, season) : null), [data, season])
  return (
    <Link to="/app/joueur/parcours" className="mb-8 flex items-center gap-4 rounded-[14px] border border-line bg-paper px-4 py-3.5 transition hover:border-forest-300 sm:px-5">
      <Route size={22} strokeWidth={1.75} className="shrink-0 text-forest-600" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold text-ink">{t('playerCard.title')}</span>
        <span className="block text-[13.5px] text-ink-muted">
          {s ? t('playerCard.stats', { sessions: s.sessions.attended, matches: s.matches.played, objectives: s.objectives.active }) : t('playerCard.body')}
        </span>
      </span>
      <ChevronRight size={18} strokeWidth={1.75} className="shrink-0 text-ink-faint" aria-hidden="true" />
    </Link>
  )
}
