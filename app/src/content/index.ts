import { DRILLS } from './drills.gen'
import { LESSONS } from './lessons.gen'
import { TOME1_TOC, METHODE_TOC } from './books.gen'
import type { Drill, Lang } from '../lib/types'

export { DRILLS, LESSONS, TOME1_TOC, METHODE_TOC }

export const getDrill = (id?: string) => DRILLS.find((d) => d.id === id)
export const drillText = (d: Drill, lang: Lang) => (lang === 'en' ? d.en : d.fr)

export const FAMILIES = ['technique', 'rondo', 'position', 'ssg', 'lsg', 'phase', 'transition', 'finishing'] as const
export const FAMILY_CODE: Record<string, string> = { technique: 'C', rondo: 'R', position: 'P', ssg: 'S', lsg: 'L', phase: 'F', transition: 'T', finishing: 'G' }
export const INTENTIONS = ['sortir', 'progresser', 'fixer', 'finir', 'respirer', 'reprendre', 'regarder-devant'] as const
export const SKILLS = ['scan', 'controle', 'passe', 'conduite', 'dribble-njangi', 'appels', 'communication', 'protection', 'contre-pression', 'decision'] as const
export const MDS = ['MD-4', 'MD-3', 'MD-2', 'MD-1', 'MD+1', 'youth'] as const
