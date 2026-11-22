// Séances: ordered lists of clips for the players (a video session, a scouting report, a recruitment reel).
// Create, rename, write a note, add clips, reorder them by drag or with the arrows, and launch the session.
import { memo, useState, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, GripVertical, MonitorPlay, Plus, Trash2, X } from 'lucide-react'
import { useT } from '../../../../i18n'
import { cx } from '../../../../lib/util'
import type { Clip, Playlist } from '../../../../lib/types'
import { fmtT } from './model'

export const PlaylistsPanel = memo(function PlaylistsPanel({ projectId, playlists, clips, titleOf, open, onOpen, onCreate, onUpdate, onDelete, onPick, onPlayClip }: {
  projectId: string
  playlists: Playlist[]
  clips: Map<string, Clip>
  titleOf: (c: Clip) => string
  open: string | null
  onOpen: (id: string | null) => void
  onCreate: () => void
  onUpdate: (id: string, patch: Partial<Playlist>) => void
  onDelete: (id: string) => void
  onPick: (id: string) => void
  onPlayClip: (c: Clip) => void
}) {
  const { t, lang } = useT('editor')
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)
  const minutes = (ids: string[]) => {
    const s = ids.map((id) => clips.get(id)).reduce((n, c) => n + (c ? c.end - c.start : 0), 0)
    return s < 60 ? t('pl.seconds', { n: Math.round(s) }) : t('pl.minutes', { n: (Math.round(s / 6) / 10).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US') })
  }
  const move = (p: Playlist, from: number, to: number) => {
    if (to < 0 || to >= p.clipIds.length || from === to) return
    const ids = [...p.clipIds]; const [x] = ids.splice(from, 1); ids.splice(to, 0, x)
    onUpdate(p.id, { clipIds: ids })
  }
  return (
    <section aria-labelledby="pl-h">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="pl-h" className="font-display text-[17px] font-semibold text-ink">{t('pl.title')} <span className="text-sm font-normal text-ink-faint">{playlists.length}</span></h3>
        <button type="button" className="btn-primary btn-sm" onClick={onCreate}><Plus size={15} />{t('pl.new')}</button>
      </div>
      <p className="mt-1 text-[12.5px] text-ink-muted">{t('pl.hint')}</p>
      {playlists.length === 0 && <p className="mt-3 text-sm text-ink-muted">{t('pl.empty')}</p>}
      <ul className="mt-3 space-y-2.5">
        {playlists.map((p) => {
          const isOpen = open === p.id
          const items = p.clipIds.map((id) => clips.get(id)).filter((c): c is Clip => !!c)
          return (
            <li key={p.id} className={cx('rounded-card border bg-paper', isOpen ? 'border-forest-300' : 'border-line')}>
              <div className="flex items-start gap-2 p-3">
                <button type="button" onClick={() => onOpen(isOpen ? null : p.id)} aria-expanded={isOpen} className="min-h-[44px] min-w-0 flex-1 text-left">
                  <span className="block text-[14.5px] font-semibold leading-snug text-ink">{p.title}</span>
                  <span className="mt-0.5 block text-[12.5px] text-ink-muted">{t('pl.count', { count: items.length, n: items.length })}, {minutes(p.clipIds)}</span>
                </button>
                <button type="button" onClick={() => onOpen(isOpen ? null : p.id)} aria-label={t(isOpen ? 'pl.close' : 'pl.open')} className="grid h-11 w-9 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-sand">{isOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</button>
              </div>
              <div className="flex flex-wrap gap-2 px-3 pb-3">
                <Link to={`/app/analyse/video/${projectId}/seance?p=${p.id}`} aria-disabled={!items.length} onClick={(e) => { if (!items.length) e.preventDefault() }}
                  className={cx('btn-primary btn-sm', !items.length && 'pointer-events-none opacity-50')}><MonitorPlay size={15} />{t('pl.launch')}</Link>
                {isOpen && <button type="button" className="btn-outline btn-sm" onClick={() => onPick(p.id)}><Plus size={15} />{t('pl.addClips')}</button>}
              </div>
              {isOpen && (
                <div className="border-t border-line px-3 pb-3 pt-2.5">
                  <label className="block text-[12.5px] font-semibold text-ink-muted" htmlFor={`pl-t-${p.id}`}>{t('pl.name')}</label>
                  <input key={`t-${p.title}`} id={`pl-t-${p.id}`} className="input mt-1" defaultValue={p.title} maxLength={120}
                    onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== p.title) onUpdate(p.id, { title: v }); else e.target.value = p.title }}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
                  <label className="mt-2.5 block text-[12.5px] font-semibold text-ink-muted" htmlFor={`pl-n-${p.id}`}>{t('pl.note')}</label>
                  <textarea key={`n-${p.note ?? ''}`} id={`pl-n-${p.id}`} className="input mt-1 min-h-[64px]" defaultValue={p.note ?? ''} maxLength={800} placeholder={t('pl.notePh')}
                    onBlur={(e) => { const v = e.target.value.trim(); if (v !== (p.note ?? '')) onUpdate(p.id, { note: v || undefined }) }} />
                  <div className="mt-3 text-[12.5px] font-semibold text-ink-muted">{t('pl.order')}</div>
                  {items.length === 0 ? <p className="mt-1 text-[13px] text-ink-muted">{t('pl.noClips')}</p> : (
                    <ol className="mt-1 space-y-1">
                      {p.clipIds.map((id, i) => {
                        const c = clips.get(id)
                        if (!c) return null
                        return (
                          <li key={id} draggable
                            onDragStart={(e: DragEvent) => { setDragFrom(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)) }}
                            onDragOver={(e: DragEvent) => { e.preventDefault(); setOver(i) }}
                            onDragLeave={() => setOver((o) => (o === i ? null : o))}
                            onDrop={(e: DragEvent) => { e.preventDefault(); if (dragFrom != null) move(p, dragFrom, i); setDragFrom(null); setOver(null) }}
                            onDragEnd={() => { setDragFrom(null); setOver(null) }}
                            className={cx('flex items-center gap-1 rounded-xl border bg-paper py-1 pl-1 pr-1', over === i && dragFrom !== i ? 'border-forest-600' : 'border-line', dragFrom === i && 'opacity-50')}>
                            <span className="grid h-10 w-6 shrink-0 cursor-grab place-items-center text-ink-faint" aria-hidden="true"><GripVertical size={16} /></span>
                            <span className="w-5 shrink-0 text-[12.5px] font-bold tabular-nums text-ink-muted">{i + 1}</span>
                            <button type="button" onClick={() => onPlayClip(c)} className="min-h-[40px] min-w-0 flex-1 text-left">
                              <span className="block truncate text-[13.5px] font-semibold text-ink">{titleOf(c)}</span>
                              <span className="block text-[11.5px] tabular-nums text-ink-faint">{t('clips.range', { a: fmtT(c.start), b: fmtT(c.end) })}</span>
                            </button>
                            <button type="button" onClick={() => move(p, i, i - 1)} disabled={i === 0} aria-label={t('pl.up')} className="grid h-10 w-8 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-sand disabled:opacity-30"><ArrowUp size={15} /></button>
                            <button type="button" onClick={() => move(p, i, i + 1)} disabled={i === p.clipIds.length - 1} aria-label={t('pl.down')} className="grid h-10 w-8 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-sand disabled:opacity-30"><ArrowDown size={15} /></button>
                            <button type="button" onClick={() => onUpdate(p.id, { clipIds: p.clipIds.filter((x) => x !== id) })} aria-label={t('pl.remove')} className="grid h-10 w-8 shrink-0 place-items-center rounded-lg text-ink-faint hover:bg-sand hover:text-clay-600"><X size={15} /></button>
                          </li>
                        )
                      })}
                    </ol>
                  )}
                  <div className="mt-3 flex justify-end">
                    {confirm === p.id ? (
                      <span className="flex items-center gap-2 text-[13px]">
                        <span className="text-ink-soft">{t('pl.deleteAsk')}</span>
                        <button type="button" className="btn-ghost btn-sm" onClick={() => setConfirm(null)}>{t('common:actions.cancel')}</button>
                        <button type="button" className="btn-danger btn-sm" onClick={() => { setConfirm(null); onDelete(p.id) }}>{t('pl.delete')}</button>
                      </span>
                    ) : <button type="button" className="btn-ghost btn-sm text-clay-600" onClick={() => setConfirm(p.id)}><Trash2 size={14} />{t('pl.delete')}</button>}
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
})
