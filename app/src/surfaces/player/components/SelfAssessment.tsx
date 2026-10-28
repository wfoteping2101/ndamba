// « Mon regard sur moi »: the player rates himself on the ten competences (levels 1 to 4), next to the
// staff's evaluation when the squad has one. Kept only on this device. The senior version uses the
// staff's grid (Découverte, Construction, Acquis, Référence) and plainer wording.
import { SKILLS } from '../../../content'
import { useT } from '../../../i18n'
import { db } from '../../../lib/db'
import { useLiveQuery } from '../../../lib/hooks'
import { cx, fmtDate } from '../../../lib/util'
import type { Player, SkillKey } from '../../../lib/types'
import { Legend, SkillRadar } from './Charts'
import { SectionHead } from './bits'
import { useSelfAssessment } from './storage'

const LEVEL_VALUES = [1, 2, 3, 4] as const

export function SelfAssessment({ teamId, name, senior = false, coachSkills }: { teamId?: string; name: string; senior?: boolean; coachSkills?: Player['skills'] }) {
  const { t, lang } = useT('player')
  const { self, setLevel } = useSelfAssessment()
  // Without the linked squad record, the same name in the team stands for me.
  const byName = useLiveQuery(async () => {
    if (coachSkills || !teamId || !name) return null
    const key = name.trim().toLowerCase()
    const list = await db.players.where('teamId').equals(teamId).toArray()
    return list.find((pl) => pl.name.trim().toLowerCase() === key) ?? null
  }, [teamId, name, !!coachSkills], null as Player | null)
  const coach = coachSkills ?? byName?.skills
  const P = senior ? 'perf.self' : 'self'
  const levelName = (v: number) => (senior ? t(`team:levels.${v}`) : t(`self.levels.${v}`))
  const axes = SKILLS.map((k) => ({ key: k, label: t(`common:skills.${k}`) }))
  const series = [{ name: t(`${P}.me`), color: '#0B5D3B', values: self.levels as Record<string, number | undefined> }]
  const coachHas = !!coach && Object.keys(coach).length > 0
  // the staff's view: red earth in the youth space, ink in the senior space
  if (coachHas) series.push({ name: t(`${P}.coach`), color: senior ? '#5D6C63' : '#BF5A2E', values: coach as Record<string, number | undefined> })
  const filled = SKILLS.filter((k) => self.levels[k]).length

  return (
    <section className="mb-12" aria-labelledby="regard-h">
      <SectionHead id="regard" headingId="regard-h" eyebrow={senior ? t('perf.self.eyebrow') : undefined} title={t(`${P}.title`)}>{t(`${P}.body`)}</SectionHead>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.25fr_1fr] lg:gap-6">
        <div className="rounded-[22px] border border-line bg-paper p-5 sm:p-6">
          <ol className="mb-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[13px] text-ink-muted sm:grid-cols-4" aria-label={t('self.scale')}>
            {LEVEL_VALUES.map((v) => <li key={v}><span className="mr-1.5 font-semibold tabular-nums text-ink">{v}</span>{levelName(v)}</li>)}
          </ol>
          <ul className="divide-y divide-line border-t border-line">
            {SKILLS.map((k: SkillKey) => {
              const cur = self.levels[k]
              const theirs = coach?.[k]
              return (
                <li key={k} className="py-3">
                  <fieldset className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <legend className="sr-only">{t(`common:skills.${k}`)}</legend>
                    <div className="min-w-0 flex-1 basis-48">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5" aria-hidden="true">
                        <span className="text-[15px] font-semibold text-ink">{t(`common:skills.${k}`)}</span>
                        {senior && theirs ? <span className="rounded-full bg-sand px-2 py-0.5 text-[12px] font-semibold text-ink-soft">{t('perf.self.staffSays', { level: levelName(theirs) })}</span> : null}
                      </div>
                      <div className="mt-0.5 text-[13px] leading-snug text-ink-muted">{t(senior ? `perf.skillHint.${k}` : `skillHint.${k}`)}</div>
                    </div>
                    <div className="flex gap-1.5">
                      {LEVEL_VALUES.map((v) => (
                        <button key={v} type="button" onClick={() => setLevel(k, v)} aria-pressed={cur === v}
                          aria-label={`${t(`common:skills.${k}`)} : ${v}, ${levelName(v)}`}
                          className={cx('grid h-11 w-11 place-items-center rounded-full border text-sm font-semibold tabular-nums transition',
                            cur === v ? 'border-forest-600 bg-forest-600 text-cream' : cur && v < cur ? 'border-forest-100 bg-forest-50 text-forest-700' : 'border-line bg-paper text-ink-muted hover:border-ink-faint')}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="flex flex-col rounded-[22px] border border-line bg-paper p-5 sm:p-6">
          <h3 className="text-[20px] leading-tight text-ink">{t(`${P}.radarTitle`)}</h3>
          {filled === 0 && !coachHas ? (
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-muted">{t(`${P}.radarEmpty`)}</p>
          ) : (
            <>
              <div className="mx-auto mt-2 w-full max-w-[420px]"><SkillRadar axes={axes} series={series} size={300} /></div>
              <Legend items={series.filter((s) => Object.values(s.values).some(Boolean)).map((s) => ({ name: s.name, color: s.color }))} />
              {coachHas && <p className="mt-3 text-[13.5px] leading-relaxed text-ink-muted">{t(`${P}.coachNote`)}</p>}
            </>
          )}
          <p className="mt-auto pt-4 text-[12.5px] text-ink-muted">
            {self.updatedAt ? t('self.updated', { date: fmtDate(self.updatedAt.slice(0, 10), lang, { day: 'numeric', month: 'long' }), n: filled }) : t('self.private')}
          </p>
        </div>
      </div>
    </section>
  )
}
