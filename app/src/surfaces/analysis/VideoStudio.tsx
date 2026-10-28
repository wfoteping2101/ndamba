import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, ChartLine, ChevronLeft, ChevronRight, Circle, Download, Eraser, FileVideo, ImageDown, MoveUpRight, Pause, Pencil, PenLine, Play, Redo2, Spline, StickyNote, Trash2, Undo2, Upload, X,
} from 'lucide-react'
import { db } from '../../lib/db'
import { useDocumentTitle, useLiveQuery } from '../../lib/hooks'
import { useT } from '../../i18n'
import { BRAND } from '../../lib/config'
import { cx, download, fmtClock, fmtDate, uid } from '../../lib/util'
import type { EventCode, Match, VideoProject, VideoTag } from '../../lib/types'
import { computeNjangi, fmtNjangi, njangiLabel } from '../../lib/njangi'
import { EmptyState, Modal } from '../../ui'
import { SubBars } from './components/charts'
import { defFor, GROUP_ORDER, isTyping, markInk, NOTE_DEF, shortKey, tagFromKey, TAGS, type GroupId, type TagDef } from './components/codes'
import { DRAW_COLORS, DrawLayer, snapshot, type DrawColor, type Shape, type Tool } from './components/Telestrator'
import { slug, useMedia } from './components/data'

const FRAME = 1 / 25
const SPEEDS = [0.5, 1, 2] as const
const LOSS_WINDOW = 5
const isChild = (tg: VideoTag) => tg.id.includes('~')
const fmtT = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)}:${fmtClock(s % 3600)}` : fmtClock(s))
type Filter = 'all' | GroupId | 'note'

export default function VideoStudio() {
  const { id = '' } = useParams()
  const { t } = useT('analysis')
  const project = useLiveQuery<VideoProject | null | undefined>(async () => (await db.videos.get(id)) ?? null, [id], undefined)
  useDocumentTitle(project?.title || t('video.title'))
  if (project === undefined) return <div className="grid min-h-[50vh] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-forest-100 border-t-forest-600" /></div>
  if (project === null) return <EmptyState icon={<FileVideo size={32} />} title={t('video.notFound')} body={t('video.notFoundBody')} action={<Link to="/app/analyse/video" className="btn-primary">{t('video.back')}</Link>} />
  return <Studio project={project} />
}

/* ------------------------------------------------------------------ studio */

function Studio({ project }: { project: VideoProject }) {
  const { t, lang } = useT('analysis')
  const wide = useMedia('(min-width: 1024px)')
  const video = useRef<HTMLVideoElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const noteInput = useRef<HTMLInputElement>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [cur, setCur] = useState(0)
  const [dur, setDur] = useState(project.duration ?? 0)
  const [rate, setRate] = useState<number>(1)
  const [drawing, setDrawing] = useState(false)
  const [tool, setTool] = useState<Tool>('arrow')
  const [color, setColor] = useState<DrawColor>('sun')
  const [shapes, setShapes] = useState<Shape[]>([])
  const [redo, setRedo] = useState<Shape[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [note, setNote] = useState('')
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null)
  const [preview, setPreview] = useState<VideoTag | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const matches = useLiveQuery(() => db.matches.toArray(), [], [] as Match[])
  const linked = matches.find((m) => m.id === project.matchId)

  const tags = useMemo(() => [...project.tags].sort((a, b) => a.t - b.t), [project.tags])
  const visible = useMemo(() => tags.filter((x) => !isChild(x)), [tags])
  const result = useMemo(() => computeNjangi(tags), [tags])
  const span = dur || project.duration || Math.max(60, ...tags.map((x) => x.t + 10))

  const flash = useCallback((text: string) => setToast({ text, n: Date.now() }), [])
  useEffect(() => { if (!toast) return; const h = window.setTimeout(() => setToast(null), 1800); return () => window.clearTimeout(h) }, [toast])
  useEffect(() => () => { if (src) URL.revokeObjectURL(src) }, [src])

  // smooth playhead while playing
  useEffect(() => {
    if (!playing) return
    let raf = 0
    const tick = () => { if (video.current) setCur(video.current.currentTime); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  /* ---- file ---- */
  const openFile = (file?: File | null) => {
    if (!file) return
    if (!file.type.startsWith('video/') && !/\.(mp4|webm|mov|m4v|ogv|mkv)$/i.test(file.name)) { flash(t('video.notVideo')); return }
    setSrc((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(file) })
    setPicked(file.name)
    setShapes([]); setDrawing(false)
    if (!project.fileName) db.videos.update(project.id, { fileName: file.name })
  }
  const onPick = (e: ChangeEvent<HTMLInputElement>) => { openFile(e.target.files?.[0]); e.target.value = '' }
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragOver(false); openFile(e.dataTransfer.files?.[0]) }
  const mismatch = picked && project.fileName && picked !== project.fileName

  /* ---- transport ---- */
  const v = () => video.current
  const seek = useCallback((s: number) => { const el = video.current; if (!el) { setCur(s); return } el.currentTime = Math.max(0, Math.min(el.duration || s, s)); setCur(el.currentTime) }, [])
  const togglePlay = useCallback(() => { const el = video.current; if (!el || !src) return; if (el.paused) { el.play().catch(() => undefined) } else el.pause() }, [src])
  const step = useCallback((d: number) => { const el = video.current; if (!el) return; el.pause(); seek(el.currentTime + d) }, [seek])
  const setSpeed = (r: number) => { setRate(r); if (video.current) video.current.playbackRate = r }
  const startDraw = () => { const el = v(); if (el && !el.paused) el.pause(); setDrawing(true) }

  /* ---- tags ---- */
  const mutate = useCallback(async (fn: (list: VideoTag[]) => VideoTag[]) => {
    await db.transaction('rw', db.videos, async () => {
      const p = await db.videos.get(project.id)
      if (p) await db.videos.update(project.id, { tags: fn(p.tags) })
    })
  }, [project.id])

  const addTag = useCallback(async (def: TagDef | 'NOTE', extra: Partial<VideoTag> = {}) => {
    const at = Math.round((video.current?.currentTime ?? cur) * 10) / 10
    const id = uid('vt_')
    if (def === 'NOTE') {
      const tag: VideoTag = { id, t: at, code: 'NOTE', side: 'us', ...extra }
      await mutate((l) => [...l, tag]); setSelected(id); flash(`${t('short.NOTE')}, ${fmtT(at)}`)
      return tag
    }
    let code: EventCode = def.code
    if (def.key === 'REGAIN') {
      const lastLoss = [...tags].reverse().find((x) => x.side === 'us' && (x.code === 'LOSS' || x.code === 'PASS_LOST') && x.t <= at)
      const regainedSince = lastLoss && tags.some((x) => x.side === 'us' && (x.code === 'REGAIN' || x.code === 'REGAIN5') && x.t >= lastLoss.t && x.t <= at)
      if (lastLoss && at - lastLoss.t <= LOSS_WINDOW && !regainedSince) code = 'REGAIN5'
    }
    const parent: VideoTag = { id, t: at, code, side: def.side, ...extra }
    const kids: VideoTag[] = code === def.code ? (def.implies ?? []).map((c) => ({ id: `${id}~${c}`, t: at, code: c, side: def.side })) : []
    await mutate((l) => [...l, parent, ...kids])
    setSelected(id)
    flash(`${t(`short.${shortKey(code, def.side)}`)}, ${fmtT(at)}`)
    return parent
  }, [cur, tags, mutate, flash, t])

  const removeTag = (tg: VideoTag) => { mutate((l) => l.filter((x) => x.id !== tg.id && !x.id.startsWith(`${tg.id}~`))); if (selected === tg.id) setSelected(null) }
  const addNote = async () => { const text = note.trim(); if (!text) { noteInput.current?.focus(); return } await addTag('NOTE', { note: text }); setNote('') }
  const goTo = (tg: VideoTag) => { setSelected(tg.id); seek(Math.max(0, tg.t - 4)); const el = v(); if (el && src && !drawing) el.play().catch(() => undefined) }

  const saveImage = async () => {
    const el = v(); if (!el) return
    const data = snapshot(el, shapes)
    if (!data) { flash(t('video.imageFail')); return }
    const at = el.currentTime
    const sel = visible.find((x) => x.id === selected && Math.abs(x.t - at) <= 3) ?? visible.find((x) => Math.abs(x.t - at) <= 1.5)
    if (sel) { await mutate((l) => l.map((x) => (x.id === sel.id ? { ...x, drawing: data } : x))); flash(t('video.imageSaved', { t: fmtT(sel.t) })) }
    else { const tag = await addTag('NOTE', { drawing: data, note: note.trim() || undefined }); setNote(''); flash(t('video.imageSaved', { t: fmtT(tag.t) })) }
    setShapes([]); setRedo([]); setDrawing(false)
  }

  /* ---- keyboard ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e) || preview) return
      if (drawing) {
        if (e.key === 'Escape') { setDrawing(false); return }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); setShapes((s) => { if (!s.length) return s; setRedo((r) => [...r, s[s.length - 1]]); return s.slice(0, -1) }); return }
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); return }
      if (e.key === 'ArrowLeft') { e.preventDefault(); seek((video.current?.currentTime ?? 0) - 5); return }
      if (e.key === 'ArrowRight') { e.preventDefault(); seek((video.current?.currentTime ?? 0) + 5); return }
      if (e.key === ',') { step(-FRAME); return }
      if (e.key === '.') { step(FRAME); return }
      if (e.key.toLowerCase() === 'n') { e.preventDefault(); noteInput.current?.focus(); return }
      if (e.key.toLowerCase() === 'd' && src) { startDraw(); return }
      const def = tagFromKey(e)
      if (def && src) { e.preventDefault(); addTag(def) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /* ---- export ---- */
  const exportCsv = () => {
    const q = (s: string) => `"${s.replace(/"/g, '""')}"`
    const rows = [['time_s', 'time', 'code', 'label', 'side', 'note', 'drawing', 'group'].join(',')]
    for (const x of tags) rows.push([x.t.toFixed(1), fmtT(x.t), x.code, q(t(`short.${shortKey(x.code, x.side)}`)), x.side, q(x.note ?? ''), x.drawing ? 'yes' : 'no', x.id.split('~')[0]].join(','))
    download(`${slug(BRAND.name)}-${slug(project.title)}.csv`, '﻿' + rows.join('\n'), 'text/csv;charset=utf-8')
  }
  const exportJson = () => {
    const data = {
      app: BRAND.name, kind: 'video-analysis', version: 1, exportedAt: new Date().toISOString(),
      project: { id: project.id, title: project.title, fileName: project.fileName, matchId: project.matchId, duration: project.duration, createdAt: project.createdAt },
      indiceNjangi: { total: result.total, sub: result.sub, label: njangiLabel(result.total, lang) },
      tags,
    }
    download(`${slug(BRAND.name)}-${slug(project.title)}.json`, JSON.stringify(data, null, 2), 'application/json')
  }

  /* ---- pieces ---- */
  const counts = useMemo(() => { const m = new Map<string, number>(); for (const x of visible) { const k = x.code === 'NOTE' ? 'NOTE' : shortKey(x.code, x.side); m.set(k, (m.get(k) ?? 0) + 1) } return m }, [visible])
  const groupOf = (x: VideoTag): Filter => (x.code === 'NOTE' ? 'note' : defFor(x.code, x.side)?.group ?? 'possession')
  const shown = visible.filter((x) => filter === 'all' || groupOf(x) === filter)
  const groupsPresent = (['possession', 'danger', 'fixation', 'transition', 'opponent', 'note'] as Filter[]).filter((g) => visible.some((x) => groupOf(x) === g))

  const player = (
    <div className={cx('overflow-hidden rounded-2xl bg-night-900 text-cream shadow-card', !wide && src && 'sticky top-14 z-20')}>
      {src ? (
        <div className="relative bg-black">
          <video ref={video} src={src} playsInline preload="metadata" className={cx('block w-full bg-black object-contain', wide ? 'max-h-[62vh]' : 'max-h-[34vh]')}
            onPlay={() => { setPlaying(true); setDrawing(false); setShapes([]) }} onPause={() => { setPlaying(false); setCur(video.current?.currentTime ?? 0) }}
            onTimeUpdate={() => !playing && setCur(video.current?.currentTime ?? 0)} onSeeked={() => setCur(video.current?.currentTime ?? 0)}
            onLoadedMetadata={() => { const d = video.current?.duration ?? 0; if (isFinite(d) && d > 0) { setDur(d); if (Math.round(d) !== Math.round(project.duration ?? 0)) db.videos.update(project.id, { duration: d }) } if (video.current) video.current.playbackRate = rate }}
            onClick={() => !drawing && togglePlay()} />
          <DrawLayer video={video} shapes={shapes} onAdd={(s) => { setShapes((l) => [...l, s]); setRedo([]) }} tool={tool} color={DRAW_COLORS[color]} active={drawing} label={t('video.draw')} />
          {drawing && <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-sun-300">{t('video.drawing')}</span>}
        </div>
      ) : (
        <label onDragOver={(e) => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={onDrop}
          className={cx('flex min-h-[260px] cursor-pointer flex-col py-8 sm:aspect-video sm:min-h-0 items-center justify-center gap-3 px-6 text-center transition', dragOver ? 'bg-forest-800' : 'bg-night-800 hover:bg-night-700')}>
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-sun-300"><Upload size={26} /></span>
          <span className="font-display text-[19px] font-semibold">{project.fileName ? t('video.repick', { name: project.fileName }) : t('video.pick')}</span>
          <span className="max-w-md text-[13px] text-cream/65">{project.fileName ? t('video.repickHint', { app: BRAND.name }) : t('video.pickHint')}</span>
          <span className="btn-sun pointer-events-none mt-1"><FileVideo size={17} />{t('video.choose')}</span>
          <input ref={fileInput} type="file" accept="video/*" className="sr-only" onChange={onPick} aria-label={t('video.pick')} />
        </label>
      )}
      {src && (
        <div className="px-2 pb-2 pt-1.5 sm:px-3">
          <Timeline tags={visible} span={span} cur={cur} selected={selected} onSeek={seek} onPick={goTo} />
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <CtlBtn label={playing ? t('video.pause') : t('video.play')} onClick={togglePlay} strong>{playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}</CtlBtn>
            <CtlBtn label={t('video.back5')} onClick={() => seek(cur - 5)}><Undo2 size={17} /><span className="text-[11px] font-bold">5</span></CtlBtn>
            <CtlBtn label={t('video.fwd5')} onClick={() => seek(cur + 5)}><span className="text-[11px] font-bold">5</span><Redo2 size={17} /></CtlBtn>
            <CtlBtn label={t('video.frameBack')} onClick={() => step(-FRAME)}><ChevronLeft size={18} /></CtlBtn>
            <CtlBtn label={t('video.frameFwd')} onClick={() => step(FRAME)}><ChevronRight size={18} /></CtlBtn>
            <span className="ml-1 text-[13px] font-semibold tabular-nums text-cream/85">{fmtT(cur)}<span className="text-cream/40"> / {fmtT(span)}</span></span>
            <div className="ml-auto flex items-center gap-1">
              <div className="flex rounded-lg bg-white/5 p-0.5 ring-1 ring-white/10" role="group" aria-label={t('video.speed')}>
                {SPEEDS.map((s) => <button key={s} type="button" aria-pressed={rate === s} onClick={() => setSpeed(s)} className={cx('min-h-[36px] min-w-[40px] rounded-md px-1.5 text-[12px] font-semibold tabular-nums', rate === s ? 'bg-cream text-ink' : 'text-cream/70')}>{s.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US')}x</button>)}
              </div>
              <CtlBtn label={t('video.draw')} onClick={() => (drawing ? setDrawing(false) : startDraw())} active={drawing}><PenLine size={17} /></CtlBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const drawBar = drawing && (
    <div className="mt-3 rounded-2xl bg-night-800 p-2.5 text-cream ring-1 ring-white/10">
      <div className="flex flex-wrap items-center gap-1.5">
        {([['arrow', MoveUpRight], ['circle', Circle], ['free', Spline]] as const).map(([k, Icon]) => (
          <button key={k} type="button" onClick={() => setTool(k)} aria-pressed={tool === k} className={cx('flex min-h-[40px] items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold', tool === k ? 'bg-cream text-ink' : 'bg-white/5 text-cream/80')}><Icon size={16} />{t(`video.tools.${k}`)}</button>
        ))}
        <span className="mx-1 h-6 w-px bg-white/15" />
        {(Object.keys(DRAW_COLORS) as DrawColor[]).map((c) => (
          <button key={c} type="button" onClick={() => setColor(c)} aria-pressed={color === c} aria-label={t(`video.colors.${c}`)} title={t(`video.colors.${c}`)}
            className={cx('grid h-10 w-10 place-items-center rounded-full', color === c && 'ring-2 ring-cream ring-offset-2 ring-offset-night-800')}><span className="h-6 w-6 rounded-full" style={{ background: DRAW_COLORS[c] }} /></button>
        ))}
        <span className="mx-1 h-6 w-px bg-white/15" />
        <CtlBtn label={t('video.undoDraw')} onClick={() => setShapes((s) => { if (!s.length) return s; setRedo((r) => [...r, s[s.length - 1]]); return s.slice(0, -1) })}><Undo2 size={17} /></CtlBtn>
        <CtlBtn label={t('video.redoDraw')} onClick={() => setRedo((r) => { if (!r.length) return r; setShapes((s) => [...s, r[r.length - 1]]); return r.slice(0, -1) })}><Redo2 size={17} /></CtlBtn>
        <CtlBtn label={t('video.clear')} onClick={() => { setShapes([]); setRedo([]) }}><Eraser size={17} /></CtlBtn>
        <div className="ml-auto flex items-center gap-1.5">
          <button type="button" onClick={saveImage} className="flex min-h-[40px] items-center gap-1.5 rounded-lg bg-sun-500 px-3 text-[13px] font-semibold text-ink"><ImageDown size={16} />{t('video.saveImage')}</button>
          <CtlBtn label={t('video.closeDraw')} onClick={() => setDrawing(false)}><X size={17} /></CtlBtn>
        </div>
      </div>
      <p className="mt-1.5 px-1 text-[12px] text-cream/55">{t('video.drawHelp')}</p>
    </div>
  )

  const pad = (
    <section className="card card-pad mt-4" aria-labelledby="pad-h">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="pad-h" className="font-display text-lg font-semibold text-ink">{t('video.tagAt', { t: fmtT(cur) })}</h2>
        <span className="text-xs text-ink-faint">{src ? t('video.tagHint') : t('video.tagNeedsVideo')}</span>
      </div>
      <div className="space-y-3">
        {GROUP_ORDER.map((g) => (
          <div key={g}>
            <div className="mb-1.5 text-[13px] font-semibold text-ink-muted">{t(`groups.${g}`)}</div>
            <div className="flex flex-wrap gap-1.5">
              {TAGS.filter((x) => x.group === g).map((x) => {
                const Icon = x.icon
                const n = counts.get(x.key) ?? 0
                return (
                  <button key={x.key} type="button" disabled={!src} onClick={() => addTag(x)} title={`${t(`help.${x.key}`)} (${x.kbd})`}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-line bg-paper py-1.5 pl-1.5 pr-3 text-[13.5px] font-semibold text-ink transition hover:border-ink-faint active:scale-[0.98] disabled:opacity-45">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1 ring-inset ring-black/5" style={{ background: x.color }}><Icon size={16} className={markInk(x.color)} /></span>
                    {t(`short.${x.key}`)}
                    {n > 0 && <span className="text-[12px] font-medium tabular-nums text-ink-faint">×{n}</span>}
                    {wide && <kbd className="ml-0.5 rounded border border-line px-1 font-sans text-[10.5px] font-semibold leading-4 text-ink-faint">{x.kbd}</kbd>}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        <div>
          <div className="mb-1.5 text-[13px] font-semibold text-ink-muted">{t('groups.note')}</div>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); addNote() }}>
            <label className="sr-only" htmlFor="nj-note">{t('video.notePh')}</label>
            <input id="nj-note" ref={noteInput} className="input min-w-0 flex-1" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('video.notePh')} disabled={!src} />
            <button type="submit" disabled={!src} aria-label={t('video.addNote')} className="btn-outline shrink-0 min-h-[44px]"><StickyNote size={16} /><span className="hidden sm:inline">{t('video.addNote')}</span></button>
          </form>
        </div>
      </div>
      {wide && <p className="mt-4 text-xs text-ink-faint">{t('video.keys')}</p>}
    </section>
  )

  const indice = (
    <section className="card card-pad" aria-labelledby="vi-h">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="vi-h" className="font-display text-lg font-semibold text-ink">{t('video.indice')}</h2>
          <p className="mt-0.5 text-[13px] text-ink-muted">{t('video.indiceHint')}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-[30px] font-semibold leading-none tabular-nums text-forest-600">{fmtNjangi(result.total, lang)}</div>
          <div className="mt-1 text-[11px] font-semibold text-ink-muted">{result.tagged ? njangiLabel(result.total, lang) : t('video.noTagsYet')}</div>
        </div>
      </div>
      <SubBars result={result} compact className="mt-4" />
    </section>
  )

  const clips = (
    <section className="card card-pad" aria-labelledby="clips-h">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id="clips-h" className="font-display text-lg font-semibold text-ink">{t('video.clips')} <span className="text-sm font-normal text-ink-faint">{visible.length}</span></h2>
      </div>
      {groupsPresent.length > 1 && (
        <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label={t('video.filter')}>
          {(['all', ...groupsPresent] as Filter[]).map((g) => (
            <button key={g} type="button" aria-pressed={filter === g} onClick={() => setFilter(g)} className={cx('chip min-h-[36px] shrink-0 cursor-pointer px-3', filter === g && 'chip-on')}>{g === 'all' ? t('video.filterAll') : t(`groups.${g}`)}</button>
          ))}
        </div>
      )}
      {shown.length === 0 ? <p className="text-sm text-ink-muted">{t('video.clipsEmpty')}</p> : (
        <ul className={cx('-mx-1 divide-y divide-line/70 overflow-y-auto', wide && 'max-h-[52vh]')}>
          {shown.map((x) => {
            const def = defFor(x.code, x.side)
            const Icon = def?.icon ?? NOTE_DEF.icon
            const kids = tags.filter((k) => k.id.startsWith(`${x.id}~`))
            return (
              <li key={x.id} className={cx('flex items-center gap-2 rounded-lg px-1 py-1.5', selected === x.id && 'bg-forest-50')}>
                <button type="button" onClick={() => goTo(x)} className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2.5 text-left" aria-label={`${t('video.seek')} ${fmtT(x.t)}`}>
                  <span className="w-12 shrink-0 text-[13px] font-semibold tabular-nums text-ink-muted">{fmtT(x.t)}</span>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1 ring-inset ring-black/5" style={{ background: def?.color ?? NOTE_DEF.color }}><Icon size={15} className={markInk(def?.color ?? NOTE_DEF.color)} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-ink">{t(`short.${shortKey(x.code, x.side)}`)}{kids.length > 0 && <span className="ml-1.5 text-[11.5px] font-normal text-ink-faint">+ {kids.map((k) => t(`short.${shortKey(k.code, k.side)}`)).join(', ')}</span>}</span>
                    {x.note && <span className="block truncate text-[12.5px] text-ink-muted">{x.note}</span>}
                  </span>
                </button>
                {x.drawing && <button type="button" onClick={() => setPreview(x)} className="shrink-0 overflow-hidden rounded-md ring-1 ring-line" aria-label={t('video.image')}><img src={x.drawing} alt={t('video.imageAlt', { t: fmtT(x.t) })} className="h-10 w-[62px] object-cover" /></button>}
                <button type="button" onClick={() => removeTag(x)} aria-label={t('video.deleteTag')} className="grid h-11 w-10 shrink-0 place-items-center rounded-lg text-ink-faint hover:bg-sand hover:text-clay-600"><Trash2 size={16} /></button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )

  return (
    <div>
      {/* ---------- head ---------- */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link to="/app/analyse/video" className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink"><ArrowLeft size={16} />{t('video.back')}</Link>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={exportCsv} disabled={!tags.length} className="btn-outline btn-sm min-h-[40px]"><Download size={15} />{t('video.csv')}</button>
          <button type="button" onClick={exportJson} disabled={!tags.length} className="btn-outline btn-sm min-h-[40px]"><Download size={15} />{t('video.json')}</button>
        </div>
      </div>
      <div className="mb-5">
        <TitleEditor key={project.id} value={project.title} label={t('video.rename')} onSave={(v2) => db.videos.update(project.id, { title: v2 })} />
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-ink-muted">
          <label className="inline-flex items-center gap-2">
            <span>{t('video.linkedMatch')}</span>
            <select className="input min-h-[40px] w-auto py-1.5 text-[13px]" value={project.matchId ?? ''} onChange={(e) => db.videos.update(project.id, { matchId: e.target.value || undefined })}>
              <option value="">{t('video.noMatch')}</option>
              {[...matches].sort((a, b) => b.date.localeCompare(a.date)).map((m) => <option key={m.id} value={m.id}>{fmtDate(m.date, lang, { day: 'numeric', month: 'short' })}, {t('common:app.vs')} {m.opponent}</option>)}
            </select>
          </label>
          {linked && <Link to={`/app/analyse/rapport/${linked.id}`} className="link inline-flex min-h-[40px] items-center gap-1"><ChartLine size={14} />{t('video.openReport')}</Link>}
          {project.fileName && <span className="inline-flex items-center gap-1.5"><FileVideo size={14} />{t('video.file', { name: project.fileName })}</span>}
          {src && <button type="button" onClick={() => fileInput.current?.click()} className="link min-h-[40px]">{t('video.changeFile')}</button>}
        </div>
        {src && <input ref={fileInput} type="file" accept="video/*" className="sr-only" onChange={onPick} tabIndex={-1} aria-hidden="true" />}
        {mismatch && <p className="mt-3 rounded-xl bg-sun-50 px-3 py-2 text-[13px] text-sun-700">{t('video.otherFile', { got: picked, want: project.fileName })}</p>}
      </div>

      {wide ? (
        <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6">
          <div className="min-w-0">{player}{drawBar}{pad}</div>
          <div className="min-w-0 space-y-5">{indice}{clips}</div>
        </div>
      ) : (
        <div>{player}{drawBar}{pad}<div className="mt-5 space-y-5">{clips}{indice}</div></div>
      )}

      {preview?.drawing && (
        <Modal open onClose={() => setPreview(null)} title={`${t(`short.${shortKey(preview.code, preview.side)}`)}, ${fmtT(preview.t)}`} wide
          footer={<>
            <button type="button" className="btn-ghost" onClick={() => { mutate((l) => l.map((x) => (x.id === preview.id ? { ...x, drawing: undefined } : x))); setPreview(null) }}><Trash2 size={16} />{t('video.removeImage')}</button>
            <button type="button" className="btn-outline" onClick={() => download(`${slug(BRAND.name)}-${slug(project.title)}-${Math.round(preview.t)}s.jpg`, dataUrlBlob(preview.drawing!), 'image/jpeg')}><Download size={16} />{t('video.downloadImage')}</button>
            <button type="button" className="btn-primary" onClick={() => { const p = preview; setPreview(null); goTo(p) }}><Play size={16} />{t('video.seek')}</button>
          </>}>
          <img src={preview.drawing} alt={t('video.imageAlt', { t: fmtT(preview.t) })} className="w-full rounded-xl" />
          {preview.note && <p className="mt-3 text-sm text-ink-soft">{preview.note}</p>}
        </Modal>
      )}

      {toast && <div key={toast.n} role="status" className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-night-800 px-4 py-2 text-sm font-semibold text-cream shadow-lift lg:bottom-8">{toast.text}</div>}
    </div>
  )
}

function dataUrlBlob(url: string) {
  const [head, b64] = url.split(',')
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? 'image/jpeg'
  const bin = atob(b64); const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

/* ------------------------------------------------------------------ small pieces */

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
      <h1 className="min-w-0 flex-1 text-[26px] font-semibold leading-tight text-ink sm:text-[32px]">{value}</h1>
      <button type="button" onClick={() => { setDraft(value); setEdit(true) }} aria-label={label} title={label} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-ink-muted hover:bg-sand"><Pencil size={18} /></button>
    </div>
  )
}

function CtlBtn({ label, onClick, children, strong = false, active = false }: { label: string; onClick: () => void; children: ReactNode; strong?: boolean; active?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} aria-pressed={active || undefined}
      className={cx('flex min-h-[40px] min-w-[40px] items-center justify-center gap-0.5 rounded-lg px-1.5 transition', strong ? 'bg-cream text-ink' : active ? 'bg-sun-500 text-ink' : 'text-cream/85 hover:bg-white/10')}>
      {children}
    </button>
  )
}

/** The strip under the video: one marker per tag, the playhead, click to seek. */
function Timeline({ tags, span, cur, selected, onSeek, onPick }: { tags: VideoTag[]; span: number; cur: number; selected: string | null; onSeek: (s: number) => void; onPick: (tg: VideoTag) => void }) {
  const { t } = useT('analysis')
  const bar = useRef<HTMLDivElement>(null)
  const pct = (s: number) => `${Math.max(0, Math.min(100, (s / (span || 1)) * 100))}%`
  const seekAt = (clientX: number) => { const b = bar.current?.getBoundingClientRect(); if (!b) return; onSeek(((clientX - b.left) / b.width) * span) }
  return (
    <div className="relative select-none pt-1" aria-label={t('video.timeline')}>
      <div ref={bar} className="relative h-9 cursor-pointer rounded-md bg-white/[0.06]" onPointerDown={(e) => { if ((e.target as HTMLElement).dataset.marker) return; seekAt(e.clientX) }}
        role="slider" aria-label={t('video.timeline')} aria-valuemin={0} aria-valuemax={Math.round(span)} aria-valuenow={Math.round(cur)} tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'ArrowLeft') onSeek(cur - 1); if (e.key === 'ArrowRight') onSeek(cur + 1) }}>
        <div className="absolute inset-y-0 left-0 rounded-l-md bg-white/[0.07]" style={{ width: pct(cur) }} />
        {tags.map((x) => {
          const def = defFor(x.code, x.side)
          return (
            <button key={x.id} type="button" data-marker="1" onClick={() => onPick(x)} aria-label={`${t(`short.${shortKey(x.code, x.side)}`)} ${fmtT(x.t)}`} title={`${t(`short.${shortKey(x.code, x.side)}`)}, ${fmtT(x.t)}`}
              className={cx('absolute top-1 h-7 w-[5px] -translate-x-1/2 rounded-full', selected === x.id && 'ring-2 ring-cream')} style={{ left: pct(x.t), background: def?.color ?? NOTE_DEF.color }} />
          )
        })}
        <div className="pointer-events-none absolute -bottom-0.5 -top-0.5 w-0.5 -translate-x-1/2 rounded-full bg-sun-300 shadow" style={{ left: pct(cur) }} />
      </div>
    </div>
  )
}
