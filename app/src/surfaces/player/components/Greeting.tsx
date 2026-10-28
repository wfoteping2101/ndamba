// The greeting band at the top of the home pages: the date, the name, one line (the motto, the mantra or the
// lesson of the day; the button turns to the next) and the few numbers that matter today.
// A pitch at dusk: the halfway line and the centre circle drawn in chalk, nothing else.
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useT } from '../../../i18n'
import { cx, fmtDate } from '../../../lib/util'

/** First name, keeping honorifics whole: "Tonton Fokou" stays "Tonton Fokou", "William Foteping" becomes "William". */
const HONORIFICS = ['tonton', 'tata', 'coach', 'mami', 'papa', 'maman', 'monsieur', 'madame', 'mr', 'mrs', 'ms', 'dr', 'm.', 'mme', 'coach.']
export function callName(name: string) {
  const w = name.trim().split(/\s+/).filter(Boolean)
  if (!w.length) return ''
  return HONORIFICS.includes(w[0].toLowerCase()) && w[1] ? `${w[0]} ${w[1]}` : w[0]
}

export interface RotatingLine { label: string; text: string; to?: string }

function hello(lang: 'fr' | 'en', h: number) {
  if (lang === 'fr') return h >= 18 || h < 4 ? 'evening' : 'day'
  return h < 4 || h >= 18 ? 'evening' : h < 12 ? 'morning' : 'afternoon'
}

/** The halfway line and the centre circle, in chalk, on the right of a dark band. */
export function PitchLines({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" className={cx('pointer-events-none absolute inset-y-0 right-0 h-full w-[70%] max-w-[560px] text-cream/[0.07]', className)}>
      <line x1="250" y1="-10" x2="250" y2="410" stroke="currentColor" strokeWidth="3" />
      <circle cx="250" cy="200" r="118" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="250" cy="200" r="6" fill="currentColor" />
    </svg>
  )
}

export function Greeting({ name, today, lines, tone = 'forest', aside, children }: { name: string; today: string; lines: RotatingLine[]; tone?: 'forest' | 'night'; aside?: ReactNode; children?: ReactNode }) {
  const { t, lang } = useT('player')
  const [i, setI] = useState(0)
  const n = lines.length
  const line = lines[i % Math.max(1, n)]
  const greet = t(`greeting.${hello(lang, new Date().getHours())}`, { name: callName(name) })

  return (
    <section className={cx('relative mb-6 overflow-hidden rounded-[22px] text-cream sm:mb-8', tone === 'night' ? 'bg-night-800' : 'bg-forest-700')}>
      <PitchLines />
      <div className="relative grid grid-cols-1 gap-6 px-5 pb-6 pt-5 sm:px-8 sm:pb-8 sm:pt-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-cream/65 first-letter:uppercase">{fmtDate(today, lang, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="mt-1.5 text-[34px] sm:text-[46px]">{greet}</h1>
          {line && (
            <div className="mt-5 flex max-w-2xl items-start gap-2">
              <figure className="min-w-0 flex-1 border-l-2 border-cream/25 pl-4">
                <figcaption className="text-[13px] font-semibold text-cream/60">{line.label}</figcaption>
                <blockquote className="mt-1 text-[18px] font-medium italic leading-snug text-cream sm:text-[20px]">
                  {line.to ? <Link to={line.to} className="decoration-cream/40 underline-offset-4 hover:underline">{line.text}</Link> : line.text}
                </blockquote>
              </figure>
              {n > 1 && (
                <button type="button" onClick={() => setI((v) => (v + 1) % n)} aria-label={t('greeting.next')}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-cream/60 transition hover:bg-white/10 hover:text-cream">
                  <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" />
                </button>
              )}
            </div>
          )}
          {children}
        </div>
        {aside && <div className="min-w-0">{aside}</div>}
      </div>
    </section>
  )
}

/** The three or four numbers of the band, side by side with chalk hairlines between them (no boxes).
 *  Four numbers sit two by two on phones and in one row from 640 px. */
export function HeroFigures({ items, className }: { items: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode }[]; className?: string }) {
  const four = items.length === 4
  const cell = (i: number) => four
    ? cx(i % 2 === 1 && 'border-l', i >= 2 && 'border-t sm:border-t-0', i === 2 && 'sm:border-l')
    : cx(i > 0 && 'border-l')
  return (
    <dl className={cx('grid overflow-hidden rounded-[14px] border border-white/15 bg-white/[0.04]', four ? 'grid-cols-2 sm:grid-cols-4' : items.length === 2 ? 'grid-cols-2' : 'grid-cols-3', className)}>
      {items.map((it, i) => (
        <div key={it.label} className={cx('min-w-0 border-white/15 px-3 py-3 sm:px-4', cell(i))}>
          <dt className="flex items-center gap-1.5 truncate text-[12.5px] font-medium text-cream/65">{it.icon}{it.label}</dt>
          <dd className="mt-0.5 font-display text-[20px] leading-tight tabular-nums text-cream [overflow-wrap:anywhere] sm:text-[23px]">{it.value}</dd>
          {it.sub && <dd className="truncate text-[12px] text-cream/55">{it.sub}</dd>}
        </div>
      ))}
    </dl>
  )
}
