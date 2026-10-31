import type { Plan } from './types'

export const BRAND = {
  /** The app. "Ndamba" is Cameroonian slang for football. */
  name: 'Ndamba',
  tagline: { fr: 'Le football avec intention', en: 'Football with purpose' },
  /** The philosophy, the method and the score keep the Njangi name (Indice Njangi, méthode Njangi). */
  philosophy: { fr: 'Posséder avec intention', en: 'Possession with purpose' },
  motto: { fr: 'Le ballon doit voyager. Mais il doit savoir où il va.', en: 'The ball must travel. But it must know where it is going.' },
  mantra: { fr: 'Une nation africaine championne du monde en 2030 ou en 2034.', en: 'An African nation crowned world champion in 2030 or 2034.' },
  author: 'William Foteping',
  owner: 'Lemon Network Solutions',
}

/** The children's saga: series wordmark LIONCEAUX, starring Kaydoudou & BriBri (6 tomes planned, tome 1 published). */
export const SERIES = {
  name: 'Lionceaux',
  heroes: 'Kaydoudou & BriBri',
  tomes: [
    { n: 1, title: 'Le Ballon qui voyage', available: true },
    { n: 2, title: 'La Tanière des Lionceaux', available: false },
    { n: 3, title: 'Premier contrat', available: false },
    { n: 4, title: 'La CAN', available: false },
    { n: 5, title: 'Mondial 2030', available: false },
    { n: 6, title: "2034, l'étoile", available: false },
  ],
}

export const BOOKS = {
  tome1: { href: '/book/tome1/', cover: '/book/tome1/img/cover.jpg', title: { fr: 'Lionceaux, tome 1 : Le Ballon qui voyage', en: 'Lionceaux, book 1: Le Ballon qui voyage' } },
  methode: { href: '/book/methode/', cover: '/book/methode/img/cover.jpg', title: { fr: 'Le Code Njangi', en: 'The Njangi Code' }, subtitle: { fr: 'Posséder avec intention : la méthode africaine pour gagner la Coupe du monde', en: 'Possession with purpose: the African method to win the World Cup' } },
}

export interface PlanDef {
  id: Plan
  usdMonth: number | null // null = on quote
  highlight?: boolean
  features: string[] // i18n keys in common:plans.features.*
}

export const PLANS: PlanDef[] = [
  { id: 'free', usdMonth: 0, features: ['books', 'drills', 'oneTeam', 'liveOne', 'molaBasic'] },
  { id: 'player', usdMonth: 4.99, features: ['books', 'playerPlan', 'lessons', 'notebook', 'videoSelf'] },
  { id: 'coach', usdMonth: 12.99, highlight: true, features: ['everythingPlayer', 'unlimitedSessions', 'weekPlanner', 'liveUnlimited', 'reports', 'video', 'molaActions'] },
  { id: 'club', usdMonth: 49, features: ['everythingCoach', 'teams', 'staff', 'clubModel', 'export'] },
  { id: 'federation', usdMonth: null, features: ['everythingClub', 'nationalModel', 'coachEducation', 'support'] },
]

/**
 * The AI reading of a match video (api/analyse.ts, Claude): sold per match, on top of any plan.
 * Until payments are connected, a club gets an access code after paying; the codes are set on the server.
 * usdPerMatch is the proposed public price; the cost is mostly the frames (about 700 tokens each at 960 x 540).
 */
export const AI_ANALYSIS = { usdPerMatch: 2.99, intervals: [4, 6, 10] as const, defaultInterval: 6 }

/** Feature gates. Books and the drill library are never gated (education first). */
export const GATES = {
  liveMatchesFree: 1, // free plan: one live-tagged match
  sessionsFree: 5,
}

export const isPaid = (p: Plan) => p !== 'free'
/** The coaching limits (GATES) apply to every plan without the coaching tools: Free and Joueur Premium. */
export const coachLimited = (p?: Plan | null) => p === 'free' || p === 'player'
