// Home for coaches, analysts and managers: what happens today, the next match, the week,
// the last Indice Njangi, quick actions and a suggestion from Mola.
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, CalendarDays, CalendarPlus, ChartLine, Clock, Dumbbell, Film, MapPin, Plus, Radio, Shirt, Trophy } from 'lucide-react'
import { MolaMark } from '../../../ui/brand'
import { Badge } from '../../../ui'
import { useT } from '../../../i18n'
import { db } from '../../../lib/db'
import { useDocumentTitle, useLiveQuery } from '../../../lib/hooks'
import { useSession } from '../../../lib/session'
import { BOOKS, BRAND, GATES, SERIES, coachLimited } from '../../../lib/config'
import { createAutoSession, planWeek, sessionMinutes } from '../../../lib/actions'
import { computeNjangi, fmtNjangi, njangiLabel, rankSubs, SUB_INTENTION, SUB_KEYS, type NjangiResult, type SubKey } from '../../../lib/njangi'
import { drillText, getDrill } from '../../../content'
import { addDays, cx, daysBetween, fmtDate, weekStart } from '../../../lib/util'
import type { Intention, Match, MD, Session, Team } from '../../../lib/types'
import { allLessons, lessonOfDay } from '../lessons'
import { dayTag, msToKickoff, suggestedMd, useNow, useTeamCalendar, useToday, type DayTag } from './data'
import { Greeting, HeroFigures } from './Greeting'
import { CreateTeamCard, mdParts, useToast, type ToastMsg } from './bits'
import MolaAvatar from '../../mola/components/MolaAvatar'
import { Sparkline } from './Charts'

interface Analysed { match: Match; result: NjangiResult }

export default function CoachHome() {
  const { t, lang } = useT('player')
  useDocumentTitle(t('home.docTitle'))
  const { profile, team } = useSession()
  const navigate = useNavigate()
  const today = useToday()
  const cal = useTeamCalendar(team)
  const { toast, toastNode } = useToast()
  const [busy, setBusy] = useState(false)

  const sessions = cal?.sessions ?? []
  const matches = cal?.matches ?? []
  const next = matches.find((m) => m.status !== 'done' && m.date >= today)
  const doneIds = matches.filter((m) => m.status === 'done' && m.date <= today).map((m) => m.id).join(',')

  const analysed = useLiveQuery(async () => {
    const ids = doneIds ? doneIds.split(',') : []
    const out: Analysed[] = []
    for (const id of ids) {
      const match = await db.matches.get(id)
      const events = await db.events.where('matchId').equals(id).toArray()
      if (match && events.some((e) => e.side === 'us' && e.code !== 'GOAL')) out.push({ match, result: computeNjangi(events) })
    }
    return out.sort((a, b) => a.match.date.localeCompare(b.match.date))
  }, [doneIds], [] as Analysed[])

  const lessons = useMemo(() => allLessons(lang), [lang])
  const lesson = lessonOfDay(lessons, today)
  const lines = [
    { label: t('greeting.motto'), text: BRAND.motto[lang] },
    { label: t('greeting.lesson', { n: lesson.no }), text: `${lesson.title}. ${lesson.lines[0] ?? ''}`.trim(), to: `/app/joueur/lecons#lecon-${lesson.no}` },
    { label: t('greeting.mantra'), text: BRAND.mantra[lang] },
  ]

  const monday = weekStart(today)
  const weekSessions = sessions.filter((s) => s.date >= monday && s.date <= addDays(monday, 6))
  const weekMinutes = weekSessions.reduce((a, s) => a + sessionMinutes(s), 0)
  const daysToNext = next ? daysBetween(today, next.date) : null

  async function newSession(date: string, md: MD) {
    if (busy) return
    setBusy(true)
    try {
      if (coachLimited(profile?.plan) && (await db.sessions.count()) >= GATES.sessionsFree) { navigate('/app/premium'); return }
      const s = await createAutoSession({ md, date, teamId: team?.id, ageGroup: team?.ageGroup, lang, createdBy: 'mola' })
      navigate(`/app/seances/${s.id}`)
    } finally { setBusy(false) }
  }

  async function prepareWeek(intention?: Intention) {
    if (!next || busy) return
    setBusy(true)
    try {
      const count = await db.sessions.count()
      const max = coachLimited(profile?.plan) ? GATES.sessionsFree - count : undefined
      if (max !== undefined && max <= 0) { navigate('/app/premium'); return }
      // planWeek skips the days already behind us and the days taken by another match or its recovery
      const created = await planWeek({ matchDate: next.date, teamId: team?.id, ageGroup: team?.ageGroup, lang, intention, createdBy: 'mola', max })
      const n = created.length
      const msg: ToastMsg = n > 0
        ? { text: t('match.weekCreated', { count: n }), to: '/app/semaine', action: t('match.seeWeek') }
        : { text: t('match.weekReady'), to: '/app/semaine', action: t('match.seeWeek') }
      toast(msg)
    } finally { setBusy(false) }
  }

  const todayMd = suggestedMd(today, matches, team?.ageGroup ?? profile?.ageGroup) ?? 'youth'
  const inMatchWeek = dayTag(today, matches) !== null

  return (
    <div>
      <Greeting name={profile?.name ?? ''} today={today} lines={lines}
        aside={team ? (
          <div className="lg:w-[360px]">
            <div className="mb-2 truncate text-[13.5px] font-semibold text-cream/70 lg:text-right">{team.name}</div>
            <HeroFigures items={[
              { label: t('home.statSessions'), value: weekSessions.length },
              { label: t('home.statMinutes'), value: weekMinutes },
              { label: t('home.statNext'), value: daysToNext === null ? t('home.none') : daysToNext === 0 ? t('home.matchDay') : t('home.jMinus', { n: daysToNext }) },
            ]} />
          </div>
        ) : undefined} />

      {!team && cal !== null && <CreateTeamCard className="mb-6" />}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
        <div className="min-w-0 lg:col-span-2">
          <TodayCard today={today} sessions={sessions} matches={matches} md={todayMd} inMatchWeek={inMatchWeek} busy={busy} onCreate={() => newSession(today, todayMd)} />
        </div>
        <NextMatchCard match={next} team={team} today={today} busy={busy} onPrepare={() => prepareWeek()} />
      </div>

      <WeekStrip today={today} sessions={sessions} matches={matches} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
        <div className="min-w-0 lg:col-span-2">
          <IndiceCard analysed={analysed} next={next} busy={busy} onPrepare={(i) => prepareWeek(i)} />
        </div>
        <MolaCard team={team} next={next} sessions={sessions} today={today} analysed={analysed} />
      </div>

      <QuickActions next={next} busy={busy} onNewSession={() => newSession(today, todayMd)} />
      {toastNode}
    </div>
  )
}

/* ---------------- today ---------------- */

function TodayCard({ today, sessions, matches, md, inMatchWeek, busy, onCreate }: { today: string; sessions: Session[]; matches: Match[]; md: MD; inMatchWeek: boolean; busy: boolean; onCreate: () => void }) {
  const { t, lang } = useT('player')
  const todays = sessions.filter((s) => s.date === today)
  const matchToday = matches.find((m) => m.date === today && m.status !== 'done')
  const s = todays[0]
  const tomorrow = sessions.find((x) => x.date === addDays(today, 1))

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-[22px] border border-line bg-paper" aria-labelledby="today-h">
      <div className="px-5 pt-5 sm:px-6">
        <p className="text-[13.5px] font-semibold text-forest-600">{t('today.eyebrow')}</p>
        <h2 id="today-h" className="mt-1 text-[24px] leading-tight text-ink">
          {matchToday ? t('today.matchDay') : s ? s.title : t('today.noSession')}
        </h2>
      </div>

      {matchToday ? (
        <div className="px-5 pb-5 pt-3 sm:px-6">
          <p className="text-[15.5px] leading-relaxed text-ink-soft">{t('today.matchBody', { opponent: matchToday.opponent, time: matchToday.time ?? '' })}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={`/app/analyse/live/${matchToday.id}`} className="btn-primary min-h-[44px]"><LiveDot />{t('match.live')}</Link>
            <Link to={`/app/matchs/${matchToday.id}`} className="btn-outline min-h-[44px]"><Shirt size={17} strokeWidth={1.75} aria-hidden="true" />{t('match.lineup')}</Link>
          </div>
        </div>
      ) : s ? (
        <SessionPreview s={s} more={todays.length - 1} />
      ) : (
        <div className="px-5 pb-5 pt-3 sm:px-6">
          <p className="text-[15.5px] leading-relaxed text-ink-soft">
            {md === 'youth' ? t('today.suggestYouth') : inMatchWeek ? t('today.suggestMd', { md: t(`common:md.${md}`) }) : t('today.suggestFree', { md: t(`common:md.${md}`) })}
          </p>
          <p className="mt-1.5 text-[14px] text-ink-muted">{t(`mdWhy.${md}`)}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className="btn-primary min-h-[44px]" onClick={onCreate} disabled={busy}><MolaMark size={17} aria-hidden="true" />{t('today.create', { md: md === 'youth' ? t('common:md.youth') : md })}</button>
            <Link to="/app/exercices" className="btn-outline min-h-[44px]"><Dumbbell size={17} strokeWidth={1.75} aria-hidden="true" />{t('today.browse')}</Link>
          </div>
          {tomorrow && (
            <p className="mt-5 border-t border-line pt-3 text-[14px] text-ink-soft">
              {t('today.tomorrow')} <Link to={`/app/seances/${tomorrow.id}`} className="link">{tomorrow.title}</Link> ({t('today.minutes', { n: sessionMinutes(tomorrow) })})
            </p>
          )}
        </div>
      )}
      {!matchToday && s && (
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-line px-5 py-3 sm:px-6">
          {/* on phones the button comes first, on the left, clear of the floating Mola button */}
          <Link to={`/app/seances/${s.id}`} className="btn-primary btn-sm order-first min-h-[44px] px-4 sm:order-last">{t('today.open')}</Link>
          <span className="text-[13.5px] text-ink-muted first-letter:uppercase">{fmtDate(today, lang, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
      )}
    </section>
  )
}

/** The red dot of a live recording (the only red that is not an error). */
function LiveDot() {
  return <span className="h-2 w-2 rounded-full bg-clay-500" aria-hidden="true" />
}

function SessionPreview({ s, more }: { s: Session; more: number }) {
  const { t, lang } = useT('player')
  const total = sessionMinutes(s) || 1
  const md = mdParts(t, s.md)
  let start = 0
  return (
    <div className="px-5 pb-4 pt-3 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <Badge tone="forest">{md.code}</Badge>
        {s.intention && <Badge>{t('today.intention', { intention: t(`common:intentions.${s.intention}`) })}</Badge>}
        <Badge><Clock size={11} aria-hidden="true" />{t('today.minutes', { n: sessionMinutes(s) })}</Badge>
        <Badge>{t('today.blocks', { count: s.blocks.length })}</Badge>
        {s.createdBy === 'mola' && <Badge><MolaMark size={11} className="text-forest-600" aria-hidden="true" />{t('today.byMola')}</Badge>}
      </div>
      {s.blocks.length === 0 ? (
        <p className="text-[14px] text-ink-muted">{t('today.emptyBlocks')}</p>
      ) : (
        <ol className="divide-y divide-line border-y border-line" aria-label={t('today.blocksLabel')}>
          {s.blocks.map((b) => {
            const d = getDrill(b.drillId)
            const code = d?.id ?? b.drillId
            const title = d ? drillText(d, lang).title : b.title || (b.drillId ? t('today.methodDrill') : t('today.customBlock'))
            const at = start
            start += b.minutes || 0
            const row = (
              <>
                <span className="w-9 shrink-0 text-right text-[13px] tabular-nums text-ink-faint" aria-label={t('today.startsAt', { n: at })}>{at}'</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-ink">{code && <span className="mr-2 text-[12.5px] font-semibold text-forest-600">{code}</span>}{title}</span>
                  <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-sand" aria-hidden="true"><span className="block h-full rounded-full bg-forest-500" style={{ width: `${Math.max(6, ((b.minutes || 0) / total) * 100)}%` }} /></span>
                </span>
                <span className="w-12 shrink-0 text-right text-[14px] font-semibold tabular-nums text-ink-soft">{b.minutes}'</span>
              </>
            )
            return (
              <li key={b.id}>
                {d ? <Link to={`/app/exercices/${d.id}`} className="-mx-2 flex min-h-[52px] items-center gap-3 rounded-lg px-2 hover:bg-cream">{row}</Link>
                  : <div className="flex min-h-[52px] items-center gap-3">{row}</div>}
              </li>
            )
          })}
        </ol>
      )}
      {more > 0 && <p className="mt-2 text-[13px] text-ink-muted">{t('today.more', { count: more })}</p>}
    </div>
  )
}

/* ---------------- next match ---------------- */

function NextMatchCard({ match, team, today, busy, onPrepare }: { match?: Match; team: Team | null; today: string; busy: boolean; onPrepare: () => void }) {
  const { t, lang } = useT('player')
  const now = useNow(30_000)
  if (!match) {
    return (
      <section className="flex h-full flex-col rounded-[22px] border border-line bg-paper p-5 sm:p-6" aria-labelledby="next-h">
        <p className="text-[13.5px] font-semibold text-forest-600">{t('match.eyebrow')}</p>
        <h2 id="next-h" className="mt-1 text-[22px] text-ink">{t('match.none')}</h2>
        <p className="mt-1.5 text-[14.5px] text-ink-muted">{t('match.noneBody')}</p>
        <div className="mt-auto pt-5">
          <Link to={team ? '/app/matchs/nouveau' : '/app/matchs'} className="btn-primary min-h-[44px]"><CalendarPlus size={17} strokeWidth={1.75} aria-hidden="true" />{t('actions.newMatch')}</Link>
        </div>
      </section>
    )
  }
  const days = daysBetween(today, match.date)
  const ms = msToKickoff(match, now)
  let big: string, small: string
  if (days > 1) { big = t('home.jMinus', { n: days }); small = t('match.inDays', { count: days }) }
  else if (days === 1) { big = t('match.tomorrow'); small = match.time ? t('match.at', { time: match.time }) : '' }
  else if (ms !== null && ms > 0) {
    const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000)
    big = h > 0 ? t('match.inHours', { h, m: String(m).padStart(2, '0') }) : t('match.inMinutes', { m })
    small = t('match.today')
  } else { big = t('match.today'); small = match.time ? t('match.at', { time: match.time }) : '' }

  return (
    <section className="relative flex h-full flex-col overflow-hidden rounded-[22px] bg-night-800 text-cream" aria-labelledby="next-h">
      <div className="relative flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13.5px] font-semibold text-cream/65">{t('match.eyebrow')}</span>
          <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-[12px] font-semibold text-cream/80">{match.home ? t('match.home') : t('match.away')}</span>
        </div>
        <div className="mt-4 flex items-end gap-3">
          <div className="font-display text-[48px] leading-none tabular-nums text-cream">{big}</div>
          <div className="pb-1 text-[14px] text-cream/70">{small}</div>
        </div>
        <h2 id="next-h" className="mt-4 text-[23px] leading-tight">
          <span className="mb-0.5 block font-sans text-[14px] font-normal text-cream/60" style={{ fontStretch: '100%' }}>{t('match.against')}</span>
          {match.opponent}
        </h2>
        <ul className="mt-3 space-y-1.5 text-[14px] text-cream/80">
          <li className="flex items-center gap-2"><CalendarDays size={15} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-cream/45" /><span className="first-letter:uppercase">{fmtDate(match.date, lang, { weekday: 'long', day: 'numeric', month: 'long' })}{match.time ? `, ${match.time}` : ''}</span></li>
          {match.venue && <li className="flex items-center gap-2"><MapPin size={15} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-cream/45" />{match.venue}</li>}
          {match.competition && <li className="flex items-center gap-2"><Trophy size={15} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-cream/45" />{match.competition}</li>}
        </ul>
        <div className="mt-auto grid gap-2 pt-6">
          <button type="button" className="btn-sun min-h-[46px] justify-center" onClick={onPrepare} disabled={busy || days < 1}><MolaMark size={17} ball="#0B5D3B" aria-hidden="true" />{t('match.prepare')}</button>
          <div className="grid grid-cols-2 gap-2">
            <Link to={`/app/matchs/${match.id}`} className="btn min-h-[44px] justify-center border border-white/15 text-cream hover:bg-white/10"><Shirt size={16} strokeWidth={1.75} aria-hidden="true" />{t('match.lineup')}</Link>
            <Link to={`/app/analyse/live/${match.id}`} className="btn min-h-[44px] justify-center border border-white/15 text-cream hover:bg-white/10"><LiveDot />{t('match.liveShort')}</Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- week strip ---------------- */

function WeekStrip({ today, sessions, matches }: { today: string; sessions: Session[]; matches: Match[] }) {
  const { t, lang } = useT('player')
  const monday = weekStart(today)
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const total = sessions.filter((s) => s.date >= monday && s.date <= days[6]).reduce((a, s) => a + sessionMinutes(s), 0)
  const tagLabel = (tag: DayTag) => (tag === 'match' ? t('week.md') : tag === 'youth' || !tag ? '' : tag)
  return (
    <section className="my-10" aria-labelledby="week-h">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <h2 id="week-h" className="text-[24px] leading-tight text-ink sm:text-[28px]">{t('week.title')}</h2>
          <p className="mt-1 text-[14.5px] text-ink-muted">{t('week.range', { from: fmtDate(monday, lang, { day: 'numeric', month: 'long' }), to: fmtDate(days[6], lang, { day: 'numeric', month: 'long' }), n: total })}</p>
        </div>
        <Link to="/app/semaine" className="link text-[14.5px]">{t('week.open')}</Link>
      </div>
      <ol className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((d) => {
          const ss = sessions.filter((s) => s.date === d)
          const mm = matches.filter((m) => m.date === d)
          const tag = dayTag(d, matches)
          const isToday = d === today
          const isMatch = mm.length > 0
          const to = mm[0] ? `/app/matchs/${mm[0].id}` : ss[0] ? `/app/seances/${ss[0].id}` : '/app/semaine'
          const desc = [fmtDate(d, lang, { weekday: 'long', day: 'numeric', month: 'long' }), tag && tag !== 'match' ? tag : '', mm[0] ? t('week.matchAgainst', { opponent: mm[0].opponent }) : '', ss.length ? t('week.sessions', { count: ss.length }) : t('week.rest')].filter(Boolean).join(', ')
          return (
            <li key={d}>
              <Link to={to} aria-label={desc} aria-current={isToday ? 'date' : undefined}
                className={cx('flex min-h-[96px] flex-col items-center rounded-[14px] border px-0.5 pb-2.5 pt-2.5 text-center transition sm:min-h-[112px]',
                  isToday ? 'border-forest-600 bg-forest-600 text-cream' : isMatch ? 'border-night-800 bg-night-800 text-cream' : 'border-line bg-paper hover:border-ink-faint',
                  d < today && !isToday && 'opacity-55')}>
                <span className={cx('text-[12px] font-semibold first-letter:uppercase', isToday || isMatch ? 'text-cream/70' : 'text-ink-muted')}>{fmtDate(d, lang, { weekday: 'short' }).replace('.', '')}</span>
                <span className="font-display text-[22px] leading-tight tabular-nums">{Number(d.slice(8, 10))}</span>
                <span className={cx('mt-0.5 min-h-[16px] text-[11px] font-bold tabular-nums sm:text-[12px]', isToday || isMatch ? 'text-cream/85' : 'text-forest-600')}>{tagLabel(tag)}</span>
                <span className="mt-auto flex h-3 items-center gap-1" aria-hidden="true">
                  {ss.slice(0, 3).map((s) => <span key={s.id} className={cx('h-1.5 w-1.5 rounded-full', isToday ? 'bg-cream' : 'bg-forest-500')} />)}
                  {mm.map((m) => <Trophy key={m.id} size={12} strokeWidth={2} className="text-cream/80" />)}
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-muted" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-forest-500" />{t('week.legendSession')}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-night-800" />{t('week.legendMatch')}</span>
      </div>
    </section>
  )
}

/* ---------------- Indice Njangi ---------------- */

function IndiceCard({ analysed, next, busy, onPrepare }: { analysed: Analysed[]; next?: Match; busy: boolean; onPrepare: (i: Intention) => void }) {
  const { t, lang } = useT('player')
  const last = analysed[analysed.length - 1]
  if (!last) {
    return (
      <section className="h-full rounded-[22px] border border-line bg-paper p-5 sm:p-6" aria-labelledby="indice-h">
        <p className="text-[13.5px] font-semibold text-forest-600">{t('indice.eyebrow')}</p>
        <h2 id="indice-h" className="mt-1 text-[22px] text-ink">{t('indice.emptyTitle')}</h2>
        <p className="mt-1.5 max-w-xl text-[14.5px] leading-relaxed text-ink-muted">{t('indice.emptyBody')}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/app/analyse" className="btn-primary min-h-[44px]"><ChartLine size={17} strokeWidth={1.75} aria-hidden="true" />{t('indice.emptyCta')}</Link>
        </div>
      </section>
    )
  }
  const r = last.result
  const weakest = rankSubs(r)[0]
  const intention = SUB_INTENTION[weakest]
  const trend = analysed.slice(-8)
  const m = last.match
  return (
    <section className="flex h-full flex-col overflow-hidden rounded-[22px] border border-line bg-paper" aria-labelledby="indice-h">
      <div className="grid flex-1 grid-cols-1 gap-6 p-5 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] sm:p-6">
        <div className="min-w-0">
          <h2 id="indice-h" className="sr-only">{t('indice.title')}</h2>
          <p className="text-[13.5px] font-semibold text-ink-muted">{t('indice.eyebrow')}</p>
          <div className="mt-2 flex items-end gap-2">
            <span className="font-display text-[64px] leading-[0.9] tabular-nums text-forest-600">{fmtNjangi(r.total, lang)}</span>
            <span className="pb-1 text-[14px] font-semibold text-ink-faint">/ 100</span>
          </div>
          <div className="mt-2 text-[15px] font-semibold text-ink">{njangiLabel(r.total, lang)}</div>
          <p className="mt-1 text-[14px] text-ink-muted">{t('indice.againstLine', { opponent: m.opponent, score: `${m.scoreUs}-${m.scoreThem}`, date: fmtDate(m.date, lang, { day: 'numeric', month: 'long' }) })}</p>
          <div className="mt-4">
            {trend.length > 1 && <Sparkline values={trend.map((a) => a.result.total)} labels={trend.map((a) => a.match.opponent)} width={170} height={44}
              ariaLabel={t('indice.trendAria', { values: trend.map((a) => fmtNjangi(a.result.total, lang)).join(', ') })} />}
            <div className="mt-1 text-[12.5px] text-ink-muted">{t('indice.trend', { count: trend.length })}</div>
          </div>
        </div>
        <div className="min-w-0">
          <ul className="space-y-3">
            {SUB_KEYS.map((k) => <SubBar key={k} k={k} v={r.sub[k]} weak={k === weakest} />)}
          </ul>
        </div>
      </div>
      <div className="border-t border-line bg-cream/60 px-5 py-4 sm:px-6">
        <p className="text-[14.5px] leading-relaxed text-ink-soft">
          {t('indice.work', { sub: t(`subs.${weakest}`), intention: t(`common:intentions.${intention}`) })}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {next && daysBetween(m.date, next.date) > 0 && (
            <button type="button" className="btn-primary btn-sm min-h-[44px] px-4" onClick={() => onPrepare(intention)} disabled={busy}>
              <MolaMark size={16} aria-hidden="true" />{t('indice.prepare', { intention: t(`common:intentions.${intention}`) })}
            </button>
          )}
          <Link to={`/app/analyse/rapport/${m.id}`} className="btn-outline btn-sm min-h-[44px] px-4">{t('indice.report')}</Link>
        </div>
      </div>
    </section>
  )
}

function SubBar({ k, v, weak }: { k: SubKey; v: number; weak: boolean }) {
  const { t, lang } = useT('player')
  return (
    <li>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-[14px]">
        <span className={cx(weak ? 'font-semibold text-ink' : 'font-medium text-ink-soft')}>{t(`subs.${k}`)}{weak && <span className="ml-2 rounded-full bg-sand px-2 py-0.5 text-[12px] font-semibold text-ink-soft">{t('indice.weakest')}</span>}</span>
        <span className="tabular-nums text-ink-muted"><span className="font-semibold text-ink">{fmtNjangi(v, lang)}</span> / 20</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-sand" role="img" aria-label={`${t(`subs.${k}`)} ${fmtNjangi(v, lang)} / 20`}>
        <div className={cx('h-full rounded-full', weak ? 'bg-forest-300' : 'bg-forest-600')} style={{ width: `${Math.min(100, (v / 20) * 100)}%` }} />
      </div>
    </li>
  )
}

/* ---------------- Mola ---------------- */

function MolaCard({ team, next, sessions, today, analysed }: { team: Team | null; next?: Match; sessions: Session[]; today: string; analysed: Analysed[] }) {
  const { t, lang } = useT('player')
  let text: string
  if (!team) text = t('mola.noTeam')
  else if (next && daysBetween(today, next.date) >= 1 && daysBetween(today, next.date) <= 7) {
    const missing = [-4, -3, -2, -1].map((o) => addDays(next.date, o)).filter((d) => d >= today && !sessions.some((s) => s.date === d)).length
    text = missing > 0
      ? t('mola.missing', { count: missing, opponent: next.opponent, day: fmtDate(next.date, lang, { weekday: 'long' }) })
      : t('mola.convocation', { opponent: next.opponent })
  } else if (analysed.length) {
    const w = rankSubs(analysed[analysed.length - 1].result)[0]
    text = t('mola.indice', { sub: t(`subs.${w}`) })
  } else text = t('mola.default')
  return (
    <section className="flex h-full flex-col rounded-[22px] border border-forest-100 bg-forest-50/60 p-5 sm:p-6" aria-labelledby="mola-h">
      <div className="flex items-center gap-3">
        <MolaAvatar size={40} />
        <div className="min-w-0">
          <h2 id="mola-h" className="text-[19px] leading-tight text-ink">{t('mola.title')}</h2>
          <div className="text-[13px] text-ink-muted">{t('mola.subtitle')}</div>
        </div>
      </div>
      <p className="mt-4 text-[16px] leading-relaxed text-ink">{text}</p>
      <div className="mt-5">
        <div className="mb-2 text-[13px] font-semibold text-ink-muted">{t('mola.ask')}</div>
        <ul className="flex flex-wrap gap-1.5">
          {(['session', 'callup', 'player'] as const).map((k) => (
            <li key={k}><Link to={`/app/mola?q=${encodeURIComponent(t(`mola.examples.${k}`))}`} className="inline-flex min-h-[40px] items-center rounded-full border border-forest-100 bg-paper px-3.5 text-[13.5px] font-medium text-ink-soft transition hover:border-forest-300 hover:text-ink">{t(`mola.examples.${k}`)}</Link></li>
          ))}
        </ul>
      </div>
      <div className="mt-auto pt-5">
        <Link to="/app/mola" className="btn-primary min-h-[44px]"><MolaMark size={17} aria-hidden="true" />{t('mola.cta')}</Link>
      </div>
    </section>
  )
}

/* ---------------- quick actions ---------------- */

function QuickActions({ next, busy, onNewSession }: { next?: Match; busy: boolean; onNewSession: () => void }) {
  const { t } = useT('player')
  const row = 'group flex min-h-[68px] w-full items-center gap-3.5 border-b border-line py-3 text-left transition hover:bg-paper disabled:opacity-60 sm:px-2'
  const icon = (node: ReactNode) => <span className="grid h-9 w-9 shrink-0 place-items-center text-forest-600 [&>svg]:h-5 [&>svg]:w-5" aria-hidden="true">{node}</span>
  const body = (title: string, hint: string) => (
    <span className="min-w-0">
      <span className="block text-[15px] font-semibold leading-snug text-ink">{title}</span>
      <span className="mt-0.5 block truncate text-[13.5px] leading-snug text-ink-muted">{hint}</span>
    </span>
  )
  return (
    <section className="mt-10" aria-labelledby="qa-h">
      <h2 id="qa-h" className="mb-3 text-[24px] leading-tight text-ink sm:text-[28px]">{t('actions.title')}</h2>
      <ul className="grid grid-cols-1 gap-x-8 border-t border-line sm:grid-cols-2 lg:grid-cols-3">
        <li><button type="button" className={row} onClick={onNewSession} disabled={busy}>{icon(<Plus strokeWidth={1.75} />)}{body(t('actions.newSession'), t('actions.newSessionHint'))}</button></li>
        <li><Link to="/app/semaine" className={row}>{icon(<CalendarDays strokeWidth={1.75} />)}{body(t('actions.planWeek'), t('actions.planWeekHint'))}</Link></li>
        <li><Link to="/app/matchs/nouveau" className={row}>{icon(<CalendarPlus strokeWidth={1.75} />)}{body(t('actions.newMatch'), t('actions.newMatchHint'))}</Link></li>
        <li><Link to="/app/analyse" className={row}>{icon(<Film strokeWidth={1.75} />)}{body(t('actions.live'), t('actions.liveHint'))}</Link></li>
        <li><Link to="/app/exercices" className={row}>{icon(<Dumbbell strokeWidth={1.75} />)}{body(t('actions.drills'), t('actions.drillsHint'))}</Link></li>
        <li><a href={BOOKS.tome1.href} className={row}>{icon(<BookOpen strokeWidth={1.75} />)}{body(t('actions.novel'), t('actions.novelHint', { series: SERIES.name }))}</a></li>
      </ul>
    </section>
  )
}
