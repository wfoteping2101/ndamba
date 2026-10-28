// Data operations of the team surface that touch several tables.
import { db } from '../../../lib/db'
import type { Player } from '../../../lib/types'

/** Remove a player from the squad and from the lineups, benches and captaincy of matches not yet played. Tagged events stay in the reports. */
export async function removePlayer(p: Pick<Player, 'id' | 'teamId'>) {
  await db.transaction('rw', db.players, db.matches, async () => {
    await db.players.delete(p.id)
    const ms = await db.matches.where('teamId').equals(p.teamId).filter((m) => m.status !== 'done').toArray()
    for (const m of ms) {
      await db.matches.update(m.id, {
        lineup: m.lineup.map((l) => (l.playerId === p.id ? { slot: l.slot } : l)),
        subs: m.subs.filter((id) => id !== p.id),
        captainId: m.captainId === p.id ? undefined : m.captainId,
      })
    }
  })
}
