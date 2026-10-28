---
numero: 5
slug: les-cinq-intentions
titre: Les cinq intentions de la possession
partie: 2
titrePartie: Le modèle de jeu Njangi
resume: Sortir, Progresser, Fixer, Finir, Respirer : chaque passe, chaque conduite, chaque appel sert l'une des cinq intentions. Définitions, déclencheurs, comportements, erreurs, indicateurs et exercices.
---

Championnat U17, une fin d'après-midi lourde. À la 23e minute, le central gauche reçoit du gardien, avance de quelques mètres et donne à l'autre central, sur sa droite. Sur le banc, un adjoint soupire : « Encore à côté. » Le soir, l'analyste repasse l'action : la conduite a fait sortir l'attaquant adverse, la passe latérale l'a obligé à courir encore, et le pivot s'est retrouvé seul, face au jeu. Trois passes plus tard, l'équipe entrait dans la surface.

À la 61e minute, la même passe, du même joueur vers le même partenaire. Cette fois personne n'a bougé, et le ballon est revenu au gardien. Sur la feuille de statistiques, les deux passes sont identiques. Sur le terrain, l'une préparait une occasion, l'autre ne préparait rien.

Comment juger une action avec ballon ? Ni par sa direction, ni par son élégance. Par ce qu'elle prépare. Le Njangi propose cinq réponses possibles, et une seule question à poser.

## Une passe se juge à ce qu'elle prépare

Dans un njangi, chacun verse sa cotisation et la caisse circule jusqu'à celui qui doit la toucher. Une caisse qui tourne sans jamais servir à personne finit par mourir. Le ballon obéit à la même loi, d'où la devise : « Le ballon doit voyager. Mais il doit savoir où il va. » Savoir où il va, c'est servir une intention. Le modèle en reconnaît cinq.

1. **Sortir** : construire depuis l'arrière en attirant l'adversaire pour libérer un joueur.
2. **Progresser** : traverser les lignes adverses (passe, conduite, appel).
3. **Fixer** : attirer et fixer des adversaires pour créer une supériorité ailleurs (numérique, de position, de qualité).
4. **Finir** : entrer dans la zone de finition et tirer dans de bonnes conditions.
5. **Respirer** : garder le ballon pour se réorganiser, se reposer, gérer un score ou la chaleur.

Chaque passe, chaque conduite, chaque appel sert l'une d'elles. Une passe réussie qui n'en sert aucune est une cotisation perdue : elle ne coûte rien sur la feuille de match, mais elle coûte du temps et de l'énergie.

Les intentions ne sont pas des étapes à dérouler dans l'ordre, ce sont des réponses à une situation. Une équipe peut Respirer à vingt mètres du but adverse ou Fixer dès la relance du gardien. Ce qui compte, c'est que les onze joueurs choisissent la même intention au même moment. Une équipe, une idée.

> [!NJANGI] La question unique
> « Que prépare ta passe ? » Le joueur répond par un mot : sortir, progresser, fixer, finir ou respirer.
> Une passe latérale peut être excellente si elle sert Fixer ou Respirer. Elle est mauvaise si elle ne sert rien.
> On ne juge pas la direction du ballon. On juge son intention.

Pour chaque intention, la même grille : la définition, les **déclencheurs** (les signaux qui font entrer l'équipe dans l'intention ou l'en font sortir), les comportements observables, les erreurs fréquentes, un indicateur et les exercices.

## Sortir

**Définition.** Sortir, c'est construire depuis l'arrière en attirant l'adversaire pour libérer un joueur. Le gardien-relanceur, les centraux relanceurs et le pivot en sont les premiers acteurs. Le but n'est pas de garder le ballon dans notre camp, mais d'amener un partenaire libre au-delà de la première ligne adverse. Ce partenaire, nous l'appelons l'**homme libre** : le joueur qui peut recevoir sans pression immédiate et jouer face au jeu.

**Déclencheurs.** L'équipe entre dans Sortir quand le ballon arrive au gardien ou aux centraux et que l'adversaire presse ou s'organise pour presser. Elle en sort dès que l'homme libre reçoit au-delà de la première ligne : c'est le passage à Progresser. Quand le pressing adverse a la supériorité numérique et ferme toutes les solutions courtes, le jeu long vers l'attaquant point d'appui, avec des partenaires prêts à gagner le deuxième ballon, devient la meilleure façon de sortir. Sortir court est un moyen, pas un dogme.

**Comportements observables.** Les centraux s'écartent à la largeur de la surface. Le gardien se propose comme troisième relanceur. Le pivot se montre dans le dos des attaquants adverses ou descend entre les centraux pour créer un 3 contre 2. Le porteur conduit vers un adversaire pour l'obliger à sortir, puis joue dans son dos.

**Erreurs fréquentes.** Des centraux trop proches, qu'un seul attaquant suffit à presser. Une passe trop rapide au voisin, qui transmet la pression au lieu de l'attirer. Un pivot caché derrière un adversaire.

**Indicateur.** Le **taux de sortie** : parmi les possessions qui commencent dans notre premier tiers, la part de celles qui franchissent la ligne médiane en gardant le ballon. L'analyste le suit aussi par côté et par relanceur.

**Exercices.** [[P04]], [[F01]], [[F02]], [[L03]].

```schema
{"view":"full",
"players":[
{"id":"gk","team":"gk","x":3,"y":34,"label":"1"},
{"id":"a4","team":"a","x":13,"y":16,"label":"4"},
{"id":"a5","team":"a","x":13,"y":52,"label":"5"},
{"id":"a6","team":"a","x":14,"y":34,"label":"6"},
{"id":"a10","team":"a","x":37,"y":21,"label":"10"},
{"id":"a8","team":"a","x":37,"y":49,"label":"8"},
{"id":"b1","team":"b","x":22,"y":26},
{"id":"b2","team":"b","x":22,"y":42},
{"id":"b3","team":"b","x":42,"y":35}
],
"ball":"gk",
"arrows":[
{"from":[26,34],"to":"a6","kind":"run","n":1},
{"from":"gk","to":"a4","kind":"pass","n":2},
{"from":"a4","to":[25,13],"kind":"dribble","n":3},
{"from":[25,13],"to":"a10","kind":"pass","n":4}
],
"labels":[{"x":13,"y":62,"text":"3 contre 2"},{"x":40,"y":14.5,"text":"homme libre"}]}
```

## Progresser

**Définition.** Progresser, c'est traverser les lignes adverses par la passe, la conduite ou l'appel. Une **ligne** est un groupe d'adversaires placés à la même hauteur : les attaquants, les milieux, les défenseurs. Une ligne est **traversée** quand le ballon dépasse au moins deux adversaires d'une même ligne et arrive à un partenaire qui le contrôle. On traverse par une passe tendue vers un joueur placé entre les lignes, par une conduite dans un espace libre, ou par un appel dans le dos de la dernière ligne.

**Déclencheurs.** Un partenaire reçoit face au jeu avec de l'espace devant lui ; un adversaire de la ligne suivante a quitté sa place ; un partenaire est libre entre les lignes ; la profondeur s'ouvre derrière la défense. L'équipe passe à Fixer quand le bloc adverse se resserre et ferme toutes les lignes, à Finir quand le ballon entre dans le dernier tiers avec un avantage.

**Comportements observables.** Le receveur entre les lignes se place de profil, dans un demi-espace (chapitre 6), dans le dos des milieux adverses. Le porteur regarde d'abord devant. Les passes verticales sont tendues et données sur le pied le plus éloigné du défenseur. Après chaque passe verticale, un partenaire arrive pour la remise : c'est le troisième homme.

**Erreurs fréquentes.** La passe forcée dans une ligne fermée, qui provoque une perte au centre du terrain, la plus dangereuse de toutes. Le receveur dos au jeu sans soutien. Tous les joueurs qui veulent recevoir entre les lignes, et plus personne pour donner la largeur.

**Indicateur.** Les **lignes traversées par possession**, et la part des **passes progressives** (celles qui rapprochent nettement le ballon du but adverse) dans le total des passes. Ces deux mesures alimentent le sous-indice Progression de l'Indice Njangi (chapitre 32).

**Exercices.** [[R06]], [[P05]], [[S02]], [[S07]], [[L02]], [[P09]].

## Fixer

**Définition.** Fixer, c'est attirer et fixer des adversaires pour créer une supériorité ailleurs : numérique, de position ou de qualité (chapitre 6). Fixer un adversaire, c'est l'obliger à rester où il est ou à venir vers le ballon, pour qu'il ne puisse plus défendre ailleurs. On fixe par la conduite (le **dribble njangi** : dribbler pour attirer, fixer, donner), par une circulation courte qui attire le bloc, ou par la position : un ailier collé à la touche fixe le latéral adverse.

C'est ici que la passe latérale ou en retrait prend toute sa valeur. Sur le côté gauche, le latéral, l'intérieur et l'ailier font circuler le ballon dans un petit espace ; le bloc adverse glisse vers eux. L'intérieur donne en retrait au pivot, qui renverse aussitôt vers l'ailier droit, seul face à son défenseur. La passe en arrière a tout préparé.

**Déclencheurs.** La ligne devant le porteur est fermée ; le bloc adverse a glissé d'un côté ; un partenaire est isolé en 1 contre 1 de l'autre côté ; un adversaire hésite entre deux joueurs. L'équipe quitte Fixer dès que la supériorité apparaît ailleurs : alors le ballon part, vite.

**Comportements observables.** Le porteur attaque l'espace entre deux adversaires pour les attirer tous les deux. Les partenaires proches offrent des solutions courtes, sans précipitation. L'ailier opposé reste large et haut, patient, presque oublié. Le renversement est joué au sol ou à mi-hauteur, tendu, au moment où le défenseur opposé est isolé.

**Erreurs fréquentes.** Fixer sans regarder ailleurs : dribbler pour dribbler. Renverser trop tôt, avant que le bloc ait bougé. Renverser trop lentement, par une passe en cloche qui laisse au bloc le temps de revenir. L'ailier opposé qui vient vers le ballon et détruit lui-même l'isolement.

**Indicateur.** Les **conduites ou dribbles qui attirent deux adversaires**, et les **renversements après fixation** (un changement de côté joué juste après une surcharge). Ils alimentent le sous-indice Fixation.

**Exercices.** [[R02]], [[R04]], [[P07]], [[S04]], [[S05]], [[F04]], [[G04]].

```schema
{"view":"half",
"players":[
{"id":"a3","team":"a","x":16,"y":6,"label":"3"},
{"id":"a10","team":"a","x":27,"y":15,"label":"10"},
{"id":"a11","team":"a","x":36,"y":4,"label":"11"},
{"id":"a6","team":"a","x":14,"y":30,"label":"6"},
{"id":"a9","team":"a","x":42,"y":30,"label":"9"},
{"id":"a7","team":"a","x":40,"y":62,"label":"7"},
{"id":"b1","team":"b","x":24,"y":8},
{"id":"b2","team":"b","x":31,"y":10},
{"id":"b3","team":"b","x":33,"y":20},
{"id":"b4","team":"b","x":18,"y":16},
{"id":"b5","team":"b","x":44,"y":24},
{"id":"b6","team":"b","x":45,"y":36},
{"id":"b7","team":"b","x":42,"y":54}
],
"ball":"a10",
"arrows":[
{"from":"a10","to":"a6","kind":"pass","n":1},
{"from":"a6","to":"a7","kind":"pass","n":2},
{"from":"a7","to":[48.5,57],"kind":"dribble","n":3}
],
"zones":[{"x":12,"y":0,"w":30,"h":24,"tone":"n","label":"surcharge"}],
"labels":[{"x":19,"y":47,"text":"renverser"},{"x":44,"y":66.5,"text":"1 contre 1"}]}
```

## Finir

**Définition.** Finir, c'est entrer dans la zone de finition et tirer dans de bonnes conditions. La **zone de finition** est le cœur de la surface de réparation : un rectangle de la largeur de la surface de but, qui va de la ligne de but jusqu'un peu au-delà du point de penalty. Tirer dans de bonnes conditions, c'est tirer en une ou deux touches, le corps orienté, avec peu de défenseurs entre le ballon et le but.

**Déclencheurs.** Le ballon entre dans le dernier tiers avec un avantage : un 1 contre 1 sur le côté, un 2 contre 1, des défenseurs qui reculent face à leur propre but. Un partenaire reçoit dans le demi-espace à l'entrée de la surface. Le défenseur opposé regarde le ballon et perd son attaquant. L'équipe quitte Finir après le tir, ou quand le bloc adverse s'est regroupé : elle revient alors à Fixer, voire à Respirer.

**Comportements observables.** Trois joueurs occupent la surface (premier poteau, point de penalty, second poteau) et un quatrième attend à son entrée. Le centre en retrait vers un partenaire qui arrive lancé est préféré au centre aérien face à un bloc regroupé. On entre dans la surface par le demi-espace, en conduite ou par un une-deux. Pendant ce temps, la défense de repos reste en place (chapitre 7).

**Erreurs fréquentes.** Le tir de loin réflexe alors qu'une passe vers la zone de finition était possible. Le centre aérien vers une surface vide ou vers des défenseurs plus grands. Arriver trop tôt dans la surface, à l'arrêt, au lieu d'y arriver lancé.

**Indicateur.** La **part des tirs pris dans la zone de finition** et les **entrées dans la surface par possession**. Ils alimentent le sous-indice Pénétration.

**Exercices.** [[G01]], [[G02]], [[G03]], [[G05]], [[F03]], [[F05]].

```schema
{"view":"third",
"players":[
{"id":"a8","team":"a","x":22,"y":54,"label":"8"},
{"id":"a10","team":"a","x":24,"y":36,"label":"10"},
{"id":"a9","team":"a","x":31.5,"y":29,"label":"9"},
{"id":"b1","team":"b","x":24,"y":48.5},
{"id":"b2","team":"b","x":31.5,"y":42},
{"id":"b3","team":"b","x":29,"y":27.5},
{"id":"gkb","team":"gkb","x":33.5,"y":38}
],
"ball":"a8",
"arrows":[
{"from":"a8","to":[31,49.5],"kind":"dribble","n":1},
{"from":[14,40],"to":"a10","kind":"run","n":1},
{"from":[31,49.5],"to":"a10","kind":"pass","n":2},
{"from":"a10","to":[35,32],"kind":"shot","n":3}
],
"zones":[{"x":22,"y":24.84,"w":13,"h":18.32,"tone":"a","label":"zone de finition"}],
"labels":[{"x":29,"y":58,"text":"centre en retrait"}]}
```

## Respirer

**Définition.** Respirer, c'est garder le ballon pour se réorganiser, se reposer, gérer un score ou la chaleur. C'est l'intention la plus négligée. Pourtant, une équipe qui sait respirer choisit le moment où elle court.

À la Coupe du monde 2026, l'Égypte a mené 2-0 contre l'Argentine en huitièmes avant de perdre 3-2 ; la RD Congo menait 1-0 contre l'Angleterre en seizièmes et a perdu sur deux buts tardifs. Chaque scénario a ses causes. Mais tout staff africain peut se demander : quand nous menons, savons-nous garder le ballon assez longtemps pour reprendre notre souffle et le contrôle du match ?

**Déclencheurs.** Une longue série d'efforts vient de se terminer (pressing, défense dans notre camp) ; l'équipe est désorganisée après une transition ; le score est à protéger ; la chaleur pèse. L'équipe quitte Respirer quand elle est réorganisée et qu'une ouverture apparaît (Progresser), ou quand l'adversaire se jette dans un pressing désordonné qui libère des espaces (Sortir, Fixer).

**Comportements observables.** Plus de joueurs près du ballon, des distances courtes, des passes sur le pied le plus sûr, souvent par le pivot, les centraux et le gardien. Aucun risque dans l'axe de notre moitié. Les joueurs marchent pendant que le ballon court : respirer n'est pas subir, c'est faire courir l'adversaire.

**Erreurs fréquentes.** Confondre Respirer et lenteur, et jouer tout le match au même rythme. Respirer dans sa propre surface sous pression. Oublier de repartir quand l'équipe a retrouvé son souffle.

**Indicateur.** Le nombre et la durée des **séquences de respiration** (possessions longues jouées volontairement, sans recherche immédiate de profondeur) et les **pertes dangereuses** (pertes dans notre moitié, surtout dans l'axe). Ils alimentent le sous-indice Contrôle.

**Exercices.** [[P10]], [[R07]], [[P06]], [[L06]].

> [!AFRIQUE] La chaleur se gère avec le ballon
> Un match à 15 heures dans l'humidité d'une ville côtière, un terrain lourd : nos sélections jouent souvent dans des conditions qui punissent l'équipe qui court sans ballon.
> Respirer est un outil physiologique autant que tactique. Le staff prévoit les séquences de respiration comme il prévoit les pauses fraîcheur.

## Passer d'une intention à l'autre

Le plus difficile n'est pas de connaître les cinq intentions, c'est d'en changer ensemble. Les déclencheurs sont des signaux simples, visibles par tous, que l'entraîneur nomme et que l'équipe répète.

| Intention | On y entre quand | On en sort quand |
|---|---|---|
| Sortir | le ballon est au gardien ou aux centraux sous pression | l'homme libre reçoit au-delà de la première ligne |
| Progresser | un partenaire reçoit face au jeu avec de l'espace | le bloc se ferme (Fixer) ou le ballon entre dans le dernier tiers (Finir) |
| Fixer | les lignes devant le ballon sont fermées | une supériorité apparaît ailleurs |
| Finir | le ballon entre dans le dernier tiers avec un avantage | le tir, ou le bloc s'est regroupé (Fixer, Respirer) |
| Respirer | l'équipe est fatiguée, désorganisée ou doit gérer le score | l'équipe est réorganisée et une ouverture apparaît |

L'intention se choisit avant de recevoir : c'est le scan, la pièce des yeux, qui la décide. Les deux réflexes sans ballon, Reprendre et Regarder devant, relient la possession à la perte et à la récupération ; ils sont l'objet du chapitre 7.

> [!ANALYSTE] Coder l'intention
> Sur la vidéo, attribue à chaque séquence de possession une intention dominante, puis note si elle a été atteinte : homme libre trouvé, ligne traversée, renversement après fixation, tir dans la zone de finition, respiration sans perte.
> Une séquence où aucune intention n'est lisible est codée « sans intention ». Sa part dans le total est le premier chiffre à faire baisser. L'Indice Njangi (chapitre 32) s'appuie sur ces mesures.

## Entraîner les intentions

Chaque séance a une intention dominante, annoncée au début et récompensée par les règles : points bonus pour un renversement après fixation, une ligne traversée, une respiration sans perte. Le coaching passe par la question plutôt que par l'ordre : au lieu de « Joue devant », l'entraîneur demande « Que prépare ta passe ? ». Le joueur qui répond « fixer » en montrant l'ailier isolé a compris le jeu.

> [!JEUNES] Un mot par séance
> Avec les plus jeunes, une seule intention par séance et des mots simples : « sortir », « traverser », « attirer », « tirer », « souffler ». C'est la pièce de la raison, celle du roman : chaque passe a un but.
> On félicite le choix autant que la réussite, et on ne se moque jamais d'une erreur. Pauses d'eau régulières, séances raccourcies quand il fait chaud.

Le jour où chaque joueur, du gardien à l'attaquant, peut dire ce que prépare le ballon, l'équipe ne possède plus par habitude. Elle possède avec intention.
