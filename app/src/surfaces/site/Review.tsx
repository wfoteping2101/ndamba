// /revue: William's four projects, presented separately so each can be reviewed and changed.
//   Lionceaux, tome 1 (cover, the online reader, every illustration published so far, the art direction)
//   Le Code Njangi (cover, the online reader, contents by part, every drill with its diagram)
//   The Ndamba app (one row per area, with a direct link and the right demo)
//   Mola (onboarding, hub, what it can do)
// Each section has « Demander une modification », which opens Mola pre-filled (/app/mola?q=...).
// The header links to /marque, the brand page.
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, CalendarDays, Check, ChevronDown, FileChartColumn, GraduationCap, Languages, Route, Trophy, User, Users, Video, type LucideIcon } from 'lucide-react'
import { MolaAvatar, MolaMark, NdambaMark } from '../../ui/brand'
import { DRILLS, LESSONS, METHODE_TOC, TOME1_TOC } from '../../content'
import { ART_DIRECTION, TOME1_ART, TOME1_ART_PLANNED } from '../../content/art.gen'
import { BOOKS } from '../../lib/config'
import { useDocumentTitle } from '../../lib/hooks'
import type { Role } from '../../lib/types'
import { cx } from '../../lib/util'
import BookCover from './components/BookCover'
import { AppLink, ArtGallery, DrillGrid, RequestButton } from './components/ReviewParts'
import { ROMAN, chapterUrl, groupByPart, isMethodeChapter, methodeShape } from './components/books'
import { GoldLabel, useDemo, useSiteT, type DemoLevel } from './components/brand'

type Demo = ReturnType<typeof useDemo>
const SECTIONS = [
  { id: 'lionceaux', key: 'tome1' },
  { id: 'code-njangi', key: 'methode' },
  { id: 'ndamba', key: 'app' },
  { id: 'mola', key: 'mola' },
] as const
const SW = 1.75

export default function Review() {
  const { t, lang } = useSiteT()
  useDocumentTitle(t('review.docTitle'))
  const demo = useDemo()
  const shape = methodeShape()
  const status: Record<string, string> = {
    tome1: t('review.sections.tome1.status', { n: TOME1_ART.length, total: TOME1_ART_PLANNED }),
    methode: t('review.sections.methode.status', { online: shape.online, planned: shape.planned }),
    app: t('review.sections.app.status'),
    mola: t('review.sections.mola.status'),
  }
  const frenchNote = t('review.frenchNote')
  return (
    <div>
      {/* header */}
      <header className="surface-dark bg-forest-800 text-cream">
        <div className="container-page pb-10 pt-12 sm:pb-14 sm:pt-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:items-end lg:gap-16">
            <div>
              <h1 className="max-w-3xl text-balance text-[36px] leading-[1.03] sm:text-[50px]">{t('review.title')}</h1>
              <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-cream/75 sm:text-[17px]">{t('review.lead')}</p>
              {lang === 'en' && frenchNote && (
                <p className="mt-5 inline-flex max-w-2xl items-start gap-2 rounded-card bg-white/[0.07] px-3.5 py-2.5 text-[14px] text-cream/80"><Languages size={16} strokeWidth={SW} className="mt-0.5 shrink-0 text-sun-300" aria-hidden="true" />{frenchNote}</p>
              )}
            </div>
            <Link to="/marque" className="group flex items-center gap-4 rounded-card border border-white/15 p-4 transition-colors hover:border-white/30 hover:bg-white/[0.05]">
              <NdambaMark size={48} tone="light" className="shrink-0" />
              <span className="min-w-0">
                <span className="block text-[15.5px] font-semibold text-cream underline decoration-cream/30 underline-offset-4 group-hover:decoration-cream">{t('review.brandLink')}</span>
                <span className="mt-1 block text-[13.5px] leading-snug text-cream/65">{t('review.brandHint')}</span>
              </span>
            </Link>
          </div>
          <ul className="mt-12 grid grid-cols-1 gap-x-8 min-[520px]:grid-cols-2 lg:grid-cols-4" aria-label={t('review.jump')}>
            {SECTIONS.map((s) => (
              <li key={s.id} className="border-t border-white/15">
                <a href={`#${s.id}`} className="group block h-full py-5">
                  <span className="block font-display text-[18px] leading-tight text-cream underline decoration-transparent underline-offset-4 transition-colors group-hover:decoration-cream/40">{t(`review.sections.${s.key}.name`)}</span>
                  <span className="mt-1 block text-[13.5px] text-cream/65">{t(`review.sections.${s.key}.kind`)}</span>
                  <span className="mt-3 block text-[13px] font-semibold text-sun-300">{status[s.key]}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </header>

      <StickyNav />

      <div className="container-page">
        <Lionceaux demo={demo} />
        <CodeNjangi demo={demo} />
        <AppSection demo={demo} />
        <MolaSection demo={demo} />
      </div>
      {demo.dialog}
    </div>
  )
}

/* ---------------- the sticky project nav ---------------- */

function StickyNav() {
  const { t } = useSiteT()
  const [active, setActive] = useState<string>(SECTIONS[0].id)
  useEffect(() => {
    // the active project is the last one whose top has passed under the sticky bars
    let frame = 0
    const update = () => {
      frame = 0
      let cur: string = SECTIONS[0].id
      for (const s of SECTIONS) { const el = document.getElementById(s.id); if (el && el.getBoundingClientRect().top <= 160) cur = s.id }
      setActive(cur)
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); if (frame) cancelAnimationFrame(frame) }
  }, [])
  return (
    <nav className="sticky top-16 z-30 border-b border-line/80 bg-cream/90 backdrop-blur-md" aria-label={t('review.jump')}>
      <div className="container-page no-scrollbar flex gap-1 overflow-x-auto py-2">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} aria-current={active === s.id ? 'true' : undefined}
            className={cx('inline-flex min-h-[40px] shrink-0 items-center rounded-full px-4 text-[14px] font-semibold transition-colors', active === s.id ? 'bg-ink text-cream' : 'text-ink-soft hover:bg-sand hover:text-ink')}>
            {t(`review.sections.${s.key}.name`)}
          </a>
        ))}
      </div>
    </nav>
  )
}

/* ---------------- a project's header ---------------- */

function ProjectHead({ id, k, lead, demo, children }: { id: string; k: string; lead: string; demo: Demo; children?: ReactNode }) {
  const { t } = useSiteT()
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <GoldLabel>{t(`review.sections.${k}.kind`)}</GoldLabel>
        <h2 id={`${id}-title`} className="mt-2 text-balance text-[30px] leading-[1.05] text-ink sm:text-[40px]">{t(`review.sections.${k}.name`)}</h2>
        <p className="mt-3 text-[16px] leading-relaxed text-ink-muted">{lead}</p>
        {children}
      </div>
      <RequestButton demo={demo} subject={t(`review.sections.${k}.request`)} className="self-start lg:self-auto" />
    </div>
  )
}

function SubHead({ title, lead, action }: { title: string; lead?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 max-w-3xl">
        <h3 className="text-[22px] leading-tight text-ink sm:text-[24px]">{title}</h3>
        {lead && <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{lead}</p>}
      </div>
      {action}
    </div>
  )
}

const sectionCls = 'scroll-mt-32 border-b border-line py-14 last:border-b-0 sm:py-20'

/* ---------------- Lionceaux, tome 1 ---------------- */

function Lionceaux({ demo }: { demo: Demo }) {
  const { t, lang } = useSiteT()
  const b = BOOKS.tome1
  const facts = [t('review.tome1.facts.chapters', { n: TOME1_TOC.length || 40 }), t('review.tome1.facts.parts'), t('review.tome1.facts.lessons', { n: LESSONS.length || 40 })]
  return (
    <section id="lionceaux" className={sectionCls} aria-labelledby="lionceaux-title">
      <ProjectHead id="lionceaux" k="tome1" lead={t('review.tome1.intro')} demo={demo} />

      <div className="surface-dark mt-10 grid grid-cols-1 items-center gap-8 rounded-panel bg-forest-800 p-6 text-cream sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)] sm:p-8 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)] lg:gap-12 lg:p-10">
        <a href={b.href} className="mx-auto block w-[56%] max-w-[220px] rounded-[4px_10px_10px_4px] sm:mx-0 sm:w-full sm:max-w-none" aria-label={t('shelf.readLabel', { title: b.title[lang] })}>
          <BookCover book="tome1" sizes="(min-width: 1024px) 240px, (min-width: 640px) 200px, 56vw" />
        </a>
        <div className="min-w-0">
          <p className="font-display text-[28px] leading-tight sm:text-[34px]">{b.title[lang]}</p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {facts.map((f) => <li key={f} className="rounded-full border border-white/15 px-3 py-1 text-[13px] font-semibold text-cream/85">{f}</li>)}
          </ul>
          <a href={b.href} className="btn-sun btn-lg mt-7"><BookOpen size={18} strokeWidth={SW} aria-hidden="true" />{t('review.tome1.read')}</a>
        </div>
      </div>

      <div className="mt-16">
        <SubHead title={t('review.tome1.galleryTitle')} lead={t('review.tome1.galleryLead', { n: TOME1_ART.length, total: TOME1_ART_PLANNED })} />
        <div className="mt-7"><ArtGallery art={TOME1_ART} planned={TOME1_ART_PLANNED} demo={demo} book={t('review.sections.tome1.name')} /></div>
      </div>

      <ArtDirection />
    </section>
  )
}

function ArtDirection() {
  const { t } = useSiteT()
  const points = ['style', 'light', 'composition', 'cover', 'quality'] as const
  return (
    <div className="mt-16">
      <SubHead title={t('review.tome1.artTitle')} lead={t('review.tome1.artLead')} />
      <dl className="mt-7 grid gap-x-10 border-t border-line md:grid-cols-2">
        {points.map((k) => (
          <div key={k} className="border-b border-line py-5">
            <dt className="text-[16.5px] font-semibold leading-snug text-ink">{t(`review.tome1.art.${k}.title`)}</dt>
            <dd className="mt-1.5 text-[14.5px] leading-relaxed text-ink-muted">{t(`review.tome1.art.${k}.body`)}</dd>
          </div>
        ))}
      </dl>
      {ART_DIRECTION.length > 0 && (
        <details className="group mt-6 overflow-hidden rounded-card border border-line bg-paper">
          <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-[15px] font-semibold text-ink transition-colors hover:bg-cream [&::-webkit-details-marker]:hidden">
            {t('review.tome1.artFull')}
            <ChevronDown size={18} strokeWidth={SW} className="shrink-0 text-ink-muted transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div lang="fr" className="grid gap-6 border-t border-line px-5 py-5 lg:grid-cols-2">
            {ART_DIRECTION.map((s) => (
              <div key={s.title} className="min-w-0">
                <h4 className="text-[16px] font-semibold text-ink">{s.title}</h4>
                <div className="mt-2 space-y-2 text-[14px] leading-relaxed text-ink-soft">
                  {s.blocks.some((b) => b.type === 'li') && (
                    <ul className="list-disc space-y-1 pl-5">{s.blocks.filter((b) => b.type === 'li').map((b, i) => <li key={i}>{b.text}</li>)}</ul>
                  )}
                  {s.blocks.filter((b) => b.type !== 'li').map((b, i) => b.type === 'quote'
                    ? <blockquote key={i} className="pl-4 italic text-ink">{b.text}</blockquote>
                    : <p key={i}>{b.text}</p>)}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

/* ---------------- Le Code Njangi ---------------- */

function CodeNjangi({ demo }: { demo: Demo }) {
  const { t, lang } = useSiteT()
  const b = BOOKS.methode
  const shape = methodeShape()
  const groups = groupByPart(METHODE_TOC)
  const parts = groups.filter(([, list]) => list.some(isMethodeChapter))
  const outside = groups.filter(([, list]) => !list.some(isMethodeChapter)).flatMap(([, list]) => list)
  const have = new Set(METHODE_TOC.filter(isMethodeChapter).map((e) => e.no))
  const missing = Array.from({ length: shape.planned }, (_, i) => i + 1).filter((n) => !have.has(n))
  const facts = [t('review.methode.facts.chapters', { online: shape.online, planned: shape.planned }), t('review.methode.facts.parts', { n: shape.parts }), t('review.methode.facts.drills', { n: DRILLS.length })]
  return (
    <section id="code-njangi" className={sectionCls} aria-labelledby="code-njangi-title">
      <ProjectHead id="code-njangi" k="methode" lead={t('review.methode.intro')} demo={demo} />

      <div className="panel mt-10 grid grid-cols-1 items-center gap-8 p-6 sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)] sm:p-8 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)] lg:gap-12 lg:p-10">
        <a href={b.href} className="mx-auto block w-[56%] max-w-[220px] rounded-[4px_10px_10px_4px] sm:mx-0 sm:w-full sm:max-w-none" aria-label={t('shelf.readLabel', { title: b.title[lang] })}>
          <BookCover book="methode" sizes="(min-width: 1024px) 240px, (min-width: 640px) 200px, 56vw" />
        </a>
        <div className="min-w-0">
          <p className="font-display text-[28px] leading-tight text-ink sm:text-[34px]">{b.title[lang]}</p>
          <p className="mt-2 font-display text-[16px] font-medium italic leading-snug text-ink-soft" style={{ fontStretch: '100%' }}>{b.subtitle[lang]}</p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {facts.map((f) => <li key={f} className="chip font-semibold">{f}</li>)}
          </ul>
          <a href={b.href} className="btn-primary btn-lg mt-7"><BookOpen size={18} strokeWidth={SW} aria-hidden="true" />{t('review.tome1.read')}</a>
        </div>
      </div>

      <div className="mt-16">
        <SubHead title={t('review.methode.tocTitle')} lead={t('review.methode.tocLead')} />
        <div className="mt-7 grid gap-x-10 md:grid-cols-2">
          {parts.map(([part, list]) => (
            <div key={part} className="border-t border-line py-5">
              <p className="text-[13px] font-semibold text-forest-600">{t('review.methode.partLabel', { n: ROMAN[part] || part })}</p>
              <p className="mt-1 font-display text-[18px] leading-snug text-ink">{list[0].partTitle || list[0].title}</p>
              <ol className="mt-3 space-y-0.5">
                {list.map((e) => (
                  <li key={e.no}>
                    <a href={chapterUrl(b.href, e.no)} className="-mx-2 flex gap-3 rounded-lg px-2 py-1.5 text-[14.5px] leading-snug transition-colors hover:bg-sand/70">
                      <span className="num w-6 shrink-0 text-right text-ink-faint">{e.no}</span>
                      <span className="min-w-0 text-ink">{e.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
        {outside.length > 0 && (
          <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-5 text-[14px] text-ink-muted">
            <span className="font-semibold text-ink-soft">{t('review.methode.outside')}</span>
            {outside.map((e) => <a key={e.no} href={chapterUrl(b.href, e.no)} className="link">{e.title}</a>)}
          </p>
        )}
        {missing.length > 0 && missing.length < shape.planned && (
          <p className="mt-2 text-[13.5px] text-ink-muted">{t('review.methode.missing', { list: compactRange(missing, lang) })}</p>
        )}
      </div>

      <div className="mt-16">
        <SubHead title={t('review.methode.drillsTitle', { n: DRILLS.length })} lead={t('review.methode.drillsLead')}
          action={<AppLink demo={demo} to="/app/exercices" className="link inline-flex min-h-[44px] shrink-0 items-center text-[15px]">{t('review.methode.library')}</AppLink>} />
        <div className="mt-7"><DrillGrid drills={DRILLS} demo={demo} /></div>
      </div>
    </section>
  )
}

/** [11, 12, 13, 20] -> "11 à 13, 20" (no dashes) */
function compactRange(ns: number[], lang: 'fr' | 'en') {
  const to = lang === 'en' ? ' to ' : ' à '
  const out: string[] = []
  for (let i = 0; i < ns.length; i++) {
    let j = i
    while (j + 1 < ns.length && ns[j + 1] === ns[j] + 1) j++
    out.push(j > i ? `${ns[i]}${to}${ns[j]}` : String(ns[i]))
    i = j
  }
  return out.join(', ')
}

/* ---------------- The Ndamba app ---------------- */

const AREAS: { k: string; icon: LucideIcon; to: string; level: DemoLevel; role: Role }[] = [
  { k: 'training', icon: CalendarDays, to: '/app/semaine', level: 'pro', role: 'coach' },
  { k: 'team', icon: Users, to: '/app/matchs', level: 'pro', role: 'coach' },
  { k: 'analysis', icon: FileChartColumn, to: '/app/analyse/rapport/ma_past', level: 'pro', role: 'coach' },
  { k: 'video', icon: Video, to: '/app/analyse/video', level: 'pro', role: 'coach' },
  { k: 'journey', icon: Route, to: '/app/equipe/pl_8/parcours', level: 'pro', role: 'coach' },
  { k: 'player', icon: User, to: '/app/joueur', level: 'youth', role: 'player' },
]

function AppSection({ demo }: { demo: Demo }) {
  const { t } = useSiteT()
  return (
    <section id="ndamba" className={sectionCls} aria-labelledby="ndamba-title">
      <ProjectHead id="ndamba" k="app" lead={t('review.app.intro')} demo={demo} />

      <h3 className="mt-12 text-[20px] text-ink">{t('review.app.demosTitle')}</h3>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {(['pro', 'youth'] as const).map((lv) => {
          const loaded = demo.current === lv
          const pro = lv === 'pro'
          return (
            <div key={lv} className={cx('flex flex-col rounded-panel p-5 sm:p-6', pro ? 'surface-dark bg-night-800 text-cream' : 'border border-line bg-paper')}>
              <div className="flex items-center gap-3">
                <span className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-full', pro ? 'bg-white/10 text-sun-300' : 'bg-forest-50 text-forest-600')}>{pro ? <Trophy size={20} strokeWidth={SW} aria-hidden="true" /> : <GraduationCap size={20} strokeWidth={SW} aria-hidden="true" />}</span>
                <div className="min-w-0">
                  <p className={cx('font-display text-[19px] leading-tight', pro ? 'text-cream' : 'text-ink')}>{t(`review.app.demos.${lv}.title`)}</p>
                  <p className={cx('mt-0.5 text-[13.5px]', pro ? 'text-cream/60' : 'text-ink-muted')}>{t(`review.app.demos.${lv}.meta`)}</p>
                </div>
              </div>
              <p className={cx('mt-4 flex-1 text-[14.5px] leading-relaxed', pro ? 'text-cream/75' : 'text-ink-muted')}>{t(`review.app.demos.${lv}.body`)}</p>
              <button type="button" onClick={() => demo.launch('coach', '/app', lv)} disabled={demo.busy}
                className={cx('mt-5 self-start', pro ? 'btn-sun' : 'btn-primary')}>
                {loaded ? <Check size={16} strokeWidth={2.2} aria-hidden="true" /> : pro ? <Trophy size={16} strokeWidth={SW} aria-hidden="true" /> : <GraduationCap size={16} strokeWidth={SW} aria-hidden="true" />}
                {loaded ? t('review.app.loaded') : t('review.app.load')}
              </button>
            </div>
          )
        })}
      </div>

      <h3 className="mt-14 text-[20px] text-ink">{t('review.app.areasTitle')}</h3>
      <ul className="panel mt-5 divide-y divide-line">
        {AREAS.map(({ k, icon: Icon, to, level, role }) => (
          <li key={k} className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:gap-8">
            <div className="flex min-w-0 flex-1 gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-forest-50 text-forest-600"><Icon size={19} strokeWidth={SW} aria-hidden="true" /></span>
              <div className="min-w-0">
                <h4 className="font-display text-[18px] leading-snug text-ink">{t(`review.app.areas.${k}.title`)}</h4>
                <p className="mt-1 text-[14.5px] leading-relaxed text-ink-muted">{t(`review.app.areas.${k}.body`)}</p>
                <p className="mt-2 text-[12.5px] text-ink-muted">{t('review.route', { demo: t(`review.app.demoName.${level}`), path: to.replace(/\/ma_past$/, '/...') })}</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 pl-14 lg:pl-0">
              <AppLink demo={demo} to={to} level={level} role={role} className="btn-primary btn-sm min-h-[40px]">{t('review.open')}</AppLink>
              <button type="button" onClick={() => demo.launch(role, to, 'pro')} disabled={demo.busy} className={cx('btn btn-sm min-h-[40px] border', level === 'pro' ? 'border-forest-600 text-forest-700' : 'border-line text-ink-soft')}>{t('review.app.withPro')}</button>
              <button type="button" onClick={() => demo.launch(role, to, 'youth')} disabled={demo.busy} className={cx('btn btn-sm min-h-[40px] border', level === 'youth' ? 'border-forest-600 text-forest-700' : 'border-line text-ink-soft')}>{t('review.app.withYouth')}</button>
              <RequestButton demo={demo} compact subject={`${t('review.sections.app.request')}, ${t(`review.app.areas.${k}.title`).toLowerCase()}`} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ---------------- Mola ---------------- */

function MolaSection({ demo }: { demo: Demo }) {
  const { t } = useSiteT()
  const can = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'] as const
  const tries = ['a', 'b', 'c'] as const
  return (
    <section id="mola" className={sectionCls} aria-labelledby="mola-title">
      <ProjectHead id="mola" k="mola" lead={t('review.mola.intro')} demo={demo} />

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
        <div className="panel divide-y divide-line">
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <MolaAvatar size={44} className="shrink-0" />
              <p className="text-[14.5px] leading-relaxed text-ink-muted">{t('review.mola.onboardingHint', { example: t('review.mola.onboardingExample') })}</p>
            </div>
            <Link to="/bienvenue" className="btn-sun mt-5"><MolaMark size={18} ball="#0B5D3B" aria-hidden="true" />{t('review.mola.onboarding')}</Link>
          </div>
          <div className="p-5 sm:p-6">
            <p className="text-[14.5px] leading-relaxed text-ink-muted">{t('review.mola.hubHint')}</p>
            <AppLink demo={demo} to="/app/mola" className="btn-primary mt-4"><MolaMark size={18} aria-hidden="true" />{t('review.mola.hub')}</AppLink>
            <p className="mt-6 text-[13.5px] font-semibold text-ink-soft">{t('review.mola.tryTitle')}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {tries.map((k) => {
                const q = t(`review.mola.try.${k}`)
                return (
                  <li key={k}>
                    <AppLink demo={demo} to={`/app/mola?q=${encodeURIComponent(q)}`} className="inline-flex min-h-[40px] items-center rounded-control border border-line bg-cream px-3.5 py-2 text-left text-[14px] leading-snug text-ink-soft transition-colors hover:border-forest-300 hover:text-ink">
                      {t('quote', { text: q })}
                    </AppLink>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
        <div>
          <h3 className="text-[20px] text-ink">{t('review.mola.canTitle')}</h3>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {can.map((k) => (
              <li key={k} className="flex items-start gap-3 py-3 text-[15px] leading-snug text-ink-soft">
                <Check size={17} strokeWidth={2.2} className="mt-0.5 shrink-0 text-forest-600" aria-hidden="true" />
                {t(`review.mola.can.${k}`)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
