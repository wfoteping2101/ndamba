#!/usr/bin/env node
// Writes one prompt file per illustration of Tome 1 into tome1/prompts/ (for the image generator).
//   node tools/illustration_prompts.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(here, '..')
const OUT = path.join(ROOT, 'tome1', 'prompts')
fs.mkdirSync(OUT, { recursive: true })

export const STYLE = `A full-page illustration for a French children's adventure novel about football (readers aged 8 to 12). Painted in a warm, hand-painted animated-film style reminiscent of classic Japanese animation: soft gouache and watercolour textures, gentle cel shading, clean expressive linework, rich detailed backgrounds, luminous natural light, cinematic composition, a feeling of wonder and warmth. The characters are Black Cameroonian children and adults drawn with natural, respectful, realistic proportions and features (not caricatured, not chibi).`

export const BROTHERS = `Kaydoudou (the elder brother): slim and tall for his age, dark brown skin, very short black hair with a thin part shaved on the left side, calm thoughtful eyes, a small confident smile; his favourite shirt is a faded forest-green football shirt with a white collar and the number 8. BriBri (the younger brother): shorter, round cheeks, dark brown skin, a small soft afro, a big gap-toothed grin, sparkling mischievous eyes, always up on his toes; his signature is one red sock and one yellow sock.`

export const ADULTS = `Mami Nyanga (their grandmother, about 68): small and very upright, a red-and-yellow wax-print headscarf, a colourful wax-print dress, a huge laugh. Tonton Fokou (their first coach, about 62): lean, a worn faded cap, a wooden whistle on a cord, a slight limp. Papa Armand (41): tall, a short neatly trimmed beard, warm eyes, casual shirt. Maman Estelle (39): energetic, braids gathered in a bun, bright earrings.`

const AGES = { 1: [11, 10], 2: [11, 10], 3: [12, 11], 4: [13, 12], 5: [14, 13] }

const NOTEXT = `Portrait orientation, aspect ratio 2:3. No text, no letters, no captions, no logos, no brand marks, no watermark (shirt numbers are allowed only when the scene mentions them).`

const REFS = `Two reference images are attached. The first is the character sheet of the two brothers, Kaydoudou on the left and BriBri on the right: keep their faces, hair, skin tone and build consistent with it, adapting only their age as stated below. The second shows the four main adults (from left to right: Mami Nyanga, Tonton Fokou, Papa Armand, Maman Estelle): keep them consistent when they appear.`

function front(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n/)
  const meta = {}
  if (m) for (const line of m[1].split('\n')) { const k = line.match(/^(\w+):\s*(.*)$/); if (k) meta[k[1]] = k[2].trim() }
  return meta
}

const prompts = {}
prompts['anchor-brothers'] = `${STYLE}\n\nA character design sheet: the two Cameroonian brothers standing side by side, full body, front view, on a plain warm cream background with a soft ground shadow. On the left, Kaydoudou, 11 years old; on the right, BriBri, 10 years old. ${BROTHERS} Kaydoudou wears his green number 8 shirt, black shorts, white socks and worn black boots, and holds under his arm an old leather football patched with a square of red-and-yellow wax-print cloth. BriBri wears a sun-yellow T-shirt with one red stripe, green shorts, one red sock and one yellow sock, scuffed trainers, caught mid-bounce. Even spacing, centred composition. ${NOTEXT}`
prompts['anchor-adults'] = `${STYLE}\n\nA character design sheet of four Cameroonian adults standing in a row, full body, front view, on a plain warm cream background with soft ground shadows, from left to right: ${ADULTS} Mami Nyanga holds a small hand-patched leather football; Tonton Fokou has his whistle at his lips. Friendly, dignified poses. ${NOTEXT}`
prompts['cover-art'] = `${STYLE}\n\nThe cover art of the novel (leave the top third of the image calm and uncluttered, painted sky only, for the title to be added later). Two Cameroonian brothers, Kaydoudou (11) and BriBri (10), run joyfully towards the viewer along a winding path. ${BROTHERS} BriBri wears a sun-yellow T-shirt with a red stripe. Between them flies their old leather ball patched with red-and-yellow wax-print cloth. The path changes as it winds back into the distance, telling the journey: red earth with a mango tree and palm trees (Cameroon), then a snowy street with a small house (Maryland), then Paris rooftops with the Eiffel Tower, then a Catalan seaside village with plane trees, then a misty London skyline with a red double-decker bus. Golden late-afternoon light, a big luminous sky with swallows. Energetic, hopeful, magical. ${NOTEXT}`
const PARTS = {
  1: 'Part I, Cameroon. A wide establishing view of a red-earth neighbourhood football pitch in Bonamoussadi, Douala, in the dry season: red dust, two bamboo goals, a huge mango tree in the corner, low houses with corrugated roofs, motorcycle taxis on the road, children playing, a woman selling bean fritters under a parasol, warm golden morning light. Small figures, no close-up faces.',
  2: 'Part II, the United States. A wide view of a quiet suburban street in Waldorf, Maryland, under fresh January snow at dusk: small houses with warm windows, a basketball hoop above a snowy driveway, two small boys in puffy coats making footprints, one juggling a patched ball in the snow. Soft blue hour light with orange windows. Small figures, no close-up faces.',
  3: 'Part III, France. A wide view of a youth football training ground near Paris at golden autumn light, beside a river with a barge; in the distance a suburban train on a viaduct and Paris rooftops; a coach in a navy tracksuit with a whistle watches children in orange bibs. Small figures, no close-up faces.',
  4: 'Part IV, Spain. A wide view of a Catalan seaside village square on a Sunday: tall plane trees, a stone church, elderly men and children playing a circle passing game (a rondo) with a ball, vineyards on the hills, the bright Mediterranean sea beyond, cicadas summer light. Small figures, no close-up faces.',
  5: 'Part V, England. A wide view of a south London street in fine rain at evening: narrow brick terraced houses, a red double-decker bus, wet reflections, and beyond the rooftops a floodlit youth academy pitch glowing in the mist where small figures train. Small figures, no close-up faces.',
}
for (const [p, scene] of Object.entries(PARTS)) prompts[`part${p}`] = `${STYLE}\n\n${scene} Landscape painting composed for a full portrait page. ${NOTEXT}`

const dir = path.join(ROOT, 'tome1', 'chapters')
for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter((x) => /^\d\d-.*\.md$/.test(x)).sort() : []) {
  const meta = front(fs.readFileSync(path.join(dir, f), 'utf8'))
  if (!meta.illustration) continue
  const part = Number(meta.partie) || 1
  const [ka, bb] = AGES[part]
  prompts[`ch${String(meta.numero).padStart(2, '0')}`] = `${STYLE}\n\n${REFS}\n\nCharacters: ${BROTHERS} ${ADULTS}\nAges in this scene: Kaydoudou is ${ka}, BriBri is ${bb}.\n\nThe scene to paint (described in French): ${meta.illustration}\n\nOne single moment, at most three characters in the foreground, faces clearly readable. ${NOTEXT}`
}
for (const [k, v] of Object.entries(prompts)) fs.writeFileSync(path.join(OUT, `${k}.txt`), v)
console.log(`${Object.keys(prompts).length} prompts written to tome1/prompts/`)
