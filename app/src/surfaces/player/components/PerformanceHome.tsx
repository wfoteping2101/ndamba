// Home for players of 16 and over (U17 to senior professionals): the match week and the next match first,
// then today's form and effort, the last match with the Indice Njangi, the objectives and the season.
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Hash, Shirt } from 'lucide-react'
import { useT } from '../../../i18n'
import { useDocumentTitle } from '../../../lib/hooks'
import { BRAND } from '../../../lib/config'
import { fmtNjangi } from '../../../lib/njangi'
import { daysBetween } from '../../../lib/util'
import { Spinner } from '../../team/components/journey/bits'
import { Greeting, type RotatingLine } from './Greeting'
import { CreateTeamCard } from './bits'
import { FORM_MAX, formBand, usePerformance, type PerfData } from './perf/data'
import { CheckInCard } from './perf/CheckIn'
import { LastMatchCard } from './perf/LastMatch'
import { LoadCard } from './perf/Load'
import { NextMatchCard } from './perf/NextMatch'
import { ObjectivesCard, SeasonCard } from './perf/Objectives'
import { PerfLinks } from './perf/Links'
import { WeekCard } from './perf/Week'
import { fmtInt } from './perf/bits'

export default function PerformanceHome() {
  const { t } = useT('player')
  useDocumentTitle(t('home.docTitle'))
  const d = usePerformance()
  if (!d.ready) return <Spinner />
  const { team } = d

  return (
    <div>
      <PerfGreeting d={d} />
      {!team && <CreateTeamCard compact className="mb-5" />}
      {team && !d.me && <LinkCallout />}

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2"><WeekCard d={d} /></div>
        <NextMatchCard d={d} />
        <CheckInCard d={d} compact />
        <div className="min-w-0 lg:col-span-2"><LastMatchCard d={d} /></div>
        <ObjectivesCard d={d} />
        <SeasonCard d={d} />
        <LoadCard d={d} />
      </div>
      <div className="mt-6"><PerfLinks items={['space', 'parcours', 'journal', 'code']} /></div>
    </div>
  )
}

/** The greeting band: today's role in the week, the motto, and three numbers. */
function PerfGreeting({ d }: { d: PerfData }) {
  const { t, lang } = useT('player')
  const s = d.sessions.find((x) => x.date === d.today)
  const m = d.matches.find((x) => x.date === d.today)
  const lines: RotatingLine[] = [
    m ? { label: t('perf.hero.matchDay'), text: t('perf.hero.matchLine', { opponent: m.opponent, time: m.time ?? '' }) }
      : s ? { label: s.md === 'youth' ? t('perf.hero.today') : t('perf.hero.todayMd', { md: t(`common:md.${s.md}`) }), text: s.title }
        : { label: t('perf.hero.today'), text: t('perf.week.restTitle') },
    { label: t('greeting.motto'), text: BRAND.motto[lang] },
  ]
  const score = d.form.todayScore
  const days = d.next ? daysBetween(d.today, d.next.date) : null
  const pos = d.me?.position ?? d.profile?.position
  return (
    <Greeting name={d.profile?.name ?? ''} today={d.today} lines={lines} tone="night"
      aside={
        <dl className="grid grid-cols-3 gap-2 text-center lg:w-[360px]">
          <Mini label={t('perf.hero.form')} value={score !== null ? `${score}/${FORM_MAX}` : t('perf.hero.toLog')} sub={score !== null ? t(`perf.form.band.${formBand(score)}`) : undefined} />
          <Mini label={t('perf.hero.load')} value={fmtInt(d.load.current, lang)} sub={t('perf.load.uaShort')} />
          <Mini label={t('home.statNext')} value={days === null ? t('home.none') : days === 0 ? t('home.matchDay') : t('home.jMinus', { n: days })} sub={d.last?.result ? t('perf.hero.lastIndice', { v: fmtNjangi(d.last.result.total, lang) }) : undefined} />
        </dl>
      }>
      {(pos || d.team) && (
        <div className="mt-4 flex flex-wrap gap-1.5 text-[12.5px] font-semibold">
          {pos && <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1">{t(`common:positions.${pos}`)}</span>}
          {d.me?.number !== undefined && <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1"><Hash size={12} aria-hidden="true" />{d.me.number}</span>}
          {d.team && <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1"><Shirt size={13} aria-hidden="true" />{d.team.name}</span>}
        </div>
      )}
    </Greeting>
  )
}

function Mini({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/10 px-2 py-2.5">
      <dt className="truncate text-[10.5px] font-semibold uppercase tracking-[0.08em] text-cream/65">{label}</dt>
      <dd className="mt-0.5 truncate font-display text-[19px] font-semibold tabular-nums text-cream">{value}</dd>
      {sub && <dd className="truncate text-[11px] text-cream/60">{sub}</dd>}
    </div>
  )
}

export function LinkCallout() {
  const { t } = useT('player')
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sun-300 bg-sun-50 px-4 py-3">
      <p className="min-w-0 flex-1 text-sm text-ink-soft"><span className="font-semibold text-ink">{t('perf.link.title')}</span> {t('perf.link.body')}</p>
      <Link to="/app/joueur/parcours" className="btn-dark btn-sm min-h-[44px]">{t('perf.link.cta')}</Link>
    </div>
  )
}
