// Tome 1 artwork, referenced by path only (the paintings are produced separately).
// A missing file never leaves a broken image: the caller's text-only fallback is shown instead.
import { useState, type ReactNode } from 'react'
import { BOOKS } from '../../../lib/config'

export const chapterImg = (no: number) => `/book/tome1/img/ch${String(no).padStart(2, '0')}.jpg`
export const COVER_IMG = BOOKS.tome1.cover // /book/tome1/img/cover.jpg
export const CHARACTERS_IMG = '/book/tome1/img/characters.jpg'

interface Props {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  /** Text-only content shown when the file is missing. Nothing by default. */
  fallback?: ReactNode
  /** Optional frame around the image (not rendered when the file is missing). */
  wrap?: (img: ReactNode) => ReactNode
}

export function BookImage({ src, alt, width, height, className, fallback = null, wrap }: Props) {
  const [failed, setFailed] = useState(false)
  if (failed) return <>{fallback}</>
  const img = (
    <img src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" className={className}
      srcSet={src.endsWith('.jpg') ? `${src.replace(/\.jpg$/, '-480.jpg')} 480w, ${src} 1024w` : undefined}
      sizes={src.endsWith('.jpg') ? '(max-width: 640px) 70vw, 360px' : undefined}
      onError={() => setFailed(true)} />
  )
  return <>{wrap ? wrap(img) : img}</>
}

/** The Tome 1 paintings are portrait, 2:3 (1024 x 1536). */
export const ART_W = 1024
export const ART_H = 1536
