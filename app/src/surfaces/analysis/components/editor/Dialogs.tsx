// The editor's dialogs: exporting a clip, adding a clip to a session, choosing the clips of a session,
// the keyboard shortcuts.
import { useEffect, useRef, useState } from 'react'
import { Check, Download, Plus } from 'lucide-react'
import { Modal } from '../../../../ui'
import { useT } from '../../../../i18n'
import { cx } from '../../../../lib/util'
import type { Clip, Playlist } from '../../../../lib/types'
import { exportClip, type ExportJob } from './exportClip'
import { fmtT } from './model'

/* ------------------------------------------------------------------ export */

export function ExportDialog({ clip, title, subtitle, src, brand, fileBase, onClose }: { clip: Clip | null; title: string; subtitle?: string; src: string; brand: string; fileBase: string; onClose: () => void }) {
  const { t, lang } = useT('editor')
  const [p, setP] = useState(0)
  const [state, setState] = useState<'run' | 'done' | 'fail'>('run')
  const [file, setFile] = useState<{ url: string; name: string; size: number } | null>(null)
  const job = useRef<ExportJob | null>(null)
  useEffect(() => {
    if (!clip) return
    setP(0); setState('run'); setFile(null)
    const j = exportClip({ src, start: clip.start, end: clip.end, title, subtitle, brand, drawing: clip.drawing, onProgress: setP })
    job.current = j
    let alive = true
    j.done.then((r) => {
      if (!alive) return
      if (!r) { setState('fail'); return }
      const name = `${fileBase}.${r.ext}`
      const url = URL.createObjectURL(r.blob)
      setFile({ url, name, size: r.blob.size })
      setState('done')
      const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove()
    })
    return () => { alive = false; j.cancel() }
  }, [clip?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (file) URL.revokeObjectURL(file.url) }, [file])
  const close = () => { job.current?.cancel(); onClose() }
  if (!clip) return null
  const mb = file ? (file.size / 1048576).toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) : ''
  return (
    <Modal open onClose={close} title={t('export.title')}
      footer={state === 'run'
        ? <button type="button" className="btn-outline" onClick={close}>{t('export.cancel')}</button>
        : <>
          {file && <a className="btn-outline" href={file.url} download={file.name}><Download size={16} />{t('export.again')}</a>}
          <button type="button" className="btn-primary" onClick={onClose}>{t('common:actions.close')}</button>
        </>}>
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      <p className="mt-0.5 text-[13px] text-ink-muted">{t('clips.range', { a: fmtT(clip.start), b: fmtT(clip.end) })}</p>
      {state === 'run' && (
        <div className="mt-4" role="status">
          <div className="flex justify-between text-[13px] font-semibold text-ink-soft"><span>{t('export.running')}</span><span className="tabular-nums">{lang === 'en' ? `${Math.round(p * 100)}%` : `${Math.round(p * 100)} %`}</span></div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sand"><div className="h-full rounded-full bg-forest-600 transition-[width]" style={{ width: `${Math.max(2, p * 100)}%` }} /></div>
          <p className="mt-2 text-[12.5px] text-ink-muted">{t('export.realtime')}</p>
        </div>
      )}
      {state === 'done' && file && <p className="mt-4 rounded-xl bg-forest-50 px-3 py-2 text-[13.5px] text-forest-700" role="status">{t('export.done', { name: file.name, mb })}</p>}
      {state === 'fail' && <p className="mt-4 rounded-xl bg-clay-50 px-3 py-2 text-[13.5px] text-clay-700" role="alert">{t('export.fail')}</p>}
      <p className="mt-3 text-[12px] text-ink-faint">{t(clip.drawing ? 'export.noSound' : 'export.noSoundPlain')}</p>
    </Modal>
  )
}

/* ------------------------------------------------------------------ add a clip to a session */

export function AddToPlaylist({ clip, playlists, onAdd, onCreate, onClose }: { clip: Clip | null; playlists: Playlist[]; onAdd: (playlistId: string) => void; onCreate: (title: string) => void; onClose: () => void }) {
  const { t } = useT('editor')
  const [name, setName] = useState('')
  if (!clip) return null
  return (
    <Modal open onClose={onClose} title={t('pl.addToTitle')}>
      {playlists.length > 0 && (
        <ul className="-mx-1 divide-y divide-line/70">
          {playlists.map((p) => {
            const has = p.clipIds.includes(clip.id)
            return (
              <li key={p.id}>
                <button type="button" disabled={has} onClick={() => onAdd(p.id)} className="flex min-h-[48px] w-full items-center gap-2 rounded-lg px-1 text-left hover:bg-sand disabled:opacity-60">
                  <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">{p.title}</span>
                  {has ? <span className="inline-flex items-center gap-1 text-[12.5px] text-forest-700"><Check size={14} />{t('pl.already')}</span> : <Plus size={16} className="text-ink-muted" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (name.trim()) onCreate(name.trim()) }}>
        <label className="sr-only" htmlFor="nj-newpl">{t('pl.newName')}</label>
        <input id="nj-newpl" className="input min-w-0 flex-1" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('pl.newName')} />
        <button type="submit" className="btn-primary shrink-0" disabled={!name.trim()}><Plus size={16} />{t('pl.create')}</button>
      </form>
    </Modal>
  )
}

/* ------------------------------------------------------------------ choose the clips of a session */

export function ClipPicker({ playlist, clips, titleOf, onSave, onClose }: { playlist: Playlist | null; clips: Clip[]; titleOf: (c: Clip) => string; onSave: (ids: string[]) => void; onClose: () => void }) {
  const { t } = useT('editor')
  const [sel, setSel] = useState<string[]>([])
  useEffect(() => { if (playlist) setSel(playlist.clipIds) }, [playlist?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!playlist) return null
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  return (
    <Modal open onClose={onClose} title={t('pl.pickTitle', { name: playlist.title })}
      footer={<>
        <button type="button" className="btn-ghost" onClick={onClose}>{t('common:actions.cancel')}</button>
        <button type="button" className="btn-primary" onClick={() => onSave(sel)}>{t('pl.pickSave', { count: sel.length, n: sel.length })}</button>
      </>}>
      {clips.length === 0 ? <p className="text-sm text-ink-muted">{t('clips.empty')}</p> : (
        <ul className="-mx-1 divide-y divide-line/70">
          {clips.map((c) => {
            const on = sel.includes(c.id)
            return (
              <li key={c.id}>
                <label className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-lg px-1 hover:bg-sand">
                  <input type="checkbox" checked={on} onChange={() => toggle(c.id)} className="h-4 w-4 shrink-0 accent-forest-600" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-ink">{titleOf(c)}</span>
                    <span className="block text-[12px] tabular-nums text-ink-muted">{t('clips.range', { a: fmtT(c.start), b: fmtT(c.end) })}{c.auto ? `, ${t('clips.auto')}` : ''}</span>
                  </span>
                  {on && <span className="text-[12px] font-bold tabular-nums text-forest-700">{sel.indexOf(c.id) + 1}</span>}
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}

/* ------------------------------------------------------------------ keyboard */

export function ShortcutsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT('editor')
  const rows: [string, string][] = [
    ['Espace', 'keys.play'], ['← →', 'keys.seek'], ['⇧ ← →', 'keys.jump'], [', .', 'keys.frame'],
    ['1 … 9, F S L K R, A B, Q W E', 'keys.codes'], ['C X P T G', 'keys.sp'], ['⇧ C X P T G', 'keys.spThem'],
    ['M', 'keys.place'], ['N', 'keys.note'], ['I O', 'keys.inout'], ['D', 'keys.draw'], ['U', 'keys.useful'],
    ['+ - 0', 'keys.zoom'], ['?', 'keys.help'],
  ]
  return (
    <Modal open={open} onClose={onClose} title={t('keys.title')}>
      <dl className="divide-y divide-line/70">
        {rows.map(([k, label]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-2">
            <dt className="text-[14px] text-ink-soft">{t(label)}</dt>
            <dd><kbd className={cx('rounded-md border border-line bg-sand px-2 py-0.5 font-sans text-[12.5px] font-semibold text-ink')}>{k === 'Espace' ? t('keys.space') : k}</kbd></dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[12.5px] text-ink-muted">{t('keys.placeHint')}</p>
    </Modal>
  )
}
