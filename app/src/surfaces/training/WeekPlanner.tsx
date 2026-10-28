import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BookOpen, CalendarCheck, ChevronLeft, ChevronRight, MapPin, Plus, Sparkles, Trophy } from 'lucide-react'
import { Callout, Modal, PageHeader } from '../../ui'
import { useT } from '../../i18n'
import { db } from '../../lib/db'
import { planWeek, sessionMinutes } from '../../lib/actions'
import { useDocumentTitle, useLiveQuery } from '../../lib/hooks'
import { useSession } from '../../lib/session'
import { addDays, cx, fmtDate, todayISO, weekStart } from '../../lib/util'
import { BOOKS } from '../../lib/config'
import type { Match, Session } from '../../lib/types'
import { IntensityProfile, MdBadge, UpgradeCard } from './components/bits'
import { NewSessionModal, useSessionQuota, type NewSessionPreset } from './components/NewSessionModal'
import { CreateTeamCard } from './components/CreateTeamCard'
import { WeekLoadChart, type LoadDay } from './components/WeekLoadChart'
import { dayInfo, fmtDay, forTeam, sessionLoad, sortSessions } from './components/helpers'

const PLAN_DAYS = ['MD-4', 'MD-3', 'MD-2', 'MD-1'] as const

export default function WeekPlanner() {
  const { t, lang } = useT('training')
  useDocumentTitle(t('week.docTitle'))
  const { team } = useSession()
  const quota = useSessionQuota()
  const [sp, setSp] = useSearchParams()
  const today = todayISO()
  const monday = weekStart(sp.get('w') || today)
  const go = (n: number) => { const w = addDays(monday, 7 * n); setSp(w === weekStart(today) ? {} : { w }, { replace: true }) }
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const sunday = days[6]

  const data = useLiveQuery(async () => {
    const [sessions, matches] = await Promise.all([db.sessions.where('date').between(monday, sunday, true, true).toArray(), team ? db.matches.where('teamId').equals(team.id).toArray() : db.matches.toArray()])
    return { sessions: sessions.filter(forTeam(team?.id)).sort(sortSessions), matches }
  }, [monday, team?.id], null as { sessions: Session[]; matches: Match[] } | null)
  const sessions = data?.sessions ?? []
  const matchesAll = data?.matches ?? []
  const weekMatches = matchesAll.filter((m) => m.date >= monday && m.date <= sunday).sort((a, b) => a.date.localeCompare(b.date))
  const planTarget = weekMatches.find((m) => m.status !== 'done' && m.date > today) ?? (matchesAll.filter((m) => m.status !== 'done' && m.date > today && m.date > sunday).sort((a, b) => a.date.localeCompare(b.date))[0])

  const [preset, setPreset] = useState<NewSessionPreset | null>(null)
  const [created, setCreated] = useState<Session[] | null>(null)
  const [busy, setBusy] = useState(false)

  const infos = useMemo(() => days.map((d) => dayInfo(d, matchesAll, team?.ageGroup)), [days.join(), matchesAll, team?.ageGroup]) // eslint-disable-line react-hooks/exhaustive-deps
  const loadDays: LoadDay[] = days.map((d, i) => {
    const ss = sessions.filter((s) => s.date === d)
    const m = weekMatches.find((x) => x.date === d)
    return { date: d, label: infos[i].label, minutes: ss.reduce((a, s) => a + sessionMinutes(s), 0), load: ss.reduce((a, s) => a + sessionLoad(s), 0), match: m?.opponent, today: d === today }
  })
  const weekLoad = loadDays.reduce((a, d) => a + d.load, 0)
  const weekMinutes = loadDays.reduce((a, d) => a + d.minutes, 0)
  const peak = loadDays.reduce((best, d) => (d.load > best.load ? d : best), loadDays[0])
  const hasPlan = planTarget && PLAN_DAYS.some((md, i) => sessions.some((s) => s.date === addDays(planTarget.date, -(4 - i))))
  const missing = planTarget ? PLAN_DAYS.filter((_, i) => { const d = addDays(planTarget.date, -(4 - i)); return d >= today && !sessions.some((s) => s.date === d) }).length : 0

  const runPlan = async () => {
    if (!planTarget || busy) return
    setBusy(true)
    const res = await planWeek({ matchDate: planTarget.date, teamId: team?.id, ageGroup: team?.ageGroup, lang })
    setBusy(false)
    setCreated(res)
  }

  const isCurrent = monday === weekStart(today)
  const weekLabel = `${fmtDate(monday, lang, { day: 'numeric', month: 'short' })} ${t('to')} ${fmtDate(sunday, lang, { day: 'numeric', month: 'short', year: 'numeric' })}`

  return (
    <div>
      <PageHeader eyebrow={t('week.eyebrow')} title={t('week.title')} subtitle={t('week.subtitle')} />
      {!team && <CreateTeamCard />}

      {/* week navigation */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button type="button" className="btn-outline h-11 w-11 p-0" onClick={() => go(-1)} aria-label={t('week.prev')}><ChevronLeft size={18} /></button>
          <div className="min-w-[170px] px-2 text-center">
            <div className="font-display text-lg font-semibold leading-tight text-ink">{isCurrent ? t('week.thisWeek') : t('week.weekOf', { date: fmtDate(monday, lang, { day: 'numeric', month: 'long' }) })}</div>
            <div className="text-xs text-ink-muted">{weekLabel}</div>
          </div>
          <button type="button" className="btn-outline h-11 w-11 p-0" onClick={() => go(1)} aria-label={t('week.next')}><ChevronRight size={18} /></button>
          {!isCurrent && <button type="button" className="btn-ghost btn-sm ml-1" onClick={() => setSp({}, { replace: true })}>{t('common:misc.today')}</button>}
        </div>
        {planTarget && missing === 0 ? (
          <span className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-forest-100 bg-forest-50 px-4 text-sm font-semibold text-forest-700" role="status">
            <CalendarCheck size={17} aria-hidden="true" />{hasPlan ? t('week.planDone') : t('week.planNothing')}
          </span>
        ) : planTarget ? (
          <button type="button" className="btn-accent min-h-[44px]" onClick={runPlan} disabled={busy || quota.limited}>
            <Sparkles size={16} aria-hidden="true" />{t('week.plan')}
          </button>
        ) : (
          <Link to="/app/matchs/nouveau" className="btn-outline min-h-[44px]"><Trophy size={16} aria-hidden="true" />{t('week.addMatch')}</Link>
        )}
      </div>

      {planTarget && missing > 0 && (
        <p className="mb-4 text-sm text-ink-muted">{t('week.planHint', { opponent: planTarget.opponent, date: fmtDate(planTarget.date, lang, { weekday: 'long', day: 'numeric', month: 'long' }), count: missing })}</p>
      )}
      {quota.limited && <div className="mb-4"><UpgradeCard compact /></div>}

      {/* seven days */}
      <div className="mb-8 grid gap-2 md:grid-cols-7 md:gap-2">
        {days.map((d, i) => {
          const info = infos[i]
          const ss = sessions.filter((s) => s.date === d)
          const ms = weekMatches.filter((m) => m.date === d)
          const isToday = d === today
          const past = d < today
          const empty = !ss.length && !ms.length
          return (
            <section key={d} aria-label={fmtDate(d, lang, { weekday: 'long', day: 'numeric', month: 'long' })}
              className={cx('flex min-w-0 flex-col rounded-2xl border p-2.5 md:min-h-[240px]', isToday ? 'border-terra-300 bg-paper ring-2 ring-terra-100' : ms.length ? 'border-forest-300 bg-forest-50/60' : 'border-line bg-paper/70')}>
              <header className="mb-2 flex items-center justify-between gap-1 md:flex-col md:items-start">
                <div className="flex items-baseline gap-1.5 md:flex-col md:gap-0">
                  <span className={cx('text-[11px] font-semibold uppercase tracking-wide', isToday ? 'text-terra-600' : 'text-ink-muted')}>{isToday ? t('common:misc.today') : fmtDate(d, lang, { weekday: 'short' })}</span>
                  <span className="font-display text-xl font-semibold leading-none text-ink">{fmtDate(d, lang, { day: 'numeric' })}</span>
                </div>
                {info.label && (
                  <span className={cx('rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums', info.kind === 'match' ? 'bg-forest-600 text-cream' : info.kind === 'pre' ? 'bg-sand text-ink-soft' : 'bg-sand/70 text-ink-muted')} title={t(`dayHint.${info.hint}`)}>
                    {info.label}{info.alt && <span className="font-medium text-ink-faint"> · {info.alt}</span>}
                  </span>
                )}
              </header>

              <div className="flex flex-1 flex-col gap-1.5">
                {ms.map((m) => (
                  <Link key={m.id} to={`/app/matchs/${m.id}`} className="block rounded-xl bg-forest-600 p-2.5 text-cream hover:bg-forest-700">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-sun-300"><Trophy size={12} aria-hidden="true" />{m.status === 'done' ? t('week.played') : t('week.match')}{m.time ? ` · ${m.time}` : ''}</div>
                    <div className="mt-0.5 text-sm font-semibold leading-snug">{m.home ? '' : '@ '}{m.opponent}</div>
                    {m.status === 'done' ? <div className="font-display text-lg font-semibold">{m.scoreUs} : {m.scoreThem}</div>
                      : m.venue ? <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-cream/75"><MapPin size={11} aria-hidden="true" />{m.venue}</div> : null}
                  </Link>
                ))}
                {ss.map((s) => (
                  <Link key={s.id} to={`/app/seances/${s.id}`} className="block rounded-xl border border-line bg-paper p-2.5 shadow-card transition hover:border-forest-300 hover:shadow-lift">
                    <div className="flex items-center justify-between gap-1"><MdBadge md={s.md} /><span className="text-[11px] tabular-nums text-ink-muted">{sessionMinutes(s)}'</span></div>
                    <div className="mt-1 line-clamp-2 text-[13px] font-semibold leading-snug text-ink">{s.title}</div>
                    <div className="mt-1.5"><IntensityProfile session={s} height={12} /></div>
                  </Link>
                ))}
                {!ms.length && (
                  <button type="button" onClick={() => setPreset({ date: d, md: info.md })} disabled={quota.limited}
                    className={cx('group flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-dashed text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40',
                      empty ? 'flex-1 border-line text-ink-faint hover:border-forest-300 hover:bg-forest-50 hover:text-forest-600' : 'border-transparent text-ink-faint hover:border-line hover:text-forest-600')}
                    aria-label={t('week.addOn', { date: fmtDay(d, lang), md: info.md === 'youth' ? t('common:md.youth') : info.md })}>
                    <Plus size={14} aria-hidden="true" />
                    <span>{empty ? (past ? t('week.addPast') : info.hint === 'MD+2' ? t('week.rest') : t('week.addSession')) : t('week.addAnother')}</span>
                    {empty && !past && <span className="hidden text-[10px] font-medium text-ink-faint md:hidden xl:inline">{info.md === 'youth' ? '' : info.md}</span>}
                  </button>
                )}
              </div>
            </section>
          )
        })}
      </div>

      {/* weekly load */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="card card-pad">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">{t('week.loadTitle')}</h2>
              <p className="text-xs text-ink-muted">{t('week.loadHint')}</p>
            </div>
            <div className="flex gap-5 text-right">
              <div><div className="text-[11px] text-ink-muted">{t('builder.minutes')}</div><div className="font-display text-2xl font-semibold leading-none text-ink">{weekMinutes}</div></div>
              <div><div className="text-[11px] text-ink-muted">{t('builder.load')}</div><div className="font-display text-2xl font-semibold leading-none text-terra-600">{weekLoad}</div></div>
            </div>
          </div>
          <WeekLoadChart days={loadDays} />
          {weekLoad > 0 && peak && peak.load > 0 && (
            <p className="mt-3 text-sm text-ink-soft">{t('week.peak', { day: fmtDate(peak.date, lang, { weekday: 'long' }), label: peak.label || '' })}</p>
          )}
        </section>

        <section className="card card-pad">
          <h2 className="mb-2 font-display text-xl font-semibold text-ink">{t('week.logicTitle')}</h2>
          <p className="mb-3 text-sm text-ink-soft">{t('week.logicIntro')}</p>
          <ul className="mb-4 space-y-2">
            {(['MD+1', 'MD-4', 'MD-3', 'MD-2', 'MD-1'] as const).map((m) => (
              <li key={m} className="flex gap-3 text-sm">
                <span className="w-16 shrink-0"><MdBadge md={m} /></span>
                <span className="text-ink-soft"><b className="font-semibold text-ink">{t(`mdName.${m}`)}</b>{t('colon')}{t(`mdHint.${m}`)}</span>
              </li>
            ))}
          </ul>
          <Callout tone="sun">{t('week.logicHeat')}</Callout>
          <a href={`${BOOKS.methode.href}#ch-14`} className="link mt-4 inline-flex items-center gap-1.5 text-sm"><BookOpen size={15} aria-hidden="true" />{t('week.readCh14')}</a>
        </section>
      </div>

      <NewSessionModal open={!!preset} onClose={() => setPreset(null)} preset={preset ?? undefined} />

      <Modal open={!!created} onClose={() => setCreated(null)} title={t('week.createdTitle')}
        footer={<button type="button" className="btn-primary" onClick={() => setCreated(null)}>{t('common:actions.done')}</button>}>
        {created && created.length === 0 ? (
          <p className="text-sm text-ink-soft">{t('week.createdNone')}</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-ink-soft">{t('week.createdBody', { count: created?.length ?? 0, opponent: planTarget?.opponent ?? '' })}</p>
            <ul className="space-y-2">
              {created?.map((s) => (
                <li key={s.id}>
                  <Link to={`/app/seances/${s.id}`} className="flex items-center gap-3 rounded-2xl border border-line bg-paper p-3 hover:border-forest-600" onClick={() => setCreated(null)}>
                    <CalendarCheck size={20} className="shrink-0 text-forest-600" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><MdBadge md={s.md} /><span className="text-xs text-ink-muted">{fmtDay(s.date, lang)}</span></div>
                      <div className="truncate font-semibold text-ink">{s.title}</div>
                      <div className="text-xs text-ink-muted">{t('blocksCount', { count: s.blocks.length })} · {sessionMinutes(s)} {t('common:misc.minutes')}</div>
                    </div>
                    <ChevronRight size={16} className="text-ink-faint" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Modal>
    </div>
  )
}
