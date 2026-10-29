// UI pieces shared by both games: the full-screen shell, glass panels over the 3D view,
// round icon buttons (44 px minimum), the touch stick, the settings sheet and a store hook
// that lets React read a game session that lives outside React.
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Volume2, VolumeX, X } from 'lucide-react'
import { useT } from '../../i18n'
import { cx } from '../../lib/util'
import { loadAudio, saveAudio, sfx, type AudioSettings } from './audio'
import { QUALITY, detectQuality, type Quality } from '../engine/render/stage'

/** Subscribe to an object with subscribe(fn) and a `state` field. */
export function useStore<S>(src: { subscribe(fn: () => void): () => void; state: S } | null): S | null {
  return useSyncExternalStore(
    (fn) => (src ? src.subscribe(fn) : () => {}),
    () => (src ? src.state : null),
    () => (src ? src.state : null),
  )
}

/**
 * Keep the 3D framing clear of a panel: measures the element and tells the stage which edge it
 * covers (a side panel on wide screens, a bottom sheet on phones). The top bar always takes 56 px.
 */
export function usePanelInsets(stage: { setInsets(l: number, t: number, r: number, b: number): void } | null | undefined, panel: HTMLElement | null, enabled = true) {
  useEffect(() => {
    if (!stage) return
    const top = 56
    if (!panel || !enabled) { stage.setInsets(0, top, 0, 0); return }
    const apply = () => {
      const r = panel.getBoundingClientRect()
      const W = window.innerWidth, H = window.innerHeight
      if (r.width < W * 0.6 && r.left < 40) stage.setInsets(Math.min(r.right + 8, W * 0.6), top, 0, 0)
      else if (r.width < W * 0.6 && r.right > W - 40) stage.setInsets(0, top, Math.min(W - r.left + 8, W * 0.6), 0)
      else if (r.top > H * 0.25) stage.setInsets(0, top, 0, Math.min(H - r.top + 8, H * 0.7))
      else stage.setInsets(0, top, 0, 0)
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(panel)
    window.addEventListener('resize', apply)
    return () => { ro.disconnect(); window.removeEventListener('resize', apply); stage.setInsets(0, top, 0, 0) }
  }, [stage, panel, enabled])
}

/** Mount something imperative (a 3D session) on a div; rebuilt when deps change. */
export function useMounted<T extends { dispose(): void }>(make: (el: HTMLDivElement) => T | null, deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null)
  const [inst, setInst] = useState<T | null>(null)
  const [error, setError] = useState<unknown>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let i: T | null = null
    try { i = make(el) } catch (e) { setError(e); console.error(e); return }
    setInst(i)
    return () => { i?.dispose(); setInst(null) }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  return { ref, inst, error }
}

export function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch { return false }
}

/** Full-screen game frame: dark field colour, the scene behind, UI on top. */
export function GameFrame({ children, className }: { children: ReactNode; className?: string }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])
  return <div className={cx('surface-dark fixed inset-0 z-50 overflow-hidden bg-night-900 text-cream', className)}>{children}</div>
}

export function TopBar({ back, backLabel, title, sub, right }: { back: string; backLabel?: string; title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  const { t } = useT('jeux')
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-2 sm:p-3" style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}>
      <div className="pointer-events-auto flex min-w-0 items-center gap-2">
        <Link to={back} className="glass grid h-11 w-11 shrink-0 place-items-center rounded-full text-cream hover:bg-white/15" aria-label={backLabel ?? t('shell.back')}>
          <ChevronLeft size={22} strokeWidth={1.75} aria-hidden="true" />
        </Link>
        <div className="glass min-w-0 rounded-[14px] px-3 py-1.5">
          <p className="truncate text-[14px] font-semibold leading-tight text-cream sm:text-[15px]">{title}</p>
          {sub && <p className="truncate text-[12px] leading-tight text-cream/60">{sub}</p>}
        </div>
      </div>
      <div className="pointer-events-auto flex shrink-0 items-center gap-1.5">{right}</div>
    </div>
  )
}

export function RoundButton({ label, onClick, children, active, className }: { label: string; onClick: () => void; children: ReactNode; active?: boolean; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}
      className={cx('glass grid h-11 w-11 place-items-center rounded-full text-cream transition-colors hover:bg-white/15', active && 'bg-white/20', className)}>
      {children}
    </button>
  )
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('glass-strong rounded-[18px] text-cream', className)}>{children}</div>
}

/** A virtual stick (left thumb). Reports x right, y up, length <= 1. */
export function Stick({ onMove, label }: { onMove: (x: number, y: number) => void; label: string }) {
  const base = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const id = useRef<number | null>(null)
  const R = 46
  const update = (cx_: number, cy: number) => {
    const r = base.current!.getBoundingClientRect()
    let dx = cx_ - (r.left + r.width / 2), dy = cy - (r.top + r.height / 2)
    const m = Math.hypot(dx, dy)
    if (m > R) { dx = (dx / m) * R; dy = (dy / m) * R }
    setKnob({ x: dx, y: dy })
    const nx = dx / R, ny = -dy / R
    const mm = Math.hypot(nx, ny)
    onMove(mm < 0.15 ? 0 : nx, mm < 0.15 ? 0 : ny)
  }
  return (
    <div ref={base} role="application" aria-label={label}
      className="relative h-[128px] w-[128px] touch-none select-none rounded-full border border-white/20 bg-white/[0.07]"
      onPointerDown={(e) => { id.current = e.pointerId; (e.target as HTMLElement).setPointerCapture(e.pointerId); update(e.clientX, e.clientY) }}
      onPointerMove={(e) => { if (id.current === e.pointerId) update(e.clientX, e.clientY) }}
      onPointerUp={() => { id.current = null; setKnob({ x: 0, y: 0 }); onMove(0, 0) }}
      onPointerCancel={() => { id.current = null; setKnob({ x: 0, y: 0 }); onMove(0, 0) }}>
      <div className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full border border-white/30 bg-white/25 shadow-lg"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
    </div>
  )
}

/** A big round action button for touch play (holds report down/up). */
export function ActionButton({ label, onDown, onUp, tone = 'light', size = 64 }: { label: string; onDown: () => void; onUp?: () => void; tone?: 'light' | 'gold' | 'red'; size?: number }) {
  return (
    <button type="button" aria-label={label}
      className={cx('grid touch-none select-none place-items-center rounded-full border text-[12.5px] font-bold shadow-lg active:scale-95',
        tone === 'gold' ? 'border-sun-300 bg-sun-500 text-ink' : tone === 'red' ? 'border-clay-300 bg-clay-500 text-white' : 'border-white/30 bg-white/20 text-cream backdrop-blur')}
      style={{ width: size, height: size }}
      onPointerDown={(e) => { e.preventDefault(); onDown() }} onPointerUp={() => onUp?.()} onPointerCancel={() => onUp?.()}>
      {label}
    </button>
  )
}

export function isTouch() {
  return typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window)
}

/** Settings: sound, quality, subtitles (story). Quality takes effect on the next scene. */
export function SettingsSheet({ open, onClose, subtitles, extra }: { open: boolean; onClose: () => void; subtitles?: { size: 's' | 'm' | 'l'; on?: boolean; set: (v: { size: 's' | 'm' | 'l'; on?: boolean }) => void }; extra?: ReactNode }) {
  const { t } = useT('jeux')
  const [a, setA] = useState<AudioSettings>(loadAudio())
  const [q, setQ] = useState<Quality>(detectQuality())
  const upd = (n: AudioSettings) => { setA(n); saveAudio(n) }
  if (!open) return null
  return (
    <div className="absolute inset-0 z-40 grid place-items-end bg-black/40 sm:place-items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={t('settings.title')} onClick={(e) => e.stopPropagation()}
        className="glass-strong w-full max-w-md rounded-t-[22px] p-5 text-cream sm:rounded-[22px]" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 20px)' }}>
        <div className="flex items-center justify-between">
          <p className="text-[18px] font-semibold">{t('settings.title')}</p>
          <button type="button" className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/10" onClick={onClose} aria-label={t('settings.close')}><X size={20} strokeWidth={1.75} /></button>
        </div>
        <div className="mt-4 space-y-5">
          <div>
            <p className="text-[13px] font-semibold text-cream/70">{t('settings.sound')}</p>
            <div className="mt-2 flex items-center gap-3">
              <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/15" onClick={() => upd({ ...a, muted: !a.muted })} aria-label={t('settings.mute')} aria-pressed={a.muted}>
                {a.muted ? <VolumeX size={20} strokeWidth={1.75} /> : <Volume2 size={20} strokeWidth={1.75} />}
              </button>
              <input type="range" min={0} max={1} step={0.05} value={a.volume} onChange={(e) => upd({ ...a, volume: +e.target.value, muted: false })} aria-label={t('settings.volume')} className="h-11 w-full accent-[#F5B700]" />
            </div>
            <label className="mt-2 flex min-h-[44px] items-center justify-between gap-3 text-[15px]">
              {t('settings.ambience')}
              <input type="checkbox" checked={a.ambience} onChange={(e) => upd({ ...a, ambience: e.target.checked })} className="h-5 w-5 accent-[#0B5D3B]" />
            </label>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-cream/70">{t('settings.quality')}</p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {(Object.keys(QUALITY) as Quality[]).map((k) => (
                <button key={k} type="button" onClick={() => { setQ(k); try { localStorage.setItem('ndamba.jeux.quality', k) } catch { /* private */ } sfx('tap') }}
                  className={cx('min-h-[44px] rounded-[12px] px-2 text-[14px] font-semibold', q === k ? 'bg-cream text-ink' : 'bg-white/10 text-cream hover:bg-white/15')} aria-pressed={q === k}>
                  {t(`settings.qualities.${k}`)}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[12.5px] text-cream/55">{t('settings.qualityHint')}</p>
          </div>
          {subtitles && (
            <div>
              {subtitles.on !== undefined && <label className="flex min-h-[44px] items-center justify-between gap-3 text-[15px]">
                {t('settings.subtitles')}
                <input type="checkbox" checked={subtitles.on} onChange={(e) => subtitles.set({ ...subtitles, on: e.target.checked })} className="h-5 w-5 accent-[#0B5D3B]" />
              </label>}
              <p className="mt-1 text-[13px] font-semibold text-cream/70">{t('settings.subtitleSize')}</p>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {(['s', 'm', 'l'] as const).map((k) => (
                  <button key={k} type="button" onClick={() => subtitles.set({ ...subtitles, size: k })}
                    className={cx('min-h-[44px] rounded-[12px] text-[14px] font-semibold', subtitles.size === k ? 'bg-cream text-ink' : 'bg-white/10 hover:bg-white/15')} aria-pressed={subtitles.size === k}>
                    {t(`settings.sizes.${k}`)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {extra}
        </div>
      </div>
    </div>
  )
}

export function NoWebGL() {
  const { t } = useT('jeux')
  return (
    <div className="grid h-full place-items-center p-6 text-center">
      <div className="max-w-sm">
        <p className="text-[20px] font-semibold">{t('shell.webglTitle')}</p>
        <p className="mt-2 text-[15px] text-cream/70">{t('shell.webglBody')}</p>
      </div>
    </div>
  )
}

export function Spinner({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 z-10 grid place-items-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-white/15 border-t-sun-500" />
        <p className="text-[14px] text-cream/70">{label}</p>
      </div>
    </div>
  )
}
