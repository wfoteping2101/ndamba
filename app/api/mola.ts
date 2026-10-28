// Vercel Node function: optional LLM understanding for Mola, the app's agent.
// POST { text, lang, today, context } -> { intent, slots, reply }
// Returns 501 when ANTHROPIC_API_KEY is not configured (the app then uses its rules engine).
// The key stays on the server: it is read from the environment and never sent to the browser.
import type { IncomingMessage, ServerResponse } from 'node:http'

type Req = IncomingMessage & { body?: unknown }

const API_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-haiku-5-5'

// The names (app, books, motto) come from the client, which reads them from src/lib/config.ts
// (BRAND, SERIES, BOOKS): nothing is hard-coded here, and a missing value falls back to a neutral word.
interface Names { app: string; tagline: string; series: string; heroes: string; tome1: string; methode: string; motto: string }
function namesFrom(raw: unknown): Names {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const s = (k: string, fallback: string) => (typeof r[k] === 'string' && (r[k] as string).trim() && (r[k] as string).length <= 120 ? (r[k] as string).trim() : fallback)
  return { app: s('app', 'the app'), tagline: s('tagline', ''), series: s('series', 'the saga'), heroes: s('heroes', 'the heroes'), tome1: s('tome1', 'tome 1'), methode: s('methode', 'the coaching book'), motto: s('motto', '') }
}

const INTENTS = [
  'plan_week', 'create_session', 'setup_match', 'add_player', 'create_team', 'send_convocation', 'export_calendar',
  'analyze_last_match', 'recommend_drills', 'open_lesson', 'open_book', 'help', 'small_talk', 'confirm', 'deny', 'unknown',
]

function systemPrompt(lang: 'fr' | 'en', today: string, context: unknown, n: Names) {
  const fr = lang === 'fr'
  return [
    `You are Mola, the agent of ${n.app}${n.tagline ? ` ("${n.tagline}")` : ''}, a bilingual football app for players, coaches and analysts, mostly in Cameroon and Africa.`,
    `${n.app} also holds two books: the children's saga ${n.series} (tome 1 "${n.tome1}", starring ${n.heroes}, with 40 "Leçons du Ballon") and the coaching book "${n.methode}" with 50 drills. The Indice Njangi (0 to 100) measures possession with purpose.${n.motto ? ` Motto: "${n.motto}"` : ''}`,
    'Your only job here: understand ONE user message and return a JSON object, nothing else. No markdown, no prose outside the JSON.',
    'Schema: {"intent": one of ' + JSON.stringify(INTENTS) + ', "slots": {...}, "reply": string (optional)}.',
    'Slots (include only what the message says; never invent):',
    '- md: "MD-4" (tension, small spaces) | "MD-3" (duration, big games) | "MD-2" (speed, transitions) | "MD-1" (activation, set pieces) | "MD+1" (recovery) | "youth"',
    '- intention: "sortir" (build out) | "progresser" (break lines) | "fixer" (pin, overload, switch) | "finir" (finishing) | "respirer" (keep the ball) | "reprendre" (counter-press, win it back in 5 s) | "regarder-devant" (look forward after winning it)',
    '- skill: "scan" | "controle" | "passe" | "conduite" | "dribble-njangi" | "appels" | "communication" | "protection" | "contre-pression" | "decision"',
    '- minutes (number), date ("YYYY-MM-DD", resolve relative days from today), time ("HH:MM", 24 h), opponent (team name without article), venue, home (boolean)',
    '- name (one player or team name), names (array of player names), number (shirt 1 to 99), position ("GK" | "CB" | "FB" | "DM" | "CM" | "AM" | "W" | "ST"), ageGroup ("U13", "Seniors"), format (5 | 7 | 8 | 9 | 11)',
    '- channel ("whatsapp" | "sms" | "email" | "copy"), to (phone or e-mail), lessonNo (1 to 40), chapterNo, book ("tome1" for the novel, "methode" for the coaching book)',
    'Intents: plan_week = plan the 4 sessions before a match; create_session = one training session; setup_match = schedule a match; add_player; create_team; send_convocation = draft the squad call-up message for the next match (the user approves before anything is sent); export_calendar = .ics file of the week; analyze_last_match = report and Indice Njangi of the last played match; recommend_drills = drills for a problem or intention; open_lesson = a Leçon du Ballon of the novel; open_book; help; small_talk; confirm (yes); deny (no); unknown.',
    `"reply" only for small_talk, help or unknown: one or two short, warm sentences in ${fr ? 'French' : 'English'}, no emojis, no em or en dashes. Never claim you did something.`,
    `Today is ${today}. User language: ${lang}. Context: ${JSON.stringify(context ?? {}).slice(0, 800)}`,
  ].join('\n')
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(body))
}

async function readBody(req: Req): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object') return req.body as Record<string, unknown>
  if (typeof req.body === 'string') { try { return JSON.parse(req.body) } catch { return {} } }
  const chunks: Buffer[] = []
  let size = 0
  for await (const c of req) { size += (c as Buffer).length; if (size > 16_000) break; chunks.push(c as Buffer) }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') } catch { return {} }
}

function firstJson(s: string): Record<string, unknown> | null {
  const start = s.indexOf('{')
  if (start < 0) return null
  let depth = 0, inStr = false, esc = false
  for (let i = start; i < s.length; i++) {
    const c = s[i]
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue }
    if (c === '"') inStr = true
    else if (c === '{') depth++
    else if (c === '}') { depth--; if (depth === 0) { try { return JSON.parse(s.slice(start, i + 1)) } catch { return null } } }
  }
  return null
}

export default async function handler(req: Req, res: ServerResponse) {
  if (req.method !== 'POST') { res.setHeader('allow', 'POST'); return send(res, 405, { error: 'method_not_allowed' }) }
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return send(res, 501, { error: 'not_configured' })

  const body = await readBody(req)
  const text = typeof body.text === 'string' ? body.text.slice(0, 600).trim() : ''
  if (!text) return send(res, 400, { error: 'empty' })
  const lang = body.lang === 'en' ? 'en' : 'fr'
  const today = typeof body.today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.today) ? body.today : new Date().toISOString().slice(0, 10)

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  try {
    const r = await fetch(API_URL, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
        max_tokens: 400,
        temperature: 0,
        system: systemPrompt(lang, today, body.context, namesFrom(body.brand)),
        messages: [{ role: 'user', content: text }],
      }),
    })
    if (!r.ok) return send(res, 502, { error: 'upstream', status: r.status })
    const data = (await r.json()) as { content?: { type: string; text?: string }[] }
    const out = firstJson((data.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join(''))
    if (!out || typeof out.intent !== 'string' || !INTENTS.includes(out.intent)) return send(res, 502, { error: 'unparsable' })
    const slots = out.slots && typeof out.slots === 'object' ? out.slots : {}
    const reply = typeof out.reply === 'string' ? out.reply.replace(/\s*[—–]\s*/g, ', ').slice(0, 400) : undefined
    return send(res, 200, { intent: out.intent, slots, reply })
  } catch {
    return send(res, 504, { error: 'timeout' })
  } finally {
    clearTimeout(timer)
  }
}
