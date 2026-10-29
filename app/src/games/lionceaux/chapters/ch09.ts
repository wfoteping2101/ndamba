// Chapitre 9, « La neige de Waldorf » (POV BriBri). Source: tome1/chapters/09-la-neige-de-waldorf.md.
// Every line is the chapter's text; lines the book gives to nobody in particular are shown without a
// name. Played: BriBri's first « Thank you » to Mrs. Patterson; the ten passes in the basement with
// Mami's ball (canon: ten, the ball never touches the floor); the third ball of the futsal, one touch
// to Diego on the left (canon: Diego, then Kaydoudou between the keeper's legs); Kaydoudou's « semelle
// caramel » against the defenders. The snow, the neighbours, the school and the bus are cutscenes.
import type { Look } from '../../engine/sim/types'
import type { ChapterScript } from '../story/session'
import type { ActorSpec, Pt } from '../story/types'
import { N, S, T } from './helpers'

const snowy = { id: 'waldorf' as const, mood: 'snow' as const, opts: { snow: true } }
const noon = { id: 'waldorf' as const, mood: 'winter' as const, opts: { snow: true } }
const busStop = { id: 'waldorf' as const, mood: 'winter' as const, opts: { snow: true, bus: true } }
const field = { id: 'waldorf' as const, mood: 'winter' as const, opts: { snow: true, field: true } }
const home = { id: 'maisonUS' as const, mood: 'interiorNight' as const, opts: { night: true } }
const school = { id: 'classe' as const, mood: 'interior' as const }
const bus = { id: 'bus' as const, mood: 'interior' as const }
const gym = { id: 'gymnase' as const, mood: 'interior' as const }

/* ------------------------------------------------------------------ winter clothes */
/** Kaydoudou's pyjamas, his red sock and his yellow sock in his claquettes, in the snow */
const PYJAMA: Partial<Look> = { shirt: '#9ec1e0', shirtTrim: '#9ec1e0', jacket: '#9ec1e0', trousers: '#9ec1e0', stripe: undefined, shoes: 'slides', boots: '#1f2a44' }
/** BriBri's red anorak, « tout neuf » */
const ANORAK: Partial<Look> = { coat: '#c8302a', shirt: '#3a5a7a', shirtTrim: '#3a5a7a', jacket: '#3a5a7a', number: undefined, trousers: '#2f3a4a', shoes: 'trainers', boots: '#e6e0d4' }
const B_SCHOOL: Partial<Look> = { shirt: '#3a5a7a', shirtTrim: '#3a5a7a', jacket: '#3a5a7a', collar: '#f2eee3', number: undefined, trousers: '#2f3a4a', shoes: 'trainers', boots: '#e6e0d4' }
const K_SCHOOL: Partial<Look> = { shirt: '#e2a22a', shirtTrim: '#e2a22a', jacket: '#e2a22a', stripe: undefined, trousers: '#3f4f6b' }
const PAPA_HOME: Partial<Look> = { jacket: '#5a5048', shoes: 'socks', sockL: '#3a3a3a', sockR: '#3a3a3a' }
const PAPA_COAT: Partial<Look> = { jacket: '#6f97d6', coat: '#2f3a4a' }
const MAMAN_HOME: Partial<Look> = { jacket: '#e9e2d4' }
const FUTSAL_SHOES: Partial<Look> = { shoes: 'trainers', boots: '#e6e0d4' }

/** The children of Waldorf: other faces, other hair, winter sweaters (extras the book does not describe). */
const PUPILS: [string, Look['hair'], string, boolean, string][] = [
  ['#e8c4a0', 'long', '#7a4a2a', true, '#6a8caf'], ['#5B3A27', 'crop', '#17110c', false, '#c45a3a'],
  ['#c99b78', 'crop', '#3a2a1e', false, '#7aa05a'], ['#3f2a1e', 'puff', '#17110c', true, '#e2c26a'],
  ['#f0d2b8', 'crop', '#c9a060', false, '#9b6bb3'], ['#a8714c', 'long', '#17110c', true, '#4a4a54'],
  ['#8a5a3c', 'afro', '#17110c', false, '#d9534f'], ['#d9b08c', 'long', '#5a3a22', true, '#2f6f8f'],
  ['#e8c4a0', 'crop', '#5a3a22', false, '#8a6a4a'], ['#5B3A27', 'twists', '#17110c', true, '#b05a8a'],
  ['#f0d2b8', 'long', '#c9a060', true, '#5a8a6a'], ['#6b4430', 'cornrows', '#17110c', false, '#3a5a8c'],
  ['#c99b78', 'long', '#17110c', true, '#c97a3a'], ['#a8714c', 'crop', '#17110c', false, '#6a6e72'],
]
function pupil(id: string, at: Pt, v: number, o: Partial<ActorSpec> = {}): ActorSpec {
  const [skin, hair, hairColor, girl, top] = PUPILS[v % PUPILS.length]
  return {
    id, cast: 'kid', at, face: -Math.PI / 2, pose: 'sit', ...o,
    look: { skin, hair, hairColor, girl, shirt: top, shirtTrim: top, jacket: top, trousers: ['#2f3a4a', '#3a3a44', '#4a5a7a', '#2a2a2a'][v % 4], shoes: 'trainers', boots: '#e6e0d4', height: 0.95 + ((v * 7) % 10) / 100, ...(o.look ?? {}) },
  }
}

/** The seats of the class besides BriBri's (desk marks of the set, then the other desks). */
const SEATS: Pt[] = [[3.0, 3.6], [6.2, 3.6], [6.2, 5.2], [3.0, 5.2], [4.6, 5.2], [1.4, 3.6], [1.4, 5.2], [7.8, 3.6], [7.8, 5.2], [3.0, 6.8], [4.6, 6.8], [6.2, 6.8], [1.4, 6.8], [7.8, 6.8]]

/* ------------------------------------------------------------------ the futsal court (28 x 16, Team Diego attacks right) */
const GYM_WIDE = { kind: 'pose' as const, pos: [14, 5.2, 15.4] as [number, number, number], look: [14, 0.6, 6.5] as [number, number, number], fov: 62 }

function court(over: Record<string, Partial<ActorSpec>> = {}): ActorSpec[] {
  const base: ActorSpec[] = [
    { id: 'PA', cast: 'papa', at: [9.0, 15.55], face: -Math.PI / 2, pose: 'sit', look: PAPA_COAT },
    { id: 'AN', cast: 'animateur', at: [14, 15.0], face: -Math.PI / 2 },
    pupil('GA', [1.8, 8], 1, { team: 'a', gk: true, face: 0, pose: null, look: { gloves: '#e6e0d4' } }),
    pupil('A4', [4.3, 4.1], 8, { team: 'a', face: 0, pose: null }),
    { id: 'B', cast: 'bribri', team: 'a', at: [8.3, 8.8], face: 0, number: 8, look: FUTSAL_SHOES },
    { id: 'D', cast: 'diego', team: 'a', at: [14, 3.7], face: 0 },
    { id: 'K', cast: 'kaydoudou', team: 'a', at: [20.5, 10.7], face: 0 },
    { id: 'TG', cast: 'teeGris', team: 'b', at: [11.2, 10.3], face: Math.PI },
    pupil('R2', [15.2, 8.4], 11, { team: 'b', face: Math.PI, pose: null }),
    pupil('R3', [19.3, 5.3], 4, { team: 'b', face: Math.PI, pose: null }),
    pupil('R4', [23.3, 12.7], 6, { team: 'b', face: Math.PI, pose: null }),
    pupil('GB', [26.2, 8], 13, { team: 'b', gk: true, face: Math.PI, pose: null, look: { gloves: '#3a3a3a' } }),
  ]
  return base.map((a) => ({ ...a, ...(over[a.id] ?? {}) }))
}

export const CH09: ChapterScript = {
  no: 9,
  ball: 'mamiSigned',
  beats: [
    /* -------------------------------------------------------------- the sky falls to pieces */
    {
      kind: 'scene', id: 'ciel', place: snowy,
      cast: [
        { id: 'K', cast: 'kaydoudou', at: [20, 19.4], face: Math.PI / 2, look: PYJAMA },
        // still inside (he comes out later, in his new anorak)
        { id: 'B', cast: 'bribri', at: [14, 9.5], face: Math.PI / 2, look: ANORAK },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [9.5, 1.8, 27.5], look: [18.5, 1.6, 15], fov: 52 },
          do: [{ a: 'ball', at: [14, 7] }, { a: 'pose', id: 'K', pose: 'open' }],
          lines: [
            S('kaydoudou', "BriBri, viens vite ! Le ciel tombe en morceaux !"),
            N("BriBri ouvre les yeux. Deuxième matin en Amérique."),
            N("Et quel silence. À Douala, le jour commence toujours par un bruit : un benskin, le coq des voisins, la radio de Madame Ekotto. Ici, rien. Il écarte le rideau."),
            N("Le monde a disparu sous un drap blanc."),
          ],
        },
        {
          cam: { kind: 'on', who: 'K', dist: 2.3 },
          lines: [N("Kaydoudou est déjà dehors, au milieu de l'allée. En pyjama.")],
        },
        {
          cam: { kind: 'pose', pos: [21.1, 0.42, 20.5], look: [20, 0.18, 19.4], fov: 38 },
          lines: [N("En claquettes. Avec sa chaussette rouge et sa chaussette jaune. La tête renversée, la langue tirée vers le ciel.")],
        },
        {
          cam: { kind: 'on', who: 'K', dist: 2.6 },
          lines: [S('maman', "Kaydoudou !|En claquettes ? Tu vas geler jusqu'aux os ! Et mets un bonnet !")],
        },
        {
          cam: { kind: 'on', who: 'B', dist: 2.4 }, do: [{ a: 'pose', id: 'K', pose: null }],
          play: async (c) => { c.p('B').pos = { x: 14, y: 13.9 }; await c.move('B', [15.6, 16.6], 0.3); c.go('B', [19.1, 19.0], 0.32) },
          parallel: true,
          lines: [
            N("Trop tard. BriBri enfile son anorak rouge, tout neuf, qui fait un bruit de sac plastique. Frrt. Frrt."),
            N("Dehors, le ciel est bas et la lumière toute bleue. Le froid lui mord les oreilles. Pas une petite morsure polie. Une vraie, avec des dents."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [17.2, 1.2, 23.6], look: [21.2, 2.6, 21.0], fov: 46 },
          play: async (c) => { c.stop('B'); c.p('B').pos = { x: 19.1, y: 19.0 }; c.face('B', 'K'); c.face('K', [21.6, 21.2]) },
          lines: [N("Les flocons se posent sur le panier de basket, au bout de l'allée, dont le filet a gelé. Et sur la petite afro de Kaydoudou, où ils restent accrochés comme du coton.")],
        },
        {
          cam: { kind: 'on', who: ['K', 'B'], dist: 2.8 }, do: [{ a: 'pose', id: 'K', pose: 'point' }],
          play: async (c) => { c.face('K', [20, 15]) },
          lines: [S('kaydoudou', "Regarde ! Il y en a sur la voiture ! Sur le panier ! Sur moi !")],
        },
        {
          cam: { kind: 'on', who: ['K', 'B'], dist: 2.4 },
          play: async (c) => {
            c.face('K', 'B'); c.face('B', 'K')
            c.pose('K', 'kneel'); await c.wait(1.0); c.pose('K', 'mic'); await c.wait(1.4); c.pose('K', null)
          },
          parallel: true,
          lines: [
            N("Kaydoudou fourre une poignée de neige dans sa bouche. Il mâche, très sérieux."),
            S('bribri', "Alors ?"),
            S('kaydoudou', "Ça n'a aucun goût. C'est de la glace sans sucre."),
            N("Il en reprend une poignée."),
            S('kaydoudou', "Mais c'est gratuit !"),
            S('bribri', "On ne mange pas ce qui tombe du ciel, Kaydoudou. Il y a de la poussière dedans."),
            S('kaydoudou', "La poussière d'Amérique, elle est propre."),
          ],
        },
        {
          cam: { kind: 'on', who: 'B', dist: 1.7 },
          play: async (c) => { c.pose('B', 'mic'); await c.wait(2.2); c.pose('B', null) },
          parallel: true,
          lines: [
            N("BriBri prend une pincée du bout des doigts. Il la renifle, méfiant. Puis il goûte. La neige lui pique les dents, fond, devient de l'eau. Puis plus rien du tout."),
            T('bribri', "Comme tout, ici|. C'est froid, c'est nouveau, et ça fond avant que je comprenne."),
          ],
        },
        {
          cam: { kind: 'on', who: 'K', dist: 2.2 }, do: [{ a: 'pose', id: 'K', pose: 'open' }],
          lines: [S('kaydoudou', "Tu en veux encore ?|Il y en a pour toute la famille ! Et pour tout Bonamoussadi !")],
        },
        {
          cam: { kind: 'pose', pos: [17.6, 1.5, 17.2], look: [14, 1.5, 12.7], fov: 44 },
          do: [{ a: 'pose', id: 'K', pose: null }],
          play: async (c) => { c.spawn({ id: 'PA', cast: 'papa', at: [14, 12.75], face: Math.PI / 2 - 0.4, elev: 0.25, look: PAPA_HOME }) },
          lines: [N("Papa sort sur le perron, en chaussettes."), S('papa', "Les garçons, rentrez avant de devenir des glaçons !")],
        },
      ],
    },
    /* -------------------------------------------------------------- a house under the house */
    {
      kind: 'scene', id: 'cave', place: home,
      cast: [
        { id: 'K', cast: 'kaydoudou', at: [2.6, 4.4], face: 0, look: PYJAMA },
        { id: 'B', cast: 'bribri', at: [9.4, 6.0], face: -Math.PI / 2, pose: 'sit', look: B_SCHOOL },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [4.6, 1.5, 6.4], look: [2.4, 1.0, 2.6], fov: 58 },
          do: [{ a: 'ball', at: [0.6, 6.4] }],
          play: async (c) => { await c.wait(0.6); await c.move('K', [6.5, 3.2], 0.85); await c.move('K', [8.9, 5.0], 0.8); c.face('K', 'B'); c.face('B', 'K') },
          lines: [N("La maison de Waldorf est petite et beige. Le premier soir, Kaydoudou remonte du sous-sol en courant.")],
        },
        {
          cam: { kind: 'on', who: ['K', 'B'], dist: 2.4 }, do: [{ a: 'pose', id: 'K', pose: 'open' }],
          lines: [S('kaydoudou', "BriBri ! Viens voir ! Il y a une maison sous la maison ! Avec une machine à laver ! Et un gros chat en fer qui ronronne !")],
        },
        {
          cam: { kind: 'pose', pos: [2.6, 1.0, 3.0], look: [1.1, 0.6, 1.2], fov: 50 },
          lines: [S('bribri', "C'est une chaudière.")],
        },
        {
          cam: { kind: 'on', who: ['K', 'B'], dist: 2.4 }, do: [{ a: 'pose', id: 'K', pose: 'point' }],
          lines: [S('kaydoudou', "C'est un chat. Et il y a une lampe toute nue au bout d'un fil ! C'est une cave à trésors !")],
        },
        { cam: { kind: 'on', who: 'B', dist: 1.7 }, do: [{ a: 'pose', id: 'K', pose: null }], lines: [S('bribri', "C'est une cave.")] },
      ],
    },
    /* -------------------------------------------------------------- the neighbours */
    {
      kind: 'scene', id: 'voisins', place: noon,
      cast: [
        { id: 'K', cast: 'kaydoudou', at: [13.5, 13.9], face: Math.PI / 2, look: PYJAMA },
        { id: 'B', cast: 'bribri', at: [14.5, 13.8], face: Math.PI / 2, look: B_SCHOOL },
        { id: 'HW', cast: 'hayesMme', at: [13.8, 15.3], face: -Math.PI / 2, pose: 'hold', look: { coat: '#7a3a4a' } },
        { id: 'HM', cast: 'hayesM', at: [15.4, 15.7], face: -Math.PI / 2 - 0.3, pose: 'hold', look: { coat: '#5a4a3a' } },
        { id: 'DOG', cast: 'biscuit', at: [12.3, 16.2], face: 0.4, pose: 'lie' },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [18.4, 1.7, 20.2], look: [14, 0.9, 14.6], fov: 44 },
          do: [{ a: 'ball', at: [14, 7] }, { a: 'item', id: 'HW', kind: 'pie' }, { a: 'item', id: 'HM', kind: 'shovel' }],
          lines: [N("À midi, on sonne. Un vieux monsieur très grand avec une pelle, une vieille dame avec une tarte, et un chien aux oreilles immenses qui se roule dans la neige.")],
        },
        {
          cam: { kind: 'on', who: ['HW', 'K'], dist: 2.8 }, do: [{ a: 'pose', id: 'DOG', pose: null }],
          play: async (c) => { c.face('DOG', 'K') },
          lines: [
            S('hayesMme', "Welcome to the neighborhood !|I'm Mrs. Hayes. This is Mr. Hayes. And this little monster is Biscuit !"),
            S('kaydoudou', "Bis-kwit !|Comme un gâteau !"),
            S('hayesMme', "Exactly ! And Biscuit likes you. He never likes anybody !"),
          ],
        },
        { cam: { kind: 'on', who: 'DOG', dist: 1.8, height: 0.7 }, lines: [S('biscuit', "Wouf !")] },
        {
          cam: { kind: 'on', who: 'K', dist: 2.0 },
          play: async (c) => { await c.move('K', [13.6, 14.5], 0.25); c.face('K', 'HW') },
          lines: [N("Kaydoudou, toujours en pyjama, s'avance, très poli."), S('kaydoudou', "Thank you, madame. I am Kaydoudou. I like very much your snow. It is delicious.")],
        },
        {
          cam: { kind: 'on', who: 'HW', dist: 2.0 },
          lines: [N("Mrs. Hayes éclate d'un rire énorme."), S('hayesMme', "Delicious ? Oh, baby. Wait till you taste the pie ! It's sweet potato !")],
        },
        {
          cam: { kind: 'on', who: ['HM', 'B'], dist: 3.2 },
          play: async (c) => { c.face('B', 'HM'); c.face('K', 'HM'); await c.move('HM', [15.0, 17.4], 0.18) },
          parallel: true,
          lines: [
            N("Mr. Hayes, lui, parle peu. Il montre aux garçons comment pousser la neige avec la pelle, sans un geste de trop."),
            S('hayesM', "Slow|. Like this. Snow is heavy."),
            T('bribri', "Comme Tonton Fokou"),
          ],
        },
        {
          cam: { kind: 'on', who: 'K', dist: 2.6 },
          play: async (c) => {
            c.stop('HM'); c.item('HM', null); c.pose('HM', null)
            c.p('K').pos = { x: 14.4, y: 16.9 }; c.face('K', [14.4, 19]); c.item('K', 'shovel'); c.pose('K', 'hold')
            await c.wait(1.6)
            c.item('K', null); c.pose('K', 'slip'); await c.wait(0.9); c.pose('K', 'lie')
          },
          parallel: true,
          lines: [S('kaydoudou', "Moi aussi ! Moi aussi !"), N("Il prend la pelle, glisse, et tombe en arrière dans la neige.")],
        },
        {
          cam: { kind: 'on', who: 'K', dist: 1.9, height: 1.6 },
          lines: [S('kaydoudou', "Regardez ! Je suis un bonhomme de neige !")],
        },
        { cam: { kind: 'on', who: ['B', 'K'], dist: 2.8 }, play: async (c) => { c.face('B', 'K') }, lines: [S('bribri', "Un bonhomme de neige qui parle trop")] },
      ],
    },
    /* -------------------------------------------------------------- the yellow bus */
    {
      kind: 'scene', id: 'bus', place: busStop,
      cast: [
        { id: 'K', cast: 'kaydoudou', at: [11.6, 21.5], face: Math.PI / 2, look: K_SCHOOL },
        { id: 'B', cast: 'bribri', at: [12.5, 21.7], face: Math.PI / 2, look: B_SCHOOL },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [18.5, 1.6, 17.2], look: [10.5, 1.4, 24.2], fov: 50 },
          do: [{ a: 'ball', at: [14, 7] }],
          lines: [N("Lundi, un vrai bus scolaire jaune s'arrête devant la maison.")],
        },
        {
          cam: { kind: 'pose', pos: [13.0, 1.3, 18.7], look: [11.9, 1.15, 21.9], fov: 46 }, do: [{ a: 'pose', id: 'K', pose: 'point' }],
          play: async (c) => { c.face('K', [9.2, 23.2]) },
          lines: [S('kaydoudou', "BriBri ! C'est le bus des films ! Tu crois qu'il vole ?")],
        },
        {
          cam: { kind: 'pose', pos: [16.5, 1.5, 19.5], look: [9.5, 1.3, 23], fov: 46 }, do: [{ a: 'pose', id: 'K', pose: null }],
          play: async (c) => { c.face('B', 'K'); await c.wait(1.6); c.go('K', [9.1, 22.3], 0.4); await c.wait(0.5); c.go('B', [9.9, 22.2], 0.35) },
          parallel: true,
          lines: [S('bribri', "C'est un bus, Kaydoudou.")],
        },
      ],
    },
    /* -------------------------------------------------------------- a word in five */
    {
      kind: 'scene', id: 'classe', place: school,
      cast: [
        { id: 'MT', cast: 'maitresse', at: [5.4, 1.5], face: Math.PI / 2 },
        { id: 'B', cast: 'bribri', at: [4.6, 3.6], face: -Math.PI / 2, pose: 'sit', look: B_SCHOOL },
        ...SEATS.map((at, i) => pupil(`P${i}`, at, i)),
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [8.1, 1.9, 1.0], look: [4.0, 0.8, 4.8], fov: 52 },
          do: [{ a: 'ball', at: [8.6, 0.5] }],
          lines: [N("Au Cameroun, BriBri avait de bonnes notes en anglais. Un anglais lent, écrit à la craie. Celui de Waldorf roule à toute vitesse et avale la moitié des mots.")],
        },
        { cam: { kind: 'on', who: 'MT', dist: 2.2 }, lines: [S('anon', "Sobribriwhereyoufromandwhatdoyouliketodoonweekends ?")] },
        {
          cam: { kind: 'pose', pos: [4.9, 1.75, 0.9], look: [4.4, 0.85, 5.0], fov: 56 },
          play: async (c) => { for (let i = 0; i < SEATS.length; i++) c.look(`P${i}`, 'B') },
          lines: [N("Vingt-cinq visages se tournent vers lui. BriBri a compris un mot sur cinq. La chaleur lui monte au cou, aux joues, aux oreilles. Au moins, elles n'ont plus froid.")],
        },
        {
          cam: { kind: 'pose', pos: [4.95, 1.05, 2.45], look: [4.6, 0.92, 3.6], fov: 40 },
          lines: [S('bribri', "Sorry."), N("C'est tout ce qui sort.")],
        },
        { cam: { kind: 'on', who: 'MT', dist: 2.2 }, lines: [S('anon', "That's okay, sweetie. Take your time.")] },
        {
          cam: { kind: 'pose', pos: [4.95, 1.05, 2.45], look: [4.6, 0.92, 3.6], fov: 34 },
          play: async (c) => { for (let i = 0; i < SEATS.length; i++) c.look(`P${i}`, null) },
          lines: [T('bribri', "À Bonamoussadi, je lève toujours la main le premier. Ici, je ne suis personne.")],
        },
      ],
    },
    /* -------------------------------------------------------------- Mrs. Patterson's room */
    {
      kind: 'scene', id: 'patterson', place: school,
      cast: [
        { id: 'MP', cast: 'patterson', at: [4.6, 1.5], face: Math.PI / 2 },
        { id: 'K', cast: 'kaydoudou', at: [3.0, 3.6], face: -Math.PI / 2, pose: 'sit', look: K_SCHOOL },
        { id: 'B', cast: 'bribri', at: [4.6, 3.6], face: -Math.PI / 2, pose: 'sit', look: B_SCHOOL },
        { id: 'CO', cast: 'coreenne', at: [6.2, 3.6], face: -Math.PI / 2, pose: 'sit' },
        { id: 'GU', cast: 'guatemala', at: [6.2, 5.2], face: -Math.PI / 2, pose: 'sit' },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [8.2, 1.85, 7.3], look: [4.2, 1.0, 1.6], fov: 50 },
          do: [{ a: 'ball', at: [8.6, 0.5] }, { a: 'cue', name: 'clean' }],
          lines: [N("L'après-midi, les frères vont dans la petite salle de Mrs. Patterson, la prof d'anglais des élèves venus d'ailleurs. Il y a une fille arrivée de Corée et un garçon du Guatemala. Et Mrs. Patterson : des lunettes rouges au bout d'une chaînette, un gilet aux poches pleines de feutres, et une voix qui prend son temps.")],
        },
        { cam: { kind: 'on', who: 'MP', dist: 2.0 }, lines: [S('patterson', "Today, you will tell us about your family.")] },
        {
          cam: { kind: 'pose', pos: [3.6, 1.45, 1.6], look: [3.0, 1.0, 3.6], fov: 46 }, do: [{ a: 'pose', id: 'K', pose: 'sitHand' }],
          lines: [
            N("Kaydoudou lève la main si vite qu'il manque de se décrocher l'épaule."),
            S('kaydoudou', "My name is Kaydoudou. I am ten. I am from Cameroon. I have one brother, he is very serious. And in my house, my mother cooks in the chicken."),
          ],
        },
        {
          cam: { kind: 'on', who: 'MP', dist: 1.9 }, do: [{ a: 'pose', id: 'K', pose: 'sit' }],
          lines: [N("Mrs. Patterson penche la tête."), S('patterson', "In the... chicken ?")],
        },
        {
          cam: { kind: 'pose', pos: [3.6, 1.45, 1.6], look: [3.0, 1.0, 3.6], fov: 46 },
          lines: [S('kaydoudou', "Yes|. Every day. Big chicken.")],
        },
        {
          cam: { kind: 'pose', pos: [5.5, 1.5, 1.4], look: [6.0, 0.95, 4.6], fov: 52 },
          do: [{ a: 'pose', id: 'GU', pose: 'laugh' }],
          lines: [S('guatemala', "Me, first day, I say “I am a pineapple”")],
        },
        {
          cam: { kind: 'pose', pos: [5.3, 1.55, 1.2], look: [4.2, 0.95, 4.2], fov: 58 },
          play: async (c) => {
            await c.wait(2.2)
            c.p('K').pos = { x: 2.3, y: 3.4 }; c.pose('K', 'laugh'); c.face('K', 'MP')
            await c.wait(2.4); c.pose('K', 'open')
          },
          parallel: true,
          lines: [N("La fille de Corée se cache derrière sa main. Le garçon du Guatemala manque de tomber de sa chaise. Et Kaydoudou ? Il ne devient pas rouge. Il rit plus fort que tout le monde, puis il salue, comme un artiste à la fin du spectacle.")],
        },
        {
          cam: { kind: 'pose', pos: [6.6, 1.6, 4.2], look: [4.4, 1.4, 0.3], fov: 50 },
          do: [{ a: 'pose', id: 'K', pose: null }, { a: 'pose', id: 'GU', pose: null }],
          play: async (c) => {
            c.p('K').pos = { x: 3.0, y: 3.6 }; c.face('K', -Math.PI / 2); c.pose('K', 'sit')
            await c.move('MP', [3.85, 0.95], 0.3); c.face('MP', -Math.PI / 2); c.pose('MP', 'point')
            await c.wait(1.2); c.cue('pot'); await c.wait(1.0)
            c.pose('MP', null); await c.move('MP', [5.25, 0.95], 0.3); c.face('MP', -Math.PI / 2); c.pose('MP', 'point')
            await c.wait(1.2); c.cue('chicken')
          },
          lines: [N("Au tableau, Mrs. Patterson dessine une casserole, puis une poule aux plumes en bataille.")],
        },
        {
          cam: { kind: 'pose', pos: [6.4, 1.55, 3.4], look: [4.4, 1.35, 0.4], fov: 48 },
          play: async (c) => {
            c.pose('MP', null); c.p('MP').pos = { x: 4.5, y: 1.15 }; c.face('MP', [4.5, 4]); c.pose('MP', 'point'); c.face('MP', [3.8, 0])
            await c.wait(1.6); c.face('MP', [5.3, 0])
          },
          parallel: true,
          lines: [S('patterson', "Kitchen"), S('patterson', "Chicken")],
        },
        {
          cam: { kind: 'pose', pos: [3.6, 1.45, 1.6], look: [3.0, 1.0, 3.6], fov: 46 }, do: [{ a: 'pose', id: 'MP', pose: null }],
          lines: [S('kaydoudou', "Ahhh ! My mother cooks the chicken in the kitchen !")],
        },
        {
          cam: { kind: 'pose', pos: [5.3, 1.55, 1.2], look: [4.2, 0.95, 4.2], fov: 58 },
          play: async (c) => {
            c.p('MP').pos = { x: 4.6, y: 1.6 }; c.face('MP', 'K')
            c.pose('CO', 'laugh'); c.pose('GU', 'laugh'); await c.wait(1.8); c.pose('CO', 'sit'); c.pose('GU', 'sit')
            c.face('MP', 'B')
          },
          lines: [N("Toute la classe applaudit. Mrs. Patterson se tourne vers BriBri.")],
        },
        { cam: { kind: 'on', who: 'MP', dist: 1.9 }, lines: [S('patterson', "And you, BriBri ?")] },
        { cam: { kind: 'pose', pos: [4.95, 1.05, 2.45], look: [4.6, 0.92, 3.6], fov: 40 }, lines: [N("Il secoue la tête.")] },
        { cam: { kind: 'on', who: 'MP', dist: 1.9 }, lines: [S('patterson', "Next time, then.")] },
        {
          cam: { kind: 'pose', pos: [4.2, 1.2, 2.3], look: [3.6, 0.95, 3.6], fov: 44 },
          play: async (c) => { c.look('B', 'K') },
          lines: [N("BriBri regarde son petit frère. Un peu émerveillé. Un peu jaloux. Kaydoudou tombe, se relève, et le monde rit avec lui. BriBri, lui, a si peur de tomber qu'il ne bouge plus du tout.")],
        },
      ],
    },
    /* -------------------------------------------------------------- the little card (played) */
    {
      kind: 'play', id: 'merci', place: school, prompt: 'play.merciIntro', keep: true, cast: [],
      challenge: {
        type: 'ritual',
        steps: [
          {
            key: 'merci',
            act: async (c) => {
              c.look('B', null)
              c.cam({ kind: 'pose', pos: [5.6, 1.5, 2.2], look: [4.6, 0.8, 3.4], fov: 44 })
              c.p('MP').pos = { x: 4.65, y: 2.45 }; c.face('MP', 'B'); c.pose('MP', 'hold')
              c.item('B', 'card'); c.pose('B', 'sitHold')
              await c.say([N("À la fin du cours, Mrs. Patterson pose devant lui un petit carton. Dessus, elle a écrit « snow », avec un flocon.")])
              c.pose('MP', null)
              c.cam({ kind: 'on', who: 'MP', dist: 1.7 })
              await c.say([S('patterson', "Words are like snow|. One, then another one. And one morning, everything is white.")])
              c.cam({ kind: 'pose', pos: [4.95, 1.05, 2.45], look: [4.6, 0.85, 3.5], fov: 38 })
              await c.say([
                N("BriBri comprend presque tout. Les mots, c'est comme la neige : un flocon, puis un autre. Et un matin, tout est blanc."),
                S('bribri', "Thank you"), N("Tout bas. Mais il le dit."),
              ])
              c.cam({ kind: 'on', who: 'MP', dist: 1.7 })
              await c.say([S('patterson', "You're welcome... Bri-Bri.")])
              c.cam({ kind: 'pose', pos: [4.95, 1.05, 2.45], look: [4.6, 0.85, 3.5], fov: 34 })
              await c.say([N("Elle a dit son nom. Exactement comme il faut.")])
            },
          },
        ],
      },
    },
    /* -------------------------------------------------------------- the bus home */
    {
      kind: 'scene', id: 'retour', place: bus,
      cast: [
        { id: 'K', cast: 'kaydoudou', at: [1.9, 0.47], face: Math.PI, pose: 'sit', look: K_SCHOOL },
        { id: 'B', cast: 'bribri', at: [1.9, 0.95], face: Math.PI, pose: 'sit', look: B_SCHOOL },
        pupil('Q1', [2.75, 0.5], 2, { face: Math.PI }), pupil('Q2', [2.75, 1.65], 5, { face: Math.PI }),
        pupil('Q3', [3.6, 2.1], 9, { face: Math.PI }), pupil('Q4', [4.45, 0.95], 12, { face: Math.PI }),
        pupil('Q5', [5.3, 1.65], 0, { face: Math.PI }), pupil('Q6', [1.9, 2.1], 7, { face: Math.PI }),
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [0.75, 1.3, 1.25], look: [2.2, 0.9, 0.75], fov: 56 },
          do: [{ a: 'ball', at: [8.7, 1.9] }],
          play: async (c) => {
            const k = c.p('K')
            for (let i = 0; i < 26; i++) { k.meta.elev = 0.07 * Math.abs(Math.sin(i * 0.9)); await c.wait(0.13) }
            k.meta.elev = 0
          },
          parallel: true,
          lines: [
            N("Dans le bus du retour, Kaydoudou rebondit sur son siège."),
            S('kaydoudou', "Tu as vu ? Ils ont rigolé AVEC moi !"),
            S('bribri', "Tu as dit que Maman cuisine dans une poule."),
            S('kaydoudou', "Oui. Et maintenant, tout le monde me connaît !"),
          ],
        },
        {
          cam: { kind: 'pose', pos: [1.0, 1.15, 1.2], look: [1.75, 0.75, 0.95], fov: 40 },
          do: [{ a: 'item', id: 'B', kind: 'card' }, { a: 'pose', id: 'B', pose: 'sitHold' }],
          lines: [N("BriBri garde le carton toute la semaine.")],
        },
      ],
    },
    /* -------------------------------------------------------------- the goals wear a hat */
    {
      kind: 'scene', id: 'chapeaux', place: field,
      cast: [
        { id: 'K', cast: 'kaydoudou', at: [27.6, 19.6], face: [35, 14], look: { ...K_SCHOOL, coat: '#e2a22a' } },
        { id: 'B', cast: 'bribri', at: [28.6, 20.2], face: [35, 14], look: ANORAK },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [25.2, 1.6, 23.4], look: [35, 0.7, 14], fov: 50 },
          do: [{ a: 'ball', at: [9, 14] }],
          lines: [N("Derrière l'école, les terrains de football ont disparu. On voit seulement le haut des buts.")],
        },
        { cam: { kind: 'on', who: 'K', dist: 2.0 }, do: [{ a: 'pose', id: 'K', pose: 'dejected' }], lines: [S('kaydoudou', "Les buts ont mis un chapeau blanc")] },
      ],
    },
    /* -------------------------------------------------------------- the basement, every evening */
    {
      kind: 'scene', id: 'jongles', place: home,
      cast: [
        { id: 'K', cast: 'kaydoudou', at: [2.2, 3.5], face: 0, look: K_SCHOOL },
        { id: 'B', cast: 'bribri', at: [4.2, 3.5], face: Math.PI, look: B_SCHOOL },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [3.2, 1.3, 6.3], look: [3.2, 1.25, 3.0], fov: 56 },
          play: async (c) => {
            const foot = (id: string): [number, number, number] => { const p = c.p(id); return [p.pos.x + Math.cos(p.facing) * 0.35, p.pos.y + Math.sin(p.facing) * 0.35, 0.45] }
            for (let i = 0; i < 4; i++) {
              const [a, b] = i % 2 ? ['B', 'K'] : ['K', 'B']
              c.pose(a, 'juggle'); c.sfx('touch')
              if (i === 1) c.cue('swing')
              await c.arc(foot(a), foot(b), 1.62, 1.05)
              c.pose(a, null)
            }
          },
          parallel: true,
          lines: [N("Alors, chaque soir, les frères jonglent au sous-sol avec le ballon de Mami. Quand le ballon frôle l'ampoule, elle se balance, et leurs ombres dansent sur les murs.")],
        },
        {
          cam: { kind: 'pose', pos: [3.2, 1.3, 6.3], look: [3.2, 1.3, 3.0], fov: 60 },
          play: async (c) => {
            const foot = (id: string): [number, number, number] => { const p = c.p(id); return [p.pos.x + Math.cos(p.facing) * 0.35, p.pos.y + Math.sin(p.facing) * 0.35, 0.45] }
            c.pose('K', 'juggle'); c.sfx('touch')
            const a = c.arc(foot('K'), foot('B'), 1.6, 1.0)
            await c.say([S('anon', "Six ! Sept !")]); await a
            c.sfx('touch'); await c.arc(foot('B'), [3.4, 5.2, 2.0], 0.5, 0.45); c.sfx('post')
            await c.arc([3.4, 5.2, 2.0], [3.6, 4.6, 0.11], 0.1, 0.5); c.place([3.6, 4.6])
            await c.say([N("Bong, un tuyau."), S('anon', "Recommence !")])
            c.give('K'); c.pose('K', 'juggle'); c.sfx('touch')
            await c.arc(foot('K'), foot('B'), 1.6, 1.0)
            c.sfx('touch'); await c.arc(foot('B'), [3.0, 3.6, 2.25], 0.3, 0.4); c.sfx('tap')
            await c.arc([3.0, 3.6, 2.25], [3.1, 3.3, 0.11], 0.05, 0.55); c.place([3.1, 3.3])
            await c.say([S('anon', "Huit !"), N("Bang, le plafond."), S('maman', "Doucement, en bas !"), S('anon', "Pardon, Maman ! C'est le ballon !")])
          },
          lines: [],
        },
        {
          cam: { kind: 'on', who: 'B', dist: 1.8 },
          play: async (c) => { c.pose('K', null); c.p('B').pos = { x: 3.7, y: 3.5 }; c.face('B', 'K'); c.carry('B') },
          lines: [N("Un soir, BriBri garde le ballon contre lui.")],
        },
        {
          cam: { kind: 'pose', pos: [3.0, 1.12, 3.95], look: [3.45, 0.93, 3.5], fov: 30 },
          lines: [N("Le carré de pagne a un peu pâli. Il y a les signatures : Ousmane, Mireille, Tonton Fokou. Et tout au fond des coutures, un peu de poussière rouge.")],
        },
        {
          cam: { kind: 'on', who: ['K', 'B'], dist: 2.2 },
          lines: [S('kaydoudou', "Tu fais quoi ?|Tu lui parles ?"), S('bribri', "Je le sens. Ça sent encore Bonamoussadi.")],
        },
        {
          cam: { kind: 'on', who: ['K', 'B'], dist: 1.9 },
          play: async (c) => { await c.move('K', [3.05, 3.55], 0.25); c.face('K', 'B') },
          lines: [
            N("Kaydoudou vient renifler."),
            S('kaydoudou', "Ça sent le manguier ! Et un peu les pieds de Radio."),
            S('bribri', "Là-bas, c'est déjà la nuit. Ousmane dort."),
            S('anon', "Ou il joue sous les lampadaires."),
            S('anon', "Sans nous."),
          ],
        },
        {
          cam: { kind: 'on', who: 'B', dist: 1.7 },
          play: async (c) => { c.p('K').pos = { x: 2.2, y: 3.5 }; c.face('K', 'B'); c.p('B').pos = { x: 4.2, y: 3.5 }; c.face('B', 'K') },
          lines: [N("BriBri ne répond pas. Il relance le ballon. Et cette fois, ils font les dix passes sans qu'il touche le sol.")],
        },
      ],
    },
    {
      kind: 'play', id: 'dixPasses', place: home, prompt: 'play.basementIntro', keep: true, cast: [],
      challenge: { type: 'juggle', players: ['B', 'K'], count: 10, ball: 'B', cam: { kind: 'pose', pos: [3.2, 1.25, 6.2], look: [3.2, 1.05, 3.2], fov: 58 } },
    },
    {
      kind: 'scene', id: 'dix', place: home, keep: true, cast: [],
      shots: [
        {
          cam: { kind: 'on', who: 'K', dist: 2.0 }, do: [{ a: 'pose', id: 'K', pose: 'celebrate' }, { a: 'cue', name: 'swing' }],
          lines: [S('kaydoudou', "DIX !|Ousmane, tu as entendu ? DIX !")],
        },
      ],
    },
    /* -------------------------------------------------------------- Papa found football */
    {
      kind: 'scene', id: 'futsal', place: home,
      cast: [
        { id: 'K', cast: 'kaydoudou', at: [11.15, 3.2], face: 0, pose: 'sit', look: K_SCHOOL },
        { id: 'B', cast: 'bribri', at: [12.0, 4.05], face: -Math.PI / 2, pose: 'sit', look: B_SCHOOL },
        { id: 'MA', cast: 'maman', at: [10.2, 1.1], face: [12, 3.2], look: MAMAN_HOME },
        { id: 'PA', cast: 'papa', at: [13.3, 5.6], face: Math.PI, look: PAPA_COAT },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [9.0, 1.6, 5.9], look: [12.6, 1.1, 3.6], fov: 54 },
          do: [{ a: 'ball', at: [0.6, 6.4] }],
          play: async (c) => { await c.move('PA', [12.8, 4.9], 0.3); c.face('PA', 'K') },
          lines: [N("Un soir, Papa rentre avec de la neige sur les épaules."), S('papa', "Les garçons ! J'ai trouvé du football !")],
        },
        { cam: { kind: 'pose', pos: [13.1, 1.35, 2.3], look: [11.6, 0.95, 3.6], fov: 48 }, lines: [S('anon', "Où ? Tout est blanc !")] },
        { cam: { kind: 'pose', pos: [11.3, 1.45, 3.7], look: [12.8, 1.45, 4.9], fov: 42 }, lines: [S('papa', "Dans un gymnase. Le centre communautaire fait du futsal, tous les samedis matin.")] },
        { cam: { kind: 'pose', pos: [12.35, 1.1, 2.75], look: [11.15, 0.95, 3.2], fov: 40 }, lines: [S('kaydoudou', "Du fut-quoi ?")] },
        { cam: { kind: 'pose', pos: [11.3, 1.45, 3.7], look: [12.8, 1.45, 4.9], fov: 42 }, lines: [S('papa', "Du futsal. Du football en salle. Cinq contre cinq, avec les gardiens.")] },
        {
          cam: { kind: 'pose', pos: [13.3, 1.65, 1.2], look: [11.4, 1.25, 3.2], fov: 56 },
          lines: [S('maman', "Et il fait chaud, dans ce gymnase ?"), S('papa', "Plus chaud que dehors. Ce n'est pas difficile.")],
        },
      ],
    },
    /* -------------------------------------------------------------- Saturday: the gym */
    {
      kind: 'scene', id: 'gymnase', place: gym,
      cast: court({
        B: { at: [10.2, 14.1], face: -Math.PI / 2 }, K: { at: [11.0, 14.3], face: -Math.PI / 2, carry: true, look: FUTSAL_SHOES },
        D: { at: [14.5, 11.0], face: Math.PI }, TG: { at: [15, 6], face: 0 }, R2: { at: [17, 9] }, R3: { at: [12, 7] }, R4: { at: [19, 5] },
        A4: { at: [7, 6] }, AN: { at: [16.5, 14.6], face: Math.PI },
      }),
      shots: [
        {
          cam: { kind: 'pose', pos: [14.5, 1.7, 9.0], look: [9.6, 1.0, 15.0], fov: 52 },
          do: [{ a: 'ballLook', look: 'futsal' }],
          lines: [N("Samedi. Le gymnase sent la cire et le chocolat chaud. Sur le banc, Papa ôte son bonnet."), S('papa', "Je reste là. Montrez-leur Bonamoussadi !")],
        },
        {
          cam: { kind: 'on', who: 'K', dist: 2.0 },
          play: async (c) => { await c.wait(1.2); c.release(); c.sfx('tap'); await c.wait(1.0); c.pose('K', null) },
          parallel: true,
          lines: [N("Le ballon est petit et lourd. Kaydoudou le lâche. Ploc. Il ne rebondit presque pas."), S('kaydoudou', "Il est mort, ce ballon !")],
        },
        {
          cam: { kind: 'on', who: ['D', 'K'], dist: 3.0 },
          play: async (c) => { await c.move('D', [11.8, 13.0], 0.6); c.face('D', 'K'); c.face('K', 'D'); c.face('B', 'D') },
          lines: [S('diego', "Nah, man, he's just sleepy !")],
        },
        {
          cam: { kind: 'on', who: 'D', dist: 1.8 },
          lines: [N("C'est un garçon petit et vif, cheveux noirs dressés sur la tête, avec des yeux qui bougent autant que sa bouche."), S('diego', "You guys new ? Where you from ?")],
        },
        { cam: { kind: 'on', who: ['B', 'D'], dist: 2.6 }, lines: [S('bribri', "Cameroon"), S('diego', "Cameroon ? Like, Africa Cameroon ? That's sick !")] },
        {
          cam: { kind: 'on', who: 'K', dist: 2.0 },
          play: async (c) => { await c.move('K', [11.2, 14.9], 0.2); c.face('K', 'D') },
          lines: [N("Kaydoudou recule d'un pas, inquiet."), S('kaydoudou', "No, no. We are not sick. We are very good.")],
        },
        {
          cam: { kind: 'on', who: 'D', dist: 2.2 },
          play: async (c) => { c.pose('D', 'laugh'); await c.wait(1.6); c.pose('D', 'sitGround') },
          parallel: true,
          lines: [N("Le garçon rit si fort qu'il doit s'asseoir par terre. Puis il parle, avec l'anglais, l'espagnol et ses deux mains.")],
        },
        {
          cam: { kind: 'on', who: 'D', dist: 1.9 }, do: [{ a: 'pose', id: 'D', pose: 'talk' }],
          lines: [S('diego', "I'm Diego. Diego Ramírez. Eleven. My parents, El Salvador. Me, right here ! “Sick”, ici, ça veut dire génial ! Et “bro”, c'est mon frère. “My bad”, c'est ma faute. “No way”, c'est impossible !")],
        },
        {
          cam: { kind: 'on', who: ['K', 'D'], dist: 2.6 }, do: [{ a: 'pose', id: 'D', pose: null }, { a: 'pose', id: 'K', pose: 'point' }],
          lines: [S('kaydoudou', "Diego,|tu es nommé traducteur officiel de la famille.")],
        },
        {
          cam: { kind: 'on', who: 'D', dist: 2.0 }, do: [{ a: 'pose', id: 'K', pose: null }, { a: 'pose', id: 'D', pose: 'open' }],
          lines: [S('diego', "Deal, bro ! You guys, with me ! Team Diego !")],
        },
        {
          cam: { kind: 'on', who: 'AN', dist: 2.4 }, do: [{ a: 'pose', id: 'D', pose: null }, { a: 'pose', id: 'AN', pose: 'wave' }],
          lines: [S('animateur', "Okay, guys !|Five against five ! Let's go !")],
        },
      ],
    },
    /* -------------------------------------------------------------- eaten, twice */
    {
      kind: 'scene', id: 'avaler', place: gym, cast: court(),
      shots: [
        {
          cam: GYM_WIDE, do: [{ a: 'ballLook', look: 'futsal' }, { a: 'ball', at: 'GA' }, { a: 'sfx', kind: 'whistle' }],
          play: async (c) => {
            await c.pass('GA', 'B')
            c.look('B', [16, 4])
            c.go('TG', [c.p('B').pos.x + 0.6, c.p('B').pos.y + 0.3], 0.95)
            await c.until(() => Math.hypot(c.p('TG').pos.x - c.p('B').pos.x, c.p('TG').pos.y - c.p('B').pos.y) < 1.0, 4).catch(() => {})
            c.stop('TG'); c.give('TG'); c.look('B', null)
            c.go('TG', [4.5, 10.5], 0.7)
          },
          lines: [N("Premier ballon. BriBri fait comme sur la terre rouge : il contrôle, il lève la tête, il cherche. Trop tard. Un garçon en tee-shirt gris lui a déjà pris le ballon.")],
        },
        {
          cam: { kind: 'on', who: ['TG', 'B'], dist: 3.4 },
          play: async (c) => { c.stop('TG'); c.face('TG', 'B') },
          lines: [S('teeGris', "Too slow, man !")],
        },
        { cam: { kind: 'on', who: ['D', 'B'], dist: 3.0 }, play: async (c) => { c.p('D').pos = { x: 9.6, y: 7.6 }; c.face('D', 'B'); c.face('B', 'D') }, lines: [S('diego', "It's okay, bro|. First time, everybody gets eaten.")] },
        {
          cam: GYM_WIDE,
          play: async (c) => {
            c.p('TG').pos = { x: 11.2, y: 10.3 }; c.p('D').pos = { x: 14, y: 3.7 }; c.p('B').pos = { x: 8.3, y: 8.8 }; c.face('B', 0)
            c.give('GA'); await c.wait(0.4)
            await c.pass('GA', 'B')
            c.go('TG', [c.p('B').pos.x + 0.6, c.p('B').pos.y + 0.3], 0.95)
            await c.until(() => Math.hypot(c.p('TG').pos.x - c.p('B').pos.x, c.p('TG').pos.y - c.p('B').pos.y) < 1.0, 4).catch(() => {})
            c.stop('TG'); c.give('TG')
            c.go('TG', [5, 11], 0.7)
          },
          lines: [N("Deuxième ballon. Pareil.")],
        },
        {
          cam: { kind: 'on', who: 'D', dist: 2.4 }, do: [{ a: 'pose', id: 'D', pose: 'open' }],
          play: async (c) => { c.stop('TG'); c.face('D', 'B') },
          lines: [S('diego', "Bro !|Pense vite ! Ici, il n'y a pas de temps !")],
        },
        {
          cam: { kind: 'on', who: 'B', dist: 1.6 }, do: [{ a: 'pose', id: 'D', pose: null }],
          lines: [T('bribri', "Pas vite|. Avant. Je pense avant.")],
        },
      ],
    },
    /* -------------------------------------------------------------- the third ball: one touch (played, canon) */
    {
      kind: 'play', id: 'uneTouche', place: gym, prompt: 'play.futsalIntro', keep: true, cast: [],
      challenge: {
        type: 'oneTouch', player: 'B', to: 'D', lead: 0.4,
        lines: [T('bribri', "Diego. À gauche.")],
        setup: async (c) => {
          const at: Record<string, Pt> = { GA: [1.8, 8], A4: [4.3, 4.1], B: [8.3, 8.8], D: [14, 3.7], K: [20.5, 10.7], TG: [12.5, 11.6], R2: [15.2, 8.4], R3: [19.3, 5.3], R4: [23.3, 12.7], GB: [26.2, 8] }
          for (const [id, p] of Object.entries(at)) { c.stop(id); c.p(id).pos = { x: p[0], y: p[1] } }
          for (const id of ['A4', 'B', 'D', 'K']) c.face(id, 0)
          for (const id of ['TG', 'R2', 'R3', 'R4']) c.face(id, Math.PI)
          c.give('GA')
          c.cam({ kind: 'over', who: 'B', to: [14, 3.7], dist: 4.2, height: 2.8, mix: 0.45 })
          await c.say([N("Troisième ballon.")])
          c.slow(0.3)
          const roll = c.pass('GA', 'B')
          c.go('TG', [9.4, 9.6], 0.9); c.go('D', [15.2, 3.4], 0.5); c.go('K', [21.2, 10.2], 0.5)
          await c.say([N("Tout ralentit. Le ballon roule vers lui sur le parquet. Le tee-shirt gris fonce. BriBri ne regarde pas le ballon. Il pense.")])
          await roll.catch(() => {})
          c.slow(1)
        },
        after: async (c) => {
          c.cam({ kind: 'pose', pos: [18.5, 4.4, 15.4], look: [21, 0.5, 7.5], fov: 56 })
          const play = (async () => {
            c.stop('TG'); c.stop('K')
            await c.pass('D', 'K', { oneTouch: true })
            c.p('GB').pos = { x: 26.3, y: 8.1 }; c.face('GB', 'K')
            await c.shot('K', [27.4, 7.85], { height: 0.04, speed: 12 })
          })()
          await c.say([N("Le ballon touche son pied et repart aussitôt. Une seule touche."), N("Diego le remet à Kaydoudou. Kaydoudou frappe entre les jambes du gardien. Le filet fait « chhh ».")])
          await play.catch(() => {})
          await c.say([N("Un but en deux passes. Deux secondes, peut-être trois.")])
          c.cam({ kind: 'on', who: 'D', dist: 2.4 }); c.pose('D', 'celebrate')
          await c.say([S('diego', "BRO !|One touch ! ONE TOUCH !")])
          c.pose('D', null)
          c.cam({ kind: 'on', who: 'K', dist: 2.2 }); c.face('K', 'B'); c.pose('K', 'open')
          await c.say([S('kaydoudou', "Deux passes, BriBri !|Comme le une-deux du Njangi, en tout petit !")])
          c.pose('K', null)
          const b = c.p('B').pos
          c.p('D').pos = { x: b.x + 1.2, y: b.y - 0.5 }; c.face('D', 'B'); c.face('B', 'D')
          c.cam({ kind: 'on', who: ['B', 'D'], dist: 2.6 })
          await c.say([
            S('bribri', "En tout petit, et en très vite"),
            N("Puis il se tourne vers Diego."),
            S('bribri', "Pas vite, Diego. Avant."),
            S('diego', "Before ? Okay, before ! Same thing !"),
          ])
          c.p('D').pos = { x: 14, y: 3.5 }
          c.face('B', 0)
          c.cam({ kind: 'pose', pos: [b.x + 1.6, 1.25, b.y - 1.1], look: [b.x, 1.15, b.y], fov: 40 })
          await c.say([
            N("BriBri reste immobile au milieu du parquet. Pour la première fois depuis l'avion, quelque chose se remet à sa place dans sa poitrine. Au futsal, la décision doit arriver avant le ballon."),
            N("Et ça, penser avant, il sait le faire."),
          ])
          // the next ball: Kaydoudou on the left of the court, three of them between him and the goal
          const next: Record<string, Pt> = { K: [7, 8], TG: [11, 8.4], R2: [15, 7.6], R3: [19, 8.4], B: [5, 4], D: [8, 12.8], A4: [3.8, 12], R4: [13, 13.6], GA: [1.8, 8], GB: [26.2, 8] }
          for (const [id, p] of Object.entries(next)) { c.stop(id); c.p(id).pos = { x: p[0], y: p[1] } }
          for (const id of ['TG', 'R2', 'R3']) c.face(id, Math.PI)
          c.face('K', 0); c.give('K')
        },
      },
    },
    /* -------------------------------------------------------------- the caramel sole (played) */
    {
      kind: 'play', id: 'caramel', place: gym, prompt: 'play.caramelIntro', keep: true, cast: [],
      challenge: {
        type: 'dribble', carrier: 'K', defenders: ['TG', 'R2', 'R3'], end: 'free', dir: 1,
        intro: [N("Kaydoudou, lui, découvre la semelle. Le ballon lourd colle sous son pied. À gauche, à droite, en arrière : les défenseurs ne savent plus où il va.")],
        calls: [
          S('kaydoudou', "Moi, je ne pense pas avant|. Je pense avec mes pieds. Ils sont plus rapides que ma tête !"),
          S('kaydoudou', "Il est vivant, finalement, ce ballon ! Regardez : la semelle caramel !"),
          S('diego', "The what ?"),
        ],
      },
    },
    {
      kind: 'scene', id: 'caramelFin', place: gym, keep: true, cast: [],
      shots: [
        {
          cam: { kind: 'on', who: 'K', dist: 2.4 },
          play: async (c) => { c.stop('K'); c.face('K', 'D') },
          lines: [S('kaydoudou', "La semelle CARAMEL ! Ça colle !")],
        },
        { cam: { kind: 'on', who: 'D', dist: 2.2 }, lines: [S('diego', "Okay, okay ! Caramel !")] },
        {
          cam: { kind: 'on', who: 'TG', dist: 2.0 }, do: [{ a: 'pose', id: 'TG', pose: 'shrug' }],
          play: async (c) => { c.stop('TG'); c.face('TG', 'K') },
          lines: [N("Le garçon au tee-shirt gris se gratte la tête."), S('teeGris', "How does he do that ?")],
        },
        {
          cam: { kind: 'on', who: ['D', 'TG'], dist: 3.0 }, do: [{ a: 'pose', id: 'TG', pose: null }],
          play: async (c) => { c.p('D').pos = { x: c.p('TG').pos.x - 1.3, y: c.p('TG').pos.y + 0.6 }; c.face('D', 'TG') },
          lines: [S('diego', "Caramel, man")],
        },
      ],
    },
    /* -------------------------------------------------------------- the fountain: the tryouts */
    {
      kind: 'scene', id: 'fontaine', place: gym,
      cast: [
        { id: 'B', cast: 'bribri', at: [0.5, 12.0], face: Math.PI, number: 8, look: FUTSAL_SHOES },
        { id: 'K', cast: 'kaydoudou', at: [1.2, 11.0], face: [0.4, 12], look: FUTSAL_SHOES },
        { id: 'D', cast: 'diego', at: [1.7, 12.8], face: [0.6, 11.8] },
        { id: 'PA', cast: 'papa', at: [2.8, 13.6], face: [0.8, 12], look: PAPA_COAT },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [6.2, 1.7, 9.4], look: [0.8, 1.0, 12.2], fov: 50 },
          do: [{ a: 'ballLook', look: 'futsal' }, { a: 'ball', at: [20, 4] }, { a: 'pose', id: 'B', pose: 'mic' }],
          lines: [N("Après la séance, ils boivent à la fontaine du couloir, les joues brûlantes. Derrière les vitres, la neige recommence à tomber.")],
        },
        {
          cam: { kind: 'on', who: ['D', 'B'], dist: 2.6 }, do: [{ a: 'pose', id: 'B', pose: null }],
          play: async (c) => { c.face('B', 'D') },
          lines: [
            S('diego', "You guys gotta try out for Potomac Valley"),
            S('anon', "Potomac quoi ?"),
            S('diego', "Potomac Valley Soccer Academy. Best club around here. The tryouts are in three weeks."),
            S('anon', "Tryouts ?"),
          ],
        },
        {
          cam: { kind: 'on', who: 'D', dist: 1.9 }, do: [{ a: 'pose', id: 'D', pose: 'point' }],
          lines: [N("Diego claque des doigts."), S('diego', "Like... selección ? They pick who's good.")],
        },
        {
          cam: { kind: 'on', who: ['K', 'PA'], dist: 2.8 }, do: [{ a: 'pose', id: 'D', pose: null }, { a: 'pose', id: 'K', pose: 'open' }],
          play: async (c) => { c.face('K', 'PA'); c.face('PA', 'K') },
          lines: [
            S('kaydoudou', "Une sélection !|Comme les Lions ! Papa, on peut y aller ? Dis oui ! Dis oui !"),
            S('papa', "On verra"),
            S('anon', "Ça veut dire oui !"),
          ],
        },
        {
          cam: { kind: 'on', who: ['B', 'D'], dist: 2.4 }, do: [{ a: 'pose', id: 'K', pose: null }],
          lines: [S('bribri', "Et ils prennent des nouveaux ?|Comme nous ?"), S('diego', "With that one touch, bro ? For sure. Maybe. I don't know !")],
        },
        {
          cam: { kind: 'pose', pos: [6.5, 1.5, 9.0], look: [9.5, 4.9, -1.0], fov: 54 },
          play: async (c) => { c.face('B', [6, -1]) },
          lines: [
            N("BriBri ne dit plus rien. Il regarde les flocons tomber sans bruit sur le parking."),
            N("Trois semaines. Vingt et un jours pour devenir assez bon. Dans un pays où même la neige ne fait pas de bruit."),
          ],
        },
      ],
    },
    { kind: 'lesson', no: 9 },
  ],
}
