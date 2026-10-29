// The on-screen controller, laid out like a console pad: the left stick moves (touch anywhere in the
// lower left and it appears under the thumb), the four face buttons sit in a diamond on the right
// (cross, circle, square, triangle) with what each one does right now written next to it, R2 sprints,
// L1 is the extra. A real pad (PS5 DualSense, any standard gamepad) drives the same actions; the
// on-screen pad then shrinks to a legend of the buttons. Glyphs are drawn, monochrome, no logos.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cx } from '../../lib/util'

export type PadButton = 'cross' | 'circle' | 'square' | 'triangle' | 'r2' | 'l1'
export interface PadAction { label: string; onDown: () => void; onUp?: () => void; enabled?: boolean; primary?: boolean; key?: string }

const R = 50 // stick travel (px)

function Glyph({ b, size = 22 }: { b: PadButton; size?: number }) {
  const s = size, c = 'currentColor', w = 2.4
  if (b === 'cross') return <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke={c} strokeWidth={w} strokeLinecap="round" fill="none" /></svg>
  if (b === 'circle') return <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6.6" stroke={c} strokeWidth={w} fill="none" /></svg>
  if (b === 'square') return <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1" stroke={c} strokeWidth={w} fill="none" /></svg>
  if (b === 'triangle') return <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5.5l7 12H5z" stroke={c} strokeWidth={w} strokeLinejoin="round" fill="none" /></svg>
  return <span className="text-[13px] font-bold tracking-wide">{b === 'r2' ? 'R2' : 'L1'}</span>
}

function FaceButton({ b, a, size, labelSide }: { b: PadButton; a?: PadAction; size: number; labelSide: 'left' | 'right' | 'top' | 'bottom' }) {
  const [down, setDown] = useState(false)
  const on = !!a && a.enabled !== false
  const label = a?.label
  const lab = label && on && (
    <span className={cx('pointer-events-none absolute whitespace-nowrap rounded-full bg-black/55 px-2 py-0.5 text-[11.5px] font-semibold text-cream backdrop-blur',
      labelSide === 'left' && 'right-full mr-1.5 top-1/2 -translate-y-1/2', labelSide === 'right' && 'left-full ml-1.5 top-1/2 -translate-y-1/2',
      labelSide === 'top' && 'bottom-full mb-1 left-1/2 -translate-x-1/2', labelSide === 'bottom' && 'top-full mt-1 left-1/2 -translate-x-1/2')}>{label}</span>
  )
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <button type="button" aria-label={label ? `${label}` : b} disabled={!on}
        className={cx('grid h-full w-full touch-none select-none place-items-center rounded-full border shadow-[0_6px_18px_rgba(0,0,0,0.35)] transition-transform',
          on ? (a?.primary ? 'border-sun-300/90 bg-black/45 text-sun-300' : 'border-white/35 bg-black/40 text-cream') : 'border-white/10 bg-black/20 text-cream/30',
          down && 'scale-90 bg-black/60')}
        style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
        onPointerDown={(e) => { if (!on) return; e.preventDefault(); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); setDown(true); a!.onDown() }}
        onPointerUp={() => { if (!down) return; setDown(false); a?.onUp?.() }}
        onPointerCancel={() => { if (!down) return; setDown(false); a?.onUp?.() }}>
        <Glyph b={b} size={Math.round(size * 0.4)} />
        {a?.key && on && <span className="pointer-events-none absolute -bottom-1 -right-1 hidden rounded bg-cream px-1 text-[10px] font-bold text-ink sm:block">{a.key}</span>}
      </button>
      {lab}
    </div>
  )
}

/** The left stick: appears under the thumb anywhere in its zone, springs back when released. */
function LeftStick({ onMove, label }: { onMove: (x: number, y: number) => void; label: string }) {
  const zone = useRef<HTMLDivElement>(null)
  const id = useRef<number | null>(null)
  const [base, setBase] = useState<{ x: number; y: number } | null>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const home = () => { const r = zone.current!.getBoundingClientRect(); return { x: 92, y: r.height - 92 } }
  const update = (cx_: number, cy: number, b: { x: number; y: number }) => {
    const r = zone.current!.getBoundingClientRect()
    let dx = cx_ - r.left - b.x, dy = cy - r.top - b.y
    const m = Math.hypot(dx, dy)
    if (m > R) { dx = (dx / m) * R; dy = (dy / m) * R }
    setKnob({ x: dx, y: dy })
    const nx = dx / R, ny = -dy / R
    const mm = Math.hypot(nx, ny)
    onMove(mm < 0.12 ? 0 : nx, mm < 0.12 ? 0 : ny)
  }
  const end = () => { id.current = null; setBase(null); setKnob({ x: 0, y: 0 }); onMove(0, 0) }
  const b = base ?? (zone.current ? home() : { x: 92, y: 140 })
  return (
    <div ref={zone} role="application" aria-label={label} className="absolute bottom-0 left-0 z-20 h-[46%] w-[46%] max-w-[420px] touch-none select-none"
      onPointerDown={(e) => {
        id.current = e.pointerId
        ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
        const r = zone.current!.getBoundingClientRect()
        const nb = { x: Math.max(70, e.clientX - r.left), y: Math.min(r.height - 70, e.clientY - r.top) }
        setBase(nb)
        update(e.clientX, e.clientY, nb)
      }}
      onPointerMove={(e) => { if (id.current === e.pointerId) update(e.clientX, e.clientY, base ?? home()) }}
      onPointerUp={end} onPointerCancel={end}>
      <div className={cx('pointer-events-none absolute rounded-full border transition-opacity', base ? 'opacity-100' : 'opacity-70')}
        style={{ left: b.x - 66, top: b.y - 66, width: 132, height: 132, borderColor: 'rgba(255,255,255,0.28)', background: 'radial-gradient(circle at 50% 45%, rgba(0,0,0,0.18), rgba(0,0,0,0.42))', backdropFilter: 'blur(4px)' }}>
        <div className="absolute inset-[18px] rounded-full border border-white/10" />
      </div>
      <div className="pointer-events-none absolute rounded-full border border-white/45 shadow-[0_6px_16px_rgba(0,0,0,0.45)]"
        style={{ left: b.x - 30 + knob.x, top: b.y - 30 + knob.y, width: 60, height: 60, background: 'radial-gradient(circle at 50% 38%, #4b4f52, #1d1f21 70%)' }}>
        <div className="absolute inset-[9px] rounded-full" style={{ background: 'radial-gradient(circle at 50% 60%, rgba(255,255,255,0.06), rgba(0,0,0,0.35))' }} />
      </div>
    </div>
  )
}

export interface ManetteProps {
  stick?: boolean
  onMove?: (x: number, y: number) => void
  buttons: Partial<Record<PadButton, PadAction>>
  stickLabel: string
  /** a real controller is in use: show a compact legend instead of the touch pad */
  compact?: boolean
  children?: ReactNode
}

export function Manette({ stick, onMove, buttons, stickLabel, compact }: ManetteProps) {
  const has = Object.values(buttons).some((b) => b && b.enabled !== false)
  if (compact) {
    const items = (['cross', 'circle', 'square', 'triangle', 'r2', 'l1'] as PadButton[]).filter((k) => buttons[k] && buttons[k]!.enabled !== false)
    if (!items.length) return null
    return (
      <div className="pointer-events-none absolute bottom-0 right-0 z-20 flex flex-col items-end gap-1 p-4" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
        {items.map((k) => (
          <span key={k} className="inline-flex items-center gap-2 rounded-full bg-black/50 py-1 pl-1.5 pr-3 text-[13px] font-semibold text-cream backdrop-blur">
            <span className="grid h-7 w-7 place-items-center rounded-full border border-white/30"><Glyph b={k} size={15} /></span>{buttons[k]!.label}
          </span>
        ))}
      </div>
    )
  }
  return (
    <>
      {stick && onMove && <LeftStick onMove={onMove} label={stickLabel} />}
      {has && (
        <div className="absolute bottom-0 right-0 z-20 select-none p-3 sm:p-5" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 14px)' }}>
          <div className="mb-2 flex justify-end gap-2">
            {buttons.l1 && buttons.l1.enabled !== false && <Shoulder b="l1" a={buttons.l1} />}
            {buttons.r2 && buttons.r2.enabled !== false && <Shoulder b="r2" a={buttons.r2} />}
          </div>
          <div className="relative" style={{ width: 196, height: 196 }}>
            <div className="absolute left-1/2 top-0 -translate-x-1/2"><FaceButton b="triangle" a={buttons.triangle} size={62} labelSide="left" /></div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2"><FaceButton b="square" a={buttons.square} size={62} labelSide="top" /></div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2"><FaceButton b="circle" a={buttons.circle} size={62} labelSide="top" /></div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2"><FaceButton b="cross" a={buttons.cross} size={70} labelSide="left" /></div>
          </div>
        </div>
      )}
    </>
  )
}

function Shoulder({ b, a }: { b: PadButton; a: PadAction }) {
  const [down, setDown] = useState(false)
  return (
    <button type="button" aria-label={a.label}
      className={cx('inline-flex min-h-[44px] touch-none select-none items-center gap-2 rounded-[14px] border border-white/30 bg-black/40 px-3 text-cream shadow-lg backdrop-blur', down && 'bg-black/60')}
      onPointerDown={(e) => { e.preventDefault(); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); setDown(true); a.onDown() }}
      onPointerUp={() => { setDown(false); a.onUp?.() }} onPointerCancel={() => { setDown(false); a.onUp?.() }}>
      <Glyph b={b} /><span className="text-[12.5px] font-semibold">{a.label}</span>
    </button>
  )
}

/** Whether a real controller is plugged in and in use (polls the Gamepad API). */
export function useGamepad(): boolean {
  const [on, setOn] = useState(false)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : []
      const p = pads.find((x) => x && x.connected)
      const active = !!p && (p.buttons.some((b) => b.pressed) || p.axes.some((a) => Math.abs(a) > 0.3))
      if (active) setOn(true)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const touch = () => setOn(false)
    window.addEventListener('touchstart', touch, { passive: true })
    window.addEventListener('gamepaddisconnected', touch)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('touchstart', touch); window.removeEventListener('gamepaddisconnected', touch) }
  }, [])
  return on
}
