// The video session: the clips of a playlist, one after the other, full screen, for a dressing room TV
// or a phone. Each clip shows its title and note in large type; a clip with a drawing opens on it, held
// for three seconds. Space pauses, the arrows go to the previous or next clip, Échap goes back to the studio.
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, FileVideo, Maximize, Minimize, MonitorPlay, Pause, Play, RotateCcw, X } from 'lucide-react'
import { db } from '../../lib/db'
import { useDocumentTitle, useLiveQuery } from '../../lib/hooks'
import { useT } from '../../i18n'
import { cx } from '../../lib/util'
import type { Clip, Match, MatchEvent, Player, VideoProject } from '../../lib/types'
import { MolaDock } from '../../ui'
import { fileMedia, mountLinkPlayer, parseVideoLink, type MediaLike } from './components/videoSource'
import { cachedFile, rememberFile } from './components/editor/fileCache'
import { clipTitle, fmtT, mergeClips } from './components/editor/model'

const FREEZE = 3

export default function Presenter() {
  const { id = '' } = useParams()
  const { t } = useT('editor')
  const project = useLiveQuery<VideoProject | null | undefined>(async () => (await db.videos.get(id)) ?? null, [id], undefined)
  useDocumentTitle(t('show.docTitle'))
  if (project === undefined) return <Shell><div className="grid flex-1 place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-white/15 border-t-sun-300" /></div></Shell>
  if (project === null) return <Shell><Empty title={t('notFound')} to="/app/analyse/video" action={t('backList')} /></Shell>
  return <Show project={project} />
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div data-tour="presenter" className="fixed inset-0 z-[70] flex flex-col bg-black text-cream">
      <MolaDock hide />
      {children}
    </div>
  )
}

function Empty({ title, body, to, action }: { title: string; body?: string; to: string; action: string }) {
  return (
    <div className="grid flex-1 place-items-center p-6 text-center">
      <div className="max-w-md">
        <p className="font-display text-[24px] font-semibold">{title}</p>
        {body && <p className="mt-2 text-[15px] text-cream/70">{body}</p>}
        <Link to={to} className="btn-sun mt-5">{action}</Link>
      </div>
    </div>
  )
}

type Phase = 'cover' | 'freeze' | 'play' | 'end'

function Show({ project }: { project: VideoProject }) {
  const { t, lang } = useT('editor')
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const back = `/app/analyse/video/${project.id}?panneau=seances`
  const events = useLiveQuery(async () => (project.matchId ? db.events.where('matchId').equals(project.matchId).toArray() : [] as MatchEvent[]), [project.matchId], [] as MatchEvent[])
  const match = useLiveQuery<Match | undefined>(async () => (project.matchId ? db.matches.get(project.matchId) : undefined), [project.matchId], undefined)
  const teamId = match?.teamId ?? project.teamId
  const squad = useLiveQuery(async () => (teamId ? db.players.where('teamId').equals(teamId).toArray() : [] as Player[]), [teamId], [] as Player[])
  const players = useMemo(() => new Map(squad.map((p) => [p.id, p])), [squad])
  const evById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events])
  const all = useMemo(() => new Map(mergeClips(project, events).map((c) => [c.id, c])), [project, events])
  const playlist = (project.playlists ?? []).find((p) => p.id === params.get('p')) ?? project.playlists?.[0]
  const clips = useMemo(() => (playlist?.clipIds ?? []).map((cid) => all.get(cid)).filter((c): c is Clip => !!c), [playlist, all])
  const titleOf = (c: Clip) => clipTitle(t, c, evById, players, match?.halfMinutes ?? 45)

  /* ---- the source ---- */
  const link = useMemo(() => (project.url && (project.source === 'youtube' || project.source === 'facebook') ? parseVideoLink(project.url) : null), [project.url, project.source])
  const hosted = project.source === 'hosted' && !!project.url
  const [file, setFile] = useState(() => cachedFile(project.id))
  const src = hosted ? project.url! : !link ? file?.url ?? null : null
  const video = useRef<HTMLVideoElement>(null)
  const host = useRef<HTMLDivElement>(null)
  const media = useRef<MediaLike | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [ready, setReady] = useState(false)
  const [linkError, setLinkError] = useState(false)

  /* ---- the show ---- */
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('cover')
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0) // of the current clip, 0 to 1
  const [freezeLeft, setFreezeLeft] = useState(FREEZE)
  const freezeRef = useRef(FREEZE)
  const [full, setFull] = useState(false)
  const clip = clips[idx]
  const live = useRef({ idx, phase, paused, clip, n: clips.length })
  live.current = { idx, phase, paused, clip, n: clips.length }

  useDocumentTitle(playlist ? `${playlist.title}, ${t('show.docTitle')}` : t('show.docTitle'))

  // the player
  useEffect(() => {
    if (!link || !host.current) return
    const m = mountLinkPlayer(host.current, link, lang, { onReady: () => setReady(true), onPlay: () => setPaused(false), onPause: () => undefined, onError: () => setLinkError(true) })
    media.current = m
    return () => { m.destroy?.(); media.current = null }
  }, [link?.url]) // eslint-disable-line react-hooks/exhaustive-deps

  const startClip = useCallback((i: number) => {
    const c = clips[i]
    if (!c) return
    setIdx(i); setProgress(0); setPaused(false)
    const m = media.current
    if (m) { m.pause(); m.currentTime = c.start }
    if (c.drawing) { freezeRef.current = FREEZE; setFreezeLeft(FREEZE); setPhase('freeze') }
    else { setPhase('play'); m?.play().catch(() => setPaused(true)) }
  }, [clips])
  const next = useCallback(() => {
    const L = live.current
    if (L.idx < L.n - 1) startClip(L.idx + 1)
    else { media.current?.pause(); setPhase('end') }
  }, [startClip])
  const prev = useCallback(() => {
    const L = live.current, m = media.current
    if (L.phase === 'play' && L.clip && m && m.currentTime - L.clip.start > 2.5) { startClip(L.idx); return }
    startClip(Math.max(0, L.idx - 1))
  }, [startClip])
  const togglePause = useCallback(() => {
    const L = live.current, m = media.current
    if (L.phase === 'cover') { startClip(0); return }
    if (L.phase === 'end') { startClip(0); return }
    if (L.phase === 'freeze') { setPaused((p) => !p); return }
    if (!m) return
    if (m.paused) { m.play().catch(() => undefined); setPaused(false) } else { m.pause(); setPaused(true) }
  }, [startClip])

  // the freeze on the drawing, then the clip
  useEffect(() => {
    if (phase !== 'freeze' || paused) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      freezeRef.current -= (now - last) / 1000; last = now
      if (freezeRef.current <= 0) { setFreezeLeft(0); setPhase('play'); media.current?.play().catch(() => setPaused(true)); return }
      setFreezeLeft(freezeRef.current)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, paused])

  // the clip plays until its end, then the next one
  useEffect(() => {
    if (phase !== 'play') return
    let raf = 0
    const tick = () => {
      const m = media.current, c = live.current.clip
      if (m && c) {
        const now = m.currentTime
        setProgress(Math.max(0, Math.min(1, (now - c.start) / Math.max(0.1, c.end - c.start))))
        if (now >= c.end - 0.05) { next(); return }
        if (link && !m.paused && live.current.paused) setPaused(false)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, next, link])

  // a link player gets ready after the first clip was asked: start it then
  useEffect(() => { if (ready && link && phase === 'play' && clip) { const m = media.current; if (m) { m.currentTime = clip.start; m.play().catch(() => undefined) } } }, [ready]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleFull = useCallback(() => {
    const el = document.documentElement
    if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => undefined)
    else document.exitFullscreen?.().catch(() => undefined)
  }, [])
  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', on)
    return () => { document.removeEventListener('fullscreenchange', on); if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined) }
  }, [])

  // keyboard: space, arrows, Escape, F
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.code === 'Space' || (e.key === 'Enter' && live.current.phase === 'cover')) { e.preventDefault(); togglePause(); return }
      if (e.key === 'ArrowRight') { e.preventDefault(); if (live.current.phase !== 'cover') next(); return }
      if (e.key === 'ArrowLeft') { e.preventDefault(); if (live.current.phase !== 'cover') prev(); return }
      if (e.key === 'Escape') { if (!document.fullscreenElement) navigate(back); return }
      if (e.key.toLowerCase() === 'f') toggleFull()
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [togglePause, next, prev, navigate, back, toggleFull])

  const onPick = (e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) setFile(rememberFile(project.id, f)); e.target.value = '' }

  if (!playlist || clips.length === 0) return <Shell><Empty title={t('show.empty')} body={t('show.emptyBody')} to={back} action={t('show.back')} /></Shell>

  const total = clips.reduce((n, c) => n + (c.end - c.start), 0)
  const needFile = !link && !hosted && !src
  const who = (c: Clip) => (c.playerIds ?? []).map((pid) => players.get(pid)).filter((p): p is Player => !!p)

  return (
    <Shell>
      {/* top bar */}
      <div className="flex h-14 shrink-0 items-center gap-2 px-3 sm:h-16 sm:px-5">
        <button type="button" onClick={() => navigate(back)} aria-label={t('show.exit')} title={t('show.exit')} className="grid h-11 w-11 place-items-center rounded-xl text-cream/85 hover:bg-white/10"><X size={22} /></button>
        <p className="min-w-0 flex-1 truncate text-[14px] font-semibold text-cream/80 sm:text-[16px]">{playlist.title}</p>
        {phase !== 'cover' && <span className="rounded-full bg-white/10 px-3 py-1 font-display text-[15px] font-semibold tabular-nums sm:text-[18px]" aria-live="polite">{t('show.progress', { i: Math.min(idx + 1, clips.length), n: clips.length })}</span>}
        <button type="button" onClick={toggleFull} aria-label={t(full ? 'show.exitFull' : 'show.full')} title={t(full ? 'show.exitFull' : 'show.full')} className="grid h-11 w-11 place-items-center rounded-xl text-cream/85 hover:bg-white/10">{full ? <Minimize size={20} /> : <Maximize size={20} />}</button>
      </div>

      {/* the picture */}
      <div className="relative min-h-0 flex-1 bg-black">
        {link ? <div ref={host} className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full [&>div]:h-full" />
          : src ? <video ref={video} src={src} crossOrigin="anonymous" playsInline preload="auto" className="absolute inset-0 h-full w-full object-contain"
            onLoadedMetadata={() => { if (video.current) { media.current = fileMedia(video.current); setReady(true) } }}
            onPlay={() => setPaused(false)} onClick={togglePause} /> : null}
        {needFile && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div className="max-w-md">
              <FileVideo size={30} className="mx-auto text-sun-300" />
              <p className="mt-3 font-display text-[20px] font-semibold">{t('show.needFile', { name: project.fileName ?? '' })}</p>
              <p className="mt-1 text-[14px] text-cream/65">{t('show.needFileBody')}</p>
              <button type="button" className="btn-sun mt-4" onClick={() => fileInput.current?.click()}><FileVideo size={17} />{t('file.choose')}</button>
              <input ref={fileInput} type="file" accept="video/*" className="sr-only" onChange={onPick} tabIndex={-1} aria-hidden="true" />
            </div>
          </div>
        )}
        {linkError && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-night-900 p-6 text-center">
            <div className="max-w-md">
              <p className="font-display text-[20px] font-semibold">{t('link.error')}</p>
              <p className="mt-1 text-[14px] text-cream/70">{t('link.errorBody')}</p>
              <Link to={back} className="btn-sun mt-4">{t('show.back')}</Link>
            </div>
          </div>
        )}
        {phase === 'freeze' && clip?.drawing && (
          <div className="absolute inset-0 bg-black">
            <img src={clip.drawing} alt={t('show.drawingAlt', { name: titleOf(clip) })} className="h-full w-full object-contain" />
            <div className="absolute inset-x-0 bottom-0 h-1.5 bg-white/10"><div className="h-full bg-sun-500" style={{ width: `${(1 - freezeLeft / FREEZE) * 100}%` }} /></div>
          </div>
        )}
        {phase === 'cover' && !needFile && (
          <div className="absolute inset-0 grid place-items-center bg-night-900/95 p-6">
            <div className="w-full max-w-3xl">
              <p className="text-[clamp(13px,1.4vw,18px)] font-semibold text-sun-300">{t('show.cover', { n: clips.length, d: fmtT(total) })}</p>
              <h1 className="mt-2 text-[clamp(28px,4.4vw,64px)] font-semibold leading-[1.05] text-cream">{playlist.title}</h1>
              {playlist.note && <p className="mt-4 max-w-2xl text-[clamp(15px,1.7vw,24px)] leading-relaxed text-cream/80">{playlist.note}</p>}
              <button type="button" autoFocus onClick={() => startClip(0)} className="btn-sun btn-lg mt-7 text-[clamp(16px,1.4vw,20px)]"><MonitorPlay size={20} />{t('show.start')}</button>
              <p className="mt-4 hidden text-[13px] text-cream/50 sm:block">{t('show.keys')}</p>
            </div>
          </div>
        )}
        {phase === 'end' && (
          <div className="absolute inset-0 grid place-items-center bg-night-900/95 p-6 text-center">
            <div>
              <h2 className="text-[clamp(26px,3.6vw,52px)] font-semibold text-cream">{t('show.end')}</h2>
              <p className="mt-2 text-[clamp(14px,1.4vw,20px)] text-cream/70">{t('show.endBody', { n: clips.length })}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button type="button" className="btn-sun btn-lg" onClick={() => startClip(0)}><RotateCcw size={18} />{t('show.again')}</button>
                <Link to={back} className="btn-lg btn border border-white/25 text-cream hover:bg-white/10">{t('show.back')}</Link>
              </div>
            </div>
          </div>
        )}
        {paused && (phase === 'play' || phase === 'freeze') && (
          <button type="button" onClick={togglePause} aria-label={t('show.play')} className="absolute left-1/2 top-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-cream ring-1 ring-white/20"><Play size={34} fill="currentColor" /></button>
        )}
      </div>

      {/* the clip: title, note, players, controls */}
      {clip && phase !== 'cover' && (
        <div className="shrink-0 border-t border-white/10 bg-night-900 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-8 sm:pt-4">
          <div className="flex gap-1" aria-hidden="true">
            {clips.map((c, i) => (
              <div key={c.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-sun-500" style={{ width: `${i < idx || phase === 'end' ? 100 : i === idx ? (phase === 'freeze' ? 0 : progress * 100) : 0}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end">
            <div key={clip.id} className="min-w-0 flex-1">
              <h2 className="text-[clamp(20px,2.8vw,44px)] font-semibold leading-[1.1] text-cream">{titleOf(clip)}</h2>
              {clip.note && <p className="mt-1.5 max-w-4xl text-[clamp(14px,1.6vw,24px)] leading-snug text-cream/80">{clip.note}</p>}
              {who(clip).length > 0 && (
                <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[clamp(13px,1.2vw,18px)] font-semibold text-sun-300">
                  {who(clip).map((p) => <span key={p.id}>{p.number != null ? `${p.number}. ` : ''}{p.name}</span>)}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center justify-center gap-2">
              <button type="button" onClick={prev} disabled={idx === 0 && phase !== 'play'} aria-label={t('show.prev')} title={t('show.prev')} className="grid h-14 w-14 place-items-center rounded-full bg-white/10 text-cream hover:bg-white/15 disabled:opacity-35"><ChevronLeft size={26} /></button>
              <button type="button" onClick={togglePause} aria-label={paused || phase === 'end' ? t('show.play') : t('show.pause')} title={paused ? t('show.play') : t('show.pause')} className="grid h-16 w-16 place-items-center rounded-full bg-cream text-ink">{paused || phase === 'end' ? <Play size={28} fill="currentColor" /> : <Pause size={28} fill="currentColor" />}</button>
              <button type="button" onClick={next} disabled={phase === 'end'} aria-label={t('show.next')} title={t('show.next')} className="grid h-14 w-14 place-items-center rounded-full bg-white/10 text-cream hover:bg-white/15 disabled:opacity-35"><ChevronRight size={26} /></button>
            </div>
          </div>
          {phase === 'freeze' && <p className={cx('mt-2 text-[13px] font-semibold text-sun-300')}>{t('show.freeze')}</p>}
        </div>
      )}
    </Shell>
  )
}
