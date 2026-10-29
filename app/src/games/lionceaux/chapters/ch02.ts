// Chapitre 2, « Le njangi de Mami » (POV Kaydoudou). Source: tome1/chapters/02-le-njangi-de-mami.md.
// Every line is the chapter's text. The coach to Bafoussam; Mami's welcome; the walk with Papa to
// the vulcanisateur (bridge: the book tells it in a few lines, the walk adds nothing to it); the
// patch of 1998 pagne sewn on by the old machine; the cousins' game in the fog, where the ball goes
// « de voix en voix » (played: the dribble, then the pass to BriBri's voice); the njangi of the
// women; the four hands on the ball.
import type { ChapterScript } from '../story/session'
import type { ActorSpec } from '../story/types'
import { N, S, T } from './helpers'

const car = { id: 'car' as const, mood: 'morning' as const }
const mami = { id: 'mami' as const, mood: 'golden' as const }
const hill = { id: 'colline' as const, mood: 'morning' as const }

const coach: ActorSpec[] = [
  { id: 'K', cast: 'kaydoudou', at: 'seatK', face: Math.PI, pose: 'sit' },
  { id: 'maman', cast: 'maman', at: 'seatMaman', face: Math.PI, pose: 'sit' },
  { id: 'papa', cast: 'papa', at: 'seatPapa', face: Math.PI, pose: 'sit' },
  { id: 'B', cast: 'bribri', at: 'seatB', face: Math.PI / 2, pose: 'sit', look: { number: undefined } },
  { id: 'dame', cast: 'dame', at: [4.3, 1.18], face: 0.6, pose: 'sit' },
  { id: 'monsieur', cast: 'passager', at: [7.0, 0.62], face: Math.PI, pose: 'sit' },
]

/** the cousins' slope: the team of the bottom (Kaydoudou, BriBri, Joseph, Ernest) attacks uphill */
function slope(over: Record<string, Partial<ActorSpec>> = {}): ActorSpec[] {
  const base: ActorSpec[] = [
    { id: 'K', cast: 'kaydoudou', team: 'a', at: [8, 10], face: 0 },
    { id: 'B', cast: 'bribri', team: 'a', at: [21, 4.5], face: 0, look: { number: undefined } },
    { id: 'J', cast: 'joseph', team: 'a', at: [28, 6.5], face: 0 },
    { id: 'E', cast: 'ernest', team: 'a', at: [30, 13], face: 0 },
    { id: 'C1', cast: 'cousin', team: 'b', at: [13, 9.2], face: Math.PI },
    { id: 'C2', cast: 'cousin', team: 'b', at: [18, 11], face: Math.PI, variant: 3, look: { shirt: '#c45a3a' } },
    { id: 'goat', cast: 'chevre', team: 'b', at: [23, 9.5], face: Math.PI / 2 },
    { id: 'C3', cast: 'cousin', team: 'b', at: [26, 14], face: Math.PI, variant: 5, look: { shirt: '#e2c26a' } },
    { id: 'C4', cast: 'cousin', team: 'b', at: [31, 9], face: Math.PI, variant: 2, look: { shirt: '#7aa05a' } },
  ]
  return base.map((a) => ({ ...a, ...(over[a.id] ?? {}) }))
}

/** the njangi: the women in their blue and white pagne on the benches, Mami at the table */
function njangi(): ActorSpec[] {
  const women: ActorSpec[] = []
  let v = 0
  for (let r = 0; r < 3; r++) for (const sx of [-1, 1]) for (const k of [-0.6, 0.6]) {
    if (r === 0 && sx === -1 && k === -0.6) continue // the place of Mama Fotso
    women.push({ id: `w${v}`, cast: 'femmeNjangi', at: [8 + sx * 2.6 + k, 6.6 + 1.6 + r * 1.2 + 0.05], face: -Math.PI / 2, pose: 'sit', variant: v++ })
  }
  return [
    { id: 'mami', cast: 'mami', at: [8, 5.95], face: Math.PI / 2, pose: 'sit' },
    { id: 'kemadjou', cast: 'mamaKemadjou', at: [9.1, 6.1], face: Math.PI / 2 },
    { id: 'fotso', cast: 'mamaFotso', at: [4.8, 8.25], face: -Math.PI / 2, pose: 'sit' },
    { id: 'ngoo', cast: 'mamaNgoo', at: [11.2, 8.25], face: -Math.PI / 2, pose: 'sit' },
    { id: 'tchinda', cast: 'mamanTchinda', at: [10.0, 8.25], face: -Math.PI / 2, pose: 'sit' },
    { id: 'vieille', cast: 'vieilleDame', at: [14.5, 11.6], face: Math.PI },
    { id: 'K', cast: 'kaydoudou', at: [2.0, 9.5], face: 0, pose: 'sit' },
    { id: 'B', cast: 'bribri', at: [2.0, 10.3], face: 0, pose: 'sit', look: { number: undefined } },
    ...women,
  ]
}

export const CH02: ChapterScript = {
  no: 2,
  ball: 'mami',
  beats: [
    /* -------------------------------------------------------------- the coach */
    {
      kind: 'scene', id: 'car', place: car, cast: coach,
      shots: [
        {
          cam: { kind: 'pose', pos: [3.0, 1.25, 0.9], look: [5.2, 0.95, 0.55], fov: 44 },
          do: [{ a: 'ballLook', look: 'mami', flat: true }],
          lines: [
            S('kaydoudou', "Je ne suis pas malade|. C'est mon petit déjeuner qui veut voir le paysage."),
            N("Le car prend un virage. Et le petit déjeuner de Kaydoudou voit le paysage, pour la troisième fois depuis Douala, par la fenêtre ouverte."),
            N("Toute la rangée éclate de rire."),
          ],
        },
        { cam: { kind: 'pose', pos: [5.6, 1.3, 1.6], look: [7.0, 0.95, 0.62], fov: 40 }, lines: [S('passager', "Courage, petit !")] },
        {
          cam: { kind: 'pose', pos: [6.4, 1.3, 1.5], look: [4.7, 0.95, 0.9], fov: 42 },
          lines: [
            S('dame', "Tiens, mon bébé|. Une rondelle de citron. Ça calme le ventre."),
            S('kaydoudou', "Je ne suis pas un bébé, j'ai dix ans. Et mon ventre est un artiste."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [4.0, 1.35, 2.2], look: [6.1, 0.95, 2.1], fov: 44 },
          lines: [
            S('bribri', "Ton ventre n'aime pas les virages|. Il préfère les lignes droites."),
            S('kaydoudou', "Mon ventre n'aime pas qu'on lui dise où aller. Comme moi."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [3.6, 1.3, 1.0], look: [5.2, 0.95, 0.9], fov: 40 },
          lines: [
            N("Maman lui essuie le front en riant."),
            S('maman', "Donne-moi ce sac, Kaydoudou. Tu vas l'écraser."),
            S('kaydoudou', "Non. C'est le blessé. Je l'emmène chez le docteur."),
            N("Dans le sac, il y a le ballon de Mami. Ouvert, tout mou."),
            T('kaydoudou', "Tiens bon"),
          ],
        },
        {
          cam: { kind: 'pose', pos: [5.6, 1.15, 0.9], look: [5.0, 1.2, -3.5], fov: 50 },
          lines: [
            N("La route monte entre des collines si vertes qu'on les croirait peintes. À chaque arrêt, des vendeurs courent jusqu'aux fenêtres."),
            S('vendeur', "Prunes ! Prunes bien mûres !"),
            S('vendeur', "Bâtons de manioc ! Arachides grillées !"),
            N("Papa achète des prunes violettes, cuites dans la braise. Kaydoudou en mange quatre."),
            S('bribri', "Ce n'est peut-être pas une idée géniale"),
            S('kaydoudou', "Je suis en vacances"),
            N("Au virage suivant, les prunes voient le paysage, elles aussi."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [5.75, 1.1, 0.95], look: [4.6, 1.15, -3.5], fov: 48 },
          do: [{ a: 'mood', mood: 'fog' }],
          lines: [
            N("Puis le brouillard tombe d'un coup. Épais, blanc, mouillé, comme si quelqu'un avait renversé un grand bol de lait sur le monde. Les arbres deviennent des fantômes."),
            N("Kaydoudou colle son nez à la vitre. Il oublie son ventre."),
            S('kaydoudou', "BriBri ! On est DANS les nuages !"),
          ],
        },
      ],
    },
    /* -------------------------------------------------------------- Mami */
    {
      kind: 'scene', id: 'mami', place: mami,
      cast: [
        { id: 'mami', cast: 'mami', at: [3.4, 4.6], face: Math.PI / 2 },
        { id: 'K', cast: 'kaydoudou', at: [7.6, 11.4], face: -Math.PI / 2 },
        { id: 'B', cast: 'bribri', at: [8.6, 11.6], face: -Math.PI / 2, look: { number: undefined } },
        { id: 'papa', cast: 'papa', at: [9.6, 12.2], face: -Math.PI / 2 },
        { id: 'maman', cast: 'maman', at: [6.6, 12.3], face: -Math.PI / 2 },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [8.2, 1.6, 13.6], look: [5.2, 1.1, 7.0], fov: 46 },
          play: async (c) => { c.pose('mami', 'open'); await c.move('mami', [7.6, 10.1], 0.4); c.pose('mami', 'hold'); c.face('K', 'mami'); c.face('B', 'mami') },
          parallel: true,
          lines: [
            S('mami', "Mes enfants ! Mes lions !"),
            N("Mami Nyanga traverse la cour, les bras grands ouverts. Elle est petite, mais si droite qu'elle paraît plus grande que tout le monde. Un foulard en pagne sur la tête, et un rire immense, qui commence dans son ventre et finit dans les arbres."),
            N("Elle les serre si fort que Kaydoudou entend craquer quelque chose. Son dos, peut-être. Ou celui de Mami."),
          ],
        },
        {
          cam: { kind: 'on', who: ['mami', 'K'], dist: 2.6 }, do: [{ a: 'pose', id: 'mami', pose: 'talk' }],
          lines: [
            S('mami', "BriBri ! Tu ressembles à ton grand-père au même âge ! Et toi, Kaydoudou, ces joues ! Je peux les manger ?"),
            S('kaydoudou', "Pas aujourd'hui, Mami. J'ai une urgence."),
            N("Ça sent le ndolé et le plantain grillé. Mais Kaydoudou n'a pas faim. Il tend le sac à deux mains."),
            S('kaydoudou', "Mami. Il est mort."),
          ],
        },
        {
          cam: { kind: 'on', who: 'mami', dist: 1.8 },
          do: [{ a: 'pose', id: 'mami', pose: 'hold' }, { a: 'ballLook', look: 'mami', flat: true }],
          play: async (c) => { c.carry('mami', 1.0) },
          lines: [
            N("Mami sort le ballon. Elle le tourne, le retourne, passe son pouce le long de la déchirure. Elle le regarde comme elle regarde les gens : longtemps, et jusqu'au fond."),
            S('mami', "Il n'est pas mort|. Il est blessé. Ce n'est pas pareil."),
            S('kaydoudou', "Tu peux le soigner ?"),
            S('mami', "La peau, je verrai. Le ventre, non. Pour le ventre, il faut un spécialiste."),
            S('kaydoudou', "Un docteur de ballons ?"),
            S('mami', "Presque."),
          ],
        },
      ],
    },
    /* -------------------------------------------------------------- to the crossroads (bridge) */
    {
      kind: 'explore', id: 'carrefour', place: hill, bridge: true, player: 'K',
      cast: [
        { id: 'K', cast: 'kaydoudou', at: [-8.6, 18], face: -Math.PI / 2 },
        { id: 'papa', cast: 'papa', at: [-7.6, 18.6], face: -Math.PI / 2 },
        { id: 'vulca', cast: 'vulcanisateur', at: [-11.4, 3.4], face: Math.PI / 2 },
      ],
      talks: [
        {
          id: 'papa', lines: [
            S('papa', "Pour le ventre, on va voir le vulcanisateur"),
            S('kaydoudou', "Le vulca... quoi ?"),
            S('papa', "Le monsieur du carrefour qui répare les pneus des benskins."),
            S('kaydoudou', "Il répare aussi les ballons ?"),
            S('papa', "Il répare tout ce qui a de l'air dedans."),
          ],
        },
      ],
      require: ['papa'],
      goal: { at: [-10.2, 5.2], r: 1.6, prompt: 'explore.vulca' },
    },
    {
      kind: 'scene', id: 'vulca', place: hill, keep: true, cast: [],
      shots: [
        {
          cam: { kind: 'on', who: ['papa', 'vulca'], dist: 3.2 },
          play: async (c) => { await c.move('papa', [-10.4, 4.3], 0.4); c.face('papa', 'vulca'); c.face('vulca', 'papa'); c.face('K', 'vulca') },
          parallel: true,
          lines: [
            N("Au carrefour, Papa tend la vessie percée."),
            S('papa', "C'est pour le ballon de Maman Nyanga"),
            S('vulcanisateur', "Ah ! Pour Maman Nyanga !"),
          ],
        },
        {
          cam: { kind: 'on', who: 'vulca', dist: 2 }, do: [{ a: 'pose', id: 'vulca', pose: 'sew' }],
          lines: [N("Le monsieur colle deux rustines, des petits pansements de caoutchouc, en sifflotant. Il gonfle. La vessie tient.")],
        },
        {
          cam: { kind: 'on', who: ['papa', 'vulca', 'K'], dist: 3.6 }, do: [{ a: 'pose', id: 'vulca', pose: null }],
          lines: [
            S('papa', "Combien je vous dois ?"),
            S('vulcanisateur', "Rien du tout. Pour Maman Nyanga, c'est gratuit."),
            S('kaydoudou', "Merci, docteur !"),
          ],
        },
        { cam: { kind: 'follow', who: 'K', dist: 6, height: 2.6 }, play: async (c) => { await c.move('K', [-8.6, 22], 1) }, lines: [N("Il rentre en courant.")] },
      ],
    },
    /* -------------------------------------------------------------- the skin, and the 1998 pagne */
    {
      kind: 'scene', id: 'peau', place: { id: 'mami', mood: 'morning' },
      cast: [
        { id: 'mami', cast: 'mami', at: [2.4, 1.75], face: -Math.PI / 2 },
        { id: 'K', cast: 'kaydoudou', at: [3.4, 5.5], face: -Math.PI / 2 },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [4.6, 1.4, 3.3], look: [2.6, 0.9, 1.4], fov: 46 },
          do: [{ a: 'ballLook', look: 'mami', flat: true }, { a: 'ball', at: [2.15, 1.0] }],
          play: async (c) => { c.hold([2.15, 1.0, 0.83]); await c.move('K', [3.0, 2.3], 0.9); c.face('K', 'mami') },
          parallel: true,
          lines: [
            S('kaydoudou', "Mami ! Le ventre est guéri !"),
            N("Mais Mami a posé le cuir à plat sur la table. Elle secoue la tête."),
            S('mami', "Regarde la peau, mon fils."),
            N("Kaydoudou regarde. Il manque un morceau. Un trou grand comme sa main."),
            S('mami', "On ne peut pas recoudre du vide"),
            N("Kaydoudou sent son cœur tomber dans ses chaussettes. La rouge et la jaune."),
            S('kaydoudou', "Alors c'est fini ? Il va mourir quand même ?"),
          ],
        },
        {
          cam: { kind: 'pose', pos: [3.6, 1.2, 2.6], look: [5.2, 0.5, 0.8], fov: 44 },
          play: async (c) => { await c.move('mami', [4.9, 1.45], 0.3); c.face('mami', [5.2, 0.8]); c.pose('mami', 'kneel') },
          parallel: true,
          lines: [
            N("Mami ne répond pas. Elle ouvre sa vieille malle en fer, pleine de chutes de tissu. Elle fouille en parlant toute seule en ghomala', sa langue."),
            S('mami', "Pas toi. Pas toi non plus. Ah..."),
            N("Elle sourit."),
            S('mami', "Toi."),
          ],
        },
        {
          cam: { kind: 'on', who: ['mami', 'K'], dist: 2.4 },
          play: async (c) => { c.pose('mami', 'hold'); c.face('mami', 'K') },
          lines: [
            N("Un carré de pagne wax, rouge et jaune, avec des cercles comme des soleils."),
            S('mami', "C'est le reste de ma robe de njangi, en 1998. Il est solide. Il a déjà dansé."),
          ],
        },
      ],
    },
    /* -------------------------------------------------------------- the old machine sings */
    {
      kind: 'scene', id: 'machine', place: mami,
      cast: [
        { id: 'mami', cast: 'mami', at: 'stool', face: -Math.PI / 2, pose: 'sew', look: { glasses: true } },
        { id: 'K', cast: 'kaydoudou', at: [2.95, 2.15], face: -2.2 },
        { id: 'B', cast: 'bribri', at: [3.4, 4.05], face: -Math.PI / 2, look: { number: undefined } },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [4.6, 1.5, 3.4], look: [2.6, 1.0, 1.2], to: { pos: [4.0, 1.35, 2.6], look: [2.5, 0.95, 1.2] }, dur: 12, fov: 44 },
          do: [{ a: 'ballLook', look: 'mami', flat: true }],
          play: async (c) => { c.hold([2.38, 1.02, 0.86]) },
          lines: [
            N("En fin d'après-midi, la petite pièce aux murs ocre devient toute dorée. La lumière entre par la fenêtre sans vitre et fait briller la poussière."),
            N("Sous la fenêtre, il y a la machine à coudre. Noire, avec des fleurs dorées presque effacées. En dessous, une grande pédale en grille de fer."),
            S('kaydoudou', "Elle a quel âge, ta machine ?"),
            S('mami', "Quarante ans. Elle a cousu toutes les robes de mariage du quartier. Et tous les pagnes du njangi."),
            N("Mami s'assoit devant. Elle met ses lunettes au bout de son nez. Elle double le pagne avec un vieux morceau de cuir et glisse le ballon sous l'aiguille. Son pied se pose sur la grille de fer."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [2.0, 1.1, 1.9], look: [2.45, 0.95, 1.0], fov: 38 },
          do: [{ a: 'sfx', kind: 'tap' }],
          lines: [N("Et la machine chante."), N("Tac-tac-tac-tac."), N("Régulière comme un cœur.")],
        },
        {
          cam: { kind: 'on', who: 'K', dist: 1.5, side: 0.9 },
          lines: [
            N("Kaydoudou se penche sur l'épaule de Mami. Il retient son souffle. Ses yeux sont immenses. C'est la première fois de sa vie qu'il reste immobile plus de trois minutes."),
            T('kaydoudou', "Respire pas, Kaydoudou|. Respire pas."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [2.6, 1.4, 1.8], look: [3.4, 1.1, 4.1], fov: 44 },
          lines: [
            N("Sur le pas de la porte, BriBri regarde aussi, un crayon derrière l'oreille."),
            S('kaydoudou', "Elle va trop vite|. Elle va se piquer."),
            S('bribri', "Elle fait ça depuis quarante ans"),
            S('kaydoudou', "Moi, je joue au foot depuis sept ans, et je rate encore des passes."),
            S('bribri', "Toi, tu ne rates pas tes passes. Tu ne les fais pas."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [3.4, 1.3, 2.4], look: [2.4, 0.95, 1.2], fov: 42 },
          lines: [N("Mami rit sans lever les yeux."), S('mami', "Chut, les lions. Vous allez réveiller le malade."), N("Tac-tac-tac-tac.")],
        },
        {
          cam: { kind: 'on', who: ['mami', 'K'], dist: 2.2 },
          do: [{ a: 'pose', id: 'mami', pose: 'sit' }, { a: 'ballLook', look: 'mamiPatched' }],
          lines: [
            N("Enfin, Mami coupe le dernier fil avec ses dents. Elle relève ses lunettes."),
            S('mami', "Voilà. Regonflé, ferme et chaud."),
            N("Mais le ballon n'est plus tout à fait rond. Là où le pagne est cousu, il fait une petite bosse, comme une joue gonflée."),
          ],
        },
        {
          cam: { kind: 'on', who: ['mami', 'B'], dist: 2.6 },
          play: async (c) => { await c.move('B', [2.9, 2.6], 0.3); c.face('B', 'mami'); c.pose('mami', 'hold'); c.carry('mami', 0.75) },
          parallel: true,
          lines: [
            S('bribri', "Il ne roulera plus jamais tout droit"),
            N("Mami lui tend le ballon."),
            S('mami', "Il a une cicatrice, comme les gens qui ont vécu. Tu crois que les gens qui ont vécu roulent tout droit, toi ?"),
          ],
        },
      ],
    },
    /* -------------------------------------------------------------- the cousins' slope */
    {
      kind: 'scene', id: 'pente', place: { id: 'colline', mood: 'golden' },
      cast: slope({ K: { at: [6, 4] }, B: { at: [5.2, 3.2], face: 0, pose: 'hold' }, C1: { at: [9, 4.5], face: Math.PI } }),
      shots: [
        {
          cam: { kind: 'on', who: ['C1', 'K', 'B'], dist: 4.5 },
          do: [{ a: 'ballLook', look: 'bag' }, { a: 'ball', at: [12, 9] }, { a: 'prop', holder: 'B', look: 'mamiPatched' }],
          lines: [
            N("Le lendemain, les garçons du quartier viennent les chercher."),
            S('cousin', "Venez jouer, les gars de Douala !|Chez nous, on marque en montant !"),
          ],
        },
        {
          cam: { kind: 'pose', pos: [-4, 6, 26], look: [17, 0, 8], fov: 46 },
          lines: [N("Leur terrain est une pente d'herbe entre deux champs de maïs. Un but en haut, un but en bas. Leur ballon ? Des sachets plastiques ficelés avec des élastiques.")],
        },
        {
          cam: { kind: 'on', who: ['K', 'B'], dist: 2.6 },
          do: [{ a: 'face', id: 'K', to: 'B' }, { a: 'face', id: 'B', to: 'K' }],
          lines: [
            N("Kaydoudou tend la main vers le ballon de Mami."),
            S('bribri', "Non|. Il est convalescent."),
            S('kaydoudou', "Il est quoi ?"),
            S('bribri', "Convalescent. Un malade qui guérit. Il doit se reposer."),
            S('kaydoudou', "Toi, tu parles comme un dictionnaire."),
            S('bribri', "Un dictionnaire qui a raison."),
          ],
        },
      ],
    },
    /* -------------------------------------------------------------- in the fog: the dribble (played) */
    {
      kind: 'play', id: 'brouillard', place: { id: 'colline', mood: 'fog' }, prompt: 'play.fogIntro',
      cast: slope({ K: { ball: true } }),
      challenge: {
        type: 'dribble', carrier: 'K', defenders: ['C1', 'C2', 'goat'], end: 'free', dir: 1,
        intro: [
          N("En fin de journée, le brouillard revient. Il avale le but d'en haut. Puis les joueurs. Puis tout."),
          N("Kaydoudou, dans l'équipe du bas, part en dribble vers le haut."),
        ],
        calls: [N("Un garçon : dribblé."), N("Un deuxième : dribblé."), N("Une chèvre qui passe par là : dribblée aussi.")],
      },
    },
    /* -------------------------------------------------------------- in the fog: the voice (played, canon) */
    {
      kind: 'play', id: 'voix', place: { id: 'colline', mood: 'whiteout' }, prompt: 'play.voiceIntro', keep: true, cast: [],
      challenge: {
        type: 'choose', prompt: 'play.voice', lockedHint: 'play.voiceWrong',
        options: [
          { key: 'voixParIci', canon: false },
          { key: 'voixIci', canon: false },
          { key: 'voixBriBri', canon: true, line: N("Kaydoudou ne voit rien. Mais il n'a pas besoin de voir. Il frappe vers la voix de son frère.") },
        ],
        setup: async (c) => {
          c.host.timeScale(1)
          c.cam({ kind: 'on', who: 'K', dist: 2.2, side: 0.4 })
          c.stop('K')
          const k = c.p('K'); k.controlled = false; k.meta.scripted = true; k.target = null
          c.say([S('chevre', "Mêêê !")]).catch(() => {})
          await c.wait(0.8)
          c.give('K')
          // the bottom of the slope disappears too: the stage turns white
          c.host.mood('whiteout')
          await c.say([
            N("Et puis plus rien."),
            N("Du blanc partout. Plus de but. Plus de partenaires."),
            S('kaydoudou', "Hé !|Il est où, le haut ?"),
            N("Il s'arrête, le ballon de sachets sous le pied. Son cœur cogne. Il entend des pieds dans l'herbe mouillée. Une respiration, tout près. Ami ? Ennemi ?"),
            T('kaydoudou', "Je suis tout seul|. Comme le ballon de Mami sur le grillage."),
            S('voix', "Par ici !"),
            S('voix', "Ici ! Ici !"),
            N("Et puis une voix qu'il reconnaîtrait entre mille."),
            S('bribri', "Kaydoudou ! À gauche !"),
            N("BriBri."),
          ])
        },
        after: async (c) => {
          const k = c.p('K')
          const b = c.p('B')
          b.pos = { x: k.pos.x + 3, y: k.pos.y - 5.5 }
          c.w.prev.set('B', { ...b.pos })
          await c.pass('K', 'B', { arrive: 5 })
          c.cam({ kind: 'on', who: 'B', dist: 2.4 })
          await c.say([S('bribri', "Je l'ai !|Joseph, devant toi !")])
          await c.pass('B', 'J', { arrive: 5 })
          c.cam({ kind: 'on', who: 'J', dist: 2.4 })
          await c.say([S('joseph', "Je l'ai ! Plus haut ! Plus haut !"), N("Le ballon monte de voix en voix, comme un secret qu'on se chuchote à l'oreille.")])
          c.cam({ kind: 'on', who: 'K', dist: 2.2 })
          const shot = (async () => { await c.pass('J', 'E', { arrive: 5 }); await c.shot('E', [34, 10], { height: 0.3, speed: 11 }) })()
          await c.say([N("Silence."), N("Puis un grand cri de joie explose quelque part dans le blanc.")])
          await shot.catch(() => {})
          await c.say([S('voix', "BUUUT !"), S('kaydoudou', "Qui a marqué ?"), S('ernest', "Moi ! Ernest !")])
          c.pose('K', 'celebrate')
          await c.say([N("Kaydoudou saute quand même. Il crie quand même. C'est le premier but de sa vie qu'il fête sans savoir à quoi il ressemble.")])
          c.pose('K', null)
        },
      },
    },
    /* -------------------------------------------------------------- the njangi of the women */
    {
      kind: 'scene', id: 'njangi', place: { id: 'mami', mood: 'noon', opts: { njangi: true } }, cast: njangi(),
      shots: [
        {
          cam: { kind: 'pose', pos: [15.5, 2.6, 13.2], look: [7.6, 0.8, 7.2], fov: 46 },
          lines: [N("Le dimanche, après l'église, la cour se remplit de femmes. Toutes dans le même pagne bleu et blanc, avec des bébés dans le dos et des plats sous des torchons.")],
        },
        {
          cam: { kind: 'on', who: ['K', 'B'], dist: 2.2 },
          lines: [
            S('kaydoudou', "Elles sont combien ?"),
            S('bribri', "Vingt-deux|. C'est le njangi des femmes du quartier. Mami est leur présidente depuis trente ans."),
            S('kaydoudou', "Pourquoi elles ont toutes le même pagne ?"),
            S('bribri', "C'est leur maillot."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [8, 1.5, 9.4], look: [8, 0.85, 6.0], fov: 42 },
          lines: [
            N("Mami s'assoit au milieu, devant une petite table. Dessus, un gros cahier noir et une caisse en métal peinte en vert."),
            N("On chante d'abord. Kaydoudou tape dans ses mains au bon moment."),
            N("Puis la trésorière, Mama Kemadjou, grande et maigre, ouvre le cahier noir."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [10.5, 1.6, 10.2], look: [6.4, 0.9, 7.0], fov: 44 },
          play: async (c) => {
            await c.wait(1.5)
            c.pose('fotso', null); await c.move('fotso', [7.6, 7.0], 0.3); c.face('fotso', [8, 6.6]); c.pose('fotso', 'hold'); await c.wait(1.0); c.pose('fotso', null)
            await c.move('fotso', [4.8, 8.25], 0.3); c.face('fotso', -Math.PI / 2); c.pose('fotso', 'sit')
            await c.wait(1.0)
            c.pose('ngoo', null); await c.move('ngoo', [8.4, 7.0], 0.3); c.face('ngoo', [8, 6.6]); c.pose('ngoo', 'hold'); await c.wait(1.0); c.pose('ngoo', null)
            await c.move('ngoo', [11.2, 8.25], 0.3); c.face('ngoo', -Math.PI / 2); c.pose('ngoo', 'sit')
          },
          parallel: true,
          lines: [
            S('mamaKemadjou', "Mama Fotso !"),
            N("Une femme se lève et dépose une enveloppe dans la caisse verte."),
            S('mamaKemadjou', "Merci, ma sœur. Mama Ngo'o !"),
            N("Une autre enveloppe."),
            S('mamaKemadjou', "Merci, ma sœur."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [3.4, 1.3, 10.6], look: [12, 0.9, 9.5], fov: 46 },
          play: async (c) => { await c.move('vieille', [8.6, 7.1], 0.18); c.face('vieille', [8, 6.6]); c.pose('vieille', 'hold') },
          parallel: true,
          lines: [
            S('bribri', "Regarde|. Personne ne saute son tour. Même la vieille dame au bâton."),
            N("Elle traverse toute la cour pour déposer son enveloppe elle-même."),
            S('kaydoudou', "C'est quoi, cet argent ?"),
            S('bribri', "Chacune verse sa part|. Et ce mois-ci, toute la caisse va à une seule personne."),
            S('kaydoudou', "Laquelle ?"),
          ],
        },
        {
          cam: { kind: 'pose', pos: [12.4, 1.6, 10.6], look: [8.6, 0.95, 6.8], fov: 42 },
          play: async (c) => {
            c.pose('vieille', null); c.go('vieille', [13.5, 11], 0.18)
            c.pose('mami', null); c.face('mami', 'tchinda'); c.pose('mami', 'hold')
            c.pose('tchinda', null); await c.move('tchinda', [8.9, 7.3], 0.3); c.face('tchinda', 'mami'); c.pose('tchinda', 'hold')
          },
          parallel: true,
          lines: [
            N("Mami se lève. Elle soulève la caisse verte. Elle la tend, à deux mains, à une jeune femme du premier rang, un bébé endormi dans son dos."),
            S('mami', "Maman Tchinda ! Ce mois-ci, c'est ton tour. Va ouvrir ta boutique !"),
          ],
        },
        {
          cam: { kind: 'on', who: 'tchinda', dist: 2.2 },
          do: [{ a: 'pose', id: 'tchinda', pose: 'cry' }],
          play: async (c) => { await c.wait(2.5); c.pose('tchinda', 'celebrate') },
          parallel: true,
          lines: [
            N("Maman Tchinda pleure. Puis elle rit. Puis les deux à la fois."),
            S('mamanTchinda', "Merci, Maman Nyanga ! Merci, mes sœurs !"),
            S('mamaKemadjou', "À table, mes sœurs !"),
            N("On ouvre les plats. Kaydoudou mange des beignets jusqu'à ce que son ventre d'artiste demande pitié."),
          ],
        },
      ],
    },
    /* -------------------------------------------------------------- the evening: the ball has a mission */
    {
      kind: 'scene', id: 'mission', place: { id: 'mami', mood: 'night', opts: { night: true } },
      cast: [
        { id: 'mami', cast: 'mami', at: [11.0, 6.1], face: Math.PI / 2, pose: 'sit' },
        { id: 'K', cast: 'kaydoudou', at: [11.9, 6.1], face: Math.PI / 2, pose: 'sit' },
        { id: 'B', cast: 'bribri', at: [13.4, 6.7], face: Math.PI, pose: 'sit', look: { number: undefined } },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [11.5, 1.3, 8.6], look: [11.6, 0.8, 6.1], fov: 42 },
          lines: [
            N("Le soir, la cour sent encore le beignet. Kaydoudou s'assoit à côté de Mami sur le banc."),
            S('kaydoudou', "Mami. Le mois prochain, la caisse va à quelqu'un d'autre ?"),
            S('mami', "À Mama Fotso. Pour l'école de ses enfants. Puis à une autre. Chacune touche une fois. Chacune verse toujours."),
            N("Kaydoudou réfléchit. En silence. Ça ne lui arrive presque jamais."),
            S('kaydoudou', "Et si quelqu'un garde l'argent pour lui ?"),
          ],
        },
        {
          cam: { kind: 'on', who: 'mami', dist: 1.7, side: -0.5 },
          lines: [
            N("Mami tourne vers lui ses yeux qui voient jusqu'au fond."),
            S('mami', "Alors le njangi meurt. Ce qui ne circule pas pourrit, mon fils. Comme l'eau dans une calebasse fermée."),
            N("Elle attend un peu."),
            S('mami', "Mais écoute bien. Si l'argent tourne, tourne, tourne, et ne sert jamais à rien, il meurt aussi. Pas de boutique, pas d'école, pas de toit. Rien. L'argent du njangi doit circuler. Et il doit savoir où il va."),
          ],
        },
        {
          cam: { kind: 'on', who: 'B', dist: 1.9 },
          lines: [
            N("Sur la chaise d'à côté, BriBri fait semblant de lire. Il relève la tête d'un coup."),
            S('bribri', "C'est le ballon."),
            S('kaydoudou', "Quoi, le ballon ?"),
            S('bribri', "Le njangi, c'est comme le ballon. Chacun verse sa passe. Le ballon passe par tout le monde. Et à la fin, quelqu'un touche la caisse."),
          ],
        },
        {
          cam: { kind: 'on', who: ['K', 'mami'], dist: 2.3 },
          lines: [
            N("Kaydoudou fronce les sourcils. Très fort. Comme quelqu'un qui ne comprend rien du tout."),
            S('kaydoudou', "Tu veux dire qu'on doit donner de l'argent au gardien ?"),
            N("BriBri lève les yeux au ciel. Mami éclate de son grand rire."),
            N("Kaydoudou attend qu'ils aient fini. Puis il dit, l'air de rien :"),
            S('kaydoudou', "Et la boutique de Maman Tchinda, c'est le but. Et le cousin dans le brouillard, c'était Maman Tchinda."),
            N("BriBri reste la bouche ouverte."),
            S('bribri', "Ça, c'est la meilleure phrase de ta vie."),
            S('kaydoudou', "Je sais. Je la gardais pour la fin."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [12.2, 1.25, 7.9], look: [12.3, 0.9, 6.3], fov: 40 },
          do: [{ a: 'ballLook', look: 'mamiPatched' }],
          play: async (c) => {
            c.pose('mami', null); c.pose('K', null); c.pose('B', null)
            await c.move('K', [12.0, 6.9], 0.3); await c.move('B', [12.6, 6.6], 0.3)
            c.face('K', 'B'); c.face('B', 'K'); c.face('mami', 'K')
            await c.move('mami', [11.6, 6.4], 0.25)
            c.carry('mami', 0.9); await c.wait(1.2)
            c.hold([12.3, 6.75, 0.86]); c.pose('K', 'hold'); c.pose('B', 'hold'); c.pose('mami', 'hold')
          },
          parallel: true,
          lines: [
            N("Mami va chercher le ballon rapiécé. Sous l'ampoule de la cour, le carré de pagne brille comme un petit soleil cousu."),
            N("Elle le pose dans les mains de Kaydoudou. Puis elle referme les mains de BriBri par-dessus. Quatre mains tiennent le ballon ensemble."),
            S('mami', "Maintenant, ce ballon a une mission|. Il doit voyager."),
            N("Kaydoudou hoche la tête, très sérieux."),
            S('kaydoudou', "Voyager où ? À Bépanda ? Jusqu'à Yaoundé ?"),
            N("Mami sourit."),
            S('mami', "Ça, mon fils, c'est le ballon qui le sait."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [14.5, 3.2, 11.5], look: [12.2, 0.8, 6.6], to: { pos: [16, 6, 14], look: [11, 2, 6] }, dur: 10, fov: 44 },
          lines: [
            N("Personne ne peut deviner. Ni Kaydoudou, ni BriBri, ni même Mami, qui sait pourtant tant de choses."),
            N("Ce vieux ballon va aller beaucoup, beaucoup plus loin que Yaoundé."),
          ],
        },
      ],
    },
    { kind: 'lesson', no: 2 },
  ],
}
