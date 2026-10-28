// /app: a role-aware dashboard. Staff (coach, analyst, manager, federation) see the week and the match.
// Players of 16 and over see their performance home (match week, form and load, last match, objectives);
// younger players and parents see the challenges, the lesson of the day and the novel.
import { useSession } from '../../lib/session'
import CoachHome from './components/CoachHome'
import PlayerHome from './components/PlayerHome'
import PerformanceHome from './components/PerformanceHome'
import { isPlayerRole } from './components/data'
import { usePlayerTier } from './tier'

export default function Home() {
  const { profile } = useSession()
  const { ready, performance } = usePlayerTier()
  if (!isPlayerRole(profile?.role)) return <CoachHome />
  if (!ready) return null
  return performance ? <PerformanceHome /> : <PlayerHome />
}
