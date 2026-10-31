import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, CalendarPlus, Camera, ChevronRight, Clapperboard, Crown, Film, Link2, MapPin, Play, Radio, Shirt, Sparkles, Trophy, Video } from 'lucide-react'
import { db } from '../../lib/db'
import { useDocumentTitle, useLiveQuery } from '../../lib/hooks'
import { useSession } from '../../lib/session'
import { useT } from '../../i18n'
import { AI_ANALYSIS, BOOKS, BRAND, GATES, coachLimited } from '../../lib/config'
import { createTeam } from '../../lib/actions'
import { cx, fmtDate, parseISODate, todayISO } from '../../lib/util'
import { fmtNjangi, njangiFromCounts, njangiLabel, sumCounts } from '../../lib/njangi'
import type { Match, MatchEvent, Team, VideoProject } from '../../lib/types'
import { Field, PageHeader } from '../../ui'
import { MiniDial, SubBars, TrendChart, type TrendPoint } from './components/charts'
import { analysedMatches, matchKey, useMedia, useTeamAnalysis } from './components/data'

const AGE_GROUPS = ['U9', 'U11', 'U13', 'U15', 'U17', 'U19', 'Seniors']
const FORMATS = [5, 7, 8, 9, 11] as const

export default function AnalysisHub() {
  const { t } = useT('analysis')
  const { team, profile } = useSession()
  useDocumentTitle(t('hub.title'))
  const header = <PageHeader title={t('hub.title')} subtitle={t('hub.subtitle', { app: BRAND.name })} />
  if (!team) return <div>{header}<CreateTeam /></div>
  return <Hub team={team} free={coachLimited(profile?.plan)} header={header} />
}

/* ------------------------------------------------------------------ hub */

function Hub({ team, free, header }: { team: Team; free: boolean; header: JSX.Element }) {
  const { t, lang } = useT('analysis')
  const wide = useMedia('(min-width: 1024px)')
  const analysis = useTeamAnalysis(team.id)
  const videos = useLiveQuery(() => db.videos.toArray(), [], [] as VideoProject[])
  const today = todayISO()

  const { toTag, analysed, doneNoTags, season } = useMemo(() => {
    const evs = (m: Match) => analysis.events.get(m.id) ?? []
    const toTag = analysis.matches.filter((m) => m.status !== 'done').sort((a, b) => (a.status === 'live' ? -1 : 0) - (b.status === 'live' ? -1 : 0) || matchKey(a).localeCompare(matchKey(b)))
    const analysed = analysedMatches(analysis)
    const doneNoTags = analysis.matches.filter((m) => m.status === 'done' && !evs(m).length)
    const season = analysed.length ? njangiFromCounts(sumCounts(analysed.map((a) => a.result.counts))) : null
    return { toTag, analysed, doneNoTags, season }
  }, [analysis])

  const liveUsed = analysed.length
  const gated = (m: Match) => free && liveUsed >= GATES.liveMatchesFree && !(analysis.events.get(m.id)?.length)
  const points: TrendPoint[] = analysed.map(({ match, result }) => ({ id: match.id, label: fmtDate(match.date, lang, { day: 'numeric', month: 'short' }), sub: `${t('common:app.vs')} ${match.opponent}`, total: result.total }))
  const navigate = useNavigate()

  if (!analysis.ready) return <div>{header}<div className="grid min-h-[30vh] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-forest-100 border-t-forest-600" /></div></div>

  const [next, ...later] = toTag
  const videoOf = (m: Match) => videos.find((v) => v.matchId === m.id)
  const coded = (m: Match) => (analysis.events.get(m.id) ?? []).some((e) => e.videoT != null)

  const toTagSection = (
    <section aria-labelledby="totag-h">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id="totag-h" className="font-display text-xl font-semibold text-ink">{t('hub.toTag')}</h2>
        <Link to="/app/matchs/nouveau" className="btn-ghost btn-sm min-h-[40px]"><CalendarPlus size={16} />{t('hub.newMatch')}</Link>
      </div>
      {next ? (
        <div className="space-y-3">
          <NextCard match={next} team={team} events={analysis.events.get(next.id)?.length ?? 0} gated={gated(next)} video={videoOf(next)} />
          {later.length > 0 && (
            <ul className="card divide-y divide-line overflow-hidden">
              {later.map((m) => <li key={m.id}><ToTagRow match={m} events={analysis.events.get(m.id)?.length ?? 0} gated={gated(m)} past={m.date < today} video={videoOf(m)} /></li>)}
            </ul>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-paper/60 px-5 py-6 text-center">
          <p className="text-sm text-ink-muted">{t('hub.toTagEmpty')}</p>
          <Link to="/app/matchs/nouveau" className="btn-primary mt-4"><CalendarPlus size={16} />{t('hub.newMatch')}</Link>
        </div>
      )}
    </section>
  )

  const analysedSection = (
    <section aria-labelledby="done-h">
      <h2 id="done-h" className="mb-3 font-display text-xl font-semibold text-ink">{t('hub.analysed')}</h2>
      {analysed.length || doneNoTags.length ? (
        <ul className="card divide-y divide-line overflow-hidden">
          {[...analysed].reverse().map(({ match, events, result }) => <li key={match.id}><AnalysedRow match={match} events={events} total={result.total} onVideo={coded(match)} /></li>)}
          {doneNoTags.map((m) => <li key={m.id}><AnalysedRow match={m} events={[]} video={videoOf(m)} gated={gated(m)} /></li>)}
        </ul>
      ) : <p className="rounded-2xl border border-dashed border-line bg-paper/60 px-5 py-6 text-sm text-ink-muted">{t('hub.analysedEmpty')}</p>}
    </section>
  )

  const trend = (
    <section className="card card-pad" aria-labelledby="trend-h">
      <h2 id="trend-h" className="font-display text-lg font-semibold text-ink">{t('hub.trend')}</h2>
      {points.length >= 2 ? (
        <>
          <p className="mb-3 mt-0.5 text-sm text-ink-muted">{t('hub.trendHint', { n: points.length })}</p>
          <TrendChart points={points} onOpen={(id) => navigate(`/app/analyse/rapport/${id}`)} />
        </>
      ) : points.length === 1 ? (
        <div className="mt-3 flex items-center gap-4">
          <MiniDial value={points[0].total} size={64} />
          <div className="min-w-0">
            <div className="font-semibold text-ink">{njangiLabel(points[0].total, lang)}</div>
            <div className="text-sm text-ink-muted">{points[0].sub}, {points[0].label}</div>
            <p className="mt-1 text-[13px] text-ink-faint">{t('hub.trendOne')}</p>
          </div>
        </div>
      ) : <p className="mt-2 text-sm text-ink-muted">{t('hub.trendNone')}</p>}
    </section>
  )

  const seasonCard = season && (
    <section className="card card-pad" aria-labelledby="season-h">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="season-h" className="font-display text-lg font-semibold text-ink">{t('hub.averages')}</h2>
          <p className="mt-0.5 text-sm text-ink-muted">{t('hub.averagesHint', { count: analysed.length, n: analysed.length })}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-[32px] leading-none tabular-nums text-forest-600">{fmtNjangi(season.total, lang)}</div>
          <div className="mt-1 text-[12px] font-semibold text-ink-muted">{njangiLabel(season.total, lang)}</div>
        </div>
      </div>
      <SubBars result={season} className="mt-4" />
    </section>
  )

  const how = (
    <section className="mb-8 overflow-hidden rounded-[22px] border border-line bg-paper" aria-labelledby="how-h">
      <div className="px-5 pt-5 sm:px-6 sm:pt-6">
        <h2 id="how-h" className="font-display text-[21px] text-ink">{t('how.title')}</h2>
        <p className="mt-1.5 max-w-[72ch] text-[15px] leading-relaxed text-ink-soft">{t('how.lead', { app: BRAND.name })}</p>
      </div>
      <ol className="mt-4 grid gap-px bg-line sm:grid-cols-3">
        {([['film', Camera], ['upload', Link2], ['code', Clapperboard]] as const).map(([k, Icon], i) => (
          <li key={k} className="flex gap-3 bg-paper px-5 py-4 sm:px-6">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-forest-600 text-[14px] font-bold tabular-nums text-cream" aria-hidden="true">{i + 1}</span>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-ink"><Icon size={16} strokeWidth={1.75} className="text-forest-600" aria-hidden="true" />{t(`how.${k}.title`)}</div>
              <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-muted">{t(`how.${k}.body`, { app: BRAND.name })}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="grid gap-px border-t border-line bg-line sm:grid-cols-2">
        <div className="flex gap-3 bg-sand/40 px-5 py-4 sm:px-6">
          <Radio size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-clay-600" aria-hidden="true" />
          <p className="text-[13.5px] leading-relaxed text-ink-soft"><b className="text-ink">{t('how.liveTitle')}</b> {t('how.liveBody')}</p>
        </div>
        <div className="flex gap-3 bg-sand/40 px-5 py-4 sm:px-6">
          <Sparkles size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-sun-700" aria-hidden="true" />
          <p className="text-[13.5px] leading-relaxed text-ink-soft"><b className="text-ink">{t('how.aiTitle', { price: AI_ANALYSIS.usdPerMatch.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { style: 'currency', currency: 'USD' }) })}</b> {t('how.aiBody')}</p>
        </div>
      </div>
    </section>
  )

  const explain = (
    <section className="border-t border-line pt-6" aria-labelledby="what-h">
      <h2 id="what-h" className="font-display text-[20px] text-ink">{t('hub.whatTitle')}</h2>
      <div className="mt-3 max-w-[64ch] space-y-3 text-[15px] leading-7 text-ink-soft">
        <p>{t('hub.what1')}</p>
        <p>{t('hub.what2')}</p>
        <blockquote className="border-l-2 border-forest-500 pl-3 text-[16px] font-semibold italic text-ink">{BRAND.motto[lang]}</blockquote>
        <a href={`${BOOKS.methode.href}#ch-32`} className="link inline-flex min-h-[44px] items-center gap-1.5"><BookOpen size={16} />{t('hub.readChapter', { book: BOOKS.methode.title[lang] })}</a>
      </div>
    </section>
  )

  const videoCard = (
    <section className="card card-pad" aria-labelledby="video-h">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-forest-50 text-forest-700"><Film size={20} strokeWidth={1.75} /></span>
        <div className="min-w-0 flex-1">
          <h2 id="video-h" className="font-display text-lg font-semibold text-ink">{t('hub.videoTitle')}</h2>
          <p className="mt-0.5 text-sm text-ink-muted">{t('hub.videoBody')}</p>
        </div>
      </div>
      {videos.length > 0 && (
        <ul className="mt-3 divide-y divide-line/70">
          {[...videos].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3).map((v) => (
            <li key={v.id}><Link to={`/app/analyse/video/${v.id}`} className="flex min-h-[44px] items-center gap-2 py-2 text-sm hover:text-forest-600"><Video size={15} className="shrink-0 text-ink-faint" /><span className="min-w-0 flex-1 truncate font-medium text-ink">{v.title}</span><span className="shrink-0 text-xs text-ink-faint">{t('video.tags', { count: v.tags.length })}</span></Link></li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link to="/app/analyse/video?nouveau=" className="btn-primary"><Film size={16} />{t('hub.videoNew')}</Link>
        <Link to="/app/analyse/video" className="btn-outline"><Video size={16} />{t('hub.videoOpen')}</Link>
        <span className="text-xs text-ink-faint">{t('hub.videoCount', { count: videos.length, n: videos.length })}</span>
      </div>
    </section>
  )

  return (
    <div>
      {header}
      {how}
      {wide ? (
        <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-start gap-8">
          <div className="min-w-0 space-y-8">{toTagSection}{analysedSection}{explain}</div>
          <div className="min-w-0 space-y-6">{trend}{seasonCard}{videoCard}</div>
        </div>
      ) : (
        <div className="space-y-7">{toTagSection}{trend}{analysedSection}{seasonCard}{explain}{videoCard}</div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ rows */

function DateChip({ iso, dark = false }: { iso: string; dark?: boolean }) {
  const { lang } = useT('analysis')
  return (
    <div className={cx('flex w-14 shrink-0 flex-col items-center rounded-xl py-1.5 text-center', dark ? 'bg-white/10 text-cream' : 'bg-sand text-ink')}>
      <span className={cx('text-[11px] font-semibold', dark ? 'text-cream/70' : 'text-ink-muted')}>{fmtDate(iso, lang, { weekday: 'short' }).replace('.', '')}</span>
      <span className="font-display text-2xl leading-none tabular-nums">{parseISODate(iso).getDate()}</span>
      <span className={cx('text-[11px] font-medium', dark ? 'text-cream/80' : 'text-ink-muted')}>{fmtDate(iso, lang, { month: 'short' }).replace('.', '')}</span>
    </div>
  )
}

/** Video first: add or open the match video, and code it there. */
function VideoButton({ match, video, gated, big = false }: { match: Match; video?: VideoProject; gated: boolean; big?: boolean }) {
  const { t } = useT('analysis')
  if (gated) return <Link to="/app/premium" className={cx('btn-sun', big && 'btn-lg w-full justify-center sm:w-auto')}><Crown size={17} />{t('hub.seePlans')}</Link>
  return (
    <Link to={video ? `/app/analyse/video/${video.id}` : `/app/analyse/video?nouveau=${match.id}`} className={cx(big ? 'btn-sun' : 'btn-primary', big && 'btn-lg w-full justify-center sm:w-auto')}>
      <Film size={big ? 19 : 16} />{video ? t('hub.videoCode') : t('hub.videoAdd')}
    </Link>
  )
}

/** Without a video: code from the touchline during the match. */
function LiveButton({ match, events, gated, big = false }: { match: Match; events: number; gated: boolean; big?: boolean }) {
  const { t } = useT('analysis')
  if (gated) return null
  const resume = match.status === 'live' || (events > 0)
  return (
    <Link to={`/app/analyse/live/${match.id}`} className={cx(resume ? 'btn-danger' : big ? 'btn border border-white/25 text-cream hover:bg-white/10' : 'btn-outline', big && 'btn-lg w-full justify-center sm:w-auto')}>
      {resume ? <Radio size={big ? 19 : 16} /> : <Play size={big ? 19 : 16} />}{resume ? t('hub.resume') : t('hub.start')}
    </Link>
  )
}

function NextCard({ match, team, events, gated, video }: { match: Match; team: Team; events: number; gated: boolean; video?: VideoProject }) {
  const { t, lang } = useT('analysis')
  return (
    <div className="relative overflow-hidden rounded-[22px] bg-night-800 p-5 text-cream sm:p-6 [&_:focus-visible]:outline-cream">
      <div className="relative flex items-center gap-2.5">
        {match.status === 'live' && <span className="h-2 w-2 animate-pulse rounded-full bg-clay-300" aria-hidden="true" />}
        <span className="text-[13px] font-semibold text-cream/75">{match.status === 'live' ? t('hub.live') : t('hub.next')}</span>
        {events > 0 && <span className="text-[12.5px] tabular-nums text-cream/60">{t('hub.tags', { count: events })}</span>}
      </div>
      <div className="relative mt-4 flex items-start gap-4">
        <DateChip iso={match.date} dark />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] text-cream/70">{[match.competition, match.home ? t('report.atHome') : t('report.away')].filter(Boolean).join(', ')}</div>
          <div className="mt-1 font-display text-[26px] leading-[1.1] sm:text-[30px]"><span className="mr-1.5 font-sans text-[15px] font-medium text-cream/60">{t('common:app.vs')}</span>{match.opponent}</div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-cream/75">
            <span>{fmtDate(match.date, lang, { weekday: 'long', day: 'numeric', month: 'long' })}{match.time ? `, ${match.time}` : ''}</span>
            {match.venue && <span className="inline-flex items-center gap-1"><MapPin size={13} />{match.venue}</span>}
          </div>
        </div>
      </div>
      {gated && <p className="relative mt-4 rounded-xl bg-white/5 px-3 py-2 text-[13px] text-cream/80"><b className="text-sun-300">{t('hub.freeLimitTitle')}.</b> {t('hub.freeLimitBody')}</p>}
      <div className="relative mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
        <VideoButton match={match} video={video} gated={gated} big />
        <LiveButton match={match} events={events} gated={gated} big />
        <p className="basis-full text-[12.5px] text-cream/60">{t('hub.nextHint')}</p>
      </div>
    </div>
  )
}

function ToTagRow({ match, events, gated, past, video }: { match: Match; events: number; gated: boolean; past: boolean; video?: VideoProject }) {
  const { t } = useT('analysis')
  return (
    <div className="flex flex-wrap items-center gap-3 p-3 sm:px-4">
      <DateChip iso={match.date} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {match.status === 'live' && <span className="inline-flex items-center gap-1.5 rounded-full bg-clay-500 px-2 py-0.5 text-[11px] font-semibold text-white"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />{t('hub.live')}</span>}
          {past && match.status === 'planned' && <span className="rounded-full bg-sun-50 px-2 py-0.5 text-[11px] font-semibold text-sun-700">{t('hub.pastDate')}</span>}
          <span className="text-[12.5px] text-ink-muted">{match.home ? t('report.atHome') : t('report.away')}{match.time ? `, ${match.time}` : ''}</span>
        </div>
        <div className="mt-0.5 truncate text-[16px] font-semibold text-ink"><span className="mr-1 text-[13px] font-normal text-ink-faint">{t('common:app.vs')}</span>{match.opponent}</div>
      </div>
      <div className="flex basis-full flex-wrap gap-2 pl-[68px] max-sm:pl-0"><VideoButton match={match} video={video} gated={gated} /><LiveButton match={match} events={events} gated={gated} /></div>
    </div>
  )
}

function AnalysedRow({ match, events, total, onVideo, video, gated }: { match: Match; events: MatchEvent[]; total?: number; onVideo?: boolean; video?: VideoProject; gated?: boolean }) {
  const { t, lang } = useT('analysis')
  if (total == null && !gated) {
    // a played match not analysed yet: add its video
    return (
      <div className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap sm:px-4">
        <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-sand text-ink-faint"><Trophy size={18} strokeWidth={1.75} /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[15.5px] font-semibold leading-snug text-ink"><span className="mr-1 text-[13px] font-normal text-ink-faint">{t('common:app.vs')}</span>{match.opponent}</div>
          <div className="mt-0.5 text-[12.5px] text-ink-muted">{fmtDate(match.date, lang, { day: 'numeric', month: 'short' })}, {match.scoreUs}-{match.scoreThem}, {t('hub.noTags')}</div>
        </div>
        <VideoButton match={match} video={video} gated={false} />
      </div>
    )
  }
  const res = match.scoreUs > match.scoreThem ? 'W' : match.scoreUs < match.scoreThem ? 'L' : 'D'
  const resTone = res === 'W' ? 'bg-forest-50 text-forest-700' : res === 'L' ? 'bg-clay-50 text-clay-700' : 'bg-sand text-ink-soft'
  return (
    <Link to={`/app/analyse/rapport/${match.id}`} className="group flex items-center gap-3 p-3 transition hover:bg-sand/50 sm:gap-4 sm:px-4">
      {total != null ? <MiniDial value={total} size={52} /> : <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-sand text-ink-faint"><Trophy size={18} strokeWidth={1.75} /></span>}
      <div className="min-w-0 flex-1">
        <div className="text-[15.5px] font-semibold leading-snug text-ink"><span className="mr-1 text-[13px] font-normal text-ink-faint">{t('common:app.vs')}</span>{match.opponent}</div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 text-[12.5px] text-ink-muted">
          <span>{fmtDate(match.date, lang, { day: 'numeric', month: 'short' })}</span>
          <span className={total != null ? 'font-medium text-ink-soft' : undefined}>{total != null ? njangiLabel(total, lang) : t('hub.noTags')}</span>
          {events.length > 0 && <span className="tabular-nums">{t('hub.tags', { count: events.length })}</span>}
          {events.length > 0 && <span className={cx('rounded-full px-1.5 text-[11px] font-semibold', onVideo ? 'bg-forest-50 text-forest-700' : 'bg-sand text-ink-soft')}>{onVideo ? t('hub.srcVideo') : t('hub.srcLive')}</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="text-right">
          <div className="font-display text-xl tabular-nums leading-none text-ink">{match.scoreUs}<span className="px-1 text-ink-faint">-</span>{match.scoreThem}</div>
          {match.status === 'done' && <span className={cx('mt-1.5 inline-block rounded-full px-2 text-[11px] font-semibold', resTone)}>{t(`report.result.${res}`)}</span>}
        </div>
        <ChevronRight size={18} className="text-ink-faint transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  )
}

/* ------------------------------------------------------------------ no team yet */

function CreateTeam() {
  const { t } = useT('analysis')
  const [name, setName] = useState('')
  const [ageGroup, setAgeGroup] = useState('U13')
  const [format, setFormat] = useState<Team['format']>(11)
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try { await createTeam({ name: name.trim(), ageGroup, format }) } finally { setBusy(false) }
  }
  return (
    <div className="card mx-auto max-w-xl overflow-hidden">
      <div className="bg-forest-600 px-5 py-5 text-cream sm:px-6">
        <Shirt size={26} strokeWidth={1.75} className="text-cream/80" />
        <h2 className="mt-2 font-display text-[22px]">{t('hub.noTeamTitle')}</h2>
        <p className="mt-1 text-[14.5px] text-cream/80">{t('hub.noTeamBody', { app: BRAND.name })}</p>
      </div>
      <form onSubmit={submit} className="px-5 py-5 sm:px-6">
        <Field label={t('hub.teamName')} htmlFor="nj-team-name">
          <input id="nj-team-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('hub.teamNamePh')} required />
        </Field>
        <Field label={t('hub.ageGroup')}>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('hub.ageGroup')}>
            {AGE_GROUPS.map((a) => <button key={a} type="button" aria-pressed={ageGroup === a} onClick={() => setAgeGroup(a)} className={cx('chip min-h-[36px] cursor-pointer px-3', ageGroup === a && 'chip-on')}>{a}</button>)}
          </div>
        </Field>
        <Field label={t('hub.format')}>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('hub.format')}>
            {FORMATS.map((f) => <button key={f} type="button" aria-pressed={format === f} onClick={() => setFormat(f)} className={cx('chip min-h-[36px] cursor-pointer px-3', format === f && 'chip-on')}>{f} {t('common:app.vs')} {f}</button>)}
          </div>
        </Field>
        <button type="submit" disabled={busy || !name.trim()} className="btn-primary btn-lg w-full justify-center">{t('hub.createTeam')}</button>
      </form>
    </div>
  )
}
