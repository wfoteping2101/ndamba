// /revue: William's four projects, presented separately so each can be reviewed and changed.
//   1. Lionceaux, tome 1 (cover, the online reader, every illustration published so far, the art direction)
//   2. Le Code Njangi (cover, the online reader, contents by part, every drill with its diagram)
//   3. The Ndamba app (one card per area, with a direct link and the right demo)
//   4. Mola (onboarding, hub, what it can do)
// Each section has « Demander une modification », which opens Mola pre-filled (/app/mola?q=...).
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, BookOpen, CalendarDays, Check, ChevronDown, FileChartColumn, GraduationCap, Languages, MessagesSquare, Palette, Route, Trophy, User, Users, Video, type LucideIcon,
} from 'lucide-react'
import { MolaMark } from '../../ui/brand'
import { DRILLS, LESSONS, METHODE_TOC, TOME1_TOC } from '../../content'
import { ART_DIRECTION, TOME1_ART, TOME1_ART_PLANNED } from '../../content/art.gen'
import { BOOKS } from '../../lib/config'
import { useDocumentTitle } from '../../lib/hooks'
import type { Role } from '../../lib/types'
import { cx } from '../../lib/util'
import BookCover from './components/BookCover'
import { AppLink, ArtGallery, DrillGrid, RequestButton } from './components/ReviewParts'
import { ROMAN, chapterUrl, groupByPart, isMethodeChapter, methodeShape } from './components/books'
import { useDemo, useSiteT, type DemoLevel } from './components/brand'

type Demo = ReturnType<typeof useDemo>
const SECTIONS = [
  { id: 'lionceaux', key: 'tome1' },
  { id: 'code-njangi', key: 'methode' },
  { id: 'ndamba', key: 'app' },
  { id: 'mola', key: 'mola' },
] as const

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
      <header className="relative isolate overflow-hidden bg-forest-800 text-cream">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(800px_420px_at_92%_-10%,rgba(227,169,43,0.2),transparent_62%),radial-gradient(640px_420px_at_-6%_110%,rgba(197,118,47,0.24),transparent_60%)]" />
        <div className="container-page py-12 sm:py-16">
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-sun-300">{t('review.eyebrow')}</p>
          <h1 className="mt-3 max-w-3xl text-balance text-[34px] font-semibold leading-[1.06] sm:text-[48px]">{t('review.title')}</h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-cream/75 sm:text-[17px]">{t('review.lead')}</p>
          {lang === 'en' && frenchNote && (
            <p className="mt-4 inline-flex max-w-2xl items-start gap-2 rounded-2xl bg-white/[0.07] px-3.5 py-2 text-[13.5px] text-cream/80"><Languages size={16} className="mt-0.5 shrink-0 text-sun-300" aria-hidden="true" />{frenchNote}</p>
          )}
          <ol className="mt-8 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4" aria-label={t('review.jump')}>
            {SECTIONS.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="group flex h-full gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-4 transition hover:bg-white/[0.09]">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sun-500 font-display text-[16px] font-semibold text-ink">{i + 1}</span>
                  <span className="min-w-0">
                    <span className="block font-display text-[18px] font-semibold leading-tight text-cream">{t(`review.sections.${s.key}.name`)}</span>
                    <span className="mt-0.5 block text-[13px] text-cream/65">{t(`review.sections.${s.key}.kind`)}</span>
                    <span className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-sun-300">{status[s.key]}<ArrowRight size={13} className="transition group-hover:translate-x-0.5" aria-hidden="true" /></span>
                  </span>
                </a>
              </li>
            ))}
          </ol>
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
    <nav className="sticky top-16 z-30 border-b border-line/70 bg-cream/90 backdrop-blur" aria-label={t('review.jump')}>
      <div className="container-page flex gap-1.5 overflow-x-auto py-2">
        {SECTIONS.map((s, i) => (
          <a key={s.id} href={`#${s.id}`} aria-current={active === s.id ? 'true' : undefined}
            className={cx('inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-full px-3.5 text-[13.5px] font-semibold transition', active === s.id ? 'bg-forest-600 text-cream' : 'text-ink-soft hover:bg-sand')}>
            <span className={cx('grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold', active === s.id ? 'bg-sun-500 text-ink' : 'bg-sand text-ink-muted')}>{i + 1}</span>
            {t(`review.sections.${s.key}.name`)}
          </a>
        ))}
      </div>
    </nav>
  )
}

/* ---------------- a project's header ---------------- */

function ProjectHead({ n, id, k, lead, demo, children }: { n: number; id: string; k: string; lead: string; demo: Demo; children?: ReactNode }) {
  const { t } = useSiteT()
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <p className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-forest-600 font-display text-[13px] font-semibold text-cream">{n}</span>
          <span className="eyebrow">{t('review.projectN', { n })} · {t(`review.sections.${k}.kind`)}</span>
        </p>
        <h2 id={`${id}-title`} className="mt-3 text-balance text-[30px] font-semibold leading-[1.08] text-ink sm:text-[40px]">{t(`review.sections.${k}.name`)}</h2>
        <p className="mt-3 text-[16px] leading-relaxed text-ink-muted">{lead}</p>
        {children}
      </div>
      <RequestButton demo={demo} subject={t(`review.sections.${k}.request`)} className="self-start lg:self-auto" />
    </div>
  )
}

function SubHead({ icon: Icon, title, lead }: { icon: LucideIcon; title: string; lead?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-forest-50 text-forest-600"><Icon size={19} aria-hidden="true" /></span>
      <div className="min-w-0">
        <h3 className="font-display text-[22px] font-semibold leading-tight text-ink sm:text-[24px]">{title}</h3>
        {lead && <p className="mt-1 max-w-3xl text-[15px] leading-relaxed text-ink-muted">{lead}</p>}
      </div>
    </div>
  )
}

const sectionCls = 'scroll-mt-32 border-b border-line py-14 last:border-b-0 sm:py-20'

/* ---------------- 1. Lionceaux, tome 1 ---------------- */

function Lionceaux({ demo }: { demo: Demo }) {
  const { t, lang } = useSiteT()
  const b = BOOKS.tome1
  const facts = [t('review.tome1.facts.chapters', { n: TOME1_TOC.length || 40 }), t('review.tome1.facts.parts'), t('review.tome1.facts.lessons', { n: LESSONS.length || 40 })]
  return (
    <section id="lionceaux" className={sectionCls} aria-labelledby="lionceaux-title">
      <ProjectHead n={1} id="lionceaux" k="tome1" lead={t('review.tome1.intro')} demo={demo} />

      <div className="mt-10 grid grid-cols-1 items-center gap-8 rounded-[28px] bg-forest-800 p-6 text-cream sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)] sm:p-8 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)] lg:gap-12">
        <a href={b.href} className="mx-auto block w-[56%] max-w-[220px] rounded-[4px_10px_10px_4px] sm:mx-0 sm:w-full sm:max-w-none" aria-label={t('shelf.readLabel', { title: b.title[lang] })}>
          <BookCover book="tome1" sizes="(min-width: 1024px) 240px, (min-width: 640px) 200px, 56vw" />
        </a>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sun-300">{t('review.sections.tome1.kind')}</p>
          <p className="mt-1.5 font-display text-[28px] font-semibold leading-tight sm:text-[34px]">{b.title[lang]}</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {facts.map((f) => <li key={f} className="rounded-full border border-white/15 px-3 py-1 text-[13px] font-semibold text-cream/85">{f}</li>)}
          </ul>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a href={b.href} className="btn-sun min-h-[48px]"><BookOpen size={18} aria-hidden="true" />{t('review.tome1.read')}</a>
          </div>
        </div>
      </div>

      <div className="mt-14">
        <SubHead icon={Palette} title={t('review.tome1.galleryTitle')} lead={t('review.tome1.galleryLead', { n: TOME1_ART.length, total: TOME1_ART_PLANNED })} />
        <div className="mt-6"><ArtGallery art={TOME1_ART} planned={TOME1_ART_PLANNED} demo={demo} book={t('review.sections.tome1.name')} /></div>
      </div>

      <ArtDirection />
    </section>
  )
}

function ArtDirection() {
  const { t } = useSiteT()
  const points = ['style', 'light', 'composition', 'cover', 'quality'] as const
  return (
    <div className="mt-14">
      <SubHead icon={Palette} title={t('review.tome1.artTitle')} lead={t('review.tome1.artLead')} />
      <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {points.map((k, i) => (
          <li key={k} className="rounded-2xl border border-line bg-paper p-4 shadow-card">
            <span className="font-display text-[22px] font-semibold leading-none text-terra-500">{i + 1}</span>
            <p className="mt-2 font-display text-[16.5px] font-semibold leading-snug text-ink">{t(`review.tome1.art.${k}.title`)}</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">{t(`review.tome1.art.${k}.body`)}</p>
          </li>
        ))}
      </ol>
      {ART_DIRECTION.length > 0 && (
        <details className="group mt-4 overflow-hidden rounded-2xl border border-line bg-paper">
          <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-[15px] font-semibold text-ink hover:bg-sand/40 [&::-webkit-details-marker]:hidden">
            {t('review.tome1.artFull')}
            <ChevronDown size={18} className="shrink-0 text-ink-muted transition group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
          </summary>
          <div lang="fr" className="grid gap-6 border-t border-line px-5 py-5 lg:grid-cols-2">
            {ART_DIRECTION.map((s) => (
              <div key={s.title} className="min-w-0">
                <h4 className="font-display text-[17px] font-semibold text-ink">{s.title}</h4>
                <div className="mt-2 space-y-2 text-[14px] leading-relaxed text-ink-soft">
                  {s.blocks.some((b) => b.type === 'li') && (
                    <ul className="list-disc space-y-1 pl-5">{s.blocks.filter((b) => b.type === 'li').map((b, i) => <li key={i}>{b.text}</li>)}</ul>
                  )}
                  {s.blocks.filter((b) => b.type !== 'li').map((b, i) => b.type === 'quote'
                    ? <blockquote key={i} className="border-l-4 border-sun-500 pl-3 italic text-ink">{b.text}</blockquote>
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

/* ---------------- 2. Le Code Njangi ---------------- */

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
      <ProjectHead n={2} id="code-njangi" k="methode" lead={t('review.methode.intro')} demo={demo} />

      <div className="mt-10 grid grid-cols-1 items-center gap-8 rounded-[28px] border border-line bg-paper p-6 shadow-card sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)] sm:p-8 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)] lg:gap-12">
        <a href={b.href} className="mx-auto block w-[56%] max-w-[220px] rounded-[4px_10px_10px_4px] sm:mx-0 sm:w-full sm:max-w-none" aria-label={t('shelf.readLabel', { title: b.title[lang] })}>
          <BookCover book="methode" sizes="(min-width: 1024px) 240px, (min-width: 640px) 200px, 56vw" />
        </a>
        <div className="min-w-0">
          <p className="eyebrow">{t('review.sections.methode.kind')}</p>
          <p className="mt-1.5 font-display text-[28px] font-semibold leading-tight text-ink sm:text-[34px]">{b.title[lang]}</p>
          <p className="mt-1 font-display text-[16px] italic leading-snug text-ink-soft">{b.subtitle[lang]}</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {facts.map((f) => <li key={f} className="chip px-3 py-1 text-[13px] font-semibold">{f}</li>)}
          </ul>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a href={b.href} className="btn-primary min-h-[48px]"><BookOpen size={18} aria-hidden="true" />{t('review.tome1.read')}</a>
          </div>
        </div>
      </div>

      <div className="mt-14">
        <SubHead icon={BookOpen} title={t('review.methode.tocTitle')} lead={t('review.methode.tocLead')} />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {parts.map(([part, list]) => (
            <div key={part} className="rounded-2xl border border-line bg-paper p-4 shadow-card sm:p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-terra-600">{t('review.methode.partLabel', { n: ROMAN[part] || part })}</p>
              <p className="mt-0.5 font-display text-[18px] font-semibold leading-snug text-ink">{list[0].partTitle || list[0].title}</p>
              <ol className="mt-2.5 space-y-0.5">
                {list.map((e) => (
                  <li key={e.no}>
                    <a href={chapterUrl(b.href, e.no)} className="flex gap-3 rounded-lg px-2 py-1.5 text-[14.5px] leading-snug transition hover:bg-sand/60">
                      <span className="w-6 shrink-0 text-right font-display tabular-nums text-ink-faint">{e.no}</span>
                      <span className="min-w-0 text-ink">{e.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
        {outside.length > 0 && (
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-ink-muted">
            <span className="font-semibold text-ink-soft">{t('review.methode.outside')} :</span>
            {outside.map((e) => <a key={e.no} href={chapterUrl(b.href, e.no)} className="link">{e.title}</a>)}
          </p>
        )}
        {missing.length > 0 && missing.length < shape.planned && (
          <p className="mt-2 text-[13.5px] text-ink-faint">{t('review.methode.missing', { list: compactRange(missing) })}</p>
        )}
      </div>

      <div className="mt-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SubHead icon={GraduationCap} title={t('review.methode.drillsTitle', { n: DRILLS.length })} lead={t('review.methode.drillsLead')} />
          <AppLink demo={demo} to="/app/exercices" className="link inline-flex min-h-[44px] shrink-0 items-center gap-1.5 text-[15px]">{t('review.methode.library')}<ArrowRight size={16} aria-hidden="true" /></AppLink>
        </div>
        <div className="mt-6"><DrillGrid drills={DRILLS} demo={demo} /></div>
      </div>
    </section>
  )
}

/** [11, 12, 13, 20] -> "11 à 13, 20" */
function compactRange(ns: number[]) {
  const out: string[] = []
  for (let i = 0; i < ns.length; i++) {
    let j = i
    while (j + 1 < ns.length && ns[j + 1] === ns[j] + 1) j++
    out.push(j > i ? `${ns[i]}-${ns[j]}` : String(ns[i]))
    i = j
  }
  return out.join(', ')
}

/* ---------------- 3. The Ndamba app ---------------- */

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
      <ProjectHead n={3} id="ndamba" k="app" lead={t('review.app.intro')} demo={demo} />

      <h3 className="mt-10 font-sans text-[12px] font-bold uppercase tracking-[0.14em] text-ink-muted">{t('review.app.demosTitle')}</h3>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {(['pro', 'youth'] as const).map((lv) => {
          const loaded = demo.current === lv
          return (
            <div key={lv} className={cx('flex flex-col rounded-[24px] p-5 sm:p-6', lv === 'pro' ? 'bg-night-800 text-cream' : 'border border-line bg-paper shadow-card')}>
              <div className="flex items-center gap-3">
                <span className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-2xl', lv === 'pro' ? 'bg-white/10 text-sun-300' : 'bg-forest-50 text-forest-600')}>{lv === 'pro' ? <Trophy size={21} aria-hidden="true" /> : <GraduationCap size={21} aria-hidden="true" />}</span>
                <div className="min-w-0">
                  <p className={cx('font-display text-[20px] font-semibold leading-tight', lv === 'pro' ? 'text-cream' : 'text-ink')}>{t(`review.app.demos.${lv}.title`)}</p>
                  <p className={cx('text-[13px] font-semibold', lv === 'pro' ? 'text-sun-300' : 'text-terra-600')}>{t(`review.app.demos.${lv}.meta`)}</p>
                </div>
              </div>
              <p className={cx('mt-3 flex-1 text-[14.5px] leading-relaxed', lv === 'pro' ? 'text-cream/75' : 'text-ink-muted')}>{t(`review.app.demos.${lv}.body`)}</p>
              <button type="button" onClick={() => demo.launch('coach', '/app', lv)} disabled={demo.busy}
                className={cx('mt-4 self-start min-h-[44px]', lv === 'pro' ? 'btn-sun' : 'btn-primary')}>
                {loaded ? <Check size={16} aria-hidden="true" /> : lv === 'pro' ? <Trophy size={16} aria-hidden="true" /> : <GraduationCap size={16} aria-hidden="true" />}
                {loaded ? t('review.app.loaded') : t('review.app.load')}
              </button>
            </div>
          )
        })}
      </div>

      <h3 className="mt-12 font-sans text-[12px] font-bold uppercase tracking-[0.14em] text-ink-muted">{t('review.app.areasTitle')}</h3>
      <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AREAS.map(({ k, icon: Icon, to, level, role }) => (
          <li key={k} className="flex flex-col rounded-[22px] border border-line bg-paper p-5 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-forest-600 text-cream"><Icon size={20} aria-hidden="true" /></span>
              <RequestButton demo={demo} compact subject={`${t('review.sections.app.request')}, ${t(`review.app.areas.${k}.title`).toLowerCase()}`} className="-mr-2 -mt-1" />
            </div>
            <h4 className="mt-3 font-display text-[19px] font-semibold leading-snug text-ink">{t(`review.app.areas.${k}.title`)}</h4>
            <p className="mt-1 flex-1 text-[14.5px] leading-relaxed text-ink-muted">{t(`review.app.areas.${k}.body`)}</p>
            <p className="mt-3 text-[12px] font-semibold text-ink-faint">{t('review.app.recommended', { demo: t(`review.app.demoName.${level}`) })} · <code className="text-[11.5px]">{to.replace(/\/ma_past$/, '/…')}</code></p>
            <div className="mt-3 flex flex-wrap gap-2">
              <AppLink demo={demo} to={to} level={level} role={role} className="btn-primary btn-sm min-h-[40px]">{t('review.open')}<ArrowRight size={14} aria-hidden="true" /></AppLink>
              <button type="button" onClick={() => demo.launch(role, to, 'pro')} disabled={demo.busy} className={cx('btn btn-sm min-h-[40px] border', level === 'pro' ? 'border-forest-600 text-forest-700' : 'border-line text-ink-soft')}>{t('review.app.withPro')}</button>
              <button type="button" onClick={() => demo.launch(role, to, 'youth')} disabled={demo.busy} className={cx('btn btn-sm min-h-[40px] border', level === 'youth' ? 'border-forest-600 text-forest-700' : 'border-line text-ink-soft')}>{t('review.app.withYouth')}</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ---------------- 4. Mola ---------------- */

function MolaSection({ demo }: { demo: Demo }) {
  const { t } = useSiteT()
  const can = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'] as const
  const tries = ['a', 'b', 'c'] as const
  return (
    <section id="mola" className={sectionCls} aria-labelledby="mola-title">
      <ProjectHead n={4} id="mola" k="mola" lead={t('review.mola.intro')} demo={demo} />

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="grid gap-4">
          <div className="rounded-[24px] bg-forest-700 p-5 text-cream sm:p-6">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-sun-300"><MessagesSquare size={21} aria-hidden="true" /></span>
            <Link to="/bienvenue" className="btn-sun mt-4 min-h-[48px]"><MolaMark size={17} aria-hidden="true" />{t('review.mola.onboarding')}</Link>
            <p className="mt-3 text-[14px] leading-relaxed text-cream/75">{t('review.mola.onboardingHint', { example: t('review.mola.onboardingExample') })}</p>
          </div>
          <div className="rounded-[24px] border border-line bg-paper p-5 shadow-card sm:p-6">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-forest-50 text-forest-600"><MolaMark size={21} aria-hidden="true" /></span>
            <AppLink demo={demo} to="/app/mola" className="btn-primary mt-4 min-h-[48px]">{t('review.mola.hub')}<ArrowRight size={17} aria-hidden="true" /></AppLink>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">{t('review.mola.hubHint')}</p>
            <p className="mt-5 text-[12px] font-bold uppercase tracking-[0.14em] text-ink-muted">{t('review.mola.tryTitle')}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {tries.map((k) => {
                const q = t(`review.mola.try.${k}`)
                return (
                  <li key={k}>
                    <AppLink demo={demo} to={`/app/mola?q=${encodeURIComponent(q)}`} className="inline-flex min-h-[40px] items-center rounded-2xl border border-line bg-cream px-3.5 py-2 text-left text-[14px] leading-snug text-ink-soft hover:border-forest-300 hover:text-ink">
                      {t('quote', { text: q })}
                    </AppLink>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
        <div className="rounded-[24px] border border-line bg-paper p-5 shadow-card sm:p-6">
          <h3 className="font-display text-[22px] font-semibold text-ink">{t('review.mola.canTitle')}</h3>
          <ul className="mt-4 grid gap-2.5">
            {can.map((k) => (
              <li key={k} className="flex items-start gap-3 text-[15px] leading-snug text-ink-soft">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-forest-600 text-cream"><Check size={12} strokeWidth={3} aria-hidden="true" /></span>
                {t(`review.mola.can.${k}`)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
