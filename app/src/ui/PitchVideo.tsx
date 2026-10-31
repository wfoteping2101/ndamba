// The pitch diagrams played as short films. The engine (lib/pitchmotion.mjs) also renders the MP4s
// of public/video/ (tools/render_videos.mjs): what the app plays live is what the video files show.
//   <PitchVideo>       the full player: controls, step captions, step list, full screen, download
//   <PitchVideoThumb>  a card's preview: the finished move, plays on hover or with its button
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import { Download, Maximize2, Minimize2, Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { buildMotion, drawMotion, hasMotion, motionSteps, type Motion, type MotionStep } from '../lib/pitchmotion.mjs'
import { diagramLabel } from '../lib/diagramLang'
import type { DiagramSpec } from '../lib/types'
import { useT } from '../i18n'
import { cx } from '../lib/util'

const FONT = "'Archivo Variable', Archivo, Inter, 'Helvetica Neue', Arial, sans-serif"
const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const finePointer = () => typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches
const clock = (s: number) => { const v = Math.max(0, Math.round(s)); return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` }

/** The film of a diagram, or null when it has nothing that moves. */
export function useMotion(spec?: DiagramSpec | null): Motion | null {
  return useMemo(() => {
    if (!spec || !hasMotion(spec)) return null
    try { return buildMotion(spec) } catch { return null }
  }, [spec])
}

/** A canvas that fills its box and draws the frame at time t (sharp on high density screens). */
function useFrameCanvas(m: Motion | null, lang: string) {
  const boxRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const size = useRef({ w: 0, h: 0, dpr: 1 })
  const tRef = useRef(m ? m.duration : 0)
  const draw = useCallback((t?: number) => {
    if (t !== undefined) tRef.current = t
    const c = canvasRef.current
    const { w, h, dpr } = size.current
    if (!c || !m || !w || !h) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawMotion(ctx, m, tRef.current, { width: w, height: h, font: FONT, lang: lang === 'en' ? 'en' : 'fr', labelText: (s) => diagramLabel(s, lang) })
  }, [m, lang])
  const drawRef = useRef(draw)
  drawRef.current = draw
  useEffect(() => {
    const box = boxRef.current, c = canvasRef.current
    if (!box || !c) return
    const fit = () => {
      const r = box.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = Math.round(r.width), h = Math.round(r.height)
      if (!w || !h || (w === size.current.w && h === size.current.h && dpr === size.current.dpr)) return
      size.current = { w, h, dpr }
      c.width = Math.round(w * dpr)
      c.height = Math.round(h * dpr)
      drawRef.current()
    }
    fit()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null
    ro?.observe(box)
    document.fonts?.ready.then(() => drawRef.current())
    return () => ro?.disconnect()
  }, [])
  useEffect(() => { draw() }, [draw])
  return { boxRef, canvasRef, tRef, draw }
}

/** Play, pause, seek and "play this step only". Time lives in a ref; t is the copy the controls show. */
function usePlayback(m: Motion | null, draw: (t?: number) => void, tRef: { current: number }, loop: boolean) {
  const [playing, setPlaying] = useState(false)
  const [t, setT] = useState(m ? m.duration : 0)
  const [speed, setSpeed] = useState(1)
  const until = useRef<number | null>(null)
  const drawRef = useRef(draw)
  drawRef.current = draw
  // a new diagram (the progression, another drill): back to its finished move
  useEffect(() => {
    if (!m) return
    tRef.current = m.duration
    until.current = null
    setT(m.duration)
    setPlaying(false)
    drawRef.current(m.duration)
  }, [m]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!playing || !m) return
    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      let nt = tRef.current + dt * speed
      if (until.current !== null && nt >= until.current) {
        nt = until.current
        until.current = null
        drawRef.current(nt); setT(nt); setPlaying(false)
        return
      }
      if (nt >= m.duration) {
        if (!loop) { drawRef.current(m.duration); setT(m.duration); setPlaying(false); return }
        nt = 0
      }
      drawRef.current(nt)
      setT(nt)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [playing, speed, loop, m]) // eslint-disable-line react-hooks/exhaustive-deps
  const seek = useCallback((v: number) => { tRef.current = v; drawRef.current(v); setT(v) }, [tRef])
  const play = useCallback(() => {
    if (!m) return
    if (tRef.current >= m.duration - 0.03) seek(0)
    until.current = null
    setPlaying(true)
  }, [m, seek, tRef])
  const pause = useCallback(() => { until.current = null; setPlaying(false) }, [])
  const playRange = useCallback((a: number, b: number) => { seek(Math.max(0, a)); until.current = b; setPlaying(true) }, [seek])
  return { playing, t, speed, setSpeed, play, pause, seek, playRange, toggle: () => (playing ? pause() : play()) }
}

function captionAt(steps: MotionStep[], m: Motion, t: number) {
  if (!steps.length) return null
  if (t < steps[0].t0 - 0.05) return { n: null as number | null, key: 'start' }
  if (t >= m.end + 0.6) return { n: null as number | null, key: 'whole' }
  const cur = [...steps].reverse().find((s) => t >= s.t0 - 0.05)
  return cur ? { n: cur.n, text: cur.text, key: '' } : null
}

/** Mounts its children only once the box comes near the screen: long lists stay light on phones. */
function NearScreen({ children, className, placeholder }: { children: ReactNode; className?: string; placeholder?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || show) return
    if (typeof IntersectionObserver === 'undefined') { setShow(true); return }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setShow(true); io.disconnect() } }, { rootMargin: '300px' })
    io.observe(el)
    return () => io.disconnect()
  }, [show])
  return <div ref={ref} className={className}>{show ? children : placeholder}</div>
}

/* ------------------------------------------------------------------ the full player */

export function PitchVideo({ spec, title, videoKey, autoPlay = false, steps: showSteps = true, className }: {
  spec?: DiagramSpec | null
  title?: string
  /** name of the MP4 in public/video/<lang>/ (for the download button), e.g. "C01-1" */
  videoKey?: string
  autoPlay?: boolean
  steps?: boolean
  className?: string
}) {
  const { t: tr, lang } = useT('video')
  const m = useMotion(spec)
  const { boxRef, canvasRef, tRef, draw } = useFrameCanvas(m, lang)
  const pb = usePlayback(m, draw, tRef, true)
  const steps = useMemo(() => (m ? motionSteps(m, lang === 'en' ? 'en' : 'fr') : []), [m, lang])
  const shellRef = useRef<HTMLDivElement>(null)
  const [full, setFull] = useState(false)
  // a step chosen in the list keeps its caption while it plays alone (even when the next one starts with it)
  const [focus, setFocus] = useState<number | null>(null)
  useEffect(() => { setFocus(null) }, [m])

  useEffect(() => {
    const f = () => setFull(!!shellRef.current && document.fullscreenElement === shellRef.current)
    document.addEventListener('fullscreenchange', f)
    return () => document.removeEventListener('fullscreenchange', f)
  }, [])
  // autoplay once the player is on screen (never with "reduce motion")
  const autoDone = useRef(false)
  useEffect(() => {
    autoDone.current = false
    if (!autoPlay || !m || reducedMotion()) return
    const el = shellRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting) && !autoDone.current) { autoDone.current = true; pb.seek(0); pb.play() }
    }, { threshold: 0.5 })
    io.observe(el)
    return () => io.disconnect()
  }, [m, autoPlay]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!m) return null
  const focused = focus !== null ? steps[focus] : undefined
  const cap = focused ? { n: focused.n, text: focused.text, key: '' } : captionAt(steps, m, pb.t)
  // the step on screen: the chosen one, or the last one that has started, until the move is over
  let stepIdx = focus ?? -1
  if (focus === null && cap && cap.n !== null) steps.forEach((s, i) => { if (pb.t >= s.t0 - 0.05) stepIdx = i })
  const goStep = (i: number) => { const s = steps[i]; if (s) { pb.playRange(s.t0 - 0.05, Math.min(m.duration, s.t1 + 0.3)); setFocus(i) } }
  const free = (fn: () => void) => () => { setFocus(null); fn() }
  const afterEnd = pb.t >= m.end + 0.6
  const nextIdx = stepIdx >= 0 ? (stepIdx + 1 < steps.length ? stepIdx + 1 : 0) : 0
  const prevIdx = stepIdx > 0 ? stepIdx - 1 : afterEnd ? steps.length - 1 : 0
  const toggleFull = () => {
    const el = shellRef.current
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen?.()
    else el.requestFullscreen?.().catch(() => { /* not allowed here */ })
  }
  const ctrl = 'grid h-10 w-10 shrink-0 place-items-center rounded-full text-cream/90 transition hover:bg-white/10 hover:text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-sun-300'
  const atPoster = !pb.playing && pb.t >= m.duration - 0.03

  return (
    <figure className={cx('m-0', className)}>
      <div ref={shellRef} className={cx('relative overflow-hidden rounded-[12px] bg-night-900', full && 'flex h-full flex-col justify-center rounded-none')}>
        <div ref={boxRef} className={cx('relative w-full select-none', full ? 'mx-auto aspect-video max-h-[calc(100vh-56px)] max-w-[calc((100vh-56px)*16/9)]' : 'aspect-video')}
          onClick={free(pb.toggle)}>
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" role="img"
            aria-label={title ? tr('label', { title }) : tr('labelPlain')} />
          {cap && (
            <div className="pointer-events-none absolute inset-x-2 bottom-2 flex sm:inset-x-3 sm:bottom-3" aria-live="polite">
              <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-night-900/80 py-1 pl-1.5 pr-3 text-[13px] font-semibold leading-tight text-cream backdrop-blur-sm sm:text-[15px]">
                {cap.n !== null
                  ? <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-cream text-[12.5px] font-extrabold tabular-nums text-ink">{cap.n}</span>
                  : <span className="ml-1.5" />}
                <span className="truncate">{cap.key ? tr(cap.key) : cap.text}</span>
              </span>
            </div>
          )}
          {!pb.playing && (
            <button type="button" onClick={(e) => { e.stopPropagation(); setFocus(null); pb.play() }}
              className={cx('absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-night-900/75 text-cream shadow-lift ring-1 ring-white/25 backdrop-blur-sm transition hover:scale-105 hover:bg-night-900/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sun-300',
                atPoster ? 'h-16 w-16 sm:h-20 sm:w-20' : 'h-14 w-14')}
              aria-label={atPoster ? tr('play') : tr('resume')}>
              <Play size={atPoster ? 30 : 24} fill="currentColor" className="translate-x-[2px]" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-0.5 bg-night-900 px-1.5 py-1 text-cream sm:gap-1 sm:px-2">
          <button type="button" className={ctrl} onClick={free(pb.toggle)} aria-label={pb.playing ? tr('pause') : tr('play')}>
            {pb.playing ? <Pause size={18} fill="currentColor" aria-hidden="true" /> : <Play size={18} fill="currentColor" className="translate-x-[1px]" aria-hidden="true" />}
          </button>
          <button type="button" className={cx(ctrl, 'max-[380px]:hidden')} onClick={() => goStep(prevIdx)} aria-label={tr('prevStep')} disabled={!steps.length}>
            <SkipBack size={16} aria-hidden="true" />
          </button>
          <button type="button" className={cx(ctrl, 'max-[380px]:hidden')} onClick={() => goStep(nextIdx)} aria-label={tr('nextStep')} disabled={!steps.length}>
            <SkipForward size={16} aria-hidden="true" />
          </button>
          <div className="relative mx-1.5 flex h-10 min-w-0 flex-1 items-center">
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/15" aria-hidden="true">
              <div className="h-full rounded-full bg-sun-500" style={{ width: `${(pb.t / m.duration) * 100}%` }} />
              {steps.filter((s) => !s.sub).map((s) => (
                <span key={`${s.n}-${s.t0}`} className="absolute top-1/2 h-2.5 w-[3px] -translate-y-1/2 rounded-full bg-cream/70" style={{ left: `${(s.t0 / m.duration) * 100}%` }} />
              ))}
            </div>
            <input type="range" min={0} max={m.duration} step={0.01} value={pb.t}
              onChange={(e) => { setFocus(null); pb.seek(Number(e.target.value)) }}
              aria-label={tr('seek')} aria-valuetext={`${clock(pb.t)} / ${clock(m.duration)}`}
              className="relative h-10 w-full cursor-pointer appearance-none bg-transparent accent-sun-500 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-cream [&::-moz-range-track]:bg-transparent [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cream" />
          </div>
          <span className="hidden shrink-0 px-1 text-[12.5px] font-medium tabular-nums text-cream/75 sm:inline">{clock(pb.t)} / {clock(m.duration)}</span>
          <button type="button" className={cx(ctrl, 'w-auto min-w-10 px-2 text-[12.5px] font-bold tabular-nums')} onClick={() => pb.setSpeed(pb.speed === 1 ? 0.5 : 1)}
            aria-label={tr('speed', { speed: pb.speed === 1 ? tr('normal') : tr('slow') })} aria-pressed={pb.speed !== 1}>
            {pb.speed === 1 ? '1×' : tr('half')}
          </button>
          {videoKey && (
            <a className={cx(ctrl, 'max-[420px]:hidden')} href={`/video/${lang === 'en' ? 'en' : 'fr'}/${videoKey}.mp4`} download={`ndamba-${videoKey}-${lang}.mp4`}
              aria-label={tr('download')} title={tr('download')} onClick={(e) => e.stopPropagation()}>
              <Download size={17} aria-hidden="true" />
            </a>
          )}
          <button type="button" className={ctrl} onClick={toggleFull} aria-label={full ? tr('exitFull') : tr('full')}>
            {full ? <Minimize2 size={17} aria-hidden="true" /> : <Maximize2 size={17} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {showSteps && steps.length > 0 && (
        <figcaption className="mt-3">
          <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
            <span className="text-[13px] font-semibold text-ink-muted">{tr('steps')}</span>
            <span className="text-[12.5px] text-ink-faint">{tr('stepsHint')}</span>
          </div>
          <ol className="grid gap-1">
            {steps.map((s, i) => {
              const active = i === stepIdx && (focus !== null || pb.playing || pb.t < m.end)
              return (
                <li key={`${s.n}-${s.t0}`}>
                  <button type="button" onClick={() => goStep(i)} aria-current={active ? 'step' : undefined}
                    className={cx('flex min-h-[44px] w-full items-center gap-2.5 rounded-control px-2.5 py-1.5 text-left text-[14.5px] transition',
                      active ? 'bg-forest-50 text-ink ring-1 ring-forest-300' : 'text-ink-soft hover:bg-sand')}>
                    <span className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12.5px] font-extrabold tabular-nums',
                      active ? 'bg-forest-600 text-cream' : s.sub ? 'border border-line text-ink-faint' : 'bg-sand text-ink')}>{s.n}</span>
                    <span className="min-w-0 flex-1 font-medium">{s.text}</span>
                    <Play size={14} className={cx('shrink-0', active ? 'text-forest-600' : 'text-ink-faint')} aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ol>
        </figcaption>
      )}
    </figure>
  )
}

/* ------------------------------------------------------------------ the card preview */

/**
 * The finished move, like a video thumbnail. Plays from the start on hover (mouse) or with its button (touch),
 * loops while played, and comes back to the finished move afterwards.
 */
export function PitchVideoThumb({ spec, title, className, button = true }: { spec?: DiagramSpec | null; title?: string; className?: string; button?: boolean }) {
  return (
    <NearScreen className={cx('relative aspect-video w-full overflow-hidden bg-[#3E7A44]', className)}>
      <ThumbInner spec={spec} title={title} button={button} />
    </NearScreen>
  )
}

function ThumbInner({ spec, title, button }: { spec?: DiagramSpec | null; title?: string; button: boolean }) {
  const { t: tr, lang } = useT('video')
  const m = useMotion(spec)
  const { boxRef, canvasRef, tRef, draw } = useFrameCanvas(m, lang)
  const pb = usePlayback(m, draw, tRef, true)
  const byHover = useRef(false)
  // stop when it leaves the screen
  useEffect(() => {
    const el = boxRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver((es) => { if (!es.some((e) => e.isIntersecting)) { pb.pause(); if (m) pb.seek(m.duration) } })
    io.observe(el)
    return () => io.disconnect()
  }, [m]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!m) return null
  const onEnter = () => { if (!finePointer() || reducedMotion() || pb.playing) return; byHover.current = true; pb.seek(0); pb.play() }
  const onLeave = () => { if (!byHover.current) return; byHover.current = false; pb.pause(); pb.seek(m.duration) }
  const onButton = (e: ReactMouseEvent) => { e.preventDefault(); e.stopPropagation(); byHover.current = false; pb.toggle() }
  return (
    <div ref={boxRef} className="absolute inset-0" onPointerEnter={onEnter} onPointerLeave={onLeave}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" role="img" aria-label={title ? tr('label', { title }) : tr('labelPlain')} />
      {button && (
        <button type="button" onClick={onButton}
          className="absolute bottom-1.5 left-1.5 inline-flex min-h-[30px] items-center gap-1.5 rounded-full bg-night-900/80 py-1 pl-2 pr-2.5 text-[12px] font-semibold tabular-nums text-cream ring-1 ring-white/20 backdrop-blur-sm transition hover:bg-night-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sun-300"
          aria-label={pb.playing ? tr('pause') : title ? tr('playTitle', { title }) : tr('play')}>
          {pb.playing ? <Pause size={12} fill="currentColor" aria-hidden="true" /> : <Play size={12} fill="currentColor" aria-hidden="true" />}
          {clock(pb.playing ? m.duration - pb.t : m.duration)}
        </button>
      )}
    </div>
  )
}
