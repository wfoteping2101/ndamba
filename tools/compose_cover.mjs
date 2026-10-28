#!/usr/bin/env node
// Series cover system for LIONCEAUX: painted art (no lettering) + typeset title -> cover.png (1800 x 2700, 6 x 9 in at 300 dpi).
// The same template serves every tome: only the art, the numeral, the title and the accent colour change.
//   node tools/compose_cover.mjs            tome 1 (art: tome1/illustrations/cover-art.png)
//   node tools/compose_cover.mjs --thumb    also writes build/cover-thumb.png (240 px wide) to check readability
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const here = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(here, '..')
const req = createRequire('/opt/npm-tools/node_modules/')

const TOMES = {
  1: { numeral: 'I', title: 'Le Ballon qui voyage', accent: '#F2C230', dir: 'tome1' },
}
const CODE = process.argv.includes('--code')
const n = 1
const T = TOMES[n]
const art = process.env.COVER_ART || ['png', 'jpg', 'jpeg', 'webp'].map((e) => path.join(ROOT, `${T.dir}/illustrations/cover-art.` + e)).find((p) => fs.existsSync(p))
const fonts = path.join(ROOT, 'app/public/book/fonts')
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:A;src:url(file://${fonts}/anton-latin-400-normal.woff2)}
@font-face{font-family:F;font-weight:600;font-style:italic;src:url(file://${fonts}/fraunces-latin-600-italic.woff2)}
@font-face{font-family:F;font-weight:700;src:url(file://${fonts}/fraunces-latin-700-normal.woff2)}
@font-face{font-family:I;font-weight:800;src:url(file://${fonts}/inter-latin-800-normal.woff2)}
html,body{margin:0;width:1800px;height:2700px;overflow:hidden;background:#0d1a14}
.c{position:relative;width:1800px;height:2700px;background:${art ? `url(file://${art}) center/cover` : 'linear-gradient(180deg,#2a8a8a,#F6C66B 45%,#C5762F 70%,#7a3e14)'}}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,18,24,.50) 0%,rgba(6,18,24,.10) 22%,rgba(0,0,0,0) 34%,rgba(0,0,0,0) 72%,rgba(8,10,8,.62) 92%,rgba(8,10,8,.72) 100%)}
.mark{position:absolute;top:92px;left:0;right:0;text-align:center}
.word{display:inline-block;font:400 352px/1 A;letter-spacing:6px;color:#FFFDF6;transform:skewX(-7deg);
  background:linear-gradient(180deg,#FFFFFF 0%,#FFF6DE 58%,#F7D98C 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;
  -webkit-text-stroke:7px #13241B;paint-order:stroke fill;filter:drop-shadow(0 14px 0 rgba(19,36,27,.55)) drop-shadow(0 26px 40px rgba(0,0,0,.45))}
.num{display:flex;align-items:center;justify-content:center;gap:34px;margin-top:6px}
.num i{display:block;width:150px;height:6px;border-radius:3px;background:linear-gradient(90deg,transparent,${T.accent})}
.num i+b+i{background:linear-gradient(90deg,${T.accent},transparent)}
.num b{font:700 150px/1 F;color:${T.accent};text-shadow:0 6px 0 rgba(19,36,27,.6),0 18px 34px rgba(0,0,0,.45)}
.bot{position:absolute;bottom:92px;left:0;right:0;text-align:center;color:#FFFDF6}
.hero{font:800 40px I;letter-spacing:.28em;text-transform:uppercase;color:${T.accent};text-shadow:0 3px 14px rgba(0,0,0,.6)}
.title{font:600 italic 138px/1.02 F;margin:18px 0 26px;text-shadow:0 6px 30px rgba(0,0,0,.55)}
.author{display:flex;align-items:center;justify-content:center;gap:30px;font:800 44px I;letter-spacing:.34em;text-transform:uppercase;text-shadow:0 3px 16px rgba(0,0,0,.6)}
.author i{display:block;width:120px;height:3px;background:${T.accent}}
.band{position:absolute;bottom:0;left:0;right:0;height:30px;background:repeating-linear-gradient(90deg,#D63C2F 0 64px,#F2C230 64px 108px,#2E6B45 108px 164px,#F2C230 164px 190px)}
</style></head><body><div class="c"><div class="shade"></div>
<div class="mark"><div class="word">LIONCEAUX</div><div class="num"><i></i><b>${T.numeral}</b><i></i></div></div>
<div class="bot"><div class="hero">Une aventure de Kaydoudou &amp; BriBri</div><div class="title">${T.title}</div><div class="author"><i></i>William Foteping<i></i></div></div>
<div class="band"></div></div></body></html>`
const codeArt = path.join(ROOT, 'coach/illustrations/cover-art.png')
const codeHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:A;src:url(file://${fonts}/anton-latin-400-normal.woff2)}
@font-face{font-family:F;font-weight:600;font-style:italic;src:url(file://${fonts}/fraunces-latin-600-italic.woff2)}
@font-face{font-family:I;font-weight:800;src:url(file://${fonts}/inter-latin-800-normal.woff2)}
@font-face{font-family:I;font-weight:600;src:url(file://${fonts}/inter-latin-600-normal.woff2)}
html,body{margin:0;width:1400px;height:2000px;overflow:hidden;background:#0b1712}
.c{position:relative;width:1400px;height:2000px;background:url(file://${codeArt}) center top/cover}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,14,20,.62) 0%,rgba(4,14,20,.18) 30%,rgba(0,0,0,0) 44%,rgba(0,0,0,0) 70%,rgba(6,8,6,.7) 90%,rgba(6,8,6,.82) 100%)}
.top{position:absolute;top:96px;left:0;right:0;text-align:center;color:#FFFDF6}
.author{font:800 34px I;letter-spacing:.34em;text-transform:uppercase;color:#F2C230;text-shadow:0 3px 14px rgba(0,0,0,.6)}
.le{font:400 120px/1 A;letter-spacing:22px;margin-top:34px;color:#F7E7BC;text-shadow:0 8px 26px rgba(0,0,0,.5)}
.word{font:400 300px/.95 A;letter-spacing:8px;color:#FFFDF6;-webkit-text-stroke:6px #0f2219;paint-order:stroke fill;filter:drop-shadow(0 12px 0 rgba(15,34,25,.55)) drop-shadow(0 22px 36px rgba(0,0,0,.45))}
.sub{font:600 italic 64px F;margin-top:20px;color:#FFF3D6;text-shadow:0 4px 22px rgba(0,0,0,.55)}
.bot{position:absolute;bottom:90px;left:0;right:0;text-align:center;color:#FFFDF6}
.line{font:600 40px I;letter-spacing:.02em;text-shadow:0 3px 16px rgba(0,0,0,.7)}
.mantra{display:inline-block;margin-top:26px;padding:14px 30px;border:2px solid #F2C230;border-radius:999px;font:800 26px I;letter-spacing:.24em;text-transform:uppercase;color:#F2C230;background:rgba(6,10,8,.35)}
.band{position:absolute;bottom:0;left:0;right:0;height:24px;background:repeating-linear-gradient(90deg,#D63C2F 0 54px,#F2C230 54px 92px,#2E6B45 92px 140px,#F2C230 140px 162px)}
</style></head><body><div class="c"><div class="shade"></div>
<div class="top"><div class="author">William Foteping</div><div class="le">LE CODE</div><div class="word">NJANGI</div><div class="sub">Posséder avec intention</div></div>
<div class="bot"><div class="line">La méthode africaine pour gagner la Coupe du monde</div><div class="mantra">50 exercices · l'Indice Njangi · 2030 · 2034</div></div>
<div class="band"></div></div></body></html>`
if (CODE) {
  const tmpc = path.join(ROOT, 'build', 'code-cover.html')
  fs.mkdirSync(path.dirname(tmpc), { recursive: true }); fs.writeFileSync(tmpc, codeHtml)
  const { chromium } = req('playwright')
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 2000 } })
  await p.goto('file://' + tmpc); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400)
  const outc = path.join(ROOT, 'coach/illustrations/cover.png')
  await p.screenshot({ path: outc }); await b.close()
  const sharp = req('sharp'); await sharp(outc).resize(600).jpeg({ quality: 86 }).toFile(path.join(ROOT, 'build', 'code-cover-600.jpg'))
  console.log(outc); process.exit(0)
}
const tmp = path.join(ROOT, 'build', 'cover.html')
fs.mkdirSync(path.dirname(tmp), { recursive: true }); fs.writeFileSync(tmp, html)
const { chromium } = req('playwright')
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1800, height: 2700 } })
await p.goto('file://' + tmp); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400)
const out = process.env.COVER_OUT || path.join(ROOT, `${T.dir}/illustrations/cover.png`)
await p.screenshot({ path: out }); await b.close()
if (process.argv.includes('--thumb')) {
  const sharp = req('sharp')
  const base = out.replace(/\.png$/, '')
  await sharp(out).resize(240).toFile(base + '-thumb.png')
  await sharp(out).resize(600).jpeg({ quality: 86 }).toFile(base + '-600.jpg')
}
console.log(out, art ? '(with art)' : '(placeholder art, no cover-art yet)')
