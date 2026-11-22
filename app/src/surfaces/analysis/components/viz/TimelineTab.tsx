// Report tab « Chronologie »: the momentum of the match (rolling danger, ours minus theirs), the Indice
// Njangi by 15-minute block, goals and substitutions, then every coded action, filterable, each one
// opening the video at its moment.
import { useMemo, useState } from 'react'
import { ArrowLeftRight, Play } from 'lucide-react'
import { useT } from '../../../../i18n'
import { cx } from '../../../../lib/util'
import { fmtNjangi, njangiBand } from '../../../../lib/njangi'
import type { EventCode, MatchEvent } from '../../../../lib/types'
import {
  DANGER, halfLen, halfStart, indiceBlocks, momentum, shotList, sortEvents, substitutions, SET_PIECES, type Half, type MomentumPoint,
} from '../../../../lib/viz'
import { defFor } from '../codes'
import { Pills, PlayerSelect, shortName, useCodeLabel, useMinute, useOpenVideo, useViz } from './context'
import { C, useWidth } from './pitch'

type Filter = 'key' | 'danger' | 'possession' | 'fixation' | 'transition' | 'setpiece' | 'all'
const GROUPS: Record<Exclude<Filter, 'key' | 'all'>, EventCode[]> = {
  danger: ['FINAL3', 'BOX', 'SHOT', 'GOAL'],
  possession: ['PASS_OK', 'PASS_LOST', 'PROG', 'LINE'],
  fixation: ['FIX2', 'SWITCH'],
  transition: ['LOSS', 'REGAIN5', 'REGAIN'],
  setpiece: SET_PIECES,
}

export default function TimelineTab() {
  const { t } = useT('viz')
  return (
    <section aria-labelledby="chrono-h" className="space-y-6">
      <div>
        <h2 id="chrono-h" className="font-display text-[22px] leading-tight text-ink">{t('chrono.title')}</h2>
        <p className="mt-1 max-w-[70ch] text-[14px] text-ink-muted">{t('chrono.subtitle')}</p>
      </div>
      <Momentum />
      <EventList />
    </section>
  )
}

/* ------------------------------------------------------------------ momentum */

function Momentum() {
  const { t, lang } = useT('viz')
  const { match, events, byId } = useViz()
  const hm = match.halfMinutes
  const pts = useMemo(() => momentum(events, hm), [events, hm])
  const blocks = useMemo(() => indiceBlocks(events, hm), [events, hm])
  const subs = useMemo(() => substitutions(match), [match])
  const goals = events.filter((e) => e.code === 'GOAL')
  const [box, width] = useWidth<HTMLDivElement>(720)
  const [hover, setHover] = useState<MomentumPoint | null>(null)
  const [table, setTable] = useState(false)
  const halves = [...new Set(pts.map((p) => p.half))] as Half[]
  const W = Math.max(300, width), L = 30, R = 8, GAP = 12
  const small = W < 520
  const top = 22, h = small ? 64 : 84, bottom = 40
  const H = top + h * 2 + bottom
  const base = top + h
  // each half takes a width proportional to its length (stoppage time included)
  const lens = halves.map((hf) => Math.max(halfLen(hf, hm), ...pts.filter((p) => p.half === hf).map((p) => p.minute - halfStart(hf, hm))))
  const usable = W - L - R - GAP * (halves.length - 1)
  const total = lens.reduce((a, b) => a + b, 0) || 1
  const segs = halves.map((hf, i) => ({ half: hf, x0: L + lens.slice(0, i).reduce((a, b) => a + b, 0) / total * usable + GAP * i, w: (lens[i] / total) * usable, len: lens[i], start: halfStart(hf, hm) }))
  const xOf = (half: Half, minute: number) => { const s = segs.find((g) => g.half === half) ?? segs[0]; return s.x0 + ((minute - s.start) / s.len) * s.w }
  const yMax = Math.max(4, ...pts.map((p) => Math.max(p.us, p.them)))
  const yv = (v: number) => (h * v) / yMax
  const area = (half: Half, side: 'us' | 'them') => {
    const list = pts.filter((p) => p.half === half)
    if (!list.length) return ''
    const s = segs.find((g) => g.half === half)!
    const sign = side === 'us' ? -1 : 1
    let d = `M ${s.x0} ${base}`
    for (const p of list) d += ` L ${xOf(half, p.minute).toFixed(1)} ${(base + sign * yv(p[side])).toFixed(1)}`
    return `${d} L ${xOf(half, list[list.length - 1].minute).toFixed(1)} ${base} Z`
  }
  const subHalf = (minute: number): Half => (minute <= hm ? 1 : 2)
  const evMinute = (e: MatchEvent) => halfStart(e.half, hm) + e.t / 60
  const onMove = (clientX: number, rect: DOMRect) => {
    const x = ((clientX - rect.left) / rect.width) * W
    const s = segs.find((g) => x >= g.x0 - GAP / 2 && x <= g.x0 + g.w + GAP / 2) ?? null
    if (!s) return setHover(null)
    const minute = Math.round(s.start + ((x - s.x0) / s.w) * s.len)
    setHover(pts.find((p) => p.half === s.half && p.minute === Math.max(s.start + 1, Math.min(s.start + s.len, minute))) ?? null)
  }
  const band = (v: number) => ['#D7263D', '#E8798A', '#73B391', '#13804F', '#0B5D3B'][njangiBand(v)]
  const nameOf = (id?: string) => (id ? shortName(byId.get(id)) : '')
  return (
    <div className="rounded-card border border-line bg-paper p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-[18px] text-ink">{t('chrono.momentum')}</h3>
          <p className="mt-0.5 text-[13px] text-ink-muted">{t('chrono.momentumHow', { fin: DANGER.FINAL3, box: DANGER.BOX, shot: DANGER.SHOT })}</p>
        </div>
        <button type="button" className="link text-[13px]" onClick={() => setTable((v) => !v)}>{table ? t('chrono.hideTable') : t('chrono.showTable')}</button>
      </div>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] text-ink-soft">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: C.us }} />{t('chrono.ours')}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: C.themSoft }} />{t('chrono.theirs')}</span>
        <span className="inline-flex items-center gap-1.5"><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4.5" fill={C.goal} stroke={C.ink} /></svg>{t('chrono.goalUs')}</span>
        <span className="inline-flex items-center gap-1.5"><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="#fff" stroke={C.loss} strokeWidth="2" /></svg>{t('chrono.goalThem')}</span>
        {subs.length > 0 && <span className="inline-flex items-center gap-1.5"><ArrowLeftRight size={12} className="text-ink-muted" />{t('chrono.sub')}</span>}
      </div>
      <div ref={box} className="relative" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block h-auto w-full touch-pan-y" role="img" aria-label={t('chrono.momentumAria')}
          onMouseMove={(e) => onMove(e.clientX, e.currentTarget.getBoundingClientRect())} onTouchStart={(e) => onMove(e.touches[0].clientX, e.currentTarget.getBoundingClientRect())}>
          <line x1={L} x2={W - R} y1={base} y2={base} stroke={C.line} />
          <text x={L - 6} y={top + 4} textAnchor="end" fontSize="11" fill={C.faint}>{yMax}</text>
          <text x={L - 6} y={base + 4} textAnchor="end" fontSize="11" fill={C.faint}>0</text>
          <text x={L - 6} y={base + h} textAnchor="end" fontSize="11" fill={C.faint}>{yMax}</text>
          {segs.map((s) => (
            <g key={s.half}>
              <path d={area(s.half, 'us')} fill={C.us} fillOpacity={0.85} />
              <path d={area(s.half, 'them')} fill={C.themSoft} fillOpacity={0.9} />
              {Array.from({ length: Math.floor(s.len / 15) + 1 }, (_, i) => s.start + i * 15).filter((m) => m - s.start <= s.len).map((m) => (
                <text key={m} x={xOf(s.half, m)} y={base + h + 16} textAnchor={m === s.start ? 'start' : 'middle'} fontSize="11" fill={C.muted}>{m}'</text>
              ))}
            </g>
          ))}
          {segs.slice(1).map((s) => <line key={`sep${s.half}`} x1={s.x0 - GAP / 2} x2={s.x0 - GAP / 2} y1={top - 6} y2={base + h} stroke={C.line} />)}
          {goals.map((g) => {
            const x = xOf(g.half as Half, evMinute(g))
            return g.side === 'us'
              ? <g key={g.id}><line x1={x} x2={x} y1={top - 4} y2={base} stroke="#D29C00" strokeDasharray="3 3" /><circle cx={x} cy={top - 8} r="6" fill={C.goal} stroke={C.ink} /></g>
              : <g key={g.id}><line x1={x} x2={x} y1={base} y2={base + h + 2} stroke={C.loss} strokeDasharray="3 3" /><circle cx={x} cy={base + h + 2} r="5" fill="#fff" stroke={C.loss} strokeWidth="2.2" /></g>
          })}
          {subs.map((s, i) => {
            const half = subHalf(s.minute)
            const x = xOf(half, s.minute)
            return <g key={i} transform={`translate(${x - 6} ${H - 16})`}><rect width="12" height="12" rx="3" fill={C.paper} stroke={C.faint} /><path d="M3 4.5h6M7.5 3l1.5 1.5L7.5 6M9 7.5H3M4.5 6 3 7.5 4.5 9" stroke={C.muted} strokeWidth="1.1" fill="none" strokeLinecap="round" strokeLinejoin="round" /></g>
          })}
          {hover && <line x1={xOf(hover.half, hover.minute)} x2={xOf(hover.half, hover.minute)} y1={top - 4} y2={base + h} stroke={C.ink} strokeOpacity={0.5} />}
        </svg>
        {hover && (
          <div role="status" className="pointer-events-none absolute top-0 z-10 w-max rounded-xl border border-line bg-paper px-3 py-2 text-[12.5px] shadow-lift"
            style={{ left: `${(xOf(hover.half, hover.minute) / W) * 100}%`, transform: `translateX(${xOf(hover.half, hover.minute) / W > 0.6 ? 'calc(-100% - 10px)' : '10px'})` }}>
            <div className="font-semibold text-ink">{t('chrono.window', { a: Math.max(hover.minute - 5, halfStart(hover.half, hm)), b: hover.minute })}</div>
            <div className="mt-0.5 flex justify-between gap-4 text-ink-soft"><span>{t('chrono.ours')}</span><b className="tabular-nums text-ink">{hover.us}</b></div>
            <div className="flex justify-between gap-4 text-ink-soft"><span>{t('chrono.theirs')}</span><b className="tabular-nums text-ink">{hover.them}</b></div>
            {subs.filter((s) => s.minute > hover.minute - 5 && s.minute <= hover.minute).map((s, i) => <div key={i} className="mt-0.5 text-ink-muted">{t('chrono.subLine', { m: s.minute, on: nameOf(s.on), off: nameOf(s.off) })}</div>)}
          </div>
        )}
      </div>

      <h4 className="mb-2 mt-5 text-[14px] font-semibold text-ink">{t('chrono.blocks')}</h4>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${blocks.length}, minmax(0, 1fr))` }}>
        {blocks.map((b) => (
          <div key={`${b.half}-${b.from}`} className="rounded-lg bg-cream px-1.5 py-2 text-center">
            <div className="whitespace-nowrap text-[11px] tabular-nums text-ink-muted">{b.from}'<span className="sr-only sm:not-sr-only"> {t('chrono.to')} {b.to}'{b.stoppage ? '+' : ''}</span></div>
            <div className="mt-1 font-display text-[17px] leading-none tabular-nums text-ink sm:text-[20px]">{fmtNjangi(b.result.total, lang)}</div>
            <div className="mx-auto mt-1.5 h-1.5 w-[80%] overflow-hidden rounded-full bg-sand"><div className="h-full rounded-full" style={{ width: `${Math.min(100, b.result.total)}%`, background: band(b.result.total) }} /></div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[12.5px] text-ink-muted">{t('chrono.blocksHow')}</p>

      {table && (
        <div className="mt-4 max-h-72 overflow-auto rounded-xl border border-line">
          <table className="table-n">
            <thead><tr><th>{t('chrono.minute')}</th><th className="num">{t('chrono.ours')}</th><th className="num">{t('chrono.theirs')}</th><th className="num">{t('chrono.net')}</th></tr></thead>
            <tbody>{pts.filter((p) => p.minute % 5 === 0 || p.us || p.them).map((p) => <tr key={`${p.half}-${p.minute}`}><td className="tabular-nums">{p.minute}'</td><td className="num">{p.us}</td><td className="num">{p.them}</td><td className="num font-semibold">{p.net}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ the list of actions */

interface Row { key: string; half: Half; t: number; e?: MatchEvent; kind: 'event' | 'shot' | 'sub'; label: string; who: string; side: 'us' | 'them'; color: string; strong?: boolean; pids?: string[] }

function EventList() {
  const { t } = useT('viz')
  const { match, events, byId, videoId } = useViz()
  const codeLabel = useCodeLabel()
  const minute = useMinute()
  const open = useOpenVideo()
  const [filter, setFilter] = useState<Filter>('key')
  const [side, setSide] = useState<'both' | 'us' | 'them'>('both')
  const [pid, setPid] = useState('')
  const [limit, setLimit] = useState(60)
  const coded = useMemo(() => [...new Set(events.filter((e) => e.side === 'us' && e.playerId).map((e) => e.playerId!))], [events])
  const rows = useMemo(() => {
    const shots = shotList(events)
    const marks = new Set(shots.flatMap((s) => s.marks))
    const shotOf = new Map(shots.map((s) => [s.e.id, s]))
    const name = (id?: string) => (id ? byId.get(id)?.name ?? '' : '')
    const out: Row[] = []
    for (const e of sortEvents(events)) {
      if (marks.has(e.id) || e.code === 'SHOT_IN') continue
      const s = shotOf.get(e.id)
      const def = defFor(e.code, e.side)
      const label = s ? (s.goal ? codeLabel('GOAL', e.side) : s.onTarget ? codeLabel('SHOT_IN', e.side) : codeLabel('SHOT', e.side)) : codeLabel(e.code, e.side)
      out.push({ key: e.id, half: e.half, t: e.t, e, kind: s ? 'shot' : 'event', label, who: e.side === 'us' ? name(e.playerId) : match.opponent, side: e.side, color: s?.goal ? (e.side === 'us' ? C.goal : C.loss) : def?.color ?? C.faint, strong: !!s?.goal })
    }
    for (const s of substitutions(match)) {
      const half: Half = s.minute <= match.halfMinutes ? 1 : 2
      out.push({ key: `sub${s.minute}${s.on}${s.off}`, half, t: (s.minute - halfStart(half, match.halfMinutes)) * 60 - 0.5, kind: 'sub', label: t('chrono.subRow'), who: [s.on && t('chrono.subOn', { name: name(s.on) }), s.off && t('chrono.subOff', { name: name(s.off) })].filter(Boolean).join(', '), side: 'us', color: C.muted, pids: [s.on, s.off].filter((x): x is string => !!x) })
    }
    return out.sort((a, b) => a.half - b.half || a.t - b.t)
  }, [events, match, byId, codeLabel, t])
  const shown = rows.filter((r) => {
    if (side !== 'both' && r.side !== side) return false
    if (pid && (r.kind === 'sub' ? !r.pids?.includes(pid) : r.e?.playerId !== pid)) return false
    if (filter === 'all') return true
    if (filter === 'key') return r.kind === 'shot' || r.kind === 'sub' || (r.e && SET_PIECES.includes(r.e.code)) || r.e?.code === 'GOAL'
    if (r.kind === 'sub') return false
    return !!r.e && GROUPS[filter].includes(r.e.code)
  })
  const list = shown.slice(0, limit)
  const filters: { id: Filter; label: string }[] = (['key', 'danger', 'possession', 'fixation', 'transition', 'setpiece', 'all'] as Filter[]).map((id) => ({ id, label: t(`chrono.f.${id}`) }))
  const playable = shown.filter((r) => r.e && typeof r.e.videoT === 'number').map((r) => r.e!)
  let lastHalf = 0
  return (
    <div className="rounded-card border border-line bg-paper">
      <div className="space-y-3 border-b border-line px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-[18px] text-ink">{t('chrono.list')}</h3>
          {videoId && playable.length > 1 && (
            <button type="button" onClick={() => open(playable)} className="btn-outline btn-sm min-h-[40px]"><Play size={14} fill="currentColor" strokeWidth={0} />{t('chrono.playAll', { count: Math.min(playable.length, 80) })}</button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center"><span className="sr-only">{t('chrono.type')}</span>
            <select value={filter} onChange={(e) => { setFilter(e.target.value as Filter); setLimit(60) }} className="input min-h-[40px] rounded-full py-1.5 pl-3.5 pr-8 text-[13.5px] font-semibold">
              {filters.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </label>
          <Pills label={t('side.label')} value={side} onChange={(v) => { setSide(v); setLimit(60) }} options={[{ id: 'both', label: t('side.both') }, { id: 'us', label: t('side.us') }, { id: 'them', label: t('side.them') }]} />
          <PlayerSelect value={pid} onChange={(v) => { setPid(v); setLimit(60) }} ids={coded} label={t('filters.player')} allLabel={t('filters.allPlayers')} />
        </div>
        <p className="text-[12.5px] text-ink-muted" aria-live="polite">{t('chrono.count', { count: shown.length })}</p>
      </div>
      {list.length === 0 ? <p className="px-5 py-8 text-center text-[14px] text-ink-muted">{t('chrono.none')}</p> : (
        <ol className="divide-y divide-line/70">
          {list.map((r) => {
            const head = r.half !== lastHalf
            lastHalf = r.half
            const can = !!videoId && r.e && typeof r.e.videoT === 'number'
            return (
              <li key={r.key}>
                {head && <div className="bg-cream px-4 py-1.5 text-[12.5px] font-semibold text-ink-muted sm:px-5">{t(`chrono.half.${r.half}`)}</div>}
                <div className={cx('flex min-h-[48px] items-center gap-3 px-4 py-1.5 sm:px-5', r.strong && 'bg-sun-50')}>
                  <span className="w-12 shrink-0 text-[13px] font-semibold tabular-nums text-ink-muted">{r.e ? minute(r.e) : `${Math.round(halfStart(r.half, match.halfMinutes) + (r.t + 0.5) / 60)}'`}</span>
                  {r.kind === 'sub' ? <ArrowLeftRight size={14} className="shrink-0 text-ink-muted" aria-hidden="true" /> : <span className={cx('h-3 w-3 shrink-0 ring-1 ring-inset ring-black/10', r.side === 'us' ? 'rounded-full' : 'rounded-[3px]')} style={{ background: r.color }} aria-hidden="true" />}
                  <span className="min-w-0 flex-1">
                    <span className={cx('block truncate text-[14px]', r.strong ? 'font-semibold text-ink' : 'text-ink-soft')}>{r.label}</span>
                    {r.who && <span className="block truncate text-[12.5px] text-ink-muted">{r.who}</span>}
                  </span>
                  {can && <button type="button" onClick={() => open([r.e!])} className="inline-flex min-h-[40px] shrink-0 items-center gap-1 rounded-full px-3 text-[12.5px] font-semibold text-forest-700 hover:bg-forest-50" aria-label={t('chrono.watchAt', { label: r.label, m: minute(r.e!) })}><Play size={12} fill="currentColor" strokeWidth={0} />{t('maps.watch')}</button>}
                </div>
              </li>
            )
          })}
        </ol>
      )}
      {shown.length > limit && (
        <div className="border-t border-line p-3 text-center"><button type="button" onClick={() => setLimit((l) => l + 120)} className="btn-ghost btn-sm min-h-[40px]">{t('chrono.more', { count: Math.min(120, shown.length - limit) })}</button></div>
      )}
    </div>
  )
}
