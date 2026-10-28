import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight, ImageIcon, LoaderCircle, MessageSquarePlus } from 'lucide-react'
import { FAMILIES, drillText } from '../../../content'
import type { ArtImage } from '../../../content/art.gen'
import type { Drill, Role } from '../../../lib/types'
import { useSession } from '../../../lib/session'
import { cx } from '../../../lib/util'
import { Modal, Pitch } from '../../../ui'
import { useDemo, useSiteT, type DemoLevel } from './brand'

type Demo = ReturnType<typeof useDemo>

/* ---------------- opening the app (through a demo when there is no profile yet) ---------------- */

/** A link into /app. Without a profile, the app would send the visitor to onboarding: load the right demo first instead. */
export function AppLink({ demo, to, level = 'pro', role = 'coach', className, children, label }: {
  demo: Demo; to: string; level?: DemoLevel; role?: Role; className?: string; children: ReactNode; label?: string
}) {
  const { profile } = useSession()
  const onClick = (e: MouseEvent) => { if (!profile) { e.preventDefault(); demo.open(to, level, role) } }
  return <Link to={to} onClick={onClick} className={className} aria-label={label}>{children}</Link>
}

/** « Demander une modification »: opens Mola with the request pre-filled (/app/mola?q=...). */
export function RequestButton({ demo, subject, compact = false, dark = false, className }: { demo: Demo; subject: string; compact?: boolean; dark?: boolean; className?: string }) {
  const { t } = useSiteT()
  const text = t('review.requestText', { section: subject })
  const go = () => demo.open(`/app/mola?q=${encodeURIComponent(text)}`, 'pro')
  return (
    <button type="button" onClick={go} disabled={demo.busy} aria-label={compact ? `${t('review.request')} : ${subject}` : undefined}
      className={cx(compact ? 'btn btn-sm min-h-[40px]' : 'btn min-h-[44px]', dark ? 'border border-cream/30 text-cream hover:bg-white/10' : compact ? 'text-forest-700 hover:bg-forest-50' : 'border border-forest-600 text-forest-700 hover:bg-forest-50', className)}>
      {demo.busy ? <LoaderCircle size={16} className="motion-safe:animate-spin" aria-hidden="true" /> : <MessageSquarePlus size={16} aria-hidden="true" />}
      {compact ? t('review.requestShort') : t('review.request')}
    </button>
  )
}

/** Renders its children only when it comes near the viewport (heavy SVG diagrams, long lists). */
export function LazyMount({ children, placeholder, className }: { children: ReactNode; placeholder?: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setOn(true); return }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setOn(true); io.disconnect() } }, { rootMargin: '600px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return <div ref={ref} className={className}>{on ? children : placeholder}</div>
}

/* ---------------- the Lionceaux gallery ---------------- */

const IMG = '/book/tome1/img/'
const COUNTRY_FR = ['', 'Cameroun', 'États-Unis', 'France', 'Espagne', 'Angleterre']

export function useArtLabel() {
  const { t } = useSiteT()
  return (a: ArtImage) => {
    if (a.kind === 'cover') return t('review.tome1.label.cover')
    if (a.kind === 'part') return `${t('review.tome1.label.part', { n: a.part })} · ${COUNTRY_FR[a.part ?? 0] ?? ''}`
    if (a.kind === 'chapter') return t('review.tome1.label.chapter', { n: a.chapter })
    return a.file === 'family' ? t('review.tome1.label.family') : t('review.tome1.label.characters')
  }
}

function Thumb({ a, sizes, eager = false, className }: { a: ArtImage; sizes: string; eager?: boolean; className?: string }) {
  const src = a.thumb ? `${IMG}${a.file}-480.jpg` : `${IMG}${a.file}.jpg`
  return (
    <picture>
      {a.webp && <source type="image/webp" srcSet={`${IMG}${a.file}-480.webp 480w`} sizes={sizes} />}
      <img src={src} alt={a.alt} width={480} height={Math.round((480 * a.h) / a.w)} loading={eager ? 'eager' : 'lazy'} decoding="async" className={className} />
    </picture>
  )
}

export function ArtGallery({ art, planned, demo, book }: { art: ArtImage[]; planned: number; demo: Demo; book: string }) {
  const { t } = useSiteT()
  const label = useArtLabel()
  const [open, setOpen] = useState<number | null>(null)
  const left = Math.max(0, planned - art.length)
  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {art.map((a, i) => (
          <li key={a.file}>
            <button type="button" onClick={() => setOpen(i)} className="group block h-full w-full overflow-hidden rounded-2xl border border-line bg-paper text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-lift focus-visible:-translate-y-0.5 motion-reduce:transition-none">
              <span className="relative block aspect-[2/3] overflow-hidden bg-sand">
                <Thumb a={a} sizes="(min-width: 1024px) 270px, (min-width: 640px) 33vw, 50vw" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] motion-reduce:transition-none" />
                {a.status === 'redo' && <span className="absolute left-2 top-2 rounded-full bg-clay-500 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-white">{t('review.tome1.status.redo')}</span>}
              </span>
              <span className="block px-3 pb-3 pt-2.5">
                <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-terra-600">{label(a)}</span>
                {a.title && <span className="mt-0.5 block truncate font-display text-[15px] font-semibold text-ink">{a.title}</span>}
                <span className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-ink-muted">{a.alt}</span>
              </span>
            </button>
          </li>
        ))}
        {left > 0 && (
          <li className="flex aspect-[2/3] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line bg-sand/40 p-4 text-center sm:aspect-auto sm:min-h-full">
            <ImageIcon size={26} className="text-terra-500" aria-hidden="true" />
            <span className="mt-2 font-display text-[22px] font-semibold text-ink">{t('review.tome1.pending', { n: left })}</span>
            <span className="mt-1 text-[12.5px] leading-snug text-ink-muted">{t('review.tome1.pendingBody')}</span>
          </li>
        )}
      </ul>
      {open !== null && art[open] && <Lightbox art={art} index={open} onIndex={setOpen} onClose={() => setOpen(null)} demo={demo} book={book} />}
    </>
  )
}

function Lightbox({ art, index, onIndex, onClose, demo, book }: { art: ArtImage[]; index: number; onIndex: (i: number) => void; onClose: () => void; demo: Demo; book: string }) {
  const { t } = useSiteT()
  const label = useArtLabel()
  const a = art[index]
  const n = art.length
  const prev = () => onIndex((index - 1 + n) % n)
  const next = () => onIndex((index + 1) % n)
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'ArrowLeft') prev(); if (e.key === 'ArrowRight') next() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })
  const full = `${IMG}${a.file}`
  const sizes = '(min-width: 640px) 420px, 88vw'
  const name = `${label(a)}${a.title ? ` · ${a.title}` : ''}`
  return (
    <Modal open onClose={onClose} title={name} wide
      footer={<div className="flex w-full items-center justify-between gap-2">
        <button type="button" className="btn-ghost min-h-[44px]" onClick={prev} aria-label={t('review.tome1.prev')}><ChevronLeft size={18} /><span className="hidden sm:inline">{t('review.tome1.prev')}</span></button>
        <span className="text-[13px] tabular-nums text-ink-muted">{t('review.tome1.counter', { i: index + 1, n })}</span>
        <button type="button" className="btn-ghost min-h-[44px]" onClick={next} aria-label={t('review.tome1.next')}><span className="hidden sm:inline">{t('review.tome1.next')}</span><ChevronRight size={18} /></button>
      </div>}>
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,15rem)] sm:items-start">
        <picture key={a.file}>
          {a.webp && <source type="image/webp" srcSet={`${full}-480.webp 480w, ${full}.webp ${a.w}w`} sizes={sizes} />}
          <img src={`${full}.jpg`} srcSet={a.thumb ? `${full}-480.jpg 480w, ${full}.jpg ${a.w}w` : undefined} sizes={a.thumb ? sizes : undefined} alt={a.alt} width={a.w} height={a.h}
            className="mx-auto h-auto max-h-[60vh] w-auto max-w-full rounded-xl bg-sand shadow-card" decoding="async" />
        </picture>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-terra-600">{label(a)}</p>
          {a.title && <p className="mt-1 font-display text-[20px] font-semibold leading-tight text-ink">{a.title}</p>}
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">{a.alt}</p>
          {a.note && (
            <div className="mt-4 rounded-xl bg-sand/60 px-3 py-2.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">{t('review.tome1.reviewNote')}{a.status ? ` · ${t(`review.tome1.status.${a.status}`)}` : ''}</p>
              <p className="mt-1 text-[13px] leading-snug text-ink-soft">{a.note}</p>
            </div>
          )}
          <RequestButton demo={demo} subject={t('review.tome1.imageRequestText', { book, label: name })} className="mt-4 w-full sm:w-auto" />
        </div>
      </div>
    </Modal>
  )
}

/* ---------------- the drills of Le Code Njangi ---------------- */

const FAMILY_TONE: Record<string, string> = {
  technique: 'bg-ink-soft text-cream', rondo: 'bg-forest-600 text-cream', position: 'bg-forest-800 text-cream', ssg: 'bg-terra-500 text-white',
  lsg: 'bg-terra-700 text-cream', phase: 'bg-sun-500 text-ink', transition: 'bg-clay-500 text-white', finishing: 'bg-sun-700 text-cream',
}

export function DrillGrid({ drills, demo }: { drills: Drill[]; demo: Demo }) {
  const { t, lang } = useSiteT()
  const [fam, setFam] = useState<string>('all')
  const present = useMemo(() => FAMILIES.filter((f) => drills.some((d) => d.family === f)), [drills])
  const list = fam === 'all' ? drills : drills.filter((d) => d.family === fam)
  return (
    <div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label={t('review.methode.drillsTitle', { n: drills.length })}>
        {['all', ...present].map((f) => {
          const n = f === 'all' ? drills.length : drills.filter((d) => d.family === f).length
          return (
            <button key={f} type="button" aria-pressed={fam === f} onClick={() => setFam(f)}
              className={cx('inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition', fam === f ? 'border-forest-600 bg-forest-600 text-cream' : 'border-line bg-paper text-ink-soft hover:border-forest-300')}>
              {f === 'all' ? t('review.methode.all') : t(`common:families.${f}`)}<span className="opacity-60">{n}</span>
            </button>
          )
        })}
      </div>
      <ul className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {list.map((d) => {
          const tx = drillText(d, lang)
          return (
            <li key={d.id} className="min-w-0">
              <AppLink demo={demo} to={`/app/exercices/${d.id}`} label={t('review.methode.openDrill', { code: d.id })}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-card transition hover:-translate-y-0.5 hover:shadow-lift motion-reduce:transition-none">
                <span className="flex items-start gap-2 px-3 pb-2 pt-3">
                  <span className={cx('shrink-0 rounded-md px-1.5 py-0.5 font-display text-[13px] font-semibold tabular-nums', FAMILY_TONE[d.family] ?? 'bg-forest-600 text-cream')}>{d.id}</span>
                  <span className="min-w-0 text-[11px] font-semibold uppercase leading-tight tracking-wide text-ink-faint">{t(`common:families.${d.family}`)}</span>
                </span>
                <span className="block px-3 font-display text-[15px] font-semibold leading-snug text-ink sm:text-[16px]">{tx.title}</span>
                <LazyMount className="px-2 pb-1 pt-2" placeholder={<span className="block aspect-[3/2] rounded-xl bg-sand/60" />}>
                  <Pitch spec={d.diagram} width={420} title={tx.title} className="border border-line" />
                </LazyMount>
                <span className="mt-auto flex items-center justify-between gap-2 px-3 pb-3 pt-1 text-[12px] text-ink-muted">
                  <span className="truncate">{t('review.methode.drillMeta', { ages: d.ages, minutes: d.minutes })}</span>
                  <ArrowRight size={14} className="shrink-0 text-forest-600 transition group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </AppLink>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
