// Chapitre 4, « La boue et le pagne » (POV Kaydoudou). Source: tome1/chapters/04-la-boue-et-le-pagne.md.
// Every line is the chapter's text. Played: the two steps of the triangle (Leçon n°4: offer a
// solution; while Ousmane hides him the ball never comes, whatever he does, as in the book); the ten
// passes with Mami's ball that never touch the mud (canon: ten); the two steps against the Aigles and
// the pass for Samuel's 1-0 (canon). The mud fight and the slips are cutscenes.
import type { ChapterScript } from '../story/session'
import type { ActorSpec } from '../story/types'
import { N, S, T, lion, rival } from './helpers'

const MUD = { mud: true, crowd: 'none' as const }
// the two triangles of bamboo: Kaydoudou's (BriBri, Mireille, Kaydoudou; Ousmane in the middle) and
// the one next to it (Radio, Samuel, Jules)
const TRI_K: [number, number][] = [[17, 12], [19.5, 16.8], [22.2, 11.6]]
const TRI_J: [number, number][] = [[27, 9], [31.5, 8.6], [29.4, 13.2]]
const POLES = [...TRI_K, ...TRI_J].map(([x, y]) => [x - 0.5, y + 0.4] as [number, number])
const drill = { id: 'bona' as const, mood: 'rain' as const, opts: { ...MUD, poles: POLES } }
const silver = { id: 'bona' as const, mood: 'overcast' as const, opts: { ...MUD, poles: POLES } }
const makepe = { id: 'bona' as const, mood: 'overcast' as const, opts: { mud: true, crowd: 'few' as const } }

/** The training in the rain: the Lionceaux at the triangles, Tonton Fokou under the mango tree. */
function training(over: Record<string, Partial<ActorSpec>> = {}, mud = 0.15): ActorSpec[] {
  const m = { mud }
  const base: ActorSpec[] = [
    { id: 'F', cast: 'fokou', at: 'fokou', face: [18, 12], pose: 'sit' },
    { id: 'B', cast: 'bribri', at: TRI_K[0], face: TRI_K[2], number: 8, look: m },
    { id: 'M', cast: 'mireille', at: TRI_K[1], face: TRI_K[0], look: m },
    { id: 'K', cast: 'kaydoudou', at: TRI_K[2], face: TRI_K[0], look: m },
    { id: 'O', cast: 'ousmane', at: [19.6, 12.1], face: TRI_K[0], look: m },
    { id: 'R', cast: 'radio', at: TRI_J[0], face: TRI_J[2], look: m },
    { id: 'SA', cast: 'samuel', at: TRI_J[1], face: TRI_J[0], look: m },
    { id: 'J', cast: 'jules', at: TRI_J[2], face: TRI_J[0], look: m },
    { ...lion('L1', [29.3, 10.2], 1, Math.PI / 2), look: { ...lion('L1', [0, 0], 1).look, ...m } },
  ]
  return base.map((a) => ({ ...a, ...(over[a.id] ?? {}) }))
}

/** Against the Aigles de Makepe (attack right): the same eight as against Bépanda, Jules among them. */
function match(over: Record<string, Partial<ActorSpec>> = {}, mud = 0.3): ActorSpec[] {
  const m = { mud }
  const base: ActorSpec[] = [
    { id: 'F', cast: 'fokou', at: 'fokou', face: [22, 14], pose: 'sit' },
    { id: 'O', cast: 'ousmane', team: 'a', at: [1.6, 14], face: 0, gk: true, look: m },
    { id: 'B', cast: 'bribri', team: 'a', at: [18, 14], face: 0, number: 8, look: m },
    { id: 'R', cast: 'radio', team: 'a', at: [17, 19], face: 0, look: m },
    { id: 'K', cast: 'kaydoudou', team: 'a', at: [24, 7], face: 0, look: m },
    { id: 'M', cast: 'mireille', team: 'a', at: [25, 22], face: 0, look: m },
    { id: 'SA', cast: 'samuel', team: 'a', at: [32, 15], face: 0, look: m },
    { id: 'J', cast: 'jules', team: 'a', at: [9, 10], face: 0, look: m },
    { ...lion('L2', [9, 19], 2, 0), look: { ...lion('L2', [0, 0], 2).look, ...m } },
    rival('A1', 'aigle', [42.4, 14], 1, { gk: true, look: { gloves: '#e9c46a' } }),
    rival('A2', 'aigle', [37, 10], 2), rival('A3', 'aigle', [37, 18], 3), rival('A4', 'aigle', [35, 14], 4),
    rival('A5', 'aigle', [33, 9], 5), rival('A6', 'aigle', [33, 20], 6), rival('A7', 'aigle', [21.5, 9.8], 7),
  ]
  return base.map((a) => ({ ...a, ...(over[a.id] ?? {}) }))
}

export const CH04: ChapterScript = {
  no: 4,
  ball: 'plain',
  beats: [
    /* -------------------------------------------------------------- five in the morning, the first thunder */
    {
      kind: 'scene', id: 'tonnerre', place: { id: 'maison', mood: 'interiorNight', opts: { night: true } },
      cast: [
        { id: 'K', cast: 'kaydoudou', at: [9.6, 5.2], face: Math.PI / 2, pose: 'sit' },
        { id: 'B', cast: 'bribri', at: [9.6, 1.4], face: -Math.PI / 2, pose: 'sit', look: { number: undefined, collar: '#F2EEE3' } },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [11.6, 1.5, 3.3], look: [9.4, 0.9, 4.6], fov: 46 },
          do: [{ a: 'sfx', kind: 'thunder' }, { a: 'pose', id: 'K', pose: 'climb' }],
          play: async (c) => { c.shake(0.6); await c.wait(1.2); c.pose('K', 'sit') },
          parallel: true,
          lines: [
            N("BOUM !"),
            N("Le premier coup de tonnerre fait sauter Kaydoudou si haut qu'il se cogne la tête contre la moustiquaire."),
            N("Puis la pluie arrive. Pas une petite pluie polie qui frappe à la porte. Une pluie de Douala, qui entre sans demander."),
          ],
        },
        {
          cam: { kind: 'on', who: 'K', dist: 1.8 }, do: [{ a: 'pose', id: 'K', pose: 'wave' }],
          lines: [S('kaydoudou', "BriBri ! Tu entends ? Les tôles ! Tac, tac, tac... tatatatata ! Elles font du makossa !")],
        },
        {
          cam: { kind: 'on', who: 'B', dist: 1.8 }, do: [{ a: 'pose', id: 'K', pose: 'sit' }],
          lines: [S('bribri', "Les tôles font de la musique pour personne|. Il est cinq heures du matin."), S('maman', "Fermez les fenêtres !")],
        },
      ],
    },
    /* -------------------------------------------------------------- three days at the window */
    {
      kind: 'scene', id: 'fenetre', place: { id: 'maison', mood: 'interior' },
      cast: [
        { id: 'K', cast: 'kaydoudou', at: [11.7, 3.4], face: 0 },
        { id: 'B', cast: 'bribri', at: [10.6, 2.2], face: 0.5, look: { number: undefined, collar: '#F2EEE3' } },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [9.4, 1.35, 4.6], look: [12.2, 1.05, 3.2], fov: 42 },
          lines: [
            N("Il pleut toute la journée. Et le lendemain. Et le surlendemain. Kaydoudou passe son temps le nez collé à la vitre."),
            S('kaydoudou', "Regarde, BriBri ! La rue est devenue une rivière !"),
            S('bribri', "Une rivière couleur de thé."),
            S('kaydoudou', "Et le benskin, là ! Le monsieur derrière lève les pieds comme un danseur !"),
          ],
        },
        {
          cam: { kind: 'on', who: ['K', 'B'], dist: 2.4 },
          do: [{ a: 'face', id: 'K', to: 'B' }, { a: 'pose', id: 'K', pose: 'point' }],
          lines: [
            N("Puis Kaydoudou compte sur ses doigts."),
            S('kaydoudou', "Samedi, entraînement. Samedi d'après, les Aigles de Makepe. Il faut gagner, hein ?"),
            S('bribri', "Il faut tout gagner|. Tu le sais."),
          ],
        },
        { cam: { kind: 'on', who: 'K', dist: 1.6 }, do: [{ a: 'pose', id: 'K', pose: 'fist' }], lines: [T('kaydoudou', "Et moi, je vais les dribbler tous|. Même sous la pluie.")] },
      ],
    },
    /* -------------------------------------------------------------- the pitch has disappeared */
    {
      kind: 'scene', id: 'mare', place: drill,
      cast: training({
        B: { at: [-2, 6], face: 0 }, M: { at: [-1.4, 7.2], face: 0 }, K: { at: [-0.6, 6.4], face: 0 }, O: { at: [-2.6, 7.6], face: 0 },
        R: { at: [-0.2, 5.2], face: 0 }, SA: { at: [-1.8, 4.8], face: 0 }, J: { at: [-3.2, 6.0], face: 0 }, L1: { at: [-3.4, 4.6], face: 0 },
      }, 0),
      shots: [
        {
          cam: { kind: 'pose', pos: [-6, 2.4, 9], look: [18, 0, 14], fov: 50 },
          lines: [N("Le samedi, les Lionceaux arrivent au terrain. Ils restent plantés au bord, la bouche ouverte.")],
        },
        {
          cam: { kind: 'on', who: 'R', dist: 2.2 }, do: [{ a: 'pose', id: 'R', pose: 'mic' }],
          lines: [S('radio', "Mesdames et messieurs|, le terrain a disparu ! À la place : une mare rouge ! Avec des îles ! Et devant le but, un lac ! On peut pêcher !")],
        },
        {
          cam: { kind: 'pose', pos: [3, 1.4, 11], look: [0, 1.1, 14], fov: 40 }, do: [{ a: 'pose', id: 'R', pose: null }],
          lines: [S('jules', "Le but penche encore plus|. Il va tomber.")],
        },
        { cam: { kind: 'on', who: ['M', 'SA'], dist: 2.6 }, lines: [S('mireille', "On ne peut pas jouer là-dedans"), S('samuel', "On ne peut pas jouer là-dedans")] },
        {
          cam: { kind: 'on', who: 'F', dist: 3 },
          play: async (c) => { c.pose('F', null); await c.wait(0.6); c.go('F', [1.2, 0.4], 0.25) },
          parallel: true,
          lines: [
            S('fokou', "Houou !"),
            N("Tonton Fokou sort de sous le manguier avec son bidon jaune, sa casquette et un grand sourire. Kaydoudou trouve ce sourire très suspect."),
            S('fokou', "Bien sûr qu'on peut jouer ! C'est même le meilleur jour de l'année !"),
          ],
        },
      ],
    },
    /* -------------------------------------------------------------- in the mud, nothing rolls */
    {
      kind: 'scene', id: 'glisse', place: drill,
      cast: training({ K: { at: [12, 8], face: 0, ball: true }, R: { at: [15.2, 8.2], face: Math.PI }, F: { at: [1.2, 0.4], face: [12, 8], pose: null } }, 0.1),
      shots: [
        {
          cam: { kind: 'follow', who: 'K', dist: 4.5, height: 2.2 },
          play: async (c) => { await c.move('K', [14.2, 8.1], 0.35); c.stop('K') },
          lines: [
            N("Kaydoudou comprend vite pourquoi le sourire est suspect."),
            N("Dans la boue, le ballon ne roule plus. Il glisse un peu, puis s'arrête d'un coup, collé. Comme un escargot qui change d'avis."),
          ],
        },
        {
          cam: { kind: 'on', who: ['K', 'R'], dist: 3.2, height: 1.2 },
          play: async (c) => { await c.wait(0.8); c.pose('K', 'slip'); c.sfx('splash'); c.shake(0.15) },
          parallel: true,
          lines: [N("Kaydoudou tente son crochet du margouillat. Stop, petit coup de tête, et... ses pieds partent sans lui. Splatch ! Il tombe assis dans une flaque.")],
        },
        { cam: { kind: 'on', who: 'K', dist: 1.9, height: 0.9 }, do: [{ a: 'pose', id: 'K', pose: 'sitGround' }], lines: [S('kaydoudou', "Aïe ! Ma flaque ! Enfin, mes fesses !")] },
        {
          cam: { kind: 'on', who: ['K', 'R'], dist: 3 },
          play: async (c) => {
            c.pose('K', null); await c.wait(0.6)
            c.give('K'); c.face('K', 'R')
            await c.pass('K', [15.3, 8.2], { arrive: 2.5 })
            c.place([15.25, 8.25]); c.sfx('splash')
          },
          lines: [
            N("Il tente le petit pont sur Radio. Le ballon s'enfonce dans la boue entre les jambes de Radio. Il ne ressort pas."),
            S('radio', "Le dribbleur fou de Bonamoussadi a été avalé par la boue !|On n'a plus de nouvelles de lui ! Prévenez sa famille !"),
          ],
        },
        {
          cam: { kind: 'on', who: 'K', dist: 2 }, do: [{ a: 'pose', id: 'R', pose: 'laugh' }, { a: 'pose', id: 'K', pose: 'dejected' }],
          lines: [N("Tout le monde rit. Même Kaydoudou, un peu, en essuyant ses sourcils. Mais au fond de lui, quelque chose commence à bouder.")],
        },
      ],
    },
    /* -------------------------------------------------------------- the triangles; « tu n'existes pas » */
    {
      kind: 'scene', id: 'triangles', place: drill, cast: training({ F: { at: [14.6, 13.6], face: [19.5, 13.5], pose: null } }),
      shots: [
        {
          cam: { kind: 'pose', pos: [14, 3.2, 21], look: [22, 0.3, 11], fov: 48 },
          lines: [N("Houou ! Tonton Fokou a planté des bouts de bambou dans la boue, par groupes de trois. Des triangles.")],
        },
        {
          cam: { kind: 'on', who: 'F', dist: 2.8 }, do: [{ a: 'pose', id: 'F', pose: 'point' }],
          lines: [
            S('fokou', "Aujourd'hui, pas de dribble. Interdit. Celui qui dribble fait trois tours du manguier."),
            S('kaydoudou', "Trois tours ?"),
            S('fokou', "Quatre, pour toi. Tu as une tête à dribbler."),
            S('kaydoudou', "Ce n'est pas juste ! Ma tête n'a rien fait !"),
            S('fokou', "Trois joueurs, un à chaque coin du triangle|. Un adversaire au milieu. Les trois se passent le ballon, celui du milieu essaie de l'attraper. C'est simple."),
            S('kaydoudou', "Simple ?"),
            S('fokou', "Simple. Et terrible. Passes au sol ! Le ballon n'est pas un oiseau ! Montre-toi ! Ne te cache pas derrière ton adversaire ! Kaydoudou, avec BriBri et Mireille. Ousmane, au milieu !"),
          ],
        },
        { cam: { kind: 'on', who: ['M', 'O'], dist: 2.8 }, do: [{ a: 'pose', id: 'F', pose: null }], lines: [S('mireille', "Ousmane au milieu ?|Avec ses bras, il prend la moitié du triangle !")] },
        {
          cam: { kind: 'over', who: 'K', to: 'B', dist: 3, height: 1.9 },
          do: [{ a: 'pose', id: 'O', pose: 'open' }, { a: 'pose', id: 'K', pose: 'wave' }, { a: 'face', id: 'O', to: 'B' }],
          play: async (c) => { c.give('B') },
          lines: [
            N("BriBri a le ballon. Kaydoudou tend la main."),
            S('kaydoudou', "Passe !"),
            S('bribri', "Je ne peux pas|. Ousmane est devant toi."),
            N("C'est vrai. Ousmane est juste entre eux deux. Il ne bouge même pas. Ses mains sont ouvertes comme deux portes."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [24.8, 2.6, 9.4], look: [18.6, 0.6, 14.2], fov: 46 },
          play: async (c) => { for (let i = 0; i < 3; i++) { await c.pass('B', 'M'); await c.pass('M', 'B') } },
          parallel: true,
          lines: [
            N("BriBri passe à Mireille. Mireille à BriBri. BriBri à Mireille."),
            S('kaydoudou', "Passe ! Je suis là ! Hé ! Passe !"),
            N("Le ballon ne vient jamais."),
            S('kaydoudou', "Ils m'oublient ! Tonton, ils m'oublient exprès !"),
          ],
        },
        {
          cam: { kind: 'on', who: ['F', 'K'], dist: 2.8 },
          // the cut brings him most of the way: a few limping steps, then he speaks
          play: async (c) => { c.pose('K', null); c.p('F').pos = { x: 18.9, y: 11.5 }; await c.move('F', [21, 10.4], 0.22); c.face('F', 'K'); c.face('K', 'F') },
          lines: [
            N("Tonton Fokou s'approche en boitant dans la boue, les mains dans les poches."),
            S('fokou', "Personne ne t'oublie, Kaydoudou. C'est toi qui as disparu."),
            S('kaydoudou', "Je suis là ! Juste là !"),
            S('fokou', "Tu es là pour toi. Mais pour ton frère, tu es derrière Ousmane. Tu n'existes pas."),
          ],
        },
        {
          cam: { kind: 'on', who: 'K', dist: 1.8 }, do: [{ a: 'pose', id: 'K', pose: 'fist' }],
          lines: [N("Kaydoudou croise les bras."), T('kaydoudou', "Je n'existe pas."), N("C'est la phrase la plus vexante qu'on lui ait jamais dite.")],
        },
        {
          cam: { kind: 'follow', who: 'K', dist: 4, height: 2 },
          play: async (c) => { c.pose('K', null); c.p('K').pos = { x: 21.4, y: 4.2 }; await c.move('K', [21.5, -0.9], 0.3); c.face('K', [22, 10]); c.pose('K', 'sitGround') },
          lines: [N("Il va s'asseoir sur une île de terre sèche, au bord du terrain. Et il boude.")],
        },
      ],
    },
    /* -------------------------------------------------------------- what Jules does: two steps */
    {
      kind: 'scene', id: 'jules', place: drill, keep: true, cast: [],
      shots: [
        { cam: { kind: 'on', who: 'R', dist: 2.4 }, do: [{ a: 'pose', id: 'R', pose: 'mic' }], lines: [S('radio', "Kaydoudou boude, mesdames et messieurs !|Déjà une minute ! Pour lui, c'est un record du monde !")] },
        {
          cam: { kind: 'pose', pos: [22.8, 1.0, 0.6], look: [27.6, 0.8, 10.4], fov: 44 },
          do: [{ a: 'pose', id: 'R', pose: null }],
          play: async (c) => {
            c.give('R')
            for (let i = 0; i < 3; i++) {
              // the one in the middle steps in front of Jules; Jules steps aside; the ball comes
              const j = c.p('J').pos, r = c.p('R').pos
              await c.move('L1', [r.x + (j.x - r.x) * 0.55, r.y + (j.y - r.y) * 0.55], 0.4)
              await c.move('J', [j.x + (i % 2 ? 1.1 : -1.1), j.y + 0.3], 0.5)
              await c.pass('R', 'J'); await c.pass('J', 'SA'); await c.pass('SA', 'R')
            }
          },
          parallel: true,
          lines: [
            N("Autour de lui, les triangles tournent. Les passes claquent dans l'eau."),
            S('radio', "Et Radio tombe !|Magnifique chute de Radio ! Dix sur dix !"),
            N("Et c'est là que Kaydoudou voit la chose."),
            N("Dans le triangle d'à côté, le petit Jules reçoit tous les ballons."),
            S('kaydoudou', "Jules ?|Jules reçoit tout ? Jules, le plus lent de l'équipe ?"),
            N("Il plisse les yeux. Il regarde mieux."),
            N("Chaque fois que l'adversaire du milieu se met devant Jules, Jules fait un pas de côté. Un seul. Parfois deux. Et hop, le chemin entre lui et le porteur se rouvre, comme un rideau qu'on écarte."),
          ],
        },
        {
          cam: { kind: 'on', who: 'K', dist: 1.8, height: 0.9 },
          lines: [T('kaydoudou', "Deux pas|. C'est tout ? Deux pas ?")],
        },
        {
          cam: { kind: 'follow', who: 'K', dist: 4.2, height: 2.2 },
          play: async (c) => { c.pose('K', null); await c.move('K', [22.2, 11.6], 0.55); c.face('K', 'B') },
          lines: [N("Il se lève d'un bond. Il retourne dans son triangle sans rien dire.")],
        },
      ],
    },
    /* -------------------------------------------------------------- two steps: visible (played, canon) */
    {
      kind: 'play', id: 'deuxPas', place: drill, prompt: 'play.supportIntro',
      cast: training({ B: { ball: true } }),
      challenge: {
        type: 'support', player: 'K', carrier: 'B', defender: 'O', partner: 'M', reps: 3,
        setup: async (c) => { c.pose('O', 'open'); c.face('O', 'B'); await c.say([N("BriBri a le ballon. Ousmane se met devant Kaydoudou.")]) },
        openLines: [
          [N("Et tout à coup, il voit le visage de son frère. Tout entier. Sans Ousmane au milieu."), N("Le ballon arrive aussitôt, en glissant sur l'eau."), S('bribri', "Là, je te vois")],
          [N("Floc, floc. Le ballon revient.")],
          [S('kaydoudou', "Deux pas... ballon ! Deux pas... ballon ! Deux pas de l'autre côté... ballon ! Hé, c'est magique ! Je ne demande rien, et il vient tout seul !")],
        ],
        hideLines: [undefined, [N("Ousmane se déplace.")], [N("Pendant dix minutes, Kaydoudou ne fait plus que ça.")]],
        giveLines: [
          [N("Kaydoudou le regarde arriver comme un cadeau d'anniversaire. Il le renvoie à Mireille, au sol.")],
          [
            S('kaydoudou', "Je suis visible !|Tonton ! Je suis redevenu visible !"),
            S('fokou', "Houou ! Le fantôme est revenu chez les vivants !"),
            S('radio', "Mesdames et messieurs|, vous venez de voir... les deux pas du fantôme !"),
          ],
        ],
        after: async (c) => {
          c.cam({ kind: 'on', who: 'O', dist: 2.2 })
          c.pose('O', 'open')
          await c.say([N("Au milieu, Ousmane finit par lever ses grandes mains en l'air."), S('ousmane', "Tu bouges trop"), N("Chez Ousmane, c'est un compliment énorme.")])
          c.pose('O', null)
        },
      },
    },
    /* -------------------------------------------------------------- the little match, still no dribble */
    {
      kind: 'scene', id: 'petitMatch', place: drill,
      cast: [
        { id: 'F', cast: 'fokou', at: [8, -0.6], face: [14, 10], pose: null },
        { id: 'O', cast: 'ousmane', team: 'a', at: [2, 10], face: 0, gk: true, look: { mud: 0.3 } },
        { id: 'B', cast: 'bribri', team: 'a', at: [12, 9], face: 0, number: 8, look: { mud: 0.3 } },
        { id: 'K', cast: 'kaydoudou', team: 'a', at: [16, 4], face: 0, look: { mud: 0.35 } },
        { id: 'M', cast: 'mireille', team: 'a', at: [15, 16], face: 0, look: { mud: 0.3 } },
        { id: 'SA', cast: 'samuel', team: 'b', at: [18, 10], face: Math.PI, look: { mud: 0.3 } },
        { id: 'R', cast: 'radio', team: 'b', at: [22, 6], face: Math.PI, look: { mud: 0.4 } },
        { id: 'J', cast: 'jules', team: 'b', at: [22, 14], face: Math.PI, look: { mud: 0.3 } },
        { ...lion('L1', [26, 10], 1, Math.PI), team: 'b' as const, look: { ...lion('L1', [0, 0], 1).look, mud: 0.3 } },
        { ...lion('L2', [8, 14], 2, 0), look: { ...lion('L2', [0, 0], 2).look, mud: 0.3 } },
        { ...lion('L3', [29, 10], 3, Math.PI), team: 'b' as const, gk: true, look: { ...lion('L3', [0, 0], 3).look, mud: 0.3 } },
      ],
      shots: [
        { cam: { kind: 'on', who: 'F', dist: 3 }, do: [{ a: 'pose', id: 'F', pose: 'point' }], lines: [S('fokou', "Petit match !|Cinq contre cinq ! Et toujours pas de dribble !")] },
        {
          cam: { kind: 'match' }, do: [{ a: 'pose', id: 'F', pose: null }, { a: 'sfx', kind: 'whistle' }],
          play: async (c) => {
            c.give('R'); c.go('O', [2, 9], 0.7)
            await c.shot('R', [0.2, 9.4], { height: 1.2, speed: 13 })
            c.pose('O', 'catch'); await c.wait(0.6); c.pose('O', null)
            c.give('O'); c.go('M', [21, 17], 0.9)
            await c.pass('O', 'M', { lofted: true, flight: 1.4 })
            c.go('SA', [27.5, 11], 0.95)
            await c.move('M', [24.5, 15], 0.95)
            await c.pass('M', 'SA', { lofted: true, flight: 0.9 })
            await c.shot('SA', [29.2, 11.4], { height: 1.4, speed: 12 })
          },
          lines: [
            N("Radio commente tout, même en courant."),
            S('radio', "Arrêt de Petit Pied !|D'une seule main ! Comme on attrape une mangue qui tombe ! Et voici la Gazelle sur une île de terre sèche ! Elle démarre ! Son défenseur reste planté, un pied dans la boue et l'autre en l'air ! Samuel, de la tête... BUT !"),
          ],
        },
        {
          cam: { kind: 'on', who: ['R', 'M'], dist: 3.4 },
          play: async (c) => { c.give('R'); await c.pass('R', 'J') },
          lines: [
            N("Puis Radio fait une passe. Une vraie. Sans un mot."),
            S('mireille', "Radio a fait une passe sans parler !|Appelez un docteur !"),
          ],
        },
        { cam: { kind: 'on', who: ['B', 'K'], dist: 2.6 }, do: [{ a: 'face', id: 'B', to: 'K' }, { a: 'face', id: 'K', to: 'B' }], lines: [S('bribri', "Tu as touché plus de ballons aujourd'hui qu'en un mois|. Sans dribbler une seule fois.")] },
        {
          cam: { kind: 'on', who: 'K', dist: 2.2 },
          lines: [N("Kaydoudou regarde tout le monde, couvert de boue. Il a une drôle de sensation dans le ventre. Comme si, au milieu de cette mare, quelque chose venait de naître. Pas un joueur. Une équipe.")],
        },
      ],
    },
    /* -------------------------------------------------------------- the greatest mud fight in Bonamoussadi */
    {
      kind: 'scene', id: 'bataille', place: silver,
      cast: training({
        F: { at: 'fokou', face: [6, 4], pose: 'sit' },
        B: { at: [5.4, 3.2], face: 1.2 }, K: { at: [4.0, 5.0], face: 0.4 }, M: { at: [7.4, 6.4], face: Math.PI },
        R: { at: [3.2, 7.4], face: -0.4 }, SA: { at: [6.6, 8.6], face: -2.2 }, O: { at: [4.6, 6.8], face: 0 },
        J: { at: [8.6, 4.4], face: 2.6 }, L1: { at: [2.4, 3.6], face: 0.8 },
      }, 0.55),
      shots: [
        {
          cam: { kind: 'pose', pos: [12, 3.4, 14], look: [4, 0.6, 3], fov: 50 },
          lines: [N("La pluie s'arrête. Le ciel devient gris argent. Toutes les flaques brillent."), S('fokou', "Bon|. Allez vous laver.")],
        },
        {
          cam: { kind: 'on', who: ['M', 'K', 'R'], dist: 4.2 },
          play: async (c) => { await c.wait(0.6); await c.fling('M', 'K') },
          lines: [N("C'est Mireille qui lance la première poignée de boue. Elle vise Radio. Elle touche Kaydoudou."), S('kaydoudou', "Hé !"), S('mireille', "Pardon, Kaydoudou ! C'était pour Radio !")],
        },
        {
          cam: { kind: 'on', who: ['K', 'SA'], dist: 4.6 },
          play: async (c) => { await c.fling('K', 'SA'); await c.wait(0.5); await c.fling('SA', 'F', { dur: 1.2 }); c.pose('F', 'dejected') },
          lines: [N("Kaydoudou riposte. Il touche Samuel. Samuel lance une poignée énorme... qui passe au-dessus de tout le monde."), N("Et s'écrase sur la casquette de Tonton Fokou.")],
        },
        {
          cam: { kind: 'on', who: 'F', dist: 2 },
          do: [{ a: 'pose', id: 'F', pose: 'sit' }],
          lines: [
            N("Silence total."),
            N("Tonton Fokou retire lentement sa casquette. Il la regarde. Il la remet. De la boue coule sur son front."),
            S('fokou', "Qui a fait ça ?"),
            N("Personne ne répond."),
          ],
        },
        {
          cam: { kind: 'on', who: 'F', dist: 2.6 },
          play: async (c) => { c.pose('F', 'open'); await c.wait(2.5); c.pose('F', null); await c.fling('F', 'SA') },
          lines: [
            N("Tonton Fokou lève les bras au ciel."),
            S('fokou', "Bande de crapauds ! Vous allez voir !"),
            N("Mais sous la boue, sa bouche sourit déjà. Tout le monde le voit. Il se penche, ramasse une poignée de boue, et vise Samuel."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [10, 2.2, 10], look: [4.6, 1.0, 5.2], fov: 48 },
          play: async (c) => {
            c.pose('O', 'palm'); c.pose('K', 'laugh')
            const throws: [string, string][] = [['K', 'O'], ['R', 'J'], ['J', 'K'], ['M', 'R'], ['L1', 'M'], ['K', 'L1'], ['SA', 'K'], ['K', 'R']]
            for (const [a, b] of throws) { void c.fling(a, b); await c.wait(0.45) }
            c.pose('K', 'laugh')
          },
          parallel: true,
          lines: [
            S('radio', "Bataille de boue !|Tonton Fokou entre sur le terrain !"),
            N("C'est la plus grande bataille de boue de l'histoire de Bonamoussadi."),
            N("Kaydoudou, l'afro pleine de boue et les chaussettes devenues brunes, lance poignée sur poignée en riant aux éclats. À côté de lui, Ousmane se protège le visage avec ses paumes immenses."),
            N("Sous le manguier, Tonton Fokou crie encore « Crapauds ! », les bras levés. Mais il sourit."),
            S('kaydoudou', "Ousmane ! Arrête de tout arrêter !"),
          ],
        },
        {
          cam: { kind: 'on', who: 'B', dist: 2.4 },
          play: async (c) => { c.go('B', [6.6, 2.4], 0.2); await c.wait(2.2); for (const a of ['R', 'K', 'M']) { void c.fling(a, 'B'); await c.wait(0.35) } },
          parallel: true,
          lines: [S('bribri', "Pas moi|. Pas moi, je reste propre, je..."), N("Splatch. Splatch. Splatch."), S('bribri', "... je ne suis plus propre.")],
        },
        {
          cam: { kind: 'pose', pos: [14, 1.7, 3], look: [10, 1.2, -2], fov: 44 },
          play: async (c) => { await c.wait(0.8); await c.fling('K', [10.4, -2.4], { dur: 0.9 }) },
          parallel: true,
          lines: [
            N("Même Madame Ekotto, qui passe sous son parapluie, reçoit une éclaboussure."),
            S('ekotto', "Plus jamais de beignets pour personne !"),
            N("Puis elle éclate de rire."),
            N("Ce soir-là, toutes les mères du quartier jurent qu'elles iront dire deux mots à Tonton Fokou."),
          ],
        },
      ],
    },
    /* -------------------------------------------------------------- the ten passes with Mami's ball (played, canon) */
    {
      kind: 'scene', id: 'echauffement', place: makepe,
      cast: match({ K: { at: [10, 6], face: Math.PI / 2, carry: true, pose: 'hold' }, B: { at: [10, 8.4], face: -Math.PI / 2 }, M: { at: [11.6, 7.4], face: Math.PI }, O: { at: [8.6, 7.6], face: 0, gk: false } }, 0),
      shots: [
        {
          cam: { kind: 'pose', pos: [2, 3, 20], look: [20, 0.5, 10], fov: 50 },
          do: [{ a: 'ballLook', look: 'mamiPatched' }],
          lines: [N("Le samedi suivant, c'est le deuxième match de poule. Contre les Aigles de Makepe. Le terrain est encore lourd, collant, plein de flaques.")],
        },
        {
          cam: { kind: 'on', who: ['K', 'M'], dist: 2.6 },
          lines: [
            N("Pendant l'échauffement, Kaydoudou sort le ballon de Mami de son sac."),
            S('mireille', "Tu ne vas pas jouer avec ça ?"),
            S('kaydoudou', "Non. Il part de travers, avec sa bosse. Et il est trop précieux. Je veux juste le toucher. Pour la chance."),
          ],
        },
        {
          cam: { kind: 'on', who: ['K', 'B'], dist: 2.4 }, do: [{ a: 'face', id: 'K', to: 'B' }],
          lines: [
            N("Il se tourne vers son frère."),
            S('kaydoudou', "BriBri. Dix passes. Sans qu'il touche le sol."),
            N("BriBri regarde le ballon. Puis la boue, partout autour."),
            S('bribri', "S'il tombe, il va être sale."),
            S('kaydoudou', "Alors il ne tombera pas."),
          ],
        },
      ],
    },
    {
      kind: 'play', id: 'dixPasses', place: makepe, prompt: 'play.tenIntro', keep: true, cast: [],
      challenge: {
        type: 'juggle', players: ['K', 'B'], count: 10, ball: 'K',
        lines: [N("Kaydoudou lance le ballon en l'air. BriBri le reprend du pied, le remonte sur sa cuisse, le renvoie. Kaydoudou le reçoit de la tête.")],
        calls: {
          3: [S('lion', "Un ! Deux ! Trois !", 'L2'), N("Mireille et Ousmane comptent avec eux. Puis Radio. Puis toute l'équipe.")],
          7: [S('lion', "Quatre ! Cinq ! Attention, il part de travers ! Six ! Sept ! Rattrape-le, BriBri !", 'L2')],
          8: [N("BriBri plonge presque. Bout du pied. Le ballon remonte.")],
          10: [S('lion', "Huit ! Neuf ! DIX !", 'L2')],
        },
      },
    },
    {
      kind: 'scene', id: 'propre', place: makepe, keep: true, cast: [],
      shots: [
        {
          cam: { kind: 'on', who: ['B', 'K'], dist: 2.2 },
          play: async (c) => { c.release(); c.carry('B') },
          lines: [N("BriBri attrape le ballon à deux mains. Il est propre."), S('kaydoudou', "Propre !|Je te l'avais dit !")],
        },
        {
          cam: { kind: 'on', who: ['B', 'K'], dist: 1.8, height: 1.0 },
          play: async (c) => {
            c.release(); c.place([10, 12.5])
            c.face('B', 'K'); c.face('K', 'B'); c.pose('B', 'fist'); c.pose('K', 'fist'); c.sfx('touch')
            await c.wait(1.4); c.pose('B', 'heart'); c.pose('K', 'heart')
          },
          parallel: true,
          lines: [
            N("Les frères se regardent. Poing contre poing. Main sur le cœur."),
            N("Sans se le dire, ils savent qu'ils le referont avant chaque grand match."),
          ],
        },
        {
          cam: { kind: 'on', who: ['F', 'K'], dist: 3 },
          do: [{ a: 'pose', id: 'B', pose: null }, { a: 'pose', id: 'K', pose: null }, { a: 'ballLook', look: 'plain' }],
          lines: [S('fokou', "Rappelez-vous|. Montrez-vous !"), S('kaydoudou', "Deux pas, Tonton|. Je sais.")],
        },
      ],
    },
    /* -------------------------------------------------------------- a match of mud */
    {
      kind: 'scene', id: 'aigles', place: makepe, cast: match(),
      shots: [
        {
          cam: { kind: 'wide', height: 18 }, do: [{ a: 'ball', at: [22, 14] }, { a: 'sfx', kind: 'whistle' }],
          play: async (c) => {
            for (const id of ['A2', 'A3', 'A4', 'A5', 'A6']) c.go(id, [36 + Math.random() * 3, 9 + Math.random() * 10], 0.5)
            c.give('B'); await c.pass('B', 'R'); await c.pass('R', 'M'); await c.pass('M', 'B')
          },
          parallel: true,
          lines: [
            N("Le match est serré, laid, mouillé. Les Aigles de Makepe défendent tous devant leur but, serrés comme des crabes dans leur trou."),
            S('radio', "Kaydoudou ne dribble presque pas !|Mesdames et messieurs, il a peur des quatre tours de manguier !"),
          ],
        },
        {
          cam: { kind: 'match' },
          play: async (c) => { c.give('M'); await c.pass('M', [33, 17], { arrive: 1.5 }); c.place([32.4, 16.6]); c.sfx('splash') },
          lines: [N("Le ballon s'arrête dans les flaques. À la mi-temps, c'est toujours 0-0."), S('radio', "Ce n'est pas un match de foot|. C'est un match de boue.")],
        },
        { cam: { kind: 'on', who: 'F', dist: 3 }, do: [{ a: 'score', text: '0 - 0' }], lines: [N("Les minutes filent. Toujours rien.")] },
      ],
    },
    /* -------------------------------------------------------------- two steps, three minutes from the end (played, canon) */
    {
      kind: 'play', id: 'fantome', place: makepe, prompt: 'play.eagleIntro',
      cast: match({ B: { at: [17, 14], ball: true }, K: { at: [24.5, 7.4] }, A7: { at: [20.4, 10.2], face: 'B' }, SA: { at: [33.5, 13.6] }, A4: { at: [36, 16.5] } }),
      challenge: {
        type: 'support', player: 'K', carrier: 'B', defender: 'A7', partner: 'B', reps: 1, finish: 'SA', slow: 0.45, prompt: 'play.supportEagle',
        setup: async (c) => {
          c.score('0 - 0')
          c.cam({ kind: 'match' })
          await c.say([
            S('radio', "Plus que trois minutes !|BriBri récupère le ballon au milieu !"),
            N("Kaydoudou est à gauche. Mais un Aigle se tient juste entre eux, les bras écartés."),
            N("Avant, Kaydoudou aurait crié « Passe ! ». Et le ballon ne serait jamais venu."),
          ])
          c.pose('A7', 'open')
          c.cam({ kind: 'over', who: 'K', to: 'B', dist: 3.4, height: 1.8 })
          await c.say([
            N("Tout devient lent, comme dans un rêve."),
            N("Kaydoudou entend la pluie qui goutte du manguier. Il sent la boue froide dans ses baskets. Il voit l'Aigle, le dos tourné, qui regarde BriBri."),
            T('kaydoudou', "Deux pas."),
          ])
        },
        openLines: [[
          N("Floc."), N("Floc."),
          N("Le visage de son frère apparaît. Leurs yeux se croisent. Un éclair."),
          N("Le ballon part. Au sol. Il glisse sur l'eau."),
          N("L'Aigle se retourne. Trop tard."),
          N("Kaydoudou lève la tête. Samuel est seul au point de penalty."),
        ]],
        giveLines: [[N("Il ne dribble pas. Il ne réfléchit même pas. Intérieur du pied. Droit, simple, au sol.")]],
        after: async (c) => {
          c.pose('A7', null)
          c.cam({ kind: 'on', who: ['SA', 'A1'], dist: 4.2 })
          c.go('A1', [43, 15.2], 0.6)
          await c.shot('SA', [44, 13.2], { height: 0.2, speed: 8 })
          c.sfx('net'); c.score('1 - 0')
          await c.say([
            N("Samuel n'a plus qu'à pousser le ballon dans le but. Les bambous tremblent."),
            S('radio', "BUUUT !|1-0 ! Samuel ! Sur une passe de... Kaydoudou ? Kaydoudou a fait une passe ? Mesdames et messieurs, vérifiez vos oreilles !"),
          ])
          c.cam({ kind: 'on', who: ['SA', 'K'], dist: 3.2 })
          c.go('SA', [c.p('K').pos.x + 1.2, c.p('K').pos.y + 0.6], 0.8)
          c.pose('SA', 'wave')
          await c.say([S('samuel', "Merci, Kaydoudou !|Merci !")])
          c.pose('SA', null)
          c.cam({ kind: 'on', who: 'F', dist: 3 })
          c.pose('F', 'open')
          await c.say([S('fokou', "Houou !|Le fantôme a fait une passe !")])
          c.pose('F', 'sit')
        },
      },
    },
    /* -------------------------------------------------------------- « J'ai passé ! » */
    {
      kind: 'scene', id: 'jaiPasse', place: makepe, keep: true, cast: [],
      shots: [
        {
          cam: { kind: 'on', who: 'F', dist: 3.2 }, do: [{ a: 'sfx', kind: 'whistle' }, { a: 'score', text: '1 - 0' }],
          lines: [N("Tonton Fokou siffle la fin trois minutes plus tard. Première victoire du tournoi. Il reste un match de poule, contre les Cobras de Bonabéri.")],
        },
        {
          cam: { kind: 'follow', who: 'K', dist: 5, height: 2.6 },
          play: async (c) => {
            c.pose('K', 'celebrate')
            const path: [number, number][] = [[20, 10], [14, 14], [8, 9], [3, 4]]
            for (const p of path) await c.move('K', p, 0.8)
          },
          parallel: true,
          lines: [
            N("Mais Kaydoudou n'entend plus rien. Il court dans la boue, les bras en l'air. Il crie à tous ceux qui veulent l'entendre. Aux joueurs, aux spectateurs, aux benskins, au manguier."),
            S('kaydoudou', "J'ai passé ! Vous avez vu ? J'ai passé !"),
          ],
        },
      ],
    },
    { kind: 'lesson', no: 4 },
  ],
}
