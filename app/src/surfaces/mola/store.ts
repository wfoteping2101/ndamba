// Small shared state for Mola (hub and launcher use the same one): "Mola is typing", the pending
// follow-up question, and the message helpers.
import { useSyncExternalStore } from 'react'
import { db } from '../../lib/db'
import type { ChatMessage } from '../../lib/types'
import { uid } from '../../lib/util'
import type { IntentId, Slots } from './engine'

/* ---------- busy (typing indicator) ---------- */

let busy = false
const listeners = new Set<() => void>()
export function setBusy(v: boolean) { busy = v; listeners.forEach((l) => l()) }
export function useMolaBusy() {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) }, () => busy, () => false)
}

/* ---------- pending follow-up ---------- */

/** A request to carry on once the current one is done (e.g. "organise a match" once the team exists). */
export interface Resume { intent: IntentId; slots: Slots; request: string }

export type Pending =
  | { kind: 'slot'; intent: IntentId; slots: Slots; slot: keyof Slots; request: string; tries: number; resume?: Resume }
  | { kind: 'confirm'; intent: IntentId; slots: Slots; request: string; resume?: Resume }

const PKEY = 'mola.pending'
let pending: Pending | null = (() => { try { const v = sessionStorage.getItem(PKEY); return v ? (JSON.parse(v) as Pending) : null } catch { return null } })()
export const getPending = () => pending
export function setPending(p: Pending | null) {
  pending = p
  try { if (p) sessionStorage.setItem(PKEY, JSON.stringify(p)); else sessionStorage.removeItem(PKEY) } catch { /* private mode */ }
}

/* ---------- messages ---------- */

let last = 0
/** Strictly increasing timestamps, so messages written in the same millisecond keep their order. */
export function stamp() { const n = Math.max(Date.now(), last + 1); last = n; return new Date(n).toISOString() }

export async function postMessage(role: ChatMessage['role'], text: string, extra: Partial<ChatMessage> = {}, thread: ChatMessage['thread'] = 'mola') {
  const m: ChatMessage = { id: uid('msg_'), thread, role, text, createdAt: stamp(), ...extra }
  await db.messages.put(m)
  return m
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** A chip is either a sentence sent to Mola, or "@/route|Label" that opens a page. */
export function chipInfo(chip: string): { label: string; route?: string } {
  if (chip.startsWith('@')) { const [route, label] = chip.slice(1).split('|'); return { label: label || route, route } }
  return { label: chip }
}
export const navChip = (route: string, label: string) => `@${route}|${label}`
