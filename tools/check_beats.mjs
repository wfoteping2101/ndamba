#!/usr/bin/env node
// Checks the in-text illustration beats of Lionceaux tome 1 (tome1/art/beats/chNN.json).
//   node tools/check_beats.mjs            every chapter that has a beats file
//   node tools/check_beats.mjs ch07 12    only these chapters
// Each beat must anchor on an exact phrase of ONE paragraph of the chapter's story (before the CARNET block).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(here, '..')
const BEATS = path.join(ROOT, 'tome1', 'art', 'beats')
const CH = path.join(ROOT, 'tome1', 'chapters')
const CAST = ['BRI', 'KAY', 'MAMI', 'FOKOU', 'PAPA', 'MAMAN']
const SHOTS = ['close', 'medium', 'wide', 'dynamic', 'quiet']
const FIELDS = ['id', 'anchor', 'shot', 'cast', 'outfit', 'action', 'location', 'light', 'camera', 'alt']

/** The story paragraphs of a chapter, as the reader splits them (front matter and CARNET removed). */
export function storyParagraphs(no) {
  const f = fs.readdirSync(CH).find((x) => x.startsWith(String(no).padStart(2, '0') + '-'))
  if (!f) return null
  const raw = fs.readFileSync(path.join(CH, f), 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '')
  const story = raw.split(/^(?=> \[!CARNET\])/m)[0]
  return { file: f, paras: story.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) }
}

/** Index of the paragraph holding the anchor, or a reason why it cannot be placed. */
export function locate(paras, anchor) {
  const hits = paras.map((p, i) => (p.includes(anchor) ? i : -1)).filter((i) => i >= 0)
  if (hits.length === 1) return { index: hits[0] }
  return { error: hits.length ? `anchor found in ${hits.length} paragraphs` : 'anchor not found in the text' }
}

const args = process.argv.slice(2).map((a) => Number(String(a).replace(/\D/g, ''))).filter(Boolean)
const files = fs.existsSync(BEATS) ? fs.readdirSync(BEATS).filter((f) => /^ch\d\d\.json$/.test(f)) : []
const wanted = args.length ? files.filter((f) => args.includes(Number(f.slice(2, 4)))) : files
let errors = 0, beats = 0
const err = (f, m) => { errors++; console.log(`  ✗ ${f}: ${m}`) }
for (const f of wanted.sort()) {
  const no = Number(f.slice(2, 4))
  let data
  try { data = JSON.parse(fs.readFileSync(path.join(BEATS, f), 'utf8')) } catch (e) { err(f, 'invalid JSON: ' + e.message); continue }
  const sp = storyParagraphs(no)
  if (!sp) { err(f, 'no chapter file'); continue }
  const list = data.beats || []
  if (data.chapter !== no) err(f, `"chapter" should be ${no}`)
  if (list.length !== 3) err(f, `${list.length} beats (expected 3)`)
  let last = -100
  list.forEach((b, i) => {
    beats++
    const want = `ch${String(no).padStart(2, '0')}${'bcd'[i]}`
    if (b.id !== want) err(f, `beat ${i + 1} id ${b.id} (expected ${want})`)
    for (const k of FIELDS) if (b[k] == null || b[k] === '' ) err(f, `${b.id}: missing ${k}`)
    if (b.shot && !SHOTS.includes(b.shot)) err(f, `${b.id}: shot "${b.shot}" not in ${SHOTS.join(', ')}`)
    for (const c of b.cast || []) if (!CAST.includes(c)) err(f, `${b.id}: unknown cast ${c} (secondary characters go in "extras")`)
    const txt = JSON.stringify(b)
    if (/[–—]/.test(txt)) err(f, `${b.id}: em or en dash`)
    if (!b.anchor) return
    const loc = locate(sp.paras, b.anchor)
    if (loc.error) { err(f, `${b.id}: ${loc.error}: « ${b.anchor.slice(0, 70)} »`); return }
    if (loc.index < 3) err(f, `${b.id}: anchor in paragraph ${loc.index + 1} (must be after the first 3)`)
    if (loc.index <= last) err(f, `${b.id}: beats are not in reading order`)
    else if (loc.index - last < 8) err(f, `${b.id}: only ${loc.index - last} paragraphs after the previous beat (minimum 8)`)
    last = loc.index
    b._at = `${loc.index + 1}/${sp.paras.length}`
  })
  const ok = !list.some((b) => !b._at)
  console.log(`${ok ? '✓' : '·'} ${f}  ${list.map((b) => `${b.id}@${b._at || '?'}`).join('  ')}`)
}
console.log(`${wanted.length} chapter(s), ${beats} beat(s), ${errors} problem(s)`)
process.exit(errors ? 1 : 0)
