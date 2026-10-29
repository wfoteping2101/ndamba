import { useState, type ComponentType, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, CalendarDays, Gamepad2, ClipboardList, Dumbbell, FileChartColumn, Flag, GraduationCap, LineChart, Network, NotebookPen, Radio, Route, ShieldCheck, Shirt, Tags, Target, Users, Video, type LucideIcon } from 'lucide-react'
import { MolaMark } from '../../ui/brand'
import { BOOKS, BRAND, PLANS, SERIES } from '../../lib/config'
import { useDocumentTitle } from '../../lib/hooks'
import { cx, fcfa, money } from '../../lib/util'
import type { Role } from '../../lib/types'
import { Tabs } from '../../ui'
import BookCover from './components/BookCover'
import HeroPitch from './components/HeroPitch'
import IndiceTeaser from './components/IndiceTeaser'
import MolaChat from './components/MolaChat'
import NjangiCircle from './components/NjangiCircle'
import SeriesShelf from './components/SeriesShelf'
import { JourneyVisual, PathVisual, TagVisual, WeekVisual } from './components/FeatureVisuals'
import { DemoChoice, GoldLabel, useDemo, useHashScroll, useSiteT } from './components/brand'

type Demo = ReturnType<typeof useDemo>

export default function Landing() {
  const { lang } = useSiteT()
  useDocumentTitle(BRAND.tagline[lang])
  useHashScroll()
  const demo = useDemo()
  return (
    <div className="-mb-20 sm:-mb-24">
      <Hero demo={demo} />
      <Pillars />
      <Features demo={demo} />
      <LiveSection demo={demo} />
      <NjangiSection />
      <MolaSection demo={demo} />
      <Companions />
      <FootballGame />
      <Roadmap />
      <Closing />
      {demo.dialog}
    </div>
  )
}

function SectionHead({ title, lead, dark = false, id, className }: { title: string; lead?: ReactNode; dark?: boolean; id?: string; className?: string }) {
  return (
    <div className={cx('max-w-3xl', className)}>
      <h2 id={id} className={cx('text-balance text-[30px] leading-[1.06] sm:text-[42px]', dark ? 'text-cream' : 'text-ink')}>{title}</h2>
      {lead && <p className={cx('mt-4 max-w-2xl text-[16px] leading-relaxed sm:text-[17px]', dark ? 'text-cream/70' : 'text-ink-muted')}>{lead}</p>}
    </div>
  )
}

/* ---------------- hero: the motto, and the move that proves it ---------------- */

function Hero({ demo }: { demo: Demo }) {
  const { t, lang } = useSiteT()
  return (
    <section className="surface-dark relative isolate overflow-hidden bg-forest-800 text-cream" aria-labelledby="hero-title">
      {/* one soft light on the pitch, the only gradient allowed */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(900px_560px_at_72%_42%,rgba(19,128,79,0.32),transparent_72%)]" />
      <div className="container-page grid grid-cols-1 gap-x-14 gap-y-8 pb-14 pt-10 sm:pb-20 sm:pt-14 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:grid-rows-[auto_1fr] lg:gap-y-7 lg:pb-24 lg:pt-20">
        <h1 id="hero-title" className="text-balance text-[38px] leading-[1.02] sm:text-[54px] lg:self-end lg:text-[50px] xl:text-[56px]">{BRAND.motto[lang]}</h1>
        <div className="-mx-1 sm:mx-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
          <HeroPitch />
        </div>
        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          <p className="max-w-md text-[16.5px] leading-relaxed text-cream/75 sm:text-[17.5px]">{t('landing.hero.lead')}</p>
          <Link to="/bienvenue" className="btn-sun btn-lg mt-8 w-full min-[420px]:w-auto"><MolaMark size={19} ball="#0B5D3B" />{t('landing.hero.ctaStart')}</Link>
          <p className="mt-8 text-[13.5px] font-semibold text-cream/60">{t('landing.hero.demoTitle')}</p>
          <DemoChoice demo={demo} dark quiet className="mt-3" />
        </div>
      </div>
    </section>
  )
}

/* ---------------- what it does: three verbs ---------------- */

function Pillars() {
  const { t } = useSiteT()
  const items = ['train', 'observe', 'follow'] as const
  return (
    <section className="container-page py-16 sm:py-24" aria-labelledby="pillars-title">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-20">
        <SectionHead id="pillars-title" title={t('landing.pillars.title')} lead={t('landing.pillars.lead')} />
        <dl className="divide-y divide-line border-y border-line">
          {items.map((k) => (
            <div key={k} className="grid gap-1.5 py-6 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-8">
              <dt className="font-display text-[22px] leading-tight text-ink">{t(`landing.pillars.${k}.title`)}</dt>
              <dd className="text-[15.5px] leading-relaxed text-ink-muted">{t(`landing.pillars.${k}.body`)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

/* ---------------- features by role ---------------- */

const AUDIENCES = ['players', 'coaches', 'analysts', 'clubs'] as const
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
    <section id="app" className="scroll-mt-20 border-y border-line bg-sand/60 py-16 sm:py-24" aria-labelledby="app-title">
      <div className="container-page">
        <SectionHead id="app-title" title={t('landing.features.title')} lead={t('landing.features.lead')} />
        <Tabs className="mt-9" value={aud} onChange={setAud} tabs={AUDIENCES.map((id) => ({ id, label: t(`landing.features.tabs.${id}`) }))} />
        <div className="mt-9 grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14" role="tabpanel" aria-label={t(`landing.features.tabs.${aud}`)}>
          <div className="min-w-0">
            <p className="text-[16px] font-semibold leading-snug text-ink">{t(`landing.features.who.${aud}`)}</p>
            <ul className="mt-6 grid gap-x-8 sm:grid-cols-2">
              {cur.items.map(([k, Icon]) => (
                <li key={k} className="border-t border-line py-5">
                  <Icon size={20} strokeWidth={1.75} className="text-forest-600" aria-hidden="true" />
                  <h3 className="mt-3 text-[17px] leading-snug text-ink">{t(`landing.features.items.${k}.title`)}</h3>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-muted">{t(`landing.features.items.${k}.body`)}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[13.5px] font-semibold text-ink-muted">{t('landing.features.open')}</p>
            <DemoChoice demo={demo} role={cur.role} to={cur.to} className="mt-3" />
          </div>
          <div className="min-w-0 lg:sticky lg:top-24"><Visual /></div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- the Indice Njangi ---------------- */

function LiveSection({ demo }: { demo: Demo }) {
  const { t } = useSiteT()
  return (
    <section className="surface-dark bg-night-800 py-16 text-cream sm:py-24" aria-labelledby="live-title">
      <div className="container-page">
        <SectionHead id="live-title" dark title={t('landing.live.title')} lead={t('landing.live.lead')} />
        <div className="mt-12"><IndiceTeaser /></div>
        <div className="mt-12 border-t border-white/10 pt-8">
          <p className="text-[15px] font-semibold text-cream">{t('landing.live.cta')}</p>
          <DemoChoice demo={demo} to="/app/analyse/rapport/ma_past" dark className="mt-3" />
        </div>
      </div>
    </section>
  )
}

/* ---------------- the njangi ---------------- */

function NjangiSection() {
  const { t } = useSiteT()
  const points = ['give', 'circulate', 'receive'] as const
  return (
    <section className="container-page py-16 sm:py-24" aria-labelledby="njangi-title">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-20">
        <div>
          <SectionHead id="njangi-title" title={t('landing.njangi.title')} />
          <p className="prose-n mt-6 max-w-xl">{t('landing.njangi.p1')}</p>
          <p className="mt-7 max-w-xl font-display text-[22px] font-medium italic leading-snug text-ink sm:text-[25px]" style={{ fontStretch: '100%' }}>{t('landing.njangi.p2')}</p>
          <p className="prose-n mt-7 max-w-xl">{t('landing.njangi.p3')}</p>
        </div>
        <div className="mx-auto w-full max-w-[520px]">
          <NjangiCircle />
          <dl className="mt-8 grid gap-x-6 gap-y-5 border-t border-line pt-6 sm:grid-cols-3">
            {points.map((k) => (
              <div key={k}>
                <dt className="text-[15px] font-semibold text-ink">{t(`landing.njangi.points.${k}.title`)}</dt>
                <dd className="mt-1 text-[14px] leading-relaxed text-ink-muted">{t(`landing.njangi.points.${k}.body`)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}

/* ---------------- Mola ---------------- */

function MolaSection({ demo }: { demo: Demo }) {
  const { t } = useSiteT()
  const asks = ['a', 'b', 'c', 'd', 'e'] as const
  return (
    <section id="mola" className="scroll-mt-20 border-t border-line py-16 sm:py-24" aria-labelledby="mola-title">
      <div className="container-page grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <SectionHead id="mola-title" title={t('landing.mola.title')} />
          <p className="prose-n mt-6">{t('landing.mola.p1')}</p>
          <p className="mt-5 flex items-start gap-3 text-[15.5px] font-medium leading-relaxed text-forest-700">
            <ShieldCheck size={20} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden="true" />{t('landing.mola.p2')}
          </p>
          <h3 className="mt-10 text-[16px] text-ink">{t('landing.mola.can')}</h3>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {asks.map((k) => (
              <li key={k} className="py-3 text-[15px] leading-snug text-ink-soft">{t('quote', { text: t(`landing.mola.asks.${k}`) })}</li>
            ))}
          </ul>
          <Link to="/bienvenue" className="btn-primary btn-lg mt-8"><MolaMark size={19} />{t('landing.mola.cta')}</Link>
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
    <section id="livres" className="scroll-mt-20 border-y border-line bg-sand/60 py-16 sm:py-24" aria-labelledby="books-title">
      <div className="container-page">
        <SectionHead id="books-title" title={t('landing.companions.title')} lead={t('landing.companions.lead')} />

        <div className="panel mt-10 divide-y divide-line">
          {/* the coaching book */}
          <article className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:p-8 lg:gap-12 lg:p-10">
            <a href={BOOKS.methode.href} className="block w-[132px] shrink-0 rounded-[4px_10px_10px_4px] sm:w-[168px]" aria-label={t('shelf.readLabel', { title: BOOKS.methode.title[lang] })}>
              <BookCover book="methode" sizes="168px" />
            </a>
            <div className="min-w-0">
              <GoldLabel>{t('landing.companions.methode.label')}</GoldLabel>
              <h3 className="mt-2 text-[28px] leading-tight text-ink sm:text-[34px]">{BOOKS.methode.title[lang]}</h3>
              <p className="mt-2 max-w-2xl font-display text-[16.5px] font-medium italic leading-snug text-ink-soft" style={{ fontStretch: '100%' }}>{BOOKS.methode.subtitle[lang]}</p>
              <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-muted">{t('landing.companions.methode.body')}</p>
              <a href={BOOKS.methode.href} className="btn-primary mt-6"><BookOpen size={17} strokeWidth={1.75} />{t('landing.companions.read')}</a>
            </div>
          </article>

          {/* the children's saga */}
          <div className="p-5 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <GoldLabel>{t('landing.companions.series.label')}</GoldLabel>
                <h3 className="mt-2 text-[34px] leading-none text-ink sm:text-[42px]">{SERIES.name}</h3>
                <p className="mt-3 text-[15px] font-semibold text-ink-soft">{t('landing.companions.series.meta')}</p>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">{t('landing.companions.series.body')}</p>
              </div>
              <Link to="/livres" className="btn-outline shrink-0 self-start sm:self-auto">{t('landing.companions.all')}</Link>
            </div>
            <SeriesShelf className="mt-8" />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- the football game (its own page, /football/) ---------------- */

function FootballGame() {
  const { t } = useSiteT()
  return (
    <section id="jeu" className="scroll-mt-20 surface-dark bg-night-800 py-16 text-cream sm:py-24" aria-labelledby="game-title">
      <div className="container-page">
        <div className="overflow-hidden rounded-panel border border-white/10 bg-night-700">
          <a href="/football/" className="block" tabIndex={-1} aria-hidden="true">
            <img src="/football/cover.jpg" alt="" width={1600} height={330} loading="lazy" className="h-[150px] w-full object-cover sm:h-[240px] lg:h-[300px]" />
          </a>
          <div className="flex flex-col gap-6 p-5 sm:p-8 lg:flex-row lg:items-end lg:justify-between lg:p-10">
            <div className="max-w-2xl">
              <GoldLabel dark>{t('landing.game.label')}</GoldLabel>
              <h2 id="game-title" className="mt-2 text-balance text-[30px] leading-[1.06] text-cream sm:text-[42px]">{t('landing.game.title')}</h2>
              <p className="mt-4 text-[15.5px] leading-relaxed text-cream/75">{t('landing.game.body')}</p>
            </div>
            <a href="/football/" className="btn-primary shrink-0 self-start lg:self-auto"><Gamepad2 size={18} strokeWidth={1.75} />{t('landing.game.cta')}</a>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- 2030 / 2034: a real sequence ---------------- */

function Roadmap() {
  const { t } = useSiteT()
  const steps = ['a', 'b', 'c', 'd'] as const
  return (
    <section className="surface-dark bg-forest-700 py-16 text-cream sm:py-24" aria-labelledby="roadmap-title">
      <div className="container-page">
        <SectionHead id="roadmap-title" dark title={t('landing.roadmap.title')} lead={t('landing.roadmap.lead')} />
        <ol className="relative mt-12 grid gap-8 border-l border-cream/20 pl-6 sm:grid-cols-2 sm:border-l-0 sm:pl-0 lg:grid-cols-4 lg:gap-6">
          <span aria-hidden="true" className="absolute left-0 right-0 top-[7px] hidden h-px bg-cream/20 lg:block" />
          {steps.map((s, i) => {
            const last = i === steps.length - 1
            return (
              <li key={s} className="relative">
                <span aria-hidden="true" className={cx('absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 sm:hidden', last ? 'border-sun-300 bg-sun-300' : 'border-cream/60 bg-forest-700')} />
                <span aria-hidden="true" className={cx('hidden h-3.5 w-3.5 rounded-full border-2 lg:block', last ? 'border-sun-300 bg-sun-300' : 'border-cream/60 bg-forest-700')} />
                <div className={cx('num font-display text-[32px] leading-none lg:mt-5 lg:text-[36px]', last ? 'text-sun-300' : 'text-cream')}>{t(`landing.roadmap.steps.${s}.year`)}</div>
                <div className="mt-3 text-[16px] font-semibold text-cream">{t(`landing.roadmap.steps.${s}.title`)}</div>
                <p className="mt-1 text-[15px] leading-relaxed text-cream/70">{t(`landing.roadmap.steps.${s}.body`)}</p>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

/* ---------------- closing: free to start ---------------- */

function Closing() {
  const { t, lang } = useSiteT()
  const paid = PLANS.map((p) => p.usdMonth).filter((v): v is number => typeof v === 'number' && v > 0)
  const from = paid.length ? Math.min(...paid) : 0
  return (
    <section className="container-page py-16 sm:py-24" aria-labelledby="closing-title">
      <div className="border-t border-line pt-12 sm:pt-16">
        <SectionHead id="closing-title" title={t('landing.pricing.title')} lead={t('landing.pricing.body', { price: money(from, lang), fcfa: fcfa(from, lang) })} />
        <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-ink-muted sm:text-[17px]">{t('landing.final.body')}</p>
        <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap">
          <Link to="/bienvenue" className="btn-primary btn-lg"><MolaMark size={19} />{t('landing.hero.ctaStart')}</Link>
          <Link to="/premium" className="btn-outline btn-lg">{t('landing.pricing.cta')}</Link>
        </div>
      </div>
    </section>
  )
}
