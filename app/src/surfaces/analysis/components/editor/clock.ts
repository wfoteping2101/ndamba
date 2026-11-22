// The playhead as a tiny external store: the video time changes sixty times a second while playing,
// so only the few pieces that show it (playhead, clock, "Coder à") subscribe, never the whole studio.
import { useSyncExternalStore } from 'react'

export interface TimeStore {
  get(): number
  set(v: number): void
  subscribe(fn: () => void): () => void
}

export function createTimeStore(initial = 0): TimeStore {
  let v = initial
  const subs = new Set<() => void>()
  return {
    get: () => v,
    set: (n: number) => { if (!Number.isFinite(n) || n === v) return; v = n; subs.forEach((f) => f()) },
    subscribe: (fn) => { subs.add(fn); return () => { subs.delete(fn) } },
  }
}

/** The current time, rounded to `step` seconds so a label re-renders only when its text changes. */
export function useTime(store: TimeStore, step = 0): number {
  const read = () => (step > 0 ? Math.floor(store.get() / step) * step : store.get())
  return useSyncExternalStore(store.subscribe, read, read)
}
