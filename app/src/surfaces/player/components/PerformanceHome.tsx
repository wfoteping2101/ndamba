// Home for players of 16 and over (U17 to senior professionals): the match week and the next match first,
// then today's form and effort, the last match with the Indice Njangi, the objectives and the season.
import { Link } from 'react-router-dom'
import { useT } from '../../../i18n'
import { useDocumentTitle } from '../../../lib/hooks'
import { useSession } from '../../../lib/session'
import { BRAND } from '../../../lib/config'
import { fmtNjangi } from '../../../lib/njangi'
import { daysBetween } from '../../../lib/util'
import { Spinner } from '../../team/components/journey/bits'
import { Greeting, HeroFigures, type RotatingLine } from './Greeting'
import { CreateTeamCard, mdParts } from './bits'
import { isPlayerRole } from './data'
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
      {!team && <CreateTeamCard compact senior className="mb-6" />}
      {team && !d.me && <LinkCallout />}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
        <div className="min-w-0 lg:col-span-2"><WeekCard d={d} /></div>
        <NextMatchCard d={d} />
        <div className="min-w-0 lg:col-span-2"><CheckInCard d={d} /></div>
        <LoadCard d={d} />
        <div className="min-w-0 lg:col-span-3"><LastMatchCard d={d} /></div>
        <ObjectivesCard d={d} />
        <SeasonCard d={d} />
        <PerfLinks items={['space', 'parcours', 'journal', 'code']} stack />
      </div>
    </div>
  )
}

/** Who the player is in this squad, as one sentence: position, number, team. */
export function playerLine(t: (k: string, o?: Record<string, unknown>) => string, pos?: string, number?: number, team?: string, age?: string) {
  return [pos ? t(`common:positions.${pos}`) : '', number !== undefined ? t('perf.hero.number', { n: number }) : '', team ?? '', age ?? ''].filter(Boolean).join(', ')
}

/** The greeting band: today's role in the week, the motto, and three numbers. */
function PerfGreeting({ d }: { d: PerfData }) {
  const { t, lang } = useT('player')
  const s = d.sessions.find((x) => x.date === d.today)
  const m = d.matches.find((x) => x.date === d.today)
  const lines: RotatingLine[] = [
    m ? { label: t('perf.hero.matchDay'), text: m.time ? t('perf.hero.matchLine', { opponent: m.opponent, time: m.time }) : t('perf.hero.matchLineNoTime', { opponent: m.opponent }) }
      : s ? { label: s.md === 'youth' ? t('perf.hero.today') : t('perf.hero.todayMd', { md: mdParts(t, s.md).full }), text: s.title }
        : { label: t('perf.hero.today'), text: t('perf.week.restTitle') },
    { label: t('greeting.motto'), text: BRAND.motto[lang] },
  ]
  const score = d.form.todayScore
  const days = d.next ? daysBetween(d.today, d.next.date) : null
  const pos = d.me?.position ?? d.profile?.position
  const who = playerLine(t, pos, d.me?.number, d.team?.name)
  return (
    <Greeting name={d.profile?.name ?? ''} today={d.today} lines={lines} tone="night"
      aside={
        <HeroFigures className="lg:w-[400px]" items={[
          { label: t('perf.hero.form'), value: score !== null ? `${score}/${FORM_MAX}` : t('perf.hero.toLog'), sub: score !== null ? t(`perf.form.band.${formBand(score)}`) : undefined },
          { label: t('perf.hero.load'), value: fmtInt(d.load.current, lang), sub: t('perf.load.uaShort') },
          { label: t('home.statNext'), value: days === null ? t('home.none') : days === 0 ? t('home.matchDay') : t('home.jMinus', { n: days }), sub: d.last?.result ? t('perf.hero.lastIndice', { v: fmtNjangi(d.last.result.total, lang) }) : undefined },
        ]} />
      }>
      {who && <p className="mt-5 text-[14px] font-medium text-cream/70">{who}</p>}
    </Greeting>
  )
}

/** The profile is not linked to a squad record: a player links himself; a staff member previews the space. */
export function LinkCallout() {
  const { t } = useT('player')
  const { profile } = useSession()
  const staff = !isPlayerRole(profile?.role)
  const k = staff ? 'perf.linkStaff' : 'perf.link'
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-line bg-paper px-4 py-3.5 sm:px-5">
      <p className="min-w-0 flex-1 basis-64 text-[14.5px] text-ink-soft"><span className="font-semibold text-ink">{t(`${k}.title`)}</span> {t(`${k}.body`)}</p>
      <Link to="/app/joueur/parcours" className="btn-primary btn-sm min-h-[44px] px-4">{t(`${k}.cta`)}</Link>
    </div>
  )
}
