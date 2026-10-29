// The hand-written rules of every drill (gameplay.ts), re-exported under one name.
// Kept separate so catalog.ts does not care how the list is produced.
import { DRILL_GAMEPLAY } from './gameplay'
import type { DrillGameplay } from './types'

export const GAMEPLAY_LIST: DrillGameplay[] = DRILL_GAMEPLAY
