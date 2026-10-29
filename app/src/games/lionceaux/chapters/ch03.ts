// Chapitre 3, « Les Requins de Bépanda » (POV BriBri). Source: tome1/chapters/03-les-requins-de-bepanda.md.
// Every line is the chapter's text. Played: BriBri's pass for Mireille's 1-0 (canon); Kaydoudou's
// dribble that dies on the second Requin (canon); the moment BriBri should shout and does not: the
// shout is there, locked, with the book's own sentence (bridge presentation of « Il ne crie
// jamais »); the brothers' first fist and hand on the heart. Locked: the 1-2.
import type { ChapterScript } from '../story/session'
import type { ActorSpec } from '../story/types'
import { N, S, T, lion, rival } from './helpers'

const golden = { id: 'bona' as const, mood: 'golden' as const, opts: { crowd: 'many' } }

/** Lionceaux (attack right): Ousmane in the bamboos, BriBri and Radio in the middle, Kaydoudou left, Mireille right, Samuel up front. */
function match(over: Record<string, Partial<ActorSpec>> = {}, extra: ActorSpec[] = []): ActorSpec[] {
  const base: ActorSpec[] = [
    { id: 'F', cast: 'fokou', at: 'fokou', face: [22, 14], pose: 'sit' },
    { id: 'EK', cast: 'ekotto', at: [47.6, 24.0], face: [30, 14] },
    { id: 'O', cast: 'ousmane', team: 'a', at: [1.6, 14], face: 0, gk: true },
    { id: 'B', cast: 'bribri', team: 'a', at: [16, 13], face: 0, number: 8 },
    { id: 'R', cast: 'radio', team: 'a', at: [17, 18], face: 0 },
    { id: 'K', cast: 'kaydoudou', team: 'a', at: [20, 5], face: 0 },
    { id: 'M', cast: 'mireille', team: 'a', at: [21, 23], face: 0 },
    { id: 'SA', cast: 'samuel', team: 'a', at: [27, 14], face: 0 },
    lion('L1', [8, 9], 1, 0), lion('L2', [8, 19], 2, 0),
    { id: 'BU', cast: 'bulldozer', team: 'b', at: [24, 13], face: Math.PI },
    rival('Q1', 'requin', [42.4, 14], 1, { gk: true, look: { gloves: '#dfe9f5' } }),
    rival('Q2', 'requin', [33, 8], 2), rival('Q3', 'requin', [33, 20], 3), rival('Q4', 'requin', [28, 6], 4),
    rival('Q5', 'requin', [28, 22], 5), rival('Q6', 'requin', [36, 14], 6), rival('Q7', 'requin', [30, 14], 7),
  ]
  return [...base.map((a) => ({ ...a, ...(over[a.id] ?? {}) })), ...extra]
}

export const CH03: ChapterScript = {
  no: 3,
  ball: 'plain',
  beats: [
    /* -------------------------------------------------------------- Bulldozer arrives */
    {
      kind: 'scene', id: 'bulldozer', place: golden,
      cast: match({
        B: { at: [14, 10], face: Math.PI / 2 }, K: { at: [15, 10.4], face: Math.PI / 2, carry: true, pose: 'hold' }, R: { at: [16.2, 10.2], face: Math.PI / 2 },
        M: { at: [13, 10.6], face: Math.PI / 2 }, SA: { at: [17.4, 10.6], face: Math.PI / 2 }, O: { at: [12, 10.2], face: Math.PI / 2, gk: false },
        L1: { at: [18.6, 10.3], face: Math.PI / 2 }, L2: { at: [11, 10.5], face: Math.PI / 2 },
        BU: { at: [15, 22], face: -Math.PI / 2 }, Q2: { at: [13.5, 23.5], face: -Math.PI / 2 }, Q3: { at: [16.5, 23.4], face: -Math.PI / 2 }, Q4: { at: [12, 24.6], face: -Math.PI / 2 },
        Q5: { at: [18, 24.6], face: -Math.PI / 2 }, Q6: { at: [14.4, 25.2], face: -Math.PI / 2 }, Q7: { at: [15.8, 25.4], face: -Math.PI / 2 }, Q1: { at: [17.2, 25.8], face: -Math.PI / 2, gk: false },
      }),
      shots: [
        {
          cam: { kind: 'on', who: ['K', 'B'], dist: 2.6 }, do: [{ a: 'ballLook', look: 'mamiPatched' }],
          lines: [S('kaydoudou', "C'est lui, Bulldozer ?"), N("Kaydoudou chuchote. Pour une fois.")],
        },
        {
          cam: { kind: 'pose', pos: [15.6, 0.9, 13.2], look: [15, 1.3, 20], fov: 40 },
          play: async (c) => {
            for (const [id, x] of [['BU', 15], ['Q2', 13.5], ['Q3', 16.5], ['Q4', 12], ['Q5', 18], ['Q6', 14.4], ['Q7', 15.8], ['Q1', 17.2]] as const) c.go(id, [x, id === 'BU' ? 12.6 : 14.4 + Math.abs(x - 15) * 0.2], 0.3)
          },
          parallel: true,
          lines: [
            N("Junior Mvondo ne marche pas. Il avance, comme un camion de sable dans une ruelle trop étroite. Et tout le monde s'écarte."),
            S('bribri', "C'est lui"),
          ],
        },
        {
          cam: { kind: 'on', who: 'R', dist: 2.2 }, do: [{ a: 'pose', id: 'R', pose: 'mic' }],
          lines: [S('radio', "Mesdames et messieurs|, voici Junior Mvondo, dit Bulldozer ! Douze ans, mais on lui en donne quinze ! Des épaules de porteur du marché Central ! Des mollets comme des ignames ! Et derrière lui... les Requins de Bépanda !")],
        },
        {
          cam: { kind: 'on', who: ['Q2', 'Q3', 'Q7'], dist: 3.2, height: 1.1 }, do: [{ a: 'pose', id: 'R', pose: null }],
          lines: [N("Maillots bleus, tous pareils, tous propres, avec un aileron de requin dessiné au feutre sur la poitrine.")],
        },
        {
          cam: { kind: 'over', who: 'B', to: 'BU', dist: 1.6 },
          lines: [
            N("Bulldozer s'arrête devant les Lionceaux. Il les regarde un par un. Puis il parle, d'une voix qui fait trembler les feuilles du manguier."),
            S('bulldozer', "Un 8 tout délavé. Un poussin jaune. Un maillot de basket trop grand. Un tee-shirt d'élection. C'est ça, les Lionceaux ? On dirait une équipe de chiffons."),
          ],
        },
        { cam: { kind: 'on', who: 'K', dist: 2 }, do: [{ a: 'pose', id: 'K', pose: 'fist' }], lines: [S('kaydoudou', "Poussin toi-même !"), N("Les Requins rient. Fort.")] },
        { cam: { kind: 'on', who: 'M', dist: 2.2 }, do: [{ a: 'pose', id: 'K', pose: 'hold' }], lines: [S('mireille', "Mieux vaut des chiffons qui jouent|, que des maillots qui parlent.")] },
      ],
    },
    /* -------------------------------------------------------------- a week earlier, under the mango tree */
    {
      kind: 'scene', id: 'tournoi', place: { id: 'bona', mood: 'morning', opts: { crowd: 'few' } },
      cast: [
        { id: 'F', cast: 'fokou', at: 'fokou', face: [3, 1], pose: 'sit' },
        { id: 'B', cast: 'bribri', at: [1.2, 0.2], face: 'F', number: 8 },
        { id: 'K', cast: 'kaydoudou', at: [0.2, 0.6], face: 'F' },
        { id: 'R', cast: 'radio', at: [2.4, 0.0], face: 'F' },
        { id: 'M', cast: 'mireille', at: [-0.8, 0.5], face: 'F' },
        { id: 'SA', cast: 'samuel', at: [3.3, -0.8], face: 'F' },
        { id: 'O', cast: 'ousmane', at: [-1.6, 0.1], face: 'F' },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [4.8, 1.6, 3.2], look: [-0.6, 0.9, -1.8], fov: 46 },
          lines: [
            N("Une semaine plus tôt, au retour de Bafoussam, Tonton Fokou les a réunis sous le manguier. Houou !"),
            S('fokou', "Le tournoi des quartiers recommence ! Huit équipes. Deux poules de quatre."),
            S('kaydoudou', "Des poules ?|On joue contre des poules ?"),
            S('fokou', "Une poule, c'est un groupe d'équipes, petit malin. Les matchs de poule en novembre et en décembre. Les deux premiers de chaque poule vont en demi-finale, en janvier, par tirage au sort. Puis la finale. Et notre premier match..."),
            N("Il a attendu, comme un vrai présentateur."),
            S('fokou', "... c'est contre Bépanda."),
            S('kaydoudou', "Les Requins ?|Dès le premier match ?"),
            N("Tout le monde a grogné. Les Requins gagnent presque tout, depuis toujours. Leur quartier est juste à côté, de l'autre côté du canal."),
            S('samuel', "On va se faire manger"),
            S('radio', "Par des requins, c'est normal"),
          ],
        },
        { cam: { kind: 'on', who: 'B', dist: 1.9 }, lines: [N("BriBri a fait le calcul tout de suite."), T('bribri', "Si on perd le premier match, on n'aura plus le droit de perdre.")] },
      ],
    },
    /* -------------------------------------------------------------- the quarter is there; « les oreillons » */
    {
      kind: 'scene', id: 'oreillons', place: golden,
      cast: match({ K: { at: [15, 10.4], face: 'BU', carry: true, pose: 'hold' }, BU: { at: [15.2, 12.2], face: 'K' }, B: { at: [13.6, 10.2], face: 'K' }, R: { at: [16.6, 10.0], face: 'K' } }),
      shots: [
        {
          cam: { kind: 'pose', pos: [41, 2.0, 19.5], look: [47.6, 1.1, 24], fov: 44 },
          do: [{ a: 'ballLook', look: 'mamiPatched' }],
          lines: [
            N("Maintenant, ils sont là. Tout le quartier aussi. Madame Ekotto a installé sa table de beignets-haricots sous un parasol rouge, au coin du terrain."),
            S('ekotto', "Allez les Lionceaux ! Beignets gratuits pour celui qui marque !"),
          ],
        },
        {
          cam: { kind: 'pose', pos: [8, 1.5, 0], look: [8, 1.6, -9], fov: 46 },
          lines: [N("Sur le mur de Monsieur Bilé, des enfants chantent, les jambes pendantes."), S('enfants', "Kay-dou-dou ! Kay-dou-dou !"), N("Les benskins ralentissent sur la route pour voir le score.")],
        },
        {
          cam: { kind: 'on', who: ['K', 'BU'], dist: 2.6 },
          lines: [
            N("Avant le coup d'envoi, Kaydoudou sort le ballon de Mami de son sac. Il le montre à Bulldozer, fier comme un roi."),
            S('kaydoudou', "Recousu par ma grand-mère. C'est un ballon magique."),
            N("Bulldozer regarde la bosse de pagne rouge et jaune. Il sourit d'un seul côté."),
            S('bulldozer', "Il a les oreillons, ton ballon magique."),
          ],
        },
        { cam: { kind: 'on', who: 'R', dist: 2 }, lines: [S('radio', "Les oreillons|. La maladie des joues gonflées. Aïe.")] },
        {
          cam: { kind: 'on', who: 'K', dist: 1.8 }, do: [{ a: 'pose', id: 'K', pose: 'dejected' }],
          lines: [N("Tous les Requins éclatent de rire. Kaydoudou range le ballon, les joues brûlantes.")],
        },
        { cam: { kind: 'on', who: 'B', dist: 1.8 }, lines: [N("BriBri voit son frère serrer les dents."), T('bribri', "Oh non|. Je connais ce regard.")] },
      ],
    },
    /* -------------------------------------------------------------- kick-off */
    {
      kind: 'scene', id: 'coupEnvoi', place: golden, cast: match(),
      shots: [
        {
          cam: { kind: 'wide', height: 20 }, do: [{ a: 'ballLook', look: 'plain' }, { a: 'ball', at: [22, 14] }],
          lines: [N("Huit contre huit. Deux mi-temps de vingt minutes. Ousmane dans les bambous. BriBri et Radio au milieu. Kaydoudou à gauche, Mireille à droite. Et en pointe, le grand Samuel, qui court comme une girafe et frappe comme une mule.")],
        },
        { cam: { kind: 'on', who: 'F', dist: 3.2 }, do: [{ a: 'pose', id: 'F', pose: 'point' }], lines: [S('fokou', "Ils jouent fort|. Vous, vous jouez vite. Le ballon doit voyager !"), N("Houou ! C'est parti.")] },
        {
          cam: { kind: 'match' }, do: [{ a: 'pose', id: 'F', pose: 'sit' }, { a: 'sfx', kind: 'whistle' }],
          play: async (c) => {
            c.give('Q7')
            await c.pass('Q7', 'BU', { lofted: true, flight: 1.2 })
            await c.wait(0.4)
            await c.pass('BU', 'B', { arrive: 4 })
            await c.pass('B', 'R'); await c.pass('R', 'K'); await c.pass('K', 'L1')
          },
          lines: [
            S('radio', "Les Requins balancent de longs ballons vers Bulldozer !|Bulldozer gagne tout de la tête ! Et après... il ne sait pas quoi en faire !"),
            N("BriBri ramasse les ballons qui retombent. Il les donne à Radio. À Kaydoudou. En arrière. Proprement."),
          ],
        },
        {
          cam: { kind: 'match' },
          play: async (c) => {
            c.give('BU'); c.go('O', [1.4, 13.2], 0.7)
            await c.shot('BU', [0, 13.0], { height: 0.6, speed: 13 })
          },
          lines: [S('radio', "Douzième minute !|Bulldozer frappe ! Ousmane plonge... il bloque ! Il relance tout de suite !")],
        },
      ],
    },
    /* -------------------------------------------------------------- 1-0 for the Gazelle (played, canon) */
    {
      kind: 'play', id: 'gazelle', place: golden, prompt: 'play.oneTouchIntro',
      cast: match({ B: { at: [17, 15] }, M: { at: [20, 23.5] }, R: { at: [22, 11] }, BU: { at: [8, 12] }, Q5: { at: [27, 20] }, Q3: { at: [31, 16] }, Q7: { at: [24, 13] }, O: { at: [2, 14], ball: true } }),
      challenge: {
        type: 'oneTouch', player: 'B', to: 'M', lead: 1.1,
        setup: async (c) => {
          c.cam({ kind: 'match' })
          c.go('M', [34, 21], 0.95)
          await c.pass('O', 'B', { lofted: true, flight: 1.3 })
          c.cam({ kind: 'over', who: 'B', to: 'M', dist: 5.6, height: 4.2, mix: 0.45 })
          await c.say([N("Le ballon arrive à BriBri.")])
        },
        after: async (c) => {
          c.cam({ kind: 'match' })
          c.say([N("BriBri voit Mireille partir sur la droite. Pour une fois, il ne réfléchit pas. Il glisse le ballon devant elle.")]).catch(() => {})
          await c.until(() => c.w.ball.owner === 'M' || Math.hypot(c.w.ball.pos.x - c.p('M').pos.x, c.w.ball.pos.y - c.p('M').pos.y) < 1.2, 5)
          await c.move('M', [38, 17], 0.95)
          await c.shot('M', [44, 14.8], { height: 0.25, speed: 13 })
          c.score('1 - 0')
          await c.say([S('radio', "La Gazelle !|Deux enjambées, trois mètres d'avance ! Elle entre dans la surface ! Elle frappe sous le gardien... BUT ! 1-0 ! Les Requins sont dans le filet !")])
          c.cam({ kind: 'on', who: ['M', 'EK'], dist: 3.4 })
          c.p('M').pos = { x: 46.6, y: 23.6 }; c.w.prev.set('M', { x: 46.6, y: 23.6 }); c.face('M', 'EK'); c.face('EK', 'M')
          await c.say([
            N("Madame Ekotto tend un beignet par-dessus sa table. Mireille le mange en deux bouchées en retournant au milieu."),
            S('mireille', "Merci, Madame Ekotto !"),
            S('ekotto', "Marque encore, ma fille ! J'ai plein de beignets !"),
          ])
        },
      },
    },
    /* -------------------------------------------------------------- two sharks on the chick */
    {
      kind: 'scene', id: 'cage', place: golden, cast: match({ BU: { at: [24, 9], face: Math.PI }, Q4: { at: [25.2, 9.8] }, Q2: { at: [25.4, 8.0] } }),
      shots: [
        {
          cam: { kind: 'on', who: ['BU', 'Q4', 'Q2'], dist: 3.6 }, do: [{ a: 'score', text: '1 - 0' }, { a: 'pose', id: 'BU', pose: 'point' }, { a: 'face', id: 'BU', to: 'K' }],
          lines: [
            N("Mais Bulldozer n'aime pas perdre. Il appelle deux Requins et montre Kaydoudou du menton."),
            S('bulldozer', "Vous deux. Le poussin. Vous lui collez dessus. Partout."),
            N("Et à partir de là, tout change."),
          ],
        },
        {
          cam: { kind: 'on', who: 'R', dist: 2.2 },
          play: async (c) => { c.pose('BU', null); c.go('Q4', [21.2, 5.6], 0.8); c.go('Q2', [21.4, 4.2], 0.8) },
          parallel: true,
          lines: [S('radio', "Deux Requins sur Kaydoudou !|Deux ! Ils lui tombent dessus comme des moustiques sur un bras nu !")],
        },
      ],
    },
    /* -------------------------------------------------------------- the dribble that dies (played, canon) */
    {
      kind: 'play', id: 'cage2', place: golden, prompt: 'play.dribbleIntroK',
      cast: match({ K: { at: [16, 6], ball: true }, Q4: { at: [20, 5.6] }, Q2: { at: [23.5, 6.4] }, BU: { at: [28, 12] } }),
      challenge: {
        type: 'dribble', carrier: 'K', defenders: ['Q4'], end: 'lose', loseTo: 'Q2', dir: 1,
        calls: [N("Kaydoudou tente le crochet du margouillat. Il passe le premier Requin.")],
        loseLines: [
          N("Le deuxième l'attendait derrière et lui prend le ballon."),
          N("Il tente le petit pont."),
          S('radio', "Coincé !|Le ballon est coincé entre quatre jambes ! Quatre jambes, mesdames et messieurs !"),
          N("Bulldozer passe à côté de Kaydoudou en trottinant."),
          S('bulldozer', "Alors, le magicien ? Il est où, ton tour de magie ?"),
        ],
      },
    },
    /* -------------------------------------------------------------- the shout that does not come (played, canon) */
    {
      kind: 'play', id: 'crier', place: golden, prompt: 'play.callIntro',
      cast: match({ K: { at: [20, 7], ball: true, face: 0 }, Q4: { at: [22, 7.6], face: 'K' }, Q2: { at: [21.6, 5.6], face: 'K' }, B: { at: [16, 10.5], face: 'K' }, BU: { at: [26, 12] } }),
      challenge: {
        type: 'choose', prompt: 'play.call', lockedHint: 'play.callLocked',
        options: [
          { key: 'crier', canon: false, line: N("Mais il ne crie pas. Il ne crie jamais. Kaydoudou doit le voir. Kaydoudou va le voir.") },
          { key: 'leverMain', canon: true },
        ],
        setup: async (c) => {
          c.cam({ kind: 'over', who: 'B', to: 'K', dist: 2.6, height: 1.9 })
          c.pose('B', 'wave')
          await c.say([N("La fois d'après, BriBri est libre. À cinq mètres. Au milieu. Il lève la main."), T('bribri', "Crie|. Crie son nom.")])
        },
        after: async (c) => {
          await c.say([N("Kaydoudou ne le voit pas. Il ne voit que les deux maillots bleus devant lui, comme un mur à escalader. Il fonce. Il perd le ballon.")])
          c.pose('B', null)
          await c.move('K', [21.2, 6.8], 0.8)
          c.give('Q4')
          c.cam({ kind: 'on', who: 'F', dist: 3.2 })
          await c.say([S('fokou', "Le ballon doit voyager !")])
          c.cam({ kind: 'match' })
          await c.pass('Q4', 'Q7'); await c.pass('Q7', 'Q5'); await c.pass('Q5', 'Q3')
          c.go('BU', [9, 13], 1)
          await c.say([N("Quatre passes des Requins. Bulldozer arrive lancé.")])
          await c.pass('Q3', 'BU', { arrive: 4 })
          await c.shot('BU', [0, 14.6], { height: 0.9, speed: 20 })
          c.shake(0.5)
          await c.say([N("Bam !"), N("La frappe fait trembler les bambous.")])
          c.score('1 - 1')
          await c.say([S('radio', "1-1|. Bulldozer égalise. Mesdames et messieurs, j'ai mal aux oreilles.")])
        },
      },
    },
    /* -------------------------------------------------------------- the cage, again; the 1-2 (cutscene, canon) */
    {
      kind: 'scene', id: 'deuxUn', place: golden,
      cast: match({ K: { at: [22, 8], ball: true }, Q4: { at: [24, 8.4], face: 'K' }, Q2: { at: [23.5, 6.4], face: 'K' }, B: { at: [18, 12] }, R: { at: [27, 11] }, M: { at: [30, 22] }, SA: { at: [33, 15] }, BU: { at: [26, 14] } }),
      shots: [
        { cam: { kind: 'on', who: 'M', dist: 2.6 }, do: [{ a: 'score', text: '1 - 1' }, { a: 'pose', id: 'M', pose: 'wave' }], lines: [S('mireille', "Passe-le !|Kaydoudou, passe-le, enfin !")] },
        { cam: { kind: 'on', who: 'K', dist: 2.2 }, do: [{ a: 'pose', id: 'M', pose: null }], lines: [S('kaydoudou', "Non !|Lui, je le dribble ! Lui !"), N("Il a une petite lumière têtue dans les yeux. Bulldozer s'est moqué du ballon de Mami.")] },
        {
          cam: { kind: 'match' },
          play: async (c) => { await c.move('K', [23.4, 7.9], 0.8); c.give('Q4'); await c.wait(1); c.give('K') },
          lines: [N("Il essaie encore. Et encore. Chaque fois, deux Requins l'enferment comme dans une cage. Et chaque fois, quelque part, un Lionceau est seul.")],
        },
        { cam: { kind: 'on', who: 'SA', dist: 2.4 }, do: [{ a: 'pose', id: 'SA', pose: 'wave' }], lines: [S('samuel', "Kaydoudou !|Je suis tout seul ! Tout seul !")] },
        { cam: { kind: 'on', who: 'EK', dist: 2.6 }, do: [{ a: 'pose', id: 'SA', pose: null }], lines: [S('ekotto', "Passe, mon petit, passe !")] },
        { cam: { kind: 'pose', pos: [4, 2, -2], look: [8, 1.6, -9], fov: 44 }, lines: [N("Sur le mur de Monsieur Bilé, les enfants ne chantent plus.")] },
        {
          // what BriBri sees, « comme un dessin dans un cahier »: the free team-mates and the hole
          cam: { kind: 'pose', pos: [16, 7, 18], look: [26, 0, 11], fov: 48 },
          play: async (c) => { c.lanes([['K', 'R'], ['K', 'M'], ['K', [30, 12]]]) },
          lines: [
            N("BriBri voit tout. Radio libre dans le dos des deux Requins. Mireille seule à droite, avec trente mètres de terre rouge devant elle. Et au milieu de la défense bleue, un trou énorme. Il le voit comme un dessin dans un cahier."),
            N("Mais il garde tout pour lui. La bouche fermée."),
          ],
        },
        {
          cam: { kind: 'match' },
          play: async (c) => {
            c.lanes(null)
            c.give('BU')
            c.go('B', [c.p('BU').pos.x - 1.4, c.p('BU').pos.y + 0.2], 0.9)
            await c.wait(1.6)
            const b = c.p('B'); c.pose('B', 'lie'); b.meta.scripted = true; c.stop('B')
            c.shake(0.2)
            c.go('Q5', [8, 16], 1)
            await c.move('BU', [16, 14], 0.8)
            await c.pass('BU', 'Q5', { arrive: 4 })
            c.go('O', [1.8, 12.6], 0.9)
            await c.shot('Q5', [0, 15.8], { height: 0.4, speed: 15 })
            c.pose('O', 'dejected')
          },
          lines: [
            S('radio', "Cinq minutes !|Kaydoudou perd encore le ballon, au milieu cette fois ! Bulldozer récupère !"),
            N("BriBri se met devant Bulldozer."),
            N("Boum. Un coup d'épaule."),
            N("BriBri s'envole comme une feuille."),
            N("Bulldozer sert un Requin seul devant Ousmane. Ousmane plonge. Pas assez loin."),
          ],
        },
        { cam: { kind: 'on', who: 'R', dist: 2.2 }, do: [{ a: 'score', text: '1 - 2' }], lines: [S('radio', "1-2"), N("Il ne met même plus sa main devant sa bouche.")] },
        {
          cam: { kind: 'on', who: ['BU', 'K'], dist: 2.6 },
          play: async (c) => { c.p('BU').pos = { x: c.p('K').pos.x + 1.0, y: c.p('K').pos.y + 0.4 }; c.face('BU', 'K'); c.pose('BU', 'palm'); c.face('K', 'BU') },
          lines: [N("Bulldozer passe devant Kaydoudou et lui tapote la tête."), S('bulldozer', "Merci pour le cadeau, le magicien. Soigne bien ton ballon.")],
        },
        {
          cam: { kind: 'on', who: 'F', dist: 3 }, do: [{ a: 'pose', id: 'BU', pose: null }, { a: 'sfx', kind: 'whistle' }],
          lines: [N("Tonton Fokou ne crie pas. Il siffle la fin. Longuement."), S('fokou', "Houou..."), N("Le hibou enrhumé a l'air triste.")],
        },
      ],
    },
    /* -------------------------------------------------------------- the quarrel under the orange sky */
    {
      kind: 'scene', id: 'dispute', place: { id: 'bona', mood: 'evening', opts: { crowd: 'none' } },
      cast: [
        { id: 'B', cast: 'bribri', at: [10, 0.6], face: Math.PI, number: 8 },
        { id: 'K', cast: 'kaydoudou', at: [10.8, 1.1], face: Math.PI },
        { id: 'M', cast: 'mireille', at: [12.6, 1.3], face: Math.PI },
        { id: 'F', cast: 'fokou', at: 'fokou', face: [2, 2], pose: 'sit' },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [4, 1.6, 5.5], look: [10, 0.9, 0.8], to: { pos: [1.5, 1.6, 4.6], look: [3, 0.9, 0.6] }, dur: 9, fov: 44 },
          play: async (c) => { c.go('B', [1.6, 1.4], 0.3); c.go('K', [2.4, 1.9], 0.3); c.go('M', [4.6, 2.6], 0.28) },
          lines: [N("Le terrain se vide sous le ciel orange. Les deux frères longent la ligne de touche, côte à côte, sans se regarder. Mireille marche derrière eux.")],
        },
        {
          cam: { kind: 'on', who: ['B', 'K'], dist: 3 },
          play: async (c) => { await c.until(() => !c.isWalking('B'), 30); c.face('B', 'K'); c.face('K', 'B'); c.stop('M') },
          lines: [
            N("BriBri tient bon jusqu'au manguier. Puis la phrase sort toute seule."),
            S('bribri', "Tu ne passes jamais."),
            N("Kaydoudou s'arrête net."),
            S('kaydoudou', "Quoi ?"),
            S('bribri', "Tu ne passes jamais. Deux joueurs sur toi, à chaque fois, et tu continues. On a perdu à cause de toi."),
            S('kaydoudou', "À cause de moi ?"),
            N("La voix de Kaydoudou monte d'un coup, aiguë, tremblante."),
          ],
        },
        {
          cam: { kind: 'on', who: 'K', dist: 1.9 }, do: [{ a: 'pose', id: 'K', pose: 'point' }],
          lines: [
            S('kaydoudou', "Et toi, tu fais quoi ? Tu restes au milieu avec ton air de professeur ! Tu lèves la main comme à l'école ! Tu fais le chef, mais tu ne dis rien !"),
            S('bribri', "Je ne fais pas le chef !"),
            S('kaydoudou', "Si ! Tu fais toujours le chef ! À la maison, à l'école, partout ! “Kaydoudou, range tes chaussettes”, “Kaydoudou, fais tes devoirs”, “Kaydoudou, passe le ballon” ! Tu n'es pas Papa !"),
            S('bribri', "Et toi, tu n'es pas tout seul sur le terrain !"),
          ],
        },
        {
          cam: { kind: 'on', who: ['B', 'K'], dist: 2.2, height: 1.0 }, do: [{ a: 'pose', id: 'K', pose: 'fist' }, { a: 'pose', id: 'B', pose: 'fist' }],
          lines: [N("Ils sont nez à nez. BriBri doit baisser la tête pour regarder son frère dans les yeux. Deux paires de poings serrés. Un benskin klaxonne derrière eux. Pin-pin ! Aucun des deux ne bouge.")],
        },
        {
          cam: { kind: 'on', who: ['M', 'B', 'K'], dist: 3.2 },
          play: async (c) => { await c.move('M', [2.0, 2.4], 0.6); c.pose('M', 'open'); c.pose('K', null); c.pose('B', null) },
          parallel: true,
          lines: [
            S('mireille', "Ça suffit !"),
            N("Mireille se plante entre eux, les deux mains en avant, comme un arbitre de boxe."),
            S('mireille', "Vous êtes nuls, tous les deux. Toi|tu as gardé le ballon comme si c'était ton goûter. Et toi..."),
            N("Elle se tourne vers BriBri. Il a presque peur."),
            S('mireille', "... toi, je t'ai vu. Tu voyais tout. Tu savais où il fallait jouer. Pourquoi tu n'as rien dit ? Tu crois qu'on lit dans ta tête ?"),
            N("BriBri ouvre la bouche. Rien ne sort. Ce qui prouve exactement ce qu'elle vient de dire."),
          ],
        },
        {
          cam: { kind: 'on', who: 'F', dist: 2.6 }, do: [{ a: 'pose', id: 'M', pose: null }],
          lines: [
            S('fokou', "Houou."),
            N("Ils sursautent tous les trois."),
            N("Sous le manguier, Tonton Fokou est assis sur son bidon jaune, une bouteille d'eau à la main."),
            S('fokou', "J'ai tout entendu. Le quartier aussi, je pense. Venez ici, les deux frères."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [1.6, 1.2, 1.6], look: [-0.6, 0.9, -2.0], fov: 44 },
          play: async (c) => {
            c.go('B', [-0.9, -1.3], 0.3); await c.move('K', [-0.1, -1.1], 0.3)
            c.face('B', -Math.PI * 0.9); c.face('K', -0.2); c.pose('B', 'fist'); c.pose('K', 'shrug'); c.face('M', 'F')
          },
          parallel: true,
          lines: [
            N("Ils approchent. Ils restent plantés devant lui, à moitié dos à dos, chacun tourné vers son côté du terrain."),
            N("BriBri serre les poings le long du corps. Kaydoudou croise les bras, la lèvre en avant. Derrière eux, Mireille attend, les mains sur les hanches. Le ciel est orange, la poussière rouge."),
          ],
        },
        {
          cam: { kind: 'on', who: 'F', dist: 2.2, side: 0.3 },
          lines: [
            S('fokou', "Vous savez ce que c'est, un njangi ?"),
            S('bribri', "Oui, Tonton. Notre grand-mère en dirige un, à Bafoussam."),
            S('fokou', "Alors vous savez ce qui arrive à celui qui garde la caisse pour lui."),
            N("Les deux frères hochent la tête."),
            N("Tonton Fokou lève un doigt."),
            S('fokou', "Aujourd'hui, vous avez gardé la caisse. Tous les deux. Toi, Kaydoudou, avec tes pieds. Tu as gardé le ballon comme si on allait te le voler."),
            N("Il pointe son sifflet de bois vers BriBri."),
            S('fokou', "Et toi, BriBri, avec ta bouche fermée. Tu voyais tout, et tu n'as rien dit. Ce que tu vois et que tu gardes pour toi, c'est comme l'argent caché sous le matelas. Ça ne sert à personne."),
          ],
        },
        {
          cam: { kind: 'on', who: ['K', 'F'], dist: 2.4 },
          lines: [
            N("Kaydoudou décroise les bras. Juste assez pour protester."),
            S('kaydoudou', "Bulldozer a dit que le ballon de Mami avait les oreillons."),
            S('fokou', "Et pour lui répondre, tu lui as offert le match. Le ballon de ta grand-mère mérite mieux qu'une vengeance."),
            N("Kaydoudou recroise les bras. Mais sa lèvre rentre un peu."),
            N("BriBri sent ses joues chauffer. Il n'y a rien à répondre. C'est vrai, voilà tout."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [3, 1.5, 3], look: [-1, 1.0, -2], fov: 46 },
          play: async (c) => { c.pose('F', null); await c.wait(1.5); c.go('F', [-14, 6], 0.18) },
          parallel: true,
          lines: [
            N("Tonton Fokou se lève en s'appuyant sur sa jambe qui boite. Il fait tourner son vieux sifflet entre ses doigts."),
            S('fokou', "Le ballon doit voyager. Les mots aussi."),
            N("Et il s'en va vers chez lui, sans se retourner, en sifflotant un air de makossa."),
            N("Mireille hausse les épaules."),
            S('mireille', "Je vous l'avais dit"),
          ],
        },
        {
          cam: { kind: 'on', who: ['B', 'K'], dist: 2.6 },
          play: async (c) => { c.go('M', [20, 8], 0.3); c.pose('K', 'dejected'); c.pose('B', null) },
          parallel: true,
          lines: [
            N("Les deux frères restent seuls sous le manguier. Kaydoudou regarde ses chaussettes, la rouge et la jaune, couvertes de poussière. BriBri regarde le ciel qui devient violet au-dessus des tôles."),
            N("Long silence."),
            S('bribri', "Je ne suis pas Papa|. Je sais."),
            S('kaydoudou', "Et je ne suis pas tout seul|. Je sais aussi."),
          ],
        },
      ],
    },
    /* -------------------------------------------------------------- the ritual is born (played, canon) */
    {
      kind: 'play', id: 'rituel', place: { id: 'bona', mood: 'evening', opts: { crowd: 'none' } }, prompt: 'play.ritualIntro', keep: true, cast: [],
      challenge: {
        type: 'ritual',
        steps: [
          {
            key: 'poing',
            act: async (c) => {
              c.face('B', 'K'); c.face('K', 'B'); c.pose('K', null)
              c.cam({ kind: 'on', who: ['B', 'K'], dist: 1.8, height: 1.0 })
              c.pose('B', 'fist')
              await c.say([
                N("Alors BriBri fait une chose qu'il n'a jamais faite."),
                N("Il tend son poing fermé."),
                N("Le temps ralentit. Un benskin passe, très loin. Une feuille de manguier tombe, tourne, se pose dans la poussière. Kaydoudou regarde le poing. Puis son frère. Puis le poing."),
                N("Il approche le sien, petit et rond."),
              ])
              c.pose('K', 'fist'); c.sfx('touch')
              await c.say([N("Toc.")])
            },
          },
          {
            key: 'coeur',
            act: async (c) => {
              c.pose('B', 'heart'); await c.wait(0.4); c.pose('K', 'heart')
              await c.say([
                N("BriBri pose sa main à plat sur son cœur. Kaydoudou l'imite aussitôt, avec son grand sourire troué. Le sourire qui dit que tout est déjà pardonné."),
                S('kaydoudou', "Poing contre poing"),
                S('bribri', "Main sur le cœur"),
                N("Ils ne le savent pas encore, mais ils viennent d'inventer un rituel. Ils le referont des centaines de fois, dans des pays dont ils ne connaissent même pas le nom."),
              ])
            },
          },
        ],
      },
    },
    /* -------------------------------------------------------------- the way home */
    {
      kind: 'scene', id: 'chemin', place: { id: 'bona', mood: 'evening', opts: { crowd: 'none' } }, keep: true, cast: [],
      shots: [
        {
          cam: { kind: 'pose', pos: [6, 2.2, 6], look: [-6, 1.2, -6], to: { pos: [8, 6, 10], look: [-8, 6, -14] }, dur: 16, fov: 46 },
          play: async (c) => { c.pose('B', null); c.pose('K', null); c.go('B', [-14, 4], 0.3); c.go('K', [-13.4, 5], 0.3) },
          parallel: true,
          lines: [
            N("Sur le chemin de la maison, ils se poussent du coude. Avant d'arriver, BriBri compte à voix haute. C'est sa façon d'avoir peur."),
            S('bribri', "Il reste deux matchs de poule. Si on veut être sûrs d'aller en demi-finale..."),
            S('kaydoudou', "... il faut tout gagner"),
            N("Pour la première fois de la journée, ils sont parfaitement d'accord."),
            N("Au-dessus du fleuve, un gros nuage noir s'est installé. Il ne bouge pas. Il attend."),
          ],
        },
      ],
    },
    { kind: 'lesson', no: 3 },
  ],
}
