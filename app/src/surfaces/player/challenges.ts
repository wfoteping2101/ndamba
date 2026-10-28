// Solo challenges of the player space: safe, doable alone (or with a wall, a few cones, a parent).
// Each one trains one of the ten competences and echoes one Leçon du Ballon of Tome 1.
// XP, levels and streaks are COMPUTED from db.challenges (ChallengeLog), never stored.
import type { ChallengeLog, Lang, SkillKey } from '../../lib/types'
import { addDays } from '../../lib/util'

export type ChallengeKind = 'ballon' | 'mur' | 'yeux' | 'conduite' | 'physique' | 'finition'
export type Unit = 'jongles' | 'passes' | 'reps' | 'seconds' | 'touches' | 'sprints' | 'points' | 'minutes'
export type Gear = 'ball' | 'wall' | 'cones' | 'partner' | 'space'

export interface ChallengeText {
  title: string
  how: string // the instructions, two to four short sentences
  score: string // what number to write down
  tip: string // one coaching cue
}

export interface Challenge {
  id: string
  kind: ChallengeKind
  skill: SkillKey
  lesson: number // the Leçon du Ballon it echoes
  target: number
  unit: Unit
  better: 'higher' | 'lower'
  minutes: number
  gear: Gear[]
  fr: ChallengeText
  en: ChallengeText
}

export const CHALLENGES: Challenge[] = [
  {
    id: 'jongles-mami', kind: 'ballon', skill: 'controle', lesson: 4, target: 10, unit: 'jongles', better: 'higher', minutes: 5, gear: ['ball'],
    fr: { title: 'Les dix jongles du ballon de Mami', how: "Le rituel de Kaydoudou et BriBri avant chaque grand match : dix jongles sans que le ballon touche le sol. Pieds, cuisses, tête, tout est permis. Tu as cinq minutes pour essayer autant de fois que tu veux.", score: 'Ta meilleure série de jongles', tip: 'Le ballon monte à hauteur de ceinture, pas plus haut.' },
    en: { title: "Ten juggles with Mami's ball", how: "Kaydoudou and BriBri's ritual before every big game: ten juggles without the ball touching the ground. Feet, thighs, head, anything goes. You have five minutes to try as often as you like.", score: 'Your best juggling streak', tip: 'Keep the ball at belt height, no higher.' },
  },
  {
    id: 'jongles-alternes', kind: 'ballon', skill: 'controle', lesson: 1, target: 20, unit: 'jongles', better: 'higher', minutes: 6, gear: ['ball'],
    fr: { title: 'Jongles pied droit, pied gauche', how: 'Jongle en changeant de pied à chaque touche : droit, gauche, droit, gauche. Si le ballon tombe, tu recommences à zéro. Six minutes.', score: 'Ta meilleure série en alternant', tip: 'Cheville bloquée, pointe du pied légèrement relevée.' },
    en: { title: 'Right foot, left foot juggling', how: 'Juggle switching feet on every touch: right, left, right, left. If the ball drops, start again from zero. Six minutes.', score: 'Your best alternating streak', tip: 'Lock your ankle, toes slightly up.' },
  },
  {
    id: 'jongles-faible', kind: 'ballon', skill: 'controle', lesson: 19, target: 10, unit: 'jongles', better: 'higher', minutes: 5, gear: ['ball'],
    fr: { title: 'Le pied qui dort', how: "Jongle seulement avec ton pied le moins fort. Tu peux t'aider de la cuisse, jamais de l'autre pied. Cinq minutes.", score: 'Ta meilleure série avec le pied faible', tip: 'Petites touches, regarde le bas du ballon.' },
    en: { title: 'The sleepy foot', how: 'Juggle with your weaker foot only. Your thigh may help, your other foot may not. Five minutes.', score: 'Your best streak with your weak foot', tip: 'Small touches, watch the bottom of the ball.' },
  },
  {
    id: 'semelle-futsal', kind: 'conduite', skill: 'conduite', lesson: 9, target: 40, unit: 'touches', better: 'higher', minutes: 4, gear: ['ball'],
    fr: { title: 'La semelle du futsal de Waldorf', how: "Fais rouler le ballon de gauche à droite sous la semelle, en alternant les pieds, pendant 30 secondes. Compte chaque touche. Trois essais, une minute de pause entre chaque.", score: 'Ton meilleur nombre de touches en 30 secondes', tip: 'Sur la pointe des pieds, comme BriBri.' },
    en: { title: 'The Waldorf futsal sole roll', how: 'Roll the ball side to side under your sole, switching feet, for 30 seconds. Count every touch. Three tries, one minute of rest between them.', score: 'Your best touch count in 30 seconds', tip: 'Stay on your toes, like BriBri.' },
  },
  {
    id: 'pieds-rapides', kind: 'conduite', skill: 'conduite', lesson: 31, target: 60, unit: 'touches', better: 'higher', minutes: 4, gear: ['ball'],
    fr: { title: 'Les pieds rapides', how: 'Pose la pointe du pied sur le dessus du ballon, droite puis gauche, le plus vite possible, sans le faire rouler. 30 secondes, trois essais.', score: 'Ton meilleur nombre de touches en 30 secondes', tip: "Bras qui bougent, buste droit : le rythme vient d'en haut." },
    en: { title: 'Quick feet', how: 'Tap the top of the ball with the sole of your foot, right then left, as fast as you can without moving it. 30 seconds, three tries.', score: 'Your best touch count in 30 seconds', tip: 'Arms moving, chest up: rhythm starts at the top.' },
  },
  {
    id: 'cent-touches', kind: 'ballon', skill: 'controle', lesson: 38, target: 60, unit: 'seconds', better: 'lower', minutes: 4, gear: ['ball'],
    fr: { title: 'Cent touches intérieur, intérieur', how: "Fais passer le ballon d'un pied à l'autre avec l'intérieur, sur place, comme une cloche. Chronomètre le temps pour faire cent touches.", score: 'Ton temps pour cent touches (en secondes)', tip: 'Genoux souples, petits pas, le ballon reste près de toi.' },
    en: { title: 'One hundred inside touches', how: 'Tap the ball from one foot to the other with the inside, on the spot, like a bell. Time how long you need for one hundred touches.', score: 'Your time for one hundred touches (seconds)', tip: 'Soft knees, small steps, ball close to you.' },
  },
  {
    id: 'mur-une-touche', kind: 'mur', skill: 'passe', lesson: 9, target: 30, unit: 'passes', better: 'higher', minutes: 5, gear: ['ball', 'wall'],
    fr: { title: 'Le mur en une touche', how: "Place-toi à trois mètres d'un mur. Passes au sol en une seule touche pendant une minute, sans arrêter le ballon. Trois essais.", score: 'Ton meilleur nombre de passes en une minute', tip: 'Pied d\'appui à côté du ballon, cheville dure.' },
    en: { title: 'One-touch wall passes', how: 'Stand three metres from a wall. Pass along the ground in one touch for one minute without stopping the ball. Three tries.', score: 'Your best number of passes in one minute', tip: 'Standing foot next to the ball, firm ankle.' },
  },
  {
    id: 'mur-deux-pieds', kind: 'mur', skill: 'passe', lesson: 25, target: 25, unit: 'passes', better: 'higher', minutes: 5, gear: ['ball', 'wall'],
    fr: { title: 'Le rondo du mur', how: "À cinq mètres du mur, une touche du pied droit, une touche du pied gauche, et ainsi de suite, pendant une minute. C'est le rondo de Jordi Puig, avec le mur comme partenaire.", score: 'Ton meilleur nombre de passes en une minute', tip: 'Bouge entre les passes pour te placer face au ballon.' },
    en: { title: 'The wall rondo', how: "Five metres from the wall: one touch with the right, one with the left, and so on, for one minute. It is Jordi Puig's rondo with the wall as your partner.", score: 'Your best number of passes in one minute', tip: 'Move between passes so you face the ball.' },
  },
  {
    id: 'pied-faible-mur', kind: 'mur', skill: 'passe', lesson: 33, target: 25, unit: 'passes', better: 'higher', minutes: 5, gear: ['ball', 'wall'],
    fr: { title: 'Le pied faible contre le mur', how: 'Passes contre le mur avec ton pied le moins fort uniquement : un contrôle, une passe. Une minute, trois essais.', score: 'Ton meilleur nombre de passes en une minute', tip: 'Vise un point précis du mur, toujours le même.' },
    en: { title: 'Weak foot against the wall', how: 'Wall passes with your weaker foot only: one control, one pass. One minute, three tries.', score: 'Your best number of passes in one minute', tip: 'Aim at one precise spot on the wall, always the same.' },
  },
  {
    id: 'corps-ouvert', kind: 'mur', skill: 'controle', lesson: 19, target: 16, unit: 'reps', better: 'higher', minutes: 6, gear: ['ball', 'wall', 'cones'],
    fr: { title: 'Le corps ouvert de Lacombe', how: "Pose un plot à trois mètres sur ta droite. Passe contre le mur, reçois avec le pied le plus loin du mur, le corps ouvert, et pousse le ballon vers le plot en un contrôle. Dix fois à droite, dix fois à gauche.", score: 'Combien de contrôles propres sur 20', tip: 'Épaules ouvertes avant que le ballon arrive.' },
    en: { title: "Lacombe's open body", how: 'Put a cone three metres to your right. Pass against the wall, receive on the foot furthest from the wall with an open body, and push the ball towards the cone in one touch. Ten times to the right, ten to the left.', score: 'Clean first touches out of 20', tip: 'Open your shoulders before the ball arrives.' },
  },
  {
    id: 'controle-oriente', kind: 'mur', skill: 'controle', lesson: 10, target: 16, unit: 'reps', better: 'higher', minutes: 6, gear: ['ball', 'wall', 'cones'],
    fr: { title: 'Le premier contrôle va quelque part', how: "Fais une petite porte de deux plots à deux mètres sur le côté. Passe contre le mur, et ton premier contrôle doit faire passer le ballon dans la porte. Vingt essais, en changeant de côté.", score: 'Combien de contrôles dans la porte sur 20', tip: 'Le contrôle est déjà une passe à toi-même.' },
    en: { title: 'The first touch goes somewhere', how: 'Make a small gate with two cones two metres to the side. Pass against the wall; your first touch must send the ball through the gate. Twenty tries, switching sides.', score: 'First touches through the gate out of 20', tip: 'A first touch is a pass to yourself.' },
  },
  {
    id: 'contact-avant', kind: 'mur', skill: 'controle', lesson: 34, target: 15, unit: 'reps', better: 'higher', minutes: 5, gear: ['ball', 'wall', 'cones'],
    fr: { title: 'Jouer avant le contact', how: "Pose un plot juste à côté de toi : c'est le défenseur. Passe contre le mur, contrôle loin du plot, puis rejoue en deuxième touche. Une minute.", score: 'Combien de séquences propres en une minute', tip: 'Le meilleur tacle, c\'est celui qu\'on ne reçoit pas.' },
    en: { title: 'Play before the contact', how: 'Put a cone right next to you: that is the defender. Pass against the wall, take your first touch away from the cone, then play again with your second. One minute.', score: 'Clean sequences in one minute', tip: 'The best tackle is the one you never receive.' },
  },
  {
    id: 'protection', kind: 'conduite', skill: 'protection', lesson: 33, target: 20, unit: 'reps', better: 'higher', minutes: 5, gear: ['ball', 'cones'],
    fr: { title: 'Le bouclier', how: "Le ballon sous la semelle, un plot à un mètre joue le défenseur. Tourne autour du ballon pour que ton corps reste toujours entre le plot et lui. Change de côté à chaque tour. Une minute.", score: 'Combien de tours propres en une minute', tip: 'Genoux pliés, bras écartés, tu es plus large.' },
    en: { title: 'The shield', how: 'Ball under your sole, a cone one metre away is the defender. Turn around the ball so your body always stays between the cone and the ball. Switch sides every turn. One minute.', score: 'Clean turns in one minute', tip: 'Bend your knees, spread your arms: you are wider.' },
  },
  {
    id: 'jeu-des-yeux', kind: 'yeux', skill: 'scan', lesson: 22, target: 8, unit: 'points', better: 'higher', minutes: 6, gear: ['ball', 'wall', 'partner'],
    fr: { title: 'Le jeu des yeux', how: "Le jeu inventé par BriBri et Lucas pendant le Noël du plâtre. Un parent, un frère ou une amie lève une carte de couleur derrière toi. Tu fais une passe contre le mur, tu regardes par-dessus l'épaule et tu annonces la couleur AVANT de recevoir. Dix passes.", score: 'Combien de bonnes couleurs sur 10', tip: 'Un regard court, puis les yeux reviennent sur le ballon.' },
    en: { title: 'The eyes game', how: 'The game BriBri and Lucas invented during the Christmas of the plaster cast. A parent, a brother or a friend holds up a coloured card behind you. Pass against the wall, look over your shoulder and call the colour BEFORE you receive. Ten passes.', score: 'Correct colours out of 10', tip: 'A quick look, then your eyes come back to the ball.' },
  },
  {
    id: 'scan-epaules', kind: 'yeux', skill: 'scan', lesson: 17, target: 20, unit: 'passes', better: 'higher', minutes: 5, gear: ['ball', 'wall'],
    fr: { title: 'Les deux épaules', how: "Passes contre le mur pendant deux minutes. Avant chaque réception, regarde par-dessus l'épaule gauche, puis la droite. Une passe ne compte que si tu as fait les deux regards.", score: 'Combien de passes avec deux regards en deux minutes', tip: 'Avant de recevoir, tu regardes. Toujours.' },
    en: { title: 'Both shoulders', how: 'Wall passes for two minutes. Before each reception, look over your left shoulder, then your right. A pass only counts if you did both looks.', score: 'Passes with two looks in two minutes', tip: 'Before you receive, you look. Always.' },
  },
  {
    id: 'mot-avant', kind: 'yeux', skill: 'decision', lesson: 11, target: 18, unit: 'passes', better: 'higher', minutes: 5, gear: ['ball', 'wall'],
    fr: { title: 'Décider avant', how: "Passes contre le mur. Pendant que le ballon revient, dis à voix haute « une touche » ou « contrôle », puis fais exactement ce que tu as dit. Vingt passes.", score: 'Combien de fois tu as fait ce que tu avais dit, sur 20', tip: "Petit espace, grande tête : la décision arrive avant le ballon." },
    en: { title: 'Decide early', how: 'Wall passes. While the ball comes back, say out loud "one touch" or "control", then do exactly what you said. Twenty passes.', score: 'Times you did what you said, out of 20', tip: 'Small space, big head: the decision arrives before the ball.' },
  },
  {
    id: 'mots-lacombe', kind: 'yeux', skill: 'communication', lesson: 23, target: 8, unit: 'points', better: 'higher', minutes: 6, gear: ['ball', 'wall', 'partner'],
    fr: { title: 'Les mots du 6', how: "À deux, avec un mur. L'un passe, l'autre crie un mot pendant que le ballon revient : « Seul ! » (contrôle et tourne-toi), « Homme ! » (une touche, vite) ou « Tourne ! » (contrôle orienté). Dix ballons chacun.", score: 'Combien de bonnes réactions sur 10', tip: 'Un mot court, fort, au bon moment : c\'est une passe.' },
    en: { title: 'The words of the 6', how: 'In pairs, with a wall. One passes, the other shouts a word while the ball comes back: "Time!" (control and turn), "Man on!" (one touch, quick) or "Turn!" (open first touch). Ten balls each.', score: 'Correct reactions out of 10', tip: 'A short, loud word at the right moment is a pass.' },
  },
  {
    id: 'triangle-fokou', kind: 'mur', skill: 'appels', lesson: 4, target: 24, unit: 'passes', better: 'higher', minutes: 6, gear: ['ball', 'wall', 'cones'],
    fr: { title: 'Le triangle de Tonton Fokou', how: "Pose trois plots en triangle face au mur, à cinq mètres. Une passe depuis un plot, puis deux pas pour te montrer au plot suivant avant que le ballon revienne. Deux minutes.", score: 'Combien de passes en deux minutes', tip: 'Deux pas de côté, et tu redeviens une solution.' },
    en: { title: "Tonton Fokou's triangle", how: 'Put three cones in a triangle facing the wall, five metres away. Pass from one cone, then take two steps to show yourself at the next cone before the ball comes back. Two minutes.', score: 'Passes in two minutes', tip: 'Two steps to the side and you are an option again.' },
  },
  {
    id: 'une-deux-mur', kind: 'mur', skill: 'passe', lesson: 28, target: 8, unit: 'reps', better: 'higher', minutes: 6, gear: ['ball', 'wall'],
    fr: { title: 'Le une-deux du Njangi', how: "Longe un mur en marchant vite : passe contre le mur, cours, reçois plus loin, repasse. Dix mètres sans perdre le rythme, aller et retour. Dix essais.", score: 'Combien d\'allers sans arrêter le ballon, sur 10', tip: 'Passe dans la course, pas dans les pieds.' },
    en: { title: 'The Njangi one-two', how: 'Walk fast along a wall: pass against it, run, receive further on, pass again. Ten metres without losing the rhythm, there and back. Ten tries.', score: 'Runs without stopping the ball, out of 10', tip: 'Pass into your run, not to your feet.' },
  },
  {
    id: 'slalom', kind: 'conduite', skill: 'conduite', lesson: 30, target: 20, unit: 'seconds', better: 'lower', minutes: 6, gear: ['ball', 'cones'],
    fr: { title: 'Le slalom des benskins', how: "Six plots en ligne, un mètre entre chaque. Slalom aller et retour en conduite, le ballon touche à chaque pas. Chronomètre trois essais, garde le meilleur.", score: 'Ton meilleur temps aller et retour (en secondes)', tip: 'Petites touches, utilise les deux pieds.' },
    en: { title: 'The motorbike slalom', how: 'Six cones in a line, one metre apart. Dribble the slalom there and back, a touch on every step. Time three tries and keep the best.', score: 'Your best time there and back (seconds)', tip: 'Small touches, use both feet.' },
  },
  {
    id: 'dribble-njangi', kind: 'conduite', skill: 'dribble-njangi', lesson: 29, target: 8, unit: 'reps', better: 'higher', minutes: 6, gear: ['ball', 'cones', 'wall'],
    fr: { title: 'Le dribble njangi entre deux plots', how: "Deux plots à deux mètres l'un de l'autre jouent les défenseurs. Conduis vers eux, ralentis pour les « attirer », puis passe entre eux et donne le ballon contre le mur (ton partenaire libre). Dix essais.", score: 'Combien de dribbles donnés proprement, sur 10', tip: 'Ton dribble, c\'est un cadeau : il finit par une passe.' },
    en: { title: 'The njangi dribble between two cones', how: 'Two cones two metres apart are the defenders. Dribble at them, slow down to "draw them in", then go between them and give the ball to the wall (your free teammate). Ten tries.', score: 'Dribbles finished with a clean pass, out of 10', tip: 'Your dribble is a gift: it ends with a pass.' },
  },
  {
    id: 'pausa', kind: 'conduite', skill: 'decision', lesson: 26, target: 16, unit: 'reps', better: 'higher', minutes: 6, gear: ['ball', 'cones'],
    fr: { title: "La pausa d'Avi Ramon", how: "Conduis vers un plot, arrête le ballon sous la semelle à un mètre, compte « un » dans ta tête, puis accélère sur le côté. Dix fois à droite, dix fois à gauche.", score: 'Combien de pauses suivies d\'une vraie accélération, sur 20', tip: 'Attendre une demi-seconde de plus, puis partir fort.' },
    en: { title: "Avi Ramon's pausa", how: 'Dribble towards a cone, stop the ball under your sole one metre away, count "one" in your head, then burst to the side. Ten times right, ten times left.', score: 'Pauses followed by a real burst, out of 20', tip: 'Wait half a second longer, then go hard.' },
  },
  {
    id: 'passe-porte', kind: 'finition', skill: 'passe', lesson: 5, target: 14, unit: 'reps', better: 'higher', minutes: 6, gear: ['ball', 'cones', 'space'],
    fr: { title: 'La passe qui traverse', how: "Fais une porte d'un mètre avec deux plots, à six mètres. Dix passes du pied droit, dix du pied gauche : le ballon doit traverser sans toucher les plots.", score: 'Combien de passes réussies sur 20', tip: 'Une passe qui traverse, c\'est utile. N\'aie pas peur.' },
    en: { title: 'The pass that cuts through', how: 'Make a one-metre gate with two cones, six metres away. Ten passes with your right foot, ten with your left: the ball must go through without touching the cones.', score: 'Successful passes out of 20', tip: 'A pass that cuts through is useful. Do not be afraid.' },
  },
  {
    id: 'passe-longue', kind: 'finition', skill: 'passe', lesson: 27, target: 10, unit: 'reps', better: 'higher', minutes: 8, gear: ['ball', 'cones', 'space'],
    fr: { title: 'Le renversement', how: "Si tu as de la place : une zone de quatre pas sur quatre, dessinée avec des plots, à quinze ou vingt mètres. Dix passes longues de chaque pied, le ballon doit retomber dans la zone.", score: 'Combien de ballons dans la zone sur 20', tip: 'Pied d\'appui un peu en arrière, frappe sous le ballon.' },
    en: { title: 'The switch', how: 'If you have the room: a zone four steps by four, marked with cones, fifteen to twenty metres away. Ten long passes with each foot; the ball must land in the zone.', score: 'Balls landing in the zone out of 20', tip: 'Standing foot slightly behind, strike under the ball.' },
  },
  {
    id: 'tir-cible', kind: 'finition', skill: 'decision', lesson: 40, target: 10, unit: 'points', better: 'higher', minutes: 8, gear: ['ball', 'wall', 'space'],
    fr: { title: 'Le tir dans le coin', how: "Dessine deux carrés à la craie (ou avec du ruban) dans les coins bas d'un mur. Dix tirs de chaque pied à huit mètres : un point par carré touché. Vérifie que personne ne passe derrière.", score: 'Ton nombre de points sur 20 tirs', tip: 'Un tir, c\'est une passe au filet : précise avant d\'être forte.' },
    en: { title: 'Shooting into the corner', how: 'Draw two squares in chalk (or tape) in the bottom corners of a wall. Ten shots with each foot from eight metres: one point per square hit. Check that nobody walks behind.', score: 'Your points out of 20 shots', tip: 'A shot is a pass into the net: accurate before powerful.' },
  },
  {
    id: 'sprints-recup', kind: 'physique', skill: 'contre-pression', lesson: 37, target: 6, unit: 'sprints', better: 'higher', minutes: 10, gear: ['space'],
    fr: { title: 'Six sprints, six respirations', how: "Après cinq minutes d'échauffement : un sprint de quinze mètres, puis retour en marchant, 45 secondes de récupération. Six fois. Bois de l'eau à la fin.", score: 'Combien de sprints à fond sur 6', tip: 'Le premier regard va devant, puis tu pars.' },
    en: { title: 'Six sprints, six breaths', how: 'After a five-minute warm-up: a fifteen-metre sprint, then walk back, 45 seconds of recovery. Six times. Drink water at the end.', score: 'Full-speed sprints out of 6', tip: 'First look forward, then go.' },
  },
  {
    id: 'cinq-secondes', kind: 'physique', skill: 'contre-pression', lesson: 21, target: 8, unit: 'reps', better: 'higher', minutes: 6, gear: ['ball', 'wall'],
    fr: { title: 'Les cinq secondes', how: "Lance le ballon contre le mur en biais, comme une passe ratée. Tu as cinq secondes pour le rattraper et le bloquer sous la semelle. Dix essais, marche entre chaque.", score: 'Combien de ballons repris en cinq secondes, sur 10', tip: 'La perte, c\'est le meilleur moment pour reprendre.' },
    en: { title: 'The five seconds', how: 'Throw the ball at the wall at an angle, like a bad pass. You have five seconds to win it back and stop it under your sole. Ten tries, walk between each one.', score: 'Balls won back in five seconds, out of 10', tip: 'Losing the ball is the best moment to win it back.' },
  },
  {
    id: 'appels', kind: 'physique', skill: 'appels', lesson: 15, target: 10, unit: 'reps', better: 'higher', minutes: 6, gear: ['cones', 'space'],
    fr: { title: 'Courir pour les autres', how: "Deux plots à dix mètres en diagonale. Fais deux pas vers l'arrière (le contre-appel), puis sprint vers le plot en diagonale. Retour en marchant. Dix fois.", score: 'Combien d\'appels complets sur 10', tip: 'Ta course emmène un défenseur : elle compte, même sans ballon.' },
    en: { title: 'Running for others', how: 'Two cones ten metres apart on a diagonal. Take two steps back (the check run), then sprint diagonally to the cone. Walk back. Ten times.', score: 'Complete runs out of 10', tip: 'Your run drags a defender away: it counts, even without the ball.' },
  },
  {
    id: 'sauts-ligne', kind: 'physique', skill: 'contre-pression', lesson: 35, target: 30, unit: 'touches', better: 'higher', minutes: 4, gear: [],
    fr: { title: 'La ligne du déclencheur', how: "Une ligne au sol (un bâton, une corde, une couture de terrain). Saute de chaque côté, pieds joints, le plus vite possible pendant vingt secondes. Trois essais, pause d'une minute.", score: 'Ton meilleur nombre de sauts en 20 secondes', tip: 'Petits sauts, sur l\'avant du pied, prêt à partir au signal.' },
    en: { title: 'The trigger line', how: 'A line on the ground (a stick, a rope, a pitch marking). Jump from side to side, feet together, as fast as you can for twenty seconds. Three tries, one minute rest.', score: 'Your best jump count in 20 seconds', tip: 'Small jumps on the balls of your feet, ready to go on the trigger.' },
  },
  {
    id: 'equilibre', kind: 'physique', skill: 'protection', lesson: 34, target: 30, unit: 'seconds', better: 'higher', minutes: 4, gear: [],
    fr: { title: 'Le héron', how: "Tiens en équilibre sur une jambe, l'autre genou levé, les yeux fermés. Chronomètre chaque jambe et garde le temps le plus court des deux. Ça protège tes chevilles.", score: 'Ton temps sur la jambe la plus faible (en secondes)', tip: 'Fixe un point devant toi avant de fermer les yeux.' },
    en: { title: 'The heron', how: 'Balance on one leg, the other knee up, eyes closed. Time each leg and keep the shorter time of the two. It protects your ankles.', score: 'Your time on the weaker leg (seconds)', tip: 'Look at one point ahead before you close your eyes.' },
  },
  {
    id: 'gainage', kind: 'physique', skill: 'protection', lesson: 38, target: 45, unit: 'seconds', better: 'higher', minutes: 4, gear: [],
    fr: { title: 'La planche du souffle', how: "Sur les avant-bras et la pointe des pieds, le corps droit comme une planche. Respire calmement. Deux essais, une minute de repos. Arrête si tu as mal au dos.", score: 'Ton meilleur temps (en secondes)', tip: 'Fesses serrées, regard vers le sol.' },
    en: { title: 'The breathing plank', how: 'On your forearms and toes, body straight as a plank. Breathe calmly. Two tries, one minute rest. Stop if your back hurts.', score: 'Your best time (seconds)', tip: 'Squeeze your glutes, look at the floor.' },
  },
  {
    id: 'ballon-respire', kind: 'ballon', skill: 'controle', lesson: 38, target: 3, unit: 'minutes', better: 'higher', minutes: 5, gear: ['ball'],
    fr: { title: 'Le ballon respire pour nous', how: "Pour finir ta séance : des touches douces, semelle, intérieur, extérieur, sans jamais arrêter le ballon, en respirant par le nez. Le cœur redescend, le ballon reste avec toi.", score: 'Combien de minutes sans arrêter le ballon', tip: 'Quand tu es fatigué, c\'est le ballon qui court.' },
    en: { title: 'The ball breathes for us', how: 'To finish your session: soft touches, sole, inside, outside, never stopping the ball, breathing through your nose. Your heart slows down, the ball stays with you.', score: 'Minutes without stopping the ball', tip: 'When you are tired, the ball does the running.' },
  },
]

export const CHALLENGE_KINDS: ChallengeKind[] = ['ballon', 'conduite', 'mur', 'yeux', 'finition', 'physique']

export const getChallenge = (id?: string) => CHALLENGES.find((c) => c.id === id)
export const challengeText = (c: Challenge, lang: Lang) => (lang === 'en' ? c.en : c.fr)
export const challengesForLesson = (no: number) => CHALLENGES.filter((c) => c.lesson === no)

/* ---------- daily challenges (deterministic by date) ---------- */

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

const DAILY_GROUPS: ChallengeKind[][] = [['ballon', 'conduite'], ['mur', 'yeux', 'finition'], ['physique']]

/** Three challenges for the day: ball mastery, wall or eyes, and one for the legs. Same for everyone on the same date. */
export function dailyChallenges(date: string): Challenge[] {
  const h = hash('njangi:' + date)
  return DAILY_GROUPS.map((kinds, i) => {
    const pool = CHALLENGES.filter((c) => kinds.includes(c.kind))
    return pool[(h + i * 7919) % pool.length]
  })
}

/* ---------- XP, levels, streak ---------- */

export const XP_DONE = 10
export const XP_TARGET = 10
export const XP_DAILY = 5

/** Level thresholds; names are in i18n player:levels.N (the journey of the novel). */
export const LEVELS = [0, 100, 250, 450, 700, 1000, 1400, 2000]

export const reached = (c: Challenge, value: number) => (c.better === 'lower' ? value > 0 && value <= c.target : value >= c.target)
const better = (c: Challenge, a: number, b: number) => (c.better === 'lower' ? Math.min(a, b) : Math.max(a, b))

/** XP a new log adds, given today's previous best for that challenge (undefined if none yet). */
export function xpGain(c: Challenge, prevBest: number | undefined, value: number, daily: boolean) {
  const hitNow = reached(c, value)
  if (prevBest === undefined) return XP_DONE + (daily ? XP_DAILY : 0) + (hitNow ? XP_TARGET : 0)
  return hitNow && !reached(c, prevBest) ? XP_TARGET : 0
}

/** Best value logged today for each challenge. */
export function todayBests(logs: ChallengeLog[], today: string) {
  const out: Record<string, number> = {}
  for (const l of logs) {
    if (l.date !== today) continue
    const c = getChallenge(l.challengeId)
    if (!c) continue
    out[l.challengeId] = out[l.challengeId] === undefined ? l.value : better(c, out[l.challengeId], l.value)
  }
  return out
}

export interface DayResult { challengeId: string; date: string; best: number; xp: number; hit: boolean; daily: boolean }

export interface Progress {
  xp: number
  level: number // index in LEVELS
  levelMin: number
  nextMin: number | null
  results: DayResult[] // one per challenge per day, newest first
  xpByDay: Record<string, number>
  bests: Record<string, number>
  streak: number
  streakToday: boolean // today already counts
  activeDays: number
  hits: number
}

export function computeProgress(logs: ChallengeLog[], today: string): Progress {
  const groups = new Map<string, { c: Challenge; date: string; best: number }>()
  for (const l of logs) {
    const c = getChallenge(l.challengeId)
    if (!c) continue
    const k = l.challengeId + '|' + l.date
    const g = groups.get(k)
    if (g) g.best = better(c, g.best, l.value)
    else groups.set(k, { c, date: l.date, best: l.value })
  }
  const results: DayResult[] = []
  const xpByDay: Record<string, number> = {}
  const bests: Record<string, number> = {}
  const dailyCache = new Map<string, string[]>()
  for (const { c, date, best } of groups.values()) {
    if (!dailyCache.has(date)) dailyCache.set(date, dailyChallenges(date).map((d) => d.id))
    const daily = dailyCache.get(date)!.includes(c.id)
    const hit = reached(c, best)
    const xp = XP_DONE + (hit ? XP_TARGET : 0) + (daily ? XP_DAILY : 0)
    results.push({ challengeId: c.id, date, best, xp, hit, daily })
    xpByDay[date] = (xpByDay[date] || 0) + xp
    bests[c.id] = bests[c.id] === undefined ? best : better(c, bests[c.id], best)
  }
  results.sort((a, b) => b.date.localeCompare(a.date))
  const xp = results.reduce((s, r) => s + r.xp, 0)
  let level = 0
  LEVELS.forEach((min, i) => { if (xp >= min) level = i })
  const days = new Set(Object.keys(xpByDay))
  const streakToday = days.has(today)
  let cur = streakToday ? today : addDays(today, -1)
  let streak = 0
  while (days.has(cur)) { streak++; cur = addDays(cur, -1) }
  return {
    xp, level, levelMin: LEVELS[level], nextMin: LEVELS[level + 1] ?? null, results, xpByDay, bests,
    streak, streakToday, activeDays: days.size, hits: results.filter((r) => r.hit).length,
  }
}
