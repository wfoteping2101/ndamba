// The timeline under the video: the clips on top, one thin lane per group of codes (coloured like the pad),
// the playhead, scrubbing, and the in and out handles of the clip being made. While a clip is being made,
// a detail lane zooms on it so the handles can be set to a tenth of a second.
import { memo, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { useT } from '../../../../i18n'
import { cx } from '../../../../lib/util'
import type { Clip } from '../../../../lib/types'
import type { TimeStore } from './clock'
import { useTime } from './clock'
import { colorOf, fmtT, fmtTenth, labelKey, laneOf, LANES, type Coded } from './model'

export interface Draft { start: number; end: number }

const LANE_H = 4
const LANE_GAP = 1
const CLIP_H = 11

export function Timeline({ span, time, coded, clips, selectedClip, draft, onDraft, onSeek, onPickClip, segments, marks }: {
  span: number
  time: TimeStore
  coded: Coded[]
  clips: Clip[]
  selectedClip: string | null
  draft: Draft | null
  onDraft: (d: Draft) => void
  onSeek: (t: number) => void
  onPickClip: (c: Clip) => void
  segments: [number, number][] | null
  marks: number[]
}) {
  const { t } = useT('editor')
  const [dragging, setDragging] = useState(false)
  const [win, setWin] = useState<[number, number] | null>(null)
  // the detail window follows the draft, but stays still while a handle is being dragged
  useEffect(() => {
    if (!draft) { setWin(null); return }
    if (dragging) return
    const len = Math.max(1, draft.end - draft.start)
    const pad = Math.max(8, len * 0.6)
    setWin([Math.max(0, draft.start - pad), Math.min(span || draft.end + pad, draft.end + pad)])
  }, [draft, dragging, span])
  return (
    <div className="select-none" aria-label={t('timeline.label')}>
      <Lane from={0} to={span || 1} time={time} coded={coded} clips={clips} selectedClip={selectedClip} draft={draft} onDraft={onDraft} onSeek={onSeek} onPickClip={onPickClip}
        segments={segments} marks={marks} onDragging={setDragging} />
      {draft && win && (
        <div className="mt-1.5">
          <div className="mb-0.5 flex items-center justify-between text-[11px] font-semibold tabular-nums text-cream/55">
            <span>{fmtT(win[0])}</span><span className="text-sun-300">{t('timeline.detail')}</span><span>{fmtT(win[1])}</span>
          </div>
          <Lane from={win[0]} to={win[1]} time={time} coded={coded} clips={[]} selectedClip={null} draft={draft} onDraft={onDraft} onSeek={onSeek} onPickClip={onPickClip}
            segments={null} marks={marks} onDragging={setDragging} detail />
        </div>
      )}
    </div>
  )
}

const Lane = memo(function Lane({ from, to, time, coded, clips, selectedClip, draft, onDraft, onSeek, onPickClip, segments, marks, onDragging, detail = false }: {
  from: number; to: number; time: TimeStore; coded: Coded[]; clips: Clip[]; selectedClip: string | null; draft: Draft | null
  onDraft: (d: Draft) => void; onSeek: (t: number) => void; onPickClip: (c: Clip) => void; segments: [number, number][] | null; marks: number[]
  onDragging: (v: boolean) => void; detail?: boolean
}) {
  const { t } = useT('editor')
  const wrap = useRef<HTMLDivElement>(null)
  const cv = useRef<HTMLCanvasElement>(null)
  const [w, setW] = useState(0)
  const [hover, setHover] = useState<{ x: number; text: string } | null>(null)
  const scrub = useRef(false)
  const len = Math.max(0.1, to - from)
  const X = useCallback((s: number) => ((s - from) / len) * w, [from, len, w])
  const lanesH = LANES.length * (LANE_H + LANE_GAP) - LANE_GAP
  const markerH = detail ? 22 : lanesH

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const set = () => setW(el.clientWidth)
    set()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(set) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [])

  // the codes, drawn once per change (hundreds of markers would be heavy as elements)
  useEffect(() => {
    const c = cv.current
    if (!c || !w) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    c.width = Math.round(w * dpr); c.height = Math.round(markerH * dpr)
    const ctx = c.getContext('2d'); if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, markerH)
    if (!detail) LANES.forEach((_, i) => { ctx.fillStyle = 'rgba(255,255,255,.045)'; ctx.fillRect(0, i * (LANE_H + LANE_GAP), w, LANE_H) })
    else { ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(0, 0, w, markerH) }
    for (const x of coded) {
      if (x.t < from || x.t > to) continue
      const i = LANES.indexOf(laneOf(x))
      ctx.fillStyle = colorOf(x.code, x.side)
      const px = X(x.t)
      if (detail) { const y = 2 + (i / (LANES.length - 1)) * (markerH - 8); ctx.fillRect(px - 1.5, y, 3, 4) }
      else ctx.fillRect(px - 0.75, i * (LANE_H + LANE_GAP), 1.5, LANE_H)
    }
    if (segments) {
      // « Temps utile »: the parts that are skipped are shaded
      ctx.fillStyle = 'rgba(6,23,16,.62)'
      let last = from
      for (const [a, b] of segments) { if (a > last) ctx.fillRect(X(last), 0, X(a) - X(last), markerH); last = Math.max(last, b) }
      if (last < to) ctx.fillRect(X(last), 0, X(to) - X(last), markerH)
    }
    ctx.fillStyle = 'rgba(246,247,242,.55)'
    for (const m of marks) if (m > from && m < to) ctx.fillRect(X(m) - 0.5, 0, 1, markerH)
  }, [coded, from, to, w, X, detail, markerH, segments, marks])

  const tAt = (clientX: number) => { const b = wrap.current!.getBoundingClientRect(); return Math.max(from, Math.min(to, from + ((clientX - b.left) / b.width) * len)) }
  const nearest = (clientX: number) => {
    const s = tAt(clientX), tol = (6 / Math.max(1, w)) * len
    let best: Coded | null = null
    for (const x of coded) if (Math.abs(x.t - s) <= tol && (!best || Math.abs(x.t - s) < Math.abs(best.t - s))) best = x
    return { s, best }
  }
  const down = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    scrub.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    onSeek(tAt(e.clientX))
  }
  const move = (e: RPointerEvent<HTMLDivElement>) => {
    if (scrub.current) { onSeek(tAt(e.clientX)); return }
    if (e.pointerType !== 'mouse') return
    const { s, best } = nearest(e.clientX)
    const b = wrap.current!.getBoundingClientRect()
    setHover({ x: e.clientX - b.left, text: best ? `${fmtT(best.t)}  ${t(labelKey(best.code, best.side))}` : fmtT(s) })
  }
  const end = () => { scrub.current = false }

  return (
    <div ref={wrap} className="relative">
      {!detail && (
        <div className="relative mb-1" style={{ height: CLIP_H }}>
          {clips.map((c) => (
            <button key={c.id} type="button" onClick={() => onPickClip(c)} title={c.title || t('clips.auto')} aria-label={`${t('clips.play')} ${fmtT(c.start)}`}
              className={cx('absolute top-0 h-full rounded-[3px] ring-1 ring-inset transition', selectedClip === c.id ? 'bg-sun-300 ring-sun-500' : c.auto ? 'bg-forest-300/45 ring-forest-300/60 hover:bg-forest-300/70' : 'bg-cream/35 ring-cream/40 hover:bg-cream/55')}
              style={{ left: X(c.start), width: Math.max(3, X(c.end) - X(c.start)) }} />
          ))}
        </div>
      )}
      <div className={cx('relative cursor-pointer touch-none rounded-[4px]', detail ? 'bg-white/[0.04]' : '')} style={{ height: markerH }}
        onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onPointerLeave={() => setHover(null)}
        role="slider" aria-label={t('timeline.seek')} aria-valuemin={Math.round(from)} aria-valuemax={Math.round(to)} aria-valuenow={Math.round(time.get())} tabIndex={detail ? -1 : 0}
        onKeyDown={(e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); onSeek(time.get() + (e.key === 'ArrowLeft' ? -1 : 1)) } }}>
        <canvas ref={cv} className="pointer-events-none absolute inset-0 h-full w-full" />
        {detail && <Ticks from={from} to={to} X={X} />}
        {draft && <DraftRange draft={draft} X={X} w={w} from={from} to={to} len={len} onDraft={onDraft} onDragging={onDragging} detail={detail} />}
        <Playhead time={time} from={from} len={len} />
        {hover && !scrub.current && (
          <span className="pointer-events-none absolute -top-7 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-night-900 px-2 py-0.5 text-[11.5px] font-semibold tabular-nums text-cream shadow-lift ring-1 ring-white/10"
            style={{ left: Math.max(30, Math.min(w - 30, hover.x)) }}>{hover.text}</span>
        )}
      </div>
    </div>
  )
})


function Ticks({ from, to, X }: { from: number; to: number; X: (s: number) => number }) {
  const len = to - from
  const step = len > 120 ? 30 : len > 50 ? 10 : 5
  const out: number[] = []
  for (let s = Math.ceil(from / step) * step; s <= to; s += step) out.push(s)
  return <>{out.map((s) => <span key={s} className="pointer-events-none absolute bottom-0 h-1.5 w-px bg-cream/35" style={{ left: X(s) }} />)}</>
}

function Playhead({ time, from, len }: { time: TimeStore; from: number; len: number }) {
  const cur = useTime(time)
  const p = (cur - from) / len
  if (p < 0 || p > 1) return null
  return <div className="pointer-events-none absolute -bottom-1 -top-1 w-0.5 -translate-x-1/2 rounded-full bg-sun-300 shadow-[0_0_0_1px_rgba(0,0,0,.35)]" style={{ left: `${p * 100}%` }} />
}

/** The clip being made: a gold range with two handles. */
function DraftRange({ draft, X, w, from, to, len, onDraft, onDragging, detail }: {
  draft: Draft; X: (s: number) => number; w: number; from: number; to: number; len: number; onDraft: (d: Draft) => void; onDragging: (v: boolean) => void; detail: boolean
}) {
  const { t } = useT('editor')
  const grab = useRef<{ which: 'start' | 'end'; x0: number; v0: number } | null>(null)
  const a = Math.max(from, draft.start), b = Math.min(to, draft.end)
  const visible = b > from && a < to
  const handle = (which: 'start' | 'end') => ({
    onPointerDown: (e: RPointerEvent<HTMLSpanElement>) => {
      e.stopPropagation(); e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      grab.current = { which, x0: e.clientX, v0: draft[which] }
      onDragging(true)
    },
    onPointerMove: (e: RPointerEvent<HTMLSpanElement>) => {
      const g = grab.current
      if (!g || !w) return
      const v = Math.round((g.v0 + ((e.clientX - g.x0) / w) * len) * 10) / 10
      if (g.which === 'start') onDraft({ start: Math.max(0, Math.min(draft.end - 0.5, v)), end: draft.end })
      else onDraft({ start: draft.start, end: Math.max(draft.start + 0.5, v) })
    },
    onPointerUp: () => { grab.current = null; onDragging(false) },
    onPointerCancel: () => { grab.current = null; onDragging(false) },
  })
  if (!visible) return null
  const key = (which: 'start' | 'end') => (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault(); e.stopPropagation()
    const d = (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 1 : 0.1)
    if (which === 'start') onDraft({ start: Math.max(0, Math.min(draft.end - 0.5, Math.round((draft.start + d) * 10) / 10)), end: draft.end })
    else onDraft({ start: draft.start, end: Math.max(draft.start + 0.5, Math.round((draft.end + d) * 10) / 10) })
  }
  const H = (which: 'start' | 'end', x: number) => (
    <span {...handle(which)} role="slider" tabIndex={0} aria-label={t(which === 'start' ? 'clips.inHandle' : 'clips.outHandle')} aria-valuenow={draft[which]} aria-valuetext={fmtTenth(draft[which])}
      onKeyDown={key(which)} title={fmtTenth(draft[which])}
      className={cx('absolute z-[2] grid -translate-x-1/2 cursor-ew-resize touch-none place-items-center rounded-[4px] bg-sun-500 shadow ring-1 ring-black/30', detail ? '-top-1 -bottom-1 w-3.5' : '-top-[16px] -bottom-1 w-3')}
      style={{ left: x }}>
      <span className="h-3 w-0.5 rounded-full bg-ink/60" />
    </span>
  )
  return (
    <>
      <span className="pointer-events-none absolute inset-y-0 z-[1] bg-sun-300/25 ring-1 ring-inset ring-sun-300/70" style={{ left: X(a), width: Math.max(2, X(b) - X(a)) }} />
      {draft.start >= from && H('start', X(draft.start))}
      {draft.end <= to && H('end', X(draft.end))}
    </>
  )
}
