// The guided tour card and its light on the page. Mounted by AppLayout; shows only while a tour runs.
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Compass, X } from 'lucide-react'
import { useT } from '../../i18n'
import { cx } from '../../lib/util'
import { TOUR_CHAPTERS, TOUR_STEPS, chapterStart, useTour, writeTour } from './tour'

export default function TourOverlay() {
  const tour = useTour()
  const { t } = useT('tour')
  const loc = useLocation()
  const navigate = useNavigate()
  const step = tour ? TOUR_STEPS[Math.min(tour.step, TOUR_STEPS.length - 1)] : null
  const [rect, setRect] = useState<DOMRect | null>(null)
  const el = useRef<Element | null>(null)
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 1024px)').matches)

  useEffect(() => {
    const m = window.matchMedia('(min-width: 1024px)')
    const f = () => setWide(m.matches)
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])

  // open the step's page
  useEffect(() => {
    if (!step) return
    if (loc.pathname + loc.search !== step.route) navigate(step.route)
  }, [tour?.step]) // eslint-disable-line react-hooks/exhaustive-deps

  // find the element to light up (pages load lazily: try for a few seconds), then follow it
  useEffect(() => {
    el.current = null
    setRect(null)
    if (!step?.target) return
    let alive = true, tries = 0, timer = 0, raf = 0
    const find = () => {
      if (!alive) return
      let found: Element | null = null
      for (const s of step.target!.split(',')) {
        let all: Element[] = []
        try { all = Array.from(document.querySelectorAll(s.trim())) } catch { all = [] }
        found = all.find((x) => { const b = x.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(x).visibility !== 'hidden' }) ?? null
        if (found) break
      }
      if (found) {
        el.current = found
        found.scrollIntoView({ block: 'center', behavior: 'smooth' })
        const loop = () => { if (!alive) return; if (el.current) setRect(el.current.getBoundingClientRect()); raf = requestAnimationFrame(loop) }
        raf = requestAnimationFrame(loop)
      } else if (tries++ < 50) timer = window.setTimeout(find, 120)
    }
    timer = window.setTimeout(find, 250)
    return () => { alive = false; clearTimeout(timer); cancelAnimationFrame(raf) }
  }, [tour?.step, loc.pathname, loc.search]) // eslint-disable-line react-hooks/exhaustive-deps

  // the Mola button sits where the card goes: hide it during the tour
  useEffect(() => {
    if (tour) document.documentElement.dataset.tour = 'on'
    else delete document.documentElement.dataset.tour
  }, [tour])

  if (!tour || !step) return null
  const i = Math.min(tour.step, TOUR_STEPS.length - 1)
  const last = i === TOUR_STEPS.length - 1
  const go = (n: number) => writeTour({ step: Math.max(0, Math.min(TOUR_STEPS.length - 1, n)) })
  const quit = () => writeTour(null)
  const chapterIndex = TOUR_CHAPTERS.indexOf(step.chapter as (typeof TOUR_CHAPTERS)[number])
  const pad = 8
  const r = rect && rect.width > 0 && rect.height > 0 ? rect : null
  // keep the card away from the light: on a wide screen, use the bottom-left corner when the element sits bottom-right
  const left = wide && !!r && (r.left + r.right) / 2 > window.innerWidth * 0.58

  return (
    <>
      {r && (
        <div aria-hidden="true" className="pointer-events-none fixed z-[70] rounded-2xl ring-[3px] ring-sun-500 transition-all duration-300"
          style={{ left: r.left - pad, top: r.top - pad, width: r.width + pad * 2, height: r.height + pad * 2, boxShadow: '0 0 0 9999px rgba(6, 26, 17, 0.42)' }} />
      )}
      <section role="dialog" aria-modal="false" aria-labelledby="tour-title"
        className={cx('fixed z-[80] rounded-card bg-night-800 p-4 text-cream shadow-lift',
          wide ? cx('bottom-6 w-[380px]', left ? 'left-[276px]' : 'right-6') : cx('inset-x-3', step.top ? 'top-16' : 'bottom-[76px]'))}>
        <div className="flex items-center gap-2 text-[12px] font-semibold text-sun-300">
          <Compass size={14} aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{t(`chapters.${step.chapter}`)}</span>
          <span className="tabular-nums text-cream/70">{t('count', { n: i + 1, total: TOUR_STEPS.length })}</span>
          <button type="button" onClick={quit} className="-mr-1 grid h-9 w-9 place-items-center rounded-full text-cream/70 hover:bg-white/10 hover:text-cream" aria-label={t('quit')}><X size={17} /></button>
        </div>
        <h2 id="tour-title" className="mt-1 font-display text-[19px] font-semibold leading-snug">{t(`steps.${step.key}.title`)}</h2>
        <p className={cx('mt-1.5 text-[14px] leading-relaxed text-cream/85', !wide && 'max-h-[34vh] overflow-y-auto')}>{t(`steps.${step.key}.body`)}</p>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-sun-500 transition-all" style={{ width: `${((i + 1) / TOUR_STEPS.length) * 100}%` }} /></div>
        <div className="mt-3 flex items-center gap-2">
          <label className="sr-only" htmlFor="tour-chapter">{t('jump')}</label>
          <select id="tour-chapter" value={chapterIndex} onChange={(e) => go(chapterStart(TOUR_CHAPTERS[Number(e.target.value)]))}
            className="min-h-[40px] min-w-0 flex-1 rounded-control border border-white/15 bg-night-900 px-2 text-[13px] text-cream">
            {TOUR_CHAPTERS.map((c, k) => <option key={c} value={k}>{t(`chapters.${c}`)}</option>)}
          </select>
          <button type="button" onClick={() => go(i - 1)} disabled={i === 0} className="grid h-10 w-10 place-items-center rounded-control border border-white/15 text-cream disabled:opacity-40" aria-label={t('prev')}><ArrowLeft size={17} /></button>
          {last
            ? <button type="button" onClick={quit} className="btn-sun min-h-[40px] px-4">{t('finish')}</button>
            : <button type="button" onClick={() => go(i + 1)} className="btn-sun min-h-[40px] px-4">{t('next')}<ArrowRight size={16} /></button>}
        </div>
      </section>
    </>
  )
}
