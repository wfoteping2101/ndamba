import { BookOpen, Download } from 'lucide-react'
import { BOOKS, SERIES } from '../../../lib/config'
import { cx } from '../../../lib/util'
import BookCover from './BookCover'
import { GoldLabel, useSiteT } from './brand'

/**
 * The LIONCEAUX saga as a shelf: six tall 2:3 tiles, titles placed the same way under each.
 * The available tome comes first with its actions; the others are typographic "coming soon" tiles.
 * Phone and tablet: a horizontal shelf you swipe. Desktop: one row of six.
 */
export default function SeriesShelf({ dark = false, className }: { dark?: boolean; className?: string }) {
  const { t } = useSiteT()
  return (
    <ul aria-label={t('shelf.aria')}
      className={cx('-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-6 lg:gap-5 lg:overflow-visible lg:px-0 lg:pb-0', className)}>
      {SERIES.tomes.map((tome) => (
        <li key={tome.n} className="w-[42%] min-w-[136px] max-w-[200px] shrink-0 snap-start lg:w-auto lg:min-w-0 lg:max-w-none">
          {tome.available ? <AvailableTile n={tome.n} title={tome.title} dark={dark} /> : <SoonTile n={tome.n} title={tome.title} dark={dark} />}
        </li>
      ))}
    </ul>
  )
}

function TileCaption({ n, title, dark, extra }: { n: number; title: string; dark: boolean; extra?: string }) {
  const { t } = useSiteT()
  return (
    <div className="mt-3">
      <GoldLabel dark={dark}>{t('shelf.tome', { n })}{extra && <span className={cx('ml-1.5 font-semibold tracking-[0.12em]', dark ? 'text-cream/55' : 'text-ink-muted')}>· {extra}</span>}</GoldLabel>
      <h3 className={cx('mt-1 font-display text-[17px] font-semibold leading-snug', dark ? 'text-cream' : 'text-ink')}>{title}</h3>
    </div>
  )
}

function AvailableTile({ n, title, dark }: { n: number; title: string; dark: boolean }) {
  const { t, lang } = useSiteT()
  const full = BOOKS.tome1.title[lang]
  return (
    <div>
      <a href={BOOKS.tome1.href} className="group block rounded-[4px_10px_10px_4px] focus-visible:outline-offset-4" aria-label={t('shelf.readLabel', { title: full })}>
        <BookCover book="tome1" sizes="(min-width: 1024px) 180px, 46vw" className="transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_18px_40px_rgba(29,38,33,.22)] motion-reduce:transition-none motion-reduce:group-hover:translate-y-0" />
      </a>
      <TileCaption n={n} title={title} dark={dark} extra={t('shelf.available')} />
      <div className="mt-2.5 flex gap-2">
        <a href={BOOKS.tome1.href} className={cx('btn-sm min-h-[40px] flex-1', dark ? 'btn-sun' : 'btn-primary')} aria-label={t('shelf.readLabel', { title: full })}>
          <BookOpen size={15} />{t('shelf.read')}
        </a>
        <a href={BOOKS.tome1.pdf} download className={cx('btn btn-sm min-h-[40px] border', dark ? 'border-white/25 text-cream hover:bg-white/10' : 'border-line bg-paper text-ink hover:border-ink-faint')} aria-label={t('shelf.pdfLabel', { title: full })}>
          <Download size={15} />{t('shelf.pdf')}
        </a>
      </div>
    </div>
  )
}

function SoonTile({ n, title, dark }: { n: number; title: string; dark: boolean }) {
  const { t } = useSiteT()
  return (
    <div>
      <div className={cx('relative flex aspect-[2/3] flex-col items-center justify-center rounded-[4px_10px_10px_4px] border border-dashed [container-type:inline-size]',
        dark ? 'border-white/20 bg-white/[0.03]' : 'border-ink-faint/40 bg-sand/60')}>
        <span aria-hidden="true" className={cx('font-display text-[length:46cqw] font-light italic leading-none', dark ? 'text-cream/15' : 'text-ink/[0.13]')}>{n}</span>
        <span className={cx('mt-[8%] text-[length:max(10px,7cqw)] font-semibold uppercase tracking-[0.2em]', dark ? 'text-cream/60' : 'text-ink-muted')}>{t('shelf.soon')}</span>
      </div>
      <TileCaption n={n} title={title} dark={dark} />
    </div>
  )
}
