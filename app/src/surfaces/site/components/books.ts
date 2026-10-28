// The shape of the two books, read from their generated tables of contents (src/content/books.gen.ts).
import { METHODE_TOC } from '../../../content'
import type { TocEntry } from '../../../content/books.gen'

/** Front matter (part 0) and appendices are not chapters. */
export const isMethodeChapter = (e: TocEntry) => e.part > 0 && !/^annexe/i.test(e.partTitle || e.title)

/** The coaching book's size: chapters are numbered across the book, so the last number is the planned total. */
export function methodeShape() {
  const chapters = METHODE_TOC.filter(isMethodeChapter)
  return { planned: Math.max(0, ...chapters.map((e) => e.no)), parts: Math.max(0, ...chapters.map((e) => e.part)), online: chapters.length }
}

/** Entries grouped by part, in reading order. */
export function groupByPart(entries: TocEntry[]) {
  const groups = new Map<number, TocEntry[]>()
  for (const e of [...entries].sort((a, b) => a.no - b.no)) {
    if (!groups.has(e.part)) groups.set(e.part, [])
    groups.get(e.part)!.push(e)
  }
  return [...groups.entries()]
}

export const pad2 = (n: number) => String(n).padStart(2, '0')
export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

/** The readers have one page per chapter: /book/tome1/ch-07.html (the book's index page is the cover and the contents). */
export const chapterUrl = (base: string, no: number) => `${base.endsWith('/') ? base : base + '/'}ch-${pad2(no)}.html`
