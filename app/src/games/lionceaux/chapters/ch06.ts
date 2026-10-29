// Chapitre 6, « La lettre de Waldorf » (POV Kaydoudou). Source: tome1/chapters/06-la-lettre-de-waldorf.md.
// Every line is the chapter's text. Played: the little finger through the two mosquito nets (the
// brothers' promise, a gesture like the ritual of ch03); the run into the corner that drags the big
// boy from Makepe and opens the door for Mireille (Leçon n°6: a player who moves stays in the team;
// canon: Mireille scores). The supper, the night under the mango tree, Mami on the phone and the
// bidon with Ousmane are cutscenes.
import type { ChapterScript } from '../story/session'
import type { ActorSpec } from '../story/types'
import { N, S, T, lion } from './helpers'

const home = { id: 'maison' as const, mood: 'interiorNight' as const, opts: { night: true } }

/** The four against four on the dry corner of the pitch (attack right, the bamboo goal at x 44). */
function fourAside(over: Record<string, Partial<ActorSpec>> = {}): ActorSpec[] {
  const base: ActorSpec[] = [
    { id: 'F', cast: 'fokou', at: 'fokou', face: [30, 12], pose: 'sit' },
    { id: 'B', cast: 'bribri', team: 'a', at: [27, 14], face: 0, number: 8 },
    { id: 'K', cast: 'kaydoudou', team: 'a', at: [34, 11], face: 0 },
    { id: 'M', cast: 'mireille', team: 'a', at: [31, 21], face: 0 },
    { id: 'O', cast: 'ousmane', team: 'a', at: [22.5, 14], face: 0, gk: true },
    // the big boy from Makepe who never leaves Kaydoudou alone near a goal
    { id: 'GM', cast: 'kid', team: 'b', at: [35.2, 11.5], face: Math.PI, look: { shirt: '#5a6a7a', shirtTrim: '#5a6a7a', shorts: '#2a2a2a', height: 1.16, build: 1.12, shoes: 'trainers', boots: '#e6e0d4' } },
    { id: 'R', cast: 'radio', team: 'b', at: [36, 18], face: Math.PI },
    { id: 'J', cast: 'jules', team: 'b', at: [33, 7], face: Math.PI },
    { ...lion('L1', [43.2, 14], 1, Math.PI), team: 'b' as const, gk: true },
  ]
  return base.map((a) => ({ ...a, ...(over[a.id] ?? {}) }))
}

export const CH06: ChapterScript = {
  no: 6,
  ball: 'plain',
  beats: [
    /* -------------------------------------------------------------- the ndolé nobody eats */
    {
      kind: 'scene', id: 'ndole', place: home,
      cast: [
        { id: 'papa', cast: 'papa', at: [4.75, 3.95], face: Math.PI / 2, pose: 'sit' },
        { id: 'maman', cast: 'maman', at: [5.65, 4.6], face: Math.PI, pose: 'sit' },
        { id: 'K', cast: 'kaydoudou', at: [4.75, 5.3], face: -Math.PI / 2, pose: 'sit' },
        { id: 'B', cast: 'bribri', at: [3.85, 4.6], face: 0, pose: 'sit', look: { number: undefined, collar: '#F2EEE3' } },
      ],
      shots: [
        {
          cam: { kind: 'on', who: 'K', dist: 2 },
          lines: [
            S('kaydoudou', "Papa, tu es malade ?"),
            N("Kaydoudou pose la question la bouche pleine de plantain. C'est grave. Papa ne mange pas son ndolé."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [6.9, 1.55, 6.2], look: [4.8, 0.85, 4.4], fov: 44 },
          lines: [
            N("À la maison, le ndolé de Maman, c'est sacré. Les feuilles amères, la pâte d'arachide, les crevettes. D'habitude, Papa se sert trois fois."),
            S('papa', "Le meilleur ndolé du Littoral !"),
            S('maman', "Le seul que tu as le droit de goûter"),
          ],
        },
        {
          cam: { kind: 'on', who: 'papa', dist: 2 },
          lines: [
            N("Ce soir, Papa tourne sa cuillère dans son assiette, comme s'il cherchait une clé perdue au fond."),
            S('papa', "Je ne suis pas malade, Kaydoudou. Je réfléchis."),
            S('kaydoudou', "À quoi ?"),
            N("Papa regarde Maman. Maman lui fait un petit oui de la tête. Le genre de oui que les parents se font quand ils croient que les enfants ne voient rien."),
          ],
        },
        { cam: { kind: 'on', who: 'K', dist: 1.7 }, lines: [T('kaydoudou', "Je vois tout|. Je suis un aigle.")] },
        {
          cam: { kind: 'pose', pos: [4.9, 1.45, 4.85], look: [4.95, 0.8, 4.2], fov: 40 },
          do: [{ a: 'pose', id: 'papa', pose: 'palm' }],
          lines: [
            N("Papa sort de sa poche une feuille pliée en quatre. Il la pose à côté de la marmite."),
            S('papa', "Les garçons, j'ai reçu une proposition de travail."),
            N("Kaydoudou tend le cou. Des mots en anglais. Et au milieu, en gras, un mot bizarre."),
            S('kaydoudou', "Wal... Waldorf ?"),
            N("Ça sort tout seul, comme un éternuement. Atchoum. Waldorf."),
            S('kaydoudou', "C'est quoi, Waldorf ? Une maladie ?"),
            N("Kaydoudou attend les rires."),
            N("Personne ne rit."),
            N("Mauvais signe. Quand Kaydoudou fait une blague et que personne ne rit, c'est qu'un orage se cache derrière."),
          ],
        },
        {
          cam: { kind: 'on', who: 'papa', dist: 2.2 }, do: [{ a: 'pose', id: 'papa', pose: 'sit' }],
          lines: [
            S('papa', "Waldorf, c'est une ville|. Aux États-Unis. Dans le Maryland, près de Washington. Une grande entreprise veut que j'aille installer tous ses réseaux. C'est le plus beau travail qu'on m'ait jamais proposé."),
            S('papa', "On part en janvier. Juste après la finale du tournoi. Si vous y arrivez."),
          ],
        },
        { cam: { kind: 'on', who: 'B', dist: 1.9 }, lines: [N("Kaydoudou regarde BriBri. Son grand frère fixe la marmite, les mains cachées sous la table.")] },
        {
          cam: { kind: 'on', who: 'K', dist: 1.9 },
          lines: [
            S('kaydoudou', "Non."),
            N("C'est tout petit, d'abord. Puis ça monte, ça monte, et ça déborde, comme le lait sur le feu."),
            S('kaydoudou', "Non, non et non ! Et Ousmane ? Et Mireille ? Et Tonton Fokou ? Et Mami ? On est en demi-finale, Papa ! Contre les Requins ! Je ne vais pas en Amérique, moi. Je ne parle même pas l'américain !"),
            S('maman', "On dit l'anglais, mon chéri..."),
            S('kaydoudou', "Je ne parle même pas l'anglais non plus !"),
          ],
        },
        {
          cam: { kind: 'pose', pos: [6.6, 1.6, 2.2], look: [2.4, 1.0, 4.6], fov: 46 },
          play: async (c) => { c.pose('K', null); c.shake(0.2); await c.wait(0.4); await c.move('K', [0.4, 4.6], 0.9) },
          parallel: true,
          lines: [N("Sa chaise tombe en arrière. Bam !"), N("Kaydoudou traverse le salon, ouvre la porte et court dans la nuit.")],
        },
      ],
    },
    /* -------------------------------------------------------------- under the mango tree, at night */
    {
      kind: 'scene', id: 'manguier', place: { id: 'bona', mood: 'night', opts: { night: true, crowd: 'none' } },
      cast: [{ id: 'K', cast: 'kaydoudou', at: [-12, 2], face: 0 }],
      shots: [
        {
          cam: { kind: 'follow', who: 'K', dist: 5, height: 2.2 },
          play: async (c) => { await c.move('K', [-2.8, -4.6], 0.9); c.face('K', [10, 8]); c.pose('K', 'sitGround') },
          lines: [
            N("Le terrain est au bout de la rue. Cent pas. Kaydoudou les fait en courant."),
            N("Il fait noir. Kaydoudou a peur du noir, depuis toujours. Mais ce soir, il a encore plus peur de la lettre."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [3, 1.2, 1.5], look: [-3, 0.9, -4.6], fov: 46 },
          lines: [
            N("Il se glisse entre les racines du manguier, le dos contre le tronc. Les buts en bambou ressemblent à deux squelettes."),
            N("Kaydoudou parle au manguier. Il parle à tout le monde, même aux arbres."),
          ],
        },
        {
          cam: { kind: 'on', who: 'K', dist: 1.9, height: 0.9 }, do: [{ a: 'pose', id: 'K', pose: 'sitGround' }],
          lines: [
            S('kaydoudou', "Tu as entendu, toi ? Waldorf ! Et qui va me garder la moitié de ses arachides, à Waldorf ? Hein ? Ousmane, il le fait tous les jours, sans rien dire. Et Mireille ? Elle me gronde tout le temps, d'accord. Mais elle m'a défendu contre trois grands de Makepe ! Et le sifflet de Tonton Fokou ? Et la machine à coudre de Mami ? Même le chat de Madame Ekotto, il va me manquer. Et je ne l'aime même pas, ce chat !"),
            N("Le manguier ne répond pas. Les manguiers ne répondent jamais."),
            N("Puis une pensée arrive. Plus froide que les autres."),
            T('kaydoudou', "Quand on part très loin, les gens finissent par vous oublier."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [2, 1.4, 0.5], look: [-2.6, 0.7, -4.4], fov: 46 },
          play: async (c) => {
            c.spawn({ id: 'maman', cast: 'maman', at: [12, 4], face: Math.PI })
            await c.move('maman', [-2.0, -4.0], 0.35)
            c.face('maman', 'K'); c.pose('maman', 'sitGround')
          },
          lines: [
            N("Une lumière danse sur le terrain. Une lampe de poche."),
            S('maman', "Kaydoudou ? Je sais que tu es là. Tu chantes quand tu pleures."),
            N("Zut. C'est vrai, il chante. Il ne l'a même pas remarqué."),
            N("Maman s'assoit dans les racines, avec sa jolie robe, et éteint la lampe."),
          ],
        },
        {
          cam: { kind: 'on', who: ['K', 'maman'], dist: 2.4, height: 0.9 },
          lines: [
            S('maman', "Moi aussi, j'ai eu peur|. Quand Papa m'a montré la lettre."),
            S('kaydoudou', "Et si je reste ici ? Chez Ousmane ? Je dors par terre. Je ne mange pas beaucoup."),
            S('maman', "Tu manges comme trois, mon chéri."),
            S('kaydoudou', "Alors pourquoi on part ?"),
            S('maman', "Parce que c'est une chance. Pour Papa, d'abord. Il a travaillé si fort pour ça. Pour moi aussi : là-bas, je vais repasser mes diplômes. Je veux devenir infirmière en Amérique. Et pour vous, mon chéri. Vous allez voir le monde. D'autres écoles. D'autres terrains."),
            N("Kaydoudou renifle."),
            S('kaydoudou', "Il y a des terrains, là-bas ?"),
            S('maman', "Plein. Avec de l'herbe partout. De la vraie herbe verte."),
            S('kaydoudou', "Et de la terre rouge ?"),
            N("Maman ne répond pas tout de suite."),
            S('maman', "Non. Pas de terre rouge."),
            S('kaydoudou', "Et il fait chaud, au moins ?"),
            S('maman', "Non. En janvier, il fait très froid. Il paraît qu'il neige."),
            S('kaydoudou', "De la neige ? Ça mout !"),
          ],
        },
        {
          cam: { kind: 'pose', pos: [2.4, 1.3, -0.8], look: [-2.4, 0.9, -4.2], fov: 46 },
          play: async (c) => {
            c.spawn({ id: 'papa', cast: 'papa', at: [10, 6], face: Math.PI })
            c.spawn({ id: 'B', cast: 'bribri', at: [11.5, 6.8], face: Math.PI, look: { number: undefined, collar: '#F2EEE3' } })
            c.go('B', [-0.8, -3.0], 0.3)
            await c.move('papa', [-2.1, -3.7], 0.32)
            c.face('papa', 'K'); c.pose('papa', 'kneel')
          },
          lines: [
            N("Des pas dans la poussière. Papa. Et derrière lui, BriBri, les mains dans les poches."),
            N("Papa s'accroupit devant Kaydoudou. Il ne gronde pas pour la chaise. Il pose juste sa grande main sur l'afro de son fils."),
          ],
        },
        {
          cam: { kind: 'on', who: ['papa', 'K'], dist: 2.2, height: 0.9 },
          lines: [
            S('papa', "On ne quitte pas sa maison, Kaydoudou. On l'emporte."),
            N("Kaydoudou fronce le nez."),
            S('kaydoudou', "On l'emporte comment ? Dans une valise ? Avec le manguier dedans ?"),
            N("Papa sourit. Il ne répond pas."),
            N("Kaydoudou pourrait rester là. Bouder jusqu'à janvier. Mais le noir est très noir, et la main de Papa est très chaude."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [4, 1.8, 3], look: [-2, 0.9, -3.4], to: { pos: [8, 2.4, 6], look: [4, 0.9, 2] }, dur: 12, fov: 46 },
          play: async (c) => {
            c.pose('K', null); c.pose('maman', null); c.pose('papa', null)
            await c.wait(0.8)
            c.go('maman', [14, 6.4], 0.3); c.go('K', [14.4, 7.0], 0.3); c.go('B', [14.6, 7.6], 0.3); c.go('papa', [13, 7.6], 0.3)
          },
          parallel: true,
          lines: [
            N("Alors Kaydoudou se lève. Tout seul. Il prend la main de Maman d'un côté. De l'autre, la manche de son frère."),
            N("Dans la poche, sous la manche, il sent le poing de BriBri. Fermé. Serré. Tout le long du chemin."),
          ],
        },
      ],
    },
    /* -------------------------------------------------------------- the little blue room: who is afraid of what */
    {
      kind: 'scene', id: 'chambre', place: home,
      cast: [
        { id: 'K', cast: 'kaydoudou', at: [9.6, 5.2], face: Math.PI / 2, pose: 'sit' },
        { id: 'B', cast: 'bribri', at: [9.6, 1.4], face: -Math.PI / 2, pose: 'sit', look: { number: undefined, collar: '#F2EEE3' } },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [11.6, 1.45, 3.3], look: [9.4, 0.85, 3.3], fov: 50 },
          do: [{ a: 'ballLook', look: 'mamiPatched' }],
          play: async (c) => { c.hold([10.6, 3.3, 0.5]) },
          lines: [
            N("Cette nuit-là, dans la petite chambre aux murs bleus, personne ne dort."),
            N("Kaydoudou le sait. BriBri respire trop bien. Comme quelqu'un qui fait semblant."),
            S('kaydoudou', "BriBri. Tu dors ?"),
            S('bribri', "Oui."),
            S('kaydoudou', "Menteur."),
            S('kaydoudou', "Tu as peur de quoi, toi ?"),
            N("Long silence. Puis une voix si basse que Kaydoudou retient son souffle."),
            S('bribri', "De l'avion."),
          ],
        },
        {
          cam: { kind: 'on', who: 'K', dist: 1.8, height: 0.9 },
          lines: [
            N("Kaydoudou s'assoit en tailleur sur son lit. Il est en pyjama, avec sa chaussette rouge et sa chaussette jaune. Il dort toujours avec."),
            S('kaydoudou', "De l'avion ? Toi ? Mais tu n'as peur de rien !"),
          ],
        },
        {
          cam: { kind: 'on', who: 'B', dist: 1.8, height: 0.9 },
          lines: [S('bribri', "J'ai calculé. Un avion, ça pèse plus de deux cents tonnes. Deux cents tonnes, dans le ciel, Kaydoudou. Ça n'a aucun sens."), N("Kaydoudou veut rire. Il ne rit pas.")],
        },
        {
          cam: { kind: 'pose', pos: [10.9, 0.95, 4.4], look: [10.6, 0.5, 3.3], fov: 40 },
          lines: [
            N("Il attrape la petite lampe de poche de son frère. Clic. Il la pose sur la table de nuit, entre les deux lits, juste à côté du ballon de Mami. Le carré de pagne s'allume, rouge et jaune. Un petit soleil dans la nuit."),
          ],
        },
        {
          cam: { kind: 'on', who: ['K', 'B'], dist: 2.4, height: 1.0 },
          lines: [
            S('kaydoudou', "Moi, j'ai peur qu'on m'oublie|. Je pars, et dans un an, Ousmane dit : “Kaydoudou ? C'était qui, déjà ? Le petit avec les chaussettes ?”"),
            N("BriBri se redresse sur un coude. La lampe éclaire la moitié de son visage."),
            S('bribri', "Personne ne peut oublier un garçon avec une chaussette rouge et une chaussette jaune. C'est impossible. C'est scientifique."),
            N("Kaydoudou sourit. Ses yeux brillent. Les larmes sont là, tout au bord. Il ne les laisse pas tomber."),
            T('kaydoudou', "Pas maintenant. Pas devant le grand."),
          ],
        },
      ],
    },
    /* -------------------------------------------------------------- the little finger through the nets (played) */
    {
      kind: 'play', id: 'promesse', place: home, prompt: 'play.promiseIntro', keep: true, cast: [],
      challenge: {
        type: 'ritual',
        steps: [
          {
            key: 'petitDoigt',
            act: async (c) => {
              c.cam({ kind: 'on', who: ['K', 'B'], dist: 2.2, height: 1.0 })
              c.pose('K', 'point')
              await c.say([
                N("Il tend son petit doigt contre la moustiquaire."),
                S('kaydoudou', "Promets-moi un truc."),
                S('bribri', "Quoi ?"),
                S('kaydoudou', "Qu'on ne jouera jamais l'un contre l'autre. Jamais. Même dans deux équipes. Même quand on sera grands. Même dans deux pays."),
                N("BriBri regarde le petit doigt. Il appuie la main contre sa propre moustiquaire. Et son petit doigt vient accrocher celui de Kaydoudou, à travers les deux voiles blancs."),
              ])
              c.pose('B', 'point'); c.sfx('touch')
              await c.say([S('bribri', "Promis."), S('kaydoudou', "Jamais jamais ?"), S('bribri', "Jamais jamais.")])
            },
          },
        ],
      },
    },
    /* -------------------------------------------------------------- Mami on the loudspeaker */
    {
      kind: 'scene', id: 'telephone', place: { id: 'maison', mood: 'interior' },
      cast: [
        { id: 'papa', cast: 'papa', at: [4.75, 3.95], face: Math.PI / 2, pose: 'sit' },
        { id: 'maman', cast: 'maman', at: [5.75, 4.45], face: Math.PI },
        { id: 'K', cast: 'kaydoudou', at: [4.95, 5.25], face: -Math.PI / 2 },
        { id: 'B', cast: 'bribri', at: [4.1, 4.8], face: -0.4, look: { number: undefined, collar: '#F2EEE3' } },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [6.9, 1.6, 6.3], look: [4.9, 0.85, 4.4], fov: 44 },
          lines: [
            N("Le lendemain, Papa appelle Mami à Bafoussam, en haut-parleur. Toute la famille se penche sur le téléphone, comme autour d'un feu. On entend des poules. Tac-tac-tac, la machine à coudre. Puis elle s'arrête d'un coup."),
            S('mami', "Alors ? Mes lions s'en vont en Amérique ?"),
          ],
        },
        {
          cam: { kind: 'on', who: ['K', 'B'], dist: 2.2 },
          lines: [
            N("Kaydoudou ouvre la bouche. Rien ne sort. C'est BriBri qui répond, d'une voix bizarre."),
            S('bribri', "Oui, Mami. En janvier."),
            N("Alors Kaydoudou trouve sa voix. Toute petite."),
            S('kaydoudou', "Mami... Là-bas, tout le monde va nous oublier."),
            S('mami', "Vous oublier ? Toi ? Le garçon qui a donné son petit déjeuner au paysage, dans le car de Bafoussam ? Mon fils, même les poules de ma cour se souviennent de toi !"),
            N("Kaydoudou rit, malgré lui. Un tout petit rire mouillé."),
          ],
        },
        {
          cam: { kind: 'pose', pos: [4.9, 1.4, 4.9], look: [4.9, 0.8, 4.2], fov: 42 },
          lines: [
            S('mami', "Hmm. Maintenant, écoutez-moi bien, tous les deux. L'eau qui coule ne perd pas sa source. Vous pouvez aller au bout du monde. La source reste ici, à Bafoussam, à Douala, dans votre cœur. Elle ne bouge pas. C'est vous qui coulez."),
            N("Puis arrive son grand rire. Celui qui part du ventre et finit dans les arbres."),
            S('mami', "Et le ballon ? Vous l'emportez, j'espère !"),
            S('kaydoudou', "Le ballon ?"),
            S('mami', "Bien sûr, le ballon ! Il a une mission, je vous l'avais dit. Il doit voyager. Et maintenant, il va voyager pour de vrai."),
          ],
        },
      ],
    },
    /* -------------------------------------------------------------- four against four: Kaydoudou does not want anything */
    {
      kind: 'scene', id: 'endormi', place: { id: 'bona', mood: 'noon', opts: { crowd: 'none' } }, cast: fourAside(),
      shots: [
        {
          cam: { kind: 'match' },
          play: async (c) => { c.give('B'); await c.pass('B', 'K'); await c.pass('K', 'B', { oneTouch: true }) },
          lines: [
            N("Samedi. Petit match d'entraînement, quatre contre quatre, sur un bout de terrain qui a séché."),
            N("Kaydoudou n'a envie de rien. Le ballon arrive ? Il le donne. Tout de suite. Sans regarder."),
          ],
        },
        { cam: { kind: 'on', who: 'F', dist: 3 }, do: [{ a: 'pose', id: 'F', pose: 'point' }], lines: [S('fokou', "Kaydoudou !|Tu joues ou tu dors ?"), S('kaydoudou', "Je dors.")] },
        { cam: { kind: 'on', who: 'R', dist: 2.2 }, do: [{ a: 'pose', id: 'F', pose: 'sit' }, { a: 'pose', id: 'R', pose: 'mic' }], lines: [S('radio', "Mesdames et messieurs !|Kaydoudou ne dribble plus ! Appelez un docteur !")] },
      ],
    },
    /* -------------------------------------------------------------- the run into the corner (played, canon) */
    {
      kind: 'play', id: 'coin', place: { id: 'bona', mood: 'noon', opts: { crowd: 'none' } }, prompt: 'play.cornerIntro',
      cast: fourAside({ B: { at: [26, 14], ball: true }, R: { pose: null } }),
      challenge: {
        type: 'run', runner: 'K', marker: 'GM', zone: { at: [41.6, 2.6], r: 1.8 },
        cue: N("Kaydoudou part en courant vers le coin du terrain. Loin de tout. Juste pour être seul."),
        after: async (c) => {
          c.face('K', 'B'); c.face('GM', 'K')
          await c.say([
            S('radio', "Et Kaydoudou s'en va... dans le coin !|Il va où ? Personne ne sait ! Même lui ne sait pas !"),
            N("Mais il n'est pas seul."),
            N("Son défenseur le suit. Un grand de Makepe, venu s'entraîner avec eux. Il colle à Kaydoudou comme son ombre. On ne laisse jamais Kaydoudou tout seul près d'un but."),
            N("Dans le coin, Kaydoudou s'arrête. Il se retourne."),
          ])
          c.slow(0.45)
          c.cam({ kind: 'pose', pos: [42.6, 2.6, 1.4], look: [30, 0.6, 12], fov: 46 })
          c.lanes([['B', [37, 12]]])
          await c.say([
            N("Et tout ralentit."),
            N("Le grand de Makepe, collé à lui, qui souffle fort. Derrière eux, le milieu du terrain. Vide. Plus personne. Un trou large comme une route."),
            N("BriBri lève la tête. Il a vu. Bien sûr. Il voit toujours tout."),
          ])
          c.slow(1)
          c.lanes(null)
          c.cam({ kind: 'match' })
          c.go('M', [37.5, 13], 1)
          await c.pass('B', [37.4, 12.6], { arrive: 1.6 })
          await c.until(() => Math.hypot(c.w.ball.pos.x - c.p('M').pos.x, c.w.ball.pos.y - c.p('M').pos.y) < 1.4, 4).catch(() => {})
          c.give('M')
          await c.say([N("Le ballon part de son pied. Il roule dans le trou, tout droit, sur la terre sèche."), N("Et Mireille arrive, lancée comme une flèche.")])
          await c.shot('M', [44, 13.4], { height: 0.6, speed: 15 })
          c.sfx('net')
          await c.say([N("Bam ! Le ballon passe entre les bambous. Le filet de fortune fait « chhh »."), S('radio', "But de la Gazelle !|Et la passe décisive est pour... pour... personne !")])
          c.cam({ kind: 'on', who: ['M', 'K'], dist: 2.4 })
          c.p('M').pos = { x: c.p('K').pos.x + 1.0, y: c.p('K').pos.y + 0.6 }; c.face('M', 'K'); c.face('K', 'M'); c.pose('M', 'palm')
          await c.say([
            N("Mireille revient en trottinant. En passant, elle tape dans la main de Kaydoudou."),
            S('mireille', "Merci pour la course, Kaydoudou ! Tu as emmené ton grand de Makepe en promenade !"),
            S('kaydoudou', "Quelle course ? Je me suis sauvé, c'est tout !"),
            S('mireille', "Alors sauve-toi encore. Ça marche !"),
          ])
          c.pose('M', null)
          c.cam({ kind: 'on', who: ['B', 'K'], dist: 2.4 })
          c.p('B').pos = { x: c.p('K').pos.x - 0.9, y: c.p('K').pos.y + 0.8 }; c.face('B', 'K'); c.face('K', 'B')
          await c.say([
            N("BriBri passe à côté de lui, les mains sur les hanches."),
            S('bribri', "Tu devrais te sauver plus souvent|. Tu es très utile quand tu boudes."),
            S('kaydoudou', "Je ne boude pas !"),
            S('bribri', "Si. Et ton défenseur boude avec toi. Il t'a suivi jusqu'au coin."),
          ])
          c.cam({ kind: 'on', who: 'K', dist: 2 })
          await c.say([
            N("Kaydoudou regarde le grand de Makepe. Puis le trou."),
            N("Il n'a pas touché le ballon. Et pourtant, il a ouvert une porte pour Mireille."),
            T('kaydoudou', "J'ai joué|. Même tout au bout du terrain, j'ai joué."),
          ])
          c.cam({ kind: 'on', who: 'F', dist: 3 }); c.sfx('whistle')
          await c.say([
            N("Sous le manguier, le sifflet de Tonton Fokou fait son bruit de hibou enrhumé. Houou !"),
            S('fokou', "Tu as vu, Kaydoudou ? Un joueur qui bouge reste dans l'équipe."),
            N("Kaydoudou entend la phrase deux fois. Une fois avec ses oreilles de footballeur. Une fois avec son cœur."),
            T('kaydoudou', "Waldorf, c'est très loin|. Mais si on bouge, on reste une équipe."),
          ])
        },
      },
    },
    /* -------------------------------------------------------------- half the peanuts */
    {
      kind: 'scene', id: 'arachides', place: { id: 'bona', mood: 'golden', opts: { crowd: 'none' } },
      cast: [
        { id: 'K', cast: 'kaydoudou', at: [-1.35, -3.0], face: [8, 4], pose: 'sit' },
        { id: 'O', cast: 'ousmane', at: [-1.85, -3.4], face: [8, 4], pose: 'sit' },
        { id: 'F', cast: 'fokou', at: [3, -6], face: [10, 6] },
      ],
      shots: [
        {
          cam: { kind: 'on', who: ['K', 'O'], dist: 2.6, height: 1.0 },
          lines: [
            N("Après le match, Tonton Fokou laisse son bidon jaune libre. Kaydoudou s'y assoit à côté d'Ousmane, une fesse chacun."),
            N("Ousmane mange des arachides. Il en tend la moitié à Kaydoudou. Comme toujours."),
            N("Kaydoudou prend une grande inspiration. Personne ne va le dire à sa place. C'est son ami. C'est à lui de le dire."),
            S('kaydoudou', "Ousmane. On part. En Amérique. En janvier. Après la finale."),
          ],
        },
        {
          cam: { kind: 'on', who: 'O', dist: 1.9, height: 0.95 },
          lines: [
            N("Ousmane arrête de mâcher."),
            N("Il regarde le terrain. Les bambous. Le manguier. Il ne dit rien. Longtemps. Si longtemps que Kaydoudou compte dans sa tête. Un. Deux. Cinq. Dix."),
          ],
        },
        { cam: { kind: 'on', who: 'K', dist: 1.7, height: 0.95 }, lines: [T('kaydoudou', "Il ne va jamais rien dire. Jamais.")] },
        {
          cam: { kind: 'on', who: ['O', 'K'], dist: 2.2, height: 0.95 }, do: [{ a: 'pose', id: 'O', pose: 'fist' }],
          lines: [
            N("Puis Ousmane referme sa grande main, large comme une feuille de bananier, sur les arachides qui restent. Et il parle."),
            S('ousmane', "Alors on gagne le tournoi. Comme ça, tu pars champion."),
          ],
        },
      ],
    },
    { kind: 'lesson', no: 6 },
  ],
}
