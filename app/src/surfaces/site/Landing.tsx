import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  ArrowRight, BookOpen, CalendarDays, ClipboardList, Dumbbell, Eye, FileChartColumn, Flag, GraduationCap, LineChart, Network,
  NotebookPen, Radio, Route, ShieldCheck, Shirt, Sparkles, Tags, Target, Users, Video, type LucideIcon,
} from 'lucide-react'
import { BOOKS, BRAND, PLANS, SERIES } from '../../lib/config'
import { useDocumentTitle } from '../../lib/hooks'
import { cx, fcfa, money } from '../../lib/util'
import type { Role } from '../../lib/types'
import { LogoMark, Tabs } from '../../ui'
import BookCover from './components/BookCover'
import HeroPitch from './components/HeroPitch'
import IndiceTeaser from './components/IndiceTeaser'
import MolaChat from './components/MolaChat'
import NjangiCircle from './components/NjangiCircle'
import PagneBand from './components/PagneBand'
import SeriesShelf from './components/SeriesShelf'
import { JourneyVisual, PathVisual, TagVisual, WeekVisual } from './components/FeatureVisuals'
import { DemoChoice, GoldLabel, useDemo, useSiteT } from './components/brand'

type Demo = ReturnType<typeof useDemo>

export default function Landing() {
  const { lang } = useSiteT()
  useDocumentTitle(BRAND.tagline[lang])
  useHashScroll()
  const demo = useDemo()
  return (
    <div>
      <Hero demo={demo} />
      <PagneBand height={10} />
      <Pillars />
      <Features demo={demo} />
      <LiveSection demo={demo} />
      <NjangiSection />
      <MolaSection demo={demo} />
      <Companions />
      <Roadmap />
      <PricingTeaser />
      <FinalCta />
      {demo.dialog}
    </div>
  )
}

/** The site nav links to /#app and /#mola: scroll there when the hash changes. */
function useHashScroll() {
  const { hash } = useLocation()
  const first = useRef(true)
  useEffect(() => {
    const initial = first.current
    first.current = false
    if (!hash) return
    const id = decodeURIComponent(hash.slice(1))
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    // arriving from another page: jump; a nav click on this page: glide
    const behavior: ScrollBehavior = initial || reduced ? 'auto' : 'smooth'
    const timer = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior, block: 'start' }), initial ? 120 : 40)
    return () => window.clearTimeout(timer)
  }, [hash])
}

function SectionHead({ eyebrow, title, lead, dark = false, className }: { eyebrow: string; title: string; lead?: ReactNode; dark?: boolean; className?: string }) {
  return (
    <div className={cx('max-w-3xl', className)}>
      <p className={cx('eyebrow', dark && 'text-sun-300')}>{eyebrow}</p>
      <h2 className={cx('mt-2 text-balance text-[30px] font-semibold leading-[1.1] sm:text-[42px]', dark ? 'text-cream' : 'text-ink')}>{title}</h2>
      {lead && <p className={cx('mt-4 text-[16px] leading-relaxed sm:text-[17px]', dark ? 'text-cream/70' : 'text-ink-muted')}>{lead}</p>}
    </div>
  )
}

/* ---------------- hero ---------------- */

const AUDIENCES = ['players', 'coaches', 'analysts', 'clubs'] as const

function Hero({ demo }: { demo: Demo }) {
  const { t, lang } = useSiteT()
  return (
    <section className="relative isolate overflow-hidden bg-forest-800 text-cream">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(900px_520px_at_88%_-8%,rgba(227,169,43,0.20),transparent_62%),radial-gradient(760px_480px_at_-8%_108%,rgba(197,118,47,0.26),transparent_60%)]" />
      <div className="container-page grid grid-cols-1 items-center gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] lg:gap-14 lg:py-20">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-bold uppercase tracking-[0.2em]">
            <span className="text-sun-300">{BRAND.name}</span>
            <span aria-hidden="true" className="text-cream/30">·</span>
            <span className="text-cream/75">{BRAND.tagline[lang]}</span>
          </p>
          <h1 className="mt-4 text-balance text-[34px] font-semibold leading-[1.06] tracking-tight sm:text-[48px] lg:text-[54px]">{t('landing.hero.title')}</h1>
          <p className="mt-5 font-display text-[19px] italic leading-snug text-sun-100 sm:text-[21px]">{t('quote', { text: BRAND.motto[lang] })}</p>
          <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-cream/75 sm:text-[17px]">{t('landing.hero.lead')}</p>
          <ul className="mt-5 flex flex-wrap gap-2" aria-label={t('landing.hero.forWho')}>
            {AUDIENCES.map((a) => (
              <li key={a}><a href="#app" className="inline-flex min-h-[36px] items-center rounded-full border border-cream/20 bg-white/[0.06] px-3.5 text-[13.5px] font-semibold text-cream/90 hover:bg-white/10">{t(`landing.features.tabs.${a}`)}</a></li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link to="/bienvenue" className="btn-sun btn-lg"><Sparkles size={18} />{t('landing.hero.ctaStart')}</Link>
          </div>
          <p className="mt-6 text-[12px] font-bold uppercase tracking-[0.16em] text-cream/55">{t('landing.hero.demoTitle')}</p>
          <DemoChoice demo={demo} dark quiet className="mt-3" />
          <p className="mt-4 max-w-xl text-[13px] leading-relaxed text-cream/55">
            {t('landing.hero.demoNote')}{' '}
            <button type="button" onClick={() => demo.launch('player', '/app/joueur', 'pro')} disabled={demo.busy}
              className="inline-flex min-h-[32px] items-center gap-1 font-semibold text-cream/85 underline decoration-cream/30 underline-offset-4 hover:text-cream">
              {t('landing.hero.ctaPlayer')}<ArrowRight size={14} />
            </button>
          </p>
        </div>
        <div className="min-w-0">
          <div className="rounded-[28px] bg-forest-900/60 p-3 ring-1 ring-white/10 sm:p-5">
            <HeroPitch />
          </div>
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-sun-300/25 bg-white/[0.04] px-4 py-3.5">
            <Flag size={18} className="mt-0.5 shrink-0 text-sun-300" aria-hidden="true" />
            <p className="text-[14.5px] leading-snug text-cream/85"><span className="font-semibold text-sun-300">{t('landing.hero.mantraLabel')}</span> {BRAND.mantra[lang]}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- train, observe, follow ---------------- */

function Pillars() {
  const { t } = useSiteT()
  const items: [string, LucideIcon][] = [['train', Dumbbell], ['observe', Eye], ['follow', Route]]
  return (
    <section className="container-page py-14 sm:py-20" aria-labelledby="pillars-title">
      <h2 id="pillars-title" className="sr-only">{t('landing.pillars.title')}</h2>
      <ol className="grid gap-4 sm:grid-cols-3 sm:gap-5">
        {items.map(([k, Icon], i) => (
          <li key={k} className="relative overflow-hidden rounded-[24px] border border-line bg-paper p-5 shadow-card sm:p-6">
            <span aria-hidden="true" className="absolute right-5 top-3 font-display text-[60px] font-semibold leading-none text-sand">{i + 1}</span>
            <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-forest-600 text-cream"><Icon size={21} /></span>
            <h3 className="relative mt-4 font-display text-[24px] font-semibold leading-tight text-ink">{t(`landing.pillars.${k}.title`)}</h3>
            <p className="relative mt-2 text-[15px] leading-relaxed text-ink-muted">{t(`landing.pillars.${k}.body`)}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

/* ---------------- features by audience ---------------- */

type Aud = typeof AUDIENCES[number]
const AUD: Record<Aud, { items: [string, LucideIcon][]; Visual: ComponentType; role: Role; to: string }> = {
  players: { items: [['journey', Route], ['skills', LineChart], ['challenges', Target], ['lessons', NotebookPen]], Visual: JourneyVisual, role: 'player', to: '/app/joueur' },
  coaches: { items: [['drills', Dumbbell], ['builder', ClipboardList], ['week', CalendarDays], ['match', Shirt]], Visual: WeekVisual, role: 'coach', to: '/app/semaine' },
  analysts: { items: [['live', Radio], ['report', FileChartColumn], ['video', Video], ['codes', Tags]], Visual: TagVisual, role: 'coach', to: '/app/analyse' },
  clubs: { items: [['model', Network], ['teams', Users], ['education', GraduationCap], ['plan2030', Flag]], Visual: PathVisual, role: 'coach', to: '/app' },
}

function Features({ demo }: { demo: Demo }) {
  const { t } = useSiteT()
  const [aud, setAud] = useState<Aud>('coaches')
  const cur = AUD[aud]
  const Visual = cur.Visual
  return (
    <section id="app" className="scroll-mt-20 border-y border-line bg-sand/40 py-16 sm:py-24">
      <div className="container-page">
        <SectionHead eyebrow={t('landing.features.eyebrow')} title={t('landing.features.title')} lead={t('landing.features.lead')} />
        <Tabs className="mt-8 w-full sm:w-fit" value={aud} onChange={setAud}
          tabs={AUDIENCES.map((id) => ({ id, label: t(`landing.features.tabs.${id}`) }))} />
        <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-12" role="tabpanel" aria-label={t(`landing.features.tabs.${aud}`)}>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-terra-600">{t(`landing.features.who.${aud}`)}</p>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {cur.items.map(([k, Icon]) => (
                <li key={k} className="rounded-2xl border border-line bg-paper p-5">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-forest-50 text-forest-600"><Icon size={20} /></span>
                  <h3 className="mt-3 font-display text-[18px] font-semibold leading-snug text-ink">{t(`landing.features.items.${k}.title`)}</h3>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-ink-muted">{t(`landing.features.items.${k}.body`)}</p>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[13px] font-semibold text-ink-muted">{t('landing.features.open')}</p>
            <DemoChoice demo={demo} role={cur.role} to={cur.to} className="mt-2.5" />
          </div>
          <div className="min-w-0"><Visual /></div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- the Indice Njangi ---------------- */

function LiveSection({ demo }: { demo: Demo }) {
  const { t } = useSiteT()
  return (
    <section className="bg-night-800 py-16 text-cream sm:py-24">
      <div className="container-page">
        <SectionHead dark eyebrow={t('landing.live.eyebrow')} title={t('landing.live.title')} lead={t('landing.live.lead')} />
        <div className="mt-10"><IndiceTeaser /></div>
        <p className="mt-10 flex items-center gap-2 text-[15px] font-semibold text-cream"><FileChartColumn size={18} className="text-sun-300" aria-hidden="true" />{t('landing.live.cta')}</p>
        <DemoChoice demo={demo} to="/app/analyse/rapport/ma_past" dark className="mt-3" />
      </div>
    </section>
  )
}

/* ---------------- the njangi ---------------- */

function NjangiSection() {
  const { t } = useSiteT()
  const points = ['give', 'circulate', 'receive'] as const
  return (
    <section className="container-page py-16 sm:py-24">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <SectionHead eyebrow={t('landing.njangi.eyebrow')} title={t('landing.njangi.title')} />
          <p className="prose-n mt-5">{t('landing.njangi.p1')}</p>
          <p className="mt-5 border-l-4 border-sun-500 pl-4 font-display text-[21px] italic leading-snug text-ink">{t('landing.njangi.p2')}</p>
          <p className="prose-n mt-5">{t('landing.njangi.p3')}</p>
        </div>
        <div className="rounded-[32px] border border-line bg-paper p-4 shadow-card sm:p-8">
          <NjangiCircle />
        </div>
      </div>
      <ol className="mt-12 grid gap-4 sm:grid-cols-3">
        {points.map((k, i) => (
          <li key={k} className="rounded-2xl border border-line bg-paper p-5">
            <span className="font-display text-[28px] font-semibold leading-none text-terra-500">{i + 1}</span>
            <h3 className="mt-3 font-display text-lg font-semibold text-ink">{t(`landing.njangi.points.${k}.title`)}</h3>
            <p className="mt-1 text-[15px] leading-relaxed text-ink-muted">{t(`landing.njangi.points.${k}.body`)}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

/* ---------------- Mola ---------------- */

function MolaSection({ demo }: { demo: Demo }) {
  const { t } = useSiteT()
  const asks = ['a', 'b', 'c', 'd', 'e'] as const
  return (
    <section id="mola" className="scroll-mt-20 border-t border-line py-16 sm:py-24">
      <div className="container-page grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <SectionHead eyebrow={t('landing.mola.eyebrow')} title={t('landing.mola.title')} />
          <p className="prose-n mt-5">{t('landing.mola.p1')}</p>
          <p className="mt-5 flex items-start gap-3 rounded-2xl border border-forest-100 bg-forest-50 px-4 py-3 text-[15px] text-forest-800">
            <ShieldCheck size={20} className="mt-0.5 shrink-0 text-forest-600" />{t('landing.mola.p2')}
          </p>
          <h3 className="mt-8 font-sans text-[12px] font-bold uppercase tracking-[0.14em] text-ink-muted">{t('landing.mola.can')}</h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {asks.map((k) => (
              <li key={k} className="rounded-2xl border border-line bg-paper px-3.5 py-2 text-[14px] leading-snug text-ink-soft">{t('quote', { text: t(`landing.mola.asks.${k}`) })}</li>
            ))}
          </ul>
          <Link to="/bienvenue" className="btn-primary btn-lg mt-8"><Sparkles size={18} />{t('landing.mola.cta')}</Link>
        </div>
        <MolaChat onOpen={() => demo.launch('coach', '/app/semaine', 'pro')} />
      </div>
    </section>
  )
}

/* ---------------- the two companion books ---------------- */

function Companions() {
  const { t, lang } = useSiteT()
  return (
    <section id="livres" className="scroll-mt-20 border-y border-line bg-sand/50 py-16 sm:py-24">
      <div className="container-page">
        <SectionHead eyebrow={t('landing.companions.eyebrow')} title={t('landing.companions.title')} lead={t('landing.companions.lead')} />

        {/* the coaching book */}
        <article className="mt-10 flex flex-col gap-6 rounded-[28px] border border-line bg-paper p-5 shadow-card sm:flex-row sm:items-center sm:p-8 lg:gap-10">
          <a href={BOOKS.methode.href} className="block w-[136px] shrink-0 rounded-[4px_10px_10px_4px] sm:w-[176px]" aria-label={t('shelf.readLabel', { title: BOOKS.methode.title[lang] })}>
            <BookCover book="methode" sizes="176px" />
          </a>
          <div className="min-w-0">
            <GoldLabel>{t('landing.companions.methode.label')}</GoldLabel>
            <h3 className="mt-1.5 font-display text-[28px] font-semibold leading-tight text-ink sm:text-[32px]">{BOOKS.methode.title[lang]}</h3>
            <p className="mt-1 font-display text-[16px] italic leading-snug text-ink-soft">{BOOKS.methode.subtitle[lang]}</p>
            <p className="mt-3 text-[13.5px] font-semibold text-terra-600">{t('landing.companions.methode.audience')}</p>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-muted">{t('landing.companions.methode.body')}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a href={BOOKS.methode.href} className="btn-primary min-h-[44px]"><BookOpen size={16} />{t('landing.companions.read')}</a>
            </div>
          </div>
        </article>

        {/* the children's saga */}
        <div className="mt-6 rounded-[28px] border border-line bg-paper p-5 shadow-card sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <GoldLabel>{t('landing.companions.series.label')}</GoldLabel>
              <h3 className="mt-1.5 font-display text-[36px] font-semibold uppercase leading-none tracking-[0.1em] text-ink sm:text-[44px]">{SERIES.name}</h3>
              <p className="mt-3 text-[15px] font-semibold text-ink-soft">
                {t('landing.companions.series.heroes')}<span className="font-normal text-ink-muted"> · {t('landing.companions.series.meta')}</span>
              </p>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">{t('landing.companions.series.body')}</p>
            </div>
            <Link to="/livres" className="btn-outline min-h-[44px] shrink-0 self-start sm:self-auto">{t('landing.companions.all')}<ArrowRight size={16} /></Link>
          </div>
          <SeriesShelf className="mt-8" />
        </div>
      </div>
    </section>
  )
}

/* ---------------- 2030 / 2034 ---------------- */

function Roadmap() {
  const { t } = useSiteT()
  const steps = ['a', 'b', 'c', 'd'] as const
  return (
    <section className="relative isolate overflow-hidden bg-forest-700 py-16 text-cream sm:py-20">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(700px_380px_at_100%_100%,rgba(227,169,43,0.18),transparent_65%)]" />
      <div className="container-page">
        <SectionHead dark eyebrow={t('landing.roadmap.eyebrow')} title={t('landing.roadmap.title')} lead={t('landing.roadmap.lead')} />
        <ol className="relative mt-12 grid gap-8 border-l border-cream/20 pl-6 sm:grid-cols-2 sm:border-l-0 sm:pl-0 lg:grid-cols-4 lg:gap-6">
          <span aria-hidden="true" className="absolute left-0 right-0 top-[7px] hidden h-px bg-cream/20 lg:block" />
          {steps.map((s, i) => (
            <li key={s} className="relative">
              <span aria-hidden="true" className={cx('absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 sm:hidden', i === steps.length - 1 ? 'border-sun-300 bg-sun-300' : 'border-cream/60 bg-forest-700')} />
              <span aria-hidden="true" className={cx('hidden h-3.5 w-3.5 rounded-full border-2 lg:block', i === steps.length - 1 ? 'border-sun-300 bg-sun-300' : 'border-cream/60 bg-forest-700')} />
              <div className="font-display text-[34px] font-semibold leading-none text-sun-300 lg:mt-5 lg:text-[38px]">{t(`landing.roadmap.steps.${s}.year`)}</div>
              <div className="mt-2 text-[16px] font-semibold text-cream">{t(`landing.roadmap.steps.${s}.title`)}</div>
              <p className="mt-1 text-[15px] leading-relaxed text-cream/70">{t(`landing.roadmap.steps.${s}.body`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ---------------- pricing teaser ---------------- */

function PricingTeaser() {
  const { t, lang } = useSiteT()
  const paid = PLANS.map((p) => p.usdMonth).filter((v): v is number => typeof v === 'number' && v > 0)
  const from = paid.length ? Math.min(...paid) : 0
  return (
    <section className="container-page py-16 sm:py-20">
      <div className="flex flex-col gap-6 rounded-[28px] border border-line bg-paper p-6 shadow-card sm:p-10 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow">{t('landing.pricing.eyebrow')}</p>
          <h2 className="mt-2 text-[28px] font-semibold leading-tight text-ink sm:text-[36px]">{t('landing.pricing.title')}</h2>
          <p className="mt-3 text-[16px] leading-relaxed text-ink-muted">{t('landing.pricing.body', { price: money(from, lang), fcfa: fcfa(from, lang) })}</p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {PLANS.map((p) => <li key={p.id} className={cx('chip', p.highlight && 'border-forest-600 text-forest-700')}>{t(`common:plans.${p.id}`)}</li>)}
          </ul>
        </div>
        <Link to="/premium" className="btn-primary btn-lg shrink-0 self-start lg:self-auto">{t('landing.pricing.cta')}<ArrowRight size={18} /></Link>
      </div>
    </section>
  )
}

/* ---------------- final call ---------------- */

function FinalCta() {
  const { t, lang } = useSiteT()
  return (
    <section className="container-page">
      <div className="relative isolate overflow-hidden rounded-[32px] bg-forest-800 text-cream">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(640px_340px_at_50%_120%,rgba(227,169,43,0.22),transparent_70%)]" />
        <div className="px-6 py-14 text-center sm:px-10 sm:py-20">
          <LogoMark size={52} className="mx-auto" />
          <h2 className="mx-auto mt-6 max-w-3xl text-balance text-[30px] font-semibold leading-[1.12] sm:text-[44px]">{t('quote', { text: BRAND.motto[lang] })}</h2>
          <p className="mx-auto mt-4 max-w-xl text-[16px] text-cream/75">{t('landing.final.body')}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/bienvenue" className="btn-sun btn-lg"><Sparkles size={18} />{t('landing.hero.ctaStart')}</Link>
            <Link to="/livres" className="btn btn-lg border border-cream/30 text-cream hover:bg-white/10"><BookOpen size={18} />{t('landing.final.secondary')}</Link>
          </div>
        </div>
      </div>
    </section>
  )
}
