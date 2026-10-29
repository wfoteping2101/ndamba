// Every subtitle of the game is the book's text: each fragment of each line written in a chapter
// script (N(...), S(who, ...), T(who, ...)) must be found in that chapter's file of tome 1.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { missingFragments } from '../story/text'

const here = path.dirname(new URL(import.meta.url).pathname)
const chaptersDir = path.resolve(here, '../../../../../tome1/chapters')
const scripts = fs.readdirSync(here).filter((f) => /^ch\d\d\.ts$/.test(f)).sort()

function chapterText(no: number) {
  const f = fs.readdirSync(chaptersDir).find((x) => x.startsWith(String(no).padStart(2, '0') + '-'))!
  return fs.readFileSync(path.join(chaptersDir, f), 'utf8')
}

/** the string literals passed to N(), S(who, ...) and T(who, ...) in a script */
function lines(src: string) {
  const out: string[] = []
  const re = /\b[NST]\(\s*(?:'[a-zA-Z]+',\s*)?"((?:[^"\\]|\\.)*)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) out.push(m[1].replace(/\\"/g, '"'))
  return out
}

describe('Lionceaux: the subtitles are the book', () => {
  it('has chapter scripts', () => { expect(scripts.length).toBeGreaterThan(0) })
  it('catches a line that is not in the chapter', () => {
    const text = chapterText(1)
    expect(missingFragments("Aujourd'hui, on gagne|. C'est mieux.", text)).toEqual([])
    expect(missingFragments("Aujourd'hui, on perd.", text)).toEqual(["Aujourd'hui, on perd."])
    expect(lines('N("a") S(\'radio\', "b") T(\'bribri\', "c|d")')).toEqual(['a', 'b', 'c|d'])
  })
  for (const f of scripts) {
    const no = Number(f.slice(2, 4))
    it(`chapitre ${no}: every line is verbatim`, () => {
      const src = fs.readFileSync(path.join(here, f), 'utf8')
      const ls = lines(src)
      expect(ls.length).toBeGreaterThan(10)
      const text = chapterText(no)
      const bad = ls.map((l) => ({ l, miss: missingFragments(l, text) })).filter((x) => x.miss.length)
      expect(bad).toEqual([])
    })
  }
})
