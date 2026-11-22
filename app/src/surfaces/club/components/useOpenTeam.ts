import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../../../lib/db'

/** Make a team the active one (the same as Settings, Équipes) and open one of its pages. */
export function useOpenTeam() {
  const navigate = useNavigate()
  return useCallback(async (teamId: string, to = '/app/equipe') => {
    await db.profile.update('me', { activeTeamId: teamId })
    navigate(to)
  }, [navigate])
}
