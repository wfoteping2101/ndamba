#!/usr/bin/env node
// Check chapter files: word counts (story only), dashes, schema validity, front matter.
//   node tools/check.mjs tome1/chapters/07-*.md
//   node tools/check.mjs --render out_dir tome1/chapters/*.md   (also writes each schema as SVG)
import fs from 'node:fs'
import path from 'node:path'
import { validateDiagram, renderDiagram } from './pitch.mjs'

const args = process.argv.slice(2)
let renderDir = null
if (args[0] === '--render') { renderDir = args[1]; args.splice(0, 2); fs.mkdirSync(renderDir, { recursive: true }) }

const REQUIRED = ['numero', 'slug', 'titre', 'partie', 'pov', 'resume', 'illustration']
let bad = 0
let total = 0
for (const file of args) {
  const raw = fs.readFileSync(file, 'utf8')
  const problems = []
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n/)
  const meta = {}
  if (!fm) problems.push('missing front matter')
  else for (const line of fm[1].split('\n')) { const m = line.match(/^(\w+):\s*(.*)$/); if (m) meta[m[1]] = m[2] }
  const isCoach = path.resolve(file).includes('/coach/')
  if (!isCoach) for (const k of REQUIRED) if (!meta[k]) problems.push(`front matter missing ${k}`)
  const body = fm ? raw.slice(fm[0].length) : raw
  const dashLines = raw.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => /[–—]/.test(l))
  for (const [n] of dashLines.slice(0, 5)) problems.push(`dash on line ${n}`)
  // story text = body before the CARNET callout (tome1) or whole body minus code (coach)
  const story = (isCoach ? body : body.split(/^> \[!CARNET\]/m)[0]).replace(/```[\s\S]*?```/g, '')
  const words = (story.match(/[\p{L}\p{N}][\p{L}\p{N}'’\-]*/gu) || []).length
  total += words
  if (!isCoach && !/^> \[!CARNET\]/m.test(body)) problems.push('no CARNET callout')
  const schemas = [...body.matchAll(/```schema\n([\s\S]*?)```/g)]
  schemas.forEach((m, i) => {
    let spec
    try { spec = JSON.parse(m[1]) } catch (e) { problems.push(`schema ${i + 1}: invalid JSON (${e.message})`); return }
    const errs = validateDiagram(spec)
    errs.forEach((e) => problems.push(`schema ${i + 1}: ${e}`))
    if (renderDir && !errs.length) fs.writeFileSync(path.join(renderDir, `${path.basename(file, '.md')}-${i + 1}.svg`), renderDiagram(spec, { width: 640 }))
  })
  const wc = isCoach ? '' : (words < 1550 ? ' (TOO SHORT)' : words > 2100 ? ' (TOO LONG)' : '')
  if (wc) problems.push(`word count ${words}${wc}`)
  console.log(`${problems.length ? 'FAIL' : 'ok  '} ${path.basename(file)}  ${words} words, ${schemas.length} schema(s)`)
  for (const p of problems) console.log('     - ' + p)
  if (problems.length) bad++
}
console.log(`\n${args.length} file(s), ${total} words, ${bad} with problems`)
process.exit(bad ? 1 : 0)
