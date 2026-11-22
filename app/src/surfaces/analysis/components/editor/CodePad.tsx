// The coding pad of the studio: the Njangi codes by group, the set pieces for us and for them,
// a note, and the « Placer sur le terrain » switch. Every button codes at the current video time.
import { memo, useState, type ReactNode, type RefObject } from 'react'
import { ChevronDown, MapPin, StickyNote, Trash2 } from 'lucide-react'
import { useT } from '../../../../i18n'
import { cx } from '../../../../lib/util'
import type { Player } from '../../../../lib/types'
import { defFor, GROUP_ORDER, markInk, NOTE_DEF, TAGS, type TagDef } from '../codes'
import { colorOf, fmtT, groupOf, labelKey, SET_DEFS, setDef, type Coded, type Group, type SetDef } from './model'

export const CodePad = memo(function CodePad({ canCode, counts, onCode, onSet, wide, placeMode, onPlaceMode, note, onNote, onAddNote, noteRef, hint, children }: {
  canCode: boolean
  counts: Map<string, number>
  onCode: (d: TagDef) => void
  onSet: (d: SetDef) => void
  wide: boolean
  placeMode: boolean
  onPlaceMode: (v: boolean) => void
  note: string
  onNote: (v: string) => void
  onAddNote: () => void
  noteRef: RefObject<HTMLInputElement>
  hint: string
  /** the placement panel, shown between the switch and the codes */
  children?: ReactNode
}) {
  const { t } = useT('editor')
  return (
    <div data-tour="studio-codes">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2.5">
          <button type="button" role="switch" aria-checked={placeMode} onClick={() => onPlaceMode(!placeMode)}
            className={cx('relative h-6 w-11 shrink-0 rounded-full transition-colors', placeMode ? 'bg-forest-600' : 'bg-line')}>
            <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white ring-1 ring-black/5 transition-[left]', placeMode ? 'left-[22px]' : 'left-0.5')} />
          </button>
          <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink"><MapPin size={15} className="text-forest-600" />{t('place.toggle')}</span>
          {wide && <Kbd>M</Kbd>}
        </label>
        <span className="text-[12px] text-ink-faint">{hint}</span>
      </div>
      {children}
      <div className="mt-3 space-y-3">
        {GROUP_ORDER.map((g) => (
          <div key={g}>
            <div className="mb-1.5 text-[13px] font-semibold text-ink-muted">{t(`analysis:groups.${g}`)}</div>
            <div className="flex flex-wrap gap-1.5">
              {TAGS.filter((x) => x.group === g).map((x) => (
                <CodeBtn key={x.key} label={t(`analysis:short.${x.key}`)} title={`${t(`analysis:help.${x.key}`)} (${x.kbd})`} icon={<x.icon size={16} className={markInk(x.color)} />} color={x.color}
                  n={counts.get(x.key) ?? 0} kbd={wide ? x.kbd : undefined} disabled={!canCode} onClick={() => onCode(x)} />
              ))}
            </div>
          </div>
        ))}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px] font-semibold text-ink-muted"><span>{t('sp.title')}</span><span className="text-[11.5px] font-normal text-ink-faint">{t('sp.hint')}</span></div>
          {(['us', 'them'] as const).map((side) => (
            <div key={side} className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span className="w-10 shrink-0 text-[12px] font-semibold text-ink-faint">{t(side === 'us' ? 'sp.rowUs' : 'sp.rowThem')}</span>
              {SET_DEFS.filter((d) => d.side === side).map((d) => (
                <CodeBtn key={d.key} label={t(`sp.name.${d.code}`)} title={t(`sp.${side}.${d.code}`)} icon={<d.icon size={15} className={markInk(d.color)} />} color={d.color}
                  n={counts.get(d.key) ?? 0} kbd={wide ? d.kbd : undefined} disabled={!canCode} onClick={() => onSet(d)} small />
              ))}
            </div>
          ))}
        </div>
        <div>
          <div className="mb-1.5 text-[13px] font-semibold text-ink-muted">{t('analysis:groups.note')}</div>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); onAddNote() }}>
            <label className="sr-only" htmlFor="nj-note">{t('note.ph')}</label>
            <input id="nj-note" ref={noteRef} className="input min-w-0 flex-1" value={note} onChange={(e) => onNote(e.target.value)} placeholder={t('note.ph')} disabled={!canCode} />
            <button type="submit" disabled={!canCode} aria-label={t('note.add')} className="btn-outline min-h-[44px] shrink-0"><StickyNote size={16} /><span className="hidden sm:inline">{t('note.add')}</span></button>
          </form>
        </div>
      </div>
    </div>
  )
})

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-line px-1 font-sans text-[10.5px] font-semibold leading-4 text-ink-faint">{children}</kbd>
}

function CodeBtn({ label, title, icon, color, n, kbd, disabled, onClick, small = false }: { label: string; title: string; icon: ReactNode; color: string; n: number; kbd?: string; disabled: boolean; onClick: () => void; small?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} title={title}
      className={cx('inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-line bg-paper py-1.5 pl-1.5 font-semibold text-ink transition hover:border-ink-faint active:scale-[0.98] disabled:opacity-45', small ? 'pr-2.5 text-[13px]' : 'pr-3 text-[13.5px]')}>
      <span className={cx('grid shrink-0 place-items-center rounded-lg ring-1 ring-inset ring-black/5', small ? 'h-7 w-7' : 'h-8 w-8')} style={{ background: color }}>{icon}</span>
      {label}
      {n > 0 && <span className="text-[12px] font-medium tabular-nums text-ink-faint">×{n}</span>}
      {kbd && <Kbd>{kbd}</Kbd>}
    </button>
  )
}

/* ------------------------------------------------------------------ the list of coded actions */

const PAGE = 120

export const CodedList = memo(function CodedList({ items, all, players, selected, onGo, onPlace, onDelete, onImage, wide }: {
  items: Coded[]
  /** every coded item, children included (to show what a code added with it) */
  all: Coded[]
  players: Map<string, Player>
  selected: string | null
  onGo: (c: Coded) => void
  onPlace: (c: Coded) => void
  onDelete: (c: Coded) => void
  onImage: (c: Coded) => void
  wide: boolean
}) {
  const { t } = useT('editor')
  const [filter, setFilter] = useState<'all' | Group>('all')
  const [shown, setShown] = useState(PAGE)
  const present = (['possession', 'danger', 'fixation', 'transition', 'setpiece', 'opponent', 'note'] as Group[]).filter((g) => items.some((x) => groupOf(x.code, x.side) === g))
  const list = items.filter((x) => filter === 'all' || groupOf(x.code, x.side) === filter)
  const kidsOf = (id: string) => all.filter((k) => k.id.startsWith(`${id}~`))
  const num = (id?: string) => { const p = id ? players.get(id) : undefined; return p ? (p.number != null ? `${p.number}` : p.name.split(' ')[0]) : '' }
  return (
    <section aria-labelledby="coded-h">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 id="coded-h" className="font-display text-[17px] font-semibold text-ink">{t('coded.title')} <span className="text-sm font-normal text-ink-faint">{items.length}</span></h3>
      </div>
      {present.length > 1 && (
        <div className="no-scrollbar -mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label={t('coded.filter')}>
          {(['all', ...present] as const).map((g) => (
            <button key={g} type="button" aria-pressed={filter === g} onClick={() => { setFilter(g); setShown(PAGE) }} className={cx('chip min-h-[36px] shrink-0 cursor-pointer px-3', filter === g && 'chip-on')}>
              {g === 'all' ? t('coded.all') : g === 'setpiece' ? t('sp.title') : t(`analysis:groups.${g}`)}
            </button>
          ))}
        </div>
      )}
      {list.length === 0 ? <p className="text-sm text-ink-muted">{t('coded.empty')}</p> : (
        <ul className={cx('-mx-1 divide-y divide-line/70', wide && 'max-h-[46vh] overflow-y-auto')}>
          {list.slice(0, shown).map((x) => {
            const def = defFor(x.code === 'NOTE' ? 'PASS_OK' : x.code, x.side)
            const sp = setDef(x.code, x.side)
            const Icon = x.code === 'NOTE' ? NOTE_DEF.icon : sp ? sp.icon : def?.icon ?? NOTE_DEF.icon
            const color = colorOf(x.code, x.side)
            const kids = kidsOf(x.id)
            const who = num(x.playerId), to = num(x.toPlayerId)
            return (
              <li key={x.id} className={cx('flex items-center gap-1.5 rounded-lg px-1 py-1', selected === x.id && 'bg-forest-50')}>
                <button type="button" onClick={() => onGo(x)} className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2.5 text-left" aria-label={`${t('coded.go')} ${fmtT(x.t)}`}>
                  <span className="w-12 shrink-0 text-[13px] font-semibold tabular-nums text-ink-muted">{fmtT(x.t)}</span>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1 ring-inset ring-black/5" style={{ background: color }}><Icon size={15} className={markInk(color)} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-ink">
                      {t(labelKey(x.code, x.side))}
                      {who && <span className="ml-1.5 text-[12.5px] font-semibold text-forest-700">{who}{to && <span className="font-normal text-ink-faint"> {t('coded.to')} </span>}{to}</span>}
                      {kids.length > 0 && <span className="ml-1.5 text-[11.5px] font-normal text-ink-faint">+ {kids.map((k) => t(labelKey(k.code, k.side))).join(', ')}</span>}
                    </span>
                    {x.note && <span className="block truncate text-[12.5px] text-ink-muted">{x.note}</span>}
                  </span>
                </button>
                {x.drawing && <button type="button" onClick={() => onImage(x)} className="shrink-0 overflow-hidden rounded-md ring-1 ring-line" aria-label={t('coded.image')}><img src={x.drawing} alt="" className="h-9 w-14 object-cover" /></button>}
                {x.code !== 'NOTE' && (
                  <button type="button" onClick={() => onPlace(x)} aria-label={t('coded.place')} title={t('coded.place')}
                    className={cx('grid h-11 w-9 shrink-0 place-items-center rounded-lg hover:bg-sand', x.x != null ? 'text-forest-600' : 'text-ink-faint')}><MapPin size={15} /></button>
                )}
                <button type="button" onClick={() => onDelete(x)} aria-label={t('coded.delete')} className="grid h-11 w-9 shrink-0 place-items-center rounded-lg text-ink-faint hover:bg-sand hover:text-clay-600"><Trash2 size={15} /></button>
              </li>
            )
          })}
        </ul>
      )}
      {list.length > shown && (
        <button type="button" className="btn-ghost btn-sm mt-2 w-full" onClick={() => setShown((n) => n + PAGE)}><ChevronDown size={15} />{t('coded.more', { n: list.length - shown })}</button>
      )}
    </section>
  )
})
