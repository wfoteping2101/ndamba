// Small localStorage-backed state, shared live between components of the player space.
// Wrapped in try/catch everywhere: private mode or blocked storage must never break a page.
import { useCallback, useEffect, useState } from 'react'
import type { SkillKey } from '../../../lib/types'

const EVT = 'njangi:local'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch { return fallback }
}

function write<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage unavailable */ }
  window.dispatchEvent(new CustomEvent(EVT, { detail: key }))
}

export function useLocal<T>(key: string, fallback: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => read(key, fallback))
  useEffect(() => {
    const sync = (e: Event) => {
      const k = e instanceof StorageEvent ? e.key : (e as CustomEvent).detail
      if (k === key) setValue(read(key, fallback))
    }
    window.addEventListener('storage', sync)
    window.addEventListener(EVT, sync)
    return () => { window.removeEventListener('storage', sync); window.removeEventListener(EVT, sync) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  const set = useCallback((v: T | ((prev: T) => T)) => {
    const next = typeof v === 'function' ? (v as (p: T) => T)(read(key, fallback)) : v
    setValue(next)
    write(key, next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return [value, set]
}

/** Lessons marked « J'ai compris » (lesson numbers). */
export const UNDERSTOOD_KEY = 'njangi.lessons'
export function useUnderstood() {
  const [list, setList] = useLocal<number[]>(UNDERSTOOD_KEY, [])
  const safe = Array.isArray(list) ? list : []
  const toggle = (no: number) => setList((prev) => {
    const p = Array.isArray(prev) ? prev : []
    return p.includes(no) ? p.filter((n) => n !== no) : [...p, no].sort((a, b) => a - b)
  })
  return { understood: safe, has: (no: number) => safe.includes(no), toggle }
}

/** Self-assessment of the ten competences, levels 1 to 4. */
export const SELF_KEY = 'njangi.self'
export interface SelfAssessment { levels: Partial<Record<SkillKey, 1 | 2 | 3 | 4>>; updatedAt?: string }
export function useSelfAssessment() {
  const [raw, setRaw] = useLocal<SelfAssessment>(SELF_KEY, { levels: {} })
  const value: SelfAssessment = raw && typeof raw === 'object' && raw.levels ? raw : { levels: {} }
  const setLevel = (k: SkillKey, v: 1 | 2 | 3 | 4) => setRaw((prev) => ({ levels: { ...((prev && prev.levels) || {}), [k]: v }, updatedAt: new Date().toISOString() }))
  return { self: value, setLevel }
}
