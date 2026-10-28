import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Clapperboard, FileVideo, Image as ImageIcon, Plus, Trash2, Video } from 'lucide-react'
import { db } from '../../lib/db'
import { useDocumentTitle, useLiveQuery } from '../../lib/hooks'
import { useSession } from '../../lib/session'
import { useT } from '../../i18n'
import { BRAND } from '../../lib/config'
import { fmtClock, fmtDate, nowISO, uid } from '../../lib/util'
import { computeNjangi, njangiLabel } from '../../lib/njangi'
import type { Match, VideoProject } from '../../lib/types'
import { EmptyState, Field, Modal, PageHeader } from '../../ui'
import { MiniDial } from './components/charts'

export default function VideoList() {
  const { t, lang } = useT('analysis')
  const navigate = useNavigate()
  const { team } = useSession()
  useDocumentTitle(t('video.title'))
  const projects = useLiveQuery(() => db.videos.orderBy('createdAt').reverse().toArray(), [], undefined as VideoProject[] | undefined)
  const matches = useLiveQuery(() => db.matches.toArray(), [], [] as Match[])
  const [creating, setCreating] = useState(false)
  const [toDelete, setToDelete] = useState<VideoProject | null>(null)
  const byId = useMemo(() => new Map(matches.map((m) => [m.id, m])), [matches])

  const create = async (title: string, matchId?: string) => {
    const v: VideoProject = { id: uid('vp_'), title, matchId, tags: [], createdAt: nowISO() }
    await db.videos.put(v)
    navigate(`/app/analyse/video/${v.id}`)
  }

  const header = (
    <PageHeader eyebrow={t('video.eyebrow')} title={t('video.title')} subtitle={t('video.subtitle')}
      actions={<button type="button" onClick={() => setCreating(true)} className="btn-primary btn-lg"><Plus size={18} />{t('video.new')}</button>} />
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
            const visible = p.tags.filter((x) => !x.id.includes('~'))
            const r = computeNjangi(p.tags)
            const images = p.tags.filter((x) => x.drawing).length
            return (
              <div key={p.id} className="card group relative flex items-start gap-3 p-4 transition hover:border-forest-300">
                {r.tagged > 0 ? <MiniDial value={r.total} size={52} /> : <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-terra-50 text-terra-600"><Video size={20} /></span>}
                <div className="min-w-0 flex-1">
                  <Link to={`/app/analyse/video/${p.id}`} className="block text-[16px] font-semibold leading-snug text-ink after:absolute after:inset-0 after:rounded-2xl after:content-['']">{p.title}</Link>
                  <div className="mt-0.5 text-[12.5px] text-ink-muted">
                    {m ? `${fmtDate(m.date, lang, { day: 'numeric', month: 'short' })} · ${t('common:app.vs')} ${m.opponent}` : fmtDate(p.createdAt.slice(0, 10), lang, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-faint">
                    <span className="inline-flex items-center gap-1"><FileVideo size={13} />{p.fileName ?? t('video.noFile')}</span>
                    {p.duration ? <span>{t('video.duration', { d: fmtClock(p.duration) })}</span> : null}
                    <span>{t('video.tags', { n: visible.length })}</span>
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

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        {(['film', 'tag', 'draw'] as const).map((k, i) => (
          <div key={k} className="rounded-2xl border border-line bg-paper/70 p-4">
            <div className="font-display text-2xl font-semibold text-terra-500">{i + 1}</div>
            <div className="mt-1 text-[14.5px] font-semibold text-ink">{t(`video.how.${k}.title`)}</div>
            <p className="mt-0.5 text-[13px] leading-relaxed text-ink-muted">{t(`video.how.${k}.body`)}</p>
          </div>
        ))}
      </section>

      <NewProject open={creating} onClose={() => setCreating(false)} matches={matches} teamName={team?.name} onCreate={create} />

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

function NewProject({ open, onClose, matches, teamName, onCreate }: { open: boolean; onClose: () => void; matches: Match[]; teamName?: string; onCreate: (title: string, matchId?: string) => void }) {
  const { t, lang } = useT('analysis')
  const [title, setTitle] = useState('')
  const [matchId, setMatchId] = useState('')
  const sorted = [...matches].sort((a, b) => b.date.localeCompare(a.date))
  const pickMatch = (id: string) => {
    setMatchId(id)
    const m = matches.find((x) => x.id === id)
    if (m && !title.trim()) setTitle(`${teamName ?? t('live.us')} ${t('common:app.vs')} ${m.opponent}`)
  }
  const submit = (e: FormEvent) => { e.preventDefault(); const v = title.trim(); if (!v) return; onCreate(v, matchId || undefined); setTitle(''); setMatchId('') }
  return (
    <Modal open={open} onClose={onClose} title={t('video.newTitle')}
      footer={<>
        <button type="button" className="btn-ghost" onClick={onClose}>{t('common:actions.cancel')}</button>
        <button type="submit" form="nj-newvideo" className="btn-primary" disabled={!title.trim()}><Plus size={16} />{t('video.create')}</button>
      </>}>
      <form id="nj-newvideo" onSubmit={submit}>
        <Field label={t('video.linkedMatch')} htmlFor="nj-vmatch">
          <select id="nj-vmatch" className="input" value={matchId} onChange={(e) => pickMatch(e.target.value)}>
            <option value="">{t('video.noMatch')}</option>
            {sorted.map((m) => <option key={m.id} value={m.id}>{fmtDate(m.date, lang, { day: 'numeric', month: 'short' })} · {t('common:app.vs')} {m.opponent}</option>)}
          </select>
        </Field>
        <Field label={t('video.projectTitle')} htmlFor="nj-vtitle-new">
          <input id="nj-vtitle-new" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('video.projectTitlePh')} autoFocus />
        </Field>
        <p className="text-[13px] text-ink-muted">{t('video.newHint')}</p>
      </form>
    </Modal>
  )
}
