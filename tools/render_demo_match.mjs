// Renders the demo match video: Étoile de la Côte 2-1 Météore de Bafoussam (pro demo, match ma_past),
// a 2D top view animated from the very codes of the demo (app/src/lib/proMatch.ts), so every coded action
// happens on screen at its video time. Output: app/public/demo/etoile-meteore.mp4 plus a JSON of the timing.
// Usage: node tools/render_demo_match.mjs [--minutes N] (N = only the first N minutes, for a quick check)
import fs from 'node:fs'
import path from 'node:path'
import { spawn, execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(here, '..')
const require = createRequire(path.join(here, 'package.json'))
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas')
const FONTS = path.join(here, 'node_modules/@fontsource-variable/archivo/files')
GlobalFonts.registerFromPath(path.join(FONTS, 'archivo-latin-wght-normal.woff2'), 'Archivo')
GlobalFonts.registerFromPath(path.join(FONTS, 'archivo-latin-ext-wght-normal.woff2'), 'Archivo Ext')

// bundle the pure TypeScript module with the app's esbuild
const tmp = path.join(process.env.TMPDIR || '/tmp', `promatch-${process.pid}.mjs`)
execFileSync(path.join(ROOT, 'app/node_modules/.bin/esbuild'), [path.join(ROOT, 'app/src/lib/proMatch.ts'), '--bundle', '--format=esm', '--platform=node', `--outfile=${tmp}`], { stdio: 'inherit' })
const M = await import(pathToFileURL(tmp).href)
fs.rmSync(tmp)

const args = process.argv.slice(2)
const onlyMin = args.includes('--minutes') ? Number(args[args.indexOf('--minutes') + 1]) : 0
const FPS = 8, W = 854, H = 480
const players = M.PRO_ROSTER.map(([name, number, position]) => ({ id: `pl_${number}`, name, number, position }))
const byId = new Map(players.map((p) => [p.id, p]))
const events = M.proDemoEvents('ma_past', players, M.PRO_PAST_GOALS)
const keys = M.locateProMatch(events)
const halfLen = { 1: Math.ceil(keys[1][keys[1].length - 1].t), 2: Math.ceil(keys[2][keys[2].length - 1].t) }
const HT = M.PRO_VIDEO.halftime
const kickoff2 = halfLen[1] + HT
const total = onlyMin ? onlyMin * 60 : kickoff2 + halfLen[2]

const OUR = { fill: '#14506B', ring: '#F5B700', text: '#FFFFFF' }
const THEIRS = { fill: '#C8102E', ring: '#FFFFFF', text: '#FFFFFF' }
const LABEL = { PASS_OK: 'Passe', PASS_LOST: 'Passe perdue', LOSS: 'Perte', SHOT: 'Tir', FINAL3: 'Dernier tiers', BOX: 'Surface', REGAIN: 'Récupération', REGAIN5: 'Reprise 5 s' }
const surname = (n) => { const parts = n.replace(/«.*»/, '').trim().split(/\s+/); return parts[parts.length - 1] }

// pitch frame: 105 x 68 m, drawn with a margin
const PH = 392, PW = Math.round(PH * 105 / 68), PX = Math.round((W - PW) / 2), PY = 62
const sx = (x) => PX + (x / 100) * PW
const sy = (y) => PY + (y / 100) * PH
const canvas = createCanvas(W, H)
const g = canvas.getContext('2d')

function ballAt(half, t) {
  const k = keys[half]
  let i = 0
  while (i < k.length - 1 && k[i + 1].t <= t) i++
  const a = k[i], b = k[Math.min(i + 1, k.length - 1)]
  const span = Math.max(0.001, b.t - a.t)
  const f = Math.max(0, Math.min(1, (t - a.t) / Math.min(span, 2.2))) // the ball travels in at most 2.2 s, then waits
  const e = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2
  return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, owner: f >= 1 ? b.owner : a.owner, last: a, next: b }
}
const smooth = new Map()
function ease(id, x, y) { // players follow their spot with a little inertia
  const p = smooth.get(id) || { x, y }
  p.x += (x - p.x) * 0.18; p.y += (y - p.y) * 0.18
  smooth.set(id, p)
  return p
}
function scoreAt(half, t) {
  let us = 0, them = 0
  for (const e of events) if (e.code === 'GOAL' && (e.half < half || (e.half === half && e.t <= t))) e.side === 'us' ? us++ : them++
  return [us, them]
}
function drawPitch() {
  g.fillStyle = '#0E3B24'; g.fillRect(0, 0, W, H)
  for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#2E7D4F' : '#2A7449'; g.fillRect(PX + (PW / 12) * i, PY, PW / 12 + 1, PH) }
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1.6
  g.strokeRect(PX, PY, PW, PH)
  g.beginPath(); g.moveTo(sx(50), PY); g.lineTo(sx(50), PY + PH); g.stroke()
  g.beginPath(); g.arc(sx(50), sy(50), (9.15 / 105) * PW, 0, Math.PI * 2); g.stroke()
  const box = (x0, w, h) => g.strokeRect(x0, sy(50) - (h / 68) * PH / 2, w, (h / 68) * PH)
  box(PX, (16.5 / 105) * PW, 40.3); box(PX + PW - (16.5 / 105) * PW, (16.5 / 105) * PW, 40.3)
  box(PX, (5.5 / 105) * PW, 18.3); box(PX + PW - (5.5 / 105) * PW, (5.5 / 105) * PW, 18.3)
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(PX - 5, sy(50) - (7.32 / 68) * PH / 2, 5, (7.32 / 68) * PH); g.fillRect(PX + PW, sy(50) - (7.32 / 68) * PH / 2, 5, (7.32 / 68) * PH)
}
function dot(x, y, c, n, hi) {
  g.beginPath(); g.arc(x, y, 8.5, 0, Math.PI * 2); g.fillStyle = c.fill; g.fill()
  g.lineWidth = hi ? 3 : 1.6; g.strokeStyle = hi ? '#FFE27A' : c.ring; g.stroke()
  g.fillStyle = c.text; g.font = '700 9px Archivo'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), x, y + 0.5)
}
function frame(vt) {
  const half = vt < kickoff2 ? 1 : 2
  const t = half === 1 ? vt : vt - kickoff2
  const flip = half === 2 // the teams change ends: we attack to the left in the second half
  const X = (x) => sx(flip ? 100 - x : x), Y = (y) => sy(flip ? 100 - y : y)
  drawPitch()
  const ht = half === 1 && t > halfLen[1]
  const b = ballAt(half, Math.min(t, halfLen[half]))
  const attacking = b.owner && b.owner !== 'them'
  // their players
  for (let s = 0; s < 11; s++) {
    const [x, y] = M.theirSpot(s, b.x, b.y, b.owner === 'them')
    const p = ease(`t${s}`, X(x) + Math.sin(vt * 0.35 + s) * 0.8, Y(y) + Math.cos(vt * 0.3 + s * 2) * 0.8)
    dot(p.x, p.y, THEIRS, [1, 2, 4, 5, 3, 7, 6, 8, 11, 9, 10][s], false)
  }
  // ours
  const on = M.onPitchAt(half, t)
  on.forEach((id) => {
    const s = M.slotOf(id)
    let [x, y] = M.ourSpot(s, b.x, b.y, !!attacking)
    if (b.owner === id) { x = b.x - 1.2; y = b.y }
    const p = ease(id, X(x) + Math.sin(vt * 0.4 + s * 3) * 0.8, Y(y) + Math.cos(vt * 0.25 + s) * 0.8)
    dot(p.x, p.y, OUR, byId.get(id)?.number ?? '', b.owner === id)
  })
  // the ball
  g.beginPath(); g.arc(X(b.x), Y(b.y), 4.6, 0, Math.PI * 2); g.fillStyle = '#FFFFFF'; g.fill(); g.lineWidth = 1.4; g.strokeStyle = '#111'; g.stroke()
  // scoreboard
  const [us, them] = scoreAt(half, t)
  const clock = Math.floor((half === 2 ? 45 * 60 : 0) + Math.min(t, halfLen[half]))
  const mm = String(Math.floor(clock / 60)).padStart(2, '0'), ss = String(clock % 60).padStart(2, '0')
  g.fillStyle = 'rgba(6,26,17,0.92)'; g.beginPath(); g.roundRect(W / 2 - 160, 12, 320, 34, 8); g.fill()
  g.font = '700 15px Archivo'; g.textBaseline = 'middle'
  g.fillStyle = OUR.fill; g.fillRect(W / 2 - 150, 21, 8, 16); g.fillStyle = THEIRS.fill; g.fillRect(W / 2 + 142, 21, 8, 16)
  g.fillStyle = '#FFF'; g.textAlign = 'left'; g.fillText('ÉTOILE', W / 2 - 136, 30); g.textAlign = 'right'; g.fillText('MÉTÉORE', W / 2 + 136, 30)
  g.textAlign = 'center'; g.fillStyle = '#F5B700'; g.font = '800 17px Archivo'; g.fillText(`${us} - ${them}`, W / 2, 30)
  g.fillStyle = 'rgba(6,26,17,0.92)'; g.beginPath(); g.roundRect(W / 2 + 168, 12, 64, 34, 8); g.fill()
  g.fillStyle = '#CFE5D8'; g.font = '600 14px Archivo'; g.fillText(`${mm}:${ss}`, W / 2 + 200, 30)
  // caption: the coded action of the moment
  const a = b.last
  if (a.code && t - a.t < 1.6 && a.side === 'us') {
    const who = a.playerId ? surname(byId.get(a.playerId)?.name ?? '') : ''
    const text = `${LABEL[a.code] ?? a.code}${who ? `, ${who}` : ''}`
    g.font = '600 13px Archivo'; const w = g.measureText(text).width + 22
    g.fillStyle = 'rgba(6,26,17,0.85)'; g.beginPath(); g.roundRect(W / 2 - w / 2, H - 34, w, 24, 6); g.fill()
    g.fillStyle = '#FFF'; g.textAlign = 'center'; g.fillText(text, W / 2, H - 21.5)
  } else if (a.code === 'SHOT' && a.side === 'them' && t - a.t < 1.6) {
    g.font = '600 13px Archivo'; const text = 'Tir adverse'; const w = g.measureText(text).width + 22
    g.fillStyle = 'rgba(120,10,20,0.85)'; g.beginPath(); g.roundRect(W / 2 - w / 2, H - 34, w, 24, 6); g.fill()
    g.fillStyle = '#FFF'; g.textAlign = 'center'; g.fillText(text, W / 2, H - 21.5)
  }
  g.font = '500 10.5px Archivo'; g.fillStyle = 'rgba(255,255,255,0.55)'; g.textAlign = 'right'; g.fillText('Ndamba, vidéo de démonstration : animation 2D tirée des codes du match', W - 12, H - 10)
  if (ht || (half === 1 && vt >= halfLen[1])) {
    g.fillStyle = 'rgba(6,26,17,0.8)'; g.fillRect(0, 0, W, H)
    g.fillStyle = '#FFF'; g.font = '800 30px Archivo'; g.textAlign = 'center'; g.fillText('MI-TEMPS', W / 2, H / 2 - 8)
    g.font = '600 16px Archivo'; g.fillStyle = '#F5B700'; g.fillText(`Étoile de la Côte ${us} - ${them} Météore de Bafoussam`, W / 2, H / 2 + 24)
  }
}

const out = path.join(ROOT, 'app/public/demo')
fs.mkdirSync(out, { recursive: true })
const file = path.join(out, onlyMin ? 'etoile-meteore-test.mp4' : 'etoile-meteore.mp4')
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
  '-vf', 'scale=640:360:flags=lanczos', '-c:v', 'libx264', '-preset', 'medium', '-tune', 'animation', '-crf', '33', '-g', String(FPS * 4), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] })
const frames = Math.ceil(total * FPS)
const t0 = Date.now()
for (let f = 0; f < frames; f++) {
  frame(f / FPS)
  const buf = canvas.data()
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r))
  if (f % (FPS * 600) === 0) process.stdout.write(`${Math.round(f / FPS / 60)} min… `)
}
ff.stdin.end()
await new Promise((r) => ff.on('close', r))
const meta = { duration: total, kickoff1: 0, kickoff2, halfLen, fps: FPS, size: fs.statSync(file).size }
if (!onlyMin) fs.writeFileSync(path.join(out, 'etoile-meteore.json'), JSON.stringify(meta))
console.log(`\n${path.relative(ROOT, file)}: ${(meta.size / 1e6).toFixed(1)} MB, ${Math.round(total / 60)} min, ${((Date.now() - t0) / 1000).toFixed(0)} s`)
