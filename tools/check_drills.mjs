#!/usr/bin/env node
// Validate drill JSON files. node tools/check_drills.mjs [--render dir] coach/drills/*.json
import fs from 'node:fs'
import path from 'node:path'
import { validateDiagram, renderDiagram } from './pitch.mjs'

const args = process.argv.slice(2)
let renderDir = null
if (args[0] === '--render') { renderDir = args[1]; args.splice(0, 2); fs.mkdirSync(renderDir, { recursive: true }) }

const FAMILIES = ['technique', 'rondo', 'position', 'ssg', 'lsg', 'phase', 'transition', 'finishing']
const MD = ['MD-4', 'MD-3', 'MD-2', 'MD-1', 'MD+1', 'youth']
const INT = ['low', 'medium', 'high', 'very-high']
const INTENTIONS = ['sortir', 'progresser', 'fixer', 'finir', 'respirer', 'reprendre', 'regarder-devant']
const SKILLS = ['scan', 'controle', 'passe', 'conduite', 'dribble-njangi', 'appels', 'communication', 'protection', 'contre-pression', 'decision']
const PIECES = ['le cœur', 'la raison', 'les yeux', 'la carte', 'le souffle']
const TEXT_KEYS = ['title', 'subtitle', 'objective', 'organisation', 'rules', 'coaching', 'progressions', 'regressions', 'measure']

let bad = 0
for (const file of args) {
  const errs = []
  let d
  const raw = fs.readFileSync(file, 'utf8')
  if (/[–—]/.test(raw)) errs.push('contains an en dash or em dash')
  try { d = JSON.parse(raw) } catch (e) { console.log(`FAIL ${path.basename(file)}\n     - invalid JSON: ${e.message}`); bad++; continue }
  const code = path.basename(file, '.json')
  if (d.id !== code) errs.push(`id ${d.id} does not match file name ${code}`)
  if (!FAMILIES.includes(d.family)) errs.push(`family ${d.family}`)
  if (!Array.isArray(d.md) || !d.md.length || d.md.some((m) => !MD.includes(m))) errs.push(`md ${JSON.stringify(d.md)}`)
  if (!INT.includes(d.intensity)) errs.push(`intensity ${d.intensity}`)
  if (!Array.isArray(d.intentions) || !d.intentions.length || d.intentions.some((m) => !INTENTIONS.includes(m))) errs.push(`intentions ${JSON.stringify(d.intentions)}`)
  if (!Array.isArray(d.skills) || d.skills.some((m) => !SKILLS.includes(m))) errs.push(`skills ${JSON.stringify(d.skills)}`)
  if (!Array.isArray(d.pieces) || d.pieces.some((m) => !PIECES.includes(m))) errs.push(`pieces ${JSON.stringify(d.pieces)}`)
  if (!d.players || !d.players.fr || !d.players.en) errs.push('players needs min, max, fr, en')
  if (!d.space || !(d.space.w > 0) || !(d.space.h > 0)) errs.push('space needs w and h')
  if (!d.duration || !d.duration.fr || !d.duration.en) errs.push('duration needs fr and en')
  if (!(d.minutes > 0)) errs.push('minutes must be a positive number')
  for (const lang of ['fr', 'en']) {
    const t = d[lang]
    if (!t) { errs.push(`missing ${lang}`); continue }
    for (const k of TEXT_KEYS) {
      if (t[k] === undefined || (Array.isArray(t[k]) ? t[k].length < 2 : !String(t[k]).trim())) errs.push(`${lang}.${k} missing or too short`)
    }
  }
  for (const key of ['diagram', 'diagram2']) {
    if (key === 'diagram2' && (d[key] === null || d[key] === undefined)) continue
    const e = validateDiagram(d[key])
    e.forEach((x) => errs.push(`${key}: ${x}`))
    if (renderDir && !e.length) fs.writeFileSync(path.join(renderDir, `${code}${key === 'diagram2' ? '-2' : ''}.svg`), renderDiagram(d[key], { width: 640 }))
  }
  console.log(`${errs.length ? 'FAIL' : 'ok  '} ${code}  ${d.fr?.title || ''}`)
  errs.forEach((e) => console.log('     - ' + e))
  if (errs.length) bad++
}
console.log(`\n${args.length} drill(s), ${bad} with problems`)
process.exit(bad ? 1 : 0)
