---
numero: 19
slug: mesurer-la-possession
titre: Mesurer la possession avec intention
partie: 6
titrePartie: L'analyse
resume: Pourquoi le pourcentage de possession ment, les indicateurs qui disent la vérité, et l'Indice Njangi : cinq sous-indices de 0 à 20 points, calculés en direct à partir de quatorze codes simples.
---

À la mi-temps, le tableau affiche 64 % de possession. Dans la tribune, un dirigeant se tourne vers le directeur technique avec un sourire : « On les domine. » Sur le terrain, pourtant, l'équipe n'a pas tiré une seule fois. Elle a fait circuler le ballon entre ses deux centraux et son pivot, de gauche à droite puis de droite à gauche, devant un bloc adverse qui n'a jamais eu à reculer. L'adversaire a eu le ballon un tiers du temps, et il s'est créé les deux meilleures occasions du match.

Le chiffre de possession n'y est pas faux : il est muet. Il dit combien de temps nous avons tenu la caisse, pas ce que nous en avons fait. Or on ne juge pas un njangi au temps que l'argent passe entre les mains, mais à ce qu'il permet de construire.

Comment savoir, chiffres à l'appui, si une équipe a possédé avec intention ? Ce chapitre présente les indicateurs utiles, puis définit l'**Indice Njangi**, un score de 0 à 100 que l'application calcule en direct à partir de quatorze codes. Les formules sont données en entier : un indicateur que personne ne peut recalculer à la main n'est pas un outil, c'est une boîte noire.

## Pourquoi le pourcentage de possession ment

Le pourcentage de possession a trois défauts. D'abord, il mélange toutes les intentions : une passe en retrait vers le gardien, sans pression, compte autant qu'une passe qui casse deux lignes. Ensuite, il dépend de l'adversaire : une équipe qui choisit de défendre bas nous « donne » le ballon, et 65 % contre un bloc bas ne valent pas 55 % contre un pressing haut. Enfin, il ignore la fin de l'action : une possession qui s'achève par une perte dangereuse dans notre moitié compte comme une possession qui s'achève par un tir.

Il ne faut pas pour autant le jeter. Garder le ballon sert l'intention Respirer, et sous la chaleur de l'après-midi c'est parfois l'intention la plus intelligente. Mais la possession est un moyen. La question que l'on pose au joueur, « Que prépare ta passe ? », l'analyste la pose aux chiffres : que prépare cette possession ?

## Les indicateurs utiles

Voici les indicateurs que le Njangi retient. Chacun a une définition courte, pour que deux personnes qui regardent le même match comptent la même chose.

| Indicateur | Ce qu'on compte | Ce qu'il dit |
|---|---|---|
| Passes progressives | Passes ou conduites qui rapprochent le ballon d'au moins 10 m du but adverse | L'équipe avance-t-elle ? |
| Lignes traversées | Ballon qui dépasse une ligne d'au moins deux adversaires et qu'un partenaire contrôle derrière | L'équipe casse-t-elle le bloc ? |
| Entrées dans le dernier tiers et dans la surface | Ballon contrôlé dans les 35 derniers mètres, puis dans la surface | L'équipe arrive-t-elle ? |
| Séquences de 10 passes et plus finies dans le dernier tiers | Possessions longues qui aboutissent | La patience a-t-elle un but ? |
| Field tilt | Part des entrées dans le dernier tiers qui sont les nôtres | Le terrain penche-t-il de notre côté ? |
| Récupérations en 5 secondes | Ballons repris dans les 5 secondes qui suivent la perte | Le réflexe Reprendre existe-t-il ? |
| Hauteur des récupérations | Zone où l'on reprend le ballon | Récupère-t-on dans des zones utiles ? |
| PPDA | Passes adverses permises avant une action défensive | Le pressing est-il intense ? |
| Tirs dans la zone de finition | Tirs pris dans l'axe de la surface, à hauteur du point de penalty environ | Finit-on dans de bonnes conditions ? |

Deux notions demandent une explication. Le **PPDA** (passes par action défensive) compte le nombre de passes que l'adversaire réussit dans sa propre partie du terrain avant que nous fassions un tacle, une interception ou une faute. Plus il est bas, plus le pressing est rapide et serré. Il se calcule à la vidéo, après le match.

Les **buts attendus** (en anglais **xG**) donnent à chaque tir une probabilité de devenir un but, estimée à partir de nombreux tirs semblables (distance, angle, pied ou tête, pression). L'idée est simple : deux tirs à six mètres valent plus que dix frappes de trente mètres. Sans logiciel spécialisé, l'analyste Njangi en garde l'esprit en comptant les tirs dans la zone de finition et les tirs cadrés.

> [!ANALYSTE] Définir avant de compter
> Un indicateur sans définition écrite ne vaut rien : chacun compte à sa façon et les chiffres ne se comparent plus. Avant la saison, le staff valide par écrit les définitions de ce chapitre. Puis deux personnes codent les mêmes 15 minutes de match, séparément, et comparent. Tant qu'elles diffèrent de plus d'une action sur dix, on reprend les définitions ensemble.

## L'Indice Njangi

L'Indice Njangi additionne cinq **sous-indices**, chacun noté de 0 à 20 points. Chacun répond à une question.

- **Progression** : allons-nous vers l'avant ?
- **Pénétration** : arrivons-nous dans les zones où l'on marque ?
- **Fixation** : créons-nous la supériorité avant d'attaquer ?
- **Reprise** : reprenons-nous le ballon tout de suite après l'avoir perdu ?
- **Contrôle** : gardons-nous le ballon sans offrir de pertes dangereuses ?

Chaque sous-indice suit la même logique. On calcule un rapport simple à partir des codes, on le compare à une **valeur de référence**, et l'équipe qui atteint la référence obtient 20 points. Entre zéro et la référence, l'échelle est linéaire : la moitié de la référence donne 10 points. Au-delà, on reste à 20. Ce **plafond** a une raison : il empêche une équipe d'acheter tout l'indice avec une seule qualité.

### Les quatorze codes

Ce sont les boutons du codeur en direct de l'application. Chaque code compte une fois par action.

| Code | Ce qu'on code | Règle |
|---|---|---|
| PASS_OK | Passe réussie | Toute passe qui arrive à un partenaire |
| PASS_LOST | Passe perdue | Passe interceptée, trop longue, sortie en touche |
| PROG | Passe ou conduite progressive | Au moins 10 m vers le but adverse ; s'ajoute au PASS_OK quand c'est une passe |
| LINE | Ligne traversée | Remplace PROG quand le ballon dépasse une ligne d'au moins deux adversaires (jamais les deux codes pour la même action) |
| FINAL3 | Entrée dans le dernier tiers | Ballon contrôlé dans les 35 derniers mètres, une fois par entrée |
| BOX | Entrée dans la surface | Ballon contrôlé dans la surface adverse, par passe reçue ou en conduite |
| FIX2 | Dribble ou conduite qui fixe deux adversaires | Deux adversaires attirés, et le ballon reste à nous |
| SWITCH | Renversement après fixation | Le ballon change de côté après que le bloc a été attiré ; s'ajoute au PASS_OK |
| LOSS | Perte de balle | Toute perte qui n'est pas une passe : duel, dribble, contrôle manqué |
| REGAIN5 | Récupération en 5 secondes | Ballon repris dans les 5 secondes qui suivent un PASS_LOST ou un LOSS |
| REGAIN | Autre récupération | Interception, tacle, arrêt du gardien, ballon rendu par l'adversaire |
| SHOT | Tir | Tout tir, même contré |
| SHOT_IN | Tir cadré | Tir qui oblige le gardien à intervenir ou qui entre ; s'ajoute au SHOT |
| GOAL | But | S'ajoute au SHOT et au SHOT_IN |

À partir de ces codes, on calcule quatre totaux de base. Les **passes tentées** : PASSES = PASS_OK + PASS_LOST. Les **pertes** : PERTES = PASS_LOST + LOSS. Les **possessions**, estimées : POSS = PASS_LOST + LOSS + SHOT, parce qu'une possession se termine presque toujours par une perte ou par un tir. Les **actions de possession** : ACTIONS = PASS_OK + PASS_LOST + LOSS.

```schema
{
  "view": "full",
  "players": [
    {"id": "c", "team": "a", "x": 28, "y": 42, "label": "4"},
    {"id": "m", "team": "a", "x": 50, "y": 34, "label": "8"},
    {"id": "w", "team": "a", "x": 76, "y": 9, "label": "7"},
    {"id": "s", "team": "a", "x": 84, "y": 40, "label": "9"},
    {"id": "b1", "team": "b", "x": 40, "y": 27},
    {"id": "b2", "team": "b", "x": 41, "y": 46},
    {"id": "b3", "team": "b", "x": 61, "y": 17},
    {"id": "b4", "team": "b", "x": 64, "y": 42},
    {"id": "b5", "team": "b", "x": 90, "y": 30},
    {"id": "b6", "team": "b", "x": 91, "y": 44},
    {"id": "g", "team": "gkb", "x": 103, "y": 34}
  ],
  "ball": "c",
  "arrows": [
    {"from": "c", "to": "m", "kind": "pass", "n": 1},
    {"from": "m", "to": [60, 32], "kind": "dribble", "n": 2},
    {"from": [60, 32], "to": "w", "kind": "pass", "n": 3},
    {"from": "w", "to": [92, 18], "kind": "dribble", "n": 4}
  ],
  "zones": [{"x": 70, "y": 0, "w": 35, "h": 68, "label": "dernier tiers", "tone": "a"}],
  "labels": [
    {"x": 33, "y": 52, "text": "1 LINE"},
    {"x": 54, "y": 27, "text": "2 PROG"},
    {"x": 81, "y": 25, "text": "3 FINAL3"},
    {"x": 92, "y": 11, "text": "4 BOX"}
  ]
}
```

## Les cinq sous-indices

### Progression

**Progression = 20 × (PROG + LINE) / (0,35 × PASSES), plafonné à 20.**

On compte les actions qui font avancer le ballon, rapportées au nombre de passes tentées. La référence est de 35 actions progressives pour 100 passes : une équipe qui l'atteint obtient 20 points, une équipe qui en fait 17 ou 18 pour 100 passes en obtient 10. Le dénominateur est le nombre de passes parce qu'une équipe qui passe beaucoup doit aussi avancer beaucoup. Une équipe qui joue 500 passes et n'en joue que 50 vers l'avant a fait tourner la caisse sans but.

### Pénétration

**Pénétration = 20 × (FINAL3 + 2 × BOX) / POSS, plafonné à 20.**

On compte les arrivées dans les zones de finition, par possession. L'entrée dans la surface compte double, parce que c'est là que naissent la plupart des buts. La référence vaut 1 : sur 10 possessions, par exemple, 6 entrées dans le dernier tiers et 2 entrées dans la surface donnent 6 + 2 × 2 = 10, soit 20 points.

### Fixation

**Fixation = 20 × (FIX2 + SWITCH) / (0,25 × POSS), plafonné à 20.**

On compte les actions qui attirent l'adversaire pour créer l'avantage ailleurs : le dribble njangi qui fixe deux joueurs puis donne, et le renversement qui punit le bloc attiré. La référence est d'une action de fixation toutes les quatre possessions. C'est l'intention la plus invisible dans les statistiques habituelles, et c'est pour cela que le Njangi la compte. Un FIX2 ne se code que si le ballon reste à nous : fixer, c'est attirer puis donner.

### Reprise

**Reprise = 20 × REGAIN5 / (0,40 × PERTES), plafonné à 20.**

On compte les ballons repris dans les 5 secondes, rapportés à toutes les pertes. La référence est de 4 pertes sur 10 reprises dans les 5 secondes. Ce sous-indice mesure le réflexe Reprendre et, derrière lui, la qualité de la défense de repos : on ne reprend vite que si l'on était bien placé avant de perdre. Le codeur compte à voix basse, dès la perte : « un, deux, trois, quatre, cinq ».

### Contrôle

**Contrôle = 20 × (K - 0,55) / 0,30, borné entre 0 et 20, avec K = PASS_OK / ACTIONS.**

K est le **taux de conservation** : la part de nos actions de possession qui gardent le ballon. À 55 %, l'équipe ne possède pas vraiment et marque 0 point ; à 70 %, elle marque 10 points ; à 85 % et plus, 20 points. Les pertes en conduite et en duel (LOSS) entrent au dénominateur sans aucune passe réussie en face : ce sont souvent les pertes les plus dangereuses, celles qui surprennent l'équipe en plein mouvement. Ce sous-indice récompense donc la possession utile et les pertes dangereuses évitées.

### Le total et sa lecture

L'Indice Njangi est la somme des cinq sous-indices. Chaque sous-indice est arrondi au dixième, puis on additionne : le total va de 0 à 100. Si un dénominateur vaut zéro (aucune passe, aucune perte), le sous-indice vaut 0. Voici la grille de lecture que l'application affiche.

| Indice | Lecture |
|---|---|
| Moins de 35 | Possession sans intention |
| 35 à moins de 50 | Intention fragile |
| 50 à moins de 65 | Njangi en construction |
| 65 à moins de 80 | Njangi solide |
| 80 et plus | Njangi de champion |

Pour ceux qui travaillent sur tableur ou qui programment, voici les mêmes formules, à l'identique de l'application :

```
PASSES  = PASS_OK + PASS_LOST
PERTES  = PASS_LOST + LOSS
POSS    = PASS_LOST + LOSS + SHOT
ACTIONS = PASS_OK + PASS_LOST + LOSS
Progression = min(20, 20 * (PROG + LINE) / (0.35 * PASSES))
Penetration = min(20, 20 * (FINAL3 + 2 * BOX) / (1.00 * POSS))
Fixation    = min(20, 20 * (FIX2 + SWITCH) / (0.25 * POSS))
Reprise     = min(20, 20 * REGAIN5 / (0.40 * PERTES))
Controle    = max(0, min(20, 20 * (PASS_OK / ACTIONS - 0.55) / 0.30))
Indice      = somme des cinq, chacun arrondi au dixieme
```

## Un exemple chiffré

Prenons un match complet d'une équipe senior. Le codeur a relevé : PASS_OK 300, PASS_LOST 80, PROG 50, LINE 30, FINAL3 42, BOX 15, FIX2 12, SWITCH 9, LOSS 30, REGAIN5 33, REGAIN 40, SHOT 10, SHOT_IN 4, GOAL 1. Les totaux de base sont PASSES = 380, PERTES = 110, POSS = 120 et ACTIONS = 410.

| Sous-indice | Calcul | Points |
|---|---|---|
| Progression | 20 × 80 / (0,35 × 380) = 1 600 / 133 | 12,0 |
| Pénétration | 20 × (42 + 30) / 120 = 1 440 / 120 | 12,0 |
| Fixation | 20 × 21 / (0,25 × 120) = 420 / 30 | 14,0 |
| Reprise | 20 × 33 / (0,40 × 110) = 660 / 44 | 15,0 |
| Contrôle | K = 300 / 410 = 0,732 ; 20 × 0,182 / 0,30 | 12,1 |
| Indice Njangi | 12,0 + 12,0 + 14,0 + 15,0 + 12,1 | 65,1 |

Lecture : un Njangi solide, de justesse. L'équipe reprend bien le ballon et fixe correctement, mais elle avance et arrive trop peu au regard du ballon qu'elle a. La semaine suivante portera sur la Progression et la Pénétration, par exemple avec [[S07]], [[L02]] et [[F03]].

## Part de possession et field tilt, avec les mêmes codes

Si un second codeur (ou le même, en mode adversaire) relève aussi les PASS_OK, PASS_LOST et FINAL3 de l'adversaire, deux indicateurs de plus tombent sans effort.

La **part de possession estimée** vaut nos PASSES divisées par la somme de nos PASSES et des leurs. Le **field tilt** vaut nos FINAL3 divisés par la somme de nos FINAL3 et des leurs. Dans l'exemple, l'adversaire a tenté 267 passes et réussi 28 entrées dans le dernier tiers : notre part de possession estimée est de 380 / 647, soit 58,7 %, et notre field tilt de 42 / 70, soit 60 %. Ce sont des approximations : la première compte des passes, pas du temps. Elles restent hors de l'Indice, qui mesure ce que nous faisons du ballon, pas combien de temps nous le gardons.

> [!NJANGI] Une caisse qui circule doit servir
> L'Indice Njangi ne récompense pas le temps passé avec le ballon. Il récompense ce que la circulation prépare : avancer, arriver, fixer, reprendre, conserver sans danger. Une équipe peut avoir 40 % de possession et un Indice de 70.

## Calibrer les repères et s'en servir

Les valeurs de référence (0,35 ; 1 ; 0,25 ; 0,40 ; 55 à 85 %) sont des repères internes au Njangi. Ce ne sont pas des moyennes mesurées dans le football mondial : ce sont des objectifs construits pour qu'une équipe qui applique bien le modèle se situe autour de 13 à 17 points par sous-indice. Calibrez-les sur vos propres matchs. Codez 5 à 10 matchs, calculez vos rapports bruts, et regardez où vous êtes. Une sélection U15 sera plus basse qu'une équipe A, et c'est normal. Une seule règle : ne changez jamais les repères en cours de saison, sinon plus rien ne se compare.

Comparez d'abord une équipe à elle-même, mi-temps après mi-temps et match après match ; un Indice calculé sur 10 minutes est trop instable pour conclure. Quand un sous-indice reste faible, entraînez-le :

| Sous-indice faible | Exercices de référence |
|---|---|
| Progression | [[P05]], [[S07]], [[L02]], [[R06]] |
| Pénétration | [[F03]], [[F05]], [[G05]], [[G01]] |
| Fixation | [[R02]], [[S04]], [[P07]], [[F04]] |
| Reprise | [[R08]], [[T01]], [[T03]], [[F06]] |
| Contrôle | [[R01]], [[R07]], [[P01]], [[P10]] |

> [!ATTENTION] Ne pas jouer pour l'indice
> Dès qu'un chiffre devient un objectif, certains joueurs le fabriquent : des conduites inutiles pour gagner des FIX2, des passes forcées pour gagner des LINE. C'est pour cela que les sous-indices s'équilibrent : forcer la Progression fait chuter le Contrôle. Dites aux joueurs ce que l'on mesure, jamais comment on gagne des points.

> [!JEUNES] Un outil d'équipe, pas un classement d'enfants
> Chez les jeunes, l'Indice mesure l'équipe, jamais un enfant. Ne publiez pas de score individuel, ne comparez pas un joueur à un autre devant le groupe. Avant les U13, gardez l'Indice pour le staff. Et rappelez-vous que le meilleur match du monde ne vaut pas une séance sous la chaleur sans eau ni pause.
