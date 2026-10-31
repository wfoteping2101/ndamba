#!/usr/bin/env node
// Checks the animation of every diagram (drills, Le Code Njangi, Tome 1):
// it builds, every numbered step plays, passes find their ball, the film stays short,
// and every word written on a drill or a lesson diagram has its English.
//   node tools/check_motion.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildMotion, hasMotion, motionSteps } from './pitchmotion.mjs'
import { allDiagrams } from './diagrams.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const EN = JSON.parse(fs.readFileSync(path.join(here, 'diagram_labels_en.json'), 'utf8'))
const problems = []
let animated = 0, still = 0, longest = { key: '', d: 0 }
for (const d of allDiagrams()) {
  for (const text of [...(d.spec.labels || []).map((l) => l.text), ...(d.spec.zones || []).map((z) => z.label).filter(Boolean)]) {
    if (d.src !== 'method' && EN[text] === undefined) problems.push(`${d.key}: no English for the label "${text}" (tools/diagram_labels_en.json)`)
  }
  if (!hasMotion(d.spec)) { still++; continue }
  animated++
  let m
  try { m = buildMotion(d.spec) } catch (e) { problems.push(`${d.key}: does not build (${e.message})`); continue }
  const numbered = new Set((d.spec.arrows || []).filter((a) => a.n != null).map((a) => Number(a.n)))
  const played = new Set(m.steps.map((s) => s.n))
  for (const n of numbered) if (!played.has(n)) problems.push(`${d.key}: step ${n} does not play (an arrow's player or point is unknown?)`)
  for (const s of m.steps) if (!(s.t1 > s.t0)) problems.push(`${d.key}: step ${s.n} has no length`)
  if (m.duration > 20) problems.push(`${d.key}: ${m.duration.toFixed(1)} s is too long for one film`)
  if (m.duration > longest.d) longest = { key: d.key, d: m.duration }
  for (const lang of d.langs) if (motionSteps(m, lang).some((s) => !s.text)) problems.push(`${d.key}: a step has no caption (${lang})`)
}
console.log(`${animated} animated diagrams, ${still} still; longest ${longest.key} (${longest.d.toFixed(1)} s)`)
if (problems.length) { console.log(problems.join('\n')); process.exit(1) }
console.log('0 problems')
