#!/usr/bin/env node
// Renders every animated pitch diagram as an MP4, with its poster, into app/public/video/.
//   node tools/render_videos.mjs                 only what changed since the last run
//   node tools/render_videos.mjs --all           everything again
//   node tools/render_videos.mjs --only C01      keys that start with C01
// Output:
//   app/public/video/{fr,en}/<key>.mp4   1280 x 720, 30 fps, H.264, step captions at the bottom
//   app/public/video/poster/<key>.webp   the finished move (French), for the books' players
//   app/public/video/manifest.json       key -> duration, languages, steps (what is rendered)
// Needs ffmpeg on the PATH and the tools/ packages (cd tools && npm install).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { buildMotion, drawMotion, hasMotion, motionSteps } from './pitchmotion.mjs'
import { allDiagrams, ROOT } from './diagrams.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(path.join(here, 'package.json'))
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas')
const FONTS = path.join(here, 'node_modules/@fontsource-variable/archivo/files')
GlobalFonts.registerFromPath(path.join(FONTS, 'archivo-latin-wght-normal.woff2'), 'Archivo Variable')
GlobalFonts.registerFromPath(path.join(FONTS, 'archivo-latin-ext-wght-normal.woff2'), 'Archivo Ext')
const FONT = "'Archivo Variable', 'Archivo Ext', Inter, 'DejaVu Sans', sans-serif"

const OUT = path.join(ROOT, 'app/public/video')
const W = 1280, H = 720, FPS = 30
const LABELS_EN = JSON.parse(fs.readFileSync(path.join(here, 'diagram_labels_en.json'), 'utf8'))
const ENGINE = crypto.createHash('sha1').update(fs.readFileSync(path.join(here, 'pitchmotion.mjs'))).update(JSON.stringify(LABELS_EN)).update('v1').digest('hex').slice(0, 10)

const args = process.argv.slice(2)
const ALL = args.includes('--all')
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null
const SHARD = args.includes('--shard') ? args[args.indexOf('--shard') + 1].split('/').map(Number) : null

const missing = new Set()
export const labelFor = (lang) => (s) => {
  if (lang !== 'en') return s
  if (LABELS_EN[s] === undefined) { missing.add(s); return s }
  return LABELS_EN[s]
}

function jobs() {
  const list = []
  for (const d of allDiagrams()) {
    if (!hasMotion(d.spec)) continue
    if (ONLY && !d.key.startsWith(ONLY)) continue
    for (const lang of d.langs) list.push({ d, lang, hash: crypto.createHash('sha1').update(ENGINE + lang + JSON.stringify(d.spec) + (d.title[lang] || '')).digest('hex').slice(0, 12) })
  }
  return list
}

function renderVideo({ d, lang }) {
  return new Promise((resolve, reject) => {
    const m = buildMotion(d.spec)
    const file = path.join(OUT, lang, `${d.key}.mp4`)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
      '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'animation', '-crf', '27', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', file], { stdio: ['pipe', 'inherit', 'inherit'] })
    ff.on('error', reject)
    ff.on('close', (code) => (code === 0 ? resolve(m) : reject(new Error(`ffmpeg ${code} for ${d.key} ${lang}`))))
    const c = createCanvas(W, H)
    const ctx = c.getContext('2d')
    const frames = Math.ceil(m.duration * FPS) + 1
    const opts = { width: W, height: H, font: FONT, lang, labelText: labelFor(lang), caption: true, title: d.title[lang] }
    let i = 0
    const pump = () => {
      while (i < frames) {
        drawMotion(ctx, m, i / FPS, opts)
        i++
        const ok = ff.stdin.write(Buffer.from(c.data()))
        if (!ok) { ff.stdin.once('drain', pump); return }
      }
      ff.stdin.end()
    }
    pump()
  })
}

function renderPoster({ d, lang }) {
  const m = buildMotion(d.spec)
  const w = 960, h = 540
  const c = createCanvas(w, h)
  drawMotion(c.getContext('2d'), m, m.duration, { width: w, height: h, font: FONT, lang, labelText: labelFor(lang), caption: true, title: d.title[lang] })
  const file = path.join(OUT, 'poster', `${d.key}.webp`)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, c.encodeSync('webp', 78))
}

async function main() {
  const manifestFile = path.join(OUT, 'manifest.json')
  const manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : { items: {} }
  let list = jobs()
  if (SHARD) list = list.filter((_, i) => i % SHARD[1] === SHARD[0])
  const todo = list.filter((j) => ALL || manifest.items[j.d.key]?.hash?.[j.lang] !== j.hash || !fs.existsSync(path.join(OUT, j.lang, `${j.d.key}.mp4`)))
  if (!SHARD && todo.length > 6) {
    // two workers: one per core
    const n = 2
    const kids = Array.from({ length: n }, (_, k) => new Promise((res, rej) => {
      const p = spawn(process.execPath, [fileURLToPath(import.meta.url), ...args.filter((a) => a !== '--shard'), '--shard', `${k}/${n}`], { stdio: 'inherit' })
      p.on('close', (code) => (code === 0 ? res() : rej(new Error('worker ' + k))))
    }))
    await Promise.all(kids)
    return writeManifest(jobs())
  }
  const t0 = Date.now()
  let done = 0
  for (const j of todo) {
    await renderVideo(j)
    if (j.lang === 'fr' || !j.d.langs.includes('fr')) renderPoster(j)
    done++
    if (done % 10 === 0 || done === todo.length) console.log(`${SHARD ? `[${SHARD[0]}] ` : ''}${done}/${todo.length} ${((Date.now() - t0) / 1000).toFixed(0)}s`)
  }
  if (missing.size) console.warn('labels without English:', [...missing].join(' | '))
  if (!SHARD) writeManifest(jobs())
}

function writeManifest(list) {
  // a partial run (--only) keeps what it did not touch
  const file = path.join(OUT, 'manifest.json')
  const items = ONLY && fs.existsSync(file) ? Object.fromEntries(Object.entries(JSON.parse(fs.readFileSync(file, 'utf8')).items || {}).filter(([k]) => !k.startsWith(ONLY))) : {}
  for (const j of list) {
    const m = buildMotion(j.d.spec)
    const it = items[j.d.key] || (items[j.d.key] = { src: j.d.src, duration: Math.round(m.duration * 100) / 100, langs: [], hash: {}, steps: {} })
    it.langs.push(j.lang)
    it.hash[j.lang] = j.hash
    it.steps[j.lang] = motionSteps(m, j.lang).map((s) => ({ n: s.n, t: Math.round(s.t0 * 100) / 100, text: s.text }))
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ engine: ENGINE, width: W, height: H, fps: FPS, items }, null, 1) + '\n')
  let bytes = 0, files = 0
  for (const dir of ['fr', 'en', 'poster']) for (const f of fs.existsSync(path.join(OUT, dir)) ? fs.readdirSync(path.join(OUT, dir)) : []) { bytes += fs.statSync(path.join(OUT, dir, f)).size; files++ }
  console.log(`manifest: ${Object.keys(items).length} figures, ${files} files, ${(bytes / 1048576).toFixed(1)} MB`)
}

main().catch((e) => { console.error(e); process.exit(1) })
