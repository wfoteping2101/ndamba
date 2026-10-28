import { useEffect, useRef, useState } from 'react'
import { BOOKS, SERIES } from '../../../lib/config'
import { cx } from '../../../lib/util'
import { useSiteT } from './brand'

export type BookId = 'tome1' | 'methode'

/** Every cover file is a 2:3 portrait (1200 x 1800). */
export const COVER_W = 1200
export const COVER_H = 1800

/**
 * A book cover: the real cover image (BOOKS[book].cover) at 2:3.
 * If the file cannot be loaded, a plain typographic panel (title, author) stands in;
 * it is never an illustration.
 */
export default function BookCover({ book, className, eager = false, sizes }: { book: BookId; className?: string; eager?: boolean; sizes?: string }) {
  const { t, lang } = useSiteT()
  const b = BOOKS[book]
  const title = b.title[lang]
  const alt = book === 'tome1' ? t('library.cover.altSeries', { title }) : t('library.cover.alt', { title })
  // 'set': cover with its 480 px variant (light on phones); 'full': the full file only; 'failed': type fallback
  const [stage, setStage] = useState<'set' | 'full' | 'failed'>('set')
  const failed = stage === 'failed'
  const small = b.cover.replace(/\.jpg$/, '-480.jpg')
  const srcSet = stage === 'set' && small !== b.cover ? `${small} 480w, ${b.cover} ${COVER_W}w` : undefined
  const fail = () => setStage((s) => (s === 'set' ? 'full' : 'failed'))
  const img = useRef<HTMLImageElement>(null)

  // an error can fire before React attaches its handler (cached 404): check once on mount
  useEffect(() => {
    const el = img.current
    if (el && el.complete && el.naturalWidth === 0) fail()
  }, [])

  return (
    <div className={cx('relative aspect-[2/3] overflow-hidden rounded-[4px_10px_10px_4px] bg-sand shadow-[0_12px_28px_-14px_rgba(6,58,37,.5)] ring-1 ring-black/5', className)}>
      {failed ? (
        <TypeFallback book={book} />
      ) : (
        <img key={stage} ref={img} src={b.cover} srcSet={srcSet} sizes={srcSet ? sizes ?? '(min-width: 768px) 300px, 60vw' : undefined} alt={alt} width={COVER_W} height={COVER_H}
          loading={eager ? 'eager' : 'lazy'} decoding="async" onError={fail}
          className="absolute inset-0 h-full w-full object-cover" />
      )}
      {/* the spine: a soft shadow on the left edge so the cover reads as a book */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-[6%] bg-gradient-to-r from-black/25 via-black/5 to-transparent" />
      {failed && <span className="sr-only">{alt}</span>}
    </div>
  )
}

/** Shown only when the cover image fails to load: the title set in type on a flat colour. */
function TypeFallback({ book }: { book: BookId }) {
  const { t, lang } = useSiteT()
  const tome1 = book === 'tome1'
  return (
    <div aria-hidden="true" className={cx('absolute inset-0 flex flex-col items-center px-[9%] py-[11%] text-center [container-type:inline-size]', tome1 ? 'bg-forest-800 text-cream' : 'bg-forest-700 text-cream')}>
      <div className="absolute inset-[4%] rounded-[2px] border border-cream/20" />
      <span className="text-[length:6cqw] font-semibold text-sun-300">
        {tome1 ? `${SERIES.name}, ${t('shelf.tome', { n: 1 }).toLowerCase()}` : t('library.methode.label')}
      </span>
      <span className="mt-[9%] font-display text-[length:12cqw] leading-[1.04]">
        {tome1 ? SERIES.tomes[0]?.title : BOOKS.methode.title[lang]}
      </span>
      <span className="mt-[6%] text-[length:6cqw] italic leading-snug text-cream/80">
        {tome1 ? SERIES.heroes : BOOKS.methode.subtitle[lang]}
      </span>
      <span className="mt-auto text-[length:5.4cqw] font-semibold text-cream/75">{t('library.cover.author')}</span>
    </div>
  )
}
