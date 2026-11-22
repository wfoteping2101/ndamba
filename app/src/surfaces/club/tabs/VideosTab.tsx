// Vidéothèque: every video of the club, across teams. Filters: team, kind (match, training, scouting of an
// opponent), where it lives (link, file on a device, hosted by Ndamba), date, coded or not. A card opens the studio.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera, CloudUpload, FileVideo, Link2, Plus, Scissors } from 'lucide-react'
import { useT } from '../../../i18n'
import { computeNjangi, fmtNjangi } from '../../../lib/njangi'
import type { Match, MatchEvent, VideoProject } from '../../../lib/types'
import { addDays, cx, fmtClock, fmtDate, toISODate, todayISO } from '../../../lib/util'
import { Segmented } from '../../../ui'
import { currentSeason, videoCoded, videoKind, videoSourceGroup, videoTeamId, type ClubData } from '../components/data'

type KindF = 'all' | 'match' | 'training' | 'scouting'
type SourceF = 'all' | 'link' | 'file' | 'hosted'
type DateF = 'all' | '30' | 'season'
type CodedF = 'all' | 'coded' | 'todo'

export function VideosTab({ data, eventsByMatch, matchesById }: { data: ClubData; eventsByMatch: Map<string, MatchEvent[]>; matchesById: Map<string, Match> }) {
  const { t, lang } = useT('club')
  const [team, setTeam] = useState('all')
  const [kind, setKind] = useState<KindF>('all')
  const [source, setSource] = useState<SourceF>('all')
  const [date, setDate] = useState<DateF>('all')
  const [coded, setCoded] = useState<CodedF>('all')
  const teamsById = useMemo(() => new Map(data.teams.map((tm) => [tm.id, tm])), [data.teams])
  const season = currentSeason()
  const dateOf = (v: VideoProject) => (v.matchId ? matchesById.get(v.matchId)?.date : undefined) ?? toISODate(new Date(v.createdAt))
  const hasOrphans = data.videos.some((v) => !videoTeamId(v, matchesById))

  const list = useMemo(() => data.videos.filter((v) => {
    const tid = videoTeamId(v, matchesById)
    if (team !== 'all' && (team === 'none' ? !!tid : tid !== team)) return false
    if (kind !== 'all' && videoKind(v) !== kind) return false
    if (source !== 'all' && videoSourceGroup(v) !== source) return false
    const d = dateOf(v)
    if (date === '30' && d < addDays(todayISO(), -30)) return false
    if (date === 'season' && (d < season.start || d > season.end)) return false
    const c = videoCoded(v, eventsByMatch) > 0
    if (coded === 'coded' && !c) return false
    if (coded === 'todo' && c) return false
    return true
  }).sort((a, b) => dateOf(b).localeCompare(dateOf(a))), [data.videos, team, kind, source, date, coded, eventsByMatch, matchesById]) // eslint-disable-line react-hooks/exhaustive-deps
  const filtered = team !== 'all' || kind !== 'all' || source !== 'all' || date !== 'all' || coded !== 'all'
  const reset = () => { setTeam('all'); setKind('all'); setSource('all'); setDate('all'); setCoded('all') }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] text-ink-muted">{t('videos.lead', { count: data.videos.length })}</p>
        <div className="flex flex-wrap gap-2">
          <Link to="/app/filmer" className="btn-ghost min-h-[44px]"><Camera size={17} />{t('videos.film')}</Link>
          <Link to="/app/analyse/video?nouveau=" className="btn-primary min-h-[44px]"><Plus size={17} />{t('videos.new')}</Link>
        </div>
      </div>

      <div className="mb-5 space-y-3 rounded-card border border-line bg-paper p-3 sm:p-4">
        <Segmented<KindF> value={kind} onChange={setKind} options={(['all', 'match', 'training', 'scouting'] as const).map((id) => ({ id, label: t(`videos.kinds.${id}`) }))} />
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Select id="vf-team" label={t('videos.f.team')} value={team} onChange={setTeam}
            options={[['all', t('videos.f.allTeams')], ...data.teams.map((tm) => [tm.id, tm.name] as [string, string]), ...(hasOrphans ? [['none', t('videos.f.noTeam')] as [string, string]] : [])]} />
          <Select id="vf-source" label={t('videos.f.source')} value={source} onChange={(v) => setSource(v as SourceF)}
            options={(['all', 'link', 'file', 'hosted'] as const).map((k) => [k, t(`videos.sources.${k}`)])} />
          <Select id="vf-date" label={t('videos.f.date')} value={date} onChange={(v) => setDate(v as DateF)}
            options={(['all', '30', 'season'] as const).map((k) => [k, t(`videos.dates.${k}`, { season: season.label })])} />
          <Select id="vf-coded" label={t('videos.f.coded')} value={coded} onChange={(v) => setCoded(v as CodedF)}
            options={(['all', 'coded', 'todo'] as const).map((k) => [k, t(`videos.codedF.${k}`)])} />
        </div>
      </div>

      {list.length === 0 ? (
        <div className="rounded-card border border-line bg-paper px-6 py-10 text-center">
          <p className="text-[15px] text-ink-muted">{filtered ? t('videos.noMatch') : t('videos.empty')}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {filtered && <button type="button" className="btn-outline min-h-[44px]" onClick={reset}>{t('videos.reset')}</button>}
            {!filtered && <Link to="/app/analyse/video?nouveau=" className="btn-primary min-h-[44px]"><Plus size={17} />{t('videos.new')}</Link>}
          </div>
        </div>
      ) : (
        <ul data-tour="club-videos" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((v) => {
            const tid = videoTeamId(v, matchesById)
            const tm = tid ? teamsById.get(tid) : undefined
            const m = v.matchId ? matchesById.get(v.matchId) : undefined
            const n = videoCoded(v, eventsByMatch)
            const k = videoKind(v)
            const src = videoSourceGroup(v)
            const evs = m ? (eventsByMatch.get(m.id) ?? []).filter((e) => e.videoT != null) : []
            const indice = evs.length ? computeNjangi(evs).total : null
            const SrcIcon = src === 'hosted' ? CloudUpload : src === 'link' ? Link2 : FileVideo
            return (
              <li key={v.id} className="group relative flex flex-col rounded-card border border-line bg-paper p-4 transition-colors hover:border-forest-300">
                <div className="flex items-center justify-between gap-2">
                  <span className={cx('rounded-full px-2.5 py-[3px] text-[12px] font-semibold', k === 'scouting' ? 'bg-night-800 text-cream' : k === 'training' ? 'bg-sand text-ink-soft' : 'bg-forest-50 text-forest-700')}>
                    {t(`videos.kindShort.${k}`)}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-ink-muted"><SrcIcon size={14} aria-hidden="true" />{t(`videos.sources.${src}`)}</span>
                </div>
                <Link to={`/app/analyse/video/${v.id}`} className="mt-3 block text-[16px] font-semibold leading-snug text-ink after:absolute after:inset-0 after:rounded-card after:content-['']">{v.title}</Link>
                <p className="mt-1 text-[13px] text-ink-muted">{[tm?.name ?? t('videos.f.noTeam'), fmtDate(dateOf(v), lang, { day: 'numeric', month: 'short', year: 'numeric' })].join(', ')}</p>
                {k === 'scouting' && v.opponent && !v.title.includes(v.opponent) && <p className="mt-0.5 text-[13px] text-ink-muted">{t('videos.scoutingOf', { opponent: v.opponent })}</p>}
                <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-[12.5px]">
                  {n > 0
                    ? <span className="font-semibold text-forest-700">{indice != null ? t('videos.codedIndice', { count: n, v: fmtNjangi(indice, lang) }) : t('videos.codedN', { count: n })}</span>
                    : <span className="font-semibold text-ink-muted">{t('videos.todo')}</span>}
                  {v.duration ? <span className="num text-ink-faint">{fmtClock(v.duration)}</span> : null}
                  {(v.clips?.length ?? 0) > 0 && <span className="inline-flex items-center gap-1 text-ink-faint"><Scissors size={13} aria-hidden="true" />{t('videos.clips', { count: v.clips!.length })}</span>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function Select({ id, label, value, onChange, options }: { id: string; label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-[12.5px] font-semibold text-ink-muted">{label}</label>
      <select id={id} className="input min-h-[44px] w-full" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  )
}
