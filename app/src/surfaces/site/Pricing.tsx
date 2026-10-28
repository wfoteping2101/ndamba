import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, CheckCircle2, ChevronDown, CreditCard, Sparkles, X } from 'lucide-react'
import { PLANS, type PlanDef } from '../../lib/config'
import { db } from '../../lib/db'
import { useDocumentTitle } from '../../lib/hooks'
import { useSession } from '../../lib/session'
import type { Plan, Profile } from '../../lib/types'
import { cx, fcfa, money } from '../../lib/util'
import { PageFrame, useInApp, useSiteT } from './components/brand'

type Cycle = 'month' | 'year'
const ANNUAL_MONTHS = 10 // annual price = 10 months (2 months free)
const FAQ = ['books', 'data', 'cancel', 'federation', 'pay'] as const

export default function Pricing() {
  const { t } = useSiteT()
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
      <header className="mx-auto max-w-3xl text-center">
        <p className="eyebrow">{t('pricing.eyebrow')}</p>
        <h1 className="mt-2 text-[34px] font-semibold leading-[1.08] text-ink sm:text-[46px]">{t('pricing.title')}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-[16px] leading-relaxed text-ink-muted sm:text-[17px]">{t('pricing.subtitle')}</p>
        <div className="mt-7 inline-flex rounded-full border border-line bg-paper p-1 shadow-card" role="group" aria-label={t('pricing.billing')}>
          {(['month', 'year'] as const).map((c) => (
            <button key={c} type="button" onClick={() => setCycle(c)} aria-pressed={cycle === c}
              className={cx('inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 text-[14px] font-semibold transition', cycle === c ? 'bg-forest-600 text-cream' : 'text-ink-muted hover:text-ink')}>
              {c === 'month' ? t('pricing.monthly') : t('pricing.annual')}
              {c === 'year' && <span className={cx('rounded-full px-2 py-0.5 text-[11px] font-bold', cycle === 'year' ? 'bg-sun-300 text-ink' : 'bg-sun-50 text-sun-700')}>{t('pricing.annualHint')}</span>}
            </button>
          ))}
        </div>
      </header>

      <div className="mx-auto mt-8 flex max-w-3xl items-start gap-3 rounded-2xl border border-sun-300 bg-sun-50 px-4 py-3.5 sm:px-5">
        <CreditCard size={20} className="mt-0.5 shrink-0 text-sun-700" />
        <div>
          <p className="text-[15px] font-semibold text-ink">{t('pricing.payments.title')}</p>
          <p className="mt-0.5 text-[14.5px] text-ink-soft">{t('pricing.payments.body')}</p>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-4">
        {PLANS.map((p) => <PlanCard key={p.id} plan={p} cycle={cycle} profile={profile} onActivate={activate} />)}
      </div>

      <section className="mx-auto mt-16 max-w-3xl" aria-labelledby="faq-title">
        <h2 id="faq-title" className="text-[26px] font-semibold text-ink sm:text-[30px]">{t('pricing.faqTitle')}</h2>
        <div className="mt-5 divide-y divide-line overflow-hidden rounded-[24px] border border-line bg-paper shadow-card">
          {FAQ.map((k) => (
            <details key={k} className="group">
              <summary className="flex min-h-[60px] cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[16px] font-semibold text-ink hover:bg-sand/40 sm:px-6 [&::-webkit-details-marker]:hidden">
                {t(`pricing.faq.${k}.q`)}
                <ChevronDown size={18} className="shrink-0 text-ink-muted transition group-open:rotate-180 motion-reduce:transition-none" />
              </summary>
              <p className="px-5 pb-5 text-[15px] leading-relaxed text-ink-muted sm:px-6">{t(`pricing.faq.${k}.a`)}</p>
            </details>
          ))}
        </div>
      </section>

      {done && (
        <div role="status" className={cx('fixed inset-x-4 z-50 mx-auto flex max-w-md items-start gap-3 rounded-2xl bg-night-800 px-4 py-3.5 text-cream shadow-lift', inApp ? 'bottom-24 lg:bottom-6' : 'bottom-6')}>
          <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-sun-300" />
          <div className="min-w-0 flex-1">
            <p className="text-[14.5px]">{t('pricing.activated', { plan: t(`common:plans.${done}`) })}</p>
            {!inApp && <Link to="/app" className="mt-1.5 inline-flex min-h-[32px] items-center gap-1 text-[14px] font-semibold text-sun-300 hover:underline">{t('pricing.goApp')}<ArrowRight size={15} /></Link>}
          </div>
          <button type="button" onClick={() => setDone(null)} className="-mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-cream/70 hover:bg-white/10 hover:text-cream" aria-label={t('common:actions.close')}><X size={17} /></button>
        </div>
      )}
    </PageFrame>
  )
}

function PlanCard({ plan, cycle, profile, onActivate }: { plan: PlanDef; cycle: Cycle; profile: Profile | null; onActivate: (p: Plan) => void }) {
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
    <article className={cx('relative flex w-full flex-col rounded-[24px] p-5 sm:w-[calc((100%-1rem)/2)] sm:p-6 lg:w-[calc((100%-2rem)/3)] xl:w-[calc((100%-4rem)/5)] xl:p-5',
      hl ? 'bg-forest-700 text-cream shadow-lift ring-2 ring-sun-300/70' : 'border border-line bg-paper shadow-card')}>
      {hl && (
        <span className="absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full bg-sun-300 px-2.5 py-1 text-[11px] font-bold text-ink">
          <Sparkles size={12} />{t('pricing.recommended')}
        </span>
      )}
      <h2 className={cx('font-display text-[21px] font-semibold leading-tight', hl ? 'text-cream' : 'text-ink')}>{t(`common:plans.${plan.id}`)}</h2>
      <p className={cx('mt-1 text-[14px] leading-snug xl:min-h-[60px]', hl ? 'text-cream/70' : 'text-ink-muted')}>{t(`pricing.desc.${plan.id}`)}</p>

      <div className="mt-5">
        <div className="flex flex-wrap items-baseline gap-x-1.5">
          <span className={cx('font-display font-semibold leading-none tabular-nums tracking-tight', usd === null ? 'text-[26px]' : 'text-[32px]', hl ? 'text-cream' : 'text-ink')}>{big}</span>
          {unit && <span className={cx('text-[13px] font-medium', hl ? 'text-cream/70' : 'text-ink-muted')}>{unit}</span>}
        </div>
        <p className={cx('mt-2 text-[12.5px] leading-snug xl:min-h-[54px]', hl ? 'text-cream/60' : 'text-ink-faint')}>{sub}</p>
      </div>

      <ul className="mt-5 flex-1 space-y-2.5">
        {plan.features.map((f) => (
          <li key={f} className={cx('flex items-start gap-2 text-[14px] leading-snug', hl ? 'text-cream/90' : 'text-ink-soft')}>
            <Check size={16} strokeWidth={2.6} className={cx('mt-0.5 shrink-0', hl ? 'text-sun-300' : 'text-forest-500')} />
            {featureLabel(f)}
          </li>
        ))}
      </ul>

      <div className="mt-6">
        {profile ? (
          current ? (
            <span className={cx('btn w-full min-h-[44px] cursor-default border', hl ? 'border-white/25 text-cream' : 'border-forest-100 bg-forest-50 text-forest-700')}>
              <CheckCircle2 size={16} />{t('pricing.current')}
            </span>
          ) : (
            <button type="button" onClick={() => onActivate(plan.id)} className={cx('w-full min-h-[44px]', hl ? 'btn-sun' : 'btn-outline')}>{t('pricing.activate')}</button>
          )
        ) : (
          <Link to="/bienvenue" className={cx('w-full min-h-[44px]', hl ? 'btn-sun' : 'btn-outline')}>{t('pricing.start')}</Link>
        )}
      </div>
    </article>
  )
}
