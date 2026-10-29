// Saves for both games, in their own IndexedDB database ("ndamba-jeux") so the app's data
// ("njangi") is never touched. Works for guests: nothing needs an account. When IndexedDB is not
// available (private browsing on some phones), everything falls back to memory for the session.
import Dexie, { type Table } from 'dexie'
import type { Replay } from '../engine/replay'
import type { Level } from '../engine/sim/types'

export interface DrillProgress {
  id: string
  /** best result at each level */
  done: Partial<Record<Level, boolean>>
  bestPoints: number
  bestIndice: number | null
  attempts: number
  lastAt: number
}

export interface AttemptLog {
  id?: number
  game: 'njangi' | 'lionceaux'
  /** drill id (the Défi des dix passes is 'DIX'), mode key ('lecture') or chapter id */
  key: string
  at: number
  level: Level
  success: boolean
  points: number
  /** the most points the mode gives (Lecture: 4 per situation) */
  max?: number
  indice: number | null
  counts?: Record<string, number>
  mistakes: string[]
}

export interface ReplayRow { id?: number; key: string; at: number; title: string; replay: Replay }

export interface StorySave {
  slot: string
  chapter: string
  beat: number
  at: number
  /** chapters finished, challenges won, collectibles */
  done: string[]
  flags: Record<string, number | string | boolean>
}

export interface KV { key: string; value: unknown }

class JeuxDB extends Dexie {
  drills!: Table<DrillProgress, string>
  attempts!: Table<AttemptLog, number>
  replays!: Table<ReplayRow, number>
  story!: Table<StorySave, string>
  kv!: Table<KV, string>
  constructor() {
    super('ndamba-jeux')
    this.version(1).stores({
      drills: 'id, lastAt',
      attempts: '++id, game, key, at',
      replays: '++id, key, at',
      story: 'slot, at',
      kv: 'key',
    })
  }
}

let db: JeuxDB | null = null
let broken = false
const mem = { drills: new Map<string, DrillProgress>(), attempts: [] as AttemptLog[], replays: [] as ReplayRow[], story: new Map<string, StorySave>(), kv: new Map<string, unknown>() }

function get(): JeuxDB | null {
  if (broken) return null
  if (!db) { try { db = new JeuxDB() } catch { broken = true; return null } }
  return db
}
async function safe<T>(fn: (d: JeuxDB) => Promise<T>, fallback: () => T): Promise<T> {
  const d = get()
  if (!d) return fallback()
  try { return await fn(d) } catch { broken = true; return fallback() }
}

/* ------------------------------------------------------------ Code Njangi */

export const getDrillProgress = (id: string) => safe((d) => d.drills.get(id), () => mem.drills.get(id))
export const allDrillProgress = () => safe((d) => d.drills.toArray(), () => [...mem.drills.values()])

export async function recordDrill(id: string, r: { level: Level; success: boolean; points: number; indice: number | null; counts?: Record<string, number>; mistakes: string[] }) {
  const prev = (await getDrillProgress(id)) ?? { id, done: {}, bestPoints: 0, bestIndice: null, attempts: 0, lastAt: 0 }
  const next: DrillProgress = {
    ...prev,
    done: { ...prev.done, ...(r.success ? { [r.level]: true } : {}) },
    bestPoints: Math.max(prev.bestPoints, r.points),
    bestIndice: r.indice === null ? prev.bestIndice : Math.max(prev.bestIndice ?? 0, r.indice),
    attempts: prev.attempts + 1,
    lastAt: Date.now(),
  }
  await safe((d) => d.drills.put(next).then(() => undefined), () => { mem.drills.set(id, next) })
  await logAttempt({ game: 'njangi', key: id, at: Date.now(), level: r.level, success: r.success, points: r.points, indice: r.indice, counts: r.counts, mistakes: r.mistakes })
  return next
}

export const logAttempt = (a: AttemptLog) => safe((d) => d.attempts.add(a).then(() => undefined), () => { mem.attempts.push(a) })
export const recentAttempts = (game: AttemptLog['game'], limit = 50) =>
  safe((d) => d.attempts.where('game').equals(game).reverse().limit(limit).toArray(), () => mem.attempts.filter((a) => a.game === game).slice(-limit).reverse())

/** Keep the last few replays only (they are a few hundred kilobytes each). */
export async function saveReplay(key: string, title: string, replay: Replay) {
  const row: ReplayRow = { key, title, at: Date.now(), replay }
  return safe(async (d) => {
    const id = await d.replays.add(row)
    const all = await d.replays.orderBy('at').reverse().primaryKeys()
    if (all.length > 6) await d.replays.bulkDelete(all.slice(6) as number[])
    return id
  }, () => { mem.replays.unshift({ ...row, id: mem.replays.length + 1 }); mem.replays.splice(6); return mem.replays[0].id! })
}
export const listReplays = () => safe((d) => d.replays.orderBy('at').reverse().toArray(), () => mem.replays.slice())
export const getReplay = (id: number) => safe((d) => d.replays.get(id), () => mem.replays.find((r) => r.id === id))

/* ------------------------------------------------------------ Lionceaux */

export const getStory = (slot = 'auto') => safe((d) => d.story.get(slot), () => mem.story.get(slot))
export const putStory = (s: StorySave) => safe((d) => d.story.put(s).then(() => undefined), () => { mem.story.set(s.slot, s) })

/* ------------------------------------------------------------ settings */

export const getKV = <T>(key: string) => safe(async (d) => (await d.kv.get(key))?.value as T | undefined, () => mem.kv.get(key) as T | undefined)
export const putKV = (key: string, value: unknown) => safe((d) => d.kv.put({ key, value }).then(() => undefined), () => { mem.kv.set(key, value) })
