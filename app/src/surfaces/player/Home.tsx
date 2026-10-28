// /app: a role-aware dashboard. Staff (coach, analyst, manager, federation) see the week and the match;
// players and parents see the challenges, the lesson of the day and the novel.
import { useSession } from '../../lib/session'
import CoachHome from './components/CoachHome'
import PlayerHome from './components/PlayerHome'
import { isPlayerRole } from './components/data'

export default function Home() {
  const { profile } = useSession()
  return isPlayerRole(profile?.role) ? <PlayerHome /> : <CoachHome />
}
