// Home for players under 16 and for parents: the journey, today's challenge, XP and streak, the lesson
// of the day, the novel, the next match of the team and the notebook. (16 and over: PerformanceHome.)
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, CalendarDays, Check, ChevronRight, Flame, MapPin, NotebookPen, Star, Trophy } from 'lucide-react'
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
import ChallengeCard, { KIND_ICON, KIND_TONE } from './ChallengeCard'
import { RingProgress } from './Charts'
import { Greeting, HeroFigures } from './Greeting'
import { LessonCard } from './LessonCard'
import { BookImage, COVER_IMG } from './BookImage'
import { CreateTeamCard, LevelUpBanner, SectionHead } from './bits'
import { paperStyle } from './Paper'
import { useLevelUp, usePlayerData, useTeamCalendar } from './data'
import { useUnderstood } from './storage'
import { JourneyCard } from './JourneyCard'

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
      <Greeting name={profile?.name ?? ''} today={today} lines={lines}
        aside={
          <HeroFigures className="lg:w-[360px]" items={[
            { label: t('xp.label'), value: p.xp, icon: <Star size={14} strokeWidth={1.75} aria-hidden="true" /> },
            { label: t('streak.label'), value: t('streak.days', { count: p.streak }), icon: <Flame size={14} strokeWidth={1.75} aria-hidden="true" /> },
            { label: t('home.statDaily'), value: `${doneToday}/3`, icon: <Check size={14} strokeWidth={1.75} aria-hidden="true" /> },
          ]} />
        } />

      {parent && <div className="mb-6"><Callout tone="sun" title={t('parent.title')}>{t('parent.body')}</Callout></div>}
      {team && <JourneyCard />}

      <div className="grid grid-cols-1 gap-x-6 gap-y-10 lg:grid-cols-3">
        <section className="min-w-0 lg:col-span-2" aria-labelledby="hd-h">
          <SectionHead headingId="hd-h" title={t('home.challengeTitle')}
            action={<Link to="/app/joueur#defis" className="link text-[14.5px]">{t('home.allDaily')}</Link>} />
          <ChallengeCard challenge={daily[0]} daily todayBest={bests[daily[0].id]} anchorId="home-defi" />
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {daily.slice(1).map((c) => {
              const best = bests[c.id]
              const hit = best !== undefined && reachedTarget(c, best)
              return (
                <li key={c.id}>
                  <Link to={`/app/joueur#du-jour-${c.id}`} className="flex min-h-[64px] items-center gap-3 rounded-[14px] border border-line bg-paper px-3.5 py-2.5 transition hover:border-forest-300">
                    <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-full', best !== undefined ? (hit ? 'bg-sun-500 text-ink' : 'bg-forest-600 text-cream') : KIND_TONE[c.kind])} aria-hidden="true">
                      {best !== undefined ? <Check size={16} strokeWidth={2.5} /> : KIND_ICON[c.kind]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-ink">{challengeText(c, lang).title}</span>
                      <span className="block truncate text-[13px] text-ink-muted">{t('home.challengeMeta', { minutes: c.minutes, skill: t(`common:skills.${c.skill}`) })}{best !== undefined ? `, ${hit ? t('challenge.hit').toLowerCase() : t('challenge.done').toLowerCase()}` : ''}</span>
                    </span>
                    <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-ink-faint" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="flex flex-col rounded-[22px] border border-line bg-paper p-5 sm:p-6" aria-labelledby="prog-h">
          <h2 id="prog-h" className="text-[20px] leading-tight text-ink">{t('home.progressTitle')}</h2>
          <div className="mt-4 flex items-center gap-4">
            <RingProgress value={p.xp - p.levelMin} max={(p.nextMin ?? p.xp) - p.levelMin || 1} size={88} stroke={7}>
              <span className="text-center leading-none"><span className="block font-display text-[28px] text-forest-600">{p.level + 1}</span><span className="mt-0.5 block text-[11.5px] font-semibold text-ink-muted">{t('xp.level')}</span></span>
            </RingProgress>
            <div className="min-w-0">
              <div className="text-[17px] font-semibold leading-tight text-ink">{t(`levels.${p.level}.name`)}</div>
              <div className="mt-0.5 text-[13.5px] text-ink-muted">{p.nextMin === null ? t('xp.max') : t('xp.toNext', { n: toNext, name: t(`levels.${p.level + 1}.name`) })}</div>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-3 gap-x-3">
            <div className="min-w-0 border-l-2 border-line pl-2.5"><dt className="truncate text-[12.5px] text-ink-muted">{t('streak.current')}</dt><dd className="font-display text-[22px] tabular-nums text-terra-600">{p.streak}</dd></div>
            <div className="min-w-0 border-l-2 border-line pl-2.5"><dt className="truncate text-[12.5px] text-ink-muted">{t('xp.targets')}</dt><dd className="font-display text-[22px] tabular-nums text-ink">{p.hits}</dd></div>
            <div className="min-w-0 border-l-2 border-line pl-2.5"><dt className="truncate text-[12.5px] text-ink-muted">{t('home.lessonsDone')}</dt><dd className="font-display text-[22px] tabular-nums text-forest-600">{understood.length}/40</dd></div>
          </dl>
          <WeekDots today={today} xpByDay={p.xpByDay} />
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink-muted">{p.streakToday || p.streak === 0 ? t('streak.hintStart') : t('streak.hintKeep')}</p>
          <div className="mt-auto pt-5"><Link to="/app/joueur" className="btn-primary min-h-[44px] w-full justify-center">{t('home.mySpace')}</Link></div>
        </section>

        <section className="min-w-0 lg:col-span-2" aria-labelledby="lesson-h">
          <SectionHead headingId="lesson-h" title={t('home.lessonTitle')} action={<Link to={`/app/joueur/lecons#lecon-${lesson.no}`} className="link text-[14.5px]">{t('home.allLessons')}</Link>} />
          <LessonCard lesson={lesson} variant="home" />
        </section>

        <div className="flex flex-col gap-5 lg:pt-[60px]">
          <NovelCard lessonNo={lesson.no} />
          {next && (
            <Link to={`/app/matchs/${next.id}`} className="block rounded-[22px] bg-terra-600 p-5 text-cream transition hover:bg-terra-700 sm:p-6">
              <div className="flex items-center justify-between">
                <span className="text-[13.5px] font-semibold text-cream/80">{t('match.eyebrow')}</span>
                <Trophy size={18} strokeWidth={1.75} aria-hidden="true" className="text-cream/80" />
              </div>
              <div className="mt-2 text-[22px] leading-tight" style={{ fontStretch: '116%', fontWeight: 780 }}>{t('match.againstTeam', { opponent: next.opponent })}</div>
              <div className="mt-2.5 flex items-center gap-2 text-[14px] text-cream/90"><CalendarDays size={15} strokeWidth={1.75} aria-hidden="true" /><span className="first-letter:uppercase">{fmtDate(next.date, lang, { weekday: 'long', day: 'numeric', month: 'long' })}{next.time ? `, ${next.time}` : ''}</span></div>
              {next.venue && <div className="mt-1 flex items-center gap-2 text-[14px] text-cream/90"><MapPin size={15} strokeWidth={1.75} aria-hidden="true" />{next.venue}</div>}
              <p className="mt-4 border-t border-white/20 pt-3 text-[14px] font-medium text-cream">{t('home.ritualLine', { when: daysBetween(today, next.date) === 0 ? t('match.today').toLowerCase() : t('match.inDays', { count: daysBetween(today, next.date) }) })}</p>
            </Link>
          )}
          {!team && cal !== null && <CreateTeamCard compact />}
          <Link to="/app/joueur/carnet" className="block overflow-hidden rounded-[18px] border border-line transition hover:border-terra-300" style={paperStyle(false)}>
            <div className="p-5">
              <div className="flex items-center gap-2 text-[13.5px] font-semibold text-terra-700"><NotebookPen size={15} strokeWidth={1.75} aria-hidden="true" />{t('notebook.short')}</div>
              {lastEntry ? (
                <>
                  <div className="mt-2 text-[19px] italic leading-snug text-ink" style={{ fontWeight: 700 }}>{lastEntry.title}</div>
                  <p className="mt-1 line-clamp-2 text-[14px] text-ink-muted">{lastEntry.text}</p>
                  <div className="mt-2 text-[12.5px] text-ink-muted">{fmtDate(lastEntry.date, lang, { day: 'numeric', month: 'long' })}</div>
                </>
              ) : (
                <>
                  <div className="mt-2 text-[19px] italic leading-snug text-ink" style={{ fontWeight: 700 }}>{t('home.notebookEmpty')}</div>
                  <p className="mt-1 text-[14px] text-ink-muted">{t('home.notebookEmptyBody')}</p>
                </>
              )}
            </div>
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
    <div className="mt-5">
      <div className="mb-2 text-[13px] font-semibold text-ink-soft">{t('home.last7')}</div>
      <ol className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const xp = xpByDay[d] || 0
          const isToday = d === today
          return (
            <li key={d} className="flex flex-col items-center gap-1">
              <span className={cx('grid h-8 w-8 place-items-center rounded-full border text-[11px] font-semibold tabular-nums',
                xp ? 'border-forest-600 bg-forest-600 text-cream' : isToday ? 'border-forest-500 bg-paper text-forest-600' : 'border-line bg-cream text-ink-faint')}
                title={`${fmtDate(d, lang, { weekday: 'long', day: 'numeric' })}: ${xp} XP`}>
                {xp ? <Check size={14} aria-label={`${xp} XP`} /> : <span className="sr-only">0 XP</span>}
              </span>
              <span className={cx('text-[11.5px]', isToday ? 'font-bold text-forest-600' : 'text-ink-muted')} aria-hidden="true">{fmtDate(d, lang, { weekday: 'narrow' })}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** The novel: the cover when the painting is there, a text-only card otherwise. */
export function NovelCard({ lessonNo, className }: { lessonNo?: number; className?: string }) {
  const { t, lang } = useT('player')
  const title = BOOKS.tome1.title[lang]
  const fallback = (
    <div className="flex aspect-[2/3] w-full flex-col justify-between rounded-lg bg-terra-600 p-3 text-cream">
      <span className="text-[12px] font-semibold text-cream/80">{SERIES.name}</span>
      <span className="text-[15px] italic leading-tight" style={{ fontWeight: 700 }}>{SERIES.tomes[0].title}</span>
      <span className="text-[11px] text-cream/75">{BRAND.author}</span>
    </div>
  )
  return (
    <section className={cx('overflow-hidden rounded-[22px] border border-line bg-paper', className)} aria-labelledby="novel-h">
      <div className="flex gap-4 p-5">
        <a href={BOOKS.tome1.href} className="block w-[96px] shrink-0 sm:w-[108px]" aria-label={t('novel.open', { title })}>
          <BookImage src={COVER_IMG} alt={t('novel.coverAlt', { title })} width={1200} height={1800} className="aspect-[2/3] w-full rounded-lg object-cover" fallback={fallback} />
        </a>
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold text-terra-700">{t('novel.eyebrow')}</p>
          <h2 id="novel-h" className="mt-1 text-[18px] leading-tight text-ink">{title}</h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-muted">{t('novel.body', { heroes: SERIES.heroes })}</p>
          <div className="mt-3 flex flex-col items-start gap-1">
            <a href={BOOKS.tome1.href} className="btn-primary btn-sm min-h-[44px] px-4"><BookOpen size={15} strokeWidth={1.75} aria-hidden="true" />{t('novel.read')}</a>
            {lessonNo && <a href={chapterHref(lessonNo)} className="inline-flex min-h-[44px] items-center text-[14px] font-medium text-forest-600 hover:underline">{t('novel.chapterOfDay', { n: lessonNo })}</a>}
          </div>
        </div>
      </div>
    </section>
  )
}
