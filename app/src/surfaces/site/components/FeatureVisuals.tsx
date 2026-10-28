import type { SkillKey } from '../../../lib/types'
import { cx, fmtDate } from '../../../lib/util'
import { fmtNjangi } from '../../../lib/njangi'
import { useSiteT } from './brand'

/* Small, static pictures of the app for the features section. Not interactive. */

/** Players, from kids to pros: one player's journey (fictional, the pro demo's number 8), skills now and a season ago. */
const JOURNEY: { k: SkillKey; then: number; now: number }[] = [
  { k: 'scan', then: 2.5, now: 3.5 }, { k: 'controle', then: 3, now: 3.5 }, { k: 'passe', then: 3, now: 4 }, { k: 'contre-pression', then: 2, now: 3 }, { k: 'decision', then: 2.5, now: 3.5 },
]
const PATH_STEPS = ['u13', 'u15', 'u17', 'u19', 'pro'] as const

export function JourneyVisual() {
  const { t } = useSiteT()
  return (
    <figure className="overflow-hidden rounded-3xl border border-line bg-paper shadow-card" aria-label={t('landing.features.visual.journeyTitle')}>
      <div className="flex items-center gap-3 border-b border-line bg-sand/50 px-5 py-3.5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-forest-600 font-display text-[18px] font-semibold text-cream">8</span>
        <div className="min-w-0">
          <figcaption className="truncate font-display text-[18px] font-semibold leading-tight text-ink">{t('landing.features.visual.journeyTitle')}</figcaption>
          <div className="truncate text-[13px] text-ink-muted">{t('landing.features.visual.journeyRole')}</div>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-4 text-[12px] font-semibold text-ink-muted">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-forest-300" />{t('landing.features.visual.journeyThen')}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-forest-600" />{t('landing.features.visual.journeyNow')}</span>
        </div>
        <ul className="mt-3 space-y-2.5">
          {JOURNEY.map((s) => (
            <li key={s.k} className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
              <span className="truncate text-[13.5px] text-ink-soft">{t(`common:skills.${s.k}`)}</span>
              <span role="img" className="relative block h-3 rounded-full bg-sand" aria-label={t('landing.features.visual.journeyBar', { then: s.then, now: s.now })}>
                <span className="absolute inset-y-0 left-0 rounded-full bg-forest-600" style={{ width: `${(s.now / 4) * 100}%` }} />
                <span className="absolute inset-y-0 left-0 rounded-full bg-forest-300" style={{ width: `${(s.then / 4) * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
        <ol className="mt-5 flex items-center gap-1 overflow-hidden" aria-label={t('landing.features.visual.journeyPath')}>
          {PATH_STEPS.map((p, i) => (
            <li key={p} className="flex min-w-0 flex-1 items-center gap-1">
              <span className={cx('min-w-0 flex-1 truncate rounded-lg px-1.5 py-1.5 text-center text-[11.5px] font-bold', i === PATH_STEPS.length - 1 ? 'bg-sun-500 text-ink' : 'bg-forest-50 text-forest-700')}>{t(`landing.features.visual.journeyStep.${p}`)}</span>
            </li>
          ))}
        </ol>
      </div>
    </figure>
  )
}

const WEEK: { md: 'MD-4' | 'MD-3' | 'MD-2' | 'MD-1' | 'match'; date: string; load: number }[] = [
  // a reference week (Tuesday to Saturday) only used for weekday names
  { md: 'MD-4', date: '2026-10-27', load: 0.82 },
  { md: 'MD-3', date: '2026-10-28', load: 1 },
  { md: 'MD-2', date: '2026-10-29', load: 0.58 },
  { md: 'MD-1', date: '2026-10-30', load: 0.32 },
  { md: 'match', date: '2026-10-31', load: 1 },
]

/** Coaches: the periodised week before Saturday's match. */
export function WeekVisual() {
  const { t, lang } = useSiteT()
  return (
    <figure className="rounded-3xl border border-line bg-paper p-5 shadow-card" aria-label={t('landing.features.visual.weekTitle')}>
      <figcaption className="font-display text-lg font-semibold text-ink">{t('landing.features.visual.weekTitle')}</figcaption>
      <div className="mt-1 text-xs font-medium text-ink-muted">{t('landing.features.visual.load')}</div>
      <ol className="mt-3 grid grid-cols-5 gap-2">
        {WEEK.map((d) => {
          const match = d.md === 'match'
          const mdLabel = match ? '' : String(t(`common:md.${d.md}`)).split('·')[1]?.trim()
          return (
            <li key={d.md} className="flex min-w-0 flex-col">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{fmtDate(d.date, lang, { weekday: 'short' }).replace('.', '')}</span>
              <div className="mt-1.5 flex h-28 items-end rounded-xl bg-sand/70 p-1">
                <div className={cx('w-full rounded-lg', match ? 'bg-sun-500' : 'bg-forest-600')} style={{ height: `${Math.round(d.load * 100)}%`, opacity: match ? 1 : 0.45 + d.load * 0.55 }} />
              </div>
              <span className={cx('mt-2 text-[13px] font-bold', match ? 'text-sun-700' : 'text-forest-600')}>{match ? t('landing.features.visual.matchDay') : d.md}</span>
              <span className={cx('text-[11.5px] leading-tight text-ink-muted sm:text-[12px]', match && 'hidden sm:block')}>{match ? t('landing.features.visual.opponent') : mdLabel}</span>
              {!match && <span className="mt-1 hidden text-[12px] leading-snug text-ink-soft sm:block">{t(`landing.features.visual.sessions.${d.md}`)}</span>}
            </li>
          )
        })}
      </ol>
    </figure>
  )
}

const PAD: { code: string; n: number; tone?: 'loss' | 'hot' }[] = [
  { code: 'PASS_OK', n: 131 }, { code: 'PROG', n: 22 }, { code: 'LINE', n: 13, tone: 'hot' }, { code: 'FINAL3', n: 19 }, { code: 'BOX', n: 8 },
  { code: 'FIX2', n: 5 }, { code: 'SWITCH', n: 3 }, { code: 'REGAIN5', n: 12 }, { code: 'LOSS', n: 15, tone: 'loss' }, { code: 'SHOT', n: 7 },
]

/** Analysts: the live tagging pad, as it looks at the touchline. */
export function TagVisual() {
  const { t, lang } = useSiteT()
  return (
    <figure className="rounded-3xl bg-night-800 p-4 text-cream shadow-lift sm:p-5" aria-label={t('landing.features.visual.tagTitle')}>
      <div className="flex items-center justify-between gap-3">
        <figcaption className="font-display text-lg font-semibold">{t('landing.features.visual.tagTitle')}</figcaption>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-clay-500/20 px-2.5 py-1 text-xs font-semibold text-clay-100">
          <span className="h-1.5 w-1.5 rounded-full bg-clay-300 motion-safe:animate-pulse" />{t('landing.features.visual.tagHalf')} · 23:41
        </span>
      </div>
      <div className="mt-3 flex items-center justify-center gap-4 rounded-2xl bg-white/[0.05] py-2.5 text-sm font-semibold">
        <span>{t('landing.features.visual.us')}</span>
        <span className="font-display text-2xl tabular-nums">1<span className="mx-2 text-cream/35">:</span>0</span>
        <span className="text-cream/70">{t('landing.features.visual.them')}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3" aria-hidden="true">
        {PAD.map((p) => (
          <div key={p.code} className={cx('flex min-h-[48px] items-center justify-between gap-2 rounded-xl border px-3 py-2 text-[13px] font-semibold',
            p.tone === 'loss' ? 'border-clay-300/30 bg-clay-500/15 text-clay-100' : p.tone === 'hot' ? 'border-sun-300/70 bg-sun-500/20 text-sun-100 ring-2 ring-sun-300/40' : 'border-white/10 bg-white/[0.06]')}>
            <span className="min-w-0 truncate">{t(`common:events.${p.code}`)}</span>
            <span className="shrink-0 tabular-nums text-cream/55">{p.n}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className="text-xs font-semibold text-cream/70">{t('landing.features.visual.tagIndex')}</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[68.4%] rounded-full bg-sun-300" /></div>
        <span className="font-display text-xl tabular-nums">{fmtNjangi(68.4, lang)}</span>
      </div>
    </figure>
  )
}

/** Clubs and federations: one game model from grassroots to the first team. */
export function PathVisual() {
  const { t } = useSiteT()
  const steps = ['a', 'b', 'c', 'd', 'e'] as const
  return (
    <figure className="rounded-3xl border border-line bg-paper p-5 shadow-card">
      <figcaption className="font-display text-lg font-semibold text-ink">{t('landing.features.visual.pathTitle')}</figcaption>
      <ol className="relative mt-4 space-y-4 pl-8">
        <span aria-hidden="true" className="absolute bottom-3 left-[11px] top-3 w-[2px] rounded bg-gradient-to-b from-forest-300 via-terra-300 to-sun-500" />
        {steps.map((s, i) => (
          <li key={s} className="relative">
            <span aria-hidden="true" className={cx('absolute -left-8 top-0.5 grid h-6 w-6 place-items-center rounded-full border-2 text-[11px] font-bold',
              i === steps.length - 1 ? 'border-sun-500 bg-sun-500 text-ink' : 'border-forest-600 bg-paper text-forest-600')}>{i + 1}</span>
            <div className="text-[13px] font-bold uppercase tracking-wide text-forest-600">{t(`landing.features.visual.path.${s}`)}</div>
            <div className="text-[15px] text-ink-soft">{t(`landing.features.visual.path.${s}T`)}</div>
          </li>
        ))}
      </ol>
    </figure>
  )
}
