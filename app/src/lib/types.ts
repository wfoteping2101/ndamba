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
  createdBy?: 'user' | 'mola'
  createdAt: string
}

/** Live tagging codes, identical to La Méthode Njangi (chapters 19 and 20). */
export type EventCode =
  | 'PASS_OK' | 'PASS_LOST' | 'PROG' | 'LINE' | 'FINAL3' | 'BOX'
  | 'FIX2' | 'SWITCH' | 'LOSS' | 'REGAIN5' | 'REGAIN'
  | 'SHOT' | 'SHOT_IN' | 'GOAL'

export interface MatchEvent {
  id: string
  matchId: string
  t: number // seconds since kickoff of the half
  half: 1 | 2 | 3 | 4
  code: EventCode
  side: 'us' | 'them'
  playerId?: string
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

export interface VideoProject {
  id: string
  title: string
  fileName?: string
  matchId?: string
  duration?: number
  tags: VideoTag[]
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
