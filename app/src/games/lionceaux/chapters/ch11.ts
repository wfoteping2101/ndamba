// Chapitre 11, « Soixante-dix pour cent » (POV BriBri). Source: tome1/chapters/11-soixante-dix-pour-cent.md.
// Every line is the chapter's text; lines the book gives to nobody in particular are shown without a
// name. Played: the pass in front of the wall of green bricks (Tyler is open behind it: the pass is
// there, locked with BriBri's « Trop risqué », and he gives it to Owen, as the book says); BriBri
// writing the question in his notebook; the bow he makes for Marcus when he has no English word.
// The goal of the number 11 (0-1) and Marcus's numbers on the screen are cutscenes.
import type { Look } from '../../engine/sim/types'
import type { ChapterScript } from '../story/session'
import type { ActorSpec, Pt } from '../story/types'
import { N, S, T } from './helpers'
import { VIDEO_SEATS } from '../sets/academie'

const spring = { id: 'printemps' as const, mood: 'morning' as const, opts: {} }
const car = { id: 'parking' as const, mood: 'noon' as const, opts: { snow: false } }
const room = { id: 'salleVideo' as const, mood: 'interior' as const }

const NAVY = '#1f2a44'
/** Potomac Valley's kit: navy, white numbers (BriBri's 8 on the back) */
const PV = (n?: number): Partial<Look> => ({ shirt: NAVY, shirtTrim: '#f2f2ee', collar: '#f2f2ee', number: n, numberColor: '#f2f2ee', shorts: NAVY, sockL: NAVY, sockR: NAVY, stripe: undefined, part: undefined })
const PV_B: Partial<Look> = { ...PV(8), part: 'L' }
const PV_K: Partial<Look> = { ...PV(), sockR: '#D63C2F', sockL: '#F2C230' }
/** the academy's navy sweatshirt, Monday in the video room */
const SWEAT: Partial<Look> = { shirt: NAVY, shirtTrim: NAVY, jacket: NAVY, collar: NAVY, number: undefined, stripe: undefined, trousers: '#2f3a4a', shoes: 'trainers', boots: '#e6e0d4' }
const PAPA_BONNET: Partial<Look> = { coat: '#2f3a4a', jacket: '#6f97d6', headwrap: '#2f8f4e', pattern: { a: '#c9362b', b: '#f2c230', kind: 'rings' }, beanie: true }

const KIDS: [string, Look['hair'], string][] = [
  ['#e8c4a0', 'crop', '#5a3a22'], ['#5B3A27', 'crop', '#17110c'], ['#c99b78', 'crop', '#17110c'], ['#f0d2b8', 'crop', '#c9a060'],
  ['#8a5a3c', 'afro', '#17110c'], ['#d9b08c', 'crop', '#3a2a1e'], ['#a8714c', 'crop', '#17110c'], ['#3f2a1e', 'twists', '#17110c'],
]
function player(id: string, team: 'a' | 'b', at: Pt, v: number, o: Partial<ActorSpec> = {}): ActorSpec {
  const [skin, hair, hairColor] = KIDS[v % KIDS.length]
  const kit = team === 'a' ? PV() : { shirt: '#2f7a3a', shirtTrim: '#f2f2ee', shorts: '#f2f2ee', sockL: '#2f7a3a', sockR: '#2f7a3a' }
  return { id, cast: team === 'a' ? 'kid' : 'hawk', team, at, face: team === 'a' ? 0 : Math.PI, ...o, look: { skin, hair, hairColor, height: 0.97 + ((v * 7) % 10) / 100, ...kit, ...(o.look ?? {}) } }
}

/** The match: Potomac Valley (navy) attack right; the Hawks pressed in front of their box, their 11 waiting. */
function match(over: Record<string, Partial<ActorSpec>> = {}): ActorSpec[] {
  const base: ActorSpec[] = [
    { id: 'PA', cast: 'papa', at: [18, 42.6], face: -Math.PI / 2, look: PAPA_BONNET },
    { id: 'W', cast: 'whitfield', at: [28, 41.4], face: -Math.PI / 2 },
    player('PG', 'a', [4, 20], 0, { gk: true, look: { gloves: '#e6e0d4', shirt: '#e2c23a', shirtTrim: '#e2c23a' } }),
    { id: 'OW', cast: 'owen', team: 'a', at: [14, 14], face: 0 },
    player('P2', 'a', [14, 27], 1),
    { id: 'B', cast: 'bribri', team: 'a', at: [25, 20], face: 0, number: 8, look: PV_B },
    { id: 'D', cast: 'diego', team: 'a', at: [30, 9], face: 0, look: PV() },
    { id: 'K', cast: 'kaydoudou', team: 'a', at: [38, 32], face: 0, look: PV_K },
    { id: 'TY', cast: 'tyler', team: 'a', at: [51, 21], face: Math.PI, look: PV() },
    player('P3', 'a', [22, 31], 2), player('P4', 'a', [22, 8], 3),
    player('HG', 'b', [60.5, 20], 4, { gk: true, look: { gloves: '#3a3a3a', shirt: '#3a3a3a', shirtTrim: '#3a3a3a' } }),
    ...[[46.5, 11], [46, 15], [46.4, 19], [46.2, 23], [46.6, 27], [46, 31]].map(([x, y], i) => player(`H${i}`, 'b', [x, y], i + 5)),
    player('H6', 'b', [52, 16], 7),
    { id: 'F', cast: 'faucon', team: 'b', at: [35, 21.5], face: Math.PI },
  ]
  return base.map((a) => ({ ...a, ...(over[a.id] ?? {}) }))
}

export const CH11: ChapterScript = {
  no: 11,
  ball: 'plain',
  beats: [
    /* -------------------------------------------------------------- a concert */
    {
      kind: 'scene', id: 'concert', place: spring, cast: match(),
      shots: [
        {
          cam: { kind: 'match' }, do: [{ a: 'score', text: '0 - 0' }],
          play: async (c) => {
            c.give('OW')
            for (const [a, b] of [['OW', 'B'], ['B', 'D'], ['D', 'B'], ['B', 'OW'], ['OW', 'B'], ['B', 'P3']] as [string, string][]) { await c.pass(a, b); await c.wait(0.3) }
          },
          parallel: true,
          lines: [N("Clap, clap, clap."), S('parents', "Nice pass !"), S('parents', "Great ball, eight !"), S('parents', "Keep it, boys, keep it !"), N("Chaque passe, les parents applaudissent.")],
        },
        { cam: { kind: 'on', who: 'B', dist: 2.4 }, lines: [T('bribri', "On dirait un concert")] },
        {
          cam: { kind: 'on', who: 'PA', dist: 2.4 },
          lines: [N("Premier samedi d'avril, premier match de printemps. La neige est partie, il reste de la boue près des poteaux. Sur la ligne, Papa a mis son bonnet vert, rouge et jaune. Maman dort : elle a travaillé toute la nuit.")],
        },
      ],
    },
    {
      kind: 'scene', id: 'numero8', place: spring,
      cast: match({ B: { at: [30, 39], face: -Math.PI / 2 }, K: { at: [31, 38.6], face: [30, 39] }, D: { at: [29, 38.4], face: [30, 39] }, F: { at: [34, 21], face: Math.PI / 2 } }),
      shots: [
        {
          cam: { kind: 'pose', pos: [30.3, 1.45, 40.6], look: [30, 1.15, 38.6], fov: 44 }, do: [{ a: 'ball', at: [32, 20] }],
          lines: [N("BriBri porte le maillot bleu marine de l'académie, avec un grand 8 blanc dans le dos. Pas son maillot vert de Bonamoussadi. Mais un 8.")],
        },
        {
          cam: { kind: 'on', who: ['K', 'B'], dist: 2.4 },
          play: async (c) => { c.face('B', 'K') },
          lines: [S('kaydoudou', "Tu as ta tête de l'avion"), S('bribri', "Non. Aujourd'hui, j'ai ma tête de numéro 8. Je vais prouver que je le mérite.")],
        },
        {
          cam: { kind: 'pose', pos: [32, 3.4, 44], look: [44, 0.8, 20], fov: 52 },
          lines: [N("En face, les Severn River Hawks, d'Annapolis, en maillots verts."), S('diego', "Hawks, ça veut dire faucons,|Les oiseaux qui tombent du ciel sur les souris.")],
        },
        {
          cam: { kind: 'on', who: 'F', dist: 2.6 }, do: [{ a: 'pose', id: 'F', pose: 'shrug' }],
          lines: [N("Leur numéro 11 est petit et maigre, avec des yeux de chat. Il ne court presque pas. Il attend, les mains sur les hanches.")],
        },
        {
          cam: { kind: 'on', who: ['K', 'B'], dist: 2.4 }, do: [{ a: 'pose', id: 'F', pose: null }],
          play: async (c) => { c.face('K', 'F'); c.face('B', 'F') },
          lines: [S('kaydoudou', "Lui, il dort"), S('bribri', "Non,|Il guette. Comme un chat devant un trou de souris.")],
        },
      ],
    },
    /* -------------------------------------------------------------- left, right, left, right */
    {
      kind: 'scene', id: 'gaucheDroite', place: spring, cast: match(),
      shots: [
        {
          cam: { kind: 'match' }, do: [{ a: 'score', text: '0 - 0' }, { a: 'sfx', kind: 'whistle' }],
          play: async (c) => {
            c.give('OW')
            const calls: [string, string][] = [['OW', 'B'], ['B', 'D'], ['D', 'B'], ['B', 'OW'], ['OW', 'B']]
            for (const [a, b] of calls) { await c.pass(a, b); await c.wait(0.25) }
          },
          lines: [
            N("Potomac Valley a le ballon tout le temps."),
            S('owen', "Bri !"),
            N("BriBri reçoit. Il se tourne."),
            S('anon', "Diego !"), S('anon', "Bri !"), S('anon', "Owen !"), S('anon', "Bri !"),
            N("Gauche, droite, gauche, droite. Les Hawks, eux, se serrent devant leur surface, épaule contre épaule. Un mur de briques vertes."),
          ],
        },
      ],
    },
    /* -------------------------------------------------------------- the wall (played: the pass is there, locked) */
    {
      kind: 'play', id: 'mur', place: spring, prompt: 'play.wallIntro',
      cast: match({ B: { at: [36, 20] }, OW: { at: [24, 15] }, D: { at: [38, 10] }, K: { at: [40, 33] }, TY: { at: [51, 21.4] }, F: { at: [33, 24], face: 0 } }),
      challenge: {
        type: 'choose', prompt: 'play.passChoice', lockedHint: 'play.passLocked',
        options: [
          { key: 'tyler', canon: false, line: T('bribri', "Trop risqué.") },
          { key: 'owen', canon: true },
        ],
        setup: async (c) => {
          c.give('OW')
          c.cam({ kind: 'match' })
          await c.pass('OW', 'B')
          c.face('B', 'TY')
          c.cam({ kind: 'over', who: 'B', to: [51, 21.4], dist: 4.6, height: 3.2, mix: 0.55 })
          c.pose('TY', 'wave')
          await c.say([S('tyler', "Here ! Here ! I'm open !")])
          c.lanes([['B', 'TY'], ['B', 'OW']])
          await c.say([S('whitfield', "Go forward, Bri !|Be brave !"), N("BriBri regarde le mur.")])
        },
        after: async (c) => {
          c.lanes(null); c.pose('TY', null)
          c.cam({ kind: 'match' })
          await Promise.all([c.pass('B', 'OW'), c.say([T('bribri', "Trop risqué."), N("Il donne à Owen.")])])
          c.cam({ kind: 'pose', pos: [22, 1.7, 46], look: [24, 1.2, 42.6], fov: 46 })
          await c.say([S('uneMaman', "Nice pass !")])
        },
      },
    },
    /* -------------------------------------------------------------- half-time */
    {
      kind: 'scene', id: 'miTemps', place: spring,
      cast: [
        { id: 'K', cast: 'kaydoudou', at: [23.4, 40.6], face: [24, 39], look: PV_K, pose: 'mic' },
        { id: 'B', cast: 'bribri', at: [24.6, 40.8], face: [24, 39], number: 8, look: PV_B },
        { id: 'D', cast: 'diego', at: [22.4, 39.6], face: [24, 39.6], look: PV() },
        { id: 'TY', cast: 'tyler', at: [25.8, 39.4], face: [24, 39.6], look: PV() },
        { id: 'OW', cast: 'owen', at: [26.4, 40.4], face: [24, 39.6] },
        { id: 'W', cast: 'whitfield', at: [24, 38.2], face: Math.PI / 2 },
        { id: 'F', cast: 'faucon', at: [40.5, 40.4], face: -Math.PI / 2, pose: 'mic' },
      ],
      shots: [
        {
          cam: { kind: 'on', who: 'K', dist: 2.0 }, do: [{ a: 'ball', at: [32, 20] }, { a: 'score', text: '0 - 0' }],
          lines: [N("À la mi-temps, c'est 0-0. Kaydoudou avale des quartiers d'orange, le jus sur le menton.")],
        },
        {
          cam: { kind: 'on', who: ['K', 'D'], dist: 2.6 }, do: [{ a: 'pose', id: 'K', pose: 'open' }],
          lines: [S('kaydoudou', "Ils ne touchent même pas le ballon ! On joue au chat et à la souris. C'est nous la souris, et la souris gagne !"), S('diego', "Bro, they're not even trying")],
        },
        { cam: { kind: 'on', who: 'W', dist: 2.4 }, do: [{ a: 'pose', id: 'K', pose: null }], lines: [S('whitfield', "Good job, guys,|Now, please... somebody shoot !"), S('tyler', "I'm trying !")] },
        { cam: { kind: 'on', who: 'F', dist: 3.0 }, lines: [N("BriBri, lui, regarde le numéro 11, qui boit son eau, tranquille.")] },
        {
          cam: { kind: 'on', who: ['B', 'K'], dist: 2.4 }, do: [{ a: 'pose', id: 'F', pose: null }],
          play: async (c) => { c.face('B', 'K'); c.face('K', 'B') },
          lines: [S('bribri', "Il n'a pas couru,|Il n'a même pas transpiré."), S('kaydoudou', "Parce qu'il est nul !"), S('anon', "Ou parce qu'il attend quelque chose.")],
        },
      ],
    },
    /* -------------------------------------------------------------- the hawk drops */
    {
      kind: 'scene', id: 'faucon', place: spring, cast: match({ B: { at: [27, 20], face: Math.PI }, OW: { at: [15, 15] }, P2: { at: [15, 25] }, F: { at: [26, 23.5], face: Math.PI } }),
      shots: [
        {
          cam: { kind: 'match' }, do: [{ a: 'score', text: '0 - 0' }],
          play: async (c) => {
            c.give('B')
            await c.wait(0.8)
            await c.pass('B', 'OW')
            c.go('F', [17.2, 20.4], 0.75)
            await c.wait(0.4)
            // Owen wants to give it to his neighbour; a lump of mud, and it jumps the wrong way
            await c.arc([15.4, 15.6, 0.11], [16.8, 19.6, 0.11], 0.35, 0.7)
            c.place([16.9, 19.8])
          },
          lines: [
            N("48e minute. BriBri reçoit au milieu, face au mur. Il fait demi-tour. Passe en arrière vers Owen. Une passe tranquille. Une passe propre."),
            N("Owen veut la donner à son voisin. Le ballon tape une motte de boue. Ploc. Il saute de travers."),
          ],
        },
        {
          cam: { kind: 'follow', who: 'F', dist: 5.5, height: 2.6 },
          play: async (c) => {
            await c.until(() => Math.hypot(c.p('F').pos.x - 16.9, c.p('F').pos.y - 19.8) < 1.2, 4).catch(() => {})
            c.give('F')
            c.go('OW', [12, 18], 0.8); c.go('PG', [4.5, 19], 0.5)
            await c.move('F', [7.5, 16.5], 0.95)
            await c.shot('F', [1.6, 22.4], { height: 0.4, speed: 17 })
            c.score('0 - 1')
          },
          lines: [N("Et le numéro 11 n'attend plus."), N("Il pique comme un faucon. Il vole le ballon. Une touche, deux touches, trois. Quarante mètres de course. Frappe croisée."), N("Chhh. Le filet."), N("0-1.")],
        },
        {
          cam: { kind: 'on', who: 'OW', dist: 2.4 }, do: [{ a: 'pose', id: 'OW', pose: 'dejected' }],
          lines: [S('owen', "Sorry, Bri ! Sorry !")],
        },
        {
          cam: { kind: 'on', who: 'F', dist: 2.4 }, do: [{ a: 'pose', id: 'OW', pose: null }, { a: 'pose', id: 'F', pose: 'point' }],
          lines: [N("Le numéro 11 lève juste un doigt vers le ciel. Une occasion de tout le match. Une seule. Au fond.")],
        },
        {
          cam: { kind: 'on', who: 'K', dist: 2.2 }, do: [{ a: 'pose', id: 'F', pose: null }],
          play: async (c) => { c.face('K', 'F') },
          lines: [S('kaydoudou', "Le faucon a mangé la souris")],
        },
        {
          cam: { kind: 'match' },
          play: async (c) => {
            c.give('B')
            for (const [a, b] of [['B', 'D'], ['D', 'B'], ['B', 'P3']] as [string, string][]) { await c.pass(a, b) }
            c.pose('TY', 'wave')
            c.give('K'); c.p('K').pos = { x: 40, y: 30 }
            for (const [i, id] of ['H5', 'H4', 'H3'].entries()) { c.p(id).pos = { x: 43 + i * 2.2, y: 30 - i * 0.8 }; c.face(id, 'K') }
            await c.move('K', [47.5, 28], 0.8)
            c.give('H2'); c.pose('TY', null)
          },
          lines: [N("Potomac Valley attaque. Enfin... on se fait des passes. Plus vite. Moins bien. Tyler crie « Here ! » jusqu'à perdre sa voix. Kaydoudou dribble trois Hawks et perd le ballon contre le quatrième.")],
        },
        {
          cam: { kind: 'pose', pos: [40, 2.6, 30], look: [46, 1, 22], fov: 52 }, do: [{ a: 'sfx', kind: 'whistle' }],
          play: async (c) => { for (const id of ['H0', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'F']) { c.p(id).pos = { x: 46 + Math.random() * 2.5, y: 21 + Math.random() * 2.5 }; c.pose(id, 'celebrate') } },
          lines: [N("Tuuut. Fin du match. Les Hawks sautent les uns sur les autres, comme s'ils avaient gagné la Coupe du monde.")],
        },
      ],
    },
    /* -------------------------------------------------------------- so pretty */
    {
      kind: 'scene', id: 'siJolies', place: spring,
      cast: [
        { id: 'B', cast: 'bribri', at: [32, 20.6], face: -Math.PI / 2, number: 8, look: PV_B },
        { id: 'D', cast: 'diego', at: [31, 21.2], face: -Math.PI / 2, look: PV() },
        { id: 'F', cast: 'faucon', at: [32, 19.4], face: Math.PI / 2 },
        { id: 'MP', cast: 'mamanPompon', at: [33.6, 22.8], face: [32, 20.6] },
        ...[[30.2, 19.4], [33.6, 19.3], [35, 19.5]].map(([x, y], i) => player(`L${i}`, 'b', [x, y], i + 2, { face: Math.PI / 2 })),
        ...[[29.2, 20.7], [34.2, 20.8]].map(([x, y], i) => player(`M${i}`, 'a', [x, y], i + 5, { face: -Math.PI / 2 })),
      ],
      shots: [
        {
          cam: { kind: 'on', who: ['F', 'B'], dist: 2.6 }, do: [{ a: 'ball', at: [62.6, 22] }, { a: 'score', text: '0 - 1' }, { a: 'pose', id: 'F', pose: 'palm' }, { a: 'pose', id: 'B', pose: 'palm' }],
          lines: [N("Au moment de se serrer la main, le numéro 11 s'arrête devant BriBri. Petit sourire en coin."), S('faucon', "So many passes, eight. So pretty.")],
        },
        {
          cam: { kind: 'on', who: ['D', 'B'], dist: 2.4 }, do: [{ a: 'pose', id: 'F', pose: null }, { a: 'pose', id: 'B', pose: null }],
          play: async (c) => { c.face('D', 'B'); c.face('B', 'D'); c.go('F', [36, 19.4], 0.35) },
          lines: [S('diego', "Tant de passes,|Si jolies."), N("Les oreilles de BriBri brûlent."), S('diego', "Laisse tomber, bro,|Il est jaloux de tes passes.")],
        },
        {
          cam: { kind: 'on', who: ['MP', 'B'], dist: 2.6 },
          play: async (c) => { await c.move('MP', [32.9, 21.4], 0.3); c.face('MP', 'B'); c.face('B', 'MP'); c.pose('MP', 'palm') },
          lines: [N("Une maman en bonnet à pompon lui tapote l'épaule."), S('mamanPompon', "Unlucky, honey. You guys played so well. You had the ball all game !")],
        },
        {
          cam: { kind: 'on', who: ['D', 'B'], dist: 2.4 }, do: [{ a: 'pose', id: 'MP', pose: null }],
          lines: [S('diego', "Pas de chance, mon chéri,|Vous avez si bien joué. Vous avez eu le ballon tout le match."), S('bribri', "Thank you")],
        },
      ],
    },
    /* -------------------------------------------------------------- in the mirror */
    {
      kind: 'scene', id: 'retroviseur', place: car,
      cast: [
        { id: 'PA', cast: 'papa', at: [31.0, 33.0], face: [31, 34.4], look: PAPA_BONNET },
        { id: 'K', cast: 'kaydoudou', at: [31.0, 34.4], face: [31, 33], look: PV_K },
        { id: 'B', cast: 'bribri', at: [30.1, 34.9], face: [31, 33], number: 8, look: PV_B },
      ],
      shots: [
        { cam: { kind: 'on', who: 'PA', dist: 2.0 }, do: [{ a: 'ball', at: [32.6, 33.2] }], lines: [N("Dans la voiture, Papa essaie de sourire."), S('papa', "Vous avez eu le ballon tout le temps, les garçons. C'est déjà ça.")] },
        { cam: { kind: 'on', who: 'K', dist: 1.9 }, lines: [S('kaydoudou', "Oui,|Et le faucon a eu le but.")] },
        {
          cam: { kind: 'on', who: ['B', 'PA'], dist: 2.6 },
          lines: [S('bribri', "Papa,|Un réseau où tout tourne, mais où rien n'arrive... ça sert à quoi ?"), N("Papa le regarde dans le rétroviseur."), S('papa', "À rien, mon fils. Un réseau, c'est fait pour que les choses arrivent.")],
        },
        {
          cam: { kind: 'on', who: 'B', dist: 1.7 },
          lines: [
            N("BriBri se tait. Il a un caillou dans le ventre. Le même qu'à Douala, quand les grands disaient « Il joue propre, ce petit ! » et que Tonton Fokou, sur son bidon jaune, ne disait rien."),
            T('bribri', "Bien joué ? On a perdu."),
          ],
        },
      ],
    },
    /* -------------------------------------------------------------- Marcus's numbers */
    {
      kind: 'scene', id: 'salle', place: room,
      cast: [
        { id: 'MB', cast: 'marcus', at: [6.6, 1.0], face: [4.5, 4], pose: 'hold' },
        { id: 'W', cast: 'whitfield', at: [4.5, 6.3], face: -Math.PI / 2 },
        { id: 'B', cast: 'bribri', at: VIDEO_SEATS[2], face: -Math.PI / 2, pose: 'sit', look: { ...SWEAT, part: 'L' } },
        { id: 'D', cast: 'diego', at: VIDEO_SEATS[1], face: -Math.PI / 2, pose: 'sit', look: SWEAT },
        { id: 'K', cast: 'kaydoudou', at: VIDEO_SEATS[7], face: -Math.PI / 2, pose: 'sit', look: SWEAT },
        { id: 'TY', cast: 'tyler', at: VIDEO_SEATS[9], face: -Math.PI / 2, pose: 'sit', look: SWEAT },
        { id: 'OW', cast: 'owen', at: VIDEO_SEATS[5], face: -Math.PI / 2, pose: 'sit', look: SWEAT },
        ...[3, 0, 6, 8, 11, 12, 13].map((s, i) => player(`S${i}`, 'a', VIDEO_SEATS[s], i, { face: -Math.PI / 2, pose: 'sit', look: SWEAT })),
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [8.2, 1.9, 6.4], look: [4.2, 1.2, 0.8], fov: 54 }, do: [{ a: 'ball', at: [8.6, 0.4] }, { a: 'cue', name: 'blank' }, { a: 'item', id: 'MB', kind: 'tablet' }],
          lines: [N("Lundi, pas de ballon. L'équipe s'entasse dans une petite salle grise à côté du dôme. Ça sent le feutre et les chaussettes. Marcus Bell branche sa tablette sur l'écran, tout doucement, comme on pose un oiseau dans un nid.")],
        },
        { cam: { kind: 'on', who: 'W', dist: 2.2 }, play: async (c) => { c.pose('W', 'sit'); c.p('W').pos = { x: 4.5, y: 6.4 } }, lines: [N("Coach Whitfield s'assoit au fond, les bras croisés. Elle ne sourit pas.")] },
        { cam: { kind: 'on', who: 'MB', dist: 2.0 }, lines: [S('marcus', "Okay, guys,|Saturday. Let's look at the numbers.")] },
        {
          cam: { kind: 'pose', pos: [3.9, 1.3, 1.35], look: [4.2, 0.9, 3.4], fov: 52 },
          play: async (c) => { c.pose('K', 'cry') },
          lines: [N("Diego s'assoit au premier rang, à côté de BriBri, pour traduire. Derrière eux, Kaydoudou se cache la tête dans les mains."), S('kaydoudou', "C'est comme chez le docteur,|Quand il prépare la piqûre.")],
        },
        {
          cam: { kind: 'pose', pos: [4.5, 1.45, 4.6], look: [4.5, 1.5, 0.2], fov: 50 }, do: [{ a: 'pose', id: 'K', pose: 'sit' }, { a: 'cue', name: 'pct70' }],
          lines: [N("Un chiffre apparaît. Énorme. Jaune."), N("70 %."), S('marcus', "Seventy percent. Possession.")],
        },
        {
          cam: { kind: 'pose', pos: [3.9, 1.3, 1.35], look: [4.2, 0.9, 3.4], fov: 52 },
          play: async (c) => { c.pose('OW', 'fist') },
          lines: [S('diego', "La possession, c'est le temps où on a le ballon,|Soixante-dix pour cent du match !"), S('tyler', "We destroyed them !"), S('diego', "On les a écrasés"), N("Un murmure fier traverse la salle. Owen lève le poing.")],
        },
        {
          cam: { kind: 'pose', pos: [4.5, 1.45, 4.6], look: [4.5, 1.5, 0.2], fov: 50 }, do: [{ a: 'pose', id: 'OW', pose: 'sit' }, { a: 'cue', name: 'p312' }],
          lines: [N("Deuxième chiffre : 312."), S('marcus', "Three hundred and twelve passes. Them ? Ninety-one."), S('anon', "Fiouuu !")],
        },
        { cam: { kind: 'pose', pos: [4.3, 1.1, 1.6], look: [4.5, 0.95, 2.4], fov: 40 }, lines: [S('bribri', "Trois fois et demie plus que les Hawks"), N("Et pourtant, 0-1.")] },
        {
          cam: { kind: 'pose', pos: [4.5, 1.45, 4.6], look: [4.5, 1.5, 0.2], fov: 50 },
          play: async (c) => { await c.wait(1.6); c.cue('box5') },
          parallel: true,
          lines: [N("Marcus attend le silence. Le troisième chiffre arrive. Tout petit, seul au milieu de l'écran blanc."), N("5."), S('marcus', "Five.")],
        },
        {
          cam: { kind: 'pose', pos: [3.9, 1.3, 1.35], look: [4.2, 0.9, 3.4], fov: 52 },
          lines: [
            S('kaydoudou', "Cinq quoi ?"),
            S('marcus', "Five touches in their box. In sixty minutes."),
            S('diego', "Cinq ballons touchés dans leur surface,|Le grand rectangle devant le but, là où on marque presque tous les buts. Cinq fois en une heure."),
            N("Silence."),
            N("Plus un bruit. Même la chaudière, derrière le mur, a l'air de retenir son souffle."),
          ],
        },
        { cam: { kind: 'on', who: 'W', dist: 2.4 }, lines: [S('whitfield', "Say it again, Marcus")] },
        { cam: { kind: 'on', who: 'MB', dist: 2.0 }, lines: [S('marcus', "Five.")] },
        { cam: { kind: 'pose', pos: [4.9, 1.2, 3.0], look: [5.7, 0.9, 3.7], fov: 42 }, play: async (c) => { c.pose('K', 'sitHand') }, lines: [S('kaydoudou', "Cinq,|Une seule main. Pour tout le match.")] },
      ],
    },
    {
      kind: 'scene', id: 'fleches', place: room, keep: true, cast: [],
      shots: [
        { cam: { kind: 'on', who: 'MB', dist: 2.0 }, do: [{ a: 'pose', id: 'K', pose: 'sit' }], lines: [S('marcus', "Now, watch this")] },
        {
          cam: { kind: 'pose', pos: [4.5, 1.45, 4.0], look: [4.5, 1.5, 0.2], fov: 48 },
          play: async (c) => { await c.wait(1.2); c.cue('arrows') },
          parallel: true,
          lines: [N("Le terrain apparaît, vu d'en haut. Puis les flèches. Chaque passe du match devient un trait blanc. Dix. Cent. Trois cents. Ça tourne sur les côtés. Ça tourne derrière. Des boucles, des U, des allers et retours.")],
        },
        {
          cam: { kind: 'pose', pos: [3.9, 1.3, 1.35], look: [4.2, 0.9, 3.4], fov: 52 },
          lines: [S('kaydoudou', "Des spaghettis !|Un plat de spaghettis renversé !")],
        },
        {
          cam: { kind: 'on', who: 'MB', dist: 2.2 }, do: [{ a: 'pose', id: 'MB', pose: 'point' }],
          play: async (c) => { c.face('MB', [5.8, 0.1]); c.item('MB', null) },
          lines: [S('marcus', "And here"), S('marcus', "Nothing."), S('diego', "Et là, rien"), S('kaydoudou', "Même pas une miette !")],
        },
        {
          cam: { kind: 'pose', pos: [5.8, 1.3, 3.0], look: [5.6, 0.95, 5.0], fov: 46 }, do: [{ a: 'pose', id: 'MB', pose: 'hold' }],
          play: async (c) => { c.item('MB', 'tablet'); c.face('MB', [4.5, 4]) },
          lines: [S('tyler', "But I was open !|All game !"), S('marcus', "You were,|Nobody saw you."), S('diego', "Tu étais seul,|Personne ne t'a vu.")],
        },
        { cam: { kind: 'pose', pos: [4.3, 1.1, 1.6], look: [4.5, 0.95, 2.4], fov: 38 }, lines: [T('bribri', "Moi, je l'ai vu|. Et je n'ai pas osé.")] },
        {
          cam: { kind: 'pose', pos: [5.6, 1.6, 2.6], look: [5.4, 1.45, 0.15], fov: 44 }, do: [{ a: 'pose', id: 'MB', pose: 'point' }],
          play: async (c) => { c.face('MB', [5.5, 0.1]); c.item('MB', null) },
          lines: [
            N("Marcus lève son stylo. Il pose la pointe sur une petite flèche. La seule flèche jaune de l'écran. La seule qui entre dans la surface."),
            S('marcus', "One pass. Only one pass went into the box."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [4.3, 1.1, 1.6], look: [4.5, 0.95, 2.4], fov: 36 }, do: [{ a: 'pose', id: 'B', pose: 'restR' }],
          lines: [
            N("BriBri ne bouge plus. Au premier rang, dans son sweat bleu marine, le menton dans la main, il fixe l'écran. La lumière froide lui tombe sur le visage."),
            T('bribri', "Une seule."),
          ],
        },
        {
          cam: { kind: 'on', who: 'MB', dist: 2.2 }, do: [{ a: 'pose', id: 'MB', pose: 'hold' }],
          play: async (c) => { c.item('MB', 'tablet'); c.face('MB', [4.5, 4]) },
          lines: [S('marcus', "An ocean of passes,|And no boat."), S('diego', "Un océan de passes,|Et pas de bateau.")],
        },
      ],
    },
    {
      kind: 'scene', id: 'crabes', place: room, keep: true, cast: [],
      shots: [
        {
          cam: { kind: 'pose', pos: [4.5, 1.45, 4.0], look: [4.5, 1.5, 0.2], fov: 48 }, do: [{ a: 'pose', id: 'B', pose: 'sit' }],
          play: async (c) => { await c.wait(1.0); c.cue('arrows8') },
          parallel: true,
          lines: [N("Marcus touche encore l'écran. Toutes les flèches s'effacent, sauf celles du numéro 8."), N("Les voilà, ses passes. Courtes. Nettes. Presque toutes sur le côté ou en arrière.")],
        },
        {
          cam: { kind: 'pose', pos: [3.9, 1.3, 1.35], look: [4.2, 0.9, 3.4], fov: 52 },
          lines: [
            S('kaydoudou', "Ouh là,|Elles reculent toutes, tes passes. Comme des crabes."),
            S('marcus', "Fifty-eight out of sixty-one,|Best accuracy on the team. Very clean."),
            S('diego', "Cinquante-huit passes réussies sur soixante et une,|Le meilleur de l'équipe. Très propre. Bravo, bro !"),
          ],
        },
        {
          cam: { kind: 'pose', pos: [4.3, 1.1, 1.6], look: [4.5, 0.95, 2.4], fov: 38 },
          lines: [
            N("Propre. Le même mot qu'à Douala."),
            S('bribri', "Des révérences"),
            S('anon', "Des quoi ?"),
            S('bribri', "Des révérences. Comme quand on se penche devant une reine. Après vous, Majesté, je vous en prie. Mes passes saluent le ballon. Et elles ne l'emmènent nulle part."),
            N("Diego ne comprend pas. BriBri, si."),
            T('bribri', "J'ai traversé l'océan. J'ai changé de maillot et de langue. Et j'ai apporté mes passes polies dans ma valise."),
            N("Dans sa tête, une voix rauque arrive de très loin. Houou !"),
            S('fokou', "Une passe sur le côté, c'est poli. Une passe qui traverse, c'est utile. Le football n'est pas un salon, mon fils."),
          ],
        },
        {
          cam: { kind: 'on', who: 'W', dist: 2.6 },
          play: async (c) => { c.pose('W', null); c.p('W').pos = { x: 4.5, y: 6.1 } },
          lines: [
            N("Au fond de la salle, Coach Whitfield se lève."),
            S('whitfield', "Listen to me. Possession is a tool, not a trophy."),
            N("Elle laisse la phrase tomber, puis elle la répète, plus lentement."),
            S('whitfield', "A tool. Like a hammer. Nobody wins a prize for holding a hammer. You win when you build something."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [3.9, 1.3, 1.35], look: [4.2, 0.9, 3.4], fov: 52 },
          lines: [
            S('diego', "La possession, c'est un outil, pas un trophée,|Comme un marteau. Personne ne gagne un prix parce qu'il tient un marteau. On gagne quand on construit quelque chose."),
            S('kaydoudou', "Moi, je gagnerais,|Je tiens super bien les marteaux."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [8.2, 1.9, 6.4], look: [4.2, 1.0, 2.0], fov: 54 },
          play: async (c) => { for (const id of ['K', 'D', 'TY', 'OW', 'S0', 'S1', 'S2', 'S3']) c.pose(id, 'laugh'); c.pose('W', 'laugh') },
          lines: [N("Toute la salle éclate de rire. Même Coach Whitfield.")],
        },
        {
          cam: { kind: 'pose', pos: [4.3, 1.1, 1.6], look: [4.5, 0.75, 2.4], fov: 40 },
          play: async (c) => { for (const id of ['K', 'D', 'TY', 'OW', 'S0', 'S1', 'S2', 'S3']) c.pose(id, 'sit'); c.pose('W', null); c.item('B', 'card'); c.pose('B', 'sitHold') },
          lines: [N("BriBri, lui, ne rit pas. Sous la table, il a ouvert son carnet sur ses genoux.")],
        },
      ],
    },
    /* -------------------------------------------------------------- the biggest question (played) */
    {
      kind: 'scene', id: 'porte', place: room, keep: true, cast: [],
      shots: [
        {
          cam: { kind: 'pose', pos: [8.2, 1.9, 6.4], look: [4.2, 1.0, 2.0], fov: 54 },
          play: async (c) => {
            for (const id of ['D', 'TY', 'OW', 'S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'W']) { c.pose(id, null); c.go(id, [8.6, 6.2], 0.6) }
            c.pose('K', null); await c.move('K', [8.1, 6.0], 0.5); c.face('K', 'B')
            for (const id of ['D', 'TY', 'OW', 'S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'W']) { c.stop(id); c.p(id).pos = { x: 30, y: 30 } }
            c.p('MB').pos = { x: 30, y: 31 }
          },
          parallel: true,
          lines: [N("Les autres sortent en se bousculant. BriBri reste assis.")],
        },
        {
          cam: { kind: 'pose', pos: [5.6, 1.4, 4.4], look: [7.6, 1.2, 5.8], fov: 48 },
          lines: [
            S('kaydoudou', "Tu viens ?"), S('bribri', "Vas-y. J'arrive."),
            S('kaydoudou', "Tu fais quoi ? Des maths ?"), S('bribri', "Une question. Une question de foot."),
            S('kaydoudou', "Une petite ?"), S('bribri', "La plus grande."),
          ],
        },
        {
          cam: { kind: 'on', who: 'K', dist: 2.0 },
          play: async (c) => { await c.wait(1.6); c.p('K').pos = { x: 30, y: 32 } },
          parallel: true,
          lines: [N("Kaydoudou le regarde une seconde. Puis il ferme la porte tout doucement.")],
        },
      ],
    },
    {
      kind: 'play', id: 'question', place: room, prompt: 'play.questionIntro', keep: true, cast: [],
      challenge: {
        type: 'ritual',
        steps: [
          {
            key: 'ecrire',
            act: async (c) => {
              c.cam({ kind: 'pose', pos: [4.25, 1.15, 2.05], look: [4.45, 0.66, 2.35], fov: 40 })
              await c.say([
                N("BriBri écrit une phrase. Il la barre. Une autre. Barrée aussi. Puis la vraie arrive, d'un coup, comme une passe qu'on voit avant de la recevoir. Il appuie si fort qu'elle s'imprime sur la page d'après :"),
                N("« Est-ce que cette passe nous rapproche du but, ou est-ce qu'elle prépare celle qui nous rapprochera ? »"),
                N("Elle ne dit pas : plus de passes en arrière. Elle dit : fais-les, mais pour quelque chose."),
              ])
            },
          },
        ],
      },
    },
    {
      kind: 'scene', id: 'marcus', place: room, keep: true, cast: [],
      shots: [
        {
          cam: { kind: 'pose', pos: [6.0, 1.6, 3.6], look: [4.6, 1.0, 2.5], fov: 46 },
          play: async (c) => { c.p('MB').pos = { x: 5.4, y: 2.9 }; c.face('MB', 'B'); c.pose('MB', 'hold'); c.item('MB', 'tablet') },
          lines: [
            N("Une ombre tombe sur la page. Marcus est là, la tablette sous le bras. Il penche la tête pour lire."),
            S('marcus', "Do you speak French only, or... ?"),
            S('bribri', "A little English. A little more each day."),
            S('marcus', "What did you write ?"),
            N("BriBri cherche les mots, un par un, comme on traverse une rivière de pierre en pierre."),
            S('bribri', "Is this pass... going to the goal ? Or is it... preparing the next pass... that goes to the goal ?"),
          ],
        },
        {
          cam: { kind: 'on', who: 'MB', dist: 1.8 },
          lines: [
            N("Marcus ne dit rien. Longtemps. Derrière ses lunettes, ses yeux brillent comme ceux de Papa quand toutes les petites lumières d'un réseau passent au vert."),
            S('marcus', "And if the answer is no, and no ?"),
          ],
        },
        { cam: { kind: 'pose', pos: [4.3, 1.1, 1.6], look: [4.5, 0.95, 2.4], fov: 40 }, lines: [S('bribri', "Then... it is a...")] },
      ],
    },
    {
      kind: 'play', id: 'reverence', place: room, prompt: 'play.bowIntro', keep: true, cast: [],
      challenge: {
        type: 'ritual',
        steps: [
          {
            key: 'reverence',
            act: async (c) => {
              c.item('B', null); c.pose('B', null); c.p('B').pos = { x: 4.5, y: 2.85 }; c.face('B', 'MB')
              c.cam({ kind: 'pose', pos: [6.0, 1.4, 1.8], look: [4.8, 1.0, 2.9], fov: 46 })
              c.pose('B', 'heart')
              await c.say([N("Il ne connaît pas le mot anglais. Alors il se penche en avant, très poliment, comme devant une reine.")])
              c.pose('B', null); c.pose('MB', 'laugh'); c.item('MB', null)
              c.cam({ kind: 'on', who: 'MB', dist: 2.0 })
              await c.say([N("Marcus éclate de rire."), S('marcus', "A bow ! Yes ! That's the question, man. That's the only question. Most coaches never ask it.")])
              c.pose('MB', 'hold'); c.item('MB', 'tablet')
              await c.say([N("Puis Marcus Bell, qui ne prête jamais sa tablette à personne, la tend à BriBri."), S('marcus', "Tu veux apprendre à voir le match comme moi ?")])
              c.cam({ kind: 'on', who: ['B', 'MB'], dist: 2.4 })
              await c.say([
                N("En français ! Pas juste un « bonjour », comme avec Kaydoudou au premier entraînement. Une vraie phrase, lente et cabossée, qui fait rouler les r comme des billes."),
                S('bribri', "Vous... vous parlez vraiment français ?"),
                S('marcus', "At college. Two years. I was terrible. Like your brother in English."),
                N("BriBri sourit. Pour la première fois depuis samedi."),
              ])
              c.item('MB', null); c.pose('MB', null); c.item('B', 'tablet'); c.pose('B', 'hold')
              c.cam({ kind: 'on', who: 'B', dist: 1.7 })
              await c.say([
                N("Il prend la tablette. Elle est lourde et tiède, comme une chose vivante. Tonton Fokou dessinait ses plans dans la poussière avec un bâton. Ici, on les dessine avec de la lumière."),
                S('bribri', "Oui"), N("Puis, parce qu'on est en Amérique :"), S('bribri', "Yes."),
              ])
              c.cam({ kind: 'pose', pos: [4.5, 1.45, 4.4], look: [4.5, 1.5, 0.2], fov: 48 })
              c.cue('file33')
              await c.say([N("Marcus fait glisser l'écran. Un autre dossier s'ouvre. En haut, un numéro : 33. En dessous, des croix rouges. Des dizaines de croix rouges."), T('bribri', "Aïe|. Kaydoudou ne va pas aimer ça.")])
            },
          },
        ],
      },
    },
    { kind: 'lesson', no: 11 },
  ],
}
