#!/usr/bin/env node
// Builds « Le Guide Ndamba » / "The Ndamba Guide" from guide/{fr,en}/*.md.
//   node tools/build_guide.mjs          -> web readers in app/public/guide/{fr,en}/ + print HTML in build/guide-{fr,en}.html
//   node tools/build_guide.mjs --pdf    -> also prints proof PDFs into build/pdf/ to count pages (never published)
//   node tools/build_guide.mjs --check  -> only checks the sources (dashes, missing screenshots, word counts)
// Screenshots: guide/shots/{fr,en}/NAME.png (full-resolution captures, not committed), referenced as ![alt](shot:NAME "caption").
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { marked } from 'marked'
import { renderDiagram } from './pitch.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(here, '..')
const SRC = path.join(ROOT, 'guide')
const SHOTS = path.join(SRC, 'shots')
const OUT = path.join(ROOT, 'app', 'public', 'guide')
const BUILD = path.join(ROOT, 'build')
const ASSETS = path.join(here, 'guide-assets')
const requireG = createRequire('/opt/npm-tools/node_modules/')
const args = process.argv.slice(2)
const WANT_PDF = args.includes('--pdf')
const CHECK_ONLY = args.includes('--check')

marked.setOptions({ gfm: true, breaks: false })
const read = (p) => fs.readFileSync(p, 'utf8')
const write = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s) }
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const pad2 = (n) => String(n).padStart(2, '0')
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX']

/* ------------------------------------------------------------------ the two editions */

const L = {
  fr: {
    lang: 'fr', other: 'en', otherLabel: 'English', label: 'Français',
    title: 'Le Guide Ndamba',
    subtitle: 'Tout comprendre, tout utiliser, et porter le trophée dans les quinze prochaines années',
    author: 'William Foteping',
    edition: 'Édition française, octobre 2026',
    desc: 'Le guide complet de Ndamba : comprendre la plateforme, utiliser chaque écran, et le plan pour porter la Coupe du monde d’ici quinze ans.',
    back: 'Ndamba', chapters: 'Sommaire', close: 'Fermer', textSize: 'Taille du texte', toc: 'Sommaire',
    prev: 'Précédent', next: 'Suivant', begin: 'Commencer la lecture', resume: 'Reprendre la lecture',
    chapter: 'Chapitre', part: 'Partie', appendix: 'Annexe', appendices: 'Annexes', home: 'Couverture et sommaire',
    readTime: (m) => `${m} min de lecture`, seeFull: 'Ouvrir l’image entière',
    callouts: { ASTUCE: 'Astuce', ATTENTION: 'Attention', INVESTISSEUR: 'Pour l’investisseur', MOLA: 'Demandez à Mola' },
    parts: [
      null,
      ['Comprendre Ndamba', 'Ce qu’est la plateforme, la méthode qui la porte, et pour qui elle existe.'],
      ['Démarrer', 'Le premier passage, la navigation et les réglages.'],
      ['Entraîner', 'Les exercices, les séances et la semaine.'],
      ['L’équipe et les matchs', 'L’effectif, la fiche de chaque joueur et la préparation des matchs.'],
      ['Analyser', 'Coder un match, lire l’Indice Njangi, travailler la vidéo.'],
      ['Le joueur et sa famille', 'L’espace joueur, les Leçons du Ballon, le carnet et les parents.'],
      ['Mola', 'L’agent qui prépare tout dans l’application, et ne fait rien partir sans vous.'],
      ['Les livres et le jeu', 'Le Code Njangi, la saga Lionceaux et Lionceaux Football.'],
      ['Porter le trophée', 'Pourquoi l’Afrique peut gagner, le plan sur quinze ans, le modèle économique et la confiance.'],
    ],
    drills: { title: 'Les 64 exercices', resume: 'La liste complète des exercices de la méthode, par famille, avec leurs intentions et leurs jours.', code: 'Code', name: 'Exercice', fam: 'Famille', int: 'Intentions', md: 'Jours', min: 'Minutes', lead: 'Chaque exercice a sa fiche complète dans l’application (Exercices) et dans Le Code Njangi. Les jours indiquent où il se place dans la semaine du match ; « Jeunes » signale un exercice adapté aux plus jeunes.' },
    FAMILY: { technique: 'Technique et combinaisons', rondo: 'Rondos', position: 'Jeux de position', ssg: 'Petits jeux', lsg: 'Grands jeux', phase: 'Phases de jeu', transition: 'Transitions', finishing: 'Finition' },
    INTENT: { sortir: 'Sortir', progresser: 'Progresser', fixer: 'Fixer', finir: 'Finir', respirer: 'Respirer', reprendre: 'Reprendre', 'regarder-devant': 'Regarder devant' },
    youth: 'Jeunes',
  },
  en: {
    lang: 'en', other: 'fr', otherLabel: 'Français', label: 'English',
    title: 'The Ndamba Guide',
    subtitle: 'Understand it, use all of it, and lift the trophy within the next fifteen years',
    author: 'William Foteping',
    edition: 'English edition, October 2026',
    desc: 'The complete guide to Ndamba: understand the platform, use every screen, and the plan to lift the World Cup within fifteen years.',
    back: 'Ndamba', chapters: 'Contents', close: 'Close', textSize: 'Text size', toc: 'Contents',
    prev: 'Previous', next: 'Next', begin: 'Start reading', resume: 'Resume reading',
    chapter: 'Chapter', part: 'Part', appendix: 'Appendix', appendices: 'Appendices', home: 'Cover and contents',
    readTime: (m) => `${m} min read`, seeFull: 'Open the full image',
    callouts: { TIP: 'Tip', WARNING: 'Watch out', INVESTOR: 'For investors', MOLA: 'Ask Mola', ASTUCE: 'Tip', ATTENTION: 'Watch out', INVESTISSEUR: 'For investors' },
    parts: [
      null,
      ['Understanding Ndamba', 'What the platform is, the method behind it, and who it is for.'],
      ['Getting started', 'The first visit, finding your way and the settings.'],
      ['Training', 'Drills, sessions and the week.'],
      ['Team and matches', 'The squad, each player’s file and preparing matches.'],
      ['Analysis', 'Coding a match, reading the Njangi Index, working with video.'],
      ['The player and the family', 'The player space, the Lessons of the Ball, the notebook and parents.'],
      ['Mola', 'The agent that prepares everything inside the app, and sends nothing without you.'],
      ['The books and the game', 'The Njangi Code, the Lionceaux saga and Lionceaux Football.'],
      ['Lifting the trophy', 'Why Africa can win, the fifteen-year plan, the business model and trust.'],
    ],
    drills: { title: 'The 64 drills', resume: 'The complete list of the method’s drills, by family, with their intentions and days.', code: 'Code', name: 'Drill', fam: 'Family', int: 'Intentions', md: 'Days', min: 'Minutes', lead: 'Each drill has its full card in the app (Drills) and in The Njangi Code. The days show where it sits in the match week; “Youth” marks a drill suited to the youngest players.' },
    FAMILY: { technique: 'Technique and combinations', rondo: 'Rondos', position: 'Positional games', ssg: 'Small-sided games', lsg: 'Large-sided games', phase: 'Phases of play', transition: 'Transitions', finishing: 'Finishing' },
    INTENT: { sortir: 'Play out', progresser: 'Progress', fixer: 'Fix', finir: 'Finish', respirer: 'Breathe', reprendre: 'Win back', 'regarder-devant': 'Look forward' },
    youth: 'Youth',
  },
}

/* ------------------------------------------------------------------ helpers */

function frontMatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n/)
  const meta = {}
  if (m) for (const line of m[1].split('\n')) { const k = line.match(/^(\w+):\s*(.*)$/); if (k) meta[k[1]] = k[2].trim() }
  return { meta, body: m ? raw.slice(m[0].length) : raw }
}

function frenchTypo(html) {
  return html.split(/(<[^>]+>)/g).map((part) => {
    if (part.startsWith('<')) return part
    return part
      .replace(/(?<!&#?[a-zA-Z0-9]+)[  ]*([;!?]+)/g, ' $1')
      .replace(/(\S)[  ]:(\s|$)/g, '$1 :$2')
      .replace(/«[  ]*/g, '« ')
      .replace(/[  ]*»/g, ' »')
      .replace(/'/g, '’')
      .replace(/\.\.\./g, '…')
      .replace(/(\d)-(\d)/g, '$1‑$2')
  }).join('')
}
function englishTypo(html) {
  return html.split(/(<[^>]+>)/g).map((part) => (part.startsWith('<') ? part : part.replace(/'/g, '’').replace(/\.\.\./g, '…'))).join('')
}
// protect <code> and <pre> from typography
function typo(html, lang) {
  html = html.replace(/&#39;/g, "'")
  const keep = []
  html = html.replace(/<(pre|code)[\s\S]*?<\/\1>/g, (m) => { keep.push(m); return `\u0000${keep.length - 1}\u0000` })
  html = lang === 'fr' ? frenchTypo(html) : englishTypo(html)
  return html.replace(/\u0000(\d+)\u0000/g, (_, i) => keep[Number(i)])
}

const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const words = (md) => md.replace(/```[\s\S]*?```/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/[#>*_`|[\]()-]/g, ' ').split(/\s+/).filter((w) => /[A-Za-zÀ-ÿ0-9]/.test(w)).length

const MOLAMARK = fs.existsSync(path.join(ASSETS, 'molamark.svg')) ? read(path.join(ASSETS, 'molamark.svg')).replace('<svg ', '<svg class="mm" ') : ''
const LOGO_LIGHT = fs.existsSync(path.join(ASSETS, 'logo-light.svg')) ? read(path.join(ASSETS, 'logo-light.svg')).replace(/class="inline-flex items-center"/, 'class="logo"') : 'Ndamba'
const MARK_COLOR = fs.existsSync(path.join(ASSETS, 'mark-color.svg')) ? read(path.join(ASSETS, 'mark-color.svg')) : ''

/* ------------------------------------------------------------------ sources */

function loadEdition(lang) {
  const dir = path.join(SRC, lang)
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort() : []
  const chapters = [], appendices = [], front = {}
  for (const f of files) {
    const raw = read(path.join(dir, f))
    const { meta, body } = frontMatter(raw)
    const item = { file: f, meta, body, words: words(body) }
    if (/^\d\d-/.test(f) && !f.startsWith('00-')) chapters.push({ ...item, no: Number(meta.numero || f.slice(0, 2)), part: Number(meta.partie || 0), slug: meta.slug || f.slice(3, -3), title: meta.titre || f, summary: meta.resume || '' })
    else if (f.startsWith('00-')) front[f.slice(3, -3)] = item
    else if (f.startsWith('annexe-')) appendices.push({ ...item, key: (meta.numero || f.slice(7, 8)).toUpperCase(), title: meta.titre || f, summary: meta.resume || '' })
  }
  chapters.sort((a, b) => a.no - b.no)
  return { chapters, appendices, front }
}

function drills() {
  const dir = path.join(ROOT, 'coach', 'drills')
  const FAM_ORDER = ['technique', 'rondo', 'position', 'ssg', 'lsg', 'phase', 'transition', 'finishing']
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(read(path.join(dir, f))))
    .sort((a, b) => FAM_ORDER.indexOf(a.family) - FAM_ORDER.indexOf(b.family) || a.order - b.order)
}

/* ------------------------------------------------------------------ images */

const imgCache = new Map()
async function prepShot(lang, name) {
  const key = lang + '/' + name
  if (imgCache.has(key)) return imgCache.get(key)
  let src = path.join(SHOTS, lang, name + '.png')
  if (!fs.existsSync(src)) src = path.join(SHOTS, 'fr', name + '.png')
  if (!fs.existsSync(src)) { imgCache.set(key, null); return null }
  const sharp = requireG('sharp')
  const dirW = path.join(OUT, 'img', lang), dirP = path.join(BUILD, 'guide-print', lang)
  fs.mkdirSync(dirW, { recursive: true }); fs.mkdirSync(dirP, { recursive: true })
  const st = fs.statSync(src)
  const fresh = (p) => fs.existsSync(p) && fs.statSync(p).mtimeMs >= st.mtimeMs
  const meta = await sharp(src).metadata()
  const tall = meta.height / meta.width > 1.25
  const jobs = [
    [path.join(dirW, name + '.webp'), (s) => s.resize({ width: 1440, withoutEnlargement: true }).webp({ quality: 78 })],
    [path.join(dirW, name + '.jpg'), (s) => s.resize({ width: 1440, withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true })],
    [path.join(dirW, name + '-720.webp'), (s) => s.resize({ width: 720 }).webp({ quality: 76 })],
    [path.join(dirW, name + '-720.jpg'), (s) => s.resize({ width: 720 }).jpeg({ quality: 78, mozjpeg: true })],
    [path.join(dirP, name + '.jpg'), (s) => s.resize({ width: 1600 }).jpeg({ quality: 86 })],
  ]
  for (const [out, fn] of jobs) if (!fresh(out)) await fn(sharp(src)).toFile(out)
  const w = 1440, h = Math.round((meta.height / meta.width) * 1440)
  const r = { name, w, h, tall, print: path.join(dirP, name + '.jpg') }
  imgCache.set(key, r)
  return r
}

/* ------------------------------------------------------------------ markdown */

async function render(md, lang, { print = false } = {}) {
  const t = L[lang]
  const svgs = []
  md = md.replace(/```schema\n([\s\S]*?)```/g, (_, json) => { try { svgs.push(renderDiagram(JSON.parse(json), { width: 640 })) } catch (e) { svgs.push(`<!-- schema: ${esc(e.message)} -->`) } return `\n\nSCHEMAPH${svgs.length - 1}X\n\n` })
  const lines = md.split('\n'), out = []
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^>\s*\[!(\w+)\]\s*(.*)$/)
    if (m && t.callouts[m[1]]) {
      const inner = []
      i++
      while (i < lines.length && /^>/.test(lines[i])) { inner.push(lines[i].replace(/^>\s?/, '')); i++ }
      i--
      const kind = { TIP: 'astuce', ASTUCE: 'astuce', WARNING: 'attention', ATTENTION: 'attention', INVESTOR: 'investisseur', INVESTISSEUR: 'investisseur', MOLA: 'mola' }[m[1]]
      out.push(`<aside class="callout callout-${kind}"><div class="callout-kicker">${kind === 'mola' ? MOLAMARK : ''}${esc(t.callouts[m[1]])}</div>${m[2] ? `<div class="callout-title">${esc(m[2])}</div>` : ''}${marked.parse(inner.join('\n'))}</aside>`)
    } else out.push(lines[i])
  }
  let html = marked.parse(out.join('\n'))
  html = html.replace(/<p>SCHEMAPH(\d+)X<\/p>|SCHEMAPH(\d+)X/g, (_, a, b) => `<figure class="diagram">${svgs[Number(a ?? b)]}</figure>`)
  // headings get ids
  html = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_, n, inner) => `<h${n} id="${slugify(inner.replace(/<[^>]+>/g, ''))}">${inner}</h${n}>`)
  // screenshots
  const shots = [...html.matchAll(/<img src="shot:([\w-]+)" alt="([^"]*)"(?: title="([^"]*)")?>/g)]
  for (const m of shots) {
    const im = await prepShot(lang, m[1])
    let fig
    if (!im) fig = `<figure class="shot missing"><figcaption>[${esc(m[1])}]</figcaption></figure>`
    else if (print) fig = `<figure class="shot${im.tall ? ' tall' : ''}"><img src="file://${im.print}" alt="${m[2]}"><figcaption>${m[3] || ''}</figcaption></figure>`
    else fig = `<figure class="shot${im.tall ? ' tall' : ''}"><a href="../img/${lang}/${im.name}.jpg" class="shot-link" aria-label="${esc(t.seeFull)}"><picture><source type="image/webp" srcset="../img/${lang}/${im.name}-720.webp 720w, ../img/${lang}/${im.name}.webp 1440w" sizes="(max-width: 980px) 100vw, 920px"><img src="../img/${lang}/${im.name}.jpg" srcset="../img/${lang}/${im.name}-720.jpg 720w, ../img/${lang}/${im.name}.jpg 1440w" sizes="(max-width: 980px) 100vw, 920px" width="${im.w}" height="${im.h}" alt="${m[2]}" loading="lazy" decoding="async"></picture></a>${m[3] ? `<figcaption>${m[3]}</figcaption>` : ''}</figure>`
    html = html.replace(m[0], fig)
  }
  html = html.replace(/<p>(<figure[\s\S]*?<\/figure>)<\/p>/g, '$1')
  html = html.replace(/<table>/g, '<div class="table"><table>').replace(/<\/table>/g, '</table></div>')
  return typo(html, lang)
}

/* ------------------------------------------------------------------ shared page parts */

const FONTS = ['archivo-latin-wdth-normal.woff2', 'archivo-latin-wdth-italic.woff2', 'archivo-latin-ext-wdth-normal.woff2', 'archivo-latin-ext-wdth-italic.woff2']
function copyFonts() {
  const src = path.join(ROOT, 'app', 'node_modules', '@fontsource-variable', 'archivo', 'files')
  fs.mkdirSync(path.join(OUT, 'fonts'), { recursive: true })
  for (const f of FONTS) fs.copyFileSync(path.join(src, f), path.join(OUT, 'fonts', f))
}
const fontFaces = (base) => `
@font-face{font-family:'Archivo';font-style:normal;font-display:swap;font-weight:100 900;font-stretch:62% 125%;src:url(${base}archivo-latin-wdth-normal.woff2) format('woff2-variations');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'Archivo';font-style:italic;font-display:swap;font-weight:100 900;font-stretch:62% 125%;src:url(${base}archivo-latin-wdth-italic.woff2) format('woff2-variations');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'Archivo';font-style:normal;font-display:swap;font-weight:100 900;font-stretch:62% 125%;src:url(${base}archivo-latin-ext-wdth-normal.woff2) format('woff2-variations');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:'Archivo';font-style:italic;font-display:swap;font-weight:100 900;font-stretch:62% 125%;src:url(${base}archivo-latin-ext-wdth-italic.woff2) format('woff2-variations');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}`

function head(lang, title, desc) {
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><meta property="og:image" content="https://ndamba-two.vercel.app/icons/og.png"><meta name="theme-color" content="#063A25"><link rel="icon" href="/favicon.svg"><style>${fontFaces('../fonts/')}${WEB_CSS}</style></head>`
}

function bar(lang, page) {
  const t = L[lang]
  return `<header class="bar"><a class="back" href="/" aria-label="${esc(t.back)}">${MARK_COLOR.replace(/width="96" height="96"/, 'width="28" height="28"')}<span>${esc(t.title)}</span></a><nav class="bar-actions"><a class="lang" href="../${t.other}/${page}" hreflang="${t.other}" lang="${t.other}">${t.other.toUpperCase()}</a><button id="aa" type="button" aria-label="${esc(t.textSize)}">Aa</button><button id="toc-btn" type="button">${esc(t.chapters)}</button></nav></header><div class="progress" aria-hidden="true"><span id="prog"></span></div>`
}

function tocHTML(lang, ed, { current = '' } = {}) {
  const t = L[lang]
  let html = ''
  for (let p = 1; p < t.parts.length; p++) {
    const chs = ed.chapters.filter((c) => c.part === p)
    if (!chs.length) continue
    html += `<li class="toc-part"><span>${t.part} ${ROMAN[p]}. ${esc(t.parts[p][0])}</span><ol>${chs.map((c) => `<li><a href="ch-${pad2(c.no)}.html" data-page="ch-${pad2(c.no)}"${current === `ch-${pad2(c.no)}` ? ' aria-current="page"' : ''}><b>${c.no}</b>${esc(c.title)}</a></li>`).join('')}</ol></li>`
  }
  html += `<li class="toc-part"><span>${esc(t.appendices)}</span><ol>${ed.appendixPages.map((a) => `<li><a href="${a.page}.html" data-page="${a.page}"${current === a.page ? ' aria-current="page"' : ''}><b>${a.key}</b>${esc(a.title)}</a></li>`).join('')}</ol></li>`
  return html
}

function drawer(lang, ed, current) {
  const t = L[lang]
  return `<div class="drawer" id="drawer" hidden><div class="drawer-inner" role="dialog" aria-label="${esc(t.toc)}"><div class="drawer-head"><a href="./">${esc(t.home)}</a><button id="close" type="button">${esc(t.close)}</button></div><ol class="toc-list">${tocHTML(lang, ed, { current })}</ol></div></div>`
}

function pager(lang, prev, next) {
  const t = L[lang]
  return `<nav class="pager" aria-label="${esc(t.prev)} / ${esc(t.next)}">${prev ? `<a class="prev" href="${prev.href}" rel="prev"><small>${esc(t.prev)}</small><b>${esc(prev.label)}</b></a>` : '<span></span>'}${next ? `<a class="next" href="${next.href}" rel="next"><small>${esc(t.next)}</small><b>${esc(next.label)}</b></a>` : '<span></span>'}</nav>`
}

const JS = (key) => `<script>(function(){var K='${key}';var b=document.body;var page=b.getAttribute('data-page');
try{var fs=localStorage.getItem('guide.fs');if(fs)b.style.setProperty('--fs',fs)}catch(e){}
var sizes=['17px','19px','21px'];document.getElementById('aa').onclick=function(){var c=getComputedStyle(b).getPropertyValue('--fs').trim()||sizes[0];var n=sizes[(sizes.indexOf(c)+1)%sizes.length];b.style.setProperty('--fs',n);try{localStorage.setItem('guide.fs',n)}catch(e){}};
var d=document.getElementById('drawer');document.getElementById('toc-btn').onclick=function(){d.hidden=false;var cur=d.querySelector('[aria-current=page]');if(cur)cur.scrollIntoView({block:'center'})};document.getElementById('close').onclick=function(){d.hidden=true};d.onclick=function(e){if(e.target===d)d.hidden=true};
document.addEventListener('keydown',function(e){if(e.key==='Escape')d.hidden=true;if(e.altKey||e.ctrlKey||e.metaKey)return;var a=null;if(e.key==='ArrowRight')a=document.querySelector('a[rel=next]');if(e.key==='ArrowLeft')a=document.querySelector('a[rel=prev]');if(a&&d.hidden)location.href=a.getAttribute('href')});
var prog=document.getElementById('prog');var t=0;
function save(){if(page==='index')return;try{localStorage.setItem(K+'.last',JSON.stringify({p:page,y:Math.round(window.scrollY),t:(document.querySelector('.ch-title')||{}).textContent||''}))}catch(e){}}
window.addEventListener('scroll',function(){if(t)return;t=setTimeout(function(){t=0;var de=document.documentElement;var max=de.scrollHeight-de.clientHeight;prog.style.width=(max>0?100*de.scrollTop/max:0)+'%';save()},200)},{passive:true});
if(page!=='index'){var l=null;try{l=JSON.parse(localStorage.getItem(K+'.last'))}catch(e){}if(location.hash==='#reprendre'&&l&&l.p===page){var go=function(){window.scrollTo(0,l.y)};if(document.readyState==='complete')go();else window.addEventListener('load',go)}else save()}
else{try{var l2=JSON.parse(localStorage.getItem(K+'.last'));var r=document.getElementById('resume');if(l2&&r&&l2.p){r.hidden=false;r.setAttribute('href',l2.p+'.html#reprendre');r.querySelector('b').textContent=l2.t}}catch(e){}}
try{localStorage.setItem('njangi.lang','${key.slice(-2)}')}catch(e){}
})();</script>`

/* ------------------------------------------------------------------ build one edition (web) */

async function buildWeb(lang) {
  const t = L[lang]
  const ed = loadEdition(lang)
  // appendices: written ones plus the generated drill table (D)
  const D = drills()
  const drillTable = `<p>${esc(t.drills.lead)}</p><div class="table"><table class="drills"><thead><tr><th>${t.drills.code}</th><th>${t.drills.name}</th><th>${t.drills.fam}</th><th>${t.drills.int}</th><th>${t.drills.md}</th><th class="num">${t.drills.min}</th></tr></thead><tbody>${D.map((d) => `<tr><td><b>${d.id}</b></td><td>${esc(d[lang].title)}</td><td>${esc(t.FAMILY[d.family])}</td><td>${esc((d.intentions || []).map((i) => t.INTENT[i] || i).join(', '))}</td><td>${esc((d.md || []).map((m) => (m === 'youth' ? t.youth : m)).join(', '))}</td><td class="num">${d.minutes ?? ''}</td></tr>`).join('')}</tbody></table></div>`
  const apps = [...ed.appendices.map((a) => ({ key: a.key, title: a.title, summary: a.summary, md: a.body, words: a.words })), { key: 'D', title: t.drills.title, summary: t.drills.resume, html: drillTable, words: D.length * 8 }]
  apps.sort((a, b) => a.key.localeCompare(b.key))
  ed.appendixPages = apps.map((a) => ({ ...a, page: `annexe-${a.key.toLowerCase()}` }))
  const seq = [...ed.chapters.map((c) => ({ page: `ch-${pad2(c.no)}`, label: `${c.no}. ${c.title}` })), ...ed.appendixPages.map((a) => ({ page: a.page, label: `${t.appendix} ${a.key}. ${a.title}` }))]
  const hrefOf = (i) => (seq[i] ? { href: seq[i].page + '.html', label: seq[i].label } : null)
  const dir = path.join(OUT, lang)
  fs.mkdirSync(dir, { recursive: true })
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.html')) fs.unlinkSync(path.join(dir, f))

  // chapters
  for (let i = 0; i < ed.chapters.length; i++) {
    const c = ed.chapters[i]
    const firstOfPart = !ed.chapters.some((o) => o.part === c.part && o.no < c.no)
    const body = await render(c.body, lang)
    const minutes = Math.max(3, Math.round(c.words / 210))
    const part = c.part ? `<a class="part-link" href="./#partie-${c.part}">${t.part} ${ROMAN[c.part]}. ${esc(t.parts[c.part][0])}</a>` : ''
    const opener = firstOfPart && c.part ? `<section class="part-opener" id="partie-${c.part}"><div class="part-num">${t.part} ${ROMAN[c.part]}</div><h2>${typo(esc(t.parts[c.part][0]), lang)}</h2><p>${typo(esc(t.parts[c.part][1]), lang)}</p></section>` : ''
    const html = `${head(lang, `${c.no}. ${c.title}, ${t.title}`, c.summary)}<body data-page="ch-${pad2(c.no)}">${bar(lang, `ch-${pad2(c.no)}.html`)}${drawer(lang, ed, `ch-${pad2(c.no)}`)}<main>${opener}<article class="chapter"><header class="ch-head">${part}<div class="ch-num">${t.chapter} ${c.no}</div><h1 class="ch-title">${typo(esc(c.title), lang)}</h1>${c.summary ? `<p class="ch-sum">${typo(esc(c.summary), lang)}</p>` : ''}<p class="ch-time">${t.readTime(minutes)}</p></header><div class="prose">${body}</div></article>${pager(lang, hrefOf(i - 1), hrefOf(i + 1))}</main>${JS('guide.' + lang)}</body></html>`
    write(path.join(dir, `ch-${pad2(c.no)}.html`), html)
  }
  // appendices
  for (let j = 0; j < ed.appendixPages.length; j++) {
    const a = ed.appendixPages[j]
    const i = ed.chapters.length + j
    const body = a.html ? typo(a.html, lang) : await render(a.md, lang)
    const html = `${head(lang, `${t.appendix} ${a.key}. ${a.title}, ${t.title}`, a.summary)}<body data-page="${a.page}">${bar(lang, `${a.page}.html`)}${drawer(lang, ed, a.page)}<main><article class="chapter appendix"><header class="ch-head"><div class="ch-num">${t.appendix} ${a.key}</div><h1 class="ch-title">${typo(esc(a.title), lang)}</h1>${a.summary ? `<p class="ch-sum">${typo(esc(a.summary), lang)}</p>` : ''}</header><div class="prose">${body}</div></article>${pager(lang, hrefOf(i - 1), hrefOf(i + 1))}</main>${JS('guide.' + lang)}</body></html>`
    write(path.join(dir, `${a.page}.html`), html)
  }
  // index: cover, dedication, how to read, contents
  const ded = ed.front.dedicace ? await render(ed.front.dedicace.body, lang) : ''
  const howto = ed.front.lire ? await render(ed.front.lire.body, lang) : ''
  const totalWords = ed.chapters.reduce((s, c) => s + c.words, 0) + apps.reduce((s, a) => s + (a.words || 0), 0) + (ed.front.lire?.words || 0)
  const partsIdx = []
  for (let p = 1; p < t.parts.length; p++) {
    const chs = ed.chapters.filter((c) => c.part === p)
    if (!chs.length) continue
    partsIdx.push(`<section class="toc-block" id="partie-${p}"><div class="toc-part-head"><span class="part-num">${t.part} ${ROMAN[p]}</span><h3>${typo(esc(t.parts[p][0]), lang)}</h3><p>${typo(esc(t.parts[p][1]), lang)}</p></div><ol>${chs.map((c) => `<li><a href="ch-${pad2(c.no)}.html"><b>${c.no}</b><span><strong>${typo(esc(c.title), lang)}</strong>${c.summary ? `<small>${typo(esc(c.summary), lang)}</small>` : ''}</span></a></li>`).join('')}</ol></section>`)
  }
  partsIdx.push(`<section class="toc-block"><div class="toc-part-head"><span class="part-num">${esc(t.appendices)}</span></div><ol>${ed.appendixPages.map((a) => `<li><a href="${a.page}.html"><b>${a.key}</b><span><strong>${typo(esc(a.title), lang)}</strong>${a.summary ? `<small>${typo(esc(a.summary), lang)}</small>` : ''}</span></a></li>`).join('')}</ol></section>`)
  const first = ed.chapters[0] ? `ch-${pad2(ed.chapters[0].no)}.html` : '#'
  const index = `${head(lang, `${t.title}, ${t.subtitle}`, t.desc)}<body data-page="index" class="index">${bar(lang, 'index.html')}${drawer(lang, ed, 'index')}
<section class="cover"><div class="cover-inner">${LOGO_LIGHT}<h1>${typo(esc(t.title), lang)}</h1><p class="cover-sub">${typo(esc(t.subtitle), lang)}</p><p class="cover-author">${esc(t.author)}</p><p class="cover-ed">${esc(t.edition)}</p><div class="cover-actions"><a class="btn-gold" href="${first}">${esc(t.begin)}</a><a class="btn-ghost-light" id="resume" hidden href="#"><small>${esc(t.resume)}</small><b></b></a></div></div></section>
<main>${ded ? `<section class="dedication">${ded}</section>` : ''}${howto ? `<section class="howto prose">${howto}</section>` : ''}<section class="toc" id="sommaire"><h2>${esc(t.toc)}</h2>${partsIdx.join('')}</section></main>${JS('guide.' + lang)}</body></html>`
  write(path.join(dir, 'index.html'), index)
  return { ed, apps, totalWords }
}

/* ------------------------------------------------------------------ print (to count pages) */

async function buildPrint(lang, ed, apps) {
  const t = L[lang]
  const pages = []
  pages.push(`<section class="p-cover">${LOGO_LIGHT}<h1>${typo(esc(t.title), lang)}</h1><p class="cover-sub">${typo(esc(t.subtitle), lang)}</p><p class="cover-author">${esc(t.author)}</p></section>`)
  if (ed.front.dedicace) pages.push(`<section class="p-dedication">${await render(ed.front.dedicace.body, lang, { print: true })}</section>`)
  if (ed.front.lire) pages.push(`<section class="p-chapter">${await render(ed.front.lire.body, lang, { print: true })}</section>`)
  pages.push(`<section class="p-toc"><h2>${esc(t.toc)}</h2><ol>${tocHTML(lang, ed)}</ol></section>`)
  for (const c of ed.chapters) {
    const firstOfPart = !ed.chapters.some((o) => o.part === c.part && o.no < c.no)
    if (firstOfPart && c.part) pages.push(`<section class="p-part"><div class="part-num">${t.part} ${ROMAN[c.part]}</div><h2>${typo(esc(t.parts[c.part][0]), lang)}</h2><p>${typo(esc(t.parts[c.part][1]), lang)}</p></section>`)
    pages.push(`<section class="p-chapter"><header class="ch-head"><div class="ch-num">${t.chapter} ${c.no}</div><h1 class="ch-title">${typo(esc(c.title), lang)}</h1>${c.summary ? `<p class="ch-sum">${typo(esc(c.summary), lang)}</p>` : ''}</header>${await render(c.body, lang, { print: true })}</section>`)
  }
  for (const a of ed.appendixPages) pages.push(`<section class="p-chapter"><header class="ch-head"><div class="ch-num">${t.appendix} ${a.key}</div><h1 class="ch-title">${typo(esc(a.title), lang)}</h1></header>${a.html ? typo(a.html, lang) : await render(a.md, lang, { print: true })}</section>`)
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${esc(t.title)}</title><style>${fontFaces('file://' + path.join(OUT, 'fonts') + '/')}${PRINT_CSS}</style></head><body>${pages.join('\n')}</body></html>`
  const file = path.join(BUILD, `guide-${lang}.html`)
  write(file, html)
  return file
}

async function printPdf(htmlFile, pdfFile) {
  const { chromium } = requireG('playwright')
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto('file://' + htmlFile, { waitUntil: 'load', timeout: 300000 })
  await page.evaluate(() => document.fonts.ready)
  fs.mkdirSync(path.dirname(pdfFile), { recursive: true })
  await page.pdf({ path: pdfFile, printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate: '<div></div>', footerTemplate: '<div style="width:100%;text-align:center;font-family:Helvetica,Arial,sans-serif;font-size:8px;color:#5D6C63;"><span class="pageNumber"></span></div>' })
  await browser.close()
  const { PDFDocument } = requireG('pdf-lib')
  return (await PDFDocument.load(fs.readFileSync(pdfFile))).getPageCount()
}

/* ------------------------------------------------------------------ checks */

function check() {
  let problems = 0
  for (const lang of ['fr', 'en']) {
    const ed = loadEdition(lang)
    for (const c of [...ed.chapters, ...ed.appendices, ...Object.values(ed.front)]) {
      const raw = read(path.join(SRC, lang, c.file))
      const dash = raw.split('\n').map((l, i) => (/[–—]/.test(l) ? i + 1 : 0)).filter(Boolean)
      if (dash.length) { problems++; console.log(`  ✗ ${lang}/${c.file}: em or en dash on lines ${dash.join(', ')}`) }
      for (const m of raw.matchAll(/\(shot:([\w-]+)/g)) if (!fs.existsSync(path.join(SHOTS, lang, m[1] + '.png')) && !fs.existsSync(path.join(SHOTS, 'fr', m[1] + '.png'))) { problems++; console.log(`  ✗ ${lang}/${c.file}: missing screenshot ${m[1]}`) }
    }
    const tot = ed.chapters.reduce((s, c) => s + c.words, 0)
    console.log(`${lang}: ${ed.chapters.length} chapters, ${ed.appendices.length} written appendices, ${tot} words in chapters`)
    for (const c of ed.chapters) console.log(`   ${pad2(c.no)} ${String(c.words).padStart(5)}  ${c.title}`)
  }
  const fr = loadEdition('fr').chapters.map((c) => c.no).join(','), en = loadEdition('en').chapters.map((c) => c.no).join(',')
  if (fr !== en) { problems++; console.log(`  ✗ chapter numbers differ: fr ${fr} / en ${en}`) }
  console.log(`${problems} problem(s)`)
  return problems
}

/* ------------------------------------------------------------------ CSS */

const WEB_CSS = `
:root{--chalk:#F6F7F2;--paper:#FFFFFF;--mist:#ECEFE8;--line:#DCE2D8;--ink:#12211A;--soft:#34443B;--muted:#5D6C63;--faint:#94A198;--pitch:#0B5D3B;--pitch5:#13804F;--pitch7:#084B30;--deep:#063A25;--night:#0A2117;--pitch50:#E8F3ED;--gold:#F5B700;--gold50:#FFF8DD;--kola:#D7263D;--fs:17px}
*{box-sizing:border-box}[hidden]{display:none!important}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}html{-webkit-text-size-adjust:100%;scroll-padding-top:72px}body{margin:0;background:var(--chalk);color:var(--ink);font-family:Archivo,system-ui,sans-serif;font-stretch:100%;font-size:var(--fs);line-height:1.62}
a{color:var(--pitch)}img{max-width:100%;display:block}picture{display:contents}
:focus-visible{outline:2px solid var(--pitch5);outline-offset:2px;border-radius:6px}
.bar{position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:12px;padding:10px 16px;background:rgba(246,247,242,.94);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.bar .back{display:flex;align-items:center;gap:10px;min-width:0;flex:1;text-decoration:none;color:var(--ink);font-weight:750;font-stretch:112%;font-size:16px}.bar .back svg{flex:none}.bar .back span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bar-actions{display:flex;gap:8px;align-items:center}.bar-actions a,.bar-actions button{font:600 14px Archivo,sans-serif;min-height:40px;padding:8px 14px;border-radius:12px;border:1px solid var(--line);background:var(--paper);color:var(--ink);cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}
.bar-actions button#toc-btn{background:var(--pitch);border-color:var(--pitch);color:#fff}
.progress{position:sticky;top:61px;z-index:29;height:3px}.progress span{display:block;height:3px;width:0;background:var(--gold)}
main{max-width:760px;margin:0 auto;padding:0 18px 90px}
.ch-head{padding:46px 0 18px;border-bottom:1px solid var(--line);margin-bottom:26px}
.part-link{font-weight:600;font-size:14px;text-decoration:none;color:var(--muted)}
.ch-num{margin-top:14px;font-weight:650;font-size:14px;color:var(--pitch)}
.ch-title{font-stretch:116%;font-weight:780;letter-spacing:-.015em;font-size:clamp(32px,5.4vw,46px);line-height:1.06;margin:6px 0 12px;text-wrap:balance}
.ch-sum{font-size:1.08em;color:var(--soft);margin:0 0 10px;max-width:62ch}.ch-time{margin:0;font-size:14px;color:var(--muted)}
.prose h2{font-stretch:114%;font-weight:760;letter-spacing:-.01em;font-size:1.55em;line-height:1.18;margin:1.9em 0 .5em;text-wrap:balance}
.prose h3{font-stretch:108%;font-weight:720;font-size:1.18em;line-height:1.25;margin:1.6em 0 .4em}
.prose p{margin:0 0 1em}.prose ul,.prose ol{padding-left:1.35em;margin:0 0 1.1em}.prose li{margin:.25em 0}.prose li::marker{color:var(--pitch);font-weight:700}
.prose strong{font-weight:680}.prose code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.86em;background:var(--mist);padding:.1em .35em;border-radius:6px}
.prose pre{background:var(--night);color:var(--chalk);padding:14px 16px;border-radius:12px;overflow-x:auto;font-size:14px;line-height:1.5}.prose pre code{background:none;padding:0;color:inherit}
.prose blockquote{margin:1.2em 0;padding:.2em 0 .2em 1em;border-left:3px solid var(--gold);color:var(--soft);font-style:italic}
.prose hr{border:0;border-top:1px solid var(--line);margin:2.2em 0}
.table{overflow-x:auto;margin:1.2em 0 1.6em;border:1px solid var(--line);border-radius:14px;background:var(--paper)}
.prose table{width:100%;border-collapse:collapse;font-size:.88em;line-height:1.45}.prose th{text-align:left;font-weight:650;color:var(--muted);font-size:.92em;padding:10px 12px;border-bottom:1px solid var(--line);background:var(--mist)}.prose td{padding:9px 12px;border-bottom:1px solid var(--line);vertical-align:top}.prose tr:last-child td{border-bottom:0}.prose td.num,.prose th.num{text-align:right;font-variant-numeric:tabular-nums}
figure.shot{margin:28px 0 30px}figure.shot a{display:block;border-radius:14px;overflow:hidden;border:1px solid var(--line);background:var(--paper);box-shadow:0 1px 0 rgba(18,33,26,.04),0 12px 32px -18px rgba(6,58,37,.35)}
figure.shot img{width:100%;height:auto}figure.shot.tall a{max-height:min(1100px,150vw);position:relative}figure.shot.tall a::after{content:'';position:absolute;left:0;right:0;bottom:0;height:70px;background:linear-gradient(rgba(255,255,255,0),#fff)}
figure.shot figcaption{margin-top:10px;font-size:14px;line-height:1.45;color:var(--muted)}
@media(min-width:980px){figure.shot{margin-left:-80px;margin-right:-80px}figure.shot figcaption{margin-left:80px;margin-right:80px}}
figure.diagram{margin:22px 0}figure.diagram svg{width:100%;height:auto;border-radius:12px}
.callout{margin:26px 0;padding:16px 18px 6px;border-radius:14px;border:1px solid var(--line);background:var(--paper)}
.callout-kicker{display:flex;align-items:center;gap:8px;font-weight:700;font-size:14px;color:var(--pitch);margin-bottom:4px}.callout-kicker .mm{width:18px;height:18px}
.callout-title{font-weight:700;font-stretch:108%;font-size:1.05em;margin-bottom:4px}.callout p{margin:0 0 .7em}
.callout-astuce{background:var(--pitch50);border-color:#CFE5D8}
.callout-attention{background:var(--gold50);border-color:#F3E2A3}.callout-attention .callout-kicker{color:#7A5A00}
.callout-investisseur{background:var(--deep);border-color:var(--deep);color:#E9EEE9}.callout-investisseur .callout-kicker{color:var(--gold)}.callout-investisseur a{color:var(--gold)}.callout-investisseur strong{color:#fff}
.callout-mola{background:var(--paper);border-left:4px solid var(--pitch)}
.part-opener{margin:30px -18px 0;padding:44px 24px 40px;background:var(--deep);color:var(--chalk);position:relative;overflow:hidden}
.part-opener::after{content:'';position:absolute;right:-60px;top:-60px;width:260px;height:260px;border-radius:50%;border:2px solid rgba(246,247,242,.12)}
.part-num{font-weight:650;font-size:14px;color:var(--gold)}.part-opener h2{font-stretch:118%;font-weight:800;font-size:clamp(30px,5vw,42px);line-height:1.05;margin:6px 0 10px}.part-opener p{margin:0;max-width:56ch;color:#C9D6CD}
@media(min-width:800px){.part-opener{margin:34px -40px 0;border-radius:22px;padding:50px 40px 44px}}
.pager{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:56px 0 8px}
.pager a{display:flex;flex-direction:column;gap:4px;padding:14px 16px;border-radius:14px;background:var(--paper);border:1px solid var(--line);text-decoration:none;color:var(--ink);min-height:86px}
.pager a:hover{border-color:var(--pitch)}.pager .next{text-align:right;background:var(--pitch);border-color:var(--pitch);color:#fff}
.pager small{font-weight:600;font-size:13px;opacity:.8}.pager b{font-weight:700;font-stretch:106%;font-size:16px;line-height:1.25}
.drawer{position:fixed;inset:0;z-index:60;background:rgba(10,33,23,.55)}.drawer-inner{position:absolute;right:0;top:0;bottom:0;width:min(440px,94vw);background:var(--paper);overflow-y:auto;padding:16px 18px 30px}
.drawer-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:6px}.drawer-head a{font-weight:700;text-decoration:none}.drawer-head button{font:600 14px Archivo,sans-serif;min-height:40px;padding:8px 14px;border:1px solid var(--line);border-radius:12px;background:var(--paper);cursor:pointer}
.toc-list,.toc-list ol{list-style:none;margin:0;padding:0}.toc-part>span{display:block;margin:18px 0 6px;font-weight:700;font-size:13px;color:var(--pitch)}
.toc-list a{display:flex;gap:10px;padding:8px 6px;border-bottom:1px solid var(--line);text-decoration:none;color:var(--ink);font-size:15px;line-height:1.35}.toc-list a b{min-width:24px;color:var(--muted);font-variant-numeric:tabular-nums}.toc-list a[aria-current=page]{background:var(--mist);border-radius:8px}
.cover{background:var(--deep);color:var(--chalk);position:relative;overflow:hidden}.cover::before{content:'';position:absolute;left:50%;top:50%;width:520px;height:520px;margin:-260px 0 0 -260px;border-radius:50%;border:2px solid rgba(246,247,242,.10)}.cover::after{content:'';position:absolute;left:50%;top:0;bottom:0;border-left:2px solid rgba(246,247,242,.08)}
.cover-inner{position:relative;z-index:1;max-width:760px;margin:0 auto;padding:64px 22px 60px}.cover .logo{display:inline-flex;align-items:center;gap:12px;max-width:100%}.cover .logo svg{height:40px;width:auto;max-width:100%}@media(max-width:560px){.cover .logo svg{height:32px}}
.cover h1{font-stretch:120%;font-weight:820;letter-spacing:-.02em;font-size:clamp(40px,8vw,72px);line-height:1;margin:34px 0 16px;text-wrap:balance}.cover-sub{font-size:clamp(19px,2.6vw,24px);line-height:1.35;color:#D7E2DA;max-width:30ch;margin:0 0 26px}
.cover-author{font-weight:700;margin:0;color:var(--gold)}.cover-ed{margin:2px 0 0;color:#A9BBAF;font-size:15px}
.cover-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:30px}.btn-gold{display:inline-flex;align-items:center;min-height:48px;padding:12px 22px;border-radius:12px;background:var(--gold);color:var(--ink);font-weight:700;text-decoration:none}.btn-ghost-light{display:inline-flex;flex-direction:column;justify-content:center;min-height:48px;padding:8px 18px;border-radius:12px;border:1px solid rgba(246,247,242,.35);color:var(--chalk);text-decoration:none}.btn-ghost-light small{font-size:12px;opacity:.8}.btn-ghost-light b{font-weight:650;font-size:15px}
.dedication{margin:54px auto 10px;max-width:560px;text-align:center;font-size:1.05em}.dedication p{margin:0 0 1em}.dedication em{color:var(--soft)}.dedication h2{font-stretch:114%;font-weight:760;font-size:1.3em;margin:0 0 .8em}
.howto{margin-top:40px;padding-top:30px;border-top:1px solid var(--line)}
.toc{margin-top:46px}.toc h2{font-stretch:116%;font-weight:780;font-size:clamp(28px,4.6vw,38px);margin:0 0 8px}
.toc-block{margin-top:26px}.toc-part-head .part-num{color:var(--pitch)}.toc-part-head h3{font-stretch:112%;font-weight:760;font-size:1.3em;margin:2px 0 2px}.toc-part-head p{margin:0 0 8px;color:var(--muted);font-size:15px}
.toc-block ol{list-style:none;margin:0;padding:0;border:1px solid var(--line);border-radius:14px;background:var(--paper);overflow:hidden}
.toc-block li a{display:flex;gap:14px;padding:13px 16px;border-bottom:1px solid var(--line);text-decoration:none;color:var(--ink)}.toc-block li:last-child a{border-bottom:0}.toc-block li a:hover{background:var(--mist)}
.toc-block li a b{min-width:26px;font-weight:700;color:var(--pitch);font-variant-numeric:tabular-nums}.toc-block li a span{display:flex;flex-direction:column}.toc-block li a strong{font-weight:650}.toc-block li a small{color:var(--muted);font-size:14px;line-height:1.4;margin-top:2px}
@media(max-width:560px){.bar{padding:8px 12px}.bar .back span{display:none}.bar-actions a,.bar-actions button{padding:8px 11px}.progress{top:57px}}
@media(prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}
@media print{.bar,.progress,.pager,.drawer{display:none}}
`

const PRINT_CSS = `
@page{size:210mm 297mm;margin:20mm 20mm 22mm 21mm}
@page cover{margin:0}@page part{margin:0}
*{box-sizing:border-box}.sr-only{display:none}html,body{margin:0;padding:0}
body{font-family:Archivo,sans-serif;font-stretch:100%;font-size:10pt;line-height:1.5;color:#12211A;-webkit-print-color-adjust:exact;print-color-adjust:exact}
img{display:block;max-width:100%}
section{break-before:page}section:first-child{break-before:auto}
.p-cover{page:cover;height:297mm;background:#063A25;color:#F6F7F2;padding:30mm 18mm}.p-cover .logo{display:inline-flex;align-items:center;gap:10pt}.p-cover .logo svg{height:30pt;width:auto}
.p-cover h1{font-stretch:120%;font-weight:820;font-size:38pt;line-height:1;margin:40mm 0 10pt}.p-cover .cover-sub{font-size:14pt;line-height:1.35;color:#D7E2DA;max-width:110mm}.p-cover .cover-author{margin-top:18pt;font-weight:700;color:#F5B700;font-size:12pt}
.p-dedication{padding-top:55mm;text-align:center;font-size:11pt}.p-dedication p{margin:0 0 9pt}.p-dedication h2{font-stretch:114%;font-size:15pt;margin:0 0 12pt}
.p-part{page:part;height:297mm;background:#063A25;color:#F6F7F2;padding:70mm 18mm 0}.p-part .part-num{color:#F5B700;font-weight:700;font-size:11pt}.p-part h2{font-stretch:118%;font-weight:800;font-size:30pt;line-height:1.05;margin:6pt 0 10pt}.p-part p{font-size:12pt;color:#C9D6CD;max-width:120mm}
.p-toc h2{font-stretch:116%;font-weight:780;font-size:22pt;margin:0 0 8pt}.p-toc ol{list-style:none;margin:0;padding:0}.p-toc .toc-part>span{display:block;margin:10pt 0 3pt;font-weight:700;color:#0B5D3B;font-size:9.5pt}.p-toc a{display:flex;gap:8pt;text-decoration:none;color:#12211A;padding:2.5pt 0;border-bottom:.5pt solid #DCE2D8;font-size:9.5pt}.p-toc a b{min-width:14pt;color:#5D6C63}
.ch-head{margin:0 0 12pt;padding-bottom:9pt;border-bottom:.6pt solid #DCE2D8}.ch-num{font-weight:650;color:#0B5D3B;font-size:9.5pt}.ch-title{font-stretch:116%;font-weight:780;font-size:23pt;line-height:1.06;margin:4pt 0 6pt}.ch-sum{margin:0;color:#34443B;font-size:10.5pt}
h2{font-stretch:114%;font-weight:760;font-size:14pt;line-height:1.2;margin:15pt 0 5pt;break-after:avoid}h3{font-stretch:108%;font-weight:720;font-size:11pt;margin:12pt 0 4pt;break-after:avoid}
p{margin:0 0 6.5pt;orphans:3;widows:3}ul,ol{margin:0 0 7pt;padding-left:13pt}li{margin:1.5pt 0}strong{font-weight:680}
code{font-family:Menlo,monospace;font-size:8.4pt;background:#ECEFE8;padding:0 2pt;border-radius:2pt}pre{background:#0A2117;color:#F6F7F2;padding:7pt 9pt;border-radius:4pt;font-size:8pt;white-space:pre-wrap}
.table{margin:8pt 0 10pt;break-inside:auto}table{width:100%;border-collapse:collapse;font-size:8.3pt;line-height:1.35}th{text-align:left;font-weight:650;color:#5D6C63;border-bottom:.6pt solid #DCE2D8;padding:3pt 4pt;background:#ECEFE8}td{border-bottom:.5pt solid #DCE2D8;padding:3pt 4pt;vertical-align:top}tr{break-inside:avoid}td.num,th.num{text-align:right}
figure.shot{margin:9pt 0 11pt;break-inside:avoid}figure.shot img{width:100%;max-height:112mm;object-fit:contain;object-position:left top;border:.6pt solid #DCE2D8;border-radius:3pt}figure.shot.tall{float:right;width:44%;margin:2pt 0 8pt 12pt}figure.shot.tall img{max-height:150mm}h2,h3,.table,.callout,figure.shot:not(.tall){clear:both}figure.shot figcaption{margin-top:4pt;font-size:8.2pt;color:#5D6C63}
figure.diagram{margin:8pt 0;break-inside:avoid}figure.diagram svg{width:100%;height:auto}
.callout{margin:9pt 0;padding:7pt 9pt 2pt;border-radius:4pt;border:.6pt solid #DCE2D8;break-inside:avoid}.callout-kicker{display:flex;align-items:center;gap:5pt;font-weight:700;color:#0B5D3B;font-size:8.6pt}.callout-kicker .mm{width:11pt;height:11pt}.callout-title{font-weight:700;margin:1pt 0 2pt}
.callout-astuce{background:#E8F3ED;border-color:#CFE5D8}.callout-attention{background:#FFF8DD;border-color:#F3E2A3}.callout-investisseur{background:#063A25;color:#E9EEE9;border-color:#063A25}.callout-investisseur .callout-kicker{color:#F5B700}.callout-mola{border-left:2.5pt solid #0B5D3B}
blockquote{margin:8pt 0;padding-left:8pt;border-left:2pt solid #F5B700;font-style:italic;color:#34443B}
a{color:#0B5D3B;text-decoration:none}
`

/* ------------------------------------------------------------------ main */

const problems = check()
if (CHECK_ONLY) process.exit(problems ? 1 : 0)
copyFonts()
const results = {}
for (const lang of ['fr', 'en']) {
  const { ed, apps, totalWords } = await buildWeb(lang)
  const printFile = await buildPrint(lang, ed, apps)
  results[lang] = { chapters: ed.chapters.length, appendices: ed.appendixPages.length, words: totalWords, shots: [...imgCache.keys()].filter((k) => k.startsWith(lang + '/')).length }
  if (WANT_PDF) results[lang].pages = await printPdf(printFile, path.join(BUILD, 'pdf', `guide-${lang}.pdf`))
}
// /guide/ chooses the language
write(path.join(OUT, 'index.html'), `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Le Guide Ndamba / The Ndamba Guide</title><meta name="theme-color" content="#063A25"><link rel="icon" href="/favicon.svg"><script>try{var l=localStorage.getItem('njangi.lang')||((navigator.language||'fr').slice(0,2)==='en'?'en':'fr');location.replace(l==='en'?'en/':'fr/')}catch(e){location.replace('fr/')}</script><style>body{margin:0;font-family:system-ui,sans-serif;background:#063A25;color:#F6F7F2;display:grid;place-items:center;min-height:100vh}a{color:#F5B700;font-weight:700;margin:0 12px;font-size:18px}</style></head><body><p><a href="fr/">Le Guide Ndamba</a> <a href="en/">The Ndamba Guide</a></p></body></html>`)
console.log(JSON.stringify(results))
