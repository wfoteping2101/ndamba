// The next match, seen by a player: countdown, where and when, my place in the planned line-up and
// the two lines of the game plan that matter most (with the ball, at the loss).
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronRight, MapPin, Trophy } from 'lucide-react'
import { useT } from '../../../../i18n'
import { daysBetween, fmtDate } from '../../../../lib/util'
import { isStarter } from '../../../../lib/journey'
import { formationSlots } from '../../../../lib/formations'
import { msToKickoff, useNow } from '../data'
import type { PerfData } from './data'

export function NextMatchCard({ d }: { d: PerfData }) {
  const { t, lang } = useT('player')
  const now = useNow(30_000)
  const m = d.next
  if (!m) {
    return (
      <section className="card card-pad flex h-full flex-col" aria-labelledby="nm-h">
        <div className="eyebrow">{t('match.eyebrow')}</div>
        <h2 id="nm-h" className="mt-0.5 font-display text-[20px] font-semibold text-ink">{t('perf.next.none')}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t('perf.next.noneBody')}</p>
      </section>
    )
  }
  const days = daysBetween(d.today, m.date)
  const ms = msToKickoff(m, now)
  let big: string, small: string
  if (days > 1) { big = t('home.jMinus', { n: days }); small = t('match.inDays', { count: days }) }
  else if (days === 1) { big = t('match.tomorrow'); small = m.time ? t('match.at', { time: m.time }) : '' }
  else if (ms !== null && ms > 0) {
    const h = Math.floor(ms / 3_600_000), mi = Math.floor((ms % 3_600_000) / 60_000)
    big = h > 0 ? t('match.inHours', { h, m: String(mi).padStart(2, '0') }) : t('match.inMinutes', { m: mi })
    small = t('match.today')
  } else { big = t('match.today'); small = m.time ? t('match.at', { time: m.time }) : '' }

  const me = d.me
  const starter = me ? isStarter(m, me.id) : false
  const bench = me ? m.subs.includes(me.id) : false
  const slot = starter && me ? m.lineup.find((l) => l.playerId === me.id)?.slot : undefined
  const slotLabel = slot ? formationSlots(m.format, m.formation).find((s) => s.id === slot)?.label : undefined
  const plan = [
    { k: 'possession', v: m.plan.possession },
    { k: 'transitionDef', v: m.plan.transitionDef },
  ].filter((x) => x.v?.trim())

  return (
    <section className="relative flex h-full flex-col overflow-hidden rounded-2xl bg-night-800 text-cream shadow-card" aria-labelledby="nm-h">
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-terra-500/25 blur-3xl" />
      <div className="relative flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sun-300">{t('match.eyebrow')}</span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold">{m.home ? t('match.home') : t('match.away')}</span>
        </div>
        <div className="mt-3 flex items-end gap-3">
          <div className="font-display text-[44px] font-semibold leading-none tabular-nums text-sun-300">{big}</div>
          <div className="pb-1 text-sm text-cream/75">{small}</div>
        </div>
        <h2 id="nm-h" className="mt-3 font-display text-[22px] font-semibold leading-tight">
          <span className="block text-sm font-normal text-cream/60">{t('match.against')}</span>
          {m.opponent}
        </h2>
        <ul className="mt-2 space-y-1 text-sm text-cream/80">
          <li className="flex items-center gap-2"><CalendarDays size={15} aria-hidden="true" className="shrink-0 text-cream/50" />{fmtDate(m.date, lang, { weekday: 'long', day: 'numeric', month: 'long' })}{m.time ? `, ${m.time}` : ''}</li>
          {m.venue && <li className="flex items-center gap-2"><MapPin size={15} aria-hidden="true" className="shrink-0 text-cream/50" />{m.venue}</li>}
          {m.competition && <li className="flex items-center gap-2"><Trophy size={15} aria-hidden="true" className="shrink-0 text-cream/50" />{m.competition}</li>}
        </ul>
        {(starter || bench) && (
          <div className="mt-4 rounded-xl bg-white/[0.07] px-3 py-2.5 ring-1 ring-white/10">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cream/55">{t('perf.next.myPlace')}</div>
            <div className="mt-0.5 text-[14.5px] font-semibold">{starter ? (slotLabel ? t('perf.next.starterAt', { slot: slotLabel }) : t('perf.next.starter')) : t('perf.next.bench')}</div>
          </div>
        )}
        {plan.length > 0 && (
          <div className="mt-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cream/55">{t('perf.next.plan')}</div>
            <dl className="mt-1.5 space-y-2">
              {plan.map((p) => (
                <div key={p.k}>
                  <dt className="text-[12px] font-semibold text-sun-300">{t(`perf.next.planKeys.${p.k}`)}</dt>
                  <dd className="line-clamp-3 text-[13.5px] leading-snug text-cream/85">{p.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        <div className="mt-auto pt-5">
          <Link to={`/app/matchs/${m.id}`} className="btn min-h-[44px] w-full justify-center bg-white/10 text-cream hover:bg-white/20">{t('perf.next.sheet')}<ChevronRight size={16} aria-hidden="true" /></Link>
        </div>
      </div>
    </section>
  )
}
