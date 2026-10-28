// The 40 "Leçons du Ballon" of Tome 1, merged from two sources:
//  - LESSONS (generated from tome1/chapters/*.md): the real carnet lines and diagram, in French;
//  - OUTLINE below (from tome1/OUTLINE.md): number, part, titles and a short gist in both languages,
//    used for chapters not written yet and for the English version.
import { LESSONS } from '../../content'
import type { DiagramSpec, Lang, SkillKey } from '../../lib/types'

export interface PartInfo { no: number; from: number; to: number; tone: string; ink: string }

/** Part names are in i18n (player:parts.N.*); colours follow the five pieces. */
export const PARTS: PartInfo[] = [
  { no: 1, from: 1, to: 8, tone: '#B8432F', ink: '#FFFDF8' }, // Cameroun, le cœur
  { no: 2, from: 9, to: 16, tone: '#3D4F6B', ink: '#FFFDF8' }, // États-Unis, la raison
  { no: 3, from: 17, to: 24, tone: '#1F4D3A', ink: '#FFFDF8' }, // France, les yeux
  { no: 4, from: 25, to: 32, tone: '#C5762F', ink: '#FFFDF8' }, // Espagne, la carte
  { no: 5, from: 33, to: 40, tone: '#101814', ink: '#E3A92B' }, // Angleterre, le souffle
]
export const partOf = (no: number) => PARTS.find((p) => no >= p.from && no <= p.to) ?? PARTS[0]

type Pair = [string, string]
interface OutlineLesson { chapter: Pair; title: Pair; gist: Pair; skill: SkillKey; drill?: string }

const O: Record<number, OutlineLesson> = {
  1: { chapter: ['Le ballon rapiécé', 'The patched ball'], title: ['Le ballon doit voyager', 'The ball must travel'], gist: ["Un joueur qui dribble cinq adversaires fatigue le ballon ; trois passes le font arriver plus vite.", 'A player who dribbles past five opponents tires the ball out; three passes get it there faster.'], skill: 'passe', drill: 'R07' },
  2: { chapter: ['Le njangi de Mami', "Mami's njangi"], title: ['Le ballon, c\'est la caisse du njangi', 'The ball is the njangi pot'], gist: ["Chacun verse sa passe, le ballon passe par tout le monde, et à la fin quelqu'un touche le but. Mais une passe qui ne va nulle part ne sert à rien.", 'Everyone puts in a pass, the ball goes through everyone, and in the end someone collects the goal. But a pass that goes nowhere is worth nothing.'], skill: 'passe', drill: 'R07' },
  3: { chapter: ['Les Requins de Bépanda', 'The Bépanda Sharks'], title: ['Quand on te serre, le ballon doit partir', 'When they squeeze you, the ball must go'], gist: ['Si deux adversaires viennent sur toi, un partenaire est libre quelque part.', 'If two opponents come at you, a teammate is free somewhere.'], skill: 'decision', drill: 'P07' },
  4: { chapter: ['La boue et le pagne', 'Mud and wax cloth'], title: ['Offrir une solution', 'Offer a solution'], gist: ["Si un adversaire est entre toi et le porteur, tu n'existes pas. Deux pas de côté, et tu redeviens une solution.", 'If an opponent stands between you and the ball, you do not exist. Two steps to the side and you are an option again.'], skill: 'appels', drill: 'R01' },
  5: { chapter: ['La passe polie et la passe utile', 'The polite pass and the useful pass'], title: ['La passe polie et la passe utile', 'The polite pass and the useful pass'], gist: ["Une passe sur le côté garde le ballon ; une passe qui traverse une ligne rapproche du but. Il ne faut pas avoir peur de la deuxième.", 'A sideways pass keeps the ball; a pass through a line gets you closer to goal. Do not be afraid of the second one.'], skill: 'passe', drill: 'S07' },
  6: { chapter: ['La lettre de Waldorf', 'The letter from Waldorf'], title: ['Un joueur qui bouge reste dans l\'équipe', 'A player who moves stays in the team'], gist: ['Quand tu cours sans ballon, tu emmènes un adversaire et tu ouvres un espace pour un autre.', 'When you run without the ball, you take an opponent with you and open space for someone else.'], skill: 'appels', drill: 'S03' },
  7: { chapter: ['Le carnet de Tonton Fokou', "Tonton Fokou's notebook"], title: ['Oser la passe qui traverse', 'Dare the pass that cuts through'], gist: ['Attirer à gauche, renverser, puis la passe qui traverse : la première page officielle du carnet.', 'Draw them left, switch, then the pass that cuts through: the first official page of the notebook.'], skill: 'passe', drill: 'S07' },
  8: { chapter: ['Finale à Bonamoussadi', 'Final at Bonamoussadi'], title: ['Le cœur du Njangi', 'The heart of the Njangi'], gist: ['Jouer ensemble, faire voyager le ballon, se montrer, oser, ne jamais garder la caisse.', 'Play together, make the ball travel, show yourself, dare, never keep the pot.'], skill: 'communication', drill: 'R07' },
  9: { chapter: ['La neige de Waldorf', 'Snow in Waldorf'], title: ['Petit espace, grande tête', 'Small space, big head'], gist: ['Au futsal, il n\'y a pas de temps : il faut savoir quoi faire avant que le ballon arrive.', 'In futsal there is no time: you must know what to do before the ball arrives.'], skill: 'decision', drill: 'S06' },
  10: { chapter: ['Les tryouts', 'The tryouts'], title: ['Le premier contrôle va quelque part', 'The first touch goes somewhere'], gist: ['Contrôler vers l\'espace libre fait gagner une seconde ; contrôler sous ses pieds la fait perdre.', 'A first touch into space wins you a second; a touch under your feet loses it.'], skill: 'controle', drill: 'S08' },
  11: { chapter: ['Soixante-dix pour cent', 'Seventy per cent'], title: ['Posséder n\'est pas garder', 'Possessing is not keeping'], gist: ['Avoir le ballon ne sert à rien si on ne va nulle part. Chaque passe répond à une question : où est-ce qu\'on va ?', 'Having the ball means nothing if you go nowhere. Every pass answers one question: where are we going?'], skill: 'decision', drill: 'L02' },
  12: { chapter: ['Les chiffres de Marcus', "Marcus's numbers"], title: ['Dribbler pour attirer', 'Dribble to draw them in'], gist: ['Un dribble qui attire deux adversaires libère un partenaire.', 'A dribble that draws two opponents frees a teammate.'], skill: 'dribble-njangi', drill: 'S04' },
  13: { chapter: ['Pas de devoirs, pas de crampons', 'No homework, no boots'], title: ['Les lignes', 'The lines'], gist: ['Une équipe adverse, c\'est trois lignes. Une passe qui traverse une ligne fait avancer tout le monde.', 'The other team is three lines. A pass through a line moves everyone forward.'], skill: 'passe', drill: 'S07' },
  14: { chapter: ['La Coupe du monde chez nous', 'The World Cup comes to us'], title: ['Une équipe, une idée', 'One team, one idea'], gist: ['Une grande équipe, c\'est onze joueurs qui ont la même carte dans la tête.', 'A great team is eleven players with the same map in their heads.'], skill: 'communication', drill: 'L04' },
  15: { chapter: ['Courir pour les autres', 'Running for others'], title: ['Courir pour les autres', 'Running for others'], gist: ['Une course sans ballon peut faire marquer un autre.', 'A run without the ball can make someone else score.'], skill: 'appels', drill: 'T05' },
  16: { chapter: ['Goodbye, Potomac', 'Goodbye, Potomac'], title: ['Compter ce qui compte', 'Count what counts'], gist: ['Le pourcentage de possession ne dit pas qui joue bien. Ce qui compte : les lignes traversées, les ballons dans la surface, les bonnes occasions.', 'Possession percentage does not tell you who plays well. What counts: lines broken, balls into the box, good chances.'], skill: 'decision', drill: 'L02' },
  17: { chapter: ['Avant de recevoir, tu regardes', 'Before you receive, you look'], title: ['Le scan', 'The scan'], gist: ['Avant que le ballon arrive, je regarde par-dessus mon épaule, deux fois, trois fois.', 'Before the ball arrives, I look over my shoulder, twice, three times.'], skill: 'scan', drill: 'R05' },
  18: { chapter: ['Entre les lignes', 'Between the lines'], title: ['Entre les lignes', 'Between the lines'], gist: ['Celui qui reçoit entre les milieux et les défenseurs adverses et se tourne met toute la défense en danger.', 'Whoever receives between their midfield and defence and turns puts the whole defence in danger.'], skill: 'scan', drill: 'P05' },
  19: { chapter: ['Kenzo', 'Kenzo'], title: ['Le corps ouvert', 'The open body'], gist: ['Je reçois sur le pied loin du défenseur, le corps tourné vers le jeu : je vois plus, je joue plus vite.', 'I receive on the foot away from the defender, body facing the game: I see more, I play faster.'], skill: 'controle', drill: 'P05' },
  20: { chapter: ['Le match de trop', 'The match too far'], title: ['On ne laisse personne seul', 'We leave nobody alone'], gist: ['Quand un partenaire a le ballon, ou un problème, il doit avoir trois amis près de lui.', 'When a teammate has the ball, or a problem, he needs three friends close by.'], skill: 'appels', drill: 'P01' },
  21: { chapter: ['Les cinq secondes', 'The five seconds'], title: ['Les cinq secondes', 'The five seconds'], gist: ['Quand on perd le ballon, c\'est le meilleur moment pour le reprendre : tout le monde l\'attaque pendant cinq secondes.', 'When we lose the ball, it is the best moment to win it back: everyone attacks it for five seconds.'], skill: 'contre-pression', drill: 'T01' },
  22: { chapter: ['Noël sans Mami', 'Christmas without Mami'], title: ['Voir avant, c\'est jouer plus vite', 'Seeing first means playing faster'], gist: ['Celui qui a déjà regardé n\'a pas besoin de réfléchir quand le ballon arrive : il joue en une touche.', 'If you have already looked, you do not need to think when the ball arrives: you play first time.'], skill: 'scan', drill: 'R05' },
  23: { chapter: ['Parler, c\'est passer', 'Talking is passing'], title: ['Parler, c\'est passer', 'Talking is passing'], gist: ['Un mot dit au bon moment est une passe : « Seul ! », « Homme ! », « Tourne ! ».', 'A word at the right moment is a pass: "Time!", "Man on!", "Turn!".'], skill: 'communication', drill: 'R05' },
  24: { chapter: ['Des yeux pour partir', 'Eyes to leave with'], title: ['Les yeux du Njangi', 'The eyes of the Njangi'], gist: ['Je scanne, j\'ouvre mon corps, je cherche entre les lignes, je reprends en cinq secondes, je parle.', 'I scan, I open my body, I look between the lines, I win it back in five seconds, I talk.'], skill: 'scan', drill: 'P05' },
  25: { chapter: ['Le taureau', 'The bull'], title: ['Le rondo', 'The rondo'], gist: ['Passer en une ou deux touches, toujours offrir un angle, ne jamais être caché derrière le taureau.', 'Pass in one or two touches, always offer an angle, never hide behind the bull.'], skill: 'passe', drill: 'R01' },
  26: { chapter: ['Avi Ramon', 'Avi Ramon'], title: ['La pausa', 'The pausa'], gist: ['Garder le ballon une demi-seconde de plus, pour que l\'adversaire s\'engage, et jouer dans son dos.', 'Keep the ball half a second longer so the opponent commits, then play behind him.'], skill: 'decision', drill: 'R02' },
  27: { chapter: ['Les couloirs', 'The lanes'], title: ['Les cinq couloirs', 'The five lanes'], gist: ['Le terrain a cinq couloirs. Bien répartis, on étire l\'adversaire et on ouvre des espaces au milieu.', 'The pitch has five lanes. Spread well across them and you stretch the opponent and open space in the middle.'], skill: 'appels', drill: 'P02' },
  28: { chapter: ['Le troisième homme', 'The third man'], title: ['Le troisième homme', 'The third man'], gist: ['A vers B, B remet vers C qui arrive : l\'adversaire regarde le ballon et oublie le troisième.', 'A to B, B sets it back to C arriving: the opponent watches the ball and forgets the third man.'], skill: 'passe', drill: 'P03' },
  29: { chapter: ['La mer et Mami', 'The sea and Mami'], title: ['Le dribble njangi', 'The njangi dribble'], gist: ['Je dribble pour attirer, je fixe deux adversaires, et je donne au partenaire qui a de l\'espace. Mon dribble, c\'est un cadeau.', 'I dribble to draw them in, I pin two opponents, and I give it to the teammate in space. My dribble is a gift.'], skill: 'dribble-njangi', drill: 'S04' },
  30: { chapter: ['Les trois supériorités', 'The three superiorities'], title: ['Les trois supériorités', 'The three superiorities'], gist: ['Plus nombreux, mieux placés, meilleur dans le duel.', 'More of us, better placed, better in the duel.'], skill: 'decision', drill: 'P08' },
  31: { chapter: ['L\'Atlas', 'The Atlas'], title: ['Lent, lent, VITE', 'Slow, slow, QUICK'], gist: ['On fait circuler lentement pour attirer, puis on accélère d\'un coup quand l\'espace s\'ouvre.', 'Circulate slowly to draw them in, then speed up at once when the space opens.'], skill: 'decision', drill: 'P09' },
  32: { chapter: ['La carte du Njangi', 'The map of the Njangi'], title: ['La carte du Njangi', 'The map of the Njangi'], gist: ['Rondo, pausa, couloirs, troisième homme, supériorités : savoir où être, quand passer, et pour qui.', 'Rondo, pausa, lanes, third man, superiorities: knowing where to be, when to pass, and for whom.'], skill: 'decision', drill: 'P02' },
  33: { chapter: ['Intensity is a choice', 'Intensity is a choice'], title: ['Recevoir sous pression', 'Receiving under pressure'], gist: ['Je protège le ballon avec mon corps, je joue loin de la pression, et si je suis coincé, je joue en une touche sur un partenaire.', 'I shield the ball with my body, play away from pressure, and if I am stuck I play first time off a teammate.'], skill: 'protection', drill: 'G02' },
  34: { chapter: ['Jouer avant le contact', 'Play before the contact'], title: ['Jouer avant le contact', 'Play before the contact'], gist: ['Mon premier contrôle m\'éloigne du défenseur, et je lâche le ballon avant qu\'il me touche.', 'My first touch takes me away from the defender, and I release the ball before he touches me.'], skill: 'controle', drill: 'S08' },
  35: { chapter: ['Le pressing', 'The press'], title: ['Les déclencheurs', 'The triggers'], gist: ['On presse ensemble, au bon moment : passe en arrière, mauvais contrôle, ballon près de la touche.', 'We press together, at the right moment: a back pass, a bad touch, a ball near the touchline.'], skill: 'contre-pression', drill: 'T04' },
  36: { chapter: ['Le njangi du vestiaire', 'The dressing room njangi'], title: ['Le njangi du vestiaire', 'The dressing room njangi'], gist: ['Une équipe est un njangi : chacun verse sa part, son effort, sa joie, sa parole, et tout le monde touche la victoire.', 'A team is a njangi: everyone puts in their share, effort, joy, words, and everyone collects the win.'], skill: 'communication', drill: 'R07' },
  37: { chapter: ['Monsieur Atéba', 'Monsieur Atéba'], title: ['Après la récupération, regarder devant', 'After winning it, look forward'], gist: ['Quand on reprend le ballon, je regarde d\'abord la profondeur. Si c\'est ouvert, on attaque vite ; sinon, on garde.', 'When we win the ball, I look in behind first. If it is open, we attack fast; if not, we keep it.'], skill: 'decision', drill: 'T02' },
  38: { chapter: ['Le souffle', 'The breath'], title: ['Le ballon respire pour nous', 'The ball breathes for us'], gist: ['Quand on est fatigués, on garde le ballon et on le fait circuler : c\'est lui qui court.', 'When we are tired, we keep the ball and move it around: the ball does the running.'], skill: 'passe', drill: 'P10' },
  39: { chapter: ['L\'avion de Mami', "Mami's flight"], title: ['Les cinq pièces du Njangi', 'The five pieces of the Njangi'], gist: ['Le cœur, la raison, les yeux, la carte, le souffle. Le ballon doit voyager. Mais il doit savoir où il va.', 'Heart, reason, eyes, map, breath. The ball must travel. But it must know where it is going.'], skill: 'communication', drill: 'G06' },
  40: { chapter: ['Le but du Njangi', 'The Njangi goal'], title: ['Le but du Njangi', 'The Njangi goal'], gist: ['Tout le monde touche, chacun verse sa part, le ballon sait où il va.', 'Everyone touches it, everyone puts in their share, the ball knows where it is going.'], skill: 'passe', drill: 'G06' },
}

export interface LessonView {
  no: number
  part: number
  chapterTitle: string
  title: string
  lines: string[] // in the reading language
  original: string[] // the French carnet lines from the book (empty if not written yet)
  diagram: DiagramSpec | null
  fromBook: boolean
  skill: SkillKey
  drill?: string
}

/** All 40 lessons in the given language, using the book when the chapter exists. */
export function allLessons(lang: Lang): LessonView[] {
  const i = lang === 'en' ? 1 : 0
  const out: LessonView[] = []
  for (let no = 1; no <= 40; no++) {
    const o = O[no]
    const b = LESSONS.find((l) => l.no === no)
    const fromBook = !!(b && b.lines && b.lines.length)
    const original = fromBook ? b!.lines : []
    const lines = lang === 'fr' && fromBook ? original : [o.gist[i]]
    out.push({
      no, part: partOf(no).no,
      chapterTitle: lang === 'fr' && b?.chapterTitle ? b.chapterTitle : o.chapter[i],
      title: lang === 'fr' && b?.title ? b.title : o.title[i],
      lines, original, diagram: b?.diagram ?? null, fromBook, skill: o.skill, drill: o.drill,
    })
  }
  return out
}

export const chapterHref = (no: number) => `/book/tome1/ch-${String(no).padStart(2, '0')}.html`

/** The lesson of the day: deterministic by date, preferring lessons already in the book (with a diagram). */
export function lessonOfDay(list: LessonView[], date: string) {
  const withDiagram = list.filter((l) => l.fromBook && l.diagram)
  const pool = withDiagram.length ? withDiagram : list.filter((l) => l.fromBook).length ? list.filter((l) => l.fromBook) : list
  const d = Math.floor(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) / 86400000)
  return pool[d % pool.length]
}
