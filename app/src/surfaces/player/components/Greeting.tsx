// The greeting band at the top of the home page: name, date, and a line that rotates
// between the motto, the mantra and the lesson of the day.
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useT } from '../../../i18n'
import { cx, fmtDate } from '../../../lib/util'
import { usePrefersReducedMotion } from './data'

/** First name, keeping honorifics whole: "Tonton Fokou" stays "Tonton Fokou", "William Foteping" becomes "William". */
const HONORIFICS = ['tonton', 'tata', 'coach', 'mami', 'papa', 'maman', 'monsieur', 'madame', 'mr', 'mrs', 'ms', 'dr', 'm.', 'mme', 'coach.']
function callName(name: string) {
  const w = name.trim().split(/\s+/).filter(Boolean)
  if (!w.length) return ''
  return HONORIFICS.includes(w[0].toLowerCase()) && w[1] ? `${w[0]} ${w[1]}` : w[0]
}

export interface RotatingLine { label: string; text: string; to?: string }

function hello(lang: 'fr' | 'en', h: number) {
  if (lang === 'fr') return h >= 18 || h < 4 ? 'evening' : 'day'
  return h < 4 || h >= 18 ? 'evening' : h < 12 ? 'morning' : 'afternoon'
}

export function Greeting({ name, today, lines, tone = 'forest', aside, children }: { name: string; today: string; lines: RotatingLine[]; tone?: 'forest' | 'night'; aside?: ReactNode; children?: ReactNode }) {
  const { t, lang } = useT('player')
  const reduce = usePrefersReducedMotion()
  const [i, setI] = useState(0)
  const [shown, setShown] = useState(true)
  const n = lines.length

  useEffect(() => {
    if (reduce || n < 2) return
    const id = window.setInterval(() => {
      setShown(false)
      window.setTimeout(() => { setI((v) => (v + 1) % n); setShown(true) }, 280)
    }, 8000)
    return () => window.clearInterval(id)
  }, [reduce, n])

  const line = lines[i % Math.max(1, n)]
  const first = callName(name)
  const greet = t(`greeting.${hello(lang, new Date().getHours())}`, { name: first })

  return (
    <section className={cx('relative mb-5 overflow-hidden rounded-[28px] text-cream shadow-card sm:mb-6', tone === 'night' ? 'bg-night-800' : 'bg-forest-600')}>
      {/* soft light, no illustration */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sun-500/15 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-terra-500/20 blur-3xl" />
      <div className="relative grid grid-cols-1 gap-5 px-5 pb-6 pt-5 sm:px-7 sm:pb-7 sm:pt-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sun-300">{fmtDate(today, lang, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <h1 className="mt-1 font-display text-[30px] font-semibold leading-[1.1] sm:text-[40px]">{greet}</h1>
          {line && (
            <div className="mt-3 flex max-w-2xl items-start gap-2">
              <figure className={cx('min-h-[64px] min-w-0 flex-1 transition-opacity duration-300', shown ? 'opacity-100' : 'opacity-0')}>
                <figcaption className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cream/60">{line.label}</figcaption>
                <blockquote className="mt-0.5 font-display text-[18px] italic leading-snug text-cream sm:text-[21px]">
                  {line.to ? <Link to={line.to} className="decoration-sun-300/60 underline-offset-4 hover:underline">{line.text}</Link> : line.text}
                </blockquote>
              </figure>
              {n > 1 && (
                <button type="button" onClick={() => { setI((v) => (v + 1) % n); setShown(true) }} aria-label={t('greeting.next')}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-cream/70 transition hover:bg-white/10 hover:text-cream">
                  <ChevronRight size={20} aria-hidden="true" />
                </button>
              )}
            </div>
          )}
          {children}
        </div>
        {aside && <div className="min-w-0">{aside}</div>}
      </div>
      <div aria-hidden="true" className="relative flex h-1.5">
        <span className="flex-1 bg-forest-500" /><span className="flex-1 bg-clay-500" /><span className="flex-1 bg-sun-500" /><span className="flex-1 bg-terra-500" /><span className="flex-1 bg-forest-800" />
      </div>
    </section>
  )
}
