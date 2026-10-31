// Vercel Node function: the paid AI reading of a match video, by Claude.
// The browser never uploads the video. It reads a frame every few seconds from the file on the device
// and sends small batches of JPEG frames here; Claude says, for each frame, who has the ball, where it is,
// how high our block is and how many of our players stay behind the ball. Then one text call writes the summary.
//
//   POST { code, kind: "frames", lang, ourColor, theirColor, frames: [{ t, right, img }] } -> { frames: [...] }
//   POST { code, kind: "summary", lang, stats, notes } -> { summary }
//
// Configuration (Vercel > Project > Settings > Environment Variables), set by the owner, never in the code:
//   ANTHROPIC_API_KEY          the Claude API key (already used by Mola)
//   ANALYSE_CODES              access codes given to paying clubs, separated by commas
//   ANTHROPIC_VISION_MODEL     optional, default claude-opus-5-5
// Until payments and accounts exist, the codes are what keeps the key from being used by anyone.
import type { IncomingMessage, ServerResponse } from 'node:http'

type Req = IncomingMessage & { body?: unknown }

export const config = { maxDuration: 60 }

const API_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-opus-5-5'
const MAX_FRAMES = 16
const MAX_IMG = 400_000 // base64 characters per frame
const MAX_BODY = 4_200_000 // Vercel accepts 4.5 MB per request

const PHASES = ['us', 'them', 'contested', 'dead', 'unclear'] as const
const THIRDS = ['def', 'mid', 'att'] as const
const BLOCKS = ['high', 'mid', 'low'] as const

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
  for await (const c of req) { size += (c as Buffer).length; if (size > MAX_BODY) return { tooBig: true }; chunks.push(c as Buffer) }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') } catch { return {} }
}

const clean = (s: unknown, max: number) => (typeof s === 'string' ? s.replace(/\s*[—–]\s*/g, ', ').replace(/\s+/g, ' ').trim().slice(0, max) : '')

function firstJsonArray(s: string): unknown[] | null {
  const start = s.indexOf('[')
  const end = s.lastIndexOf(']')
  if (start < 0 || end <= start) return null
  try { const v = JSON.parse(s.slice(start, end + 1)); return Array.isArray(v) ? v : null } catch { return null }
}

function framesPrompt(lang: 'fr' | 'en', ourColor: string, theirColor: string) {
  return [
    'You are a football performance analyst. You receive frames taken every few seconds from an amateur or youth match video, filmed from the side of the pitch.',
    `Our team wears ${ourColor || 'one colour'}; the opponent wears ${theirColor || 'another colour'}. Before each frame, a line says its index, its time in the video and towards which side of the image OUR team attacks.`,
    'For every frame, in order, return one object. Return ONLY a JSON array, no prose, no markdown:',
    '{"i": index, "phase": "us"|"them"|"contested"|"dead"|"unclear", "third": "def"|"mid"|"att"|null, "block": "high"|"mid"|"low"|null, "behind": number|null, "note": string, "flag": boolean}',
    '- phase: which team has the ball. "contested" when nobody controls it, "dead" when play is stopped (out of play, foul, celebration, kick-off setting), "unclear" when you cannot see the ball or tell.',
    '- third: where the ball is, from OUR point of view: "def" in our defensive third, "mid", "att" in the third we attack. null when unclear.',
    '- block: only when the opponent has the ball, how high our defensive block stands (our last line): "high" in their half, "mid" around halfway, "low" near our box. Otherwise null.',
    '- behind: only when we have the ball, how many of OUR outfield players (goalkeeper excluded) are between the ball and our own goal. Otherwise null.',
    `- note: at most 80 characters in ${lang === 'fr' ? 'French' : 'English'}, only when something matters for coaching (few players behind the ball, a big gap between lines, numbers around the ball, a good press). Else "".`,
    '- flag: true when the moment is worth watching again.',
    'Never guess what you cannot see: use "unclear" and null. Never identify or name people. Counts are approximate: give your best estimate only when the players are visible.',
  ].join('\n')
}

export default async function handler(req: Req, res: ServerResponse) {
  if (req.method !== 'POST') { res.setHeader('allow', 'POST'); return send(res, 405, { error: 'method_not_allowed' }) }
  const key = process.env.ANTHROPIC_API_KEY
  const codes = (process.env.ANALYSE_CODES || '').split(',').map((c) => c.trim()).filter(Boolean)
  if (!key || !codes.length) return send(res, 501, { error: 'not_configured' })

  const body = await readBody(req)
  if (body.tooBig) return send(res, 413, { error: 'too_big' })
  const code = typeof body.code === 'string' ? body.code.trim() : ''
  if (!code || !codes.includes(code)) return send(res, 403, { error: 'bad_code' })
  const lang = body.lang === 'en' ? 'en' : 'fr'
  const model = process.env.ANTHROPIC_VISION_MODEL || DEFAULT_MODEL

  const call = async (payload: Record<string, unknown>, ms: number) => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), ms)
    try {
      const r = await fetch(API_URL, {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model, temperature: 0, ...payload }),
      })
      if (!r.ok) return { error: r.status }
      const data = (await r.json()) as { content?: { type: string; text?: string }[] }
      return { text: (data.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('') }
    } catch {
      return { error: 'timeout' }
    } finally {
      clearTimeout(timer)
    }
  }

  if (body.kind === 'summary') {
    const stats = JSON.stringify(body.stats ?? {}).slice(0, 3000)
    const notes = Array.isArray(body.notes) ? body.notes.slice(0, 40).map((n) => clean(n, 120)).filter(Boolean) : []
    const out = await call({
      max_tokens: 700,
      system: [
        'You are the analyst of a coach who follows the Njangi method: possession with purpose (build out, progress, pin, finish, breathe, win it back within 5 seconds, look forward), and rest defence (3 + 2 players behind the ball when attacking).',
        `Write in ${lang === 'fr' ? 'French' : 'English'}, plain words, 120 to 180 words, three short paragraphs: what the frames show about possession and territory, about our defending (block height), about our rest defence, then two concrete things to work on in training.`,
        'These numbers come from frames read by an AI every few seconds, not from counting every action: say "about" and stay modest. No em or en dashes, no lists, no markdown.',
      ].join('\n'),
      messages: [{ role: 'user', content: `Stats: ${stats}\nNotes from the frames: ${notes.join(' | ')}` }],
    }, 40000)
    if ('error' in out) return send(res, 502, { error: 'upstream', status: out.error })
    return send(res, 200, { summary: clean(out.text, 1600), model })
  }

  const raw = Array.isArray(body.frames) ? body.frames.slice(0, MAX_FRAMES) : []
  const frames = raw
    .map((f) => (f && typeof f === 'object' ? (f as Record<string, unknown>) : {}))
    .filter((f) => typeof f.img === 'string' && (f.img as string).length > 100 && (f.img as string).length <= MAX_IMG && typeof f.t === 'number')
  if (!frames.length) return send(res, 400, { error: 'no_frames' })
  const ourColor = clean(body.ourColor, 40)
  const theirColor = clean(body.theirColor, 40)
  const content: unknown[] = []
  frames.forEach((f, i) => {
    const t = Math.max(0, Math.round(f.t as number))
    content.push({ type: 'text', text: `Frame ${i}, t=${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}, our team attacks towards the ${f.right ? 'RIGHT' : 'LEFT'} of the image.` })
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: (f.img as string).replace(/^data:image\/\w+;base64,/, '') } })
  })
  content.push({ type: 'text', text: `Return the JSON array for the ${frames.length} frames.` })
  const out = await call({ max_tokens: 120 + frames.length * 70, system: framesPrompt(lang, ourColor, theirColor), messages: [{ role: 'user', content }] }, 55000)
  if ('error' in out) return send(res, 502, { error: 'upstream', status: out.error })
  const arr = firstJsonArray(out.text ?? '')
  if (!arr) return send(res, 502, { error: 'unparsable' })
  const result = frames.map((f, i) => {
    const o = (arr.find((x) => x && typeof x === 'object' && (x as Record<string, unknown>).i === i) ?? arr[i] ?? {}) as Record<string, unknown>
    const phase = PHASES.includes(o.phase as never) ? o.phase : 'unclear'
    const third = THIRDS.includes(o.third as never) ? o.third : null
    const block = BLOCKS.includes(o.block as never) ? o.block : null
    const behind = typeof o.behind === 'number' && o.behind >= 0 && o.behind <= 10 ? Math.round(o.behind) : null
    return { t: f.t, phase, third, block: phase === 'them' ? block : null, behind: phase === 'us' ? behind : null, note: clean(o.note, 80) || undefined, flag: o.flag === true || undefined }
  })
  return send(res, 200, { frames: result, model })
}
