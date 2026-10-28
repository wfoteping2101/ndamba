// Optional LLM understanding through /api/mola (Vercel function). One try per request, short timeout,
// silent fallback to the rules engine. The API key never reaches the browser.
import { MDS, INTENTIONS, SKILLS } from '../../content'
import { ALL_INTENTS, type IntentId, type Lang, type Parsed, type Slots } from './engine'

let failures = 0
let disabled = false

export interface LlmContext { teamName?: string; ageGroup?: string; role?: string; nextMatch?: { opponent: string; date: string }; lastMatch?: { opponent: string; date: string } }

const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.length < 200
const isNum = (v: unknown, a: number, b: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= a && v <= b

/** Keep only well-formed slot values from the model. */
export function sanitizeSlots(raw: unknown): Slots {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const s: Slots = {}
  if (isStr(r.md) && (MDS as readonly string[]).includes(r.md)) s.md = r.md as Slots['md']
  if (isStr(r.intention) && (INTENTIONS as readonly string[]).includes(r.intention)) s.intention = r.intention as Slots['intention']
  if (isStr(r.skill) && (SKILLS as readonly string[]).includes(r.skill)) s.skill = r.skill as Slots['skill']
  if (isNum(r.minutes, 10, 240)) s.minutes = Math.round(r.minutes)
  if (isStr(r.date) && /^\d{4}-\d{2}-\d{2}$/.test(r.date)) s.date = r.date
  if (isStr(r.time) && /^\d{2}:\d{2}$/.test(r.time)) s.time = r.time
  for (const k of ['opponent', 'venue', 'name', 'position', 'to', 'ageGroup'] as const) if (isStr(r[k])) (s as Record<string, unknown>)[k] = (r[k] as string).trim()
  if (typeof r.home === 'boolean') s.home = r.home
  if (Array.isArray(r.names)) { const n = r.names.filter(isStr).slice(0, 30); if (n.length) s.names = n }
  if (isNum(r.number, 1, 99)) s.number = Math.round(r.number)
  if (isNum(r.lessonNo, 1, 60)) s.lessonNo = Math.round(r.lessonNo)
  if (isNum(r.chapterNo, 0, 60)) s.chapterNo = Math.round(r.chapterNo)
  if (r.book === 'tome1' || r.book === 'methode') s.book = r.book
  if (r.channel === 'whatsapp' || r.channel === 'sms' || r.channel === 'email' || r.channel === 'copy') s.channel = r.channel
  if (r.format === 5 || r.format === 7 || r.format === 8 || r.format === 9 || r.format === 11) s.format = r.format
  if (s.position && !['GK', 'CB', 'FB', 'DM', 'CM', 'AM', 'W', 'ST'].includes(s.position)) delete s.position
  return s
}

export async function llmParse(text: string, opts: { lang: Lang; today: string; context: LlmContext; brand?: Record<string, string> }): Promise<(Parsed & { reply?: string }) | null> {
  // Local dev (plain Vite) has no serverless functions: skip unless VITE_MOLA_API asks for it (e.g. under `vercel dev`).
  if (import.meta.env.DEV && !import.meta.env.VITE_MOLA_API) return null
  if (disabled || (typeof navigator !== 'undefined' && navigator.onLine === false)) return null
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 3500)
  try {
    const r = await fetch('/api/mola', {
      method: 'POST', headers: { 'content-type': 'application/json' }, signal: ctrl.signal,
      body: JSON.stringify({ text: text.slice(0, 600), lang: opts.lang, today: opts.today, context: opts.context, brand: opts.brand }),
    })
    // 501: no key configured; 404/405: no serverless function (local dev). Stop trying for this visit.
    if ([404, 405, 501].includes(r.status)) { disabled = true; return null }
    if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) throw new Error('bad response')
    const j = (await r.json()) as { intent?: string; slots?: unknown; reply?: unknown }
    if (!j.intent || !(ALL_INTENTS as string[]).includes(j.intent)) throw new Error('bad intent')
    failures = 0
    return { intent: j.intent as IntentId, slots: sanitizeSlots(j.slots), score: 5, source: 'llm', reply: isStr(j.reply) ? j.reply : undefined }
  } catch {
    failures += 1
    if (failures >= 2) disabled = true
    return null
  } finally {
    clearTimeout(timer)
  }
}
