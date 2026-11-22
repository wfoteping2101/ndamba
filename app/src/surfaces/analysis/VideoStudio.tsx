// The video editor: where a match is coded, cut into clips and prepared for the players.
// The video lives on this device (file), on Ndamba (hosted), or on YouTube or Facebook (link, official player).
// For a match, the coded actions ARE the match's events (with their video time, place and players): the report
// and the season use them. Clips and sessions (playlists) belong to the project.
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, ArrowLeft, Camera, ChevronDown, X, ChartLine, ChevronLeft, ChevronRight, Cloud, Download, FileVideo, Flag, Gauge, Keyboard, Link2, Locate, Maximize2, MonitorPlay, Pause, PenLine, Pencil, Play, Redo2, RotateCcw, Scissors, Trash2, Undo2, Upload, ZoomIn, ZoomOut,
} from 'lucide-react'
import { db } from '../../lib/db'
import { useDocumentTitle, useLiveQuery } from '../../lib/hooks'
import { useT } from '../../i18n'
import { BRAND } from '../../lib/config'
import { useSession } from '../../lib/session'
import { cx, download, fmtDate, nowISO, uid } from '../../lib/util'
import type { Clip, EventCode, Match, MatchEvent, Player, Playlist, VideoProject, VideoTag } from '../../lib/types'
import { computeNjangi, fmtNjangi, njangiLabel } from '../../lib/njangi'
import { EmptyState, Modal, MolaDock } from '../../ui'
import { SubBars } from './components/charts'
import { defFor, isTyping, tagFromKey, type TagDef } from './components/codes'
import { copyText, slug, useMedia } from './components/data'
import { fileMedia, mountLinkPlayer, parseVideoLink, type MediaLike } from './components/videoSource'
import { SourcePicker, sourceValid, type SourceValue } from './components/SourcePicker'
import { AiPanel } from './components/AiPanel'
import { createTimeStore, useTime, type TimeStore } from './components/editor/clock'
import { cachedFile, rememberFile } from './components/editor/fileCache'
import {
  autoClipTitle, autoClips, clipTitle, fmtT, isChild, isNativeSource, labelKey, mergeClips, momentLink, rosterAt, sameAuto, segmentsLength, setFromKey, usefulSegments,
  getPref, setPref, type Coded, type SetDef, type TagX,
} from './components/editor/model'
import { NO_ZOOM, snapshotView, zoomAt, type View } from './components/editor/draw'
import { Stage, useDrawState } from './components/editor/Stage'
import { DrawBar } from './components/editor/DrawBar'
import { Timeline, type Draft } from './components/editor/Timeline'
import { CodePad, CodedList } from './components/editor/CodePad'
import { PlacePanel } from './components/editor/PlacePanel'
import { ClipEditor, ClipList, type ClipDraft } from './components/editor/ClipsPanel'
import { PlaylistsPanel } from './components/editor/PlaylistsPanel'
import { AddToPlaylist, ClipPicker, ExportDialog, ShortcutsSheet } from './components/editor/Dialogs'
import { canExport } from './components/editor/exportClip'
import { AiMark } from './components/editor/AiMark'
import { LIVE_BLOBS } from '../gear/hosting'

const FRAME = 1 / 25
const LOSS_WINDOW = 5
type Tab = 'coder' | 'clips' | 'seances' | 'ia'
const TABS: Tab[] = ['coder', 'clips', 'seances', 'ia']

/** Goals of one side coded for a match (live or on the video). */
const codedGoals = (matchId: string, side: 'us' | 'them') => db.events.where('matchId').equals(matchId).filter((e) => e.code === 'GOAL' && e.side === side).count()

/** Video time to match time: the half, and the seconds since its kick-off. */
export function toMatchTime(videoT: number, k1 = 0, k2?: number): { half: 1 | 2; t: number } {
  if (k2 != null && videoT >= k2) return { half: 2, t: Math.round((videoT - k2) * 10) / 10 }
  return { half: 1, t: Math.max(0, Math.round((videoT - k1) * 10) / 10) }
}

export default function VideoStudio() {
  const { id = '' } = useParams()
  const { t } = useT('editor')
  const project = useLiveQuery<VideoProject | null | undefined>(async () => (await db.videos.get(id)) ?? null, [id], undefined)
  useDocumentTitle(project?.title || t('title'))
  if (project === undefined) return <div className="grid min-h-[50vh] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-forest-100 border-t-forest-600" /></div>
  if (project === null) return <EmptyState icon={<FileVideo size={32} />} title={t('notFound')} body={t('notFoundBody')} action={<Link to="/app/analyse/video" className="btn-primary">{t('backList')}</Link>} />
  return <Studio key={project.id} project={project} />
}

/* ================================================================== the editor */

function Studio({ project }: { project: VideoProject }) {
  const { t, lang } = useT('editor')
  const [params, setParams] = useSearchParams()
  const wide = useMedia('(min-width: 1024px)')
  const { team } = useSession()
  const video = useRef<HTMLVideoElement>(null)
  const host = useRef<HTMLDivElement>(null)
  const media = useRef<MediaLike | null>(null)
  const time = useMemo(() => createTimeStore(0), [])
  const fileInput = useRef<HTMLInputElement>(null)
  const camInput = useRef<HTMLInputElement>(null)
  const noteInput = useRef<HTMLInputElement>(null)

  /* ---- where the video is ---- */
  const link = useMemo(() => (project.url && (project.source === 'youtube' || project.source === 'facebook') ? parseVideoLink(project.url) : null), [project.url, project.source])
  const isLink = !!link
  // a demonstration upload plays from an object URL of this page session only: after a reload, reopen the file
  const deadDemo = project.source === 'hosted' && !!project.url?.startsWith('blob:') && !LIVE_BLOBS.has(project.url)
  const hosted = project.source === 'hosted' && !!project.url && !deadDemo
  const native = !isLink
  // a file just filmed or picked on another page arrives with the navigation (filming page): open it directly
  const location = useLocation()
  const [file, setFile] = useState(() => {
    const sent = (location.state as { file?: unknown } | null)?.file
    const cached = cachedFile(project.id)
    if (sent instanceof File && (!cached || cached.name !== sent.name)) return rememberFile(project.id, sent)
    return cached
  })
  useEffect(() => {
    const sent = (location.state as { file?: unknown } | null)?.file
    if (sent instanceof File && project.source !== 'hosted' && !project.fileName) db.videos.update(project.id, { fileName: sent.name, source: project.source === 'youtube' || project.source === 'facebook' ? project.source : 'file' })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const src = hosted ? project.url! : !isLink ? file?.url ?? null : null
  const aiSrc = hosted ? project.url! : file?.url ?? null

  /* ---- player state ---- */
  const [ready, setReady] = useState(false)
  const [linkError, setLinkError] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [dur, setDur] = useState(project.duration ?? 0)
  const [rate, setRate] = useState(1)
  const [view, setView] = useState<View>(NO_ZOOM)
  const [drawing, setDrawing] = useState(false)
  const draw = useDrawState()
  const stopAt = useRef<number | null>(null)
  /** what happens when a played range ends: true when it carried on (the next moment of a list) */
  const onRangeEnd = useRef<() => boolean>(() => false)
  const hasMedia = ready && (isLink || !!src)

  /* ---- editor state ---- */
  const tabParam = params.get('panneau') as Tab | null
  const tab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : 'coder'
  const setTab = useCallback((v: Tab) => setParams((p) => { const n = new URLSearchParams(p); n.set('panneau', v); return n }, { replace: true }), [setParams])
  const [selCoded, setSelCoded] = useState<string | null>(null)
  const [selClip, setSelClip] = useState<string | null>(null)
  const [draft, setDraft] = useState<(ClipDraft & { drawing?: string }) | null>(null)
  const [placeMode, setPlaceModeState] = useState(() => getPref('place'))
  const [placeId, setPlaceId] = useState<string | null>(null)
  const [useful, setUseful] = useState(false)
  const [note, setNote] = useState('')
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null)
  const [preview, setPreview] = useState<Coded | null>(null)
  const [changing, setChanging] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const [exporting, setExporting] = useState<Clip | null>(null)
  const [exportMenu, setExportMenu] = useState(false)
  const [addTo, setAddTo] = useState<Clip | null>(null)
  const [picking, setPicking] = useState<string | null>(null)
  const [openPl, setOpenPl] = useState<string | null>(project.playlists?.[0]?.id ?? null)
  const [keysOpen, setKeysOpen] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const setPlaceMode = (v: boolean) => { setPlaceModeState(v); setPref('place', v); if (!v) setPlaceId(null) }
  const flash = useCallback((text: string) => setToast({ text, n: Date.now() }), [])
  useEffect(() => { if (!toast) return; const h = window.setTimeout(() => setToast(null), 2200); return () => window.clearTimeout(h) }, [toast])

  /* ---- data ---- */
  const matches = useLiveQuery(() => db.matches.toArray(), [], [] as Match[])
  const projects = useLiveQuery(() => db.videos.toArray(), [], [] as VideoProject[])
  const linked = matches.find((m) => m.id === project.matchId)
  const linkedMode = !!project.matchId
  const loadedEvents = useLiveQuery<MatchEvent[] | undefined>(async () => (project.matchId ? db.events.where('matchId').equals(project.matchId).toArray() : []), [project.matchId], undefined)
  const matchEvents = useMemo(() => loadedEvents ?? [], [loadedEvents])
  const teamId = linked?.teamId ?? project.teamId ?? team?.id
  const squad = useLiveQuery(async () => (teamId ? db.players.where('teamId').equals(teamId).toArray() : [] as Player[]), [teamId], [] as Player[])
  const playersById = useMemo(() => new Map(squad.map((p) => [p.id, p])), [squad])
  const liveEvents = useMemo(() => matchEvents.filter((e) => e.videoT == null), [matchEvents])
  const canCode = hasMedia && !(linkedMode && liveEvents.length > 0)

  // every coded item: in a match, its video-coded events plus the project's notes; otherwise the project's own tags
  const coded = useMemo<Coded[]>(() => {
    const tags = (project.tags as TagX[]).filter((x) => !linkedMode || x.code === 'NOTE')
    const own: Coded[] = tags.map((x) => ({ id: x.id, t: x.t, code: x.code, side: x.side, note: x.note, drawing: x.drawing, x: x.x, y: x.y, playerId: x.playerId, toPlayerId: x.toPlayerId, store: 'tag' }))
    const ev: Coded[] = linkedMode ? matchEvents.filter((e) => e.videoT != null).map((e) => ({ id: e.id, t: e.videoT as number, code: e.code, side: e.side, x: e.x, y: e.y, playerId: e.playerId, toPlayerId: e.toPlayerId, store: 'event', half: e.half, mt: e.t })) : []
    return [...own, ...ev].sort((a, b) => a.t - b.t)
  }, [linkedMode, project.tags, matchEvents])
  const visible = useMemo(() => coded.filter((x) => !isChild(x.id)), [coded])
  const result = useMemo(() => computeNjangi(coded), [coded])
  const span = dur || project.duration || Math.max(60, ...coded.map((x) => x.t + 10))
  const clips = useMemo(() => mergeClips(project, matchEvents), [project, matchEvents])
  const clipById = useMemo(() => new Map(clips.map((c) => [c.id, c])), [clips])
  const segments = useMemo(() => usefulSegments(visible.map((x) => x.t), clips), [visible, clips])
  const segRef = useRef(segments); segRef.current = segments
  const usefulRef = useRef(useful); usefulRef.current = useful

  // the automatic clips (every goal and shot) are kept in the project too, for the other pages
  useEffect(() => {
    if (!project.matchId || !loadedEvents) return
    const fresh = autoClips(loadedEvents, project.duration)
    if (sameAuto(project.clips, fresh)) return
    const h = window.setTimeout(() => {
      db.transaction('rw', db.videos, async () => {
        const p = await db.videos.get(project.id)
        if (!p) return
        const stored = new Map((p.clips ?? []).filter((c) => c.auto).map((c) => [c.id, c]))
        const own = (p.clips ?? []).filter((c) => !c.auto)
        const ev = new Map(loadedEvents.map((e) => [e.id, e]))
        await db.videos.update(p.id, { clips: [...own, ...fresh.map((c) => ({ ...c, title: autoTitleFor(ev.get(c.eventId!), lang), drawing: stored.get(c.id)?.drawing }))] })
      })
    }, 500)
    return () => window.clearTimeout(h)
  }, [loadedEvents, project.clips, project.matchId, project.duration, project.id]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- labels ---- */
  const evById = useMemo(() => new Map(matchEvents.map((e) => [e.id, e])), [matchEvents])
  function autoTitleFor(e: MatchEvent | undefined, l: 'fr' | 'en' = lang): string {
    return autoClipTitle(t, e, e?.playerId ? playersById.get(e.playerId) : undefined, linked?.halfMinutes ?? 45, l)
  }
  const titleOf = useCallback((c: Clip) => clipTitle(t, c, evById, playersById, linked?.halfMinutes ?? 45), [evById, playersById, linked?.halfMinutes, t])

  /* ---- the player: native video (file, hosted) or the official player of a link ---- */
  useEffect(() => {
    if (!isLink || !host.current || !link) return
    setReady(false); setLinkError(false)
    const m = mountLinkPlayer(host.current, link, lang, {
      onReady: (d) => {
        setReady(true)
        if (d > 0) { setDur(d); if (Math.round(d) !== Math.round(project.duration ?? 0)) db.videos.update(project.id, { duration: d }) }
        const at = Number(params.get('t'))
        if (at > 0 && !params.get('list')) { m.currentTime = at; time.set(at) }
      },
      onPlay: () => setPlaying(true),
      onPause: () => { setPlaying(false); time.set(m.currentTime) },
      onError: () => setLinkError(true),
    })
    media.current = m
    return () => { m.destroy?.(); media.current = null }
  }, [isLink, link?.url]) // eslint-disable-line react-hooks/exhaustive-deps

  // the playhead while playing; « Temps utile » jumps over the gaps; a clip played from the list stops at its end
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const m = media.current
      if (m) {
        let now = m.currentTime
        if (stopAt.current != null && now >= stopAt.current) { stopAt.current = null; if (!onRangeEnd.current()) { m.pause(); if (isLink) setPlaying(false) } }
        else if (usefulRef.current && !m.paused) {
          const segs = segRef.current
          const inside = segs.some(([a, b]) => now >= a && now < b)
          if (!inside) {
            const next = segs.find(([a]) => a > now)
            if (next) { m.currentTime = next[0]; now = next[0] } else { m.pause(); if (isLink) setPlaying(false) }
          }
        }
        time.set(now)
      }
      raf = requestAnimationFrame(tick)
    }
    const poll = isLink && !playing ? window.setInterval(() => { const m = media.current; if (m) { time.set(m.currentTime); if (!m.paused) setPlaying(true) } }, 700) : 0
    if (playing) raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); if (poll) window.clearInterval(poll) }
  }, [playing, isLink, time])

  const onMeta = () => {
    const v = video.current
    if (!v) return
    media.current = fileMedia(v)
    v.playbackRate = rate
    const d = v.duration
    if (isFinite(d) && d > 0) { setDur(d); if (Math.round(d) !== Math.round(project.duration ?? 0)) db.videos.update(project.id, { duration: d }) }
    setReady(true); setLoadError(false)
    const at = Number(params.get('t'))
    if (at > 0 && !params.get('list')) { v.currentTime = at; time.set(at) }
  }

  /* ---- file ---- */
  const openFile = (f?: File | null) => {
    if (!f) return
    if (!f.type.startsWith('video/') && !/\.(mp4|webm|mov|m4v|ogv|mkv|3gp)$/i.test(f.name)) { flash(t('file.notVideo')); return }
    setReady(false)
    setFile(rememberFile(project.id, f))
    draw.clear(); setDrawing(false); setView(NO_ZOOM)
    if (!isLink && !hosted && !project.fileName) db.videos.update(project.id, { fileName: f.name, source: 'file' })
  }
  const onPick = (e: ChangeEvent<HTMLInputElement>) => { openFile(e.target.files?.[0]); e.target.value = '' }
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragOver(false); openFile(e.dataTransfer.files?.[0]) }
  const mismatch = !isLink && !hosted && file && project.fileName && file.name !== project.fileName

  /* ---- transport ---- */
  const seek = useCallback((s: number) => {
    const m = media.current
    const max = m?.duration && isFinite(m.duration) ? m.duration : span
    const to = Math.max(0, Math.min(max || s, s))
    if (m) m.currentTime = to
    time.set(to)
  }, [span, time])
  const play = useCallback(() => { const m = media.current; if (!m || !hasMedia) return; m.play().catch(() => undefined); if (isLink) setPlaying(true) }, [hasMedia, isLink])
  const togglePlay = useCallback(() => {
    const m = media.current
    if (!m || !hasMedia) return
    if (m.paused) {
      if (usefulRef.current) { const now = m.currentTime; if (!segRef.current.some(([a, b]) => now >= a && now < b)) { const next = segRef.current.find(([a]) => a > now); if (next) seek(next[0]) } }
      play()
    } else { m.pause(); if (isLink) setPlaying(false) }
  }, [hasMedia, isLink, play, seek])
  const step = useCallback((d: number) => { const m = media.current; if (!m) return; m.pause(); seek(m.currentTime + d) }, [seek])
  const setSpeed = (r: number) => { setRate(r); if (media.current) media.current.playbackRate = r }
  const rates = media.current?.rates ?? [0.5, 1, 2]
  const canDraw = native && hasMedia
  const startDraw = () => { const m = media.current; if (m && !m.paused) m.pause(); setDrawing(true) }
  const stageSize = () => { const b = video.current?.parentElement; return { w: b?.clientWidth ?? 0, h: b?.clientHeight ?? 0 } }
  const zoomBy = (f: number) => { const s = stageSize(); setView((v) => zoomAt(v, f, s.w / 2, s.h / 2, s.w, s.h)) }
  const onView = useCallback((v: View) => setView(v), [])
  const jumpCoded = (dir: 1 | -1) => {
    const now = time.get()
    const list = visible.filter((x) => x.code !== 'NOTE')
    const target = dir > 0 ? list.find((x) => x.t > now + 0.6) : [...list].reverse().find((x) => x.t < now - 0.6)
    if (target) { setSelCoded(target.id); seek(Math.max(0, target.t - 2)) }
  }

  /* ---- coding ---- */
  const mutateTags = useCallback(async (fn: (list: TagX[]) => TagX[]) => {
    await db.transaction('rw', db.videos, async () => {
      const p = await db.videos.get(project.id)
      if (p) await db.videos.update(project.id, { tags: fn(p.tags as TagX[]) as VideoTag[] })
    })
  }, [project.id])

  const addCode = useCallback(async (code0: EventCode | 'NOTE', side: 'us' | 'them', implies: EventCode[] = [], extra: Partial<TagX> = {}, label?: string) => {
    const at = Math.round(time.get() * 10) / 10
    const id = uid(code0 === 'NOTE' ? 'vt_' : linkedMode ? 'ev_' : 'vt_')
    if (code0 === 'NOTE') {
      const tag: TagX = { id, t: at, code: 'NOTE', side: 'us', ...extra }
      await mutateTags((l) => [...l, tag]); setSelCoded(id); flash(`${t('analysis:short.NOTE')}, ${fmtT(at)}`)
      return id
    }
    let code: EventCode = code0
    if (code0 === 'REGAIN' && side === 'us') {
      const lastLoss = [...visible].reverse().find((x) => x.side === 'us' && (x.code === 'LOSS' || x.code === 'PASS_LOST') && x.t <= at)
      const regainedSince = lastLoss && visible.some((x) => x.side === 'us' && (x.code === 'REGAIN' || x.code === 'REGAIN5') && x.t >= lastLoss.t && x.t <= at)
      if (lastLoss && at - lastLoss.t <= LOSS_WINDOW && !regainedSince) code = 'REGAIN5'
    }
    const kids = code === code0 ? implies : []
    if (project.matchId) {
      const mt = toMatchTime(at, project.kickoff1, project.kickoff2)
      const createdAt = nowISO()
      await db.events.bulkAdd([{ id, code }, ...kids.map((c) => ({ id: `${id}~${c}`, code: c }))].map((x) => ({ id: x.id, matchId: project.matchId!, code: x.code, side, videoT: at, ...mt, createdAt })))
      // the score follows the coded goals, but never drops below a score typed by hand (a match coded in part)
      if (code === 'GOAL') { const n = await codedGoals(project.matchId, side); await db.matches.where('id').equals(project.matchId).modify((m) => { if (side === 'us') m.scoreUs = Math.max(m.scoreUs, n); else m.scoreThem = Math.max(m.scoreThem, n) }) }
    } else {
      await mutateTags((l) => [...l, { id, t: at, code, side, ...extra }, ...kids.map((c) => ({ id: `${id}~${c}`, t: at, code: c, side }))])
    }
    setSelCoded(id)
    if (placeMode) setPlaceId(id)
    flash(`${label ?? t(labelKey(code, side))}, ${fmtT(at)}`)
    return id
  }, [time, linkedMode, mutateTags, flash, t, visible, project.matchId, project.kickoff1, project.kickoff2, placeMode])

  const onCode = useCallback((d: TagDef) => { if (canCode) addCode(d.code, d.side, d.implies ?? []) }, [addCode, canCode])
  const onSet = useCallback((d: SetDef) => { if (canCode) addCode(d.code, d.side) }, [addCode, canCode])
  const addNote = async () => { const text = note.trim(); if (!text) { noteInput.current?.focus(); return } await addCode('NOTE', 'us', [], { note: text }); setNote('') }

  const patchCoded = useCallback(async (c: Coded, patch: Partial<Pick<Coded, 'x' | 'y' | 'playerId' | 'toPlayerId' | 'drawing'>>) => {
    if (c.store === 'event') await db.events.update(c.id, patch as Partial<MatchEvent>)
    else await mutateTags((l) => l.map((x) => (x.id === c.id ? { ...x, ...patch } : x)))
  }, [mutateTags])

  const removeCoded = useCallback(async (c: Coded) => {
    if (c.store === 'event' && project.matchId) {
      const ids = coded.filter((x) => x.id === c.id || x.id.startsWith(`${c.id}~`)).map((x) => x.id)
      const before = c.code === 'GOAL' ? await codedGoals(project.matchId, c.side) : 0
      await db.events.bulkDelete(ids)
      // only follow the codes back down if the score was following them
      if (c.code === 'GOAL') await db.matches.where('id').equals(project.matchId).modify((m) => { if (c.side === 'us') { if (m.scoreUs === before) m.scoreUs = before - 1 } else if (m.scoreThem === before) m.scoreThem = before - 1 })
    } else await mutateTags((l) => l.filter((x) => x.id !== c.id && !x.id.startsWith(`${c.id}~`)))
    if (selCoded === c.id) setSelCoded(null)
    if (placeId === c.id) setPlaceId(null)
  }, [coded, project.matchId, mutateTags, selCoded, placeId])

  const goTo = useCallback((c: Coded) => { setSelCoded(c.id); setSelClip(null); seek(Math.max(0, c.t - 4)); stopAt.current = null; if (!drawing) play() }, [seek, play, drawing])
  const placeOn = useCallback((c: Coded) => { setSelCoded(c.id); setPlaceId(c.id); if (!placeMode) { setPlaceModeState(true); setPref('place', true) } setTab('coder'); seek(Math.max(0, c.t - 1)) }, [placeMode, seek, setTab])
  const placeTarget = placeId ? coded.find((c) => c.id === placeId) ?? null : null
  const roster = useMemo(() => rosterAt(linked, squad, matchEvents, placeTarget?.t ?? 0), [linked, squad, matchEvents, placeTarget?.t])

  /* ---- clips ---- */
  const mutateProject = useCallback(async (fn: (p: VideoProject) => Partial<VideoProject>) => {
    await db.transaction('rw', db.videos, async () => { const p = await db.videos.get(project.id); if (p) await db.videos.update(project.id, fn(p)) })
  }, [project.id])
  const newDraft = (start: number, end: number): ClipDraft => ({ start: Math.max(0, Math.round(start * 10) / 10), end: Math.min(span, Math.round(end * 10) / 10), title: '', note: '', playerIds: [] })
  const startClip = useCallback(() => { const c = time.get(); setDraft(newDraft(c - 6, c + 6)); setSelClip(null); setTab('clips') }, [time, setTab, span]) // eslint-disable-line react-hooks/exhaustive-deps
  const setIn = () => { const c = Math.round(time.get() * 10) / 10; setDraft((d) => (d ? { ...d, start: c, end: d.end <= c + 0.5 ? Math.min(span, c + 8) : d.end } : newDraft(c, c + 8))); setTab('clips') }
  const setOut = () => { const c = Math.round(time.get() * 10) / 10; setDraft((d) => (d ? { ...d, end: c, start: d.start >= c - 0.5 ? Math.max(0, c - 8) : d.start } : newDraft(c - 8, c))); setTab('clips') }
  const onDraftRange = useCallback((r: Draft) => setDraft((d) => (d ? { ...d, ...r } : d)), [])
  const saveDraft = async () => {
    if (!draft) return
    const title = draft.title.trim() || t('clips.untitled', { t: fmtT(draft.start) })
    const base = { start: draft.start, end: draft.end, title, note: draft.note.trim() || undefined, playerIds: draft.playerIds }
    if (draft.id) await mutateProject((p) => ({ clips: (p.clips ?? []).map((c) => (c.id === draft.id ? { ...c, ...base, drawing: draft.drawing ?? c.drawing } : c)) }))
    else { const id = uid('cl_'); await mutateProject((p) => ({ clips: [...(p.clips ?? []), { id, ...base, drawing: draft.drawing, createdAt: nowISO() }] })); setSelClip(id) }
    if (draft.id) setSelClip(draft.id)
    setDraft(null)
    flash(t('clips.saved'))
  }
  const editClip = useCallback((c: Clip) => { setDraft({ id: c.id, start: c.start, end: c.end, title: c.title, note: c.note ?? '', playerIds: c.playerIds ?? [], drawing: c.drawing }); setTab('clips'); seek(c.start) }, [seek, setTab])
  const duplicateClip = useCallback(async (c: Clip, drawingOverride?: string) => {
    const id = uid('cl_')
    const copy: Clip = { id, start: c.start, end: c.end, title: titleOf(c), note: c.note, playerIds: c.playerIds ?? [], drawing: drawingOverride ?? c.drawing, createdAt: nowISO() }
    await mutateProject((p) => ({ clips: [...(p.clips ?? []), copy] }))
    setSelClip(id)
    return copy
  }, [mutateProject, titleOf])
  const deleteClip = useCallback(async (c: Clip) => {
    await mutateProject((p) => ({ clips: (p.clips ?? []).filter((x) => x.id !== c.id), playlists: (p.playlists ?? []).map((pl) => ({ ...pl, clipIds: pl.clipIds.filter((x) => x !== c.id) })) }))
    if (selClip === c.id) setSelClip(null)
    flash(t('clips.deleted'))
  }, [mutateProject, selClip, flash, t])
  /** true while a list of moments plays: the end of one range starts the next */
  const stopAtMoment = useRef(false)
  const playRange = useCallback((a: number, b: number) => { stopAtMoment.current = false; seek(a); stopAt.current = b; setDrawing(false); play() }, [seek, play])

  /* ---- a list of moments sent by another page (?list=12.5,80,...): each played from t - 4 to t + 4, in turn ---- */
  const moments = useMemo(() => (params.get('list') ?? '').split(',').filter((x) => x.trim() !== '').map(Number).filter((x) => Number.isFinite(x) && x >= 0), [params])
  const [mIdx, setMIdx] = useState(0)
  const goMoment = useCallback((i: number) => {
    const at = moments[i]
    if (at == null) return
    setMIdx(i); setSelClip(null)
    playRange(Math.max(0, at - 4), at + 4)
    stopAtMoment.current = true
  }, [moments, playRange])
  onRangeEnd.current = () => { if (stopAtMoment.current && mIdx < moments.length - 1) { goMoment(mIdx + 1); return true } return false }
  const momentsKey = moments.join(',')
  const momentsStarted = useRef('')
  useEffect(() => {
    if (!hasMedia || !moments.length || momentsStarted.current === momentsKey) return
    momentsStarted.current = momentsKey
    window.setTimeout(() => goMoment(0), 150)
  }, [hasMedia, momentsKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const closeMoments = () => { stopAtMoment.current = false; stopAt.current = null; setParams((p) => { const n = new URLSearchParams(p); n.delete('list'); return n }, { replace: true }) }
  const stepMoment = (d: 1 | -1) => goMoment(Math.max(0, Math.min(moments.length - 1, mIdx + d)))
  const selectClip = useCallback((c: Clip) => { setSelClip((s) => (s === c.id ? null : c.id)); setSelCoded(null); playRange(c.start, c.end) }, [playRange])
  const copyLink = useCallback(async (c: Clip) => {
    const l = momentLink(project, c.start)
    if (!l) return
    const ok = await copyText(l.url)
    flash(ok ? (l.exact ? t('clips.linkCopied') : t('clips.linkCopiedFb', { t: fmtT(c.start) })) : t('clips.copyFail'))
  }, [project, flash, t])

  /* ---- sessions (playlists) ---- */
  const createPlaylist = useCallback(async (title?: string, clipIds: string[] = []) => {
    const id = uid('pl_')
    const n = (project.playlists?.length ?? 0) + 1
    const pl: Playlist = { id, title: title || t('pl.defaultTitle', { n }), clipIds, createdAt: nowISO() }
    await mutateProject((p) => ({ playlists: [...(p.playlists ?? []), pl] }))
    setOpenPl(id)
    return pl
  }, [mutateProject, project.playlists?.length, t])
  const updatePlaylist = useCallback((id: string, patch: Partial<Playlist>) => mutateProject((p) => ({ playlists: (p.playlists ?? []).map((pl) => (pl.id === id ? { ...pl, ...patch } : pl)) })), [mutateProject])
  const deletePlaylist = useCallback((id: string) => mutateProject((p) => ({ playlists: (p.playlists ?? []).filter((pl) => pl.id !== id) })), [mutateProject])

  /* ---- drawing: the image goes to the clip being made, the selected clip, the selected action, or a new note ---- */
  const drawTarget = useMemo(() => {
    const now = time.get()
    if (draft) return { kind: 'draft' as const, label: t('draw.toDraft') }
    const c = selClip ? clipById.get(selClip) : undefined
    if (c && now >= c.start - 2 && now <= c.end + 2) return { kind: 'clip' as const, clip: c, label: t(c.auto ? 'draw.toAuto' : 'draw.toClip', { name: titleOf(c) }) }
    const x = selCoded ? coded.find((k) => k.id === selCoded) : undefined
    if (x && Math.abs(x.t - now) <= 3) return { kind: 'coded' as const, coded: x, label: t('draw.toCoded', { name: t(labelKey(x.code, x.side)), t: fmtT(x.t) }) }
    return { kind: 'note' as const, label: t('draw.toNote') }
  }, [draft, selClip, selCoded, clipById, coded, titleOf, t, time, drawing]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveImage = async () => {
    const v = video.current
    if (!v) return
    const shapes = draw.open ? [...draw.shapes, draw.open] : draw.shapes
    const data = snapshotView(v, shapes, view, stageSize())
    if (!data) { flash(t('draw.fail')); return }
    const tg = drawTarget
    if (tg.kind === 'draft') { setDraft((d) => (d ? { ...d, drawing: data } : d)); flash(t('draw.savedDraft')) }
    else if (tg.kind === 'clip') {
      if (tg.clip.auto) { await duplicateClip(tg.clip, data); flash(t('draw.savedDup')) }
      else { await mutateProject((p) => ({ clips: (p.clips ?? []).map((c) => (c.id === tg.clip.id ? { ...c, drawing: data } : c)) })); flash(t('draw.savedClip')) }
    } else if (tg.kind === 'coded' && tg.coded.store === 'tag') { await patchCoded(tg.coded, { drawing: data }); flash(t('draw.savedAt', { t: fmtT(tg.coded.t) })) }
    else {
      const at = tg.kind === 'coded' ? tg.coded.t : time.get()
      const label = tg.kind === 'coded' ? t(labelKey(tg.coded.code, tg.coded.side)) : undefined
      const id = uid('vt_')
      await mutateTags((l) => [...l, { id, t: Math.round(at * 10) / 10, code: 'NOTE', side: 'us', drawing: data, note: note.trim() || label }])
      setNote(''); setSelCoded(id); flash(t('draw.savedAt', { t: fmtT(at) }))
    }
    draw.clear(); setDrawing(false)
  }

  /* ---- match, kick-offs, live coding, source ---- */
  const setKickoff = async (which: 1 | 2) => {
    const at = Math.round(time.get() * 10) / 10
    const k1 = which === 1 ? at : project.kickoff1
    const k2 = which === 2 ? at : project.kickoff2
    await db.videos.update(project.id, which === 1 ? { kickoff1: at } : { kickoff2: at })
    if (project.matchId) await db.events.where('matchId').equals(project.matchId).filter((e) => e.videoT != null).modify((e) => { Object.assign(e, toMatchTime(e.videoT as number, k1, k2)) })
    flash(t(which === 1 ? 'analysis:kick.set1' : 'analysis:kick.set2', { t: fmtT(at) }))
  }
  const changeMatch = async (newId: string) => {
    const oldId = project.matchId
    if ((newId || undefined) === oldId) return
    await db.transaction('rw', db.videos, db.events, async () => {
      const p = await db.videos.get(project.id)
      if (!p) return
      let own = p.tags as TagX[]
      if (oldId) {
        const evs = await db.events.where('matchId').equals(oldId).filter((e) => e.videoT != null).toArray()
        if (newId) await db.events.bulkPut(evs.map((e) => ({ ...e, matchId: newId })))
        else { own = [...own, ...evs.map((e) => ({ id: e.id, t: e.videoT as number, code: e.code, side: e.side, x: e.x, y: e.y, playerId: e.playerId, toPlayerId: e.toPlayerId }))]; await db.events.bulkDelete(evs.map((e) => e.id)) }
      } else if (newId) {
        // the project's own codes become the match's events
        const codes = own.filter((x) => x.code !== 'NOTE')
        await db.events.bulkPut(codes.map((x) => ({ id: x.id, matchId: newId, code: x.code as EventCode, side: x.side, videoT: x.t, ...toMatchTime(x.t, p.kickoff1, p.kickoff2), x: x.x, y: x.y, playerId: x.playerId, toPlayerId: x.toPlayerId, createdAt: nowISO() })))
        own = own.filter((x) => x.code === 'NOTE')
      }
      await db.videos.update(project.id, { matchId: newId || undefined, tags: own as VideoTag[] })
    })
  }
  const replaceLive = async () => {
    if (!project.matchId) return
    await db.events.bulkDelete(liveEvents.map((e) => e.id))
    setReplacing(false)
    flash(t('live.replaced'))
  }
  const changeSource = async (v: SourceValue) => {
    const p = parseVideoLink(v.url)
    await db.videos.update(project.id, v.source === 'file' ? { source: 'file', url: undefined, hosting: undefined } : { source: p?.source ?? 'youtube', url: p?.url ?? v.url.trim(), fileName: undefined, hosting: undefined })
    setChanging(false); setReady(false)
  }

  /* ---- keyboard ---- */
  const modalOpen = !!(preview || changing || replacing || exporting || addTo || picking || keysOpen || exportMenu)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e) || modalOpen) return
      const k = e.key.toLowerCase()
      if (drawing) {
        if (e.key === 'Escape') { e.preventDefault(); setDrawing(false); return }
        if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); if (e.shiftKey) draw.redo(); else draw.undo(); return }
        if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); draw.redo(); return }
        if (k === 'd' && !e.ctrlKey && !e.metaKey) { setDrawing(false); return }
        if (e.key === '+' || e.key === '=') { zoomBy(1.25); return }
        if (e.key === '-') { zoomBy(0.8); return }
        if (e.key === '0') { setView(NO_ZOOM); return }
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); return }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); const d = e.key === 'ArrowLeft' ? -1 : 1; if (e.shiftKey) jumpCoded(d); else seek(time.get() + 5 * d); return }
      if (e.key === '?') { setKeysOpen(true); return }
      if (e.key === ',') { step(-FRAME); return }
      if (e.key === '.') { step(FRAME); return }
      if (e.key === '+' || e.key === '=') { if (native) zoomBy(1.25); return }
      if (e.key === '-') { if (native) zoomBy(0.8); return }
      if (e.key === '0') { setView(NO_ZOOM); return }
      if (e.key === 'Escape') { if (draft) setDraft(null); return }
      if (!e.shiftKey) {
        if (k === 'n') { e.preventDefault(); setTab('coder'); window.setTimeout(() => noteInput.current?.focus(), 0); return }
        if (k === 'd') { if (canDraw) startDraw(); return }
        if (k === 'i') { if (hasMedia) setIn(); return }
        if (k === 'o') { if (hasMedia) setOut(); return }
        if (k === 'u') { setUseful((v) => !v); return }
        if (k === 'm') { setPlaceMode(!placeMode); return }
      }
      const sp = setFromKey(e)
      if (sp) { e.preventDefault(); if (canCode) onSet(sp); return }
      const def = tagFromKey(e)
      if (def && canCode) { e.preventDefault(); onCode(def) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /* ---- export ---- */
  const exportCsv = () => {
    const q = (s: string) => `"${s.replace(/"/g, '""')}"`
    const rows = [['time_s', 'time', 'code', 'label', 'side', 'player', 'receiver', 'x', 'y', 'note', 'drawing', 'group'].join(',')]
    const pn = (id?: string) => { const p = id ? playersById.get(id) : undefined; return p ? q(`${p.number ?? ''} ${p.name}`.trim()) : '' }
    for (const x of coded) rows.push([x.t.toFixed(1), fmtT(x.t), x.code, q(t(labelKey(x.code, x.side))), x.side, pn(x.playerId), pn(x.toPlayerId), x.x ?? '', x.y ?? '', q(x.note ?? ''), x.drawing ? 'yes' : 'no', x.id.split('~')[0]].join(','))
    download(`${slug(BRAND.name)}-${slug(project.title)}.csv`, '﻿' + rows.join('\n'), 'text/csv;charset=utf-8')
    setExportMenu(false)
  }
  const projectInfo = { id: project.id, title: project.title, source: project.source ?? 'file', url: project.url, fileName: project.fileName, matchId: project.matchId, duration: project.duration, kickoff1: project.kickoff1, kickoff2: project.kickoff2, createdAt: project.createdAt }
  const exportJson = () => {
    const data = { app: BRAND.name, kind: 'video-analysis', version: 3, exportedAt: new Date().toISOString(), project: projectInfo, indiceNjangi: { total: result.total, sub: result.sub, label: njangiLabel(result.total, lang) }, tags: coded, ai: project.ai }
    download(`${slug(BRAND.name)}-${slug(project.title)}.json`, JSON.stringify(data, null, 2), 'application/json')
    setExportMenu(false)
  }
  const exportClipsJson = () => {
    const data = {
      app: BRAND.name, kind: 'video-clips', version: 1, exportedAt: new Date().toISOString(), project: projectInfo,
      clips: clips.map((c) => ({ id: c.id, start: c.start, end: c.end, title: titleOf(c), note: c.note, auto: !!c.auto, eventId: c.eventId, players: (c.playerIds ?? []).map((id) => { const p = playersById.get(id); return p ? { id, name: p.name, number: p.number } : { id } }), link: momentLink(project, c.start)?.url, hasDrawing: !!c.drawing })),
      playlists: project.playlists ?? [],
    }
    download(`${slug(BRAND.name)}-${slug(project.title)}-clips.json`, JSON.stringify(data, null, 2), 'application/json')
    setExportMenu(false)
  }

  /* ---- pieces ---- */
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const x of visible) {
      if (x.code === 'NOTE') continue
      const key = x.side === 'them' && ['CORNER', 'FREEKICK', 'PENALTY', 'THROWIN', 'GOALKICK'].includes(x.code) ? `OPP_${x.code}` : defFor(x.code, x.side)?.key ?? x.code
      m.set(key, (m.get(key) ?? 0) + 1)
    }
    return m
  }, [visible])
  const otherLinked = new Set(projects.filter((p) => p.id !== project.id && p.matchId).map((p) => p.matchId))
  const maxH = wide ? '62vh' : '32vh'
  const usefulLen = segmentsLength(segments)

  const filePicker = (
    <label onDragOver={(e) => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={onDrop}
      className={cx('flex min-h-[260px] flex-col items-center justify-center gap-3 px-6 py-8 text-center transition sm:aspect-video sm:min-h-0', dragOver ? 'bg-forest-800' : 'bg-night-800')}>
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-sun-300"><Upload size={26} /></span>
      <span className="font-display text-[19px] font-semibold">{project.fileName ? t('file.repick', { name: project.fileName }) : t('file.pick')}</span>
      <span className="max-w-md text-[13px] text-cream/65">{project.fileName ? t('file.repickHint', { app: BRAND.name }) : t('file.pickHint')}</span>
      <span className="mt-1 flex flex-wrap justify-center gap-2">
        <button type="button" className="btn-sun" onClick={(e) => { e.preventDefault(); fileInput.current?.click() }}><FileVideo size={17} />{t('file.choose')}</button>
        <button type="button" className="btn border border-white/25 text-cream hover:bg-white/10" onClick={(e) => { e.preventDefault(); camInput.current?.click() }}><Camera size={17} />{t('file.film')}</button>
        <button type="button" className="btn border border-white/25 text-cream hover:bg-white/10" onClick={(e) => { e.preventDefault(); setChanging(true) }}><Link2 size={17} />{t('file.useLink')}</button>
      </span>
    </label>
  )

  const badges = (
    <div className="pointer-events-none absolute left-2 top-2 flex flex-wrap gap-1.5">
      {useful && <span className="rounded-full bg-sun-500 px-2.5 py-1 text-[11.5px] font-bold text-ink shadow">{t('useful.badge')}</span>}
      {drawing && <span className="rounded-full bg-black/65 px-2.5 py-1 text-[11.5px] font-semibold text-sun-300">{t('draw.on')}</span>}
      {view.s > 1 && <span className="rounded-full bg-black/65 px-2.5 py-1 text-[11.5px] font-semibold tabular-nums text-cream">{t('zoom.level', { z: view.s.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 1 }) })}</span>}
    </div>
  )

  const picture = isLink ? (
    <div className="relative bg-black">
      <div ref={host} className="aspect-video w-full [&_iframe]:h-full [&_iframe]:w-full [&>div]:h-full" style={{ maxHeight: maxH }} />
      {!ready && !linkError && <div className="pointer-events-none absolute inset-0 grid place-items-center text-[13px] text-cream/70">{t('link.loading')}</div>}
      {linkError && (
        <div className="absolute inset-0 grid place-items-center bg-night-900/95 p-6 text-center">
          <div className="max-w-md">
            <AlertTriangle size={26} className="mx-auto text-sun-300" />
            <p className="mt-2 text-[14px] font-semibold">{t('link.error')}</p>
            <p className="mt-1 text-[12.5px] text-cream/70">{t('link.errorBody')}</p>
            <button type="button" className="btn-sun btn-sm mt-3" onClick={() => setChanging(true)}><Link2 size={15} />{t('source.change')}</button>
          </div>
        </div>
      )}
      {badges}
    </div>
  ) : src ? (
    <div className="relative">
      <Stage video={video} src={src} view={view} onView={onView} drawing={drawing} draw={draw} onTap={() => !drawing && togglePlay()} maxH={maxH} label={t('draw.layer')} textPlaceholder={t('draw.textPh')}
        onVideoEvents={{
          onPlay: () => { setPlaying(true); if (drawing) { setDrawing(false); draw.clear() } },
          onPause: () => { setPlaying(false); time.set(video.current?.currentTime ?? 0) },
          onSeeked: () => time.set(video.current?.currentTime ?? 0),
          onTimeUpdate: () => { if (!playing) time.set(video.current?.currentTime ?? 0) },
          onLoadedMetadata: onMeta,
          onError: () => { setLoadError(true); setReady(false) },
        }}>
        {badges}
      </Stage>
      {!ready && !loadError && <div className="pointer-events-none absolute inset-0 grid place-items-center text-[13px] text-cream/70">{t('link.loading')}</div>}
      {loadError && (
        <div className="absolute inset-0 grid place-items-center bg-night-900/95 p-6 text-center">
          <div className="max-w-md">
            <AlertTriangle size={26} className="mx-auto text-sun-300" />
            <p className="mt-2 text-[14px] font-semibold">{t(hosted ? 'hosted.error' : 'file.error')}</p>
            <button type="button" className="btn-sun btn-sm mt-3" onClick={() => { setLoadError(false); video.current?.load() }}><RotateCcw size={15} />{t('hosted.retry')}</button>
          </div>
        </div>
      )}
    </div>
  ) : filePicker

  const showBar = !!(hasMedia || (src && !loadError))
  const speedLabel = (r: number) => `${String(r).replace('.', lang === 'fr' ? ',' : '.')}×`
  const transport = (
    <div className="mt-1.5 flex items-center gap-1">
      <Ctl label={playing ? t('t.pause') : t('t.play')} onClick={togglePlay} strong>{playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}</Ctl>
      <Ctl label={t('t.back5')} onClick={() => seek(time.get() - 5)}><Undo2 size={17} /><span className="text-[11px] font-bold">5</span></Ctl>
      <Ctl label={t('t.fwd5')} onClick={() => seek(time.get() + 5)}><span className="text-[11px] font-bold">5</span><Redo2 size={17} /></Ctl>
      {native && wide && <Ctl label={t('t.frameBack')} onClick={() => step(-FRAME)}><ChevronLeft size={18} /></Ctl>}
      {native && wide && <Ctl label={t('t.frameFwd')} onClick={() => step(FRAME)}><ChevronRight size={18} /></Ctl>}
      <Clock time={time} span={span} />
      {rates.length > 1 && (wide ? (
        <div className="ml-auto flex rounded-lg bg-white/5 p-0.5 ring-1 ring-white/10" role="group" aria-label={t('t.speed')}>
          {rates.map((s) => <button key={s} type="button" aria-pressed={rate === s} onClick={() => setSpeed(s)} className={cx('min-h-[36px] min-w-[38px] rounded-md px-1.5 text-[12px] font-semibold tabular-nums', rate === s ? 'bg-cream text-ink' : 'text-cream/75 hover:text-cream')}>{speedLabel(s)}</button>)}
        </div>
      ) : (
        <button type="button" onClick={() => setSpeed(rates[(rates.indexOf(rate) + 1) % rates.length])} aria-label={`${t('t.speed')} ${speedLabel(rate)}`}
          className="ml-auto min-h-[40px] min-w-[48px] rounded-lg bg-white/5 px-2 text-[13px] font-semibold tabular-nums text-cream ring-1 ring-white/10">{speedLabel(rate)}</button>
      ))}
    </div>
  )
  const tools = (
    <>
      <div className="flex flex-wrap items-center gap-1">
        {native && !wide && <Ctl label={t('t.frameBack')} onClick={() => step(-FRAME)}><ChevronLeft size={18} /></Ctl>}
        {native && !wide && <Ctl label={t('t.frameFwd')} onClick={() => step(FRAME)}><ChevronRight size={18} /></Ctl>}
        <ToolBtn label={t('clips.create')} onClick={startClip} active={!!draft}><Scissors size={16} /></ToolBtn>
        {canDraw && <ToolBtn label={t('draw.button')} onClick={() => (drawing ? setDrawing(false) : startDraw())} active={drawing} tour="studio-draw"><PenLine size={16} /></ToolBtn>}
        {native && (
          <>
            <span className="mx-0.5 h-5 w-px bg-white/15" />
            <Ctl label={t('zoom.out')} onClick={() => zoomBy(0.8)} disabled={view.s <= 1}><ZoomOut size={17} /></Ctl>
            <Ctl label={t('zoom.in')} onClick={() => zoomBy(1.25)} disabled={view.s >= 3}><ZoomIn size={17} /></Ctl>
            {view.s > 1 && <ToolBtn label={t('zoom.reset')} onClick={() => setView(NO_ZOOM)}><Maximize2 size={15} /></ToolBtn>}
            <Ctl label={t('zoom.follow')} title={t('zoom.followHint')} onClick={() => flash(t('zoom.followHint'))} dim><Locate size={16} /></Ctl>
          </>
        )}
        <span className="mx-0.5 h-5 w-px bg-white/15" />
        <ToolBtn label={t('useful.button')} title={t('useful.hint')} onClick={() => setUseful((v) => !v)} active={useful}><Gauge size={16} /></ToolBtn>
        <div className="ml-auto hidden lg:block"><Ctl label={t('keys.title')} onClick={() => setKeysOpen(true)}><Keyboard size={17} /></Ctl></div>
      </div>
      {useful && <p className="mt-1 px-1 text-[11.5px] leading-snug text-cream/60">{t('useful.on', { kept: fmtT(usefulLen), total: fmtT(span) })}</p>}
    </>
  )
  const inputs = (
    <>
      <input ref={fileInput} type="file" accept="video/*" className="sr-only" onChange={onPick} tabIndex={-1} aria-hidden="true" />
      <input ref={camInput} type="file" accept="video/*" capture="environment" className="sr-only" onChange={onPick} tabIndex={-1} aria-hidden="true" />
    </>
  )
  const timeline = (
    <Timeline span={span} time={time} coded={visible} clips={clips} selectedClip={selClip} draft={draft} onDraft={onDraftRange} onSeek={(s) => { stopAt.current = null; stopAtMoment.current = false; seek(s) }}
      onPickClip={(c) => { setTab('clips'); selectClip(c) }} segments={useful ? segments : null} marks={project.kickoff2 != null ? [project.kickoff2] : []} />
  )
  const momentsBar = moments.length > 0 && (
    <div className="flex items-center gap-2 border-b border-white/10 bg-night-800 py-1 pl-3 pr-1.5" role="group" aria-label={t('moments.title')}>
      <span className="text-[13.5px] font-semibold tabular-nums text-sun-300" aria-live="polite">{t('moments.label', { i: mIdx + 1, n: moments.length })}</span>
      <span className="text-[12.5px] tabular-nums text-cream/60">{fmtT(moments[mIdx] ?? 0)}</span>
      <div className="ml-auto flex items-center gap-0.5">
        <Ctl label={t('moments.prev')} onClick={() => stepMoment(-1)} disabled={mIdx === 0}><ChevronLeft size={18} /></Ctl>
        <Ctl label={t('moments.again')} onClick={() => goMoment(mIdx)}><RotateCcw size={15} /></Ctl>
        <Ctl label={t('moments.next')} onClick={() => stepMoment(1)} disabled={mIdx >= moments.length - 1}><ChevronRight size={18} /></Ctl>
        <Ctl label={t('moments.close')} onClick={closeMoments}><X size={17} /></Ctl>
      </div>
    </div>
  )
  // desktop: one dark card. Phone: the picture, the timeline and the transport stay on screen while scrolling, the tools scroll away.
  const player = wide || !showBar ? (
    <div className="overflow-hidden rounded-2xl bg-night-900 text-cream shadow-card" data-tour="studio-player">
      {picture}
      {showBar && momentsBar}
      {showBar && <div className="px-3 pb-2 pt-2">{timeline}{transport}<div className="mt-1 border-t border-white/10 pt-1.5">{tools}</div></div>}
      {inputs}
    </div>
  ) : (
    <div className="overflow-hidden rounded-t-2xl bg-night-900 text-cream" data-tour="studio-player">
      {picture}
      {momentsBar}
      <div className="px-2 pb-1.5 pt-2">{timeline}{transport}</div>
      {inputs}
    </div>
  )
  const phoneTools = !wide && showBar && <div className="rounded-b-2xl bg-night-900 px-2 pb-2 pt-1.5 text-cream ring-1 ring-inset ring-white/5">{tools}</div>

  /* ---- the right panel ---- */
  const kickRow = ([1, 2] as const).map((w) => {
    const v = w === 1 ? project.kickoff1 : project.kickoff2
    return (
      <span key={w} className="inline-flex items-center gap-1">
        <span className="text-ink-muted">{t(`analysis:kick.h${w}`)}</span>
        <span className="font-semibold tabular-nums text-ink">{v != null ? fmtT(v) : w === 1 ? '0:00' : '-'}</span>
        <button type="button" className="btn-ghost btn-sm min-h-[34px] px-2" onClick={() => setKickoff(w)}>{t('analysis:kick.here')}</button>
      </span>
    )
  })
  const kickoffBar = linkedMode && hasMedia && (
    <details className="group rounded-xl bg-sand/60 px-3 py-1.5 text-[13px]" open={project.kickoff2 == null}>
      <summary className="flex min-h-[34px] cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
        <Flag size={14} className="shrink-0 text-forest-600" aria-hidden="true" />
        <span className="font-semibold text-ink">{t('analysis:kick.title')}</span>
        <span className="min-w-0 truncate tabular-nums text-ink-muted">{t('kick.summary', { a: fmtT(project.kickoff1 ?? 0), b: project.kickoff2 != null ? fmtT(project.kickoff2) : '-' })}</span>
        <ChevronDown size={15} className="ml-auto shrink-0 text-ink-muted transition group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pb-1 pt-1">{kickRow}</div>
      {project.kickoff2 == null && <p className="pb-1 text-[12px] text-ink-faint">{t('analysis:kick.hint')}</p>}
    </details>
  )
  const liveBanner = linkedMode && liveEvents.length > 0 && (
    <div className="rounded-xl border border-sun-300 bg-sun-50 px-3 py-2.5 text-[13.5px] text-sun-800">
      <p><b>{t('live.title', { count: liveEvents.length, n: liveEvents.length })}</b> {t('live.body')}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className="btn-outline btn-sm bg-paper" onClick={() => setReplacing(true)}>{t('live.replace')}</button>
        {linked && <Link to={`/app/analyse/rapport/${linked.id}`} className="btn-ghost btn-sm">{t('report')}</Link>}
      </div>
    </div>
  )
  const codeHint = !hasMedia ? t('pad.needVideo') : !canCode ? t('pad.needReplace') : linkedMode ? t('pad.hintMatch') : t('pad.hint')

  const coderTab = (
    <div className="space-y-4">
      {kickoffBar}
      {liveBanner}
      <div>
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <h3 className="font-display text-[17px] font-semibold text-ink"><TagAt time={time} /></h3>
        </div>
        <CodePad canCode={canCode} counts={counts} onCode={onCode} onSet={onSet} wide={wide} placeMode={placeMode} onPlaceMode={setPlaceMode}
          note={note} onNote={setNote} onAddNote={addNote} noteRef={noteInput} hint={codeHint}>
          {placeMode && (
            <div className="mt-2">
              <PlacePanel target={placeTarget} roster={roster} onClose={() => setPlaceId(null)}
                onPlace={(x, y) => placeTarget && patchCoded(placeTarget, { x, y })}
                onPlayer={(id) => placeTarget && patchCoded(placeTarget, { playerId: id })}
                onReceiver={(id) => placeTarget && patchCoded(placeTarget, { toPlayerId: id })} />
            </div>
          )}
        </CodePad>
      </div>
      <div className="border-t border-line pt-4">
        <CodedList items={visible} all={coded} players={playersById} selected={selCoded} onGo={goTo} onPlace={placeOn} onDelete={removeCoded} onImage={setPreview} wide={wide} />
      </div>
      <div className="border-t border-line pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-[17px] font-semibold text-ink">{t('indice.title')}</h3>
            <p className="mt-0.5 text-[12.5px] text-ink-muted">{linkedMode ? t('indice.match') : t('indice.hint')}</p>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-display text-[28px] font-semibold leading-none tabular-nums text-forest-600">{fmtNjangi(result.total, lang)}</div>
            <div className="mt-1 text-[11px] font-semibold text-ink-muted">{result.tagged ? njangiLabel(result.total, lang) : t('indice.none')}</div>
          </div>
        </div>
        <SubBars result={result} compact className="mt-3" />
        {linked && result.tagged > 0 && <Link to={`/app/analyse/rapport/${linked.id}`} className="link mt-2 inline-flex min-h-[40px] items-center gap-1 text-[13.5px]"><ChartLine size={14} />{t('report')}</Link>}
      </div>
    </div>
  )

  const clipsTab = (
    <div className="space-y-4">
      {draft && (
        <ClipEditor draft={draft} onChange={(d) => setDraft((o) => ({ ...o, ...d }))} squad={squad} onIn={setIn} onOut={setOut} wide={wide}
          onPreview={() => playRange(draft.start, draft.end)} onSave={saveDraft} onCancel={() => setDraft(null)} />
      )}
      <ClipList clips={clips} titleOf={titleOf} players={playersById} selected={selClip} native={native} linkPlatform={isLink} canExport={canExport()}
        onSelect={selectClip} onEdit={editClip} onDuplicate={async (c) => { const copy = await duplicateClip(c); editClip(copy); flash(t('clips.duplicated')) }}
        onDelete={deleteClip} onAddTo={setAddTo} onExport={setExporting} onCopyLink={copyLink} onCreate={startClip} onExportJson={exportClipsJson} />
    </div>
  )

  const seancesTab = (
    <PlaylistsPanel projectId={project.id} playlists={project.playlists ?? []} clips={clipById} titleOf={titleOf} open={openPl} onOpen={setOpenPl}
      onCreate={() => createPlaylist()} onUpdate={updatePlaylist} onDelete={deletePlaylist} onPick={setPicking} onPlayClip={(c) => playRange(c.start, c.end)} />
  )

  const aiTab = (
    <div data-tour="studio-ai" className="[&>section]:border-0 [&>section]:bg-transparent [&>section]:p-0">
      <AiPanel project={project} src={aiSrc} duration={span} onSeek={(at) => { seek(Math.max(0, at - 3)); play() }} onPickFile={() => fileInput.current?.click()} />
    </div>
  )

  const panelRef = useRef<HTMLElement>(null)
  const stickyRef = useRef<HTMLDivElement>(null)
  // on a phone, a new tab shows its top just under the player that stays on screen
  const showPanelTop = () => requestAnimationFrame(() => {
    const el = panelRef.current, st = stickyRef.current
    if (!el || !st || wide) return
    const top = el.getBoundingClientRect().top, limit = st.getBoundingClientRect().bottom + 8
    if (top < limit) window.scrollBy({ top: top - limit })
  })
  const panel = (
    <aside ref={panelRef} className={cx('min-w-0 rounded-panel border border-line bg-paper', wide && 'sticky top-4 flex max-h-[calc(100vh-2rem)] flex-col')} aria-label={t('panel.label')}>
      <div className="no-scrollbar flex shrink-0 gap-1 overflow-x-auto border-b border-line px-2 pt-1" role="tablist">
        {TABS.map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => { setTab(k); showPanelTop() }}
            className={cx('-mb-px inline-flex min-h-[46px] shrink-0 items-center gap-1.5 whitespace-nowrap border-b-[2.5px] px-2.5 text-[14px] font-semibold transition-colors', tab === k ? 'border-forest-600 text-ink' : 'border-transparent text-ink-muted hover:text-ink')}>
            {t(`tabs.${k}`)}
            {k === 'ia' && <AiMark size={16} />}
            {k === 'clips' && clips.length > 0 && <span className="rounded-full bg-sand px-1.5 text-[11.5px] tabular-nums text-ink-muted">{clips.length}</span>}
            {k === 'seances' && (project.playlists?.length ?? 0) > 0 && <span className="rounded-full bg-sand px-1.5 text-[11.5px] tabular-nums text-ink-muted">{project.playlists!.length}</span>}
          </button>
        ))}
      </div>
      <div className={cx('p-3 sm:p-4', wide && 'min-h-0 flex-1 overflow-y-auto')} role="tabpanel">
        {tab === 'coder' ? coderTab : tab === 'clips' ? clipsTab : tab === 'seances' ? seancesTab : aiTab}
      </div>
    </aside>
  )

  const firstPlaylist = (project.playlists ?? []).find((p) => p.clipIds.some((id) => clipById.has(id)))

  return (
    <div>
      <MolaDock hide />
      {/* ---------- top bar ---------- */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Link to="/app/analyse/video" className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink"><ArrowLeft size={16} />{t('backList')}</Link>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setExportMenu(true)} className="btn-outline btn-sm min-h-[40px]"><Download size={15} />{t('export.button')}</button>
          {firstPlaylist && <Link to={`/app/analyse/video/${project.id}/seance?p=${firstPlaylist.id}`} className="btn-primary btn-sm min-h-[40px]"><MonitorPlay size={15} />{t('pl.launch')}</Link>}
        </div>
      </div>
      <div className="mb-4">
        <TitleEditor key={project.title} value={project.title} label={t('rename')} onSave={(v2) => db.videos.update(project.id, { title: v2 })} />
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-ink-muted">
          <label className="inline-flex items-center gap-2">
            <span>{t('match')}</span>
            <select className="input min-h-[40px] w-auto max-w-[260px] py-1.5 text-[13px]" value={project.matchId ?? ''} onChange={(e) => changeMatch(e.target.value)}>
              <option value="">{t('noMatch')}</option>
              {[...matches].sort((a, b) => b.date.localeCompare(a.date)).map((m) => <option key={m.id} value={m.id} disabled={otherLinked.has(m.id)}>{fmtDate(m.date, lang, { day: 'numeric', month: 'short' })}, {t('common:app.vs')} {m.opponent}</option>)}
            </select>
          </label>
          {hosted ? (
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-50 px-2.5 py-1 text-[12.5px] font-semibold text-forest-700 ring-1 ring-forest-100"><Cloud size={14} />{t('hosted.label', { app: BRAND.name })}</span>
              {project.hosting?.demo && <span className="rounded-full bg-sun-50 px-2.5 py-1 text-[12.5px] font-semibold text-sun-800 ring-1 ring-sun-100">{t('hosted.demo')}</span>}
            </span>
          ) : isLink ? <span className="inline-flex items-center gap-1.5"><Link2 size={14} />{t(project.source === 'youtube' ? 'source.youtube' : 'source.facebook')}</span>
            : project.fileName && <span className="inline-flex items-center gap-1.5"><FileVideo size={14} />{t('file.name', { name: project.fileName })}</span>}
          {deadDemo && <span className="rounded-full bg-sun-50 px-2.5 py-1 text-[12.5px] font-semibold text-sun-800 ring-1 ring-sun-100">{t('hosted.demoReopen')}</span>}
          <button type="button" onClick={() => setChanging(true)} className="link min-h-[40px]">{t('source.change')}</button>
          {!isLink && !hosted && src && <button type="button" onClick={() => fileInput.current?.click()} className="link min-h-[40px]">{t('file.other')}</button>}
        </div>
        {!linkedMode && <p className="mt-2 text-[12.5px] text-ink-faint">{t('noMatchHint')}</p>}
        {mismatch && <p className="mt-3 rounded-xl bg-sun-50 px-3 py-2 text-[13px] text-sun-800">{t('file.mismatch', { got: file?.name, want: project.fileName })}</p>}
      </div>

      {wide ? (
        <div className="grid grid-cols-[minmax(0,1fr)_400px] items-start gap-5">
          <div className={cx('min-w-0', !drawing && 'sticky top-4')}>{player}{drawing && <DrawBar draw={draw} onSave={saveImage} onClose={() => setDrawing(false)} target={drawTarget.label} />}</div>
          {panel}
        </div>
      ) : (
        <div>
          <div ref={stickyRef} className="sticky top-14 z-20 -mx-4 bg-cream px-4 pt-1 sm:-mx-6 sm:px-6">{player}</div>
          {phoneTools}
          {drawing && <DrawBar draw={draw} onSave={saveImage} onClose={() => setDrawing(false)} target={drawTarget.label} />}
          <div className="mt-3">{panel}</div>
        </div>
      )}

      {/* ---------- dialogs ---------- */}
      {preview?.drawing && (
        <Modal open onClose={() => setPreview(null)} title={`${t(labelKey(preview.code, preview.side))}, ${fmtT(preview.t)}`} wide
          footer={<>
            {preview.store === 'tag' && <button type="button" className="btn-ghost" onClick={() => { patchCoded(preview, { drawing: undefined }); setPreview(null) }}><Trash2 size={16} />{t('image.remove')}</button>}
            <button type="button" className="btn-outline" onClick={() => download(`${slug(BRAND.name)}-${slug(project.title)}-${Math.round(preview.t)}s.jpg`, dataUrlBlob(preview.drawing!), 'image/jpeg')}><Download size={16} />{t('image.download')}</button>
            <button type="button" className="btn-primary" onClick={() => { const p = preview; setPreview(null); goTo(p) }}><Play size={16} />{t('coded.go')}</button>
          </>}>
          <img src={preview.drawing} alt={t('image.alt', { t: fmtT(preview.t) })} className="w-full rounded-xl" />
          {preview.note && <p className="mt-3 text-sm text-ink-soft">{preview.note}</p>}
        </Modal>
      )}
      <Modal open={exportMenu} onClose={() => setExportMenu(false)} title={t('export.button')}>
        <div className="grid gap-2">
          <ExportRow title={t('export.csv')} body={t('export.csvBody')} disabled={!coded.length} onClick={exportCsv} />
          <ExportRow title={t('export.json')} body={t('export.jsonBody')} disabled={!coded.length} onClick={exportJson} />
          <ExportRow title={t('clips.exportJson')} body={t('export.clipsBody')} disabled={!clips.length} onClick={exportClipsJson} />
        </div>
        <p className="mt-3 text-[12.5px] text-ink-muted">{t('export.videoHint')}</p>
      </Modal>
      <ChangeSource open={changing} onClose={() => setChanging(false)} initial={{ source: isLink ? (project.source ?? 'youtube') : 'youtube', url: isLink ? project.url ?? '' : '' }} onSave={changeSource} />
      <Modal open={replacing} onClose={() => setReplacing(false)} title={t('live.replaceTitle')}
        footer={<>
          <button type="button" className="btn-ghost" onClick={() => setReplacing(false)}>{t('common:actions.cancel')}</button>
          <button type="button" className="btn-danger" onClick={replaceLive}><Trash2 size={16} />{t('live.replaceConfirm', { count: liveEvents.length, n: liveEvents.length })}</button>
        </>}>
        <p className="text-[15px] text-ink-soft">{t('live.replaceBody')}</p>
      </Modal>
      {exporting && src && <ExportDialog clip={exporting} title={titleOf(exporting)} subtitle={exporting.note} src={src} brand={`${BRAND.name}, ${project.title}`} fileBase={`${slug(BRAND.name)}-${slug(titleOf(exporting))}`} onClose={() => setExporting(null)} />}
      <AddToPlaylist clip={addTo} playlists={project.playlists ?? []} onClose={() => setAddTo(null)}
        onAdd={async (pid) => { const c = addTo!; await updatePlaylist(pid, { clipIds: [...(project.playlists?.find((p) => p.id === pid)?.clipIds ?? []), c.id] }); setAddTo(null); setOpenPl(pid); flash(t('pl.added')) }}
        onCreate={async (title) => { const c = addTo!; await createPlaylist(title, [c.id]); setAddTo(null); flash(t('pl.added')) }} />
      <ClipPicker playlist={picking ? project.playlists?.find((p) => p.id === picking) ?? null : null} clips={clips} titleOf={titleOf} onClose={() => setPicking(null)}
        onSave={async (ids) => { await updatePlaylist(picking!, { clipIds: ids }); setPicking(null) }} />
      <ShortcutsSheet open={keysOpen} onClose={() => setKeysOpen(false)} />

      {toast && <div key={toast.n} role="status" className={cx('fixed left-1/2 top-[68px] z-50 w-max max-w-[min(92vw,560px)] -translate-x-1/2 bg-night-800 px-4 py-2 text-center text-sm font-semibold leading-snug text-cream shadow-lift lg:bottom-8 lg:top-auto', toast.text.length > 48 ? 'rounded-2xl' : 'rounded-full')}>{toast.text}</div>}
    </div>
  )
}

/* ================================================================== small pieces */

function Clock({ time, span }: { time: TimeStore; span: number }) {
  const cur = useTime(time, 1)
  return <span className="ml-1 text-[13px] font-semibold tabular-nums text-cream/85">{fmtT(cur)}<span className="text-cream/40"> / {fmtT(span)}</span></span>
}

function TagAt({ time }: { time: TimeStore }) {
  const { t } = useT('editor')
  const cur = useTime(time, 1)
  return <>{t('pad.at', { t: fmtT(cur) })}</>
}

function ExportRow({ title, body, onClick, disabled }: { title: string; body: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="flex min-h-[56px] items-start gap-3 rounded-xl border border-line bg-paper px-3 py-2.5 text-left transition hover:border-ink-faint disabled:opacity-50">
      <Download size={17} className="mt-0.5 shrink-0 text-forest-600" />
      <span><span className="block text-[14px] font-semibold text-ink">{title}</span><span className="block text-[12.5px] text-ink-muted">{body}</span></span>
    </button>
  )
}

function ChangeSource({ open, onClose, initial, onSave }: { open: boolean; onClose: () => void; initial: SourceValue; onSave: (v: SourceValue) => void }) {
  const { t } = useT('editor')
  const [v, setV] = useState<SourceValue>(initial)
  useEffect(() => { if (open) setV(initial) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Modal open={open} onClose={onClose} title={t('source.change')}
      footer={<>
        <button type="button" className="btn-ghost" onClick={onClose}>{t('common:actions.cancel')}</button>
        <button type="button" className="btn-primary" disabled={!sourceValid(v)} onClick={() => onSave(v)}>{t('common:actions.save')}</button>
      </>}>
      <SourcePicker value={v} onChange={setV} />
    </Modal>
  )
}

function dataUrlBlob(url: string) {
  const [head, b64] = url.split(',')
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? 'image/jpeg'
  const bin = atob(b64); const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

/** The project title: a heading that wraps, with a rename button. */
function TitleEditor({ value, label, onSave }: { value: string; label: string; onSave: (v: string) => void }) {
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState(value)
  const done = () => { const v = draft.trim(); if (v && v !== value) onSave(v); else setDraft(value); setEdit(false) }
  if (edit) {
    return (
      <input autoFocus aria-label={label} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={done}
        onKeyDown={(e) => { if (e.key === 'Enter') done(); if (e.key === 'Escape') { setDraft(value); setEdit(false) } }}
        className="input font-display text-[22px] font-semibold sm:text-[28px]" />
    )
  }
  return (
    <div className="flex items-start gap-2">
      <h1 className="min-w-0 flex-1 text-[24px] font-semibold leading-tight text-ink sm:text-[30px]">{value}</h1>
      <button type="button" onClick={() => { setDraft(value); setEdit(true) }} aria-label={label} title={label} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-ink-muted hover:bg-sand"><Pencil size={18} /></button>
    </div>
  )
}

function Ctl({ label, title, onClick, children, strong = false, disabled = false, dim = false }: { label: string; title?: string; onClick: () => void; children: ReactNode; strong?: boolean; disabled?: boolean; dim?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={title ?? label} disabled={disabled}
      className={cx('flex min-h-[40px] min-w-[40px] items-center justify-center gap-0.5 rounded-lg px-1.5 transition disabled:opacity-35', strong ? 'bg-cream text-ink' : dim ? 'text-cream/45 hover:bg-white/10 hover:text-cream/70' : 'text-cream/85 hover:bg-white/10')}>
      {children}
    </button>
  )
}

function ToolBtn({ label, title, onClick, children, active = false, disabled = false, tour }: { label: string; title?: string; onClick: () => void; children: ReactNode; active?: boolean; disabled?: boolean; tour?: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} title={title ?? label} disabled={disabled} data-tour={tour}
      className={cx('flex min-h-[40px] items-center gap-1.5 rounded-lg px-2 text-[12.5px] font-semibold transition disabled:opacity-35', active ? 'bg-cream text-ink' : 'text-cream/85 hover:bg-white/10')}>
      {children}<span className="hidden sm:inline">{label}</span><span className="sr-only sm:hidden">{label}</span>
    </button>
  )
}
