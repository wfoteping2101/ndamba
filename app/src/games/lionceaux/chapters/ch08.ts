// Chapitre 8, « Finale à Bonamoussadi » (POV Kaydoudou). Source: tome1/chapters/08-finale-a-bonamoussadi.md.
// Every line is the chapter's text. Played: the ten passes with Mami's ball (the whole crowd counts);
// « je vais les faire bouger »: the margouillat only as a promise, to draw two Panthers, then the
// little pass to Radio, alone (canon); the last penalty, where Kaydoudou chooses the thunder strike
// (the simple shot is there, locked with BriBri's advice and his own thought) and the ball flies over
// the bamboo (canon); Ousmane's save onto the bamboo post (canon); the bracelet tied at the airport;
// Kaydoudou's hand on his brother's on the armrest. The final is 0-0 and the shoot-out ends 4-3, as written.
import type { Choreo } from '../story/choreo'
import type { ChapterScript } from '../story/session'
import type { ActorSpec } from '../story/types'
import { N, S, T, lion, rival } from './helpers'

const dawn = { id: 'bona' as const, mood: 'morning' as const, opts: { drums: true, crowd: 'none' as const } }
const home = { id: 'maison' as const, mood: 'interior' as const }
const noon = { id: 'bona' as const, mood: 'noon' as const, opts: { drums: true, taxi: true, crowd: 'none' as const } }
const final = { id: 'bona' as const, mood: 'golden' as const, opts: { drums: true, crowd: 'packed' as const } }
const dusk = { id: 'bona' as const, mood: 'evening' as const, opts: { drums: true, crowd: 'none' as const } }
const airport = { id: 'avion' as const, mood: 'interior' as const }

/** Lionceaux (attack right) against the Panthères de Deïdo; Mami in the front row between Papa and Maman. */
function match(over: Record<string, Partial<ActorSpec>> = {}, extra: ActorSpec[] = []): ActorSpec[] {
  const base: ActorSpec[] = [
    { id: 'F', cast: 'fokou', at: 'fokou', face: [22, 14] },
    { id: 'MA', cast: 'mami', at: [12, 29.9], face: [12, 14] },
    { id: 'PA', cast: 'papa', at: [10.9, 30], face: [12, 14] },
    { id: 'MN', cast: 'maman', at: [13.1, 30], face: [12, 14] },
    { id: 'O', cast: 'ousmane', team: 'a', at: [1.6, 14], face: 0, gk: true },
    { id: 'B', cast: 'bribri', team: 'a', at: [15, 14], face: 0, number: 8 },
    { id: 'R', cast: 'radio', team: 'a', at: [19, 18], face: 0 },
    { id: 'K', cast: 'kaydoudou', team: 'a', at: [20, 6], face: 0 },
    { id: 'M', cast: 'mireille', team: 'a', at: [21, 23], face: 0 },
    { id: 'SA', cast: 'samuel', team: 'a', at: [26, 14], face: 0 },
    { id: 'J', cast: 'jules', team: 'a', at: [8, 10], face: 0 },
    lion('L2', [8, 19], 2, 0),
    { id: 'CP', cast: 'capPanthere', team: 'b', at: [27, 12], face: Math.PI },
    rival('PK', 'pantherekeeper', [42.4, 14], 1, { gk: true }),
    rival('P2', 'panthere', [29, 6], 2), rival('P3', 'panthere', [30, 11], 3), rival('P4', 'panthere', [30, 17], 4),
    rival('P5', 'panthere', [29, 22], 5), rival('P6', 'panthere', [35, 11], 6), rival('P7', 'panthere', [35, 17], 7),
  ]
  return [...base.map((a) => ({ ...a, ...(over[a.id] ?? {}) })), ...extra]
}

/** The shoot-out, at the bamboo goal by the mango tree: the two teams in the centre circle. */
function shootout(over: Record<string, Partial<ActorSpec>> = {}): ActorSpec[] {
  const lions: [string, number][] = [['M', 19.5], ['SA', 20.3], ['R', 21.1], ['B', 21.9], ['K', 22.7], ['J', 23.5], ['L2', 24.3]]
  const cats: [string, number][] = [['CP', 19.5], ['P2', 20.3], ['P3', 21.1], ['P4', 21.9], ['P5', 22.7], ['P6', 23.5], ['P7', 24.3]]
  const at: Record<string, Partial<ActorSpec>> = { O: { at: [0.5, 14], face: 0 }, PK: { at: [3.2, 21.5], face: [0, 14] } }
  for (const [id, x] of lions) at[id] = { at: [x, 12.4], face: [7, 14] }
  for (const [id, x] of cats) at[id] = { at: [x, 15.6], face: [7, 14] }
  const merged: Record<string, Partial<ActorSpec>> = { ...at }
  for (const [id, o] of Object.entries(over)) merged[id] = { ...(merged[id] ?? {}), ...o }
  return match(merged)
}

const SPOT: [number, number] = [7, 14]

/** One kick of the shoot-out: the keeper on his line, the taker at the spot, the ball where it goes. */
async function kick(c: Choreo, taker: string, keeper: string, to: [number, number], o: { height?: number; speed?: number; dive?: 1 | -1 } = {}) {
  const k = c.p(keeper), t = c.p(taker)
  k.pos = { x: 0.5, y: 14 }; c.face(keeper, SPOT)
  t.pos = { x: 9.4, y: 14.3 }; c.face(taker, [0, 14])
  c.place(SPOT)
  await c.move(taker, [7.5, 14.05], 0.5)
  c.give(taker)
  const shot = c.shot(taker, to, { height: o.height ?? 0.4, speed: o.speed ?? 15 })
  if (o.dive) { await c.wait(0.12); k.anim = 'dive'; k.animT = 0; k.target = { x: k.pos.x, y: 14 + o.dive * 2 }; k.speedMode = 1 }
  await shot
}

/** Everyone goes back to the centre circle after a kick. */
function back(c: Choreo, ...ids: string[]) {
  for (const id of ids) {
    const p = c.p(id)
    if (p.team === 'a' && id !== 'O') c.go(id, [p.pos.x > 9 ? p.pos.x : 21 + Math.random() * 3, 12.4], 0.5)
    else if (id === 'PK') c.go(id, [3.2, 21.5], 0.5)
    else if (id === 'O') c.go(id, [3.6, 6.6], 0.5)
    else c.go(id, [21 + Math.random() * 3, 15.6], 0.5)
  }
}

export const CH08: ChapterScript = {
  no: 8,
  ball: 'mamiPatched',
  beats: [
    /* -------------------------------------------------------------- the drums, at dawn */
    {
      kind: 'scene', id: 'tambours', place: dawn,
      cast: [
        { id: 'T1', cast: 'tambour', at: [-5.75, -3.15], face: [-6.4, -3.2], pose: 'drum' },
        { id: 'T2', cast: 'tambour', at: [-4.95, -2.2], face: [-5.5, -2.3], pose: 'drum', look: { shirt: '#c45a3a', pattern: undefined } },
        { id: 'T3', cast: 'tambour', at: [-7.4, -1.4], face: [-7.3, -2.1], look: { shirt: '#3f6e8c', pattern: undefined } },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [-0.6, 1.4, 2.2], look: [-6.2, 0.9, -3.0], fov: 46 }, do: [{ a: 'sfx', kind: 'drums' }],
          lines: [N("Boum ! Boum ! Ba-da-boum !"), N("Sous le manguier, sous un ciel encore rose, des hommes installent de grands tambours.")],
        },
      ],
    },
    {
      kind: 'scene', id: 'reveil', place: home,
      cast: [
        { id: 'K', cast: 'kaydoudou', at: [9.6, 5.2], face: Math.PI / 2, pose: 'sit', look: { number: undefined, collar: '#F2EEE3' } },
        { id: 'B', cast: 'bribri', at: [9.6, 1.4], face: -Math.PI / 2, pose: 'sit', look: { number: undefined, collar: '#F2EEE3' } },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [11.6, 1.45, 3.3], look: [9.4, 0.85, 3.3], fov: 50 }, do: [{ a: 'sfx', kind: 'drums' }],
          lines: [N("Six heures du matin. Kaydoudou ouvre les yeux. Il croit d'abord que c'est son cœur.")],
        },
        { cam: { kind: 'on', who: 'K', dist: 1.8, height: 0.9 }, lines: [S('kaydoudou', "BriBri ! Réveille-toi ! C'est la finale !")] },
        { cam: { kind: 'on', who: 'B', dist: 1.8, height: 0.9 }, lines: [S('bribri', "Je sais|. Elle commence dans dix heures.")] },
        { cam: { kind: 'on', who: 'K', dist: 1.8, height: 0.9 }, lines: [S('kaydoudou', "Dix heures, c'est rien du tout ! Les tambours sont déjà prêts !")] },
        { cam: { kind: 'on', who: 'B', dist: 1.8, height: 0.9 }, lines: [S('bribri', "Les tambours n'ont pas besoin de dormir. Moi, si.")] },
        { cam: { kind: 'pose', pos: [11.6, 1.45, 3.3], look: [9.4, 0.85, 3.3], fov: 50 }, lines: [S('maman', "Personne ne sort sans manger !|Même les champions !")] },
        {
          cam: { kind: 'on', who: 'K', dist: 1.6, height: 0.9 },
          lines: [
            N("Aujourd'hui, la finale contre les Panthères de Deïdo. Après-demain, l'avion. Et entre les deux, une promesse d'Ousmane : partir champion."),
            T('kaydoudou', "Champion|. Ou rien."),
          ],
        },
      ],
    },
    /* -------------------------------------------------------------- Mami comes from Bafoussam */
    {
      kind: 'scene', id: 'mami', place: noon,
      cast: [
        { id: 'MA', cast: 'mami', at: [-11.0, 9.9], face: [-4, 7], pose: 'hold' },
        { id: 'K', cast: 'kaydoudou', at: [-2.6, 4.6], face: [-11, 10] },
        { id: 'B', cast: 'bribri', at: [-2.0, 3.6], face: [-11, 10], number: 8 },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [-6.2, 1.7, 5.0], look: [-12.2, 1.0, 10.2], fov: 46 },
          lines: [N("À midi, une petite dame très droite descend d'un taxi jaune, foulard de pagne sur la tête, panier au bras.")],
        },
        {
          cam: { kind: 'pose', pos: [-5.0, 1.6, 4.2], look: [-9.6, 1.0, 9.0], fov: 50 },
          play: async (c) => { c.go('B', [-8.6, 8.4], 0.4); await c.move('K', [-10.55, 9.6], 0.95); c.face('K', 'MA'); c.face('MA', 'K') },
          parallel: true,
          lines: [S('kaydoudou', "MAMI !"), S('mami', "Mes lions !")],
        },
        {
          cam: { kind: 'on', who: ['MA', 'K'], dist: 2.1 },
          play: async (c) => {
            await c.until(() => !c.isWalking('K'), 4).catch(() => {})
            c.p('K').pos = { x: -10.6, y: 9.65 }; c.face('K', 'MA'); c.face('MA', 'K'); c.pose('MA', 'embrace'); c.pose('K', 'embrace')
          },
          lines: [N("Elle serre Kaydoudou si fort qu'il entend craquer son dos.")],
        },
        {
          cam: { kind: 'on', who: ['K', 'MA'], dist: 2.4 }, do: [{ a: 'pose', id: 'MA', pose: 'hold' }, { a: 'pose', id: 'K', pose: null }],
          lines: [
            S('kaydoudou', "Tu es venue en car ? Toute seule ? Avec tous les virages ?"),
            S('mami', "Avec mes deux jambes et mon panier. Le car a fait le reste. Et je n'ai même pas été malade, moi. Pas comme un certain petit garçon."),
            S('kaydoudou', "Mamiii !"),
            S('mami', "Je ne pouvais pas rater ça. Mes lions en finale ! Et puis il faut bien que quelqu'un vous dise au revoir comme il faut."),
          ],
        },
        {
          cam: { kind: 'on', who: 'MA', dist: 1.8 },
          lines: [
            N("Dans son panier, il y a du ndolé, des beignets, et un feutre noir tout neuf."),
            S('kaydoudou', "C'est pour quoi, le feutre ?"),
            S('mami', "Pour plus tard. Mange ton beignet."),
          ],
        },
      ],
    },
    /* -------------------------------------------------------------- the Panthers */
    {
      kind: 'scene', id: 'pantheres', place: final,
      cast: match({ K: { at: [12, 3.2], face: Math.PI / 2 }, B: { at: [13, 3.0], face: Math.PI / 2 }, R: { at: [11, 3.4], face: Math.PI / 2 }, M: { at: [10.2, 3.1], face: Math.PI / 2 } },
        [{ id: 'PR', cast: 'pereRadio', at: [22, -3.4], face: Math.PI / 2, pose: 'mic' }]),
      shots: [
        {
          cam: { kind: 'pose', pos: [30, 6, 36], look: [14, 1, 4], fov: 52 }, do: [{ a: 'sfx', kind: 'drums' }],
          lines: [N("À quatre heures, on ne voit plus le terrain : on voit des gens. Mami est au premier rang, entre Papa et Maman.")],
        },
        {
          cam: { kind: 'pose', pos: [17, 1.5, 7.4], look: [13, 1.2, 3], fov: 44 },
          play: async (c) => {
            for (const id of ['CP', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'PK']) c.p(id).pos = { x: 18 + Math.random() * 6, y: 7 + Math.random() * 3 }
            c.p('CP').pos = { x: 13.6, y: 4.6 }; c.face('CP', 'K')
            for (const id of ['P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'PK']) c.face(id, 'K')
          },
          lines: [S('pereRadio', "ET VOICI LES PANTHÈRES DE DEÏDO !|Les plus grandes du tournoi ! Et regardez leur gardien, mesdames et messieurs ! Il touche les deux poteaux sans bouger !")],
        },
        {
          cam: { kind: 'on', who: ['K', 'R'], dist: 2.4 },
          lines: [
            N("Kaydoudou avale sa salive. Maillots jaunes tachetés de noir. Même leur plus petit joueur a une tête de plus que lui."),
            S('radio', "On va se faire manger"),
            S('kaydoudou', "Lui, c'est Monsieur Pieuvre|. Huit bras. Au moins."),
            S('bribri', "Il en a deux"),
            S('kaydoudou', "Deux très longs. Ça compte pour huit."),
          ],
        },
        {
          cam: { kind: 'on', who: ['CP', 'K'], dist: 2.4 }, do: [{ a: 'face', id: 'K', to: 'CP' }],
          lines: [
            N("Leur capitaine regarde Kaydoudou de tout en haut."),
            S('capPanthere', "C'est toi, le petit qui dribble ? Chez nous, les petits, on les ramasse à la pelle."),
            S('kaydoudou', "Et moi, les grands, je passe dessous"),
          ],
        },
      ],
    },
    {
      kind: 'play', id: 'dixPasses', place: final, prompt: 'play.tenIntro2', keep: true, cast: [],
      challenge: {
        type: 'juggle', players: ['K', 'B'], count: 10, ball: 'K',
        lines: [N("Puis vient le ballon de Mami. Dix passes, et toute la foule compte avec les frères. Même les Panthères regardent.")],
        calls: { 8: [S('foule', "HUIT ! NEUF ! DIX !")] },
      },
    },
    {
      kind: 'scene', id: 'poing', place: final, keep: true, cast: [],
      shots: [
        {
          cam: { kind: 'on', who: ['B', 'K'], dist: 1.9, height: 1.0 },
          play: async (c) => {
            c.release(); c.place([12.5, 4.4])
            c.face('B', 'K'); c.face('K', 'B'); c.pose('B', 'fist'); c.pose('K', 'fist'); c.sfx('touch')
            await c.wait(1.2); c.pose('B', 'heart'); c.pose('K', 'heart')
          },
          parallel: true,
          lines: [N("Poing contre poing. Main sur le cœur.")],
        },
        { cam: { kind: 'on', who: 'MA', dist: 2.2 }, do: [{ a: 'pose', id: 'MA', pose: 'heart' }], lines: [N("Au premier rang, Mami porte la main à sa bouche.")] },
        {
          cam: { kind: 'on', who: 'F', dist: 2.6 }, do: [{ a: 'pose', id: 'MA', pose: null }, { a: 'pose', id: 'B', pose: null }, { a: 'pose', id: 'K', pose: null }],
          lines: [S('fokou', "Allez, mes enfants|. Faites voyager le ballon. Une dernière fois, tous ensemble.")],
        },
      ],
    },
    /* -------------------------------------------------------------- a wall against a wall */
    {
      kind: 'scene', id: 'mur', place: final, cast: match({ K: { at: [17, 5], ball: true }, P2: { at: [20.6, 5.4] }, P3: { at: [23, 7] } }),
      shots: [
        {
          cam: { kind: 'match' }, do: [{ a: 'ballLook', look: 'plain' }, { a: 'sfx', kind: 'whistle' }, { a: 'score', text: '0 - 0' }],
          lines: [N("Le match, c'est un mur contre un mur.")],
        },
        {
          cam: { kind: 'follow', who: 'K', dist: 4.6, height: 2.2 },
          play: async (c) => {
            c.give('K')
            await c.move('K', [19.9, 5.3], 0.7)
            c.p('K').anim = 'tackle'; c.p('K').animT = 0
            c.sfx('touch'); c.shake(0.2)
            c.give('P2')
            await c.wait(0.3)
            c.p('K').pos = { x: 18.9, y: 5.2 }; c.pose('K', 'slip')
          },
          lines: [N("Les Panthères gagnent tous les duels. À la 3e minute, Kaydoudou tente son crochet du margouillat. Boing ! Il rebondit contre un défenseur comme une balle contre une porte.")],
        },
        {
          cam: { kind: 'on', who: ['R', 'K'], dist: 3.2 },
          play: async (c) => { c.p('R').pos = { x: 18.2, y: 8.2 }; c.face('R', 'K'); c.pose('R', 'mic') },
          lines: [S('radio', "Aïe, aïe, aïe !|Le margouillat s'est cogné contre un mur !")],
        },
        {
          cam: { kind: 'on', who: 'K', dist: 1.9 }, do: [{ a: 'pose', id: 'K', pose: null }, { a: 'pose', id: 'R', pose: null }],
          lines: [N("Kaydoudou se relève en frottant son épaule."), T('kaydoudou', "D'accord. Je ne peux pas les battre. Alors je vais les faire bouger.")],
        },
      ],
    },
    {
      kind: 'scene', id: 'bouger', place: final, cast: match({ K: { at: [18, 7] }, R: { at: [16, 13] }, M: { at: [22, 22] }, P2: { at: [21.4, 6] }, P3: { at: [21, 9.4] }, P4: { at: [24, 15] } }),
      shots: [
        {
          cam: { kind: 'follow', who: 'K', dist: 7, height: 3.6 },
          play: async (c) => {
            c.give('B'); c.p('B').pos = { x: 14, y: 11 }
            await c.pass('B', 'K')
            c.go('P2', [18.8, 6.4], 0.8); c.go('P3', [18.6, 8], 0.8)
            await c.wait(0.25)
            await c.pass('K', 'R')
            await c.move('K', [19.2, 9.6], 0.6)
            await c.pass('R', 'M', { lofted: true, flight: 1.5 })
            c.go('K', [26, 10], 0.9)
          },
          lines: [S('radio', "Deux Panthères sur Kaydoudou ?|Le ballon part tout de suite ! Une Panthère devant lui ? Deux pas de côté ! Pas de ballon ? Il court quand même ! Mesdames et messieurs, Kaydoudou passe le ballon ! Il PASSE ! Appelez les journalistes !")],
        },
      ],
    },
    /* -------------------------------------------------------------- the margouillat as a promise (played) */
    {
      kind: 'play', id: 'attirer', place: final, prompt: 'play.lureIntro',
      cast: match({
        K: { at: [20, 3.0], face: 0, ball: true }, R: { at: [19.2, 9.4], face: [20, 3] }, P2: { at: [22.9, 3.3], face: Math.PI }, P3: { at: [20.6, 8.2], face: [20, 3] },
        B: { at: [14, 10] }, M: { at: [25, 23] }, SA: { at: [27, 15] }, P4: { at: [27, 13] },
      }),
      challenge: {
        type: 'lure', carrier: 'K', defenders: ['P2', 'P3'], partner: 'R',
        setup: async (c) => {
          c.cam({ kind: 'over', who: 'K', to: 'R', dist: 5.2, height: 4.2, mix: 0.45 })
          await c.say([N("Près de la touche, Kaydoudou tente le margouillat.")])
        },
        feintLines: [N("Juste assez pour que deux maillots tachetés se jettent sur lui.")],
        passLines: [N("Hop ! Petite touche vers Radio, tout seul.")],
        after: async (c) => {
          c.cam({ kind: 'on', who: 'R', dist: 2.6 })
          await c.say([N("Radio est si surpris qu'il en oublie de commenter.")])
          c.cam({ kind: 'on', who: ['M', 'R'], dist: 4 })
          c.p('M').pos = { x: 22.6, y: 12.4 }; c.face('M', 'R')
          await c.say([S('mireille', "Radio !|Joue ! Tu commenteras après !")])
          await c.pass('R', 'M')
        },
      },
    },
    /* -------------------------------------------------------------- the captain who speaks with his hands */
    {
      kind: 'scene', id: 'mains', place: final, cast: match({ B: { at: [15, 13], ball: true }, M: { at: [24, 24.5] }, K: { at: [21, 6] }, SA: { at: [28, 14] } }),
      shots: [
        { cam: { kind: 'on', who: 'F', dist: 3 }, lines: [N("Sous le manguier, Tonton Fokou ne crie pas son « Le ballon doit voyager ! ». Pour une fois, il n'en a pas besoin.")] },
        {
          cam: { kind: 'over', who: 'B', to: [30, 14], dist: 3.6, height: 2.6, mix: 0.5 },
          play: async (c) => {
            c.give('B')
            c.pose('B', 'palm'); await c.wait(1.6)
            c.pose('B', 'point'); await c.wait(1.6)
            c.pose('B', 'point'); c.go('K', [30, 7], 0.9); await c.wait(0.4)
            c.pose('B', null)
            await c.pass('B', 'K', { lead: 0.6 })
          },
          lines: [N("Et BriBri dirige. Pas avec la voix : avec les mains. Paume vers le sol, doucement. Bras tendu, Mireille est seule. Deux doigts, Kaydoudou, pars.")],
        },
        { cam: { kind: 'match' }, lines: [S('pereRadio', "Regardez le numéro 8 !|Il ne parle pas, mais tout le monde l'écoute !")] },
        {
          cam: { kind: 'pose', pos: [34, 2.4, 22], look: [42, 1.2, 14], fov: 44 },
          play: async (c) => {
            // fingertips: the ball is pushed round the bamboo post (scripted, so the sim scores nothing)
            c.p('SA').pos = { x: 32.6, y: 15 }; c.face('SA', [44, 13]); c.place([33, 14.9])
            c.p('SA').anim = 'kick'; c.p('SA').animT = 0; c.sfx('kick')
            const k = c.p('PK'); k.anim = 'dive'; k.animT = 0; k.target = { x: 42.8, y: 12.2 }; k.speedMode = 1
            await c.arc([33, 14.9, 0.11], [42.9, 12.6, 1.55], 0.4, 0.62)
            c.sfx('touch')
            await c.arc([42.9, 12.6, 1.55], [46.5, 9.2, 0.11], 1.2, 0.8)
            c.release()
          },
          lines: [S('pereRadio', "Frappe de Samuel ! Le gardien la sort du bout des doigts !")],
        },
        {
          cam: { kind: 'pose', pos: [8, 2.2, 22], look: [1, 1, 14], fov: 46 },
          play: async (c) => {
            const o = c.p('O')
            for (const side of [1, -1, 1] as const) {
              o.pos = { x: 1.2, y: 14 }; o.target = null; c.face('O', [9, 14])
              const from: [number, number, number] = [9, 14 - side * 2, 0.11]
              c.p('CP').pos = { x: 9.6, y: 14 - side * 2.2 }; c.face('CP', [0, 14]); c.place([from[0], from[1]])
              c.p('CP').anim = 'kick'; c.p('CP').animT = 0; c.sfx('kick')
              o.anim = 'dive'; o.animT = 0; o.target = { x: 0.9, y: 14 + side * 1.7 }; o.speedMode = 1
              await c.arc(from, [1.0, 14 + side * 1.5, 0.6], 0.3, 0.55)
              c.sfx('touch')
              await c.arc([1.0, 14 + side * 1.5, 0.6], [4.5, 14 + side * 5.5, 0.11], 0.8, 0.7)
              c.release()
              await c.wait(0.35)
            }
          },
          lines: [S('pereRadio', "Et de l'autre côté, Ousmane plonge ! Il plonge encore ! Il plonge TROIS fois !")],
        },
        {
          cam: { kind: 'on', who: 'M', dist: 2.2 },
          play: async (c) => { c.p('M').pos = { x: 1.4, y: -1.6 }; c.p('B').pos = { x: 2.6, y: -1.2 }; c.face('M', 'B'); c.face('B', 'M'); c.place([1.9, -1.0]) },
          do: [{ a: 'score', text: '0 - 0' }, { a: 'sfx', kind: 'whistle' }],
          lines: [
            N("0-0 à la mi-temps. Mireille tape dans un caillou."),
            S('mireille', "Ils sont trop grands ! Tous les ballons en l'air sont pour eux !"),
          ],
        },
        {
          cam: { kind: 'on', who: 'B', dist: 1.9 }, do: [{ a: 'pose', id: 'B', pose: 'point' }],
          lines: [S('bribri', "Alors on joue par terre|. Le ballon ne sait pas monter aussi haut qu'eux. Mais il roule plus vite."), N("BriBri parle, maintenant. Et on l'écoute.")],
        },
      ],
    },
    {
      kind: 'scene', id: 'zeroZero', place: final, cast: match({ B: { at: [20, 13] }, K: { at: [22, 8] }, M: { at: [24, 20] }, R: { at: [18, 17] } }),
      shots: [
        {
          cam: { kind: 'pose', pos: [22, 3.4, 33], look: [22, 0.6, 12], fov: 50 }, do: [{ a: 'sfx', kind: 'whistle' }, { a: 'score', text: '0 - 0' }],
          play: async (c) => { for (const id of ['B', 'K', 'M', 'R', 'SA', 'J']) c.pose(id, 'dejected') },
          lines: [N("0-0 à la fin quand même, et tout le monde est rouge de poussière."), S('pereRadio', "TIRS AU BUT !")],
        },
        {
          cam: { kind: 'on', who: 'F', dist: 3.4 },
          play: async (c) => { for (const id of ['B', 'K', 'M', 'R', 'SA', 'J']) c.pose(id, null) },
          lines: [N("Les tambours se taisent d'un coup.")],
        },
      ],
    },
    /* -------------------------------------------------------------- the shoot-out */
    {
      kind: 'scene', id: 'tirs', place: final, cast: shootout({ PK: { at: [0.5, 14], face: SPOT } }),
      shots: [
        {
          cam: { kind: 'on', who: ['B', 'K'], dist: 2.2 }, do: [{ a: 'face', id: 'B', to: 'K' }, { a: 'face', id: 'K', to: 'B' }, { a: 'score', text: '0 - 0' }],
          lines: [
            N("Kaydoudou tire en dernier. BriBri se penche vers lui."),
            S('bribri', "Fais simple. À ras de terre. Dans le coin."),
            S('kaydoudou', "Simple, c'est pour les comptables"),
          ],
        },
        {
          cam: { kind: 'pose', pos: [10.6, 1.9, 19.4], look: [2, 1.0, 14], fov: 42 },
          play: async (c) => {
            await kick(c, 'M', 'PK', [0, 15.6], { height: 0.25, dive: -1 }); c.score('1 - 0')
            back(c, 'M', 'PK')
          },
          lines: [S('pereRadio', "Premier tireur : Mireille, la Gazelle !"), N("But.")],
        },
        {
          cam: { kind: 'pose', pos: [10.6, 1.9, 19.4], look: [2, 1.0, 14], fov: 42 },
          play: async (c) => {
            await kick(c, 'P2', 'O', [0, 12.6], { height: 0.6, dive: 1 }); c.score('1 - 1')
            back(c, 'P2', 'O')
            await kick(c, 'SA', 'PK', [0, 12.4], { height: 1.4, speed: 19, dive: 1 }); c.shake(0.25); c.score('2 - 1')
            back(c, 'SA', 'PK')
          },
          lines: [S('pereRadio', "Les Panthères répondent ! Deuxième tireur : Samuel ! Il frappe si fort que le filet se décroche ! Quelqu'un peut rattacher le filet ?"), N("But.")],
        },
        {
          cam: { kind: 'pose', pos: [10.6, 1.9, 19.4], look: [2, 1.0, 14], fov: 42 },
          play: async (c) => {
            await kick(c, 'P3', 'O', [0, 15.4], { height: 0.3, dive: -1 }); c.score('2 - 2')
            back(c, 'P3', 'O')
          },
          lines: [S('pereRadio', "Les Panthères marquent encore ! Troisième tireur : Radio !")],
        },
        {
          cam: { kind: 'pose', pos: [9.6, 1.4, 17.2], look: [3, 0.5, 14], fov: 40 },
          play: async (c) => {
            const r = c.p('R'), k = c.p('PK')
            k.pos = { x: 0.5, y: 14 }; c.face('PK', SPOT)
            r.pos = { x: 9.4, y: 14.3 }; c.face('R', [0, 14]); c.place(SPOT)
            await c.move('R', [7.4, 14.1], 0.55)
            c.pose('R', 'slip')
            k.anim = 'dive'; k.animT = 0; k.target = { x: 0.6, y: 16.2 }; k.speedMode = 1
            await c.arc([7, 14, 0.11], [0.2, 14.1, 0.11], 0.05, 3.2)
            c.sfx('net'); c.score('3 - 2')
          },
          lines: [N("Radio s'élance. Il glisse. Il frappe... du tibia. Le ballon roule sous le gardien, tout doucement, comme un escargot qui gagne une course.")],
        },
        {
          cam: { kind: 'on', who: 'R', dist: 2.2 }, do: [{ a: 'pose', id: 'R', pose: 'celebrate' }],
          lines: [S('radio', "Il est où, le ballon ?|Il est DEDANS !")],
        },
        {
          cam: { kind: 'pose', pos: [10.6, 1.9, 19.4], look: [2, 1.0, 14], fov: 42 }, do: [{ a: 'pose', id: 'R', pose: null }],
          play: async (c) => {
            back(c, 'R', 'PK')
            await kick(c, 'P4', 'O', [0, 12.5], { height: 0.9, dive: -1 }); c.score('3 - 3')
            back(c, 'P4', 'O')
          },
          lines: [S('pereRadio', "Les Panthères marquent toujours ! Quatrième tireur : BriBri !")],
        },
        {
          cam: { kind: 'over', who: 'B', to: [0, 14], dist: 2.4, height: 1.6, mix: 0.7 },
          play: async (c) => {
            const k = c.p('PK'), b = c.p('B')
            k.pos = { x: 0.5, y: 14 }; c.face('PK', SPOT)
            b.pos = { x: 8.6, y: 14.2 }; c.face('B', [0, 14]); c.place(SPOT)
            c.pose('B', 'hold'); await c.wait(1.1); c.pose('B', null); await c.wait(0.6)
            await c.move('B', [7.5, 14.05], 0.5)
            c.give('B')
            const s = c.shot('B', [0, 16.1], { height: 0.1, speed: 14 })
            await c.wait(0.12); k.anim = 'dive'; k.animT = 0; k.target = { x: 0.6, y: 12 }; k.speedMode = 1
            await s; c.score('4 - 3')
          },
          lines: [N("BriBri essuie ses mains sur son maillot. Une fois. Deux fois. À ras de terre, dans le coin. But.")],
        },
        {
          cam: { kind: 'pose', pos: [10.6, 1.9, 19.4], look: [2, 1.0, 14], fov: 42 },
          play: async (c) => {
            back(c, 'B', 'PK')
            const o = c.p('O'), t = c.p('P5')
            o.pos = { x: 0.5, y: 14 }; c.face('O', SPOT)
            t.pos = { x: 9.4, y: 14.3 }; c.face('P5', [0, 14]); c.place(SPOT)
            await c.move('P5', [7.5, 14.05], 0.5)
            c.p('P5').anim = 'kick'; c.p('P5').animT = 0; c.sfx('kick')
            o.anim = 'dive'; o.animT = 0; o.target = { x: 0.7, y: 12 }; o.speedMode = 1
            await c.arc([7, 14, 0.11], [0.1, 16.45, 0.7], 0.3, 0.45)
            c.sfx('post'); c.shake(0.3)
            await c.arc([0.1, 16.45, 0.7], [5.5, 21, 0.11], 0.6, 0.7)
            c.release()
          },
          lines: [N("Quatrième Panthère... POTEAU !")],
        },
        {
          cam: { kind: 'pose', pos: [22, 4, 33], look: [8, 0.8, 14], fov: 50 },
          lines: [
            S('pereRadio', "ARRÊTÉ PAR LE BAMBOU ! 4-3 pour les Lionceaux ! Mesdames et messieurs, si le prochain marque, Bonamoussadi est champion ! Cinquième tireur : Kaydoudou !"),
            S('foule', "KAY-KAY ! KAY-KAY !"),
          ],
        },
      ],
    },
    /* -------------------------------------------------------------- the last penalty: simple, or extraordinary (played) */
    {
      kind: 'play', id: 'choix', place: final, prompt: 'play.lastKickIntro',
      cast: shootout({ K: { at: [7.9, 14.2], face: Math.PI }, PK: { at: [0.5, 14], face: SPOT }, O: { at: [3.6, 6.6], face: [0, 14] }, P5: { at: [22.7, 15.6] } }),
      challenge: {
        type: 'choose', prompt: 'play.howShoot', lockedHint: 'play.simpleLocked',
        options: [
          { key: 'simple', canon: false, line: T('kaydoudou', "Pas simple. Extraordinaire. Pour partir comme un champion.") },
          { key: 'tonnerre', canon: true },
        ],
        setup: async (c) => {
          c.place(SPOT)
          c.cam({ kind: 'over', who: 'K', to: 'PK', dist: 2.2, height: 1.4, mix: 0.6 })
          await c.say([N("Kaydoudou pose le ballon. Il recule. Les tambours se taisent, mais son cœur, lui, joue encore. Boum. Boum.")])
          c.cam({ kind: 'on', who: 'PK', dist: 3.4 })
          await c.say([N("Il regarde Monsieur Pieuvre.")])
          c.cam({ kind: 'on', who: 'K', dist: 1.6 })
        },
        after: async (c) => {
          await c.say([T('kaydoudou', "Pas simple. Extraordinaire. Pour partir comme un champion."), S('kaydoudou', "La frappe du tonnerre")])
        },
      },
    },
    {
      kind: 'play', id: 'tonnerre', place: final, prompt: 'play.thunderIntro', keep: true, cast: [],
      challenge: {
        type: 'penalty', role: 'shoot', taker: 'K', keeper: 'PK', result: 'miss', missTo: [-6.5, 10.2], attackedBy: 'b',
        lines: [N("Il frappe beaucoup trop fort."), N("Le ballon passe au-dessus des bambous. Il monte, il monte, et il va se perdre dans le grillage de Monsieur Bilé.")],
      },
    },
    {
      kind: 'scene', id: 'pardon', place: final, keep: true, cast: [],
      shots: [
        {
          cam: { kind: 'on', who: 'K', dist: 1.7 },
          play: async (c) => { c.pose('K', 'dejected') },
          lines: [N("Silence."), N("Kaydoudou sent son corps devenir froid. Il regarde ses chaussettes. Il ne peut plus regarder personne.")],
        },
        { cam: { kind: 'pose', pos: [22, 4, 33], look: [8, 0.8, 14], fov: 50 }, lines: [S('pereRadio', "Si leur capitaine marque, on continue|, tout bas. Jusqu'à ce que quelqu'un rate.")] },
        {
          cam: { kind: 'on', who: ['K', 'O'], dist: 2.3 },
          play: async (c) => {
            c.pose('K', null)
            c.p('O').pos = { x: 5.2, y: 11.6 }; c.p('K').pos = { x: 6.0, y: 12.3 }; c.face('K', 'O'); c.face('O', 'K')
          },
          lines: [N("En revenant, Kaydoudou passe devant Ousmane."), S('kaydoudou', "Pardon|. Pardon, Ousmane.")],
        },
        {
          cam: { kind: 'on', who: 'O', dist: 2, side: -0.5 }, do: [{ a: 'face', id: 'O', to: [7, 14] }],
          lines: [N("Ousmane ne le regarde pas. Il regarde le ballon."), S('ousmane', "Regarde bien.")],
        },
      ],
    },
    /* -------------------------------------------------------------- Ousmane's hands (played) */
    {
      kind: 'scene', id: 'capitaine', place: final, cast: shootout({ CP: { at: [9.4, 14.3], face: [0, 14] }, O: { at: [0.5, 14], face: SPOT }, K: { at: [22.7, 12.4], face: [7, 14] }, PK: { at: [3.2, 21.5] } }),
      shots: [
        {
          cam: { kind: 'on', who: 'CP', dist: 2.6 },
          play: async (c) => { c.place(SPOT); await c.move('CP', [8.4, 14.2], 0.3) },
          parallel: true,
          lines: [N("Le capitaine des Panthères s'avance. Celui qui ramasse les petits à la pelle.")],
        },
        {
          cam: { kind: 'over', who: 'CP', to: 'O', dist: 2, height: 1.5, mix: 0.9 },
          lines: [N("Ousmane se place sur sa ligne. Il ne saute pas. Il ne fait pas de grimaces. Il est debout, calme, ses mains immenses pendues comme deux feuilles de bananier.")],
        },
        {
          cam: { kind: 'on', who: 'K', dist: 1.6 }, do: [{ a: 'slow', scale: 0.5 }],
          lines: [N("Tout ralentit."), N("La Panthère court. La poussière se lève derrière elle. Kaydoudou n'entend plus rien. Même plus son cœur."), N("Elle frappe.")],
        },
      ],
    },
    {
      kind: 'play', id: 'arret', place: final, prompt: 'play.saveIntro', keep: true, cast: [],
      challenge: {
        type: 'penalty', role: 'save', taker: 'CP', keeper: 'O', result: 'post',
        lines: [N("Ousmane s'envole vers la droite. Il ne bloque pas le ballon. Il le pousse du bout de ses longs doigts. Le ballon frappe le poteau en bambou. Le poteau tremble. Il penche encore un peu plus. Et le ballon revient sur le terrain.")],
      },
    },
    /* -------------------------------------------------------------- champions */
    {
      kind: 'scene', id: 'champions', place: final, keep: true, cast: [],
      shots: [
        {
          cam: { kind: 'pose', pos: [10, 2.2, 20], look: [2, 0.9, 14], fov: 46 }, do: [{ a: 'slow', scale: 1 }],
          lines: [N("Une seconde, personne ne bouge."), N("Puis Bonamoussadi explose.")],
        },
        {
          cam: { kind: 'pose', pos: [22, 4.5, 34], look: [6, 0.8, 14], fov: 52 }, do: [{ a: 'sfx', kind: 'success' }, { a: 'sfx', kind: 'drums' }],
          play: async (c) => {
            for (const id of ['K', 'B', 'M', 'R', 'SA', 'J', 'L2']) c.go(id, [2.2 + Math.random() * 1.6, 13 + Math.random() * 2], 0.95)
            c.pose('O', 'celebrate')
          },
          parallel: true,
          lines: [S('pereRadio', "CHAMPIOOOONS !|LES LIONCEAUX SONT CHAMPIONS DES QUARTIERS !")],
        },
        {
          cam: { kind: 'on', who: ['K', 'O'], dist: 2.2, height: 0.9 },
          play: async (c) => {
            for (const id of ['K', 'B', 'M', 'R', 'SA', 'J', 'L2']) c.stop(id)
            const o = c.p('O'); o.pos = { x: 2.6, y: 14 }
            c.pose('O', 'lie')
            c.p('K').pos = { x: 3.2, y: 14.4 }; c.face('K', 'O'); c.pose('K', 'kneel')
            const ring: [string, number, number][] = [['B', 3.4, 13.1], ['M', 2.0, 15.2], ['R', 1.7, 13.0], ['SA', 3.6, 15.4], ['J', 1.4, 14.2]]
            for (const [id, x, y] of ring) { c.p(id).pos = { x, y }; c.face(id, 'O'); c.pose(id, 'kneel') }
          },
          lines: [
            N("Après, Kaydoudou ne se souvient que de morceaux."),
            N("Il court vers Ousmane et tombe sur lui. Toute l'équipe tombe par-dessus. Sous la montagne de maillots, Ousmane rit. Ousmane, qui ne rit jamais."),
            S('kaydoudou', "J'ai tout raté !|Et toi, tu as tout sauvé !"),
            S('ousmane', "Toi, tu rates. Moi, j'arrête. Ça s'appelle une équipe."),
          ],
        },
        {
          cam: { kind: 'on', who: 'B', dist: 1.8 },
          lines: [N("BriBri passe la tête dans la montagne de maillots."), S('bribri', "On part champions, Kaydoudou. Comme il a dit.")],
        },
        {
          cam: { kind: 'on', who: 'R', dist: 2.4 }, do: [{ a: 'sfx', kind: 'drums' }],
          play: async (c) => { for (const id of ['K', 'B', 'M', 'SA', 'J', 'O']) c.pose(id, null); c.p('R').pos = { x: 4.6, y: 16.2 }; c.face('R', [10, 22]); c.pose('R', 'mic') },
          lines: [N("Les tambours repartent, plus fort qu'au matin."), S('radio', "Mesdames et messieurs|, je n'ai plus de voix ! Mais je commente quand même !")],
        },
        {
          cam: { kind: 'on', who: ['BI', 'K'], dist: 2.4 },
          play: async (c) => {
            c.pose('R', null)
            c.spawn({ id: 'BI', cast: 'bile', at: [6.2, 9.6], face: [5, 13] })
            c.p('K').pos = { x: 5.4, y: 12.2 }; c.face('K', 'BI')
            await c.move('BI', [5.6, 11.4], 0.3)
            c.face('BI', 'K'); c.face('K', 'BI')
            c.carry('BI')
          },
          parallel: true,
          lines: [N("Monsieur Bilé descend de son mur avec le ballon du tir raté."), S('bile', "Tiens, champion. Ton ballon était encore chez moi.")],
        },
        {
          cam: { kind: 'on', who: ['PA', 'K'], dist: 2.4 },
          play: async (c) => {
            c.release(); c.place([5.0, 12.8])
            const pa = c.p('PA'); pa.pos = { x: 5.9, y: 12.9 }; c.face('PA', 'K'); c.face('K', 'PA')
            c.pose('PA', 'hold'); c.pose('K', 'wave')
          },
          lines: [N("Papa soulève Kaydoudou comme une plume."), S('papa', "Tu as fait le plus haut tir au but de l'histoire de Douala, mon fils ! Même les oiseaux l'ont vu passer !")],
        },
        {
          cam: { kind: 'on', who: ['MA', 'K'], dist: 3.2 },
          play: async (c) => {
            c.pose('PA', null); c.pose('K', null)
            c.p('MA').pos = { x: 8.6, y: 13.6 }; c.face('MA', [12, 22]); c.pose('MA', 'dance')
            for (const [id, x, y] of [['MN', 9.8, 15.4], ['EK', 7.2, 15.2]] as const) { if (id === 'EK') c.spawn({ id: 'EK', cast: 'ekotto', at: [x, y], face: [8.6, 13.6] }); else { c.p(id).pos = { x, y }; c.face(id, 'MA') } }
            c.pose('MN', 'dance'); c.pose('EK', 'wave')
            c.p('K').pos = { x: 7.4, y: 12.6 }; c.face('K', 'MA')
          },
          lines: [
            N("Et il y a Mami, qui danse au milieu du terrain, les bras en l'air, le foulard qui glisse. Elle chante la chanson du njangi, et les mamans du quartier lui répondent."),
            S('kaydoudou', "Mami ! Tu danses comme Roger Milla !"),
            S('mami', "C'est Roger Milla qui danse comme moi, mon fils !"),
          ],
        },
        {
          cam: { kind: 'on', who: 'F', dist: 2.2 },
          play: async (c) => {
            c.pose('MA', null); c.pose('MN', null); c.pose('EK', null)
            c.p('F').pos = { x: -1.2, y: -2.4 }; c.face('F', [6, 6]); c.pose('F', 'cry')
          },
          lines: [N("Et il y a Tonton Fokou, sous le manguier, sur son bidon jaune. La casquette baissée sur les yeux. Les épaules qui tremblent. Quand Kaydoudou arrive, il se frotte vite le visage avec sa manche.")],
        },
        {
          cam: { kind: 'on', who: ['F', 'K'], dist: 2.2 },
          play: async (c) => { c.p('K').pos = { x: -0.2, y: -2.0 }; c.face('K', 'F'); c.face('F', 'K'); c.pose('F', null) },
          lines: [S('fokou', "La poussière|. Cette poussière rouge, elle entre partout."), S('kaydoudou', "Oui, Tonton. Elle entre partout.")],
        },
        {
          cam: { kind: 'on', who: ['F', 'K'], dist: 2.6 },
          play: async (c) => { c.pose('F', 'sit'); c.p('K').pos = { x: -0.4, y: -2.9 }; c.face('K', [6, 4]); c.face('F', [6, 4]); c.pose('K', 'sitGround') },
          lines: [N("Kaydoudou fait semblant de le croire. Il s'assoit à côté de lui et balance ses jambes.")],
        },
      ],
    },
    /* -------------------------------------------------------------- three signatures */
    {
      kind: 'scene', id: 'feutre', place: dusk,
      cast: [
        { id: 'MA', cast: 'mami', at: [1.2, 0.6], face: [2.4, 1.2] },
        { id: 'K', cast: 'kaydoudou', at: [2.3, 1.6], face: [1.2, 0.6], carry: true },
        { id: 'B', cast: 'bribri', at: [3.1, 0.6], face: [1.8, 1.0], number: 8 },
        { id: 'O', cast: 'ousmane', at: [2.4, -0.4], face: [1.8, 1.0] },
        { id: 'M', cast: 'mireille', at: [0.7, 1.9], face: [1.8, 1.0] },
        { id: 'R', cast: 'radio', at: [3.3, 1.9], face: [1.8, 1.0] },
        { id: 'F', cast: 'fokou', at: [0.4, -0.5], face: [1.8, 1.0] },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [5.4, 1.6, 4.6], look: [1.8, 0.9, 0.8], fov: 44 }, do: [{ a: 'ballLook', look: 'mamiPatched' }, { a: 'pose', id: 'MA', pose: 'hold' }],
          lines: [N("Le soir, quand le terrain est vide, Mami sort son feutre noir."), S('mami', "Maintenant, c'est plus tard. Donne-moi ton ballon, Kaydoudou."), S('kaydoudou', "Pour quoi faire ?")],
        },
        {
          cam: { kind: 'on', who: ['MA', 'K'], dist: 2 },
          play: async (c) => { c.release(); c.carry('MA') },
          lines: [S('mami', "Un ballon qui voyage doit savoir d'où il vient.")],
        },
        {
          cam: { kind: 'on', who: ['O', 'MA'], dist: 2 },
          play: async (c) => { c.p('O').pos = { x: 1.6, y: 0.0 }; c.face('O', 'MA'); c.pose('O', 'point') },
          lines: [N("Ousmane écrit le premier, en lettres appliquées, à côté du carré de pagne : « Ousmane. Les mains. »")],
        },
        {
          cam: { kind: 'on', who: ['M', 'MA'], dist: 2 },
          play: async (c) => { c.pose('O', null); c.p('M').pos = { x: 1.0, y: 1.3 }; c.face('M', 'MA'); c.pose('M', 'point') },
          lines: [
            N("Mireille écrit en grand : « Mireille, la Gazelle ». Et dessous, plus petit : « Ne m'oubliez pas, sinon gare. »"),
            S('radio', "Et moi ?|Je signe où ?"),
            S('mireille', "Toi, tu as déjà signé|. Avec ton tibia !"),
          ],
        },
        {
          cam: { kind: 'on', who: ['F', 'MA'], dist: 1.9 },
          play: async (c) => { c.pose('M', null); c.p('F').pos = { x: 0.7, y: 0.1 }; c.face('F', 'MA'); c.pose('F', 'point') },
          lines: [N("Tonton Fokou écrit le dernier. Il prend son temps : « Le ballon doit voyager. Fokou. »")],
        },
        {
          cam: { kind: 'pose', pos: [2.5, 1.3, 2.3], look: [1.35, 1.0, 0.9], fov: 30 }, do: [{ a: 'ballLook', look: 'mamiSigned' }, { a: 'pose', id: 'F', pose: null }],
          hold: 2.5,
        },
      ],
    },
    /* -------------------------------------------------------------- Douala airport */
    {
      kind: 'scene', id: 'aeroport', place: airport,
      cast: [
        { id: 'K', cast: 'kaydoudou', at: [8.2, 6.2], face: [8.2, 4.4] },
        { id: 'B', cast: 'bribri', at: [9.0, 6.6], face: [8.2, 4.4], pose: 'hold', look: { number: undefined, collar: '#F2EEE3' } },
        { id: 'O', cast: 'ousmane', at: [8.3, 4.6], face: [8.2, 6.2], look: { gloves: undefined } },
        { id: 'M', cast: 'mireille', at: [9.4, 4.9], face: [8.6, 6.2] },
        { id: 'F', cast: 'fokou', at: [10.4, 5.6], face: [9, 6.4] },
        { id: 'MA', cast: 'mami', at: [7.2, 5.3], face: [8.4, 6.2] },
        { id: 'papa', cast: 'papa', at: [10.6, 7.6], face: [8.6, 6] },
        { id: 'maman', cast: 'maman', at: [11.4, 7.2], face: [8.6, 6] },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [4.4, 1.7, 9.2], look: [9.2, 1.2, 4.6], fov: 50 }, do: [{ a: 'ballLook', look: 'mamiSigned' }],
          lines: [
            N("Lundi. L'aéroport de Douala sent l'essence d'avion et le café. Ousmane, Mireille, Tonton Fokou et Mami sont là."),
            S('hautParleur', "Vol pour Paris|. Embarquement immédiat."),
          ],
        },
      ],
    },
    {
      kind: 'play', id: 'bracelet', place: airport, prompt: 'play.braceletIntro', keep: true, cast: [],
      challenge: {
        type: 'ritual',
        steps: [
          {
            key: 'bracelet',
            act: async (c) => {
              c.cam({ kind: 'on', who: ['K', 'O'], dist: 2.1, side: 0.7 })
              c.p('K').pos = { x: 8.25, y: 5.3 }; c.face('K', 'O'); c.face('O', 'K'); c.pose('K', 'hold'); c.pose('O', 'palm')
              await c.say([
                N("Kaydoudou sort de sa poche un bracelet de fils rouges, jaunes et verts. Il l'attache au poignet d'Ousmane."),
                S('kaydoudou', "Je l'ai tressé toute la nuit, avec les fils de la malle de Mami. Il est un peu tordu. Mais comme ça, quand tu arrêtes un ballon, je suis avec toi."),
              ])
              c.pose('K', null); c.pose('O', null)
              c.cam({ kind: 'on', who: 'O', dist: 1.7 })
              await c.say([N("Ousmane regarde le bracelet longtemps. Puis il hoche la tête. Pour Ousmane, c'est un discours de trois heures.")])
            },
          },
        ],
      },
    },
    {
      kind: 'scene', id: 'auRevoir', place: airport, keep: true, cast: [],
      shots: [
        {
          cam: { kind: 'on', who: 'M', dist: 2 }, do: [{ a: 'pose', id: 'M', pose: 'fist' }],
          lines: [
            N("Mireille croise les bras."),
            S('mireille', "Je vais vous envoyer des messages vocaux. Tous les jours. Avec le bruit des benskins dedans. Comme ça, vous n'oublierez pas. Et si vous ne répondez pas, je viens en Amérique en courant."),
          ],
        },
        { cam: { kind: 'on', who: ['B', 'M'], dist: 2.6 }, do: [{ a: 'pose', id: 'M', pose: null }], lines: [S('bribri', "C'est loin, l'Amérique")] },
        {
          cam: { kind: 'on', who: ['M', 'K'], dist: 2.6 },
          lines: [S('mireille', "Je cours vite. Et toi, Kaydoudou, apprends bien l'américain. Pour me raconter."), S('kaydoudou', "On dit l'anglais, Mireille."), S('mireille', "C'est pareil !")],
        },
        {
          cam: { kind: 'on', who: ['MA', 'K'], dist: 2.4 },
          play: async (c) => {
            c.p('MA').pos = { x: 8.55, y: 6.75 }; c.p('K').pos = { x: 8.25, y: 6.25 }; c.p('B').pos = { x: 8.95, y: 6.35 }
            c.face('MA', [8.6, 6.2]); c.face('K', 'MA'); c.face('B', 'MA'); c.pose('MA', 'embrace'); c.pose('K', 'embrace'); c.pose('B', 'embrace')
          },
          lines: [N("Mami les serre contre elle, tous les deux à la fois. Pas de proverbe, cette fois. Juste deux mots."), S('mami', "Mes lions."), N("Et c'est plus fort que tous les proverbes du monde.")],
        },
        {
          cam: { kind: 'on', who: ['F', 'B'], dist: 2.2 },
          play: async (c) => {
            c.pose('MA', null); c.pose('K', null); c.pose('B', 'hold')
            c.p('F').pos = { x: 9.6, y: 5.8 }; c.face('F', 'B'); c.face('B', 'F'); c.pose('F', 'palm')
          },
          lines: [N("Tonton Fokou tapote le carnet que BriBri serre contre sa poitrine."), S('fokou', "Écris tout, capitaine."), S('bribri', "Tout, Tonton. Promis.")],
        },
      ],
    },
    /* -------------------------------------------------------------- the plane */
    {
      kind: 'scene', id: 'hublot', place: airport,
      cast: [
        { id: 'K', cast: 'kaydoudou', at: 'seatK', face: Math.PI, pose: 'sit' },
        { id: 'B', cast: 'bribri', at: 'seatB', face: Math.PI, pose: 'sit', look: { number: undefined, collar: '#F2EEE3' } },
        { id: 'pax', cast: 'passager', at: [24.15, 5.65], face: Math.PI, pose: 'sit' },
      ],
      shots: [
        {
          cam: { kind: 'pose', pos: [22.75, 1.25, 5.3], look: [22.95, 0.88, 3.3], fov: 55 },
          lines: [N("Dans l'avion, BriBri laisse le hublot à Kaydoudou. Il est assis tout droit, le carnet collé contre sa poitrine.")],
        },
        {
          cam: { kind: 'pose', pos: [21.6, 1.55, 4.35], look: [22.9, 0.95, 4.25], fov: 44 }, do: [{ a: 'sfx', kind: 'engine' }, { a: 'cue', name: 'roll' }],
          play: async (c) => { c.shake(0.15) },
          lines: [N("Les moteurs hurlent. Vrrrooooum ! L'avion roule, de plus en plus vite. BriBri ferme les yeux. Il devient tout gris."), S('bribri', "Deux cents tonnes|. Deux cents tonnes.")],
        },
      ],
    },
    {
      kind: 'play', id: 'main', place: airport, prompt: 'play.handIntro', keep: true, cast: [],
      challenge: {
        type: 'ritual',
        steps: [
          {
            key: 'main',
            act: async (c) => {
              c.pose('K', 'restL'); c.pose('B', 'restR')
              c.cam({ kind: 'pose', pos: [22.38, 1.02, 4.5], look: [22.92, 0.64, 4.05], fov: 42 })
              await c.say([N("Alors Kaydoudou fait une chose qu'il n'a jamais faite. Il pose sa petite main sur celle de son frère, sur l'accoudoir. Et il serre. Fort.")])
              c.cam({ kind: 'pose', pos: [22.75, 1.25, 5.3], look: [22.95, 0.88, 3.3], fov: 55 })
              await c.say([
                S('kaydoudou', "Moi, je pèse vingt-huit kilos|. Ça fait deux cents tonnes et vingt-huit kilos. Ça change tout."),
                S('bribri', "Ça ne change rien"),
                S('kaydoudou', "Si. Maintenant, tu n'es plus tout seul dedans."),
                N("BriBri ouvre un œil. Il regarde la main de Kaydoudou sur la sienne. Il ne la retire pas. Il referme l'œil, et ses doigts serrent ceux de son frère à leur tour."),
              ])
            },
          },
        ],
      },
    },
    {
      kind: 'scene', id: 'decollage', place: airport, keep: true, cast: [],
      shots: [
        {
          cam: { kind: 'pose', pos: [23.35, 1.42, 4.6], look: [22.7, 1.05, 3.0], fov: 50 }, do: [{ a: 'cue', name: 'takeoff' }, { a: 'sfx', kind: 'engine' }, { a: 'look', id: 'K', at: 'window' }],
          play: async (c) => { c.shake(0.25) },
          lines: [N("L'avion quitte le sol. Le ventre de Kaydoudou descend jusque dans ses chaussettes, la rouge et la jaune. La lumière blanche du matin entre par le hublot. Il y colle presque son front.")],
        },
        {
          cam: { kind: 'pose', pos: [23.35, 1.42, 4.6], look: [22.7, 1.05, 3.0], fov: 50 },
          lines: [S('kaydoudou', "Regarde, BriBri ! Les toits qui brillent ! Le Wouri !"), S('bribri', "Je ne regarde pas.")],
        },
        {
          cam: { kind: 'pose', pos: [23.05, 1.15, 3.95], look: [22.3, 0.95, 2.0], fov: 52 }, do: [{ a: 'cue', name: 'clouds' }],
          lines: [N("Quelque part en bas, tout petit, peut-être, il y a un terrain de terre rouge avec un manguier dans un coin. Puis les nuages arrivent, blancs et épais comme le brouillard de Bafoussam. La terre rouge disparaît dessous.")],
        },
        {
          cam: { kind: 'pose', pos: [22.75, 1.25, 5.3], look: [22.95, 0.88, 3.3], fov: 55 },
          lines: [
            N("Sous le siège, dans le sac, il y a le ballon de Mami. Avec son carré de pagne et trois signatures."),
            N("Kaydoudou sourit contre la vitre, de son grand sourire troué. Il serre un peu plus fort la main de son frère."),
          ],
        },
        { cam: { kind: 'pose', pos: [22.38, 1.06, 3.92], look: [22.9, 0.98, 3.74], fov: 46 }, lines: [S('kaydoudou', "Le ballon voyage")], hold: 1.5 },
      ],
    },
    { kind: 'lesson', no: 8 },
  ],
}
