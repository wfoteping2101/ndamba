// Two teams on a small pitch. Drag a player from one column to the other (pointer events: mouse, pen and touch),
// or tap one player in each team and swap them. Every change is saved at once.
import { useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { ArrowLeftRight, Scale } from 'lucide-react'
import { useT } from '../../../i18n'
import type { PickupGame } from '../../../lib/types'
import { cx } from '../../../lib/util'
import { balanceTeams, setTeams } from '../../../lib/pickup'
import { dec, SW } from './kit'

type Zone = 'a' | 'b' | 'bench'

export function TeamsBoard({ game, ids, labelOf, strengthOf, editable }: {
  game: PickupGame; ids: string[]; labelOf: (id: string) => string; strengthOf: (id: string) => number; editable: boolean
}) {
  const { t, lang } = useT('pickup')
  const present = new Set(ids)
  const a = (game.teams?.a ?? []).filter((x) => present.has(x))
  const b = (game.teams?.b ?? []).filter((x) => present.has(x))
  const bench = ids.filter((x) => !a.includes(x) && !b.includes(x))
  const zoneOf = (id: string): Zone => (a.includes(id) ? 'a' : b.includes(id) ? 'b' : 'bench')

  const [sel, setSel] = useState<string[]>([])
  const [ghost, setGhost] = useState<{ id: string; x: number; y: number } | null>(null)
  const [over, setOver] = useState<Zone | null>(null)
  const drag = useRef<{ id: string; from: Zone; sx: number; sy: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)

  const save = (na: string[], nb: string[]) => setTeams(game.id, { a: na, b: nb })
  const move = (id: string, to: Zone) => {
    const na = a.filter((x) => x !== id), nb = b.filter((x) => x !== id)
    if (to === 'a') na.push(id)
    if (to === 'b') nb.push(id)
    void save(na, nb)
    setSel([])
  }
  const balance = () => {
    const r = balanceTeams(ids.map((id) => ({ id, strength: strengthOf(id) })))
    void save(r.a, r.b)
    setSel([])
  }
  const selA = sel.find((x) => a.includes(x)), selB = sel.find((x) => b.includes(x))
  const swap = () => {
    if (!selA || !selB) return
    void save(a.map((x) => (x === selA ? selB : x)), b.map((x) => (x === selB ? selA : x)))
    setSel([])
  }
  const toggle = (id: string) => {
    if (!editable) return
    setSel((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id)
      const z = zoneOf(id)
      return [...cur.filter((x) => zoneOf(x) !== z), id].slice(-2)
    })
  }

  const zoneAt = (x: number, y: number) => (document.elementFromPoint(x, y)?.closest('[data-zone]')?.getAttribute('data-zone') as Zone | null) ?? null
  const onDown = (e: RPointerEvent<HTMLButtonElement>, id: string) => {
    if (!editable || (e.pointerType === 'mouse' && e.button !== 0)) return
    drag.current = { id, from: zoneOf(id), sx: e.clientX, sy: e.clientY, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e: RPointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    if (!d) return
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 8) return
    d.moved = true
    setGhost({ id: d.id, x: e.clientX, y: e.clientY })
    setOver(zoneAt(e.clientX, e.clientY))
  }
  const onUp = (e: RPointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (d.moved) {
      suppressClick.current = true
      const z = zoneAt(e.clientX, e.clientY)
      setGhost(null); setOver(null)
      if (z && z !== d.from) move(d.id, z)
    }
  }
  const onCancel = () => { drag.current = null; setGhost(null); setOver(null) }

  const sumOf = (l: string[]) => l.reduce((s, id) => s + strengthOf(id), 0)
  const chip = (id: string, zone: Zone) => (
    <li key={id}>
      <button type="button" data-chip={id}
        onPointerDown={(e) => onDown(e, id)} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onCancel}
        onClick={() => { if (suppressClick.current) { suppressClick.current = false; return } toggle(id) }}
        aria-pressed={editable ? sel.includes(id) : undefined}
        className={cx('flex min-h-[44px] w-full select-none items-center gap-2 rounded-control px-2.5 text-left text-[14px] font-semibold transition-shadow',
          editable && 'cursor-grab touch-none active:cursor-grabbing',
          zone === 'a' ? 'bg-paper text-ink' : zone === 'b' ? 'bg-night-800 text-cream' : 'border border-line bg-paper text-ink',
          sel.includes(id) && 'ring-[3px] ring-sun-500',
          ghost?.id === id && 'opacity-40')}>
        <span className="min-w-0 flex-1 truncate">{labelOf(id)}</span>
        <span className={cx('num shrink-0 text-[12px] font-medium', zone === 'b' ? 'text-cream/60' : 'text-ink-faint')}>{dec(strengthOf(id), lang)}</span>
      </button>
    </li>
  )

  const column = (zone: 'a' | 'b', list: string[], selected: string | undefined, other: string | undefined) => (
    <div data-zone={zone} className={cx('relative min-h-[120px] rounded-control p-1.5 transition-colors', over === zone && 'bg-white/15 ring-2 ring-white/60')}>
      <div className="mb-2 flex items-baseline justify-between gap-1 px-1 text-cream">
        <span className="text-[14px] font-semibold">{t(`teams.${zone}`)} <span className="num font-normal text-cream/70">({list.length})</span></span>
        <span className="num text-[12px] text-cream/70">{t('teams.force', { v: dec(sumOf(list), lang) })}</span>
      </div>
      <ul className="space-y-1.5">{list.map((id) => chip(id, zone))}</ul>
      {editable && sel.length === 1 && !selected && !other && zoneOf(sel[0]) !== zone && (
        <button type="button" className="mt-2 min-h-[44px] w-full rounded-control border border-dashed border-white/60 text-[13px] font-semibold text-cream hover:bg-white/10" onClick={() => move(sel[0], zone)}>{t('teams.moveHere')}</button>
      )}
    </div>
  )

  return (
    <div>
      {editable && (
        <div className="mb-3 flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={balance} disabled={ids.length < 2}><Scale size={17} strokeWidth={SW} aria-hidden="true" />{t('teams.balance')}</button>
          <button type="button" className="btn-outline" onClick={swap} disabled={!selA || !selB}><ArrowLeftRight size={17} strokeWidth={SW} aria-hidden="true" />{t('teams.swap')}</button>
        </div>
      )}
      <div className="relative overflow-hidden rounded-panel bg-forest-600 p-2.5 sm:p-4">
        {/* the pitch lines, drawn behind the two columns */}
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
          <g fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="0.6" vectorEffect="non-scaling-stroke">
            <rect x="2" y="3" width="96" height="94" vectorEffect="non-scaling-stroke" />
            <line x1="50" y1="3" x2="50" y2="97" vectorEffect="non-scaling-stroke" />
            <rect x="2" y="30" width="12" height="40" vectorEffect="non-scaling-stroke" />
            <rect x="86" y="30" width="12" height="40" vectorEffect="non-scaling-stroke" />
          </g>
        </svg>
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
        <div className="relative grid grid-cols-2 gap-4 sm:gap-8">
          {column('a', a, selA, undefined)}
          {column('b', b, selB, undefined)}
        </div>
      </div>
      {(bench.length > 0 || ghost) && (
        <div data-zone="bench" className={cx('mt-3 rounded-card border border-dashed border-line bg-sand/60 p-2.5 transition-colors', over === 'bench' && 'border-forest-500 bg-forest-50')}>
          <div className="mb-2 px-1 text-[13.5px] font-semibold text-ink-soft">{t('teams.bench', { count: bench.length })}</div>
          <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">{bench.map((id) => chip(id, 'bench'))}</ul>
        </div>
      )}
      {editable && <p className="mt-3 text-[13px] leading-snug text-ink-muted">{t('teams.help')}</p>}
      {ghost && (
        <div className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-1/2 rounded-control bg-sun-500 px-3 py-2.5 text-[14px] font-semibold text-ink shadow-lift" style={{ left: ghost.x, top: ghost.y }}>
          {labelOf(ghost.id)}
        </div>
      )}
    </div>
  )
}
