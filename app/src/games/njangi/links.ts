// Links from the games back to the books (the static readers in public/book).
import type { Drill } from '../../lib/types'

/** The drill's sheet in Le Code Njangi (anchor of the sheet in its family page). */
export const sheetUrl = (d: Pick<Drill, 'id' | 'family'>) => `/book/methode/fiches-${d.family}.html#drill-${d.id}`
/** A chapter of Le Code Njangi. */
export const methodeChapter = (no: number) => `/book/methode/ch-${String(no).padStart(2, '0')}.html`
/** A chapter of Lionceaux, tome 1. */
export const tome1Chapter = (no: number) => `/book/tome1/ch-${String(no).padStart(2, '0')}.html`
