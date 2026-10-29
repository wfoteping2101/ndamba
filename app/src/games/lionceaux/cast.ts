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
  | 'passager' | 'dame' | 'vendeur' | 'cousin' | 'voix' | 'chevre' | 'femmeNjangi' | 'mamaFotso' | 'mamaNgoo' | 'mamanTchinda' | 'vieilleDame'

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
  mireille: { id: 'mireille', name: 'Mireille', color: '#b0478f', look: base({ hair: 'puff', shirt: '#c45a9a', shirtTrim: '#f2eee3', shorts: '#2a2a40', sockL: '#f2eee3', sockR: '#f2eee3', shoes: 'trainers', boots: '#e6e0d4' }) },
  ousmane: { id: 'ousmane', name: 'Ousmane', color: '#3a5a8c', look: base({ hair: 'crop', shirt: '#3d4f6b', shirtTrim: '#d9cfbd', shorts: '#2a2a2a', gloves: '#d9cfbd', sockL: '#3d4f6b', sockR: '#3d4f6b', height: 0.9 }) },
  radio: { id: 'radio', name: 'Radio', color: '#c97a1e', look: base({ hair: 'twists', shirt: '#e6dccb', shirtTrim: '#c97a1e', stripe: { color: '#c97a1e', side: 'R' }, shorts: '#4a3b2a', sockL: '#4a3b2a', sockR: '#4a3b2a', shoes: 'trainers', boots: '#f0ebe1' }) },
  samuel: { id: 'samuel', name: 'Samuel', color: '#6b4a7a', look: base({ hair: 'crop', shirt: '#7b5a2a', shirtTrim: '#e9c46a', shorts: '#1f2a44', sockL: '#e9e2d0', sockR: '#e9e2d0', height: 1.1 }) },
  jules: { id: 'jules', name: 'Jules', color: '#5a6a7a', look: base({ hair: 'crop', shirt: '#8aa0b6', shorts: '#333', sockL: '#999', sockR: '#999', height: 0.92 }) },
  ekotto: { id: 'ekotto', name: 'Madame Ekotto', color: '#C9362B', look: base({ kid: false, woman: true, hair: 'puff', shirt: '#b8452f', dress: '#b8452f', pattern: { a: '#f2c230', b: '#7a2a1f', kind: 'circles' }, headwrap: '#f2c230', shoes: 'sandals', boots: '#4a3020', build: 1.12 }) },
  bile: { id: 'bile', name: 'Monsieur Bilé', color: '#6d6d6d', look: base({ kid: false, hair: 'bald', shirt: '#d9d2c4', collar: '#d9d2c4', trousers: '#4a4a4a', shoes: 'shoes', boots: '#2a2a2a', elder: true, beard: '#d8d2c8' }) },
  bulldozer: { id: 'bulldozer', name: 'Bulldozer', color: '#2d5fa8', look: base({ hair: 'crop', shirt: '#2d5fa8', shirtTrim: '#dfe9f5', shorts: '#16233d', sockL: '#2d5fa8', sockR: '#2d5fa8', height: 1.16, build: 1.3 }) },
  requin: { id: 'requin', name: 'Requin', color: '#2d5fa8', look: base({ hair: 'crop', shirt: '#2d5fa8', shirtTrim: '#dfe9f5', shorts: '#16233d', sockL: '#2d5fa8', sockR: '#2d5fa8', height: 1.04 }) },
  gars: { id: 'gars', name: 'Gars de la Pharmacie', color: '#3b8a6e', look: base({ hair: 'crop', shirt: '#e9e3d6', shirtTrim: '#3b8a6e', shorts: '#3b8a6e', sockL: '#e9e3d6', sockR: '#e9e3d6' }) },
  panthere: { id: 'panthere', name: 'Panthère', color: '#d9a400', look: base({ hair: 'crop', shirt: '#f0c419', shirtTrim: '#1b1b1b', shorts: '#1b1b1b', sockL: '#f0c419', sockR: '#f0c419', height: 1.12, build: 1.08 }) },
  pantherekeeper: { id: 'pantherekeeper', name: 'Monsieur Pieuvre', color: '#d9a400', look: base({ hair: 'crop', shirt: '#2a2a2a', shirtTrim: '#f0c419', shorts: '#1b1b1b', gloves: '#f0c419', height: 1.18 }) },
  aigle: { id: 'aigle', name: 'Aigle de Makepe', color: '#7a3b2a', look: base({ hair: 'crop', shirt: '#7a3b2a', shirtTrim: '#e9c46a', shorts: '#2a1a14', sockL: '#7a3b2a', sockR: '#7a3b2a' }) },
  cobra: { id: 'cobra', name: 'Cobra de Bonabéri', color: '#2f5b2f', look: base({ hair: 'crop', shirt: '#1f1f1f', shirtTrim: '#9bd16a', shorts: '#1f1f1f', sockL: '#9bd16a', sockR: '#9bd16a' }) },
  vulcanisateur: { id: 'vulcanisateur', name: 'Le vulcanisateur', color: '#555', look: base({ kid: false, hair: 'crop', shirt: '#5a5a5a', trousers: '#2b2b2b', shoes: 'sandals', boots: '#222' }) },
  joseph: { id: 'joseph', name: 'Joseph', color: '#6b5b3a', look: base({ hair: 'crop', shirt: '#b5893a', shorts: '#3a3a3a', shoes: 'sandals', boots: '#2b2420' }) },
  ernest: { id: 'ernest', name: 'Ernest', color: '#3a6b5b', look: base({ hair: 'crop', shirt: '#4a8a7a', shorts: '#2f2f2f', shoes: 'sandals', boots: '#2b2420' }) },
  mamaKemadjou: { id: 'mamaKemadjou', name: 'Mama Kemadjou', color: '#2f5aa0', look: base({ kid: false, woman: true, hair: 'bald', shirt: '#2f5aa0', dress: '#2f5aa0', pattern: { a: '#f2eee3', b: '#1d3d75', kind: 'circles' }, headwrap: '#2f5aa0', shoes: 'sandals', boots: '#3a2a20', height: 1.06, build: 0.9 }) },
  // a Lionceau the chapter does not name: the team plays in whatever it has (« une équipe de chiffons »)
  lion: { id: 'lion', name: '', color: '#3f8f4e', look: base({ hair: 'crop', shirt: '#d9cdb4', shirtTrim: '#8a6a3a', shorts: '#2f3f5a', sockL: '#d9cdb4', sockR: '#d9cdb4', shoes: 'trainers', boots: '#e6e0d4' }) },
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
}

/** A kid of the neighbourhood (crowds): varied shirts, same skin family. */
export function crowdLook(i: number): Look {
  const shirts = ['#c45a3a', '#e2c26a', '#5a8ab6', '#f2eee3', '#7aa05a', '#b65a8a', '#3a3a3a', '#d98a2a']
  const hairs: Look['hair'][] = ['crop', 'puff', 'twists', 'crop', 'afro', 'cornrows']
  const skins = ['#5B3A27', '#4a2f20', '#6b4430', '#3d271b', '#7a5038']
  return base({ hair: hairs[i % hairs.length], skin: skins[i % skins.length], shirt: shirts[i % shirts.length], shorts: ['#333', '#2a3a5a', '#5a3a2a'][i % 3], shoes: 'sandals', boots: '#2b2420', height: 0.9 + (i % 4) * 0.05 })
}
