// Chapitre 1, « Le ballon rapiécé » (POV BriBri). Source: tome1/chapters/01-le-ballon-rapiece.md.
// Every line is the chapter's text. Played: the walk before the match (bridge: the book tells the
// ball loan as a memory), Kaydoudou's five dribbles lost to the sixth Gars (canon), BriBri's one
// touch to Radio (canon). Cutscenes: the 1-2, Mireille's 2-2, the « frappe du tonnerre » onto
// Monsieur Bilé's barbed wire, the evening with Papa's 1990 video, the first secret lesson.
import type { ChapterScript } from '../story/session'
import type { ActorSpec, Pt } from '../story/types'
import { N, S, T, lion, rival } from './helpers'

const bona = { id: 'bona' as const, mood: 'morning' as const, opts: { crowd: 'few' } }
const PITCH_FACE: Pt = [22, 14]

/** The Lionceaux and the Gars de la Pharmacie on the red earth (Lionceaux attack to the right). */
function match(over: Record<string, Partial<ActorSpec>> = {}, extra: ActorSpec[] = []): ActorSpec[] {
  const base: ActorSpec[] = [
    { id: 'F', cast: 'fokou', at: 'fokou', face: PITCH_FACE, pose: 'sit' },
    { id: 'B', cast: 'bribri', team: 'a', at: [18, 13], face: 0, number: 8 },
    { id: 'K', cast: 'kaydoudou', team: 'a', at: [13, 6], face: 0 },
    { id: 'R', cast: 'radio', team: 'a', at: [17, 19], face: 0 },
    { id: 'M', cast: 'mireille', team: 'a', at: [26, 14], face: 0 },
    { id: 'O', cast: 'ousmane', team: 'a', at: [1.6, 14], face: 0, gk: true },
    lion('L1', [8, 9], 1, 0), lion('L2', [8, 19], 2, 0), lion('L3', [12, 23], 3, 0),
    rival('G1', 'gars', [42.4, 14], 1, { gk: true, look: { shirt: '#3b8a6e', gloves: '#e9e3d6' } }),
    rival('G2', 'gars', [17, 7], 2), rival('G3', 'gars', [20.5, 8.5], 3), rival('G4', 'gars', [24, 5.5], 4),
    rival('G5', 'gars', [27.5, 8], 5), rival('G6', 'gars', [31, 6], 6),
    rival('G7', 'gars', [36, 6.5], 7, { look: { height: 0.84 } }),
    rival('G8', 'gars', [30, 19], 8),
  ]
  return [...base.map((a) => ({ ...a, ...(over[a.id] ?? {}) })), ...extra]
}

export const CH01: ChapterScript = {
  no: 1,
  ball: 'mami',
  beats: [
    /* -------------------------------------------------------------- arrival */
    {
      kind: 'scene', id: 'samedi', place: bona,
      cast: match({ K: { at: [-0.6, -1.4], face: 'F', pose: 'hold', carry: true }, B: { at: [20, 26.5], face: -Math.PI / 2 }, M: { at: [24, 12] }, R: { at: [22.5, 13.5], face: 'M' } }),
      shots: [
        {
          cam: { kind: 'pose', pos: [-14, 13, 44], look: [20, 0, 10], to: { pos: [4, 5.5, 34], look: [16, 1, 8] }, dur: 9 },
          do: [{ a: 'sfx', kind: 'whistle' }],
          lines: [
            N("Samedi matin, terrain de Bonamoussadi. Dix jours sans pluie à Douala, du jamais vu. La terre rouge est devenue de la poudre. Elle colle aux chevilles, aux genoux, jusqu'aux cils."),
            N("Derrière le manguier, les benskins, les motos-taxis, klaxonnent. Pin-pin !"),
          ],
        },
      ],
    },
    /* -------------------------------------------------------------- before the match (bridge) */
    {
      kind: 'explore', id: 'avantMatch', place: bona, bridge: true, player: 'B',
      cast: match({ K: { at: [-0.6, -1.4], face: 'F', pose: 'hold', carry: true }, B: { at: [20, 26.5], face: -Math.PI / 2 }, M: { at: [24, 12] }, R: { at: [22.5, 13.5], face: 'M' } }),
      talks: [
        {
          id: 'F', lines: [
            S('fokou', "Le ballon du club est mort mardi|. Un tesson de bouteille. Paix à son âme. BriBri, Kaydoudou, vous prêtez le vôtre ?"),
            S('kaydoudou', "Le ballon de Mami ?|Du vrai cuir, Tonton ! Cousu à la main !"),
            S('fokou', "Alors on le traite comme une reine"),
            N("Leur grand-mère le leur a offert il y a trois ans. Il est devenu doux et brun, comme une vieille chaussure."),
            T('bribri', "Personne ne lui fait de mal|. Personne."),
          ],
        },
        {
          id: 'K', lines: [
            N("Avant le match, il a annoncé :"),
            S('kaydoudou', "Aujourd'hui, je dribble toute la ville !"),
            S('bribri', "Aujourd'hui, on gagne|. C'est mieux."),
          ],
        },
      ],
      require: ['F', 'K'],
      goal: { at: [18, 13], r: 1.6, prompt: 'explore.kickoff' },
    },
    /* -------------------------------------------------------------- the match, 1-1 */
    {
      kind: 'scene', id: 'unPartout', place: bona,
      cast: match({ B: { at: [16, 13] } }, []),
      shots: [
        {
          cam: { kind: 'match' },
          do: [{ a: 'ball', at: 'L1' }],
          play: async (c) => {
            await c.pass('L1', 'B'); await c.pass('B', 'R'); await c.pass('R', 'L2'); await c.pass('L2', 'L1')
          },
          parallel: true,
          lines: [
            S('fokou', "Houou !"),
            N("Le sifflet de Tonton Fokou ne fait pas « tuuut » comme les autres. Il fait « houou », comme un hibou enrhumé."),
            S('fokou', "Le ballon doit voyager !"),
            N("Troisième fois en cinq minutes. BriBri sourit."),
          ],
        },
        {
          cam: { kind: 'on', who: 'R', side: 0.6 }, do: [{ a: 'pose', id: 'R', pose: 'mic' }],
          lines: [
            S('radio', "Un partout, mesdames et messieurs !|Lionceaux de Bonamoussadi contre Gars de la Pharmacie ! Au milieu, le numéro 8, BriBri ! Il ne crie jamais, mais il voit tout !"),
            N("Prosper, tout le monde l'appelle Radio."),
          ],
        },
        { cam: { kind: 'on', who: 'M' }, do: [{ a: 'face', id: 'M', to: 'R' }], lines: [S('mireille', "Radio, tu joues ou tu parles ?")] },
        { cam: { kind: 'on', who: 'R', side: -0.4 }, lines: [S('radio', "Les deux, Gazelle ! Je suis un professionnel !")] },
        {
          cam: { kind: 'on', who: 'B', dist: 3, side: 0.3 }, do: [{ a: 'pose', id: 'R', pose: null }, { a: 'pose', id: 'B', pose: 'palm' }],
          lines: [
            N("BriBri a douze ans. Grand et mince, une raie fine à gauche, le 8 vert délavé sur le dos. Il parle avec les mains. Paume vers le sol : doucement. Bras tendu : là-bas, quelqu'un est seul."),
            N("Ce matin, il surveille aussi autre chose. Le ballon."),
          ],
        },
        {
          cam: { kind: 'on', who: 'K', dist: 2.8 }, do: [{ a: 'pose', id: 'B', pose: null }],
          lines: [
            S('radio', "Et sur la gauche|, son petit frère, Kaydoudou ! Dix ans ! Une chaussette rouge, une chaussette jaune !"),
            S('kaydoudou', "Ça porte bonheur !"),
            N("« Il perd exprès l'autre moitié de chaque paire », dit toujours Maman."),
            N("Des joues rondes. Une petite afro qui rebondit à chaque pas. Un sourire avec un trou entre les dents de devant. Même immobile, Kaydoudou reste sur la pointe des pieds."),
          ],
        },
        {
          cam: { kind: 'over', who: 'B', to: 'K', dist: 2 },
          play: async (c) => { await c.pass('L1', 'K', { arrive: 4 }) },
          lines: [
            N("Le ballon arrive sur la gauche. Dans les pieds de Kaydoudou."),
            N("BriBri voit les épaules de son frère se soulever. Il sait ce qui va se passer. Tout le quartier le sait."),
          ],
        },
      ],
    },
    /* -------------------------------------------------------------- five dribbles (played, canon) */
    {
      kind: 'play', id: 'cinq', place: bona, prompt: 'play.dribbleIntro',
      cast: match({ K: { ball: true }, M: { at: [27, 15], pose: 'open', face: Math.PI / 2 }, B: { at: [21, 16], face: 'M' } }),
      challenge: {
        type: 'dribble', carrier: 'K', defenders: ['G2', 'G3', 'G4', 'G5', 'G6'], end: 'lose', loseTo: 'G7', dir: 1,
        intro: [
          N("Premier défenseur. Stop. Petit coup de tête, comme un lézard sur un mur. Et hop, de l'autre côté."),
        ],
        calls: [
          S('radio', "Le crochet du margouillat !"),
          S('radio', "Et le petit pont ! Le ballon entre les jambes, et bonjour !"),
          S('radio', "Et la toupie ! Regardez l'afro, elle n'arrive pas à suivre !"),
          S('radio', "Quatre !"),
          S('radio', "CINQ ! Il en a dribblé CINQ ! Il va dribbler tout Douala ! Et peut-être Yaoundé !"),
        ],
        loseLines: [
          N("Mais BriBri, lui, ne regarde pas son frère. Il regarde Mireille, seule au milieu, les bras écartés. Personne ne la surveille."),
          T('bribri', "Passe, Kaydoudou. Passe."),
          N("Le sixième Gars est le plus petit de tous. Il tend juste le pied. Et le ballon, fatigué d'avoir tant tourné, s'arrête contre sa chaussure."),
        ],
      },
    },
    /* -------------------------------------------------------------- 1-2 and Tonton Fokou */
    {
      kind: 'scene', id: 'chezEux', place: bona,
      cast: match({ G7: { at: [30, 7], ball: true }, G4: { at: [22, 11] }, G8: { at: [12, 17] }, K: { at: [31, 5] }, B: { at: [20, 15] }, O: { at: [2, 14] }, L1: { at: [10, 12] }, L2: { at: [9, 21] } }),
      shots: [
        {
          cam: { kind: 'match' },
          play: async (c) => {
            await c.pass('G7', 'G4'); await c.pass('G4', 'G8'); c.go('O', [1.4, 16.2], 0.9); await c.shot('G8', [0, 15.6], { height: 0.4, speed: 14 })
          },
          lines: [N("Trois passes plus tard, les Gars de la Pharmacie marquent.")],
        },
        { cam: { kind: 'on', who: 'R' }, do: [{ a: 'score', text: '1 - 2' }, { a: 'pose', id: 'R', pose: 'mic' }], lines: [S('radio', "1-2 !|Le ballon est rentré à la maison, mesdames et messieurs. Chez les Gars.")] },
        { cam: { kind: 'on', who: 'B', dist: 2.6 }, do: [{ a: 'pose', id: 'R', pose: null }, { a: 'pose', id: 'B', pose: 'shrug' }], lines: [N("BriBri pousse un soupir qui part de ses chaussures et remonte jusqu'à ses oreilles.")] },
        {
          cam: { kind: 'on', who: 'F', dist: 3.2, side: 0.2 }, do: [{ a: 'pose', id: 'B', pose: null }, { a: 'pose', id: 'F', pose: null }, { a: 'face', id: 'F', to: 'K' }],
          lines: [
            N("Sous le manguier, Tonton Fokou se lève de son bidon jaune. Soixante-deux ans, une casquette si usée qu'on ne sait plus sa couleur, une jambe qui boite un peu."),
            S('fokou', "Kaydoudou ! Tu as dribblé cinq joueurs. Bravo. Et le ballon, il est où ?"),
          ],
        },
        {
          cam: { kind: 'on', who: 'O', dist: 3 },
          play: async (c) => { c.release(); c.place([0.6, 15.4]); await c.move('O', [1.0, 15.2], 0.25); c.carry('O') },
          lines: [N("Derrière leur but, Ousmane ramasse le ballon en traînant les pieds.")],
        },
        { cam: { kind: 'on', who: 'K' }, do: [{ a: 'face', id: 'K', to: 'F' }], lines: [S('kaydoudou', "Chez eux, Tonton.")] },
        { cam: { kind: 'on', who: 'F', side: -0.3 }, do: [{ a: 'pose', id: 'F', pose: 'point' }], lines: [S('fokou', "Voilà ! Tu l'as promené dans tout le quartier, et à la fin il est rentré chez eux ! Le ballon n'est pas un cabri qu'on promène au bout d'une corde ! Il doit voyager !")] },
        { cam: { kind: 'on', who: 'K' }, do: [{ a: 'pose', id: 'F', pose: null }, { a: 'pose', id: 'K', pose: 'shrug' }], lines: [S('kaydoudou', "Mais c'était beau, non ?")] },
        { cam: { kind: 'on', who: 'M' }, do: [{ a: 'pose', id: 'K', pose: null }, { a: 'move', id: 'M', to: [29, 9], speed: 0.3 }], lines: [S('mireille', "Très beau|. Comme un gâteau qui tombe par terre.")] },
        {
          cam: { kind: 'on', who: 'B', dist: 2.2 },
          lines: [N("BriBri ne dit rien. Il ne dit jamais rien."), T('bribri', "Avec ce ballon, j'aurais été devant le but en deux passes|. Peut-être une.")],
        },
      ],
    },
    /* -------------------------------------------------------------- Ousmane's save, Mireille's 2-2 */
    {
      kind: 'scene', id: 'gazelle', place: bona,
      cast: match({
        G3: { at: [16, 13], ball: true }, G2: { at: [14, 20] }, G5: { at: [20, 8] }, G4: { at: [24, 17] },
        M: { at: [12, 9] }, B: { at: [11, 15] }, R: { at: [10, 20] }, K: { at: [14, 4] }, O: { at: [1.5, 14] },
      }),
      shots: [
        {
          cam: { kind: 'match' },
          play: async (c) => {
            await c.say([S('radio', "Les Gars reculent tous, comme des poules avant l'orage !|Leur grand attaquant tente sa chance de loin...")])
            c.go('O', [1.3, 14.4], 0.6)
            await c.shot('G3', [0, 14.3], { height: 0.9, speed: 13 })
            await c.say([N("Bam ! Ousmane bloque le tir contre sa poitrine.")])
          },
        },
        {
          cam: { kind: 'on', who: 'O', dist: 2.6 },
          lines: [
            S('radio', "Arrêt de Petit Pied !|Il chausse du 32, mesdames et messieurs, mais regardez-moi ces mains ! Des feuilles de bananier ! Il vient de Garoua, il ne parle jamais, et il arrête tout !"),
            S('ousmane', "Gazelle"),
            N("Un seul mot. Et il relance à la main, loin, vers Mireille."),
          ],
        },
        {
          cam: { kind: 'match' },
          play: async (c) => {
            c.go('M', [18, 7], 1)
            await c.pass('O', 'M', { lofted: true, flight: 1.5, lead: 1.2 })
            c.go('G5', [21, 6.5], 0.7); c.go('G4', [27, 10], 0.7)
            await c.move('M', [28, 9], 0.95)
            await c.move('M', [36, 12], 0.95)
            await c.shot('M', [44, 13], { height: 0.25, speed: 12 })
          },
          lines: [
            S('radio', "La Gazelle s'envole !|Onze ans, et aucun garçon du quartier ne l'a jamais battue à la course ! Elle en laisse un ! Elle en laisse deux ! Elle frappe..."),
            N("Du plat du pied, tranquille, comme on pose une assiette sur une table."),
          ],
        },
        {
          cam: { kind: 'on', who: 'R' }, do: [{ a: 'score', text: '2 - 2' }, { a: 'pose', id: 'R', pose: 'mic' }],
          lines: [S('radio', "BUT ! 2-2 ! Et attention, ne l'appelez jamais autrement que la Gazelle, sinon elle vous mord !")],
        },
        { cam: { kind: 'on', who: 'M', side: 0.7 }, do: [{ a: 'face', id: 'M', to: 'R' }], lines: [S('mireille', "Je t'entends, Radio.")] },
        { cam: { kind: 'on', who: 'R', side: -0.5 }, do: [{ a: 'pose', id: 'R', pose: 'shrug' }], lines: [S('radio', "Pardon, Gazelle.")] },
        {
          cam: { kind: 'on', who: 'F', dist: 3.4 }, do: [{ a: 'pose', id: 'R', pose: 'mic' }, { a: 'pose', id: 'F', pose: null }],
          lines: [
            S('radio', "Plus qu'une minute !|Peut-être deux !"),
            N("À Bonamoussadi, la fin du match dépend surtout de l'heure où Tonton Fokou a faim."),
            S('fokou', "Dernière action !|Après, je mange !"),
          ],
        },
      ],
    },
    /* -------------------------------------------------------------- one touch (played, canon) */
    {
      kind: 'play', id: 'uneTouche', place: bona, prompt: 'play.oneTouchIntro',
      cast: match({
        K: { at: [11, 5.5], ball: true }, G2: { at: [12.3, 6.4], face: 'K' }, G3: { at: [11.6, 4.2], face: 'K' }, G4: { at: [10.1, 6.2], face: 'K' },
        B: { at: [16.5, 10.5], face: 'K' }, R: { at: [24, 13.5], face: 'B' }, M: { at: [29, 21.5] },
        G5: { at: [33, 8] }, G6: { at: [30, 3.5] }, G7: { at: [20, 19] }, G8: { at: [22, 7.5] },
        L1: { at: [7, 12] }, L2: { at: [9, 22] }, L3: { at: [14, 25] },
      }),
      challenge: {
        type: 'oneTouch', player: 'B', to: 'R',
        setup: async (c) => {
          c.cam({ kind: 'on', who: ['K', 'G2', 'G3'], dist: 4.2, height: 1.6 })
          await c.say([S('radio', "Ils ont compris !|Trois sur Kaydoudou ! Un mur ! Un mur de coudes et de genoux !")])
          const k = c.p('K')
          k.anim = 'kick'; k.animT = 0
          await c.wait(0.25)
          c.sfx('touch')
          // a shin, then his own: the ball comes out of the wall, rolling
          const w = c.w
          w.ball.owner = null
          const b = c.p('B')
          const dx = b.pos.x - w.ball.pos.x, dy = b.pos.y - w.ball.pos.y, l = Math.hypot(dx, dy)
          w.ball.vel = { x: (dx / l) * 5.6, y: (dy / l) * 5.6, z: 0 }
          w.ball.lastTouch = 'G2'
          c.say([N("Kaydoudou tente encore son crochet. Le ballon tape un tibia. Puis le sien. Il sort du mur en roulant.")]).catch(() => {})
          await c.wait(0.5)
          c.cam({ kind: 'over', who: 'B', to: 'R', dist: 3.4, height: 2.3 }, false)
          await c.say([N("Droit vers BriBri."), N("Et le temps s'arrête.")])
          c.slow(0.1)
          c.look('B', 'R')
          await c.say([
            N("BriBri voit la poussière rouge suspendue dans la lumière blanche. Il voit le ballon de Mami tourner sur lui-même, lentement, couture après couture. Il voit le gardien des Gars, les yeux encore sur Kaydoudou."),
            N("Et il voit Radio. Seul au milieu. La bouche ouverte. Sans un mot, pour une fois."),
          ])
        },
        lines: [T('bribri', "Pas besoin de contrôler.")],
        wrongLine: N("Et il voit Radio. Seul au milieu. La bouche ouverte. Sans un mot, pour une fois."),
        after: async (c) => {
          c.cam({ kind: 'match' })
          c.say([N("Une touche."), N("Le ballon file chez Radio. Radio, une touche aussi, vers Mireille, lancée sur la droite. Mireille ne contrôle même pas.")]).catch(() => {})
          c.go('M', [37.5, 18], 1)
          await c.until(() => Math.hypot(c.w.ball.pos.x - c.p('R').pos.x, c.w.ball.pos.y - c.p('R').pos.y) < 2.4, 3)
          const pass = c.pass('R', [37.2, 17.6], { arrive: 6 })
          await c.until(() => !!c.w.pass && c.w.pass.from === 'R', 3)
          await c.until(() => Math.hypot(c.w.ball.pos.x - c.p('M').pos.x, c.w.ball.pos.y - c.p('M').pos.y) < 2.2, 4)
          void pass
          await c.shot('M', [44, 13.4], { height: 0.3, speed: 14 })
          await c.say([N("Le ballon passe entre les bambous.")])
          c.score('3 - 2')
          c.pose('M', 'celebrate')
          c.cam({ kind: 'on', who: 'R', dist: 3 })
          c.pose('R', 'mic')
          await c.say([S('radio', "BUUUT !|Une touche, une touche, une touche ! 3-2 ! Vous avez vu ça, mesdames et messieurs ? Moi non plus, c'était trop rapide !")])
          c.pose('R', null)
          c.cam({ kind: 'on', who: 'B', dist: 2.4 })
          await c.say([S('bribri', "Trois passes|. Quatre secondes.")])
          c.cam({ kind: 'on', who: 'F', dist: 3.2 })
          c.pose('F', 'wave')
          await c.say([S('fokou', "Houou !|Le ballon a couru plus vite que vous tous ! Il a voyagé en première classe !")])
          c.pose('F', null); c.pose('M', null)
        },
      },
    },
    /* -------------------------------------------------------------- the clever shin */
    {
      kind: 'scene', id: 'tibia', place: bona, keep: true, cast: [],
      shots: [
        {
          cam: { kind: 'on', who: ['B', 'K'], dist: 4 },
          play: async (c) => { await c.move('K', [c.p('B').pos.x - 1.1, c.p('B').pos.y + 0.2], 1); c.face('K', 'B'); c.face('B', 'K') },
          lines: [N("Kaydoudou arrive en bondissant, couvert de poussière jusqu'aux sourcils.")],
        },
        {
          cam: { kind: 'on', who: ['K', 'B'], dist: 2.8 },
          lines: [
            S('kaydoudou', "C'est moi qui ai fait la première passe !"),
            S('bribri', "C'était pas une passe|. Le ballon a rebondi sur ton tibia."),
            S('kaydoudou', "Mon tibia a fait une passe|. Mon tibia est très intelligent."),
          ],
        },
        { cam: { kind: 'on', who: 'F', dist: 3.6 }, do: [{ a: 'sfx', kind: 'whistle' }], lines: [N("Houou ! Tonton Fokou siffle la fin."), N("Et c'est là que tout se gâte.")] },
      ],
    },
    /* -------------------------------------------------------------- « la frappe du tonnerre » (cutscene, canon) */
    {
      kind: 'scene', id: 'tonnerre', place: bona,
      cast: match({
        K: { at: [12, 8], face: [-6.5, -9], pose: 'hold' }, B: { at: [16.5, 12], face: 'K' }, M: { at: [18, 8.5], face: 'K' }, R: { at: [17, 14.5], face: 'K' },
        F: { at: [-1.2, -1.6], pose: null, face: 'K' }, O: { at: [6, 12], face: 'K', gk: false },
        G1: { at: [40, 14] }, G2: { at: [30, 10] }, G3: { at: [33, 16] }, G4: { at: [27, 20] }, G5: { at: [35, 8] }, G6: { at: [38, 19] }, G7: { at: [31, 13] }, G8: { at: [36, 11] },
      }),
      shots: [
        {
          cam: { kind: 'on', who: 'K', dist: 2.8, side: 0.7 }, do: [{ a: 'pose', id: 'K', pose: 'celebrate' }],
          play: async (c) => { c.carry('K') },
          lines: [S('kaydoudou', "Victoire !|Il faut fêter ça !")],
        },
        {
          cam: { kind: 'on', who: 'K', dist: 3.4, side: 1.0, height: 0.9 },
          play: async (c) => {
            c.pose('K', null); c.release(); c.place([12.3, 8.4])
            await c.wait(0.4)
            await c.move('K', [14.0, 10.6], 0.25)
            c.face('K', [12.3, 8.4])
          },
          lines: [N("Il pose le ballon de Mami dans la poussière. Il recule de trois pas.")],
        },
        { cam: { kind: 'on', who: 'K', dist: 2.2, side: -0.4, height: 0.85 }, do: [{ a: 'pose', id: 'K', pose: 'mic' }], lines: [S('kaydoudou', "Mesdames et messieurs... la frappe du tonnerre !")] },
        { cam: { kind: 'on', who: 'B', dist: 2.2 }, do: [{ a: 'pose', id: 'K', pose: null }, { a: 'pose', id: 'B', pose: 'point' }], lines: [S('bribri', "Kaydoudou, non !")] },
        {
          cam: { kind: 'pose', pos: [16.5, 0.7, 12.4], look: [12.3, 1.0, 8.4], to: { pos: [17, 1.2, 13], look: [4, 14, -2] }, dur: 2.6, fov: 46 },
          do: [{ a: 'pose', id: 'B', pose: null }],
          play: async (c) => {
            await c.move('K', [12.65, 8.85], 1)
            const k = c.p('K'); k.anim = 'kick'; k.animT = 0
            await c.wait(0.12)
            c.sfx('kick')
            for (const id of ['B', 'M', 'R', 'F', 'O', 'L1', 'L2', 'L3']) c.look(id, [2, -4])
            await c.arc([12.3, 8.4, 0.11], [-6.5, -9.15, 2.8], 24, 3.6)
            c.hold([-6.5, -9.15, 2.8])
          },
          lines: [
            N("Bam !"),
            N("Le ballon monte. Si haut que BriBri croit qu'il va rester accroché au soleil. Tout le terrain lève la tête. Même Tonton Fokou."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [-1, 2.2, -2], look: [-6.5, 2.6, -9.1], fov: 38 },
          lines: [
            N("Puis il redescend, passe au-dessus du manguier, et tombe tout en haut du grillage de Monsieur Bilé, le voisin."),
            N("Là où court une ligne de fil de fer barbelé."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [-5.2, 2.6, -7.0], look: [-6.5, 2.75, -9.1], fov: 34 },
          do: [{ a: 'sfx', kind: 'post' }],
          play: async (c) => { await c.wait(1.2) },
          lines: [N("Tac.")],
        },
        {
          cam: { kind: 'pose', pos: [-5.2, 2.6, -7.0], look: [-6.5, 2.75, -9.1], fov: 34 },
          do: [{ a: 'ballLook', look: 'mami', flat: true }],
          lines: [N("Puis un long « pfffffff ». Exactement comme le soupir de BriBri tout à l'heure.")],
        },
        {
          cam: { kind: 'on', who: 'R', dist: 2.4 }, do: [{ a: 'pose', id: 'R', pose: 'mic' }],
          lines: [S('radio', "Le ballon...|Le ballon est..."), N("Pour la première fois de sa vie, il ne finit pas sa phrase.")],
        },
        {
          cam: { kind: 'pose', pos: [-3.5, 1.6, -4.5], look: [-6.5, 2.0, -8.6], fov: 42 },
          do: [{ a: 'pose', id: 'R', pose: null }],
          play: async (c) => {
            c.go('K', [-5.0, -6.6], 0.95)
            await c.move('B', [-6.5, -8.0], 0.95)
            c.face('B', [-6.5, -9.5]); c.pose('B', 'climb')
            await c.wait(1.0)
            c.carry('B', 1.95)
            await c.wait(0.6)
            c.pose('B', 'hold'); c.carry('B', 0.95)
          },
          lines: [N("BriBri grimpe sur le muret. Il décroche le ballon tout doucement, comme on libère un oiseau pris dans un filet.")],
        },
        { cam: { kind: 'on', who: 'K', dist: 2.4 }, do: [{ a: 'face', id: 'K', to: 'B' }], lines: [S('kaydoudou', "Il est vivant ?|BriBri, dis-moi qu'il est vivant !")] },
        {
          cam: { kind: 'on', who: 'B', dist: 1.9, side: 0.8 },
          lines: [N("Dans les mains de BriBri, le ballon s'écrase comme un fruit trop mûr."), S('bribri', "Le cuir est ouvert|. Tout le long d'une couture. Et la vessie est percée.")],
        },
        {
          cam: { kind: 'on', who: 'M', dist: 2.4 },
          play: async (c) => { c.go('M', [-3.6, -5.9], 0.5); c.go('R', [-2.6, -6.6], 0.45); c.go('F', [-2.9, -4.4], 0.25) },
          parallel: true,
          lines: [S('mireille', "Oh non|. Pas le ballon de Mami.")],
        },
        {
          cam: { kind: 'on', who: ['B', 'K'], dist: 3 },
          play: async (c) => {
            c.face('B', 'K'); c.pose('B', null)
            await c.move('K', [-5.6, -7.6], 0.3)
            c.carry('K', 0.55); c.pose('K', 'hug'); c.face('K', [0, 0])
          },
          lines: [
            N("BriBri saute du muret. Kaydoudou lui prend le ballon des mains. Il se laisse tomber assis au pied du grillage et le serre contre lui. Pendant une longue seconde, il ne dit rien. Ça ne lui arrive jamais."),
            N("Puis sa lèvre se met à trembler."),
            S('kaydoudou', "C'est le ballon de Mami."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [-3.4, 1.15, -4.6], look: [-5.8, 0.75, -7.8], to: { pos: [-2.4, 1.6, -3.2], look: [-5.6, 0.9, -7.8] }, dur: 14, fov: 38 },
          do: [{ a: 'move', id: 'B', to: [-5.0, -7.7], speed: 0.2 }],
          play: async (c) => { await c.wait(1.2); c.face('B', 'K'); c.pose('B', 'palm') },
          parallel: true,
          lines: [
            N("Les larmes tracent deux lignes claires dans la poussière de ses joues. Autour d'eux, la poussière rouge flotte encore dans la lumière blanche de la fin de matinée. Au fond, entre le manguier et le but en bambou, la vieille casquette de Tonton Fokou ne bouge plus."),
            N("BriBri reste debout près de son frère, grave. Il pose une main sur son épaule. Il cherche un mot. Il n'en trouve aucun."),
            T('bribri', "Tout à l'heure, j'ai soupiré à cause de lui|. Maintenant, je donnerais tous mes soupirs pour savoir réparer un ballon."),
          ],
        },
      ],
    },
    /* -------------------------------------------------------------- the evening: Milla's dance */
    {
      kind: 'scene', id: 'milla', place: { id: 'maison', mood: 'interiorNight', opts: { night: true } },
      cast: [
        { id: 'papa', cast: 'papa', at: [4.75, 3.95], face: Math.PI / 2, pose: 'sit' },
        { id: 'B', cast: 'bribri', at: [9.6, 3.0], face: Math.PI, look: { number: undefined, collar: '#F2EEE3' } },
        { id: 'K', cast: 'kaydoudou', at: [10.2, 4.4], face: Math.PI },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [2.2, 1.6, 5.8], look: [5.0, 0.9, 4.2], fov: 44 },
          do: [{ a: 'ballLook', look: 'mami', flat: true }, { a: 'ball', at: [6.6, 3.0] }],
          lines: [
            N("Le soir, Papa ouvre son ordinateur. Papa est ingénieur réseau : il apprend aux ordinateurs à se parler. Mais le samedi soir, son ordinateur sert à une seule chose."),
            S('papa', "Les garçons ! Coupe du monde 1990 ! Venez voir !"),
          ],
        },
        {
          cam: { kind: 'pose', pos: [5.0, 1.15, 5.15], look: [5.0, 0.92, 4.3], fov: 36 },
          play: async (c) => { c.go('B', [4.3, 4.85], 0.35); c.go('K', [5.6, 4.9], 0.4); await c.wait(2.5); c.face('B', 'papa'); c.face('K', 'papa') },
          parallel: true,
          lines: [
            N("L'image saute. Le son grésille comme du poisson dans l'huile. Mais on voit les Lions Indomptables. Et surtout, on voit Roger Milla."),
            S('papa', "Regardez-le ! Trente-huit ans ! Il marque, il court au drapeau de coin, et là... la danse ! Une main sur le ventre, l'autre en l'air, et les hanches qui roulent comme une pirogue sur le fleuve !"),
            S('papa', "Cette année-là, le Cameroun est allé jusqu'en quart de finale|. Aucune équipe africaine n'était jamais allée aussi loin. J'avais six ans. J'ai pleuré tout un après-midi. Et je ne savais même pas si c'était de joie ou de tristesse !"),
          ],
        },
        {
          cam: { kind: 'pose', pos: [1.0, 1.5, 5.6], look: [3.4, 1.0, 3.4], fov: 46 },
          play: async (c) => { c.pose('papa', null); await c.move('papa', [3.4, 3.2], 0.35); c.face('papa', [1, 5]) },
          parallel: true,
          lines: [N("Il se lève d'un bond."), S('kaydoudou', "Papa, non !|Pas la danse !"), S('papa', "Si ! La danse !")],
        },
        {
          cam: { kind: 'pose', pos: [0.9, 1.4, 5.7], look: [3.4, 1.1, 3.2], fov: 44 },
          do: [{ a: 'pose', id: 'papa', pose: 'dance' }],
          lines: [N("Il danse au milieu du salon. Il se cogne dans la table. « Aïe ! » Il continue quand même.")],
        },
        {
          cam: { kind: 'on', who: 'K', dist: 2 },
          do: [{ a: 'move', id: 'K', to: [5.65, 5.35], speed: 0.3 }],
          play: async (c) => { await c.wait(1.2); c.face('K', 'papa'); c.pose('K', 'hug'); c.carry('K', 0.5) },
          parallel: true,
          lines: [
            N("Kaydoudou, roulé en boule sur une chaise, le ballon crevé sur les genoux, sourit malgré lui."),
            S('kaydoudou', "Papa, tu danses comme une pirogue qui coule."),
            S('papa', "Une pirogue qui coule avec style, mon fils."),
            S('kaydoudou', "Moi aussi, je ferai la danse de Milla. À chaque but."),
            S('bribri', "Il faudra d'abord marquer"),
          ],
        },
        {
          cam: { kind: 'pose', pos: [2.6, 1.5, 6.0], look: [4.9, 0.9, 4.4], fov: 44 },
          play: async (c) => { c.pose('papa', null); await c.move('papa', [4.75, 3.95], 0.3); c.face('papa', Math.PI / 2); c.pose('papa', 'sit') },
          parallel: true,
          lines: [
            S('papa', "Et ton match, alors ?"),
            S('kaydoudou', "J'ai dribblé cinq joueurs ! Le crochet, le petit pont, la toupie..."),
            S('bribri', "Et tu oublies la fin"),
            N("Papa se rassoit et regarde Kaydoudou par-dessus ses lunettes."),
            S('papa', "Tu sais, un réseau, c'est comme une équipe. Si un câble garde tout pour lui, plus rien ne passe."),
            N("Kaydoudou fait semblant de ne pas entendre. Puis il tend le ballon crevé à Papa."),
            S('kaydoudou', "Tu répares bien les ordinateurs. Tu peux réparer ça ?"),
            S('papa', "Les ordinateurs, oui|. Les ballons de Mami, non. Ça, c'est un autre métier."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [3.6, 1.55, 3.0], look: [0.6, 1.1, 4.6], fov: 44 },
          do: [{ a: 'spawn', actor: { id: 'maman', cast: 'maman', at: [0.2, 4.6], face: 0 } }],
          play: async (c) => { await c.move('maman', [1.6, 4.6], 0.3) },
          parallel: true,
          lines: [N("La porte s'ouvre. Maman rentre de la clinique, sa blouse d'infirmière pliée sur le bras. Les yeux fatigués, le sourire quand même."), S('maman', "Mon Dieu. Qu'est-ce qui lui est arrivé ?")],
        },
        {
          cam: { kind: 'on', who: ['maman', 'K'], dist: 3.2 },
          play: async (c) => { c.pose('K', null); c.release(); c.place([5.9, 5.6]); await c.move('maman', [5.0, 5.4], 0.35); c.face('maman', 'K'); c.face('K', 'maman'); c.pose('maman', 'hold'); c.pose('K', 'hold') },
          parallel: true,
          lines: [
            S('kaydoudou', "Le barbelé de Monsieur Bilé l'a mangé"),
            N("Maman serre Kaydoudou contre elle, très fort. Puis elle tape dans ses mains."),
            S('maman', "Bon. Les devoirs."),
            S('kaydoudou', "Maman, c'est samedi !"),
            S('maman', "Pas de devoirs, pas de crampons."),
            N("C'est sa règle. Elle est solide comme les bambous du terrain. Plus solide, même : les bambous, eux, penchent."),
          ],
        },
      ],
    },
    /* -------------------------------------------------------------- the first lesson, written in secret */
    {
      kind: 'scene', id: 'feuille', place: { id: 'maison', mood: 'interiorNight', opts: { night: true } },
      cast: [
        { id: 'B', cast: 'bribri', at: [11.35, 3.3], face: 0, pose: 'sit', look: { number: undefined, collar: '#F2EEE3' } },
        { id: 'papa', cast: 'papa', at: [4.75, 3.95], face: Math.PI / 2, pose: 'sit' },
        { id: 'maman', cast: 'maman', at: [5.65, 3.95], face: Math.PI / 2, pose: 'sit' },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [9.6, 1.5, 4.6], look: [11.6, 0.85, 3.2], fov: 42 },
          lines: [
            N("Dans la chambre, BriBri fait ses fractions, comme toujours. Kaydoudou part se laver en chantant faux. Alors BriBri sort une feuille cachée dans son cahier de maths."),
            N("C'est son secret. Depuis quelques semaines, il y note chaque match, comme un journal que personne ne lira. Rien que des scores et des noms."),
            N("Mais ce soir, le terrain lui a appris quelque chose."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [11.0, 1.3, 3.0], look: [20, 3.5, 2.0], fov: 40 },
          lines: [
            N("Il mordille son crayon. Il regarde la lune posée sur les tôles. Puis il écrit, en lettres bien droites :"),
            N("« Leçon du Ballon n°1 »."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [6.9, 1.5, 2.2], look: [5.0, 0.9, 4.3], fov: 44 },
          do: [{ a: 'ballLook', look: 'mami', flat: true }],
          play: async (c) => { c.carry('papa', 1.25) },
          lines: [
            N("Quand il revient au salon, Papa et Maman parlent tout bas. Papa soulève le ballon crevé, qui pend dans sa main comme un chapeau mouillé."),
            S('papa', "Pour les vacances de la Toussaint, on monte à Bafoussam. Chez Mami."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [4.4, 1.35, 1.6], look: [7.4, 1.0, 3.4], fov: 42 },
          do: [
            { a: 'spawn', actor: { id: 'K', cast: 'kaydoudou', at: [7.6, 3.4], face: Math.PI } },
            { a: 'spawn', actor: { id: 'B2', cast: 'bribri', at: [6.6, 2.4], face: Math.PI / 2, look: { number: undefined, collar: '#F2EEE3' } } },
            { a: 'remove', id: 'B' },
          ],
          lines: [
            N("Kaydoudou sort de la douche, une serviette sur la tête. Il s'arrête net. Ses yeux s'allument d'un coup, comme une lampe qu'on rebranche."),
            S('kaydoudou', "Mami répare tout !"),
            N("BriBri regarde la grande déchirure."),
            T('bribri', "Tout ?|Même ça ?"),
          ],
        },
      ],
    },
    { kind: 'lesson', no: 1 },
  ],
}
