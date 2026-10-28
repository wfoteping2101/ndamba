// /marque: the Ndamba identity on one page, so William can review it in the browser.
// Uses the marks from src/ui/brand.tsx as they are (never redrawn here).
import type { CSSProperties, ReactNode } from 'react'
import { Check, X } from 'lucide-react'
import { BRAND_COLORS, MolaAvatar, MolaMark, NdambaMark, NdambaWordmark } from '../../ui/brand'
import { Badge } from '../../ui'
import { BRAND } from '../../lib/config'
import { useDocumentTitle } from '../../lib/hooks'
import { cx } from '../../lib/util'
import { useSiteT } from './components/brand'

const PIECES = ['le cœur', 'la raison', 'les yeux', 'la carte', 'le souffle'] as const

export default function Brand() {
  const { t } = useSiteT()
  useDocumentTitle(t('brand.docTitle'))
  return (
    <div className="container-page pt-10 sm:pt-14">
      <header className="max-w-3xl">
        <h1 className="text-balance text-[38px] text-ink sm:text-[56px]">{t('brand.title')}</h1>
        <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-ink-muted sm:text-[17px]">{t('brand.lead')}</p>
      </header>

      <Logo />
      <Sizes />
      <Construction />
      <Mola />
      <Colors />
      <Type />
      <Rules />
      <Icons />
    </div>
  )
}

/** One section of the brand book: its title on the left, the specimens on the right. */
function Part({ title, body, children, id }: { title: string; body?: ReactNode; children: ReactNode; id: string }) {
  return (
    <section id={id} className="mt-14 grid scroll-mt-24 gap-6 border-t border-line pt-8 sm:mt-20 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] lg:gap-14 lg:pt-10" aria-labelledby={`${id}-title`}>
      <div>
        <h2 id={`${id}-title`} className="text-[24px] leading-tight text-ink sm:text-[28px]">{title}</h2>
        {body && <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">{body}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

/** The lockup at a chosen scale (the NdambaLogo proportions: mark 52, word 38, gap 16). */
function Lockup({ scale, light = false }: { scale: number; light?: boolean }) {
  return (
    <span className="inline-flex items-center" style={{ gap: 16 * scale }}>
      <NdambaMark size={Math.round(52 * scale)} tone={light ? 'light' : 'color'} />
      <NdambaWordmark height={Math.round(38 * scale)} color={light ? BRAND_COLORS.chalk : BRAND_COLORS.ink} />
    </span>
  )
}

function Caption({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return <p className={cx('mt-3 text-[13.5px] leading-snug', dark ? 'text-cream/70' : 'text-ink-muted')}>{children}</p>
}

/* ---------------- the logo ---------------- */

function Logo() {
  const { t } = useSiteT()
  const panels = [
    { light: false, cls: 'border border-line bg-cream', caption: t('brand.logo.onLight') },
    { light: true, cls: 'bg-forest-600', caption: t('brand.logo.onPitch') },
  ]
  return (
    <Part id="logo" title={t('brand.logo.title')} body={t('brand.logo.body')}>
      <div className="space-y-6">
        {panels.map((p) => (
          <figure key={String(p.light)}>
            <div className={cx('grid h-52 place-items-center rounded-panel px-6 sm:h-72 lg:h-80', p.cls)}>
              <span className="sm:hidden"><Lockup scale={0.82} light={p.light} /></span>
              <span className="hidden sm:inline-flex lg:hidden"><Lockup scale={1.4} light={p.light} /></span>
              <span className="hidden lg:inline-flex"><Lockup scale={1.85} light={p.light} /></span>
              <span className="sr-only">Ndamba</span>
            </div>
            <Caption>{p.caption}</Caption>
          </figure>
        ))}
      </div>
    </Part>
  )
}

/* ---------------- the mark at four sizes ---------------- */

function Sizes() {
  const { t } = useSiteT()
  const sizes = [128, 48, 24, 16]
  return (
    <Part id="tailles" title={t('brand.sizes.title')} body={t('brand.sizes.body')}>
      <ul className="flex flex-wrap items-end gap-x-7 gap-y-8 rounded-panel border border-line bg-paper px-6 py-8 sm:gap-x-12 sm:px-10 sm:py-10">
        {sizes.map((s) => (
          <li key={s} className="flex flex-col items-start">
            <NdambaMark size={s} title={`Ndamba, ${s} px`} />
            <span className="num mt-3 text-[13px] font-semibold text-ink-muted">{t('brand.sizes.px', { n: s })}</span>
          </li>
        ))}
      </ul>
      <ul className="mt-4 flex flex-wrap items-end gap-x-7 gap-y-8 rounded-panel bg-forest-800 px-6 py-8 sm:gap-x-12 sm:px-10">
        {sizes.map((s) => (
          <li key={s} className="flex flex-col items-start">
            <NdambaMark size={s} tone="light" />
            <span className="num mt-3 text-[13px] font-semibold text-cream/60">{t('brand.sizes.px', { n: s })}</span>
          </li>
        ))}
      </ul>
    </Part>
  )
}

/* ---------------- the construction ---------------- */

function Construction() {
  const { t } = useSiteT()
  return (
    <Part id="construction" title={t('brand.construction.title')}>
      <div className="grid items-center gap-8 rounded-panel border border-line bg-paper p-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-12 sm:p-10">
        <NdambaMark size={176} className="mx-auto sm:mx-0" title="Ndamba" />
        <div className="min-w-0">
          <p className="font-display text-[22px] leading-snug text-ink sm:text-[26px]">{t('brand.construction.a')}</p>
          <p className="mt-4 text-[17px] leading-relaxed text-ink-soft">{t('brand.construction.b')}</p>
          <p className="mt-6 text-[13px] font-semibold text-ink-muted">{t('brand.construction.pieces')}</p>
          <ol className="mt-2 flex flex-wrap gap-2">
            {PIECES.map((p) => <li key={p} className="chip font-semibold">{t(`common:pieces.${p}`)}</li>)}
          </ol>
        </div>
      </div>
    </Part>
  )
}

/* ---------------- Mola ---------------- */

function Mola() {
  const { t } = useSiteT()
  return (
    <Part id="mola" title={t('brand.mola.title')} body={t('brand.mola.body')}>
      <div className="grid gap-4 xl:grid-cols-2">
        <figure className="flex flex-col rounded-panel border border-line bg-paper p-6 sm:p-8">
          <div className="flex flex-1 flex-wrap items-end gap-x-10 gap-y-6">
            <MolaMark size={112} nodes className="text-ink" title="Mola" />
            <MolaMark size={40} className="text-ink" />
            <MolaMark size={20} className="text-ink" />
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-6">
            <span className="btn-sun pointer-events-none" aria-hidden="true"><MolaMark size={18} ball={BRAND_COLORS.pitch} />{t('brand.mola.button')}</span>
            <span className="btn-primary pointer-events-none" aria-hidden="true"><MolaMark size={18} />{t('brand.mola.button')}</span>
            <Badge tone="forest"><MolaMark size={13} />{t('brand.mola.made')}</Badge>
          </div>
          <Caption>{t('brand.mola.sign')}</Caption>
        </figure>
        <figure className="flex flex-col rounded-panel bg-forest-800 p-6 sm:p-8">
          <div className="flex flex-1 flex-wrap items-end gap-x-8 gap-y-6">
            <MolaAvatar size={112} title="Mola" />
            <MolaAvatar size={56} />
            <MolaAvatar size={32} />
          </div>
          <Caption dark>{t('brand.mola.badge')}</Caption>
        </figure>
      </div>
    </Part>
  )
}

/* ---------------- colours ---------------- */

type Swatch = { k: string; hex: string; dark?: boolean; border?: boolean }
const CORE: Swatch[] = [
  { k: 'pitch', hex: '#0B5D3B', dark: true },
  { k: 'gold', hex: '#F5B700' },
  { k: 'chalk', hex: '#F6F7F2', border: true },
  { k: 'ink', hex: '#12211A', dark: true },
]
const SUPPORT: Swatch[] = [
  { k: 'paper', hex: '#FFFFFF', border: true },
  { k: 'mist', hex: '#ECEFE8', border: true },
  { k: 'line', hex: '#DCE2D8' },
  { k: 'pitchLight', hex: '#13804F', dark: true },
  { k: 'pitchDeep', hex: '#063A25', dark: true },
  { k: 'night', hex: '#0A2117', dark: true },
  { k: 'kola', hex: '#D7263D', dark: true },
  { k: 'earth', hex: '#BF5A2E', dark: true },
]

function SwatchCard({ s, big = false }: { s: Swatch; big?: boolean }) {
  const { t } = useSiteT()
  return (
    <li className="min-w-0">
      <div className={cx('flex items-end rounded-card p-3', big ? 'h-32 sm:h-40' : 'h-20', s.border && 'border border-line')} style={{ background: s.hex }}>
        <span className={cx('num text-[12.5px] font-semibold', s.dark ? 'text-white/85' : 'text-ink/70')}>{s.hex}</span>
      </div>
      <p className="mt-2.5 text-[14.5px] font-semibold text-ink">{t(`brand.colors.items.${s.k}.name`)}</p>
      <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">{t(`brand.colors.items.${s.k}.role`)}</p>
    </li>
  )
}

function Colors() {
  const { t } = useSiteT()
  return (
    <Part id="couleurs" title={t('brand.colors.title')} body={t('brand.colors.body')}>
      <p className="text-[13px] font-semibold text-ink-muted">{t('brand.colors.core')}</p>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-4">
        {CORE.map((s) => <SwatchCard key={s.k} s={s} big />)}
      </ul>
      <p className="mt-10 text-[13px] font-semibold text-ink-muted">{t('brand.colors.support')}</p>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
        {SUPPORT.map((s) => <SwatchCard key={s.k} s={s} />)}
      </ul>
    </Part>
  )
}

/* ---------------- type ---------------- */

function Spec({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-line py-6 first:pt-0 last:border-b-0 last:pb-0">
      <p className="mb-3 text-[13px] font-semibold text-ink-muted">{label}</p>
      {children}
    </div>
  )
}

function Type() {
  const { t, lang } = useSiteT()
  const it: CSSProperties = { fontStretch: '100%' }
  return (
    <Part id="typographie" title={t('brand.type.title')} body={t('brand.type.body')}>
      <div className="rounded-panel border border-line bg-paper p-6 sm:p-10">
        <Spec label={t('brand.type.display')}>
          <p className="font-display text-[44px] leading-[1.02] text-ink sm:text-[68px]" style={{ letterSpacing: '-0.026em' }}>{t('brand.type.displaySample')}</p>
          <div className="mt-5 space-y-2 text-ink">
            <p className="font-display text-[30px] leading-tight">{t('brand.type.scale')}</p>
            <p className="font-display text-[20px] leading-tight">{t('brand.type.scale')}</p>
          </div>
        </Spec>
        <Spec label={t('brand.type.text')}>
          <p className="max-w-[62ch] text-[16px] leading-[1.6] text-ink-soft">{t('brand.type.textSample')}</p>
        </Spec>
        <div className="grid gap-x-10 sm:grid-cols-2">
          <Spec label={t('brand.type.label')}>
            <p className="text-[13px] font-semibold text-forest-600">{t('brand.type.labelSample')}</p>
            <p className="mt-1 font-display text-[20px] text-ink">{t('brand.rules.match')}</p>
          </Spec>
          <Spec label={t('brand.type.numbers')}>
            <p className="num flex flex-wrap gap-x-6 gap-y-1 font-display text-[30px] text-ink"><span>2-1</span><span>{lang === 'en' ? '67.9' : '67,9'}</span><span>90'</span><span>MD-3</span></p>
          </Spec>
        </div>
        <Spec label={t('brand.type.italic')}>
          <p className="font-display text-[22px] font-medium italic leading-snug text-ink sm:text-[26px]" style={it}>{t('quote', { text: BRAND.motto[lang] })}</p>
        </Spec>
      </div>
    </Part>
  )
}

/* ---------------- do and don't ---------------- */

/** Only shown on the "don't" side: the generic four-point sparkle that Mola must never use. */
function Sparkle({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="currentColor">
      <path d="M12 2.5 13.9 9 20.5 11 13.9 13 12 19.5 10.1 13 3.5 11 10.1 9Z" />
      <path d="M19 15.5 19.8 18.2 22.5 19 19.8 19.8 19 22.5 18.2 19.8 15.5 19 18.2 18.2Z" />
    </svg>
  )
}

function Pair({ doText, dontText, good, bad }: { doText: string; dontText: string; good: ReactNode; bad: ReactNode }) {
  const { t } = useSiteT()
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <figure className="flex flex-col rounded-panel border border-line bg-paper">
        <div className="grid min-h-[148px] flex-1 place-items-center px-5 py-8">{good}</div>
        <figcaption className="flex items-start gap-2.5 border-t border-line px-5 py-4">
          <span className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-forest-600 text-white"><Check size={12} strokeWidth={3} aria-hidden="true" /></span>
          <span className="text-[14.5px] leading-snug text-ink-soft"><span className="font-semibold text-ink">{t('brand.rules.do')}.</span> {doText}</span>
        </figcaption>
      </figure>
      <figure className="flex flex-col rounded-panel border border-line bg-paper">
        <div className="grid min-h-[148px] flex-1 place-items-center px-5 py-8" aria-hidden="true">{bad}</div>
        <figcaption className="flex items-start gap-2.5 border-t border-line px-5 py-4">
          <span className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-clay-500 text-white"><X size={12} strokeWidth={3} aria-hidden="true" /></span>
          <span className="text-[14.5px] leading-snug text-ink-soft"><span className="font-semibold text-ink">{t('brand.rules.dont')}.</span> {dontText}</span>
        </figcaption>
      </figure>
    </div>
  )
}

function Rules() {
  const { t } = useSiteT()
  const wrongStar = { color: BRAND_COLORS.pitch, ['--mark-cut' as string]: BRAND_COLORS.kola } as CSSProperties
  return (
    <Part id="regles" title={t('brand.rules.title')}>
      <div className="space-y-6">
        <Pair doText={t('brand.rules.mola.do')} dontText={t('brand.rules.mola.dont')}
          good={<span className="btn-sun pointer-events-none"><MolaMark size={18} ball={BRAND_COLORS.pitch} />{t('brand.mola.button')}</span>}
          bad={<span className="btn-sun pointer-events-none"><Sparkle />{t('brand.mola.button')}</span>} />
        <Pair doText={t('brand.rules.labels.do')} dontText={t('brand.rules.labels.dont')}
          good={<div><p className="text-[13px] font-semibold text-forest-600">{t('brand.rules.labelDo')}</p><p className="mt-1 font-display text-[22px] text-ink">{t('brand.rules.match')}</p></div>}
          bad={<div><p className="text-[11px] font-bold text-forest-600" style={{ textTransform: 'uppercase', letterSpacing: '0.2em' }}>{t('brand.rules.labelDont')}</p><p className="mt-1 font-display text-[22px] text-ink">{t('brand.rules.match')}</p></div>} />
        <Pair doText={t('brand.rules.star.do')} dontText={t('brand.rules.star.dont')}
          good={<NdambaMark size={88} title="Ndamba" />}
          bad={<NdambaMark size={88} tone="mono" style={wrongStar} />} />
      </div>
    </Part>
  )
}

/* ---------------- icons and share image ---------------- */

function Icons() {
  const { t } = useSiteT()
  return (
    <Part id="icones" title={t('brand.icons.title')} body={t('brand.icons.body')}>
      <div className="flex flex-wrap items-end gap-x-10 gap-y-6 rounded-panel border border-line bg-paper px-6 py-8 sm:px-10">
        <figure>
          <img src="/icons/icon-512.png" alt="" width={96} height={96} className="h-24 w-24 rounded-[22px]" loading="lazy" />
          <figcaption className="mt-3 text-[13px] text-ink-muted">{t('brand.icons.app')}</figcaption>
        </figure>
        <figure>
          <img src="/icons/icon-maskable-512.png" alt="" width={96} height={96} className="h-24 w-24 rounded-full" loading="lazy" />
          <figcaption className="mt-3 text-[13px] text-ink-muted">{t('brand.icons.maskable')}</figcaption>
        </figure>
        <figure>
          <span className="grid h-24 w-24 place-items-center rounded-card bg-sand"><img src="/favicon.svg" alt="" width={32} height={32} className="h-8 w-8" /></span>
          <figcaption className="mt-3 text-[13px] text-ink-muted">{t('brand.icons.favicon')}</figcaption>
        </figure>
      </div>
      <figure className="mt-4">
        <img src="/icons/og.png" alt="" width={1200} height={630} className="h-auto w-full rounded-panel border border-line" loading="lazy" />
        <figcaption className="mt-3 text-[13px] text-ink-muted">{t('brand.icons.og')}</figcaption>
      </figure>
    </Part>
  )
}
