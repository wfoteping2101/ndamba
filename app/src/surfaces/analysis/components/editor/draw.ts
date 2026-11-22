// Telestration shapes, stored in picture coordinates (0 to 1 of the video image) so they stay put
// whatever the zoom, the size of the screen or the export. Each shape keeps its stroke width as a
// share of the picture width, chosen for the zoom it was drawn at, so it looks the same as when drawn.

export type Tool = 'arrow' | 'circle' | 'free' | 'spotlight' | 'rect' | 'poly' | 'connect' | 'text'
export type Pt = [number, number]
export interface Shape { kind: Tool; color: string; pts: Pt[]; w: number; text?: string }

export const DRAW_COLORS = { sun: '#FFD452', cream: '#F6F7F2', clay: '#F0533F', mint: '#6EE7A8', sky: '#5CC8FF' } as const
export type DrawColor = keyof typeof DRAW_COLORS
export const BASE_W = 0.0062

/** Tools that build a shape point by point (finished with Enter, a double tap, or a tap on the first point). */
export const MULTI: Tool[] = ['poly', 'connect']

/** The zoom of the stage: scale s, then translation (tx, ty) in CSS pixels of the stage. */
export interface View { s: number; tx: number; ty: number }
export const NO_ZOOM: View = { s: 1, tx: 0, ty: 0 }
export interface Box { x: number; y: number; w: number; h: number }

/** Where the picture sits inside a <video> element with object-fit: contain (untransformed CSS pixels). */
export function contentRect(v: HTMLVideoElement): Box {
  const cw = v.clientWidth, ch = v.clientHeight
  const vw = v.videoWidth || 16, vh = v.videoHeight || 9
  const k = Math.min(cw / vw, ch / vh) || 1
  const w = vw * k, h = vh * k
  return { x: (cw - w) / 2, y: (ch - h) / 2, w, h }
}

/** The picture rectangle on screen once zoomed (stage pixels). */
export const shownRect = (r: Box, view: View): Box => ({ x: view.s * r.x + view.tx, y: view.s * r.y + view.ty, w: view.s * r.w, h: view.s * r.h })

/** Keep the zoomed picture covering the stage. */
export function clampView(v: View, cw: number, ch: number): View {
  const s = Math.max(1, Math.min(3, v.s))
  if (s === 1) return NO_ZOOM
  return { s, tx: Math.min(0, Math.max(cw - s * cw, v.tx)), ty: Math.min(0, Math.max(ch - s * ch, v.ty)) }
}

/** Zoom around a point of the stage (cx, cy), keeping that point still. */
export function zoomAt(v: View, factor: number, cx: number, cy: number, cw: number, ch: number): View {
  const s = Math.max(1, Math.min(3, v.s * factor))
  const lx = (cx - v.tx) / v.s, ly = (cy - v.ty) / v.s
  return clampView({ s, tx: cx - s * lx, ty: cy - s * ly }, cw, ch)
}

const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.replace('#', ''), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

/**
 * Draws shapes on a context. `pic` is the picture rectangle in the context's pixels: a point (u, v) of
 * the picture is at (pic.x + u * pic.w, pic.y + v * pic.h). `open` marks a shape still being built.
 */
export function renderShapes(ctx: CanvasRenderingContext2D, shapes: Shape[], pic: Box, open?: Shape | null) {
  const P = ([u, v]: Pt) => [pic.x + u * pic.w, pic.y + v * pic.h] as const
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  const all = open ? [...shapes, open] : shapes
  for (const s of all) {
    if (!s.pts.length) continue
    const lw = Math.max(1.5, s.w * pic.w)
    const building = s === open
    ctx.save()
    ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineWidth = lw
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = lw
    const pts = s.pts.map(P)
    const [x0, y0] = pts[0]
    const [x1, y1] = pts[pts.length - 1]
    switch (s.kind) {
      case 'free': {
        ctx.beginPath(); ctx.moveTo(x0, y0)
        for (let i = 1; i < pts.length - 1; i++) ctx.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2)
        ctx.lineTo(x1, y1); ctx.stroke(); break
      }
      case 'circle': {
        const r = Math.max(lw * 2, Math.hypot(x1 - x0, y1 - y0))
        ctx.beginPath(); ctx.ellipse(x0, y0, r, r * 0.62, 0, 0, Math.PI * 2); ctx.stroke(); break // flattened: the pitch is seen from the stand
      }
      case 'arrow': {
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke()
        const a = Math.atan2(y1 - y0, x1 - x0), head = Math.max(lw * 4, 10)
        ctx.beginPath(); ctx.moveTo(x1, y1)
        ctx.lineTo(x1 - head * Math.cos(a - 0.45), y1 - head * Math.sin(a - 0.45))
        ctx.lineTo(x1 - head * Math.cos(a + 0.45), y1 - head * Math.sin(a + 0.45))
        ctx.closePath(); ctx.fill(); break
      }
      case 'spotlight': {
        const rr = Math.max(lw * 3, pts.length > 1 ? Math.hypot(x1 - x0, y1 - y0) : 0.032 * pic.w)
        const top = pic.y
        // the soft beam, from the top of the picture down to the player
        ctx.shadowBlur = 0
        const g = ctx.createLinearGradient(0, top, 0, y0)
        g.addColorStop(0, rgba(s.color, 0)); g.addColorStop(1, rgba(s.color, 0.3))
        ctx.fillStyle = g
        ctx.beginPath(); ctx.moveTo(x0 - rr * 0.45, top); ctx.lineTo(x0 + rr * 0.45, top); ctx.lineTo(x0 + rr, y0); ctx.lineTo(x0 - rr, y0); ctx.closePath(); ctx.fill()
        // the ring under the feet
        ctx.fillStyle = rgba(s.color, 0.28)
        ctx.beginPath(); ctx.ellipse(x0, y0, rr, rr * 0.4, 0, 0, Math.PI * 2); ctx.fill()
        ctx.shadowBlur = lw; ctx.lineWidth = lw * 0.9
        ctx.beginPath(); ctx.ellipse(x0, y0, rr, rr * 0.4, 0, 0, Math.PI * 2); ctx.stroke()
        break
      }
      case 'rect': {
        const x = Math.min(x0, x1), y = Math.min(y0, y1), w = Math.abs(x1 - x0), h = Math.abs(y1 - y0)
        ctx.shadowBlur = 0; ctx.fillStyle = rgba(s.color, 0.24); ctx.fillRect(x, y, w, h)
        ctx.lineWidth = lw * 0.7; ctx.shadowBlur = lw; ctx.strokeRect(x, y, w, h); break
      }
      case 'poly': {
        ctx.beginPath(); ctx.moveTo(x0, y0)
        for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y)
        if (!building) { ctx.closePath(); ctx.save(); ctx.shadowBlur = 0; ctx.fillStyle = rgba(s.color, 0.24); ctx.fill(); ctx.restore() }
        ctx.lineWidth = lw * 0.7; ctx.stroke()
        if (building) for (const [x, y] of pts) { ctx.beginPath(); ctx.arc(x, y, lw * 1.2, 0, Math.PI * 2); ctx.fill() }
        break
      }
      case 'connect': {
        ctx.beginPath(); ctx.moveTo(x0, y0)
        for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y)
        ctx.stroke()
        for (const [x, y] of pts) {
          ctx.beginPath(); ctx.ellipse(x, y, lw * 2.6, lw * 1.4, 0, 0, Math.PI * 2)
          ctx.save(); ctx.fillStyle = rgba(s.color, 0.35); ctx.fill(); ctx.restore(); ctx.stroke()
        }
        break
      }
      case 'text': {
        if (!s.text) break
        const size = Math.max(11, s.w * 3.4 * pic.w)
        ctx.shadowBlur = 0
        ctx.font = `700 ${size}px "Archivo Variable", Archivo, system-ui, sans-serif`
        ctx.textBaseline = 'middle'
        const tw = ctx.measureText(s.text).width, padX = size * 0.5, h = size * 1.55
        ctx.fillStyle = 'rgba(6,23,16,.78)'
        roundRect(ctx, x0 - padX, y0 - h / 2, tw + padX * 2, h, h * 0.3); ctx.fill()
        ctx.fillStyle = s.color; ctx.fillRect(x0 - padX, y0 - h / 2 + h * 0.18, Math.max(2, size * 0.14), h * 0.64)
        ctx.fillText(s.text, x0 + size * 0.08, y0 + 1)
        break
      }
    }
    ctx.restore()
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}

/**
 * The frame as seen on screen (zoom included) plus the drawing, as a small JPEG data URL.
 * stage: size of the stage in CSS pixels; r: the picture rectangle before zoom.
 */
export function snapshotView(v: HTMLVideoElement, shapes: Shape[], view: View, stage: { w: number; h: number }, maxW = 960): string | null {
  const vw = v.videoWidth, vh = v.videoHeight
  if (!vw || !vh) return null
  const r = contentRect(v)
  const shown = shownRect(r, view)
  // the visible part of the picture, in stage pixels
  const x0 = Math.max(0, shown.x), y0 = Math.max(0, shown.y)
  const x1 = Math.min(stage.w, shown.x + shown.w), y1 = Math.min(stage.h, shown.y + shown.h)
  if (x1 - x0 < 4 || y1 - y0 < 4) return null
  const native = vw / shown.w // video pixels per stage pixel
  const W = Math.round(Math.min(maxW, (x1 - x0) * native)), k = W / (x1 - x0)
  const H = Math.round((y1 - y0) * k)
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const ctx = c.getContext('2d'); if (!ctx) return null
  try {
    const pic: Box = { x: (shown.x - x0) * k, y: (shown.y - y0) * k, w: shown.w * k, h: shown.h * k }
    ctx.drawImage(v, pic.x, pic.y, pic.w, pic.h)
    renderShapes(ctx, shapes, pic)
    return c.toDataURL('image/jpeg', 0.74)
  } catch { return null }
}
