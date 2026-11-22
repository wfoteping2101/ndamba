// The maps of coded actions: shots, passing network, heat, defensive actions, set pieces, territory.
// They take plain events and callbacks, so the match report and the season studio share them.
import { useMemo, useState, type ReactNode } from 'react'
import { useT } from '../../../../i18n'
import { cx } from '../../../../lib/util'
import type { MatchEvent } from '../../../../lib/types'
import {
  byLane, byThird, density, fieldTilt, isPlaced, passNetwork, possession, SET_PIECES, shotList, shotStats, territory,
  type NetNode, type Shot,
} from '../../../../lib/viz'
import { C, HeatLayer, HeatLegend, LegendItem, MapTip, Mark, PitchMap, PH, PW, X, Y } from './pitch'
import { num, pct } from './context'

export interface MapCommon {
  events: MatchEvent[]
  /** what a point is (minute, player, action), shown on hover */
  describe: (e: MatchEvent) => ReactNode
  /** open the video at this action; absent when there is no video */
  onPick?: (e: MatchEvent) => void
  canPick?: (e: MatchEvent) => boolean
}

/** Map and its side panel: side by side from 1024 px, stacked on phones. */
export function MapLayout({ map, aside, legend, below }: { map: ReactNode; aside?: ReactNode; legend?: ReactNode; below?: ReactNode }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] lg:items-start">
      <div className="min-w-0">
        {map}
        {legend && <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">{legend}</div>}
        {below}
      </div>
      {aside && <div className="min-w-0">{aside}</div>}
    </div>
  )
}

const clickable = (p: MapCommon, e: MatchEvent) => !!p.onPick && (p.canPick ? p.canPick(e) : true)

/* ------------------------------------------------------------------ shots */

export function ShotMap(p: MapCommon & { side: 'both' | 'us' | 'them' }) {
  const { t, lang } = useT('viz')
  const shots = useMemo(() => shotList(p.events), [p.events])
  const shown = shots.filter((s) => p.side === 'both' || s.side === p.side)
  const [hover, setHover] = useState<Shot | null>(null)
  const placed = shown.filter((s) => isPlaced(s.e)).sort((a, b) => Number(a.goal) - Number(b.goal) || Number(a.onTarget) - Number(b.onTarget))
  const us = shotStats(shots, 'us'), them = shotStats(shots, 'them')
  const result = (s: Shot) => (s.goal ? t('shot.goal') : s.onTarget ? t('shot.onTarget') : t('shot.off'))
  const map = (
    <PitchMap label={t('maps.shots.aria', { us: us.total, them: them.total })} onLeave={() => setHover(null)}
      overlay={hover && isPlaced(hover.e) ? <MapTip x={hover.e.x} y={hover.e.y}>{p.describe(hover.e)}<div className="mt-0.5 font-semibold text-ink">{result(hover)}{hover.dist != null && <span className="font-normal text-ink-muted">, {t('shot.dist', { m: Math.round(hover.dist) })}</span>}</div></MapTip> : null}>
      {(k) => (
        <g>
          {placed.filter((s) => s.goal && isPlaced(s.e)).map((s) => (
            <line key={`g${s.e.id}`} x1={X(s.e.x!)} y1={Y(s.e.y!)} x2={s.side === 'us' ? PW : 0} y2={PH / 2} stroke={s.side === 'us' ? '#D29C00' : C.loss} strokeWidth={1.5 * k} strokeDasharray={`${4 * k} ${3 * k}`} />
          ))}
          {placed.map((s) => {
            const col = s.side === 'us' ? C.us : C.them
            const fill = s.goal ? (s.side === 'us' ? C.goal : C.paper) : s.onTarget ? col : C.paper
            const stroke = s.goal ? (s.side === 'us' ? C.ink : C.loss) : s.onTarget ? C.paper : col
            return (
              <Mark key={s.e.id} x={s.e.x!} y={s.e.y!} k={k} kind={s.side === 'us' ? 'circle' : 'square'} r={s.goal ? 7.5 : 6} fill={fill} stroke={stroke} strokeW={s.goal ? 1.6 : s.onTarget ? 1.5 : 2.2}
                focusable label={`${result(s)}, ${t(s.side === 'us' ? 'side.us' : 'side.them')}`} onEnter={() => setHover(s)} onClick={clickable(p, s.e) ? () => p.onPick!(s.e) : undefined} />
            )
          })}
        </g>
      )}
    </PitchMap>
  )
  const legend = (
    <>
      <LegendItem kind="circle" fill={C.us}>{t('legend.usOn')}</LegendItem>
      <LegendItem kind="circle" fill={C.paper} stroke={C.us}>{t('legend.usOff')}</LegendItem>
      <LegendItem kind="circle" fill={C.goal} stroke={C.ink}>{t('legend.usGoal')}</LegendItem>
      <LegendItem kind="square" fill={C.them}>{t('legend.themOn')}</LegendItem>
      <LegendItem kind="square" fill={C.paper} stroke={C.them}>{t('legend.themOff')}</LegendItem>
      <LegendItem kind="square" fill={C.paper} stroke={C.loss}>{t('legend.themGoal')}</LegendItem>
    </>
  )
  const row = (label: string, a: ReactNode, b: ReactNode) => (
    <tr><td className="text-ink-soft">{label}</td><td className="num font-semibold text-ink">{a ?? '-'}</td><td className="num text-ink-soft">{b ?? '-'}</td></tr>
  )
  const aside = (
    <div className="rounded-card border border-line bg-paper">
      <table className="table-n">
        <thead><tr><th>{t('shot.table')}</th><th className="num">{t('side.us')}</th><th className="num">{t('side.them')}</th></tr></thead>
        <tbody>
          {row(t('shot.total'), us.total, them.total)}
          {row(t('shot.onTargetN'), us.onTarget, them.onTarget)}
          {row(t('shot.goals'), us.goals, them.goals)}
          {row(t('shot.inBox'), us.inBox, them.inBox)}
          {row(t('shot.outBox'), us.outBox, them.outBox)}
          {row(t('shot.avgDist'), us.avgDist != null ? `${num(us.avgDist, lang, 0)} m` : null, them.avgDist != null ? `${num(them.avgDist, lang, 0)} m` : null)}
          {row(t('shot.conversion'), pct(us.conversion, lang), pct(them.conversion, lang))}
        </tbody>
      </table>
      {(us.unplaced > 0 || them.unplaced > 0) && <p className="border-t border-line px-3 py-2 text-[12.5px] text-ink-muted">{t('shot.unplaced', { count: us.unplaced + them.unplaced })}</p>}
    </div>
  )
  return <MapLayout map={map} legend={legend} aside={aside} />
}

/* ------------------------------------------------------------------ passing network */

export function PassNetworkMap({ events, nameOf, numberOf, onPlayList }: {
  events: MatchEvent[]; nameOf: (id: string) => string; numberOf: (id: string) => string
  /** play the completed passes of a player (or a pair) in the studio */
  onPlayList?: (evs: MatchEvent[]) => void
}) {
  const { t } = useT('viz')
  const net = useMemo(() => passNetwork(events), [events])
  const maxLink = Math.max(1, ...net.links.map((l) => l.n))
  const maxPass = Math.max(1, ...net.nodes.map((n) => n.passes))
  const [min, setMin] = useState(() => Math.max(2, Math.round(maxLink * 0.25)))
  const [sel, setSel] = useState<string | null>(null)
  const [hover, setHover] = useState<NetNode | null>(null)
  const byNode = new Map(net.nodes.map((n) => [n.id, n]))
  const shown = net.links.filter((l) => l.n >= Math.min(min, maxLink))
  const touches = (id: string, l: { a: string; b: string }) => l.a === id || l.b === id
  const selLinks = sel ? net.links.filter((l) => touches(sel, l)) : []
  const selNode = sel ? byNode.get(sel) : undefined
  const passesOf = (a: string, b?: string) => events.filter((e) => e.side === 'us' && e.code === 'PASS_OK' && (b ? (e.playerId === a && e.toPlayerId === b) || (e.playerId === b && e.toPlayerId === a) : e.playerId === a))
  if (!net.nodes.length) return <EmptyMap text={t('maps.network.empty')} />
  const map = (
    <PitchMap label={t('maps.network.aria', { n: net.nodes.length, links: shown.length })} onLeave={() => setHover(null)}
      overlay={hover ? <MapTip x={hover.x} y={hover.y}><div className="font-semibold text-ink">{nameOf(hover.id)}</div>{t('maps.network.tip', { passes: hover.passes, ok: hover.completed })}</MapTip> : null}>
      {(k) => (
        <g>
          {shown.map((l) => {
            const a = byNode.get(l.a)!, b = byNode.get(l.b)!
            const on = sel ? touches(sel, l) : true
            return <line key={`${l.a}${l.b}`} x1={X(a.x)} y1={Y(a.y)} x2={X(b.x)} y2={Y(b.y)} stroke={sel && on ? C.usDeep : C.us} strokeOpacity={sel ? (on ? 0.85 : 0.08) : 0.22 + 0.55 * (l.n / maxLink)} strokeWidth={(1.2 + 7 * (l.n / maxLink)) * k} strokeLinecap="round" />
          })}
          {[...net.nodes].sort((a, b) => a.passes - b.passes).map((n) => {
            const r = (9 + 11 * Math.sqrt(n.passes / maxPass)) * k
            const on = !sel || sel === n.id || selLinks.some((l) => touches(n.id, l) && l.n >= 1)
            return (
              <g key={n.id} role="button" tabIndex={0} aria-pressed={sel === n.id} aria-label={t('maps.network.node', { name: nameOf(n.id), passes: n.passes })}
                className="cursor-pointer outline-none [&:focus-visible>circle]:stroke-sun-500" opacity={on ? 1 : 0.3}
                onClick={() => setSel(sel === n.id ? null : n.id)} onMouseEnter={() => setHover(n)} onFocus={() => setHover(n)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(sel === n.id ? null : n.id) } }}>
                <circle cx={X(n.x)} cy={Y(n.y)} r={r} fill={sel === n.id ? C.ink : C.usDeep} stroke={C.paper} strokeWidth={2 * k} />
                <text x={X(n.x)} y={Y(n.y)} dy={4 * k} textAnchor="middle" fontSize={11.5 * k} fontWeight={700} fill={C.paper} style={{ pointerEvents: 'none' }}>{numberOf(n.id)}</text>
              </g>
            )
          })}
        </g>
      )}
    </PitchMap>
  )
  const top = net.links.slice(0, 6)
  const aside = (
    <div className="space-y-4">
      <div className="rounded-card border border-line bg-paper p-4">
        <label htmlFor="nj-net-min" className="flex items-baseline justify-between gap-2 text-[13.5px] font-semibold text-ink-soft">
          {t('maps.network.threshold')}<span className="tabular-nums text-ink">{t('maps.network.atLeast', { count: Math.min(min, maxLink) })}</span>
        </label>
        <input id="nj-net-min" type="range" min={1} max={maxLink} value={Math.min(min, maxLink)} onChange={(e) => setMin(Number(e.target.value))} className="mt-2 w-full accent-[#0B5D3B]" />
        <p className="mt-1 text-[12.5px] text-ink-muted">{t('maps.network.shown', { links: shown.length, total: net.links.length })}</p>
      </div>
      {selNode ? (
        <div className="rounded-card border border-line bg-paper p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[15px] font-semibold text-ink">{nameOf(selNode.id)}</div>
              <div className="text-[12.5px] text-ink-muted">{t('maps.network.tip', { passes: selNode.passes, ok: selNode.completed })}</div>
            </div>
            <button type="button" onClick={() => setSel(null)} className="btn-ghost btn-sm min-h-[36px]">{t('maps.network.clear')}</button>
          </div>
          <ul className="mt-3 space-y-1.5">
            {selLinks.slice(0, 6).map((l) => {
              const other = l.a === selNode.id ? l.b : l.a
              const out = l.a === selNode.id ? l.ab : l.ba, back = l.a === selNode.id ? l.ba : l.ab
              return (
                <li key={other} className="flex items-center justify-between gap-2 text-[13.5px]">
                  <span className="min-w-0 truncate text-ink-soft">{nameOf(other)}</span>
                  <span className="flex shrink-0 items-center gap-2"><span className="tabular-nums text-ink">{t('maps.network.toFrom', { out, back })}</span>
                    {onPlayList && <button type="button" onClick={() => onPlayList(passesOf(selNode.id, other))} className="link text-[12.5px]">{t('maps.watch')}</button>}
                  </span>
                </li>
              )
            })}
          </ul>
          {onPlayList && <button type="button" onClick={() => onPlayList(passesOf(selNode.id))} className="btn-outline btn-sm mt-3 min-h-[40px] w-full">{t('maps.network.playAll')}</button>}
        </div>
      ) : (
        <div className="rounded-card border border-line bg-paper p-4">
          <h4 className="mb-2 text-[13.5px] font-semibold text-ink-soft">{t('maps.network.top')}</h4>
          <ol className="space-y-1.5">
            {top.map((l) => (
              <li key={`${l.a}${l.b}`} className="flex items-center justify-between gap-2 text-[13.5px]">
                <button type="button" onClick={() => setSel(l.a)} className="min-w-0 truncate text-left text-ink-soft hover:text-ink">{numberOf(l.a)} {t('maps.network.and')} {numberOf(l.b)}<span className="text-ink-faint">, {nameOf(l.a).split(' ').slice(-1)[0]} {t('maps.network.and')} {nameOf(l.b).split(' ').slice(-1)[0]}</span></button>
                <span className="shrink-0 font-semibold tabular-nums text-ink">{l.n}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[12.5px] text-ink-muted">{t('maps.network.hint')}</p>
        </div>
      )}
    </div>
  )
  const legend = (
    <>
      <LegendItem kind="circle" fill={C.usDeep}>{t('maps.network.legendNode')}</LegendItem>
      <LegendItem kind="line" fill={C.us}>{t('maps.network.legendLink')}</LegendItem>
    </>
  )
  return <MapLayout map={map} legend={legend} aside={aside} below={<p className="mt-2 text-[12.5px] text-ink-muted">{t('maps.network.how', { n: net.completed })}</p>} />
}

/* ------------------------------------------------------------------ heat */

export function HeatMapView(p: MapCommon & { showPoints?: boolean; mini?: boolean; label: string }) {
  const { t, lang } = useT('viz')
  const pts = useMemo(() => p.events.filter((e): e is MatchEvent & { x: number; y: number } => isPlaced(e)), [p.events])
  const grid = useMemo(() => (p.mini ? density(pts, 42, 27, 8) : density(pts, 84, 54, 5.5)), [pts, p.mini])
  const thirds = byThird(pts)
  const total = pts.length || 1
  const [hover, setHover] = useState<MatchEvent | null>(null)
  return (
    <PitchMap mini={p.mini} thirds label={p.label} onLeave={() => setHover(null)}
      overlay={hover && isPlaced(hover) ? <MapTip x={hover.x} y={hover.y}>{p.describe(hover)}</MapTip> : null}>
      {(k) => (
        <g>
          <HeatLayer grid={grid} />
          {!p.mini && pts.length > 0 && thirds.map((n, i) => (
            <text key={i} x={((i + 0.5) * PW) / 3} y={22 * k + 6} textAnchor="middle" fontSize={13 * k} fontWeight={700} fill={C.ink} stroke={C.grass} strokeWidth={4 * k} paintOrder="stroke">{pct(n / total, lang)}</text>
          ))}
          {p.showPoints && pts.map((e) => (
            <Mark key={e.id} x={e.x} y={e.y} k={k} r={3.2} fill={C.ink} stroke={C.paper} strokeW={1} onEnter={() => setHover(e)} onClick={clickable(p, e) ? () => p.onPick!(e) : undefined} label={t('maps.watch')} />
          ))}
        </g>
      )}
    </PitchMap>
  )
}

/** Thirds and lanes of a set of placed actions, as two compact bars. */
export function ZoneBars({ events }: { events: MatchEvent[] }) {
  const { t, lang } = useT('viz')
  const th = byThird(events), ln = byLane(events)
  const n = th[0] + th[1] + th[2]
  if (!n) return null
  const Bar = ({ v, labels, title }: { v: [number, number, number]; labels: string[]; title: string }) => (
    <div>
      <div className="mb-1.5 text-[13px] font-semibold text-ink-soft">{title}</div>
      <div className="flex h-8 gap-0.5 overflow-hidden rounded-lg" role="img" aria-label={`${title}: ${labels.map((l, i) => `${l} ${pct(v[i] / n, lang)}`).join(', ')}`}>
        {v.map((x, i) => (
          <div key={i} className="grid min-w-[2.5rem] place-items-center text-[12px] font-semibold tabular-nums" style={{ flexGrow: Math.max(x, n * 0.06), flexBasis: 0, background: ['#CBE5D6', '#73B391', '#13804F'][i], color: i === 2 ? '#fff' : '#12211A' }}>{pct(x / n, lang)}</div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11.5px] text-ink-muted">{labels.map((l) => <span key={l}>{l}</span>)}</div>
    </div>
  )
  return (
    <div className="space-y-4 rounded-card border border-line bg-paper p-4">
      <Bar v={th} title={t('zones.thirds')} labels={[t('zones.def'), t('zones.mid'), t('zones.att')]} />
      <Bar v={ln} title={t('zones.lanes')} labels={[t('zones.left'), t('zones.centre'), t('zones.right')]} />
      <p className="text-[12.5px] text-ink-muted">{t('zones.count', { count: n })}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ defensive actions */

export type DefKind = 'regain' | 'regain5' | 'loss'
export const DEF_CODES: Record<DefKind, string[]> = { regain: ['REGAIN'], regain5: ['REGAIN5'], loss: ['LOSS', 'PASS_LOST'] }

export function DefensiveMap(p: MapCommon & { kinds: DefKind[] }) {
  const { t } = useT('viz')
  const [hover, setHover] = useState<MatchEvent | null>(null)
  const of = (k: DefKind) => p.events.filter((e) => e.side === 'us' && DEF_CODES[k].includes(e.code))
  const pts = p.kinds.flatMap((k) => of(k).filter(isPlaced).map((e) => ({ e, k })))
  const order: DefKind[] = ['loss', 'regain', 'regain5']
  pts.sort((a, b) => order.indexOf(a.k) - order.indexOf(b.k))
  const style = (k: DefKind, e: MatchEvent) => k === 'loss'
    ? { kind: 'cross' as const, fill: e.code === 'LOSS' ? C.loss : '#E8798A' }
    : k === 'regain5' ? { kind: 'circle' as const, fill: C.usDeep } : { kind: 'circle' as const, fill: C.usSoft }
  const map = (
    <PitchMap thirds label={t('maps.def.aria')} onLeave={() => setHover(null)}
      overlay={hover && isPlaced(hover) ? <MapTip x={hover.x} y={hover.y}>{p.describe(hover)}</MapTip> : null}>
      {(k) => <g>{pts.map(({ e, k: kind }) => <Mark key={e.id} x={e.x!} y={e.y!} k={k} r={kind === 'loss' ? 4.6 : 5} {...style(kind, e)} onEnter={() => setHover(e)} onClick={clickable(p, e) ? () => p.onPick!(e) : undefined} label={t('maps.watch')} />)}</g>}
    </PitchMap>
  )
  const rows: [DefKind, string][] = [['regain5', t('def.regain5')], ['regain', t('def.regain')], ['loss', t('def.loss')]]
  const aside = (
    <div className="overflow-x-auto rounded-card border border-line bg-paper">
      <table className="table-n">
        <thead><tr><th>{t('def.table')}</th><th className="num">{t('zones.defShort')}</th><th className="num">{t('zones.midShort')}</th><th className="num">{t('zones.attShort')}</th></tr></thead>
        <tbody>
          {rows.map(([k, label]) => {
            const v = byThird(of(k))
            return <tr key={k}><td className="text-ink-soft">{label}</td>{v.map((n, i) => <td key={i} className={cx('num font-semibold', k === 'loss' && i === 0 && n > 0 ? 'text-clay-600' : 'text-ink')}>{n}</td>)}</tr>
          })}
        </tbody>
      </table>
      <p className="border-t border-line px-3 py-2 text-[12.5px] text-ink-muted">{t('def.hint')}</p>
    </div>
  )
  const legend = (
    <>
      <LegendItem fill={C.usDeep}>{t('def.regain5')}</LegendItem>
      <LegendItem fill={C.usSoft}>{t('def.regain')}</LegendItem>
      <LegendItem kind="cross" fill={C.loss}>{t('def.lossBall')}</LegendItem>
      <LegendItem kind="cross" fill="#E8798A">{t('def.lossPass')}</LegendItem>
    </>
  )
  return <MapLayout map={map} legend={legend} aside={aside} />
}

/* ------------------------------------------------------------------ set pieces */

const SP_LETTER: Record<string, string> = { CORNER: 'C', FREEKICK: 'F', PENALTY: 'P', THROWIN: 'T', GOALKICK: 'G' }
export function SetPieceMap(p: MapCommon & { codeLabel: (c: string) => string }) {
  const { t } = useT('viz')
  const list = p.events.filter((e) => SET_PIECES.includes(e.code))
  const [hover, setHover] = useState<MatchEvent | null>(null)
  if (!list.length) return <EmptyMap text={t('maps.sp.empty')} />
  const placed = list.filter(isPlaced)
  const map = (
    <PitchMap label={t('maps.sp.aria', { count: list.length })} onLeave={() => setHover(null)}
      overlay={hover && isPlaced(hover) ? <MapTip x={hover.x} y={hover.y}>{p.describe(hover)}</MapTip> : null}>
      {(k) => (
        <g>
          {placed.map((e) => (
            <g key={e.id}>
              <Mark x={e.x!} y={e.y!} k={k} r={8} kind={e.side === 'us' ? 'circle' : 'square'} fill={e.side === 'us' ? C.usDeep : C.them} onEnter={() => setHover(e)} onClick={clickable(p, e) ? () => p.onPick!(e) : undefined} focusable label={p.codeLabel(e.code)} />
              <text x={X(e.x!)} y={Y(e.y!)} dy={3.8 * k} textAnchor="middle" fontSize={10.5 * k} fontWeight={700} fill={C.paper} style={{ pointerEvents: 'none' }}>{SP_LETTER[e.code]}</text>
            </g>
          ))}
        </g>
      )}
    </PitchMap>
  )
  const aside = (
    <div className="rounded-card border border-line bg-paper">
      <table className="table-n">
        <thead><tr><th>{t('maps.sp.table')}</th><th className="num">{t('side.us')}</th><th className="num">{t('side.them')}</th></tr></thead>
        <tbody>
          {SET_PIECES.map((c) => {
            const u = list.filter((e) => e.code === c && e.side === 'us').length, th = list.filter((e) => e.code === c && e.side === 'them').length
            if (!u && !th) return null
            return <tr key={c}><td className="text-ink-soft"><span className="mr-2 inline-grid h-5 w-5 place-items-center rounded-full bg-forest-600 text-[10.5px] font-bold text-white">{SP_LETTER[c]}</span>{p.codeLabel(c)}</td><td className="num font-semibold">{u}</td><td className="num text-ink-soft">{th}</td></tr>
          })}
        </tbody>
      </table>
      {placed.length < list.length && <p className="border-t border-line px-3 py-2 text-[12.5px] text-ink-muted">{t('shot.unplaced', { count: list.length - placed.length })}</p>}
    </div>
  )
  return <MapLayout map={map} aside={aside} legend={<><LegendItem fill={C.usDeep}>{t('side.us')}</LegendItem><LegendItem kind="square" fill={C.them}>{t('side.them')}</LegendItem></>} />
}

/* ------------------------------------------------------------------ territory and field tilt */

export function TerritoryView({ events }: { events: MatchEvent[] }) {
  const { t, lang } = useT('viz')
  const tr = territory(events)
  const tilt = fieldTilt(events)
  const poss = possession(events)
  const n = tr.usTotal || 1
  const shares = tr.us.map((v) => v / n)
  const maxShare = Math.max(...shares, 0.01)
  if (!tr.usTotal) return <EmptyMap text={t('maps.noPositions')} />
  const map = (
    <PitchMap label={t('maps.territory.aria', { def: pct(shares[0], lang), mid: pct(shares[1], lang), att: pct(shares[2], lang) })}>
      {(k) => (
        <g>
          {shares.map((s, i) => <rect key={i} x={(i * PW) / 3} y={0} width={PW / 3} height={PH} fill={C.us} fillOpacity={0.08 + 0.55 * (s / maxShare)} />)}
          {[1, 2].map((i) => <line key={i} x1={(i * PW) / 3} y1={0} x2={(i * PW) / 3} y2={PH} stroke={C.paper} strokeWidth={2 * k} />)}
          {shares.map((s, i) => (
            <g key={`t${i}`}>
              <text x={((i + 0.5) * PW) / 3} y={PH / 2} textAnchor="middle" fontSize={26 * k} fontWeight={800} fill={s / maxShare > 0.6 ? C.paper : C.ink}>{pct(s, lang)}</text>
              <text x={((i + 0.5) * PW) / 3} y={PH / 2 + 22 * k} textAnchor="middle" fontSize={12 * k} fill={s / maxShare > 0.6 ? C.paper : C.muted}>{t('maps.territory.ofActions', { count: tr.us[i] })}</text>
            </g>
          ))}
        </g>
      )}
    </PitchMap>
  )
  const aside = (
    <div className="space-y-4">
      <div className="rounded-card border border-line bg-paper p-4">
        <div className="text-[13.5px] font-semibold text-ink-soft">{t('maps.territory.tilt')}</div>
        {tilt.value != null ? (
          <>
            <div className="mt-1 font-display text-[30px] leading-none tabular-nums text-ink">{pct(tilt.value, lang)}</div>
            <p className="mt-2 text-[12.5px] text-ink-muted">{t(tilt.method === 'positions' ? 'maps.territory.tiltPos' : 'maps.territory.tiltCodes')}</p>
          </>
        ) : <p className="mt-1 text-[13.5px] leading-relaxed text-ink-muted">{t('maps.territory.tiltMissing')}</p>}
      </div>
      <div className="rounded-card border border-line bg-paper p-4">
        <div className="text-[13.5px] font-semibold text-ink-soft">{t('maps.territory.possession')}</div>
        {poss.share != null ? (
          <>
            <div className="mt-1 font-display text-[30px] leading-none tabular-nums text-ink">{pct(poss.share, lang)}</div>
            <p className="mt-2 text-[12.5px] text-ink-muted">{t(poss.method === 'passes' ? 'maps.territory.possPasses' : 'maps.territory.possTime')}</p>
          </>
        ) : <p className="mt-1 text-[13.5px] text-ink-muted">{t('maps.territory.possMissing')}</p>}
      </div>
      {tr.them && (
        <div className="rounded-card border border-line bg-paper p-4">
          <div className="mb-2 text-[13.5px] font-semibold text-ink-soft">{t('maps.territory.theirs')}</div>
          <div className="flex justify-between text-[13px] tabular-nums text-ink-soft">{tr.them.map((v, i) => <span key={i}>{[t('zones.defShort'), t('zones.midShort'), t('zones.attShort')][i]} {pct(v / (tr.themTotal || 1), lang)}</span>)}</div>
        </div>
      )}
    </div>
  )
  return <MapLayout map={map} aside={aside} below={<p className="mt-2 text-[12.5px] text-ink-muted">{t('maps.territory.how')}</p>} />
}

export function EmptyMap({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-line bg-paper/70 px-5 py-10 text-center">
      <p className="mx-auto max-w-md text-[14.5px] leading-relaxed text-ink-muted">{text}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}
