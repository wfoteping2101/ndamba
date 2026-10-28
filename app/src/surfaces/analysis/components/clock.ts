// Live clock state, saved in localStorage so a reload (or a phone that kills the tab) resumes the match.
import { useCallback, useEffect, useState } from 'react'

export type Half = 1 | 2 | 3 | 4

export interface ClockState {
  v: 1
  half: Half
  running: boolean
  /** epoch ms when the current run started */
  runStart: number
  /** seconds accumulated per half, not counting the current run */
  elapsed: Record<Half, number>
}

const KEY = (matchId: string) => `njangi.live.v1.${matchId}`
const fresh = (): ClockState => ({ v: 1, half: 1, running: false, runStart: 0, elapsed: { 1: 0, 2: 0, 3: 0, 4: 0 } })

export function loadClock(matchId: string): ClockState {
  try {
    const raw = localStorage.getItem(KEY(matchId))
    if (!raw) return fresh()
    const s = JSON.parse(raw) as ClockState
    if (s && s.v === 1 && s.elapsed) return { ...fresh(), ...s, elapsed: { ...fresh().elapsed, ...s.elapsed } }
  } catch { /* private mode or bad data */ }
  return fresh()
}

export function saveClock(matchId: string, s: ClockState) {
  try { localStorage.setItem(KEY(matchId), JSON.stringify(s)) } catch { /* private mode */ }
}

export function clearClock(matchId: string) {
  try { localStorage.removeItem(KEY(matchId)) } catch { /* private mode */ }
}

/** Seconds since kick-off of the current half. */
export const secondsOf = (s: ClockState, now = Date.now()) => s.elapsed[s.half] + (s.running ? Math.max(0, (now - s.runStart) / 1000) : 0)

export function useClock(matchId: string) {
  const [state, setState] = useState<ClockState>(() => loadClock(matchId))
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => { setState(loadClock(matchId)) }, [matchId])
  useEffect(() => {
    if (!state.running) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [state.running])

  const commit = useCallback((next: ClockState) => { saveClock(matchId, next); setState(next); setNow(Date.now()) }, [matchId])

  const start = useCallback(() => {
    setState((s) => { if (s.running) return s; const n = { ...s, running: true, runStart: Date.now() }; saveClock(matchId, n); return n })
    setNow(Date.now())
  }, [matchId])

  const pause = useCallback(() => {
    setState((s) => {
      if (!s.running) return s
      const n: ClockState = { ...s, running: false, elapsed: { ...s.elapsed, [s.half]: secondsOf(s) } }
      saveClock(matchId, n); return n
    })
    setNow(Date.now())
  }, [matchId])

  const toggle = useCallback(() => { (state.running ? pause : start)() }, [state.running, pause, start])

  const setHalf = useCallback((half: Half) => {
    setState((s) => {
      if (s.half === half) return s
      const elapsed = { ...s.elapsed, [s.half]: secondsOf(s) }
      const n: ClockState = { ...s, half, running: false, elapsed }
      saveClock(matchId, n); return n
    })
    setNow(Date.now())
  }, [matchId])

  /** Set the clock of the current half (used to correct it). */
  const setSeconds = useCallback((sec: number) => {
    setState((s) => {
      const n: ClockState = { ...s, elapsed: { ...s.elapsed, [s.half]: Math.max(0, sec) }, runStart: Date.now() }
      saveClock(matchId, n); return n
    })
    setNow(Date.now())
  }, [matchId])

  return { state, seconds: secondsOf(state, now), start, pause, toggle, setHalf, setSeconds, commit }
}
