// Home for coaches, analysts and managers: what happens today, the next match, the week,
// the last Indice Njangi, quick actions and a suggestion from Mola.
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, CalendarDays, CalendarPlus, ChartLine, ClipboardList, Clock, Dumbbell, MapPin, Plus, Radio, Shirt, Trophy } from 'lucide-react'
import { MolaMark } from '../../../ui/brand'
import { Badge } from '../../../ui'
import { useT } from '../../../i18n'
import { db } from '../../../lib/db'
import { useDocumentTitle, useLiveQuery } from '../../../lib/hooks'
import { useSession } from '../../../lib/session'
import { BOOKS, BRAND, GATES, SERIES } from '../../../lib/config'
import { createAutoSession, planWeek, sessionMinutes } from '../../../lib/actions'
import { computeNjangi, fmtNjangi, njangiLabel, rankSubs, SUB_INTENTION, SUB_KEYS, type NjangiResult, type SubKey } from '../../../lib/njangi'
import { drillText, getDrill } from '../../../content'
import { addDays, cx, daysBetween, fmtDate, weekStart } from '../../../lib/util'
import type { Intention, Match, MD, Session, Team } from '../../../lib/types'
import { allLessons, lessonOfDay } from '../lessons'
import { dayTag, msToKickoff, suggestedMd, useNow, useTeamCalendar, useToday, type DayTag } from './data'
import { Greeting } from './Greeting'
import { CreateTeamCard, useToast, type ToastMsg } from './bits'
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
      if (profile?.plan === 'free' && (await db.sessions.count()) >= GATES.sessionsFree) { navigate('/app/premium'); return }
      const s = await createAutoSession({ md, date, teamId: team?.id, ageGroup: team?.ageGroup, lang })
      navigate(`/app/seances/${s.id}`)
    } finally { setBusy(false) }
  }

  async function prepareWeek(intention?: Intention) {
    if (!next || busy) return
    setBusy(true)
    try {
      const created = await planWeek({ matchDate: next.date, teamId: team?.id, ageGroup: team?.ageGroup, lang, intention })
      // planWeek fills MD-4 to MD-1 even when some of those days are already behind us: keep only what is still ahead.
      const past = created.filter((s) => s.date < today)
      if (past.length) await db.sessions.bulkDelete(past.map((s) => s.id))
      const n = created.length - past.length
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
          <div className="flex flex-col gap-3 lg:items-end">
            <span className="inline-flex max-w-full items-center gap-2 self-start rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold lg:self-end">
              <Shirt size={14} aria-hidden="true" /><span className="truncate">{team.name}</span>
            </span>
            <dl className="grid grid-cols-3 gap-2 text-center lg:w-[340px]">
              <MiniStat label={t('home.statSessions')} value={weekSessions.length} />
              <MiniStat label={t('home.statMinutes')} value={weekMinutes} />
              <MiniStat label={t('home.statNext')} value={daysToNext === null ? t('home.none') : daysToNext === 0 ? t('home.matchDay') : t('home.jMinus', { n: daysToNext })} />
            </dl>
          </div>
        ) : undefined} />

      {!team && cal !== null && <CreateTeamCard className="mb-5 border-forest-100" />}

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TodayCard today={today} sessions={sessions} matches={matches} md={todayMd} inMatchWeek={inMatchWeek} busy={busy} onCreate={() => newSession(today, todayMd)} />
        </div>
        <NextMatchCard match={next} team={team} today={today} busy={busy} onPrepare={() => prepareWeek()} />

        <div className="lg:col-span-3">
          <WeekStrip today={today} sessions={sessions} matches={matches} />
        </div>

        <div className="lg:col-span-2">
          <IndiceCard analysed={analysed} next={next} busy={busy} onPrepare={(i) => prepareWeek(i)} />
        </div>
        <MolaCard team={team} next={next} sessions={sessions} today={today} analysed={analysed} />

        <div className="lg:col-span-3">
          <QuickActions next={next} busy={busy} onNewSession={() => newSession(today, todayMd)} />
        </div>
      </div>
      {toastNode}
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/10 px-2 py-2.5">
      <dt className="truncate text-[10.5px] font-semibold uppercase tracking-[0.08em] text-cream/65">{label}</dt>
      <dd className="mt-0.5 font-display text-xl font-semibold tabular-nums text-cream">{value}</dd>
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
    <section className="card h-full overflow-hidden" aria-labelledby="today-h">
      <div className="flex items-start justify-between gap-3 border-b border-line/70 px-4 pb-3 pt-4 sm:px-5">
        <div className="min-w-0">
          <div className="eyebrow">{t('today.eyebrow')}</div>
          <h2 id="today-h" className="mt-0.5 font-display text-[22px] font-semibold leading-tight text-ink">
            {matchToday ? t('today.matchDay') : s ? s.title : t('today.noSession')}
          </h2>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-forest-50 text-forest-600"><ClipboardList size={20} aria-hidden="true" /></span>
      </div>

      {matchToday ? (
        <div className="px-4 py-4 sm:px-5">
          <p className="text-[15px] text-ink-soft">{t('today.matchBody', { opponent: matchToday.opponent, time: matchToday.time ?? '' })}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={`/app/analyse/live/${matchToday.id}`} className="btn-accent min-h-[44px]"><Radio size={17} aria-hidden="true" />{t('match.live')}</Link>
            <Link to={`/app/matchs/${matchToday.id}`} className="btn-outline min-h-[44px]"><Shirt size={17} aria-hidden="true" />{t('match.lineup')}</Link>
          </div>
        </div>
      ) : s ? (
        <SessionPreview s={s} more={todays.length - 1} />
      ) : (
        <div className="px-4 py-4 sm:px-5">
          <p className="text-[15px] text-ink-soft">
            {md === 'youth' ? t('today.suggestYouth') : inMatchWeek ? t('today.suggestMd', { md: t(`common:md.${md}`) }) : t('today.suggestFree', { md: t(`common:md.${md}`) })}
          </p>
          <p className="mt-1 text-sm text-ink-muted">{t(`mdWhy.${md}`)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn-primary min-h-[44px]" onClick={onCreate} disabled={busy}><MolaMark size={17} aria-hidden="true" />{t('today.create', { md: md === 'youth' ? t('common:md.youth') : md })}</button>
            <Link to="/app/exercices" className="btn-outline min-h-[44px]"><Dumbbell size={17} aria-hidden="true" />{t('today.browse')}</Link>
          </div>
          {tomorrow && (
            <p className="mt-4 rounded-xl bg-sand/60 px-3 py-2 text-sm text-ink-soft">
              {t('today.tomorrow')} <Link to={`/app/seances/${tomorrow.id}`} className="link">{tomorrow.title}</Link> ({t('today.minutes', { n: sessionMinutes(tomorrow) })})
            </p>
          )}
        </div>
      )}
      {!matchToday && s && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 px-4 py-3 sm:px-5">
          <span className="text-xs text-ink-muted">{fmtDate(today, lang, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <Link to={`/app/seances/${s.id}`} className="btn-primary btn-sm min-h-[44px]">{t('today.open')}<ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      )}
    </section>
  )
}

function SessionPreview({ s, more }: { s: Session; more: number }) {
  const { t, lang } = useT('player')
  const total = sessionMinutes(s) || 1
  let start = 0
  return (
    <div className="px-4 py-4 sm:px-5">
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <Badge tone="forest">{s.md === 'youth' ? t('common:md.youth') : t(`common:md.${s.md}`)}</Badge>
        {s.intention && <Badge tone="terra">{t(`common:intentions.${s.intention}`)}</Badge>}
        <Badge><Clock size={11} aria-hidden="true" />{t('today.minutes', { n: sessionMinutes(s) })}</Badge>
        <Badge>{t('today.blocks', { count: s.blocks.length })}</Badge>
        {s.createdBy === 'mola' && <Badge tone="sun"><MolaMark size={11} aria-hidden="true" />Mola</Badge>}
      </div>
      {s.blocks.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('today.emptyBlocks')}</p>
      ) : (
        <ol className="space-y-1.5">
          {s.blocks.map((b, i) => {
            const d = getDrill(b.drillId)
            const code = d?.id ?? b.drillId
            const title = d ? drillText(d, lang).title : b.title || (b.drillId ? t('today.methodDrill') : t('today.customBlock'))
            const at = start
            start += b.minutes || 0
            const row = (
              <>
                <span className="w-9 shrink-0 text-right text-xs tabular-nums text-ink-faint">{at}'</span>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sand text-[11px] font-semibold tabular-nums text-ink-soft">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-medium text-ink">{code && <span className="mr-1.5 text-xs font-semibold text-terra-600">{code}</span>}{title}</span>
                  <span className="mt-1 block h-1 overflow-hidden rounded-full bg-sand" aria-hidden="true"><span className="block h-full rounded-full bg-forest-500" style={{ width: `${Math.max(6, ((b.minutes || 0) / total) * 100)}%` }} /></span>
                </span>
                <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums text-ink-soft">{b.minutes}'</span>
              </>
            )
            return (
              <li key={b.id}>
                {d ? <Link to={`/app/exercices/${d.id}`} className="flex min-h-[44px] items-center gap-2.5 rounded-xl px-1 hover:bg-sand/50">{row}</Link>
                  : <div className="flex min-h-[44px] items-center gap-2.5 px-1">{row}</div>}
              </li>
            )
          })}
        </ol>
      )}
      {more > 0 && <p className="mt-2 text-xs text-ink-muted">{t('today.more', { count: more })}</p>}
    </div>
  )
}

/* ---------------- next match ---------------- */

function NextMatchCard({ match, team, today, busy, onPrepare }: { match?: Match; team: Team | null; today: string; busy: boolean; onPrepare: () => void }) {
  const { t, lang } = useT('player')
  const now = useNow(30_000)
  if (!match) {
    return (
      <section className="card card-pad flex h-full flex-col" aria-labelledby="next-h">
        <div className="eyebrow">{t('match.eyebrow')}</div>
        <h2 id="next-h" className="mt-0.5 font-display text-[22px] font-semibold text-ink">{t('match.none')}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t('match.noneBody')}</p>
        <div className="mt-auto pt-4">
          <Link to={team ? '/app/matchs/nouveau' : '/app/matchs'} className="btn-primary min-h-[44px]"><CalendarPlus size={17} aria-hidden="true" />{t('actions.newMatch')}</Link>
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
    <section className="relative flex h-full flex-col overflow-hidden rounded-2xl bg-night-800 text-cream shadow-card" aria-labelledby="next-h">
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-terra-500/25 blur-3xl" />
      <div className="relative flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sun-300">{t('match.eyebrow')}</span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold">{match.home ? t('match.home') : t('match.away')}</span>
        </div>
        <div className="mt-3 flex items-end gap-3">
          <div className="font-display text-[44px] font-semibold leading-none tabular-nums text-sun-300">{big}</div>
          <div className="pb-1 text-sm text-cream/75">{small}</div>
        </div>
        <h2 id="next-h" className="mt-3 font-display text-[22px] font-semibold leading-tight">
          <span className="block text-sm font-normal text-cream/60">{t('match.against')}</span>
          {match.opponent}
        </h2>
        <ul className="mt-2 space-y-1 text-sm text-cream/80">
          <li className="flex items-center gap-2"><CalendarDays size={15} aria-hidden="true" className="shrink-0 text-cream/50" />{fmtDate(match.date, lang, { weekday: 'long', day: 'numeric', month: 'long' })}{match.time ? `, ${match.time}` : ''}</li>
          {match.venue && <li className="flex items-center gap-2"><MapPin size={15} aria-hidden="true" className="shrink-0 text-cream/50" />{match.venue}</li>}
          {match.competition && <li className="flex items-center gap-2"><Trophy size={15} aria-hidden="true" className="shrink-0 text-cream/50" />{match.competition}</li>}
        </ul>
        <div className="mt-auto grid gap-2 pt-5">
          <Link to={`/app/matchs/${match.id}`} className="btn min-h-[44px] justify-center bg-white/10 text-cream hover:bg-white/20"><Shirt size={16} aria-hidden="true" />{t('match.lineup')}</Link>
          <button type="button" className="btn-sun min-h-[44px] justify-center" onClick={onPrepare} disabled={busy || days < 1}><CalendarDays size={16} aria-hidden="true" />{t('match.prepare')}</button>
          <Link to={`/app/analyse/live/${match.id}`} className="btn-accent min-h-[44px] justify-center"><Radio size={16} aria-hidden="true" />{t('match.live')}</Link>
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
    <section className="card card-pad" aria-labelledby="week-h">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="week-h" className="font-display text-lg font-semibold text-ink">{t('week.title')} <span className="text-sm font-normal text-ink-faint">{fmtDate(monday, lang, { day: 'numeric', month: 'short' })} {t('week.to')} {fmtDate(days[6], lang, { day: 'numeric', month: 'short' })}</span></h2>
        <div className="flex items-center gap-3">
          <span className="text-xs tabular-nums text-ink-muted">{t('week.total', { n: total })}</span>
          <Link to="/app/semaine" className="link text-sm">{t('week.open')}</Link>
        </div>
      </div>
      <ol className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((d) => {
          const ss = sessions.filter((s) => s.date === d)
          const mm = matches.filter((m) => m.date === d)
          const tag = dayTag(d, matches)
          const isToday = d === today
          const to = mm[0] ? `/app/matchs/${mm[0].id}` : ss[0] ? `/app/seances/${ss[0].id}` : '/app/semaine'
          const desc = [fmtDate(d, lang, { weekday: 'long', day: 'numeric', month: 'long' }), tag && tag !== 'match' ? tag : '', mm[0] ? t('week.matchAgainst', { opponent: mm[0].opponent }) : '', ss.length ? t('week.sessions', { count: ss.length }) : t('week.rest')].filter(Boolean).join(', ')
          return (
            <li key={d}>
              <Link to={to} aria-label={desc} aria-current={isToday ? 'date' : undefined}
                className={cx('flex min-h-[92px] flex-col items-center rounded-2xl border px-0.5 pb-2 pt-2 text-center transition sm:min-h-[104px]',
                  isToday ? 'border-forest-600 bg-forest-600 text-cream' : mm.length ? 'border-terra-300 bg-terra-50 hover:border-terra-500' : 'border-line bg-cream/50 hover:border-ink-faint',
                  d < today && !isToday && 'opacity-60')}>
                <span className={cx('text-[10.5px] font-semibold uppercase tracking-wide', isToday ? 'text-cream/75' : 'text-ink-muted')}>{fmtDate(d, lang, { weekday: 'short' }).replace('.', '')}</span>
                <span className="font-display text-xl font-semibold tabular-nums leading-tight">{Number(d.slice(8, 10))}</span>
                <span className={cx('mt-0.5 min-h-[16px] text-[10px] font-bold tabular-nums tracking-tight sm:text-[11px]', isToday ? 'text-sun-300' : tag === 'match' ? 'text-terra-700' : 'text-forest-600')}>{tagLabel(tag)}</span>
                <span className="mt-auto flex h-3 items-center gap-1" aria-hidden="true">
                  {ss.slice(0, 3).map((s) => <span key={s.id} className={cx('h-2 w-2 rounded-full', isToday ? 'bg-cream' : 'bg-forest-500')} />)}
                  {mm.map((m) => <Trophy key={m.id} size={12} className={isToday ? 'text-sun-300' : 'text-terra-600'} />)}
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-forest-500" />{t('week.legendSession')}</span>
        <span className="inline-flex items-center gap-1.5"><Trophy size={12} className="text-terra-600" />{t('week.legendMatch')}</span>
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
      <section className="card card-pad h-full" aria-labelledby="indice-h">
        <div className="eyebrow">{t('indice.eyebrow')}</div>
        <h2 id="indice-h" className="mt-0.5 font-display text-[22px] font-semibold text-ink">{t('indice.emptyTitle')}</h2>
        <p className="mt-1 max-w-xl text-sm text-ink-muted">{t('indice.emptyBody')}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {next ? <Link to={`/app/analyse/live/${next.id}`} className="btn-primary min-h-[44px]"><Radio size={17} aria-hidden="true" />{t('indice.emptyCtaLive', { opponent: next.opponent })}</Link>
            : <Link to="/app/analyse" className="btn-primary min-h-[44px]"><ChartLine size={17} aria-hidden="true" />{t('indice.emptyCta')}</Link>}
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
    <section className="card flex h-full flex-col overflow-hidden" aria-labelledby="indice-h">
      <div className="grid flex-1 grid-cols-1 gap-5 p-4 sm:grid-cols-[auto_1fr] sm:p-5">
        <div className="min-w-0">
          <div className="eyebrow">{t('indice.eyebrow')}</div>
          <h2 id="indice-h" className="sr-only">{t('indice.title')}</h2>
          <div className="mt-1 flex items-end gap-2">
            <span className="font-display text-[56px] font-semibold leading-none tabular-nums text-forest-600">{fmtNjangi(r.total, lang)}</span>
            <span className="pb-1.5 text-sm font-semibold text-ink-faint">/ 100</span>
          </div>
          <div className="mt-1 text-sm font-semibold text-ink">{njangiLabel(r.total, lang)}</div>
          <p className="mt-1 text-sm text-ink-muted">
            {t('indice.against', { opponent: m.opponent })} · <span className="tabular-nums">{m.scoreUs}-{m.scoreThem}</span> · {fmtDate(m.date, lang, { day: 'numeric', month: 'short' })}
          </p>
          <div className="mt-3">
            {trend.length > 1 && <Sparkline values={trend.map((a) => a.result.total)} labels={trend.map((a) => a.match.opponent)} width={170} height={44}
              ariaLabel={t('indice.trendAria', { values: trend.map((a) => fmtNjangi(a.result.total, lang)).join(', ') })} />}
            <div className="mt-1 text-xs text-ink-faint">{t('indice.trend', { count: trend.length })}</div>
          </div>
        </div>
        <div className="min-w-0">
          <ul className="space-y-2.5">
            {SUB_KEYS.map((k) => <SubBar key={k} k={k} v={r.sub[k]} weak={k === weakest} />)}
          </ul>
        </div>
      </div>
      <div className="border-t border-line/70 bg-cream/50 px-4 py-3 sm:px-5">
        <p className="text-sm text-ink-soft">
          {t('indice.work', { sub: t(`subs.${weakest}`), intention: t(`common:intentions.${intention}`) })}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {next && daysBetween(m.date, next.date) > 0 && (
            <button type="button" className="btn-primary btn-sm min-h-[44px]" onClick={() => onPrepare(intention)} disabled={busy}>
              <MolaMark size={16} aria-hidden="true" />{t('indice.prepare', { intention: t(`common:intentions.${intention}`) })}
            </button>
          )}
          <Link to={`/app/analyse/rapport/${m.id}`} className="btn-outline btn-sm min-h-[44px]"><ChartLine size={16} aria-hidden="true" />{t('indice.report')}</Link>
        </div>
      </div>
    </section>
  )
}

function SubBar({ k, v, weak }: { k: SubKey; v: number; weak: boolean }) {
  const { t, lang } = useT('player')
  return (
    <li>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className={cx('font-medium', weak ? 'text-terra-700' : 'text-ink-soft')}>{t(`subs.${k}`)}{weak && <span className="ml-1.5 text-xs font-semibold text-terra-600">{t('indice.weakest')}</span>}</span>
        <span className="tabular-nums text-ink-muted"><span className="font-semibold text-ink">{fmtNjangi(v, lang)}</span> / 20</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-sand" role="img" aria-label={`${t(`subs.${k}`)} ${fmtNjangi(v, lang)} / 20`}>
        <div className={cx('h-full rounded-full', weak ? 'bg-terra-500' : 'bg-forest-600')} style={{ width: `${Math.min(100, (v / 20) * 100)}%` }} />
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
    <section className="flex h-full flex-col rounded-2xl border border-sun-300 bg-sun-50 p-4 shadow-card sm:p-5" aria-labelledby="mola-h">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-night-800 text-sun-300"><MolaMark size={20} aria-hidden="true" /></span>
        <div>
          <h2 id="mola-h" className="font-display text-lg font-semibold text-ink">{t('mola.title')}</h2>
          <div className="text-xs text-ink-muted">{t('mola.subtitle')}</div>
        </div>
      </div>
      <p className="mt-3 border-l-2 border-sun-500 pl-3 font-display text-[17px] italic leading-snug text-ink">{text}</p>
      <div className="mt-4">
        <div className="mb-1.5 text-xs font-semibold text-ink-muted">{t('mola.ask')}</div>
        <ul className="flex flex-wrap gap-1.5">
          {(['session', 'callup', 'player'] as const).map((k) => (
            <li key={k}><Link to={`/app/mola?q=${encodeURIComponent(t(`mola.examples.${k}`))}`} className="chip min-h-[36px] bg-paper/80 hover:border-ink-faint">{t(`mola.examples.${k}`)}</Link></li>
          ))}
        </ul>
      </div>
      <div className="mt-auto pt-4">
        <Link to="/app/mola" className="btn-dark min-h-[44px]">{t('mola.cta')}<ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
    </section>
  )
}

/* ---------------- quick actions ---------------- */

function QuickActions({ next, busy, onNewSession }: { next?: Match; busy: boolean; onNewSession: () => void }) {
  const { t } = useT('player')
  const tile = 'group flex min-h-[120px] flex-col items-start gap-3 rounded-2xl border border-line bg-paper p-3.5 text-left shadow-card transition hover:border-forest-300 hover:shadow-lift disabled:opacity-60 sm:p-4'
  const icon = (node: ReactNode, cls: string) => <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-xl', cls)}>{node}</span>
  const body = (title: string, hint: string) => (
    <span className="min-w-0">
      <span className="block text-[15px] font-semibold leading-snug text-ink">{title}</span>
      <span className="mt-0.5 block text-xs leading-snug text-ink-muted">{hint}</span>
    </span>
  )
  return (
    <section aria-labelledby="qa-h">
      <h2 id="qa-h" className="mb-3 font-display text-lg font-semibold text-ink">{t('actions.title')}</h2>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-6">
        <button type="button" className={tile} onClick={onNewSession} disabled={busy}>{icon(<Plus size={20} aria-hidden="true" />, 'bg-forest-600 text-cream')}{body(t('actions.newSession'), t('actions.newSessionHint'))}</button>
        <Link to="/app/semaine" className={tile}>{icon(<CalendarDays size={20} aria-hidden="true" />, 'bg-forest-50 text-forest-600')}{body(t('actions.planWeek'), t('actions.planWeekHint'))}</Link>
        <Link to="/app/matchs/nouveau" className={tile}>{icon(<CalendarPlus size={20} aria-hidden="true" />, 'bg-terra-50 text-terra-600')}{body(t('actions.newMatch'), t('actions.newMatchHint'))}</Link>
        <Link to={next ? `/app/analyse/live/${next.id}` : '/app/analyse'} className={tile}>{icon(<Radio size={20} aria-hidden="true" />, 'bg-clay-50 text-clay-600')}{body(t('actions.live'), t('actions.liveHint'))}</Link>
        <Link to="/app/exercices" className={tile}>{icon(<Dumbbell size={20} aria-hidden="true" />, 'bg-sun-50 text-sun-700')}{body(t('actions.drills'), t('actions.drillsHint'))}</Link>
        <a href={BOOKS.tome1.href} className={tile}>{icon(<BookOpen size={20} aria-hidden="true" />, 'bg-night-800 text-sun-300')}{body(t('actions.novel'), t('actions.novelHint', { series: SERIES.name }))}</a>
      </div>
    </section>
  )
}
