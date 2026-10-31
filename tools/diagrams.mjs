// Every pitch diagram of the project, with a stable key per figure.
//   drills  coach/drills/*.json      diagram -> "C01-1", diagram2 -> "C01-2"
//   method  coach/chapters/*.md      ```schema blocks -> "code-11-2" (chapter 11, figure 2)
//   novel   tome1/chapters/*.md      ```schema blocks -> "lecon-05" (one per chapter; a second one -> "lecon-05-2")
// Used by tools/render_videos.mjs (the MP4s) and tools/build_books.mjs (the web readers).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
export const ROOT = path.resolve(here, '..')

export const methodKey = (chapterFile, i) => `code-${chapterFile.slice(0, 2)}-${i}`
export const novelKey = (chapterFile, i) => `lecon-${chapterFile.slice(0, 2)}${i > 1 ? `-${i}` : ''}`

export function allDiagrams() {
  const out = []
  const ddir = path.join(ROOT, 'coach/drills')
  for (const f of fs.readdirSync(ddir).filter((x) => x.endsWith('.json')).sort()) {
    const d = JSON.parse(fs.readFileSync(path.join(ddir, f), 'utf8'))
    const title = { fr: `${d.id} · ${d.fr.title}`, en: `${d.id} · ${d.en.title}` }
    out.push({ key: `${d.id}-1`, src: 'drill', id: d.id, spec: d.diagram, title, langs: ['fr', 'en'] })
    if (d.diagram2) out.push({ key: `${d.id}-2`, src: 'drill', id: d.id, spec: d.diagram2, title: { fr: `${title.fr} · progression`, en: `${title.en} · progression` }, langs: ['fr', 'en'] })
  }
  for (const [src, dir] of [['method', 'coach/chapters'], ['novel', 'tome1/chapters']]) {
    const cdir = path.join(ROOT, dir)
    for (const f of fs.readdirSync(cdir).filter((x) => x.endsWith('.md')).sort()) {
      const raw = fs.readFileSync(path.join(cdir, f), 'utf8')
      const re = /```schema\n([\s\S]*?)```/g
      let m, i = 0
      while ((m = re.exec(raw))) {
        i++
        let spec
        try { spec = JSON.parse(m[1]) } catch { continue }
        const no = Number(f.slice(0, 2))
        const key = src === 'method' ? methodKey(f, i) : novelKey(f, i)
        const title = src === 'method' ? { fr: `Le Code Njangi · chapitre ${no}` } : { fr: `Leçon du Ballon n°${no}` }
        out.push({ key, src, file: f, index: i, spec, title, langs: ['fr'] })
      }
    }
  }
  return out
}
