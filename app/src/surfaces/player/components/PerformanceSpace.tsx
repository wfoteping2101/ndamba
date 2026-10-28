// /app/joueur for players of 16 and over: the performance space. The match week, form and load over
// four weeks, the last match in detail, the objectives with the drills that train them, the season,
// and the self-assessment next to the staff's evaluation.
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Hash, Shirt } from 'lucide-react'
import { useT } from '../../../i18n'
import { useDocumentTitle } from '../../../lib/hooks'
import { fmtNjangi } from '../../../lib/njangi'
import { cx } from '../../../lib/util'
import { Spinner, fmtMinutes } from '../../team/components/journey/bits'
import { CreateTeamCard, SectionHead } from './bits'
import { SelfAssessment } from './SelfAssessment'
import { LinkCallout } from './PerformanceHome'
import { FORM_MAX, formBand, usePerformance } from './perf/data'
import { CheckInCard } from './perf/CheckIn'
import { FormTrendCard, LoadCard } from './perf/Load'
import { LastMatchCard } from './perf/LastMatch'
import { NextMatchCard } from './perf/NextMatch'
import { ObjectivesCard, SeasonCard } from './perf/Objectives'
import { PerfLinks } from './perf/Links'
import { WeekCard } from './perf/Week'
import { fmtInt, fmtSigned } from './perf/bits'

const NAV = ['semaine', 'forme', 'match', 'objectifs', 'regard'] as const

export default function PerformanceSpace() {
  const { t, lang } = useT('player')
  useDocumentTitle(t('perf.space.docTitle'))
  const d = usePerformance()
  if (!d.ready) return <Spinner />
  const { profile, team, me, summary } = d
  const pos = me?.position ?? profile?.position
  const score = d.form.todayScore
  const lastScore = score ?? [...d.form.series].reverse().find((x) => x.score !== null)?.score ?? null
  const active = (d.journey?.objectives ?? []).filter((o) => o.status === 'active').length
  const cells: { label: string; value: ReactNode; sub?: string }[] = [
    { label: score !== null ? t('perf.space.formToday') : t('perf.space.formLast'), value: lastScore !== null ? `${lastScore}/${FORM_MAX}` : '·', sub: lastScore !== null ? t(`perf.form.band.${formBand(lastScore)}`) : t('perf.hero.toLog') },
    { label: t('perf.hero.load'), value: fmtInt(d.load.current, lang), sub: d.load.delta !== null ? t('perf.space.vsPrev', { v: fmtSigned(d.load.delta * 100, lang) + (lang === 'fr' ? ' %' : '%') }) : t('perf.load.uaShort') },
    { label: t('journey:hero.matches'), value: summary?.matches.played ?? 0, sub: summary ? t('perf.season.starts', { count: summary.matches.starts }) : undefined },
    { label: t('journey:perf.minutes'), value: summary ? fmtMinutes(summary.matches.minutes, lang) : '·' },
    { label: t('perf.space.lastIndice'), value: d.last?.result ? fmtNjangi(d.last.result.total, lang) : '·', sub: d.last ? t('perf.space.vs', { opponent: d.last.line.match.opponent }) : undefined },
    { label: t('perf.space.objectives'), value: active, sub: t('perf.space.cycle') },
  ]

  return (
    <div>
      <section className="relative mb-5 overflow-hidden rounded-[28px] bg-night-800 text-cream shadow-card sm:mb-6" aria-labelledby="ps-h">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sun-500/15 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-forest-500/25 blur-3xl" />
        <div className="relative p-5 sm:p-7">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sun-300">{t('perf.space.eyebrow')}</div>
          <h1 id="ps-h" className="mt-1 font-display text-[30px] font-semibold leading-[1.08] sm:text-[40px]">{me?.name ?? profile?.name}</h1>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[12.5px] font-semibold">
            {pos && <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1">{t(`common:positions.${pos}`)}</span>}
            {me?.number !== undefined && <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1"><Hash size={12} aria-hidden="true" />{me.number}</span>}
            {team && <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1"><Shirt size={13} aria-hidden="true" />{team.name}</span>}
            {d.age !== null && me?.birthYear && <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1">{t('journey:hero.age', { count: d.age })}</span>}
            <span className="rounded-full border border-sun-300/30 bg-sun-500/10 px-2.5 py-1 text-sun-300">{t('perf.space.season', { label: d.season.label })}</span>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
            {cells.map((c) => (
              <div key={c.label} className="min-w-0 border-l border-white/15 pl-3">
                <dt className="truncate text-[12px] text-cream/65">{c.label}</dt>
                <dd className="font-display text-[26px] font-semibold leading-tight tabular-nums sm:text-[28px]">{c.value}</dd>
                {c.sub && <dd className="truncate text-[12px] text-cream/65">{c.sub}</dd>}
              </div>
            ))}
          </dl>
        </div>
        <div aria-hidden="true" className="relative flex h-1.5">
          <span className="flex-1 bg-forest-500" /><span className="flex-1 bg-clay-500" /><span className="flex-1 bg-sun-500" /><span className="flex-1 bg-terra-500" /><span className="flex-1 bg-forest-800" />
        </div>
      </section>

      {!team && <CreateTeamCard compact className="mb-5" />}
      {team && !me && <LinkCallout />}

      <nav aria-label={t('space.navLabel')} className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {NAV.map((id) => <a key={id} href={`#${id}`} className="chip min-h-[40px] shrink-0 px-3.5 text-[13px]">{t(`perf.space.nav.${id}`)}</a>)}
        <Link to="/app/joueur/parcours" className="chip min-h-[40px] shrink-0 border-forest-300 px-3.5 text-[13px] text-forest-700">{t('journey:playerCard.chip')}</Link>
      </nav>

      <Block id="semaine" title={t('perf.space.weekTitle')} body={t('perf.space.weekBody')}>
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-2"><WeekCard d={d} /></div>
          <NextMatchCard d={d} />
        </div>
      </Block>

      <Block id="forme" title={t('perf.space.formTitle')} body={t('perf.space.formBody')}>
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
          <CheckInCard d={d} />
          <FormTrendCard d={d} />
          <div className="min-w-0 lg:col-span-2"><LoadCard d={d} full /></div>
        </div>
      </Block>

      <Block id="match" title={t('perf.space.matchTitle')} body={t('perf.space.matchBody')}>
        <LastMatchCard d={d} full />
      </Block>

      <Block id="objectifs" title={t('perf.space.objTitle')} body={t('perf.space.objBody')}>
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
          <ObjectivesCard d={d} withDrills />
          <SeasonCard d={d} />
        </div>
      </Block>

      <SelfAssessment teamId={team?.id} name={profile?.name ?? ''} senior coachSkills={me?.skills} />

      <PerfLinks items={['parcours', 'journal', 'code']} />
    </div>
  )
}

function Block({ id, title, body, children, className }: { id: string; title: string; body?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cx('mb-10', className)} aria-labelledby={`${id}-h`}>
      <SectionHead id={id} headingId={`${id}-h`} title={title}>{body}</SectionHead>
      {children}
    </section>
  )
}
