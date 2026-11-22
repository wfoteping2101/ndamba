// /visite: the guided tour's front door. Loads the professional club demo (Étoile de la Côte, Douala),
// then walks through every part of the app, chapter by chapter, on that demo.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Clock, Compass } from 'lucide-react'
import { useT } from '../../i18n'
import { Logo } from '../../ui'
import { useSession } from '../../lib/session'
import { DEMO_TEAMS } from '../../lib/seed'
import { TOUR_CHAPTERS, TOUR_STEPS, chapterStart, writeTour } from './tour'

/** Fills the browser with the full demo: the pro club, its other teams and members, pickup games. */
export async function loadTourDemo(lang: 'fr' | 'en') {
  const { seedDemo } = await import('../../lib/seed')
  await seedDemo('coach', lang, 'pro')
}

export default function TourStart() {
  const { t, lang } = useT('tour')
  const { profile, teams } = useSession()
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<number | null>(null)
  const ownData = !!profile && teams.some((tm) => tm.id !== DEMO_TEAMS.pro && tm.id !== DEMO_TEAMS.youth)

  const start = async (step: number) => {
    if (ownData && confirm === null) { setConfirm(step); return }
    setBusy(true)
    try {
      await loadTourDemo(lang === 'en' ? 'en' : 'fr')
      writeTour({ step })
      location.href = TOUR_STEPS[step].route
    } catch (e) { console.error('[tour]', e); setBusy(false) }
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/" aria-label="Ndamba"><Logo /></Link>
        <Link to="/" className="text-[14px] font-semibold text-ink-soft hover:text-ink">{t('back')}</Link>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <section className="rounded-card bg-night-800 px-5 py-8 text-cream sm:px-10 sm:py-12">
          <p className="inline-flex items-center gap-2 text-[13px] font-semibold text-sun-300"><Compass size={15} aria-hidden="true" />{t('kicker')}</p>
          <h1 className="mt-2 max-w-2xl font-display text-[32px] font-semibold leading-tight sm:text-[44px]">{t('title')}</h1>
          <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-cream/85">{t('intro')}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="button" className="btn-sun btn-lg" disabled={busy} onClick={() => start(0)}>{busy ? t('loading') : t('start')}<ArrowRight size={18} /></button>
            <span className="inline-flex items-center gap-1.5 text-[14px] text-cream/75"><Clock size={15} aria-hidden="true" />{t('duration', { n: TOUR_STEPS.length })}</span>
          </div>
          <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-cream/65">{t('note')}</p>
        </section>

        {confirm !== null && (
          <div role="alert" className="mt-5 rounded-card border border-sun-300 bg-sun-50 p-4 text-[14px] text-ink">
            <p>{t('ownData')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn-primary" onClick={() => start(confirm)} disabled={busy}>{t('ownDataGo')}</button>
              <button type="button" className="btn-ghost" onClick={() => setConfirm(null)}>{t('cancel')}</button>
            </div>
          </div>
        )}

        <h2 className="mt-10 font-display text-2xl font-semibold text-ink">{t('chaptersTitle')}</h2>
        <p className="mt-1 text-[14px] text-ink-muted">{t('chaptersHint')}</p>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2">
          {TOUR_CHAPTERS.filter((c) => c !== 'end').map((c, k) => {
            const n = TOUR_STEPS.filter((s) => s.chapter === c).length
            return (
              <li key={c}>
                <button type="button" disabled={busy} onClick={() => start(chapterStart(c))}
                  className="flex w-full items-start gap-3 rounded-card border border-line bg-paper p-4 text-left transition hover:border-forest-300 hover:bg-forest-50">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-forest-600 font-display text-[15px] font-semibold text-cream">{k + 1}</span>
                  <span className="min-w-0">
                    <span className="block text-[15.5px] font-semibold text-ink">{t(`chapters.${c}`)}</span>
                    <span className="mt-0.5 block text-[13.5px] leading-snug text-ink-muted">{t(`chapterText.${c}`)}</span>
                    <span className="mt-1 block text-[12.5px] text-ink-faint">{t('steps_count', { count: n })}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </main>
    </div>
  )
}
