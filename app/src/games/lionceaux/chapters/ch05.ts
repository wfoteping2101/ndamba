// Chapitre 5, « La passe polie et la passe utile » (POV BriBri). Source: tome1/chapters/05-la-passe-polie-et-la-passe-utile.md.
// Every line is the chapter's text. Played: the moment the match stops like a paused video, Radio
// alone in the comb: the pass that crosses the line is there and locked with the book's own fear
// (« Et si je rate ? »), the polite pass to Mireille is the one he plays (canon); at night, the two
// arrows of the notebook: the polite one draws itself, the player draws the useful one.
import type { ChapterScript } from '../story/session'
import type { ActorSpec } from '../story/types'
import { N, S, T, lion, rival } from './helpers'

const grey = { id: 'bona' as const, mood: 'overcast' as const, opts: { crowd: 'many' as const } }

/** Lionceaux (attack right) against the Cobras de Bonabéri, « serrés comme les dents d'un peigne ». */
function match(over: Record<string, Partial<ActorSpec>> = {}, extra: ActorSpec[] = []): ActorSpec[] {
  const base: ActorSpec[] = [
    { id: 'F', cast: 'fokou', at: 'fokou', face: [22, 14], pose: 'sit' },
    { id: 'EK', cast: 'ekotto', at: [47.6, 24.0], face: [30, 14] },
    { id: 'O', cast: 'ousmane', team: 'a', at: [1.6, 14], face: 0, gk: true },
    { id: 'B', cast: 'bribri', team: 'a', at: [22, 14], face: 0, number: 8 },
    { id: 'R', cast: 'radio', team: 'a', at: [26, 17], face: 0 },
    { id: 'K', cast: 'kaydoudou', team: 'a', at: [26, 5], face: 0 },
    { id: 'M', cast: 'mireille', team: 'a', at: [25, 23], face: 0 },
    { id: 'SA', cast: 'samuel', team: 'a', at: [34, 14], face: 0 },
    { id: 'J', cast: 'jules', team: 'a', at: [11, 10], face: 0 },
    lion('L2', [11, 19], 2, 0),
    rival('C1', 'cobra', [42.4, 14], 1, { gk: true, look: { gloves: '#9bd16a' } }),
    // the comb: a first line of four across the pitch, three behind
    rival('C2', 'cobra', [30, 7.5], 2), rival('C3', 'cobra', [30, 12], 3), rival('C4', 'cobra', [30, 16.8], 4), rival('C5', 'cobra', [30, 21.5], 5),
    rival('C6', 'cobra', [36, 10], 6), rival('C7', 'cobra', [36, 18], 7),
  ]
  return [...base.map((a) => ({ ...a, ...(over[a.id] ?? {}) })), ...extra]
}

/** The grown-ups of the quarter by Madame Ekotto's corner. */
const people: ActorSpec[] = [
  { id: 'papa', cast: 'papa', at: [44.2, 29.6], face: Math.PI },
  { id: 'BI', cast: 'bile', at: [40.6, 30.0], face: -Math.PI / 2 },
  { id: 'PS', cast: 'pereSamuel', at: [42.2, 30.6], face: -Math.PI / 2 },
  { id: 'DA', cast: 'inconnue', at: [46.2, 30.4], face: -Math.PI / 2 },
]

export const CH05: ChapterScript = {
  no: 5,
  ball: 'plain',
  beats: [
    /* -------------------------------------------------------------- « Propre ! » */
    {
      kind: 'scene', id: 'propre', place: grey, cast: match(),
      shots: [
        {
          cam: { kind: 'on', who: 'EK', dist: 3 }, do: [{ a: 'pose', id: 'EK', pose: 'wave' }, { a: 'score', text: '0 - 0' }],
          lines: [S('ekotto', "Propre ! Très propre, BriBri !"), N("Sous son parasol rouge, Madame Ekotto applaudit avec ses mains pleines d'huile de beignet.")],
        },
        {
          cam: { kind: 'match' }, do: [{ a: 'pose', id: 'EK', pose: null }],
          play: async (c) => { c.give('B'); await c.pass('B', 'M') },
          lines: [
            N("BriBri vient de faire une passe sur le côté. Encore une."),
            S('radio', "Dernier match de poule, mesdames et messieurs !|Lionceaux contre Cobras de Bonabéri ! Le ciel est gris, le match est gris, et c'est toujours 0-0 !"),
          ],
        },
        {
          cam: { kind: 'on', who: 'B', dist: 2 },
          lines: [
            N("BriBri fait ses comptes, comme toujours."),
            T('bribri', "Une défaite contre les Requins. Une victoire contre les Aigles, avec la passe de Kaydoudou. Si on gagne, on est en demi-finale. Si on fait match nul, ça dépend des buts. Si on perd, c'est fini."),
          ],
        },
        { cam: { kind: 'on', who: 'M', dist: 2.2 }, do: [{ a: 'pose', id: 'M', pose: 'open' }], lines: [S('mireille', "Ils sont serrés comme les dents d'un peigne !|On ne passe nulle part !")] },
        {
          // high and behind: the ball goes round in front of the comb, never through it
          cam: { kind: 'pose', pos: [12, 9, 14], look: [28, 0, 14], fov: 50 }, do: [{ a: 'pose', id: 'M', pose: null }],
          play: async (c) => {
            c.give('M')
            await c.pass('M', 'B'); await c.pass('B', 'K'); await c.pass('K', 'B'); await c.pass('B', 'J'); await c.pass('J', 'B'); await c.pass('B', 'M')
          },
          parallel: true,
          lines: [
            S('radio', "BriBri à Mireille|. Mireille à BriBri. BriBri à Kaydoudou. Kaydoudou à BriBri. BriBri en arrière... Mesdames et messieurs, le ballon fait le tour du rond-point ! Il cherche la sortie !"),
            S('ekotto', "Propre !"),
            N("Le ballon voyage, oui. Mais toujours devant les Cobras. Jamais à travers."),
          ],
        },
        { cam: { kind: 'on', who: 'F', dist: 3 }, lines: [N("Sous le manguier, Tonton Fokou ne dit rien. Rien du tout.")] },
      ],
    },
    /* -------------------------------------------------------------- the paused video (played, canon: the polite pass) */
    {
      kind: 'play', id: 'pause', place: grey, prompt: 'play.throughIntro',
      cast: match({ B: { at: [21, 15] }, R: { at: [32.6, 14.4], face: Math.PI }, M: { at: [24, 23.5] }, K: { at: [27, 5] }, J: { at: [16, 10], ball: true } }),
      challenge: {
        type: 'choose', prompt: 'play.passChoice', lockedHint: 'play.passLocked',
        options: [
          { key: 'traverser', canon: false, line: T('bribri', "Et si je rate ?") },
          { key: 'cote', canon: true },
        ],
        setup: async (c) => {
          c.cam({ kind: 'match' })
          await c.say([N("Puis ça arrive.")])
          await c.pass('J', 'B')
          c.face('B', 'R')
          c.cam({ kind: 'over', who: 'B', to: 'R', dist: 4.6, height: 3.2, mix: 0.6 })
          await c.say([N("BriBri reçoit le ballon au milieu. Il lève la tête."), N("Et il voit Radio.")])
          c.lanes([['B', 'R'], ['B', 'M']])
          await c.say([
            N("Seul. Dans le dos de la première ligne de Cobras. Juste là, au milieu du peigne, dans un trou grand comme une porte."),
            N("Tout s'arrête, comme une vidéo sur pause."),
            N("Il faudrait une passe à ras de terre. Entre deux jambes. Avec juste assez de force."),
            N("BriBri regarde Radio. Il regarde les deux Cobras. Il calcule. Et dans sa tête, il voit tout ce qui peut rater. Le ballon dans les pieds d'un Cobra. La contre-attaque. Le but. La défaite. Et tous les yeux du quartier sur lui."),
            T('bribri', "Et si je rate ?"),
          ])
        },
        after: async (c) => {
          c.pose('R', 'wave')
          await c.say([S('radio', "BriBri !|Ici !")])
          c.lanes(null)
          c.cam({ kind: 'match' })
          await Promise.all([c.pass('B', 'M'), c.say([N("BriBri donne le ballon à Mireille. Sur le côté."), N("Proprement.")])])
          c.cam({ kind: 'on', who: 'R', dist: 2.4 })
          c.pose('R', 'dejected')
          await c.say([N("Les bras de Radio retombent."), S('radio', "Pourquoi ?")])
          c.pose('R', null)
        },
      },
    },
    /* -------------------------------------------------------------- the last minute */
    {
      kind: 'scene', id: 'derniereMinute', place: grey, cast: match({ M: { at: [33.5, 6], ball: true }, C2: { at: [37.5, 10.5] }, C3: { at: [37.6, 11.6] }, C4: { at: [37.7, 12.7] } }),
      shots: [
        {
          cam: { kind: 'match' }, do: [{ a: 'score', text: '0 - 0' }],
          play: async (c) => {
            await c.wait(1)
            await c.shot('M', [44, 12.6], { height: 1.9, speed: 16 })
            c.sfx('net'); c.score('1 - 0')
            await c.wait(1.2)
            c.give('C6'); c.go('C7', [12, 10], 1); c.go('O', [1.6, 13], 0.8)
            await c.pass('C6', 'C7', { lofted: true, flight: 1.6 })
            await c.move('C7', [7, 12.5], 1)
            await c.shot('C7', [0, 15.3], { height: 0.6, speed: 15 })
            c.score('1 - 1')
          },
          lines: [
            N("Le 0-0 tient jusqu'à la toute dernière minute."),
            S('radio', "Coup franc pour les Lionceaux !|La Gazelle pose le ballon... elle frappe... BUUUT ! 1-0 ! Et... non ! Les Cobras remontent tout le terrain ! Ils frappent... 1-1 ! Dans la même minute ! Mesdames et messieurs, mon cœur !"),
          ],
        },
        { cam: { kind: 'on', who: 'F', dist: 3 }, do: [{ a: 'sfx', kind: 'whistle' }, { a: 'score', text: '1 - 1' }], lines: [N("Houou ! Tonton Fokou siffle la fin.")] },
        {
          cam: { kind: 'on', who: ['K', 'B'], dist: 2.6 },
          play: async (c) => { c.p('K').pos = { x: c.p('B').pos.x + 0.9, y: c.p('B').pos.y + 0.3 }; c.face('K', 'B'); c.face('B', 'K') },
          lines: [S('kaydoudou', "On est qualifiés ?|Dis, on est qualifiés ?"), S('bribri', "Je ne sais pas|. Ça dépend des buts. Il faut attendre ce soir.")],
        },
      ],
    },
    /* -------------------------------------------------------------- « Quel joli garçon propre ! » */
    {
      kind: 'scene', id: 'joliGarcon', place: grey,
      cast: [
        { id: 'F', cast: 'fokou', at: 'fokou', face: [6, 4], pose: null },
        { id: 'EK', cast: 'ekotto', at: [43.4, 28.4], face: Math.PI / 2 },
        { id: 'B', cast: 'bribri', at: [43.4, 29.4], face: -Math.PI / 2, number: 8 },
        { id: 'K', cast: 'kaydoudou', at: [41.4, 27.6], face: 0 },
        { id: 'R', cast: 'radio', at: [40.6, 28.4], face: 0 },
        ...people,
      ],
      shots: [
        {
          cam: { kind: 'on', who: ['EK', 'B'], dist: 2.2 }, do: [{ a: 'pose', id: 'EK', pose: 'palm' }],
          lines: [
            S('ekotto', "Quel joli garçon propre !"),
            N("Madame Ekotto lui pince la joue avec ses doigts qui sentent l'huile. BriBri sourit sans montrer qu'il a mal."),
          ],
        },
        {
          cam: { kind: 'on', who: ['EK', 'papa'], dist: 2.8 }, do: [{ a: 'pose', id: 'EK', pose: 'talk' }, { a: 'face', id: 'EK', to: 'papa' }, { a: 'face', id: 'papa', to: 'EK' }],
          lines: [S('ekotto', "Tu as vu, Armand ?|Ton fils ne perd jamais le ballon. Jamais ! C'est un comptable, ce petit. Il range le ballon comme on range l'argent à la banque.")],
        },
        { cam: { kind: 'on', who: 'BI', dist: 2.2 }, do: [{ a: 'pose', id: 'EK', pose: null }], lines: [S('bile', "C'est rare, un enfant si calme")] },
        { cam: { kind: 'on', who: 'PS', dist: 2.2 }, lines: [S('pereSamuel', "C'est un futur capitaine")] },
        { cam: { kind: 'on', who: 'DA', dist: 2.2 }, lines: [S('inconnue', "Très propre, très propre")] },
        {
          cam: { kind: 'on', who: 'B', dist: 1.8 },
          lines: [
            N("BriBri aime bien ce mot. Propre. C'est comme rendre un devoir sans une seule rature."),
            N("Pourtant, quelque chose le gratte. Comme un grain de sable dans une chaussure."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [3.6, 1.5, 2.4], look: [-1.2, 0.9, -2.2], fov: 44 },
          play: async (c) => { c.pose('F', 'kneel') },
          lines: [N("Sous le manguier, Tonton Fokou range ses bambous dans un sac de riz. Sans un mot.")],
        },
        {
          cam: { kind: 'on', who: ['K', 'B', 'R'], dist: 2.8 },
          play: async (c) => { c.p('K').pos = { x: 42.6, y: 28.0 }; c.p('R').pos = { x: 41.9, y: 28.8 }; c.face('K', 'B'); c.face('R', 'B'); c.face('B', 'K') },
          lines: [
            S('kaydoudou', "Tonton ne te dit plus rien, hein ?|À moi, il crie dessus. À Radio, il a dit qu'il commentait mieux qu'il ne jouait."),
            S('radio', "Et j'ai boudé une heure|. Record personnel."),
            N("Mais à BriBri, rien. Pas un reproche. Pas un compliment."),
            N("Et c'est ce silence qui gratte."),
          ],
        },
      ],
    },
    /* -------------------------------------------------------------- qualified by one goal */
    {
      kind: 'scene', id: 'classement', place: { id: 'bona', mood: 'evening', opts: { crowd: 'none' } },
      cast: [{ id: 'R', cast: 'radio', at: [-12, -6], face: 0 }],
      shots: [
        {
          cam: { kind: 'follow', who: 'R', dist: 5, height: 2.4 },
          play: async (c) => { c.pose('R', 'mic'); await c.move('R', [26, -6.5], 0.95) },
          parallel: true,
          lines: [
            N("Le soir, Radio court dans la rue en criant."),
            S('radio', "Classement de la poule !|Premiers, les Requins, trois victoires ! Deuxièmes... les Lionceaux ! À égalité de points avec les Cobras, mais avec un but de plus ! Qualifiés ! Qualifiés d'un seul but, mesdames et messieurs !"),
          ],
        },
      ],
    },
    {
      kind: 'scene', id: 'canape', place: { id: 'maison', mood: 'interiorNight', opts: { night: true } },
      cast: [
        { id: 'K', cast: 'kaydoudou', at: [2.2, 1.2], face: Math.PI / 2 },
        { id: 'B', cast: 'bribri', at: [4.4, 3.6], face: Math.PI, look: { number: undefined, collar: '#F2EEE3' } },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [5.4, 1.5, 4.8], look: [2.2, 0.9, 1.2], fov: 46 },
          do: [{ a: 'pose', id: 'K', pose: 'celebrate' }],
          lines: [S('kaydoudou', "Qualifiés !"), N("Les voisins applaudissent à leurs fenêtres.")],
        },
      ],
    },
    /* -------------------------------------------------------------- the draw, in an old cap */
    {
      kind: 'scene', id: 'tirage', place: { id: 'bona', mood: 'morning', opts: { crowd: 'few' } },
      cast: [
        { id: 'P', cast: 'president', at: [22, -2.6], face: Math.PI / 2 },
        { id: 'R', cast: 'radio', at: [20.6, -0.8], face: 'P' },
        { id: 'K', cast: 'kaydoudou', at: [21.4, -0.4], face: 'P' },
        { id: 'B', cast: 'bribri', at: [22.3, -0.3], face: 'P', number: 8 },
        { id: 'M', cast: 'mireille', at: [23.2, -0.6], face: 'P' },
        { id: 'SA', cast: 'samuel', at: [24, -1.1], face: 'P' },
      ],
      shots: [
        {
          cam: { kind: 'on', who: 'P', dist: 2.6 }, do: [{ a: 'pose', id: 'P', pose: 'hold' }],
          lines: [N("Le lendemain, le président du comité des quartiers fait le tirage au sort des demi-finales, dans sa vieille casquette.")],
        },
        { cam: { kind: 'on', who: 'R', dist: 1.9 }, lines: [S('radio', "Il plonge la main|. Il sort un papier. Suspense, mesdames et messieurs...")] },
        { cam: { kind: 'on', who: 'P', dist: 2.2 }, do: [{ a: 'pose', id: 'P', pose: 'palm' }], lines: [S('president', "Lionceaux de Bonamoussadi... contre Requins de Bépanda"), N("Encore eux.")] },
        { cam: { kind: 'on', who: 'M', dist: 2 }, do: [{ a: 'pose', id: 'P', pose: null }], lines: [S('mireille', "Tant mieux|. Je n'ai pas fini avec eux.")] },
        { cam: { kind: 'on', who: 'K', dist: 1.9 }, do: [{ a: 'pose', id: 'K', pose: 'fist' }], lines: [N("Kaydoudou serre les poings."), S('kaydoudou', "Bulldozer. Cette fois, c'est nous qui allons le manger.")] },
      ],
    },
    /* -------------------------------------------------------------- the mango and the knife */
    {
      kind: 'scene', id: 'mango', place: { id: 'bona', mood: 'golden', opts: { crowd: 'none' } },
      cast: [
        { id: 'F', cast: 'fokou', at: 'fokou', face: [1, 0.6], pose: 'sit' },
        { id: 'B', cast: 'bribri', at: [6, 4], face: Math.PI, number: 8 },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [5, 1.6, 4.5], look: [-1, 0.9, -1.6], fov: 44 },
          play: async (c) => { await c.move('B', [1.1, 0.9], 0.35); c.face('B', 'F') },
          lines: [
            N("Le lundi, en rentrant de l'école, BriBri passe devant la boutique de Madame Ekotto."),
            S('fokou', "BriBri. Viens."),
            N("Tonton Fokou est assis sur son bidon jaune. Un mango dans la main gauche, un petit couteau dans la main droite. Il coupe un gros quartier jaune, juteux, et le tend au bout de la lame."),
            S('fokou', "Assieds-toi."),
            S('bribri', "Merci, Tonton."),
          ],
        },
        {
          cam: { kind: 'on', who: ['F', 'B'], dist: 2.6, height: 0.9 },
          play: async (c) => { c.pose('B', 'sitGround') },
          lines: [
            N("BriBri s'assoit sur une pierre. Il mange. Le jus coule jusqu'à son coude. Tonton Fokou mâche son propre quartier, longtemps, sans rien dire."),
            S('fokou', "Tout le monde dit que tu joues propre."),
            S('bribri', "Oui, Tonton."),
            S('fokou', "Tu as fait combien de passes, samedi, contre les Cobras ?"),
            N("BriBri n'a pas besoin de réfléchir. Il compte toujours."),
            S('bribri', "Trente-quatre. Peut-être trente-cinq."),
            S('fokou', "Et combien sont allées vers le but des Cobras ?"),
          ],
        },
        {
          cam: { kind: 'on', who: 'B', dist: 1.6, height: 0.8 },
          lines: [
            N("BriBri ouvre la bouche. Il la referme. Il fait le compte dans sa tête. Le compte ne lui plaît pas."),
            S('bribri', "Deux|. Peut-être trois."),
            S('fokou', "Hmm."),
          ],
        },
        {
          cam: { kind: 'on', who: 'F', dist: 2.2, side: 0.3 },
          lines: [
            N("Tonton Fokou essuie son couteau sur son pantalon."),
            S('fokou', "Une passe sur le côté, c'est poli. C'est comme dire bonjour au voisin. C'est gentil, ça ne fait de mal à personne."),
          ],
        },
        {
          cam: { kind: 'over', who: 'F', to: [22, 14], dist: 1.8, height: 1.4 }, do: [{ a: 'pose', id: 'F', pose: 'point' }],
          lines: [
            N("Il pointe son couteau vers le terrain vide."),
            S('fokou', "Mais une passe qui traverse, mon fils... une passe qui passe entre deux adversaires et qui casse leur ligne... celle-là, c'est utile. Elle t'emmène quelque part."),
          ],
        },
        {
          cam: { kind: 'on', who: 'F', dist: 1.8 }, do: [{ a: 'pose', id: 'F', pose: 'sit' }],
          lines: [
            N("Il regarde BriBri par-dessous sa casquette."),
            S('fokou', "Le football n'est pas un salon, mon fils. On ne vient pas là pour être poli."),
            N("Puis il lui met dans la main la moitié de mango qui reste."),
            S('fokou', "Pour la maison."),
            N("Et il ne dit plus rien. Chez Tonton Fokou, ça veut dire que la conversation est finie."),
          ],
        },
      ],
    },
    /* -------------------------------------------------------------- the network of Papa */
    {
      kind: 'scene', id: 'salon', place: { id: 'maison', mood: 'interiorNight', opts: { night: true } },
      cast: [
        { id: 'B', cast: 'bribri', at: [4.75, 3.95], face: Math.PI / 2, pose: 'sit' },
        { id: 'K', cast: 'kaydoudou', at: [2.2, 1.0], face: Math.PI / 2, pose: 'sit' },
        { id: 'papa', cast: 'papa', at: [0.4, 4.6], face: 0 },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [6.8, 1.5, 5.2], look: [4.6, 0.85, 3.9], fov: 42 },
          lines: [
            N("Le soir, sous l'ampoule nue du salon, BriBri n'arrive pas à faire ses devoirs. Il porte encore son maillot vert, le 8 dans le dos."),
            N("Il relit la même phrase de son livre de sciences sans la comprendre. La moitié de mango est posée à côté de lui, comme un devoir de plus."),
          ],
        },
        {
          cam: { kind: 'on', who: 'K', dist: 2.2 }, do: [{ a: 'pose', id: 'K', pose: 'talk' }],
          lines: [
            N("Au fond, Kaydoudou est allongé sur le canapé, les pieds en l'air. Une chaussette rouge, une chaussette jaune. Il imite Tonton Fokou en mangeant un mango imaginaire."),
            S('kaydoudou', "Le football n'est pas un salon, mon fils|. C'est une cuisine. Il y a du feu. Et des mangos."),
            S('bribri', "Tais-toi, Kaydoudou."),
            S('kaydoudou', "Tu as peur, hein ?"),
          ],
        },
        {
          cam: { kind: 'on', who: ['B', 'K'], dist: 3.2 }, do: [{ a: 'pose', id: 'K', pose: 'sit' }],
          lines: [
            N("BriBri lève la tête. Sous son afro, Kaydoudou le regarde. Ses yeux sont devenus sérieux, d'un coup."),
            S('bribri', "Je n'ai pas peur."),
            S('kaydoudou', "Si. Tu as peur de rater. Toi, tu ne rates jamais rien. Alors tu as peur."),
            N("BriBri ne répond pas. Son petit frère ne réfléchit jamais avant de parler. Mais parfois, il dit exactement la vérité. C'est très agaçant."),
            N("Dehors, le ciel passe de l'orange au bleu."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [6.4, 1.6, 2.4], look: [1.4, 1.0, 4.4], fov: 46 },
          play: async (c) => { await c.move('papa', [5.6, 4.5], 0.3); c.face('papa', 'B'); c.pose('papa', 'sit') },
          lines: [
            N("La porte s'ouvre. Papa entre, en chemise à manches courtes, son sac d'ordinateur à l'épaule et un rouleau de câble bleu sur l'autre. Il voit le livre ouvert. La page qui ne tourne pas. Le visage de son fils."),
            N("Il pose le câble sur la table, à côté du mango. Il relève ses lunettes sur son front. Il s'assoit à côté de BriBri."),
            S('papa', "Qu'est-ce qui ne va pas, mon grand ?"),
          ],
        },
        {
          cam: { kind: 'on', who: ['B', 'papa'], dist: 2.2, height: 1.1 },
          lines: [
            S('bribri', "Tout le monde dit que je joue propre. Mais contre les Cobras, j'ai fait trente-quatre passes. Et deux seulement sont allées vers leur but. Peut-être trois. Et Tonton dit que le football n'est pas un salon."),
            N("Il parle longtemps, ce qui ne lui arrive jamais. Papa écoute sans l'interrompre."),
            N("Puis Papa prend une feuille et un stylo."),
            S('papa', "Tu sais ce que je fais, à mon travail ?"),
            S('bribri', "Tu installes des réseaux. Pour que les ordinateurs se parlent."),
            S('papa', "C'est ça. Regarde."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [5.2, 1.45, 4.3], look: [5.05, 0.78, 3.95], fov: 40 },
          lines: [
            N("Il dessine des petits ronds sur la feuille."),
            S('papa', "Ici, un ordinateur. Là-bas, tout au bout, un autre. Et entre les deux, plein de petites machines, reliées par des câbles."),
            N("Il tapote le premier rond avec son stylo."),
            S('papa', "Quand tu envoies un message depuis cet ordinateur, à gauche, il ne part pas d'un coup. On le coupe en petits morceaux. On les appelle des paquets. Chaque paquet saute d'une machine à l'autre. Comme un ballon, de joueur en joueur."),
            N("La pointe du stylo avance de rond en rond."),
            S('papa', "Maintenant, imagine un paquet très poli. Il arrive dans une machine. Il dit bonjour. Il repart vers la machine d'à côté. Bonjour. Il revient. Bonjour. Il ne se perd jamais. Il ne se casse jamais. Il est très propre."),
            S('kaydoudou', "C'est BriBri, ce paquet"),
            N("Papa dessine une flèche qui fait des boucles. Des allers. Des retours. Entre trois petits ronds. Jamais vers la droite."),
            S('papa', "Est-ce que le message arrive ?"),
            N("BriBri suit la flèche du doigt, les sourcils froncés. Elle tourne. Elle tourne. Elle ne va nulle part."),
            S('bribri', "Non."),
            S('papa', "Non. Un paquet qui tourne en rond ne sert à rien, même s'il ne se perd jamais. Il doit trouver la route vers sa destination."),
            N("Papa dessine une flèche toute droite, qui file au milieu des ronds."),
            S('papa', "Parfois, la route la plus courte passe par un endroit plein de monde. Un peu risqué. Alors le réseau ose. Il envoie le paquet quand même. Et si le paquet se perd..."),
            N("Il hausse les épaules, très calme."),
            S('papa', "... on en renvoie un autre. C'est tout. Personne ne gronde un réseau parce qu'un paquet s'est perdu. On le gronde quand rien n'arrive."),
          ],
        },
        {
          cam: { kind: 'on', who: ['B', 'papa'], dist: 1.9, height: 1.05 },
          lines: [
            S('bribri', "Et si je rate devant tout le quartier ?"),
            S('papa', "Alors tout le quartier verra que tu as essayé."),
            N("Il tend le stylo à BriBri."),
            S('papa', "Tu as le droit de rater une passe, mon grand. Tu n'as pas le droit de ne jamais essayer."),
          ],
        },
      ],
    },
    /* -------------------------------------------------------------- the two arrows (played) */
    {
      kind: 'play', id: 'cahier', place: { id: 'maison', mood: 'interiorNight', opts: { night: true } }, prompt: 'play.sketchIntro',
      cast: [
        { id: 'B', cast: 'bribri', at: [11.5, 3.3], face: 0, pose: 'sit', look: { number: undefined, collar: '#F2EEE3' } },
        { id: 'K', cast: 'kaydoudou', at: [9.6, 5.3], face: Math.PI / 2, pose: 'lie', elev: 0.42 },
      ],
      challenge: {
        type: 'sketch',
        setup: async (c) => {
          c.cam({ kind: 'pose', pos: [10.2, 1.7, 1.8], look: [11.8, 0.85, 3.4], fov: 44 })
          await c.say([
            N("Cette nuit-là, sous la moustiquaire, BriBri ne dort pas. Dans le lit d'à côté, Kaydoudou ronfle doucement, une jambe hors du drap, la chaussette jaune encore au pied. Dehors, il pleut un peu. Les tôles chantent tout bas."),
            N("BriBri se lève sans bruit. Il allume sa petite lampe de poche et la coince entre son menton et son épaule. Il prend une feuille de son cahier de maths."),
            N("Il dessine une ligne de trois ronds, en travers. Les Cobras. Ou les Requins. N'importe quel peigne."),
            N("Devant la ligne, un rond pour lui."),
          ])
        },
        politeLines: [
          N("Puis une flèche qui part sur le côté. Elle longe la ligne sans jamais la toucher et va se perdre au bord de la feuille. À côté, en petites lettres : « polie »."),
          S('kaydoudou', "BriBri ?|Tu dessines quoi ?"),
          S('bribri', "Rien. Dors."),
          S('kaydoudou', "Tu dessines un paquet poli..."),
          N("Et il se remet à ronfler."),
        ],
        drawLines: [N("Puis une deuxième flèche.")],
        drawnLines: [
          N("Celle-là part tout droit. Elle passe entre deux ronds. Elle traverse la ligne comme une aiguille traverse un tissu. Et elle arrive de l'autre côté, là où il n'y a plus personne entre le ballon et le but."),
          N("BriBri tient son crayon au-dessus de la feuille. Il ne bouge plus."),
          N("Il entend la pluie sur les tôles. Il entend Kaydoudou qui ronfle. Il entend, très loin, la voix de Madame Ekotto : « Propre ! »"),
          T('bribri', "Et si je rate ?"),
          N("Puis une autre voix, celle de Papa."),
          S('papa', "Tu n'as pas le droit de ne jamais essayer."),
          N("Il écrit le mot. Il appuie si fort que la mine de son crayon casse. Crac."),
        ],
        wordLines: [
          N("Il regarde la feuille à la lumière de la lampe. Il pense à Bulldozer, à ses épaules énormes."),
          N("Puis il glisse la feuille avec les autres, entre deux pages de son cahier."),
          N("Sa décision est prise. Solide comme une ligne tracée au crayon."),
          N("En demi-finale, contre les Requins, il osera."),
          N("Même si Bulldozer est devant lui."),
          N("Surtout si Bulldozer est devant lui."),
        ],
      },
    },
    { kind: 'lesson', no: 5 },
  ],
}
