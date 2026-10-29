// The people of Lionceaux, tome 1, as the book and its approved character sheets show them
// (tome1/art/CHARACTERS.md, sheet-brothers and sheet-adults). Locks that are never broken:
// BriBri is the older and taller brother, thin shaved part on HIS LEFT, green 8 with a white collar;
// Kaydoudou wears the RED sock on his RIGHT foot and the YELLOW sock on his LEFT foot, has a gap
// between his front teeth and a soft round afro; his head reaches his brother's chin.
// Characters the book does not describe physically get plain, mismatched clothes (« une équipe
// de chiffons », ch03), never a detail that would contradict the text.
import type { Look } from '../engine/sim/types'

const SKIN = '#5B3A27'
const HAIR = '#17110c'

export type CastId =
  | 'bribri' | 'kaydoudou' | 'fokou' | 'mami' | 'papa' | 'maman'
  | 'mireille' | 'ousmane' | 'radio' | 'samuel' | 'jules' | 'ekotto' | 'bile'
  | 'bulldozer' | 'requin' | 'gars' | 'panthere' | 'aigle' | 'cobra' | 'pantherekeeper'
  | 'vulcanisateur' | 'joseph' | 'ernest' | 'mamaKemadjou' | 'kid' | 'lion'
  | 'pereSamuel' | 'inconnue' | 'president' | 'pereRadio'
  | 'enfants' | 'passager' | 'dame' | 'vendeur' | 'cousin' | 'voix' | 'chevre' | 'femmeNjangi' | 'mamaFotso' | 'mamaNgoo' | 'mamanTchinda' | 'vieilleDame'
  | 'tambour' | 'foule' | 'capPanthere' | 'hautParleur'
  | 'anon' | 'diego' | 'hayesMme' | 'hayesM' | 'biscuit' | 'patterson' | 'maitresse' | 'coreenne' | 'guatemala' | 'teeGris' | 'animateur'
  | 'tyler' | 'whitfield' | 'marcus' | 'copains' | 'file' | 'garcon'

export interface CastMember { id: CastId; name: string; color: string; look: Look; height?: number }

const base = (o: Partial<Look>): Look => ({
  skin: SKIN, hair: 'crop', hairColor: HAIR, shirt: '#2E6B45', shirtTrim: '#F2EEE3', shorts: '#1d1d1d',
  sockL: '#F2EEE3', sockR: '#F2EEE3', boots: '#1b1714', kid: true, ...o,
})

export const CAST: Record<CastId, CastMember> = {
  bribri: {
    id: 'bribri', name: 'BriBri', color: '#2E6B45',
    look: base({ shirt: '#2E6B45', collar: '#F2EEE3', number: 8, numberColor: '#F2EEE3', shorts: '#1f1f1f', sockL: '#F2EEE3', sockR: '#F2EEE3', boots: '#1b1714', part: 'L', height: 1.07, build: 0.92 }),
  },
  kaydoudou: {
    id: 'kaydoudou', name: 'Kaydoudou', color: '#D63C2F',
    look: base({ hair: 'afro', shirt: '#F2C230', stripe: { color: '#D63C2F', side: 'L' }, shirtTrim: '#F2C230', shorts: '#3F8F4E', sockR: '#D63C2F', sockL: '#F2C230', shoes: 'trainers', boots: '#ece7dc', gap: true, height: 0.93, build: 1.02 }),
  },
  fokou: {
    id: 'fokou', name: 'Tonton Fokou', color: '#7a6a4a',
    look: base({ kid: false, hair: 'cap', cap: '#6f6a62', shirt: '#2f6b45', jacket: '#efe9dc', shirtTrim: '#efe9dc', trousers: '#2a3352', trouserStripe: '#efe9dc', shoes: 'trainers', boots: '#7b6c58', beard: '#cfc8bd', elder: true, cane: true, build: 0.88 }),
  },
  mami: {
    id: 'mami', name: 'Mami', color: '#C9362B',
    look: base({ kid: false, woman: true, hair: 'bald', shirt: '#E2A22A', dress: '#E2A22A', pattern: { a: '#C9362B', b: '#F0B92E', kind: 'wax' }, headwrap: '#C9362B', shoes: 'sandals', boots: '#2b2420', earrings: '#E6B640', height: 0.9 }),
  },
  papa: {
    id: 'papa', name: 'Papa', color: '#4C79B5',
    look: base({ kid: false, hair: 'crop', shirt: '#6f97d6', collar: '#6f97d6', trousers: '#6d7550', shoes: 'shoes', boots: '#5a3a24', beard: HAIR, glasses: true, height: 1.04 }),
  },
  maman: {
    id: 'maman', name: 'Maman', color: '#1d8c8c',
    look: base({ kid: false, woman: true, hair: 'puff', shirt: '#1f9a9a', dress: '#1f9a9a', pattern: { a: '#F2C230', b: '#0f6b6b', kind: 'leaves' }, shoes: 'sandals', boots: '#E2B030', earrings: '#E6B640' }),
  },
  mireille: { id: 'mireille', name: 'Mireille', color: '#b0478f', look: base({ girl: true, hair: 'puff', shirt: '#c45a9a', shirtTrim: '#f2eee3', shorts: '#2a2a40', sockL: '#f2eee3', sockR: '#f2eee3', shoes: 'trainers', boots: '#e6e0d4' }) },
  ousmane: { id: 'ousmane', name: 'Ousmane', color: '#3a5a8c', look: base({ hair: 'crop', shirt: '#3d4f6b', shirtTrim: '#d9cfbd', shorts: '#2a2a2a', gloves: '#d9cfbd', sockL: '#3d4f6b', sockR: '#3d4f6b', height: 0.9 }) },
  radio: { id: 'radio', name: 'Radio', color: '#c97a1e', look: base({ hair: 'twists', shirt: '#e6dccb', shirtTrim: '#c97a1e', stripe: { color: '#c97a1e', side: 'R' }, shorts: '#4a3b2a', sockL: '#4a3b2a', sockR: '#4a3b2a', shoes: 'trainers', boots: '#f0ebe1' }) },
  samuel: { id: 'samuel', name: 'Samuel', color: '#6b4a7a', look: base({ hair: 'crop', shirt: '#7b5a2a', shirtTrim: '#e9c46a', shorts: '#1f2a44', sockL: '#e9e2d0', sockR: '#e9e2d0', height: 1.1 }) },
  jules: { id: 'jules', name: 'Jules', color: '#5a6a7a', look: base({ hair: 'crop', shirt: '#8aa0b6', shorts: '#333', sockL: '#999', sockR: '#999', height: 0.92 }) },
  ekotto: { id: 'ekotto', name: 'Madame Ekotto', color: '#C9362B', look: base({ kid: false, woman: true, hair: 'puff', shirt: '#b8452f', dress: '#b8452f', pattern: { a: '#f2c230', b: '#7a2a1f', kind: 'circles' }, headwrap: '#f2c230', shoes: 'sandals', boots: '#4a3020', build: 1.12 }) },
  bile: { id: 'bile', name: 'Monsieur Bilé', color: '#6d6d6d', look: base({ kid: false, hair: 'bald', shirt: '#d9d2c4', collar: '#d9d2c4', trousers: '#4a4a4a', shoes: 'shoes', boots: '#2a2a2a', elder: true, beard: '#d8d2c8' }) },
  bulldozer: { id: 'bulldozer', name: 'Bulldozer', color: '#2d5fa8', look: base({ hair: 'crop', shirt: '#2d5fa8', shirtTrim: '#dfe9f5', shorts: '#16233d', sockL: '#2d5fa8', sockR: '#2d5fa8', height: 1.16, build: 1.3, chestMark: 'fin' }) },
  requin: { id: 'requin', name: 'Requin', color: '#2d5fa8', look: base({ hair: 'crop', shirt: '#2d5fa8', shirtTrim: '#dfe9f5', shorts: '#16233d', sockL: '#2d5fa8', sockR: '#2d5fa8', height: 1.04, chestMark: 'fin' }) },
  gars: { id: 'gars', name: 'Gars de la Pharmacie', color: '#3b8a6e', look: base({ hair: 'crop', shirt: '#e9e3d6', shirtTrim: '#3b8a6e', shorts: '#3b8a6e', sockL: '#e9e3d6', sockR: '#e9e3d6' }) },
  panthere: { id: 'panthere', name: 'Panthère', color: '#d9a400', look: base({ hair: 'crop', shirt: '#f0c419', shirtTrim: '#1b1b1b', shorts: '#1b1b1b', sockL: '#f0c419', sockR: '#f0c419', height: 1.12, build: 1.08, chestMark: 'spots', chestMarkColor: '#1b1b1b' }) },
  pantherekeeper: { id: 'pantherekeeper', name: 'Monsieur Pieuvre', color: '#d9a400', look: base({ hair: 'crop', shirt: '#2a2a2a', shirtTrim: '#f0c419', shorts: '#1b1b1b', gloves: '#f0c419', height: 1.18 }) },
  aigle: { id: 'aigle', name: 'Aigle de Makepe', color: '#7a3b2a', look: base({ hair: 'crop', shirt: '#7a3b2a', shirtTrim: '#e9c46a', shorts: '#2a1a14', sockL: '#7a3b2a', sockR: '#7a3b2a' }) },
  cobra: { id: 'cobra', name: 'Cobra de Bonabéri', color: '#2f5b2f', look: base({ hair: 'crop', shirt: '#1f1f1f', shirtTrim: '#9bd16a', shorts: '#1f1f1f', sockL: '#9bd16a', sockR: '#9bd16a' }) },
  vulcanisateur: { id: 'vulcanisateur', name: 'Le vulcanisateur', color: '#555', look: base({ kid: false, hair: 'crop', shirt: '#5a5a5a', trousers: '#2b2b2b', shoes: 'sandals', boots: '#222' }) },
  joseph: { id: 'joseph', name: 'Joseph', color: '#6b5b3a', look: base({ hair: 'crop', shirt: '#b5893a', shorts: '#3a3a3a', shoes: 'sandals', boots: '#2b2420' }) },
  ernest: { id: 'ernest', name: 'Ernest', color: '#3a6b5b', look: base({ hair: 'crop', shirt: '#4a8a7a', shorts: '#2f2f2f', shoes: 'sandals', boots: '#2b2420' }) },
  mamaKemadjou: { id: 'mamaKemadjou', name: 'Mama Kemadjou', color: '#2f5aa0', look: base({ kid: false, woman: true, hair: 'bald', shirt: '#2f5aa0', dress: '#2f5aa0', pattern: { a: '#f2eee3', b: '#1d3d75', kind: 'circles' }, headwrap: '#2f5aa0', shoes: 'sandals', boots: '#3a2a20', height: 1.06, build: 0.9 }) },
  // a Lionceau the chapter does not name: the team plays in whatever it has (« une équipe de chiffons »)
  lion: { id: 'lion', name: '', color: '#3f8f4e', look: base({ hair: 'crop', shirt: '#d9cdb4', shirtTrim: '#8a6a3a', shorts: '#2f3f5a', sockL: '#d9cdb4', sockR: '#d9cdb4', shoes: 'trainers', boots: '#e6e0d4' }) },
  // chapter 5: grown-ups of the quarter the book names only by who they are (plain clothes)
  pereSamuel: { id: 'pereSamuel', name: 'Le père de Samuel', color: '#4a6a8a', look: base({ kid: false, hair: 'crop', shirt: '#4a6a8a', collar: '#4a6a8a', trousers: '#2e2e2e', shoes: 'shoes', boots: '#2a2420', height: 1.04 }) },
  pereRadio: { id: 'pereRadio', name: 'Le micro (le père de Radio)', color: '#8a6a3a', look: base({ kid: false, hair: 'crop', shirt: '#c9a24a', collar: '#c9a24a', trousers: '#3a3a3a', shoes: 'shoes', boots: '#2a2420', build: 1.1 }) },
  inconnue: { id: 'inconnue', name: 'Une dame', color: '#7a5a8a', look: base({ kid: false, woman: true, hair: 'bald', shirt: '#7a5a8a', dress: '#7a5a8a', pattern: { a: '#e9c46a', b: '#5a3a6a', kind: 'circles' }, headwrap: '#e9c46a', shoes: 'sandals', boots: '#2b2420' }) },
  president: { id: 'president', name: 'Le président du comité des quartiers', color: '#6a5a3a', look: base({ kid: false, hair: 'cap', cap: '#5a5048', shirt: '#d9d2c4', collar: '#d9d2c4', trousers: '#3a3a3a', shoes: 'shoes', boots: '#2a2420', elder: true, build: 1.05 }) },
  enfants: { id: 'enfants', name: 'Les enfants sur le mur', color: '#e2c26a', look: base({}) },
  // chapter 2: the coach to Bafoussam (« un monsieur en costume », « une dame au chapeau à fleurs »)
  passager: { id: 'passager', name: 'Un monsieur en costume', color: '#5a5a6a', look: base({ kid: false, hair: 'bald', shirt: '#3a3d48', collar: '#f2eee3', trousers: '#3a3d48', shoes: 'shoes', boots: '#1e1a16', build: 1.08 }) },
  dame: { id: 'dame', name: 'Une dame au chapeau à fleurs', color: '#b65a8a', look: base({ kid: false, woman: true, hair: 'bald', shirt: '#e9a0b8', dress: '#e9a0b8', pattern: { a: '#7aa05a', b: '#f2eee3', kind: 'leaves' }, hat: '#f2e2b8', hatFlowers: '#d6457a', shoes: 'sandals', boots: '#3a2a20', build: 1.1 }) },
  vendeur: { id: 'vendeur', name: 'Un vendeur', color: '#c97a1e', look: base({ kid: false, hair: 'crop', shirt: '#c97a1e', trousers: '#3a3a3a', shoes: 'sandals', boots: '#2b2420' }) },
  cousin: { id: 'cousin', name: 'Un cousin', color: '#5a8ab6', look: base({ hair: 'crop', shirt: '#5a8ab6', shirtTrim: '#e9e3d6', shorts: '#2a2a2a', shoes: 'sandals', boots: '#2b2420' }) },
  voix: { id: 'voix', name: 'Une voix', color: '#cfd8de', look: base({}) },
  chevre: { id: 'chevre', name: 'La chèvre', color: '#e9e2d2', look: base({ animal: 'goat', shirt: '#e9e2d2', shorts: '#4a3a2a' }) },
  // the njangi of the women of the quarter: « toutes dans le même pagne bleu et blanc »
  femmeNjangi: { id: 'femmeNjangi', name: 'Une femme du njangi', color: '#2f5aa0', look: base({ kid: false, woman: true, hair: 'bald', shirt: '#2f5aa0', dress: '#2f5aa0', pattern: { a: '#f2eee3', b: '#2f5aa0', kind: 'circles' }, headwrap: '#2f5aa0', shoes: 'sandals', boots: '#2b2420' }) },
  mamaFotso: { id: 'mamaFotso', name: 'Mama Fotso', color: '#2f5aa0', look: base({ kid: false, woman: true, hair: 'bald', shirt: '#2f5aa0', dress: '#2f5aa0', pattern: { a: '#f2eee3', b: '#2f5aa0', kind: 'circles' }, headwrap: '#2f5aa0', shoes: 'sandals', boots: '#2b2420', build: 1.1 }) },
  mamaNgoo: { id: 'mamaNgoo', name: "Mama Ngo'o", color: '#2f5aa0', look: base({ kid: false, woman: true, hair: 'bald', shirt: '#2f5aa0', dress: '#2f5aa0', pattern: { a: '#f2eee3', b: '#2f5aa0', kind: 'circles' }, headwrap: '#2f5aa0', shoes: 'sandals', boots: '#2b2420', skin: '#4a2f20' }) },
  mamanTchinda: { id: 'mamanTchinda', name: 'Maman Tchinda', color: '#2f5aa0', look: base({ kid: false, woman: true, hair: 'puff', shirt: '#2f5aa0', dress: '#2f5aa0', pattern: { a: '#f2eee3', b: '#2f5aa0', kind: 'circles' }, shoes: 'sandals', boots: '#2b2420', height: 0.97 }) },
  vieilleDame: { id: 'vieilleDame', name: 'La vieille dame au bâton', color: '#2f5aa0', look: base({ kid: false, woman: true, hair: 'bald', shirt: '#2f5aa0', dress: '#2f5aa0', pattern: { a: '#f2eee3', b: '#2f5aa0', kind: 'circles' }, headwrap: '#2f5aa0', shoes: 'sandals', boots: '#2b2420', elder: true, cane: true, height: 0.92 }) },
  kid: { id: 'kid', name: '', color: '#888', look: base({ hair: 'crop', shirt: '#9a8a6a', shorts: '#333', shoes: 'sandals', boots: '#2b2420' }) },
  // chapter 8: « des hommes installent de grands tambours »; the crowd; the Panthers' captain (« de
  // tout en haut »); the airport loudspeaker (a voice only)
  tambour: { id: 'tambour', name: 'Un joueur de tambour', color: '#8a5a2a', look: base({ kid: false, hair: 'crop', shirt: '#e9e2d2', pattern: { a: '#c45a3a', b: '#e9e2d2', kind: 'wax' }, trousers: '#3a3a3a', shoes: 'sandals', boots: '#2b2420', build: 1.05 }) },
  foule: { id: 'foule', name: 'La foule', color: '#e2c26a', look: base({}) },
  capPanthere: { id: 'capPanthere', name: 'Le capitaine des Panthères', color: '#d9a400', look: base({ hair: 'crop', shirt: '#f0c419', shirtTrim: '#1b1b1b', shorts: '#1b1b1b', sockL: '#f0c419', sockR: '#f0c419', height: 1.2, build: 1.12, chestMark: 'spots', chestMarkColor: '#1b1b1b' }) },
  hautParleur: { id: 'hautParleur', name: 'Le haut-parleur', color: '#cfd8de', look: base({}) },
  // a line the book does not attribute: shown without a name
  anon: { id: 'anon', name: '', color: '#F6F7F2', look: base({}) },
  // Part II, Waldorf (tome1/BIBLE.md and notes/part2.md): Diego Ramírez, 11, Salvadoran-American, « cheveux
  // noirs dressés sur la tête »; the Hayes, an old couple next door (he very tall and quiet, she with a big
  // laugh and a sweet potato pie) and Biscuit (« bas sur pattes, oreilles immenses »); Mrs. Patterson, the
  // ESL teacher (« des lunettes rouges au bout d'une chaînette, un gilet aux poches pleines de feutres »)
  diego: { id: 'diego', name: 'Diego', color: '#2f6fb0', look: base({ skin: '#a8714c', hair: 'crop', shirt: '#2f6fb0', shirtTrim: '#f2f2ee', shorts: '#1d1d1d', sockL: '#f2f2ee', sockR: '#f2f2ee', shoes: 'trainers', boots: '#e6e0d4', height: 0.97 }) },
  hayesMme: { id: 'hayesMme', name: 'Mrs. Hayes', color: '#a8556a', look: base({ kid: false, woman: true, skin: '#6e4632', hair: 'puff', hairColor: '#d6d2cc', shirt: '#a8556a', jacket: '#e9e2d4', trousers: '#3a3a44', shoes: 'shoes', boots: '#2a2420', elder: true, build: 1.12, glasses: true }) },
  hayesM: { id: 'hayesM', name: 'Mr. Hayes', color: '#6a5a4a', look: base({ kid: false, skin: '#6e4632', hair: 'bald', shirt: '#5a4a3a', jacket: '#7a6a58', trousers: '#2e3138', shoes: 'shoes', boots: '#2a2420', elder: true, height: 1.12, beard: '#cfcac2' }) },
  biscuit: { id: 'biscuit', name: 'Biscuit', color: '#c8955a', look: base({ animal: 'dog', shirt: '#c8955a', shorts: '#6b4126' }) },
  patterson: { id: 'patterson', name: 'Mrs. Patterson', color: '#c9362b', look: base({ kid: false, woman: true, skin: '#e2b896', hair: 'long', hairColor: '#8a6a4a', shirt: '#7a8a5a', jacket: '#e9e2d4', trousers: '#4a4a54', shoes: 'shoes', boots: '#2a2420', glasses: true, glassesColor: '#c9362b' }) },
  maitresse: { id: 'maitresse', name: 'La maîtresse', color: '#5a7a9a', look: base({ kid: false, woman: true, skin: '#c99b78', hair: 'long', hairColor: '#3a2a1e', shirt: '#5a7a9a', jacket: '#5a7a9a', trousers: '#2e3138', shoes: 'shoes', boots: '#2a2420' }) },
  coreenne: { id: 'coreenne', name: 'La fille de Corée', color: '#d96a8a', look: base({ girl: true, skin: '#e8c4a0', hair: 'long', hairColor: '#141414', shirt: '#d96a8a', jacket: '#d96a8a', trousers: '#3a4a6a', shoes: 'trainers', boots: '#e6e0d4', height: 0.97 }) },
  guatemala: { id: 'guatemala', name: 'Le garçon du Guatemala', color: '#3a7a5a', look: base({ skin: '#b07a52', hair: 'crop', shirt: '#3a7a5a', jacket: '#3a7a5a', trousers: '#2f3a4a', shoes: 'trainers', boots: '#e6e0d4' }) },
  teeGris: { id: 'teeGris', name: 'Le garçon au tee-shirt gris', color: '#8a8f94', look: base({ skin: '#e6c3a3', hair: 'crop', hairColor: '#5a3a22', shirt: '#8a8f94', shirtTrim: '#8a8f94', shorts: '#2a2a2a', sockL: '#f2f2ee', sockR: '#f2f2ee', shoes: 'trainers', boots: '#e6e0d4', height: 1.04 }) },
  animateur: { id: 'animateur', name: 'Le monsieur du centre', color: '#c9362b', look: base({ kid: false, skin: '#d9b08c', hair: 'crop', hairColor: '#4a3a2a', shirt: '#c9362b', collar: '#c9362b', trousers: '#2a2e36', trouserStripe: '#f2f2ee', shoes: 'trainers', boots: '#e6e0d4', build: 1.08 }) },
  // chapter 10, the tryouts under the dome
  tyler: { id: 'tyler', name: 'Tyler Brooks', color: '#e8e2c8', look: base({ skin: '#f0d2b8', hair: 'crop', hairColor: '#efe8cf', shirt: '#e9e9e4', shirtTrim: '#e9e9e4', shorts: '#1d1d1d', sockL: '#141414', sockR: '#141414', boots: '#141414', build: 1.26, height: 1.09 }) },
  whitfield: { id: 'whitfield', name: 'Coach Whitfield', color: '#2f4a7a', look: base({ kid: false, woman: true, skin: '#ead0b4', hair: 'ponytail', hairColor: '#5a3a22', shirt: '#1f2a44', jacket: '#1f2a44', trousers: '#1f2a44', trouserStripe: '#f2f2ee', shoes: 'trainers', boots: '#e6e0d4', height: 1.08 }) },
  marcus: { id: 'marcus', name: 'Marcus Bell', color: '#8a8f94', look: base({ kid: false, skin: '#8a5a3c', hair: 'crop', shirt: '#8a8f94', jacket: '#8a8f94', trousers: '#2f3a4a', shoes: 'trainers', boots: '#e6e0d4', glasses: true, build: 0.84, height: 1.02 }) },
  copains: { id: 'copains', name: 'Les copains de Tyler', color: '#cfd8de', look: base({}) },
  file: { id: 'file', name: 'La file', color: '#e2c26a', look: base({}) },
  garcon: { id: 'garcon', name: 'Un garçon', color: '#cfd8de', look: base({}) },
}

/** A kid of the neighbourhood (crowds): varied shirts, same skin family. */
export function crowdLook(i: number): Look {
  const shirts = ['#c45a3a', '#e2c26a', '#5a8ab6', '#f2eee3', '#7aa05a', '#b65a8a', '#3a3a3a', '#d98a2a']
  const hairs: Look['hair'][] = ['crop', 'puff', 'twists', 'crop', 'afro', 'cornrows']
  const skins = ['#5B3A27', '#4a2f20', '#6b4430', '#3d271b', '#7a5038']
  return base({ hair: hairs[i % hairs.length], skin: skins[i % skins.length], shirt: shirts[i % shirts.length], shorts: ['#333', '#2a3a5a', '#5a3a2a'][i % 3], shoes: 'sandals', boots: '#2b2420', height: 0.9 + (i % 4) * 0.05 })
}
