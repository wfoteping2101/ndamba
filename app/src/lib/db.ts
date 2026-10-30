import Dexie, { type Table } from 'dexie'
import type {
  Profile, Team, Player, Session, Match, MatchEvent, VideoProject,
  AgentTask, ChatMessage, NotebookEntry, ChallengeLog,
  Evaluation, Observation, Attendance, Objective, Milestone, Wellness,
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
  // Parcours (version 2)
  evaluations!: Table<Evaluation, string>
  observations!: Table<Observation, string>
  attendance!: Table<Attendance, string>
  objectives!: Table<Objective, string>
  milestones!: Table<Milestone, string>
  // Player space (version 3): daily form and session load
  wellness!: Table<Wellness, string>

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
    // Version 2: the Parcours (dated evaluations, observations, attendance, objectives, milestones).
    // Additive only: no existing table changes. Every player already rated gets a first dated
    // evaluation with the levels on record, so the history starts from the data people already have.
    this.version(2).stores({
      evaluations: 'id, playerId, teamId, date, [playerId+date]',
      observations: 'id, playerId, teamId, date, sessionId, matchId, groupId',
      attendance: 'id, sessionId, playerId, teamId, date',
      objectives: 'id, playerId, teamId, status, review',
      milestones: 'id, playerId, teamId, date',
    }).upgrade(async (tx) => {
      const players = (await tx.table('players').toArray()) as Player[]
      const now = new Date().toISOString()
      const first: Evaluation[] = players
        .filter((p) => p.skills && Object.values(p.skills).some(Boolean))
        .map((p) => ({ id: `eva_v2_${p.id}`, playerId: p.id, teamId: p.teamId, date: (p.createdAt || now).slice(0, 10), skills: { ...p.skills }, by: 'coach', createdAt: now }))
      if (first.length) await tx.table('evaluations').bulkPut(first)
    })
    // Version 3: the player's daily form and session load (Le Code Njangi, chapter 29). Additive only: one new table.
    this.version(3).stores({
      wellness: 'id, date, playerId',
    })
  }
}

export const db = new NjangiDB()

/** Wipe everything (Settings > reset). */
export async function resetAll() {
  await db.delete()
  // what the app keeps beside the database (player space, live clocks, Mola's small memory), but not the language
  try { for (const k of Object.keys(localStorage)) if (k.startsWith('njangi.') && k !== 'njangi.lang') localStorage.removeItem(k) } catch { /* storage unavailable */ }
  location.href = '/'
}
