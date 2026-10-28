// Telestration on a paused video frame: arrows, circles and freehand, drawn in video coordinates
// (0 to 1 of the picture), so the drawing survives a resize and can be burnt into a snapshot.
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent, type RefObject } from 'react'

export type Tool = 'arrow' | 'circle' | 'free'
export interface Shape { kind: Tool; color: string; pts: [number, number][] }

export const DRAW_COLORS = { sun: '#F0C760', cream: '#FBF7EE', clay: '#E0573F' } as const
export type DrawColor = keyof typeof DRAW_COLORS

/** Where the picture sits inside a <video> element with object-fit: contain (CSS pixels). */
export function contentRect(v: HTMLVideoElement) {
  const cw = v.clientWidth, ch = v.clientHeight
  const vw = v.videoWidth || cw, vh = v.videoHeight || ch
  const s = Math.min(cw / vw, ch / vh) || 1
  const w = vw * s, h = vh * s
  return { x: (cw - w) / 2, y: (ch - h) / 2, w, h }
}

/** Draw shapes on a context whose picture area is rect (in the context's pixels). */
export function renderShapes(ctx: CanvasRenderingContext2D, shapes: Shape[], rect: { x: number; y: number; w: number; h: number }) {
  const lw = Math.max(3, rect.w * 0.0065)
  const P = ([px, py]: [number, number]) => [rect.x + px * rect.w, rect.y + py * rect.h] as const
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  for (const s of shapes) {
    if (!s.pts.length) continue
    ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineWidth = lw
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = lw * 1.2
    ctx.beginPath()
    if (s.kind === 'free') {
      const pts = s.pts.map(P)
      ctx.moveTo(pts[0][0], pts[0][1])
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2
        ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my)
      }
      const last = pts[pts.length - 1]; ctx.lineTo(last[0], last[1])
      ctx.stroke()
    } else {
      const [x0, y0] = P(s.pts[0]); const [x1, y1] = P(s.pts[s.pts.length - 1])
      if (s.kind === 'circle') {
        const r = Math.max(lw * 2, Math.hypot(x1 - x0, y1 - y0))
        ctx.ellipse(x0, y0, r, r * 0.62, 0, 0, Math.PI * 2) // flattened: players stand on a pitch seen from the stand
        ctx.stroke()
      } else {
        ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke()
        const a = Math.atan2(y1 - y0, x1 - x0), head = Math.max(lw * 4, 12)
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x1 - head * Math.cos(a - 0.45), y1 - head * Math.sin(a - 0.45))
        ctx.lineTo(x1 - head * Math.cos(a + 0.45), y1 - head * Math.sin(a + 0.45))
        ctx.closePath(); ctx.fill()
      }
    }
  }
  ctx.shadowBlur = 0
}

/** The current frame plus the drawing, as a small JPEG data URL (max 640 px wide). */
export function snapshot(v: HTMLVideoElement, shapes: Shape[], maxW = 640): string | null {
  const vw = v.videoWidth, vh = v.videoHeight
  if (!vw || !vh) return null
  const w = Math.min(maxW, vw), h = Math.round((vh * w) / vw)
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const ctx = c.getContext('2d'); if (!ctx) return null
  try {
    ctx.drawImage(v, 0, 0, w, h)
    renderShapes(ctx, shapes, { x: 0, y: 0, w, h })
    return c.toDataURL('image/jpeg', 0.72)
  } catch { return null }
}

/** The drawing layer over the video. Active only while the video is paused. */
export function DrawLayer({ video, shapes, onAdd, tool, color, active, label }: {
  video: RefObject<HTMLVideoElement>; shapes: Shape[]; onAdd: (s: Shape) => void; tool: Tool; color: string; active: boolean; label: string
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [draft, setDraft] = useState<Shape | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  // follow the size of the video element
  useEffect(() => {
    const v = video.current
    if (!v) return
    const set = () => setSize({ w: v.clientWidth, h: v.clientHeight })
    set()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(set) : null
    ro?.observe(v)
    v.addEventListener('loadedmetadata', set)
    return () => { ro?.disconnect(); v.removeEventListener('loadedmetadata', set) }
  }, [video])

  useEffect(() => {
    const c = canvas.current, v = video.current
    if (!c || !v) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    c.width = Math.round(size.w * dpr); c.height = Math.round(size.h * dpr)
    const ctx = c.getContext('2d'); if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size.w, size.h)
    renderShapes(ctx, draft ? [...shapes, draft] : shapes, contentRect(v))
  }, [shapes, draft, size, video])

  const toVideo = (e: RPointerEvent): [number, number] | null => {
    const v = video.current, c = canvas.current
    if (!v || !c) return null
    const b = c.getBoundingClientRect(), r = contentRect(v)
    const x = (e.clientX - b.left - r.x) / r.w, y = (e.clientY - b.top - r.y) / r.h
    return [Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))]
  }
  const down = (e: RPointerEvent<HTMLCanvasElement>) => {
    if (!active) return
    const p = toVideo(e); if (!p) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDraft({ kind: tool, color, pts: [p, p] })
  }
  const move = (e: RPointerEvent<HTMLCanvasElement>) => {
    if (!draft) return
    const p = toVideo(e); if (!p) return
    setDraft((d) => (d ? { ...d, pts: d.kind === 'free' ? [...d.pts, p] : [d.pts[0], p] } : d))
  }
  const up = () => {
    if (!draft) return
    const [a, b] = [draft.pts[0], draft.pts[draft.pts.length - 1]]
    if (draft.kind === 'free' ? draft.pts.length > 2 : Math.hypot(a[0] - b[0], a[1] - b[1]) > 0.01) onAdd(draft)
    setDraft(null)
  }
  return (
    <canvas ref={canvas} aria-label={label} role="img"
      className="absolute inset-0 h-full w-full" style={{ touchAction: active ? 'none' : 'auto', pointerEvents: active ? 'auto' : 'none', cursor: active ? 'crosshair' : 'default' }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => setDraft(null)} />
  )
}
