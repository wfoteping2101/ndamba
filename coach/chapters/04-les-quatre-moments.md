---
numero: 4
slug: les-quatre-moments
titre: Les quatre moments et la règle d'or
partie: 2
titrePartie: Le modèle de jeu Njangi
resume: La possession, la transition défensive, la défense et la transition offensive s'enchaînent sans arrêt. La règle d'or les relie, six principes généraux les organisent, et la chaîne du modèle les transforme en comportements que l'on voit, que l'on entraîne et que l'on mesure.
---

Un match de U17, à Abidjan. Notre équipe attaque depuis 2 minutes. Le ballon a circulé, l'intérieur droit reçoit dans le demi-espace, tente la passe vers l'attaquant et la passe est coupée. En une seconde, deux scènes se jouent sur le même terrain. Près du ballon, trois de nos joueurs se jettent sur le porteur adverse, l'enferment contre la ligne et récupèrent le ballon avant qu'il ait levé la tête. Mais à l'autre bout, notre latéral gauche, monté très haut pendant l'attaque, marche encore les mains sur les hanches. Il pense toujours à l'attaque qui vient de finir.

Ce jour-là, la récupération a sauvé l'équipe. Une autre fois, l'adversaire aurait trouvé l'espace laissé par le latéral, et le match aurait basculé.

Le football passe d'un moment à l'autre, souvent plusieurs fois par minute, et une équipe vaut d'abord par sa capacité à changer de moment tous ensemble. Ce chapitre décrit les quatre moments du jeu, la règle d'or qui les relie, les principes qui les organisent, et la manière d'en faire des comportements visibles sur un terrain.

## Les quatre moments du jeu

Le Njangi découpe le match en quatre moments. Ce ne sont pas quatre phases séparées par un coup de sifflet : ce sont quatre états du jeu, qui se succèdent dans un ordre presque toujours le même.

**La possession** : nous avons le ballon et l'adversaire est organisé pour défendre. C'est le moment des cinq intentions : Sortir, Progresser, Fixer, Finir, Respirer. Chaque passe, chaque conduite, chaque appel sert l'une d'elles (chapitre 5).

**La transition défensive** : nous venons de perdre le ballon. Pendant quelques secondes, l'adversaire n'est pas encore organisé pour attaquer, et nous ne sommes pas encore organisés pour défendre. C'est le moment du premier réflexe sans ballon, **Reprendre** : les 5 secondes de contre-pression après la perte, avec une défense de repos en place.

**La défense** (organisée) : l'adversaire a le ballon et il est organisé. Nous aussi. C'est le moment du bloc, de la compacité et des déclencheurs du pressing. Dans le Njangi, défendre n'a qu'un but : récupérer le ballon dans une zone utile (chapitre 8).

**La transition offensive** : nous venons de récupérer le ballon. Pendant quelques secondes, l'adversaire est désorganisé, ses joueurs sont tournés vers notre but et son bloc est ouvert. C'est le moment du second réflexe, **Regarder devant** : après la récupération, le premier regard va vers la profondeur.

> [!NJANGI] La règle d'or
> « Le ballon doit voyager. Mais il doit savoir où il va. »
> Elle vaut dans les quatre moments : en possession, le ballon sert une intention ; à la perte, on le reprend tout de suite ; en défense, on le récupère là où il sera utile ; à la récupération, on regarde d'abord où il peut aller le plus loin.

## Comment les moments s'enchaînent

Le cycle a deux portes de sortie : la perte et la récupération. Tout le reste en découle.

| Nous sommes en | L'événement | Nous passons en | Le réflexe Njangi |
|---|---|---|---|
| Possession | Nous perdons le ballon | Transition défensive | Reprendre : contre-pression pendant 5 secondes |
| Transition défensive | Nous reprenons le ballon dans les 5 secondes | Transition offensive | Regarder devant, contre un adversaire encore ouvert |
| Transition défensive | Nous ne l'avons pas repris | Défense | Replier, fermer l'axe, reformer le bloc |
| Défense | Nous récupérons le ballon | Transition offensive | Regarder devant |
| Transition offensive | La profondeur est fermée, l'adversaire s'est replacé | Possession | Sécuriser, puis Sortir, Fixer ou Respirer |
| Transition offensive | Nous perdons le ballon | Transition défensive | Reprendre |

Deux idées se dégagent de ce tableau.

La première : **chaque moment prépare le suivant**. En possession, on prépare déjà la perte, en laissant derrière le ballon une défense de repos placée pour Reprendre. En défense, on prépare déjà la récupération, en gardant un ou deux joueurs prêts à recevoir pour Regarder devant. Une équipe qui attend la perte pour penser à défendre, ou la récupération pour penser à attaquer, a toujours une seconde de retard.

La seconde : **les transitions sont courtes et décisives**. Elles durent quelques secondes, mais beaucoup de buts naissent dans ces secondes-là, parce que l'adversaire y est désorganisé. Gagner les transitions, c'est jouer contre un adversaire en désordre ; les perdre, c'est défendre soi-même en désordre.

### La perte : Reprendre

```schema
{
  "view": "half",
  "players": [
    {"id": "a4", "team": "a", "x": 7, "y": 27, "label": "4"},
    {"id": "a5", "team": "a", "x": 7, "y": 43, "label": "5"},
    {"id": "a2", "team": "a", "x": 11, "y": 57, "label": "2"},
    {"id": "a6", "team": "a", "x": 19, "y": 38, "label": "6"},
    {"id": "a3", "team": "a", "x": 19, "y": 26, "label": "3"},
    {"id": "a8", "team": "a", "x": 35, "y": 49, "label": "8"},
    {"id": "a7", "team": "a", "x": 45, "y": 63, "label": "7"},
    {"id": "a9", "team": "a", "x": 45, "y": 39, "label": "9"},
    {"id": "b1", "team": "b", "x": 40, "y": 55},
    {"id": "b2", "team": "b", "x": 3, "y": 35},
    {"id": "b3", "team": "b", "x": 12, "y": 14}
  ],
  "ball": "b1",
  "arrows": [
    {"from": "a8", "to": [38.5, 53], "kind": "press", "n": 1},
    {"from": "a7", "to": [42, 58.5], "kind": "press", "n": 1},
    {"from": "a9", "to": [41, 49], "kind": "press", "n": 2}
  ],
  "zones": [
    {"x": 1, "y": 20, "w": 23, "h": 42, "tone": "a", "label": "défense de repos"},
    {"x": 31, "y": 45, "w": 18, "h": 22, "tone": "b", "label": "5 secondes"}
  ]
}
```

L'intérieur (8) vient de perdre le ballon dans le demi-espace droit. Les deux joueurs les plus proches, l'intérieur lui-même et l'ailier (7), sautent immédiatement sur le porteur (1) ; l'attaquant point d'appui (9) ferme la passe vers l'intérieur du jeu (2). Derrière, la défense de repos était déjà en place pendant l'attaque : trois joueurs (4, 5, 2) et deux milieux (6 et le latéral 3, rentré à côté du pivot) surveillent les deux attaquants adverses restés haut. Si le ballon est repris, nous attaquons un adversaire encore ouvert. S'il ne l'est pas après 5 secondes, l'équipe se replie et reforme son bloc.

### La récupération : Regarder devant

```schema
{
  "view": "full",
  "players": [
    {"id": "a6", "team": "a", "x": 45, "y": 36, "label": "6"},
    {"id": "a8", "team": "a", "x": 52, "y": 48, "label": "8"},
    {"id": "a9", "team": "a", "x": 66, "y": 33, "label": "9"},
    {"id": "a11", "team": "a", "x": 60, "y": 11, "label": "11"},
    {"id": "a7", "team": "a", "x": 60, "y": 60, "label": "7"},
    {"id": "b1", "team": "b", "x": 41, "y": 40},
    {"id": "b5", "team": "b", "x": 38, "y": 9},
    {"id": "b2", "team": "b", "x": 55, "y": 24},
    {"id": "b3", "team": "b", "x": 73, "y": 28},
    {"id": "b4", "team": "b", "x": 74, "y": 45},
    {"id": "gb", "team": "gkb", "x": 101, "y": 34}
  ],
  "ball": "a6",
  "arrows": [
    {"from": "a11", "to": [83, 15], "kind": "run", "n": 1},
    {"from": "a6", "to": [81, 17], "kind": "pass", "n": 2},
    {"from": "a9", "to": [88, 40], "kind": "run", "n": 3}
  ],
  "zones": [{"x": 77, "y": 6, "w": 17, "h": 22, "tone": "n", "label": "la profondeur"}]
}
```

Le pivot (6) intercepte une passe adverse au milieu du terrain. L'adversaire attaquait : ses latéraux sont hauts, ses centraux sont seuls. Avant même de contrôler, le pivot a regardé devant. L'ailier gauche (11) attaque déjà l'espace dans le dos du latéral adverse, monté très haut (1) ; la première passe va dans cet espace (2) ; l'attaquant point d'appui (9) attaque le second poteau (3). Si la profondeur avait été fermée, le pivot aurait sécurisé le ballon vers l'intérieur (8), et l'équipe serait entrée en possession pour Sortir ou Respirer.

## « Une équipe, une idée »

La scène d'Abidjan montre le vrai danger : ce n'est pas l'adversaire, c'est le **décalage de moment**, c'est-à-dire l'instant où une partie de l'équipe vit déjà le moment suivant tandis qu'une autre vit encore le précédent. Trois joueurs sont en transition défensive, un quatrième est resté en possession dans sa tête. Le trou qu'il laisse vaut une occasion pour l'adversaire.

Le principe « une équipe, une idée » a donc deux sens. Dans le match, les 11 joueurs changent de moment ensemble, au même signal : la perte ou la récupération. Dans la fédération, toutes les équipes, des U13 à l'équipe A, vivent les quatre moments avec les mêmes réflexes et les mêmes mots. Le second sens rend le premier possible : un joueur qui a vécu ces réflexes pendant 10 ans n'a plus besoin d'y penser.

Pour aider les joueurs à changer de moment ensemble, le Njangi utilise des mots courts, les mêmes dans toutes les catégories, que l'on peut crier par-dessus le bruit d'un stade :

| Moment | Le mot du terrain | Qui le dit |
|---|---|---|
| Possession | Le nom de l'intention : « Fixe ! », « Respire ! », « Sors ! » | Le pivot, le gardien, l'entraîneur |
| Transition défensive | « Reprends ! » | Le joueur qui a perdu le ballon, puis ses voisins |
| Défense | « Bloc ! » | Le gardien, les centraux |
| Transition offensive | « Devant ! » | Le joueur qui récupère, et celui qui voit l'espace |

L'exercice de référence pour ce principe est [[L04]], « Une équipe, une idée » : un 11 contre 11 à thème où l'entraîneur fixe deux règles du modèle et récompense par des points bonus les comportements des quatre moments. Pour travailler l'enchaînement sans temps mort, [[T03]] fait vivre les transitions en série, et [[T06]] oblige l'équipe qui attaquait à défendre aussitôt avec sa défense de repos.

> [!JEUNES] Raconter les quatre moments aux enfants
> Avec les plus jeunes, quatre phrases suffisent : « On l'a. On l'a perdu. Ils l'ont. On l'a repris. » Pour chacune, une seule consigne : passe pour aller quelque part, reprends-le tout de suite, ferme le chemin du but, regarde devant.
> Séances courtes, pauses pour boire, jamais de reproche crié à un enfant qui a perdu le ballon : la perte est le début d'un nouveau moment, pas une faute.

## Les six principes généraux

Les quatre moments disent quand l'équipe change de comportement. Les principes généraux disent comment elle occupe le terrain pour réussir chaque moment. Le Njangi en retient six, et pour chacun, ce qui compte est ce que l'on voit.

**La largeur.** En possession, l'équipe étire le bloc adverse en occupant les deux couloirs extérieurs, en général avec les ailiers de largeur ou les latéraux extérieurs. Plus le bloc est large, plus les espaces entre ses joueurs s'ouvrent. On voit : un joueur près de chaque ligne de touche quand l'équipe est installée dans le camp adverse. En défense, c'est l'inverse : on resserre, on ferme l'axe et on laisse les côtés, moins dangereux. [[L05]] l'entraîne.

**La profondeur.** En possession, au moins un joueur menace l'espace dans le dos de la dernière ligne adverse, ce qui oblige cette ligne à reculer et agrandit l'espace entre les lignes. Il faut aussi de la profondeur derrière le ballon : un partenaire disponible en soutien. On voit : des appels dans le dos, même quand le ballon ne vient pas. En défense, la profondeur devient la couverture : un joueur derrière celui qui presse.

**L'occupation rationnelle de l'espace.** Chaque joueur occupe un espace qui sert l'équipe, et deux joueurs ne se marchent pas dessus. La règle de référence, détaillée au chapitre 6, est : jamais deux joueurs dans le même couloir sur la même ligne. On voit : des triangles et des losanges autour du ballon, un porteur qui a toujours au moins deux solutions de passe à des hauteurs différentes.

**La supériorité.** L'équipe cherche à être plus forte que l'adversaire là où se trouve le ballon, ou là où il va aller. Cette supériorité peut être numérique (un joueur de plus), de position (un joueur placé entre deux lignes, que personne ne peut marquer sans libérer un autre) ou de qualité (notre meilleur dribbleur face à un défenseur plus lent). On voit : un joueur libre près du ballon, ou un un contre un recherché sur le côté. [[P08]] fait nommer les trois.

**La vitesse de circulation.** Le ballon doit aller plus vite que le bloc adverse ne se déplace. Cela dépend moins de la vitesse des joueurs que de la technique : passes tendues, au sol, sur le bon pied, en une ou deux touches sous pression. Le Njangi y ajoute le changement de rythme : circuler patiemment pour fixer, puis accélérer d'un coup quand la ligne s'ouvre. [[P09]], « Lent, lent, VITE », l'entraîne.

**La sécurité.** Une équipe qui attaque doit pouvoir perdre le ballon sans en mourir. Cela passe par la défense de repos et par des passes qui évitent l'axe dans son propre tiers quand la pression est forte. On voit : cinq joueurs derrière le ballon pendant l'attaque placée, souvent en 3 + 2, placés pour Reprendre. [[F06]] l'entraîne.

> [!AFRIQUE] La chaleur, les terrains et les transitions
> Sous la chaleur et l'humidité, chaque transition coûte cher en énergie. Une équipe qui perd souvent le ballon s'épuise, même si elle le reprend vite. Respirer en possession réduit le nombre de transitions subies, et c'est souvent l'intention qui manque en fin de match.
> Sur une terre bosselée ou un synthétique usé, les mauvais rebonds rendent les pertes plus fréquentes. La défense de repos et les 5 secondes de Reprendre y sont encore plus importantes que sur une pelouse parfaite.

## Du modèle aux comportements : la chaîne du modèle

Un modèle de jeu n'existe que s'il se voit sur le terrain. « Être agressif à la perte » n'est pas un comportement : deux observateurs ne verront pas la même chose. « Les deux joueurs les plus proches du ballon pressent le porteur dans la seconde qui suit la perte » est un comportement : tout le monde peut le voir, le compter et le corriger.

Pour passer de l'un à l'autre, le Njangi utilise **la chaîne du modèle**, cinq maillons qui relient l'idée au terrain :

1. **Le principe** : ce que l'équipe veut faire, en une phrase.
2. **Le comportement observable** : ce que l'on voit quand le principe est appliqué, écrit avec des verbes d'action et des repères précis (qui, où, quand).
3. **La consigne** : les trois ou quatre mots que l'entraîneur utilise sur le terrain.
4. **L'exercice** : le jeu qui fait vivre ce comportement des dizaines de fois par séance.
5. **L'indicateur** : ce que l'analyste compte pour savoir si le comportement apparaît en match.

| Maillon | Exemple : Reprendre | Exemple : la largeur |
|---|---|---|
| Principe | Reprendre le ballon tout de suite après la perte | Étirer le bloc adverse pour ouvrir les espaces intérieurs |
| Comportement observable | Les deux joueurs les plus proches pressent le porteur dans la seconde ; un troisième ferme la passe vers l'axe ; la défense de repos avance | Quand le ballon est dans le camp adverse, un joueur occupe chaque couloir extérieur, près de la ligne de touche |
| Consigne | « Reprends ! » | « Les pieds sur la ligne. » |
| Exercice | [[T01]], [[R08]] | [[L05]], [[L01]] |
| Indicateur | Part des pertes suivies d'une récupération dans les 5 secondes | Nombre de renversements d'un couloir extérieur à l'autre |

Trois règles rendent la chaîne utile. D'abord, **peu de comportements** : 3 à 5 par moment, sinon les joueurs n'en retiennent aucun. Ensuite, **le test des deux observateurs** : si deux entraîneurs regardant la même action ne sont pas d'accord pour dire si le comportement a eu lieu, il est mal écrit. Enfin, **les mêmes mots partout** : le comportement est écrit une fois par la direction technique et repris tel quel dans toutes les catégories, avec des exigences adaptées à l'âge.

> [!ANALYSTE] Coder les moments
> Pour chaque match, codez au minimum deux événements : la perte et la récupération. Avec eux, vous retrouvez les quatre moments et vous pouvez compter, sans logiciel coûteux, la part des pertes reprises dans les 5 secondes et le nombre de tirs qui suivent une récupération.
> Ces deux mesures alimentent le sous-indice Reprise de l'Indice Njangi (chapitre 32). Comparez-les d'un match à l'autre pour votre propre équipe plutôt qu'à une valeur extérieure.

## Ce qu'il faut retenir pour lundi

Quatre moments, deux événements qui les relient, une règle d'or, six principes et une chaîne qui transforme les idées en comportements : c'est la base de tout le modèle. Une séance suffit à installer le cycle : un rondo [[R08]] où les défenseurs qui récupèrent deviennent attaquants, puis un jeu [[T01]] où l'on gagne un point en reprenant le ballon dans les 5 secondes, l'entraîneur comptant à voix haute. Trois questions à la fin de la séance : « Qu'as-tu fait quand on l'a perdu ? Qu'as-tu regardé quand on l'a repris ? Que préparait ta passe ? »

Les chapitres 5 à 8 détaillent la possession et ses cinq intentions, la carte du terrain, les deux transitions et la défense. Tous reposent sur ce que ce chapitre a posé : une équipe qui change de moment tous ensemble, au même instant, avec les mêmes mots.
