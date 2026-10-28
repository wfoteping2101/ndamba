// /app/joueur for players of 16 and over: the performance space. The match week, form and load over
// four weeks, the last match in detail, the objectives with the drills that train them, the season,
// and the self-assessment next to the staff's evaluation.
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../../../i18n'
import { useDocumentTitle } from '../../../lib/hooks'
import { fmtNjangi } from '../../../lib/njangi'
import { cx } from '../../../lib/util'
import { Spinner, fmtMinutes } from '../../team/components/journey/bits'
import { CreateTeamCard, SectionHead } from './bits'
import { SelfAssessment } from './SelfAssessment'
import { LinkCallout, playerLine } from './PerformanceHome'
import { PitchLines } from './Greeting'
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
  const cells: { label: string; value: ReactNode | null; sub?: string }[] = [
    { label: score !== null ? t('perf.space.formToday') : t('perf.space.formLast'), value: lastScore !== null ? `${lastScore}/${FORM_MAX}` : null, sub: lastScore !== null ? t(`perf.form.band.${formBand(lastScore)}`) : t('perf.hero.toLog') },
    { label: t('perf.hero.load'), value: fmtInt(d.load.current, lang), sub: d.load.delta !== null ? t('perf.space.vsPrev', { v: fmtSigned(d.load.delta * 100, lang) + (lang === 'fr' ? ' %' : '%') }) : t('perf.load.uaShort') },
    { label: t('journey:hero.matches'), value: summary?.matches.played ?? 0, sub: summary ? t('perf.season.starts', { count: summary.matches.starts }) : undefined },
    { label: t('journey:perf.minutes'), value: summary ? fmtMinutes(summary.matches.minutes, lang) : null },
    { label: t('perf.space.lastIndice'), value: d.last?.result ? fmtNjangi(d.last.result.total, lang) : null, sub: d.last ? t('perf.space.vs', { opponent: d.last.line.match.opponent }) : undefined },
    { label: t('perf.space.objectives'), value: active, sub: t('perf.space.cycle') },
  ]

  return (
    <div>
      <section className="relative mb-6 overflow-hidden rounded-[22px] bg-night-800 text-cream sm:mb-8" aria-labelledby="ps-h">
        <PitchLines />
        <div className="relative px-5 pb-6 pt-5 sm:px-8 sm:pb-8 sm:pt-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[14px] font-semibold text-cream/65">{t('perf.space.eyebrow')}</p>
            <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-[12.5px] font-semibold text-cream/80">{t('perf.space.season', { label: d.season.label })}</span>
          </div>
          <h1 id="ps-h" className="mt-2 text-[34px] sm:text-[46px]">{me?.name ?? profile?.name}</h1>
          <p className="mt-2 text-[14.5px] font-medium text-cream/70">{playerLine(t, pos, me?.number, team?.name, d.age !== null && me?.birthYear ? t('journey:hero.age', { count: d.age }) : undefined)}</p>
          <dl className="mt-7 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
            {cells.map((c) => (
              <div key={c.label} className="min-w-0 border-l-2 border-white/15 pl-3">
                <dt className="truncate text-[12.5px] font-medium text-cream/65">{c.label}</dt>
                <dd className={cx('leading-tight tabular-nums', c.value === null ? 'py-1.5 text-[15px] font-medium text-cream/45' : 'whitespace-nowrap font-display text-[26px] lg:text-[24px] xl:text-[28px]')}>{c.value === null ? t('perf.none') : c.value}</dd>
                {c.sub && <dd className="truncate text-[12.5px] text-cream/60">{c.sub}</dd>}
              </div>
            ))}
          </dl>
        </div>
      </section>

      {!team && <CreateTeamCard compact senior className="mb-5" />}
      {team && !me && <LinkCallout />}

      <nav aria-label={t('space.navLabel')} className="-mx-4 mb-8 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {NAV.map((id) => <a key={id} href={`#${id}`} className="inline-flex min-h-[40px] shrink-0 items-center rounded-full border border-line bg-paper px-4 text-[13.5px] font-semibold text-ink-soft transition hover:border-forest-300 hover:text-ink">{t(`perf.space.nav.${id}`)}</a>)}
        <Link to="/app/joueur/parcours" className="inline-flex min-h-[40px] shrink-0 items-center rounded-full bg-forest-600 px-4 text-[13.5px] font-semibold text-cream transition hover:bg-forest-700">{t('journey:playerCard.chip')}</Link>
      </nav>

      <Block id="semaine" title={t('perf.space.weekTitle')} body={t('perf.space.weekBody')}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
          <div className="min-w-0 lg:col-span-2"><WeekCard d={d} /></div>
          <NextMatchCard d={d} />
        </div>
      </Block>

      <Block id="forme" title={t('perf.space.formTitle')} body={t('perf.space.formBody')}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
          <CheckInCard d={d} />
          <FormTrendCard d={d} />
          <div className="min-w-0 lg:col-span-2"><LoadCard d={d} full /></div>
        </div>
      </Block>

      <Block id="match" title={t('perf.space.matchTitle')} body={t('perf.space.matchBody')}>
        <LastMatchCard d={d} full />
      </Block>

      <Block id="objectifs" title={t('perf.space.objTitle')} body={t('perf.space.objBody')}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
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
    <section className={cx('mb-12', className)} aria-labelledby={`${id}-h`}>
      <SectionHead id={id} headingId={`${id}-h`} title={title}>{body}</SectionHead>
      {children}
    </section>
  )
}
