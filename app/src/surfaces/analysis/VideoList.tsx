import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Clapperboard, FileVideo, Image as ImageIcon, Link2, Plus, Sparkles, Trash2, Video } from 'lucide-react'
import { db } from '../../lib/db'
import { useDocumentTitle, useLiveQuery } from '../../lib/hooks'
import { useSession } from '../../lib/session'
import { useT } from '../../i18n'
import { BRAND } from '../../lib/config'
import { fmtClock, fmtDate, nowISO, uid } from '../../lib/util'
import { computeNjangi, njangiLabel } from '../../lib/njangi'
import type { Match, MatchEvent, VideoProject, VideoTag } from '../../lib/types'
import { EmptyState, Field, Modal, PageHeader } from '../../ui'
import { MiniDial } from './components/charts'
import { SourcePicker, sourceValid, type SourceValue } from './components/SourcePicker'
import { parseVideoLink } from './components/videoSource'

export default function VideoList() {
  const { t, lang } = useT('analysis')
  const navigate = useNavigate()
  const { team } = useSession()
  const [params, setParams] = useSearchParams()
  useDocumentTitle(t('video.title'))
  const projects = useLiveQuery(() => db.videos.orderBy('createdAt').reverse().toArray(), [], undefined as VideoProject[] | undefined)
  const matches = useLiveQuery(() => db.matches.toArray(), [], [] as Match[])
  const coded = useLiveQuery(() => db.events.filter((e) => e.videoT != null).toArray(), [], [] as MatchEvent[])
  const [creating, setCreating] = useState(false)
  const [preset, setPreset] = useState('')
  const [toDelete, setToDelete] = useState<VideoProject | null>(null)
  const byId = useMemo(() => new Map(matches.map((m) => [m.id, m])), [matches])
  // from the analysis page: /app/analyse/video?nouveau=<matchId> opens the form for that match
  useEffect(() => {
    const m = params.get('nouveau')
    if (m === null || !projects) return
    const existing = m ? projects.find((p) => p.matchId === m) : undefined
    if (existing) { navigate(`/app/analyse/video/${existing.id}`, { replace: true }); return }
    setPreset(m); setCreating(true); setParams({}, { replace: true })
  }, [params, projects]) // eslint-disable-line react-hooks/exhaustive-deps

  const create = async (title: string, matchId: string | undefined, src: SourceValue) => {
    const p = parseVideoLink(src.url)
    const v: VideoProject = { id: uid('vp_'), title, matchId, source: src.source === 'file' ? 'file' : p?.source ?? 'youtube', url: src.source === 'file' ? undefined : p?.url, tags: [], createdAt: nowISO() }
    await db.videos.put(v)
    navigate(`/app/analyse/video/${v.id}`)
  }
  const tagsOf = (p: VideoProject): VideoTag[] => (p.matchId ? [...p.tags, ...coded.filter((e) => e.matchId === p.matchId).map((e) => ({ id: e.id, t: e.videoT as number, code: e.code, side: e.side }))] : p.tags)

  const header = (
    <>
      <Link to="/app/analyse" className="mb-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink"><ArrowLeft size={16} />{t('video.backHub')}</Link>
      <PageHeader title={t('video.title')} subtitle={t('video.subtitle', { app: BRAND.name })}
        actions={<button type="button" onClick={() => { setPreset(''); setCreating(true) }} className="btn-primary btn-lg"><Plus size={18} />{t('video.new')}</button>} />
    </>
  )

  return (
    <div>
      {header}
      {projects === undefined ? null : projects.length === 0 ? (
        <EmptyState icon={<Clapperboard size={32} />} title={t('video.empty')} body={t('video.emptyBody', { app: BRAND.name })}
          action={<button type="button" onClick={() => setCreating(true)} className="btn-primary"><Plus size={16} />{t('video.new')}</button>} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {projects.map((p) => {
            const m = p.matchId ? byId.get(p.matchId) : undefined
            const all = tagsOf(p)
            const visible = all.filter((x) => !x.id.includes('~'))
            const r = computeNjangi(all)
            const images = p.tags.filter((x) => x.drawing).length
            return (
              <div key={p.id} className="card group relative flex items-start gap-3 p-4 transition hover:border-forest-300">
                {r.tagged > 0 ? <MiniDial value={r.total} size={52} /> : <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-forest-50 text-forest-700"><Video size={20} strokeWidth={1.75} /></span>}
                <div className="min-w-0 flex-1">
                  <Link to={`/app/analyse/video/${p.id}`} className="block text-[16px] font-semibold leading-snug text-ink after:absolute after:inset-0 after:rounded-2xl after:content-['']">{p.title}</Link>
                  <div className="mt-0.5 text-[12.5px] text-ink-muted">
                    {m ? `${t('common:app.vs')} ${m.opponent}, ${fmtDate(m.date, lang, { day: 'numeric', month: 'short' })}` : fmtDate(p.createdAt.slice(0, 10), lang, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-faint">
                    {p.source === 'youtube' || p.source === 'facebook'
                      ? <span className="inline-flex items-center gap-1"><Link2 size={13} />{t(p.source === 'youtube' ? 'video.onYoutube' : 'video.onFacebook')}</span>
                      : <span className="inline-flex items-center gap-1"><FileVideo size={13} />{p.fileName ?? t('video.noFile')}</span>}
                    {p.ai?.frames.length ? <span className="inline-flex items-center gap-1 text-sun-700"><Sparkles size={13} />{t('ai.short')}</span> : null}
                    {p.duration ? <span>{t('video.duration', { d: fmtClock(p.duration) })}</span> : null}
                    <span>{t('video.tags', { count: visible.length })}</span>
                    {images > 0 && <span className="inline-flex items-center gap-1"><ImageIcon size={13} />{images}</span>}
                    {r.tagged > 0 && <span className="font-semibold text-ink-muted">{njangiLabel(r.total, lang)}</span>}
                  </div>
                </div>
                <div className="relative z-10 flex shrink-0 items-center">
                  <button type="button" onClick={() => setToDelete(p)} aria-label={t('video.delete')} title={t('video.delete')} className="grid h-11 w-11 place-items-center rounded-xl text-ink-faint hover:bg-sand hover:text-clay-600"><Trash2 size={17} /></button>
                  <ChevronRight size={18} className="text-ink-faint transition group-hover:translate-x-0.5" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ol className="mt-10 grid gap-x-8 gap-y-5 border-t border-line pt-6 sm:grid-cols-3" aria-label={t('video.howTitle')}>
        {(['film', 'upload', 'tag'] as const).map((k, i) => (
          <li key={k} className="flex gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-forest-300 text-[13px] font-semibold tabular-nums text-forest-700" aria-hidden="true">{i + 1}</span>
            <div className="min-w-0">
              <div className="text-[15px] font-semibold text-ink">{t(`video.how.${k}.title`)}</div>
              <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-muted">{t(`video.how.${k}.body`)}</p>
            </div>
          </li>
        ))}
      </ol>

      <NewProject open={creating} onClose={() => setCreating(false)} matches={matches} taken={new Set((projects ?? []).map((p) => p.matchId).filter(Boolean) as string[])} preset={preset} teamName={team?.name} onCreate={create} />

      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title={t('video.delete')}
        footer={<>
          <button type="button" className="btn-ghost" onClick={() => setToDelete(null)}>{t('common:actions.cancel')}</button>
          <button type="button" className="btn-danger" onClick={async () => { if (toDelete) await db.videos.delete(toDelete.id); setToDelete(null) }}><Trash2 size={16} />{t('common:actions.delete')}</button>
        </>}>
        <p className="text-[15px] text-ink-soft">{t('video.deleteConfirm')}</p>
        {toDelete && <p className="mt-2 font-semibold text-ink">{toDelete.title}</p>}
      </Modal>
    </div>
  )
}

function NewProject({ open, onClose, matches, taken, preset, teamName, onCreate }: {
  open: boolean; onClose: () => void; matches: Match[]; taken: Set<string>; preset: string; teamName?: string
  onCreate: (title: string, matchId: string | undefined, src: SourceValue) => void
}) {
  const { t, lang } = useT('analysis')
  const [title, setTitle] = useState('')
  const [matchId, setMatchId] = useState('')
  const [src, setSrc] = useState<SourceValue>({ source: 'youtube', url: '' })
  const sorted = [...matches].sort((a, b) => b.date.localeCompare(a.date))
  useEffect(() => { if (open) { setTitle(''); setMatchId(preset); setSrc({ source: 'youtube', url: '' }) } }, [open, preset])
  // the title is optional: by default, the match ("Étoile de la Côte contre Rapides de Kribi") or the day
  const auto = (() => { const m = matches.find((x) => x.id === matchId); return m ? `${teamName ?? t('live.us')} ${t('common:app.vs')} ${m.opponent}` : t('video.untitled', { date: fmtDate(new Date().toISOString().slice(0, 10), lang, { day: 'numeric', month: 'long' }) }) })()
  const ok = sourceValid(src)
  const submit = (e: FormEvent) => { e.preventDefault(); if (!ok) return; onCreate(title.trim() || auto, matchId || undefined, src) }
  return (
    <Modal open={open} onClose={onClose} title={t('video.newTitle')}
      footer={<>
        <button type="button" className="btn-ghost" onClick={onClose}>{t('common:actions.cancel')}</button>
        <button type="submit" form="nj-newvideo" className="btn-primary" disabled={!ok}><Plus size={16} />{t('video.create')}</button>
      </>}>
      <form id="nj-newvideo" onSubmit={submit}>
        <Field label={t('video.linkedMatch')} htmlFor="nj-vmatch">
          <select id="nj-vmatch" className="input" value={matchId} onChange={(e) => setMatchId(e.target.value)}>
            <option value="">{t('video.noMatch')}</option>
            {sorted.map((m) => <option key={m.id} value={m.id} disabled={taken.has(m.id)}>{fmtDate(m.date, lang, { day: 'numeric', month: 'short' })}, {t('common:app.vs')} {m.opponent}{taken.has(m.id) ? ` (${t('video.hasVideo')})` : ''}</option>)}
          </select>
        </Field>
        <div className="mb-4">
          <div className="mb-1.5 text-[14px] font-semibold text-ink-soft">{t('src.label')}</div>
          <SourcePicker value={src} onChange={setSrc} />
        </div>
        <Field label={t('video.projectTitle')} htmlFor="nj-vtitle-new">
          <input id="nj-vtitle-new" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={auto} />
        </Field>
        <p className="text-[13px] text-ink-muted">{t('video.newHint')}</p>
      </form>
    </Modal>
  )
}
