import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, CheckCircle2, ChevronDown, CreditCard, Sparkles, X } from 'lucide-react'
import { AI_ANALYSIS, PLANS, type PlanDef } from '../../lib/config'
import { db } from '../../lib/db'
import { useDocumentTitle } from '../../lib/hooks'
import { useSession } from '../../lib/session'
import type { Plan, Profile } from '../../lib/types'
import { cx, fcfa, money } from '../../lib/util'
import { PageFrame, useInApp, useSiteT } from './components/brand'

type Cycle = 'month' | 'year'
const ANNUAL_MONTHS = 10 // annual price = 10 months (2 months free)
const FAQ = ['books', 'data', 'ai', 'cancel', 'federation', 'pay'] as const

export default function Pricing() {
  const { t, lang } = useSiteT()
  useDocumentTitle(t('pricing.docTitle'))
  const { profile } = useSession()
  const inApp = useInApp()
  const [cycle, setCycle] = useState<Cycle>('month')
  const [done, setDone] = useState<Plan | null>(null)

  useEffect(() => {
    if (!done) return
    const id = window.setTimeout(() => setDone(null), 8000)
    return () => window.clearTimeout(id)
  }, [done])

  const activate = async (plan: Plan) => {
    await db.profile.update('me', { plan })
    setDone(plan)
  }

  return (
    <PageFrame>
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <h1 className={cx('text-balance text-ink', inApp ? 'text-[30px] sm:text-[40px]' : 'text-[38px] sm:text-[52px]')}>{t('pricing.title')}</h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-ink-muted sm:text-[17px]">{t('pricing.subtitle')}</p>
        </div>
        <div className="inline-flex shrink-0 self-start rounded-full border border-line bg-paper p-1 lg:self-auto" role="group" aria-label={t('pricing.billing')}>
          {(['month', 'year'] as const).map((c) => (
            <button key={c} type="button" onClick={() => setCycle(c)} aria-pressed={cycle === c}
              className={cx('inline-flex min-h-[42px] items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition-colors sm:px-5', cycle === c ? 'bg-ink text-cream' : 'text-ink-muted hover:text-ink')}>
              {c === 'month' ? t('pricing.monthly') : t('pricing.annual')}
              {c === 'year' && <span className={cx('rounded-full px-2 py-0.5 text-[11.5px] font-semibold', cycle === 'year' ? 'bg-sun-500 text-ink' : 'bg-sun-100 text-ink')}>{t('pricing.annualHint')}</span>}
            </button>
          ))}
        </div>
      </header>

      <div className="mt-8 flex items-start gap-3 rounded-card bg-sand px-4 py-3.5 sm:px-5">
        <CreditCard size={19} strokeWidth={1.75} className="mt-0.5 shrink-0 text-ink-soft" aria-hidden="true" />
        <p className="text-[14.5px] leading-relaxed text-ink-soft"><span className="font-semibold text-ink">{t('pricing.payments.title')}.</span> {t('pricing.payments.body')}</p>
      </div>

      {/* one grouped table of plans: hairlines between columns, the recommended plan on pitch green */}
      <div className={cx('mt-8 grid gap-px overflow-hidden rounded-panel border border-line bg-line md:grid-cols-2', inApp ? COLS.app.grid : COLS.site.grid)}>
        {PLANS.map((p, i) => <PlanCard key={p.id} plan={p} cycle={cycle} profile={profile} onActivate={activate} wide={i === PLANS.length - 1} cols={inApp ? COLS.app : COLS.site} />)}
      </div>

      {/* the AI reading of a match: sold per match, on top of any plan */}
      <section className="mt-6 grid gap-4 rounded-panel border border-line bg-paper p-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-6" aria-labelledby="ai-addon-h">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sun-50 text-sun-700"><Sparkles size={22} strokeWidth={1.75} aria-hidden="true" /></span>
        <div className="min-w-0">
          <h2 id="ai-addon-h" className="text-[20px] leading-tight text-ink sm:text-[22px]">{t('pricing.ai.title')}</h2>
          <p className="mt-1.5 max-w-3xl text-[14.5px] leading-relaxed text-ink-muted">{t('pricing.ai.body')}</p>
        </div>
        <div className="sm:text-right">
          <div className="font-display text-[30px] leading-none tabular-nums text-ink">{money(AI_ANALYSIS.usdPerMatch, lang)}</div>
          <div className="mt-1 text-[13px] text-ink-muted">{t('pricing.ai.unit', { v: fcfa(AI_ANALYSIS.usdPerMatch, lang) })}</div>
        </div>
      </section>

      <section className="mt-20 grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16" aria-labelledby="faq-title">
        <h2 id="faq-title" className="text-[28px] leading-tight text-ink sm:text-[34px]">{t('pricing.faqTitle')}</h2>
        <div className="divide-y divide-line border-y border-line">
          {FAQ.map((k) => (
            <details key={k} className="group">
              <summary className="flex min-h-[60px] cursor-pointer list-none items-center justify-between gap-4 py-4 text-[16px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
                {t(`pricing.faq.${k}.q`)}
                <ChevronDown size={18} strokeWidth={1.75} className="shrink-0 text-ink-muted transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="max-w-2xl pb-5 text-[15px] leading-relaxed text-ink-muted">{t(`pricing.faq.${k}.a`)}</p>
            </details>
          ))}
        </div>
      </section>

      {done && (
        <div role="status" className={cx('surface-dark fixed inset-x-4 z-50 mx-auto flex max-w-md items-start gap-3 rounded-card bg-night-800 px-4 py-3.5 text-cream shadow-lift', inApp ? 'bottom-24 lg:bottom-6' : 'bottom-6')}>
          <CheckCircle2 size={20} strokeWidth={1.75} className="mt-0.5 shrink-0 text-sun-300" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-[14.5px]">{t('pricing.activated', { plan: t(`common:plans.${done}`) })}</p>
            {!inApp && <Link to="/app" className="mt-1.5 inline-flex min-h-[32px] items-center text-[14px] font-semibold text-sun-300 underline decoration-sun-300/40 underline-offset-4">{t('pricing.goApp')}</Link>}
          </div>
          <button type="button" onClick={() => setDone(null)} className="-mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-cream/70 hover:bg-white/10 hover:text-cream" aria-label={t('common:actions.close')}><X size={17} strokeWidth={1.75} /></button>
        </div>
      )}
    </PageFrame>
  )
}

/** Five columns side by side only when there is room: from xl on the site, from 2xl inside the app (the sidebar takes 264 px). */
const COLS = {
  site: { grid: 'xl:grid-cols-5 xl:grid-rows-[auto_auto_auto_auto_1fr_auto] xl:gap-y-0', card: 'xl:row-span-6 xl:grid xl:grid-rows-subgrid xl:gap-y-0 xl:p-5', wide: 'md:col-span-2 xl:col-span-1', spacer: 'hidden h-5 xl:block', title: 'xl:mt-1', price: 'xl:text-[30px]' },
  app: { grid: '2xl:grid-cols-5 2xl:grid-rows-[auto_auto_auto_auto_1fr_auto] 2xl:gap-y-0', card: '2xl:row-span-6 2xl:grid 2xl:grid-rows-subgrid 2xl:gap-y-0 2xl:p-5', wide: 'md:col-span-2 2xl:col-span-1', spacer: 'hidden h-5 2xl:block', title: '2xl:mt-1', price: '2xl:text-[30px]' },
}
type Cols = typeof COLS.site

function PlanCard({ plan, cycle, profile, onActivate, wide = false, cols }: { plan: PlanDef; cycle: Cycle; profile: Profile | null; onActivate: (p: Plan) => void; wide?: boolean; cols: Cols }) {
  const { t, lang } = useSiteT()
  // a few plan features read better on this page with their audience (site:pricing.feature.*); the rest come from common
  const featureLabel = (f: string) => { const k = `pricing.feature.${f}`; const v = t(k); return v === k ? t(`common:plans.features.${f}`) : v }
  const hl = !!plan.highlight
  const current = profile?.plan === plan.id
  const usd = plan.usdMonth

  let big: string, unit = '', sub: string
  if (usd === null) { big = t('pricing.onQuote'); sub = t('pricing.onQuoteHint') }
  else if (usd === 0) { big = money(0, lang); sub = t('pricing.freeForever') }
  else if (cycle === 'month') { big = money(usd, lang); unit = t('pricing.perMonth'); sub = t('pricing.approxMonth', { v: fcfa(usd, lang) }) }
  else {
    const year = Math.round(usd * ANNUAL_MONTHS * 100) / 100
    big = money(year, lang); unit = t('pricing.perYear')
    sub = `${t('pricing.annualEq', { v: money(Math.round((year / 12) * 100) / 100, lang) })}, ${t('pricing.approxYear', { v: fcfa(year, lang) })}`
  }

  return (
    <article className={cx('flex flex-col p-5 sm:p-6', cols.card, wide && cols.wide, hl ? 'surface-dark bg-forest-800 text-cream' : 'bg-paper')}>
      {hl ? <p className="text-[13px] font-semibold leading-5 text-sun-300">{t('pricing.recommended')}</p> : <div aria-hidden="true" className={cols.spacer} />}
      <h2 className={cx('text-[20px] leading-tight', hl ? 'mt-1 text-cream' : cx('text-ink', cols.title))}>{t(`common:plans.${plan.id}`)}</h2>
      <p className={cx('mt-2 text-[14px] leading-snug', hl ? 'text-cream/70' : 'text-ink-muted')}>{t(`pricing.desc.${plan.id}`)}</p>

      <div className={cx('mt-5 border-t pt-5', hl ? 'border-white/15' : 'border-line')}>
        <div className="flex flex-wrap items-baseline gap-x-1.5">
          <span className={cx('num font-display leading-none', usd === null ? 'text-[26px]' : cx('text-[34px]', cols.price), hl ? 'text-cream' : 'text-ink')}>{big}</span>
          {unit && <span className={cx('text-[13px] font-medium', hl ? 'text-cream/70' : 'text-ink-muted')}>{unit}</span>}
        </div>
        <p className={cx('mt-2 text-[12.5px] leading-snug', hl ? 'text-cream/60' : 'text-ink-muted')}>{sub}</p>
      </div>

      <ul className="mt-5 flex-1 space-y-2.5 self-start">
        {plan.features.map((f) => (
          <li key={f} className={cx('flex items-start gap-2 text-[14px] leading-snug', hl ? 'text-cream/90' : 'text-ink-soft')}>
            <Check size={16} strokeWidth={2.4} className={cx('mt-0.5 shrink-0', hl ? 'text-sun-300' : 'text-forest-500')} aria-hidden="true" />
            {featureLabel(f)}
          </li>
        ))}
      </ul>

      <div className="mt-7">
        {profile ? (
          current ? (
            <span className={cx('btn w-full cursor-default border', hl ? 'border-white/25 text-cream' : 'border-forest-100 bg-forest-50 text-forest-700')}>
              <CheckCircle2 size={16} strokeWidth={1.75} />{t('pricing.current')}
            </span>
          ) : (
            <button type="button" onClick={() => onActivate(plan.id)} className={cx('w-full', hl ? 'btn-sun' : 'btn-outline')}>{t('pricing.activate')}</button>
          )
        ) : (
          <Link to="/bienvenue" className={cx('w-full', hl ? 'btn-sun' : 'btn-outline')}>{t('pricing.start')}</Link>
        )}
      </div>
    </article>
  )
}
