// In the player space: a doorway to "Mon parcours", with the season in three numbers.
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Route } from 'lucide-react'
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
    <Link to="/app/joueur/parcours" className="mb-6 flex items-center gap-4 rounded-2xl border border-forest-100 bg-forest-50/70 p-4 shadow-card transition hover:border-forest-300 sm:mb-8">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-forest-600 text-cream"><Route size={22} aria-hidden="true" /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg font-semibold text-ink">{t('playerCard.title')}</span>
        <span className="block text-[13px] text-ink-muted">
          {s ? t('playerCard.stats', { sessions: s.sessions.attended, matches: s.matches.played, objectives: s.objectives.active }) : t('playerCard.body')}
        </span>
      </span>
      <ArrowRight size={18} className="shrink-0 text-forest-600" aria-hidden="true" />
    </Link>
  )
}
