// The picture of a file or hosted video: zoom (wheel, pinch, buttons) and pan, a tap to play or pause,
// and the drawing layer on top. The drawing canvas is never zoomed itself: shapes are stored in picture
// coordinates and drawn through the current zoom, so they stay sharp and exactly where they were placed.
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode, type RefObject } from 'react'
import { BASE_W, clampView, contentRect, DRAW_COLORS, MULTI, renderShapes, shownRect, zoomAt, type DrawColor, type Pt, type Shape, type Tool, type View } from './draw'

/* ------------------------------------------------------------------ drawing state */

export interface DrawState {
  tool: Tool; setTool: (t: Tool) => void
  color: DrawColor; setColor: (c: DrawColor) => void
  shapes: Shape[]
  open: Shape | null
  canUndo: boolean; canRedo: boolean
  add: (s: Shape) => void
  setOpen: (s: Shape | null) => void
  finish: () => void
  undo: () => void
  redo: () => void
  clear: () => void
}

interface Ink { shapes: Shape[]; redo: Shape[]; open: Shape | null }
type InkAction = { type: 'add'; s: Shape } | { type: 'open'; s: Shape | null } | { type: 'finish' } | { type: 'undo' } | { type: 'redo' } | { type: 'clear' }
const complete = (s: Shape | null) => !!s && (s.kind === 'poly' ? s.pts.length >= 3 : s.pts.length >= 2)
function ink(st: Ink, a: InkAction): Ink {
  switch (a.type) {
    case 'add': return { shapes: [...st.shapes, a.s], redo: [], open: st.open }
    case 'open': return { ...st, open: a.s }
    case 'finish': return complete(st.open) ? { shapes: [...st.shapes, st.open!], redo: [], open: null } : { ...st, open: null }
    case 'undo':
      if (st.open) return { ...st, open: st.open.pts.length > 1 ? { ...st.open, pts: st.open.pts.slice(0, -1) } : null }
      if (!st.shapes.length) return st
      return { shapes: st.shapes.slice(0, -1), redo: [...st.redo, st.shapes[st.shapes.length - 1]], open: null }
    case 'redo':
      if (!st.redo.length) return st
      return { shapes: [...st.shapes, st.redo[st.redo.length - 1]], redo: st.redo.slice(0, -1), open: st.open }
    case 'clear': return { shapes: [], redo: [], open: null }
  }
}

export function useDrawState(): DrawState {
  const [tool, setToolState] = useState<Tool>('arrow')
  const [color, setColor] = useState<DrawColor>('sun')
  const [st, dispatch] = useReducer(ink, { shapes: [], redo: [], open: null })
  const finish = useCallback(() => dispatch({ type: 'finish' }), [])
  return useMemo(() => ({
    tool, color, shapes: st.shapes, open: st.open, setColor, finish,
    setOpen: (s: Shape | null) => dispatch({ type: 'open', s }),
    setTool: (t: Tool) => { dispatch({ type: 'finish' }); setToolState(t) },
    canUndo: st.shapes.length > 0 || !!st.open, canRedo: st.redo.length > 0,
    add: (s: Shape) => dispatch({ type: 'add', s }),
    undo: () => dispatch({ type: 'undo' }),
    redo: () => dispatch({ type: 'redo' }),
    clear: () => dispatch({ type: 'clear' }),
  }), [tool, color, st, finish])
}

/* ------------------------------------------------------------------ the stage */

export function Stage({ video, src, view, onView, drawing, draw, onTap, maxH, label, textPlaceholder, children, onVideoEvents, zoomable = true }: {
  video: RefObject<HTMLVideoElement>
  src: string
  view: View
  onView: (v: View) => void
  drawing: boolean
  draw: DrawState
  onTap: () => void
  maxH: string
  label: string
  textPlaceholder: string
  children?: ReactNode
  onVideoEvents: React.VideoHTMLAttributes<HTMLVideoElement>
  zoomable?: boolean
}) {
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [drag, setDrag] = useState<Shape | null>(null)
  const [text, setText] = useState<{ at: Pt; x: number; y: number; value: string } | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ kind: 'pan' | 'pinch' | 'tap' | 'draw'; x: number; y: number; view: View; dist?: number; moved: boolean; at: number } | null>(null)
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null)
  const textRef = useRef<HTMLInputElement>(null)
  const viewRef = useRef(view)
  viewRef.current = view

  // follow the stage size; keep the zoom valid when it changes
  useEffect(() => {
    const el = box.current
    if (!el) return
    const set = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    set()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(set) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [])
  useEffect(() => { if (size.w) { const c = clampView(viewRef.current, size.w, size.h); if (c.s !== viewRef.current.s || c.tx !== viewRef.current.tx || c.ty !== viewRef.current.ty) onView(c) } }, [size.w, size.h]) // eslint-disable-line react-hooks/exhaustive-deps

  // paint the drawing through the zoom
  useEffect(() => {
    const c = canvas.current, v = video.current
    if (!c || !v || !size.w) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    c.width = Math.round(size.w * dpr); c.height = Math.round(size.h * dpr)
    const ctx = c.getContext('2d'); if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size.w, size.h)
    renderShapes(ctx, drag ? [...draw.shapes, drag] : draw.shapes, shownRect(contentRect(v), view), draw.open)
  }, [draw.shapes, draw.open, drag, size, view, video])

  // wheel zoom (native listener: React's wheel handler is passive)
  useEffect(() => {
    const el = box.current
    if (!el || !zoomable) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const b = el.getBoundingClientRect()
      onView(zoomAt(viewRef.current, Math.exp(-e.deltaY * 0.0015), e.clientX - b.left, e.clientY - b.top, b.width, b.height))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onView, zoomable])

  // Enter finishes a zone or a chain of players; Escape drops it (before the studio closes the drawing)
  useEffect(() => {
    if (!drawing || !draw.open) return
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); draw.finish() }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); draw.setOpen(null) }
    }
    window.addEventListener('keydown', k, true)
    return () => window.removeEventListener('keydown', k, true)
  }, [drawing, draw])

  /** Stage pixels to picture coordinates, through the zoom. */
  const toPic = (sx: number, sy: number): Pt | null => {
    const v = video.current
    if (!v) return null
    const p = shownRect(contentRect(v), viewRef.current)
    return [Math.max(0, Math.min(1, (sx - p.x) / p.w)), Math.max(0, Math.min(1, (sy - p.y) / p.h))]
  }
  const local = (e: RPointerEvent) => { const b = box.current!.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top } }
  const width = () => BASE_W / viewRef.current.s
  const colorHex = DRAW_COLORS[draw.color]

  const down = (e: RPointerEvent<HTMLCanvasElement>) => {
    if (text) return
    const p = local(e)
    pointers.current.set(e.pointerId, p)
    e.currentTarget.setPointerCapture(e.pointerId)
    if (pointers.current.size === 2 && zoomable) {
      const [a, b] = [...pointers.current.values()]
      setDrag(null)
      gesture.current = { kind: 'pinch', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, view: viewRef.current, dist: Math.hypot(a.x - b.x, a.y - b.y), moved: true, at: Date.now() }
      return
    }
    if (pointers.current.size > 1) return
    if (drawing) {
      const at = toPic(p.x, p.y); if (!at) return
      gesture.current = { kind: 'draw', x: p.x, y: p.y, view: viewRef.current, moved: false, at: Date.now() }
      if (draw.tool === 'text') {
        // keep the focus for the text field (the press would otherwise move it to the page)
        e.preventDefault()
        pointers.current.delete(e.pointerId)
        setText({ at, x: p.x, y: p.y, value: '' }); gesture.current = null
        window.setTimeout(() => textRef.current?.focus(), 30)
        return
      }
      if (MULTI.includes(draw.tool)) {
        const o = draw.open
        const now = Date.now(), lt = lastTap.current
        const dbl = !!lt && now - lt.t < 320 && Math.hypot(lt.x - p.x, lt.y - p.y) < 14
        lastTap.current = { t: now, x: p.x, y: p.y }
        if (o && dbl) { draw.finish(); return }
        if (o && o.kind === 'poly' && o.pts.length >= 3) {
          const v = video.current!, r = shownRect(contentRect(v), viewRef.current)
          const [fx, fy] = [r.x + o.pts[0][0] * r.w, r.y + o.pts[0][1] * r.h]
          if (Math.hypot(fx - p.x, fy - p.y) < 16) { draw.finish(); return }
        }
        draw.setOpen(o && o.kind === draw.tool ? { ...o, pts: [...o.pts, at] } : { kind: draw.tool, color: colorHex, w: width(), pts: [at] })
        return
      }
      setDrag({ kind: draw.tool, color: colorHex, w: width(), pts: [at, at] })
      return
    }
    gesture.current = { kind: viewRef.current.s > 1 ? 'pan' : 'tap', x: p.x, y: p.y, view: viewRef.current, moved: false, at: Date.now() }
  }

  const move = (e: RPointerEvent<HTMLCanvasElement>) => {
    if (!pointers.current.has(e.pointerId)) return
    const p = local(e)
    pointers.current.set(e.pointerId, p)
    const g = gesture.current
    if (!g) return
    if (g.kind === 'pinch' && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      const k = d / (g.dist || d)
      const base = zoomAt(g.view, k, g.x, g.y, size.w, size.h)
      const mx = (a.x + b.x) / 2 - g.x, my = (a.y + b.y) / 2 - g.y
      onView(clampView({ ...base, tx: base.tx + mx, ty: base.ty + my }, size.w, size.h))
      return
    }
    const dx = p.x - g.x, dy = p.y - g.y
    if (Math.hypot(dx, dy) > 6) g.moved = true
    if (g.kind === 'pan' && g.moved) onView(clampView({ ...g.view, tx: g.view.tx + dx, ty: g.view.ty + dy }, size.w, size.h))
    if (g.kind === 'draw' && drag) {
      const at = toPic(p.x, p.y); if (!at) return
      setDrag((d) => (d ? { ...d, pts: d.kind === 'free' ? [...d.pts, at] : [d.pts[0], at] } : d))
    }
  }

  const up = (e: RPointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId)
    const g = gesture.current
    if (pointers.current.size > 0) { if (g?.kind === 'pinch') gesture.current = null; return }
    gesture.current = null
    if (!g) return
    if (g.kind === 'draw' && drag) {
      const [a, b] = [drag.pts[0], drag.pts[drag.pts.length - 1]]
      const far = Math.hypot(a[0] - b[0], a[1] - b[1]) > 0.008
      if (drag.kind === 'spotlight') draw.add(far ? drag : { ...drag, pts: [a] })
      else if (drag.kind === 'free' ? drag.pts.length > 2 : far) draw.add(drag)
      setDrag(null)
      return
    }
    if ((g.kind === 'tap' || g.kind === 'pan') && !g.moved && Date.now() - g.at < 600) onTap()
  }

  const commitText = () => {
    if (text && text.value.trim()) draw.add({ kind: 'text', color: colorHex, w: width(), pts: [text.at], text: text.value.trim().slice(0, 60) })
    setText(null)
  }

  const t = view.s > 1 ? `translate(${view.tx}px, ${view.ty}px) scale(${view.s})` : undefined
  return (
    <div ref={box} className="relative w-full overflow-hidden bg-black" style={{ aspectRatio: '16 / 9', maxHeight: maxH }}>
      <video ref={video} src={src} crossOrigin="anonymous" playsInline preload="metadata"
        className="absolute inset-0 block h-full w-full origin-top-left bg-black object-contain" style={{ transform: t }} {...onVideoEvents} />
      <canvas ref={canvas} aria-label={label} role="img"
        className="absolute inset-0 h-full w-full"
        style={{ touchAction: drawing || view.s > 1 ? 'none' : 'pan-y', cursor: drawing ? (draw.tool === 'text' ? 'text' : 'crosshair') : view.s > 1 ? 'grab' : 'pointer' }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={(e) => { pointers.current.delete(e.pointerId); gesture.current = null; setDrag(null) }} />
      {text && (
        <input ref={textRef} autoFocus value={text.value} placeholder={textPlaceholder} aria-label={textPlaceholder} maxLength={60}
          onChange={(e) => setText({ ...text, value: e.target.value })}
          onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') commitText(); if (e.key === 'Escape') setText(null) }}
          onBlur={commitText}
          className="absolute z-10 h-9 w-[min(240px,60%)] -translate-y-1/2 rounded-lg border border-white/30 bg-night-900/90 px-2.5 text-[14px] font-semibold text-cream outline-none placeholder:text-cream/45"
          style={{ left: Math.min(text.x, size.w - 120), top: text.y }} />
      )}
      {children}
    </div>
  )
}
