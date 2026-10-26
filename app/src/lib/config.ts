import type { Plan } from './types'

export const BRAND = {
  name: 'Njangi',
  tagline: { fr: 'Posséder avec intention', en: 'Possession with purpose' },
  motto: { fr: 'Le ballon doit voyager. Mais il doit savoir où il va.', en: 'The ball must travel. But it must know where it is going.' },
  mantra: { fr: 'Une nation africaine championne du monde en 2030 ou en 2034.', en: 'An African nation crowned world champion in 2030 or 2034.' },
  author: 'William Foteping',
  owner: 'Lemon Network Solutions',
}

export const BOOKS = {
  tome1: { href: '/book/tome1/', pdf: '/downloads/kaydoudou-bribri-tome1.pdf' },
  methode: { href: '/book/methode/', pdf: '/downloads/la-methode-njangi.pdf' },
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

/** Feature gates. Books and the drill library are never gated (education first). */
export const GATES = {
  liveMatchesFree: 1, // free plan: one live-tagged match
  sessionsFree: 5,
}

export const isPaid = (p: Plan) => p !== 'free'
