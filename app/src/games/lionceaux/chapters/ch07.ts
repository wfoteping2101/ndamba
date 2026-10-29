// Chapitre 7, « Le carnet de Tonton Fokou » (POV BriBri). Source: tome1/chapters/07-le-carnet-de-tonton-fokou.md.
// Every line is the chapter's text. Played: the ten passes before the semi-final (canon: ten); at
// half-time, BriBri stands up and speaks (staying silent is there, locked with the book's own nudge);
// the pass that crosses the Requins' line to Kaydoudou (canon, then Mireille's 1-1); the two fingers
// and the « une-deux du Njangi » (canon, Kaydoudou's 2-1). The notebook in pagne and the four plane
// tickets are cutscenes.
import type { ChapterScript } from '../story/session'
import type { ActorSpec } from '../story/types'
import { N, S, T, lion, rival } from './helpers'

const day = { id: 'bona' as const, mood: 'golden' as const, opts: { crowd: 'packed' as const } }

/** Lionceaux (attack right) against the Requins de Bépanda, the semi-final. */
function match(over: Record<string, Partial<ActorSpec>> = {}, extra: ActorSpec[] = []): ActorSpec[] {
  const base: ActorSpec[] = [
    { id: 'F', cast: 'fokou', at: 'fokou', face: [22, 14] },
    { id: 'EK', cast: 'ekotto', at: [47.6, 24.0], face: [30, 14] },
    { id: 'O', cast: 'ousmane', team: 'a', at: [1.6, 14], face: 0, gk: true },
    { id: 'B', cast: 'bribri', team: 'a', at: [16, 14], face: 0, number: 8 },
    { id: 'R', cast: 'radio', team: 'a', at: [20, 17], face: 0 },
    { id: 'K', cast: 'kaydoudou', team: 'a', at: [22, 5], face: 0 },
    { id: 'M', cast: 'mireille', team: 'a', at: [22, 23], face: 0 },
    { id: 'SA', cast: 'samuel', team: 'a', at: [28, 14], face: 0 },
    { id: 'J', cast: 'jules', team: 'a', at: [8, 10], face: 0 },
    lion('L2', [8, 19], 2, 0),
    { id: 'BU', cast: 'bulldozer', team: 'b', at: [26, 13], face: Math.PI },
    rival('Q1', 'requin', [42.4, 14], 1, { gk: true, look: { gloves: '#dfe9f5' } }),
    rival('Q2', 'requin', [31, 6], 2), rival('Q3', 'requin', [31, 11], 3), rival('Q4', 'requin', [31, 17], 4),
    rival('Q5', 'requin', [31, 22], 5), rival('Q6', 'requin', [36, 11], 6), rival('Q7', 'requin', [36, 17], 7),
  ]
  return [...base.map((a) => ({ ...a, ...(over[a.id] ?? {}) })), ...extra]
}

export const CH07: ChapterScript = {
  no: 7,
  ball: 'plain',
  beats: [
    /* -------------------------------------------------------------- the whole quarter is there */
    {
      kind: 'scene', id: 'micro', place: day,
      cast: match({ B: { at: [10, 3], face: Math.PI / 2 }, K: { at: [11, 3.4], face: Math.PI / 2 }, M: { at: [9, 3.6], face: Math.PI / 2 }, R: { at: [12, 3.2], face: Math.PI / 2 } },
        [{ id: 'PR', cast: 'pereRadio', at: [22, -3.4], face: Math.PI / 2 }]),
      shots: [
        {
          cam: { kind: 'on', who: 'PR', dist: 2.6 }, do: [{ a: 'pose', id: 'PR', pose: 'mic' }],
          lines: [
            S('pereRadio', "BONAMOUSSADI ! EST-CE QUE VOUS ÊTES LÀ ?"),
            N("Krrrrr ! Le haut-parleur grésille. Le père de Radio a apporté un vrai micro."),
            S('enfants', "OUAIIIS !"),
          ],
        },
        {
          cam: { kind: 'pose', pos: [30, 6, 34], look: [16, 1, 2], fov: 52 },
          lines: [
            N("Samedi 3 janvier, demi-finale du tournoi des quartiers. Il y a du monde partout, sur le mur de Monsieur Bilé, sur les toits, jusque dans le manguier. Une fanfare d'enfants tape sur des casseroles. Bing ! Bong !"),
            S('enfants', "LION-CEAUX ! LION-CEAUX !"),
            S('ekotto', "Beignets gratuits pour celui qui marque !"),
          ],
        },
        {
          cam: { kind: 'on', who: 'B', dist: 1.9 },
          lines: [
            N("Dans sa poche, BriBri a une feuille pliée en huit, avec un mot écrit si fort que le crayon a cassé : « utile »."),
            T('bribri', "Aujourd'hui, j'ose|. Sinon, je n'oserai jamais."),
            N("Après cette demi-finale, il y a la finale. Et après la finale, l'avion."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [15, 1.4, 9], look: [15, 1.3, 22], fov: 42 },
          play: async (c) => {
            for (const id of ['BU', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q1']) c.p(id).pos = { x: 10 + Math.random() * 10, y: 26 + Math.random() * 3 }
            for (const id of ['BU', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q1']) c.go(id, [12 + Math.random() * 6, 7.4 + Math.random() * 1.6], 0.45)
          },
          parallel: true,
          lines: [
            S('pereRadio', "À ma gauche, les Requins de Bépanda !|À ma droite, nos Lionceaux de Bonamoussadi !"),
            N("Les Requins arrivent en chantant. Maillots bleus, aileron dessiné au feutre dans le dos. Devant, Bulldozer. Il a encore grandi pendant les vacances de Noël. Ou alors c'est la peur qui le fait grandir."),
          ],
        },
        {
          cam: { kind: 'on', who: 'BU', dist: 2.2 },
          play: async (c) => { c.stop('BU'); c.p('BU').pos = { x: 10.6, y: 5.0 }; c.face('BU', 'B') },
          lines: [N("Il fait claquer ses dents. Clac !"), S('bulldozer', "Ça sent le lait, par ici."), S('requin', "Les Lionceaux ? Chez nous, à Bépanda, on appelle ça des chatons.", 'Q2')],
        },
        { cam: { kind: 'on', who: 'M', dist: 2 }, lines: [S('mireille', "Et chez nous, les requins, on les mange grillés, avec du plantain !")] },
        {
          cam: { kind: 'on', who: ['K', 'B'], dist: 2.4 }, do: [{ a: 'pose', id: 'K', pose: 'fist' }],
          lines: [
            N("Kaydoudou serre les poings."),
            S('kaydoudou', "Je vais lui faire un petit pont si grand qu'il va tomber dedans !"),
            S('bribri', "Pas maintenant|. Sur le terrain."),
          ],
        },
      ],
    },
    {
      kind: 'scene', id: 'ballonMami', place: day,
      cast: match({ K: { at: [2, -1.4], face: Math.PI / 2, carry: true, pose: 'hold' }, B: { at: [2, 1.0], face: -Math.PI / 2 }, M: { at: [3.4, 0.2], face: Math.PI }, O: { at: [0.8, 0.2], face: 0, gk: false }, F: { at: 'fokou', face: [2, 0], pose: 'sit' } }),
      shots: [
        {
          cam: { kind: 'on', who: ['K', 'B'], dist: 2.6 }, do: [{ a: 'ballLook', look: 'mamiPatched' }],
          lines: [N("Sous le manguier, Kaydoudou sort le ballon de Mami."), S('kaydoudou', "Ballon de Mami, aujourd'hui, tu nous regardes. D'accord ?")],
        },
      ],
    },
    {
      kind: 'play', id: 'dixPasses', place: day, prompt: 'play.tenIntro', keep: true, cast: [],
      challenge: {
        type: 'juggle', players: ['K', 'B'], count: 10, ball: 'K',
        lines: [N("Dix passes sans toucher le sol. Les enfants comptent avec eux.")],
        calls: { 8: [S('enfants', "Huit ! Neuf ! DIX !")] },
      },
    },
    {
      kind: 'scene', id: 'niCaisse', place: day, keep: true, cast: [],
      shots: [
        {
          cam: { kind: 'on', who: ['B', 'K'], dist: 1.9, height: 1.0 },
          play: async (c) => {
            c.release(); c.place([2, -0.2])
            c.face('B', 'K'); c.face('K', 'B'); c.pose('B', 'fist'); c.pose('K', 'fist'); c.sfx('touch')
            await c.wait(1.2); c.pose('B', 'heart'); c.pose('K', 'heart')
          },
          parallel: true,
          lines: [
            N("Poing contre poing. Main sur le cœur."),
            S('kaydoudou', "Aujourd'hui, on garde rien|. Ni la caisse ni la bouche."),
            S('bribri', "Ni la caisse ni la bouche"),
            N("Il le pense vraiment. Puis le match commence, et il oublie tout."),
          ],
        },
      ],
    },
    /* -------------------------------------------------------------- the first half: too risky, polite, 0-1 */
    {
      kind: 'scene', id: 'premiereMiTemps', place: day, cast: match(),
      shots: [
        {
          cam: { kind: 'match' }, do: [{ a: 'ballLook', look: 'plain' }, { a: 'sfx', kind: 'whistle' }, { a: 'score', text: '0 - 0' }],
          play: async (c) => {
            c.give('Q3'); c.go('BU', [14, 13], 0.9)
            await c.pass('Q3', 'BU', { lofted: true, flight: 1.4 })
            c.give('B')
          },
          lines: [S('pereRadio', "Coup d'envoi !|Les Requins attaquent ! Long ballon vers Bulldozer ! Et tout le monde court derrière !")],
        },
        {
          cam: { kind: 'over', who: 'B', to: [31, 14], dist: 3.4, height: 2.4, mix: 0.6 },
          play: async (c) => {
            c.give('B')
            await c.wait(1.2); await c.pass('B', 'M'); await c.pass('M', 'B'); await c.wait(1.0); await c.pass('B', 'J')
          },
          parallel: true,
          lines: [
            N("BriBri récupère. Il lève les yeux. Les maillots bleus sont serrés en ligne, comme les dents d'un peigne."),
            T('bribri', "Trop risqué."), N("Passe sur le côté."),
            N("Il récupère encore."),
            T('bribri', "Trop risqué."), N("Passe en arrière."),
          ],
        },
        {
          cam: { kind: 'match' },
          lines: [
            S('pereRadio', "Le numéro 8 donne sur le côté !|Encore sur le côté ! Très propre, mesdames et messieurs !"),
            S('ekotto', "Bien, BriBri ! Propre !"),
          ],
        },
        { cam: { kind: 'on', who: 'F', dist: 3 }, lines: [N("Sous le manguier, Tonton Fokou ne dit rien. Son silence est plus fort que la fanfare.")] },
        {
          cam: { kind: 'pose', pos: [10, 2.8, 20], look: [3, 1.4, 13], fov: 46 },
          play: async (c) => {
            c.p('BU').pos = { x: 6.8, y: 13.6 }; c.p('O').pos = { x: 1.6, y: 14.2 }
            c.give('Q5'); c.p('Q5').pos = { x: 1.0, y: 27.5 }
            await c.pass('Q5', [6.2, 13.8], { lofted: true, flight: 1.3 })
            c.give('BU')
            await c.shot('BU', [0, 14.9], { height: 1.6, speed: 12 })
            c.pose('O', 'dejected')
          },
          lines: [
            S('pereRadio', "15e minute !|Corner pour Bépanda ! Bulldozer monte... il monte... il monte encore..."),
            N("Bam ! De la tête. Le ballon glisse entre les mains d'Ousmane comme une pierre dans l'eau."),
          ],
        },
        {
          cam: { kind: 'on', who: 'BU', dist: 2.6 }, do: [{ a: 'score', text: '0 - 1' }, { a: 'pose', id: 'BU', pose: 'celebrate' }, { a: 'pose', id: 'O', pose: null }],
          lines: [N("0-1."), S('pereRadio', "Et c'est le Bulldozer qui écrase tout !|Euh... Pardon. Hou ! Hou !"), N("La fanfare se tait.")],
        },
        {
          cam: { kind: 'on', who: ['K', 'M'], dist: 2.6 }, do: [{ a: 'pose', id: 'BU', pose: null }],
          play: async (c) => { c.p('M').pos = { x: c.p('K').pos.x + 1.2, y: c.p('K').pos.y + 0.4 }; c.face('K', 'M'); c.face('M', 'K') },
          lines: [S('kaydoudou', "C'est rien !|On va revenir !"), S('mireille', "Avec quoi ?|On n'a pas tiré une seule fois !")],
        },
      ],
    },
    /* -------------------------------------------------------------- half-time: the captain speaks (played) */
    {
      kind: 'play', id: 'parler', place: day, prompt: 'play.halftimeIntro',
      cast: [
        { id: 'F', cast: 'fokou', at: [0.6, -1.4], face: [2.6, 0.6] },
        { id: 'B', cast: 'bribri', at: [2.4, 0.9], face: [2, -0.2], pose: 'sitGround', number: 8 },
        { id: 'K', cast: 'kaydoudou', at: [1.6, 1.3], face: [2, -0.2], pose: 'sitGround' },
        { id: 'M', cast: 'mireille', at: [3.4, -0.1], face: [2, -0.2], pose: 'sitGround' },
        { id: 'R', cast: 'radio', at: [3.1, 1.6], face: [2, -0.2], pose: 'sitGround' },
        { id: 'SA', cast: 'samuel', at: [0.9, 0.5], face: [2, -0.2], pose: 'sitGround' },
        { id: 'O', cast: 'ousmane', at: [1.4, -0.9], face: [2, -0.2], pose: 'sitGround' },
        { id: 'J', cast: 'jules', at: [2.8, -1.0], face: [2, -0.2], pose: 'sitGround' },
      ],
      challenge: {
        type: 'choose', prompt: 'play.speak', lockedHint: 'play.speakLocked',
        options: [
          { key: 'setaire', canon: false, line: T('bribri', "Non. Pas moi. Je préfère rater cent passes devant tout le quartier.") },
          { key: 'parler', canon: true },
        ],
        setup: async (c) => {
          c.cam({ kind: 'pose', pos: [5.6, 1.7, 3.6], look: [1.8, 0.6, 0.2], fov: 46 })
          await c.say([
            N("Ils s'assoient en rond à l'ombre du manguier. Personne ne parle. Radio, pour la première fois de sa vie, est en panne. Mireille arrache des brins d'herbe, un par un, très fort."),
            N("Tonton Fokou est debout, sur sa bonne jambe, les mains dans le dos. Il regarde chaque joueur. Puis BriBri. Plus longtemps."),
            N("Et il ne dit rien."),
          ])
          c.cam({ kind: 'on', who: 'B', dist: 1.8, height: 0.9 })
          await c.say([
            T('bribri', "Il attend que je parle|. Non. Pas moi. Je préfère rater cent passes devant tout le quartier."),
            N("Il ouvre la bouche. Rien ne sort. Kaydoudou lui donne un petit coup de genou."),
            S('kaydoudou', "Ni la caisse ni la bouche"),
          ])
        },
        after: async (c) => {
          c.pose('B', null)
          c.cam({ kind: 'on', who: 'B', dist: 2.2 })
          await c.say([
            N("BriBri se lève. Ses jambes tremblent. Sa voix aussi, mince et cassée, comme une vieille porte."),
            S('bribri', "Je... j'ai vu un truc."),
            S('radio', "Il parle !|Mesdames et messieurs, il parle !"),
            N("Mireille en lâche son brin d'herbe."),
            S('bribri', "Les Requins ont peur de Kaydoudou. Dès qu'il touche le ballon, ils sont trois sur lui. Même Bulldozer vient. Tout leur côté glisse vers la gauche. Comme une table qui penche."),
          ])
          // the plan, drawn with a stick in the dust
          c.pose('B', 'kneel')
          c.cam({ kind: 'pose', pos: [3.6, 2.6, 1.6], look: [2.2, 0, -1.2], fov: 44 })
          // the stick's lines in the dust: to the left (Kaydoudou), through the middle (the hole), the far side (Mireille)
          c.lanes([['B', [1.2, -1.6]], ['B', [2.4, -2.2]], ['B', [3.8, -1.4]]])
          await c.say([
            N("Il ramasse un bâton et dessine dans la poussière. Quand ses mains dessinent, elles tremblent moins."),
            S('bribri', "Alors on leur donne ce qu'ils veulent. On joue à gauche, vers Kaydoudou. Ils viennent. Et quand ils sont tous là, il y a un trou au milieu de leur ligne. Je l'ai vu cinq fois. Cinq fois, et je n'ai rien fait."),
            S('samuel', "Cinq fois ?|Et tu ne l'as pas dit ?"),
            S('bribri', "Je le dis maintenant. Cette fois, je passe dedans. Par le trou. Kaydoudou, tu fais deux pas vers l'intérieur, dans leur dos. Et quand tu as le ballon, tu dribbles pour les attirer. Pas pour les battre."),
            S('kaydoudou', "Pour les attirer|. Comme le miel attire les mouches."),
            S('bribri', "Mireille, tu restes de l'autre côté. Toute seule. Tu attends. Ils vont t'oublier."),
            S('mireille', "Personne ne m'oublie, moi. Mais d'accord. Je serai un fantôme. Un fantôme très rapide."),
            S('radio', "Et moi ?"),
            S('bribri', "Toi, tu cours au milieu et tu parles très fort. Ils vont te regarder."),
            S('radio', "Ça, je sais faire !"),
          ])
          c.lanes(null)
          c.pose('B', 'point')
          c.cam({ kind: 'on', who: ['B', 'K'], dist: 2.4 })
          await c.say([
            N("Pour la première fois, tout le monde rit. BriBri lève la main, l'index et le majeur tendus."),
            S('bribri', "Et si je fais ça, deux doigts, Kaydoudou, tu me donnes le ballon et tu pars tout droit. Je te le rends dans le dos de Bulldozer."),
            N("Les yeux de Kaydoudou s'allument. Même Ousmane parle, ce qui n'arrive jamais."),
            S('ousmane', "Et moi, je ferme la porte."),
          ])
          c.pose('B', 'sitGround')
          c.cam({ kind: 'on', who: 'F', dist: 2.4 })
          await c.say([N("BriBri se rassoit, les oreilles en feu. Tonton Fokou s'éclaircit la gorge."), S('fokou', "Vous avez entendu votre capitaine.")])
          c.pose('K', null)
          c.cam({ kind: 'on', who: ['K', 'B'], dist: 2.4 })
          c.pose('K', 'wave')
          await c.say([S('kaydoudou', "Capitaine BriBri !"), T('bribri', "Capitaine ? Moi ?")])
          for (const id of ['B', 'K', 'M', 'R', 'SA', 'O', 'J']) c.pose(id, null)
          c.cam({ kind: 'pose', pos: [6, 1.6, 3], look: [2, 1.0, 0], fov: 46 })
          await c.say([N("Houou ! L'équipe se lève autour de lui comme un seul corps.")])
        },
      },
    },
    /* -------------------------------------------------------------- the table leans */
    {
      kind: 'scene', id: 'gauche', place: day, cast: match({ K: { at: [20, 4] } }),
      shots: [
        {
          cam: { kind: 'match' }, do: [{ a: 'score', text: '0 - 1' }, { a: 'sfx', kind: 'whistle' }],
          play: async (c) => {
            c.give('B')
            for (let i = 0; i < 3; i++) {
              await c.pass('B', 'K')
              for (const id of ['Q2', 'Q3', 'BU']) c.go(id, [c.p('K').pos.x + 1.5 + Math.random() * 2, 4 + Math.random() * 4], 0.7)
              await c.wait(0.8)
              await c.pass('K', 'B')
            }
          },
          lines: [
            S('pereRadio', "Deuxième mi-temps !|Les Lionceaux jouent à gauche... encore à gauche... toujours à gauche ! Ils ont perdu leur boussole ou quoi ?"),
            N("Une fois. Deux fois. Trois fois. Des gens sifflent."),
            S('bulldozer', "Alors, les chatons ?|On a peur d'avancer ?"),
          ],
        },
      ],
    },
    /* -------------------------------------------------------------- the pass that crosses the line (played, canon) */
    {
      kind: 'play', id: 'aiguille', place: day, prompt: 'play.throughIntro2',
      cast: match({
        B: { at: [18, 12] }, K: { at: [24, 5.6], ball: true }, R: { at: [24, 15] }, M: { at: [27, 24.5] }, SA: { at: [30, 18] },
        Q2: { at: [25.5, 4.4] }, Q3: { at: [26, 7.2] }, BU: { at: [24.4, 8.6] }, Q4: { at: [30, 16.4] }, Q5: { at: [31, 21] }, Q6: { at: [36, 9] }, Q7: { at: [36, 13] },
      }),
      challenge: {
        type: 'oneTouch', player: 'B', to: 'K', lead: 0.8,
        setup: async (c) => {
          c.cam({ kind: 'match' })
          await c.say([
            N("À la quatrième fois, BriBri voit la table pencher."),
            N("Trois maillots bleus autour de Kaydoudou. Bulldozer qui arrive en courant. Et au milieu de leur ligne... un trou. Large comme une porte de garage."),
          ])
          c.go('K', [29.5, 11.4], 0.55)
          await c.pass('K', 'B')
          c.cam({ kind: 'over', who: 'B', to: [29.5, 11.4], dist: 5.4, height: 4, mix: 0.45 })
          await c.say([
            N("Kaydoudou rend le ballon et fait deux pas. Vers l'intérieur. Dans le dos des Requins."),
            N("Tout ralentit."),
            N("La poussière rouge flotte dans l'air. Le ballon tourne doucement devant le pied de BriBri. Dans sa tête, des voix crient."),
            T('bribri', "Tu vas rater ! Contre-attaque !"),
            N("Puis la voix de Papa passe devant les autres."),
            S('papa', "Si le paquet se perd, on en renvoie un autre."),
          ])
        },
        after: async (c) => {
          c.cam({ kind: 'match' })
          await c.say([N("Il frappe."), N("Le ballon file au ras de la terre rouge, entre deux maillots bleus. Il traverse la ligne comme une aiguille traverse un tissu. Et il arrive pile dans les pieds de Kaydoudou.")])
          await c.until(() => c.w.ball.owner === 'K', 4).catch(() => {})
          c.give('K')
          c.go('Q6', [33.5, 11.6], 0.8); c.go('Q7', [33.6, 13.8], 0.8)
          await c.say([
            N("Kaydoudou se retourne. Devant lui, deux défenseurs et le gardien. Avant, il les aurait dribblés pour le spectacle. Cette fois, il avance droit sur eux. Lentement. Il hoche la tête comme un lézard : le crochet du margouillat, en promesse."),
          ])
          await c.move('K', [31.5, 12.4], 0.45)
          c.go('M', [36, 20], 1)
          await c.say([N("Les deux défenseurs sortent ensemble. Tous les deux."), N("Et sur la droite, toute seule, oubliée, la Gazelle arrive.")])
          await c.pass('K', 'M', { lead: 0.6 })
          c.give('M')
          await c.say([N("Kaydoudou glisse le ballon entre eux, sans même la regarder. Mireille le pose dans le coin, comme on pose une assiette sur une table.")])
          await c.shot('M', [44, 15.4], { height: 0.3, speed: 12 })
          c.score('1 - 1')
          await c.say([N("1-1."), S('pereRadio', "BUT ! BUT DE LA GAZELLE !|Mesdames et messieurs, vous avez vu la passe du numéro 8 ? Ce n'est pas une passe, c'est une flèche !")])
          c.cam({ kind: 'on', who: 'EK', dist: 3 }); c.pose('EK', 'wave')
          await c.say([N("La fanfare explose. Madame Ekotto jette son carton en l'air."), S('ekotto', "Mireille ! Viens chercher tes beignets !")])
          c.pose('EK', null)
          c.cam({ kind: 'on', who: ['M', 'B'], dist: 2.4 })
          c.p('M').pos = { x: c.p('B').pos.x + 1, y: c.p('B').pos.y + 0.3 }; c.face('M', 'B'); c.face('B', 'M'); c.pose('M', 'palm')
          await c.say([N("Mais Mireille court donner une grande tape dans le dos de BriBri."), S('mireille', "Tu vois ? Quand tu parles, ça marche !")])
          c.pose('M', null)
          c.cam({ kind: 'on', who: 'BU', dist: 2.4 })
          await c.say([N("Bulldozer, lui, ne fait plus claquer ses dents."), S('bulldozer', "Ce n'était pas prévu, ça !")])
          c.cam({ kind: 'on', who: 'F', dist: 3 }); c.pose('F', 'wave')
          await c.say([N("Sous le manguier, Tonton Fokou lève sa casquette."), S('fokou', "Voilà ! Le ballon voyage !")])
          c.pose('F', null)
        },
      },
    },
    /* -------------------------------------------------------------- a wounded shark */
    {
      kind: 'scene', id: 'requinBlesse', place: day, cast: match({ BU: { at: [12, 12], ball: true }, O: { at: [1.6, 13.4] } }),
      shots: [
        {
          cam: { kind: 'match' }, do: [{ a: 'score', text: '1 - 1' }],
          play: async (c) => {
            await c.shot('BU', [0, 12.8], { height: 1.2, speed: 15 }); c.pose('O', 'catch'); await c.wait(0.8); c.pose('O', null)
            c.give('BU'); await c.wait(0.4)
            await c.shot('BU', [0, 16.2], { height: 2.2, speed: 16 }); c.pose('O', 'dive')
          },
          lines: [
            N("Un requin blessé devient méchant."),
            S('pereRadio', "Tir de Bulldozer !|Arrêt d'Ousmane ! Encore Bulldozer ! Ousmane s'envole... il s'envole... il atterrit dans le manguier !"),
          ],
        },
        { cam: { kind: 'on', who: 'O', dist: 2.2 }, do: [{ a: 'pose', id: 'O', pose: null }], lines: [N("Ousmane se relève avec des feuilles dans les cheveux. Pas un mot.")] },
      ],
    },
    /* -------------------------------------------------------------- two fingers (played) */
    {
      kind: 'play', id: 'deuxDoigts', place: day, prompt: 'play.signalIntro',
      cast: match({ O: { at: [4, 13], ball: true }, B: { at: [15, 9] }, K: { at: [17.2, 6], face: 'B' }, BU: { at: [17.6, 5.2], face: 'K' }, Q3: { at: [21, 9.6] } }),
      challenge: {
        type: 'ritual',
        steps: [
          {
            key: 'deuxDoigts',
            act: async (c) => {
              c.pose('B', 'point')
              c.cam({ kind: 'on', who: ['B', 'K'], dist: 2.4 })
              await c.say([N("BriBri lève deux doigts."), S('pereRadio', "Le grand frère lève deux doigts !|Qu'est-ce que ça veut dire ? Personne ne sait !")])
              c.pose('B', null)
            },
          },
        ],
      },
    },
    {
      kind: 'play', id: 'uneDeux', place: day, prompt: 'play.oneTwoIntro', keep: true, cast: [],
      challenge: {
        type: 'oneTouch', player: 'B', to: 'K', lead: 1.2,
        setup: async (c) => {
          c.cam({ kind: 'match' })
          await c.pass('O', 'B')
          c.face('B', 'K')
          await c.pass('B', 'K')
          c.go('K', [30, 7.6], 1); c.go('BU', [22, 6.4], 0.6)
          await c.pass('K', 'B')
          c.cam({ kind: 'over', who: 'B', to: [28, 7], dist: 5, height: 3.8, mix: 0.5 })
          await c.say([N("Kaydoudou, lui, sait. Il donne le ballon et part tout droit, comme une flèche. BriBri remet en une seule touche, par-dessus le pied tendu d'un Requin, dans le dos de Bulldozer. Là où Kaydoudou arrive déjà.")])
        },
        after: async (c) => {
          c.cam({ kind: 'match' })
          await c.say([S('pereRadio', "Bulldozer se retourne... TROP TARD !")])
          await c.until(() => c.w.ball.owner === 'K', 4).catch(() => {})
          c.give('K')
          await c.move('K', [38.5, 12.6], 0.85)
          c.go('Q1', [41.2, 13.2], 0.8); c.pose('Q1', 'dive')
          await c.say([N("Seul devant le gardien, Kaydoudou attend qu'il plonge. Puis il pousse le ballon de l'autre côté. Doucement. Presque poliment.")])
          await c.shot('K', [44, 15.6], { height: 0.2, speed: 7 })
          c.score('2 - 1'); c.pose('Q1', null)
          await c.say([N("2-1."), S('pereRadio', "Les Lionceaux passent devant !"), S('ekotto', "Kaydoudou ! Deux beignets !|Non, trois !")])
          c.cam({ kind: 'follow', who: 'K', dist: 4.5, height: 2.2 })
          await c.move('K', [43.6, 27.6], 0.9)
          c.pose('K', 'dance')
          await c.say([N("Kaydoudou court au coin, là où un bout de bambou sert de drapeau. Une main sur le ventre, l'autre au ciel, les hanches qui roulent comme une pirogue sur le fleuve. La danse de Roger Milla ! Et tout Bonamoussadi danse avec lui.")])
          c.pose('K', null)
          c.p('B').pos = { x: 43.15, y: 27.35 }; c.face('B', 'K'); c.face('K', 'B'); c.pose('K', 'embrace'); c.pose('B', 'embrace')
          c.cam({ kind: 'on', who: ['K', 'B'], dist: 2.4 })
          await c.say([
            S('kaydoudou', "Le une-deux du Njangi !|Deux doigts ! Ça s'appelle le une-deux du Njangi !"),
            S('radio', "Le une-deux du quoi ?"),
            S('kaydoudou', "Du NJANGI ! Chacun verse sa part, et à la fin, on touche la caisse !"),
          ])
          c.pose('K', null); c.pose('B', null)
          c.p('R').pos = { x: 41.4, y: 26.4 }; c.face('R', 'K'); c.pose('R', 'mic')
          c.cam({ kind: 'on', who: 'R', dist: 2.2 })
          await c.say([N("Radio remet sa main en micro."), S('radio', "Mesdames et messieurs, retenez bien ce nom ! Le une-deux du Njangi !")])
          c.pose('R', null)
          c.cam({ kind: 'on', who: 'F', dist: 3 }); c.sfx('whistle')
          await c.say([N("Houou ! Tonton Fokou siffle la fin. Le hibou enrhumé a l'air de rire.")])
          c.p('BU').pos = { x: 41.6, y: 26.0 }; c.face('BU', 'B'); c.face('B', 'BU'); c.pose('BU', 'palm'); c.pose('B', 'palm')
          c.cam({ kind: 'on', who: ['BU', 'B'], dist: 2.4 })
          await c.say([N("Bulldozer s'arrête devant BriBri et lui tend la main."), S('bulldozer', "Pas mal, les chatons."), S('bribri', "Lionceaux"), N("Et il serre la main.")])
          c.pose('BU', null); c.pose('B', null)
        },
      },
    },
    /* -------------------------------------------------------------- the notebook in pagne */
    {
      kind: 'scene', id: 'carnet', place: { id: 'bona', mood: 'golden', opts: { crowd: 'none' } },
      cast: [
        { id: 'F', cast: 'fokou', at: [-0.6, -1.6], face: [3, 1] },
        { id: 'B', cast: 'bribri', at: [6, 5], face: Math.PI, number: 8 },
        { id: 'K', cast: 'kaydoudou', at: [6.8, 5.6], face: Math.PI },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [5, 1.6, 3.6], look: [-0.6, 1.0, -1.6], fov: 46 },
          play: async (c) => { c.go('K', [0.9, 0.0], 0.35); await c.move('B', [0.5, -0.6], 0.35); c.face('B', 'F'); c.face('K', 'F') },
          parallel: true,
          lines: [
            N("Plus tard, quand la foule est partie, Tonton Fokou appelle depuis le manguier."),
            S('fokou', "Capitaine ! Viens par ici."),
            N("Kaydoudou suit, évidemment."),
            N("Le soleil descend, et sa lumière dorée glisse à ras de terre. Tonton Fokou, casquette usée et sifflet au cou, se tient sur sa bonne jambe, l'autre un peu pliée. Il défait un paquet de papier journal, sans se presser. Puis il tend ce qu'il y a dedans, avec ses deux mains."),
          ],
        },
        {
          cam: { kind: 'on', who: ['F', 'B'], dist: 2.2 }, do: [{ a: 'pose', id: 'F', pose: 'hold' }, { a: 'pose', id: 'B', pose: 'hold' }],
          lines: [
            N("Un cahier. Épais. Couvert de pagne vert et orange, cousu tout autour à petits points."),
            N("BriBri le prend tout doucement, avec émotion. Ses mains sont encore rouges de poussière, comme son maillot 8. Derrière lui, Kaydoudou sautille sur la pointe des pieds pour voir par-dessus son épaule."),
            S('kaydoudou', "Fais voir ! Il y a des calebasses sur le pagne ! Des vraies calebasses !"),
            S('fokou', "C'est ma femme, Mama Odile, qui l'a habillé|. Elle dit que les choses importantes doivent avoir de beaux vêtements."),
            S('bribri', "Mais... pourquoi moi ?"),
            S('fokou', "Parce que je sais que tu écris. Sur des feuilles volantes. Dans ton cahier de maths."),
            N("BriBri devient tout rouge et se tourne vers Kaydoudou, qui regarde soudain le manguier avec un très, très grand intérêt."),
            S('fokou', "Ton frère l'a dit à Madame Ekotto|. Et Madame Ekotto l'a dit au marché entier."),
          ],
        },
        {
          cam: { kind: 'on', who: 'F', dist: 1.9 }, do: [{ a: 'pose', id: 'F', pose: 'palm' }],
          lines: [
            N("Il pose la main sur l'épaule de BriBri."),
            S('fokou', "Moi aussi, j'étais un 8, autrefois. Je voyais tout, et je ne disais rien. Personne ne m'a jamais donné de cahier."),
            N("Il tapote le pagne."),
            S('fokou', "Écris ce que le ballon t'apprend. Partout où tu iras."),
            S('bribri', "Et si le ballon ne m'apprend rien ?"),
            S('fokou', "Le ballon parle tout le temps, mon fils. Il faut juste écouter."),
          ],
        },
        {
          cam: { kind: 'on', who: 'B', dist: 1.8 }, do: [{ a: 'pose', id: 'F', pose: null }],
          lines: [N("BriBri serre le carnet contre lui."), S('bribri', "Merci, Tonton."), N("Cette fois, sa voix ne tremble pas.")],
        },
      ],
    },
    /* -------------------------------------------------------------- four tickets */
    {
      kind: 'scene', id: 'billets', place: { id: 'maison', mood: 'interiorNight', opts: { night: true } },
      cast: [
        { id: 'B', cast: 'bribri', at: [4.75, 3.95], face: Math.PI / 2, pose: 'sit', number: 8 },
        { id: 'K', cast: 'kaydoudou', at: [5.65, 4.6], face: Math.PI, pose: 'sit' },
        { id: 'maman', cast: 'maman', at: [2.4, 2.6], face: 0.6 },
        { id: 'papa', cast: 'papa', at: [0.4, 4.6], face: 0 },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [6.8, 1.5, 5.4], look: [4.9, 0.85, 4.1], fov: 42 },
          lines: [
            N("Le soir, BriBri recopie ses six premières leçons dans le carnet. Une par page. Les schémas à la règle."),
            S('kaydoudou', "Je peux dessiner un requin ?"),
            S('bribri', "Dans la marge. Tout petit."),
            N("Kaydoudou dessine un requin minuscule, avec des dents énormes. BriBri ouvre la septième page, écrit la date et souligne deux fois le titre."),
          ],
        },
        {
          cam: { kind: 'on', who: 'maman', dist: 2.4 },
          play: async (c) => { await c.move('maman', [3.6, 2.2], 0.3) },
          parallel: true,
          lines: [S('maman', "Range ta règle, l'écrivain|. On mange bientôt.")],
        },
        {
          cam: { kind: 'on', who: 'papa', dist: 2.6 }, do: [{ a: 'pose', id: 'papa', pose: 'hold' }],
          lines: [
            N("Quand il relève la tête, Papa est à la porte, une enveloppe à la main."),
            S('papa', "Le comité des quartiers a appelé. La finale contre les Panthères de Deïdo, c'est samedi prochain."),
          ],
        },
        { cam: { kind: 'on', who: 'K', dist: 1.8 }, do: [{ a: 'pose', id: 'K', pose: 'fist' }], lines: [S('kaydoudou', "Samedi !|On va les croquer !")] },
        {
          cam: { kind: 'on', who: 'papa', dist: 2 }, do: [{ a: 'pose', id: 'K', pose: 'sit' }],
          lines: [
            N("Papa ne sourit pas tout à fait. Il ouvre l'enveloppe. Dedans, il y a quatre billets d'avion. Douala, Paris, Washington."),
            S('papa', "Et le départ, c'est le lundi suivant."),
          ],
        },
      ],
    },
    { kind: 'lesson', no: 7 },
  ],
}
