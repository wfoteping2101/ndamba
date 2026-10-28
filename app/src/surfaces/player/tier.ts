// Who the player space is for: an 8-year-old at the academy and a senior professional do not need
// the same page. One helper decides, with the age logic of the Parcours (lib/journey.ts):
//   youth  under 13       challenges, lessons of the novel, the notebook (play and discover)
//   teen   13 to 16       the same space, with more match detail
//   senior 17 and over    the performance space (match week, form and load, objectives, last match)
// Players of 16 (the U17 category) also get the performance space: they train on the match week.
import { db } from '../../lib/db'
import { useLiveQuery } from '../../lib/hooks'
import { useSession } from '../../lib/session'
import { ageOf, linkedPlayer } from '../../lib/journey'
import type { Player, Profile, Team } from '../../lib/types'

export type PlayerTier = 'youth' | 'teen' | 'senior'

/** Age in years: the squad record's birth year first, then the profile's category (U8 to U21, Seniors, Pro), then the team's. */
export function playerAge(profile: Pick<Profile, 'ageGroup'> | null | undefined, team?: Pick<Team, 'ageGroup'> | null, player?: Pick<Player, 'birthYear'> | null): number | null {
  if (player?.birthYear) return ageOf(player)
  const fromProfile = profile?.ageGroup ? ageOf({}, { ageGroup: profile.ageGroup }) : null
  if (fromProfile !== null) return fromProfile
  return team ? ageOf({}, team) : null
}

/** Same thresholds as stageOf in lib/journey.ts (kid, teen, adult). Unknown age reads as teen, like the Parcours. */
export function tierOfAge(age: number | null): PlayerTier {
  if (age === null) return 'teen'
  return age < 13 ? 'youth' : age < 17 ? 'teen' : 'senior'
}

export function playerTier(profile: Pick<Profile, 'ageGroup'> | null | undefined, team?: Pick<Team, 'ageGroup'> | null, player?: Pick<Player, 'birthYear'> | null): PlayerTier {
  return tierOfAge(playerAge(profile, team, player))
}

/** The performance space: 16 and over (U17, U19, U21, seniors, professionals). Parents keep the youth space of their child. */
export function isPerformance(age: number | null, role?: Profile['role']) {
  return role !== 'parent' && age !== null && age >= 16
}

/** The tier of the signed-in player, with the squad record the profile stands for. `ready` is false while the squad loads. */
export function usePlayerTier() {
  const { profile, team } = useSession()
  const players = useLiveQuery(() => (team ? db.players.where('teamId').equals(team.id).toArray() : Promise.resolve([] as Player[])), [team?.id], null as Player[] | null)
  const me = players ? linkedPlayer(players, profile) : null
  const age = playerAge(profile, team, me)
  return { ready: players !== null, me, age, tier: tierOfAge(age), performance: isPerformance(age, profile?.role) }
}
