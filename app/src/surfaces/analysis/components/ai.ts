// The paid AI reading of a match (api/analyse.ts, Claude). The video never leaves the device:
// the browser seeks through the file, takes one frame every few seconds (960 px wide, JPEG),
// and sends small batches. What comes back is saved after every batch, so a run can stop and resume.
import type { AiAnalysis, AiFrame, VideoProject } from '../../../lib/types'

export const AI_FRAME_W = 960
export const AI_BATCH = 12
export const AI_CODE_KEY = 'njangi.aiCode'

export function savedCode(): string { try { return localStorage.getItem(AI_CODE_KEY) ?? '' } catch { return '' } }
export function saveCode(c: string) { try { if (c) localStorage.setItem(AI_CODE_KEY, c); else localStorage.removeItem(AI_CODE_KEY) } catch { /* private mode */ } }

/** The times to read, from the first kick-off to the end of the video. */
export function frameTimes(from: number, to: number, interval: number) {
  const out: number[] = []
  for (let t = Math.max(0, from); t <= to - 0.5; t += interval) out.push(Math.round(t * 10) / 10)
  return out
}

/** Our attack goes to the right of the image in the first half when attackRight1; the sides swap at the second kick-off. */
export const attacksRight = (p: Pick<VideoProject, 'attackRight1' | 'kickoff2'>, t: number) => (p.kickoff2 != null && t >= p.kickoff2 ? !p.attackRight1 : !!p.attackRight1)

/** Reads frames from a video file. One hidden <video>, one canvas, seek then draw. */
export class FrameReader {
  private v: HTMLVideoElement
  private c: HTMLCanvasElement
  private ready: Promise<void>
  constructor(src: string) {
    this.v = document.createElement('video')
    this.v.muted = true
    this.v.playsInline = true
    this.v.preload = 'auto'
    this.v.src = src
    this.c = document.createElement('canvas')
    this.ready = new Promise((res, rej) => {
      this.v.onloadedmetadata = () => res()
      this.v.onerror = () => rej(new Error('video'))
    })
  }
  async duration() { await this.ready; return this.v.duration }
  async frame(t: number): Promise<string> {
    await this.ready
    const v = this.v
    await new Promise<void>((res) => {
      const done = () => { v.removeEventListener('seeked', done); res() }
      v.addEventListener('seeked', done)
      v.currentTime = Math.min(Math.max(0, t), Math.max(0, (v.duration || t) - 0.1))
    })
    const w = AI_FRAME_W
    const h = Math.round((v.videoHeight / (v.videoWidth || 1)) * w) || 540
    this.c.width = w
    this.c.height = h
    const ctx = this.c.getContext('2d')
    if (!ctx) throw new Error('canvas')
    ctx.drawImage(v, 0, 0, w, h)
    return this.c.toDataURL('image/jpeg', 0.72).replace(/^data:image\/jpeg;base64,/, '')
  }
  close() { this.v.removeAttribute('src'); this.v.load() }
}

export type AiError = 'not_configured' | 'bad_code' | 'too_big' | 'network' | 'upstream'

async function post(body: Record<string, unknown>, signal?: AbortSignal): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: AiError }> {
  try {
    const r = await fetch('/api/analyse', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal })
    if (r.status === 501 || r.status === 404) return { ok: false, error: 'not_configured' }
    if (r.status === 403) return { ok: false, error: 'bad_code' }
    if (r.status === 413) return { ok: false, error: 'too_big' }
    if (!r.ok) return { ok: false, error: 'upstream' }
    return { ok: true, data: (await r.json()) as Record<string, unknown> }
  } catch {
    return { ok: false, error: 'network' }
  }
}

export interface RunOptions {
  project: VideoProject
  src: string // object URL of the file on the device
  code: string
  lang: 'fr' | 'en'
  interval: number
  from: number
  to: number
  signal: AbortSignal
  save: (ai: AiAnalysis) => Promise<void>
  onProgress: (done: number, total: number) => void
}

/** Reads the frames still missing, batch after batch; then asks for the written summary. */
export async function runAi(o: RunOptions): Promise<{ ok: true; ai: AiAnalysis } | { ok: false; error: AiError | 'stopped' | 'video'; ai?: AiAnalysis }> {
  const prev = o.project.ai && o.project.ai.interval === o.interval ? o.project.ai : undefined
  let ai: AiAnalysis = prev ?? { interval: o.interval, from: o.from, to: o.to, frames: [], lang: o.lang, startedAt: new Date().toISOString() }
  ai = { ...ai, from: o.from, to: o.to, lang: o.lang, doneAt: undefined }
  const have = new Set(ai.frames.map((f) => f.t))
  const times = frameTimes(o.from, o.to, o.interval)
  const todo = times.filter((t) => !have.has(t))
  const reader = new FrameReader(o.src)
  try { await reader.duration() } catch { reader.close(); return { ok: false, error: 'video' } }
  o.onProgress(times.length - todo.length, times.length)
  try {
    for (let i = 0; i < todo.length; i += AI_BATCH) {
      if (o.signal.aborted) return { ok: false, error: 'stopped', ai }
      const batch = todo.slice(i, i + AI_BATCH)
      const frames: { t: number; right: boolean; img: string }[] = []
      for (const t of batch) {
        if (o.signal.aborted) return { ok: false, error: 'stopped', ai }
        frames.push({ t, right: attacksRight(o.project, t), img: await reader.frame(t) })
      }
      let r = await post({ code: o.code, kind: 'frames', lang: o.lang, ourColor: o.project.ourColor ?? '', theirColor: o.project.theirColor ?? '', frames }, o.signal)
      if (!r.ok && (r.error === 'upstream' || r.error === 'network') && !o.signal.aborted) r = await post({ code: o.code, kind: 'frames', lang: o.lang, ourColor: o.project.ourColor ?? '', theirColor: o.project.theirColor ?? '', frames }, o.signal)
      if (!r.ok) return { ok: false, error: o.signal.aborted ? 'stopped' : r.error, ai }
      const got = (r.data.frames as AiFrame[] | undefined) ?? []
      ai = { ...ai, model: (r.data.model as string) ?? ai.model, frames: [...ai.frames, ...got].sort((a, b) => a.t - b.t) }
      await o.save(ai)
      o.onProgress(times.length - todo.length + Math.min(todo.length, i + batch.length), times.length)
    }
  } finally {
    reader.close()
  }
  const stats = aiStats(ai.frames)
  const notes = ai.frames.filter((f) => f.note).map((f) => `${clock(f.t)} ${f.note}`)
  const s = await post({ code: o.code, kind: 'summary', lang: o.lang, stats: statsForSummary(stats), notes }, o.signal)
  ai = { ...ai, summary: s.ok ? String(s.data.summary ?? '') : ai.summary, doneAt: new Date().toISOString() }
  await o.save(ai)
  return { ok: true, ai }
}

export const clock = (s: number) => { const v = Math.max(0, Math.round(s)); const h = Math.floor(v / 3600); const m = Math.floor((v % 3600) / 60); const r = v % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}` }

export interface AiStats {
  frames: number
  readable: number // frames where the AI could tell who had the ball
  possessionUs: number | null // share of the frames with an owner, 0..1
  territory: { def: number; mid: number; att: number } | null
  block: { high: number; mid: number; low: number } | null
  behindAvg: number | null // our outfield players behind the ball, when we have it
  restOk: number | null // share of our possession frames with at least 5 players behind the ball (3 + 2)
  moments: AiFrame[] // to watch again
}

const share = (n: number, d: number) => (d ? n / d : 0)

export function aiStats(frames: AiFrame[]): AiStats {
  const owned = frames.filter((f) => f.phase === 'us' || f.phase === 'them')
  const us = owned.filter((f) => f.phase === 'us')
  const thirds = frames.filter((f) => f.third)
  const blocks = frames.filter((f) => f.phase === 'them' && f.block)
  const behind = us.filter((f) => f.behind != null)
  const moments: AiFrame[] = []
  for (const f of frames) {
    const weak = f.phase === 'us' && f.behind != null && f.behind <= 3
    if (!f.flag && !weak) continue
    if (moments.length && f.t - moments[moments.length - 1].t < 20) continue
    moments.push(weak && !f.note ? { ...f, flag: true } : f)
  }
  return {
    frames: frames.length,
    readable: owned.length,
    possessionUs: owned.length >= 10 ? share(us.length, owned.length) : null,
    territory: thirds.length >= 10 ? { def: share(thirds.filter((f) => f.third === 'def').length, thirds.length), mid: share(thirds.filter((f) => f.third === 'mid').length, thirds.length), att: share(thirds.filter((f) => f.third === 'att').length, thirds.length) } : null,
    block: blocks.length >= 5 ? { high: share(blocks.filter((f) => f.block === 'high').length, blocks.length), mid: share(blocks.filter((f) => f.block === 'mid').length, blocks.length), low: share(blocks.filter((f) => f.block === 'low').length, blocks.length) } : null,
    behindAvg: behind.length >= 5 ? behind.reduce((s, f) => s + (f.behind ?? 0), 0) / behind.length : null,
    restOk: behind.length >= 5 ? share(behind.filter((f) => (f.behind ?? 0) >= 5).length, behind.length) : null,
    moments: moments.slice(0, 20),
  }
}

function statsForSummary(s: AiStats) {
  const pct = (v: number | null | undefined) => (v == null ? null : Math.round(v * 100))
  return {
    framesRead: s.frames, framesWithOwner: s.readable,
    possessionUsPct: pct(s.possessionUs),
    ballInOurThirdPct: pct(s.territory?.def), ballInMiddleThirdPct: pct(s.territory?.mid), ballInTheirThirdPct: pct(s.territory?.att),
    blockHighPct: pct(s.block?.high), blockMidPct: pct(s.block?.mid), blockLowPct: pct(s.block?.low),
    playersBehindBallAvg: s.behindAvg == null ? null : Math.round(s.behindAvg * 10) / 10,
    restDefenceOkPct: pct(s.restOk),
  }
}
