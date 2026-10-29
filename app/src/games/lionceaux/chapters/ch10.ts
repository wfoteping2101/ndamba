// Chapitre 10, « Les tryouts » (POV Kaydoudou). Source: tome1/chapters/10-les-tryouts.md.
// Every line is the chapter's text; lines the book gives to nobody in particular are shown without a
// name. Played: the one against one with Tyler, waited for, the ball rolled aside, then through his
// legs (canon: the nutmeg, the small goal); the owl call to give BriBri back his breath; BriBri's first
// touch that goes somewhere, away from the defender (canon); Kaydoudou's run behind Tyler for the
// forty-metre pass (canon: the goal); fist against fist, hand on the heart, at the dinner table.
// The dome, the email (BriBri U12, Kaydoudou U11 playing up) and Marcus's count are cutscenes.
import type { Look } from '../../engine/sim/types'
import type { ChapterScript } from '../story/session'
import type { ActorSpec, Pt } from '../story/types'
import { N, S, T } from './helpers'

const parking = { id: 'parking' as const, mood: 'winter' as const, opts: { snow: true } }
const tryouts = { id: 'dome' as const, mood: 'dome' as const, opts: { crowd: true } }
const training = { id: 'dome' as const, mood: 'dome' as const, opts: {} }
const night = { id: 'waldorf' as const, mood: 'night' as const, opts: { snow: true } }
const home = { id: 'maisonUS' as const, mood: 'interiorNight' as const, opts: { night: true } }

const ORANGE = '#f26b1d', GREEN = '#2f8f4e'
const bib = (n?: number, color = ORANGE): Partial<Look> => ({ bib: color, bibNumber: n })
const COATS = {
  K: { coat: '#e2a22a', trousers: '#3f4f6b', shoes: 'trainers' } as Partial<Look>,
  B: { coat: '#c8302a', number: undefined, trousers: '#2f3a4a', shoes: 'trainers', boots: '#e6e0d4' } as Partial<Look>,
  PA: { jacket: '#6f97d6', coat: '#2f3a4a' } as Partial<Look>,
  MA: { coat: '#1f6b6b' } as Partial<Look>,
}

/** Children of the tryouts the book does not describe: other faces, a bib, shorts. */
const KIDS: [string, Look['hair'], string, boolean][] = [
  ['#e8c4a0', 'crop', '#5a3a22', false], ['#5B3A27', 'crop', '#17110c', false], ['#c99b78', 'long', '#17110c', true],
  ['#f0d2b8', 'crop', '#c9a060', false], ['#8a5a3c', 'afro', '#17110c', false], ['#d9b08c', 'ponytail', '#5a3a22', true],
  ['#a8714c', 'crop', '#17110c', false], ['#3f2a1e', 'twists', '#17110c', false], ['#e8c4a0', 'crop', '#7a4a2a', false],
  ['#f0d2b8', 'ponytail', '#c9a060', true], ['#6b4430', 'cornrows', '#17110c', false], ['#c99b78', 'crop', '#3a2a1e', false],
]
function kid(id: string, at: Pt, v: number, o: Partial<ActorSpec> = {}, color = ORANGE): ActorSpec {
  const [skin, hair, hairColor, girl] = KIDS[v % KIDS.length]
  const shirt = ['#e9e9e4', '#2f3a4a', '#6a8caf', '#c45a3a', '#3a3a3a'][v % 5]
  return {
    id, cast: 'kid', at, face: 0, ...o,
    look: { skin, hair, hairColor, girl, shirt, shirtTrim: shirt, shorts: ['#1d1d1d', '#2f3a4a', '#3a3a44'][v % 3], sockL: '#f2f2ee', sockR: '#f2f2ee', shoes: 'boots', boots: '#1b1714', height: 0.98 + ((v * 7) % 10) / 100, bib: color, ...(o.look ?? {}) },
  }
}

/* ------------------------------------------------------------------ the last game, nine against nine */
// Orange (Kaydoudou, BriBri, Diego) attack right; Tyler in the middle of the green defence.
function lastGame(over: Record<string, Partial<ActorSpec>> = {}): ActorSpec[] {
  const base: ActorSpec[] = [
    { id: 'W', cast: 'whitfield', at: [30, 41.2], face: -Math.PI / 2 },
    kid('O1', [4, 20], 0, { team: 'a', gk: true, look: { gloves: '#e6e0d4' } }),
    kid('O2', [14, 10], 1, { team: 'a' }), kid('O3', [14, 30], 3, { team: 'a' }), kid('O4', [12, 20], 4, { team: 'a' }),
    kid('O5', [19, 23], 6, { team: 'a' }),
    { id: 'B', cast: 'bribri', team: 'a', at: [26, 20], face: Math.PI, number: 8, look: bib(34) },
    { id: 'D', cast: 'diego', team: 'a', at: [33, 12], face: 0, look: bib(12) },
    { id: 'K', cast: 'kaydoudou', team: 'a', at: [34, 35.5], face: 0, look: bib(33) },
    kid('O6', [36, 22], 8, { team: 'a' }),
    { id: 'TY', cast: 'tyler', team: 'b', at: [44, 27], face: Math.PI, look: bib(undefined, GREEN) },
    kid('G1', [60.5, 20], 2, { team: 'b', gk: true, face: Math.PI, look: { gloves: '#3a3a3a' } }, GREEN),
    kid('G2', [46, 14], 5, { team: 'b', face: Math.PI }, GREEN), kid('G3', [26.2, 17.4], 7, { team: 'b', face: Math.PI / 2 }, GREEN),
    kid('G4', [47, 21], 9, { team: 'b', face: Math.PI }, GREEN), kid('G5', [38, 16], 10, { team: 'b', face: Math.PI }, GREEN),
    kid('G6', [36, 27], 11, { team: 'b', face: Math.PI }, GREEN), kid('G7', [30, 9], 0, { team: 'b', face: Math.PI }, GREEN),
    kid('G8', [52, 30], 3, { team: 'b', face: Math.PI }, GREEN),
  ]
  return base.map((a) => ({ ...a, ...(over[a.id] ?? {}) }))
}

export const CH10: ChapterScript = {
  no: 10,
  ball: 'plain',
  beats: [
    /* -------------------------------------------------------------- the marshmallow */
    {
      kind: 'scene', id: 'guimauve', place: parking,
      cast: [
        { id: 'K', cast: 'kaydoudou', at: [31.0, 33.6], face: -Math.PI / 2, look: COATS.K },
        { id: 'B', cast: 'bribri', at: [30.2, 34.4], face: -Math.PI / 2, look: COATS.B },
        { id: 'PA', cast: 'papa', at: [31.0, 31.6], face: Math.PI / 2, look: COATS.PA },
        { id: 'MA', cast: 'maman', at: [29.6, 32.6], face: 0, look: COATS.MA },
      ],
      shots: [
        {
          cam: { kind: 'on', who: 'K', dist: 2.4 }, do: [{ a: 'ball', at: [32.6, 33.2] }, { a: 'pose', id: 'K', pose: 'point' }],
          lines: [S('kaydoudou', "Une guimauve !"), N("Kaydoudou le crie en descendant de la voiture. Et après ça, plus personne dans la famille n'appelle le dôme autrement.")],
        },
        {
          cam: { kind: 'pose', pos: [34.5, 1.6, 39.5], look: [29, 7, 4], fov: 58 },
          lines: [S('kaydoudou', "Regarde, BriBri ! Une guimauve géante ! Plus haute que l'église de Bonamoussadi !")],
        },
        {
          cam: { kind: 'on', who: ['MA', 'K'], dist: 2.8 }, do: [{ a: 'pose', id: 'K', pose: null }],
          play: async (c) => { c.face('MA', 'K'); c.face('K', 'MA') },
          lines: [S('maman', "On ne mange pas le dôme, Kaydoudou"), S('kaydoudou', "Je n'ai rien dit !"), S('anon', "Tu l'as pensé très fort.")],
        },
        {
          cam: { kind: 'on', who: ['PA', 'B'], dist: 2.8 },
          play: async (c) => {
            c.p('PA').pos = { x: 30.6, y: 33.2 }; c.face('PA', [30.6, 36]); c.p('B').pos = { x: 30.1, y: 34.0 }; c.p('K').pos = { x: 31.1, y: 34.0 }
            c.face('B', 'PA'); c.face('K', 'PA'); c.pose('PA', 'open')
          },
          lines: [N("Papa pose une main sur chaque épaule."), S('papa', "Respirez, les garçons. Jouez comme à la maison.")],
        },
      ],
    },
    /* -------------------------------------------------------------- the revolving door */
    {
      kind: 'scene', id: 'porte', place: parking,
      cast: [
        { id: 'K', cast: 'kaydoudou', at: [30.0, 13.6], face: -Math.PI / 2, look: COATS.K },
        { id: 'B', cast: 'bribri', at: [31.2, 15.0], face: -Math.PI / 2, look: COATS.B },
        { id: 'PA', cast: 'papa', at: [29.0, 15.3], face: -Math.PI / 2, look: COATS.PA },
        { id: 'MA', cast: 'maman', at: [28.2, 15.8], face: -Math.PI / 2, look: COATS.MA },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [33.5, 1.7, 19.5], look: [30, 1.5, 13.2], fov: 50 }, do: [{ a: 'ball', at: [32.6, 33.2] }],
          play: async (c) => {
            for (let k = 0; k < 3 * 8; k++) { const a = (k / 8) * Math.PI * 2; await c.move('K', [30 + Math.cos(a) * 0.55, 13.15 + Math.sin(a) * 0.55], 0.7) }
            await c.move('B', [30.6, 14.1], 0.5); c.face('B', 'K'); await c.move('K', [30.4, 14.5], 0.4); c.face('K', 'PA')
          },
          parallel: true,
          lines: [N("Pour entrer, il faut passer une porte tournante qui vous souffle un vent chaud au visage. Fffff ! Kaydoudou fait trois tours dedans. BriBri le tire dehors par la capuche.")],
        },
        {
          cam: { kind: 'on', who: ['PA', 'K'], dist: 2.8 },
          play: async (c) => { c.p('K').pos = { x: 29.8, y: 14.6 }; c.face('K', 'PA'); c.face('PA', 'K') },
          lines: [S('papa', "C'est pour garder l'air dedans|. Avec une porte normale, le dôme se dégonflerait."), S('kaydoudou', "Comme un ballon crevé ?"), S('anon', "Comme un ballon crevé.")],
        },
        { cam: { kind: 'on', who: 'K', dist: 1.8 }, lines: [N("Kaydoudou décide de ne pas éternuer de la journée.")] },
      ],
    },
    /* -------------------------------------------------------------- summer in a bubble */
    {
      kind: 'scene', id: 'dedans', place: tryouts,
      cast: [
        { id: 'K', cast: 'kaydoudou', at: [31.5, 39.6], face: -Math.PI / 2 },
        { id: 'B', cast: 'bribri', at: [32.5, 39.9], face: -Math.PI / 2, number: 8 },
        { id: 'D', cast: 'diego', at: [38, 32], face: Math.PI, look: bib(12) },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [32, 1.7, 40.4], look: [32, 5.5, 14], fov: 64 }, do: [{ a: 'ball', at: [40, 41.2] }],
          lines: [N("Dedans, des projecteurs. Une pelouse trop verte. Et une chaleur d'été.")],
        },
        {
          cam: { kind: 'on', who: 'K', dist: 2.0 }, do: [{ a: 'pose', id: 'K', pose: 'kneel' }],
          lines: [S('kaydoudou', "BriBri ! Ils ont mis l'été dans une bulle ! Et c'est quoi, ces petits grains noirs ? Ça saute !")],
        },
        {
          cam: { kind: 'on', who: ['D', 'K'], dist: 3.2 }, do: [{ a: 'pose', id: 'K', pose: null }],
          play: async (c) => { await c.move('D', [33.4, 38.4], 0.85); c.face('D', 'K'); c.face('K', 'D'); c.face('B', 'D') },
          parallel: true,
          lines: [
            S('diego', "Rubber, bro !"),
            N("Diego arrive en courant, chasuble 12 sur le dos."),
            S('diego', "Du caoutchouc. Tonight, you find them in your bed. In your ears. Everywhere ! Look : like a hundred kids. They take maybe twenty. The others go home."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [33.8, 1.6, 40.6], look: [28, 1.2, 30], fov: 56 },
          lines: [S('anon', "Vingt ? Sur cent ?"), S('diego', "Yep. Everybody does the tryouts, every winter. Even me. Even the coach's dog, probably !")],
        },
        { cam: { kind: 'on', who: 'K', dist: 1.7 }, lines: [T('kaydoudou', "Être pris|. Avec mon frère. Ensemble. C'est tout ce que je veux.")] },
        {
          cam: { kind: 'on', who: ['K', 'B'], dist: 2.4 },
          play: async (c) => { c.face('K', 'B'); c.face('B', 'K') },
          lines: [
            N("Il enfile la chasuble orange numéro 33 par-dessus son tee-shirt jaune à bande rouge. BriBri reçoit le 34."),
          ],
        },
      ],
    },
    {
      kind: 'scene', id: 'septCache', place: tryouts,
      cast: [
        { id: 'K', cast: 'kaydoudou', at: [31.5, 39.0], face: [32.5, 39.2], look: bib(33) },
        { id: 'B', cast: 'bribri', at: [32.5, 39.2], face: [31.5, 39.0], number: 8, look: bib(34) },
        { id: 'D', cast: 'diego', at: [33.6, 38.2], face: [32, 39], look: bib(12) },
      ],
      shots: [
        {
          cam: { kind: 'on', who: 'K', dist: 2.0 }, do: [{ a: 'pose', id: 'K', pose: 'point' }],
          lines: [S('kaydoudou', "Trente-trois,|Trois plus trois, six. Plus un, sept. C'est un sept caché !")],
        },
        { cam: { kind: 'on', who: ['B', 'K'], dist: 2.4 }, do: [{ a: 'pose', id: 'K', pose: null }], lines: [S('bribri', "Tu viens d'inventer les maths"), S('anon', "Les maths inventées, ça porte bonheur.")] },
        {
          cam: { kind: 'on', who: 'B', dist: 1.7 },
          lines: [
            N("BriBri ne sourit pas."),
            S('anon', "Tu as mangé, ce matin ?"), S('anon', "La moitié d'un toast."),
            S('anon', "Tu as refait ton sac combien de fois ?"), S('anon', "Trois."),
            S('anon', "Et tes lacets ?"), S('anon', "Deux fois."),
          ],
        },
        { cam: { kind: 'on', who: 'K', dist: 1.8 }, lines: [N("Kaydoudou connaît cette tête-là. C'est la tête de l'avion.")] },
      ],
    },
    /* -------------------------------------------------------------- Coach Dana Whitfield */
    {
      kind: 'scene', id: 'coach', place: tryouts,
      cast: [
        { id: 'W', cast: 'whitfield', at: [32, 20], face: Math.PI / 2, pose: 'hold' },
        { id: 'K', cast: 'kaydoudou', at: [30.6, 25.2], face: -Math.PI / 2, look: bib(33) },
        { id: 'B', cast: 'bribri', at: [31.6, 25.4], face: -Math.PI / 2, number: 8, look: bib(34) },
        { id: 'D', cast: 'diego', at: [29.6, 25.0], face: -Math.PI / 2, look: bib(12) },
        ...[[27, 24], [34, 24.5], [28.4, 23.4], [35.4, 23.2], [33.2, 23.6], [26, 25.6], [36.6, 25.4]].map(([x, y], i) => kid(`X${i}`, [x, y], i + 2, { face: [32, 20] })),
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [32, 6, 34], look: [32, 0.8, 19], fov: 58 },
          do: [{ a: 'ball', at: [40, 41.2] }, { a: 'item', id: 'W', kind: 'tablet' }, { a: 'sfx', kind: 'whistle' }],
          lines: [N("Prrrrt ! Un coup de sifflet fait trembler la guimauve.")],
        },
        {
          cam: { kind: 'on', who: 'W', dist: 2.6 },
          lines: [
            N("Au centre se tient une grande femme. Queue de cheval brune, survêtement bleu marine, une tablette serrée contre la poitrine. Pas de micro. Elle n'en a pas besoin."),
            S('whitfield', "Good morning, everybody ! I'm Coach Dana Whitfield. One against one, small games, and a real match. And I want three things from you. Work hard. Be brave. Have fun !"),
          ],
        },
        {
          cam: { kind: 'on', who: ['D', 'K'], dist: 2.4 },
          play: async (c) => { c.face('D', 'K'); c.face('K', 'D') },
          lines: [
            S('diego', "Un contre un, petits matchs, et un vrai match,|Et travaillez dur, soyez courageux, amusez-vous ! She writes everything. Every touch. Every pass."),
            S('kaydoudou', "Elle est gentille ?"),
            S('diego', "Nice. And tough. Both."),
          ],
        },
        { cam: { kind: 'on', who: 'W', dist: 2.0 }, lines: [N("Elle a un sourire immense. Mais à chaque phrase, son doigt touche l'écran.")] },
        { cam: { kind: 'on', who: 'K', dist: 1.8 }, play: async (c) => { c.face('K', 'W') }, lines: [T('kaydoudou', "Elle sourit|. Et elle note.")] },
      ],
    },
    /* -------------------------------------------------------------- the queue: Monsieur Lessive */
    {
      kind: 'scene', id: 'file', place: tryouts,
      cast: [
        { id: 'W', cast: 'whitfield', at: [20.5, 15.4], face: [13, 9], pose: 'hold' },
        { id: 'K', cast: 'kaydoudou', at: [5.6, 9], face: 0, look: bib(33) },
        { id: 'TY', cast: 'tyler', at: [6.9, 9], face: 0, look: bib() },
        { id: 'D', cast: 'diego', at: [5.0, 10.2], face: 0, look: bib(12) },
        kid('T1', [7.9, 9.4], 3, { face: 0 }), kid('T2', [8.8, 8.8], 8, { face: 0 }),
        kid('Q1', [4.4, 9], 5, { face: 0 }), kid('Q2', [3.4, 9.2], 10, { face: 0 }),
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [14, 3.2, 17], look: [11, 0.6, 8.5], fov: 52 },
          do: [{ a: 'ball', at: [13, 9] }, { a: 'item', id: 'W', kind: 'tablet' }],
          lines: [N("Premier exercice : un contre un, dans un petit carré de cônes."), S('whitfield', "One against one ! Let's go !")],
        },
        {
          cam: { kind: 'on', who: 'TY', dist: 2.6, side: -1 },
          lines: [N("Dans la file, devant Kaydoudou, il y a un grand garçon blond. Cheveux presque blancs. Épaules de déménageur. Chaussettes noires parfaitement tirées jusqu'aux genoux.")],
        },
        {
          cam: { kind: 'on', who: ['TY', 'K'], dist: 2.6 },
          play: async (c) => { c.face('TY', 'K'); c.look('TY', [5.6, 9]) },
          lines: [N("Le garçon se retourne. Il regarde les pieds de Kaydoudou. Son sourire s'élargit, lentement."), S('tyler', "Yo, nice socks. Did your laundry lose a fight ?")],
        },
        {
          cam: { kind: 'on', who: ['T1', 'T2'], dist: 2.6 }, do: [{ a: 'pose', id: 'T1', pose: 'laugh' }, { a: 'pose', id: 'T2', pose: 'laugh' }],
          play: async (c) => { c.face('T1', 'K'); c.face('T2', 'K') },
          lines: [S('copains', "Ha ! Good one, Tyler !")],
        },
        {
          cam: { kind: 'on', who: ['K', 'D'], dist: 2.4 }, do: [{ a: 'pose', id: 'T1', pose: null }, { a: 'pose', id: 'T2', pose: null }],
          play: async (c) => { c.face('K', 'D'); c.face('D', 'K'); c.look('TY', null) },
          lines: [S('kaydoudou', "Il a dit quoi ?"), S('anon', "Il demande si ta machine à laver a perdu une bagarre.")],
        },
        {
          cam: { kind: 'pose', pos: [6.6, 0.45, 9.9], look: [5.6, 0.2, 9.0], fov: 38 },
          play: async (c) => { c.look('K', [5.9, 9]) },
          lines: [N("Kaydoudou baisse les yeux. Chaussette rouge à droite, jaune à gauche. Comme toujours.")],
        },
        {
          cam: { kind: 'on', who: ['K', 'D'], dist: 2.4 },
          play: async (c) => { c.look('K', null) },
          lines: [
            S('kaydoudou', "C'est qui, lui ?"),
            S('diego', "Tyler Brooks,|Twelve years old. Best striker. Biggest mouth. Careful, bro. He's strong."),
            S('kaydoudou', "Les camions, ça ne tourne pas vite. Moi, je l'appelle Monsieur Lessive."),
            S('diego', "Mister Laundry ! I love it !"),
          ],
        },
      ],
    },
    /* -------------------------------------------------------------- the nutmeg (played, canon) */
    {
      kind: 'play', id: 'petitPont', place: tryouts, prompt: 'play.nutmegIntro', keep: true, cast: [],
      challenge: {
        type: 'nutmeg', carrier: 'K', defender: 'TY',
        feintLines: [N("Tout ralentit."), N("Kaydoudou fait rouler le ballon vers la gauche. Tyler se jette vers la gauche.")],
        setup: async (c) => {
          for (const [id, p] of [['K', [10, 9]], ['TY', [16.4, 9]], ['D', [6.5, 11.6]], ['T1', [7.2, 7.4]], ['T2', [6.4, 6.8]], ['Q1', [5.6, 9.2]], ['Q2', [4.6, 9]]] as [string, Pt][]) { c.stop(id); c.p(id).pos = { x: p[0], y: p[1] } }
          c.face('K', 0); c.face('TY', Math.PI); for (const id of ['D', 'T1', 'T2', 'Q1', 'Q2']) c.face(id, [13, 9])
          c.give('K')
          c.cam({ kind: 'pose', pos: [8.2, 1.4, 11.2], look: [14, 0.9, 8.6], fov: 50 })
          await c.say([N("Et quand son tour arrive, Monsieur Lessive est en face de lui."), S('tyler', "Ready, socks ?"), S('kaydoudou', "Ready, Lessive.")])
          c.sfx('whistle')
          await c.say([N("Prrrt !"), N("Tyler part fort. Comme un camion."), N("Kaydoudou ne bouge pas. Il attend, sur la pointe des pieds, le ballon sous la semelle. La semelle caramel."), N("Le camion arrive. Les grains noirs sautent sous ses crampons. Ses deux grandes jambes s'ouvrent.")])
        },
        after: async (c) => {
          const ty = c.p('TY')
          ty.meta.noBlock = true; ty.target = null; ty.vel = { x: 0, y: 0 }
          const behind: Pt = [ty.pos.x + 2.2, ty.pos.y + 0.2]
          c.cam({ kind: 'pose', pos: [ty.pos.x - 0.6, 0.55, ty.pos.y + 2.4], look: [ty.pos.x + 0.4, 0.35, ty.pos.y], fov: 46 })
          c.slow(0.35)
          const roll = c.pass('K', behind)
          await c.say([N("Alors Kaydoudou pousse le ballon. Doucement. Du bout du pied. Entre les deux grandes jambes écartées.")])
          await roll.catch(() => {})
          c.slow(1)
          c.cam({ kind: 'on', who: 'TY', dist: 2.4 })
          c.pose('TY', 'shrug'); c.look('TY', [ty.pos.x + 1.4, ty.pos.y])
          await c.say([N("Tyler baisse les yeux, bouche bée, les genoux encore écartés. Il regarde le ballon passer sous lui.")])
          c.cam({ kind: 'pose', pos: [14, 3, 15], look: [16.5, 0.6, 9], fov: 48 })
          await c.move('K', [ty.pos.x + 0.3, ty.pos.y + 1.1], 0.75)
          await c.move('K', [behind[0] - 0.3, behind[1]], 0.6)
          c.give('K'); c.face('K', [19, 9])
          await c.say([N("Kaydoudou fait le tour du garçon blond et récupère le ballon de l'autre côté. Un petit pont. Rond comme une lune.")])
          c.cam({ kind: 'on', who: 'D', dist: 2.2 }); c.pose('D', 'celebrate')
          await c.say([S('diego', "NUTMEG !")])
          c.pose('D', null)
          c.cam({ kind: 'pose', pos: [15.5, 1.5, 12.5], look: [18.4, 0.5, 9], fov: 44 })
          await c.shot('K', [19.0, 9.1], { height: 0.15, speed: 8 })
          c.sfx('net')
          c.face('K', 'TY')
          await c.say([N("Kaydoudou marque dans le petit but. Puis il se retourne vers Tyler, encore à moitié penché.")])
          c.cam({ kind: 'on', who: ['K', 'TY'], dist: 2.6 })
          await c.say([S('kaydoudou', "My socks say hello.")])
          c.cam({ kind: 'pose', pos: [10, 1.6, 13.5], look: [6, 1.1, 8], fov: 50 })
          for (const id of ['D', 'T1', 'T2', 'Q1', 'Q2']) c.pose(id, 'laugh')
          await c.say([S('file', "Ooooooh !")])
          for (const id of ['D', 'T1', 'T2', 'Q1', 'Q2']) c.pose(id, null)
          c.pose('TY', null); c.look('TY', null); c.face('TY', 'K')
          c.cam({ kind: 'on', who: ['TY', 'K'], dist: 2.6 })
          await c.say([S('tyler', "Lucky !"), S('kaydoudou', "No. Caramel.")])
          c.cam({ kind: 'on', who: 'W', dist: 2.6 }); c.face('W', 'K')
          await c.say([N("Tyler devient rouge jusqu'aux oreilles. Sur le côté, Coach Whitfield lève un sourcil. Elle touche sa tablette.")])
        },
      },
    },
    {
      kind: 'scene', id: 'muscade', place: tryouts, keep: true, cast: [],
      shots: [
        {
          cam: { kind: 'on', who: ['K', 'D'], dist: 2.6 },
          play: async (c) => { await c.move('K', [7.2, 11.2], 0.45); c.face('K', 'D'); c.face('D', 'K') },
          lines: [
            S('kaydoudou', "Nutmeg ? C'est quoi ?"),
            S('anon', "Le petit pont, en anglais. Ça veut dire noix de muscade."),
            S('kaydoudou', "Une noix ? Pourquoi une noix ?"),
            S('diego', "Nobody knows, bro."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [10.5, 2.0, 15], look: [7, 1, 10.5], fov: 50 },
          play: async (c) => { c.p('TY').pos = { x: 10.5, y: 12.4 }; c.face('TY', [4, 10]); await c.move('TY', [6.6, 11.0], 0.35); c.go('TY', [3.5, 10], 0.35) },
          parallel: true,
          lines: [N("Le reste de la matinée, Tyler ne lui parle plus. Mais il passe toujours un peu trop près, l'épaule en avant.")],
        },
      ],
    },
    /* -------------------------------------------------------------- the small games */
    {
      kind: 'scene', id: 'petitsMatchs', place: tryouts,
      cast: [
        { id: 'W', cast: 'whitfield', at: [30, 33], face: [29, 27.5], pose: 'hold' },
        { id: 'K', cast: 'kaydoudou', team: 'a', at: [26, 27], face: 0, look: bib(33), ball: true },
        { id: 'D', cast: 'diego', team: 'a', at: [29.5, 25.2], face: 0, look: bib(12) },
        kid('A1', [25, 29.6], 4, { team: 'a' }), kid('A2', [24.4, 27.5], 6, { team: 'a', gk: true }),
        kid('E1', [28.2, 27.6], 1, { team: 'b', face: Math.PI }, GREEN), kid('E2', [31, 26.4], 7, { team: 'b', face: Math.PI }, GREEN),
        kid('E3', [31.2, 29.2], 9, { team: 'b', face: Math.PI }, GREEN), kid('E4', [34.2, 27.5], 11, { team: 'b', face: Math.PI, gk: true }, GREEN),
        { id: 'B', cast: 'bribri', team: 'a', at: [42, 27], face: 0, number: 8, look: bib(34) },
        kid('F1', [40, 25], 2, { team: 'a' }), kid('F2', [44.4, 29.8], 10, { team: 'b', face: Math.PI }, GREEN), kid('F3', [45.6, 26], 0, { team: 'b', face: Math.PI }, GREEN),
        kid('GR', [27.5, 33.2], 5, { face: [27, 27] }),
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [29, 5.5, 39.5], look: [31, 0.6, 27], fov: 56 },
          do: [{ a: 'ball', at: 'K' }, { a: 'item', id: 'W', kind: 'tablet' }],
          lines: [N("Ensuite viennent les petits matchs, à quatre contre quatre. Et là, Kaydoudou est heureux. C'est presque Bonamoussadi : peu d'espace, beaucoup de jambes, des buts tout près.")],
        },
        {
          cam: { kind: 'on', who: 'K', dist: 2.0 }, do: [{ a: 'pose', id: 'K', pose: 'mic' }],
          lines: [N("Il fait même la voix de Radio, la main devant la bouche.")],
        },
        {
          cam: { kind: 'pose', pos: [27.5, 3.2, 34.5], look: [30.5, 0.4, 27.5], fov: 50 }, do: [{ a: 'pose', id: 'K', pose: null }],
          play: async (c) => {
            c.give('K')
            await c.move('K', [27.6, 27.2], 0.5)
            c.go('E1', [28.6, 27.6], 0.5)
            await c.move('K', [28.9, 28.3], 0.6)
            c.go('D', [31.6, 25.6], 0.6)
            await c.pass('K', 'D')
            c.go('K', [32.2, 28.4], 0.8)
            await c.pass('D', 'K', { oneTouch: true, lead: 0.4 })
            await c.shot('K', [35.0, 27.6], { height: 0.12, speed: 9 })
            c.sfx('net'); c.pose('K', 'celebrate')
          },
          parallel: true,
          lines: [S('kaydoudou', "Mesdames et messieurs, Kaydoudou ! Semelle caramel ! Crochet du margouillat ! Il passe à Diego ! Diego lui rend ! Et... BUT !")],
        },
        { cam: { kind: 'on', who: ['D', 'K'], dist: 2.6 }, do: [{ a: 'pose', id: 'K', pose: null }, { a: 'pose', id: 'D', pose: 'laugh' }], lines: [S('diego', "You're crazy, bro !")] },
        { cam: { kind: 'on', who: 'W', dist: 2.4 }, do: [{ a: 'pose', id: 'D', pose: null }, { a: 'pose', id: 'W', pose: 'point' }], play: async (c) => { c.item('W', null) }, lines: [S('whitfield', "Thirty-three ! Yes !")] },
        {
          cam: { kind: 'on', who: 'GR', dist: 2.0 }, do: [{ a: 'pose', id: 'W', pose: 'hold' }],
          play: async (c) => { c.item('W', 'tablet') },
          lines: [S('garcon', "Who's that kid with the socks ?")],
        },
        { cam: { kind: 'on', who: 'K', dist: 1.8 }, do: [{ a: 'pose', id: 'K', pose: 'open' }], lines: [N("Kaydoudou sourit jusqu'aux oreilles. On le remarque !")] },
      ],
    },
    /* -------------------------------------------------------------- the boy who walks on eggs */
    {
      kind: 'scene', id: 'oeufs', place: tryouts, keep: true, cast: [],
      shots: [
        {
          cam: { kind: 'pose', pos: [34.6, 1.5, 31.5], look: [43, 1.0, 27], fov: 48 },
          do: [{ a: 'pose', id: 'K', pose: null }],
          play: async (c) => { c.p('K').pos = { x: 35.6, y: 29.6 }; c.face('K', 'B') },
          lines: [N("Mais entre deux matchs, Kaydoudou regarde le terrain d'à côté. Et son cœur se serre.")],
        },
        {
          cam: { kind: 'pose', pos: [38.6, 2.4, 32], look: [43, 0.6, 26.8], fov: 46 },
          play: async (c) => {
            c.give('F1')
            await c.pass('F1', 'B')
            c.go('F3', [c.p('B').pos.x + 0.9, c.p('B').pos.y - 0.4], 0.95)
            await c.wait(1.2)
            c.face('B', 'F1')
            await c.pass('B', 'F1')
          },
          lines: [
            N("BriBri joue comme un garçon qui marche sur des œufs. Il reçoit le ballon et l'arrête net sous son pied. Il lève la tête... et un défenseur est déjà sur lui."),
            S('anon', "Too easy !"),
            N("Alors il fait la passe à côté. Ou en arrière. Toujours la plus sûre."),
            N("C'est le BriBri d'avant les Requins. Celui de la passe polie."),
          ],
        },
        {
          cam: { kind: 'on', who: 'W', dist: 2.4 }, do: [{ a: 'pose', id: 'W', pose: 'point' }],
          play: async (c) => { c.p('W').pos = { x: 41, y: 33.2 }; c.face('W', 'B'); c.item('W', null) },
          lines: [S('whitfield', "Your first touch has to go somewhere !")],
        },
        {
          cam: { kind: 'on', who: ['D', 'K'], dist: 2.4 }, do: [{ a: 'pose', id: 'W', pose: 'hold' }],
          play: async (c) => { c.item('W', 'tablet'); c.p('D').pos = { x: 36.4, y: 30.4 }; c.face('D', 'K'); c.face('K', 'D') },
          lines: [S('diego', "Ton premier contrôle doit aller quelque part")],
        },
        {
          cam: { kind: 'on', who: 'B', dist: 2.2 },
          lines: [N("BriBri hoche la tête, mais il n'a pas l'air de comprendre. À côté du numéro 34, sur la tablette, il ne doit pas y avoir grand-chose d'écrit.")],
        },
        {
          cam: { kind: 'on', who: ['K', 'D'], dist: 2.4 },
          lines: [
            S('kaydoudou', "Il est en train de rater,|Mon frère est en train de rater."),
            S('diego', "He's just nervous. Wait."),
            S('kaydoudou', "Je ne peux pas attendre ! S'il n'est pas pris, on ne joue pas ensemble. Et sans lui, l'Amérique, c'est juste du froid !"),
          ],
        },
      ],
    },
    /* -------------------------------------------------------------- the cold-ridden owl (played) */
    {
      kind: 'play', id: 'hibou', place: tryouts, prompt: 'play.hibouIntro', keep: true, cast: [],
      challenge: {
        type: 'ritual',
        steps: [
          {
            key: 'hibou',
            act: async (c) => {
              c.p('K').pos = { x: 40.6, y: 30.2 }; c.p('B').pos = { x: 41.5, y: 30.0 }
              c.face('K', 'B'); c.face('B', 'K')
              c.cam({ kind: 'on', who: ['K', 'B'], dist: 2.4 })
              await c.say([
                N("Coach Whitfield appelle les équipes pour le dernier match. Kaydoudou trotte jusqu'à son frère."),
                S('bribri', "Je n'y arrive pas, Kaydoudou,|Ici, tout va trop vite."),
                N("Alors Kaydoudou met ses mains en cornet devant sa bouche. Et il souffle, exactement comme le sifflet en bois de manguier :"),
              ])
              c.pose('K', 'mic')
              c.cam({ kind: 'on', who: 'K', dist: 1.7 })
              await c.say([S('kaydoudou', "Houou ! Le ballon doit voyager !")])
              c.pose('K', null)
              c.cam({ kind: 'on', who: 'B', dist: 1.7 }); c.pose('B', 'laugh')
              await c.say([N("Deux garçons se retournent. BriBri laisse échapper un petit rire par le nez. Le premier de la journée. Ses épaules descendent d'un centimètre.")])
              c.pose('B', null)
              c.cam({ kind: 'on', who: ['K', 'B'], dist: 2.4 })
              await c.say([
                S('kaydoudou', "Voilà|. Ça, c'est mon frère."),
                S('bribri', "Tu es bête."),
                S('kaydoudou', "Je suis un hibou enrhumé,|Et le ballon, ce n'est pas un œuf. Ne le garde pas sous ton pied. Pousse-le."),
                S('bribri', "Pousse-le"),
              ])
            },
          },
        ],
      },
    },
    /* -------------------------------------------------------------- the last game */
    {
      kind: 'scene', id: 'dernierMatch', place: tryouts, cast: lastGame(),
      shots: [
        {
          cam: { kind: 'on', who: 'W', dist: 2.6 }, do: [{ a: 'ball', at: [40, 41.2] }, { a: 'item', id: 'W', kind: 'tablet' }, { a: 'pose', id: 'W', pose: 'hold' }],
          lines: [S('whitfield', "Last game ! Nine against nine ! Five minutes !")],
        },
        {
          cam: { kind: 'pose', pos: [30, 9, 44], look: [40, 0, 18], fov: 60 },
          lines: [N("Un vrai match, sur tout le dôme. Tyler est dans l'autre équipe, au milieu de la défense, les bras croisés.")],
        },
        { cam: { kind: 'on', who: 'TY', dist: 2.4 }, play: async (c) => { c.face('TY', 'K') }, lines: [S('tyler', "Hey, socks ! Not this time !")] },
        {
          cam: { kind: 'on', who: ['B', 'K'], dist: 2.8 },
          play: async (c) => { c.p('K').pos = { x: 27.4, y: 21.4 }; c.face('K', 'B'); c.face('B', 'K') },
          lines: [S('bribri', "Reste sur ta ligne|. Et regarde mes mains.")],
        },
        { cam: { kind: 'on', who: 'W', dist: 2.4 }, do: [{ a: 'pose', id: 'W', pose: 'point' }], play: async (c) => { c.item('W', null) }, lines: [S('whitfield', "Thirty-four !|Show me something !")] },
        {
          cam: { kind: 'pose', pos: [30, 2.6, 41.5], look: [34, 0.6, 33], fov: 50 }, do: [{ a: 'pose', id: 'W', pose: 'hold' }],
          play: async (c) => { c.item('W', 'tablet'); c.p('K').pos = { x: 31.5, y: 35.6 }; await c.move('K', [34, 35.5], 0.45); c.face('K', 'B') },
          lines: [N("Kaydoudou reste collé à la ligne, sur l'aile droite."), T('kaydoudou', "Allez, BriBri. Comme contre les Requins.")],
        },
      ],
    },
    /* -------------------------------------------------------------- the first touch goes somewhere (played, canon) */
    {
      kind: 'play', id: 'controle', place: tryouts, prompt: 'play.controleIntro', keep: true, cast: [],
      challenge: {
        type: 'firstTouch', player: 'B', from: 'O5', defender: 'G3', space: [28.6, 23.6],
        touchLines: [N("Et cette fois, il ne l'arrête pas sous son pied."), N("Du plat du pied gauche, il le pousse d'un mètre sur le côté. Loin du défenseur. Vers l'herbe libre. Le défenseur passe dans le vide.")],
        setup: async (c) => {
          c.cam({ kind: 'pose', pos: [22, 7, 31], look: [26.5, 0.4, 20], fov: 50 })
          await c.say([N("Le ballon arrive vers BriBri, au milieu, un adversaire dans son dos.")])
        },
        after: async (c) => {
          await c.wait(0.8)
          c.stop('B'); c.give('B'); c.face('B', [46, 33])
          c.cam({ kind: 'on', who: 'B', dist: 2.2 }); c.pose('B', 'point')
          await c.say([N("La tête de BriBri est déjà levée. Sa main droite aussi."), N("Deux doigts.")])
          c.cam({ kind: 'on', who: 'K', dist: 2.4 }); c.face('K', 'B')
          await c.say([N("Les frères se regardent. Une demi-seconde. Les deux doigts, c'est la langue secrète de la terre rouge."), N("Kaydoudou part.")])
          c.pose('B', null)
        },
      },
    },
    /* -------------------------------------------------------------- behind Tyler (played, canon) */
    {
      kind: 'play', id: 'course', place: tryouts, prompt: 'play.runIntro2', keep: true, cast: [],
      challenge: {
        type: 'run', runner: 'K', marker: 'TY', markerSpeed: 0.2, zone: { at: [50, 31], r: 2.4 }, prompt: 'play.runBehind',
        cue: S('diego', "GO, KAYDOUDOU !"),
        after: async (c) => {
          c.cam({ kind: 'pose', pos: [36, 8, 42], look: [44, 1, 26], fov: 56 })
          const b = c.p('B')
          c.face('B', [52, 29])
          const pass = c.pass('B', [53.5, 29.6], { lofted: true, flight: 2.6 })
          c.go('K', [53.8, 29.8], 1)
          c.go('TY', [c.p('TY').pos.x + 1.2, c.p('TY').pos.y + 1.4], 0.4)
          await c.say([N("Il court dans le dos de Tyler, le long de la ligne, de toutes ses forces. Il entend le bruit sec du ballon frappé. Pof. Puis un silence."), S('anon', "Whoa...")])
          await c.say([N("Le ballon passe au-dessus des milieux. Au-dessus de Tyler, qui pivote trop tard. Et il retombe juste devant Kaydoudou, quarante mètres plus loin. Une passe qui traverse tout le dôme.")])
          await pass.catch(() => {})
          c.give('K')
          c.cam({ kind: 'on', who: 'TY', dist: 2.4 }); c.face('TY', 'K')
          await c.say([S('tyler', "No way...")])
          c.cam({ kind: 'pose', pos: [52, 2.2, 34], look: [60, 0.8, 21], fov: 50 })
          await c.move('K', [56, 26.5], 0.8)
          c.p('G1').pos = { x: 61.2, y: 19.0 }
          await c.shot('K', [62.4, 21.6], { height: 0.3, speed: 13 })
          await c.say([N("Kaydoudou n'a qu'à pousser le ballon au fond.")])
          c.cam({ kind: 'follow', who: 'K', dist: 4.2, height: 2 })
          c.pose('K', 'dance')
          await c.say([N("Il fait trois pas de la danse de Roger Milla. Puis il se rappelle qu'il n'y a pas de poteau de corner dans une guimauve. Alors il court sauter sur le dos de son frère.")])
          c.pose('K', null)
          // on BriBri's back, arms round his neck
          b.pos = { x: 50, y: 25 }; c.face('B', [44, 25])
          c.p('K').pos = { x: 50.25, y: 25 }; c.face('K', [44, 25]); c.p('K').meta.elev = 0.42; c.pose('K', 'embrace')
          c.cam({ kind: 'pose', pos: [47.6, 1.5, 25.6], look: [50, 1.35, 25], fov: 46 })
          await c.say([
            S('kaydoudou', "Les deux doigts ! Les deux doigts sont arrivés en Amérique !"),
            S('bribri', "Tu m'étrangles, Kaydoudou."),
            S('kaydoudou', "Je sais !"),
          ])
          c.p('K').meta.elev = 0; c.pose('K', null); c.p('K').pos = { x: 50.4, y: 26.0 }
          c.p('D').pos = { x: 48.8, y: 25.6 }; c.face('D', 'B'); c.pose('D', 'celebrate')
          c.cam({ kind: 'on', who: 'D', dist: 2.4 })
          await c.say([S('diego', "BRO !|Forty meters ! FORTY !")])
          c.pose('D', null)
          c.cam({ kind: 'on', who: 'O6', dist: 2.2 })
          await c.say([S('garcon', "Who's number thirty-four ?")])
          c.cam({ kind: 'on', who: 'W', dist: 2.4 }); c.face('W', 'B')
          await c.say([N("Coach Whitfield ne sourit plus. Elle regarde BriBri. Et elle écrit sur sa tablette. Longtemps. Très longtemps."), S('whitfield', "Thank you, everybody ! You'll get an email on Tuesday !")])
        },
      },
    },
    /* -------------------------------------------------------------- the car, the bath */
    {
      kind: 'scene', id: 'voiture', place: parking,
      cast: [
        { id: 'PA', cast: 'papa', at: [31.0, 33.0], face: [31, 34.4], look: COATS.PA },
        { id: 'K', cast: 'kaydoudou', at: [31.0, 34.4], face: [31, 33], look: COATS.K },
        { id: 'B', cast: 'bribri', at: [30.2, 34.9], face: [31, 33], look: COATS.B },
      ],
      shots: [
        { cam: { kind: 'on', who: 'PA', dist: 2.0 }, do: [{ a: 'ball', at: [32.6, 33.2] }, { a: 'pose', id: 'PA', pose: 'open' }], lines: [N("Dans la voiture, Papa sourit."), S('papa', "Alors ?")] },
        { cam: { kind: 'on', who: 'K', dist: 2.0 }, do: [{ a: 'pose', id: 'PA', pose: null }, { a: 'pose', id: 'K', pose: 'fist' }], lines: [S('anon', "Alors, la guimauve est à nous !")] },
      ],
    },
    {
      kind: 'scene', id: 'bain', place: night, cast: [],
      shots: [
        {
          cam: { kind: 'pose', pos: [19, 1.8, 24], look: [14, 3, 9], fov: 50 }, do: [{ a: 'ball', at: [14, 7] }],
          lines: [N("Le soir, dans son bain, Kaydoudou trouve des grains noirs partout."), S('kaydoudou', "Maman ! J'en ai dans les oreilles ! Diego avait raison !"), S('anon', "Et dans le nez aussi, mon chéri.")],
        },
      ],
    },
    /* -------------------------------------------------------------- the email */
    {
      kind: 'scene', id: 'email', place: home,
      cast: [
        { id: 'PA', cast: 'papa', at: [12.85, 3.2], face: Math.PI, pose: 'sit', look: { jacket: '#5a5048' } },
        { id: 'MA', cast: 'maman', at: [12.0, 2.35], face: Math.PI / 2, pose: 'sit', look: { jacket: '#e9e2d4' } },
        { id: 'K', cast: 'kaydoudou', at: [11.15, 3.2], face: 0, pose: 'sit', look: { jacket: '#e2a22a', shirt: '#e2a22a', stripe: undefined } },
        { id: 'B', cast: 'bribri', at: [12.0, 4.05], face: -Math.PI / 2, pose: 'sit', look: { jacket: '#3a5a7a', shirt: '#3a5a7a', number: undefined } },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [9.6, 1.7, 5.6], look: [12, 0.9, 3.2], fov: 52 },
          do: [{ a: 'ball', at: [0.6, 6.4] }, { a: 'item', id: 'PA', kind: 'tablet' }, { a: 'pose', id: 'PA', pose: 'sitHold' }],
          lines: [N("L'e-mail arrive le mardi soir, au milieu du dîner. Papa le lit à voix haute."), S('papa', "Dear parents... BriBri : U12.")],
        },
        { cam: { kind: 'pose', pos: [11.2, 1.35, 1.4], look: [12, 1.0, 2.4], fov: 46 }, lines: [S('maman', "Mon grand !")] },
        {
          cam: { kind: 'pose', pos: [12.4, 1.15, 2.6], look: [12, 0.95, 4.05], fov: 40 },
          lines: [S('bribri', "Moi ? Pris ?"), N("BriBri ferme les yeux une seconde, comme quelqu'un qui pose enfin un sac très lourd.")],
        },
        {
          cam: { kind: 'pose', pos: [12.35, 1.1, 2.75], look: [11.15, 0.95, 3.2], fov: 40 }, do: [{ a: 'pose', id: 'K', pose: 'sitHand' }],
          lines: [S('kaydoudou', "Et moi ? Et moi ?")],
        },
        { cam: { kind: 'pose', pos: [11.4, 1.35, 3.6], look: [12.85, 1.0, 3.2], fov: 42 }, do: [{ a: 'pose', id: 'K', pose: 'sit' }], lines: [S('papa', "Kaydoudou : U11.")] },
        {
          cam: { kind: 'pose', pos: [12.35, 1.1, 2.75], look: [11.15, 0.95, 3.2], fov: 40 },
          lines: [N("Kaydoudou pose sa fourchette."), S('kaydoudou', "Avec les petits ? Pas avec mon frère ?"), T('kaydoudou', "Ça y est|. On me laisse de côté.")],
        },
        {
          cam: { kind: 'pose', pos: [11.4, 1.35, 3.6], look: [12.85, 1.0, 3.2], fov: 42 },
          lines: [
            S('papa', "Attends,|Il y a une suite. Coach Whitfield would like Kaydoudou to play up with the U12 team."),
            S('kaydoudou', "Play up ? C'est quoi, play up ?"),
            S('papa', "Surclassé. Par l'âge, tu es un U11. Mais elle te fait monter d'une catégorie, chez les U12. Avec des plus grands que toi. Avec ton frère."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [13.3, 1.65, 1.2], look: [11.4, 1.0, 3.2], fov: 56 },
          play: async (c) => { await c.wait(1.0); c.pose('K', null); c.sfx('splash') },
          parallel: true,
          lines: [S('kaydoudou', "AVEC MON FRÈRE ?"), N("Kaydoudou bondit. Splash ! La carafe d'eau se renverse."), S('anon', "Kaydoudou ! La carafe !"), S('kaydoudou', "Pardon, carafe !")],
        },
      ],
    },
    {
      kind: 'play', id: 'poing', place: home, prompt: 'play.emailIntro', keep: true, cast: [],
      challenge: {
        type: 'ritual',
        steps: [
          {
            key: 'poing',
            act: async (c) => {
              c.cam({ kind: 'pose', pos: [13.3, 1.65, 1.2], look: [11.8, 1.0, 3.6], fov: 52 })
              await c.move('K', [10.6, 4.4], 0.5); await c.move('K', [11.2, 4.75], 0.5)
              c.face('K', 'B'); c.pose('B', null); c.face('B', 'K'); c.pose('K', 'fist'); c.pose('B', 'fist'); c.sfx('touch')
              await c.say([N("Il fait le tour de la table en dansant et tend le poing à BriBri.")])
            },
          },
          {
            key: 'coeur',
            act: async (c) => {
              c.pose('K', 'heart'); c.pose('B', 'heart')
              c.cam({ kind: 'on', who: ['K', 'B'], dist: 2.0 })
              await c.say([
                N("Poing contre poing. Main sur le cœur."),
                S('kaydoudou', "Tu as vu ?|Elle ne m'a pas oublié."),
                S('bribri', "Personne n'oublie un garçon avec ces chaussettes. Je te l'ai dit : c'est scientifique. Mais là-bas, tu seras le plus petit."),
                S('kaydoudou', "Alors je serai le plus rapide."),
              ])
              c.pose('K', null); c.pose('B', null)
            },
          },
        ],
      },
    },
    {
      kind: 'scene', id: 'tyler', place: home, keep: true, cast: [],
      shots: [
        {
          cam: { kind: 'pose', pos: [11.4, 1.35, 3.6], look: [12.85, 1.0, 3.2], fov: 42 },
          lines: [N("Le téléphone de Papa vibre. Un message de Diego."), S('anon', "Congrats bros ! Bad news : Tyler made it too.")],
        },
        {
          cam: { kind: 'on', who: ['K', 'B'], dist: 2.2 },
          lines: [
            S('kaydoudou', "Monsieur Lessive ! Encore lui !"),
            S('bribri', "Il faudra jouer avec lui, maintenant"),
            S('anon', "Ou lui faire un deuxième petit pont."),
            S('anon', "Kaydoudou."),
            S('kaydoudou', "Quoi ? Un tout petit !"),
          ],
        },
      ],
    },
    /* -------------------------------------------------------------- Marcus counts */
    {
      kind: 'scene', id: 'marcus', place: training,
      cast: [
        { id: 'W', cast: 'whitfield', at: [29, 38.6], face: -Math.PI / 2, pose: 'hold' },
        { id: 'MB', cast: 'marcus', at: [30.6, 39.4], face: -Math.PI / 2, pose: 'hold' },
        { id: 'K', cast: 'kaydoudou', at: [29.4, 34.6], face: Math.PI / 2 },
        { id: 'B', cast: 'bribri', at: [30.4, 34.8], face: Math.PI / 2, number: 8 },
        { id: 'D', cast: 'diego', at: [28.4, 34.4], face: Math.PI / 2 },
        { id: 'TY', cast: 'tyler', at: [32.6, 35.0], face: Math.PI / 2 },
        ...[[26.8, 35], [33.8, 34.6], [27.6, 33.6], [31.6, 33.6], [34.6, 35.4]].map(([x, y], i) => kid(`U${i}`, [x, y], i + 4, { face: Math.PI / 2, look: { bib: undefined } })),
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [36, 2.4, 28], look: [30, 1.4, 38.5], fov: 54 },
          do: [{ a: 'ball', at: [40, 41.2] }, { a: 'item', id: 'W', kind: 'tablet' }, { a: 'item', id: 'MB', kind: 'tablet' }],
          lines: [
            N("Premier entraînement des U12, le jeudi suivant, sous la guimauve."),
            N("À côté de Coach Whitfield, il y a un jeune homme maigre, lunettes rondes, sweat à capuche gris. Il serre sa tablette comme un trésor. Derrière lui, une caméra perchée sur un grand pied regarde tout le terrain."),
          ],
        },
        { cam: { kind: 'on', who: 'W', dist: 2.4 }, lines: [S('whitfield', "Guys, this is Marcus Bell, our video analyst. Marcus is shy. But Marcus films everything. Marcus counts everything. And never, ever lie to Marcus.")] },
        {
          cam: { kind: 'on', who: ['D', 'K'], dist: 2.2 },
          play: async (c) => { c.face('D', 'K'); c.face('K', 'D') },
          lines: [S('diego', "Marcus filme tout,|Marcus compte tout. Et ne mentez jamais à Marcus."), S('kaydoudou', "Monsieur Tablette")],
        },
        {
          cam: { kind: 'on', who: ['MB', 'K'], dist: 2.6 },
          play: async (c) => {
            for (const id of ['D', 'TY', 'U0', 'U1', 'U2', 'U3', 'U4']) c.p(id).pos = { x: 20 + Math.random() * 6, y: 26 + Math.random() * 3 }
            await c.move('MB', [29.9, 35.6], 0.35); c.face('MB', 'K'); c.face('K', 'MB')
          },
          lines: [N("À la fin de la séance, Marcus vient vers lui en remontant ses lunettes."), S('marcus', "Bonjour. Je parle... un petit peu français."), S('kaydoudou', "Moi aussi ! Beaucoup, même !")],
        },
        { cam: { kind: 'on', who: 'MB', dist: 2.0 }, lines: [S('marcus', "Number thirty-three, right ? Great nutmeg on Tyler at the tryouts.")] },
        {
          cam: { kind: 'on', who: 'K', dist: 1.9 }, do: [{ a: 'pose', id: 'K', pose: 'open' }],
          lines: [N("Kaydoudou gonfle la poitrine. Il a compris « great » et « Tyler ». Ça lui suffit."), S('kaydoudou', "Thank you ! BriBri, tu as entendu ? Great !")],
        },
        {
          cam: { kind: 'on', who: 'MB', dist: 1.9 }, do: [{ a: 'pose', id: 'K', pose: null }],
          lines: [S('marcus', "After that..."), N("Marcus tapote son écran."), S('marcus', "... you lost the ball nine times in a row.")],
        },
        { cam: { kind: 'on', who: 'K', dist: 1.8 }, do: [{ a: 'pose', id: 'K', pose: 'dejected' }], lines: [N("La poitrine de Kaydoudou se dégonfle comme un dôme dont on aurait ouvert la porte."), S('kaydoudou', "Nine ? How you know ?")] },
        {
          cam: { kind: 'on', who: 'MB', dist: 1.8 }, do: [{ a: 'pose', id: 'K', pose: null }],
          lines: [N("Marcus sourit. Le sourire doux des gens qui disent des choses terribles très gentiment."), S('marcus', "I count.")],
        },
      ],
    },
    { kind: 'lesson', no: 10 },
  ],
}
