// « Mes objectifs du cycle » (from the Parcours) and, in the performance space, the drills of
// Le Code Njangi that train them. « Ma saison »: the Parcours in a few figures and the last word of the staff.
import { Link } from 'react-router-dom'
import { MessageSquareQuote } from 'lucide-react'
import { useT } from '../../../../i18n'
import { DRILLS, drillText, getDrill } from '../../../../content'
import { DRILLS_FOR } from '../../../../lib/njangi'
import { levelsAt, MAX_ACTIVE_OBJECTIVES, obsTone } from '../../../../lib/journey'
import { cx, daysBetween, fmtDate } from '../../../../lib/util'
import type { Drill, Objective } from '../../../../lib/types'
import { LevelPips, fmtMinutes, fmtPct, quote } from '../../../team/components/journey/bits'
import type { PerfData } from './data'
import { Figure, PerfHead } from './bits'

function drillsFor(o: Objective): Drill[] {
  if (o.sub) return DRILLS_FOR[o.sub].map((id) => getDrill(id)).filter((x): x is Drill => !!x)
  if (!o.skill) return []
  return DRILLS.filter((dr) => dr.skills.slice(0, 3).includes(o.skill!)).sort((a, b) => a.skills.indexOf(o.skill!) - b.skills.indexOf(o.skill!) || a.order - b.order)
}

export function ObjectivesCard({ d, withDrills = false }: { d: PerfData; withDrills?: boolean }) {
  const { t, lang } = useT('player')
  const j = d.journey
  const active = (j?.objectives ?? []).filter((o) => o.status === 'active').sort((a, b) => a.review.localeCompare(b.review))
  const now = j ? levelsAt(j.evaluations, d.today) : {}
  const used = new Set<string>()
  const drills = withDrills ? active.flatMap((o) => drillsFor(o).filter((x) => !used.has(x.id)).slice(0, 2).map((x) => { used.add(x.id); return { o, x } })).slice(0, 4) : []
  return (
    <section className="h-full rounded-[22px] border border-line bg-paper p-5 sm:p-6" aria-labelledby="ob-h">
      <PerfHead id="ob-h" eyebrow={t('perf.obj.eyebrow')} title={t('perf.obj.title')} hint={t('perf.obj.hint', { n: MAX_ACTIVE_OBJECTIVES })} />
      {!j ? <NoLink /> : active.length === 0 ? (
        <div className="text-[14.5px] leading-relaxed text-ink-muted">
          {t('perf.obj.empty')}
          <div className="mt-3"><Link to="/app/joueur/parcours" className="btn-primary btn-sm min-h-[44px] px-4">{t('perf.obj.set')}</Link></div>
        </div>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {active.map((o) => {
            const left = daysBetween(d.today, o.review)
            const lvl = o.skill ? now[o.skill] : undefined
            return (
              <li key={o.id} className="py-3.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-forest-50 px-2.5 py-0.5 text-[12px] font-semibold text-forest-700">{o.skill ? t(`common:skills.${o.skill}`) : t('journey:objectives.subLink', { name: t(`subs.${o.sub}`) })}</span>
                  <span className="text-[12.5px] font-medium text-ink-muted">{o.by === 'player' ? t('journey:objectives.byMe') : t('perf.obj.byStaff')}</span>
                  <span className={cx('ml-auto text-[12.5px] font-semibold', left < 0 ? 'text-clay-700' : 'text-ink-muted')}>
                    {left < 0 ? t('journey:objectives.reviewDue') : left === 0 ? t('journey:objectives.reviewToday') : t('journey:objectives.reviewIn', { count: left, date: fmtDate(o.review, lang, { day: 'numeric', month: 'short' }) })}
                  </span>
                </div>
                <div className="mt-2 text-[16.5px] font-semibold leading-snug text-ink">{o.title}</div>
                {lvl && <div className="mt-1.5 flex items-center gap-1.5 text-[13px] text-ink-muted"><LevelPips level={lvl} />{t('perf.obj.level', { level: t(`team:levels.${lvl}`) })}</div>}
              </li>
            )
          })}
        </ul>
      )}
      {drills.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-[14px] font-semibold text-ink">{t('perf.obj.drills')}</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {drills.map(({ o, x }) => (
              <li key={x.id}>
                <Link to={`/app/exercices/${x.id}`} className="flex min-h-[56px] items-center gap-3 rounded-xl border border-line px-3 py-2 transition hover:border-forest-300">
                  <span className="shrink-0 text-[12.5px] font-semibold text-forest-600">{x.id}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-ink">{drillText(x, lang).title}</span>
                    <span className="block truncate text-[12.5px] text-ink-muted">{t('perf.obj.drillSub', { family: t(`common:families.${x.family}`), skill: o.skill ? t(`common:skills.${o.skill}`) : t(`subs.${o.sub}`) })}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {j && <Link to="/app/joueur/parcours" className="link mt-4 inline-flex min-h-[44px] items-center text-[14px]">{t('perf.obj.manage')}</Link>}
    </section>
  )
}

export function SeasonCard({ d }: { d: PerfData }) {
  const { t, lang } = useT('player')
  const s = d.summary
  const j = d.journey
  const lastNote = j ? [...j.observations].filter((o) => o.by === 'coach' && o.note).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))[0] : undefined
  const ctx = lastNote ? (lastNote.matchId ? j!.matches.find((m) => m.id === lastNote.matchId) : undefined) : undefined
  const ses = lastNote?.sessionId ? j!.sessions.find((x) => x.id === lastNote.sessionId) : undefined
  const lastEval = j ? j.evaluations.filter((e) => e.by === 'coach').slice(-1)[0] : undefined
  return (
    <section className="h-full rounded-[22px] border border-line bg-paper p-5 sm:p-6" aria-labelledby="se-h">
      <PerfHead id="se-h" eyebrow={t('perf.season.eyebrow', { label: d.season.label })} title={t('perf.season.title')} />
      {!s || !j ? <NoLink /> : (
        <>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
            <Figure label={t('journey:hero.matches')} value={s.matches.played} sub={t('perf.season.starts', { count: s.matches.starts })} />
            <Figure label={t('journey:perf.minutes')} value={fmtMinutes(s.matches.minutes, lang)} sub={s.matches.played ? t('journey:perf.avgMin', { n: Math.round(s.matches.minutes / s.matches.played) }) : undefined} />
            <Figure label={t('journey:hero.sessions')} value={s.sessions.marked ? `${s.sessions.attended}/${s.sessions.marked}` : null} sub={s.sessions.rate !== null ? t('journey:hero.rate', { v: fmtPct(s.sessions.rate, lang) }) : t('journey:hero.noRegister')} />
            <Figure label={t('perf.season.evals')} value={j.evaluations.filter((e) => e.by === 'coach').length} sub={lastEval ? t('perf.season.lastEval', { date: fmtDate(lastEval.date, lang, { day: 'numeric', month: 'short' }) }) : undefined} />
          </dl>
          {(s.strength || s.nextStep) && (
            <p className="mt-5 text-[14.5px] leading-relaxed text-ink-soft">
              {s.strength && <span>{t('journey:hero.strengthPlayer', { skill: t(`common:skills.${s.strength}`), level: s.levels.now[s.strength] })} </span>}
              {s.nextStep && <span>{t('journey:hero.nextPlayerAdult', { skill: t(`common:skills.${s.nextStep}`) })}</span>}
            </p>
          )}
          {lastNote && (
            <figure className="mt-5 border-l-2 border-forest-600 pl-3.5">
              <figcaption className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-semibold text-ink">
                <MessageSquareQuote size={14} strokeWidth={1.75} aria-hidden="true" className="text-forest-600" />{t('perf.season.lastObs')}
                <span className={cx('rounded-full px-2 py-0.5 text-[12px] font-semibold', obsTone(lastNote) === 'work' ? 'bg-sand text-ink-soft' : 'bg-forest-50 text-forest-700')}>{t(`perf.season.tone.${obsTone(lastNote) === 'work' ? 'work' : 'plus'}`)}</span>
              </figcaption>
              <blockquote className="mt-1.5 text-[15px] italic leading-snug text-ink">{quote(lastNote.note!, lang)}</blockquote>
              <div className="mt-1.5 text-[12.5px] text-ink-muted">
                {fmtDate(lastNote.date, lang, { day: 'numeric', month: 'long' })}{ctx ? `, ${lastNote.minute ? t('perf.season.inMatchMin', { opponent: ctx.opponent, min: lastNote.minute }) : t('perf.season.inMatch', { opponent: ctx.opponent })}` : ses ? `, ${ses.title}` : ''}
              </div>
            </figure>
          )}
          <Link to="/app/joueur/parcours" className="link mt-4 inline-flex min-h-[44px] items-center text-[14px]">{t('perf.season.open')}</Link>
        </>
      )}
    </section>
  )
}

function NoLink() {
  const { t } = useT('player')
  return (
    <div className="text-[14.5px] leading-relaxed text-ink-muted">
      {t('perf.obj.noLink')}
      <div className="mt-3"><Link to="/app/joueur/parcours" className="btn-outline btn-sm min-h-[44px] px-4">{t('perf.link.cta')}</Link></div>
    </div>
  )
}
