// The Code Njangi menu: the six modes over a live rondo, the player's Indice and what to do next.
import { Link } from 'react-router-dom'
import { BookOpen, ChevronRight, Clapperboard, Eye, GraduationCap, Map as MapIcon, PenLine, Route as RouteIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useT } from '../../i18n'
import { useDocumentTitle, useLiveQuery } from '../../lib/hooks'
import { fmtNjangi } from '../../lib/njangi'
import { BOOKS } from '../../lib/config'
import { GameFrame, TopBar } from '../shared/ui'
import { allDrillProgress, recentAttempts } from '../shared/save'
import BackdropScene from './BackdropScene'
import { LESSONS_ORDERED } from './drills/catalog'

const MODES: { key: string; to: string; icon: ReactNode }[] = [
  { key: 'academie', to: 'academie', icon: <GraduationCap size={22} strokeWidth={1.75} /> },
  { key: 'lecture', to: 'lecture', icon: <Eye size={22} strokeWidth={1.75} /> },
  { key: 'dixPasses', to: 'dix-passes', icon: <RouteIcon size={22} strokeWidth={1.75} /> },
  { key: 'tableau', to: 'tableau', icon: <PenLine size={22} strokeWidth={1.75} /> },
  { key: 'analyse', to: 'analyse', icon: <Clapperboard size={22} strokeWidth={1.75} /> },
  { key: 'parcours', to: 'parcours', icon: <MapIcon size={22} strokeWidth={1.75} /> },
]

export default function Home() {
  const { t, lang } = useT('jeux')
  useDocumentTitle(t('hub.codeNjangi.title'))
  const progress = useLiveQuery(() => allDrillProgress(), [], [])
  const attempts = useLiveQuery(() => recentAttempts('njangi', 20), [], [])
  const done = progress.filter((p) => Object.values(p.done).some(Boolean)).length
  const withIndice = attempts.filter((a) => a.indice !== null).slice(0, 5)
  const indice = withIndice.length ? withIndice.reduce((s, a) => s + (a.indice ?? 0), 0) / withIndice.length : null
  const doneIds = new Set(progress.filter((p) => Object.values(p.done).some(Boolean)).map((p) => p.id))
  const nextDrill = LESSONS_ORDERED.find((d) => !doneIds.has(d.id)) ?? LESSONS_ORDERED[0]
  return (
    <GameFrame className="overflow-y-auto">
      <div className="fixed inset-0"><BackdropScene /></div>
      <div className="fixed inset-0 bg-gradient-to-b from-night-900/70 via-night-900/55 to-night-900/95" aria-hidden="true" />
      <TopBar back="/jeux" title={t('hub.codeNjangi.title')} />
      <div className="relative mx-auto w-full max-w-5xl px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
        <p className="text-[13px] font-semibold text-sun-300">{t('hub.codeNjangi.tagline')}</p>
        <h1 className="mt-2 max-w-2xl text-balance text-[34px] font-semibold leading-[1.05] sm:text-[48px]">{t('njangi.title')}<span className="text-cream/60"> : {t('njangi.subtitle').toLowerCase()}</span></h1>
        <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-cream/75">{t('hub.codeNjangi.body')}</p>

        <div className="mt-7 grid gap-3 sm:grid-cols-[1.2fr_1fr]">
          <Link to={`academie/${nextDrill.id}`} className="glass-strong group flex items-center gap-4 rounded-[18px] p-4 hover:bg-night-800/95">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sun-500 text-ink"><GraduationCap size={22} strokeWidth={1.75} aria-hidden="true" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-semibold text-cream/60">{done ? t('njangi.continue') : t('njangi.next')}</span>
              <span className="block truncate text-[17px] font-semibold"><span className="text-sun-300">{nextDrill.id}</span> {lang === 'en' ? nextDrill.en.title : nextDrill.fr.title}</span>
              <span className="block text-[13px] text-cream/60">{t('academie.count', { done, total: LESSONS_ORDERED.length })}</span>
            </span>
            <ChevronRight size={20} strokeWidth={1.75} className="text-cream/50 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
          <div className="glass-strong rounded-[18px] p-4">
            <p className="text-[12.5px] font-semibold text-cream/60">{t('njangi.indiceTitle')}</p>
            {indice !== null ? (
              <p className="mt-0.5 text-[32px] font-semibold tabular-nums leading-tight text-sun-300">{fmtNjangi(indice, lang)}<span className="text-[15px] font-medium text-cream/50"> / 100</span></p>
            ) : <p className="mt-1 text-[14.5px] text-cream/75">{t('njangi.indiceEmpty')}</p>}
            <p className="mt-1 text-[12px] text-cream/50">{t('njangi.indiceSource')}</p>
          </div>
        </div>

        <h2 className="mt-10 text-[13px] font-semibold text-cream/60">{t('njangi.modesTitle')}</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODES.map((m) => (
            <li key={m.key}>
              <Link to={m.to} className="glass-strong group flex h-full flex-col rounded-[18px] p-4 transition-colors hover:bg-night-800/95" data-testid={`mode-${m.key}`}>
                <span className="grid h-11 w-11 place-items-center rounded-full bg-forest-600 text-cream">{m.icon}</span>
                <span className="mt-3 text-[17px] font-semibold">{t(`njangi.modes.${m.key}.title`)}</span>
                <span className="mt-1 text-[14px] leading-snug text-cream/70">{t(`njangi.modes.${m.key}.body`)}</span>
              </Link>
            </li>
          ))}
        </ul>
        <a href={BOOKS.methode.href} className="mt-8 inline-flex min-h-[44px] items-center gap-2 text-[14.5px] font-semibold text-cream/75 hover:text-cream">
          <BookOpen size={17} strokeWidth={1.75} aria-hidden="true" />{t('hub.readBook')} : {BOOKS.methode.title[lang]}
        </a>
      </div>
    </GameFrame>
  )
}
