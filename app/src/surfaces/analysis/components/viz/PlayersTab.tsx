// Report tab « Joueurs »: a card per player with his key coded actions (each one plays its clips),
// his heat map and pass map, a side-by-side comparison and the player of the match.
import { useMemo, useState, type ReactNode } from 'react'
import { Award, Check } from 'lucide-react'
import { useT } from '../../../../i18n'
import { db } from '../../../../lib/db'
import { cx } from '../../../../lib/util'
import type { MatchEvent, Player } from '../../../../lib/types'
import { BALL_ACTIONS, isPlaced, passEnds, per90, playerLines, type PlayerLine, type Pt } from '../../../../lib/viz'
import { num, pct, Pills, PlayButton, PlayerSelect, useViz } from './context'
import { HeatMapView } from './maps'
import { C, Mark, PitchMap, X, Y } from './pitch'

export default function PlayersTab() {
  const { t } = useT('viz')
  const { match, events, byId } = useViz()
  const lines = useMemo(() => playerLines(match, events).filter((l) => l.minutes > 0 || l.events.length > 0), [match, events])
  const ends = useMemo(() => passEnds(events), [events])
  const [order, setOrder] = useState<'score' | 'number'>('score')
  const sorted = order === 'score' ? lines : [...lines].sort((a, b) => (byId.get(a.id)?.number ?? 99) - (byId.get(b.id)?.number ?? 99))
  const [a, setA] = useState(() => lines[0]?.id ?? '')
  const [b, setB] = useState(() => lines[1]?.id ?? '')
  if (!lines.length) {
    return <section data-tour="report-players" className="rounded-card border border-dashed border-line bg-paper/70 px-5 py-10 text-center text-[14.5px] text-ink-muted">{t('players.empty')}</section>
  }
  return (
    <section data-tour="report-players" aria-labelledby="players-h" className="space-y-6">
      <div>
        <h2 id="players-h" className="font-display text-[22px] leading-tight text-ink">{t('players.title')}</h2>
        <p className="mt-1 max-w-[70ch] text-[14px] text-ink-muted">{t('players.subtitle')}</p>
      </div>
      <Potm lines={lines} />
      <Compare lines={lines} a={a} b={b} setA={setA} setB={setB} />
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-[18px] text-ink">{t('players.cards', { count: lines.length })}</h3>
          <Pills label={t('players.order')} value={order} onChange={setOrder} options={[{ id: 'score', label: t('players.byScore') }, { id: 'number', label: t('players.byNumber') }]} />
        </div>
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((l) => <li key={l.id}><PlayerCard line={l} player={byId.get(l.id)} potm={match.potmId === l.id} ends={ends} /></li>)}
        </ul>
        <p className="mt-3 text-[12.5px] text-ink-muted">{t('players.scoreHow')}</p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ player of the match */

function Potm({ lines }: { lines: PlayerLine[] }) {
  const { t } = useT('viz')
  const { match, byId } = useViz()
  const [saved, setSaved] = useState(false)
  const cur = match.potmId ? byId.get(match.potmId) : undefined
  const save = async (id: string) => {
    await db.matches.update(match.id, { potmId: id || undefined })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2200)
  }
  return (
    <div className="flex flex-col gap-3 rounded-card border border-line bg-paper p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sun-100 text-ink"><Award size={20} strokeWidth={1.75} aria-hidden="true" /></span>
        <div>
          <div className="text-[13px] font-semibold text-ink-muted">{t('players.potm')}</div>
          <div className="text-[16px] font-semibold text-ink">{cur ? `${cur.number != null ? `${cur.number}. ` : ''}${cur.name}` : t('players.potmNone')}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="nj-potm" className="sr-only">{t('players.potmPick')}</label>
        <select id="nj-potm" value={match.potmId ?? ''} onChange={(e) => save(e.target.value)} className="input min-h-[44px] sm:w-64">
          <option value="">{t('players.potmPick')}</option>
          {lines.map((l) => byId.get(l.id)).filter((p): p is Player => !!p).map((p) => <option key={p.id} value={p.id}>{p.number != null ? `${p.number}. ` : ''}{p.name}</option>)}
        </select>
        {saved && <span role="status" className="inline-flex items-center gap-1 text-[13px] font-semibold text-forest-700"><Check size={15} />{t('players.saved')}</span>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ one card */

interface StatRow { key: string; label: string; value: ReactNode; events: MatchEvent[] }

function useStatRows(l: PlayerLine): StatRow[] {
  const { t, lang } = useT('viz')
  const of = (...codes: string[]) => l.events.filter((e) => codes.includes(e.code))
  return [
    { key: 'pass', label: t('stat.passes'), value: <>{l.passOk}<span className="text-ink-faint">/{l.passes}</span>{l.accuracy != null && <span className="ml-1.5 text-[12.5px] font-normal text-ink-muted">{pct(l.accuracy, lang)}</span>}</>, events: of('PASS_OK') },
    { key: 'prog', label: t('stat.progressive'), value: l.progressive, events: of('PROG', 'LINE') },
    { key: 'att', label: t('stat.final3box'), value: <>{l.final3}<span className="text-ink-faint">, {l.box}</span></>, events: of('FINAL3', 'BOX') },
    { key: 'shot', label: t('stat.shots'), value: <>{l.shots}<span className="ml-1 text-[12.5px] font-normal text-ink-muted">{t('stat.shotsDetail', { on: l.onTarget, goals: l.goals })}</span></>, events: of('SHOT') },
    { key: 'regain', label: t('stat.regains'), value: <>{l.regains}<span className="ml-1 text-[12.5px] font-normal text-ink-muted">{t('stat.in5', { n: l.regain5 })}</span></>, events: of('REGAIN', 'REGAIN5') },
    { key: 'loss', label: t('stat.losses'), value: l.losses, events: of('LOSS', 'PASS_LOST') },
  ]
}

function PlayerCard({ line: l, player, potm, ends }: { line: PlayerLine; player?: Player; potm: boolean; ends: Map<string, Pt> }) {
  const { t, lang } = useT('viz')
  const rows = useStatRows(l)
  const name = player?.name ?? '?'
  const pos = player ? t(`common:positions.${player.position}`, { defaultValue: player.position }) : ''
  const heat = l.events.filter((e) => BALL_ACTIONS.includes(e.code))
  return (
    <article className={cx('flex h-full flex-col rounded-card border bg-paper', potm ? 'border-sun-500' : 'border-line')} aria-label={name}>
      <header className="flex items-start gap-3 px-4 pt-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-forest-600 font-display text-[17px] tabular-nums text-white">{player?.number ?? ''}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h4 className="truncate text-[16px] font-semibold text-ink" style={{ fontStretch: '100%' }}>{name}</h4>
            {potm && <span className="inline-flex items-center gap-1 rounded-full bg-sun-100 px-2 py-0.5 text-[11.5px] font-semibold text-ink"><Award size={12} aria-hidden="true" />{t('players.potmBadge')}</span>}
          </div>
          <div className="text-[12.5px] text-ink-muted">{[pos, l.starter ? t('players.starter') : t('players.sub'), t('players.minutes', { n: l.minutes })].filter(Boolean).join(', ')}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-[20px] leading-none tabular-nums text-ink">{num(l.score, lang)}</div>
          <div className="mt-0.5 text-[11px] text-ink-faint">{t('players.score')}</div>
        </div>
      </header>
      <dl className="mt-3 px-4">
        {rows.map((r) => (
          <div key={r.key} className="flex min-h-[44px] items-center gap-2 border-t border-line/70">
            <dt className="min-w-0 flex-1 text-[13.5px] text-ink-soft">{r.label}</dt>
            <dd className="text-right text-[15px] font-semibold tabular-nums text-ink">{r.value}</dd>
            <span className="w-9 shrink-0">{r.events.length > 0 && <PlayButton size="sm" events={r.events} label={t('players.play', { stat: r.label, name })} />}</span>
          </div>
        ))}
      </dl>
      <div className="mt-auto grid grid-cols-2 gap-2 px-4 pb-4 pt-3">
        <div>
          <div className="mb-1 text-[11.5px] font-semibold text-ink-muted">{t('players.heat')}</div>
          {heat.some(isPlaced) ? <HeatMapView mini events={heat} describe={() => null} label={t('players.heatAria', { name })} /> : <NoPos />}
        </div>
        <div>
          <div className="mb-1 text-[11.5px] font-semibold text-ink-muted">{t('players.passMap')}</div>
          {l.events.some((e) => (e.code === 'PASS_OK' || e.code === 'PASS_LOST') && isPlaced(e)) ? <MiniPassMap events={l.events} ends={ends} label={t('players.passAria', { name })} /> : <NoPos />}
        </div>
      </div>
    </article>
  )
}

function NoPos() {
  const { t } = useT('viz')
  return <div className="grid aspect-[1.52] place-items-center rounded-lg bg-sand/60 px-2 text-center text-[11.5px] text-ink-muted">{t('players.noPos')}</div>
}

/** His passes: completed ones as arrows to the receiver's next action, lost ones as red crosses. */
function MiniPassMap({ events, ends, label }: { events: MatchEvent[]; ends: Map<string, Pt>; label: string }) {
  const ok = events.filter((e) => e.code === 'PASS_OK' && isPlaced(e))
  const lost = events.filter((e) => e.code === 'PASS_LOST' && isPlaced(e))
  return (
    <PitchMap mini label={label}>
      {(k) => (
        <g>
          {ok.map((e) => {
            const to = ends.get(e.id)
            if (!to) return <circle key={e.id} cx={X(e.x!)} cy={Y(e.y!)} r={2 * k} fill={C.us} />
            const x1 = X(e.x!), y1 = Y(e.y!), x2 = X(to.x), y2 = Y(to.y)
            const fwd = to.x > e.x! + 8
            return (
              <g key={e.id}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={fwd ? C.usDeep : C.usSoft} strokeWidth={1.3 * k} strokeOpacity={0.8} />
                <circle cx={x2} cy={y2} r={1.6 * k} fill={fwd ? C.usDeep : C.usSoft} />
              </g>
            )
          })}
          {lost.map((e) => <Mark key={e.id} x={e.x!} y={e.y!} k={k} r={2.6} kind="cross" fill={C.loss} />)}
        </g>
      )}
    </PitchMap>
  )
}

/* ------------------------------------------------------------------ comparison */

function Compare({ lines, a, b, setA, setB }: { lines: PlayerLine[]; a: string; b: string; setA: (v: string) => void; setB: (v: string) => void }) {
  const { t, lang } = useT('viz')
  const { byId } = useViz()
  const [mode, setMode] = useState<'raw' | 'p90'>('raw')
  const la = lines.find((l) => l.id === a), lb = lines.find((l) => l.id === b)
  const ids = lines.map((l) => l.id)
  const metrics: [string, (l: PlayerLine) => number][] = [
    [t('stat.passOk'), (l) => l.passOk], [t('stat.progressive'), (l) => l.progressive], [t('stat.final3'), (l) => l.final3], [t('stat.box'), (l) => l.box],
    [t('stat.shotsShort'), (l) => l.shots], [t('stat.goals'), (l) => l.goals], [t('stat.regains'), (l) => l.regains], [t('stat.regain5'), (l) => l.regain5],
    [t('stat.fixations'), (l) => l.fixations], [t('stat.losses'), (l) => l.losses],
  ]
  const val = (l: PlayerLine | undefined, f: (l: PlayerLine) => number) => (!l ? null : mode === 'p90' ? per90(f(l), l.minutes) : f(l))
  const heatOf = (l?: PlayerLine) => (l ? l.events.filter((e) => BALL_ACTIONS.includes(e.code)) : [])
  return (
    <div className="rounded-card border border-line bg-paper">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h3 className="font-display text-[18px] text-ink">{t('players.compare')}</h3>
        <Pills label={t('players.mode')} value={mode} onChange={setMode} options={[{ id: 'raw', label: t('players.raw') }, { id: 'p90', label: t('players.p90') }]} />
      </div>
      <div className="grid grid-cols-2 gap-2 px-4 pt-3">
        <PlayerSelect value={a} onChange={setA} ids={ids} label={t('players.compareA')} className="[&_select]:border-forest-300" />
        <PlayerSelect value={b} onChange={setB} ids={ids} label={t('players.compareB')} />
      </div>
      <div className="px-4 py-3">
        <div className="mb-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-[12.5px] text-ink-muted">
          <span className="flex min-w-0 items-center gap-1.5"><span className="h-2.5 w-2.5 shrink-0 rounded-[3px] bg-forest-600" /><span className="truncate">{la ? `${byId.get(la.id)?.name ?? ''}, ${t('players.minutes', { n: la.minutes })}` : ''}</span></span>
          <span />
          <span className="flex min-w-0 items-center justify-end gap-1.5"><span className="truncate">{lb ? `${byId.get(lb.id)?.name ?? ''}, ${t('players.minutes', { n: lb.minutes })}` : ''}</span><span className="h-2.5 w-2.5 shrink-0 rounded-[3px] bg-ink-soft" /></span>
        </div>
        <dl>
          {metrics.map(([label, f]) => {
            const va = val(la, f), vb = val(lb, f)
            const top = Math.max(0.001, va ?? 0, vb ?? 0)
            return (
              <div key={label} className="grid grid-cols-[1fr_7.5rem_1fr] items-center gap-2 py-1.5 sm:grid-cols-[1fr_9rem_1fr]">
                <div className="flex items-center justify-end gap-2">
                  <span className="text-[13.5px] font-semibold tabular-nums text-ink">{num(va, lang)}</span>
                  <span className="h-2.5 rounded-l-full bg-forest-600" style={{ width: `${((va ?? 0) / top) * 70}%`, minWidth: va ? 3 : 0 }} />
                </div>
                <dt className="text-center text-[12.5px] leading-tight text-ink-soft">{label}</dt>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 rounded-r-full bg-ink-soft" style={{ width: `${((vb ?? 0) / top) * 70}%`, minWidth: vb ? 3 : 0 }} />
                  <span className="text-[13.5px] font-semibold tabular-nums text-ink">{num(vb, lang)}</span>
                </div>
              </div>
            )
          })}
        </dl>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[la, lb].map((l, i) => (
            <div key={i}>{l && heatOf(l).some(isPlaced) ? <HeatMapView mini events={heatOf(l)} describe={() => null} label={t('players.heatAria', { name: byId.get(l.id)?.name ?? '' })} /> : <NoPos />}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
