import Dexie, { type Table } from 'dexie'
import type {
  Profile, Team, Player, Session, Match, MatchEvent, VideoProject,
  AgentTask, ChatMessage, NotebookEntry, ChallengeLog,
} from './types'

export class NjangiDB extends Dexie {
  profile!: Table<Profile, string>
  teams!: Table<Team, string>
  players!: Table<Player, string>
  sessions!: Table<Session, string>
  matches!: Table<Match, string>
  events!: Table<MatchEvent, string>
  videos!: Table<VideoProject, string>
  tasks!: Table<AgentTask, string>
  messages!: Table<ChatMessage, string>
  notebook!: Table<NotebookEntry, string>
  challenges!: Table<ChallengeLog, string>

  constructor() {
    super('njangi')
    this.version(1).stores({
      profile: 'id',
      teams: 'id, createdAt',
      players: 'id, teamId, number',
      sessions: 'id, teamId, date, md',
      matches: 'id, teamId, date, status',
      events: 'id, matchId, [matchId+half], createdAt',
      videos: 'id, matchId, createdAt',
      tasks: 'id, status, createdAt',
      messages: 'id, thread, createdAt',
      notebook: 'id, date',
      challenges: 'id, challengeId, date',
    })
  }
}

export const db = new NjangiDB()

/** Wipe everything (Settings > reset). */
export async function resetAll() {
  await db.delete()
  location.href = '/'
}
