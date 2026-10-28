import { useCallback, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { GraduationCap, LoaderCircle, Play, Trophy } from 'lucide-react'
import { useT, type Lang } from '../../../i18n'
import { BOOKS, BRAND, SERIES } from '../../../lib/config'
import { useSession } from '../../../lib/session'
import { Modal } from '../../../ui'
import type { Role } from '../../../lib/types'

type Vars = Record<string, unknown>

/** Names that come from config.ts, never hard-coded in copy. */
export function brandVars(lang: Lang) {
  return { app: BRAND.name, series: SERIES.name, heroes: SERIES.heroes, methode: BOOKS.methode.title[lang], tome1: SERIES.tomes[0]?.title ?? '' }
}

/** t for the site namespace, with the brand names always available as {{app}}, {{series}}, {{heroes}}, {{methode}}. */
export function useSiteT() {
  const { t, lang } = useT('site')
  const vars = brandVars(lang)
  const ts = useCallback((key: string, opts?: Vars) => t(key, { ...vars, ...opts }) as string, [t, lang]) // eslint-disable-line react-hooks/exhaustive-deps
  return { t: ts, lang }
}

/** True when the page renders inside AppLayout (/app/...), which already provides the page container. */
export function useInApp() {
  return useLocation().pathname.startsWith('/app')
}

/** Wraps a page in the site container when it is shown outside the app. */
export function PageFrame({ children }: { children: ReactNode }) {
  const inApp = useInApp()
  if (inApp) return <>{children}</>
  return <div className="container-page pb-6 pt-8 sm:pt-12">{children}</div>
}

export type DemoLevel = 'youth' | 'pro'
/** Team ids of the two demos (mirrors DEMO_TEAMS in lib/seed.ts, kept here so the site does not load the seed module up front). */
export const DEMO_TEAM_IDS: Record<DemoLevel, string> = { youth: 'team_lionceaux', pro: 'team_etoile' }

/**
 * Launch one of the two demos and go somewhere in the app:
 *   'pro'   Étoile de la Côte, a professional senior club in Douala (Ligue 1, 22 players)
 *   'youth' Lionceaux de Bonamoussadi U13, an academy team (the team of the novel)
 * If the browser holds the person's own data, ask first: seedDemo replaces everything. Demo data is replaced without asking.
 */
export function useDemo() {
  const { t, lang } = useSiteT()
  const { profile, teams } = useSession()
  const navigate = useNavigate()
  const [pending, setPending] = useState<{ role: Role; to: string; level: DemoLevel } | null>(null)
  const [busy, setBusy] = useState(false)

  const run = useCallback(async (role: Role, to: string, level: DemoLevel) => {
    setBusy(true)
    try {
      const m = await import('../../../lib/seed')
      await m.seedDemo(role, lang, level)
      navigate(to)
    } finally {
      setBusy(false)
      setPending(null)
    }
  }, [lang, navigate])

  /** Which demo the browser holds now, if any. */
  const current: DemoLevel | null = teams.some((tm) => tm.id === DEMO_TEAM_IDS.pro) ? 'pro' : teams.some((tm) => tm.id === DEMO_TEAM_IDS.youth) ? 'youth' : null
  const onlyDemo = teams.length > 0 && teams.every((tm) => tm.id === DEMO_TEAM_IDS.pro || tm.id === DEMO_TEAM_IDS.youth)

  const launch = useCallback((role: Role = 'coach', to = '/app', level: DemoLevel = 'pro') => {
    if (busy) return
    if (profile && current === level && profile.role === role) { navigate(to); return }
    if (profile && !onlyDemo) { setPending({ role, to, level }); return }
    void run(role, to, level)
  }, [busy, profile, current, onlyDemo, navigate, run])

  /** Open a page of the app: directly when a profile exists, otherwise through a demo. */
  const open = useCallback((to: string, level: DemoLevel = 'pro', role: Role = 'coach') => {
    if (profile) navigate(to)
    else launch(role, to, level)
  }, [profile, navigate, launch])

  const dialog = (
    <Modal open={!!pending} onClose={() => !busy && setPending(null)} title={t('landing.demoModal.title')}
      footer={<>
        <button type="button" className="btn-ghost" onClick={() => setPending(null)} disabled={busy}>{t('common:actions.cancel')}</button>
        <button type="button" className="btn-primary" disabled={busy} onClick={() => pending && run(pending.role, pending.to, pending.level)}>
          {busy ? <LoaderCircle size={16} className="motion-safe:animate-spin" /> : <Play size={16} />}
          {busy ? t('landing.demoModal.busy') : t('landing.demoModal.confirm')}
        </button>
      </>}>
      <p className="text-[15px] text-ink-soft">{t('landing.demoModal.body', { demo: t(`demo.${pending?.level ?? 'pro'}.team`) })}</p>
    </Modal>
  )

  return { launch, open, busy, current, dialog }
}

/**
 * The two demo buttons, side by side: « Démo club pro » and « Démo académie U13 ».
 * dark: on a dark background. size: 'lg' in heroes, 'md' elsewhere.
 */
export function DemoChoice({ demo, role = 'coach', to = '/app', dark = false, size = 'md', className }: {
  demo: ReturnType<typeof useDemo>; role?: Role; to?: string; dark?: boolean; size?: 'md' | 'lg'; className?: string
}) {
  const { t } = useSiteT()
  const lg = size === 'lg'
  const second = dark ? 'border border-cream/30 text-cream hover:bg-white/10' : 'btn-outline'
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap ${className ?? ''}`} role="group" aria-label={t('demo.choose')}>
      <button type="button" onClick={() => demo.launch(role, to, 'pro')} disabled={demo.busy} className={`${dark ? 'btn-sun' : 'btn-primary'} ${lg ? 'btn-lg' : 'min-h-[44px]'}`}>
        <Trophy size={lg ? 18 : 16} aria-hidden="true" />{t('demo.pro.cta')}
      </button>
      <button type="button" onClick={() => demo.launch(role, to, 'youth')} disabled={demo.busy} className={`btn ${second} ${lg ? 'btn-lg' : 'min-h-[44px]'}`}>
        <GraduationCap size={lg ? 18 : 16} aria-hidden="true" />{t('demo.youth.cta')}
      </button>
    </div>
  )
}

/** Small gold uppercase label used above book titles (dark = on a dark background). */
export function GoldLabel({ children, dark = false, className = '' }: { children: ReactNode; dark?: boolean; className?: string }) {
  return <span className={`text-[11px] font-bold uppercase tracking-[0.18em] ${dark ? 'text-sun-300' : 'text-sun-700'} ${className}`}>{children}</span>
}
