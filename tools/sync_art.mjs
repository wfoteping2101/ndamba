#!/usr/bin/env node
// Brings generated masters into the project and writes the production log tome1/art/assets.json.
//   node tools/sync_art.mjs [stagedDir]
// stagedDir defaults to /mnt/user-data/uploads/Kaydoudou-BriBri/illustrations (files staged from the generation PC).
// Review decisions live in tome1/art/review.json: { "ch12": { "status": "approved" | "redo", "note": "..." } }.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const here = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(here, '..')
const STAGED = process.argv[2] || '/mnt/user-data/uploads/Kaydoudou-BriBri/illustrations'
const ILL = path.join(ROOT, 'tome1', 'illustrations')
const MASTERS = path.join(ILL, '_masters')
fs.mkdirSync(MASTERS, { recursive: true })
const inv = JSON.parse(fs.readFileSync(path.join(ROOT, 'tome1', 'art', 'inventory.json'), 'utf8'))
const reviewFile = path.join(ROOT, 'tome1', 'art', 'review.json')
const review = fs.existsSync(reviewFile) ? JSON.parse(fs.readFileSync(reviewFile, 'utf8')) : {}
const MODEL = 'Codex app built-in image_gen tool (ChatGPT image generation; the Codex imagegen skill names gpt-image-2), run through `codex exec` with the agent model gpt-6-astra, low reasoning effort'

// where each approved master is used by the build
const DEST = { 'sheet-brothers': ['characters.png'], 'cover-art': ['cover-art.png'] }
const assets = []
let copied = 0
for (const a of inv) {
  const staged = path.join(STAGED, a.id + '.png')
  const master = path.join(MASTERS, a.id + '.png')
  if (fs.existsSync(staged) && (!fs.existsSync(master) || fs.statSync(staged).mtimeMs > fs.statSync(master).mtimeMs)) { fs.copyFileSync(staged, master); copied++ }
  const has = fs.existsSync(master)
  const r = review[a.id] || {}
  const approved = has && r.status === 'approved' // only reviewed images are published
  const isCode = a.id === 'code-cover-art'
  const targets = isCode ? [] : (DEST[a.id] || (a.kind === 'chapter' || a.kind === 'beat' || a.kind === 'part' || a.kind === 'sheet' ? [a.id + '.png'] : []))
  if (approved) for (const t of targets) fs.copyFileSync(master, path.join(ILL, t))
  if (approved && isCode) { fs.mkdirSync(path.join(ROOT, 'coach', 'illustrations'), { recursive: true }); fs.copyFileSync(master, path.join(ROOT, 'coach', 'illustrations', 'cover-art.png')) }
  assets.push({
    id: a.id, kind: a.kind, chapter: a.chapter, refs: a.refs, prompt: a.prompt, model: has ? (r.model || MODEL) : null,
    master: has ? `tome1/illustrations/_masters/${a.id}.png` : null,
    status: !has ? 'pending' : r.status === 'redo' ? 'redo' : r.status === 'approved' ? 'approved, integrated' : 'generated, integrated',
    review: r.note || null,
    integrated_in: !approved ? [] : a.kind === 'beat' ? ['web reader /book/tome1/ (inside the chapter text, after its anchor paragraph)', 'print (half page inside the text)'] : a.kind === 'chapter' ? ['web reader /book/tome1/ (chapter opening)', 'PDF (full page before the chapter)', 'app (lessons)'] : a.kind === 'part' ? ['web reader (part opener)', 'PDF (part page)'] : a.id === 'cover-art' ? ['cover.png (composed with tools/compose_cover.mjs)', 'web reader', 'PDF', 'app library'] : a.id === 'code-cover-art' ? ['Le Code Njangi cover (compose_cover.mjs --code)', 'web reader', 'PDF', 'app library'] : a.id === 'sheet-brothers' ? ['characters page (reader and PDF)', 'reference for every scene'] : a.kind === 'sheet' ? ['reference sheet'] : a.kind === 'cover' ? ['rough, not published'] : [],
  })
}
fs.writeFileSync(path.join(ROOT, 'tome1', 'art', 'assets.json'), JSON.stringify(assets, null, 1) + '\n')
const done = assets.filter((a) => a.master).length
console.log(`${copied} new master(s); ${done}/${assets.length} assets generated; ${assets.filter((a) => a.status === 'redo').length} to redo`)
