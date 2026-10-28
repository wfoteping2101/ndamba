import { useCallback, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LoaderCircle, Play } from 'lucide-react'
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

/**
 * Launch the demo (Lionceaux de Bonamoussadi U13) and go somewhere in the app.
 * If the browser already holds other data, ask first: seedDemo replaces everything.
 */
export function useDemo() {
  const { t, lang } = useSiteT()
  const { profile, teams } = useSession()
  const navigate = useNavigate()
  const [pending, setPending] = useState<{ role: Role; to: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const run = useCallback(async (role: Role, to: string) => {
    setBusy(true)
    try {
      const m = await import('../../../lib/seed')
      await m.seedDemo(role, lang)
      navigate(to)
    } finally {
      setBusy(false)
      setPending(null)
    }
  }, [lang, navigate])

  const launch = useCallback((role: Role = 'coach', to = '/app') => {
    if (busy) return
    const isDemo = teams.some((tm) => tm.id === 'team_lionceaux')
    if (profile && isDemo && profile.role === role) { navigate(to); return }
    if (profile) { setPending({ role, to }); return }
    void run(role, to)
  }, [busy, profile, teams, navigate, run])

  const dialog = (
    <Modal open={!!pending} onClose={() => !busy && setPending(null)} title={t('landing.demoModal.title')}
      footer={<>
        <button type="button" className="btn-ghost" onClick={() => setPending(null)} disabled={busy}>{t('common:actions.cancel')}</button>
        <button type="button" className="btn-primary" disabled={busy} onClick={() => pending && run(pending.role, pending.to)}>
          {busy ? <LoaderCircle size={16} className="motion-safe:animate-spin" /> : <Play size={16} />}
          {busy ? t('landing.demoModal.busy') : t('landing.demoModal.confirm')}
        </button>
      </>}>
      <p className="text-[15px] text-ink-soft">{t('landing.demoModal.body')}</p>
    </Modal>
  )

  return { launch, busy, dialog }
}

/** Small gold uppercase label used above book titles (dark = on a dark background). */
export function GoldLabel({ children, dark = false, className = '' }: { children: ReactNode; dark?: boolean; className?: string }) {
  return <span className={`text-[11px] font-bold uppercase tracking-[0.18em] ${dark ? 'text-sun-300' : 'text-sun-700'} ${className}`}>{children}</span>
}
