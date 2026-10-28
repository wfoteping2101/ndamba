// Home for players and parents: today's challenge, XP and streak, the lesson of the day,
// the novel, the next match of the team and the notebook.
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, CalendarDays, Check, Flame, MapPin, NotebookPen, Star, Trophy } from 'lucide-react'
import { Callout } from '../../../ui'
import { useT } from '../../../i18n'
import { db } from '../../../lib/db'
import { useDocumentTitle, useLiveQuery } from '../../../lib/hooks'
import { useSession } from '../../../lib/session'
import { BOOKS, BRAND, SERIES } from '../../../lib/config'
import { addDays, cx, daysBetween, fmtDate } from '../../../lib/util'
import type { NotebookEntry } from '../../../lib/types'
import { allLessons, chapterHref, lessonOfDay } from '../lessons'
import { challengeText, reached as reachedTarget } from '../challenges'
import ChallengeCard from './ChallengeCard'
import { RingProgress } from './Charts'
import { Greeting } from './Greeting'
import { LessonCard } from './LessonCard'
import { BookImage, COVER_IMG } from './BookImage'
import { CreateTeamCard, LevelUpBanner, SectionHead } from './bits'
import { useLevelUp, usePlayerData, useTeamCalendar } from './data'
import { useUnderstood } from './storage'

export default function PlayerHome() {
  const { t, lang } = useT('player')
  useDocumentTitle(t('home.docTitle'))
  const { profile, team } = useSession()
  const { progress: p, bests, daily, loading, today } = usePlayerData()
  const levelUp = useLevelUp(p.level, loading)
  const { understood } = useUnderstood()
  const lessons = useMemo(() => allLessons(lang), [lang])
  const lesson = lessonOfDay(lessons, today)
  const cal = useTeamCalendar(team)
  const next = cal?.matches.find((m) => m.status !== 'done' && m.date >= today)
  const lastEntry = useLiveQuery(async () => (await db.notebook.orderBy('date').reverse().first()) ?? null, [], null as NotebookEntry | null)
  const parent = profile?.role === 'parent'

  const lines = [
    { label: t('greeting.motto'), text: BRAND.motto[lang] },
    { label: t('greeting.lesson', { n: lesson.no }), text: `${lesson.title}. ${lesson.lines[0] ?? ''}`.trim(), to: `/app/joueur/lecons#lecon-${lesson.no}` },
    { label: t('greeting.mantra'), text: BRAND.mantra[lang] },
  ]
  const toNext = p.nextMin === null ? 0 : p.nextMin - p.xp
  const doneToday = daily.filter((c) => bests[c.id] !== undefined).length

  return (
    <div>
      <LevelUpBanner level={levelUp.reached} onClose={levelUp.dismiss} />
      <Greeting name={profile?.name ?? ''} today={today} lines={lines} tone="night"
        aside={
          <div className="grid grid-cols-3 gap-2 text-center lg:w-[340px]">
            <HeroStat icon={<Star size={15} aria-hidden="true" />} label={t('xp.label')} value={p.xp} />
            <HeroStat icon={<Flame size={15} aria-hidden="true" />} label={t('streak.label')} value={t('streak.days', { count: p.streak })} />
            <HeroStat icon={<Check size={15} aria-hidden="true" />} label={t('home.statDaily')} value={`${doneToday}/3`} />
          </div>
        } />

      {parent && <div className="mb-5"><Callout tone="sun" title={t('parent.title')}>{t('parent.body')}</Callout></div>}

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
        <section className="lg:col-span-2" aria-labelledby="hd-h">
          <SectionHead headingId="hd-h" title={t('home.challengeTitle')}
            action={<Link to="/app/joueur#defis" className="link text-sm">{t('home.allDaily')}</Link>} />
          <ChallengeCard challenge={daily[0]} daily index={0} todayBest={bests[daily[0].id]} anchorId="home-defi" />
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {daily.slice(1).map((c, i) => {
              const best = bests[c.id]
              const hit = best !== undefined && reachedTarget(c, best)
              return (
                <li key={c.id}>
                  <Link to={`/app/joueur#du-jour-${c.id}`} className="flex min-h-[56px] items-center gap-3 rounded-2xl border border-line bg-paper px-3 py-2 transition hover:border-forest-300">
                    <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold', best !== undefined ? (hit ? 'bg-sun-500 text-ink' : 'bg-forest-600 text-cream') : 'bg-sand text-ink-soft')}>
                      {best !== undefined ? <Check size={15} aria-label={t('challenge.done')} /> : i + 2}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{challengeText(c, lang).title}</span>
                      <span className="block text-xs text-ink-muted">{t('challenge.minutes', { n: c.minutes })} · {t(`common:skills.${c.skill}`)}</span>
                    </span>
                    <ArrowRight size={16} aria-hidden="true" className="shrink-0 text-ink-faint" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="card card-pad flex flex-col" aria-labelledby="prog-h">
          <h2 id="prog-h" className="font-display text-lg font-semibold text-ink">{t('home.progressTitle')}</h2>
          <div className="mt-3 flex items-center gap-4">
            <RingProgress value={p.xp - p.levelMin} max={(p.nextMin ?? p.xp) - p.levelMin || 1} size={88} stroke={8}>
              <span className="text-center leading-none"><span className="block font-display text-2xl font-semibold text-forest-600">{p.level + 1}</span><span className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">{t('xp.level')}</span></span>
            </RingProgress>
            <div className="min-w-0">
              <div className="font-display text-lg font-semibold leading-tight text-ink">{t(`levels.${p.level}.name`)}</div>
              <div className="text-sm text-ink-muted">{p.nextMin === null ? t('xp.max') : t('xp.toNext', { n: toNext, name: t(`levels.${p.level + 1}.name`) })}</div>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-sand/60 px-1 py-2"><dt className="text-[11px] text-ink-muted">{t('streak.current')}</dt><dd className="font-display text-lg font-semibold tabular-nums text-terra-600">{p.streak}</dd></div>
            <div className="rounded-xl bg-sand/60 px-1 py-2"><dt className="text-[11px] text-ink-muted">{t('xp.targets')}</dt><dd className="font-display text-lg font-semibold tabular-nums text-sun-700">{p.hits}</dd></div>
            <div className="rounded-xl bg-sand/60 px-1 py-2"><dt className="text-[11px] text-ink-muted">{t('home.lessonsDone')}</dt><dd className="font-display text-lg font-semibold tabular-nums text-forest-600">{understood.length}/40</dd></div>
          </dl>
          <WeekDots today={today} xpByDay={p.xpByDay} />
          <p className="mt-3 text-xs text-ink-muted">{p.streakToday || p.streak === 0 ? t('streak.hintStart') : t('streak.hintKeep')}</p>
          <div className="mt-auto pt-4"><Link to="/app/joueur" className="btn-primary min-h-[44px] w-full justify-center">{t('home.mySpace')}<ArrowRight size={16} aria-hidden="true" /></Link></div>
        </section>

        <section className="lg:col-span-2" aria-labelledby="lesson-h">
          <SectionHead headingId="lesson-h" title={t('home.lessonTitle')} action={<Link to={`/app/joueur/lecons#lecon-${lesson.no}`} className="link text-sm">{t('home.allLessons')}</Link>} />
          <LessonCard lesson={lesson} variant="home" />
        </section>

        <div className="flex flex-col gap-4 sm:gap-5">
          <NovelCard lessonNo={lesson.no} />
          {next && (
            <Link to={`/app/matchs/${next.id}`} className="block rounded-2xl bg-forest-600 p-4 text-cream shadow-card transition hover:bg-forest-700 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sun-300">{t('match.eyebrow')}</span>
                <Trophy size={18} aria-hidden="true" className="text-sun-300" />
              </div>
              <div className="mt-2 font-display text-xl font-semibold leading-tight">{t('match.against')} {next.opponent}</div>
              <div className="mt-1.5 flex items-center gap-2 text-sm text-cream/80"><CalendarDays size={15} aria-hidden="true" />{fmtDate(next.date, lang, { weekday: 'long', day: 'numeric', month: 'long' })}{next.time ? `, ${next.time}` : ''}</div>
              {next.venue && <div className="mt-1 flex items-center gap-2 text-sm text-cream/80"><MapPin size={15} aria-hidden="true" />{next.venue}</div>}
              <div className="mt-3 text-sm font-semibold text-sun-300">{daysBetween(today, next.date) === 0 ? t('match.today') : t('match.inDays', { count: daysBetween(today, next.date) })} · {t('home.ritual')}</div>
            </Link>
          )}
          {!team && cal !== null && <CreateTeamCard compact />}
          <Link to="/app/joueur/carnet" className="block rounded-2xl border border-[#E8DCC2] bg-[#FFFBF1] p-4 shadow-card transition hover:border-terra-300 sm:p-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-terra-600"><NotebookPen size={14} aria-hidden="true" />{t('notebook.short')}</div>
            {lastEntry ? (
              <>
                <div className="mt-1.5 font-display text-lg font-semibold italic leading-snug text-ink">{lastEntry.title}</div>
                <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{lastEntry.text}</p>
                <div className="mt-2 text-xs text-ink-faint">{fmtDate(lastEntry.date, lang, { day: 'numeric', month: 'long' })}</div>
              </>
            ) : (
              <>
                <div className="mt-1.5 font-display text-lg font-semibold italic leading-snug text-ink">{t('home.notebookEmpty')}</div>
                <p className="mt-1 text-sm text-ink-muted">{t('home.notebookEmptyBody')}</p>
              </>
            )}
          </Link>
        </div>
      </div>
    </div>
  )
}

/** The last seven days: a filled dot for each day with at least one challenge. */
function WeekDots({ today, xpByDay }: { today: string; xpByDay: Record<string, number> }) {
  const { t, lang } = useT('player')
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
  return (
    <div className="mt-4">
      <div className="mb-1.5 text-xs font-semibold text-ink-muted">{t('home.last7')}</div>
      <ol className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const xp = xpByDay[d] || 0
          const isToday = d === today
          return (
            <li key={d} className="flex flex-col items-center gap-1">
              <span className={cx('grid h-8 w-8 place-items-center rounded-full border text-[11px] font-semibold tabular-nums',
                xp ? 'border-forest-600 bg-forest-600 text-cream' : isToday ? 'border-dashed border-forest-500 text-forest-600' : 'border-line bg-cream text-ink-faint')}
                title={`${fmtDate(d, lang, { weekday: 'long', day: 'numeric' })}: ${xp} XP`}>
                {xp ? <Check size={14} aria-label={`${xp} XP`} /> : <span className="sr-only">0 XP</span>}
              </span>
              <span className={cx('text-[10.5px] uppercase', isToday ? 'font-bold text-forest-600' : 'text-ink-faint')} aria-hidden="true">{fmtDate(d, lang, { weekday: 'narrow' })}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function HeroStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/10 px-2 py-2.5">
      <div className="flex items-center justify-center gap-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-cream/65">{icon}<span className="truncate">{label}</span></div>
      <div className="mt-0.5 font-display text-xl font-semibold tabular-nums text-cream">{value}</div>
    </div>
  )
}

/** The novel: the cover when the painting is there, a text-only card otherwise. */
export function NovelCard({ lessonNo, className }: { lessonNo?: number; className?: string }) {
  const { t, lang } = useT('player')
  const title = BOOKS.tome1.title[lang]
  const fallback = (
    <div className="flex aspect-[2/3] w-full flex-col justify-between rounded-xl border border-line bg-cream p-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-terra-600">{SERIES.name}</span>
      <span className="font-display text-[15px] font-semibold italic leading-tight text-ink">{SERIES.tomes[0].title}</span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{BRAND.author}</span>
    </div>
  )
  return (
    <section className={cx('card overflow-hidden', className)} aria-labelledby="novel-h">
      <div className="flex gap-4 p-4 sm:p-5">
        <a href={BOOKS.tome1.href} className="block w-[96px] shrink-0 sm:w-[108px]" aria-label={t('novel.open', { title })}>
          <BookImage src={COVER_IMG} alt={t('novel.coverAlt', { title })} width={1200} height={1800} className="aspect-[2/3] w-full rounded-xl object-cover shadow-card" fallback={fallback} />
        </a>
        <div className="min-w-0">
          <div className="eyebrow">{t('novel.eyebrow')}</div>
          <h2 id="novel-h" className="mt-0.5 font-display text-lg font-semibold leading-tight text-ink">{title}</h2>
          <p className="mt-1 text-sm text-ink-muted">{t('novel.body', { heroes: SERIES.heroes })}</p>
          <div className="mt-3 flex flex-col items-start gap-1">
            <a href={BOOKS.tome1.href} className="btn-primary btn-sm min-h-[44px]"><BookOpen size={15} aria-hidden="true" />{t('novel.read')}</a>
            {lessonNo && <a href={chapterHref(lessonNo)} className="inline-flex min-h-[44px] items-center text-sm font-medium text-forest-600 hover:underline">{t('novel.chapterOfDay', { n: lessonNo })}</a>}
          </div>
        </div>
      </div>
    </section>
  )
}
