// Report tab « Cartes »: the maps of the match's coded actions, each point opening the video at that moment.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Crosshair, Flame, Flag, MapPinned, Share2, ShieldCheck, Video } from 'lucide-react'
import { useT } from '../../../../i18n'
import { cx } from '../../../../lib/util'
import type { MatchEvent } from '../../../../lib/types'
import { BALL_ACTIONS, byHalf, isPlaced, type HalfFilter } from '../../../../lib/viz'
import { HalfChips, Pills, PlayerSelect, useCodeLabel, useMinute, useOpenVideo, useViz } from './context'
import { DefensiveMap, EmptyMap, HeatMapView, MapLayout, PassNetworkMap, SetPieceMap, ShotMap, TerritoryView, ZoneBars, type DefKind } from './maps'
import { HeatLegend } from './pitch'
import { Honesty } from './Honesty'

type Kind = 'shots' | 'network' | 'heat' | 'def' | 'sp' | 'territory'

export default function MapsTab() {
  const { t } = useT('viz')
  const { match, events, byId, videoId } = useViz()
  const open = useOpenVideo()
  const codeLabel = useCodeLabel()
  const minute = useMinute()
  const [kind, setKind] = useState<Kind>('shots')
  const [half, setHalf] = useState<HalfFilter>('all')
  const [side, setSide] = useState<'both' | 'us' | 'them'>('both')
  const [pid, setPid] = useState('')
  const [points, setPoints] = useState(false)
  const [defKinds, setDefKinds] = useState<DefKind[]>(['regain5', 'regain', 'loss'])
  const evs = useMemo(() => byHalf(events, half), [events, half])
  const ours = events.filter((e) => e.side === 'us')
  const placed = ours.filter(isPlaced).length
  const coded = useMemo(() => [...new Set(events.filter((e) => e.side === 'us' && e.playerId).map((e) => e.playerId!))], [events])
  const nameOf = (id: string) => byId.get(id)?.name ?? '?'
  const numberOf = (id: string) => String(byId.get(id)?.number ?? '')
  const describe = (e: MatchEvent) => (
    <>
      <div className="font-semibold text-ink"><span className="tabular-nums">{minute(e)}</span> {codeLabel(e.code, e.side)}</div>
      {e.playerId && <div>{nameOf(e.playerId)}</div>}
      {videoId && typeof e.videoT === 'number' && <div className="mt-0.5 text-[11.5px] text-forest-700">{t('maps.clickToWatch')}</div>}
    </>
  )
  const pick = videoId ? (e: MatchEvent) => open([e]) : undefined
  const canPick = (e: MatchEvent) => typeof e.videoT === 'number'
  const common = { describe, onPick: pick, canPick }

  const kinds: { id: Kind; label: string; icon: JSX.Element }[] = [
    { id: 'shots', label: t('maps.kind.shots'), icon: <Crosshair size={15} /> },
    { id: 'network', label: t('maps.kind.network'), icon: <Share2 size={15} /> },
    { id: 'heat', label: t('maps.kind.heat'), icon: <Flame size={15} /> },
    { id: 'def', label: t('maps.kind.def'), icon: <ShieldCheck size={15} /> },
    { id: 'sp', label: t('maps.kind.sp'), icon: <Flag size={15} /> },
    { id: 'territory', label: t('maps.kind.territory'), icon: <MapPinned size={15} /> },
  ]
  const heatEvents = evs.filter((e) => e.side === 'us' && BALL_ACTIONS.includes(e.code) && (!pid || e.playerId === pid))
  const defEvents = evs.filter((e) => !pid || e.playerId === pid)
  const toggleDef = (k: DefKind) => setDefKinds((l) => (l.includes(k) ? (l.length > 1 ? l.filter((x) => x !== k) : l) : [...l, k]))

  return (
    <section data-tour="report-maps" aria-labelledby="maps-h" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="maps-h" className="font-display text-[22px] leading-tight text-ink">{t('maps.title')}</h2>
          <p className="mt-1 max-w-[70ch] text-[14px] text-ink-muted">{t('maps.subtitle')}</p>
        </div>
      </div>
      <Honesty />

      {placed === 0 ? (
        <EmptyMap text={t('maps.noPositionsMatch')} action={videoId
          ? <Link to={`/app/analyse/video/${videoId}`} className="btn-primary"><Video size={16} />{t('maps.openVideo')}</Link>
          : <Link to={`/app/analyse/video?nouveau=${match.id}`} className="btn-primary"><Video size={16} />{t('maps.addVideo')}</Link>} />
      ) : (
        <>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label={t('maps.choose')}>
            {kinds.map((k) => (
              <button key={k.id} type="button" onClick={() => setKind(k.id)} aria-pressed={kind === k.id}
                className={cx('chip min-h-[42px] shrink-0 cursor-pointer px-3.5 text-[13.5px] transition-colors [&_svg]:shrink-0', kind === k.id ? 'chip-on' : 'hover:border-ink-faint hover:text-ink')}>
                {k.icon}{k.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <HalfChips value={half} onChange={setHalf} />
            {(kind === 'shots') && <Pills label={t('side.label')} value={side} onChange={setSide} options={[{ id: 'both', label: t('side.both') }, { id: 'us', label: t('side.us') }, { id: 'them', label: t('side.them') }]} />}
            {(kind === 'heat' || kind === 'def') && <PlayerSelect value={pid} onChange={setPid} ids={coded} label={t('filters.player')} allLabel={t('filters.team')} />}
            {kind === 'heat' && (
              <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-full border border-line bg-paper px-3.5 text-[13px] font-semibold text-ink-soft">
                <input type="checkbox" checked={points} onChange={(e) => setPoints(e.target.checked)} className="h-4 w-4 accent-[#0B5D3B]" />{t('maps.heat.points')}
              </label>
            )}
            {kind === 'def' && (['regain5', 'regain', 'loss'] as DefKind[]).map((k) => (
              <button key={k} type="button" aria-pressed={defKinds.includes(k)} onClick={() => toggleDef(k)}
                className={cx('chip min-h-[40px] cursor-pointer px-3', defKinds.includes(k) ? 'border-forest-600 bg-forest-50 text-forest-700' : 'text-ink-muted')}>{t(`def.${k}`)}</button>
            ))}
          </div>

          {placed < ours.length && <p className="text-[12.5px] text-ink-muted">{t('maps.partial', { placed, total: ours.length })}</p>}

          <div>
            {kind === 'shots' && <ShotMap {...common} events={evs} side={side} />}
            {kind === 'network' && <PassNetworkMap key={half} events={evs} nameOf={nameOf} numberOf={numberOf} onPlayList={videoId ? open : undefined} />}
            {kind === 'heat' && (
              heatEvents.some(isPlaced)
                ? <MapLayout map={<HeatMapView {...common} events={heatEvents} showPoints={points} label={t('maps.heat.aria', { who: pid ? nameOf(pid) : t('filters.team') })} />}
                  legend={<HeatLegend />} aside={<ZoneBars events={heatEvents} />} below={<p className="mt-2 text-[12.5px] text-ink-muted">{t('maps.heat.how')}</p>} />
                : <EmptyMap text={t('maps.heat.empty')} />
            )}
            {kind === 'def' && <DefensiveMap {...common} events={defEvents} kinds={defKinds} />}
            {kind === 'sp' && <SetPieceMap {...common} events={evs} codeLabel={(c) => codeLabel(c)} />}
            {kind === 'territory' && <TerritoryView events={evs} />}
          </div>
          {!videoId && <p className="text-[12.5px] text-ink-muted">{t('maps.noVideo')}</p>}
        </>
      )}
    </section>
  )
}
