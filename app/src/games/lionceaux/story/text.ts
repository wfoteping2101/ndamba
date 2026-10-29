// The book's words. A subtitle is one or more fragments of the chapter, separated by '|'
// (the incises « a répondu BriBri », « crie Radio » are left out); the screen shows them joined.

export const fragments = (text: string) => text.split('|').map((f) => f.trim()).filter((f) => f.length > 0)

/** What the screen shows: the fragments joined, spacing fixed around French punctuation. */
export function display(text: string) {
  return text.split('|').map((f, i) => (i === 0 ? f.trimEnd() : f.trim())).reduce((acc, f) => {
    if (!acc) return f
    // a fragment that starts with punctuation sticks to the previous one
    if (/^[.,;:…)]/.test(f)) return acc + f
    return acc + ' ' + f
  }, '')
}

/** Normalise book text for comparison: quotes, apostrophes, spaces, markdown emphasis. */
export function norm(s: string) {
  return s
    .replace(/[’‘]/g, "'")
    .replace(/[  ]/g, ' ')
    .replace(/\*+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** The fragments of a line that cannot be found in the chapter text (empty = verbatim). */
export function missingFragments(text: string, chapter: string) {
  const body = norm(chapter)
  return fragments(text).map(norm).filter((f) => !body.includes(f))
}
