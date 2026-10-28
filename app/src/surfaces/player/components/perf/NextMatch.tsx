// The next match, seen by a player: countdown, where and when, my place in the planned line-up and
// the two lines of the game plan that matter most (with the ball, at the loss).
import { Link } from 'react-router-dom'
import { CalendarDays, MapPin, Trophy } from 'lucide-react'
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
      <section className="flex h-full flex-col rounded-[22px] border border-line bg-paper p-5 sm:p-6" aria-labelledby="nm-h">
        <p className="text-[13.5px] font-semibold text-forest-600">{t('match.eyebrow')}</p>
        <h2 id="nm-h" className="mt-1 text-[22px] text-ink">{t('perf.next.none')}</h2>
        <p className="mt-1.5 text-[14.5px] text-ink-muted">{t('perf.next.noneBody')}</p>
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
  const slotDef = slot ? formationSlots(m.format, m.formation).find((s) => s.id === slot) : undefined
  const slotLabel = slotDef ? t('perf.next.role', { pos: t(`common:positions.${slotDef.role}`), n: slotDef.label }) : undefined
  const plan = [
    { k: 'possession', v: m.plan.possession },
    { k: 'transitionDef', v: m.plan.transitionDef },
  ].filter((x) => x.v?.trim())

  return (
    <section className="relative flex h-full flex-col overflow-hidden rounded-[22px] bg-night-800 text-cream" aria-labelledby="nm-h">
      <div className="relative flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13.5px] font-semibold text-cream/65">{t('match.eyebrow')}</span>
          <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-[12px] font-semibold text-cream/80">{m.home ? t('match.home') : t('match.away')}</span>
        </div>
        <div className="mt-4 flex items-end gap-3">
          <div className="font-display text-[48px] leading-none tabular-nums text-cream">{big}</div>
          <div className="pb-1 text-[14px] text-cream/70">{small}</div>
        </div>
        <h2 id="nm-h" className="mt-4 text-[23px] leading-tight">
          <span className="mb-0.5 block font-sans text-[14px] font-normal text-cream/60" style={{ fontStretch: '100%' }}>{t('match.against')}</span>
          {m.opponent}
        </h2>
        <ul className="mt-3 space-y-1.5 text-[14px] text-cream/80">
          <li className="flex items-center gap-2"><CalendarDays size={15} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-cream/45" /><span className="first-letter:uppercase">{fmtDate(m.date, lang, { weekday: 'long', day: 'numeric', month: 'long' })}{m.time ? `, ${m.time}` : ''}</span></li>
          {m.venue && <li className="flex items-center gap-2"><MapPin size={15} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-cream/45" />{m.venue}</li>}
          {m.competition && <li className="flex items-center gap-2"><Trophy size={15} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-cream/45" />{m.competition}</li>}
        </ul>
        {(starter || bench) && (
          <div className="mt-5 border-t border-white/10 pt-4">
            <div className="text-[13px] font-semibold text-cream/60">{t('perf.next.myPlace')}</div>
            <div className="mt-0.5 text-[15.5px] font-semibold">{starter ? (slotLabel ? t('perf.next.starterAt', { slot: slotLabel }) : t('perf.next.starter')) : t('perf.next.bench')}</div>
          </div>
        )}
        {plan.length > 0 && (
          <div className="mt-4 border-t border-white/10 pt-4">
            <div className="text-[13px] font-semibold text-cream/60">{t('perf.next.plan')}</div>
            <dl className="mt-2 space-y-2.5">
              {plan.map((p) => (
                <div key={p.k}>
                  <dt className="text-[13px] font-semibold text-cream">{t(`perf.next.planKeys.${p.k}`)}</dt>
                  <dd className="line-clamp-3 text-[14px] leading-snug text-cream/75">{p.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        <div className="mt-auto pt-6">
          <Link to={`/app/matchs/${m.id}`} className="btn min-h-[44px] w-full justify-center border border-white/15 text-cream hover:bg-white/10">{t('perf.next.sheet')}</Link>
        </div>
      </div>
    </section>
  )
}
