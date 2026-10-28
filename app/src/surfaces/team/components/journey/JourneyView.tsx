// The Parcours of one player, shared by the coach (team surface) and the player (player space).
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardCheck, Eye, Flag, Plus } from 'lucide-react'
import { useT } from '../../../../i18n'
import { cx, todayISO } from '../../../../lib/util'
import { ageOf, journeySeasons, seasonOf, seasonSummary, stageOf, type JourneyData, type SeasonSummary, type Stage } from '../../../../lib/journey'
import type { Milestone, Objective } from '../../../../lib/types'
import { initials } from '../lineup'
import { SeasonRibbon } from './SeasonRibbon'
import { SkillProgress } from './SkillProgress'
import { Timeline } from './Timeline'
import { MatchPanel, MilestonesCard, ObjectivesCard } from './Panels'
import { EvaluationModal } from './EvaluationModal'
import { ObjectiveModal } from './ObjectiveModal'
import { MilestoneModal } from './MilestoneModal'
import { fmtMinutes, fmtPct } from './bits'

export function JourneyView({ data, viewer, top }: { data: JourneyData; viewer: 'coach' | 'player'; top?: ReactNode }) {
  const { t } = useT('journey')
  const today = todayISO()
  const seasons = useMemo(() => journeySeasons(data), [data])
  const [seasonId, setSeasonId] = useState(seasonOf(today).id)
  const season = seasonId === 'all' ? null : seasons.find((s) => s.id === seasonId) ?? seasons[0]
  const stage = stageOf(data.player, data.team)
  const summary = useMemo(() => seasonSummary(data, season), [data, season])
  const [evalOpen, setEvalOpen] = useState(false)
  const [objective, setObjective] = useState<Objective | 'new' | null>(null)
  const [milestone, setMilestone] = useState<Milestone | 'new' | null>(null)

  return (
    <div>
      {top}
      <Hero data={data} viewer={viewer} stage={stage} summary={summary}
        seasons={seasons.map((s) => ({ id: s.id, label: s.label }))} seasonId={season ? season.id : 'all'} onSeason={setSeasonId}
        actions={viewer === 'coach' ? (
          <>
            <Link to={`/app/observer?joueur=${data.player.id}`} className="btn-sun min-h-[44px]"><Eye size={17} />{t('actions.observe')}</Link>
            <button type="button" className="btn min-h-[44px] border border-white/25 text-cream hover:bg-white/10" onClick={() => setEvalOpen(true)}><ClipboardCheck size={17} />{t('actions.evaluate')}</button>
            <button type="button" className="btn min-h-[44px] text-cream/90 hover:bg-white/10" onClick={() => setObjective('new')}><Plus size={17} />{t('actions.objective')}</button>
            <button type="button" className="btn min-h-[44px] text-cream/90 hover:bg-white/10" onClick={() => setMilestone('new')}><Flag size={16} />{t('actions.milestone')}</button>
          </>
        ) : (
          <button type="button" className="btn-sun min-h-[44px]" onClick={() => setObjective('new')}><Plus size={17} />{t('actions.myObjective')}</button>
        )}>
        <SeasonRibbon data={data} season={season} />
      </Hero>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="order-2 min-w-0 space-y-5 lg:order-1">
          <SkillProgress data={data} season={season} viewer={viewer} />
          <Timeline data={data} season={season} stage={stage} viewer={viewer} />
        </div>
        <aside className="order-1 min-w-0 space-y-5 lg:order-2">
          <ObjectivesCard data={data} stage={stage} viewer={viewer} onAdd={() => setObjective('new')} onOpen={(o) => setObjective(o)} />
          <MatchPanel s={summary} stage={stage} viewer={viewer} data={data} />
          <MilestonesCard data={data} season={season} viewer={viewer} onAdd={() => setMilestone('new')} onOpen={(id) => setMilestone(data.milestones.find((m) => m.id === id) ?? null)} />
        </aside>
      </div>

      {viewer === 'coach' && <EvaluationModal open={evalOpen} onClose={() => setEvalOpen(false)} data={data} />}
      <ObjectiveModal open={objective !== null} onClose={() => setObjective(null)} data={data} existing={objective === 'new' ? null : objective} by={viewer} stage={stage} />
      {viewer === 'coach' && <MilestoneModal open={milestone !== null} onClose={() => setMilestone(null)} player={data.player} existing={milestone === 'new' ? null : milestone} />}
    </div>
  )
}

function Hero({ data, viewer, stage, summary, seasons, seasonId, onSeason, actions, children }: {
  data: JourneyData; viewer: 'coach' | 'player'; stage: Stage; summary: SeasonSummary
  seasons: { id: string; label: string }[]; seasonId: string; onSeason: (id: string) => void; actions: ReactNode; children: ReactNode
}) {
  const { t, lang } = useT('journey')
  const p = data.player
  const age = ageOf(p, data.team)
  const s = summary
  const cells: { label: string; value: ReactNode; sub?: string }[] = [
    { label: t('hero.sessions'), value: s.sessions.marked ? `${s.sessions.attended}/${s.sessions.marked}` : '·', sub: s.sessions.rate !== null ? t('hero.rate', { v: fmtPct(s.sessions.rate, lang) }) : t('hero.noRegister') },
    { label: t('hero.matches'), value: s.matches.played, sub: s.matches.played ? fmtMinutes(s.matches.minutes, lang) : s.matches.squad ? t('hero.inSquad', { count: s.matches.squad }) : undefined },
    ...(s.matches.goals > 0 || stage === 'adult' ? [{ label: t('hero.goals'), value: s.matches.goals, sub: s.matches.captain ? t('hero.captain', { count: s.matches.captain }) : undefined }] : []),
    { label: t('hero.observations'), value: s.observations.total, sub: s.observations.total ? t('hero.obsPlus', { count: s.observations.plus }) : undefined },
    { label: t('hero.levels'), value: s.levels.gained ? `+${s.levels.gained}` : s.levels.changed ? '0' : '·', sub: s.levels.gained ? t('hero.levelsGained', { count: s.levels.gained }) : t('hero.levelsNone') },
    { label: t('hero.objectives'), value: s.objectives.total ? `${s.objectives.achieved}/${s.objectives.total}` : '·', sub: s.objectives.active ? t('hero.objActive', { count: s.objectives.active }) : undefined },
  ]
  const P = viewer === 'player' ? 'Player' : ''
  return (
    <section className="relative mb-5 overflow-hidden rounded-[26px] bg-forest-600 text-cream shadow-card sm:mb-6">
      <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full border-[28px] border-white/[0.035]" aria-hidden="true" />
      <div className="relative p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span aria-hidden="true" className={cx('grid h-16 w-16 shrink-0 place-items-center rounded-2xl font-display text-3xl font-semibold tabular-nums', p.position === 'GK' ? 'bg-sun-500 text-night-900' : 'bg-cream text-forest-700', p.number === undefined && 'text-xl')}>
              {p.number ?? initials(p.name)}
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-sun-300">{viewer === 'player' ? t('hero.eyebrowPlayer') : t('hero.eyebrow')}</div>
              <h1 className="font-display text-[28px] font-semibold leading-[1.08] sm:text-[38px]">{p.name}</h1>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[12.5px] font-semibold">
                <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5">{t(`common:positions.${p.position}`)}</span>
                {age !== null && p.birthYear && <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5">{t('hero.age', { count: age })}</span>}
                {data.team && <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5">{data.team.name}</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:max-w-[440px] lg:justify-end">{actions}</div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1 rounded-xl bg-forest-700/60 p-1" role="group" aria-label={t('hero.season')}>
            {[...seasons, ...(seasons.length > 1 ? [{ id: 'all', label: t('hero.allSeasons') }] : [])].map((x) => (
              <button key={x.id} type="button" onClick={() => onSeason(x.id)} aria-pressed={seasonId === x.id}
                className={cx('min-h-[36px] rounded-lg px-3 text-[13px] font-semibold tabular-nums transition', seasonId === x.id ? 'bg-cream text-forest-700' : 'text-cream/80 hover:bg-white/10')}>
                {x.id === 'all' ? x.label : t('hero.seasonLabel', { label: x.label })}
              </button>
            ))}
          </div>
          <span className="text-[12.5px] text-cream/70">{t(`stage.${stage}${P}`)}</span>
        </div>

        <div className="mt-4 rounded-2xl bg-forest-700/50 p-3 ring-1 ring-white/10 sm:p-4">{children}</div>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
          {cells.map((c) => (
            <div key={c.label} className="min-w-0">
              <dt className="text-[12px] text-cream/70">{c.label}</dt>
              <dd className="font-display text-[30px] font-semibold leading-tight tabular-nums">{c.value}</dd>
              {c.sub && <dd className="truncate text-[12px] text-cream/75">{c.sub}</dd>}
            </div>
          ))}
        </dl>

        {(s.strength || s.nextStep) && (
          <p className="mt-5 border-t border-white/15 pt-4 text-[14.5px] leading-relaxed text-cream/90">
            {s.strength && <span>{t(`hero.strength${P}`, { skill: t(`common:skills.${s.strength}`), level: s.levels.now[s.strength] })} </span>}
            {s.nextStep && <span>{t(`hero.next${P}${stage === 'adult' ? 'Adult' : ''}`, { skill: t(`common:skills.${s.nextStep}`) })}</span>}
          </p>
        )}
      </div>
    </section>
  )
}
