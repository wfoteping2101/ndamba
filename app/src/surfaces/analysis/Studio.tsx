// « Cartes et saison »: the season of the active team read from its coded matches. Averages over the last
// ten matches, progression charts, game maps aggregated over every coded match, a comparison radar against
// each opponent faced (and the other teams of the club), and the form guide.
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarPlus, ChartNoAxesColumn, Crosshair, Flame, ShieldCheck, Users, Video } from 'lucide-react'
import { db } from '../../lib/db'
import { useDocumentTitle, useLiveQuery } from '../../lib/hooks'
import { useSession } from '../../lib/session'
import { useT } from '../../i18n'
import { cx, fmtDate } from '../../lib/util'
import { fmtNjangi, njangiBand, njangiLabel } from '../../lib/njangi'
import type { Match, MatchEvent, Player, Team } from '../../lib/types'
import { BALL_ACTIONS, digest, minuteText, radarFor, seasonAverages, videoHref, type MatchDigest, type Played, type RadarKey } from '../../lib/viz'
import { EmptyState, PageHeader } from '../../ui'
import { matchKey } from './components/data'
import { Honesty } from './components/viz/Honesty'
import { DefensiveMap, EmptyMap, HeatMapView, MapLayout, ShotMap, ZoneBars, type DefKind } from './components/viz/maps'
import { HeatLegend } from './components/viz/pitch'
import { num, pct, Pills } from './components/viz/context'
import { BarSeries, FormGuide, Radar, type BarItem } from './components/viz/season'

interface StudioData { ready: boolean; done: Match[]; events: Map<string, MatchEvent[]>; videos: Map<string, string>; players: Player[] }

export default function Studio() {
  const { t } = useT('viz')
  const { team, teams, ready } = useSession()
  useDocumentTitle(t('title'))
  const header = <PageHeader title={t('title')} subtitle={team ? t('season.subtitle', { team: team.name }) : t('season.subtitleNone')} />
  if (!ready) return <div>{header}</div>
  if (!team) {
    return (
      <div>{header}
        <div data-tour="season"><EmptyState icon={<Users size={28} />} title={t('season.noTeam')} body={t('season.noTeamBody')} action={<Link to="/app/analyse" className="btn-primary">{t('season.createTeam')}</Link>} /></div>
      </div>
    )
  }
  return <Season team={team} teams={teams} header={header} />
}

function useStudioData(teamId: string): StudioData {
  return useLiveQuery<StudioData>(async () => {
    const all = await db.matches.toArray()
    const done = all.filter((m) => m.status === 'done')
    const evs = done.length ? await db.events.where('matchId').anyOf(done.map((m) => m.id)).toArray() : []
    const events = new Map<string, MatchEvent[]>()
    for (const e of evs) { const l = events.get(e.matchId); if (l) l.push(e); else events.set(e.matchId, [e]) }
    const videos = new Map<string, string>()
    for (const v of await db.videos.toArray()) if (v.matchId && !videos.has(v.matchId)) videos.set(v.matchId, v.id)
    const players = await db.players.where('teamId').equals(teamId).toArray()
    return { ready: true, done, events, videos, players }
  }, [teamId], { ready: false, done: [], events: new Map(), videos: new Map(), players: [] })
}

/** The last ten played matches of a team, oldest first, each with its digest when coded. */
function playedOf(data: StudioData, teamId: string): Played[] {
  return data.done.filter((m) => m.teamId === teamId).sort((a, b) => matchKey(a).localeCompare(matchKey(b))).slice(-10)
    .map((match) => { const evs = data.events.get(match.id) ?? []; return { match, digest: evs.length ? digest(match, evs) : null } })
}

function Season({ team, teams, header }: { team: Team; teams: Team[]; header: ReactNode }) {
  const { t, lang } = useT('viz')
  const data = useStudioData(team.id)
  const items = useMemo(() => playedOf(data, team.id), [data, team.id])
  const coded = items.map((i) => i.digest).filter((d): d is MatchDigest => !!d)
  const avg = useMemo(() => seasonAverages(coded), [coded])
  if (!data.ready) return <div>{header}<div className="grid min-h-[30vh] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-forest-100 border-t-forest-600" /></div></div>

  const form = items.slice(-5).map(({ match: m, digest: d }) => ({ id: m.id, outcome: (m.scoreUs > m.scoreThem ? 'W' : m.scoreUs < m.scoreThem ? 'L' : 'D') as 'W' | 'D' | 'L', score: `${m.scoreUs}-${m.scoreThem}`, opp: m.opponent, href: d ? `/app/analyse/rapport/${m.id}` : `/app/matchs/${m.id}` }))
  const goalsAvg = items.length ? items.reduce((a, i) => a + i.match.scoreUs, 0) / items.length : null
  const againstAvg = items.length ? items.reduce((a, i) => a + i.match.scoreThem, 0) / items.length : null

  if (!items.length) {
    return (
      <div>{header}
        <div data-tour="season">
          <EmptyState icon={<ChartNoAxesColumn size={28} />} title={t('season.emptyTitle')} body={t('season.emptyBody')}
            action={<><Link to="/app/analyse/video" className="btn-primary"><Video size={16} />{t('season.openVideos')}</Link><Link to="/app/matchs/nouveau" className="btn-outline"><CalendarPlus size={16} />{t('season.newMatch')}</Link></>} />
        </div>
      </div>
    )
  }

  const tiles: { label: string; value: ReactNode; hint: ReactNode; accent?: boolean }[] = [
    { label: t('season.tile.goals'), value: num(goalsAvg, lang) ?? '-', hint: t('season.tile.goalsHint', { against: num(againstAvg, lang) ?? '-', count: items.length }) },
    { label: t('season.tile.shotsOn'), value: avg.shotsOn ? num(avg.shotsOn.value, lang) : t('season.nc'), hint: avg.shotsOn ? t('season.tile.shotsHint', { shots: num(avg.shots?.value, lang), count: avg.shotsOn.n }) : t('season.tile.needCodes') },
    { label: t('season.tile.possession'), value: avg.possession ? pct(avg.possession.value, lang) : t('season.nc'), hint: avg.possession ? t(avg.possessionMethods.includes('passes') && avg.possessionMethods.length === 1 ? 'season.tile.possPasses' : 'season.tile.possTime', { count: avg.possession.n }) : t('season.tile.needCodes') },
    { label: t('season.tile.indice'), value: avg.indice ? fmtNjangi(avg.indice.total, lang) : t('season.nc'), hint: avg.indice ? t('season.tile.indiceHint', { label: njangiLabel(avg.indice.total, lang), count: coded.length }) : t('season.tile.needCodes'), accent: true },
    { label: t('season.tile.tilt'), value: avg.tilt ? pct(avg.tilt.value, lang) : t('season.nc'), hint: avg.tilt ? t('season.tile.tiltHint', { count: avg.tilt.n }) : t('season.tile.tiltMissing') },
    { label: t('season.tile.strings'), value: avg.strings ? num(avg.strings.value, lang) : t('season.nc'), hint: avg.strings ? t('season.tile.stringsHint', { max: Math.max(0, ...coded.map((d) => d.longest)), count: avg.strings.n }) : t('season.tile.needCodes') },
  ]

  const label = (m: Match) => fmtDate(m.date, lang, { day: 'numeric', month: 'numeric' })
  const tip = (m: Match, line: ReactNode) => <><div className="font-semibold text-ink">{t('season.vs', { opp: m.opponent })}</div><div className="text-ink-muted">{fmtDate(m.date, lang, { day: 'numeric', month: 'long' })}, {m.scoreUs}-{m.scoreThem}</div><div className="mt-0.5">{line}</div></>
  const href = (i: Played) => (i.digest ? `/app/analyse/rapport/${i.match.id}` : `/app/matchs/${i.match.id}`)
  const band = (v: number) => ['#D7263D', '#E8798A', '#73B391', '#13804F', '#0B5D3B'][njangiBand(v)]
  const goalsBars: BarItem[] = items.map((i) => ({ id: i.match.id, label: label(i.match), value: i.match.scoreUs, value2: i.match.scoreThem, href: href(i), tip: tip(i.match, t('season.goalsTip', { f: i.match.scoreUs, a: i.match.scoreThem })) }))
  const shotBars: BarItem[] = items.map((i) => ({ id: i.match.id, label: label(i.match), value: i.digest?.shots.total ?? null, value2: i.digest?.shots.onTarget ?? null, href: href(i), tip: tip(i.match, i.digest ? t('season.shotsTip', { n: i.digest.shots.total, on: i.digest.shots.onTarget }) : t('season.notCoded')) }))
  const indiceBars: BarItem[] = items.map((i) => ({ id: i.match.id, label: label(i.match), value: i.digest?.result.total ?? null, color: i.digest ? band(i.digest.result.total) : undefined, href: href(i), tip: tip(i.match, i.digest ? t('season.indiceTip', { v: fmtNjangi(i.digest.result.total, lang) }) : t('season.notCoded')) }))
  const possBars: BarItem[] = items.map((i) => ({ id: i.match.id, label: label(i.match), value: i.digest?.possession.share ?? null, href: href(i), tip: tip(i.match, i.digest?.possession.share != null ? t(i.digest.possession.method === 'passes' ? 'season.possTipPasses' : 'season.possTipTime', { v: pct(i.digest.possession.share, lang) }) : t('season.notCoded')) }))

  return (
    <div>
      {header}
      <div data-tour="season" className="space-y-8">
        <Honesty />

        <section aria-labelledby="form-h" className="flex flex-col gap-4 rounded-panel border border-line bg-paper p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="form-h" className="text-[18px] text-ink">{t('season.form')}</h2>
            <p className="mt-1 text-[13.5px] text-ink-muted">{t('season.counted', { played: items.length, count: coded.length })}</p>
          </div>
          <FormGuide items={form} />
        </section>

        <section aria-labelledby="tiles-h">
          <h2 id="tiles-h" className="mb-3 text-[20px] text-ink">{t('season.averages')}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {tiles.map((x) => (
              <div key={x.label} className={cx('rounded-card border border-line bg-paper px-4 py-3.5', x.accent && 'border-t-[3px] border-t-sun-500')}>
                <div className="text-[13px] font-semibold leading-snug text-ink-muted">{x.label}</div>
                {x.value === t('season.nc')
                  ? <div className="mt-2 flex min-h-[28px] items-end text-[15px] font-semibold leading-none text-ink-faint">{x.value}</div>
                  : <div className="mt-2 font-display text-[28px] leading-none tabular-nums text-ink">{x.value}</div>}
                <div className="mt-2 text-[12px] leading-snug text-ink-muted">{x.hint}</div>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="prog-h">
          <h2 id="prog-h" className="mb-1 text-[20px] text-ink">{t('season.progression')}</h2>
          <p className="mb-3 text-[13.5px] text-ink-muted">{t('season.progressionHint')}</p>
          <div className="grid gap-4 lg:grid-cols-2">
            <BarSeries title={t('season.chart.goals')} mode="diverging" items={goalsBars} format={(v) => String(v)}
              legend={<><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-forest-500" />{t('season.for')}</span><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-clay-500" />{t('season.against')}</span></>} />
            <BarSeries title={t('season.chart.shots')} mode="nested" items={shotBars} format={(v) => String(v)}
              legend={<><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-forest-100" />{t('season.shots')}</span><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-forest-600" />{t('season.onTarget')}</span></>} />
            <BarSeries title={t('season.chart.indice')} items={indiceBars} format={(v) => fmtNjangi(v, lang)} max={100} />
            <BarSeries title={t('season.chart.possession')} items={possBars} format={(v) => pct(v, lang) ?? ''} max={1} />
          </div>
        </section>

        <SeasonMaps items={items} data={data} />
        <Compare items={items} team={team} teams={teams} data={data} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ maps over the season */

function SeasonMaps({ items, data }: { items: Played[]; data: StudioData }) {
  const { t } = useT('viz')
  const navigate = useNavigate()
  const [kind, setKind] = useState<'shots' | 'heat' | 'regains'>('shots')
  const [losses, setLosses] = useState(false)
  const placedMatches = items.filter((i) => i.digest && i.digest.placed > 0)
  const events = placedMatches.flatMap((i) => i.digest!.events)
  const byMatch = new Map(items.map((i) => [i.match.id, i.match]))
  const byPlayer = new Map(data.players.map((p) => [p.id, p]))
  const describe = (e: MatchEvent) => {
    const m = byMatch.get(e.matchId)
    return (
      <>
        <div className="font-semibold text-ink">{m ? minuteText(e, m.halfMinutes) : ''} {t(['CORNER', 'FREEKICK', 'PENALTY', 'THROWIN', 'GOALKICK'].includes(e.code) ? `code.${e.code}` : `common:events.${e.code}`)}</div>
        {e.playerId && byPlayer.get(e.playerId) && <div>{byPlayer.get(e.playerId)!.name}</div>}
        {m && <div className="text-ink-muted">{t('season.vs', { opp: m.opponent })}</div>}
      </>
    )
  }
  const pick = (e: MatchEvent) => { const v = data.videos.get(e.matchId); if (v && typeof e.videoT === 'number') navigate(videoHref(v, [e.videoT])) }
  const canPick = (e: MatchEvent) => data.videos.has(e.matchId) && typeof e.videoT === 'number'
  const common = { describe, onPick: pick, canPick }
  const heat = events.filter((e) => e.side === 'us' && BALL_ACTIONS.includes(e.code))
  const kinds: DefKind[] = losses ? ['regain5', 'regain', 'loss'] : ['regain5', 'regain']
  return (
    <section aria-labelledby="smaps-h" className="space-y-3">
      <div>
        <h2 id="smaps-h" className="text-[20px] text-ink">{t('season.maps')}</h2>
        <p className="mt-1 text-[13.5px] text-ink-muted">{t('season.positionsFor', { count: placedMatches.length, total: items.length })}</p>
      </div>
      {!placedMatches.length ? (
        <EmptyMap text={t('season.mapsEmpty')} action={<Link to="/app/analyse/video" className="btn-primary"><Video size={16} />{t('season.openVideos')}</Link>} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Pills label={t('maps.choose')} value={kind} onChange={setKind} options={[
              { id: 'shots', label: <span className="inline-flex items-center gap-1.5"><Crosshair size={14} />{t('maps.kind.shots')}</span> },
              { id: 'heat', label: <span className="inline-flex items-center gap-1.5"><Flame size={14} />{t('maps.kind.heat')}</span> },
              { id: 'regains', label: <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} />{t('season.regains')}</span> },
            ]} />
            {kind === 'regains' && (
              <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-full border border-line bg-paper px-3.5 text-[13px] font-semibold text-ink-soft">
                <input type="checkbox" checked={losses} onChange={(e) => setLosses(e.target.checked)} className="h-4 w-4 accent-[#0B5D3B]" />{t('season.withLosses')}
              </label>
            )}
          </div>
          {kind === 'shots' && <ShotMap {...common} events={events} side="both" />}
          {kind === 'heat' && <MapLayout map={<HeatMapView {...common} events={heat} label={t('maps.heat.aria', { who: t('filters.team') })} />} legend={<HeatLegend />} aside={<ZoneBars events={heat} />} />}
          {kind === 'regains' && <DefensiveMap {...common} events={events} kinds={kinds} />}
        </>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ comparison radar */

function Compare({ items, team, teams, data }: { items: Played[]; team: Team; teams: Team[]; data: StudioData }) {
  const { t, lang } = useT('viz')
  const opponents = [...new Set([...items].reverse().map((i) => i.match.opponent))]
  const others = teams.filter((x) => x.id !== team.id)
  const options = [...opponents.map((o) => ({ id: `o:${o}`, label: o })), ...others.map((x) => ({ id: `t:${x.id}`, label: x.name }))]
  const [sel, setSel] = useState(options[0]?.id ?? '')
  const cur = options.find((o) => o.id === sel) ?? options[0]
  const otherItems = useMemo(() => (cur?.id.startsWith('t:') ? playedOf(data, cur.id.slice(2)) : []), [cur?.id, data])
  if (!cur) return null
  const vals = cur.id.startsWith('o:') ? radarFor(items.filter((i) => i.match.opponent === cur.label)) : { us: radarFor(items).us, them: radarFor(otherItems).us }
  const format = (k: RadarKey, v: number | null) => {
    if (v == null) return t('season.nc')
    if (k === 'possession' || k === 'conversion' || k === 'winRate') return pct(v, lang) ?? ''
    if (k === 'passesOk') return String(Math.round(v))
    return num(v, lang) ?? ''
  }
  const n = cur.id.startsWith('o:') ? items.filter((i) => i.match.opponent === cur.label).length : otherItems.length
  return (
    <section aria-labelledby="cmp-h" className="rounded-panel border border-line bg-paper p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="cmp-h" className="text-[20px] text-ink">{t('season.compare')}</h2>
          <p className="mt-1 text-[13.5px] text-ink-muted">{t(cur.id.startsWith('o:') ? 'season.compareOpp' : 'season.compareTeam', { count: n })}</p>
        </div>
        <label className="w-full sm:w-auto">
          <span className="label">{t('season.compareWith')}</span>
          <select value={cur.id} onChange={(e) => setSel(e.target.value)} className="input sm:w-72">
            {opponents.length > 0 && <optgroup label={t('season.opponents')}>{opponents.map((o) => <option key={o} value={`o:${o}`}>{o}</option>)}</optgroup>}
            {others.length > 0 && <optgroup label={t('season.clubTeams')}>{others.map((x) => <option key={x.id} value={`t:${x.id}`}>{x.name}</option>)}</optgroup>}
          </select>
        </label>
      </div>
      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-start">
        <Radar a={vals.us} b={vals.them} aLabel={team.name} bLabel={cur.label} format={format} />
        <div className="space-y-2 text-[13.5px] leading-relaxed text-ink-muted lg:pt-10">
          <p>{t('season.radarHow')}</p>
          {Object.values(vals.them).some((v) => v == null) && <p>{t('season.radarMissing')}</p>}
          {others.length === 0 && <p>{t('season.radarClub')}</p>}
        </div>
      </div>
    </section>
  )
}
