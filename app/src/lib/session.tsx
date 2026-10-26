import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { db } from './db'
import { useLiveQuery } from './hooks'
import type { Profile, Team } from './types'
import i18n, { setLang } from '../i18n'

interface SessionValue {
  ready: boolean
  profile: Profile | null
  team: Team | null
  teams: Team[]
}

const Ctx = createContext<SessionValue>({ ready: false, profile: null, team: null, teams: [] })

export function SessionProvider({ children }: { children: ReactNode }) {
  const data = useLiveQuery(async () => {
    const profile = (await db.profile.get('me')) ?? null
    const teams = await db.teams.orderBy('createdAt').toArray()
    const team = (profile?.activeTeamId && teams.find((t) => t.id === profile.activeTeamId)) || teams[0] || null
    return { ready: true, profile, team, teams }
  }, [], { ready: false, profile: null, team: null, teams: [] } as SessionValue)

  // keep the UI language in sync with the saved profile language
  useEffect(() => {
    const l = data.profile?.lang
    if (l && l !== i18n.language) setLang(l)
  }, [data.profile?.lang])

  return <Ctx.Provider value={data}>{children}</Ctx.Provider>
}

export const useSession = () => useContext(Ctx)

export async function updateProfile(patch: Partial<Profile>) {
  const cur = await db.profile.get('me')
  if (cur) await db.profile.update('me', patch)
}
