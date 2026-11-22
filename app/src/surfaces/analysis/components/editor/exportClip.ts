// « Exporter le clip »: the clip is played once in a hidden video and painted on a canvas that a
// MediaRecorder films, in real time. It opens on a short title card, then the drawing (if any) held for
// three seconds, then the clip with a small title in the corner. The file is webm or mp4, whatever the
// browser records. Sound is not included (the canvas carries the picture only).

export interface ExportJob { cancel(): void; done: Promise<{ blob: Blob; ext: string } | null> }
export interface ExportInput {
  src: string
  start: number
  end: number
  title: string
  subtitle?: string
  brand: string
  drawing?: string
  onProgress: (p: number) => void
}

const INTRO = 1.6
const FREEZE = 3

export function recorderType(): { mime: string; ext: string } | null {
  if (typeof MediaRecorder === 'undefined') return null
  const list: [string, string][] = [['video/mp4;codecs=avc1.42E01E', 'mp4'], ['video/mp4', 'mp4'], ['video/webm;codecs=vp9', 'webm'], ['video/webm;codecs=vp8', 'webm'], ['video/webm', 'webm']]
  for (const [m, ext] of list) { try { if (MediaRecorder.isTypeSupported(m)) return { mime: m, ext } } catch { /* ignore */ } }
  return null
}

export const canExport = () => !!recorderType() && typeof HTMLCanvasElement !== 'undefined' && 'captureStream' in HTMLCanvasElement.prototype

const loadImage = (src: string) => new Promise<HTMLImageElement | null>((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src })
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function exportClip(inp: ExportInput): ExportJob {
  let cancelled = false
  const type = recorderType()
  const v = document.createElement('video')
  v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous'; v.src = inp.src
  let rec: MediaRecorder | null = null
  let raf = 0
  const stop = () => { cancelAnimationFrame(raf); try { v.pause() } catch { /* ignore */ } try { if (rec && rec.state !== 'inactive') rec.stop() } catch { /* ignore */ } }

  const done = (async () => {
    if (!type) return null
    await new Promise<void>((res, rej) => { v.onloadedmetadata = () => res(); v.onerror = () => rej(new Error('video')) })
    const vw = v.videoWidth || 1280, vh = v.videoHeight || 720
    const W = Math.min(1280, vw) & ~1, H = Math.round((vh * W) / vw) & ~1
    const c = document.createElement('canvas'); c.width = W; c.height = H
    const ctx = c.getContext('2d')!
    const img = inp.drawing ? await loadImage(inp.drawing) : null
    const len = Math.max(0.5, inp.end - inp.start)
    const total = INTRO + (img ? FREEZE : 0) + len
    const unit = W / 100
    const font = (wgt: number, px: number) => `${wgt} ${px}px "Archivo Variable", Archivo, system-ui, sans-serif`
    const fit = (text: string, max: number) => { let s = text; while (s.length > 4 && ctx.measureText(s).width > max) s = s.slice(0, -2); return s === text ? s : `${s.trimEnd()}...` }

    const titleCard = () => {
      ctx.fillStyle = '#061710'; ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = '#F5B700'; ctx.fillRect(unit * 6, H * 0.36, unit * 0.8, H * 0.3)
      ctx.fillStyle = '#F6F7F2'; ctx.font = font(780, unit * 4.6); ctx.textBaseline = 'alphabetic'
      ctx.fillText(fit(inp.title, W - unit * 16), unit * 9, H * 0.47)
      if (inp.subtitle) { ctx.fillStyle = 'rgba(246,247,242,.72)'; ctx.font = font(500, unit * 2.4); ctx.fillText(fit(inp.subtitle, W - unit * 16), unit * 9, H * 0.56) }
      ctx.fillStyle = 'rgba(246,247,242,.5)'; ctx.font = font(700, unit * 1.9); ctx.fillText(inp.brand, unit * 9, H * 0.64)
    }
    const corner = () => {
      ctx.font = font(700, unit * 1.9)
      const text = fit(inp.title, W * 0.6)
      const tw = ctx.measureText(text).width, pad = unit * 1.1, h = unit * 3.6
      ctx.fillStyle = 'rgba(6,23,16,.72)'; ctx.fillRect(unit * 2, H - unit * 2 - h, tw + pad * 2 + unit * 0.6, h)
      ctx.fillStyle = '#F5B700'; ctx.fillRect(unit * 2, H - unit * 2 - h, unit * 0.5, h)
      ctx.fillStyle = '#F6F7F2'; ctx.textBaseline = 'middle'; ctx.fillText(text, unit * 2 + pad + unit * 0.5, H - unit * 2 - h / 2 + 1); ctx.textBaseline = 'alphabetic'
    }
    const frame = () => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.drawImage(v, 0, 0, W, H) }
    const still = () => {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H)
      if (img) { const k = Math.min(W / img.width, H / img.height); const w = img.width * k, h = img.height * k; ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h) }
      corner()
    }

    // the first frame of the clip, ready before the recording starts
    await new Promise<void>((res) => { v.onseeked = () => res(); v.currentTime = inp.start })
    if (cancelled) return null
    const stream = (c as HTMLCanvasElement & { captureStream(fps?: number): MediaStream }).captureStream(25)
    const chunks: Blob[] = []
    rec = new MediaRecorder(stream, { mimeType: type.mime, videoBitsPerSecond: 3_000_000 })
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    const finished = new Promise<void>((res) => { rec!.onstop = () => res() })
    titleCard()
    rec.start(500)
    const t0 = performance.now()
    const elapsed = () => (performance.now() - t0) / 1000
    // title card, then the drawing held: repainted every frame so the recorder keeps receiving frames
    await new Promise<void>((res) => {
      const tick = () => {
        if (cancelled) return res()
        const e = elapsed()
        if (e < INTRO) titleCard()
        else if (img && e < INTRO + FREEZE) still()
        else return res()
        inp.onProgress(Math.min(1, e / total))
        raf = requestAnimationFrame(tick)
      }
      tick()
    })
    if (cancelled) { stop(); return null }
    // the clip itself
    await v.play().catch(() => undefined)
    const clipT0 = elapsed()
    await new Promise<void>((res) => {
      const tick = () => {
        if (cancelled) return res()
        frame(); corner()
        inp.onProgress(Math.min(1, (INTRO + (img ? FREEZE : 0) + (v.currentTime - inp.start)) / total))
        if (v.currentTime >= inp.end || v.ended || elapsed() - clipT0 > len + 8) return res()
        raf = requestAnimationFrame(tick)
      }
      tick()
    })
    stop()
    await Promise.race([finished, wait(3000)])
    v.removeAttribute('src'); v.load()
    if (cancelled || !chunks.length) return null
    inp.onProgress(1)
    return { blob: new Blob(chunks, { type: type.mime.split(';')[0] }), ext: type.ext }
  })().catch(() => { stop(); return null })

  return { cancel: () => { cancelled = true; stop() }, done }
}
