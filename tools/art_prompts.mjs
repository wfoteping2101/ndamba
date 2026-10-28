#!/usr/bin/env node
// Lionceaux art pipeline: builds the eight-slot prompt of every image from tome1/art/scenes.mjs,
// writes tome1/prompts/NAME.txt and NAME.refs (reference images to attach) and tome1/art/inventory.json.
//   node tools/art_prompts.mjs            all assets
//   node tools/art_prompts.mjs ch07 ch12  only these
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(here, '..')
const ART = path.join(ROOT, 'tome1', 'art')
const OUT = path.join(ROOT, 'tome1', 'prompts')
fs.mkdirSync(OUT, { recursive: true })
const { SHEETS, COVERS, COVER_FINAL, CODE_COVER, PARTS, CHAPTERS } = await import(pathToFileURL(path.join(ART, 'scenes.mjs')).href)

export const STYLE = 'Cinematic stylized 3D-animation look translated into a hand-painted illustration: deliberate cel-shaded shadow shapes with two or three clean value steps, sculpted dimensional forms, angular but appealing shape design, visible painterly brush texture on surfaces and backgrounds, expressive child faces with clear readable features, rich saturated colour held together by one dominant palette, controlled dramatic lighting with a clear key light and a coloured rim light, atmospheric depth with soft haze between planes, composed like animated-feature key art. Warm, joyful, adventurous, for readers aged 8 to 12. Recognisably childlike proportions. Avoid: clip-art look, flat shading without depth, plastic or glossy toy skin, airbrushed faces, photorealistic adult faces on children, neon glow, bloom, lens flare, muddy darkness, clutter, mixed media, chibi proportions.'

// [BriBri the elder, Kaydoudou the younger], two years apart
const AGES = { 1: [12, 10], 2: [12, 10], 3: [13, 11], 4: [14, 12], 5: [15, 13] }

const PEOPLE = {
  BRI: (p) => `BriBri (age ${AGES[p][0]}), the elder brother: slim and tall for his age with long limbs and narrow shoulders, dark brown skin with a warm undertone, a long oval face with high cheekbones, a slim jaw and slightly prominent ears, very short tightly curled black hair with ONE THIN SHAVED PART LINE ON THE LEFT SIDE of his head (his own left: when he shows his right side or his right profile to the viewer, NO line is visible on that side), calm attentive almond-shaped dark brown eyes, a small one-sided smile; upright, still posture.${p >= 4 ? ' He is a young teenager now, taller and leaner than on the reference sheet.' : ''}`,
  KAY: (p) => `Kaydoudou (age ${AGES[p][1]}), the younger brother: a head shorter than BriBri (the top of his head reaches his brother's chin), compact and springy, dark brown skin with a warm undertone, a round face with full round cheeks and a small nose, a small soft round black afro, big round sparkling mischievous dark brown eyes, a wide grin with a visible GAP BETWEEN HIS TWO FRONT TEETH; always up on his toes. He always wears ONE RED SOCK ON HIS RIGHT FOOT AND ONE YELLOW SOCK ON HIS LEFT FOOT.${p >= 4 ? ' He is growing too, but stays shorter and rounder-faced than his brother.' : ''}`,
  MAMI: (p) => `Mami Nyanga (${p >= 5 ? 71 : p >= 4 ? 70 : p >= 2 ? 69 : 68}), their grandmother: small and very upright, a huge laugh, a red-and-yellow wax-print headscarf and dress.${p >= 5 ? ' In London she walks with a cane.' : ''}`,
  FOKOU: () => 'Tonton Fokou (62), their first coach: lean and wiry, a worn faded cap, a wooden whistle on a cord, a slight limp.',
  PAPA: () => 'Papa Armand (42): tall, a short neatly trimmed beard, warm eyes.',
  MAMAN: () => 'Maman Estelle (39): energetic, braids gathered in a bun, large gold hoop earrings.',
}

const REF_LABEL = {
  'identity-v1-brothers.png': 'an earlier watercolour character sheet of the two brothers (BriBri on the left, Kaydoudou on the right): copy their identity (faces, hair, skin tone, build, relative height, outfits) but NOT its watercolour style',
  'identity-v1-adults.png': 'an earlier watercolour sheet of the four adults (left to right: Mami Nyanga, Tonton Fokou, Papa Armand, Maman Estelle): copy their identity but NOT its watercolour style',
  'sheet-brothers.png': 'the canonical character sheet of the two brothers (BriBri on the left, Kaydoudou on the right): keep their faces, hair, skin tone, build and relative height exactly, adapting only age and clothes as stated',
  'sheet-adults.png': 'the canonical sheet of the four adults (left to right: Mami Nyanga, Tonton Fokou, Papa Armand, Maman Estelle): keep them consistent when they appear',
  'ch07.png': 'a finished interior illustration of this book: match its painting style, shading, palette handling and level of detail',
  'cover-art.png': 'the cover art of this book: match its painting style',
  'cover-rough-c.png': 'a rough draft of this cover: keep its overall idea (the brothers running toward us on a road that winds back through five countries) but improve it as described',
}

const ADULT_IDS = ['MAMI', 'FOKOU', 'PAPA', 'MAMAN']

const ILL = path.join(ROOT, 'tome1', 'illustrations')
const refLabel = (r, id) => {
  const own = id && r === id.slice(0, 4) + '.png' && r !== 'ch07.png'
  if (own) return 'the opening illustration of this same chapter: keep the same place, outfits and light continuity, but paint the new moment described below with its own composition'
  if (r === 'ch07.png' && id && id.startsWith('ch07') && id !== 'ch07') return 'the opening illustration of this same chapter, which is also the style reference of the book: match its painting style and keep the same place and outfits, but paint the new moment described below with its own composition'
  return REF_LABEL[r] || r
}

function defaultRefs(kind, e, id) {
  if (e.refs) return e.refs
  if (kind === 'part') return ['sheet-brothers.png', 'ch07.png']
  if (kind === 'beat') {
    const cast = e.cast || []
    const r = []
    if (cast.includes('BRI') || cast.includes('KAY')) r.push('sheet-brothers.png')
    if (cast.some((c) => ADULT_IDS.includes(c))) r.push('sheet-adults.png')
    const opener = id.slice(0, 4) + '.png'
    if (opener !== 'ch07.png' && fs.existsSync(path.join(ILL, opener))) r.push(opener)
    r.push('ch07.png')
    return r.slice(0, 4)
  }
  const r = ['sheet-brothers.png']
  if ((e.cast || []).some((c) => ADULT_IDS.includes(c))) r.push('sheet-adults.png')
  if (id !== 'ch07') r.push('ch07.png')
  return r.slice(0, 3)
}

function build(id, kind, e) {
  const part = e.part || 1
  const refs = defaultRefs(kind, e, id)
  const cast = e.cast || []
  const people = cast.map((c) => PEOPLE[c](part)).join(' ')
  const subject = [people, e.extras || ''].filter(Boolean).join(' ') || 'Small distant figures only, no close-up faces.'
  const refText = refs.length ? `Reference images attached, in this order: ${refs.map((r, i) => `(${i + 1}) ${refLabel(r, id)}`).join('; ')}.` : ''
  const isSheet = kind === 'sheet'
  const output = e.output || (kind === 'beat'
    ? 'Landscape 3:2 illustration placed inside the text of the chapter (half page, full text width). Keep the faces and the key action in the central 80 percent. No text, no letters, no captions, no logos, no brand marks, no watermark; shirt numbers only where stated.'
    : kind === 'part'
    ? 'Portrait 2:3 full page (6 x 9 inch book page with bleed). Keep faces and key details away from the left and right 8 percent. No text, no letters, no captions, no logos, no watermark.'
    : 'Portrait 2:3 full page (6 x 9 inch book page with bleed). Keep faces and key details away from the left and right 8 percent (binding). No text, no letters, no captions, no logos, no brand marks, no watermark; shirt numbers only where stated.')
  const slots = [
    ['Subject', subject],
    ['Outfit and details', e.outfit || ''],
    ['Action and emotion', e.action || ''],
    ['Location', e.location || ''],
    ['Lighting', e.light || ''],
    ['Composition and camera', e.camera || (kind === 'part' ? 'Wide establishing landscape composed for a full portrait page, figures small.' : '')],
    ['Style', STYLE],
    ['Output', output],
  ]
  const head = e.head || (kind === 'beat' ? 'An in-text illustration (landscape, half page) for an illustrated children\'s adventure novel about football. It shows one precise moment from inside the chapter, as a frame from an animated feature.' : isSheet ? 'A character design sheet for an illustrated children\'s adventure novel about football.' : kind === 'cover' ? 'Cover artwork (no lettering) for an illustrated children\'s adventure novel about football.' : 'A full-page illustration for an illustrated children\'s adventure novel about football.')
  const text = [head, refText, ...slots.filter(([, v]) => v).map(([k, v], i) => `${i + 1}. ${k}: ${v}`)].filter(Boolean).join('\n\n') + '\n'
  return { id, kind, refs, text }
}

const items = []
for (const [id, e] of Object.entries(SHEETS)) items.push({ ...build(id, 'sheet', e), e })
for (const [id, e] of Object.entries(COVERS)) items.push({ ...build(id, 'cover', e), e })
for (const [id, e] of Object.entries(CODE_COVER || {})) items.push({ ...build(id, 'cover', e), e })
if (COVER_FINAL) items.push({ ...build('cover-art', 'cover', COVER_FINAL), e: COVER_FINAL })
for (const [p, e] of Object.entries(PARTS)) items.push({ ...build(`part${p}`, 'part', { ...e, part: Number(p), cast: [] }), e })

// chapter metadata from the manuscript
const chDir = path.join(ROOT, 'tome1', 'chapters')
const meta = {}
for (const f of fs.readdirSync(chDir).filter((x) => /^\d\d-.*\.md$/.test(x))) {
  const m = fs.readFileSync(path.join(chDir, f), 'utf8').match(/^---\n([\s\S]*?)\n---\n/)
  const o = {}
  if (m) for (const line of m[1].split('\n')) { const k = line.match(/^(\w+):\s*(.*)$/); if (k) o[k[1]] = k[2].trim() }
  meta[Number(o.numero)] = { ...o, file: f }
}
for (const [n, e] of Object.entries(CHAPTERS)) {
  const id = `ch${String(n).padStart(2, '0')}`
  const part = Number(meta[n]?.partie) || 1
  items.push({ ...build(id, 'chapter', { ...e, part, cast: e.cast || ['BRI', 'KAY'].filter((c) => e.outfit?.includes(c === 'BRI' ? 'BriBri' : 'Kaydoudou')).concat(ADULT_IDS.filter((a) => e.outfit?.includes({ MAMI: 'Mami', FOKOU: 'Fokou', PAPA: 'Papa', MAMAN: 'Maman' }[a]))) }), e, n: Number(n), part, meta: meta[n] })
}

// in-text beats (tome1/art/beats/chNN.json), three per chapter, landscape
const beatDir = path.join(ART, 'beats')
if (fs.existsSync(beatDir)) for (const f of fs.readdirSync(beatDir).filter((x) => /^ch\d\d\.json$/.test(x)).sort()) {
  const n = Number(f.slice(2, 4))
  const part = Number(meta[n]?.partie) || 1
  for (const b of JSON.parse(fs.readFileSync(path.join(beatDir, f), 'utf8')).beats || []) items.push({ ...build(b.id, 'beat', { ...b, part }), e: b, n, part, meta: meta[n] })
}

const only = process.argv.slice(2)
const inventory = []
for (const it of items) {
  if (!only.length || only.includes(it.id)) {
    fs.writeFileSync(path.join(OUT, `${it.id}.txt`), it.text)
    fs.writeFileSync(path.join(OUT, `${it.id}.refs`), it.refs.join('\n') + '\n')
  }
  inventory.push({
    id: it.id, kind: it.kind, chapter: it.n || null, part: it.part || it.e.part || null, title: it.meta?.titre || null,
    location_in_book: it.kind === 'beat' ? `chapitre ${it.n}, dans le texte, après « ${String(it.e.anchor || '').slice(0, 60)} »` : it.kind === 'chapter' ? `chapitre ${it.n}, page d'ouverture pleine page` : it.kind === 'part' ? 'ouverture de partie, pleine page' : it.kind === 'cover' ? 'couverture' : 'planche de référence (et page « personnages » pour sheet-brothers)',
    purpose: it.e.purpose || null, goal: it.e.goal || null, obstacle: it.e.obstacle || null, choice: it.e.choice || null, emotion: it.e.emotion || null, hook: it.e.hook || null,
    shot: it.e.shot || (it.kind === 'part' ? 'wide' : null), refs: it.refs, aspect: it.kind === 'beat' || (it.kind === 'sheet' && /3:2/.test(it.e.output || '')) ? '3:2' : '2:3', anchor: it.e.anchor || undefined,
    text_safe: it.kind === 'cover' ? 'top 30 percent sky, bottom 14 percent band' : 'outer 8 percent free of faces',
    alt: it.e.alt || null, prompt: `tome1/prompts/${it.id}.txt`, master: `tome1/illustrations/${it.id}.png`,
  })
}
fs.writeFileSync(path.join(ART, 'inventory.json'), JSON.stringify(inventory, null, 1) + '\n')
console.log(`${only.length || items.length} prompt(s) written to tome1/prompts/, ${inventory.length} assets in tome1/art/inventory.json`)
