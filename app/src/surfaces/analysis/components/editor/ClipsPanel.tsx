// Clips: the form of the clip being made (in and out points, title, note, players) and the list of clips,
// the automatic ones (every goal and shot) and the coach's own, with filters and actions.
import { memo, useMemo, useState, type ReactNode } from 'react'
import { Copy, CopyPlus, Download, ListPlus, Pencil, Play, Plus, Scissors, Trash2, X } from 'lucide-react'
import { useT } from '../../../../i18n'
import { cx } from '../../../../lib/util'
import type { Clip, Player } from '../../../../lib/types'
import { fmtT, fmtTenth } from './model'

export interface ClipDraft { id?: string; start: number; end: number; title: string; note: string; playerIds: string[] }

const dur = (s: number, lang: 'fr' | 'en') => `${(Math.round(s * 10) / 10).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US')} s`

export function ClipEditor({ draft, onChange, squad, onIn, onOut, onPreview, onSave, onCancel, wide }: {
  draft: ClipDraft
  onChange: (d: ClipDraft) => void
  squad: Player[]
  onIn: () => void
  onOut: () => void
  onPreview: () => void
  onSave: () => void
  onCancel: () => void
  wide: boolean
}) {
  const { t, lang } = useT('editor')
  const [all, setAll] = useState(false)
  const shownPlayers = all || squad.length <= 14 ? squad : squad.filter((p) => draft.playerIds.includes(p.id) || squad.indexOf(p) < 14)
  const ok = draft.end - draft.start >= 0.5
  return (
    <form className="rounded-card border border-sun-300 bg-sun-50/60 p-3" onSubmit={(e) => { e.preventDefault(); if (ok) onSave() }} aria-label={t(draft.id ? 'clips.editTitle' : 'clips.newTitle')}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-[16px] font-semibold text-ink">{t(draft.id ? 'clips.editTitle' : 'clips.newTitle')}</h3>
        <button type="button" onClick={onCancel} aria-label={t('clips.cancel')} className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted hover:bg-sand"><X size={17} /></button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <InOut label={t('clips.in')} value={fmtTenth(draft.start)} action={t('clips.setIn')} kbd={wide ? 'I' : undefined} onClick={onIn} />
        <InOut label={t('clips.out')} value={fmtTenth(draft.end)} action={t('clips.setOut')} kbd={wide ? 'O' : undefined} onClick={onOut} />
      </div>
      <p className="mt-1.5 text-[12px] text-ink-muted">{t('clips.length', { d: dur(draft.end - draft.start, lang) })} {t('clips.handles')}</p>
      <label className="mt-2.5 block text-[12.5px] font-semibold text-ink-muted" htmlFor="nj-clip-title">{t('clips.titleLabel')}</label>
      <input id="nj-clip-title" className="input mt-1" value={draft.title} maxLength={120} onChange={(e) => onChange({ ...draft, title: e.target.value })} placeholder={t('clips.titlePh')} />
      <label className="mt-2.5 block text-[12.5px] font-semibold text-ink-muted" htmlFor="nj-clip-note">{t('clips.noteLabel')}</label>
      <textarea id="nj-clip-note" className="input mt-1 min-h-[64px]" value={draft.note} maxLength={600} onChange={(e) => onChange({ ...draft, note: e.target.value })} placeholder={t('clips.notePh')} />
      {squad.length > 0 && (
        <div className="mt-2.5">
          <div className="text-[12.5px] font-semibold text-ink-muted">{t('clips.players')}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {shownPlayers.map((p) => {
              const on = draft.playerIds.includes(p.id)
              return (
                <button key={p.id} type="button" aria-pressed={on} title={p.name}
                  onClick={() => onChange({ ...draft, playerIds: on ? draft.playerIds.filter((x) => x !== p.id) : [...draft.playerIds, p.id] })}
                  className={cx('chip min-h-[36px] cursor-pointer', on && 'chip-on')}>
                  {p.number != null && <b className="tabular-nums">{p.number}</b>}{p.name.split(/\s+/).slice(-1)[0]}
                </button>
              )
            })}
            {!all && squad.length > 14 && <button type="button" className="chip min-h-[36px] cursor-pointer" onClick={() => setAll(true)}>{t('clips.morePlayers', { n: squad.length - 14 })}</button>}
          </div>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="submit" className="btn-primary btn-sm" disabled={!ok}>{t('clips.save')}</button>
        <button type="button" className="btn-outline btn-sm" onClick={onPreview}><Play size={14} />{t('clips.preview')}</button>
      </div>
    </form>
  )
}

function InOut({ label, value, action, kbd, onClick }: { label: string; value: string; action: string; kbd?: string; onClick: () => void }) {
  return (
    <div className="rounded-xl bg-paper p-2 ring-1 ring-line">
      <div className="text-[11.5px] font-semibold text-ink-muted">{label}</div>
      <div className="font-display text-[18px] font-semibold tabular-nums text-ink">{value}</div>
      <button type="button" onClick={onClick} className="mt-1 inline-flex min-h-[36px] items-center gap-1.5 text-[12.5px] font-semibold text-forest-700">
        {action}{kbd && <kbd className="rounded border border-line px-1 font-sans text-[10.5px] leading-4 text-ink-faint">{kbd}</kbd>}
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ list */

type Filter = 'all' | 'auto' | 'mine'

export const ClipList = memo(function ClipList({ clips, titleOf, players, selected, native, linkPlatform, canExport, onSelect, onEdit, onDuplicate, onDelete, onAddTo, onExport, onCopyLink, onCreate, onExportJson }: {
  clips: Clip[]
  titleOf: (c: Clip) => string
  players: Map<string, Player>
  selected: string | null
  native: boolean
  linkPlatform: boolean
  canExport: boolean
  onSelect: (c: Clip) => void
  onEdit: (c: Clip) => void
  onDuplicate: (c: Clip) => void
  onDelete: (c: Clip) => void
  onAddTo: (c: Clip) => void
  onExport: (c: Clip) => void
  onCopyLink: (c: Clip) => void
  onCreate: () => void
  onExportJson: () => void
}) {
  const { t, lang } = useT('editor')
  const [filter, setFilter] = useState<Filter>('all')
  const [player, setPlayer] = useState('')
  const inClips = useMemo(() => {
    const ids = new Set(clips.flatMap((c) => c.playerIds ?? []))
    return [...players.values()].filter((p) => ids.has(p.id)).sort((a, b) => (a.number ?? 99) - (b.number ?? 99))
  }, [clips, players])
  const list = clips.filter((c) => (filter === 'all' || (filter === 'auto' ? c.auto : !c.auto)) && (!player || (c.playerIds ?? []).includes(player)))
  const nAuto = clips.filter((c) => c.auto).length
  return (
    <section data-tour="studio-clips" aria-labelledby="clips-h">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="clips-h" className="font-display text-[17px] font-semibold text-ink">{t('clips.title')} <span className="text-sm font-normal text-ink-faint">{clips.length}</span></h3>
        <button type="button" className="btn-primary btn-sm" onClick={onCreate}><Scissors size={15} />{t('clips.create')}</button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label={t('clips.filter')}>
        {(['all', 'auto', 'mine'] as Filter[]).map((f) => (
          <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={cx('chip min-h-[36px] shrink-0 cursor-pointer px-3', filter === f && 'chip-on')}>
            {t(`clips.f.${f}`)}{f === 'auto' && nAuto > 0 && <span className="tabular-nums opacity-70">{nAuto}</span>}
          </button>
        ))}
        {inClips.length > 0 && (
          <select aria-label={t('clips.byPlayer')} value={player} onChange={(e) => setPlayer(e.target.value)} className="input min-h-[36px] w-auto max-w-full py-1 text-[13px]">
            <option value="">{t('clips.anyPlayer')}</option>
            {inClips.map((p) => <option key={p.id} value={p.id}>{p.number != null ? `${p.number}. ` : ''}{p.name}</option>)}
          </select>
        )}
      </div>
      {list.length === 0 ? <p className="mt-2 text-sm text-ink-muted">{clips.length ? t('clips.noneFiltered') : t('clips.empty')}</p> : (
        <ul className="-mx-1 mt-1 divide-y divide-line/70">
          {list.map((c) => {
            const on = selected === c.id
            const who = (c.playerIds ?? []).map((id) => players.get(id)).filter((p): p is Player => !!p)
            return (
              <li key={c.id} className={cx('rounded-xl px-1 py-1.5', on && 'bg-forest-50')}>
                <button type="button" onClick={() => onSelect(c)} aria-expanded={on} className="flex min-h-[48px] w-full items-center gap-2.5 text-left">
                  <span className="relative grid h-11 w-[72px] shrink-0 place-items-center overflow-hidden rounded-lg bg-night-800 text-cream">
                    {c.drawing ? <img src={c.drawing} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" /> : null}
                    <span className="relative grid h-7 w-7 place-items-center rounded-full bg-black/45"><Play size={13} fill="currentColor" /></span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-ink">{titleOf(c)}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-ink-muted">
                      <span className="tabular-nums">{t('clips.range', { a: fmtT(c.start), b: fmtT(c.end) })}</span>
                      <span className="tabular-nums text-ink-faint">{dur(c.end - c.start, lang)}</span>
                      {c.auto && <span className="rounded-full bg-forest-50 px-1.5 text-[11px] font-semibold text-forest-700 ring-1 ring-forest-100">{t('clips.auto')}</span>}
                      {who.map((p) => <span key={p.id} className="font-semibold tabular-nums text-forest-700" title={p.name}>{p.number ?? p.name.split(' ')[0]}</span>)}
                    </span>
                  </span>
                </button>
                {on && (
                  <div className="mt-1.5 pl-1">
                    {c.note && <p className="mb-1.5 text-[13px] leading-snug text-ink-soft">{c.note}</p>}
                    <div className="flex flex-wrap gap-1.5">
                      {c.auto
                        ? <Act icon={<CopyPlus size={14} />} onClick={() => onDuplicate(c)}>{t('clips.duplicate')}</Act>
                        : <Act icon={<Pencil size={14} />} onClick={() => onEdit(c)}>{t('clips.edit')}</Act>}
                      <Act icon={<ListPlus size={14} />} onClick={() => onAddTo(c)}>{t('clips.addTo')}</Act>
                      {native && canExport && <Act icon={<Download size={14} />} onClick={() => onExport(c)}>{t('clips.export')}</Act>}
                      {linkPlatform && <Act icon={<Copy size={14} />} onClick={() => onCopyLink(c)}>{t('clips.copyLink')}</Act>}
                      {!c.auto && <Act icon={<Trash2 size={14} />} onClick={() => onDelete(c)} danger>{t('clips.delete')}</Act>}
                    </div>
                    {c.auto && <p className="mt-1.5 text-[11.5px] text-ink-faint">{t('clips.autoHint')}</p>}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
        <button type="button" className="btn-ghost btn-sm" onClick={onCreate}><Plus size={15} />{t('clips.create')}</button>
        <button type="button" className="btn-ghost btn-sm" onClick={onExportJson} disabled={!clips.length}><Download size={15} />{t('clips.exportJson')}</button>
      </div>
    </section>
  )
})

function Act({ icon, children, onClick, danger = false }: { icon: ReactNode; children: ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cx('inline-flex min-h-[36px] items-center gap-1.5 rounded-[10px] border bg-paper px-2.5 text-[12.5px] font-semibold transition', danger ? 'border-line text-clay-600 hover:border-clay-300' : 'border-line text-ink hover:border-ink-faint')}>
      {icon}{children}
    </button>
  )
}
