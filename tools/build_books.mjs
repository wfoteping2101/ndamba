#!/usr/bin/env node
// Builds both books from their Markdown sources.
//   node tools/build_books.mjs            -> web readers in app/public/book/{tome1,methode}/ + print HTML in build/
//   node tools/build_books.mjs --pdf      -> also prints proof PDFs into build/pdf/ (never published: no PDF downloads on the site)
//   node tools/build_books.mjs --only tome1|methode
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { marked } from 'marked'
import { renderDiagram } from './pitch.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(here, '..')
const PUBLIC = path.join(ROOT, 'app', 'public')
const BUILD = path.join(ROOT, 'build')
const requireG = createRequire('/opt/npm-tools/node_modules/')
const args = process.argv.slice(2)
const WANT_PDF = args.includes('--pdf')
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null

marked.setOptions({ gfm: true, breaks: false })

/* ------------------------------------------------------------------ helpers */

const read = (p) => fs.readFileSync(p, 'utf8')
const write = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s) }
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function frontMatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n/)
  const meta = {}
  if (m) for (const line of m[1].split('\n')) { const k = line.match(/^(\w+):\s*(.*)$/); if (k) meta[k[1]] = k[2].trim() }
  return { meta, body: m ? raw.slice(m[0].length) : raw }
}

/** French typography on text nodes only: thin no-break spaces before ; : ! ? and inside « », curly apostrophes. */
function frenchTypo(html) {
  return html.split(/(<[^>]+>)/g).map((part) => {
    if (part.startsWith('<')) return part
    return part
      .replace(/(?<!&#?[a-zA-Z0-9]+)[ \u00A0]*([;!?]+)/g, '\u202F$1')
      .replace(/(\S)[ \u00A0]:(\s|$)/g, '$1\u00A0:$2')
      .replace(/«[ \u00A0]*/g, '«\u00A0')
      .replace(/[ \u00A0]*»/g, '\u00A0»')
      .replace(/'/g, '\u2019')
      .replace(/\.\.\./g, '\u2026')
      .replace(/(\d)-(\d)/g, '$1\u2011$2')
  }).join('')
}

/** Fix a frenchTypo side effect: "?" glued to a word or after a space both become thin space + "?". Keep URLs and code safe by never running typo on them. */
function englishTypo(html) {
  return html.split(/(<[^>]+>)/g).map((part) => (part.startsWith('<') ? part : part.replace(/'/g, '’'))).join('')
}

function schemaSVG(json, width = 620, title = '') {
  try { return renderDiagram(JSON.parse(json), { width, title }) } catch (e) { return `<!-- schema error: ${esc(e.message)} -->` }
}

/** Markdown to HTML with schema blocks, callouts and drill references. */
function renderMarkdown(md, { callouts = {}, drillLinks = false, diagramWidth = 620 } = {}) {
  const svgs = []
  md = md.replace(/```schema\n([\s\S]*?)```/g, (_, json) => { svgs.push(schemaSVG(json, diagramWidth)); return `\n\nSCHEMAPLACEHOLDER${svgs.length - 1}X\n\n` })
  // callouts: consecutive "> " lines whose first line is "> [!TYPE] Title"
  const lines = md.split('\n')
  const out = []
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^>\s*\[!(\w+)\]\s*(.*)$/)
    if (m && callouts[m[1]] !== undefined) {
      const inner = []
      i++
      while (i < lines.length && /^>/.test(lines[i])) { inner.push(lines[i].replace(/^>\s?/, '')); i++ }
      i--
      const cls = m[1].toLowerCase()
      out.push(`<aside class="callout callout-${cls}"><div class="callout-kicker">${esc(callouts[m[1]])}</div>${m[2] ? `<div class="callout-title">${esc(m[2])}</div>` : ''}${marked.parse(inner.join('\n'))}</aside>`)
    } else out.push(lines[i])
  }
  let html = marked.parse(out.join('\n'))
  html = html.replace(/<p>SCHEMAPLACEHOLDER(\d+)X<\/p>/g, (_, i) => `<figure class="diagram">${svgs[Number(i)]}</figure>`)
  html = html.replace(/SCHEMAPLACEHOLDER(\d+)X/g, (_, i) => `<figure class="diagram">${svgs[Number(i)]}</figure>`)
  if (drillLinks) html = html.replace(/\[\[([A-Z]\d\d)\]\]/g, (_, c) => `<a class="drill-ref" href="#drill-${c}">${c}</a>`)
  return html
}

function fontFaces(urlBase) {
  const f = (family, file, weight, style = 'normal') => `@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};font-display:swap;src:url(${urlBase}${file}) format('woff2')}`
  return [
    f('Literata', 'literata-latin-400-normal.woff2', 400), f('Literata', 'literata-latin-400-italic.woff2', 400, 'italic'),
    f('Literata', 'literata-latin-600-normal.woff2', 600), f('Literata', 'literata-latin-600-italic.woff2', 600, 'italic'),
    f('Fraunces', 'fraunces-latin-400-normal.woff2', 400), f('Fraunces', 'fraunces-latin-400-italic.woff2', 400, 'italic'),
    f('Fraunces', 'fraunces-latin-600-normal.woff2', 600), f('Fraunces', 'fraunces-latin-700-normal.woff2', 700),
    f('Fraunces', 'fraunces-latin-600-italic.woff2', 600, 'italic'),
    f('Inter', 'inter-latin-400-normal.woff2', 400), f('Inter', 'inter-latin-600-normal.woff2', 600), f('Inter', 'inter-latin-700-normal.woff2', 700), f('Inter', 'inter-latin-800-normal.woff2', 800),
  ].join('\n')
}

function copyFonts(dest) {
  fs.mkdirSync(dest, { recursive: true })
  const nm = path.join(here, 'node_modules', '@fontsource')
  const want = [
    ['literata', ['literata-latin-400-normal', 'literata-latin-400-italic', 'literata-latin-600-normal', 'literata-latin-600-italic']],
    ['fraunces', ['fraunces-latin-400-normal', 'fraunces-latin-400-italic', 'fraunces-latin-600-normal', 'fraunces-latin-700-normal', 'fraunces-latin-600-italic']],
    ['inter', ['inter-latin-400-normal', 'inter-latin-600-normal', 'inter-latin-700-normal', 'inter-latin-800-normal']],
  ]
  for (const [pkg, files] of want) for (const f of files) fs.copyFileSync(path.join(nm, pkg, 'files', f + '.woff2'), path.join(dest, f + '.woff2'))
}

/** Copy and resize an illustration (if it exists) for web and print. Returns { web, print } relative names or null. */
async function prepImage(srcBase, outDirWeb, outDirPrint, name) {
  const exts = ['.png', '.jpg', '.jpeg', '.webp']
  const src = exts.map((e) => srcBase + e).find((p) => fs.existsSync(p))
  if (!src) return null
  const sharp = requireG('sharp')
  fs.mkdirSync(outDirWeb, { recursive: true }); fs.mkdirSync(outDirPrint, { recursive: true })
  const web = path.join(outDirWeb, name + '.jpg'), prt = path.join(outDirPrint, name + '.jpg')
  const webp = path.join(outDirWeb, name + '.webp'), thumbJ = path.join(outDirWeb, name + '-480.jpg'), thumbW = path.join(outDirWeb, name + '-480.webp')
  const st = fs.statSync(src)
  const fresh = (p) => fs.existsSync(p) && fs.statSync(p).mtimeMs >= st.mtimeMs
  const W = 1200
  if (!fresh(web)) await sharp(src).resize({ width: W, withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toFile(web)
  if (!fresh(webp)) await sharp(src).resize({ width: W, withoutEnlargement: true }).webp({ quality: 80 }).toFile(webp)
  if (!fresh(thumbJ)) await sharp(src).resize({ width: 480 }).jpeg({ quality: 78, mozjpeg: true }).toFile(thumbJ)
  if (!fresh(thumbW)) await sharp(src).resize({ width: 480 }).webp({ quality: 76 }).toFile(thumbW)
  if (!fresh(prt)) await sharp(src).resize({ width: 1800, kernel: 'lanczos3' }).jpeg({ quality: 90 }).toFile(prt)
  const m = await sharp(web).metadata()
  return { web: name + '.jpg', webp: name + '.webp', name, w: m.width, h: m.height, print: prt }
}

/** Responsive <picture> for the web reader (webp with jpg fallback, intrinsic size, lazy below the fold). */
function picture(im, alt, { cls = '', lazy = true, sizes = '(max-width: 760px) 100vw, 720px' } = {}) {
  if (!im) return ''
  return `<picture><source type="image/webp" srcset="img/${im.name}-480.webp 480w, img/${im.webp} ${im.w}w" sizes="${sizes}"><img${cls ? ` class="${cls}"` : ''} src="img/${im.web}" srcset="img/${im.name}-480.jpg 480w, img/${im.web} ${im.w}w" sizes="${sizes}" width="${im.w}" height="${im.h}" alt="${esc(alt)}"${lazy ? ' loading="lazy" decoding="async"' : ' fetchpriority="high"'}></picture>`
}

/** Short alt texts written with the art direction (tome1/art/inventory.json). */
function artAlts() {
  const f = path.join(ROOT, 'tome1', 'art', 'inventory.json')
  if (!fs.existsSync(f)) return {}
  try { return Object.fromEntries(JSON.parse(read(f)).map((a) => [a.id, a.alt]).filter(([, v]) => v)) } catch { return {} }
}

/* ------------------------------------------------------------------ paged web readers (one page per chapter) */

const pad2 = (n) => String(n).padStart(2, '0')

function readerHead({ title, desc, og, css }) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}">${og ? `<meta property="og:image" content="${og}">` : ''}<meta name="theme-color" content="#FBF7EE"><link rel="icon" href="/favicon.svg"><style>${fontFaces('../fonts/')}${READER_CSS}${css}${PAGED_CSS}</style></head>`
}

function readerBar({ back, backLabel, title }) {
  return `<div class="bar"><a class="back" href="${back}">&#8592; ${esc(backLabel)}</a><span class="bar-title">${esc(title)}</span><button id="toc-btn" type="button" aria-label="Chapitres">Chapitres</button><button id="aa" type="button" aria-label="Taille du texte">Aa</button></div><div class="progress"><span id="prog"></span></div>`
}

function readerDrawer(toc) {
  return `<div class="drawer" id="drawer" hidden><div class="drawer-inner"><button id="close" type="button">Fermer</button><a class="drawer-home" href="./">Couverture et sommaire</a><ol>${toc}</ol></div></div>`
}

function pagerNav(prev, next) {
  return `<nav class="pager" aria-label="Chapitres précédent et suivant">${prev ? `<a class="prev" href="${prev.href}" rel="prev"><small>&#8592; Précédent</small><b>${prev.label}</b></a>` : '<span></span>'}${next ? `<a class="next" href="${next.href}" rel="next"><small>Suivant &#8594;</small><b>${next.label}</b></a>` : '<span></span>'}</nav>`
}

const PAGED_JS = (key) => `
(function(){var K='${key}';var b=document.body;var page=b.getAttribute('data-page');
var h=location.hash;
if(page==='index'){var m=h.match(/^#ch-(\\d{2})$/);if(m){location.replace('ch-'+m[1]+'.html');return}
var dm=h.match(/^#drill-([A-Z]\\d\\d)$/);if(dm&&window.DRILL_PAGE&&window.DRILL_PAGE[dm[1]]){location.replace(window.DRILL_PAGE[dm[1]]+'#drill-'+dm[1]);return}
if(h==='#fiches'){location.replace('fiches.html');return}}
try{var fs=localStorage.getItem(K+'.fs');if(fs)b.style.setProperty('--fs',fs)}catch(e){}
var sizes=['17px','19px','21px'];document.getElementById('aa').onclick=function(){var c=getComputedStyle(b).getPropertyValue('--fs').trim()||sizes[0];var n=sizes[(sizes.indexOf(c)+1)%sizes.length];b.style.setProperty('--fs',n);try{localStorage.setItem(K+'.fs',n)}catch(e){}};
var d=document.getElementById('drawer');document.getElementById('toc-btn').onclick=function(){d.hidden=false;var cur=d.querySelector('a[data-page="'+page+'"]');if(cur){cur.classList.add('current');cur.scrollIntoView({block:'center'})}};document.getElementById('close').onclick=function(){d.hidden=true};d.onclick=function(e){if(e.target===d)d.hidden=true};
document.addEventListener('keydown',function(e){if(e.key==='Escape')d.hidden=true;if(e.altKey||e.ctrlKey||e.metaKey)return;var a=null;if(e.key==='ArrowRight')a=document.querySelector('a[rel=next]');if(e.key==='ArrowLeft')a=document.querySelector('a[rel=prev]');if(a&&d.hidden)location.href=a.getAttribute('href')});
var prog=document.getElementById('prog');var t=0;
function save(){if(page==='index')return;try{localStorage.setItem(K+'.last',JSON.stringify({p:page,y:Math.round(window.scrollY),t:(document.querySelector('.ch-title')||document.querySelector('h1')||{}).textContent||''}))}catch(e){}}
window.addEventListener('scroll',function(){if(t)return;t=setTimeout(function(){t=0;var de=document.documentElement;var max=de.scrollHeight-de.clientHeight;prog.style.width=(max>0?100*de.scrollTop/max:0)+'%';save()},200)},{passive:true});
if(page!=='index'){var l=null;try{l=JSON.parse(localStorage.getItem(K+'.last'))}catch(e){}if(h==='#reprendre'&&l&&l.p===page){var go=function(){window.scrollTo(0,l.y);setTimeout(function(){window.scrollTo(0,l.y)},350)};if(document.readyState==='complete')go();else window.addEventListener('load',go)}else save()}
else{try{var l2=JSON.parse(localStorage.getItem(K+'.last'));var r=document.getElementById('resume');if(l2&&r&&l2.p){r.hidden=false;r.setAttribute('href',l2.p+'.html#reprendre');r.querySelector('b').textContent=l2.t}}catch(e){}}
})();`

const PAGED_CSS = `
.ch-title{font-family:Fraunces,Georgia,serif;font-size:32px;line-height:1.12;margin:6px 0 0}
.start{display:flex;flex-direction:column;align-items:center;gap:10px;margin:18px 0 6px}
.start a{display:flex;flex-direction:column;align-items:center;min-width:min(340px,90%);padding:13px 20px;border-radius:14px;text-decoration:none;font:700 15px Inter,sans-serif}
.start .resume{background:var(--forest);color:var(--cream)}.start .resume small{font:600 11px Inter,sans-serif;letter-spacing:.14em;text-transform:uppercase;opacity:.85}.start .resume b{font-family:Fraunces,Georgia,serif;font-size:17px;margin-top:2px}
.start .begin{background:var(--paper);color:var(--forest);border:1.5px solid var(--forest)}
.pager{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:46px 0 10px}
.pager a{display:flex;flex-direction:column;gap:4px;padding:14px 16px;border-radius:16px;background:var(--paper);border:1px solid var(--line);text-decoration:none;color:var(--ink);min-height:84px}
.pager a:hover{border-color:var(--forest)}.pager .next{text-align:right;background:var(--forest);color:var(--cream);border-color:var(--forest)}
.pager small{font:700 11px Inter,sans-serif;letter-spacing:.12em;text-transform:uppercase;opacity:.8}.pager b{font-family:Fraunces,Georgia,serif;font-size:16px;line-height:1.25;font-weight:600}
.drawer-home{display:block;margin:4px 0 10px;font:700 14px Inter,sans-serif;text-decoration:none}
.drawer a.current{background:var(--sand);border-radius:8px;padding-left:8px}
.part-opener{margin-top:18px}
.lead{font-size:1.05em;color:var(--soft)}
.fam-grid{display:grid;gap:14px;margin-top:18px}@media(min-width:760px){.fam-grid{grid-template-columns:1fr 1fr}}
.fam-card{background:var(--paper);border:1px solid var(--line);border-left:6px solid var(--fam);border-radius:16px;padding:16px 18px}
.fam-card h2{font-family:Fraunces,Georgia,serif;font-size:21px;margin:0 0 8px}.fam-card h2 a{color:var(--fam);text-decoration:none}
.fam-card ol{list-style:none;margin:0;padding:0}.fam-card li a{display:block;padding:5px 0;border-bottom:1px solid var(--line);text-decoration:none;color:var(--ink);font-size:15px}.fam-card li a b{font:700 12px Inter,sans-serif;color:var(--fam);margin-right:6px}
h1.fam-title{font-family:Fraunces,Georgia,serif;font-size:30px;margin:28px 0 10px;color:var(--fam)}
`

/* ------------------------------------------------------------------ Tome 1 */

const T1_PARTS = {
  1: { title: 'Cameroun', piece: 'Le cœur', sub: 'Le ballon de Mami' },
  2: { title: 'États-Unis', piece: 'La raison', sub: 'Posséder n’est pas garder' },
  3: { title: 'France', piece: 'Les yeux', sub: 'Avant de recevoir, tu regardes' },
  4: { title: 'Espagne', piece: 'La carte', sub: 'Le rondo, la pausa, les triangles' },
  5: { title: 'Angleterre', piece: 'Le souffle', sub: 'Intensity is a choice' },
}
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V']

function tome1Chapters() {
  const dir = path.join(ROOT, 'tome1', 'chapters')
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter((f) => /^\d\d-.*\.md$/.test(f)).sort().map((f) => {
    const { meta, body } = frontMatter(read(path.join(dir, f)))
    const [story, carnetRaw = ''] = body.split(/^(?=> \[!CARNET\])/m)
    return { file: f, no: Number(meta.numero), slug: meta.slug, title: meta.titre, part: Number(meta.partie), pov: meta.pov, summary: meta.resume, illustration: meta.illustration, story, carnetRaw }
  })
}

function carnetHTML(raw, width) {
  if (!raw.trim()) return ''
  const schema = raw.match(/```schema\n([\s\S]*?)```/)
  const quote = raw.replace(/```schema\n[\s\S]*?```/, '').trim().split('\n').filter((l) => l.startsWith('>'))
  const head = quote[0].replace(/^>\s*\[!CARNET\]\s*/, '')
  const hm = head.match(/^Leçon du Ballon n°\s*(\d+)\s*:\s*(.*)$/i)
  const lines = quote.slice(1).map((l) => l.replace(/^>\s?/, ''))
  const body = marked.parse(lines.join('\n'))
  return `<aside class="carnet"><div class="carnet-band"></div><div class="carnet-inner"><div class="carnet-kicker">Leçon du Ballon n°${hm ? hm[1] : ''}</div><div class="carnet-title">${esc(hm ? hm[2] : head)}</div><div class="carnet-body">${body}</div>${schema ? `<figure class="diagram carnet-diagram">${schemaSVG(schema[1], width)}</figure>` : ''}</div></aside>`
}

async function buildTome1() {
  const chapters = tome1Chapters()
  const illDir = path.join(ROOT, 'tome1', 'illustrations')
  const webDir = path.join(PUBLIC, 'book', 'tome1')
  const imgWeb = path.join(webDir, 'img')
  const imgPrint = path.join(BUILD, 'tome1-img')
  copyFonts(path.join(PUBLIC, 'book', 'fonts'))
  const cover = await prepImage(path.join(illDir, 'cover'), imgWeb, imgPrint, 'cover')
  const characters = await prepImage(path.join(illDir, 'characters'), imgWeb, imgPrint, 'characters')
  const family = await prepImage(path.join(illDir, 'sheet-adults'), imgWeb, imgPrint, 'family')
  const partImgs = {}
  for (const p of [1, 2, 3, 4, 5]) partImgs[p] = await prepImage(path.join(illDir, `part${p}`), imgWeb, imgPrint, `part${p}`)
  const chImgs = {}
  for (const c of chapters) chImgs[c.no] = await prepImage(path.join(illDir, `ch${String(c.no).padStart(2, '0')}`), imgWeb, imgPrint, `ch${String(c.no).padStart(2, '0')}`)

  // in-text illustrations (tome1/art/beats/chNN.json): each one goes right after the paragraph holding its anchor
  const beatsOf = {}, beatImgs = {}
  for (const c of chapters) {
    const f = path.join(ROOT, 'tome1', 'art', 'beats', `ch${pad2(c.no)}.json`)
    if (!fs.existsSync(f)) continue
    try { beatsOf[c.no] = JSON.parse(read(f)).beats || [] } catch (e) { console.warn(`! ${f}: ${e.message}`); continue }
    for (const b of beatsOf[c.no]) beatImgs[b.id] = await prepImage(path.join(illDir, b.id), imgWeb, imgPrint, b.id)
  }
  const ALT = artAlts()
  const words = chapters.reduce((s, c) => s + (c.story.match(/[\p{L}\p{N}][\p{L}\p{N}'’\-]*/gu) || []).length, 0)

  const withBeats = (c) => {
    const list = (beatsOf[c.no] || []).filter((b) => beatImgs[b.id])
    if (!list.length) return { md: c.story, figs: [] }
    const paras = c.story.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean)
    const after = {}, figs = []
    for (const b of list) {
      const hits = paras.map((x, i) => (x.includes(b.anchor) ? i : -1)).filter((i) => i >= 0)
      if (hits.length !== 1) { console.warn(`! ${b.id}: anchor ${hits.length ? 'not unique' : 'not found'} in chapter ${c.no}, image left out`); continue }
      ;(after[hits[0]] ||= []).push(figs.length)
      figs.push(b)
    }
    const md = paras.map((x, i) => [x, ...(after[i] || []).map((k) => `BEATPLACEHOLDER${k}X`)].join('\n\n')).join('\n\n') + '\n'
    return { md, figs }
  }
  const beatFigure = (b, mode) => {
    const im = beatImgs[b.id]
    const alt = b.alt || ALT[b.id] || ''
    return mode === 'print'
      ? `<figure class="beat"><img src="file://${im.print}" alt=""></figure>`
      : `<figure class="illus beat">${picture(im, alt, { sizes: '(max-width: 760px) 100vw, 800px' })}</figure>`
  }
  const chapterBody = (c, mode) => {
    const { md, figs } = withBeats(c)
    let story = frenchTypo(renderMarkdown(md))
    story = story.replace(/<p>BEATPLACEHOLDER(\d+)X<\/p>/g, (_, k) => beatFigure(figs[Number(k)], mode)).replace(/BEATPLACEHOLDER\d+X/g, '')
    const carnet = frenchTypo(carnetHTML(c.carnetRaw, mode === 'print' ? 520 : 620))
    return { story, carnet, beats: figs.length }
  }

  /* ---------- web reader: one page per chapter ---------- */
  const chHref = (c) => `ch-${pad2(c.no)}.html`
  const toc = [1, 2, 3, 4, 5].map((p) => {
    const list = chapters.filter((c) => c.part === p)
    if (!list.length) return ''
    return `<li class="toc-part"><span>Partie ${ROMAN[p]} · ${esc(T1_PARTS[p].title)}, ${esc(T1_PARTS[p].piece.toLowerCase())}</span><ol>${list.map((c) => `<li><a href="${chHref(c)}" data-page="ch-${pad2(c.no)}"><b>${c.no}.</b> ${esc(c.title)}</a></li>`).join('')}</ol></li>`
  }).join('')
  for (const old of fs.readdirSync(webDir).filter((f) => /^ch-\d\d\.html$/.test(f))) fs.rmSync(path.join(webDir, old))
  const T1_TITLE = 'Lionceaux · Le Ballon qui voyage'
  chapters.forEach((c, i) => {
    const id = pad2(c.no)
    const first = i === 0 || chapters[i - 1].part !== c.part
    const pi = partImgs[c.part]
    const opener = first ? `<section class="part-opener" id="partie-${c.part}">${pi ? picture(pi, ALT[`part${c.part}`] || '', { sizes: '100vw', lazy: false }) : ''}<div class="part-text"><div class="kicker">Partie ${ROMAN[c.part]}</div><h2>${esc(T1_PARTS[c.part].title)}</h2><p>${esc(T1_PARTS[c.part].piece)} · ${esc(T1_PARTS[c.part].sub)}</p></div></section>` : ''
    const { story, carnet } = chapterBody(c, 'web')
    const im = chImgs[c.no]
    const prev = i > 0 ? { href: chHref(chapters[i - 1]), label: `${chapters[i - 1].no}. ${esc(chapters[i - 1].title)}` } : { href: './', label: 'Couverture et sommaire' }
    const next = i < chapters.length - 1 ? { href: chHref(chapters[i + 1]), label: `${chapters[i + 1].no}. ${esc(chapters[i + 1].title)}` } : { href: './#fin', label: 'Fin du tome 1' }
    const html = `${readerHead({ title: `${c.no}. ${c.title} | Lionceaux, tome 1`, desc: c.summary || '', og: im ? `/book/tome1/img/${im.web}` : '/book/tome1/img/cover.jpg', css: TOME1_WEB_CSS })}<body class="tome1 paged" data-page="ch-${id}">
${readerBar({ back: './', backLabel: 'Sommaire', title: T1_TITLE })}
<main>${opener}<article class="chapter" id="ch-${id}" data-no="${c.no}"><header><div class="kicker">Chapitre ${c.no} sur ${chapters.length}</div><h1 class="ch-title">${frenchTypo(esc(c.title))}</h1></header>${im ? `<figure class="illus">${picture(im, ALT[`ch${id}`] || c.title, { lazy: !first && i > 0 ? true : false })}</figure>` : ''}<div class="story">${story}</div>${carnet}</article>
${pagerNav(prev, next)}</main>
${readerDrawer(toc)}
<script>${PAGED_JS('njangi.tome1')}</script></body></html>`
    write(path.join(webDir, chHref(c)), html)
  })
  const webHtml = `${readerHead({ title: 'Lionceaux, tome 1 : Le Ballon qui voyage', desc: "Lionceaux, tome 1 : l'aventure de Kaydoudou et BriBri, deux frères camerounais qui font voyager le ballon du Cameroun à l'Angleterre.", og: '/book/tome1/img/cover.jpg', css: TOME1_WEB_CSS })}<body class="tome1 paged" data-page="index">
${readerBar({ back: '/app/livres', backLabel: 'Ndamba', title: T1_TITLE })}
<main>
<section class="cover-block">${cover ? picture(cover, 'Couverture de Lionceaux, tome 1 : Le Ballon qui voyage. Kaydoudou et BriBri au départ de leur voyage.', { cls: 'cover', lazy: false, sizes: '(max-width: 760px) 78vw, 420px' }) : `<div class="cover cover-drawn"><div><small>Lionceaux</small><b>Le Ballon qui voyage</b><span>Tome 1</span></div></div>`}<h1>Lionceaux</h1><p class="subtitle">Tome 1 : Le Ballon qui voyage</p><p class="heroes">Une aventure de Kaydoudou &amp; BriBri</p><p class="author">William Foteping</p>
<div class="start"><a class="resume" id="resume" href="ch-01.html" hidden><small>Reprendre la lecture</small><b></b></a><a class="begin" href="ch-01.html">Commencer au chapitre 1</a></div>
<p class="dedication">Pour Kaydoudou et BriBri.<br>Que le ballon voyage toujours,<br>et qu’il sache toujours où il va.<br><em>Papa</em></p></section>
${characters ? `<figure class="illus wide">${picture(characters, ALT['sheet-brothers'] || 'Kaydoudou et BriBri')}<figcaption>BriBri, 12 ans, le grand frère, et Kaydoudou, 10 ans, le petit frère.</figcaption></figure>` : ''}
${family ? `<figure class="illus wide">${picture(family, ALT['sheet-adults'] || 'La famille')}<figcaption>Mami Nyanga, Tonton Fokou, Papa et Maman.</figcaption></figure>` : ''}
<nav class="toc" id="toc"><h2>Les ${chapters.length} chapitres</h2><ol>${toc}</ol></nav>
<footer class="end" id="fin"><p>« Le ballon doit voyager. Mais il doit savoir où il va. »</p><p>À suivre : <b>Lionceaux, tome 2 : La Tanière des Lionceaux</b>.</p><a href="/app/joueur/lecons">Les ${chapters.length} Leçons du Ballon dans l’application</a></footer>
</main>
${readerDrawer(toc)}
<script>${PAGED_JS('njangi.tome1')}</script></body></html>`
  write(path.join(webDir, 'index.html'), webHtml)

  /* ---------- print (6 x 9 in) ---------- */
  const imgSrc = (o) => (o ? 'file://' + o.print : '')
  let pages = ''
  pages += cover ? `<section class="pg cover-page"><img src="${imgSrc(cover)}" alt=""></section>` : `<section class="pg cover-page drawn"><div><small>William Foteping</small><h1>Lionceaux</h1><p>Tome 1 · Le Ballon qui voyage</p></div></section>`
  pages += `<section class="pg front half-title"><h1>Lionceaux</h1><p>Le Ballon qui voyage</p></section>`
  pages += `<section class="pg front title-page"><p class="author">William Foteping</p><h1>Lionceaux</h1><p class="tome">Tome 1</p><p class="sub">Le Ballon qui voyage</p><p class="heroes">Une aventure de Kaydoudou &amp; BriBri</p><p class="publisher">Ndamba · Lemon Network Solutions</p></section>`
  pages += `<section class="pg front copyright"><p>© ${new Date().getFullYear()} William Foteping. Tous droits réservés.</p><p>Ce livre est une œuvre de fiction. Les clubs, les académies et les personnages sont imaginaires ; seuls quelques faits réels de la Coupe du monde 2026 et la légende de Roger Milla sont évoqués.</p><p>Les illustrations ont été créées avec l’aide d’outils d’intelligence artificielle, sous la direction de l’auteur.</p><p>Saga <i>Lionceaux</i>. Le compagnon de ce roman, <i>Le Code Njangi</i>, et l’application Ndamba enseignent aux entraîneurs et aux joueurs la possession avec intention.</p></section>`
  pages += `<section class="pg front dedication"><p>Pour Kaydoudou et BriBri.</p><p>Que le ballon voyage toujours,<br>et qu’il sache toujours où il va.</p><p class="sign">Papa</p></section>`
  if (characters) pages += `<section class="pg illus-page"><img src="${imgSrc(characters)}" alt=""></section>`
  if (family) pages += `<section class="pg illus-page"><img src="${imgSrc(family)}" alt=""></section>`
  pages += `<section class="pg front map"><h2>Le voyage</h2>${JOURNEY_SVG}<p class="map-cap">Douala et Bafoussam · Waldorf (Maryland) · Bussy-Saint-Georges · la côte catalane · Londres</p></section>`
  pages += `<section class="pg front toc-page"><h2>Sommaire</h2><ol>${[1, 2, 3, 4, 5].map((p) => `<li class="toc-part">Partie ${ROMAN[p]} · ${esc(T1_PARTS[p].title)}<ol>${chapters.filter((c) => c.part === p).map((c) => `<li><span>${c.no}.</span> ${frenchTypo(esc(c.title))}</li>`).join('')}</ol></li>`).join('')}</ol></section>`
  let lastPart = 0
  for (const c of chapters) {
    if (c.part !== lastPart) {
      lastPart = c.part
      const pi = partImgs[c.part]
      if (pi) pages += `<section class="pg illus-page"><img src="${imgSrc(pi)}" alt=""></section>`
      pages += `<section class="pg part-page"><div class="kicker">Partie ${ROMAN[c.part]}</div><h2>${esc(T1_PARTS[c.part].title)}</h2><p class="piece">${esc(T1_PARTS[c.part].piece)}</p><p class="sub">${esc(T1_PARTS[c.part].sub)}</p></section>`
    }
    const im = chImgs[c.no]
    if (im) pages += `<section class="pg illus-page"><img src="${imgSrc(im)}" alt=""></section>`
    const { story, carnet } = chapterBody(c, 'print')
    pages += `<section class="pg chapter"><header><div class="kicker">Chapitre ${c.no}</div><h2>${frenchTypo(esc(c.title))}</h2><div class="ornament">${ORNAMENT}</div></header><div class="story">${story}</div>${carnet}</section>`
  }
  pages += `<section class="pg front the-end"><p class="motto">« Le ballon doit voyager.<br>Mais il doit savoir où il va. »</p><p>À suivre…</p><p class="next">Lionceaux, tome 2 · La Tanière des Lionceaux</p></section>`
  const printHtml = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Lionceaux, tome 1 : Le Ballon qui voyage</title><style>${fontFaces('file://' + path.join(PUBLIC, 'book', 'fonts') + '/')}${TOME1_PRINT_CSS}</style></head><body>${pages}</body></html>`
  write(path.join(BUILD, 'tome1-print.html'), printHtml)
  console.log(`tome1: ${chapters.length} chapters, ${words} words, ${Object.values(chImgs).filter(Boolean).length} chapter illustrations, ${Object.values(beatImgs).filter(Boolean).length} in-text illustrations`)
  return { chapters: chapters.length, words }
}

/* ------------------------------------------------------------------ La Méthode Njangi */

const COACH_CALLOUTS = { NJANGI: 'Principe Njangi', AFRIQUE: 'En Afrique', ANALYSTE: 'Pour l’analyste', JEUNES: 'Avec les jeunes', ATTENTION: 'Attention' }
const FAMILY_FR = { technique: 'Technique et combinaisons', rondo: 'Rondos', position: 'Jeux de position', ssg: 'Petits jeux', lsg: 'Grands jeux', phase: 'Phases de jeu', transition: 'Transitions', finishing: 'Finition' }
const FAMILY_COLOR = { technique: '#5B4A8A', rondo: '#1F4D3A', position: '#2F6B52', ssg: '#C5762F', lsg: '#A86020', phase: '#3D4F6B', transition: '#B8432F', finishing: '#C08A15' }
const INTENT_FR = { sortir: 'Sortir', progresser: 'Progresser', fixer: 'Fixer', finir: 'Finir', respirer: 'Respirer', reprendre: 'Reprendre', 'regarder-devant': 'Regarder devant' }
const INTENSITY_FR = { low: 'Basse', medium: 'Moyenne', high: 'Haute', 'very-high': 'Très haute' }
const FAM_ORDER = ['technique', 'rondo', 'position', 'ssg', 'lsg', 'phase', 'transition', 'finishing']

function coachChapters() {
  const dir = path.join(ROOT, 'coach', 'chapters')
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter((f) => /^\d\d-.*\.md$/.test(f)).sort().map((f) => {
    const { meta, body } = frontMatter(read(path.join(dir, f)))
    return { file: f, no: Number(meta.numero), slug: meta.slug, title: meta.titre, part: Number(meta.partie), partTitle: meta.titrePartie, summary: meta.resume, body }
  }).sort((a, b) => a.no - b.no)
}

function coachDrills() {
  const dir = path.join(ROOT, 'coach', 'drills')
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) { try { out.push(JSON.parse(read(path.join(dir, f)))) } catch { /* skip */ } }
  return out.sort((a, b) => FAM_ORDER.indexOf(a.family) - FAM_ORDER.indexOf(b.family) || a.order - b.order)
}

function drillHTML(d, width) {
  const t = d.fr
  const li = (arr) => `<ul>${(arr || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`
  return frenchTypo(`<article class="drill" id="drill-${d.id}" style="--fam:${FAMILY_COLOR[d.family] || '#1F4D3A'}">
<header class="drill-head"><div class="drill-code">${d.id}</div><div><div class="drill-family">${esc(FAMILY_FR[d.family])}</div><h3>${esc(t.title)}</h3><p class="drill-sub">${esc(t.subtitle)}</p></div></header>
<div class="drill-meta"><span><b>Âge</b> ${esc(d.ages)}</span><span><b>Joueurs</b> ${esc(d.players?.fr)}</span><span><b>Espace</b> ${d.space?.w} x ${d.space?.h} m</span><span><b>Durée</b> ${esc(d.duration?.fr)}</span><span><b>Jour</b> ${esc((d.md || []).join(', ').replace('youth', 'Jeunes'))}</span><span><b>Intensité</b> ${esc(INTENSITY_FR[d.intensity])}</span><span><b>Intentions</b> ${esc((d.intentions || []).map((i) => INTENT_FR[i]).join(', '))}</span></div>
<figure class="diagram">${renderDiagram(d.diagram, { width })}</figure>
<p class="drill-objective">${esc(t.objective)}</p>
<div class="drill-cols"><div><h4>Organisation</h4>${li(t.organisation)}<h4>Règles</h4>${li(t.rules)}</div><div><h4>Consignes</h4>${li(t.coaching)}<h4>Progressions</h4>${li(t.progressions)}<h4>Régressions</h4>${li(t.regressions)}</div></div>
${d.diagram2 ? `<figure class="diagram diagram2"><figcaption>Progression</figcaption>${renderDiagram(d.diagram2, { width: Math.round(width * 0.8) })}</figure>` : ''}
<p class="drill-measure"><b>À mesurer.</b> ${esc(t.measure)}</p>
${t.story ? `<p class="drill-story">${esc(t.story)}</p>` : ''}
</article>`)
}

async function buildMethode() {
  const chapters = coachChapters()
  const drills = coachDrills()
  const webDir = path.join(PUBLIC, 'book', 'methode')
  const mCover = await prepImage(path.join(ROOT, 'coach', 'illustrations', 'cover'), path.join(webDir, 'img'), path.join(BUILD, 'methode-img'), 'cover')
  copyFonts(path.join(PUBLIC, 'book', 'fonts'))
  const words = chapters.reduce((s, c) => s + (c.body.replace(/```[\s\S]*?```/g, '').match(/[\p{L}\p{N}][\p{L}\p{N}'’\-]*/gu) || []).length, 0)
  const parts = []
  for (const c of chapters) { if (!parts.find((p) => p.part === c.part)) parts.push({ part: c.part, title: c.partTitle }) }
  const chapterHTML = (c, width) => frenchTypo(renderMarkdown(c.body, { callouts: COACH_CALLOUTS, drillLinks: true, diagramWidth: width }))
  const drillsAfter = 31 // the drill sheets follow chapter 31 "Comment utiliser les fiches"
  const ANNEX_PART = 10, DRILL_PART = 7

  /* web: one page per chapter, the drill sheets on one page per family */
  const famPage = (fam) => `fiches-${fam}.html`
  const drillFam = Object.fromEntries(drills.map((d) => [d.id, d.family]))
  const drillHref = (id) => (drillFam[id] ? `${famPage(drillFam[id])}#drill-${id}` : 'fiches.html')
  const fixDrillLinks = (html) => html.replace(/href="#drill-([A-Z]\d\d)"/g, (_, id) => `href="${drillHref(id)}"`)
  const chHref = (c) => `ch-${pad2(c.no)}.html`
  const partLabel = (p) => (p.part === 0 ? 'Avant-propos' : p.part === ANNEX_PART ? 'Annexes' : 'Partie ' + p.part + ' · ' + esc(p.title || ''))
  const tocItems = parts.map((p) => `<li class="toc-part"><span>${partLabel(p)}</span><ol>${chapters.filter((c) => c.part === p.part).map((c) => `<li><a href="${chHref(c)}" data-page="ch-${pad2(c.no)}">${c.no ? `<b>${c.no}.</b> ` : ''}${esc(c.title)}</a></li>`).join('')}${p.part === DRILL_PART ? `<li><a href="fiches.html" data-page="fiches"><b>${drills.length}</b> fiches d’exercices</a></li>` : ''}</ol></li>`).join('')
  for (const old of fs.readdirSync(webDir).filter((f) => /^(ch-\d\d|fiches(-[a-z]+)?)\.html$/.test(f))) fs.rmSync(path.join(webDir, old))
  // reading order: chapters, with the drill catalogue right after chapter 31
  const seq = []
  for (const c of chapters) { seq.push({ type: 'ch', c, href: chHref(c), label: `${c.no ? c.no + '. ' : ''}${esc(c.title)}` }); if (c.no === drillsAfter) seq.push({ type: 'fiches', href: 'fiches.html', label: `Les ${drills.length} fiches d’exercices` }) }
  const M_TITLE = 'Le Code Njangi'
  const drillMap = `<script>window.DRILL_PAGE=${JSON.stringify(Object.fromEntries(drills.map((d) => [d.id, famPage(d.family)])))}</script>`
  seq.forEach((it, i) => {
    const prev = i > 0 ? seq[i - 1] : { href: './', label: 'Couverture et sommaire' }
    const next = i < seq.length - 1 ? seq[i + 1] : { href: './#fin', label: 'Fin du livre' }
    if (it.type === 'ch') {
      const c = it.c
      const first = i === 0 || seq[i - 1].type !== 'ch' || seq[i - 1].c.part !== c.part
      const opener = first && c.part >= 1 && c.part < ANNEX_PART ? `<section class="part-opener methode"><div class="part-text"><div class="kicker">Partie ${c.part}</div><h2>${esc(c.partTitle || '')}</h2></div></section>` : ''
      const html = `${readerHead({ title: `${c.no ? c.no + '. ' : ''}${c.title} | Le Code Njangi`, desc: c.summary || '', og: '/book/methode/img/cover.jpg', css: METHODE_WEB_CSS })}<body class="methode paged" data-page="ch-${pad2(c.no)}">
${readerBar({ back: './', backLabel: 'Sommaire', title: M_TITLE })}
<main>${opener}<article class="chapter" id="ch-${pad2(c.no)}"><header><div class="kicker">${c.no ? 'Chapitre ' + c.no : esc(c.partTitle || '')}</div><h1 class="ch-title">${frenchTypo(esc(c.title))}</h1></header><div class="story">${fixDrillLinks(chapterHTML(c, 620))}</div></article>
${pagerNav(prev, next)}</main>
${readerDrawer(tocItems)}
<script>${PAGED_JS('njangi.methode')}</script></body></html>`
      write(path.join(webDir, it.href), html)
    } else {
      const fams = FAM_ORDER.filter((fam) => drills.some((d) => d.family === fam))
      const cards = fams.map((fam) => { const list = drills.filter((d) => d.family === fam); return `<section class="fam-card" style="--fam:${FAMILY_COLOR[fam]}"><h2><a href="${famPage(fam)}">${esc(FAMILY_FR[fam])}</a></h2><ol>${list.map((d) => `<li><a href="${famPage(fam)}#drill-${d.id}"><b>${d.id}</b> ${esc(d.fr.title)}</a></li>`).join('')}</ol></section>` }).join('')
      const html = `${readerHead({ title: `Les ${drills.length} fiches d’exercices | Le Code Njangi`, desc: 'Les fiches d’exercices du Code Njangi, par famille.', og: '/book/methode/img/cover.jpg', css: METHODE_WEB_CSS })}<body class="methode paged" data-page="fiches">
${readerBar({ back: './', backLabel: 'Sommaire', title: M_TITLE })}
<main><article class="chapter"><header><div class="kicker">Partie ${DRILL_PART} · Les exercices</div><h1 class="ch-title">Les ${drills.length} fiches d’exercices</h1></header><p class="lead">Huit familles, du geste technique au grand jeu. Choisissez une famille ou une fiche.</p><div class="fam-grid">${cards}</div></article>
${pagerNav(prev, next)}</main>
${readerDrawer(tocItems)}
<script>${PAGED_JS('njangi.methode')}</script></body></html>`
      write(path.join(webDir, 'fiches.html'), html)
      fams.forEach((fam, k) => {
        const list = drills.filter((d) => d.family === fam)
        const pv = k > 0 ? { href: famPage(fams[k - 1]), label: esc(FAMILY_FR[fams[k - 1]]) } : { href: 'fiches.html', label: 'Toutes les familles' }
        const nx = k < fams.length - 1 ? { href: famPage(fams[k + 1]), label: esc(FAMILY_FR[fams[k + 1]]) } : { href: seq[i + 1] ? seq[i + 1].href : './', label: seq[i + 1] ? seq[i + 1].label : 'Sommaire' }
        const page = `${readerHead({ title: `${FAMILY_FR[fam]} | Le Code Njangi`, desc: `Les fiches ${FAMILY_FR[fam]} du Code Njangi.`, og: '/book/methode/img/cover.jpg', css: METHODE_WEB_CSS })}<body class="methode paged" data-page="${famPage(fam).replace('.html', '')}">
${readerBar({ back: 'fiches.html', backLabel: 'Fiches', title: M_TITLE })}
<main><section id="fiches" class="drills-grid"><h1 class="fam-title" style="--fam:${FAMILY_COLOR[fam]}">${esc(FAMILY_FR[fam])}</h1>${fixDrillLinks(list.map((d) => drillHTML(d, 600)).join(''))}</section>
${pagerNav(pv, nx)}</main>
${readerDrawer(tocItems)}
<script>${PAGED_JS('njangi.methode')}</script></body></html>`
        write(path.join(webDir, famPage(fam)), page)
      })
    }
  })
  const webHtml = `${readerHead({ title: 'Le Code Njangi : posséder avec intention', desc: 'La méthode africaine pour gagner la Coupe du monde : philosophie, technique, tactique, exercices, semaine type, analyse.', og: '/book/methode/img/cover.jpg', css: METHODE_WEB_CSS })}<body class="methode paged" data-page="index">
${readerBar({ back: '/app/livres', backLabel: 'Ndamba', title: M_TITLE })}
<main>
${mCover ? `<section class="cover-block">${picture(mCover, 'Couverture du Code Njangi : un stade africain au crépuscule, les passes de l’équipe dessinent des triangles lumineux vers le but.', { cls: 'cover', lazy: false, sizes: '(max-width: 760px) 78vw, 420px' })}<h1>Le Code Njangi</h1><p class="subtitle">Posséder avec intention</p><p class="heroes">La méthode africaine pour gagner la Coupe du monde</p><p class="author">William Foteping</p>` : `<section class="cover-block"><h1>Le Code Njangi</h1><p class="subtitle">Posséder avec intention</p>`}
<div class="start"><a class="resume" id="resume" href="ch-00.html" hidden><small>Reprendre la lecture</small><b></b></a><a class="begin" href="ch-00.html">Commencer la lecture</a></div></section>
<nav class="toc" id="toc"><h2>Sommaire</h2><ol>${tocItems}</ol></nav>
<footer class="end" id="fin"><p>« Le ballon doit voyager. Mais il doit savoir où il va. »</p><a href="/app/exercices">Les ${drills.length} exercices dans l’application</a></footer>
</main>
${readerDrawer(tocItems)}
${drillMap}<script>${PAGED_JS('njangi.methode')}</script></body></html>`
  write(path.join(webDir, 'index.html'), webHtml)

  /* print (7 x 10 in) */
  let pages = mCover ? `<section class="pg cover-page cover-art"><img src="file://${mCover.print}" alt=""></section>` : `<section class="pg cover-page methode-cover-print"><div class="m-kicker">William Foteping</div><div class="m-title">Le Code<br>Njangi</div><div class="m-sub">Posséder avec intention</div><div class="m-line">La méthode africaine pour gagner la Coupe du monde</div><div class="m-pitch">${COVER_PITCH}</div><ul><li>${drills.length} exercices</li><li>Des jeunes aux pros</li><li>La semaine d’entraînement</li><li>Périodisation</li><li>L’analyse</li></ul></section>`
  pages += `<section class="pg front title-page"><p class="author">William Foteping</p><h1>Le Code Njangi</h1><p class="sub">Posséder avec intention : la méthode africaine pour gagner la Coupe du monde</p><p class="publisher">Ndamba · Lemon Network Solutions</p></section>`
  pages += `<section class="pg front copyright"><p>© ${new Date().getFullYear()} William Foteping. Tous droits réservés.</p><p>Les faits historiques cités concernent les Coupes du monde de 1990 à 2026. Les repères de charge, de chaleur et de récupération sont des conseils généraux : ils ne remplacent jamais l’avis d’un médecin ou d’un préparateur qualifié.</p><p>Compagnon de la saga <i>Lionceaux</i> (Kaydoudou &amp; BriBri) et de l’application Ndamba.</p></section>`
  pages += `<section class="pg front toc-page"><h2>Sommaire</h2><ol>${parts.map((p) => `<li class="toc-part">${p.part === 0 ? 'Avant-propos' : p.part === ANNEX_PART ? 'Annexes' : 'Partie ' + p.part + ' · ' + esc(p.title || '')}<ol>${chapters.filter((c) => c.part === p.part).map((c) => `<li>${c.no ? `<span>${c.no}.</span> ` : ''}${frenchTypo(esc(c.title))}</li>`).join('')}${p.part === DRILL_PART ? `<li><span>·</span> Les ${drills.length} fiches d’exercices</li>` : ''}</ol></li>`).join('')}</ol></section>`
  let lastPart = -1
  for (const c of chapters) {
    if (c.part !== lastPart) { lastPart = c.part; if (c.part >= 1 && c.part < ANNEX_PART) pages += `<section class="pg part-page"><div class="kicker">Partie ${c.part}</div><h2>${esc(c.partTitle || '')}</h2></section>` }
    pages += `<section class="pg chapter"><header><div class="kicker">${c.no ? 'Chapitre ' + c.no : esc(c.partTitle || '')}</div><h2>${frenchTypo(esc(c.title))}</h2></header><div class="story">${chapterHTML(c, 560).replace(/href="#drill-/g, 'data-drill="')}</div></section>`
    if (c.no === drillsAfter) {
      for (const fam of FAM_ORDER) {
        const list = drills.filter((d) => d.family === fam)
        if (!list.length) continue
        pages += `<section class="pg fam-page" style="--fam:${FAMILY_COLOR[fam]}"><div class="kicker">Les ${drills.length} exercices</div><h2>${esc(FAMILY_FR[fam])}</h2><ol>${list.map((d) => `<li><b>${d.id}</b> ${esc(d.fr.title)}</li>`).join('')}</ol></section>`
        pages += list.map((d) => `<section class="pg drill-page">${drillHTML(d, 560)}</section>`).join('')
      }
    }
  }
  pages += `<section class="pg front the-end"><p class="motto">« Le ballon doit voyager.<br>Mais il doit savoir où il va. »</p><p class="next">2030 ou 2034.</p></section>`
  const printHtml = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Le Code Njangi</title><style>${fontFaces('file://' + path.join(PUBLIC, 'book', 'fonts') + '/')}${METHODE_PRINT_CSS}</style></head><body>${pages}</body></html>`
  write(path.join(BUILD, 'methode-print.html'), printHtml)
  console.log(`methode: ${chapters.length} chapters, ${words} words, ${drills.length} drills`)
  return { chapters: chapters.length, words, drills: drills.length }
}

/* ------------------------------------------------------------------ PDF */

async function printPdf(htmlFile, pdfFile, size, footerFont) {
  const { chromium } = requireG('playwright')
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto('file://' + htmlFile, { waitUntil: 'load', timeout: 180000 })
  await page.evaluate(() => document.fonts.ready)
  fs.mkdirSync(path.dirname(pdfFile), { recursive: true })
  await page.pdf({
    path: pdfFile, width: size.w, height: size.h, printBackground: true, preferCSSPageSize: true,
    displayHeaderFooter: true, headerTemplate: '<div></div>',
    footerTemplate: `<div style="width:100%;text-align:center;font-family:${footerFont};font-size:8px;color:#6B6458;"><span class="pageNumber"></span></div>`,
  })
  await browser.close()
  const { PDFDocument } = requireG('pdf-lib')
  const doc = await PDFDocument.load(fs.readFileSync(pdfFile))
  return doc.getPageCount()
}

/* ------------------------------------------------------------------ shared CSS and JS */

const ORNAMENT = `<svg viewBox="0 0 120 14" width="120" height="14" aria-hidden="true"><line x1="0" y1="7" x2="46" y2="7" stroke="#C5762F" stroke-width="1"/><circle cx="60" cy="7" r="5.5" fill="none" stroke="#1F4D3A" stroke-width="1.4"/><path d="M57 5.5 l3 -2 l3 2 l-1 3.2 h-4 z" fill="#1F4D3A"/><line x1="74" y1="7" x2="120" y2="7" stroke="#C5762F" stroke-width="1"/></svg>`

const JOURNEY_SVG = `<svg class="journey" viewBox="0 0 600 420" aria-label="Le voyage de Kaydoudou et BriBri">
<rect width="600" height="420" rx="18" fill="#F4EEDF"/>
<g fill="#E4DCC6" stroke="#CFC4A8" stroke-width="1">
<path d="M70 70 C120 40 200 50 230 90 C250 130 220 170 190 190 C170 230 150 250 130 230 C100 200 60 160 55 120 Z"/>
<path d="M300 60 C340 40 400 45 420 70 C430 95 410 120 380 125 C350 128 320 120 305 100 Z"/>
<path d="M330 150 C380 140 430 160 440 210 C450 270 420 330 380 350 C350 360 330 320 320 280 C310 230 300 190 330 150 Z"/>
</g>
<g font-family="Fraunces, Georgia, serif" font-size="15" fill="#1D2621" font-weight="600">
<circle cx="372" cy="232" r="7" fill="#1F4D3A"/><text x="384" y="250">Douala · Bafoussam</text>
<circle cx="168" cy="118" r="7" fill="#C5762F"/><text x="96" y="104">Waldorf (Maryland)</text>
<circle cx="352" cy="88" r="7" fill="#C5762F"/><text x="330" y="70">Paris</text>
<circle cx="338" cy="118" r="7" fill="#C5762F"/><text x="250" y="140">Catalogne</text>
<circle cx="342" cy="62" r="7" fill="#B8432F"/><text x="356" y="44">Londres</text>
</g>
<g fill="none" stroke="#1D2621" stroke-width="2" stroke-dasharray="6 6" stroke-linecap="round">
<path d="M372 232 C300 220 220 170 168 118"/><path d="M168 118 C230 70 300 70 352 88"/><path d="M352 88 C350 100 342 108 338 118"/><path d="M338 118 C360 100 352 78 342 62"/>
</g>
<g font-family="Inter, Arial, sans-serif" font-size="12" fill="#66706A"><text x="24" y="398">I Cameroun · II États-Unis · III France · IV Espagne · V Angleterre</text></g>
</svg>`

const COVER_PITCH = renderDiagram({ view: 'half', players: [
  { id: 'g', team: 'a', x: 6, y: 34, label: '4' }, { id: 'p', team: 'a', x: 16, y: 26, label: '6' }, { id: 'k', team: 'a', x: 24, y: 40, label: '8' },
  { id: 'l', team: 'a', x: 32, y: 22, label: '10' }, { id: 'b', team: 'a', x: 40, y: 10, label: '7' }, { id: 's', team: 'a', x: 45, y: 34, label: '9' },
  { id: 'd1', team: 'b', x: 30, y: 33 }, { id: 'd2', team: 'b', x: 40, y: 26 }, { id: 'd3', team: 'b', x: 41, y: 42 }], ball: 'g',
  arrows: [{ from: 'g', to: 'p', kind: 'pass', n: 1 }, { from: 'p', to: 'k', kind: 'pass', n: 2 }, { from: 'k', to: 'l', kind: 'pass', n: 3 }, { from: 'l', to: 'b', kind: 'pass', n: 4 }, { from: 'b', to: [47, 30], kind: 'pass', n: 5 }, { from: 's', to: [47, 30], kind: 'run' }] }, { width: 420, radius: 14 })

const READER_JS = (key) => `
(function(){var K='${key}';var b=document.body;
try{var fs=localStorage.getItem(K+'.fs');if(fs)b.style.setProperty('--fs',fs)}catch(e){}
var sizes=['17px','19px','21px'];document.getElementById('aa').onclick=function(){var c=getComputedStyle(b).getPropertyValue('--fs').trim()||sizes[0];var n=sizes[(sizes.indexOf(c)+1)%sizes.length];b.style.setProperty('--fs',n);try{localStorage.setItem(K+'.fs',n)}catch(e){}};
var d=document.getElementById('drawer');document.getElementById('toc-btn').onclick=function(){d.hidden=false};document.getElementById('close').onclick=function(){d.hidden=true};d.onclick=function(e){if(e.target.tagName==='A'||e.target===d)d.hidden=true};
var arts=[].slice.call(document.querySelectorAll('.chapter'));var prog=document.getElementById('prog');var t=0;
window.addEventListener('scroll',function(){if(t)return;t=setTimeout(function(){t=0;var h=document.documentElement;prog.style.width=(100*h.scrollTop/(h.scrollHeight-h.clientHeight))+'%';var cur=null;for(var i=0;i<arts.length;i++){if(arts[i].getBoundingClientRect().top<200)cur=arts[i].id}if(cur){try{localStorage.setItem(K+'.pos',cur)}catch(e){}}},150)},{passive:true});
try{var pos=localStorage.getItem(K+'.pos');var r=document.getElementById('resume');if(pos&&r&&!location.hash){r.hidden=false;r.href='#'+pos}}catch(e){}
})();`

const READER_CSS = `
:root{--ink:#1D2621;--soft:#38423C;--muted:#66706A;--cream:#FBF7EE;--paper:#FFFDF8;--sand:#F1EADB;--line:#E6DDCB;--forest:#1F4D3A;--terra:#C5762F;--sun:#E3A92B;--clay:#B8432F;--fs:17px}
*{box-sizing:border-box}html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}body{margin:0;background:var(--cream);color:var(--ink);font-family:Literata,Georgia,serif;font-size:var(--fs);line-height:1.72}
a{color:var(--forest)}img{max-width:100%;display:block}
.bar{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(251,247,238,.94);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);font-family:Inter,system-ui,sans-serif;font-size:14px}
.bar .back{font-weight:700;text-decoration:none;color:var(--forest)}.bar-title{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:Fraunces,Georgia,serif;font-weight:600;font-size:16px;text-align:center}
.bar button{font:600 13px Inter,system-ui,sans-serif;border:1px solid var(--line);background:var(--paper);border-radius:999px;padding:6px 12px;color:var(--ink);cursor:pointer}
.progress{position:sticky;top:49px;z-index:19;height:3px;background:transparent}.progress span{display:block;height:3px;width:0;background:linear-gradient(90deg,var(--forest),var(--sun),var(--clay))}
main{max-width:720px;margin:0 auto;padding:0 18px 80px}
.cover-block{text-align:center;padding:28px 0 8px}.cover-block .cover{display:block;width:min(400px,82%);height:auto;margin:0 auto 22px;border-radius:12px;box-shadow:0 22px 60px rgba(29,38,33,.32)}.cover-block .heroes{font-family:Inter,sans-serif;font-weight:800;letter-spacing:.16em;text-transform:uppercase;font-size:11.5px;color:#B8862B;margin:10px 0 0}picture{display:contents}figure.illus img,.part-opener img{height:auto}
.cover-block h1{font-family:Fraunces,Georgia,serif;font-size:40px;line-height:1.05;margin:6px 0 4px}.subtitle{font-family:Fraunces,Georgia,serif;font-style:italic;font-size:21px;margin:0;color:var(--soft)}.author{font-family:Inter,sans-serif;font-weight:700;letter-spacing:.14em;text-transform:uppercase;font-size:12px;color:var(--terra);margin:14px 0}
.dedication{font-style:italic;color:var(--soft);margin:22px auto;max-width:420px}
.resume{display:inline-block;margin-top:6px;background:var(--forest);color:var(--cream);font:700 15px Inter,sans-serif;padding:12px 20px;border-radius:14px;text-decoration:none}
.toc{margin:30px 0;padding:22px;background:var(--paper);border:1px solid var(--line);border-radius:18px}.toc h2{font-family:Fraunces,Georgia,serif;margin:0 0 8px}
.toc ol,.drawer ol{list-style:none;margin:0;padding:0}.toc-part>span{display:block;margin:14px 0 6px;font:700 11px Inter,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--terra)}
.toc-part li a{display:block;padding:6px 0;border-bottom:1px solid var(--line);text-decoration:none;color:var(--ink);font-size:16px}.toc-part li a b{color:var(--forest);font-family:Inter,sans-serif;font-size:13px;margin-right:6px}
.part-opener{margin:56px -18px 10px;position:relative;overflow:hidden;border-radius:0;background:var(--forest);color:var(--cream);min-height:220px;display:flex;align-items:flex-end}
.part-opener img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.55}.part-text{position:relative;padding:26px 22px}.part-opener .kicker{color:var(--sun)}
.part-opener h2{font-family:Fraunces,Georgia,serif;font-size:42px;margin:2px 0;line-height:1}.part-opener p{margin:0;font-style:italic;opacity:.92}
.kicker{font:700 11px Inter,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--terra)}
.chapter,.part-opener,.toc,#fiches,.drill{scroll-margin-top:64px}.chapter{padding-top:42px}.chapter header{text-align:center;margin-bottom:18px}.chapter h2{font-family:Fraunces,Georgia,serif;font-size:31px;line-height:1.15;margin:6px 0 0}
.illus{margin:18px -18px 26px}.illus img{width:100%;height:auto}.illus.wide{margin:24px -18px}.illus figcaption{font:13px Inter,sans-serif;color:var(--muted);text-align:center;margin-top:8px}
@media(min-width:760px){.illus,.illus.wide{margin-left:-40px;margin-right:-40px}.illus img{border-radius:16px}.part-opener{margin-left:-40px;margin-right:-40px;border-radius:18px}}
.story p{margin:0 0 .95em;text-align:left;hyphens:auto}.story hr{border:0;text-align:center;margin:1.6em 0}.story hr:after{content:'· · ·';letter-spacing:.6em;color:var(--terra)}
.story h2{font-family:Fraunces,Georgia,serif;font-size:25px;margin:1.6em 0 .4em}.story h3{font-family:Fraunces,Georgia,serif;font-size:20px;margin:1.4em 0 .3em}
.story ul,.story ol{padding-left:1.3em}.story table{width:100%;border-collapse:collapse;font:14px/1.45 Inter,sans-serif;margin:1em 0;display:block;overflow-x:auto}.story th,.story td{border-bottom:1px solid var(--line);padding:7px 8px;text-align:left;vertical-align:top}.story th{font-weight:700;color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.06em}
figure.diagram{margin:18px 0}figure.diagram svg{width:100%;height:auto;display:block;border-radius:12px}
.end{margin:60px 0 0;text-align:center;font-style:italic;color:var(--soft)}.end a{font:700 14px Inter,sans-serif;font-style:normal}
.drawer{position:fixed;inset:0;z-index:50;background:rgba(10,16,13,.5)}.drawer-inner{position:absolute;right:0;top:0;bottom:0;width:min(420px,92vw);background:var(--paper);overflow-y:auto;padding:18px}.drawer button{font:600 13px Inter,sans-serif;border:1px solid var(--line);background:var(--paper);border-radius:999px;padding:6px 12px;margin-bottom:8px}
.drawer .toc-part li a{font-size:15px}
`

const TOME1_WEB_CSS = `
.story .illus.beat{margin:26px -18px 28px}.story .illus.beat img{display:block}@media(min-width:760px){.story .illus.beat{margin:30px -40px 32px}.story .illus.beat img{border-radius:16px;box-shadow:0 14px 40px rgba(29,38,33,.18)}}
.cover-drawn{aspect-ratio:2/3;display:grid;place-items:center;background:radial-gradient(circle at 30% 20%,#E3A92B 0,#C5762F 40%,#7a3e14 100%);color:#FBF7EE;font-family:Fraunces,serif}.cover-drawn b{display:block;font-size:30px}.cover-drawn small{letter-spacing:.2em;text-transform:uppercase;font:700 11px Inter,sans-serif}
.story>p:first-child::first-letter{font-family:Fraunces,Georgia,serif;float:left;font-size:3.4em;line-height:.85;padding:.06em .08em 0 0;color:var(--forest);font-weight:600}
.carnet{margin:34px 0 10px;border-radius:16px;overflow:hidden;background:#FFFDF6;border:1px solid #E9DEC6;box-shadow:0 6px 22px rgba(29,38,33,.08)}
.carnet-band{height:16px;background:repeating-linear-gradient(90deg,#C5762F 0 14px,#E3A92B 14px 22px,#1F4D3A 22px 34px,#B8432F 34px 40px)}
.carnet-inner{padding:18px 20px 16px;background-image:repeating-linear-gradient(0deg,transparent 0 29px,#E7EEF3 29px 30px);background-position:0 8px}
.carnet-kicker{font:700 11px Inter,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--clay)}.carnet-title{font-family:Fraunces,Georgia,serif;font-style:italic;font-weight:600;font-size:23px;line-height:1.2;margin:4px 0 8px;color:var(--forest)}
.carnet-body p,.carnet-body li{font-family:Fraunces,Georgia,serif;font-style:italic;font-size:.98em;line-height:30px;margin:0}.carnet-body ul{padding-left:1.1em;margin:0}
`

const METHODE_WEB_CSS = `
body.methode{font-family:Literata,Georgia,serif}
.methode-cover .m-cover{margin:10px auto 20px;max-width:420px;aspect-ratio:7/10;border-radius:16px;padding:28px 24px;text-align:left;color:#FBF7EE;background:linear-gradient(160deg,#1F4D3A 0%,#173B2C 60%,#0B2116 100%);box-shadow:0 18px 50px rgba(29,38,33,.28);position:relative;overflow:hidden}
.m-kicker{font:700 12px Inter,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#E3A92B}.m-title{font-family:Fraunces,Georgia,serif;font-weight:700;font-size:44px;line-height:1;margin:14px 0 8px}.m-sub{font-family:Fraunces,Georgia,serif;font-style:italic;font-size:20px;color:#F3D9BC}.m-line{font:500 13px Inter,sans-serif;opacity:.85;margin-top:10px}
.m-cover ul{position:absolute;left:24px;bottom:22px;margin:0;padding:0;list-style:none;font:700 13px Inter,sans-serif}.m-cover li:before{content:'';display:inline-block;width:7px;height:7px;border-radius:50%;background:#E3A92B;margin-right:8px;vertical-align:middle}
.part-opener.methode{min-height:150px;background:linear-gradient(120deg,#1F4D3A,#2F6B52)}
.callout{margin:22px 0;padding:14px 16px;border-radius:14px;border-left:5px solid var(--forest);background:#EEF4EF;font-size:.95em}.callout p{margin:.3em 0}
.callout-kicker{font:800 10.5px Inter,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--forest)}.callout-title{font-family:Fraunces,Georgia,serif;font-weight:600;font-size:1.08em;margin:2px 0 4px}
.callout-afrique{border-color:var(--terra);background:#FBF0E3}.callout-afrique .callout-kicker{color:#A86020}.callout-analyste{border-color:#3D4F6B;background:#EEF1F6}.callout-analyste .callout-kicker{color:#3D4F6B}
.callout-jeunes{border-color:var(--sun);background:#FDF6E3}.callout-jeunes .callout-kicker{color:#8F660C}.callout-attention{border-color:var(--clay);background:#FBEAE6}.callout-attention .callout-kicker{color:#9A3524}
.drill-ref{font:700 .82em Inter,sans-serif;background:var(--sand);padding:1px 6px;border-radius:6px;text-decoration:none}
.drills-grid{padding-top:30px}.fam-title{font-family:Fraunces,Georgia,serif;font-size:28px;border-bottom:3px solid var(--fam);padding-bottom:6px;margin:44px 0 8px}
.drill{margin:22px 0;padding:18px;border:1px solid var(--line);border-radius:18px;background:var(--paper)}.drill-head{display:flex;gap:14px;align-items:flex-start}
.drill-code{font:800 18px Inter,sans-serif;color:#fff;background:var(--fam);border-radius:12px;padding:10px 10px;min-width:58px;text-align:center}.drill-family{font:700 11px Inter,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--fam)}
.drill h3{font-family:Fraunces,Georgia,serif;font-size:24px;margin:2px 0}.drill-sub{margin:0;color:var(--muted);font-style:italic}
.drill-meta{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0;font:12.5px Inter,sans-serif}.drill-meta span{background:var(--sand);border-radius:999px;padding:4px 10px}.drill-meta b{color:var(--muted);font-weight:600;margin-right:4px}
.drill-objective{font-weight:600}.drill-cols h4{font:800 11px Inter,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--fam);margin:14px 0 4px}.drill-cols ul{margin:0;padding-left:1.2em;font-size:.95em}
@media(min-width:700px){.drill-cols{display:grid;grid-template-columns:1fr 1fr;gap:20px}}
.drill-measure{background:#EEF4EF;border-radius:10px;padding:10px 12px;font-size:.95em}.drill-story{font-style:italic;color:var(--terra);font-size:.95em}.diagram2 figcaption{font:700 11px Inter,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
`

const PRINT_BASE = `
*{box-sizing:border-box}html,body{margin:0;padding:0}body{color:#1D2621;-webkit-print-color-adjust:exact;print-color-adjust:exact}
img{display:block}.pg{break-before:page}.pg:first-child{break-before:auto}
@page cover{margin:0}@page full{margin:0}
.cover-page{page:cover}.illus-page{page:full}
.kicker{font:700 8pt Inter,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#C5762F}
figure.diagram{margin:10pt 0;break-inside:avoid}figure.diagram svg{width:100%;height:auto;display:block}
`

const TOME1_PRINT_CSS = PRINT_BASE + `
figure.beat{margin:12pt 0 13pt;break-inside:avoid;page-break-inside:avoid}figure.beat img{display:block;width:100%;height:auto;max-height:3.55in;object-fit:cover;border-radius:3pt}
@page{size:6in 9in;margin:0.72in 0.68in 0.8in 0.7in}
@page cover{size:6in 9in;margin:0}@page full{size:6in 9in;margin:0}
body{font-family:Literata,Georgia,serif;font-size:11.4pt;line-height:1.56}
.cover-page,.illus-page{width:6in;height:9in;overflow:hidden}.cover-page img,.illus-page img{width:6in;height:9in;object-fit:cover}
.cover-page.drawn{display:flex;align-items:center;justify-content:center;background:#C5762F;color:#FBF7EE;text-align:center;font-family:Fraunces,serif}
.front{text-align:center;padding-top:1.4in}.front h1{font-family:Fraunces,serif;font-weight:600;font-size:30pt;line-height:1.08;margin:0}
.half-title h1{font-size:24pt}.half-title p{font-family:Fraunces,serif;font-style:italic;font-size:14pt}
.title-page .author{font:700 9pt Inter,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#C5762F}.title-page .tome{font:700 10pt Inter,sans-serif;letter-spacing:.2em;text-transform:uppercase;margin-top:18pt}.title-page .sub{font-family:Fraunces,serif;font-style:italic;font-size:17pt;margin-top:4pt}.title-page .publisher{margin-top:2.3in;font:600 8.5pt Inter,sans-serif;color:#66706A}.title-page .heroes{font:800 8pt Inter,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#B8862B;margin-top:10pt}
.copyright{text-align:left;padding-top:4.6in;font-size:8.5pt;line-height:1.45;color:#38423C}.dedication{padding-top:2.4in;font-style:italic;font-size:13pt}.dedication .sign{font-family:Fraunces,serif;font-style:italic;font-weight:600;margin-top:20pt}
.map{padding-top:.2in}.map h2,.toc-page h2{font-family:Fraunces,serif;font-size:20pt;margin:0 0 12pt}.journey{width:100%;height:auto}.map-cap{font:8.5pt Inter,sans-serif;color:#66706A}
.toc-page{text-align:left;padding-top:0}.toc-page ol{list-style:none;padding:0;margin:0}.toc-page .toc-part{font:700 7.5pt Inter,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#C5762F;margin-top:8pt}.toc-page .toc-part ol li{font:normal 9.6pt Literata,serif;letter-spacing:0;text-transform:none;color:#1D2621;padding:1.2pt 0}.toc-page .toc-part ol li span{display:inline-block;width:20pt;color:#1F4D3A;font-weight:600}
.part-page{text-align:center;padding-top:2.4in}.part-page h2{font-family:Fraunces,serif;font-size:40pt;margin:6pt 0;line-height:1}.part-page .piece{font-family:Fraunces,serif;font-style:italic;font-size:17pt;color:#1F4D3A;margin:4pt}.part-page .sub{font-size:11pt;color:#66706A}
.chapter header{text-align:center;padding-top:.7in;margin-bottom:22pt}.chapter h2{font-family:Fraunces,serif;font-weight:600;font-size:22pt;line-height:1.15;margin:6pt 0 8pt}
.story p{margin:0;text-indent:1.4em;text-align:justify;hyphens:auto;orphans:2;widows:2}.story>p:first-child{text-indent:0}
.story>p:first-child::first-letter{font-family:Fraunces,serif;float:left;font-size:3.5em;line-height:.82;padding:.05em .07em 0 0;color:#1F4D3A;font-weight:600}
.story hr{border:0;text-align:center;margin:12pt 0}.story hr:after{content:'· · ·';letter-spacing:.6em;color:#C5762F}.story hr+p{text-indent:0}
.carnet{margin:18pt 0 0;border:1px solid #E1D4B8;border-radius:8pt;overflow:hidden;break-inside:avoid;background:#FFFDF6}
.carnet-band{height:9pt;background:repeating-linear-gradient(90deg,#C5762F 0 10pt,#E3A92B 10pt 15pt,#1F4D3A 15pt 24pt,#B8432F 24pt 28pt)}
.carnet-inner{padding:10pt 12pt 8pt;background-image:repeating-linear-gradient(0deg,transparent 0 19pt,#E3EAEF 19pt 20pt)}
.carnet-kicker{font:700 7pt Inter,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#B8432F}.carnet-title{font-family:Fraunces,serif;font-style:italic;font-weight:600;font-size:14pt;color:#1F4D3A;margin:2pt 0 4pt}
.carnet-body p,.carnet-body li{font-family:Fraunces,serif;font-style:italic;font-size:10.4pt;line-height:20pt;margin:0;text-indent:0;text-align:left}.carnet-body ul{margin:0;padding-left:12pt}
.carnet-diagram{margin:6pt 0 2pt}
.the-end{padding-top:2.6in}.the-end .motto{font-family:Fraunces,serif;font-style:italic;font-size:15pt}.the-end .next{font-family:Fraunces,serif;font-weight:600;font-size:13pt;color:#1F4D3A}
`

const METHODE_PRINT_CSS = PRINT_BASE + `
@page{size:7in 10in;margin:0.75in 0.72in 0.85in 0.72in}
@page cover{size:7in 10in;margin:0}@page full{size:7in 10in;margin:0}
body{font-family:Literata,Georgia,serif;font-size:10.2pt;line-height:1.55}
.cover-page{width:7in;height:10in;padding:.7in .65in;color:#FBF7EE;background:linear-gradient(160deg,#1F4D3A 0%,#173B2C 60%,#0B2116 100%);position:relative}.cover-page.cover-art{padding:0;background:#0B2116;overflow:hidden}.cover-page.cover-art img{display:block;width:7in;height:10in;object-fit:cover}
.methode-cover-print .m-kicker{font:700 10pt Inter,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#E3A92B}.methode-cover-print .m-title{font-family:Fraunces,serif;font-weight:700;font-size:56pt;line-height:.98;margin:22pt 0 10pt}
.methode-cover-print .m-sub{font-family:Fraunces,serif;font-style:italic;font-size:22pt;color:#F3D9BC}.methode-cover-print .m-line{font:500 11pt Inter,sans-serif;margin-top:10pt;opacity:.9}
.methode-cover-print .m-pitch{margin:18pt 0 0;width:2.9in}.methode-cover-print .m-pitch svg{width:100%;height:auto}
.methode-cover-print ul{position:absolute;left:.65in;bottom:.7in;margin:0;padding:0;list-style:none;font:700 11pt Inter,sans-serif;line-height:1.8}.methode-cover-print li:before{content:'';display:inline-block;width:7pt;height:7pt;border-radius:50%;background:#E3A92B;margin-right:8pt}
.front{text-align:center;padding-top:1.6in}.front h1{font-family:Fraunces,serif;font-size:32pt;margin:0}.title-page .author{font:700 9pt Inter,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#C5762F}.title-page .sub{font-family:Fraunces,serif;font-style:italic;font-size:17pt}.title-page .publisher{margin-top:3in;font:600 8.5pt Inter,sans-serif;color:#66706A}
.copyright{text-align:left;padding-top:5.4in;font-size:8.5pt;color:#38423C}
.toc-page{text-align:left;padding-top:0}.toc-page h2{font-family:Fraunces,serif;font-size:22pt;margin:0 0 10pt}.toc-page ol{list-style:none;padding:0;margin:0}.toc-page .toc-part{font:700 7.5pt Inter,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#C5762F;margin-top:9pt}.toc-page .toc-part ol li{font:normal 9.8pt Literata,serif;text-transform:none;letter-spacing:0;color:#1D2621;padding:1.4pt 0}.toc-page .toc-part ol li span{display:inline-block;width:22pt;color:#1F4D3A;font-weight:600}
.part-page{padding-top:2.8in;text-align:center}.part-page h2{font-family:Fraunces,serif;font-size:34pt;line-height:1.05;margin:8pt 0;color:#1F4D3A}
.chapter header{padding-top:.5in;margin-bottom:16pt}.chapter h2{font-family:Fraunces,serif;font-weight:600;font-size:24pt;line-height:1.12;margin:6pt 0}
.story p{margin:0 0 7pt;text-align:justify;hyphens:auto;orphans:2;widows:2}.story h2{font-family:Fraunces,serif;font-size:15pt;margin:16pt 0 5pt;break-after:avoid;color:#1F4D3A}.story h3{font:700 10.5pt Inter,sans-serif;margin:12pt 0 4pt;break-after:avoid}
.story ul,.story ol{padding-left:14pt;margin:4pt 0 8pt}.story li{margin:1.5pt 0}.story table{width:100%;border-collapse:collapse;font:8.4pt/1.35 Inter,sans-serif;margin:8pt 0;break-inside:avoid}.story th,.story td{border-bottom:.6pt solid #E1D8C6;padding:4pt 5pt;text-align:left;vertical-align:top}.story th{font-weight:700;color:#66706A;text-transform:uppercase;font-size:7pt;letter-spacing:.06em}
.callout{margin:10pt 0;padding:8pt 10pt;border-radius:6pt;border-left:3.5pt solid #1F4D3A;background:#EEF4EF;break-inside:avoid;font-size:9.4pt}.callout p{margin:2pt 0;text-align:left}.callout-kicker{font:800 7pt Inter,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#1F4D3A}.callout-title{font-family:Fraunces,serif;font-weight:600;font-size:10.6pt}
.callout-afrique{border-color:#C5762F;background:#FBF0E3}.callout-afrique .callout-kicker{color:#A86020}.callout-analyste{border-color:#3D4F6B;background:#EEF1F6}.callout-analyste .callout-kicker{color:#3D4F6B}.callout-jeunes{border-color:#E3A92B;background:#FDF6E3}.callout-jeunes .callout-kicker{color:#8F660C}.callout-attention{border-color:#B8432F;background:#FBEAE6}.callout-attention .callout-kicker{color:#9A3524}
.drill-ref{font:700 8pt Inter,sans-serif;background:#F1EADB;padding:0 3pt;border-radius:3pt;color:#1F4D3A;text-decoration:none}
.fam-page{padding-top:2.2in}.fam-page h2{font-family:Fraunces,serif;font-size:34pt;color:var(--fam);margin:6pt 0 14pt}.fam-page ol{list-style:none;padding:0;font-size:11pt;line-height:1.9}.fam-page b{display:inline-block;width:34pt;font-family:Inter,sans-serif;color:var(--fam)}
.drill{font-size:8.9pt;line-height:1.42}.drill-head{display:flex;gap:10pt;align-items:flex-start}.drill-code{font:800 15pt Inter,sans-serif;color:#fff;background:var(--fam);border-radius:7pt;padding:7pt 6pt;min-width:44pt;text-align:center}
.drill-family{font:700 7pt Inter,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--fam)}.drill h3{font-family:Fraunces,serif;font-size:17pt;margin:1pt 0}.drill-sub{margin:0;font-style:italic;color:#66706A}
.drill-meta{display:flex;flex-wrap:wrap;gap:3pt 4pt;margin:6pt 0;font:7.4pt Inter,sans-serif}.drill-meta span{background:#F1EADB;border-radius:9pt;padding:1.5pt 6pt}.drill-meta b{color:#66706A;margin-right:2pt}
.drill figure.diagram{margin:4pt 0}.drill figure.diagram svg{max-height:3.3in;width:auto;max-width:100%;margin:0 auto}.drill-objective{font-weight:600;margin:4pt 0}
.drill-cols{display:grid;grid-template-columns:1fr 1fr;gap:12pt}.drill-cols h4{font:800 7pt Inter,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--fam);margin:6pt 0 2pt}.drill-cols ul{margin:0;padding-left:10pt}.drill-cols li{margin:1pt 0}
.diagram2{display:none}.drill-measure{background:#EEF4EF;border-radius:5pt;padding:5pt 7pt;margin:6pt 0 0}.drill-story{font-style:italic;color:#A86020;margin:4pt 0 0}
.the-end{padding-top:3in}.the-end .motto{font-family:Fraunces,serif;font-style:italic;font-size:16pt}.the-end .next{font-family:Fraunces,serif;font-weight:700;font-size:18pt;color:#1F4D3A}
`

/* ------------------------------------------------------------------ main */

const results = {}
if (!ONLY || ONLY === 'tome1') results.tome1 = await buildTome1()
if (!ONLY || ONLY === 'methode') results.methode = await buildMethode()
if (WANT_PDF) {
  const dl = path.join(BUILD, 'pdf') // print proofs only, never published (no PDF downloads on the site)
  if (results.tome1) { const n = await printPdf(path.join(BUILD, 'tome1-print.html'), path.join(dl, 'lionceaux-tome1-le-ballon-qui-voyage.pdf'), { w: '6in', h: '9in' }, 'Literata, Georgia, serif'); console.log(`tome1 PDF: ${n} pages`) }
  if (results.methode) { const n = await printPdf(path.join(BUILD, 'methode-print.html'), path.join(dl, 'le-code-njangi.pdf'), { w: '7in', h: '10in' }, 'Inter, Arial, sans-serif'); console.log(`methode PDF: ${n} pages`) }
}

