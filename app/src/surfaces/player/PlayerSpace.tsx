// /app/joueur: the player space. Level and XP (computed from logged challenges), the streak,
// the three challenges of the day, progress charts, a self-assessment of the ten competences,
// the full challenge library and the history of results.
import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BookOpen, Droplets, Flame, History, Moon, NotebookPen, Star, Target, Trash2, TrendingUp } from 'lucide-react'
import { EmptyState, Segmented } from '../../ui'
import { useT } from '../../i18n'
import { db } from '../../lib/db'
import { useDocumentTitle, useLiveQuery } from '../../lib/hooks'
import { useSession } from '../../lib/session'
import { addDays, cx, fmtDate } from '../../lib/util'
import type { ChallengeLog, Player, SkillKey } from '../../lib/types'
import { SKILLS } from '../../content'
import {
  CHALLENGES, CHALLENGE_KINDS, XP_DAILY, XP_DONE, XP_TARGET, challengeText, getChallenge, reached, type ChallengeKind, type Progress,
} from './challenges'
import ChallengeCard, { KIND_ICON, KIND_TONE } from './components/ChallengeCard'
import { DayBars, HistoryLine, Legend, RingProgress, SkillRadar } from './components/Charts'
import { LevelUpBanner, SectionHead, useToast } from './components/bits'
import { useLevelUp, usePlayerData, useScrollToHash } from './components/data'
import { useSelfAssessment } from './components/storage'
import { JourneyCard } from './components/JourneyCard'

const LEVEL_VALUES = [1, 2, 3, 4] as const

export default function PlayerSpace() {
  const { t, lang } = useT('player')
  useDocumentTitle(t('space.docTitle'))
  const { profile, team } = useSession()
  const { progress: p, bests, daily, logs, loading, today } = usePlayerData()
  const levelUp = useLevelUp(p.level, loading)
  const { toast, toastNode } = useToast()
  const [kind, setKind] = useState<'all' | ChallengeKind>('all')
  const loc = useLocation()
  useScrollToHash(loc.hash, !loading, (id) => { if (id.startsWith('defi-')) setKind('all') })

  const toNext = p.nextMin === null ? 0 : p.nextMin - p.xp
  const doneToday = daily.filter((c) => bests[c.id] !== undefined).length
  const library = kind === 'all' ? CHALLENGES : CHALLENGES.filter((c) => c.kind === kind)

  return (
    <div>
      <LevelUpBanner level={levelUp.reached} onClose={levelUp.dismiss} />

      {/* hero: level and XP */}
      <section className="relative mb-5 overflow-hidden rounded-[28px] bg-forest-600 text-cream shadow-card sm:mb-6">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-sun-500/20 blur-3xl" />
        <div className="relative grid grid-cols-1 gap-5 p-5 sm:p-7 md:grid-cols-[auto_1fr] md:items-center">
          <RingProgress value={p.xp - p.levelMin} max={(p.nextMin ?? p.xp) - p.levelMin || 1} size={124} stroke={10} color="#E3A92B" className="mx-auto md:mx-0">
            <span className="text-center leading-none"><span className="block font-display text-[40px] font-semibold text-cream">{p.level + 1}</span><span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-cream/70">{t('xp.level')}</span></span>
          </RingProgress>
          <div className="min-w-0 text-center md:text-left">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sun-300">{t('space.eyebrow')}</div>
            <h1 className="mt-1 font-display text-[30px] font-semibold leading-tight sm:text-[38px]">{profile?.name}</h1>
            <p className="mt-1 text-[15px] text-cream/85">
              <span className="font-semibold text-cream">{t(`levels.${p.level}.name`)}</span> · {t(`levels.${p.level}.body`)}
            </p>
            <div className="mx-auto mt-3 max-w-md md:mx-0">
              <div className="h-2.5 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-label={t('xp.label')} aria-valuemin={p.levelMin} aria-valuemax={p.nextMin ?? p.xp} aria-valuenow={p.xp}>
                <div className="h-full rounded-full bg-sun-500 transition-all" style={{ width: `${p.nextMin === null ? 100 : ((p.xp - p.levelMin) / (p.nextMin - p.levelMin)) * 100}%` }} />
              </div>
              <div className="mt-1.5 flex justify-between gap-3 text-xs text-cream/75">
                <span className="tabular-nums">{t('xp.total', { n: p.xp })}</span>
                <span>{p.nextMin === null ? t('xp.max') : t('xp.toNext', { n: toNext, name: t(`levels.${p.level + 1}.name`) })}</span>
              </div>
            </div>
          </div>
        </div>
        <dl className="relative grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-4">
          <HeroCell icon={<Flame size={16} aria-hidden="true" />} label={t('streak.label')} value={t('streak.days', { count: p.streak })} />
          <HeroCell icon={<Target size={16} aria-hidden="true" />} label={t('space.todayDone')} value={`${doneToday}/3`} />
          <HeroCell icon={<Star size={16} aria-hidden="true" />} label={t('xp.targets')} value={p.hits} />
          <HeroCell icon={<TrendingUp size={16} aria-hidden="true" />} label={t('space.activeDays')} value={p.activeDays} />
        </dl>
      </section>

      <nav aria-label={t('space.navLabel')} className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {(['defis', 'progression', 'regard', 'tous', 'historique'] as const).map((id) => (
          <a key={id} href={`#${id}`} className="chip min-h-[40px] shrink-0 px-3.5 text-[13px]">{t(`space.nav.${id}`)}</a>
        ))}
        <Link to="/app/joueur/parcours" className="chip min-h-[40px] shrink-0 border-forest-300 px-3.5 text-[13px] text-forest-700">{t('journey:playerCard.chip')}</Link>
      </nav>

      <JourneyCard />

      {/* the three challenges of the day */}
      <section className="mb-10" aria-labelledby="defis-h">
        <SectionHead id="defis" headingId="defis-h" eyebrow={fmtDate(today, lang, { weekday: 'long', day: 'numeric', month: 'long' })} title={t('space.dailyTitle')}>
          {t('space.dailyBody')}
        </SectionHead>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {daily.map((c, i) => <ChallengeCard key={c.id} challenge={c} daily index={i} todayBest={bests[c.id]} anchorId={`du-jour-${c.id}`} />)}
        </div>
        <p className="mt-3 text-xs text-ink-muted">{t('space.xpRule', { done: XP_DONE, target: XP_TARGET, daily: XP_DAILY })}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Care icon={<Droplets size={18} aria-hidden="true" />} title={t('care.waterTitle')} body={t('care.waterBody')} />
          <Care icon={<Moon size={18} aria-hidden="true" />} title={t('care.restTitle')} body={t('care.restBody')} />
        </div>
      </section>

      <ProgressSection logs={logs} today={today} p={p} />

      <SelfAssessment teamId={team?.id} name={profile?.name ?? ''} />

      {/* the whole library */}
      <section className="mb-10" aria-labelledby="tous-h">
        <SectionHead id="tous" headingId="tous-h" title={t('space.libraryTitle')}>{t('space.libraryBody', { n: CHALLENGES.length })}</SectionHead>
        <div className="mb-4">
          <Segmented value={kind} onChange={setKind}
            options={[{ id: 'all', label: t('kinds.all') }, ...CHALLENGE_KINDS.map((k) => ({ id: k, label: <><span className={cx('grid h-5 w-5 place-items-center rounded-full [&>svg]:h-3 [&>svg]:w-3', KIND_TONE[k])}>{KIND_ICON[k]}</span>{t(`kinds.${k}`)}</> }))]} />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {library.map((c) => <ChallengeCard key={c.id} challenge={c} compact todayBest={bests[c.id]} daily={daily.some((d) => d.id === c.id)} />)}
        </div>
      </section>

      <HistorySection logs={logs} onDeleted={(log) => toast({ text: t('history.deleted'), action: t('history.undo'), onAction: () => { db.challenges.put(log) } })} />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label={t('space.moreLabel')}>
        <Link to="/app/joueur/lecons" className="flex min-h-[88px] items-center gap-4 rounded-2xl border border-[#E8DCC2] bg-[#FFFBF1] p-4 shadow-card transition hover:border-terra-300">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-clay-500 text-cream"><BookOpen size={22} aria-hidden="true" /></span>
          <span><span className="block font-display text-lg font-semibold italic text-ink">{t('lessons.title')}</span><span className="block text-sm text-ink-muted">{t('space.lessonsHint')}</span></span>
        </Link>
        <Link to="/app/joueur/carnet" className="flex min-h-[88px] items-center gap-4 rounded-2xl border border-[#E8DCC2] bg-[#FFFBF1] p-4 shadow-card transition hover:border-terra-300">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-forest-600 text-cream"><NotebookPen size={22} aria-hidden="true" /></span>
          <span><span className="block font-display text-lg font-semibold italic text-ink">{t('notebook.title')}</span><span className="block text-sm text-ink-muted">{t('space.notebookHint')}</span></span>
        </Link>
      </section>
      {toastNode}
    </div>
  )
}

function HeroCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="bg-forest-700/60 px-4 py-3">
      <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-cream/65">{icon}{label}</dt>
      <dd className="mt-0.5 font-display text-xl font-semibold tabular-nums text-cream">{value}</dd>
    </div>
  )
}

function Care({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-line bg-paper p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E9EDF3] text-[#3D4F6B]">{icon}</span>
      <div><div className="text-sm font-semibold text-ink">{title}</div><p className="mt-0.5 text-sm text-ink-muted">{body}</p></div>
    </div>
  )
}

/* ---------------- progress charts ---------------- */

function ProgressSection({ logs, today, p }: { logs: ChallengeLog[]; today: string; p: Progress }) {
  const { t, lang } = useT('player')
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13))
  const bars = days.map((d) => ({ key: d, label: fmtDate(d, lang, { weekday: 'long', day: 'numeric', month: 'long' }), short: String(Number(d.slice(8, 10))), value: p.xpByDay[d] || 0, highlight: d === today }))
  const xp14 = bars.reduce((a, b) => a + b.value, 0)

  // challenges with results, most practised first
  const practised = useMemo(() => {
    const count = new Map<string, number>()
    p.results.forEach((r) => count.set(r.challengeId, (count.get(r.challengeId) || 0) + 1))
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => getChallenge(id)!).filter(Boolean)
  }, [p.results])
  const [pick, setPick] = useState('')
  const chosen = getChallenge(pick) ?? practised[0]
  const points = chosen ? p.results.filter((r) => r.challengeId === chosen.id).slice().reverse().slice(-12)
    .map((r) => ({ label: fmtDate(r.date, lang, { day: 'numeric', month: 'short' }), value: r.best })) : []
  const unit = chosen ? t(`units.${chosen.unit}`) : ''

  return (
    <section className="mb-10" aria-labelledby="progression-h">
      <SectionHead id="progression" headingId="progression-h" title={t('progress.title')}>{t('progress.body')}</SectionHead>
      {logs.length === 0 ? (
        <EmptyState icon={<TrendingUp size={34} />} title={t('progress.emptyTitle')} body={t('progress.emptyBody')}
          action={<a href="#defis" className="btn-primary min-h-[44px]">{t('progress.emptyCta')}</a>} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="card card-pad">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h3 className="font-display text-lg font-semibold text-ink">{t('progress.xpTitle')}</h3>
              <span className="text-sm tabular-nums text-ink-muted">{t('progress.xp14', { n: xp14 })}</span>
            </div>
            <DayBars data={bars} unit="XP" ariaLabel={t('progress.xpAria', { n: xp14 })} />
            <Legend items={[{ name: t('progress.legendDay'), color: '#1F4D3A' }, { name: t('progress.legendToday'), color: '#C5762F' }]} />
          </div>
          <div className="card card-pad">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-lg font-semibold text-ink">{t('progress.curveTitle')}</h3>
              <label className="sr-only" htmlFor="curve-pick">{t('progress.pick')}</label>
              <select id="curve-pick" className="input h-11 w-full max-w-[260px] py-0 text-sm sm:w-auto" value={chosen?.id ?? ''} onChange={(e) => setPick(e.target.value)}>
                {practised.map((c) => <option key={c.id} value={c.id}>{challengeText(c, lang).title}</option>)}
              </select>
            </div>
            {chosen && (
              <>
                <HistoryLine points={points} target={chosen.target} unit={unit} targetLabel={t('progress.target')}
                  ariaLabel={t('progress.curveAria', { title: challengeText(chosen, lang).title, values: points.map((x) => x.value).join(', ') })} />
                <p className="mt-1 text-xs text-ink-muted">
                  {chosen.better === 'lower' ? t('progress.lowerBetter') : t('progress.higherBetter')} · {t('progress.record', { n: p.bests[chosen.id], unit })}
                </p>
              </>
            )}
          </div>
          <div className="card card-pad lg:col-span-2">
            <h3 className="mb-3 font-display text-lg font-semibold text-ink">{t('progress.records')}</h3>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {practised.slice(0, 9).map((c) => {
                const best = p.bests[c.id]
                const hit = reached(c, best)
                return (
                  <li key={c.id} className="flex items-center gap-3 rounded-xl bg-cream/70 px-3 py-2">
                    <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-xl', KIND_TONE[c.kind])}>{KIND_ICON[c.kind]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{challengeText(c, lang).title}</span>
                      <span className="block text-xs text-ink-muted">{t('progress.targetIs', { n: c.target, unit: t(`units.${c.unit}`) })}</span>
                    </span>
                    <span className={cx('shrink-0 rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums', hit ? 'bg-sun-100 text-sun-700' : 'bg-sand text-ink-soft')}>
                      {best}{hit && <Star size={12} className="ml-1 inline -translate-y-px" aria-label={t('challenge.hit')} />}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </section>
  )
}

/* ---------------- self-assessment ---------------- */

function SelfAssessment({ teamId, name }: { teamId?: string; name: string }) {
  const { t, lang } = useT('player')
  const { self, setLevel } = useSelfAssessment()
  // If the coach has the same player in the team, show their view next to mine.
  const coachView = useLiveQuery(async () => {
    if (!teamId || !name) return null
    const key = name.trim().toLowerCase()
    const list = await db.players.where('teamId').equals(teamId).toArray()
    return list.find((pl) => pl.name.trim().toLowerCase() === key) ?? null
  }, [teamId, name], null as Player | null)
  const axes = SKILLS.map((k) => ({ key: k, label: t(`common:skills.${k}`) }))
  const series = [{ name: t('self.me'), color: '#1F4D3A', values: self.levels as Record<string, number | undefined> }]
  const coachHas = coachView && Object.keys(coachView.skills || {}).length > 0
  if (coachHas) series.push({ name: t('self.coach'), color: '#C5762F', values: coachView!.skills as Record<string, number | undefined> })
  const filled = SKILLS.filter((k) => self.levels[k]).length

  return (
    <section className="mb-10" aria-labelledby="regard-h">
      <SectionHead id="regard" headingId="regard-h" title={t('self.title')}>{t('self.body')}</SectionHead>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.25fr_1fr]">
        <div className="card card-pad">
          <ol className="mb-4 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-ink-muted sm:grid-cols-4" aria-label={t('self.scale')}>
            {LEVEL_VALUES.map((v) => <li key={v}><span className="mr-1 font-semibold text-ink">{v}</span>{t(`self.levels.${v}`)}</li>)}
          </ol>
          <ul className="divide-y divide-line/70">
            {SKILLS.map((k: SkillKey) => {
              const cur = self.levels[k]
              return (
                <li key={k} className="py-2.5">
                  <fieldset className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <legend className="sr-only">{t(`common:skills.${k}`)}</legend>
                    <div className="min-w-0 flex-1 basis-48">
                      <div className="text-[15px] font-semibold text-ink" aria-hidden="true">{t(`common:skills.${k}`)}</div>
                      <div className="text-xs text-ink-muted">{t(`skillHint.${k}`)}</div>
                    </div>
                    <div className="flex gap-1.5">
                      {LEVEL_VALUES.map((v) => (
                        <button key={v} type="button" onClick={() => setLevel(k, v)} aria-pressed={cur === v}
                          aria-label={`${t(`common:skills.${k}`)} : ${v}, ${t(`self.levels.${v}`)}`}
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
        <div className="card card-pad flex flex-col">
          <h3 className="font-display text-lg font-semibold text-ink">{t('self.radarTitle')}</h3>
          {filled === 0 && !coachHas ? (
            <p className="mt-2 text-sm text-ink-muted">{t('self.radarEmpty')}</p>
          ) : (
            <>
              <div className="mx-auto mt-2 w-full max-w-[420px]"><SkillRadar axes={axes} series={series} size={300} /></div>
              <Legend items={series.map((s) => ({ name: s.name, color: s.color }))} />
              {coachHas && <p className="mt-2 text-xs text-ink-muted">{t('self.coachNote')}</p>}
            </>
          )}
          <p className="mt-auto pt-3 text-xs text-ink-faint">
            {self.updatedAt ? t('self.updated', { date: fmtDate(self.updatedAt.slice(0, 10), lang, { day: 'numeric', month: 'long' }), n: filled }) : t('self.private')}
          </p>
        </div>
      </div>
    </section>
  )
}

/* ---------------- history ---------------- */

function HistorySection({ logs, onDeleted }: { logs: ChallengeLog[]; onDeleted: (log: ChallengeLog) => void }) {
  const { t, lang } = useT('player')
  const [all, setAll] = useState(false)
  const sorted = [...logs].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const recent = sorted.slice(0, all ? 60 : 8)
  if (!recent.length) return null
  return (
    <section className="mb-10" aria-labelledby="historique-h">
      <SectionHead id="historique" headingId="historique-h" title={t('history.title')}>{t('history.body')}</SectionHead>
      <ul className="card divide-y divide-line/70 overflow-hidden">
        {recent.map((l) => {
          const c = getChallenge(l.challengeId)
          if (!c) return null
          const hit = reached(c, l.value)
          return (
            <li key={l.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-xl', KIND_TONE[c.kind])}>{KIND_ICON[c.kind]}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{challengeText(c, lang).title}</span>
                <span className="block text-xs text-ink-muted">{fmtDate(l.date, lang, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
              </span>
              <span className={cx('shrink-0 text-sm font-semibold tabular-nums', hit ? 'text-sun-700' : 'text-ink-soft')}>{l.value} {t(`units.${c.unit}`)}</span>
              <button type="button" className="btn-ghost h-11 w-11 shrink-0 justify-center p-0 text-ink-faint hover:text-clay-600"
                aria-label={t('history.delete', { title: challengeText(c, lang).title })}
                onClick={async () => { await db.challenges.delete(l.id); onDeleted(l) }}>
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ul>
      {sorted.length > 8 && (
        <button type="button" className="btn-ghost btn-sm mt-2 min-h-[44px]" onClick={() => setAll((v) => !v)} aria-expanded={all}>
          {all ? t('history.less') : t('history.more', { count: Math.min(sorted.length, 60) - 8 })}
        </button>
      )}
      <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-faint"><History size={13} aria-hidden="true" />{t('history.note')}</p>
    </section>
  )
}
