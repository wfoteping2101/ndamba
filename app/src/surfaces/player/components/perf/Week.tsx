// « Ma semaine »: the seven days that lead to the next match (MD+1 to match day), each with its
// role in the week, its usual intensity, the session of the staff and what the player logged.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronRight, Clock, Moon, Trophy } from 'lucide-react'
import { Badge } from '../../../../ui'
import { useT } from '../../../../i18n'
import { sessionMinutes } from '../../../../lib/actions'
import { drillText, getDrill } from '../../../../content'
import { addDays, cx, daysBetween, fmtDate, weekStart } from '../../../../lib/util'
import { dayTag } from '../data'
import { MD_INTENSITY, loadOf, type PerfData } from './data'
import { IntensityPips, PerfHead, fmtInt } from './bits'

/** Seven days ending on the next match when it is within a week, otherwise Monday to Sunday. */
export function weekWindow(today: string, next?: { date: string }) {
  const start = next && daysBetween(today, next.date) <= 6 ? addDays(next.date, -6) : weekStart(today)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function WeekCard({ d }: { d: PerfData }) {
  const { t, lang } = useT('player')
  const days = weekWindow(d.today, d.next)
  const [pick, setPick] = useState(d.today)
  const sel = days.includes(pick) ? pick : days[0]
  const total = d.sessions.filter((s) => days.includes(s.date)).reduce((a, s) => a + sessionMinutes(s), 0)

  return (
    <section className="card overflow-hidden" aria-labelledby="wk-h">
      <div className="px-4 pt-4 sm:px-5 sm:pt-5">
        <PerfHead id="wk-h" icon={<CalendarDays />} eyebrow={t('perf.week.eyebrow')} title={d.next && daysBetween(d.today, d.next.date) <= 6 ? t('perf.week.titleMatch', { opponent: d.next.opponent }) : t('perf.week.title')}
          hint={t('perf.week.hint', { n: fmtInt(total, lang) })} />
      </div>
      <ol className="grid grid-cols-7 gap-1 px-3 sm:gap-2 sm:px-5" aria-label={t('perf.week.days')}>
        {days.map((day) => {
          const tag = dayTag(day, d.matches)
          const ss = d.sessions.filter((s) => s.date === day)
          const isMatch = tag === 'match'
          const level = isMatch ? MD_INTENSITY.match ?? 0 : ss.length ? MD_INTENSITY[ss[0].md] ?? (tag ? MD_INTENSITY[tag] ?? 2 : 2) : 0
          const logged = d.logs.some((l) => l.date === day && loadOf(l) > 0)
          const on = day === sel
          const isToday = day === d.today
          const label = isMatch ? t('week.md') : ss.length && ss[0].md !== 'youth' ? ss[0].md : tag && tag !== 'youth' ? tag : ss.length ? t('perf.week.session') : t('perf.week.rest')
          return (
            <li key={day}>
              <button type="button" onClick={() => setPick(day)} aria-pressed={on} aria-current={isToday ? 'date' : undefined}
                aria-label={[fmtDate(day, lang, { weekday: 'long', day: 'numeric', month: 'long' }), label, isToday ? t('perf.week.today') : ''].filter(Boolean).join(', ')}
                className={cx('flex min-h-[96px] w-full flex-col items-center rounded-2xl border px-0.5 pb-2 pt-2 text-center transition',
                  on ? 'border-night-800 bg-night-800 text-cream shadow-lift' : isMatch ? 'border-terra-300 bg-terra-50 hover:border-terra-500' : 'border-line bg-cream/60 hover:border-ink-faint',
                  day < d.today && !on && 'opacity-70')}>
                <span className={cx('text-[10.5px] font-semibold uppercase tracking-wide', on ? 'text-cream/70' : 'text-ink-muted')}>{fmtDate(day, lang, { weekday: 'short' }).replace('.', '')}</span>
                <span className="font-display text-[19px] font-semibold tabular-nums leading-tight">{Number(day.slice(8, 10))}</span>
                <span className={cx('mt-0.5 min-h-[15px] text-[10px] font-bold tracking-tight sm:text-[11px]', on ? 'text-sun-300' : isMatch ? 'text-terra-700' : 'text-forest-700')}>{label}</span>
                <span className="mt-auto flex h-4 items-end gap-1">
                  {level > 0 ? <IntensityPips level={level} light={on} /> : <Moon size={12} aria-hidden="true" className={on ? 'text-cream/60' : 'text-ink-faint'} />}
                </span>
                <span className={cx('mt-1 h-1.5 w-1.5 rounded-full', logged ? (on ? 'bg-sun-300' : 'bg-forest-600') : 'bg-transparent')} aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ol>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-4 text-[11px] text-ink-faint sm:px-5" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5"><IntensityPips level={3} />{t('perf.week.legendIntensity')}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-forest-600" />{t('perf.week.legendLogged')}</span>
      </div>
      <DayDetail d={d} day={sel} />
    </section>
  )
}

function DayDetail({ d, day }: { d: PerfData; day: string }) {
  const { t, lang } = useT('player')
  const tag = dayTag(day, d.matches)
  const match = d.matches.find((m) => m.date === day)
  const sessions = d.sessions.filter((s) => s.date === day)
  const s = sessions[0]
  const log = d.logs.find((l) => l.date === day)
  const mark = s && d.journey ? d.journey.attendance.find((a) => a.sessionId === s.id) : undefined
  const md = match ? null : s ? s.md : tag && tag !== 'match' ? tag : null
  const when = day === d.today ? t('perf.week.today') : day === addDays(d.today, 1) ? t('match.tomorrow') : fmtDate(day, lang, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="mt-4 border-t border-line/70 bg-cream/40 px-4 py-4 sm:px-5" aria-live="polite">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{when}</span>
        {md && <Badge tone="forest">{t(`common:md.${md}`)}</Badge>}
        {s?.intention && <Badge tone="terra">{t(`common:intentions.${s.intention}`)}</Badge>}
        {s && <Badge><Clock size={11} aria-hidden="true" />{t('today.minutes', { n: sessionMinutes(s) })}</Badge>}
        {mark && <Badge tone={mark.status === 'present' ? 'ok' : mark.status === 'late' ? 'sun' : 'neutral'}>{t(`journey:attendance.status.${mark.status}`)}</Badge>}
      </div>

      {match ? (
        <div className="mt-2">
          <h3 className="font-display text-[19px] font-semibold leading-snug text-ink"><Trophy size={17} aria-hidden="true" className="mr-1.5 inline -translate-y-0.5 text-terra-600" />{t('perf.week.matchDay', { opponent: match.opponent })}</h3>
          <p className="mt-1 text-[13.5px] text-ink-muted">{[match.time && t('match.at', { time: match.time }), match.venue, match.competition].filter(Boolean).join(' · ')}</p>
          {match.status === 'done' && <p className="mt-1 text-[13.5px] font-semibold text-ink-soft">{t('perf.week.score', { us: match.scoreUs, them: match.scoreThem })}</p>}
          <Link to={`/app/matchs/${match.id}`} className="btn-outline btn-sm mt-3 min-h-[44px]">{t('perf.next.sheet')}<ChevronRight size={15} aria-hidden="true" /></Link>
        </div>
      ) : s ? (
        <div className="mt-2">
          <h3 className="font-display text-[19px] font-semibold leading-snug text-ink">{s.title}</h3>
          {md && <p className="mt-1 text-[13.5px] text-ink-muted">{t(`perf.mdWhy.${md}`)}</p>}
          {s.blocks.length > 0 && (
            <ol className="mt-3 space-y-1">
              {s.blocks.map((b, i) => {
                const dr = getDrill(b.drillId)
                const title = dr ? drillText(dr, lang).title : b.title || t('today.customBlock')
                const row = (
                  <>
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sand text-[11px] font-semibold tabular-nums text-ink-soft">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{dr && <span className="mr-1.5 text-[12px] font-semibold text-terra-600">{dr.id}</span>}{title}</span>
                    <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink-muted">{b.minutes}'</span>
                  </>
                )
                return <li key={b.id}>{dr ? <Link to={`/app/exercices/${dr.id}`} className="flex min-h-[44px] items-center gap-2.5 rounded-xl px-1 hover:bg-sand/60">{row}</Link> : <div className="flex min-h-[44px] items-center gap-2.5 px-1">{row}</div>}</li>
              })}
            </ol>
          )}
          {s.notes && (
            <blockquote className="mt-3 rounded-xl border-l-2 border-sun-500 bg-paper px-3 py-2 text-[13.5px] leading-relaxed text-ink-soft">
              <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{t('perf.week.staffNotes')}</span>
              {s.notes}
            </blockquote>
          )}
          {sessions.length > 1 && <p className="mt-2 text-xs text-ink-muted">{t('today.more', { count: sessions.length - 1 })}</p>}
        </div>
      ) : (
        <div className="mt-2">
          <h3 className="font-display text-[19px] font-semibold leading-snug text-ink">{t('perf.week.restTitle')}</h3>
          <p className="mt-1 text-[13.5px] text-ink-muted">{t('perf.mdWhy.rest')}</p>
        </div>
      )}

      {log && loadOf(log) > 0 && (
        <p className="mt-3 text-[13px] text-ink-soft">{t('perf.week.logged', { rpe: log.rpe, minutes: log.minutes, n: fmtInt(loadOf(log), lang) })}</p>
      )}
    </div>
  )
}
