// Mode F, Parcours de formation: what the player has mastered in the game, read through the book's
// ten competences and five intentions (each drill sheet lists the ones it trains), the Indice
// over time, and the next exercise to work on.
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen } from 'lucide-react'
import { useT } from '../../../i18n'
import { useDocumentTitle, useLiveQuery } from '../../../lib/hooks'
import { fmtNjangi } from '../../../lib/njangi'
import type { Drill, Intention, SkillKey } from '../../../lib/types'
import { GameFrame, TopBar } from '../../shared/ui'
import { allDrillProgress, recentAttempts, type DrillProgress } from '../../shared/save'
import { LESSONS_ORDERED } from '../drills/catalog'
import { methodeChapter } from '../links'

const SKILLS: SkillKey[] = ['scan', 'controle', 'passe', 'conduite', 'dribble-njangi', 'appels', 'communication', 'protection', 'contre-pression', 'decision']
const INTENTS: Intention[] = ['sortir', 'progresser', 'fixer', 'finir', 'respirer', 'reprendre', 'regarder-devant']
const stars = (p?: DrillProgress) => (p ? (['facile', 'normal', 'difficile'] as const).filter((l) => p.done[l]).length : 0)

function share<K extends string>(keys: K[], of: (d: Drill) => K[], byId: Map<string, DrillProgress>) {
  return keys.map((k) => {
    const drills = LESSONS_ORDERED.filter((d) => of(d).includes(k))
    const got = drills.reduce((s, d) => s + stars(byId.get(d.id)), 0)
    const max = drills.length * 3
    return { k, drills, value: max ? got / max : 0, done: drills.filter((d) => stars(byId.get(d.id)) > 0).length }
  })
}

export default function Parcours() {
  const { t, lang } = useT('jeux')
  const { t: tc } = useT('common')
  useDocumentTitle(t('parcours.title'))
  const progress = useLiveQuery(() => allDrillProgress(), [], [])
  const attempts = useLiveQuery(() => recentAttempts('njangi', 60), [], [])
  const byId = useMemo(() => new Map(progress.map((p) => [p.id, p])), [progress])
  const skills = useMemo(() => share(SKILLS, (d) => d.skills, byId), [byId])
  const intents = useMemo(() => share(INTENTS, (d) => d.intentions, byId).filter((r) => r.drills.length), [byId])
  const totalStars = LESSONS_ORDERED.reduce((s, d) => s + stars(byId.get(d.id)), 0)
  // the weakest competence, and the first drill that trains it not yet done at Normal
  const weakest = [...skills].sort((a, b) => a.value - b.value)[0]
  const nextDrill = weakest?.drills.find((d) => !byId.get(d.id)?.done.normal) ?? LESSONS_ORDERED.find((d) => !byId.get(d.id)?.done.normal) ?? null
  const indices = attempts.filter((a) => a.indice !== null).slice(0, 12).reverse()
  const lecture = attempts.filter((a) => a.key === 'lecture').slice(0, 5)
  const dix = attempts.filter((a) => a.key === 'DIX')
  const level = (v: number) => (v < 0.25 ? 1 : v < 0.5 ? 2 : v < 0.75 ? 3 : 4)
  return (
    <GameFrame className="overflow-y-auto bg-night-800">
      <TopBar back="/jeux/code-njangi" title={t('parcours.title')} sub={t('parcours.stars', { n: totalStars, max: LESSONS_ORDERED.length * 3 })} />
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-20 sm:px-6 sm:pt-24">
        <p className="max-w-2xl text-[15.5px] leading-relaxed text-cream/75">{t('parcours.intro')}</p>

        {nextDrill && (
          <Link to={`/jeux/code-njangi/academie/${nextDrill.id}`} className="glass-strong group mt-6 flex items-center gap-4 rounded-[18px] p-4">
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-semibold text-sun-300">{t('parcours.next', { skill: tc(`skills.${weakest.k}`) })}</span>
              <span className="mt-0.5 block truncate text-[17px] font-semibold">{nextDrill.id} {lang === 'en' ? nextDrill.en.title : nextDrill.fr.title}</span>
            </span>
            <ArrowRight size={20} strokeWidth={1.75} className="text-cream/60 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section aria-labelledby="sk">
            <h2 id="sk" className="text-[17px] font-semibold">{t('parcours.skills')}</h2>
            <p className="mt-1 text-[13px] text-cream/60">{t('parcours.skillsHint')}</p>
            <ul className="mt-3 space-y-2.5">
              {skills.map((r) => (
                <li key={r.k}>
                  <div className="flex items-baseline justify-between gap-2 text-[14px]">
                    <span>{tc(`skills.${r.k}`)}</span>
                    <span className="tabular-nums text-cream/60">{t('parcours.level', { n: level(r.value) })}, {r.done}/{r.drills.length}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.round(r.value * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={tc(`skills.${r.k}`)}>
                    <div className="h-full rounded-full bg-forest-500" style={{ width: `${Math.max(2, r.value * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="in">
            <h2 id="in" className="text-[17px] font-semibold">{t('parcours.intentions')}</h2>
            <p className="mt-1 text-[13px] text-cream/60">{t('parcours.intentionsHint')}</p>
            <ul className="mt-3 space-y-2.5">
              {intents.map((r) => (
                <li key={r.k}>
                  <div className="flex items-baseline justify-between gap-2 text-[14px]"><span>{tc(`intentions.${r.k}`)}</span><span className="tabular-nums text-cream/60">{r.done}/{r.drills.length}</span></div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-sun-500" style={{ width: `${Math.max(2, r.value * 100)}%` }} /></div>
                </li>
              ))}
            </ul>
            <a href={methodeChapter(5)} className="mt-3 inline-flex min-h-[44px] items-center gap-2 text-[14px] font-semibold text-cream/75 hover:text-cream"><BookOpen size={16} strokeWidth={1.75} aria-hidden="true" />{t('lecture.chapter')}</a>
          </section>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[18px] border border-white/10 bg-night-700 p-4">
            <p className="text-[13px] font-semibold text-cream/60">{t('njangi.indiceTitle')}</p>
            {indices.length ? (
              <>
                <p className="mt-1 text-[28px] font-semibold tabular-nums text-sun-300">{fmtNjangi(indices[indices.length - 1].indice ?? 0, lang)}</p>
                <Spark values={indices.map((a) => a.indice ?? 0)} label={t('parcours.indiceTrend')} />
              </>
            ) : <p className="mt-1 text-[14px] text-cream/70">{t('njangi.indiceEmpty')}</p>}
          </div>
          <div className="rounded-[18px] border border-white/10 bg-night-700 p-4">
            <p className="text-[13px] font-semibold text-cream/60">{t('lecture.title')}</p>
            {lecture.length ? <p className="mt-1 text-[28px] font-semibold tabular-nums">{lecture[0].points}<span className="text-[15px] text-cream/50"> / 32</span></p> : <p className="mt-1 text-[14px] text-cream/70">{t('parcours.none')}</p>}
            <Link to="/jeux/code-njangi/lecture" className="mt-2 inline-flex min-h-[44px] items-center text-[14px] font-semibold text-cream/80 underline underline-offset-4">{t('parcours.goLecture')}</Link>
          </div>
          <div className="rounded-[18px] border border-white/10 bg-night-700 p-4">
            <p className="text-[13px] font-semibold text-cream/60">{t('dix.title')}</p>
            {dix.length ? <p className="mt-1 text-[16px] font-semibold">{dix.some((a) => a.success) ? t('parcours.dixDone') : t('parcours.dixTried', { n: dix.length })}</p> : <p className="mt-1 text-[14px] text-cream/70">{t('parcours.none')}</p>}
            <Link to="/jeux/code-njangi/dix-passes" className="mt-2 inline-flex min-h-[44px] items-center text-[14px] font-semibold text-cream/80 underline underline-offset-4">{t('parcours.goDix')}</Link>
          </div>
        </div>
        <p className="mt-6 text-[12.5px] text-cream/50">{t('parcours.note')}</p>
      </div>
    </GameFrame>
  )
}

function Spark({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) return null
  const W = 160, H = 40, max = 100
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - (v / max) * H}`).join(' ')
  return <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-10 w-full" role="img" aria-label={label}><polyline points={pts} fill="none" stroke="#F5B700" strokeWidth={2} strokeLinejoin="round" /></svg>
}
