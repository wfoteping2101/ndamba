// Njangi data model. Everything is stored locally in IndexedDB (see db.ts).

export type Lang = 'fr' | 'en'
export type Role = 'player' | 'coach' | 'analyst' | 'parent' | 'manager' | 'federation'
export type Plan = 'free' | 'player' | 'coach' | 'club' | 'federation'
export type MD = 'MD-4' | 'MD-3' | 'MD-2' | 'MD-1' | 'MD+1' | 'youth'
export type Intention = 'sortir' | 'progresser' | 'fixer' | 'finir' | 'respirer' | 'reprendre' | 'regarder-devant'
export type SkillKey =
  | 'scan' | 'controle' | 'passe' | 'conduite' | 'dribble-njangi'
  | 'appels' | 'communication' | 'protection' | 'contre-pression' | 'decision'
export type Piece = 'le cœur' | 'la raison' | 'les yeux' | 'la carte' | 'le souffle'

export interface Profile {
  id: 'me'
  name: string
  role: Role
  lang: Lang
  country?: string
  city?: string
  club?: string
  ageGroup?: string
  position?: string
  goals: string[]
  plan: Plan
  onboarded: boolean
  activeTeamId?: string
  /** Parcours: the squad record (Player.id) this profile is, for the player space. Falls back to a name match in the active team. */
  playerId?: string
  createdAt: string
}

export interface Team {
  id: string
  name: string
  ageGroup: string // e.g. "U13", "Seniors"
  format: 5 | 7 | 8 | 9 | 11
  formation: string // e.g. "4-3-3"
  colors: { primary: string; secondary: string }
  createdAt: string
}

export interface Player {
  id: string
  teamId: string
  name: string
  number?: number
  position: string // GK, CB, FB, DM, CM, AM, W, ST
  birthYear?: number
  foot?: 'R' | 'L' | 'B'
  skills: Partial<Record<SkillKey, 1 | 2 | 3 | 4>>
  notes?: string
  /** recruitment profile (club): what a recruiter or a scholarship office sees */
  recruit?: { public: boolean; bio?: string; heightCm?: number; highlightClipIds?: string[] }
  createdAt: string
}

export interface SessionBlock {
  id: string
  drillId?: string // a drill code like "R02"; empty for a custom block
  title?: string // custom block title
  minutes: number
  notes?: string
}

export interface Session {
  id: string
  teamId?: string
  title: string
  date: string // YYYY-MM-DD
  md: MD
  intention?: Intention
  blocks: SessionBlock[]
  notes?: string
  createdBy?: 'user' | 'mola'
  createdAt: string
}

export interface GamePlan {
  possession: string
  transitionDef: string
  defense: string
  transitionOff: string
  setPieces: string
}

export interface LineupSlot {
  slot: string // slot id from the formation, e.g. "GK", "LCB", "DM"
  playerId?: string
}

export type MatchStatus = 'planned' | 'live' | 'done'

export interface Match {
  id: string
  teamId: string
  opponent: string
  date: string // YYYY-MM-DD
  time?: string // HH:MM
  venue?: string
  home: boolean
  competition?: string
  format: 5 | 7 | 8 | 9 | 11
  formation: string
  halfMinutes: number
  lineup: LineupSlot[]
  subs: string[]
  captainId?: string
  plan: GamePlan
  status: MatchStatus
  scoreUs: number
  scoreThem: number
  notes?: string
  /** Parcours: minutes played per player id, when the coach records them. Without an entry, starters play the whole match and subs 0. */
  minutes?: Record<string, number>
  /** Player of the match, chosen by the staff */
  potmId?: string
  createdBy?: 'user' | 'mola'
  createdAt: string
}

/** Set pieces: counted and mapped apart, they never enter the Indice Njangi. */
export type SetPieceCode = 'CORNER' | 'FREEKICK' | 'PENALTY' | 'THROWIN' | 'GOALKICK'
export const SET_PIECE_CODES: SetPieceCode[] = ['CORNER', 'FREEKICK', 'PENALTY', 'THROWIN', 'GOALKICK']

/** Live tagging codes, identical to La Méthode Njangi (chapters 19 and 20), plus the set pieces. */
export type EventCode =
  | 'PASS_OK' | 'PASS_LOST' | 'PROG' | 'LINE' | 'FINAL3' | 'BOX'
  | 'FIX2' | 'SWITCH' | 'LOSS' | 'REGAIN5' | 'REGAIN'
  | 'SHOT' | 'SHOT_IN' | 'GOAL'
  | SetPieceCode

export interface MatchEvent {
  id: string
  matchId: string
  t: number // seconds since kickoff of the half
  half: 1 | 2 | 3 | 4
  code: EventCode
  side: 'us' | 'them'
  playerId?: string
  /** seconds in the match video when the action was coded on the video (absent when coded live) */
  videoT?: number
  /**
   * Where the action happened, in percent of the pitch, always seen from our attack:
   * x from our goal line (0) to theirs (100), y from our left touchline (0) to our right (100).
   * An action of the opponent uses the same frame (their attack goes towards x = 0). Absent when not placed.
   */
  x?: number
  y?: number
  /** the teammate who received the pass, for the passing network */
  toPlayerId?: string
  createdAt: string
}

export interface VideoTag {
  id: string
  t: number // seconds in the video
  code: EventCode | 'NOTE'
  side: 'us' | 'them'
  note?: string
  drawing?: string // data URL of a telestration snapshot
}

/** file: on this device, never uploaded; youtube / facebook: a link; hosted: stored by Ndamba (paid upload) */
export type VideoSource = 'file' | 'youtube' | 'facebook' | 'hosted'

/** A moment of the video kept for review or for the players: a custom clip, or an automatic one around a coded action. */
export interface Clip {
  id: string
  start: number // video seconds
  end: number
  title: string
  note?: string
  playerIds?: string[]
  /** automatic clip made from a coded action (goal, shot): it follows the action and cannot be edited, only duplicated */
  eventId?: string
  auto?: boolean
  /** telestration snapshot (data URL) shown at the start of the clip */
  drawing?: string
  createdAt: string
}

/** An ordered list of clips: a video session for the players, a scouting report, a recruitment reel. */
export interface Playlist {
  id: string
  title: string
  clipIds: string[]
  note?: string
  createdAt: string
}

/** Paid hosting on Ndamba (see VIDEO_HOSTING in config.ts). demo: simulated, nothing was sent nor billed. */
export interface Hosting {
  plan: 'pass' | 'club'
  sizeMB?: number
  uploadedAt: string
  expiresAt?: string
  demo?: boolean
}

/** One frame read by the AI (Claude), every few seconds of the match video. */
export interface AiFrame {
  t: number // seconds in the video
  phase: 'us' | 'them' | 'contested' | 'dead' | 'unclear' // who has the ball
  third: 'def' | 'mid' | 'att' | null // where the ball is, seen from our attack
  block: 'high' | 'mid' | 'low' | null // our block when the opponent has the ball
  behind: number | null // our outfield players behind the ball when we have it (rest defence)
  note?: string
  flag?: boolean // worth watching again
}

export interface AiAnalysis {
  interval: number // seconds between two frames
  from: number // video seconds analysed
  to: number
  frames: AiFrame[]
  summary?: string
  lang: 'fr' | 'en'
  model?: string
  startedAt: string
  doneAt?: string
}

export interface VideoProject {
  id: string
  title: string
  /** where the video lives: a file on this device (never uploaded), or a YouTube or Facebook link */
  source?: VideoSource
  url?: string
  fileName?: string
  matchId?: string
  duration?: number
  /** video seconds of each kick-off, to turn video time into match time */
  kickoff1?: number
  kickoff2?: number
  /** for the AI: our shirts, theirs, and the side we attack in the first half (seen on the image) */
  ourColor?: string
  theirColor?: string
  attackRight1?: boolean
  ai?: AiAnalysis
  /** notes and drawings; coded actions of a linked match live in its events (with videoT) */
  tags: VideoTag[]
  /** match (default), training, or scouting of another team */
  kind?: 'match' | 'training' | 'scouting'
  /** the club team the video belongs to (club video library) */
  teamId?: string
  /** scouting: the team watched */
  opponent?: string
  clips?: Clip[]
  playlists?: Playlist[]
  hosting?: Hosting
  createdAt: string
}

/* ---------------- Club: the club around the teams (Club plan) ---------------- */

export interface Club {
  id: 'club'
  name: string
  city?: string
  country?: string
  founded?: number
  colors: { primary: string; secondary: string }
  about?: string
  /** the club's game model in a few lines (shared by every team's analysis) */
  gameModel?: string
  /** recruitment profiles of players can be shown on a public page */
  publicProfiles: boolean
  createdAt: string
}

export type MemberRole = 'admin' | 'coach' | 'analyst' | 'player' | 'parent'

/** A person of the club and what they can reach (see MEMBER_RIGHTS in config.ts). */
export interface Member {
  id: string
  name: string
  email?: string
  role: MemberRole
  teamIds: string[]
  /** for a player or a parent: the squad record */
  playerId?: string
  status: 'active' | 'invited'
  invitedAt?: string
  createdAt: string
}

/* ---------------- Pickup: friendly games between players (FC Pickup style) ---------------- */

export type PickupTier = 'bronze' | 'silver' | 'gold'
export type PayMethod = 'momo' | 'orange' | 'cash' | 'card' | 'waived'

export interface PickupGroup {
  id: string
  name: string
  venue: string
  city?: string
  /** pitch position, for the check-in by location */
  lat?: number
  lng?: number
  /** players per side (5 for 5 v 5) */
  perSide: number
  defaultDay?: number // 0 Sunday .. 6 Saturday
  defaultTime?: string // HH:MM
  defaultFee?: number
  currency: 'XAF' | 'USD' | 'EUR'
  minTier?: PickupTier
  allowGuests: boolean
  ratingsOn: boolean
  /** PickupPlayer ids who can organise (up to 3 co-admins plus the host) */
  adminIds: string[]
  /** where players send the fee */
  payHandles: { momo?: string; orange?: string; cash?: boolean }
  inviteCode: string
  createdAt: string
}

export interface PickupPlayer {
  id: string
  groupId: string
  name: string
  nickname: string
  phone?: string
  /** this browser's user */
  isMe?: boolean
  /** no-show flags (ISO dates); three within 30 days suspend RSVPs */
  flags: string[]
  suspendedUntil?: string
  createdAt: string
}

export interface PickupGame {
  id: string
  groupId: string
  date: string // YYYY-MM-DD
  time: string // HH:MM
  cap: number // players in total
  rsvpDeadline?: string // ISO
  fee: number
  status: 'open' | 'played' | 'cancelled'
  teams?: { a: string[]; b: string[] }
  score?: { a: number; b: number }
  note?: string
  createdAt: string
}

export interface PickupRsvp {
  id: string // `${gameId}:${playerId}` or `${gameId}:guest:${n}`
  gameId: string
  playerId: string
  status: 'going' | 'waitlist' | 'out'
  /** a +1 brought by this player */
  guestOf?: string
  guestName?: string
  joinedAt: string
  checkedInAt?: string
  late?: boolean
  noShow?: boolean
  paid?: PayMethod
}

export interface PickupRating {
  id: string // `${gameId}:${from}:${to}`
  gameId: string
  from: string
  to: string
  score: 1 | 2 | 3 | 4 | 5
  createdAt: string
}

export type TaskStatus = 'running' | 'needs_approval' | 'done' | 'cancelled' | 'failed'

export interface AgentStep { label: string; done: boolean }

export interface AgentApproval {
  kind: 'message' | 'calendar' | 'delete' | 'other'
  channel?: 'whatsapp' | 'sms' | 'email' | 'copy'
  to?: string
  subject?: string
  text: string
}

export interface AgentTask {
  id: string
  request: string
  intent: string
  status: TaskStatus
  steps: AgentStep[]
  summary?: string
  resultRoute?: string
  approval?: AgentApproval
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  thread: 'onboarding' | 'mola'
  role: 'mola' | 'user'
  text: string
  taskId?: string
  chips?: string[]
  createdAt: string
}

export interface NotebookEntry {
  id: string
  date: string
  title: string
  text: string
  lessonNo?: number
  createdAt: string
}

export interface ChallengeLog {
  id: string
  challengeId: string
  date: string // YYYY-MM-DD
  value: number // reps, score, minutes
  createdAt: string
}

/** A drill from La Méthode Njangi (generated from coach/drills/*.json). */
export interface DrillText {
  title: string
  subtitle: string
  objective: string
  organisation: string[]
  rules: string[]
  coaching: string[]
  progressions: string[]
  regressions: string[]
  measure: string
  story?: string
}

export interface Drill {
  id: string
  family: 'technique' | 'rondo' | 'position' | 'ssg' | 'lsg' | 'phase' | 'transition' | 'finishing'
  order: number
  ages: string
  players: { min: number; max: number; fr: string; en: string }
  space: { w: number; h: number }
  duration: { fr: string; en: string }
  minutes: number
  md: MD[]
  intensity: 'low' | 'medium' | 'high' | 'very-high'
  intentions: Intention[]
  skills: SkillKey[]
  pieces: Piece[]
  fr: DrillText
  en: DrillText
  diagram: DiagramSpec
  diagram2?: DiagramSpec | null
}

/** Pitch diagram spec, shared with both books (tools/pitch.mjs). */
export interface DiagramSpec {
  view: 'grid' | 'half' | 'third' | 'full'
  w?: number
  h?: number
  players?: { id: string; team: 'a' | 'b' | 'n' | 'gk' | 'gkb'; x: number; y: number; label?: string }[]
  ball?: string | [number, number]
  arrows?: { from: string | [number, number]; to: string | [number, number]; kind: 'pass' | 'run' | 'dribble' | 'shot' | 'press'; n?: number }[]
  zones?: { x: number; y: number; w: number; h: number; label?: string; tone?: 'a' | 'b' | 'n' | 'soft' }[]
  labels?: { x: number; y: number; text: string }[]
  goals?: { x: number; y: number; side: 'left' | 'right' | 'top' | 'bottom'; size?: 'mini' | 'full' }[]
  cones?: [number, number][]
}

/** A "Leçon du Ballon" from Tome 1 (generated from tome1/chapters/*.md). */
export interface Lesson {
  no: number
  part: number
  chapterTitle: string
  title: string
  lines: string[]
  diagram?: DiagramSpec | null
}

/* ---------------- Parcours: the journey of each player (training, observation, follow-up) ---------------- */

/** The five sub-indices of the Indice Njangi (same keys as SubKey in njangi.ts). */
export type NjangiSub = 'progression' | 'penetration' | 'fixation' | 'reprise' | 'controle'

/**
 * A dated evaluation of the ten competences (Le Code Njangi, chapter 25 grid, levels 1 to 4).
 * Player.skills stays the current snapshot; evaluations keep the history over the seasons.
 */
export interface Evaluation {
  id: string
  playerId: string
  teamId: string
  date: string // YYYY-MM-DD
  skills: Partial<Record<SkillKey, 1 | 2 | 3 | 4>>
  note?: string
  by: 'coach' | 'player'
  createdAt: string
}

export type ObsTone = 'plus' | 'work'

/** A quick observation taken during a session or a match (Observer mode). One record per player. */
export interface Observation {
  id: string
  playerId: string
  teamId: string
  date: string // YYYY-MM-DD
  sessionId?: string
  matchId?: string
  /** match minute (1 and up) when taken during a match */
  minute?: number
  /** clock time HH:MM */
  time?: string
  /** competences seen, each as a strength (plus) or something to work on (work) */
  skills: Partial<Record<SkillKey, ObsTone>>
  /** quick tag ids, see OBS_TAGS in lib/journey.ts (each tag carries its own tone) */
  tags: string[]
  rating?: 1 | 2 | 3 | 4 | 5
  note?: string
  /** the same observation given to several players at once */
  groupId?: string
  by: 'coach' | 'player'
  createdAt: string
}

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused' | 'injured'

/** Who attended a session. The id is `${sessionId}:${playerId}`, so there is one mark per player and session. */
export interface Attendance {
  id: string
  sessionId: string
  playerId: string
  teamId: string
  date: string // the session date
  status: AttendanceStatus
  createdAt: string
}

/** active = in progress; then the review gives achieved, partial or notyet ("pas encore"). */
export type ObjectiveStatus = 'active' | 'achieved' | 'partial' | 'notyet'

/** A personal objective for a cycle (1 to 3 at a time), linked to a competence or a sub-index of the Indice Njangi. */
export interface Objective {
  id: string
  playerId: string
  teamId: string
  title: string
  skill?: SkillKey
  sub?: NjangiSub
  start: string // YYYY-MM-DD
  review: string // review date, end of the cycle
  status: ObjectiveStatus
  reviewNote?: string
  reviewedAt?: string
  by: 'coach' | 'player'
  createdAt: string
}

/* ---------------- Player space: form and load (Le Code Njangi, chapter 29) ---------------- */

export type Score5 = 1 | 2 | 3 | 4 | 5

/**
 * The player's own daily report, one record per day (id `wl_${date}`): the morning form questionnaire
 * (five items from 1 to 5, here 5 is always the best answer) and, about thirty minutes after the session
 * or the match, the perceived exertion (0 to 10) and the minutes. Load = rpe x minutes, in arbitrary units.
 */
export interface Wellness {
  id: string
  date: string // YYYY-MM-DD
  playerId?: string
  sleep?: Score5
  fatigue?: Score5 // 5 = very fresh
  soreness?: Score5 // 5 = no soreness
  mood?: Score5
  stress?: Score5 // 5 = very relaxed
  rpe?: number // 0 to 10
  minutes?: number
  sessionId?: string
  matchId?: string
  createdAt: string
  updatedAt?: string
}

export type MilestoneKind = 'callup' | 'promotion' | 'captain' | 'injury' | 'return' | 'award' | 'other'

/** A moment the coach records by hand (call-up, move up a category, injury...). First match, first goal and level changes are derived. */
export interface Milestone {
  id: string
  playerId: string
  teamId: string
  date: string
  kind: MilestoneKind
  title: string
  note?: string
  createdAt: string
}
